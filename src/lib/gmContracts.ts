/**
 * Round 908: the re-sign desk, one engine for all four front offices.
 *
 * Before this round a GM's own player whose deal had run out stayed or left on
 * a coin flip, the same coin flip the CPU clubs use, inside each engine's
 * offseason: frontOffice.ts (under 76 overall, half of them walk; over it, 15
 * percent), nbaFrontOffice.ts, mlbFrontOffice.ts and nhlFrontOffice.ts (under
 * 80, 45 percent). The GM was never asked. Club Manager has had a real table
 * since Round 506: a typed offer, a closeness meter, patience, a walkout line.
 * That table is src/lib/gmDealTable.ts now, and this file is the desk built on
 * it: every expiring man states an ask, and the GM keeps him, pushes once, or
 * lets him go. Each league's own mechanism (the fifth year option, Bird
 * rights, arbitration and the qualifying offer, restricted free agency and
 * offer sheets) is data in src/lib/gmContractRules.ts.
 *
 * HOW IT REACHES AN ENGINE WITHOUT EDITING ONE. The four engines share a
 * shape (a league with a season, a cap, clubs with players and picks, and a
 * pool), so the desk is written against that shape and a small host that
 * hands it the three things that differ: what the engine itself would pay a
 * man of that rating, next season's cap, and the engine's own offseason.
 * runDeskOffseason settles every decision BEFORE the engine's offseason runs:
 * a kept man is given his agreed years plus the one the offseason is about to
 * take off, so he never reaches the coin flip; a man let go is moved to the
 * pool the way the engine moves a walker, with no dead money because his deal
 * ran out. Picks owed to the club are added AFTER the offseason, because every
 * engine resets a club's picks inside it.
 *
 * IT FAILS CLOSED. If any expiring man has no recorded decision the offseason
 * does not run and the desk says who is waiting. Nobody leaves on a draw.
 *
 * Everything here is a pure function of what it is handed. Nothing draws from
 * Math.random: whether a rival tables an offer sheet is hashed off the player
 * and the season, so it cannot flicker between renders or be rerolled by
 * reopening the desk. Nothing is evaluated at module scope beyond literals.
 */
import {
  AGREE_RATIO, dealCloseness, hash32, offerVerdict, patienceCost, type OfferVerdict,
} from '@/lib/gmDealTable';
import {
  MLB_ARBITRATION_AFTER, MLB_FREE_AGENCY_AFTER, MLB_QUALIFYING_OFFER_TOP, MLB_QUALIFYING_OFFER_YEARS,
  NBA_BIRD_MAX_YEARS, NBA_BIRD_SEASONS, NBA_EARLY_BIRD_AVERAGE, NBA_EARLY_BIRD_MAX_YEARS, NBA_EARLY_BIRD_MIN_YEARS,
  NBA_EARLY_BIRD_RAISE, NBA_NON_BIRD_MAX_YEARS, NBA_NON_BIRD_RAISE, NFL_OPTION_ROUND, NFL_OPTION_YEARS, NHL_RFA_UNDER_AGE,
  NHL_RFA_UNDER_SEASONS, nbaMaxShare, offerSheetPicks, type BirdTier, type GmSportKey,
} from '@/lib/gmContractRules';

/* ================================================================== */
/* 1. The shape every engine already has, and the host                 */
/* ================================================================== */

/** A player, as all four engines store him. Extra engine fields ride along untouched. */
export interface GmMan {
  id: string;
  name: string;
  pos: string;
  age: number;
  ovr: number;
  years: number;
  salary: number;
  /** NFL: a fully guaranteed deal. frontOfficeCuts reads it. */
  guaranteed?: boolean;
}

export interface GmClub<P extends GmMan = GmMan> {
  players: P[];
  picks: number[];
}

export interface GmContractLeague<P extends GmMan = GmMan> {
  season: number;
  cap: number;
  teams: Record<string, GmClub<P>>;
  freeAgents: P[];
}

/** The three things the desk cannot know without asking the engine. */
export interface GmContractHost<L extends GmContractLeague = GmContractLeague, R = unknown> {
  sport: GmSportKey;
  /** What the engine itself would pay this man on a new deal starting next season. */
  marketSalary(league: L, man: GmMan): number;
  /** The cap his new deal will be priced against. */
  nextCap(league: L): number;
  /** The engine's own offseason, untouched. Whatever it returns is handed back as it is: the desk never reads it. */
  runOffseason(league: L, rng: () => number, team: string): R;
  /** True when the engine already holds him for next season (the NFL tag). */
  held?(league: L, man: GmMan): boolean;
  /** The lowest salary the engine signs anybody for. Defaults to 0.5. */
  minSalary?(league: L): number;
  /**
   * What the engine itself does to a man the moment his deal ends, before he
   * re-signs or walks (the NFL clears his tag and his guarantee). The desk
   * calls it on every man it settles, so a new deal never inherits flags that
   * belonged to the old one.
   */
  endDeal?(man: GmMan): void;
  /** Next season's payroll without this man, the way the engine counts it against its room (the NBA adds dead money and the last tax cheque). Defaults to the sum of salaries. */
  nextPayroll?(league: L, team: string, without: string): number;
  /** The most men a club may carry. A rival with a full roster cannot table an offer sheet. */
  rosterMax?(league: L): number;
}

/* ================================================================== */
/* 2. The ledger: what the desk remembers between seasons              */
/* ================================================================== */

export type ArrivalKind = 'founder' | 'draft' | 'trade' | 'signing';

