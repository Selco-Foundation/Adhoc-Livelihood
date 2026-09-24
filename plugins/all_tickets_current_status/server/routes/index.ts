import { schema } from '@kbn/config-schema';
import dateMath from '@kbn/datemath';
import { buildEsQuery } from '@kbn/es-query';
import { IRouter } from '../../../../src/core/server';

const INCIDENT_INDEX = 'computed-sla-livelihood-incident-index*';

// The dashboard time picker filters on the data view's time field. `Data.@timestamp`
// is the only `date`-mapped field on this index, so it is what the range applies to.
const TIME_FIELD = 'Data.@timestamp';

// Newest first, as the report is read as a "what is happening now" list.
// `unmapped_type` keeps the sort from erroring on any index the wildcard resolves to
// that has not had the field mapped yet.
const SORT: Array<Record<string, any>> = [
  { [TIME_FIELD]: { order: 'desc', unmapped_type: 'date' } },
];

// Walks a dotted path through _source, flattening arrays at every level. Fields such as
// `currentProcessInstance.assignes` and `comments` are mapped as a single object/text
// but arrive as arrays whenever a ticket has more than one, so no level can be assumed
// to be scalar.
function collect(value: any, segments: string[]): any[] {
  if (value === null || value === undefined) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => collect(item, segments));
  }
  if (segments.length === 0) {
    return [value];
  }
  if (typeof value !== 'object') {
    return [];
  }
  const [head, ...rest] = segments;
  return collect(value[head], rest);
}

// Paths are the mapping field names with the `.keyword` sub-field dropped: keyword is an
// index-time sub-field, the value itself lives at the base path in _source.
function pick(source: Record<string, any>, path: string): string {
  return collect(source, path.split('.'))
    .filter((value) => value !== null && value !== undefined && value !== '')
    .join('; ');
}

function pickFirst(source: Record<string, any>, path: string): any {
  const [first] = collect(source, path.split('.'));
  return first;
}

// Mirrors the dashboard's runtime field: epoch millis rendered in IST as
// "MMM dd, yyyy @ HH:mm:ss.SSS". Done here rather than as a painless script field so the
// export does not depend on scripting being enabled on the cluster.
const IST_PARTS_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Kolkata',
  month: 'short',
  day: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  // h23 rather than hour12:false - the latter renders midnight as "24" on some runtimes.
  hourCycle: 'h23',
});

function formatIstTimestamp(epochMillis: any): string {
  if (epochMillis === null || epochMillis === undefined || epochMillis === '') {
    return '';
  }

  const millis = Number(epochMillis);
  if (!Number.isFinite(millis)) {
    return '';
  }

  const parts = IST_PARTS_FORMATTER.formatToParts(new Date(millis)).reduce<
    Record<string, string>
  >((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});

  // Intl has no portable millisecond part across Node versions, so derive it directly.
  // Modulo of a negative epoch stays negative in JS, hence the double remainder.
  const fraction = String((((millis % 1000) + 1000) % 1000) | 0).padStart(3, '0');

  return `${parts.month} ${parts.day}, ${parts.year} @ ${parts.hour}:${parts.minute}:${parts.second}.${fraction}`;
}

interface CsvColumn {
  header: string;
  value: (source: Record<string, any>) => string;
}

const COLUMNS: CsvColumn[] = [
  { header: 'Ticket No.', value: (s) => pick(s, 'Data.incident.incidentId') },
  { header: 'End User Name', value: (s) => pick(s, 'Data.endUserName') },
  { header: 'End User Contact', value: (s) => pick(s, 'Data.endUserMobile') },
  { header: 'Sector', value: (s) => pick(s, 'Data.facilityCategory') },
  { header: 'State', value: (s) => pick(s, 'Data.state') },
  { header: 'District', value: (s) => pick(s, 'Data.district') },
  { header: 'Block', value: (s) => pick(s, 'Data.block') },
  { header: 'Issue Type', value: (s) => pick(s, 'Data.incident.incidentType_localized') },
  { header: 'Mapped Solar Vendor', value: (s) => pick(s, 'Data.mappedVendorName') },
  {
    header: 'Current Status',
    value: (s) => pick(s, 'Data.incident.applicationStatus_localized'),
  },
  { header: 'Last Action Taken By', value: (s) => pick(s, 'Data.lastActionTakenBy') },
  {
    header: 'Last Action Timestamp',
    value: (s) => formatIstTimestamp(pickFirst(s, 'Data.auditDetails.lastModifiedTime')),
  },
  {
    header: 'Current Owner Name',
    value: (s) => pick(s, 'Data.currentProcessInstance.assignes.name'),
  },
  { header: 'Comments', value: (s) => pick(s, 'Data.comments') },
  { header: 'Reported By', value: (s) => pick(s, 'Data.incident.reporter.name') },
  { header: 'Warranty Status', value: (s) => pick(s, 'Data.incident.warrantyStatus') },
  { header: 'Filed Date', value: (s) => pick(s, 'Data.@timestamp') },
];

