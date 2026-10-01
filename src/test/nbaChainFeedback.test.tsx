import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import NbaChain from '@/pages/NbaChain';
import { recordCompletion } from '@/lib/completions';

const fixture = vi.hoisted(() => ({ clipboard: vi.fn(async (_text: string) => {}), response: { valid: true, connection: 'Generated fixture shared squad' } as Record<string, unknown>, status: 200 }));
vi.mock('@/lib/playerSearch', async original => ({ ...await original<typeof import('@/lib/playerSearch')>(), searchPlayers: vi.fn(async ({ query }: { query: string }) => ({ results: [{ key: query, name: query, source: 'nba', meta: {} }], error: false })) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => {} }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => 'FixtureBaller' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/GameHelp', () => ({ GameHelp: () => null }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/game/ReportQuestion', () => ({ default: () => null }));

const page = () => <HelmetProvider><MemoryRouter initialEntries={['/nba-chain']}><NbaChain /></MemoryRouter></HelmetProvider>;
const mount = () => render(page());
const tick = async (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
const input = (view: ReturnType<typeof render>) => view.getByRole('combobox', { name: 'Enter NBA player name...' }) as HTMLInputElement;
async function select(view: ReturnType<typeof render>, name: string) {
  const box = input(view); box.focus(); fireEvent.change(box, { target: { value: name } }); await tick(201);
  fireEvent.keyDown(box, { key: 'ArrowDown' });
  await act(async () => { fireEvent.keyDown(box, { key: 'Enter' }); });
}
const rows = (view: ReturnType<typeof render>) => [...view.container.querySelectorAll<HTMLElement>('[data-nba-chain-link]')];
const list = (view: ReturnType<typeof render>) => (view.container.querySelector('[data-nba-chain-list]') ?? view.container.querySelector('div.max-h-\\[400px\\]')) as HTMLDivElement;
const cue = (view: ReturnType<typeof render>) => view.container.querySelector('[data-nba-chain-feedback="latest"]');
const css = () => readFileSync(process.env.NBA_CHAIN_FEEDBACK_CSS || path.resolve('src/pages/NbaChainFeedback.module.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

beforeEach(() => {
  localStorage.clear(); vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-01T16:00:00Z'));
  fixture.response = { valid: true, connection: 'Generated fixture shared squad' }; fixture.status = 200;
  vi.spyOn(Math, 'random').mockReturnValue(0.25);
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: fixture.clipboard } });
  vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body)); return { ok: fixture.status === 200, status: fixture.status, json: async () => ({ ...fixture.response, fullName: body.newPlayer }) };
  }));
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('NBA Chain local committed feedback', () => {
  it('reveals accepted links only inside the timeline without scrolling the document', async () => {
    const view = mount(); const panel = list(view); expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
    Object.defineProperty(panel, 'scrollHeight', { configurable: true, value: 840 });
    const before = rows(view)[0]; await select(view, 'Fixture Guard Alpha');
    expect(panel.scrollTop, 'Accepted link must reveal inside its own list').toBe(840);
    expect(HTMLElement.prototype.scrollIntoView, 'Timeline must never request ancestor document scroll').not.toHaveBeenCalled();
    expect(rows(view)[0]).toBe(before); expect(rows(view)[1]).toHaveTextContent('Fixture Guard Alpha'); expect(cue(view)).not.toBeNull();
    expect(localStorage.getItem('nba-chain-best')).toBe('1'); expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('keeps seed, rejected and deferred requests quiet without credit or list movement', async () => {
    const view = mount(); expect(cue(view)).toBeNull(); const panel = list(view); panel.scrollTop = 17;
    const writes = vi.spyOn(Storage.prototype, 'setItem'); const random = Math.random as ReturnType<typeof vi.spyOn>; const draws = random.mock.calls.length;
    for (const response of [{ valid: false, unverified: true, reason: 'Fixture retry' }, { valid: false, coverageGap: true, reason: 'Fixture coverage' }]) {
      fixture.response = response; await select(view, 'Fixture Deferred Guard'); expect(cue(view)).toBeNull(); expect(rows(view)).toHaveLength(1); expect(panel.scrollTop).toBe(17);
    }
    fixture.status = 429; await select(view, 'Fixture Limited Guard');
    expect(rows(view)).toHaveLength(1); expect(cue(view)).toBeNull(); expect(panel.scrollTop).toBe(17); expect(writes).not.toHaveBeenCalled(); expect(random.mock.calls.length).toBe(draws); expect(recordCompletion).not.toHaveBeenCalled();
    fixture.status = 200; fixture.response = { valid: false, reason: 'Fixture wrong link' }; await select(view, 'Fixture Wrong Guard');
    expect(view.getByText('Fixture wrong link')).toBeInTheDocument(); expect(rows(view)).toHaveLength(1); expect(cue(view)).toBeNull(); expect(panel.scrollTop).toBe(17);
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/nba-chain', 0, 'FixtureBaller', 0);
  });

  it('retains earlier nodes and does not replay on unchanged renders or reset', async () => {
    const view = mount(); await select(view, 'Fixture Guard Alpha'); const firstCue = cue(view); const original = rows(view); view.rerender(page());
    expect(cue(view)).toBe(firstCue); expect(rows(view)[0]).toBe(original[0]); expect(rows(view)[1]).toBe(original[1]); await tick(500); expect(cue(view)).toBeNull();
    view.rerender(page()); expect(cue(view)).toBeNull(); await select(view, 'Fixture Guard Bravo'); expect(rows(view)[0]).toBe(original[0]); expect(rows(view)[1]).toBe(original[1]);
    fireEvent.click(view.getByRole('button', { name: 'End Game' })); fireEvent.click(view.getByRole('button', { name: 'Play Again' }));
    expect(rows(view)).toHaveLength(1); expect(cue(view)).toBeNull(); await tick(500); expect(cue(view)).toBeNull();
  });

  it('preserves search focus after validation and leaves connected help focus alone', async () => {
    const view = mount(); let accepted!: (value: unknown) => void;
    vi.mocked(fetch).mockImplementationOnce(async () => ({ ok: true, json: () => new Promise(resolve => { accepted = resolve; }) }) as Response);
    await select(view, 'Fixture Guard Alpha'); const disabledBox = input(view); expect(disabledBox).toBeDisabled(); disabledBox.blur();
    await act(async () => { accepted({ valid: true, fullName: 'Fixture Guard Alpha', connection: 'Generated fixture squad' }); }); expect(input(view)).toHaveFocus();
    let finish!: (value: unknown) => void; vi.mocked(fetch).mockImplementationOnce(async () => ({ ok: true, json: () => new Promise(resolve => { finish = resolve; }) }) as Response);
    const box = input(view); fireEvent.change(box, { target: { value: 'Fixture Guard Bravo' } }); await tick(201);
    fireEvent.keyDown(box, { key: 'ArrowDown' });
    await act(async () => { fireEvent.keyDown(box, { key: 'Enter' }); });
    const help = view.getByRole('button', { name: 'How to play' }); help.focus();
    await act(async () => { finish({ valid: true, fullName: 'Fixture Guard Bravo', connection: 'Generated second squad' }); });
    expect(help).toHaveFocus(); expect(rows(view)).toHaveLength(3);
  });

  it('binds full names and connections to scoped wrapping and fixed list geometry', async () => {
    const view = mount(); const name = 'FixtureVeryLongUnbrokenBasketballPlayerNameForWrapping'; fixture.response = { valid: true, connection: 'FixtureVeryLongUnbrokenSharedSquadConnectionForWrapping' }; await select(view, name);
    const latest = rows(view)[1]; expect(latest.querySelector('[data-nba-chain-name]')?.textContent).toBe(name);
    expect(latest.querySelector('[data-nba-chain-name]')?.className).toMatch(/fullName/); expect(latest.querySelector('[data-nba-chain-connection]')?.className).toMatch(/fullName/);
    expect(css()).toMatch(/\.fullName\s*\{[^}]*overflow-wrap:\s*anywhere;/); expect(css()).toMatch(/\.timeline\s*\{[^}]*height:\s*240px;/);
  });

  it('binds finite single-iteration feedback and static reduced motion', () => {
    expect(css()).toMatch(/animation:\s*nbaChainLink\s+420ms\s+ease-out\s+1;/);
    expect(css()).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[^}]*\.latest\s*\{\s*animation:\s*none;/);
  });

  it('holds independent original ten-pick score, exact best save, share and once completion', async () => {
    const view = mount(); fireEvent.click(view.getByRole('button', { name: '🎯 Round (10)' }));
    for (let i = 0; i < 10; i++) await select(view, `Fixture Round Guard ${i}`);
    expect(view.getByText('Round complete!')).toBeInTheDocument(); expect(view.getByText('3 over par (par 7)')).toBeInTheDocument(); expect(localStorage.getItem('nba-chain-best')).toBe('10'); expect(localStorage.getItem('nba-chain-mode')).toBe('round');
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/nba-chain', 1000, 'FixtureBaller', 0);
    fireEvent.click(view.getByRole('button', { name: /Copy Score Card/ })); await tick(0);
    expect(fixture.clipboard).toHaveBeenCalledExactlyOnceWith('🔗 NBA Chain Game: Oct 1, 2026\nNBA Chain: 10/10 picks, +3 vs par\nScore: 10/10 picks, +3 vs par\ndouknowball.com/nba-chain');
    view.rerender(page()); await tick(600); expect(recordCompletion).toHaveBeenCalledTimes(1); expect(localStorage.getItem('nba-chain-best')).toBe('10');
  });
});