export interface LedgerMan {
  /** The season the desk first saw him on this roster. */
  since: number;
  how: ArrivalKind;
  /** The round he was drafted in, when this GM drafted him. */
  round?: number;
  /** NFL: the fifth year option has been used on him. */
  optionUsed?: boolean;
  /** His first deal with this club has run out. The fifth year option belonged to that deal and goes with it. */
  firstDealDone?: boolean;
  /** MLB: he has had a qualifying offer, so he can never have another. */
  qualified?: boolean;
  /** He arrived during a season, not before it. No qualifying offer for him that winter. */
  mid?: boolean;
  /** The one push made on him, and the winter it was made in, so a reload is not a second try. */
  push?: { season: number; offer: GmTerms };
}

export type DecisionKind =
  | 'keep' | 'release' | 'walkout' | 'option' | 'tender' | 'qualify-accepted'
  | 'qualify-rejected' | 'match' | 'take-picks';

export interface GmDecision {
  season: number;
  id: string;
  name: string;
  kind: DecisionKind;
  years?: number;
  salary?: number;
  /** Picks owed to the club because he left, by round. */
  picks?: number[];
  /** 'gm' when a person chose it, 'auto' when a policy did. */
  via: 'gm' | 'auto';
}

export interface GmContractLedger {
  v: 1;
  team: string;
  /** The season the desk opened on this save. */
  opened: number;
  men: Record<string, LedgerMan>;
  decisions: GmDecision[];
  /**
   * MLB: every man this club has ever made a qualifying offer to. Kept after
   * he leaves, because the offer is once per man, ever: a man who turned it
   * down, left, and was signed back from the pool can never have another.
   */
  qualifiedIds?: string[];
  /**
   * MLB: the pick a turned down qualifying offer pays, waiting on him. It is
   * paid when he turns up at another club, and dropped if he comes back here
   * or is not seen for LEDGER_SEASONS_KEPT seasons.
   */
  qoOwed?: { id: string; season: number; round: number }[];
}

/** How many seasons of decisions the ledger keeps, so a long save stays small. */
export const LEDGER_SEASONS_KEPT = 6;

export function openLedger(league: GmContractLeague, team: string): GmContractLedger {
  const ledger: GmContractLedger = { v: 1, team, opened: league.season, men: {}, decisions: [] };
  noteRoster(ledger, league);
  return ledger;
}

/**
 * Write down everybody on the roster the desk has not seen, and forget the
 * men who have gone. Call it when a season starts and again when the desk
 * opens. The first call on a fresh ledger makes everybody a founder: the game
 * does not know how long a real player had been with his club, so it does not
 * pretend to. After that a man nobody announced (noteArrival) is a signing.
 * `atDesk` marks a man first seen at the desk as a mid season arrival, which
 * is what rules out a qualifying offer for him.
 */
export function noteRoster(ledger: GmContractLedger, league: GmContractLeague, atDesk = false): void {
  const club = league.teams[ledger.team];
  if (!club) return;
  const founding = Object.keys(ledger.men).length === 0 && league.season === ledger.opened;
  const live = new Set<string>();
  for (const p of club.players) {
    live.add(p.id);
    if (ledger.men[p.id]) continue;
    ledger.men[p.id] = founding
      ? { since: league.season, how: 'founder' }
      : { since: league.season, how: 'signing', ...(atDesk ? { mid: true } : {}) };
  }
  for (const id of Object.keys(ledger.men)) if (!live.has(id)) delete ledger.men[id];
}

/** The board says how a man arrived: the draft (with its round), a trade, or the pool. */
export function noteArrival(
  ledger: GmContractLedger, id: string, season: number, how: Exclude<ArrivalKind, 'founder'>, round?: number, mid = false,
): void {
  ledger.men[id] = {
    since: season, how,
    ...(how === 'draft' && round != null ? { round } : {}),
    ...(mid ? { mid: true } : {}),
  };
}

const ARRIVALS: ArrivalKind[] = ['founder', 'draft', 'trade', 'signing'];
const DECISIONS: DecisionKind[] = [
  'keep', 'release', 'walkout', 'option', 'tender', 'qualify-accepted', 'qualify-rejected', 'match', 'take-picks',
];
/** The decisions that end with him still on the roster. */
const STAYS: ReadonlySet<DecisionKind> = new Set<DecisionKind>(['keep', 'option', 'tender', 'qualify-accepted', 'match']);

const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

/** Fails closed on shape. A ledger that does not pass is thrown away alone: nothing else in the save is touched. */
export function isValidLedger(x: unknown): x is GmContractLedger {
  if (!x || typeof x !== 'object') return false;
  const l = x as Partial<GmContractLedger>;
  if (l.v !== 1 || typeof l.team !== 'string' || !isNum(l.opened)) return false;
  if (!l.men || typeof l.men !== 'object' || Array.isArray(l.men) || !Array.isArray(l.decisions)) return false;
  for (const m of Object.values(l.men)) {
    if (!m || typeof m !== 'object' || !isNum(m.since) || !ARRIVALS.includes(m.how)) return false;
    if (m.round != null && !isNum(m.round)) return false;
    if (m.push != null && (typeof m.push !== 'object' || !isNum(m.push.season) || !m.push.offer || !isNum(m.push.offer.years) || !isNum(m.push.offer.salary))) return false;
  }
  for (const d of l.decisions) {
    if (!d || typeof d !== 'object' || !isNum(d.season) || typeof d.id !== 'string' || typeof d.name !== 'string') return false;
    if (!DECISIONS.includes(d.kind) || (d.via !== 'gm' && d.via !== 'auto')) return false;
    if (STAYS.has(d.kind) && (!isNum(d.years) || !isNum(d.salary) || d.years < 1 || d.salary <= 0)) return false;
    if (d.picks != null && (!Array.isArray(d.picks) || d.picks.some(r => !isNum(r)))) return false;
  }
  if (l.qualifiedIds != null && (!Array.isArray(l.qualifiedIds) || l.qualifiedIds.some(id => typeof id !== 'string'))) return false;
  if (l.qoOwed != null && (!Array.isArray(l.qoOwed) || l.qoOwed.some(o => !o || typeof o.id !== 'string' || !isNum(o.season) || !isNum(o.round)))) return false;
  return true;
}

