import { supabase } from '@/integrations/supabase/client';
import { Position } from '@/types/game';
import { FORMATIONS, Formation, FormationSlot, normalizePosition, playerRating } from '@/lib/squadDeal';
import { normalizeName } from '@/lib/whoAmI';
import { rng, winProbability } from '@/lib/perfectSeason';
import { ALL_POSITIONS, allowedLabelFor, eligiblePositions, fitsAllowed, slotAllowedPositions } from '@/lib/positionFit';
import type { XiFitAdjust } from '@/lib/xiFit';

/**
 * World XI (build an XI, one slot at a time)
 *
 * Pick a formation, get 11 random countries (one per slot, revealed in random
 * order), and name a real footballer of that nationality who can play the slot.
 *
 * POOL DESIGN (verified in SQL on flawuiqbvjobmkfkauhw, 2026-07-02):
 *   - Every row from the current season snapshot (year = 2026, 5393 rows, all
 *     positions down to about $1M value), paged 1000 at a time by id.
 *   - Plus the top 1000 rows of 2025 by market value, so recently faded or
 *     transferred stars stay guessable.
 *   - Deduped by player name keeping the newest year (value breaks ties),
 *     positions mapped through normalizePosition, primary nationality only.
 *   - Result: about 5,405 unique players.
 *
 * COUNTRY ELIGIBILITY (same thresholds as the verification SQL):
 *   at least 2 GK, 2 CB, 3 defenders, 3 central or wide midfielders and
 *   2 out-and-out forwards (ST or CF). 39 countries qualified on the live
 *   data, e.g. Brazil (31 GK), England (26 ST or CF), Japan (5 CB),
 *   Morocco (4 GK). The list is recomputed from the fetched pool at runtime,
 *   so it heals itself as the data grows.
 *
 * DRAW: 11 distinct countries, one per formation slot. Slots are matched in
 * scarcity order and a country is only assigned to a slot it can actually
 * fill from the pool; if a shuffle cannot cover every slot we redraw.
 */

export interface WxPlayer {
  name: string;
  country: string; // primary nationality, e.g. "France" from "France / Algeria"
  position: Position;
  club: string;
  value: number; // market value in USD from the row we kept
  /** Age from the same market-value row; feeds the age-aware card rating. */
  age?: number;
  /** Round 345: secondary positions this player has verifiably played, from
   *  the curated player_verified_positions table (human-verified, two sources
   *  per claim). Never derived from the market-value rows themselves: the
   *  table has no person identity, so a name-keyed derivation merges different
   *  humans sharing a name and fakes careers (two Gabriel Pereiras taught us).
   *  A played position grants eligibility for exactly that slot, no family
   *  expansion, which is the owner's "a CF with RW history fits RW". */
  positionsPlayed?: Position[];
}

export interface WorldXiData {
  players: WxPlayer[];
  byCountry: Map<string, WxPlayer[]>; // value-sorted per country
  countries: string[]; // qualifying countries, alphabetical
}

export interface TimerMode {
  key: 'none' | '90' | '60';
  label: string;
  seconds: number;
  hint: string;
}

export const TIMER_MODES: TimerMode[] = [
  { key: 'none', label: 'No timer', seconds: 0, hint: 'Take your time' },
  { key: '90', label: '90 seconds', seconds: 90, hint: 'A proper rush' },
  { key: '60', label: '60 seconds', seconds: 60, hint: 'Blitz football' },
];

/* ---------------- Pool fetch constants ---------------- */
const CURRENT_YEAR = 2026; // full season snapshot (same convention as squadDeal)
const PREV_YEAR = 2025; // top-value extras only
const PAGE = 1000; // PostgREST per-request row cap
const CURRENT_PAGES = 8; // 8000-row capacity for the current-year snapshot
const PREV_STARS = 1000;
const MIN_POOL = 800; // sanity floor before we trust the pool
const MIN_COUNTRIES = 12;

/* ---------------- Eligibility thresholds (SQL-verified) ---------------- */
const GK_MIN = 2; // goalkeepers are the scarce resource
const CB_MIN = 2; // every formation has 2 or 3 pure CB slots
const DEF_MIN = 3;
const MID_MIN = 3;
const FW_MIN = 2; // every formation has at least one ST slot

const DEF_SET = new Set<Position>(['CB', 'LB', 'RB', 'LWB', 'RWB']);
const MID_SET = new Set<Position>(['CDM', 'CM', 'CAM', 'LM', 'RM']);
const FW_SET = new Set<Position>(['ST', 'CF']);

/* ---------------- Small helpers ---------------- */

/**
 * First nationality only. Splits on "/" (dual style "France / Algeria") but
 * NOT on commas, because the table stores "Korea, South" as a single country.
 */
export function primaryCountry(nationality: string): string {
  return (nationality || '').split('/')[0].trim();
}

const DISPLAY_NAME: Record<string, string> = {
  'Korea, South': 'South Korea',
};

