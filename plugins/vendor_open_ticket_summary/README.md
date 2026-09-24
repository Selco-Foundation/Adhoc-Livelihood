# vendorOpenTicketSummary

A Kibana plugin that adds a **Vendor-wise Open Ticket Summary** dashboard panel.

The panel renders a title on the left and a download button on the right. Clicking it
exports a CSV with two columns:

| Column | Source |
| --- | --- |
| `Vendor` | `Data.mappedVendorName.keyword` |
| `No. of Open Tickets` | doc count per vendor |

Data is read from `computed-sla-livelihood-incident-index*`. A ticket counts as **open**
unless `Data.incident.applicationStatus.keyword` is one of `CLOSED_AFTER_DECLINE`,
`CLOSED_AFTER_RESOLUTION` or `RESOLVED`.

The export respects the dashboard's current filter pills (including Controls), the query
bar and the time picker (applied to `Data.@timestamp`). Rows are sorted by open ticket
count, descending. Tickets with no mapped vendor are reported under `Unmapped`.

## API

`POST /api/vendor_open_ticket_summary/report` — body `{ filters?, query?, timeRange? }`,
returns `text/csv`.

`GET /api/vendor_open_ticket_summary/test` — health check.

---

## Development

See the [kibana contributing guide](https://github.com/elastic/kibana/blob/main/CONTRIBUTING.md) for instructions setting up your development environment.

## Scripts

<dl>
  <dt><code>yarn kbn bootstrap</code></dt>
  <dd>Execute this to install node_modules and setup the dependencies in your plugin and in Kibana</dd>

  <dt><code>yarn plugin-helpers build</code></dt>
  <dd>Execute this to create a distributable version of this plugin that can be installed in Kibana</dd>

  <dt><code>yarn plugin-helpers dev --watch</code></dt>
    <dd>Execute this to build your plugin ui browser side so Kibana could pick up when started in development</dd>
</dl>
