import './dailyReload/mocks';
import { resetMocks } from './dailyReload/mocks';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent } from '@testing-library/react';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { mountPage } from './dailyReload/harness';
import StadiumTycoon from '@/pages/StadiumTycoon';
import { newTycoon, serializeTycoon, TYCOON_SAVE_KEY } from '@/lib/stadiumTycoon';

const EPOCH = 1767225600000;
const OTHER = 'tycoon-save-notice-unrelated';
let elapsed = 0;
let nextFrame = 0;
const frames = new Map<number, FrameRequestCallback>();
let blocked = false;
let attempts: string[] = [];

function random(seed: number) {
  let n = seed;
  return () => {
    n = (n + 0x6d2b79f5) | 0;
    let x = Math.imul(n ^ (n >>> 15), 1 | n);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function step(ms: number) {
  for (let i = 0; i < ms / 16; i++) act(() => {
    elapsed += 16;
    vi.advanceTimersByTime(16);
    const due = [...frames.values()];
    frames.clear();
    for (const cb of due) cb(elapsed);
  });
}

function click(selector: string) {
  const target = document.querySelector<HTMLButtonElement>(selector);
  expect(target, 'The existing real page control must be mounted').not.toBeNull();
  act(() => { fireEvent.click(target!); });
}

function observe(name: string, value: unknown) {
  console.log('TYCOON_SAVE_NOTICE_RAW ' + JSON.stringify({ name, value }));
  if (process.env.POPULAR_TYCOON_SAVE_RAW) {
    mkdirSync(process.env.POPULAR_TYCOON_SAVE_RAW, { recursive: true });
    writeFileSync(path.join(process.env.POPULAR_TYCOON_SAVE_RAW, name + '.json'), JSON.stringify(value, null, 2) + '\n');
  }
}

function mount() {
  const initial = newTycoon(EPOCH);
  const raw = serializeTycoon(initial, EPOCH);
  localStorage.setItem(TYCOON_SAVE_KEY, raw);
  localStorage.setItem(OTHER, 'held');
  const setter = Storage.prototype.setItem;
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
    if (key === TYCOON_SAVE_KEY) {
      attempts.push(String(value));
      if (blocked) throw new DOMException('Controlled stadium quota refusal', 'QuotaExceededError');
    }
    return Reflect.apply(setter, this, [key, value]);
  });
  const view = mountPage(<StadiumTycoon />, '/stadium-tycoon');
  return { view, raw, initial };
}

function failAutosave(room: 'stadium' | 'league') {
  const fixture = mount();
  click('[data-tap-key]');
  if (room === 'league') click('[data-room="league"]');
  blocked = true;
  step(5200);
  act(() => { window.dispatchEvent(new Event('pagehide')); });
  expect(attempts.length, 'Real autosave and pagehide must both attempt the stadium writer').toBeGreaterThanOrEqual(2);
  expect(localStorage.getItem(TYCOON_SAVE_KEY)).toBe(fixture.raw);
  expect(localStorage.getItem(OTHER)).toBe('held');
  const latest = attempts[attempts.length - 1]!;
  const state = JSON.parse(latest);
  expect(state.money).toBeGreaterThan(fixture.initial.money);
  expect(latest).not.toBe(fixture.raw);
  return { ...fixture, latest, state };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  elapsed = 0;
  frames.clear();
  attempts = [];
  blocked = false;
  localStorage.clear();
  resetMocks();
  vi.spyOn(Date, 'now').mockImplementation(() => EPOCH + elapsed);
  vi.spyOn(performance, 'now').mockImplementation(() => elapsed);
  vi.spyOn(Math, 'random').mockImplementation(random(20261103));
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

describe('Stadium Tycoon save visibility', () => {
  for (const room of ['stadium', 'league'] as const) it('a refused autosave can be retried from the ' + room + ' room', () => {
    const fixture = failAutosave(room);
    const notice = document.querySelector<HTMLElement>('[data-tycoon-save-notice]');
    observe(room, { room, oldBytesHeld: localStorage.getItem(TYCOON_SAVE_KEY) === fixture.raw,
      attempts: attempts.length, latestMoney: fixture.state.money, initialMoney: fixture.initial.money,
      unrelatedHeld: localStorage.getItem(OTHER) === 'held', notice: notice?.textContent ?? null });
    expect(notice, room === 'stadium' ? 'ST_SAVE_NOTICE_PITCH: refused progress needs a visible recovery outside Tickets' : 'ST_SAVE_NOTICE_LEAGUE: the stadium keeps running and needs recovery in other rooms').not.toBeNull();
    expect(notice!.textContent).toContain('not saved on this device');
    expect(notice!.closest('[hidden]')).toBeNull();
    const retry = notice!.querySelector<HTMLButtonElement>('button');
    expect(retry).not.toBeNull();
    blocked = false;
    act(() => { fireEvent.click(retry!); });
    expect(localStorage.getItem(TYCOON_SAVE_KEY)).toBe(fixture.latest);
    expect(localStorage.getItem(OTHER)).toBe('held');
    expect(document.querySelector('[data-tycoon-save-notice]')).toBeNull();
    fixture.view.unmount();
  });

  it('a healthy autosave banks real progress without a failure notice', () => {
    const fixture = mount();
    click('[data-tap-key]');
    step(5200);
    expect(attempts.length).toBeGreaterThan(0);
    const raw = localStorage.getItem(TYCOON_SAVE_KEY)!;
    const saved = JSON.parse(raw);
    observe('healthy', { attempts: attempts.length, money: saved.money, initialMoney: fixture.initial.money,
      rawChanged: raw !== fixture.raw, unrelatedHeld: localStorage.getItem(OTHER) === 'held',
      notice: document.querySelector('[data-tycoon-save-notice]')?.textContent ?? null });
    expect(raw).not.toBe(fixture.raw);
    expect(saved.money).toBeGreaterThan(fixture.initial.money);
    expect(localStorage.getItem(OTHER)).toBe('held');
    expect(document.querySelector('[data-tycoon-save-notice]')).toBeNull();
  });

  it('Tickets keeps one recovery message and the real failed status', () => {
    const fixture = failAutosave('stadium');
    click('[data-office-panel="tickets"]');
    const panel = document.querySelector('[data-ticket-policy-panel]');
    const alerts = [...document.querySelectorAll<HTMLElement>('[role="alert"]')];
    observe('tickets', { status: panel?.getAttribute('data-save-status'), alerts: alerts.map(node => node.textContent),
      oldBytesHeld: localStorage.getItem(TYCOON_SAVE_KEY) === fixture.raw, attempts: attempts.length });
    expect(panel?.getAttribute('data-save-status')).toBe('failed');
    expect(alerts).toHaveLength(1);
    expect(alerts[0].textContent).toContain('not saved on this device');
    const retry = alerts[0].querySelector<HTMLButtonElement>('button');
    expect(retry).not.toBeNull();
    blocked = false;
    act(() => { fireEvent.click(retry!); });
    expect(localStorage.getItem(TYCOON_SAVE_KEY)).toBe(fixture.latest);
    expect(document.querySelectorAll('[role="alert"]')).toHaveLength(0);
    expect(panel?.getAttribute('data-save-status')).toBe('current');
  });
});
