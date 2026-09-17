import { OttPlatform, OTT_DISPLAY_NAMES, OTT_COLORS } from '@/types';

const TMDB_BASE = 'https://api.themoviedb.org/3';

function tmdbHeaders() {
  return { Authorization: `Bearer ${process.env.TMDB_READ_ACCESS_TOKEN}` };
}

async function getImdbId(tmdbId: number, mediaType: 'movie' | 'tv'): Promise<string | null> {
  try {
    const endpoint = mediaType === 'movie'
      ? `/movie/${tmdbId}/external_ids`
      : `/tv/${tmdbId}/external_ids`;
    const res = await fetch(`${TMDB_BASE}${endpoint}`, {
      headers: tmdbHeaders(),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.imdb_id || null;
  } catch {
    return null;
  }
}

interface OttDetailsResponse {
  status: boolean;
  results?: {
    imdb_id?: string;
    title?: string;
    streamingAvailability?: Record<string, Record<string, { link?: string; quality?: string; type?: string }>>;
  };
}

export async function getIndianOttPlatforms(
  tmdbId: number,
  mediaType: 'movie' | 'tv'
): Promise<OttPlatform[]> {
  const apiKey = process.env.RAPIDAPI_KEY;
  const apiHost = process.env.RAPIDAPI_HOST || 'ott-details.p.rapidapi.com';

  if (!apiKey) return [];

  // Get IMDb ID from TMDB (OTT Details API uses IMDb IDs)
  const imdbId = await getImdbId(tmdbId, mediaType);
  if (!imdbId) return [];

  try {
    const url = `https://${apiHost}/giveOTTdetails?imdb_id=${imdbId}`;
    const res = await fetch(url, {
      headers: {
        'x-rapidapi-host': apiHost,
        'x-rapidapi-key': apiKey,
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return [];

    const data: OttDetailsResponse = await res.json();
    if (!data.status || !data.results?.streamingAvailability) return [];

    const availability = data.results.streamingAvailability;

    // Check India keys: "IN", "India", "india"
    const indiaData =
      availability['IN'] ||
      availability['India'] ||
      availability['india'] ||
      null;

    if (!indiaData) return [];

    const platforms: OttPlatform[] = Object.entries(indiaData)
      .filter(([, info]) => info && (info.link || info.type !== 'buy'))
      .map(([serviceName, info]) => {
        const key = serviceName.toLowerCase().replace(/\s+/g, '');
        const matchedKey = Object.keys(OTT_DISPLAY_NAMES).find(
          (k) => key.includes(k) || k.includes(key)
        ) || key;
        return {
          service: matchedKey,
          displayName: OTT_DISPLAY_NAMES[matchedKey] || serviceName,
          streamingType: info.type || 'subscription',
          link: info.link || `https://www.google.com/search?q=${encodeURIComponent(serviceName + ' watch online India')}`,
        };
      });

    // Deduplicate
    const seen = new Set<string>();
    return platforms.filter((p) => {
      if (seen.has(p.service)) return false;
      seen.add(p.service);
      return true;
    });
  } catch (err) {
    console.error('OTT Details API error:', err);
    return [];
  }
}

export { OTT_COLORS };