function escapeCsvValue(value: string | number): string {
  const stringValue = String(value ?? '');
  if (/["\r\n,]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function toCsv(sources: Array<Record<string, any>>): string {
  const header = COLUMNS.map((column) => escapeCsvValue(column.header)).join(',');
  const lines = sources.map((source) =>
    COLUMNS.map((column) => escapeCsvValue(column.value(source))).join(',')
  );
  // Excel only detects UTF-8 in a CSV when it starts with a byte order mark.
  return `﻿${[header, ...lines].join('\n')}`;
}

const PAGE_SIZE = 1000;

// Translates the dashboard's own state - filter pills (which is what Controls emit),
// the KQL/Lucene bar and the time picker - into a single Elasticsearch query, so the
// export matches exactly what the dashboard is displaying.
function buildDashboardQuery({
  filters,
  query,
  timeRange,
}: {
  filters?: any[];
  query?: any;
  timeRange?: { from: string; to: string };
}): Record<string, any> {
  const esQuery = buildEsQuery(undefined, query ? [query] : [], filters ?? []);

  if (!timeRange) {
    return esQuery;
  }

  const from = dateMath.parse(timeRange.from);
  const to = dateMath.parse(timeRange.to, { roundUp: true });

  if (!from && !to) {
    return esQuery;
  }

  return {
    bool: {
      must: [esQuery],
      filter: [
        {
          range: {
            [TIME_FIELD]: {
              ...(from ? { gte: from.toISOString() } : {}),
              ...(to ? { lte: to.toISOString() } : {}),
              format: 'strict_date_optional_time',
            },
          },
        },
      ],
    },
  };
}

function isIndexNotFoundError(error: any): boolean {
  return error?.meta?.body?.error?.type === 'index_not_found_exception';
}

const SCROLL_KEEP_ALIVE = '1m';

// Scroll (not point-in-time) is deliberate: the initial scroll request is an ordinary
// search, so Elasticsearch silently narrows the index wildcard to the indices the
// current user is authorised for. Opening a PIT instead requires privileges on every
// index the wildcard resolves to, which fails for state-scoped roles.
//
// The scroll carries its sort across batches, so the concatenated result is globally
// ordered by `Data.@timestamp` descending - not merely ordered within each batch.
async function fetchAllHits(
  esClient: any,
  index: string,
  query: Record<string, any>
): Promise<Array<Record<string, any>>> {
  const allHits: Array<Record<string, any>> = [];

  let result;
  try {
    result = await esClient.search<Record<string, any>>({
      index,
      size: PAGE_SIZE,
      query,
      scroll: SCROLL_KEEP_ALIVE,
      ignore_unavailable: true,
      sort: SORT,
    });
  } catch (error) {
    if (isIndexNotFoundError(error)) {
      return [];
    }
    throw error;
  }

  let scrollId: string | undefined = result._scroll_id;

  try {
    // `size` is per shard when scrolling, so a batch may hold more or fewer than
    // PAGE_SIZE hits. An empty batch is the only reliable end-of-scroll signal.
    while (result.hits.hits.length > 0) {
      allHits.push(...result.hits.hits);

      result = await esClient.scroll({
        scroll_id: scrollId,
        scroll: SCROLL_KEEP_ALIVE,
      });
      scrollId = result._scroll_id ?? scrollId;
    }
  } finally {
    if (scrollId) {
      try {
        await esClient.clearScroll({ scroll_id: scrollId });
      } catch (error) {
        // A scroll that already expired cannot be cleared; nothing to recover here.
      }
    }
  }

  return allHits;
}

export function defineRoutes(router: IRouter) {
  router.get(
    {
      path: '/api/all_tickets_current_status/test',
      validate: false,
    },
    async (context, request, response) => {
      return response.ok({
        body: {
          message: 'All Tickets - Current Status plugin is working',
          authenticated: request.auth.isAuthenticated,
        },
      });
    }
  );

  router.post(
    {
      path: '/api/all_tickets_current_status/report',
      validate: {
        // The dashboard's filter/query objects are Kibana-owned shapes that carry their
        // own DSL, so they are accepted as-is and normalised by buildEsQuery.
        body: schema.object({
          filters: schema.maybe(schema.arrayOf(schema.any())),
          query: schema.maybe(schema.any()),
          timeRange: schema.maybe(
            schema.object({
              from: schema.string(),
              to: schema.string(),
            })
          ),
        }),
      },
    },
    async (context, request, response) => {
      const esClient = (await context.core).elasticsearch.client.asCurrentUser;
      const query = buildDashboardQuery(request.body);

      let hits: Array<Record<string, any>>;
      try {
        hits = await fetchAllHits(esClient, INCIDENT_INDEX, query);
      } catch (error) {
        return response.customError({
          statusCode: error?.meta?.statusCode || 500,
          body: { message: error?.message || 'Failed to fetch ticket status data' },
        });
      }

      const csv = toCsv(hits.map((hit) => hit._source || {}));

      return response.ok({
        body: csv,
        headers: {
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': 'attachment; filename="all-tickets-current-status.csv"',
        },
      });
    }
  );
}
