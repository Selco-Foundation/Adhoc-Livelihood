import { EmbeddableSetup, EmbeddableStart } from '../../../src/plugins/embeddable/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface VendorOpenTicketSummaryPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface VendorOpenTicketSummaryPluginStart {}

export interface VendorOpenTicketSummarySetupDependencies {
  embeddable: EmbeddableSetup;
}

export interface VendorOpenTicketSummaryStartDependencies {
  embeddable: EmbeddableStart;
}
