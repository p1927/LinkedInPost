import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import UsageMeter from '../UsageMeter';

describe('UsageMeter', () => {
  it('renders token count in Xk / Yk format', () => {
    render(<UsageMeter used={50000} budget={500000} resetDate="2026-05-01" />);
    expect(screen.getByText('50k / 500k tokens')).toBeInTheDocument();
  });

  it('shows green color class when usage is below 70%', () => {
    const { container } = render(
      <UsageMeter used={300000} budget={500000} resetDate="2026-05-01" />
    );
    const bar = container.querySelector('.bg-green-500');
    expect(bar).toBeInTheDocument();
  });

  it('shows yellow color class when usage is between 70% and 90%', () => {
    const { container } = render(
      <UsageMeter used={400000} budget={500000} resetDate="2026-05-01" />
    );
    const bar = container.querySelector('.bg-yellow-500');
    expect(bar).toBeInTheDocument();
  });

  it('shows destructive color class when usage exceeds 90%', () => {
    const { container } = render(
      <UsageMeter used={460000} budget={500000} resetDate="2026-05-01" />
    );
    const bar = container.querySelector('.bg-destructive');
    expect(bar).toBeInTheDocument();
  });

  it('caps bar width at 100% when usage exceeds budget', () => {
    const { container } = render(
      <UsageMeter used={600000} budget={500000} resetDate="2026-05-01" />
    );
    const bar = container.querySelector('.bg-destructive') as HTMLElement | null;
    expect(bar).toBeInTheDocument();
    expect(bar?.style.width).toBe('100%');
  });

  it('renders 0k / 0k tokens when both used and budget are zero', () => {
    render(<UsageMeter used={0} budget={0} resetDate="2026-05-01" />);
    expect(screen.getByText('0k / 0k tokens')).toBeInTheDocument();
  });

  it('includes reset date in title tooltip', () => {
    const { container } = render(
      <UsageMeter used={10000} budget={100000} resetDate="2026-05-15" />
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.title).toContain('Resets');
  });
});

describe('UsageMeter display logic (pure)', () => {
  it('formats 50000 tokens as 50k', () => {
    expect((50000 / 1000).toFixed(0)).toBe('50');
  });

  it('calculates percentage correctly at 90%', () => {
    expect(Math.min(100, Math.round((450000 / 500000) * 100))).toBe(90);
  });

  it('caps percentage at 100 when over budget', () => {
    expect(Math.min(100, Math.round((600000 / 500000) * 100))).toBe(100);
  });

  it('assigns green when pct is 69', () => {
    const pct = 69;
    const color = pct > 90 ? 'bg-destructive' : pct > 70 ? 'bg-yellow-500' : 'bg-green-500';
    expect(color).toBe('bg-green-500');
  });

  it('assigns yellow when pct is exactly 71', () => {
    const pct = 71;
    const color = pct > 90 ? 'bg-destructive' : pct > 70 ? 'bg-yellow-500' : 'bg-green-500';
    expect(color).toBe('bg-yellow-500');
  });

  it('assigns destructive when pct is exactly 91', () => {
    const pct = 91;
    const color = pct > 90 ? 'bg-destructive' : pct > 70 ? 'bg-yellow-500' : 'bg-green-500';
    expect(color).toBe('bg-destructive');
  });
});
