import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import NbaFrontOfficeBoard from '@/components/nba-front-office/NbaFrontOfficeBoard';
import { initNbaLeague } from '@/lib/nbaFrontOffice';
import { keyedRng } from '@/lib/keyedRng';
import type { FoSavedStats } from '@/lib/foStatsCodec';
import fixture from '../../../scripts/data/nbaNamedBlockFixture.json';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

const key = 'nba-front-office-save-v1';
const prefix = key + '.broken-';
const anotherSave = 'nfl-front-office-save-v1';
const peer = '{ "week": 5 }';
const team = 'PHX';
const packed: FoSavedStats = JSON.parse(JSON.stringify(fixture.packed).replace(/#(\d+)/g, (_, number) => 'n' + fixture.ep + '-' + (fixture.low + Number(number))));
const read = () => JSON.parse(localStorage.getItem(key)!);
const backupKeys = () => Object.keys(localStorage).filter(key => key.startsWith(prefix));
const open = () => fireEvent.click(screen.getByText('Play', { exact: true }));
const picker = () => screen.getByRole<HTMLSelectElement>('combobox', { name: 'Rest a starter' });
const bookRest = () => {
  const playerId = picker().options[1].value;
  fireEvent.change(picker(), { target: { value: playerId } });
  return playerId;
};
const retry = () => fireEvent.click(screen.getByRole('button', { name: 'Retry save' }));

function plant(current = false) {
  const league = initNbaLeague(keyedRng('NBA named lines recovery'));
  const raw = JSON.stringify({
    league: { ...league, season: fixture.block.season, round: 19, stats: current ? packed : fixture.block },
    myTeam: team, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0,
  }, null, 2);
  localStorage.setItem(key, raw);
  localStorage.setItem(anotherSave, peer);
  const view = render(<NbaFrontOfficeBoard />);
  open();
  return { raw, view };
}

function onlyBackup(raw: string) {
  expect(backupKeys()).toHaveLength(1);
  const [copy] = backupKeys();
  expect(localStorage.getItem(copy)).toBe(raw);
  expect(localStorage.getItem(anotherSave)).toBe(peer);
  return copy;
}

afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

describe('NBA Front Office named statistics recovery', () => {
  it('backs up the exact named save before an ordinary rest booking converts its 283 player lines', () => {
    const { raw, view } = plant();
    expect(localStorage.getItem(key) === raw).toBe(true);
    expect(backupKeys()).toEqual([]);
    const chosen = bookRest();
    expect(read().league.round).toBe(19);
    expect(read().league.restPlan).toMatchObject({ playerId: chosen });
    expect(read().league.stats).toEqual(packed);
    const copy = onlyBackup(raw);

    view.unmount();
    render(<NbaFrontOfficeBoard />);
    open();
    expect(picker()).toHaveValue(chosen);
    fireEvent.change(picker(), { target: { value: '' } });
    expect(onlyBackup(raw)).toBe(copy);
  });

  it.each(['refused', 'wrong readback'])('holds the old bytes when the backup is %s and retries the pending rest booking', fault => {
    const { raw } = plant();
    const set = Storage.prototype.setItem;
    let blocked = true;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (blocked && key.startsWith(prefix)) {
        if (fault === 'refused') throw new DOMException('fixture quota', 'QuotaExceededError');
        return set.call(this, key, 'incorrect backup');
      }
      return set.call(this, key, value);
    });

    const chosen = bookRest();
    expect(screen.queryByRole('button', { name: 'Retry save' })).toBeVisible();
    expect(picker()).toHaveValue(chosen);
    expect(localStorage.getItem(key) === raw).toBe(true);
    expect(backupKeys()).toEqual([]);
    blocked = false;
    retry();
    expect(read().league.restPlan).toMatchObject({ playerId: chosen });
    expect(read().league.stats).toEqual(packed);
    expect(screen.queryByRole('button', { name: 'Retry save' })).toBeNull();
    onlyBackup(raw);
  });

  it('reuses the verified copy when the active write is refused and retries the same played round', () => {
    const { raw } = plant();
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.48);
    const set = Storage.prototype.setItem;
    let denyMain = true;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, name, value) {
      if (denyMain && name === key) throw new DOMException('fixture quota', 'QuotaExceededError');
      return set.call(this, name, value);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Play Round 19' }));
    expect(screen.getByRole('button', { name: 'Final stretch + playoffs' })).toBeVisible();
    expect(localStorage.getItem(key) === raw).toBe(true);
    const copy = onlyBackup(raw);

    denyMain = false;
    const draws = random.mock.calls.length;
    retry();
    expect(random.mock.calls.length).toBe(draws);
    expect(read().league.round).toBe(20);
    expect(read().lastRound.round).toBe(19);
    const stats = read().league.stats;
    for (const [club, lines] of Object.entries(packed.lines)) {
      expect(stats.lines[club]).toMatchObject(lines);
    }
    expect(onlyBackup(raw)).toBe(copy);
  });

  it('leaves a newer tab as the active franchise if it writes while the backup is being made', () => {
    const { raw } = plant();
    const old = JSON.parse(raw);
    const newer = JSON.stringify({ ...old, league: { ...old.league, round: 20, stats: packed } });
    const set = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key.startsWith(prefix)) set.call(this, 'nba-front-office-save-v1', newer);
      return set.call(this, key, value);
    });
    bookRest();
    expect(localStorage.getItem(key) === newer).toBe(true);
    expect(screen.getByRole('alertdialog')).toHaveTextContent(/another tab/i);
    expect(screen.queryByRole('button', { name: 'Retry save' })).toBeNull();
    onlyBackup(raw);
  });

  it('refuses an old retry after another tab has saved the franchise', () => {
    const { raw } = plant();
    const old = JSON.parse(raw);
    const newer = JSON.stringify({ ...old, league: { ...old.league, round: 20, stats: packed } });
    const set = Storage.prototype.setItem;
    const blocked = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key.startsWith(prefix)) throw new DOMException('fixture quota', 'QuotaExceededError');
      return set.call(this, key, value);
    });
    bookRest();
    expect(screen.getByRole('button', { name: 'Retry save' })).toBeVisible();
    blocked.mockRestore();

    localStorage.setItem(key, newer);
    retry();
    expect(localStorage.getItem(key) === newer).toBe(true);
    expect(screen.getByRole('alertdialog')).toHaveTextContent(/another tab/i);
    expect(backupKeys()).toEqual([]);
    expect(localStorage.getItem(anotherSave)).toBe(peer);
  });
  it('takes no migration copy for a current compact save', () => {
    plant(true);
    const chosen = bookRest();
    expect(read().league.restPlan).toMatchObject({ playerId: chosen });
    expect(read().league.stats).toEqual(packed);
    expect(backupKeys()).toEqual([]);
    expect(localStorage.getItem(anotherSave)).toBe(peer);
  });
});
