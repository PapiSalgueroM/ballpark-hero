import { describe, expect, it, vi } from 'vitest';
import {
  SAVE_KEY, isPartialClub, loanOutFee, loanOutPlayer, loanOutRefusal,
  recallLoanedPlayer, saveCareer, loadCareer, startCareer,
} from '@/lib/clubManager';
import { plainCopy, worldRosterKey } from '@/lib/clubManagerWorldRoster';
import { agreeLoanPlan, loanPlanHosts, loanPlanLoans, loanPlanHistoryOf, loanPlanPreview, recallPlannedLoanee, reviewLoanPlan } from '@/lib/clubManagerLoanPlan';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
function scene() {
  const c = startCareer('Everton');
  const p = c.squad.find(player => player.position !== 'GK' && loanOutRefusal(c, player.id) === null)!;
  expect(p).toBeTruthy();
  const host = loanPlanHosts(c).find(club => !isPartialClub(club, c.eraId) && loanPlanPreview(c, p.id, club, 'standard') !== null)!;
  expect(host).toBeTruthy();
  expect(loanPlanPreview(c, p.id, host, 'standard')!.quote.opportunity.partial).toBe(false);
  return { c, p, host };
}

describe('Loan plan authority and refusal boundaries', () => {
  it('refuses partial and unknown previews without a global draw or input-state materialization', () => {
    const { c, p } = scene();
    const partial = loanPlanHosts(c).find(club => isPartialClub(club, c.eraId))!;
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
    for (const loan of loanPlanLoans(observed)) delete loan.development;
    expect(observed).toEqual(original);
    expect(loanPlanLoans(planned)[0].development).toBeTruthy();
    expect(c.squad.some(player => player.id === p.id)).toBe(true);
    expect(c.loanedOut ?? []).toHaveLength(0);
    const checkIn = reviewLoanPlan(planned, p.id)!;
    expect(loanPlanHistoryOf(checkIn)).toHaveLength(1);
    expect(loanPlanHistoryOf(checkIn)![0]).toMatchObject({ kind: 'check-in', observedWeek: c.week, rating: p.rating });
    expect(reviewLoanPlan(checkIn, p.id)).toBe(checkIn);
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
    const partial = loanPlanHosts(c).find(club => isPartialClub(club, c.eraId))!;
    expect(partial).toBeTruthy();
    const old = loanPlanLoans(planned)[0], record = old.development!;
    const current = { ...planned, week: planned.week + 1,
      loanedOut: [{ ...old, club: partial, development: { ...record, hostClub: partial,
        id: JSON.stringify([record.eraId, record.worldYear, record.season, record.sourceClub, record.playerKey, partial]) } }] };
    const before = JSON.stringify(current), playerBefore = JSON.stringify(current.loanedOut[0].player);
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('partial review drew globally'); });
    try {
      const reviewed = reviewLoanPlan(current, p.id)!;
      expect(reviewed).toBeTruthy();
      expect(loanPlanLoans(reviewed)[0].development!.review!.opportunity).toEqual({ partial: true, reason: 'CM_PARTIAL' });
      expect(loanPlanHistoryOf({ ...reviewed, week: reviewed.week - 1 })).toBeNull();
      expect(JSON.stringify(reviewed.loanedOut![0].player)).toBe(playerBefore);
      expect(JSON.stringify(current)).toBe(before);
      expect(random).not.toHaveBeenCalled();
    } finally { random.mockRestore(); }
  });

  it('preserves the unchanged annual loan settlement and only retains explicitly recorded recall history', async () => {
    const { c, p, host } = scene(), preview = loanPlanPreview(c, p.id, host, 'standard')!;
    const planned = agreeLoanPlan(c, preview)!;
    const plain = clone(planned); for (const loan of loanPlanLoans(plain)) delete loan.development;
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
        return { career: actual.startNextSeason(clone(value)), values, nextDraw: next() };
      } finally { random.mockRestore(); now.mockRestore(); }
    };
    const baseline = await run(plain), fixed = await run(planned);
    expect(fixed.career).toEqual(baseline.career);
    expect(fixed.career.budget).toBe(baseline.career.budget);
    expect(fixed.values).toEqual(baseline.values);
    expect(fixed.nextDraw).toBe(baseline.nextDraw);
    expect(loanPlanHistoryOf(fixed.career)).toEqual([]);
    expect(Object.prototype.hasOwnProperty.call(fixed.career, 'loanPlanHistory')).toBe(false);
    const recordId = loanPlanLoans(planned)[0].development!.id;
    const recalled = recallPlannedLoanee(planned, p.id, recordId)!;
    expect(recalled).toBeTruthy();
    const history = loanPlanHistoryOf(recalled)!;
    expect(history).toHaveLength(1); expect(history[0].kind).toBe('recalled');
    const returned = recalled.squad.find(player => p.worldRosterKey ? player.worldRosterKey === p.worldRosterKey : player.id === p.id);
    expect(returned).toBeTruthy(); expect(history[0].rating).toBe(returned!.rating);
    localStorage.clear(); expect(saveCareer(recalled)).toBe(true);
    const loaded = loadCareer()!;
    expect(loaded).toBeTruthy(); expect(loanPlanHistoryOf(loaded)).toEqual(history);
    const advanced = await run(loaded);
    expect(loanPlanHistoryOf(advanced.career)).toEqual(history);
    expect(loanPlanHistoryOf(advanced.career)!.every(row => row.kind === 'check-in' || row.kind === 'recalled')).toBe(true);
    localStorage.removeItem(SAVE_KEY);
  });
  it('keeps ordinary recall and its exact limit as authority for a planned loan', () => {
    const { c, p, host } = scene(), preview = loanPlanPreview(c, p.id, host, 'standard')!;
    const planned = agreeLoanPlan(c, preview)!;
    const full = { ...planned, squad: Array.from({ length: 30 }, (_, index) => ({ ...c.squad[0], id: 'test-' + index })) };
    const before = JSON.stringify(full), recordId = loanPlanLoans(full)[0].development!.id;
    expect(recallLoanedPlayer(full, p.id)).toBeNull();
    expect(recallPlannedLoanee(full, p.id, recordId)).toBeNull();
    expect(JSON.stringify(full)).toBe(before);
  });
  it('recalls the actual legacy loanee when another squad member holds his old ID', () => {
    let seed = 907, values: number[] = [];
    const random = vi.spyOn(Math, 'random').mockImplementation(() => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const value = seed / 4294967296; values.push(value); return value;
    });
    const now = vi.spyOn(Date, 'now').mockReturnValue(1791360000000);
    const observe = <T,>(action: () => T) => {
      seed = 907; values = [];
      const career = action(), draws = [...values], nextDraw = Math.random();
      return { career, draws, nextDraw };
    };
    try {
      for (const keyedOccupant of [false, true]) {
        seed = 907;
        const { c, p, host } = scene(), source = plainCopy(c);
        const player = source.squad.find(member => member.id === p.id)!;
        delete player.worldRosterKey;
        const preview = loanPlanPreview(source, player.id, host, 'standard')!;
        expect(preview).toBeTruthy();
        const planned = agreeLoanPlan(source, preview)!;
        expect(planned).toBeTruthy();
        const record = loanPlanLoans(planned).find(loan => loan.player.id === player.id)!.development!;
        expect(record.playerKey).toBe('squad:' + player.id);
        const occupant = planned.squad.find(member => member.name !== player.name && member.rating !== player.rating)!;
        expect(occupant).toBeTruthy();
        expect(planned.squad.some(member => member.id === player.id)).toBe(false);
        delete occupant.worldRosterKey;
        if (keyedOccupant) {
          const key = worldRosterKey(planned, planned.clubName, occupant);
          expect(key).toBeTruthy(); occupant.worldRosterKey = key!;
        }
        occupant.id = player.id;
        expect(new Set(planned.squad.map(member => member.id)).size).toBe(planned.squad.length);
        const before = plainCopy(planned);
        const baseline = observe(() => recallLoanedPlayer(plainCopy(planned), player.id));
        const fixed = observe(() => recallPlannedLoanee(planned, player.id, record.id));
        expect(baseline.career).toBeTruthy(); expect(fixed.career).toBeTruthy();
        expect(planned).toStrictEqual(before);
        expect(fixed.draws).toStrictEqual(baseline.draws);
        expect(fixed.nextDraw).toBe(baseline.nextDraw);
        const returned = baseline.career!.squad[baseline.career!.squad.length - 1];
        expect(returned.name).toBe(player.name); expect(returned.id).not.toBe(player.id);
        expect(returned.rating).not.toBe(occupant.rating);
        const projected = plainCopy(fixed.career!);
        delete projected.loanPlanHistory;
        expect(projected).toStrictEqual(baseline.career);
        const history = loanPlanHistoryOf(fixed.career!)!;
        expect(history).toHaveLength(1);
        expect(history[0]).toMatchObject({ kind: 'recalled', playerName: returned.name,
          rating: returned.rating, ratingChange: returned.rating - record.ratingAtStart });
        localStorage.clear(); expect(saveCareer(fixed.career!)).toBe(true);
        const loaded = loadCareer()!;
        expect(loaded).toBeTruthy(); expect(loanPlanHistoryOf(loaded)).toStrictEqual(history);
        expect(loaded.squad.find(member => member.id === returned.id)).toMatchObject({
          name: returned.name, rating: returned.rating,
        });
      }
    } finally { random.mockRestore(); now.mockRestore(); localStorage.removeItem(SAVE_KEY); }
  });
});
