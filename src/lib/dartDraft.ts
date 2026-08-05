import { supabase } from '@/integrations/supabase/client';
import { Player, Position } from '@/types/game';
import { getEnrichment } from '@/data/footleEnrichment';
import { FORMATIONS, LEGENDS, normalizePosition, playerRating, type Formation, type FormationSlot } from '@/lib/squadDeal';

/**
 * DART DRAFT — the YouTuber "throw a dart, live with the consequences" format
 * (owner brief 2026-07-10: timed dart throw; wherever it lands you must take a
 * player from there; Sidemen/MMG-style board of fate).
 *
 * Board: 12 wedges (leagues / nations / LEGENDS / World). Real darts ring
 * logic: TRIPLE ring is the jackpot band (best pull), double is strong, thin
 * bull is a top-3 superstar pull, and missing the board entirely hands you the
 * worst player the wedge owns. Aim is a two-phase timing skill (lock X, lock
 * Y with oscillating crosshairs that speed up every round).
 */

/* ---------------- Wedges ---------------- */
export type WedgeKind = 'league' | 'nation' | 'legends' | 'world';

export interface Wedge {
  id: string;
  label: string;      // full label for the result card
  short: string;      // short label painted on the board
  kind: WedgeKind;
  match?: string;     // league name or nationality to filter on
  color: string;      // wedge fill
  darkColor: string;  // alternating segment shade
}

// 12 wedges, index 0 centered at 12 o'clock, clockwise. LEGENDS sits at the
// top flanked by the two thinnest pools so greed is punishable, exactly like
// aiming for treble 20 between 1 and 5.
export const WEDGES: Wedge[] = [
  { id: 'legends',  label: 'All-Time Legends',    short: 'LEGENDS', kind: 'legends', color: 'hsl(45 90% 45%)',  darkColor: 'hsl(45 85% 32%)' },
  { id: 'world',    label: 'Rest of the World',   short: 'WORLD',   kind: 'world',   color: 'hsl(200 15% 30%)', darkColor: 'hsl(200 15% 20%)' },
  { id: 'seriea',   label: 'Serie A',             short: 'SERIE A', kind: 'league', match: 'Serie A',            color: 'hsl(210 70% 38%)', darkColor: 'hsl(210 70% 26%)' },
  { id: 'england',  label: 'England',             short: 'ENG',     kind: 'nation', match: 'England',            color: 'hsl(0 60% 40%)',   darkColor: 'hsl(0 60% 28%)' },
  { id: 'ligue1',   label: 'Ligue 1',             short: 'LIGUE 1', kind: 'league', match: 'Ligue 1',            color: 'hsl(250 55% 42%)', darkColor: 'hsl(250 55% 30%)' },
  { id: 'brazil',   label: 'Brazil',              short: 'BRA',     kind: 'nation', match: 'Brazil',             color: 'hsl(60 70% 35%)',  darkColor: 'hsl(60 70% 24%)' },
  { id: 'bundes',   label: 'Bundesliga',          short: 'BUND',    kind: 'league', match: 'Bundesliga',         color: 'hsl(0 0% 25%)',    darkColor: 'hsl(0 0% 16%)' },
  { id: 'argentina',label: 'Argentina',           short: 'ARG',     kind: 'nation', match: 'Argentina',          color: 'hsl(197 60% 42%)', darkColor: 'hsl(197 60% 30%)' },
  { id: 'laliga',   label: 'La Liga',             short: 'LA LIGA', kind: 'league', match: 'La Liga',            color: 'hsl(15 75% 42%)',  darkColor: 'hsl(15 75% 30%)' },
  { id: 'france',   label: 'France',              short: 'FRA',     kind: 'nation', match: 'France',             color: 'hsl(230 55% 40%)', darkColor: 'hsl(230 55% 28%)' },
  { id: 'premier',  label: 'Premier League',      short: 'PREM',    kind: 'league', match: 'Premier League',     color: 'hsl(300 45% 35%)', darkColor: 'hsl(300 45% 24%)' },
  { id: 'spain',    label: 'Spain',               short: 'ESP',     kind: 'nation', match: 'Spain',              color: 'hsl(30 80% 40%)',  darkColor: 'hsl(30 80% 28%)' },
];

/* ---------------- Rings (fractions of board radius) ---------------- */
export type Ring = 'JACKPOT' | 'T1' | 'T2' | 'T3' | 'T4' | 'MISS';