/** Human-friendly country label for headers and messages. */
export function displayCountry(country: string): string {
  return DISPLAY_NAME[country] ?? country;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* Round 442: the eligibility rule moved to `src/lib/positionFit.ts` so Build
   Your XI can hold the same one (it had none of its own and took a goalkeeper
   at centre mid). Nothing about the rule changed in the move. The family table,
   the Round 319 front-line narrowing and the Round 345 history path all live
   there now, with the goalkeeper boundary written out at the top of fitsAllowed
   instead of being an accident of GK having no family alternates. These four
   exports keep their names and their behaviour because WorldXi.tsx,
   gauntletDraft, searchDiscard and simWorldXiPositions all import them. */
export { eligiblePositions, ALL_POSITIONS };

export function fitsSlot(p: WxPlayer, slot: FormationSlot): boolean {
  return fitsAllowed(p.position, slotAllowedPositions(slot.label, slot.allowed), p.positionsPlayed);
}

/**
 * "ST / CF" style summary of what a slot accepts, matching what fitsSlot
 * actually lets through (a RW slot lists LW because wingers count on both
 * flanks).
 */
export function allowedLabel(slot: FormationSlot): string {
  return allowedLabelFor(slotAllowedPositions(slot.label, slot.allowed));
}

/** Friendly rejection line for a player who is real but plays elsewhere. */
export function wrongPositionMessage(p: WxPlayer, slot: FormationSlot): string {
  return `${p.name} plays ${p.position}. This ${slot.label} slot needs ${allowedLabel(slot)}. Try a different player.`;
}

/* ---------------- Country eligibility ---------------- */

export function countryQualifies(players: WxPlayer[]): boolean {
  let gk = 0;
  let cb = 0;
  let def = 0;
  let mid = 0;
  let fw = 0;
  for (const p of players) {
    if (p.position === 'GK') gk++;
    if (p.position === 'CB') cb++;
    if (DEF_SET.has(p.position)) def++;
    else if (MID_SET.has(p.position)) mid++;
    else if (FW_SET.has(p.position)) fw++;
  }
  return gk >= GK_MIN && cb >= CB_MIN && def >= DEF_MIN && mid >= MID_MIN && fw >= FW_MIN;
}

/* ---------------- Pool fetch ---------------- */

interface PoolRow {
  player_name: string | null;
  nationality: string | null;
  position: string | null;
  club: string | null;
  market_value_usd: number | null;
  year: number | null;
}

/**
 * Boot fetch. Returns null on any failure or on a suspiciously small pool so
 * the page can show an error state with retry.
 */
export async function fetchWorldXiPool(): Promise<WorldXiData | null> {
  try {
    const cols = 'player_name, nationality, position, club, market_value_usd, year, age';
    const pageRequests = Array.from({ length: CURRENT_PAGES }, (_, i) =>
      supabase
        .from('player_market_values')
        .select(cols)
        .eq('year', CURRENT_YEAR)
        .gt('market_value_usd', 0)
        .order('id', { ascending: true })
        .range(i * PAGE, i * PAGE + PAGE - 1),
    );
    const prevRequest = supabase
      .from('player_market_values')
      .select(cols)
      .eq('year', PREV_YEAR)
      .gt('market_value_usd', 0)
      .order('market_value_usd', { ascending: false })
      .limit(PREV_STARS);

    /* Round 345: verified position history, curated only. Each row is a
       human-verified claim (two sources, stored with provenance) about ONE
       specific person, and primary_position names which person: history
       attaches only to a pooled player whose own position matches it, so a
       tail player sharing a star's name cannot inherit his career.
       Fail soft on purpose: history only WIDENS eligibility, so a missing
       table degrades to primary-family rules instead of blocking the game. */
    const verifiedRequest = supabase
      .from('player_verified_positions' as never)
      .select('player_name, secondary_positions, primary_position')
      .limit(1000);

    const [verifiedRes, ...results] = await Promise.all([verifiedRequest, ...pageRequests, prevRequest]);
    const playedByName = new Map<string, { primary: Position | ''; secs: Position[] }>();
    const verRows = (verifiedRes as { error: unknown; data: { player_name: string; secondary_positions: string[]; primary_position: string | null }[] | null });
    if (!verRows.error && verRows.data) {
      for (const row of verRows.data) {
        const secs = (row.secondary_positions ?? []).filter((p): p is Position => (ALL_POSITIONS as string[]).includes(p));
        if (secs.length) {
          playedByName.set(row.player_name.trim(), {
            primary: normalizePosition((row.primary_position ?? '').trim()),
            secs,
          });
        }
      }
    }
    const rows: PoolRow[] = [];
    for (const r of results) {
      if (!r.error && r.data) rows.push(...(r.data as PoolRow[]));
    }
    if (rows.length === 0) return null;

    /* Dedupe by name keeping the newest year; higher value breaks ties.
       Round 669, namesakes: a year's snapshot holds one row per person, so
       two rows sharing a name in the SAME year at DIFFERENT clubs are two
       people (PSG's Vitinha, a defensive mid, and Genoa's Vitinha, a centre
       forward, both in 2026). They are kept apart by club instead of the
       more valuable one swallowing the other. Across years a name is still
       one career, exactly as before. */
    const byName = new Map<string, { year: number; byClub: Map<string, WxPlayer> }>();
    for (const r of rows) {
      const name = (r.player_name ?? '').trim();
      const country = primaryCountry(r.nationality ?? '');
      const position = normalizePosition((r.position ?? '').trim());
      const value = Number(r.market_value_usd) || 0;
      const year = Number(r.year) || 0;
      const club = (r.club ?? '').trim();
      if (!name || !country || !position || value <= 0) continue;
      const prev = byName.get(name);
      const sameClub = prev && year === prev.year ? prev.byClub.get(club) : undefined;
      if (!prev || year > prev.year || (year === prev.year && (!sameClub || value > sameClub.value))) {
        /* Identity guard: the curated history belongs to the human whose
           primary role the curators recorded, so a same-named player in a
           different role gets nothing. The goalkeeper boundary stands behind
           it: even a matched history never lets a keeper earn an outfield
           slot or an outfielder earn goal. */
        const playedRaw = playedByName.get(name);
        const played = playedRaw && playedRaw.primary === position
          ? playedRaw.secs.filter(p => (position === 'GK') === (p === 'GK'))
          : undefined;
        const player: WxPlayer = {
          name,
          country,
          position,
          club,
          value,
          age: Number((r as { age?: number | null }).age) || undefined,
          ...(played && played.some(p => p !== position) ? { positionsPlayed: played } : {}),
        };
        if (prev && year === prev.year) prev.byClub.set(club, player);
        else byName.set(name, { year, byClub: new Map([[club, player]]) });
      }
    }

    const players = [...byName.values()].flatMap(e => [...e.byClub.values()]);
    if (players.length < MIN_POOL) return null;

    const byCountry = new Map<string, WxPlayer[]>();
    for (const p of players) {
      const list = byCountry.get(p.country);
      if (list) list.push(p);
      else byCountry.set(p.country, [p]);
    }
    for (const list of byCountry.values()) list.sort((a, b) => b.value - a.value);

    const countries = [...byCountry.entries()]
      .filter(([, list]) => countryQualifies(list))
      .map(([country]) => country)
      .sort((a, b) => a.localeCompare(b));
    if (countries.length < MIN_COUNTRIES) return null;

    return { players, byCountry, countries };
  } catch {
    return null;
  }
}

/* ---------------- Country draw ---------------- */

const DRAW_ATTEMPTS = 40;

/**
 * Draws 11 distinct countries, one per formation slot, validating at draw
 * time that each country can fill its assigned slot from the pool. Slots are
 * processed hardest-first (fewest eligible countries) and each pick scans a
 * shuffled deck, which is equivalent to redrawing until the country fits.
 * Returns countries indexed by slot position, or null if no cover exists
 * (practically impossible with 25+ qualifying countries).
 */
export function drawCountries(formation: Formation, data: WorldXiData): string[] | null {
  const eligibleSets = formation.slots.map(slot => {
    const set = new Set<string>();
    for (const country of data.countries) {
      const list = data.byCountry.get(country) ?? [];
      if (list.some(p => fitsSlot(p, slot))) set.add(country);
    }
    return set;
  });
  const order = formation.slots
    .map((_, i) => i)
    .sort((a, b) => eligibleSets[a].size - eligibleSets[b].size);

  for (let attempt = 0; attempt < DRAW_ATTEMPTS; attempt++) {
    const deck = shuffle(data.countries);
    const picked: (string | null)[] = new Array(formation.slots.length).fill(null);
    const used = new Set<string>();
    let ok = true;
    for (const slotIndex of order) {
      const country = deck.find(c => !used.has(c) && eligibleSets[slotIndex].has(c));
      if (!country) {
        ok = false;
        break;
      }
      used.add(country);
      picked[slotIndex] = country;
    }
    if (ok) return picked as string[];
  }
  return null;
}

/**
 * Rerolls the nation assigned to a single slot (the Respin button), keeping
 * every other slot's country untouched. Only offers countries that (a) can
 * actually fill that slot from the pool and (b) are not already used by
 * another slot in this draw, so a respin never breaks the "distinct nation
 * per slot" guarantee. Returns the same country back if no alternative
 * exists (practically rare with 25+ qualifying countries).
 */
export function respinSlotCountry(
  formation: Formation,
  data: WorldXiData,
  slotIndex: number,
  currentCountries: string[],
): string {
  const slot = formation.slots[slotIndex];
  if (!slot) return currentCountries[slotIndex];
  const used = new Set(currentCountries.filter((_, i) => i !== slotIndex));
  const options = data.countries.filter(c => {
    if (used.has(c)) return false;
    const list = data.byCountry.get(c) ?? [];
    return list.some(p => fitsSlot(p, slot));
  });
  if (options.length === 0) return currentCountries[slotIndex];
  const pool = options.filter(c => c !== currentCountries[slotIndex]);
  const pick = pool.length > 0 ? pool : options;
  return pick[Math.floor(Math.random() * pick.length)];
}

/* ---------------- Suggestions ---------------- */

/**
 * Accent-insensitive suggestions restricted to one country (same tiering as
 * whoAmI: full-name prefix, then word prefix, then substring; each country
 * list is value-sorted so famous names float up). Requires 2+ letters.
 * Any position is suggested on purpose: picking a wrong-position player is
 * how the friendly rejection message gets triggered.
 */
export function suggestCountryPlayers(
  data: WorldXiData,
  country: string,
  query: string,
  exclude?: Set<string>,
  limit = 8,
): WxPlayer[] {
  const q = normalizeName(query);
  if (q.length < 2) return [];
  const list = data.byCountry.get(country) ?? [];
  const starts: WxPlayer[] = [];
  const wordStarts: WxPlayer[] = [];
  const contains: WxPlayer[] = [];
  for (const p of list) {
    if (exclude && exclude.has(p.name)) continue;
    const n = normalizeName(p.name);
    if (!n.includes(q)) continue;
    if (n.startsWith(q)) starts.push(p);
    else if (n.split(' ').some(w => w.startsWith(q))) wordStarts.push(p);
    else contains.push(p);
    if (starts.length >= limit) break;
  }
  return [...starts, ...wordStarts, ...contains].slice(0, limit);
}

/* ---------------- Season simulation ---------------- */
//
// Runs after the XI is complete. Reuses the deterministic rng() and
// winProbability() curve from perfectSeason.ts so the odds feel consistent
// with the rest of the site's sim family, instead of inventing a new curve.
// The whole report is seeded off the squad's total market value, so the same
// 11 players always produce the same season (deterministic, shareable,
// reproducible if a player screenshots and someone else tries to match it).

const LEAGUE_TEAMS = 20;
const LEAGUE_MATCHES = 38; // round-robin-ish, matches perfectSeason/unbeatenMode convention
const DRAW_SHARE = 0.26;

export interface SeasonInjury {
  name: string;
  weeksOut: number;
}

export type MatchResult = 'W' | 'D' | 'L';

/* Round 726, the other half of his "more in the season report". Everything
   in these four shapes is read off the eleven's real positions, ages and card
   ratings plus the seeded rolls. Nobody real is quoted anywhere in them: a
   month's moment speaks through a role (your assistant, the fans, the board)
   and a standout is a name beside his numbers, which is reporting. */
export interface MonthReport {
  month: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  /** Most goal involvements in the month from the eleven, ties to the higher card rating. */
  standout: { name: string; goals: number; assists: number; cleanSheets: number } | null;
  moment: string;
}

export interface PlayerSeasonStats {
  name: string;
  position: Position;
  appearances: number;
  goals: number;
  assists: number;
  /** Keeper and back line only; null for everyone further forward. */
  cleanSheets: number | null;
  avgRating: number;
}

export interface SeasonAwards {
  /** Only when a pick is 23 or under on our list; null otherwise. */
  youngPlayer: { name: string; age: number; rating: number } | null;
  goalOfSeason: { scorer: string; opponent: string; minute: string; month: string; score: string; line: string } | null;
}

export interface WhatIf {
  kind: 'formation' | 'respin' | 'none';
  /** The alternative formation's name, the lifted slot's role, or '' for none. */
  alternative: string;
  finishFrom: number;
  finishTo: number;
  pointsFrom: number;
  pointsTo: number;
  line: string;
}

export interface SeasonReport {
  squadRating: number; // 0-100 overall, drives the whole report
  tablePosition: number; // 1-20, 1 is champions
  points: number;
  topScorer: { name: string; goals: number } | null;
  trophies: string[];
  injuries: SeasonInjury[];
  transferHeadline: string;
  narrative: string[];
  /* Round 455, his "more in the season report": the things the sim already
     knew and never said. None of these draws from the generator, so a
     squad's season reads exactly as it did before, with more said about it. */
  record: { wins: number; draws: number; losses: number };
  /** Longest run of matches without defeat, from the sim's own sequence. */
  unbeatenRun: number;
  /** Points behind the top of the table, or 0 as champions. */
  gapToTop: number;
  /** Points clear of second place when champions, otherwise 0. */
  marginAsChampion: number;
  /** The XI's best player by the sim's own rating, a result and never a claim. */
  playerOfSeason: { name: string; rating: number } | null;
  /* Round 726. All optional so a report built before this round still reads. */
  goalsFor?: number;
  goalsAgainst?: number;
  cleanSheets?: number;
  assists?: number;
  months?: MonthReport[];
  playerStats?: PlayerSeasonStats[];
  awards?: SeasonAwards;
  whatIf?: WhatIf;
  /** Round 825, Build Your XI only. Optional: World XI never passes a
   *  breakdown, and a report built before this round has none. */
  fit?: SeasonFit;
}

/**
 * Round 825: the role fit, chemistry and balance the season was played with
 * (squad rating points, as handed in), and what each was worth in league
 * points: the same 38 rolls replayed without that one, everything else kept.
 */
export interface SeasonFit extends XiFitAdjust {
  /** The squad rating plus the three, the number the league was played at. */
  matchRating: number;
  points: XiFitAdjust;
  /** The sentence the narrative carries. */
  line: string;
}

/** Simple hash of the squad's names into a stable non-negative seed. */
function squadSeed(filled: WxPlayer[]): number {
  const key = filled.map(p => p.name).sort().join('|');
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (Math.imul(h, 31) + key.charCodeAt(i)) | 0;
  }
  // Fold in total value so two squads sharing 10 names but differing in one
  // still diverge, and clamp to a positive 31-bit range for rng().
  const valueSum = filled.reduce((s, p) => s + Math.round(p.value), 0);
  return Math.abs((h ^ valueSum) >>> 0);
}

