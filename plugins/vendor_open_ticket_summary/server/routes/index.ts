import { schema } from '@kbn/config-schema';
import dateMath from '@kbn/datemath';
import { buildEsQuery } from '@kbn/es-query';
import { IRouter } from '../../../../src/core/server';

const INCIDENT_INDEX = 'computed-sla-livelihood-incident-index*';

// The dashboard time picker filters on the data view's time field. `Data.@timestamp`
// is the only `date`-mapped field on this index, so it is what the range applies to.
const TIME_FIELD = 'Data.@timestamp';

const VENDOR_FIELD = 'Data.mappedVendorName.keyword';
const STATUS_FIELD = 'Data.incident.applicationStatus.keyword';

// A ticket counts as open until it reaches one of these terminal statuses.
const CLOSED_STATUSES = ['CLOSED_AFTER_DECLINE', 'CLOSED_AFTER_RESOLUTION', 'RESOLVED'];

// Shown for tickets that have no vendor mapped yet, so their volume is not silently
// dropped from the export.
const UNMAPPED_VENDOR_LABEL = 'Unmapped';

const CSV_HEADERS = ['Vendor', 'No. of Open Tickets'] as const;

interface VendorRow {
  vendor: string;
  openTickets: number;
}

function escapeCsvValue(value: string | number): string {
  const stringValue = String(value ?? '');
  if (/["\r\n,]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function toCsv(rows: VendorRow[]): string {
  const header = CSV_HEADERS.join(',');
  const lines = rows.map((row) =>
    [escapeCsvValue(row.vendor), escapeCsvValue(row.openTickets)].join(',')
  );
  // Excel only detects UTF-8 in a CSV when it starts with a byte order mark.
  return `﻿${[header, ...lines].join('\n')}`;
}

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

  const rangeFilter: Array<Record<string, any>> = [];

  if (timeRange) {
    const from = dateMath.parse(timeRange.from);
    const to = dateMath.parse(timeRange.to, { roundUp: true });

    if (from || to) {
      rangeFilter.push({
        range: {
          [TIME_FIELD]: {
            ...(from ? { gte: from.toISOString() } : {}),
            ...(to ? { lte: to.toISOString() } : {}),
            format: 'strict_date_optional_time',
          },
        },
      });
    }
  }

  return {
    bool: {
      must: [esQuery],
      filter: rangeFilter,
      // Everything that has not reached a terminal status is an open ticket. Expressing
      // it as must_not also keeps documents that carry no status field at all.
      must_not: [{ terms: { [STATUS_FIELD]: CLOSED_STATUSES } }],
    },
  };
}

function isIndexNotFoundError(error: any): boolean {
  return error?.meta?.body?.error?.type === 'index_not_found_exception';
}

const AGG_PAGE_SIZE = 1000;

// A composite aggregation is used instead of `terms` because it pages through every
// vendor via after_key. A plain terms agg would need a guessed `size` and would silently
// truncate the export once the vendor list outgrows it.
async function fetchVendorCounts(
  esClient: any,
  index: string,
  query: Record<string, any>
): Promise<VendorRow[]> {
  const rows: VendorRow[] = [];
  let afterKey: Record<string, any> | undefined;

  do {
    let result;
    try {
      result = await esClient.search<unknown>({
        index,
        size: 0,
        track_total_hits: false,
        ignore_unavailable: true,
        query,
        aggs: {
          vendors: {
            composite: {
              size: AGG_PAGE_SIZE,
              ...(afterKey ? { after: afterKey } : {}),
              sources: [
                {
                  vendor: {
                    terms: {
                      field: VENDOR_FIELD,
                      // Tickets with no mapped vendor still need to be reported.
                      missing_bucket: true,
                    },
                  },
                },
              ],
            },
          },
        },
      });
    } catch (error) {
      if (isIndexNotFoundError(error)) {
        return [];
      }
      throw error;
    }

    const agg = result.aggregations?.vendors;
    const buckets: Array<{ key: { vendor: string | null }; doc_count: number }> =
      agg?.buckets ?? [];

    for (const bucket of buckets) {
      rows.push({
        vendor: bucket.key.vendor ?? UNMAPPED_VENDOR_LABEL,
        openTickets: bucket.doc_count,
      });
    }

    // Composite signals exhaustion by returning fewer buckets than the page size; the
    // after_key is absent on the final page.
    afterKey = buckets.length < AGG_PAGE_SIZE ? undefined : agg?.after_key;
  } while (afterKey);

  // Largest backlog first - that is the order a reader of this report cares about.
  return rows.sort((a, b) => b.openTickets - a.openTickets || a.vendor.localeCompare(b.vendor));
}

export function defineRoutes(router: IRouter) {
  router.get(
    {
      path: '/api/vendor_open_ticket_summary/test',
      validate: false,
    },
    async (context, request, response) => {
      return response.ok({
        body: {
          message: 'Vendor-wise Open Ticket Summary plugin is working',
          authenticated: request.auth.isAuthenticated,
        },
      });
    }
  );

  router.post(
    {
      path: '/api/vendor_open_ticket_summary/report',
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

      let rows: VendorRow[];
      try {
        rows = await fetchVendorCounts(esClient, INCIDENT_INDEX, query);
      } catch (error) {
        return response.customError({
          statusCode: error?.meta?.statusCode || 500,
          body: { message: error?.message || 'Failed to fetch vendor open ticket summary' },
        });
      }

      const csv = toCsv(rows);

      return response.ok({
        body: csv,
        headers: {
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': 'attachment; filename="vendor-open-ticket-summary.csv"',
        },
      });
    }
  );
}
