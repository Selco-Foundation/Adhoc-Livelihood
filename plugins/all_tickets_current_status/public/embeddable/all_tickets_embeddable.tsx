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
  ALL_TICKETS_CURRENT_STATUS_EMBEDDABLE,
  ALL_TICKETS_CURRENT_STATUS_TITLE,
} from './constants';

// The dashboard container passes its filter pills (including everything emitted by
// Controls), the query bar and the time picker down to every child panel as input.
export interface AllTicketsEmbeddableInput extends EmbeddableInput {
  filters?: Filter[];
  query?: Query;
  timeRange?: TimeRange;
}

export type AllTicketsEmbeddableOutput = EmbeddableOutput;

interface AllTicketsPanelProps {
  basePath: IBasePath;
  getInput: () => AllTicketsEmbeddableInput;
}

function AllTicketsPanel({ basePath, getInput }: AllTicketsPanelProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setIsDownloading(true);
    setError(null);

    try {
      // Read at click time so the export always reflects the dashboard's current state.
      const { filters, query, timeRange } = getInput();

      const res = await fetch(basePath.prepend('/api/all_tickets_current_status/report'), {
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
      link.download = 'all-tickets-current-status.csv';
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
          <h3>{ALL_TICKETS_CURRENT_STATUS_TITLE}</h3>
        </EuiTitle>
        <EuiText size="xs" color={error ? 'danger' : 'subdued'}>
          {error ?? 'Exports the tickets matching the current dashboard filters.'}
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

export class AllTicketsEmbeddable extends Embeddable<
  AllTicketsEmbeddableInput,
  AllTicketsEmbeddableOutput
> {
  public readonly type = ALL_TICKETS_CURRENT_STATUS_EMBEDDABLE;
  private node?: HTMLElement;

  constructor(
    initialInput: AllTicketsEmbeddableInput,
    private readonly basePath: IBasePath,
    parent?: IContainer
  ) {
    // Without a defaultTitle the dashboard renders the panel header as "[No Title]".
    super(initialInput, { defaultTitle: ALL_TICKETS_CURRENT_STATUS_TITLE }, parent);
  }

  public render(node: HTMLElement) {
    this.node = node;
    ReactDOM.render(
      <AllTicketsPanel basePath={this.basePath} getInput={() => this.getInput()} />,
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
