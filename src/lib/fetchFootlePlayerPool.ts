import { supabase } from '@/integrations/supabase/client';
import { Player, Position, League, Difficulty } from '@/types/game';
import { players as fallbackPlayers } from '@/data/players';
import { getEnrichment } from '@/data/footleEnrichment';

// ---------------------------------------------------------------------------
// GOATs that may not appear in the top-150 by current market value but must
// always be available in the Footle player pool.
// ---------------------------------------------------------------------------
const GOAT_NAMES = new Set([
  'Lionel Messi',
  'Cristiano Ronaldo',
  'Neymar',
  'Zlatan Ibrahimovic',
  'Karim Benzema',
  'Andrés Iniesta',
  'Xavi',
  'Luka Modric',
  'Robert Lewandowski',
  'Sergio Ramos',
  'Gareth Bale',
  'Kylian Mbappé',
  'Luis Suárez',
]);

// ---------------------------------------------------------------------------
// Transfermarkt-style position string → Position union type
// ---------------------------------------------------------------------------
const POSITION_NORMALIZE: Record<string, Position> = {
  // Goalkeepers
  'Goalkeeper': 'GK',
  'GK': 'GK',

  // Defenders
  'Centre-Back': 'CB',
  'Center-Back': 'CB',
  'CB': 'CB',
  'Left-Back': 'LB',
  'LB': 'LB',
  'Right-Back': 'RB',
  'RB': 'RB',
  'Left Wing-Back': 'LWB',
  'LWB': 'LWB',
  'Right Wing-Back': 'RWB',
  'RWB': 'RWB',
  'Defender': 'CB',

  // Midfielders
  'Defensive Midfield': 'CDM',
  'Central Midfield': 'CM',
  'Attacking Midfield': 'CAM',
  'Left Midfield': 'LM',
  'Right Midfield': 'RM',
  'CDM': 'CDM',
  'CM': 'CM',
  'CAM': 'CAM',
  'LM': 'LM',
  'RM': 'RM',
  'Midfield': 'CM',

  // Forwards
  'Left Winger': 'LW',
  'Right Winger': 'RW',
  'Centre-Forward': 'CF',
  'Center-Forward': 'CF',
  'Second Striker': 'CF',
  'Striker': 'ST',
  'LW': 'LW',
  'RW': 'RW',
  'CF': 'CF',
  'ST': 'ST',
  'Forward': 'ST',
  'Attack': 'ST',
};

// Position → position group (for tier assignment within each group)
const POSITION_GROUPS: Record<Position, string> = {
  GK: 'Goalkeeper',
  CB: 'Defender', LB: 'Defender', RB: 'Defender', LWB: 'Defender', RWB: 'Defender',
  CDM: 'Midfielder', CM: 'Midfielder', CAM: 'Midfielder', LM: 'Midfielder', RM: 'Midfielder',
  LW: 'Forward', RW: 'Forward', CF: 'Forward', ST: 'Forward',
};

// ---------------------------------------------------------------------------
// Assign difficulty tiers within each position group.
// Highest market value → easy (most famous), lowest → insane (most obscure).
// Within each group (sorted DESC by marketValue already):
//   top 60% → easy, next 35% → hard, bottom 5% → insane
// ---------------------------------------------------------------------------
function assignDifficulty(
  players: Array<Player & { _tempIndex: number }>,
): Player[] {
  // Group by position group
  const groups: Record<string, Array<Player & { _tempIndex: number }>> = {};
  for (const p of players) {
    const group = POSITION_GROUPS[p.position] ?? 'Forward';
    if (!groups[group]) groups[group] = [];
    groups[group].push(p);
  }

  const result: Player[] = [];
  for (const group of Object.values(groups)) {
    // Sort DESC by marketValue (already ordered by rank from Supabase, but be safe)
    group.sort((a, b) => b.marketValue - a.marketValue);
    const n = group.length;
    const easyCount = Math.ceil(n * 0.60);
    const hardCount = Math.ceil(n * 0.35);

    group.forEach((p, i) => {
      let difficulty: Difficulty;
      if (i < easyCount) {
        difficulty = 'easy';
      } else if (i < easyCount + hardCount) {
        difficulty = 'hard';
      } else {
        difficulty = 'insane';
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _tempIndex: _, ...rest } = p;
      result.push({ ...rest, difficulty });
    });
  }
  return result;
}

// ---------------------------------------------------------------------------
// Main export: fetch top-150 players from Supabase and return a typed pool.
// Returns [] on any error — the caller (useGame.ts) falls back to players.ts.
// ---------------------------------------------------------------------------
export async function fetchFootlePlayerPool(): Promise<Player[]> {
  try {
    const { data, error } = await supabase
      .from('player_market_values')
      .select('rank, player_name, position, age, nationality, club, market_value_usd, goals, assists')
      .eq('year', 2026)
      // Order by real market value (global), not `rank` — `rank` is per-position,
      // so ordering by it returns rank-1..N of every position, not the top 150
      // most valuable players. The 2026 rows are also deduped to one per player.
      .order('market_value_usd', { ascending: false })
      .limit(150);

    if (error || !data || data.length === 0) {
      console.warn('[fetchFootlePlayerPool] Supabase returned empty or errored — using fallback');
      return [];
    }

    // Build a set of names already in Supabase result (for GOAT merge)
    const supabaseNames = new Set(data.map(r => r.player_name));

    // Map Supabase rows → Player objects (without difficulty yet)
    const tempPlayers: Array<Player & { _tempIndex: number }> = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rawPos = row.position ?? '';
      const position = POSITION_NORMALIZE[rawPos];

      if (!position) {
        console.warn(`[fetchFootlePlayerPool] Unknown position "${rawPos}" for ${row.player_name} — skipping`);
        continue;
      }

      const marketValue = Math.round(row.market_value_usd / 1_000_000);
      const enrichment = getEnrichment(row.player_name, row.club);

      tempPlayers.push({
        _tempIndex: i,
        name: row.player_name,
        club: row.club,
        nationality: row.nationality,
        league: enrichment.league,
        goals: row.goals ?? 0,
        assists: row.assists ?? 0,
        position,
        kitNumber: enrichment.kitNumber,
        age: row.age,
        marketValue,
        difficulty: 'easy', // placeholder — overwritten by assignDifficulty
      });
    }

    // Merge any GOATs missing from Supabase result (pull from players.ts fallback)
    for (const goatName of GOAT_NAMES) {
      if (!supabaseNames.has(goatName)) {
        const fallback = fallbackPlayers.find(p => p.name === goatName);
        if (fallback) {
          tempPlayers.push({
            _tempIndex: tempPlayers.length,
            ...fallback,
          });
        }
        // If not in fallbackPlayers either, silently skip
      }
    }

    // Assign difficulty tiers within each position group
    const pool = assignDifficulty(tempPlayers);

    return pool;
  } catch (err) {
    console.warn('[fetchFootlePlayerPool] Unexpected error:', err);
    return [];
  }
}
