import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WorkflowCardPicker } from '../WorkflowCardPicker';

describe('WorkflowCardPicker', () => {
  const defaultProps = {
    selectedWorkflowId: '',
    customWorkflows: [],
    onSelect: vi.fn(),
    onOpenBuilder: vi.fn(),
  };

  it('renders featured built-in cards', () => {
    render(<WorkflowCardPicker {...defaultProps} />);
    expect(screen.getByTestId('workflow-card-viral-story')).toBeInTheDocument();
    expect(screen.getByTestId('workflow-card-thought-leadership')).toBeInTheDocument();
  });

  it('calls onSelect with workflow id when card is clicked', () => {
    const onSelect = vi.fn();
    render(<WorkflowCardPicker {...defaultProps} onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId('workflow-card-viral-story'));
    expect(onSelect).toHaveBeenCalledWith('viral-story');
  });

  it('shows selected ring on chosen card', () => {
    render(<WorkflowCardPicker {...defaultProps} selectedWorkflowId="viral-story" />);
    expect(screen.getByTestId('workflow-card-viral-story')).toHaveClass('ring-2');
  });

  it('renders custom workflow cards', () => {
    render(
      <WorkflowCardPicker
        {...defaultProps}
        customWorkflows={[{ id: 'cw_1', name: 'My Voice', description: 'desc', optimizationTarget: 'target', generationInstruction: '', extendsWorkflowId: '' }]}
      />
    );
    expect(screen.getByTestId('workflow-card-custom-cw_1')).toBeInTheDocument();
  });

  it('calls onOpenBuilder when create card clicked', () => {
    const onOpenBuilder = vi.fn();
    render(<WorkflowCardPicker {...defaultProps} onOpenBuilder={onOpenBuilder} />);
    fireEvent.click(screen.getByTestId('workflow-card-create'));
    expect(onOpenBuilder).toHaveBeenCalledWith();
  });
});
