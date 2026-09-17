export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  req: NextRequest,
  { params }: { params: { sessionCode: string } }
) {
  const db = supabaseAdmin();
  const { sessionCode } = params;

  const { data: session } = await db
    .from('sessions')
    .select('id, partner_a_id, partner_b_id')
    .eq('session_code', sessionCode)
    .single();

  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Get all right-swipes from both partners across all rounds
  const { data: rightSwipes } = await db
    .from('swipes')
    .select('tmdb_id, partner')
    .eq('session_id', session.id)
    .eq('direction', 'right');

  if (!rightSwipes || rightSwipes.length === 0) {
    return NextResponse.json({ titles: [] });
  }

  // Count combined likes per title
  const likeCounts = new Map<number, number>();
  for (const swipe of rightSwipes) {
    likeCounts.set(swipe.tmdb_id, (likeCounts.get(swipe.tmdb_id) || 0) + 1);
  }

  // Get top 5 tmdb IDs by combined likes
  const topIds = [...likeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  if (topIds.length === 0) return NextResponse.json({ titles: [] });

  // Fetch title details from pool
  const { data: poolTitles } = await db
    .from('title_pool')
    .select('*')
    .eq('session_id', session.id)
    .in('tmdb_id', topIds);

  // Deduplicate by tmdb_id (pool has entries per round)
  const seen = new Set<number>();
  const unique = (poolTitles || []).filter((t) => {
    if (seen.has(t.tmdb_id)) return false;
    seen.add(t.tmdb_id);
    return true;
  });

  // Attach combined_likes and sort
  const withLikes = unique
    .map((t) => ({ ...t, combined_likes: likeCounts.get(t.tmdb_id) || 0 }))
    .sort((a, b) => b.combined_likes - a.combined_likes || (b.tmdb_rating || 0) - (a.tmdb_rating || 0));

  return NextResponse.json({ titles: withLikes });
}
