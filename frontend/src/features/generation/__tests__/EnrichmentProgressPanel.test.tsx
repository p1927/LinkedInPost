import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { EnrichmentProgressPanel } from '../EnrichmentProgressPanel';

describe('EnrichmentProgressPanel', () => {
  it('shows pending label for uncompleted nodes', () => {
    render(
      <EnrichmentProgressPanel
        expectedNodeIds={['psychology-analyzer']}
        completedEvents={[]}
      />
    );
    expect(screen.getByText('Analysing your audience…')).toBeInTheDocument();
  });

  it('shows done label and duration for completed nodes', () => {
    render(
      <EnrichmentProgressPanel
        expectedNodeIds={['psychology-analyzer']}
        completedEvents={[{
          type: 'enrichment:node_completed',
          nodeId: 'psychology-analyzer',
          durationMs: 1200,
          insightSummary: 'Dominant emotion: aspiration',
        }]}
      />
    );
    expect(screen.getByText('Audience psychology mapped')).toBeInTheDocument();
    expect(screen.getByText('1.2s')).toBeInTheDocument();
    expect(screen.getByText('Dominant emotion: aspiration')).toBeInTheDocument();
  });
});
