import './index.scss';

import { VendorOpenTicketSummaryPlugin } from './plugin';

// This exports static code and TypeScript types,
// as well as, Kibana Platform `plugin()` initializer.
export function plugin() {
  return new VendorOpenTicketSummaryPlugin();
}
export type {
  VendorOpenTicketSummaryPluginSetup,
  VendorOpenTicketSummaryPluginStart,
} from './types';
