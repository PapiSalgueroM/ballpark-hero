import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import Board from '@/components/front-office/FrontOfficeBoard';
import { loadNflCareerKit } from '@/components/front-office/nflCareerKitLoad';
import { generateDraftClass, initLeague, runPlayoffs, type Prospect } from '@/lib/frontOffice';
import { leagueNames } from '@/lib/foNames';
import { isFrontOfficeSave } from '@/lib/frontOfficeSave';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

const KEY = 'front-office-save-v1';
const seeded = (seed: number) => { let n = seed; return () => { n = (Math.imul(1664525, n) + 1013904223) >>> 0; return n / 4294967296; }; };
function fixture() {
  const league = initLeague(seeded(904)); league.cap = 10000; league.week = 17;
  for (const team of Object.values(league.teams)) team.players.forEach((p, i) => { p.name = 'Fictional focus roster ' + team.abbr + ' ' + i; });
  const postseason = runPlayoffs(league.teams, seeded(51));
  league.champions.push({ season: league.season, team: postseason.champion });
  const draftClass = generateDraftClass(seeded(22), 40, leagueNames(league)).map((p, i): Prospect => ({
    ...p, id: 'focus-prospect-' + String(i).padStart(2, '0'), name: 'Focus Prospect ' + String(i).padStart(2, '0'),
    pos: i < 18 ? 'RB' : 'QB', age: 22, grade: 90 - Math.floor(i / 2), trueOvr: 80,
  }));
  return { league, myTeam: 'SEA', phase: 'draft', titles: 2, seasonsPlayed: 5, draftClass, picksLeft: 3, draftBatchesLeft: 3, postseason };
}
const names = () => screen.queryAllByText(/^Focus Prospect \d\d$/, { selector: 'span' }).map(node => node.textContent);
const storage = () => Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)]));
function raw(name: string, value: Record<string, unknown>) {
  if (!process.env.FO_DRAFT_FOCUS_RAW) return;
  mkdirSync(process.env.FO_DRAFT_FOCUS_RAW, { recursive: true });
  writeFileSync(join(process.env.FO_DRAFT_FOCUS_RAW, name + '.json'), JSON.stringify({ case: name, ...value }, null, 2) + '\n');
}
function setup() {
  const frame = fixture();
  expect(isFrontOfficeSave(frame, 'NFL', 17)).toBe(true);
  const bytes = JSON.stringify(frame);
  localStorage.setItem(KEY, bytes); localStorage.setItem('focus-unrelated-save', 'held');
  const writes = vi.spyOn(Storage.prototype, 'setItem'); writes.mockClear();
  const focus = vi.spyOn(HTMLElement.prototype, 'focus');
  render(<Board />);
  fireEvent.change(screen.getByRole('combobox', { name: 'Prospect position' }), { target: { value: 'QB' } });
  fireEvent.click(screen.getByRole('button', { name: 'Next prospects' }));
  const page = screen.getByText('Page 2 of 2', { exact: true }).textContent;
  const shown = names(), target = frame.draftClass[38];
  expect(shown).toEqual(['Focus Prospect 36', 'Focus Prospect 37', 'Focus Prospect 38', 'Focus Prospect 39']);
  const opener = screen.getByText(target.name, { selector: 'span' }).closest('button')!;
  opener.focus();
  expect(document.activeElement).toBe(opener);
  focus.mockClear();
  return { bytes, writes, focus, opener, target, shown, page, stored: storage(), scroll: [window.scrollX, window.scrollY] };
}
function unchanged(before: ReturnType<typeof setup>) {
  expect(localStorage.getItem(KEY)).toBe(before.bytes);
  expect(storage()).toEqual(before.stored); expect(before.writes).not.toHaveBeenCalled();
  expect(vi.mocked(Math.random)).not.toHaveBeenCalled();
  expect([window.scrollX, window.scrollY]).toEqual(before.scroll);
}
beforeAll(async () => { await loadNflCareerKit(); });
beforeEach(() => { localStorage.clear(); vi.spyOn(Math, 'random').mockImplementation(seeded(29)); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('NFL draft review keyboard focus', () => {
  it('moves from the selected prospect into its review without changing the draft', () => {
    const before = setup();
    // The unit activates the initially focused real card. The compiled App journey owns native Enter and Tab.
    fireEvent.click(before.opener);
    const review = screen.getByRole('region', { name: 'Draft review' }), active = document.activeElement as HTMLElement;
    raw('entry', { activeInsideReview: review.contains(active), activeTag: active.tagName, saveHeld: localStorage.getItem(KEY) === before.bytes,
      writes: before.writes.mock.calls.length, draws: vi.mocked(Math.random).mock.calls.length, selected: before.target.name, pageBefore: before.page, shownBefore: before.shown,
      scrollHeld: window.scrollX === before.scroll[0] && window.scrollY === before.scroll[1] });
    expect(review.contains(active), 'FO_DRAFT_REVIEW_ENTRY_FOCUS').toBe(true);
    const call = before.focus.mock.contexts.lastIndexOf(active);
    expect(call).toBeGreaterThanOrEqual(0); expect(before.focus.mock.calls[call]?.[0]?.preventScroll).toBe(true);
    unchanged(before);
    fireEvent.click(within(review).getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('combobox', { name: 'Prospect position' })).toHaveValue('QB');
    expect(screen.getByText('Page 2 of 2', { exact: true }).textContent).toBe(before.page);
    expect(names()).toEqual(before.shown); unchanged(before);
  });

  it('returns Back to the exact filtered-page prospect without changing the draft', () => {
    const before = setup();
    fireEvent.click(before.opener);
    fireEvent.click(within(screen.getByRole('region', { name: 'Draft review' })).getByRole('button', { name: 'Back' }));
    const returned = screen.getByText(before.target.name, { selector: 'span' }).closest('button')!;
    raw('back', { activeOpenedProspect: document.activeElement === returned, activeTag: document.activeElement?.tagName,
      saveHeld: localStorage.getItem(KEY) === before.bytes, writes: before.writes.mock.calls.length, draws: vi.mocked(Math.random).mock.calls.length,
      selected: before.target.name, pageAfter: screen.getByText('Page 2 of 2', { exact: true }).textContent, shownAfter: names(),
      scrollHeld: window.scrollX === before.scroll[0] && window.scrollY === before.scroll[1] });
    expect(document.activeElement, 'FO_DRAFT_REVIEW_BACK_FOCUS').toBe(returned);
    const call = before.focus.mock.contexts.lastIndexOf(returned);
    expect(call).toBeGreaterThanOrEqual(0); expect(before.focus.mock.calls[call]?.[0]?.preventScroll).toBe(true);
    expect(returned).not.toBe(screen.getByText('Focus Prospect 36', { selector: 'span' }).closest('button'));
    expect(screen.queryByRole('region', { name: 'Draft review' })).toBeNull();
    expect(screen.getByRole('combobox', { name: 'Prospect position' })).toHaveValue('QB');
    expect(screen.getByText('Page 2 of 2', { exact: true }).textContent).toBe(before.page);
    expect(names()).toEqual(before.shown); unchanged(before);
  });
});
