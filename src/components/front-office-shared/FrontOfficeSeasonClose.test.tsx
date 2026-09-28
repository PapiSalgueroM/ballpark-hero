/**
 * A GM season closes exactly once, on all four front office boards.
 *
 * Round 431, audit blocker 5. The final week handler ran the playoffs,
 * advanced titles and seasonsPlayed, graded the mandate, and persisted
 * phase 'recap' with the league still at the final week and no postseason.
 * On reload the load effect mapped 'recap' back to 'hub', the play box
 * offered the final week again, and one click ran it and the whole
 * postseason a second time on a season that was already closed:
 * seasonsPlayed and titles advanced twice, every team played an extra
 * game, the mandate was graded twice, and the inflated numbers reached the
 * recorded score. Same defect class as CFB Dynasty (Round 426 part three),
 * whose test this file follows.
 *
 * The save now carries the postseason so the recap is drawn again; a save
 * from before this round opens on the draft, which is where the recap's
 * only button leads; and the handler refuses a postseason for a season
 * already in league.champions.
 *
 * One parameterised file over the four boards. Each case builds a save at
 * the final week from the real engine under a seeded rng, renders the real
 * board on it, plays the final week, remounts, and reads the save.
 *
 * scripts/simGmReload.mjs runs this file and carries the negative control:
 * FO_BOARD_NFL, FO_BOARD_NBA, FO_BOARD_MLB and FO_BOARD_NHL point it at
 * copies of the boards with the old restore and no guard, and the reload
 * tests must then fail.
 *
 * Round 647: the second describe per board is the season ledger. A title
 * season and a season without one each add exactly one row to the save,
 * scored on that season alone, and that row's score is what the board hands
 * the completion hook, recorded once (finishes() counts the rises the real
 * hook witnesses); an older save with titles and no ledger earns nothing
 * retroactively; a reload on the recap hands the hook nothing; a closed
 * season played again adds nothing; a second season adds a second row and a
 * second finish, and the career is the sum; and the same results score the
 * same whichever team was picked. The roster is rigged to force the two
 * outcomes (every player 99, every player 40) because the seeded rng decides
 * the rest. scripts/simGmReload.mjs section 2 runs these rows and carries
 * their controls: SEASON_LEDGER_MODULE points the boards and this file at a
 * copy of src/lib/seasonLedger.ts that double counts a title or scores the
 * pick, and exactly the rows written for that fault must then fail while
 * every other row stays green.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { ComponentType } from 'react';
import { initLeague, simGame, REGULAR_WEEKS } from '@/lib/frontOffice';
import { initNbaLeague, simRound, NBA_ROUNDS } from '@/lib/nbaFrontOffice';
import { initMlbLeague, simMlbRound, MLB_ROUNDS } from '@/lib/mlbFrontOffice';
import { initNhlLeague, simNhlRound, NHL_FO_ROUNDS } from '@/lib/nhlFrontOffice';
import { scoreSeason, appendSeason, ledgerTotal, W_TITLE, SEASON_CEILING, type SeasonRow } from '@/lib/seasonLedger';

// Completion tracking reads the auth context and writes to the database,
// recordActivity inserts a row through the Supabase client, the share
// buttons draw a canvas card, the reveal scroll calls scrollIntoView which
// jsdom does not have. None is under test and none may touch the network.
// Round 647: the completion hook is a spy, so the ledger rows can read what
// the board handed it: the slug, whether a finish is on screen, the score.
const { completion } = vi.hoisted(() => ({ completion: vi.fn() }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: (...args: unknown[]) => { completion(...args); } }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

function lehmer(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/* Round 647: force the season's outcome. 'strong' rates every man on the
   GM's roster 99 and every man on every other roster 40, which is a title
   under any seed (a 99 roster against ordinary ones still lost the NFL and
   MLB titles under seed 11, so the gap has to be the whole scale); 'weak'
   rates the GM's roster 40 against ordinary rosters, which is last place and
   no playoffs. Applied before the regular season is played, so the record
   matches the roster the way it would in play. */
