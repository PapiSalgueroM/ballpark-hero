/* Reviewer probe for Release BS, PR 416 and PR 420. Prints measured values; each expect encodes a reviewer claim. */
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  finishSeason, isPartialClub, loadCareer, loanOutRefusal, marketForScreen, playNextEntry, saveCareer,
  startCareer, startNextSeason, type CareerState,
} from '@/lib/clubManager';
import { agreeLoanPlan, loanPlanHistoryOf, loanPlanHosts, loanPlanLoans, loanPlanPreview, reviewLoanPlan } from '@/lib/clubManagerLoanPlan';
import { addRecruitment, recruitmentOf, resolveRecruitmentTarget } from '@/lib/clubManagerRecruitment';
import { RecruitmentBoard } from '@/components/club-manager/RecruitmentBoard';

let seed = 0;
beforeEach(() => {
  localStorage.clear(); seed = 4242;
  vi.spyOn(Math, 'random').mockImplementation(() => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });
const log = (...a: unknown[]) => console.log('PROBE', ...a);

describe('PR 416 loan plan check-ins', () => {
  it('A: a planned loan is reviewed every week of a season; every saved rating change is 0, and the real growth lands only at the summer return', () => {
    for (const club of ['Everton', 'Brentford', 'Chelsea']) {
      const c = startCareer(club);
      const young = [...c.squad].filter(p => p.position !== 'GK' && loanOutRefusal(c, p.id) === null).sort((a, b) => a.age - b.age);
      let planned: CareerState | null = null, id = '', start = 0, age = 0;
      for (const p of young) {
        const host = loanPlanHosts(c).find(h => !isPartialClub(h, c.eraId) && loanPlanPreview(c, p.id, h, 'standard'));
        if (!host) continue;
        planned = agreeLoanPlan(c, loanPlanPreview(c, p.id, host, 'standard')!);
        if (planned) { id = p.id; start = p.rating; age = p.age; break; }
      }
      expect(planned).toBeTruthy();
      let s = planned!; const changes: number[] = []; let reviews = 0, steps = 0;
      while (steps++ < 140) {
        const r = playNextEntry(s, { skipHalftime: true }); s = r.state;
        if (r.kind === 'seasonOver') break;
        const rv = reviewLoanPlan(s, id);
        if (rv && rv !== s) { reviews++; s = rv; const rec = loanPlanLoans(s).find(l => l.player.id === id)?.development; if (rec?.review) changes.push(rec.review.ratingChange); }
      }
      const away = loanPlanLoans(s).find(l => l.player.id === id);
      const hist = loanPlanHistoryOf(s) ?? [];
      const closed = startNextSeason(finishSeason(s).state);
      const name = planned!.loanedOut!.find(l => l.player.id === id)!.player.name;
      const back = closed.squad.find(p => p.name === name);
      log(club, 'age', age, 'start', start, 'reviews', reviews, 'distinct changes', JSON.stringify([...new Set(changes)]),
        'history rows', hist.length, 'history ratings', JSON.stringify([...new Set(hist.map(h => h.ratingChange))]),
        'rating while away at season end', away?.player.rating, 'after summer return', back?.rating ?? 'not home (option bought)',
        'history after return', (loanPlanHistoryOf(closed) ?? []).length);
      expect(reviews).toBeGreaterThan(5);
      expect([...new Set(changes)]).toEqual([0]);
      expect([...new Set(hist.map(h => h.ratingChange))]).toEqual([0]);
    }
  });

  it('D: a successful preview of every host draws nothing and changes nothing', () => {
    const c = startCareer('Everton'); const before = JSON.stringify(c);
    const p = c.squad.find(x => x.position !== 'GK' && loanOutRefusal(c, x.id) === null)!;
    const spy = Math.random as unknown as { mock: { calls: unknown[] } }; const n0 = spy.mock.calls.length;
    const ok = loanPlanHosts(c).filter(h => loanPlanPreview(c, p.id, h, 'standard')).length;
    log('hosts', loanPlanHosts(c).length, 'previewable', ok, 'draws during previews', spy.mock.calls.length - n0);
    expect(spy.mock.calls.length - n0).toBe(0); expect(JSON.stringify(c)).toBe(before);
  });
});

describe('PR 420 shortlist', () => {
  it('B: a 13th save is refused with a message that blames the save, not the 12 limit', async () => {
    let c: CareerState = startCareer('Brentford'); const market = marketForScreen(c);
    for (const p of market.slice(0, 12)) c = addRecruitment(c, p)!;
    expect(recruitmentOf(c)!.targets).toHaveLength(12);
    expect(addRecruitment(c, market[12])).toBeNull();
    render(<RecruitmentBoard career={c} market={market} initial={{ career: c, player: market[12] }}
      onCommit={make => !!make(c)} onBack={() => {}} onFind={() => {}} />);
    await waitFor(() => expect(screen.getByText(/Could not save this target/)).toBeTruthy());
    const text = screen.getByText(/Could not save this target/).textContent ?? '';
    log('13th save message:', text);
    expect(text).toBe('Could not save this target. Check the save notice and try again.');
  });

  it('C: the shortlist survives a save, a load and a new season; old and sold men show as unavailable', () => {
    let c: CareerState = startCareer('Everton'); const market = marketForScreen(c);
    const old = market.filter(p => p.age >= 35).slice(0, 4), young = market.filter(p => p.age <= 25).slice(0, 4);
    for (const p of [...old, ...young]) c = addRecruitment(c, p)!;
    expect(saveCareer(c)).toBe(true); const loaded = loadCareer()!;
    expect(recruitmentOf(loaded)!.targets).toHaveLength(8);
    let s = loaded, steps = 0;
    while (steps++ < 140) { const r = playNextEntry(s, { skipHalftime: true }); s = r.state; if (r.kind === 'seasonOver') break; }
    const next = startNextSeason(finishSeason(s).state); const m2 = marketForScreen(next);
    const r = recruitmentOf(next);
    const resolved = r ? r.targets.map(t => !!resolveRecruitmentTarget(next, t, m2)) : [];
    log('targets after new season', r?.targets.length ?? 'LOST', 'resolved', JSON.stringify(resolved), 'old ages', JSON.stringify(old.map(p => p.age)));
    expect(r).toBeTruthy(); expect(r!.targets).toHaveLength(8);
  });
});
