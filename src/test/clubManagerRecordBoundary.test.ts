import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import type { CareerState, H2HEntry, PlayResult } from '@/lib/clubManager';
import type { ScoringGame } from '@/lib/clubManagerRecords';

const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const observations: Record<string, unknown> = {};
const OUT = process.env.CM_RECORD_BOUNDARY_OUT;
function retain() {
  if (!OUT) return;
  mkdirSync(OUT, { recursive: true });
  writeFileSync(path.join(OUT, 'raw-states.json'), JSON.stringify(observations, null, 2));
}
function random<T>(seed: number, action: () => T): { value: T; draws: number[] } {
  let state = seed >>> 0;
  const draws: number[] = [];
  const spy = vi.spyOn(Math, 'random').mockImplementation(() => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    const result = ((value ^ value >>> 14) >>> 0) / 4294967296;
    draws.push(result); return result;
  });
  try { return { value: action(), draws }; } finally { spy.mockRestore(); }
}
async function fresh() {
  // Fresh actual module instances keep press/message counters identical across arms.
  // Both closures retain their own public APIs and matching save fence.
  localStorage.clear(); sessionStorage.clear(); vi.resetModules();
  const model = await import('@/lib/clubManager'), { saveFence } = await import('@/lib/saveFence');
  saveFence.release(model.SAVE_KEY);
  return { model, saveFence };
}
async function initial() {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-16T12:00:00Z'));
  const context = await fresh();
  return random(1343300, () => context.model.startCareer('Everton'));
}
afterEach(() => {
  localStorage.clear(); sessionStorage.clear(); vi.useRealTimers();
});

