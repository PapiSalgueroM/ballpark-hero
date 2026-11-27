import { StrictMode } from 'react';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  SAVE_KEY, callLivePenalty, engineRegistrations, livePenaltyEligible, livePenaltyProgress, playNextEntry,
  restoreEngineRegistrations, resumeMatch, startCareer, startExtraTime, startLivePenaltyCalls, startSecondHalf,
  type CareerState,
} from '@/lib/clubManager';
import { useClubManager, type ClubManagerGame } from '@/hooks/useClubManager';
import { recordActivity } from '@/lib/completions';
import { createSaveFence, saveFence } from '@/lib/saveFence';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), recordStreakDay: vi.fn() }));

function seeded<T>(seed: number, play: () => T) {
  const original = Math.random;
  let state = seed;
  Math.random = () => {
    state = (state + 0x6d2b79f5) | 0;
    let n = Math.imul(state ^ (state >>> 15), 1 | state);
    n = (n + Math.imul(n ^ (n >>> 7), 61 | n)) ^ n;
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
  try { return play(); } finally { Math.random = original; }
}

let cup: CareerState, league: CareerState, firstLeg: CareerState, secondLeg: CareerState;
let registrations: ReturnType<typeof engineRegistrations>;
beforeAll(() => {
  registrations = engineRegistrations();
  const now = vi.spyOn(Date, 'now').mockReturnValue(1793000000000);
  try {
    let career = seeded(16050, () => startCareer('Real Madrid'));
    for (let i = 0; i < 90; i++) {
      const entry = career.calendar[career.week];
      if (!entry) break;
      const interesting = (!league && entry.type === 'league') || (!cup && entry.type === 'cup')
        || (entry.type === 'uclKo' && entry.uclRound === career.uclKoRound);
      if (interesting) {
        const kickoff = seeded(16150 + i, () => playNextEntry(career));
        if (kickoff.kind === 'halftime' && kickoff.live?.week === career.week) {
          const played = seeded(16250 + i, () => startSecondHalf(kickoff.state))!;
          Object.assign(played.live!, { myGoals: 0, oppGoals: 0, h1My: [], h1Opp: [], h2My: [], h2Opp: [], callPenalties: true });
          if (entry.type === 'league') league = played;
          if (entry.type === 'cup') cup = played;
          if (entry.uclLeg === 1) firstLeg = played;
          if (entry.uclLeg === 2) {
            secondLeg = played;
            const tie = played.uclBracket!.find(t => t.mine && t.round === entry.uclRound)!;
            tie.leg1 = tie.home === played.clubName ? { homeGoals: 1, awayGoals: 0 } : { homeGoals: 0, awayGoals: 1 };
            played.live!.oppGoals = 1;
            played.live!.h1Opp = [{ name: played.live!.oppXi![0].n, minute: 33 }];
            break;
          }
        }
      }
      career = seeded(16051 + i, () => playNextEntry(career, { skipHalftime: true })).state;
    }
    expect([league, cup, firstLeg, secondLeg].every(Boolean)).toBe(true);
  } finally { now.mockRestore(); }
}, 60000);
afterAll(() => restoreEngineRegistrations(registrations));
afterEach(() => {
  cleanup(); vi.restoreAllMocks(); vi.clearAllMocks(); saveFence.release(SAVE_KEY); localStorage.clear();
});

const pending = (career = cup) => seeded(103, () => startLivePenaltyCalls(career))!;
function draw(career: CareerState, value: number): CareerState {
  const next = structuredClone(career);
  next.live!.penaltyCalls!.draw = value;
  return next;
}

describe('calling a competitive shootout', () => {
  it('opens only at an unresolved decider, including the correct stage of a two-leg tie', () => {
    for (const game of [league, firstLeg]) {
      expect(livePenaltyEligible(game)).toBe(false);
      expect(startLivePenaltyCalls(game)).toBeNull();
    }
    expect(livePenaltyEligible(secondLeg)).toBe(true);
    expect(startLivePenaltyCalls(secondLeg), 'the full thirty minutes are still due').toBeNull();
    const decidedCup = structuredClone(cup);
    decidedCup.live!.oppGoals++;
    expect(startLivePenaltyCalls(decidedCup)).toBeNull();
    const decidedLeg = structuredClone(secondLeg);
    decidedLeg.live!.oppGoals++;
    expect(startLivePenaltyCalls(decidedLeg), 'decided on aggregate').toBeNull();
    const historical = structuredClone(secondLeg);
    historical.eraId = 'era2015';
    historical.live!.myGoals = 1; historical.live!.oppGoals = 2;
    expect(startLivePenaltyCalls(historical), 'equal aggregate, unequal away goals').toBeNull();
    expect(startExtraTime(historical)).toBeNull();
    expect(startExtraTime(secondLeg)).not.toBeNull();
    expect(pending()).not.toBeNull();
  });

  it('changes no career field while pending, filters the finishing side and refuses repeated or stale picks', () => {
    const game = structuredClone(cup), live = game.live!;
    const finished = live.onPitch.filter(id => game.squad.some(p => p.id === id));
    const off = finished[0], injured = finished[1];
    const out = game.squad.find(p => p.id === off)!, hurt = game.squad.find(p => p.id === injured)!;
    live.h2Cards = [{ id: off, name: out.name, minute: 86, kind: 'red' }];
    live.h2Injuries = [{ id: injured, name: hurt.name, minute: 88, weeks: 2 }];
    const saved = pending(game), run = livePenaltyProgress(saved)!;
    expect(saved.live?.minute).toBe(90);
    expect({ ...saved, live: game.live }).toEqual(game);
    expect(run.options.every(p => finished.includes(p.id) && p.id !== off && p.id !== injured)).toBe(true);
    expect(run.options.length).toBeGreaterThan(5);
    expect(callLivePenalty(saved, off)).toBeNull();
    expect(callLivePenalty(saved, 'released-player')).toBeNull();
    const starter = run.options.at(-1)!;
    const next = callLivePenalty(saved, starter.id)!;
    expect(next.live!.penaltyCalls!.picks).toEqual([starter.id]);
    expect(callLivePenalty(next, starter.id)).toBeNull();
    expect(livePenaltyProgress(next)!.kicks.filter(k => k.side === 'me')).toMatchObject([{ taker: starter.name }]);
    expect(livePenaltyProgress(JSON.parse(JSON.stringify(next)))).toEqual(livePenaltyProgress(next));
    expect(resumeMatch(next).state).toBe(next);
    expect(playNextEntry(next, { skipHalftime: true }).state).toBe(next);
    expect(startLivePenaltyCalls(next)).toBeNull();
    const stale = structuredClone(next);
    stale.live!.penaltyCalls!.fixture = 'another match';
    expect(livePenaltyProgress(stale)).toBeNull();
    expect(callLivePenalty(stale, starter.id)).toBeNull();
  });

  it('uses the same drawn kicks when reloaded or delegated and lets taker ratings change the winner', () => {
    const game = pending(), run = livePenaltyProgress(game)!;
    const best = [...run.options].sort((a, b) => b.rating - a.rating)[0];
    const last = [...run.options].sort((a, b) => a.rating - b.rating)[0];
    expect(best.rating).toBeGreaterThan(last.rating);
    let compared = false, sawSuddenDeath = false, early = false;
    for (let i = 0; i < 500 && !(compared && sawSuddenDeath && early); i++) {
      const base = draw(game, i), strong = callLivePenalty(base, best.id)!, weak = callLivePenalty(base, last.id)!;
      const a = livePenaltyProgress(strong)!, b = livePenaltyProgress(weak)!;
      if ((!sawSuddenDeath && a.full.kicks.length > 10) || (!early && a.full.kicks.length < 10)) {
        let called = strong, status = a;
        while (!status.done) {
          const before = status.kicks;
          called = callLivePenalty(called, status.options[0].id)!;
          status = livePenaltyProgress(JSON.parse(JSON.stringify(called)))!;
          expect(status.kicks.slice(0, before.length)).toEqual(before);
        }
        expect(callLivePenalty(called, best.id)).toBeNull();
        expect(status.kicks).toEqual(a.full.kicks);
        expect(resumeMatch(strong, true).report!.shootout).toEqual(status.full);
        expect(resumeMatch(called, true).report!.shootout).toEqual(status.full);
        sawSuddenDeath ||= a.full.kicks.length > 10; early ||= a.full.kicks.length < 10;
      }
      if ((a.full.mine > a.full.theirs) !== (b.full.mine > b.full.theirs)) {
        expect(a.kicks.filter(k => k.side === 'me')[0].taker).toBe(best.name);
        expect(b.kicks.filter(k => k.side === 'me')[0].taker).toBe(last.name);
        expect(resumeMatch(strong, true).report!.shootoutWon).not.toBe(resumeMatch(weak, true).report!.shootoutWon);
        compared = true;
      }
    }
    expect([compared, sawSuddenDeath, early]).toEqual([true, true, true]);
  });

  it('uses the saved taker order for delegation and completes a reduced side before anyone takes two', () => {
    const small = structuredClone(cup), live = small.live!;
    const finishers = livePenaltyProgress(pending(small))!.options.slice(0, 2);
    const [first, second] = finishers;
    small.shootoutOrder = [second.id, first.id];
    live.h2Injuries = [...(live.h2Injuries ?? []), ...small.squad
      .filter(p => live.onPitch.includes(p.id) && !finishers.some(f => f.id === p.id))
      .map(p => ({ id: p.id, name: p.name, minute: 89, weeks: 1 }))];
    const start = pending(small), opening = livePenaltyProgress(start)!;
    expect(opening.options.map(p => p.id)).toEqual([second.id, first.id]);
    expect(opening.full.kicks.filter(k => k.side === 'me').slice(0, 3).map(k => k.taker))
      .toEqual([second.name, first.name, second.name]);
    const one = callLivePenalty(start, first.id)!;
    expect(livePenaltyProgress(one)!.options.map(p => p.id)).toEqual([second.id]);
    const two = callLivePenalty(one, second.id)!;
    expect(livePenaltyProgress(two)!.options.map(p => p.id)).toEqual([second.id, first.id]);
  });

  it('settles the aggregate on kicks without changing the score on the night', () => {
    const extra = seeded(42, () => startExtraTime(secondLeg))!;
    extra.live!.h2My = []; extra.live!.h2Opp = [];
    const game = pending(extra);
    expect(game.live!.minute).toBe(120);
    const wins = new Set<boolean>();
    for (let i = 0; i < 30 && wins.size < 2; i++) {
      const sample = draw(game, i), result = seeded(1, () => resumeMatch(sample, true));
      const called = livePenaltyProgress(sample)!.full;
      expect(result.report).toMatchObject({ decidedBy: 'pens', won: false, drawn: false, shootout: called,
        tie: { leg: 2, aggMine: 1, aggTheirs: 1, through: called.mine > called.theirs } });
      expect(result.state.week).toBe(sample.week + 1);
      expect(result.state.live).toBeNull();
      expect(result.state.uclKoRound === 'out').toBe(called.mine < called.theirs);
      wins.add(called.mine > called.theirs);
    }
    expect(wins.size).toBe(2);
  });
});

let api: ClubManagerGame;
function Harness() { api = useClubManager(); return <span>{api.phase}</span>; }
async function mount(game: CareerState) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(game));
  const view = render(<StrictMode><Harness /></StrictMode>);
  await waitFor(() => expect(api.phase).toBe('resume'));
  act(() => api.resume());
  if (!game.live!.penaltyCalls) {
    await waitFor(() => expect(api.phase).toBe('hub'));
    act(() => api.play());
  }
  await waitFor(() => expect(api.phase).toBe('halftime'));
  return view;
}
describe('competitive penalty saves through the actual hook', () => {
  it('resumes a single committed kick and settles a captured final whistle once', async () => {
    const opening = structuredClone(cup); delete opening.live!.callPenalties;
    const view = await mount(opening);
    act(() => expect(api.choosePenaltyMode(true)).toBe(true));
    act(() => api.secondHalf());
    const turn = api.choosePenaltyTaker, id = livePenaltyProgress(api.career!)!.options[1].id;
    act(() => { expect(turn(id)).toBe(true); expect(turn(id)).toBe(false); });
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY)!) as CareerState;
    expect(saved.live!.penaltyCalls!.picks).toEqual([id]);
    const detail = livePenaltyProgress(saved)!.full;
    view.unmount();
    expect(turn(id)).toBe(false);
    await mount(saved);
    const finish = api.secondHalf;
    act(() => { finish(true); finish(true); });
    await waitFor(() => expect(api.phase).toBe('matchResult'));
    expect(api.report?.shootout).toEqual(detail);
    expect(api.career?.week).toBe(opening.week + 1);
    expect(recordActivity).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem(SAVE_KEY)!).live).toBeNull();
  });
  it('cannot settle or add a kick over a newer same-slot career', async () => {
    await mount(pending());
    const old = api.career!, incoming = JSON.stringify({ ...old, budget: old.budget + 1 });
    const external = createSaveFence(() => localStorage);
    external.adopt(SAVE_KEY);
    expect(external.write(SAVE_KEY, () => { localStorage.setItem(SAVE_KEY, incoming); return true; })).toBe('written');
    const id = livePenaltyProgress(old)!.options[0].id;
    act(() => { expect(api.choosePenaltyTaker(id)).toBe(false); api.secondHalf(true); });
    expect(api.saveMoved).toBe(true);
    expect(api.career).toBe(old);
    expect(recordActivity).not.toHaveBeenCalled();
    expect(localStorage.getItem(SAVE_KEY)).toBe(incoming);
  });

  it('keeps the same pending turn and result if the disk rejects a save', async () => {
    await mount(pending());
    const before = api.career!, raw = localStorage.getItem(SAVE_KEY), detail = livePenaltyProgress(before)!;
    const original = Storage.prototype.setItem;
    const quota = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function(this: Storage, key, value) {
      if (key === SAVE_KEY) throw new DOMException('Simulated full disk', 'QuotaExceededError');
      original.call(this, key, value);
    });
    act(() => { expect(api.choosePenaltyTaker(detail.options[0].id)).toBe(false); api.secondHalf(true); });
    expect(api.saveFailed).toBe(true);
    expect(api.career).toBe(before);
    expect(localStorage.getItem(SAVE_KEY)).toBe(raw);
    expect(recordActivity).not.toHaveBeenCalled();
    quota.mockRestore();
    act(() => api.secondHalf(true));
    expect(api.report?.shootout).toEqual(detail.full);
    expect(recordActivity).toHaveBeenCalledTimes(1);
  });
});
