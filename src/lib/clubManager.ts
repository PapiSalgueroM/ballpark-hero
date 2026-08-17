import { foldSpecialLatin } from '@/lib/nameFold';
import type { Player, Position } from '@/types/game';
import { FORMATIONS, playerRating } from '@/lib/squadDeal';
import type { Formation, FormationSlot } from '@/lib/squadDeal';
import { players as RAW_POOL } from '@/data/players';
// Round 70: real 2026 rosters for every club in the big five leagues, baked
// from the Transfermarkt style market value data in Supabase. The bake file
// imports nothing but types, so reading it at module scope is safe.
import { CM_ROSTERS, CM_ROSTER_META, CM_PARTIAL } from '@/data/clubManagerRosters';
import type { BakedPlayer } from '@/data/clubManagerRosters';
// Round 132: the world clock. Everything about ageing, retirement, eras and
// the projected future world lives in clubManagerEras, which imports nothing
// from this file, so there is no cycle.
import {
  CM_BASE_YEAR, CM_ERAS, DEFAULT_ERA_ID, eraById, seasonLabel,
  projectedRoster, projectedWorld, projectedXIAvg,
  ageDriftBand, declineScale, retireChance,
} from '@/lib/clubManagerEras';
import type { ProjectedPlayer, CMEra } from '@/lib/clubManagerEras';

/**
 * Club Manager engine.
 *
 * Pure, JSON-serializable state machine consumed by useClubManager (which owns
 * React state + localStorage persistence) and the club-manager components.
 * Everything in CareerState must survive JSON.stringify/parse round trips -
 * no Dates, Maps, Sets, functions or class instances.
 *
 * Formations + the market-value -> rating curve are shared with Squad Deal
 * (see src/lib/squadDeal.ts) so the two games agree on how good a player is.
 */

/* ================================================================== */
/* Types                                                              */
/* ================================================================== */

export type Mentality = 'defensive' | 'balanced' | 'attacking';
export type FormResult = 'W' | 'D' | 'L';
export type Competition = 'league' | 'cup' | 'uclGroup' | 'uclKo';
export type CupRound = 'R16' | 'QF' | 'SF' | 'F';
export type CupState = CupRound | 'out' | 'won';
export type UclKoRound = 'QF' | 'SF' | 'F';
export type UclKoState = UclKoRound | 'out' | 'won' | null;

export { FORMATIONS };
export type { Formation, FormationSlot };
export { CM_ROSTER_META, CM_ROSTERS, CM_PARTIAL };
export { CM_BASE_YEAR, CM_ERAS, DEFAULT_ERA_ID, eraById, seasonLabel, projectedRoster, projectedXIAvg };
export type { ProjectedPlayer, CMEra };

/**
 * Round 94: what you have told the world about a player.
 *  - listed:     up for sale, so clubs actually come in, but they know you
 *                want him gone and they bid accordingly.
 *  - loanListed: available on loan, he leaves for the season and comes back
 *                developed.
 *  - blocked:    not for sale at any price. No bid ever lands.
 * Undefined means the normal state: nobody knows anything, so only a
 * speculative bid for a genuine star will ever arrive.
 */
export type TransferStatus = 'listed' | 'loanListed' | 'blocked';

/**
 * Round 102: one tie in the domestic cup bracket. Sixteen clubs from the
 * WHOLE country, so in England the Championship is in it and a second tier
 * side can knock a giant out, which is the entire point of a cup.
 */
export interface CupTie {
  round: CupRound;
  slot: number;
  home: string;
  away: string;
  homeGoals: number | null;
  awayGoals: number | null;
  winner: string | null;
  mine: boolean;
  /** Level after 90, settled on penalties. */
  pens?: boolean;
  /** A club from a lower division put a bigger one out. */
  upset?: boolean;
}

/** Round 95: one of my players out on loan, home at the end of the season. */
export interface LoanOut {
  player: CMPlayer;
  /** Where he is playing. */
  club: string;
  /** Loan fee banked when he left. */
  fee: number;
  season: number;
}

export interface CMPlayer {
  id: string;
  name: string;
  position: Position;
  rating: number;
  age: number;
  /** 0-100, drops when the player starts, recovers on weeks off. */
  fitness: number;
  /** 0-100, swings with results. */
  morale: number;
  /** Weeks (calendar entries) remaining out injured. */
  injuryWeeks: number;
  /** Matches of ours remaining suspended. */
  suspendedMatches: number;
  isYouth: boolean;
  seasonGoals: number;
  seasonAssists: number;
  /** Real market value in £m (Round 70, baked data). Youth pads have none. */
  value?: number;
  /** Round 71: loan signings go home at the end of the season. */
  onLoan?: boolean;
  /** Round 94: how this player is being handled in the market. */
  transferStatus?: TransferStatus;
  /** Round 105: seasons left on his deal. Hits zero and he walks for nothing. */
  contractYears?: number;
  /** Round 105: what he costs you every week, in thousands. */
  wage?: number;
  /** Round 73: full per-season stat line. */
  apps?: number;
  seasonYellows?: number;
  seasonReds?: number;
  /** Clean sheets, tracked for keepers and defenders. */
  cleanSheets?: number;
  /** Sum of match ratings; average = ratingSum / apps. */
  ratingSum?: number;
  /**
   * Round 116: the ceiling. Growth can never take a player past this, and how
   * fast he closes the gap is what training and game time decide. Undefined on
   * a save made before this existed, and repaired by ensureAcademy.
   */
  potential?: number;
  /** Round 116: he came through your academy or your scouting network. */
  academyGrad?: boolean;
  /**
   * Round 127: what you have told him he is. Undefined on a save made before
   * this existed, and handed out by ensureRoles.
   */
  role?: SquadRole;
  /**
   * Round 127: one entry for each of the last ten matches he was FIT for. A 1
   * means he was involved, a 0 means he watched it. Newest last. Matches he
   * was injured, banned or out on loan for never go in, because a player does
   * not sulk about a game he could not have played in.
   */
  lastTen?: number[];
  /** Round 127: he has asked to leave, and the papers know about it. */
  wantsOut?: boolean;
  /**
   * Round 132: this game made him up. Real footballers from the August 2026
   * data never carry this. Every screen that shows a name reads it, because
   * the player is owed a straight answer about which of these people exist.
   */
  generated?: boolean;
}

/* ---------- Round 127: squad roles and playing time promises ---------- */

/**
 * The rung you have put a player on.
 *
 * The full ladder a management sim usually runs is seven or eight rungs long.
 * This one is cut to five so it fits on a phone. The reason any of it exists is
 * simple: playing time is the thing a player's happiness actually rests on.
 * Give a man the minutes he was promised and he is content; take them away and
 * you will hear about it, from him and eventually from the rest of the dressing
 * room. The same question gets asked again at the contract table, which is why
 * a role here is a promise and not just a label.
 *
 * Names here are the words a manager would actually use in a press room, not
 * config keys with a label bolted on.
 */
export type SquadRole = 'star' | 'key' | 'rotation' | 'backup' | 'prospect';

export interface RoleDef {
  id: SquadRole;
  label: string;
  emoji: string;
  /** What he was told, in one line. */
  promise: string;
  /**
   * The share of the matches he is FIT for that he expects to be involved in.
   *
   * These are measured, not invented. Round 127 ran thirty full seasons across
   * five clubs and logged, for every squad rank, the share of the matches he
   * was available for that he actually played: the top five ranks played 100
   * percent of them, ranks six to eight came out between 62 and 81 percent,
   * ranks nine to fifteen landed between 20 and 60 percent depending on where
   * they play, and everyone from sixteen down sat on 1 to 20 percent. So the
   * default ladder handed to a squad on day one is honest about that squad,
   * and nobody starts a save already furious. That is the Round 105 lesson:
   * anchor a new number on the squad you were handed, not on a number that
   * happens to be nearby.
   */
  share: number;
}

export const ROLE_LADDER: SquadRole[] = ['star', 'key', 'rotation', 'backup', 'prospect'];

export const ROLE_INFO: Record<SquadRole, RoleDef> = {
  star: {
    id: 'star',
    label: 'Star man',
    emoji: '⭐',
    promise: 'First name on the teamsheet. He plays unless he cannot walk.',
    share: 0.88,
  },
  key: {
    id: 'key',
    label: 'Key first teamer',
    emoji: '\u{1F525}',
    promise: 'In the side most weeks. He will take the odd rest, not a spell out.',
    share: 0.74,
  },
  rotation: {
    id: 'rotation',
    label: 'Rotation option',
    emoji: '\u{1F504}',
    promise: 'In and out depending on the week. He knows the score.',
    share: 0.32,
  },
  backup: {
    id: 'backup',
    label: 'Backup',
    emoji: '\u{1F9E5}',
    promise: 'Cover. A few starts, cup nights, and he is fine with that.',
    share: 0.12,
  },
  prospect: {
    id: 'prospect',
    label: 'One for the future',
    emoji: '\u{1F331}',
    promise: 'Learning his trade. Minutes when they come, no promises made.',
    share: 0.05,
  },
};

/** Round 73: one line in the season's fixture and result log. */
export interface ResultLogEntry {
  week: number;
  comp: string;
  opp: string;
  home: boolean | null;
  score: string;
  res: FormResult;
}

export type MessageEffect = 'promise' | 'refuse' | 'listen' | 'fine' | 'support' | 'laugh' | 'setRole';

/** Round 73: players slide into your DMs. */
export interface PlayerMessage {
  id: string;
  playerName: string;
  playerId: string;
  kind: 'startMe' | 'wantMove' | 'drama' | 'praise' | 'roleTalk';
  text: string;
  options: { label: string; effect: MessageEffect }[];
  week: number;
  /** Set once answered (or auto-resolved): the outcome line shown in the UI. */
  resolved?: string;
  /** Round 127: the rung the setRole option would move him to. */
  roleOffer?: SquadRole;
}

/* ---------- Round 116: the academy, the scouts and the training ground ---------- */

/**
 * A scout, either sitting in the office waiting to be sent somewhere (a
 * candidate, regionId empty) or out on a trip.
 *
 * Two numbers matter, and they are the two any scouting system rests on:
 * network is how likely he is to turn anyone up at all, judgement is how close
 * his read on a kid is to the truth. A cheap scout finds nobody and lies about
 * the ones he does find.
 */
export interface Scout {
  id: string;
  name: string;
  /** 1 to 5. How tight the band he reports is around the real ceiling. */
  judgement: number;
  /** 1 to 5. How often he finds anybody worth a look. */
  network: number;
  /** What sending him costs, in millions. */
  fee: number;
  /** Empty while he is a candidate. */
  regionId: string;
  regionName: string;
  regionFlag: string;
  weeksLeft: number;
  found: number;
}

/** A kid on the books but not in the squad, from the academy or from a scout. */
export interface Prospect {
  id: string;
  name: string;
  position: Position;
  age: number;
  rating: number;
  /** The truth. Never shown, only the band around it is. */
  potential: number;
  /** What the report reckons his ceiling is. */
  lowGuess: number;
  highGuess: number;
  /** 'Academy' or the country the scout was in. */
  source: string;
  flag: string;
  /** Signing fee in millions. The academy's own kids are free. */
  fee: number;
  season: number;
}

export type FacilityKind = 'recruitment' | 'coaching' | 'facilities';

/** The club's youth setup. Everything here is upgradable and everything bites. */
export interface Academy {
  /** 1 to 20. How good the club is at getting the best juniors in the door. */
  recruitment: number;
  /** 1 to 20. Coaching quality, which drives development for the WHOLE squad. */
  coaching: number;
  /** 1 to 20. The training ground itself. */
  facilities: number;
  scouts: Scout[];
  candidates: Scout[];
  prospects: Prospect[];
  /** The season the last intake landed, so it only ever runs once a year. */
  lastIntakeSeason: number;
  /** The head of youth's read on what is coming, shown before intake day. */
  preview?: string;
}

export type TrainingIntensity = 'light' | 'normal' | 'double';
export type TrainingFocus = 'firstTeam' | 'balanced' | 'youth';

/** The week's work on the training ground. */
export interface TrainingPlan {
  intensity: TrainingIntensity;
  focus: TrainingFocus;
}

/** Round 70: one board demand for the season. Round 140: more of them. */
export interface BoardObjective {
  id: 'league' | 'cup' | 'ucl' | 'rival' | 'goals' | 'defence' | 'youth' | 'points' | 'double' | 'netSpend';
  /** What the board wants, e.g. "Qualify for the Europa League (top 5)". */
  label: string;
  /** League position / cup stage rank / goal count the objective needs. */
  target: number;
  /** Rival club name, only on the rival objective. */
  rivalName?: string;
}

export type ObjectiveStatus = 'onTrack' | 'behind' | 'done' | 'failed';

export interface TableRow {
  club: string;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  pts: number;
}

export interface ClubDef {
  name: string;
  tier: 1 | 2 | 3 | 4;
  color: string;
  /** Starting transfer budget in £m. */
  budget: number;
  /** Board's expected league finish ("Top N"). */
  expectation: number;
}

export interface TierInfo { label: string; emoji: string; blurb: string; }

export interface MentalityDef { id: Mentality; label: string; emoji: string; desc: string; }

export interface MarketPlayer {
  name: string;
  club: string;
  position: Position;
  age: number;
  rating: number;
  /** Asking price in £m. */
  price: number;
  /** Real market value in £m (Round 70, baked data). */
  value?: number;
  /** Round 132: this game made him up, and the transfer screen says so. */
  generated?: boolean;
}

export interface TransferRecord { dir: 'in' | 'out'; name: string; fee: number; loan?: boolean; }

/* ---------- Round 71: the transfer market grows a brain ---------- */

/** One live fee negotiation with a selling club. */
export interface Negotiation {
  /** Snapshot of the target so the deal survives market rebuilds. */
  player: MarketPlayer;
  /** Haggle rounds used so far. */
  stage: number;
  /** Seller patience left; hits 0 and the deal collapses. */
  patience: number;
  myOffer: number | null;
  theirAsk: number;
  status: 'open' | 'agreed' | 'collapsed' | 'hijacked';
  /** A rival club drives the price up mid-deal. */
  rivalBidder: string | null;
  rivalOffer: number | null;
  /** The seller's last response, shown in the UI. */
  note: string;
}

/** An AI club bidding for one of MY players while the window is open. */
export interface IncomingBid {
  playerId: string;
  playerName: string;
  club: string;
  offer: number;
  /** 'improved' means they came back once with a higher number. */
  status: 'open' | 'improved';
  /** Round 94: a season-long loan approach rather than a permanent bid. */
  loan?: boolean;
  /** Round 94: a second club in the race, which is what pushed the fee up. */
  rival?: string;
  /** Round 94: they came because you listed him, not out of the blue. */
  fromListing?: boolean;
}

/** A line in the Latest Transfers feed. */
export interface TransferNews {
  name: string;
  from: string;
  to: string;
  fee: number;
  loan?: boolean;
  season: number;
  week: number;
}

export interface Trophy { name: string; emoji: string; season: number; }

export interface ScorerLine { name: string; minute: number; }

export interface OtherResult { home: string; away: string; hg: number; ag: number; }

export interface MatchWeekReport {
  competition: Competition;
  compLabel: string;
  home: string;
  away: string;
  homeGoals: number;
  awayGoals: number;
  won: boolean;
  drawn: boolean;
  decidedBy: 'regular' | 'pens';
  myScorers: ScorerLine[];
  oppScorers: ScorerLine[];
  events: string[];
  trophyWon: string | null;
  myPosition: number;
  confidence: number;
  confidenceDelta: number;
  otherResults: OtherResult[];
}

export interface CalendarEntry {
  type: Competition | 'window';
  /** League round index 0-37, or UCL group matchday index 0-5. 0 otherwise. */
  round: number;
  cupRound?: CupRound;
  uclRound?: UclKoRound;
}

export interface UclGroupState {
  /** The 3 other clubs in my group. */
  opponents: string[];
  table: TableRow[];
  /** Group matchdays already played (0-6). */
  matchday: number;
}

/**
 * Round 95: one other league, simulated week by week alongside mine so the
 * world outside my dugout is a real place with real standings.
 */
export interface WorldLeague {
  /** Rounds of this league already played. */
  round: number;
  table: TableRow[];
}

/**
 * Round 95: one knockout tie in the Champions League bracket. The bracket is
 * eight clubs, my club among them if I got through the group, and every tie
 * is simulated so the whole thing is real rather than a note saying who I
 * happen to play next.
 */
export interface UclTie {
  round: UclKoRound;
  /** Slot in that round, left to right. */
  slot: number;
  home: string;
  away: string;
  homeGoals: number | null;
  awayGoals: number | null;
  /** Set once the tie is settled. */
  winner: string | null;
  /** True when this is my club's tie. */
  mine: boolean;
  /** Level after normal time, settled on penalties. */
  pens?: boolean;
}

export interface SeasonRecord {
  season: number;
  club: string;
  position: number;
  points: number;
  trophies: string[];
}

export interface CareerStats {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  /** Round 71: manager career extremes ("your own managerial career stats"). */
  biggestWin?: { opp: string; score: string } | null;
  biggestDefeat?: { opp: string; score: string } | null;
  mostExpensiveBuy?: { name: string; fee: number } | null;
  mostExpensiveSale?: { name: string; fee: number } | null;
  clubsManaged?: string[];
}

export interface JobOffer { club: string; blurb: string; }

export interface SeasonSummary {
  season: number;
  club: string;
  position: number;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  gf: number;
  ga: number;
  verdictGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  verdict: string;
  champion: string;
  trophies: string[];
  topScorer: { name: string; goals: number } | null;
  topAssister: { name: string; assists: number } | null;
  qualifiedUcl: boolean;
  signings: TransferRecord[];
  offers: JobOffer[];
  /** min(130, league points + 10 per trophy this season). */
  seasonScore: number;
  /** Round 70: how each board objective ended up. */
  objectives?: { label: string; hit: boolean }[];
}

export interface CareerState {
  saveVersion: number;
  clubName: string;
  season: number;
  /** Index into calendar of the next entry to play. */
  week: number;
  budget: number;
  boardConfidence: number;
  sacked: boolean;
  squad: CMPlayer[];
  /** One id (or null) per formation slot. */
  xiIds: (string | null)[];
  formationIndex: number;
  mentality: Mentality;
  /** Round 119: set only while a match is paused at halftime. */
  live?: LiveMatch | null;
  /** The 20 league clubs in scheduling order (shuffled each season). */
  leagueClubs: string[];
  table: TableRow[];
  /** Last 5 results, oldest first. */
  form: FormResult[];
  calendar: CalendarEntry[];
  /** Per-season strength rating for every club (league + UCL flavor clubs). */
  clubStrengths: Record<string, number>;
  transferWindow: 'summer' | 'january' | null;
  /** Round 141: match weeks the open window still spans. Real windows run
   *  through early season fixtures, so listing a man and waiting for offers
   *  is now an actual strategy instead of a single-screen gamble. */
  windowWeeksLeft?: number;
  aiHeadlines: string[];
  /** Names no longer purchasable (bought by me or by AI clubs this season). */
  goneNames: string[];
  seasonSignings: TransferRecord[];
  cupRound: CupState;
  cupDraw: Partial<Record<CupRound, string>>;
  uclGroup: UclGroupState | null;
  uclKoRound: UclKoState;
  uclDraw: Partial<Record<UclKoRound, string>>;
  trophies: Trophy[];
  history: SeasonRecord[];
  careerStats: CareerStats;
  /** Set by finishSeason so a reload mid-review can resume the summary. */
  pendingSummary: SeasonSummary | null;
  /** Round 70: the board's demands for this season. */
  boardObjectives?: BoardObjective[];
  /** Round 70: the cup round we were knocked out at (for objective grading). */
  cupExit?: CupRound | null;
  /** Round 70: the UCL stage we were knocked out at (for objective grading). */
  uclExit?: UclKoRound | 'group' | null;
  /** Round 71: the one live fee negotiation (dies when the window shuts). */
  negotiation?: Negotiation | null;
  /** Round 71: AI clubs bidding for my players this window. */
  incomingBids?: IncomingBid[];
  /** Round 94: my players out on loan, returning at the end of the season. */
  loanedOut?: LoanOut[];
  /** Round 95: live standings for every league that is not mine, by league id. */
  world?: Record<string, WorldLeague>;
  /** Round 95: the full Champions League knockout bracket. */
  uclBracket?: UclTie[];
  /** Round 102: the domestic cup as a real sixteen club bracket. */
  cupBracket?: CupTie[];
  /** Round 105: the weekly wage bill the board will tolerate, in thousands. */
  wageCap?: number;
  /** Round 71: sellers who walked away from me this window. */
  coldNames?: string[];
  /** Round 71: the Latest Transfers feed, newest last, capped at 80. */
  transferLog?: TransferNews[];
  /** Round 73: this season's played fixtures, newest last, capped at 60. */
  resultLog?: ResultLogEntry[];
  /** Round 73: player messages, newest first, capped at 8. */
  inbox?: PlayerMessage[];
  /** Round 73: player ids you promised a start; break it and they notice. */
  promisedStarts?: string[];
  /** Round 116: the youth setup, the scouts on the road and the kids on the books. */
  academy?: Academy;
  /** Round 116: how the squad is being worked this week. */
  training?: TrainingPlan;
  /** Round 116: how many of your own kids you have promoted, all time. */
  academyGraduates?: number;
  /**
   * Round 132: the world clock.
   *
   * startYear is the calendar year season one runs in, so the real world year
   * is startYear + season - 1, and how far the world has been aged from the
   * baked roster year is that minus CM_BASE_YEAR. Everything era shaped falls
   * out of this one number: the squad you are handed, how strong every other
   * club is, and who is on the transfer market. Undefined on any save made
   * before this round, and repaired to the roster year by ensureClock.
   */
  startYear?: number;
  /** Which era tile was picked, for the labelling. */
  eraId?: string;
  /**
   * Round 132: everyone who has hung up his boots out of MY squad. He never
   * comes back, so the market has to know about it. Without this a player who
   * retired at thirty seven reappeared on the transfer list the following
   * morning at the age the data has him.
   */
  retiredNames?: string[];
  /** Round 132: who retired at the most recent summer, for the season screen. */
  retiredLastSummer?: { name: string; age: number; rating: number }[];
  /**
   * Round 135: the microphone. How the papers are treating you, the question
   * sitting on your desk, and anything you have promised out loud. Undefined on
   * a save made before this existed and repaired by ensurePress.
   */
  press?: PressState;
  /**
   * Round 135: what you said to them before kick off. Cleared at the final
   * whistle, so it only ever covers the match it was given for.
   */
  teamTalk?: TalkTone | null;
}

export type NextFixtureInfo =
  | {
      kind: 'match';
      competition: Competition;
      compLabel: string;
      opponent: string;
      /** true home, false away, null neutral venue. */
      home: boolean | null;
      oppStrength: number;
    }
  | { kind: 'window' }
  | { kind: 'seasonOver' };

/**
 * Round 119: a match that is stopped at the interval, waiting on the manager.
 * Everything needed to finish it lives here so a save can be closed at
 * halftime and picked back up.
 */
export interface LiveMatch {
  /** Index into the calendar, so resuming knows which fixture this is. */
  week: number;
  myGoals: number;
  oppGoals: number;
  /** Who kicked off, and who is on the pitch now: the two differ after subs. */
  startXi: string[];
  onPitch: string[];
  subsUsed: number;
  mentality: Mentality;
  opponent: string;
  compLabel: string;
  home: boolean | null;
  /** What the first half felt like, in words, so the screen has something to say. */
  read: string;
  /** Round 135: what you said to them in the dressing room at the interval. */
  talk?: TalkTone | null;
}

export interface PlayResult {
  state: CareerState;
  kind: 'window' | 'match' | 'seasonOver' | 'halftime';
  report?: MatchWeekReport;
  live?: LiveMatch;
}

/* ================================================================== */
/* Static data                                                        */
/* ================================================================== */

export const TIER_INFO: Record<number, TierInfo> = {
  1: { label: 'Elite', emoji: '👑', blurb: 'Huge budgets, zero patience: anything short of the title is a crisis.' },
  2: { label: 'Contenders', emoji: '🥇', blurb: 'Big spenders expected to challenge on every front.' },
  3: { label: 'Challengers', emoji: '⚔️', blurb: 'Strong squads fighting for the European places.' },
  4: { label: 'Underdogs', emoji: '🐺', blurb: 'Small budgets, low bar: every scalp is a story.' },
};

export const CLUBS: ClubDef[] = [
  { name: 'Real Madrid', tier: 1, color: '#f0c243', budget: 180, expectation: 1 },
  { name: 'Manchester City', tier: 1, color: '#6cabdd', budget: 175, expectation: 2 },
  { name: 'Barcelona', tier: 1, color: '#a50044', budget: 170, expectation: 2 },
  { name: 'Liverpool', tier: 1, color: '#c8102e', budget: 165, expectation: 2 },
  { name: 'Bayern Munich', tier: 1, color: '#dc052d', budget: 160, expectation: 3 },
  { name: 'PSG', tier: 2, color: '#004170', budget: 130, expectation: 4 },
  { name: 'Chelsea', tier: 2, color: '#034694', budget: 125, expectation: 5 },
  { name: 'Arsenal', tier: 2, color: '#ef0107', budget: 120, expectation: 4 },
  { name: 'Inter Milan', tier: 2, color: '#0068a8', budget: 95, expectation: 5 },
  { name: 'Juventus', tier: 2, color: '#d5d5d5', budget: 90, expectation: 6 },
  { name: 'Manchester United', tier: 3, color: '#da291c', budget: 80, expectation: 7 },
  { name: 'Tottenham', tier: 3, color: '#9bb3d4', budget: 75, expectation: 8 },
  { name: 'Atlético Madrid', tier: 3, color: '#cb3524', budget: 72, expectation: 7 },
  { name: 'AC Milan', tier: 3, color: '#fb090b', budget: 70, expectation: 8 },
  { name: 'Borussia Dortmund', tier: 3, color: '#fde100', budget: 65, expectation: 9 },
  { name: 'Newcastle', tier: 4, color: '#a0a6ad', budget: 40, expectation: 12 },
  { name: 'Aston Villa', tier: 4, color: '#95bfe5', budget: 38, expectation: 12 },
  { name: 'Napoli', tier: 4, color: '#12a0d7', budget: 35, expectation: 11 },
  { name: 'Roma', tier: 4, color: '#8e1f2f', budget: 30, expectation: 13 },
  { name: 'Marseille', tier: 4, color: '#2faee0', budget: 25, expectation: 14 },
];

export const MENTALITIES: MentalityDef[] = [
  { id: 'defensive', label: 'Defensive', emoji: '🛡️', desc: 'Sit deep, frustrate them, protect the point' },
  { id: 'balanced', label: 'Balanced', emoji: '⚖️', desc: 'Keep your shape and pick your moments' },
  { id: 'attacking', label: 'Attacking', emoji: '⚔️', desc: 'Throw bodies forward and chase goals' },
];

/* ---------------- Round 114: where the shape actually sits ---------------- */
/**
 * Owner: "I would love to see an animation or something for when u click
 * defensive or balanced or attacking."
 *
 * The old pitch nudged every outfielder by the same 3.5 percent, which you
 * could barely see and which is not what a mentality is anyway. A high line is
 * the BACK FOUR stepping up. A low block is the front men dropping in so the
 * whole team is compact in front of its own box. So the shift is graded by
 * which line a slot belongs to, and the wide men spread when we go for it and
 * tuck in when we shut up shop.
 *
 * Units are percentage points of the pitch. y counts DOWN the screen (the
 * keeper sits at y 90 and the strikers live near 18), so a negative dy is UP
 * the pitch toward the goal we are attacking.
 */
export interface PitchShift { dx: number; dy: number; }

/** Which band of the shape a slot belongs to, read straight off its y. */
export type PitchLine = 'keeper' | 'defence' | 'midfield' | 'attack';

export function pitchLineOf(slot: FormationSlot): PitchLine {
  if (slot.y > 86) return 'keeper';
  if (slot.y >= 62) return 'defence';
  if (slot.y >= 40) return 'midfield';
  return 'attack';
}

export function mentalityShift(slot: FormationSlot, m: Mentality): PitchShift {
  if (m === 'balanced') return { dx: 0, dy: 0 };
  const line = pitchLineOf(slot);
  const up = m === 'attacking';
  // Attacking stretches the block up the pitch, led by the defenders.
  // Defensive drops it and squeezes it, led by the forwards coming back.
  const UP: Record<PitchLine, number> = { keeper: -2, defence: -8, midfield: -6, attack: -2.5 };
  const BACK: Record<PitchLine, number> = { keeper: 1, defence: 4, midfield: 7.5, attack: 11 };
  const dy = up ? UP[line] : BACK[line];
  const spread = line === 'keeper' ? 0 : up ? 0.12 : -0.16;
  return { dx: (slot.x - 50) * spread, dy };
}

/** Final spot for a slot under a mentality, clamped so nobody leaves the grass. */
export function slotPosition(slot: FormationSlot, m: Mentality): { x: number; y: number } {
  const sh = mentalityShift(slot, m);
  return {
    x: Math.max(6, Math.min(94, slot.x + sh.dx)),
    y: Math.max(6, Math.min(94, slot.y + sh.dy)),
  };
}

/** Average height of the back line, which is the number a manager actually feels. */
export function defensiveLineY(formation: Formation, m: Mentality): number {
  const back = formation.slots.filter(sl => pitchLineOf(sl) === 'defence');
  if (!back.length) return slotPosition(formation.slots[0] ?? { label: '', allowed: [], x: 50, y: 74 }, m).y;
  return back.reduce((t, sl) => t + slotPosition(sl, m).y, 0) / back.length;
}

/** Player facing name for that line, used as the caption on the pitch. */
export function lineLabel(m: Mentality): string {
  return m === 'attacking' ? 'High line' : m === 'defensive' ? 'Low block' : 'Standard line';
}

/** European flavor clubs used for UCL groups/knockouts (not in the league). */
const EURO_CLUBS = [
  'Benfica', 'Porto', 'Sporting CP', 'Ajax', 'PSV', 'Feyenoord', 'Celtic', 'Rangers',
  'Galatasaray', 'Fenerbahçe', 'Club Brugge', 'RB Salzburg', 'Olympiacos', 'RB Leipzig',
  'Bayer Leverkusen', 'Monaco', 'Lille', 'Atalanta', 'Lazio', 'Sevilla',
];

/* ================================================================== */
/* Real leagues (owner task 61, 2026-08-05: "real accurate tables")   */
/* ================================================================== */

/**
 * Every playable club now competes in its REAL league against that league's
 * real clubs (2025-26 memberships), not the old fictional World Super
 * League. Names for playable clubs match CLUBS exactly, since the whole
 * engine keys on the name string. Strength priors are rough tiers on the
 * same 55-92 scale seasonStrengths already used; ±2 jitter applies on top
 * each season.
 */
export interface LeagueDef {
  id: string;
  name: string;
  cupName: string;
  /** Can clubs from this league qualify for the Champions League in-game? */
  euro: boolean;
  clubs: string[];
}

/**
 * Round 72: league memberships are the REAL 2026-27 lineups (promotions and
 * relegations applied, verified 2026-08-13), and the playable world grew to
 * nine leagues: the big five plus the EFL Championship, Saudi Pro League,
 * MLS (both conferences) and the Eredivisie.
 */
export const REAL_LEAGUES: LeagueDef[] = [
  {
    id: 'premier', name: 'Premier League', cupName: 'FA Cup', euro: true,
    // 2026-27: Coventry, Ipswich and Hull came up; Wolves, Burnley and West Ham went down.
    clubs: ['Arsenal', 'Aston Villa', 'Bournemouth', 'Brentford', 'Brighton', 'Chelsea', 'Coventry City', 'Crystal Palace', 'Everton', 'Fulham', 'Hull City', 'Ipswich Town', 'Leeds United', 'Liverpool', 'Manchester City', 'Manchester United', 'Newcastle', 'Nottingham Forest', 'Sunderland', 'Tottenham'],
  },
  {
    id: 'championship', name: 'EFL Championship', cupName: 'FA Cup', euro: false,
    // 2026-27 lineup per the fixture release: the three relegated Premier
    // League sides plus Cardiff, Bolton and Lincoln up from League One.
    clubs: ['Birmingham City', 'Blackburn Rovers', 'Bolton Wanderers', 'Bristol City', 'Burnley', 'Cardiff City', 'Charlton Athletic', 'Derby County', 'Lincoln City', 'Middlesbrough', 'Millwall', 'Norwich City', 'Portsmouth', 'Preston North End', 'QPR', 'Sheffield United', 'Southampton', 'Stoke City', 'Swansea City', 'Watford', 'West Brom', 'West Ham', 'Wolves', 'Wrexham'],
  },
  {
    id: 'laliga', name: 'La Liga', cupName: 'Copa del Rey', euro: true,
    // 2026-27: Racing Santander, Deportivo and Málaga up; Oviedo, Girona and Mallorca down.
    clubs: ['Alavés', 'Athletic Club', 'Atlético Madrid', 'Barcelona', 'Real Betis', 'Celta Vigo', 'Deportivo La Coruña', 'Elche', 'Espanyol', 'Getafe', 'Levante', 'Málaga', 'Osasuna', 'Racing Santander', 'Rayo Vallecano', 'Real Madrid', 'Real Sociedad', 'Sevilla', 'Valencia', 'Villarreal'],
  },
  {
    id: 'seriea', name: 'Serie A', cupName: 'Coppa Italia', euro: true,
    // 2026-27: Venezia, Frosinone and Monza up; Cremonese, Verona and Pisa down.
    clubs: ['Atalanta', 'Bologna', 'Cagliari', 'Como', 'Fiorentina', 'Frosinone', 'Genoa', 'Inter Milan', 'Juventus', 'Lazio', 'Lecce', 'AC Milan', 'Monza', 'Napoli', 'Parma', 'Roma', 'Sassuolo', 'Torino', 'Udinese', 'Venezia'],
  },
  {
    id: 'bundesliga', name: 'Bundesliga', cupName: 'DFB-Pokal', euro: true,
    // 2026-27: Schalke, Elversberg and Paderborn up; Heidenheim, St. Pauli and Wolfsburg down.
    clubs: ['Augsburg', 'Bayer Leverkusen', 'Bayern Munich', 'Borussia Dortmund', 'Gladbach', 'Eintracht Frankfurt', 'Freiburg', 'Hamburg', 'Hoffenheim', 'Köln', 'Mainz', 'RB Leipzig', 'Schalke 04', 'Elversberg', 'Paderborn', 'Stuttgart', 'Union Berlin', 'Werder Bremen'],
  },
  {
    id: 'ligue1', name: 'Ligue 1', cupName: 'Coupe de France', euro: true,
    // 2026-27: Troyes and Le Mans up; Metz and Nantes down.
    clubs: ['Angers', 'Auxerre', 'Brest', 'Le Havre', 'Le Mans', 'Lens', 'Lille', 'Lorient', 'Lyon', 'Marseille', 'Monaco', 'Nice', 'Paris FC', 'PSG', 'Rennes', 'Strasbourg', 'Toulouse', 'Troyes'],
  },
  {
    id: 'eredivisie', name: 'Eredivisie', cupName: 'KNVB Cup', euro: true,
    // 2026-27: ADO Den Haag, Cambuur and Willem II up; Volendam, NAC and Heracles down.
    clubs: ['Ajax', 'AZ Alkmaar', 'ADO Den Haag', 'Cambuur', 'Excelsior', 'Feyenoord', 'Fortuna Sittard', 'Go Ahead Eagles', 'Groningen', 'Heerenveen', 'NEC Nijmegen', 'PEC Zwolle', 'PSV', 'Sparta Rotterdam', 'Telstar', 'Twente', 'Utrecht', 'Willem II'],
  },
  {
    id: 'saudi', name: 'Saudi Pro League', cupName: "King's Cup", euro: false,
    // 2026-27: Abha, Al-Faisaly and Al-Diriyah up; Al-Najma, Al-Okhdood and Damac down.
    clubs: ['Abha', 'Al-Ahli', 'Al-Diriyah', 'Al-Ettifaq', 'Al-Faisaly', 'Al-Fateh', 'Al-Fayha', 'Al-Hazem', 'Al-Hilal', 'Al-Ittihad', 'Al-Khaleej', 'Al-Kholood', 'Al-Nassr', 'Al-Qadsiah', 'Al-Riyadh', 'Al-Shabab', 'Al-Taawoun', 'NEOM SC'],
  },
  {
    id: 'mlsEast', name: 'MLS Eastern Conference', cupName: 'U.S. Open Cup', euro: false,
    clubs: ['Atlanta United', 'Charlotte FC', 'Chicago Fire', 'FC Cincinnati', 'Columbus Crew', 'D.C. United', 'Inter Miami', 'CF Montréal', 'Nashville SC', 'New England Revolution', 'New York City FC', 'New York Red Bulls', 'Orlando City', 'Philadelphia Union', 'Toronto FC'],
  },
  {
    id: 'mlsWest', name: 'MLS Western Conference', cupName: 'U.S. Open Cup', euro: false,
    clubs: ['Austin FC', 'Colorado Rapids', 'FC Dallas', 'Houston Dynamo', 'LA Galaxy', 'LAFC', 'Minnesota United', 'Portland Timbers', 'Real Salt Lake', 'San Diego FC', 'San Jose Earthquakes', 'Seattle Sounders', 'Sporting Kansas City', 'St. Louis City', 'Vancouver Whitecaps'],
  },
  /* Round 140, from the owner's review: "way way way more leagues... with
     correct data." Memberships verified 2026-08-16 against published season
     coverage: Primeira Liga (Marítimo and Académico de Viseu up, Tondela and
     AVS down, Casa Pia survived the playoff), Scottish Premiership
     (St Johnstone up, Livingston down, St Mirren survived the playoff) and
     the Süper Lig (Erzurumspor, Amedspor and Çorum FK up; Antalyaspor,
     Kayserispor and Fatih Karagümrük down). Rosters come from the same
     Transfermarkt-derived table as every other league; the smallest squads
     sit below that dataset's value floor and are marked in CM_PARTIAL, the
     same honesty rule the Championship has shipped with since Round 72. */
  {
    id: 'primeira', name: 'Primeira Liga', cupName: 'Taça de Portugal', euro: true,
    clubs: ['Porto', 'Benfica', 'Sporting CP', 'Braga', 'Vitória Guimarães', 'Famalicão', 'Rio Ave', 'Casa Pia', 'Estoril', 'Moreirense', 'Arouca', 'Gil Vicente', 'Santa Clara', 'Nacional', 'Estrela Amadora', 'Alverca', 'Marítimo', 'Académico de Viseu'],
  },
  {
    id: 'scottish', name: 'Scottish Premiership', cupName: 'Scottish Cup', euro: true,
    clubs: ['Celtic', 'Rangers', 'Aberdeen', 'Hearts', 'Hibernian', 'Dundee United', 'Dundee', 'Motherwell', 'St Mirren', 'Kilmarnock', 'Falkirk', 'St Johnstone'],
  },
  {
    id: 'superlig', name: 'Süper Lig', cupName: 'Turkish Cup', euro: true,
    clubs: ['Galatasaray', 'Fenerbahçe', 'Beşiktaş', 'Trabzonspor', 'Başakşehir', 'Samsunspor', 'Eyüpspor', 'Göztepe', 'Kasımpaşa', 'Alanyaspor', 'Konyaspor', 'Gaziantep FK', 'Gençlerbirliği', 'Kocaelispor', 'Rizespor', 'Erzurumspor', 'Amedspor', 'Çorum FK'],
  },
  /* Round 142: the second division he asked for by name ("some second
     divisions too"). 2026-27 membership from the league's own published
     season preview: Wolfsburg, Heidenheim and St. Pauli down from the
     Bundesliga, Osnabrück and Energie Cottbus up from 3. Liga. */
  {
    id: 'bundesliga2', name: '2. Bundesliga', cupName: 'DFB-Pokal', euro: false,
    clubs: ['Wolfsburg', 'Heidenheim', 'St. Pauli', 'Bochum', 'Hertha BSC', 'Magdeburg', 'Kaiserslautern', 'Holstein Kiel', 'Hannover 96', 'Dynamo Dresden', 'Braunschweig', 'Greuther Fürth', 'Nürnberg', 'Darmstadt', 'Arminia Bielefeld', 'Karlsruhe', 'Osnabrück', 'Energie Cottbus'],
  },
  /* Round 143: Belgium's reformed top flight. 2026-27 is the expansion
     season: 18 clubs, straight round robin, no playoffs, which happens to be
     exactly the shape this engine plays. Beveren, Kortrijk and Lommel came
     up, Dender went down via the playoff Lommel won. */
  {
    id: 'proleague', name: 'Belgian Pro League', cupName: 'Belgian Cup', euro: true,
    clubs: ['Club Brugge', 'Union Saint-Gilloise', 'Anderlecht', 'Genk', 'Gent', 'Antwerp', 'Standard Liège', 'Mechelen', 'Charleroi', 'Westerlo', 'Sint-Truiden', 'OH Leuven', 'Cercle Brugge', 'La Louvière', 'Zulte Waregem', 'Beveren', 'Kortrijk', 'Lommel'],
  },
];

