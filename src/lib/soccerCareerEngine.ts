// Soccer Career Simulation Engine v2 — Youth Academy + Pro System

export interface ClubData {
  id: string;
  name: string;
  country: string;
  tier: number;
  color: string;
  league: string;
}

export interface SeasonRecord {
  year: number;
  age: number;
  club: string;
  clubCountry: string;
  clubTier: number;
  apps: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  yellowCards: number;
  redCards: number;
  rating: number;
  leagueTitle: boolean;
  domesticCup: boolean;
  championsLeague: boolean;
  worldCup: boolean;
  ballonDor: boolean;
  ballonDorRank: number | null; // 1-5 if nominated, null otherwise
  type: "youth" | "playing" | "retired" | "manager";
  // International stats for this season
  intApps: number;
  intGoals: number;
  intAssists: number;
  intRating: number;
  tournament: string | null; // "World Cup", "Continental", or null
  tournamentResult: string | null; // "Winner", "Runner-up", "Semi-final", "Quarter-final", "Group Stage", "Best Player"
}

export interface ContractOffer {
  club: ClubData;
  contractYears: number;
  wage: number; // weekly wage in euros (not thousands)
  transferFee: number; // in millions
  isDreamClub?: boolean;
  isPayCut?: boolean;
}

export type TransferSituation =
  | { type: "no_interest" }
  | { type: "one_offer"; offer: ContractOffer }
  | { type: "bidding_war"; offerA: ContractOffer; offerB: ContractOffer }
  | { type: "dream_club"; offer: ContractOffer }
  | { type: "contract_expiry"; offers: ContractOffer[] }
  | { type: "request_result"; offer: ContractOffer | null };

/* ─── Random Event System ─── */
export interface EventChoice {
  label: string;
  emoji: string;
  color: string; // tailwind bg class
  consequence: string; // human-readable
  apply: (s: CareerState) => CareerState;
}

export interface RandomEvent {
  id: number;
  emoji: string;
  title: string;
  description: string;
  category: "positive" | "negative" | "international" | "life";
  choices: EventChoice[];
}

/* ─── World Cup Types ─── */
export interface WCMatch {
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  playerGoals: number;
  playerAssists: number;
  playerRating: number;
  round: string; // "Group A", "R16", "QF", "SF", "Final"
}

export interface WorldCupResult {
  year: number;
  nation: string;
  matches: WCMatch[];
  playerApps: number;
  playerGoals: number;
  playerAssists: number;
  playerAvgRating: number;
  result: string; // "Winner", "Runner-up", "Semi-final", "Quarter-final", "Group Stage"
  bestPlayer: boolean;
}

/* ─── Ballon d'Or System ─── */
export interface BallonDorNominee {
  name: string;
  nationality: string;
  club: string;
  points: number;
  goals: number;
  trophies: string[];
  isPlayer: boolean;
}

export interface BallonDorResult {
  year: number;
  nominees: BallonDorNominee[];
  playerRank: number | null; // 1-5 if nominated, null if not
  playerPoints: number;
}

/* ─── UCL Knockout Result ─── */
export interface UCLKnockoutMatch {
  opponent: string;
  round: string; // "R16", "QF", "SF", "Final"
  goalsFor: number;
  goalsAgainst: number;
  playerGoals: number;
  won: boolean;
}

export interface UCLResult {
  qualified: boolean;
  matches: UCLKnockoutMatch[];
  result: string; // "Winner", "Final", "Semi-final", "Quarter-final", "R16", "Group Stage", "N/A"
  playerGoals: number;
  isTopScorer: boolean;
}

/* ─── Individual Awards ─── */
export interface Award {
  year: number;
  name: string;
  emoji: string;
}

/* ─── Rivalry System ─── */
export interface RivalPlayer {
  name: string;
  nationality: string;
  position: string;
  club: string;
  clubTier: number;
  overall: number;
  careerGoals: number;
  careerAssists: number;
  careerApps: number;
  leagueTitles: number;
  championsLeagues: number;
  worldCups: number;
  ballonDors: number;
  intCaps: number;
  intGoals: number;
  marketValue: number;
  age: number;
  retired: boolean;
}

export interface RivalryEvent {
  id: number;
  emoji: string;
  title: string;
  description: string;
  consequence: string;
}

export interface RivalrySummary {
  playerWins: number;
  rivalWins: number;
  categories: { label: string; playerVal: string; rivalVal: string; winner: "player" | "rival" | "tie" }[];
  overallWinner: "player" | "rival" | "tie";
  legacyBonus: number;
}

export interface InternationalStats {
  caps: number;
  goals: number;
  assists: number;
  tournaments: number;
  worldCups: number;
  continentals: number;
  worldCupWins: number;
  continentalWins: number;
  isCaptain: boolean;
  isRetired: boolean;
  debutYear: number | null;
  debutAge: number | null;
  worldCupResults: WorldCupResult[];
}

export type LifestyleLevel = "Humble" | "Comfortable" | "Wealthy" | "Superstar" | "Billionaire";

export interface FamilyStatus {
  isMarried: boolean;
  marriedAge: number | null;
  children: number;
  isDivorced: boolean;
  divorceAge: number | null;
}

export interface CareerState {
  playerName: string;
  nationality: string;
  position: string;
  era: string;
  age: number;
  currentClub: string;
  currentClubCountry: string;
  currentClubTier: number;
  currentClubColor: string;
  currentLeague: string;
  contractYearsLeft: number;
  weeklyWage: number;
  marketValue: number;
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
  reflexes: number;
  overall: number;
  seasons: SeasonRecord[];
  events: string[];
  retired: boolean;
  phase: "youth" | "contract_offer" | "playing" | "season_summary" | "transfer_window" | "random_events" | "international_debut" | "world_cup" | "rivalry_event" | "ballon_dor" | "retired";
  pendingOffers: ContractOffer[];
  pendingSummary: SeasonRecord | null;
  transferSituation: TransferSituation | null;
  // Random events
  pendingEvents: RandomEvent[];
  lastEventId: number | null;
  statBoostNextSeason: Partial<Record<"pace"|"shooting"|"passing"|"dribbling"|"defending"|"physical"|"reflexes", number>>;
  internationalCareer: boolean;
  sponsorDeal: string | null;
  totalEarnings: number;
  popularity: number;
  morale: number;
  isLeader: boolean;
  hasRelationship: boolean;
  // International career
  intStats: InternationalStats;
  pendingWorldCup: WorldCupResult | null;
  // Rivalry system
  rival: RivalPlayer | null;
  rivalCreated: boolean;
  pendingRivalryEvent: RivalryEvent | null;
  lastRivalryEventId: number | null;
  rivalrySummary: RivalrySummary | null;
  // Financial & Lifestyle
  netWorth: number;
  lifestyleLevel: LifestyleLevel;
  lifestyleCostPerYear: number;
  socialMediaFollowers: number;
  sponsorshipIncome: number;
  properties: string[];
  investments: string[];
  consecutiveDeficitYears: number;
  agentFeesPaid: number;
  family: FamilyStatus;
  // Ballon d'Or & Awards
  awards: Award[];
  pendingBallonDor: BallonDorResult | null;
  lastUCLResult: UCLResult | null;
}

/* ─── Flags ─── */
const FLAG_MAP: Record<string, string> = {
  "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "Spain": "🇪🇸", "France": "🇫🇷", "Germany": "🇩🇪",
  "Brazil": "🇧🇷", "Argentina": "🇦🇷", "Portugal": "🇵🇹", "Italy": "🇮🇹",
  "Netherlands": "🇳🇱", "USA": "🇺🇸", "Mexico": "🇲🇽", "Japan": "🇯🇵",
  "South Korea": "🇰🇷", "Nigeria": "🇳🇬", "Senegal": "🇸🇳", "Ghana": "🇬🇭",
  "Morocco": "🇲🇦", "Colombia": "🇨🇴", "Uruguay": "🇺🇾", "Belgium": "🇧🇪",
  "Croatia": "🇭🇷", "Denmark": "🇩🇰", "Sweden": "🇸🇪", "Norway": "🇳🇴",
  "Switzerland": "🇨🇭", "Austria": "🇦🇹", "Scotland": "🏴󠁧󠁢󠁳󠁣󠁴󠁿", "Wales": "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
  "Ireland": "🇮🇪", "Poland": "🇵🇱", "Czech Republic": "🇨🇿", "Serbia": "🇷🇸",
  "Romania": "🇷🇴", "Greece": "🇬🇷", "Turkey": "🇹🇷", "Russia": "🇷🇺",
  "Ukraine": "🇺🇦", "Australia": "🇦🇺", "New Zealand": "🇳🇿", "Canada": "🇨🇦",
  "Jamaica": "🇯🇲", "Costa Rica": "🇨🇷", "Ecuador": "🇪🇨", "Peru": "🇵🇪",
  "Chile": "🇨🇱", "Cameroon": "🇨🇲", "Ivory Coast": "🇨🇮", "Egypt": "🇪🇬",
  "Algeria": "🇩🇿", "Tunisia": "🇹🇳",
};
export function getFlag(country: string): string { return FLAG_MAP[country] || "🏳️"; }

/* ─── Helpers ─── */
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const pickN = <T,>(arr: T[], n: number): T[] => {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
};

/* ─── Club helpers ─── */
export function getClubsByTier(clubs: ClubData[], tier: number): ClubData[] {
  return clubs.filter(c => c.tier === tier);
}

function getYouthAcademyClub(clubs: ClubData[], nationality: string): ClubData {
  // Try to find tier 3-4 club from same country
  const homeClubs = clubs.filter(c => c.country === nationality && c.tier >= 3);
  if (homeClubs.length > 0) return pick(homeClubs);
  // Fallback to any tier 4, then tier 3
  const t4 = getClubsByTier(clubs, 4);
  if (t4.length > 0) return pick(t4);
  return pick(getClubsByTier(clubs, 3));
}

export function calcOverall(s: { pace: number; shooting: number; passing: number; dribbling: number; defending: number; physical: number; reflexes: number }, position: string): number {
  if (position === "GK") {
    return Math.round(s.reflexes * 0.3 + s.defending * 0.2 + s.physical * 0.2 + s.pace * 0.1 + s.passing * 0.1 + s.dribbling * 0.05 + s.shooting * 0.05);
  }
  return Math.round((s.pace + s.shooting + s.passing + s.dribbling + s.defending + s.physical) / 6);
}

/* ─── Stat progression per user spec ─── */
function growStat(current: number, age: number, isYouth: boolean, isPace: boolean): number {
  let growth: number;
  if (isYouth) {
    growth = rand(2, 4);
  } else if (age <= 23) {
    growth = rand(1, 4); // Growth phase
  } else if (age <= 29) {
    growth = rand(0, 2); // Peak phase
  } else if (age <= 33) {
    growth = rand(-2, -1); // Decline begins
  } else {
    growth = rand(-4, -2); // Sharp decline
  }
  // Pace always declines 1 extra from age 28+
  if (isPace && age >= 28 && !isYouth) {
    growth -= 1;
  }
  return clamp(current + growth, 20, 99);
}

/* ─── Club average rating by tier ─── */
function clubAverageRating(tier: number): number {
  switch (tier) {
    case 1: return 80;
    case 2: return 72;
    case 3: return 62;
    case 4: return 55;
    default: return 60;
  }
}

/* ─── Market value per user spec (with social media boost) ─── */
function calcMarketValue(overall: number, age: number, position: string, socialMediaFollowers?: number): number {
  // Base from overall (exponential curve)
  let base = Math.pow(Math.max(0, overall - 45), 2.2) * 0.005;

  // Age multiplier — peak at 26-28
  if (age <= 21) base *= 0.8;
  else if (age <= 25) base *= 1.1;
  else if (age <= 28) base *= 1.3; // Peak
  else if (age <= 30) base *= 1.0;
  else if (age <= 33) base *= 0.55;
  else base *= 0.2;

  // Position multiplier
  if (["ST", "CAM", "LW", "RW"].includes(position)) base *= 1.2;
  else if (position === "GK") base *= 0.85;

  // Social media boost: +5% per 10M followers
  if (socialMediaFollowers && socialMediaFollowers > 0) {
    base *= 1 + (socialMediaFollowers / 10) * 0.05;
  }

  return Math.max(0.1, Math.round(base * 10) / 10);
}

