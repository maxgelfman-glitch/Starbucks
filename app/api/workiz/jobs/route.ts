import { NextRequest, NextResponse } from 'next/server';
import { createJob, getAllJobs } from '@/lib/workiz';


export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await getAllJobs();
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await createJob(body);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