/** Strength priors for league clubs the player pool cannot rate. */
const STRENGTH_PRIORS: Record<string, number> = {
  // Premier League
  'Liverpool': 86, 'Manchester City': 86, 'Arsenal': 86, 'Chelsea': 83, 'Newcastle': 81,
  'Aston Villa': 80, 'Manchester United': 79, 'Tottenham': 79, 'Brighton': 77, 'Nottingham Forest': 76,
  'Bournemouth': 76, 'Crystal Palace': 76, 'Brentford': 75, 'Fulham': 75, 'Everton': 74,
  'West Ham': 74, 'Wolves': 73, 'Leeds United': 72, 'Burnley': 70, 'Sunderland': 70,
  // La Liga
  'Real Madrid': 88, 'Barcelona': 87, 'Atlético Madrid': 83, 'Athletic Club': 79, 'Villarreal': 78,
  'Real Betis': 76, 'Real Sociedad': 76, 'Girona': 74, 'Sevilla': 73, 'Valencia': 73,
  'Celta Vigo': 73, 'Osasuna': 72, 'Mallorca': 72, 'Rayo Vallecano': 72, 'Getafe': 71,
  'Espanyol': 70, 'Alavés': 70, 'Levante': 68, 'Elche': 68, 'Real Oviedo': 67,
  // Serie A
  'Inter Milan': 85, 'Napoli': 83, 'AC Milan': 82, 'Juventus': 82, 'Atalanta': 81,
  'Roma': 79, 'Lazio': 77, 'Fiorentina': 77, 'Bologna': 76, 'Torino': 72,
  'Como': 72, 'Udinese': 71, 'Genoa': 71, 'Cagliari': 69, 'Lecce': 69,
  'Parma': 69, 'Verona': 68, 'Sassuolo': 68, 'Pisa': 66, 'Cremonese': 66,
  // Bundesliga
  'Bayern Munich': 87, 'Bayer Leverkusen': 83, 'Borussia Dortmund': 81, 'RB Leipzig': 79, 'Eintracht Frankfurt': 77,
  'Stuttgart': 77, 'Freiburg': 74, 'Mainz': 73, 'Gladbach': 73, 'Hoffenheim': 72,
  'Wolfsburg': 72, 'Union Berlin': 71, 'Werder Bremen': 71, 'Augsburg': 70, 'Köln': 69,
  'Hamburg': 69, 'St. Pauli': 68, 'Heidenheim': 67,
  // Ligue 1
  'PSG': 87, 'Monaco': 79, 'Marseille': 79, 'Lille': 77, 'Lyon': 76,
  'Nice': 75, 'Lens': 74, 'Rennes': 74, 'Strasbourg': 72, 'Brest': 71,
  'Toulouse': 70, 'Nantes': 69, 'Auxerre': 68, 'Angers': 67, 'Le Havre': 67,
  'Metz': 66, 'Lorient': 66, 'Paris FC': 66,
  /* Round 140: priors for the new leagues' thin-data clubs, so a squad the
     value table barely covers still lands at a sane strength instead of the
     generic 65. Set from league standing common knowledge, deliberately
     conservative; clubs with rich baked squads (Porto, Celtic, Galatasaray
     and co) rate from their data and ignore these. */
  // Primeira Liga
  'Vitória Guimarães': 72, 'Casa Pia': 66, 'Estoril': 67, 'Moreirense': 66,
  'Arouca': 65, 'Santa Clara': 66, 'Nacional': 64, 'Estrela Amadora': 63,
  'Alverca': 63, 'Marítimo': 63, 'Académico de Viseu': 62,
  // Scottish Premiership
  'Aberdeen': 69, 'Hearts': 69, 'Hibernian': 68, 'Dundee United': 66, 'Dundee': 65,
  'Motherwell': 65, 'St Mirren': 65, 'Kilmarnock': 64, 'Falkirk': 63, 'St Johnstone': 63,
  // Süper Lig
  'Kasımpaşa': 67, 'Alanyaspor': 66, 'Konyaspor': 66, 'Gaziantep FK': 65,
  'Gençlerbirliği': 64, 'Kocaelispor': 64, 'Rizespor': 65, 'Eyüpspor': 66,
  'Erzurumspor': 63, 'Amedspor': 63, 'Çorum FK': 62,
  // 2. Bundesliga (Round 142): thin-data clubs
  'Magdeburg': 66, 'Kaiserslautern': 67, 'Dynamo Dresden': 65, 'Braunschweig': 64,
  'Greuther Fürth': 64, 'Nürnberg': 66, 'Darmstadt': 65, 'Arminia Bielefeld': 64,
  'Karlsruhe': 65, 'Osnabrück': 62, 'Energie Cottbus': 62, 'Hertha BSC': 69, 'Bochum': 67,
  // Belgian Pro League (Round 143): thin-data clubs
  'Standard Liège': 69, 'Westerlo': 66, 'OH Leuven': 65, 'La Louvière': 63,
  'Zulte Waregem': 63, 'Beveren': 62, 'Kortrijk': 62, 'Lommel': 61,
};

/** The real league a club plays in. Every playable club is covered. */
export function leagueOf(clubName: string): LeagueDef {
  return REAL_LEAGUES.find(l => l.clubs.includes(clubName)) ?? REAL_LEAGUES[0];
}

/* ================================================================== */
/* Round 70: every club is playable. Nations, colors, rivals, defs.   */
/* ================================================================== */

export interface NationDef { id: string; name: string; flag: string; leagueIds: string[]; }

