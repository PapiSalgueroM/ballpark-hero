/* Round 1035: the one place Club Manager's modern squads are joined.
 *
 * src/data/clubManagerRosters.ts is baked from the value table
 * (scripts/bakeClubManagerRosters.mjs); src/data/clubManagerALeague2026.ts is
 * generated offline from the A-League Men ledgers
 * (scripts/genClubManagerALeague.mjs). Both engine files that read the modern
 * world (src/lib/clubManager.ts and src/lib/clubManagerEras.ts) import the
 * joined maps from here, so a club is never in one and missing from the other.
 *
 * The A-League ledgers are the newer read: a man the generator proved is the
 * same person as a baked row elsewhere (CM_ALEAGUE_SUPERSEDES) is dropped
 * from that baked club, so nobody is in two squads at once.
 *
 * Round 1052: the gathered leagues join here too, one generated file a
 * league (scripts/genClubManagerGathered.mjs, the table in
 * scripts/lib/gatheredLeagues.mjs), each after the A-League's and in the
 * order it was added. Existing keys keep their place in the object and the
 * new clubs come after them, so walking the old world is untouched. Their
 * supersedes tables are empty on purpose (that round moved nobody out of an
 * existing squad), so the loop below still reads the A-League's alone.
 * CM_GENERATED_LEAGUES is what each generated file says about itself, in
 * join order: the picker's date line and the count under it print from it,
 * so the next gathered league needs no page edit. */
import { CM_ROSTERS as CM_ROSTERS_BAKED, CM_PARTIAL as CM_PARTIAL_BAKED, CM_ROSTER_META } from '@/data/clubManagerRosters';
import type { BakedPlayer } from '@/data/clubManagerRosters';
import { CM_ALEAGUE_ROSTERS, CM_ALEAGUE_PARTIAL, CM_ALEAGUE_SUPERSEDES, CM_ALEAGUE_META } from '@/data/clubManagerALeague2026';
import { CM_RUSSIA_ROSTERS, CM_RUSSIA_PARTIAL, CM_RUSSIA_META } from '@/data/clubManagerRussia2026';
import { CM_AGE_CURVE, ageRead } from '@/lib/cmAgeRead';

/* Round 1600: the age read (Round 1214, src/lib/cmAgeRead.ts) is applied HERE, at load, once, for every modern
   file that says it wants it: a META with `curve: 2`. Such a file holds what every bake writes in `r`, the man's
   value rating, which is his LEVEL, and in `a` his age on 1 August. The engine shows the read of the two (the
   level plus points for his age, held to 48 and 94) and keeps the level beside it as `lv`, where the two differ,
   for every read of what a CLUB is (levelOf in src/lib/clubManagerEras.ts). The past seasons are read the same
   way at load in eraRosters, so every world has one order: the file holds the price, the load adds the age.
   A file with no stamp (every file shipped before this round) is curve 1: handed back as it is, the same
   objects, so nothing that reads it can move. */
export function fileCurve(meta: object): number {
  const curve = (meta as { curve?: unknown }).curve;
  return curve === undefined ? 1 : Number(curve);
}

export function readWithAge(rosters: Record<string, BakedPlayer[]>, curve: number): Record<string, BakedPlayer[]> {
  if (curve !== CM_AGE_CURVE) return rosters;
  const out: Record<string, BakedPlayer[]> = {};
  for (const [club, list] of Object.entries(rosters)) {
    out[club] = list.map(b => {
      const r = ageRead(b.r, b.a);
      return r === b.r ? b : { ...b, r, lv: b.r };
    });
  }
  return out;
}

/* Round 1600: `read` false joins the files as they are, with no age read: the curve 1 view below. */
function joinWorld(baked: Record<string, BakedPlayer[]> = CM_ROSTERS_BAKED, read = true): Record<string, BakedPlayer[]> {
  const curve = (meta: object) => (read ? fileCurve(meta) : 1);
  const out: Record<string, BakedPlayer[]> = { ...readWithAge(baked, curve(CM_ROSTER_META)) };
  for (const [name, club] of Object.entries(CM_ALEAGUE_SUPERSEDES)) {
    const list = out[club];
    if (list) out[club] = list.filter(p => p.n !== name);
  }
  return { ...out, ...readWithAge(CM_ALEAGUE_ROSTERS, curve(CM_ALEAGUE_META)),
    ...readWithAge(CM_RUSSIA_ROSTERS, curve(CM_RUSSIA_META)) };
}

export const CM_WORLD_ROSTERS: Record<string, BakedPlayer[]> = joinWorld();

/* ---------- Round 1600: the curve 1 view, for the two dailies (Proposal 2) ----------
   Manager Hot Seat and Deadline Day deal from this world, and a daily must never re-deal a day people already
   played. So a day dealt before the date the age read reaches the dailies (CM_DAILY_NEW_NUMBERS_FROM in
   src/lib/managerHotSeat.ts) is dealt on the world as it stood before it: no age read, and each man of the main
   squads file at the age that file held (src/data/clubManagerCurve1View.ts, written by
   scripts/genCmCurve1View.mjs). ONE holder of the modern world, this module: both engine files read it through
   cmWorld(), and every cache the engine keys on the world carries cmWorldTag() in its key, so the two worlds
   keep two sets and a daily opened first can never leave its numbers in Club Manager, or the other way round.
   While the view and the live world are the same (no file stamped, no age moved: every file before the flip),
   onCurve1View runs the call as it is and nothing is swapped. */
