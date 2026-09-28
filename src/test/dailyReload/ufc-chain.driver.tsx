/** /ufc-chain (Combat Chain) for scripts/simDailyReload.mjs; the logic is
 *  shared with the NASCAR and Tennis rows in ./chainShared. The menu's daily
 *  button reads "Daily" over "Same fighter for everyone".
 *
 *  Combat validates from the bundled fight results, so its link is real: the
 *  daily starter is pinned (./mocks, 'ufcStarter') to the first fighter in
 *  the data with a recorded loss to somebody, and the link is typed into the
 *  board's own search as that somebody's name. */
import './mocks';
import { waitFor } from '@testing-library/react';
import { defineDriver } from './driver';
import { chainDriver, currentName } from './chainShared';
import { setPoolFixture } from './mocks';
import { click, typeInto } from './harness';
import { UFC_FIGHTERS, getFightersWhoBeat } from '@/data/ufcChainData';
import UfcChain from '@/pages/UfcChain';

function pinnedStarter() {
  const starter = UFC_FIGHTERS.find(f => f.losses > 0 && getFightersWhoBeat(f.name).some(w => w.name !== f.name));
  if (!starter) throw new Error('no fighter in the bundled results has a recorded loss, nothing to chain');
  return { starter, winner: getFightersWhoBeat(starter.name).find(w => w.name !== starter.name)! };
}

export default defineDriver(chainDriver({
  slug: 'ufc-chain',
  path: '/ufc-chain',
  page: <UfcChain />,
  dailyButton: /Daily/,
  fixtures() {
    setPoolFixture('ufcStarter', pinnedStarter().starter);
  },
  async addLink(m) {
    const { starter, winner } = pinnedStarter();
    const input = m.container.querySelector('input[aria-label="Search for a fighter who beat them"]');
    if (!input) throw new Error('no fighter search on the live chain');
    await typeInto(input, winner.name);
    const pick = await waitFor(() => {
      const b = Array.from(m.container.querySelectorAll('button')).find(x => x.querySelector('span')?.textContent?.trim() === winner.name);
      if (!b) throw new Error(`no ${winner.name} in the search results`);
      return b;
    });
    await click(pick);
    await waitFor(() => {
      if (!currentName(m).startsWith(winner.name)) throw new Error(`the chain is not on ${winner.name} after ${starter.name}`);
    });
  },
}));
