-- FlixMatch — full setup (safe to re-run)
-- Run this in the Supabase SQL Editor.

-- ── Tables ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_code VARCHAR(8) UNIQUE NOT NULL,
  partner_a_id UUID NOT NULL,
  partner_b_id UUID,
  status VARCHAR(30) NOT NULL DEFAULT 'waiting',
  round INTEGER NOT NULL DEFAULT 1,
  partner_a_submitted BOOLEAN NOT NULL DEFAULT FALSE,
  partner_b_submitted BOOLEAN NOT NULL DEFAULT FALSE,
  partner_a_done_swiping BOOLEAN NOT NULL DEFAULT FALSE,
  partner_b_done_swiping BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS partner_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  partner CHAR(1) NOT NULL CHECK (partner IN ('A', 'B')),
  moods TEXT[] NOT NULL,
  mood_description TEXT,
  languages TEXT[] NOT NULL,
  content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('movies_only', 'include_series')),
  min_imdb DECIMAL(3,1) NOT NULL,
  eras TEXT[] NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, partner)
);

CREATE TABLE IF NOT EXISTS title_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  tmdb_id INTEGER NOT NULL,
  media_type VARCHAR(10) NOT NULL CHECK (media_type IN ('movie', 'tv')),
  title VARCHAR(500) NOT NULL,
  year INTEGER,
  imdb_rating DECIMAL(3,1),
  tmdb_rating DECIMAL(4,2),
  runtime INTEGER,
  synopsis TEXT,
  poster_url VARCHAR(500),
  backdrop_url VARCHAR(500),
  genres TEXT[],
  original_language VARCHAR(10),
  sort_order_a INTEGER,
  sort_order_b INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, round, tmdb_id)
);

CREATE TABLE IF NOT EXISTS swipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  partner CHAR(1) NOT NULL CHECK (partner IN ('A', 'B')),
  tmdb_id INTEGER NOT NULL,
  media_type VARCHAR(10) NOT NULL,
  direction VARCHAR(5) NOT NULL CHECK (direction IN ('right', 'left')),
  round INTEGER NOT NULL,
  swiped_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, partner, tmdb_id, round)
);

CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  tmdb_id INTEGER NOT NULL,
  media_type VARCHAR(10) NOT NULL,
  title VARCHAR(500) NOT NULL,
  poster_url VARCHAR(500),
  ott_platforms JSONB,
  matched_at TIMESTAMPTZ DEFAULT NOW(),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_sessions_code ON sessions(session_code);
CREATE INDEX IF NOT EXISTS idx_swipes_session_partner ON swipes(session_id, partner, round);
CREATE INDEX IF NOT EXISTS idx_title_pool_session_round ON title_pool(session_id, round);
CREATE INDEX IF NOT EXISTS idx_matches_session ON matches(session_id);

-- ── updated_at trigger ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sessions_updated_at ON sessions;
CREATE TRIGGER sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE title_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- ── RLS Policies ─────────────────────────────────────────────────────────────

-- sessions
DROP POLICY IF EXISTS "service_role_sessions" ON sessions;
DROP POLICY IF EXISTS "anon_read_sessions" ON sessions;
DROP POLICY IF EXISTS "anon_insert_sessions" ON sessions;
DROP POLICY IF EXISTS "anon_update_sessions" ON sessions;

CREATE POLICY "service_role_sessions" ON sessions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "anon_read_sessions" ON sessions FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_sessions" ON sessions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_sessions" ON sessions FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- partner_preferences
DROP POLICY IF EXISTS "service_role_partner_preferences" ON partner_preferences;
DROP POLICY IF EXISTS "anon_all_partner_preferences" ON partner_preferences;

CREATE POLICY "service_role_partner_preferences" ON partner_preferences FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_partner_preferences" ON partner_preferences FOR ALL TO anon USING (true) WITH CHECK (true);

-- title_pool
DROP POLICY IF EXISTS "service_role_title_pool" ON title_pool;
DROP POLICY IF EXISTS "anon_all_title_pool" ON title_pool;

CREATE POLICY "service_role_title_pool" ON title_pool FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_title_pool" ON title_pool FOR ALL TO anon USING (true) WITH CHECK (true);

-- swipes
DROP POLICY IF EXISTS "service_role_swipes" ON swipes;
DROP POLICY IF EXISTS "anon_all_swipes" ON swipes;

CREATE POLICY "service_role_swipes" ON swipes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_swipes" ON swipes FOR ALL TO anon USING (true) WITH CHECK (true);

-- matches
DROP POLICY IF EXISTS "service_role_matches" ON matches;
DROP POLICY IF EXISTS "anon_all_matches" ON matches;

CREATE POLICY "service_role_matches" ON matches FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_matches" ON matches FOR ALL TO anon USING (true) WITH CHECK (true);