/* ─── Financial helpers ─── */
const BIG_NATIONS = ["England", "Spain", "France", "Germany", "Brazil", "Argentina", "USA", "Mexico", "Japan", "Italy"];

function calcLifestyleLevel(netWorth: number): LifestyleLevel {
  if (netWorth >= 500) return "Billionaire";
  if (netWorth >= 50) return "Superstar";
  if (netWorth >= 10) return "Wealthy";
  if (netWorth >= 2) return "Comfortable";
  return "Humble";
}

function calcLifestyleCost(level: LifestyleLevel): number {
  switch (level) {
    case "Billionaire": return 5;
    case "Superstar": return 2;
    case "Wealthy": return 0.8;
    case "Comfortable": return 0.2;
    case "Humble": return 0.05;
  }
}

function calcSponsorshipIncome(popularity: number, socialMediaFollowers: number, sponsorDeal: string | null): number {
  let income = 0;
  // Base sponsorship from popularity
  if (popularity >= 80) income += 2;
  else if (popularity >= 60) income += 1;
  else if (popularity >= 40) income += 0.3;
  // Social media income
  income += socialMediaFollowers * 0.1; // €100k per 1M followers
  // Named sponsor deal
  if (sponsorDeal === "Nike") income += 2;
  else if (sponsorDeal === "Adidas") income += 1.5;
  return Math.round(income * 100) / 100;
}

function growSocialMedia(state: CareerState, season: SeasonRecord): number {
  let growth = 0;
  // Goals contribute
  growth += season.goals * 0.02; // 20k per goal
  // Trophies
  if (season.leagueTitle) growth += 0.5;
  if (season.championsLeague) growth += 1;
  if (season.worldCup) growth += 3;
  if (season.ballonDor) growth += 5;
  // Big nation bonus
  if (BIG_NATIONS.includes(state.nationality)) growth *= 1.5;
  // Base organic growth from fame
  growth += state.popularity * 0.005;
  // Random viral moment
  if (Math.random() < 0.05) growth += rand(1, 5);
  return Math.round(growth * 100) / 100;
}

function simulateSeasonFinances(s: CareerState, season: SeasonRecord): void {
  // Wage income (52 weeks, in millions)
  const wageIncome = (s.weeklyWage * 52) / 1_000_000;
  // Sponsorship income
  s.sponsorshipIncome = calcSponsorshipIncome(s.popularity, s.socialMediaFollowers, s.sponsorDeal);
  const totalIncome = wageIncome + s.sponsorshipIncome;
  // Lifestyle cost
  s.lifestyleLevel = calcLifestyleLevel(s.netWorth);
  s.lifestyleCostPerYear = calcLifestyleCost(s.lifestyleLevel);
  // Net
  const netThisYear = totalIncome - s.lifestyleCostPerYear;
  s.netWorth = Math.round((s.netWorth + netThisYear) * 100) / 100;
  s.totalEarnings = Math.round((s.totalEarnings + totalIncome) * 100) / 100;
  // Social media
  const smGrowth = growSocialMedia(s, season);
  s.socialMediaFollowers = Math.round((s.socialMediaFollowers + smGrowth) * 100) / 100;
  // Deficit tracking
  if (netThisYear < 0) {
    s.consecutiveDeficitYears += 1;
  } else {
    s.consecutiveDeficitYears = 0;
  }
  // Financial crisis
  if (s.consecutiveDeficitYears >= 3) {
    s.events.push("💸 FINANCIAL CRISIS — Spending exceeds income for 3 years! Forced to sell assets.");
    s.netWorth = Math.max(0, s.netWorth);
    s.lifestyleLevel = "Humble";
    s.lifestyleCostPerYear = 0.05;
    s.properties = [];
    s.consecutiveDeficitYears = 0;
    s.morale = clamp(s.morale - 20, 0, 100);
  }
  // Family life events
  simulateFamilyLife(s);
}

function simulateFamilyLife(s: CareerState): void {
  // Marriage
  if (s.hasRelationship && !s.family.isMarried && !s.family.isDivorced && s.age >= 22 && s.age <= 28 && Math.random() < 0.25) {
    s.family = { ...s.family, isMarried: true, marriedAge: s.age };
    s.morale = clamp(s.morale + 5, 0, 100);
    s.events.push("💍 Got married! Permanent morale boost.");
    s.netWorth -= 0.5; // Wedding cost
  }
  // Children
  if (s.family.isMarried && !s.family.isDivorced && s.family.children < 3 && Math.random() < 0.2) {
    s.family = { ...s.family, children: s.family.children + 1 };
    s.morale = clamp(s.morale + 3, 0, 100);
    s.socialMediaFollowers += 0.5;
    s.events.push(`👶 Had a child! (${s.family.children} total) Morale +3`);
  }
  // Divorce risk: 15% if morale low
  if (s.family.isMarried && !s.family.isDivorced && s.morale < 40 && Math.random() < 0.15) {
    s.family = { ...s.family, isDivorced: true, isMarried: false, divorceAge: s.age };
    s.netWorth = Math.max(0, s.netWorth - 3);
    s.morale = clamp(s.morale - 15, 0, 100);
    s.statBoostNextSeason = { ...s.statBoostNextSeason, shooting: (s.statBoostNextSeason.shooting || 0) - 2, dribbling: (s.statBoostNextSeason.dribbling || 0) - 2 };
    s.events.push("💔 Divorce! Settlement costs €3M. Performance dip next season.");
  }
}

export function formatNetWorth(nw: number): string {
  if (nw >= 1000) return `€${(nw / 1000).toFixed(1)}B`;
  if (nw >= 1) return `€${nw.toFixed(1)}M`;
  return `€${Math.round(nw * 1000)}k`;
}

export function formatFollowers(m: number): string {
  if (m >= 100) return `${m.toFixed(0)}M`;
  if (m >= 1) return `${m.toFixed(1)}M`;
  if (m >= 0.01) return `${Math.round(m * 1000)}k`;
  return `${Math.round(m * 1000)}`;
}

/* ─── Appearances per user spec ─── */
function calcAppearances(overall: number, clubTier: number, age: number): { apps: number; injured: boolean; injuryWeeks: number } {
  const clubAvg = clubAverageRating(clubTier);
  const diff = overall - clubAvg;

  let baseMin: number, baseMax: number;
  if (diff >= 15) { baseMin = 30; baseMax = 38; }
  else if (diff >= 5) { baseMin = 25; baseMax = 32; }
  else if (diff >= -5) { baseMin = 18; baseMax = 28; }
  else { baseMin = 8; baseMax = 18; }

  let apps = rand(baseMin, baseMax);

  // 20% injury chance
  let injured = false;
  let injuryWeeks = 0;
  if (Math.random() < 0.20) {
    injured = true;
    injuryWeeks = rand(2, 8);
    const missedApps = Math.round(injuryWeeks * 38 / 46); // ~38 apps in 46 weeks
    apps = Math.max(1, apps - clamp(missedApps, 0, 8));
  }

  return { apps, injured, injuryWeeks };
}

/* ─── Goals per 38 apps by position ─── */
function calcGoals(position: string, apps: number): number {
  const per38: Record<string, [number, number]> = {
    ST: [15, 28], LW: [8, 18], RW: [8, 18], CAM: [6, 14],
    CM: [3, 8], CDM: [1, 4], CB: [0, 3], LB: [0, 3], RB: [0, 3], GK: [0, 0],
  };
  const [lo, hi] = per38[position] || [0, 3];
  return Math.max(0, Math.round(rand(lo, hi) * apps / 38));
}

/* ─── Assists per 38 apps by position ─── */
function calcAssists(position: string, apps: number): number {
  const per38: Record<string, [number, number]> = {
    CAM: [10, 18], LW: [8, 15], RW: [8, 15], CM: [5, 10],
    ST: [3, 8], CDM: [2, 6], CB: [1, 4], LB: [1, 4], RB: [1, 4], GK: [0, 0],
  };
  const [lo, hi] = per38[position] || [1, 4];
  return Math.max(0, Math.round(rand(lo, hi) * apps / 38));
}

/* ─── Season rating 1-10 ─── */
function calcSeasonRating(position: string, apps: number, goals: number, assists: number, cleanSheets: number, overall: number, clubTier: number): number {
  const clubAvg = clubAverageRating(clubTier);
  const diff = overall - clubAvg;

  // Base rating from overall advantage
  let base = 6.0 + diff * 0.06;

  // Bonus from output
  if (position === "GK") {
    base += cleanSheets * 0.08;
  } else if (["ST", "LW", "RW", "CAM"].includes(position)) {
    base += goals * 0.04 + assists * 0.03;
  } else {
    base += goals * 0.06 + assists * 0.04;
  }

  // Apps bonus/penalty
  if (apps >= 30) base += 0.3;
  else if (apps < 15) base -= 0.4;

  // Random variance
  base += (Math.random() - 0.5) * 0.8;

  return clamp(parseFloat(base.toFixed(1)), 3.0, 10.0);
}

/* ─── Season simulation ─── */
function generateSeasonStats(state: CareerState): SeasonRecord {
  const { position, age, overall, currentClubTier } = state;
  const isGK = position === "GK";
  const lastYear = state.seasons.length > 0 ? state.seasons[state.seasons.length - 1].year : 0;

  // Appearances
  const { apps, injured, injuryWeeks } = calcAppearances(overall, currentClubTier, age);

  // Goals & assists
  const goals = calcGoals(position, apps);
  const assists = calcAssists(position, apps);
  const cleanSheets = isGK ? Math.round(apps * rand(20, 45) / 100) : 0;

  const yellowCards = rand(0, Math.min(8, Math.round(apps * 0.25)));
  const redCards = Math.random() < 0.08 ? 1 : 0;

  const rating = calcSeasonRating(position, apps, goals, assists, cleanSheets, overall, currentClubTier);

  // Trophies — proper simulation
  const leagueChance = currentClubTier === 1 ? (overall >= 85 ? 0.35 : overall >= 78 ? 0.20 : 0.10) :
                        currentClubTier === 2 ? (overall >= 78 ? 0.25 : 0.15) : 0;
  const winLeague = Math.random() < leagueChance;
  const cupChance = currentClubTier === 1 ? 0.25 : currentClubTier === 2 ? 0.20 : currentClubTier === 3 ? 0.15 : 0;
  const winCup = Math.random() < cupChance;
  // UCL and WC/BdO are handled separately in advanceProSeason now
  const isWCYear = (lastYear + 1) % 4 === 2;

  return {
    year: lastYear + 1, age,
    club: state.currentClub, clubCountry: state.currentClubCountry, clubTier: currentClubTier,
    apps, goals, assists, cleanSheets, yellowCards, redCards, rating,
    leagueTitle: winLeague, domesticCup: winCup, championsLeague: false, worldCup: false, ballonDor: false, ballonDorRank: null,
    type: "playing",
    intApps: 0, intGoals: 0, intAssists: 0, intRating: 0, tournament: null, tournamentResult: null,
  };
}

/* ─── Wage by tier (euros per week) ─── */
function wageForTier(tier: number, overall: number): number {
  if (tier === 1 && overall >= 86) return rand(200000, 600000);
  switch (tier) {
    case 1: return rand(50000, 300000);
    case 2: return rand(10000, 50000);
    case 3: return rand(2000, 10000);
    case 4: return rand(500, 2000);
    default: return rand(1000, 5000);
  }
}

export function formatWage(wage: number): string {
  if (wage >= 1000) return `€${(wage / 1000).toFixed(0)}k/wk`;
  return `€${wage}/wk`;
}

/* ─── Generate initial contract offers (age 17) ─── */
export function generateContractOffers(clubs: ClubData[], overall: number, age: number): ContractOffer[] {
  let targetTiers: number[];
  if (overall >= 66) targetTiers = [2, 2, 3];
  else if (overall >= 56) targetTiers = [3, 3, 3];
  else targetTiers = [3, 4, 4];

  const offers: ContractOffer[] = [];
  const usedNames = new Set<string>();
  for (const tier of targetTiers) {
    const candidates = getClubsByTier(clubs, tier).filter(c => !usedNames.has(c.name));
    if (candidates.length === 0) continue;
    const club = pick(candidates);
    usedNames.add(club.name);
    offers.push({ club, contractYears: rand(2, 4), wage: wageForTier(tier, overall), transferFee: 0 });
  }
  return offers;
}

