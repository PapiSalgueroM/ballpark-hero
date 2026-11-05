import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { takeFresh } from '@/lib/careerEventDeck';
import { applyEventChoice, dismissRivalryEvent, generateRandomEvents, getAllEvents, initCareer, SOCCER_RIVALRY_EVENTS, type CareerState, type ClubData, type RivalPlayer } from '@/lib/soccerCareerEngine';
import { isSoccerCareerSave, parseSoccerCareerSave, serializeSoccerCareerSave } from '@/lib/soccerCareerSave';

/* drawEventBatch calls this imported picker with its real eligible array.
   The wrapper records that argument and delegates every argument to the real picker. */
vi.mock('@/lib/careerEventDeck', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/careerEventDeck')>();
  return { ...actual, takeFresh: vi.fn(actual.takeFresh) };
});
const club: ClubData = { id: 'policy-events', name: 'Policy Events FC', country: 'Russia', league: 'Fixture League', color: '#123456', tier: 1 };
const rival: RivalPlayer = { name: 'Fixture Rival', nationality: 'England', position: 'ST', club: 'Other Fixture FC', clubTier: 1,
  overall: 75, careerGoals: 20, careerAssists: 10, careerApps: 50, leagueTitles: 0, championsLeagues: 1,
  worldCups: 0, ballonDors: 0, intCaps: 0, intGoals: 0, marketValue: 25, age: 25, retired: false };
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
function fixture(country = 'Russia', year = 2022): CareerState {
  const c = initCareer('Club Event Fixture', 'England', 'ST', '2020-24',
    { pace: 75, shooting: 75, passing: 75, dribbling: 75, defending: 75, physical: 75, reflexes: 75 }, 75, 2020, [club], null, 90);
  return { ...c, age: 25, currentClub: club.name, currentClubCountry: country, currentClubTier: 1, currentLeague: club.league,
    phase: 'playing', netWorth: 2, morale: 81, pendingEvents: [], seasons: [{ ...c.seasons[0], year, age: 25, club: club.name,
      clubCountry: country, clubTier: 1, type: 'playing', apps: 25, leagueApps: 24, goals: 9, assists: 5, rating: 7.2 }] };
}
function raw(name: string, frames: unknown) {
  if (!process.env.SC_CLUB_POLICY_RAW) return;
  mkdirSync(process.env.SC_CLUB_POLICY_RAW, { recursive: true });
  writeFileSync(join(process.env.SC_CLUB_POLICY_RAW, name + '.json'), JSON.stringify({ case: name,
    fixture: 'Fictional constructor-owned player, club and rival; existing catalog, picker, event taps and real codec.',
    frames, randomDraws: vi.mocked(Math.random).mock.results.map(row => row.value) }) + '\n');
}
function reload(input: CareerState) {
  const serialized = serializeSoccerCareerSave(input), output = parseSoccerCareerSave(serialized) as CareerState;
  expect(isSoccerCareerSave(output)).toBe(true); expect(output).toEqual(clone(input));
  return { serialized, output };
}
beforeEach(() => { vi.spyOn(Math, 'random').mockReturnValue(0.4); vi.spyOn(Date, 'now').mockReturnValue(1793793600000); vi.mocked(takeFresh).mockClear(); });
afterEach(() => vi.restoreAllMocks());

