/* Round 1320: the athletic director, one seat for CFB Dynasty and CBB Dynasty.

   The two college dynasties had nobody upstairs: no ask, no grade, no trust and
   no firing. The pieces were all built and mounted nowhere: the cfb and cbb
   seat packs (src/data/gmSeat/packs.ts), the ask and the grade (gmSeat.ts over
   foOwnerMandate.ts), the career record, the job market and the buyout bid,
   the one rule only college seats have (gmSeat.poachBid). This file binds them
   to a college league, sport free: it reads a CollegeLeagueView that each
   sport's binding builds from its own state (src/lib/cfbSeatBind.ts and
   src/lib/cbbSeatBind.ts), and never sees an engine type.

   What it decides, all of it this game's rule and none of it a claim about how
   real schools hire or fire:
   - THE ASK is gmSeat.seatMandate over where his ROSTER ranks (the engine's own
     strength), in the college pack's words, moved one step per sport where
     the pro ladder does not fit a college field (COLLEGE_ASK_TILT: basketball
     asks more of its bottom rosters, football less of every postseason ask).
     The ask is about the roster; the market is about the program.
   - THE MARKET reads the program: tiers are quarters of the country by
     editorial prestige (gmSeat.leagueTiers), which never moves in this round.
   - THE GRADE is gmSeat.seatGrade, trust is foOwnerMandate.applyMandateResult
     from FO_TRUST_START, and trust at zero is a firing.
   - A FIRING opens the job market (gmSeat.seatOffers), never the end of the
     dynasty. A program that let him go never calls again, in the market or
     with a buyout (the pro rule in seatOffers drops only the last club; this
     one is wider and lives here).
   - A BIG YEAR can draw a buyout bid from one tier up (gmSeat.poachBid).

   Every roll is keyed on facts of the save (keyedRng), so a reload reads the
   same feed and the same bid, and nothing here draws from Math.random: a
   dynasty with the seat plays exactly the games one without it plays until he
   changes program or is fired.

   Legal line, as in gmSeat.ts: everything is narrated, every speaker is a role
   (the athletic director, the boosters), nothing is a quote, nobody is real. */

import {
  careerTotals, currentStint, endSeatStint, fillSeatWords, leagueTiers, newGmCareer, poachBid, BADLY_FIRED_CEILING, POACH_CHANCE,
  recordSeatSeason, sanitizeGmCareer, seatGrade, seatMandate, seatNextYear, seatOffers, sitOutYear, startSeatStint,
  type GmCareer, type GmSeatPack, type SeatNextYear, type SeatOffer, type SeatTeam,
} from './gmSeat';
import { GM_SEAT_PACKS } from '../data/gmSeat/packs';
import {
  applyMandateResult, mandatePace, strengthRank, FO_TRUST_START,
  type FoGrade, type FoSeasonOutcome, type FoTier, type OwnerMandate,
} from './foOwnerMandate';
import type { ClubTier } from './managerOffers';
import { keyedRng } from './keyedRng';

export type CollegeSeatSport = 'cfb' | 'cbb';

/** One program as the seat reads it. */
export interface CollegeProgramView {
  id: string;
  name: string;
  /** The engine's own roster strength (cfbStrength, cbbStrength): what the ask ranks. */
  strength: number;
  /** Editorial prestige: what the market tiers by. */
  prestige: number;
  wins: number;
  losses: number;
}

/** What the seat reads of a league. Each sport's binding builds it from its state. */
export interface CollegeLeagueView {
  sport: CollegeSeatSport;
  season: number;
  /** The round about to be played (1 based), or the last one once the season is over. */
  round: number;
  rounds: number;
  myTeam: string;
  programs: CollegeProgramView[];
  /** Every champion on record (natties for CFB, titles for CBB). */
  champions: { season: number; team: string }[];
  /** His place in the engine's own rankings right now, 1 = top. */
  place: number;
  /** How many make the postseason field: CFB 12, CBB 32. */
  fieldSize: number;
}

