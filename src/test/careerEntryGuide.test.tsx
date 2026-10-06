import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import type { ComponentType } from 'react';
import type { GameContent } from '@/data/gameContent/types';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => 'Tester' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: () => Promise.resolve([]) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }) }));
vi.mock('sonner', () => ({ toast: { success: () => undefined } }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/data/gameContent/loader', async importOriginal => {
  const actual = await importOriginal<typeof import('@/data/gameContent/loader')>();
  return { ...actual, loadGameContent: vi.fn(actual.loadGameContent) };
});

import { GameHelp } from '@/components/game/GameHelp';
import NbaMyCareer from '@/pages/NbaMyCareer';
import NflMyCareer from '@/pages/NflMyCareer';
import MlbMyCareer from '@/pages/MlbMyCareer';
import NhlMyCareer from '@/pages/NhlMyCareer';
import { loadGameContent } from '@/data/gameContent/loader';
import { recordActivity, recordCompletion } from '@/lib/completions';
import { decisionSave, decisionSports, makeDecisionCareer } from '@/test/fixtures/careerDecisionOutcome1009';

const { loadGameContent: realLoad } = await vi.importActual<typeof import('@/data/gameContent/loader')>('@/data/gameContent/loader');
const pages: Record<string, ComponentType> = { nba: NbaMyCareer, nfl: NflMyCareer, mlb: MlbMyCareer, nhl: NhlMyCareer };
const route = (slug: string) => `/${slug}-my-career`;
const seen = (slug: string) => `rules-gate-seen:${route(slug)}`;
const protectedKeys = [...Object.values(decisionSports).map(sport => sport.saveKey), 'dukb-local-completions', 'dukb-streaks-v1', 'dukb-play-diary-v1'];
const snapshot = () => protectedKeys.map(key => [key, localStorage.getItem(key)]);
const dialog = () => screen.queryByRole('dialog', { name: 'How to play' });
const trigger = () => screen.getByRole('button', { name: 'How to play' });
async function flush() { await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); }); }
async function mount(slug: string) {
  const Page = pages[slug];
  const content = await realLoad(route(slug));
  vi.mocked(loadGameContent).mockResolvedValueOnce(content);
  const view = render(<MemoryRouter initialEntries={[route(slug)]}><Page /></MemoryRouter>);
  await flush();
  return view;
}
async function dismiss() {
  const open = dialog(); expect(open, 'The real guide is open before dismissal').not.toBeNull();
  fireEvent.click(within(open!).getByRole('button', { name: "Let's Play!" })); await flush();
  expect(dialog(), 'Guide dismissal returns to the career').toBeNull();
}
function clearActivity() {
  vi.mocked(Math.random).mockClear(); vi.mocked(recordCompletion).mockClear(); vi.mocked(recordActivity).mockClear();
}
function held(bytes: ReturnType<typeof snapshot>) {
  expect(snapshot(), 'Guide interaction preserves every career and completion byte').toEqual(bytes);
  expect(Math.random, 'Guide interaction consumes no career randomness').not.toHaveBeenCalled();
  expect(recordCompletion).not.toHaveBeenCalled(); expect(recordActivity).not.toHaveBeenCalled();
}
function RouteGuide() {
  const navigate = useNavigate();
  return <><button onClick={() => navigate(route('nfl'))}>Switch fixture route</button><GameHelp firstVisit /></>;
}
const fixtureContent: GameContent = { intro: [], howToPlay: ['Fixture guide step'], rules: ['Fixture rule'], example: ['Fixture worked example'], tips: [], faqs: [] };
beforeEach(() => {
  localStorage.clear(); vi.clearAllMocks(); vi.mocked(loadGameContent).mockImplementation(realLoad);
  vi.spyOn(Math, 'random').mockReturnValue(.5);
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => undefined);
  for (const slug of Object.keys(pages)) localStorage.setItem(decisionSports[slug].saveKey, decisionSave(makeDecisionCareer(slug)));
  for (const key of protectedKeys.slice(4)) localStorage.setItem(key, `held:${key}`);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); delete (window as Window & { __DUKB_PRERENDER__?: boolean }).__DUKB_PRERENDER__; });

