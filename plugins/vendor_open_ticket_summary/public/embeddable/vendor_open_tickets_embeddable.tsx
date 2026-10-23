import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle } from '@elastic/eui';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import { IBasePath } from '../../../../src/core/public';
import {
  Embeddable,
  EmbeddableInput,
  EmbeddableOutput,
  IContainer,
} from '../../../../src/plugins/embeddable/public';
import {
  VENDOR_OPEN_TICKET_SUMMARY_EMBEDDABLE,
  VENDOR_OPEN_TICKET_SUMMARY_TITLE,
} from './constants';

// The dashboard container passes its filter pills (including everything emitted by
// Controls), the query bar and the time picker down to every child panel as input.
export interface VendorOpenTicketsEmbeddableInput extends EmbeddableInput {
  filters?: Filter[];
  query?: Query;
  timeRange?: TimeRange;
}

export type VendorOpenTicketsEmbeddableOutput = EmbeddableOutput;

interface VendorOpenTicketsPanelProps {
  basePath: IBasePath;
  getInput: () => VendorOpenTicketsEmbeddableInput;
}

function VendorOpenTicketsPanel({ basePath, getInput }: VendorOpenTicketsPanelProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setIsDownloading(true);
    setError(null);

    try {
      // Read at click time so the export always reflects the dashboard's current state.
      const { filters, query, timeRange } = getInput();

      const res = await fetch(basePath.prepend('/api/vendor_open_ticket_summary/report'), {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'kbn-xsrf': 'true',
        },
        body: JSON.stringify({ filters, query, timeRange }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Export failed with status ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'vendor-open-ticket-summary.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <EuiFlexGroup
      direction="row"
      alignItems="center"
      justifyContent="spaceBetween"
      gutterSize="m"
      responsive={false}
      style={{ height: '100%', padding: 8 }}
    >
      <EuiFlexItem grow={true}>
        <EuiTitle size="xs">
          <h3>{VENDOR_OPEN_TICKET_SUMMARY_TITLE}</h3>
        </EuiTitle>
        <EuiText size="xs" color={error ? 'danger' : 'subdued'}>
          {error ?? 'Open tickets per vendor for the current dashboard filters.'}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          iconType="download"
          onClick={handleDownload}
          isLoading={isDownloading}
          disabled={isDownloading}
        >
          {isDownloading ? 'Preparing CSV…' : 'Download CSV'}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export class VendorOpenTicketsEmbeddable extends Embeddable<
  VendorOpenTicketsEmbeddableInput,
  VendorOpenTicketsEmbeddableOutput
> {
  public readonly type = VENDOR_OPEN_TICKET_SUMMARY_EMBEDDABLE;
  private node?: HTMLElement;

  constructor(
    initialInput: VendorOpenTicketsEmbeddableInput,
    private readonly basePath: IBasePath,
    parent?: IContainer
  ) {
    // Without a defaultTitle the dashboard renders the panel header as "[No Title]".
    super(initialInput, { defaultTitle: VENDOR_OPEN_TICKET_SUMMARY_TITLE }, parent);
  }

  public render(node: HTMLElement) {
    this.node = node;
    ReactDOM.render(
      <VendorOpenTicketsPanel basePath={this.basePath} getInput={() => this.getInput()} />,
      node
    );
  }

  public reload() {}

  public destroy() {
    super.destroy();
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
  }
}
