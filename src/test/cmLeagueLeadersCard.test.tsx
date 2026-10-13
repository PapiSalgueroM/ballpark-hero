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
import { REAL_LEAGUES, bookAwardsState, finishSeason, keepTeams, leagueBoardsOf, leagueBookRules, playNextEntry, type CareerState } from '@/lib/clubManager';
import { AWARD_FLOOR, BOOK_FULL_SHARE, bestOfMine, leaders, seasonAwards, type BoardKind } from '@/lib/clubManagerLeagueBoards';
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
    /* jsdom has no scrolling: Back's scroll back is measured by scripts/playCmLeagueLeaders.mjs instead. */
    const scrolled = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
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
    expect(scrolled).toHaveBeenCalled();
    noDash(view.container);
    vi.restoreAllMocks();
  });

  /* Review-read m4: the race's note points at the Top scorers board only when the card above draws one. */
  it('the golden boot race note names the Top scorers board only when the card shows the boards', () => {
    const POINTER = 'The Top scorers board above';
    const thin = render(<StatsScreen career={hertha()} />);
    expect(thin.container.querySelector('[data-cm-leaders-tile="goals"]')).not.toBeNull();
    expect(thin.container.querySelector('[data-cm-boot-race-note]')?.textContent).toContain(POINTER);
    cleanup();
    const s = everton();
    delete s.leagueBook;
    const none = render(<StatsScreen career={s} />);
    expect(none.container.querySelector('[data-cm-leaders-empty="nobook"]')).not.toBeNull();
    const note = none.container.querySelector('[data-cm-boot-race-note]');
    expect(note).not.toBeNull();
    expect(note?.textContent).not.toContain(POINTER);
    noDash(none.container);
  });
});

/* Round 1311 step 2: the season review. The result screen's frame is not what is tested here: it is drawn
   as what it is handed (its children, where the honours live, and its playNext block) and nothing else. */
vi.mock('@/components/game/ResultScreen', () => ({ ResultScreen: ({ children, playNext }: { children?: ReactNode; playNext?: ReactNode }) => <div>{children}{playNext}</div> }));

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
    /* Step 5: one tile for the team of the season, opened in place and closed again. */
    const xi = summary.awards!.xi!;
    expect(xi).toHaveLength(11);
    const mineIn = xi.filter(m => (m[3] & 2) !== 0).length;
    const tile = a.container.querySelector('[data-cm-team-tile]')!;
    expect(tile.textContent).toContain(mineIn ? `${mineIn} of yours made it` : 'None of yours this time');
    fireEvent.click(tile);
    expect([...a.container.querySelectorAll('[data-cm-team-man]')].map(el => el.querySelector('span')?.textContent)).toEqual(xi.map(m => m[0]));
    fireEvent.click(a.container.querySelector('[data-cm-team-back]')!);
    expect(a.container.querySelector('[data-cm-team-tile]')).not.toBeNull();
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
    expect(c.container.querySelector('[data-cm-award-withheld]')?.textContent).toContain(`Only ${lb.share} in 100 of the other clubs' goals had a name on them`);
    /* On such a season the summary is the base's to the byte (decision 3, held by scripts/simCmLeagueBook.mjs
     * section stream), so a pending summary the base wrote in a thin league gains exactly this line, on purpose:
     * the base settled that boot on the scorers' race too. */
    noDash(c.container);
  });

  /* Review r1311-run-m, mutations thinfloor and sumthinfloor: the honest line's 95 was held only as a
   * constant, since the other saves here sit at 100 or under 73. Here a league between the two: the book
   * decides, and the card and the review both still print the number. The save's own book is thinned by
   * moving part of each rival row's goals to the club's unnamed count, so every club still adds up. */
  it('a league between the floor and 95 is settled by the book and still carries the honest line, on the card and on the review', () => {
    const s = everton();
    for (const entry of Object.values(s.leagueBook!.c)) {
      for (const row of Object.values(entry.m)) { const k = Math.floor(row[0] * 0.4); row[0] -= k; entry.u += k; }
    }
    const end = toSeasonEnd(s, 13113);
    const lb = leagueBoardsOf(end)!;
    const { state, summary } = finishSeason(end);
    vi.restoreAllMocks();
    expect(lb.share).toBeGreaterThanOrEqual(AWARD_FLOOR);
    expect(lb.share).toBeLessThan(BOOK_FULL_SHARE);
    expect(bookAwardsState(end, lb).by).toBe('book');
    expect(summary.awards?.cov).toBe(lb.share);
    const c = draw(end);
    expect(c.q('[data-cm-leaders-thin]')?.textContent).toContain(`${lb.share} in 100 of the other clubs' goals have a name on them`);
    cleanup();
    const r = render(<ClubManagerSeasonSummary sm={summary} c={state} g={{ nextSeason: vi.fn(), startNew: vi.fn() }} />);
    expect(r.container.querySelector('[data-cm-award-thin]')?.textContent).toContain(`${lb.share} in 100 of the other clubs' goals had a name on them`);
    expect(r.container.querySelector('[data-cm-award-withheld]')).toBeNull();
    noDash(r.container);
  });

  /* Review r1311-run-m, mutation nolatestate: a late book's share leaves out the goals it was opened with,
   * so it sits near 100, and the review must say the book started late, never "only N in 100". */
  it('a season on a late book says the book covered only part of it, not that its data was thin', () => {
    const s = everton();
    delete s.leagueBook;
    const end = toSeasonEnd(s, 13114);
    const lb = leagueBoardsOf(end)!;
    const { state, summary } = finishSeason(end);
    vi.restoreAllMocks();
    expect(lb.from).not.toBeNull();
    expect(bookAwardsState(state).by).toBe('late');
    expect('awards' in summary).toBe(false);
    const c = render(<ClubManagerSeasonSummary sm={summary} c={state} g={{ nextSeason: vi.fn(), startNew: vi.fn() }} />);
    const line = c.container.querySelector('[data-cm-award-withheld]')?.textContent ?? '';
    expect(line).toContain('The league book only covered part of this season');
    expect(line).not.toContain('in 100');
    noDash(c.container);
  });
});

