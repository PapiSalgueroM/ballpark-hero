/* Reviewer probe 4: a fifteen season career at the simClubManagerSaveSize clubs, then both PRs' features used to
   their own caps (12 shortlist targets, 3 planned loans, 12 weeks of check-ins). Save bytes with and without. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SAVE_KEY, finishSeason, isPartialClub, loanOutRefusal, marketForScreen, playNextEntry, saveCareer, startCareer,
  startNextSeason, type CareerState,
} from '@/lib/clubManager';
import { agreeLoanPlan, loanPlanHosts, loanPlanPreview, reviewLoanPlan } from '@/lib/clubManagerLoanPlan';
import { addRecruitment } from '@/lib/clubManagerRecruitment';

let seed = 0;
beforeEach(() => {
  localStorage.clear(); seed = 1344;
  vi.spyOn(Math, 'random').mockImplementation(() => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; });
});
afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });
const log = (...a: unknown[]) => console.log('PROBE4', ...a);
const playSeason = (c: CareerState) => { let n = 0; while (n++ < 200) { const r = playNextEntry(c, { skipHalftime: true }); c = r.state; if (r.kind === 'seasonOver') break; } return c; };
const bytes = (c: CareerState) => { expect(saveCareer(c)).toBe(true); return localStorage.getItem(SAVE_KEY)!.length; };

describe('save bytes at season 15', () => {
  it('Real Madrid, Everton, Lincoln City', () => {
    for (const club of ['Real Madrid', 'Everton', 'Lincoln City']) {
      let c = startCareer(club);
      for (let s = 1; s < 15; s++) c = startNextSeason(finishSeason(playSeason(c)).state);
      const plain = bytes(c);
      for (const p of marketForScreen(c).filter(x => x.worldRosterKey).slice(0, 12)) { const n = addRecruitment(c, p); if (n) c = n; }
      const ids: string[] = [];
      for (const p of [...c.squad].sort((a, b) => a.age - b.age)) {
        if (ids.length >= 3) break;
        if (p.position === 'GK' || loanOutRefusal(c, p.id) !== null) continue;
        const host = loanPlanHosts(c).find(h => !isPartialClub(h, c.eraId) && loanPlanPreview(c, p.id, h, 'standard'));
        const next = host ? agreeLoanPlan(c, loanPlanPreview(c, p.id, host, 'standard')!) : null;
        if (next) { c = next; ids.push(p.id); }
      }
      for (let w = 0; w < 12; w++) {
        const r = playNextEntry(c, { skipHalftime: true }); c = r.state;
        for (const id of ids) { const rv = reviewLoanPlan(c, id); if (rv) c = rv; }
      }
      const withNew = bytes(c);
      const bare = JSON.parse(JSON.stringify(c)); delete bare.loanPlanHistory; delete bare.recruitment;
      for (const l of bare.loanedOut ?? []) delete l.development;
      const without = bytes(bare);
      const rows = ((c as { loanPlanHistory?: unknown[] }).loanPlanHistory ?? []).length;
      log(club, 'season', c.season, 'week', c.week, 'plain at season 15 start', plain, 'planned', ids.length, 'history rows', rows,
        'save with features', withNew, 'same save without them', without, 'added', withNew - without, 'over 214000 by', withNew - 214000);
    }
  });
});
