import { supabase } from '@/integrations/supabase/client';

/**
 * Text-only "Notable Players" clue tier for Guess The Football Club.
 *
 * Looks up the top-N players by market value for a given club name directly
 * against player_market_values (171k rows, verified 2026-07-02 via
 * src/lib/playerSearch.ts's own docstring). Only an exact club-name match is
 * used (no fuzzy/ilike matching here): spot-checks on flawuiqbvjobmkfkauhw
 * confirmed soccer_club_puzzles.full_name equals player_market_values.club
 * verbatim for the Big-5-league clubs ("Real Madrid", "Tottenham Hotspur",
 * "Bayern Munich" all matched with current, high-value rows), so an exact
 * match is trustworthy where it hits. Clubs with no exact match (mostly MLS
 * and smaller-league puzzle entries, which use different name conventions
 * in this table) simply get an empty result, and the caller skips the clue
 * tier rather than showing a blank or guessed-at line.
 *
 * Returns display names only, deduped, most recent year's row per player,
 * ranked by market value. No images, crests, or colors involved.
 */
export async function fetchSoccerClubNotablePlayers(clubFullName: string, limit = 3): Promise<string[]> {
  const { data, error } = await supabase
    .from('player_market_values')
    .select('player_name, market_value_usd, year')
    .eq('club', clubFullName)
    .order('market_value_usd', { ascending: false })
    .order('year', { ascending: false })
    .limit(50); // over-fetch: same player repeats per year, dedupe client-side

  if (error || !data || data.length === 0) return [];

  const seen = new Set<string>();
  const names: string[] = [];
  for (const row of data) {
    const name = typeof row.player_name === 'string' ? row.player_name.trim() : '';
    if (!name || seen.has(name)) continue;
    seen.add(name);
    names.push(name);
    if (names.length >= limit) break;
  }
  return names;
}

/**
 * Batch version: looks up notable players for every puzzle in a pool in one
 * pass, so the game doesn't fire one request per club on every load. Clubs
 * with no player rows are simply absent from the returned map (never an
 * empty-array placeholder), which is the caller's signal to skip the clue.
 */
export async function fetchNotablePlayersForClubs(
  clubFullNames: string[],
  limitPerClub = 3,
): Promise<Map<string, string[]>> {
  const uniqueNames = Array.from(new Set(clubFullNames));
  if (uniqueNames.length === 0) return new Map();

  const { data, error } = await supabase
    .from('player_market_values')
    .select('player_name, club, market_value_usd, year')
    .in('club', uniqueNames)
    .order('market_value_usd', { ascending: false })
    .order('year', { ascending: false })
    .limit(1000); // PostgREST per-request cap; enough for ~3-4 top names per club across a few hundred clubs

  const result = new Map<string, string[]>();
  if (error || !data) return result;

  const seenPerClub = new Map<string, Set<string>>();
  for (const row of data) {
    const club = typeof row.club === 'string' ? row.club : '';
    const name = typeof row.player_name === 'string' ? row.player_name.trim() : '';
    if (!club || !name) continue;

    const seen = seenPerClub.get(club) ?? new Set<string>();
    if (seen.has(name)) continue;

    const existing = result.get(club) ?? [];
    if (existing.length >= limitPerClub) continue;

    seen.add(name);
    seenPerClub.set(club, seen);
    existing.push(name);
    result.set(club, existing);
  }

  return result;
}
