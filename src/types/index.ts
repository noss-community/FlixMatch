export type Partner = 'A' | 'B';
export type MediaType = 'movie' | 'tv';
export type SwipeDirection = 'right' | 'left';

export type SessionStatus =
  | 'waiting'
  | 'both_submitted'
  | 'generating_pool'
  | 'swiping'
  | 'matched'
  | 'finished_no_match';

export interface Session {
  id: string;
  session_code: string;
  partner_a_id: string;
  partner_b_id: string | null;
  status: SessionStatus;
  round: number;
  partner_a_submitted: boolean;
  partner_b_submitted: boolean;
  partner_a_done_swiping: boolean;
  partner_b_done_swiping: boolean;
  created_at: string;
  updated_at: string;
}

export interface PartnerPreferences {
  moods: string[];
  moodDescription?: string;
  languages: string[];
  contentType: 'movies_only' | 'include_series';
  minImdb: number;
  eras: string[];
}

export interface Title {
  tmdb_id: number;
  media_type: MediaType;
  title: string;
  year: number | null;
  imdb_rating: number | null;
  tmdb_rating: number | null;
  runtime: number | null;
  synopsis: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  genres: string[];
  original_language: string | null;
  sort_order_a?: number;
  sort_order_b?: number;
}

export interface OttPlatform {
  service: string;
  displayName: string;
  streamingType: string;
  link: string;
  logo?: string;
}

export interface MatchedTitle extends Title {
  ott_platforms?: OttPlatform[];
}

export interface SwipeResult {
  match: MatchedTitle | null;
  sessionStatus: SessionStatus;
  thisPartnerDone: boolean;
}

export interface TopTitle extends Title {
  combined_likes: number;
}

export interface ClaudeSearchBrief {
  genre_ids: number[];
  sort_by: string;
  languages: string[];
  min_vote_average: number;
  include_adult: boolean;
  include_series: boolean;
  notes: string;
}

export const MOOD_OPTIONS = [
  { value: 'light_fun', label: 'Light & Fun' },
  { value: 'intense_gripping', label: 'Intense & Gripping' },
  { value: 'scary', label: 'Scary' },
  { value: 'romantic', label: 'Romantic' },
  { value: 'other', label: 'Other' },
];

export const LANGUAGE_OPTIONS = [
  { value: 'hi', label: 'Hindi' },
  { value: 'en', label: 'English' },
  { value: 'ta', label: 'Tamil' },
  { value: 'te', label: 'Telugu' },
  { value: 'kn', label: 'Kannada' },
  { value: 'any', label: 'Any' },
];

export const ERA_OPTIONS = [
  { value: 'any', label: 'Any' },
  { value: 'classic', label: 'Classic (pre-2000)' },
  { value: '2000_2020', label: '2000–2020' },
  { value: 'recent', label: 'Recent (2021–2026)' },
];

export const OTT_DISPLAY_NAMES: Record<string, string> = {
  netflix: 'Netflix',
  prime: 'Amazon Prime Video',
  amazon: 'Amazon Prime Video',
  hotstar: 'Disney+ Hotstar',
  disney: 'Disney+ Hotstar',
  zee5: 'ZEE5',
  sonyliv: 'SonyLIV',
  jiocinema: 'JioCinema',
  mubi: 'MUBI',
  apple: 'Apple TV+',
  curiosity: 'Curiosity Stream',
};

export const OTT_COLORS: Record<string, string> = {
  netflix: '#E50914',
  prime: '#00A8E0',
  amazon: '#00A8E0',
  hotstar: '#1C98FF',
  disney: '#1C98FF',
  zee5: '#8A2BE2',
  sonyliv: '#003087',
  jiocinema: '#4A0E8F',
  mubi: '#1C1C1C',
  apple: '#555555',
};
