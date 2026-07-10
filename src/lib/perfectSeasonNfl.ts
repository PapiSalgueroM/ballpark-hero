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

export interface NflDecadeDef {
  id: string;
  label: string;
  from: number;
  to: number;
}

/**
 * Decade Mode buckets (2026-07-10). The nflfastr data here spans 1999-2024,
 * so there is no standalone 1990s bucket — 1999 rides with the 2000s. The
 * wheel index is simply filtered to the range; squads load exactly as in
 * the all-eras game.
 */
export const NFL_DECADES: NflDecadeDef[] = [
  { id: '2000s', label: '2000s', from: 1999, to: 2009 },
  { id: '2010s', label: '2010s', from: 2010, to: 2019 },
  { id: '2020s', label: '2020s', from: 2020, to: 2029 },
];

export function filterIndexByDecade(idx: TeamSeasonEntry[], decade: NflDecadeDef): TeamSeasonEntry[] {
  return idx.filter(e => e.year >= decade.from && e.year <= decade.to);
}

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
 * Era normalization (2026-07-03, #93/94): the nflfastr data here only spans
 * 1999-2024, too short for decade buckets to make sense (two of them would
 * barely be used), so this keys off the passing environment's two real
 * inflection points instead. The 2004 illegal-contact-enforcement crackdown
 * opened up coverage leaguewide (team pass yds/game rose from ~205 to ~215),
 * and the 2018+ full adoption of RPOs and spread formations pushed it further
 * (~237). A QB/receiver/back racking up the same per-game rate in 1999-2003
 * did it in a tighter coverage environment than one doing it in 2018-2024, so
 * NFL_ERA_MULT gives the earliest bucket the full conservative +5% (per spec)
 * and trims the newest bucket slightly for the extra room the modern passing
 * game provides. Applied to the per-game rate stats before they hit the
 * qbRating/rbRating/recRating formulas.
 * Anchors verified in SQL, still hold with the multiplier applied since 2007
 * falls in the boost bucket (mult >= 1.0 never pulls a score down): 2007
 * Brady 99 and Moss 99, 2007 Welker 79, while the 2010 Panthers starters
 * land 44-64.
 */
const NFL_ERA_MULT: { from: number; to: number; mult: number }[] = [
  { from: 1999, to: 2003, mult: 1.05 },
  { from: 2004, to: 2009, mult: 1.03 },
  { from: 2010, to: 2017, mult: 1.0 },
  { from: 2018, to: 2024, mult: 0.98 },
];
function eraMult(year: number): number {
  const bucket = NFL_ERA_MULT.find(b => year >= b.from && year <= b.to);
  return bucket ? bucket.mult : 1.0;
}

function qbRating(t: SeasonTotals, year: number): number {
  const g = Math.max(1, t.weeks.size);
  const mult = eraMult(year);
  return clampRating((31 + 0.13 * (t.pyds / g) + 11 * (t.ptd / g) - 8 * (t.pint / g)) * mult);
}

function rbRating(t: SeasonTotals, year: number): number {
  const g = Math.max(1, t.weeks.size);
  const scrim = t.ryds + t.recyds;
  const tds = t.rtd + t.rectd;
  return clampRating((42.5 + 0.28 * (scrim / g) + 13 * (tds / g)) * eraMult(year));
}

function recRating(t: SeasonTotals, year: number): number {
  const g = Math.max(1, t.weeks.size);
  return clampRating((42.5 + 0.42 * (t.recyds / g) + 12 * (t.rectd / g)) * eraMult(year));
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
        rating = qbRating(t, entry.year);
        eligible = ['QB'];
      } else if (t.group === 'RB') {
        if (t.car + t.rec < 60) continue;
        rating = rbRating(t, entry.year);
        eligible = ['RB', 'FLEX'];
      } else if (t.group === 'WR') {
        if (t.rec < 15) continue;
        rating = recRating(t, entry.year);
        eligible = ['WR', 'WR2', 'FLEX'];
      } else {
        if (t.rec < 15) continue;
        rating = recRating(t, entry.year);
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