/**
 * Maps a 0-100 squad rating onto the perfectSeason win-probability curve
 * (tuned around overalls in the 40-99 band), the same mapping unbeatenMode.ts
 * uses for Perfect Lineup's "Go Unbeaten" mode.
 */
function ratingToOverall(rating: number): number {
  const clamped = Math.max(0, Math.min(100, rating));
  return 40 + (clamped / 100) * 59;
}

/* Round 449: no real footballer's name goes into one of these. The old six
   put a named, real player at the centre of an invented bust-up, an invented
   transfer request, agents leaking interest, a rejected bid: conduct, not a
   simulated result. A simulated season can say a real player scored twelve
   in your XI, because the whole screen is plainly a sim of a squad you built.
   It cannot say he fell out with the board, because that is a claim about the
   man, and CLAUDE.md names invented transfers and invented words in a real
   person's mouth as the exposure that matters most. The lines are about the
   club and the window now, and the player is only ever "your keeper" or
   "your forward", the role his drawn position gives him. */
const TRANSFER_SAGA_TEMPLATES = [
  'The board turned down a club record bid for your {role} in January and made a point of saying so.',
  'Two clubs chased your {role} all winter. Neither got past the first phone call.',
  'Your {role} signed a new deal in March, which ended a month of noise.',
  'A release clause in the {role} contract kept the rumour mill busy until deadline day passed quietly.',
  'Deadline day came and went with your {role} still in the building, which is all anyone here wanted.',
  'A loan bid for your {role} arrived on the last day of the window and did not get a reply.',
];

/** The role a drawn player plays in a saga line, from his position and never his name. */
function sagaRoleFor(position: string | undefined): string {
  const p = (position || '').toUpperCase();
  if (p === 'GK') return 'keeper';
  if (/^(CB|LB|RB|LWB|RWB|DEF|D)$/.test(p) || p.startsWith('CB')) return 'defender';
  if (/^(CDM|CM|CAM|LM|RM|DM|AM|MID|M)$/.test(p)) return 'midfielder';
  if (/^(ST|CF|LW|RW|FWD|FW|F)$/.test(p)) return 'forward';
  return 'starter';
}

/* ---------------- The league, as one function (Round 726) ---------------- */

interface LeagueRun {
  results: MatchResult[];
  points: number;
  wins: number;
  draws: number;
  losses: number;
  unbeatenRun: number;
  rivalPoints: number[];
  tablePosition: number;
}

/**
 * The 38 team rolls and the 19 rivals, in exactly the draw order the season
 * has always used, so a squad's season is byte identical to what it was.
 * Lifted out of simulateWorldXiSeason in Round 726 so the "what would have
 * changed" line can replay the same rolls under a different shape or rating.
 */
function playLeague(rand: () => number, winP: number): LeagueRun {
  const drawP = (1 - winP) * DRAW_SHARE;
  const results: MatchResult[] = [];
  let points = 0;
  let wins = 0;
  let draws = 0;
  let losses = 0;
  /* Round 455: the unbeaten run is read off the same rolls, no extra draw. */
  let unbeatenRun = 0;
  let currentRun = 0;
  for (let i = 0; i < LEAGUE_MATCHES; i++) {
    const roll = rand();
    if (roll < winP) { points += 3; wins++; currentRun++; }
    else if (roll < winP + drawP) { points += 1; draws++; currentRun++; }
    else { losses++; currentRun = 0; }
    if (currentRun > unbeatenRun) unbeatenRun = currentRun;
    results.push(roll < winP ? 'W' : roll < winP + drawP ? 'D' : 'L');
  }

  // Table position: rank this points total against 19 simulated rivals whose
  // strength is spread around the same league so the position feels earned
  // rather than a flat lookup table.
  const rivalPoints: number[] = [];
  for (let i = 0; i < LEAGUE_TEAMS - 1; i++) {
    const rivalOverall = 55 + rand() * 40; // spread of a plausible league
    const rp = winProbability(rivalOverall);
    const rdp = (1 - rp) * DRAW_SHARE;
    let rpts = 0;
    for (let m = 0; m < LEAGUE_MATCHES; m++) {
      const roll = rand();
      if (roll < rp) rpts += 3;
      else if (roll < rp + rdp) rpts += 1;
    }
    rivalPoints.push(rpts);
  }
  const tablePosition = Math.min(LEAGUE_TEAMS, 1 + rivalPoints.filter(p => p > points).length);
  return { results, points, wins, draws, losses, unbeatenRun, rivalPoints, tablePosition };
}

/** The shared age-aware card rating for each man, the number the whole site shows.
    A value that is not a number reads as no value at all, the way both pages
    already read a missing one (Number(...) || 0 and pick.value ?? 0), so a bad
    row rates at the floor instead of turning the whole season into NaN. */
function ratingsFor(players: WxPlayer[]): number[] {
  return players.map(p =>
    playerRating({ marketValue: Math.max(1, (Number.isFinite(p.value) ? p.value : 0) / 1_000_000), age: p.age ?? 27 } as Parameters<typeof playerRating>[0]),
  );
}

