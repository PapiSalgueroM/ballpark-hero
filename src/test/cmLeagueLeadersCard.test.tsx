/**
 * Round 1311: Club Manager's league leaders card, rendered for real on saves the engine wrote.
 *
 * The saves are the two committed recordings scripts/simCmLeagueBook.mjs carries (twelve entries into a
 * season, written by the engine of Release AW): Everton's Premier League, where every rival club has a
 * named eleven, and Hertha BSC's 2. Bundesliga, where most of the league's goals were unnamed when it was
 * written. Every number the card prints is held against the reader (leaders, bestOfMine, the share) and
 * the worked example against dealShares over the engine's own rule object; no string may hold a dash of
 * either banned kind.
 */
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { EXAMPLE_ELEVEN, LeagueLeadersCard, ordinal, type LeadersBoard } from '@/components/club-manager/LeagueLeadersCard';
import { StatsScreen } from '@/components/club-manager/StatsScreen';
import ClubManagerSeasonSummary from '@/components/club-manager/ClubManagerSeasonSummary';
import { finishSeason, leagueBoardsOf, leagueBookRules, playNextEntry, type CareerState } from '@/lib/clubManager';
import { AWARD_FLOOR, BOOK_FULL_SHARE, bestOfMine, leaders, type BoardKind } from '@/lib/clubManagerLeagueBoards';
import { dealShares } from '@/lib/clubManagerLeagueBook';

afterEach(cleanup);

const DASHES = [String.fromCharCode(0x2013), String.fromCharCode(0x2014)];
const saveOf = (file: string): CareerState => JSON.parse(readFileSync(path.resolve(process.cwd(), 'scripts/data', file), 'utf8')) as CareerState;
const everton = () => saveOf('cmBookSaveEvertonFixture.json');
const hertha = () => saveOf('cmBookSaveHerthaFixture.json');
const seeded = (seed: number) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const noDash = (el: Element) => { for (const d of DASHES) expect(el.textContent ?? '').not.toContain(d); };
const KINDS: BoardKind[] = ['goals', 'assists', 'sheets'];

function draw(career: CareerState, board: LeadersBoard | null = null) {
  const onBoard = vi.fn();
  const view = render(<LeagueLeadersCard career={career} board={board} onBoard={onBoard} />);
  const q = (sel: string) => view.container.querySelector(sel);
  const qa = (sel: string) => [...view.container.querySelectorAll(sel)];
  return { ...view, onBoard, q, qa };
}

