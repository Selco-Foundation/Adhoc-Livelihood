import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '../../../src/core/server';

import { AllTicketsCurrentStatusPluginSetup, AllTicketsCurrentStatusPluginStart } from './types';
import { defineRoutes } from './routes';

export class AllTicketsCurrentStatusPlugin
  implements Plugin<AllTicketsCurrentStatusPluginSetup, AllTicketsCurrentStatusPluginStart>
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    this.logger.debug('allTicketsCurrentStatus: Setup');
    const router = core.http.createRouter();

    // Register server side APIs
    defineRoutes(router);

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('allTicketsCurrentStatus: Started');
    return {};
  }

  public stop() {}
}
