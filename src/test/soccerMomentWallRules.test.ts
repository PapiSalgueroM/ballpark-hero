import { describe, expect, it } from 'vitest';
import {
  ledgerBanked, ledgerOf, ledgerPut, momentsPaid, momentsTally, readSeasonMoments,
  type SeasonMomentsSave,
} from '@/lib/season/momentsSave';

type PutWithWallRules = (
  save: SeasonMomentsSave | null | undefined, key: string, md: number,
  moment: number, result: number, input: readonly number[], wallShotRules?: 2,
) => SeasonMomentsSave;

// This typed view calls the actual export and remains compatible with its old six arguments.
const putWithRules: PutWithWallRules = ledgerPut;
const rulesOf = (save: SeasonMomentsSave | null): unknown =>
  save && 'wallShotRules' in save ? save.wallShotRules : undefined;
const rawCopy = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

function reload(save: SeasonMomentsSave): SeasonMomentsSave {
  const restored = readSeasonMoments(rawCopy(save));
  expect(restored, 'MOMENT_LEDGER_RELOAD_VALID').not.toBeNull();
  if (!restored) throw new Error('MOMENT_LEDGER_RELOAD_VALID');
  return restored;
}

function bankedFixture(): SeasonMomentsSave {
  const used = ledgerPut(null, 'season-a', 3, 0, -1, []);
  const twoEntries = ledgerPut(used, 'season-a', 8, 1, 3, [0.4, 0.5, 0.6]);
  return ledgerBanked({
    ...twoEntries, tally: { seasons: 2, moments: 5, stars: 7 },
  }, 2026, 2);
}