/* ─── Interested tiers by rating ─── */
function getInterestedTiers(overall: number): number[] {
  if (overall >= 86) return [1];
  if (overall >= 76) return [1, 2];
  if (overall >= 66) return [2, 3];
  return [3, 4];
}

/* ─── Make a single offer ─── */
function makeOffer(clubs: ClubData[], tier: number, overall: number, age: number, exclude: Set<string>, marketValue: number, isDream = false): ContractOffer | null {
  const candidates = getClubsByTier(clubs, tier).filter(c => !exclude.has(c.name));
  if (candidates.length === 0) return null;
  const club = pick(candidates);
  exclude.add(club.name);
  let wage = wageForTier(tier, overall);
  if (isDream) wage = Math.round(wage * 0.65);
  return { club, contractYears: rand(1, 5), wage, transferFee: Math.round(marketValue * rand(70, 110) / 100 * 10) / 10, isDreamClub: isDream, isPayCut: isDream };
}

/* ─── Determine transfer situation ─── */
export function determineTransferSituation(state: CareerState, clubs: ClubData[]): TransferSituation {
  const { overall, age, currentClub, currentClubTier, marketValue, contractYearsLeft } = state;
  const lastSeason = state.seasons[state.seasons.length - 1];
  const exclude = new Set<string>([currentClub]);
  const interestedTiers = getInterestedTiers(overall);

  if (contractYearsLeft <= 1) {
    const offers: ContractOffer[] = [];
    for (let i = 0; i < rand(2, 4); i++) {
      const offer = makeOffer(clubs, pick(interestedTiers), overall, age, exclude, 0);
      if (offer) { offer.transferFee = 0; offer.wage = Math.round(offer.wage * 0.85); offers.push(offer); }
    }
    return { type: "contract_expiry", offers };
  }

  const aboveLevel = overall - clubAverageRating(currentClubTier);
  const lastRating = lastSeason?.rating ?? 6;

  if (aboveLevel >= 10 && lastRating >= 7.5 && Math.random() < 0.30) {
    const offerA = makeOffer(clubs, pick(interestedTiers), overall, age, exclude, marketValue);
    const offerB = makeOffer(clubs, pick(interestedTiers), overall, age, exclude, marketValue);
    if (offerA && offerB) return { type: "bidding_war", offerA, offerB };
  }

  if (overall >= 75 && Math.abs(overall - 80) <= 5 && currentClubTier > 1 && Math.random() < 0.15) {
    const dreamOffer = makeOffer(clubs, 1, overall, age, exclude, marketValue, true);
    if (dreamOffer) return { type: "dream_club", offer: dreamOffer };
  }

  const interestChance = aboveLevel >= 15 ? 0.7 : aboveLevel >= 5 ? 0.5 : aboveLevel >= 0 ? 0.3 : 0.1;
  if (Math.random() < interestChance) {
    const offer = makeOffer(clubs, pick(interestedTiers), overall, age, exclude, marketValue);
    if (offer) return { type: "one_offer", offer };
  }

  return { type: "no_interest" };
}

/* ─── Request transfer — 50/50 ─── */
export function requestTransfer(state: CareerState, clubs: ClubData[]): TransferSituation {
  if (Math.random() < 0.5) {
    const exclude = new Set<string>([state.currentClub]);
    const offer = makeOffer(clubs, pick(getInterestedTiers(state.overall)), state.overall, state.age, exclude, state.marketValue);
    return { type: "request_result", offer };
  }
  return { type: "request_result", offer: null };
}

/* ─── Init career ─── */
export function initCareer(
  playerName: string, nationality: string, position: string, era: string,
  stats: { pace: number; shooting: number; passing: number; dribbling: number; defending: number; physical: number; reflexes: number },
  overall: number, startYear: number, clubs: ClubData[],
): CareerState {
  const academyClub = getYouthAcademyClub(clubs, nationality);
  return {
    playerName, nationality, position, era, age: 16,
    currentClub: `${academyClub.name} Youth`, currentClubCountry: academyClub.country,
    currentClubTier: academyClub.tier, currentClubColor: academyClub.color, currentLeague: academyClub.league,
    contractYearsLeft: 2, weeklyWage: 500, marketValue: 0.1, ...stats, overall,
    seasons: [{
      year: startYear, age: 16, club: `${academyClub.name} Youth`, clubCountry: academyClub.country, clubTier: academyClub.tier,
      apps: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0, rating: 0,
      leagueTitle: false, domesticCup: false, championsLeague: false, worldCup: false, ballonDor: false, ballonDorRank: null, type: "youth",
      intApps: 0, intGoals: 0, intAssists: 0, intRating: 0, tournament: null, tournamentResult: null,
    }],
    events: [`📋 Joined ${academyClub.name} Youth Academy aged 16`],
    retired: false, phase: "youth", pendingOffers: [], pendingSummary: null, transferSituation: null,
    pendingEvents: [], lastEventId: null, statBoostNextSeason: {},
    internationalCareer: false, sponsorDeal: null, totalEarnings: 0,
    popularity: 10, morale: 70, isLeader: false, hasRelationship: false,
    intStats: {
      caps: 0, goals: 0, assists: 0, tournaments: 0, worldCups: 0, continentals: 0,
      worldCupWins: 0, continentalWins: 0, isCaptain: false, isRetired: false,
      debutYear: null, debutAge: null, worldCupResults: [],
    },
    pendingWorldCup: null,
    rival: null, rivalCreated: false, pendingRivalryEvent: null, lastRivalryEventId: null, rivalrySummary: null,
    netWorth: 0, lifestyleLevel: "Humble" as LifestyleLevel, lifestyleCostPerYear: 0.02,
    socialMediaFollowers: 0, sponsorshipIncome: 0, properties: [], investments: [],
    consecutiveDeficitYears: 0, agentFeesPaid: 0,
    family: { isMarried: false, marriedAge: null, children: 0, isDivorced: false, divorceAge: null },
    awards: [],
    pendingBallonDor: null,
    lastUCLResult: null,
  };
}

/* ─── Advance youth year ─── */
export function advanceYouthYear(prev: CareerState, clubs: ClubData[]): CareerState {
  const s = { ...prev }; s.age += 1; s.events = [];
  s.pace = growStat(s.pace, s.age, true, true);
  s.shooting = growStat(s.shooting, s.age, true, false);
  s.passing = growStat(s.passing, s.age, true, false);
  s.dribbling = growStat(s.dribbling, s.age, true, false);
  s.defending = growStat(s.defending, s.age, true, false);
  s.physical = growStat(s.physical, s.age, true, false);
  s.reflexes = growStat(s.reflexes, s.age, true, false);
  s.overall = calcOverall(s, s.position);
  const lastYear = s.seasons[s.seasons.length - 1].year;
  s.seasons = [...s.seasons, {
    year: lastYear + 1, age: s.age, club: s.currentClub, clubCountry: s.currentClubCountry, clubTier: s.currentClubTier,
    apps: rand(10, 25), goals: s.position === "GK" ? 0 : rand(0, 8), assists: rand(0, 5),
    cleanSheets: s.position === "GK" ? rand(2, 8) : 0, yellowCards: rand(0, 4), redCards: 0, rating: 0,
    leagueTitle: false, domesticCup: false, championsLeague: false, worldCup: false, ballonDor: false, ballonDorRank: null, type: "youth",
    intApps: 0, intGoals: 0, intAssists: 0, intRating: 0, tournament: null, tournamentResult: null,
  }];
  s.events.push(`📈 Stats improved during youth development (OVR ${s.overall})`);
  if (s.age >= 17) {
    s.events.push("📩 Professional contract offers received!");
    s.pendingOffers = generateContractOffers(clubs, s.overall, s.age);
    s.phase = "contract_offer";
  }
  s.marketValue = calcMarketValue(s.overall, s.age, s.position);
  return s;
}

/* ─── Accept contract offer ─── */
export function acceptOffer(prev: CareerState, offer: ContractOffer): CareerState {
  const s = { ...prev };
  s.currentClub = offer.club.name; s.currentClubCountry = offer.club.country;
  s.currentClubTier = offer.club.tier; s.currentClubColor = offer.club.color; s.currentLeague = offer.club.league;
  s.contractYearsLeft = offer.contractYears; s.weeklyWage = offer.wage;
  s.phase = "playing"; s.pendingOffers = []; s.transferSituation = null;
  // Agent fee: 10% of transfer fee
  if (offer.transferFee > 0) {
    const agentFee = Math.round(offer.transferFee * 0.1 * 100) / 100;
    s.agentFeesPaid = Math.round((s.agentFeesPaid + agentFee) * 100) / 100;
    s.events = [`✍️ Signed with ${offer.club.name} ${getFlag(offer.club.country)} (${offer.contractYears}yr, ${formatWage(offer.wage)}) · Agent fee: €${agentFee.toFixed(1)}M`];
  } else {
    s.events = [`✍️ Signed with ${offer.club.name} ${getFlag(offer.club.country)} (${offer.contractYears}yr, ${formatWage(offer.wage)})`];
  }
  return s;
}

/* ─── Nation strength tiers for World Cup ─── */
const TOP_SEEDS = ["Brazil", "Argentina", "France", "Spain", "Germany"];
const STRONG_NATIONS = ["England", "Portugal", "Italy", "Netherlands", "Belgium", "Croatia", "Uruguay"];
const MID_NATIONS = ["Denmark", "Switzerland", "Colombia", "Mexico", "USA", "Japan", "South Korea", "Senegal", "Morocco", "Poland", "Austria", "Sweden", "Turkey", "Nigeria", "Ukraine"];
const WEAK_NATIONS = ["Ghana", "Cameroon", "Ecuador", "Peru", "Chile", "Norway", "Scotland", "Wales", "Ireland", "Czech Republic", "Serbia", "Romania", "Greece", "Russia", "Australia", "New Zealand", "Canada", "Jamaica", "Costa Rica", "Ivory Coast", "Egypt", "Algeria", "Tunisia"];

function getNationStrength(nation: string): number {
  if (TOP_SEEDS.includes(nation)) return rand(85, 92);
  if (STRONG_NATIONS.includes(nation)) return rand(78, 86);
  if (MID_NATIONS.includes(nation)) return rand(70, 80);
  return rand(60, 72);
}

const ALL_WC_NATIONS = [...TOP_SEEDS, ...STRONG_NATIONS, ...MID_NATIONS, ...WEAK_NATIONS];

function get32WCTeams(playerNation: string): string[] {
  // Player's nation always qualifies
  const teams = [playerNation];
  const pool = ALL_WC_NATIONS.filter(n => n !== playerNation);
  // Weighted selection: stronger nations more likely
  const weighted = pool.map(n => ({ n, w: getNationStrength(n) + rand(0, 15) }))
    .sort((a, b) => b.w - a.w).slice(0, 31).map(x => x.n);
  teams.push(...weighted);
  return teams.slice(0, 32);
}

function simulateMatch(teamA: string, teamB: string, strA: number, strB: number, isKnockout: boolean): { scoreA: number; scoreB: number } {
  const diff = (strA - strB) / 100;
  const baseA = 1.2 + diff * 2;
  const baseB = 1.2 - diff * 2;
  let scoreA = Math.max(0, Math.round(baseA + (Math.random() - 0.4) * 2));
  let scoreB = Math.max(0, Math.round(baseB + (Math.random() - 0.4) * 2));
  if (isKnockout && scoreA === scoreB) {
    // Penalties — 50/50 weighted by strength
    if (Math.random() < 0.5 + diff * 0.15) scoreA += 1;
    else scoreB += 1;
  }
  return { scoreA, scoreB };
}

