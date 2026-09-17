export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getIndianOttPlatforms } from '@/lib/ott';

export async function GET(
  req: NextRequest,
  { params }: { params: { tmdbId: string } }
) {
  const tmdbId = parseInt(params.tmdbId);
  const mediaType = (req.nextUrl.searchParams.get('type') || 'movie') as 'movie' | 'tv';

  if (isNaN(tmdbId)) {
    return NextResponse.json({ error: 'Invalid TMDB ID' }, { status: 400 });
  }

  try {
    const platforms = await getIndianOttPlatforms(tmdbId, mediaType);
    return NextResponse.json({ platforms });
  } catch (err) {
    console.error('OTT lookup error:', err);
    return NextResponse.json({ platforms: [] });
  }
}