/** The seat's save block, kept inside st as st.seat. Fired and the last graded
    season are read off the career, never stored. */
export interface CollegeSeatBlock {
  v: 1;
  career: GmCareer;
  /** 0 to 100. */
  trust: number;
  /** The ask for mandate.season; null between a firing and the next job. */
  mandate: OwnerMandate | null;
}

export const collegePack = (sport: CollegeSeatSport): GmSeatPack => GM_SEAT_PACKS[sport];

export function championOf(view: Pick<CollegeLeagueView, 'champions'>, season: number): string | null {
  return view.champions.find(c => c.season === season)?.team ?? null;
}

/** The season is over: its champion is on record. */
export const seasonClosed = (view: CollegeLeagueView): boolean => championOf(view, view.season) !== null;

/** The market's league: every program at its editorial prestige. */
export function collegeSeatTeams(view: CollegeLeagueView): SeatTeam[] {
  return view.programs.map(p => ({ id: p.id, name: p.name, strength: p.prestige }));
}

export function collegeTiers(view: CollegeLeagueView): Map<string, ClubTier> {
  return leagueTiers(collegeSeatTeams(view));
}

/** Where a program's roster ranks in the country, 1 = strongest, by the engine's own strength. */
export function rosterRank(view: CollegeLeagueView, id: string): number {
  return strengthRank(Object.fromEntries(view.programs.map(p => [p.id, p.strength])), id);
}

/**
 * This game's change to the ladder, by sport and by the tier the ladder gives.
 * The ladder's fractions were set for pro leagues where 40 to 53 percent of the
 * teams make a postseason of series (simGmSeat's leagues: MLB 12 of 30 to NBA 16
 * of 30). College is neither:
 * - In college basketball 32 of the 40 programs make the national tournament,
 *   so a roster the ladder would ask only for a win total ('respect' or
 *   'rebuild') is asked one step more.
 * - In college football 12 of 44 make a single elimination Playoff, so every
 *   postseason ask is one step softer: measured over 900 ten season dynasties
 *   (simCollegeSeat, runner results r1320-s1 and r1320-s1b), the ladder as it
 *   stands let go 87 percent of the coaches who started at a top tier program
 *   and 96 percent at a second tier one, and one step softer let go 11 and 17.
 * Never a flat tilt (that would move every band). Each entry is the step for
 * the tier the ladder gives; a tier not listed is asked as the ladder asks.
 */
export const COLLEGE_ASK_TILT: Record<CollegeSeatSport, Partial<Record<FoTier, -1 | 1>>> = {
  cfb: { title: -1, contend: -1, playoffs: -1 },
  cbb: { respect: 1, rebuild: 1 },
};

/** The ask a program's roster earns for a season: gmSeat.seatMandate over its
    roster rank, the defending champion's floor from the season before, and
    COLLEGE_ASK_TILT. No press tilt: college has no podium. */
export function collegeAskFor(view: CollegeLeagueView, teamId: string, season: number): OwnerMandate {
  const pack = collegePack(view.sport);
  const rank = rosterRank(view, teamId);
  const n = view.programs.length;
  const defending = championOf(view, season - 1) === teamId;
  const base = seatMandate(pack, rank, n, defending, season, 0);
  const step = COLLEGE_ASK_TILT[view.sport][base.tier];
  return step ? seatMandate(pack, rank, n, defending, season, step) : base;
}

/** His ask for a season. */
export const collegeAsk = (view: CollegeLeagueView, season: number): OwnerMandate => collegeAskFor(view, view.myTeam, season);

/** He holds a seat (his newest stint has not ended). */
export const holdsSeat = (block: CollegeSeatBlock): boolean => !currentStint(block.career).ended;

/** He was let go and has not taken a job since. */
export const isFired = (block: CollegeSeatBlock): boolean => currentStint(block.career).ended === 'fired';

