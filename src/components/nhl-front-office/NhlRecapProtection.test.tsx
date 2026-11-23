import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import NhlFrontOfficeBoard from '@/components/nhl-front-office/NhlFrontOfficeBoard';
import { nhlCareerKitLoader } from '@/components/nhl-front-office/nhlCareerKitLoad';
import { keyedRng } from '@/lib/keyedRng';
import { initNhlLeague, NHL_FO_ROUNDS, runNhlFoPlayoffs, simNhlRound } from '@/lib/nhlFrontOffice';
import { hasPendingSaves, settlePendingSaves } from '@/lib/safeStorage';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

const key = 'nhl-front-office-save-v1';
const neighbor = 'mlb-front-office-save-v1';
const peer = '{ "league": { "round": 5 } }';
const stored = () => localStorage.getItem(key);
const isBackup = (name: string) => name.startsWith(key + '.broken-');
const backups = () => Object.keys(localStorage).filter(isBackup);
const retryButton = () => screen.getByRole('button', { name: 'Retry save' });
const quota = () => new DOMException('fixture quota', 'QuotaExceededError');

function plant(modern = false) {
  const rng = keyedRng('NHL recap fixture');
  const league = initNhlLeague(rng);
  for (let round = 1; round <= NHL_FO_ROUNDS; round += 1) {
    league.round = round;
    simNhlRound(league, 'BOS', rng);
  }
  const postseason = { ...runNhlFoPlayoffs(league, rng), gradeLine: 'Saved ownership verdict' };
  // The Round 430 writer saved the closed league and owner verdict counters.
  // It did not save the postseason bracket or add this championship to the ledger.
  const recap = {
    league, myTeam: postseason.champion, phase: 'recap', titles: 1, seasonsPlayed: 1,
    draftClass: null, picksLeft: 0, trust: 72, fired: false, pressTilt: -1,
    mandate: { tier: 'title', text: 'Win the Stanley Cup', winFloor: 0, reqLevel: 4, season: league.season },
    seasonTradeLine: 'Trade recorded before the playoffs',
  };
  if (modern) league.champions.push({ season: league.season, team: postseason.champion });
  const raw = JSON.stringify(modern ? { ...recap, postseason } : recap, null, 2);
  localStorage.setItem(key, raw);
  localStorage.setItem(neighbor, peer);
  const rngSpy = vi.spyOn(Math, 'random').mockImplementation(keyedRng('NHL recap draft'));
  return { raw, recap, rngSpy };
}

function expectDraft(recap: ReturnType<typeof plant>['recap']) {
  expect(screen.getByText('The 2027 Draft')).toBeVisible();
  expect(screen.queryByText('Final stretch + playoffs')).toBeNull();
  const current = JSON.parse(stored()!);
  expect(current).toMatchObject({ ...recap, phase: 'draft', draftBatchesLeft: 2, picksLeft: 2, draftClass: expect.any(Array) });
  expect(current.league).toEqual(recap.league);
  expect(current.draftClass).toHaveLength(24);
  return current;
}

function expectBackup(raw: string) {
  expect(backups()).toHaveLength(1);
  const [backup] = backups();
  expect(localStorage.getItem(backup) === raw).toBe(true);
  expect(localStorage.getItem(neighbor)).toBe(peer);
  return backup;
}

