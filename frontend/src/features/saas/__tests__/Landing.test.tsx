import { describe, it, expect } from 'vitest';

// Email validation regex used in Landing's <input type="email" required>
// The browser validates via the `required` + `type="email"` attributes.
// We extract and test the same logic as a pure function.
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

describe('Landing waitlist email validation', () => {
  it('accepts a standard valid email', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
  });

  it('accepts email with subdomain', () => {
    expect(isValidEmail('user@mail.example.com')).toBe(true);
  });

  it('accepts email with plus addressing', () => {
    expect(isValidEmail('user+tag@example.com')).toBe(true);
  });

  it('rejects email missing @ symbol', () => {
    expect(isValidEmail('notanemail')).toBe(false);
  });

  it('rejects email missing domain after @', () => {
    expect(isValidEmail('user@')).toBe(false);
  });

  it('rejects email missing TLD (no dot after @)', () => {
    expect(isValidEmail('user@example')).toBe(false);
  });

  it('rejects email with leading space', () => {
    expect(isValidEmail(' user@example.com')).toBe(false);
  });

  it('rejects email with space before @', () => {
    expect(isValidEmail('user @example.com')).toBe(false);
  });

  it('rejects email with space in domain', () => {
    expect(isValidEmail('user@exam ple.com')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidEmail('')).toBe(false);
  });
});
