import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  benchFor, changeLive, makeHalftimeSub, matchRuleOf, playNextEntry, startCareer, stopsUsed, type CareerState,
} from '@/lib/clubManager';
import { liveLineupsAt } from '@/lib/clubManagerLiveLineups';

/* Release BE join (Round BEG), the seam between Round 1365's halftime lineups and Release BD's Round 1331 rule
   (five changes in three stoppages; a change at the break uses no stoppage). The lineups must show each change at
   the clock the engine of this tree records, with nothing made up and nothing dropped. Real engine, real club. */

const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

function seeded<T>(action: () => T): T {
  const random = vi.spyOn(Math, 'random').mockReturnValue(0.6);
  try { return action(); } finally { random.mockRestore(); }
}

function liveMatch(): CareerState {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-14T00:00:00Z'));
  return seeded(() => {
    let state = startCareer('Aston Villa'), attempts = 0;
    while (!state.live && attempts++ < 8) state = playNextEntry(state).state;
    return state;
  });
}

function sub(state: CareerState, minute: number, skip: string[]): CareerState {
  const live = state.live!;
  const outId = live.onPitch.find(id => !skip.includes(id) && state.squad.find(p => p.id === id)?.position !== 'GK')!;
  const inId = benchFor(state, outId).find(p => !skip.includes(p.id))!.id;
  skip.push(outId, inId);
  const next = seeded(() => changeLive(state, minute, { kind: 'sub', outId, inId }));
  expect(next, `the engine refused a legal change at ${minute}`).toBeTruthy();
  return next!;
}

describe('halftime lineups under the five changes rule', () => {
  it('shows every first half change at the clock the engine recorded, and the break change only after the break', () => {
    let state = liveMatch();
    expect(state.live).toBeTruthy();
    const rule = matchRuleOf(state);
    expect(rule.subs).toBe(5);
    expect(rule.stops).toBe(3);
    const used: string[] = [];
    state = sub(state, 20, used);
    state = sub(state, 20, used);
    state = sub(state, 31, used);
    const inPlay = copy(state.live!.subs ?? []);
    expect(inPlay).toHaveLength(3);
    expect(inPlay.every(s => s.stop === true)).toBe(true);
    expect(stopsUsed(state.live!)).toBe(2);

    const view = liveLineupsAt(state, { minute: 45, plus: state.live!.added?.h1 ?? 0 })!;
    for (const s of inPlay) {
      const off = view.me.rows.find(row => row.key.startsWith('me:' + s.offId + ':'))!;
      const on = view.me.rows.find(row => row.key.startsWith('me:' + s.onId + ':'))!;
      expect(off.offAt).toEqual({ minute: s.minute });
      expect(on.onAt).toEqual({ minute: s.minute });
      expect(on.started).toBe(false);
    }
    expect(view.me.rows).toHaveLength(11 + inPlay.length);

    const outAtBreak = state.live!.onPitch.find(id => !used.includes(id) && state.squad.find(p => p.id === id)?.position !== 'GK')!;
    const inAtBreak = benchFor(state, outAtBreak).find(p => !used.includes(p.id))!.id;
    const broken = seeded(() => makeHalftimeSub(state, outAtBreak, inAtBreak))!;
    expect(broken).toBeTruthy();
    const atBreak = broken.live!.subs!.at(-1)!;
    expect(atBreak.minute).toBe(46);
    expect(atBreak.stop).toBeUndefined();
    expect(stopsUsed(broken.live!)).toBe(2);
    expect(liveLineupsAt(broken, { minute: 45, plus: broken.live!.added?.h1 ?? 0 })!.me.rows).toHaveLength(14);
    const after = liveLineupsAt(broken, { minute: 46 })!;
    expect(after.me.rows).toHaveLength(15);
    expect(after.me.rows.find(row => row.key.startsWith('me:' + inAtBreak + ':'))!.onAt).toEqual({ minute: 46 });
  });
});
