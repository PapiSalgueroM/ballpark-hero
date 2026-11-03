import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as E from '@/lib/soccerCareerEngine';
import {
  SC_CAREER_RECORDS_KEY, completedRecordCandidate, readCompletedRecords,
  retainCompletedRecord, recordRetentionStatus,
  type CompletedRecordCandidate, type CompletedRecordsRead, type CompletedRecordSummary,
} from '@/lib/soccerCareerCompletedRecords';

const SUMMARY: CompletedRecordSummary = { goals: 17, trophies: 1, ballonDors: 0, caps: 4 };
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const known = (read: CompletedRecordsRead) => {
  expect(read.status, 'SC_RECORD_HELPER_SETUP_KNOWN').toBe('known');
  if (read.status !== 'known') throw new Error('Known fixture required');
  return read;
};
function fixture(name = 'Helper Keeper', score = 70) {
  const club: E.ClubData = { id: 'records-helper', name: 'Records Helper FC', country: 'England',
    tier: 1, color: '#123456', league: 'Records Helper League' };
  const state = E.initCareer(name, 'England', 'CM', '2020-24',
    { pace: 75, shooting: 75, passing: 75, dribbling: 75, defending: 75, physical: 75, reflexes: 75 },
    75, 2020, [club], null, 90);
  const playing: E.SeasonRecord = { ...state.seasons[0], year: 2028, age: 24,
    club: club.name, apps: 32, goals: 17, assists: 8, rating: 7.9, type: 'playing', leagueTitle: true };
  const career = E.choosePostRetirement(E.manualRetire({ ...state, age: 24,
    seasons: [...state.seasons, playing] }), 'retire', [club]);
  career.legacy = { score, tier: score >= 80 ? 'LEGEND' : 'GREAT',
    breakdown: [{ label: 'Controlled saved legacy', points: score }] };
  const candidate = completedRecordCandidate(career, SUMMARY);
  expect(candidate, 'SC_RECORD_HELPER_SETUP_CANDIDATE').not.toBeNull();
  return { career, candidate: candidate! };
}
function storage(raw: string | null = null, mode: 'normal' | 'throw' | 'ignore' | 'alter' | 'readback' = 'normal') {
  const values = new Map<string, string>([['soccerCareerSave', 'PRIMARY_UNTOUCHED'], ['other-game', 'OTHER_UNTOUCHED']]);
  if (raw !== null) values.set(SC_CAREER_RECORDS_KEY, raw);
  let reads = 0, writes = 0;
  return {
    getItem(key: string) {
      reads++;
      if (mode === 'readback' && writes > 0) throw new Error('Controlled readback refusal');
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      writes++;
      if (mode === 'throw') throw new Error('Controlled quota refusal');
      if (mode === 'ignore') return;
      values.set(key, mode === 'alter' ? '{"version":99,"opaque":"ALTERED_WRITE"}' : value);
    },
    raw: () => values.get(SC_CAREER_RECORDS_KEY) ?? null,
    counts: () => ({ reads, writes }),
    otherHeld: () => values.get('soccerCareerSave') === 'PRIMARY_UNTOUCHED' && values.get('other-game') === 'OTHER_UNTOUCHED',
  };
}
function observe<T>(run: () => T): T | { threw: true; message: string } {
  try { return run(); } catch (error) { return { threw: true, message: String(error) }; }
}
function retain(name: string, observations: unknown) {
  const receipt = { case: name, fixture: 'Real engine constructor plus explicit fictional playing receipts and controlled archive inputs', observations };
  const out = process.env.SC_RECORDS_HELPER_RAW;
  if (out) {
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, name + '.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
  }
  console.info('SC_RECORDS_HELPER_RAW ' + JSON.stringify(receipt));
}
const draws = () => vi.mocked(Math.random).mock.calls.length;
const clearDraws = () => vi.mocked(Math.random).mockClear();
beforeEach(() => vi.spyOn(Math, 'random').mockReturnValue(0.52));
afterEach(() => vi.restoreAllMocks());

