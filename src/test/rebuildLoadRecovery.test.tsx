import './dailyReload/mocks';
import { act, renderHook, waitFor, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import Rebuild from '@/pages/Rebuild';
import { useRebuild } from '@/hooks/useRebuild';
import { REBUILD_SAVE_KEY } from '@/lib/rebuildSave';
import { click, mountPage } from './dailyReload/harness';
import { resetMocks, setTableFixture } from './dailyReload/mocks';

function setRebuildFixtures() {
  resetMocks();
  const club = 'Real Madrid';
  const squad = [{ player_name: 'Kylian Mbappé', club, position: 'Centre-Forward', market_value_usd: 216_000_000 }];
  setTableFixture('rebuild_clubs', [{ club, tier: 'elite', squad_size: 24, squad_value_m: 1000 }]);
  setTableFixture('player_market_values', squad);
  setTableFixture('game_player_pool', [{ player_name: 'Erling Haaland', club: 'Manchester City', position: 'Centre-Forward', market_value_usd: 216_000_000 }]);
  localStorage.removeItem(REBUILD_SAVE_KEY);
  return squad;
}

it('keeps the saved Rebuild window when the squad is unavailable and restores it on retry', async () => {
  const squad = setRebuildFixtures();
  let page = mountPage(<Rebuild />, '/rebuild');
  try {
    const first = within(page.container);
    await click(await first.findByRole('button', { name: /real madrid/i }));
    await click(await first.findByRole('button', { name: 'Envelope 1' }));
    const saved = localStorage.getItem(REBUILD_SAVE_KEY);
    expect(saved).toContain('"moves":[{"k":"finance","i":0}]');
    page.unmount();

    setTableFixture('player_market_values', []);
    page = mountPage(<Rebuild />, '/rebuild');
    const resumed = within(page.container);
    await waitFor(() => {
      expect(resumed.queryByRole('button', { name: /try again|real madrid/i })).toBeVisible();
    });
    expect(localStorage.getItem(REBUILD_SAVE_KEY)).toBe(saved);
    const retry = resumed.getByRole('button', { name: 'Try again' });
    setTableFixture('player_market_values', squad);
    await click(retry);
    expect(await resumed.findByText('Two envelopes on the desk')).toBeVisible();
    expect(resumed.queryByRole('button', { name: 'Envelope 1' })).toBeNull();
    expect(localStorage.getItem(REBUILD_SAVE_KEY)).toBe(saved);
  } finally {
    page.unmount();
    localStorage.removeItem(REBUILD_SAVE_KEY);
  }
});

it('keeps the newer Rebuild save when an older tab tries a different envelope', async () => {
  setRebuildFixtures();
  const first = mountPage(<Rebuild />, '/rebuild');
  let second: typeof first | undefined;
  let cold: typeof first | undefined;
  try {
    const active = within(first.container);
    await click(await active.findByRole('button', { name: /real madrid/i }));
    const firstEnvelope = await active.findByRole('button', { name: 'Envelope 1' });

    second = mountPage(<Rebuild />, '/rebuild');
    const stale = within(second.container);
    const secondEnvelope = await stale.findByRole('button', { name: 'Envelope 2' });

    await click(firstEnvelope);
    await click(active.getByRole('button', { name: 'Now hire a manager' }));
    const saved = localStorage.getItem(REBUILD_SAVE_KEY);
    expect(saved).toContain('"moves":[{"k":"finance","i":0},{"k":"toManager"}]');

    await click(secondEnvelope);
    expect(localStorage.getItem(REBUILD_SAVE_KEY)).toBe(saved);
    expect(stale.getByRole('alert')).toHaveTextContent('another tab');
    expect(stale.getByRole('button', { name: 'Reload saved window' })).toBeVisible();

    cold = mountPage(<Rebuild />, '/rebuild');
    expect(await within(cold.container).findByText('Pick your manager')).toBeVisible();
    expect(localStorage.getItem(REBUILD_SAVE_KEY)).toBe(saved);
  } finally {
    cold?.unmount();
    second?.unmount();
    first.unmount();
    localStorage.removeItem(REBUILD_SAVE_KEY);
  }
});

it('keeps playing after storage refuses a write and still allows a normal restart', async () => {
  setRebuildFixtures();
  const { result, unmount } = renderHook(useRebuild);
  const original = Storage.prototype.setItem;
  let refuse = false;
  const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
    if (refuse && key === REBUILD_SAVE_KEY) throw new DOMException('Storage full', 'QuotaExceededError');
    original.call(this, key, value);
  });
  try {
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => result.current.chooseClub(result.current.clubs[0]));
    await waitFor(() => expect(result.current.phase).toBe('envelopes'));
    const saved = localStorage.getItem(REBUILD_SAVE_KEY);
    expect(saved).not.toBeNull();

    refuse = true;
    await act(async () => result.current.pickFinance(0));
    await act(async () => result.current.toManager());
    expect(result.current.phase).toBe('manager');
    expect(result.current.saveConflict).toBe(false);
    expect(localStorage.getItem(REBUILD_SAVE_KEY)).toBe(saved);

    refuse = false;
    await act(async () => result.current.reset());
    expect(result.current.phase).toBe('pick-club');
    expect(localStorage.getItem(REBUILD_SAVE_KEY)).toBeNull();
    await act(async () => result.current.chooseClub(result.current.clubs[0]));
    await waitFor(() => expect(result.current.phase).toBe('envelopes'));
    expect(result.current.saveConflict).toBe(false);
    expect(localStorage.getItem(REBUILD_SAVE_KEY)).toContain('"moves":[]');
  } finally {
    write.mockRestore();
    unmount();
    localStorage.removeItem(REBUILD_SAVE_KEY);
  }
});
