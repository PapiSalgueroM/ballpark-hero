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
import { deserializeTycoon, leagueShape, newTycoon, prestige, serializeTycoon, tick, type LeagueClub, type TycoonLeague } from '@/lib/stadiumTycoon';

const club = (name: string, w: number, d: number, l: number, gf: number, ga: number): LeagueClub => ({ name, offset: 0, w, d, l, gf, ga, pts: w * 3 + d });
/* index 0 is you (the engine's rule), second on points */
const TABLE: LeagueClub[] = [
  club('Your Ground FC', 7, 4, 3, 22, 15),
  club('Alder Town', 10, 2, 2, 31, 11),
  club('Birch Rovers', 5, 6, 1, 18, 17),
  club('Cedar United', 1, 0, 13, 8, 36),
];
const LABEL = 'Season 3 · Muddy Meadows League';
const last: TycoonLeague = { division: 0, season: 2, matchday: 14, seed: 7, clubs: TABLE };

const text = (sel: string) => document.querySelector(sel)?.textContent ?? null;
const open = () => fireEvent.click(document.querySelector('[data-last-season]') as HTMLElement);

afterEach(cleanup);

describe('Stadium Tycoon: the Latest season review', () => {
  it('keeps exact league results across promotion and reload and drops a forged result', () => {
    const now = 1794085200000;
    let state = newTycoon(now);
    for (let i = 0; i < leagueShape(0).matchdays; i += 1) {
      state = tick({ ...state, minute: 89, goalsFor: 10 + i, goalsAgainst: i }, 1.5, () => 1).state;
      state = deserializeTycoon(serializeTycoon(state, now), now)!;
    }
    const last = state.lastCompletedLeague!;
    expect(last.results?.map(({ gf, ga }) => [gf, ga])).toEqual([[10, 0], [11, 1], [12, 2], [13, 3], [14, 4]]);
    expect(state.league?.results).toBeUndefined();
    render(<LatestSeasonReview last={last} />);
    open();
    expect(text('[data-latest-season-results]')).toMatch(/10-0.*11-1.*12-2.*13-3.*14-4/);

    const forged = { ...state, lastCompletedLeague: { ...last, results: [{ day: 5, gf: 99, ga: 0 }] } };
    expect(deserializeTycoon(serializeTycoon(forged, now), now)?.lastCompletedLeague?.results).toBeUndefined();
  });

  it('starts recording from the next matchday of an older save', () => {
    const now = 1794085200000;
    const base = newTycoon(now);
    const finish = (state: typeof base) => tick({ ...state, minute: 89, goalsFor: 3, goalsAgainst: 0 }, 1.5, () => 1).state;
    const old = finish(finish(base));
    delete old.league!.results;
    const next = finish(deserializeTycoon(serializeTycoon(old, now), now)!);
    expect(deserializeTycoon(serializeTycoon(next, now), now)?.league?.results).toEqual([{ day: 3, gf: 3, ga: 0 }]);
  });
  it('offers the review on a button that says where you finished', () => {
    render(<LatestSeasonReview last={last} />);
    expect(text('[data-last-season]')).toBe("Latest seasonSeason 3 · 2nd of 4");
    expect(document.querySelector('[data-latest-season-review]')).toBeNull();
  });

  it('prints your own line of the final table: place, points, record and goals', () => {
    render(<LatestSeasonReview last={last} />);
    open();
    expect(text('[data-season-headline]')).toBe(LABEL);
    expect(text('[data-season-position]')).toBe('2nd of 4');
    expect(text('[data-season-points]')).toBe('25');
    expect(text('[data-season-record]')).toBe('7 / 4 / 3');
    expect(text('[data-season-goals]')).toBe('22 / 15');
  });

  it('draws the final table in table order, every club with its own numbers, yours marked', () => {
    render(<LatestSeasonReview last={last} />);
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
    const view = render(<LatestSeasonReview last={last} />);
    open();
    const next = { ...last, season: 3, clubs: [club('Your Ground FC', 12, 1, 1, 40, 9), ...TABLE.slice(1)] };
    view.rerender(<LatestSeasonReview last={next} />);
    expect(text('[data-season-headline]')).toBe(LABEL);
    expect(text('[data-season-points]')).toBe('25');
    const back = [...document.querySelectorAll('[data-latest-season-review] button')].find(b => b.textContent === 'Back') as HTMLElement;
    fireEvent.click(back);
    expect(document.querySelector('[data-latest-season-review]')).toBeNull();
    open();
    expect(text('[data-season-headline]')).toBe('Season 4 · Muddy Meadows League champions');
    expect(text('[data-season-points]')).toBe('37');
    expect(text('[data-season-position]')).toBe('1st of 4');
  });

  it.each([true, false])('retains the actual last table on reload after a season with winning=%s', winning => {
    const now = 1794085200000;
    let state = newTycoon(now);
    for (let i = 0; i < leagueShape(0).matchdays; i += 1) {
      state = tick({ ...state, minute: 89, goalsFor: winning ? 100 : 0, goalsAgainst: winning ? 0 : 100 }, 1.5, () => 1).state;
    }
    expect(state.league?.season).toBe(1);
    expect(state.league?.division).toBe(winning ? 1 : 0);
    expect(state.lastCompletedLeague?.season).toBe(0);
    expect(state.lastCompletedLeague?.matchday).toBe(leagueShape(0).matchdays);
    expect(state.lastCompletedLeague?.clubs[0][winning ? 'w' : 'l']).toBe(5);
    const reloaded = deserializeTycoon(serializeTycoon(state, now), now)!;
    expect(reloaded.lastCompletedLeague).toEqual(state.lastCompletedLeague);
    expect(reloaded.league?.clubs[0].pts).toBe(0);
    expect(prestige({ ...state, lifetime: 4_000_000 }, now).lastCompletedLeague).toBeUndefined();

    const stale = { ...state, lastCompletedLeague: { ...state.lastCompletedLeague!, season: 1 } };
    expect(deserializeTycoon(serializeTycoon(stale, now), now)?.lastCompletedLeague).toBeUndefined();
    const incomplete = { ...state, lastCompletedLeague: { ...state.lastCompletedLeague!, matchday: 4 } };
    expect(deserializeTycoon(serializeTycoon(incomplete, now), now)?.lastCompletedLeague).toBeUndefined();
    delete state.lastCompletedLeague;
    expect(deserializeTycoon(serializeTycoon(state, now), now)?.lastCompletedLeague).toBeUndefined();
  });
});
