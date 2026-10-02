/* Round 887: actual saved rotations and their simulated consequences, with fictional fixture players. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NbaFrontOfficeBoard from '@/components/nba-front-office/NbaFrontOfficeBoard';
import { NbaRotationPanel } from '@/components/nba-front-office/NbaRotationPanel';
import { initNbaLeague, nbaStrength, type NbaLeague } from '@/lib/nbaFrontOffice';
import { nbaBoxScore } from '@/lib/nbaSeasonStats';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));

const KEY = 'nba-front-office-save-v1';
const SENTINEL = 'nba-rotation-fixture-unrelated';
const ratings = [96, 92, 88, 84, 80, 76, 72, 68, 64, 60, 56, 52, 48, 44];
const ids = ratings.map((_, i) => `fictional-rotation-${i}`);
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const rng = (seed: number) => () => { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; };
function fixture(): { league: NbaLeague; team: string } {
  const league = initNbaLeague(rng(887));
  const team = Object.keys(league.teams)[0];
  league.teams[team].players = ratings.map((ovr, i) => ({
    id: ids[i], name: `Simulated rotation player ${i + 1}`, pos: i % 3 === 0 ? 'C' : i % 3 === 1 ? 'G' : 'F',
    age: 19 + i, ovr, salary: 3, years: 3, out: 0, pot: Math.max(ovr, 85),
  }));
  return { league, team };
}
function seed(league: NbaLeague, team: string) {
  localStorage.setItem(KEY, JSON.stringify({ league, myTeam: team, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0 }));
  localStorage.setItem(SENTINEL, 'unrelated exact payload');
}
const read = (): { league: NbaLeague; myTeam: string; phase: string } => JSON.parse(localStorage.getItem(KEY)!);
const panel = (): HTMLElement => document.querySelector('[data-nba-rotation]')!;
const choice = (slot: number): HTMLSelectElement => within(panel()).getByRole('combobox', { name: new RegExp(`^${slot < 5 ? `Starter ${slot + 1}` : `Bench ${slot - 4}`} `) });
const notice = () => within(panel()).getByRole('status');
function openBoard() {
  const view = render(<NbaFrontOfficeBoard />);
  fireEvent.click(screen.getByText('Roster'));
  fireEvent.click(screen.getByRole('button', { name: 'Set rotation' }));
  return view;
}
function exitToHub() {
  fireEvent.click(screen.getByRole('button', { name: 'Back to roster' }));
  fireEvent.click(screen.getByRole('button', { name: 'Hub' }));
}

describe('NBA rotation UI with real board persistence', () => {
  beforeEach(() => { localStorage.clear(); vi.spyOn(Math, 'random').mockImplementation(rng(991)); });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

  it('preserves an old automatic save and exact original strength as an independent baseline', () => {
    const { league, team } = fixture(); seed(league, team);
    const raw = localStorage.getItem(KEY);
    openBoard();
    expect(Array.from(panel().querySelectorAll('select'), select => select.value)).toEqual(ids.slice(0, 8));
    expect(nbaStrength(league.teams[team])).toBeCloseTo(83.52, 8);
    expect(panel().querySelector('[data-rotation-strength]')).toHaveTextContent('83.5');
    expect(notice()).toBeEmptyDOMElement();
    expect(screen.getByRole('button', { name: 'Use automatic' })).toBeDisabled();
    expect(localStorage.getItem(KEY)).toBe(raw);
    expect(localStorage.getItem(SENTINEL)).toBe('unrelated exact payload');
  });

  it('preserves exact callback indices and all contract values as an independent baseline', () => {
    const { league, team } = fixture(); const original = clone(league.teams[team]);
    const onPick = vi.fn(() => false), onAuto = vi.fn(() => false), onBack = vi.fn();
    render(<NbaRotationPanel team={league.teams[team]} onPick={onPick} onAuto={onAuto} onBack={onBack} />);
    fireEvent.change(choice(6), { target: { value: ids[10] } });
    expect(onPick.mock.calls).toEqual([[6, ids[10]]]);
    fireEvent.click(screen.getByRole('button', { name: 'Back to roster' }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(league.teams[team]).toEqual(original);
  });

  it('swaps a bench player into the starting five and saves the actual changed strength', () => {
    const { league, team } = fixture(); seed(league, team); openBoard();
    fireEvent.change(choice(0), { target: { value: ids[7] } });
    const saved = read().league.teams[team];
    expect(saved.rotation).toEqual([ids[7], ids[1], ids[2], ids[3], ids[4], ids[5], ids[6], ids[0]]);
    expect(choice(0)).toHaveValue(ids[7]); expect(choice(7)).toHaveValue(ids[0]);
    expect(nbaStrength(saved)).toBeCloseTo(82.1013333333, 8);
    expect(panel().querySelector('[data-rotation-strength]')).toHaveTextContent('82.1');
    expect(notice()).toHaveTextContent('Starter 1: Simulated rotation player 8. Rotation updated.');
    expect(saved.players).toEqual(league.teams[team].players);
    expect(localStorage.getItem(SENTINEL)).toBe('unrelated exact payload');
  });

  it('preserves two distinct selections without overwriting the first saved choice', () => {
    const { league, team } = fixture(); seed(league, team); openBoard();
    act(() => {
      fireEvent.change(choice(0), { target: { value: ids[7] } });
      fireEvent.change(choice(1), { target: { value: ids[6] } });
    });
    expect(read().league.teams[team].rotation).toEqual([ids[7], ids[6], ids[2], ids[3], ids[4], ids[5], ids[1], ids[0]]);
    expect(choice(0)).toHaveValue(ids[7]); expect(choice(1)).toHaveValue(ids[6]);
  });

  it('rejects the same selection without writing a save or claiming an earned update', () => {
    const { league, team } = fixture(); seed(league, team); openBoard(); const raw = localStorage.getItem(KEY);
    fireEvent.change(choice(0), { target: { value: ids[0] } });
    expect(localStorage.getItem(KEY)).toBe(raw); expect(notice()).toBeEmptyDOMElement();
  });

  it('rejects a foreign option without writing a save or claiming an earned update', () => {
    const { league, team } = fixture(); seed(league, team); openBoard(); const raw = localStorage.getItem(KEY);
    fireEvent.change(choice(0), { target: { value: 'fictional-other-team-player' } });
    expect(localStorage.getItem(KEY)).toBe(raw); expect(notice()).toBeEmptyDOMElement();
  });

  it('disables injured options and rejects a forced injured selection without changing the save', () => {
    const { league, team } = fixture(); league.teams[team].players[0].out = 2; seed(league, team); openBoard();
    expect(within(choice(0)).getByRole('option', { name: /Simulated rotation player 1 \(/ })).toBeDisabled();
    const raw = localStorage.getItem(KEY);
    fireEvent.change(choice(0), { target: { value: ids[0] } });
    expect(localStorage.getItem(KEY)).toBe(raw); expect(notice()).toBeEmptyDOMElement();
  });

  it('restores automatic selection by removing its saved preference and announces only that action', () => {
    const { league, team } = fixture(); seed(league, team); openBoard();
    fireEvent.change(choice(0), { target: { value: ids[7] } });
    fireEvent.click(screen.getByRole('button', { name: 'Use automatic' }));
    expect(read().league.teams[team]).not.toHaveProperty('rotation');
    expect(choice(0)).toHaveValue(ids[0]); expect(choice(7)).toHaveValue(ids[7]);
    expect(panel().querySelector('[data-rotation-strength]')).toHaveTextContent('83.5');
    expect(notice()).toHaveTextContent('Automatic rotation restored.');
    expect(screen.getByRole('button', { name: 'Use automatic' })).toBeDisabled();
  });

  it('reloads saved manual choices quietly with identical persisted bytes', () => {
    const { league, team } = fixture(); seed(league, team); const first = openBoard();
    fireEvent.change(choice(0), { target: { value: ids[7] } });
    const raw = localStorage.getItem(KEY); first.unmount(); openBoard();
    expect(choice(0)).toHaveValue(ids[7]); expect(choice(7)).toHaveValue(ids[0]);
    expect(notice()).toBeEmptyDOMElement(); expect(localStorage.getItem(KEY)).toBe(raw);
  });

  it('keeps passive manual prop changes quiet without an accepted local action', () => {
    const { league, team } = fixture(); const original = league.teams[team];
    const callbacks = { onPick: vi.fn(() => false), onAuto: vi.fn(() => false), onBack: vi.fn() };
    const view = render(<NbaRotationPanel team={original} {...callbacks} />);
    const changed = clone(original); changed.rotation = [ids[7], ...ids.slice(1, 7), ids[0]];
    view.rerender(<NbaRotationPanel team={changed} {...callbacks} />);
    expect(choice(0)).toHaveValue(ids[7]); expect(notice()).toBeEmptyDOMElement();
    expect(callbacks.onPick).not.toHaveBeenCalled(); expect(callbacks.onAuto).not.toHaveBeenCalled();
  });

  it('keeps an injured preferred slot visible with its actual healthy cover', () => {
    const { league, team } = fixture(); const mine = league.teams[team];
    mine.rotation = ids.slice(0, 8); mine.players[0].out = 2; seed(league, team); openBoard();
    expect(choice(0)).toHaveValue(ids[0]);
    expect(within(choice(0)).getByRole('option', { selected: true })).toHaveTextContent('out 2r');
    expect(panel().querySelector('[data-rotation-cover]')).toHaveTextContent('Cover: Simulated rotation player 9. Simulated rotation player 1 keeps this slot when healthy.');
    expect(read().league.teams[team].rotation).toEqual(ids.slice(0, 8)); expect(notice()).toBeEmptyDOMElement();
  });

  it('keeps thin roster bench roles and minutes in place when an injured starter has no cover', () => {
    const { league, team } = fixture(); const mine = league.teams[team];
    mine.players = mine.players.slice(0, 8); mine.rotation = ids.slice(0, 8); mine.players[0].out = 2;
    seed(league, team); openBoard();
    expect(choice(0)).toHaveValue(ids[0]);
    expect(panel().querySelector('[data-rotation-cover]')).toHaveTextContent('No healthy cover available. Simulated rotation player 1 keeps this slot when healthy.');
    expect(choice(5)).toHaveValue(ids[5]); expect(choice(6)).toHaveValue(ids[6]); expect(choice(7)).toHaveValue(ids[7]);
    expect(within(panel()).getByText('Bench 1').parentElement).toHaveTextContent('28 sim minutes');
    expect(within(panel()).getByText('Bench 2').parentElement).toHaveTextContent('26 sim minutes');
    expect(within(panel()).getByText('Bench 3').parentElement).toHaveTextContent('21 sim minutes');
    const other = Object.values(league.teams).find(t => t.abbr !== team)!;
    const box = nbaBoxScore(mine, other, true, 0.1, 0.7, 1, league.season);
    expect(box.home.men.map(p => p.id)).toEqual(ids.slice(1, 8));
    expect(box.home.men.filter(p => p.starter).map(p => p.id)).toEqual(ids.slice(1, 5));
    expect(box.home.men.filter(p => !p.starter).map(p => p.id)).toEqual(ids.slice(5, 8));
    expect(box.home.men.reduce((points, p) => points + p.pts, 0)).toBe(box.home.pts);
  });

  it('gives a chosen bench prospect real simulated games and points while automatic leaves him outside the eight', () => {
    const { league, team } = fixture(); seed(league, team); const baseline = openBoard(); exitToHub();
    fireEvent.click(screen.getByText('Play')); fireEvent.click(screen.getByRole('button', { name: 'Play Round 1' }));
    const automatic = read(); const key = `${team}|${ids[13]}`;
    expect(automatic.league.stats!.lines[key]).toBeUndefined();
    const games = automatic.league.teams[team].wins + automatic.league.teams[team].losses;
    expect(games).toBe(4);
    baseline.unmount(); vi.mocked(Math.random).mockImplementation(rng(991)); seed(league, team); openBoard();
    fireEvent.change(choice(7), { target: { value: ids[13] } }); exitToHub();
    fireEvent.click(screen.getByText('Play')); fireEvent.click(screen.getByRole('button', { name: 'Play Round 1' }));
    const chosen = read(); const line = chosen.league.stats!.lines[key];
    expect(line.g).toBe(games); expect(line.gs).toBe(0); expect(line.tot.pts).toBeGreaterThan(0);
    expect(chosen.league.teams[team].rotation![7]).toBe(ids[13]);
    expect(chosen.league.teams[team].wins + chosen.league.teams[team].losses).toBe(games);
    expect(chosen.league.teams[team].players.find(p => p.id === ids[13])!.salary).toBe(3);
  });

  it('moves opening and return focus to the exact controls with preventScroll', () => {
    const { league, team } = fixture(); seed(league, team);
    const focus = vi.spyOn(HTMLElement.prototype, 'focus'); render(<NbaFrontOfficeBoard />);
    fireEvent.click(screen.getByText('Roster')); const opener = screen.getByRole('button', { name: 'Set rotation' });
    opener.focus(); fireEvent.click(opener);
    const back = screen.getByRole('button', { name: 'Back to roster' });
    expect(document.activeElement).toBe(back);
    expect(focus.mock.calls.some((args, i) => (focus.mock.contexts as unknown[])[i] === back && args[0]?.preventScroll === true)).toBe(true);
    fireEvent.click(back); const returned = screen.getByRole('button', { name: 'Set rotation' });
    expect(document.activeElement).toBe(returned);
    expect(focus.mock.calls.some((args, i) => (focus.mock.contexts as unknown[])[i] === returned && args[0]?.preventScroll === true)).toBe(true);
  });

  it('shows earned update feedback once with finite motion reduced motion and native sized controls', () => {
    const { league, team } = fixture(); seed(league, team); openBoard();
    const before = notice(); expect(before).toBeEmptyDOMElement();
    fireEvent.change(choice(0), { target: { value: ids[7] } });
    expect(notice().querySelector('.nba-rotation-change')).toHaveTextContent('Rotation updated.');
    expect(notice()).toHaveAttribute('aria-atomic', 'true');
    for (const control of panel().querySelectorAll('select,button')) expect(control.className).toContain('min-h-[44px]');
    const source = readFileSync(process.env.NBA_ROTATION_UI_PANEL_SOURCE || resolve('src/components/nba-front-office/NbaRotationPanel.tsx'), 'utf8').replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    expect(source).toMatch(/\.nba-rotation-change\s*\{\s*animation:\s*nba-rotation-change\s+400ms\s+ease-out\s+1;\s*\}/);
    expect(source).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{\s*\.nba-rotation-change\s*\{\s*animation:\s*none;\s*\}\s*\}/);
    fireEvent.click(screen.getByRole('button', { name: 'Back to roster' }));
    fireEvent.click(screen.getByRole('button', { name: 'Set rotation' }));
    expect(notice()).toBeEmptyDOMElement();
  });
});
