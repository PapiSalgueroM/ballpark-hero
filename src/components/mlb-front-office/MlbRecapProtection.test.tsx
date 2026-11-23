import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MlbFrontOfficeBoard from '@/components/mlb-front-office/MlbFrontOfficeBoard';
import { MLB_ROUNDS, runMlbPlayoffs, simMlbRound, type MlbLeague } from '@/lib/mlbFrontOffice';
import { keyedRng } from '@/lib/keyedRng';
import fixture from '../../../scripts/data/mlbLegacySaveFixture.json';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

const key = 'mlb-front-office-save-v1';
const prefix = key + '.broken-';
const neighbor = 'nhl-front-office-save-v1';
const peer = '{ "week": 5 }';
const stored = () => localStorage.getItem(key);
const read = () => JSON.parse(stored()!);
const copies = () => Object.keys(localStorage).filter(key => key.startsWith(prefix));
const retry = () => fireEvent.click(screen.getByRole('button', { name: 'Retry save' }));

function closedSeason() {
  const { start, team, rngSeed } = fixture.rows[0];
  const league = structuredClone(start) as MlbLeague;
  const rng = keyedRng('MLB legacy recap fixture ' + rngSeed);
  for (let round = 1; round <= MLB_ROUNDS; round += 1) {
    league.round = round;
    simMlbRound(league, team, rng);
  }
  const postseason = runMlbPlayoffs(league, rng);
  // The old writer saved the final round and counters, with no postseason block.
  const recap = { league, myTeam: postseason.champion, phase: 'recap', titles: 1, seasonsPlayed: 1, draftClass: null, picksLeft: 0 };
  return { recap, postseason };
}

function plant(current = false) {
  const { recap, postseason } = closedSeason();
  const raw = JSON.stringify(current ? { ...recap, postseason } : recap, null, 2);
  localStorage.setItem(key, raw);
  localStorage.setItem(neighbor, peer);
  const random = vi.spyOn(Math, 'random').mockImplementation(keyedRng('MLB recap draft'));
  return { raw, recap, random };
}

function held(raw: string) {
  expect(copies()).toHaveLength(1);
  const [backup] = copies();
  expect(localStorage.getItem(backup) === raw).toBe(true);
  expect(localStorage.getItem(neighbor)).toBe(peer);
  return backup;
}

function expectDraft(recap: ReturnType<typeof closedSeason>['recap']) {
  expect(screen.getByText('The 2027 Draft')).toBeVisible();
  expect(screen.queryByText('Final stretch + October')).toBeNull();
  const saved = read();
  expect(saved).toMatchObject({ phase: 'draft', titles: 1, seasonsPlayed: 1, picksLeft: 2, draftBatchesLeft: 2, myTeam: recap.myTeam });
  expect(saved.league).toEqual(recap.league);
  expect(saved.draftClass).toHaveLength(24);
  return saved;
}

afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

