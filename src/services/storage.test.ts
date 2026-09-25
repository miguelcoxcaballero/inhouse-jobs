import { afterEach, describe, expect, it, vi } from 'vitest';
import { readLocal, writeLocal } from './storage';

describe('local storage resilience', () => {
  afterEach(() => vi.restoreAllMocks());

  it('keeps running if browser storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage is disabled', 'SecurityError');
    });

    expect(() => writeLocal('inhouse.test', { enabled: true })).not.toThrow();
  });

  it('returns the fallback if reading browser storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage is disabled', 'SecurityError');
    });

    expect(readLocal('inhouse.test', 'fallback')).toBe('fallback');
  });
});