type Rig = 'strong' | 'weak' | undefined;
const rigLeague = (teams: Record<string, any>, me: string, rig: Rig) => {
  if (!rig) return;
  for (const [abbr, t] of Object.entries(teams)) {
    const mine = abbr === me;
    if (!mine && rig === 'weak') continue;
    for (const p of t.players) { p.ovr = mine === (rig === 'strong') ? 99 : 40; p.out = 0; }
  }
};

interface BoardCase {
  name: string;
  env: string;
  load: () => Promise<{ default: ComponentType }>;
  saveKey: string;
  slug: string;
  /* A league on the morning of its final week or round, with the team the GM runs. */
  finalWeek: (rng: () => number, rig?: Rig) => { league: any; team: string };
  /* Round 647: play a league from wherever it stands to the morning of its
     final week or round. */
  toFinal: (league: any, team: string, rng: () => number) => void;
  tile: string;
  finalButton: string;
  headline: RegExp;
  draftHeading: string;
  /* Picks the GM makes before the draft closes, the first play button of the
     next season, and the league field that counts its periods. */
  picks: number;
  firstButton: string;
  periodKey: 'week' | 'round';
}

/* Round 647: play a league from wherever it stands to the morning of its
   final week or round. finalWeek opens a season with these, and the two
   season ledger row closes a second season with them from a real save. */
const nflToFinal = (lg: any, _team: string, rng: () => number) => {
  for (let w = lg.week; w < REGULAR_WEEKS; w += 1) { lg.schedule[w - 1].forEach((g: any) => simGame(g, lg.teams, rng)); lg.week += 1; }
};
const nbaToFinal = (lg: any, team: string, rng: () => number) => {
  for (let r = lg.round; r < NBA_ROUNDS; r += 1) { simRound(lg, team, rng); lg.round += 1; }
};
const mlbToFinal = (lg: any, team: string, rng: () => number) => {
  for (let r = lg.round; r < MLB_ROUNDS; r += 1) { simMlbRound(lg, team, rng); lg.round += 1; }
};
const nhlToFinal = (lg: any, team: string, rng: () => number) => {
  for (let r = lg.round; r < NHL_FO_ROUNDS; r += 1) { simNhlRound(lg, team, rng); lg.round += 1; }
};