export interface Curve1View {
  /** The commit whose main squads file the view holds. */
  from: string;
  /** Club -> [a digest of its men's names in file order, their ages as two digits each]. */
  clubs: Record<string, [string, string]>;
}

/** The digest a view line is matched on: a club whose men moved since the view was cut keeps its own rows. */
export function namesDigest(list: readonly BakedPlayer[]): string {
  let h = 2166136261 >>> 0;
  const s = list.map(b => b.n).join('|');
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

function buildViewWorld(view: Curve1View): Record<string, BakedPlayer[]> | null {
  let same = [CM_ROSTER_META, CM_ALEAGUE_META, CM_RUSSIA_META].every(meta => fileCurve(meta) !== CM_AGE_CURVE);
  const baked: Record<string, BakedPlayer[]> = {};
  for (const [club, list] of Object.entries(CM_ROSTERS_BAKED)) {
    const line = view.clubs[club];
    if (!line || line[0] !== namesDigest(list) || line[1].length !== list.length * 2) { baked[club] = list; continue; }
    baked[club] = list.map((b, i) => {
      const a = Number(line[1].slice(2 * i, 2 * i + 2));
      if (a === b.a) return b;
      same = false;
      return { ...b, a };
    });
  }
  return same ? null : joinWorld(baked, false);
}

let ACTIVE_WORLD: Record<string, BakedPlayer[]> | null = null;
const VIEW_WORLDS = new WeakMap<Curve1View, Record<string, BakedPlayer[]> | null>();

/** The modern world the engine reads now: the live one, or the curve 1 view inside onCurve1View. */
export function cmWorld(): Record<string, BakedPlayer[]> {
  return ACTIVE_WORLD ?? CM_WORLD_ROSTERS;
}

/** What every engine cache keyed on the modern world puts in front of its key: '' for the live world. */
export function cmWorldTag(): string {
  return ACTIVE_WORLD ? 'curve1|' : '';
}

/** Runs one synchronous stretch of engine calls on the curve 1 view, and puts the live world back whatever
 *  happens. JavaScript runs it to the end before anything else on the page gets a turn. */
export function onCurve1View<T>(view: Curve1View, fn: () => T): T {
  let world = VIEW_WORLDS.get(view);
  if (world === undefined) { world = buildViewWorld(view); VIEW_WORLDS.set(view, world); }
  if (world === null || ACTIVE_WORLD) return fn();
  ACTIVE_WORLD = world;
  try {
    return fn();
  } finally {
    ACTIVE_WORLD = null;
  }
}
export const CM_WORLD_PARTIAL: string[] = [...CM_PARTIAL_BAKED, ...CM_ALEAGUE_PARTIAL, ...CM_RUSSIA_PARTIAL];

/** One generated league's own facts: how its squads are named on the
 *  picker's date line, how many men it ships, and the first and last day its
 *  clubs were read (the same day twice when it was read in one). */
export interface GeneratedLeagueFacts { label: string; players: number; read: string; readTo: string; }

export const CM_GENERATED_LEAGUES: GeneratedLeagueFacts[] = [
  { label: 'A-League Men', players: CM_ALEAGUE_META.players, read: CM_ALEAGUE_META.read, readTo: CM_ALEAGUE_META.read },
  { label: CM_RUSSIA_META.label, players: CM_RUSSIA_META.players, read: CM_RUSSIA_META.read, readTo: CM_RUSSIA_META.readTo },
];

/** When a generated league's squads were read, from its own file and never the clock:
 *  one day, or "between A and B" when its clubs were read on more than one. */
function readWhen(g: GeneratedLeagueFacts): string {
  return g.read === g.readTo ? g.read : `between ${g.read} and ${g.readTo}`;
}

/** "A-League Men squads as of 2026-10-06", one a generated league, for the picker's date line. */
export function generatedLeagueDateClauses(): string[] {
  return CM_GENERATED_LEAGUES.map(g => `${g.label} squads as of ${readWhen(g)}`);
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "the A-League Men and the Russian Premier League in October 2026", for the
 *  line over the picker, which dates the baked squads by their month: the
 *  generated leagues grouped by the month their squads were last read in,
 *  from their own files and never the clock. Empty when there is none. */
export function generatedLeagueMonthClause(): string {
  const byMonth = new Map<string, string[]>();
  for (const g of CM_GENERATED_LEAGUES) {
    const [year, month] = g.readTo.split('-').map(Number);
    const when = `${MONTH_NAMES[month - 1]} ${year}`;
    byMonth.set(when, [...(byMonth.get(when) ?? []), `the ${g.label}`]);
  }
  const listOf = (names: string[]) => (names.length < 3 ? names.join(' and ') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);
  return [...byMonth].map(([when, names]) => `${listOf(names)} in ${when}`).join(', ');
}

/** "the A-League Men's 310, read 2026-10-06", one a generated league, for the count under the picker. */
export function generatedLeagueCountClauses(): string[] {
  return CM_GENERATED_LEAGUES.map(g => `the ${g.label}'s ${g.players}, read ${readWhen(g)}`);
}
