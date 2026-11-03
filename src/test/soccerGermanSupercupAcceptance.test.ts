import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { CareerState, SeasonRecord } from '@/lib/soccerCareerEngine';
import { clubKeyOf, leagueWorldForYear, leagueWorldOrder } from '@/lib/soccerCareerLeagueWorld';
import { readCommunityShield, communityShieldAnnualStats } from '@/lib/soccerCareerExtraCups';
import { savedSeasonCompetitions, type SavedSeasonCompetition } from '@/lib/soccerSeasonCompetitions';
import { cupCalendar, nextCupGame } from '@/lib/soccerSeasonCalendar';
import { trophyWins, type TrophyCategory } from '@/components/soccer-career/TrophyCabinet';
import { cupSeason } from './fixtures/soccerSeasonCompetitions1173';

const E = (process.env.SC_EXTRA_CUPS_ENGINE
  ? await import(/* @vite-ignore */ process.env.SC_EXTRA_CUPS_ENGINE)
  : await import('@/lib/soccerCareerEngine')) as typeof import('@/lib/soccerCareerEngine');

type Entrant = { club: string; via: 'league-winner' | 'dfb-pokal-winner' | 'league-runner-up' };
type Qualification = {
  version: 1; competition: 'german-supercup'; status: 'ready';
  qualifyingYear: number; eventYear: number; seed: number; leagueWinner: string; cupWinner: string;
  runnerUp?: string; entrants: [Entrant, Entrant];
  proof: {
    league: { kind: 'league-world-close'; year: number };
    cup: { kind: 'phone-world' | 'validated-player-dfb-pokal'; year: number };
    runnerUp?: { kind: 'league-world-close'; year: number };
  };
};
type GermanResult = {
  version: 1; competition: 'german-supercup'; qualifyingYear: number; eventYear: number; seed: number;
  qualification: Qualification; entrants: [Entrant, Entrant]; minutes: 90; score: [number, number];
  decidedBy: 'normal-time' | 'penalties'; penalties?: [number, number]; winner: string; annualRating?: number;
  player: {
    club: string; availability: 'available' | 'unknown' | 'unavailable'; reason?: string; selected: boolean;
    apps: 0 | 1; goals: number; assists: number; cleanSheets: 0 | 1; rating: number | null; title: boolean;
  };
};
type GermanRoot = { germanSupercupQualification?: Qualification };
type GermanRow = SeasonRecord & { germanSupercup?: GermanResult };
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const same = (a: string, b: string): boolean => clubKeyOf(a) === clubKeyOf(b);
const rawRoot = (state: CareerState): GermanRoot => state as unknown as GermanRoot;
const CLOCK = 1793448000000;
afterEach(() => vi.restoreAllMocks());

