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
}

export const COMPETITIONS: CompetitionDef[] = [
  {
    key: 'sb', emoji: '🏈', label: 'Super Bowl winners',
    table: 'super_bowls', yearCol: 'year', winCol: 'winner',
    phrase: (t, y) => `The ${t} won the Super Bowl played in ${y}.`,
  },
  {
    key: 'nba', emoji: '🏀', label: 'NBA champions',
    table: 'nba_finals', yearCol: 'year', winCol: 'winner',
    phrase: (t, y) => `The ${t} won the ${y} NBA Finals.`,
  },
  {
    key: 'ws', emoji: '⚾', label: 'World Series winners',
    table: 'world_series_v2', yearCol: 'year', winCol: 'winner',
    phrase: (t, y) => `The ${t} won the ${y} World Series.`,
  },
  {
    key: 'cup', emoji: '🏒', label: 'Stanley Cup winners',
    table: 'stanley_cup_finals_v2', yearCol: 'year', winCol: 'winner',
    phrase: (t, y) => `The ${t} won the Stanley Cup in ${y}.`,
  },
  {
    key: 'wnba', emoji: '🏀', label: 'WNBA champions',
    table: 'wnba_finals', yearCol: 'year', winCol: 'winner',
    phrase: (t, y) => `The ${t} won the ${y} WNBA Finals.`,
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
];

export interface ChampRow {
  year: number;
  team: string;
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
}

export async function fetchCompetitionRows(def: CompetitionDef): Promise<ChampRow[]> {
  let q: unknown = supabase.from(def.table as never).select(`${def.yearCol}, ${def.winCol}`);
  if (def.filter) q = def.filter(q);
  const { data, error } = await (q as { limit: (n: number) => PromiseLike<{ data: unknown; error: unknown }> }).limit(5000);
  if (error || !Array.isArray(data)) throw new Error(`${def.table} unavailable`);
  const out: ChampRow[] = [];
  for (const r of data as Record<string, unknown>[]) {
    const year = r[def.yearCol];
    const team = r[def.winCol];
    if (typeof year === 'number' && Number.isFinite(year) && typeof team === 'string' && team.trim().length >= 3) {
      out.push({ year, team: team.trim() });
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
  const wantTrue = dailyDraw(2, `${label}:truth`) === 0;
  if (wantTrue) {
    return {
      compKey: def.key, emoji: def.emoji, sourceLabel: def.label,
      statement: def.phrase(row.team, row.year),
      isTrue: true, year: row.year, shownTeam: row.team, realTeams,
    };
  }
  // The decoy is a real winner of this same competition who did NOT win
  // this particular year. Checked against EVERY champion of the year, so
  // split titles can never produce a "false" statement that is true.
  const falseRound = (t: string): ChampRound => ({
    compKey: def.key, emoji: def.emoji, sourceLabel: def.label,
    statement: def.phrase(t, row.year),
    isTrue: false, year: row.year, shownTeam: t, realTeams,
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
    isTrue: true, year: row.year, shownTeam: row.team, realTeams,
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
