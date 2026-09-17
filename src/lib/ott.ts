import { OttPlatform, OTT_DISPLAY_NAMES, OTT_COLORS } from '@/types';

const RAPIDAPI_HOST = 'streaming-availability.p.rapidapi.com';
const RAPIDAPI_BASE = `https://${RAPIDAPI_HOST}`;

interface StreamingService {
  service: string;
  streamingType: string;
  link: string;
}

interface StreamingAvailabilityResponse {
  streamingInfo?: {
    in?: StreamingService[];
    IN?: StreamingService[];
  };
}

export async function getIndianOttPlatforms(
  tmdbId: number,
  mediaType: 'movie' | 'tv'
): Promise<OttPlatform[]> {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) return getSearchFallbacks(tmdbId, mediaType);

  const type = mediaType === 'movie' ? 'movie' : 'series';

  try {
    const url = `${RAPIDAPI_BASE}/shows/${type}/${tmdbId}?country=in&output_language=en`;
    const res = await fetch(url, {
      headers: {
        'x-rapidapi-host': RAPIDAPI_HOST,
        'x-rapidapi-key': apiKey,
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return getSearchFallbacks(tmdbId, mediaType);

    const data: StreamingAvailabilityResponse = await res.json();
    const services = data.streamingInfo?.in || data.streamingInfo?.IN || [];

    const platforms: OttPlatform[] = services
      .filter((s) => s.streamingType !== 'buy' && s.streamingType !== 'rent')
      .map((s) => {
        const serviceKey = s.service.toLowerCase();
        return {
          service: serviceKey,
          displayName: OTT_DISPLAY_NAMES[serviceKey] || s.service,
          streamingType: s.streamingType,
          link: s.link,
        };
      });

    // Deduplicate by service
    const seen = new Set<string>();
    const unique = platforms.filter((p) => {
      if (seen.has(p.service)) return false;
      seen.add(p.service);
      return true;
    });

    return unique.length > 0 ? unique : getSearchFallbacks(tmdbId, mediaType);
  } catch {
    return getSearchFallbacks(tmdbId, mediaType);
  }
}

function getSearchFallbacks(tmdbId: number, _mediaType: 'movie' | 'tv'): OttPlatform[] {
  // Return empty array — UI will show "Check availability" message
  return [];
}

export { OTT_COLORS };
