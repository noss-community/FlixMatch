-- FlixMatch Database Schema
-- Run this in your Supabase SQL editor

-- Sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_code VARCHAR(8) UNIQUE NOT NULL,
  partner_a_id UUID NOT NULL,
  partner_b_id UUID,
  status VARCHAR(30) NOT NULL DEFAULT 'waiting',
  -- statuses: waiting | both_submitted | generating_pool | swiping | matched | finished_no_match
  round INTEGER NOT NULL DEFAULT 1,
  partner_a_submitted BOOLEAN NOT NULL DEFAULT FALSE,
  partner_b_submitted BOOLEAN NOT NULL DEFAULT FALSE,
  partner_a_done_swiping BOOLEAN NOT NULL DEFAULT FALSE,
  partner_b_done_swiping BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partner preferences
CREATE TABLE partner_preferences (
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

-- Title pool (30 titles per round)
CREATE TABLE title_pool (
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

-- Swipes
CREATE TABLE swipes (
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

-- Matches
CREATE TABLE matches (
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

-- Indexes for performance
CREATE INDEX idx_sessions_code ON sessions(session_code);
CREATE INDEX idx_swipes_session_partner ON swipes(session_id, partner, round);
CREATE INDEX idx_title_pool_session_round ON title_pool(session_id, round);
CREATE INDEX idx_matches_session ON matches(session_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Enable Row Level Security (RLS) - service role bypasses RLS
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE title_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
