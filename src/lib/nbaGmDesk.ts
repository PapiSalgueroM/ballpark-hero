/**
 * Round 1018: the NBA Front Office takes the GM desk, the way the NHL did in
 * Round 987 (src/lib/nhlGmDesk.ts is the shape this file copies).
 *
 * The shared GM modules (the seam of Round 907, the re-sign desk of 908, the
 * pick ledger, packages and deadline of 909, the staff of 910) bound to the
 * NBA engine. This file is what the board hands the desk and what the desk
 * hands the engine back. The screens are
 * components/nba-front-office/NbaGmDesk.tsx. Nothing in here draws from
 * Math.random: every roll is a hash, so a board that binds this moves none of
 * its own seeded streams by a single draw.
 *
 * THE PROMISE TO AN OLD SAVE. A save written before this round has no `gm`
 * field, and while it has none the board plays exactly as it always did: the
 * same calls, the same draws, the same coin flip at the summer. The desk is
 * switched on by the GM, the first time he opens one of its boxes
 * (openNbaDesk), and a new front office opens with it on. Three blocks ride
 * on the save:
 *   contracts  the re-sign ledger (gmContracts): his expiring men go to the
 *              desk, never to the engine's coin flip, with Bird rights, the
 *              rookie scale and restricted free agency (gmContractRules)
 *   picks      the pick ledger (gmPicks) over the league's two round draft,
 *              seven drafts deep as the league trades them
 *   staff      the staff block (gmStaff) and the purse it is paid from
 * There is no retained salary block: NBA_TRADE_RULES carries none. Each
 * block is validated alone and a corrupt one resets alone (gmBlock).
 *
 * The luxury tax and the aprons (Round 722) are the engine's and are not
 * touched: the tax still bills whatever payroll the desk leaves, and a
 * package over the first apron must send out at least what it takes back.
 *
 * scripts/simNbaGmDesk.mjs holds every promise in here to the engine.
 */
import { type GmDesk, type GmTileFace, freshGmDesk, gmBlock, withGmBlock } from './gmDesk';
import {
  type GmContractHost, type GmContractLedger, type GmDecision, autoDecide, expiringMen, isValidLedger, noteArrival,
  openLedger, runDeskOffseason, undecided,
} from './gmContracts';
import { nbaContractHost } from './gmContractsHostNba';
import {
  type GmPickLedger, type GmPickRules, NBA_PICK_RULES, findPick, migrateLegacyPicks, movePicks, pickKey,
  pickSwapRefusal, picksHeldBy, rollLedger, validateLedger,
} from './gmPicks';
import {
  NBA_DEADLINE, type DeadlineStance, deadlineStances, stanceValue, tradeWindow, type TradeWindow,
} from './gmDeadline';
import {
  NBA_TRADE_RULES, type PackageContext, type PackageVerdict, type PickValueCurve, type TradeAsset, type TradePackage,
  evaluatePackage, pickValueAt, proposePackage,
} from './gmTradePackage';
import {
  type GmStaffBlock, type GmStaffCtx, gmDefaultStaff, gmHashFloat, gmInjuryWeeks, gmIsValidStaff, gmRolloverStaff,
  gmScoutNoise, gmStaffEffect, gmStaffLevel, gmStatureAnchor, gmSummerWalk, gmTickStaff,
} from './gmStaff';
import { tradeRefusal } from './frontOfficeCuts';
import { NBA_ROOKIE_SCALE_ROUND, NBA_ROOKIE_SCALE_YEARS } from './gmContractRules';
import { NBA_STAFF_PACK, type NbaStaffPost } from '@/data/gmStaff/packs';
import { nbaReconcileRotation } from './nbaRotation';
import {
  EAST, NBA_ROSTER_MAX, NBA_ROSTER_MIN, NBA_ROUNDS, type NbaGmPlayer, type NbaLeague, type NbaProspect,
  type NbaRoundOptions, nbaCapRoom, nbaCapUsed, nbaFirstApron, nbaOffseason, nbaStrength, nbaTradeValue,
} from './nbaFrontOffice';

/* ------------------------------------------------------------------ */
/* The blocks                                                          */
/* ------------------------------------------------------------------ */