/** MLB: whether this man has ever had a qualifying offer from this club, on the roster or since gone. */
export function everQualified(ledger: GmContractLedger, id: string): boolean {
  return !!ledger.men[id]?.qualified || !!ledger.qualifiedIds?.includes(id);
}

/** The saved block if it is sound and belongs to this club, a fresh one otherwise. Old saves have none and get a fresh one. */
export function loadLedger(saved: unknown, league: GmContractLeague, team: string): GmContractLedger {
  if (isValidLedger(saved) && saved.team === team) return saved;
  return openLedger(league, team);
}

/* ================================================================== */
/* 3. Who is up, and what each league calls him                        */
/* ================================================================== */

/** The men whose deals run out in the offseason about to happen, the held (tagged) ones aside. */
export function expiringMen<L extends GmContractLeague>(host: GmContractHost<L, unknown>, league: L, team: string): GmMan[] {
  const club = league.teams[team];
  if (!club) return [];
  return club.players.filter(p => p.years <= 1 && !(host.held?.(league, p)));
}

/** Seasons he has played for this club, or null when the game does not know. */
export function seasonsHere(ledger: GmContractLedger, league: GmContractLeague, man: GmMan): number | null {
  const rec = ledger.men[man.id];
  if (!rec || rec.how === 'founder' || rec.how === 'trade') return null;
  /* A draft pick arrives at the end of a season and has played none of it. A
     signing was on the roster for the season the desk first saw him in. */
  return Math.max(0, league.season - rec.since + (rec.how === 'draft' ? 0 : 1));
}

export type ContractClass =
  | 'veteran' | 'fifth-year-option' | 'pre-arbitration' | 'arbitration' | 'free-agent'
  | 'restricted' | 'bird-full' | 'bird-early' | 'bird-non';

/** Which Bird tier he has earned. Unknown tenure reads as full: the benefit of the doubt goes to the club that already has him. */
export function birdTier(ledger: GmContractLedger, league: GmContractLeague, man: GmMan): BirdTier {
  const n = seasonsHere(ledger, league, man);
  if (n == null || n >= NBA_BIRD_SEASONS.full) return 'full';
  if (n >= NBA_BIRD_SEASONS.early) return 'early';
  if (n >= NBA_BIRD_SEASONS.non) return 'non';
  return 'none';
}

export function contractClass(sport: GmSportKey, ledger: GmContractLedger, league: GmContractLeague, man: GmMan): ContractClass {
  const rec = ledger.men[man.id];
  const drafted = rec?.how === 'draft';
  const service = seasonsHere(ledger, league, man);
  if (sport === 'nfl') {
    /* The option is part of a first rounder's rookie deal, so it is offered
       at the end of that deal and never again, whatever happened at it. */
    return drafted && rec?.round === NFL_OPTION_ROUND && !rec.optionUsed && !rec.firstDealDone ? 'fifth-year-option' : 'veteran';
  }
  if (sport === 'nba') {
    const tier = birdTier(ledger, league, man);
    return tier === 'full' ? 'bird-full' : tier === 'early' ? 'bird-early' : tier === 'non' ? 'bird-non' : 'veteran';
  }
  if (sport === 'mlb') {
    if (!drafted || service == null) return 'free-agent';
    if (service < MLB_ARBITRATION_AFTER) return 'pre-arbitration';
    if (service < MLB_FREE_AGENCY_AFTER) return 'arbitration';
    return 'free-agent';
  }
  if (drafted && service != null && man.age < NHL_RFA_UNDER_AGE && service < NHL_RFA_UNDER_SEASONS) return 'restricted';
  return 'veteran';
}

/* ================================================================== */
/* 4. The ask, and how an offer reads against it                       */
/* ================================================================== */

export interface GmTerms {
  years: number;
  /** Per season, in the engine's own unit ($M). */
  salary: number;
}

export interface GmAsk extends GmTerms {
  /** What the engine itself would have paid him, the number the ask is built from. */
  market: number;
}

/** Nobody signs for longer than this at the desk. */
export const DESK_MAX_YEARS = 5;

const round1 = (n: number): number => Math.round(n * 10) / 10;

/**
 * How hard he bargains, off his age. A man in his prime knows what he is
 * worth, a young one wants the security more than the last dollar, and a
 * veteran takes what is there. The same shape as Club Manager's renewal
 * leverage, on this game's ages.
 */
export function askLeverage(age: number): number {
  if (age <= 25) return 1.05;
  if (age <= 29) return 1.12;
  if (age <= 32) return 1;
  return 0.9;
}

/** The length he wants, off his age. */
export function askYears(age: number): number {
  if (age <= 25) return 4;
  if (age <= 29) return 3;
  if (age <= 32) return 2;
  return 1;
}

/**
 * What he asks for. Built from the engine's own price for his rating at his
 * position (so a quarterback and a guard are priced by the game that already
 * prices them), his age, and the cap: nobody asks for more than the league
 * lets a club pay him, which in the NBA is the maximum salary for his tier.
 */
export function askFor<L extends GmContractLeague>(
  host: GmContractHost<L, unknown>, league: L, ledger: GmContractLedger, man: GmMan,
): GmAsk {
  const market = host.marketSalary(league, man);
  const floor = host.minSalary?.(league) ?? 0.5;
  let salary = Math.max(floor, market * askLeverage(man.age));
  if (host.sport === 'nba') salary = Math.min(salary, nbaMaxFor(host, league, ledger, man));
  return { years: askYears(man.age), salary: round1(salary), market: round1(market) };
}

