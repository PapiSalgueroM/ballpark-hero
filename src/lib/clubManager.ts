import { foldSpecialLatin } from '@/lib/nameFold';
import type { Player, Position } from '@/types/game';
import { FORMATIONS, playerRating } from '@/lib/squadDeal';
import type { Formation } from '@/lib/squadDeal';
import { players as RAW_POOL } from '@/data/players';
// Round 70: real 2026 rosters for every club in the big five leagues, baked
// from the Transfermarkt style market value data in Supabase. The bake file
// imports nothing but types, so reading it at module scope is safe.
import { CM_ROSTERS, CM_ROSTER_META, CM_PARTIAL } from '@/data/clubManagerRosters';
import type { BakedPlayer } from '@/data/clubManagerRosters';

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
export type { Formation };
export { CM_ROSTER_META, CM_ROSTERS, CM_PARTIAL };

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
  /** Round 73: full per-season stat line. */
  apps?: number;
  seasonYellows?: number;
  seasonReds?: number;
  /** Clean sheets, tracked for keepers and defenders. */
  cleanSheets?: number;
  /** Sum of match ratings; average = ratingSum / apps. */
  ratingSum?: number;
}

/** Round 73: one line in the season's fixture and result log. */
export interface ResultLogEntry {
  week: number;
  comp: string;
  opp: string;
  home: boolean | null;
  score: string;
  res: FormResult;
}

export type MessageEffect = 'promise' | 'refuse' | 'listen' | 'fine' | 'support' | 'laugh';

/** Round 73: players slide into your DMs. */
export interface PlayerMessage {
  id: string;
  playerName: string;
  playerId: string;
  kind: 'startMe' | 'wantMove' | 'drama' | 'praise';
  text: string;
  options: { label: string; effect: MessageEffect }[];
  week: number;
  /** Set once answered (or auto-resolved): the outcome line shown in the UI. */
  resolved?: string;
}

/** Round 70: one board demand for the season, FIFA manager style. */
export interface BoardObjective {
  id: 'league' | 'cup' | 'ucl' | 'rival' | 'goals';
  /** What the board wants, e.g. "Finish top 4". */
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
  /** The 20 league clubs in scheduling order (shuffled each season). */
  leagueClubs: string[];
  table: TableRow[];
  /** Last 5 results, oldest first. */
  form: FormResult[];
  calendar: CalendarEntry[];
  /** Per-season strength rating for every club (league + UCL flavor clubs). */
  clubStrengths: Record<string, number>;
  transferWindow: 'summer' | 'january' | null;
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

export interface PlayResult {
  state: CareerState;
  kind: 'window' | 'match' | 'seasonOver';
  report?: MatchWeekReport;
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
  { id: 'germany', name: 'Germany', flag: '🇩🇪', leagueIds: ['bundesliga'] },
  { id: 'france', name: 'France', flag: '🇫🇷', leagueIds: ['ligue1'] },
  { id: 'netherlands', name: 'Netherlands', flag: '🇳🇱', leagueIds: ['eredivisie'] },
  { id: 'saudi', name: 'Saudi Arabia', flag: '🇸🇦', leagueIds: ['saudi'] },
  { id: 'usa', name: 'United States', flag: '🇺🇸', leagueIds: ['mlsEast', 'mlsWest'] },
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

/** Average rating of the club's best XI from the baked real rosters. */
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

/** Round 70: a squad player from the baked real-roster data. */
function bakedToCMPlayer(b: BakedPlayer): CMPlayer {
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

function buildSquad(clubName: string): CMPlayer[] {
  // Round 70: baked real rosters first (with real market values); the old
  // static pool only backs up clubs outside the bake. Round 72: cap the
  // start at the 26 most valuable so deep baked squads (Real Madrid has 29
  // dataset players) leave room under the 30-man limit to actually sign
  // people.
  const baked = CM_ROSTERS[clubName];
  const real = baked && baked.length
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

/** What we bank when selling: 90% of real value (youth products fetch less). */
export function sellValue(p: CMPlayer): number {
  if (p.value !== undefined) {
    return Math.max(0.3, Math.round(p.value * 0.9 * 10) / 10);
  }
  const youthF = p.isYouth ? 0.4 : 1;
  return Math.max(1, Math.round(baseValue(p.rating, p.age) * 0.9 * youthF));
}

let MARKET_BASE_CACHE: MarketPlayer[] | null = null;

/**
 * Round 70: the purchasable universe is every baked real player across all
 * five leagues plus the European flavor clubs, nearly 2,000 players with
 * real market-value pricing (was: a 716-player static pool with curve
 * prices). Built once and cached; buildMarket filters it per career.
 */
function marketBase(): MarketPlayer[] {
  if (MARKET_BASE_CACHE) return MARKET_BASE_CACHE;
  const out: MarketPlayer[] = [];
  const seen = new Set<string>();
  for (const [club, roster] of Object.entries(CM_ROSTERS)) {
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
      });
    }
  }
  out.sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name));
  MARKET_BASE_CACHE = out;
  return out;
}

