import { supabase } from '@/integrations/supabase/client';
import { dailyDraw, shuffledRange } from '@/lib/dateUtils';

/**
 * Champ or Not (Round 235): quick daily true-or-false over the champion
 * tables. Every statement is table-built: a TRUE statement is a real
 * (year, champion) row read verbatim, and a FALSE statement pairs a real
 * year with a real winner of the SAME competition who did not win that
 * year. Nothing is ever invented, and the decoy check runs against every
 * winner of that year, which is what keeps split titles safe (USC really
 * did take the 2003 AP title, so USC can never be served as a "false"
 * 2003 answer).
 *
 * The source tables were audited and fenced in Rounds 232 to 234
 * (scripts/simListQuizSources.mjs); this game reads only the winner
 * columns those rounds verified. simChampOrNot.mjs proves the generator
 * itself over a simulated year.
 */

export interface CompetitionDef {
  key: string;
  emoji: string;
  /** Shown under the reveal, names the source list. */
  label: string;
  table: string;
  yearCol: string;
  winCol: string;
  filter?: (q: unknown) => unknown;
  phrase: (team: string, year: number) => string;
  /**
   * Round 249: for the five finals competitions whose loser and series
   * columns were completed and triple-verified in Rounds 239 to 242, the
   * reveal can also teach who the real champion beat. Absent for the
   * list competitions (no beaten side exists in those tables).
   */
  finals?: { loseCol: string; seriesCol?: string; scoreCols?: [string, string] };
}

export const COMPETITIONS: CompetitionDef[] = [
  {
    key: 'sb', emoji: '🏈', label: 'Super Bowl winners',
    table: 'super_bowls', yearCol: 'year', winCol: 'winner',
    phrase: (t, y) => `The ${t} won the Super Bowl played in ${y}.`,
    finals: { loseCol: 'loser', scoreCols: ['winner_score', 'loser_score'] },
  },
  {
    key: 'nba', emoji: '🏀', label: 'NBA champions',
    table: 'nba_finals', yearCol: 'year', winCol: 'winner',
    phrase: (t, y) => `The ${t} won the ${y} NBA Finals.`,
    finals: { loseCol: 'loser', seriesCol: 'series_result' },
  },
  {
    key: 'ws', emoji: '⚾', label: 'World Series winners',
    table: 'world_series_v2', yearCol: 'year', winCol: 'winner',
    phrase: (t, y) => `The ${t} won the ${y} World Series.`,
    finals: { loseCol: 'loser', seriesCol: 'series_result' },
  },
  {
    key: 'cup', emoji: '🏒', label: 'Stanley Cup winners',
    table: 'stanley_cup_finals_v2', yearCol: 'year', winCol: 'winner',
    phrase: (t, y) => `The ${t} won the Stanley Cup in ${y}.`,
    finals: { loseCol: 'loser', seriesCol: 'series_result' },
  },
  {
    key: 'wnba', emoji: '🏀', label: 'WNBA champions',
    table: 'wnba_finals', yearCol: 'year', winCol: 'winner',
    phrase: (t, y) => `The ${t} won the ${y} WNBA Finals.`,
    finals: { loseCol: 'loser', seriesCol: 'series_result' },
  },
  {
    key: 'cfb', emoji: '🏈', label: 'college football national champions',
    table: 'cfb_national_champions', yearCol: 'year', winCol: 'champion',
    phrase: (t, y) => `${t} won a national title for the ${y} college football season.`,
  },
  {
    key: 'cbb', emoji: '🏀', label: "men's NCAA tournament champions",
    table: 'ncaa_basketball_champions', yearCol: 'year', winCol: 'champion',
    filter: q => (q as { eq: (c: string, v: string) => unknown }).eq('division', "Men's D1"),
    phrase: (t, y) => `${t} won the ${y} men's NCAA basketball tournament.`,
  },
  {
    key: 'epl', emoji: '⚽', label: 'English champions',
    table: 'soccer_league_champions', yearCol: 'year', winCol: 'champion',
    filter: q => (q as { ilike: (c: string, v: string) => unknown }).ilike('league', '%premier%'),
    phrase: (t, y) => `${t} were champions of England in ${y}.`,
  },
  {
    key: 'afl', emoji: '🏉', label: 'VFL/AFL premiers',
    table: 'afl_premiers', yearCol: 'year', winCol: 'premier',
    phrase: (t, y) => `${t} won the ${y} VFL/AFL premiership.`,
  },
  {
    key: 'nrl', emoji: '🏉', label: 'Australian rugby league premiers',
    table: 'nrl_premiers', yearCol: 'year', winCol: 'premier',
    // Phrased for the whole 1908 on era, and safe on the special years:
    // 1997 has two rows (ARL and Super League premiers, both true), and
    // the stripped 2007 and 2009 seasons have no row at all, so no claim
    // about them can ever be dealt.
    phrase: (t, y) => `${t} won the top grade rugby league premiership in ${y}.`,
  },
  {
    key: 'brownlow', emoji: '🏅', label: 'Brownlow medallists',
    table: 'afl_brownlow', yearCol: 'year', winCol: 'winner',
    // Round 291, the first competition of people rather than teams. A tie
    // year carries two or three rows, every one of them true, the same shape
    // as the NRL's 1997; a false claim is a real medallist in a year he did
    // not win, which for a repeat winner like Ablett is a year he was merely
    // close. Eleven competitions now share ten slots, so one sits out each
    // day; simChampOrNot holds every one to at least four days in five.
    phrase: (t, y) => `${t} won the ${y} Brownlow Medal.`,
  },
  {
    key: 'dallym', emoji: '🏉', label: 'Dally M medallists',
    table: 'nrl_dally_m', yearCol: 'year', winCol: 'winner',
    // Round 291. 1997 and 2003 have no row, so no claim about them can be
    // dealt; 2014 and 2016 carry two rows, both true.
    phrase: (t, y) => `${t} won the ${y} Dally M Medal.`,
  },
];

