/**
 * Round 1223: the GM desk host, the one place a GM's career lives for all four
 * front offices.
 *
 * WHY. In the four front offices a firing ends the save: the fired screen's
 * only button wipes it. Two finished modules, gmSeat.ts (the offers a GM has
 * earned, never from the club that let him go) and gmXp.ts (seven GM trees),
 * have panels and harnesses and no board imports them. The four sport desk
 * files are near copies of each other, and binding a career four times is the
 * Round 426 trap. So everything about a GM's career that is not one sport's
 * rule is written here, once, and a sport brings a read adapter, its own
 * engine calls and a few board hunks.
 *
 * THIS ROUND IS THE LIFT. New files only: nothing under src imports this file
 * except its own tests, its four read adapters and its panels. No board mounts
 * anything yet, so no player sees a change.
 *
 * THE RULES OF THE HOST.
 *   1. It imports no engine. A league is read only through the adapter it is
 *      handed (GmDeskHost), so no board drags another sport into its chunk.
 *   2. It carries no cap rule, no waiver rule and no draft rule. A rule that is
 *      true of one sport lives in that sport's adapter.
 *   3. Nothing here draws from Math.random or reads a clock, and nothing is
 *      evaluated from an import at module scope. Every roll comes from
 *      keyedRng, keyed on facts of the save, so a reload can never re-roll an
 *      offer feed and a GM with points is dealt the league a GM without is.
 *   4. XP is earned from facts of a save and nothing else, and every effect a
 *      tree claims is a number handed back to the caller (hostXpEffects).
 *   5. Reading never writes. A block is stored the first time something
 *      records to it, and an old save passes through every read unchanged.
 *   6. Words are decided here, not in JSX, so scripts/simGmDeskHost.mjs reads
 *      them without a browser. Narrated only, every speaker a role, never a
 *      quote and never a named person.
 *
 * THE FOUR SEAMS LATER LIFTS EXTEND (each by adding a field, never by changing
 * a signature):
 *   - GmDeskHost, the read adapter: new reads join as optional methods until
 *     all four sports fill them.
 *   - GM_HOST_KEYS and HOST_BLOCK_RULES: a new system adds its block key and
 *     says who owns the block when the GM changes clubs.
 *   - The close (HostVerdictInput.trustMovers, HostSeasonFacts) and the year
 *     out (GmAwayHost): a new tick joins as an optional field.
 *   - GmCareerBinding and the panel list in gmCareerDesk.tsx.
 */
import { gmBlock, withGmBlock, type GmDesk, type GmFacts, type GmTileFace } from './gmDesk';
import {
  careerProfile, careerTotals, currentStint, endSeatStint, leagueTiers, newGmCareer, recordSeatSeason,
  sanitizeGmCareer, seatOffers, sitOutYear, startSeatStint, takeSeat, BADLY_FIRED_CEILING,
  type GmCareer, type GmSeatPack, type SeatOffer, type SeatSave, type SeatStint, type SeatTeam,
} from './gmSeat';
import {
  GM_MAX_LEVEL, GM_MAX_TREE_POINTS, GM_TREES, GM_TREE_INFO, XP_FIRST_LEVEL, addXp, contractAsk, craftedDeadMoney,
  cushionTrustLoss, defaultGmXp, developedGrowth, gmLevel, gmPointsFree, gmSeasonXp, gmTreePoints, isValidGmXp,
  mandateSteps, pressOdds, scoutedNoise, spendGmPoint, tradePremium, xpForLevel,
  type GmTree, type GmXp, type GmXpAward,
} from './gmXp';
import { bestTierAvailable, type ClubTier } from './managerOffers';
import { keyedRng } from './keyedRng';
import {
  applyMandateResult, gradeSeason, strengthRank,
  type FoGrade, type FoGradeResult, type FoSeasonOutcome, type OwnerMandate,
} from './foOwnerMandate';
import type { GmPressOption } from './foGmPress';
import { deadMoneyFor, type CutLedger } from './frontOfficeCuts';
import { deskCases, type DeskCase, type GmContractHost, type GmContractLeague, type GmContractLedger } from './gmContracts';
import type { GmSportKey } from './gmSport';
import type { StandingRow } from './gmPicks';

/* ================================================================== */
/* 1. The read adapter a sport fills once                              */
/* ================================================================== */

/**
 * One club as every shared system reads it. It extends gmPicks' StandingRow
 * (id, wins, losses, pct, diff), the row the draft order and the deadline
 * already read, so a sport hands in one shape and not a fourth.
 */
export interface HostClub extends StandingRow {
  /** The engine's own strength function, the number the mandate ranks by. */
  strength: number;
  /** Games played, overtime losses and ties included. */
  games: number;
  /** As the sport prints it: '41-30-9' in hockey, '11-6' in football. */
  record: string;
  /** 1 = top of the whole league in the engine's own standings order. */
  place: number;
  /**
   * Everything the engine counts against its line: the salaries, this
   * season's dead money, and whatever else its own room function holds back
   * (the NBA's last tax cheque). The line less this is the engine's room.
   */
  payroll: number;
}

/**
 * Reads only. Nothing here may change the league it is handed (the harness
 * compares the league's JSON before and after every read, control `mutate`).
 * Later lifts add reads as OPTIONAL methods: the books and the inbox want the
 * men out, the period and whether the deadline is open; the farm and the
 * lineup want roster reads.
 */
export interface GmDeskHost<L> {
  sport: GmSportKey;
  /** GM_SEAT_PACKS[sport]: who sits upstairs and what the prize is called. */
  pack: GmSeatPack;
  /** Every club exactly once. */
  clubs(league: L): HostClub[];
  season(league: L): number;
  /** The line the payroll is read against. */
  cap(league: L): number;
  /** The champion of that season, or null while it is not decided. */
  champion(league: L, season: number): string | null;
}

/** The league as the job market reads it: an id, a name and one number that ranks it. */
export function hostSeatTeams<L>(host: GmDeskHost<L>, league: L, nameOf: (id: string) => string): SeatTeam[] {
  return host.clubs(league).map(c => ({ id: c.id, name: nameOf(c.id), strength: c.strength }));
}

