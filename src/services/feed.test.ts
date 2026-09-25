import { afterEach, describe, expect, it, vi } from 'vitest';
import { sampleJobs } from '../data/sampleJobs';
import { loadJobs } from './feed';

describe('loadJobs', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('falls back instead of hanging when a job source stops responding', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_input: RequestInfo | URL, init?: RequestInit) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Request timed out', 'AbortError')), { once: true });
    })));

    const request = loadJobs();
    await vi.advanceTimersByTimeAsync(15_000);
    const result = await request;

    expect(result.live).toBe(false);
    expect(result.jobs).toEqual(sampleJobs);
  });
});