function squadRatingOf(ratings: number[]): number {
  const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 50;
  return Math.max(1, Math.min(100, Math.round(avg)));
}

/* Round 726: an alternative shape costs the side for every man it has no
   natural slot for. Players are matched to slots with the same fitsSlot rule
   the game picks with, as a proper matching rather than a greedy pass, so a
   man who could cover two slots never blocks one.
   The chosen set up is never charged, so every season reads exactly as it
   did before this round. That matters for Build Your XI, which hands the sim
   a pick's primary position only: a man his verified history let into a slot
   counts as a misfit here although the game took him. So an alternative pays
   only for the misfits it has BEYOND the chosen shape's, which also means no
   other shape can ever gain on the same rolls, and the line can say so. */
const MISFIT_PENALTY = 2.5;
const MISFIT_CAP = 10;

function misfitPenalty(misfits: number): number {
  return Math.min(MISFIT_CAP, misfits * MISFIT_PENALTY);
}

function shapePenalty(players: WxPlayer[], chosen: string, alternative: string | undefined): number {
  if (!alternative || alternative === chosen) return 0;
  return misfitPenalty(Math.max(0, formationMisfits(players, alternative) - formationMisfits(players, chosen)));
}

export function formationMisfits(players: WxPlayer[], formationName: string): number {
  const formation = FORMATIONS.find(f => f.name === formationName);
  if (!formation) return 0;
  const slots = formation.slots;
  const holder: number[] = new Array(slots.length).fill(-1);
  const place = (pi: number, seen: boolean[]): boolean => {
    for (let si = 0; si < slots.length; si++) {
      if (seen[si] || !fitsSlot(players[pi], slots[si])) continue;
      seen[si] = true;
      if (holder[si] === -1 || place(holder[si], seen)) {
        holder[si] = pi;
        return true;
      }
    }
    return false;
  };
  let placed = 0;
  for (let pi = 0; pi < players.length; pi++) {
    if (place(pi, new Array(slots.length).fill(false))) placed++;
  }
  return players.length - placed;
}

/**
 * Round 726: the finish the same rolls give under one change. Either the
 * same eleven in another formation, or the lowest rated pick lifted to the
 * level of the other ten (the squad rating becomes their mean), which is
 * what a respin that landed a pick at the side's level would have done.
 * With no change it returns exactly the season's own finish, and the harness
 * holds it to that.
 *
 * Round 825: `adjust` is the Build Your XI breakdown's total (squad rating
 * points) the season itself was played with, so an alternative is replayed
 * on the same footing; simBuildYourXiFit also replays each factor through it.
 */
export function whatIfFinish(
  filled: WxPlayer[],
  formationName: string,
  alt: { formation?: string; liftWeakest?: boolean; adjust?: number } = {},
): { points: number; tablePosition: number } {
  const players = filled.filter((p): p is WxPlayer => p !== null);
  const seed = squadSeed(players);
  const ratings = ratingsFor(players);
  let squadRating = squadRatingOf(ratings);
  if (alt.liftWeakest && ratings.length >= 2) {
    const weakest = ratings.indexOf(Math.min(...ratings));
    squadRating = squadRatingOf(ratings.filter((_, i) => i !== weakest));
  }
  const penalty = shapePenalty(players, formationName, alt.formation);
  const run = playLeague(rng(seed), winProbability(ratingToOverall(squadRating + (alt.adjust ?? 0)) - penalty));
  return { points: run.points, tablePosition: run.tablePosition };
}

/* ---------------- Round 726: the rest of the report ---------------- */

const MONTHS = ['August', 'September', 'October', 'November', 'December', 'January', 'February', 'March', 'April', 'May'];
/* A real season's rhythm: short opening month, a short January. Sums to 38. */
const MONTH_MATCHES = [3, 4, 4, 4, 4, 3, 4, 4, 4, 4];

/* Who scores and who sets up, by position, before the card rating weighs in.
   A keeper never scores here; a centre back gets the odd header. */
const GOAL_WEIGHT: Record<string, number> = {
  ST: 10, CF: 9, LW: 6, RW: 6, CAM: 5, LM: 3.5, RM: 3.5, CM: 2.5, CDM: 1.2, LWB: 1, RWB: 1, LB: 0.8, RB: 0.8, CB: 1, GK: 0,
};
const ASSIST_WEIGHT: Record<string, number> = {
  CAM: 8, LW: 7, RW: 7, LM: 6, RM: 6, CM: 5, ST: 4, CF: 4, LWB: 4, RWB: 4, LB: 3, RB: 3, CDM: 2.5, CB: 1, GK: 0.2,
};

/* Role voices only. The month and its numbers are the only things filled in,
   so no real name can end up as the speaker of any of these, and none of
   them carries a quote mark or an apostrophe (the harness holds both). A
   pool is picked by the month's record. Every pool holds more lines than a
   season has months, so no line is used twice in a season; the harness fails
   a season that repeats one. */
const MONTH_UNBEATEN = [
  'Your assistant said the shape finally made sense in {month}. {p} games, not one of them lost.',
  'The fans sang through {month}. {p} games, no defeats, and the noise carried into the car park.',
  'Unbeaten in {month}. The coaching staff let the dressing room enjoy it for exactly one night.',
  'The board sent a short note after {month}. It said well done and nothing else, which from them is a lot.',
  'Nobody beat you in {month}, and your assistant started pinning the table to the dressing room wall.',
  '{month} went by without a defeat. The physio spent most of it with his feet up.',
  'Not beaten once in {month}. The analysts had a hard time finding anything for the bad tape.',
  'The away end travelled all {month} and never once went home beaten.',
  'A clean {month}: {w}W {d}D, no defeats. The coaching staff did not change a thing.',
  'The groundsman said the pitch looked better in {month}. So did the results, unbeaten in {p}.',
  'Your assistant stopped writing notes on the bus home in {month}. There was nothing to fix.',
  'The kit man called {month} the quietest month of the year in the dressing room. Nobody had a defeat to sulk about.',
];
const MONTH_WINLESS = [
  'A winless {month}. The door stayed shut after the last one and the press got nothing.',
  'Your assistant called {month} a reset, which is the polite word for it.',
  'The fans let {month} have it. No wins in {p} games will do that.',
  'Not a win all {month}. The dressing room went quiet and the board went quieter.',
  'The coaching staff went back through every tape from {month}, twice.',
  'No wins in {month}. The analysts sat through the tapes until the lights went off.',
  '{month} brought {p} games and no wins. The board asked for a meeting and got one.',
  'The kit man packed the bags in silence after every game in {month}. No wins in {p}.',
  'A winless {month}, and the fans let the coaching staff know about it on the way out.',
  'Your assistant tore up the plan for {month} halfway through. It did not help.',
  'The local paper ran out of ways to say it in {month}. {p} games, no win.',
  'The training ground was a quiet place in {month}. Nobody needs telling after a month without a win.',
];
/* More wins than defeats, at least one defeat. */
const MONTH_GOOD = [
  'Your assistant filed {month} under good: {wins} from {p}.',
  '{wins} from {p} in {month}. The fans went home happy more often than not.',
  'A decent {month}, {wins} from {p}. The coaching staff picked holes in it anyway.',
  'The board liked {month}. {wins} from {p}, and nobody upstairs asked any questions.',
  'More wins than defeats in {month}. Your assistant called it progress and moved on.',
  'The dressing room was loud more often than not in {month}. {wins} from {p}.',
  '{month} was a solid month at {w}W {d}D {l}L. The analysts found one bad half and played it twice.',
  'The kit man noticed the bus home got noisier in {month}. {wins} from {p} will do that.',
  'A good {month} with a scare in it. The coaching staff took the {wins} and the lesson.',
  'The fans left happy most weeks in {month}, {w}W {d}D {l}L.',
  'The board approved of {month}. {wins} from {p}, and {defeats} nobody upstairs mentioned.',
  'Your assistant marked {month} as a pass. {wins} from {p}, with room to be better.',
];
/* At least one win, but no more wins than defeats. */
const MONTH_UNEVEN = [
  '{month} was a coin toss: {w}W {d}D {l}L, and the dressing room knew it.',
  'The fans left {month} unsure what they were watching. {wins}, {defeats}, no pattern.',
  'A month of two halves in {month}: the good games were very good and the rest were not.',
  'Your assistant called {month} uneven, which was generous. {wins} from {p}.',
  'One step forward and one back in {month}, {w}W {d}D {l}L.',
  '{month} could not make up its mind. {wins}, {defeats}, and the coaching staff no wiser.',
  'The fans saw the best and the worst of the side in {month}. {wins} from {p} is not enough.',
  'The analysts split {month} into what worked and what did not, and both lists were long.',
  'A win here, a defeat there in {month}. The board noticed the pattern, or the lack of one.',
  'The mood on the bus changed every week in {month}, the kit man said. {w}W {d}D {l}L tells you why.',
  'Your assistant wanted more from {month} than {wins} from {p}, and said so on the training ground.',
  'The dressing room could not find a rhythm in {month}. {wins}, {defeats}.',
];
/* Only ever the month that holds the season's biggest win, and only when it
   was by four or more, so it is said once a season at most. */
