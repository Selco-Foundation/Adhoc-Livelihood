# allTicketsCurrentStatus

A Kibana plugin that adds an **All Tickets — Current Status** dashboard panel. The panel
renders a title on the left and a download button on the right; clicking it exports one
CSV row per ticket, newest first.

Data is read from `computed-sla-livelihood-incident-index*`, sorted by `Data.@timestamp`
descending. The export respects the dashboard's current filter pills (including
Controls), the query bar and the time picker.

## Columns

| Column | Source |
| --- | --- |
| Ticket No. | `Data.incident.incidentId` |
| End User Name | `Data.endUserName` |
| End User Contact | `Data.endUserMobile` |
| Sector | `Data.facilityCategory` |
| State | `Data.state` |
| District | `Data.district` |
| Block | `Data.block` |
| Issue Type | `Data.incident.incidentType_localized` |
| Mapped Solar Vendor | `Data.mappedVendorName` |
| Current Status | `Data.incident.applicationStatus_localized` |
| Last Action Taken By | `Data.lastActionTakenBy` |
| Last Action Timestamp | `Data.auditDetails.lastModifiedTime`, rendered in IST |
| Current Owner Name | `Data.currentProcessInstance.assignes.name` |
| Comments | `Data.comments` |
| Reported By | `Data.incident.reporter.name` |
| Warranty Status | `Data.incident.warrantyStatus` |
| Filed Date | `Data.@timestamp` |

Values are read from `_source`, so paths carry no `.keyword` suffix — keyword is an
index-time sub-field and the value itself lives at the base path.

**Last Action Timestamp** is the epoch-millis `lastModifiedTime` formatted as
`MMM dd, yyyy @ HH:mm:ss.SSS` in `Asia/Kolkata`, matching the dashboard's runtime field.
It is computed in Node rather than as a painless script field so the export does not
depend on scripting being enabled on the cluster.

Fields that can hold more than one value (`assignes`, `comments`) are joined with `; `.

## API

`POST /api/all_tickets_current_status/report` — body `{ filters?, query?, timeRange? }`,
returns `text/csv`.

`GET /api/all_tickets_current_status/test` — health check.

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