describe('MLB Front Office recap recovery', () => {
  it('keeps the older recap before opening the draft and resumes that class after reload', () => {
    const { raw, recap } = plant();
    expect(recap.league.teams[recap.myTeam].wins + recap.league.teams[recap.myTeam].losses).toBe(162);
    const view = render(<MlbFrontOfficeBoard />);
    const first = expectDraft(recap);
    const backup = held(raw);
    const bytes = stored();
    view.unmount();
    render(<MlbFrontOfficeBoard />);
    expect(screen.getByText(first.draftClass[0].name)).toBeVisible();
    expect(stored() === bytes).toBe(true);
    expect(held(raw)).toBe(backup);
  });

  it.each(['quota', 'wrong readback'])('leaves the recap in place on backup %s and retries without another draft draw', fault => {
    const { raw, recap, random } = plant();
    const set = Storage.prototype.setItem;
    let blocked = true;
    const writes = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, name, value) {
      if (blocked && name.startsWith(prefix)) {
        if (fault === 'quota') throw new DOMException('fixture quota', 'QuotaExceededError');
        return set.call(this, name, 'wrong copy');
      }
      return set.call(this, name, value);
    });

    render(<MlbFrontOfficeBoard />);
    expect(screen.queryByRole('button', { name: 'Retry save' })).toBeVisible();
    expect(stored() === raw).toBe(true);
    expect(copies()).toEqual([]);
    expect(writes.mock.calls.filter(([name]) => name === key)).toHaveLength(0);
    expect(localStorage.getItem(neighbor)).toBe(peer);
    const draws = random.mock.calls.length;
    expect(draws).toBeGreaterThan(0);
    blocked = false;
    retry();
    expect(random.mock.calls).toHaveLength(draws);
    expectDraft(recap);
    held(raw);
  });

  it('reuses the verified recap copy and writes the exact same draft after a replacement refusal', () => {
    const { raw, recap, random } = plant();
    const set = Storage.prototype.setItem;
    const attempts: string[] = [];
    let blocked = true;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, name, value) {
      if (name === key) {
        attempts.push(value);
        if (blocked) throw new DOMException('fixture quota', 'QuotaExceededError');
      }
      return set.call(this, name, value);
    });

    render(<MlbFrontOfficeBoard />);
    expect(stored() === raw).toBe(true);
    const copy = held(raw);
    expect(attempts).toHaveLength(1);
    const draws = random.mock.calls.length;
    blocked = false;
    retry();
    expect(attempts).toHaveLength(2);
    expect(attempts[0] === attempts[1]).toBe(true);
    expect(random.mock.calls).toHaveLength(draws);
    expectDraft(recap);
    expect(held(raw)).toBe(copy);
  });

  it('preserves a newer save written while the old recap is being copied', () => {
    const { raw, recap } = plant();
    const newer = JSON.stringify({ ...recap, phase: 'hub', league: { ...recap.league, round: 1, season: 2027 } });
    const set = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, name, value) {
      if (name.startsWith(prefix)) set.call(this, key, newer);
      return set.call(this, name, value);
    });
    render(<MlbFrontOfficeBoard />);
    expect(stored() === newer).toBe(true);
    expect(screen.getByRole('alertdialog')).toHaveTextContent(/another tab/i);
    expect(screen.queryByRole('button', { name: 'Retry save' })).toBeNull();
    held(raw);
  });

  it('keeps a newer save after refusal when the old tab tries Retry', () => {
    const { raw, recap } = plant();
    const newer = JSON.stringify({ ...recap, phase: 'hub', league: { ...recap.league, round: 1, season: 2027 } });
    const set = Storage.prototype.setItem;
    const blocked = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, name, value) {
      if (name.startsWith(prefix)) throw new DOMException('fixture quota', 'QuotaExceededError');
      return set.call(this, name, value);
    });
    render(<MlbFrontOfficeBoard />);
    expect(stored() === raw).toBe(true);
    expect(screen.queryByRole('button', { name: 'Retry save' })).toBeVisible();
    blocked.mockRestore();

    localStorage.setItem(key, newer);
    retry();
    expect(stored() === newer).toBe(true);
    expect(screen.getByRole('alertdialog')).toHaveTextContent(/another tab/i);
    expect(copies()).toEqual([]);
    expect(localStorage.getItem(neighbor)).toBe(peer);
  });

  it('does not take a migration copy for a current recap or a draft already in progress', () => {
    const { raw } = plant(true);
    const view = render(<MlbFrontOfficeBoard />);
    expect(stored() === raw).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Go to the draft' }));
    let draft = read();
    fireEvent.click(screen.getByText(draft.draftClass[0].name));
    draft = read();
    expect(draft.picksLeft).toBe(1);
    expect(copies()).toEqual([]);
    const bytes = stored();

    view.unmount();
    render(<MlbFrontOfficeBoard />);
    expect(screen.getByText('The 2027 Draft')).toBeVisible();
    expect(stored() === bytes).toBe(true);
    expect(copies()).toEqual([]);
    expect(localStorage.getItem(neighbor)).toBe(peer);
  });
});
