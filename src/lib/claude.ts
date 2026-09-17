import { GoogleGenerativeAI } from '@google/generative-ai';
import { ClaudeSearchBrief, PartnerPreferences } from '@/types';

function getModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
}

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
- Min rating: ${prefs.minImdb}+
- Eras: ${prefs.eras.join(', ')}`;
}

function fallbackBrief(prefsA: PartnerPreferences, prefsB: PartnerPreferences): ClaudeSearchBrief {
  return {
    genre_ids: [18, 35, 28],
    sort_by: 'popularity.desc',
    languages: [],
    min_vote_average: Math.min(prefsA.minImdb, prefsB.minImdb),
    include_adult: false,
    include_series:
      prefsA.contentType === 'include_series' || prefsB.contentType === 'include_series',
    notes: 'Fallback selection',
  };
}

async function callGemini(prompt: string): Promise<string> {
  const model = getModel();
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

function extractJson(text: string): ClaudeSearchBrief {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON in response');
  return JSON.parse(match[0]) as ClaudeSearchBrief;
}

export async function generateSearchBrief(
  prefsA: PartnerPreferences,
  prefsB: PartnerPreferences
): Promise<ClaudeSearchBrief> {
  const prompt = `You help two people find a movie or TV show they'll both enjoy tonight.

${formatPrefs(prefsA, 'Partner A')}

${formatPrefs(prefsB, 'Partner B')}

TMDB genre IDs: ${TMDB_GENRES}

Return ONLY a JSON object (no markdown fences, no explanation) with these exact fields:
{
  "genre_ids": [array of up to 4 TMDB genre IDs satisfying BOTH partners],
  "sort_by": "popularity.desc" or "vote_average.desc",
  "languages": [ISO-639-1 codes e.g. ["hi","en"] — empty array means no filter],
  "min_vote_average": number between 6.0 and 8.5,
  "include_adult": false,
  "include_series": boolean,
  "notes": "one sentence on reasoning"
}

Rules:
- If moods conflict, find middle ground (e.g. intense+romantic → thriller/drama)
- Be generous with genres — OR logic gives more results
- If descriptions mention themes (heist, time travel etc.), pick relevant genres`;

  try {
    const text = await callGemini(prompt);
    return extractJson(text);
  } catch (err) {
    console.error('Gemini search brief error:', err);
    return fallbackBrief(prefsA, prefsB);
  }
}

export async function generateRound2Brief(
  prefsA: PartnerPreferences,
  prefsB: PartnerPreferences,
  likesA: { tmdb_id: number; title: string; genres: string[] }[],
  likesB: { tmdb_id: number; title: string; genres: string[] }[],
  seenIds: number[]
): Promise<ClaudeSearchBrief> {
  const fmt = (likes: typeof likesA) =>
    likes.map((t) => `"${t.title}" (${t.genres.join(', ')})`).join(', ') || 'none';

  const prompt = `Round 1 swiping ended with no match. Help find better titles for round 2.

${formatPrefs(prefsA, 'Partner A')}
Partner A liked: ${fmt(likesA)}

${formatPrefs(prefsB, 'Partner B')}
Partner B liked: ${fmt(likesB)}

Already seen TMDB IDs (exclude these): ${seenIds.slice(0, 50).join(', ')}

TMDB genre IDs: ${TMDB_GENRES}

Analyse the overlap in their actual likes. Return ONLY a JSON object:
{
  "genre_ids": [genre IDs from overlap in their swipe history],
  "sort_by": "vote_average.desc",
  "languages": [ISO codes],
  "min_vote_average": number,
  "include_adult": false,
  "include_series": boolean,
  "notes": "what you noticed from swipe patterns"
}`;

  try {
    const text = await callGemini(prompt);
    return extractJson(text);
  } catch (err) {
    console.error('Gemini round-2 brief error:', err);
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