export const NBA_DESK_KEYS = { contracts: 'contracts', picks: 'picks', staff: 'staff' } as const;

/**
 * The pick rules this game drafts under: the league's own (gmPicks, read on
 * 2026-10-02), two rounds as the league has, with what draft night here does
 * differently said out loud. A function, not a constant, so nothing imported
 * is read at module scope.
 */
export function nbaGamePickRules(): GmPickRules {
  return {
    ...NBA_PICK_RULES,
    partial: [
      ...NBA_PICK_RULES.partial,
      'The lottery is in the rules, but draft night here is the game\'s own short draft: you pick first in each batch, then the other clubs go in reverse standings.',
    ],
  };
}

/** The staff block and the purse its fees and pay offs come out of. */
export interface NbaStaffState {
  block: GmStaffBlock<NbaStaffPost>;
  /** In the pack's purse unit (the game's own millions). Ownership refills it every summer. */
  purse: number;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function isNbaStaffState(v: unknown): v is NbaStaffState {
  return isObj(v) && gmIsValidStaff(NBA_STAFF_PACK.rules, v.block) && isNum(v.purse) && v.purse >= 0;
}

/** What the desk reads from the board to set up its staff. */
export function nbaStaffCtx(league: NbaLeague, team: string): GmStaffCtx<NbaStaffPost> {
  const ids = Object.keys(league.teams).sort();
  const ranked = [...ids].sort((a, b) => nbaStrength(league.teams[b]) - nbaStrength(league.teams[a]) || a.localeCompare(b));
  const rank = Math.max(0, ranked.indexOf(team));
  const stature = ids.length > 1 ? 1 - rank / (ids.length - 1) : 0.5;
  return {
    owner: team, world: 'nba', season: league.season, week: league.round, money: 1,
    anchor: post => gmStatureAnchor(team, post, stature, NBA_STAFF_PACK.rules.maxLevel),
    inHouse: 2,
    rivals: () => ids.filter(id => id !== team),
  };
}

const freshPicks = (league: NbaLeague): GmPickLedger =>
  /* Every marker on every club's old list is kept: the draft for this season
     is the year the old list was for, and the later years start whole. */
  migrateLegacyPicks(league.teams, league.season, nbaGamePickRules(), 2).ledger;

/**
 * Day one: the staff the club already had, so level 1 in every chair, the
 * job done the way the engine always did it. Only the user's club has a
 * desk, so a staff anchored to the club's size would hand a big club an edge
 * nobody else gets for nothing (Boston went from 5 titles in 40 seeds to 19
 * on the day it opened). The edge is what the GM hires: the shortlist still
 * reads the club's size (nbaStaffCtx), so a big club attracts better men.
 */
const freshStaff = (league: NbaLeague, team: string): NbaStaffState => ({
  block: gmDefaultStaff(NBA_STAFF_PACK.rules, { ...nbaStaffCtx(league, team), anchor: () => 1 }),
  purse: NBA_STAFF_PACK.money.seasonPurse,
});

/** The desk the first time the GM opens it. Reads the league, never changes it. */
export function openNbaDesk(league: NbaLeague, team: string): GmDesk {
  let desk = freshGmDesk();
  desk = withGmBlock(desk, NBA_DESK_KEYS.contracts, openLedger(league, team));
  desk = withGmBlock(desk, NBA_DESK_KEYS.picks, freshPicks(league));
  desk = withGmBlock(desk, NBA_DESK_KEYS.staff, freshStaff(league, team));
  return desk;
}

export function nbaContractsOf(desk: GmDesk, league: NbaLeague, team: string): GmContractLedger {
  return gmBlock(desk, NBA_DESK_KEYS.contracts, v => isValidLedger(v) && v.team === team, () => openLedger(league, team));
}

export function nbaPicksOf(desk: GmDesk, league: NbaLeague): GmPickLedger {
  const ids = Object.keys(league.teams);
  return gmBlock(desk, NBA_DESK_KEYS.picks, v => validateLedger(v, ids, nbaGamePickRules()) !== null, () => freshPicks(league));
}

export function nbaStaffOf(desk: GmDesk, league: NbaLeague, team: string): NbaStaffState {
  return gmBlock(desk, NBA_DESK_KEYS.staff, isNbaStaffState, () => freshStaff(league, team));
}

/** A deep copy that survives JSON, the only shape a save block may have. */
export const deskCopy = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/* ------------------------------------------------------------------ */
/* The staff's effects                                                 */
/* ------------------------------------------------------------------ */

/**
 * How much of a point at one end of the floor reaches the game. The engine
 * has one strength number for both ends (nbaStrength: the five starters and
 * three off the bench, every rating counted whole), so a coach's point at the
 * offensive end is half a point on that number, and so is one at the
 * defensive end. The half is this game's own reading, not a claim about how
 * much of basketball either end decides, and the screen says so.
 */
export const NBA_END_WEIGHT = 0.5;

/**
 * Strength points the staff adds to the club. Zero for a desk of level 1 men
 * or empty chairs. The head coach and the lead assistant each carry both
 * ends, so together they reach three points at the top of the ladder.
 */
export function nbaStaffEdge(block: GmStaffBlock<NbaStaffPost> | null | undefined): number {
  const e = (key: string) => gmStaffEffect(NBA_STAFF_PACK, block, key);
  return (e('offEdge') + e('defEdge')) * NBA_END_WEIGHT;
}

/** The medical post's ladder, off the pack, so the number on the tile is the number applied. */
function medicalEffect() {
  return NBA_STAFF_PACK.posts.find(p => p.id === 'medical')!.effects.find(e => e.key === 'injuryWeeks')!;
}

/** Rounds out after the trainer has had him. Hashed off the man and the round, never drawn. */
export function nbaInjuryRounds(block: GmStaffBlock<NbaStaffPost>, team: string, season: number, round: number, playerId: string, rounds: number): number {
  const roll = gmHashFloat(`nba-injury|${team}|${season}|${round}|${playerId}`);
  return gmInjuryWeeks(rounds, medicalEffect(), gmStaffLevel(block, 'medical'), roll);
}

/**
 * The rating points a young man of yours gains in the summer once the
 * development coach has had him: the engine's own step stretched by the
 * coach's multiplier, rounded up or down by a hash of the man so that on
 * average it is exactly the step times the multiplier (what the tile says).
 * At level 1, or with nobody in the job, it is the engine's step exactly.
 * The engine still caps him at his potential.
 */
export function nbaGrowthStep(block: GmStaffBlock<NbaStaffPost>, team: string, season: number, playerId: string, step: number): number {
  const mult = gmStaffEffect(NBA_STAFF_PACK, block, 'growth');
  const roll = gmHashFloat(`nba-growth|${team}|${season}|${playerId}`);
  return Math.max(step, Math.floor(step * mult + roll));
}

/** What the desk hands a round: the club's edge and the trainer, for the user's club only. */
export function nbaDeskRoundOptions(desk: GmDesk, league: NbaLeague, team: string): NbaRoundOptions {
  const staff = nbaStaffOf(desk, league, team).block;
  return {
    edges: { [team]: nbaStaffEdge(staff) },
    injuryRounds: (abbr, p, rounds) => abbr === team ? nbaInjuryRounds(staff, team, league.season, league.round, p.id, rounds) : rounds,
  };
}

/** The same edge for the playoffs. */
export function nbaDeskEdges(desk: GmDesk, league: NbaLeague, team: string): Record<string, number> {
  return { [team]: nbaStaffEdge(nbaStaffOf(desk, league, team).block) };
}

/**
 * The user's scouting director's read of a prospect: the true rating plus a
 * miss whose spread his level sets (gmScoutNoise), clamped the way the
 * engine clamps its own grade (66 to 94). The draw is a hash of the
 * prospect, so the read is fixed for the night. The CPU clubs keep the
 * engine's own grade.
 */
export function nbaScoutRead(p: Pick<NbaProspect, 'id' | 'trueOvr'>, team: string, season: number, level: number): number {
  const u = gmHashFloat(`nba-scout|${team}|${season}|${p.id}`);
  return Math.max(66, Math.min(94, p.trueOvr + gmScoutNoise(u, level)));
}

/* ------------------------------------------------------------------ */
/* Picks                                                               */
/* ------------------------------------------------------------------ */

/**
 * Every club's engine list rebuilt from the ledger: one marker per pick it
 * holds in this season's draft, lowest round first. The engine's draft night
 * reads only that list (nbaDraftCapital), so a pick that changed hands in the
 * ledger is a pick on the other club's draft night. Not called during the
 * draft: the engine spends markers there and the summer drops that year.
 */
export function syncNbaPicks(league: NbaLeague, ledger: GmPickLedger): void {
  for (const [abbr, t] of Object.entries(league.teams)) {
    t.picks = picksHeldBy(ledger, abbr, league.season).filter(p => p.round <= 2).map(p => p.round).sort((a, b) => a - b);
  }
}

/**
 * The old trade paths (the trade finder's sweetener, a phone call's pick)
 * move the last marker on the list. With the desk on, the same pick moves in
 * the ledger: the club's own in that round if it still has it.
 */
export function nbaMirrorPickMove(ledger: GmPickLedger, from: string, to: string, round: number, season: number): GmPickLedger {
  const key = nbaMirrorPickKey(ledger, from, round, season);
  return key ? movePicks(ledger, [key], to) : ledger;
}

/** The ledger pick an old trade path's marker stands for, or null. */
function nbaMirrorPickKey(ledger: GmPickLedger, from: string, round: number, season: number): string | null {
  const held = picksHeldBy(ledger, from, season).filter(p => p.round === round);
  const p = held.find(x => x.orig === from) ?? held[0];
  return p ? pickKey(p) : null;
}

/**
 * Why an old trade path may not send that pick, or null. The same rules the
 * Trade desk asks of a package (pickSwapRefusal), so a sweetener or a phone
 * call's pick can never leave the club without a first in two drafts running.
 */
export function nbaMirrorPickRefusal(ledger: GmPickLedger, from: string, to: string, round: number, season: number): string | null {
  const key = nbaMirrorPickKey(ledger, from, round, season);
  return key ? pickSwapRefusal(ledger, nbaGamePickRules(), season, from, [key], to, []) : null;
}

/* ------------------------------------------------------------------ */
/* The deadline, and who is buying                                    */
/* ------------------------------------------------------------------ */

/**
 * Rounds already played this season. `league.round` is the round about to be
 * played. The one place the deadline's clock is read, so the hub, the old
 * trade paths and the packages can never count it two ways.
 */
export function nbaPeriodsPlayed(league: NbaLeague): number {
  return Math.max(0, league.round - 1);
}

/** The window as the hub sees it. */
export function nbaTradeWindow(league: NbaLeague): TradeWindow {
  return tradeWindow(NBA_DEADLINE, NBA_ROUNDS, nbaPeriodsPlayed(league), false);
}

/** Why a trade is refused today, or null. Every trade path on the board asks this first once the desk is on. */
export function nbaDeadlineRefusal(league: NbaLeague): string | null {
  return nbaTradeWindow(league).reason;
}

/**
 * Buyers and sellers by the standings: eight places a conference reach the
 * playoffs once the play-in is done, so eight is the line a club is buying
 * above and selling well below.
 */
export function nbaStances(league: NbaLeague): Record<string, DeadlineStance> {
  const rows = Object.values(league.teams).map(t => {
    const games = t.wins + t.losses;
    return {
      id: t.abbr, wins: t.wins, losses: t.losses,
      ...(games > 0 ? { pct: t.wins / games } : {}),
      group: EAST.includes(t.abbr) ? 'East' : 'West',
    };
  });
  return deadlineStances(rows, 8).stance;
}

/* ------------------------------------------------------------------ */
/* Packages                                                            */
/* ------------------------------------------------------------------ */

/**
 * What a pick is worth in the engine's trade value units. The engine has
 * always priced a pick thrown into a deal at 12 (nbaTrade's sweetener, and
 * the trade talks' pickValue), and that pick is the last on the list, a
 * second rounder. So a second next June is 12, a first is 30, and each draft
 * further off is worth 85 percent of the one before. The game's own figures,
 * not a claim about how real clubs price picks.
 */
export const NBA_PICK_CURVE: PickValueCurve = { first: 30, perRound: 0.4, perYear: 0.85 };
/** The engine's own ask margin on a deal (nbaTrade, the trade talks). */
export const NBA_PACKAGE_PREMIUM = 1.07;
/** What the board says about a man waived this season, so the refusal reads like the rest of the board. */
export const NBA_CUT_SAID = 'You waived him this season.';

const playerIn = (league: NbaLeague, id: string): NbaGmPlayer | undefined => {
  for (const t of Object.values(league.teams)) { const p = t.players.find(x => x.id === id); if (p) return p; }
  return undefined;
};

/**
 * The engine's salary matching (nbaSalaryFits) for a pile of men instead of
 * one: over the first apron after the deal a club may take back no more
 * salary than it sends out; otherwise the salary coming in must fit the room
 * plus what goes out, or be no more than one and a half times what goes out
 * plus five. For one man each way it is exactly nbaSalaryFits, and
 * scripts/simNbaGmDesk.mjs holds the two to the same answer.
 */
export function nbaPileFits(league: NbaLeague, club: string, outSalary: number, inSalary: number): boolean {
  const t = league.teams[club];
  const after = nbaCapUsed(t) - outSalary + inSalary;
  if (league.taxScale != null && after > nbaFirstApron(league.cap, league.taxScale)) return inSalary <= outSalary;
  return nbaCapRoom(t, league.cap) + outSalary >= inSalary || inSalary <= outSalary * 1.5 + 5;
}

/** The engine's money and roster rules for a whole package, side by side. Null means it works. */
export function nbaPackageCapCheck(league: NbaLeague, pkg: TradePackage): string | null {
  for (const [club, out, inc] of [[pkg.from, pkg.give, pkg.get], [pkg.to, pkg.get, pkg.give]] as const) {
    const t = league.teams[club];
    if (!t) return 'That club is not in this league.';
    const outMen = out.flatMap(a => (a.kind === 'player' ? [a] : []));
    const inMen = inc.flatMap(a => (a.kind === 'player' ? [a] : []));
    const after = t.players.length - outMen.length + inMen.length;
    if (after < NBA_ROSTER_MIN) return `That would leave ${club} with ${after} players. A club needs at least ${NBA_ROSTER_MIN}.`;
    if (after > NBA_ROSTER_MAX) return `${club} has no room for that many players: the limit is ${NBA_ROSTER_MAX}.`;
    let outSalary = 0, inSalary = 0;
    for (const a of outMen) outSalary += playerIn(league, a.id)?.salary ?? 0;
    for (const a of inMen) {
      const p = playerIn(league, a.id);
      if (!p) continue;
      inSalary += p.salary;
      const refused = tradeRefusal(t, a.id, NBA_CUT_SAID);
      if (refused) return refused;
    }
    if (!nbaPileFits(league, club, outSalary, inSalary)) {
      return league.taxScale != null && nbaCapUsed(t) - outSalary + inSalary > nbaFirstApron(league.cap, league.taxScale)
        ? `${club} would sit over the first apron, so it can take back no more salary than it sends out.`
        : `The salaries do not match for ${club}: it would take in $${Math.round(inSalary * 10) / 10}M for $${Math.round(outSalary * 10) / 10}M.`;
    }
  }
  return null;
}

/** Everything gmTradePackage needs to judge a deal the user's club puts to `partner`. */
export function nbaPackageContext(league: NbaLeague, desk: GmDesk, team: string, partner: string): PackageContext {
  const ledger = nbaPicksOf(desk, league);
  const stance = nbaStances(league)[partner] ?? 'holding';
  return {
    ledger, pickRules: nbaGamePickRules(), tradeRules: NBA_TRADE_RULES, season: league.season,
    clock: { rules: NBA_DEADLINE, periods: NBA_ROUNDS, periodsPlayed: nbaPeriodsPlayed(league), seasonClosed: false },
    valueOf: (a: TradeAsset) => {
      if (a.kind === 'player') { const p = playerIn(league, a.id); return p ? stanceValue(stance, nbaTradeValue(p), p.age) : 0; }
      if (a.kind === 'pick') {
        const p = findPick(ledger, a.key);
        return p ? stanceValue(stance, pickValueAt(NBA_PICK_CURVE, p.round, p.year - league.season)) : 0;
      }
      return 0;
    },
    capCheck: pkg => nbaPackageCapCheck(league, pkg),
    premium: NBA_PACKAGE_PREMIUM,
  };
}

export interface NbaPackageResult {
  verdict: PackageVerdict;
  desk: GmDesk;
  /** The players who came to the user's club. */
  arrived: NbaGmPlayer[];
}

/**
 * Judge a package and, on a yes, make it: players move on the two clubs in
 * the league handed in (the board hands a copy) and both rotations are
 * reconciled the way the engine's own trades do, picks move in the ledger and
 * the engine lists are rebuilt from it.
 */
export function nbaProposePackage(league: NbaLeague, desk: GmDesk, team: string, pkg: TradePackage): NbaPackageResult {
  const ctx = nbaPackageContext(league, desk, team, pkg.to);
  const from = league.teams[pkg.from], to = league.teams[pkg.to];
  if (!from || !to) return { verdict: evaluatePackage(pkg, ctx), desk, arrived: [] };
  const out = proposePackage(pkg, from, to, ctx);
  if (out.verdict.verdict !== 'accepted') return { verdict: out.verdict, desk, arrived: [] };
  syncNbaPicks(league, out.ledger);
  nbaReconcileRotation(from); nbaReconcileRotation(to);
  const mine = league.teams[team];
  const arrivedIds = (pkg.from === team ? pkg.get : pkg.give).flatMap(a => (a.kind === 'player' ? [a.id] : []));
  const arrived = mine.players.filter(p => arrivedIds.includes(p.id));
  const next = withGmBlock(desk, NBA_DESK_KEYS.picks, out.ledger);
  return { verdict: out.verdict, desk: nbaNoteArrivals(next, league, team, arrived.map(p => p.id), 'trade'), arrived };
}

/**
 * A draftee with the desk on signs the rules' deal. A first round pick signs
 * the rookie scale's four seasons (gmContractRules), plus the one the summer
 * right after draft night takes off before he has played a game (the
 * engine's offseason runs after the draft and takes a season off every
 * deal), so he plays four seasons before he comes up on the re-sign desk. A
 * second round pick is not on the scale and keeps the engine's own deal.
 * With the desk off the engine's figure stands, so an old save plays as it did.
 */
export function nbaSignDraftee(p: NbaGmPlayer, round: number): void {
  if (round === NBA_ROOKIE_SCALE_ROUND) p.years = NBA_ROOKIE_SCALE_YEARS + 1;
}

/** Tell the re-sign ledger how men arrived: a trade or a signing in season, or the draft with its round. */
export function nbaNoteArrivals(desk: GmDesk, league: NbaLeague, team: string, ids: string[], how: 'trade' | 'signing' | 'draft', round?: number): GmDesk {
  if (!ids.length) return desk;
  const ledger = deskCopy(nbaContractsOf(desk, league, team));
  for (const id of ids) noteArrival(ledger, id, league.season, how, round, how !== 'draft');
  return withGmBlock(desk, NBA_DESK_KEYS.contracts, ledger);
}

/* ------------------------------------------------------------------ */
/* The round and the summer                                            */
/* ------------------------------------------------------------------ */

const postLabel = (post: string): string => (NBA_STAFF_PACK.posts.find(p => p.id === post)?.label ?? post).toLowerCase();

/** One tick of the staff desk, after a round: an approach runs down, or a rival comes in. A club acting, never a person speaking. */
export function nbaDeskAfterRound(desk: GmDesk, league: NbaLeague, team: string): { desk: GmDesk; line: string | null } {
  const staff = deskCopy(nbaStaffOf(desk, league, team));
  const ev = gmTickStaff(NBA_STAFF_PACK.rules, staff.block, nbaStaffCtx(league, team));
  const next = withGmBlock(desk, NBA_DESK_KEYS.staff, staff);
  if (!ev) return { desk: next, line: null };
  return {
    desk: next,
    line: ev.kind === 'approach'
      ? `📞 ${ev.club} have come in for ${ev.person.name}, your ${postLabel(ev.post)}. Match it or let him go on the staff desk.`
      : `👋 ${ev.person.name} has left your ${postLabel(ev.post)} job for ${ev.club}.`,
  };
}

/**
 * The engine's own summer, with the user's development coach on his own
 * young men. Every other club, and everything else in the summer, is the
 * engine's exactly: the growth hook draws nothing, so no club's stream moves.
 */
export function nbaDeskHost(block: GmStaffBlock<NbaStaffPost>, team: string, season: number): GmContractHost<NbaLeague, string[]> {
  return {
    ...nbaContractHost,
    runOffseason: (league, rng, my) => nbaOffseason(league, rng, my, {
      growth: (abbr, p, step) => (abbr === team ? nbaGrowthStep(block, team, season, p.id, step) : step),
    }),
  };
}

export interface NbaDeskSummer {
  ok: boolean;
  desk: GmDesk;
  /** The engine's own offseason lines (retirements), untouched. */
  notes: string[];
  /** What the desk did, for the feed. */
  lines: string[];
  /** Men the GM left open, settled by the staff's rule and written down as 'auto'. */
  autoSettled: GmDecision[];
  /** Every decision applied this summer. */
  applied: GmDecision[];
}

/**
 * The summer with the desk on, in place of nbaOffseason. Every one of the
 * user's expiring men already has a decision when the engine runs: the GM's,
 * or for a man he left open, the staff's written rule (autoDecide), never a
 * draw. Then the engine's own offseason runs for the whole league, exactly
 * as before, with the user's club named (so the CPU clubs fill, trim and
 * steer under the tax the way Round 722 does it), and the development coach
 * on the user's young men. After it: the draft just held leaves the pick
 * ledger, every engine list is rebuilt from it, and the staff roll over.
 * An offer sheet in this league pays no picks, so none move for one.
 * Mutates the league handed in, like the engine's own offseason.
 */
export function nbaDeskOffseason(league: NbaLeague, desk: GmDesk, team: string, rng: () => number): NbaDeskSummer {
  const closed = league.season;
  const ids = Object.keys(league.teams);
  const picksBefore = nbaPicksOf(desk, league);
  const staffBefore = nbaStaffOf(desk, league, team);
  const ledger = deskCopy(nbaContractsOf(desk, league, team));
  const host = nbaDeskHost(staffBefore.block, team, closed);
  const autoSettled = autoDecide(host, league, ledger);
  const run = runDeskOffseason(host, league, ledger, rng);
  if (run.ok === false) return { ok: false, desk, notes: [], lines: [`Still waiting on: ${run.undecided.map(u => u.name).join(', ')}.`], autoSettled: [], applied: [] };

  const picks = rollLedger(picksBefore, ids, closed, nbaGamePickRules());
  syncNbaPicks(league, picks);

  const walk = gmSummerWalk(NBA_STAFF_PACK.rules, staffBefore.block);
  const staff: NbaStaffState = {
    block: gmRolloverStaff(NBA_STAFF_PACK.rules, staffBefore.block, nbaStaffCtx(league, team)),
    purse: NBA_STAFF_PACK.money.seasonPurse,
  };

  const lines: string[] = [];
  const stayed = run.applied.filter(d => ['keep', 'option', 'tender', 'qualify-accepted', 'match'].includes(d.kind)).length;
  if (run.applied.length) lines.push(`📋 The re-sign desk: ${stayed} kept, ${run.applied.length - stayed} gone.`);
  if (autoSettled.length) lines.push(`📋 You left ${autoSettled.length} deal${autoSettled.length === 1 ? '' : 's'} open, so your staff settled ${autoSettled.length === 1 ? 'it' : 'them'} by its own rule.`);
  if (walk) lines.push(`👋 ${walk.person.name} took the ${postLabel(walk.post)} job at ${walk.club}. Nobody matched it.`);

  let next = withGmBlock(desk, NBA_DESK_KEYS.contracts, ledger);
  next = withGmBlock(next, NBA_DESK_KEYS.picks, picks);
  next = withGmBlock(next, NBA_DESK_KEYS.staff, staff);
  return { ok: true, desk: next, notes: run.engine, lines, autoSettled, applied: run.applied };
}

/* ------------------------------------------------------------------ */
/* What each box on the hub says                                       */
/* ------------------------------------------------------------------ */

const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`;

/**
 * The staff box. It pulses when a rival is in for one of yours or a chair is
 * empty. On a save without the desk yet (`on` false) no staff is working, so
 * the box says what opening it brings rather than an edge nobody is getting.
 */
export function nbaStaffTile(desk: GmDesk, league: NbaLeague, team: string, on = true): GmTileFace {
  if (!on) return { icon: '📋', value: 'A staff of five', sub: 'Open it to start the desk: no edge from the bench until then', accent: false };
  const s = nbaStaffOf(desk, league, team);
  const posts = NBA_STAFF_PACK.posts;
  const filled = posts.filter(p => s.block[p.id]).length;
  const poach = s.block.poach;
  const edge = Math.round(nbaStaffEdge(s.block) * 100) / 100;
  return {
    icon: '📋',
    value: `${filled} of ${posts.length} jobs filled`,
    sub: poach ? `${poach.club} want your ${postLabel(poach.postId)}` : edge > 0 ? `+${edge} team strength from the bench` : 'No edge from the bench yet',
    accent: !!poach || filled < posts.length,
  };
}

/**
 * The re-sign box. It pulses once the deadline has passed and somebody is
 * still waiting on you. Without the desk yet (`on` false) the summer still
 * decides, so nobody is waiting on the GM and the box says so.
 */
export function nbaContractsTile(desk: GmDesk, league: NbaLeague, team: string, seasonOver: boolean, on = true): GmTileFace {
  const up = expiringMen(nbaContractHost, league, team);
  if (!on) {
    return { icon: '✍️', value: up.length ? `${plural(up.length, 'deal')} end this summer` : 'Nobody expiring', sub: 'Open it to start the desk: until then the summer decides', accent: false };
  }
  const ledger = nbaContractsOf(desk, league, team);
  const waiting = undecided(nbaContractHost, league, ledger).length;
  return {
    icon: '✍️',
    value: up.length ? `${plural(up.length, 'deal')} end this summer` : 'Nobody expiring',
    sub: waiting ? `${waiting} still waiting on you` : up.length ? 'Every call is made' : 'Nobody is out of contract this summer',
    accent: waiting > 0 && (seasonOver || !nbaTradeWindow(league).open),
  };
}

/** The picks box. */
export function nbaPicksTile(desk: GmDesk, league: NbaLeague, team: string): GmTileFace {
  const ledger = nbaPicksOf(desk, league);
  const mine = picksHeldBy(ledger, team);
  const now = mine.filter(p => p.year === league.season).length;
  const years = new Set(mine.map(p => p.year)).size;
  return {
    icon: '🎟️',
    value: `${plural(now, 'pick')} in ${league.season}`,
    sub: `${plural(mine.length, 'pick')} over ${plural(Math.max(years, 1), 'draft')}`,
    accent: false,
  };
}

/**
 * The deal box: packages, and how long until the deadline shuts them. On a
 * save without the desk yet (`on` false) the deadline does not apply, the
 * phone and the trade finder still deal, so the box says what opening it
 * brings instead of a deadline that is not running.
 */
export function nbaDealsTile(league: NbaLeague, on = true): GmTileFace {
  const w = nbaTradeWindow(league);
  if (!on) {
    return { icon: '🔁', value: 'Packages and a deadline', sub: `Open it to start the desk: deals shut once round ${w.deadlineAfter + 1} is played`, accent: false };
  }
  return {
    icon: '🔁',
    value: !w.open ? 'Deadline passed' : w.periodsLeft === 0 ? 'Last round to deal' : `${plural(w.periodsLeft, 'round')} to the deadline`,
    sub: w.open ? 'Players and picks, up to five a side' : 'Deals open again after the season',
    accent: w.open && w.periodsLeft <= 1,
  };
}
