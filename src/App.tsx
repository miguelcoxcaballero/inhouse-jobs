import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, Bookmark, BriefcaseBusiness, Building2, Check, ChevronDown, ChevronRight,
  CircleUserRound, Clock3, FileText, Filter, Heart, History, House, Languages, MapPin,
  Moon, RefreshCw, RotateCcw, Search, Send, SlidersHorizontal, Sparkles, Sun, Trash2, WifiOff, X,
} from 'lucide-react';
import { getMessages } from './i18n';
import { openApplication } from './native/applicationBrowser';
import { loadJobs } from './services/feed';
import { defaultProfile, readLocal, saveCv, upsertApplication, writeLocal } from './services/storage';
import type { AppTab, ApplicationRecord, ApplicationStatus, CandidateProfile, Filters, Job, Language, Workplace } from './types';
import { filterJobs, formatSalary, jobMatchesProfile, relativeDate } from './utils/jobs';

const DEFAULT_FILTERS: Filters = {
  query: '', location: '', workplace: 'all', employmentType: 'all', country: 'all', postedWithinDays: 30, salaryOnly: false,
};

const STORAGE = {
  saved: 'inhouse.jobs.saved.v1', dismissed: 'inhouse.jobs.dismissed.v1', applications: 'inhouse.jobs.applications.v1',
  profile: 'inhouse.jobs.profile.v1', language: 'inhouse.jobs.language.v1', theme: 'inhouse.jobs.theme.v1',
};

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand" aria-label="Inhouse Jobs">
      <svg viewBox="0 0 40 24" fill="none" aria-hidden="true"><path d="M4 22 20 6 36 22" /></svg>
      {!compact && <span>inhouse jobs</span>}
    </div>
  );
}

function CompanyMark({ job }: { job: Job }) {
  if (job.companyLogo) return <img className="company-mark" src={job.companyLogo} alt="" loading="lazy" />;
  const initials = job.company.split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase();
  return <div className="company-mark company-initials" aria-hidden="true">{initials}</div>;
}

function JobMeta({ job, language }: { job: Job; language: Language }) {
  const t = getMessages(language);
  return (
    <div className="job-meta">
      <span><MapPin size={15} />{job.location}</span>
      <span><BriefcaseBusiness size={15} />{job.workplace === 'remote' ? t.remote : job.workplace === 'hybrid' ? t.hybrid : job.workplace === 'onsite' ? t.onsite : job.employmentType}</span>
      <span><Clock3 size={15} />{relativeDate(job.publishedAt, language)}</span>
    </div>
  );
}

function JobCard({ job, language, saved, onSave, onOpen, onApply, profile }: {
  job: Job; language: Language; saved: boolean; onSave: () => void; onOpen: () => void; onApply: () => void; profile: CandidateProfile;
}) {
  const t = getMessages(language);
  const salary = formatSalary(job);
  const match = jobMatchesProfile(job, profile.skills);
  return (
    <article className="job-card">
      <button className="card-main" onClick={onOpen} aria-label={`${t.details}: ${job.title}`}>
        <div className="card-heading">
          <CompanyMark job={job} />
          <div className="title-block"><h3>{job.title}</h3><p>{job.company}</p></div>
          {match > 0 && <span className="match-pill"><Sparkles size={13} />{match}%</span>}
        </div>
        <JobMeta job={job} language={language} />
        <div className="tag-row">
          {salary && <span className="salary-pill">{salary}</span>}
          {job.tags.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}
        </div>
        <div className="source-line"><span>{job.source}</span><ChevronRight size={17} /></div>
      </button>
      <div className="card-actions">
        <button className={`icon-action ${saved ? 'is-saved' : ''}`} onClick={onSave} aria-label={t.save}><Bookmark size={20} fill={saved ? 'currentColor' : 'none'} /></button>
        <button className="apply-button" onClick={onApply}>{t.apply}<ChevronRight size={18} /></button>
      </div>
    </article>
  );
}

