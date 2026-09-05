import { supabase } from '@/integrations/supabase/client';
import { Position } from '@/types/game';
import { Formation, FormationSlot, normalizePosition, playerRating } from '@/lib/squadDeal';
import { normalizeName } from '@/lib/whoAmI';
import { rng, winProbability } from '@/lib/perfectSeason';
import { ALL_POSITIONS, allowedLabelFor, eligiblePositions, fitsAllowed, slotAllowedPositions } from '@/lib/positionFit';

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

    // Dedupe by name keeping the newest year; higher value breaks ties.
    const byName = new Map<string, { player: WxPlayer; year: number }>();
    for (const r of rows) {
      const name = (r.player_name ?? '').trim();
      const country = primaryCountry(r.nationality ?? '');
      const position = normalizePosition((r.position ?? '').trim());
      const value = Number(r.market_value_usd) || 0;
      const year = Number(r.year) || 0;
      if (!name || !country || !position || value <= 0) continue;
      const prev = byName.get(name);
      if (!prev || year > prev.year || (year === prev.year && value > prev.player.value)) {
        /* Identity guard: the curated history belongs to the human whose
           primary role the curators recorded, so a same-named player in a
           different role gets nothing. The goalkeeper boundary stands behind
           it: even a matched history never lets a keeper earn an outfield
           slot or an outfielder earn goal. */
        const playedRaw = playedByName.get(name);
        const played = playedRaw && playedRaw.primary === position
          ? playedRaw.secs.filter(p => (position === 'GK') === (p === 'GK'))
          : undefined;
        byName.set(name, {
          player: {
            name,
            country,
            position,
            club: (r.club ?? '').trim(),
            value,
            age: Number((r as { age?: number | null }).age) || undefined,
            ...(played && played.some(p => p !== position) ? { positionsPlayed: played } : {}),
          },
          year,
        });
      }
    }

    const players = [...byName.values()].map(e => e.player);
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

export interface SeasonInjury {
  name: string;
  weeksOut: number;
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

const TRANSFER_SAGA_TEMPLATES = [
  '{name} handed in a transfer request after a bust-up with the board.',
  'Reports linked {name} with a shock exit all winter, but the move fell through on deadline day.',
  'A release clause row over {name} rumbled on for months before a new deal was signed.',
  '{name} rejected a club-record bid, insisting the trophy hunt was not finished.',
  'Agents for {name} leaked interest from three leagues to force a bumper new contract.',
  'A medical was booked, then cancelled, then booked again in the {name} saga that dominated deadline day.',
];

/**
 * Deterministic season sim seeded by the finished XI. Squad rating comes from
 * average player market value mapped through the same log curve as
 * squadDeal.ts's playerRating, so a Legends-tier draw reads as an elite squad
 * and a bargain-bin draw reads as relegation fodder.
 */
export function simulateWorldXiSeason(filled: WxPlayer[], formationName: string): SeasonReport {
  const players = filled.filter((p): p is WxPlayer => p !== null);
  const seed = squadSeed(players);
  const rand = rng(seed);

  // Squad rating: the shared age-aware card rating curve from
  // squadDeal.playerRating, averaged across the XI, so ratings here read the
  // same as everywhere else on the site (owner 2026-08-05).
  const playerRatings = players.map(p =>
    playerRating({ marketValue: Math.max(1, p.value / 1_000_000), age: p.age ?? 27 } as Parameters<typeof playerRating>[0]),
  );
  const avgRating = playerRatings.length
    ? playerRatings.reduce((a, b) => a + b, 0) / playerRatings.length
    : 50;
  const squadRating = Math.max(1, Math.min(100, Math.round(avgRating)));

  const overall = ratingToOverall(squadRating);
  const winP = winProbability(overall);
  const drawShare = 0.26;
  const drawP = (1 - winP) * drawShare;

  let points = 0;
  let wins = 0;
  let draws = 0;
  let losses = 0;
  for (let i = 0; i < LEAGUE_MATCHES; i++) {
    const roll = rand();
    if (roll < winP) { points += 3; wins++; }
    else if (roll < winP + drawP) { points += 1; draws++; }
    else { losses++; }
  }

  // Table position: rank this points total against 19 simulated rivals whose
  // strength is spread around the same league so the position feels earned
  // rather than a flat lookup table.
  const rivalPoints: number[] = [];
  for (let i = 0; i < LEAGUE_TEAMS - 1; i++) {
    const rivalOverall = 55 + rand() * 40; // spread of a plausible league
    const rp = winProbability(rivalOverall);
    const rdp = (1 - rp) * drawShare;
    let rpts = 0;
    for (let m = 0; m < LEAGUE_MATCHES; m++) {
      const roll = rand();
      if (roll < rp) rpts += 3;
      else if (roll < rp + rdp) rpts += 1;
    }
    rivalPoints.push(rpts);
  }
  const tablePosition = Math.min(LEAGUE_TEAMS, 1 + rivalPoints.filter(p => p > points).length);

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

  // Transfer saga headline, starring a random squad member.
  const sagaPlayer = players[Math.floor(rand() * players.length)];
  const template = TRANSFER_SAGA_TEMPLATES[Math.floor(rand() * TRANSFER_SAGA_TEMPLATES.length)];
  const transferHeadline = sagaPlayer ? template.replace('{name}', sagaPlayer.name) : 'A quiet transfer window, for once.';

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
  if (topScorer) narrative.push(`${topScorer.name} top-scored with ${topScorer.goals} goals.`);
  if (trophies.length) narrative.push(`Silverware: ${trophies.join(', ')}.`);
  else narrative.push('No silverware this year. There is always next season.');
  for (const inj of injuries) narrative.push(`Injury: ${inj.name} out for ${inj.weeksOut} weeks.`);
  narrative.push(transferHeadline);

  return {
    squadRating,
    tablePosition,
    points,
    topScorer,
    trophies,
    injuries,
    transferHeadline,
    narrative,
  };
}

/** "1st", "2nd", "3rd", "4th"... for table positions and similar display. */
export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
