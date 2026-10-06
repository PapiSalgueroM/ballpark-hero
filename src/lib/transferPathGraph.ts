import type { CareerPlayer } from '@/types/career';
import { seasonSpan } from '@/lib/transferPathModes';

/* Round 475: the link rule, in one place the page can be read from.
   -------------------------------------------------------------------------
   Transfer Path links two players when they were at the same club in the same
   season (owner 2026-07-10). Until now that was judged on one string,
   `club::season`, and the career table writes the same club in two styles:
   a European club keeps split seasons ("2020-2021") and a South American or
   North American club keeps calendar years ("2020"), sometimes both for one
   man (Julián Álvarez's River Plate rows run 2018-2019, 2019-2020, 2020, 2021
   and 2022). Where the two styles met, real teammates never linked and the
   board told a player they were never there together. A report on
   /transfer-path on 2026-09-06 was exactly that: a chain ending on Álvarez
   with Enzo Fernández, his River Plate teammate, refused.

   THE RULE, and it is asymmetric on purpose. Two spells at the same club link
   when their season strings are EQUAL, or when one is a calendar year Y and
   the other is a split season whose range runs through Y. It never links two
   split seasons that merely share a year: at a European club that would put a
   man who left in the summer of 2020 in the same dressing room as one who
   arrived in it, which invents teammates and is worse than the refusal it
   fixes. So a plain set of strings cannot carry this. Each spell contributes
   to three buckets instead, and only calendar meets span:

     exact     `club::season` written out, matched against exact
     calendar  `club::YYYY` from a calendar row, matched against span
     span      `club::YYYY` for every year a split row runs through, matched
               against calendar

   scripts/lib/transferPathHints.mjs carries the same rule for the generator
   and the fences, and scripts/simTransferPathSeasons.mjs rebuilds both graphs
   over the whole pool and fails if they disagree about a single player. */

/** The keys one player's career contributes. See the note above for what each bucket meets. */
export interface ClubSeasonKeys {
  exact: Set<string>;
  calendar: Set<string>;
  span: Set<string>;
}

/** `club::YYYY` and `club::2020-2021` both carry the club before the separator. */
export function clubOfKey(key: string): string {
  return key.slice(0, key.indexOf('::'));
}

const CALENDAR_SEASON = /^\d{4}$/;

function addSpell(keys: ClubSeasonKeys, club: string, season: string): void {
  const written = String(season).trim();
  keys.exact.add(`${club}::${season}`);
  if (CALENDAR_SEASON.test(written)) {
    keys.calendar.add(`${club}::${written}`);
    return;
  }
  const span = seasonSpan(written);
  if (!span) return;
  for (let year = span[0]; year <= span[1]; year += 1) keys.span.add(`${club}::${year}`);
}

/** name -> the keys the link rule is judged on */
export function clubSeasonsOf(players: CareerPlayer[]): Map<string, ClubSeasonKeys> {
  const map = new Map<string, ClubSeasonKeys>();
  for (const p of players) {
    const keys: ClubSeasonKeys = { exact: new Set(), calendar: new Set(), span: new Set() };
    for (const s of p.career) addSpell(keys, s.club, s.season);
    map.set(p.name, keys);
  }
  return map;
}

/**
 * The club two players shared a season at, or null. Equal season strings are
 * tried first, so a pair that already linked before Round 475 is still told
 * about the same club.
 */
export function shareClub(keys: Map<string, ClubSeasonKeys>, a: string, b: string): string | null {
  const ka = keys.get(a);
  const kb = keys.get(b);
  if (!ka || !kb) return null;
  for (const key of ka.exact) if (kb.exact.has(key)) return clubOfKey(key);
  for (const key of ka.calendar) if (kb.span.has(key)) return clubOfKey(key);
  for (const key of ka.span) if (kb.calendar.has(key)) return clubOfKey(key);
  return null;
}

/** key -> the players who hold it, one map per bucket. Powers the give up path search. */
export interface SeasonIndex {
  exact: Map<string, string[]>;
  calendar: Map<string, string[]>;
  span: Map<string, string[]>;
}

export function buildSeasonIndex(keys: Map<string, ClubSeasonKeys>): SeasonIndex {
  const index: SeasonIndex = { exact: new Map(), calendar: new Map(), span: new Map() };
  for (const [name, k] of keys) {
    for (const bucket of ['exact', 'calendar', 'span'] as const) {
      for (const key of k[bucket]) {
        const arr = index[bucket].get(key);
        if (arr) arr.push(name);
        else index[bucket].set(key, [name]);
      }
    }
  }
  return index;
}

/**
 * Everyone linked to one player, with the club the link runs through. The
 * player himself comes back too (he holds his own keys); a search that has
 * already seen him drops him.
 */
export function* linkedFrom(index: SeasonIndex, keys: ClubSeasonKeys): Generator<{ name: string; club: string }> {
  const meets: [Set<string>, Map<string, string[]>][] = [
    [keys.exact, index.exact],
    [keys.calendar, index.span],
    [keys.span, index.calendar],
  ];
  for (const [held, others] of meets) {
    for (const key of held) {
      const club = clubOfKey(key);
      for (const name of others.get(key) ?? []) yield { name, club };
    }
  }
}

