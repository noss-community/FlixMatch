export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateSearchBrief, generateRound2Brief } from '@/lib/claude';
import { fetchTitlePool } from '@/lib/tmdb';
import { seededShuffle } from '@/lib/utils';
import { PartnerPreferences } from '@/types';

export const maxDuration = 60;

export async function POST(
  req: NextRequest,
  { params }: { params: { sessionCode: string } }
) {
  const db = supabaseAdmin();
  const { sessionCode } = params;
  const body = await req.json();
  const { partnerId } = body;

  // Get session
  const { data: session } = await db
    .from('sessions')
    .select('*')
    .eq('session_code', sessionCode)
    .single();

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  // Verify partner
  const isValidPartner = session.partner_a_id === partnerId || session.partner_b_id === partnerId;
  if (!isValidPartner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Only generate if status is correct
  const allowedStatuses = ['both_submitted'];
  if (session.round > 1) allowedStatuses.push('swiping'); // round 2 triggers from swiping state

  // Atomically claim generation
  const targetStatus = session.round === 1 ? 'both_submitted' : 'swiping';
  const { data: claimed } = await db
    .from('sessions')
    .update({ status: 'generating_pool' })
    .eq('session_code', sessionCode)
    .eq('status', targetStatus)
    .select()
    .single();

  if (!claimed) {
    // Either already generating, already done, or wrong state — return current pool
    return getExistingPool(db, session.id, session.round, sessionCode);
  }

  try {
    // Fetch both preference profiles
    const { data: prefs } = await db
      .from('partner_preferences')
      .select('*')
      .eq('session_id', session.id);

    const prefA = prefs?.find((p) => p.partner === 'A');
    const prefB = prefs?.find((p) => p.partner === 'B');

    if (!prefA || !prefB) {
      await db.from('sessions').update({ status: 'both_submitted' }).eq('session_code', sessionCode);
      return NextResponse.json({ error: 'Preferences not found' }, { status: 400 });
    }

    const prefsObjA: PartnerPreferences = {
      moods: prefA.moods,
      moodDescription: prefA.mood_description,
      languages: prefA.languages,
      contentType: prefA.content_type,
      minImdb: prefA.min_imdb,
      eras: prefA.eras,
    };

    const prefsObjB: PartnerPreferences = {
      moods: prefB.moods,
      moodDescription: prefB.mood_description,
      languages: prefB.languages,
      contentType: prefB.content_type,
      minImdb: prefB.min_imdb,
      eras: prefB.eras,
    };

    let brief;
    let seenIds: number[] = [];

    if (session.round === 1) {
      brief = await generateSearchBrief(prefsObjA, prefsObjB);
    } else {
      // Round 2: factor in what they liked
      const { data: swipes } = await db
        .from('swipes')
        .select('*')
        .eq('session_id', session.id)
        .eq('direction', 'right');

      const { data: seenPool } = await db
        .from('title_pool')
        .select('tmdb_id')
        .eq('session_id', session.id);

      seenIds = seenPool?.map((t) => t.tmdb_id) || [];

      const { data: pool } = await db
        .from('title_pool')
        .select('tmdb_id, title, genres')
        .eq('session_id', session.id);

      const poolMap = new Map((pool || []).map((t) => [t.tmdb_id, t]));

      const likesA = (swipes || [])
        .filter((s) => s.partner === 'A')
        .map((s) => poolMap.get(s.tmdb_id))
        .filter(Boolean) as { tmdb_id: number; title: string; genres: string[] }[];

      const likesB = (swipes || [])
        .filter((s) => s.partner === 'B')
        .map((s) => poolMap.get(s.tmdb_id))
        .filter(Boolean) as { tmdb_id: number; title: string; genres: string[] }[];

      brief = await generateRound2Brief(prefsObjA, prefsObjB, likesA, likesB, seenIds);
    }

    const allLanguages = [
      ...new Set([...prefsObjA.languages, ...prefsObjB.languages]),
    ].filter((l) => l !== 'any');

    const allEras = [...new Set([...prefsObjA.eras, ...prefsObjB.eras])];

    const titles = await fetchTitlePool(brief, allLanguages, allEras, 30);

    // Filter out already-seen titles for round 2
    const filteredTitles = seenIds.length > 0
      ? titles.filter((t) => !seenIds.includes(t.tmdb_id))
      : titles;

    const finalTitles = filteredTitles.slice(0, 30);

    if (finalTitles.length === 0) {
      await db.from('sessions').update({ status: 'swiping' }).eq('session_code', sessionCode);
      return NextResponse.json({ error: 'No titles found' }, { status: 400 });
    }

    // Create randomized orderings for each partner
    const shuffledA = seededShuffle(finalTitles, `${sessionCode}-A-${session.round}`);
    const shuffledB = seededShuffle(finalTitles, `${sessionCode}-B-${session.round}`);
    const orderA = new Map(shuffledA.map((t, i) => [t.tmdb_id, i]));
    const orderB = new Map(shuffledB.map((t, i) => [t.tmdb_id, i]));

    // Insert title pool
    const rows = finalTitles.map((t) => ({
      session_id: session.id,
      round: session.round,
      tmdb_id: t.tmdb_id,
      media_type: t.media_type,
      title: t.title,
      year: t.year,
      imdb_rating: t.imdb_rating,
      tmdb_rating: t.tmdb_rating,
      runtime: t.runtime,
      synopsis: t.synopsis,
      poster_url: t.poster_url,
      backdrop_url: t.backdrop_url,
      genres: t.genres,
      original_language: t.original_language,
      sort_order_a: orderA.get(t.tmdb_id) ?? 0,
      sort_order_b: orderB.get(t.tmdb_id) ?? 0,
    }));

    await db.from('title_pool').insert(rows);

    // Update session status to swiping and increment round if needed
    await db.from('sessions').update({
      status: 'swiping',
      partner_a_done_swiping: false,
      partner_b_done_swiping: false,
    }).eq('session_code', sessionCode);

    return NextResponse.json({
      pool: finalTitles,
      round: session.round,
    });
  } catch (err) {
    console.error('Pool generation error:', err);
    await db.from('sessions').update({ status: 'both_submitted' }).eq('session_code', sessionCode);
    return NextResponse.json({ error: 'Pool generation failed' }, { status: 500 });
  }
}

async function getExistingPool(
  db: ReturnType<typeof supabaseAdmin>,
  sessionId: string,
  round: number,
  _sessionCode: string
) {
  const { data: pool } = await db
    .from('title_pool')
    .select('*')
    .eq('session_id', sessionId)
    .eq('round', round)
    .order('sort_order_a');

  return NextResponse.json({ pool: pool || [], round });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { sessionCode: string } }
) {
  const db = supabaseAdmin();
  const { sessionCode } = params;
  const partner = req.nextUrl.searchParams.get('partner') as 'A' | 'B' | null;
  const round = parseInt(req.nextUrl.searchParams.get('round') || '1');

  const { data: session } = await db
    .from('sessions')
    .select('id')
    .eq('session_code', sessionCode)
    .single();

  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const orderCol = partner === 'B' ? 'sort_order_b' : 'sort_order_a';

  const { data: pool } = await db
    .from('title_pool')
    .select('*')
    .eq('session_id', session.id)
    .eq('round', round)
    .order(orderCol);

  return NextResponse.json({ pool: pool || [] });
}
