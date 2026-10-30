/**
 * Round 1550: what a board reads of a GM's career on every screen, lifted out of gmDeskHost.ts word for word.
 *
 * WHY. Round 1533 bound the desk host to the NFL board, and with it the whole job market, the year out, the
 * verdict and the seat packs came into the page every visitor downloads (/front-office 389.5K against its 374K
 * row). Almost all of that runs only at a season's close, when he is fired, or when he opens a career box, and
 * the board now fetches it then (src/lib/nflCareerKit.ts). What stays with the page is this file: what the hub's
 * two career boxes and the "?" panel need on every visit.
 *
 *   - the two blocks' keys and who owns a block when he changes clubs (a sport's own rows join these);
 *   - the record block's shape and its reader (a stored block when it is sound and fits the save, else the
 *     record a save older than the block stands on; never written by reading);
 *   - the XP block's reader;
 *   - the words on the Career, GM level and Job market boxes;
 *   - the GM level rules for the "?" panel.
 *
 * It reads the career record (gmSeatRecord.ts), the XP curve (gmXp.ts) and the owner's grade (foOwnerMandate.ts),
 * nothing else: no adapter, no league, no market, no seat pack. gmDeskHost.ts re-exports every name here, so a
 * caller, a test or a harness that imports the host reads exactly what it read before.
 *
 * The rules of the host (gmDeskHost.ts, its header) hold here unchanged: no draw, no clock, nothing evaluated from
 * an import at module scope, reading never writes, words decided here and not in JSX.
 */
import { gmBlock, type GmDesk, type GmTileFace } from './gmDesk';
import { careerTotals, currentStint, sanitizeGmCareer, type GmCareer, type SeatStint } from './gmSeatRecord';
import {
  GM_MAX_LEVEL, GM_MAX_TREE_POINTS, GM_TREE_INFO, XP_FIRST_LEVEL, cushionTrustLoss, defaultGmXp, gmLevel,
  gmPointsFree, gmSeasonXp, gmTreePoints, isValidGmXp, mandateSteps, xpForLevel,
  type GmTree, type GmXp,
} from './gmXp';
import { applyMandateResult, gradeSeason, type FoGradeResult, type OwnerMandate } from './foOwnerMandate';
import type { ClubTier } from './managerOffers';
import type { HostMarket } from './gmDeskHost';
import { gmSport, type GmSportKey } from './gmSport';

