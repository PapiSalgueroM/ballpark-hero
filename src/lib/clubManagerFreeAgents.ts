/*
 * Round 619: free agents, and the door out of a contract.
 *
 * Reported through the footer form: "Add free agents to Manager Mode, and
 * allow players to have their contracts terminated so they become free
 * agents." Both halves are the same system, which is why they ship together:
 * a termination that produces nobody is just a delete button, and a free
 * agent pool with nothing feeding it is a list that never changes.
 *
 * WHAT WAS ALREADY HERE, AND WHY IT WAS NOT THIS. Since Round 105 a deal has
 * ticked down and a man you never sat down with walks in the summer. The
 * rollover called those players `freeAgentNews`, pushed a line saying they
 * left "for nothing", and then dropped them on the floor: they were gone from
 * the squad, gone from the market (buildMarket reads the projected rosters,
 * and a man who left your club is not in anybody's roster), gone from the
 * game. So the one thing the word "free agent" promises, that somebody can
 * sign him, had never been true. Round 132's fillSquadGaps calls its
 * emergency signings free agents too, but it is drawing them out of
 * marketBase, which is to say out of other clubs' squads, so that is not a
 * free transfer either. This module is the pool those players should always
 * have been going into.
 *
 * THE THREE WAYS IN, and they are the three the report asked for:
 *   expired     his deal ran out. Yours at the rollover, or a club's in the
 *               simulated world.
 *   terminated  you paid him off (terminateContract).
 *   released    the squad limit trimmed him, or the world let him go.
 *
 * THE ONE RULE THAT MAKES THIS INTERESTING. A free agent has no club, so
 * there is nobody to negotiate a fee with, so the transfer window does not
 * apply to him. That is the real regulation and not a convenience: an
 * unattached player may be registered outside a window. It means the pool is
 * the only thing in this game you can do in February, and an injury crisis in
 * a closed window now has an answer that costs money instead of nothing.
 *
 * WHOSE EMPLOYMENT THIS GAME IS ALLOWED TO INVENT. A simulated transfer of a
 * real player is something this engine has always done (generateHeadlines has
 * been writing them since Round 99) and it reads as what it is, the sim's
 * forward world. Saying a real professional is UNEMPLOYED is a shade
 * different: in season one the world still IS the real baked season, so that
 * line would land as a claim about the man rather than about the save. So the
 * world only starts releasing real players once the world has moved: the pool
 * is gated on yearsOn >= 1 (see WORLD_POOL_FROM_YEAR). Season one still has a
 * pool, fed by your own terminations and by the players this game made up,
 * who are marked MADE UP wherever they appear. Nothing here ever says
 * anything about a real person that the save did not simulate first.
 *
 * Everything in this file is pure. State transitions live in clubManager.ts
 * beside the signings they mirror, the same split clubManagerDeals.ts uses.
 */

import type { CMPlayer, MarketPlayer, SquadRole } from '@/lib/clubManager';
import type { PersonalTerms } from '@/lib/clubManagerDeals';
import type { Position } from '@/types/game';

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
const round1 = (n: number): number => Math.round(n * 10) / 10;

/* ================================================================== */
/* 1. The record                                                       */
/* ================================================================== */

/** Why a player has no club. Shown on his card, because it is the story. */
export type FreeAgentReason = 'expired' | 'terminated' | 'released';

/**
 * A player with no club.
 *
 * Deliberately NOT a MarketPlayer. A MarketPlayer carries `club` and `price`,
 * and both are lies about a free agent: there is no club and there is no fee.
 * Round 507's own comment makes the point in the other direction (a signing on
 * fee "must never be reported as the transfer fee"), and reusing the shape
 * here would have put a price on a man who does not have one and then relied
 * on every screen remembering to hide it. A separate record cannot be printed
 * wrong.
 */