// Only the declared historical book and its career counters are prepared. The current
// club, squad, world, calendar and the next match come from the real public initializer.
// These fictional archive rows do not claim that any real match took place.
function prepared(fresh: CareerState, count: number, played = count, score = '5-4', res: H2HEntry['res'] = 'W') {
  const state = copy(fresh);
  state.h2h = Array.from({ length: count }, (_, i): H2HEntry => ({
    opp: 'Prepared archive club ' + String(i + 1).padStart(3, '0'),
    score: i === 0 ? score : '0-0', res: i === 0 ? res : 'D', season: 1, comp: 'league', home: true,
  }));
  const wins = res === 'W' ? 1 : 0, losses = res === 'L' ? 1 : 0;
  state.careerStats = { ...state.careerStats, played, wins, losses, draws: played - wins - losses };
  delete state.careerStats.highestScoring;
  return state;
}
function archiveRecord(state: CareerState, missed = 0): ScoringGame {
  const row = state.h2h![0];
  return { opp: row.opp, score: row.score, res: row.res, season: row.season, ...(missed ? { missed } : {}) };
}
function withoutRecord(state: CareerState) {
  const value = copy(state); delete value.careerStats.highestScoring; return value;
}
function actualRecord(result: PlayResult, before: CareerState): ScoringGame {
  const report = result.report;
  if (result.kind !== 'match' || !report || ![report.home, report.away].includes(before.clubName)) {
    throw new Error('RECORD_BOUNDARY_SETUP: public next entry must produce this manager\'s actual completed match');
  }
  const home = report.home === before.clubName;
  return { opp: home ? report.away : report.home,
    score: home ? `${report.homeGoals}-${report.awayGoals}` : `${report.awayGoals}-${report.homeGoals}`,
    res: report.won ? 'W' : report.drawn ? 'D' : 'L', season: result.state.season,
    club: before.clubName, comp: report.compLabel };
}
function reload(state: CareerState, context: Awaited<ReturnType<typeof fresh>>) {
  const { model, saveFence } = context;
  saveFence.release(model.SAVE_KEY); localStorage.clear(); sessionStorage.clear();
  const input = copy(state), before = copy(input);
  const result = random(91343, () => {
    const saved = model.saveCareer(input), raw = localStorage.getItem(model.SAVE_KEY), loaded = model.loadCareer();
    return { saved, raw, loaded, rawAfterRead: localStorage.getItem(model.SAVE_KEY) };
  });
  saveFence.release(model.SAVE_KEY);
  return { ...result.value, draws: result.draws, inputUnchanged: isDeepStrictEqual(input, before) };
}
async function pair(id: string, initialized: Awaited<ReturnType<typeof initial>>, input: CareerState, referenceInput: CareerState,
  expected: ScoringGame | ((result: PlayResult) => ScoringGame), selectedSeed?: number) {
  const before = copy(input), referenceBefore = copy(referenceInput);
  const attempts: { seed: number; result: PlayResult; draws: number[]; total: number | null }[] = [];
  const raw: Record<string, unknown> = { id, provenance: 'Prepared fictional archive on genuine startCareer state; actual public match, no match mock',
    initializer: initialized, before, referenceBefore, attempts };
  observations[id] = raw;
  try {
    let actual: ReturnType<typeof random<PlayResult>> | undefined, actualContext: Awaited<ReturnType<typeof fresh>> | undefined, seed = 0;
    for (const trial of selectedSeed === undefined ? Array.from({ length: 16 }, (_, i) => i + 1) : [selectedSeed]) {
      const context = await fresh(), candidate = random(trial, () => context.model.playNextEntry(input, { skipHalftime: true }));
      const report = candidate.value.report, total = report ? report.homeGoals + report.awayGoals : null;
      attempts.push({ seed: trial, result: candidate.value, draws: candidate.draws, total });
      if (candidate.value.kind === 'match' && total !== null && total > 0 && total < 9) { actual = candidate; actualContext = context; seed = trial; break; }
    }
    if (!actual) throw new Error('RECORD_BOUNDARY_SETUP: bounded real seeded matches did not produce a positive total below nine');
    const referenceContext = await fresh(), reference = random(seed, () => referenceContext.model.playNextEntry(referenceInput, { skipHalftime: true }));
    const current = actualRecord(actual.value, before), expectedRecord = typeof expected === 'function' ? expected(actual.value) : expected;
    const actualReload = reload(actual.value.state, actualContext!), referenceReload = reload(reference.value.state, referenceContext);
    const total = actual.value.report!.homeGoals + actual.value.report!.awayGoals;
    const book = actual.value.state.h2h!, last = book[book.length - 1];
    const holds = {
      actualCompletedPositiveLowGoalMatch: actual.value.kind === 'match' && total > 0 && total < 9,
      referenceCompletedMatch: reference.value.kind === 'match',
      inputsUnchanged: isDeepStrictEqual(input, before) && isDeepStrictEqual(referenceInput, referenceBefore),
      sameGameOutput: isDeepStrictEqual(actual.value.report, reference.value.report),
      sameFullNonRecordState: isDeepStrictEqual(withoutRecord(actual.value.state), withoutRecord(reference.value.state)),
      sameRngStream: actual.draws.length > 0 && isDeepStrictEqual(actual.draws, reference.draws),
      playedOnce: actual.value.state.careerStats.played === before.careerStats.played + 1,
      exactBookCap: actual.value.state.h2h!.length === Math.min(300, before.h2h!.length + 1),
      actualLastBookMatchesReport: last.opp === current.opp && last.score === current.score && last.res === current.res,
      oldestRowTrimmedOnlyAtCap: before.h2h!.length === 300
        ? actual.value.state.h2h![0].opp === before.h2h![1].opp : actual.value.state.h2h![0].opp === before.h2h![0].opp,
      bothSavedAndLoaded: actualReload.saved && referenceReload.saved && !!actualReload.loaded && !!referenceReload.loaded,
      saveReadInputUnchanged: actualReload.inputUnchanged && referenceReload.inputUnchanged,
      noSaveReadDraws: actualReload.draws.length === 0 && referenceReload.draws.length === 0,
      saveBytesReadOnly: actualReload.raw === actualReload.rawAfterRead && referenceReload.raw === referenceReload.rawAfterRead,
      actualSavedRecordRetained: !!actualReload.loaded && isDeepStrictEqual(actualReload.loaded.careerStats.highestScoring, actual.value.state.careerStats.highestScoring),
      referenceSavedRecordRetained: !!referenceReload.loaded && isDeepStrictEqual(referenceReload.loaded.careerStats.highestScoring, reference.value.state.careerStats.highestScoring),
      sameFullReloadedNonRecordState: !!actualReload.loaded && !!referenceReload.loaded
        && isDeepStrictEqual(withoutRecord(actualReload.loaded), withoutRecord(referenceReload.loaded)),
      referenceHasLiteralExpectedRecord: isDeepStrictEqual(reference.value.state.careerStats.highestScoring, expectedRecord)
        && !!referenceReload.loaded && isDeepStrictEqual(referenceReload.loaded.careerStats.highestScoring, expectedRecord),
    };
    const correctRecord = isDeepStrictEqual(actual.value.state.careerStats.highestScoring, expectedRecord)
      && !!actualReload.loaded && isDeepStrictEqual(actualReload.loaded.careerStats.highestScoring, expectedRecord);
    Object.assign(raw, { seed, current, expectedRecord, actual, reference, actualReload, referenceReload, holds, correctRecord });
    retain();
    expect(Object.values(holds).every(Boolean), 'RECORD_BOUNDARY_PRESERVATION: public game, paired full state, save or RNG hold changed').toBe(true);
    return { correctRecord, seed, current, total };
  } catch (error) {
    raw.error = error instanceof Error ? error.stack : String(error); retain(); throw error;
  }
}

