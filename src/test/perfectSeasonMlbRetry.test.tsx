import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import MlbPage from '@/pages/PerfectSeasonMlb';
import { MLB_SLOTS } from '@/lib/perfectSeasonMlb';
import { loadDailyAttempt, getDailyDateET, type SpinSquad, type SimResult } from '@/lib/perfectSeason';
import { recordCompletion } from '@/lib/completions';

const evidence = vi.hoisted(() => ({
  indexQueue: [] as unknown[], index: [] as unknown[], indexCalls: [] as unknown[], squad: null as unknown,
  squadMode: 'ok' as 'ok' | 'null' | 'unusable', squadCalls: [] as unknown[], simulations: [] as { args: unknown[]; result: SimResult }[],
  snapshots: [] as { label: string; html: string; completions: unknown[] }[], draws: [] as { value: number; caller: string | undefined }[],
}));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/GameHelp', () => ({ GameHelp: () => null }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/game/ReportQuestion', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => 'Retry fixture guest' }));
vi.mock('@/lib/perfectSeasonMlb', async original => ({
  ...await original<typeof import('@/lib/perfectSeasonMlb')>(),
  fetchTeamSeasonIndex: async (options: unknown) => {
    const output = evidence.indexQueue.length ? evidence.indexQueue.shift() : evidence.index;
    evidence.indexCalls.push({ options, output: structuredClone(output) }); return output;
  },
  fetchSquad: async (entry: unknown) => {
    const output = evidence.squadMode === 'null' ? null : structuredClone(evidence.squad) as SpinSquad;
    if (output && evidence.squadMode === 'unusable') output.players = output.players.map(player => ({ ...player, eligible: ['C', 'DH'] }));
    evidence.squadCalls.push({ entry, mode: evidence.squadMode, output: structuredClone(output) }); return output;
  },
}));
vi.mock('@/lib/perfectSeason', async original => {
  const actual = await original<typeof import('@/lib/perfectSeason')>();
  return { ...actual, simulateSeason: (...args: Parameters<typeof actual.simulateSeason>) => {
    const result = actual.simulateSeason(...args); evidence.simulations.push({ args: structuredClone(args), result: structuredClone(result) }); return result;
  } };
});