export interface FreeAgent {
  /** Unique inside the pool. Not a squad id: he is not in a squad. */
  id: string;
  name: string;
  position: Position;
  age: number;
  rating: number;
  /** Real market value in £m, carried from wherever he came from. */
  value?: number;
  /** The last club he played for, for the card. */
  lastClub: string;
  reason: FreeAgentReason;
  /** The season he became available. */
  since: number;
  /** Weeks unattached. His terms soften as this grows. */
  weeks: number;
  /** This game made him up. Every screen that shows a name reads it. */
  generated?: boolean;
  /** He came off MY books. The pool card says so, and it is a fair warning. */
  wasMine?: boolean;
}

/**
 * How long a man stays on the board before he stops being news.
 *
 * Just under a full season of calendar entries, which is the number that
 * matters: at 26 (the first try) a player who joined the board in August was
 * off it by March, so the board was empty in exactly the weeks the feature
 * exists for, the closed window when there is nothing else you can do. Long
 * enough that waiting is a real strategy, short enough that the pool turns
 * over rather than silting up with the same twenty names for a decade.
 */
export const FA_SHELF_WEEKS = 34;

/**
 * The size below which the board starts topping itself up mid season, so there
 * is always something to look at in February. See midSeasonRelease.
 *
 * It is a TRIGGER and not a guarantee, and the name is the closest short one
 * rather than a promise: the top-up adds at most one player a week and only on
 * a roll, while rival clubs can take several in the same week, so the board
 * genuinely sits under this number for a good part of a season. Measured over
 * four clubs and five seasons it ran between 3 and 26 with a mean near 8, and
 * spent 14 to 28 weeks a season below it. That is the intended shape: a hard
 * floor would make the board a reliable shop, which is exactly what it must
 * not be. What IS guaranteed is that it never empties, and simClubManagerFreeAgents
 * section 7 is what holds that.
 */
export const FA_BOARD_FLOOR = 8;

/** The pool never grows past this, so a long save cannot turn it into a list
 *  nobody can read. Lowest rated go first when it overflows. */
export const FA_POOL_MAX = 40;

/* ================================================================== */
/* 2. Paying a man off                                                 */
/* ================================================================== */

/**
 * What fraction of the money still owed it takes to end the deal.
 *
 * A contract is the club's promise to pay, so ending it early means buying
 * that promise back, and what it costs depends on one thing the manager can
 * actually move: whether he wants to be here. A man agitating for a move will
 * take a settlement to get out of the door. A happy first teamer on a long
 * deal has no reason to accept anything less than most of it, and at a star's
 * wage that is a number no club can find.
 *
 * That is the whole strategic shape of this feature and it is meant to be
 * learnable: freezing somebody out makes him cheaper to remove. The floor at
 * 0.25 is what stops it becoming free, because a route to a zero cost squad
 * clearout would undo Round 105's entire constraint (see simContracts: a
 * constraint that never binds is not a feature).
 */
export const PAYOFF_BASE = 0.62;
export const PAYOFF_FLOOR = 0.25;
export const PAYOFF_CEILING = 0.85;
/** What a transfer request is worth off the settlement. */
export const PAYOFF_WANTS_OUT = 0.25;
/** Per point of morale either side of content. */
export const PAYOFF_PER_MORALE = 0.003;

export function payoffRate(p: CMPlayer): number {
  let rate = PAYOFF_BASE;
  if (p.wantsOut) rate -= PAYOFF_WANTS_OUT;
  /* Above 70 this ADDS: a contented player is dearer to shift, which is the
     right way round and the reason the sign is a subtraction of a negative. */
  rate -= (70 - clamp(p.morale, 5, 99)) * PAYOFF_PER_MORALE;
  return clamp(Math.round(rate * 100) / 100, PAYOFF_FLOOR, PAYOFF_CEILING);
}

/** Every week of wages the club still owes him, in millions. */
export function wageOwed(p: CMPlayer): number {
  const wage = Math.max(0, p.wage ?? 0);
  /* A man in the last year of his deal is still owed this season. Round 132's
     comment explains why nobody is ever on less than a year here: contract
     years tick at the rollover, before a ball is kicked. */
  const years = Math.max(1, p.contractYears ?? 1);
  return round1((wage * 52 * years) / 1000);
}

