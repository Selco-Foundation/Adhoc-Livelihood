import { IBasePath } from '../../../../src/core/public';
import { EmbeddableFactoryDefinition, IContainer } from '../../../../src/plugins/embeddable/public';
import {
  VENDOR_OPEN_TICKET_SUMMARY_EMBEDDABLE,
  VENDOR_OPEN_TICKET_SUMMARY_TITLE,
} from './constants';
import {
  VendorOpenTicketsEmbeddable,
  VendorOpenTicketsEmbeddableInput,
} from './vendor_open_tickets_embeddable';

export class VendorOpenTicketsEmbeddableFactory implements EmbeddableFactoryDefinition {
  public readonly type = VENDOR_OPEN_TICKET_SUMMARY_EMBEDDABLE;

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
    return VENDOR_OPEN_TICKET_SUMMARY_TITLE;
  }

  public getIconType() {
    return 'download';
  }

  public async create(initialInput: VendorOpenTicketsEmbeddableInput, parent?: IContainer) {
    return new VendorOpenTicketsEmbeddable(initialInput, this.basePath, parent);
  }
}
