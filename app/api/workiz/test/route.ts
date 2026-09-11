import { NextResponse } from 'next/server';
import { testConnection } from '@/lib/workiz';


export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await testConnection();
    return NextResponse.json({ success: true, data: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