export const RING_BANDS: { ring: Ring; rOuter: number }[] = [
  { ring: 'JACKPOT', rOuter: 0.07 }, // bullseye, top-3 superstar of the wedge
  { ring: 'T2',      rOuter: 0.15 }, // outer bull
  { ring: 'T3',      rOuter: 0.42 }, // inner single
  { ring: 'T1',      rOuter: 0.52 }, // TRIPLE ring, the band sharpshooters hunt
  { ring: 'T4',      rOuter: 0.72 }, // outer single
  { ring: 'T2',      rOuter: 0.82 }, // double ring
  // Owner bug (2026-07-10): players aim at the wedge LABELS painted outside
  // the double ring, which used to score as MISS -> worst player ("it didn't
  // give me an accurate player"). The label ring now counts as the wedge's
  // outer single; a true MISS is only beyond the gold rim.
  { ring: 'T4',      rOuter: 0.97 }, // label ring, still the wedge you aimed at
];
export const BOARD_EDGE = 0.82; // double-ring edge (visual); MISS starts past 0.97

export const RING_LABEL: Record<Ring, string> = {
  JACKPOT: 'BULLSEYE! Superstar pull',
  T1: 'Triple ring — elite pull',
  T2: 'Double ring — strong pull',
  T3: 'Inner single — solid pull',
  T4: 'Outer single — squad player',
  MISS: 'Off the board — the wedge shows no mercy',
};

export const RING_POINTS: Record<Ring, number> = {
  JACKPOT: 60, T1: 40, T2: 25, T3: 15, T4: 8, MISS: 2,
};

/** Map a hit point (x, y in [-1, 1] board space, r=1 is board radius) to wedge + ring. */
export function resolveHit(x: number, y: number): { wedgeIndex: number; ring: Ring } {
  const r = Math.sqrt(x * x + y * y);
  const angle = (Math.atan2(y, x) * 180) / Math.PI; // -180..180, 0 = +x axis
  // wedge 0 centered at -90° (12 o'clock), 30° per wedge, clockwise
  const fromTop = (angle + 90 + 15 + 720) % 360;
  const wedgeIndex = Math.floor(fromTop / 30) % 12;
  let ring: Ring = 'MISS';
  for (const band of RING_BANDS) {
    if (r <= band.rOuter) { ring = band.ring; break; }
  }
  return { wedgeIndex, ring };
}

/* ---------------- Player pool ---------------- */
interface MarketRow {
  player_name: string;
  position: string | null;
  age: number;
  nationality: string;
  club: string;
  market_value_usd: number;
  goals: number | null;
  assists: number | null;
}

/** Top-450 current players by 2026 market value + the all-time LEGENDS pool. */
export async function fetchDartDraftPool(): Promise<{ current: Player[]; legends: Player[] }> {
  try {
    const { data, error } = await supabase
      .from('player_market_values')
      .select('player_name, position, age, nationality, club, market_value_usd, goals, assists')
      .eq('year', 2026)
      .not('age', 'is', null)
      .order('market_value_usd', { ascending: false })
      .order('player_name', { ascending: true })
      .limit(600);
    if (error || !data || data.length === 0) return { current: [], legends: LEGENDS };

    const seen = new Set<string>();
    const current: Player[] = [];
    for (const row of data as MarketRow[]) {
      const position = normalizePosition(row.position ?? '');
      if (!position) continue;
      const key = row.player_name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const enrichment = getEnrichment(row.player_name, row.club);
      current.push({
        name: row.player_name,
        club: row.club,
        nationality: row.nationality,
        league: enrichment.league,
        goals: row.goals ?? 0,
        assists: row.assists ?? 0,
        position,
        kitNumber: enrichment.kitNumber,
        age: row.age,
        marketValue: Math.round(row.market_value_usd / 1_000_000),
        difficulty: 'easy',
      });
    }
    return { current, legends: LEGENDS };
  } catch {
    return { current: [], legends: LEGENDS };
  }
}

/* ---------------- Wedge pool + tier picks ---------------- */
function wedgeFilter(current: Player[], legends: Player[], wedge: Wedge): Player[] {
  switch (wedge.kind) {
    case 'legends': return legends;
    case 'world':   return current;
    case 'league':  return current.filter(p => p.league === wedge.match);
    case 'nation':  return current.filter(p => p.nationality === wedge.match);
  }
}

