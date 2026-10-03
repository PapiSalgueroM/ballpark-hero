/* ─── Round 909: trade packages ───
   A trade in the four Front Office sims was one man for one man, plus at
   most "my last pick this year". A real rebuild is a package: two players
   and a first for their star, a veteran for a second and a prospect. This
   module is the one package engine the four sims share.

   WHAT IT OWNS AND WHAT IT DOES NOT. It owns the shape of a deal: what is
   in it, the order the checks run in, how a pile of assets adds up, and
   moving the assets when both sides agree. It does NOT own a single number
   about a player: what a man or a pick is worth comes in through `valueOf`
   and whether the money and the roster work comes in through `capCheck`,
   so each engine keeps its own trade value, its own cap and its own roster
   floor exactly as they are.

   THE ORDER OF THE CHECKS, and it is the same for every sport:
     1. the deadline (gmDeadline): shut means no deal, whatever is offered
     2. the shape: something each way, no asset twice, not too many pieces
     3. the league's rules on the assets themselves (gmPicks rules for
        picks, GmTradeRules for prospects and retained salary)
     4. the engine's own money and roster check
     5. the value: the other club says yes when what it gets is worth its
        ask, the sum of what it gives times `premium`
   Steps 1 to 4 answer 'invalid' with the reason. Only step 5 can answer
   'rejected', and step 5 can never be made worse by offering more: see
   packageValue.

   League differences are data. MLB picks not being tradable is
   MLB_PICK_RULES.tradableKinds in gmPicks.ts; retained salary being
   modelled only for hockey is NHL_TRADE_RULES.retention below. Nothing here
   reads the sport's name.

   FOR THE BINDING ROUND. This module does not import foTradeTalks.ts:
   evaluatePackage is an instant verdict (offer at least the ask), and
   GmTradeBuilder offers one button, make the trade, when it says yes. Binding it in place of the
   engines' trade path as it stands would drop Round 190's counters and its
   stand firm call, so route a package through the talks there, with this
   module's verdict as the floor the talks open from. */

import {
  type GmPickLedger, type GmPickRules, type GmSportId,
  findPick, movePicks, pickSwapRefusal,
} from './gmPicks';
import { type GmDeadlineRules, deadlineRefusal } from './gmDeadline';

export type TradeAsset =
  /** `retain`: the share of his salary the club giving him keeps paying, 0 to 1. */
  | { kind: 'player'; id: string; retain?: number }
  | { kind: 'prospect'; id: string }
  /** `key`: a pickKey from gmPicks. */
  | { kind: 'pick'; key: string };

export interface TradePackage {
  /** The club proposing. */
  from: string;
  /** The club answering. */
  to: string;
  /** What `from` sends. */
  give: TradeAsset[];
  /** What `from` asks for. */
  get: TradeAsset[];
}

export interface GmRetentionRules {
  /** The most of a salary a club can keep paying. */
  maxShare: number;
  /** Retained contracts one club can carry at a time. */
  maxDealsPerClub: number;
  /** Times one contract can be retained on over its life. */
  maxTimesPerContract: number;
}

export interface GmTradeRules {
  sport: GmSportId;
  /** Pieces one side can put in a deal. A game setting that keeps the builder a tile, not a page. */
  maxAssetsPerSide: number;
  /** Whether a prospect who is not on the roster (his rights, held by the
      club) can be part of a deal. False is this GAME's limit, never a claim
      about the league, and the refusal is worded that way. */
  prospects: boolean;
  /** Absent or null: retained salary is not modelled for this sport. That is
      the game's limit (a club can still pay a player down in other ways in
      real life), and the refusal is worded that way. */
  retention: GmRetentionRules | null;
}

/* NFL and NBA: prospects false and retention null are the game's limits,
   not league rules. The engines hold no pool of unsigned prospects today
   (a drafted man joins the roster at once), and nothing sourced says
   either league bars the trade, so the refusals say "this game". */
const PLAIN: Omit<GmTradeRules, 'sport'> = { maxAssetsPerSide: 5, prospects: false, retention: null };