export const NATIONS: NationDef[] = [
  { id: 'england', name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', leagueIds: ['premier', 'championship'] },
  { id: 'spain', name: 'Spain', flag: '🇪🇸', leagueIds: ['laliga'] },
  { id: 'italy', name: 'Italy', flag: '🇮🇹', leagueIds: ['seriea'] },
  { id: 'germany', name: 'Germany', flag: '🇩🇪', leagueIds: ['bundesliga', 'bundesliga2'] },
  { id: 'france', name: 'France', flag: '🇫🇷', leagueIds: ['ligue1'] },
  { id: 'netherlands', name: 'Netherlands', flag: '🇳🇱', leagueIds: ['eredivisie'] },
  { id: 'saudi', name: 'Saudi Arabia', flag: '🇸🇦', leagueIds: ['saudi'] },
  { id: 'usa', name: 'United States', flag: '🇺🇸', leagueIds: ['mlsEast', 'mlsWest'] },
  // Round 140
  { id: 'portugal', name: 'Portugal', flag: '🇵🇹', leagueIds: ['primeira'] },
  { id: 'scotland', name: 'Scotland', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', leagueIds: ['scottish'] },
  { id: 'turkey', name: 'Turkey', flag: '🇹🇷', leagueIds: ['superlig'] },
  { id: 'belgium', name: 'Belgium', flag: '🇧🇪', leagueIds: ['proleague'] },
];

/** Primary kit colors for the club dot in the UI (approximate, decorative). */
const CLUB_COLORS: Record<string, string> = {
  // Premier League
  'Arsenal': '#ef0107', 'Aston Villa': '#95bfe5', 'Bournemouth': '#da291c', 'Brentford': '#e30613',
  'Brighton': '#0057b8', 'Burnley': '#8b2a4a', 'Chelsea': '#034694', 'Crystal Palace': '#1b458f',
  'Everton': '#2455b3', 'Fulham': '#d9d9d9', 'Leeds United': '#ffcd00', 'Liverpool': '#c8102e',
  'Manchester City': '#6cabdd', 'Manchester United': '#da291c', 'Newcastle': '#a0a6ad',
  'Nottingham Forest': '#dd0000', 'Sunderland': '#eb172b', 'Tottenham': '#9bb3d4',
  'West Ham': '#9c2d46', 'Wolves': '#fdb913',
  // La Liga
  'Alavés': '#0761af', 'Athletic Club': '#ee2523', 'Atlético Madrid': '#cb3524', 'Barcelona': '#a50044',
  'Real Betis': '#00954c', 'Celta Vigo': '#8ac3ee', 'Elche': '#1a9349', 'Espanyol': '#007fc8',
  'Getafe': '#1265b3', 'Girona': '#cd2534', 'Levante': '#9c2743', 'Mallorca': '#e20613',
  'Osasuna': '#d91a21', 'Real Oviedo': '#2b7fc4', 'Rayo Vallecano': '#e53027', 'Real Madrid': '#f0c243',
  'Real Sociedad': '#1770b8', 'Sevilla': '#f43333', 'Valencia': '#ee7f24', 'Villarreal': '#ffe667',
  // Serie A
  'Atalanta': '#1e71b8', 'Bologna': '#a21c26', 'Cagliari': '#b01028', 'Como': '#2764b0',
  'Cremonese': '#e3546c', 'Fiorentina': '#7d4bc0', 'Genoa': '#a71930', 'Inter Milan': '#0068a8',
  'Juventus': '#d5d5d5', 'Lazio': '#87d8f7', 'Lecce': '#f7d117', 'AC Milan': '#fb090b',
  'Napoli': '#12a0d7', 'Parma': '#f6c800', 'Pisa': '#3a6fc4', 'Roma': '#8e1f2f',
  'Sassuolo': '#00a752', 'Torino': '#a8352b', 'Udinese': '#c9c9c9', 'Verona': '#ffdd00',
  // Bundesliga
  'Augsburg': '#ba3733', 'Bayer Leverkusen': '#e32221', 'Bayern Munich': '#dc052d',
  'Borussia Dortmund': '#fde100', 'Gladbach': '#1a9f3d', 'Eintracht Frankfurt': '#e1000f',
  'Freiburg': '#cc0000', 'Hamburg': '#2b62b8', 'Heidenheim': '#e30613', 'Hoffenheim': '#1961b5',
  'Köln': '#ed1c24', 'Mainz': '#c3141e', 'RB Leipzig': '#dd0741', 'St. Pauli': '#b08968',
  'Stuttgart': '#e32219', 'Union Berlin': '#eb1923', 'Werder Bremen': '#1d9053', 'Wolfsburg': '#65b32e',
  // Ligue 1
  'Angers': '#9aa0a6', 'Auxerre': '#4a7fc0', 'Brest': '#e30613', 'Le Havre': '#75aadb',
  'Lens': '#ffd700', 'Lille': '#e01e13', 'Lorient': '#ff6600', 'Lyon': '#d6001c',
  'Marseille': '#2faee0', 'Metz': '#a01d3c', 'Monaco': '#e63329', 'Nantes': '#fcd405',
  'Nice': '#d10429', 'Paris FC': '#3d5da8', 'PSG': '#004170', 'Rennes': '#e13327',
  'Strasbourg': '#009fe3', 'Toulouse': '#8b5bb8', 'Troyes': '#2a5aa8', 'Le Mans': '#f0b41c',
  // Round 72: promoted big-five clubs
  'Coventry City': '#66b2e8', 'Ipswich Town': '#2450a3', 'Hull City': '#f5a12d',
  'Racing Santander': '#009e49', 'Deportivo La Coruña': '#0068b3', 'Málaga': '#29a5dd',
  'Venezia': '#f28020', 'Frosinone': '#f7d417', 'Monza': '#e31b23',
  'Schalke 04': '#004b95', 'Elversberg': '#dd1425', 'Paderborn': '#0060ae',
  // EFL Championship
  'Birmingham City': '#2966b0', 'Blackburn Rovers': '#009ee0', 'Bolton Wanderers': '#263c7e',
  'Bristol City': '#e21a23', 'Cardiff City': '#0070b5', 'Charlton Athletic': '#d4021d',
  'Derby County': '#d8d8d8', 'Lincoln City': '#e30613', 'Middlesbrough': '#e21a23',
  'Millwall': '#25457a', 'Norwich City': '#f4e300', 'Portsmouth': '#2450a3',
  'Preston North End': '#b9c4d1', 'QPR': '#1d5ba4', 'Sheffield United': '#ee2737',
  'Southampton': '#d71920', 'Stoke City': '#e03a3e', 'Swansea City': '#c8c8c8',
  'Watford': '#fbee23', 'West Brom': '#3a5da8', 'Wrexham': '#ce1126',
  // Saudi Pro League
  'Abha': '#cf3a3a', 'Al-Ahli': '#00693e', 'Al-Diriyah': '#9a7b3f', 'Al-Ettifaq': '#0d7a3c',
  'Al-Faisaly': '#f9a11b', 'Al-Fateh': '#3b2a7a', 'Al-Fayha': '#e8871e', 'Al-Hazem': '#2d7dc8',
  'Al-Hilal': '#1b4fa0', 'Al-Ittihad': '#f9d616', 'Al-Khaleej': '#cf2032', 'Al-Kholood': '#8f2f4f',
  'Al-Nassr': '#f2c500', 'Al-Qadsiah': '#e6b31e', 'Al-Riyadh': '#3aa335', 'Al-Shabab': '#bfbfbf',
  'Al-Taawoun': '#b78b28', 'NEOM SC': '#2ab6bd',
  // MLS East
  'Atlanta United': '#80000a', 'Charlotte FC': '#1a85c8', 'Chicago Fire': '#cf2334',
  'FC Cincinnati': '#fe5000', 'Columbus Crew': '#fedd00', 'D.C. United': '#ee3524',
  'Inter Miami': '#f7b5cd', 'CF Montréal': '#244a8e', 'Nashville SC': '#ece83a',
  'New England Revolution': '#d21033', 'New York City FC': '#6cace4', 'New York Red Bulls': '#ed1e36',
  'Orlando City': '#633492', 'Philadelphia Union': '#b38707', 'Toronto FC': '#b81137',
  // MLS West
  'Austin FC': '#00b140', 'Colorado Rapids': '#862633', 'FC Dallas': '#e81f3e',
  'Houston Dynamo': '#ff6b00', 'LA Galaxy': '#ffd200', 'LAFC': '#c39e6d',
  'Minnesota United': '#8cd2f4', 'Portland Timbers': '#0d6b3f', 'Real Salt Lake': '#b30838',
  'San Diego FC': '#00b0e7', 'San Jose Earthquakes': '#0067b1', 'Seattle Sounders': '#5d9741',
  'Sporting Kansas City': '#91b0d5', 'St. Louis City': '#dd004a', 'Vancouver Whitecaps': '#7ba4d9',
  // Eredivisie
  'Ajax': '#d2122e', 'PSV': '#ed1c24', 'Feyenoord': '#d0111b', 'AZ Alkmaar': '#df1119',
  'Utrecht': '#e8483f', 'Twente': '#d40019', 'NEC Nijmegen': '#cf2038', 'Sparta Rotterdam': '#b01c2e',
  'Go Ahead Eagles': '#f2c200', 'Fortuna Sittard': '#f6c500', 'Heerenveen': '#1560bd',
  'PEC Zwolle': '#1660a8', 'Groningen': '#009651', 'Excelsior': '#c41f30', 'Telstar': '#d9d9d9',
  'ADO Den Haag': '#0d8a4e', 'Cambuur': '#f5d800', 'Willem II': '#2f4d8f',
  // Round 140: Primeira Liga
  'Porto': '#1a4c9d', 'Benfica': '#e30613', 'Sporting CP': '#0a7857', 'Braga': '#d02128',
  'Vitória Guimarães': '#d9d9d9', 'Famalicão': '#1660a8', 'Rio Ave': '#0a8a4e', 'Casa Pia': '#2b2b2b',
  'Estoril': '#f5d800', 'Moreirense': '#0a7040', 'Arouca': '#f2b705', 'Gil Vicente': '#c41f30',
  'Santa Clara': '#d02128', 'Nacional': '#2b2b2b', 'Estrela Amadora': '#d02128', 'Alverca': '#d02128',
  'Marítimo': '#0a7040', 'Académico de Viseu': '#2f4d8f',
  // Round 140: Scottish Premiership
  'Celtic': '#0a7857', 'Rangers': '#1b458f', 'Aberdeen': '#e2001a', 'Hearts': '#7d1c2a',
  'Hibernian': '#0a7040', 'Dundee United': '#f26522', 'Dundee': '#1b458f', 'Motherwell': '#fbb914',
  'St Mirren': '#2b2b2b', 'Kilmarnock': '#1b458f', 'Falkirk': '#1b3f8f', 'St Johnstone': '#1b458f',
  // Round 140: Süper Lig
  'Galatasaray': '#e30613', 'Fenerbahçe': '#163962', 'Beşiktaş': '#2b2b2b', 'Trabzonspor': '#7d1c2a',
  'Başakşehir': '#163962', 'Samsunspor': '#d02128', 'Eyüpspor': '#5c2d91', 'Göztepe': '#f2b705',
  'Kasımpaşa': '#163962', 'Alanyaspor': '#f26522', 'Konyaspor': '#0a7040', 'Gaziantep FK': '#d02128',
  'Gençlerbirliği': '#d02128', 'Kocaelispor': '#0a7040', 'Rizespor': '#0a7040',
  'Erzurumspor': '#163962', 'Amedspor': '#0a7040', 'Çorum FK': '#d02128',
  // Round 142: 2. Bundesliga (Wolfsburg, Heidenheim and St. Pauli kept theirs)
  'Bochum': '#005ca9', 'Hertha BSC': '#004d9e', 'Magdeburg': '#1b458f', 'Kaiserslautern': '#d02128',
  'Holstein Kiel': '#1b458f', 'Hannover 96': '#0a7040', 'Dynamo Dresden': '#f5d800',
  'Braunschweig': '#f5d800', 'Greuther Fürth': '#0a7040', 'Nürnberg': '#7d1c2a',
  'Darmstadt': '#005ca9', 'Arminia Bielefeld': '#2b2b2b', 'Karlsruhe': '#005ca9',
  'Osnabrück': '#5c2d91', 'Energie Cottbus': '#d02128',
  // Round 143: Belgian Pro League
  'Club Brugge': '#1b458f', 'Union Saint-Gilloise': '#f5d800', 'Anderlecht': '#5c2d91',
  'Genk': '#1b458f', 'Gent': '#1b458f', 'Antwerp': '#d02128', 'Standard Liège': '#d02128',
  'Mechelen': '#f2b705', 'Charleroi': '#2b2b2b', 'Westerlo': '#f5d800', 'Sint-Truiden': '#f2b705',
  'OH Leuven': '#2b2b2b', 'Cercle Brugge': '#0a7857', 'La Louvière': '#0a7040',
  'Zulte Waregem': '#d02128', 'Beveren': '#f5d800', 'Kortrijk': '#d02128', 'Lommel': '#0a7040',
};

/**
 * Real rivalries for the "finish above them" board objective. One direction
 * per club; clubs without a famous league rival get the nearest-strength
 * club instead (see buildBoardObjectives).
 */
const RIVALS: Record<string, string> = {
  // England
  'Arsenal': 'Tottenham', 'Tottenham': 'Arsenal', 'Manchester United': 'Liverpool',
  'Liverpool': 'Everton', 'Everton': 'Liverpool', 'Manchester City': 'Manchester United',
  'Chelsea': 'Arsenal', 'Newcastle': 'Sunderland', 'Sunderland': 'Newcastle',
  'Crystal Palace': 'Brighton',
  'Brighton': 'Crystal Palace', 'Fulham': 'Chelsea',
  'Brentford': 'Fulham', 'Leeds United': 'Manchester United', 'Nottingham Forest': 'Leeds United',
  // Spain
  'Real Madrid': 'Barcelona', 'Barcelona': 'Real Madrid', 'Atlético Madrid': 'Real Madrid',
  'Sevilla': 'Real Betis', 'Real Betis': 'Sevilla', 'Athletic Club': 'Real Sociedad',
  'Real Sociedad': 'Athletic Club', 'Espanyol': 'Barcelona', 'Girona': 'Barcelona',
  'Valencia': 'Levante', 'Levante': 'Valencia', 'Villarreal': 'Valencia',
  'Alavés': 'Athletic Club', 'Getafe': 'Rayo Vallecano', 'Rayo Vallecano': 'Atlético Madrid',
  // Italy
  'Inter Milan': 'AC Milan', 'AC Milan': 'Inter Milan', 'Juventus': 'Inter Milan',
  'Torino': 'Juventus', 'Roma': 'Lazio', 'Lazio': 'Roma', 'Napoli': 'Juventus',
  'Fiorentina': 'Juventus', 'Pisa': 'Fiorentina', 'Bologna': 'Fiorentina',
  // Germany
  'Bayern Munich': 'Borussia Dortmund', 'Borussia Dortmund': 'Bayern Munich',
  'Gladbach': 'Köln', 'Köln': 'Gladbach', 'Hamburg': 'Werder Bremen', 'Werder Bremen': 'Hamburg',
  'St. Pauli': 'Hamburg', 'Eintracht Frankfurt': 'Mainz', 'Mainz': 'Eintracht Frankfurt',
  'Bayer Leverkusen': 'Köln', 'Freiburg': 'Stuttgart', 'Stuttgart': 'Freiburg',
  'Union Berlin': 'RB Leipzig',
  // France
  'PSG': 'Marseille', 'Marseille': 'PSG', 'Lyon': 'Marseille', 'Nice': 'Monaco',
  'Monaco': 'Nice', 'Lens': 'Lille', 'Lille': 'Lens', 'Rennes': 'Nantes', 'Nantes': 'Rennes',
  'Brest': 'Lorient', 'Lorient': 'Brest', 'Strasbourg': 'Metz', 'Metz': 'Strasbourg',
  'Paris FC': 'PSG',
  // Round 72: new-league rivalries
  'Hull City': 'Leeds United',
  'Wolves': 'West Brom', 'West Brom': 'Wolves', 'Cardiff City': 'Swansea City',
  'Swansea City': 'Cardiff City', 'Portsmouth': 'Southampton', 'Southampton': 'Portsmouth',
  'West Ham': 'Millwall', 'Millwall': 'West Ham', 'Blackburn Rovers': 'Burnley',
  'Burnley': 'Blackburn Rovers', 'Preston North End': 'Blackburn Rovers',
  'Bristol City': 'Cardiff City',
  'Al-Hilal': 'Al-Nassr', 'Al-Nassr': 'Al-Hilal', 'Al-Ittihad': 'Al-Ahli', 'Al-Ahli': 'Al-Ittihad',
  'Al-Shabab': 'Al-Hilal',
  'LA Galaxy': 'LAFC', 'LAFC': 'LA Galaxy', 'Inter Miami': 'Orlando City',
  'Orlando City': 'Inter Miami', 'New York City FC': 'New York Red Bulls',
  'New York Red Bulls': 'New York City FC', 'Seattle Sounders': 'Portland Timbers',
  'Portland Timbers': 'Seattle Sounders', 'Vancouver Whitecaps': 'Seattle Sounders',
  'FC Dallas': 'Houston Dynamo', 'Houston Dynamo': 'FC Dallas',
  'Columbus Crew': 'FC Cincinnati', 'FC Cincinnati': 'Columbus Crew',
  'D.C. United': 'New York Red Bulls', 'Toronto FC': 'CF Montréal', 'CF Montréal': 'Toronto FC',
  'Ajax': 'Feyenoord', 'Feyenoord': 'Ajax', 'PSV': 'Ajax', 'Sparta Rotterdam': 'Feyenoord',
  'Groningen': 'Heerenveen', 'Heerenveen': 'Groningen', 'ADO Den Haag': 'Ajax',
};

/**
 * Round 72: clubs where the market value dataset runs thin get youth-padded
 * squads; the picker labels them honestly instead of pretending.
 */
export function isPartialClub(clubName: string): boolean {
  return CM_PARTIAL.includes(clubName);
}

/**
 * Average rating of the club's best XI from the baked real rosters.
 *
 * Round 132: this is now the YEAR ZERO answer specifically, and it stays that
 * way on purpose. It backs clubDefMap, which sets every club's budget, tier
 * and the finish its board expects, and those describe the club's stature
 * rather than this season's XI. Nothing in the data can tell us whether Wrexham
 * are a bigger club in 2041 than they are now, so the honest thing is to leave
 * stature where the real data puts it and let the squads move. For "how good
 * is this club right now", use projectedXIAvg with the career's world year.
 */
export function bakedXIAvg(clubName: string): number | null {
  const roster = CM_ROSTERS[clubName];
  if (!roster || !roster.length) return null;
  const rs = roster.map(p => p.r).sort((a, b) => b - a).slice(0, 11);
  while (rs.length < 11) rs.push(60);
  return Math.round((rs.reduce((s, r) => s + r, 0) / 11) * 10) / 10;
}

let CLUB_DEF_CACHE: Map<string, ClubDef> | null = null;

/**
 * Round 70: a ClubDef for EVERY league club, synthesized from the baked
 * rosters. Budget is a slice of squad value, the board's expected finish is
 * the club's strength rank inside its own league, and tier comes from
 * absolute strength (drives patience, UCL seeding and job offers).
 * Built lazily so module evaluation order never bites (see the circular
 * import gotcha in the NFL corruption file).
 */
function clubDefMap(): Map<string, ClubDef> {
  if (CLUB_DEF_CACHE) return CLUB_DEF_CACHE;
  const map = new Map<string, ClubDef>();
  for (const league of REAL_LEAGUES) {
    const ranked = league.clubs
      .map(name => ({ name, xi: bakedXIAvg(name) ?? STRENGTH_PRIORS[name] ?? 65 }))
      .sort((a, b) => b.xi - a.xi);
    ranked.forEach((entry, i) => {
      const roster = CM_ROSTERS[entry.name] ?? [];
      const squadValue = roster.reduce((s, p) => s + p.v, 0);
      const budget = Math.min(200, Math.max(8, Math.round(squadValue * 0.16)));
      const tier: 1 | 2 | 3 | 4 = entry.xi >= 87 ? 1 : entry.xi >= 83 ? 2 : entry.xi >= 78 ? 3 : 4;
      map.set(entry.name, {
        name: entry.name,
        tier,
        color: CLUB_COLORS[entry.name] ?? '#8899aa',
        budget,
        expectation: i + 1,
      });
    });
  }
  CLUB_DEF_CACHE = map;
  return map;
}

/** Every playable club (all five real leagues), strongest first. */
export function playableClubs(leagueId: string): ClubDef[] {
  const league = REAL_LEAGUES.find(l => l.id === leagueId) ?? REAL_LEAGUES[0];
  return league.clubs
    .map(name => clubDefMap().get(name))
    .filter((c): c is ClubDef => !!c)
    .sort((a, b) => a.expectation - b.expectation);
}

/** ClubDef for any playable club, with a safe fallback for odd save states. */
export function clubDefFor(name: string): ClubDef {
  return clubDefMap().get(name)
    ?? CLUBS.find(c => c.name === name)
    ?? { name, tier: 4, color: '#8899aa', budget: 20, expectation: 10 };
}

const CUP_ORDER: CupRound[] = ['R16', 'QF', 'SF', 'F'];
const CUP_LABELS: Record<CupRound, string> = {
  R16: 'Round of 16', QF: 'Quarter-final', SF: 'Semi-final', F: 'Final',
};
const UCL_ORDER: UclKoRound[] = ['QF', 'SF', 'F'];
const UCL_LABELS: Record<UclKoRound, string> = {
  QF: 'Quarter-final', SF: 'Semi-final', F: 'Final',
};

const SAVE_KEY = 'dukb-club-manager-save';
// v2 (2026-08-05): real leagues replaced the fictional World Super League;
// old saves carry a 20-club fictional table and must start fresh.
// v3 (2026-08-13, Round 70): every club in the big five leagues is playable
// with real 2026 rosters and market values, ratings moved to the 48-94 value
// curve, and the board now sets multiple objectives. Old saves carry
// old-curve squads that would be ~10 points weak against the new strengths,
// so they must start fresh.
const SAVE_VERSION = 3;

/** The most players you are allowed on the books. Signings have always checked
 *  this; Round 132 makes the summer rollover respect it too. */
export const SQUAD_LIMIT = 30;

/**
 * How far the club will top its own squad up to over the summer, out of the
 * thirty you are allowed. The six slots above this are YOURS, and leaving them
 * clear is not a nicety: the first version let the automatic intake fill the
 * books all the way to thirty, which meant promoteProspect started refusing
 * and simAcademy went red because an engaged manager finished six seasons with
 * 0.8 academy graduates instead of four or five. The club covers itself, the
 * manager still does the signing.
 */
const AUTO_SQUAD_TARGET = 22;

/* ================================================================== */
/* Small utilities                                                    */
/* ================================================================== */

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
const ri = (lo: number, hi: number): number => lo + Math.floor(Math.random() * (hi - lo + 1));
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function slug(name: string): string {
  return foldSpecialLatin(name.toLowerCase()).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-');
}

/** £-formatted money in millions: money(180) -> '£180m', money(0.6) -> '£600k'. */
export function money(n: number): string {
  if (n >= 1000) {
    const bn = n / 1000;
    return `£${Number.isInteger(bn) ? bn : bn.toFixed(1)}bn`;
  }
  if (n >= 1) {
    const m = Math.round(n * 10) / 10;
    return `£${Number.isInteger(m) ? m : m.toFixed(1)}m`;
  }
  return `£${Math.max(0, Math.round(n * 1000))}k`;
}

export function confidenceLabel(conf: number): string {
  if (conf >= 80) return 'Untouchable';
  if (conf >= 60) return 'Secure';
  if (conf >= 45) return 'Steady';
  if (conf >= 30) return 'Under pressure';
  if (conf >= 15) return 'On the brink';
  return 'Dead man walking';
}

/* ================================================================== */
/* Player pool + squads                                               */
/* ================================================================== */

let POOL_CACHE: Player[] | null = null;

/** players.ts deduplicated by name (first entry wins). */
function getPool(): Player[] {
  if (!POOL_CACHE) {
    const seen = new Set<string>();
    POOL_CACHE = RAW_POOL.filter(p => {
      if (!p.name || seen.has(p.name)) return false;
      seen.add(p.name);
      return true;
    });
  }
  return POOL_CACHE;
}

export function clubByName(name: string): ClubDef | null {
  return clubDefMap().get(name) ?? CLUBS.find(c => c.name === name) ?? null;
}

/** Average rating of the club's best XI (baked rosters first, then pool). */
export function clubPreviewRating(clubName: string): number {
  const baked = bakedXIAvg(clubName);
  if (baked !== null) return Math.round(baked);
  const ratings = getPool()
    .filter(p => p.club === clubName)
    .map(playerRating)
    .sort((a, b) => b - a)
    .slice(0, 11);
  while (ratings.length < 11) ratings.push(66);
  return Math.round(ratings.reduce((s, r) => s + r, 0) / 11);
}

const POS_DEF: Position[] = ['CB', 'LB', 'RB', 'LWB', 'RWB'];
const POS_MID: Position[] = ['CDM', 'CM', 'CAM', 'LM', 'RM'];
const POS_ATT: Position[] = ['LW', 'RW', 'ST', 'CF'];

type PosGroup = 'GK' | 'DEF' | 'MID' | 'ATT';

function groupOf(pos: Position): PosGroup {
  if (pos === 'GK') return 'GK';
  if (POS_DEF.includes(pos)) return 'DEF';
  if (POS_MID.includes(pos)) return 'MID';
  return 'ATT';
}

const YOUTH_FIRST = [
  'Jamie', 'Leo', 'Sam', 'Alfie', 'Marco', 'Theo', 'Noah', 'Kofi', 'Mats', 'Diego',
  'Enzo', 'Luca', 'Tyler', 'Oscar', 'Ravi', 'Jude', 'Milo', 'Andres', 'Yusuf', 'Kaan',
];
const YOUTH_LAST = [
  'Weston', 'Okafor', 'Silva', 'Berg', 'Keane', 'Moretti', 'Dubois', 'Novak', 'Ferreira', 'Vargas',
  'Sato', 'Hansen', 'Adeyemi', 'Costa', 'Petrov', 'Walsh', 'Kimura', 'Marchetti', 'Diallo', 'Reyes',
];

let youthSeq = 0;

// Round 70: youth pads sit at 55-68 so they slot below a club's real players
// on the new value curve instead of outranking half the squad.
function makeYouth(position: Position, minRating = 55, maxRating = 68): CMPlayer {
  youthSeq += 1;
  const name = `${pick(YOUTH_FIRST)} ${pick(YOUTH_LAST)} (Youth)`;
  return {
    id: `youth-${Date.now().toString(36)}-${youthSeq}-${ri(100, 999)}`,
    name,
    position,
    rating: ri(minRating, maxRating),
    age: ri(17, 19),
    fitness: 100,
    morale: 72,
    injuryWeeks: 0,
    suspendedMatches: 0,
    isYouth: true,
    seasonGoals: 0,
    seasonAssists: 0,
  };
}

function toCMPlayer(p: Player): CMPlayer {
  return {
    id: `p-${slug(p.name)}`,
    name: p.name,
    position: p.position,
    rating: playerRating(p),
    age: p.age || 25,
    fitness: 100,
    morale: 70,
    injuryWeeks: 0,
    suspendedMatches: 0,
    isYouth: false,
    seasonGoals: 0,
    seasonAssists: 0,
  };
}

/**
 * Round 70: a squad player from the baked real-roster data.
 * Round 132: which is now the PROJECTED real-roster data, so it may be a real
 * footballer aged forward or a player this game invented. `g` rides all the
 * way through to the squad screen either way.
 */
function bakedToCMPlayer(b: BakedPlayer | ProjectedPlayer): CMPlayer {
  const gen = (b as ProjectedPlayer).g === true;
  return {
    id: `p-${slug(b.n)}`,
    name: b.n,
    position: b.p,
    rating: b.r,
    age: b.a,
    fitness: 100,
    morale: 70,
    injuryWeeks: 0,
    suspendedMatches: 0,
    isYouth: false,
    seasonGoals: 0,
    seasonAssists: 0,
    value: b.v,
    generated: gen || undefined,
  };
}

/** Tops a squad up with youth so it has positional coverage + at least 16 players. */
function ensureSquadCoverage(squad: CMPlayer[]): CMPlayer[] {
  const out = [...squad];
  const need: Record<PosGroup, number> = { GK: 2, DEF: 5, MID: 5, ATT: 4 };
  const fill: Record<PosGroup, Position[]> = {
    GK: ['GK'],
    DEF: ['CB', 'CB', 'RB', 'LB', 'CB'],
    MID: ['CM', 'CDM', 'CAM', 'CM', 'CM'],
    ATT: ['ST', 'RW', 'LW', 'ST'],
  };
  (['GK', 'DEF', 'MID', 'ATT'] as PosGroup[]).forEach(gr => {
    let count = out.filter(p => groupOf(p.position) === gr).length;
    let i = 0;
    while (count < need[gr]) {
      out.push(makeYouth(fill[gr][i % fill[gr].length]));
      count += 1;
      i += 1;
    }
  });
  while (out.length < 16) {
    out.push(makeYouth(pick([...POS_DEF, ...POS_MID, ...POS_ATT])));
  }
  return out;
}

function buildSquad(clubName: string, yearsOnNow = 0): CMPlayer[] {
  // Round 70: baked real rosters first (with real market values); the old
  // static pool only backs up clubs outside the bake. Round 72: cap the
  // start at the 26 most valuable so deep baked squads (Real Madrid has 29
  // dataset players) leave room under the 30-man limit to actually sign
  // people. Round 132: at yearsOn 0 the projection IS the bake, so a career
  // in the current era gets exactly the squad it always got.
  const baked = projectedRoster(clubName, yearsOnNow);
  const real = baked.length
    ? baked.slice(0, 26).map(bakedToCMPlayer)
    : getPool().filter(p => p.club === clubName).map(toCMPlayer);
  return ensureSquadCoverage(real);
}

/* ================================================================== */
/* Availability, XI + table helpers                                   */
/* ================================================================== */

export function isAvailable(p: CMPlayer): boolean {
  return p.injuryWeeks <= 0 && p.suspendedMatches <= 0;
}

export function autoPickXI(squad: CMPlayer[], formation: Formation): (string | null)[] {
  const used = new Set<string>();
  const xi: (string | null)[] = [];
  for (const slot of formation.slots) {
    const fits = squad
      .filter(p => isAvailable(p) && !used.has(p.id) && slot.allowed.includes(p.position))
      .sort((a, b) => b.rating - a.rating);
    let chosen: CMPlayer | null = fits[0] ?? null;
    if (!chosen) {
      const any = squad
        .filter(p => isAvailable(p) && !used.has(p.id))
        .sort((a, b) => b.rating - a.rating);
      chosen = any[0] ?? null;
    }
    if (chosen) {
      used.add(chosen.id);
      xi.push(chosen.id);
    } else {
      xi.push(null);
    }
  }
  return xi;
}

export function resolveXI(career: CareerState): (CMPlayer | null)[] {
  return career.xiIds.map(id => (id ? career.squad.find(p => p.id === id) ?? null : null));
}

export function xiAverageRating(career: CareerState): number {
  const ps = resolveXI(career).filter((p): p is CMPlayer => !!p);
  if (!ps.length) return 0;
  return Math.round(ps.reduce((s, p) => s + p.rating, 0) / ps.length);
}

function emptyRow(club: string): TableRow {
  return { club, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
}

export function sortedTable(rows: TableRow[]): TableRow[] {
  return [...rows].sort((a, b) =>
    b.pts - a.pts ||
    (b.gf - b.ga) - (a.gf - a.ga) ||
    b.gf - a.gf ||
    a.club.localeCompare(b.club));
}

export function leaguePosition(career: CareerState): number {
  return sortedTable(career.table).findIndex(r => r.club === career.clubName) + 1;
}

/* ================================================================== */
/* Transfer market                                                    */
/* ================================================================== */

/**
 * £m value from rating + age. The rating half inverts squadDeal's
 * playerRating log-curve so value round-trips with the source data;
 * age then scales it (prospects premium, veterans discount).
 */
function baseValue(rating: number, age: number): number {
  const mv = Math.pow(10, ((rating - 35) * Math.log10(1001)) / 64) - 1;
  const ageF =
    age <= 21 ? 1.3 :
    age <= 24 ? 1.15 :
    age <= 28 ? 1.0 :
    age <= 31 ? 0.7 :
    age <= 34 ? 0.4 : 0.2;
  return Math.max(0.5, mv * ageF);
}

function priceOf(rating: number, age: number): number {
  return Math.max(1, Math.round(baseValue(rating, age) * 1.15));
}

/**
 * Round 70: asking price anchored on the REAL market value when we have it
 * (his complaint: "values are extremely high"). Selling clubs want a premium
 * for prospects and knock a little off for the over-30s.
 */
function askingPrice(value: number, age: number): number {
  const f = age <= 23 ? 1.25 : age <= 29 ? 1.1 : 0.9;
  return Math.max(0.5, Math.round(value * f * 10) / 10);
}

/* ================================================================== */
/* Round 105: contracts and wages                                     */
/* ================================================================== */

/**
 * Weekly wage in thousands, from what he is worth. Deliberately a curve, not
 * a line: the gap between an 80 and a 90 in wages is far bigger than the gap
 * between a 60 and a 70, which is exactly how a real wage bill gets away
 * from a club.
 */
export function wageFor(p: CMPlayer): number {
  const v = p.value ?? Math.max(0.5, baseValue(p.rating, p.age));
  const base = Math.pow(v, 0.72) * 3.6;
  const youth = p.isYouth ? 0.25 : 1;
  return Math.max(1, Math.round(base * youth));
}

/** The whole weekly wage bill, in thousands. */
export function wageBill(career: CareerState): number {
  return career.squad.reduce((s, p) => s + (p.wage ?? wageFor(p)), 0);
}

/**
 * What the board will tolerate. Derived from the squad you were HANDED, plus
 * about fifteen percent of headroom, rather than from the transfer budget.
 * That was the first version and it was wrong at every club: a transfer
 * budget and a weekly wage bill are not on the same scale, so every single
 * side in the game started two to three hundred percent over its own cap and
 * the constraint was meaningless from the first minute. Anchoring on the
 * real bill means the cap is honest everywhere, from Manchester City to
 * Inter Miami, and it starts biting exactly when you start buying.
 */
export function wageCapFrom(bill: number): number {
  return Math.max(60, Math.round(bill * 1.15));
}

/**
 * Round 105: a save made before contracts existed hands out sensible ones
 * rather than showing everybody on zero years. Staggered on a name hash so a
 * squad does not all expire in the same summer.
 */
/* ================================================================== */
/* Round 132: the world clock                                         */
/* ================================================================== */

/**
 * Puts a clock on a save that never had one, and does nothing at all the
 * second time it is called.
 *
 * Round 127 learned the hard way that repairing only inside playNextEntry is
 * not enough, because a screen can be opened before a ball is kicked, so this
 * runs at the top of playNextEntry AND inside loadCareer AND at the top of
 * every screen level accessor that depends on it. A pre Round 132 save has no
 * startYear, and the only honest answer for one is the year its squads were
 * baked from, which is 2026: that save WAS the current era, it just did not
 * know it. So it carries on in the current era with the world aged forward
 * from the season it is already on, which is exactly what a save started fresh
 * today would do.
 */
export function ensureClock(state: CareerState): void {
  if (typeof state.startYear !== 'number' || !Number.isFinite(state.startYear)) {
    state.startYear = CM_BASE_YEAR;
  }
  if (!state.eraId || !CM_ERAS.some(e => e.id === state.eraId)) {
    state.eraId = CM_ERAS.find(e => e.startYear === state.startYear)?.id ?? DEFAULT_ERA_ID;
  }
  if (!Array.isArray(state.retiredNames)) state.retiredNames = [];
  if (!Array.isArray(state.retiredLastSummer)) state.retiredLastSummer = [];
}

/** The calendar year this season is being played in. */
export function worldYear(career: CareerState): number {
  const start = typeof career.startYear === 'number' ? career.startYear : CM_BASE_YEAR;
  return start + Math.max(0, career.season - 1);
}

/** How far the world has moved from the real baked roster year. */
export function yearsOn(career: CareerState): number {
  return Math.max(0, worldYear(career) - CM_BASE_YEAR);
}

/** "2031-32", for anywhere a season number is shown. */
export function worldSeasonLabel(career: CareerState): string {
  return seasonLabel(worldYear(career));
}

export function ensureContracts(state: CareerState): void {
  for (const p of state.squad) {
    if (p.wage === undefined) p.wage = wageFor(p);
    if (p.contractYears === undefined) {
      let h = 0;
      for (let i = 0; i < p.name.length; i++) h = ((h * 31) + p.name.charCodeAt(i)) >>> 0;
      p.contractYears = 1 + (h % 4);
    }
  }
  if (state.wageCap === undefined) state.wageCap = wageCapFrom(wageBill(state));
}

/** What he wants to sign again: longer and dearer the better he is. */
export function renewalTerms(p: CMPlayer): { years: number; wage: number; fee: number } {
  const current = p.wage ?? wageFor(p);
  const market = wageFor(p);
  // A player in form and in his prime knows it. An over-30 takes what he can.
  const leverage = p.age <= 23 ? 1.15 : p.age <= 29 ? 1.3 : 0.95;
  const wage = Math.max(1, Math.round(Math.max(current, market) * leverage));
  /* Round 132: the shortest deal you can hand anybody is two years, and the
     reason is a bug this round found by accident while measuring what happens
     to a thirty three year old. Contract years tick down at the summer
     rollover, BEFORE the season is played, so a deal signed at one year went
     straight to zero at the next rollover and the player walked without ever
     kicking a ball under it. Measured on the shipped engine: renewing every
     expiring player every season for twelve seasons, Mohamed Salah still left
     Liverpool in season four and no player aged thirty two or over could be
     kept by ANY club under ANY circumstances. Two years here means one year
     signed is one year played, which is what the screen has always implied. */
  const years = p.age >= 32 ? 2 : p.age >= 29 ? 2 : 4;
  // Signing on fee, out of the transfer budget, in millions.
  const fee = Math.max(0.1, Math.round(wage * years * 0.045 * 10) / 10);
  return { years, wage, fee };
}

/** Sign him again. Costs the fee up front and resets his deal. */
export function renewContract(career: CareerState, playerId: string): CareerState | null {
  const p = career.squad.find(x => x.id === playerId);
  if (!p || p.onLoan) return null;
  const terms = renewalTerms(p);
  if (terms.fee > career.budget) return null;
  return {
    ...career,
    budget: Math.round((career.budget - terms.fee) * 10) / 10,
    squad: career.squad.map(x => (
      x.id === playerId
        ? { ...x, contractYears: terms.years, wage: terms.wage, morale: clamp(x.morale + 9, 5, 99) }
        : x
    )),
  };
}

/** Everyone in the last year of his deal, worst case first. */
export function expiringPlayers(career: CareerState): CMPlayer[] {
  return career.squad
    .filter(p => !p.onLoan && (p.contractYears ?? 9) <= 1)
    .sort((a, b) => b.rating - a.rating);
}

/* ================================================================== */
/* Round 127: squad roles, playing time promises, the dressing room   */
/* ================================================================== */

/**
 * What we know he is, with a sensible answer for a player who has not been
 * given a rung yet (a signing who arrived this morning, a kid just promoted).
 */
export function roleOf(p: CMPlayer): SquadRole {
  if (p.role) return p.role;
  return p.isYouth || p.age <= 19 ? 'prospect' : 'rotation';
}

/** How many matches of his last ten we need before anybody starts counting. */
export const PROMISE_WINDOW_MIN = 4;
/** How long the window is. Ten games is the unit football already thinks in. */
export const PROMISE_WINDOW = 10;

/**
 * The share of his last ten he was actually involved in, or null if there is
 * not enough of a run yet to say anything. A match he was injured or banned
 * for never entered the window in the first place.
 */
export function playingShare(p: CMPlayer): number | null {
  const w = p.lastTen ?? [];
  if (w.length < PROMISE_WINDOW_MIN) return null;
  return w.reduce((s, x) => s + x, 0) / w.length;
}

/**
 * Promise minus reality. Positive means he is playing more than he was
 * told he would, negative means you are not keeping your end of it.
 */
export function promiseGap(p: CMPlayer): number {
  const share = playingShare(p);
  if (share === null) return 0;
  return share - ROLE_INFO[roleOf(p)].share;
}

/** The gap in words, because a decimal means nothing to anybody. */
export function promiseMood(p: CMPlayer): { text: string; tone: 'good' | 'ok' | 'bad' | 'none' } {
  if (playingShare(p) === null) return { text: 'Too early to say', tone: 'none' };
  const gap = promiseGap(p);
  if (gap >= 0.2) return { text: 'Delighted', tone: 'good' };
  if (gap >= -0.08) return { text: 'Happy enough', tone: 'good' };
  if (gap >= -0.2) return { text: 'Getting restless', tone: 'ok' };
  if (gap >= -0.4) return { text: 'Not happy', tone: 'bad' };
  return { text: 'Furious', tone: 'bad' };
}

/**
 * The rung he reckons he has earned, off where he sits in this dressing room.
 *
 * This exists because without it the whole system has a hole straight through
 * the middle of it, and the hole was found by measuring rather than by
 * thinking about it. If happiness reads nothing but minutes against the
 * promise, then the winning move is to tell your entire first eleven they are
 * backups and then play them every week: they are all wildly over-delivering
 * against what they were told, so they are all delighted, and it costs
 * nothing. Measured over forty seasons that exploit was worth three and a half
 * league points and eight fewer sackings.
 *
 * Football does not work like that and neither do the games this borrows from.
 * Telling your best player he is a squad man is an insult on its own, whatever
 * minutes he ends up getting. So a rung below the one his football says he has
 * earned is a standing drag every single week, and it is deliberately big
 * enough to swallow the whole of the over-delivery bonus.
 *
 * A teenager is softer about it. He is nineteen, he will take a rung below
 * what his rating says and be glad of it.
 */
function deservedFromRank(rank: number, p: CMPlayer): SquadRole {
  if (p.isYouth) return 'prospect';
  const base: SquadRole = rank <= 1 ? 'star' : rank <= 7 ? 'key' : rank <= 13 ? 'rotation' : 'backup';
  if (p.age <= 19) return ROLE_LADDER[Math.min(ROLE_LADDER.indexOf(base) + 1, ROLE_LADDER.length - 1)];
  return base;
}

/** Rating rank among the senior players on the books, best first. */
function seniorRanks(squad: CMPlayer[]): Map<string, number> {
  const out = new Map<string, number>();
  squad
    .filter(x => !x.onLoan && !x.isYouth)
    .sort((a, b) => b.rating - a.rating)
    .forEach((x, i) => out.set(x.id, i));
  return out;
}

export function deservedRole(career: CareerState, p: CMPlayer): SquadRole {
  const rank = seniorRanks(career.squad).get(p.id);
  return deservedFromRank(rank === undefined ? 99 : rank, p);
}

/** Rungs below what he thinks he has earned. Negative means you flattered him. */
export function standingGap(career: CareerState, p: CMPlayer): number {
  return ROLE_LADDER.indexOf(roleOf(p)) - ROLE_LADDER.indexOf(deservedRole(career, p));
}

/**
 * Round 127: a save made before roles existed gets a squad that agrees with
 * itself, and running it twice changes nothing. Same house pattern as
 * ensureContracts and ensureAcademy.
 *
 * The default ladder is built off THE ELEVEN, not off raw ratings, and the
 * difference between those two turned out to be the whole ball game. Ranking a
 * squad by rating and handing the top eight the top rungs looks sensible and
 * is wrong, because a squad's seventh best player is very often a third
 * striker who is never going to start ahead of the two in front of him. Doing
 * it that way, measured over forty Everton seasons, produced an average of
 * 5.9 transfer requests a season in a save where the manager had done nothing
 * at all, which is the exact complaint players of the big licensed football
 * career mode make about it on that publisher's own forum. Off the
 * eleven instead, the squad you are handed on day one is one that agrees with
 * the team you are going to pick, and nobody is furious before a ball is
 * kicked. That is Round 105's lesson again: anchor on the squad you were
 * handed, not on a number that happens to be nearby.
 */
export function ensureRoles(state: CareerState): void {
  const missing = state.squad.filter(p => !p.role);
  if (missing.length) {
    const formation = FORMATIONS[state.formationIndex] ?? FORMATIONS[0];
    const picked = state.xiIds.filter((id): id is string => !!id);
    const xiIds = picked.length >= 11
      ? picked
      : autoPickXI(state.squad, formation).filter((id): id is string => !!id);
    const inXi = new Set(xiIds);
    const xiRanked = state.squad
      .filter(p => inXi.has(p.id))
      .sort((a, b) => b.rating - a.rating)
      .map(p => p.id);
    const topThree = new Set(xiRanked.slice(0, 3));
    /* Outside the eleven: the four best of them are the rotation, everybody
       else is cover, and a teenager who is nowhere near the side is a
       prospect. A freshly repaired save therefore has nobody in it who is
       more than one rung below what he thinks he has earned, which is inside
       the tolerance the pride drag allows. That invariant is worth keeping: it
       is the difference between a dressing room you have to manage and a
       dressing room that was already on fire when they handed you the keys. */
    const outside = state.squad
      .filter(p => !inXi.has(p.id) && !p.onLoan)
      .sort((a, b) => b.rating - a.rating)
      .map(p => p.id);
    const rotationIds = new Set(outside.slice(0, 4));
    for (const p of missing) {
      if (inXi.has(p.id)) p.role = topThree.has(p.id) ? 'star' : 'key';
      else if (p.isYouth) p.role = 'prospect';
      else if (rotationIds.has(p.id)) p.role = 'rotation';
      else if (p.age <= 19) p.role = 'prospect';
      else p.role = 'backup';
    }
  }
  for (const p of state.squad) {
    if (!Array.isArray(p.lastTen)) p.lastTen = [];
  }
}

/**
 * What it costs to go back on what you told him, in millions.
 *
 * Anchored on his WAGE, not on the transfer budget, which is the mistake
 * Round 105 made once already: a transfer budget and a weekly wage are not on
 * the same scale. A settlement is six weeks of his money per rung you drop
 * him, so telling a two hundred grand a week star he is now a rotation option
 * costs about two and a half million, and doing the same to a squad man on
 * fifteen grand costs almost nothing. Moving a player UP costs no money at
 * all, because the bill for that arrives later, in minutes you now owe him.
 */
export function roleChangeCost(p: CMPlayer, to: SquadRole): number {
  const from = ROLE_LADDER.indexOf(roleOf(p));
  const next = ROLE_LADDER.indexOf(to);
  if (next <= from) return 0;
  const wage = p.wage ?? wageFor(p);
  return Math.max(0.1, Math.round((wage * 6 * (next - from)) / 1000 * 10) / 10);
}

/**
 * Move him up or down the ladder.
 *
 * Up is free and he is delighted, and from that moment you owe him the
 * minutes. Down costs a settlement out of the transfer budget and wounds him,
 * and the better and happier he was the more it wounds, so a mistake is
 * recoverable without being free. Returns null if you cannot afford it.
 */
export function setSquadRole(career: CareerState, playerId: string, to: SquadRole): CareerState | null {
  const p = career.squad.find(x => x.id === playerId);
  if (!p) return null;
  if (p.onLoan) return null;
  const current = roleOf(p);
  if (current === to) return null;
  const from = ROLE_LADDER.indexOf(current);
  const next = ROLE_LADDER.indexOf(to);
  const cost = roleChangeCost(p, to);
  if (cost > career.budget) return null;

  const rungs = Math.abs(next - from);
  let moraleDelta: number;
  if (next < from) {
    // Promoted. A nice moment, and deliberately small: you cannot buy a happy
    // dressing room by making everybody a star, because the bill lands in
    // ten matches time when none of them are playing.
    moraleDelta = 3 + rungs * 2;
  } else {
    // Demoted. Worse the higher he was and the happier he had been.
    moraleDelta = -(6 + rungs * 4 + (p.rating >= 78 ? 5 : 0) + (p.morale >= 70 ? 3 : 0));
  }

  return {
    ...career,
    budget: Math.round((career.budget - cost) * 10) / 10,
    squad: career.squad.map(x => (
      x.id === playerId
        ? {
            ...x,
            role: to,
            morale: clamp(x.morale + moraleDelta, 5, 99),
            /* Sitting down and renegotiating takes the request off the table.
               It does not solve anything on its own: if the new arrangement is
               just as broken as the old one he will hand in another. */
            wantsOut: undefined,
          }
        : x
    )),
  };
}

/** Everyone on the books, grouped by rung, best first, for the dressing room screen. */
export function squadByRole(career: CareerState): { role: SquadRole; players: CMPlayer[] }[] {
  return ROLE_LADDER.map(role => ({
    role,
    players: career.squad
      .filter(p => !p.onLoan && roleOf(p) === role)
      .sort((a, b) => b.rating - a.rating),
  }));
}

/** The players you are letting down, worst first. Drives the tile and the screen. */
export function brokenPromises(career: CareerState): CMPlayer[] {
  return career.squad
    .filter(p => !p.onLoan && promiseGap(p) <= -0.15)
    .sort((a, b) => promiseGap(a) - promiseGap(b));
}

/**
 * The morale swing a match is worth to one player, purely on the gap between
 * what he was told and what he is getting.
 *
 * Breaking it stings harder than keeping it pleases, which is both how people
 * work and how both games this borrows from behave. The clamp matters as much
 * as the multiplier: a win already moves everybody by five and a defeat by
 * six, so this had to land in the same neighbourhood rather than drowning the
 * results out. A star who has not played any of his last ten loses four and a
 * half a week on top of the result, so two months on the bench genuinely
 * finishes him. A backup playing every week gains about two and a half.
 */
function promiseMoraleDelta(p: CMPlayer, standing: number): number {
  const gap = promiseGap(p);
  const minutes = gap === 0 ? 0 : clamp(gap >= 0 ? gap * 3.2 : gap * 5.6, -4.5, 2.5);
  /* Pride. A rung below what he has earned drags on him every week whatever
     his minutes look like, and it is set to swallow the whole over-delivery
     bonus so that under-promising can never be farmed. A rung ABOVE what he
     has earned is worth a little, because being told you are the main man is
     nice, but not as much as the extra football you now owe him costs. */
  const pride = standing > 0
    ? clamp(-1.6 * (standing - 0.5), -4.5, 0)
    : clamp(-0.3 * standing, 0, 0.6);
  return minutes + pride;
}

/* ================================================================== */
/* Round 135: the microphone and the dressing room                    */
/* ================================================================== */

/**
 * Two jobs a manager does that this game had no room for at all.
 *
 * Everything Club Manager has built for twelve rounds happens in a menu. You
 * buy, you sell, you set a shape, you tell a man where he stands, and morale
 * and board confidence move underneath you as a RESULT. The other half of the
 * job is talking: to a room full of reporters on a Friday, and to eleven men in
 * a dressing room at ten to four. Neither existed, so the emotional side of
 * management was a thing that happened TO you.
 *
 * What the research turned up, and what it changed:
 *
 * TEAM TALKS. The management sims that do this properly all run the same
 * shape: a TONE, from taking the pressure off at one end to a full blast at the
 * other, and the right tone is a function of the situation rather than a
 * setting you find once and keep. The written guidance for those games is
 * consistent and specific about it. Take the pressure off when you are at a
 * better side. Be demanding when you are the favourite, because complacency is
 * what beats you. Passion is the safe middle and belongs in a game between
 * equals. And the full blast only ever works when the side genuinely
 * underperformed, not merely when it is losing, because a squad already on the
 * floor cannot be shouted up off it. One line from that guidance is worth
 * writing straight into the design: NO REACTION IS BETTER THAN A BAD REACTION.
 * Getting it wrong has to cost more than getting it right pays, or the safe
 * play is to hammer the same button every week.
 *
 * The same games also agree that words wear out. Repeating a shout match after
 * match stops moving anybody, which is why TALK_STALE_AFTER exists.
 *
 * PRESS CONFERENCES. Here the research was mostly a list of what NOT to do. The
 * loudest complaint about press conferences in both of the big management games
 * is the same complaint, in the same words: there is one right answer and you
 * click it every week. Written guides for the current versions say it outright,
 * that you can safely pick the second positive option forever, and that the
 * humble answers have downsides and no upsides. A question whose answer never
 * changes is not a decision, it is a toll booth, and after twenty seasons of it
 * anybody would delegate the whole thing and never look at it again.
 *
 * So the shape here is deliberately the opposite. The questions are built from
 * what has actually happened in YOUR save, and every answer spends one thing to
 * buy another. Backing your players publicly lifts the dressing room and costs
 * you with the board. Calling them out buys board patience with dressing room
 * morale. Taking it on yourself keeps everybody happy today and hands the press
 * a manager under pressure, which makes every future bad result read worse
 * upstairs. Talking your side up before a derby fires the other lot up.
 * Which one is right depends entirely on which of those three things is about
 * to kill you, and that changes week to week.
 */

/** How you said it. Four rungs from an arm round the shoulder to a blast. */
export type TalkTone = 'calm' | 'rally' | 'demand' | 'blast';

export interface TalkToneDef {
  id: TalkTone;
  label: string;
  emoji: string;
  /** One line, in the words a manager would use. */
  blurb: string;
}

/**
 * Ordered SOFTEST FIRST, and the order is load bearing: the fit of a talk is
 * how close its rung is to what the situation is asking for, so these have to
 * sit on a line rather than in a set.
 */
export const TALK_TONES: TalkToneDef[] = [
  { id: 'calm', label: 'Calm them', emoji: '\u{1F9CA}', blurb: 'No pressure. Play your football and see where it takes you.' },
  { id: 'rally', label: 'Fire them up', emoji: '\u{1F525}', blurb: 'Passion. Do it for each other and for the people in the stands.' },
  { id: 'demand', label: 'Demand more', emoji: '\u{1F4E3}', blurb: 'Standards. This is what you are paid for, so go and show me.' },
  { id: 'blast', label: 'Hairdryer', emoji: '\u{1F4A2}', blurb: 'Both barrels. Risky, and only ever right when they deserve it.' },
];

export const TALK_ORDER: TalkTone[] = ['calm', 'rally', 'demand', 'blast'];

/**
 * How far off you can be before a talk stops helping and starts hurting.
 *
 * One rung is the zero line: dead on is worth the full swing, one rung out does
 * nothing at all, two rungs out is the full negative. That is the "no reaction
 * beats a bad reaction" rule made concrete.
 *
 * It started at one and a half, and the measurement is worth keeping because it
 * is exactly the failure this round was told to watch for. At 1.5 a tone one
 * rung off the mark still scored plus a third, and since the situation asks for
 * something in the middle of the ladder most weeks, that made EVERY tone a free
 * gain. Measured over eighty Everton seasons an arm: saying nothing was worth
 * 42.3 points, and hammering the same button all season was worth 46.9 on calm,
 * 45.4 on rally, 48.0 on demand and 43.7 on blast. Four dominant strategies, no
 * judgement required, which is precisely the complaint every guide written
 * about the big management games makes about their press conferences.
 */
const TALK_TOLERANCE = 1;

/** Match strength a perfectly judged talk is worth, in rating points. */
const TALK_EDGE = 0.95;

/**
 * Morale a perfectly judged talk is worth to the men who heard it.
 *
 * Small on purpose, and the reason is arithmetic rather than taste. There are
 * about fifty fixtures in a season and up to two talks in each of them, so
 * anything that adds a flat number to every player every week compounds into a
 * squad pinned at the ceiling by Christmas. Measured before this round: the
 * full morale range from floor to ceiling is worth 17.8 league points at
 * Everton and 16.8 at Manchester City, so a lever that moves morale freely
 * moves the whole game. This one is scaled by HEADROOM, so a delighted squad
 * cannot be talked any higher and a squad already on the floor cannot be talked
 * any lower, which gives the two arms an equilibrium instead of both of them
 * drifting into a clamp.
 */
const TALK_MORALE = 0.52;

/**
 * What an ordinary Saturday looks like, in rating points of advantage.
 *
 * MEASURED, not assumed, and it has to be. My XI's strength and an AI club's
 * strength are two different scales that the match engine has always compared
 * directly, and the human side sits systematically above the other one: over
 * 1,572 fixtures across six clubs and thirty six seasons the median advantage
 * going into a match was 7.03 points, quartiles 0.56 and 13.62. Judging
 * "are you the favourite here" against zero would therefore have called you the
 * favourite in three matches out of four, at Burnley as well as at Real Madrid,
 * and the answer to every team talk would have been the same one. So a
 * favourite is a club ahead of the USUAL gap, not a club ahead of nothing.
 * Round 105's rule, again: anchor on what you measured, not on the number that
 * happens to be lying nearby.
 */
const EDGE_LEVEL = 7;

/** Same tone this many times running and it stops landing. */
const TALK_STALE_AFTER = 3;
/** What is left of it once they have heard it too often. */
const TALK_STALE_FACTOR = 0.55;

/* ---------------- the press room ---------------- */

export type PressQuestionKind =
  | 'slump' | 'roll' | 'dropped' | 'bid' | 'derby' | 'boardHeat' | 'request' | 'bigGame';

/** One thing you can say back, and everything it costs and buys. */
export interface PressAnswer {
  label: string;
  /** Morale, to everybody on the books. */
  squad: number;
  /** Extra morale, to the player the question was about. */
  subject: number;
  /** Board confidence. */
  board: number;
  /** How the back pages take it. */
  mood: number;
  /** Talking big fires the other lot up for the next match, in rating points. */
  fire?: number;
  /** Keeping their feet on the ground sharpens your own side for it instead. */
  sharpen?: number;
  /** You have promised a result out loud. Settled at the next final whistle. */
  promise?: boolean;
  /** Saying it puts him on the transfer list there and then. */
  list?: boolean;
  /** What the papers made of it, shown once you have said it. */
  line: string;
}

export interface PressQuestion {
  id: string;
  kind: PressQuestionKind;
  /** The question, in the words a reporter in the room would use. */
  text: string;
  /** Who it is about, when it is about somebody. */
  playerId?: string;
  playerName?: string;
  options: PressAnswer[];
}

export interface PressState {
  /** 0 to 100. How the papers are treating you. 50 is nobody has an opinion. */
  mood: number;
  /** The question waiting on your desk, or nothing to answer. */
  pending: PressQuestion | null;
  /** The calendar entry the last one was put to you, so it is not every week. */
  lastWeek: number;
  /** How many you have fronted up to, and how many the assistant took. */
  answered: number;
  ducked: number;
  /** What the papers ran with last time, for the screen. */
  lastLine?: string;
  /** Rating points the next opponent has been handed by your mouth. */
  nextFire: number;
  /** Rating points your own side goes into the next match with. */
  nextSharpen: number;
  /** You told the country you would win. Settled at the next final whistle. */
  promised: boolean;
  /** The tone of the last talk you gave, and how many in a row it has been. */
  lastTone?: TalkTone | null;
  toneRun: number;
}

/** How often the press can put something to you, in calendar entries. */
const PRESS_GAP = 3;

/**
 * What not fronting up costs, in press mood, and it is deliberately tiny.
 *
 * The same number is charged whether you send your assistant or simply never
 * open the room and let the question go stale, and those two HAVE to cost the
 * same. The first version charged only the assistant, which meant a manager who
 * clicked the skip button finished a season a point and a half behind one who
 * never looked at the screen at all: the game was punishing the honest answer
 * to "I do not want to do this today" and rewarding pretending the feature did
 * not exist. Measured at Everton over a hundred seasons an arm, that was 43.1
 * points against 44.5 and eleven more sackings.
 *
 * At this size a manager who ducks every single one all season settles around a
 * press mood of thirty, which reads as "sharpening up" on the tile and costs
 * about four board confidence across a whole year. Felt, and survivable.
 */
const PRESS_NO_SHOW = 1.2;

/**
 * Round 135: a save from before any of this existed gets a press room, and
 * running it a second time changes nothing. Same house pattern as
 * ensureContracts, ensureAcademy, ensureRoles and ensureClock, and it runs in
 * loadCareer as well as playNextEntry for the reason Round 127 found out the
 * hard way: a screen can be opened before a ball is kicked.
 */
export function ensurePress(state: CareerState): void {
  /* Before the early return, not after it. This line lived at the bottom of
     the function and a save with no press room at all took the branch below and
     jumped straight out over it, so teamTalk stayed undefined, the second call
     set it and the repair was not idempotent. Every ensure in this file is
     called twice on every load; one that changes something the second time is
     a bug that only shows up as a save that will not settle. */
  if (state.teamTalk === undefined) state.teamTalk = null;
  const p = state.press;
  if (!p || typeof p !== 'object') {
    state.press = {
      mood: 50, pending: null, lastWeek: -PRESS_GAP, answered: 0, ducked: 0,
      nextFire: 0, nextSharpen: 0, promised: false, lastTone: null, toneRun: 0,
    };
    return;
  }
  if (typeof p.mood !== 'number' || !Number.isFinite(p.mood)) p.mood = 50;
  p.mood = clamp(p.mood, 0, 100);
  if (p.pending === undefined) p.pending = null;
  if (typeof p.lastWeek !== 'number') p.lastWeek = -PRESS_GAP;
  if (typeof p.answered !== 'number') p.answered = 0;
  if (typeof p.ducked !== 'number') p.ducked = 0;
  if (typeof p.nextFire !== 'number') p.nextFire = 0;
  if (typeof p.nextSharpen !== 'number') p.nextSharpen = 0;
  if (typeof p.promised !== 'boolean') p.promised = false;
  if (p.lastTone === undefined) p.lastTone = null;
  if (typeof p.toneRun !== 'number') p.toneRun = 0;
}

/** The press room, with a sensible answer for a save that has not got one yet. */
export function pressOf(career: CareerState): PressState {
  return career.press ?? {
    mood: 50, pending: null, lastWeek: -PRESS_GAP, answered: 0, ducked: 0,
    nextFire: 0, nextSharpen: 0, promised: false, lastTone: null, toneRun: 0,
  };
}

/** The mood in words, because a number out of a hundred means nothing. */
export function pressMoodLabel(mood: number): string {
  if (mood >= 78) return 'They love you';
  if (mood >= 60) return 'Onside';
  if (mood >= 42) return 'Nobody has an opinion';
  if (mood >= 25) return 'Sharpening up';
  return 'They are after you';
}

/**
 * How hard a bad result reads upstairs once the papers have had their say.
 *
 * The board do not watch every match, they read about it. A manager the press
 * are behind gets the benefit of the doubt on a defeat, and one they have
 * turned on gets it in the neck. Reaches exactly 1 at a mood of 50, which is
 * where every save starts and where a manager who never opens the press room
 * stays, so ignoring this whole feature leaves the twelve rounds of balance
 * underneath it exactly where they were. That is Round 95's rule: a multiplier
 * that cannot reach 1 is a hidden tax on playing the game.
 */
export function pressPatience(mood: number): number {
  /* Written as a swing AROUND fifty rather than as 1.15 minus a fraction,
     because the obvious form does not come out at exactly one: in binary
     floating point 1.15 - 0.15 is 0.9999999999999999, which fails the guard
     that says ignoring this feature costs nothing, and would have quietly
     nudged twelve rounds of balance in the sixteenth decimal place forever. */
  return clamp(1 + (50 - mood) * 0.003, 0.85, 1.15);
}

/* ---------------- reading the situation ---------------- */

/** Average morale of the men who will actually be on the pitch. */
function xiMood(state: CareerState, xi: CMPlayer[]): number {
  if (!xi.length) return 60;
  return xi.reduce((s, p) => s + p.morale, 0) / xi.length;
}

/**
 * How far ahead of the other lot you are, in rating points, venue included.
 *
 * Positive means you are the favourite. This is the same number the match
 * engine uses to decide the scoreline, so a talk is being judged against the
 * game that is actually about to be played rather than against a label.
 *
 * One wrinkle worth knowing about: nextFixture rounds the opponent's strength
 * to a whole number for the screen, so this can sit up to half a point away from
 * the figure the engine itself uses at kick off, which is six hundredths of a
 * rung on the tone ladder. It is far too small to change which tone is nearest
 * except on an exact tie, and it errs the safe way, because the only thing that
 * reads this rather than the raw number is the read line and the harness.
 */
export function matchEdge(career: CareerState): number | null {
  const fx = nextFixture(career);
  if (fx.kind !== 'match') return null;
  const xi = effectiveXI(career);
  const venue = fx.home === true ? 3 : fx.home === false ? -1.5 : 0;
  return myMatchStrength(career, xi) + venue - fx.oppStrength;
}

/**
 * What the situation is asking for, on the same 0 to 3 line the tones sit on.
 *
 * Every term here comes straight out of the written guidance for the games that
 * do this well, and none of it is invented. Underdog, take the pressure off.
 * Favourite, be demanding, because the thing that beats a good side against a
 * bad one is thinking it is already won. Level, passion. A squad whose heads
 * are down cannot be shouted at. And the full blast has exactly one home: a
 * side that should be winning and is not, whose players are not so far gone
 * that a rollicking finishes them off.
 */
function preMatchTarget(edge: number, mood: number, form: FormResult[]): number {
  let target = 1;
  // Underdog or favourite, graded rather than a switch, and measured against
  // what a NORMAL week looks like rather than against zero. See EDGE_LEVEL.
  target += clamp((edge - EDGE_LEVEL) / 8, -1.1, 1.1);
  // Heads down. Words that would sharpen a confident squad flatten a fragile
  // one, which is the single most common way a real team talk backfires.
  if (mood < 45) target -= 0.7;
  else if (mood > 78) target += 0.35;
  // Underperforming: losing matches you should be winning is what earns a
  // rollicking, and nothing else does.
  const recent = form.slice(-3);
  const bad = recent.filter(r => r === 'L').length;
  if (bad >= 2 && edge > EDGE_LEVEL) target += 1;
  else if (bad >= 2) target -= 0.2;
  return clamp(target, 0, 3);
}

/**
 * The same idea at the interval, where the scoreline is the loudest fact in the
 * room. Behind to a side you should be beating is the one place a blast belongs.
 */
function halftimeTarget(myGoals: number, oppGoals: number, edge: number, mood: number): number {
  let target = 1.4;
  const rel = edge - EDGE_LEVEL;
  const lead = myGoals - oppGoals;
  if (lead < 0) {
    // Behind. How hard depends entirely on whether you should be.
    target += 0.6 + clamp(rel / 5, -1.4, 1.6);
    if (lead <= -2 && rel > 0) target += 0.5;
  } else if (lead === 0) {
    target += clamp(rel / 10, -0.8, 0.9);
  } else if (lead === 1) {
    // A one goal lead is the most fragile thing in football. Steady heads, not
    // a party and not a rollicking.
    target -= 0.5;
  } else {
    // Comfortable. The job now is that nobody switches off, which is a demand
    // and not a round of applause.
    target += 0.5;
  }
  if (mood < 45) target -= 0.6;
  return clamp(target, 0, 3);
}

/**
 * How well a tone fits, from plus one (spot on) through zero (harmless) to
 * minus one (you have lost them).
 */
function talkFit(tone: TalkTone, target: number): number {
  const idx = TALK_ORDER.indexOf(tone);
  if (idx < 0) return 0;
  return clamp(1 - Math.abs(idx - target) / TALK_TOLERANCE, -1, 1);
}

/**
 * Where on the 0 to 3 line the room is right now: half time if a match is
 * paused, otherwise the Saturday coming.
 *
 * This is NOT shown anywhere on any screen and it is not meant to be. It exists
 * so the harness can pick the best and the worst tone for a situation without
 * keeping its own copy of the rules, because a harness that reimplements the
 * thing it is checking only ever proves that two copies of a bug agree.
 */
export function talkTargetNow(career: CareerState): number | null {
  const live = career.live;
  if (live) {
    const second = squadByIds(career, live.onPitch);
    const venue = live.home === true ? 3 : live.home === false ? -1.5 : 0;
    const edge = myMatchStrength(career, second) + venue - strengthOf(career, live.opponent);
    return halftimeTarget(live.myGoals, live.oppGoals, edge, xiMood(career, second));
  }
  const edge = matchEdge(career);
  if (edge === null) return null;
  const xi = effectiveXI(career);
  return preMatchTarget(edge, xiMood(career, xi), career.form);
}

/** The read before kick off, so the choice is a judgement and not a guess. */
export function preMatchRead(career: CareerState): string | null {
  const edge = matchEdge(career);
  if (edge === null) return null;
  const xi = effectiveXI(career);
  const mood = xiMood(career, xi);
  const bad = career.form.slice(-3).filter(r => r === 'L').length;
  const rel = edge - EDGE_LEVEL;
  if (bad >= 2 && rel > 0) return 'Two defeats in three, against a side you are better than. They know it and so do you.';
  if (mood < 45 && rel < 0) return 'Heads are down and this is a hard afternoon. Do not add to it.';
  if (mood < 45) return 'The dressing room is flat. Whatever you say, they are not in the mood to be shouted at.';
  if (rel >= 7) return 'You are much the better side. The only thing that beats you today is thinking it is already won.';
  if (rel <= -7) return 'They are better than you. Nobody expects anything, so there is nothing to lose.';
  if (rel >= 3) return 'Slight favourites. Enough in it that a flat start would cost you.';
  if (rel <= -3) return 'Slight underdogs. A point here would do nicely.';
  return 'Nothing between the sides. This is a game about who wants it more.';
}

/* ---------------- giving the talk ---------------- */

/** Set what you are going to say before kick off. Tap it again to take it back. */
export function setTeamTalk(career: CareerState, tone: TalkTone | null): CareerState {
  return { ...career, teamTalk: career.teamTalk === tone ? null : tone };
}

/** Say something at the interval. Tap it again and you said nothing. */
export function giveHalftimeTalk(career: CareerState, tone: TalkTone | null): CareerState {
  const state: CareerState = JSON.parse(JSON.stringify(career));
  if (state.live) state.live.talk = state.live.talk === tone ? null : tone;
  return state;
}

/**
 * What a talk is actually worth once the squad has heard it, and how tired they
 * are of hearing it. Returns the fit already scaled, so callers do not have to
 * remember the staleness rule.
 */
function talkWeight(state: CareerState, tone: TalkTone | null, target: number): number {
  if (!tone) return 0;
  const press = state.press;
  const run = press && press.lastTone === tone ? press.toneRun : 0;
  const stale = run >= TALK_STALE_AFTER ? TALK_STALE_FACTOR : 1;
  return talkFit(tone, target) * stale;
}

/** Book the tone so the next one knows whether they have heard it before. */
function noteTone(state: CareerState, tone: TalkTone | null): void {
  if (!state.press || !tone) return;
  state.press.toneRun = state.press.lastTone === tone ? state.press.toneRun + 1 : 1;
  state.press.lastTone = tone;
}

/* ---------------- the questions ---------------- */

let pressSeq = 0;

/** Nothing spicy on the desk this week. */
const PRESS_SILENCE = 'Nothing on the desk. The press only come when there is something to ask about.';

/**
 * What they want to know about, built from what has actually happened in this
 * save. If nothing has happened, nobody asks anything, which is the whole point:
 * a question that fires every single week whatever the state of the club is the
 * thing that turns this into a chore.
 */
function buildPressQuestion(state: CareerState): PressQuestion | null {
  const fx = nextFixture(state);
  const opponent = fx.kind === 'match' ? fx.opponent : null;
  const senior = state.squad.filter(p => !p.onLoan && !p.isYouth);
  const mk = (q: Omit<PressQuestion, 'id'>): PressQuestion => {
    pressSeq += 1;
    return { ...q, id: `pq-${state.season}-${state.week}-${pressSeq}` };
  };

  /* 1. Somebody has put it in writing. Loudest story in the building. */
  const wantsOut = senior.filter(p => p.wantsOut).sort((a, b) => b.rating - a.rating)[0];
  if (wantsOut) {
    return mk({
      kind: 'request', playerId: wantsOut.id, playerName: wantsOut.name,
      text: `Word is ${wantsOut.name} has asked to leave. Is he still your player?`,
      options: [
        {
          label: 'He is going nowhere', squad: 0.85, subject: 2, board: -0.65, mood: 0.5,
          line: 'You slammed the door shut in public. He is flattered. The board wanted the money.',
        },
        {
          label: 'If he wants out, he can go', squad: -0.7, subject: -8, board: 0.9, mood: 3, list: true,
          line: 'You put him on the list live on air. Ruthless, and the room respected it.',
        },
        {
          label: 'We are talking. Leave it with us', squad: 0.15, subject: 0, board: 0.1, mood: -1.5,
          line: 'You said nothing at all, at length. Tomorrow they will write it themselves.',
        },
      ],
    });
  }

  /* 2. Somebody is circling one of yours. */
  const bid = (state.incomingBids ?? [])[0];
  const target = bid ? state.squad.find(p => p.id === bid.playerId) : null;
  if (bid && target) {
    return mk({
      kind: 'bid', playerId: target.id, playerName: target.name,
      text: `${bid.club} have put ${money(bid.offer)} on the table for ${target.name}. Is he for sale?`,
      options: [
        {
          label: 'Not for sale at any price', squad: 1, subject: 6, board: -0.8, mood: 0.5,
          line: 'You told the country he is staying. He walked in this morning a foot taller.',
        },
        {
          label: 'Everyone has a price', squad: -0.55, subject: -7, board: 0.95, mood: 2,
          line: 'The board liked hearing it. He read it on his phone like everybody else.',
        },
        {
          label: 'That is between the two clubs', squad: 0, subject: -1, board: 0.15, mood: -1.5,
          line: 'A straight bat. Nobody learned anything and nobody wrote a headline.',
        },
      ],
    });
  }

  /* 3. A run of defeats, which is when the room gets uncomfortable. */
  const last5 = state.form.slice(-5);
  const losses = last5.filter(r => r === 'L').length;
  if (last5.length >= 3 && losses >= 3) {
    return mk({
      kind: 'slump',
      text: `${losses} defeats in your last ${last5.length}. Have you lost the dressing room?`,
      options: [
        {
          label: 'These players are with me', squad: 1.5, subject: 0, board: -1, mood: 1,
          line: 'You put your arm round the lot of them in public. Upstairs, that read as excuses.',
        },
        {
          label: 'That one is on me', squad: 0.9, subject: 0, board: 0.65, mood: -3.5,
          line: 'You took it on the chin. The board respect it. The press smell a man under pressure.',
        },
        {
          label: 'Some of them were not at it', squad: -2.2, subject: 0, board: 1.2, mood: 3,
          line: 'You named no names and everybody knew who you meant. It went round the dressing room by teatime.',
        },
        {
          label: 'We go again Saturday', squad: 0, subject: 0, board: 0, mood: -1.5,
          line: 'Four words and a walk out. They will find something else to write about.',
        },
      ],
    });
  }

  /* 4. The board are the story, which is a different question entirely. */
  if (state.boardConfidence < 32) {
    return mk({
      kind: 'boardHeat',
      text: 'The bookmakers have you favourite for the sack. Are you worried about your job?',
      options: [
        {
          label: 'I am going nowhere', squad: 1.25, subject: 0, board: -0.7, mood: 2.5,
          line: 'Defiant, and the room enjoyed it. The people who actually decide did not.',
        },
        {
          label: 'The board have backed me all the way', squad: -0.35, subject: 0, board: 1.4, mood: -2,
          line: 'Loyal to a fault. It bought you time upstairs and bored everybody else.',
        },
        {
          label: 'Judge me in May', squad: 0.4, subject: 0, board: 0.5, mood: 0.5, sharpen: 0.6,
          line: 'Nobody got a headline out of it, and the squad heard a manager who is not panicking.',
        },
      ],
    });
  }

  /* 5. A man you have stopped picking. */
  const dropped = senior
    .filter(p => isAvailable(p) && (p.lastTen ?? []).length >= 5 && promiseGap(p) <= -0.25)
    .sort((a, b) => promiseGap(a) - promiseGap(b))[0];
  if (dropped) {
    const played = (dropped.lastTen ?? []).reduce((s, x) => s + x, 0);
    const of = (dropped.lastTen ?? []).length;
    return mk({
      kind: 'dropped', playerId: dropped.id, playerName: dropped.name,
      text: `${dropped.name} has started ${played} of the last ${of}. Is he finished at this club?`,
      options: [
        {
          label: 'He is still my player', squad: 0.55, subject: 8, board: -0.3, mood: -0.5,
          line: 'You backed him in front of everybody. He will run through a wall on Saturday.',
        },
        {
          label: 'He has to earn it back', squad: 1.1, subject: -6, board: 0.55, mood: 2,
          line: 'Standards, in public. Ten of them heard it as a warning and one heard it as a demotion.',
        },
        {
          label: 'You would have to ask him', squad: -0.4, subject: 0, board: 0, mood: -2,
          line: 'A shrug and a next question. He was not wounded by it and nobody else was impressed either.',
        },
      ],
    });
  }

  /* 6. The derby, or whatever the biggest match on the horizon is. */
  const rival = nearestRival(state.clubName);
  if (opponent && rival && opponent === rival) {
    return mk({
      kind: 'derby',
      text: `${opponent} at the weekend. What is your message to the supporters?`,
      options: [
        {
          label: 'We are winning this one', squad: 1.7, subject: 0, board: 0.55, mood: 4, fire: 2.6, promise: true,
          line: 'You put it in print. Their dressing room has already pinned it to the wall.',
        },
        {
          label: 'They are a good side and we respect them', squad: 0.3, subject: 0, board: 0.1, mood: 1, sharpen: 0.8,
          line: 'Nothing for them to get angry about, and your lot went out with clear heads.',
        },
        {
          label: 'It is three points, same as any other', squad: -0.3, subject: 0, board: 0.15, mood: -2.5,
          line: 'Try telling the supporters that. They were not impressed and neither were the papers.',
        },
      ],
    });
  }

  /* 7. A run of wins, which is its own kind of trap. */
  const wins = last5.filter(r => r === 'W').length;
  if (last5.length >= 4 && wins >= 4) {
    return mk({
      kind: 'roll',
      text: `${wins} wins on the bounce. How far can this side go?`,
      options: [
        {
          label: 'We will take some stopping', squad: 1.5, subject: 0, board: 0.5, mood: 3.5, fire: 2.2,
          line: 'Bold, and it went down a storm everywhere except in the next dressing room you visit.',
        },
        {
          label: 'One game at a time', squad: 0.3, subject: 0, board: 0.2, mood: -1,
          line: 'The oldest answer in football, and it has never once caused anybody a problem.',
        },
        {
          label: 'We are nowhere near where we need to be', squad: -1, subject: 0, board: 0.55, mood: 1.5, sharpen: 1.2,
          line: 'Nobody got carried away. They trained like it was nought all on Monday morning.',
        },
      ],
    });
  }

  /* 8. Anything big enough to be worth asking about. */
  if (opponent && fx.kind === 'match') {
    const edge = matchEdge(state);
    if (edge !== null && edge - EDGE_LEVEL <= -6) {
      return mk({
        kind: 'bigGame',
        text: `${opponent} on paper are a level above you. Realistically, what are you going there for?`,
        options: [
          {
            label: 'Nobody gives us a prayer, and that suits us', squad: 1.25, subject: 0, board: 0.1, mood: 2, sharpen: 0.9,
            line: 'Underdogs and happy about it. Exactly the week your squad needed.',
          },
          {
            label: 'We are going to win it', squad: 0.85, subject: 0, board: 0.8, mood: 3, fire: 2.8, promise: true,
            line: 'A big call in front of a big audience. They have seen it too.',
          },
          {
            label: 'We will do our jobs and see', squad: 0, subject: 0, board: 0.35, mood: -1.5,
            line: 'Dull, safe and forgotten by Friday teatime. The board like a man who promises nothing.',
          },
        ],
      });
    }
  }

  return null;
}

/**
 * Roll a question onto the desk, if there is one worth asking and they have not
 * had you in front of a microphone too recently.
 */
function maybeAskPress(state: CareerState): void {
  const press = state.press;
  if (!press) return;
  /* A story has a shelf life. A question nobody ever answered stops being a
     question after a few weeks rather than sitting on the desk for twenty
     seasons, and it costs nothing to let it go, because a manager who never
     wants to do this is allowed to never do it. */
  if (press.pending) {
    if (state.week - press.lastWeek > 4) {
      press.pending = null;
      press.ducked += 1;
      press.mood = clamp(press.mood - PRESS_NO_SHOW, 0, 100);
    }
    return;
  }
  if (state.week - press.lastWeek < PRESS_GAP) return;
  const q = buildPressQuestion(state);
  if (!q) return;
  press.pending = q;
  press.lastWeek = state.week;
}

/** Say it. Pure: returns the new state. */
export function answerPress(career: CareerState, optionIdx: number): CareerState {
  const state: CareerState = JSON.parse(JSON.stringify(career));
  ensurePress(state);
  const press = state.press!;
  const q = press.pending;
  if (!q) return career;
  const opt = q.options[optionIdx];
  if (!opt) return career;

  state.squad = state.squad.map(p => {
    let delta = opt.squad;
    if (q.playerId && p.id === q.playerId) delta += opt.subject;
    let out = { ...p, morale: clamp(p.morale + delta, 5, 99) };
    if (opt.list && q.playerId && p.id === q.playerId) {
      out = { ...out, transferStatus: 'listed' as TransferStatus };
    }
    return out;
  });
  state.boardConfidence = clamp(state.boardConfidence + opt.board, 0, 100);
  press.mood = clamp(press.mood + opt.mood, 0, 100);
  press.nextFire += opt.fire ?? 0;
  press.nextSharpen += opt.sharpen ?? 0;
  if (opt.promise) press.promised = true;
  press.answered += 1;
  press.lastLine = opt.line;
  press.pending = null;
  return state;
}

/**
 * Send your assistant instead.
 *
 * This exists because the alternative is a feature that becomes a chore, and a
 * chore is worse than nothing. It costs a little and it never blocks anything,
 * so a player who does not want to do this can play twenty seasons and never
 * open the room, and lose about as much as he would from one flat afternoon.
 */
export function duckPress(career: CareerState): CareerState {
  const state: CareerState = JSON.parse(JSON.stringify(career));
  ensurePress(state);
  const press = state.press!;
  if (!press.pending) return career;
  press.mood = clamp(press.mood - PRESS_NO_SHOW, 0, 100);
  press.ducked += 1;
  press.lastLine = 'Your assistant took it. He said nothing wrong and nothing at all.';
  press.pending = null;
  /* The story still has to run its course. Without this line, ducking cleared
     the desk on the spot and the next reporter turned up three fixtures later,
     while simply never opening the screen left the question sitting there for
     five, so the man who pressed the skip button was charged the no-show
     roughly twice as often as the man who pretended the room did not exist.
     Measured at Manchester City over 160 seasons an arm before the fix: 66.7
     league points against 69.8, fifteen more sackings, and a guard that
     was going to flap forever on the difference. */
  press.lastWeek = state.week + 2;
  return state;
}

/** The line for the press room tile on the hub. */
export function pressHeadline(career: CareerState): string {
  const press = pressOf(career);
  if (press.pending) return 'They want a word';
  return pressMoodLabel(press.mood);
}

export { PRESS_SILENCE };

/** What we bank when selling: 90% of real value (youth products fetch less). */
export function sellValue(p: CMPlayer): number {
  // Round 105: a year left and everyone knows they can wait and get him for
  // nothing, so the fee collapses. This is the cost of letting a deal run.
  const runDown = (p.contractYears ?? 9) <= 1 ? 0.45 : 1;
  // Round 127: and a man who has publicly asked to leave is a man every
  // sporting director in Europe knows you have to sell. They bid accordingly.
  const wantsOut = p.wantsOut ? 0.82 : 1;
  if (p.value !== undefined) {
    return Math.max(0.3, Math.round(p.value * 0.9 * runDown * wantsOut * 10) / 10);
  }
  const youthF = p.isYouth ? 0.4 : 1;
  return Math.max(1, Math.round(baseValue(p.rating, p.age) * 0.9 * youthF * runDown * wantsOut));
}

const MARKET_BASE_CACHE = new Map<number, MarketPlayer[]>();

/**
 * Round 70: the purchasable universe is every baked real player across all
 * five leagues plus the European flavor clubs, nearly 2,000 players with
 * real market-value pricing (was: a 716-player static pool with curve
 * prices). Built once and cached; buildMarket filters it per career.
 *
 * Round 132: and it is now built once PER WORLD YEAR, because the frozen
 * version of this function was the sharpest single instance of the thing the
 * owner reported. Measured on the shipped engine: in season eleven of a
 * Liverpool career, Mohamed Salah was still on the transfer list at thirty
 * three years old, rated 83, for twenty one and a half million pounds, exactly
 * as he is in the August 2026 data, because this list never knew what year it
 * was. The whole 2,936 name market sat at an average age of 25.2 forever.
 */
function marketBase(yearsOnNow: number): MarketPlayer[] {
  const y = Math.max(0, Math.round(yearsOnNow));
  const hit = MARKET_BASE_CACHE.get(y);
  if (hit) return hit;
  const out: MarketPlayer[] = [];
  const seen = new Set<string>();
  for (const [club, roster] of Object.entries(projectedWorld(y))) {
    for (const b of roster) {
      if (seen.has(b.n)) continue;
      seen.add(b.n);
      out.push({
        name: b.n,
        club,
        position: b.p,
        age: b.a,
        rating: b.r,
        price: askingPrice(b.v, b.a),
        value: b.v,
        generated: b.g || undefined,
      });
    }
  }
  out.sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name));
  MARKET_BASE_CACHE.set(y, out);
  return out;
}

/**
 * Deterministic view of who is purchasable right now: the projected player
 * universe for THIS world year, minus my squad, minus anyone already
 * transferred (goneNames) and minus anyone who has retired out of my squad.
 * Called from a useMemo on every career change, so it must be pure: the
 * projection is a pure function of the year and nothing in here rolls a dice.
 */
export function buildMarket(career: CareerState): MarketPlayer[] {
  const squadNames = new Set(career.squad.map(p => p.name));
  const gone = new Set(career.goneNames);
  const retired = new Set(career.retiredNames ?? []);
  return marketBase(yearsOn(career))
    .filter(p => !squadNames.has(p.name) && !gone.has(p.name) && !retired.has(p.name));
}

/** Round 71: append a line to the Latest Transfers feed (capped at 80). */
function pushNews(state: CareerState, news: Omit<TransferNews, 'season' | 'week'>): void {
  const log = state.transferLog ?? [];
  log.push({ ...news, season: state.season, week: state.week });
  state.transferLog = log.slice(-80);
}

/** Round 71: track the priciest deal either way for the manager card. */
function trackDealExtremes(state: CareerState, dir: 'in' | 'out', name: string, fee: number): void {
  const cs = state.careerStats;
  if (dir === 'in') {
    if (!cs.mostExpensiveBuy || fee > cs.mostExpensiveBuy.fee) cs.mostExpensiveBuy = { name, fee };
  } else if (!cs.mostExpensiveSale || fee > cs.mostExpensiveSale.fee) {
    cs.mostExpensiveSale = { name, fee };
  }
}

/** Shared signing mechanics for instant buys, negotiations, clauses, loans. */
function completeSigning(career: CareerState, mp: MarketPlayer, fee: number, loan = false): CareerState | null {
  if (career.transferWindow === null) return null;
  if (fee > career.budget) return null;
  if (career.squad.length >= 30) return null;
  if (career.squad.some(p => p.name === mp.name)) return null;
  const player: CMPlayer = {
    id: `sign-${slug(mp.name)}-s${career.season}`,
    name: mp.name,
    position: mp.position,
    rating: mp.rating,
    age: mp.age,
    fitness: 90,
    morale: 78,
    injuryWeeks: 0,
    suspendedMatches: 0,
    isYouth: false,
    seasonGoals: 0,
    seasonAssists: 0,
    value: mp.value,
    onLoan: loan || undefined,
    // Round 105: a signing arrives on a real deal.
    contractYears: loan ? 1 : (mp.age >= 31 ? 2 : 4),
    wage: 0,
  };
  player.wage = wageFor(player);
  const state: CareerState = {
    ...career,
    budget: Math.round((career.budget - fee) * 10) / 10,
    squad: [...career.squad, player],
    goneNames: [...career.goneNames, mp.name],
    seasonSignings: [...career.seasonSignings, { dir: 'in', name: mp.name, fee, loan: loan || undefined }],
    careerStats: { ...career.careerStats },
    transferLog: [...(career.transferLog ?? [])],
  };
  pushNews(state, { name: mp.name, from: mp.club, to: state.clubName, fee, loan: loan || undefined });
  if (!loan) trackDealExtremes(state, 'in', mp.name, fee);
  return state;
}

/** Returns the new state, or null if the deal is not allowed. */
export function buyPlayer(career: CareerState, mp: MarketPlayer): CareerState | null {
  return completeSigning(career, mp, mp.price);
}

/**
 * Round 71: ~35% of players have a release clause, deterministic per player
 * and season so the market stays stable across renders. Pay it and the deal
 * is instant, no negotiation, no bidding war.
 */
export function releaseClauseOf(mp: MarketPlayer, season: number): number | null {
  const s = `${mp.name}:${season}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h * 31) + s.charCodeAt(i)) >>> 0;
  if (h % 100 >= 35) return null;
  const mult = 1.5 + ((h >>> 8) % 100) / 100;
  const base = mp.value ?? mp.price;
  return Math.max(1, Math.round(base * mult * 10) / 10);
}

/** Pay the release clause: instant signing at the clause price. */
export function payClause(career: CareerState, mp: MarketPlayer): CareerState | null {
  const clause = releaseClauseOf(mp, career.season);
  if (clause === null) return null;
  const state = completeSigning(career, mp, clause);
  if (state) state.negotiation = null;
  return state;
}

/**
 * Round 71: loans. Young prospects (not wonderkid superstars, nobody loans
 * you Yamal) and squad-level players will come on loan.
 */
export function loanEligible(career: CareerState, mp: MarketPlayer): boolean {
  if (mp.rating > 84) return false;
  const value = mp.value ?? mp.price;
  return (mp.age <= 23 && value <= 25) || mp.rating <= xiAverageRating(career) - 2;
}

export function activeLoans(career: CareerState): number {
  return career.squad.filter(p => p.onLoan).length;
}

export function loanFeeOf(mp: MarketPlayer): number {
  return Math.max(0.3, Math.round((mp.value ?? mp.price) * 0.08 * 10) / 10);
}

/** Take a player on loan until the end of the season (2 loan slots). */
export function loanIn(career: CareerState, mp: MarketPlayer): CareerState | null {
  if (!loanEligible(career, mp)) return null;
  if (activeLoans(career) >= 2) return null;
  return completeSigning(career, mp, loanFeeOf(mp), true);
}

/* ================================================================== */
/* Round 73: player messages, the dressing room slides into your DMs  */
/* ================================================================== */

let msgSeq = 0;

/* ---------- Round 137: nobody real gets words put in his mouth ----------
 *
 * The rule, and it is a legal one rather than a taste one. Club Manager squads
 * are REAL people, baked out of the market value table in clubManagerRosters.
 * A real player's name next to a factual number is reporting and it is fine.
 * A real player's name next to an invented sentence he supposedly said, or an
 * invented thing he supposedly did on a Tuesday night, is neither, and this
 * repo and this site are both public and both indexable.
 *
 * So the line these pools are written to:
 *
 *   FOOTBALL EVENTS INSIDE THE SIM KEEP THE NAME. Minutes, selection, morale,
 *   a transfer request, a bid. That is what a management sim IS, and the name
 *   is doing honest work: it tells you which of your players this is about.
 *
 *   INVENTED SPEECH AND INVENTED OFF PITCH CONDUCT LOSE THE NAME. Anything
 *   with a speaker, and anything about his car, his marriage, his night out or
 *   his side business, is attributed to a squad ROLE instead. No real name
 *   ever appears in the same string.
 *
 * The drama is still here and it is still the fun part. It is just told the
 * way an unsourced dressing room story actually gets told, about "one of your
 * midfielders" rather than about a man you could look up. Six entries that
 * alleged something genuinely damaging (drink driving shaped car crashes, a
 * casino night before a match, missing training, a marriage falling out) came
 * out altogether rather than being reworded, because "one of your defenders"
 * is still uncomfortably close to a named man when the claim is that serious
 * and your squad only has four of them.
 *
 * scripts/simNoInventedQuotes.mjs is the permanent guard. It drives real
 * seasons, collects every line this file can put on screen, and fails if a
 * roster name ever lands next to speech. Read its header before touching any
 * string in here.
 */

/** Position to the word a manager would actually use for that part of the pitch. */
const POSITION_GROUP: Record<string, string> = {
  GK: 'keepers',
  CB: 'defenders', LB: 'defenders', RB: 'defenders', LWB: 'defenders', RWB: 'defenders',
  CDM: 'midfielders', CM: 'midfielders', CAM: 'midfielders', LM: 'midfielders', RM: 'midfielders',
  LW: 'forwards', RW: 'forwards', ST: 'forwards', CF: 'forwards',
};

/** {P} and {Q} in the drama pool. Never a name, always the job he does. */
function squadDescriptor(p: CMPlayer): string {
  if (p.isYouth) return 'one of the academy lads';
  if (roleOf(p) === 'star') return 'your star man';
  return `one of your ${POSITION_GROUP[p.position] ?? 'senior lads'}`;
}

/** A second descriptor that will not read as the same man as the first. */
function otherDescriptor(p: CMPlayer, taken: string): string {
  const d = squadDescriptor(p);
  if (d !== taken) return d;
  return p.isYouth ? 'one of the academy lads' : 'another of the senior lads';
}

const DRAMA_POOL: { text: string; options: { label: string; effect: MessageEffect }[] }[] = [
  { text: '{P} got caught selling his match worn boots on eBay. Buy it now, no returns.', options: [{ label: 'Fine him', effect: 'fine' }, { label: 'Buy a pair yourself', effect: 'laugh' }] },
  { text: '{P} showed up to training in a full chrome wrap on his car with his own face printed on the hood.', options: [{ label: 'Fine him for the parking spot he took', effect: 'fine' }, { label: 'Respect it, honestly', effect: 'laugh' }] },
  { text: '{P} has started a podcast. Episode one is called Why My Manager Does Not Understand Football.', options: [{ label: 'Make him listen to it in front of everyone', effect: 'fine' }, { label: 'Go on the podcast', effect: 'support' }] },
  { text: '{P} adopted an emotional support alpaca and wants to bring it to the training ground.', options: [{ label: 'No farm animals', effect: 'refuse' }, { label: 'The alpaca stays, morale is up', effect: 'support' }] },
  { text: '{P} bought the apartment building next to the stadium and is renting flats to away fans on matchday.', options: [{ label: 'Make him stop', effect: 'refuse' }, { label: 'Business is business', effect: 'laugh' }] },
  { text: '{P} got a tattoo of the club badge. The tattoo artist misspelled the club name.', options: [{ label: 'Pay for the fix', effect: 'support' }, { label: 'It stays, as a lesson', effect: 'laugh' }] },
  { text: '{P} challenged a fan who criticized him to a race. The fan won. It is everywhere.', options: [{ label: 'Ban him from social media', effect: 'refuse' }, { label: 'Sign the fan for the youth team', effect: 'laugh' }] },
  { text: '{P} says his personal chef was poached by {Q} and now they are not speaking.', options: [{ label: 'Hire a team chef for everyone', effect: 'fine' }, { label: 'Let them sort it out', effect: 'laugh' }] },
  { text: '{P} has been teaching the youth players a goal celebration so elaborate it needs a permit.', options: [{ label: 'Ban it', effect: 'refuse' }, { label: 'Ask for a role in it', effect: 'support' }] },
  { text: '{P} turned up with a personal documentary crew. They want to film team talks for the arc.', options: [{ label: 'No cameras inside', effect: 'refuse' }, { label: 'Give them one episode', effect: 'support' }] },
  { text: '{P} is selling his own brand of protein cereal in the players lounge. {Q} reckons it tastes like drywall.', options: [{ label: 'Shut the stand down', effect: 'refuse' }, { label: 'Invest early', effect: 'laugh' }] },
  { text: '{P} got stuck in the stadium elevator for two hours and live streamed the whole thing. Record viewership.', options: [{ label: 'Check on him', effect: 'support' }, { label: 'Clip it for the club account', effect: 'laugh' }] },
  { text: '{P} wants the club to sign his brother. His brother is 34 and plays Sunday league, and is reportedly in the best shape of his life.', options: [{ label: 'Politely decline', effect: 'refuse' }, { label: 'Offer a trial, for the content', effect: 'laugh' }] },
  { text: '{P} rated his own performance 10 out of 10 in the club app after a 4-0 defeat.', options: [{ label: 'Make him explain it to the squad', effect: 'fine' }, { label: 'Confidence is confidence', effect: 'laugh' }] },
  { text: '{P} has been parking in your spot all month and putting a traffic cone on his own.', options: [{ label: 'Tow it', effect: 'fine' }, { label: 'Take the cone spot, be the bigger man', effect: 'laugh' }] },
  { text: '{P} announced his retirement on social media by accident. He meant to post his dinner.', options: [{ label: 'Get the club to clarify', effect: 'support' }, { label: 'Let the rumors run a day', effect: 'laugh' }] },
  { text: '{P} and {Q} got matching tattoos to celebrate a win. Neither remembers deciding this.', options: [{ label: 'Fine them both', effect: 'fine' }, { label: 'Team bonding is team bonding', effect: 'support' }] },
  { text: '{P} claims a fortune teller told him he will score a hat-trick this weekend, and he has already ordered the match ball display case.', options: [{ label: 'Manage expectations', effect: 'listen' }, { label: 'Start him. Fate is fate', effect: 'promise' }] },
  { text: '{P} has taken up open water swimming in January and keeps posting about it at six in the morning.', options: [{ label: 'Ask the physio to have a word', effect: 'refuse' }, { label: 'Join him once, for the group chat', effect: 'laugh' }] },
  { text: '{P} brought a chess board into the dressing room and has beaten every member of staff, including you.', options: [{ label: 'Demand a rematch', effect: 'laugh' }, { label: 'Put him in charge of set pieces', effect: 'support' }] },
  { text: '{P} keeps changing the dressing room playlist thirty seconds into every song and {Q} has hidden the speaker.', options: [{ label: 'Confiscate the aux', effect: 'fine' }, { label: 'Let the squad vote on it', effect: 'support' }] },
];

/* Football intent, narrated. The name stays because this is a squad event you
   need to act on, and nothing here is presented as words he said. */
const START_ME_TEXTS = [
  '{P} has asked for a meeting about his place in the side. He is training well and he does not think the teamsheet reflects it.',
  '{P} pulled you aside after training. The short version: he wants to start on Saturday.',
  "{P}'s agent has been in touch about his minutes. Politely, for now.",
];
const WANT_MOVE_TEXTS = [
  '{P} has requested a meeting. He is not happy, and the word transfer came up before he had even sat down.',
  '{P} has let it be known through his agent that he wants out unless things change fast.',
];
const PRAISE_TEXTS = [
  '{P} made a point of finding you after the win. Whatever you did at half time, he is buying into it.',
  '{P} left a bottle of very expensive wine on your desk. No note, no explanation, message received.',
];

function pushMessage(state: CareerState, msg: Omit<PlayerMessage, 'id' | 'week'>): void {
  msgSeq += 1;
  const inbox = state.inbox ?? [];
  inbox.unshift({ ...msg, id: `msg-${state.season}-${state.week}-${msgSeq}`, week: state.week });
  state.inbox = inbox.slice(0, 8);
}

/** Rolled after each match: someone in the squad has something to say. */
function generatePlayerMessage(state: CareerState, xi: CMPlayer[], won: boolean, margin: number): void {
  const unresolved = (state.inbox ?? []).filter(m => !m.resolved).length;
  if (unresolved >= 3) return;

  /* Round 127: the corridor conversation gets first refusal, ahead of the
     dice roll that decides whether anybody speaks to you at all. It has to,
     or it never happens: a man you are letting down only qualifies for the
     two or three weeks between his run of games getting long enough to judge
     and him putting a transfer request in writing, and behind a thirty eight
     percent gate followed by another coin flip that window closes without a
     word being said. Measured before this: zero corridor conversations across
     a whole season of benching a man you had called a star. */
  if (Math.random() < 0.34) {
    const letDown = state.squad
      .filter(p => !p.isYouth && !p.onLoan && !p.wantsOut && isAvailable(p)
        && (p.lastTen ?? []).length >= 5 && promiseGap(p) <= -0.22 && p.morale < 70)
      .sort((a, b) => promiseGap(a) - promiseGap(b))[0];
    if (letDown) {
      const rung = ROLE_LADDER.indexOf(roleOf(letDown));
      const honest = ROLE_LADDER[Math.min(rung + 1, ROLE_LADDER.length - 1)];
      const played = (letDown.lastTen ?? []).reduce((s, x) => s + x, 0);
      const of = (letDown.lastTen ?? []).length;
      const options: { label: string; effect: MessageEffect }[] = [
        { label: 'Promise him a start', effect: 'promise' },
        { label: 'Hear him out', effect: 'listen' },
      ];
      if (honest !== roleOf(letDown)) {
        options.splice(1, 0, {
          label: `Be straight: he is a ${ROLE_INFO[honest].label.toLowerCase()}`,
          effect: 'setRole',
        });
      }
      pushMessage(state, {
        playerName: letDown.name,
        playerId: letDown.id,
        kind: 'roleTalk',
        /* Round 137: narrated, not quoted. The numbers are the point and they
           are real; the corridor conversation is reported rather than put in
           his mouth. */
        text: `${letDown.name} caught you in the corridor. He is down as a ${ROLE_INFO[roleOf(letDown)].label.toLowerCase()} and he has started ${played} of the last ${of}. He wants to know which of those two is the truth.`,
        options,
        roleOffer: honest,
      });
      return;
    }
  }

  if (Math.random() > 0.38) return;
  const xiIds = new Set(xi.map(p => p.id));
  const roll = Math.random();

  // Praise after a statement win.
  if (won && margin >= 3 && roll < 0.35) {
    const hero = xi.filter(p => !p.isYouth)[0];
    if (hero) {
      pushMessage(state, {
        playerName: hero.name,
        playerId: hero.id,
        kind: 'praise',
        text: pick(PRAISE_TEXTS).replace('{P}', hero.name),
        options: [{ label: 'Appreciate it', effect: 'support' }],
      });
      return;
    }
  }

  // A benched name wants your teamsheet.
  if (roll < 0.45) {
    const xiRatings = xi.map(p => p.rating).sort((a, b) => a - b);
    const floor = xiRatings[0] ?? 60;
    const benched = state.squad
      .filter(p => !xiIds.has(p.id) && !p.isYouth && isAvailable(p) && p.rating >= floor - 2 && p.morale < 80)
      .sort((a, b) => b.rating - a.rating)[0];
    if (benched) {
      pushMessage(state, {
        playerName: benched.name,
        playerId: benched.id,
        kind: 'startMe',
        text: pick(START_ME_TEXTS).replace('{P}', benched.name),
        options: [
          { label: 'Promise him a start', effect: 'promise' },
          { label: 'Earn it in training', effect: 'refuse' },
          { label: 'Hear him out', effect: 'listen' },
        ],
      });
      return;
    }
  }

  // A miserable star wants out.
  if (roll < 0.6) {
    const unhappy = state.squad
      .filter(p => !p.isYouth && p.morale < 45 && p.rating >= 72)
      .sort((a, b) => b.rating - a.rating)[0];
    if (unhappy) {
      pushMessage(state, {
        playerName: unhappy.name,
        playerId: unhappy.id,
        kind: 'wantMove',
        text: pick(WANT_MOVE_TEXTS).replace('{P}', unhappy.name),
        options: [
          { label: 'You are going nowhere', effect: 'refuse' },
          { label: 'Promise more minutes', effect: 'promise' },
          { label: 'Talk it through', effect: 'listen' },
        ],
      });
      return;
    }
  }

  // Otherwise: pure drama.
  const nonYouth = state.squad.filter(p => !p.isYouth);
  if (nonYouth.length < 2) return;
  const p1 = pick(nonYouth);
  let p2 = pick(nonYouth);
  let tries = 0;
  while (p2.id === p1.id && tries < 5) { p2 = pick(nonYouth); tries += 1; }
  const drama = pick(DRAMA_POOL);
  /* Round 137: the drama is told about a role, never about a named real man.
     playerName stays on the message because the morale hit still has to land
     on somebody, but it is metadata now: InboxCard renders text and nothing
     else, so no roster name reaches the screen through this branch. */
  const d1 = squadDescriptor(p1);
  const text = drama.text
    .replace('{P}', d1)
    .replace('{Q}', otherDescriptor(p2, d1));
  pushMessage(state, {
    playerName: p1.name,
    playerId: p1.id,
    kind: 'drama',
    text: text.charAt(0).toUpperCase() + text.slice(1),
    options: drama.options,
  });
}

/** Answer a message. Pure: returns the new state. */
export function answerMessage(career: CareerState, messageId: string, optionIdx: number): CareerState {
  const inbox = career.inbox ?? [];
  const msg = inbox.find(m => m.id === messageId);
  if (!msg || msg.resolved) return career;
  const opt = msg.options[optionIdx];
  if (!opt) return career;

  let squad = career.squad;
  let budget = career.budget;
  let promisedStarts = career.promisedStarts ?? [];
  let resolved = '';
  const bump = (id: string, delta: number) => {
    squad = squad.map(p => (p.id === id ? { ...p, morale: clamp(p.morale + delta, 5, 99) } : p));
  };

  switch (opt.effect) {
    case 'promise':
      bump(msg.playerId, 10);
      promisedStarts = [...promisedStarts, msg.playerId];
      resolved = 'You promised him a start. He left smiling. Break it and he will notice.';
      break;
    case 'refuse':
      bump(msg.playerId, -8);
      resolved = 'You shut it down. He was not thrilled.';
      break;
    case 'listen':
      bump(msg.playerId, 4);
      resolved = 'You heard him out. Sometimes that is all it takes.';
      /* Round 127: talking a man out of a transfer request buys you time, not
         a solution. The request comes off the table, but nothing about his
         football has changed, so if you still are not playing him he will hand
         in another one. */
      if (msg.kind === 'wantMove') {
        squad = squad.map(p => (p.id === msg.playerId ? { ...p, wantsOut: undefined } : p));
        resolved = 'He pulled the request for now. Nothing about his week has changed though.';
      }
      break;
    /* Round 127: being honest with him, and paying for it. */
    case 'setRole': {
      const to = msg.roleOffer;
      const target = squad.find(x => x.id === msg.playerId);
      if (!to || !target) { resolved = 'Nothing came of it.'; break; }
      const cost = roleChangeCost(target, to);
      const applied = setSquadRole({ ...career, squad, budget }, msg.playerId, to);
      if (applied) {
        squad = applied.squad;
        budget = applied.budget;
        resolved = cost > 0
          ? `You told him the truth. He is a ${ROLE_INFO[to].label.toLowerCase()} now and the settlement cost you ${money(cost)}. He did not enjoy hearing it.`
          : `You told him the truth. He is a ${ROLE_INFO[to].label.toLowerCase()} now.`;
      } else {
        bump(msg.playerId, -6);
        resolved = `You cannot cover the ${money(cost)} settlement, so his role stands and so does the problem.`;
      }
      break;
    }
    case 'fine': {
      const fine = Math.max(0.1, Math.round((0.1 + Math.random() * 0.4) * 10) / 10);
      budget = Math.round((budget + fine) * 10) / 10;
      bump(msg.playerId, -6);
      resolved = `Fined. ${money(fine)} into the club account. He is sulking.`;
      break;
    }
    case 'support':
      bump(msg.playerId, 8);
      resolved = 'You backed him. The dressing room noticed.';
      break;
    case 'laugh':
      bump(msg.playerId, 2);
      resolved = 'You let it slide. Football is meant to be fun.';
      break;
  }

  return {
    ...career,
    squad,
    budget,
    promisedStarts,
    inbox: inbox.map(m => (m.id === messageId ? { ...m, resolved } : m)),
  };
}

/* ---------- Round 71: fee negotiations and bidding wars ---------- */

const SELLER_OPENERS = [
  'They want top money for him.',
  'The selling club says he is not for sale... at the right price he is.',
  'Their sporting director picks up on the second ring. Everyone is for sale.',
  'They know you are interested. The price just went up.',
];
const SELLER_INSULTED = [
  'They hung up. That offer was an insult.',
  'The fax machine allegedly "broke". The ask just went up.',
  'Their president leaked your lowball to the press for a laugh.',
];
const SELLER_COUNTER = [
  'They came down a little. Progress.',
  'Their negotiator sighs, scribbles, slides a new number over.',
  'Getting closer. They want it done before the window shuts.',
];

/** Open a negotiation for a market player. One live deal at a time. */
export function startNegotiation(career: CareerState, mp: MarketPlayer): CareerState | null {
  if (career.transferWindow === null) return null;
  if (career.negotiation && career.negotiation.status === 'open') return null;
  if (career.squad.length >= 30) return null;
  if (career.squad.some(p => p.name === mp.name)) return null;
  if ((career.coldNames ?? []).includes(mp.name)) return null;
  const theirAsk = Math.round(mp.price * (1.02 + Math.random() * 0.13) * 10) / 10;
  return {
    ...career,
    negotiation: {
      player: mp,
      stage: 0,
      patience: 2 + ri(0, 1),
      myOffer: null,
      theirAsk,
      status: 'open',
      rivalBidder: null,
      rivalOffer: null,
      note: pick(SELLER_OPENERS),
    },
  };
}

/**
 * Make an offer in the live negotiation. Meet ~97% of the ask and the deal
 * is done; lowball and patience burns; anything in between drags the ask
 * down but can wake up a rival bidder who tries to hijack the deal.
 */
export function makeOffer(career: CareerState, amount: number): CareerState | null {
  const neg = career.negotiation;
  if (!neg || neg.status !== 'open') return null;
  if (career.transferWindow === null) return null;
  amount = Math.round(amount * 10) / 10;
  if (amount > career.budget) {
    return {
      ...career,
      negotiation: { ...neg, note: `You do not have ${money(amount)}. The budget is ${money(career.budget)}.` },
    };
  }

  const next: Negotiation = { ...neg, stage: neg.stage + 1, myOffer: amount };

  // Beat-the-rival check comes first when a war is on.
  if (next.rivalBidder && next.rivalOffer !== null && amount <= next.rivalOffer) {
    next.note = `${next.rivalBidder} are still ahead at ${money(next.rivalOffer)}. Beat it or lose him.`;
    // Dithering lets the rival close: 30% they win the race right now.
    if (Math.random() < 0.3) {
      const state: CareerState = {
        ...career,
        negotiation: { ...next, status: 'hijacked', note: `${next.rivalBidder} closed the deal at ${money(next.rivalOffer)} while you hesitated.` },
        goneNames: [...career.goneNames, next.player.name],
        transferLog: [...(career.transferLog ?? [])],
      };
      pushNews(state, { name: next.player.name, from: next.player.club, to: next.rivalBidder, fee: next.rivalOffer });
      return state;
    }
    return { ...career, negotiation: next };
  }

  // Deal done.
  if (amount >= next.theirAsk * 0.97) {
    const signed = completeSigning(career, next.player, amount);
    if (!signed) return null;
    signed.negotiation = { ...next, status: 'agreed', note: `Done at ${money(amount)}. Welcome to ${career.clubName}, ${next.player.name}.` };
    return signed;
  }

  // Insulting lowball.
  if (amount < next.theirAsk * 0.75) {
    next.patience -= 1;
    if (next.patience <= 0) {
      return {
        ...career,
        negotiation: { ...next, status: 'collapsed', note: 'They walked away from the table. Deal dead this window.' },
        coldNames: [...(career.coldNames ?? []), next.player.name],
      };
    }
    next.theirAsk = Math.round(next.theirAsk * 1.04 * 10) / 10;
    next.note = pick(SELLER_INSULTED);
    return { ...career, negotiation: next };
  }

  // A real offer: the ask moves toward it.
  next.theirAsk = Math.max(
    Math.round(amount * 1.02 * 10) / 10,
    Math.round((next.theirAsk - (next.theirAsk - amount) * 0.55) * 10) / 10,
  );
  next.note = pick(SELLER_COUNTER);

  // Rival bidder logic.
  if (next.rivalBidder && next.rivalOffer !== null) {
    // I beat their number: they either quit or raise.
    if (Math.random() < 0.5 || next.rivalOffer >= (next.player.value ?? next.player.price) * 1.6) {
      next.note = `${next.rivalBidder} pulled out. It is your deal to finish.`;
      next.rivalBidder = null;
      next.rivalOffer = null;
    } else {
      next.rivalOffer = Math.round(amount * (1.05 + Math.random() * 0.07) * 10) / 10;
      next.note = `${next.rivalBidder} raised to ${money(next.rivalOffer)}.`;
    }
  } else if (!next.rivalBidder && next.stage >= 1 && Math.random() < 0.22) {
    const spenders = REAL_LEAGUES.flatMap(l => playableClubs(l.id).slice(0, 5).map(c => c.name))
      .filter(n => n !== career.clubName && n !== next.player.club);
    next.rivalBidder = pick(spenders);
    next.rivalOffer = Math.round(amount * (1.06 + Math.random() * 0.1) * 10) / 10;
    next.note = `${next.rivalBidder} just entered the race at ${money(next.rivalOffer)}. Bidding war.`;
  }

  return { ...career, negotiation: next };
}

/** Walk away. If a rival was circling, they usually take him. */
export function walkAway(career: CareerState): CareerState {
  const neg = career.negotiation;
  if (!neg) return career;
  if (neg.status === 'open' && neg.rivalBidder && neg.rivalOffer !== null && Math.random() < 0.6) {
    const state: CareerState = {
      ...career,
      negotiation: null,
      goneNames: [...career.goneNames, neg.player.name],
      transferLog: [...(career.transferLog ?? [])],
    };
    pushNews(state, { name: neg.player.name, from: neg.player.club, to: neg.rivalBidder, fee: neg.rivalOffer });
    state.aiHeadlines = [
      `${neg.rivalBidder} sign ${neg.player.name} after ${career.clubName} walk away from the table.`,
      ...state.aiHeadlines,
    ].slice(0, 8);
    return state;
  }
  return { ...career, negotiation: null };
}

/* ---------- Round 71: AI clubs bid for MY players ---------- */

/** Accept an incoming bid: the player leaves at the bid price. */
export function acceptBid(career: CareerState, playerId: string): CareerState | null {
  const bids = career.incomingBids ?? [];
  const bid = bids.find(b => b.playerId === playerId);
  if (!bid) return null;
  if (career.transferWindow === null) return null;
  const p = career.squad.find(x => x.id === playerId);
  if (!p) return null;
  if (!canLeaveSquad(career, p)) return null;
  // Round 94: a loan approach sends him out for the season instead of selling.
  if (bid.loan) {
    const loaned = loanOutPlayer(career, playerId, bid.club);
    if (!loaned) return null;
    return { ...loaned, incomingBids: bids.filter(b => b.playerId !== playerId) };
  }
  const state: CareerState = {
    ...career,
    budget: Math.round((career.budget + bid.offer) * 10) / 10,
    squad: career.squad.filter(x => x.id !== playerId),
    xiIds: career.xiIds.map(id => (id === playerId ? null : id)),
    seasonSignings: [...career.seasonSignings, { dir: 'out', name: p.name, fee: bid.offer }],
    incomingBids: bids.filter(b => b.playerId !== playerId),
    careerStats: { ...career.careerStats },
    transferLog: [...(career.transferLog ?? [])],
  };
  pushNews(state, { name: p.name, from: career.clubName, to: bid.club, fee: bid.offer });
  trackDealExtremes(state, 'out', p.name, bid.offer);
  return state;
}

/**
 * Reject a bid: half the time they come back once with ~15% more.
 * Round 94: turning down a bid for a player you yourself listed is the worst
 * of both worlds, and he takes it personally.
 */
export function rejectBid(career: CareerState, playerId: string): CareerState {
  const bids = career.incomingBids ?? [];
  const bid = bids.find(b => b.playerId === playerId);
  if (!bid) return career;
  if (bid.status === 'open' && Math.random() < 0.5) {
    const improved: IncomingBid = {
      ...bid,
      offer: Math.round(bid.offer * 1.15 * 10) / 10,
      status: 'improved',
    };
    return { ...career, incomingBids: bids.map(b => (b.playerId === playerId ? improved : b)) };
  }
  const target = career.squad.find(p => p.id === playerId);
  const listed = target?.transferStatus === 'listed' || target?.transferStatus === 'loanListed';
  // Final rejection: the player wanted the move 40% of the time, and always
  // if you had already told him he was available.
  const sulks = listed || Math.random() < 0.4;
  const squad = sulks
    ? career.squad.map(p => (p.id === playerId ? { ...p, morale: clamp(p.morale - (listed ? 12 : 7), 5, 99) } : p))
    : career.squad;
  return { ...career, squad, incomingBids: bids.filter(b => b.playerId !== playerId) };
}

/* ---------- Round 94: the transfer status controls ---------- */

/** Every club that could plausibly come in for one of my players. */
function buyerPool(state: CareerState): string[] {
  return REAL_LEAGUES.flatMap(l => playableClubs(l.id).slice(0, 8).map(c => c.name))
    .filter(n => n !== state.clubName);
}

/**
 * Tell the world what you are doing with a player. Pass null to take the
 * label back off.
 *
 * There is a cost either way, which is the whole point of the feature:
 * shopping a settled star wounds him, and slamming the door on a player who
 * already wants out makes it worse, not better.
 */
export function setTransferStatus(
  career: CareerState,
  playerId: string,
  status: TransferStatus | null,
): CareerState {
  const p = career.squad.find(x => x.id === playerId);
  if (!p) return career;
  if (p.onLoan) return career;            // he is not ours to shop
  if ((p.transferStatus ?? null) === status) return career;

  let moraleHit = 0;
  if (status === 'listed' && p.morale >= 70 && p.rating >= 74) moraleHit = 8;
  else if (status === 'loanListed' && p.age >= 26 && p.morale >= 70) moraleHit = 5;
  else if (status === 'blocked' && p.morale < 50) moraleHit = 6;

  const squad = career.squad.map(x => (
    x.id === playerId
      ? { ...x, transferStatus: status ?? undefined, morale: clamp(x.morale - moraleHit, 5, 99) }
      : x
  ));
  // Blocking him kills any bid already on the table.
  const bids = status === 'blocked'
    ? (career.incomingBids ?? []).filter(b => b.playerId !== playerId)
    : (career.incomingBids ?? []);
  return { ...career, squad, incomingBids: bids };
}

/** What a rival pays to borrow him for the season. */
export function loanOutFee(p: CMPlayer): number {
  return Math.max(0.2, Math.round(sellValue(p) * 0.08 * 10) / 10);
}

/**
 * Squad rules: you cannot strip yourself below a playable team. Shared by
 * selling, accepting a bid and loaning out, so all three agree.
 */
export function canLeaveSquad(career: CareerState, p: CMPlayer): boolean {
  if (career.squad.length <= 14) return false;
  if (p.onLoan) return false;             // he belongs to someone else
  if (p.position === 'GK' && career.squad.filter(x => x.position === 'GK').length <= 1) return false;
  return true;
}

/**
 * Send a player out on loan for the rest of the season. He leaves the squad,
 * you bank a small fee, and he comes back at the end of the season with
 * game time behind him, which for a young player is worth far more than the
 * fee (see returnLoanedPlayers).
 */
export function loanOutPlayer(career: CareerState, playerId: string, toClub?: string): CareerState | null {
  if (career.transferWindow === null) return null;
  const p = career.squad.find(x => x.id === playerId);
  if (!p || !canLeaveSquad(career, p)) return null;
  const pool = buyerPool(career);
  const club = toClub && toClub !== career.clubName ? toClub : pick(pool);
  const fee = loanOutFee(p);
  const state: CareerState = {
    ...career,
    budget: Math.round((career.budget + fee) * 10) / 10,
    squad: career.squad.filter(x => x.id !== playerId),
    xiIds: career.xiIds.map(id => (id === playerId ? null : id)),
    seasonSignings: [...career.seasonSignings, { dir: 'out', name: p.name, fee, loan: true }],
    incomingBids: (career.incomingBids ?? []).filter(b => b.playerId !== playerId),
    loanedOut: [...(career.loanedOut ?? []), { player: { ...p, transferStatus: undefined }, club, fee, season: career.season }],
    careerStats: { ...career.careerStats },
    transferLog: [...(career.transferLog ?? [])],
  };
  pushNews(state, { name: p.name, from: career.clubName, to: club, fee, loan: true });
  return state;
}

/**
 * Round 94: bring the loans home. A season of real football is the single
 * best thing that can happen to a young player, and the game should say so.
 */
function returnLoanedPlayers(career: CareerState): CMPlayer[] {
  const out: CMPlayer[] = [];
  for (const l of career.loanedOut ?? []) {
    const p = l.player;
    const bump =
      p.age <= 21 ? ri(2, 4) :
      p.age <= 24 ? ri(1, 3) :
      p.age <= 28 ? ri(0, 1) : 0;
    let value = p.value;
    if (value !== undefined && bump > 0) {
      value = Math.max(0.2, Math.round(value * Math.pow(1.2, bump) * 10) / 10);
    }
    out.push({
      ...p,
      rating: clamp(p.rating + bump, 40, 95),
      value,
      morale: 76,
      transferStatus: undefined,
      onLoan: undefined,
    });
  }
  return out;
}

/**
 * Round 94: the market reacts to what you have told it.
 *  - a blocked player never gets a bid, full stop
 *  - a listed player almost always gets one, sometimes two clubs at once,
 *    but they know you want him gone so the money is closer to his real
 *    value than the fantasy number a speculative bidder has to wave
 *  - a loan-listed player gets loan approaches instead
 *  - and a genuine star can still be approached out of the blue, exactly
 *    as before, at a price that has to tempt you
 */
/**
 * Round 141: `topUp` is the mid-window weekly pass. It KEEPS every open bid
 * whose player is still here (an offer on the table stays on the table), and
 * rolls new interest at a gentler weekly rate. The window-open pass is the
 * loud one: everybody who was waiting for the market to open calls at once.
 */
function generateIncomingBids(state: CareerState, topUp = false): void {
  const surviving = topUp
    ? (state.incomingBids ?? []).filter(b => b.status === 'open' && state.squad.some(p => p.id === b.playerId))
    : [];
  const bids: IncomingBid[] = [...surviving];
  const buyers = buyerPool(state);
  const taken = new Set<string>(surviving.map(b => b.playerId));
  const available = state.squad.filter(p => !p.onLoan && p.transferStatus !== 'blocked');

  /* Round 127: a player who has handed in a transfer request is shopping
     himself whether you like it or not, so the phone rings for him the same
     way it rings for a man you listed. This is the part of a broken promise
     you can actually point at: you did not put him on the market, he did. */
  for (const p of available.filter(x => x.wantsOut && x.transferStatus !== 'listed' && x.transferStatus !== 'loanListed')) {
    if (taken.has(p.id)) continue;
    if (Math.random() > (topUp ? 0.25 : 0.6)) continue;
    const base = sellValue(p);
    const club = pick(buyers);
    bids.push({
      playerId: p.id,
      playerName: p.name,
      club,
      offer: Math.max(0.3, Math.round(base * (0.9 + Math.random() * 0.3) * 10) / 10),
      status: 'open',
      fromListing: true,
    });
    taken.add(p.id);
  }

  /* 1. Listed players: the phone actually rings.
     Round 141 calibration, and mind the direction of the gate: the random
     draw SKIPS when it exceeds the threshold, so the threshold IS the bid
     probability. The window-open rush stays strong (70 percent, close to the
     original engine), the NEW parts are the 35 percent weekly top-up and the
     fact that open offers persist week to week. Together a man listed for a
     whole 4 week window goes unbid about one time in a hundred, and that
     matters more than it used to because the instant sell button is gone and
     listing is now the ONLY way to move a player. */
  for (const p of available.filter(x => x.transferStatus === 'listed')) {
    if (taken.has(p.id)) continue;
    if (Math.random() > (topUp ? 0.35 : 0.7)) continue;
    const base = sellValue(p);
    const pool = buyers.filter(n => n !== state.clubName);
    const club = pick(pool);
    const contested = Math.random() < 0.3;
    const rival = contested ? pick(pool.filter(n => n !== club)) : undefined;
    const mult = contested ? 1.05 + Math.random() * 0.3 : 0.85 + Math.random() * 0.3;
    bids.push({
      playerId: p.id,
      playerName: p.name,
      club,
      offer: Math.max(0.3, Math.round(base * mult * 10) / 10),
      status: 'open',
      rival,
      fromListing: true,
    });
    taken.add(p.id);
  }

  // 2. Loan-listed players: someone will take him for the season.
  for (const p of available.filter(x => x.transferStatus === 'loanListed')) {
    if (taken.has(p.id)) continue;
    if (Math.random() > (topUp ? 0.2 : 0.6)) continue;
    bids.push({
      playerId: p.id,
      playerName: p.name,
      club: pick(buyers),
      offer: loanOutFee(p),
      status: 'open',
      loan: true,
      fromListing: true,
    });
    taken.add(p.id);
  }

  // 3. Out of the blue, for the players everyone can see are good.
  // Weekly top-ups pester less than the window-open rush, but a big club can
  // still come for your star in week three, exactly the way it happens.
  const targets = available
    .filter(p => !taken.has(p.id) && !p.isYouth && !p.transferStatus && p.rating >= 74)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
    .slice(0, 8);
  const count = Math.random() < (topUp ? 0.8 : 0.45) ? 0 : ri(1, 2);
  for (const p of shuffle(targets).slice(0, count)) {
    const base = sellValue(p);
    bids.push({
      playerId: p.id,
      playerName: p.name,
      club: pick(buyers),
      offer: Math.round(base * (1.15 + Math.random() * 0.35) * 10) / 10,
      status: 'open',
    });
  }
  state.incomingBids = bids;
}

/* Round 141: sellPlayer is GONE, on the owner's review: "U shouldnt be able
   to just quickly sell someone. U need offers and put them on the transfer
   market." Selling now has exactly one path: transfer list the player, wait
   for clubs to bid (generateIncomingBids), and accept a bid you like
   (acceptBid). No function in this file converts a player straight to cash,
   and the harness checks the export stays dead. */

/**
 * 3-6 AI transfers between the other clubs. Each headline removes that player
 * from the market for the rest of the season. Mutates state (internal use).
 */
/* ---------- Round 141: the news feed lives all season ----------
 *
 * From the review: "I would like to see way more headlines." Before this,
 * aiHeadlines only filled up when a transfer window opened, so for most of
 * the season the card sat frozen on week-one gossip. Now every match week
 * can add a line, and every line is read straight off the sim's real state:
 * the actual table, the actual gap, the actual fixture list. Nothing here
 * invents an event, it narrates the ones the engine already produced, which
 * is what keeps it inside the two permanent guards (no invented quotes from
 * real people, no rival product names).
 */
function pushHeadline(state: CareerState, line: string): void {
  if (state.aiHeadlines.includes(line)) return;
  state.aiHeadlines = [line, ...state.aiHeadlines].slice(0, 8);
}

export function generateWeeklyNews(state: CareerState): void {
  const table = sortedTable(state.table);
  if (table.length < 4) return;
  const myIdx = table.findIndex(r => r.club === state.clubName);
  const myRow = myIdx >= 0 ? table[myIdx] : null;
  const played = myRow ? myRow.w + myRow.d + myRow.l : 0;
  const rounds = state.leagueClubs.length > 1 ? 2 * (state.leagueClubs.length - 1) : 38;
  const league = leagueOf(state.clubName);
  if (played < 3) return;

  // Derby week beats everything: the fixture list says so, not a dice roll.
  const rival = RIVALS[state.clubName];
  if (rival && played < rounds) {
    const fx = nextFixture(state);
    if (fx.kind === 'match' && fx.opponent === rival) {
      pushHeadline(state, `\u{1F52A} Derby week. ${state.clubName} against ${rival}, and the table will not save anybody.`);
      return;
    }
  }

  // Deadline countdown while the window runs.
  if (state.transferWindow !== null && (state.windowWeeksLeft ?? 0) === 1) {
    pushHeadline(state, `\u{23F3} Deadline week. Any business left undone stays undone until the next window.`);
    return;
  }

  const leader = table[0];
  const second = table[1];
  const gap = leader.pts - second.pts;
  const stage = played / rounds;

  // Title race, roughly every third week so it moves with the table.
  if (played % 3 === 0) {
    if (stage > 0.7 && gap >= 8) {
      pushHeadline(state, `\u{1F3C6} ${leader.club} are ${gap} points clear with the run-in on. The league is starting to look decided.`);
    } else if (gap <= 2 && stage > 0.25) {
      pushHeadline(state, `\u{1F3C6} ${leader.club} lead ${second.club} by ${gap === 0 ? 'goal difference alone' : `${gap} ${gap === 1 ? 'point' : 'points'}`}. Title race.`);
    } else {
      pushHeadline(state, `\u{1F4CA} ${leader.club} top the ${league.name} on ${leader.pts} points after ${played} rounds.`);
    }
    return;
  }

  // The other end of the table, once the season has shape.
  const drop = relegationSpots(league.id);
  if (drop > 0 && stage > 0.4 && played % 3 === 1) {
    const bottom = table[table.length - 1];
    const safeRow = table[table.length - 1 - drop];
    const adrift = safeRow.pts - bottom.pts;
    if (adrift >= 6 && stage > 0.6) {
      pushHeadline(state, `\u{1F6A8} ${bottom.club} are ${adrift} points from safety and running out of games.`);
    } else {
      pushHeadline(state, `\u{1F6A8} The relegation scrap: ${bottom.club} bottom on ${bottom.pts}, ${adrift} ${adrift === 1 ? 'point' : 'points'} from safety.`);
    }
    return;
  }

  // Numbers stories off the real table: sharpest attack, meanest defence.
  const byGf = [...table].sort((a, b) => b.gf - a.gf)[0];
  const byGa = [...table].sort((a, b) => a.ga - b.ga)[0];
  if (played % 2 === 0 && byGf.gf > 0) {
    pushHeadline(state, `\u{26BD} ${byGf.club} have the sharpest attack in the ${league.name}: ${byGf.gf} scored in ${played} rounds.`);
  } else if (byGa.ga >= 0) {
    pushHeadline(state, `\u{1F9F1} Nobody is harder to score on than ${byGa.club}: ${byGa.ga} conceded all season.`);
  }
}

function generateHeadlines(state: CareerState): void {
  const market = buildMarket(state);
  const count = Math.min(ri(3, 6), market.length);
  const candidates = shuffle(market.slice(0, 120)).slice(0, count);
  const heads: string[] = [];
  // Round 99: found by playing it. The old rule picked the buyer at random
  // from my league or a big spender list, so the news feed produced things
  // like "Hull City sign Alphonso Davies for 42m" and "Twente sign Desire
  // Doue for 88m". Promoted sides and mid table Eredivisie clubs do not sign
  // 80m superstars, and a feed that says they do reads as fake immediately.
  // A club can only be in for a player its budget could plausibly cover.
  const myLeagueNames = leagueOf(state.clubName).clubs;
  const allClubs = REAL_LEAGUES.flatMap(l => playableClubs(l.id));
  for (const mp of candidates) {
    const fee = Math.max(1, Math.round(mp.price * (0.9 + Math.random() * 0.25)));
    // Who could actually afford him. One player can eat a club's entire
    // transfer budget for the season if he is the marquee signing, but not
    // more than that, which is what keeps Brentford out of the Osimhen race.
    const affordable = allClubs.filter(c => c.name !== state.clubName && c.name !== mp.club && c.budget >= fee);
    // Weight toward my own league so the feed still feels local, but only
    // among the clubs that could really do the deal.
    const local = affordable.filter(c => myLeagueNames.includes(c.name));
    const pool = (local.length && Math.random() < 0.5) ? local : affordable;
    if (pool.length === 0) continue;   // nobody in the world can afford him
    const buyer = pick(pool).name;
    heads.push(`${buyer} sign ${mp.name} from ${mp.club} for ${money(fee)}.`);
    state.goneNames.push(mp.name);
    // Round 71: every AI deal lands in the Latest Transfers feed too.
    pushNews(state, { name: mp.name, from: mp.club, to: buyer, fee });
  }
  /* Round 141: the window's own record deal gets a line, read off the same
     transferLog the Latest Transfers card shows, so the two never disagree. */
  const seasonDeals = (state.transferLog ?? []).filter(t => t.season === state.season && !t.loan);
  if (seasonDeals.length) {
    const record = seasonDeals.reduce((a, b) => (b.fee > a.fee ? b : a));
    if (record.fee >= 25) {
      heads.push(`\u{1F4B0} The window's biggest deal so far: ${record.name} to ${record.to} for ${money(record.fee)}.`);
    }
  }
  state.aiHeadlines = heads;
  // Round 71: a fresh window also means AI clubs come sniffing at my squad.
  generateIncomingBids(state);
}

