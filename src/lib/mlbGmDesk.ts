/**
 * Round 1020: the MLB Front Office takes the GM desk, the way the NHL did in
 * Round 987 (src/lib/nhlGmDesk.ts, the template this file follows block for
 * block). What the board hands the desk and what the desk hands the engine
 * back; the screens are components/mlb-front-office/MlbGmDesk.tsx. Nothing in
 * here draws from Math.random: every roll is a hash, so a board that binds
 * this moves none of its own seeded streams by a single draw.
 *
 * THE PROMISE TO AN OLD SAVE. A save written before this round has no `gm`
 * field, and while it has none the board plays exactly as it always did: the
 * same calls, the same draws, the same coin flip at the summer. The desk is
 * switched on by the GM, the first time he opens one of its boxes
 * (openMlbDesk). From then on four blocks ride on the save:
 *   contracts  the re-sign ledger (gmContracts): his expiring men go to the
 *              desk under MLB's own rules (club control, arbitration, the
 *              qualifying offer), never to the engine's coin flip
 *   picks      the pick ledger (gmPicks) over this game's two round draft.
 *              Ordinary MLB picks cannot be traded and this game awards no
 *              Competitive Balance pick (MLB_PICK_RULES), so the ledger
 *              only ever grows by the extra pick a turned down qualifying
 *              offer brings, and every other pick stays with its own club
 *   staff      the staff block (gmStaff) and the purse it is paid from
 *   retained   the salary a club keeps paying on a man it traded away, as
 *              cash in the deal (MLB_CASH_RETENTION in gmTradePackage.ts)
 * Each block is validated alone and a corrupt one resets alone (gmBlock).
 *
 * scripts/simMlbGmDesk.mjs holds every promise in here to the engine.
 */
import { type GmDesk, type GmTileFace, freshGmDesk, gmBlock, withGmBlock } from './gmDesk';
import {
  type GmContractHost, type GmContractLedger, type GmDecision, autoDecide, expiringMen, isValidLedger, noteArrival,
  openLedger, runDeskOffseason, undecided,
} from './gmContracts';
import { mlbContractHost } from './gmContractsHostMlb';
import {
  type GmPickLedger, type GmPickRules, MLB_PICK_RULES, awardPick, findPick, migrateLegacyPicks, picksHeldBy,
  rollLedger, validateLedger,
} from './gmPicks';
import { MLB_DEADLINE, type DeadlineStance, deadlineStances, stanceValue, tradeWindow, type TradeWindow } from './gmDeadline';
import {
  MLB_CASH_RETENTION, MLB_TRADE_RULES, type GmTradeRules, type PackageContext, type PackageVerdict, type PickValueCurve,
  type TradeAsset, type TradePackage, evaluatePackage, pickValueAt, proposePackage, splitRetained,
} from './gmTradePackage';
import {
  type GmStaffBlock, type GmStaffCtx, gmDefaultStaff, gmHashFloat, gmInjuryWeeks, gmIsValidStaff, gmRolloverStaff,
  gmScoutNoise, gmStaffEffect, gmStaffLevel, gmStatureAnchor, gmSummerWalk, gmTickStaff,
} from './gmStaff';
import { tradeRefusal } from './frontOfficeCuts';
import { MLB_STAFF_PACK, type MlbStaffPost } from '@/data/gmStaff/packs';
import {
  AL, MLB_ROUNDS, type MlbGmPlayer, type MlbGmTeam, type MlbLeague, type MlbOffseasonOptions, type MlbProspect,
  type MlbRoundOptions, mlbCapUsed, mlbOffseason, mlbRosterMax, mlbRosterMin, mlbStrength, mlbTrade, mlbTradeValue,
} from './mlbFrontOffice';

/* ------------------------------------------------------------------ */
/* The blocks                                                          */
/* ------------------------------------------------------------------ */

export const MLB_DESK_KEYS = { contracts: 'contracts', picks: 'picks', staff: 'staff', retained: 'retained' } as const;

