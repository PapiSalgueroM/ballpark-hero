import { PREMIER_FIXTURES_2026 } from '@/data/clubManagerPremierFixtures2026';
import type { CareerState } from '@/lib/clubManager';

/* Round 1225: one registry of real first season fixture lists, lifted from Round 1184's
   Premier League helper. A league is ONE LINE of REAL_LEAGUE_FIXTURES below; nothing else
   in the game names a league's list.

   The Premier League's list rides in the engine's own file, as Round 1184 shipped it. Every
   other list is its own small file, fetched only when a new career in that league starts or
   a save that holds its key is opened (ensureRealLeagueFixtures), so the pages that carry
   the engine do not carry lists they never read.

   Two rules a caller must know:
   - startCareer gives a new career a key only when that list is already here. A caller that
     fetched nothing gets the generated list and no key, exactly as before this round.
   - A save that holds a key this file knows, whose list has not arrived, THROWS on its first
     fixture read. Playing on would quietly swap its season for a generated one. A key this
     file does not know reads generated fixtures, as Round 1184 treated any key but its own.

   The import of the Premier League's data below is read at module scope on purpose: a data
   file imports nothing and this file takes only a type from the engine, so there is no cycle. */

export interface RealLeagueFixtureLedger {
  readonly schemaVersion: 1;
  readonly key: string;
  readonly leagueId: string;
  readonly seasonStartYear: number;
  readonly coverage: string;
  readonly clubs: readonly string[];
  readonly rounds: readonly (readonly (readonly [string, string])[])[];
  readonly sources: readonly { readonly label: string; readonly url: string }[];
}

/** What the order of a list is the order OF, in the words its receipt bears out: the list as
 *  first published (the month it came out), or the list as two sources showed it on one day. */
export type RealFixtureListAsOf = { readonly published: string } | { readonly stoodOn: string };

export interface RealLeagueFixtureEntry {
  readonly key: string;
  readonly leagueId: string;
  readonly seasonStartYear: number;
  readonly asOf: RealFixtureListAsOf;
  /** A list that rides with the engine. */
  readonly ledger?: RealLeagueFixtureLedger;
  /** A list in a file of its own. */
  readonly load?: () => Promise<RealLeagueFixtureLedger>;
}

/** The registry. Where one league and start year ever has two lists, the newer one is listed
 *  FIRST: a new career takes the first match, a save reads the one its key names. A key that
 *  has shipped never leaves this list. */
export const REAL_LEAGUE_FIXTURES: readonly RealLeagueFixtureEntry[] = [
  { key: 'premier-2026-27-v1', leagueId: 'premier', seasonStartYear: 2026, asOf: { published: 'June 2026' }, ledger: PREMIER_FIXTURES_2026 },
  { key: 'championship-2026-27-v1', leagueId: 'championship', seasonStartYear: 2026, asOf: { published: 'June 2026' }, load: () => import('@/data/clubManagerChampionshipFixtures2026').then(m => m.CHAMPIONSHIP_FIXTURES_2026) },
];

export const REAL_PREMIER_FIXTURE_KEY = PREMIER_FIXTURES_2026.key;
type FixtureContext = Pick<CareerState, 'realLeagueFixtures' | 'startYear' | 'season' | 'eraId' | 'customClub' | 'leagueOverrides'>;

const LOADED = new Map<string, RealLeagueFixtureLedger>();
const LOADING = new Map<string, Promise<void>>();
const ledgerOf = (entry: RealLeagueFixtureEntry): RealLeagueFixtureLedger | null => entry.ledger ?? LOADED.get(entry.key) ?? null;

/** The key a NEW career in this league and start year would be given, or null. */
export function realLeagueFixtureKeyFor(leagueId: string, startYear: number): string | null {
  return REAL_LEAGUE_FIXTURES.find(e => e.leagueId === leagueId && e.seasonStartYear === startYear)?.key ?? null;
}

/** True when nothing has to be fetched before this key is read: no key, a key this file does
 *  not know, or a list that is here. */
export function realLeagueFixturesLoaded(key: string | null | undefined): boolean {
  const entry = REAL_LEAGUE_FIXTURES.find(e => e.key === key);
  return !entry || !!ledgerOf(entry);
}

