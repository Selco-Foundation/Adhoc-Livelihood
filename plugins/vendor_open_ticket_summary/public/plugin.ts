import { CoreSetup, CoreStart, Plugin } from '../../../src/core/public';
import {
  VendorOpenTicketSummaryPluginSetup,
  VendorOpenTicketSummaryPluginStart,
  VendorOpenTicketSummarySetupDependencies,
  VendorOpenTicketSummaryStartDependencies,
} from './types';
import { VENDOR_OPEN_TICKET_SUMMARY_EMBEDDABLE } from './embeddable/constants';
import { VendorOpenTicketsEmbeddableFactory } from './embeddable/vendor_open_tickets_embeddable_factory';

export class VendorOpenTicketSummaryPlugin
  implements
    Plugin<
      VendorOpenTicketSummaryPluginSetup,
      VendorOpenTicketSummaryPluginStart,
      VendorOpenTicketSummarySetupDependencies,
      VendorOpenTicketSummaryStartDependencies
    >
{
  public setup(
    core: CoreSetup,
    plugins: VendorOpenTicketSummarySetupDependencies
  ): VendorOpenTicketSummaryPluginSetup {
    plugins.embeddable.registerEmbeddableFactory(
      VENDOR_OPEN_TICKET_SUMMARY_EMBEDDABLE,
      new VendorOpenTicketsEmbeddableFactory(core.http.basePath)
    );

    return {};
  }

  public start(core: CoreStart): VendorOpenTicketSummaryPluginStart {
    return {};
  }

  public stop() {}
}