function FilterSheet({ filters, setFilters, language, onClose }: {
  filters: Filters; setFilters: (value: Filters) => void; language: Language; onClose: () => void;
}) {
  const t = getMessages(language);
  return (
    <div className="sheet-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="bottom-sheet" role="dialog" aria-modal="true" aria-label={t.filters}>
        <div className="sheet-handle" /><div className="sheet-title"><h2>{t.filters}</h2><button className="close-button" onClick={onClose}><X /></button></div>
        <label>{t.employment}
          <select value={filters.employmentType} onChange={(e) => setFilters({ ...filters, employmentType: e.target.value as Filters['employmentType'] })}>
            <option value="all">{t.all}</option><option value="full-time">Full-time</option><option value="part-time">Part-time</option>
            <option value="contract">Contract</option><option value="internship">Internship</option><option value="temporary">Temporary</option>
          </select>
        </label>
        <label>{t.country}
          <select value={filters.country} onChange={(e) => setFilters({ ...filters, country: e.target.value })}>
            <option value="all">{t.all}</option><option value="ES">España</option><option value="GB">United Kingdom</option><option value="REMOTE">Remote worldwide</option>
          </select>
        </label>
        <label>{t.posted}
          <select value={filters.postedWithinDays} onChange={(e) => setFilters({ ...filters, postedWithinDays: Number(e.target.value) })}>
            <option value={3650}>{t.anyTime}</option><option value={1}>{t.day1}</option><option value={7}>{t.days7}</option><option value={30}>{t.days30}</option>
          </select>
        </label>
        <label className="toggle-row"><span>{t.salaryOnly}</span><input type="checkbox" checked={filters.salaryOnly} onChange={(e) => setFilters({ ...filters, salaryOnly: e.target.checked })} /></label>
        <button className="primary-wide" onClick={onClose}><Check size={18} />{t.results}</button>
      </section>
    </div>
  );
}

