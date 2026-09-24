import { PluginInitializerContext } from '../../../src/core/server';
import { AllTicketsCurrentStatusPlugin } from './plugin';

//  This exports static code and TypeScript types,
//  as well as, Kibana Platform `plugin()` initializer.

export function plugin(initializerContext: PluginInitializerContext) {
  return new AllTicketsCurrentStatusPlugin(initializerContext);
}

export type {
  AllTicketsCurrentStatusPluginSetup,
  AllTicketsCurrentStatusPluginStart,
} from './types';
