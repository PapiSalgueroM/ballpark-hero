import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import type { CareerState, SeasonRecord } from '@/lib/soccerCareerEngine';
import * as Eras from '@/lib/careerEras';
import { readGermanSupercup, countGermanSupercups, careerOpeningAnnualStats, germanSupercupSeasonStats } from '@/lib/soccerCareerExtraCups';
import { pressRoomView } from '@/lib/soccerCareerPress';
import { isSoccerCareerSave } from '@/lib/soccerCareerSave';

const E = await import('@/lib/soccerCareerEngine');
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const sha = (value: Buffer): string => createHash('sha256').update(value).digest('hex');
const own = (value: object, key: string): boolean => Object.prototype.hasOwnProperty.call(value, key);
const five = (row: SeasonRecord) => ({ apps: row.apps, goals: row.goals, assists: row.assists, cleanSheets: row.cleanSheets, rating: row.rating });
const CLOCK = 1793448000000;
const carrier = JSON.parse(readFileSync(resolve(process.cwd(), 'scripts/qa/fixtures/soccerGermanSupercup.public-boundaries.json'), 'utf8')) as {
  schema: number; encoding: string; body: string; raw: { bytes: number; sha256: string }; compressed: { bytes: number; sha256: string };
};
expect(carrier.schema).toBe(1); expect(carrier.encoding).toBe('gzip+hex');
const packed = Buffer.from(carrier.body, 'hex');
expect(packed.length).toBe(carrier.compressed.bytes); expect(sha(packed)).toBe(carrier.compressed.sha256);
const raw = gunzipSync(packed);
expect(raw.length).toBe(589373); expect(sha(raw)).toBe('62ce34ef333d0e6894753dd6d6c8ee19cac41ef50d977b81a54951b34d3f4b9a');
const observed = JSON.parse(raw.toString('utf8')) as {
  opening: CareerState; absent: CareerState; presentRun: { after: CareerState }; absentRun: { after: CareerState };
};
const heldRecord = JSON.stringify(observed);
afterEach(() => vi.restoreAllMocks());

type Evidence = Record<string, unknown> & { calls: Record<string, unknown>[] };
function run(evidence: Evidence, label: string, input: CareerState) {
  const working = clone(input), before = clone(working), draws: number[] = [];
  let lcg = 0, output: CareerState | undefined;
  const random = vi.spyOn(Math, 'random').mockImplementation(() => {
    lcg = (Math.imul(lcg, 1664525) + 1013904223) >>> 0;
    const value = lcg / 4294967296; draws.push(value); return value;
  });
  const clock = vi.spyOn(Date, 'now').mockReturnValue(CLOCK);
  try {
    output = E.advanceProSeason(working, E.FALLBACK_CLUBS);
    const row = output.seasons.at(-1)!;
    const record = { label, seed: 0, clock: CLOCK, before, after: clone(output), inputAfter: clone(working), draws, finalLcgState: lcg,
      ownGermanRoot: own(output, 'germanSupercupQualification'), ownGermanRow: own(row, 'germanSupercup'), saveShape: isSoccerCareerSave(output) };
    evidence.calls.push(record); return record;
  } catch (error) {
    evidence.calls.push({ label, seed: 0, clock: CLOCK, before, after: output ? clone(output) : null, inputAfter: clone(working),
      draws, finalLcgState: lcg, error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : String(error) });
    throw error;
  } finally { random.mockRestore(); clock.mockRestore(); }
}
function caseRecord(name: string, work: (evidence: Evidence) => void) {
  const evidence: Evidence = { scope: 'Exact held public acceptance data, working clones, fixed clock/LCG and explicit branch labs. No natural injury, ban, transfer or rate claim.',
    originalMemberSha256: carrier.raw.sha256, calls: [] };
  let primary: unknown;
  try { work(evidence); expect(JSON.stringify(observed)).toBe(heldRecord); }
  catch (error) { primary = error; }
  finally {
    evidence.primary = primary instanceof Error ? { name: primary.name, message: primary.message, stack: primary.stack } : primary ?? null;
    const folder = process.env.SC_GERMAN_PUBLIC_EVIDENCE;
    if (folder) {
      try { mkdirSync(folder, { recursive: true }); writeFileSync(join(folder, name + '.json'), JSON.stringify(evidence, null, 2) + '\n', { flag: 'wx' }); }
      catch (error) { if (!primary) primary = error; else console.error('Secondary public-boundary evidence retention failure', error); }
    } else if (!primary) primary = new Error('Explicit public-boundary evidence output is required');
  }
  if (primary) throw primary;
}
function equalDraws(a: ReturnType<typeof run>, b: ReturnType<typeof run>) {
  expect(a.draws).toEqual(b.draws); expect(a.finalLcgState).toBe(b.finalLcgState);
}
function normalizedPair(present: CareerState, absent: CareerState) {
  const normalized = clone(present), row = normalized.seasons.at(-1)!, annual = absent.seasons.at(-1)!;
  delete row.germanSupercup; Object.assign(row, five(annual));
  delete normalized.germanSupercupQualification;
  const without = clone(absent); delete without.germanSupercupQualification;
  return { normalized, without };
}

