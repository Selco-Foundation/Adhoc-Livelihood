import { IBasePath } from '../../../../src/core/public';
import { EmbeddableFactoryDefinition, IContainer } from '../../../../src/plugins/embeddable/public';
import {
  ALL_TICKETS_CURRENT_STATUS_EMBEDDABLE,
  ALL_TICKETS_CURRENT_STATUS_TITLE,
} from './constants';
import { AllTicketsEmbeddable, AllTicketsEmbeddableInput } from './all_tickets_embeddable';

export class AllTicketsEmbeddableFactory implements EmbeddableFactoryDefinition {
  public readonly type = ALL_TICKETS_CURRENT_STATUS_EMBEDDABLE;

  constructor(private readonly basePath: IBasePath) {}

  // Must stay true: the dashboard's "Add panel" menu filters on the resolved value of
  // isEditable() as well as canCreateNew(), so returning false hides the panel type
  // from the menu entirely rather than just suppressing an edit action.
  public async isEditable() {
    return true;
  }

  public canCreateNew() {
    return true;
  }

  public getDisplayName() {
    return ALL_TICKETS_CURRENT_STATUS_TITLE;
  }

  public getIconType() {
    return 'download';
  }

  public async create(initialInput: AllTicketsEmbeddableInput, parent?: IContainer) {
    return new AllTicketsEmbeddable(initialInput, this.basePath, parent);
  }
}
