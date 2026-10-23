/**
 * Round 1019: the NFL Front Office takes the GM desk, the way the NHL did in
 * Round 987 (src/lib/nhlGmDesk.ts is the model, and this file has its shape).
 *
 * The shared GM modules (the seam of 907, the re-sign desk of 908, the pick
 * ledger, packages and deadline of 909, the staff of 910) are bound here to
 * the NFL engine, src/lib/frontOffice.ts: what the board hands the desk and
 * what the desk hands the engine back. The screens are
 * components/front-office/NflGmDesk.tsx. Nothing in here draws from
 * Math.random: every roll is a hash, so a board that binds this moves none of
 * its own seeded streams by a single draw.
 *
 * THE PROMISE TO AN OLD SAVE. A save written before this round has no `gm`
 * field, and while it has none the board plays exactly as it always did: the
 * same calls, the same draws, the same coin flip at the summer. The desk is
 * switched on by the GM, the first time he opens one of its boxes
 * (openNflDesk). From then on three blocks ride on the save:
 *   contracts  the re-sign ledger (gmContracts): his expiring men go to the
 *              desk, never to the engine's coin flip
 *   picks      the pick ledger (gmPicks) over this game's three round draft
 *   staff      the staff block (gmStaff) and the purse it is paid from
 * Each block is validated alone and a corrupt one resets alone (gmBlock).
 *
 * WHAT IS THE NFL'S OWN. The fifth year option on a first round pick's
 * rookie deal, four year rookie deals, the franchise tag (Round 723, kept
 * exactly: a tagged man never reaches the desk), the deadline after Week 9,
 * and a trade that moves the whole contract while the old club keeps dead
 * money (gmContractRules: nfl-trade-dead-money). The money is the game's own.
 *
 * scripts/simNflGmDesk.mjs holds every promise in here to the engine.
 */
import { type GmDesk, type GmTileFace, freshGmDesk, gmBlock, withGmBlock } from './gmDesk';
import {
  type GmContractLedger, type GmDecision, autoDecide, expiringMen, isValidLedger, noteArrival, openLedger,
  runDeskOffseason, undecided,
} from './gmContracts';
import { nflContractHost } from './gmContractsHostNfl';
import {
  type GmPickLedger, type GmPickRules, NFL_PICK_RULES, findPick, migrateLegacyPicks, movePicks, pickKey,
  picksHeldBy, rollLedger, validateLedger,
} from './gmPicks';
import {
  NFL_DEADLINE, type DeadlineStance, deadlineStances, stanceValue, tradeWindow, type TradeWindow,
} from './gmDeadline';
import {
  NFL_TRADE_RULES, type PackageContext, type PackageVerdict, type PickValueCurve, type TradeAsset, type TradePackage,
  evaluatePackage, pickValueAt, proposePackage,
} from './gmTradePackage';
import {
  type GmStaffBlock, type GmStaffCtx, gmDefaultStaff, gmHashFloat, gmInjuryWeeks, gmIsValidStaff, gmRolloverStaff,
  gmScoutNoise, gmStaffEffect, gmStaffLevel, gmStatureAnchor, gmSummerWalk, gmTickStaff,
} from './gmStaff';
import { deadMoneyFor, tradeRefusal } from './frontOfficeCuts';
import { NFL_ROOKIE_DEAL_YEARS } from './gmContractRules';
import { NFL_STAFF_PACK, type NflStaffPost } from '@/data/gmStaff/packs';
import {
  DEEP_ROSTER_MAX, NFL_ROSTER_MIN, REGULAR_WEEKS, capUsed, conferenceOf, conferenceSeeds, teamStrength, tradeValue,
  type GmPlayer, type GmTeamState, type LeagueState, type OffseasonNews, type Prospect,
} from './frontOffice';

/* ------------------------------------------------------------------ */
/* The blocks                                                          */
/* ------------------------------------------------------------------ */

export const NFL_DESK_KEYS = { contracts: 'contracts', picks: 'picks', staff: 'staff' } as const;

