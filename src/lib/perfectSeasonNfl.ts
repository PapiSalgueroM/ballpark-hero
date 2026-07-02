import { supabase } from '@/integrations/supabase/client';
import { DraftablePlayer, SeasonSlot, SpinSquad } from '@/lib/perfectSeason';

export const NFL_SLOTS: SeasonSlot[] = [
  { key: 'QB', label: 'Quarterback', weight: 1.8 },
  { key: 'RB', label: 'Running Back', weight: 1 },
  { key: 'WR', label: 'Wide Receiver 1', weight: 1 },
  { key: 'WR2', label: 'Wide Receiver 2', weight: 1 },
  { key: 'TE', label: 'Tight End', weight: 1 },
  { key: 'FLEX', label: 'Flex (RB/WR/TE)', weight: 1 },
];

export const NFL_GAMES = 17;

/**
 * The shared winProbability curve is tuned for 162/82 game seasons. Over only
 * 17 games a capped 0.985 win chance would go 17-0 about 77% of the time, so
 * the page passes (overall + NFL_OVERALL_ADJUST) into simulateSeason.
 * Math: at drafted overall 97 the adjusted 87 gives p = sigmoid((87-77)/5)
 * = 0.881 per game (0.885 with win momentum), and 0.881 * 0.885^16 = 0.124,
 * so a god-tier draft goes 17-0 roughly 12% of the time. A 95 overall lands
 * near 5%, a 92 near 0.5%, and merely good teams post human records.
 */
export const NFL_OVERALL_ADJUST = -10;

export interface TeamSeasonEntry {
  year: number;
  abbr: string;
  name: string;
}

/** nflfastr player stats use LA for the Rams; nfl_team_seasons uses LAR. */
function statsTeamAbbr(abbr: string): string {
  return abbr === 'LAR' ? 'LA' : abbr;
}

/**
 * nfl_team_seasons stores the CURRENT franchise name for every year, which
 * would show "1999 Las Vegas Raiders". Relabel relocated/renamed franchises
 * to their era-correct city.
 */
function eraName(abbr: string, year: number, name: string): string {
  if (abbr === 'LAR' && year <= 2015) return 'St. Louis Rams';
  if (abbr === 'LAC' && year <= 2016) return 'San Diego Chargers';
  if (abbr === 'LV' && year <= 2019) return 'Oakland Raiders';
  if (abbr === 'WAS' && year <= 2019) return 'Washington';
  if (abbr === 'WAS' && year <= 2021) return 'Washington Football Team';
  return name;
}

