import { sampleJobs } from '../data/sampleJobs';
import type { FeedManifest, Job } from '../types';
import { getFeedCache, saveFeedCache } from './storage';

const FEED_ROOT = import.meta.env.VITE_JOB_FEED_ROOT
  || (import.meta.env.DEV ? '/jobs' : 'https://raw.githubusercontent.com/miguelcoxcaballero/inhouse-jobs/main/public/jobs');

export interface FeedResult {
  jobs: Job[];
  updatedAt: string;
  live: boolean;
}

export async function loadJobs(signal?: AbortSignal): Promise<FeedResult> {
  try {
    const feedBase = new URL(`${FEED_ROOT.replace(/\/$/, '')}/`, window.location.href);
    const manifestResponse = await fetch(new URL('manifest.json', feedBase), { cache: 'no-store', signal });
    if (!manifestResponse.ok) throw new Error(`Feed manifest returned ${manifestResponse.status}`);
    const manifest = (await manifestResponse.json()) as FeedManifest;
    const wanted = manifest.shards.filter((shard) => ['es', 'gb', 'remote'].includes(shard.id));
    const shards = await Promise.all(
      wanted.map(async (shard) => {
        const response = await fetch(new URL(shard.url, feedBase), {
          cache: 'no-store',
          signal,
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
    if ((error as Error).name === 'AbortError') throw error;
    const cached = await getFeedCache().catch(() => null);
    if (cached) return { ...cached, live: false };
    return { jobs: sampleJobs, updatedAt: new Date().toISOString(), live: false };
  }
}