describe('Russian club policy in fresh and delivered event cards', () => {
  it('excludes a fresh European trip from the actual eligible pool while preserving foreign and pre-2022 eligibility', () => {
    const vectors = [['Russia', 2022], ['England', 2022], ['Russia', 2021]].map(([country, year]) => {
      const input = fixture(country as string, year as number), original = clone(input);
      const catalog = getAllEvents(input), at = vi.mocked(takeFresh).mock.calls.length;
      const output = generateRandomEvents(input), pools = vi.mocked(takeFresh).mock.calls.slice(at).map(call => call[0]);
      return { original, inputAfter: input, catalog, output, pools };
    });
    raw('fresh-passport-policy', vectors);
    expect(vectors.map(row => row.catalog.some(event => event.id === 65))).toEqual([true, true, true]);
    expect(vectors.map(row => row.pools.length)).toEqual([1, 1, 1]);
    expect(vectors.map(row => row.pools[0].some(event => event.id === 65)), 'SC_CLUB_POLICY_PASSPORT').toEqual([false, true, true]);
    expect(vectors[0].output.some(event => event.id === 65)).toBe(false);
  });

  it('excludes a fresh rivalry semifinal claim for a suspended employer while preserving foreign and pre-2022 gates', () => {
    const definition = SOCCER_RIVALRY_EVENTS.find(event => event.id === 107)!;
    const vectors = [['Russia', 2022], ['England', 2022], ['Russia', 2021]].map(([country, year]) => {
      const input = fixture(country as string, year as number), original = clone(input);
      return { original, input, rival, eligible: definition.when(input, rival), description: definition.description(input, rival) };
    });
    raw('fresh-rivalry-policy', vectors);
    expect(vectors.map(row => row.eligible), 'SC_CLUB_POLICY_RIVALRY').toEqual([false, true, true]);
    expect(definition.when(fixture('England', 2022), { ...rival, championsLeagues: 0 })).toBe(false);
    for (const row of vectors) expect(row.input).toEqual(row.original);
  });

  it('resolves an already delivered passport choice after real codec reload through the existing catalog', () => {
    const input = fixture(), catalog = getAllEvents(input);
    input.phase = 'random_events'; input.pendingEvents = [catalog.find(event => event.id === 65)!, catalog.find(event => event.id === 2)!];
    const original = clone(input), loaded = reload(input), at = vi.mocked(Math.random).mock.calls.length;
    const output = applyEventChoice(loaded.output, 0, [club]), reloaded = reload(output);
    raw('delivered-passport-choice', { original, loaded, output, reloaded, draws: vi.mocked(Math.random).mock.results.slice(at).map(row => row.value) });
    expect(loaded.output.pendingEvents[0].choices[0].apply).toBeUndefined();
    expect([output.netWorth, output.morale, output.lastEventId, output.pendingEvents.map(event => event.id), output.phase], 'SC_CLUB_POLICY_DELIVERED_PASSPORT').toEqual([1.8, 79, 65, [2], 'random_events']);
    expect(output.events).toContain('🛩️ Chartered a jet after the passport chaos and made kickoff'); expect(reloaded.output).toEqual(clone(output));
  });

  it('resolves an already delivered rivalry card after real codec reload without rechecking its fresh gate', () => {
    const input = fixture(), definition = SOCCER_RIVALRY_EVENTS.find(event => event.id === 107)!;
    input.rival = clone(rival); input.phase = 'rivalry_event'; input.socialMediaActionUsedThisSeason = false;
    input.pendingRivalryEvent = { id: definition.id, emoji: definition.emoji, title: definition.title,
      description: definition.description(input, rival), consequence: typeof definition.consequence === 'function' ? definition.consequence(input, rival) : definition.consequence };
    const original = clone(input), loaded = reload(input), at = vi.mocked(Math.random).mock.calls.length;
    const output = dismissRivalryEvent(loaded.output, [club]), reloaded = reload(output);
    raw('delivered-rivalry-dismissal', { original, loaded, output, reloaded, draws: vi.mocked(Math.random).mock.results.slice(at).map(row => row.value) });
    expect([output.morale, output.statBoostNextSeason.physical, output.lastRivalryEventId, output.pendingRivalryEvent, output.phase], 'SC_CLUB_POLICY_DELIVERED_RIVALRY').toEqual([76, 1, 107, null, 'social_media_action']);
    expect(output.events).toContain('⭐ Rival Wins Champions League'); expect(reloaded.output).toEqual(clone(output));
  });
});
