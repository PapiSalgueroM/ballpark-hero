import { NATION_CONFED, type Confederation } from '@/lib/soccerInternational';

/* Round 453: region groupings for long nationality lists, grouped the way
   the game itself groups them, by confederation. The owner's 2026-08-28
   review asked for flags everywhere and confederation groups wherever a
   list gets long.

   The table is NATION_CONFED, the international engine's own, so a nation can
   never sit in one confederation for qualifying and another in a picker.
   What this file adds is DISPLAY ONLY: the spellings the market data uses
   for nations the engine already knows under another name (United States
   for USA, Türkiye for Turkey, Cote d'Ivoire for Ivory Coast, Korea, South
   for South Korea, Bosnia-Herzegovina, Curacao), plus members the engine
   deliberately leaves out of its qualifying draws, either because they play
   the Gold Cup but not World Cup qualifying (Guadeloupe, Martinique and
   Saint-Martin) or because they were never needed as opponents (Gibraltar,
   Barbados, Burundi, Yemen and the rest). Nothing here writes back to
   NATION_CONFED, so none of them reach a qualifying group.

   Every entry below was checked on 2026-09-05 against two lists: the
   confederations' own member pages at uefa.com (55), cafonline.com (54) and
   oceaniafootball.com (11), and the member tables on en.wikipedia.org for
   all six confederations plus its list of men's national teams. the-afc.com
   and concacaf.com serve their member pages by script and answered 404 to a
   plain fetch, so for those two the second source is the second Wikipedia
   table rather than the confederation's own page. */

export const CONFEDERATION_ORDER: Confederation[] = ['UEFA', 'CONMEBOL', 'CONCACAF', 'CAF', 'AFC', 'OFC'];

export const CONFEDERATION_LABEL: Record<Confederation, string> = {
  UEFA: 'Europe (UEFA)',
  CONMEBOL: 'South America (CONMEBOL)',
  CONCACAF: 'North and Central America, Caribbean (CONCACAF)',
  CAF: 'Africa (CAF)',
  AFC: 'Asia (AFC)',
  OFC: 'Oceania (OFC)',
};

/** Display only. See the note at the top of the file. */
export const DISPLAY_CONFED: Record<string, Confederation> = {
  // Spellings the market data uses for nations the engine knows by another name.
  'United States': 'CONCACAF', 'Türkiye': 'UEFA', "Cote d'Ivoire": 'CAF',
  'Korea, South': 'AFC', 'Korea Republic': 'AFC', 'Korea, North': 'AFC',
  'Bosnia-Herzegovina': 'UEFA', 'Bosnia and Herzegovina': 'UEFA', Bosnia: 'UEFA',
  Curacao: 'CONCACAF', Czechia: 'UEFA', 'Republic of Ireland': 'UEFA', Gambia: 'CAF',
  // Members the qualifying engine does not carry.
  Gibraltar: 'UEFA', Andorra: 'UEFA', 'San Marino': 'UEFA',
  Barbados: 'CONCACAF', Grenada: 'CONCACAF', Guyana: 'CONCACAF',
  'St. Kitts & Nevis': 'CONCACAF', 'Saint Lucia': 'CONCACAF',
  Guadeloupe: 'CONCACAF', Martinique: 'CONCACAF', 'Saint-Martin': 'CONCACAF',
  Burundi: 'CAF', 'Central African Republic': 'CAF', Chad: 'CAF',
  'Equatorial Guinea': 'CAF', Mauritania: 'CAF', Seychelles: 'CAF',
  Yemen: 'AFC', Kyrgyzstan: 'AFC',
};

/** The confederation a nationality string belongs to, or null if the site
    does not know it. Never guesses. */
export function confederationFor(nation: string): Confederation | null {
  return NATION_CONFED[nation] ?? DISPLAY_CONFED[nation] ?? null;
}

export interface ConfederationGroup<T> {
  conf: Confederation | 'other';
  label: string;
  items: T[];
}

/** Splits a list into confederation groups in a fixed order, keeping each
    group's items in the order they arrived. Anything the site cannot place
    lands in a trailing "Elsewhere" group rather than vanishing from a filter;
    simNationalityFlags asserts that group is never needed. */
export function groupByConfederation<T>(items: readonly T[], nameOf: (item: T) => string): ConfederationGroup<T>[] {
  const buckets = new Map<Confederation | 'other', T[]>();
  for (const item of items) {
    const conf = confederationFor(nameOf(item)) ?? 'other';
    const list = buckets.get(conf);
    if (list) list.push(item);
    else buckets.set(conf, [item]);
  }
  const out: ConfederationGroup<T>[] = [];
  for (const conf of CONFEDERATION_ORDER) {
    const list = buckets.get(conf);
    if (list?.length) out.push({ conf, label: CONFEDERATION_LABEL[conf], items: list });
  }
  const rest = buckets.get('other');
  if (rest?.length) out.push({ conf: 'other', label: 'Elsewhere', items: rest });
  return out;
}