function playerMatchStats(overall: number, position: string, isWinner: boolean): { goals: number; assists: number; rating: number } {
  const isAttacker = ["ST", "CAM", "LW", "RW"].includes(position);
  const isMid = ["CM", "CDM"].includes(position);
  const bonus = isWinner ? 0.3 : 0;
  let goals = 0, assists = 0;
  if (isAttacker) {
    goals = Math.random() < (0.3 + overall / 300) ? rand(1, 2) : 0;
    assists = Math.random() < 0.25 ? 1 : 0;
  } else if (isMid) {
    goals = Math.random() < 0.12 ? 1 : 0;
    assists = Math.random() < 0.3 ? 1 : 0;
  } else if (position === "GK") {
    goals = 0; assists = 0;
  } else {
    goals = Math.random() < 0.08 ? 1 : 0;
    assists = Math.random() < 0.15 ? 1 : 0;
  }
  const rating = clamp(parseFloat((6.0 + (overall - 70) * 0.05 + bonus + (Math.random() - 0.3) * 1.5 + goals * 0.5 + assists * 0.3).toFixed(1)), 4.0, 10.0);
  return { goals, assists, rating };
}

/* ─── Simulate full World Cup tournament ─── */
export function simulateWorldCup(state: CareerState): WorldCupResult {
  const nation = state.nationality;
  const teams = get32WCTeams(nation);
  const strengths: Record<string, number> = {};
  teams.forEach(t => strengths[t] = getNationStrength(t));
  // Player boosts own nation
  strengths[nation] = Math.min(95, strengths[nation] + Math.round((state.overall - 75) * 0.3));

  // Group stage: 8 groups of 4
  const shuffled = [...teams].sort(() => Math.random() - 0.5);
  const groups: string[][] = [];
  for (let i = 0; i < 8; i++) groups.push(shuffled.slice(i * 4, i * 4 + 4));

  const matches: WCMatch[] = [];
  const groupPoints: Record<string, number> = {};
  teams.forEach(t => groupPoints[t] = 0);

  // Find player's group
  const playerGroupIdx = groups.findIndex(g => g.includes(nation));
  const playerGroup = groups[playerGroupIdx];

  // Simulate group stage
  for (const group of groups) {
    const groupLabel = `Group ${String.fromCharCode(65 + groups.indexOf(group))}`;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const { scoreA, scoreB } = simulateMatch(group[i], group[j], strengths[group[i]], strengths[group[j]], false);
        const isPlayerMatch = group === playerGroup && (group[i] === nation || group[j] === nation);
        const playerWon = isPlayerMatch && ((group[i] === nation && scoreA > scoreB) || (group[j] === nation && scoreB > scoreA));
        const ps = isPlayerMatch ? playerMatchStats(state.overall, state.position, playerWon) : { goals: 0, assists: 0, rating: 0 };
        if (isPlayerMatch) {
          matches.push({
            teamA: group[i], teamB: group[j], scoreA, scoreB,
            playerGoals: ps.goals, playerAssists: ps.assists, playerRating: ps.rating, round: groupLabel,
          });
        }
        if (scoreA > scoreB) { groupPoints[group[i]] += 3; }
        else if (scoreA < scoreB) { groupPoints[group[j]] += 3; }
        else { groupPoints[group[i]] += 1; groupPoints[group[j]] += 1; }
      }
    }
  }

  // Top 2 from each group advance
  const r16Teams: string[] = [];
  for (const group of groups) {
    const sorted = [...group].sort((a, b) => groupPoints[b] - groupPoints[a] || Math.random() - 0.5);
    r16Teams.push(sorted[0], sorted[1]);
  }

  if (!r16Teams.includes(nation)) {
    const totalApps = matches.length;
    const totalGoals = matches.reduce((s, m) => s + m.playerGoals, 0);
    const totalAssists = matches.reduce((s, m) => s + m.playerAssists, 0);
    const avgRating = totalApps > 0 ? parseFloat((matches.reduce((s, m) => s + m.playerRating, 0) / totalApps).toFixed(1)) : 0;
    return {
      year: state.seasons[state.seasons.length - 1]?.year + 1 || 2022,
      nation, matches, playerApps: totalApps, playerGoals: totalGoals, playerAssists: totalAssists,
      playerAvgRating: avgRating, result: "Group Stage", bestPlayer: false,
    };
  }

  // Knockout rounds
  const roundNames = ["R16", "QF", "SF", "Final"];
  let currentTeams = [...r16Teams];

  for (let roundIdx = 0; roundIdx < 4; roundIdx++) {
    const roundName = roundNames[roundIdx];
    const nextRound: string[] = [];
    for (let i = 0; i < currentTeams.length; i += 2) {
      const tA = currentTeams[i], tB = currentTeams[i + 1];
      if (!tA || !tB) { if (tA) nextRound.push(tA); continue; }
      const { scoreA, scoreB } = simulateMatch(tA, tB, strengths[tA] || 70, strengths[tB] || 70, true);
      const isPlayerMatch = tA === nation || tB === nation;
      const playerWon = isPlayerMatch && ((tA === nation && scoreA > scoreB) || (tB === nation && scoreB > scoreA));
      if (isPlayerMatch) {
        const ps = playerMatchStats(state.overall, state.position, playerWon);
        matches.push({ teamA: tA, teamB: tB, scoreA, scoreB, playerGoals: ps.goals, playerAssists: ps.assists, playerRating: ps.rating, round: roundName });
      }
      nextRound.push(scoreA > scoreB ? tA : tB);
    }
    currentTeams = nextRound;

    // Check if player eliminated
    if (!currentTeams.includes(nation) && roundIdx < 3) {
      const resultMap: Record<string, string> = { "R16": "Round of 16", "QF": "Quarter-final", "SF": "Semi-final" };
      const totalApps = matches.length;
      const totalGoals = matches.reduce((s, m) => s + m.playerGoals, 0);
      const totalAssists = matches.reduce((s, m) => s + m.playerAssists, 0);
      const avgRating = totalApps > 0 ? parseFloat((matches.reduce((s, m) => s + m.playerRating, 0) / totalApps).toFixed(1)) : 0;
      return {
        year: state.seasons[state.seasons.length - 1]?.year + 1 || 2022,
        nation, matches, playerApps: totalApps, playerGoals: totalGoals, playerAssists: totalAssists,
        playerAvgRating: avgRating, result: resultMap[roundName] || roundName, bestPlayer: false,
      };
    }
  }

  // Final result
  const won = currentTeams[0] === nation;
  const totalApps = matches.length;
  const totalGoals = matches.reduce((s, m) => s + m.playerGoals, 0);
  const totalAssists = matches.reduce((s, m) => s + m.playerAssists, 0);
  const avgRating = totalApps > 0 ? parseFloat((matches.reduce((s, m) => s + m.playerRating, 0) / totalApps).toFixed(1)) : 0;
  const bestPlayer = avgRating >= 7.5 && totalGoals >= 3;

  return {
    year: state.seasons[state.seasons.length - 1]?.year + 1 || 2022,
    nation, matches, playerApps: totalApps, playerGoals: totalGoals, playerAssists: totalAssists,
    playerAvgRating: avgRating, result: won ? "Winner" : "Runner-up", bestPlayer,
  };
}

/* ─── International call-up check ─── */
function shouldGetCallUp(state: CareerState): boolean {
  if (state.intStats.isRetired) return false;
  if (state.age < 18 || state.age > 33) return false;
  const threshold = state.currentClubTier <= 2 ? 70 : 72;
  return state.overall >= threshold;
}

/* ─── International season stats ─── */
function generateIntSeasonStats(state: CareerState, year: number): { intApps: number; intGoals: number; intAssists: number; intRating: number; tournament: string | null; tournamentResult: string | null } {
  if (!state.internationalCareer || state.intStats.isRetired) {
    return { intApps: 0, intGoals: 0, intAssists: 0, intRating: 0, tournament: null, tournamentResult: null };
  }
  const apps = rand(6, 10);
  const goals = calcGoals(state.position, apps);
  const assists = calcAssists(state.position, apps);
  const rating = clamp(parseFloat((6.5 + (state.overall - 72) * 0.06 + (Math.random() - 0.3) * 1.0).toFixed(1)), 4.0, 10.0);

  // Tournament detection
  const isWCYear = year % 4 === 2; // 2022, 2026, 2030...
  const isContinental = year % 2 === 0 && !isWCYear; // even non-WC years
  let tournament: string | null = null;
  let tournamentResult: string | null = null;

  if (isContinental) {
    tournament = "Continental Championship";
    const nationStr = getNationStrength(state.nationality);
    if (Math.random() < 0.08 + (nationStr - 70) * 0.005) {
      tournamentResult = "Winner";
    } else if (Math.random() < 0.15) {
      tournamentResult = "Semi-final";
    } else {
      tournamentResult = Math.random() < 0.5 ? "Quarter-final" : "Group Stage";
    }
  }
  // WC handled separately via simulateWorldCup

  return { intApps: apps, intGoals: goals, intAssists: assists, intRating: rating, tournament, tournamentResult };
}