function JobDetail({ job, language, saved, onSave, onApply, onClose }: {
  job: Job; language: Language; saved: boolean; onSave: () => void; onApply: () => void; onClose: () => void;
}) {
  const t = getMessages(language);
  return (
    <div className="page-overlay" role="dialog" aria-modal="true" aria-label={job.title}>
      <header className="overlay-header"><button onClick={onClose}><ArrowLeft /></button><Brand compact /><button onClick={onSave}><Bookmark fill={saved ? 'currentColor' : 'none'} /></button></header>
      <main className="detail-content">
        <div className="detail-hero"><CompanyMark job={job} /><p className="eyebrow">{job.source}</p><h1>{job.title}</h1><p className="detail-company">{job.company}</p><JobMeta job={job} language={language} /></div>
        <section><h2>{language === 'es' ? 'Sobre el puesto' : 'About the role'}</h2><p className="job-description">{job.description.replace(/<[^>]+>/g, ' ')}</p></section>
        <section><h2>{language === 'es' ? 'Habilidades y detalles' : 'Skills and details'}</h2><div className="tag-row large">{job.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></section>
        <p className="provenance">{language === 'es' ? 'Oferta proporcionada por' : 'Listing provided by'} {job.source}. <a href={job.sourceUrl} target="_blank" rel="noreferrer">{language === 'es' ? 'Ver fuente' : 'View source'}</a></p>
      </main>
      <footer className="sticky-action"><button className="secondary-wide" onClick={onSave}><Bookmark fill={saved ? 'currentColor' : 'none'} />{t.save}</button><button className="primary-wide" onClick={onApply}><Send />{t.apply}</button></footer>
    </div>
  );
}

function ApplySheet({ job, profile, language, onOpen, onSubmitted, onClose }: {
  job: Job; profile: CandidateProfile; language: Language; onOpen: () => void; onSubmitted: () => void; onClose: () => void;
}) {
  const t = getMessages(language);
  const [opened, setOpened] = useState(false);
  const fields = [profile.fullName, profile.email, profile.phone, profile.city, profile.cvName].filter(Boolean).length;
  return (
    <div className="sheet-backdrop">
      <section className="bottom-sheet apply-sheet" role="dialog" aria-modal="true" aria-label={t.assistant}>
        <div className="sheet-handle" /><div className="sheet-title"><div><p className="eyebrow">{job.company}</p><h2>{t.assistant}</h2></div><button className="close-button" onClick={onClose}><X /></button></div>
        <p>{t.assistantCopy}</p>
        <div className="readiness-card"><div className="readiness-score">{fields}/5</div><div><strong>{profile.fullName || t.fullName}</strong><span>{profile.email || t.missingProfile}</span></div></div>
        <ul className="check-list">
          <li className={profile.fullName ? 'ready' : ''}><Check />{t.fullName}<span>{profile.fullName || '—'}</span></li>
          <li className={profile.email ? 'ready' : ''}><Check />{t.email}<span>{profile.email || '—'}</span></li>
          <li className={profile.cvName ? 'ready' : ''}><Check />{t.cv}<span>{profile.cvName || '—'}</span></li>
        </ul>
        {!opened ? <button className="primary-wide" onClick={async () => { await onOpen(); setOpened(true); }}><Send />{t.openApplication}</button>
          : <button className="primary-wide success" onClick={onSubmitted}><Check />{t.markSubmitted}</button>}
      </section>
    </div>
  );
}

function SwipeDeck({ jobs, language, savedIds, dismissedIds, onDecision, onOpen, onApply, profile }: {
  jobs: Job[]; language: Language; savedIds: string[]; dismissedIds: string[];
  onDecision: (job: Job, decision: 'save' | 'dismiss') => void; onOpen: (job: Job) => void; onApply: (job: Job) => void; profile: CandidateProfile;
}) {
  const t = getMessages(language);
  const stack = jobs.filter((job) => !savedIds.includes(job.id) && !dismissedIds.includes(job.id));
  const active = stack[0];
  const startX = useRef<number | null>(null);
  const [offset, setOffset] = useState(0);

  const decide = (decision: 'save' | 'dismiss') => {
    if (!active) return;
    setOffset(decision === 'save' ? window.innerWidth : -window.innerWidth);
    window.setTimeout(() => { onDecision(active, decision); setOffset(0); }, 180);
  };

  if (!active) return <div className="empty-state"><div className="empty-icon"><Check /></div><h2>{t.noMore}</h2><p>{language === 'es' ? 'Vuelve a búsqueda para cambiar tus filtros.' : 'Return to search to adjust your filters.'}</p></div>;

  const match = jobMatchesProfile(active, profile.skills);
  return (
    <div className="swipe-stage">
      <div className="swipe-heading"><div><p className="eyebrow">{stack.length} {t.results}</p><h1>{t.swipeTitle}</h1></div><p>{t.swipeHelp}</p></div>
      <div className="deck">
        {stack[1] && <div className="swipe-card next-card"><CompanyMark job={stack[1]} /></div>}
        <article
          className="swipe-card active-card"
          style={{ transform: `translateX(${offset}px) rotate(${offset / 28}deg)` }}
          onPointerDown={(event) => { startX.current = event.clientX; (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId); }}
          onPointerMove={(event) => { if (startX.current != null) setOffset(event.clientX - startX.current); }}
          onPointerUp={() => { if (offset > 95) decide('save'); else if (offset < -95) decide('dismiss'); else setOffset(0); startX.current = null; }}
        >
          <div className={`decision-stamp save-stamp ${offset > 30 ? 'visible' : ''}`}>{t.save}</div>
          <div className={`decision-stamp dismiss-stamp ${offset < -30 ? 'visible' : ''}`}>{t.dismiss}</div>
          <div className="swipe-top"><CompanyMark job={active} />{match > 0 && <span className="match-pill"><Sparkles size={14} />{match}%</span>}</div>
          <div className="swipe-copy" onClick={() => onOpen(active)}><p className="eyebrow">{active.company}</p><h2>{active.title}</h2><JobMeta job={active} language={language} /><p>{active.description.replace(/<[^>]+>/g, ' ').slice(0, 210)}…</p><div className="tag-row">{active.tags.slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}</div></div>
          <button className="swipe-apply" onClick={() => onApply(active)}>{t.apply}<ChevronRight /></button>
        </article>
      </div>
      <div className="swipe-controls"><button className="reject-control" onClick={() => decide('dismiss')}><X /></button><button className="detail-control" onClick={() => onOpen(active)}><FileText /></button><button className="save-control" onClick={() => decide('save')}><Heart /></button></div>
    </div>
  );
}

function ProfileView({ profile, setProfile, language, setLanguage, theme, setTheme }: {
  profile: CandidateProfile; setProfile: (profile: CandidateProfile) => void; language: Language; setLanguage: (language: Language) => void;
  theme: 'light' | 'dark'; setTheme: (theme: 'light' | 'dark') => void;
}) {
  const t = getMessages(language);
  const update = (key: keyof CandidateProfile, value: string) => setProfile({ ...profile, [key]: value });
  return (
    <div className="profile-view">
      <div className="profile-intro"><div className="profile-avatar"><CircleUserRound /></div><div><h1>{t.profileTitle}</h1><p><House size={14} />{t.localOnly}</p></div></div>
      <section className="form-card">
        <div className="two-columns"><label>{t.fullName}<input value={profile.fullName} onChange={(e) => update('fullName', e.target.value)} autoComplete="name" /></label><label>{t.email}<input type="email" value={profile.email} onChange={(e) => update('email', e.target.value)} autoComplete="email" /></label></div>
        <div className="two-columns"><label>{t.phone}<input type="tel" value={profile.phone} onChange={(e) => update('phone', e.target.value)} autoComplete="tel" /></label><label>{t.city}<input value={profile.city} onChange={(e) => update('city', e.target.value)} autoComplete="address-level2" /></label></div>
        <div className="two-columns"><label>{t.linkedin}<input value={profile.linkedin} onChange={(e) => update('linkedin', e.target.value)} inputMode="url" /></label><label>{t.website}<input value={profile.website} onChange={(e) => update('website', e.target.value)} inputMode="url" /></label></div>
        <label>{t.skills}<textarea value={profile.skills} onChange={(e) => update('skills', e.target.value)} placeholder="React, ventas, enfermería…" /></label>
        <label>{t.authorization}<input value={profile.workAuthorization} onChange={(e) => update('workAuthorization', e.target.value)} /></label>
        <label>{t.coverLetter}<textarea value={profile.coverLetterTemplate} onChange={(e) => update('coverLetterTemplate', e.target.value)} /></label>
        <div className="cv-picker"><div><FileText /><span><strong>{profile.cvName || t.cv}</strong><small>{profile.cvName ? t.savedLocally : 'PDF, DOC or DOCX'}</small></span></div><label className="secondary-button">{t.chooseCv}<input type="file" accept=".pdf,.doc,.docx" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; const cvPath = await saveCv(file); setProfile({ ...profile, cvName: file.name, cvPath, cvUpdatedAt: new Date().toISOString() }); }} /></label></div>
      </section>
      <section className="settings-card"><h2>{language === 'es' ? 'Preferencias' : 'Preferences'}</h2><div className="setting-row"><div><Languages /><span>{t.language}</span></div><div className="segmented"><button className={language === 'es' ? 'active' : ''} onClick={() => setLanguage('es')}>ES</button><button className={language === 'en' ? 'active' : ''} onClick={() => setLanguage('en')}>EN</button></div></div><div className="setting-row"><div>{theme === 'dark' ? <Moon /> : <Sun />}<span>{t.theme}</span></div><div className="segmented"><button className={theme === 'light' ? 'active' : ''} onClick={() => setTheme('light')}>{t.light}</button><button className={theme === 'dark' ? 'active' : ''} onClick={() => setTheme('dark')}>{t.dark}</button></div></div></section>
    </div>
  );
}