const MONTH_BIG_WIN = [
  'The {gf}-{ga} in {month} is the one the fans will still be bringing up in ten years.',
  'A {gf}-{ga} in {month}. Your assistant kept the team sheet from that one.',
];
/** The month pools by the record that picks them, read by simWorldXiSeasonReport. */
export const MONTH_LINES = { unbeaten: MONTH_UNBEATEN, winless: MONTH_WINLESS, good: MONTH_GOOD, uneven: MONTH_UNEVEN, bigWin: MONTH_BIG_WIN };

const GOAL_DESCRIPTIONS: Record<string, string[]> = {
  GK: ['a clearance from his own half that bounced over everyone'],
  defender: ['a header from a corner', 'a near post header nobody picked up', 'a drive from the overlap'],
  midfielder: ['a strike from thirty yards', 'a first time hit from the edge of the box', 'a curler into the top corner'],
  winger: ['a cut inside and a finish into the far corner', 'a solo run from the halfway line', 'a chip over the keeper'],
  forward: ['a volley off a cross', 'a first time finish on the turn', 'a header at the back post'],
};

function goalFamily(position: string): string {
  if (position === 'GK') return 'GK';
  if (DEF_SET.has(position as Position)) return 'defender';
  if (['LW', 'RW', 'LM', 'RM'].includes(position)) return 'winger';
  if (FW_SET.has(position as Position)) return 'forward';
  return 'midfielder';
}

/** Largest remainder split of `total` across `weights`, each share capped where a cap is given. */
function allocateByWeight(total: number, weights: number[], caps?: number[]): number[] {
  const out = new Array<number>(weights.length).fill(0);
  const sum = weights.reduce((s, w) => s + w, 0);
  if (total <= 0 || sum <= 0) return out;
  const exact = weights.map(w => (w / sum) * total);
  let left = total;
  exact.forEach((e, i) => { out[i] = Math.floor(e); left -= out[i]; });
  const order = exact.map((e, i) => ({ i, frac: e - Math.floor(e) })).sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let k = 0; left > 0 && k < order.length; k++) { out[order[k].i] += 1; left -= 1; }
  if (caps) {
    let surplus = 0;
    for (let i = 0; i < out.length; i++) {
      if (out[i] > caps[i]) { surplus += out[i] - caps[i]; out[i] = caps[i]; }
    }
    /* Hand the surplus to whoever still has room; when nobody does it is
       dropped and the total simply comes out lower. */
    for (let pass = 0; surplus > 0 && pass < 60; pass++) {
      let moved = false;
      for (let i = 0; i < out.length && surplus > 0; i++) {
        if (weights[i] > 0 && out[i] < caps[i]) { out[i] += 1; surplus -= 1; moved = true; }
      }
      if (!moved) break;
    }
  }
  return out;
}

function pickWeighted(rand: () => number, weights: number[]): number {
  const sum = weights.reduce((s, w) => s + w, 0);
  if (sum <= 0) return 0;
  let x = rand() * sum;
  for (let i = 0; i < weights.length; i++) {
    x -= weights[i];
    if (x <= 0) return i;
  }
  return weights.length - 1;
}