/* ================================================================== */
/* Season scaffolding: strengths, fixtures, calendar, cup + UCL       */
/* ================================================================== */

/**
 * Per-season strength for every club we might face (with a little jitter).
 * Round 70: strengths come straight from the baked real rosters (best-XI
 * average of the value-derived ratings), so the data drives the sim. The
 * old priors only back up anything outside the bake.
 */
function genClubStrengths(myLeague: LeagueDef, yearsOnNow = 0): Record<string, number> {
  const out: Record<string, number> = {};
  // Round 132: from the PROJECTED roster for this world year, not from the
  // frozen 2026 bake. Before this, every AI club in the game was recomputed
  // from August 2026 every single summer, so Arsenal were 89.5 in season one
  // and 89.5 in season thirteen while my own squad was ageing underneath me.
  // At yearsOn 0 the projection is the bake, so season one has not moved.
  const baseFor = (name: string): number =>
    projectedXIAvg(name, yearsOnNow) ?? STRENGTH_PRIORS[name] ?? Math.max(clubPreviewRating(name), 66);
  for (const name of myLeague.clubs) {
    out[name] = clamp(baseFor(name) + ri(-2, 2), 52, 95);
  }
  for (const league of REAL_LEAGUES) {
    for (const name of league.clubs) {
      if (out[name] !== undefined) continue;
      out[name] = clamp(baseFor(name) + ri(-2, 2), 52, 95);
    }
  }
  for (const e of EURO_CLUBS) {
    if (out[e] !== undefined) continue;
    out[e] = clamp(baseFor(e) + ri(-2, 2), 56, 92);
  }
  return out;
}

