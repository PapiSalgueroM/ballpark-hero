import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
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
  const draftClass = generateDraftClass(seeded(22), 40, leagueNames(lg)).map((p, i): Prospect => ({
    ...p, id: 'fixture-prospect-' + String(i).padStart(2, '0'),
    name: 'Draft Prospect ' + String(i).padStart(2, '0'), pos: i < 18 ? 'RB' : 'QB',
    age: 22, grade: 90 - Math.floor(i / 2), trueOvr: scouted && i === 38 ? 99 : 80,
  }));
  return { league: lg, myTeam: 'SEA', phase: 'draft', titles: 2, seasonsPlayed: 5, draftClass, picksLeft: 3, draftBatchesLeft: 3, postseason, ...(scouted ? { gm: openNflDesk(lg, 'SEA') } : {}) };
}
type Frame = ReturnType<typeof fixture>;
const read = (): Frame => JSON.parse(localStorage.getItem(KEY)!);
function mount(value: Frame) {
  expect(isFrontOfficeSave(value, 'NFL', 17)).toBe(true);
  const bytes = JSON.stringify(value);
  localStorage.setItem(KEY, bytes); localStorage.setItem('draft-review-sentinel', 'held');
  const writes = vi.spyOn(Storage.prototype, 'setItem'); writes.mockClear();
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
function raw(name: string, value: Record<string, unknown>) {
  if (!process.env.FO_DRAFT_REVIEW_RAW) return;
  mkdirSync(process.env.FO_DRAFT_REVIEW_RAW, { recursive: true });
  writeFileSync(join(process.env.FO_DRAFT_REVIEW_RAW, name + '.json'), JSON.stringify({ case: name, ...value }, null, 2) + '\n');
}
function quiet(bytes: string, writes: ReturnType<typeof vi.spyOn>) {
  expect(localStorage.getItem(KEY)).toBe(bytes);
  expect(writes).not.toHaveBeenCalled(); expect(vi.mocked(Math.random)).not.toHaveBeenCalled();
  expect(localStorage.getItem('draft-review-sentinel')).toBe('held');
}
beforeAll(async () => { await loadNflCareerKit(); });
beforeEach(() => { localStorage.clear(); vi.spyOn(Math, 'random').mockImplementation(seeded(29)); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('NFL draft prospect review', () => {
  it('opens a review and returns to the same page without spending picks or draws', () => {
    const source = fixture(true), sourceCopy = clone(source), { bytes, writes } = mount(source);
    fireEvent.change(screen.getByRole('combobox', { name: 'Prospect position' }), { target: { value: 'QB' } });
    const target = source.draftClass[38], own = source.league.teams.SEA.players.filter(p => p.pos === target.pos);
    for (let page = 0; page < 2 && !names().includes(target.name); page++) fireEvent.click(screen.getByRole('button', { name: 'Next prospects' }));
    expect(names()).toContain(target.name);
    const shown = names();
    expect(own.length).toBeGreaterThan(0);
    const level = gmStaffLevel(nflStaffOf(source.gm!, source.league, 'SEA').block, 'scouting');
    const grade = nflScoutRead(target, 'SEA', source.league.season, level);
    expect(grade).toBeLessThan(99);
    fireEvent.click(screen.getByText(target.name, { selector: 'span' }).closest('button')!);
    raw('review-back', { saveHeld: localStorage.getItem(KEY) === bytes, writes: writes.mock.calls.length, draws: vi.mocked(Math.random).mock.calls.length, picks: read().picksLeft, target: target.name, scoutGrade: grade, shown });
    expect(localStorage.getItem(KEY), 'FO_DRAFT_REVIEW_NO_COMMIT').toBe(bytes);
    quiet(bytes, writes);
    const review = screen.getByRole('region', { name: 'Draft review' });
    expect(within(review).getByText(target.name, { exact: true })).toBeInTheDocument();
    expect(within(review).getByText('Scouted grade ' + grade, { exact: true })).toBeInTheDocument();
    expect(within(review).getByText('QB · age 22', { exact: true })).toBeInTheDocument();
    const roster = Array.from(review.querySelectorAll<HTMLElement>('[data-draft-current-player]'));
    expect(roster.map(node => node.dataset.draftCurrentPlayer)).toEqual(own.map(p => p.id));
    for (const [i, player] of own.entries()) {
      expect(roster[i]).toHaveTextContent(player.name);
      expect(roster[i]).toHaveTextContent('OVR ' + player.ovr);
      expect(roster[i]).toHaveTextContent('age ' + player.age);
      expect(roster[i]).toHaveTextContent(player.years + ' year' + (player.years === 1 ? '' : 's'));
    }
    expect(review).not.toHaveTextContent(/true rating|potential/i);
    expect(within(review).queryByText('99', { exact: true })).toBeNull();
    fireEvent.click(within(review).getByRole('button', { name: 'Back' }));
    expect(screen.queryByRole('region', { name: 'Draft review' })).toBeNull();
    expect(screen.getByRole('combobox', { name: 'Prospect position' })).toHaveValue('QB');
    expect(names()).toEqual(shown); quiet(bytes, writes); expect(source).toEqual(sourceCopy);
  });

  it('confirms one prospect through the unchanged pick and rival sequence', () => {
    const source = fixture(), sourceCopy = clone(source), { bytes, writes } = mount(source);
    fireEvent.change(screen.getByRole('combobox', { name: 'Prospect position' }), { target: { value: 'QB' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next prospects' }));
    const target = source.draftClass[38], before = read();
    fireEvent.click(screen.getByText(target.name, { selector: 'span' }).closest('button')!);
    raw('confirm', { saveHeld: localStorage.getItem(KEY) === bytes, writes: writes.mock.calls.length, draws: vi.mocked(Math.random).mock.calls.length, picks: read().picksLeft, target: target.name });
    expect(localStorage.getItem(KEY), 'FO_DRAFT_CONFIRM_REQUIRED').toBe(bytes);
    quiet(bytes, writes);
    const confirm = within(screen.getByRole('region', { name: 'Draft review' })).getByRole('button', { name: 'Confirm draft' });
    act(() => { fireEvent.click(confirm); fireEvent.click(confirm); });
    const after = read(), arrived = after.league.teams.SEA.players.at(-1)!;
    expect(arrived).toEqual({ id: arrived.id, name: target.name, pos: 'QB', age: 22, ovr: 80, salary: 7, years: 4, out: 0, pot: 84, rookieSeason: source.league.season + 1 });
    const rivals = draftOrder(before.league.teams).filter(team => team !== 'SEA' && before.league.teams[team].picks.length > 0).slice(0, 6);
    const wanted: LeagueState = clone(before.league), oldIds = new Set(Object.values(before.league.teams).flatMap(team => team.players.map(p => p.id))), ids = [arrived.id];
    wanted.teams.SEA.picks.shift(); wanted.teams.SEA.players.push(arrived);
    const pots = [90, 88, 88, 88, 85, 89];
    for (let i = 0; i < rivals.length; i++) {
      const team = rivals[i], player = after.league.teams[team].players.at(-1)!;
      expect(player).toEqual({ id: player.id, name: source.draftClass[i].name, pos: 'RB', age: 22, ovr: 80, salary: 7, years: 4, out: 0, pot: pots[i], rookieSeason: source.league.season + 1 });
      wanted.teams[team].picks.shift(); wanted.teams[team].players.push(player); ids.push(player.id);
    }
    expect(ids).toHaveLength(7); expect(new Set(ids).size).toBe(7); expect(ids.every(id => !oldIds.has(id))).toBe(true);
    expect(after.league).toEqual(wanted); expect(after.picksLeft).toBe(2); expect(after.draftBatchesLeft).toBe(2);
    expect(after.draftClass).toEqual(source.draftClass.filter(p => p.id !== target.id).slice(6));
    expect(writes.mock.calls.filter(([key]) => key === KEY)).toHaveLength(1);
    expect(vi.mocked(Math.random)).toHaveBeenCalledTimes(7); expect(Math.random()).toBe(0.20847150054760277);
    expect(screen.queryByRole('region', { name: 'Draft review' })).toBeNull();
    expect(source).toEqual(sourceCopy); expect(localStorage.getItem('draft-review-sentinel')).toBe('held');
  });

  it('keeps scouting grades and hides true ratings before selection', () => {
    const source = fixture(true), { bytes, writes } = mount(source);
    const level = gmStaffLevel(nflStaffOf(source.gm!, source.league, 'SEA').block, 'scouting');
    const expected = source.draftClass.map(p => ({ name: p.name, grade: nflScoutRead(p, 'SEA', source.league.season, level) }))
      .sort((a, b) => b.grade - a.grade || a.name.localeCompare(b.name)).slice(0, 18);
    const actual = rows().map(({ name, grade }) => ({ name, grade }));
    raw('scout-held', { actual, saveHeld: localStorage.getItem(KEY) === bytes, writes: writes.mock.calls.length, draws: vi.mocked(Math.random).mock.calls.length });
    expect(actual).toEqual(expected); quiet(bytes, writes);
    expect(screen.queryByRole('region', { name: 'Draft review' })).toBeNull();
    for (const row of rows()) {
      const target = source.draftClass.find(p => p.name === row.name)!;
      expect(row.button.textContent).toBe(target.name + target.pos + ' · age ' + target.age + row.grade);
    }
  });
});
