export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { PartnerPreferences } from '@/types';

export async function POST(
  req: NextRequest,
  { params }: { params: { sessionCode: string } }
) {
  const db = supabaseAdmin();
  const { sessionCode } = params;
  const body = await req.json();
  const { partnerId, preferences }: { partnerId: string; preferences: PartnerPreferences } = body;

  if (!partnerId || !preferences) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Get session and determine partner role
  const { data: session, error: sessionErr } = await db
    .from('sessions')
    .select('*')
    .eq('session_code', sessionCode)
    .single();

  if (sessionErr || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  let partner: 'A' | 'B';
  if (session.partner_a_id === partnerId) {
    partner = 'A';
  } else if (session.partner_b_id === partnerId) {
    partner = 'B';
  } else {
    return NextResponse.json({ error: 'Invalid partner ID' }, { status: 403 });
  }

  // Upsert preferences
  const { error: prefErr } = await db.from('partner_preferences').upsert({
    session_id: session.id,
    partner,
    moods: preferences.moods,
    mood_description: preferences.moodDescription || null,
    languages: preferences.languages,
    content_type: preferences.contentType,
    min_imdb: preferences.minImdb,
    eras: preferences.eras,
  }, { onConflict: 'session_id,partner' });

  if (prefErr) {
    return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 });
  }

  // Mark partner as submitted
  const updateField = partner === 'A' ? 'partner_a_submitted' : 'partner_b_submitted';
  const { data: updatedSession, error: updateErr } = await db
    .from('sessions')
    .update({ [updateField]: true })
    .eq('session_code', sessionCode)
    .select()
    .single();

  if (updateErr || !updatedSession) {
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }

  // If both partners submitted, mark as ready for pool generation
  if (updatedSession.partner_a_submitted && updatedSession.partner_b_submitted) {
    await db
      .from('sessions')
      .update({ status: 'both_submitted' })
      .eq('session_code', sessionCode)
      .eq('status', 'waiting');
  }

  return NextResponse.json({ success: true, partner });
}
