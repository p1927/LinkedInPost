import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VersionHistoryStrip } from '../VersionHistoryStrip';
import type { VersionEntry } from '../../../review/context/types';

const makeEntry = (overrides: Partial<VersionEntry> = {}): VersionEntry => ({
  id: 'v1',
  timestamp: Date.now() - 60_000,
  content: 'Some content',
  label: 'Viral Story',
  dimensionWeights: {},
  source: 'generate',
  ...overrides,
});

describe('VersionHistoryStrip', () => {
  it('renders the toggle button', () => {
    render(
      <VersionHistoryStrip
        versions={[]}
        currentVersionId={null}
        onRestore={vi.fn()}
        isOpen={false}
        onToggle={vi.fn()}
      />,
    );
    expect(screen.getByText(/version history/i)).toBeInTheDocument();
  });

  it('does not show chips when closed', () => {
    render(
      <VersionHistoryStrip
        versions={[makeEntry()]}
        currentVersionId={null}
        onRestore={vi.fn()}
        isOpen={false}
        onToggle={vi.fn()}
      />,
    );
    expect(screen.queryByText('Viral Story')).not.toBeInTheDocument();
  });

  it('shows the Current chip and version chips when open', () => {
    render(
      <VersionHistoryStrip
        versions={[makeEntry({ label: 'Viral Story' })]}
        currentVersionId={null}
        onRestore={vi.fn()}
        isOpen={true}
        onToggle={vi.fn()}
      />,
    );
    expect(screen.getByText('Current')).toBeInTheDocument();
    expect(screen.getByText('Viral Story')).toBeInTheDocument();
  });

  it('calls onRestore with the entry when a version chip is clicked', () => {
    const onRestore = vi.fn();
    const entry = makeEntry({ id: 'abc', label: 'My Version' });
    render(
      <VersionHistoryStrip
        versions={[entry]}
        currentVersionId={null}
        onRestore={onRestore}
        isOpen={true}
        onToggle={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('My Version'));
    expect(onRestore).toHaveBeenCalledWith(entry);
  });

  it('calls onToggle when the toggle button is clicked', () => {
    const onToggle = vi.fn();
    render(
      <VersionHistoryStrip
        versions={[]}
        currentVersionId={null}
        onRestore={vi.fn()}
        isOpen={false}
        onToggle={onToggle}
      />,
    );
    fireEvent.click(screen.getByText(/version history/i));
    expect(onToggle).toHaveBeenCalled();
  });

  it('shows save icon for save-source entries', () => {
    const entry = makeEntry({ source: 'save', label: 'Saved · 10:30' });
    render(
      <VersionHistoryStrip
        versions={[entry]}
        currentVersionId={null}
        onRestore={vi.fn()}
        isOpen={true}
        onToggle={vi.fn()}
      />,
    );
    expect(screen.getByText(/Saved · 10:30/)).toBeInTheDocument();
  });
});