describe('the league leaders card', () => {
  it('A: says when there is no book, in the two wordings', () => {
    const s = everton();
    delete s.leagueBook;
    const a = draw(s);
    expect(a.q('[data-cm-leaders-empty="nobook"]')?.textContent).toContain('It starts with your next league match');
    noDash(a.container);
    cleanup();
    s.week = s.calendar.length;
    const b = draw(s);
    expect(b.q('[data-cm-leaders-empty="nobook"]')?.textContent).toContain('A new book opens next season');
    expect(b.q('[data-cm-leaders-tile]')).toBeNull();
  });

  it('C: three tiles, each the first of its board, a whole league with no thin line', () => {
    const s = everton();
    const lb = leagueBoardsOf(s)!;
    expect(lb).not.toBeNull();
    expect(lb.share).toBeGreaterThanOrEqual(BOOK_FULL_SHARE);
    const c = draw(s);
    for (const kind of KINDS) {
      const tile = c.q(`[data-cm-leaders-tile="${kind}"]`)!;
      const top = leaders(lb.input, kind)[0];
      expect(tile.textContent).toContain(top.name);
      expect(tile.textContent).toContain(String(top.n));
      fireEvent.click(tile);
      expect(c.onBoard).toHaveBeenLastCalledWith(kind);
    }
    expect(c.q('[data-cm-leaders-thin]')).toBeNull();
    expect(c.q('[data-cm-leaders-late]')).toBeNull();
    noDash(c.container);
  });

  it('D: a board is the reader top ten, my men marked, made up men tagged, my best named when out of it', () => {
    const s = everton();
    /* One of mine is made up for this check: the tag follows the save's own flag. */
    const lb0 = leagueBoardsOf(s)!;
    const myScorer = leaders(lb0.input, 'goals', 1000).find(m => m.mine);
    if (myScorer) for (const p of s.squad) if (p.name === myScorer.name) p.generated = true;
    const lb = leagueBoardsOf(s)!;
    for (const kind of KINDS) {
      const d = draw(s, kind);
      const want = leaders(lb.input, kind);
      const rows = d.qa('[data-cm-board-row]');
      expect(rows.map(r => r.querySelector('[data-cm-board-name]')?.textContent)).toEqual(want.map(m => m.name));
      expect(rows.map(r => r.querySelector('[data-cm-board-club]')?.textContent)).toEqual(want.map(m => m.club));
      expect(rows.map(r => r.querySelector('[data-cm-board-n]')?.textContent)).toEqual(want.map(m => String(m.n)));
      expect(rows.map(r => r.hasAttribute('data-mine'))).toEqual(want.map(m => m.mine === true));
      expect(rows.map(r => (r.textContent ?? '').includes('MADE UP'))).toEqual(want.map(m => m.gen === true));
      const best = want.some(m => m.mine) ? null : bestOfMine(lb.input, kind);
      const line = d.q('[data-cm-leaders-best]');
      if (best) expect(line?.textContent).toBe(`Your best: ${ordinal(best.place)}, ${best.man.name}, ${best.man.n}`);
      else expect(line).toBeNull();
      fireEvent.click(d.q('[data-cm-leaders-back]')!);
      expect(d.onBoard).toHaveBeenLastCalledWith(null);
      noDash(d.container);
      cleanup();
    }
    if (myScorer) expect(leaders(lb.input, 'goals', 1000).find(m => m.mine && m.name === myScorer.name)?.gen).toBe(true);
  });

  it('a thin league carries the honest line with the save\'s own number', () => {
    const s = hertha();
    const lb = leagueBoardsOf(s)!;
    expect(lb.share).toBeLessThan(BOOK_FULL_SHARE);
    const c = draw(s);
    expect(c.q('[data-cm-leaders-thin]')?.textContent).toBe(`The data covers only part of this league: ${lb.share} in 100 of the other clubs' goals have a name on them. The rest count for the club and nobody else.`);
    cleanup();
    const sheets = draw(s, 'sheets');
    if (lb.keepers.have < lb.keepers.of) expect(sheets.q('[data-cm-leaders-keepers]')?.textContent).toBe(`Keepers of ${lb.keepers.have} of the ${lb.keepers.of} other clubs are on record.`);
    noDash(sheets.container);
  });

  it('a late book in a whole league counts from its round and draws no thin line', () => {
    const s = everton();
    delete s.leagueBook;
    vi.spyOn(Math, 'random').mockImplementation(seeded(13110));
    let next = s;
    for (let k = 0; k < 4 && (leagueBoardsOf(next)?.from ?? null) === null; k += 1) next = playNextEntry(next, { skipHalftime: true }).state;
    vi.restoreAllMocks();
    const lb = leagueBoardsOf(next)!;
    expect(lb.from).not.toBeNull();
    const c = draw(next);
    expect(c.q('[data-cm-leaders-late]')?.textContent).toBe(`Counting from round ${lb.from! + 1}. Everything before that is off these boards, your players too.`);
    expect(c.q('[data-cm-leaders-thin]')).toBeNull();
  });

  it('the ? holds the rules and a worked example computed from the book\'s own rule', () => {
    const c = draw(everton());
    const help = c.q('[data-cm-leaders-help]')!;
    expect(help.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(help);
    expect(help.getAttribute('aria-expanded')).toBe('true');
    const text = c.q('[data-cm-leaders-example]')?.textContent ?? '';
    const rules = leagueBookRules();
    const { men, ownGoals } = dealShares(EXAMPLE_ELEVEN.map(e => e.man), rules);
    const n = (name: string) => Math.round(100 * men.find(m => m.man.n === name)!.share);
    const backs = Math.round(100 * men.filter(m => EXAMPLE_ELEVEN.find(e => e.man === m.man)?.role === 'back four').reduce((t, m) => t + m.share, 0));
    const taker = men.find(m => m.setPieces > 0)!;
    expect(text).toContain(`the striker ${n('striker')}`);
    expect(text).toContain(`(${Math.round(100 * taker.setPieces)} of them from the spot or a free kick, as the taker)`);
    expect(text).toContain(`the winger ${n('winger')}`);
    expect(text).toContain(`the number ten ${n('ten')}`);
    expect(text).toContain(`the holder ${n('holder')}`);
    expect(text).toContain(`the back four ${backs} between them`);
    expect(text).toContain(`About ${Math.round(100 * ownGoals)} are own goals`);
    noDash(c.container);
  });
});

describe('the Stats screen with a board open', () => {
  it('draws the board alone and Back brings the tiles and the table back', () => {
    const s = everton();
    const view = render(<StatsScreen career={s} />);
    const q = (sel: string) => view.container.querySelector(sel);
    expect(q('[data-cm-leaders-tile="goals"]')).not.toBeNull();
    expect(view.container.textContent).toContain('Every player');
    fireEvent.click(q('[data-cm-leaders-tile="goals"]')!);
    expect(q('[data-cm-board="goals"]')).not.toBeNull();
    expect(view.container.textContent).not.toContain('Every player');
    expect(view.container.textContent).not.toContain('Award races');
    fireEvent.click(q('[data-cm-leaders-back]')!);
    expect(q('[data-cm-leaders-tile="goals"]')).not.toBeNull();
    expect(view.container.textContent).toContain('Every player');
    noDash(view.container);
  });
});

/* Round 1311 step 2: the season review. The result screen's frame is not what is tested here: it is drawn
   as its playNext block alone, which is where the honours live. */
vi.mock('@/components/game/ResultScreen', () => ({ ResultScreen: ({ playNext }: { playNext?: ReactNode }) => <div>{playNext}</div> }));

function toSeasonEnd(s: CareerState, seed: number): CareerState {
  vi.spyOn(Math, 'random').mockImplementation(seeded(seed));
  let next = s;
  for (let k = 0; k < 160 && next.week < next.calendar.length; k += 1) {
    const r = playNextEntry(next, { skipHalftime: true });
    next = r.state;
    if (r.kind === 'seasonOver') break;
  }
  return next;
}

describe('the season review', () => {
  it('names the league\'s most assists and most clean sheets from the book, and an older summary prints as it did', () => {
    const end = toSeasonEnd(everton(), 13111);
    const lb = leagueBoardsOf(end)!;
    const { state, summary } = finishSeason(end);
    vi.restoreAllMocks();
    expect(summary.awards).toBeDefined();
    const g = { nextSeason: vi.fn(), startNew: vi.fn() };
    const a = render(<ClubManagerSeasonSummary sm={summary} c={state} g={g} />);
    const ast = leaders(lb.input, 'assists', 1)[0];
    const glove = leaders(lb.input, 'sheets', 1)[0];
    expect(a.container.querySelector('[data-cm-award="ast"]')?.textContent).toContain(`${ast.name} (${ast.club}, ${ast.n})`);
    expect(a.container.querySelector('[data-cm-award="glove"]')?.textContent).toContain(`${glove.name} (${glove.club}, ${glove.n})`);
    expect(a.container.textContent).toContain(`Golden boot: ${summary.goldenBoot!.name}`);
    expect(a.container.querySelector('[data-cm-award-withheld]')).toBeNull();
    noDash(a.container);
    cleanup();
    /* A summary from before the awards: no awards field, and it prints what it always did. */
    const old = { ...summary };
    delete old.awards;
    const b = render(<ClubManagerSeasonSummary sm={old} c={state} g={g} />);
    expect(b.container.querySelector('[data-cm-award]')).toBeNull();
    expect(b.container.querySelector('[data-cm-award-withheld]')).toBeNull();
    expect(b.container.textContent).toContain(`Golden boot: ${summary.goldenBoot!.name}`);
  });

  it('withholds the new awards in a league whose data is too thin, and says why', () => {
    const end = toSeasonEnd(hertha(), 13112);
    const lb = leagueBoardsOf(end)!;
    const { state, summary } = finishSeason(end);
    vi.restoreAllMocks();
    expect(lb.share).toBeLessThan(AWARD_FLOOR);
    expect('awards' in summary).toBe(false);
    const c = render(<ClubManagerSeasonSummary sm={summary} c={state} g={{ nextSeason: vi.fn(), startNew: vi.fn() }} />);
    expect(c.container.querySelector('[data-cm-award]')).toBeNull();
    expect(c.container.querySelector('[data-cm-award-withheld]')?.textContent).toContain(`Only ${lb.share} in 100 of this league's goals had a name on them`);
    noDash(c.container);
  });
});
