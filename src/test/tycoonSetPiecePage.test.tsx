import './dailyReload/mocks';
import { resetMocks } from './dailyReload/mocks';
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountPage, button, click } from './dailyReload/harness';
import StadiumTycoon from '@/pages/StadiumTycoon';
import { newTycoon, setPieceOffer, serializeTycoon, TYCOON_SAVE_KEY, goalBonus, prestigeThreshold, type TycoonState, type SetPieceOffer } from '@/lib/stadiumTycoon';
import { buildRun, takeShot, lehmer, type Aim } from '@/lib/freeKick';

const EPOCH = 1789473600000;
let elapsed = 0;
let frameId = 0;
const frames = new Map<number, FrameRequestCallback>();
function saved(): TycoonState { return JSON.parse(localStorage.getItem(TYCOON_SAVE_KEY)!); }
function fixture(patch: Partial<TycoonState> = {}): SetPieceOffer {
  const state = { ...newTycoon(EPOCH), ...patch };
  for (let minute = 20; minute <= 80; minute++) {
    state.minute = minute;
    const offer = setPieceOffer(state, true);
    if (offer) {
      localStorage.setItem(TYCOON_SAVE_KEY, serializeTycoon(state, EPOCH));
      return offer;
    }
  }
  throw new Error('No deterministic offer in its stated minute range');
}
async function settle() {
  for (let i = 0; i < 8; i++) await act(async () => { vi.advanceTimersByTime(0); await new Promise(resolve => setImmediate(resolve)); });
}
async function openKick() { await click(document.querySelector('[data-set-piece-offer]')!); await settle(); }
function scoreAim(offer: SetPieceOffer) {
  const kick = buildRun(offer.seed)[offer.kickIndex];
  let aim: Aim | undefined;
  for (const x of [-.8, .8, -.65, .65]) for (const y of [.7, .85, .5]) for (const power of [.65, .8, .5]) {
    const candidate = { x, y, power, curve: 0 };
    if (takeShot(candidate, kick, lehmer(offer.seed)).scored) aim ??= candidate;
  }
  expect(aim, 'The fixture must contain a real scoring aim').toBeDefined();
  for (const [label, value] of [['Aim across', aim!.x], ['Aim height', aim!.y], ['Power', aim!.power], ['Curve', aim!.curve]] as const)
    fireEvent.change(screen.getByLabelText(new RegExp(label)), { target: { value: String(value) } });
}
function step(ms: number) {
  for (let passed = 0; passed < ms; passed += 2000) act(() => {
    elapsed += 2000;
    vi.advanceTimersByTime(2000);
    const due = [...frames.values()];
    frames.clear();
    due.forEach(callback => callback(elapsed));
  });
}
beforeAll(async () => { await import('@/components/tycoon/SetPieceBoard'); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  elapsed = 0;
  frames.clear();
  localStorage.clear();
  resetMocks();
  vi.spyOn(Date, 'now').mockImplementation(() => EPOCH + elapsed);
  vi.spyOn(performance, 'now').mockImplementation(() => elapsed);
  vi.spyOn(Math, 'random').mockReturnValue(.5);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++frameId, callback); return frameId; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
});
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('set pieces on the real Stadium Tycoon page', () => {
  it('1 opening persists the attempt before the board appears, including close and reload', async () => {
    const offer = fixture();
    const page = mountPage(<StadiumTycoon />, '/stadium-tycoon');
    await openKick();
    expect(document.querySelector('[data-tycoon-set-piece]')).toBeInTheDocument();
    expect(saved().setPieceAttemptedMatch).toBe(offer.match);
    expect(saved().setPieceUsedMatch).toBeUndefined();
    await click(button(document.querySelector('[data-tycoon-set-piece]') as HTMLElement, /^Back$/));
    expect(document.querySelector('[data-set-piece-offer]')).not.toBeInTheDocument();
    page.unmount();
    mountPage(<StadiumTycoon />, '/stadium-tycoon');
    await settle();
    expect(document.querySelector('[data-set-piece-offer]')).not.toBeInTheDocument();
    expect(saved().setPieceAttemptedMatch).toBe(offer.match);
  });

  it('2 a failed opening save consumes nothing and a successful retry opens exactly one attempt', async () => {
    const offer = fixture();
    mountPage(<StadiumTycoon />, '/stadium-tycoon');
    const original = Storage.prototype.setItem;
    let blocked = true;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (key === TYCOON_SAVE_KEY && blocked) throw new DOMException('Full', 'QuotaExceededError');
      original.call(this, key, value);
    });
    await openKick();
    expect(document.querySelector('[data-tycoon-set-piece]')).not.toBeInTheDocument();
    expect(saved().setPieceAttemptedMatch).toBeUndefined();
    expect(screen.getByRole('alert')).toHaveTextContent('could not be saved');
    expect(document.querySelector('[data-set-piece-offer]')).toBeInTheDocument();
    blocked = false;
    await openKick();
    expect(saved().setPieceAttemptedMatch).toBe(offer.match);
    expect(document.querySelectorAll('[data-tycoon-set-piece]')).toHaveLength(1);
  });

  it('3 a scored kick survives reload with one goal and the exact normal bonus', async () => {
    const offer = fixture();
    const page = mountPage(<StadiumTycoon />, '/stadium-tycoon');
    await openKick();
    const before = saved();
    scoreAim(offer);
    await click(button(document, /^Take shot$/));
    const after = saved();
    expect(after.goalsFor).toBe(before.goalsFor + 1);
    expect(after.totalGoals).toBe(before.totalGoals + 1);
    expect(after.money).toBe(before.money + goalBonus(before));
    expect(after.lifetime).toBe(before.lifetime + goalBonus(before));
    expect(after.setPieceUsedMatch).toBe(offer.match);
    expect(document.querySelector('[data-set-piece-match]')).toHaveTextContent(`Match ${after.minute}' · ${after.goalsFor} - ${after.goalsAgainst}`);
    expect(document.querySelector('.set-piece-scene')).toHaveAttribute('data-motion', 'playing');
    step(4000);
    expect(document.querySelector('.set-piece-scene')).toHaveAttribute('data-motion', 'static');
    expect(saved().goalsFor).toBe(after.goalsFor);
    page.unmount();
    mountPage(<StadiumTycoon />, '/stadium-tycoon');
    await settle();
    expect(saved().goalsFor).toBe(after.goalsFor);
    expect(document.querySelector('[data-set-piece-offer]')).not.toBeInTheDocument();
  });

  it('4 a failed goal save changes nothing and retrying the same shot cannot pay twice', async () => {
    const offer = fixture();
    mountPage(<StadiumTycoon />, '/stadium-tycoon');
    await openKick();
    const before = saved();
    const original = Storage.prototype.setItem;
    let blocked = true;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (key === TYCOON_SAVE_KEY && blocked) throw new DOMException('Full', 'QuotaExceededError');
      original.call(this, key, value);
    });
    scoreAim(offer);
    await click(button(document, /^Take shot$/));
    expect(saved()).toEqual(before);
    expect(document.querySelector('[data-set-piece-match]')).toHaveTextContent(`Match ${before.minute}' · ${before.goalsFor} - ${before.goalsAgainst}`);
    expect(screen.getByRole('alert')).toHaveTextContent('has not changed the match yet');
    blocked = false;
    const retry = button(document, /^Save this kick again$/);
    act(() => { retry.click(); retry.click(); });
    expect(saved().goalsFor).toBe(before.goalsFor + 1);
    expect(saved().money).toBe(before.money + goalBonus(before));
    expect(saved().setPieceUsedMatch).toBe(offer.match);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('5 the clock continues while aiming and full time expires the old board', async () => {
    const offer = fixture();
    mountPage(<StadiumTycoon />, '/stadium-tycoon');
    await openKick();
    const initialClock = document.querySelector('[data-set-piece-match]')!.textContent;
    step(4000);
    expect(document.querySelector('[data-set-piece-match]')!.textContent).not.toBe(initialClock);
    expect(document.querySelector('[data-set-piece-match]')).not.toHaveTextContent('Kick closed');
    step(116000);
    await settle();
    expect(saved().totalMatches).toBeGreaterThan(offer.match);
    expect(button(document, /^Take shot$/)).toBeDisabled();
    expect(screen.getByText(/The match has ended/)).toBeVisible();
    expect(document.querySelector('[data-set-piece-match]')).toHaveTextContent('Kick closed');
    expect(saved().setPieceUsedMatch).toBeUndefined();
  });

  it('6 selling up expires the queued board even while the career match count stays the same', async () => {
    const offer = fixture({ lifetime: prestigeThreshold(newTycoon(EPOCH)) });
    mountPage(<StadiumTycoon />, '/stadium-tycoon');
    const opening = document.querySelector<HTMLButtonElement>('[data-set-piece-offer]')!;
    const selling = document.querySelector<HTMLButtonElement>('[data-sell-up]')!;
    expect(selling).toBeInTheDocument();
    // Both handlers were already available before the modal's first paint.
    act(() => { opening.click(); selling.click(); });
    await settle();
    expect(saved().rep).toBe(offer.rep + 1);
    expect(saved().totalMatches).toBe(offer.match);
    expect(saved().setPieceAttemptedMatch).toBe(offer.match);
    expect(saved().setPieceUsedMatch).toBeUndefined();
    expect(button(document, /^Take shot$/)).toBeDisabled();
    expect(screen.getByText(/The match has ended/)).toBeVisible();
  });
});