describe('Manager record retained-book boundary', { timeout: 60000 }, () => {
  it('legacy300 preserves the oldest nine-goal game with zero missed', async () => {
    const initialized = await initial(), state = prepared(initialized.value, 300), expected = archiveRecord(state);
    const reference = copy(state); reference.careerStats.highestScoring = expected;
    const result = await pair('legacy300', initialized, state, reference, expected);
    expect(result.correctRecord, 'RECORD_BOUNDARY_LEGACY300: oldest known nine-goal record and zero missed must survive the first capped match').toBe(true);
  });
  it('legacy350 preserves the oldest nine-goal game with fifty missed', async () => {
    const initialized = await initial(), state = prepared(initialized.value, 300, 350), expected = archiveRecord(state, 50);
    const reference = copy(state); reference.careerStats.highestScoring = expected;
    const result = await pair('legacy350', initialized, state, reference, expected);
    expect(result.correctRecord, 'RECORD_BOUNDARY_LEGACY350: oldest known nine-goal record and fifty missed must survive the first capped match').toBe(true);
  });
  it('legacy299 preserves the available record before the book reaches its cap', async () => {
    const initialized = await initial(), state = prepared(initialized.value, 299), expected = archiveRecord(state);
    const reference = copy(state); reference.careerStats.highestScoring = expected;
    expect((await pair('legacy299', initialized, state, reference, expected)).correctRecord).toBe(true);
  });
  it('stored preserves the modern nine-goal record at the book cap', async () => {
    const initialized = await initial(), state = prepared(initialized.value, 300), expected = archiveRecord(state);
    state.careerStats.highestScoring = expected;
    expect((await pair('stored', initialized, state, copy(state), expected)).correctRecord).toBe(true);
  });
  it('null starts counting at the actual new match without reviving legacy rows', async () => {
    const initialized = await initial(), state = prepared(initialized.value, 300); state.careerStats.highestScoring = null;
    expect((await pair('null', initialized, state, copy(state), result => actualRecord(result, state))).correctRecord).toBe(true);
  });
  it('actual higher totals replace the record and equal totals keep the first game', async () => {
    const initialized = await initial(), higher = prepared(initialized.value, 300, 300, '0-0', 'D');
    higher.careerStats.highestScoring = archiveRecord(higher);
    const reference = copy(higher); reference.careerStats.highestScoring = null;
    const result = await pair('higher', initialized, higher, reference, game => actualRecord(game, higher));
    expect(result.correctRecord).toBe(true);
    const tie = prepared(initialized.value, 300, 300, result.current.score, result.current.res), expected = archiveRecord(tie);
    tie.careerStats.highestScoring = expected;
    const tied = await pair('tie', initialized, tie, copy(tie), expected, result.seed);
    expect(tied.total).toBe(result.total); expect(tied.correctRecord).toBe(true);
  });
});
