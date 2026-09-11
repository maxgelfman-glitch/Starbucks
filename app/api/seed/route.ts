import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { SEED_JOBS, DEFAULT_PRICE } from '@/lib/constants';
import { Job } from '@/lib/types';
import { setAllJobs } from '@/lib/db';


export const dynamic = 'force-dynamic';

export async function POST() {
  const now = new Date().toISOString();
  const jobs: Job[] = SEED_JOBS.map((s) => ({
    id: uuidv4(),
    storeNumber: s.storeNumber,
    address: s.address,
    city: s.city,
    state: s.state,
    price: DEFAULT_PRICE,
    serviceDate: s.date,
    nightNumber: s.night,
    status: 'scheduled' as const,
    createdAt: now,
    updatedAt: now,
  }));

  await setAllJobs(jobs);
  return NextResponse.json({ success: true, count: jobs.length });
}