export interface ThrowResult {
  wedge: Wedge;
  ring: Ring;
  player: Player | null;
  points: number;
  usedWorldFallback: boolean;
}

/**
 * The board's verdict: filter the wedge pool to players who can play the slot,
 * then slice by ring tier. Sorted by market value desc; JACKPOT = random of
 * top 3, T1 = top 12%, T2 = to 35%, T3 = to 70%, T4 = the rest, MISS = the
 * single worst player available. Falls back to the World pool when a wedge
 * has nobody for the position (a dart in ARG hunting a GK can still eat).
 */
export function drawFromBoard(
  current: Player[],
  legends: Player[],
  wedge: Wedge,
  ring: Ring,
  slot: FormationSlot,
  usedNames: Set<string>,
): ThrowResult {
  const fits = (p: Player) => slot.allowed.includes(p.position) && !usedNames.has(p.name);
  let pool = wedgeFilter(current, legends, wedge).filter(fits);
  let usedWorldFallback = false;
  if (pool.length === 0) {
    pool = current.filter(fits);
    usedWorldFallback = true;
    if (pool.length === 0) return { wedge, ring, player: null, points: 0, usedWorldFallback };
  }
  const sorted = [...pool].sort((a, b) => b.marketValue - a.marketValue);
  const n = sorted.length;
  const slice = (fromFrac: number, toFrac: number): Player[] => {
    const from = Math.floor(n * fromFrac);
    const to = Math.max(from + 1, Math.ceil(n * toFrac));
    return sorted.slice(from, Math.min(to, n));
  };
  let candidates: Player[];
  switch (ring) {
    case 'JACKPOT': candidates = sorted.slice(0, Math.min(3, n)); break;
    case 'T1':      candidates = slice(0, 0.12); break;
    case 'T2':      candidates = slice(0.12, 0.35); break;
    case 'T3':      candidates = slice(0.35, 0.7); break;
    case 'T4':      candidates = slice(0.7, 1); break;
    case 'MISS':    candidates = [sorted[n - 1]]; break;
  }
  const player = candidates[Math.floor(Math.random() * candidates.length)] ?? null;
  return { wedge, ring, player, points: RING_POINTS[ring], usedWorldFallback };
}

/* ---------------- The Machine's squad (opponent) ---------------- */
const MACHINE_RINGS: Ring[] = ['T1', 'T2', 'T2', 'T3', 'T3', 'T3', 'T4', 'T4'];

export function machineDraft(current: Player[], legends: Player[], formation: Formation): (Player | null)[] {
  const used = new Set<string>();
  return formation.slots.map(slot => {
    const wedge = WEDGES[Math.floor(Math.random() * WEDGES.length)];
    const ring = MACHINE_RINGS[Math.floor(Math.random() * MACHINE_RINGS.length)];
    const res = drawFromBoard(current, legends, wedge, ring, slot, used);
    if (res.player) used.add(res.player.name);
    return res.player;
  });
}

/* ---------------- Squad rating + chemistry ---------------- */
export function squadRating(players: (Player | null)[]): number {
  const real = players.filter((p): p is Player => p !== null);
  if (real.length === 0) return 0;
  const avg = real.reduce((s, p) => s + playerRating(p), 0) / real.length;
  // chemistry: reward league/nation clusters (max +4)
  const count = (key: (p: Player) => string) => {
    const m = new Map<string, number>();
    real.forEach(p => m.set(key(p), (m.get(key(p)) ?? 0) + 1));
    return Math.max(...m.values());
  };
  const chem = Math.min(4, Math.max(0, count(p => p.league) - 3) + Math.max(0, count(p => p.nationality) - 3));
  return Math.min(99, Math.round(avg + chem));
}

export function squadGrade(rating: number): { grade: string; line: string } {
  if (rating >= 85) return { grade: 'S', line: 'A once-in-a-generation XI. The board bowed to you.' };
  if (rating >= 78) return { grade: 'A', line: 'Title contenders. Sharp darts, sharp squad.' };
  if (rating >= 70) return { grade: 'B', line: 'Solid European nights ahead.' };
  if (rating >= 62) return { grade: 'C', line: 'Mid-table with dreams.' };
  if (rating >= 54) return { grade: 'D', line: 'Relegation six-pointers all spring.' };
  return { grade: 'F', line: 'The board was cruel. Or the aim was.' };
}

