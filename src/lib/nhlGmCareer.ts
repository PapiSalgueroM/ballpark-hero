/**
 * Round 1559: the GM's career on the NHL Front Office, the NHL's facts for the shared bind (gmCareerBind.ts) and
 * its season with nobody in the chair. Nothing here is the career's loop: that is the desk host's (gmDeskHost.ts)
 * and the bind's, written once for every sport (CLAUDE.md, one engine, many sports). This file holds only what is
 * the NHL's: how its season is read for the owner's grade (a series bracket), who owns each of its desk blocks on a
 * move, what the club he leaves gets back (its contributors, back to automatic), and the board's own engine calls
 * in the board's own order for a year out (NhlFrontOfficeBoard.tsx: playRound, draftWithoutPicks, finishDraft).
 *
 * THIS ROUND IS DARK: no page imports this file yet. Round 1561 binds the NHL board to it through the NHL career kit
 * (src/components/nhl-front-office/nhlCareerKit.ts), fetched the way the NFL's is. scripts/simGmCareer.mjs drives
 * it as its 'nhl' row.
 */
import {
  NHL_FO_ROUNDS, nhlAiDraftPicks, nhlAiMoves, nhlDraftClass, nhlFoStandings, nhlOffseason, nhlResetContributors,
  runNhlFoPlayoffs, simNhlRound, type NhlLeague, type NhlSeriesResult,
} from './nhlFrontOffice';
import { withGmBlock, type GmDesk } from './gmDesk';
import { openLedger } from './gmContracts';
import { rollLedger } from './gmPicks';
import { keepRetainedOverSummer } from './gmTradePackage';
import { HOST_BLOCK_RULES, type HostBlockRule } from './gmCareerFace';
import { leagueNames } from './foNames';
import type { GmAwayHost, HostLegacy } from './gmDeskHost';
import { careerLegacy, careerTakeSeat, type GmCareerSport } from './gmCareerBind';
import type { SeatOffer, SeatSave } from './gmSeat';
import { nhlDeskHost } from './gmDeskHostNhl';
import { seriesPostseason, type FoSeasonOutcome, type OwnerMandate } from './foOwnerMandate';
import {
  NHL_DESK_KEYS, freshStaff, nhlGamePickRules, nhlPicksOf, nhlRetainedOf, openNhlDesk, syncNhlPicks,
} from './nhlGmDesk';

type NhlSeries = NhlSeriesResult[];

/**
 * The NHL's four facts for the shared bind. A function, so nothing imported is evaluated at module scope.
 */
export function nhlCareer(): GmCareerSport<NhlLeague, NhlSeries> {
  return {
    sport: 'nhl',
    host: nhlDeskHost,
    outcome: nhlOutcome,
    blocks: nhlDeskBlockRules,
    openDesk: (league, team) => openNhlDesk(league, team),
    syncOpened: (league, desk) => syncNhlPicks(league, nhlPicksOf(desk, league)),
    releaseOldClub: (league, team) => {
      const old = league.teams[team];
      if (old) nhlResetContributors(old);
    },
  };
}

/**
 * The season as the mandate grades it: the board's close (seriesPostseason over the bracket it played). ONE reader
 * for the verdict at the close and for the legacy read of a save at rest, so the two cannot drift.
 */
export function nhlOutcome(league: NhlLeague, team: string, series: NhlSeries, champion: string): FoSeasonOutcome {
  return { wins: league.teams[team].wins, ...seriesPostseason(series, team), wonTitle: champion === team };
}

/**
 * Who owns each block when he changes clubs: the host's two rows (his record and his XP travel with him), then the
 * NHL's four. The re-sign ledger and the staff are the club's (the club he joins hands him its own); the pick ledger
 * and the retained salary rows are the league's (a retained row is a club still paying a man it traded, whoever
 * runs it) and stay as they are.
 */