function strengthOf(state: CareerState, club: string): number {
  return state.clubStrengths[club] ?? STRENGTH_PRIORS[club] ?? Math.max(clubPreviewRating(club), 64);
}

/** Ghost club that gives one side a bye in odd-sized leagues (MLS's 15). */
const BYE = '__BYE__';

/**
 * Double round robin via the circle method: the first half mirrors into the
 * second with venues swapped. Round 72: odd-sized leagues (each MLS
 * conference has 15 clubs) get a ghost BYE entrant, so every round one club
 * rests and everyone ends on 2*(n-1) games across 2*n rounds.
 * Pure function of (clubs, round).
 */
function roundPairs(clubs: string[], round: number): [string, string][] {
  const list = clubs.length % 2 === 0 ? clubs : [...clubs, BYE];
  const n = list.length;
  const r = round % (n - 1);
  const rest = list.slice(1);
  const rot = [...rest.slice(r), ...rest.slice(0, r)];
  const arr = [list[0], ...rot];
  const pairs: [string, string][] = [];
  for (let i = 0; i < n / 2; i++) {
    let h = arr[i];
    let a = arr[n - 1 - i];
    if ((r + i) % 2 === 1) [h, a] = [a, h];
    if (round >= n - 1) [h, a] = [a, h];
    if (h === BYE || a === BYE) continue;
    pairs.push([h, a]);
  }
  return pairs;
}

/**
 * Season calendar: every league round with the domestic cup, UCL group
 * matchdays, UCL knockouts and the January window interleaved between them.
 * League length follows the real league: 38 rounds for 20 clubs, 34 for the
 * 18-club Bundesliga and Ligue 1.
 */
/**
 * Round 72: the calendar marks are proportional to the league length, so a
 * 15-club MLS conference (28 rounds), an 18 or 20-club league, and the
 * 24-club Championship (46 rounds) all fit every cup round and the window
 * inside the season. The old fixed marks silently dropped the cup final for
 * any league shorter than 30 rounds.
 */
function buildCalendar(leagueSize: number): CalendarEntry[] {
  // Odd-sized leagues carry a BYE ghost, so the schedule runs 2*n rounds.
  const effSize = leagueSize % 2 === 0 ? leagueSize : leagueSize + 1;
  const rounds = 2 * (effSize - 1);
  const at = (f: number): number => Math.max(0, Math.min(rounds - 1, Math.round(rounds * f)));
  const marks = {
    ucl: [at(0.05), at(0.13), at(0.21), at(0.27), at(0.32), at(0.39)],
    cupR16: at(0.16), cupQF: at(0.37), window: at(0.47),
    uclQF: at(0.58), cupSF: at(0.68), uclSF: at(0.76), cupF: at(0.87), uclF: at(0.92),
  };
  const cal: CalendarEntry[] = [];
  let md = 0;
  for (let r = 0; r < rounds; r++) {
    cal.push({ type: 'league', round: r });
    while (md < 6 && marks.ucl[md] === r) {
      cal.push({ type: 'uclGroup', round: md });
      md += 1;
    }
    if (r === marks.cupR16) cal.push({ type: 'cup', round: 0, cupRound: 'R16' });
    if (r === marks.cupQF) cal.push({ type: 'cup', round: 0, cupRound: 'QF' });
    if (r === marks.window) cal.push({ type: 'window', round: 0 });
    if (r === marks.uclQF) cal.push({ type: 'uclKo', round: 0, uclRound: 'QF' });
    if (r === marks.cupSF) cal.push({ type: 'cup', round: 0, cupRound: 'SF' });
    if (r === marks.uclSF) cal.push({ type: 'uclKo', round: 0, uclRound: 'SF' });
    if (r === marks.cupF) cal.push({ type: 'cup', round: 0, cupRound: 'F' });
    if (r === marks.uclF) cal.push({ type: 'uclKo', round: 0, uclRound: 'F' });
  }
  return cal;
}

/* ---------- Round 95: the rest of the football world ---------- */

/** Total rounds a league of this size plays (mirrors buildCalendar). */
export function leagueRounds(size: number): number {
  const eff = size % 2 === 0 ? size : size + 1;
  return 2 * (eff - 1);
}

/** Blank standings for every league except my own. */
function initWorld(myClub: string): Record<string, WorldLeague> {
  const mine = leagueOf(myClub).id;
  const world: Record<string, WorldLeague> = {};
  for (const lg of REAL_LEAGUES) {
    if (lg.id === mine) continue;
    world[lg.id] = { round: 0, table: lg.clubs.map(emptyRow) };
  }
  return world;
}

/** League rounds of MY season played through calendar index `upto` (exclusive). */
function myRoundsPlayed(state: CareerState, upto: number): number {
  let n = 0;
  const end = Math.min(upto, state.calendar.length);
  for (let w = 0; w < end; w++) if (state.calendar[w].type === 'league') n += 1;
  return n;
}

/**
 * Drag every other league up to the same FRACTION of its season that I am
 * through mine, playing however many rounds that takes. Leagues are not all
 * the same size (the Championship plays 46 rounds where the Premier League
 * plays 38, MLS conferences 30), so ticking one round each would leave the
 * bigger leagues unfinished when my season ends. Proportional progress means
 * every league in the world crosses its own finish line with me.
 *
 * This also doubles as the repair path for a save made before Round 95: it
 * has no world at all, and starting one from zero halfway through a season
 * would show tables that make no sense, so we simulate it up to where I am.
 * Mutates state.
 */
function syncWorld(state: CareerState, myPlayed: number): void {
  if (!state.world) state.world = initWorld(state.clubName);
  const myTotal = leagueRounds(leagueOf(state.clubName).clubs.length);
  const frac = myTotal > 0 ? Math.min(1, myPlayed / myTotal) : 0;
  for (const lg of REAL_LEAGUES) {
    const w = state.world[lg.id];
    if (!w) continue;
    const total = leagueRounds(lg.clubs.length);
    const target = Math.min(total, Math.round(total * frac));
    let guard = 0;
    while (w.round < target && guard < 200) {
      guard += 1;
      for (const [h, a] of roundPairs(lg.clubs, w.round)) {
        const [hg, ag] = simAiMatch(state, h, a);
        applyResult(w.table, h, a, hg, ag);
      }
      w.round += 1;
    }
  }
}

/* ---------- Round 95: a real Champions League bracket ---------- */

/** The eight clubs in the knockout draw: me (if through) plus Europe's best. */
function uclBracketField(state: CareerState, includeMe: boolean): string[] {
  const taken = new Set<string>([state.clubName, ...(state.uclGroup?.opponents ?? [])]);
  const bigLeague = CLUBS.filter(c => c.tier <= 2).map(c => c.name);
  const pool = shuffle([...new Set([...EURO_CLUBS, ...bigLeague])].filter(c => !taken.has(c)));
  const others = pool.slice(0, includeMe ? 7 : 8);
  const field = includeMe ? [state.clubName, ...others] : others;
  // Guard against a thin pool: never hand back fewer than eight names.
  let n = 1;
  while (field.length < 8) field.push(`Continental XI ${n++}`);
  return field;
}

/** Build the quarter-final ties. My club always sits in slot 0 when I am in. */
function buildUclBracket(state: CareerState, includeMe: boolean): UclTie[] {
  const field = uclBracketField(state, includeMe);
  const ties: UclTie[] = [];
  for (let i = 0; i < 4; i++) {
    const home = field[i * 2];
    const away = field[i * 2 + 1];
    ties.push({
      round: 'QF', slot: i, home, away,
      homeGoals: null, awayGoals: null, winner: null,
      mine: home === state.clubName || away === state.clubName,
    });
  }
  return ties;
}

/** Settle every tie in a round that is not mine, then seed the next round. */
function advanceUclBracket(state: CareerState, round: UclKoRound): void {
  const bracket = state.uclBracket;
  if (!bracket) return;
  for (const t of bracket) {
    if (t.round !== round || t.winner) continue;
    if (t.mine) continue;                     // my tie is settled by my match
    const [hg, ag] = simAiMatch(state, t.home, t.away);
    t.homeGoals = hg;
    t.awayGoals = ag;
    if (hg === ag) {
      // Knockout football always produces a winner, and level means penalties.
      t.pens = true;
      t.winner = Math.random() < 0.5 ? t.home : t.away;
    } else {
      t.winner = hg > ag ? t.home : t.away;
    }
  }
  const next: UclKoRound | null = round === 'QF' ? 'SF' : round === 'SF' ? 'F' : null;
  if (!next) return;
  if (bracket.some(t => t.round === next)) return;
  const thisRound = bracket.filter(t => t.round === round).sort((a, b) => a.slot - b.slot);
  // Never seed a half-finished round: my own tie is settled by my match, so
  // the semi-finals wait for me rather than guessing.
  if (thisRound.some(t => !t.winner)) return;
  const winners = thisRound.map(t => t.winner).filter((w): w is string => !!w);
  if (winners.length < 2) return;
  for (let i = 0; i * 2 + 1 < winners.length; i++) {
    const home = winners[i * 2];
    const away = winners[i * 2 + 1];
    bracket.push({
      round: next, slot: i, home, away,
      homeGoals: null, awayGoals: null, winner: null,
      mine: home === state.clubName || away === state.clubName,
    });
  }
}

/** Record MY result into the bracket so the picture stays honest. */
/** Who the bracket says I play in a given round, if anyone. */
function myUclOpponent(state: CareerState, round: UclKoRound): string | null {
  const tie = state.uclBracket?.find(t => t.round === round && t.mine);
  if (!tie) return null;
  return tie.home === state.clubName ? tie.away : tie.home;
}

function recordMyUclTie(state: CareerState, round: UclKoRound, opponent: string, myGoals: number, oppGoals: number, iWon: boolean): void {
  const tie = state.uclBracket?.find(t => t.round === round && t.mine);
  if (!tie) return;
  const iAmHome = tie.home === state.clubName;
  tie.homeGoals = iAmHome ? myGoals : oppGoals;
  tie.awayGoals = iAmHome ? oppGoals : myGoals;
  if (myGoals === oppGoals) tie.pens = true;
  tie.winner = iWon ? state.clubName : opponent;
}

function initUclGroup(qualified: boolean, myClub: string): UclGroupState | null {
  if (!qualified) return null;
  // Groups avoid clubs from my own league, like the real group/league phase.
  const myLeagueClubs = new Set(leagueOf(myClub).clubs);
  const bigForeign = CLUBS.map(c => c.name).filter(c => c !== myClub && !myLeagueClubs.has(c));
  const pool = [...new Set([...EURO_CLUBS, ...bigForeign])].filter(c => c !== myClub && !myLeagueClubs.has(c));
  const opponents = shuffle(pool).slice(0, 3);
  return {
    opponents,
    table: [myClub, ...opponents].map(emptyRow),
    matchday: 0,
  };
}

function drawCupOpponent(state: CareerState): string {
  const others = state.leagueClubs.filter(c => c !== state.clubName);
  return pick(others);
}

/* ---------- Round 102: the domestic cup is a real tournament ---------- */

/** Which league tiers of this country the cup draws from. */
function cupCountryClubs(state: CareerState): ClubDef[] {
  const myLeague = leagueOf(state.clubName);
  const nation = NATIONS.find(n => n.leagueIds.includes(myLeague.id));
  const ids = nation ? nation.leagueIds : [myLeague.id];
  return ids.flatMap(id => playableClubs(id));
}

/**
 * Sixteen clubs, my own plus fifteen more from the whole country. The field
 * is weighted toward the top flight the way a real cup is by the time it
 * reaches the last sixteen, but a couple of lower division sides get in,
 * because a cup with nobody to knock over is just another league.
 */
function buildCupBracket(state: CareerState): CupTie[] {
  const all = cupCountryClubs(state).filter(c => c.name !== state.clubName);
  const myLeagueNames = new Set(leagueOf(state.clubName).clubs);
  const top = shuffle(all.filter(c => myLeagueNames.has(c.name)));
  const lower = shuffle(all.filter(c => !myLeagueNames.has(c.name)));
  const field = [state.clubName];
  // Two or three from outside my division when the country has one.
  const lowerCount = lower.length ? ri(2, 3) : 0;
  for (const c of lower.slice(0, lowerCount)) field.push(c.name);
  for (const c of top) {
    if (field.length >= 16) break;
    field.push(c.name);
  }
  // Thin country: fall back to anyone left rather than a short bracket.
  for (const c of [...lower.slice(lowerCount), ...all]) {
    if (field.length >= 16) break;
    if (!field.includes(c.name)) field.push(c.name);
  }
  const rest = shuffle(field.slice(1));
  const ordered = [state.clubName, ...rest];
  const ties: CupTie[] = [];
  for (let i = 0; i < 8 && i * 2 + 1 < ordered.length; i++) {
    const home = ordered[i * 2];
    const away = ordered[i * 2 + 1];
    ties.push({
      round: 'R16', slot: i, home, away,
      homeGoals: null, awayGoals: null, winner: null,
      mine: home === state.clubName || away === state.clubName,
    });
  }
  return ties;
}

/** True when the winner came from a lower division than the loser. */
function isCupUpset(state: CareerState, winner: string, loser: string): boolean {
  const top = new Set(leagueOf(state.clubName).clubs);
  const w = clubByName(winner);
  const l = clubByName(loser);
  if (!w || !l) return false;
  if (top.has(loser) && !top.has(winner)) return true;
  return w.tier - l.tier >= 2;
}

/** Play out everyone else's ties in a round, then seed the next one. */
function advanceCupBracket(state: CareerState, round: CupRound): void {
  const bracket = state.cupBracket;
  if (!bracket) return;
  for (const t of bracket) {
    if (t.round !== round || t.winner || t.mine) continue;
    const [hg, ag] = simAiMatch(state, t.home, t.away);
    t.homeGoals = hg;
    t.awayGoals = ag;
    if (hg === ag) {
      t.pens = true;
      t.winner = Math.random() < 0.5 ? t.home : t.away;
    } else {
      t.winner = hg > ag ? t.home : t.away;
    }
    const loser = t.winner === t.home ? t.away : t.home;
    if (isCupUpset(state, t.winner, loser)) t.upset = true;
  }
  const next: CupRound | null = round === 'R16' ? 'QF' : round === 'QF' ? 'SF' : round === 'SF' ? 'F' : null;
  if (!next) return;
  if (bracket.some(t => t.round === next)) return;
  const thisRound = bracket.filter(t => t.round === round).sort((a, b) => a.slot - b.slot);
  if (thisRound.some(t => !t.winner)) return;   // my tie is settled by my match
  const winners = thisRound.map(t => t.winner).filter((w): w is string => !!w);
  for (let i = 0; i * 2 + 1 < winners.length; i++) {
    const home = winners[i * 2];
    const away = winners[i * 2 + 1];
    bracket.push({
      round: next, slot: i, home, away,
      homeGoals: null, awayGoals: null, winner: null,
      mine: home === state.clubName || away === state.clubName,
    });
  }
}

/** Who the bracket says I face in a cup round. */
function myCupOpponent(state: CareerState, round: CupRound): string | null {
  const tie = state.cupBracket?.find(t => t.round === round && t.mine);
  if (!tie) return null;
  return tie.home === state.clubName ? tie.away : tie.home;
}

/** Write MY result into the cup bracket. */
function recordMyCupTie(state: CareerState, round: CupRound, opponent: string, myGoals: number, oppGoals: number, iWon: boolean): void {
  const tie = state.cupBracket?.find(t => t.round === round && t.mine);
  if (!tie) return;
  const iAmHome = tie.home === state.clubName;
  tie.homeGoals = iAmHome ? myGoals : oppGoals;
  tie.awayGoals = iAmHome ? oppGoals : myGoals;
  if (myGoals === oppGoals) tie.pens = true;
  tie.winner = iWon ? state.clubName : opponent;
  const loser = iWon ? opponent : state.clubName;
  if (isCupUpset(state, tie.winner, loser)) tie.upset = true;
}

function drawUclKoOpponent(state: CareerState): string {
  const already = new Set<string>([
    state.clubName,
    ...(state.uclGroup ? state.uclGroup.opponents : []),
    ...Object.values(state.uclDraw).filter((c): c is string => !!c),
  ]);
  const bigLeague = CLUBS.filter(c => c.tier <= 2).map(c => c.name);
  const pool = [...EURO_CLUBS, ...bigLeague].filter(c => !already.has(c));
  return pool.length ? pick(pool) : 'Galacticos XI';
}

/** Cup/UCL venue pattern (deterministic so previews match played matches). */
function cupVenue(round: CupRound): boolean | null {
  return round === 'R16' ? true : round === 'QF' ? false : round === 'SF' ? true : null;
}
function uclKoVenue(round: UclKoRound): boolean | null {
  return round === 'QF' ? true : round === 'SF' ? false : null;
}

