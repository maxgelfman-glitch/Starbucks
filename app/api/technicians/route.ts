import { NextRequest, NextResponse } from 'next/server';
import { getTechnicians, setTechnicians } from '@/lib/db';


export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(await getTechnicians());
}

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    const techs = await getTechnicians();
    const trimmed = name.trim();
    if (techs.includes(trimmed)) {
      return NextResponse.json({ error: 'Technician already exists' }, { status: 400 });
    }
    techs.push(trimmed);
    await setTechnicians(techs);
    return NextResponse.json({ success: true, technicians: techs });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { name } = await req.json();
    const techs = await getTechnicians();
    const filtered = techs.filter((t) => t !== name);
    await setTechnicians(filtered);
    return NextResponse.json({ success: true, technicians: filtered });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
