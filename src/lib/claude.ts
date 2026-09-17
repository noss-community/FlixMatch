import Anthropic from '@anthropic-ai/sdk';
import { ClaudeSearchBrief, PartnerPreferences, Title } from '@/types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TMDB_GENRES = `
Action: 28, Adventure: 12, Animation: 16, Comedy: 35, Crime: 80,
Documentary: 99, Drama: 18, Family: 10751, Fantasy: 14, History: 36,
Horror: 27, Music: 10402, Mystery: 9648, Romance: 10749, Sci-Fi: 878,
Thriller: 53, War: 10752, Western: 37
`;

function formatPrefs(prefs: PartnerPreferences, label: string): string {
  return `${label}:
- Moods: ${prefs.moods.join(', ')}
- Description: "${prefs.moodDescription || 'none'}"
- Languages: ${prefs.languages.join(', ')}
- Content: ${prefs.contentType === 'movies_only' ? 'Movies only' : 'Movies and TV series'}
- Min IMDb/rating: ${prefs.minImdb}+
- Eras: ${prefs.eras.join(', ')}`;
}

export async function generateSearchBrief(
  prefsA: PartnerPreferences,
  prefsB: PartnerPreferences
): Promise<ClaudeSearchBrief> {
  const prompt = `You help two people find a movie or TV show they'll both enjoy tonight.

${formatPrefs(prefsA, 'Partner A')}

${formatPrefs(prefsB, 'Partner B')}

TMDB genre IDs: ${TMDB_GENRES}

Return ONLY a JSON object (no markdown, no explanation) with these fields:
{
  "genre_ids": [array of TMDB genre IDs that work for BOTH partners - up to 4, use OR logic],
  "sort_by": "popularity.desc" or "vote_average.desc",
  "languages": [array of ISO language codes, e.g. ["hi","en"] - omit if no strong preference],
  "min_vote_average": number (6.0-8.5),
  "include_adult": false,
  "include_series": boolean (true if either partner wants series),
  "notes": "one sentence on your reasoning"
}

Rules:
- Prefer genres that satisfy both partners
- If moods conflict (e.g. scary vs romantic), find a middle ground (thriller, drama)
- Languages: include all languages both partners mentioned; empty array means no filter
- Be generous with genre selection - it's better to have more options
- If descriptions mention specific themes (heist, time travel, etc.), use relevant genres`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = (message.content[0] as { type: string; text: string }).text.trim();

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');
    return JSON.parse(jsonMatch[0]) as ClaudeSearchBrief;
  } catch {
    // Fallback: extract common genres
    return {
      genre_ids: [18, 35, 28], // Drama, Comedy, Action
      sort_by: 'popularity.desc',
      languages: [],
      min_vote_average: prefsA.minImdb > prefsB.minImdb ? prefsB.minImdb : prefsA.minImdb,
      include_adult: false,
      include_series: prefsA.contentType === 'include_series' || prefsB.contentType === 'include_series',
      notes: 'Fallback selection',
    };
  }
}

export async function generateRound2Brief(
  prefsA: PartnerPreferences,
  prefsB: PartnerPreferences,
  likesA: { tmdb_id: number; title: string; genres: string[] }[],
  likesB: { tmdb_id: number; title: string; genres: string[] }[],
  seenIds: number[]
): Promise<ClaudeSearchBrief> {
  const formatLikes = (likes: typeof likesA) =>
    likes.map((t) => `"${t.title}" (${t.genres.join(', ')})`).join(', ') || 'none';

  const prompt = `Round 1 of swiping ended with no match. Help these two find something for round 2.

${formatPrefs(prefsA, 'Partner A')}
Partner A liked: ${formatLikes(likesA)}

${formatPrefs(prefsB, 'Partner B')}
Partner B liked: ${formatLikes(likesB)}

Already seen TMDB IDs (exclude): ${seenIds.join(', ')}

TMDB genre IDs: ${TMDB_GENRES}

Analyse what both partners actually responded to (their likes), find the overlap, and return a JSON search brief:
{
  "genre_ids": [genre IDs based on overlap in their actual likes],
  "sort_by": "vote_average.desc",
  "languages": [ISO codes],
  "min_vote_average": number,
  "include_adult": false,
  "include_series": boolean,
  "notes": "what you noticed from their swipes"
}

Return ONLY the JSON object.`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = (message.content[0] as { type: string; text: string }).text.trim();

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');
    return JSON.parse(jsonMatch[0]) as ClaudeSearchBrief;
  } catch {
    return {
      genre_ids: [18, 53, 9648],
      sort_by: 'vote_average.desc',
      languages: [],
      min_vote_average: 7.0,
      include_adult: false,
      include_series: true,
      notes: 'Fallback round 2',
    };
  }
}