function shuffleWith<T>(rand: () => number, arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function fillMonth(template: string, v: Record<string, number | string>): string {
  return template.replace(/\{(w|d|l|p|gf|ga|month|wins|defeats)\}/g, (_, k: string) => String(v[k]));
}

/** "1 win", "3 wins": counted words for the month lines. */
function counted(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

interface SeasonExtras {
  goalsFor: number;
  goalsAgainst: number;
  cleanSheets: number;
  assists: number;
  months: MonthReport[];
  playerStats: PlayerSeasonStats[];
  awards: SeasonAwards;
  whatIf: WhatIf;
}

/**
 * Everything Round 726 added, drawn AFTER every draw the season already made
 * so the points, the table, the trophies, the top scorer, the injuries and the
 * saga line are exactly what they were. The per player numbers are built to
 * add up: the top scorer keeps the goals the report already printed, the
 * other ten split the rest by position and rating, and every goal is then
 * placed in a real match of the season so the months agree with the totals.
 */
function buildSeasonExtras(
  rand: () => number,
  players: WxPlayer[],
  ratings: number[],
  league: LeagueRun,
  topScorer: { name: string; goals: number } | null,
  injuries: SeasonInjury[],
  formationName: string,
  squadRating: number,
  /** Round 825: the breakdown total the season was played with, 0 for World XI. */
  adjust: number,
): SeasonExtras {
  const n = players.length;
  const { results, rivalPoints, points, tablePosition } = league;
  const ratingFactor = ratings.map(r => 0.4 + r / 100);

  /* Who played which match. An injury is one unbroken spell of the weeks the
     report prints (a week is a match here) and a rest is one match off, so
     the appearances, the clean sheets and every goal and assist below are
     all read off the same 38 games, and nobody scores in a match he missed. */
  const injuredWeeks = new Map(injuries.map(inj => [inj.name, inj.weeksOut]));
  const played = players.map(p => {
    const on = new Array<boolean>(results.length).fill(true);
    const weeks = Math.min(results.length - 1, injuredWeeks.get(p.name) ?? 0);
    if (weeks > 0) {
      const start = Math.floor(rand() * (results.length - weeks + 1));
      for (let m = start; m < start + weeks; m++) on[m] = false;
    }
    const rests = p.position === 'GK' ? (rand() < 0.3 ? 1 : 0) : Math.floor(rand() * 4);
    for (let k = 0; k < rests; k++) {
      const open = on.map((v, m) => (v ? m : -1)).filter(m => m >= 0);
      if (open.length <= 1) break;
      on[open[Math.floor(rand() * open.length)]] = false;
    }
    return on;
  });
  const appearances = played.map(on => on.filter(Boolean).length);
  /* A man who missed eleven weeks gets the goals and assists of the games he
     played, not of a full season. */
  const availability = appearances.map(a => a / Math.max(1, results.length));

  /* Goals per player. The top scorer is fixed at the number already printed;
     everyone else is capped one below him so he stays the top scorer. */
  const topIdx = topScorer ? players.findIndex(p => p.name === topScorer.name) : -1;
  const topGoals = topScorer ? topScorer.goals : 0;
  const goalWeights = players.map((p, i) => (i === topIdx ? 0 : (GOAL_WEIGHT[p.position] ?? 1) * ratingFactor[i] * availability[i]));
  /* The side's goals follow its points (a real top flight runs close to a
     goal a point), and the top scorer's printed tally never comes to more
     than about half of them. Measured over 300 squads a tier: sides on 77
     points scored about 73, sides on 110 about 104. */
  const teamTarget = Math.round(points * (0.85 + rand() * 0.2));
  const othersTarget = topScorer ? Math.max(Math.round(topGoals * 1.1), teamTarget - topGoals) : teamTarget;
  const caps = players.map(() => (topScorer ? Math.max(0, topGoals - 1) : LEAGUE_MATCHES * 2));
  const playerGoals = allocateByWeight(othersTarget, goalWeights, caps);
  if (topIdx >= 0) playerGoals[topIdx] = topGoals;
  /* Every win needs a goal. This cannot bind in practice (the top scorer alone
     clears eight), but the sum must never contradict the record. */
  let goalsFor = playerGoals.reduce((s, g) => s + g, 0);
  while (n > 0 && goalsFor < league.wins) {
    const best = goalWeights.indexOf(Math.max(...goalWeights));
    playerGoals[best >= 0 ? best : 0] += 1;
    goalsFor += 1;
  }

  /* Assists for the season, about two thirds of the goals. */
  const assistTotal = Math.round(goalsFor * (0.62 + rand() * 0.18));
  const assistWeights = players.map((p, i) => (ASSIST_WEIGHT[p.position] ?? 1) * ratingFactor[i] * availability[i]);
  const playerAssistsTarget = allocateByWeight(assistTotal, assistWeights);

  /* Fixtures: every rival home and away, in a seeded order. */
  const fixtureDeck = shuffleWith(rand, rivalPoints.flatMap((_, r) => [{ rival: r, home: true }, { rival: r, home: false }]));
  const fixtures = results.map((_, i) => fixtureDeck[i % Math.max(1, fixtureDeck.length)] ?? { rival: 0, home: true });

  /* Scorelines consistent with the result, built from the scorers. Every win
     first gets one goal from a man who played in it, then each man's other
     goals land in matches he played, wins first. */
  const gf = results.map(() => 0);
  const matchWeight = results.map(r => (r === 'W' ? 3 : r === 'D' ? 1.2 : 0.8));
  const goals: { match: number; scorer: number; assister: number | null }[] = [];
  const tokensLeft = [...playerGoals];
  const winOrder = shuffleWith(rand, results.map((_, m) => m)).filter(m => results[m] === 'W');
  for (const m of winOrder) {
    const onPitch = tokensLeft.map((left, i) => (played[i][m] ? left : 0));
    /* Only if every goal left belongs to men who missed this win does the
       goal go to whoever still has one. With a side scoring well over a goal
       a win it has not happened in any season the harness plays, and the
       harness fails the day it does (every goal is checked against who
       played). */
    const i = pickWeighted(rand, onPitch.some(left => left > 0) ? onPitch : tokensLeft);
    if (tokensLeft[i] <= 0) break;
    tokensLeft[i] -= 1;
    gf[m] += 1;
    goals.push({ match: m, scorer: i, assister: null });
  }
  tokensLeft.forEach((left, i) => {
    const where = matchWeight.map((w, m) => (played[i][m] ? w : 0));
    for (let k = 0; k < left; k++) {
      const m = pickWeighted(rand, where);
      gf[m] += 1;
      goals.push({ match: m, scorer: i, assister: null });
    }
  });
  goals.sort((a, b) => a.match - b.match);
  /* A win concedes a little (none, one, now and then two, never as many as
     it scored), so a 5-0 does not turn into a 5-3; a defeat loses by one,
     two or three. Measured before this split, a 110 point side conceded 40
     a season, which is a mid table defence; after it, about 24. */
  const ga = results.map((r, i) => {
    if (r === 'D') return gf[i];
    const m = rand();
    if (r === 'W') return Math.min(gf[i] - 1, m < 0.45 ? 0 : m < 0.82 ? 1 : 2);
    return gf[i] + (m < 0.5 ? 1 : m < 0.8 ? 2 : 3);
  });
  const goalsAgainst = ga.reduce((s, g) => s + g, 0);
  const cleanSheets = ga.filter(g => g === 0).length;

  /* Every assist on a goal by somebody else, in a match the assister played.
     An assist with no such goal left is not given, so the assists the page
     prints are exactly the ones placed. */
  const assistTokens = shuffleWith(rand, playerAssistsTarget.flatMap((a, i) => new Array<number>(a).fill(i)));
  const goalOrder = shuffleWith(rand, goals.map((_, i) => i));
  for (const a of assistTokens) {
    const placed = goalOrder.find(gi => goals[gi].assister === null && goals[gi].scorer !== a && played[a][goals[gi].match]);
    if (placed !== undefined) goals[placed].assister = a;
  }
  const playerAssists = players.map((_, i) => goals.filter(g => g.assister === i).length);
  const assists = playerAssists.reduce((s, a) => s + a, 0);

  /* A man's clean sheets are the shutouts in the games he played, so the
     keeper and the back four each count their own and never the team's. */
  const keepsSheets = (pos: Position) => pos === 'GK' || DEF_SET.has(pos);
  const sheetsIn = (i: number, matches: number[]) => matches.filter(m => played[i][m] && ga[m] === 0).length;
  const allMatches = results.map((_, m) => m);
  const playerStats: PlayerSeasonStats[] = players.map((p, i) => {
    const cs = keepsSheets(p.position) ? sheetsIn(i, allMatches) : null;
    const avg = 5.8 + (ratings[i] - 55) / 18 + 0.012 * (playerGoals[i] + playerAssists[i]) + 0.01 * (cs ?? 0);
    return {
      name: p.name,
      position: p.position,
      appearances: appearances[i],
      goals: playerGoals[i],
      assists: playerAssists[i],
      cleanSheets: cs,
      avgRating: Math.round(Math.max(5.5, Math.min(9.3, avg)) * 10) / 10,
    };
  });

  /* Month by month. */
  const monthOf: number[] = [];
  MONTH_MATCHES.forEach((count, mi) => { for (let k = 0; k < count; k++) monthOf.push(mi); });
  while (monthOf.length < results.length) monthOf.push(MONTHS.length - 1);
  /* The season's biggest win, the first of them on a tie. */
  const seasonBest = results.reduce((best, r, i) => (r === 'W' && gf[i] - ga[i] > best.margin ? { margin: gf[i] - ga[i], i } : best), { margin: 0, i: -1 });
  const bigWinMonth = seasonBest.margin >= 4 ? monthOf[seasonBest.i] : -1;
  const usedLines = new Set<string>();
  const pickLine = (pool: string[]) => {
    let open = pool.filter(l => !usedLines.has(l));
    if (open.length === 0) { pool.forEach(l => usedLines.delete(l)); open = pool; }
    const line = open[Math.floor(rand() * open.length)];
    usedLines.add(line);
    return line;
  };
  const months: MonthReport[] = MONTHS.map((month, mi) => {
    const idx = results.map((_, i) => i).filter(i => monthOf[i] === mi);
    if (idx.length === 0) return null;
    const w = idx.filter(i => results[i] === 'W').length;
    const d = idx.filter(i => results[i] === 'D').length;
    const l = idx.filter(i => results[i] === 'L').length;
    const mgf = idx.reduce((s, i) => s + gf[i], 0);
    const mga = idx.reduce((s, i) => s + ga[i], 0);
    const inv = players.map((_, pi) => ({
      pi,
      goals: goals.filter(g => idx.includes(g.match) && g.scorer === pi).length,
      assists: goals.filter(g => idx.includes(g.match) && g.assister === pi).length,
    }));
    const scored = inv.filter(x => x.goals + x.assists > 0)
      .sort((a, b) => (b.goals * 2 + b.assists) - (a.goals * 2 + a.assists) || ratings[b.pi] - ratings[a.pi] || a.pi - b.pi);
    let standout: MonthReport['standout'] = null;
    if (scored.length) {
      const s = scored[0];
      standout = { name: players[s.pi].name, goals: s.goals, assists: s.assists, cleanSheets: keepsSheets(players[s.pi].position) ? sheetsIn(s.pi, idx) : 0 };
    } else if (n > 0) {
      /* A month nobody scored in goes to the keeper if he kept a clean sheet
         in it, otherwise to the best rated man who played in it at all. */
      const onPitch = players.map((_, pi) => pi).filter(pi => idx.some(m => played[pi][m]));
      const candidates = onPitch.length ? onPitch : players.map((_, pi) => pi);
      const gk = candidates.find(pi => players[pi].position === 'GK');
      const pi = gk !== undefined && sheetsIn(gk, idx) > 0 ? gk : candidates.reduce((best, c) => (ratings[c] > ratings[best] ? c : best), candidates[0]);
      standout = { name: players[pi].name, goals: 0, assists: 0, cleanSheets: keepsSheets(players[pi].position) ? sheetsIn(pi, idx) : 0 };
    }
    const pool = mi === bigWinMonth
      ? MONTH_BIG_WIN
      : l === 0 && w > 0
      ? MONTH_UNBEATEN
      : w === 0
      ? MONTH_WINLESS
      : w > l
      ? MONTH_GOOD
      : MONTH_UNEVEN;
    const template = pickLine(pool);
    const moment = fillMonth(template, {
      month, w, d, l, p: idx.length,
      wins: counted(w, 'win'),
      defeats: counted(l, 'defeat'),
      gf: mi === bigWinMonth ? gf[seasonBest.i] : 0,
      ga: mi === bigWinMonth ? ga[seasonBest.i] : 0,
    });
    return { month, played: idx.length, wins: w, draws: d, losses: l, goalsFor: mgf, goalsAgainst: mga, standout, moment };
  }).filter((m): m is MonthReport => m !== null);

  /* Awards. */
  const young = players
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => typeof p.age === 'number' && p.age <= 23)
    .sort((a, b) => ratings[b.i] - ratings[a.i] || (playerGoals[b.i] + playerAssists[b.i]) - (playerGoals[a.i] + playerAssists[a.i]) || a.i - b.i)[0];
  const youngPlayer = young ? { name: young.p.name, age: young.p.age as number, rating: Math.round(ratings[young.i]) } : null;

  /* Every rival's finish, with ties broken so each label names one side.
     Our own rank in this ordering is the table position the report prints. */
  const order = [{ team: -1, pts: points }, ...rivalPoints.map((pts, r) => ({ team: r, pts }))]
    .sort((a, b) => b.pts - a.pts || (a.team === -1 ? -1 : b.team === -1 ? 1 : a.team - b.team));
  const rivalRank = new Map<number, number>();
  order.forEach((o, k) => { if (o.team >= 0) rivalRank.set(o.team, k + 1); });
  const rivalLabel = (r: number) => {
    const rank = rivalRank.get(r) ?? LEAGUE_TEAMS;
    return rank === 1 ? 'the eventual champions' : `the side that finished ${ordinal(rank)}`;
  };

  let goalOfSeason: SeasonAwards['goalOfSeason'] = null;
  if (goals.length) {
    const weights = goals.map(g => {
      const r = results[g.match];
      return (r === 'W' ? 10 : r === 'D' ? 4 : 1) + (LEAGUE_TEAMS + 1 - (rivalRank.get(fixtures[g.match].rival) ?? LEAGUE_TEAMS));
    });
    const g = goals[pickWeighted(rand, weights)];
    const scorer = players[g.scorer];
    const minuteRoll = 1 + Math.floor(rand() * 94);
    const minute = minuteRoll > 90 ? `90+${minuteRoll - 90}` : `${minuteRoll}`;
    const family = GOAL_DESCRIPTIONS[goalFamily(scorer.position)] ?? GOAL_DESCRIPTIONS.midfielder;
    const desc = family[Math.floor(rand() * family.length)];
    const fx = fixtures[g.match];
    const opponent = rivalLabel(fx.rival);
    const month = MONTHS[monthOf[g.match]] ?? MONTHS[MONTHS.length - 1];
    const res = results[g.match];
    const score = `${gf[g.match]}-${ga[g.match]}`;
    const outcome = res === 'W' ? 'win' : res === 'D' ? 'draw' : 'defeat';
    const line = `Goal of the season: ${scorer.name}, ${minute}', ${fx.home ? 'at home to' : 'away at'} ${opponent} in ${month}, ${desc} in a ${score} ${outcome}.`;
    goalOfSeason = { scorer: scorer.name, opponent, minute, month, score, line };
  }

  /* What would have changed. Two alternatives replayed on the same rolls:
     each other shape with the same eleven, and the lowest rated slot lifted
     to the level of the other ten. The bigger mover is reported, as the
     sim's arithmetic and never as a certainty. A shape can only cost the
     side here, so when the shape is the mover the chosen one was right. */
  const finish = { points, tablePosition };
  const swing = (alt: { points: number; tablePosition: number }) =>
    Math.abs(alt.tablePosition - finish.tablePosition) * 1000 + Math.abs(alt.points - finish.points);
  let bestShape: { name: string; misfits: number; points: number; tablePosition: number } | null = null;
  if (FORMATIONS.some(f => f.name === formationName)) {
    for (const f of FORMATIONS) {
      if (f.name === formationName) continue;
      const alt = whatIfFinish(players, formationName, { formation: f.name, adjust });
      if (!bestShape || swing(alt) > swing(bestShape)) bestShape = { name: f.name, misfits: formationMisfits(players, f.name), ...alt };
    }
  }
  const weakest = ratings.length >= 2 ? ratings.indexOf(Math.min(...ratings)) : -1;
  const lifted = weakest >= 0 ? whatIfFinish(players, formationName, { liftWeakest: true, adjust }) : null;
  const liftedRating = weakest >= 0 ? squadRatingOf(ratings.filter((_, i) => i !== weakest)) : squadRating;
  const from = ordinal(finish.tablePosition);
  /* Said the way it moved: a change of place names both places, and a
     change of points alone says the place held, so no line ever reads
     "from 2nd to 2nd". */
  const moved = (alt: { points: number; tablePosition: number }) =>
    alt.tablePosition !== finish.tablePosition
      ? `the finish ${alt.tablePosition > finish.tablePosition ? 'drops' : 'climbs'} from ${from} to ${ordinal(alt.tablePosition)} (${alt.points} points, not ${finish.points})`
      : `the finish stays ${from} but the points go from ${finish.points} to ${alt.points}`;
  const chosenMisfits = formationMisfits(players, formationName);
  /* Both alternatives are told, then the bigger mover is named. A shape
     sentence and a slot sentence, each honest about moving nothing when it
     moved nothing, and the same close every time. */
  const shapeSentence = !bestShape
    ? ''
    : swing(bestShape) > 0
    ? `In a ${bestShape.name}, ${bestShape.misfits} of these eleven ${bestShape.misfits === 1 ? 'has' : 'have'} no natural slot${chosenMisfits > 0 ? ` (${chosenMisfits} in your ${formationName})` : ''}, and on the same rolls ${moved(bestShape)}.`
    : `Every other shape lands the same ${from} on the same rolls.`;
  const weakMan = weakest >= 0 ? players[weakest] : null;
  const slotSentence = !lifted || !weakMan
    ? ''
    : swing(lifted) > 0
    ? `A pick at the rest of the eleven's level in the ${sagaRoleFor(weakMan.position)} slot (${weakMan.name}, the lowest rating at ${Math.round(ratings[weakest])}) takes the squad to ${liftedRating}/100, and on the same rolls ${moved(lifted)}.`
    : `Lifting the ${sagaRoleFor(weakMan.position)} slot, the lowest rating in the side, to the rest of the eleven's level moves nothing.`;
  const close = 'Same dice, no promises.';
  let whatIf: WhatIf;
  if (lifted && weakMan && swing(lifted) > 0 && (!bestShape || swing(lifted) >= swing(bestShape))) {
    whatIf = {
      kind: 'respin',
      alternative: sagaRoleFor(weakMan.position),
      finishFrom: finish.tablePosition,
      finishTo: lifted.tablePosition,
      pointsFrom: finish.points,
      pointsTo: lifted.points,
      line: ['What would have changed: one slot, more than the shape.', slotSentence, shapeSentence, close].filter(Boolean).join(' '),
    };
  } else if (bestShape && swing(bestShape) > 0) {
    whatIf = {
      kind: 'formation',
      alternative: bestShape.name,
      finishFrom: finish.tablePosition,
      finishTo: bestShape.tablePosition,
      pointsFrom: finish.points,
      pointsTo: bestShape.points,
      line: ['What would have changed: the shape, more than any one slot.', shapeSentence, slotSentence, chosenMisfits === 0 ? `Your ${formationName} was the right call for this group.` : '', close].filter(Boolean).join(' '),
    };
  } else {
    whatIf = {
      kind: 'none',
      alternative: '',
      finishFrom: finish.tablePosition,
      finishTo: finish.tablePosition,
      pointsFrom: finish.points,
      pointsTo: finish.points,
      line: ['What would have changed: nothing the sim can find.', shapeSentence, slotSentence, close].filter(Boolean).join(' '),
    };
  }

  return {
    goalsFor,
    goalsAgainst,
    cleanSheets,
    assists,
    months,
    playerStats,
    awards: { youngPlayer, goalOfSeason },
    whatIf,
  };
}

/**
 * Deterministic season sim seeded by the finished XI. Squad rating comes from
 * average player market value mapped through the same log curve as
 * squadDeal.ts's playerRating, so a Legends-tier draw reads as an elite squad
 * and a bargain-bin draw reads as relegation fodder.
 *
 * Round 825: Build Your XI hands in `fit`, its role fit, chemistry and
 * balance (src/lib/xiFit.ts), in squad rating points. They move the rating
 * the league is played at and nothing else: every draw happens in the same
 * order, the printed squad rating stays the paper one, and World XI, which
 * passes nothing, plays exactly the season it always did (simBuildYourXiFit
 * holds a digest of it).
 */
export function simulateWorldXiSeason(filled: WxPlayer[], formationName: string, fit?: XiFitAdjust): SeasonReport {
  const players = filled.filter((p): p is WxPlayer => p !== null);
  const seed = squadSeed(players);
  const rand = rng(seed);

  // Squad rating: the shared age-aware card rating curve from
  // squadDeal.playerRating, averaged across the XI, so ratings here read the
  // same as everywhere else on the site (owner 2026-08-05).
  const playerRatings = ratingsFor(players);
  const squadRating = squadRatingOf(playerRatings);

  const adjust = fit ? fit.roleFit + fit.chemistry + fit.balance : 0;
  const overall = ratingToOverall(squadRating + adjust);
  const winP = winProbability(overall);
  const league = playLeague(rand, winP);
  const { points, wins, draws, losses, unbeatenRun, rivalPoints, tablePosition } = league;

  /* Round 825: what each of the three was worth, the same rolls replayed
     without it. A fresh generator on the same seed gives the same 38 rolls
     and the same rivals, so only that one number differs. */
  let seasonFit: SeasonFit | undefined;
  if (fit) {
    const replay = (adj: number) => playLeague(rng(seed), winProbability(ratingToOverall(squadRating + adj))).points;
    const worth: XiFitAdjust = {
      roleFit: points - replay(adjust - fit.roleFit),
      chemistry: points - replay(adjust - fit.chemistry),
      balance: points - replay(adjust - fit.balance),
    };
    /* One season, said as one season. On the same rolls the sign is always
       right, but the size is lumpy: measured in review over 120 elevens, a
       chemistry edge worth about half a point a season on average comes out
       at 0 in most single seasons, so the line never claims more than this
       season. */
    const said = (label: string, pts: number) =>
      pts === 0 ? `${label} made no difference` : pts > 0 ? `${label} added ${pts} point${pts === 1 ? '' : 's'}` : `${label} cost ${-pts} point${pts === -1 ? '' : 's'}`;
    seasonFit = {
      roleFit: fit.roleFit,
      chemistry: fit.chemistry,
      balance: fit.balance,
      matchRating: (Math.round((squadRating + adjust) * 10) / 10) || 0,
      points: worth,
      line: `This season, played again without each one: ${said('role fit', worth.roleFit)}, ${said('chemistry', worth.chemistry)}, ${said('balance', worth.balance)}.`,
    };
  }

  // Trophies: rating threshold plus a little rng, layered so an elite squad
  // can still miss out on the treble and a mid squad can still nick a cup.
  const trophies: string[] = [];
  if (tablePosition === 1) trophies.push('League Title');
  if (squadRating >= 60 && rand() < (squadRating - 40) / 100) trophies.push('Domestic Cup');
  if (squadRating >= 72 && tablePosition <= 4 && rand() < (squadRating - 55) / 100) trophies.push('Champions League');
  if (trophies.length === 3) trophies.unshift('THE TREBLE');

  // Top scorer: weighted pick from the chosen forwards/attackers by value,
  // with a plausible goal tally scaled to squad quality.
  const forwardLike = players.filter(p => ['ST', 'CF', 'LW', 'RW', 'CAM'].includes(p.position));
  const scorerPool = forwardLike.length ? forwardLike : players;
  const totalValue = scorerPool.reduce((s, p) => s + Math.max(1, p.value), 0);
  let pick = rand() * totalValue;
  let topScorerPlayer = scorerPool[0] ?? null;
  for (const p of scorerPool) {
    pick -= Math.max(1, p.value);
    if (pick <= 0) { topScorerPlayer = p; break; }
  }
  const goals = topScorerPlayer
    ? Math.round(8 + (squadRating / 100) * 22 + rand() * 10)
    : 0;
  const topScorer = topScorerPlayer ? { name: topScorerPlayer.name, goals } : null;

  // Injuries: 1-2 random squad members, plausible weeks-out range.
  const injuryCount = 1 + (rand() < 0.5 ? 1 : 0);
  /* Round 442: drawn from the SEEDED generator, not Math.random. This sim
     promises the same season for the same XI, which is the whole point of
     seeding it off the squad, and the injury draw was quietly breaking that
     promise: two people with the identical eleven got different men injured,
     and a player who screenshotted his report could not reproduce it himself.
     Everything else in here already ran off rand(). Build Your XI shows this
     report too now, so the promise had to be true in both games. */
  const shuffledForInjury = [...players];
  for (let i = shuffledForInjury.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [shuffledForInjury[i], shuffledForInjury[j]] = [shuffledForInjury[j], shuffledForInjury[i]];
  }
  const injuries: SeasonInjury[] = shuffledForInjury.slice(0, Math.min(injuryCount, players.length)).map(p => ({
    name: p.name,
    weeksOut: 2 + Math.floor(rand() * 10),
  }));

  // Transfer saga headline about a random squad member's ROLE, never his
  // name (Round 449). Both draws stay in this order so every seed's season
  // reads the same as before the change.
  const sagaPlayer = players[Math.floor(rand() * players.length)];
  const template = TRANSFER_SAGA_TEMPLATES[Math.floor(rand() * TRANSFER_SAGA_TEMPLATES.length)];
  const transferHeadline = sagaPlayer ? template.replace('{role}', sagaRoleFor(sagaPlayer.position)) : 'A quiet transfer window, for once.';

  /* Round 726: every draw below this line comes after every draw above it,
     so nothing the report already printed can move. */
  const extras = buildSeasonExtras(rand, players, playerRatings, league, topScorer, injuries, formationName, squadRating, adjust);

  const positionLine = tablePosition === 1
    ? `${formationName} title winners. Champions of the league.`
    : tablePosition <= 4
    ? `A top-four finish in the ${formationName}, European football locked in.`
    : tablePosition <= 10
    ? `A comfortable mid-table season in the ${formationName}.`
    : tablePosition <= 17
    ? `A scrappy lower-table finish in the ${formationName}. Safety first.`
    : `A relegation battle all year in the ${formationName}. Backs against the wall.`;

  const narrative: string[] = [
    positionLine,
    `Finished ${ordinal(tablePosition)} with ${points} points (${wins}W ${draws}D ${losses}L).`,
  ];
  /* Round 455, his "more in the season report". Everything below is read off
     numbers the sim already produced, so no new draw and no changed season. */
  const bestRival = rivalPoints.length ? Math.max(...rivalPoints) : 0;
  const gapToTop = tablePosition === 1 ? 0 : Math.max(0, bestRival - points);
  const marginAsChampion = tablePosition === 1 ? Math.max(0, points - bestRival) : 0;
  let playerOfSeason: SeasonReport['playerOfSeason'] = null;
  playerRatings.forEach((r, i) => {
    if (!playerOfSeason || r > playerOfSeason.rating) playerOfSeason = { name: players[i].name, rating: Math.round(r) };
  });

  if (tablePosition === 1) {
    narrative.push(marginAsChampion > 0 ? `Won it by ${marginAsChampion} point${marginAsChampion === 1 ? '' : 's'}.` : 'Level on points at the top, and it went your way.');
  } else {
    narrative.push(`${gapToTop} point${gapToTop === 1 ? '' : 's'} off the top.`);
  }
  narrative.push(`Longest unbeaten run: ${unbeatenRun} game${unbeatenRun === 1 ? '' : 's'}.`);
  narrative.push(`Scored ${extras.goalsFor}, conceded ${extras.goalsAgainst}, ${extras.cleanSheets} clean sheet${extras.cleanSheets === 1 ? '' : 's'}.`);
  if (topScorer) narrative.push(`${topScorer.name} top-scored with ${topScorer.goals} goals.`);
  if (playerOfSeason) narrative.push(`Player of the season: ${playerOfSeason.name} (rating ${playerOfSeason.rating}).`);
  if (extras.awards.youngPlayer) narrative.push(`Young player of the season: ${extras.awards.youngPlayer.name} (${extras.awards.youngPlayer.age} on our list, rating ${extras.awards.youngPlayer.rating}).`);
  if (extras.awards.goalOfSeason) narrative.push(extras.awards.goalOfSeason.line);
  if (trophies.length) narrative.push(`Silverware: ${trophies.join(', ')}.`);
  else narrative.push('No silverware this year. There is always next season.');
  for (const inj of injuries) narrative.push(`Injury: ${inj.name} out for ${inj.weeksOut} weeks.`);
  narrative.push(transferHeadline);
  if (seasonFit) narrative.push(seasonFit.line);
  narrative.push(extras.whatIf.line);

  return {
    squadRating,
    tablePosition,
    points,
    topScorer,
    trophies,
    injuries,
    transferHeadline,
    narrative,
    record: { wins, draws, losses },
    unbeatenRun,
    gapToTop,
    marginAsChampion,
    playerOfSeason,
    goalsFor: extras.goalsFor,
    goalsAgainst: extras.goalsAgainst,
    cleanSheets: extras.cleanSheets,
    assists: extras.assists,
    months: extras.months,
    playerStats: extras.playerStats,
    awards: extras.awards,
    whatIf: extras.whatIf,
    ...(seasonFit ? { fit: seasonFit } : {}),
  };
}

/** "1st", "2nd", "3rd", "4th"... for table positions and similar display. */
export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
