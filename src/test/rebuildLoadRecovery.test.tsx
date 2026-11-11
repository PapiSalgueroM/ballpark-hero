import './dailyReload/mocks';
import { waitFor, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import Rebuild from '@/pages/Rebuild';
import { REBUILD_SAVE_KEY } from '@/lib/rebuildSave';
import { click, mountPage } from './dailyReload/harness';
import { resetMocks, setTableFixture } from './dailyReload/mocks';

it('keeps the saved Rebuild window when the squad is unavailable and restores it on retry', async () => {
  resetMocks();
  const club = 'Real Madrid';
  const squad = [{ player_name: 'Kylian Mbappé', club, position: 'Centre-Forward', market_value_usd: 216_000_000 }];
  setTableFixture('rebuild_clubs', [{ club, tier: 'elite', squad_size: 24, squad_value_m: 1000 }]);
  setTableFixture('player_market_values', squad);
  setTableFixture('game_player_pool', [{ player_name: 'Erling Haaland', club: 'Manchester City', position: 'Centre-Forward', market_value_usd: 216_000_000 }]);
  localStorage.removeItem(REBUILD_SAVE_KEY);
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
