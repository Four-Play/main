-- Allow a user to pick both sides of the same game.
-- Replaces the (user_id, league_id, game_id) uniqueness with one that also
-- includes team_selected so a user can have two picks per game (one per side).
--
-- Run against Supabase SQL editor. Safe to run once.

BEGIN;

-- Drop the old constraint. Supabase auto-names it picks_user_id_league_id_game_id_key
-- when declared inline; fall back to dynamic lookup in case it was named differently.
DO $$
DECLARE
  conname text;
BEGIN
  SELECT c.conname
    INTO conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
   WHERE t.relname = 'picks'
     AND c.contype = 'u'
     AND (
       SELECT array_agg(a.attname::text ORDER BY a.attname)
         FROM unnest(c.conkey) k
         JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k
     ) = ARRAY['game_id','league_id','user_id'];

  IF conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE picks DROP CONSTRAINT %I', conname);
  END IF;
END $$;

-- Add the new composite uniqueness including team_selected.
ALTER TABLE picks
  ADD CONSTRAINT picks_user_league_game_team_key
  UNIQUE (user_id, league_id, game_id, team_selected);

COMMIT;
