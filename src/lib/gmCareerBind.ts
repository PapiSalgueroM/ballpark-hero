/**
 * Round 1559: the two career calls every Front Office bind makes through the desk host, written once with the
 * sport handed in. Round 1533 wrote them for the NFL (nflLegacy and nflTakeSeat in nflGmCareer.ts) with four NFL
 * facts inside: how the season is read for the owner's grade, how a desk is opened on a save that has none, what
 * the engine's pick lists are rebuilt from, and what the club he leaves gets back (its saved depth chart). Those
 * four are the GmCareerSport spec below; the loop around them is the same in every sport (CLAUDE.md, one engine,
 * many sports). nflGmCareer.ts keeps its two names as one line each over this file, so the NFL board compiles and
 * plays unedited; the NHL's spec is nhlGmCareer.ts.
 *
 * Imports the host and the face, never an engine. A sport's spec is a FUNCTION that builds the object when it is
 * called (nflCareer(), nhlCareer()), never a module level const holding imported values (the import cycle rule).
 * This file rides in each sport's career kit with the host: no page imports it statically.
 */
import type { GmDesk } from './gmDesk';
import { hostLastGrade, hostLegacy, hostTakeSeat, type GmDeskHost } from './gmDeskHost';
import type { HostBlockRule, HostLegacy } from './gmCareerFace';
import type { FoSeasonOutcome, OwnerMandate } from './foOwnerMandate';
import type { GmSportKey } from './gmSport';
import type { SeatOffer, SeatSave } from './gmSeat';

/** What a sport hands the bind. P is the sport's postseason record (the NFL's rounds, the NHL's series). */
export interface GmCareerSport<L, P> {
  sport: GmSportKey;
  host: GmDeskHost<L>;
  /** The season as the mandate grades it. ONE reader for the verdict at the close and for the legacy read. */
  outcome(league: L, team: string, post: P, champion: string): FoSeasonOutcome;
  /** Who owns each block on a move: HOST_BLOCK_RULES, then the sport's own rows. */
  blocks(): HostBlockRule<L>[];
  /** A desk opened on a save that has none (the first tap on a desk box would open it). Reads the league only. */
  openDesk(league: L, team: string): GmDesk;
  /** The engine's pick lists rebuilt from a desk just opened on a move. */
  syncOpened(league: L, desk: GmDesk): void;
  /** The club he leaves gets its own lineup back to automatic (a club with nobody in the chair picks its own). */
  releaseOldClub(league: L, team: string): void;
}

/** What a board's save says about itself, for the legacy read. */
export interface GmCareerLegacyFacts<P> {
  team: string;
  seasonsPlayed: number;
  titles: number;
  fired: boolean;
  seasonCounted: boolean;
  mandate: OwnerMandate | null;
  post: P;
  champion: string;
}

/** The legacy read of the board's save, the record a save older than the seat block stands on. Never writes. */
export function careerLegacy<L, P>(s: GmCareerSport<L, P>, league: L, f: GmCareerLegacyFacts<P>): HostLegacy {
  const outcome = f.champion ? s.outcome(league, f.team, f.post, f.champion) : null;
  return hostLegacy(s.host, league, {
    team: f.team, seasonsPlayed: f.seasonsPlayed, titles: f.titles, fired: f.fired, seasonCounted: f.seasonCounted,
    lastGrade: f.seasonCounted ? hostLastGrade(s.host, league, f.mandate, outcome) : null,
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
 * and his old club's own lineup handed back to automatic. A roster, a pick, a
 * standing or a rival's lineup: none of it moves.
 */
export function careerTakeSeat<L, P, S extends SeatSave>(
  s: GmCareerSport<L, P>, league: L, desk: GmDesk | null, save: S, legacy: HostLegacy, teamId: string,
  nameOf: (id: string) => string,
): { save: S; desk: GmDesk; offer: SeatOffer; opened: boolean } | null {
  const opened = desk === null;
  const start = desk ?? s.openDesk(league, legacy.team);
  const r = hostTakeSeat({ host: s.host, league, desk: start, save, legacy, teamId, nameOf, blocks: s.blocks() });
  if (!r) return null;
  if (opened) s.syncOpened(league, r.desk);
  s.releaseOldClub(league, legacy.team);
  return { ...r, opened };
}