/* Small helpers, shared with gmDeskHost.ts. */
export const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`;
export const isInt = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n);
export const whole = (n: number): number => (Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0);

export const GM_HOST_KEYS = { seat: 'seat', xp: 'xp' } as const;

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

/** What a save alone knows of itself, with no league read through an adapter. */
export interface HostBoxFacts {
  team: string;
  season: number;
  seasonCounted: boolean;
  seasonsPlayed: number;
  titles: number;
  fired: boolean;
}

/**
 * Round 1550: the legacy facts a hub's two boxes are drawn from before the career kit is on the page (a board
 * that fetches the host when it needs it, src/components/front-office/nflCareerKit.ts). Of a legacy record the
 * boxes read the stints, their seasons, how the last one ended and the titles, which come from the save alone.
 * The club's tier and the last grade, the two facts read off the league through the adapter, are left at the
 * bottom tier and none: the boxes read neither (a legacy record's first tier is unknown on every screen, and a
 * last grade that is not a title only moves a counted season into the graded ones). Every other screen reads the
 * kit's own record (hostLegacy). scripts/simFoLazyDesk.mjs holds the boxes drawn from this equal to the boxes
 * drawn from the kit's record, over whole leagues.
 */
export function hostBoxLegacy(f: HostBoxFacts): HostLegacy {
  return {
    team: f.team, tier: 4, season: f.season, seasonCounted: f.seasonCounted,
    seasonsPlayed: f.seasonsPlayed, titles: f.titles, fired: f.fired, lastGrade: null,
  };
}

/**
 * Round 1559: whether the save's counters already hold the league's season (the seasonCounted contract on
 * HostLegacy above). Read off the save, never off the league: true on the recap, the draft and the fired screen of
 * a season he ran; false on the hub and the pick screen (a season being played) and after a year out (the league
 * has a champion he did not play for). Every board names its phases 'hub' and 'pick', so this is every sport's
 * rule; it was the NFL's nflSeasonCounted (Round 1533 finding 11), which nflGmDesk.ts now re-exports by name.
 */
export function hostSeasonCounted(phase: string, desk: GmDesk | null): boolean {
  if (phase === 'hub' || phase === 'pick') return false;
  const stored = desk ? desk.blocks[GM_HOST_KEYS.seat] : undefined;
  return !(isGmSeatBlock(stored) && stored.career.seasonsOut > 0);
}

/** His XP block, a fresh one when absent or mangled. Never writes. */
export function hostXpOf(desk: GmDesk | null): GmXp {
  if (!desk) return defaultGmXp();
  return gmBlock<GmXp>(desk, GM_HOST_KEYS.xp, isValidGmXp, defaultGmXp);
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

/** Seasons a stint covers: its grades, plus the uncounted ones when it is the stint the record began in. */
export function hostStintSeasons(seat: GmSeatBlock, index: number): number {
  const s = seat.career.stints[index];
  if (!s) return 0;
  return s.grades.length + (index === 0 ? (seat.before?.seasons ?? 0) : 0);
}

export const titleWords = (n: number): string => (n === 0 ? 'no titles' : plural(n, 'title'));

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

/*
 * The earn sentence (hostEarnsLine) is not one of these lines: the GM level
 * screen prints it above the "?", and a help that opened with it said the
 * same sentence twice, word for word.
 */
export function hostXpHelp(): string[] {
  /* What a season one step short of the ask costs, read off gradeSeason itself (it exports no constant): an owner
     who asks for the postseason and a season that misses it. */
  const missed = gradeSeason(
    { tier: 'playoffs', text: '', winFloor: 0, reqLevel: 1, season: 0 },
    { wins: 0, madePlayoffs: false, roundsWon: 0, reachedFinal: false, wonTitle: false },
  );
  const loss = missed.trustDelta;
  const eased = cushionTrustLoss(loss, 2);
  const kept = applyMandateResult(-loss, { ...missed, trustDelta: eased });
  const season = gmSeasonXp({ winPct: 0.6, titles: 0, playoffRoundsWon: 1, mandateSteps: mandateSteps('met'), placesAboveExpectation: 0, prospectsGraduated: 0 });
  /* The honest pace (scripts/simGmDeskHost.mjs measures it on the four engines: the median club is near this). */
  const even = gmSeasonXp({ winPct: 0.5, titles: 0, playoffRoundsWon: 0, mandateSteps: mandateSteps('met'), placesAboveExpectation: 0, prospectsGraduated: 0 });
  return [
    `Level 2 costs ${XP_FIRST_LEVEL} XP and every level after it costs a little more. Each level is one point, and ${GM_MAX_TREE_POINTS} points fill a tree.`,
    `A .500 season that meets the ask pays ${even.total} XP, so at that pace the first point is about ${plural(Math.ceil(XP_FIRST_LEVEL / even.total), 'season')} away. Playoff rounds, a title and beating the ask bring it sooner.`,
    'A tree marked Not here yet takes no points on this desk, so a point is never spent where it moves nothing.',
    `Worked example: a .600 season that met the ask and won one playoff round pays ${season.total} XP. And with two ${GM_TREE_INFO.ownership.label} points, missing the ask on trust ${-loss} costs ${-eased}, not ${-loss}, so you keep the job on trust ${kept.trust}.`,
  ];
}

/**
 * Round 1559: the career rules a Front Office page puts behind its "?" (fired is a chapter, not the end), written
 * once for the four sports. They were the NFL page's frontOfficeCareerRules (FrontOffice.tsx, Round 1533), sport
 * neutral but for the word for the books, which comes from the sport's descriptor (gmSport.ts): a league whose line
 * is a luxury tax line (MLB's cbtLine) keeps a payroll, the others a cap sheet. For 'nfl' this is the NFL page's
 * five sentences byte for byte (src/lib/gmCareerRules.test.ts reads that page and holds them equal). The last line
 * is hostXpHelp's worked example, computed, as the NFL page does it. Call it inside a component, never at module
 * scope.
 */
export function hostCareerRules(sport: GmSportKey): string[] {
  const books = gmSport(sport).cap.model === 'cbtLine' ? 'payroll' : 'cap sheet';
  const xp = hostXpHelp();
  return [
    'Getting fired does not end the save. Zero trust upstairs costs you the job, and See who is calling opens the job market: franchises in the same league that rate your record call with the ask they would grade you on. The club that fired you never calls.',
    `Take a job and you move to that club's real roster, ${books} and picks, meet the room and run its draft. Your record, your titles and your GM XP come with you. The old club's staff and re-sign desk stay behind.`,
    'If the phone can still ring next year you can sit a season out: the league plays on without you, then the market reads again. Once the phone has stopped for good the screen says so, and a new front office is the way back in.',
    'Your GM earns XP every graded season from wins, titles, playoff rounds and the grade against the ask, and each level is a point. Ownership (a missed season costs less trust) and Media (a gamble at the podium lands more often) work now. The other trees say Not here yet.',
    xp[xp.length - 1].replace(/^Worked example: /, 'For example: '),
  ];
}