export interface ChampRow {
  year: number;
  team: string;
  /**
   * "the {beaten side} {series or score}", e.g. "the Denver Broncos
   * 42-10" or "the Miami Heat 4-2". Only set for finals competitions,
   * only when the row carries both the loser and the result, and always
   * describing THIS row's real final.
   */
  beat?: string;
}

export interface ChampRound {
  compKey: string;
  emoji: string;
  sourceLabel: string;
  statement: string;
  isTrue: boolean;
  year: number;
  shownTeam: string;
  /** every real champion of that year in that competition (splits included) */
  realTeams: string[];
  /**
   * Round 249: what the real champion did in the final, e.g. "the Denver
   * Broncos 42-10". Only for finals competitions; the reveal renders it
   * as "They beat {beatLine}." after the truth line.
   */
  beatLine?: string;
}

export async function fetchCompetitionRows(def: CompetitionDef): Promise<ChampRow[]> {
  const cols = [def.yearCol, def.winCol];
  if (def.finals) {
    cols.push(def.finals.loseCol);
    if (def.finals.seriesCol) cols.push(def.finals.seriesCol);
    if (def.finals.scoreCols) cols.push(...def.finals.scoreCols);
  }
  /* ROUND 366: order by id before anything positional reads these rows.
     pickDaily is rows[dailyDraw(rows.length, ...)], a purely positional read,
     and the decoy set is a Set walked by index, so heap order decides the
     board. This is a live risk rather than a theoretical one for these tables
     specifically: Rounds 239 to 242 and 247 to 249 completed loser,
     series_result, venue, city and state by UPDATING existing rows, which is
     exactly the operation that moves a tuple to the heap tail. Every table in
     COMPS carries an id (checked against information_schema before writing
     this), and PostgREST allows ordering by a column that is not selected, so
     the cols array does not change. */
  let q: unknown = supabase.from(def.table as never).select(cols.join(', '));
  q = (q as { order: (c: string, o: { ascending: boolean }) => unknown }).order('id', { ascending: true });
  if (def.filter) q = def.filter(q);
  const { data, error } = await (q as { limit: (n: number) => PromiseLike<{ data: unknown; error: unknown }> }).limit(5000);
  if (error || !Array.isArray(data)) throw new Error(`${def.table} unavailable`);
  const out: ChampRow[] = [];
  for (const r of data as Record<string, unknown>[]) {
    const year = r[def.yearCol];
    const team = r[def.winCol];
    if (typeof year === 'number' && Number.isFinite(year) && typeof team === 'string' && team.trim().length >= 3) {
      const row: ChampRow = { year, team: team.trim() };
      if (def.finals) {
        const loser = r[def.finals.loseCol];
        let result = '';
        if (def.finals.seriesCol) {
          const s = r[def.finals.seriesCol];
          if (typeof s === 'string' && /^[0-9]+-[0-9]+(-[0-9]+)?$/.test(s.trim())) result = s.trim();
        } else if (def.finals.scoreCols) {
          const ws = r[def.finals.scoreCols[0]];
          const ls = r[def.finals.scoreCols[1]];
          if (typeof ws === 'number' && typeof ls === 'number' && Number.isFinite(ws) && Number.isFinite(ls)) result = `${ws}-${ls}`;
        }
        if (typeof loser === 'string' && loser.trim() && result) {
          row.beat = `the ${loser.trim()} ${result}`;
        }
      }
      out.push(row);
    }
  }
  return out;
}