/** One light query, cached by the page: every team season in the stats era. */
export async function fetchTeamSeasonIndex(): Promise<TeamSeasonEntry[] | null> {
  try {
    const { data, error } = await supabase
      .from('nfl_team_seasons' as any)
      .select('team_name, abbr, year')
      .gte('year', 1999)
      .lte('year', 2024)
      .limit(2000);
    if (error || !data) return null;
    const rows = (data as any[])
      .filter(r => r.abbr && r.team_name && r.year != null)
      .map(r => {
        const year = Number(r.year);
        const abbr = String(r.abbr);
        return { year, abbr, name: eraName(abbr, year, String(r.team_name)) };
      });
    return rows.length >= 400 ? rows : null;
  } catch {
    return null;
  }
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function clampRating(v: number): number {
  return Math.round(Math.min(99, Math.max(40, v)));
}

interface SeasonTotals {
  name: string;
  group: string;
  weeks: Set<string>;
  att: number; pyds: number; ptd: number; pint: number;
  car: number; ryds: number; rtd: number;
  rec: number; recyds: number; rectd: number;
}

/**
 * Ratings from per-game rates so 16 and 17 game seasons compare fairly.
 * Anchors verified in SQL: 2007 Brady 99 and Moss 99, 2007 Welker 79,
 * while the 2010 Panthers starters land 44-64.
 */
function qbRating(t: SeasonTotals): number {
  const g = Math.max(1, t.weeks.size);
  return clampRating(31 + 0.13 * (t.pyds / g) + 11 * (t.ptd / g) - 8 * (t.pint / g));
}

function rbRating(t: SeasonTotals): number {
  const g = Math.max(1, t.weeks.size);
  const scrim = t.ryds + t.recyds;
  const tds = t.rtd + t.rectd;
  return clampRating(42.5 + 0.28 * (scrim / g) + 13 * (tds / g));
}

function recRating(t: SeasonTotals): number {
  const g = Math.max(1, t.weeks.size);
  return clampRating(42.5 + 0.42 * (t.recyds / g) + 12 * (t.rectd / g));
}

function detailFor(group: string, t: SeasonTotals): string {
  if (group === 'QB') return `${t.pyds} pass yds · ${t.ptd} TD · ${t.pint} INT`;
  if (group === 'RB') return `${t.ryds + t.recyds} scrimmage yds · ${t.rtd + t.rectd} TD`;
  return `${t.rec} rec · ${t.recyds} yds · ${t.rectd} TD`;
}

/**
 * Full draftable squad for one team season. nflfastr_player_stats is weekly,
 * so REG rows are aggregated to season totals client side (max observed rows
 * for one team season is 199, well inside the 400 limit).
 */
export async function fetchSquad(entry: TeamSeasonEntry): Promise<SpinSquad | null> {
  try {
    const { data, error } = await supabase
      .from('nflfastr_player_stats' as any)
      .select('player_id, player_display_name, player_name, position_group, week, attempts, passing_yards, passing_tds, interceptions, carries, rushing_yards, rushing_tds, receptions, receiving_yards, receiving_tds')
      .eq('season', String(entry.year))
      .eq('recent_team', statsTeamAbbr(entry.abbr))
      .eq('season_type', 'REG')
      .limit(400);
    if (error || !data) return null;

    const totals = new Map<string, SeasonTotals>();
    for (const r of data as any[]) {
      const id = r.player_id ? String(r.player_id) : '';
      const group = r.position_group ? String(r.position_group) : '';
      if (!id || !['QB', 'RB', 'WR', 'TE'].includes(group)) continue;
      let t = totals.get(id);
      if (!t) {
        t = {
          name: String(r.player_display_name || r.player_name || id),
          group,
          weeks: new Set<string>(),
          att: 0, pyds: 0, ptd: 0, pint: 0,
          car: 0, ryds: 0, rtd: 0,
          rec: 0, recyds: 0, rectd: 0,
        };
        totals.set(id, t);
      }
      t.weeks.add(String(r.week));
      t.att += num(r.attempts);
      t.pyds += num(r.passing_yards);
      t.ptd += num(r.passing_tds);
      t.pint += num(r.interceptions);
      t.car += num(r.carries);
      t.ryds += num(r.rushing_yards);
      t.rtd += num(r.rushing_tds);
      t.rec += num(r.receptions);
      t.recyds += num(r.receiving_yards);
      t.rectd += num(r.receiving_tds);
    }

    const players: DraftablePlayer[] = [];
    for (const [id, t] of totals) {
      let rating = 0;
      let eligible: string[] = [];
      if (t.group === 'QB') {
        if (t.att < 100) continue; // volume floors keep mop-up duty out
        rating = qbRating(t);
        eligible = ['QB'];
      } else if (t.group === 'RB') {
        if (t.car + t.rec < 60) continue;
        rating = rbRating(t);
        eligible = ['RB', 'FLEX'];
      } else if (t.group === 'WR') {
        if (t.rec < 15) continue;
        rating = recRating(t);
        eligible = ['WR', 'WR2', 'FLEX'];
      } else {
        if (t.rec < 15) continue;
        rating = recRating(t);
        eligible = ['TE', 'FLEX'];
      }
      players.push({
        playerId: id,
        name: t.name,
        rating,
        eligible,
        detail: detailFor(t.group, t),
      });
    }

    if (players.length < 4) return null;
    players.sort((a, b) => b.rating - a.rating);
    return {
      squadId: `${entry.abbr}-${entry.year}`,
      teamName: entry.name,
      year: entry.year,
      players,
    };
  } catch {
    return null;
  }
}