/* ---------------- Showdown sim (fully local, no AI needed) ---------------- */
export interface MatchEvent { minute: number; text: string; side: 'user' | 'ai' | 'neutral' }
export interface LegResult { userGoals: number; aiGoals: number; events: MatchEvent[] }
export interface SeriesResult {
  legs: LegResult[];
  userWins: number;
  aiWins: number;
  draws: number;
  outcome: 'win' | 'loss' | 'draw';
  headline: string;
}

function attackers(players: (Player | null)[]): Player[] {
  const real = players.filter((p): p is Player => p !== null);
  const atk = real.filter(p => ['ST', 'CF', 'LW', 'RW', 'CAM'].includes(p.position));
  return atk.length > 0 ? atk : real;
}
function keeper(players: (Player | null)[]): Player | null {
  return players.find(p => p?.position === 'GK') ?? null;
}

const GOAL_LINES = [
  (s: string) => `${s} buries it, top corner, no chance!`,
  (s: string) => `${s} with a poacher's finish!`,
  (s: string) => `${s} curls one in from the edge of the box!`,
  (s: string) => `${s} rises highest and heads it home!`,
  (s: string) => `${s} finishes a lightning counter!`,
];
const SAVE_LINES = [
  (g: string, s: string) => `${g} denies ${s} from point-blank range!`,
  (g: string, s: string) => `${s} is through... but ${g} spreads himself and saves!`,
];

function poissonish(expected: number): number {
  let g = 0;
  for (let i = 0; i < 5; i++) if (Math.random() < expected / 5) g++;
  return g;
}

export function simulateSeries(user: (Player | null)[], ai: (Player | null)[]): SeriesResult {
  const ru = squadRating(user);
  const ra = squadRating(ai);
  const diff = ru - ra;
  const legs: LegResult[] = [];
  let userWins = 0, aiWins = 0, draws = 0;

  for (let leg = 0; leg < 3; leg++) {
    const expU = Math.max(0.3, 1.35 + diff / 16);
    const expA = Math.max(0.3, 1.35 - diff / 16);
    const ug = poissonish(expU);
    const ag = poissonish(expA);
    const events: MatchEvent[] = [];
    const minutes = new Set<number>();
    const uniqueMinute = () => {
      let m = 4 + Math.floor(Math.random() * 88);
      while (minutes.has(m)) m = 4 + Math.floor(Math.random() * 88);
      minutes.add(m);
      return m;
    };
    for (let i = 0; i < ug; i++) {
      const scorer = attackers(user)[Math.floor(Math.random() * attackers(user).length)];
      events.push({ minute: uniqueMinute(), text: GOAL_LINES[Math.floor(Math.random() * GOAL_LINES.length)](scorer.name), side: 'user' });
    }
    for (let i = 0; i < ag; i++) {
      const scorer = attackers(ai)[Math.floor(Math.random() * attackers(ai).length)];
      events.push({ minute: uniqueMinute(), text: GOAL_LINES[Math.floor(Math.random() * GOAL_LINES.length)](scorer.name), side: 'ai' });
    }
    const gk = keeper(user);
    const aiStar = attackers(ai)[0];
    if (gk && aiStar && Math.random() < 0.7) {
      events.push({ minute: uniqueMinute(), text: SAVE_LINES[Math.floor(Math.random() * SAVE_LINES.length)](gk.name, aiStar.name), side: 'neutral' });
    }
    events.sort((a, b) => a.minute - b.minute);
    legs.push({ userGoals: ug, aiGoals: ag, events });
    if (ug > ag) userWins++; else if (ag > ug) aiWins++; else draws++;
  }

  const outcome: SeriesResult['outcome'] = userWins > aiWins ? 'win' : aiWins > userWins ? 'loss' : 'draw';
  const headline =
    outcome === 'win'
      ? `Your darts built a champion, series won ${userWins}-${aiWins}!`
      : outcome === 'loss'
        ? `The Machine takes the series ${aiWins}-${userWins}. The board giveth...`
        : `Dead level after three legs. Split the trophy down the middle.`;
  return { legs, userWins, aiWins, draws, outcome, headline };
}

/* ---------------- Scoring ---------------- */
export function finalScore(throwPoints: number, rating: number, outcome: SeriesResult['outcome']): number {
  const simBonus = outcome === 'win' ? 120 : outcome === 'draw' ? 60 : 0;
  return throwPoints + rating + simBonus;
}

export { FORMATIONS };
export type { Formation, FormationSlot };