/** The cheque that ends his deal today, in millions. */
export function terminationCost(p: CMPlayer): number {
  return Math.max(0.1, round1(wageOwed(p) * payoffRate(p)));
}

/**
 * What the dressing room makes of it, in morale points off everyone else.
 *
 * Binning a popular first teamer is a message to the rest of them. Binning a
 * man who had downed tools is a relief, and the room says so. The size reads
 * his standing (rating against the squad) and his mood, so there is no flat
 * penalty to memorise.
 */
export function terminationMoraleHit(p: CMPlayer, squadAvgRating: number): number {
  if (p.wantsOut) return -1;                     // the room wanted this too
  const standing = clamp(p.rating - squadAvgRating, -12, 12);
  const settled = clamp((p.morale - 50) / 10, -5, 5);
  return clamp(Math.round((standing * 0.45 + settled * 0.9)), -2, 8);
}

/* ================================================================== */
/* 3. What a free agent asks for                                       */
/* ================================================================== */

/**
 * His leverage, 1.0 the week he becomes available down to 0.6 half a season
 * later. Everything he asks for is multiplied by this, so the patient manager
 * is paying for the same player later at a real discount, and the price of
 * that patience is that somebody else may take him first (see the weekly AI
 * pass in clubManager.ts).
 */
export const FA_PULL_FLOOR = 0.6;

export function marketPull(weeks: number): number {
  const w = clamp(weeks, 0, FA_SHELF_WEEKS);
  return clamp(1 - (w / FA_SHELF_WEEKS) * (1 - FA_PULL_FLOOR), FA_PULL_FLOOR, 1);
}

/** The rung he believes he is joining for. His opinion of himself, the same
 *  way expectedRole is for a market player. */
export function freeAgentRole(fa: FreeAgent): SquadRole {
  if (fa.age <= 19) return 'prospect';
  if (fa.rating >= 84) return 'star';
  if (fa.rating >= 79) return 'key';
  if (fa.rating >= 73) return 'rotation';
  return 'backup';
}

/**
 * What he wants to sign for.
 *
 * The wage curve is wageFor's and the age leverage is renewalTerms', exactly
 * as askingTerms does it, so a free agent's wage and a renewal wage sit on one
 * scale and the contracts desk cannot disagree with the pool. The two
 * differences are both the point of the feature:
 *   - his demands fall the longer he waits (marketPull);
 *   - the bonus is bigger relative to his value than a bought player's,
 *     because the money that would have gone to a selling club goes to him
 *     and his agent instead. It is still a fraction of what buying him costs.
 */
export const FA_BONUS_OF_VALUE = 0.18;

/**
 * What a free agent costs a week, against the same man with a price on his
 * head. This is the balancing lever of the whole feature and it is also the
 * true one.
 *
 * A club signing a free agent saves the entire fee, and that saving does not
 * vanish: the player and his agent capture it, because they are the ones with
 * something to sell and there is no selling club in the room to take a cut.
 * That is why a free transfer in football is routinely the WORST wage on the
 * books and why clubs are wary of them.
 *
 * Without this the first build measured what you would expect. Everton, three
 * seasons, three arms on the same seed: a manager who signed nothing finished
 * with an eleven rated 74.0, a manager who bought finished on 76.0 having spent
 * 180m on seven players, and a manager who signed ONLY free agents finished on
 * 80.0 having spent 35m on fourteen and with 78m still in the bank. The board
 * was not an alternative to the transfer market, it was strictly better than
 * it, which is the exact failure this feature had to avoid.
 */
export const FA_WAGE_PREMIUM = 1.35;

export function freeAgentTerms(fa: FreeAgent): PersonalTerms {
  const value = Math.max(0.3, fa.value ?? 0.5);
  const market = Math.max(1, Math.round(Math.pow(value, 0.72) * 3.6));
  const leverage = fa.age <= 23 ? 1.15 : fa.age <= 29 ? 1.3 : 0.95;
  const pull = marketPull(fa.weeks);
  const wage = Math.max(1, Math.round(market * leverage * pull * FA_WAGE_PREMIUM));
  /* Never one year, for Round 132's reason: a one year deal ticks to zero at
     the next rollover and he walks without ever playing under it. */
  const years = fa.age >= 29 ? 2 : 3;
  const bonus = Math.max(0.1, round1(value * FA_BONUS_OF_VALUE * pull));
  return { years, wage, bonus, role: freeAgentRole(fa) };
}