export const NFL_TRADE_RULES: GmTradeRules = { sport: 'nfl', ...PLAIN };
export const NBA_TRADE_RULES: GmTradeRules = { sport: 'nba', ...PLAIN };

/* NHL retained salary: a club can keep paying up to half of a traded
   player's salary and can carry three retained contracts at a time. Read
   2026-10-02:
     https://thehockeywriters.com/nhl-retained-salary-trades/
     https://www.nbcsports.com/nhl/news/heres-the-deal-with-retaining-salary-in-trades
   One contract can be retained on twice at most: ONE ADDRESS ON RECORD for
   that (the first page; the second gives 50 percent, three contracts and 15
   percent of the upper limit and is silent on it).
   NOT MODELLED: the cap on the total a club retains as a share of the
   league's upper limit, and the newer limits on retaining twice in quick
   succession (one source each today).
   NHL clubs trade the rights to unsigned prospects (deadline deals of March
   2026 carried them), so prospects is true. Read by the round's review on
   2026-10-02:
     https://www.nhl.com/news/topic/trade-coverage/2025-26-nhl-trades
     https://puckpedia.com/news/nhl-draft-pick-rights-set-expire-june-2026 */
export const NHL_TRADE_RULES: GmTradeRules = {
  sport: 'nhl', maxAssetsPerSide: 5, prospects: true,
  retention: { maxShare: 0.5, maxDealsPerClub: 3, maxTimesPerContract: 2 },
};

/* MLB: no ordinary pick can move (gmPicks), so a package is players and
   prospects. retention null is the game's limit: MLB clubs do pay down a
   traded man's salary with cash, which this game does not model yet. */
export const MLB_TRADE_RULES: GmTradeRules = { sport: 'mlb', maxAssetsPerSide: 5, prospects: true, retention: null };

export const GM_TRADE_RULES: Record<GmSportId, GmTradeRules> = {
  nfl: NFL_TRADE_RULES, nba: NBA_TRADE_RULES, nhl: NHL_TRADE_RULES, mlb: MLB_TRADE_RULES,
};

export function assetKey(a: TradeAsset): string {
  return a.kind === 'pick' ? `pick:${a.key}` : `${a.kind}:${a.id}`;
}

/* How a pile adds up for the club RECEIVING it. The best piece counts in
   full and each one after it for a little less, down to a floor: five
   depth players are not a star, which is the oldest trick in a trade
   screen and the one this closes.

   WHY OFFERING MORE CAN NEVER HURT. The weights never rise and never go
   below the floor. Put a new piece x into the sorted pile at place k: it
   earns w[k] * x, and every piece below it slips one weight, losing at
   most x * (w[k] - floor) between them, because none of them is worth
   more than x. So the pile gains at least x * floor, which is not
   negative. scripts/simGmTradePackage.mjs walks that asset by asset. */
export const PACKAGE_WEIGHTS = [1, 0.9, 0.8, 0.7, 0.6];
export const PACKAGE_FLOOR = 0.5;

export function packageValue(values: number[]): number {
  const sorted = values.map(v => Math.max(0, v)).sort((a, b) => b - a);
  let sum = 0;
  for (let i = 0; i < sorted.length; i++) {
    sum += sorted[i] * (i < PACKAGE_WEIGHTS.length ? PACKAGE_WEIGHTS[i] : PACKAGE_FLOOR);
  }
  return sum;
}

export interface TradeSeasonClock {
  rules: GmDeadlineRules;
  /** Regular season weeks or rounds in the engine's season. */
  periods: number;
  /** How many of them have been played. */
  periodsPlayed: number;
  /** True in the offseason. */
  seasonClosed: boolean;
}

export interface PackageContext {
  ledger: GmPickLedger;
  pickRules: GmPickRules;
  tradeRules: GmTradeRules;
  season: number;
  clock: TradeSeasonClock;
  /** What an asset is worth to the club answering (`to`), in the engine's own numbers. */
  valueOf: (asset: TradeAsset) => number;
  /** The engine's money and roster rules for the whole deal. Null means it works. */
  capCheck: (pkg: TradePackage) => string | null;
  /** The ask margin: the engine's old instant verdict threshold (1.08 or 1.07). */
  premium: number;
  /** Retained contracts a club carries now. Absent reads as none. */
  retainedDeals?: (club: string) => number;
  /** Times this player's contract has been retained on. Absent reads as never. */
  timesRetained?: (playerId: string) => number;
}

