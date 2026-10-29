import { StrictMode, type ReactNode } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClubManagerGame } from '@/hooks/useClubManager';
import type { CareerState, CMPlayer, IndividualLightSeasonRequest } from '@/lib/clubManager';
import {
  SAVE_KEY, lightSeasonPlayer, lightSeasonReservation, loadCareer, sameManKey,
  saveCareer, setIndividualLightSeason, setTrainingPlan, startCareer, trimCareer,
} from '@/lib/clubManager';
import { activeSlot, parkedKey, switchSlot } from '@/lib/clubManagerSlots';
import { createSaveFence, saveFence } from '@/lib/saveFence';
import ClubManager from '@/pages/ClubManager';

const capture = vi.hoisted(() => ({ game: null as ClubManagerGame | null }));
vi.mock('@/hooks/useClubManager', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/useClubManager')>('@/hooks/useClubManager');
  return { ...actual, useClubManager: () => { const game = actual.useClubManager(); capture.game = game; return game; } };
});
// External recording and unrelated shell presentation only. Page, Training,
// choice, Engine, slots, fence and the actual Hook commit remain real.
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), recordStreakDay: vi.fn() }));
vi.mock('@/components/game/GameShell', () => ({ GameShell: ({ children }: { children: ReactNode }) => <main>{children}</main> }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));

const api = () => { expect(capture.game).not.toBeNull(); return capture.game!; };
const randomStream = (initial: number) => { let seed = initial; return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; };
const draws = () => vi.mocked(Math.random).mock.calls.length;
const raw = () => localStorage.getItem(SAVE_KEY);
function quote(career: CareerState, player = career.squad.find(p => !p.onLoan && p.position !== 'GK')!): IndividualLightSeasonRequest {
  expect(player).toBeTruthy();
  return { source: career, player, data: { version: 1, clubName: career.clubName, season: career.season, playerId: player.id, manKey: sameManKey(player), ...(typeof player.worldRosterKey === 'string' ? { worldRosterKey: player.worldRosterKey } : {}) } };
}
const make = (request: IndividualLightSeasonRequest | null) => (current: CareerState) => setIndividualLightSeason(current, request);
function officialRaw(career: CareerState) {
  saveFence.adopt(SAVE_KEY); expect(saveCareer(career)).toBe(true);
  const saved = raw(); expect(saved).not.toBeNull(); expect(loadCareer()).not.toBeNull(); return saved!;
}
async function mount(career = startCareer('Brentford')) {
  officialRaw(career);
  const view = render(<StrictMode><MemoryRouter><ClubManager /></MemoryRouter></StrictMode>);
  await waitFor(() => expect(api().phase).toBe('resume'));
  act(() => api().resume()); await waitFor(() => expect(api().phase).toBe('hub'));
  await waitFor(() => expect(JSON.parse(raw()!)).toEqual(api().career));
  return view;
}
async function training() {
  fireEvent.click(screen.getByRole('button', { name: /Training.*(?:Normal|Light|Double)/i }));
  return screen.findByRole('button', { name: /^Light season\b/ });
}
async function choose(player: CMPlayer) {
  fireEvent.click(await training());
  const select = await screen.findByRole('combobox', { name: 'Player for Light season' });
  fireEvent.change(select, { target: { value: player.id } });
  return screen.getByRole('button', { name: 'Confirm Light season' });
}
function unchanged(origin: CareerState, saved: string | null, count: number) {
  expect(api().career).toBe(origin); expect(raw()).toBe(saved); expect(draws()).toBe(count);
}
beforeEach(() => {
  localStorage.clear(); saveFence.release(SAVE_KEY); capture.game = null;
  vi.spyOn(Math, 'random').mockImplementation(randomStream(20261029));
  vi.spyOn(Date, 'now').mockReturnValue(1791586800000);
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); saveFence.release(SAVE_KEY); localStorage.clear(); capture.game = null; });

