import './dailyReload/mocks';
import { resetMocks } from './dailyReload/mocks';
import { beforeAll, beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { act, cleanup } from '@testing-library/react';
import { mountPage, button, click } from './dailyReload/harness';
import StadiumTycoon from '@/pages/StadiumTycoon';
import { newFactory, SAVE_KEY, serialize, REGIONS, salePrice, applyOffline, squadEdge } from '@/lib/wonderkidFactory';
import type { FactoryState, Senior } from '@/lib/wonderkidFactory';
import { newTycoon, newLeague, TYCOON_SAVE_KEY, oppChancePerMin, deserializeTycoon, playAwayMatchdays } from '@/lib/stadiumTycoon';

const EPOCH = 1789444800000;
let elapsed = 0;
let nextFrame = 0;
const frames = new Map<number, FrameRequestCallback>();

function graduate(i = 0): Senior {
  return { id: `sr-test-${i}`, name: `Academy Graduate ${i}`, nation: 'England', pos: 'MF', age: 23, ageClock: 0, rating: 99, potential: 99 };
}
function academy(): FactoryState {
  const s = newFactory(EPOCH, 586);
  s.prospects = [{ ...graduate(), id: 1, age: 18, rating: 80, potential: 90 }];
  s.nextId = 2;
  return s;
}
function writeAcademy(s: FactoryState) { localStorage.setItem(SAVE_KEY, serialize(s)); }
function savedAcademy(): FactoryState { return JSON.parse(localStorage.getItem(SAVE_KEY)!); }
function persist() { act(() => { window.dispatchEvent(new Event('pagehide')); }); }
async function settle() {
  for (let i = 0; i < 8; i++) await act(async () => { await new Promise(r => setImmediate(r)); });
}
async function openAcademy() {
  await click(document.querySelector('[data-room="academy"]')!);
  await settle();
}
async function openFirstTeam() {
  await click(button(document, /First team.*players/));
  await settle();
}
function step(ms: number) {
  for (let passed = 0; passed < ms; passed += 16) {
    act(() => {
      elapsed += 16;
      vi.advanceTimersByTime(16);
      const due = [...frames.values()];
      frames.clear();
      for (const cb of due) cb(elapsed);
    });
  }
}
beforeAll(async () => {
  await import('@/components/tycoon/AcademyPanel');
  await import('@/components/tycoon/FirstTeamPanel');
});
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  elapsed = 0;
  frames.clear();
  localStorage.clear();
  resetMocks();
  vi.spyOn(Date, 'now').mockImplementation(() => EPOCH + elapsed);
  vi.spyOn(performance, 'now').mockImplementation(() => elapsed);
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { frames.set(++nextFrame, cb); return nextFrame; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => { frames.delete(id); });
});
afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('First team on the real Stadium Tycoon page', () => {
  it('1 promotion is saved before a reload and frees exactly one academy bed', async () => {
    const before = academy();
    writeAcademy(before);
    const page = mountPage(<StadiumTycoon />, '/stadium-tycoon');
    await openAcademy();
    await click(button(document, /^Promote to first team$/));
    const promoted = savedAcademy();
    expect(promoted.prospects).toHaveLength(0);
    expect(promoted.firstTeam).toHaveLength(1);
    expect(promoted.firstTeam![0].name).toBe(before.prospects[0].name);
    expect(promoted.cash).toBe(before.cash);
    page.unmount();
    mountPage(<StadiumTycoon />, '/stadium-tycoon');
    await openAcademy();
    await openFirstTeam();
    expect(document.querySelector('[data-senior-card]')?.textContent).toContain(before.prospects[0].name);
    expect(savedAcademy().firstTeam).toEqual(promoted.firstTeam);
  });

  it('2 a rejected save leaves promotion and senior sale intact until one successful retry', async () => {
    writeAcademy(academy());
    mountPage(<StadiumTycoon />, '/stadium-tycoon');
    await openAcademy();
    const raw = localStorage.getItem(SAVE_KEY);
    const original = Storage.prototype.setItem;
    let blocked = true;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (key === SAVE_KEY && blocked) throw new DOMException('Full', 'QuotaExceededError');
      original.call(this, key, value);
    });
    await click(button(document, /^Promote to first team$/));
    expect(localStorage.getItem(SAVE_KEY)).toBe(raw);
    expect(document.querySelector('[role="alert"]')?.textContent).toContain('could not save');
    expect(button(document, /^Promote to first team$/)).toBeEnabled();
    blocked = false;
    await click(button(document, /^Promote to first team$/));
    const promoted = savedAcademy();
    expect(promoted.firstTeam).toHaveLength(1);
    const fee = salePrice(promoted, promoted.firstTeam![0]);
    await openFirstTeam();
    blocked = true;
    await click(button(document, /^Sell Academy Graduate/));
    expect(savedAcademy()).toEqual(promoted);
    expect(document.querySelector('[data-senior-card]')).not.toBeNull();
    blocked = false;
    await click(button(document, /^Sell Academy Graduate/));
    expect(savedAcademy().firstTeam).toHaveLength(0);
    expect(savedAcademy().cash).toBe(promoted.cash + fee);
    expect(savedAcademy().soldCareer).toBe(promoted.soldCareer + 1);
    expect(document.querySelector('[data-senior-card]')).toBeNull();
  });

  it('3 moving up keeps graduates in the saved academy', async () => {
    const s = academy();
    s.firstTeam = [graduate()];
    s.prospects[0].name = 'Academy Prospect';
    s.retired = 2;
    s.lifetime = REGIONS[0].goal;
    writeAcademy(s);
    mountPage(<StadiumTycoon />, '/stadium-tycoon');
    await openAcademy();
    await click(button(document, /Reputation/));
    await act(async () => { await vi.dynamicImportSettled(); });
    await click(button(document, /Move up to/));
    expect(savedAcademy().rep).toBe(1);
    expect(savedAcademy().firstTeam).toEqual(s.firstTeam);
    expect(savedAcademy().retired).toBe(2);
    expect(savedAcademy().prospects).toHaveLength(0);
  });

  it('4 returning graduates age and retire without opening the Academy tab', async () => {
    const s = academy();
    s.firstTeam = [{ ...graduate(), age: 33, ageClock: 899.75 }];
    writeAcademy(s);
    mountPage(<StadiumTycoon />, '/stadium-tycoon');
    await settle();
    step(1000);
    persist();
    expect(savedAcademy().firstTeam).toHaveLength(0);
    expect(savedAcademy().retired).toBe(1);
    expect(document.querySelector('[data-room="stadium"]')?.getAttribute('aria-pressed')).toBe('true');
    step(1000);
    persist();
    expect(savedAcademy().retired).toBe(1);
  });

  it('5 the saved team reduces watched opponent goals on the first visit', async () => {
    const s = academy();
    s.firstTeam = Array.from({ length: 5 }, (_, i) => graduate(i));
    writeAcademy(s);
    const ground = newTycoon(EPOCH);
    const roll = (oppChancePerMin(ground) + oppChancePerMin(ground, 0.39)) / 2;
    vi.mocked(Math.random).mockReturnValue(roll);
    localStorage.setItem(TYCOON_SAVE_KEY, JSON.stringify(ground));
    mountPage(<StadiumTycoon />, '/stadium-tycoon');
    await settle();
    step(1600);
    persist();
    const played = JSON.parse(localStorage.getItem(TYCOON_SAVE_KEY)!);
    expect(played.minute).toBe(1);
    expect(played.goalsAgainst).toBe(0);
    expect(roll).toBeLessThan(oppChancePerMin(ground));
    expect(roll).toBeGreaterThan(oppChancePerMin(ground, 0.39));
  });

  it('6 the saved team changes the actual away match result before opening Academy', async () => {
    const s = academy();
    s.firstTeam = Array.from({ length: 5 }, (_, i) => graduate(i));
    writeAcademy(s);
    const ground = newTycoon(EPOCH - 1800000);
    vi.mocked(Math.random).mockReturnValue((oppChancePerMin(ground) + oppChancePerMin(ground, 0.39)) / 2);
    localStorage.setItem(TYCOON_SAVE_KEY, JSON.stringify(ground));
    mountPage(<StadiumTycoon />, '/stadium-tycoon');
    await settle();
    const result = document.querySelector('[data-away-results] [role="img"]');
    expect(result?.getAttribute('aria-label')).toMatch(/^won/);
    expect(result?.textContent).toBe('W');
  });

  it('7 cold away results include offline training without training the saved team twice', async () => {
    vi.resetModules();
    const { default: ColdStadiumTycoon } = await import('@/pages/StadiumTycoon');
    const { mountPage: mountColdPage } = await import('./dailyReload/harness');
    const s = newFactory(EPOCH - 8 * 3600000, 586);
    s.firstTeam = Array.from({ length: 5 }, (_, i) => ({ ...graduate(i), age: 20, rating: 61, potential: 90 }));
    const trained = JSON.parse(serialize(s)) as FactoryState;
    applyOffline(trained, EPOCH);
    expect(squadEdge(trained)).toBeGreaterThan(squadEdge(s));
    const ground = newTycoon(EPOCH - 1800000);
    ground.levels.squad = 40;
    ground.matchNo = 70;
    ground.league = newLeague(0, 3, 1, undefined, 70);
    const loadedGround = deserializeTycoon(JSON.stringify(ground), EPOCH)!;
    const separatingRoll = (oppChancePerMin(loadedGround, squadEdge(s)) + oppChancePerMin(loadedGround, squadEdge(trained))) / 2;
    expect(playAwayMatchdays(loadedGround, 1, () => separatingRoll, squadEdge(s)).results[0].result).toBe('D');
    expect(playAwayMatchdays(loadedGround, 1, () => separatingRoll, squadEdge(trained)).results[0].result).toBe('W');
    vi.mocked(Math.random).mockReturnValue(separatingRoll);
    writeAcademy(s);
    localStorage.setItem(TYCOON_SAVE_KEY, JSON.stringify(ground));
    mountColdPage(<ColdStadiumTycoon />, '/stadium-tycoon');
    expect(document.querySelector('[data-away-results] [role="img"]')?.getAttribute('aria-label')).toMatch(/^won/);
    await import('@/components/tycoon/AcademyPanel');
    await settle();
    expect(document.querySelector('[data-away-results] [role="img"]')?.getAttribute('aria-label')).toMatch(/^won/);
    persist();
    expect(savedAcademy().firstTeam).toEqual(trained.firstTeam);
  });
});