/** He took a job at the close just played: his newest stint starts the season after the one on record,
    which only a move writes (a new dynasty's first stint starts at its first season). */
export function justMoved(block: CollegeSeatBlock, season: number): boolean {
  return holdsSeat(block) && block.career.stints.length > 1 && currentStint(block.career).from === season + 1;
}

/** The last season graded in the seat he holds, or null before his first close there. */
export function lastGraded(block: CollegeSeatBlock): number | null {
  const s = currentStint(block.career);
  return s.grades.length ? s.from + s.grades.length - 1 : null;
}

/** A new seat: his program, its tier by prestige, trust from the start, the ask for this season. */
export function newCollegeSeat(view: CollegeLeagueView): CollegeSeatBlock {
  const tier = collegeTiers(view).get(view.myTeam) ?? 4;
  return { v: 1, career: newGmCareer(view.myTeam, tier, view.season), trust: FO_TRUST_START, mandate: collegeAsk(view, view.season) };
}

/** The block at a season's first press: an ask already set for this season
    is kept (the offer's ask he took, the gmDeskHost summer rule), anything
    else is built now. Unchanged while he holds no seat. */
export function collegeSeasonStart(block: CollegeSeatBlock, view: CollegeLeagueView): CollegeSeatBlock {
  if (!holdsSeat(block)) return block;
  if (block.mandate && block.mandate.season === view.season) return block;
  return { ...block, mandate: collegeAsk(view, view.season) };
}

/** The live line on the tile: on pace for the ask, read off his record and his place in the rankings.
    Whether he is on pace is foOwnerMandate.mandatePace's; a win total ask is worded here, in college
    words and with one win said as one win (mandatePace's own line speaks of the front office's mandate). */
export function collegePace(block: CollegeSeatBlock, view: CollegeLeagueView): { onTrack: boolean; line: string } | null {
  if (!holdsSeat(block)) return null;
  const mandate = block.mandate && block.mandate.season === view.season ? block.mandate : collegeAsk(view, view.season);
  const wins = view.programs.find(p => p.id === view.myTeam)?.wins ?? 0;
  const pace = mandatePace(mandate, wins, (view.round - 1) / view.rounds, view.place <= view.fieldSize);
  if (mandate.reqLevel >= 1) return pace;
  const sofar = `${wins} ${wins === 1 ? 'win' : 'wins'} so far`;
  return { onTrack: pace.onTrack, line: pace.onTrack ? `${sofar}, on pace for the ask.` : `${sofar}, behind the pace for ${mandate.winFloor} wins.` };
}

/** One reading of a bracket for both sports. Only national postseason games are
    passed in (never a conference title game or a conference tournament). */
export function bracketOutcome(
  games: readonly { home: string; away: string; winner: string }[], myTeam: string, wins: number,
): FoSeasonOutcome {
  const mine = games.filter(g => g.home === myTeam || g.away === myTeam);
  const last = games[games.length - 1];
  return {
    wins,
    madePlayoffs: mine.length > 0,
    roundsWon: mine.filter(g => g.winner === myTeam).length,
    reachedFinal: !!last && (last.home === myTeam || last.away === myTeam),
    wonTitle: !!last && last.winner === myTeam,
  };
}

export interface CollegeCloseResult {
  block: CollegeSeatBlock;
  grade: FoGrade;
  /** The ask he was graded on. */
  mandate: OwnerMandate;
  trustBefore: number;
  fired: boolean;
  /** Trust at 25 or under and still in the seat. */
  warning: boolean;
}

/**
 * The close of a season he coached: the grade in the pack's words, trust moved,
 * the season on his record, and at zero trust the firing. Null when there is
 * nothing to grade: no seat held, or this season already graded (a double
 * press). An ask stored for another season is not graded: the ask for this one
 * is rebuilt from the roster.
 */