/** The NBA maximum for this man next season. A man the game did not draft is read at the top tier. */
export function nbaMaxFor<L extends GmContractLeague>(
  host: GmContractHost<L, unknown>, league: L, ledger: GmContractLedger, man: GmMan,
): number {
  const rec = ledger.men[man.id];
  const service = rec?.how === 'draft' ? Math.max(0, league.season - rec.since) : Number.POSITIVE_INFINITY;
  return round1(nbaMaxShare(service) * host.nextCap(league));
}

/** Each season away from the length he asked for costs this share of what the offer is worth to him. */
export const YEAR_MISMATCH_COST = 0.03;

/**
 * What an offer is worth to him, in the same unit as his ask. The salary is
 * nearly all of it. Being offered a different length than he asked for costs
 * a little either way (he asked for that length for a reason), capped at two
 * seasons so a short deal can never sink a rich one on its own.
 */
export function offerValue(ask: GmTerms, offer: GmTerms): number {
  const off = Math.min(2, Math.abs(Math.round(offer.years) - ask.years));
  return offer.salary * (1 - YEAR_MISMATCH_COST * off);
}

export interface OfferRead {
  verdict: OfferVerdict;
  /** 0 to 100, the same meter as Club Manager's fee table. */
  closeness: number;
}

/** The shared table's answer to an offer. Nothing here is this file's own arithmetic. */
export function readOffer(ask: GmTerms, offer: GmTerms): OfferRead {
  const value = offerValue(ask, offer);
  return { verdict: offerVerdict(value, ask.salary), closeness: dealCloseness(value, ask.salary) };
}

/** How much of the gap he gives back when a push lands as a counter. Club Manager's seller gives the same 0.40. */
export const DESK_GIVE = 0.4;

export interface PushResult extends OfferRead {
  /** What is on the table after the push: sign this or let him go. Null when he has walked. */
  final: GmTerms | null;
  /** What the push cost in goodwill, straight off the shared table. One push is all there is. */
  cost: number;
  note: string;
}

/**
 * The one push. You name your terms once and he answers once:
 *  - close enough and he signs YOUR terms;
 *  - a fair try and he comes part of the way down, and that is his last word;
 *  - an insult and he goes back to his ask and stays there;
 *  - a number low enough to end it, and he is gone.
 * He never ends up asking for more than he opened on, and never for less than
 * you offered.
 */
export function pushOnce(ask: GmTerms, offer: GmTerms): PushResult {
  const clean: GmTerms = {
    years: Math.max(1, Math.min(DESK_MAX_YEARS, Math.round(offer.years))),
    salary: round1(Math.max(0, offer.salary)),
  };
  const read = readOffer(ask, clean);
  const cost = patienceCost(read.verdict);
  if (read.verdict === 'agreed') {
    return { ...read, cost, final: clean, note: 'His agent says yes. Those are the terms.' };
  }
  if (read.verdict === 'counter') {
    const gap = Math.max(0, ask.salary - clean.salary);
    const salary = Math.min(ask.salary, Math.max(clean.salary, round1(ask.salary - gap * DESK_GIVE)));
    return {
      ...read, cost, final: { years: ask.years, salary },
      note: 'His agent came part of the way down. That is their last word: sign it or let him go.',
    };
  }
  if (read.verdict === 'insulted') {
    return {
      ...read, cost, final: { years: ask.years, salary: ask.salary },
      note: 'His agent did not like that. They are back at the number they opened on and they are not moving.',
    };
  }
  return { ...read, cost, final: null, note: 'His agent ended the call. He will test the market.' };
}

/* ================================================================== */
/* 5. The case file: one expiring man, and what his league allows       */
/* ================================================================== */

export interface DeskCase {
  man: GmMan;
  cls: ContractClass;
  ask: GmAsk;
  /** NBA only: the most the rules let this club pay him, when it has no room for his ask. */
  ceiling?: number;
  /** NBA only: the longest deal his Bird tier allows. */
  maxYears: number;
  /** NBA only: the shortest deal allowed, two seasons when Early Bird rights are what pay him. Absent means one. */
  minYears?: number;
  /** NBA only: his maximum salary. No first year figure may go over it, room or no room. */
  maxSalary?: number;
  /** NFL: pick up the fifth year. One guaranteed season at this figure. */
  option?: GmTerms;
  /** MLB: he is under club control. One season at this figure, and he cannot walk. */
  tender?: GmTerms;
  /** MLB: the qualifying offer, whether he would take it, and the round of the pick owed if he does not. */
  qualifying?: GmTerms & { accepts: boolean; pick: number };
  /** NHL: the qualifying offer that keeps his rights, and the rival sheet if one is on the table. */
  restricted?: { qualifying: GmTerms; sheet: (GmTerms & { picks: number[] }) | null };
  /** False when a rule takes the negotiation off the table (club control, an offer sheet). */
  canNegotiate: boolean;
}

/** The option year's price as a share of his market, by the game's reading of the league's four tiers. */
export const OPTION_TIERS: { minOvr: number; share: number }[] = [
  { minOvr: 88, share: 1 },
  { minOvr: 82, share: 0.9 },
  { minOvr: 75, share: 0.75 },
  { minOvr: 0, share: 0.6 },
];

/** What each arbitration winter pays, as a share of his market. The game's own figures. */
export const ARBITRATION_SHARES = [0.4, 0.6, 0.8];

