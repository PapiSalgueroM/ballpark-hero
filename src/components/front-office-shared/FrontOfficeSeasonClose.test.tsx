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
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { ComponentType } from 'react';
import { initLeague, simGame, REGULAR_WEEKS } from '@/lib/frontOffice';
import { initNbaLeague, simRound, NBA_ROUNDS } from '@/lib/nbaFrontOffice';
import { initMlbLeague, simMlbRound, MLB_ROUNDS } from '@/lib/mlbFrontOffice';
import { initNhlLeague, simNhlRound, NHL_FO_ROUNDS } from '@/lib/nhlFrontOffice';

// Completion tracking reads the auth context and writes to the database,
// recordActivity inserts a row through the Supabase client, the share
// buttons draw a canvas card, the reveal scroll calls scrollIntoView which
// jsdom does not have. None is under test and none may touch the network.
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

function lehmer(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
interface BoardCase {
  name: string;
  env: string;
  load: () => Promise<{ default: ComponentType }>;
  saveKey: string;
  /* A league on the morning of its final week or round, with the team the GM runs. */
  finalWeek: (rng: () => number) => { league: any; team: string };
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

const CASES: BoardCase[] = [
  {
    name: 'NFL Front Office', env: 'FO_BOARD_NFL',
    load: () => import('@/components/front-office/FrontOfficeBoard'),
    saveKey: 'front-office-save-v1',
    finalWeek: rng => {
      const lg = initLeague(rng);
      for (let w = 1; w < REGULAR_WEEKS; w += 1) { lg.schedule[w - 1].forEach(g => simGame(g, lg.teams, rng)); lg.week += 1; }
      return { league: lg, team: Object.keys(lg.teams)[0] };
    },
    tile: 'This week', finalButton: 'Play the final week + playoffs',
    headline: /win the 2026 title/, draftHeading: 'The 2027 Draft',
    picks: 3, firstButton: 'Play Week 1', periodKey: 'week',
  },
  {
    name: 'NBA Front Office', env: 'FO_BOARD_NBA',
    load: () => import('@/components/nba-front-office/NbaFrontOfficeBoard'),
    saveKey: 'nba-front-office-save-v1',
    finalWeek: rng => {
      const lg = initNbaLeague(rng);
      const team = Object.keys(lg.teams)[0];
      for (let r = 1; r < NBA_ROUNDS; r += 1) { simRound(lg, team, rng); lg.round += 1; }
      return { league: lg, team };
    },
    tile: 'Play', finalButton: 'Final stretch + playoffs',
    headline: /win the 2026 title/, draftHeading: 'The 2027 Draft',
    picks: 2, firstButton: 'Play Round 1', periodKey: 'round',
  },
  {
    name: 'MLB Front Office', env: 'FO_BOARD_MLB',
    load: () => import('@/components/mlb-front-office/MlbFrontOfficeBoard'),
    saveKey: 'mlb-front-office-save-v1',
    finalWeek: rng => {
      const lg = initMlbLeague(rng);
      const team = Object.keys(lg.teams)[0];
      for (let r = 1; r < MLB_ROUNDS; r += 1) { simMlbRound(lg, team, rng); lg.round += 1; }
      return { league: lg, team };
    },
    tile: 'Play', finalButton: 'Final stretch + October',
    headline: /win the 2026 World Series/, draftHeading: 'The 2027 Draft',
    picks: 2, firstButton: 'Play Round 1', periodKey: 'round',
  },
  {
    name: 'NHL Front Office', env: 'FO_BOARD_NHL',
    load: () => import('@/components/nhl-front-office/NhlFrontOfficeBoard'),
    saveKey: 'nhl-front-office-save-v1',
    finalWeek: rng => {
      const lg = initNhlLeague(rng);
      const team = Object.keys(lg.teams)[0];
      for (let r = 1; r < NHL_FO_ROUNDS; r += 1) { simNhlRound(lg, team, rng); lg.round += 1; }
      return { league: lg, team };
    },
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
      fireEvent.click(screen.getByText(c.tile));
      fireEvent.click(screen.getByText(c.firstButton));
      expect(read().league[c.periodKey]).toBe(2);
      expect(read().seasonsPlayed).toBe(1);
      expect(read().league.champions).toHaveLength(1);
    });
  });
}