/* ─── Advance pro season ─── */
export function advanceProSeason(prev: CareerState, clubs: ClubData[]): CareerState {
  const s = { ...prev }; s.age += 1; s.events = [];
  if (s.age >= 38 || (s.overall < 60 && s.age >= 30)) {
    s.retired = true; s.phase = "retired";
    s.events.push("👋 Announced retirement from professional football");
    const lastYear = s.seasons[s.seasons.length - 1].year;
    s.seasons = [...s.seasons, {
      year: lastYear + 1, age: s.age, club: s.currentClub, clubCountry: s.currentClubCountry, clubTier: s.currentClubTier,
      apps: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0, rating: 0,
      leagueTitle: false, championsLeague: false, worldCup: false, ballonDor: false, type: "retired",
      intApps: 0, intGoals: 0, intAssists: 0, intRating: 0, tournament: null, tournamentResult: null,
    }];
    if (s.rival) s.rivalrySummary = generateRivalrySummary(s);
    return s;
  }
  const season = generateSeasonStats(s);
  // Apply stat boosts from previous season's events
  for (const [key, val] of Object.entries(s.statBoostNextSeason)) {
    const k = key as keyof typeof s.statBoostNextSeason;
    if (k in s) (s as any)[k] = clamp((s as any)[k] + (val || 0), 20, 99);
  }
  s.statBoostNextSeason = {};
  s.pace = growStat(s.pace, s.age, false, true);
  s.shooting = growStat(s.shooting, s.age, false, false);
  s.passing = growStat(s.passing, s.age, false, false);
  s.dribbling = growStat(s.dribbling, s.age, false, false);
  s.defending = growStat(s.defending, s.age, false, false);
  s.physical = growStat(s.physical, s.age, false, false);
  s.reflexes = growStat(s.reflexes, s.age, false, false);
  s.overall = calcOverall(s, s.position);
  s.contractYearsLeft = Math.max(0, s.contractYearsLeft - 1);
  s.marketValue = calcMarketValue(s.overall, s.age, s.position, s.socialMediaFollowers);

  // International career check — first call-up
  if (!s.internationalCareer && !s.intStats.isRetired && shouldGetCallUp(s)) {
    s.internationalCareer = true;
    s.intStats = { ...s.intStats, debutYear: season.year, debutAge: s.age };
    // Don't set phase yet — show in season summary, debut screen comes after
  }

  // International season stats
  const lastYear = s.seasons.length > 0 ? s.seasons[s.seasons.length - 1].year : season.year - 1;
  const thisYear = lastYear + 1;
  const isWCYear = thisYear % 4 === 2;
  const intSeason = generateIntSeasonStats(s, thisYear);

  // Update international totals
  if (intSeason.intApps > 0) {
    s.intStats = { ...s.intStats,
      caps: s.intStats.caps + intSeason.intApps,
      goals: s.intStats.goals + intSeason.intGoals,
      assists: s.intStats.assists + intSeason.intAssists,
    };
    // Captain check: 30+ caps and overall 80+
    if (!s.intStats.isCaptain && s.intStats.caps >= 30 && s.overall >= 80 && Math.random() < 0.25) {
      s.intStats = { ...s.intStats, isCaptain: true };
      s.events.push(`©️ Named captain of ${s.nationality}! Legacy +15`);
      s.popularity = clamp(s.popularity + 15, 0, 100);
    }
    // Continental tournament
    if (intSeason.tournament && intSeason.tournamentResult) {
      s.intStats = { ...s.intStats, tournaments: s.intStats.tournaments + 1, continentals: s.intStats.continentals + 1 };
      if (intSeason.tournamentResult === "Winner") {
        s.intStats = { ...s.intStats, continentalWins: s.intStats.continentalWins + 1 };
        s.events.push(`🏆 Won the Continental Championship with ${s.nationality}!`);
      }
    }
    // 100 caps milestone
    const prevCaps = s.intStats.caps - intSeason.intApps;
    if (s.intStats.caps >= 100 && prevCaps < 100) {
      s.events.push(`🎖️ INTERNATIONAL LEGEND — reached 100 caps for ${s.nationality}!`);
    }
  }

  // Merge international stats into season record
  season.intApps = intSeason.intApps;
  season.intGoals = intSeason.intGoals;
  season.intAssists = intSeason.intAssists;
  season.intRating = intSeason.intRating;
  season.tournament = intSeason.tournament;
  season.tournamentResult = intSeason.tournamentResult;

  // Rival system: create rival at age 19-21
  if (!s.rivalCreated && s.age >= 19 && s.age <= 21 && Math.random() < 0.6) {
    s.rival = createRival(s, clubs);
    s.rivalCreated = true;
    s.events.push(`😤 A new rival emerges: ${s.rival.name} (${getFlag(s.rival.nationality)} ${s.rival.nationality})`);
  } else if (!s.rivalCreated && s.age === 21) {
    // Force creation at 21 if not yet created
    s.rival = createRival(s, clubs);
    s.rivalCreated = true;
    s.events.push(`😤 A new rival emerges: ${s.rival.name} (${getFlag(s.rival.nationality)} ${s.rival.nationality})`);
  }
  
  // Simulate rival's season
  if (s.rival && !s.rival.retired) {
    s.rival = simulateRivalSeason(s.rival, clubs);
  }
  
  // Rivalry event (1 per year)
  if (s.rival && !s.rival.retired && Math.random() < 0.5) {
    const rivalEvents = getRivalryEvents(s).filter(e => e.id !== s.lastRivalryEventId);
    if (rivalEvents.length > 0) {
      s.pendingRivalryEvent = pick(rivalEvents);
    }
  }
  // Rival just retired — show retirement event
  if (s.rival?.retired && s.lastRivalryEventId !== 105) {
    const retireEvt = getRivalryEvents(s).find(e => e.id === 105);
    if (retireEvt) s.pendingRivalryEvent = retireEvt;
  }

  if (season.leagueTitle) s.events.push(`🏆 Won the league with ${s.currentClub}!`);
  if (season.championsLeague) s.events.push(`⭐ Won the Champions League!`);
  if (season.worldCup) s.events.push(`🌍 Won the World Cup with ${s.nationality}!`);
  if (season.ballonDor) s.events.push(`🏅 Won the Ballon d'Or!`);
  const totalGoals = s.seasons.reduce((sum, ss) => sum + ss.goals, 0) + season.goals;
  const totalApps = s.seasons.reduce((sum, ss) => sum + ss.apps, 0) + season.apps;
  if (totalGoals >= 100 && totalGoals - season.goals < 100) s.events.push("💯 Reached 100 career goals!");
  if (totalGoals >= 200 && totalGoals - season.goals < 200) s.events.push("🔥 Reached 200 career goals!");
  if (totalGoals >= 500 && totalGoals - season.goals < 500) s.events.push("👑 Reached 500 career goals!");
  if (totalApps >= 500 && totalApps - season.apps < 500) s.events.push("🎖️ Made 500th career appearance!");
  s.seasons = [...s.seasons, season];
  s.pendingSummary = season; s.phase = "season_summary";
  // Financial simulation
  simulateSeasonFinances(s, season);
  if (s.contractYearsLeft <= 1) s.events.push("⚠️ Your contract is expiring!");

  // World Cup year — trigger after summary
  if (isWCYear && s.internationalCareer && !s.intStats.isRetired) {
    const wcResult = simulateWorldCup(s);
    wcResult.year = thisYear;
    s.pendingWorldCup = wcResult;
    // Update int stats from WC
    s.intStats = { ...s.intStats,
      caps: s.intStats.caps + wcResult.playerApps,
      goals: s.intStats.goals + wcResult.playerGoals,
      assists: s.intStats.assists + wcResult.playerAssists,
      tournaments: s.intStats.tournaments + 1,
      worldCups: s.intStats.worldCups + 1,
    };
    if (wcResult.result === "Winner") {
      s.intStats = { ...s.intStats, worldCupWins: s.intStats.worldCupWins + 1 };
      season.worldCup = true;
    }
    if (wcResult.bestPlayer) {
      s.events.push(`🌟 Named Best Player of the World Cup!`);
    }
    s.intStats = { ...s.intStats, worldCupResults: [...s.intStats.worldCupResults, wcResult] };
  }

  // International debut event
  if (s.intStats.debutYear === thisYear) {
    s.events.push(`🇺🇳 First international call-up for ${s.nationality}!`);
  }

  if (s.events.length === 0) s.events.push(`⚽ Solid season at ${s.currentClub}`);
  return s;
}

