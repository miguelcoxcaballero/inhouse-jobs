import { describe, expect, it } from 'vitest';
import { sampleJobs } from '../data/sampleJobs';
import { filterJobs, jobMatchesProfile } from './jobs';

const defaults = {
  query: '',
  location: '',
  workplace: 'all' as const,
  employmentType: 'all' as const,
  country: 'all',
  postedWithinDays: 365,
  salaryOnly: false,
};

describe('filterJobs', () => {
  it('matches accent-insensitive text across title and tags', () => {
    expect(filterJobs(sampleJobs, { ...defaults, query: 'typescript' })).toHaveLength(1);
  });

  it('combines workplace and location filters', () => {
    const result = filterJobs(sampleJobs, { ...defaults, location: 'spain', workplace: 'hybrid' });
    expect(result.map((job) => job.city)).toEqual(expect.arrayContaining(['Madrid', 'Valencia']));
  });

  it('can require salary data', () => {
    expect(filterJobs(sampleJobs, { ...defaults, salaryOnly: true }).every((job) => job.salaryMin != null || job.salaryMax != null)).toBe(true);
  });
});

describe('jobMatchesProfile', () => {
  it('scores matching profile skills', () => {
    expect(jobMatchesProfile(sampleJobs[1], 'React, TypeScript, Cooking')).toBe(67);
  });
});