// Optional remote receipts keep complete inputs, states and draw tapes before each owned assertion.
function retain(name: string, value: unknown): void {
  const root = process.env.SC_GERMAN_SUPERCUP_EVIDENCE;
  if (!root) return;
  mkdirSync(root, { recursive: true });
  writeFileSync(resolve(root, name + '.json'), JSON.stringify(value, null, 2) + '\n');
}
function action(input: CareerState, apply: (state: CareerState) => CareerState) {
  const before = copy(input), working = copy(input), draws: number[] = [];
  let lcg = 0;
  const random = vi.spyOn(Math, 'random').mockImplementation(() => {
    lcg = (Math.imul(lcg, 1664525) + 1013904223) >>> 0;
    const value = lcg / 4294967296; draws.push(value); return value;
  });
  const clock = vi.spyOn(Date, 'now').mockReturnValue(CLOCK);
  try { return { before, after: apply(working), draws, finalLcgState: lcg }; }
  finally { random.mockRestore(); clock.mockRestore(); }
}
function actualClose(label: string) {
  const file = resolve(process.cwd(), 'scripts/data/careerLeagueWorldSaves1100.json');
  const raw = readFileSync(file, 'utf8');
  const saved = JSON.parse(raw) as { saves: { id: string; state: CareerState }[] };
  const original = saved.saves.find(row => row.id === 'ere')?.state;
  const arsenal = E.FALLBACK_CLUBS.find(club => same(club.name, 'Arsenal'));
  expect(original, 'the held ere save must exist').toBeDefined();
  expect(arsenal, 'the held club table must contain the same Arsenal profile').toBeDefined();
  // The already qualified arsenal:0 profile. This is a lab copy, not a played transfer or development claim.
  const lab: CareerState = { ...copy(original!), playerName: 'Shield annual witness', phase: 'playing',
    currentClub: arsenal!.name, currentClubCountry: arsenal!.country, currentClubTier: arsenal!.tier,
    currentClubColor: arsenal!.color, currentLeague: arsenal!.league,
    pace: 85, shooting: 85, passing: 85, dribbling: 85, defending: 85, physical: 85, reflexes: 85 };
  lab.overall = E.calcOverall(lab, lab.position);
  const repaired = action(lab, state => E.repairCareer(state));
  const year = repaired.after.seasons[repaired.after.seasons.length - 1]!.year + 1;
  const world = leagueWorldForYear(repaired.after, E.FALLBACK_CLUBS, year);
  expect(world, 'the actual public world must exist before the close').not.toBeNull();
  const order = leagueWorldOrder(world!, 'Bundesliga', repaired.after.playerName, E.FALLBACK_CLUBS);
  const closed = action(repaired.after, state => E.advanceProSeason(state, E.FALLBACK_CLUBS));
  const row = closed.after.seasons[closed.after.seasons.length - 1]!;
  retain(label + '-actual-close', { sourceFixture: file, rawFixture: raw, original, lab, repaired, world, order, closed });
  // These foundations precede every feature assertion. A failure here is setup failure, not owned German RED.
  expect(row.year).toBe(2029); expect(row.type).toBe('playing'); expect(row.injurySevere).toBe(false);
  expect(closed.after.phase).toBe('newspaper'); expect(closed.after.phone?.world?.year).toBe(year);
  expect(closed.after.phone?.seed).toBe(4272396692);
  expect(closed.after.extraCupQualification?.status, 'the already qualified English capture stays present').toBe('ready');
  expect(order).toHaveLength(18); expect(new Set(order.map(clubKeyOf)).size).toBe(18);
  const leagueWinner = closed.after.phone!.world!.leagues['Bundesliga'];
  const cupWinner = closed.after.phone!.world!.cups?.['Bundesliga'];
  expect(leagueWinner, 'actual closing German champion must agree with the held order').toBe(order[0]);
  expect(typeof cupWinner === 'string' && cupWinner.length > 0, 'actual world must record the German cup winner').toBe(true);
  const double = same(leagueWinner, cupWinner!);
  const qualification: Qualification = {
    version: 1, competition: 'german-supercup', status: 'ready', qualifyingYear: year, eventYear: year + 1,
    seed: closed.after.phone!.seed, leagueWinner, cupWinner: cupWinner!,
    ...(double ? { runnerUp: order[1] } : {}),
    entrants: [{ club: leagueWinner, via: 'league-winner' },
      { club: double ? order[1] : cupWinner!, via: double ? 'league-runner-up' : 'dfb-pokal-winner' }],
    proof: { league: { kind: 'league-world-close', year }, cup: { kind: 'phone-world', year },
      ...(double ? { runnerUp: { kind: 'league-world-close' as const, year } } : {}) },
  };
  retain(label + '-qualification-expectation', { qualification, source: 'Actual existing world fields, not the new capture helper.' });
  return { closed: closed.after, qualification };
}
function savedGerman(): GermanRow {
  const qualification: Qualification = {
    version: 1, competition: 'german-supercup', status: 'ready', qualifyingYear: 2026, eventYear: 2027,
    seed: 1141312389, leagueWinner: 'Bayern Munich', cupWinner: 'Dortmund',
    entrants: [{ club: 'Bayern Munich', via: 'league-winner' }, { club: 'Dortmund', via: 'dfb-pokal-winner' }],
    proof: { league: { kind: 'league-world-close', year: 2026 }, cup: { kind: 'phone-world', year: 2026 } },
  };
  const row = copy(cupSeason) as GermanRow;
  row.club = 'Bayern Munich'; row.clubCountry = 'Germany'; row.clubTier = 1;
  row.domesticCup = false; delete row.cupRun;
  // Explicit fictional saved result, not a real German match, earned receipt or naturally played career.
  row.germanSupercup = {
    version: 1, competition: 'german-supercup', qualifyingYear: 2026, eventYear: 2027, seed: 1141312389,
    qualification, entrants: copy(qualification.entrants), minutes: 90, score: [2, 1],
    decidedBy: 'normal-time', winner: 'Bayern Munich', annualRating: 7.2,
    player: { club: 'Bayern Munich', availability: 'available', selected: true, apps: 1, goals: 1,
      assists: 0, cleanSheets: 0, rating: 8, title: true },
  };
  row.apps = 43; row.goals = 15; row.rating = 7.2;
  expect(E.FALLBACK_CLUBS.some(club => club.name === 'Bayern Munich' && club.country === 'Germany')).toBe(true);
  expect(E.FALLBACK_CLUBS.some(club => club.name === 'Dortmund' && club.country === 'Germany')).toBe(true);
  return row;
}
function savedEnglish(): SeasonRecord {
  const qualification = {
    version: 1, competition: 'community-shield', status: 'ready', qualifyingYear: 2026, eventYear: 2027,
    seed: 1141312389, leagueWinner: 'Arsenal', cupWinner: 'Newcastle',
    entrants: [{ club: 'Arsenal', via: 'league-winner' }, { club: 'Newcastle', via: 'fa-cup-winner' }],
    proof: { league: { kind: 'league-world-close', year: 2026 }, cup: { kind: 'phone-world', year: 2026 } },
  };
  return { ...copy(cupSeason), apps: 43, goals: 15, rating: 7.2, extraCups: [{
    version: 1, competition: 'community-shield', qualifyingYear: 2026, eventYear: 2027, seed: 1141312389,
    qualification, entrants: copy(qualification.entrants), minutes: 90, score: [2, 1], decidedBy: 'normal-time',
    winner: 'Arsenal', annualRating: 7.2,
    player: { club: 'Arsenal', availability: 'available', selected: true, apps: 1, goals: 1,
      assists: 0, cleanSheets: 0, rating: 8, title: true },
  }] } as SeasonRecord;
}

