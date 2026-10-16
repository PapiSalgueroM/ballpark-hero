import { expect, it, vi } from 'vitest';
/* Fix of Round 1508 (the read review's minor 2 on decision 5): the bytes the adoption adds to the saved string of an
   old career that signed men before its summer (one owned record each, the ledger kept literal). A probe, copied into
   src only on the runner and never committed. It prints, it asserts only that it measured something. */
import type { CareerState } from '@/lib/clubManager';
import { SAVE_KEY, adoptLivingWorld, buildMarket, buyPlayer, saveCareer, startCareer } from '@/lib/clubManager';
import { readWorldRoster } from '@/lib/clubManagerWorldRoster';

function oldCareer(club: string): CareerState {
  const rng = vi.spyOn(Math, 'random').mockReturnValue(0.6);
  try {
    const c = startCareer(club);
    delete c.worldSeed; delete c.worldRoster;
    return { ...c, budget: 9999, wageCap: 9999, transferWindow: 'summer' };
  } finally { rng.mockRestore(); }
}
function saved(c: CareerState): number {
  localStorage.clear(); expect(saveCareer(c)).toBe(true);
  return localStorage.getItem(SAVE_KEY)!.length;
}

it('measures the bytes the adoption adds', () => {
  let rows = 0;
  for (const club of ['Everton', 'Real Madrid', 'Aberdeen']) {
    for (const want of [0, 1, 5, 10]) {
      let c = oldCareer(club); let signed = 0;
      for (let i = 0; i < 40 && signed < want; i++) {
        const offer = buildMarket(c).filter(p => p.club !== c.clubName && p.position !== 'GK' && !c.squad.some(s => s.name === p.name))[i];
        if (!offer) break;
        const next = buyPlayer(c, offer);
        if (next) { c = next; signed += 1; }
      }
      const before = saved(c);
      const adopted = adoptLivingWorld(c);
      const after = saved(adopted);
      const records = readWorldRoster(adopted)?.records.length ?? -1;
      console.log(`SIZE ${club}: signed ${signed} before the summer, ${records} records, saved ${before} -> ${after} characters (+${after - before}${records > 0 ? `, about ${Math.round((after - before) / records)} a record` : ''})`);
      rows += 1;
    }
  }
  expect(rows).toBe(12);
});
