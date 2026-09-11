import { NextRequest, NextResponse } from 'next/server';
import { assignTech } from '@/lib/workiz';


export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { jobId, teamMemberId } = await req.json();
    const result = await assignTech(jobId, teamMemberId);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
