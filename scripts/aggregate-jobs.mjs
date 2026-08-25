import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const OUTPUT = path.resolve('public/jobs');
const USER_AGENT = 'InhouseJobs/0.1 (+https://github.com/miguelcoxcaballero/inhouse-jobs)';
const MAX_DESCRIPTION = 12_000;

const stripHtml = (value = '') => value
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, MAX_DESCRIPTION);

const text = (value) => String(value ?? '').trim();
const isoDate = (value) => {
  const date = new Date(value || Date.now());
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};
const slug = (value) => text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const idFor = (...values) => createHash('sha256').update(values.map(slug).join('|')).digest('hex').slice(0, 24);
const workplace = (value, location = '') => {
  const haystack = `${value} ${location}`.toLowerCase();
  if (/hybrid|hibrid/.test(haystack)) return 'hybrid';
  if (/remote|remoto|anywhere|worldwide/.test(haystack)) return 'remote';
  if (/on.?site|presencial|office/.test(haystack)) return 'onsite';
  return 'unknown';
};
const employment = (value = '') => {
  const item = text(Array.isArray(value) ? value.join(' ') : value).toLowerCase();
  if (/part/.test(item)) return 'part-time';
  if (/contract|freelance/.test(item)) return 'contract';
  if (/intern|practi/.test(item)) return 'internship';
  if (/temp/.test(item)) return 'temporary';
  if (/full|permanent/.test(item)) return 'full-time';
  return 'unknown';
};
const countryFor = (location = '', raw = '') => {
  const value = `${location} ${raw}`.toLowerCase();
  if (/remote|worldwide|anywhere/.test(value)) return 'REMOTE';
  if (/spain|españa|madrid|barcelona|valencia|sevilla|bilbao|málaga|malaga/.test(value)) return 'ES';
  if (/united kingdom|\buk\b|england|scotland|wales|london|manchester|birmingham|bristol|edinburgh|glasgow/.test(value)) return 'GB';
  return text(raw).toUpperCase().slice(0, 2) || 'OTHER';
};
const tags = (...values) => [...new Set(values.flatMap((value) => Array.isArray(value) ? value : text(value).split(/[,|]/)).map(text).filter(Boolean))].slice(0, 12);

