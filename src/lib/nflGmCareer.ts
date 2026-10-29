/**
 * Round 1550: the NFL career calls that need the whole desk host, and the three only they read, moved out of
 * nflGmDesk.ts word for word (nflOutcome, nflDeskBlockRules, nflAwayHost: the season graded, who owns a block on
 * a move, a season with nobody in his chair).
 *
 * nflLegacy reads a save older than the record through the NFL adapter (the club's tier today, the last grade),
 * and nflTakeSeat moves him to another club through the host's market. Both need gmDeskHost.ts, its adapter
 * (gmDeskHostNfl.ts, with the seat packs) and the job market behind it, which the board no longer downloads with
 * the page: it fetches this file, through src/lib/nflCareerKit.ts, at a season's close, on the fired and out of
 * work screens, when a career box is opened and when a new front office starts. Everything else of the NFL
 * career (the season counted rule, the trees it routes, the sources it pays XP for) stays in nflGmDesk.ts.
 *
 * Round 1559: the bodies of nflLegacy and nflTakeSeat are every sport's and live in gmCareerBind.ts; this file
 * hands them the NFL's four facts through nflCareer() and keeps both names and signatures.
 */
import {
  DEPTH_GROUPS, REGULAR_WEEKS, aiWeeklyMoves, generateDraftClass, injuryPass, nflAiDraftPicks, resetDepth, runOffseason, runPlayoffs, simGame,
  type LeagueState, type PlayoffRound,
} from './frontOffice';
import { withGmBlock, type GmDesk } from './gmDesk';
import { openLedger } from './gmContracts';
import { rollLedger } from './gmPicks';
import { HOST_BLOCK_RULES, type HostBlockRule } from './gmCareerFace';
import { leagueNames } from './foNames';
import type { GmAwayHost, HostLegacy } from './gmDeskHost';
import { careerLegacy, careerTakeSeat, type GmCareerSport } from './gmCareerBind';
import type { SeatOffer, SeatSave } from './gmSeat';
import { nflDeskHost } from './gmDeskHostNfl';
import { nflPostseason, type FoSeasonOutcome, type OwnerMandate } from './foOwnerMandate';
import { NFL_DESK_KEYS, freshStaff, nflGamePickRules, nflPicksOf, openNflDesk, syncNflPicks } from './nflGmDesk';

/**
 * Round 1559: the NFL's four facts for the shared bind (gmCareerBind.ts): the season read for the grade, the
 * blocks' owners on a move, the desk a save with none opens, and the old club's saved depth chart handed back to
 * automatic (a club with nobody in the chair orders its own depth). A function, so nothing imported is evaluated
 * at module scope.
 */
export function nflCareer(): GmCareerSport<LeagueState, PlayoffRound[]> {
  return {
    sport: 'nfl',
    host: nflDeskHost,
    outcome: nflOutcome,
    blocks: nflDeskBlockRules,
    openDesk: (league, team) => openNflDesk(league, team),
    syncOpened: (league, desk) => syncNflPicks(league, nflPicksOf(desk, league)),
    releaseOldClub: (league, team) => {
      const old = league.teams[team];
      if (old) for (const pos of DEPTH_GROUPS) resetDepth(old, pos);
    },
  };
}

/** The legacy read of the board's save, the record a save older than the seat block stands on. Never writes. */
export function nflLegacy(league: LeagueState, f: {
  team: string; seasonsPlayed: number; titles: number; fired: boolean; seasonCounted: boolean;
  mandate: OwnerMandate | null; rounds: PlayoffRound[]; champion: string;
}): HostLegacy {
  return careerLegacy(nflCareer(), league, { ...f, post: f.rounds });
}

/**
 * Take a job in the same league (careerTakeSeat, gmCareerBind.ts, says what moves and what never does). MUTATES
 * the league handed in (the board hands a copy), and only once the move is made.
 */
export function nflTakeSeat<S extends SeatSave>(
  league: LeagueState, desk: GmDesk | null, save: S, legacy: HostLegacy, teamId: string, nameOf: (id: string) => string,
): { save: S; desk: GmDesk; offer: SeatOffer; opened: boolean } | null {
  return careerTakeSeat(nflCareer(), league, desk, save, legacy, teamId, nameOf);
}

