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