export function collegeClose(block: CollegeSeatBlock, view: CollegeLeagueView, out: FoSeasonOutcome): CollegeCloseResult | null {
  if (!holdsSeat(block)) return null;
  const last = lastGraded(block);
  if (last !== null && last >= view.season) return null;
  if (currentStint(block.career).from > view.season) return null;
  const mandate = block.mandate && block.mandate.season === view.season ? block.mandate : collegeAsk(view, view.season);
  const grade = seatGrade(collegePack(view.sport), mandate, out);
  const t = applyMandateResult(block.trust, grade);
  let career = recordSeatSeason(block.career, grade.result);
  if (t.fired) career = endSeatStint(career, 'fired');
  return {
    block: { v: 1, career, trust: t.trust, mandate: t.fired ? null : mandate },
    grade, mandate, trustBefore: block.trust, fired: t.fired, warning: t.warning,
  };
}

/* ---------------- the market, the bid and the move ---------------- */

/** Every program in his record that let him go. */
export function formerFirers(career: GmCareer): Set<string> {
  return new Set(career.stints.filter(s => s.ended === 'fired').map(s => s.team));
}

/**
 * What a year out leaves for the next one: gmSeat.seatNextYear, with one
 * honest difference. A program's tier here is its editorial prestige, which
 * never moves, so his old program cannot climb a tier in a year out and a
 * 'climb' answer is read as 'shut'. Nothing else differs.
 */
export function collegeNextYear(career: GmCareer, tiers: Map<string, ClubTier>): { nextYear: SeatNextYear; climbTo: ClubTier | null } {
  const n = seatNextYear(career, tiers);
  return n.nextYear === 'climb' ? { nextYear: 'shut', climbTo: null } : n;
}

export type CollegeMarketState = 'offers' | 'quiet' | 'closed';

export interface CollegeOfferFacts {
  prestige: number;
  /** Where its roster ranks, 1 = strongest, of `of`. */
  rosterRank: number;
  of: number;
  /** Its record in the season just played. */
  record: string;
}

export interface CollegeMarket {
  state: CollegeMarketState;
  nextYear: SeatNextYear;
  line: string;
  seasonsOut: number;
  /** The season a job taken now is first graded in. */
  season: number;
  offers: SeatOffer[];
  facts: Record<string, CollegeOfferFacts>;
  /** Offers gmSeat drew and this game's wider rule removed (a program that let him go before). */
  removed: number;
}

/** The key of one feed: facts of the save and nothing else, so the same save always reads the same feed. */
export function collegeFeedKey(view: CollegeLeagueView, career: GmCareer): string {
  const s = currentStint(career);
  return `college|${view.sport}|${s.team}|${s.from}|${s.grades.join(',')}|${view.season}|${career.seasonsOut}`;
}

/** The key of one bid, the same shape. */
export function collegeBidKey(view: CollegeLeagueView, career: GmCareer): string {
  const s = currentStint(career);
  return `collegebid|${view.sport}|${s.team}|${s.from}|${s.grades.join(',')}|${view.season}`;
}

const nameOf = (view: CollegeLeagueView, id: string): string => view.programs.find(p => p.id === id)?.name ?? id;

/** An offer's ask, read off where that program's roster ranks for the season he would start there. */
function withRosterAsk(view: CollegeLeagueView, o: SeatOffer, season: number): SeatOffer {
  return { ...o, ask: collegeAskFor(view, o.teamId, season) };
}

function factsOf(view: CollegeLeagueView, id: string): CollegeOfferFacts {
  const p = view.programs.find(x => x.id === id);
  return { prestige: p?.prestige ?? 0, rosterRank: rosterRank(view, id), of: view.programs.length, record: p ? `${p.wins}-${p.losses}` : '' };
}

/**
 * The market for a coach out of work, or null while he holds a seat or before
 * the season is over. Keyed: reading it twice, or after a reload, reads the same
 * feed. Offers come from gmSeat.seatOffers alone (its ceilings hold), and then
 * every program that let him go is dropped, after the draw, so the rule can
 * only shrink the feed.
 */
