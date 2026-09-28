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
 * Round 647: the second describe per board is the season ledger. Every
 * closed season adds exactly one row to the save, scored against the
 * projection the save carries (made at the pick, and again when the
 * offseason hands over the next roster), and that row's score is what the
 * board hands the completion hook, recorded once (finishes() counts the
 * rises the real hook witnesses); an older save with titles and no ledger
 * gets one row and nothing retroactive, and its sum is labelled as counted
 * since that season; a reload on the recap hands the hook nothing; a closed
 * season played again adds nothing; two seasons played in one sitting on one
 * mounted board are two rows and two finishes (the closed row has to reset
 * between them); and the projection is the pick's, so a roster made better
 * after the pick beats it, while the same season scored against the roster
 * at the whistle would not. The roster is rigged to force the outcomes
 * (every player 99, every player 40) because the seeded rng decides the
 * rest. scripts/simGmReload.mjs section 2 runs these rows and carries their
 * controls: SEASON_LEDGER_MODULE points the boards and this file at a copy
 * of src/lib/seasonLedger.ts with one rule put back, and the FO_BOARD_*
 * variables at board copies that project at the whistle or never reset the
 * closed row, and exactly the rows written for that fault must then fail.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { ComponentType } from 'react';
import { initLeague, simGame, REGULAR_WEEKS } from '@/lib/frontOffice';
import { initNbaLeague, simRound, NBA_ROUNDS } from '@/lib/nbaFrontOffice';
import { initMlbLeague, simMlbRound, MLB_ROUNDS } from '@/lib/mlbFrontOffice';
import { initNhlLeague, simNhlRound, NHL_FO_ROUNDS } from '@/lib/nhlFrontOffice';
import { scoreSeason, appendSeason, ledgerTotal, projectionFor, PAR, SEASON_CEILING, type SeasonExpectation, type SeasonRow } from '@/lib/seasonLedger';
import { NFL_SEASON, NBA_SEASON, MLB_SEASON, NHL_SEASON, type SeasonShape } from '@/lib/seasonFormats';
import { FO_TEAMS } from '@/data/frontOfficePlayers';
import { NBA_TEAMS } from '@/data/conquestDataNba';
import { MLB_TEAMS } from '@/data/conquestDataMlb';
import { NHL_TEAMS } from '@/data/conquestDataNhl';

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
   no playoffs. Applied after the pick is projected and before the regular
   season is played, so the record matches the roster the way it would in
   play and the projection is of the roster the pick handed over. */
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
  /* Round 647: the sport's season shape, which the board projects with. */
  shape: SeasonShape<any>;
  /* A league on the morning of its final week or round, with the team the
     GM runs, and the projection made from the league the pick handed over,
     before any rig. */
  finalWeek: (rng: () => number, rig?: Rig) => { league: any; team: string; pickExpect: SeasonExpectation };
  /* Round 647: play a league from wherever it stands to the morning of its
     final week or round. */
  toFinal: (league: any, team: string, rng: () => number) => void;
  /* Round 647: the first team on the pick screen, by its label, and its id. */
  pick: () => { label: string; id: string };
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
   final week or round. */
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
/* Round 647: a league's projection for one team, the way the boards make it. */
const projectOf = (shape: SeasonShape<any>, lg: any, team: string): SeasonExpectation =>
  projectionFor(shape.teams(lg), shape.format, lg.season, team);
const opening = (shape: SeasonShape<any>, init: (rng: () => number) => any, toFinal: BoardCase['toFinal']) =>
  (rng: () => number, rig?: Rig) => {
    const lg = init(rng);
    const team = Object.keys(lg.teams)[0];
    const pickExpect = projectOf(shape, lg, team);
    rigLeague(lg.teams, team, rig);
    toFinal(lg, team, rng);
    return { league: lg, team, pickExpect };
  };

