import { Job } from './types';

function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return '';
  }
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
}

export async function getJobs(): Promise<Job[]> {
  const res = await fetch(`${getBaseUrl()}/api/jobs`, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

export async function getJob(id: string): Promise<Job | null> {
  const res = await fetch(`${getBaseUrl()}/api/jobs/${id}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

export async function saveJobs(jobs: Job[]): Promise<void> {
  await fetch(`${getBaseUrl()}/api/jobs`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(jobs),
  });
}

export async function saveJob(job: Job): Promise<void> {
  await fetch(`${getBaseUrl()}/api/jobs/${job.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(job),
  });
}

export async function deleteJob(id: string): Promise<void> {
  await fetch(`${getBaseUrl()}/api/jobs/${id}`, {
    method: 'DELETE',
  });
}
