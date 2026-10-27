import { describe, expect, it, vi } from 'vitest';
import {
  SAVE_KEY, isPartialClub, loanOutFee, loanOutPlayer, loanOutRefusal, loanPlanHostClubs,
  recallLoanedPlayer, saveCareer, loadCareer, startCareer,
} from '@/lib/clubManager';
import { agreeLoanPlan, loanPlanPreview, recallPlannedLoanee, reviewLoanPlan } from '@/lib/clubManagerLoanPlan';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
function scene() {
  const c = startCareer('Everton');
  const p = c.squad.find(player => player.position !== 'GK' && loanOutRefusal(c, player.id) === null)!;
  expect(p).toBeTruthy();
  const host = loanPlanHostClubs(c).find(club => !isPartialClub(club, c.eraId))!;
  expect(host).toBeTruthy();
  return { c, p, host };
}

describe('Loan plan authority and refusal boundaries', () => {
  it('refuses partial and unknown previews without a global draw or input-state materialization', () => {
    const { c, p } = scene();
    const partial = loanPlanHostClubs(c).find(club => isPartialClub(club, c.eraId))!;
    expect(partial).toBeTruthy();
    const before = JSON.stringify(c);
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('refused preview drew globally'); });
    try {
      expect(loanPlanPreview(c, p.id, partial, 'standard')).toBeNull();
      expect(loanPlanPreview(c, p.id, 'Unknown host', 'standard')).toBeNull();
      expect(JSON.stringify(c)).toBe(before);
      expect(random).not.toHaveBeenCalled();
    } finally { random.mockRestore(); }
  });

  it('creates only the matching successful actual loan and leaves all other authority fields equal', () => {
    const { c, p, host } = scene();
    const preview = loanPlanPreview(c, p.id, host, 'standard')!;
    expect(preview).toBeTruthy();
    const original = loanOutPlayer(clone(c), p.id, host, loanOutFee(p))!;
    const planned = agreeLoanPlan(c, preview)!;
    expect(planned).toBeTruthy();
    const observed = clone(planned);
    for (const loan of observed.loanedOut ?? []) delete loan.development;
    expect(observed).toEqual(original);
    expect(planned.loanedOut![0].development).toBeTruthy();
    expect(c.squad.some(player => player.id === p.id)).toBe(true);
    expect(c.loanedOut ?? []).toHaveLength(0);
  });

  it('refuses a stale same-week fee and keeps a declined action byte-neutral', () => {
    const { c, p, host } = scene(), before = JSON.stringify(c);
    const preview = loanPlanPreview(c, p.id, host, 'standard')!;
    expect(agreeLoanPlan(c, { ...preview, token: 'stale' })).toBeNull();
    expect(agreeLoanPlan({ ...c, transferWindow: null }, preview)).toBeNull();
    expect(JSON.stringify(c)).toBe(before);
  });

  it('records a partial review honestly without drawing globally or changing the actual loan player', () => {
    const { c, p, host } = scene(), preview = loanPlanPreview(c, p.id, host, 'standard')!;
    const planned = agreeLoanPlan(c, preview)!;
    const partial = loanPlanHostClubs(c).find(club => isPartialClub(club, c.eraId))!;
    expect(partial).toBeTruthy();
    const old = planned.loanedOut![0], record = old.development!;
    const current = { ...planned, week: planned.week + 1,
      loanedOut: [{ ...old, club: partial, development: { ...record, hostClub: partial,
        id: JSON.stringify([record.eraId, record.worldYear, record.season, record.sourceClub, record.playerKey, partial]) } }] };
    const before = JSON.stringify(current), playerBefore = JSON.stringify(current.loanedOut[0].player);
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('partial review drew globally'); });
    try {
      const reviewed = reviewLoanPlan(current, p.id)!;
      expect(reviewed).toBeTruthy();
      expect(reviewed.loanedOut![0].development!.review!.opportunity).toEqual({ partial: true, reason: 'CM_PARTIAL' });
      expect(JSON.stringify(reviewed.loanedOut![0].player)).toBe(playerBefore);
      expect(JSON.stringify(current)).toBe(before);
      expect(random).not.toHaveBeenCalled();
    } finally { random.mockRestore(); }
  });

  it('archives actual annual settlement without changing growth or budget outcomes', async () => {
    const { c, p, host } = scene(), preview = loanPlanPreview(c, p.id, host, 'standard')!;
    const planned = agreeLoanPlan(c, preview)!;
    const plain = clone(planned); for (const loan of plain.loanedOut ?? []) delete loan.development;
    const stream = (initial: number) => { let seed = initial; return () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296;
    }; };
    const run = async (value: typeof c) => {
      vi.resetModules();
      const values: number[] = [], next = stream(907);
      const random = vi.spyOn(Math, 'random').mockImplementation(() => { const v = next(); values.push(v); return v; });
      const now = vi.spyOn(Date, 'now').mockReturnValue(1791360000000);
      try {
        const actual = await import('@/lib/clubManager');
        return { career: actual.startNextSeason(value), values };
      } finally { random.mockRestore(); now.mockRestore(); }
    };
    const baseline = await run(plain), fixed = await run(planned), projected = clone(fixed.career);
    delete projected.loanPlanHistory;
    expect(projected).toEqual(baseline.career);
    expect(fixed.values).toEqual(baseline.values);
    expect(fixed.career.loanPlanHistory).toHaveLength(1);
    expect(fixed.career.loanPlanHistory![0].ratingAtEnd).toBeGreaterThanOrEqual(0);
    localStorage.clear(); expect(saveCareer(fixed.career)).toBe(true);
    expect(loadCareer()!.loanPlanHistory).toEqual(fixed.career.loanPlanHistory);
    localStorage.removeItem(SAVE_KEY);
  });

  it('keeps ordinary recall and its exact limit as authority for a planned loan', () => {
    const { c, p, host } = scene(), preview = loanPlanPreview(c, p.id, host, 'standard')!;
    const planned = agreeLoanPlan(c, preview)!;
    const full = { ...planned, squad: Array.from({ length: 30 }, (_, index) => ({ ...c.squad[0], id: 'test-' + index })) };
    const before = JSON.stringify(full), recordId = full.loanedOut![0].development!.id;
    expect(recallLoanedPlayer(full, p.id)).toBeNull();
    expect(recallPlannedLoanee(full, p.id, recordId)).toBeNull();
    expect(JSON.stringify(full)).toBe(before);
  });
});
