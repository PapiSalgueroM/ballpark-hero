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

/** True when today's main squads file (the bake) is read with the age. A created club's founders are priced
 *  through the same read in that case (customFounderValue). */
export const CM_WORLD_READS_AGE: boolean = fileCurve(CM_ROSTER_META) === CM_AGE_CURVE;

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

function joinWorld(): Record<string, BakedPlayer[]> {
  const out: Record<string, BakedPlayer[]> = { ...readWithAge(CM_ROSTERS_BAKED, fileCurve(CM_ROSTER_META)) };
  for (const [name, club] of Object.entries(CM_ALEAGUE_SUPERSEDES)) {
    const list = out[club];
    if (list) out[club] = list.filter(p => p.n !== name);
  }
  return { ...out, ...readWithAge(CM_ALEAGUE_ROSTERS, fileCurve(CM_ALEAGUE_META)),
    ...readWithAge(CM_RUSSIA_ROSTERS, fileCurve(CM_RUSSIA_META)) };
}

export const CM_WORLD_ROSTERS: Record<string, BakedPlayer[]> = joinWorld();
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
