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
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LatestSeasonReview, SeasonMatchResults } from '@/pages/StadiumTycoon';
import {
  attendance, clubNameOptions, deserializeTycoon, leagueShape, newTycoon, prestige, serializeTycoon, setClubName, setMatchPlan,
  signStadiumSponsor, stadiumSponsorPayout, tick, type LeagueClub, type TycoonLeague, type TycoonState,
} from '@/lib/stadiumTycoon';

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

describe('Stadium Tycoon: current season results', () => {
  it('starts after the first matchday and adds settled scores while the results stay open', () => {
    const fresh = newTycoon(1794085200000);
    const first = tick({ ...setMatchPlan({ ...fresh, minute: 70 }, fresh.matchNo, 'protect'), minute: 89, goalsFor: 2 }, 1.5, () => 1).state;
    const second = tick({ ...setMatchPlan({ ...first, minute: 71 }, first.matchNo, 'push'), minute: 89, goalsFor: 3, goalsAgainst: 1 }, 1.5, () => 1).state;
    const view = render(<SeasonMatchResults league={fresh.league!} current />);
    expect(document.querySelector('[data-current-season-results]')).toBeNull();
    view.rerender(<SeasonMatchResults league={first.league!} current />);
    const results = document.querySelector<HTMLDetailsElement>('[data-current-season-results]')!;
    expect(results.textContent).toMatch(/Results this season.*Matchday 1.*Protect from 70′.*2-0/);
    results.open = true;
    view.rerender(<SeasonMatchResults league={second.league!} current />);
    expect(document.querySelector('[data-current-season-results]')).toBe(results);
    expect(results.open).toBe(true);
    expect(results.textContent).toMatch(/Matchday 1.*2-0.*Matchday 2.*Push from 71′.*3-1/);
    expect(results.querySelectorAll('li')).toHaveLength(2);
  });

  it('shows when an older current season has no scores and keeps any recorded tail', () => {
    const fresh = newTycoon(1794085200000).league!;
    const legacy = { ...fresh, matchday: 2 };
    const view = render(<SeasonMatchResults league={legacy} current />);
    expect(text('[data-current-season-results]')).toContain('Scores for these matchdays were not recorded.');
    view.rerender(<SeasonMatchResults league={{ ...legacy, results: [{ day: 2, gf: 1, ga: 0 }] }} current />);
    expect(text('[data-current-season-results]')).toMatch(/Earlier scores were not recorded.*Matchday 2.*1-0/);
    expect(document.querySelectorAll('[data-current-season-results] li')).toHaveLength(1);
  });
});

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
    const reopened = deserializeTycoon(serializeTycoon(next, now), now)!;
    expect(reopened.league?.results).toEqual([{ day: 3, gf: 3, ga: 0, attendance: attendance(old), ticketOffer: { policy: 'standard', seats: 120 } }]);
    const malformed = structuredClone(reopened);
    malformed.league!.results![0].attendance = -5;
    expect(deserializeTycoon(serializeTycoon(malformed, now), now)?.league?.results).toEqual([{ day: 3, gf: 3, ga: 0 }]);
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

  it('keeps the picked existing report open as another season arrives, with all choices still available', async () => {
    const oldest = { ...last, season: 1 };
    const view = render(<LatestSeasonReview last={last} history={[oldest]} />);
    open();
    const picker = () => screen.getByRole('combobox', { name: 'Completed season' });
    fireEvent.change(picker(), { target: { value: '1' } });
    expect(text('[data-season-headline]')).toBe('Season 2 · Muddy Meadows League');
    picker().focus();
    const newer = { ...last, season: 3 };
    view.rerender(<LatestSeasonReview last={newer} history={[oldest, last]} />);
    expect(picker()).toHaveFocus();
    expect(picker()).toHaveValue('1');
    expect(text('[data-season-headline]')).toBe('Season 2 · Muddy Meadows League');
    expect(picker().querySelectorAll('option')).toHaveLength(3);
    fireEvent.change(picker(), { target: { value: '3' } });
    expect(text('[data-season-headline]')).toBe('Season 4 · Muddy Meadows League');
    fireEvent.click(screen.getByRole('button', { name: /^Back$/ }));
    await waitFor(() => expect(document.querySelector('[data-last-season]')).toHaveFocus());
  });

  it('archives real results, old names, sponsorship and tactics from a legacy latest-only save and clears them on sell-up', () => {
    const now = 1794085200000;
    const finish = (state: TycoonState, winning: boolean, kind: 'protect' | 'push') => {
      const end = leagueShape(state.league!.division).matchdays;
      for (let day = 0; day < end; day += 1) {
        state = setMatchPlan({ ...state, minute: 70 }, state.matchNo, kind);
        state = tick({ ...state, minute: 89, goalsFor: winning ? 3 : 0, goalsAgainst: winning ? 0 : 4 }, 1.5, () => 1).state;
      }
      return state;
    };
    const start = { ...newTycoon(now), fanbase: 220 };
    const signed = signStadiumSponsor(start, start.rep, 0, 'fixed');
    const first = finish(signed, true, 'protect');
    const previous = first.lastCompletedLeague!;
    expect(first.completedLeagueHistory).toBeUndefined();
    expect(previous.clubs[0].name).toBe('Your club');
    expect(previous.results?.at(-1)).toMatchObject({ gf: 3, ga: 0, plan: { minute: 70, kind: 'protect' } });
    const loaded = deserializeTycoon(serializeTycoon(first, now), now)!;
    expect(loaded.completedLeagueHistory).toBeUndefined();
    const renamed = setClubName(loaded, clubNameOptions(loaded)[0]);
    const second = finish(signStadiumSponsor(renamed, renamed.rep, 1, 'attendance'), false, 'push');
    expect(second.completedLeagueHistory).toEqual([previous]);
    expect(previous.clubs[0].name).not.toBe(second.lastCompletedLeague!.clubs[0].name);
    expect(second.lastCompletedLeague!.sponsor?.kind).toBe('attendance');
    expect(second.lastCompletedLeague!.results?.at(-1)).toMatchObject({ gf: 0, ga: 4, plan: { minute: 70, kind: 'push' } });
    const third = finish(second, false, 'push');
    const reloaded = deserializeTycoon(serializeTycoon(third, now), now)!;
    expect(reloaded.completedLeagueHistory).toEqual([previous, second.lastCompletedLeague]);

    const previousPayout = stadiumSponsorPayout(previous);
    render(<LatestSeasonReview last={reloaded.lastCompletedLeague!} history={reloaded.completedLeagueHistory!} />);
    open();
    fireEvent.change(screen.getByRole('combobox', { name: 'Completed season' }), { target: { value: '0' } });
    expect(text('[data-season-sponsor]')).toContain(`paid $${previousPayout}`);
    expect(text('[data-latest-season-table]')).toContain('Your club');
    expect(text('[data-latest-season-results]')).toContain('Protect from 70′');
    expect(text('[data-latest-season-results]')).toContain('3-0');

    const corrupted = { ...third, completedLeagueHistory: [previous, { ...previous, season: 10 }, { ...previous, matchday: 2 }] };
    expect(deserializeTycoon(serializeTycoon(corrupted, now), now)?.completedLeagueHistory).toEqual([previous]);
    const sold = prestige({ ...third, lifetime: 4_000_000 }, now);
    expect(sold.lastCompletedLeague).toBeUndefined();
    expect(sold.completedLeagueHistory).toBeUndefined();
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
