/* Release AP: Stadium Tycoon's Latest season review (Round 1095).

   The round's own proof (scripts/qa/tycoonSeasonReview1095.mjs) pins itself to
   its branch: it requires the page to be the only source file changed since its
   parent, so it is red on every merged tree, and nothing else read the dialog.
   A review made the dialog read the bottom club as yours, and print your wins
   where your points go, and every check stayed green.

   This reads the dialog itself. The table is written so that every number in it
   is different and your club is neither first nor last, so a figure taken from
   the wrong club or the wrong column cannot come out right by luck. */
import './dailyReload/mocks';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { LatestSeasonReview } from '@/pages/StadiumTycoon';
import type { LeagueClub, TycoonLeague } from '@/lib/stadiumTycoon';

const club = (name: string, w: number, d: number, l: number, gf: number, ga: number): LeagueClub => ({ name, offset: 0, w, d, l, gf, ga, pts: w * 3 + d });
/* index 0 is you (the engine's rule), second on points */
const TABLE: LeagueClub[] = [
  club('Your Ground FC', 7, 4, 3, 22, 15),
  club('Alder Town', 10, 2, 2, 31, 11),
  club('Birch Rovers', 5, 6, 1, 18, 17),
  club('Cedar United', 1, 0, 13, 8, 36),
];
const LABEL = 'Season 3: second in the test division';
const last = { label: LABEL, position: 2, table: TABLE };
/* the league as it stands NOW: a new season, everybody back on nothing */
const league: TycoonLeague = { division: 0, season: 3, matchday: 0, seed: 7, clubs: TABLE.map(c => ({ ...c, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 })) };

const text = (sel: string) => document.querySelector(sel)?.textContent ?? null;
const open = () => fireEvent.click(document.querySelector('[data-last-season]') as HTMLElement);

afterEach(cleanup);

describe('Stadium Tycoon: the Latest season review', () => {
  it('offers the review on a button that says where you finished', () => {
    render(<LatestSeasonReview last={last} league={league} />);
    expect(text('[data-last-season]')).toBe("Latest season2nd of 4 · Review this visit's result");
    expect(document.querySelector('[data-latest-season-review]')).toBeNull();
  });

  it('prints your own line of the final table: place, points, record and goals', () => {
    render(<LatestSeasonReview last={last} league={league} />);
    open();
    expect(text('[data-season-headline]')).toBe(LABEL);
    expect(text('[data-season-position]')).toBe('2nd of 4');
    expect(text('[data-season-points]')).toBe('25');
    expect(text('[data-season-record]')).toBe('7 / 4 / 3');
    expect(text('[data-season-goals]')).toBe('22 / 15');
  });

  it('draws the final table in table order, every club with its own numbers, yours marked', () => {
    render(<LatestSeasonReview last={last} league={league} />);
    open();
    const rows = [...document.querySelectorAll('[data-latest-season-table] tbody tr')];
    expect(rows.map(r => r.getAttribute('data-season-club'))).toEqual(['Alder Town', 'Your Ground FC', 'Birch Rovers', 'Cedar United']);
    const cells = rows.map(r => [...r.children].map(c => c.textContent));
    expect(cells).toEqual([
      ['1Alder Town', '10 / 2 / 2GF 31GA 11', '32'],
      ['2Your Ground FC', '7 / 4 / 3GF 22GA 15', '25'],
      ['3Birch Rovers', '5 / 6 / 1GF 18GA 17', '21'],
      ['4Cedar United', '1 / 0 / 13GF 8GA 36', '3'],
    ]);
    expect(rows.map(r => r.className.includes('bg-primary/10'))).toEqual([false, true, false, false]);
  });

  it('keeps the season it opened on while the match runs, and shows the newer one when opened again', () => {
    const view = render(<LatestSeasonReview last={last} league={league} />);
    open();
    const next = { label: 'Season 4: champions', position: 1, table: [club('Your Ground FC', 12, 1, 1, 40, 9), ...TABLE.slice(1)] };
    view.rerender(<LatestSeasonReview last={next} league={league} />);
    expect(text('[data-season-headline]')).toBe(LABEL);
    expect(text('[data-season-points]')).toBe('25');
    const back = [...document.querySelectorAll('[data-latest-season-review] button')].find(b => b.textContent === 'Back') as HTMLElement;
    fireEvent.click(back);
    expect(document.querySelector('[data-latest-season-review]')).toBeNull();
    open();
    expect(text('[data-season-headline]')).toBe('Season 4: champions');
    expect(text('[data-season-points]')).toBe('37');
    expect(text('[data-season-position]')).toBe('1st of 4');
  });
});
