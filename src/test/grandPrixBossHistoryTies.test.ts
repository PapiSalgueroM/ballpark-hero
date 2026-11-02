import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import type { GrandPrixCareer, GrandPrixOrder } from '@/lib/grandPrixBoss';

type Honors = { points: number; wins: number; podiums: number };
type Champion = Honors & { driverId: string; name: string; teamId: string };
type TeamChampion = Honors & { teamId: string; name: string };
type Career = GrandPrixCareer & {
  history: { driverChampion: Champion; constructorChampion: TeamChampion;
    team: TeamChampion & { position: number; drivers: (Honors & { driverId: string; name: string })[] } }[];
  careerTotals: { driverTitles: number; constructorTitles: number };
};
type Api = {
  createCareer(seed: number): Career;
  applyAction(state: Career, action: Record<string, unknown>): { ok: true; state: Career } | { ok: false; reason: string };
  validateSavedCareer(raw: unknown): { ok: true; state: Career } | { ok: false; reason: string };
};
const ENGINE_PATH = process.env.GP_BOSS_ENGINE_FILE ? path.resolve(process.env.GP_BOSS_ENGINE_FILE) : path.resolve(process.cwd(), 'src/lib/grandPrixBoss.ts');
let engine: Api;
beforeAll(async () => { engine = await import(/* @vite-ignore */ pathToFileURL(ENGINE_PATH).href) as Api; });
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const own = (state: Career) => state.drivers.filter(driver => driver.contract?.teamId === state.teamId);
const honors = (a: Honors, b: Honors) => b.points - a.points || b.wins - a.wins || b.podiums - a.podiums;
function move(state: Career, action: Record<string, unknown>) {
  const raw = JSON.stringify(state), result = engine.applyAction(state, { ...action, expectedRevision: state.revision });
  expect(JSON.stringify(state), 'GP_HISTORY_TIE_FIXTURE_INPUT_HELD').toBe(raw);
  expect(result.ok, 'GP_HISTORY_TIE_FIXTURE_ACTION_MUST_EXIST:' + action.type).toBe(true);
  if (result.ok === false) throw new Error('Unreachable refused fixture action');
  expect(engine.validateSavedCareer(result.state).ok, 'GP_HISTORY_TIE_REAL_STATE_MUST_BE_ADMITTED').toBe(true);
  return result.state;
}
function archived() {
  let state = engine.createCareer(291);
  for (let round = 0; round < 12; round += 1) {
    state = move(state, { type: 'qualify' });
    state = move(state, { type: 'startRace', setups: own(state).map(driver => ({ driverId: driver.id, pace: 'balanced', compound: state.race!.weather === 'wet' ? 'wet' : 'medium' })) });
    while (state.phase === 'race') {
      const orders: GrandPrixOrder[] = own(state).map(driver => {
        const entry = state.race!.entries.find(row => row.driverId === driver.id)!;
        let pitTo: GrandPrixOrder['pitTo'];
        if (state.race!.lap > 0 && entry.status === 'running') {
          if (state.race!.weather === 'wet' && entry.compound !== 'wet') pitTo = 'wet';
          else if (state.race!.weather === 'dry' && entry.compound === 'wet') pitTo = 'medium';
          else if (entry.tyreWear > 58) pitTo = state.race!.weather === 'wet' ? 'wet' : 'hard';
        }
        return { driverId: driver.id, pace: 'balanced', ...(pitTo ? { pitTo } : {}) };
      });
      state = move(state, { type: 'raceInterval', orders });
    }
    if (round < 11) state = move(state, { type: 'continue' });
  }
  state = move(state, { type: 'startNextSeason' });
  expect(state.history, 'GP_HISTORY_TIE_REQUIRES_ONE_REAL_ARCHIVE').toHaveLength(1);
  return state;
}

describe('Grand Prix Boss canonical archived title ties', { timeout: 120000 }, () => {
  it('GP_HISTORY_DRIVER_TIE: refuses a foreign equal-honors champion behind a known owned contender', () => {
    const state = archived(), changed = clone(state), row = changed.history[0];
    const best = row.team.drivers.slice().sort((a, b) => honors(a, b) || a.driverId.localeCompare(b.driverId))[0];
    const later = state.drivers.filter(driver => driver.contract && driver.contract.teamId !== state.teamId && best.driverId.localeCompare(driver.id) < 0)
      .sort((a, b) => a.id.localeCompare(b.id))[0];
    expect(later, 'Fixture requires a real foreign later-ID contender').toBeDefined();
    expect(best.driverId.localeCompare(later.id), 'Known owned contender must win the fixed ID tie').toBeLessThan(0);
    row.driverChampion = { driverId: later.id, name: later.name, teamId: later.contract!.teamId, points: best.points, wins: best.wins, podiums: best.podiums };
    changed.careerTotals.driverTitles = 0;
    const raw = JSON.stringify(changed);
    expect(engine.validateSavedCareer(changed), 'GP_HISTORY_DRIVER_ID_TIE_ACCEPTED').toEqual({ ok: false, reason: 'invalid' });
    expect(JSON.stringify(changed)).toBe(raw);
    expect(engine.validateSavedCareer(state).ok).toBe(true);
  });

  it('GP_HISTORY_TEAM_TIE: refuses a foreign equal-honors constructor behind the known owned team', () => {
    const state = archived(), changed = clone(state), row = changed.history[0];
    const laterTeam = state.teams.filter(team => team.id !== state.teamId && row.team.teamId.localeCompare(team.id) < 0)
      .sort((a, b) => a.id.localeCompare(b.id))[0];
    expect(laterTeam, 'Fixture requires a real foreign later-ID constructor').toBeDefined();
    expect(row.team.teamId.localeCompare(laterTeam.id), 'Known owned constructor must win the fixed ID tie').toBeLessThan(0);
    row.constructorChampion = { teamId: laterTeam.id, name: laterTeam.name, points: row.team.points, wins: row.team.wins, podiums: row.team.podiums };
    row.team.position = 2;
    // Give the foreign driver's separate tie a valid earlier ID, isolating the constructor tie.
    const best = row.team.drivers.slice().sort((a, b) => honors(a, b) || a.driverId.localeCompare(b.driverId))[0];
    const earlier = state.drivers.filter(driver => driver.contract && driver.contract.teamId !== state.teamId && driver.id.localeCompare(best.driverId) < 0)
      .sort((a, b) => a.id.localeCompare(b.id))[0];
    expect(earlier, 'Fixture requires a real foreign earlier-ID driver').toBeDefined();
    row.driverChampion = { driverId: earlier.id, name: earlier.name, teamId: earlier.contract!.teamId, points: best.points, wins: best.wins, podiums: best.podiums };
    expect(row.driverChampion.driverId.localeCompare(best.driverId)).toBeLessThan(0);
    changed.careerTotals.driverTitles = 0; changed.careerTotals.constructorTitles = 0;
    const raw = JSON.stringify(changed);
    expect(engine.validateSavedCareer(changed), 'GP_HISTORY_TEAM_ID_TIE_ACCEPTED').toEqual({ ok: false, reason: 'invalid' });
    expect(JSON.stringify(changed)).toBe(raw);
    expect(engine.validateSavedCareer(state).ok).toBe(true);
  });
});
