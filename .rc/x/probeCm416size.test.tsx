/* Reviewer probe 3: bytes the two PRs add to a Club Manager save at their own caps (12 history rows, 12 targets). */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SAVE_KEY, finishSeason, isPartialClub, loanOutRefusal, marketForScreen, playNextEntry, saveCareer, startCareer,
  startNextSeason, type CareerState,
} from '@/lib/clubManager';
import { agreeLoanPlan, loanPlanHosts, loanPlanLoans, loanPlanPreview, reviewLoanPlan } from '@/lib/clubManagerLoanPlan';
import { addRecruitment, recruitmentOf } from '@/lib/clubManagerRecruitment';

let seed = 0;
beforeEach(() => {
  localStorage.clear(); seed = 777;
  vi.spyOn(Math, 'random').mockImplementation(() => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; });
});
afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });
const log = (...a: unknown[]) => console.log('PROBE3', ...a);
const len = (v: unknown) => (v === undefined ? 0 : JSON.stringify(v).length);
function planAll(c: CareerState, max: number): { c: CareerState; ids: string[] } {
  const ids: string[] = [];
  for (const p of [...c.squad].sort((a, b) => a.age - b.age)) {
    if (ids.length >= max) break;
    if (p.position === 'GK' || loanOutRefusal(c, p.id) !== null) continue;
    const host = loanPlanHosts(c).find(h => !isPartialClub(h, c.eraId) && loanPlanPreview(c, p.id, h, 'standard'));
    if (!host) continue;
    const next = agreeLoanPlan(c, loanPlanPreview(c, p.id, host, 'standard')!);
    if (next) { c = next; ids.push(p.id); }
  }
  return { c, ids };
}

describe('save bytes', () => {
  it('measures the new fields at their caps against the 214,000 byte budget', () => {
    for (const club of ['Everton', 'Real Madrid']) {
      let c = startCareer(club), steps = 0;
      while (steps++ < 160) { const r = playNextEntry(c, { skipHalftime: true }); c = r.state; if (r.kind === 'seasonOver') break; }
      c = startNextSeason(finishSeason(c).state);
      const market = marketForScreen(c).filter(p => p.worldRosterKey);
      for (const p of market.slice(0, 12)) { const n = addRecruitment(c, p); if (n) c = n; }
      const planned = planAll(c, 3); c = planned.c;
      for (let w = 0; w < 14; w++) {
        const r = playNextEntry(c, { skipHalftime: true }); c = r.state;
        for (const id of planned.ids) { const rv = reviewLoanPlan(c, id); if (rv) c = rv; }
      }
      const hist = (c as { loanPlanHistory?: unknown }).loanPlanHistory;
      const dev = loanPlanLoans(c).filter(l => l.development).map(l => len(l.development));
      const rec = (c as { recruitment?: unknown }).recruitment;
      expect(saveCareer(c)).toBe(true); const withNew = localStorage.getItem(SAVE_KEY)!.length;
      const bare = JSON.parse(JSON.stringify(c)); delete bare.loanPlanHistory; delete bare.recruitment;
      for (const l of bare.loanedOut ?? []) delete l.development;
      expect(saveCareer(bare)).toBe(true); const without = localStorage.getItem(SAVE_KEY)!.length;
      log(club, 'season', c.season, 'targets', recruitmentOf(c)?.targets.length, 'keyed', recruitmentOf(c)?.targets.filter(t => t.worldRosterKey).length,
        'history rows', Array.isArray(hist) ? hist.length : 0, 'history bytes', len(hist), 'per row', Array.isArray(hist) && hist.length ? Math.round(len(hist) / hist.length) : 0,
        'planned loans', dev.length, 'development bytes', JSON.stringify(dev), 'recruitment bytes', len(rec),
        'save with', withNew, 'save without', without, 'added', withNew - without);
    }
  });
});