describe('career entry guides', () => {
  it('opens each opted-in career guide and remembers only its dismissal', async () => {
    for (const slug of Object.keys(pages)) {
      const bytes = snapshot(), view = await mount(slug);
      expect(dialog(), `${slug} shows its first-visit guide`).not.toBeNull();
      expect(localStorage.getItem(seen(slug)), 'Loading and opening do not record a dismissal').toBeNull();
      clearActivity(); const writes = vi.spyOn(Storage.prototype, 'setItem');
      await dismiss();
      expect(localStorage.getItem(seen(slug)), 'An actual dismissal is remembered for this route').toBe('1');
      expect(writes.mock.calls.map(([key]) => key)).toEqual([seen(slug)]);
      expect(document.activeElement, 'Closing the guide returns focus to its help trigger').toBe(trigger());
      held(bytes); writes.mockRestore(); view.unmount();
    }
  });
  it('returns quietly and reopens the guide without changing career progress', async () => {
    localStorage.setItem(seen('nba'), '1'); const bytes = snapshot();
    const view = await mount('nba');
    expect(dialog(), 'A returning career does not interrupt the player').toBeNull();
    clearActivity(); const writes = vi.spyOn(Storage.prototype, 'setItem');
    fireEvent.click(trigger()); await flush(); expect(dialog()).not.toBeNull();
    await dismiss(); held(bytes);
    expect(writes.mock.calls.every(([key]) => key === seen('nba'))).toBe(true);
    expect(document.activeElement).toBe(trigger());
    fireEvent.click(trigger()); await flush();
    fireEvent.keyDown(dialog()!, { key: 'Escape', code: 'Escape' }); await flush();
    expect(dialog(), 'Escape dismisses the reopened instructions').toBeNull();
    expect(document.activeElement).toBe(trigger()); held(bytes); writes.mockRestore(); view.unmount();
    await mount('nba'); expect(dialog(), 'Reload keeps the dismissed guide closed').toBeNull();
  });
  it('isolates route receipts and ignores a late guide from the previous route', async () => {
    let finishOld!: (content: GameContent) => void;
    vi.mocked(loadGameContent).mockImplementation(path => path === route('nba')
      ? new Promise(resolve => { finishOld = resolve; }) : Promise.resolve({ ...fixtureContent, howToPlay: ['Current route fixture step'] }));
    render(<MemoryRouter initialEntries={[route('nba')]}><RouteGuide /></MemoryRouter>); await flush();
    fireEvent.click(screen.getByRole('button', { name: 'Switch fixture route' })); await flush();
    expect(dialog(), 'The new route opens its own loaded guide').not.toBeNull();
    expect(dialog()?.textContent).toContain('Current route fixture step');
    await act(async () => { finishOld({ ...fixtureContent, howToPlay: ['Stale route fixture step'] }); });
    expect(dialog()?.textContent, 'A late response cannot replace the current guide').toContain('Current route fixture step');
    expect(dialog()?.textContent).not.toContain('Stale route fixture step');
    await dismiss(); expect(localStorage.getItem(seen('nfl'))).toBe('1'); expect(localStorage.getItem(seen('nba'))).toBeNull();
    cleanup(); await mount('nba'); expect(dialog(), 'Dismissing one sport does not dismiss another').not.toBeNull();
  });
  it('waits for usable instructions without recording an unseen guide', async () => {
    let finish!: (content: GameContent | null) => void;
    vi.mocked(loadGameContent).mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const view = render(<MemoryRouter initialEntries={[route('nba')]}><GameHelp firstVisit /></MemoryRouter>); await flush();
    expect(dialog(), 'Pending guide data cannot open an empty dialog').toBeNull();
    expect(localStorage.getItem(seen('nba')), 'Pending data cannot mark the route seen').toBeNull();
    await act(async () => { finish(fixtureContent); }); await flush();
    expect(dialog(), 'Usable asynchronous instructions open on arrival').not.toBeNull();
    expect(localStorage.getItem(seen('nba'))).toBeNull(); await dismiss(); view.unmount();
    localStorage.removeItem(seen('nba')); vi.mocked(loadGameContent).mockResolvedValue({ ...fixtureContent, howToPlay: [] });
    render(<MemoryRouter initialEntries={[route('nba')]}><GameHelp firstVisit /></MemoryRouter>); await flush();
    expect(dialog()).toBeNull(); expect(screen.queryByRole('button', { name: 'How to play' })).toBeNull();
    expect(localStorage.getItem(seen('nba'))).toBeNull();
  });
  it('keeps blocked-storage guides dismissible and reopenable without changing saves', async () => {
    const bytes = snapshot(), get = Storage.prototype.getItem, set = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function(key) { if (key.startsWith('rules-gate-seen:')) throw new Error('Fixture read blocked'); return get.call(this, key); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function(key, value) { if (key.startsWith('rules-gate-seen:')) throw new Error('Fixture write blocked'); return set.call(this, key, value); });
    const view = await mount('nba'); expect(dialog(), 'Blocked storage does not hide instructions').not.toBeNull();
    clearActivity(); await dismiss(); held(bytes);
    fireEvent.click(trigger()); await flush(); expect(dialog(), 'The help trigger remains usable').not.toBeNull();
    await dismiss(); held(bytes); view.unmount();
    await mount('nba'); expect(dialog(), 'A browser that cannot remember may show instructions on the next mount').not.toBeNull();
  });
  it('keeps first-visit state out of prerendered pages', async () => {
    (window as Window & { __DUKB_PRERENDER__?: boolean }).__DUKB_PRERENDER__ = true;
    await mount('nba');
    expect(dialog(), 'Prerender must not freeze a first-visit dialog').toBeNull();
    expect(localStorage.getItem(seen('nba'))).toBeNull();
  });
  it('reuses real instructions for saved season reviews and actual decision results', async () => {
    for (const slug of Object.keys(pages)) {
      const view = await mount(slug), open = dialog(); expect(open).not.toBeNull();
      expect(within(open!).queryByRole('heading', { name: 'The steps' })).not.toBeNull();
      expect(within(open!).queryByRole('heading', { name: 'The rules' })).not.toBeNull();
      expect(within(open!).queryByRole('heading', { name: 'A worked example' })).not.toBeNull();
      expect(open?.textContent).toMatch(/Career Log/); expect(open?.textContent).toMatch(/actual changes/i);
      await dismiss(); view.unmount();
    }
  });
  it('leaves default GameHelp manual and independent career bytes unchanged', async () => {
    const bytes = snapshot(); vi.mocked(loadGameContent).mockResolvedValue(fixtureContent);
    render(<MemoryRouter initialEntries={[route('nba')]}><GameHelp /></MemoryRouter>); await flush();
    expect(dialog(), 'GameHelp without opt-in retains its manual default').toBeNull();
    clearActivity(); const writes = vi.spyOn(Storage.prototype, 'setItem');
    fireEvent.click(trigger()); await flush(); expect(dialog()).not.toBeNull();
    await dismiss(); held(bytes); expect(writes).not.toHaveBeenCalled(); expect(localStorage.getItem(seen('nba'))).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });
});
