export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  _req: NextRequest,
  { params }: { params: { sessionCode: string } }
) {
  const db = supabaseAdmin();
  const { sessionCode } = params;

  const { data: session } = await db
    .from('sessions')
    .select('id')
    .eq('session_code', sessionCode)
    .single();

  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: matchRecord } = await db
    .from('matches')
    .select('*')
    .eq('session_id', session.id)
    .order('matched_at', { ascending: false })
    .limit(1)
    .single();

  if (!matchRecord) return NextResponse.json({ match: null });

  // Get full title details from pool
  const { data: titleData } = await db
    .from('title_pool')
    .select('*')
    .eq('session_id', session.id)
    .eq('tmdb_id', matchRecord.tmdb_id)
    .limit(1)
    .single();

  const match = titleData || {
    tmdb_id: matchRecord.tmdb_id,
    media_type: matchRecord.media_type,
    title: matchRecord.title,
    poster_url: matchRecord.poster_url,
    genres: [],
  };

  return NextResponse.json({ match });
}
