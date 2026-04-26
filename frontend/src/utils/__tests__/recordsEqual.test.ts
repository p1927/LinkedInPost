import { describe, it, expect } from 'vitest';
import { recordsEqual } from '../recordsEqual';

describe('recordsEqual', () => {
  it('returns true for two empty records', () => {
    expect(recordsEqual({}, {})).toBe(true);
  });

  it('returns true for identical records', () => {
    expect(recordsEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
  });

  it('returns false when a value differs', () => {
    expect(recordsEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false);
  });

  it('returns false when key counts differ', () => {
    expect(recordsEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  it('returns false when keys differ', () => {
    expect(recordsEqual({ a: 1 }, { b: 1 })).toBe(false);
  });
});
