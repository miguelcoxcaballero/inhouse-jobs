export type Workplace = 'remote' | 'hybrid' | 'onsite' | 'unknown';
export type EmploymentType = 'full-time' | 'part-time' | 'contract' | 'internship' | 'temporary' | 'unknown';

export interface Job {
  id: string;
  source: string;
  sourceId: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  city?: string;
  country?: string;
  workplace: Workplace;
  employmentType: EmploymentType;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  description: string;
  tags: string[];
  publishedAt: string;
  applyUrl: string;
  sourceUrl: string;
}

export interface FeedManifest {
  schemaVersion: number;
  updatedAt: string;
  count: number;
  shards: Array<{ id: string; url: string; count: number }>;
  sources: Array<{ id: string; status: 'ok' | 'partial' | 'error'; count: number }>;
}

export interface Filters {
  query: string;
  location: string;
  workplace: Workplace | 'all';
  employmentType: EmploymentType | 'all';
  country: string;
  postedWithinDays: number;
  salaryOnly: boolean;
}

export type ApplicationStatus = 'prepared' | 'submitted' | 'interview' | 'rejected' | 'archived';

export interface ApplicationRecord {
  jobId: string;
  status: ApplicationStatus;
  updatedAt: string;
  note?: string;
}

export interface CandidateProfile {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  linkedin: string;
  website: string;
  skills: string;
  workAuthorization: string;
  coverLetterTemplate: string;
  cvName: string;
  cvPath?: string;
  cvUpdatedAt?: string;
}

export type Language = 'es' | 'en';
export type AppTab = 'discover' | 'swipe' | 'saved' | 'activity' | 'profile';