/* Round 1311 step 3: Past winners, one season at a time, newest first, from the save's own records. */
describe('past winners', () => {
  it('opens on the newest season, steps older and back, and says when a season was thin', () => {
    const s = everton();
    const aw = seasonAwards(leagueBoardsOf(s)!.input)!;
    const rec = s.history[0] ?? { season: 0, club: s.clubName, position: 1, points: 0, trophies: [] };
    s.history = [
      { ...rec, season: 1, leagueId: undefined, awards: { ...aw, cov: 80 } },
      { ...rec, season: 2, leagueId: 'championship', awards: aw },
    ];
    const tiles = draw(s);
    expect(tiles.q('[data-cm-leaders-tile="past"]')).not.toBeNull();
    fireEvent.click(tiles.q('[data-cm-leaders-tile="past"]')!);
    expect(tiles.onBoard).toHaveBeenLastCalledWith('past');
    cleanup();
    const p = draw(s, 'past');
    expect(p.q('[data-cm-past-season]')?.getAttribute('data-cm-past-season')).toBe('2');
    expect(p.q('[data-cm-past-count]')?.textContent).toBe('1 of 2');
    /* Review-read m11: the record's own league is named, so a season played elsewhere reads as such. */
    expect(p.q('[data-cm-past-league]')?.textContent).toBe(` · ${REAL_LEAGUES.find(l => l.id === 'championship')!.name}`);
    expect((p.q('[data-cm-past-step="newer"]') as HTMLButtonElement).disabled).toBe(true);
    expect(p.container.textContent).toContain(`${aw.boot![0]}`);
    expect(p.container.textContent).not.toContain('The data covered only part of that league');
    fireEvent.click(p.q('[data-cm-past-step="older"]')!);
    expect(p.q('[data-cm-past-season]')?.getAttribute('data-cm-past-season')).toBe('1');
    expect(p.container.textContent).toContain('The data covered only part of that league: 80 in 100');
    expect(p.q('[data-cm-past-league]')).toBeNull();
    expect((p.q('[data-cm-past-step="older"]') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(p.q('[data-cm-leaders-back]')!);
    expect(p.onBoard).toHaveBeenLastCalledWith(null);
    noDash(p.container);
  });

  it('offers no Past winners tile before any season has closed with awards', () => {
    const s = everton();
    s.history = s.history.map(h => { const { awards, ...rest } = h; void awards; return rest; });
    expect(draw(s).q('[data-cm-leaders-tile="past"]')).toBeNull();
  });
});

/* Round 1311 step 5: the team is kept on the newest five records with awards and let go from every older one. */
describe('the team of the season on the records', () => {
  it('keeps the team on the newest five records and the winners on all of them', () => {
    const s = everton();
    const aw = seasonAwards(leagueBoardsOf(s)!.input)!;
    expect(aw.xi).toHaveLength(11);
    const rec = s.history[0] ?? { season: 0, club: s.clubName, position: 1, points: 0, trophies: [] };
    const seven = [1, 2, 3, 4, 5, 6, 7].map(season => ({ ...rec, season, awards: aw }));
    const kept = keepTeams(seven);
    expect(kept.filter(h => h.awards?.xi).map(h => h.season)).toEqual([3, 4, 5, 6, 7]);
    expect(kept.every(h => h.awards?.boot)).toBe(true);
    /* A history with no team comes back the very same objects. */
    const plain = seven.map(h => ({ ...h, awards: { cov: aw.cov, boot: aw.boot } }));
    expect(keepTeams(plain).every((h, i) => h === plain[i])).toBe(true);
    /* Past winners: the newest shows its team, the sixth newest says it was let go. */
    s.history = kept;
    const p = draw(s, 'past');
    expect(p.q('[data-cm-team]')).not.toBeNull();
    for (let k = 0; k < 5; k += 1) fireEvent.click(p.q('[data-cm-past-step="older"]')!);
    expect(p.q('[data-cm-past-season]')?.getAttribute('data-cm-past-season')).toBe('2');
    expect(p.q('[data-cm-team-gone]')?.textContent).toBe('The team of the season is kept for the last five seasons.');
    noDash(p.container);
  });
});