describe('Soccer Career completed record helper', () => {
  it('keys the exact ordered playing record and normalizes only the two absent optional fields', () => {
    const { career } = fixture();
    const tail = copy(career);
    tail.age += 4; tail.currentClub = 'Another Helper Club'; tail.overall = 88;
    tail.netWorth = 123; tail.events.push('Explicit nonidentity tail');
    tail.legacy = { score: 55, tier: 'JOURNEYMAN', breakdown: [{ label: 'Later saved legacy', points: 55 }] };
    tail.seasons.push({ ...copy(tail.seasons[1]), type: 'manager', year: 2038, goals: 999 });
    const explicit = copy(career);
    Object.assign(explicit.seasons[1], { continentalCup: false, clubCupTitle: null });
    const variants = [
      Object.assign(copy(career), { playerName: 'Different Keeper' }),
      Object.assign(copy(career), { nationality: 'Different Country' }),
      Object.assign(copy(career), { position: 'ST' }),
      Object.assign(copy(career), { era: 'Different era' }),
    ];
    const changedGoal = copy(career); changedGoal.seasons[1].goals++;
    const changedClub = copy(career); changedClub.seasons[1].club = 'Different Helper Club';
    const ordered = copy(career); ordered.seasons.push({ ...copy(ordered.seasons[1]), year: 2029, goals: 18 });
    const reversed = copy(ordered); reversed.seasons = [reversed.seasons[0], reversed.seasons[2], reversed.seasons[1]];
    clearDraws();
    const base = completedRecordCandidate(career, SUMMARY), tailRecord = completedRecordCandidate(tail, SUMMARY);
    const normalized = completedRecordCandidate(explicit, SUMMARY);
    const changed = [...variants, changedGoal, changedClub].map(value => completedRecordCandidate(value, SUMMARY));
    const forward = completedRecordCandidate(ordered, SUMMARY), backward = completedRecordCandidate(reversed, SUMMARY);
    const tuple = base ? JSON.parse(base.key) : null;
    retain('identity', { base, tailKey: tailRecord?.key, normalizedKey: normalized?.key,
      changedKeys: changed.map(value => value?.key), forwardKey: forward?.key, backwardKey: backward?.key, tuple, randomDraws: draws() });
    expect(base, 'SC_RECORD_HELPER_IDENTITY').not.toBeNull();
    expect(tuple, 'SC_RECORD_HELPER_IDENTITY').toEqual([1, ['Helper Keeper', 'England', 'CM', '2020-24'], [[
      2028, 'Records Helper FC', 'England', 1, 32, 17, 8, 0, 0, 0, 7.9,
      true, false, false, false, false, null, false, null, 0, 0, 0, 0, null, null,
    ]]]);
    expect(tailRecord?.key, 'SC_RECORD_HELPER_IDENTITY').toBe(base!.key);
    expect(normalized?.key, 'SC_RECORD_HELPER_IDENTITY').toBe(base!.key);
    expect(changed.every(value => value !== null && value.key !== base!.key), 'SC_RECORD_HELPER_IDENTITY').toBe(true);
    expect(forward?.key, 'SC_RECORD_HELPER_IDENTITY').not.toBe(backward?.key);
    expect(draws(), 'SC_RECORD_HELPER_IDENTITY').toBe(0);
  });

  it('captures detached saved values and refuses unfinished malformed or oversized candidates', () => {
    const { career } = fixture();
    const negative = copy(career); negative.legacy!.breakdown.push({ label: 'The Climb', points: -18 });
    const unfinished = [
      Object.assign(copy(career), { retired: false }),
      ...['retirement_ceremony', 'post_retirement', 'manager_season', 'pundit_season', 'owner_season'].map(phase => Object.assign(copy(career), { phase })),
      Object.assign(copy(career), { legacy: null }),
    ];
    const malformed = [
      Object.assign(copy(career), { playerName: 'x'.repeat(129) }),
      Object.assign(copy(career), { playerName: { toJSON: () => 'Helper Keeper' } }),
    ];
    const badFlag = copy(career); Object.assign(badFlag.seasons[1], { leagueTitle: 'true' }); malformed.push(badFlag);
    const tooMany = copy(career); tooMany.seasons = Array.from({ length: 65 }, () => copy(career.seasons[1])); malformed.push(tooMany);
    const extraHistory = copy(career); Object.assign(extraHistory.seasons, { future: 'KEEP' }); malformed.push(extraHistory);
    const longKey = copy(career); longKey.seasons = Array.from({ length: 64 }, (_, i) => ({
      ...copy(career.seasons[1]), year: 2028 + i, club: 'c'.repeat(128), clubCountry: 'n'.repeat(128),
      clubCupTitle: 't'.repeat(128), tournament: 'u'.repeat(128), tournamentResult: 'r'.repeat(128),
    })); malformed.push(longKey);
    const unicode = copy(career), emoji = String.fromCodePoint(0x1f642).repeat(64);
    unicode.seasons = Array.from({ length: 64 }, () => ({ ...copy(career.seasons[1]), club: emoji, clubCountry: emoji }));
    malformed.push(unicode);
    const unicodeKey = JSON.stringify([1, ['Helper Keeper', 'England', 'CM', '2020-24'], Array.from({ length: 64 }, () => [
      2028, emoji, emoji, 1, 32, 17, 8, 0, 0, 0, 7.9, true, false, false, false, false, null, false, null, 0, 0, 0, 0, null, null,
    ])]);
    const unicodeHeadroom = { chars: unicodeKey.length, bytes: new TextEncoder().encode(unicodeKey).length };
    expect(unicodeHeadroom.chars, 'SC_RECORD_HELPER_SETUP_UTF8_VECTOR').toBeLessThan(32768);
    expect(unicodeHeadroom.bytes, 'SC_RECORD_HELPER_SETUP_UTF8_VECTOR').toBeGreaterThan(32768);
    const tooManyRows = copy(career); tooManyRows.legacy!.breakdown = Array.from({ length: 65 }, () => ({ label: 'Legacy row', points: 1 })); malformed.push(tooManyRows);
    const longLabel = copy(career); longLabel.legacy!.breakdown[0].label = 'l'.repeat(257); malformed.push(longLabel);
    const highScore = copy(career); highScore.legacy!.score = 101; malformed.push(highScore);
    clearDraws();
    const captured = completedRecordCandidate(career, SUMMARY);
    const before = JSON.stringify(captured);
    career.legacy!.breakdown[0].points = -999;
    career.playerName = 'Changed after capture';
    const negativeRecord = completedRecordCandidate(negative, SUMMARY);
    const rejected = [...unfinished, ...malformed].map(value => completedRecordCandidate(value as E.CareerState, SUMMARY) === null);
    const badSummary = completedRecordCandidate(negative, { ...SUMMARY, goals: Infinity });
    retain('capture', { captured, before, detached: JSON.stringify(captured) === before, negativeRecord,
      rejected, badSummary, unicodeHeadroom, randomDraws: draws() });
    expect(captured, 'SC_RECORD_HELPER_CAPTURE').not.toBeNull();
    expect(JSON.stringify(captured), 'SC_RECORD_HELPER_CAPTURE').toBe(before);
    expect(negativeRecord?.legacy.breakdown[1].points, 'SC_RECORD_HELPER_CAPTURE').toBe(-18);
    expect(rejected, 'SC_RECORD_HELPER_CAPTURE').toEqual(rejected.map(() => true));
    expect(badSummary, 'SC_RECORD_HELPER_CAPTURE').toBeNull();
    expect(draws(), 'SC_RECORD_HELPER_CAPTURE').toBe(0);
  });

  it('keeps every unsupported stored envelope byte intact without a write attempt', () => {
    const base = fixture(), other = fixture('Other Keeper');
    const seed = storage(); retainCompletedRecord(base.candidate, seed, () => true);
    const goodRaw = seed.raw()!;
    const envelope = JSON.parse(goodRaw) as { version: number; nextSequence: number; records: Record<string, unknown>[] };
    const record = envelope.records[0];
    const extraRecord = { ...copy(record), future: 'KEEP_RECORD_FIELD' };
    const noncanonical = { ...copy(record), key: ' ' + record.key };
    const extraTuple = copy(record); const parsed = JSON.parse(extraTuple.key as string); parsed[2][0].push('KEEP_FUTURE_ROW'); extraTuple.key = JSON.stringify(parsed);
    const badNumber = copy(record); const numericKey = JSON.parse(badNumber.key as string); numericKey[2][0][5] = null; badNumber.key = JSON.stringify(numericKey);
    const otherRecord = { ...copy(other.candidate), ackSequence: 1 };
    const thirteen = Array.from({ length: 13 }, (_, i) => ({ ...copy(record),
      key: JSON.stringify([1, ['Person ' + i, 'England', 'CM', '2020-24'], JSON.parse(record.key as string)[2]]),
      profile: ['Person ' + i, 'England', 'CM', '2020-24'], ackSequence: i + 1 }));
    const inputs: [string, string][] = [
      ['future', JSON.stringify({ ...envelope, version: 99 })], ['malformed', '{'],
      ['extra-envelope', JSON.stringify({ ...envelope, future: 'KEEP_FIELD' })],
      ['non-array', JSON.stringify({ ...envelope, records: {} })],
      ['extra-record', JSON.stringify({ ...envelope, records: [extraRecord] })],
      ['duplicate-key', JSON.stringify({ ...envelope, nextSequence: 3, records: [record, { ...copy(record), ackSequence: 2 }] })],
      ['duplicate-sequence', JSON.stringify({ ...envelope, nextSequence: 3, records: [record, otherRecord] })],
      ['sequence-order', JSON.stringify({ ...envelope, nextSequence: 1 })],
      ['unsafe-sequence', JSON.stringify({ ...envelope, nextSequence: Number.MAX_SAFE_INTEGER + 1 })],
      ['sequence-type', JSON.stringify({ ...envelope, nextSequence: '2' })],
      ['over-capacity', JSON.stringify({ version: 1, nextSequence: 14, records: thirteen })],
      ['noncanonical-key', JSON.stringify({ ...envelope, records: [noncanonical] })],
      ['extra-tuple-field', JSON.stringify({ ...envelope, records: [extraTuple] })],
      ['bad-row-number', JSON.stringify({ ...envelope, records: [badNumber] })],
      ['nonfinite-summary', goodRaw.replace('"goals":17', '"goals":1e309')],
      ['oversized-envelope', goodRaw + '\n'.repeat(1048576)],
    ];
    clearDraws();
    const observations = inputs.map(([name, raw]) => {
      const target = storage(raw);
      const read = observe(() => readCompletedRecords(target));
      const result = observe(() => retainCompletedRecord(base.candidate, target, () => true));
      return { name, readStatus: 'status' in read ? read.status : 'threw',
        resultStatus: 'status' in result ? result.status : 'threw', writes: target.counts().writes,
        rawHeld: target.raw() === raw, otherHeld: target.otherHeld(), bytes: new TextEncoder().encode(raw).length };
    });
    retain('strict-store', { observations, randomDraws: draws() });
    expect(observations.map(row => ({ read: row.readStatus, result: row.resultStatus, writes: row.writes, rawHeld: row.rawHeld, otherHeld: row.otherHeld })),
      'SC_RECORD_HELPER_STORE').toEqual(inputs.map(() => ({ read: 'blocked', result: 'blocked', writes: 0, rawHeld: true, otherHeld: true })));
    expect(draws(), 'SC_RECORD_HELPER_STORE').toBe(0);
  });

  it('replaces a latest lower snapshot while identical reads keep their sequence and bytes', () => {
    const { candidate } = fixture('Latest Keeper', 84);
    const lower = copy(candidate); Object.assign(lower, { legacy: { score: 55, tier: 'JOURNEYMAN', breakdown: [{ label: 'Later saved legacy', points: 55 }] } });
    const target = storage();
    clearDraws();
    const first = retainCompletedRecord(candidate, target, () => true), firstRead = known(readCompletedRecords(target));
    const beforeNoop = target.raw(), writesBefore = target.counts().writes;
    const unchanged = retainCompletedRecord(candidate, target, () => true), noopRead = known(readCompletedRecords(target));
    const writesAfterNoop = target.counts().writes;
    const replacement = retainCompletedRecord(lower, target, () => true), latest = known(readCompletedRecords(target));
    retain('latest', { first, unchanged, replacement, firstRecords: firstRead.records, noopRecords: noopRead.records,
      latestRecords: latest.records, firstSequence: firstRead.nextSequence, noopSequence: noopRead.nextSequence,
      latestSequence: latest.nextSequence, unchangedBytes: beforeNoop === JSON.stringify({ version: 1, nextSequence: noopRead.nextSequence, records: noopRead.records }),
      writesBefore, writesAfterNoop, randomDraws: draws() });
    expect([first.status, unchanged.status, replacement.status], 'SC_RECORD_HELPER_LATEST').toEqual(['kept', 'kept', 'kept']);
    expect(noopRead.records, 'SC_RECORD_HELPER_LATEST').toEqual(firstRead.records);
    expect(noopRead.nextSequence, 'SC_RECORD_HELPER_LATEST').toBe(firstRead.nextSequence);
    expect(writesAfterNoop, 'SC_RECORD_HELPER_LATEST').toBe(writesBefore);
    expect(latest.records.map(row => row.legacy.score), 'SC_RECORD_HELPER_LATEST').toEqual([55]);
    expect(latest.records[0].ackSequence, 'SC_RECORD_HELPER_LATEST').toBeGreaterThan(firstRead.records[0].ackSequence);
    expect(latest.nextSequence, 'SC_RECORD_HELPER_LATEST').toBe(firstRead.nextSequence + 1);
    expect(target.otherHeld(), 'SC_RECORD_HELPER_LATEST').toBe(true);
    expect(draws(), 'SC_RECORD_HELPER_LATEST').toBe(0);
  });

  it('keeps twelve scored records with latest changed ties and a no-write lower cutoff', () => {
    const cards = Array.from({ length: 12 }, (_, i) => fixture('Capacity ' + i, 70 + i).candidate);
    const low = fixture('Outside record', 69).candidate, tie = fixture('Tie record', 70).candidate;
    const lowerExisting = copy(cards[11]); Object.assign(lowerExisting, { legacy: { score: 10, tier: 'JOURNEYMAN', breakdown: [] } });
    const target = storage();
    clearDraws();
    for (const card of cards) retainCompletedRecord(card, target, () => true);
    const before = known(readCompletedRecords(target)), rawBefore = target.raw(), writesBefore = target.counts().writes;
    const outside = retainCompletedRecord(low, target, () => true);
    const outsideRead = known(readCompletedRecords(target)), writesAfterOutside = target.counts().writes;
    const tied = retainCompletedRecord(tie, target, () => true), tiedRead = known(readCompletedRecords(target));
    const lowered = retainCompletedRecord(lowerExisting, target, () => true), finalRead = known(readCompletedRecords(target));
    const exhaustedRaw = JSON.stringify({ version: 1, nextSequence: Number.MAX_SAFE_INTEGER, records: [] });
    const exhausted = storage(exhaustedRaw), exhaustedResult = retainCompletedRecord(low, exhausted, () => true);
    retain('capacity', { initialScores: before.records.map(row => row.legacy.score), outside, outsideSequence: outsideRead.nextSequence,
      rawHeldAtCutoff: outsideRead.raw === rawBefore, writesBefore, writesAfterOutside, tied,
      tiedKeys: tiedRead.records.map(row => row.key), tiedSequences: tiedRead.records.map(row => row.ackSequence),
      lowered, finalScores: finalRead.records.map(row => row.legacy.score), finalKeys: finalRead.records.map(row => row.key),
      exhaustedResult, exhaustedRawHeld: exhausted.raw() === exhaustedRaw, exhaustedCounts: exhausted.counts(), randomDraws: draws() });
    expect(before.records.map(row => row.legacy.score), 'SC_RECORD_HELPER_CAPACITY').toEqual([81, 80, 79, 78, 77, 76, 75, 74, 73, 72, 71, 70]);
    expect(outside.status, 'SC_RECORD_HELPER_CAPACITY').toBe('below-cutoff');
    expect(outsideRead.raw, 'SC_RECORD_HELPER_CAPACITY').toBe(rawBefore);
    expect(outsideRead.nextSequence, 'SC_RECORD_HELPER_CAPACITY').toBe(before.nextSequence);
    expect(writesAfterOutside, 'SC_RECORD_HELPER_CAPACITY').toBe(writesBefore);
    expect(tied.status, 'SC_RECORD_HELPER_CAPACITY').toBe('kept');
    expect(tiedRead.records, 'SC_RECORD_HELPER_CAPACITY').toHaveLength(12);
    expect(tiedRead.records.some(row => row.key === tie.key), 'SC_RECORD_HELPER_CAPACITY').toBe(true);
    expect(tiedRead.records.some(row => row.key === cards[0].key), 'SC_RECORD_HELPER_CAPACITY').toBe(false);
    expect(lowered.status, 'SC_RECORD_HELPER_CAPACITY').toBe('kept');
    expect(finalRead.records.find(row => row.key === lowerExisting.key)?.legacy.score, 'SC_RECORD_HELPER_CAPACITY').toBe(10);
    expect(finalRead.records.some(row => row.key === cards[0].key), 'SC_RECORD_HELPER_CAPACITY').toBe(false);
    expect(exhaustedResult, 'SC_RECORD_HELPER_CAPACITY').toEqual({ status: 'blocked', reason: 'unsupported-store' });
    expect(exhausted.raw(), 'SC_RECORD_HELPER_CAPACITY').toBe(exhaustedRaw);
    expect(exhausted.counts().writes, 'SC_RECORD_HELPER_CAPACITY').toBe(0);
    expect(draws(), 'SC_RECORD_HELPER_CAPACITY').toBe(0);
  });

  it('requires exact archive readback after quota ignored altered and unreadable writes', () => {
    const { candidate } = fixture();
    const modes = ['throw', 'ignore', 'alter', 'readback'] as const;
    clearDraws();
    const observations = modes.map(mode => {
      const target = storage(null, mode);
      const result = observe(() => retainCompletedRecord(candidate, target, () => true));
      return { mode, result, writes: target.counts().writes, raw: target.raw(), otherHeld: target.otherHeld() };
    });
    const unreadable = { getItem: () => { throw new Error('Controlled unavailable storage'); } };
    const read = observe(() => readCompletedRecords(unreadable));
    retain('readback', { observations, unavailableRead: read, randomDraws: draws() });
    expect(observations.map(row => row.result), 'SC_RECORD_HELPER_READBACK').toEqual([
      { status: 'blocked', reason: 'storage-refused' },
      ...modes.slice(1).map(() => ({ status: 'blocked', reason: 'readback-failed' })),
    ]);
    expect(observations.every(row => row.writes === 1 && row.otherHeld), 'SC_RECORD_HELPER_READBACK').toBe(true);
    expect(read, 'SC_RECORD_HELPER_READBACK').toMatchObject({ status: 'blocked', reason: 'unreadable' });
    expect(draws(), 'SC_RECORD_HELPER_READBACK').toBe(0);
  });

  it('checks the real caller source precondition before upsert before setting and after readback', () => {
    const { candidate } = fixture();
    const first = storage(), late = storage(), after = storage(), throwing = storage();
    clearDraws();
    let lateCalls = 0, afterCalls = 0;
    const firstResult = observe(() => retainCompletedRecord(candidate, first, () => false));
    const throwingResult = observe(() => retainCompletedRecord(candidate, throwing, () => { throw new Error('Controlled source refusal'); }));
    const lateResult = observe(() => retainCompletedRecord(candidate, late, () => ++lateCalls === 1));
    const afterResult = observe(() => retainCompletedRecord(candidate, after, () => ++afterCalls <= 2));
    retain('source', { firstResult, throwingResult, lateResult, afterResult,
      firstCounts: first.counts(), throwingCounts: throwing.counts(), lateCounts: late.counts(), afterCounts: after.counts(),
      lateCalls, afterCalls, randomDraws: draws() });
    expect([firstResult, throwingResult, lateResult, afterResult], 'SC_RECORD_HELPER_SOURCE').toEqual(
      Array.from({ length: 4 }, () => ({ status: 'blocked', reason: 'source-changed' })));
    expect(first.counts(), 'SC_RECORD_HELPER_SOURCE').toEqual({ reads: 0, writes: 0 });
    expect(throwing.counts(), 'SC_RECORD_HELPER_SOURCE').toEqual({ reads: 0, writes: 0 });
    expect(late.counts().writes, 'SC_RECORD_HELPER_SOURCE').toBe(0);
    expect(after.counts().writes, 'SC_RECORD_HELPER_SOURCE').toBe(1);
    expect([first, late, after, throwing].every(store => store.otherHeld()), 'SC_RECORD_HELPER_SOURCE').toBe(true);
    expect(draws(), 'SC_RECORD_HELPER_SOURCE').toBe(0);
  });

  it('verifies a fresh retained snapshot or genuine cutoff without granting stale deletion proof', () => {
    const { candidate } = fixture();
    const changed = copy(candidate); Object.assign(changed, { legacy: { score: 55, tier: 'JOURNEYMAN', breakdown: [] } });
    const low = fixture('Low record', 10).candidate, tie = fixture('Equal cutoff', 70).candidate;
    const cards = Array.from({ length: 12 }, (_, i) => fixture('Clear capacity ' + i, 70 + i).candidate);
    const target = storage(), full = storage();
    clearDraws();
    retainCompletedRecord(candidate, target, () => true);
    for (const card of cards) retainCompletedRecord(card, full, () => true);
    const read = readCompletedRecords(target), cutoff = readCompletedRecords(full);
    const counts = target.counts(), fullCounts = full.counts();
    const actual = {
      kept: recordRetentionStatus(candidate, read), stale: recordRetentionStatus(changed, read),
      absent: recordRetentionStatus(candidate, readCompletedRecords(storage())),
      below: recordRetentionStatus(low, cutoff), tie: recordRetentionStatus(tie, cutoff),
      future: recordRetentionStatus(candidate, readCompletedRecords(storage('{"version":99}'))),
    };
    retain('clear', { actual, beforeCounts: counts, afterCounts: target.counts(), fullBefore: fullCounts,
      fullAfter: full.counts(), randomDraws: draws() });
    expect(actual, 'SC_RECORD_HELPER_CLEAR').toEqual({ kept: 'kept', stale: null, absent: null, below: 'below-cutoff', tie: null, future: null });
    expect(target.counts(), 'SC_RECORD_HELPER_CLEAR').toEqual(counts);
    expect(full.counts(), 'SC_RECORD_HELPER_CLEAR').toEqual(fullCounts);
    expect(draws(), 'SC_RECORD_HELPER_CLEAR').toBe(0);
  });
});
