import { Redis } from '@upstash/redis';
import fs from 'fs';
import path from 'path';
import { Job } from './types';

// Use Redis when any known Upstash/Vercel KV env vars are present
const redisUrl = process.env.KV_REST_API_URL
  || process.env.UPSTASH_REDIS_REST_URL
  || process.env.KV_URL
  || '';
const redisToken = process.env.KV_REST_API_TOKEN
  || process.env.UPSTASH_REDIS_REST_TOKEN
  || process.env.KV_REST_API_READ_ONLY_TOKEN
  || '';
const useRedis = !!(redisUrl && redisToken);

let redis: Redis | null = null;
function getRedis(): Redis {
  if (!redis) {
    redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });
  }
  return redis;
}

const JOBS_KEY = 'starbucks:jobs';
const TECHS_KEY = 'starbucks:technicians';
const DATA_DIR = path.join(process.cwd(), 'data');
const JOBS_FILE = path.join(DATA_DIR, 'jobs.json');
const TECHS_FILE = path.join(DATA_DIR, 'technicians.json');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ─── Jobs ───

export async function getAllJobs(): Promise<Job[]> {
  if (useRedis) {
    const data = await getRedis().get<Job[]>(JOBS_KEY);
    return data || [];
  }
  ensureDir();
  try {
    if (!fs.existsSync(JOBS_FILE)) return [];
    return JSON.parse(fs.readFileSync(JOBS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

export async function setAllJobs(jobs: Job[]): Promise<void> {
  if (useRedis) {
    await getRedis().set(JOBS_KEY, jobs);
    return;
  }
  ensureDir();
  fs.writeFileSync(JOBS_FILE, JSON.stringify(jobs, null, 2));
}

export async function getJobById(id: string): Promise<Job | null> {
  const jobs = await getAllJobs();
  return jobs.find((j) => j.id === id) || null;
}

export async function addJobs(newJobs: Job | Job[]): Promise<number> {
  const jobs = await getAllJobs();
  const toAdd = Array.isArray(newJobs) ? newJobs : [newJobs];
  jobs.push(...toAdd);
  await setAllJobs(jobs);
  return toAdd.length;
}

export async function updateJob(id: string, updates: Partial<Job>): Promise<Job | null> {
  const jobs = await getAllJobs();
  const idx = jobs.findIndex((j) => j.id === id);
  if (idx === -1) return null;
  jobs[idx] = { ...jobs[idx], ...updates, updatedAt: new Date().toISOString() };
  await setAllJobs(jobs);
  return jobs[idx];
}

export async function deleteJob(id: string): Promise<void> {
  const jobs = await getAllJobs();
  await setAllJobs(jobs.filter((j) => j.id !== id));
}

// ─── Technicians ───

const DEFAULT_TECHS = ['Max Gelfman', 'Alexander Cardone', 'Alejandro Claudio', 'Jovens Toussaint'];

export async function getTechnicians(): Promise<string[]> {
  if (useRedis) {
    const data = await getRedis().get<string[]>(TECHS_KEY);
    return data || DEFAULT_TECHS;
  }
  ensureDir();
  try {
    if (!fs.existsSync(TECHS_FILE)) return DEFAULT_TECHS;
    return JSON.parse(fs.readFileSync(TECHS_FILE, 'utf-8'));
  } catch {
    return DEFAULT_TECHS;
  }
}

export async function setTechnicians(techs: string[]): Promise<void> {
  if (useRedis) {
    await getRedis().set(TECHS_KEY, techs);
    return;
  }
  ensureDir();
  fs.writeFileSync(TECHS_FILE, JSON.stringify(techs, null, 2));
}