/** The rounds this game's two round drafts can pay a pick in. */
const PAYABLE_ROUNDS = 2;
/** The round of the extra pick a rejected qualifying offer brings: the first one after round one. */
export const QUALIFYING_PICK_ROUND = 2;

const payroll = (club: GmClub, without?: string): number =>
  club.players.reduce((s, p) => s + (p.id === without ? 0 : p.salary), 0);

/** The shortest deal this case allows. */
export const minYearsOf = (c: DeskCase): number => c.minYears ?? 1;

/** The most the rules let the club pay him in his first year: the Bird ceiling and the maximum salary, whichever is lower. */
export function topSalary(c: DeskCase): number {
  return Math.min(c.ceiling ?? Number.POSITIVE_INFINITY, c.maxSalary ?? Number.POSITIVE_INFINITY);
}

/** A length the case allows, nearest to the one asked for. */
const fitYears = (c: DeskCase, years: number): number =>
  Math.max(minYearsOf(c), Math.min(c.maxYears, Math.round(years)));

/** The mean of the highest salaries in the save: the qualifying offer's figure. */
export function qualifyingOfferValue(league: GmContractLeague): number {
  const all: number[] = [];
  for (const t of Object.values(league.teams)) for (const p of t.players) all.push(p.salary);
  all.sort((a, b) => b - a);
  const top = all.slice(0, MLB_QUALIFYING_OFFER_TOP);
  return top.length ? round1(top.reduce((s, n) => s + n, 0) / top.length) : 0;
}

/**
 * Whether a rival club tables an offer sheet, and for what. Fixed by the
 * player and the season through a hash, never a draw, so reopening the desk
 * cannot reroll it. Better players draw more sheets.
 */
export function offerSheetFor(league: GmContractLeague, man: GmMan, ask: GmAsk, cap: number): (GmTerms & { picks: number[] }) | null {
  const h = hash32(`${man.id}:${league.season}:sheet`);
  const chance = man.ovr >= 84 ? 0.5 : man.ovr >= 78 ? 0.3 : 0.1;
  if ((h % 1000) / 1000 >= chance) return null;
  const premium = 1.05 + 0.2 * (((h >>> 10) % 1000) / 1000);
  const salary = round1(ask.salary * premium);
  const picks = offerSheetPicks(salary, cap).filter(r => r <= PAYABLE_ROUNDS);
  return { years: Math.min(DESK_MAX_YEARS, ask.years + 1), salary, picks };
}

export function deskCase<L extends GmContractLeague>(
  host: GmContractHost<L, unknown>, league: L, ledger: GmContractLedger, man: GmMan,
): DeskCase {
  const cls = contractClass(host.sport, ledger, league, man);
  const ask = askFor(host, league, ledger, man);
  const out: DeskCase = { man, cls, ask, maxYears: DESK_MAX_YEARS, canNegotiate: true };
  const floor = host.minSalary?.(league) ?? 0.5;

  if (cls === 'fifth-year-option') {
    const tier = OPTION_TIERS.find(t => man.ovr >= t.minOvr) ?? OPTION_TIERS[OPTION_TIERS.length - 1];
    out.option = { years: NFL_OPTION_YEARS, salary: round1(Math.max(man.salary, ask.market * tier.share)) };
  }

  if (host.sport === 'nba') {
    const club = league.teams[ledger.team];
    const used = host.nextPayroll ? host.nextPayroll(league, ledger.team, man.id) : (club ? payroll(club, man.id) : 0);
    const room = host.nextCap(league) - used;
    const max = nbaMaxFor(host, league, ledger, man);
    out.maxSalary = max;
    /* Only full Bird rights buy a fifth season, room or no room. */
    if (cls === 'bird-early') out.maxYears = NBA_EARLY_BIRD_MAX_YEARS;
    if (cls === 'bird-full') out.maxYears = NBA_BIRD_MAX_YEARS;
    if (cls === 'bird-non' || cls === 'veteran') out.maxYears = NBA_NON_BIRD_MAX_YEARS;
    if (ask.salary > room) {
      /* No room for his ask, so the Bird exception is the only way to pay him. */
      let limit = max;
      if (cls === 'bird-early') {
        const all = Object.values(league.teams).flatMap(t => t.players);
        const average = all.length ? all.reduce((s, p) => s + p.salary, 0) / all.length : 0;
        limit = Math.min(max, Math.max(man.salary * NBA_EARLY_BIRD_RAISE, average * NBA_EARLY_BIRD_AVERAGE));
      } else if (cls === 'bird-non') {
        limit = Math.min(max, man.salary * NBA_NON_BIRD_RAISE);
      } else if (cls === 'veteran') {
        limit = 0;
      }
      /* Whatever room there is can always be used, rights or no rights. */
      out.ceiling = round1(Math.max(limit, room, floor));
      /* An Early Bird deal runs at least two seasons. With room for him the
         club does not need the exception, so the minimum does not apply. */
      if (cls === 'bird-early' && limit > room) out.minYears = NBA_EARLY_BIRD_MIN_YEARS;
    }
  }

  if (cls === 'pre-arbitration' || cls === 'arbitration') {
    const service = seasonsHere(ledger, league, man) ?? 0;
    const step = Math.min(ARBITRATION_SHARES.length - 1, Math.max(0, service - MLB_ARBITRATION_AFTER));
    const salary = cls === 'pre-arbitration' ? Math.max(floor, man.salary) : Math.max(man.salary, ask.market * ARBITRATION_SHARES[step]);
    out.tender = { years: 1, salary: round1(salary) };
    out.canNegotiate = false;
  }

  if (host.sport === 'mlb' && cls === 'free-agent') {
    const rec = ledger.men[man.id];
    /* Only a man who spent the whole season here and has never had the offer. */
    if (rec && !everQualified(ledger, man.id) && !rec.mid) {
      const salary = qualifyingOfferValue(league);
      if (salary > 0) {
        out.qualifying = {
          years: MLB_QUALIFYING_OFFER_YEARS, salary,
          accepts: salary >= ask.salary * AGREE_RATIO, pick: QUALIFYING_PICK_ROUND,
        };
      }
    }
  }

  if (cls === 'restricted') {
    /* A rival with no roster spot cannot sign him, so with none open there is no sheet. */
    const sheet = sheetClubFor(host, league, ledger.team, man.id) ? offerSheetFor(league, man, ask, host.nextCap(league)) : null;
    out.restricted = { qualifying: { years: 1, salary: round1(Math.max(floor, man.salary)) }, sheet };
    /* With a sheet on the table the only choices are to match it or take the picks. */
    if (sheet) out.canNegotiate = false;
  }
  return out;
}