function ActivityView({ jobs, records, language, onStatus, onOpen }: {
  jobs: Job[]; records: ApplicationRecord[]; language: Language; onStatus: (jobId: string, status: ApplicationStatus) => void; onOpen: (job: Job) => void;
}) {
  const t = getMessages(language);
  if (!records.length) return <div className="empty-state"><div className="empty-icon"><History /></div><h2>{language === 'es' ? 'Aún no hay candidaturas' : 'No applications yet'}</h2><p>{language === 'es' ? 'Las ofertas que prepares aparecerán aquí.' : 'Jobs you prepare will appear here.'}</p></div>;
  return <div className="activity-list"><div className="section-heading"><h1>{t.activity}</h1><span>{records.length}</span></div>{records.map((record) => { const job = jobs.find((item) => item.id === record.jobId); if (!job) return null; return <article className="activity-card" key={record.jobId}><button className="activity-job" onClick={() => onOpen(job)}><CompanyMark job={job} /><span><strong>{job.title}</strong><small>{job.company}</small></span><ChevronRight /></button><select value={record.status} onChange={(e) => onStatus(job.id, e.target.value as ApplicationStatus)}><option value="prepared">{t.prepared}</option><option value="submitted">{t.submitted}</option><option value="interview">{t.interview}</option><option value="rejected">{t.rejected}</option><option value="archived">{t.archived}</option></select></article>; })}</div>;
}

