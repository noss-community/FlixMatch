import { Title } from '@/types';

export function generateSessionCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Seeded random number generator (mulberry32)
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function stringToSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

export function seededShuffle<T>(array: T[], seedStr: string): T[] {
  const arr = [...array];
  const rand = mulberry32(stringToSeed(seedStr));
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function getLocalStorageKey(sessionCode: string): string {
  return `flixmatch_pid_${sessionCode}`;
}

export function savePartnerId(sessionCode: string, partnerId: string): void {
  try {
    localStorage.setItem(getLocalStorageKey(sessionCode), partnerId);
  } catch {
    // localStorage unavailable
  }
}

export function loadPartnerId(sessionCode: string): string | null {
  try {
    return localStorage.getItem(getLocalStorageKey(sessionCode));
  } catch {
    return null;
  }
}

export function getPosterUrl(path: string | null, size: 'w342' | 'w500' | 'original' = 'w342'): string {
  if (!path) return '/placeholder-poster.svg';
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export function getBackdropUrl(path: string | null): string {
  if (!path) return '';
  return `https://image.tmdb.org/t/p/w1280${path}`;
}

export function formatRuntime(minutes: number | null): string {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function sortTitlesForPartner(titles: Title[], partner: 'A' | 'B', sessionCode: string): Title[] {
  const seed = `${sessionCode}-${partner}`;
  return seededShuffle(titles, seed);
}

export function truncate(text: string | null, maxLen: number): string {
  if (!text) return '';
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trim() + '…';
}