/** Does this calendar entry involve my club right now? */
function entryInvolvesMe(state: CareerState, entry: CalendarEntry): boolean {
  switch (entry.type) {
    case 'league': return true;
    case 'window': return true;
    case 'cup': return state.cupRound === entry.cupRound;
    case 'uclGroup': return state.uclGroup !== null && state.uclKoRound === null;
    case 'uclKo': return state.uclKoRound === entry.uclRound;
    default: return false;
  }
}

/* ================================================================== */
/* Round 70: board objectives, one demand per season                  */
/* ================================================================== */

const CUP_STAGE_RANK: Record<CupRound, number> = { R16: 0, QF: 1, SF: 2, F: 3 };
const UCL_STAGE_RANK: Record<UclKoRound, number> = { QF: 1, SF: 2, F: 3 };

/** How far we got in the cup: 0 = still/exit at R16 ... 4 = won it. */
function cupProgressRank(state: CareerState): { rank: number; alive: boolean } {
  if (state.cupRound === 'won') return { rank: 4, alive: false };
  if (state.cupRound === 'out') return { rank: CUP_STAGE_RANK[state.cupExit ?? 'R16'], alive: false };
  return { rank: CUP_STAGE_RANK[state.cupRound], alive: true };
}

/** How far we got in Europe: 0 = group, 1 = knockouts ... 4 = won it. */
function uclProgressRank(state: CareerState): { rank: number; alive: boolean } {
  if (state.uclKoRound === 'won') return { rank: 4, alive: false };
  if (state.uclKoRound === 'out') {
    const exit = state.uclExit;
    return { rank: !exit || exit === 'group' ? 0 : UCL_STAGE_RANK[exit], alive: false };
  }
  if (state.uclKoRound) return { rank: UCL_STAGE_RANK[state.uclKoRound], alive: true };
  return { rank: 0, alive: state.uclGroup !== null };
}

/** The league club whose squad strength sits closest to mine. */
function nearestRival(clubName: string): string | null {
  const league = leagueOf(clubName);
  const myXi = bakedXIAvg(clubName) ?? 65;
  const others = league.clubs
    .filter(c => c !== clubName)
    .map(c => ({ c, d: Math.abs((bakedXIAvg(c) ?? 65) - myXi) }))
    .sort((a, b) => a.d - b.d);
  return others.length ? others[0].c : null;
}

/**
 * The board's demands for a season: league finish, a cup run scaled to the
 * club's stature, Europe when qualified, finishing above the rival, and a
 * goals quota. "Way more expectations", per the owner.
 */
/**
 * Round 88, from his note: "for city they want top 2. I think city, Chelsea,
 * Liverpool all have standards to win it all... the relegation teams they
 * shouldn't say top 20 meaning they could get relegated and no team wants
 * that. Instead the board wants should be like place mid table or don't get
 * relegated."
 *
 * club.expectation is a raw strength RANK (1..leagueSize), so the bottom club
 * was literally being told "Finish top 20". Boards do not talk like that.
 * A rank now maps to a demand BAND that reads like a real board, and the
 * heavyweights are all told to win it, not to finish second.
 */
function relegationSpots(leagueId: string): number {
  // MLS conferences do not relegate; everyone else drops 1-3.
  if (leagueId.startsWith('mls')) return 0;
  if (leagueId === 'scottish' || leagueId === 'proleague') return 1;
  if (leagueId === 'bundesliga' || leagueId === 'bundesliga2' || leagueId === 'eredivisie' || leagueId === 'primeira') return 2;
  return 3;
}

/**
 * Round 140, from his review: "in real life Barca and no team is looking for
 * top 2. There looking to win it all... So time teams should be like win the
 * league or get champions league football or Europa league or conference
 * league or finish mid table or dont get relegated."
 *
 * So the ladder is named competitions now, not positions. The number in
 * brackets stays because the game grades by table position and the player
 * deserves to know the line, but the DEMAND is the competition.
 *
 * European places per league, 2026-27 shapes, simplified on purpose: the cup
 * winner routes and coefficient bonus spots move year to year, so each league
 * gets its stable league-position core and the label says which competition
 * that position feeds. Ligue 1 sends fewer straight to the group stage than
 * England or Spain, the Eredivisie champion goes in but third place is
 * qualifying rounds, and that difference is the realism he is asking for.
 */
interface EuroSlots { ucl: number; uel: number; uecl: number }
export const EURO_SLOTS: Record<string, EuroSlots> = {
  premier:    { ucl: 4, uel: 5, uecl: 6 },
  laliga:     { ucl: 4, uel: 5, uecl: 6 },
  seriea:     { ucl: 4, uel: 5, uecl: 6 },
  bundesliga: { ucl: 4, uel: 5, uecl: 6 },
  ligue1:     { ucl: 3, uel: 4, uecl: 5 },
  eredivisie: { ucl: 2, uel: 3, uecl: 4 },
  // Round 140. Simplified like the rest: qualifying-round routes count as in.
  primeira:   { ucl: 2, uel: 3, uecl: 4 },
  scottish:   { ucl: 1, uel: 2, uecl: 3 },
  superlig:   { ucl: 1, uel: 2, uecl: 3 },
  proleague:  { ucl: 1, uel: 2, uecl: 3 },
};

function leagueDemand(rank: number, tier: number, size: number, league: LeagueDef): { target: number; label: string } {
  const half = Math.floor(size / 2);
  const drop = relegationSpots(league.id);

  // The second divisions are their own world: the prize is going UP.
  if (league.id === 'championship') {
    if (rank <= 2 || (rank <= 4 && tier <= 2)) {
      // A club this big in this division exists to leave it immediately.
      return { target: 2, label: `Win automatic promotion (top 2)` };
    }
    if (rank <= 8) return { target: 6, label: `Make the promotion playoffs (top 6)` };
    if (rank <= Math.round(size * 0.65)) return { target: half, label: `Finish in the top half` };
    return { target: size - drop, label: `Stay up. Avoid relegation` };
  }
  // Round 142: Germany's second tier sends two straight up and the third
  // placed side into a playoff against the Bundesliga's sixteenth.
  if (league.id === 'bundesliga2') {
    if (rank <= 2 || (rank <= 4 && tier <= 2)) {
      return { target: 2, label: `Win automatic promotion (top 2)` };
    }
    if (rank <= 6) return { target: 3, label: `Reach the promotion playoff (3rd)` };
    if (rank <= Math.round(size * 0.65)) return { target: half, label: `Finish in the top half` };
    return { target: size - drop, label: `Stay up. Avoid relegation` };
  }

  // MLS: no relegation exists, so no board can honestly threaten it.
  if (league.id.startsWith('mls')) {
    if (rank <= 2) return { target: 1, label: `Win the ${league.name}` };
    if (rank <= 9) return { target: 8, label: `Make the playoffs (top 8)` };
    return { target: size - 4, label: `Finish mid-table or better` };
  }

  // Heavyweights everywhere else: the badge demands the title, full stop.
  if (rank <= 2 || (rank <= 4 && tier <= 2)) {
    return { target: 1, label: `Win the ${league.name}` };
  }

  const slots = EURO_SLOTS[league.id];
  if (league.euro && slots) {
    if (rank <= slots.ucl + 1) {
      return { target: slots.ucl, label: `Qualify for the Champions League (top ${slots.ucl})` };
    }
    if (rank <= slots.uel + 2) {
      return { target: slots.uel, label: `Qualify for the Europa League (top ${slots.uel})` };
    }
    if (rank <= slots.uecl + 3) {
      return { target: slots.uecl, label: `Qualify for the Conference League (top ${slots.uecl})` };
    }
  }

  // Saudi Pro League: the continental prize is the AFC Champions League.
  if (league.id === 'saudi' && rank <= 5) {
    return { target: 3, label: `Qualify for the AFC Champions League Elite (top 3)` };
  }

  if (rank <= Math.round(size * 0.65)) {
    return { target: half, label: `Finish in the top half` };
  }
  if (drop === 0) {
    return { target: Math.max(half, size - 3), label: `Finish mid-table or better` };
  }
  return { target: size - drop, label: `Stay up. Avoid relegation` };
}

export function buildBoardObjectives(clubName: string, hasUcl: boolean, leagueSize: number): BoardObjective[] {
  const club = clubDefFor(clubName);
  const league = leagueOf(clubName);
  const objs: BoardObjective[] = [];
  const demand = leagueDemand(club.expectation, club.tier, leagueSize, league);
  objs.push({ id: 'league', target: demand.target, label: demand.label });
  const cupTarget = club.tier === 1 ? 4 : club.tier === 2 ? 3 : club.tier === 3 ? 2 : 1;
  objs.push({
    id: 'cup',
    target: cupTarget,
    label:
      cupTarget === 4 ? `Win the ${league.cupName}` :
      cupTarget === 3 ? `Reach the ${league.cupName} final` :
      cupTarget === 2 ? `Reach the ${league.cupName} semi-finals` :
      `Win your ${league.cupName} Round of 16 tie`,
  });
  if (hasUcl) {
    const t = club.tier === 1 ? 2 : 1;
    objs.push({
      id: 'ucl',
      target: t,
      label: t === 2 ? 'Reach the Champions League semi-finals' : 'Make the Champions League knockouts',
    });
  }
  const mapped = RIVALS[clubName];
  const rival = mapped && league.clubs.includes(mapped) ? mapped : nearestRival(clubName);
  if (rival) {
    objs.push({ id: 'rival', target: 0, rivalName: rival, label: `Finish above ${rival}` });
  }
  const rounds = 2 * (leagueSize - 1);
  /* Round 88: boards no longer all want the same thing. Every club gets a
     performance mandate picked deterministically from its name (so your club
     always asks the same thing, but the league as a whole feels varied), and
     developing clubs also get a squad-building philosophy on top. His ask:
     "a team wants more experienced players or more home grown players or
     younger players to develop... there are tons of board expectations". */
  let h = 0;
  for (let i = 0; i < clubName.length; i++) h = (h * 31 + clubName.charCodeAt(i)) >>> 0;

  /* Round 140: a third mandate shape, the points floor, joins goals and
     defence, because "add more on board wants" was asked twice. Which one a
     club gets is still deterministic from its name. */
  const mode = h % 3;
  if (mode === 0) {
    const goalsBase = club.tier === 1 ? 78 : club.tier === 2 ? 70 : club.tier === 3 ? 62 : 50;
    // Round 72: quota scales with the real season length (28 to 46 rounds now).
    const goals = Math.max(30, Math.round(goalsBase * (rounds / 38)));
    objs.push({ id: 'goals', target: goals, label: `Score ${goals}+ league goals` });
  } else if (mode === 1) {
    const gaBase = club.tier === 1 ? 34 : club.tier === 2 ? 40 : club.tier === 3 ? 48 : 58;
    const ga = Math.max(18, Math.round(gaBase * (rounds / 38)));
    objs.push({ id: 'defence', target: ga, label: `Concede fewer than ${ga} league goals` });
  } else {
    // The floor tracks the demand band, so the points ask never contradicts
    // the league ask sitting right above it.
    const ptsBase = demand.target === 1 ? 80 : demand.target <= 4 ? 68 : demand.target <= 6 ? 60 : demand.target <= Math.floor(leagueSize / 2) ? 50 : 40;
    const pts = Math.max(24, Math.round(ptsBase * (rounds / 38)));
    objs.push({ id: 'points', target: pts, label: `Bank ${pts}+ league points` });
  }

  /* Round 140: the biggest clubs sometimes want history, not just the title.
     Deterministic and rare, so it reads as an event when your board asks. */
  if (club.tier === 1 && demand.target === 1 && h % 5 === 0) {
    objs.push({ id: 'double', target: 0, label: `Win the ${league.name} and ${league.cupName} double` });
  }

  // Smaller clubs are told to build, not just to survive.
  if (club.tier >= 3) {
    const youth = club.tier === 4 ? 3 : 2;
    objs.push({ id: 'youth', target: youth, label: `Blood ${youth} under-21 players in the league` });
  }

  /* Round 140: selling clubs are run as businesses, and the board says so.
     Grades against the season's ins and outs, so player trading is a stated
     expectation rather than an accident of the budget screen. */
  if (club.tier === 4 || (club.tier === 3 && h % 2 === 1)) {
    objs.push({ id: 'netSpend', target: 0, label: `Turn a profit in the transfer market` });
  }
  return objs;
}

/**
 * Live status of every board objective. Pure; the hub renders this and
 * finishSeason grades from it (seasonDone flips onTrack/behind into
 * done/failed).
 */
export function objectiveStatuses(career: CareerState): { objective: BoardObjective; status: ObjectiveStatus }[] {
  const objs = career.boardObjectives ?? [];
  const table = sortedTable(career.table);
  const myIdx = table.findIndex(r => r.club === career.clubName);
  const myPos = myIdx >= 0 ? myIdx + 1 : 1;
  const myRow = myIdx >= 0 ? table[myIdx] : null;
  const roundsTotal = career.leagueClubs.length > 1 ? 2 * (career.leagueClubs.length - 1) : 38;
  const played = myRow ? myRow.w + myRow.d + myRow.l : 0;
  const seasonDone = career.week >= career.calendar.length;
  return objs.map(objective => {
    let status: ObjectiveStatus = 'onTrack';
    if (objective.id === 'league') {
      const met = myPos <= objective.target;
      status = seasonDone ? (met ? 'done' : 'failed') : (met ? 'onTrack' : 'behind');
    } else if (objective.id === 'cup') {
      const { rank, alive } = cupProgressRank(career);
      status = rank >= objective.target ? 'done' : alive ? 'onTrack' : 'failed';
    } else if (objective.id === 'ucl') {
      const { rank, alive } = uclProgressRank(career);
      status = rank >= objective.target ? 'done' : alive ? 'onTrack' : 'failed';
    } else if (objective.id === 'rival') {
      const rIdx = table.findIndex(r => r.club === objective.rivalName);
      if (rIdx < 0) {
        status = 'onTrack';
      } else {
        const above = myPos < rIdx + 1;
        status = seasonDone ? (above ? 'done' : 'failed') : (above || myPos === rIdx + 1 ? 'onTrack' : 'behind');
      }
    } else if (objective.id === 'defence') {
      // Round 88: a CEILING objective, so it can only be judged on pace and
      // is only truly "done" once the season is over and the ceiling held.
      const ga = myRow ? myRow.ga : 0;
      if (ga >= objective.target) {
        status = 'failed';
      } else if (seasonDone) {
        status = 'done';
      } else {
        const pace = played > 0 ? (ga / played) * roundsTotal : 0;
        status = pace <= objective.target * 0.98 ? 'onTrack' : 'behind';
      }
    } else if (objective.id === 'youth') {
      const blooded = career.squad.filter(p => p.age <= 21 && (p.apps ?? 0) > 0).length;
      if (blooded >= objective.target) {
        status = 'done';
      } else if (seasonDone) {
        status = 'failed';
      } else {
        // Plenty of season left is still "on track"; it only reads as behind
        // once the run-in starts and the kids are still not playing.
        const late = played > roundsTotal * 0.6;
        status = late ? 'behind' : 'onTrack';
      }
    } else if (objective.id === 'points') {
      // Round 140: a floor, graded on pace exactly like the goals quota.
      const pts = myRow ? myRow.pts : 0;
      if (pts >= objective.target) {
        status = 'done';
      } else if (seasonDone) {
        status = 'failed';
      } else {
        const pace = played > 0 ? (pts / played) * roundsTotal : objective.target;
        status = pace >= objective.target * 0.92 ? 'onTrack' : 'behind';
      }
    } else if (objective.id === 'double') {
      /* Round 140: both trophies or nothing. Alive while both are alive. */
      const cup = cupProgressRank(career);
      const wonCup = career.cupRound === 'won';
      const top = myPos === 1;
      if (wonCup && top && seasonDone) {
        status = 'done';
      } else if (career.cupRound === 'out' || (seasonDone && (!top || !wonCup))) {
        status = 'failed';
      } else {
        status = top && (cup.alive || wonCup) ? 'onTrack' : 'behind';
      }
    } else if (objective.id === 'netSpend') {
      /* Round 140: sell for more than you spend, graded off the season's
         actual ins and outs. Loans count at their fee, which is the cash. */
      const net = (career.seasonSignings ?? []).reduce(
        (s, x) => s + (x.dir === 'out' ? x.fee : -x.fee), 0);
      if (seasonDone) {
        status = net >= 0 ? 'done' : 'failed';
      } else {
        status = net >= 0 ? 'onTrack' : 'behind';
      }
    } else {
      const gf = myRow ? myRow.gf : 0;
      if (gf >= objective.target) {
        status = 'done';
      } else if (seasonDone) {
        status = 'failed';
      } else {
        const pace = played > 0 ? (gf / played) * roundsTotal : objective.target;
        status = pace >= objective.target * 0.92 ? 'onTrack' : 'behind';
      }
    }
    return { objective, status };
  });
}

/* ================================================================== */
/* Match engine                                                       */
/* ================================================================== */

const MENT_MOD: Record<Mentality, { atk: number; def: number }> = {
  defensive: { atk: -0.38, def: -0.32 },
  balanced: { atk: 0, def: 0 },
  attacking: { atk: 0.42, def: 0.34 },
};

function poisson(lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k += 1;
    p *= Math.random();
  } while (p > L);
  return Math.min(k - 1, 7);
}

/** Score for A vs B given strengths + extra xG boosts for each side. */
function simScore(sA: number, sB: number, boostA: number, boostB: number): [number, number] {
  const lA = clamp(1.25 + (sA - sB) * 0.055 + boostA, 0.12, 4.2);
  const lB = clamp(1.25 + (sB - sA) * 0.055 + boostB, 0.12, 4.2);
  return [poisson(lA), poisson(lB)];
}

/**
 * Round 119: one half of a match, and the reason the halftime break costs the
 * game nothing. A Poisson draw splits exactly: Poisson(L) has the same
 * distribution as Poisson(L/2) + Poisson(L/2). So a manager who walks into the
 * dressing room, changes nothing and walks back out gets precisely the game
 * that used to be simulated in one shot. Only an actual decision moves it.
 */
/**
 * Round 121: what the manager in the other dugout does at the break.
 *
 * Round 119 gave you a dressing room and gave the opposition nothing. You
 * could go two down, throw everyone forward, and the other manager would stand
 * there with his hands in his pockets for the whole second half. That is not a
 * hard game, it is a free one, and it is the wrong kind of easy: the reason to
 * fix it is not balance, it is that a side chasing a game and a side protecting
 * one are the two most recognisable things in football and neither existed.
 *
 * The rule is deliberately the plain one a real manager uses, not a clever one.
 * Behind, push. Two or more clear, see it out. Otherwise carry on. He does not
 * get to see your team sheet and he does not get to counter your change, so a
 * manager who reads the game still beats him. He just no longer stands still.
 */
function oppositionShape(oppGoals: number, myGoals: number): { atk: number; def: number } {
  /* A stronger version of this was tried and thrown away, and the numbers are
     worth keeping because the intuition was wrong. Giving a side two or more
     down an extra desperate tier (atk 0.62, def 0.58) sounded more realistic
     and measured worse on both counts: comebacks moved less than the plain
     rule did, 77.7 percent against 76.9, and it cost two league points a
     season because the opposition chases hardest exactly when you are ahead.
     Throwing more men forward raises both teams' chances, so piling it on does
     not tilt the result, it just widens the scoreline. The plain rule is the
     one that behaves. */
  /* Half strength, and the number is not a fudge. At full strength the rule
     cost a mid-table side 3.3 league points a season, measured against 3.0 for
     three standard errors, which is a balance change wearing a realism badge:
     a weaker club is behind more often, so an opponent who sits on a two goal
     lead suppresses exactly the comebacks that club depends on. Eleven rounds
     of tuning sit on top of these scorelines and none of them budgeted for it.
     Half the reaction keeps the shape of the thing, the other manager still
     pushes when he is behind and still shuts up shop when he is clear, at a
     cost the league table cannot feel. */
  const half = (m: { atk: number; def: number }) => ({ atk: m.atk / 2, def: m.def / 2 });
  if (oppGoals < myGoals) return half(MENT_MOD.attacking);
  if (oppGoals - myGoals >= 2) return half(MENT_MOD.defensive);
  return MENT_MOD.balanced;
}

function simHalf(sA: number, sB: number, boostA: number, boostB: number): [number, number] {
  const lA = clamp(1.25 + (sA - sB) * 0.055 + boostA, 0.12, 4.2) / 2;
  const lB = clamp(1.25 + (sB - sA) * 0.055 + boostB, 0.12, 4.2) / 2;
  return [poisson(lA), poisson(lB)];
}

/** Quick AI-vs-AI league result (small home edge). */
function simAiMatch(state: CareerState, home: string, away: string): [number, number] {
  return simScore(strengthOf(state, home), strengthOf(state, away), 0.2, -0.08);
}

/**
 * The XI that actually takes the field: the picked XI with unavailable or
 * missing players auto-replaced by the best available fit for that slot.
 */
function effectiveXI(state: CareerState): CMPlayer[] {
  const formation = FORMATIONS[state.formationIndex] ?? FORMATIONS[0];
  const used = new Set<string>();
  const out: CMPlayer[] = [];
  formation.slots.forEach((slot, i) => {
    const id = state.xiIds[i];
    let p = id ? state.squad.find(x => x.id === id) : undefined;
    if (!p || !isAvailable(p) || used.has(p.id)) {
      p = state.squad
        .filter(x => isAvailable(x) && !used.has(x.id))
        .sort((a, b) =>
          (slot.allowed.includes(b.position) ? 1 : 0) - (slot.allowed.includes(a.position) ? 1 : 0) ||
          b.rating - a.rating)[0];
    }
    if (p) {
      used.add(p.id);
      out.push(p);
    }
  });
  return out;
}

/** Round 119: the players behind a list of ids, in that order, skipping any gone. */
function squadByIds(state: CareerState, ids: string[]): CMPlayer[] {
  const out: CMPlayer[] = [];
  for (const id of ids) {
    const p = state.squad.find(x => x.id === id);
    if (p) out.push(p);
  }
  return out;
}

/** Match-day strength: XI ratings scaled by fitness + morale, plus form. */
/**
 * Round 95: my XI's strength on the SAME SCALE the AI clubs are rated on.
 *
 * This used to multiply every rating by a fitness and morale factor that
 * could never reach 1, so my club was permanently weaker than an AI club
 * with the identical squad. Condition is now a bounded SWING around the
 * squad's real rating, centred on the fitness and morale a squad actually
 * sits at through a season. A fresh, happy XI plays a couple of points above
 * itself, an exhausted and unhappy one a few points below, and neither is a
 * hidden tax on being the human in the dugout.
 */
function myMatchStrength(state: CareerState, xi: CMPlayer[]): number {
  if (!xi.length) return 40;
  const avg = xi.reduce((s, p) => s + p.rating, 0) / xi.length;
  const fit = xi.reduce((s, p) => s + p.fitness, 0) / xi.length;
  const mor = xi.reduce((s, p) => s + p.morale, 0) / xi.length;
  const condition = clamp((fit - 78) * 0.14 + (mor - 68) * 0.06, -7, 4);
  const formBonus = state.form.reduce((s, f) => s + (f === 'W' ? 0.7 : f === 'L' ? -0.7 : 0), 0);
  return avg + condition + formBonus;
}

function scorerWeight(p: CMPlayer): number {
  const pos = p.position;
  const base =
    pos === 'ST' || pos === 'CF' ? 5 :
    pos === 'LW' || pos === 'RW' ? 3.6 :
    pos === 'CAM' ? 3 :
    pos === 'LM' || pos === 'RM' ? 2.2 :
    pos === 'CM' ? 1.6 :
    pos === 'CDM' ? 0.9 :
    pos === 'GK' ? 0.02 : 0.55;
  return base * Math.pow(p.rating / 70, 2);
}

function weightedPick(xi: CMPlayer[], weight: (p: CMPlayer) => number): CMPlayer | null {
  if (!xi.length) return null;
  const weights = xi.map(weight);
  const total = weights.reduce((s, w) => s + w, 0);
  if (total <= 0) return pick(xi);
  let roll = Math.random() * total;
  for (let i = 0; i < xi.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return xi[i];
  }
  return xi[xi.length - 1];
}

/** Generates my scorers, bumps their season tallies, credits some assists.
 *  Round 73: also returns per-player goal/assist counts so match ratings can
 *  reward the players who actually produced. */
function generateMyScorers(
  state: CareerState,
  xi: CMPlayer[],
  goals: number,
): { lines: ScorerLine[]; goalCounts: Map<string, number>; assistCounts: Map<string, number> } {
  const minutes = Array.from({ length: goals }, () => ri(1, 90)).sort((a, b) => a - b);
  const lines: ScorerLine[] = [];
  const goalCounts = new Map<string, number>();
  const assistCounts = new Map<string, number>();
  for (let g = 0; g < goals; g++) {
    const scorer = weightedPick(xi, scorerWeight);
    if (!scorer) break;
    lines.push({ name: scorer.name, minute: minutes[g] });
    goalCounts.set(scorer.id, (goalCounts.get(scorer.id) ?? 0) + 1);
    const sq = state.squad.find(p => p.id === scorer.id);
    if (sq) {
      sq.seasonGoals += 1;
      sq.morale = clamp(sq.morale + 3, 5, 99);
    }
    if (Math.random() < 0.7) {
      const others = xi.filter(p => p.id !== scorer.id && p.position !== 'GK');
      const assister = weightedPick(others, p => scorerWeight(p) * 0.6 + 0.5);
      if (assister) {
        assistCounts.set(assister.id, (assistCounts.get(assister.id) ?? 0) + 1);
        const aq = state.squad.find(p => p.id === assister.id);
        if (aq) aq.seasonAssists += 1;
      }
    }
  }
  return { lines, goalCounts, assistCounts };
}

function generateOppScorers(opp: string, goals: number, yearsOnNow = 0): ScorerLine[] {
  const minutes = Array.from({ length: goals }, () => ri(1, 90)).sort((a, b) => a - b);
  // Round 70: opponent scorers are their real attackers from the baked
  // rosters, weighted toward the expensive ones, so "Semenyo 63'" instead of
  // "Bournemouth No. 9". Round 132: from the projected roster, so a 2036 match
  // report does not name a scorer who retired eight years earlier.
  const baked = projectedRoster(opp, yearsOnNow).filter(p =>
    groupOf(p.p) === 'ATT' || groupOf(p.p) === 'MID');
  const oppPool = getPool().filter(p =>
    p.club === opp && (groupOf(p.position) === 'ATT' || groupOf(p.position) === 'MID'));
  const lines: ScorerLine[] = [];
  for (let g = 0; g < goals; g++) {
    let name: string;
    if (baked.length) {
      const idx = Math.floor(Math.pow(Math.random(), 1.7) * baked.length);
      name = baked[Math.min(idx, baked.length - 1)].n;
    } else if (oppPool.length) {
      name = pick(oppPool).name;
    } else {
      name = `${opp} No. ${ri(7, 11)}`;
    }
    lines.push({ name, minute: minutes[g] });
  }
  return lines;
}

/** Weekly recovery tick: injuries count down, everyone else freshens up. */
/**
 * Round 95: recovery between fixtures, and the reason the human manager was
 * losing every season.
 *
 * The old rule was flat: play and lose 16 to 24 fitness, sit out and gain 24.
 * There is a match nearly every calendar week, so an ever present starter
 * slid all the way to the floor of 15 and stayed there. Match strength then
 * multiplied the XI rating by (0.8 + 0.2 * fitness / 100), so a knackered XI
 * played at 84 percent of its rating while every AI club used its full
 * strength. Manchester City, the best squad in the game, finished 19th or
 * 20th in ten seasons out of ten.
 *
 * Recovery is now proportional to how tired a player is, which is both how
 * bodies actually work and what gives the system an equilibrium: an ever
 * present settles around 70 rather than bottoming out, a rested player is
 * back near 100 within a week, and rotation is a real edge instead of the
 * only way to avoid collapse.
 */
function tickWeek(state: CareerState, playedIds: Set<string> | null): void {
  // Round 116: how hard you work them all week shows up here. Light sessions
  // send a fresher team out on Saturday, double sessions send a tired one and
  // pick up knocks on the training ground, and that is the price of the
  // development the same setting buys you at the end of the season.
  const plan = state.training ?? DEFAULT_TRAINING;
  const recoveryMod = plan.intensity === 'double' ? 0.78 : plan.intensity === 'light' ? 1.18 : 1;
  const flat = plan.intensity === 'light' ? 6 : plan.intensity === 'double' ? 3 : 4;
  const knockRisk = plan.intensity === 'double' ? 0.005 : 0;
  state.squad = state.squad.map(p => {
    const played = playedIds ? playedIds.has(p.id) : false;
    const recovery = Math.round((100 - p.fitness) * 0.71 * recoveryMod) + flat;
    const cost = played ? 20 + ri(0, 8) : 0;
    const fitness = clamp(p.fitness + recovery - cost, 20, 100);
    let injuryWeeks = Math.max(0, p.injuryWeeks - 1);
    if (knockRisk > 0 && injuryWeeks === 0 && Math.random() < knockRisk) injuryWeeks = ri(1, 3);
    return { ...p, fitness, injuryWeeks };
  });
  tickScouting(state);
}

function applyResult(table: TableRow[], home: string, away: string, hg: number, ag: number): void {
  const h = table.find(r => r.club === home);
  const a = table.find(r => r.club === away);
  if (h) {
    h.gf += hg; h.ga += ag;
    if (hg > ag) { h.w += 1; h.pts += 3; }
    else if (hg === ag) { h.d += 1; h.pts += 1; }
    else h.l += 1;
  }
  if (a) {
    a.gf += ag; a.ga += hg;
    if (ag > hg) { a.w += 1; a.pts += 3; }
    else if (hg === ag) { a.d += 1; a.pts += 1; }
    else a.l += 1;
  }
}

interface MyFixture {
  competition: Competition;
  compLabel: string;
  opponent: string;
  home: boolean | null;
}

/** Resolves what my club is playing for a given entry (null if not involved). */
function fixtureFor(state: CareerState, entry: CalendarEntry): MyFixture | null {
  if (!entryInvolvesMe(state, entry)) return null;
  if (entry.type === 'league') {
    const pairs = roundPairs(state.leagueClubs, entry.round);
    const mine = pairs.find(([h, a]) => h === state.clubName || a === state.clubName);
    if (!mine) return null;
    const home = mine[0] === state.clubName;
    return {
      competition: 'league',
      compLabel: `${leagueOf(state.clubName).name} · Round ${entry.round + 1}`,
      opponent: home ? mine[1] : mine[0],
      home,
    };
  }
  if (entry.type === 'cup' && entry.cupRound) {
    const opponent = state.cupDraw[entry.cupRound];
    if (!opponent) return null;
    return {
      competition: 'cup',
      compLabel: `${leagueOf(state.clubName).cupName} · ${CUP_LABELS[entry.cupRound]}`,
      opponent,
      home: cupVenue(entry.cupRound),
    };
  }
  if (entry.type === 'uclGroup' && state.uclGroup) {
    const idx = entry.round % 3;
    const opponent = state.uclGroup.opponents[idx];
    if (!opponent) return null;
    const home = entry.round < 3 ? idx !== 1 : idx === 1;
    return {
      competition: 'uclGroup',
      compLabel: `Champions League · Group MD${entry.round + 1}`,
      opponent,
      home,
    };
  }
  if (entry.type === 'uclKo' && entry.uclRound) {
    const opponent = state.uclDraw[entry.uclRound];
    if (!opponent) return null;
    return {
      competition: 'uclKo',
      compLabel: `Champions League · ${UCL_LABELS[entry.uclRound]}`,
      opponent,
      home: uclKoVenue(entry.uclRound),
    };
  }
  return null;
}

/**
 * Plays my match for this entry, mutating state (tables, squad, cups, board)
 * and returning the report. state must already be a private copy.
 */