export const HARD_WINDOW = 3;

/**
 * One round for one competition. Deterministic per label. Returns null
 * only when the competition is too thin to decoy honestly.
 *
 * Hard mode changes only the FALSE claims: instead of any winner from
 * this competition's whole history, the decoy is a team that won within
 * HARD_WINDOW years of the claimed year but not the year itself, which
 * is the difference between "the Newtown Jets won the 2023 NBA Finals"
 * easy and "the Penrith Panthers won the 2020 premiership" cruel (they
 * won the four either side; 2020 was Melbourne). Every hard decoy is
 * still checked against every real winner of the claimed year, so the
 * honesty guarantee is identical; when no close decoy exists the round
 * falls back to the whole-history decoy rather than serving nothing.
 */
export function buildRound(def: CompetitionDef, rows: ChampRow[], label: string, hard: boolean = false): ChampRound | null {
  if (rows.length < 8) return null;
  const row = rows[dailyDraw(rows.length, `${label}:row`)];
  const realTeams = rows.filter(r => r.year === row.year).map(r => r.team);
  // row is always a REAL row of the claimed year (a decoy only swaps the
  // shown team), so its beat string describes the real final either way.
  const beatLine = row.beat;
  const wantTrue = dailyDraw(2, `${label}:truth`) === 0;
  if (wantTrue) {
    return {
      compKey: def.key, emoji: def.emoji, sourceLabel: def.label,
      statement: def.phrase(row.team, row.year),
      isTrue: true, year: row.year, shownTeam: row.team, realTeams, beatLine,
    };
  }
  // The decoy is a real winner of this same competition who did NOT win
  // this particular year. Checked against EVERY champion of the year, so
  // split titles can never produce a "false" statement that is true.
  const falseRound = (t: string): ChampRound => ({
    compKey: def.key, emoji: def.emoji, sourceLabel: def.label,
    statement: def.phrase(t, row.year),
    isTrue: false, year: row.year, shownTeam: t, realTeams, beatLine,
  });
  if (hard) {
    const near = [...new Set(rows
      .filter(r => Math.abs(r.year - row.year) <= HARD_WINDOW)
      .map(r => r.team))]
      .filter(t => !realTeams.includes(t));
    if (near.length > 0) {
      return falseRound(near[dailyDraw(near.length, `${label}:neardecoy`)]);
    }
    // no winner close to this year other than the champions themselves:
    // fall through to the whole-history decoy below
  }
  const teams = [...new Set(rows.map(r => r.team))];
  for (const i of shuffledRange(teams.length, `${label}:decoy`)) {
    const t = teams[i];
    if (!realTeams.includes(t)) {
      return falseRound(t);
    }
  }
  // Unreachable unless one club won every season on record; serve truth.
  return {
    compKey: def.key, emoji: def.emoji, sourceLabel: def.label,
    statement: def.phrase(row.team, row.year),
    isTrue: true, year: row.year, shownTeam: row.team, realTeams, beatLine,
  };
}

export const DAILY_ROUNDS = 10;

/**
 * The day's competition order: every competition exactly once, shuffled,
 * then extra draws (no back-to-back repeats) up to DAILY_ROUNDS.
 */
export function buildDailySlots(compKeys: string[], seedPrefix: string, count: number = DAILY_ROUNDS): string[] {
  const order = shuffledRange(compKeys.length, `${seedPrefix}:comps`).map(i => compKeys[i]);
  const slots = order.slice(0, count);
  let k = 0;
  while (slots.length < count) {
    const pick = compKeys[dailyDraw(compKeys.length, `${seedPrefix}:extra:${k}`)];
    if (slots[slots.length - 1] !== pick) slots.push(pick);
    k += 1;
  }
  return slots;
}

/** All rounds for a seed prefix (the daily uses `champ-or-not:{date}`). */
export function buildRounds(
  rowsByKey: Map<string, ChampRow[]>,
  seedPrefix: string,
  count: number = DAILY_ROUNDS,
  hard: boolean = false,
): ChampRound[] {
  const usable = COMPETITIONS.filter(c => (rowsByKey.get(c.key)?.length ?? 0) >= 8);
  if (usable.length === 0) return [];
  const slots = buildDailySlots(usable.map(c => c.key), seedPrefix, count);
  const out: ChampRound[] = [];
  slots.forEach((key, i) => {
    const def = COMPETITIONS.find(c => c.key === key);
    const rows = rowsByKey.get(key);
    if (!def || !rows) return;
    const r = buildRound(def, rows, `${seedPrefix}:slot${i}`, hard);
    if (r) out.push(r);
  });
  return out;
}
