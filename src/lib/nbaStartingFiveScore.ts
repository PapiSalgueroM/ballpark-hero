import { foldSpecialLatin } from '@/lib/nameFold';
import type { NbaPosition } from '@/types/nba';

/**
 * NBA Starting 5, judged from the record (Round 1555).
 *
 * Before this round the verdict came from a language model told to "list each
 * player's actual stat value" in the text the page printed, and when that
 * gateway was down an offline judge summed SEASON TOTALS as if they were per
 * game, so nearly every five clamped to 99 and read "All-Time Five". Six of
 * the thirteen challenges (rings, fouls, height, weight, minutes, FT%) could
 * never be totalled at all, and every finish recorded a flat 500.
 *
 * Now every number comes from nba_player_stats (career totals, one row per
 * player, careers from 1965-66 on) and the five is scored 0 to 100 against
 * the best five the dealt teams allowed, the same per item closeness shape
 * NBA Stat Line uses (src/lib/nbaStatLine.ts scoreCombined).
 *
 * "Allowed" means exactly what the game lets a player pick: the rows of
 * nba_players_extended_v2 whose team is the dealt team (the search source),
 * each matched by name to one record row that lists the dealt franchise.
 * A record row that does not list the franchise is a namesake, never his.
 *
 * Everything here is pure over injected rows so scripts/simNbaStartingFive.mjs
 * can drive it with fixtures. The fetch lives in src/hooks/useNbaLineup.ts.
 */

export type NbaFiveStatKey = 'ppg' | 'apg' | 'rpg' | 'spg' | 'bpg' | 'threes' | 'games';
export type NbaFiveColumn = 'points' | 'ast' | 'trb' | 'stl' | 'blk' | 'three_p' | 'games';

export interface NbaFiveChallengeDef {
  key: NbaFiveStatKey;
  /** The wheel label, unchanged from the old pool so the spinner reads the same. */
  stat: string;
  unit: string;
  emoji: string;
  column: NbaFiveColumn;
  perGame: boolean;
  /** First season START year the column was counted for every game, or null. */
  trackedFromStartYear: number | null;
}

/** Steals and blocks were first counted in 1973-74 (Basketball Reference and
 *  NBA.com stats both start the two columns that season; src/lib/nbaStatLine.ts
 *  STOCKS_FLOOR_YEAR is the same fact as an end year). */
export const STOCKS_FIRST_START_YEAR = 1973;

/** Only the challenges the record can total. Championships, fouls, height,
 *  weight, minutes and FT% left the wheel in Round 1555: the table the game
 *  reads has no rings, height or weight, and the other three columns have
 *  never been checked against a second source. */
export const NBA_FIVE_CHALLENGES: NbaFiveChallengeDef[] = [
  { key: 'ppg', stat: 'Career Points Per Game', unit: 'PPG', emoji: '🏀', column: 'points', perGame: true, trackedFromStartYear: null },
  { key: 'apg', stat: 'Career Assists Per Game', unit: 'APG', emoji: '🎯', column: 'ast', perGame: true, trackedFromStartYear: null },
  { key: 'rpg', stat: 'Career Rebounds Per Game', unit: 'RPG', emoji: '📊', column: 'trb', perGame: true, trackedFromStartYear: null },
  { key: 'spg', stat: 'Career Steals Per Game', unit: 'SPG', emoji: '🤏', column: 'stl', perGame: true, trackedFromStartYear: STOCKS_FIRST_START_YEAR },
  { key: 'bpg', stat: 'Career Blocks Per Game', unit: 'BPG', emoji: '🚫', column: 'blk', perGame: true, trackedFromStartYear: STOCKS_FIRST_START_YEAR },
  { key: 'threes', stat: 'Career Three Pointers Made', unit: '3PM', emoji: '🎯', column: 'three_p', perGame: false, trackedFromStartYear: null },
  { key: 'games', stat: 'Career Games Played', unit: 'GP', emoji: '📅', column: 'games', perGame: false, trackedFromStartYear: null },
];

export function challengeByStat(stat: string | null | undefined): NbaFiveChallengeDef | null {
  return NBA_FIVE_CHALLENGES.find(c => c.stat === stat) ?? null;
}