/**
 * What he is worth to SELL once he has signed, as a multiple of what he cost.
 *
 * This is the most important number in this file and the first build did not
 * have it at all. signFreeAgent wrote the pool record's notional `value`
 * straight onto the squad player. That value is rating derived, so an invented
 * 72 rated 28 year old carried 37.3m against a signing on fee of 6.7m, and
 * sellValue is 0.9 x value, so every free agent was worth five times what he
 * cost the moment he walked in. Measured on the shipped engine, signing every
 * signable free agent each week and listing him: Everton turned 43m into
 * 358.81m in one season, 22 signings for 55.0m against 19 sales for 358.9m.
 * Manchester City made 241m the same way. A money printer, and every note it
 * printed came from players this game made up.
 *
 * The fix is not a nerf, it is the honest reading of what a free transfer
 * means. A market value is what a club would pay in a FEE, and the market has
 * already answered that question about this man: nothing. His ABILITY is
 * completely real, it is what you signed him for and it is what he gives you
 * on a Saturday. What was never real is a resale price nobody was willing to
 * pay. So he carries roughly what he cost you, the flip is worth about
 * nothing, and the footballer is worth exactly as much as he always was.
 *
 * Anchored to the fee rather than to a fraction of the notional value on
 * purpose, so it tracks marketPull: a man you waited out costs less AND
 * resells for less, and patience cannot become its own arbitrage.
 */
export const FA_VALUE_OF_FEE = 1.15;

/** What his squad record carries as a market value once he signs. */
export function signedValue(fa: FreeAgent): number {
  return Math.max(0.1, round1(freeAgentTerms(fa).bonus * FA_VALUE_OF_FEE));
}


/**
 * Will he come?
 *
 * A free agent is unattached, not desperate, and an 88 rated man does not
 * drop into a 68 rated dressing room in August just because the paperwork is
 * easy. He gets less fussy as the weeks pass, which is the other half of the
 * waiting game: the player you cannot get in August is gettable by Christmas,
 * at a lower wage, if nobody else has taken him.
 *
 * Measured against the XI you would actually field rather than the club's
 * reputation, because that is the thing a player joining is joining.
 */
export const FA_SLACK_BASE = 6;
export const FA_SLACK_WAIT = 10;

export function joinSlack(fa: FreeAgent): number {
  return FA_SLACK_BASE + (clamp(fa.weeks, 0, FA_SHELF_WEEKS) / FA_SHELF_WEEKS) * FA_SLACK_WAIT;
}

export function willJoin(fa: FreeAgent, xiAvg: number): boolean {
  return fa.rating <= xiAvg + joinSlack(fa);
}

/**
 * How far past the board's weekly ceiling a free agent signing may take you.
 *
 * The other half of the balance, and the other half of the truth. When you buy
 * a player the board has already sanctioned the money, out of a transfer budget
 * they set; a free agent's whole cost IS his wage, so the wage is the only
 * thing there is for them to have a view on, and they have one. Twenty five
 * percent of headroom means the board will let you stretch for somebody and
 * will not let you assemble a second squad out of wages nobody agreed to.
 *
 * It is deliberately a different rule from the transfer market's, which has no
 * ceiling check at all, because the two purchases are not the same purchase.
 */
export const FA_CAP_HEADROOM = 1.25;

export function wageCeilingBlocks(bill: number, cap: number, wage: number): boolean {
  return bill + wage > cap * FA_CAP_HEADROOM;
}

/**
 * One line for the card when he will not come, so a refusal explains itself
 * rather than greying a button out with no reason.
 *
 * Derived from willJoin's own inequality rather than written beside it, so the
 * number of weeks it quotes cannot drift from the week he actually signs.
 * willJoin is rating <= xiAvg + FA_SLACK_BASE + (weeks / FA_SHELF_WEEKS) *
 * FA_SLACK_WAIT, so the week he comes round is that solved for weeks.
 */
