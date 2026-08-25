import type { Filters, Job } from '../types';

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function filterJobs(jobs: Job[], filters: Filters): Job[] {
  const query = normalize(filters.query.trim());
  const location = normalize(filters.location.trim());
  const cutoff = Date.now() - filters.postedWithinDays * 86_400_000;

  return jobs
    .filter((job) => {
      const searchable = normalize([job.title, job.company, job.location, job.description, ...job.tags].join(' '));
      if (query && !searchable.includes(query)) return false;
      if (location && !normalize(`${job.location} ${job.city ?? ''} ${job.country ?? ''}`).includes(location)) return false;
      if (filters.workplace !== 'all' && job.workplace !== filters.workplace) return false;
      if (filters.employmentType !== 'all' && job.employmentType !== filters.employmentType) return false;
      if (filters.country && filters.country !== 'all' && job.country !== filters.country) return false;
      if (filters.salaryOnly && job.salaryMin == null && job.salaryMax == null) return false;
      return Number.isNaN(Date.parse(job.publishedAt)) || Date.parse(job.publishedAt) >= cutoff;
    })
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}

export function formatSalary(job: Job): string | null {
  if (job.salaryMin == null && job.salaryMax == null) return null;
  const currency = job.salaryCurrency || 'EUR';
  const formatter = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  });
  if (job.salaryMin != null && job.salaryMax != null) return `${formatter.format(job.salaryMin)}–${formatter.format(job.salaryMax)}`;
  return job.salaryMin != null ? `From ${formatter.format(job.salaryMin)}` : `Up to ${formatter.format(job.salaryMax!)}`;
}

export function relativeDate(value: string, locale: string): string {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return '';
  const days = Math.max(0, Math.floor((Date.now() - parsed) / 86_400_000));
  if (days === 0) return locale.startsWith('es') ? 'Hoy' : 'Today';
  if (days === 1) return locale.startsWith('es') ? 'Ayer' : 'Yesterday';
  return locale.startsWith('es') ? `Hace ${days} días` : `${days} days ago`;
}

export function jobMatchesProfile(job: Job, skills: string): number {
  const terms = skills.split(/[,;\n]/).map((item) => normalize(item.trim())).filter(Boolean);
  if (!terms.length) return 0;
  const searchable = normalize(`${job.title} ${job.description} ${job.tags.join(' ')}`);
  return Math.round((terms.filter((term) => searchable.includes(term)).length / terms.length) * 100);
}