/** Rounds the game's draft night deals: the engine hands every club [1, 2, 3] each summer. */
export const NFL_GAME_DRAFT_ROUNDS = 3;

/**
 * The pick rules this game drafts under: the league's own (gmPicks, read
 * twice on 2026-10-02) with the rounds cut to the three this game's draft
 * night deals. No compensatory picks, because the game does not award them.
 * A function, not a constant, so nothing imported is read at module scope.
 */
export function nflGamePickRules(): GmPickRules {
  return {
    ...NFL_PICK_RULES,
    rounds: NFL_GAME_DRAFT_ROUNDS,
    comp: null,
    partial: [
      'The real draft runs seven rounds. This game drafts three, so the ledger carries three.',
      'This game awards no compensatory picks, so none are in the ledger.',
      'Draft night here is the game\'s own short draft: you pick, then the other clubs go in reverse standings.',
    ],
  };
}

/** The staff block and the purse its fees and pay offs come out of. */
export interface NflStaffState {
  block: GmStaffBlock<NflStaffPost>;
  /** In the pack's purse unit (the game's own millions). Ownership refills it every summer. */
  purse: number;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function isNflStaffState(v: unknown): v is NflStaffState {
  return isObj(v) && gmIsValidStaff(NFL_STAFF_PACK.rules, v.block) && isNum(v.purse) && v.purse >= 0;
}

/** What the desk reads from the board to set up its staff. */
export function nflStaffCtx(league: LeagueState, team: string): GmStaffCtx<NflStaffPost> {
  const ids = Object.keys(league.teams).sort();
  const ranked = [...ids].sort((a, b) => teamStrength(league.teams[b]) - teamStrength(league.teams[a]) || a.localeCompare(b));
  const rank = Math.max(0, ranked.indexOf(team));
  const stature = ids.length > 1 ? 1 - rank / (ids.length - 1) : 0.5;
  return {
    owner: team, world: 'nfl', season: league.season, week: league.week, money: 1,
    anchor: post => gmStatureAnchor(team, post, stature, NFL_STAFF_PACK.rules.maxLevel),
    inHouse: 2,
    rivals: () => ids.filter(id => id !== team),
  };
}

const freshPicks = (league: LeagueState): GmPickLedger =>
  /* Every marker on every club's old list is kept: the draft for this season
     is the year the old list was for, and the two later years start whole. */
  migrateLegacyPicks(league.teams, league.season, nflGamePickRules(), NFL_GAME_DRAFT_ROUNDS).ledger;

const freshStaff = (league: LeagueState, team: string): NflStaffState => ({
  block: gmDefaultStaff(NFL_STAFF_PACK.rules, nflStaffCtx(league, team)),
  purse: NFL_STAFF_PACK.money.seasonPurse,
});

/** The desk the first time the GM opens it. Reads the league, never changes it. */
export function openNflDesk(league: LeagueState, team: string): GmDesk {
  let desk = freshGmDesk();
  desk = withGmBlock(desk, NFL_DESK_KEYS.contracts, openLedger(league, team));
  desk = withGmBlock(desk, NFL_DESK_KEYS.picks, freshPicks(league));
  desk = withGmBlock(desk, NFL_DESK_KEYS.staff, freshStaff(league, team));
  return desk;
}

export function nflContractsOf(desk: GmDesk, league: LeagueState, team: string): GmContractLedger {
  return gmBlock(desk, NFL_DESK_KEYS.contracts, v => isValidLedger(v) && v.team === team, () => openLedger(league, team));
}

export function nflPicksOf(desk: GmDesk, league: LeagueState): GmPickLedger {
  const ids = Object.keys(league.teams);
  return gmBlock(desk, NFL_DESK_KEYS.picks, v => validateLedger(v, ids, nflGamePickRules()) !== null, () => freshPicks(league));
}

export function nflStaffOf(desk: GmDesk, league: LeagueState, team: string): NflStaffState {
  return gmBlock(desk, NFL_DESK_KEYS.staff, isNflStaffState, () => freshStaff(league, team));
}

/** A deep copy that survives JSON, the only shape a save block may have. */
export const deskCopy = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/* ------------------------------------------------------------------ */
/* The staff's effects                                                 */
/* ------------------------------------------------------------------ */

/**
 * The engine's own weights (teamStrength): the quarterback 0.30, the skill
 * players 0.30 and the line 0.12 are the offense, 0.72 of the number; the
 * defense is the other 0.28. A coach's edge is in rating points on his side
 * of the ball, so it reaches the strength the way a rating point there does.
 */
export const NFL_OFFENSE_WEIGHT = 0.72;
export const NFL_DEFENSE_WEIGHT = 0.28;

/** Strength points the staff adds to the club. Zero for a desk of level 1 men or empty chairs. */
export function nflStaffEdge(block: GmStaffBlock<NflStaffPost> | null | undefined): number {
  const e = (key: string) => gmStaffEffect(NFL_STAFF_PACK, block, key);
  return e('offEdge') * NFL_OFFENSE_WEIGHT + e('defEdge') * NFL_DEFENSE_WEIGHT;
}

/** The head trainer's ladder, off the pack, so the number on the tile is the number applied. */
function trainerEffect() {
  return NFL_STAFF_PACK.posts.find(p => p.id === 'trainer')!.effects.find(e => e.key === 'injuryWeeks')!;
}

/** Weeks out after the trainer has had him. Hashed off the man and the week, never drawn. */
export function nflInjuryWeeks(block: GmStaffBlock<NflStaffPost>, team: string, season: number, week: number, playerId: string, weeks: number): number {
  const roll = gmHashFloat(`nfl-injury|${team}|${season}|${week}|${playerId}`);
  return gmInjuryWeeks(weeks, trainerEffect(), gmStaffLevel(block, 'trainer'), roll);
}

/** What the desk hands a week: the club's edge and the trainer, for the user's club only. */
export interface NflWeekOptions {
  edges: Record<string, number>;
  weeksFor: (abbr: string, p: GmPlayer, weeks: number) => number;
}

export function nflDeskWeekOptions(desk: GmDesk, league: LeagueState, team: string): NflWeekOptions {
  const staff = nflStaffOf(desk, league, team).block;
  return {
    edges: { [team]: nflStaffEdge(staff) },
    weeksFor: (abbr, p, weeks) => abbr === team ? nflInjuryWeeks(staff, team, league.season, league.week, p.id, weeks) : weeks,
  };
}

/** The same edge for the playoffs. */
export function nflDeskEdges(desk: GmDesk, league: LeagueState, team: string): Record<string, number> {
  return { [team]: nflStaffEdge(nflStaffOf(desk, league, team).block) };
}

/**
 * The user's scouting director's read of a prospect: the true rating plus a
 * miss whose spread his level sets (gmScoutNoise), clamped the way the
 * engine clamps its own grade (62 to 92). The draw is a hash of the
 * prospect, so the read is fixed for the night. The CPU clubs keep the
 * engine's own grade.
 */
export function nflScoutRead(p: Pick<Prospect, 'id' | 'trueOvr'>, team: string, season: number, level: number): number {
  const u = gmHashFloat(`nfl-scout|${team}|${season}|${p.id}`);
  return Math.max(62, Math.min(92, p.trueOvr + gmScoutNoise(u, level)));
}

/* ------------------------------------------------------------------ */
/* Picks                                                               */
/* ------------------------------------------------------------------ */

/**
 * Every club's engine list rebuilt from the ledger: one marker per pick it
 * holds in this season's draft, lowest round first, the order the engine
 * spends them in (consumeDraftPick takes the first). Draft night reads only
 * that list (Round 904), so a pick that changed hands in the ledger is a pick
 * on the other club's draft night. Not called during the draft: the engine
 * spends markers there and the summer drops that year.
 */
export function syncNflPicks(league: LeagueState, ledger: GmPickLedger): void {
  for (const [abbr, t] of Object.entries(league.teams)) {
    t.picks = picksHeldBy(ledger, abbr, league.season)
      .filter(p => p.round <= NFL_GAME_DRAFT_ROUNDS)
      .map(p => p.round)
      .sort((a, b) => a - b);
  }
}

/**
 * The old trade paths (the trade finder's sweetener, a phone call's pick)
 * move the last marker on the list. With the desk on, the same pick moves in
 * the ledger: the club's own in that round if it still has it.
 */
export function nflMirrorPickMove(ledger: GmPickLedger, from: string, to: string, round: number, season: number): GmPickLedger {
  const held = picksHeldBy(ledger, from, season).filter(p => p.round === round);
  const p = held.find(x => x.orig === from) ?? held[0];
  return p ? movePicks(ledger, [pickKey(p)], to) : ledger;
}

/* ------------------------------------------------------------------ */
/* The deadline, and who is buying                                    */
/* ------------------------------------------------------------------ */

/**
 * Weeks already played this season. `league.week` is the week about to be
 * played. The one place the deadline's clock is read, so the hub, the old
 * trade paths and the packages can never count it two ways.
 */
export function nflWeeksPlayed(league: LeagueState): number {
  return Math.max(0, league.week - 1);
}

/** The window as the hub sees it. Week 9 of 17 here, the Tuesday after Week 9 in the league. */
export function nflTradeWindow(league: LeagueState): TradeWindow {
  return tradeWindow(NFL_DEADLINE, REGULAR_WEEKS, nflWeeksPlayed(league), false);
}

/** Why a trade is refused today, or null. Every trade path on the board asks this first once the desk is on. */
export function nflDeadlineRefusal(league: LeagueState): string | null {
  return nflTradeWindow(league).reason;
}

/** Playoff places a conference: seven, the real format and the bracket the engine plays. */
export const NFL_PLAYOFF_SPOTS = 7;

/** The clubs holding a playoff seed today: the bracket the engine plays
    (conferenceSeeds, division winners then wild cards), seven a conference. */
export function nflPlacedClubs(league: LeagueState): Set<string> {
  return new Set([...conferenceSeeds(league.teams, 'AFC'), ...conferenceSeeds(league.teams, 'NFC')]);
}

/** Buyers and sellers by the standings: a club holding one of the seven seeds
    in its conference buys, as the hub's mandate box counts a playoff place. */
export function nflStances(league: LeagueState): Record<string, DeadlineStance> {
  const rows = Object.values(league.teams).map(t => ({
    id: t.abbr, wins: t.wins, losses: t.losses, group: conferenceOf(t.abbr),
  }));
  return deadlineStances(rows, NFL_PLAYOFF_SPOTS, nflPlacedClubs(league)).stance;
}

/* ------------------------------------------------------------------ */
/* Dead money on a trade                                               */
/* ------------------------------------------------------------------ */

/**
 * THE GAME'S OWN SHARE. In the NFL the contract moves with the man and his
 * old club keeps the bonus it has not counted yet (gmContractRules,
 * nfl-trade-dead-money). Deals here carry one figure and no bonus, so a
 * share of that figure stands in for it: this much for every season he had
 * left, never more than a cut would leave this season (half his salary), so
 * the share stops growing at four seasons left (0.15 x 4 = 0.6 is past 0.5).
 */
export const NFL_TRADE_BONUS_SHARE = 0.15;

const round1 = (n: number): number => Math.round(n * 10) / 10;

/**
 * What his old club keeps on this season's cap when he is traded. Nothing
 * for a man on a guaranteed one year deal (the tag, the option year): there
 * is no bonus in it. Never more than a cut would leave this season.
 */
export function nflTradeDeadMoney(p: Pick<GmPlayer, 'salary' | 'years' | 'guaranteed'>): number {
  if (p.guaranteed) return 0;
  const seasons = Math.max(1, p.years);
  return Math.min(deadMoneyFor(p).now, round1(p.salary * NFL_TRADE_BONUS_SHARE * seasons));
}

/** A man leaving a club by trade: the club keeps his dead money this season. */
export interface NflTradeLeaver { club: string; playerId: string }

/**
 * Put the dead money of every man in a done deal on the club he left. Call
 * it after the men have moved: each is read off the roster he now plays for.
 * Returns what each club was left, for the feed.
 */
export function nflApplyTradeDeadMoney(league: LeagueState, leavers: NflTradeLeaver[]): { club: string; name: string; amount: number }[] {
  const out: { club: string; name: string; amount: number }[] = [];
  for (const l of leavers) {
    const payer = league.teams[l.club];
    const p = playerIn(league, l.playerId);
    if (!payer || !p) continue;
    const amount = nflTradeDeadMoney(p);
    if (amount <= 0) continue;
    payer.deadCap = [...(payer.deadCap ?? []), { playerId: p.id, name: p.name, amount, seasonsLeft: 1 }];
    out.push({ club: l.club, name: p.name, amount });
  }
  return out;
}

function playerIn(league: LeagueState, id: string): GmPlayer | undefined {
  for (const t of Object.values(league.teams)) { const p = t.players.find(x => x.id === id); if (p) return p; }
  return undefined;
}

/* ------------------------------------------------------------------ */
/* Packages                                                            */
/* ------------------------------------------------------------------ */

/**
 * What a pick is worth in the engine's trade value units. The engine has
 * always priced a pick thrown into a deal at 14 (proposeTrade's sweetener,
 * and the trade talks' pickValue), and that pick is the last on the list, a
 * third rounder. So a third next spring is 14.4, a second 24, a first 40,
 * and each draft further off is worth 85 percent of the one before. The
 * game's own figures, not a claim about how real clubs price picks.
 */
export const NFL_PICK_CURVE: PickValueCurve = { first: 40, perRound: 0.6, perYear: 0.85 };
/** The engine's own ask margin on a deal (proposeTrade, the trade talks' opening premium). */
export const NFL_PACKAGE_PREMIUM = 1.08;
/** What the board says about a man cut this season, so the refusal reads like the rest of the board. */
export const NFL_CUT_SAID = 'You cut him this season.';

/**
 * The engine's money and roster rules for a whole package, side by side.
 * Null means it works. Each club sheds a leaver's salary but keeps his dead
 * money, and takes on the whole salary of every man who arrives.
 */
export function nflPackageCapCheck(league: LeagueState, pkg: TradePackage): string | null {
  for (const [club, out, inc] of [[pkg.from, pkg.give, pkg.get], [pkg.to, pkg.get, pkg.give]] as const) {
    const t: GmTeamState | undefined = league.teams[club];
    if (!t) return 'That club is not in this league.';
    const outMen = out.flatMap(a => (a.kind === 'player' ? [a] : []));
    const inMen = inc.flatMap(a => (a.kind === 'player' ? [a] : []));
    const after = t.players.length - outMen.length + inMen.length;
    if (after < NFL_ROSTER_MIN) return `That would leave ${club} with ${after} players. A club needs at least ${NFL_ROSTER_MIN}.`;
    if (t.rosterDepth === 2 && inMen.length > outMen.length && after > DEEP_ROSTER_MAX) {
      return `${club} has no room for that many players: the limit is ${DEEP_ROSTER_MAX}.`;
    }
    let outRelief = 0, inCost = 0;
    for (const a of outMen) { const p = playerIn(league, a.id); if (p) outRelief += p.salary - nflTradeDeadMoney(p); }
    for (const a of inMen) {
      const p = playerIn(league, a.id);
      if (!p) continue;
      inCost += p.salary;
      const refused = tradeRefusal(t, a.id, NFL_CUT_SAID);
      if (refused) return refused;
    }
    const payrollAfter = capUsed(t) - outRelief + inCost;
    /* The engine's own matching rule (Round 82), for a pile instead of one man. */
    if (payrollAfter > league.cap + 1e-9 && inCost > outRelief * 1.5 + 5) {
      return `That puts ${club} over the cap: $${round1(payrollAfter)}M against $${league.cap}M.`;
    }
  }
  return null;
}

/** Everything gmTradePackage needs to judge a deal the user's club puts to `partner`. */
export function nflPackageContext(league: LeagueState, desk: GmDesk, team: string, partner: string): PackageContext {
  const ledger = nflPicksOf(desk, league);
  const stance = nflStances(league)[partner] ?? 'holding';
  return {
    ledger, pickRules: nflGamePickRules(), tradeRules: NFL_TRADE_RULES, season: league.season,
    clock: { rules: NFL_DEADLINE, periods: REGULAR_WEEKS, periodsPlayed: nflWeeksPlayed(league), seasonClosed: false },
    valueOf: (a: TradeAsset) => {
      if (a.kind === 'player') { const p = playerIn(league, a.id); return p ? stanceValue(stance, tradeValue(p), p.age) : 0; }
      if (a.kind === 'pick') {
        const p = findPick(ledger, a.key);
        return p ? stanceValue(stance, pickValueAt(NFL_PICK_CURVE, p.round, p.year - league.season)) : 0;
      }
      return 0;
    },
    capCheck: pkg => nflPackageCapCheck(league, pkg),
    premium: NFL_PACKAGE_PREMIUM,
  };
}

export interface NflPackageResult {
  verdict: PackageVerdict;
  desk: GmDesk;
  /** The players who came to the user's club. */
  arrived: GmPlayer[];
  /** The dead money each club was left with, for the feed. */
  dead: { club: string; name: string; amount: number }[];
}

/**
 * Judge a package and, on a yes, make it: players move on the two clubs in
 * the league handed in (the board hands a copy), picks move in the ledger
 * and the engine lists are rebuilt from it, and every man who moved leaves
 * his dead money on the club he left.
 */
export function nflProposePackage(league: LeagueState, desk: GmDesk, team: string, pkg: TradePackage): NflPackageResult {
  const ctx = nflPackageContext(league, desk, team, pkg.to);
  const from = league.teams[pkg.from], to = league.teams[pkg.to];
  if (!from || !to) return { verdict: evaluatePackage(pkg, ctx), desk, arrived: [], dead: [] };
  const out = proposePackage(pkg, from, to, ctx);
  if (out.verdict.verdict !== 'accepted') return { verdict: out.verdict, desk, arrived: [], dead: [] };
  const leavers: NflTradeLeaver[] = [
    ...pkg.give.flatMap(a => (a.kind === 'player' ? [{ club: pkg.from, playerId: a.id }] : [])),
    ...pkg.get.flatMap(a => (a.kind === 'player' ? [{ club: pkg.to, playerId: a.id }] : [])),
  ];
  const dead = nflApplyTradeDeadMoney(league, leavers);
  syncNflPicks(league, out.ledger);
  const mine = league.teams[team];
  const arrivedIds = (pkg.from === team ? pkg.get : pkg.give).flatMap(a => (a.kind === 'player' ? [a.id] : []));
  const arrived = mine.players.filter(p => arrivedIds.includes(p.id));
  let next = withGmBlock(desk, NFL_DESK_KEYS.picks, out.ledger);
  next = nflNoteArrivals(next, league, team, arrived.map(p => p.id), 'trade');
  return { verdict: out.verdict, desk: next, arrived, dead };
}

/**
 * A draftee with the desk on signs the rules' four year rookie deal, plus
 * the season the summer right after draft night takes off before he has
 * played a game (the engine's offseason runs after the draft and takes a
 * season off every deal). So he plays four seasons before he comes up on
 * the re-sign desk, and a first rounder comes up with his fifth year option.
 * With the desk off the engine's own figure stands, so an old save plays as
 * it did.
 */
export function nflSignDraftee(p: GmPlayer): void {
  p.years = NFL_ROOKIE_DEAL_YEARS + 1;
}

/** Tell the re-sign ledger how men arrived: a trade or a signing in season, or the draft with its round. */
export function nflNoteArrivals(desk: GmDesk, league: LeagueState, team: string, ids: string[], how: 'trade' | 'signing' | 'draft', round?: number): GmDesk {
  if (!ids.length) return desk;
  const ledger = deskCopy(nflContractsOf(desk, league, team));
  for (const id of ids) noteArrival(ledger, id, league.season, how, round, how !== 'draft');
  return withGmBlock(desk, NFL_DESK_KEYS.contracts, ledger);
}

/* ------------------------------------------------------------------ */
/* The week and the summer                                             */
/* ------------------------------------------------------------------ */

const postLabel = (post: string): string => (NFL_STAFF_PACK.posts.find(p => p.id === post)?.label ?? post).toLowerCase();

/** One tick of the staff desk, after a week: an approach runs down, or a rival comes in. A club acting, never a person speaking. */
export function nflDeskAfterWeek(desk: GmDesk, league: LeagueState, team: string): { desk: GmDesk; line: string | null } {
  const staff = deskCopy(nflStaffOf(desk, league, team));
  const ev = gmTickStaff(NFL_STAFF_PACK.rules, staff.block, nflStaffCtx(league, team));
  const next = withGmBlock(desk, NFL_DESK_KEYS.staff, staff);
  if (!ev) return { desk: next, line: null };
  return {
    desk: next,
    line: ev.kind === 'approach'
      ? `📞 ${ev.club} have come in for ${ev.person.name}, your ${postLabel(ev.post)}. Match it or let him go on the staff desk.`
      : `👋 ${ev.person.name} has left your ${postLabel(ev.post)} job for ${ev.club}.`,
  };
}

export interface NflDeskSummer {
  ok: boolean;
  desk: GmDesk;
  /** The engine's own offseason news (retirements, tags, development), untouched. Null when the summer did not run. */
  news: OffseasonNews | null;
  /** What the desk did, for the feed. */
  lines: string[];
  /** Men the GM left open, settled by the staff's rule and written down as 'auto'. */
  autoSettled: GmDecision[];
  /** Every decision applied this summer. */
  applied: GmDecision[];
}

/**
 * The summer with the desk on, in place of runOffseason. Every one of the
 * user's expiring men already has a decision when the engine runs: the GM's,
 * or for a man he left open, the staff's written rule (autoDecide), never a
 * draw. A man he tagged on the draft screen is held by the tag and never
 * reaches the desk (Round 723, unchanged). Then the engine's own offseason
 * runs for the whole league, exactly as before, with the user's club (so the
 * CPU clubs tag and cut the way they always have). After it: the draft just
 * held leaves the pick ledger, every engine list is rebuilt from it in place
 * of the engine's fresh [1, 2, 3], and the staff roll over.
 * Mutates the league handed in, like the engine's own offseason.
 */
export function nflDeskOffseason(league: LeagueState, desk: GmDesk, team: string, rng: () => number): NflDeskSummer {
  const closed = league.season;
  const ids = Object.keys(league.teams);
  const picksBefore = nflPicksOf(desk, league);
  const staffBefore = nflStaffOf(desk, league, team);
  const ledger = deskCopy(nflContractsOf(desk, league, team));
  const autoSettled = autoDecide(nflContractHost, league, ledger);
  const run = runDeskOffseason(nflContractHost, league, ledger, rng);
  if (run.ok === false) {
    return { ok: false, desk, news: null, lines: [`Still waiting on: ${run.undecided.map(u => u.name).join(', ')}.`], autoSettled: [], applied: [] };
  }

  const picks = rollLedger(picksBefore, ids, closed, nflGamePickRules());
  syncNflPicks(league, picks);

  const walk = gmSummerWalk(NFL_STAFF_PACK.rules, staffBefore.block);
  const staff: NflStaffState = {
    block: gmRolloverStaff(NFL_STAFF_PACK.rules, staffBefore.block, nflStaffCtx(league, team)),
    purse: NFL_STAFF_PACK.money.seasonPurse,
  };

  const lines: string[] = [];
  const stayed = run.applied.filter(d => ['keep', 'option', 'tender', 'qualify-accepted', 'match'].includes(d.kind)).length;
  if (run.applied.length) lines.push(`📋 The re-sign desk: ${stayed} kept, ${run.applied.length - stayed} gone.`);
  if (autoSettled.length) lines.push(`📋 You left ${autoSettled.length} deal${autoSettled.length === 1 ? '' : 's'} open, so your staff settled ${autoSettled.length === 1 ? 'it' : 'them'} by its own rule.`);
  if (walk) lines.push(`👋 ${walk.person.name} took the ${postLabel(walk.post)} job at ${walk.club}. Nobody matched it.`);

  let next = withGmBlock(desk, NFL_DESK_KEYS.contracts, ledger);
  next = withGmBlock(next, NFL_DESK_KEYS.picks, picks);
  next = withGmBlock(next, NFL_DESK_KEYS.staff, staff);
  return { ok: true, desk: next, news: run.engine, lines, autoSettled, applied: run.applied };
}

/* ------------------------------------------------------------------ */
/* What each box on the hub says                                       */
/* ------------------------------------------------------------------ */

const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`;

/** The staff box. It pulses when a rival is in for one of yours or a chair is empty. */
export function nflStaffTile(desk: GmDesk, league: LeagueState, team: string, on = true): GmTileFace {
  const posts = NFL_STAFF_PACK.posts;
  /* A save without the desk yet plays no staff edge (playWeek hands edges
     only with the desk on), so the box never claims one. */
  if (!on) return { icon: '📋', value: `${posts.length} jobs to fill`, sub: 'Open it to start the desk: no coaching edge until you do', accent: false };
  const s = nflStaffOf(desk, league, team);
  const filled = posts.filter(p => s.block[p.id]).length;
  const poach = s.block.poach;
  const edge = Math.round(nflStaffEdge(s.block) * 100) / 100;
  return {
    icon: '📋',
    value: `${filled} of ${posts.length} jobs filled`,
    sub: poach ? `${poach.club} want your ${postLabel(poach.postId)}` : edge > 0 ? `+${edge} team strength from the coaches` : 'No edge from the coaches yet',
    accent: !!poach || filled < posts.length,
  };
}

/** The re-sign box. It pulses once the deadline has passed and somebody is still waiting on you. */
export function nflContractsTile(desk: GmDesk, league: LeagueState, team: string, seasonOver: boolean, on = true): GmTileFace {
  const up = expiringMen(nflContractHost, league, team);
  /* Without the desk the summer still runs the engine's own offseason, so
     nobody is waiting on the GM until he opens it. */
  if (!on) {
    return {
      icon: '✍️',
      value: up.length ? `${plural(up.length, 'deal')} end this spring` : 'Nobody expiring',
      sub: 'Open it to start the desk: until then the old offseason decides who stays',
      accent: false,
    };
  }
  const ledger = nflContractsOf(desk, league, team);
  const waiting = undecided(nflContractHost, league, ledger).length;
  return {
    icon: '✍️',
    value: up.length ? `${plural(up.length, 'deal')} end this spring` : 'Nobody expiring',
    sub: waiting ? `${waiting} still waiting on you` : up.length ? 'Every call is made' : 'Nobody is out of contract this spring',
    accent: waiting > 0 && (seasonOver || !nflTradeWindow(league).open),
  };
}

/** The picks box. */
export function nflPicksTile(desk: GmDesk, league: LeagueState, team: string): GmTileFace {
  const ledger = nflPicksOf(desk, league);
  const mine = picksHeldBy(ledger, team);
  const now = mine.filter(p => p.year === league.season).length;
  const years = new Set(mine.map(p => p.year)).size;
  return {
    icon: '🎟️',
    value: `${plural(now, 'pick')} in the ${league.season} draft`,
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
export function nflDealsTile(league: LeagueState, on = true): GmTileFace {
  const w = nflTradeWindow(league);
  if (!on) {
    return { icon: '🔁', value: 'Packages and a deadline', sub: `Open it to start the desk: deals shut once Week ${w.deadlineAfter + 1} is played`, accent: false };
  }
  return {
    icon: '🔁',
    value: !w.open ? 'Deadline passed' : w.periodsLeft === 0 ? 'Last week to deal' : `${plural(w.periodsLeft, 'week')} to the deadline`,
    sub: w.open ? 'Players and picks, dead money stays behind' : 'Deals open again after the season',
    accent: w.open && w.periodsLeft <= 1,
  };
}