/**
 * Basketball Reference franchise codes as nba_player_stats.teams writes them,
 * keyed by the game's team names (src/data/nbaTeams.ts). Relocations count
 * for the franchise that carries the history today. The same map, keyed by
 * nickname, has served supabase/functions/nba-validate-player since 2026-07.
 */
export const NBA_FIVE_FRANCHISE_CODES: Record<string, string[]> = {
  'Atlanta Hawks': ['ATL'],
  'Boston Celtics': ['BOS'],
  'Brooklyn Nets': ['BRK', 'NJN', 'NYN'],
  'Charlotte Hornets': ['CHO', 'CHH', 'CHA'],
  'Chicago Bulls': ['CHI'],
  'Cleveland Cavaliers': ['CLE'],
  'Dallas Mavericks': ['DAL'],
  'Denver Nuggets': ['DEN'],
  'Detroit Pistons': ['DET'],
  'Golden State Warriors': ['GSW', 'SFW'],
  'Houston Rockets': ['HOU', 'SDR'],
  'Indiana Pacers': ['IND'],
  'LA Clippers': ['LAC', 'SDC', 'BUF'],
  'Los Angeles Lakers': ['LAL'],
  'Memphis Grizzlies': ['MEM', 'VAN'],
  'Miami Heat': ['MIA'],
  'Milwaukee Bucks': ['MIL'],
  'Minnesota Timberwolves': ['MIN'],
  'New Orleans Pelicans': ['NOP', 'NOH', 'NOK'],
  'New York Knicks': ['NYK'],
  'Oklahoma City Thunder': ['OKC', 'SEA'],
  'Orlando Magic': ['ORL'],
  'Philadelphia 76ers': ['PHI'],
  'Phoenix Suns': ['PHO'],
  'Portland Trail Blazers': ['POR'],
  'Sacramento Kings': ['SAC', 'KCK', 'KCO', 'CIN'],
  'San Antonio Spurs': ['SAS'],
  'Toronto Raptors': ['TOR'],
  'Utah Jazz': ['UTA', 'NOJ'],
  'Washington Wizards': ['WAS', 'WSB', 'CAP', 'BAL'],
};

const DIACRITICS = new RegExp('[' + String.fromCharCode(0x300) + '-' + String.fromCharCode(0x36f) + ']', 'g');
const QUOTE_MARKS = new RegExp('[.\'`' + String.fromCharCode(0x2019) + ']', 'g');

/** One key for one name across both tables: accents, case and punctuation
 *  folded ("Nikola Jokić" = "Nikola Jokic", "J.J. Redick" = "JJ Redick").
 *  Suffixes stay, so a father and a son never share a key. */
