import { NextRequest, NextResponse } from 'next/server';
import { createInvoice } from '@/lib/workiz';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await createInvoice(body);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