/** Every case on the desk this winter, best player first. */
export function deskCases<L extends GmContractLeague>(host: GmContractHost<L, unknown>, league: L, ledger: GmContractLedger): DeskCase[] {
  return expiringMen(host, league, ledger.team)
    .map(m => deskCase(host, league, ledger, m))
    .sort((a, b) => b.man.ovr - a.man.ovr);
}

/* ================================================================== */
/* 6. Decisions: the only ways anything gets written down              */
/* ================================================================== */

export type Made = { ok: true; decision: GmDecision } | { ok: false; reason: string };

export function decisionFor(ledger: GmContractLedger, season: number, id: string): GmDecision | undefined {
  return ledger.decisions.find(d => d.season === season && d.id === id);
}

function record(
  ledger: GmContractLedger, league: GmContractLeague, c: DeskCase, kind: DecisionKind, via: 'gm' | 'auto',
  terms?: GmTerms, picks?: number[],
): Made {
  /* A walkout is final: his agent ended the call, so nothing signs him after it. */
  const before = decisionFor(ledger, league.season, c.man.id);
  if (before?.kind === 'walkout' && kind !== 'walkout') return { ok: false, reason: 'He has already gone.' };
  const decision: GmDecision = {
    season: league.season, id: c.man.id, name: c.man.name, kind, via,
    ...(terms ? { years: terms.years, salary: terms.salary } : {}),
    ...(picks && picks.length ? { picks } : {}),
  };
  ledger.decisions = ledger.decisions.filter(d => !(d.season === league.season && d.id === c.man.id));
  ledger.decisions.push(decision);
  return { ok: true, decision };
}

const overCeiling = (c: DeskCase, salary: number): boolean => c.ceiling != null && salary > c.ceiling;

/** Pay him what he asked for. */
export function keepAtAsk(ledger: GmContractLedger, league: GmContractLeague, c: DeskCase, via: 'gm' | 'auto' = 'gm'): Made {
  if (!c.canNegotiate) return { ok: false, reason: 'There is no negotiation to have with him this winter.' };
  if (overCeiling(c, c.ask.salary)) {
    return { ok: false, reason: `The rules cap what you can pay him at ${c.ceiling}M and he wants ${c.ask.salary}M.` };
  }
  return record(ledger, league, c, 'keep', via, { years: fitYears(c, c.ask.years), salary: c.ask.salary });
}

/**
 * The one push, remembered. A second call the same winter hands back the
 * first answer, so closing the desk and reopening it is not a second try.
 * An agreed push signs him on the spot and a walkout loses him on the spot.
 */
export function pushFor(
  ledger: GmContractLedger, league: GmContractLeague, c: DeskCase, offer: GmTerms, via: 'gm' | 'auto' = 'gm',
): PushResult | null {
  if (!c.canNegotiate) return null;
  const rec = ledger.men[c.man.id];
  if (!rec) return null;
  if (rec.push && rec.push.season === league.season) return pushOnce(c.ask, rec.push.offer);
  /* A man already settled this winter is not pushed: a push that ended in a
     walkout would quietly undo the decision. */
  if (decisionFor(ledger, league.season, c.man.id)) return null;
  /* Nothing over what the rules let the club pay him can be offered, so a
     push can never agree a figure the club is not allowed to sign. */
  const salary = Math.min(offer.salary, topSalary(c));
  rec.push = {
    season: league.season,
    offer: { years: fitYears(c, offer.years), salary: round1(Math.max(0, salary)) },
  };
  const res = pushOnce(c.ask, rec.push.offer);
  if (res.verdict === 'agreed' && res.final) record(ledger, league, c, 'keep', via, res.final);
  if (res.verdict === 'walkout') record(ledger, league, c, 'walkout', via);
  return res;
}

/** Sign what was left on the table after the push. */
export function acceptFinal(ledger: GmContractLedger, league: GmContractLeague, c: DeskCase, via: 'gm' | 'auto' = 'gm'): Made {
  const push = ledger.men[c.man.id]?.push;
  if (!push || push.season !== league.season) return { ok: false, reason: 'Nothing has been offered yet.' };
  const res = pushOnce(c.ask, push.offer);
  if (!res.final) return { ok: false, reason: 'He has already gone.' };
  if (overCeiling(c, res.final.salary)) {
    return { ok: false, reason: `The rules cap what you can pay him at ${c.ceiling}M and his last word was ${res.final.salary}M.` };
  }
  return record(ledger, league, c, 'keep', via, { years: fitYears(c, res.final.years), salary: res.final.salary });
}

/**
 * Let him go. Always allowed. His deal ran out, so there is no dead money.
 * With a rival sheet on the table, not matching it IS letting him go, and the
 * ladder pays for him, so it is recorded as taking the picks.
 */