export function refusalLine(fa: FreeAgent, xiAvg: number): string {
  /* Written about the SITUATION and not about the man. These lines are
     rendered under a named card, and from season two the board carries real
     footballers by design, so "he is holding out for a bigger club" would be
     this game inventing a real professional's motives. The gap between his
     level and your eleven is a fact the engine computed; what he is thinking
     is not. Same rule the Round 137 message pools are written to. */
  if (fa.rating - (xiAvg + joinSlack(fa)) <= 2) {
    return 'A close call at this level. No answer yet.';
  }
  const comesRoundAt = Math.ceil(((fa.rating - xiAvg - FA_SLACK_BASE) / FA_SLACK_WAIT) * FA_SHELF_WEEKS);
  if (comesRoundAt <= FA_SHELF_WEEKS) {
    const wait = Math.max(1, comesRoundAt - fa.weeks);
    return `Too big a step down for now. ${wait} more week${wait === 1 ? '' : 's'} unattached and this club is in range.`;
  }
  return 'Too far below the level he has been playing at.';
}

/* ================================================================== */
/* 4. Building a record                                                */
/* ================================================================== */

/** A stable id for a pool entry. The season and the reason are in it so a man
 *  released twice across a long save is two records, not one overwritten. */
export function freeAgentId(name: string, season: number, reason: FreeAgentReason): string {
  const slug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');
  return `fa-${slug}-s${season}-${reason}`;
}

/**
 * The same id, made unique inside THIS pool.
 *
 * Round 567 learned this about squad ids and wrote it down: slug() is not
 * injective, so an id built from a name is not unique either. The pool had the
 * identical hole. Ederson (Atalanta, CM) and Ederson (Fenerbahce, GK) both
 * slug to "ederson", and they are not a hypothetical pair, they are the exact
 * two that src/test/clubManagerSave.test.tsx already names. Released in the
 * same summer they shared one id, and signFreeAgent's own cleanup did the
 * damage: it removes by id with a filter, so signing one deleted BOTH records,
 * while the lookup always resolved to the first, so the other could never be
 * signed at all. They also shared a React key on the board.
 *
 * Mirrors freeSquadId: keep the readable id when it is free, suffix when it
 * is not.
 */