const CASES: BoardCase[] = [
  {
    name: 'NFL Front Office', env: 'FO_BOARD_NFL',
    load: () => import('@/components/front-office/FrontOfficeBoard'),
    saveKey: 'front-office-save-v1', slug: 'front-office',
    finalWeek: (rng, rig) => {
      const lg = initLeague(rng);
      const team = Object.keys(lg.teams)[0];
      rigLeague(lg.teams, team, rig);
      nflToFinal(lg, team, rng);
      return { league: lg, team };
    },
    toFinal: nflToFinal,
    tile: 'This week', finalButton: 'Play the final week + playoffs',
    headline: /win the 2026 title/, draftHeading: 'The 2027 Draft',
    picks: 3, firstButton: 'Play Week 1', periodKey: 'week',
  },
  {
    name: 'NBA Front Office', env: 'FO_BOARD_NBA',
    load: () => import('@/components/nba-front-office/NbaFrontOfficeBoard'),
    saveKey: 'nba-front-office-save-v1', slug: 'nba-front-office',
    finalWeek: (rng, rig) => {
      const lg = initNbaLeague(rng);
      const team = Object.keys(lg.teams)[0];
      rigLeague(lg.teams, team, rig);
      nbaToFinal(lg, team, rng);
      return { league: lg, team };
    },
    toFinal: nbaToFinal,
    tile: 'Play', finalButton: 'Final stretch + playoffs',
    headline: /win the 2026 title/, draftHeading: 'The 2027 Draft',
    picks: 2, firstButton: 'Play Round 1', periodKey: 'round',
  },
  {
    name: 'MLB Front Office', env: 'FO_BOARD_MLB',
    load: () => import('@/components/mlb-front-office/MlbFrontOfficeBoard'),
    saveKey: 'mlb-front-office-save-v1', slug: 'mlb-front-office',
    finalWeek: (rng, rig) => {
      const lg = initMlbLeague(rng);
      const team = Object.keys(lg.teams)[0];
      rigLeague(lg.teams, team, rig);
      mlbToFinal(lg, team, rng);
      return { league: lg, team };
    },
    toFinal: mlbToFinal,
    tile: 'Play', finalButton: 'Final stretch + October',
    headline: /win the 2026 World Series/, draftHeading: 'The 2027 Draft',
    picks: 2, firstButton: 'Play Round 1', periodKey: 'round',
  },
  {
    name: 'NHL Front Office', env: 'FO_BOARD_NHL',
    load: () => import('@/components/nhl-front-office/NhlFrontOfficeBoard'),
    saveKey: 'nhl-front-office-save-v1', slug: 'nhl-front-office',
    finalWeek: (rng, rig) => {
      const lg = initNhlLeague(rng);
      const team = Object.keys(lg.teams)[0];
      rigLeague(lg.teams, team, rig);
      nhlToFinal(lg, team, rng);
      return { league: lg, team };
    },
    toFinal: nhlToFinal,
    tile: 'Play', finalButton: 'Final stretch + playoffs',
    headline: /lift the 2027 Stanley Cup/, draftHeading: 'The 2027 Draft',
    picks: 2, firstButton: 'Play Round 1', periodKey: 'round',
  },
];

/* Every game every team has played: wins plus losses (plus OT losses in
   the NHL). A replayed final week or round raises it; nothing else can. */
const gamesPlayed = (league: any) =>
  Object.values(league.teams as Record<string, any>).reduce((n, t) => n + t.wins + t.losses + (t.otLosses ?? 0), 0);