export function letGo(ledger: GmContractLedger, league: GmContractLeague, c: DeskCase, via: 'gm' | 'auto' = 'gm'): Made {
  if (c.restricted?.sheet) return takePicks(ledger, league, c, via);
  return record(ledger, league, c, 'release', via);
}

/** NFL: pick up the fifth year. */
export function useOption(ledger: GmContractLedger, league: GmContractLeague, c: DeskCase, via: 'gm' | 'auto' = 'gm'): Made {
  if (!c.option) return { ok: false, reason: 'His deal carries no option.' };
  return record(ledger, league, c, 'option', via, c.option);
}

/** MLB: tender a man under club control. NHL: the qualifying offer that keeps a restricted man with no sheet on him. */
export function tenderHim(ledger: GmContractLedger, league: GmContractLeague, c: DeskCase, via: 'gm' | 'auto' = 'gm'): Made {
  if (c.tender) return record(ledger, league, c, 'tender', via, c.tender);
  if (c.restricted && !c.restricted.sheet) return record(ledger, league, c, 'tender', via, c.restricted.qualifying);
  return { ok: false, reason: c.restricted ? 'A rival sheet is on the table. Match it or take the picks.' : 'He is not under club control.' };
}

/** MLB: make the qualifying offer. He takes it, or he goes, and the club is owed a pick once another club signs him. One per man, ever. */
export function qualify(ledger: GmContractLedger, league: GmContractLeague, c: DeskCase, via: 'gm' | 'auto' = 'gm'): Made {
  const q = c.qualifying;
  const rec = ledger.men[c.man.id];
  if (!q || !rec || everQualified(ledger, c.man.id)) return { ok: false, reason: 'He cannot be given a qualifying offer.' };
  if (decisionFor(ledger, league.season, c.man.id)?.kind === 'walkout') return { ok: false, reason: 'He has already gone.' };
  rec.qualified = true;
  ledger.qualifiedIds = [...(ledger.qualifiedIds ?? []), c.man.id];
  if (q.accepts) return record(ledger, league, c, 'qualify-accepted', via, { years: q.years, salary: q.salary });
  return record(ledger, league, c, 'qualify-rejected', via, undefined, [q.pick]);
}

/** NHL: match the rival sheet and keep him on its terms. */
export function matchSheet(ledger: GmContractLedger, league: GmContractLeague, c: DeskCase, via: 'gm' | 'auto' = 'gm'): Made {
  const sheet = c.restricted?.sheet;
  if (!sheet) return { ok: false, reason: 'There is no offer sheet to match.' };
  return record(ledger, league, c, 'match', via, { years: sheet.years, salary: sheet.salary });
}

/** NHL: let the sheet stand and take the picks the ladder pays. */
export function takePicks(ledger: GmContractLedger, league: GmContractLeague, c: DeskCase, via: 'gm' | 'auto' = 'gm'): Made {
  const sheet = c.restricted?.sheet;
  if (!sheet) return { ok: false, reason: 'There is no offer sheet on the table.' };
  /* The sheet's terms go down with it: he joins the club that tabled it on them. */
  return record(ledger, league, c, 'take-picks', via, { years: sheet.years, salary: sheet.salary }, sheet.picks);
}

/** The men still waiting on a decision this winter. */
export function undecided<L extends GmContractLeague>(host: GmContractHost<L, unknown>, league: L, ledger: GmContractLedger): GmMan[] {
  return expiringMen(host, league, ledger.team).filter(m => !decisionFor(ledger, league.season, m.id));
}

/**
 * A plain policy for every man still waiting, for a board that has no desk on
 * screen yet and for the harness. It is a policy, not a draw: the same roster
 * always gets the same answers, and every answer is written down as 'auto'.
 */
export function autoDecide<L extends GmContractLeague>(host: GmContractHost<L, unknown>, league: L, ledger: GmContractLedger): GmDecision[] {
  noteRoster(ledger, league, true);
  const made: GmDecision[] = [];
  const take = (m: Made): boolean => { if (m.ok) made.push(m.decision); return m.ok; };
  for (const man of undecided(host, league, ledger)) {
    const c = deskCase(host, league, ledger, man);
    if (c.option && man.ovr >= 72 && take(useOption(ledger, league, c, 'auto'))) continue;
    if (c.tender) { take(man.ovr >= 66 ? tenderHim(ledger, league, c, 'auto') : letGo(ledger, league, c, 'auto')); continue; }
    if (c.restricted) {
      const sheet = c.restricted.sheet;
      if (!sheet) take(tenderHim(ledger, league, c, 'auto'));
      else take(man.ovr >= 74 && sheet.salary <= c.ask.market * 1.3 ? matchSheet(ledger, league, c, 'auto') : takePicks(ledger, league, c, 'auto'));
      continue;
    }
    if (c.qualifying && man.ovr >= 78 && take(qualify(ledger, league, c, 'auto'))) continue;
    if (man.ovr >= 74) {
      if (take(keepAtAsk(ledger, league, c, 'auto'))) continue;
      /* The rules cap him under his ask: offer the cap, and sign whatever comes back if it is allowed. */
      const res = c.ceiling != null ? pushFor(ledger, league, c, { years: c.ask.years, salary: c.ceiling }, 'auto') : null;
      const after = decisionFor(ledger, league.season, man.id);
      if (after) { made.push(after); continue; }
      if (res && res.final && take(acceptFinal(ledger, league, c, 'auto'))) continue;
    }
    take(letGo(ledger, league, c, 'auto'));
  }
  return made;
}

/* ================================================================== */
/* 7. The offseason, with the desk in front of it                      */
/* ================================================================== */

