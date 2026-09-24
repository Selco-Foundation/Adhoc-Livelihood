import { CoreSetup, CoreStart, Plugin } from '../../../src/core/public';
import {
  AllTicketsCurrentStatusPluginSetup,
  AllTicketsCurrentStatusPluginStart,
  AllTicketsCurrentStatusSetupDependencies,
  AllTicketsCurrentStatusStartDependencies,
} from './types';
import { ALL_TICKETS_CURRENT_STATUS_EMBEDDABLE } from './embeddable/constants';
import { AllTicketsEmbeddableFactory } from './embeddable/all_tickets_embeddable_factory';

export class AllTicketsCurrentStatusPlugin
  implements
    Plugin<
      AllTicketsCurrentStatusPluginSetup,
      AllTicketsCurrentStatusPluginStart,
      AllTicketsCurrentStatusSetupDependencies,
      AllTicketsCurrentStatusStartDependencies
    >
{
  public setup(
    core: CoreSetup,
    plugins: AllTicketsCurrentStatusSetupDependencies
  ): AllTicketsCurrentStatusPluginSetup {
    plugins.embeddable.registerEmbeddableFactory(
      ALL_TICKETS_CURRENT_STATUS_EMBEDDABLE,
      new AllTicketsEmbeddableFactory(core.http.basePath)
    );

    return {};
  }

  public start(core: CoreStart): AllTicketsCurrentStatusPluginStart {
    return {};
  }

  public stop() {}
}