for (const c of CASES) {
  const override = process.env[c.env];
  const { default: Board } = override ? await import(/* @vite-ignore */ override) : await c.load();
  const save = (shape: any) => localStorage.setItem(c.saveKey, JSON.stringify(shape));
  const read = (): any => JSON.parse(localStorage.getItem(c.saveKey)!);

  describe(`${c.name}: the season closes once`, () => {
    let restoreRandom: (() => void) | null = null;
    beforeEach(() => {
      localStorage.clear();
      const rng = lehmer(11);
      const spy = vi.spyOn(Math, 'random').mockImplementation(rng);
      restoreRandom = () => spy.mockRestore();
    });
    afterEach(() => { cleanup(); restoreRandom?.(); });

    it('draws the recap again after a reload and does not replay the season', () => {
      const { league, team } = c.finalWeek(lehmer(7));
      save({ league, myTeam: team, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0 });
      const first = render(<Board />);
      fireEvent.click(screen.getByText(c.tile));
      fireEvent.click(screen.getByText(c.finalButton));
      expect(screen.getByText(c.headline)).toBeTruthy();
      const closed = read();
      expect(closed.phase).toBe('recap');
      expect(closed.seasonsPlayed).toBe(1);
      const played = gamesPlayed(closed.league);
      first.unmount();

      render(<Board />);
      expect(screen.getByText(c.headline)).toBeTruthy();
      expect(screen.queryByText(c.tile)).toBeNull();
      expect(read().seasonsPlayed).toBe(1);
      expect(gamesPlayed(read().league)).toBe(played);
    });

    it('REPRO: what a reload on the recap lets the player do today', () => {
      const { league, team } = c.finalWeek(lehmer(7));
      save({ league, myTeam: team, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0 });
      const first = render(<Board />);
      fireEvent.click(screen.getByText(c.tile));
      fireEvent.click(screen.getByText(c.finalButton));
      const closed = read();
      first.unmount();

      render(<Board />);
      const tile = screen.queryByText(c.tile);
      if (tile) {
        fireEvent.click(tile);
        const again = screen.queryByText(c.finalButton);
        if (again) fireEvent.click(again);
      }
      const after = read();
      const line = `${c.name}: after finishing the season and reloading, hub shown=${!!tile}, ` +
        `seasonsPlayed ${closed.seasonsPlayed} -> ${after.seasonsPlayed}, titles ${closed.titles} -> ${after.titles}, ` +
        `league games ${gamesPlayed(closed.league)} -> ${gamesPlayed(after.league)}, ` +
        `period ${closed.league.week ?? closed.league.round}, phase ${closed.phase} -> ${after.phase}`;
      console.log(line);
      expect(after.seasonsPlayed, line).toBe(1);
      expect(gamesPlayed(after.league), line).toBe(gamesPlayed(closed.league));
    });

    it('opens an older recap save on the draft instead of the final week', () => {
      const { league, team } = c.finalWeek(lehmer(7));
      /* Written by the board before the fix: phase recap, no postseason, and
         the season already counted. */
      save({ league, myTeam: team, phase: 'recap', titles: 0, seasonsPlayed: 1, draftClass: null, picksLeft: 0 });
      render(<Board />);
      expect(screen.queryByText(c.finalButton)).toBeNull();
      expect(screen.queryByText(c.tile)).toBeNull();
      expect(screen.getByText(c.draftHeading)).toBeTruthy();
      expect(read().phase).toBe('draft');
      expect(read().seasonsPlayed).toBe(1);
    });

    it('refuses to run the final week twice for one season', () => {
      const { league, team } = c.finalWeek(lehmer(7));
      league.champions.push({ season: league.season, team });
      const before = { league, myTeam: team, phase: 'hub', titles: 0, seasonsPlayed: 1, draftClass: null, picksLeft: 0 };
      save(before);
      render(<Board />);
      fireEvent.click(screen.getByText(c.tile));
      fireEvent.click(screen.getByText(c.finalButton));
      expect(read().seasonsPlayed).toBe(1);
      expect(gamesPlayed(read().league)).toBe(gamesPlayed(league));
    });

    it('plays the next season after the draft: the record refuses only the closed one', () => {
      const { league, team } = c.finalWeek(lehmer(7));
      save({ league, myTeam: team, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0 });
      const first = render(<Board />);
      fireEvent.click(screen.getByText(c.tile));
      fireEvent.click(screen.getByText(c.finalButton));
      first.unmount();
      /* The reload ends the presser, so the recap's draft button is drawn. */
      render(<Board />);
      fireEvent.click(screen.getByText('Go to the draft'));
      expect(screen.getByText(c.draftHeading)).toBeTruthy();
      for (let i = 0; i < c.picks; i += 1) fireEvent.click(screen.getAllByText(/· age \d+/)[0]);
      expect(read().phase).toBe('hub');
      expect(read().league.season).toBe(2027);
      /* Round 530: the last pick is narrated, so the screen holds the draft
         with its card until Continue is pressed. The save already says hub,
         which is what the two lines above check; the hub itself is not drawn
         until the press. */
      expect(screen.queryByText(c.tile)).toBeNull();
      fireEvent.click(screen.getByText('Continue to the hub'));
      fireEvent.click(screen.getByText(c.tile));
      fireEvent.click(screen.getByText(c.firstButton));
      expect(read().league[c.periodKey]).toBe(2);
      expect(read().seasonsPlayed).toBe(1);
      expect(read().league.champions).toHaveLength(1);
    });
  });

  /* Round 647. What the board handed the completion hook while a finish was
     on screen: the third argument of every call whose second was true. */
  const recorded = (): number[] => completion.mock.calls.filter(a => a[0] === c.slug && a[1] === true).map(a => a[2] as number);
  /* The finishes the real hook would record: it records only a transition it
     witnessed, the flag going from false to true while mounted, with the
     score of that moment. Every mount opens false (no row is closed yet), so
     reading the calls in order and counting the rises is exactly that rule. */
  const finishes = (): number[] => {
    const out: number[] = [];
    let on = false;
    for (const a of completion.mock.calls) {
      if (a[0] !== c.slug) continue;
      if (a[1] === true && !on) out.push(a[2] as number);
      on = a[1] === true;
    }
    return out;
  };
  /* history: a career already under way on a save written before this
     round, with titles and seasons counted and no ledger at all. */
  const closeSeason = (rig: Rig, history: { titles: number; seasonsPlayed: number } = { titles: 0, seasonsPlayed: 0 }) => {
    const { league, team } = c.finalWeek(lehmer(7), rig);
    save({ league, myTeam: team, phase: 'hub', ...history, draftClass: null, picksLeft: 0 });
    const view = render(<Board />);
    expect(recorded(), 'nothing is recorded before the season closes').toHaveLength(0);
    fireEvent.click(screen.getByText(c.tile));
    fireEvent.click(screen.getByText(c.finalButton));
    return { league, team, view, closed: read() };
  };
  const rowOf = (s: any): SeasonRow => {
    expect(Array.isArray(s.ledger), 'the save carries a ledger').toBe(true);
    expect(s.ledger, 'exactly one row for the one season closed').toHaveLength(1);
    return s.ledger[0];
  };

  describe(`${c.name}: the season ledger`, () => {
    let restoreRandom: (() => void) | null = null;
    beforeEach(() => {
      localStorage.clear();
      completion.mockClear();
      const rng = lehmer(11);
      const spy = vi.spyOn(Math, 'random').mockImplementation(rng);
      restoreRandom = () => spy.mockRestore();
    });
    afterEach(() => { cleanup(); restoreRandom?.(); });

    it('a title season adds exactly one row, scored on that season, and records that score once, even on an older save', () => {
      /* A career from before this round: two titles and four seasons in the
         save, no ledger. The season closed now is the first row, and the two
         old titles earn nothing retroactively. */
      const { league, team, closed } = closeSeason('strong', { titles: 2, seasonsPlayed: 4 });
      expect(closed.league.champions[0].team, 'the 99 rated roster did not win the title under this seed; re-seed the rig').toBe(team);
      const row = rowOf(closed);
      expect(row.season).toBe(league.season);
      expect(row.team).toBe(team);
      expect(row.wonTitle).toBe(true);
      expect(row.games).toBeGreaterThan(0);
      expect(row.wins).toBeLessThanOrEqual(row.games);
      expect(row.score).toBe(scoreSeason(row));
      expect(row.score).toBeGreaterThanOrEqual(W_TITLE);
      expect(row.score).toBeLessThanOrEqual(SEASON_CEILING);
      expect(finishes(), 'one finish, and the number it records is the row').toEqual([row.score]);
      expect(ledgerTotal(closed.ledger), 'no retroactive points for the titles the old save already held').toBe(row.score);
      expect(closed.titles).toBe(3);
      expect(closed.seasonsPlayed).toBe(5);
      expect(screen.getByText(/This season/).textContent).toContain(String(row.score));
    });

    it('a season without a title adds exactly one row too, and records it once', () => {
      const { league, team, closed } = closeSeason('weak');
      expect(closed.league.champions[0].team, 'the 40 rated roster won the title under this seed; re-seed the rig').not.toBe(team);
      const row = rowOf(closed);
      expect(row.season).toBe(league.season);
      expect(row.team).toBe(team);
      expect(row.wonTitle).toBe(false);
      expect(row.score).toBe(scoreSeason(row));
      expect(row.score).toBeLessThan(W_TITLE);
      expect(finishes(), 'a season without a title is still a finish, recorded once').toEqual([row.score]);
      expect(ledgerTotal(closed.ledger)).toBe(row.score);
      expect(closed.titles).toBe(0);
      expect(screen.getByText(/This season/).textContent).toContain(String(row.score));
    });

    it('replaying a closed title adds nothing: a reload records nothing and the final week refuses', () => {
      const { league, team, view, closed } = closeSeason('strong');
      const row = rowOf(closed);
      expect(finishes()).toEqual([row.score]);
      view.unmount();

      /* A reload on the recap: the same row, no second finish. */
      render(<Board />);
      expect(screen.getByText(c.headline)).toBeTruthy();
      expect(read().ledger).toHaveLength(1);
      expect(finishes(), 'a reload on the recap is not a finish').toEqual([row.score]);
      expect(screen.getByText(/This season/).textContent).toContain(String(row.score));
      cleanup();

      /* The closed season clicked again from the hub: refused, ledger untouched. */
      save({ league: closed.league, myTeam: team, phase: 'hub', titles: 1, seasonsPlayed: 1, draftClass: null, picksLeft: 0, ledger: closed.ledger });
      render(<Board />);
      fireEvent.click(screen.getByText(c.tile));
      fireEvent.click(screen.getByText(c.finalButton));
      expect(read().ledger).toHaveLength(1);
      expect(read().ledger[0].score).toBe(row.score);
      expect(finishes()).toEqual([row.score]);

      /* And the module itself refuses a second row for the same season. */
      const again = appendSeason(closed.ledger, { ...row });
      expect(again.row).toBeNull();
      expect(again.ledger).toHaveLength(1);
      expect(league.season).toBe(row.season);
    });

    it('every closed season adds its own row: two seasons, two rows, two finishes, and the career is their sum', () => {
      const { view, closed } = closeSeason('strong');
      const first = rowOf(closed);
      view.unmount();
      /* Through the draft on the real board. The reload ends the presser, so
         the recap's draft button is drawn. */
      render(<Board />);
      fireEvent.click(screen.getByText('Go to the draft'));
      for (let i = 0; i < c.picks; i += 1) fireEvent.click(screen.getAllByText(/· age \d+/)[0]);
      const next = read();
      expect(next.phase).toBe('hub');
      expect(next.league.season).toBe(first.season + 1);
      cleanup();
      /* The second season played by the engine to its final week, then closed
         on the board like the first. */
      c.toFinal(next.league, next.myTeam, lehmer(13));
      save(next);
      render(<Board />);
      fireEvent.click(screen.getByText(c.tile));
      fireEvent.click(screen.getByText(c.finalButton));
      const after = read();
      expect(after.ledger.map((r: SeasonRow) => r.season), 'one row per closed season, in order').toEqual([first.season, first.season + 1]);
      expect(after.ledger[0]).toEqual(first);
      const second: SeasonRow = after.ledger[1];
      expect(second.score).toBe(scoreSeason(second));
      expect(finishes(), 'each season recorded once, on its own number').toEqual([first.score, second.score]);
      expect(ledgerTotal(after.ledger)).toBe(first.score + second.score);
      expect(after.seasonsPlayed).toBe(2);
      expect(screen.getByText(/Career/).textContent).toContain(String(first.score + second.score));
    });

    it('the pick of team changes nothing: the same results score the same for every team', () => {
      const { league, closed } = closeSeason('weak');
      const row = rowOf(closed);
      const teams = Object.keys(league.teams);
      expect(teams.length).toBeGreaterThan(10);
      for (const abbr of teams) {
        expect(scoreSeason({ ...row, team: abbr }), `${abbr} with the same results`).toBe(row.score);
        expect(scoreSeason({ ...row, team: abbr, wonTitle: true, reachedFinal: true, madePlayoffs: true }), `${abbr} with a title`).toBe(scoreSeason({ ...row, wonTitle: true, reachedFinal: true, madePlayoffs: true }));
      }
    });
  });
}
