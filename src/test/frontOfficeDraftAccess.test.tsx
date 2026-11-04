import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import Board from '@/components/front-office/FrontOfficeBoard';
import { loadNflCareerKit } from '@/components/front-office/nflCareerKitLoad';
import { draftOrder, generateDraftClass, initLeague, runPlayoffs, type LeagueState, type Prospect } from '@/lib/frontOffice';
import { leagueNames } from '@/lib/foNames';
import { isFrontOfficeSave } from '@/lib/frontOfficeSave';
import { openNflDesk, nflScoutRead, nflStaffOf } from '@/lib/nflGmDesk';
import { gmStaffLevel } from '@/lib/gmStaff';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

const KEY = 'front-office-save-v1';
const seeded = (seed: number) => { let n = seed; return () => { n = (Math.imul(1664525, n) + 1013904223) >>> 0; return n / 4294967296; }; };
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
function fixture(scouted = false) {
  const lg = initLeague(seeded(904));
  lg.cap = 10000;
  for (const team of Object.values(lg.teams)) team.players.forEach((p, i) => { p.name = 'Fictional roster ' + team.abbr + ' ' + i; });
  lg.week = 17;
  const postseason = runPlayoffs(lg.teams, seeded(51));
  lg.champions.push({ season: lg.season, team: postseason.champion });
  // Explicitly fictional saved prospects. The real constructor supplies the complete shape.
  const draftClass = generateDraftClass(seeded(22), 40, leagueNames(lg)).map((p, i): Prospect => ({
    ...p, id: 'fixture-prospect-' + String(i).padStart(2, '0'),
    name: 'Draft Prospect ' + String(i).padStart(2, '0'), pos: i < 18 ? 'RB' : 'QB',
    age: 22, grade: 90 - Math.floor(i / 2), trueOvr: scouted ? 66 + i % 20 : 80,
  }));
  return { league: lg, myTeam: 'SEA', phase: 'draft', titles: 2, seasonsPlayed: 5, draftClass, picksLeft: 3, draftBatchesLeft: 3, postseason, ...(scouted ? { gm: openNflDesk(lg, 'SEA') } : {}) };
}
type Frame = ReturnType<typeof fixture>;
const read = (): Frame => JSON.parse(localStorage.getItem(KEY)!);
function mount(value: Frame) {
  expect(isFrontOfficeSave(value, 'NFL', 17)).toBe(true);
  const bytes = JSON.stringify(value);
  localStorage.setItem(KEY, bytes);
  localStorage.setItem('draft-access-sentinel', 'keep this unrelated save');
  const writes = vi.spyOn(Storage.prototype, 'setItem');
  writes.mockClear();
  const view = render(<Board />);
  return { bytes, writes, view };
}
function rows() {
  return screen.queryAllByText(/^Draft Prospect \d\d$/, { selector: 'span' })
    .map(node => ({ name: node.textContent!, button: node.closest('button') }))
    .filter((row): row is { name: string; button: HTMLButtonElement } => row.button !== null)
    .map(row => ({ name: row.name, grade: Number(row.button.lastElementChild?.textContent), button: row.button }));
}
const names = () => rows().map(row => row.name);
const expected = (from: number, to: number) => Array.from({ length: to - from }, (_, n) => 'Draft Prospect ' + String(from + n).padStart(2, '0'));
function changePosition(value: string) {
  const field = screen.queryByRole('combobox', { name: 'Prospect position' });
  if (field) fireEvent.change(field, { target: { value } });
  return !!field;
}
function next() {
  const button = screen.queryByRole('button', { name: 'Next prospects' });
  if (button) fireEvent.click(button);
  return !!button;
}
function raw(name: string, value: unknown) {
  if (!process.env.FO_DRAFT_PROSPECT_RAW) return;
  mkdirSync(process.env.FO_DRAFT_PROSPECT_RAW, { recursive: true });
  writeFileSync(join(process.env.FO_DRAFT_PROSPECT_RAW, name + '.json'), JSON.stringify(value, null, 2) + '\n');
}
function quiet(bytes: string, writes: ReturnType<typeof vi.spyOn>) {
  expect(localStorage.getItem(KEY)).toBe(bytes);
  expect(writes).not.toHaveBeenCalled();
  expect(vi.mocked(Math.random)).not.toHaveBeenCalled();
  expect(localStorage.getItem('draft-access-sentinel')).toBe('keep this unrelated save');
}
beforeAll(async () => { await loadNflCareerKit(); });
beforeEach(() => { localStorage.clear(); vi.spyOn(Math, 'random').mockImplementation(seeded(29)); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('NFL draft prospect access', () => {
  it('reaches all forty prospects through eighteen-row pages without changing the draft', () => {
    const source = fixture(), sourceCopy = clone(source), { bytes, writes } = mount(source);
    const first = names();
    expect(first).toEqual(expected(0, 18));
    const hasNext = next(), actual = names();
    raw('pages', { first, afterNext: actual, hasNext, saveHeld: localStorage.getItem(KEY) === bytes, draws: vi.mocked(Math.random).mock.calls.length });
    quiet(bytes, writes);
    expect(actual, 'FO_DRAFT_PROSPECT_ALL_PAGES').toEqual(expected(18, 36));
    expect(screen.getByRole('button', { name: 'Previous prospects' })).toBeEnabled();
    next();
    const last = names();
    expect(last).toEqual(expected(36, 40));
    expect(screen.getByRole('button', { name: 'Next prospects' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Previous prospects' }));
    expect(names()).toEqual(expected(18, 36));
    fireEvent.click(screen.getByRole('button', { name: 'Previous prospects' }));
    expect(names()).toEqual(expected(0, 18));
    expect(screen.getByRole('button', { name: 'Previous prospects' })).toBeDisabled();
    expect(new Set([...first, ...actual, ...last]).size).toBe(40);
    quiet(bytes, writes);
    expect(source).toEqual(sourceCopy);
  });

  it('drafts a filtered prospect beyond the first page and preserves exact rival picks and draws', () => {
    const source = fixture(), sourceCopy = clone(source), { bytes, writes } = mount(source);
    const hasFilter = changePosition('QB'), actual = names();
    raw('filtered-pick', { hasFilter, afterFilter: actual, target: 'Draft Prospect 38', saveHeld: localStorage.getItem(KEY) === bytes, draws: vi.mocked(Math.random).mock.calls.length });
    quiet(bytes, writes);
    expect(actual, 'FO_DRAFT_PROSPECT_POSITION_ACCESS').toEqual(expected(18, 36));
    next();
    expect(names()).toEqual(expected(36, 40));
    const target = source.draftClass[38], before = read();
    fireEvent.click(screen.getByText(target.name, { selector: 'span' }).closest('button')!);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm draft' }));
    const after = read();
    expect(after.picksLeft).toBe(2);
    expect(after.draftBatchesLeft).toBe(2);
    expect(after.league.teams.SEA.picks).toEqual([2, 3]);
    const arrived = after.league.teams.SEA.players[after.league.teams.SEA.players.length - 1];
    expect(arrived).toEqual({ id: arrived.id, name: 'Draft Prospect 38', pos: 'QB', age: 22, ovr: 80, salary: 7, years: 4, out: 0, pot: 84, rookieSeason: source.league.season + 1 });
    const rivals = draftOrder(before.league.teams).filter(team => team !== 'SEA' && before.league.teams[team].picks.length > 0).slice(0, 6);
    const wantedLeague: LeagueState = clone(before.league);
    wantedLeague.teams.SEA.picks.shift();
    wantedLeague.teams.SEA.players.push(arrived);
    const oldIds = new Set(Object.values(before.league.teams).flatMap(team => team.players.map(p => p.id)));
    const newIds = [arrived.id];
    const pots = [90, 88, 88, 88, 85, 89];
    for (let i = 0; i < rivals.length; i++) {
      const team = rivals[i], player = after.league.teams[team].players[after.league.teams[team].players.length - 1];
      const prospect = source.draftClass[i];
      expect(player).toEqual({ id: player.id, name: prospect.name, pos: 'RB', age: 22, ovr: 80, salary: 7, years: 4, out: 0, pot: pots[i], rookieSeason: source.league.season + 1 });
      wantedLeague.teams[team].picks.shift();
      wantedLeague.teams[team].players.push(player);
      newIds.push(player.id);
    }
    expect(newIds).toHaveLength(7);
    expect(new Set(newIds).size).toBe(7);
    expect(newIds.every(id => !oldIds.has(id))).toBe(true);
    expect(after.league).toEqual(wantedLeague);
    expect(after.draftClass).toEqual(source.draftClass.filter(p => p.id !== target.id).slice(6));
    expect(writes.mock.calls.filter(([key]) => key === KEY)).toHaveLength(1);
    expect(vi.mocked(Math.random)).toHaveBeenCalledTimes(7);
    expect(Math.random()).toBe(0.20847150054760277);
    expect(screen.getByRole('combobox', { name: 'Prospect position' })).toHaveValue('all');
    expect(names()).toEqual(after.draftClass.slice(0, 18).map(p => p.name));
    expect(source).toEqual(sourceCopy);
    expect(localStorage.getItem('draft-access-sentinel')).toBe('keep this unrelated save');
    // The actual phase transition must not leave draft controls on the hub.
    for (let n = 0; n < 2; n++) { fireEvent.click(rows()[0].button); fireEvent.click(screen.getByRole('button', { name: 'Confirm draft' })); }
    expect(read().phase).toBe('hub');
    expect(screen.queryByRole('combobox', { name: 'Prospect position' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Continue to the hub' }));
    expect(screen.queryByRole('combobox', { name: 'Prospect position' })).toBeNull();
  });

  it('resets a later page when the position changes and keeps empty groups safe', () => {
    const source = fixture(), { bytes, writes } = mount(source);
    changePosition('QB');
    next();
    changePosition('TE');
    const actual = names();
    raw('empty-and-reset', { afterEmptyPosition: actual, saveHeld: localStorage.getItem(KEY) === bytes, draws: vi.mocked(Math.random).mock.calls.length });
    quiet(bytes, writes);
    expect(actual, 'FO_DRAFT_PROSPECT_EMPTY_POSITION').toEqual([]);
    expect(screen.getByRole('button', { name: 'Next prospects' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Previous prospects' })).toBeDisabled();
    changePosition('QB');
    expect(names()).toEqual(expected(18, 36));
    next();
    expect(names()).toEqual(expected(36, 40));
    changePosition('RB');
    expect(names()).toEqual(expected(0, 18));
    changePosition('all');
    expect(names()).toEqual(expected(0, 18));
    quiet(bytes, writes);
  });

  it('holds the scouting directors grades and order without exposing true ratings', () => {
    const source = fixture(true), { bytes, writes } = mount(source);
    const level = gmStaffLevel(nflStaffOf(source.gm!, source.league, source.myTeam).block, 'scouting');
    const grades = source.draftClass.map(p => ({ name: p.name, grade: nflScoutRead(p, source.myTeam, source.league.season, level), id: p.id }));
    grades.sort((a, b) => b.grade - a.grade || a.id.localeCompare(b.id));
    const actual = rows().map(({ name, grade }) => ({ name, grade }));
    raw('scout-held', { count: actual.length, gradesHeld: JSON.stringify(actual) === JSON.stringify(grades.slice(0, 18).map(({ name, grade }) => ({ name, grade }))), saveHeld: localStorage.getItem(KEY) === bytes, draws: vi.mocked(Math.random).mock.calls.length });
    expect(actual).toEqual(grades.slice(0, 18).map(({ name, grade }) => ({ name, grade })));
    expect(actual.map(p => p.name)).not.toEqual(expected(0, 18));
    quiet(bytes, writes);
  });
});
