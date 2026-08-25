import { Capacitor, registerPlugin } from '@capacitor/core';
import type { CandidateProfile, Job } from '../types';

interface ApplicationBrowserPlugin {
  open(options: { url: string; profile: string; job: string }): Promise<void>;
}

const NativeApplicationBrowser = registerPlugin<ApplicationBrowserPlugin>('ApplicationBrowser');

export async function openApplication(job: Job, profile: CandidateProfile): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await NativeApplicationBrowser.open({
      url: job.applyUrl,
      profile: JSON.stringify(profile),
      job: JSON.stringify({ title: job.title, company: job.company, location: job.location }),
    });
    return;
  }
  window.open(job.applyUrl, '_blank', 'noopener,noreferrer');
}