function playMyMatch(state: CareerState, entry: CalendarEntry, live?: LiveMatch): MatchWeekReport {
  const fx = fixtureFor(state, entry)!;
  const club = clubDefFor(state.clubName);
  const isKnockout = fx.competition === 'cup' || fx.competition === 'uclKo';

  const suspendedNow = state.squad.filter(p => p.suspendedMatches > 0).map(p => p.id);
  /* Round 127: who could actually have played today, taken before the match
     hands anybody an injury. A fixture he was never fit for does not go into
     his last ten at all, because no player sulks about a game he could not
     have played in, and a system that punished you for a hamstring would have
     been unusable. */
  const fitAtKickoff = new Set(
    state.squad.filter(p => isAvailable(p) && !p.onLoan).map(p => p.id),
  );
  const oppS = strengthOf(state, fx.opponent);
  const homeAtk = fx.home === true ? 0.28 : fx.home === false ? -0.12 : 0.08;
  const oppAtk = fx.home === true ? -0.12 : fx.home === false ? 0.28 : 0.08;

  /* Round 119: with a first half already played, the second is simulated off
     whatever the manager left on the pitch and whichever mentality he sent
     them out in. Without one, this is the single shot match it always was, so
     fast forwarding a run of fixtures behaves exactly as before. */
  let xi: CMPlayer[];
  let mine: number;
  let myGoals: number;
  let oppGoals: number;
  /* Round 135: what was said, and what it was worth. The pre match talk covers
     the whole match unless you said something else at the interval, in which
     case the newer one is the one in the players' ears. Both are remembered
     here so the full time morale swing can settle up for each of them. */
  const press135 = state.press;
  const preTone: TalkTone | null = state.teamTalk ?? null;
  const halfTone: TalkTone | null = live ? (live.talk ?? null) : null;
  const fire = press135?.nextFire ?? 0;
  const sharpen = press135?.nextSharpen ?? 0;
  let preFit = 0;
  let halfFit = 0;
  /* Round 121: every match is two halves now, whichever way it is played. It
     has to be, or fast forwarding a fixture and playing it out would be two
     different games: the opposition only reacts at a break, so a single shot
     match would be one where he never does. The ONLY difference between the
     two paths is whether you got a say at the interval. */
  const venue = fx.home === true ? 3 : fx.home === false ? -1.5 : 0;
  if (live) {
    const started = squadByIds(state, live.startXi);
    const second = squadByIds(state, live.onPitch);
    /* Round 135: the fit of the pre match talk is judged on the eleven who
       kicked off, and the half time one on the state of the match the men still
       out there are walking back into. Whichever talk is NEWER is the one in
       their ears for the second half; the older one has been overtaken by
       events. Both are settled up separately at the final whistle, because they
       were two separate things you said. */
    preFit = talkWeight(state, preTone, preMatchTarget(
      myMatchStrength(state, started) + venue - oppS, xiMood(state, started), state.form,
    ));
    const htTarget = halftimeTarget(
      live.myGoals, live.oppGoals,
      myMatchStrength(state, second) + venue - oppS, xiMood(state, second),
    );
    halfFit = talkWeight(state, halfTone, htTarget);
    const inForce = halfTone
      ? halfFit
      : talkWeight(state, preTone, preMatchTarget(
          myMatchStrength(state, second) + venue - oppS, xiMood(state, second), state.form,
        ));
    mine = myMatchStrength(state, second) + inForce * TALK_EDGE + sharpen;
    const ment2 = MENT_MOD[live.mentality] ?? MENT_MOD.balanced;
    const opp2 = oppositionShape(live.oppGoals, live.myGoals);
    const [m2, o2] = simHalf(mine, oppS + fire, ment2.atk + homeAtk + opp2.def, ment2.def + oppAtk + opp2.atk);
    myGoals = live.myGoals + m2;
    oppGoals = live.oppGoals + o2;
    // Anyone who was on the pitch at any point can appear on the scoresheet.
    const ids = [...new Set([...live.startXi, ...live.onPitch])];
    xi = squadByIds(state, ids);
  } else {
    xi = effectiveXI(state);
    /* Fast forward, or a save from before the interval existed. The pre match
       talk covers both halves because there was never a chance to give another,
       which is exactly how it behaves when you play the match out and say
       nothing at the break. */
    const preEdge = myMatchStrength(state, xi) + venue - oppS;
    preFit = talkWeight(state, preTone, preMatchTarget(preEdge, xiMood(state, xi), state.form));
    mine = myMatchStrength(state, xi) + preFit * TALK_EDGE + sharpen;
    const ment = MENT_MOD[state.mentality] ?? MENT_MOD.balanced;
    const [m1, o1] = simHalf(mine, oppS + fire, ment.atk + homeAtk, ment.def + oppAtk);
    const opp2 = oppositionShape(o1, m1);
    const [m2, o2] = simHalf(mine, oppS + fire, ment.atk + homeAtk + opp2.def, ment.def + oppAtk + opp2.atk);
    myGoals = m1 + m2;
    oppGoals = o1 + o2;
  }

  let decidedBy: 'regular' | 'pens' = 'regular';
  let won = myGoals > oppGoals;
  let drawn = myGoals === oppGoals;
  let advanced = won;
  if (isKnockout && drawn) {
    decidedBy = 'pens';
    const penWin = Math.random() < clamp(0.5 + (mine - oppS) * 0.012, 0.2, 0.8);
    won = penWin;
    drawn = false;
    advanced = penWin;
  }

  const events: string[] = [];
  let trophyWon: string | null = null;

  const { lines: myScorers, goalCounts, assistCounts } = generateMyScorers(state, xi, myGoals);
  const oppScorers = generateOppScorers(fx.opponent, oppGoals, yearsOn(state));
  const tally = new Map<string, number>();
  for (const sc of myScorers) tally.set(sc.name, (tally.get(sc.name) ?? 0) + 1);
  tally.forEach((count, name) => {
    if (count >= 3) events.push(`⚽ ${name} bagged a hat-trick!`);
  });
  if (decidedBy === 'pens') {
    events.push(won ? '🥅 Nerves of steel. You win the shootout.' : '🥅 Heartbreak from the spot: shootout defeat.');
  }

  /* ----- competition bookkeeping + other results ----- */
  const otherResults: OtherResult[] = [];
  let confDelta = won ? 4 : drawn ? 0.5 : -4.5;

  if (fx.competition === 'league') {
    const pairs = roundPairs(state.leagueClubs, entry.round);
    for (const [h, a] of pairs) {
      if (h === state.clubName || a === state.clubName) {
        const hg = fx.home ? myGoals : oppGoals;
        const ag = fx.home ? oppGoals : myGoals;
        applyResult(state.table, h, a, hg, ag);
      } else {
        const [hg, ag] = simAiMatch(state, h, a);
        applyResult(state.table, h, a, hg, ag);
        otherResults.push({ home: h, away: a, hg, ag });
      }
    }
    const pos = leaguePosition(state);
    confDelta += clamp((club.expectation - pos) * 0.25, -2, 2);
  }

  if (fx.competition === 'uclGroup' && state.uclGroup) {
    const group = state.uclGroup;
    const idx = entry.round % 3;
    const myHome = fx.home === true;
    applyResult(group.table,
      myHome ? state.clubName : fx.opponent,
      myHome ? fx.opponent : state.clubName,
      myHome ? myGoals : oppGoals,
      myHome ? oppGoals : myGoals);
    const others = group.opponents.filter((_, i) => i !== idx);
    if (others.length === 2) {
      const [hg, ag] = simAiMatch(state, others[0], others[1]);
      applyResult(group.table, others[0], others[1], hg, ag);
      otherResults.push({ home: others[0], away: others[1], hg, ag });
    }
    group.matchday = Math.min(6, group.matchday + 1);
    if (group.matchday >= 6) {
      const pos = sortedTable(group.table).findIndex(r => r.club === state.clubName) + 1;
      if (pos <= 2) {
        state.uclKoRound = 'QF';
        // Round 95: a real eight club bracket, with my name in it.
        state.uclBracket = buildUclBracket(state, true);
        state.uclDraw.QF = myUclOpponent(state, 'QF') ?? drawUclKoOpponent(state);
        events.push(`⭐ Through to the Champions League quarter-finals. You'll face ${state.uclDraw.QF}.`);
        confDelta += 3;
      } else {
        state.uclKoRound = 'out';
        state.uclExit = 'group';
        // Round 95: Europe carries on without you, and you can watch it happen.
        state.uclBracket = buildUclBracket(state, false);
        events.push('💤 Out of the Champions League at the group stage.');
        confDelta -= 4;
      }
    }
  }

  if (fx.competition === 'cup') {
    const cupR = entry.cupRound ?? 'R16';
    // Round 102: my result goes into the bracket and the rest of the round
    // is played out, so the cup is a tournament you can actually follow.
    recordMyCupTie(state, cupR, fx.opponent, myGoals, oppGoals, advanced);
    advanceCupBracket(state, cupR);
    if (advanced) {
      const i = CUP_ORDER.indexOf(entry.cupRound!);
      if (entry.cupRound === 'F') {
        state.cupRound = 'won';
        const cupName = leagueOf(state.clubName).cupName;
        trophyWon = cupName;
        state.trophies.push({ name: cupName, emoji: '🏅', season: state.season });
        events.push(`🏅 The ${cupName} is yours!`);
        confDelta += 12;
      } else {
        const next = CUP_ORDER[i + 1];
        state.cupRound = next;
        state.cupDraw[next] = myCupOpponent(state, next) ?? drawCupOpponent(state);
        events.push(`🎟️ Into the cup ${CUP_LABELS[next].toLowerCase()}, drawn against ${state.cupDraw[next]}.`);
        confDelta += 2;
      }
    } else {
      state.cupRound = 'out';
      state.cupExit = entry.cupRound ?? 'R16';
      events.push(`❌ Knocked out of the ${leagueOf(state.clubName).cupName} at the ${CUP_LABELS[entry.cupRound ?? 'R16'].toLowerCase()} stage.`);
      confDelta -= entry.cupRound === 'R16' ? 3 : 4.5;
    }
  }

  if (fx.competition === 'uclKo') {
    const koRound = entry.uclRound!;
    // Round 95: my result goes into the bracket, then the rest of that round
    // is played out so the picture is complete before the next draw.
    recordMyUclTie(state, koRound, fx.opponent, myGoals, oppGoals, advanced);
    advanceUclBracket(state, koRound);
    if (advanced) {
      const i = UCL_ORDER.indexOf(koRound);
      if (koRound === 'F') {
        state.uclKoRound = 'won';
        trophyWon = 'Champions League';
        state.trophies.push({ name: 'Champions League', emoji: '⭐', season: state.season });
        events.push('⭐ CHAMPIONS OF EUROPE!');
        confDelta += 18;
      } else {
        const next = UCL_ORDER[i + 1];
        state.uclKoRound = next;
        state.uclDraw[next] = myUclOpponent(state, next) ?? drawUclKoOpponent(state);
        events.push(`⭐ Into the Champions League ${UCL_LABELS[next].toLowerCase()}. ${state.uclDraw[next]} await.`);
        confDelta += 4;
      }
    } else {
      state.uclKoRound = 'out';
      state.uclExit = koRound;
      events.push(`❌ Champions League run ends at the ${UCL_LABELS[koRound].toLowerCase()}.`);
      confDelta -= 4;
    }
  }

  /* ----- Round 73: full stat lines for everyone who played ----- */
  const cleanSheet = oppGoals === 0;
  const xiIdSet = new Set(xi.map(p => p.id));
  state.squad = state.squad.map(p => {
    if (!xiIdSet.has(p.id)) return p;
    const g = goalCounts.get(p.id) ?? 0;
    const a = assistCounts.get(p.id) ?? 0;
    const base = won ? 7.0 : drawn ? 6.4 : 5.7;
    const matchRating = clamp(
      base + g * 0.9 + a * 0.5 + (Math.random() * 1.2 - 0.6) + (cleanSheet && (p.position === 'GK' || groupOf(p.position) === 'DEF') ? 0.5 : 0),
      4.5, 10,
    );
    const defensive = p.position === 'GK' || groupOf(p.position) === 'DEF';
    return {
      ...p,
      apps: (p.apps ?? 0) + 1,
      ratingSum: Math.round(((p.ratingSum ?? 0) + matchRating) * 10) / 10,
      cleanSheets: (p.cleanSheets ?? 0) + (cleanSheet && defensive ? 1 : 0),
    };
  });
  // Yellow cards: 0-3 a match, defenders and holders pick up most of them.
  const yellows = ri(0, 3);
  for (let i = 0; i < yellows; i++) {
    const victim = weightedPick(xi, p =>
      p.position === 'GK' ? 0.1 : groupOf(p.position) === 'DEF' ? 2.2 : p.position === 'CDM' ? 2.4 : groupOf(p.position) === 'MID' ? 1.4 : 0.8);
    if (victim) {
      const sq = state.squad.find(p => p.id === victim.id);
      if (sq) sq.seasonYellows = (sq.seasonYellows ?? 0) + 1;
    }
  }

  /* ----- squad after-effects ----- */
  /* Round 127: the result still moves everybody the same way it always has,
     and on top of it every player now gets his own number, which is the gap
     between the rung you put him on and the football he is actually getting.
     Before this round the ONLY thing separating a man who played every minute
     from a man who never got off the bench, across a whole season, was three
     morale for scoring a goal. Measured over eight Everton seasons, players
     with fifteen or more appearances finished on an average of four and a half
     morale more than players with none, and in three of the eight runs the gap
     was under one and a half. Leaving your best striker out was free. */
  const moraleShift = won ? 5 : drawn ? -1 : -6;
  const ranks = seniorRanks(state.squad);
  const standingOf = (p: CMPlayer): number => {
    const rank = ranks.get(p.id);
    return ROLE_LADDER.indexOf(roleOf(p))
      - ROLE_LADDER.indexOf(deservedFromRank(rank === undefined ? 99 : rank, p));
  };
  state.squad = state.squad.map(p => {
    const lastTen = fitAtKickoff.has(p.id)
      ? [...(p.lastTen ?? []), xiIdSet.has(p.id) ? 1 : 0].slice(-PROMISE_WINDOW)
      : (p.lastTen ?? []);
    const withWindow = { ...p, lastTen };
    return {
      ...withWindow,
      morale: clamp(p.morale + moraleShift + promiseMoraleDelta(withWindow, standingOf(p)), 5, 99),
    };
  });

  /* Round 135: and what you SAID to them lands on top of that.
     Only the men who actually heard it, which is the eleven who played, and
     scaled by headroom in both directions. A squad already delighted cannot be
     talked any higher and one already on the floor cannot be talked any lower,
     which is both true of people and the thing that stops two talks a week for
     fifty weeks compounding into a squad pinned at a clamp. The two talks
     settle up separately because they were two separate things you said. */
  const talkSwing = preFit + halfFit;
  if (talkSwing !== 0) {
    state.squad = state.squad.map(p => {
      if (!xiIdSet.has(p.id)) return p;
      const head = talkSwing > 0 ? (99 - p.morale) / 94 : (p.morale - 5) / 94;
      return { ...p, morale: clamp(p.morale + talkSwing * TALK_MORALE * head, 5, 99) };
    });
    /* Something a player can feel without reading a number. */
    if (talkSwing >= 0.75) {
      events.push('\u{1F5E3}️ They came out of that dressing room like a side that would run through a wall for you.');
    } else if (talkSwing <= -0.75) {
      events.push('\u{1F649} Whatever you said in there did not land. Half of them had stopped listening.');
    }
  }

  /* Round 127: the dressing room. An unhappy player does not sulk quietly, his
     reaction spreads to the men around him. So a senior man who is miserable
     AND being let down drags on everybody around him. Capped at three sulkers so a bad month cannot spiral
     into a squad nobody could rescue. */
  const sulkers = state.squad.filter(p =>
    !p.onLoan && !p.isYouth && p.rating >= 70 && p.morale < 32
    && (promiseGap(p) <= -0.2 || standingOf(p) >= 2));
  if (sulkers.length) {
    const bleed = Math.min(sulkers.length, 3) * 0.45;
    const sulkIds = new Set(sulkers.map(p => p.id));
    state.squad = state.squad.map(p => (
      sulkIds.has(p.id) ? p : { ...p, morale: clamp(p.morale - bleed, 5, 99) }
    ));
    if (sulkers.length >= 2 && Math.random() < 0.3) {
      events.push(`\u{1F636} The mood in the dressing room is flat. ${sulkers[0].name} is not the only one who has stopped talking to you.`);
    }
  }

  /* Round 127: and the loudest of them asks to leave. This is the single
     loudest complaint about the squad role system in the big licensed football
     career mode, made over and over on that publisher's own forum: that every
     player asks to leave whatever rung you put him on unless you play him
     almost every week. So the trigger here reads the rung he is on rather than
     just his minutes, and a
     backup who barely plays is doing exactly what he agreed to and never asks
     for anything. */
  for (const p of state.squad) {
    if (p.wantsOut || p.onLoan || p.isYouth) continue;
    if (p.rating < 68 || p.morale >= 34) continue;
    const starved = (p.lastTen ?? []).length >= 8 && promiseGap(p) <= -0.25;
    /* Two rungs below what his football says he has earned is an insult on its
       own, and a man who has been insulted asks to leave even if he is playing
       every week. Without this you could label your whole first eleven backups,
       play them all anyway, and farm a delighted dressing room out of nothing. */
    const insulted = standingOf(p) >= 2;
    if (!starved && !insulted) continue;
    if (Math.random() > 0.22) continue;
    p.wantsOut = true;
    const why = starved
      ? `He was promised ${ROLE_INFO[roleOf(p)].label.toLowerCase()} football and has not had it.`
      : `He does not believe he is a ${ROLE_INFO[roleOf(p)].label.toLowerCase()} at this club, and the table agrees with him.`;
    events.push(`\u{1F9F3} ${p.name} has handed in a transfer request. ${why}`);
    pushMessage(state, {
      playerName: p.name,
      playerId: p.id,
      kind: 'wantMove',
      text: starved
        /* Round 137: the request is a real squad event and keeps his name.
           The reasoning behind it is narrated from his minutes instead of
           being written as something he said. */
        ? `${p.name} put it in writing. He is down as a ${ROLE_INFO[roleOf(p)].label.toLowerCase()} and he has started ${(p.lastTen ?? []).reduce((s, x) => s + x, 0)} of the last ${(p.lastTen ?? []).length}, so he wants to leave.`
        : `${p.name} put it in writing. Being listed as a ${ROLE_INFO[roleOf(p)].label.toLowerCase()} is the part he cannot get past, and he reckons somewhere else rates him higher.`,
      options: [
        { label: 'You are going nowhere', effect: 'refuse' },
        { label: 'Sit down and sort it out', effect: 'listen' },
      ],
    });
  }

  for (const id of suspendedNow) {
    const p = state.squad.find(x => x.id === id);
    if (p) p.suspendedMatches = Math.max(0, p.suspendedMatches - 1);
  }

  if (xi.length && Math.random() < 0.22) {
    const victim = pick(xi);
    const p = state.squad.find(x => x.id === victim.id);
    if (p) {
      p.injuryWeeks = ri(1, 5);
      events.push(`🩹 ${p.name} limped off, out for ~${p.injuryWeeks} week${p.injuryWeeks > 1 ? 's' : ''}.`);
    }
  }
  if (xi.length && Math.random() < 0.08) {
    const hothead = pick(xi.filter(p => p.position !== 'GK').length ? xi.filter(p => p.position !== 'GK') : xi);
    const p = state.squad.find(x => x.id === hothead.id);
    if (p && p.injuryWeeks === 0) {
      p.suspendedMatches = ri(1, 2);
      p.seasonReds = (p.seasonReds ?? 0) + 1;
      events.push(`🟥 ${p.name} was sent off, suspended for ${p.suspendedMatches} match${p.suspendedMatches > 1 ? 'es' : ''}.`);
    }
  }

  // Round 73: the season's fixture log feeds the calendar card.
  const log = state.resultLog ?? [];
  log.push({
    week: state.week,
    comp: fx.compLabel,
    opp: fx.opponent,
    home: fx.home,
    score: `${myGoals}-${oppGoals}`,
    res: won ? 'W' : drawn ? 'D' : 'L',
  });
  state.resultLog = log.slice(-60);

  const res: FormResult = won ? 'W' : drawn ? 'D' : 'L';
  state.form = [...state.form, res].slice(-5);
  // Round 71: spread keeps the manager-career extremes (biggest win, priciest
  // buy...) instead of wiping them every match.
  state.careerStats = {
    ...state.careerStats,
    played: state.careerStats.played + 1,
    wins: state.careerStats.wins + (won ? 1 : 0),
    draws: state.careerStats.draws + (drawn ? 1 : 0),
    losses: state.careerStats.losses + (!won && !drawn ? 1 : 0),
  };
  const scoreMargin = (score: string): number => {
    const [a, b] = score.split('-').map(Number);
    return Number.isFinite(a) && Number.isFinite(b) ? Math.abs(a - b) : -1;
  };
  const margin = Math.abs(myGoals - oppGoals);
  if (won && decidedBy === 'regular') {
    const prev = state.careerStats.biggestWin;
    if (!prev || margin > scoreMargin(prev.score)) {
      state.careerStats.biggestWin = { opp: fx.opponent, score: `${myGoals}-${oppGoals}` };
    }
  }
  if (!won && !drawn && decidedBy === 'regular') {
    const prev = state.careerStats.biggestDefeat;
    if (!prev || margin > scoreMargin(prev.score)) {
      state.careerStats.biggestDefeat = { opp: fx.opponent, score: `${oppGoals}-${myGoals}` };
    }
  }

  // Round 73: broken start promises get noticed, then the dressing room
  // finds something new to message you about.
  const promised = state.promisedStarts ?? [];
  if (promised.length) {
    /* Round 127: a promise used to be wiped after exactly one match whatever
       happened, so promising a start to a man who then pulled up in training
       quietly cancelled the promise and you owed him nothing. Now it waits
       until he is fit enough to be picked. */
    const stillOwed: string[] = [];
    for (const id of promised) {
      if (xiIdSet.has(id)) continue;
      const p = state.squad.find(x => x.id === id);
      if (!p) continue;
      if (!fitAtKickoff.has(id)) { stillOwed.push(id); continue; }
      if (p && isAvailable(p)) {
        p.morale = clamp(p.morale - 14, 5, 99);
        pushMessage(state, {
          playerName: p.name,
          playerId: p.id,
          kind: 'drama',
          /* Round 137: the broken promise is the football event, so the name
             stays. What he did about it afterwards was invented, so it goes. */
          text: `You promised ${p.name} a start and he was not on the teamsheet. He noticed, and so did the dressing room.`,
          options: [],
          resolved: 'He will remember this.',
        });
      }
    }
    state.promisedStarts = stillOwed;
  }
  generatePlayerMessage(state, xi, won, margin);

  /* ----- board confidence ----- */
  // Round 105: an overspent wage bill is a slow drip on the board's patience,
  // which is what stops you hoarding a squad of superstars you cannot pay.
  const bill = wageBill(state);
  const cap = state.wageCap ?? wageCapFrom(bill);
  if (bill > cap) {
    const over = (bill - cap) / cap;
    // A drip, not a guillotine. There are around fifty matches in a season,
    // so the worst case costs about thirty confidence across a whole year:
    // survivable if you are winning, fatal if you are not.
    confDelta -= Math.min(0.7, 0.12 + over * 1.2);
    if (over > 0.25 && Math.random() < 0.25) {
      events.push(`💸 The board are asking why the wage bill is ${Math.round(over * 100)} percent over what was agreed.`);
    }
  }
  const patience = club.tier === 1 ? 1.3 : club.tier === 2 ? 1.15 : club.tier === 3 ? 1 : 0.85;
  if (confDelta < 0) confDelta *= patience;
  /* Round 135: and the board read about it in the morning. A manager the press
     are behind gets the benefit of the doubt on a defeat and one they have
     turned on gets it in the neck. Only ever on the way DOWN, because a board
     needs no help noticing a win, and it reaches exactly 1 at the mood every
     save starts on, so a manager who never opens the press room plays the game
     the previous twelve rounds calibrated. */
  if (confDelta < 0 && state.press) confDelta *= pressPatience(state.press.mood);
  confDelta = Math.round(confDelta * 10) / 10;
  state.boardConfidence = clamp(state.boardConfidence + confDelta, 0, 100);
  if (state.boardConfidence <= 0) {
    state.sacked = true;
    events.push('📉 The board has seen enough. You are relieved of your duties.');
  } else if (state.boardConfidence < 22) {
    events.push('📉 The board is running out of patience. Results, now.');
  }

  /* ----- Round 135: settling up with the microphone ----- */
  if (state.press) {
    const press = state.press;
    // A promise made out loud is a promise the whole country heard.
    if (press.promised) {
      if (won) {
        state.boardConfidence = clamp(state.boardConfidence + 2.5, 0, 100);
        press.mood = clamp(press.mood + 6, 0, 100);
        state.squad = state.squad.map(p => ({ ...p, morale: clamp(p.morale + 1.5, 5, 99) }));
        events.push('\u{1F4F0} You said you would win it and you won it. That will be everywhere in the morning.');
      } else {
        state.boardConfidence = clamp(state.boardConfidence - 4, 0, 100);
        press.mood = clamp(press.mood - 9, 0, 100);
        state.squad = state.squad.map(p => ({ ...p, morale: clamp(p.morale - 2, 5, 99) }));
        events.push('\u{1F4F0} You told the country you would win this one. They have not forgotten and neither has the board.');
      }
      press.promised = false;
    }
    noteTone(state, preTone);
    noteTone(state, halfTone);
    press.nextFire = 0;
    press.nextSharpen = 0;
    /* The news cycle. Nothing stays a story for long, so the mood drifts back
       toward nobody having an opinion, which stops one good week or one bad one
       from following you around for a decade. */
    press.mood += (50 - press.mood) * 0.06;
    press.mood = clamp(Math.round(press.mood * 10) / 10, 0, 100);
    if (press.mood <= 18 && Math.random() < 0.3) {
      state.aiHeadlines = [
        `\u{1F5DE}️ The back pages have made their mind up about you. "${state.clubName} need a new manager" is on three of them.`,
        ...state.aiHeadlines,
      ].slice(0, 8);
    }
  }
  // The talk only ever covered the match it was given for.
  state.teamTalk = null;

  tickWeek(state, new Set(xi.map(p => p.id)));
  /* Round 141: a window no longer slams shut the moment you play a match,
     because real windows run through the early fixtures and because the
     instant sell is gone, so listing a man needs actual weeks for offers to
     arrive. The window now spans a few match weeks (4 in summer, 3 in
     January), fresh bids can land in any of them, and open offers stay on
     the table instead of being wiped every Saturday. When the weeks run out
     the deadline hits: deals die, bids die, grudges are forgotten. */
  if (state.transferWindow !== null) {
    const left = (state.windowWeeksLeft ?? 1) - 1;
    state.windowWeeksLeft = Math.max(0, left);
    if (left <= 0) {
      state.transferWindow = null;
      state.negotiation = null;
      state.incomingBids = [];
      state.coldNames = [];
      state.aiHeadlines = [
        `\u{23F0} Deadline day is done. The window is shut until ${state.calendar.slice(state.week).some(e => e.type === 'window') ? 'January' : 'the summer'}.`,
        ...state.aiHeadlines,
      ].slice(0, 8);
    } else {
      // The market keeps moving mid-window: new offers can arrive weekly.
      generateIncomingBids(state, true);
    }
  }
  // Round 141: the news feed reads the week's table and says something true.
  generateWeeklyNews(state);
  // Round 135: and the room fills up again, once there is something to ask.
  maybeAskPress(state);

  const iAmHome = fx.home !== false; // neutral finals list us first
  return {
    competition: fx.competition,
    compLabel: fx.compLabel,
    home: iAmHome ? state.clubName : fx.opponent,
    away: iAmHome ? fx.opponent : state.clubName,
    homeGoals: iAmHome ? myGoals : oppGoals,
    awayGoals: iAmHome ? oppGoals : myGoals,
    won,
    drawn,
    decidedBy,
    myScorers,
    oppScorers,
    events,
    trophyWon,
    myPosition: leaguePosition(state),
    confidence: state.boardConfidence,
    confidenceDelta: confDelta,
    otherResults,
  };
}

/* ================================================================== */
/* Career lifecycle                                                   */
/* ================================================================== */

/* ================================================================== */
/* Round 116: academy, scouting and training                          */
/* ================================================================== */

/**
 * Where a scout can be sent, and roughly how strong that country's youth
 * production is.
 *
 * These numbers are OURS, not anybody's dataset: a rough 60 to 92 ranking of
 * how reliably each country turns out top level teenagers, the job any youth
 * rating does in a management sim. They set how good a prospect from
 * that country is likely to be, nothing else. Country names only, no badges
 * and no real kids.
 */
export interface ScoutRegion { id: string; name: string; flag: string; youth: number; }

export const SCOUT_REGIONS: ScoutRegion[] = [
  { id: 'brazil', name: 'Brazil', flag: '\u{1F1E7}\u{1F1F7}', youth: 92 },
  { id: 'france', name: 'France', flag: '\u{1F1EB}\u{1F1F7}', youth: 90 },
  { id: 'argentina', name: 'Argentina', flag: '\u{1F1E6}\u{1F1F7}', youth: 88 },
  { id: 'spain', name: 'Spain', flag: '\u{1F1EA}\u{1F1F8}', youth: 87 },
  { id: 'england', name: 'England', flag: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}', youth: 86 },
  { id: 'germany', name: 'Germany', flag: '\u{1F1E9}\u{1F1EA}', youth: 85 },
  { id: 'portugal', name: 'Portugal', flag: '\u{1F1F5}\u{1F1F9}', youth: 84 },
  { id: 'netherlands', name: 'Netherlands', flag: '\u{1F1F3}\u{1F1F1}', youth: 82 },
  { id: 'italy', name: 'Italy', flag: '\u{1F1EE}\u{1F1F9}', youth: 79 },
  { id: 'belgium', name: 'Belgium', flag: '\u{1F1E7}\u{1F1EA}', youth: 78 },
  { id: 'uruguay', name: 'Uruguay', flag: '\u{1F1FA}\u{1F1FE}', youth: 76 },
  { id: 'colombia', name: 'Colombia', flag: '\u{1F1E8}\u{1F1F4}', youth: 75 },
  { id: 'croatia', name: 'Croatia', flag: '\u{1F1ED}\u{1F1F7}', youth: 74 },
  { id: 'serbia', name: 'Serbia', flag: '\u{1F1F7}\u{1F1F8}', youth: 72 },
  { id: 'japan', name: 'Japan', flag: '\u{1F1EF}\u{1F1F5}', youth: 72 },
  { id: 'nigeria', name: 'Nigeria', flag: '\u{1F1F3}\u{1F1EC}', youth: 71 },
  { id: 'denmark', name: 'Denmark', flag: '\u{1F1E9}\u{1F1F0}', youth: 71 },
  { id: 'senegal', name: 'Senegal', flag: '\u{1F1F8}\u{1F1F3}', youth: 70 },
  { id: 'morocco', name: 'Morocco', flag: '\u{1F1F2}\u{1F1E6}', youth: 70 },
  { id: 'ivorycoast', name: 'Ivory Coast', flag: '\u{1F1E8}\u{1F1EE}', youth: 69 },
  { id: 'sweden', name: 'Sweden', flag: '\u{1F1F8}\u{1F1EA}', youth: 69 },
  { id: 'ghana', name: 'Ghana', flag: '\u{1F1EC}\u{1F1ED}', youth: 68 },
  { id: 'turkey', name: 'Turkey', flag: '\u{1F1F9}\u{1F1F7}', youth: 68 },
  { id: 'usa', name: 'United States', flag: '\u{1F1FA}\u{1F1F8}', youth: 67 },
  { id: 'mexico', name: 'Mexico', flag: '\u{1F1F2}\u{1F1FD}', youth: 66 },
];

export function regionById(id: string): ScoutRegion {
  return SCOUT_REGIONS.find(r => r.id === id) ?? SCOUT_REGIONS[0];
}

export const DEFAULT_TRAINING: TrainingPlan = { intensity: 'normal', focus: 'balanced' };

/** How long you can send a scout for, and what that does to his fee. */
export const SCOUT_TRIPS = [
  { weeks: 10, label: 'Short trip (10 weeks)' },
  { weeks: 20, label: 'Half a season (20 weeks)' },
  { weeks: 32, label: 'The full year (32 weeks)' },
];

/** Nobody can have more than this many scouts on the road at once. */
export const MAX_SCOUTS = 3;
/** Or more than this many kids sitting on the books unsigned. */
export const MAX_PROSPECTS = 12;

const SCOUT_FIRST = [
  'Ray', 'Dermot', 'Paolo', 'Gus', 'Hakim', 'Bernd', 'Colin', 'Tomas', 'Rui', 'Wim',
  'Freddie', 'Nacho', 'Olu', 'Stefan', 'Duncan', 'Aleks', 'Pierre', 'Kenny', 'Sepp', 'Ivan',
];
const SCOUT_LAST = [
  'Brennan', 'Kovac', 'Delgado', 'Ohashi', 'Fenton', 'Lindqvist', 'Barros', 'Aziz', 'McGrath', 'Steiner',
  'Almeida', 'Duffy', 'Roussel', 'Vialli', 'Osei', 'Janssen', 'Salvatore', 'Bright', 'Radic', 'Nkemdi',
];

/**
 * The ceiling a player is carrying. Older players are at or near it already,
 * which is why the whole system is about teenagers.
 */
export function rollPotential(rating: number, age: number): number {
  let head: number;
  if (age >= 30) head = 0;
  else if (age >= 28) head = ri(0, 1);
  else if (age >= 26) head = ri(0, 2);
  else if (age >= 24) head = ri(1, 4);
  else if (age >= 22) head = ri(1, 6);
  else if (age >= 20) head = ri(2, 10);
  else head = ri(3, 15);
  // About one young player in twelve is carrying something special.
  if (age <= 21 && Math.random() < 0.085) head += ri(4, 9);
  return clamp(rating + head, rating, 95);
}

/** What the club is handed on day one. Big clubs have better everything. */
function defaultAcademy(clubName: string): Academy {
  const tier = clubDefFor(clubName).tier;
  const base: Record<number, [number, number, number]> = {
    1: [13, 14, 14],
    2: [11, 12, 12],
    3: [8, 9, 9],
    4: [6, 7, 7],
  };
  const [r, c, f] = base[tier] ?? base[3];
  return {
    recruitment: clamp(r + ri(-1, 1), 1, 20),
    coaching: clamp(c + ri(-1, 1), 1, 20),
    facilities: clamp(f + ri(-1, 1), 1, 20),
    scouts: [],
    candidates: [],
    prospects: [],
    lastIntakeSeason: 0,
  };
}

function makeScoutCandidate(): Scout {
  const judgement = ri(1, 5);
  const network = ri(1, 5);
  return {
    id: `sc-${Date.now().toString(36)}-${ri(1000, 9999)}`,
    name: `${pick(SCOUT_FIRST)} ${pick(SCOUT_LAST)}`,
    judgement,
    network,
    fee: Math.max(1, Math.round((judgement + network) * 0.6)),
    regionId: '',
    regionName: '',
    regionFlag: '',
    weeksLeft: 0,
    found: 0,
  };
}

/**
 * Repairs a save that predates any of this and seeds a new one. Runs at the
 * top of playNextEntry beside ensureContracts, and has to be a no-op the
 * second time it is called.
 */
export function ensureAcademy(state: CareerState): void {
  if (!state.training) state.training = { ...DEFAULT_TRAINING };
  if (!state.academy) state.academy = defaultAcademy(state.clubName);
  const a = state.academy;
  if (!Array.isArray(a.scouts)) a.scouts = [];
  if (!Array.isArray(a.prospects)) a.prospects = [];
  if (!Array.isArray(a.candidates)) a.candidates = [];
  while (a.candidates.length < 3) a.candidates.push(makeScoutCandidate());
  if (typeof a.lastIntakeSeason !== 'number') a.lastIntakeSeason = 0;
  if (state.academyGraduates === undefined) state.academyGraduates = 0;
  for (const p of state.squad) {
    if (p.potential === undefined) p.potential = rollPotential(p.rating, p.age);
  }
}

/** What the next level of a facility costs, out of the transfer budget. */
export function academyUpgradeCost(level: number): number {
  return Math.max(3, Math.round(2 + Math.pow(clamp(level, 1, 20), 1.9) * 0.2));
}

export const FACILITY_INFO: Record<FacilityKind, { label: string; blurb: string; emoji: string }> = {
  recruitment: {
    label: 'Youth recruitment',
    blurb: 'How far up the queue you are for the best local kids. Drives intake quality and how many turn up.',
    emoji: '\u{1F50D}',
  },
  coaching: {
    label: 'Coaching staff',
    blurb: 'Better coaches develop EVERY player faster, not just the teenagers, and sharpen your scouting reports.',
    emoji: '\u{1F9E2}',
  },
  facilities: {
    label: 'Training ground',
    blurb: 'The building itself. Lifts intake quality and helps everyone squeeze more out of the week.',
    emoji: '\u{1F3DF}\uFE0F',
  },
};

/** Spend the money, get the level. Refuses if you cannot afford it. */
export function upgradeAcademy(career: CareerState, kind: FacilityKind): CareerState | null {
  const next: CareerState = JSON.parse(JSON.stringify(career));
  ensureAcademy(next);
  const a = next.academy!;
  const level = a[kind];
  if (level >= 20) return null;
  const cost = academyUpgradeCost(level);
  if (cost > next.budget) return null;
  a[kind] = level + 1;
  next.budget = Math.round((next.budget - cost) * 10) / 10;
  return next;
}

/** Cost of a trip: the scout's fee scaled by how long you send him for. */
export function tripCost(scout: Scout, weeks: number): number {
  return Math.max(1, Math.round(scout.fee * (weeks / 20)));
}

/** Send a candidate somewhere. Refuses on money, a full staff or a bad id. */
export function hireScout(
  career: CareerState,
  candidateId: string,
  regionId: string,
  weeks: number,
): CareerState | null {
  const next: CareerState = JSON.parse(JSON.stringify(career));
  ensureAcademy(next);
  const a = next.academy!;
  if (a.scouts.length >= MAX_SCOUTS) return null;
  const idx = a.candidates.findIndex(c => c.id === candidateId);
  if (idx < 0) return null;
  const region = SCOUT_REGIONS.find(r => r.id === regionId);
  if (!region) return null;
  const trip = SCOUT_TRIPS.find(t => t.weeks === weeks);
  if (!trip) return null;
  const cand = a.candidates[idx];
  const cost = tripCost(cand, weeks);
  if (cost > next.budget) return null;
  next.budget = Math.round((next.budget - cost) * 10) / 10;
  a.candidates.splice(idx, 1);
  a.scouts.push({
    ...cand,
    regionId: region.id,
    regionName: region.name,
    regionFlag: region.flag,
    weeksLeft: weeks,
    found: 0,
  });
  while (a.candidates.length < 3) a.candidates.push(makeScoutCandidate());
  return next;
}

/** Bring one home early. No refund, obviously. */
export function recallScout(career: CareerState, scoutId: string): CareerState {
  const next: CareerState = JSON.parse(JSON.stringify(career));
  ensureAcademy(next);
  const a = next.academy!;
  a.scouts = a.scouts.filter(s => s.id !== scoutId);
  return next;
}

function prospectPosition(): Position {
  const roll = Math.random();
  if (roll < 0.09) return 'GK';
  if (roll < 0.4) return pick(POS_DEF);
  if (roll < 0.74) return pick(POS_MID);
  return pick(POS_ATT);
}

/** The band a report puts around a ceiling. Bad judgement, wide band. */
function reportBand(potential: number, judgement: number): { lowGuess: number; highGuess: number } {
  const spread = Math.max(1, 12 - judgement * 2);
  return {
    lowGuess: clamp(potential - ri(0, spread), 40, 99),
    highGuess: clamp(potential + ri(0, spread), 40, 99),
  };
}

function makeProspect(
  potential: number,
  source: string,
  flag: string,
  judgement: number,
  fee: number,
  season: number,
): Prospect {
  const age = ri(15, 18);
  const rating = clamp(potential - ri(8, 22), 40, 76);
  const band = reportBand(potential, judgement);
  return {
    id: `pr-${Date.now().toString(36)}-${ri(1000, 9999)}-${ri(100, 999)}`,
    name: `${pick(YOUTH_FIRST)} ${pick(YOUTH_LAST)}`,
    position: prospectPosition(),
    age,
    rating,
    potential,
    lowGuess: Math.min(band.lowGuess, band.highGuess),
    highGuess: Math.max(band.lowGuess, band.highGuess),
    source,
    flag,
    fee,
    season,
  };
}

/** Drops the worst reported kid when the books are full. */
function addProspect(a: Academy, p: Prospect): void {
  a.prospects.push(p);
  while (a.prospects.length > MAX_PROSPECTS) {
    let worst = 0;
    for (let i = 1; i < a.prospects.length; i++) {
      if (a.prospects[i].highGuess < a.prospects[worst].highGuess) worst = i;
    }
    a.prospects.splice(worst, 1);
  }
}

/**
 * One week on the road for every scout. Called from tickWeek, so it runs once
 * per calendar entry whatever kind of entry it was.
 */
function tickScouting(state: CareerState): void {
  const a = state.academy;
  if (!a || !a.scouts.length) return;
  const home: string[] = [];
  for (const s of a.scouts) {
    s.weeksLeft -= 1;
    const region = regionById(s.regionId);
    if (Math.random() < 0.02 + s.network * 0.018) {
      // Better networks reach further into a country, and the country itself
      // sets the base level of what there is to find.
      let potential = clamp(
        52 + Math.round((region.youth - 60) * 0.42) + ri(0, 12) + Math.round(s.network * 1.4),
        54, 93,
      );
      if (Math.random() < 0.06) potential = clamp(potential + ri(3, 8), 54, 95);
      const fee = Math.max(0.2, Math.round((potential - 52) * 0.14 * 10) / 10);
      addProspect(a, makeProspect(potential, region.name, region.flag, s.judgement, fee, state.season));
      s.found += 1;
    }
    if (s.weeksLeft <= 0) home.push(`${s.name} is back from ${region.name} with ${s.found} name${s.found === 1 ? '' : 's'} for you.`);
  }
  if (home.length) {
    a.scouts = a.scouts.filter(s => s.weeksLeft > 0);
    state.aiHeadlines = [...home.map(h => `\u{1F575} ${h}`), ...state.aiHeadlines].slice(0, 8);
  }
}

/** The head of youth's guess at what is coming, for the intake preview. */
function intakePreview(a: Academy): string {
  const q = (a.recruitment * 1.3 + a.facilities * 0.9 + a.coaching * 0.8) / 3;
  if (q >= 16) return 'The head of youth reckons this is the best group he has seen here. Two or three could play.';
  if (q >= 12) return 'The head of youth likes this group. There should be one worth keeping.';
  if (q >= 8) return 'The head of youth is lukewarm. A couple of bodies, maybe a surprise.';
  return 'The head of youth is not promising you anything. The setup is not good enough yet.';
}

/**
 * Intake day. Runs once a season at the rollover, and what turns up is decided
 * entirely by what you spent on the academy.
 */
function runYouthIntake(state: CareerState): string[] {
  const a = state.academy;
  if (!a) return [];
  if (a.lastIntakeSeason === state.season) return [];
  a.lastIntakeSeason = state.season;
  const q = (a.recruitment * 1.3 + a.facilities * 0.9 + a.coaching * 0.8) / 3;
  let count = 1;
  if (a.recruitment >= 8) count += 1;
  if (a.recruitment >= 14) count += 1;
  if (Math.random() < a.recruitment / 26) count += 1;
  const judgement = clamp(Math.round(a.coaching / 4), 1, 5);
  const flag = '\u{1F3E0}';
  let best = 0;
  for (let i = 0; i < count; i++) {
    let potential = clamp(50 + Math.round(q * 1.55) + ri(0, 10), 52, 92);
    if (Math.random() < 0.07) potential = clamp(potential + ri(3, 9), 52, 95);
    best = Math.max(best, potential);
    addProspect(a, makeProspect(potential, 'Academy', flag, judgement, 0, state.season));
  }
  a.preview = intakePreview(a);
  return [
    `\u{1F393} Intake day: ${count} kid${count === 1 ? '' : 's'} came up from the ${state.clubName} academy. ${a.preview}`,
  ];
}

/** Sign a kid into the senior squad. Refuses on money or a full squad. */
export function promoteProspect(career: CareerState, prospectId: string): CareerState | null {
  const next: CareerState = JSON.parse(JSON.stringify(career));
  ensureAcademy(next);
  const a = next.academy!;
  const idx = a.prospects.findIndex(p => p.id === prospectId);
  if (idx < 0) return null;
  const pr = a.prospects[idx];
  if (next.squad.length >= 30) return null;
  if (pr.fee > next.budget) return null;
  a.prospects.splice(idx, 1);
  next.budget = Math.round((next.budget - pr.fee) * 10) / 10;
  const player: CMPlayer = {
    id: `ac-${pr.id}`,
    name: pr.name,
    position: pr.position,
    rating: pr.rating,
    age: pr.age,
    fitness: 100,
    morale: 82,
    injuryWeeks: 0,
    suspendedMatches: 0,
    isYouth: false,
    academyGrad: true,
    potential: pr.potential,
    seasonGoals: 0,
    seasonAssists: 0,
    apps: 0,
    seasonYellows: 0,
    seasonReds: 0,
    cleanSheets: 0,
    ratingSum: 0,
    contractYears: 4,
  };
  player.wage = wageFor(player);
  next.squad = [...next.squad, player];
  next.academyGraduates = (next.academyGraduates ?? 0) + 1;
  next.aiHeadlines = [
    `\u{1F393} ${pr.name} has signed his first professional deal at ${next.clubName}.`,
    ...next.aiHeadlines,
  ].slice(0, 8);
  return next;
}

/** Let one go. Frees a slot on the books. */
export function releaseProspect(career: CareerState, prospectId: string): CareerState {
  const next: CareerState = JSON.parse(JSON.stringify(career));
  ensureAcademy(next);
  next.academy!.prospects = next.academy!.prospects.filter(p => p.id !== prospectId);
  return next;
}

export function setTrainingPlan(career: CareerState, plan: TrainingPlan): CareerState {
  return { ...career, training: { ...plan } };
}

export const INTENSITY_INFO: Record<TrainingIntensity, { label: string; desc: string; emoji: string }> = {
  light: { label: 'Light', desc: 'Fresh legs on match day, but nobody gets any better.', emoji: '\u{1F6CC}' },
  normal: { label: 'Normal', desc: 'The safe middle. Steady development, normal fatigue.', emoji: '\u{2699}\uFE0F' },
  double: { label: 'Double', desc: 'They improve fastest and they pay for it in tired legs and knocks.', emoji: '\u{1F525}' },
};

export const FOCUS_INFO: Record<TrainingFocus, { label: string; desc: string; emoji: string }> = {
  firstTeam: { label: 'First team', desc: 'Sessions built around the senior XI. The kids get left behind.', emoji: '\u{1F454}' },
  balanced: { label: 'Balanced', desc: 'Everyone gets the same session. Nothing is wasted, nothing is special.', emoji: '\u{2696}\uFE0F' },
  youth: { label: 'Youth', desc: 'The whole week is about the teenagers. Your senior players stagnate.', emoji: '\u{1F476}' },
};

