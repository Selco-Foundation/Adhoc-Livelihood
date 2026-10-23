import { PluginInitializerContext } from '../../../src/core/server';
import { VendorOpenTicketSummaryPlugin } from './plugin';

//  This exports static code and TypeScript types,
//  as well as, Kibana Platform `plugin()` initializer.

export function plugin(initializerContext: PluginInitializerContext) {
  return new VendorOpenTicketSummaryPlugin(initializerContext);
}

export type {
  VendorOpenTicketSummaryPluginSetup,
  VendorOpenTicketSummaryPluginStart,
} from './types';
