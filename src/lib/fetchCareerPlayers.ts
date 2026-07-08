import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/fetchAllRows";
import type { CareerPlayer, CareerSeason } from "@/types/career";

interface SeasonRow {
  player_id: string;
  season: string;
  club: string;
  goals: number;
  assists: number;
  appearances: number;
  market_value: number;
  sort_order: number;
}

export async function fetchCareerPlayers(): Promise<CareerPlayer[]> {
  try {
    // career_seasons is over the API's 1,000-row cap, so it must be paged
    // (a plain select silently truncates and leaves players with empty careers).
    const [playersResult, seasonsResult] = await Promise.all([
      supabase
        .from("career_players")
        .select("id, player_name, nationality, position")
        .order("player_name", { ascending: true }),
      fetchAllRows<SeasonRow>((from, to) =>
        supabase
          .from("career_seasons")
          .select("player_id, season, club, goals, assists, appearances, market_value, sort_order")
          .order("player_id", { ascending: true })
          .order("sort_order", { ascending: true })
          .range(from, to),
      ),
    ]);

    if (playersResult.error || !playersResult.data || playersResult.data.length === 0) {
      console.warn("[fetchCareerPlayers] career_players query failed or returned empty:", playersResult.error);
      return [];
    }

    if (seasonsResult.error || !seasonsResult.data || seasonsResult.data.length === 0) {
      console.warn("[fetchCareerPlayers] career_seasons query failed or returned empty:", seasonsResult.error);
      return [];
    }

    // Group seasons by player_id — rows arrive pre-sorted by (player_id, sort_order)
    const seasonsByPlayer = new Map<string, CareerSeason[]>();
    for (const row of seasonsResult.data) {
      const season: CareerSeason = {
        season: row.season,
        club: row.club,
        goals: row.goals,
        assists: row.assists,
        appearances: row.appearances,
        marketValue: row.market_value,
      };
      const existing = seasonsByPlayer.get(row.player_id);
      if (existing) {
        existing.push(season);
      } else {
        seasonsByPlayer.set(row.player_id, [season]);
      }
    }

    // Map player rows to CareerPlayer objects
    const players: CareerPlayer[] = playersResult.data.map((p) => ({
      name: p.player_name,
      nationality: p.nationality,
      position: p.position,
      career: seasonsByPlayer.get(p.id) ?? [],
    }));

    return players;
  } catch (err) {
    console.warn("[fetchCareerPlayers] unexpected error:", err);
    return [];
  }
}
