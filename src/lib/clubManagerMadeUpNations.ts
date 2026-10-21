/* Round 1520: a made up player's country (the player report of 2026-10-21, "Add nationalities for made up players").

   A real footballer's country comes from the verified map (nationalityOf in src/data/playerNationalities.ts) and
   from nowhere else. A man this game made up (a generated market man, an emergency free agent, a founder of a
   created club, a youth pad, an academy graduate) carries one of his own, stored on him as `nation` and never
   written into that map.

   How it is drawn: from the country of the club where the save first meets him, at the share of home players the
   real squads of that club's league actually have in this world (counted off the save's own world: its squads and
   its verified map), and otherwise from the countries those squads' foreign players come from, in proportion. A
   youth pad and a boy of the home academy read the same count. A boy a scout found abroad keeps the country of that
   scouting trip.

   The draw is keyed on his name (keyedRng), so it never touches the season's random stream and the same man always
   lands on the same country, a save from before this round included. Pure: no state, no clock. */
import { keyedRng } from '@/lib/keyedRng';

/** One club country's real men in one league, counted. `known` holds only men the verified map has a country for. */
export interface NationCount { known: number; home: number; abroad: [string, number][] }

/** Counts a list of verified countries against the club country they play in, busiest foreign country first. */
export function countNations(nations: readonly (string | null)[], home: string): NationCount {
  let known = 0, own = 0;
  const away = new Map<string, number>();
  for (const n of nations) {
    if (!n) continue;
    known += 1;
    if (n === home) own += 1;
    else away.set(n, (away.get(n) ?? 0) + 1);
  }
  return { known, home: own, abroad: [...away].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])) };
}

/** His country: home at the counted share, else a foreign country in proportion. Keyed on his name, never the main stream. */
export function drawNation(name: string, home: string, count: NationCount | null | undefined): string {
  if (!count || count.known <= 0 || !count.abroad.length) return home;
  const rng = keyedRng(`cm-made-up-nation|${name}`);
  if (rng() * count.known < count.home) return home;
  let pick = rng() * (count.known - count.home);
  for (const [nation, n] of count.abroad) {
    pick -= n;
    if (pick < 0) return nation;
  }
  return count.abroad[count.abroad.length - 1][0];
}

/** A scouting trip's country, spelt the way the verified map spells it, so the flag and the board read one name. */
const MAP_SPELLING: Record<string, string> = { Turkey: 'Türkiye', 'Ivory Coast': "Cote d'Ivoire" };
export function mapSpelling(country: string): string {
  return MAP_SPELLING[country] ?? country;
}
