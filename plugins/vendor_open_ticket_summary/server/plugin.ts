import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '../../../src/core/server';

import {
  VendorOpenTicketSummaryPluginSetup,
  VendorOpenTicketSummaryPluginStart,
} from './types';
import { defineRoutes } from './routes';

export class VendorOpenTicketSummaryPlugin
  implements Plugin<VendorOpenTicketSummaryPluginSetup, VendorOpenTicketSummaryPluginStart>
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    this.logger.debug('vendorOpenTicketSummary: Setup');
    const router = core.http.createRouter();

    // Register server side APIs
    defineRoutes(router);

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('vendorOpenTicketSummary: Started');
    return {};
  }

  public stop() {}
}