export type DeskRun<R = unknown> =
  | { ok: false; undecided: { id: string; name: string }[] }
  | {
    ok: true;
    /** What the engine's own offseason returned, untouched. */
    engine: R;
    /** Every decision that was applied, in roster order. */
    applied: GmDecision[];
    /** Picks added to the club for the next draft, by round. */
    picksAdded: number[];
    /** Round 987: each offer sheet that was paid, with the club that tabled it,
        so a bind with a pick ledger can take those picks off that club. */
    sheets?: { id: string; club: string; picks: number[] }[];
  };

/**
 * Put the agreed deal on his line, plus the season the engine's offseason is
 * about to take off it. His old deal ends first, exactly as the engine ends
 * one (host.endDeal), so a tag or a guarantee from the old deal never rides
 * onto the new one. Only the option year is guaranteed, and it says so.
 */
function holdMan<L extends GmContractLeague>(host: GmContractHost<L, unknown>, man: GmMan, d: GmDecision, ledger: GmContractLedger): void {
  host.endDeal?.(man);
  man.years = (d.years ?? 1) + 1;
  man.salary = d.salary ?? man.salary;
  const rec = ledger.men[man.id];
  if (rec) rec.firstDealDone = true;
  if (d.kind === 'option') {
    man.guaranteed = true;
    if (rec) rec.optionUsed = true;
  }
}

/** The club that tabled the sheet: fixed by the player and the season, among clubs with a roster spot. */
export function sheetClubFor<L extends GmContractLeague>(host: GmContractHost<L, unknown>, league: L, team: string, id: string): string | null {
  const max = host.rosterMax?.(league) ?? Number.POSITIVE_INFINITY;
  const open = Object.keys(league.teams).filter(k => k !== team && league.teams[k].players.length < max).sort();
  if (!open.length) return null;
  return open[hash32(`${id}:${league.season}:sheet-club`) % open.length];
}

/**
 * Run the engine's offseason with every expiring man of the GM's already
 * settled, so not one of them reaches the engine's coin flip.
 *
 * FAILS CLOSED: with anybody undecided it runs nothing and says who.
 */
export function runDeskOffseason<L extends GmContractLeague, R>(
  host: GmContractHost<L, R>, league: L, ledger: GmContractLedger, rng: () => number,
): DeskRun<R> {
  const club = league.teams[ledger.team];
  if (!club) return { ok: false, undecided: [] };
  const season = league.season;
  const up = expiringMen(host, league, ledger.team);
  const waiting = up.filter(m => !decisionFor(ledger, season, m.id));
  if (waiting.length) return { ok: false, undecided: waiting.map(m => ({ id: m.id, name: m.name })) };

  const applied: GmDecision[] = [];
  const owed: number[] = [];
  const sheets: { id: string; club: string; picks: number[] }[] = [];
  /* MLB: a pick waiting on a man who turned down the qualifying offer is paid
     once he has turned up at another club, and dropped if he came back here. */
  if (ledger.qoOwed?.length) {
    const clubOf = (id: string): string | null => {
      for (const [k, t] of Object.entries(league.teams)) if (t.players.some(p => p.id === id)) return k;
      return null;
    };
    ledger.qoOwed = ledger.qoOwed.filter(o => {
      const where = clubOf(o.id);
      if (where === ledger.team) return false;
      if (where) { owed.push(o.round); return false; }
      return o.season > season - LEDGER_SEASONS_KEPT;
    });
  }
  for (const man of up) {
    const d = decisionFor(ledger, season, man.id);
    if (!d) continue;
    applied.push(d);
    if (STAYS.has(d.kind)) holdMan(host, man, d, ledger);
    else {
      /* What the engine does with a man who walks: his deal ends, he is
         priced at what the engine would pay him now, and he goes into the
         pool on a one year line. No dead money, his deal ran out. Leaving
         his old figure on him would let the club sign a star straight back
         at his rookie price. */
      club.players = club.players.filter(p => p.id !== man.id);
      host.endDeal?.(man);
      const sheetClub = d.kind === 'take-picks' && d.years != null && d.salary != null
        ? sheetClubFor(host, league, ledger.team, man.id) : null;
      if (sheetClub) {
        /* He signed the rival's sheet, so he goes to that club on its terms. */
        league.teams[sheetClub].players.push({ ...man, years: (d.years ?? 1) + 1, salary: d.salary ?? man.salary });
        /* The ladder pays only when he has really gone to the club that tabled it. */
        if (d.picks) { owed.push(...d.picks); sheets.push({ id: man.id, club: sheetClub, picks: [...d.picks] }); }
      } else {
        league.freeAgents.push({ ...man, years: 1, salary: host.marketSalary(league, man) });
      }
      /* A turned down qualifying offer pays when another club signs him, not
         when he walks into the pool, so signing him straight back pays nothing. */
      if (d.kind === 'qualify-rejected' && d.picks) {
        ledger.qoOwed = [...(ledger.qoOwed ?? []), ...d.picks.map(round => ({ id: man.id, season, round }))];
      }
    }
  }

  const engine = host.runOffseason(league, rng, ledger.team);

  /* Every engine resets a club's picks inside its offseason, so picks owed to
     the club go on afterwards or they would be wiped. */
  const after = league.teams[ledger.team];
  if (after && owed.length) after.picks.push(...owed);

  /* The new season's roster, and only the last few winters of decisions.
     Everybody on it now is here from the first day of the season, so a man
     who arrived mid season last year can have a qualifying offer next winter. */
  noteRoster(ledger, league);
  for (const rec of Object.values(ledger.men)) delete rec.mid;
  ledger.decisions = ledger.decisions.filter(d => d.season > league.season - LEDGER_SEASONS_KEPT);
  return { ok: true, engine, applied, picksAdded: owed, sheets };
}