/**
 * The pick rules this game drafts under: the league's own (gmPicks, read
 * twice on 2026-10-02: no ordinary pick can be traded) with the rounds cut to
 * the two this game's draft night deals. A function, not a constant, so
 * nothing imported is read at module scope.
 */
export function mlbGamePickRules(): GmPickRules {
  return {
    ...MLB_PICK_RULES,
    rounds: 2,
    partial: [
      ...MLB_PICK_RULES.partial,
      'The real draft runs twenty rounds. This game drafts two, so the ledger carries two.',
      'Draft night here is the game\'s own short draft: you pick first in each batch, then the other clubs go in reverse standings.',
    ],
  };
}

/** MLB's trade rules with cash in a deal, the game's own limits on it (gmTradePackage.ts says which part is the league's). */
export function mlbDeskTradeRules(): GmTradeRules {
  return { ...MLB_TRADE_RULES, retention: MLB_CASH_RETENTION };
}

/** The staff block and the purse its fees and pay offs come out of. */
export interface MlbStaffState {
  block: GmStaffBlock<MlbStaffPost>;
  /** In the pack's purse unit (the game's own millions). Ownership refills it every summer. */
  purse: number;
}

/** A club still paying part of a salary it traded away: `kept` a season, while his deal runs. */
export interface MlbRetainedRow {
  club: string;
  playerId: string;
  name: string;
  share: number;
  kept: number;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function isMlbStaffState(v: unknown): v is MlbStaffState {
  return isObj(v) && gmIsValidStaff(MLB_STAFF_PACK.rules, v.block) && isNum(v.purse) && v.purse >= 0;
}

export function isMlbRetained(v: unknown): v is MlbRetainedRow[] {
  return Array.isArray(v) && v.every(r => isObj(r) && typeof r.club === 'string' && typeof r.playerId === 'string'
    && typeof r.name === 'string' && isNum(r.share) && r.share > 0 && r.share <= MLB_CASH_RETENTION.maxShare
    && isNum(r.kept) && r.kept >= 0);
}

/** What the desk reads from the board to set up its staff. */
export function mlbStaffCtx(league: MlbLeague, team: string): GmStaffCtx<MlbStaffPost> {
  const ids = Object.keys(league.teams).sort();
  const ranked = [...ids].sort((a, b) => mlbStrength(league.teams[b]) - mlbStrength(league.teams[a]) || a.localeCompare(b));
  const rank = Math.max(0, ranked.indexOf(team));
  const stature = ids.length > 1 ? 1 - rank / (ids.length - 1) : 0.5;
  return {
    owner: team, world: 'mlb', season: league.season, week: league.round, money: 1,
    anchor: post => gmStatureAnchor(team, post, stature, MLB_STAFF_PACK.rules.maxLevel),
    inHouse: 2,
    rivals: () => ids.filter(id => id !== team),
  };
}

const freshPicks = (league: MlbLeague): GmPickLedger =>
  /* Every marker on every club's old list is kept: the draft for this season
     is the year the old list was for. */
  migrateLegacyPicks(league.teams, league.season, mlbGamePickRules(), 2).ledger;

const freshStaff = (league: MlbLeague, team: string): MlbStaffState => ({
  block: gmDefaultStaff(MLB_STAFF_PACK.rules, mlbStaffCtx(league, team)),
  purse: MLB_STAFF_PACK.money.seasonPurse,
});

/** The desk the first time the GM opens it. Reads the league, never changes it. */
export function openMlbDesk(league: MlbLeague, team: string): GmDesk {
  let desk = freshGmDesk();
  desk = withGmBlock(desk, MLB_DESK_KEYS.contracts, openLedger(league, team));
  desk = withGmBlock(desk, MLB_DESK_KEYS.picks, freshPicks(league));
  desk = withGmBlock(desk, MLB_DESK_KEYS.staff, freshStaff(league, team));
  desk = withGmBlock(desk, MLB_DESK_KEYS.retained, [] as MlbRetainedRow[]);
  return desk;
}

export function mlbContractsOf(desk: GmDesk, league: MlbLeague, team: string): GmContractLedger {
  return gmBlock(desk, MLB_DESK_KEYS.contracts, v => isValidLedger(v) && v.team === team, () => openLedger(league, team));
}

export function mlbPicksOf(desk: GmDesk, league: MlbLeague): GmPickLedger {
  const ids = Object.keys(league.teams);
  return gmBlock(desk, MLB_DESK_KEYS.picks, v => validateLedger(v, ids, mlbGamePickRules()) !== null, () => freshPicks(league));
}

export function mlbStaffOf(desk: GmDesk, league: MlbLeague, team: string): MlbStaffState {
  return gmBlock(desk, MLB_DESK_KEYS.staff, isMlbStaffState, () => freshStaff(league, team));
}

export function mlbRetainedOf(desk: GmDesk): MlbRetainedRow[] {
  return gmBlock(desk, MLB_DESK_KEYS.retained, isMlbRetained, () => [] as MlbRetainedRow[]);
}

/** A deep copy that survives JSON, the only shape a save block may have. */
export const deskCopy = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/* ------------------------------------------------------------------ */
/* The staff's effects                                                 */
/* ------------------------------------------------------------------ */

/** The engine's own weights (mlbStrength): the lineup 55 percent, the rotation 33 and the pen 12. */
export const MLB_LINEUP_WEIGHT = 0.55;
/** The pitching coach works the rotation and the pen, so his points reach both, at their weights together. */
export const MLB_PITCHING_WEIGHT = 0.33 + 0.12;

/**
 * Strength points the staff adds to the club. hitEdge is rating points on
 * every bat the sim plays and pitchEdge on every arm it plays (the three
 * starters and the two relievers mlbStrengthUnits reads), so each reaches
 * the strength the way a rating point there does. Zero for a desk of level 1
 * men or empty chairs.
 */
export function mlbStaffEdge(block: GmStaffBlock<MlbStaffPost> | null | undefined): number {
  const e = (key: string) => gmStaffEffect(MLB_STAFF_PACK, block, key);
  return e('hitEdge') * MLB_LINEUP_WEIGHT + e('pitchEdge') * MLB_PITCHING_WEIGHT;
}

/** The medical post's ladder, off the pack, so the number on the tile is the number applied. */
function medicalEffect() {
  return MLB_STAFF_PACK.posts.find(p => p.id === 'medical')!.effects.find(e => e.key === 'injuryWeeks')!;
}

/** Rounds on the IL after the trainer has had him. Hashed off the man and the round, never drawn. */
export function mlbInjuryRounds(block: GmStaffBlock<MlbStaffPost>, team: string, season: number, round: number, playerId: string, rounds: number): number {
  const roll = gmHashFloat(`mlb-injury|${team}|${season}|${round}|${playerId}`);
  return gmInjuryWeeks(rounds, medicalEffect(), gmStaffLevel(block, 'medical'), roll);
}

/**
 * The farm director's read on one young man's winter: the points the engine
 * drew, times the growth the farm adds, rounded with a hash of the man (so
 * on average it is exactly that share more, and a level 1 farm is exactly
 * the engine's draw). The engine still caps him at his ceiling.
 */
export function mlbFarmGain(block: GmStaffBlock<MlbStaffPost> | null | undefined, team: string, season: number, playerId: string, gain: number): number {
  const mult = gmStaffEffect(MLB_STAFF_PACK, block, 'growth');
  const roll = Math.min(0.999999, gmHashFloat(`mlb-farm|${team}|${season}|${playerId}`));
  return Math.floor(gain * mult + roll);
}

/** What the desk hands a round: the club's edge and the trainer, for the user's club only. */
export function mlbDeskRoundOptions(desk: GmDesk, league: MlbLeague, team: string): MlbRoundOptions {
  const staff = mlbStaffOf(desk, league, team).block;
  return {
    edges: { [team]: mlbStaffEdge(staff) },
    injuryRounds: (abbr, p, rounds) => abbr === team ? mlbInjuryRounds(staff, team, league.season, league.round, p.id, rounds) : rounds,
  };
}

/** The same edge for October. */
export function mlbDeskEdges(desk: GmDesk, league: MlbLeague, team: string): Record<string, number> {
  return { [team]: mlbStaffEdge(mlbStaffOf(desk, league, team).block) };
}

/** What the desk hands the offseason: the farm director, for the user's club only. */
export function mlbDeskOffseasonOptions(block: GmStaffBlock<MlbStaffPost>, team: string, season: number): MlbOffseasonOptions {
  return { growth: (abbr, p, gain) => abbr === team ? mlbFarmGain(block, team, season, p.id, gain) : gain };
}

/**
 * The user's scouting director's read of a prospect: the true rating plus a
 * miss whose spread his level sets (gmScoutNoise), clamped the way the engine
 * clamps its own grade. The draw is a hash of the prospect, so the read is
 * fixed for the night. The CPU clubs keep the engine's own grade.
 */
export function mlbScoutRead(p: Pick<MlbProspect, 'id' | 'trueOvr'>, team: string, season: number, level: number): number {
  const u = gmHashFloat(`mlb-scout|${team}|${season}|${p.id}`);
  return Math.max(65, Math.min(93, p.trueOvr + gmScoutNoise(u, level)));
}

/* ------------------------------------------------------------------ */
/* Picks                                                               */
/* ------------------------------------------------------------------ */

/**
 * Every club's engine list rebuilt from the ledger: one marker per pick it
 * holds in this season's draft, lowest round first. The engine's draft night
 * reads only that list (mlbDraftCapital), so the extra pick a turned down
 * qualifying offer earned is on the list the night it is owed. Not called
 * during the draft: the engine spends markers there and the summer drops
 * that year.
 */
export function syncMlbPicks(league: MlbLeague, ledger: GmPickLedger): void {
  for (const [abbr, t] of Object.entries(league.teams)) {
    t.picks = picksHeldBy(ledger, abbr, league.season).filter(p => p.round <= 2).map(p => p.round).sort((a, b) => a - b);
  }
}

/**
 * The older trade paths with the desk on. In MLB only Competitive Balance
 * picks can be traded and this game awards none (MLB_PICK_RULES), so the
 * trade finder's sweetened offers are refused here and the phone talks are
 * handed no pick to add; a man for a man still goes
 * through the engine's own trade exactly as before.
 */
export function mlbDeskFinderTrade(
  my: MlbGmTeam, their: MlbGmTeam, myId: string, theirId: string, sweeten: boolean, cap: number,
): 'accepted' | 'rejected' | 'invalid' {
  if (sweeten) return 'invalid';
  return mlbTrade(my, their, myId, theirId, false, cap);
}

/** What the old trade paths say when a pick would have gone into a deal with the desk on. */
export const MLB_NO_PICK_TRADES = 'In MLB only Competitive Balance picks can be traded, and this game awards none, so this desk deals players and cash only.';

/* ------------------------------------------------------------------ */
/* The deadline, and who is buying                                    */
/* ------------------------------------------------------------------ */

/**
 * Rounds already played this season. `league.round` is the round about to
 * be played. The one place the deadline's clock is read, so the hub, the
 * old trade paths and the packages can never count it two ways.
 */
export function mlbPeriodsPlayed(league: MlbLeague): number {
  return Math.max(0, league.round - 1);
}

/** The window as the hub sees it. */
export function mlbTradeWindow(league: MlbLeague): TradeWindow {
  return tradeWindow(MLB_DEADLINE, MLB_ROUNDS, mlbPeriodsPlayed(league), false);
}

/** Why a trade is refused today, or null. Every trade path on the board asks this first once the desk is on. */
export function mlbDeadlineRefusal(league: MlbLeague): string | null {
  return mlbTradeWindow(league).reason;
}

/** Playoff places in each league: three division winners and three wild cards (mlbLeagueSeeds). */
export const MLB_PLAYOFF_SPOTS = 6;

/** Buyers and sellers by the standings: six October places in each league. */
export function mlbStances(league: MlbLeague): Record<string, DeadlineStance> {
  const rows = Object.values(league.teams).map(t => ({
    id: t.abbr, wins: t.wins, losses: t.losses, group: AL.includes(t.abbr) ? 'AL' : 'NL',
  }));
  return deadlineStances(rows, MLB_PLAYOFF_SPOTS).stance;
}

/* ------------------------------------------------------------------ */
/* Packages                                                            */
/* ------------------------------------------------------------------ */

/**
 * What a pick would be worth in the engine's trade value units, for the day
 * a pick MLB lets move (a Competitive Balance pick) is ever awarded: the
 * engine has always priced a pick in a deal at 13 (mlbTrade's sweetener and
 * the trade talks' pickValue), the last on the list, a second rounder. The
 * game's own figures. No ordinary pick reaches this: the pick rule refuses
 * the deal first.
 */
export const MLB_PICK_CURVE: PickValueCurve = { first: 32.5, perRound: 0.4, perYear: 0.85 };
/** The engine's own ask margin on a deal (mlbTrade, the trade talks). */
export const MLB_PACKAGE_PREMIUM = 1.07;
/** What the board says about a man designated this season, so the refusal reads like the rest of the board. */
export const MLB_CUT_SAID = 'You designated him for assignment this season.';

const playerIn = (league: MlbLeague, id: string): MlbGmPlayer | undefined => {
  for (const t of Object.values(league.teams)) { const p = t.players.find(x => x.id === id); if (p) return p; }
  return undefined;
};

/** The engine's money and roster rules for a whole package, side by side. Null means it works. */
export function mlbPackageCapCheck(league: MlbLeague, pkg: TradePackage): string | null {
  for (const [club, out, inc] of [[pkg.from, pkg.give, pkg.get], [pkg.to, pkg.get, pkg.give]] as const) {
    const t = league.teams[club];
    if (!t) return 'That club is not in this league.';
    const outMen = out.flatMap(a => (a.kind === 'player' ? [a] : []));
    const inMen = inc.flatMap(a => (a.kind === 'player' ? [a] : []));
    const after = t.players.length - outMen.length + inMen.length;
    if (after < mlbRosterMin(t)) return `That would leave ${club} with ${after} players. A club needs at least ${mlbRosterMin(t)}.`;
    if (after > mlbRosterMax(t)) return `${club} has no room for that many players: the limit is ${mlbRosterMax(t)}.`;
    let outMoved = 0, inMoved = 0;
    for (const a of outMen) { const p = playerIn(league, a.id); if (p) outMoved += splitRetained(p.salary, a.retain).moved; }
    for (const a of inMen) {
      const p = playerIn(league, a.id);
      if (!p) continue;
      inMoved += splitRetained(p.salary, a.retain).moved;
      const refused = tradeRefusal(t, a.id, MLB_CUT_SAID);
      if (refused) return refused;
    }
    const payrollAfter = mlbCapUsed(t) - outMoved + inMoved;
    /* The engine's own matching rule (Round 82), for a pile instead of one man. */
    if (payrollAfter > league.cap + 1e-9 && inMoved > outMoved * 1.5 + 5) {
      return `That puts ${club} over the tax line: $${Math.round(payrollAfter * 10) / 10}M against $${league.cap}M.`;
    }
  }
  return null;
}

/** Everything gmTradePackage needs to judge a deal the user's club puts to `partner`. */
export function mlbPackageContext(league: MlbLeague, desk: GmDesk, team: string, partner: string): PackageContext {
  const ledger = mlbPicksOf(desk, league);
  const stance = mlbStances(league)[partner] ?? 'holding';
  const retained = mlbRetainedOf(desk);
  return {
    ledger, pickRules: mlbGamePickRules(), tradeRules: mlbDeskTradeRules(), season: league.season,
    clock: { rules: MLB_DEADLINE, periods: MLB_ROUNDS, periodsPlayed: mlbPeriodsPlayed(league), seasonClosed: false },
    valueOf: (a: TradeAsset) => {
      if (a.kind === 'player') { const p = playerIn(league, a.id); return p ? stanceValue(stance, mlbTradeValue(p), p.age) : 0; }
      if (a.kind === 'pick') {
        const p = findPick(ledger, a.key);
        return p ? stanceValue(stance, pickValueAt(MLB_PICK_CURVE, p.round, p.year - league.season)) : 0;
      }
      return 0;
    },
    capCheck: pkg => mlbPackageCapCheck(league, pkg),
    premium: MLB_PACKAGE_PREMIUM,
    retainedDeals: club => retained.filter(r => r.club === club).length,
    timesRetained: id => retained.filter(r => r.playerId === id).length,
  };
}

export interface MlbPackageResult {
  verdict: PackageVerdict;
  desk: GmDesk;
  /** The players who came to the user's club. */
  arrived: MlbGmPlayer[];
}

/**
 * Judge a package and, on a yes, make it: players move on the two clubs in
 * the league handed in (the board hands a copy), the ledger comes back from
 * the shared module (no ordinary pick can be in a deal it said yes to), and
 * every salary a club keeps paying goes on its payroll as a line that runs as
 * long as his deal does.
 */
export function mlbProposePackage(league: MlbLeague, desk: GmDesk, team: string, pkg: TradePackage): MlbPackageResult {
  const ctx = mlbPackageContext(league, desk, team, pkg.to);
  const from = league.teams[pkg.from], to = league.teams[pkg.to];
  if (!from || !to) return { verdict: evaluatePackage(pkg, ctx), desk, arrived: [] };
  const out = proposePackage(pkg, from, to, ctx);
  if (out.verdict.verdict !== 'accepted') return { verdict: out.verdict, desk, arrived: [] };
  const rows = [...mlbRetainedOf(desk)];
  for (const r of out.retained) {
    const p = playerIn(league, r.playerId);
    const payer = league.teams[r.club];
    if (!p || !payer) continue;
    const { kept, moved } = splitRetained(p.salary, r.share);
    p.salary = moved;
    payer.deadCap = [...(payer.deadCap ?? []), { playerId: p.id, name: p.name, amount: kept, seasonsLeft: Math.max(1, p.years) }];
    rows.push({ club: r.club, playerId: p.id, name: p.name, share: r.share, kept });
  }
  syncMlbPicks(league, out.ledger);
  const mine = league.teams[team];
  const arrivedIds = (pkg.from === team ? pkg.get : pkg.give).flatMap(a => (a.kind === 'player' ? [a.id] : []));
  const arrived = mine.players.filter(p => arrivedIds.includes(p.id));
  let next = withGmBlock(desk, MLB_DESK_KEYS.picks, out.ledger);
  next = withGmBlock(next, MLB_DESK_KEYS.retained, rows);
  next = mlbNoteArrivals(next, league, team, arrived.map(p => p.id), 'trade');
  return { verdict: out.verdict, desk: next, arrived };
}

/** Tell the re-sign ledger how men arrived: a trade or a signing in season, or the draft with its round. */
export function mlbNoteArrivals(desk: GmDesk, league: MlbLeague, team: string, ids: string[], how: 'trade' | 'signing' | 'draft', round?: number): GmDesk {
  if (!ids.length) return desk;
  const ledger = deskCopy(mlbContractsOf(desk, league, team));
  for (const id of ids) noteArrival(ledger, id, league.season, how, round, how !== 'draft');
  return withGmBlock(desk, MLB_DESK_KEYS.contracts, ledger);
}

/* ------------------------------------------------------------------ */
/* The round and the summer                                            */
/* ------------------------------------------------------------------ */

const postLabel = (post: string): string => (MLB_STAFF_PACK.posts.find(p => p.id === post)?.label ?? post).toLowerCase();

/** One tick of the staff desk, after a round: an approach runs down, or a rival comes in. A club acting, never a person speaking. */
export function mlbDeskAfterRound(desk: GmDesk, league: MlbLeague, team: string): { desk: GmDesk; line: string | null } {
  const staff = deskCopy(mlbStaffOf(desk, league, team));
  const ev = gmTickStaff(MLB_STAFF_PACK.rules, staff.block, mlbStaffCtx(league, team));
  const next = withGmBlock(desk, MLB_DESK_KEYS.staff, staff);
  if (!ev) return { desk: next, line: null };
  return {
    desk: next,
    line: ev.kind === 'approach'
      ? `📞 ${ev.club} have come in for ${ev.person.name}, your ${postLabel(ev.post)}. Match it or let him go on the staff desk.`
      : `👋 ${ev.person.name} has left your ${postLabel(ev.post)} job for ${ev.club}.`,
  };
}

export interface MlbDeskSummer {
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
  /** The extra picks a turned down qualifying offer paid this summer, by round. A pick the league awards, never one taken from a club. */
  compPicks: number[];
}

/**
 * The summer with the desk on, in place of mlbOffseason. Every one of the
 * user's expiring men already has a decision when the engine runs: the GM's,
 * or for a man he left open, the staff's written rule (autoDecide), never a
 * draw. Then the engine's own offseason runs for the whole league, exactly as
 * before, with the user's club (so the CPU clubs are cut to 28 the way Round
 * 829 does it) and the farm director on the user's young men. After it: the
 * draft just held leaves the pick ledger, a turned down qualifying offer whose
 * man signed elsewhere pays its extra pick, every engine list is rebuilt from
 * the ledger, every retained salary goes back to its full figure for the
 * season ahead, and the staff roll over. Mutates the league handed in, like
 * the engine's own offseason.
 */
export function mlbDeskOffseason(league: MlbLeague, desk: GmDesk, team: string, rng: () => number): MlbDeskSummer {
  const closed = league.season;
  const ids = Object.keys(league.teams);
  const picksBefore = mlbPicksOf(desk, league);
  const staffBefore = mlbStaffOf(desk, league, team);
  const retainedBefore = mlbRetainedOf(desk);
  const ledger = deskCopy(mlbContractsOf(desk, league, team));
  const host: GmContractHost<MlbLeague, string[]> = {
    ...mlbContractHost,
    runOffseason: (lg, r, t) => mlbOffseason(lg, r, t, mlbDeskOffseasonOptions(staffBefore.block, team, closed)),
  };
  const autoSettled = autoDecide(host, league, ledger);
  const run = runDeskOffseason(host, league, ledger, rng);
  if (run.ok === false) return { ok: false, desk, notes: [], lines: [`Still waiting on: ${run.undecided.map(u => u.name).join(', ')}.`], autoSettled: [], applied: [], compPicks: [] };

  let picks = rollLedger(picksBefore, ids, closed, mlbGamePickRules());
  const compPicks = [...(run.picksAdded ?? [])];
  for (const round of compPicks) picks = awardPick(picks, league.season, round, team, 'comp');
  syncMlbPicks(league, picks);

  const retained = retainedBefore.filter(r => {
    const entry = league.teams[r.club]?.deadCap?.find(d => d.playerId === r.playerId);
    if (!entry) return false;
    entry.amount = r.kept;
    return true;
  });

  const walk = gmSummerWalk(MLB_STAFF_PACK.rules, staffBefore.block);
  const staff: MlbStaffState = {
    block: gmRolloverStaff(MLB_STAFF_PACK.rules, staffBefore.block, mlbStaffCtx(league, team)),
    purse: MLB_STAFF_PACK.money.seasonPurse,
  };

  const lines: string[] = [];
  const stayed = run.applied.filter(d => ['keep', 'option', 'tender', 'qualify-accepted', 'match'].includes(d.kind)).length;
  if (run.applied.length) lines.push(`📋 The re-sign desk: ${stayed} kept, ${run.applied.length - stayed} gone.`);
  if (autoSettled.length) lines.push(`📋 You left ${autoSettled.length} deal${autoSettled.length === 1 ? '' : 's'} open, so your staff settled ${autoSettled.length === 1 ? 'it' : 'them'} by its own rule.`);
  if (compPicks.length) lines.push(`🎟️ A man who turned down your qualifying offer signed elsewhere, so you get an extra round ${compPicks.join(' and round ')} pick in ${league.season}.`);
  if (walk) lines.push(`👋 ${walk.person.name} took the ${postLabel(walk.post)} job at ${walk.club}. Nobody matched it.`);

  let next = withGmBlock(desk, MLB_DESK_KEYS.contracts, ledger);
  next = withGmBlock(next, MLB_DESK_KEYS.picks, picks);
  next = withGmBlock(next, MLB_DESK_KEYS.staff, staff);
  next = withGmBlock(next, MLB_DESK_KEYS.retained, retained);
  return { ok: true, desk: next, notes: run.engine, lines, autoSettled, applied: run.applied, compPicks };
}

/* ------------------------------------------------------------------ */
/* What each box on the hub says                                       */
/* ------------------------------------------------------------------ */

const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`;

/** The staff box. It pulses when a rival is in for one of yours or a chair is empty. */
export function mlbStaffTile(desk: GmDesk, league: MlbLeague, team: string): GmTileFace {
  const s = mlbStaffOf(desk, league, team);
  const posts = MLB_STAFF_PACK.posts;
  const filled = posts.filter(p => s.block[p.id]).length;
  const poach = s.block.poach;
  const edge = Math.round(mlbStaffEdge(s.block) * 100) / 100;
  return {
    icon: '📋',
    value: `${filled} of ${posts.length} jobs filled`,
    sub: poach ? `${poach.club} want your ${postLabel(poach.postId)}` : edge > 0 ? `+${edge} team strength from the dugout` : 'No edge from the dugout yet',
    accent: !!poach || filled < posts.length,
  };
}

/** The re-sign box. It pulses once the deadline has passed and somebody is still waiting on you. */
export function mlbContractsTile(desk: GmDesk, league: MlbLeague, team: string, seasonOver: boolean): GmTileFace {
  const ledger = mlbContractsOf(desk, league, team);
  const up = expiringMen(mlbContractHost, league, team);
  const waiting = undecided(mlbContractHost, league, ledger).length;
  return {
    icon: '✍️',
    value: up.length ? `${plural(up.length, 'deal')} end this winter` : 'Nobody expiring',
    sub: waiting ? `${waiting} still waiting on you` : up.length ? 'Every call is made' : 'Nobody is out of contract this winter',
    accent: waiting > 0 && (seasonOver || !mlbTradeWindow(league).open),
  };
}

/** The picks box. */
export function mlbPicksTile(desk: GmDesk, league: MlbLeague, team: string): GmTileFace {
  const mine = picksHeldBy(mlbPicksOf(desk, league), team, league.season);
  const extra = mine.filter(p => p.kind === 'comp').length;
  return {
    icon: '🎟️',
    value: `${plural(mine.length, 'pick')} in ${league.season}`,
    sub: extra ? `${plural(extra, 'extra pick')} from a qualifying offer` : 'Ordinary MLB picks cannot be traded',
    accent: false,
  };
}

/**
 * The deal box: packages, and how long until the deadline shuts them. On a
 * save without the desk yet (`on` false) the deadline does not apply, the
 * phone and the trade finder still deal, so the box says what opening it
 * brings instead of a deadline that is not running.
 */
export function mlbDealsTile(league: MlbLeague, on = true): GmTileFace {
  const w = mlbTradeWindow(league);
  if (!on) {
    return { icon: '🔁', value: 'Packages and a deadline', sub: `Open it to start the desk: deals shut once round ${w.deadlineAfter + 1} is played`, accent: false };
  }
  return {
    icon: '🔁',
    value: !w.open ? 'Deadline passed' : w.periodsLeft === 0 ? 'Last round to deal' : `${plural(w.periodsLeft, 'round')} to the deadline`,
    sub: w.open ? 'Players, and cash toward a salary' : 'Deals open again after the season',
    accent: w.open && w.periodsLeft <= 1,
  };
}
