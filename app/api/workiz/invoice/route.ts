import { NextRequest, NextResponse } from 'next/server';
import { updateJob } from '@/lib/workiz';

export async function POST(req: NextRequest) {
  try {
    const { jobId, ...data } = await req.json();
    if (!jobId) {
      return NextResponse.json({ error: 'jobId required' }, { status: 400 });
    }
    const result = await updateJob(jobId, data);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
