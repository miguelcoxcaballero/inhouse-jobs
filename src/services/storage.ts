import type { ApplicationRecord, CandidateProfile, Job } from '../types';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';

const DB_NAME = 'inhouse-jobs';
const DB_VERSION = 2;
const CV_STORE = 'cv';
const FEED_STORE = 'feed';

export const defaultProfile: CandidateProfile = {
  fullName: '',
  email: '',
  phone: '',
  city: '',
  linkedin: '',
  website: '',
  skills: '',
  workAuthorization: '',
  coverLetterTemplate: '',
  cvName: '',
};

export function readLocal<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeLocal<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CV_STORE)) db.createObjectStore(CV_STORE);
      if (!db.objectStoreNames.contains(FEED_STORE)) db.createObjectStore(FEED_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function fileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function saveCv(file: File): Promise<string | undefined> {
  if (Capacitor.isNativePlatform()) {
    const extension = /\.(pdf|docx?|rtf)$/i.exec(file.name)?.[0].toLowerCase() ?? '.pdf';
    const path = `cv/primary${extension}`;
    await Filesystem.writeFile({ path, data: await fileAsBase64(file), directory: Directory.Data, recursive: true });
    return path;
  }
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(CV_STORE, 'readwrite');
    tx.objectStore(CV_STORE).put(file, 'primary');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return undefined;
}

export async function getCv(): Promise<File | null> {
  const db = await openDb();
  const file = await new Promise<File | null>((resolve, reject) => {
    const tx = db.transaction(CV_STORE, 'readonly');
    const request = tx.objectStore(CV_STORE).get('primary');
    request.onsuccess = () => resolve((request.result as File | undefined) ?? null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return file;
}

export interface CachedFeed {
  jobs: Job[];
  updatedAt: string;
}

export async function saveFeedCache(feed: CachedFeed): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(FEED_STORE, 'readwrite');
    tx.objectStore(FEED_STORE).put(feed, 'latest');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getFeedCache(): Promise<CachedFeed | null> {
  const db = await openDb();
  const feed = await new Promise<CachedFeed | null>((resolve, reject) => {
    const tx = db.transaction(FEED_STORE, 'readonly');
    const request = tx.objectStore(FEED_STORE).get('latest');
    request.onsuccess = () => resolve((request.result as CachedFeed | undefined) ?? null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return feed;
}

export function upsertApplication(
  records: ApplicationRecord[],
  jobId: string,
  status: ApplicationRecord['status'],
): ApplicationRecord[] {
  const next = records.filter((record) => record.jobId !== jobId);
  next.unshift({ jobId, status, updatedAt: new Date().toISOString() });
  return next;
}