export default function App() {
  const [language, setLanguage] = useState<Language>(() => readLocal(STORAGE.language, 'es'));
  const [theme, setTheme] = useState<'light' | 'dark'>(() => readLocal(STORAGE.theme, 'light'));
  const [tab, setTab] = useState<AppTab>('discover');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [feedUpdatedAt, setFeedUpdatedAt] = useState('');
  const [feedLive, setFeedLive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [savedIds, setSavedIds] = useState<string[]>(() => readLocal(STORAGE.saved, []));
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => readLocal(STORAGE.dismissed, []));
  const [applications, setApplications] = useState<ApplicationRecord[]>(() => readLocal(STORAGE.applications, []));
  const [profile, setProfile] = useState<CandidateProfile>(() => readLocal(STORAGE.profile, defaultProfile));
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [applyJob, setApplyJob] = useState<Job | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [visibleLimit, setVisibleLimit] = useState(60);
  const t = getMessages(language);

  const refresh = async () => {
    setLoading(true);
    const result = await loadJobs(undefined, (cached) => {
      setJobs(cached.jobs); setFeedUpdatedAt(cached.updatedAt); setFeedLive(false);
    });
    setJobs(result.jobs); setFeedUpdatedAt(result.updatedAt); setFeedLive(result.live); setLoading(false);
  };

  useEffect(() => { void refresh(); }, []);
  useEffect(() => { document.documentElement.dataset.theme = theme; writeLocal(STORAGE.theme, theme); }, [theme]);
  useEffect(() => writeLocal(STORAGE.language, language), [language]);
  useEffect(() => writeLocal(STORAGE.saved, savedIds), [savedIds]);
  useEffect(() => writeLocal(STORAGE.dismissed, dismissedIds), [dismissedIds]);
  useEffect(() => writeLocal(STORAGE.applications, applications), [applications]);
  useEffect(() => writeLocal(STORAGE.profile, profile), [profile]);
  useEffect(() => setVisibleLimit(60), [filters]);

  const visibleJobs = useMemo(() => filterJobs(jobs, filters).filter((job) => !dismissedIds.includes(job.id)), [jobs, filters, dismissedIds]);
  const savedJobs = useMemo(() => jobs.filter((job) => savedIds.includes(job.id)), [jobs, savedIds]);
  const toggleSave = (id: string) => setSavedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [id, ...current]);
  const prepareApply = (job: Job) => { setApplications((current) => upsertApplication(current, job.id, 'prepared')); setApplyJob(job); };
  const navItems: Array<[AppTab, typeof Search, string]> = [['discover', Search, t.discover], ['swipe', Heart, t.swipe], ['saved', Bookmark, t.saved], ['activity', History, t.activity], ['profile', CircleUserRound, t.profile]];

  return (
    <div className="app-shell">
      <header className="app-header"><Brand /><div className="header-tools">{!feedLive && <span className="offline-pill"><WifiOff />{t.cached}</span>}<button onClick={() => void refresh()} className={loading ? 'is-spinning' : ''} aria-label="Refresh"><RefreshCw /></button><button onClick={() => setLanguage(language === 'es' ? 'en' : 'es')} className="language-button">{language.toUpperCase()}</button></div></header>
      <main className="app-main">
        {tab === 'discover' && <>
          <section className="search-hero"><p className="eyebrow">{language === 'es' ? 'España · UK · remoto' : 'Spain · UK · remote'}</p><h1>{t.headline}</h1><div className="search-box"><Search /><input value={filters.query} onChange={(e) => setFilters({ ...filters, query: e.target.value })} placeholder={t.searchPlaceholder} /></div><div className="location-row"><div className="location-input"><MapPin /><input value={filters.location} onChange={(e) => setFilters({ ...filters, location: e.target.value })} placeholder={t.locationPlaceholder} /></div><button className="filter-button" onClick={() => setShowFilters(true)}><SlidersHorizontal /><span>{t.filters}</span></button></div><div className="workplace-chips">{(['all', 'remote', 'hybrid', 'onsite'] as const).map((value) => <button key={value} className={filters.workplace === value ? 'active' : ''} onClick={() => setFilters({ ...filters, workplace: value })}>{value === 'all' ? t.all : value === 'remote' ? t.remote : value === 'hybrid' ? t.hybrid : t.onsite}</button>)}</div></section>
          <section className="results-section">
            <div className="section-heading">
              <div>
                <h2>{loading && !jobs.length ? t.loadingJobs : `${visibleJobs.length} ${t.results}`}</h2>
                <p>{loading && !jobs.length ? '' : feedUpdatedAt && `${feedLive ? t.updated : t.cached} ${relativeDate(feedUpdatedAt, language)}`}</p>
              </div>
              <button onClick={() => setShowFilters(true)}><Filter />{t.activeFilters}</button>
            </div>
            {loading && !jobs.length ? <div className="feed-loading" role="status"><RefreshCw /><span>{t.loadingJobsCopy}</span></div>
              : visibleJobs.length ? <><div className="job-list">{visibleJobs.slice(0, visibleLimit).map((job) => <JobCard key={job.id} job={job} language={language} saved={savedIds.includes(job.id)} onSave={() => toggleSave(job.id)} onOpen={() => setSelectedJob(job)} onApply={() => prepareApply(job)} profile={profile} />)}</div>{visibleJobs.length > visibleLimit && <button className="load-more" onClick={() => setVisibleLimit((limit) => limit + 60)}>{language === 'es' ? 'Mostrar más ofertas' : 'Show more jobs'}<ChevronRight /></button>}</>
                : <div className="empty-state compact"><Search /><h2>{t.noJobs}</h2><button onClick={() => setFilters(DEFAULT_FILTERS)}>{t.adjust}</button></div>}
          </section>
        </>}
        {tab === 'swipe' && <SwipeDeck jobs={visibleJobs} language={language} savedIds={savedIds} dismissedIds={dismissedIds} profile={profile} onDecision={(job, decision) => decision === 'save' ? setSavedIds((ids) => [job.id, ...ids]) : setDismissedIds((ids) => [job.id, ...ids])} onOpen={setSelectedJob} onApply={prepareApply} />}
        {tab === 'saved' && <section className="saved-view"><div className="section-heading"><div><p className="eyebrow">{savedJobs.length} {t.results}</p><h1>{t.saved}</h1></div>{dismissedIds.length > 0 && <button onClick={() => setDismissedIds([])}><RotateCcw />{t.undo}</button>}</div>{savedJobs.length ? <div className="job-list">{savedJobs.map((job) => <JobCard key={job.id} job={job} language={language} saved onSave={() => toggleSave(job.id)} onOpen={() => setSelectedJob(job)} onApply={() => prepareApply(job)} profile={profile} />)}</div> : <div className="empty-state"><Bookmark /><h2>{language === 'es' ? 'Guarda ofertas para verlas aquí' : 'Save jobs to see them here'}</h2></div>}</section>}
        {tab === 'activity' && <ActivityView jobs={jobs} records={applications} language={language} onStatus={(jobId, status) => setApplications((current) => upsertApplication(current, jobId, status))} onOpen={setSelectedJob} />}
        {tab === 'profile' && <ProfileView profile={profile} setProfile={setProfile} language={language} setLanguage={setLanguage} theme={theme} setTheme={setTheme} />}
      </main>
      <nav className="bottom-nav" aria-label="Main navigation">{navItems.map(([value, Icon, label]) => <button key={value} className={tab === value ? 'active' : ''} onClick={() => setTab(value)}><Icon /><span>{label}</span>{value === 'saved' && savedIds.length > 0 && <b>{savedIds.length}</b>}</button>)}</nav>
      {showFilters && <FilterSheet filters={filters} setFilters={setFilters} language={language} onClose={() => setShowFilters(false)} />}
      {selectedJob && <JobDetail job={selectedJob} language={language} saved={savedIds.includes(selectedJob.id)} onSave={() => toggleSave(selectedJob.id)} onApply={() => prepareApply(selectedJob)} onClose={() => setSelectedJob(null)} />}
      {applyJob && <ApplySheet job={applyJob} profile={profile} language={language} onOpen={async () => { await openApplication(applyJob, profile); }} onSubmitted={() => { setApplications((current) => upsertApplication(current, applyJob.id, 'submitted')); setApplyJob(null); }} onClose={() => setApplyJob(null)} />}
    </div>
  );
}
