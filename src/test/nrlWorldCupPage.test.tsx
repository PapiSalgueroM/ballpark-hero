import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNrlCareer, reduceNrlCareer } from '@/lib/nrlCareer';
import { NRL_SAVE_KEY } from '@/lib/nrlManager';
import { createNrlWorldCup, readNrlWorldCupSave } from '@/lib/nrlWorldCup';
import { NRL_SAVE_SLOTS, nrlCheckpointKey, restoreNrlCheckpoint, saveNrlCheckpoint } from '@/lib/nrlSaveSlots';
import { fenceKeyOf, saveFence } from '@/lib/saveFence';
import { hasPendingSaves, settlePendingSaves } from '@/lib/safeStorage';
import NrlTeamManager from '@/pages/NrlTeamManager';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => 'Guest' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/components/CookieConsent', () => ({ CookieConsent: () => null }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/RulesGate', () => ({ RulesGate: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));

const cupKey = 'nrl-world-cup-save-v1';
const open = (path = '/nrl-team-manager') => render(<MemoryRouter initialEntries={[path]}><NrlTeamManager /></MemoryRouter>);
const button = (name: string) => screen.getByRole('button', { name });
const click = (name: string) => fireEvent.click(button(name));
const cup = () => readNrlWorldCupSave(localStorage.getItem(cupKey));

async function openCup() {
  click('Rugby League World Cup');
  await screen.findByRole('heading', { name: '2026 Rugby League World Cup' });
}

beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); vi.restoreAllMocks(); saveFence.release(NRL_SAVE_KEY); saveFence.release(cupKey); });

