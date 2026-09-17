import { ClaudeSearchBrief, Title } from '@/types';

const TMDB_BASE = 'https://api.themoviedb.org/3';

function tmdbHeaders() {
  return {
    Authorization: `Bearer ${process.env.TMDB_READ_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

interface TmdbMovie {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  genre_ids: number[];
  original_language: string;
  runtime?: number;
  episode_run_time?: number[];
}

interface TmdbDetailsMovie {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  genres: { id: number; name: string }[];
  original_language: string;
  runtime?: number;
  episode_run_time?: number[];
  external_ids?: { imdb_id?: string };
}

const GENRE_MAP: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
  80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
  14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
  9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 10770: 'TV Movie',
  53: 'Thriller', 10752: 'War', 37: 'Western',
  10759: 'Action & Adventure', 10762: 'Kids', 10763: 'News',
  10764: 'Reality', 10765: 'Sci-Fi & Fantasy', 10766: 'Soap',
  10767: 'Talk', 10768: 'War & Politics',
};

function mapToTitle(item: TmdbMovie, mediaType: 'movie' | 'tv'): Title {
  const year = mediaType === 'movie'
    ? (item.release_date ? parseInt(item.release_date.slice(0, 4)) : null)
    : (item.first_air_date ? parseInt(item.first_air_date.slice(0, 4)) : null);

  const runtime = mediaType === 'movie'
    ? (item.runtime ?? null)
    : (item.episode_run_time?.[0] ?? null);

  return {
    tmdb_id: item.id,
    media_type: mediaType,
    title: (item.title || item.name || 'Unknown'),
    year,
    imdb_rating: null,
    tmdb_rating: item.vote_average ? Math.round(item.vote_average * 10) / 10 : null,
    runtime,
    synopsis: item.overview || null,
    poster_url: item.poster_path ? `/t/p/w342${item.poster_path}` : null,
    backdrop_url: item.backdrop_path ? `/t/p/w1280${item.backdrop_path}` : null,
    genres: (item.genre_ids || []).map((id) => GENRE_MAP[id]).filter(Boolean),
    original_language: item.original_language || null,
  };
}

async function discoverPage(
  mediaType: 'movie' | 'tv',
  params: Record<string, string>,
  page: number
): Promise<TmdbMovie[]> {
  const endpoint = mediaType === 'movie' ? '/discover/movie' : '/discover/tv';
  const url = new URL(`${TMDB_BASE}${endpoint}`);
  url.searchParams.set('page', String(page));
  url.searchParams.set('include_adult', 'false');
  url.searchParams.set('language', 'en-US');
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), { headers: tmdbHeaders() });
  if (!res.ok) return [];
  const data = await res.json();
  return data.results || [];
}

export async function fetchTitlePool(
  brief: ClaudeSearchBrief,
  preferredLanguages: string[],
  eraFilters: string[],
  targetCount = 30
): Promise<Title[]> {
  const allTitles: Title[] = [];
  const seenIds = new Set<number>();

  // Build base params from brief
  const baseParams: Record<string, string> = {
    sort_by: brief.sort_by || 'popularity.desc',
    'vote_average.gte': String(brief.min_vote_average || 6.0),
    'vote_count.gte': '100',
  };

  if (brief.genre_ids?.length > 0) {
    baseParams['with_genres'] = brief.genre_ids.join('|'); // OR logic
  }

  // Era filters
  const eraParams = buildEraParams(eraFilters);
  Object.assign(baseParams, eraParams);

  // Languages to query
  const langs = preferredLanguages.includes('any') || preferredLanguages.length === 0
    ? [null] // No language filter
    : preferredLanguages;

  const mediaTypes: Array<'movie' | 'tv'> = brief.include_series
    ? ['movie', 'tv']
    : ['movie'];

  for (const lang of langs) {
    const langParams = lang ? { ...baseParams, with_original_language: lang } : { ...baseParams };

    for (const mediaType of mediaTypes) {
      for (let page = 1; page <= 2 && allTitles.length < targetCount * 2; page++) {
        const results = await discoverPage(mediaType, langParams, page);
        for (const item of results) {
          if (!seenIds.has(item.id)) {
            seenIds.add(item.id);
            allTitles.push(mapToTitle(item, mediaType));
          }
        }
      }
    }
  }

  // Sort by tmdb_rating desc, take top targetCount
  allTitles.sort((a, b) => (b.tmdb_rating ?? 0) - (a.tmdb_rating ?? 0));
  return allTitles.slice(0, targetCount);
}

function buildEraParams(eras: string[]): Record<string, string> {
  if (eras.includes('any') || eras.length === 0) return {};

  const params: Record<string, string> = {};
  const starts: string[] = [];
  const ends: string[] = [];

  if (eras.includes('classic')) {
    ends.push('1999-12-31');
  }
  if (eras.includes('2000_2020')) {
    starts.push('2000-01-01');
    ends.push('2020-12-31');
  }
  if (eras.includes('recent')) {
    starts.push('2021-01-01');
  }

  // If multiple eras, use the widest range
  if (starts.length > 0) {
    params['primary_release_date.gte'] = starts.sort()[0];
    params['first_air_date.gte'] = starts.sort()[0];
  }
  if (ends.length > 0 && !eras.includes('recent')) {
    params['primary_release_date.lte'] = ends.sort().reverse()[0];
    params['first_air_date.lte'] = ends.sort().reverse()[0];
  }

  return params;
}

export async function fetchTitleDetails(
  tmdbId: number,
  mediaType: 'movie' | 'tv'
): Promise<TmdbDetailsMovie | null> {
  const endpoint = mediaType === 'movie' ? `/movie/${tmdbId}` : `/tv/${tmdbId}`;
  const url = `${TMDB_BASE}${endpoint}?append_to_response=external_ids`;
  const res = await fetch(url, { headers: tmdbHeaders() });
  if (!res.ok) return null;
  return res.json();
}
