import './index.scss';

import { AllTicketsCurrentStatusPlugin } from './plugin';

// This exports static code and TypeScript types,
// as well as, Kibana Platform `plugin()` initializer.
export function plugin() {
  return new AllTicketsCurrentStatusPlugin();
}
export type {
  AllTicketsCurrentStatusPluginSetup,
  AllTicketsCurrentStatusPluginStart,
} from './types';
