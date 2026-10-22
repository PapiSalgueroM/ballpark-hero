/**
 * Round 1550: the two NFL career calls that need the whole desk host, moved out of nflGmDesk.ts word for word.
 *
 * nflLegacy reads a save older than the record through the NFL adapter (the club's tier today, the last grade),
 * and nflTakeSeat moves him to another club through the host's market. Both need gmDeskHost.ts, its adapter
 * (gmDeskHostNfl.ts, with the seat packs) and the job market behind it, which the board no longer downloads with
 * the page: it fetches this file, through src/lib/nflCareerKit.ts, at a season's close, on the fired and out of
 * work screens, when a career box is opened and when a new front office starts. Everything else of the NFL
 * career (the block rules, the year out, the season counted rule, the trees it routes) stays in nflGmDesk.ts.
 */
import { DEPTH_GROUPS, resetDepth, type LeagueState, type PlayoffRound } from './frontOffice';
import type { GmDesk } from './gmDesk';
import { hostLastGrade, hostLegacy, hostTakeSeat, type HostLegacy } from './gmDeskHost';
import type { SeatOffer, SeatSave } from './gmSeat';
import { nflDeskHost } from './gmDeskHostNfl';
import type { OwnerMandate } from './foOwnerMandate';
import { nflDeskBlockRules, nflOutcome, nflPicksOf, openNflDesk, syncNflPicks } from './nflGmDesk';

/** The legacy read of the board's save, the record a save older than the seat block stands on. Never writes. */
export function nflLegacy(league: LeagueState, f: {
  team: string; seasonsPlayed: number; titles: number; fired: boolean; seasonCounted: boolean;
  mandate: OwnerMandate | null; rounds: PlayoffRound[]; champion: string;
}): HostLegacy {
  const outcome = f.champion ? nflOutcome(league, f.team, f.rounds, f.champion) : null;
  return hostLegacy(nflDeskHost, league, {
    team: f.team, seasonsPlayed: f.seasonsPlayed, titles: f.titles, fired: f.fired, seasonCounted: f.seasonCounted,
    lastGrade: f.seasonCounted ? hostLastGrade(nflDeskHost, league, f.mandate, outcome) : null,
  });
}

/**
 * Take a job in the same league. MUTATES the league handed in (the board
 * hands a copy), and only once the move is made: null, and the league as it
 * was, when the host refuses (he holds a seat, or that club is not in the
 * feed the market reads today).
 *
 * A save whose desk is off opens it here, on his old club, as the first tap
 * on a desk box would (the arm line said so). Then on the league, and nothing
 * else: the pick lists rebuilt from the ledger when the desk was just opened,
 * and his old club's saved depth chart handed back to automatic (a club with
 * nobody in the chair orders its own depth). A roster, a pick, a standing or a
 * rival's chart: none of it moves.
 */
export function nflTakeSeat<S extends SeatSave>(
  league: LeagueState, desk: GmDesk | null, save: S, legacy: HostLegacy, teamId: string, nameOf: (id: string) => string,
): { save: S; desk: GmDesk; offer: SeatOffer; opened: boolean } | null {
  const opened = desk === null;
  const start = desk ?? openNflDesk(league, legacy.team);
  const r = hostTakeSeat({ host: nflDeskHost, league, desk: start, save, legacy, teamId, nameOf, blocks: nflDeskBlockRules() });
  if (!r) return null;
  if (opened) syncNflPicks(league, nflPicksOf(r.desk, league));
  const old = league.teams[legacy.team];
  if (old) for (const pos of DEPTH_GROUPS) resetDepth(old, pos);
  return { ...r, opened };
}