export function collegeMarket(block: CollegeSeatBlock, view: CollegeLeagueView): CollegeMarket | null {
  if (holdsSeat(block) || !seasonClosed(view)) return null;
  const pack = collegePack(view.sport);
  const teams = collegeSeatTeams(view);
  const tiers = leagueTiers(teams);
  const drawn = seatOffers(pack, teams, block.career, view.season + 1, keyedRng(collegeFeedKey(view, block.career)), championOf(view, view.season));
  const firers = formerFirers(block.career);
  const offers = drawn.filter(o => !firers.has(o.teamId)).map(o => withRosterAsk(view, o, view.season + 1));
  const { nextYear } = collegeNextYear(block.career, tiers);
  const state: CollegeMarketState = offers.length > 0 ? 'offers' : nextYear === 'shut' ? 'closed' : 'quiet';
  const facts: Record<string, CollegeOfferFacts> = {};
  for (const o of offers) facts[o.teamId] = factsOf(view, o.teamId);
  return {
    state, nextYear, seasonsOut: block.career.seasonsOut, season: view.season + 1, offers, facts,
    removed: drawn.length - offers.length,
    line: collegeMarketLine(block.career, state, nextYear, offers.length, nameOf(view, currentStint(block.career).team)),
  };
}

/**
 * A buyout bid after a big year, or null. Only on the season just graded in the
 * seat he holds; the gate (a 'title' or 'overachieved' season, one tier up,
 * never at tier 1, the chance) is gmSeat.poachBid's. A bid from a program that
 * let him go before is dropped after the draw.
 */
export function collegeBid(block: CollegeSeatBlock, view: CollegeLeagueView): SeatOffer | null {
  if (!holdsSeat(block) || lastGraded(block) !== view.season || !seasonClosed(view)) return null;
  const bid = poachBid(collegePack(view.sport), collegeSeatTeams(view), block.career, view.season + 1,
    keyedRng(collegeBidKey(view, block.career)), championOf(view, view.season));
  if (!bid || formerFirers(block.career).has(bid.teamId)) return null;
  return withRosterAsk(view, bid, view.season + 1);
}

/** What taking a job writes: his program and his seat. The engine's own state is the caller's to set. */
export interface CollegeMove { myTeam: string; block: CollegeSeatBlock; offer: SeatOffer }

/**
 * Take a job off today's market or today's bid. The offer is read here, never
 * trusted from the screen, so a second press finds nothing and returns null.
 * A seat still held closes as 'poached' (the buyout); the new stint starts the
 * season after the league's, with trust from the start and the offer's ask.
 */
export function collegeTakeJob(block: CollegeSeatBlock, view: CollegeLeagueView, teamId: string, from: 'market' | 'bid'): CollegeMove | null {
  const bid = from === 'bid' ? collegeBid(block, view) : null;
  const offer = from === 'bid'
    ? (bid && bid.teamId === teamId ? bid : null)
    : collegeMarket(block, view)?.offers.find(o => o.teamId === teamId) ?? null;
  if (!offer) return null;
  return {
    myTeam: offer.teamId,
    offer,
    block: { v: 1, career: startSeatStint(block.career, offer, view.season + 1), trust: FO_TRUST_START, mandate: offer.ask },
  };
}

/** Whether a year out is on offer: out of work, the season over, and next year not shut. */
export function collegeCanSitOut(block: CollegeSeatBlock, view: CollegeLeagueView): boolean {
  const m = collegeMarket(block, view);
  return !!m && m.nextYear !== 'shut';
}

/** One more year with no program, written on the record. Unchanged when it cannot be. */
export function collegeSitOut(block: CollegeSeatBlock, view: CollegeLeagueView): CollegeSeatBlock {
  return collegeCanSitOut(block, view) ? { ...block, career: sitOutYear(block.career) } : block;
}

