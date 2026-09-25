import { sampleJobs } from '../data/sampleJobs';
import type { FeedManifest, Job } from '../types';
import { getFeedCache, saveFeedCache } from './storage';

const FEED_ROOT = import.meta.env.VITE_JOB_FEED_ROOT
  || (import.meta.env.DEV ? '/jobs' : 'https://raw.githubusercontent.com/miguelcoxcaballero/inhouse-jobs/main/public/jobs');
const FEED_TIMEOUT_MS = 15_000;

export interface FeedResult {
  jobs: Job[];
  updatedAt: string;
  live: boolean;
}

export async function loadJobs(signal?: AbortSignal, onCached?: (result: FeedResult) => void): Promise<FeedResult> {
  let cached: Awaited<ReturnType<typeof getFeedCache>> = null;
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), FEED_TIMEOUT_MS);
  const forwardAbort = () => controller.abort();
  signal?.addEventListener('abort', forwardAbort, { once: true });

  try {
    cached = await getFeedCache().catch(() => null);
    if (cached) onCached?.({ ...cached, live: false });

    const feedBase = new URL(`${FEED_ROOT.replace(/\/$/, '')}/`, window.location.href);
    const manifestResponse = await fetch(new URL('manifest.json', feedBase), { cache: 'no-store', signal: controller.signal });
    if (!manifestResponse.ok) throw new Error(`Feed manifest returned ${manifestResponse.status}`);
    const manifest = (await manifestResponse.json()) as FeedManifest;
    const wanted = manifest.shards.filter((shard) => ['es', 'gb', 'remote'].includes(shard.id));
    const shards = await Promise.all(
      wanted.map(async (shard) => {
        const response = await fetch(new URL(shard.url, feedBase), {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Feed shard ${shard.id} returned ${response.status}`);
        return (await response.json()) as Job[];
      }),
    );
    const jobs = [...new Map(shards.flat().map((job) => [job.id, job])).values()];
    const result: FeedResult = { jobs, updatedAt: manifest.updatedAt, live: true };
    await saveFeedCache({ jobs, updatedAt: manifest.updatedAt });
    return result;
  } catch (error) {
    if (signal?.aborted) throw error;
    if (cached) return { ...cached, live: false };
    return { jobs: sampleJobs, updatedAt: new Date().toISOString(), live: false };
  } finally {
    window.clearTimeout(timeoutId);
    signal?.removeEventListener('abort', forwardAbort);
  }
}
