import { EmbeddableSetup, EmbeddableStart } from '../../../src/plugins/embeddable/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AllTicketsCurrentStatusPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AllTicketsCurrentStatusPluginStart {}

export interface AllTicketsCurrentStatusSetupDependencies {
  embeddable: EmbeddableSetup;
}

export interface AllTicketsCurrentStatusStartDependencies {
  embeddable: EmbeddableStart;
}
