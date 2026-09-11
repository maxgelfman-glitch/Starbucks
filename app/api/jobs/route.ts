import { NextRequest, NextResponse } from 'next/server';
import { getAllJobs, setAllJobs, addJobs } from '@/lib/db';


export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json(await getAllJobs());
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const count = await addJobs(body);
    return NextResponse.json({ success: true, count });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const jobs = await req.json();
    await setAllJobs(jobs);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