describe('Rugby League World Cup screen', () => {
  it('starts before club setup, plays all stages, and resumes its result independently', async () => {
    const view = open();
    await openCup();
    expect(localStorage.getItem(cupKey)).toBeNull();
    expect(screen.getByText(/published 2026 fixtures/i)).toBeVisible();
    fireEvent.change(screen.getByRole('combobox', { name: 'Coach a nation' }), { target: { value: 'new-zealand' } });
    click('Start World Cup');
    expect(cup()?.nation).toBe('new-zealand');
    expect(localStorage.getItem(NRL_SAVE_KEY)).toBeNull();
    fireEvent.change(screen.getByRole('combobox', { name: 'World Cup tactic' }), { target: { value: 'attack' } });
    click('Play pool round 1');
    expect(cup()?.tactics).toEqual(['attack']);
    click('Back to club manager');
    expect(screen.getByRole('heading', { name: 'Choose a season' })).toBeVisible();
    await openCup();
    click('Play pool round 2');
    click('Play pool round 3');
    click('Play semifinals');
    click('Play final');
    expect(screen.getByRole('status')).toHaveTextContent(/win the World Cup/);
    expect(cup()?.tactics).toHaveLength(5);
    const saved = localStorage.getItem(cupKey);
    expect(localStorage.getItem(NRL_SAVE_KEY)).toBeNull();
    view.unmount();

    open();
    await openCup();
    expect(screen.getByRole('status')).toHaveTextContent(/win the World Cup/);
    expect(localStorage.getItem(cupKey)).toBe(saved);
  });

  it('preserves an active club panel and refuses to overwrite a newer tournament from another tab', async () => {
    const career = reduceNrlCareer(createNrlCareer('broncos', 16), { type: 'startLive' });
    const clubBytes = JSON.stringify(career);
    localStorage.setItem(NRL_SAVE_KEY, clubBytes);
    localStorage.setItem(cupKey, JSON.stringify(createNrlWorldCup(16, 'fiji')));
    open();
    expect(button('Play second half')).toBeVisible();
    await openCup();
    expect(button('Play pool round 1')).toBeEnabled();
    const newBytes = JSON.stringify({ ...createNrlWorldCup(16, 'fiji'), tactics: ['defense'] });
    localStorage.setItem(cupKey, newBytes);
    localStorage.setItem(fenceKeyOf(cupKey), '7');
    click('Play pool round 1');
    expect(screen.getByText(/World Cup changed in another tab/)).toBeVisible();
    expect(localStorage.getItem(cupKey)).toBe(newBytes);
    click('Back to club manager');
    expect(button('Play second half')).toBeVisible();
    expect(localStorage.getItem(NRL_SAVE_KEY)).toBe(clubBytes);
    expect(localStorage.getItem(fenceKeyOf(NRL_SAVE_KEY))).toBeNull();
  });

  it('previews a simulated matchday change and saves it only when the stage is played', async () => {
    const view = open();
    await openCup();
    click('Start World Cup');
    const before = localStorage.getItem(cupKey);
    fireEvent.click(screen.getByText('Set matchday lineup'));
    fireEvent.change(screen.getByRole('combobox', { name: 'Starter and reserve swap' }), { target: { value: '0' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'First interchange priority' }), { target: { value: '3' } });
    expect(screen.getByText(/Tom Dearden starts at Halfback/)).toBeVisible();
    expect(screen.getByText(/Planned rotation: Keaon Koloamatangi/)).toBeVisible();
    expect(localStorage.getItem(cupKey)).toBe(before);
    click('Play pool round 1');
    expect(cup()?.lineups).toEqual({ 1: { swap: 0, firstReserve: 3 } });
    expect(screen.getByText(/Tom Dearden starts at Halfback/)).toBeVisible();
    const after = localStorage.getItem(cupKey);
    view.unmount();
    open();
    await openCup();
    expect(localStorage.getItem(cupKey)).toBe(after);
    expect(screen.getByText(/Tom Dearden starts at Halfback/)).toBeVisible();
    click('Play pool round 2');
    expect(cup()?.lineups).toEqual({ 1: { swap: 0, firstReserve: 3 } });
    expect(localStorage.getItem(NRL_SAVE_KEY)).toBeNull();
  });

  it('keeps a refused tournament save until retry and allows leaving only after it is stored', async () => {
    const initial = JSON.stringify(createNrlWorldCup(16, 'tonga'));
    localStorage.setItem(cupKey, initial);
    open();
    await openCup();
    const set = Storage.prototype.setItem;
    let blocked = true;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === cupKey && blocked) throw new DOMException('Quota full', 'QuotaExceededError');
      set.call(this, key, value);
    });
    click('Play pool round 1');
    expect(localStorage.getItem(cupKey)).toBe(initial);
    expect(button('Retry World Cup save')).toBeVisible();
    expect(hasPendingSaves()).toBe(true);
    act(() => expect(settlePendingSaves()).toBe(false));
    click('Back to club manager');
    expect(screen.getByRole('heading', { name: '2026 Rugby League World Cup' })).toBeVisible();
    blocked = false;
    click('Retry World Cup save');
    await waitFor(() => expect(hasPendingSaves()).toBe(false));
    expect(cup()?.tactics).toEqual(['balanced']);
    click('Back to club manager');
    expect(screen.getByRole('heading', { name: 'Choose a season' })).toBeVisible();
    expect(localStorage.getItem(NRL_SAVE_KEY)).toBeNull();
  });

  it('takes a national appointment in Club office and resumes it without touching the standalone run', async () => {
    let career = createNrlCareer('broncos', 16);
    while (career.season.phase !== 'complete') career = reduceNrlCareer(career, { type: 'advance' });
    const clubBytes = JSON.stringify(career);
    const standalone = JSON.stringify(createNrlWorldCup(17, 'fiji'));
    localStorage.setItem(NRL_SAVE_KEY, clubBytes);
    localStorage.setItem(cupKey, standalone);
    const view = open();
    click('Club office');
    click('Take 2026 World Cup appointment');
    await screen.findByRole('heading', { name: '2026 World Cup national appointment' });
    expect(localStorage.getItem(NRL_SAVE_KEY)).toBe(clubBytes);
    fireEvent.change(screen.getByRole('combobox', { name: 'Coach a nation' }), { target: { value: 'new-zealand' } });
    click('Accept national appointment');
    expect(JSON.parse(localStorage.getItem(NRL_SAVE_KEY)!).worldCup).toMatchObject({ nation: 'new-zealand', tactics: [] });
    click('Play pool round 1');
    expect(JSON.parse(localStorage.getItem(NRL_SAVE_KEY)!).worldCup.tactics).toEqual(['balanced']);
    expect(localStorage.getItem(cupKey)).toBe(standalone);
    const saved = localStorage.getItem(NRL_SAVE_KEY);
    view.unmount();
    open();
    click('Club office');
    click('Resume 2026 World Cup appointment');
    await screen.findByRole('heading', { name: '2026 World Cup national appointment' });
    expect(button('Play pool round 2')).toBeEnabled();
    expect(localStorage.getItem(NRL_SAVE_KEY)).toBe(saved);
    click('Play pool round 2');
    click('Play pool round 3');
    click('Play semifinals');
    click('Play final');
    expect(screen.getByText(/win the World Cup/)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'New World Cup' })).toBeNull();
    click('Back to club manager');
    expect(button('View 2026 World Cup results')).toHaveFocus();
    click('View 2026 World Cup results');
    await screen.findByRole('heading', { name: '2026 World Cup national appointment' });
    expect(screen.getByText(/win the World Cup/)).toBeVisible();
    click('Back to club manager');
    await openCup();
    expect(screen.getByText('Coaching Fiji')).toBeVisible();
    expect(localStorage.getItem(cupKey)).toBe(standalone);
  });

  it('saves and restores the appointment in its own career slot, including quota and another-tab protection', async () => {
    const slot = NRL_SAVE_SLOTS[1];
    let career = createNrlCareer('broncos', 16);
    while (career.season.phase !== 'complete') career = reduceNrlCareer(career, { type: 'advance' });
    const clubBytes = JSON.stringify(career);
    localStorage.setItem(slot.saveKey, clubBytes);
    const view = open(slot.path);
    click('Club office');
    click('Take 2026 World Cup appointment');
    await screen.findByRole('heading', { name: '2026 World Cup national appointment' });

    const set = Storage.prototype.setItem;
    let blocked = true;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === slot.saveKey && blocked) throw new DOMException('Quota full', 'QuotaExceededError');
      set.call(this, key, value);
    });
    click('Accept national appointment');
    expect(localStorage.getItem(slot.saveKey)).toBe(clubBytes);
    expect(hasPendingSaves()).toBe(true);
    click('Back to club manager');
    expect(button('Retry World Cup save')).toBeVisible();
    blocked = false;
    click('Retry World Cup save');
    await waitFor(() => expect(hasPendingSaves()).toBe(false));
    const checkpoint = localStorage.getItem(slot.saveKey)!;
    expect(saveNrlCheckpoint(slot.saveKey, checkpoint, null)).toBe('written');
    expect(localStorage.getItem(nrlCheckpointKey(slot.saveKey))).toBe(checkpoint);
    blocked = true;
    click('Play pool round 1');
    expect(button('Play pool round 2')).toBeVisible();
    expect(localStorage.getItem(slot.saveKey)).toBe(checkpoint);
    expect(button('Retry World Cup save')).toBeVisible();
    blocked = false;
    click('Retry World Cup save');
    await waitFor(() => expect(hasPendingSaves()).toBe(false));
    const progressed = localStorage.getItem(slot.saveKey)!;
    expect(JSON.parse(progressed).worldCup.tactics).toEqual(['balanced']);
    expect(restoreNrlCheckpoint(slot, progressed, checkpoint)).toBe('written');
    click('Play pool round 2');
    expect(screen.getByText(/Return to the club manager and reload your season/)).toBeVisible();
    expect(localStorage.getItem(slot.saveKey)).toBe(checkpoint);
    expect(localStorage.getItem(NRL_SAVE_KEY)).toBeNull();
    expect(localStorage.getItem(cupKey)).toBeNull();
    view.unmount();
    open(slot.path);
    click('Club office');
    click('Resume 2026 World Cup appointment');
    await screen.findByRole('heading', { name: '2026 World Cup national appointment' });
    expect(button('Play pool round 1')).toBeEnabled();
  });
});
