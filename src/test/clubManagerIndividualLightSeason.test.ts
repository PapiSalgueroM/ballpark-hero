import {afterEach, describe, expect, it, vi} from 'vitest';
import type {CareerState, CMPlayer, IndividualLightSeasonRequest, TrainingPlan} from '@/lib/clubManager';

type Engine = typeof import('@/lib/clubManager');
const NOW = 1791586800000;
const tiredId = 'p-el-hadji-malick-diouf', growthId = 'p-igor-thiago', loanId = 'p-kaye-furo';

function tape<T>(seed: number, action: () => T, skip = 0) {
  const random = Math.random, now = Date.now, draws: number[] = [];
  let n = seed >>> 0;
  const draw = () => { n += 0x6D2B79F5; let t = n; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  for (let i = 0; i < skip; i++) draw();
  Math.random = () => { const value = draw(); draws.push(value); return value; };
  Date.now = () => NOW;
  try { return {value: action(), draws, next: draw()}; }
  finally { Math.random = random; Date.now = now; }
}

function noDraw<T>(action: () => T): T {
  const random = Math.random;
  Math.random = () => { throw new Error('A read, choice or refusal must not draw'); };
  try { return action(); } finally { Math.random = random; }
}

function owned(state: CareerState, id: string): CMPlayer {
  const matches = state.squad.filter(p => p.id === id);
  if (matches.length !== 1) throw new Error('The earned actor must remain uniquely owned: ' + id);
  return matches[0];
}

function unique(E: Engine, state: CareerState) {
  expect(new Set(state.squad.map(p => p.id)).size).toBe(state.squad.length);
  expect(new Set(state.squad.map(p => E.sameManKey(p))).size).toBe(state.squad.length);
}

function request(E: Engine, state: CareerState, p: CMPlayer): IndividualLightSeasonRequest {
  return {source: state, player: p, data: {version: 1, clubName: state.clubName, season: state.season, playerId: p.id, manKey: E.sameManKey(p), ...(typeof p.worldRosterKey === 'string' ? {worldRosterKey: p.worldRosterKey} : {})}};
}

function commit(E: Engine, state: CareerState, id: string): CareerState {
  const next = noDraw(() => E.setIndividualLightSeason(state, request(E, state, owned(state, id))));
  if (!next) throw new Error('The genuine current-owned choice must be accepted');
  return next;
}

async function actor() {
  vi.resetModules();
  const E = await import('@/lib/clubManager');
  const boot = tape(64002, () => E.startCareer('Brentford'));
  const normal = E.setTrainingPlan(boot.value, {intensity: 'normal', focus: 'balanced'});
  const first = tape(65002, () => E.playNextEntry(normal, {skipHalftime: true}));
  expect(first.value.kind).toBe('match');
  const state = first.value.state;
  expect(state.week).toBe(1);
  expect(owned(state, tiredId).fitness).toBeLessThan(100);
  unique(E, state);
  return {E, state, boot, first};
}

function official(E: Engine, state: CareerState) {
  localStorage.clear();
  expect(E.saveCareer(state)).toBe(true);
  const raw = localStorage.getItem(E.SAVE_KEY);
  if (raw === null) throw new Error('Official save must exist');
  const loaded = E.loadCareer();
  if (!loaded) throw new Error('Official load must accept the genuine saved career');
  unique(E, loaded);
  return {raw, loaded};
}

async function playedRecovery(kind: 'normal' | 'teamLight' | 'individual') {
  const a = await actor(), input = JSON.stringify(a.state);
  const state = kind === 'individual' ? commit(a.E, a.state, tiredId)
    : a.E.setTrainingPlan(a.state, {intensity: kind === 'teamLight' ? 'light' : 'normal', focus: 'balanced'});
  expect(state.calendar[state.week].night).toBeUndefined();
  const before = JSON.stringify(state);
  const action = tape(65002, () => a.E.playNextEntry(state, {skipHalftime: true}), a.first.draws.length);
  expect(action.value.kind).toBe('match');
  expect(JSON.stringify(state)).toBe(before);
  unique(a.E, action.value.state);
  return {...a, input, action};
}

async function returnEpisode(kind: 'normal' | 'teamLight' | 'individual') {
  const a = await actor();
  let state = kind === 'individual' ? commit(a.E, a.state, loanId) : a.state;
  expect(a.E.loanOutRefusal(state, loanId)).toBeNull();
  const departed = tape(76002, () => a.E.loanOutPlayer(state, loanId));
  if (!departed.value) throw new Error('The measured public loan-out must be legal');
  state = departed.value;
  const calendar = tape(76003, () => {
    let steps = 0;
    while (state.week < state.calendar.length && steps++ < 140) {
      const result = a.E.playNextEntry(state, {skipHalftime: true});
      state = result.state;
      if (result.kind === 'seasonOver') break;
    }
    expect(state.week).toBe(state.calendar.length);
    return a.E.finishSeason(state).state;
  });
  const finished = a.E.setTrainingPlan(calendar.value, {intensity: kind === 'teamLight' ? 'light' : 'normal', focus: 'balanced'});
  if (kind === 'individual') {
    expect(a.E.lightSeasonReservation(finished)).not.toBeNull();
    expect(a.E.lightSeasonPlayer(finished)).toBeNull();
    expect(a.E.lightSeasonPlayer(finished, true)?.id).toBe(loanId);
    expect(noDraw(() => a.E.setIndividualLightSeason(finished, null))).toBeNull();
  }
  const before = JSON.stringify(finished), annual = tape(80008, () => a.E.startNextSeason(finished));
  expect(JSON.stringify(finished)).toBe(before);
  unique(a.E, annual.value);
  return {...a, finished, calendar, annual};
}

afterEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

describe('Individual Light season through public Club Manager APIs', () => {
  it('keeps one earned reservation through refusals a legal departure and official save reload', async () => {
    const {E, state} = await actor(), p = owned(state, tiredId), quote = request(E, state, p), before = JSON.stringify(state);
    const selected = noDraw(() => E.setIndividualLightSeason(state, quote));
    if (!selected) throw new Error('Expected an earned owned choice');
    const {individualLightSeason, ...core} = selected;
    expect(core).toStrictEqual(state);
    expect(individualLightSeason).toEqual(quote.data);
    expect(E.lightSeasonPlayer(selected)?.id).toBe(p.id);
    const other = state.squad.find(q => q.id !== p.id && !q.onLoan);
    if (!other) throw new Error('The genuine squad must contain another owned player');
    expect(noDraw(() => E.setIndividualLightSeason(selected, null))).toBeNull();
    expect(noDraw(() => E.setIndividualLightSeason(selected, request(E, selected, other)))).toBeNull();
    const replaced = structuredClone(state);
    expect(noDraw(() => E.setIndividualLightSeason(replaced, quote))).toBeNull();
    expect(JSON.stringify(state)).toBe(before);
    const loanActor = await actor(), loanEngine = loanActor.E, loanSelected = commit(loanEngine, loanActor.state, loanId);
    const out = tape(76002, () => loanEngine.loanOutPlayer(loanSelected, loanId));
    if (!out.value) throw new Error('Expected the measured legal public loan out');
    const away = out.value, reservation = loanEngine.lightSeasonReservation(away), awayBefore = JSON.stringify(away);
    expect(reservation).not.toBeNull();
    expect(loanEngine.lightSeasonPlayer(away)).toBeNull();
    expect(loanEngine.lightSeasonPlayer(away, true)?.id).toBe(loanId);
    expect(noDraw(() => loanEngine.setIndividualLightSeason(away, request(loanEngine, away, owned(away, tiredId))))).toBeNull();
    const saved = noDraw(() => official(loanEngine, away));
    expect(saved.raw).toBe(JSON.stringify(loanEngine.trimCareer(away)));
    expect(loanEngine.lightSeasonReservation(saved.loaded)).toEqual(reservation);
    expect(loanEngine.lightSeasonPlayer(saved.loaded)).toBeNull();
    expect(loanEngine.lightSeasonPlayer(saved.loaded, true)?.id).toBe(loanId);
    expect(noDraw(() => loanEngine.setIndividualLightSeason(saved.loaded, null))).toBeNull();
    expect(JSON.stringify(away)).toBe(awayBefore);
  });

  it('uses Light recovery on an actual public weekly match for only the selected player', async () => {
    const normal = await playedRecovery('normal'), light = await playedRecovery('teamLight'), individual = await playedRecovery('individual');
    expect(individual.input).toBe(normal.input); expect(light.input).toBe(normal.input);
    expect(individual.first.draws).toEqual(normal.first.draws); expect(individual.first.next).toBe(normal.first.next);
    const a = individual.action.value.state, n = normal.action.value.state, l = light.action.value.state;
    expect(owned(a, tiredId).fitness).toBe(owned(l, tiredId).fitness);
    expect(owned(a, tiredId).fitness).toBeGreaterThan(owned(n, tiredId).fitness);
    expect(a.squad.filter(p => p.id !== tiredId)).toStrictEqual(n.squad.filter(p => p.id !== tiredId));
    expect(individual.action.draws).toEqual(normal.action.draws); expect(individual.action.next).toBe(normal.action.next);
  });

  it('keeps published positive development at Light after a late plan toggle without double charging', async () => {
    const {E, state} = await actor(), p = owned(state, growthId), selected = commit(E, state, growthId);
    const normal = noDraw(() => E.developmentRate(p, state));
    const teamLight = E.setTrainingPlan(state, {intensity: 'light', focus: 'balanced'});
    const expected = noDraw(() => E.developmentRate(owned(teamLight, growthId), teamLight));
    expect(expected).toBeLessThan(normal);
    expect(noDraw(() => E.developmentRate(owned(selected, growthId), selected))).toBe(expected);
    const doubleLight = E.setTrainingPlan(selected, {intensity: 'light', focus: 'balanced'});
    expect(noDraw(() => E.developmentRate(owned(doubleLight, growthId), doubleLight))).toBe(expected);
    const lateNormal = E.setTrainingPlan(doubleLight, {intensity: 'normal', focus: 'balanced'});
    expect(noDraw(() => E.developmentRate(owned(lateNormal, growthId), lateNormal))).toBe(expected);
    expect(noDraw(() => E.setIndividualLightSeason(lateNormal, null))).toBeNull();
  });

  it('preserves default full trimmed lean official save and next draw after optional reads and refusal', async () => {
    for (const intensity of ['light', 'normal', 'double'] as TrainingPlan['intensity'][]) {
      const run = async (inspect: boolean) => {
        const actorState = await actor(), E = actorState.E, state = E.setTrainingPlan(actorState.state, {intensity, focus: 'balanced'}), before = JSON.stringify(state);
        const action = tape(65002, () => {
          if (inspect) { expect(E.lightSeasonReservation(state)).toBeNull(); expect(E.lightSeasonPlayer(state)).toBeNull(); expect(E.setIndividualLightSeason(state, null)).toBeNull(); }
          return E.playNextEntry(state, {skipHalftime: true});
        }, actorState.first.draws.length);
        expect(JSON.stringify(state)).toBe(before);
        const save = noDraw(() => official(E, action.value.state));
        return {full: action.value.state, trim: E.trimCareer(action.value.state), lean: E.leanCareer(action.value.state), raw: save.raw, loaded: save.loaded, draws: action.draws, next: action.next};
      };
      expect(await run(true)).toStrictEqual(await run(false));
    }
  });

  it('settles a returning owned loan at Light then expires the reservation for the next season', async () => {
    const actual = await returnEpisode('individual'), normal = await returnEpisode('normal'), light = await returnEpisode('teamLight');
    const a = owned(actual.annual.value, loanId), n = owned(normal.annual.value, loanId), l = owned(light.annual.value, loanId);
    expect(a.rating).toBe(l.rating); expect(a.rating).toBeLessThan(n.rating);
    expect(actual.annual.value.season).toBe(actual.finished.season + 1);
    expect(actual.E.lightSeasonReservation(actual.finished)).not.toBeNull();
    expect(actual.E.lightSeasonReservation(actual.annual.value)).toBeNull();
    expect(Object.prototype.hasOwnProperty.call(actual.annual.value, 'individualLightSeason')).toBe(false);
    expect(commit(actual.E, actual.annual.value, loanId).individualLightSeason?.season).toBe(actual.annual.value.season);
  }, 180_000);
});