beforeAll(async () => { await nhlCareerKitLoader.load(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

describe('NHL Front Office legacy recap recovery', () => {
  it('retains the exact closed season before opening the draft and reloads the same prospects', () => {
    const { raw, recap } = plant();
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    const view = render(<NhlFrontOfficeBoard />);
    const draft = expectDraft(recap);
    const backup = expectBackup(raw);
    expect(writes.mock.calls.map(([name]) => name)).toEqual([backup, key]);
    const saved = stored();

    view.unmount();
    render(<NhlFrontOfficeBoard />);
    expect(screen.getByText(draft.draftClass[0].name)).toBeVisible();
    expect(stored() === saved).toBe(true);
    expect(expectBackup(raw)).toBe(backup);
    expect(writes).toHaveBeenCalledTimes(2);
  });

  it.each(['quota', 'wrong readback'])('preserves the recap on backup %s and retries without redrawing prospects', fault => {
    const { raw, recap, rngSpy } = plant();
    const setItem = Storage.prototype.setItem;
    let blocked = true;
    const writes = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, name, value) {
      if (blocked && isBackup(name)) {
        if (fault === 'quota') throw quota();
        return setItem.call(this, name, 'wrong backup');
      }
      setItem.call(this, name, value);
    });

    render(<NhlFrontOfficeBoard />);
    expect(stored() === raw).toBe(true);
    expect(backups()).toEqual([]);
    expect(localStorage.getItem(neighbor)).toBe(peer);
    expect(writes.mock.calls.some(([name]) => name === key)).toBe(false);
    expect(screen.queryByRole('region', { name: 'Draft prospects' })).toBeNull();
    expect(retryButton()).toBeVisible();
    expect(hasPendingSaves()).toBe(true);
    const draws = rngSpy.mock.calls.length;
    expect(draws).toBeGreaterThan(0);
    blocked = false;
    fireEvent.click(retryButton());
    expect(rngSpy).toHaveBeenCalledTimes(draws);
    expect(hasPendingSaves()).toBe(false);
    expectDraft(recap);
    expectBackup(raw);
  });

  it('reuses the verified backup and the same serialized draft after an active write refusal', () => {
    const { raw, recap, rngSpy } = plant();
    const setItem = Storage.prototype.setItem;
    const attempts: string[] = [];
    let blocked = true;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, name, value) {
      if (name === key) {
        attempts.push(value);
        if (blocked) throw quota();
      }
      setItem.call(this, name, value);
    });

    render(<NhlFrontOfficeBoard />);
    expect(stored() === raw).toBe(true);
    const backup = expectBackup(raw);
    expect(attempts).toHaveLength(1);
    const draws = rngSpy.mock.calls.length;
    act(() => { expect(settlePendingSaves()).toBe(false); });
    expect(stored() === raw).toBe(true);
    blocked = false;
    fireEvent.click(retryButton());
    expect(attempts).toHaveLength(3);
    expect(attempts.every(attempt => attempt === attempts[0])).toBe(true);
    expect(rngSpy).toHaveBeenCalledTimes(draws);
    expectDraft(recap);
    expect(expectBackup(raw)).toBe(backup);
  });

  it.each(['during backup', 'before retry'])('keeps a more recent franchise written %s', timing => {
    const { raw, recap } = plant();
    const newer = JSON.stringify({ ...recap, phase: 'hub', league: { ...recap.league, round: 1, season: 2027 } });
    const setItem = Storage.prototype.setItem;
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, name, value) {
      if (isBackup(name)) {
        if (timing === 'before retry') throw quota();
        setItem.call(this, key, newer);
      }
      setItem.call(this, name, value);
    });
    render(<NhlFrontOfficeBoard />);
    if (timing === 'before retry') {
      expect(stored() === raw).toBe(true);
      write.mockRestore();
      localStorage.setItem(key, newer);
      fireEvent.click(retryButton());
      expect(backups()).toEqual([]);
    } else {
      expectBackup(raw);
    }
    expect(stored() === newer).toBe(true);
    expect(localStorage.getItem(neighbor)).toBe(peer);
    expect(screen.getByRole('alertdialog')).toHaveTextContent(/another tab/i);
    expect(screen.queryByRole('button', { name: 'Retry save' })).toBeNull();
    expect(hasPendingSaves()).toBe(false);
  });

  it('retrieves a current recap and an in-progress shortlist without a migration write', () => {
    const { raw } = plant(true);
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    const view = render(<NhlFrontOfficeBoard />);
    expect(screen.getByText('Saved ownership verdict')).toBeInTheDocument();
    expect(stored() === raw).toBe(true);
    expect(writes).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Go to the draft' }));
    const draft = JSON.parse(stored()!);
    const candidate = draft.draftClass[0];
    fireEvent.click(screen.getByRole('button', { name: 'Shortlist ' + candidate.name }));
    const saved = stored();
    expect(JSON.parse(saved!).draftShortlist).toEqual([candidate.id]);
    view.unmount();
    writes.mockClear();

    render(<NhlFrontOfficeBoard />);
    expect(screen.getByRole('button', { name: 'Shortlist ' + candidate.name })).toHaveAttribute('aria-pressed', 'true');
    expect(stored() === saved).toBe(true);
    expect(writes).not.toHaveBeenCalled();
    expect(backups()).toEqual([]);
    expect(localStorage.getItem(neighbor)).toBe(peer);
  });
});