const CASES: BoardCase[] = [
  {
    name: 'NFL Front Office', env: 'FO_BOARD_NFL',
    load: () => import('@/components/front-office/FrontOfficeBoard'),
    saveKey: 'front-office-save-v1', slug: 'front-office', shape: NFL_SEASON,
    finalWeek: opening(NFL_SEASON, initLeague, nflToFinal),
    toFinal: nflToFinal,
    pick: () => ({ label: `${FO_TEAMS[0].city} ${FO_TEAMS[0].name}`, id: FO_TEAMS[0].abbr }),
    tile: 'This week', finalButton: 'Play the final week + playoffs',
    headline: /win the 2026 title/, draftHeading: 'The 2027 Draft',
    picks: 3, firstButton: 'Play Week 1', periodKey: 'week',
  },
  {
    name: 'NBA Front Office', env: 'FO_BOARD_NBA',
    load: () => import('@/components/nba-front-office/NbaFrontOfficeBoard'),
    saveKey: 'nba-front-office-save-v1', slug: 'nba-front-office', shape: NBA_SEASON,
    finalWeek: opening(NBA_SEASON, initNbaLeague, nbaToFinal),
    toFinal: nbaToFinal,
    pick: () => ({ label: `${NBA_TEAMS[0].city} ${NBA_TEAMS[0].name}`, id: NBA_TEAMS[0].id }),
    tile: 'Play', finalButton: 'Final stretch + playoffs',
    headline: /win the 2026 title/, draftHeading: 'The 2027 Draft',
    picks: 2, firstButton: 'Play Round 1', periodKey: 'round',
  },
  {
    name: 'MLB Front Office', env: 'FO_BOARD_MLB',
    load: () => import('@/components/mlb-front-office/MlbFrontOfficeBoard'),
    saveKey: 'mlb-front-office-save-v1', slug: 'mlb-front-office', shape: MLB_SEASON,
    finalWeek: opening(MLB_SEASON, initMlbLeague, mlbToFinal),
    toFinal: mlbToFinal,
    pick: () => ({ label: `${MLB_TEAMS[0].city} ${MLB_TEAMS[0].name}`, id: MLB_TEAMS[0].id }),
    tile: 'Play', finalButton: 'Final stretch + October',
    headline: /win the 2026 World Series/, draftHeading: 'The 2027 Draft',
    picks: 2, firstButton: 'Play Round 1', periodKey: 'round',
  },
  {
    name: 'NHL Front Office', env: 'FO_BOARD_NHL',
    load: () => import('@/components/nhl-front-office/NhlFrontOfficeBoard'),
    saveKey: 'nhl-front-office-save-v1', slug: 'nhl-front-office', shape: NHL_SEASON,
    finalWeek: opening(NHL_SEASON, initNhlLeague, nhlToFinal),
    toFinal: nhlToFinal,
    pick: () => ({ label: `${NHL_TEAMS[0].city} ${NHL_TEAMS[0].name}`, id: NHL_TEAMS[0].id }),
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
     round, with titles and seasons counted and no ledger and no projection
     at all. Otherwise the save carries the pick's projection. */
  const closeSeason = (rig: Rig, history?: { titles: number; seasonsPlayed: number }) => {
    const { league, team, pickExpect } = c.finalWeek(lehmer(7), rig);
    save({
      league, myTeam: team, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0,
      ...(history ?? { expect: pickExpect }),
    });
    const view = render(<Board />);
    expect(recorded(), 'nothing is recorded before the season closes').toHaveLength(0);
    fireEvent.click(screen.getByText(c.tile));
    fireEvent.click(screen.getByText(c.finalButton));
    return { league, team, pickExpect, view, closed: read() };
  };
  const rowOf = (s: any): SeasonRow => {
    expect(Array.isArray(s.ledger), 'the save carries a ledger').toBe(true);
    expect(s.ledger, 'exactly one row for the one season closed').toHaveLength(1);
    return s.ledger[0];
  };
  const expOf = (row: SeasonRow) => ({ share: row.expShare, ladder: row.expLadder });
  /* Play the hub's season to its final week or round on the mounted board,
     one period at a time, the way a player does. */
  const playToFinal = () => {
    for (let i = 0; i < 200 && !screen.queryByText(c.finalButton); i += 1) {
      const next = screen.queryByText(/^Play (Week|Round) \d+$/);
      if (next) fireEvent.click(next);
      else fireEvent.click(screen.getByText(c.tile));
    }
    fireEvent.click(screen.getByText(c.finalButton));
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

    it('a title season adds exactly one row, scored against the projection the save carries, and records it once', () => {
      const { league, team, pickExpect, closed } = closeSeason('strong');
      expect(closed.league.champions[0].team, 'the 99 rated roster did not win the title under this seed; re-seed the rig').toBe(team);
      const row = rowOf(closed);
      expect(row.season).toBe(league.season);
      expect(row.team).toBe(team);
      expect(row.stage, 'a title is the round past the last').toBe(row.rounds + 1);
      expect(row.games).toBeGreaterThan(0);
      expect(row.wins).toBeLessThanOrEqual(row.games);
      expect(row.expShare).toBe(pickExpect.share);
      expect(row.expLadder).toBe(pickExpect.ladder);
      expect(row.score).toBe(scoreSeason(row, pickExpect));
      expect(row.score, 'a 99 rated roster beats an ordinary roster\'s projection by far').toBeGreaterThan(PAR + 10);
      expect(row.score).toBeLessThanOrEqual(SEASON_CEILING);
      expect(finishes(), 'one finish, and the number it records is the row').toEqual([row.score]);
      expect(ledgerTotal(closed.ledger)).toBe(row.score);
      expect(closed.titles).toBe(1);
      expect(screen.getByText(/This season/).textContent).toContain(String(row.score));
      expect(screen.getByText(/Career/).textContent).toContain(String(row.score));
      expect(screen.getByText(/before your moves/).textContent).toContain(`won ${row.wins}`);
    });

    it('a season without a title adds exactly one row too, and records it once', () => {
      const { league, team, pickExpect, closed } = closeSeason('weak');
      expect(closed.league.champions[0].team, 'the 40 rated roster won the title under this seed; re-seed the rig').not.toBe(team);
      const row = rowOf(closed);
      expect(row.season).toBe(league.season);
      expect(row.team).toBe(team);
      expect(row.stage).toBeLessThanOrEqual(row.rounds);
      expect(row.score).toBe(scoreSeason(row, pickExpect));
      expect(row.score, 'a 40 rated roster falls short of an ordinary roster\'s projection').toBeLessThan(PAR);
      expect(finishes(), 'a season without a title is still a finish, recorded once').toEqual([row.score]);
      expect(ledgerTotal(closed.ledger)).toBe(row.score);
      expect(closed.titles).toBe(0);
      expect(screen.getByText(/This season/).textContent).toContain(String(row.score));
    });

    it('an older save adds one row and nothing retroactive, and labels the sum as counted since that season', () => {
      /* A career from before this round: two titles and four seasons in the
         save, no ledger and no projection. The board projects the season
         from the league as it loads, the season closed now is the first row,
         and the two old titles earn nothing retroactively. */
      const { league, team, closed } = closeSeason('strong', { titles: 2, seasonsPlayed: 4 });
      const row = rowOf(closed);
      const repaired = projectOf(c.shape, league, team);
      expect(row.expShare, 'projected from the league as the save loaded').toBe(repaired.share);
      expect(row.expLadder).toBe(repaired.ladder);
      expect(row.score).toBe(scoreSeason(row, repaired));
      expect(finishes()).toEqual([row.score]);
      expect(ledgerTotal(closed.ledger), 'no retroactive points for the titles the old save already held').toBe(row.score);
      expect(closed.titles).toBe(3);
      expect(closed.seasonsPlayed).toBe(5);
      expect(screen.getByText(/Since 2026/).textContent, 'the sum is the ledger since 2026, not the career').toContain(String(row.score));
      expect(screen.queryByText(/Career/), 'five seasons played and one row: the chip must not call the sum the career').toBeNull();
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
      save({ league: closed.league, myTeam: team, phase: 'hub', titles: 1, seasonsPlayed: 1, draftClass: null, picksLeft: 0, ledger: closed.ledger, expect: closed.expect });
      render(<Board />);
      fireEvent.click(screen.getByText(c.tile));
      fireEvent.click(screen.getByText(c.finalButton));
      expect(read().ledger).toHaveLength(1);
      expect(read().ledger[0].score).toBe(row.score);
      expect(finishes()).toEqual([row.score]);

      /* And the module itself refuses a second row for the same season. */
      const again = appendSeason(closed.ledger, { ...row }, expOf(row));
      expect(again.row).toBeNull();
      expect(again.ledger).toHaveLength(1);
      expect(league.season).toBe(row.season);
    });

    it('every closed season adds its own row: two seasons in one sitting, two rows, two finishes, and the career is their sum', () => {
      const { closed } = closeSeason('strong');
      const first = rowOf(closed);
      /* The whole second season on the SAME mounted board: the presser, the
         draft, the offseason, every period and the final one. The board's
         closed row has to reset between the two seasons, or the second close
         is no rise and records nothing; a remount would hide that. */
      fireEvent.click(screen.getByText('Measured'));
      fireEvent.click(screen.getByText('Go to the draft'));
      for (let i = 0; i < c.picks; i += 1) fireEvent.click(screen.getAllByText(/· age \d+/)[0]);
      const next = read();
      expect(next.phase).toBe('hub');
      expect(next.league.season).toBe(first.season + 1);
      const offseasonExpect = projectOf(c.shape, next.league, next.myTeam);
      expect(next.expect, 'next season is projected from the roster the offseason hands over').toEqual(offseasonExpect);
      fireEvent.click(screen.getByText('Continue to the hub'));
      playToFinal();
      const after = read();
      expect(after.ledger.map((r: SeasonRow) => r.season), 'one row per closed season, in order').toEqual([first.season, first.season + 1]);
      expect(after.ledger[0]).toEqual(first);
      const second: SeasonRow = after.ledger[1];
      expect(second.expShare, 'the second season is scored against the offseason\'s projection').toBe(offseasonExpect.share);
      expect(second.score).toBe(scoreSeason(second, offseasonExpect));
      expect(finishes(), 'each season recorded once, on its own number, on one mount').toEqual([first.score, second.score]);
      expect(ledgerTotal(after.ledger)).toBe(first.score + second.score);
      expect(after.seasonsPlayed).toBe(2);
      expect(screen.getByText(/Career/).textContent).toContain(String(first.score + second.score));
    });

    it('the projection is the pick\'s: a season is scored against what its roster was projected to do, not the roster at the whistle', () => {
      /* The pick, on the real pick screen. */
      const { label, id } = c.pick();
      render(<Board />);
      fireEvent.click(screen.getByText(label));
      const picked = read();
      expect(picked.myTeam).toBe(id);
      const pickExpect = projectOf(c.shape, picked.league, id);
      expect(picked.expect, 'the pick is projected the moment it is made, from the roster it hands over').toEqual(pickExpect);
      cleanup();
      /* The roster that plays is better than the one projected, and the
         season is played to its final week on it. */
      rigLeague(picked.league.teams, id, 'strong');
      c.toFinal(picked.league, id, lehmer(7));
      const atWhistle = projectOf(c.shape, picked.league, id);
      save(picked);
      render(<Board />);
      fireEvent.click(screen.getByText(c.tile));
      fireEvent.click(screen.getByText(c.finalButton));
      const row = rowOf(read());
      expect(row.expShare, 'scored against the pick\'s projection').toBe(pickExpect.share);
      expect(row.expLadder).toBe(pickExpect.ladder);
      expect(row.score).toBe(scoreSeason(row, pickExpect));
      expect(scoreSeason(row, atWhistle), 'the same season against the roster at the whistle would score less: the pick sets the bar, the moves after it beat it').toBeLessThan(row.score);
    });
  });
}
