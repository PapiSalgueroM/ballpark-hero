import { supabase } from '@/integrations/supabase/client';
import { SoccerClubPuzzle } from '@/types/guessSoccerClub';

export async function fetchSoccerClubPuzzles(): Promise<SoccerClubPuzzle[]> {
  const { data, error } = await supabase
    .from('soccer_club_puzzles')
    .select(
      'puzzle_id, full_name, common_names, country, league, vibe, league_hint, league_titles, kit_colors, fun_fact'
    )
    .order('sort_order', { ascending: true });

  if (error || !data || data.length === 0) return [];

  return data.map(row => ({
    id:          row.puzzle_id,
    fullName:    row.full_name,
    commonNames: row.common_names as string[],
    country:     row.country,
    league:      row.league,
    clues: {
      vibe:         row.vibe,
      leagueHint:   row.league_hint,
      leagueTitles: row.league_titles,
      kitColors:    row.kit_colors,
    },
    funFact: row.fun_fact,
  }));
}