async function getJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  try {
    const response = await fetch(url, {
      ...options,
      headers: { Accept: 'application/json', 'User-Agent': USER_AGENT, ...(options.headers || {}) },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function normalized(input) {
  const job = {
    id: input.id || idFor(input.source, input.sourceId, input.title, input.company, input.location),
    source: text(input.source), sourceId: text(input.sourceId), title: text(input.title), company: text(input.company) || 'Unknown company',
    location: text(input.location) || 'Location not specified', city: text(input.city) || undefined,
    country: text(input.country) || countryFor(input.location), workplace: input.workplace || workplace('', input.location),
    employmentType: input.employmentType || 'unknown', salaryMin: Number(input.salaryMin) || undefined,
    salaryMax: Number(input.salaryMax) || undefined, salaryCurrency: text(input.salaryCurrency) || undefined,
    description: stripHtml(input.description), tags: tags(input.tags), publishedAt: isoDate(input.publishedAt),
    applyUrl: text(input.applyUrl || input.sourceUrl), sourceUrl: text(input.sourceUrl || input.applyUrl),
    companyLogo: text(input.companyLogo) || undefined,
  };
  if (!job.title || !job.applyUrl || !/^https?:\/\//.test(job.applyUrl)) return null;
  return Object.fromEntries(Object.entries(job).filter(([, value]) => value !== undefined && value !== ''));
}

const adapters = [
  {
    id: 'remotive',
    async run() {
      const data = await getJson('https://remotive.com/api/remote-jobs?limit=2000');
      return (data.jobs || []).map((item) => normalized({ source: 'Remotive', sourceId: item.id, title: item.title, company: item.company_name,
        companyLogo: item.company_logo, location: item.candidate_required_location || 'Remote', country: 'REMOTE', workplace: 'remote',
        employmentType: employment(item.job_type), salaryCurrency: 'USD', description: item.description, tags: item.tags,
        publishedAt: item.publication_date, applyUrl: item.url, sourceUrl: item.url }));
    },
  },
  {
    id: 'arbeitnow',
    async run() {
      const all = [];
      for (let page = 1; page <= 5; page += 1) {
        const data = await getJson(`https://www.arbeitnow.com/api/job-board-api?page=${page}`);
        all.push(...(data.data || []));
        if (!data.links?.next) break;
      }
      return all.map((item) => normalized({ source: 'Arbeitnow', sourceId: item.slug, title: item.title, company: item.company_name,
        location: item.location, country: countryFor(item.location), workplace: item.remote ? 'remote' : workplace('', item.location),
        employmentType: employment(item.job_types), description: item.description,
        tags: [...(Array.isArray(item.tags) ? item.tags : [item.tags]), ...(Array.isArray(item.job_types) ? item.job_types : [item.job_types])],
        publishedAt: item.created_at ? Number(item.created_at) * 1000 : undefined, applyUrl: item.url, sourceUrl: item.url }));
    },
  },
  {
    id: 'remoteok',
    async run() {
      const data = await getJson('https://remoteok.com/api');
      return data.filter((item) => item?.position).map((item) => normalized({ source: 'Remote OK', sourceId: item.id, title: item.position,
        company: item.company, companyLogo: item.logo, location: item.location || 'Remote worldwide', country: 'REMOTE', workplace: 'remote',
        employmentType: 'unknown', salaryMin: item.salary_min, salaryMax: item.salary_max, salaryCurrency: 'USD', description: item.description,
        tags: item.tags, publishedAt: item.date, applyUrl: item.apply_url || item.url, sourceUrl: item.url }));
    },
  },
  {
    id: 'jobicy',
    async run() {
      const data = await getJson('https://jobicy.com/api/v2/remote-jobs?count=100');
      return (data.jobs || []).map((item) => normalized({ source: 'Jobicy', sourceId: item.id, title: item.jobTitle, company: item.companyName,
        companyLogo: item.companyLogo, location: item.jobGeo || 'Remote', country: 'REMOTE', workplace: 'remote',
        employmentType: employment(item.jobType), salaryMin: item.annualSalaryMin, salaryMax: item.annualSalaryMax,
        salaryCurrency: item.salaryCurrency, description: item.jobDescription, tags: [item.jobIndustry, item.jobLevel],
        publishedAt: item.pubDate, applyUrl: item.url, sourceUrl: item.url }));
    },
  },
  {
    id: 'adzuna', optional: true,
    async run() {
      const appId = process.env.ADZUNA_APP_ID;
      const appKey = process.env.ADZUNA_APP_KEY;
      if (!appId || !appKey) return [];
      const all = [];
      for (const market of ['es', 'gb']) {
        for (let page = 1; page <= 5; page += 1) {
          const url = new URL(`https://api.adzuna.com/v1/api/jobs/${market}/search/${page}`);
          url.search = new URLSearchParams({ app_id: appId, app_key: appKey, results_per_page: '50', content_type: 'application/json' }).toString();
          const data = await getJson(url);
          all.push(...(data.results || []).map((item) => ({ ...item, market })));
        }
      }
      return all.map((item) => normalized({ source: 'Adzuna', sourceId: item.id, title: item.title, company: item.company?.display_name,
        location: item.location?.display_name, country: item.market.toUpperCase(), workplace: workplace(item.title, item.description),
        employmentType: employment(item.contract_time || item.contract_type), salaryMin: item.salary_min, salaryMax: item.salary_max,
        salaryCurrency: item.market === 'gb' ? 'GBP' : 'EUR', description: item.description, tags: [item.category?.label],
        publishedAt: item.created, applyUrl: item.redirect_url, sourceUrl: item.redirect_url }));
    },
  },
];

async function loadAtsBoards() {
  try { return JSON.parse(await readFile('data/ats-boards.json', 'utf8')); } catch { return { lever: [], greenhouse: [], ashby: [] }; }
}

async function fetchAtsJobs() {
  const boards = await loadAtsBoards();
  const results = [];
  for (const slugName of boards.lever || []) {
    try {
      const data = await getJson(`https://api.lever.co/v0/postings/${encodeURIComponent(slugName)}?mode=json`);
      results.push(...data.map((item) => normalized({ source: 'Lever', sourceId: item.id, title: item.text, company: slugName,
        location: item.categories?.allLocations?.join(', ') || item.categories?.location, country: item.country,
        workplace: workplace(item.workplaceType, item.categories?.location), employmentType: employment(item.categories?.commitment),
        salaryMin: item.salaryRange?.min, salaryMax: item.salaryRange?.max, salaryCurrency: item.salaryRange?.currency,
        description: item.descriptionPlain || item.description, tags: [item.categories?.team, item.categories?.department, item.categories?.level],
        publishedAt: Date.now(), applyUrl: item.applyUrl, sourceUrl: item.hostedUrl })));
    } catch (error) { console.warn(`Lever/${slugName}: ${error.message}`); }
  }
  for (const slugName of boards.greenhouse || []) {
    try {
      const data = await getJson(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slugName)}/jobs?content=true`);
      results.push(...(data.jobs || []).map((item) => normalized({ source: 'Greenhouse', sourceId: item.id, title: item.title,
        company: slugName, location: item.location?.name, country: countryFor(item.location?.name), workplace: workplace(item.title, item.location?.name),
        description: item.content, tags: (item.departments || []).map((part) => part.name), publishedAt: item.updated_at,
        applyUrl: item.absolute_url, sourceUrl: item.absolute_url })));
    } catch (error) { console.warn(`Greenhouse/${slugName}: ${error.message}`); }
  }
  for (const slugName of boards.ashby || []) {
    try {
      const data = await getJson(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(slugName)}`);
      results.push(...(data.jobs || []).map((item) => normalized({ source: 'Ashby', sourceId: item.id || item.jobUrl, title: item.title,
        company: slugName, location: item.location, country: countryFor(item.location), workplace: item.isRemote ? 'remote' : workplace(item.workplaceType, item.location),
        employmentType: employment(item.employmentType), description: item.descriptionPlain || item.descriptionHtml, tags: [item.department, item.team],
        publishedAt: item.publishedAt || Date.now(), applyUrl: item.applyUrl || item.jobUrl, sourceUrl: item.jobUrl })));
    } catch (error) { console.warn(`Ashby/${slugName}: ${error.message}`); }
  }
  return results.filter(Boolean);
}

function deduplicate(jobs) {
  const seen = new Map();
  for (const job of jobs.filter(Boolean)) {
    const fingerprint = [job.title, job.company, job.location].map(slug).join('|');
    const current = seen.get(fingerprint);
    if (!current || (job.description?.length || 0) > (current.description?.length || 0)) seen.set(fingerprint, job);
  }
  return [...seen.values()].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}

await mkdir(OUTPUT, { recursive: true });
const statuses = [];
const collected = [];
for (const adapter of adapters) {
  try {
    const jobs = (await adapter.run()).filter(Boolean);
    collected.push(...jobs);
    statuses.push({ id: adapter.id, status: jobs.length || adapter.optional ? 'ok' : 'partial', count: jobs.length });
    console.log(`${adapter.id}: ${jobs.length}`);
  } catch (error) {
    statuses.push({ id: adapter.id, status: 'error', count: 0 });
    console.warn(`${adapter.id}: ${error.message}`);
  }
}
const atsJobs = await fetchAtsJobs();
collected.push(...atsJobs);
statuses.push({ id: 'public-ats', status: 'ok', count: atsJobs.length });

const jobs = deduplicate(collected);
if (!jobs.length) throw new Error('All job sources failed; refusing to replace the current feed.');

const shards = {
  es: jobs.filter((job) => job.country === 'ES'),
  gb: jobs.filter((job) => job.country === 'GB'),
  remote: jobs.filter((job) => job.country === 'REMOTE' || job.workplace === 'remote'),
  other: jobs.filter((job) => !['ES', 'GB', 'REMOTE'].includes(job.country) && job.workplace !== 'remote'),
};
const manifestShards = [];
for (const [id, values] of Object.entries(shards)) {
  const filename = `${id}.json`;
  await writeFile(path.join(OUTPUT, filename), `${JSON.stringify(values)}\n`);
  manifestShards.push({ id, url: filename, count: values.length });
}
const manifest = { schemaVersion: 1, updatedAt: new Date().toISOString(), count: jobs.length, shards: manifestShards, sources: statuses };
await writeFile(path.join(OUTPUT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Published ${jobs.length} unique jobs.`);
