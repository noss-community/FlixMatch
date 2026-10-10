export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export async function POST(
  _req: NextRequest,
  { params }: { params: { sessionCode: string } }
) {
  let db;
  try {
    db = supabaseAdmin();
  } catch (e) {
    console.error('Supabase config error:', e);
    return NextResponse.json({ error: 'Server misconfiguration.' }, { status: 503 });
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

  if (session.partner_b_id) {
    // Session already has a Partner B — return an error so client knows
    return NextResponse.json({ error: 'Session already has two partners' }, { status: 409 });
  }

  const partnerBId = uuidv4();

  const { data: updated, error: updateErr } = await db
    .from('sessions')
    .update({ partner_b_id: partnerBId })
    .eq('session_code', sessionCode)
    .is('partner_b_id', null) // Atomic: only update if still null
    .select('partner_b_id');

  if (updateErr) {
    console.error('Join update error:', updateErr);
    return NextResponse.json({ error: 'Could not join session', detail: updateErr.message }, { status: 500 });
  }

  if (!updated || updated.length === 0) {
    // 0 rows updated — race condition (another client just joined) or RLS block
    return NextResponse.json({ error: 'Session already has two partners' }, { status: 409 });
  }

  return NextResponse.json({ partnerId: partnerBId, partner: 'B' });
}
