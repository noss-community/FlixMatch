export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  _req: NextRequest,
  { params }: { params: { sessionCode: string } }
) {
  const db = supabaseAdmin();
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
