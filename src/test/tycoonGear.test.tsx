import './dailyReload/mocks';
import { resetMocks } from './dailyReload/mocks';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { useWonderkidFactory } from '@/hooks/useWonderkidFactory';
import { useStadiumTycoon } from '@/hooks/useStadiumTycoon';
import { newFactory, SAVE_KEY, serialize, squadEdge } from '@/lib/wonderkidFactory';
import { newTycoon, newLeague, TYCOON_SAVE_KEY, tick, oppChancePerMin, deserializeTycoon, playAwayMatchdays } from '@/lib/stadiumTycoon';
import { newLedger, creditFullTimes, REWARDS_KEY, recordFullTimes, loadLedger } from '@/lib/tycoonRewards';
import { BOOTS } from '@/lib/soccerCareerAppearance';

const NOW = 1767225600000;
let elapsed = 0, sequence = 0, resetMatch = 10000000;
const frames = new Map<number, FrameRequestCallback>();
const saved = (key: string) => JSON.parse(localStorage.getItem(key)!);
const titleLedger = (kits = 0) => {
  let l = creditFullTimes(newLedger(588), [{ totalMatches: 1, result: 'win', away: false, position: 1, division: 0 }]);
  for (let i = 0; i < kits; i++) l = creditFullTimes(l, [{ totalMatches: i + 2, result: 'win', away: false, position: 1, division: 0 }]);
  return l;
};
function seedAcademy(equipped = true) {
  const a = newFactory(NOW, 588);
  a.scoutProgress = -1e9;
  a.firstTeam = [0, 1].map(i => ({ id: `sr-proof-${i}`, name: `Fixture Graduate ${i}`, nation: 'England', pos: 'MF' as const, age: 27, ageClock: 0, rating: 75, potential: 75, ...(equipped && i === 0 ? { bootId: BOOTS[0].id } : {}) }));
  localStorage.setItem(SAVE_KEY, serialize(a));
  return a;
}
function titleReady() {
  let s = newTycoon(NOW);
  s.levels.squad = 200;
  for (let i = 0; i < 1000 && !((s.league?.matchday ?? 0) === 4 && s.minute >= 88); i++) s = tick(s, 1.4, () => 0.01).state;
  expect(s.league?.division).toBe(0); expect(s.league?.matchday).toBe(4); expect(s.minute).toBe(88);
  localStorage.setItem(TYCOON_SAVE_KEY, JSON.stringify(s));
  localStorage.setItem(REWARDS_KEY, JSON.stringify(newLedger(588)));
  return s;
}
function step(ms: number) {
  for (let t = 0; t < ms; t += 16) act(() => {
    elapsed += 16; vi.advanceTimersByTime(16);
    const due = [...frames.values()]; frames.clear();
    for (const fn of due) fn(elapsed);
  });
}
async function settle() { for (let i = 0; i < 8; i++) await act(async () => { await new Promise(r => setImmediate(r)); }); }
beforeEach(() => {
  // Recover the prior case's intentional memory-only gem cache before clearing.
  recordFullTimes([{ totalMatches: ++resetMatch, result: 'loss', away: true }], false);
  localStorage.clear(); loadLedger(); resetMocks();
  elapsed = 0; frames.clear();
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  vi.spyOn(Date, 'now').mockImplementation(() => NOW + elapsed);
  vi.spyOn(performance, 'now').mockImplementation(() => elapsed);
  vi.spyOn(Math, 'random').mockReturnValue(0.01);
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => { frames.set(++sequence, fn); return sequence; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
});
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('title boots through the real hooks and page', () => {
  it('1 saves the played division and completed stadium before its single title unlock', () => {
    const before = titleReady();
    let latest: ReturnType<typeof useStadiumTycoon>;
    const Probe = () => { latest = useStadiumTycoon(); return null; };
    const writes: { key: string; match: number; unlocked: number }[] = [];
    const original = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      const data = JSON.parse(String(value));
      writes.push({ key, match: data.totalMatches, unlocked: data.gearUnlocked?.length ?? 0 });
      original.call(this, key, value);
    });
    const view = render(<Probe />); step(3500);
    expect(latest!.state.leagueTitles).toBe(1);
    expect(saved(REWARDS_KEY).gearUnlocked).toEqual([BOOTS[0].id]);
    expect(saved(REWARDS_KEY).gearTitles[0]).toBe(before.totalMatches! + 1);
    expect(saved(REWARDS_KEY).gearTitles[1]).toBe(0);
    const awardAt = writes.findIndex(w => w.key === REWARDS_KEY && w.unlocked === 1);
    expect(awardAt).toBeGreaterThan(0);
    expect(writes.slice(0, awardAt).some(w => w.key === TYCOON_SAVE_KEY && w.match === before.totalMatches! + 1)).toBe(true);
    view.unmount(); render(<Probe />); step(400);
    expect(saved(REWARDS_KEY).gearUnlocked).toEqual([BOOTS[0].id]);
    expect(saved(REWARDS_KEY).kitUpgrades).toBe(0);
  }, 30000);

  it('2 a refused stadium save cannot grant title gear', () => {
    const before = titleReady();
    let latest: ReturnType<typeof useStadiumTycoon>;
    const Probe = () => { latest = useStadiumTycoon(); return null; };
    const original = Storage.prototype.setItem;
    let refusals = 0;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (key === TYCOON_SAVE_KEY) { refusals++; throw new DOMException('blocked', 'QuotaExceededError'); }
      original.call(this, key, value);
    });
    render(<Probe />); step(3500);
    expect(refusals).toBeGreaterThan(0); expect(latest!.state.leagueTitles).toBe(1);
    expect(latest!.gearSaveBlocked).toBe(true);
    expect(saved(TYCOON_SAVE_KEY).totalMatches).toBe(before.totalMatches);
    expect(loadLedger().gearUnlocked).toBeUndefined();
    expect(saved(REWARDS_KEY).gearUnlocked).toBeUndefined();
  }, 30000);

  it('3 a refused title ledger write keeps only visit gems and reports the missing gear', () => {
    const before = titleReady();
    let latest: ReturnType<typeof useStadiumTycoon>;
    const Probe = () => { latest = useStadiumTycoon(); return null; };
    const original = Storage.prototype.setItem;
    let blocked = true, refusals = 0;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (key === REWARDS_KEY && blocked) { refusals++; throw new DOMException('blocked', 'QuotaExceededError'); }
      original.call(this, key, value);
    });
    render(<Probe />); step(3500);
    expect(refusals).toBeGreaterThan(0); expect(latest!.gearSaveBlocked).toBe(true);
    expect(saved(TYCOON_SAVE_KEY).totalMatches).toBe(before.totalMatches! + 1);
    expect(loadLedger().earned).toBe(23); expect(loadLedger().gearUnlocked).toBeUndefined();
    expect(saved(REWARDS_KEY).earned).toBe(0);
    blocked = false;
    recordFullTimes([{ totalMatches: before.totalMatches! + 2, result: 'loss', away: false }]);
    expect(saved(REWARDS_KEY).gearUnlocked).toBeUndefined();
    expect(recordFullTimes([{ totalMatches: before.totalMatches! + 1, result: 'win', away: false, position: 1, division: 0 }])).toBe(0);
  }, 30000);

  it('4 reassignment saves once before showing either wearer and survives reload', () => {
    const a = seedAcademy(); localStorage.setItem(REWARDS_KEY, JSON.stringify(titleLedger()));
    let latest: ReturnType<typeof useWonderkidFactory>;
    const Probe = () => { latest = useWonderkidFactory(); return null; };
    const original = Storage.prototype.setItem;
    let blocked = true, refusals = 0;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (key === SAVE_KEY && blocked) { refusals++; throw new DOMException('blocked', 'QuotaExceededError'); }
      original.call(this, key, value);
    });
    const view = render(<Probe />);
    act(() => latest!.doEquipBoot(a.firstTeam![1].id, BOOTS[0].id));
    expect(refusals).toBe(1); expect(latest!.gearSaveBlocked).toBe(true);
    expect(latest!.state!.firstTeam).toEqual(a.firstTeam); expect(saved(SAVE_KEY).firstTeam).toEqual(a.firstTeam);
    blocked = false;
    act(() => latest!.doEquipBoot(a.firstTeam![1].id, BOOTS[0].id));
    expect(latest!.gearSaveBlocked).toBe(false);
    const assigned = saved(SAVE_KEY).firstTeam;
    expect(assigned[0].bootId).toBeUndefined(); expect(assigned[1].bootId).toBe(BOOTS[0].id);
    expect(latest!.state!.firstTeam).toEqual(assigned);
    view.unmount(); render(<Probe />);
    expect(latest!.state!.firstTeam).toEqual(assigned);
    expect(loadLedger().gearUnlocked).toEqual([BOOTS[0].id]);
  }, 30000);

  it('5 a failed upgrade changes no rating or kit and retries exactly once', () => {
    seedAcademy(); const l = titleLedger(1); localStorage.setItem(REWARDS_KEY, JSON.stringify(l));
    let latest: ReturnType<typeof useWonderkidFactory>;
    const Probe = () => { latest = useWonderkidFactory(); return null; };
    const original = Storage.prototype.setItem;
    let blocked = true, refusals = 0;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (key === REWARDS_KEY && blocked) { refusals++; throw new DOMException('blocked', 'QuotaExceededError'); }
      original.call(this, key, value);
    });
    render(<Probe />);
    const edge = squadEdge(latest!.state!, loadLedger().gearLevel);
    act(() => latest!.doUpgradeBoot(BOOTS[0].id));
    expect(refusals).toBe(1); expect(latest!.gearSaveBlocked).toBe(true);
    expect(saved(REWARDS_KEY)).toEqual(l); expect(loadLedger()).toEqual(l);
    expect(squadEdge(latest!.state!, loadLedger().gearLevel)).toBe(edge);
    blocked = false;
    act(() => latest!.doUpgradeBoot(BOOTS[0].id));
    expect(latest!.gearSaveBlocked).toBe(false);
    expect(saved(REWARDS_KEY).kitUpgrades).toBe(0); expect(saved(REWARDS_KEY).gearLevel[BOOTS[0].id]).toBe(2);
    expect(squadEdge(latest!.state!, loadLedger().gearLevel)).toBeCloseTo(edge + 0.002, 12);
    act(() => latest!.doUpgradeBoot(BOOTS[0].id));
    expect(saved(REWARDS_KEY).gearLevel[BOOTS[0].id]).toBe(2);
    expect(saved(REWARDS_KEY).spent).toBe(l.spent);
  }, 30000);

  it('6 the cold real page uses saved gear for the first away result and watched minute', async () => {
    vi.resetModules();
    const { default: StadiumTycoon } = await import('@/pages/StadiumTycoon');
    const { mountPage } = await import('./dailyReload/harness');
    const a = seedAcademy();
    const l = titleLedger(); l.gearLevel![BOOTS[0].id] = 3;
    localStorage.setItem(REWARDS_KEY, JSON.stringify(l));
    const s = newTycoon(NOW - 1800000);
    s.levels.squad = 40; s.matchNo = 70; s.league = newLeague(0, 3, 1, undefined, 70);
    const loaded = deserializeTycoon(JSON.stringify(s), NOW)!;
    const low = squadEdge(a), high = squadEdge(a, l.gearLevel);
    const separating = (oppChancePerMin(loaded, low) + oppChancePerMin(loaded, high)) / 2;
    expect(playAwayMatchdays(loaded, 1, () => separating, low).results[0].result).toBe('D');
    expect(playAwayMatchdays(loaded, 1, () => separating, high).results[0].result).toBe('W');
    vi.mocked(Math.random).mockReturnValue(separating);
    localStorage.setItem(TYCOON_SAVE_KEY, JSON.stringify(s));
    mountPage(<StadiumTycoon />, '/stadium-tycoon');
    expect(document.querySelector('[data-away-results] [role="img"]')?.getAttribute('aria-label')).toMatch(/^won/);
    await settle();
    const awayEnd = playAwayMatchdays(loaded, 1, () => separating, high).state;
    const watchedRoll = (oppChancePerMin(awayEnd, low) + oppChancePerMin(awayEnd, high)) / 2;
    expect(tick(awayEnd, 1.4, () => watchedRoll, low).state.goalsAgainst).toBe(1);
    expect(tick(awayEnd, 1.4, () => watchedRoll, high).state.goalsAgainst).toBe(0);
    vi.mocked(Math.random).mockReturnValue(watchedRoll);
    step(1600);
    act(() => { window.dispatchEvent(new Event('pagehide')); });
    expect(saved(TYCOON_SAVE_KEY).goalsFor).toBeGreaterThan(0);
    expect(saved(TYCOON_SAVE_KEY).goalsAgainst).toBe(0);
    expect(saved(SAVE_KEY).firstTeam[0].bootId).toBe(BOOTS[0].id);
  }, 30000);
});
