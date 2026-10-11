import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { answerSoccerPress, pressRoomView, settleSoccerPress } from '@/lib/soccerCareerPress';
import { advanceProSeason, applyRehabChoice, dismissNewspaper, FALLBACK_CLUBS, type CareerState, type SeasonRecord } from '@/lib/soccerCareerEngine';

function savedRow(patch: Partial<SeasonRecord> = {}): SeasonRecord {
  return { year: 2028, age: 25, club: 'Twente', clubCountry: 'Netherlands', clubTier: 3,
    apps: 28, leagueApps: 24, goals: 14, assists: 8, cleanSheets: 10, yellowCards: 0, redCards: 0, rating: 7.1,
    leagueTitle: false, domesticCup: false, championsLeague: false, worldCup: false, ballonDor: false, ballonDorRank: null,
    type: 'playing', intApps: 0, intGoals: 0, intAssists: 0, intRating: 0, tournament: null, tournamentResult: null, ...patch };
}
function career(position = 'ST', patch: Partial<CareerState> = {}): CareerState {
  const data = JSON.parse(readFileSync(resolve(process.cwd(), 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8'));
  const base = structuredClone(data.saves.find((s: { id: string }) => s.id === 'ere').state) as CareerState;
  const state = { ...base, playerName: 'Recorded Press Player', position, age: 25, phase: 'playing' as const, retired: false,
    currentClub: 'Twente', currentClubCountry: 'Netherlands', currentClubTier: 3, currentLeague: 'Eredivisie',
    contractYearsLeft: 3, seasons: [savedRow()], popularity: 50, morale: 50, events: [], story: [], awards: [],
    pendingSummary: null, pendingBallonDor: null, pendingRehab: null, matchFixBanned: 0, prisonSeasons: 0,
    corruptionHeat: 0, dirtyMoney: 0, pedActive: false, pedSeasonsRemaining: 0, ...patch };
  delete state.pressRoom;
  return state;
}
function held(position = 'ST', patch: Partial<CareerState> = {}): CareerState {
  return answerSoccerPress(career(position, patch), 'ambitious');
}
function record(state: CareerState, patch: Partial<SeasonRecord> = {}): SeasonRecord {
  const last = state.seasons[state.seasons.length - 1];
  const row = savedRow({ year: last.year + 1, age: last.age + 1, ...patch });
  state.seasons = [...state.seasons, row];
  return row;
}
afterEach(() => vi.restoreAllMocks());

describe('Soccer Press answers and recorded context', () => {
  it.each([
    ['calm', 48, 53, 50], ['accountable', 53, 47, 52], ['ambitious', 50, 46, 50],
  ] as const)('answer %s changes only its stated meters and new history', (choice, popularity, morale, credibility) => {
    const input = career(), before = structuredClone(input);
    vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Press answers must not draw'); });
    const next = answerSoccerPress(input, choice);
    expect(input).toEqual(before);
    expect({ ...next, popularity: input.popularity, morale: input.morale, pressRoom: undefined }).toEqual({ ...input, pressRoom: undefined });
    expect([next.popularity, next.morale, next.pressRoom?.credibility]).toEqual([popularity, morale, credibility]);
    expect(next.pressRoom?.history).toHaveLength(1);
    expect(next.pressRoom?.history[0].choice).toBe(choice);
    expect(answerSoccerPress(next, choice)).toBe(next);
    expect(answerSoccerPress(next, 'accountable')).toBe(next);
  });

  it.each([
    ['GK', 'cleanSheets', 12, undefined],
    ['CB', 'apps', 30, 7], ['LB', 'apps', 30, 7], ['RB', 'apps', 30, 7], ['LWB', 'apps', 30, 7], ['RWB', 'apps', 30, 7],
    ['CDM', 'assists', 10, undefined], ['CM', 'assists', 10, undefined], ['CAM', 'assists', 10, undefined], ['LM', 'assists', 10, undefined], ['RM', 'assists', 10, undefined],
    ['LW', 'goals', 17, undefined], ['RW', 'goals', 17, undefined], ['ST', 'goals', 17, undefined], ['CF', 'goals', 17, undefined],
  ] as const)('promise %s captures the right saved statistic and target', (position, metric, target, ratingFloor) => {
    const next = held(position), promise = next.pressRoom!.history[0].promise!;
    expect(promise).toMatchObject({ club: 'Twente', metric, target, outcome: 'pending' });
    expect(promise.ratingFloor).toBe(ratingFloor);
    expect(next.pressRoom!.history[0].source.position).toBe(position);
    expect(pressRoomView(next).history[0].promise).toEqual(promise);
  });

  it('uses floors for modest seasons and a 38 appearance cap for defenders', () => {
    for (const [position, patch, target] of [
      ['GK', { cleanSheets: 0 }, 12], ['CM', { assists: 0 }, 10], ['ST', { goals: 0 }, 15],
      ['CB', { apps: 12 }, 24], ['CB', { apps: 54 }, 38], ['ST', { goals: 100 }, 103],
    ] as const) expect(held(position, { seasons: [savedRow(patch)] }).pressRoom!.history[0].promise!.target).toBe(target);
  });

  it('binds a new promise to the current club after a move while retaining the source club', () => {
    const state = held('ST', { currentClub: 'PSV' });
    expect(state.pressRoom!.history[0].source.club).toBe('Twente');
    expect(state.pressRoom!.history[0].promise?.club).toBe('PSV');
    expect(state.pressRoom!.history[0].promise?.label).toContain('at PSV');
    const row = record(state, { club: 'PSV', goals: 17 });
    settleSoccerPress(state, row);
    expect(state.pressRoom!.history[0].promise?.outcome).toBe('met');
  });

  it('keeps duplicate year and club records distinct by their original index', () => {
    const state = answerSoccerPress(career(), 'calm');
    state.seasons = [...state.seasons, savedRow({ onLoanFrom: 'PSV' })];
    const next = answerSoccerPress(state, 'accountable');
    expect(next.pressRoom!.history.map(h => h.source.index)).toEqual([0, 1]);
    expect(next.pressRoom!.history.map(h => [h.source.year, h.source.club])).toEqual([[2028, 'Twente'], [2028, 'Twente']]);
    expect(pressRoomView(next).history.map(h => h.source.index)).toEqual([1, 0]);
  });

  it.each([
    { seasons: [] }, { seasons: [savedRow({ type: 'youth' })] },
    { seasons: [savedRow(), savedRow({ year: 2029, apps: 0 })] },
    { seasons: [savedRow({ club: 'BANNED', apps: 1 })] },
    { phase: 'newspaper' }, { retired: true }, { position: 'unknown' },
  ] as Partial<CareerState>[])('does not answer without an eligible latest recorded season %j', patch => {
    const state = career('ST', patch), before = structuredClone(state);
    expect(pressRoomView(state).eligible).toBe(false);
    expect(answerSoccerPress(state, 'calm')).toBe(state);
    expect(state).toEqual(before);
    expect(Object.prototype.hasOwnProperty.call(state, 'pressRoom')).toBe(false);
  });

  it('skips non-playing rows but never searches past a missed senior year', () => {
    const state = career('ST', { seasons: [savedRow(), savedRow({ year: 2029, type: 'manager', apps: 0 })] });
    expect(pressRoomView(state).source?.index).toBe(0);
    state.seasons.splice(1, 0, savedRow({ year: 2029, apps: 0 }));
    expect(pressRoomView(state).source).toBeNull();
  });

  it('disables only the ambitious choice when its position-specific saved stat is missing', () => {
    const state = career('CM');
    delete (state.seasons[0] as Partial<SeasonRecord>).assists;
    const view = pressRoomView(state);
    expect(view.eligible).toBe(true);
    expect(view.source?.assists).toBeNull();
    expect(view.question).toContain('assists not recorded');
    expect(view.options.find(o => o.id === 'ambitious')?.eligible).toBe(false);
    expect(answerSoccerPress(state, 'ambitious')).toBe(state);
    expect(answerSoccerPress(state, 'calm').pressRoom?.history).toHaveLength(1);
  });

  it('does not open a second promise while a recorded follow-up is still pending', () => {
    const state = held();
    record(state);
    const view = pressRoomView(state);
    expect(view.eligible).toBe(true);
    expect(view.options.find(o => o.id === 'ambitious')?.eligible).toBe(false);
    expect(answerSoccerPress(state, 'ambitious')).toBe(state);
    expect(answerSoccerPress(state, 'calm').pressRoom!.history).toHaveLength(2);
  });

  it('clamps only the stated meters and leaves unknown choices untouched', () => {
    const state = career('ST', { popularity: 1, morale: 99 });
    expect(answerSoccerPress(state, 'unknown')).toBe(state);
    const next = answerSoccerPress(state, 'calm');
    expect([next.popularity, next.morale]).toEqual([0, 100]);
    expect(next.seasons).toBe(state.seasons);
    expect(next.awards).toBe(state.awards);
    expect(next.events).toBe(state.events);
  });

  it('reads recorded history after retirement without allowing a new answer', () => {
    const state = answerSoccerPress(career(), 'accountable');
    state.retired = true;
    state.phase = 'retired';
    const view = pressRoomView(state);
    expect(view.eligible).toBe(false);
    expect(view.history).toHaveLength(1);
    expect(view.credibility).toBe(52);
    expect(answerSoccerPress(state, 'ambitious')).toBe(state);
  });
});

describe('Soccer Press facts and questions', () => {
  it.each([
    ['league_champion', { leagueTitle: true }, {}], ['injury', { injury: 'Recorded ankle injury' }, {}],
    ['benched', { apps: 14 }, {}], ['move', {}, { currentClub: 'PSV' }],
    ['discipline', { redCards: 1, rating: 8 }, {}], ['strong_form', { rating: 7.5 }, {}],
    ['contract', {}, { contractYearsLeft: 1 }], ['normal', {}, {}],
  ] as const)('uses three different deterministic questions for %s', (topic, patch, statePatch) => {
    vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Press questions must not draw'); });
    const questions = [2028, 2029, 2030].map(year => {
      const state = career('ST', { seasons: [savedRow({ ...patch, year })], ...statePatch }), before = structuredClone(state);
      const view = pressRoomView(state);
      expect(view.topic).toBe(topic);
      expect(view.question).toContain(`${year}`);
      expect(view.question).toContain(view.source!.statLine);
      expect(pressRoomView(state).question).toBe(view.question);
      expect(state).toEqual(before);
      return view.question.split(view.source!.statLine)[1];
    });
    expect(new Set(questions).size).toBe(3);
  });

  it('uses recorded topic priority when the same season has several facts', () => {
    const state = career('ST', { currentClub: 'PSV', contractYearsLeft: 0,
      seasons: [savedRow({ leagueTitle: true, injury: 'Recorded injury', apps: 10, redCards: 1, rating: 9 })] });
    expect(pressRoomView(state).topic).toBe('league_champion');
    state.seasons[0].leagueTitle = false;
    expect(pressRoomView(state).topic).toBe('injury');
    state.seasons[0].injury = null;
    expect(pressRoomView(state).topic).toBe('benched');
    state.seasons[0].apps = 28;
    expect(pressRoomView(state).topic).toBe('move');
    state.currentClub = 'Twente';
    expect(pressRoomView(state).topic).toBe('discipline');
  });

  it('does not read pending awards or expose a future award in questions or history', () => {
    const state = career();
    Object.defineProperty(state, 'pendingBallonDor', { get: () => { throw new Error('No pending award read'); } });
    Object.defineProperty(state, 'awards', { get: () => { throw new Error('No award read'); } });
    Object.defineProperty(state.seasons[0], 'ballonDor', { get: () => { throw new Error('No season award read'); } });
    expect(pressRoomView(state).eligible).toBe(true);
    expect(pressRoomView(state).topic).toBe('normal');
    expect(pressRoomView(state).question).not.toMatch(/Ballon|award|winner/i);
  });

  it('returns detached readable records without changing the saved answer or promise', () => {
    const state = held(), before = structuredClone(state);
    const view = pressRoomView(state);
    view.history[0].source.club = 'Changed';
    view.history[0].promise!.target = 1;
    expect(state).toEqual(before);
  });
});

describe('Soccer Press once-only settlement', () => {
  it.each([
    ['ST', { goals: 17 }, 'met', 56, 49, 58], ['ST', { goals: 16 }, 'missed', 44, 43, 42],
    ['GK', { cleanSheets: 12 }, 'met', 56, 49, 58], ['CM', { assists: 10 }, 'met', 56, 49, 58],
    ['CB', { apps: 30, rating: 7 }, 'met', 56, 49, 58], ['CB', { apps: 30, rating: 6.9 }, 'missed', 44, 43, 42],
  ] as const)('settles %s from the exact next recorded line %j', (position, patch, outcome, popularity, morale, credibility) => {
    const state = held(position), row = record(state, patch), line = structuredClone(row), original = structuredClone(state.pressRoom);
    vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Press settlement must not draw'); });
    settleSoccerPress(state, row);
    expect(state.pressRoom!.history[0].promise).toMatchObject({ outcome, settledYear: 2029, settledIndex: 1 });
    expect([state.popularity, state.morale, state.pressRoom!.credibility]).toEqual([popularity, morale, credibility]);
    expect(row).toEqual(line);
    expect(original!.history[0].promise!.outcome).toBe('pending');
    expect(pressRoomView(state).history[0].promise?.outcome).toBe(outcome);
    const once = structuredClone(state);
    settleSoccerPress(state, row);
    expect(state).toEqual(once);
  });

  it('uses the answer-time position even if the current position changes', () => {
    const state = held('CM');
    state.position = 'ST';
    const row = record(state, { assists: 10, goals: 0 });
    settleSoccerPress(state, row);
    expect(state.pressRoom!.history[0].promise).toMatchObject({ metric: 'assists', target: 10, actual: 10, outcome: 'met' });
  });

  it.each([
    { apps: 0, goals: 0 }, { injurySevere: true, goals: 30 },
    { club: 'BANNED', apps: 0 }, { club: 'BANNED (PED)', apps: 0 },
    { club: 'PRISON', apps: 0 }, { club: 'CONVICTED', apps: 0 },
  ] as Partial<SeasonRecord>[])('excuses a recorded interruption without met or missed effects %j', patch => {
    const state = held(), row = record(state, patch);
    settleSoccerPress(state, row);
    expect(state.pressRoom!.history[0].promise?.outcome).toBe('excused');
    expect([state.popularity, state.morale, state.pressRoom!.credibility]).toEqual([50, 46, 50]);
  });

  it('ends a move without paying or punishing the promise at the former club', () => {
    const state = held(), row = record(state, { club: 'PSV', goals: 30 });
    settleSoccerPress(state, row);
    expect(state.pressRoom!.history[0].promise).toMatchObject({ club: 'Twente', outcome: 'moved', actual: 30 });
    expect([state.popularity, state.morale, state.pressRoom!.credibility]).toEqual([50, 46, 50]);
  });

  it('preserves missing saved metrics instead of turning them into a missed target', () => {
    const state = held(), row = record(state);
    delete (row as Partial<SeasonRecord>).goals;
    settleSoccerPress(state, row);
    expect(state.pressRoom!.history[0].promise?.outcome).toBe('excused');
    expect(state.pressRoom!.history[0].promise?.actual).toBeUndefined();
    const defender = held('CB'), line = record(defender, { apps: 30 });
    delete (line as Partial<SeasonRecord>).rating;
    settleSoccerPress(defender, line);
    expect(defender.pressRoom!.history[0].promise?.outcome).toBe('excused');
    expect(defender.popularity).toBe(50);
  });

  it('does not settle a copied, earlier, same-year or non-playing line', () => {
    const state = held(), before = structuredClone(state);
    settleSoccerPress(state, structuredClone(state.seasons[0]));
    settleSoccerPress(state, state.seasons[0]);
    expect(state).toEqual(before);
    for (const patch of [{ year: 2028 }, { type: 'manager' as const }]) {
      const next = structuredClone(state), row = record(next, patch), snapshot = structuredClone(next);
      settleSoccerPress(next, row);
      expect(next).toEqual(snapshot);
    }
  });

  it('settles the following actual played year after a gap without inventing skipped rows', () => {
    const state = held(), row = record(state, { year: 2032, goals: 17 });
    settleSoccerPress(state, row);
    expect(state.pressRoom!.history[0].promise).toMatchObject({ outcome: 'met', settledYear: 2032, settledIndex: 1 });
    expect(state.seasons).toHaveLength(2);
  });

  it('clamps earned results and detaches shared Press history from the prior career', () => {
    const prior = held(), priorBytes = JSON.stringify(prior);
    const state = { ...prior, popularity: 99, morale: 99 };
    const row = record(state, { goals: 17 });
    settleSoccerPress(state, row);
    expect([state.popularity, state.morale]).toEqual([100, 100]);
    expect(JSON.stringify(prior)).toBe(priorBytes);
    expect(state.pressRoom).not.toBe(prior.pressRoom);
    expect(state.pressRoom!.history[0]).not.toBe(prior.pressRoom!.history[0]);
  });

  it('leaves the complete old career and its absent optional key untouched', () => {
    const state = career(), row = record(state), before = structuredClone(state);
    settleSoccerPress(state, row);
    expect(state).toEqual(before);
    expect(Object.prototype.hasOwnProperty.call(state, 'pressRoom')).toBe(false);
  });
});

describe('Soccer Press malformed optional saves fail closed', () => {
  it.each([null, [], 'bad', {}, { version: 2, credibility: 50, history: [] },
    { version: 1, credibility: -1, history: [] }, { version: 1, credibility: 101, history: [] },
    { version: 1, credibility: 50, history: {} }, { version: 1, credibility: 50, history: [null] },
  ])('rejects invalid Press state %j without replacing it', raw => {
    const state = career();
    state.pressRoom = raw as CareerState['pressRoom'];
    const before = structuredClone(state);
    expect(pressRoomView(state).eligible).toBe(false);
    expect(answerSoccerPress(state, 'calm')).toBe(state);
    const row = record(state), recorded = structuredClone(state);
    settleSoccerPress(state, row);
    expect(state).toEqual(recorded);
    expect({ ...state, seasons: before.seasons }).toEqual(before);
  });

  it('rejects wrong saved source identity and malformed promise fields', () => {
    for (const change of [
      (state: CareerState) => { state.pressRoom!.history[0].source.club = 'PSV'; },
      (state: CareerState) => { state.pressRoom!.history[0].source.index = 5; },
      (state: CareerState) => { state.pressRoom!.history[0].promise!.target = 1; },
      (state: CareerState) => { state.pressRoom!.history[0].promise!.club = ''; },
      (state: CareerState) => { state.pressRoom!.history.push(structuredClone(state.pressRoom!.history[0])); },
    ]) {
      const state = held(); change(state);
      expect(pressRoomView(state).history).toEqual([]);
      expect(answerSoccerPress(state, 'calm')).toBe(state);
    }
  });

  it('rejects a forged completed verdict or actual figure against its held row', () => {
    const state = held(), row = record(state, { goals: 17 });
    settleSoccerPress(state, row);
    for (const patch of [{ outcome: 'missed' as const }, { actual: 99 }, { settledIndex: 0 }]) {
      const corrupt = structuredClone(state);
      Object.assign(corrupt.pressRoom!.history[0].promise!, patch);
      expect(pressRoomView(corrupt).eligible).toBe(false);
      expect(pressRoomView(corrupt).history).toEqual([]);
      expect(answerSoccerPress(corrupt, 'calm')).toBe(corrupt);
    }
  });
});

describe('Soccer Press actual recorded engine paths', () => {
  it.each([['match-fix', { matchFixBanned: 2 }, 'BANNED'], ['prison', { prisonSeasons: 1 }, 'PRISON']] as const)
    ('settles the actual %s season as excused', (_name, patch, club) => {
      vi.spyOn(Math, 'random').mockReturnValue(0.45);
      const state = held('CM', patch), prior = structuredClone(state.pressRoom);
      const next = advanceProSeason(state, FALLBACK_CLUBS);
      expect(state.pressRoom).toEqual(prior);
      expect(next.seasons[next.seasons.length - 1]?.club).toBe(club);
      expect(next.seasons[next.seasons.length - 1]?.apps).toBe(0);
      expect(next.pressRoom!.history[0].promise).toMatchObject({ outcome: 'excused', settledIndex: 1, settledYear: 2029 });
    });

  it('settles the actual legacy rehab repair from its newly saved missed row', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.45);
    const state = held('CM');
    state.age = 26; state.phase = 'rehab_choice';
    state.pendingRehab = { name: 'Recorded knee injury', weeks: 16, year: 2029, specialistCost: null };
    const next = applyRehabChoice(state, 1);
    expect(next.seasons).toHaveLength(2);
    expect(next.seasons[1]).toMatchObject({ year: 2029, apps: 0, injurySevere: true });
    expect(next.pressRoom!.history[0].promise?.outcome).toBe('excused');
  });

  it('settles the actual legacy conviction repair from its newly saved missed row', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.45);
    const state = held('CM');
    state.age = 26; state.phase = 'newspaper'; state.prisonSeasons = 1; state.pendingSummary = null;
    const next = dismissNewspaper(state);
    expect(next.seasons).toHaveLength(2);
    expect(next.seasons[1]).toMatchObject({ year: 2029, club: 'CONVICTED', apps: 0 });
    expect(next.pressRoom!.history[0].promise?.outcome).toBe('excused');
  });
});