/* ─── All 24 Random Events ─── */
function getAllEvents(state: CareerState): RandomEvent[] {
  const pos = state.position;
  const isAttacker = ["ST","CAM","LW","RW"].includes(pos);
  return [
    { id: 1, emoji: "⚽", title: "Derby Hero!", description: "You score a last-minute winner in the derby. The crowd goes wild.",
      category: "positive", choices: [
        { label: "Celebrate wildly", emoji: "🎉", color: "bg-emerald-600", consequence: "Popularity +10, Social media +50k",
          apply: s => { s.popularity = clamp(s.popularity + 10, 0, 100); s.events = [...s.events, "⚽ Scored a derby winner! Popularity soared"]; return s; } },
        { label: "Stay humble", emoji: "🤝", color: "bg-blue-600", consequence: "Morale +10, Team chemistry boost",
          apply: s => { s.morale = clamp(s.morale + 10, 0, 100); s.events = [...s.events, "⚽ Scored a derby winner — stayed humble"]; return s; } },
      ] },
    { id: 2, emoji: "🎙️", title: "Manager Praise", description: "A top manager says in an interview you are one of the best players in your position in the world.",
      category: "positive", choices: [
        { label: "Use it as motivation", emoji: "💪", color: "bg-emerald-600", consequence: "Market value +€5M, All stats +2 next season",
          apply: s => { s.marketValue += 5; s.statBoostNextSeason = { pace: 2, shooting: 2, passing: 2, dribbling: 2, defending: 2, physical: 2 }; s.events = [...s.events, "🎙️ Top manager praised you — confidence boosted"]; return s; } },
      ] },
    { id: 3, emoji: "©️", title: "Club Captain!", description: "You are voted captain of your club.",
      category: "positive", choices: [
        { label: "Accept the armband", emoji: "💪", color: "bg-emerald-600", consequence: "Leadership role, Defending +2, Physical +2",
          apply: s => { s.isLeader = true; s.defending = clamp(s.defending + 2, 20, 99); s.physical = clamp(s.physical + 2, 20, 99); s.events = [...s.events, "©️ Named club captain"]; return s; } },
      ] },
    { id: 4, emoji: "🏆", title: "Player of the Month!", description: "You win Player of the Month.",
      category: "positive", choices: [
        { label: "Dedicate it to the team", emoji: "🤝", color: "bg-emerald-600", consequence: "Overall +1, Market value +€3M",
          apply: s => { s.marketValue += 3; s.statBoostNextSeason = { ...s.statBoostNextSeason, shooting: (s.statBoostNextSeason.shooting || 0) + 1 }; s.events = [...s.events, "🏆 Won Player of the Month"]; return s; } },
      ] },
    { id: 5, emoji: "👟", title: "Sponsorship Deal!", description: "A major sportswear brand offers you a sponsorship deal.",
      category: "positive", choices: [
        { label: "Sign with Nike", emoji: "✔️", color: "bg-emerald-600", consequence: "+€2M/year income",
          apply: s => { s.sponsorDeal = "Nike"; s.totalEarnings += 2; s.events = [...s.events, "👟 Signed Nike sponsorship deal"]; return s; } },
        { label: "Sign with Adidas", emoji: "✔️", color: "bg-blue-600", consequence: "+€1.5M/year income",
          apply: s => { s.sponsorDeal = "Adidas"; s.totalEarnings += 1.5; s.events = [...s.events, "👟 Signed Adidas sponsorship deal"]; return s; } },
        { label: "Reject all offers", emoji: "✋", color: "bg-muted", consequence: "No deal — stay independent",
          apply: s => { s.events = [...s.events, "👟 Rejected sponsorship offers"]; return s; } },
      ] },
    { id: 6, emoji: "👶", title: "Youth Mentor", description: "You mentor a 16-year-old youth player at your club who shows incredible promise.",
      category: "positive", choices: [
        { label: "Take them under your wing", emoji: "🤝", color: "bg-emerald-600", consequence: "Legacy +5, Youth player may become rival later",
          apply: s => { s.popularity = clamp(s.popularity + 5, 0, 100); s.morale = clamp(s.morale + 5, 0, 100); s.events = [...s.events, "👶 Mentored a promising youth player"]; return s; } },
      ] },
    { id: 7, emoji: "🎯", title: "Puskas Nominee!", description: "You score a Puskas Award-nominated goal.",
      category: "positive", choices: [
        { label: "Take a bow", emoji: "🎉", color: "bg-emerald-600", consequence: "Social media +100k, Market value +€4M",
          apply: s => { s.popularity = clamp(s.popularity + 15, 0, 100); s.marketValue += 4; s.events = [...s.events, "🎯 Scored a Puskas-nominated goal!"]; return s; } },
      ] },
    { id: 8, emoji: "🔟", title: "Number 10 Shirt!", description: "Your manager gives you the number 10 shirt.",
      category: "positive", choices: [
        { label: "Wear it with pride", emoji: "💪", color: "bg-emerald-600",
          consequence: isAttacker ? "Shooting +2, Dribbling +2" : "Morale boost",
          apply: s => {
            if (isAttacker) { s.shooting = clamp(s.shooting + 2, 20, 99); s.dribbling = clamp(s.dribbling + 2, 20, 99); }
            s.morale = clamp(s.morale + 10, 0, 100);
            s.events = [...s.events, "🔟 Given the iconic number 10 shirt"]; return s;
          } },
      ] },
    { id: 9, emoji: "🟥", title: "Red Card Scandal!", description: "You are caught in a red card scandal after a violent foul. Banned for 3 matches.",
      category: "negative", choices: [
        { label: "Accept the ban", emoji: "😔", color: "bg-red-600", consequence: "Red cards +1, Reputation -5",
          apply: s => { s.popularity = clamp(s.popularity - 5, 0, 100); s.events = [...s.events, "🟥 Banned 3 matches for violent foul"]; return s; } },
        { label: "Appeal the decision", emoji: "⚖️", color: "bg-amber-600", consequence: "50% chance ban is reduced",
          apply: s => { if (Math.random() < 0.5) { s.events = [...s.events, "🟥 Ban reduced on appeal"]; } else { s.popularity = clamp(s.popularity - 5, 0, 100); s.events = [...s.events, "🟥 Appeal rejected — ban stands"]; } return s; } },
      ] },
    { id: 10, emoji: "💉", title: "False Doping Accusation", description: "A journalist publishes a story claiming you failed a doping test. It is later proven false but damage is done.",
      category: "negative", choices: [
        { label: "Speak out publicly", emoji: "🎙️", color: "bg-blue-600", consequence: "Market value -€1M but popularity +5",
          apply: s => { s.marketValue = Math.max(0.1, s.marketValue - 1); s.popularity = clamp(s.popularity + 5, 0, 100); s.events = [...s.events, "💉 Fought doping accusation publicly — cleared"]; return s; } },
        { label: "Stay silent, let lawyers handle it", emoji: "🤫", color: "bg-muted", consequence: "Market value -€2M",
          apply: s => { s.marketValue = Math.max(0.1, s.marketValue - 2); s.events = [...s.events, "💉 Doping accusation — stayed silent"]; return s; } },
        { label: "Hold press conference", emoji: "📺", color: "bg-emerald-600", consequence: "Market value +€1M, popularity +10",
          apply: s => { s.marketValue += 1; s.popularity = clamp(s.popularity + 10, 0, 100); s.events = [...s.events, "💉 Press conference — cleared name completely"]; return s; } },
      ] },
    { id: 11, emoji: "🏥", title: "Serious Injury!", description: "You pick up a serious hamstring injury.",
      category: "negative", choices: [
        { label: "Focus on recovery", emoji: "🏥", color: "bg-red-600", consequence: "Pace -2 permanently, miss apps next season",
          apply: s => { s.pace = clamp(s.pace - 2, 20, 99); s.morale = clamp(s.morale - 10, 0, 100); s.events = [...s.events, "🏥 Serious hamstring injury — Pace -2"]; return s; } },
        { label: "Rush back early", emoji: "⚡", color: "bg-amber-600", consequence: "Pace -1 but 30% chance of reinjury (Pace -3)",
          apply: s => { if (Math.random() < 0.3) { s.pace = clamp(s.pace - 3, 20, 99); s.events = [...s.events, "🏥 Rushed back — reinjured! Pace -3"]; } else { s.pace = clamp(s.pace - 1, 20, 99); s.events = [...s.events, "🏥 Rushed back successfully — Pace -1"]; } return s; } },
      ] },
    { id: 12, emoji: "👔", title: "New Manager!", description: "Your manager is sacked. The new manager does not rate you.",
      category: "negative", choices: [
        { label: "Prove yourself in training", emoji: "💪", color: "bg-emerald-600", consequence: "Morale -5 but possible stat boost",
          apply: s => { s.morale = clamp(s.morale - 5, 0, 100); s.statBoostNextSeason = { ...s.statBoostNextSeason, physical: (s.statBoostNextSeason.physical || 0) + 1 }; s.events = [...s.events, "👔 New manager — training harder"]; return s; } },
        { label: "Accept reduced role", emoji: "😔", color: "bg-muted", consequence: "Morale -10, fewer appearances",
          apply: s => { s.morale = clamp(s.morale - 10, 0, 100); s.events = [...s.events, "👔 New manager doesn't rate you — reduced role"]; return s; } },
      ] },
    { id: 13, emoji: "📸", title: "Party Scandal!", description: "You are photographed at a party the night before a big match. The media goes wild.",
      category: "negative", choices: [
        { label: "Apologize publicly", emoji: "😔", color: "bg-blue-600", consequence: "Popularity -3, Manager relationship saved",
          apply: s => { s.popularity = clamp(s.popularity - 3, 0, 100); s.events = [...s.events, "📸 Party scandal — apologized publicly"]; return s; } },
        { label: "Deny it", emoji: "🤷", color: "bg-muted", consequence: "50/50: believed or more backlash",
          apply: s => { if (Math.random() < 0.5) { s.events = [...s.events, "📸 Denied party — public believed you"]; } else { s.popularity = clamp(s.popularity - 8, 0, 100); s.events = [...s.events, "📸 Denied party — backlash got worse"]; } return s; } },
        { label: "Laugh it off on social media", emoji: "😂", color: "bg-amber-600", consequence: "Popularity +5 with fans, -5 with manager",
          apply: s => { s.popularity = clamp(s.popularity + 5, 0, 100); s.morale = clamp(s.morale - 5, 0, 100); s.events = [...s.events, "📸 Laughed off party scandal — fans loved it"]; return s; } },
      ] },
    { id: 14, emoji: "😤", title: "Rival Provocation!", description: "A rival player publicly claims he is better than you in a magazine interview.",
      category: "negative", choices: [
        { label: "Let your feet do the talking", emoji: "⚽", color: "bg-emerald-600", consequence: "Motivation boost: all stats +1 next season",
          apply: s => { s.statBoostNextSeason = { pace: 1, shooting: 1, passing: 1, dribbling: 1, defending: 1, physical: 1 }; s.events = [...s.events, "😤 Rival provoked you — used it as motivation"]; return s; } },
        { label: "Fire back in the media", emoji: "🎙️", color: "bg-red-600", consequence: "Popularity +5 but rivalry intensifies",
          apply: s => { s.popularity = clamp(s.popularity + 5, 0, 100); s.events = [...s.events, "😤 Fired back at rival in media"]; return s; } },
      ] },
    { id: 15, emoji: "📋", title: "Dropped!", description: "You are dropped from the starting lineup without explanation.",
      category: "negative", choices: [
        { label: "Demand explanation", emoji: "😠", color: "bg-red-600", consequence: "Morale -5, 50% chance manager explains",
          apply: s => { s.morale = clamp(s.morale - 5, 0, 100); if (Math.random() < 0.5) { s.events = [...s.events, "📋 Demanded explanation — manager understood"]; } else { s.events = [...s.events, "📋 Demanded explanation — relationship worsened"]; } return s; } },
        { label: "Train harder, fight for place", emoji: "💪", color: "bg-emerald-600", consequence: "Physical +1, Morale +5",
          apply: s => { s.physical = clamp(s.physical + 1, 20, 99); s.morale = clamp(s.morale + 5, 0, 100); s.events = [...s.events, "📋 Dropped — trained harder to fight back"]; return s; } },
      ] },
    { id: 16, emoji: "📝", title: "Contract Breakdown!", description: "Contract talks break down. Club offers less than expected.",
      category: "negative", choices: [
        { label: "Accept lower wage, stay loyal", emoji: "🤝", color: "bg-blue-600", consequence: "Wage -15%, Morale +5",
          apply: s => { s.weeklyWage = Math.round(s.weeklyWage * 0.85); s.morale = clamp(s.morale + 5, 0, 100); s.events = [...s.events, "📝 Accepted lower wage — stayed loyal"]; return s; } },
        { label: "Push for more money", emoji: "💰", color: "bg-amber-600", consequence: "50% chance: Wage +20% or relationship damaged",
          apply: s => { if (Math.random() < 0.5) { s.weeklyWage = Math.round(s.weeklyWage * 1.2); s.events = [...s.events, "📝 Pushed for more — got a raise!"]; } else { s.morale = clamp(s.morale - 10, 0, 100); s.events = [...s.events, "📝 Pushed too hard — relationship damaged"]; } return s; } },
        { label: "Walk away when contract expires", emoji: "🚶", color: "bg-red-600", consequence: "Contract not renewed, become free agent sooner",
          apply: s => { s.contractYearsLeft = Math.min(s.contractYearsLeft, 1); s.events = [...s.events, "📝 Walking away — will leave on free"]; return s; } },
      ] },
    { id: 17, emoji: "🇺🇳", title: "International Call-Up!", description: "You receive your first call-up to the national team.",
      category: "international", choices: [
        { label: "Accept with pride", emoji: "🏳️", color: "bg-emerald-600", consequence: "International career begins, Morale +15",
          apply: s => { s.internationalCareer = true; s.morale = clamp(s.morale + 15, 0, 100); s.events = [...s.events, `🇺🇳 Called up to ${s.nationality} national team!`]; return s; } },
      ] },
    { id: 18, emoji: "🥅", title: "International Debut Goal!", description: "You score on your international debut.",
      category: "international", choices: [
        { label: "Celebrate for the nation", emoji: "🎉", color: "bg-emerald-600", consequence: "Social media +75k, Popularity +10",
          apply: s => { s.popularity = clamp(s.popularity + 10, 0, 100); s.events = [...s.events, `🥅 Scored on international debut for ${s.nationality}!`]; return s; } },
      ] },
    { id: 19, emoji: "🏆❌", title: "World Cup Snub!", description: "You are left out of the World Cup squad despite a great season.",
      category: "international", choices: [
        { label: "Accept decision gracefully", emoji: "😔", color: "bg-blue-600", consequence: "Morale -5, Respect +5",
          apply: s => { s.morale = clamp(s.morale - 5, 0, 100); s.events = [...s.events, "🏆❌ Left out of World Cup — accepted it"]; return s; } },
        { label: "Publicly question manager", emoji: "🎙️", color: "bg-amber-600", consequence: "Popularity +5, International career at risk",
          apply: s => { s.popularity = clamp(s.popularity + 5, 0, 100); s.morale = clamp(s.morale - 10, 0, 100); s.events = [...s.events, "🏆❌ Publicly questioned World Cup snub"]; return s; } },
        { label: "Retire from internationals", emoji: "🚶", color: "bg-red-600", consequence: "International career ends",
          apply: s => { s.internationalCareer = false; s.events = [...s.events, "🏆❌ Retired from international football in protest"]; return s; } },
      ] },
    { id: 20, emoji: "❤️", title: "Love Interest", description: "You meet someone special and get into a relationship.",
      category: "life", choices: [
        { label: "Start dating", emoji: "💕", color: "bg-pink-600", consequence: "Morale +10, Stability boost",
          apply: s => { s.hasRelationship = true; s.morale = clamp(s.morale + 10, 0, 100); s.events = [...s.events, "❤️ Started a relationship"]; return s; } },
        { label: "Focus on football", emoji: "⚽", color: "bg-muted", consequence: "No change — stay focused",
          apply: s => { s.events = [...s.events, "❤️ Chose to focus on football"]; return s; } },
      ] },
    { id: 21, emoji: "🏥💔", title: "Family Emergency", description: "A family member is seriously ill.",
      category: "life", choices: [
        { label: "Take time away", emoji: "✈️", color: "bg-blue-600", consequence: "Morale -5 but family support, Physical +1",
          apply: s => { s.morale = clamp(s.morale - 5, 0, 100); s.physical = clamp(s.physical + 1, 20, 99); s.events = [...s.events, "🏥💔 Took time to be with family"]; return s; } },
        { label: "Push through and play", emoji: "💪", color: "bg-amber-600", consequence: "Morale -15, appearances maintained",
          apply: s => { s.morale = clamp(s.morale - 15, 0, 100); s.events = [...s.events, "🏥💔 Played through family crisis"]; return s; } },
        { label: "Fly home between matches", emoji: "🛫", color: "bg-emerald-600", consequence: "Morale -8, Physical -1 from travel",
          apply: s => { s.morale = clamp(s.morale - 8, 0, 100); s.physical = clamp(s.physical - 1, 20, 99); s.events = [...s.events, "🏥💔 Flew home between matches for family"]; return s; } },
      ] },
    { id: 22, emoji: "💼", title: "Business Venture", description: "Your agent suggests investing in a restaurant chain. €500k investment.",
      category: "life", choices: [
        { label: "Invest €500k", emoji: "💰", color: "bg-emerald-600", consequence: "Random: +€1M profit or -€500k loss",
          apply: s => { if (Math.random() < 0.5) { s.netWorth += 1; s.investments = [...s.investments, "Restaurant Chain ✅"]; s.events = [...s.events, "💼 Restaurant investment succeeded! +€1M"]; } else { s.netWorth -= 0.5; s.investments = [...s.investments, "Restaurant Chain ❌"]; s.events = [...s.events, "💼 Restaurant investment failed — lost €500k"]; } return s; } },
        { label: "Pass on it", emoji: "✋", color: "bg-muted", consequence: "No risk, no reward",
          apply: s => { s.events = [...s.events, "💼 Passed on restaurant investment"]; return s; } },
      ] },
    { id: 23, emoji: "🏠", title: "Property Opportunity!", description: `Buy a house in ${state.currentClubCountry} for €2M?`,
      category: "life", choices: [
        { label: "Buy it — €2M", emoji: "🏠", color: "bg-emerald-600", consequence: "Property added, Lifestyle upgrade, Morale +5",
          apply: s => { s.netWorth -= 2; s.properties = [...s.properties, `House in ${s.currentClubCountry}`]; s.morale = clamp(s.morale + 5, 0, 100); s.events = [...s.events, "🏠 Bought a property"]; return s; } },
        { label: "Save the money", emoji: "💰", color: "bg-muted", consequence: "Smart financial decision",
          apply: s => { s.events = [...s.events, "🏠 Decided to save money instead"]; return s; } },
      ] },
    { id: 24, emoji: "🌍", title: "Brand Ambassador!", description: "You are offered a role as brand ambassador for your country.",
      category: "life", choices: [
        { label: "Accept the role", emoji: "✔️", color: "bg-emerald-600", consequence: "Followers +2M, Sponsorship income boost",
          apply: s => { s.popularity = clamp(s.popularity + 20, 0, 100); s.socialMediaFollowers += 2; s.sponsorshipIncome += 1; s.events = [...s.events, "🌍 Became brand ambassador"]; return s; } },
        { label: "Decline — too distracting", emoji: "✋", color: "bg-muted", consequence: "Focus on football",
          apply: s => { s.events = [...s.events, "🌍 Declined brand ambassador role"]; return s; } },
      ] },
    // Financial events (25-30)
    { id: 25, emoji: "🚗", title: "Supercar Fleet!", description: "You buy a fleet of supercars. Cost: €800k.",
      category: "life", choices: [
        { label: "Buy the fleet 🚗", emoji: "🏎️", color: "bg-red-600", consequence: "Net worth -€800k, Lifestyle upgrade, Followers +500k",
          apply: s => { s.netWorth -= 0.8; s.socialMediaFollowers += 0.5; s.popularity = clamp(s.popularity + 3, 0, 100); s.events = [...s.events, "🚗 Bought a supercar fleet — €800k"]; return s; } },
        { label: "Keep it humble", emoji: "✋", color: "bg-muted", consequence: "Save the money",
          apply: s => { s.events = [...s.events, "🚗 Decided not to buy supercars"]; return s; } },
      ] },
    { id: 26, emoji: "📈", title: "Crypto Tip!", description: "A friend tips you on a crypto investment. High risk, high reward.",
      category: "life", choices: [
        { label: "Invest €200k", emoji: "🪙", color: "bg-amber-600", consequence: "Could 10x or lose everything",
          apply: s => { const roll = Math.random(); if (roll < 0.15) { s.netWorth += 2; s.investments = [...s.investments, "Crypto 10x 🚀"]; s.events = [...s.events, "📈 Crypto went 10x! +€2M!"]; } else if (roll < 0.5) { s.netWorth += 0.2; s.investments = [...s.investments, "Crypto 2x"]; s.events = [...s.events, "📈 Crypto doubled — +€200k"]; } else { s.netWorth -= 0.2; s.investments = [...s.investments, "Crypto ❌"]; s.events = [...s.events, "📈 Crypto crashed — lost €200k"]; } return s; } },
        { label: "Stay away from crypto", emoji: "✋", color: "bg-muted", consequence: "Smart move? Or missed opportunity?",
          apply: s => { s.events = [...s.events, "📈 Avoided crypto investment"]; return s; } },
      ] },
    { id: 27, emoji: "🎬", title: "Movie Cameo!", description: "A Hollywood director wants you for a cameo in a blockbuster film.",
      category: "life", choices: [
        { label: "Accept — €500k fee", emoji: "🎬", color: "bg-emerald-600", consequence: "Net worth +€500k, Followers +3M",
          apply: s => { s.netWorth += 0.5; s.socialMediaFollowers += 3; s.popularity = clamp(s.popularity + 10, 0, 100); s.events = [...s.events, "🎬 Appeared in a blockbuster film!"]; return s; } },
        { label: "Decline — focus on football", emoji: "⚽", color: "bg-muted", consequence: "Stay professional",
          apply: s => { s.events = [...s.events, "🎬 Declined movie cameo"]; return s; } },
      ] },
    { id: 28, emoji: "🏦", title: "Financial Advisor", description: "Your financial advisor recommends diversifying into real estate funds.",
      category: "life", choices: [
        { label: "Invest €1M", emoji: "🏦", color: "bg-blue-600", consequence: "Steady returns: +€150k/year",
          apply: s => { s.netWorth -= 1; s.investments = [...s.investments, "Real Estate Fund"]; s.sponsorshipIncome += 0.15; s.events = [...s.events, "🏦 Invested in real estate fund"]; return s; } },
        { label: "Keep cash liquid", emoji: "💵", color: "bg-muted", consequence: "No investment made",
          apply: s => { s.events = [...s.events, "🏦 Kept cash instead of investing"]; return s; } },
      ] },
    { id: 29, emoji: "💎", title: "Luxury Watch Collection!", description: "A limited edition watch collection is available. €400k for a set of three.",
      category: "life", choices: [
        { label: "Buy them — €400k", emoji: "⌚", color: "bg-amber-600", consequence: "Net worth -€400k, Status symbol, Followers +200k",
          apply: s => { s.netWorth -= 0.4; s.socialMediaFollowers += 0.2; s.events = [...s.events, "💎 Bought luxury watch collection"]; return s; } },
        { label: "Not worth it", emoji: "✋", color: "bg-muted", consequence: "Save the money",
          apply: s => { s.events = [...s.events, "💎 Declined watch collection"]; return s; } },
      ] },
    { id: 30, emoji: "🎮", title: "Gaming Brand Deal!", description: "A gaming company offers you a brand deal to stream and promote their games.",
      category: "life", choices: [
        { label: "Sign the deal — €300k/year", emoji: "🎮", color: "bg-purple-600", consequence: "Income +€300k, Followers +1M",
          apply: s => { s.sponsorshipIncome += 0.3; s.socialMediaFollowers += 1; s.events = [...s.events, "🎮 Signed gaming brand deal"]; return s; } },
        { label: "Not my thing", emoji: "✋", color: "bg-muted", consequence: "Stay focused on football",
          apply: s => { s.events = [...s.events, "🎮 Declined gaming brand deal"]; return s; } },
      ] },
  ];
}