const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`;

/** The market's line, in college words, for all three states. A program's
    name takes no article. Seasons are the stint's graded seasons: a college
    stint always starts at the first season he coached there. */
export function collegeMarketLine(
  career: GmCareer, state: CollegeMarketState, nextYear: SeatNextYear, offerCount: number, oldName: string,
): string {
  const s = currentStint(career);
  const titles = s.grades.filter(g => g === 'title').length;
  const record = `${plural(s.grades.length, 'season')} and ${titles === 0 ? 'no titles' : plural(titles, 'title')}`;
  const out = career.seasonsOut;
  const head = out > 0 ? `${plural(out, 'season')} out of work since ${oldName} let you go.`
    : s.ended === 'fired' ? `The athletic director let you go after ${record} at ${oldName}.`
    : `You left ${oldName} after ${record}.`;
  if (state === 'offers') {
    const called = `${head} ${plural(offerCount, 'program')} called.`;
    return nextYear === 'shut' ? `${called} ${offerCount === 1 ? 'It is the last call' : 'They are the last calls'} you will get: pass, and the phone stops for good.` : called;
  }
  if (state === 'closed') return `${head} Nobody called, and nobody will: the phone has stopped. A new dynasty is the way back in.`;
  return `${head} Nobody called this year. The phone can still ring next year, and every year out makes it quieter.`;
}

/* ---------------- the save ---------------- */

/** What a stored seat block is checked against. */
export interface CollegeSeatContext { season: number; myTeam: string; programIds: ReadonlySet<string> }

/**
 * A stored seat block, or null when anything is off, so the caller drops this
 * block alone and the dynasty loads as a save that never had one. Checks what
 * gmSeat.sanitizeGmCareer does not: his newest stint is at st.myTeam (a coach
 * out of work stays at the program that let him go until he takes a job), every
 * stint is a program of this sport, the stints start in order and never after
 * the season about to be played (a job taken at a close starts the season
 * after the one on record), the ask is for this season or the next, and trust
 * is a whole number from 0 to 100.
 */
export function sanitizeCollegeSeat(raw: unknown, ctx: CollegeSeatContext): CollegeSeatBlock | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (r.v !== 1) return null;
  if (typeof r.trust !== 'number' || !Number.isInteger(r.trust) || r.trust < 0 || r.trust > 100) return null;
  const career = sanitizeGmCareer(r.career);
  if (!career) return null;
  if (currentStint(career).team !== ctx.myTeam) return null;
  let prev = -Infinity;
  for (const s of career.stints) {
    if (!ctx.programIds.has(s.team)) return null;
    if (s.from <= prev || s.from > ctx.season + 1) return null;
    prev = s.from;
  }
  let mandate: OwnerMandate | null = null;
  if (r.mandate !== null) {
    const m = r.mandate as Record<string, unknown> | undefined;
    if (!m || typeof m !== 'object') return null;
    const tiers: readonly string[] = ['title', 'contend', 'playoffs', 'respect', 'rebuild'];
    if (typeof m.tier !== 'string' || !tiers.includes(m.tier) || typeof m.text !== 'string') return null;
    if (!Number.isInteger(m.winFloor) || !Number.isInteger(m.reqLevel) || !Number.isInteger(m.season)) return null;
    if (m.season !== ctx.season && m.season !== ctx.season + 1) return null;
    mandate = { tier: m.tier as FoTier, text: m.text, winFloor: m.winFloor as number, reqLevel: m.reqLevel as number, season: m.season as number };
  }
  return { v: 1, career, trust: r.trust, mandate };
}

/**
 * What a load does with the seat, in this order (the round's load rules):
 *  1. A seat whose stint has ended, on phase 'recruit' or on a season still
 *     open: no path writes that ('recruit' has already run the offseason, so a
 *     job taken from it would run it twice). The seat is dropped, in memory
 *     only, and the dynasty loads as an old save.
 *  2. A sane seat whose stint has ended, on a closed season, from phase
 *     'recap', 'season' or a hand written 'market': the job market opens.
 *  3. Any other saved 'market' (the market is a screen and never saved): the
 *     trail on a closed season, as an old recap save without its recap does,
 *     else the season screen. Never an empty market, never a closed season
 *     replayed.
 *  Anything else loads as saved.
 */
export type CollegeSeatLoad = { dropSeat: boolean; open: 'market' | 'recruit' | 'season' | null };

export function collegeSeatLoad(seat: CollegeSeatBlock | null, phase: string, closed: boolean): CollegeSeatLoad {
  const ended = !!seat && !holdsSeat(seat);
  const dropSeat = ended && (phase === 'recruit' || !closed);
  if (ended && !dropSeat && (phase === 'recap' || phase === 'season' || phase === 'market')) return { dropSeat, open: 'market' };
  if (phase === 'market') return { dropSeat, open: closed ? 'recruit' : 'season' };
  return { dropSeat, open: null };
}

/** A record line for the card: totals over every stint. */
export function collegeCareerTotals(block: CollegeSeatBlock): { seasons: number; titles: number; programs: number } {
  const t = careerTotals(block.career);
  return { seasons: t.seasons, titles: t.titles, programs: block.career.stints.length };
}

/* ---------------- what the screens read ---------------- */

/** The season screen's tile: the ask, trust and the live line. Null while he holds no seat. */
export function collegeTileView(block: CollegeSeatBlock, view: CollegeLeagueView): { ask: string; trust: number; line: string; onTrack: boolean } | null {
  const pace = collegePace(block, view);
  if (!pace) return null;
  const mandate = block.mandate && block.mandate.season === view.season ? block.mandate : collegeAsk(view, view.season);
  return { ask: mandate.text, trust: block.trust, line: pace.line, onTrack: pace.onTrack };
}

/** The recap's line for the season just closed: the verdict in the pack's words and trust. Null when the season was not graded. */
export function collegeRecapView(block: CollegeSeatBlock, view: CollegeLeagueView): { verdict: string; trust: number; hot: boolean; fired: boolean } | null {
  if (lastGraded(block) !== view.season) return null;
  const s = currentStint(block.career);
  const grade = s.grades[s.grades.length - 1];
  const pack = collegePack(view.sport);
  const fired = s.ended === 'fired';
  return { verdict: fillSeatWords(pack.verdicts[grade], pack, block.mandate?.winFloor ?? 0), trust: block.trust, hot: !fired && block.trust <= 25, fired };
}

/** One row a stint for the card's record. */
export interface CollegeStintRow { team: string; name: string; since: number; seasons: number; titles: number; ended: string | null }

export function collegeStintRows(block: CollegeSeatBlock, view: CollegeLeagueView): CollegeStintRow[] {
  const words: Record<string, string> = { fired: 'let go', poached: 'took the buyout', walked: 'walked', expired: 'deal ran out' };
  return block.career.stints.map(s => ({
    team: s.team, name: nameOf(view, s.team), since: s.from, seasons: s.grades.length,
    titles: s.grades.filter(g => g === 'title').length, ended: s.ended ? words[s.ended] : null,
  }));
}

/** The "?" behind the athletic director: the rules and a worked example, every number read off the code. */
export function collegeSeatRules(view: CollegeLeagueView): { rules: string[]; example: string[] } {
  const pack = collegePack(view.sport);
  /* the five trust moves, read off gradeSeason on a 'win a game' ask */
  const ask: OwnerMandate = { tier: 'contend', text: '', winFloor: 0, reqLevel: 2, season: view.season };
  const move = (o: Partial<FoSeasonOutcome>) => seatGrade(pack, ask, { wins: 0, madePlayoffs: false, roundsWon: 0, reachedFinal: false, wonTitle: false, ...o }).trustDelta;
  const title = move({ wonTitle: true, madePlayoffs: true, reachedFinal: true });
  const beat = move({ madePlayoffs: true, roundsWon: 2, reachedFinal: true });
  const met = move({ madePlayoffs: true, roundsWon: 1 });
  const short = move({ madePlayoffs: true });
  const far = move({});
  const sgn = (n: number) => (n > 0 ? `+${n}` : `${n}`);
  const tilted = Object.entries(COLLEGE_ASK_TILT[view.sport]);
  const rules = [
    tilted.some(([, s]) => s === -1)
      ? "Before every season the athletic director names an ask, read off where your roster ranks in the country, not off the program's name."
      : `Before every season the athletic director names an ask, read off where your roster ranks in the country, not off the program's name: the best rosters are asked for ${pack.words.title}, the next ones to win ${pack.words.round}, then to make ${pack.words.playoffs}, and the rest for a win total.`,
    ...(tilted.some(([, s]) => s === 1) ? [`In this game the athletic director asks one step more of a roster that would only be asked for a win total, because ${view.fieldSize} of ${view.programs.length} programs make ${pack.words.playoffs}.`] : []),
    ...(tilted.some(([, s]) => s === -1) ? [`In this game the athletic director asks one step less of every roster that would be asked for a postseason result, because only ${view.fieldSize} of ${view.programs.length} programs make ${pack.words.playoffs} and one loss ends a run there: the best rosters are asked to make ${pack.words.playoffs} and win ${pack.words.round}, the next ones to make it, and nobody is asked for ${pack.words.title} outright.`] : []),
    `Trust starts at ${FO_TRUST_START} of 100. At the end of every season it moves by the grade: ${sgn(title)} for ${pack.words.title}, ${sgn(beat)} for beating the ask, ${sgn(met)} for meeting it, ${sgn(short)} for falling short and ${sgn(far)} for missing it by a mile.`,
    'Trust at zero and you are let go. The dynasty can go on from there: the phone rings with the jobs you have earned, or nobody calls and you can sit a year out while the country plays on. If the phone stops for good, a new dynasty is the way back in.',
    `Let go straight after a season nowhere near the ask and no program above the ${['', 'top', 'second', 'third', 'bottom'][BADLY_FIRED_CEILING]} tier will call. A program that let you go never calls again. Those are this game's rules.`,
    'Sit a year out and the program that let you go plays the season with nobody in your chair, so a coordinator it loses that offseason stays unreplaced until the next one.',
    `A big year gets noticed. Win ${pack.words.title} at a program below the top tier and a program one tier up pays your buyout to bring you over ${Math.round((POACH_CHANCE.title ?? 0) * 100)} times in 100; beat the ask and it happens ${Math.round((POACH_CHANCE.overachieved ?? 0) * 100)} times in 100. Go, or stay put. That is this game's rule, not a claim about how real schools hire.`,
  ];
  const t1 = applyMandateResult(FO_TRUST_START, { result: 'missed', verdict: '', trustDelta: short }).trust;
  const t2 = applyMandateResult(t1, { result: 'badly', verdict: '', trustDelta: far });
  const t3 = applyMandateResult(t2.trust, { result: 'badly', verdict: '', trustDelta: far });
  const example = [
    `Say you take over with trust ${FO_TRUST_START} and fall short of the ask: ${FO_TRUST_START} ${sgn(short)} leaves ${t1}.`,
    `Next season you miss it by a mile: ${t1} ${sgn(far)} leaves ${t2.trust}${t2.warning ? ', and the seat is hot' : ''}.`,
    `Do it again and trust hits ${t3.trust}${t3.fired ? ': you are let go, and the job market opens' : ''}.`,
  ];
  return { rules, example };
}

/** The recap's bid, as the card shows it: who, how high, the ask he would take on and why they called. */
export function collegeBidView(bid: SeatOffer, view: CollegeLeagueView): { teamId: string; name: string; tier: ClubTier; prestige: number; ask: string; reason: string } {
  const p = view.programs.find(x => x.id === bid.teamId);
  return { teamId: bid.teamId, name: bid.teamName, tier: bid.tier, prestige: p?.prestige ?? 0, ask: bid.ask.text, reason: bid.reason };
}
