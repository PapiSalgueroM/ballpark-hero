import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CareerState, RandomEvent } from '@/lib/soccerCareerEngine';
import * as E from '@/lib/soccerCareerEngine';
import * as L from '@/lib/soccerCareerLife';
import { getSoccerRoutineEvents } from '@/lib/soccerCareerRoutineEvents';
import { isSoccerCareerSave, parseSoccerCareerSave, serializeSoccerCareerSave } from '@/lib/soccerCareerSave';

/* Release BF join (Round BFG), the lead's decision 4: every field the Soccer Career life chain (Rounds 1350 to 1363)
   writes survives a reload through Release BE's codec, packed and plain. A fictional career is made long enough to
   cross the 60000 character threshold, given the chain's queued cards (a routine choice, the coursework 630, the
   documentary review 631, the repayment 237, Wrong City 222, the statue 233), its life flags, ledger stamps and a
   queued skill reward, then saved and loaded through the codec. After the load every queued card still resolves from
   the actual catalog although its fresh gate has moved (morale up, popularity down), and the first one answers. */

const json = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
afterEach(() => { vi.restoreAllMocks(); });

function career(rows: number): CareerState {
  vi.spyOn(Math, 'random').mockReturnValue(0.9);
  const stats = { pace: 70, shooting: 70, passing: 70, dribbling: 70, defending: 70, physical: 70, reflexes: 70 };
  const base = E.initCareer('Chain Save Fixture', 'England', 'CM', '2020s', stats, 70, 2000, E.FALLBACK_CLUBS, null, 90);
  const club = E.FALLBACK_CLUBS[0];
  const row = { ...base.seasons[0], club: club.name, clubCountry: club.country, clubTier: club.tier, type: 'playing', apps: 30,
    leagueApps: 26, goals: 4, assists: 6, cleanSheets: 0, yellowCards: 2, redCards: 0, rating: 7, injury: null, injuryWeeks: 0, injurySevere: false };
  const seasons = Array.from({ length: rows }, (_, i) => ({ ...row, year: 2026 - rows + 1 + i, age: 30 - rows + 1 + i }));
  return json({ ...base, age: 30, phase: 'random_events', retired: false, personality: 'professor', agentId: 'self',
    currentClub: club.name, currentClubCountry: club.country, currentClubTier: club.tier, currentClubColor: club.color,
    currentLeague: club.league, morale: 50, popularity: 70, netWorth: 10, seasons, pendingEvents: [],
    lifeFlags: { coachingBadges: 1, rDocCrew: 1, teammateLoan: 1 }, eventLastFired: { '270': 2025, '408': 2025, '236': 2025 },
    statBoostNextSeason: { reflexes: 2, passing: 1 } } as unknown as CareerState);
}

function queued(state: CareerState): CareerState {
  vi.spyOn(Math, 'random').mockReturnValue(0.99);
  const catalog = L.getLifeEvents(state), pick = (id: number) => catalog.find(card => card.id === id) as RandomEvent;
  const routine = getSoccerRoutineEvents(state)[0];
  expect(routine, 'a routine choice is offered to this fixture').toBeTruthy();
  const ids = [routine.id, 630, 631, 237, 222, 233];
  for (const id of ids.slice(1)) expect(pick(id), `card ${id} is in the catalog before the save`).toBeTruthy();
  /* the saved shape: choices without apply, as the page stores them */
  const pendingEvents = json([routine, ...ids.slice(1).map(pick)]);
  return json({ ...state, pendingEvents, morale: 90, popularity: 10 });
}

function reload(state: CareerState, packed: boolean) {
  const raw = JSON.stringify(state), stored = serializeSoccerCareerSave(state);
  expect(raw.length > 60000).toBe(packed);
  if (packed) expect(JSON.parse(stored).seasons.format).toBe('lz-string-utf16'); else expect(stored).toBe(raw);
  const loaded = parseSoccerCareerSave(stored) as CareerState;
  expect(JSON.stringify(loaded)).toBe(raw);
  expect(isSoccerCareerSave(loaded)).toBe(true);
  return loaded;
}

describe('the life chain through the Soccer Career save codec', () => {
  for (const [label, rows, packed] of [['packed', 220, true], ['plain', 3, false]] as const) {
    it(`${label}: queued cards, flags, stamps and rewards come back and still resolve`, () => {
      const before = queued(career(rows));
      const loaded = reload(before, packed);
      const repaired = E.repairCareer(json(loaded));
      expect(repaired.pendingEvents.map(card => card.id)).toEqual(before.pendingEvents.map(card => card.id));
      expect(repaired.lifeFlags).toMatchObject({ coachingBadges: 1, rDocCrew: 1, teammateLoan: 1 });
      expect(repaired.eventLastFired).toMatchObject({ '270': 2025, '408': 2025, '236': 2025 });
      expect(repaired.statBoostNextSeason).toMatchObject({ reflexes: 2, passing: 1 });
      vi.spyOn(Math, 'random').mockReturnValue(0.99);
      const offered = new Set(L.getLifeEvents(repaired).map(card => card.id));
      for (const card of before.pendingEvents) expect(offered.has(card.id), `card ${card.id} resolves after the load`).toBe(true);
      const answered = E.applyEventChoice(repaired, 0, E.FALLBACK_CLUBS);
      expect(answered.lastEventId).toBe(before.pendingEvents[0].id);
      expect(answered.pendingEvents.map(card => card.id)).toEqual(before.pendingEvents.slice(1).map(card => card.id));
    });
  }
});