/** Round 1010a: what the "More help" tier counts. Counts only, never a name. */
export interface TransferPathDoors {
  /** Distinct pool players linked to the head, played names left out. */
  total: number;
  /** How many of those sit one step closer to the target than the head does. */
  onRoute: number;
  /** Per club the links run through. A man linked through two clubs counts at both. */
  byClub: { club: string; players: number; onRoute: number }[];
  /** Distinct pool players linked to the target, played names left out. */
  intoTotal: number;
  /** The same per club, for the target's side. */
  into: { club: string; players: number }[];
}

const byPlayersThenClub = (x: { club: string; players: number }, y: { club: string; players: number }) =>
  y.players - x.players || x.club.localeCompare(y.club);

/** Linked players with every club the link runs through, the man himself and `skip` left out. */
function doorMap(index: SeasonIndex, keys: ClubSeasonKeys, self: string, skip: ReadonlySet<string>): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const { name, club } of linkedFrom(index, keys)) {
    if (name === self || skip.has(name)) continue;
    const clubs = out.get(name);
    if (clubs) clubs.add(club);
    else out.set(name, new Set([club]));
  }
  return out;
}

/**
 * Round 1010a, the second hint tier. Counts the doors out of the head and into
 * the target on the graph the game is actually playing (pass the RULE graph),
 * with every played name left out, so it can never point at a refusal or a
 * duplicate (the Round 294 and Round 536 lessons).
 *
 * THE ATTRIBUTION RULE: a man counts under every club he links through, and
 * `total` counts distinct men, so the club figures can add up to more than
 * `total`. onRoute is one search from the target that skips the played names
 * (the head excepted): a neighbour is on a route when his distance is the
 * head's minus one, the same search findPath runs.
 *
 * Measured on the bake (2026-10-05, Round 475 rule graph) for tpa-762, Alisson
 * Becker to Mikel Oyarzabal: 19 pool players, Liverpool 17, Roma 3,
 * Internacional 2, 1 on a shortest route; into the target 3, all through Real
 * Sociedad. Until Round 1010b removes the twin, "Alisson" counts as Alisson
 * Becker's own teammate.
 *
 * null when either end is not in the graph, the head is the target, or no
 * route is left from the head (the stranded state says that instead).
 */
export function doorsFrom(
  index: SeasonIndex,
  keys: Map<string, ClubSeasonKeys>,
  head: string,
  target: string,
  played: readonly string[],
): TransferPathDoors | null {
  const headKeys = keys.get(head);
  const targetKeys = keys.get(target);
  if (!headKeys || !targetKeys || head === target) return null;
  const skip = new Set(played);
  skip.delete(head);

  const dist = new Map<string, number>([[target, 0]]);
  const queue = [target];
  for (let i = 0; i < queue.length && !dist.has(head); i += 1) {
    const cur = queue[i];
    const curKeys = keys.get(cur);
    if (!curKeys) continue;
    for (const { name } of linkedFrom(index, curKeys)) {
      if (dist.has(name) || skip.has(name)) continue;
      dist.set(name, dist.get(cur)! + 1);
      queue.push(name);
    }
  }
  const headDist = dist.get(head);
  if (headDist === undefined) return null;

  const playedSet = new Set(played);
  const out = doorMap(index, headKeys, head, playedSet);
  const clubs = new Map<string, { club: string; players: number; onRoute: number }>();
  let onRoute = 0;
  for (const [name, via] of out) {
    const near = dist.get(name) === headDist - 1;
    if (near) onRoute += 1;
    for (const club of via) {
      const row = clubs.get(club) ?? { club, players: 0, onRoute: 0 };
      row.players += 1;
      if (near) row.onRoute += 1;
      clubs.set(club, row);
    }
  }

  const inward = doorMap(index, targetKeys, target, playedSet);
  const intoClubs = new Map<string, number>();
  for (const via of inward.values()) for (const club of via) intoClubs.set(club, (intoClubs.get(club) ?? 0) + 1);

  return {
    total: out.size,
    onRoute,
    byClub: [...clubs.values()].sort(byPlayersThenClub),
    intoTotal: inward.size,
    into: [...intoClubs].map(([club, players]) => ({ club, players })).sort(byPlayersThenClub),
  };
}

const TOP_CLUBS = 4;
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

function clubList(rows: { club: string; players: number }[]): string {
  const shown = rows.slice(0, TOP_CLUBS).map(r => `${r.club} ${r.players}`).join(', ');
  const more = rows.length - TOP_CLUBS;
  return more > 0 ? `${shown}, and ${more} more ${plural(more, 'club', 'clubs')}` : shown;
}

/** The two "More help" lines. They name the head and the target and nobody else. */
export function moreHelpLines(doors: TransferPathDoors, head: string, target: string): string[] {
  const route = doors.total === 1
    ? 'He is on a shortest route.'
    : doors.onRoute === 1
      ? 'Just 1 of them is on a shortest route.'
      : `${doors.onRoute} of them are on a shortest route.`;
  const out = `🔎 From ${head}, ${doors.total} pool ${plural(doors.total, 'player', 'players')} shared a season with him: ${clubList(doors.byClub)}. ${route}`;
  const via = doors.into.length === 1
    ? `${doors.intoTotal === 1 ? '' : 'all '}through ${doors.into[0].club}`
    : `through ${clubList(doors.into)}`;
  const into = `🎯 Into ${target}: ${doors.intoTotal} pool ${plural(doors.intoTotal, 'player', 'players')}, ${via}.`;
  return [out, into];
}