export function uniqueFreeAgentId(pool: readonly { id: string }[], base: string): string {
  const taken = new Set(pool.map(fa => fa.id));
  if (!taken.has(base)) return base;
  for (let n = 2; n < 1000; n += 1) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base}-${taken.size}`;
}

/** One of mine, on his way out. */
export function freeAgentFromPlayer(
  p: CMPlayer, lastClub: string, season: number, reason: FreeAgentReason,
  pool: readonly { id: string }[] = [],
): FreeAgent {
  return {
    id: uniqueFreeAgentId(pool, freeAgentId(p.name, season, reason)),
    name: p.name,
    position: p.position,
    age: p.age,
    rating: p.rating,
    value: p.value,
    lastClub,
    reason,
    since: season,
    weeks: 0,
    generated: p.generated,
    wasMine: true,
  };
}

/** Somebody the world let go. */
export function freeAgentFromMarket(
  mp: MarketPlayer, season: number, reason: FreeAgentReason,
  pool: readonly { id: string }[] = [],
): FreeAgent {
  return {
    id: uniqueFreeAgentId(pool, freeAgentId(mp.name, season, reason)),
    name: mp.name,
    position: mp.position,
    age: mp.age,
    rating: mp.rating,
    value: mp.value,
    lastClub: mp.club,
    reason,
    since: season,
    weeks: 0,
    generated: mp.generated,
  };
}

/* ================================================================== */
/* 5. Who the world lets go                                            */
/* ================================================================== */

/**
 * The first season the world releases REAL players.
 *
 * See the header. Season one still runs the real baked season, so a real
 * professional being unattached in it would read as a statement about him
 * rather than about the save. From the first rollover the world has moved and
 * every employment fact in it is the simulation's own. Made up players are
 * exempt from the gate because there is nobody to be wrong about.
 */
export const WORLD_POOL_FROM_YEAR = 1;

/** Deterministic per name and season, the same trick releaseClauseOf uses, so
 *  the pool is stable across renders and across a reload. */
function hash32(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h * 31) + s.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * The odds a given player's deal ran out at his club this summer, per ten
 * thousand.
 *
 * Weighted hard toward the men a real free agent list is actually made of:
 * players past thirty, and squad filler. The first version of this table had a
 * flat 12 in ten thousand catch-all for everybody else, and the smoke run
 * caught what that means at scale: 2,900 names times a small number is still
 * three or four players, they are drawn from the whole distribution, and they
 * sort to the TOP of the board. Season two opened with a 24 year old rated 88
 * available for a signing on fee. That is not a free agent, it is a cheat
 * code, and it is not something that happens in football either.
 *
 * So a player in his prime at a level any club wants is NEVER released for
 * nothing. Everything on this board is one of: old, ordinary, or both. A
 * genuinely useful free agent still exists (a 30 year old rated 82 is a real
 * and exciting find, roughly one or two a summer) and he comes with the
 * decline and the wage that made his club let him go.
 *
 * Measured on the 2026-27 market: about 20 a summer, of whom one or two are
 * rated 80 or better and every one of those is 31 or older.
 */
export function worldReleaseOdds(age: number, rating: number): number {
  if (age >= 33) return 260;
  if (age >= 31) return 120;
  /* Late twenties, and not a player anybody is fighting over. */
  if (age >= 29 && rating <= 78) return 70;
  /* Fringe at any age: this is most of a real free agent list. */
  if (rating <= 68) return 70;
  if (rating <= 74 && age <= 28) return 20;
  /* Prime age, wanted: his club does not let him walk. */
  return 0;
}

export function worldReleases(mp: MarketPlayer, season: number): boolean {
  const odds = worldReleaseOdds(mp.age, mp.rating);
  return hash32(`${mp.name}:${season}:fa`) % 10000 < odds;
}

/* ================================================================== */
/* 6. Pool housekeeping                                                */
/* ================================================================== */

/** Newest and best first, which is the order a manager wants to read it in. */
export function sortPool(pool: FreeAgent[]): FreeAgent[] {
  return [...pool].sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name));
}

/**
 * Drop duplicates by NAME, not by id.
 *
 * The report asked for this one by name ("duplicate free-agent records") and
 * it is the real hazard here, because the three ways in can collide: your
 * expiring left back can be released by the world in the same summer he walks
 * out on you, and the two records carry different ids and different reasons.
 * The one that came off your own books wins, because it is the one with a true
 * lastClub.
 */
export function dedupePool(pool: FreeAgent[]): FreeAgent[] {
  const byName = new Map<string, FreeAgent>();
  for (const fa of pool) {
    const held = byName.get(fa.name);
    if (!held) { byName.set(fa.name, fa); continue; }
    if (fa.wasMine && !held.wasMine) byName.set(fa.name, fa);
  }
  return [...byName.values()];
}

/** Trim to FA_POOL_MAX, lowest rated first, so the board stays readable. */
export function capPool(pool: FreeAgent[]): FreeAgent[] {
  if (pool.length <= FA_POOL_MAX) return pool;
  return sortPool(pool).slice(0, FA_POOL_MAX);
}

/** How likely an AI club is to take him off the board this week.
 *
 *  Good players go fast, which is what creates the urgency: a genuinely
 *  useful free agent is a decision this week, not a bookmark. A fringe player
 *  can sit there for months, which is why the bottom of the pool is always
 *  the part that is still there when you need a body in February. */
export function aiInterest(fa: FreeAgent, weekOfPool: number): number {
  const quality = clamp((fa.rating - 62) / 28, 0, 1);          // 62 and under: nobody rushes
  const stale = clamp(1 - weekOfPool / FA_SHELF_WEEKS, 0.25, 1);
  return clamp(0.02 + quality * 0.16 * stale, 0, 0.2);
}
