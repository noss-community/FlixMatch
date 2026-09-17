export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { MatchedTitle, SessionStatus } from '@/types';

export async function POST(
  req: NextRequest,
  { params }: { params: { sessionCode: string } }
) {
  const db = supabaseAdmin();
  const { sessionCode } = params;
  const { partnerId, tmdbId, direction, mediaType } = await req.json();

  if (!partnerId || !tmdbId || !direction) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const { data: session } = await db
    .from('sessions')
    .select('*')
    .eq('session_code', sessionCode)
    .single();

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  if (session.status !== 'swiping') return NextResponse.json({ error: 'Not swiping' }, { status: 400 });

  let partner: 'A' | 'B';
  if (session.partner_a_id === partnerId) partner = 'A';
  else if (session.partner_b_id === partnerId) partner = 'B';
  else return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Record swipe (ignore duplicate)
  await db.from('swipes').upsert({
    session_id: session.id,
    partner,
    tmdb_id: tmdbId,
    media_type: mediaType || 'movie',
    direction,
    round: session.round,
  }, { onConflict: 'session_id,partner,tmdb_id,round', ignoreDuplicates: true });

  // Check for match if this is a right swipe
  let matchFound: MatchedTitle | null = null;

  if (direction === 'right') {
    const otherPartner = partner === 'A' ? 'B' : 'A';
    const { data: otherSwipe } = await db
      .from('swipes')
      .select('*')
      .eq('session_id', session.id)
      .eq('partner', otherPartner)
      .eq('tmdb_id', tmdbId)
      .eq('direction', 'right')
      .single();

    if (otherSwipe) {
      // Match found!
      const { data: titleData } = await db
        .from('title_pool')
        .select('*')
        .eq('session_id', session.id)
        .eq('tmdb_id', tmdbId)
        .single();

      if (titleData) {
        matchFound = {
          tmdb_id: titleData.tmdb_id,
          media_type: titleData.media_type,
          title: titleData.title,
          year: titleData.year,
          imdb_rating: titleData.imdb_rating,
          tmdb_rating: titleData.tmdb_rating,
          runtime: titleData.runtime,
          synopsis: titleData.synopsis,
          poster_url: titleData.poster_url,
          backdrop_url: titleData.backdrop_url,
          genres: titleData.genres || [],
          original_language: titleData.original_language,
        };

        // Save match and update session
        await db.from('matches').insert({
          session_id: session.id,
          tmdb_id: tmdbId,
          media_type: titleData.media_type,
          title: titleData.title,
          poster_url: titleData.poster_url,
        });

        await db.from('sessions').update({ status: 'matched' }).eq('session_code', sessionCode);
      }
    }
  }

  // Check if this partner is done swiping
  const { count: swipeCount } = await db
    .from('swipes')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', session.id)
    .eq('partner', partner)
    .eq('round', session.round);

  const { count: poolSize } = await db
    .from('title_pool')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', session.id)
    .eq('round', session.round);

  const isThisPartnerDone = (swipeCount ?? 0) >= (poolSize ?? 30);

  let sessionStatus: SessionStatus = session.status;

  if (isThisPartnerDone && !matchFound) {
    const doneField = partner === 'A' ? 'partner_a_done_swiping' : 'partner_b_done_swiping';
    const { data: updatedSession } = await db
      .from('sessions')
      .update({ [doneField]: true })
      .eq('session_code', sessionCode)
      .select()
      .single();

    if (updatedSession) {
      const bothDone = updatedSession.partner_a_done_swiping && updatedSession.partner_b_done_swiping;

      if (bothDone) {
        if (session.round === 1) {
          // Go to round 2
          await db
            .from('sessions')
            .update({ status: 'both_submitted', round: 2 })
            .eq('session_code', sessionCode);
          sessionStatus = 'both_submitted';
        } else {
          // Round 2 ended with no match → show top 5
          await db
            .from('sessions')
            .update({ status: 'finished_no_match' })
            .eq('session_code', sessionCode);
          sessionStatus = 'finished_no_match';
        }
      }
    }
  }

  if (matchFound) sessionStatus = 'matched';

  return NextResponse.json({
    match: matchFound,
    sessionStatus,
    thisPartnerDone: isThisPartnerDone,
  });
}