/**
 * The multiplier on a player's positive growth for the season.
 *
 * This is the whole point of the round. Before it, a twenty year old improved
 * by the same one to three points whether he played forty games or none, and
 * whether he was a future world beater or a squad filler, because growth read
 * only his age. Now it reads five things, and every one of them is something
 * you control.
 */
export function developmentRate(p: CMPlayer, career: CareerState): number {
  const pot = p.potential ?? p.rating;
  const gap = pot - p.rating;
  // Headroom. A player already at his ceiling barely moves whatever you do.
  const headroom = gap <= 0 ? 0.1 : gap <= 3 ? 0.55 : gap <= 8 ? 1 : gap <= 15 ? 1.5 : 1.9;
  // Game time. Nobody has ever developed sitting on a bench.
  const apps = p.apps ?? 0;
  const minutes = apps >= 30 ? 1.3 : apps >= 18 ? 1.12 : apps >= 8 ? 0.85 : apps >= 1 ? 0.6 : 0.4;
  const plan = career.training ?? DEFAULT_TRAINING;
  const intensity = plan.intensity === 'double' ? 1.28 : plan.intensity === 'light' ? 0.78 : 1;
  const focus =
    plan.focus === 'youth'
      ? (p.age <= 21 ? 1.3 : p.age >= 27 ? 0.82 : 0.95)
      : plan.focus === 'firstTeam'
        ? (p.age <= 21 ? 0.72 : p.age >= 24 ? 1.18 : 1.05)
        : 1;
  const coaching = career.academy?.coaching ?? 8;
  const facilities = career.academy?.facilities ?? 8;
  const staff = 0.72 + coaching * 0.022 + facilities * 0.011;
  return clamp(headroom * minutes * intensity * focus * staff, 0.1, 2.6);
}

/** Everyone under 24 with room left, worst prepared first, for the UI. */
export function developingPlayers(career: CareerState): CMPlayer[] {
  return career.squad
    .filter(p => !p.onLoan && p.age <= 24 && (p.potential ?? p.rating) > p.rating)
    .sort((a, b) => ((b.potential ?? b.rating) - b.rating) - ((a.potential ?? a.rating) - a.rating));
}

export function startCareer(clubName: string, eraId: string = DEFAULT_ERA_ID): CareerState {
  // Round 70: any club in the five real leagues is a valid start.
  const club = clubDefFor(clubName);
  /* Round 132: the era decides what year season one is, and the year decides
     everything else: the squad you are handed, how good every other club is,
     and who is on the market. The default era is the current one and its
     yearsOn is zero, where the projection is the identity, so a normal new
     career is exactly the career this game has always started. */
  const era = eraById(eraId);
  const startYearsOn = Math.max(0, era.startYear - CM_BASE_YEAR);
  const squad = buildSquad(club.name, startYearsOn);
  // Owner task 61: the league is the club's REAL league with its real clubs.
  const league = leagueOf(club.name);
  const leagueClubs = shuffle([...league.clubs]);
  const state: CareerState = {
    saveVersion: SAVE_VERSION,
    clubName: club.name,
    season: 1,
    week: 0,
    startYear: era.startYear,
    eraId: era.id,
    retiredNames: [],
    retiredLastSummer: [],
    budget: club.budget,
    boardConfidence: 60,
    sacked: false,
    squad,
    xiIds: [],
    formationIndex: 0,
    mentality: 'balanced',
    leagueClubs,
    table: leagueClubs.map(emptyRow),
    form: [],
    calendar: buildCalendar(league.clubs.length),
    clubStrengths: genClubStrengths(league, startYearsOn),
    transferWindow: 'summer',
    windowWeeksLeft: 4,
    aiHeadlines: [],
    goneNames: [],
    seasonSignings: [],
    cupRound: 'R16',
    cupDraw: {},
    // Round 72: only clubs in UCL-eligible leagues start in Europe.
    uclGroup: initUclGroup(club.tier <= 2 && league.euro, club.name),
    uclKoRound: null,
    uclDraw: {},
    uclBracket: undefined,
    cupBracket: undefined,
    world: initWorld(club.name),
    trophies: [],
    history: [],
    careerStats: { played: 0, wins: 0, draws: 0, losses: 0, clubsManaged: [club.name] },
    pendingSummary: null,
    boardObjectives: [],
    cupExit: null,
    uclExit: null,
    negotiation: null,
    incomingBids: [],
    coldNames: [],
    loanedOut: [],
    transferLog: [],
    resultLog: [],
    inbox: [],
    promisedStarts: [],
  };
  ensureContracts(state);
  ensureAcademy(state);
  ensureRoles(state);
  ensurePress(state);
  state.wageCap = wageCapFrom(wageBill(state));
  state.boardObjectives = buildBoardObjectives(club.name, state.uclGroup !== null, league.clubs.length);
  state.cupBracket = buildCupBracket(state);
  state.cupDraw.R16 = myCupOpponent(state, 'R16') ?? drawCupOpponent(state);
  state.xiIds = autoPickXI(state.squad, FORMATIONS[state.formationIndex]);
  generateHeadlines(state);
  return state;
}

/**
 * Advances the calendar: skips entries that no longer involve us (cup/UCL
 * ties after elimination), opens the January window, or plays my next match.
 * Never mutates the input state.
 */
export function playNextEntry(career: CareerState, opts?: { skipHalftime?: boolean }): PlayResult {
  const state: CareerState = JSON.parse(JSON.stringify(career));
  // Round 95: a save made before the world existed repairs itself here, and
  // a save made after this is a no-op because it is already in step.
  if (!state.world) syncWorld(state, myRoundsPlayed(state, state.week));
  // Round 105: and a save made before contracts existed gets given some.
  ensureContracts(state);
  // Round 116: same story for the academy, the training plan and potentials.
  ensureAcademy(state);
  // Round 127: and everybody gets told where he stands.
  ensureRoles(state);
  // Round 132: and a save made before the world had a clock gets put on one.
  ensureClock(state);
  // Round 135: and one from before the press room existed gets one of those.
  ensurePress(state);
  while (state.week < state.calendar.length) {
    const entry = state.calendar[state.week];
    if (entry.type === 'window') {
      state.week += 1;
      tickWeek(state, null);
      state.transferWindow = 'january';
      // Round 141: January runs three match weeks before the deadline.
      state.windowWeeksLeft = 3;
      generateHeadlines(state);
      // Round 135: a January window is exactly when somebody gets asked whether
      // his best player is going anywhere.
      maybeAskPress(state);
      return { state, kind: 'window' };
    }
    if (!entryInvolvesMe(state, entry) || !fixtureFor(state, entry)) {
      // Round 72: on my bye week (odd-sized leagues) the rest of the round
      // still gets played, or the table comes up short for everyone else.
      if (entry.type === 'league') {
        const pairs = roundPairs(state.leagueClubs, entry.round);
        for (const [h, a] of pairs) {
          if (h === state.clubName || a === state.clubName) continue;
          const [hg, ag] = simAiMatch(state, h, a);
          applyResult(state.table, h, a, hg, ag);
        }
        syncWorld(state, myRoundsPlayed(state, state.week + 1));
      }
      // Round 95: the Champions League runs whether or not I am still in it.
      if (entry.type === 'uclKo' && entry.uclRound && state.uclBracket) {
        advanceUclBracket(state, entry.uclRound);
      }
      // Round 102: and so does the cup.
      if (entry.type === 'cup' && entry.cupRound && state.cupBracket) {
        advanceCupBracket(state, entry.cupRound);
      }
      state.week += 1;
      tickWeek(state, null);
      continue;
    }
    // Round 95: the rest of the football world plays its round too.
    if (entry.type === 'league') {
      syncWorld(state, myRoundsPlayed(state, state.week + 1));
    }
    /* Round 119: stop at the interval unless the caller asked not to. Round
       93's fast forward plays three, five or ten fixtures back to back and
       would stop being a fast forward if every one of them opened a dressing
       room, so it passes skipHalftime and gets the old single shot match. */
    if (!opts?.skipHalftime) {
      const live = kickOff(state, entry);
      state.live = live;
      return { state, kind: 'halftime', live };
    }
    const report = playMyMatch(state, entry);
    state.week += 1;
    return { state, kind: 'match', report };
  }
  return { state, kind: 'seasonOver' };
}

/**
 * Round 119: play the first half and stop.
 *
 * Everything the club sim has been built around for eleven rounds happens
 * between matches. The match itself was one call to simScore and a scoreline,
 * and the goal minutes in the report were invented afterwards. This is the
 * point where the manager gets to manage: a real half, a real score, and a
 * dressing room where changing something changes what happens next.
 */
function kickOff(state: CareerState, entry: CalendarEntry): LiveMatch {
  const fx = fixtureFor(state, entry)!;
  const xi = effectiveXI(state);
  /* Round 135: whatever you said before kick off, and whatever you said into a
     microphone this week, is on the pitch with them for the first half. */
  const talk = talkEdgeFor(state, xi, fx, state.teamTalk ?? null);
  const press = state.press;
  const mine = myMatchStrength(state, xi) + talk + (press?.nextSharpen ?? 0);
  const oppS = strengthOf(state, fx.opponent) + (press?.nextFire ?? 0);
  const ment = MENT_MOD[state.mentality] ?? MENT_MOD.balanced;
  const homeAtk = fx.home === true ? 0.28 : fx.home === false ? -0.12 : 0.08;
  const oppAtk = fx.home === true ? -0.12 : fx.home === false ? 0.28 : 0.08;
  const [myGoals, oppGoals] = simHalf(mine, oppS, ment.atk + homeAtk, ment.def + oppAtk);

  const ids = xi.map(p => p.id);
  return {
    week: state.week,
    myGoals,
    oppGoals,
    startXi: ids,
    onPitch: [...ids],
    subsUsed: 0,
    mentality: state.mentality,
    opponent: fx.opponent,
    compLabel: fx.compLabel,
    home: fx.home,
    read: halftimeRead(state, xi, myGoals, oppGoals, mine, oppS),
    talk: null,
  };
}

/**
 * Round 135: the rating points a pre match talk is worth to this XI, against
 * this opponent, this week. Zero when nothing was said, which is what keeps the
 * untouched engine untouched.
 */
function talkEdgeFor(
  state: CareerState, xi: CMPlayer[], fx: MyFixture, tone: TalkTone | null,
): number {
  if (!tone) return 0;
  const venue = fx.home === true ? 3 : fx.home === false ? -1.5 : 0;
  const edge = myMatchStrength(state, xi) + venue - strengthOf(state, fx.opponent);
  const target = preMatchTarget(edge, xiMood(state, xi), state.form);
  return talkWeight(state, tone, target) * TALK_EDGE;
}

/** What the first half looked like, in the language a manager would use. */
function halftimeRead(
  state: CareerState, xi: CMPlayer[], my: number, opp: number, mine: number, oppS: number,
): string {
  const gap = mine - oppS;
  if (my > opp && gap < -4) return 'Against the run of play, and they will come at you after the break.';
  if (my > opp) return 'In front, and deservedly so. The question is whether to protect it or bury them.';
  if (my < opp && gap > 4) return 'Behind, to a side you should be beating. Something has to change.';
  if (my < opp) return 'Second best so far. Chasing this needs bodies forward and it will leave gaps.';
  if (gap > 5) return 'Level, and that flatters them. Keep going and it will come.';
  return 'Nothing between the sides. Whoever blinks first at the restart loses this.';
}

/** The bench, worst-to-best, for the halftime screen. */
export function benchForHalftime(career: CareerState): CMPlayer[] {
  const live = career.live;
  if (!live) return [];
  const on = new Set(live.onPitch);
  return career.squad
    .filter(p => !on.has(p.id) && isAvailable(p))
    .sort((a, b) => b.rating - a.rating);
}

/** Who is flagging: the players a manager would actually think about hooking. */
export function tiringAtHalftime(career: CareerState): CMPlayer[] {
  const live = career.live;
  if (!live) return [];
  return squadByIds(career, live.onPitch)
    .filter(p => p.fitness < 68 || p.morale < 45)
    .sort((a, b) => a.fitness - b.fitness);
}

export const MAX_HALFTIME_SUBS = 3;

/** Swap one player for another at the break. Returns null if it is not allowed. */
export function makeHalftimeSub(career: CareerState, outId: string, inId: string): CareerState | null {
  const state: CareerState = JSON.parse(JSON.stringify(career));
  const live = state.live;
  if (!live) return null;
  if (live.subsUsed >= MAX_HALFTIME_SUBS) return null;
  const idx = live.onPitch.indexOf(outId);
  if (idx < 0) return null;
  if (live.onPitch.includes(inId)) return null;
  const coming = state.squad.find(p => p.id === inId);
  if (!coming || !isAvailable(coming)) return null;
  live.onPitch[idx] = inId;
  live.subsUsed += 1;
  return state;
}

/** Change the shape of the second half. */
export function setHalftimeMentality(career: CareerState, mentality: Mentality): CareerState {
  const state: CareerState = JSON.parse(JSON.stringify(career));
  if (state.live) state.live.mentality = mentality;
  state.mentality = mentality;
  return state;
}

/** Play the second half and finish the match. */
export function resumeMatch(career: CareerState): PlayResult {
  const state: CareerState = JSON.parse(JSON.stringify(career));
  const live = state.live;
  if (!live) return playNextEntry(state);
  const entry = state.calendar[live.week];
  state.live = null;
  const report = playMyMatch(state, entry, live);
  state.week = live.week + 1;
  return { state, kind: 'match', report };
}

/** Preview of the next thing on the calendar that involves my club. */
export function nextFixture(career: CareerState): NextFixtureInfo {
  for (let w = career.week; w < career.calendar.length; w++) {
    const entry = career.calendar[w];
    if (entry.type === 'window') return { kind: 'window' };
    const fx = fixtureFor(career, entry);
    if (fx) {
      return {
        kind: 'match',
        competition: fx.competition,
        compLabel: fx.compLabel,
        opponent: fx.opponent,
        home: fx.home,
        oppStrength: Math.round(strengthOf(career, fx.opponent)),
      };
    }
  }
  return { kind: 'seasonOver' };
}

/** min(130, current league points + 10 per trophy won this season). */
export function currentSeasonScore(career: CareerState): number {
  const row = career.table.find(r => r.club === career.clubName);
  const pts = row ? row.pts : 0;
  const seasonTrophies = career.trophies.filter(t => t.season === career.season).length;
  return Math.min(130, pts + seasonTrophies * 10);
}

const VERDICTS: Record<'A' | 'B' | 'C' | 'D' | 'F', string[]> = {
  A: [
    'A sensational season. The fans are painting murals of you.',
    'The board is thrilled. Statues have been commissioned.',
  ],
  B: [
    'Solid work. The board is satisfied and the fans are onside.',
    'Expectations met. Quietly impressive management.',
  ],
  C: [
    'Acceptable, just. The board expects more next season.',
    'A middling year: you survive, but the leash is shorter.',
  ],
  D: [
    'Well below expectations. The board is openly frustrated.',
    'A poor season. One more like that and you are gone.',
  ],
  F: [
    'A disaster from August to May. The fans want blood.',
    'Catastrophic. Only the compensation clause saved your job this long.',
  ],
};

/**
 * Wraps up the season: final standings, league title check, verdict, awards,
 * job offers, history entry. Stores the summary on state.pendingSummary so a
 * reload mid-review resumes cleanly. Does not mutate the input.
 */
export function finishSeason(career: CareerState): { state: CareerState; summary: SeasonSummary } {
  const state: CareerState = JSON.parse(JSON.stringify(career));
  const club = clubDefFor(state.clubName);
  const table = sortedTable(state.table);
  const myRow = table.find(r => r.club === state.clubName) ?? emptyRow(state.clubName);
  const position = Math.max(1, table.findIndex(r => r.club === state.clubName) + 1);

  if (position === 1 && !state.trophies.some(t => t.season === state.season && t.name === 'League Title')) {
    state.trophies.push({ name: 'League Title', emoji: '🏆', season: state.season });
  }
  const seasonTrophies = state.trophies.filter(t => t.season === state.season).map(t => t.name);
  const overshoot = club.expectation - position;

  let verdictGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  if (seasonTrophies.includes('Champions League') || position === 1 || overshoot >= 3 || seasonTrophies.length >= 2) {
    verdictGrade = 'A';
  } else if (overshoot >= 0 || seasonTrophies.length >= 1) {
    verdictGrade = 'B';
  } else if (overshoot >= -3) {
    verdictGrade = 'C';
  } else if (overshoot >= -6) {
    verdictGrade = 'D';
  } else {
    verdictGrade = 'F';
  }
  const verdict = pick(VERDICTS[verdictGrade]);

  const byGoals = [...state.squad].sort((a, b) => b.seasonGoals - a.seasonGoals);
  const byAssists = [...state.squad].sort((a, b) => b.seasonAssists - a.seasonAssists);
  const topScorer = byGoals[0] && byGoals[0].seasonGoals > 0
    ? { name: byGoals[0].name, goals: byGoals[0].seasonGoals }
    : null;
  const topAssister = byAssists[0] && byAssists[0].seasonAssists > 0
    ? { name: byAssists[0].name, assists: byAssists[0].seasonAssists }
    : null;

  // Round 70: objective report card. Statuses are final here because the
  // calendar is exhausted when finishSeason runs.
  const objectiveResults = objectiveStatuses(state).map(s => ({
    label: s.objective.label,
    hit: s.status === 'done',
  }));

  const offers: JobOffer[] = [];
  if (overshoot >= 2 || seasonTrophies.length > 0) {
    // Round 70: suitors can come from any of the five leagues now.
    const everyClub = REAL_LEAGUES.flatMap(l => playableClubs(l.id));
    const suitors = shuffle(everyClub.filter(c => c.tier < club.tier && c.name !== state.clubName));
    for (const s of suitors.slice(0, ri(1, 2))) {
      const abroad = !leagueOf(state.clubName).clubs.includes(s.name);
      /* Round 140: job offers stopped saying "board expects Top 14", because
         no board on earth talks like that. The offer now carries the same
         named demand the club would actually hand you on day one. */
      const sLeague = leagueOf(s.name);
      const ask = leagueDemand(s.expectation, s.tier, sLeague.clubs.length, sLeague);
      offers.push({
        club: s.name,
        blurb: `${TIER_INFO[s.tier].emoji} ${TIER_INFO[s.tier].label} club · ${sLeague.name}${abroad ? ' (abroad)' : ''} · ${money(s.budget)} budget · the board wants: ${ask.label}`,
      });
    }
  }

  const summary: SeasonSummary = {
    season: state.season,
    club: state.clubName,
    position,
    points: myRow.pts,
    wins: myRow.w,
    draws: myRow.d,
    losses: myRow.l,
    gf: myRow.gf,
    ga: myRow.ga,
    verdictGrade,
    verdict,
    champion: table[0] ? table[0].club : state.clubName,
    trophies: seasonTrophies,
    topScorer,
    topAssister,
    qualifiedUcl: position <= 4 && leagueOf(state.clubName).euro,
    signings: state.seasonSignings,
    offers,
    seasonScore: Math.min(130, myRow.pts + seasonTrophies.length * 10),
    objectives: objectiveResults,
  };

  state.history = [
    ...state.history.filter(h => h.season !== state.season),
    { season: state.season, club: state.clubName, position, points: myRow.pts, trophies: seasonTrophies },
  ];
  state.pendingSummary = summary;
  return { state, summary };
}

/**
 * One season older: rating drift, fresh legs, wiped season stats.
 *
 * Round 116: the drift used to read nothing but the birthday, so a kid on the
 * bench improved exactly as fast as a kid playing every week and a future star
 * improved exactly as fast as a squad filler. The age curve is still the base,
 * but positive growth is now multiplied by developmentRate and hard capped at
 * the player's ceiling. Decline is untouched: no amount of coaching keeps a
 * thirty four year old from slowing down.
 */
function agePlayer(p: CMPlayer, career: CareerState): CMPlayer {
  const age = p.age + 1;
  /* Round 132: the same single curve the projected world runs on, so my squad
     and every AI squad in the game age on identical rules. That symmetry is
     Round 95's lesson in a different coat: the moment the human team and the
     computer teams are scored on different numbers, the human loses ten
     seasons out of ten and nobody can see why.

     The old shape here was a flat minus two a season from thirty three all the
     way to forty three, which is not a decline, it is a ramp. MEASURED on the
     shipped engine over twenty four seasons at eight clubs with contracts
     disabled so nothing else could remove anybody: mean drift per season was
     -1.98 at 33, -2.02 at 34, -1.98 at 35, -2.02 at 36, -2.04 at 37, -1.97 at
     38, -1.83 at 40 and -1.69 at 43. A perfectly straight line, and nobody
     ever stopped playing. */
  const [lo, hi] = ageDriftBand(age);
  let drift = ri(lo, hi);
  if (drift < 0) drift = Math.round(drift * declineScale(p.position));
  const potential = p.potential ?? rollPotential(p.rating, p.age);
  if (drift > 0) {
    drift = Math.round(drift * developmentRate(p, career));
    drift = Math.min(drift, Math.max(0, potential - p.rating));
  }
  // Round 70: market value tracks the rating drift (each rating point is
  // ~20% of value on the curve) and decays for the over-30s.
  let value = p.value;
  if (value !== undefined) {
    value = value * Math.pow(1.2, drift) * (age >= 31 ? 0.85 : 1);
    value = Math.max(0.2, Math.round(value * 10) / 10);
  }
  const rating = clamp(p.rating + drift, 40, 95);
  return {
    ...p,
    age,
    rating,
    // The ceiling never sits below where he already is, and it slides down a
    // little once the legs start going.
    potential: Math.max(rating, age >= 30 ? potential - 2 : potential),
    value,
    fitness: 100,
    morale: 70,
    injuryWeeks: 0,
    suspendedMatches: 0,
    seasonGoals: 0,
    seasonAssists: 0,
    // Round 73: the full stat line resets with the season.
    apps: 0,
    seasonYellows: 0,
    seasonReds: 0,
    cleanSheets: 0,
    ratingSum: 0,
    // Round 105: a year off the deal, and his wage tracks his new value.
    contractYears: Math.max(0, (p.contractYears ?? 3) - 1),
    /* Round 127: a summer wipes the slate. The rung you put him on carries
       over, because that is the promise and it is supposed to outlive one bad
       run, but last season's ten games and last season's transfer request do
       not follow him into August. Without this a grudge would compound
       forever and no squad would ever recover from one bad autumn. */
    lastTen: [],
    wantsOut: undefined,
  };
}

/**
 * Below this many senior bodies the club stops waiting for the manager.
 *
 * Deliberately low, and it took two goes to get it there. The first version
 * filled the squad up to eighteen with the best free agents inside a band, and
 * at Everton that produced a twenty five man squad of journeymen rated 78 to
 * 84 which was BETTER than the real Everton squad, wiped out the entire value
 * of running your own academy (simAcademy measured the gap collapsing from
 * 4.31 rating points to 0.38) and turned neglect into a strategy. The floor is
 * not there to build you a squad. It is there so that a manager who has never
 * opened the contracts screen still has eleven grown men to pick from instead
 * of a team of sixteen year olds, and no further.
 */
const SENIOR_FLOOR = 12;

/**
 * Round 132: the club recruits when the manager will not.
 *
 * This is the other half of succession, and it took measuring to find. Play
 * twelve seasons without ever opening the contracts screen and the shipped
 * engine leaves you with seventeen players whose average age is eighteen and
 * an XI rated 64, because every starting deal runs one to four years, everyone
 * walks for free when it ends, and the only thing coming the other way is two
 * or three academy kids a summer. Meanwhile every AI club in the league is
 * sitting on the high eighties. That is not a hard save, it is a broken one,
 * and "no club runs out of players" has to mean my club too.
 *
 * So when the squad falls below a real football squad, the sporting director
 * goes and gets bodies: free agents off the market at this club's level minus
 * a chunk, on short deals, and the news says exactly what happened. They are
 * deliberately worse than what you let walk, so letting your squad rot still
 * costs you, it just does not end the save. In a squad that is being managed
 * this never fires at all, which is why it cannot move the balance.
 */
function fillSquadGaps(
  clubName: string, season: number, squad: CMPlayer[], yearsOnNow: number,
  retiredNames: string[],
): { squad: CMPlayer[]; signed: string[] } {
  const seniors = squad.filter(p => !p.isYouth && p.age >= 20).length;
  if (seniors >= SENIOR_FLOOR) return { squad, signed: [] };
  const baseline = projectedXIAvg(clubName, yearsOnNow)
    ?? STRENGTH_PRIORS[clubName] ?? 66;
  const taken = new Set(squad.map(p => p.name));
  const retired = new Set(retiredNames);
  // Well below what this club would normally field: these are the players
  // nobody else wanted in August, and they should feel like it.
  const pool = marketBase(yearsOnNow)
    .filter(p => !taken.has(p.name) && !retired.has(p.name)
      && p.rating <= baseline - 14 && p.rating >= baseline - 26)
    .sort((a, b) => a.rating - b.rating);
  if (!pool.length) return { squad, signed: [] };
  const want = clamp(SENIOR_FLOOR - seniors, 0, 4);
  const out = [...squad];
  const signed: string[] = [];
  for (let i = 0; i < want; i++) {
    // The thinnest position first, so an emergency window does not hand you
    // six strikers and no keeper.
    const counts: Record<PosGroup, number> = { GK: 0, DEF: 0, MID: 0, ATT: 0 };
    for (const p of out) counts[groupOf(p.position)] += 1;
    const needs: Record<PosGroup, number> = { GK: 2, DEF: 6, MID: 6, ATT: 4 };
    const thin = (['GK', 'DEF', 'MID', 'ATT'] as PosGroup[])
      .sort((a, b) => (counts[a] - needs[a]) - (counts[b] - needs[b]))[0];
    const fits = pool.filter(p => groupOf(p.position) === thin && !signed.includes(p.name));
    const mp = (fits.length ? fits : pool.filter(p => !signed.includes(p.name)))[0];
    if (!mp) break;
    signed.push(mp.name);
    const player: CMPlayer = {
      id: `fa-${slug(mp.name)}-s${season}`,
      name: mp.name,
      position: mp.position,
      rating: mp.rating,
      age: mp.age,
      fitness: 100,
      morale: 68,
      injuryWeeks: 0,
      suspendedMatches: 0,
      isYouth: false,
      seasonGoals: 0,
      seasonAssists: 0,
      value: mp.value,
      generated: mp.generated,
      contractYears: mp.age >= 31 ? 2 : 3,
      wage: 0,
    };
    player.wage = wageFor(player);
    out.push(player);
  }
  return { squad: out, signed };
}

/**
 * Rolls the career into the next season, optionally at a new club if a job
 * offer was accepted. Ages the squad, runs the youth intake, resets the
 * competitions and reopens the summer window.
 */
export function startNextSeason(career: CareerState, acceptOfferClub?: string): CareerState {
  const summary = career.pendingSummary;
  const prevPos = summary ? summary.position : Math.max(1, leaguePosition(career));
  const moving = !!(acceptOfferClub && clubByName(acceptOfferClub) && acceptOfferClub !== career.clubName);
  const clubName = moving && acceptOfferClub ? acceptOfferClub : career.clubName;
  const club = clubDefFor(clubName);
  const season = career.season + 1;
  // Round 70: hitting or missing board objectives carries into next season's
  // starting confidence.
  const objs = summary?.objectives ?? [];
  const objNet = objs.reduce((s, o) => s + (o.hit ? 1 : -1), 0);

  /* Round 132: the world clock ticks here and only here. The new season is one
     year further from the baked roster year, which moves every AI squad, the
     whole transfer market and the ages of my own players together. */
  const nextYearsOn = Math.max(0, (career.startYear ?? CM_BASE_YEAR) + season - 1 - CM_BASE_YEAR);

  let squad: CMPlayer[];
  const freeAgentNews: string[] = [];
  const releasedNews: string[] = [];
  const freeAgentsIn: string[] = [];
  const retiredNow: { name: string; age: number; rating: number }[] = [];
  // Round 71: loan players go back to their parent clubs at season's end.
  const afterLoans = career.squad.filter(p => !p.onLoan);
  // Round 94: and MY loanees come home, with a season of football in them.
  const homeFromLoan = returnLoanedPlayers(career);
  if (moving) {
    squad = buildSquad(clubName, nextYearsOn);
  } else {
    // Round 105: deals run down over the summer and the expired walk for
    // nothing. This is the price of never sitting down with your own players.
    const aged = [...afterLoans, ...homeFromLoan].map(p => agePlayer(p, career));
    /* Round 132: and some of them stop playing altogether. Before this the
       ONLY way a player ever left on age was the line below, "age < 38 or
       rated 70 plus", which meant a good veteran simply never went: measured
       on the shipped engine with contracts disabled, eight squads ran twenty
       four seasons and finished with players of 37, 42, 37, 37, 37, 45, 43 and
       42. Nobody in the game had ever retired. Now they do, on odds that read
       his age, what he is still worth to you and where he plays, because
       keepers last and wingers do not. */
    const stillPlaying: CMPlayer[] = [];
    for (const p of aged) {
      if (Math.random() < retireChance(p.age, p.rating, p.position)) {
        retiredNow.push({ name: p.name, age: p.age, rating: p.rating });
      } else {
        stillPlaying.push(p);
      }
    }
    const walked = stillPlaying.filter(p => (p.contractYears ?? 1) <= 0);
    for (const p of walked) freeAgentNews.push(p.name);
    squad = stillPlaying.filter(p => (p.contractYears ?? 1) > 0);
    /* Round 132: the club replaces what it lost. The old intake was a flat two
       or three kids a summer whatever happened, so a squad that lost six
       players to retirement and expiry came back six lighter and the auto top
       up filled it with fifty five rated teenagers. A real club signs to
       replace. This tops the intake up so the squad does not shrink, and every
       extra body is still a kid off your own training ground, which keeps the
       academy the thing that feeds you. */
    const lost = (afterLoans.length + homeFromLoan.length) - squad.length;
    const room = Math.max(0, AUTO_SQUAD_TARGET - squad.length);
    const intake = clamp(Math.min(ri(2, 3) + Math.max(0, lost - 2), room), 0, 7);
    for (let i = 0; i < intake; i++) {
      squad.push(makeYouth(pick([...POS_DEF, ...POS_MID, ...POS_ATT, 'GK' as Position])));
    }
    const emergency = fillSquadGaps(
      clubName, season, squad, nextYearsOn,
      [...(career.retiredNames ?? []), ...retiredNow.map(r => r.name)],
    );
    squad = emergency.squad;
    freeAgentsIn.push(...emergency.signed);
    squad = ensureSquadCoverage(squad);
    /* Round 132: and the books get balanced. Keeping veterans alive (see
       renewalTerms) plus a bigger intake pushed a well managed squad to 41
       players over twelve seasons, well past the thirty you are allowed to
       sign up to, so the club releases its surplus fringe players the way a
       real one does. Youth padding goes first, then the lowest rated, and it
       never touches a squad that is inside the limit. */
    if (squad.length > SQUAD_LIMIT) {
      /* Only ever the genuinely surplus: youth padding first, then finished
         players with no growth left in them. A kid out of your own academy is
         NEVER released, whatever he is rated today, and neither is anybody
         still carrying headroom. The first version of this sorted purely on
         rating and quietly binned the academy graduates, which simAcademy
         caught immediately: an engaged manager finished six seasons with 0.8
         graduates in the squad instead of four or five, because a seventeen
         year old you have just promoted IS the lowest rated senior on the
         books. If there is nothing surplus to release, the squad simply runs
         one or two over, which is what it did before this round. */
      const spare = squad.filter(p =>
        !p.academyGrad && (p.isYouth || (p.potential ?? p.rating) <= p.rating));
      spare.sort((a, b) => (a.isYouth ? 0 : 1) - (b.isYouth ? 0 : 1) || a.rating - b.rating);
      const cut = new Set(spare.slice(0, squad.length - SQUAD_LIMIT).map(p => p.id));
      for (const p of squad) if (cut.has(p.id)) releasedNews.push(p.name);
      squad = squad.filter(p => !cut.has(p.id));
    }
  }

  const seasonTrophyCount = career.trophies.filter(t => t.season === career.season).length;
  const budget = moving
    ? Math.round(club.budget * 1.1)
    : Math.max(10, Math.round(club.budget + (club.expectation - prevPos) * 2 + seasonTrophyCount * 12));
  const qualifiedUcl = (summary ? summary.qualifiedUcl : prevPos <= 4) && leagueOf(clubName).euro;
  const league = leagueOf(clubName);
  const leagueClubs = shuffle([...league.clubs]);

  const state: CareerState = {
    ...JSON.parse(JSON.stringify(career)) as CareerState,
    clubName,
    season,
    week: 0,
    budget,
    boardConfidence: moving ? 62 : clamp(55 + (club.expectation - prevPos) * 1.5 + objNet * 2, 35, 82),
    sacked: false,
    squad,
    xiIds: [],
    leagueClubs,
    table: leagueClubs.map(emptyRow),
    form: [],
    calendar: buildCalendar(league.clubs.length),
    clubStrengths: genClubStrengths(league, nextYearsOn),
    transferWindow: 'summer',
    windowWeeksLeft: 4,
    aiHeadlines: [],
    // Round 132: anybody the club had to go and get is off the market now.
    goneNames: [...freeAgentsIn],
    seasonSignings: [],
    cupRound: 'R16',
    cupDraw: {},
    uclGroup: initUclGroup(qualifiedUcl, clubName),
    uclKoRound: null,
    uclDraw: {},
    uclBracket: undefined,
    cupBracket: undefined,
    world: initWorld(clubName),
    pendingSummary: null,
    cupExit: null,
    uclExit: null,
    negotiation: null,
    incomingBids: [],
    coldNames: [],
    loanedOut: [],
    resultLog: [],
    inbox: [],
    promisedStarts: [],
    // Round 132: a retired player never comes back, so the market has to be
    // told, and the list has to survive the rollover it was written in.
    retiredNames: [...(career.retiredNames ?? []), ...retiredNow.map(r => r.name)],
    retiredLastSummer: retiredNow,
  };
  // Round 71: track every club this manager has run.
  const managed = new Set(state.careerStats.clubsManaged ?? [career.clubName]);
  managed.add(clubName);
  state.careerStats = { ...state.careerStats, clubsManaged: [...managed] };
  // Round 116: you do not take the training ground with you. A new club hands
  // you its own setup, its own kids and nobody else's scouting reports.
  if (moving) {
    state.academy = defaultAcademy(clubName);
    state.academyGraduates = 0;
  }
  // Round 105: everyone still here needs a wage on file, the new club sets a
  // new cap, and the players you let walk lead the summer's news.
  ensureContracts(state);
  ensureAcademy(state);
  /* Round 127: a manager who walks into a new club walks into a dressing room
     that has never been told anything, so it gets the honest default ladder
     off its own ratings. Staying put keeps every promise you already made. */
  if (moving) {
    for (const p of state.squad) p.role = undefined;
  }
  ensureRoles(state);
  ensureClock(state);
  ensurePress(state);
  /* Round 135: a reputation follows you, so the press mood carries over the
     summer rather than resetting, but it fades most of the way back toward
     nobody having an opinion because last season is last season. A manager who
     changes club walks in with a clean slate at his new one. */
  if (state.press) {
    const carried = moving ? 50 : 50 + (pressOf(career).mood - 50) * 0.4;
    state.press = {
      ...state.press,
      mood: clamp(Math.round(carried * 10) / 10, 0, 100),
      pending: null, lastWeek: -PRESS_GAP, nextFire: 0, nextSharpen: 0,
      promised: false, lastTone: null, toneRun: 0, lastLine: undefined,
    };
  }
  state.teamTalk = null;
  // Round 116: intake day. What comes up is whatever your academy earned.
  const intakeNews = runYouthIntake(state);
  state.wageCap = wageCapFrom(wageBill(state));
  for (const name of freeAgentNews) {
    pushNews(state, { name, from: career.clubName, to: 'a free transfer', fee: 0 });
  }
  if (freeAgentNews.length && !moving) {
    state.aiHeadlines = [
      `📰 ${freeAgentNews.length} player${freeAgentNews.length === 1 ? '' : 's'} left ${career.clubName} for nothing: ${freeAgentNews.slice(0, 4).join(', ')}.`,
      ...state.aiHeadlines,
    ];
  }
  /* Round 132: retirements lead the summer, because they are the biggest thing
     that can happen to a squad and the old engine never mentioned them for the
     simple reason that they never happened. */
  if (retiredNow.length) {
    const names = retiredNow.map(r => `${r.name} (${r.age})`);
    state.aiHeadlines = [
      `\u{1F45F} ${names.slice(0, 3).join(', ')}${names.length > 3 ? ` and ${names.length - 3} more` : ''} ${retiredNow.length === 1 ? 'has' : 'have'} retired.`,
      ...state.aiHeadlines,
    ].slice(0, 8);
  }
  if (releasedNews.length) {
    state.aiHeadlines = [
      `\u{1F4CB} ${clubName} trimmed the squad back to ${SQUAD_LIMIT}: ${releasedNews.slice(0, 4).join(', ')} released.`,
      ...state.aiHeadlines,
    ].slice(0, 8);
  }
  if (freeAgentsIn.length) {
    state.aiHeadlines = [
      `\u{1F4DD} The squad was too thin to start a season, so ${clubName} went and signed ${freeAgentsIn.length} free agent${freeAgentsIn.length === 1 ? '' : 's'}: ${freeAgentsIn.slice(0, 4).join(', ')}.`,
      ...state.aiHeadlines,
    ].slice(0, 8);
    for (const name of freeAgentsIn) {
      pushNews(state, { name, from: 'a free transfer', to: clubName, fee: 0 });
    }
  }
  if (intakeNews.length) state.aiHeadlines = [...intakeNews, ...state.aiHeadlines].slice(0, 8);
  state.boardObjectives = buildBoardObjectives(clubName, state.uclGroup !== null, league.clubs.length);
  state.cupBracket = buildCupBracket(state);
  state.cupDraw.R16 = myCupOpponent(state, 'R16') ?? drawCupOpponent(state);
  state.xiIds = autoPickXI(state.squad, FORMATIONS[state.formationIndex] ?? FORMATIONS[0]);
  generateHeadlines(state);
  return state;
}

/* ================================================================== */
/* Persistence (localStorage)                                         */
/* ================================================================== */

export function saveCareer(career: CareerState): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(career));
  } catch {
    /* quota/private mode, the run just won't persist */
  }
}

export function loadCareer(): CareerState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CareerState;
    if (
      !parsed ||
      parsed.saveVersion !== SAVE_VERSION ||
      typeof parsed.clubName !== 'string' ||
      !Array.isArray(parsed.squad) ||
      !Array.isArray(parsed.calendar) ||
      !Array.isArray(parsed.xiIds) ||
      !Array.isArray(parsed.table)
    ) {
      return null;
    }
    /* Round 127: repair the save the moment it is opened rather than on the
       first kick off. ensureRoles has always run at the top of playNextEntry,
       which is the house pattern and is enough for the engine, but it is NOT
       enough for the screens: an old save loaded straight into the dressing
       room showed every single player as a rotation option, because nobody had
       been given a rung yet and the fallback has to guess. Found by loading a
       real half played save built on the committed pre Round 127 engine into a
       browser, which is the only way anybody would ever have seen it. */
    ensureRoles(parsed);
    /* Round 135: and the press room, for exactly the same reason. The hub tile
       and the press screen both read it before a ball is kicked. */
    ensurePress(parsed);
    /* Round 132: same reason, same place. A save from before the clock existed
       has no start year, and the squad screen, the transfer screen and the hub
       all read the world year now, so it has to be right before any of them
       renders rather than at the first kick off. */
    ensureClock(parsed);
    return parsed;
  } catch {
    return null;
  }
}

export function clearCareer(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}