/**
 * Deterministic view of who is purchasable right now: the baked player
 * universe minus my squad and minus anyone already transferred (goneNames).
 * Called from a useMemo on every career change, so it must be pure.
 */
export function buildMarket(career: CareerState): MarketPlayer[] {
  const squadNames = new Set(career.squad.map(p => p.name));
  const gone = new Set(career.goneNames);
  return marketBase().filter(p => !squadNames.has(p.name) && !gone.has(p.name));
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
  };
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

const DRAMA_POOL: { text: string; options: { label: string; effect: MessageEffect }[] }[] = [
  { text: '{P} crashed his brand new Lamborghini into the training ground fountain at 2am. The fountain lost.', options: [{ label: 'Fine him two weeks wages', effect: 'fine' }, { label: 'Laugh it off in the press', effect: 'laugh' }] },
  { text: '{P} got caught selling his match worn boots on eBay. Buy it now, no returns.', options: [{ label: 'Fine him', effect: 'fine' }, { label: 'Buy a pair yourself', effect: 'laugh' }] },
  { text: "{P}'s wife and {Q}'s wife are feuding on Instagram and the dressing room has picked sides.", options: [{ label: 'Order everyone offline', effect: 'refuse' }, { label: 'Stay out of it', effect: 'laugh' }] },
  { text: '{P} wants to skip Saturday to attend his cousin\'s album release party. The cousin raps under the name Lil Nutmeg.', options: [{ label: 'Absolutely not', effect: 'refuse' }, { label: 'Let him go', effect: 'support' }] },
  { text: '{P} showed up to training in a full chrome wrap on his car with his own face printed on the hood.', options: [{ label: 'Fine him for the parking spot he took', effect: 'fine' }, { label: 'Respect it, honestly', effect: 'laugh' }] },
  { text: '{P} has started a podcast. Episode one is called "Why My Manager Does Not Understand Football".', options: [{ label: 'Make him listen to it in front of everyone', effect: 'fine' }, { label: 'Go on the podcast', effect: 'support' }] },
  { text: '{P} adopted an emotional support alpaca and wants to bring it to the training ground.', options: [{ label: 'No farm animals', effect: 'refuse' }, { label: 'The alpaca stays, morale is up', effect: 'support' }] },
  { text: '{P} was spotted at a casino until 4am two nights before the match. He says he was "networking".', options: [{ label: 'Fine him', effect: 'fine' }, { label: 'Have a quiet word', effect: 'listen' }] },
  { text: '{P} bought the apartment building next to the stadium and is renting flats to away fans on matchday.', options: [{ label: 'Make him stop', effect: 'refuse' }, { label: 'Business is business', effect: 'laugh' }] },
  { text: '{P} got a tattoo of the club badge. The tattoo artist misspelled the club name.', options: [{ label: 'Pay for the fix', effect: 'support' }, { label: 'It stays, as a lesson', effect: 'laugh' }] },
  { text: '{P} challenged a fan who criticized him to a race. The fan won. It is everywhere.', options: [{ label: 'Ban him from social media', effect: 'refuse' }, { label: 'Sign the fan for the youth team', effect: 'laugh' }] },
  { text: '{P} says his personal chef was poached by {Q} and now they are not speaking.', options: [{ label: 'Hire a team chef for everyone', effect: 'fine' }, { label: 'Let them sort it out', effect: 'laugh' }] },
  { text: '{P} missed training because he flew to Milan "for a haircut". The haircut is admittedly immaculate.', options: [{ label: 'Fine him', effect: 'fine' }, { label: "Ask for the barber's number", effect: 'laugh' }] },
  { text: '{P} has been teaching the youth players a goal celebration so elaborate it needs a permit.', options: [{ label: 'Ban it', effect: 'refuse' }, { label: 'Ask for a role in it', effect: 'support' }] },
  { text: "{P} accidentally liked a rival fan account's post calling for your sacking. Says his phone was hacked. Sure.", options: [{ label: 'Fine him', effect: 'fine' }, { label: 'Let it slide, but he knows', effect: 'listen' }] },
  { text: '{P} turned up with a personal documentary crew. They want to film team talks "for the arc".', options: [{ label: 'No cameras inside', effect: 'refuse' }, { label: 'Give them one episode', effect: 'support' }] },
  { text: '{P} is selling his own brand of protein cereal in the players lounge. {Q} says it tastes like drywall.', options: [{ label: 'Shut the stand down', effect: 'refuse' }, { label: 'Invest early', effect: 'laugh' }] },
  { text: '{P} got stuck in the stadium elevator for two hours and live streamed the whole thing. Record viewership.', options: [{ label: 'Check on him', effect: 'support' }, { label: 'Clip it for the club account', effect: 'laugh' }] },
  { text: '{P} wants the club to sign his brother. His brother is 34 and plays Sunday league. He is, however, "in the best shape of his life".', options: [{ label: 'Politely decline', effect: 'refuse' }, { label: 'Offer a trial, for the content', effect: 'laugh' }] },
  { text: '{P} rated his own performance 10/10 in the club app after a 4-0 defeat.', options: [{ label: 'Make him explain it to the squad', effect: 'fine' }, { label: 'Confidence is confidence', effect: 'laugh' }] },
  { text: '{P} has been parking in your spot all month and putting a traffic cone on his own.', options: [{ label: 'Tow it', effect: 'fine' }, { label: 'Take the cone spot, be the bigger man', effect: 'laugh' }] },
  { text: '{P} announced his retirement on social media by accident. He meant to post his dinner.', options: [{ label: 'Get the club to clarify', effect: 'support' }, { label: 'Let the rumors run a day', effect: 'laugh' }] },
  { text: '{P} and {Q} got matching tattoos to celebrate a win. Neither remembers deciding this.', options: [{ label: 'Fine them both', effect: 'fine' }, { label: 'Team bonding is team bonding', effect: 'support' }] },
  { text: '{P} claims a fortune teller told him he will score a hat-trick this weekend, and he has already ordered the match ball display case.', options: [{ label: 'Manage expectations', effect: 'listen' }, { label: 'Start him. Fate is fate', effect: 'promise' }] },
];