export function nhlDeskBlockRules(): HostBlockRule<NhlLeague>[] {
  return [
    ...(HOST_BLOCK_RULES as HostBlockRule<NhlLeague>[]),
    { key: NHL_DESK_KEYS.contracts, owner: 'club', fresh: (league, team) => openLedger(league, team) },
    { key: NHL_DESK_KEYS.staff, owner: 'club', fresh: (league, team) => freshStaff(league, team) },
    { key: NHL_DESK_KEYS.picks, owner: 'league' },
    { key: NHL_DESK_KEYS.retained, owner: 'league' },
  ];
}

/** The legacy read of the board's save, the record a save older than the seat block stands on. Never writes. */
export function nhlLegacy(league: NhlLeague, f: {
  team: string; seasonsPlayed: number; titles: number; fired: boolean; seasonCounted: boolean;
  mandate: OwnerMandate | null; series: NhlSeries; champion: string;
}): HostLegacy {
  return careerLegacy(nhlCareer(), league, { ...f, post: f.series });
}

/**
 * Take a job in the same league (careerTakeSeat, gmCareerBind.ts, says what moves and what never does). MUTATES the
 * league handed in (the board hands a copy), and only once the move is made.
 */
export function nhlTakeSeat<S extends SeatSave>(
  league: NhlLeague, desk: GmDesk | null, save: S, legacy: HostLegacy, teamId: string, nameOf: (id: string) => string,
): { save: S; desk: GmDesk; offer: SeatOffer; opened: boolean } | null {
  return careerTakeSeat(nhlCareer(), league, desk, save, legacy, teamId, nameOf);
}

/**
 * The write side of a season with nobody in his chair (the host's hostSeasonAway calls these in its own order). The
 * board's own engine calls in the board's own order, with no user club: the id '' is no club's. A factory, because
 * the first step hands the club that let him go its contributors back.
 *
 * - The draft: the class openDraft deals when the chair is empty (its size rule with no picks of his), then
 *   draftWithoutPicks's two batches of the rivals' picks over the standings reversed, read again before each batch,
 *   with nobody filtered out.
 * - The summer: the pick ledger and the retained rows read before the engine runs (the desk summer's order), the
 *   engine's offseason with no user club (noUserClub: every club trimmed to the roster limit, the old one too), then
 *   the ledger rolled and every engine list rebuilt from it, and the retained rows kept at their figures. The
 *   re-sign ledger and the staff are the old club's and stay as they are: taking a seat opens both again.
 * - A round: playRound's order (the round, the rivals' moves), the round moved on below the last one.
 * - The playoffs: runNhlFoPlayoffs, the champion recorded as playRound records it.
 * Nothing here draws from Math.random: the board hands its stream in.
 */
export function nhlAwayHost(oldTeam: string): GmAwayHost<NhlLeague> {
  return {
    awayDraft(league, rng) {
      const old = league.teams[oldTeam];
      if (old) nhlResetContributors(old);
      let cls = nhlDraftClass(rng, 24, leagueNames(league));
      for (let batch = 0; batch < 2; batch++) {
        const order = nhlFoStandings(league).map(t => t.abbr).reverse();
        cls = nhlAiDraftPicks(league, cls, order, rng).remaining;
      }
    },
    awaySummer(league, rng, desk) {
      const closed = league.season;
      const ids = Object.keys(league.teams);
      const before = nhlPicksOf(desk, league);
      const retainedBefore = nhlRetainedOf(desk);
      nhlOffseason(league, rng, undefined, { noUserClub: true });
      const picks = rollLedger(before, ids, closed, nhlGamePickRules());
      syncNhlPicks(league, picks);
      const retained = keepRetainedOverSummer(league.teams, retainedBefore);
      return withGmBlock(withGmBlock(desk, NHL_DESK_KEYS.picks, picks), NHL_DESK_KEYS.retained, retained);
    },
    periods: () => NHL_FO_ROUNDS,
    playRound(league, rng) {
      simNhlRound(league, '', rng);
      nhlAiMoves(league, '', rng);
      if (league.round < NHL_FO_ROUNDS) league.round += 1;
    },
    playoffs(league, rng) {
      const { champion } = runNhlFoPlayoffs(league, rng);
      league.champions.push({ season: league.season, team: champion });
      return champion;
    },
  };
}
