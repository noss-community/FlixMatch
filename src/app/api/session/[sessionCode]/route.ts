export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  _req: NextRequest,
  { params }: { params: { sessionCode: string } }
) {
  let db;
  try {
    db = supabaseAdmin();
  } catch (e) {
    console.error('Supabase config error:', e);
    return NextResponse.json({ error: 'Server misconfiguration — database not available.' }, { status: 503 });
  }
  const { sessionCode } = params;

  const { data: session, error } = await db
    .from('sessions')
    .select('*')
    .eq('session_code', sessionCode)
    .single();

  if (error || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  return NextResponse.json({ session });
}