export type PackageVerdictKind = 'accepted' | 'rejected' | 'invalid';

export interface PackageVerdict {
  verdict: PackageVerdictKind;
  /** Why not, in words the board can show. Null on accepted. */
  reason: string | null;
  /** Which of the five checks answered: 0 when accepted. */
  step: 0 | 1 | 2 | 3 | 4 | 5;
  /** What the offer adds up to for the club answering. */
  offer: number;
  /** What it wants for what it gives. */
  ask: number;
  /** How far short the offer is. Zero when it is enough. */
  short: number;
}

function refuse(step: PackageVerdict['step'], reason: string): PackageVerdict {
  return { verdict: 'invalid', reason, step, offer: 0, ask: 0, short: 0 };
}

function shapeRefusal(pkg: TradePackage, rules: GmTradeRules): string | null {
  if (pkg.from === pkg.to) return 'A club cannot trade with itself.';
  if (pkg.give.length === 0 || pkg.get.length === 0) return 'A trade needs something going each way.';
  if (pkg.give.length > rules.maxAssetsPerSide || pkg.get.length > rules.maxAssetsPerSide) {
    return `No more than ${rules.maxAssetsPerSide} pieces a side.`;
  }
  const seen = new Set<string>();
  for (const a of [...pkg.give, ...pkg.get]) {
    const k = assetKey(a);
    if (seen.has(k)) return 'The same piece is in the deal twice.';
    seen.add(k);
  }
  return null;
}

function retentionRefusal(side: TradeAsset[], club: string, ctx: PackageContext): string | null {
  const rule = ctx.tradeRules.retention;
  let fresh = 0;
  for (const a of side) {
    if (a.kind !== 'player' || !a.retain) continue;
    if (!rule) return 'Retained salary is not part of this game for this sport yet.';
    if (a.retain < 0 || a.retain > rule.maxShare) {
      return `A club can keep paying at most ${Math.round(rule.maxShare * 100)} percent of a salary.`;
    }
    if ((ctx.timesRetained?.(a.id) ?? 0) >= rule.maxTimesPerContract) {
      return 'That contract has been retained on as often as the league allows.';
    }
    fresh++;
  }
  if (rule && fresh > 0 && (ctx.retainedDeals?.(club) ?? 0) + fresh > rule.maxDealsPerClub) {
    return `A club can carry ${rule.maxDealsPerClub} retained contracts at a time.`;
  }
  return null;
}

function pickKeys(side: TradeAsset[]): string[] {
  return side.flatMap(a => (a.kind === 'pick' ? [a.key] : []));
}

function assetRulesRefusal(pkg: TradePackage, ctx: PackageContext): string | null {
  const all = [...pkg.give, ...pkg.get];
  if (!ctx.tradeRules.prospects && all.some(a => a.kind === 'prospect')) {
    return 'Prospects are not part of trades in this game for this sport yet.';
  }
  const picks = pickSwapRefusal(
    ctx.ledger, ctx.pickRules, ctx.season, pkg.from, pickKeys(pkg.give), pkg.to, pickKeys(pkg.get),
  );
  if (picks) return picks;
  return retentionRefusal(pkg.give, pkg.from, ctx) ?? retentionRefusal(pkg.get, pkg.to, ctx);
}

/** The verdict on a package, with nothing moved. */
export function evaluatePackage(pkg: TradePackage, ctx: PackageContext): PackageVerdict {
  const shut = deadlineRefusal(ctx.clock.rules, ctx.clock.periods, ctx.clock.periodsPlayed, ctx.clock.seasonClosed);
  if (shut) return refuse(1, shut);
  const shape = shapeRefusal(pkg, ctx.tradeRules);
  if (shape) return refuse(2, shape);
  const assets = assetRulesRefusal(pkg, ctx);
  if (assets) return refuse(3, assets);
  const money = ctx.capCheck(pkg);
  if (money) return refuse(4, money);
  const offer = packageValue(pkg.give.map(ctx.valueOf));
  let given = 0;
  for (const a of pkg.get) given += Math.max(0, ctx.valueOf(a));
  const ask = given * ctx.premium;
  if (offer < ask) {
    return { verdict: 'rejected', reason: 'They want more for that.', step: 5, offer, ask, short: ask - offer };
  }
  return { verdict: 'accepted', reason: null, step: 0, offer, ask, short: 0 };
}