/** Fetch a key's list before anything reads it. Resolves at once when there is nothing to
 *  fetch; two calls for one key share one fetch; a failed fetch rejects and is forgotten, so
 *  the next call tries again. */
export function ensureRealLeagueFixtures(key: string | null | undefined): Promise<void> {
  const entry = REAL_LEAGUE_FIXTURES.find(e => e.key === key);
  if (!entry || !entry.load || ledgerOf(entry)) return Promise.resolve();
  const inFlight = LOADING.get(entry.key);
  if (inFlight) return inFlight;
  const p = entry.load().then(ledger => {
    if (ledger.key !== entry.key || ledger.leagueId !== entry.leagueId || ledger.seasonStartYear !== entry.seasonStartYear) {
      throw new Error(`Club Manager: the file fetched for ${entry.key} holds another fixture list`);
    }
    LOADED.set(entry.key, ledger);
  }).finally(() => { LOADING.delete(entry.key); });
  LOADING.set(entry.key, p);
  return p;
}

/** Membership order stays the save's own. Only the verified set can use this list. */
export function canBindRealLeagueFixtures(state: FixtureContext, ledger: RealLeagueFixtureLedger, leagueId: string, clubs: string[]): boolean {
  return leagueId === ledger.leagueId && state.eraId === 'now'
    && state.startYear === ledger.seasonStartYear && state.season === 1
    && !state.customClub && !state.leagueOverrides
    && clubs.length === ledger.clubs.length && new Set(clubs).size === clubs.length
    && clubs.every(club => ledger.clubs.includes(club));
}

/** For startCareer: the key of the list this fresh save opens on, or null. Null too when the
 *  league has a list that is not here yet, so nothing is ever promised that cannot be read. */
export function realLeagueFixtureKeyForStart(state: FixtureContext, leagueId: string, clubs: string[]): string | null {
  const entry = REAL_LEAGUE_FIXTURES.find(e => e.leagueId === leagueId && e.seasonStartYear === state.startYear);
  const ledger = entry ? ledgerOf(entry) : null;
  return entry && ledger && canBindRealLeagueFixtures(state, ledger, leagueId, clubs) ? entry.key : null;
}

/** The registry line and the list a save's key names, for one league. */
function savedList(state: FixtureContext, leagueId: string, clubs: string[]): { entry: RealLeagueFixtureEntry; ledger: RealLeagueFixtureLedger } | null {
  const entry = REAL_LEAGUE_FIXTURES.find(e => e.key === state.realLeagueFixtures);
  if (!entry || entry.leagueId !== leagueId) return null;
  const ledger = ledgerOf(entry);
  if (!ledger) throw new Error(`Club Manager: the ${entry.key} fixture list is not loaded yet (await ensureRealLeagueFixtures first)`);
  return canBindRealLeagueFixtures(state, ledger, leagueId, clubs) ? { entry, ledger } : null;
}

export function realLeagueFixturePairs(state: FixtureContext, leagueId: string, clubs: string[], round: number): [string, string][] | null {
  const list = savedList(state, leagueId, clubs);
  if (!list || !Number.isInteger(round) || round < 0 || round >= list.ledger.rounds.length) return null;
  return list.ledger.rounds[round].map(([home, away]): [string, string] => [home, away]);
}

const seasonLabel = (startYear: number) => `${startYear}/${String((startYear + 1) % 100).padStart(2, '0')}`;

/** "the list as first published in June 2026" or "the list as it stood on 10 October 2026". */
export function realFixtureListAsOfText(asOf: RealFixtureListAsOf): string {
  return 'published' in asOf ? `the list as first published in ${asOf.published}` : `the list as it stood on ${asOf.stoodOn}`;
}

export function realLeagueFixtureCoverage(state: FixtureContext, leagueId: string, clubs: string[], leagueName: string) {
  const list = savedList(state, leagueId, clubs);
  if (!list) return null;
  return {
    key: list.entry.key,
    label: `Real ${seasonLabel(list.entry.seasonStartYear)} ${leagueName} opponent order and home/away venues. Calendar dates and results are simulated. The order is ${realFixtureListAsOfText(list.entry.asOf)}.`,
    sources: list.ledger.sources,
  };
}