describe('Soccer Career German Supercup first slice', () => {
  it('SC_GERMAN_PROSPECTIVE_CAPTURE: captures Germany globally from the same actual closed world', () => {
    const { closed, qualification } = actualClose('capture');
    const held = JSON.stringify(closed), actual = rawRoot(closed).germanSupercupQualification;
    retain('capture-before-owned-assertion', { closed, expected: qualification, actual });
    expect(!!actual,
      'SC_GERMAN_PROSPECTIVE_CAPTURE_MISSING: the actual close needs its separate future German qualification').toBe(true);
    expect(actual).toEqual(qualification);
    expect(Object.prototype.hasOwnProperty.call(closed, 'extraCupQualification')).toBe(true);
    expect(closed.currentClubCountry).toBe('England');
    expect(JSON.stringify(closed)).toBe(held);
  });

  it('SC_GERMAN_AUTOMATIC_OPENER: plays one saved German match for the current represented club', () => {
    const { closed, qualification } = actualClose('opening');
    const club = E.FALLBACK_CLUBS.find(value => same(value.name, qualification.entrants[0].club));
    expect(club, 'the actual qualifier must bind to the existing club table').toBeDefined();
    expect(club!.country).toBe('Germany');
    // Labelled consumer-phase/current-club copy, not a played transfer or loan. CAPTURE owns natural receipt creation.
    const opening: CareerState = { ...copy(closed), phase: 'playing', currentClub: club!.name,
      currentClubCountry: club!.country, currentClubTier: club!.tier, currentClubColor: club!.color, currentLeague: club!.league };
    rawRoot(opening).germanSupercupQualification = copy(qualification);
    const absent = copy(opening); delete rawRoot(absent).germanSupercupQualification;
    const held = JSON.stringify(opening), heldAbsent = JSON.stringify(absent);
    const presentRun = action(opening, state => E.advanceProSeason(state, E.FALLBACK_CLUBS));
    const absentRun = action(absent, state => E.advanceProSeason(state, E.FALLBACK_CLUBS));
    const row = presentRun.after.seasons[presentRun.after.seasons.length - 1]! as GermanRow;
    const annual = absentRun.after.seasons[absentRun.after.seasons.length - 1]!;
    retain('opening-before-owned-assertion', { qualification, opening, absent, presentRun, absentRun });
    expect(row.year).toBe(2030); expect(annual.year).toBe(2030);
    const result = row.germanSupercup;
    expect(!!result,
      'SC_GERMAN_AUTOMATIC_OPENER_MISSING: a represented valid German qualifier needs its actual saved opening match').toBe(true);
    expect(result!.qualification).toEqual(qualification); expect(result!.entrants).toEqual(qualification.entrants);
    expect(result!.eventYear).toBe(2030); expect(result!.minutes).toBe(90); expect(result!.player.club).toBe(club!.name);
    expect(result!.player.apps).toBe(result!.player.selected ? 1 : 0);
    expect(result!.player.title).toBe(result!.player.selected && same(result!.player.club, result!.winner));
    expect((result as unknown as { neutral?: unknown }).neutral).toBeUndefined();
    expect((result as unknown as { home?: unknown }).home).toBeUndefined();
    expect((annual as GermanRow).germanSupercup).toBeUndefined();
    expect(presentRun.draws).toEqual(absentRun.draws); expect(presentRun.finalLcgState).toBe(absentRun.finalLcgState);
    expect(presentRun.after.phone).toEqual(absentRun.after.phone);
    expect(presentRun.after.leagueWorld).toEqual(absentRun.after.leagueWorld);
    expect(presentRun.after.extraCupQualification).toEqual(absentRun.after.extraCupQualification);
    expect(row.extraCups).toEqual(annual.extraCups);
    expect(presentRun.after.seasons.slice(0, -1)).toEqual(absentRun.after.seasons.slice(0, -1));
    for (const key of ['apps', 'goals', 'assists', 'cleanSheets'] as const) expect(row[key]).toBe(annual[key] + result!.player[key]);
    expect(row.leagueApps).toBe(annual.leagueApps);
    if (result!.player.apps === 1) expect(result!.annualRating).toBe(annual.apps > 0 ? annual.rating : 0);
    const normalized = copy(row); delete normalized.germanSupercup;
    for (const key of ['apps', 'goals', 'assists', 'cleanSheets', 'rating'] as const) normalized[key] = annual[key];
    expect(normalized, 'every other annual field is held').toEqual(annual);
    const summary = presentRun.after.pendingSummary;
    if (summary?.year === row.year && same(summary.club, row.club)) expect(summary).toEqual(row);
    expect(JSON.stringify(opening)).toBe(held); expect(JSON.stringify(absent)).toBe(heldAbsent);
  });

  it('SC_GERMAN_SAVED_CABINET: counts a saved played German win once in its own cabinet category', () => {
    const row = savedGerman(), career = { seasons: [row] }, held = JSON.stringify(career);
    const wins = trophyWins(career, 'german-supercup' as TrophyCategory);
    const totals = E.getCareerTotals(career.seasons);
    retain('cabinet-before-owned-assertion', { career, wins, totals });
    expect(wins.length === 1,
      'SC_GERMAN_SAVED_CABINET_MISSING: a valid played German win needs a separate cabinet season').toBe(true);
    expect(wins).toEqual([row]);
    expect((totals as unknown as { germanSupercups?: number }).germanSupercups).toBe(1);
    expect(totals.communityShields).toBe(0);
    expect([totals.apps, totals.goals, totals.assists, totals.cleanSheets]).toEqual([43, 15, 9, 0]);
    expect(totals.domesticCups).toBe(0);
    expect(JSON.stringify(career)).toBe(held);
  });

  it('SC_GERMAN_SAVED_CALENDAR: reveals its distinct saved opener before league one without inventing a venue', () => {
    const row = savedGerman(), held = JSON.stringify(row);
    const opening = { id: 'german-supercup', name: 'German Supercup', result: 'Club won',
      matches: [{ round: 'Opening match', opponent: 'Dortmund', goalsFor: 2, goalsAgainst: 1, playerGoals: 1 }] } as unknown as SavedSeasonCompetition;
    const openingHeld = JSON.stringify(opening), calendar = cupCalendar([opening], 34);
    const projected = savedSeasonCompetitions({ lastUCLResult: null }, row);
    retain('calendar-before-owned-assertion', { row, opening, calendar, projected });
    expect(calendar.length === 1,
      'SC_GERMAN_SAVED_CALENDAR_MISSING: the distinct saved German opener needs a place before league game one').toBe(true);
    expect(calendar[0].id).toBe('german-supercup:0');
    expect(String(calendar[0].competition)).toBe('german-supercup');
    expect(calendar[0].afterLeague).toBe(0); expect(calendar[0].previous).toBeNull();
    expect(nextCupGame(calendar, 0, new Set())).toEqual(calendar[0]);
    expect(nextCupGame(calendar, 0, new Set([calendar[0].id]))).toBeNull();
    const item = projected.find(value => String(value.id) === 'german-supercup');
    expect(item, 'the same saved row must be reachable through actual competition navigation').toBeDefined();
    expect(item!.name).toBe('German Supercup'); expect(item!.matches).toHaveLength(1);
    expect(item!.matches[0]).toMatchObject(opening.matches[0]);
    expect(item!.matches[0].home).toBeUndefined(); expect(item!.matches[0].neutral).toBeUndefined();
    expect(JSON.stringify(row)).toBe(held); expect(JSON.stringify(opening)).toBe(openingHeld);
  });

  it('SC_GERMAN_ENGLISH_PRESERVED: keeps the existing full English result counter and neutral opening readable', () => {
    const row = savedEnglish(), held = JSON.stringify(row), match = copy(row.extraCups![0]);
    const read = readCommunityShield(row), totals = E.getCareerTotals([row]);
    const competition = savedSeasonCompetitions({ lastUCLResult: null }, row).find(value => value.id === 'shield');
    retain('english-preservation', { row, read, totals, competition });
    expect(read).toEqual(match); expect(JSON.stringify(read)).toBe(JSON.stringify(match));
    expect(row.extraCups).toHaveLength(1); expect(totals.communityShields).toBe(1);
    expect(trophyWins({ seasons: [row] }, 'shield')).toEqual([row]);
    expect(communityShieldAnnualStats(row)).toEqual({ apps: 42, goals: 14, assists: 9, cleanSheets: 0, rating: 7.2 });
    expect(competition).toBeDefined(); expect(competition!.matches[0].neutral).toBe(true);
    const calendar = cupCalendar([competition!], 38);
    expect(calendar).toHaveLength(1); expect(calendar[0].id).toBe('shield:0'); expect(calendar[0].afterLeague).toBe(0);
    expect(Object.prototype.hasOwnProperty.call(row, 'germanSupercup')).toBe(false);
    expect(JSON.stringify(row)).toBe(held);
  });
});
