-- RLS policies for FlixMatch
-- Run this in the Supabase SQL Editor to unblock all API operations.
--
-- These grant the service_role full access (for server-side API routes)
-- and allow the anon role to read/write their own session data (for client-side calls).

-- ── sessions ──────────────────────────────────────────────────────────────────
CREATE POLICY "service_role_sessions"
  ON sessions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "anon_read_sessions"
  ON sessions FOR SELECT TO anon
  USING (true);

CREATE POLICY "anon_insert_sessions"
  ON sessions FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "anon_update_sessions"
  ON sessions FOR UPDATE TO anon
  USING (true) WITH CHECK (true);

-- ── partner_preferences ───────────────────────────────────────────────────────
CREATE POLICY "service_role_partner_preferences"
  ON partner_preferences FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_partner_preferences"
  ON partner_preferences FOR ALL TO anon
  USING (true) WITH CHECK (true);

-- ── title_pool ────────────────────────────────────────────────────────────────
CREATE POLICY "service_role_title_pool"
  ON title_pool FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_title_pool"
  ON title_pool FOR ALL TO anon
  USING (true) WITH CHECK (true);

-- ── swipes ────────────────────────────────────────────────────────────────────
CREATE POLICY "service_role_swipes"
  ON swipes FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_swipes"
  ON swipes FOR ALL TO anon
  USING (true) WITH CHECK (true);

-- ── matches ───────────────────────────────────────────────────────────────────
CREATE POLICY "service_role_matches"
  ON matches FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_matches"
  ON matches FOR ALL TO anon
  USING (true) WITH CHECK (true);
