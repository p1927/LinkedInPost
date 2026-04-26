import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { GenerationJustificationPanel } from '../GenerationJustificationPanel';
import type { NodeRunItem } from '../../../services/backendApi';

const makeNodeRun = (nodeId: string, output: Record<string, unknown>): NodeRunItem => ({
  id: `run-${nodeId}`,
  run_id: 'run-1',
  node_id: nodeId,
  input_json: '{}',
  output_json: JSON.stringify(output),
  model: 'claude-3',
  duration_ms: 500,
  status: 'completed',
  error: null,
  created_at: '2026-01-01T00:00:00Z',
});

const mockNodeRuns: NodeRunItem[] = [
  makeNodeRun('psychology-analyzer', {
    audienceDescription: 'Aspiring entrepreneurs seeking growth',
    dominantEmotion: 'aspiration',
    triggers: [{ type: 'curiosity' }, { type: 'social_proof' }],
  }),
  makeNodeRun('narrative-arc', {
    arc: 'problem_solution',
    selectedHook: { type: 'question' },
    ctaType: 'soft_ask',
  }),
];

describe('GenerationJustificationPanel', () => {
  it('renders nothing when nodeRuns is empty', () => {
    const { container } = render(<GenerationJustificationPanel nodeRuns={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows collapsed trigger button when nodeRuns has data', () => {
    render(<GenerationJustificationPanel nodeRuns={mockNodeRuns} />);
    expect(screen.getByText('Why this post was built this way')).toBeInTheDocument();
    expect(screen.queryByText('Audience insight')).not.toBeInTheDocument();
  });

  it('expands to show audience insight on click', () => {
    render(<GenerationJustificationPanel nodeRuns={mockNodeRuns} />);
    fireEvent.click(screen.getByText('Why this post was built this way'));
    expect(screen.getByText('Audience insight')).toBeInTheDocument();
    expect(screen.getByText('Aspiring entrepreneurs seeking growth')).toBeInTheDocument();
    expect(screen.getByText('Dominant emotion: aspiration')).toBeInTheDocument();
  });
});