describe('Soccer moment wall rule persistence', () => {
  it('keeps six-argument attempts, packed results and settled replay unchanged', () => {
    const used = ledgerPut(null, 'season-a', 3, 0, -1, []);
    expect(used).toEqual({ v: 1, key: 'season-a', m: [[3, 0, -1]] });
    expect(rulesOf(used), 'MOMENT_LEGACY_SIX_ARGUMENTS_UNMARKED').toBeUndefined();
    const complete = ledgerPut(used, 'season-a', 3, 0, 2, [0.123456, 0.987654, 0.65, 0.30200000000000005]);
    expect(used.m, 'MOMENT_USED_PREIMAGE_HELD').toEqual([[3, 0, -1]]);
    expect(complete.m).toEqual([[3, 0, 2, 0.1235, 0.9877, 0.65, 0.302]]);
    const restored = reload(complete);
    expect(restored, 'MOMENT_LEGACY_RELOAD_EXACT').toEqual(complete);
    expect(ledgerPut(restored, 'season-a', 3, 0, -1, []), 'MOMENT_SETTLED_NO_REOPEN').toEqual(restored);
    expect(ledgerPut(restored, 'season-a', 3, 0, 3, [1]), 'MOMENT_SETTLED_NO_OVERWRITE').toEqual(restored);
    expect(ledgerOf(restored, 'season-a')).toEqual(complete.m);
    expect(ledgerOf(restored, 'season-b')).toEqual([]);
  });

  it('retains every positive safe rule marker with used, settled and banked data on reload', () => {
    const legacy = bankedFixture();
    expect(reload(legacy), 'MOMENT_RULE_READER_LEGACY_FOUNDATION').toEqual(legacy);
    for (const wallShotRules of [1, 2, 65536, Number.MAX_SAFE_INTEGER]) {
      const raw = { ...legacy, wallShotRules };
      const restored = readSeasonMoments(rawCopy(raw));
      expect(restored, 'MOMENT_WALL_RULE_READER_VALID').not.toBeNull();
      expect(rulesOf(restored), 'MOMENT_WALL_RULE_READER_RETAINS').toBe(wallShotRules);
      expect(restored, 'MOMENT_WALL_RULE_READER_LOSSLESS').toEqual(raw);
      expect(momentsPaid(restored, 2026)).toBe(2);
      expect(momentsTally(restored)).toEqual({ seasons: 3, moments: 7, stars: 10 });
    }
  });

  it('refuses invalid rule markers instead of silently treating their ledger as legacy', () => {
    const legacy = bankedFixture();
    expect(readSeasonMoments(legacy), 'MOMENT_INVALID_RULE_LEGACY_FOUNDATION').toEqual(legacy);
    for (const wallShotRules of [0, -1, 0.5, Number.MAX_SAFE_INTEGER + 1, NaN, Infinity, -Infinity, '2', null, true]) {
      expect(
        readSeasonMoments({ ...legacy, wallShotRules }),
        'MOMENT_WALL_RULE_READER_REFUSES',
      ).toBeNull();
    }
  });

  it('stamps rule two atomically with a genuinely new used attempt', () => {
    const used = putWithRules(null, 'season-a', 3, 0, -1, [], 2);
    expect(used.m, 'MOMENT_NEW_USED_ATTEMPT_PRESENT').toEqual([[3, 0, -1]]);
    expect(rulesOf(used), 'MOMENT_WALL_NEW_LEDGER_PINNED').toBe(2);
    const complete = putWithRules(reload(used), 'season-a', 3, 0, 3, [0.1, 0.2, 0.3], 2);
    expect(complete.m).toEqual([[3, 0, 3, 0.1, 0.2, 0.3]]);
    expect(rulesOf(complete), 'MOMENT_WALL_COMPLETION_RETAINS_RULE').toBe(2);
    expect(reload(complete), 'MOMENT_WALL_NEW_RELOAD_EXACT').toEqual(complete);
    expect(putWithRules(complete, 'season-a', 3, 0, -1, [], 2), 'MOMENT_NEW_SETTLED_NO_REOPEN').toEqual(complete);
  });

  it('never upgrades an existing same-season unmarked ledger when another attempt is taken', () => {
    const legacy = ledgerPut(null, 'season-a', 3, 0, 2, [0.2]);
    const before = JSON.stringify(legacy);
    const used = putWithRules(reload(legacy), 'season-a', 8, 1, -1, [], 2);
    expect(rulesOf(used), 'MOMENT_SAME_SEASON_LEGACY_NOT_UPGRADED').toBeUndefined();
    expect(used.m).toEqual([[3, 0, 2, 0.2], [8, 1, -1]]);
    const complete = putWithRules(used, 'season-a', 8, 1, 1, [0.4], 2);
    expect(rulesOf(complete), 'MOMENT_SAME_SEASON_COMPLETION_STAYS_LEGACY').toBeUndefined();
    expect(reload(complete).m).toEqual([[3, 0, 2, 0.2], [8, 1, 1, 0.4]]);
    expect(JSON.stringify(legacy), 'MOMENT_SAME_SEASON_PREIMAGE_HELD').toBe(before);
  });

  it('stamps only the fresh rollover ledger while folding the exact previous tally', () => {
    const previous = bankedFixture();
    const previousRaw = JSON.stringify(previous);
    const next = putWithRules(reload(previous), 'season-b', 1, 0, -1, [], 2);
    expect(next.key).toBe('season-b');
    expect(next.m).toEqual([[1, 0, -1]]);
    expect(next.tally, 'MOMENT_ROLLOVER_EXACT_TALLY').toEqual({ seasons: 3, moments: 7, stars: 10 });
    expect(next.banked, 'MOMENT_ROLLOVER_NOT_BANKED').toBeUndefined();
    expect(next.paid, 'MOMENT_ROLLOVER_NO_OLD_PAYMENT').toBeUndefined();
    expect(rulesOf(next), 'MOMENT_WALL_ROLLOVER_PINNED').toBe(2);
    expect(reload(next)).toEqual(next);
    expect(JSON.stringify(previous), 'MOMENT_ROLLOVER_OLD_RAW_HELD').toBe(previousRaw);
  });

  it('keeps legacy bank, paid year and tally stable across repeated stamps and reloads', () => {
    const banked = bankedFixture();
    const restored = reload(banked);
    expect(restored.m, 'MOMENT_BANK_PRESERVES_USED_AND_SETTLED').toEqual([[3, 0, -1], [8, 1, 3, 0.4, 0.5, 0.6]]);
    expect(momentsPaid(restored, 2026)).toBe(2);
    expect(momentsPaid(restored, 2027)).toBe(0);
    expect(momentsTally(restored)).toEqual({ seasons: 3, moments: 7, stars: 10 });
    const sameStamp = reload(ledgerBanked(restored, 2026, 2));
    expect(sameStamp, 'MOMENT_BANK_SAME_STAMP_IDEMPOTENT').toEqual(restored);
    expect(momentsTally(sameStamp), 'MOMENT_BANK_TALLY_NO_DOUBLE_COUNT').toEqual(momentsTally(restored));
    expect(ledgerPut(sameStamp, 'season-a', 8, 1, -1, []), 'MOMENT_BANK_SETTLED_NO_REOPEN').toEqual(sameStamp);
    expect(rulesOf(sameStamp), 'MOMENT_BANK_LEGACY_STAYS_UNMARKED').toBeUndefined();
  });
});