export interface PackageTeam {
  players: { id: string }[];
  prospects?: { id: string }[];
}

function moveById<P extends { id: string }>(src: P[], dst: P[], id: string): void {
  const i = src.findIndex(p => p.id === id);
  if (i >= 0) dst.push(src.splice(i, 1)[0]);
}

/** Whether club `club` (team `t`, ledger `ledger`) has this piece now. A
    pick is held when the ledger names the club as its holder. */
function holds(t: PackageTeam, club: string, ledger: GmPickLedger, a: TradeAsset): boolean {
  if (a.kind === 'pick') return findPick(ledger, a.key)?.holder === club;
  if (a.kind === 'player') return t.players.some(p => p.id === a.id);
  return !!t.prospects?.some(p => p.id === a.id);
}

function moveAsset(src: PackageTeam, dst: PackageTeam, a: TradeAsset): void {
  if (a.kind === 'player') moveById(src.players, dst.players, a.id);
  else if (a.kind === 'prospect') {
    if (!dst.prospects) dst.prospects = [];
    moveById(src.prospects!, dst.prospects, a.id);
  }
}

/** Move everything in an agreed package. Players and prospects move in
    place on the two clubs, the way every engine's own trade function does;
    the ledger comes back new. Returns null, with nothing moved, when a
    named player, prospect or pick is not where the package says it is. */
export function applyPackage(pkg: TradePackage, from: PackageTeam, to: PackageTeam, ledger: GmPickLedger): GmPickLedger | null {
  if (!pkg.give.every(a => holds(from, pkg.from, ledger, a)) || !pkg.get.every(a => holds(to, pkg.to, ledger, a))) return null;
  for (const a of pkg.give) moveAsset(from, to, a);
  for (const a of pkg.get) moveAsset(to, from, a);
  return movePicks(movePicks(ledger, pickKeys(pkg.give), pkg.to), pickKeys(pkg.get), pkg.from);
}

export interface PackageOutcome { verdict: PackageVerdict; ledger: GmPickLedger }

/** The whole trade path: judge it, and when the answer is yes, make it. */
export function proposePackage(pkg: TradePackage, from: PackageTeam, to: PackageTeam, ctx: PackageContext): PackageOutcome {
  const verdict = evaluatePackage(pkg, ctx);
  if (verdict.verdict !== 'accepted') return { verdict, ledger: ctx.ledger };
  const ledger = applyPackage(pkg, from, to, ctx.ledger);
  if (!ledger) return { verdict: refuse(2, 'A piece of that deal is no longer where it was.'), ledger: ctx.ledger };
  return { verdict, ledger };
}

export interface PickValueCurve {
  /** A first round pick in the next draft, in the engine's own trade value units. */
  first: number;
  /** Each later round is worth this share of the one before. */
  perRound: number;
  /** Each draft further off is worth this share of the one before. */
  perYear: number;
}

/** A pick valuer for an engine's valueOf: the engine supplies the three numbers. */
export function pickValueAt(curve: PickValueCurve, round: number, yearsOut: number): number {
  return curve.first * Math.pow(curve.perRound, Math.max(0, round - 1)) * Math.pow(curve.perYear, Math.max(0, yearsOut));
}

/** The salary a club keeps paying and the salary the new club takes on. */
export function splitRetained(salary: number, retain: number | undefined): { kept: number; moved: number } {
  const share = Math.min(1, Math.max(0, retain ?? 0));
  const kept = Math.round(salary * share * 10) / 10;
  return { kept, moved: Math.round((salary - kept) * 10) / 10 };
}