export function nbaFiveNameKey(name: string | null | undefined): string {
  return foldSpecialLatin(
    String(name ?? '').normalize('NFD').replace(DIACRITICS, '').toLowerCase(),
  )
    .replace(QUOTE_MARKS, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Maps a slot's PG/SG/SF/PF/C role to the DB's coarser position codes
 * (verified distribution on nba_players_extended_v2, 2026-07-02):
 *   G=687, F=592, C=174, G-F=81, F-C=58, C-F=18, F-G=15, NULL=3510 (68%).
 * There is no PG/SG/SF/PF granularity in the source data, so eligibility is
 * necessarily coarse: a Guard fits PG or SG, a Forward fits SF or PF, a
 * Center fits C, and a combo code (G-F/F-G, F-C/C-F) fits either half.
 * A NULL position (the majority of rows, mostly older/historical players)
 * is treated as eligible for every slot rather than excluded, since blocking
 * on missing data would make most of the table unusable for any slot,
 * a worse regression than the AI-only gate this replaces.
 * Round 1555 moved this here from src/hooks/useNbaLineup.ts (which still
 * exports it) so the pick and the best five obey one rule.
 */
export function isPositionEligibleForSlot(dbPosition: string | null | undefined, slotRole: NbaPosition): boolean {
  if (!dbPosition) return true;
  const code = dbPosition.trim().toUpperCase();
  const codes = code.split('-'); // "G-F" -> ["G", "F"], "F" -> ["F"]
  const guardSlots: NbaPosition[] = ['PG', 'SG'];
  const forwardSlots: NbaPosition[] = ['SF', 'PF'];
  return codes.some((c) => {
    if (c === 'G') return guardSlots.includes(slotRole);
    if (c === 'F') return forwardSlots.includes(slotRole);
    if (c === 'C') return slotRole === 'C';
    return true; // unrecognized code: do not block entry on it
  });
}

/* ---------------- the pool a dealt team allows ---------------- */

/** The nba_player_stats columns this game reads. */
export interface NbaFiveRecordRow {
  player_name: string | null;
  teams: string | null;
  year_from: string | null;
  games: number | null;
  points: number | null;
  trb: number | null;
  ast: number | null;
  stl: number | null;
  blk: number | null;
  three_p: number | null;
}

/** The nba_players_extended_v2 columns the search shows for a team. */
export interface NbaFiveRosterRow {
  first_name: string | null;
  last_name: string | null;
  position: string | null;
}

export type NbaFiveHold = 'no-record' | 'namesake';

export interface NbaFivePoolEntry {
  key: string;
  name: string;
  position: string | null;
  record: NbaFiveRecordRow | null;
  /** Why there is no record to score, or null when there is one. */
  hold: NbaFiveHold | null;
}

export interface NbaFiveTeamPool {
  team: string;
  entries: NbaFivePoolEntry[];
}

export function rosterName(row: NbaFiveRosterRow): string {
  return [row.first_name, row.last_name].map(s => String(s ?? '').trim()).filter(Boolean).join(' ');
}

export function recordTeamCodes(row: NbaFiveRecordRow): string[] {
  return String(row.teams ?? '').split(',').map(t => t.trim().toUpperCase()).filter(Boolean);
}

/**
 * Builds what one dealt team allows. A roster name that appears twice on the
 * team, or that matches two record rows listing the franchise, is held as a
 * namesake: the game cannot tell whose numbers are whose, so it scores
 * neither. A record row that does not list the franchise is never used.
 */
export function buildTeamPool(team: string, roster: NbaFiveRosterRow[], records: NbaFiveRecordRow[]): NbaFiveTeamPool {
  const codes = new Set(NBA_FIVE_FRANCHISE_CODES[team] ?? []);
  const byKey = new Map<string, NbaFiveRecordRow[]>();
  for (const r of records) {
    if (!recordTeamCodes(r).some(c => codes.has(c))) continue;
    const key = nbaFiveNameKey(r.player_name);
    if (!key) continue;
    byKey.set(key, [...(byKey.get(key) ?? []), r]);
  }
  const rosterCount = new Map<string, number>();
  for (const row of roster) {
    const key = nbaFiveNameKey(rosterName(row));
    if (key) rosterCount.set(key, (rosterCount.get(key) ?? 0) + 1);
  }
  const entries: NbaFivePoolEntry[] = [];
  const seen = new Set<string>();
  for (const row of roster) {
    const name = rosterName(row);
    const key = nbaFiveNameKey(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const matches = byKey.get(key) ?? [];
    const twice = (rosterCount.get(key) ?? 0) > 1 || matches.length > 1;
    entries.push({
      key,
      name,
      position: row.position ?? null,
      record: !twice && matches.length === 1 ? matches[0] : null,
      hold: twice ? 'namesake' : matches.length === 0 ? 'no-record' : null,
    });
  }
  return { team, entries };
}

export function findPoolEntry(pool: NbaFiveTeamPool, name: string): NbaFivePoolEntry | null {
  const key = nbaFiveNameKey(name);
  return pool.entries.find(e => e.key === key) ?? null;
}

/* ---------------- one man's number ---------------- */

export type NbaFiveRefusal = NbaFiveHold | 'untracked' | 'missing';
export type NbaFiveValue = { ok: true; value: number } | { ok: false; reason: NbaFiveRefusal };

const round1 = (v: number) => Math.round(v * 10) / 10;

/** "1973-74" -> 1973; a bare "1974" is read as an end year -> 1973. */
export function startYearOf(yearFrom: string | null | undefined): number | null {
  const s = String(yearFrom ?? '').trim();
  if (/^\d{4}-\d{2}$/.test(s)) return Number(s.slice(0, 4));
  if (/^\d{4}$/.test(s)) return Number(s) - 1;
  return null;
}

/** His number for the challenge, rounded the way the screen shows it (per
 *  game to one decimal, totals whole), or why there is none. */
export function valueFor(entry: NbaFivePoolEntry, challenge: NbaFiveChallengeDef): NbaFiveValue {
  if (entry.hold) return { ok: false, reason: entry.hold };
  const rec = entry.record;
  if (!rec) return { ok: false, reason: 'no-record' };
  if (challenge.trackedFromStartYear !== null) {
    const start = startYearOf(rec.year_from);
    if (start === null || start < challenge.trackedFromStartYear) return { ok: false, reason: 'untracked' };
  }
  const raw = rec[challenge.column];
  if (raw === null || raw === undefined || !Number.isFinite(Number(raw))) return { ok: false, reason: 'missing' };
  if (!challenge.perGame) return { ok: true, value: Math.round(Number(raw)) };
  const games = Number(rec.games);
  if (!Number.isFinite(games) || games <= 0) return { ok: false, reason: 'missing' };
  return { ok: true, value: round1(Number(raw) / games) };
}

/** What the page says when a pick has no number. Casual, no dash. */
export function refusalText(reason: NbaFiveRefusal, name: string, challenge: NbaFiveChallengeDef): string {
  if (reason === 'namesake') return `More than one ${name} shows up here and we can't tell whose numbers are whose. Pick someone else.`;
  if (reason === 'untracked') return `Steals and blocks only started counting in 1973-74 and ${name} was already playing, so his career line isn't complete. Pick someone else.`;
  if (reason === 'missing') return `Our stat table has no ${challenge.unit} for ${name}. Pick someone else.`;
  return `We can't find a career line for ${name} in our stat table (it holds careers from 1965-66 on), so there's no number to score. Pick someone else.`;
}

/* ---------------- the five, against the best five allowed ---------------- */

export const NBA_FIVE_ROLES: NbaPosition[] = ['PG', 'SG', 'SF', 'PF', 'C'];

export interface NbaFivePick {
  team: string;
  role: NbaPosition;
  name: string;
  value: number;
}

export interface NbaFiveLineup {
  total: number;
  picks: NbaFivePick[];
}

/** Every permutation of [0..n). n is 5 here, so 120. */
function permutations(n: number): number[][] {
  if (n === 0) return [[]];
  const out: number[][] = [];
  for (const rest of permutations(n - 1)) {
    for (let i = 0; i <= rest.length; i++) out.push([...rest.slice(0, i), n - 1, ...rest.slice(i)]);
  }
  return out;
}

/**
 * The highest ('max') or lowest ('min') total five the dealt teams allow:
 * team i fills one slot, every slot is filled once, every man is eligible
 * for his slot, has a number for the challenge, and no name is used twice
 * (the game refuses a second man with a picked name). Exhaustive over the 120
 * slot orders, and over each slot's five best candidates, which is enough
 * because at most four other names can be taken. Null when no five exists.
 */
export function extremeFive(
  pools: NbaFiveTeamPool[],
  challenge: NbaFiveChallengeDef,
  mode: 'max' | 'min',
): NbaFiveLineup | null {
  const better = (a: number, b: number) => (mode === 'max' ? a > b : a < b);
  type Cand = NbaFivePick & { key: string };
  const cands: Cand[][][] = pools.map(pool => NBA_FIVE_ROLES.map(role => {
    const list: Cand[] = [];
    for (const e of pool.entries) {
      if (!isPositionEligibleForSlot(e.position, role)) continue;
      const v = valueFor(e, challenge);
      if (v.ok) list.push({ team: pool.team, role, name: e.name, value: v.value, key: e.key });
    }
    list.sort((a, b) => (mode === 'max' ? b.value - a.value : a.value - b.value) || a.name.localeCompare(b.name));
    return list.slice(0, NBA_FIVE_ROLES.length);
  }));
  /* A name on two dealt teams' lists can block a pick; any other name blocks
     nobody, so once the walk takes one it never needs a worse man there. */
  const teamsByKey = new Map<string, Set<number>>();
  cands.forEach((byRole, t) => byRole.forEach(list => list.forEach(c => {
    teamsByKey.set(c.key, (teamsByKey.get(c.key) ?? new Set<number>()).add(t));
  })));
  const shared = (key: string) => (teamsByKey.get(key)?.size ?? 0) > 1;
  const found: { best: NbaFiveLineup | null } = { best: null };
  for (const perm of permutations(pools.length)) {
    const chosen: NbaFivePick[] = [];
    const used = new Set<string>();
    const walk = (i: number, sum: number) => {
      if (i === pools.length) {
        if (!found.best || better(sum, found.best.total)) found.best = { total: round1(sum), picks: [...chosen] };
        return;
      }
      for (const c of cands[i][perm[i]]) {
        if (used.has(c.key)) continue;
        used.add(c.key);
        chosen.push({ team: c.team, role: c.role, name: c.name, value: c.value });
        walk(i + 1, sum + c.value);
        chosen.pop(); used.delete(c.key);
        if (!shared(c.key)) break;
      }
    };
    walk(0, 0);
  }
  return found.best;
}

export interface NbaFivePickScore extends NbaFivePick {
  /** The best and worst number this team allowed in this slot. */
  slotBest: number;
  slotWorst: number;
  /** 0 to 1: how close this pick came to the slot's best. */
  closeness: number;
}

export interface NbaFiveScore {
  /** 0 to 100 against the range the dealt teams allowed. */
  score: number;
  yourTotal: number;
  best: NbaFiveLineup;
  worst: NbaFiveLineup;
  perPick: NbaFivePickScore[];
}

/**
 * Scores a full five. "Highest" puts the best five allowed at 100 and the
 * worst at 0; "Lowest" turns the range round, so the smallest five allowed
 * scores 100. Every pick's number is read again from its team's pool here,
 * never taken from the caller. Null (no score, never a guess) when a pick's
 * team was not dealt, a team is dealt twice, a pick has no number or does
 * not fit his slot, a name or a slot repeats, or no five can be built.
 */
export function scoreFive(
  picks: Array<Pick<NbaFivePick, 'team' | 'role' | 'name'>>,
  pools: NbaFiveTeamPool[],
  challenge: NbaFiveChallengeDef,
  direction: 'highest' | 'lowest',
): NbaFiveScore | null {
  if (picks.length !== pools.length || picks.length !== NBA_FIVE_ROLES.length) return null;
  if (new Set(pools.map(p => p.team)).size !== pools.length) return null;
  if (new Set(picks.map(p => p.role)).size !== picks.length) return null;
  if (new Set(picks.map(p => p.team)).size !== picks.length) return null;
  if (new Set(picks.map(p => nbaFiveNameKey(p.name))).size !== picks.length) return null;
  const up = direction === 'highest';
  const perPick: NbaFivePickScore[] = [];
  for (const p of picks) {
    const pool = pools.find(pl => pl.team === p.team);
    const entry = pool ? findPoolEntry(pool, p.name) : null;
    if (!pool || !entry || !isPositionEligibleForSlot(entry.position, p.role)) return null;
    const own = valueFor(entry, challenge);
    if (!own.ok) return null;
    const values = pool.entries
      .filter(e => isPositionEligibleForSlot(e.position, p.role))
      .map(e => valueFor(e, challenge))
      .flatMap(v => (v.ok ? [v.value] : []));
    const hi = Math.max(...values), lo = Math.min(...values);
    const slotBest = up ? hi : lo, slotWorst = up ? lo : hi;
    const slotSpan = hi - lo;
    const gainedHere = up ? own.value - lo : hi - own.value;
    const closeness = slotSpan === 0 ? 1 : Math.max(0, Math.min(1, gainedHere / slotSpan));
    perPick.push({ team: p.team, role: p.role, name: entry.name, value: own.value, slotBest, slotWorst, closeness });
  }
  const best = extremeFive(pools, challenge, up ? 'max' : 'min');
  const worst = extremeFive(pools, challenge, up ? 'min' : 'max');
  if (!best || !worst) return null;
  const yourTotal = round1(perPick.reduce((a, p) => a + p.value, 0));
  const span = Math.abs(best.total - worst.total);
  const gained = up ? yourTotal - worst.total : worst.total - yourTotal;
  const score = span === 0 ? 100 : Math.max(0, Math.min(100, Math.round((gained / span) * 100)));
  return { score, yourTotal, best, worst, perPick };
}

/** Points recorded for a finish: the score on the old 500 scale, so a perfect
 *  five is worth what every finish used to be. */
export function nbaFivePoints(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score))) * 5;
}