/**
 * The season as the mandate grades it. ONE reader for the verdict at the
 * close and for the legacy read of a save at rest, so the two cannot drift.
 * It is the input closeSeason handed gradeSeason before this round.
 */
export function nflOutcome(league: LeagueState, team: string, rounds: PlayoffRound[], champion: string): FoSeasonOutcome {
  return { wins: league.teams[team].wins, ...nflPostseason(rounds, team), wonTitle: champion === team };
}

/**
 * Who owns each block when he changes clubs: the host's two rows (his record
 * and his XP travel with him), then the NFL's three. The re-sign ledger and
 * the staff are the club's (Club Manager's rule: the club he joins hands him
 * its own), the pick ledger is the league's and stays as it is.
 */
export function nflDeskBlockRules(): HostBlockRule<LeagueState>[] {
  return [
    ...(HOST_BLOCK_RULES as HostBlockRule<LeagueState>[]),
    { key: NFL_DESK_KEYS.contracts, owner: 'club', fresh: (league, team) => openLedger(league, team) },
    { key: NFL_DESK_KEYS.staff, owner: 'club', fresh: (league, team) => freshStaff(league, team) },
    { key: NFL_DESK_KEYS.picks, owner: 'league' },
  ];
}

/**
 * The write side of a season with nobody in his chair (the host's
 * hostSeasonAway calls these in its own order). The board's own engine calls
 * in the board's own order, with no user club: the id '' is no club's, and
 * every engine call that takes one skips only that id. A factory, because the
 * first step hands the club that let him go its depth chart back.
 *
 * - The draft: the class openDraft deals when the chair is empty (its size
 *   rule with no picks of his), then draftWithoutPicks's three batches of the
 *   rivals' picks with nobody left out.
 * - The summer: the pick ledger read before the engine runs (the desk
 *   summer's order), the engine's offseason with no user club (so every club
 *   is cut and tagged by the CPU's rule, the old one too), then the ledger
 *   rolled and every engine list rebuilt from it. The re-sign ledger and the
 *   staff are the old club's and stay as they are: taking a seat opens both
 *   again for the club he joins.
 * - A week: playWeek's order (injuries, the rivals' moves, every game), the
 *   week moved on below the last one as playWeek moves it.
 * - The playoffs: the bracket runPlayoffs plays, the champion recorded as
 *   closeSeason records it.
 * Nothing here draws from Math.random: the board hands its stream in.
 */
export function nflAwayHost(oldTeam: string): GmAwayHost<LeagueState> {
  return {
    awayDraft(league, rng) {
      const old = league.teams[oldTeam];
      if (old) for (const pos of DEPTH_GROUPS) resetDepth(old, pos);
      const batches = 3;
      const capital = Object.values(league.teams).reduce((sum, t) => sum + t.picks.length, 0);
      let cls = generateDraftClass(rng, Math.max(40, Math.min(capital, batches * 6)), leagueNames(league));
      for (let i = 0; i < batches; i++) cls = nflAiDraftPicks(league, cls, '', rng).remaining;
    },
    awaySummer(league, rng, desk) {
      const closed = league.season;
      const ids = Object.keys(league.teams);
      const before = nflPicksOf(desk, league);
      runOffseason(league, rng);
      const picks = rollLedger(before, ids, closed, nflGamePickRules());
      syncNflPicks(league, picks);
      return withGmBlock(desk, NFL_DESK_KEYS.picks, picks);
    },
    periods: () => REGULAR_WEEKS,
    playRound(league, rng) {
      injuryPass(league.teams, rng);
      aiWeeklyMoves(league, '', rng);
      for (const g of league.schedule[league.week - 1]) simGame(g, league.teams, rng);
      if (league.week < REGULAR_WEEKS) league.week += 1;
    },
    playoffs(league, rng) {
      const { champion } = runPlayoffs(league.teams, rng);
      league.champions.push({ season: league.season, team: champion });
      return champion;
    },
  };
}