const sameId = (id: string): string => id;
const round1 = (n: number): number => Math.round(n * 10) / 10;
const capWord = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`;
const isInt = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n);
const whole = (n: number): number => (Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0);

/* ================================================================== */
/* 2. The two blocks, and who owns a block when the GM changes clubs   */
/* ================================================================== */

export const GM_HOST_KEYS = { seat: 'seat', xp: 'xp' } as const;

/**
 * What the record does not know about the time before it began. Present only
 * on a record built from a save older than the block (hostLegacySeat).
 */
export interface SeatBefore {
  /** Seasons he ran the club before the record began, known only as a count. Shown, never graded. */
  seasons: number;
  /** True when the first stint's tier is the tier on the day the record began, not the day he arrived. The screen leaves that tier off. */
  tierUnknown: boolean;
}

export interface GmSeatBlock {
  v: 1;
  /** gmSeat's own shape, checked by sanitizeGmCareer. */
  career: GmCareer;
  /** The last season recorded, so a season can never be recorded twice. */
  last?: number;
  before?: SeatBefore;
}

export function isGmSeatBlock(v: unknown): v is GmSeatBlock {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;
  if (o.v !== 1 || sanitizeGmCareer(o.career) === null) return false;
  if (o.last !== undefined && !isInt(o.last)) return false;
  if (o.before !== undefined) {
    const b = o.before as Record<string, unknown> | null;
    if (!b || typeof b !== 'object' || Array.isArray(b)) return false;
    if (!isInt(b.seasons) || b.seasons < 0 || typeof b.tierUnknown !== 'boolean') return false;
  }
  return true;
}

/**
 * Who a desk block belongs to when the GM takes another club's seat. Club
 * Manager already rules it (clubManager.ts, the job change: the staff, the
 * facilities and the books are the club's, a move means the new club hands
 * you its own), and a move is the one event that touches every block, so the
 * rule is a list a later lift adds a row to and never a line inside
 * hostTakeSeat.
 *   gm      travels with him untouched (his record, his XP)
 *   club    is opened again for the club he joins, from `fresh`
 *   league  is the league's own and stays as it is (the pick ledger)
 * A block no rule names is carried untouched, as gmDesk.ts promises for keys a
 * build does not know.
 */
export type HostBlockOwner = 'gm' | 'club' | 'league';

export interface HostBlockRule<L = unknown> {
  key: string;
  owner: HostBlockOwner;
  /**
   * A club owned block's value at the club he joins. A club rule with no
   * `fresh` drops the block instead, so the old club's never rides along and
   * the system's own fresh value answers the next read.
   */
  fresh?: (league: L, team: string) => unknown;
}

/** The host's own two rows. A sport spreads these before its own. */
export const HOST_BLOCK_RULES: readonly HostBlockRule[] = [
  { key: 'seat', owner: 'gm' },
  { key: 'xp', owner: 'gm' },
];

/** The desk as it stands at the club he joins. The desk handed in is not changed. */
export function hostMoveBlocks<L>(desk: GmDesk, rules: readonly HostBlockRule<L>[], league: L, team: string): GmDesk {
  const blocks: Record<string, unknown> = { ...desk.blocks };
  const seen = new Set<string>();
  for (const r of rules) {
    if (seen.has(r.key)) continue;
    seen.add(r.key);
    if (r.owner !== 'club') continue;
    if (r.fresh) blocks[r.key] = r.fresh(league, team);
    else delete blocks[r.key];
  }
  return { v: desk.v, blocks };
}

/* ================================================================== */
/* 3. The record of a save, and of a save older than the record        */
/* ================================================================== */

/**
 * What any of the four saves knows without the block.
 *
 * THE CONTRACT ON seasonCounted (the brief's B7). seasonsPlayed and titles are
 * read in one of two states and the caller says which:
 *   true   they already include `season`: a save at rest after its close
 *          (the recap, the fired screen, a reload of either).
 *   false  they do not: a season still being played, or the values as they
 *          stood BEFORE this season was counted, which is what the verdict
 *          hands in (hostSeasonVerdict sets false itself).
 * Never read it off the league: at the verdict the league already holds the
 * champion while the counters are still the old ones, and a `from` built from
 * that mix starts every new save a season late.
 */
export interface HostLegacy {
  team: string;
  /** The club's tier today. */
  tier: ClubTier;
  /** league.season as the save holds it. */
  season: number;
  seasonCounted: boolean;
  seasonsPlayed: number;
  titles: number;
  fired: boolean;
  /** Only when the bind can work it out again from the save (hostLastGrade), else null. Never a guess. */
  lastGrade: FoGradeResult | null;
}

/**
 * The record of a save that has no block. Nothing is filled in: a title is a
 * 'title' grade (gradeSeason returns it whenever the title was won), the last
 * grade is there only when it was handed in, and every other season is a count
 * (before.seasons). Never a guessed 'met'.
 *
 * Known and accepted: with no last grade a record that holds titles reads its
 * last season as a title, and the seasons known only as a count do not weigh
 * as experience in the market (careerProfile reads grades only).
 */
export function hostLegacySeat(l: HostLegacy): GmSeatBlock {
  const seasons = whole(l.seasonsPlayed);
  const titles = Math.min(whole(l.titles), seasons);
  const counted = l.seasonCounted && seasons >= 1;
  const grades: FoGradeResult[] = [];
  for (let i = 0; i < titles; i++) grades.push('title');
  /* A last grade that is a title is one of the titles above already. Any
     other needs a season that was not a title to sit in. */
  if (l.lastGrade !== null && l.lastGrade !== 'title' && seasons - titles >= 1) grades.push(l.lastGrade);
  const unknown = seasons - grades.length;
  const stint: SeatStint = {
    team: l.team, tier: l.tier, from: l.season - seasons + (counted ? 1 : 0), grades,
    ...(l.fired ? { ended: 'fired' as const } : {}),
  };
  /* The tier is today's, read on the day the record began. Only hostNewSeat,
     called the day he takes a club, knows the tier on arrival, so every legacy
     record says its first tier is unknown, a save of no seasons included (its
     first read may come at its first close, a whole season of moves later). */
  return {
    v: 1,
    career: { version: 1, stints: [stint], seasonsOut: 0 },
    before: { seasons: unknown, tierUnknown: true },
  };
}

/** The record of a brand new save, written when he takes his first club: the tier on arrival is known. */
export function hostNewSeat(team: string, tier: ClubTier, season: number): GmSeatBlock {
  return { v: 1, career: newGmCareer(team, tier, season) };
}

/**
 * A stored record must agree with the save beside it (the way nhlContractsOf
 * checks its ledger's team). His last stint is at the save's club, and it is
 * open exactly while the save is not fired: between seats the save keeps the
 * old club's id with fired true. Anything else fails closed to the legacy
 * record, which credits every title to the current club.
 */
function seatFitsSave(b: GmSeatBlock, l: HostLegacy): boolean {
  const s = currentStint(b.career);
  return s.team === l.team && (s.ended !== undefined) === l.fired;
}

/** His record: the stored block when it is sound and fits the save, else the legacy record. Never writes. */
export function hostSeatOf(desk: GmDesk | null, l: HostLegacy): GmSeatBlock {
  if (!desk) return hostLegacySeat(l);
  return gmBlock<GmSeatBlock>(desk, GM_HOST_KEYS.seat, v => isGmSeatBlock(v) && seatFitsSave(v, l), () => hostLegacySeat(l));
}

/** His XP block, a fresh one when absent or mangled. Never writes. */
export function hostXpOf(desk: GmDesk | null): GmXp {
  if (!desk) return defaultGmXp();
  return gmBlock<GmXp>(desk, GM_HOST_KEYS.xp, isValidGmXp, defaultGmXp);
}

/** What a bind knows of its save, for hostLegacy. */
export interface HostSaveFacts {
  team: string;
  seasonsPlayed: number;
  titles: number;
  fired: boolean;
  /** See HostLegacy.seasonCounted. */
  seasonCounted: boolean;
  lastGrade?: FoGradeResult | null;
}

/** The legacy read of a save, with the club's tier taken from the league through the adapter. */
export function hostLegacy<L>(host: GmDeskHost<L>, league: L, f: HostSaveFacts): HostLegacy {
  const tier = leagueTiers(hostSeatTeams(host, league, sameId)).get(f.team) ?? 4;
  return {
    team: f.team, tier, season: host.season(league), seasonCounted: f.seasonCounted,
    seasonsPlayed: f.seasonsPlayed, titles: f.titles, fired: f.fired, lastGrade: f.lastGrade ?? null,
  };
}

/** Seasons a stint covers: its grades, plus the uncounted ones when it is the stint the record began in. */
export function hostStintSeasons(seat: GmSeatBlock, index: number): number {
  const s = seat.career.stints[index];
  if (!s) return 0;
  return s.grades.length + (index === 0 ? (seat.before?.seasons ?? 0) : 0);
}

/** Every season the record holds, graded or only counted. Years out are not seasons: he ran no club. */
export function hostSeasonsRecorded(seat: GmSeatBlock): number {
  return careerTotals(seat.career).seasons + (seat.before?.seasons ?? 0);
}

/* ================================================================== */
/* 4. XP: what a point does, as plain numbers a bind routes            */
/* ================================================================== */

/**
 * The seven effects, each over the number an engine already produced. With no
 * point in a tree its effect hands back exactly what it was given and draws
 * nothing. A rolled effect takes its roll from keyedRng and only when the tree
 * holds a point, which is the discipline gmXp.ts asks of whoever wires it in,
 * written once here instead of once a sport.
 *
 * `key` names the thing the number belongs to, by habit
 * `${team}|${season}|${id of the man or prospect}` (hostKey), so the same man
 * in the same season always gets the same roll, on a reload too, and the
 * quote a screen shows before a tap is the figure charged after it.
 */
export interface HostXpEffects {
  /** Points per tree, each clamped to 0..5. */
  points: Record<GmTree, number>;
  /** Scouting: a prospect's read error (gmXp.scoutedNoise). */
  scoutNoise(noise: number, key: string): number;
  /** Negotiation: an agent's opening ask (gmXp.contractAsk). */
  ask(ask: number, minimum: number, key: string): number;
  /** Cap craft: a release's dead money (gmXp.craftedDeadMoney). */
  deadMoney(amount: number, key: string): number;
  /** Development: a young man's growth this year (gmXp.developedGrowth). */
  growth(growth: number, headroom: number, key: string): number;
  /** Trading: the multiple of value a rival asks (gmXp.tradePremium). */
  premium(premium: number): number;
  /** Ownership: a graded season's trust change (gmXp.cushionTrustLoss). */
  trustDelta(delta: number): number;
  /** Media: the odds a press gamble lands (gmXp.pressOdds). */
  pressOdds(odds: number): number;
}

/** The key habit for a rolled effect. */
export function hostKey(team: string, season: number, id: string): string {
  return `${team}|${season}|${id}`;
}

/** The stream one tree's roll for one key comes from. Each tree has its own, so two trees never share a roll. */
export function hostXpRollKey(sport: GmSportKey, tree: GmTree, key: string): string {
  return `xp|${sport}|${tree}|${key}`;
}

export function hostXpEffects(desk: GmDesk | null, sport: GmSportKey): HostXpEffects {
  const block = hostXpOf(desk);
  const points = {} as Record<GmTree, number>;
  for (const t of GM_TREES) points[t] = gmTreePoints(block, t);
  const roll = (tree: GmTree, key: string): number => keyedRng(hostXpRollKey(sport, tree, key))();
  return {
    points,
    scoutNoise: (noise, key) => (points.scouting > 0 ? scoutedNoise(noise, points.scouting, roll('scouting', key)) : noise),
    ask: (ask, minimum, key) => (points.negotiation > 0 ? contractAsk(ask, points.negotiation, roll('negotiation', key), minimum) : ask),
    deadMoney: (amount, key) => (points.capCraft > 0 ? craftedDeadMoney(amount, points.capCraft, roll('capCraft', key)) : amount),
    growth: (growth, headroom, key) => (points.development > 0 ? developedGrowth(growth, headroom, points.development, roll('development', key)) : growth),
    premium: premium => tradePremium(premium, points.trading),
    trustDelta: delta => cushionTrustLoss(delta, points.ownership),
    pressOdds: odds => pressOdds(odds, points.media),
  };
}

/**
 * Put a point in. Null when it cannot be done, the shape every engine action
 * uses. A tree that is not on `live` is refused here, whatever the screen
 * allows, so a point is never bought where it moves nothing.
 */
export function hostSpendPoint(desk: GmDesk, tree: string, live: readonly GmTree[]): GmDesk | null {
  if (!(live as readonly string[]).includes(tree)) return null;
  const next = spendGmPoint(hostXpOf(desk), tree);
  return next ? withGmBlock(desk, GM_HOST_KEYS.xp, next) : null;
}

/** The XP sources a desk can pay. A bind names the ones its save holds the facts for. */
export type HostXpSource = 'wins' | 'titles' | 'playoffs' | 'mandate' | 'overperformance' | 'prospects';

const SOURCE_WORDS: Record<HostXpSource, string> = {
  wins: 'your win share',
  titles: 'titles',
  playoffs: 'playoff rounds won',
  mandate: 'meeting or beating the ask from upstairs',
  overperformance: 'finishing higher than anyone expected',
  prospects: 'bringing a prospect through',
};

/** The sentence that says what THIS desk pays XP for, so a screen never promises a source the save cannot feed. */
export function hostEarnsLine(sources: readonly HostXpSource[]): string {
  const words = sources.map(s => SOURCE_WORDS[s]).filter(Boolean);
  if (words.length === 0) return 'This desk does not pay XP yet.';
  const list = words.length === 1 ? words[0]
    : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
  return `You earn XP every season for ${list}. Points are yours for good: nothing here can be taken back.`;
}

/* ================================================================== */
/* 5. The season's close                                               */
/* ================================================================== */

/** The facts of one finished season, all of them read off the save. */
export interface HostSeasonFacts {
  season: number;
  grade: FoGradeResult;
  fired: boolean;
  wins: number;
  games: number;
  wonTitle: boolean;
  playoffRoundsWon: number;
  /** 0 when a bind does not hold them. */
  placesAboveExpectation?: number;
  prospectsGraduated?: number;
}

export interface HostSeasonClose {
  desk: GmDesk;
  /** Null when nothing was recorded (the season was already in, or he holds no seat). */
  award: GmXpAward | null;
  levelBefore: number;
  levelAfter: number;
}

/**
 * Record one graded season: the grade on the open stint, the stint closed when
 * he was fired, the season marked so it cannot be recorded twice, and the XP
 * it earned. Pure: the desk handed in is not changed.
 *
 * `l` is the legacy read with the counters as they stood BEFORE this season
 * was counted (seasonCounted false), used only when the desk holds no record
 * yet. A season at or before the last one recorded is refused: the desk comes
 * back as it was and the award is null, so a reload on the recap cannot pay
 * twice. So is a close with no seat to record it on.
 */
export function hostCloseSeason(desk: GmDesk, l: HostLegacy, f: HostSeasonFacts): HostSeasonClose {
  const seat = hostSeatOf(desk, l);
  const xp = hostXpOf(desk);
  const level = gmLevel(xp);
  const same: HostSeasonClose = { desk, award: null, levelBefore: level, levelAfter: level };
  if (seat.last !== undefined && f.season <= seat.last) return same;
  if (currentStint(seat.career).ended) return same;
  let career = recordSeatSeason(seat.career, f.grade);
  if (f.fired) career = endSeatStint(career, 'fired');
  const award = gmSeasonXp({
    winPct: f.games > 0 ? f.wins / f.games : 0,
    titles: f.wonTitle ? 1 : 0,
    playoffRoundsWon: f.playoffRoundsWon,
    mandateSteps: mandateSteps(f.grade),
    placesAboveExpectation: f.placesAboveExpectation ?? 0,
    prospectsGraduated: f.prospectsGraduated ?? 0,
  });
  const nextXp = addXp(xp, award.total);
  let next = withGmBlock<GmSeatBlock>(desk, GM_HOST_KEYS.seat, { ...seat, career, last: f.season });
  next = withGmBlock(next, GM_HOST_KEYS.xp, nextXp);
  return { desk: next, award, levelBefore: level, levelAfter: gmLevel(nextXp) };
}

/** What the verdict is handed. Everything a later system adds joins as an optional field. */
export interface HostVerdictInput {
  team: string;
  mandate: OwnerMandate | null;
  trust: number;
  fired: boolean;
  /**
   * The season as the mandate grades it. The sport builds it: who made the
   * postseason and how far is read off its own bracket (seriesPostseason,
   * nflPostseason, the play in rule), which is the one sport part of a verdict.
   */
  outcome: FoSeasonOutcome;
  /** Null on a save whose desk is off: the verdict is then today's two engine calls and nothing else. */
  desk: GmDesk | null;
  /** Both as they stood BEFORE this season was counted. */
  seasonsPlayed: number;
  titles: number;
  /**
   * Trust changes that ride with the grade and are not the grade (the NBA's
   * luxury tax cheque today). Added to the grade's change after the cushion.
   */
  trustMovers?: readonly number[];
  placesAboveExpectation?: number;
  prospectsGraduated?: number;
}

export interface HostVerdict {
  /** gradeSeason's own answer, untouched, or null with no mandate. */
  grade: FoGrade | null;
  /** The trust change that was applied: the grade's, cushioned, plus the movers. */
  trustDelta: number;
  trust: number;
  fired: boolean;
  warning: boolean;
  desk: GmDesk | null;
  award: GmXpAward | null;
  levelBefore: number;
  levelAfter: number;
}

/**
 * The season's verdict, in one pure function for all four sports.
 *
 * THE ORDER, fixed for every system that joins the close later:
 *   1. the grade (gradeSeason over the sport's outcome);
 *   2. every trust mover: the Ownership cushion on the grade's own change
 *      first, then the business changes in trustMovers, added as they are;
 *   3. the firing, decided once from the trust all of them leave;
 *   4. the host's close (the record and the XP), which takes the firing as
 *      a fact and therefore runs last.
 * The cushion is Ownership's and is about a season that missed the ask, so it
 * touches the grade's change alone: a tax cheque riding with the grade is not
 * cushioned, and a gain is never touched (gmXp.cushionTrustLoss).
 *
 * With no mandate nothing is graded: the trust and the flag come back as they
 * were and the desk is untouched. With no desk it is gradeSeason then
 * applyMandateResult over the grade's change plus the movers, exactly what
 * each board computes inline today.
 */
export function hostSeasonVerdict<L>(host: GmDeskHost<L>, league: L, i: HostVerdictInput): HostVerdict {
  const level = gmLevel(hostXpOf(i.desk));
  if (!i.mandate) {
    return { grade: null, trustDelta: 0, trust: i.trust, fired: i.fired, warning: false, desk: i.desk, award: null, levelBefore: level, levelAfter: level };
  }
  const grade = gradeSeason(i.mandate, i.outcome);
  const fx = hostXpEffects(i.desk, host.sport);
  const movers = (i.trustMovers ?? []).reduce((s, n) => s + n, 0);
  const trustDelta = fx.trustDelta(grade.trustDelta) + movers;
  const applied = applyMandateResult(i.trust, { ...grade, trustDelta });
  const out: HostVerdict = {
    grade, trustDelta, trust: applied.trust, fired: applied.fired, warning: applied.warning,
    desk: i.desk, award: null, levelBefore: level, levelAfter: level,
  };
  if (!i.desk) return out;
  const club = host.clubs(league).find(c => c.id === i.team);
  const legacy = hostLegacy(host, league, {
    team: i.team, seasonsPlayed: i.seasonsPlayed, titles: i.titles, fired: i.fired, seasonCounted: false,
  });
  const close = hostCloseSeason(i.desk, legacy, {
    season: host.season(league), grade: grade.result, fired: applied.fired,
    wins: club?.wins ?? 0, games: club?.games ?? 0,
    wonTitle: i.outcome.wonTitle, playoffRoundsWon: i.outcome.roundsWon,
    placesAboveExpectation: i.placesAboveExpectation, prospectsGraduated: i.prospectsGraduated,
  });
  return { ...out, desk: close.desk, award: close.award, levelBefore: close.levelBefore, levelAfter: close.levelAfter };
}

/**
 * The grade of the season the save last closed, when the save still holds
 * what it takes to work it out again: a mandate set for the league's season,
 * that season decided, and its outcome (the bind hands null when its stored
 * postseason is not this season's). Otherwise null, never a guess. After a
 * year out the league has moved a season on and the old mandate is stale, so
 * this is null, which is right: by then the record is stored.
 */
export function hostLastGrade<L>(
  host: GmDeskHost<L>, league: L, mandate: OwnerMandate | null | undefined, outcome: FoSeasonOutcome | null,
): FoGradeResult | null {
  if (!mandate || !outcome) return null;
  const season = host.season(league);
  if (mandate.season !== season || host.champion(league, season) === null) return null;
  return gradeSeason(mandate, outcome).result;
}

/**
 * The ask he was shown is the ask he is graded on. A board builds a new
 * mandate every summer; the summer after he takes a seat it must keep the
 * offer's. An offer's ask is built for the season after the league's, so the
 * rule needs no flag: keep a stored mandate whose season already equals the
 * season the summer rolled to. On every other path the stored one is a season
 * old and the built one stands, as today.
 */
export function hostSummerMandate(stored: OwnerMandate | null | undefined, built: OwnerMandate, season: number): OwnerMandate {
  return stored && stored.season === season ? stored : built;
}

/**
 * True while he has taken a seat whose first season has not started: his open
 * stint begins after the league's season. A recap drawn then is the arrival,
 * not his season, so it must not stage a title he did not win.
 */
export function hostArriving(seat: GmSeatBlock, leagueSeason: number): boolean {
  const s = currentStint(seat.career);
  return !s.ended && s.from > leagueSeason;
}

/* ================================================================== */
/* 6. The job market                                                   */
/* ================================================================== */

/**
 * Three honest states.
 *   offers  somebody called.
 *   quiet   nobody called this year, and a later year can still differ.
 *   closed  nobody called and nobody will: next year he is under the floor
 *           where the market stops looking, even with the best pedigree the
 *           engine can give him, and every further year out only lowers it.
 * Closed says so plainly and offers only a new front office. There is never
 * a button that plays a season for nothing: the year out is offered on
 * hostCanSitOut alone, which reads what next year holds and not the state,
 * because somebody can call this year (offers) while next year is shut.
 */
export type HostMarketState = 'offers' | 'quiet' | 'closed';

/**
 * What a year out leaves for the next one, read in every state.
 *   open    still above the floor next year as things stand: his old club's
 *           tier is read today, and the year out is a real season that can
 *           move it, so the screen says "as things stand" and never more.
 *   climb   above it next year only if his old club finishes the year in a
 *           better tier than it is in today (its tier is his pedigree).
 *   shut    under it whatever happens. With an empty feed that is the closed
 *           state. With offers on the table they are the last calls he gets:
 *           the line says so, and no year out is offered or played.
 */
export type HostNextYear = 'open' | 'climb' | 'shut';

/** The line of facts under an offer, read off the adapter. */
export interface HostOfferFacts {
  /** 1 = strongest in the league. */
  strengthRank: number;
  record: string;
  place: number;
  /** The line less the payroll, in the engine's own money. */
  room: number;
}

export interface HostMarket {
  state: HostMarketState;
  /** What a year out leaves, whether or not somebody called this year. The line, the stay out button and hostSeasonAway all read it. */
  nextYear: HostNextYear;
  /** On 'climb', the tier his old club must have reached by next summer. Null otherwise. */
  climbTo: ClubTier | null;
  line: string;
  seasonsOut: number;
  /** The season a job taken now is first graded in. */
  season: number;
  offers: SeatOffer[];
  /** By teamId. */
  facts: Record<string, HostOfferFacts>;
}

/**
 * The key of one feed. Facts of the save and nothing else: the sport, the
 * club that let him go, when he took it, what he did there, the league's
 * season and the years out. The same save state always reads the same feed,
 * and a year out or a season on reads a new one. No player id is in it, so it
 * is the same in every process.
 */
export function hostFeedKey(sport: GmSportKey, seat: GmSeatBlock, season: number): string {
  const s = currentStint(seat.career);
  return `seat|${sport}|${s.team}|${s.from}|${s.grades.join(',')}|${season}|${seat.career.seasonsOut}`;
}

/**
 * What next year holds for a man whose feed is empty today. On 'climb',
 * `climbTo` is the lowest tier his old club must have reached by then for
 * the market to look at him again (a better tier is a bigger pedigree, so the
 * first tier that works, counting up from where the club is, is the easiest).
 *
 * 'open' is read at his old club's tier TODAY. The year out is a real season
 * and the club can drop a tier in it, which takes 4 or 5 points off his
 * standing, so a man near the floor can meet a closed market a year after
 * reading open (measured by the review on real seasons: about 1 in 40 quiet
 * markets that read open). Every line that prints it therefore says "as
 * things stand", and none promises more.
 */
export function hostNextYear(seat: GmSeatBlock, tiers: Map<string, ClubTier>): { nextYear: HostNextYear; climbTo: ClubTier | null } {
  const p = careerProfile(seat.career, tiers);
  const later = { ...p, seasonsOut: p.seasonsOut + 1 };
  if (bestTierAvailable(later) !== null) return { nextYear: 'open', climbTo: null };
  for (let t = p.lastTier - 1; t >= 1; t--) {
    if (bestTierAvailable({ ...later, lastTier: t as ClubTier }) !== null) return { nextYear: 'climb', climbTo: t as ClubTier };
  }
  return { nextYear: 'shut', climbTo: null };
}

/**
 * Whether a year out is on offer: only while next year can still hold a call.
 * Never when next year is shut, which is the closed market (nobody called)
 * and also the last calls (somebody did, and nobody will after them). The
 * panel draws its button on this and hostSeasonAway refuses on it, so the
 * screen and the rule cannot disagree.
 */
export function hostCanSitOut(market: Pick<HostMarket, 'nextYear'> | null): boolean {
  return !!market && market.nextYear !== 'shut';
}

const seasonsAndTitles = (seasons: number, titles: number): string =>
  `${plural(seasons, 'season')} and ${titles === 0 ? 'no titles' : plural(titles, 'title')}`;

/**
 * The market's line, written here for all three states. gmSeat.seatExitLine
 * cannot serve: with no offers it tells him to sit the year out, which in the
 * closed state is a hope the market does not hold, and it counts a stint's
 * grades as its seasons, which on a record built from an old save states
 * fewer seasons than he played.
 *
 * With offers on the table the line also says what passing on them costs
 * whenever next year is not open: on a climb it names the tier, and when next
 * year is shut it says these are the last calls (no year out is offered then).
 */
export function hostMarketLine(
  pack: GmSeatPack, seat: GmSeatBlock, state: HostMarketState,
  next: { nextYear: HostNextYear; climbTo: ClubTier | null },
  offerCount: number, oldClubName: string,
): string {
  const index = seat.career.stints.length - 1;
  const s = seat.career.stints[index];
  const record = seasonsAndTitles(hostStintSeasons(seat, index), s.grades.filter(g => g === 'title').length);
  const out = seat.career.seasonsOut;
  const head = out > 0 ? `${plural(out, 'season')} out of work since the ${oldClubName} let you go.`
    : s.ended === 'walked' ? `You walked away from the ${oldClubName} on your own terms after ${record}.`
    : s.ended === 'expired' ? `Your deal with the ${oldClubName} ran out after ${record}.`
    : s.ended === 'poached' ? `You took the buyout and left the ${oldClubName} after ${record}.`
    : `${capWord(pack.upstairs)} made the call: you are out after ${record} with the ${oldClubName}.`;
  const climb = next.climbTo !== null
    ? `the phone rings only if the ${oldClubName} have climbed into the ${HOST_TIER_WORDS[next.climbTo]} of the league by then.`
    : null;
  if (state === 'offers') {
    const called = `${head} ${plural(offerCount, pack.seat, pack.seats)} called.`;
    if (next.nextYear === 'shut') return `${called} ${offerCount === 1 ? 'It is the last call' : 'They are the last calls'} you will get: pass, and the phone stops for good.`;
    return climb !== null ? `${called} Pass, and next year ${climb}` : called;
  }
  if (state === 'closed') return `${head} Nobody called, and nobody will: the phone has stopped. A new front office is the way back in.`;
  return climb !== null
    ? `${head} Nobody called this year. Next year ${climb}`
    : `${head} Nobody called this year. As things stand next year is still open, and every year out makes the phone quieter.`;
}

/**
 * The market for a GM between seats, or null while he holds one. Pure and
 * keyed: reading it twice, or after a reload, reads the same feed.
 *
 * Every offer's ask is built for the season AFTER the league's, the one he
 * would first be graded in (hostSummerMandate keeps it through the summer).
 */
export function hostMarket<L>(
  host: GmDeskHost<L>, league: L, seat: GmSeatBlock, nameOf: (id: string) => string,
): HostMarket | null {
  const last = currentStint(seat.career);
  if (!last.ended) return null;
  const season = host.season(league);
  const clubs = host.clubs(league);
  const teams: SeatTeam[] = clubs.map(c => ({ id: c.id, name: nameOf(c.id), strength: c.strength }));
  const offers = seatOffers(
    host.pack, teams, seat.career, season + 1,
    keyedRng(hostFeedKey(host.sport, seat, season)), host.champion(league, season),
  );
  const { nextYear, climbTo } = hostNextYear(seat, leagueTiers(teams));
  const state: HostMarketState = offers.length > 0 ? 'offers' : nextYear === 'shut' ? 'closed' : 'quiet';
  const strengths = Object.fromEntries(clubs.map(c => [c.id, c.strength]));
  const cap = host.cap(league);
  const facts: Record<string, HostOfferFacts> = {};
  for (const o of offers) {
    const c = clubs.find(x => x.id === o.teamId);
    if (!c) continue;
    facts[o.teamId] = { strengthRank: strengthRank(strengths, c.id), record: c.record, place: c.place, room: round1(cap - c.payroll) };
  }
  return {
    state, nextYear, climbTo, seasonsOut: seat.career.seasonsOut, season: season + 1, offers, facts,
    line: hostMarketLine(host.pack, seat, state, { nextYear, climbTo }, offers.length, nameOf(last.team)),
  };
}

/* ================================================================== */
/* 7. Taking a seat, and a year out                                    */
/* ================================================================== */

export interface HostTakeSeatInput<L, S extends SeatSave> {
  host: GmDeskHost<L>;
  league: L;
  /** The desk as it stands. A bind whose save has none opens its own first. */
  desk: GmDesk;
  save: S;
  /** The legacy read of the save as it rests: fired, counters counted. */
  legacy: HostLegacy;
  /** The club whose offer he takes. It must be in the feed the market reads today. */
  teamId: string;
  nameOf: (id: string) => string;
  /** Who owns each block (HOST_BLOCK_RULES, then the sport's own rows). */
  blocks: readonly HostBlockRule<L>[];
}

/**
 * Take a job in the same league. Null when it cannot be done: he holds a
 * seat, or that club is not in the feed (the offer is read off the market
 * here, never trusted from the screen, so the ask he takes is the ask the
 * market made).
 *
 * What moves: his club id, trust back to the start, that club's ask, no press
 * state from the old club (gmSeat.takeSeat); every club owned block opened
 * again for the new club; his record with a new stint that starts the season
 * after the league's. What does not: his XP, every league owned block, and
 * the league itself, which this never touches. Rosters, picks, standings and
 * the champions list are the sport's and stay exactly as they are.
 */
export function hostTakeSeat<L, S extends SeatSave>(a: HostTakeSeatInput<L, S>): { save: S; desk: GmDesk; offer: SeatOffer } | null {
  const seat = hostSeatOf(a.desk, a.legacy);
  const market = hostMarket(a.host, a.league, seat, a.nameOf);
  if (!market) return null;
  const offer = market.offers.find(o => o.teamId === a.teamId);
  if (!offer) return null;
  const moved = hostMoveBlocks(a.desk, a.blocks, a.league, offer.teamId);
  const career = startSeatStint(seat.career, offer, market.season);
  return {
    save: takeSeat(a.save, offer),
    desk: withGmBlock<GmSeatBlock>(moved, GM_HOST_KEYS.seat, { ...seat, career }),
    offer,
  };
}

/** One more year without a seat, written on the record. The desk comes back as it was while he holds one. */
export function hostSitOut(desk: GmDesk, seat: GmSeatBlock): GmDesk {
  if (!currentStint(seat.career).ended) return desk;
  return withGmBlock<GmSeatBlock>(desk, GM_HOST_KEYS.seat, { ...seat, career: sitOutYear(seat.career) });
}

/**
 * The write side a sport fills for a season with no user club. Separate from
 * the read only GmDeskHost on purpose: these four calls change the league.
 * The calls are each sport's own engine; the ORDER is the host's, written
 * once in hostSeasonAway. Later lifts add steps as optional methods.
 */
export interface GmAwayHost<L> {
  /*
   * Each step is handed the desk and may hand back the next one, because a
   * league owned block (the pick ledger) rolls in a summer whether or not he
   * has a club. A step that changes no block returns nothing. The host keeps
   * his own two blocks out of a step's reach either way.
   */
  /** The draft of the season just closed, every club picking for itself. */
  awayDraft(league: L, rng: () => number, desk: GmDesk): GmDesk | void;
  /** The summer with no user club: it must leave the league at the start of the next season. */
  awaySummer(league: L, rng: () => number, desk: GmDesk): GmDesk | void;
  /** Regular season periods the league now has to play. Read after the summer. */
  periods(league: L): number;
  /** One period with no user club, the round and the rivals' own moves. */
  playRound(league: L, rng: () => number, desk: GmDesk): GmDesk | void;
  /** The postseason. It records the champion on the league and hands back the champion's id. */
  playoffs(league: L, rng: () => number, desk: GmDesk): string;
}

export interface HostAwayReport {
  /** The season that was played without him. */
  season: number;
  champion: string;
  /** How the club that let him go finished, or null if it is no longer in the league. */
  oldClub: { id: string; record: string; place: number } | null;
}

/*
 * 'market-closed': nobody called and nobody will. 'last-call': somebody
 * called, and next year is shut, so the year out would end the save. Both are
 * hostCanSitOut saying no.
 */
export type HostAwayRefusal = 'in-seat' | 'season-open' | 'market-closed' | 'last-call' | 'broken-adapter';

/* Narrow it with `=== false` (or `=== true`): this app compiles without strict
   null checks, where a bare `!r.ok` does not tell the two halves apart. */
export type HostAwayResult =
  | { ok: true; desk: GmDesk; report: HostAwayReport }
  | { ok: false; reason: HostAwayRefusal };

export interface HostSeasonAwayInput<L> {
  host: GmDeskHost<L>;
  away: GmAwayHost<L>;
  /** MUTATED. The board hands a copy, as every handler of the four boards does. */
  league: L;
  desk: GmDesk;
  legacy: HostLegacy;
  rng: () => number;
}

/**
 * A year out: the engine's own season with nobody in the user's chair, in the
 * boards' own order, and one more year out on the record. Never a second
 * simulation.
 *
 * THE ORDER: the draft of the season just closed, the summer, every period of
 * the new season, the postseason, then the year is written on the record. It
 * stops there, at a closed season whose summer has not run, which is exactly
 * the state a firing leaves, so the market reads the same either way.
 *
 * REFUSED, with the league untouched: while he holds a seat; while the
 * league's season is not decided (a year out starts from a closed season);
 * and whenever next year is shut (hostCanSitOut), because a year that cannot
 * bring a call is a season played for nothing. That is the closed market,
 * and it is also a market with offers on the table that are the last calls he
 * will get: passing on them through a year out would end the save a season
 * later with nothing said. If the sport's calls do not leave the league one
 * decided season on, the answer is 'broken-adapter' and the caller throws its
 * copy of the league away.
 *
 * A year out is not a season on his record: he ran no club, so his seasons
 * counter does not move (the brief's B15).
 */
export function hostSeasonAway<L>(a: HostSeasonAwayInput<L>): HostAwayResult {
  const seat = hostSeatOf(a.desk, a.legacy);
  const old = currentStint(seat.career);
  if (!old.ended) return { ok: false, reason: 'in-seat' };
  const before = a.host.season(a.league);
  if (a.host.champion(a.league, before) === null) return { ok: false, reason: 'season-open' };
  const market = hostMarket(a.host, a.league, seat, sameId);
  if (!market || market.state === 'closed') return { ok: false, reason: 'market-closed' };
  if (!hostCanSitOut(market)) return { ok: false, reason: 'last-call' };

  /* A step that hands nothing back changed no block. */
  const kept = (next: GmDesk | void, was: GmDesk): GmDesk => (next as GmDesk | undefined) ?? was;
  let desk = a.desk;
  desk = kept(a.away.awayDraft(a.league, a.rng, desk), desk);
  desk = kept(a.away.awaySummer(a.league, a.rng, desk), desk);
  const periods = a.away.periods(a.league);
  for (let i = 0; i < periods; i++) desk = kept(a.away.playRound(a.league, a.rng, desk), desk);
  const champion = a.away.playoffs(a.league, a.rng, desk);

  const season = a.host.season(a.league);
  if (season !== before + 1 || !champion || a.host.champion(a.league, season) !== champion) {
    return { ok: false, reason: 'broken-adapter' };
  }
  /* His own two blocks are the host's: whatever a step did to the desk, the
     XP block is the one he walked in with and the record is written here. */
  const blocks: Record<string, unknown> = { ...desk.blocks };
  delete blocks[GM_HOST_KEYS.xp];
  if (Object.prototype.hasOwnProperty.call(a.desk.blocks, GM_HOST_KEYS.xp)) blocks[GM_HOST_KEYS.xp] = a.desk.blocks[GM_HOST_KEYS.xp];
  const row = a.host.clubs(a.league).find(c => c.id === old.team);
  return {
    ok: true,
    desk: hostSitOut({ v: desk.v, blocks }, seat),
    report: { season, champion, oldClub: row ? { id: row.id, record: row.record, place: row.place } : null },
  };
}

/* ================================================================== */
/* 8. The routes that are the same in every sport                      */
/* ================================================================== */

/**
 * Media. The option a board hands applyGmPressChoice: the same object when it
 * does not gamble or the tree is empty, else a copy whose odds are the eased
 * ones. One draw from the board's stream either way, so the stream never
 * moves.
 */
export function hostPressOption(opt: GmPressOption, fx: HostXpEffects): GmPressOption {
  const g = opt.effect.gamble;
  if (!g || fx.points.media <= 0) return opt;
  return { ...opt, effect: { ...opt.effect, gamble: { ...g, odds: fx.pressOdds(g.odds) } } };
}

/** The least a cut needs to be priced: who he is and what he is owed. */
export interface HostCutMan { id: string; salary: number; years: number; guaranteed?: boolean }

/**
 * Cap craft, the quote. What cutting this man costs this GM: the shared cut
 * engine's dead money (frontOfficeCuts.deadMoneyFor) with this season's
 * figure eased, and next season's as the engine itself reaches it (half of
 * this season's, the halving rollDeadCap applies, when the engine carries it
 * a second season). With no point it is deadMoneyFor's own answer.
 */
export function hostCutQuote(p: HostCutMan, fx: HostXpEffects, team: string, season: number): { now: number; next: number } {
  const base = deadMoneyFor(p);
  if (fx.points.capCraft <= 0) return base;
  const now = fx.deadMoney(base.now, hostKey(team, season, p.id));
  return { now, next: base.next > 0 ? round1(now / 2) : 0 };
}

/**
 * Cap craft, the charge. Call it straight after the sport's own release has
 * succeeded: it eases the dead money entry the cut engine just wrote for him
 * and hands back the figure charged, or null when the club holds no entry for
 * him. It reads the LAST entry for the id, because a club's list can also
 * hold a retained salary row under the same player and the cut engine
 * appends. The same key as the quote, so the price on the screen before the
 * second tap is the price charged. MUTATES the club, as the engines do.
 */
export function hostCraftCut(club: CutLedger, playerId: string, fx: HostXpEffects, team: string, season: number): number | null {
  const list = club.deadCap ?? [];
  let at = -1;
  for (let i = list.length - 1; i >= 0; i--) if (list[i].playerId === playerId) { at = i; break; }
  if (at < 0) return null;
  const entry = list[at];
  if (fx.points.capCraft <= 0) return entry.amount;
  const amount = fx.deadMoney(entry.amount, hostKey(team, season, playerId));
  if (amount !== entry.amount) club.deadCap = list.map((d, i) => (i === at ? { ...d, amount } : d));
  return amount;
}

/**
 * Negotiation. The cases on the re sign desk with the ask eased, for the men
 * he can negotiate with and nobody else: a rival's offer sheet is priced
 * inside deskCase off the raw ask before this runs and so cannot move, and a
 * man under club control has no talk to ease. With no point it returns the
 * very case objects deskCases built. The floor is the sport's own minimum
 * deal, read off its contract host.
 */
export function hostDeskCases<L extends GmContractLeague>(
  contracts: GmContractHost<L, unknown>, league: L, ledger: GmContractLedger, fx: HostXpEffects,
): DeskCase[] {
  const cases = deskCases(contracts, league, ledger);
  if (fx.points.negotiation <= 0) return cases;
  const minimum = contracts.minSalary?.(league) ?? 0.5;
  return cases.map(c => {
    if (!c.canNegotiate) return c;
    const salary = fx.ask(c.ask.salary, minimum, hostKey(ledger.team, league.season, c.man.id));
    return salary === c.ask.salary ? c : { ...c, ask: { ...c.ask, salary } };
  });
}

/* ================================================================== */
/* 9. What a board hands the panels, and the words on the boxes        */
/* ================================================================== */

/** The career half of a board's facts. One object, built once a render, for all three panels. */
export interface GmCareerBinding {
  pack: GmSeatPack;
  seat: GmSeatBlock;
  /** Null while he holds a seat. */
  market: HostMarket | null;
  nameOf(id: string): string;
  /** The trees this desk routes to its engine. A tree off the list sells no point. */
  live: readonly GmTree[];
  /** False on a save whose GM desk has never been opened. */
  deskOn: boolean;
  /** What this desk pays XP for (hostEarnsLine), so the screen promises no more than the save can feed. */
  earns: string;
  take(offer: SeatOffer): void;
  sitOut(): void;
  spend(tree: GmTree): void;
}

/** A sport's facts type extends this, and its panel list spreads GM_CAREER_PANELS after its own. */
export interface GmCareerFacts extends GmFacts {
  career: GmCareerBinding;
}

/** How a tier reads on a box, lower case. Index 0 is unused. */
export const HOST_TIER_WORDS = ['', 'top tier', 'upper half', 'lower half', 'bottom tier'] as const;

/** One mark a graded season, for the Career box. */
export const HOST_GRADE_MARKS: Record<FoGradeResult, { mark: string; word: string }> = {
  title: { mark: '\u{1F3C6}', word: 'won the title' },
  overachieved: { mark: '▲', word: 'beat the ask' },
  met: { mark: '●', word: 'met the ask' },
  missed: { mark: '▽', word: 'missed the ask' },
  badly: { mark: '✕', word: 'nowhere near the ask' },
};

const titleWords = (n: number): string => (n === 0 ? 'no titles' : plural(n, 'title'));

/**
 * What a hub box can hold. The shared HubTiles draws a box's value and its
 * sub on one line each and cuts the rest off with an ellipsis, so a string
 * that outgrows the box loses its end, and the end is where the fact is.
 * Measured 2026-10-10 in Chromium on the built site's stylesheet (the
 * review's walk, runner result r1223-run-w): at 390 wide the line is 149 px;
 * the value's bold 14 px type ran 7.0 to 7.7 px a letter and the sub's 9 px
 * type 4.2. Each ceiling is that line less a tenth, at the widest letter
 * measured. scripts/simGmDeskHost.mjs holds every box string to them, with
 * each sport's real club names (control `longtile`).
 */
export const HOST_TILE_VALUE_MAX = 17;
export const HOST_TILE_SUB_MAX = 32;

/** The Job market box. Null while he holds a seat, so the hub never shows it. */
export function hostMarketTile(market: HostMarket | null): GmTileFace | null {
  if (!market) return null;
  /* What a year out leaves, when it is not simply open: the same word on the box whether or not somebody called. */
  const hangs = 'Next year hangs on your old club';
  if (market.state === 'offers') {
    const n = market.offers.length;
    const sub = market.nextYear === 'shut' ? `The last ${n === 1 ? 'call' : 'calls'} you will get`
      : market.nextYear === 'climb' ? hangs
      : 'Open it to see each ask';
    return { icon: '\u{1F4DE}', value: plural(n, 'offer'), sub, accent: true };
  }
  if (market.state === 'closed') {
    return { icon: '\u{1F4F5}', value: 'No more calls', sub: 'Only a new front office now', accent: false };
  }
  return {
    icon: '\u{1F4DE}', value: 'Nobody called',
    sub: market.nextYear === 'climb' ? hangs : 'Next year open, as things stand',
    accent: false,
  };
}

/** The Career box. Reading it never writes, so it needs no desk. */
export function hostCareerTile(seat: GmSeatBlock, nameOf: (id: string) => string): GmTileFace {
  const stints = seat.career.stints;
  const index = stints.length - 1;
  const s = stints[index];
  if (s.ended) {
    const clubs = new Set(stints.map(x => x.team)).size;
    return { icon: '\u{1F4D6}', value: 'Out of work', sub: `${plural(clubs, 'club')}, ${titleWords(careerTotals(seat.career).titles)}`, accent: false };
  }
  /* The season on the value and the club under it: a club's full name does
     not fit the value's line at any width (measured: 224 px and up in 149 or
     182). A name too long even for the sub goes in alone. */
  const name = nameOf(s.team);
  const withThe = `With the ${name}`;
  return {
    icon: '\u{1F4D6}', value: `Season ${hostStintSeasons(seat, index) + 1}`,
    sub: withThe.length <= HOST_TILE_SUB_MAX ? withThe : name, accent: false,
  };
}

/** True when some tree on this desk can take a point he already has. */
export function hostCanSpend(desk: GmDesk | null, live: readonly GmTree[]): boolean {
  const xp = hostXpOf(desk);
  return gmPointsFree(xp) > 0 && live.some(t => gmTreePoints(xp, t) < GM_MAX_TREE_POINTS);
}

/** The GM level box. It pulses only when a live tree can take a point. */
export function hostXpTile(desk: GmDesk | null, live: readonly GmTree[], deskOn: boolean): GmTileFace {
  const xp = hostXpOf(desk);
  const level = gmLevel(xp);
  const free = gmPointsFree(xp);
  const can = hostCanSpend(desk, live);
  const sub = !deskOn ? 'Starts with your GM desk'
    : can ? `${plural(free, 'point')} to spend`
    : free > 0 ? `${plural(free, 'point')} saved for later`
    : level >= GM_MAX_LEVEL ? 'Top level'
    : `${Math.max(0, Math.round(xpForLevel(level + 1) - xp.xp))} XP to level ${level + 1}`;
  return { icon: '\u{1F396}\u{FE0F}', value: `GM level ${level}`, sub, accent: deskOn && can };
}

/** The line a recap prints under the trust line after a graded season, or null when nothing was paid. */
export function hostXpRecapLine(close: Pick<HostSeasonClose, 'award' | 'levelAfter' | 'desk'>, live: readonly GmTree[]): string | null {
  if (!close.award) return null;
  const free = gmPointsFree(hostXpOf(close.desk));
  const tail = hostCanSpend(close.desk, live) ? `, ${plural(free, 'point')} to spend` : '';
  return `GM XP +${close.award.total}. Level ${close.levelAfter}${tail}.`;
}

const ordinal = (n: number): string => {
  const t = n % 100;
  const end = t >= 11 && t <= 13 ? 'th' : n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th';
  return `${n}${end}`;
};

/** The card above the boxes while he is between seats. Every fact on it is read off the league. */
export interface HostCard { title: string; lines: string[] }

export function hostOutOfWorkCard<L>(
  host: GmDeskHost<L>, league: L, seat: GmSeatBlock, market: HostMarket, nameOf: (id: string) => string,
): HostCard {
  const old = currentStint(seat.career);
  const out = seat.career.seasonsOut;
  if (out === 0) return { title: `Let go by the ${nameOf(old.team)}`, lines: [market.line] };
  const lines = [market.line];
  const season = host.season(league);
  const champion = host.champion(league, season);
  if (champion) lines.push(`The ${nameOf(champion)} won ${host.pack.words.title} in ${season}.`);
  const row = host.clubs(league).find(c => c.id === old.team);
  if (row) lines.push(`The ${nameOf(old.team)} went ${row.record} without you, ${ordinal(row.place)} in the league.`);
  return { title: `Out of work, ${plural(out, 'season')}`, lines };
}

/** The line of facts under an offer. `line` is what the sport calls its payroll line: 'cap', 'tax line'. */
export function hostOfferFactsLine(f: HostOfferFacts, line: string): string {
  const room = f.room >= 0 ? `$${f.room}M under the ${line}` : `$${round1(-f.room)}M over the ${line}`;
  return `Finished ${f.record}, ${ordinal(f.place)} in the league. Roster ranked ${ordinal(f.strengthRank)}. ${room}.`;
}

/**
 * The two actions that cannot be undone take two taps. These are the lines
 * the first tap shows. On a save whose GM desk has never been opened, taking
 * a job or sitting out opens it for good, and the line says so.
 */
export function hostTakeArmLine(pack: GmSeatPack, offer: SeatOffer, deskOn: boolean): string {
  return `Tap again to take it. You become the ${offer.teamName} ${pack.role} and it cannot be undone.${deskOn ? '' : ' It also opens your GM desk for good.'}`;
}

/**
 * The stay out line is handed the market, so the first tap says what the year
 * costs: the offers he turns down to do it, and what next year holds. It is
 * never drawn when next year is shut (hostCanSitOut); the words for that
 * state are here so the function has an honest answer for every market.
 */
export function hostSitArmLine(market: Pick<HostMarket, 'nextYear' | 'offers'>, deskOn: boolean): string {
  const n = market.offers.length;
  const pass = n > 0 ? ` You turn down ${plural(n, 'offer')} to do it.` : '';
  const next = market.nextYear === 'shut' ? ' Nobody would call after it: the phone stops for good.'
    : market.nextYear === 'climb' ? ' Next year the phone rings only if your old club has climbed the league by then.'
    : ' As things stand the phone can still ring next year.';
  return `Tap again to stay out.${pass} The league plays a whole season without you and it cannot be undone.${next}${deskOn ? '' : ' It also opens your GM desk for good.'}`;
}

/** How a stint ended, for the Career box. An open one says he is still there. */
export function hostStintEndWords(s: SeatStint): string {
  return s.ended === 'fired' ? 'Let go'
    : s.ended === 'walked' ? 'Walked away'
    : s.ended === 'poached' ? 'Bought out'
    : s.ended === 'expired' ? 'Deal ran out'
    : 'Still here';
}

/** One stint as the Career panel prints it. The tier is left off when the record does not know it. */
export interface HostStintView {
  team: string;
  name: string;
  /** 'Took over in 2027, top tier' or just 'Since 2027 or earlier' on an old save. */
  arrival: string;
  /** One mark a graded season, oldest first. */
  marks: string[];
  /** 'Plus 4 earlier seasons, not graded', or null. */
  earlier: string | null;
  ended: string;
  seasons: number;
  titles: number;
}

export function hostStintViews(seat: GmSeatBlock, nameOf: (id: string) => string): HostStintView[] {
  return seat.career.stints.map((s, i) => {
    const unknown = i === 0 && seat.before?.tierUnknown === true;
    const uncounted = i === 0 ? (seat.before?.seasons ?? 0) : 0;
    return {
      team: s.team,
      name: nameOf(s.team),
      arrival: unknown ? `In the chair since ${s.from}` : `Took over in ${s.from}, ${HOST_TIER_WORDS[s.tier]}`,
      marks: s.grades.map(g => HOST_GRADE_MARKS[g].mark),
      earlier: uncounted > 0 ? `Plus ${plural(uncounted, 'earlier season')}, not graded` : null,
      ended: hostStintEndWords(s),
      seasons: s.grades.length + uncounted,
      titles: s.grades.filter(g => g === 'title').length,
    };
  });
}

/** The line of totals above the stints. */
export function hostCareerTotalsLine(seat: GmSeatBlock): string {
  const clubs = new Set(seat.career.stints.map(s => s.team)).size;
  const out = seat.career.seasonsOut;
  const tail = out > 0 ? `, ${plural(out, 'season')} out of work` : '';
  return `${plural(hostSeasonsRecorded(seat), 'season')}, ${plural(clubs, 'club')}, ${titleWords(careerTotals(seat.career).titles)}${tail}`;
}

/**
 * The rules behind each "?" button: three or four lines and one worked
 * example. Every number in an example is computed from the lib it describes,
 * never typed, so a rule that changes cannot leave its example behind.
 */
export function hostMarketHelp(pack: GmSeatPack): string[] {
  return [
    `When ${pack.upstairs} lets you go, the ${pack.seats} that rate your record can call. The ${pack.seat} that let you go never does.`,
    `Each offer shows what that ${pack.seat} asks of your first season there. That is the ask you are graded on.`,
    'No call this year? A year out lets the league play a season without you and the phone can ring next summer, but every year out makes it quieter. The screen says when the offers in front of you are the last ones and when the phone has stopped for good, and then there is no year out to take.',
    `Worked example: leave straight after a season graded nowhere near the ask and no ${HOST_TIER_WORDS[BADLY_FIRED_CEILING - 1]} ${pack.seat} calls, whatever you won before. The best that can ring is rated ${HOST_TIER_WORDS[BADLY_FIRED_CEILING]}.`,
  ];
}

export function hostCareerHelp(pack: GmSeatPack): string[] {
  const order: FoGradeResult[] = ['title', 'overachieved', 'met', 'missed', 'badly'];
  const key = order.map(g => `${HOST_GRADE_MARKS[g].mark} ${HOST_GRADE_MARKS[g].word}`).join(', ');
  const sample: FoGradeResult[] = ['met', 'overachieved', 'title'];
  return [
    `One box for every ${pack.seat} you have run, oldest first, with a mark for each graded season.`,
    `The marks: ${key}.`,
    'Seasons from before the record began are counted and never graded: the game does not guess how they went.',
    `Worked example: a season that ${HOST_GRADE_MARKS.met.word}, one that ${HOST_GRADE_MARKS.overachieved.word}, then a title reads ${sample.map(g => HOST_GRADE_MARKS[g].mark).join(' ')}.`,
  ];
}

export function hostXpHelp(earns: string): string[] {
  const loss = -16;
  const eased = cushionTrustLoss(loss, 2);
  const kept = applyMandateResult(-loss, { result: 'missed', verdict: '', trustDelta: eased });
  const season = gmSeasonXp({ winPct: 0.6, titles: 0, playoffRoundsWon: 1, mandateSteps: mandateSteps('met'), placesAboveExpectation: 0, prospectsGraduated: 0 });
  /* The honest pace (scripts/simGmDeskHost.mjs measures it on the four engines: the median club is near this). */
  const even = gmSeasonXp({ winPct: 0.5, titles: 0, playoffRoundsWon: 0, mandateSteps: mandateSteps('met'), placesAboveExpectation: 0, prospectsGraduated: 0 });
  return [
    earns,
    `Level 2 costs ${XP_FIRST_LEVEL} XP and every level after it costs a little more. Each level is one point, and ${GM_MAX_TREE_POINTS} points fill a tree.`,
    `A .500 season that meets the ask pays ${even.total} XP, so at that pace the first point is about ${plural(Math.ceil(XP_FIRST_LEVEL / even.total), 'season')} away. Playoff rounds, a title and beating the ask bring it sooner.`,
    'A tree marked Not here yet takes no points on this desk, so a point is never spent where it moves nothing.',
    `Worked example: a .600 season that met the ask and won one playoff round pays ${season.total} XP. And with two ${GM_TREE_INFO.ownership.label} points, missing the ask on trust ${-loss} costs ${-eased}, not ${-loss}, so you keep the job on trust ${kept.trust}.`,
  ];
}