/* ─── Generate 1-3 random events for a season ─── */
function generateRandomEvents(state: CareerState): RandomEvent[] {
  if (state.age < 17) return [];
  const all = getAllEvents(state);
  const eligible = all.filter(e => {
    if (e.id === state.lastEventId) return false;
    if (e.category === "international") {
      if (e.id === 17 && state.internationalCareer) return false;
      if (e.id === 18 && !state.internationalCareer) return false;
      if (e.id === 19 && !state.internationalCareer) return false;
    }
    if (e.id === 20 && state.hasRelationship) return false;
    if (e.id === 3 && state.isLeader) return false;
    if (e.id === 5 && state.sponsorDeal) return false;
    if (e.id === 2 && state.overall < 75) return false;
    if (e.id === 7 && state.overall < 70) return false;
    if (e.id === 24 && state.overall < 78) return false;
    if (e.id === 17 && state.overall < 68) return false;
    // Financial events need enough net worth
    if (e.id === 23 && state.netWorth < 2.5) return false; // Property
    if (e.id === 25 && state.netWorth < 1) return false; // Supercars
    if (e.id === 28 && state.netWorth < 1.5) return false; // Real estate fund
    if (e.id === 29 && state.netWorth < 0.5) return false; // Watch collection
    if (e.id === 27 && state.popularity < 50) return false; // Movie cameo
    if (e.id === 30 && state.socialMediaFollowers < 1) return false; // Gaming deal
    return true;
  });
  const count = rand(1, 3);
  const shuffled = [...eligible].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/* ─── Flow helper: advance to next phase ─── */
function advanceToNextPhase(s: CareerState, clubs: ClubData[]): CareerState {
  // Check for international debut screen
  const lastSeason = s.seasons[s.seasons.length - 1];
  if (s.intStats.debutYear === lastSeason?.year && s.phase !== "international_debut" && s.phase !== "world_cup") {
    s.phase = "international_debut";
    return s;
  }
  // Check for World Cup result screen
  if (s.pendingWorldCup && s.phase !== "world_cup") {
    s.phase = "world_cup";
    return s;
  }
  // Rivalry event
  if (s.pendingRivalryEvent) {
    s.phase = "rivalry_event";
    return s;
  }
  // Random events
  const events = generateRandomEvents(s);
  if (events.length > 0) {
    s.pendingEvents = events;
    s.phase = "random_events";
    return s;
  }
  // Transfer window
  if (s.age >= 18) {
    s.transferSituation = determineTransferSituation(s, clubs);
    s.phase = "transfer_window";
  } else { s.phase = "playing"; }
  return s;
}

/* ─── Dismiss summary ─── */
export function dismissSummary(prev: CareerState, clubs: ClubData[]): CareerState {
  const s = { ...prev }; s.pendingSummary = null;
  if (s.retired) { s.phase = "retired"; return s; }
  return advanceToNextPhase(s, clubs);
}

/* ─── Dismiss international debut screen ─── */
export function dismissDebut(prev: CareerState, clubs: ClubData[]): CareerState {
  const s = { ...prev };
  // Clear the debut trigger by nullifying it so we don't re-show
  s.intStats = { ...s.intStats, debutYear: -1 };
  // Check for World Cup
  if (s.pendingWorldCup) {
    s.phase = "world_cup";
    return s;
  }
  return advanceToNextPhase(s, clubs);
}

/* ─── Dismiss World Cup screen ─── */
export function dismissWorldCup(prev: CareerState, clubs: ClubData[]): CareerState {
  const s = { ...prev };
  s.pendingWorldCup = null;
  return advanceToNextPhase(s, clubs);
}

/* ─── Retire from international football ─── */
export function retireFromInternational(prev: CareerState): CareerState {
  const s = { ...prev };
  s.intStats = { ...s.intStats, isRetired: true };
  s.internationalCareer = false;
  s.events = [...s.events, `🇺🇳 Retired from international football (${s.intStats.caps} caps, ${s.intStats.goals} goals)`];
  return s;
}

/* ─── Apply event choice and advance to next event or transfer window ─── */
export function applyEventChoice(prev: CareerState, choiceIndex: number, clubs: ClubData[]): CareerState {
  const event = prev.pendingEvents[0];
  if (!event) return prev;
  let s = event.choices[choiceIndex].apply({ ...prev });
  s.lastEventId = event.id;
  s.pendingEvents = s.pendingEvents.slice(1);
  s.overall = calcOverall(s, s.position);
  if (s.pendingEvents.length > 0) {
    s.phase = "random_events";
    return s;
  }
  // All events processed → transfer window
  if (s.age >= 18) {
    s.transferSituation = determineTransferSituation(s, clubs);
    s.phase = "transfer_window";
  } else { s.phase = "playing"; }
  return s;
}

/* ─── Stay at current club ─── */
export function stayAtClub(prev: CareerState): CareerState {
  const s = { ...prev }; s.pendingOffers = []; s.transferSituation = null; s.phase = "playing";
  if (s.contractYearsLeft <= 0) {
    s.contractYearsLeft = rand(2, 4);
    s.events = [...s.events, `📝 Renewed contract with ${s.currentClub} for ${s.contractYearsLeft} years`];
  }
  return s;
}

/* ─── Sign extension ─── */
export function signExtension(prev: CareerState): CareerState {
  const s = { ...prev };
  const extraYears = rand(2, 4);
  s.contractYearsLeft = extraYears;
  s.weeklyWage = Math.round(s.weeklyWage * 1.15);
  s.transferSituation = null; s.phase = "playing";
  s.events = [...s.events, `📝 Signed ${extraYears}-year extension with ${s.currentClub} (${formatWage(s.weeklyWage)})`];
  return s;
}

/* ─── Rivalry System Functions ─── */

const RIVAL_FIRST_NAMES = ["Marco","Lucas","João","Karim","Antoine","Jamal","Kylian","Erling","Lamine","Rodri","Phil","Jude","Bukayo","Florian","Rafael","Dušan","Álvaro","Leroy","Ousmane","Federico"];
const RIVAL_LAST_NAMES = ["Silva","Fernandez","Müller","Santos","Rossi","Andersen","Johansson","López","Martínez","Hernández","Dubois","Weber","Petrov","Nielsen","Eriksen","Moreno","Torres","Schmidt","Costa","Bernard"];

function generateRivalName(): string {
  return `${pick(RIVAL_FIRST_NAMES)} ${pick(RIVAL_LAST_NAMES)}`;
}

function createRival(state: CareerState, clubs: ClubData[]): RivalPlayer {
  const ovrDiff = rand(-5, 5);
  const rivalOvr = clamp(state.overall + ovrDiff, 45, 95);
  // Pick a different club at appropriate tier
  const tiers = rivalOvr >= 80 ? [1] : rivalOvr >= 70 ? [1, 2] : rivalOvr >= 60 ? [2, 3] : [3, 4];
  const candidates = clubs.filter(c => tiers.includes(c.tier) && c.name !== state.currentClub);
  const rivalClub = candidates.length > 0 ? pick(candidates) : { name: "Unknown FC", tier: 2 };
  // Pick nationality — prefer same region
  const sameNatChance = Math.random();
  const rivalNat = sameNatChance < 0.3 ? state.nationality : pick(Object.keys(FLAG_MAP));
  return {
    name: generateRivalName(),
    nationality: rivalNat,
    position: state.position,
    club: rivalClub.name,
    clubTier: rivalClub.tier,
    overall: rivalOvr,
    careerGoals: 0,
    careerAssists: 0,
    careerApps: 0,
    leagueTitles: 0,
    championsLeagues: 0,
    worldCups: 0,
    ballonDors: 0,
    intCaps: 0,
    intGoals: 0,
    marketValue: calcMarketValue(rivalOvr, state.age, state.position),
    age: state.age + rand(-1, 1),
    retired: false,
  };
}

function simulateRivalSeason(rival: RivalPlayer, clubs: ClubData[]): RivalPlayer {
  const r = { ...rival };
  if (r.retired) return r;
  r.age += 1;
  // Stat growth similar to player
  if (r.age <= 23) r.overall = clamp(r.overall + rand(1, 3), 45, 95);
  else if (r.age <= 29) r.overall = clamp(r.overall + rand(0, 2), 45, 95);
  else if (r.age <= 33) r.overall = clamp(r.overall + rand(-2, 0), 45, 95);
  else r.overall = clamp(r.overall + rand(-3, -1), 45, 95);
  
  // Club movement
  if (Math.random() < 0.15) {
    const tiers = r.overall >= 82 ? [1] : r.overall >= 72 ? [1, 2] : r.overall >= 62 ? [2, 3] : [3, 4];
    const candidates = clubs.filter(c => tiers.includes(c.tier) && c.name !== r.club);
    if (candidates.length > 0) r.club = pick(candidates).name;
  }
  
  // Season stats
  const apps = rand(20, 36);
  const goals = calcGoals(r.position, apps);
  const assists = calcAssists(r.position, apps);
  r.careerApps += apps;
  r.careerGoals += goals;
  r.careerAssists += assists;
  
  // Trophies
  const clubTier = r.clubTier;
  if (clubTier <= 2 && Math.random() < 0.2 / clubTier) r.leagueTitles += 1;
  if (clubTier === 1 && r.overall >= 78 && Math.random() < 0.06) r.championsLeagues += 1;
  if (r.overall >= 80 && Math.random() < 0.04) r.worldCups += 1;
  if (r.overall >= 88 && Math.random() < 0.08) r.ballonDors += 1;
  
  // International
  if (r.overall >= 72 && r.age <= 33) {
    const intApps = rand(4, 10);
    r.intCaps += intApps;
    r.intGoals += calcGoals(r.position, intApps);
  }
  
  r.marketValue = calcMarketValue(r.overall, r.age, r.position);
  
  // Retirement
  if ((r.overall < 60 && r.age >= 30) || r.age >= 37) r.retired = true;
  
  return r;
}

function getRivalryEvents(state: CareerState): RivalryEvent[] {
  if (!state.rival) return [];
  const r = state.rival;
  const events: RivalryEvent[] = [];
  
  if (r.ballonDors > 0) {
    events.push({ id: 101, emoji: "🏅", title: "Rival Wins Ballon d'Or", description: `${r.name} won the Ballon d'Or. You finished 3rd.`, consequence: "Motivation boost: stats +1 next season" });
  }
  events.push({ id: 102, emoji: "🏠", title: "Transfer Battle", description: `You and ${r.name} both want to sign for the same club. The club chose your rival.`, consequence: "Morale -5" });
  events.push({ id: 103, emoji: "🤝", title: "Rival Shows Respect", description: `${r.name} publicly says he respects you as the best player in the world.`, consequence: "Popularity +5, Morale +5" });
  events.push({ id: 104, emoji: "⚽", title: "Head to Head Victory!", description: `In a head-to-head match you scored twice against ${r.name}'s team.`, consequence: "Popularity +5, Confidence boost" });
  if (r.retired) {
    events.push({ id: 105, emoji: "👋", title: "Rival Retires", description: `${r.name} announces retirement. He calls you the greatest rival of his career.`, consequence: "Legacy +10, End of an era" });
  }
  if (state.internationalCareer) {
    events.push({ id: 106, emoji: "🇺🇳", title: "National Team Battle", description: `Both you and ${r.name} are on the same national team. The manager must pick one to start.`, consequence: "50/50 outcome" });
  }
  if (r.championsLeagues > 0) {
    events.push({ id: 107, emoji: "⭐", title: "Rival Wins Champions League", description: `${r.name} wins the Champions League. You were eliminated in the semis.`, consequence: "Morale -5, Motivation boost" });
  }
  if (state.overall > r.overall && state.overall - r.overall >= 2) {
    events.push({ id: 108, emoji: "📈", title: "Surpassed Your Rival!", description: `For the first time in your career, your overall rating (${state.overall}) has surpassed ${r.name}'s (${r.overall}).`, consequence: "Morale +10, Legacy boost" });
  }
  
  return events;
}

function applyRivalryEvent(state: CareerState, event: RivalryEvent): CareerState {
  const s = { ...state };
  switch (event.id) {
    case 101:
      s.statBoostNextSeason = { ...s.statBoostNextSeason, shooting: (s.statBoostNextSeason.shooting || 0) + 1, dribbling: (s.statBoostNextSeason.dribbling || 0) + 1 };
      s.morale = clamp(s.morale - 5, 0, 100);
      break;
    case 102:
      s.morale = clamp(s.morale - 5, 0, 100);
      break;
    case 103:
      s.popularity = clamp(s.popularity + 5, 0, 100);
      s.morale = clamp(s.morale + 5, 0, 100);
      break;
    case 104:
      s.popularity = clamp(s.popularity + 5, 0, 100);
      s.morale = clamp(s.morale + 5, 0, 100);
      break;
    case 105:
      s.popularity = clamp(s.popularity + 10, 0, 100);
      break;
    case 106:
      if (Math.random() < 0.5) {
        s.morale = clamp(s.morale + 5, 0, 100);
        s.events = [...s.events, `🇺🇳 Manager chose you over ${s.rival?.name}!`];
      } else {
        s.morale = clamp(s.morale - 5, 0, 100);
        s.events = [...s.events, `🇺🇳 Manager chose ${s.rival?.name} over you.`];
      }
      break;
    case 107:
      s.morale = clamp(s.morale - 5, 0, 100);
      s.statBoostNextSeason = { ...s.statBoostNextSeason, physical: (s.statBoostNextSeason.physical || 0) + 1 };
      break;
    case 108:
      s.morale = clamp(s.morale + 10, 0, 100);
      break;
  }
  s.events = [...s.events, `${event.emoji} ${event.title}`];
  return s;
}

export function dismissRivalryEvent(prev: CareerState, clubs: ClubData[]): CareerState {
  const s = { ...prev };
  if (s.pendingRivalryEvent) {
    const applied = applyRivalryEvent(s, s.pendingRivalryEvent);
    Object.assign(s, applied);
    s.lastRivalryEventId = s.pendingRivalryEvent.id;
    s.pendingRivalryEvent = null;
  }
  // Continue to next phase after rivalry event
  return advanceToNextPhaseAfterRivalry(s, clubs);
}

function advanceToNextPhaseAfterRivalry(s: CareerState, clubs: ClubData[]): CareerState {
  // Check for international debut screen
  const lastSeason = s.seasons[s.seasons.length - 1];
  if (s.intStats.debutYear === lastSeason?.year && s.phase !== "international_debut" && s.phase !== "world_cup") {
    s.phase = "international_debut";
    return s;
  }
  if (s.pendingWorldCup && s.phase !== "world_cup") {
    s.phase = "world_cup";
    return s;
  }
  const events = generateRandomEvents(s);
  if (events.length > 0) {
    s.pendingEvents = events;
    s.phase = "random_events";
    return s;
  }
  if (s.age >= 18) {
    s.transferSituation = determineTransferSituation(s, clubs);
    s.phase = "transfer_window";
  } else { s.phase = "playing"; }
  return s;
}

export function generateRivalrySummary(state: CareerState): RivalrySummary | null {
  if (!state.rival) return null;
  const r = state.rival;
  const totals = getCareerTotals(state.seasons);
  
  const categories: RivalrySummary["categories"] = [
    { label: "Career Goals", playerVal: `${totals.goals}`, rivalVal: `${r.careerGoals}`, winner: totals.goals > r.careerGoals ? "player" : totals.goals < r.careerGoals ? "rival" : "tie" },
    { label: "Career Assists", playerVal: `${totals.assists}`, rivalVal: `${r.careerAssists}`, winner: totals.assists > r.careerAssists ? "player" : totals.assists < r.careerAssists ? "rival" : "tie" },
    { label: "League Titles", playerVal: `${totals.leagueTitles}`, rivalVal: `${r.leagueTitles}`, winner: totals.leagueTitles > r.leagueTitles ? "player" : totals.leagueTitles < r.leagueTitles ? "rival" : "tie" },
    { label: "Champions League", playerVal: `${totals.championsLeagues}`, rivalVal: `${r.championsLeagues}`, winner: totals.championsLeagues > r.championsLeagues ? "player" : totals.championsLeagues < r.championsLeagues ? "rival" : "tie" },
    { label: "Ballon d'Or", playerVal: `${totals.ballonDors}`, rivalVal: `${r.ballonDors}`, winner: totals.ballonDors > r.ballonDors ? "player" : totals.ballonDors < r.ballonDors ? "rival" : "tie" },
    { label: "Int'l Caps", playerVal: `${state.intStats.caps}`, rivalVal: `${r.intCaps}`, winner: state.intStats.caps > r.intCaps ? "player" : state.intStats.caps < r.intCaps ? "rival" : "tie" },
    { label: "Int'l Goals", playerVal: `${state.intStats.goals}`, rivalVal: `${r.intGoals}`, winner: state.intStats.goals > r.intGoals ? "player" : state.intStats.goals < r.intGoals ? "rival" : "tie" },
    { label: "Market Value", playerVal: `€${state.marketValue.toFixed(0)}M`, rivalVal: `€${r.marketValue.toFixed(0)}M`, winner: state.marketValue > r.marketValue ? "player" : state.marketValue < r.marketValue ? "rival" : "tie" },
  ];
  
  const playerWins = categories.filter(c => c.winner === "player").length;
  const rivalWins = categories.filter(c => c.winner === "rival").length;
  const overallWinner = playerWins > rivalWins ? "player" as const : playerWins < rivalWins ? "rival" as const : "tie" as const;
  const legacyBonus = overallWinner === "player" ? 15 : overallWinner === "tie" ? 5 : -5;
  
  return { playerWins, rivalWins, categories, overallWinner, legacyBonus };
}

/* ─── Totals ─── */
export function getCareerTotals(seasons: SeasonRecord[]) {
  return seasons.reduce((t, s) => ({
    apps: t.apps + s.apps, goals: t.goals + s.goals, assists: t.assists + s.assists,
    cleanSheets: t.cleanSheets + s.cleanSheets, yellowCards: t.yellowCards + s.yellowCards, redCards: t.redCards + s.redCards,
    leagueTitles: t.leagueTitles + (s.leagueTitle ? 1 : 0), championsLeagues: t.championsLeagues + (s.championsLeague ? 1 : 0),
    worldCups: t.worldCups + (s.worldCup ? 1 : 0), ballonDors: t.ballonDors + (s.ballonDor ? 1 : 0),
  }), { apps: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0, leagueTitles: 0, championsLeagues: 0, worldCups: 0, ballonDors: 0 });
}