describe('Soccer Career German public boundaries', () => {
  it('SC_GERMAN_PUBLIC_SEVERE: keeps a selected opening before a controlled later severe injury', () => caseRecord('severe', evidence => {
    const presentInput = clone(observed.opening), absentInput = clone(observed.absent);
    evidence.inputs = { present: presentInput, absent: absentInput };
    const injury = vi.spyOn(Eras, 'rollSeasonInjury').mockReturnValue({ name: 'ACL rupture', weeks: 20, severe: true });
    let present: ReturnType<typeof run>, absent: ReturnType<typeof run>;
    try {
      present = run(evidence, 'severe-present', presentInput); const presentCalls = injury.mock.calls.length; injury.mockClear();
      absent = run(evidence, 'severe-absent', absentInput); evidence.injuryCalls = { present: presentCalls, absent: injury.mock.calls.length };
      expect(presentCalls).toBe(1); expect(injury.mock.calls.length).toBe(1);
    } finally { injury.mockRestore(); }
    const state = present!.after, old = absent!.after, row = state.seasons.at(-1)!, annual = old.seasons.at(-1)!;
    evidence.rowsBeforeAdmission = { present: row, absent: annual, presentFive: five(row), absentFive: five(annual) };
    expect(state.phase).toBe('rehab_choice'); expect(old.phase).toBe('rehab_choice');
    for (const value of [row, annual]) { expect(value.year).toBe(2030); expect(value.injurySevere).toBe(true); expect(value.injury).toBe('ACL rupture'); expect(value.injuryWeeks).toBe(20); }
    expect(row.apps, 'SC_GERMAN_PUBLIC_SEVERE_CONTRIBUTION: the selected opening appearance survives the later injury').toBe(annual.apps + 1);
    const result = readGermanSupercup(row); expect(result).not.toBeNull(); expect(readGermanSupercup(annual)).toBeNull();
    expect(result!.score).toEqual([4, 1]); expect(result!.winner).toBe('Bayern Munich'); expect(result!.player.apps).toBe(1);
    expect(result!.player.goals).toBe(2); expect(result!.player.title).toBe(true);
    expect(row.goals).toBe(annual.goals + result!.player.goals); expect(row.assists).toBe(annual.assists + result!.player.assists);
    expect(row.cleanSheets).toBe(annual.cleanSheets + result!.player.cleanSheets);
    expect(row.rating).toBe(Math.round((annual.rating * annual.apps + result!.player.rating!) / (annual.apps + 1) * 10) / 10);
    const projection = careerOpeningAnnualStats(row);
    const view = pressRoomView(state), oldView = pressRoomView(old);
    const hasPromise = presentInput.pressRoom?.history.some(item => !!item.promise) ?? false;
    evidence.annualAndPressBeforeAdmission = { projection, absent: five(annual), resultAnnualRating: result!.annualRating,
      promiseStatus: hasPromise ? 'PRESENT' : 'ABSENT', presentRaw: state.pressRoom ?? null, absentRaw: old.pressRoom ?? null,
      presentHistory: view.history, absentHistory: oldView.history, presentCredibility: view.credibility, absentCredibility: oldView.credibility };
    expect(projection, 'SC_GERMAN_PUBLIC_SEVERE_ANNUAL: retain an actual zero-app grade mismatch for diagnosis').toEqual(five(annual));
    expect(germanSupercupSeasonStats(five(annual), result)).toEqual(five(row));
    if (hasPromise) { expect(state.pressRoom).toEqual(old.pressRoom); expect(view.history).toEqual(oldView.history); expect(view.credibility).toBe(oldView.credibility); }
    equalDraws(present!, absent!);
    expect(state.pendingSummary).toEqual(presentInput.pendingSummary); expect(old.pendingSummary).toEqual(absentInput.pendingSummary);
    expect(present!.ownGermanRoot).toBe(own(presentInput, 'germanSupercupQualification')); expect(absent!.ownGermanRoot).toBe(own(absentInput, 'germanSupercupQualification'));
    expect(state.germanSupercupQualification).toEqual(presentInput.germanSupercupQualification); expect(old.germanSupercupQualification).toEqual(absentInput.germanSupercupQualification);
    const paired = normalizedPair(state, old); expect(paired.normalized).toEqual(paired.without);
    expect(present!.saveShape).toBe(true); expect(absent!.saveShape).toBe(true);
  }));
  it('SC_GERMAN_PUBLIC_BANNED: keeps a whole-year interruption free of opening metadata and credit', () => caseRecord('banned', evidence => {
    const presentInput = { ...clone(observed.opening), matchFixBanned: 2 }, absentInput = { ...clone(observed.absent), matchFixBanned: 2 };
    evidence.lab = { field: 'matchFixBanned', value: 2, source: 'held opening inputs, explicit whole-year interruption lab' };
    const present = run(evidence, 'banned-present', presentInput), absent = run(evidence, 'banned-absent', absentInput);
    const row = present.after.seasons.at(-1)!, annual = absent.after.seasons.at(-1)!;
    evidence.rowsBeforeAdmission = { present: row, absent: annual };
    expect(row.club).toBe('BANNED'); expect(annual.club).toBe('BANNED'); expect(row.year).toBe(2030);
    expect(present.ownGermanRow, 'SC_GERMAN_PUBLIC_BANNED_RESULT: an interrupted year stores no German result field').toBe(false);
    expect(absent.ownGermanRow).toBe(false); expect(present.after.phase).toBe('season_summary'); expect(absent.after.phase).toBe('season_summary');
    for (const key of ['apps', 'goals', 'assists', 'cleanSheets', 'rating'] as const) { expect(row[key]).toBe(0); expect(annual[key]).toBe(0); }
    expect(countGermanSupercups(present.after.seasons)).toBe(countGermanSupercups(presentInput.seasons));
    expect(present.after.germanSupercupQualification).toEqual(presentInput.germanSupercupQualification); expect(present.ownGermanRoot).toBe(true); expect(absent.ownGermanRoot).toBe(false);
    const normalized = clone(present.after); delete normalized.germanSupercupQualification; expect(normalized).toEqual(absent.after);
    equalDraws(present, absent); expect(present.saveShape).toBe(true); expect(absent.saveShape).toBe(true);
  }));
  it('SC_GERMAN_PUBLIC_STALE: refuses the unchanged old receipt at the next public advance', () => caseRecord('stale', evidence => {
    const presentInput = { ...clone(observed.presentRun.after), phase: 'playing' as const,
      germanSupercupQualification: clone(observed.opening.germanSupercupQualification) };
    const absentInput = clone(presentInput); delete absentInput.germanSupercupQualification;
    evidence.lab = { source: 'actual2030 public output with consumer phase playing and unchanged actual2030 receipt from the2029 close',
      originalNextReceipt: observed.presentRun.after.germanSupercupQualification, staleReceipt: presentInput.germanSupercupQualification };
    const present = run(evidence, 'stale-present', presentInput), absent = run(evidence, 'stale-absent', absentInput);
    const row = present.after.seasons.at(-1)!, annual = absent.after.seasons.at(-1)!;
    evidence.rowsBeforeAdmission = { present: row, absent: annual };
    expect(row.year).toBe(2031); expect(annual.year).toBe(2031);
    expect(present.ownGermanRow, 'SC_GERMAN_PUBLIC_STALE_RESULT: an expired receipt cannot attach a new opening result').toBe(false);
    expect(absent.ownGermanRow).toBe(false);
    expect(countGermanSupercups(present.after.seasons)).toBe(countGermanSupercups(presentInput.seasons));
    expect(present.after).toEqual(absent.after); equalDraws(present, absent);
    expect(present.saveShape).toBe(true); expect(absent.saveShape).toBe(true);
  }));
});