describe('Light season through the real Club Manager Page and Hook', () => {
  it('can Back out during the actual first cold lazy tick without a write or later reopening', async () => {
    await mount(); const entry = await training(), origin = api().career!, saved = raw(), count = draws();
    fireEvent.click(entry);
    expect(screen.getByRole('status')).toHaveTextContent('Opening Light season...');
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    await act(async () => { await Promise.resolve(); });
    await waitFor(() => expect(screen.getByRole('button', { name: /^Light season\b/ })).toHaveFocus());
    expect(screen.queryByRole('combobox', { name: 'Player for Light season' })).toBeNull();
    unchanged(origin, saved, count);
  });

  it('commits the actual Page choice once through the real writer and official reload', async () => {
    const view = await mount(), origin = api().career!, p = quote(origin).player;
    const confirm = await choose(p), count = draws(), before = JSON.stringify(origin);
    expect(screen.getByText(/locks this player into Light through this season's growth/)).toBeVisible();
    const original = Storage.prototype.setItem, beforeAdopt: boolean[] = [];
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === SAVE_KEY) beforeAdopt.push(api().career === origin);
      original.call(this, key, value);
    });
    fireEvent.click(confirm);
    await waitFor(() => expect(lightSeasonPlayer(api().career!)?.id).toBe(p.id));
    expect(beforeAdopt[0]).toBe(true); expect(draws()).toBe(count); expect(JSON.stringify(origin)).toBe(before);
    const next = api().career!, { individualLightSeason, ...core } = next;
    expect(core).toStrictEqual(origin); expect(individualLightSeason).toEqual(quote(origin, p).data);
    await waitFor(() => expect(loadCareer()?.individualLightSeason).toEqual(individualLightSeason));
    view.unmount(); await mount(loadCareer()!);
    expect(api().career?.individualLightSeason).toEqual(individualLightSeason);
  });

  it('keeps help and unconfirmed Back read-only and returns focus to the real help button', async () => {
    await mount(); const p = quote(api().career!).player; await choose(p);
    const origin = api().career!, saved = raw(), count = draws();
    fireEvent.click(screen.getByRole('button', { name: 'Light season rules' }));
    expect(screen.getByText('Worked example')).toBeVisible();
    expect(screen.getByText(/He can still improve/)).toBeVisible();
    const heading = screen.getByRole('heading', { name: 'Light season rules' });
    fireEvent.keyDown(heading, { key: 'Escape' });
    expect(screen.getByRole('button', { name: 'Light season rules' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('combobox', { name: 'Player for Light season' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    await waitFor(() => expect(screen.getByRole('button', { name: /^Light season\b/ })).toHaveFocus());
    unchanged(origin, saved, count);
  });

  it('reserves before render so the same captured Light request cannot publish twice', async () => {
    await mount(); const origin = api().career!, request = quote(origin), count = draws(), transform = vi.fn(make(request));
    act(() => { expect(api().commitRecruitment(transform)).toBe(true); expect(api().commitRecruitment(transform)).toBe(false); });
    expect(transform).toHaveBeenCalledTimes(2); expect(draws()).toBe(count);
    expect(api().career?.individualLightSeason).toEqual(request.data);
    expect(loadCareer()?.individualLightSeason).toEqual(request.data);
  });

  it('retains memory and disk after both actual save attempts refuse', async () => {
    const view = await mount(), origin = api().career!, saved = raw(), count = draws(), request = quote(origin);
    const original = Storage.prototype.setItem; let refused = 0;
    const storage = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === SAVE_KEY) { refused++; throw new DOMException('QA quota', 'QuotaExceededError'); }
      original.call(this, key, value);
    });
    act(() => expect(api().commitRecruitment(make(request))).toBe(false));
    expect(refused).toBe(2); expect(api().saveFailed).toBe(true); unchanged(origin, saved, count);
    storage.mockRestore(); view.unmount(); expect(raw()).toBe(saved); expect(loadCareer()?.individualLightSeason).toBeUndefined();
  });

  it('denies a stale career and an equal cloned player through the actual writer', async () => {
    await mount(); const origin = api().career!, request = quote(origin), captured = api().commitRecruitment;
    act(() => api().setTraining({ intensity: 'double', focus: 'balanced' }));
    await waitFor(() => expect(api().career).not.toBe(origin));
    const current = api().career!, saved = raw(), count = draws();
    act(() => expect(captured(make(request))).toBe(false)); unchanged(current, saved, count);
    const fresh = quote(current), cloned = { ...fresh, player: structuredClone(fresh.player) };
    act(() => expect(api().commitRecruitment(make(cloned))).toBe(false)); unchanged(current, saved, count);
  });

  it('refuses a captured callback after an actual phase-only move out of the hub', async () => {
    await mount(); const request = quote(api().career!), captured = api().commitRecruitment;
    act(() => api().showSlots()); await waitFor(() => expect(api().phase).toBe('resume'));
    const origin = api().career!, saved = raw(), count = draws(), transform = vi.fn(make(request));
    act(() => expect(captured(transform)).toBe(false)); expect(transform).not.toHaveBeenCalled(); unchanged(origin, saved, count);
  });

  it('does not overwrite the career made active by another slot', async () => {
    const other = startCareer('Everton'), otherRaw = officialRaw(other); localStorage.clear(); saveFence.release(SAVE_KEY);
    const view = await mount(), origin = api().career!, request = quote(origin), captured = api().commitRecruitment;
    localStorage.setItem(parkedKey(2), otherRaw); expect(switchSlot(2, origin)).toBe(true);
    const incoming = raw(), parked = localStorage.getItem(parkedKey(1)), count = draws(), transform = vi.fn(make(request));
    act(() => expect(captured(transform)).toBe(false)); expect(transform).not.toHaveBeenCalled();
    expect(activeSlot()).toBe(2); expect(raw()).toBe(incoming); expect(localStorage.getItem(parkedKey(1))).toBe(parked); expect(draws()).toBe(count);
    view.unmount(); expect(raw()).toBe(incoming);
  });

  it('denies an identical replaced save after the actual hook leaves and reloads its slot', async () => {
    const other = startCareer('Everton'), otherRaw = officialRaw(other); localStorage.clear(); saveFence.release(SAVE_KEY);
    await mount(); const origin = api().career!, saved = raw()!, request = quote(origin), captured = api().commitRecruitment;
    localStorage.setItem(parkedKey(2), otherRaw);
    act(() => api().openSlot(2)); await waitFor(() => expect(api().career?.clubName).toBe('Everton'));
    localStorage.setItem(parkedKey(1), saved);
    act(() => api().openSlot(1)); await waitFor(() => expect(api().career?.clubName).toBe(origin.clubName));
    await waitFor(() => expect(api().phase).toBe('hub'));
    const replacement = api().career!; expect(replacement).not.toBe(origin); expect(replacement).toStrictEqual(origin);
    const replacementRaw = raw(), count = draws();
    act(() => expect(captured(make(request))).toBe(false)); unchanged(replacement, replacementRaw, count);
  });

  it('refuses a genuine newer same-slot fence before the Light transform runs', async () => {
    await mount(); const origin = api().career!, request = quote(origin), captured = api().commitRecruitment;
    const incoming = JSON.stringify(trimCareer(setTrainingPlan(origin, { intensity: 'light', focus: 'balanced' }))), external = createSaveFence(() => localStorage);
    external.adopt(SAVE_KEY); expect(external.write(SAVE_KEY, () => { localStorage.setItem(SAVE_KEY, incoming); return true; })).toBe('written');
    const count = draws(), transform = vi.fn(make(request));
    act(() => expect(captured(transform)).toBe(false)); expect(transform).not.toHaveBeenCalled();
    expect(api().saveMoved).toBe(true); expect(api().career).toBe(origin); expect(raw()).toBe(incoming); expect(draws()).toBe(count);
  });

  it('invalidates the real commit callback on unmount', async () => {
    const view = await mount(), request = quote(api().career!), captured = api().commitRecruitment;
    view.unmount(); const saved = raw(), count = draws(), transform = vi.fn(make(request));
    expect(captured(transform)).toBe(false); expect(transform).not.toHaveBeenCalled(); expect(raw()).toBe(saved); expect(draws()).toBe(count);
  });

  it('keeps one season reserved after actual loan-out or termination and shows no replacement picker', async () => {
    for (const departure of ['loan', 'termination'] as const) {
      const view = await mount(), request = quote(api().career!);
      act(() => expect(api().commitRecruitment(make(request))).toBe(true));
      act(() => { if (departure === 'loan') api().loanOut(request.player.id); else api().terminate(request.player.id); });
      await waitFor(() => expect(api().career!.squad.some(p => p.id === request.player.id)).toBe(false));
      const current = api().career!, saved = raw(), count = draws();
      expect(lightSeasonReservation(current)).toEqual(request.data); expect(lightSeasonPlayer(current)).toBeNull();
      const second = quote(current);
      act(() => { expect(api().commitRecruitment(make(second))).toBe(false); expect(api().commitRecruitment(make(null))).toBe(false); });
      unchanged(current, saved, count);
      fireEvent.click(await training());
      expect(await screen.findByText("This season's choice is locked.")).toBeVisible();
      expect(screen.queryByRole('combobox')).toBeNull();
      expect(screen.getByRole('button', { name: 'Light season rules' })).toBeVisible();
      expect(screen.getByRole('button', { name: 'Back' })).toBeVisible();
      view.unmount(); localStorage.clear(); saveFence.release(SAVE_KEY); capture.game = null;
    }
  });
});
