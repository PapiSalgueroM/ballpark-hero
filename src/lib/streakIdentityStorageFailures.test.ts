import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getStreakState,
  recordGameCompletion,
  setStreakStorageIdentity,
  type StreakState,
} from '@/lib/streaks';

const ACTIVE_KEY = 'dukb-streaks-v1';
const IDENTITY_KEY = 'dukb-streaks-identity-v1';
const SCOPED_PREFIX = 'dukb-streaks-scoped-v1:';

function state(totalPlays: number, totalPoints: number): StreakState {
  return {
    version: 1,
    global: { current: totalPlays, longest: totalPlays, lastDate: '2026-09-02' },
    perGame: {},
    loginDates: ['2026-09-02'],
    totalPlays,
    totalPoints,
  };
}

const guestState = state(1, 10);
const accountAState = state(5, 500);
const accountBState = state(9, 900);

function installAccounts(): void {
  localStorage.setItem(ACTIVE_KEY, JSON.stringify(guestState));
  setStreakStorageIdentity(null);
  setStreakStorageIdentity('account-a');
  localStorage.setItem(ACTIVE_KEY, JSON.stringify(accountAState));
  localStorage.setItem(`${SCOPED_PREFIX}account-a`, JSON.stringify(accountAState));
  localStorage.setItem(`${SCOPED_PREFIX}account-b`, JSON.stringify(accountBState));
}

function rejectNextSet(key: string, value?: string): void {
  const originalSetItem = Storage.prototype.setItem;
  let rejected = false;
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function setItem(nextKey, nextValue) {
    if (nextKey === key && (value === undefined || nextValue === value) && !rejected) {
      rejected = true;
      throw new Error('quota');
    }
    return originalSetItem.call(this, nextKey, nextValue);
  });
}

function rejectEverySet(key: string): void {
  const originalSetItem = Storage.prototype.setItem;
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function setItem(nextKey, nextValue) {
    if (nextKey === key) throw new Error('blocked');
    return originalSetItem.call(this, nextKey, nextValue);
  });
}

function expectIsolatedRoundTrip(): void {
  expect(localStorage.getItem(IDENTITY_KEY)).toBe('account-b');
  expect(getStreakState()).toEqual(accountBState);
  expect(JSON.parse(localStorage.getItem(`${SCOPED_PREFIX}account-a`) ?? 'null')).toEqual(accountAState);

  setStreakStorageIdentity(null);
  expect(getStreakState()).toEqual(guestState);
  setStreakStorageIdentity('account-a');
  expect(getStreakState()).toEqual(accountAState);
  setStreakStorageIdentity('account-b');
  expect(getStreakState()).toEqual(accountBState);
}

describe('streak identity storage failures', () => {
  beforeEach(() => {
    localStorage.clear();
    installAccounts();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('moves to Account B safely when archiving Account A throws', () => {
    rejectNextSet(`${SCOPED_PREFIX}account-a`);
    setStreakStorageIdentity('account-b');
    expectIsolatedRoundTrip();
  });

  it('moves to Account B safely when writing its active state throws', () => {
    rejectNextSet(ACTIVE_KEY);
    setStreakStorageIdentity('account-b');
    expectIsolatedRoundTrip();
  });

  it('moves to Account B safely when switching the identity marker throws', () => {
    rejectNextSet(IDENTITY_KEY, 'account-b');
    setStreakStorageIdentity('account-b');
    expectIsolatedRoundTrip();
  });

  it('does not adopt Account B when marker writes keep failing across later transitions', () => {
    rejectEverySet(IDENTITY_KEY);

    setStreakStorageIdentity('account-b');
    expect(localStorage.getItem(IDENTITY_KEY)).toBeNull();
    expect(getStreakState()).toEqual(accountBState);

    setStreakStorageIdentity(null);
    expect(getStreakState()).toEqual(guestState);
    setStreakStorageIdentity('account-a');
    expect(getStreakState()).toEqual(accountAState);
  });

  it('uses scoped truth after reloading with no identity marker', async () => {
    rejectEverySet(IDENTITY_KEY);
    setStreakStorageIdentity('account-b');
    expect(localStorage.getItem(IDENTITY_KEY)).toBeNull();

    vi.restoreAllMocks();
    vi.resetModules();
    const reloaded = await import('@/lib/streaks');
    reloaded.setStreakStorageIdentity(null);
    expect(reloaded.getStreakState()).toEqual(guestState);
    reloaded.setStreakStorageIdentity('account-a');
    expect(reloaded.getStreakState()).toEqual(accountAState);
  });

  it('still migrates a legacy markerless guest state into its first account', async () => {
    localStorage.clear();
    localStorage.setItem(ACTIVE_KEY, JSON.stringify(guestState));

    vi.resetModules();
    const reloaded = await import('@/lib/streaks');
    reloaded.setStreakStorageIdentity('first-account');

    expect(reloaded.getStreakState()).toEqual(guestState);
    expect(JSON.parse(localStorage.getItem(`${SCOPED_PREFIX}first-account`) ?? 'null')).toEqual(guestState);
  });

  it('does not overwrite another tab active streak while this tab still belongs to Account A', () => {
    localStorage.setItem(IDENTITY_KEY, 'account-b');
    localStorage.setItem(ACTIVE_KEY, JSON.stringify(accountBState));

    recordGameCompletion('footle', new Date('2026-09-02T16:00:00.000Z'), 25);

    expect(JSON.parse(localStorage.getItem(ACTIVE_KEY) ?? 'null')).toEqual(accountBState);
    setStreakStorageIdentity('account-b');
    expect(getStreakState()).toEqual(accountBState);
  });
});
