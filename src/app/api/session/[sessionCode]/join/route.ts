export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export async function POST(
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

  if (session.partner_b_id) {
    // Session already has a Partner B — return an error so client knows
    return NextResponse.json({ error: 'Session already has two partners' }, { status: 409 });
  }

  const partnerBId = uuidv4();

  const { error: updateErr } = await db
    .from('sessions')
    .update({ partner_b_id: partnerBId })
    .eq('session_code', sessionCode)
    .is('partner_b_id', null); // Atomic: only update if still null

  if (updateErr) {
    return NextResponse.json({ error: 'Could not join session' }, { status: 500 });
  }

  return NextResponse.json({ partnerId: partnerBId, partner: 'B' });
}