const tick = (ms = 10) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
const renderPage = () => render(<HelmetProvider><MemoryRouter initialEntries={['/perfect-season-mlb']}><MlbPage /></MemoryRouter></HelmetProvider>);
const snap = (label: string) => evidence.snapshots.push({ label, html: document.body.innerHTML, completions: structuredClone(vi.mocked(recordCompletion).mock.calls) });
const choose = async (mode: 'Classic' | 'Daily' | 'Hard') => {
  fireEvent.click(screen.getByText(mode).closest('button')!); await tick(); snap(`choose-${mode}`);
};
const spin = async () => {
  fireEvent.click(screen.getByRole('button', { name: /^(Spin the wheel|Next spin)$/ })); await tick(); snap('spin-settled');
};
const retry = async () => { fireEvent.click(screen.getByRole('button', { name: 'Try again' })); await tick(); snap('retry-settled'); };
const pick = async (slot: string) => {
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`Retry Fixture ${slot}(?:\\s|$)`) })); await tick();
  const option = screen.queryByRole('button', { name: slot }); if (option) { fireEvent.click(option); await tick(); }
  snap(`pick-${slot}`);
};
const expectError = () => {
  expect(screen.getByText("Couldn't reach the baseball archives.")).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
};
const finish = async (slots = MLB_SLOTS.map(slot => slot.key)) => {
  for (const slot of slots) { if (screen.queryByRole('button', { name: /^(Spin the wheel|Next spin)$/ })) await spin(); await pick(slot); }
  expect(screen.getByRole('button', { name: 'Skip to result' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Skip to result' })); await tick(); snap('result');
  const result = evidence.simulations.at(-1)!.result;
  expect(result.games).toHaveLength(162); expect(result.games.every(value => typeof value === 'boolean')).toBe(true);
  expect(result.wins).toBe(result.games.filter(Boolean).length); expect(result.wins + result.losses).toBe(162);
  expect(document.querySelector('[data-result-score]')?.textContent).toBe(`${result.wins}-${result.losses}`);
  return result;
};

beforeEach(() => {
  localStorage.clear(); vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-12T12:00:00Z'));
  evidence.index = [{ yearid: 2001, teamid: 'FXR', name: 'Retry Fixture Club', w: 81, l: 81 }]; evidence.indexQueue = [];
  evidence.squad = { squadId: 'retry-fixture', teamName: 'Retry Fixture Club', year: 2001, players: [...MLB_SLOTS.map(slot => ({
    playerId: `retry-${slot.key}`, name: `Retry Fixture ${slot.key}`, rating: 80,
    eligible: ['DH', 'SP', 'RP'].includes(slot.key) ? [slot.key] : [slot.key, 'DH'], detail: 'Fictional fetch fixture only',
  })), { playerId: 'retry-reserve', name: 'Retry Fixture Reserve', rating: 80, eligible: ['DH'], detail: 'Fictional fetch fixture only' }] } satisfies SpinSquad;
  evidence.squadMode = 'ok'; evidence.indexCalls = []; evidence.squadCalls = []; evidence.simulations = []; evidence.snapshots = []; evidence.draws = [];
  vi.spyOn(Math, 'random').mockImplementation(() => { const value = 0.25; evidence.draws.push({ value, caller: new Error().stack }); return value; });
});
afterEach(context => {
  snap('final-partial-or-complete');
  const out = process.env.MLB_RETRY_COMPONENT_OUT;
  if (out) { mkdirSync(out, { recursive: true }); const id = context.task.name.replace(/[^a-zA-Z0-9]+/g, '-');
    writeFileSync(join(out, `${id}.json`), JSON.stringify({ title: context.task.name, scope: 'Actual page and season simulation with labelled fictional fetch fixtures and existing utility child mocks',
      fixture: { index: evidence.index, squad: evidence.squad }, indexCalls: evidence.indexCalls, squadCalls: evidence.squadCalls,
      simulations: evidence.simulations, snapshots: evidence.snapshots, draws: evidence.draws,
      completions: vi.mocked(recordCompletion).mock.calls, daily: loadDailyAttempt('mlb', getDailyDateET()) }, null, 2), { flag: 'wx' }); }
  cleanup(); vi.restoreAllMocks(); vi.useRealTimers();
});

describe('MLB Perfect Season recoverable archive failures', () => {
  it('retries the initial archive in the chosen mode and refuses a stale prior-mode wheel', async () => {
    evidence.indexQueue = [null, evidence.index, null, evidence.index]; renderPage();
    await choose('Daily'); expectError(); expect(evidence.indexCalls).toHaveLength(1); expect(evidence.squadCalls).toHaveLength(0);
    await retry(); expect(screen.queryByRole('button', { name: 'Spin the wheel' }), 'MLB_RETRY_GUARD_initial_mode_retry').not.toBeNull(); expect(evidence.indexCalls).toHaveLength(2);
    const result = await finish();
    expect(loadDailyAttempt('mlb', getDailyDateET())?.sim).toEqual(result); expect(recordCompletion).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Play Classic or Hard' })); await tick();
    const beforeSquads = evidence.squadCalls.length; await choose('Hard'); expectError(); expect(evidence.indexCalls).toHaveLength(3);
    await retry(); expect(evidence.indexCalls, 'MLB_RETRY_GUARD_stale_wheel_boot').toHaveLength(4); expect(evidence.squadCalls).toHaveLength(beforeSquads);
    await spin(); expect(screen.getAllByText('Rating hidden until the sim ends')).toHaveLength(12);
    expect(evidence.indexCalls.every((row: any) => row.options.oldWheel === false)).toBe(true);
  });
  it('keeps an earlier pick through a failed next spin and finishes one complete 162-game season', async () => {
    renderPage(); await choose('Classic'); await spin(); await pick('C');
    expect(document.querySelector('aside')?.textContent).toContain('Retry Fixture C');
    evidence.squadMode = 'null'; const beforeCalls = evidence.squadCalls.length; await spin(); expectError();
    expect(evidence.squadCalls.length - beforeCalls).toBe(6); expect(evidence.simulations).toHaveLength(0); expect(recordCompletion).toHaveBeenCalledTimes(0);
    evidence.squadMode = 'ok'; await retry(); expect(evidence.indexCalls).toHaveLength(1);
    expect(document.querySelector('aside'), 'MLB_RETRY_GUARD_prior_pick_recovery').not.toBeNull();
    expect(document.querySelector('aside')?.textContent).toContain('Retry Fixture C'); expect(screen.getByText('10 slots to fill')).toBeTruthy();
    const result = await finish(['1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'SP', 'RP']); expect(evidence.simulations).toHaveLength(1);
    expect(recordCompletion).toHaveBeenCalledTimes(1); expect(recordCompletion).toHaveBeenCalledWith('/perfect-season-mlb', result.wins, 'Retry fixture guest');
    await tick(5000); expect(recordCompletion).toHaveBeenCalledTimes(1); expect(evidence.simulations).toHaveLength(1);
  });
  it('does not spend rerolls on repeated unusable or failed fetches and charges one usable recovery', async () => {
    renderPage(); await choose('Classic'); await spin(); await pick('C'); await spin(); await pick('DH'); await spin();
    evidence.squadMode = 'unusable'; const beforeCalls = evidence.squadCalls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Reroll (2 left)' })); await tick(); expectError();
    expect(evidence.squadCalls.length - beforeCalls).toBe(6);
    evidence.squadMode = 'null'; await retry(); expectError(); expect(evidence.squadCalls.length - beforeCalls, 'MLB_RETRY_GUARD_repeat_failure_requests').toBe(12);
    evidence.squadMode = 'ok'; await retry(); expect(evidence.squadCalls.length - beforeCalls, 'MLB_RETRY_GUARD_usable_recovery_request').toBe(13);
    expect(screen.queryByRole('button', { name: 'Reroll (1 left)' }), 'MLB_RETRY_GUARD_retry_reroll_debit').not.toBeNull();
    expect(document.querySelector('aside')?.textContent).toContain('Retry Fixture C'); expect(document.querySelector('aside')?.textContent).toContain('Retry Fixture DH');
    expect(screen.getByText('9 slots to fill')).toBeTruthy();
    expect(evidence.indexCalls).toHaveLength(1); expect(recordCompletion).toHaveBeenCalledTimes(0);
  });
  it('allows exactly two successful rerolls and refuses a third squad request', async () => {
    renderPage(); await choose('Classic'); await spin();
    fireEvent.click(screen.getByRole('button', { name: 'Reroll (2 left)' })); await tick();
    fireEvent.click(screen.getByRole('button', { name: 'Reroll (1 left)' })); await tick();
    const exhausted = screen.getByRole('button', { name: 'Reroll (0 left)' }) as HTMLButtonElement;
    expect(exhausted.disabled).toBe(true); const before = evidence.squadCalls.length; fireEvent.click(exhausted); await tick();
    expect(evidence.squadCalls).toHaveLength(before); expect(before).toBe(3); expect(recordCompletion).toHaveBeenCalledTimes(0);
  });
  it('keeps an ordinary healthy draft and restart unchanged with one completion per run', async () => {
    renderPage(); await choose('Classic'); const first = await finish(); expect(evidence.squadCalls).toHaveLength(11);
    expect(recordCompletion).toHaveBeenCalledTimes(1); fireEvent.click(screen.getByRole('button', { name: 'Run it back' })); await tick();
    expect(screen.getByText('11 slots to fill')).toBeTruthy(); expect(document.querySelector('aside')?.textContent).not.toContain('Retry Fixture C');
    await spin(); expect(screen.getByRole('button', { name: 'Reroll (2 left)' })).toBeTruthy();
    const second = await finish(); expect(second).toEqual(first); expect(evidence.simulations).toHaveLength(2);
    expect(recordCompletion).toHaveBeenCalledTimes(2); expect(evidence.squadCalls).toHaveLength(22);
  });
});