const START_ME_TEXTS = [
  'Gaffer. {P} here. I am the best player at this club and I am watching from the bench. Start me Saturday or we have a problem.',
  '{P} knocked on your office door: "I did not join this club to model the warmup jacket. I want to start."',
  "{P}'s agent texts you at midnight: my client trains like a machine and sits like furniture. Start him.",
];
const WANT_MOVE_TEXTS = [
  '{P} has requested a meeting. He is not happy, and the word "transfer" was used twice before he sat down.',
  "{P}'s camp has been whispering to journalists. He wants out unless things change fast.",
];
const PRAISE_TEXTS = [
  '{P} after the win: "That one was for you, boss. The lads would run through a wall for you right now."',
  '{P} left a bottle of very expensive wine on your desk with a note: "More of that, yeah?"',
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
  if (unresolved >= 3 || Math.random() > 0.38) return;
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
  pushMessage(state, {
    playerName: p1.name,
    playerId: p1.id,
    kind: 'drama',
    text: drama.text.replace('{P}', p1.name).replace('{Q}', p2.name),
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
      break;
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
  if (career.squad.length <= 14) return null;
  const p = career.squad.find(x => x.id === playerId);
  if (!p) return null;
  const gkCount = career.squad.filter(x => x.position === 'GK').length;
  if (p.position === 'GK' && gkCount <= 1) return null;
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

/** Reject a bid: half the time they come back once with ~15% more. */
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
  // Final rejection: the player wanted the move 40% of the time.
  const squad = Math.random() < 0.4
    ? career.squad.map(p => (p.id === playerId ? { ...p, morale: clamp(p.morale - 7, 5, 99) } : p))
    : career.squad;
  return { ...career, squad, incomingBids: bids.filter(b => b.playerId !== playerId) };
}

/** 0-2 AI bids for my most wanted players, rolled when a window opens. */
function generateIncomingBids(state: CareerState): void {
  const bids: IncomingBid[] = [];
  const targets = state.squad
    .filter(p => !p.isYouth && !p.onLoan && p.rating >= 74)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
    .slice(0, 8);
  const count = Math.random() < 0.45 ? 0 : ri(1, 2);
  const buyers = REAL_LEAGUES.flatMap(l => playableClubs(l.id).slice(0, 7).map(c => c.name))
    .filter(n => n !== state.clubName);
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

/** Returns the new state, or null if the sale is not allowed. */
export function sellPlayer(career: CareerState, playerId: string): CareerState | null {
  if (career.transferWindow === null) return null;
  if (career.squad.length <= 14) return null;
  const p = career.squad.find(x => x.id === playerId);
  if (!p) return null;
  const gkCount = career.squad.filter(x => x.position === 'GK').length;
  if (p.position === 'GK' && gkCount <= 1) return null;
  const fee = sellValue(p);
  return {
    ...career,
    budget: Math.round((career.budget + fee) * 10) / 10,
    squad: career.squad.filter(x => x.id !== playerId),
    xiIds: career.xiIds.map(id => (id === playerId ? null : id)),
    seasonSignings: [...career.seasonSignings, { dir: 'out', name: p.name, fee }],
  };
}

/**
 * 3-6 AI transfers between the other clubs. Each headline removes that player
 * from the market for the rest of the season. Mutates state (internal use).
 */
function generateHeadlines(state: CareerState): void {
  const market = buildMarket(state);
  const count = Math.min(ri(3, 6), market.length);
  const candidates = shuffle(market.slice(0, 120)).slice(0, count);
  const heads: string[] = [];
  // Round 70: any club in the five leagues can be the buyer, weighted toward
  // my own league so the headlines feel local.
  const myLeagueNames = leagueOf(state.clubName).clubs;
  const bigSpenders = REAL_LEAGUES.flatMap(l => playableClubs(l.id).slice(0, 6).map(c => c.name));
  for (const mp of candidates) {
    const pool = Math.random() < 0.55 ? myLeagueNames : bigSpenders;
    const buyers = pool.filter(n => n !== state.clubName && n !== mp.club);
    const buyer = buyers.length ? pick(buyers) : myLeagueNames[0];
    const fee = Math.max(1, Math.round(mp.price * (0.9 + Math.random() * 0.25)));
    heads.push(`${buyer} sign ${mp.name} from ${mp.club} for ${money(fee)}.`);
    state.goneNames.push(mp.name);
    // Round 71: every AI deal lands in the Latest Transfers feed too.
    pushNews(state, { name: mp.name, from: mp.club, to: buyer, fee });
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
function genClubStrengths(myLeague: LeagueDef): Record<string, number> {
  const out: Record<string, number> = {};
  const baseFor = (name: string): number =>
    bakedXIAvg(name) ?? STRENGTH_PRIORS[name] ?? Math.max(clubPreviewRating(name), 66);
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
/* Round 70: board objectives, FIFA manager style                     */
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
export function buildBoardObjectives(clubName: string, hasUcl: boolean, leagueSize: number): BoardObjective[] {
  const club = clubDefFor(clubName);
  const league = leagueOf(clubName);
  const objs: BoardObjective[] = [];
  objs.push({
    id: 'league',
    target: club.expectation,
    label: club.expectation === 1 ? `Win the ${league.name}` : `Finish top ${club.expectation}`,
  });
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
  const goalsBase = club.tier === 1 ? 78 : club.tier === 2 ? 70 : club.tier === 3 ? 62 : 50;
  // Round 72: quota scales with the real season length (28 to 46 rounds now).
  const goals = Math.max(30, Math.round(goalsBase * (rounds / 38)));
  objs.push({ id: 'goals', target: goals, label: `Score ${goals}+ league goals` });
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

/** Match-day strength: XI ratings scaled by fitness + morale, plus form. */
function myMatchStrength(state: CareerState, xi: CMPlayer[]): number {
  if (!xi.length) return 40;
  const avg = xi.reduce((s, p) =>
    s + p.rating * (0.8 + 0.2 * (p.fitness / 100)) * (0.94 + 0.06 * (p.morale / 100)), 0) / xi.length;
  const formBonus = state.form.reduce((s, f) => s + (f === 'W' ? 0.7 : f === 'L' ? -0.7 : 0), 0);
  return avg + formBonus;
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

function generateOppScorers(opp: string, goals: number): ScorerLine[] {
  const minutes = Array.from({ length: goals }, () => ri(1, 90)).sort((a, b) => a - b);
  // Round 70: opponent scorers are their real attackers from the baked
  // rosters, weighted toward the expensive ones, so "Semenyo 63'" instead of
  // "Bournemouth No. 9".
  const baked = (CM_ROSTERS[opp] ?? []).filter(p =>
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
function tickWeek(state: CareerState, playedIds: Set<string> | null): void {
  state.squad = state.squad.map(p => {
    const played = playedIds ? playedIds.has(p.id) : false;
    const fitness = clamp(p.fitness + (played ? -(16 + ri(0, 8)) : 24), 15, 100);
    const injuryWeeks = Math.max(0, p.injuryWeeks - 1);
    return { ...p, fitness, injuryWeeks };
  });
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
function playMyMatch(state: CareerState, entry: CalendarEntry): MatchWeekReport {
  const fx = fixtureFor(state, entry)!;
  const club = clubDefFor(state.clubName);
  const isKnockout = fx.competition === 'cup' || fx.competition === 'uclKo';

  const suspendedNow = state.squad.filter(p => p.suspendedMatches > 0).map(p => p.id);
  const xi = effectiveXI(state);
  const mine = myMatchStrength(state, xi);
  const oppS = strengthOf(state, fx.opponent);
  const ment = MENT_MOD[state.mentality] ?? MENT_MOD.balanced;
  const homeAtk = fx.home === true ? 0.28 : fx.home === false ? -0.12 : 0.08;
  const oppAtk = fx.home === true ? -0.12 : fx.home === false ? 0.28 : 0.08;

  let [myGoals, oppGoals] = simScore(mine, oppS, ment.atk + homeAtk, ment.def + oppAtk);

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
  const oppScorers = generateOppScorers(fx.opponent, oppGoals);
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
        state.uclDraw.QF = drawUclKoOpponent(state);
        events.push(`⭐ Through to the Champions League quarter-finals. You'll face ${state.uclDraw.QF}.`);
        confDelta += 3;
      } else {
        state.uclKoRound = 'out';
        state.uclExit = 'group';
        events.push('💤 Out of the Champions League at the group stage.');
        confDelta -= 4;
      }
    }
  }

  if (fx.competition === 'cup') {
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
        state.cupDraw[next] = drawCupOpponent(state);
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
    if (advanced) {
      const i = UCL_ORDER.indexOf(entry.uclRound!);
      if (entry.uclRound === 'F') {
        state.uclKoRound = 'won';
        trophyWon = 'Champions League';
        state.trophies.push({ name: 'Champions League', emoji: '⭐', season: state.season });
        events.push('⭐ CHAMPIONS OF EUROPE!');
        confDelta += 18;
      } else {
        const next = UCL_ORDER[i + 1];
        state.uclKoRound = next;
        state.uclDraw[next] = drawUclKoOpponent(state);
        events.push(`⭐ Into the Champions League ${UCL_LABELS[next].toLowerCase()}. ${state.uclDraw[next]} await.`);
        confDelta += 4;
      }
    } else {
      state.uclKoRound = 'out';
      state.uclExit = entry.uclRound!;
      events.push(`❌ Champions League run ends at the ${UCL_LABELS[entry.uclRound!].toLowerCase()}.`);
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
  const moraleShift = won ? 5 : drawn ? -1 : -6;
  state.squad = state.squad.map(p => ({ ...p, morale: clamp(p.morale + moraleShift, 5, 99) }));

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
    for (const id of promised) {
      if (xiIdSet.has(id)) continue;
      const p = state.squad.find(x => x.id === id);
      if (p && isAvailable(p)) {
        p.morale = clamp(p.morale - 14, 5, 99);
        pushMessage(state, {
          playerName: p.name,
          playerId: p.id,
          kind: 'drama',
          text: `${p.name} sat in the dressing room long after everyone left. You promised him a start. He counted the teamsheet twice.`,
          options: [],
          resolved: 'He will remember this.',
        });
      }
    }
    state.promisedStarts = [];
  }
  generatePlayerMessage(state, xi, won, margin);

  /* ----- board confidence ----- */
  const patience = club.tier === 1 ? 1.3 : club.tier === 2 ? 1.15 : club.tier === 3 ? 1 : 0.85;
  if (confDelta < 0) confDelta *= patience;
  confDelta = Math.round(confDelta * 10) / 10;
  state.boardConfidence = clamp(state.boardConfidence + confDelta, 0, 100);
  if (state.boardConfidence <= 0) {
    state.sacked = true;
    events.push('📉 The board has seen enough. You are relieved of your duties.');
  } else if (state.boardConfidence < 22) {
    events.push('📉 The board is running out of patience. Results, now.');
  }

  tickWeek(state, new Set(xi.map(p => p.id)));
  // Round 71: playing a match shuts the window; live deals and bids die with
  // it (the negotiation table clears, sellers forget grudges by January).
  state.transferWindow = null;
  state.negotiation = null;
  state.incomingBids = [];
  state.coldNames = [];

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

export function startCareer(clubName: string): CareerState {
  // Round 70: any club in the five real leagues is a valid start.
  const club = clubDefFor(clubName);
  const squad = buildSquad(club.name);
  // Owner task 61: the league is the club's REAL league with its real clubs.
  const league = leagueOf(club.name);
  const leagueClubs = shuffle([...league.clubs]);
  const state: CareerState = {
    saveVersion: SAVE_VERSION,
    clubName: club.name,
    season: 1,
    week: 0,
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
    clubStrengths: genClubStrengths(league),
    transferWindow: 'summer',
    aiHeadlines: [],
    goneNames: [],
    seasonSignings: [],
    cupRound: 'R16',
    cupDraw: {},
    // Round 72: only clubs in UCL-eligible leagues start in Europe.
    uclGroup: initUclGroup(club.tier <= 2 && league.euro, club.name),
    uclKoRound: null,
    uclDraw: {},
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
    transferLog: [],
    resultLog: [],
    inbox: [],
    promisedStarts: [],
  };
  state.boardObjectives = buildBoardObjectives(club.name, state.uclGroup !== null, league.clubs.length);
  state.cupDraw.R16 = drawCupOpponent(state);
  state.xiIds = autoPickXI(state.squad, FORMATIONS[state.formationIndex]);
  generateHeadlines(state);
  return state;
}

/**
 * Advances the calendar: skips entries that no longer involve us (cup/UCL
 * ties after elimination), opens the January window, or plays my next match.
 * Never mutates the input state.
 */
export function playNextEntry(career: CareerState): PlayResult {
  const state: CareerState = JSON.parse(JSON.stringify(career));
  while (state.week < state.calendar.length) {
    const entry = state.calendar[state.week];
    if (entry.type === 'window') {
      state.week += 1;
      tickWeek(state, null);
      state.transferWindow = 'january';
      generateHeadlines(state);
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
      }
      state.week += 1;
      tickWeek(state, null);
      continue;
    }
    const report = playMyMatch(state, entry);
    state.week += 1;
    return { state, kind: 'match', report };
  }
  return { state, kind: 'seasonOver' };
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
      offers.push({
        club: s.name,
        blurb: `${TIER_INFO[s.tier].emoji} ${TIER_INFO[s.tier].label} club · ${leagueOf(s.name).name}${abroad ? ' (abroad)' : ''} · ${money(s.budget)} budget · board expects Top ${s.expectation}`,
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

/** One season older: rating drift, fresh legs, wiped season stats. */
function agePlayer(p: CMPlayer): CMPlayer {
  const age = p.age + 1;
  let drift = 0;
  if (age <= 20) drift = ri(1, 3);
  else if (age <= 23) drift = ri(0, 2);
  else if (age >= 33) drift = -ri(1, 3);
  else if (age >= 30) drift = -ri(0, 2);
  // Round 70: market value tracks the rating drift (each rating point is
  // ~20% of value on the curve) and decays for the over-30s.
  let value = p.value;
  if (value !== undefined) {
    value = value * Math.pow(1.2, drift) * (age >= 31 ? 0.85 : 1);
    value = Math.max(0.2, Math.round(value * 10) / 10);
  }
  return {
    ...p,
    age,
    rating: clamp(p.rating + drift, 40, 95),
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
  };
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

  let squad: CMPlayer[];
  // Round 71: loan players go back to their parent clubs at season's end.
  const afterLoans = career.squad.filter(p => !p.onLoan);
  if (moving) {
    squad = buildSquad(clubName);
  } else {
    squad = afterLoans.map(agePlayer).filter(p => p.age < 38 || p.rating >= 70);
    const intake = ri(2, 3);
    for (let i = 0; i < intake; i++) {
      squad.push(makeYouth(pick([...POS_DEF, ...POS_MID, ...POS_ATT, 'GK' as Position])));
    }
    squad = ensureSquadCoverage(squad);
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
    clubStrengths: genClubStrengths(league),
    transferWindow: 'summer',
    aiHeadlines: [],
    goneNames: [],
    seasonSignings: [],
    cupRound: 'R16',
    cupDraw: {},
    uclGroup: initUclGroup(qualifiedUcl, clubName),
    uclKoRound: null,
    uclDraw: {},
    pendingSummary: null,
    cupExit: null,
    uclExit: null,
    negotiation: null,
    incomingBids: [],
    coldNames: [],
    resultLog: [],
    inbox: [],
    promisedStarts: [],
  };
  // Round 71: track every club this manager has run.
  const managed = new Set(state.careerStats.clubsManaged ?? [career.clubName]);
  managed.add(clubName);
  state.careerStats = { ...state.careerStats, clubsManaged: [...managed] };
  state.boardObjectives = buildBoardObjectives(clubName, state.uclGroup !== null, league.clubs.length);
  state.cupDraw.R16 = drawCupOpponent(state);
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


