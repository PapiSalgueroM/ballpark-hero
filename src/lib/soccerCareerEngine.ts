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
  position: string;
  points: number;
  goals: number;
  trophies: string[];
  isPlayer: boolean;
}

export interface BallonDorResult {
  year: number;
  nominees: BallonDorNominee[];
  playerRank: number | null; // 1-10 if nominated, null if not
  playerPoints: number;
  playerNominated: boolean;
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

/* ─── Legacy System ─── */
export type LegacyTier = "GOAT" | "LEGEND" | "GREAT" | "SOLID PRO" | "JOURNEYMAN";
export interface LegacyResult {
  score: number;
  tier: LegacyTier;
  breakdown: { label: string; points: number }[];
}

export type PostRetirementChoice = "retire" | "manager" | "pundit" | "owner";

/* ─── Pundit System ─── */
export interface PunditState {
  season: number;
  predictions: { season: number; prediction: string; cameTrue: boolean }[];
  controversies: number;
  legacyBonus: number;
  followerGains: number;
}

/* ─── Club Owner System ─── */
export interface OwnerState {
  club: string;
  clubTier: number;
  season: number;
  budget: number; // in millions
  trophies: number;
  promotions: number;
  seasonResults: { year: number; club: string; tier: number; result: string; trophy: boolean }[];
}

/* ─── Newspaper Article System ─── */
export interface NewsArticle {
  newspaper: string;
  headline: string;
  body: string;
  type: "positive" | "negative" | "transfer" | "milestone";
}

export interface ManagerState {
  club: string;
  clubTier: number;
  season: number;
  trophies: number;
  promotions: number;
  seasonResults: { year: number; club: string; tier: number; result: string; trophy: boolean }[];
  nationalTeamOffer: boolean;
  managingNationalTeam: boolean;
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

export type PrimeType = "early" | "normal" | "late" | "extended";

/* ─── Spending & Lifestyle System ─── */
export type SpendingCategory = "property" | "vehicle" | "investment" | "lifestyle";

export interface SpendingItem {
  id: string;
  name: string;
  emoji: string;
  category: SpendingCategory;
  cost: number; // in millions
  monthlyCost?: number; // in millions per year (ongoing)
  description: string;
  oneTime: boolean; // can only buy once?
  minNetWorth?: number; // minimum net worth to unlock
  effect?: string; // description of gameplay effect
}

export interface InvestmentHolding {
  id: string;
  name: string;
  invested: number; // in millions
  yearPurchased: number;
  resolved: boolean;
  returnAmount: number; // in millions (0 if not resolved)
}

export const SPENDING_ITEMS: SpendingItem[] = [
  // Properties
  { id: "rent_apartment", name: "Rent Apartment", emoji: "🏢", category: "property", cost: 0, monthlyCost: 0.024, description: "Basic city apartment — €2k/month", oneTime: true },
  { id: "city_apartment", name: "City Apartment", emoji: "🏙️", category: "property", cost: 0.8, description: "Buy a stylish city apartment — €800k", oneTime: true, minNetWorth: 0.5 },
  { id: "luxury_house", name: "Luxury House", emoji: "🏠", category: "property", cost: 3, description: "Buy a luxury house — €3M", oneTime: true, minNetWorth: 2 },
  { id: "mansion", name: "Mansion", emoji: "🏰", category: "property", cost: 8, description: "Buy a sprawling mansion — €8M", oneTime: true, minNetWorth: 5 },
  { id: "private_island", name: "Private Island", emoji: "🏝️", category: "property", cost: 25, description: "Buy your own private island — €25M", oneTime: true, minNetWorth: 20 },
  // Vehicles
  { id: "sports_car", name: "Sports Car", emoji: "🏎️", category: "vehicle", cost: 0.15, description: "Buy a sports car — €150k", oneTime: false },
  { id: "supercar_collection", name: "Supercar Collection", emoji: "🚗", category: "vehicle", cost: 0.8, description: "Build a supercar collection — €800k", oneTime: true, minNetWorth: 1 },
  { id: "private_jet", name: "Private Jet", emoji: "✈️", category: "vehicle", cost: 15, monthlyCost: 0.5, description: "Buy a private jet — €15M + €500k/yr upkeep", oneTime: true, minNetWorth: 12 },
  { id: "yacht", name: "Yacht", emoji: "🛥️", category: "vehicle", cost: 8, monthlyCost: 0.3, description: "Buy a luxury yacht — €8M + €300k/yr upkeep", oneTime: true, minNetWorth: 6 },
  // Investments
  { id: "restaurant_chain", name: "Restaurant Chain", emoji: "🍽️", category: "investment", cost: 0.5, description: "30% chance profit €1.5M, 70% break even or loss", oneTime: false },
  { id: "crypto", name: "Crypto", emoji: "₿", category: "investment", cost: 0.2, description: "50% chance 3x return, 50% lose it all", oneTime: false },
  { id: "football_shares", name: "Football Club Shares", emoji: "⚽", category: "investment", cost: 5, description: "Steady 8% return per year", oneTime: true, minNetWorth: 4 },
  { id: "tech_startup", name: "Tech Startup", emoji: "💻", category: "investment", cost: 1, description: "20% chance 10x return, 80% lose it", oneTime: false },
  // Lifestyle upgrades
  { id: "personal_chef", name: "Personal Chef", emoji: "👨‍🍳", category: "lifestyle", cost: 0, monthlyCost: 0.05, description: "Hire a personal chef — €50k/year", oneTime: true, effect: "Better nutrition, +2 morale per season" },
  { id: "personal_trainer", name: "Personal Trainer", emoji: "💪", category: "lifestyle", cost: 0, monthlyCost: 0.08, description: "Private trainer — €80k/year", oneTime: true, effect: "+1 Physical stat per season" },
  { id: "sports_psychologist", name: "Sports Psychologist", emoji: "🧠", category: "lifestyle", cost: 0, monthlyCost: 0.06, description: "Mental coach — €60k/year", oneTime: true, effect: "+5 Morale permanently on hire" },
  { id: "elite_recovery", name: "Elite Recovery Clinic", emoji: "🏥", category: "lifestyle", cost: 0, monthlyCost: 0.1, description: "Top recovery tech — €100k/year", oneTime: true, effect: "Reduces injury recovery time by 50%" },
];

export function getSpendingItem(id: string): SpendingItem | undefined {
  return SPENDING_ITEMS.find(i => i.id === id);
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
  phase: "youth" | "contract_offer" | "playing" | "newspaper" | "season_summary" | "transfer_window" | "random_events" | "international_debut" | "world_cup" | "rivalry_event" | "ballon_dor" | "retirement_ceremony" | "retirement_suggestion" | "post_retirement" | "manager_season" | "pundit_season" | "owner_season" | "social_media_action" | "moral_dilemma" | "red_card_appeal_result" | "retired";
  pendingAppealResult: { success: boolean; banLength: number } | null;
  pendingNews: NewsArticle[];
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
  // Spending system
  purchasedItems: string[]; // item IDs that have been bought
  investmentHoldings: InvestmentHolding[];
  totalAssetValue: number; // value of all owned properties + vehicles + investments
  customYearlyCosts: number; // yearly costs from purchased lifestyle items
  // Ballon d'Or & Awards
  awards: Award[];
  pendingBallonDor: BallonDorResult | null;
  lastUCLResult: UCLResult | null;
  // Retirement & Legacy
  legacy: LegacyResult | null;
  postRetirementChoice: PostRetirementChoice | null;
  managerState: ManagerState | null;
  punditState: PunditState | null;
  ownerState: OwnerState | null;
  isFinalSeason: boolean;
  isPundit: boolean;
  punditEvents: string[];
  primeType: PrimeType;
  peakOverall: number;
  retirementSuggested: boolean; // has the player been shown the retirement suggestion
  // Social media action system
  socialMediaActionUsedThisSeason: boolean;
  socialMediaFocusBoost: boolean; // "Stay off social media" gives +2 all stats next season
  pendingFifaCoverEvent: boolean;
  fifaCoverAccepted: boolean;
  activeSponsorship: SponsorshipTier | null;
  // Moral dilemma system
  moralDilemmasTriggered: string[];
  pendingMoralDilemma: MoralDilemma | null;
  pedSeasonsRemaining: number;
  pedActive: boolean;
  matchFixBanned: number;
  divingActive: boolean;
  integrityBonus: number;
  childEventsSeen: string[]; // track which child follow-up events have been shown
  pregnancyAnnounced: boolean;
}

/* ─── Moral Dilemma System ─── */
export interface MoralDilemmaChoice {
  label: string;
  emoji: string;
  consequence: string;
  risk?: string; // e.g. "30% chance of getting caught"
}

export interface MoralDilemma {
  id: string;
  emoji: string;
  title: string;
  description: string;
  choices: MoralDilemmaChoice[];
}

export const MORAL_DILEMMAS: MoralDilemma[] = [
  {
    id: "match_fixing",
    emoji: "🎰",
    title: "MATCH FIXING",
    description: "A mysterious figure approaches you before a big match. He offers €5M to intentionally perform poorly. The money would be untraceable. No one would ever know... probably.",
    choices: [
      { label: "Accept the money", emoji: "💰", consequence: "€5M added to your accounts", risk: "30% chance of investigation" },
      { label: "Refuse and report it", emoji: "🛡️", consequence: "Reputation +20, Legacy +10, Fair Play Award" },
      { label: "Refuse silently", emoji: "🤐", consequence: "Walk away. Nothing happens." },
    ],
  },
  {
    id: "ped_offer",
    emoji: "💉",
    title: "PERFORMANCE ENHANCING DRUGS",
    description: "Your fitness coach pulls you aside after training. He offers you an 'undetectable' substance that will boost all your stats by +5 for 3 seasons. \"Every top player does it,\" he whispers.",
    choices: [
      { label: "Take the substance", emoji: "💊", consequence: "All stats +5 for 3 seasons", risk: "20% chance of failed test each season" },
      { label: "Refuse", emoji: "✋", consequence: "Morale -5, but integrity +10 legacy bonus at retirement" },
    ],
  },
  {
    id: "diving_reputation",
    emoji: "🤿",
    title: "DIVING REPUTATION",
    description: "You've developed a reputation for simulation. Journalists are running front-page stories about your theatrical falls in the box. Pundits are calling you 'the greatest actor in football.'",
    choices: [
      { label: "Embrace the dark arts", emoji: "🎭", consequence: "+2 goals per season from penalties, but reputation -15" },
      { label: "Clean up your game", emoji: "🤝", consequence: "Reputation +10, eligible for Fair Play Award" },
      { label: "Ignore the noise", emoji: "🔇", consequence: "No change — let them talk" },
    ],
  },
  {
    id: "agent_corruption",
    emoji: "🕴️",
    title: "AGENT CORRUPTION",
    description: "Your accountant discovers your agent has been taking 20% commission instead of the agreed 10% for the last 3 years. That's millions stolen from you. He's sitting in your living room, sweating.",
    choices: [
      { label: "Fire him and sue", emoji: "⚖️", consequence: "Legal costs €500k, but recover the stolen money" },
      { label: "Keep him — he gets results", emoji: "🤝", consequence: "Accept the loss, maintain relationship" },
      { label: "Renegotiate to 12%", emoji: "📝", consequence: "Agent stays at 12%, partial money back" },
    ],
  },
];

export function applyMoralDilemmaChoice(prev: CareerState, choiceIndex: number): CareerState {
  const s = { ...prev };
  const dilemma = s.pendingMoralDilemma;
  if (!dilemma) return s;

  s.pendingMoralDilemma = null;

  switch (dilemma.id) {
    case "match_fixing": {
      if (choiceIndex === 0) {
        // Accept
        s.netWorth = Math.round((s.netWorth + 5) * 100) / 100;
        s.events = [...s.events, "🎰 Accepted €5M to fix a match..."];
        if (Math.random() < 0.30) {
          // Caught!
          s.matchFixBanned = 2;
          s.popularity = clamp(s.popularity - 40, 0, 100);
          s.morale = clamp(s.morale - 30, 0, 100);
          s.integrityBonus -= 30;
          s.netWorth = Math.round((s.netWorth - 5) * 100) / 100; // fine
          s.events = [...s.events, "🚨 CAUGHT! Match-fixing investigation found you guilty. 2-season ban! Legacy -30, reputation destroyed."];
          s.socialMediaFollowers = Math.max(0, s.socialMediaFollowers - 5);
        } else {
          s.events = [...s.events, "💰 The money arrived. No one suspects a thing... for now."];
        }
      } else if (choiceIndex === 1) {
        // Report
        s.popularity = clamp(s.popularity + 20, 0, 100);
        s.integrityBonus += 10;
        s.morale = clamp(s.morale + 10, 0, 100);
        s.awards = [...s.awards, { year: s.seasons[s.seasons.length - 1]?.year || 2024, name: "Fair Play Award", emoji: "🛡️" }];
        s.events = [...s.events, "🛡️ Reported the match fixers. Awarded the Fair Play Award! Reputation +20, Legacy +10"];
      } else {
        // Silent
        s.events = [...s.events, "🤐 Walked away from the offer silently."];
      }
      break;
    }
    case "ped_offer": {
      if (choiceIndex === 0) {
        // Take PEDs
        s.pedActive = true;
        s.pedSeasonsRemaining = 3;
        for (const k of ["pace", "shooting", "passing", "dribbling", "defending", "physical", "reflexes"] as const) {
          (s as any)[k] = clamp((s as any)[k] + 5, 20, 99);
        }
        s.overall = calcOverall(s, s.position);
        s.events = [...s.events, "💊 Started taking performance enhancing substances. All stats +5."];
      } else {
        // Refuse
        s.morale = clamp(s.morale - 5, 0, 100);
        s.integrityBonus += 10;
        s.events = [...s.events, "✋ Refused performance enhancing drugs. Integrity preserved. Legacy +10 at retirement."];
      }
      break;
    }
    case "diving_reputation": {
      if (choiceIndex === 0) {
        // Embrace
        s.divingActive = true;
        s.popularity = clamp(s.popularity - 15, 0, 100);
        s.events = [...s.events, "🎭 Embraced diving. +2 goals/season from penalties, but reputation -15."];
      } else if (choiceIndex === 1) {
        // Clean up
        s.popularity = clamp(s.popularity + 10, 0, 100);
        s.integrityBonus += 5;
        s.events = [...s.events, "🤝 Cleaned up your game. Reputation +10, Fair Play eligible."];
      } else {
        // Ignore
        s.events = [...s.events, "🔇 Ignored the diving allegations. Business as usual."];
      }
      break;
    }
    case "agent_corruption": {
      const stolenAmount = Math.round((s.totalEarnings * 0.10) * 100) / 100; // 10% of career earnings stolen
      const recoveredAmount = Math.min(stolenAmount, 3); // cap at 3M
      if (choiceIndex === 0) {
        // Fire and sue
        s.netWorth = Math.round((s.netWorth - 0.5 + recoveredAmount) * 100) / 100;
        s.events = [...s.events, `⚖️ Fired agent and sued! Legal costs €500k, recovered €${recoveredAmount.toFixed(1)}M.`];
        s.morale = clamp(s.morale + 5, 0, 100);
      } else if (choiceIndex === 1) {
        // Keep him
        s.events = [...s.events, "🤝 Kept the agent despite the theft. He does get results..."];
        s.morale = clamp(s.morale - 5, 0, 100);
      } else {
        // Renegotiate
        s.netWorth = Math.round((s.netWorth + recoveredAmount * 0.3) * 100) / 100;
        s.events = [...s.events, `📝 Renegotiated agent deal to 12%. Recovered €${(recoveredAmount * 0.3).toFixed(1)}M.`];
      }
      break;
    }
  }

  // Stay on moral_dilemma phase — UI calls dismissMoralDilemma to continue
  s.phase = "moral_dilemma";
  return s;
}

export function dismissMoralDilemma(prev: CareerState, clubs: ClubData[]): CareerState {
  const s = { ...prev };
  s.pendingMoralDilemma = null;
  // Continue to random events → transfer window
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

function tryTriggerMoralDilemma(s: CareerState): boolean {
  if (s.age < 20 || s.retired) return false;
  // Max 2 dilemmas per career
  if (s.moralDilemmasTriggered.length >= 2) return false;
  // ~12% chance per season after age 20 (gets ~1-2 over a 15-year career)
  if (Math.random() > 0.12) return false;
  
  const available = MORAL_DILEMMAS.filter(d => !s.moralDilemmasTriggered.includes(d.id));
  if (available.length === 0) return false;
  
  // Filter contextually
  const eligible = available.filter(d => {
    if (d.id === "match_fixing" && s.currentClubTier > 2) return false; // only big clubs
    if (d.id === "ped_offer" && s.overall > 90) return false; // already elite
    if (d.id === "diving_reputation" && s.position === "GK") return false;
    if (d.id === "agent_corruption" && s.totalEarnings < 5) return false; // need some earnings
    return true;
  });
  if (eligible.length === 0) return false;

  s.pendingMoralDilemma = pick(eligible);
  s.moralDilemmasTriggered = [...s.moralDilemmasTriggered, s.pendingMoralDilemma.id];
  return true;
}

/* ─── Social Media Action System ─── */
export interface SocialMediaAction {
  id: string;
  label: string;
  emoji: string;
  description: string;
  followerGain: [number, number]; // [min, max] in raw followers
  reputationChange: number;
  extraEffect?: string;
}

export type SponsorshipTier = "local_brand" | "nike_adidas" | "global_ambassador" | "merchandise_line" | "fifa_cover";

export const SOCIAL_MEDIA_ACTIONS: SocialMediaAction[] = [
  { id: "training_video", label: "Post training video", emoji: "🏋️", description: "Show off your skills in the gym", followerGain: [50_000, 200_000], reputationChange: 0 },
  { id: "viral_celebration", label: "Go viral with celebration clip", emoji: "🎬", description: "Post an iconic goal celebration", followerGain: [500_000, 2_000_000], reputationChange: 0 },
  { id: "controversial_opinion", label: "Post controversial opinion", emoji: "🔥", description: "Share a hot take about football", followerGain: [1_000_000, 1_000_000], reputationChange: -10, extraEffect: "Reputation -10" },
  { id: "charity_work", label: "Announce charity work", emoji: "❤️", description: "Highlight your philanthropic efforts", followerGain: [200_000, 200_000], reputationChange: 15, extraEffect: "Reputation +15" },
  { id: "personal_life", label: "Post about personal life", emoji: "📸", description: "Share a glimpse into your life off the pitch", followerGain: [300_000, 300_000], reputationChange: 0 },
  { id: "troll_rival", label: "Troll your rival on social media", emoji: "😈", description: "Take a shot at your rival online", followerGain: [800_000, 800_000], reputationChange: 0, extraEffect: "Rivalry intensity increases" },
  { id: "stay_off", label: "Stay off social media", emoji: "🧘", description: "Focus on football — no distractions", followerGain: [0, 0], reputationChange: 0, extraEffect: "+2 to all stats next season" },
];

export const SPONSORSHIP_TIERS: { tier: SponsorshipTier; name: string; emoji: string; minFollowers: number; income: number }[] = [
  { tier: "local_brand", name: "Local Brand Deal", emoji: "🏪", minFollowers: 1_000_000, income: 0.5 },
  { tier: "nike_adidas", name: "Nike / Adidas Deal", emoji: "👟", minFollowers: 5_000_000, income: 3 },
  { tier: "global_ambassador", name: "Global Brand Ambassador", emoji: "🌍", minFollowers: 15_000_000, income: 8 },
  { tier: "merchandise_line", name: "Own Merchandise Line", emoji: "👕", minFollowers: 30_000_000, income: 15 },
  { tier: "fifa_cover", name: "FIFA Cover Athlete", emoji: "🎮", minFollowers: 50_000_000, income: 25 },
];

function getActiveSponsorshipTier(followers: number): SponsorshipTier | null {
  let best: SponsorshipTier | null = null;
  for (const t of SPONSORSHIP_TIERS) {
    if (followers >= t.minFollowers) best = t.tier;
  }
  return best;
}

function getSponsorshipIncome(tier: SponsorshipTier | null): number {
  if (!tier) return 0;
  const t = SPONSORSHIP_TIERS.find(s => s.tier === tier);
  return t?.income || 0;
}

export function applySocialMediaAction(prev: CareerState, actionId: string): CareerState {
  const s = { ...prev };
  const action = SOCIAL_MEDIA_ACTIONS.find(a => a.id === actionId);
  if (!action || s.socialMediaActionUsedThisSeason) return s;

  s.socialMediaActionUsedThisSeason = true;

  if (actionId === "stay_off") {
    s.socialMediaFocusBoost = true;
    s.events = [...s.events, "🧘 Stayed off social media — focus boost for next season (+2 all stats)"];
  } else {
    const gain = action.followerGain[0] === action.followerGain[1]
      ? action.followerGain[0]
      : rand(action.followerGain[0], action.followerGain[1]);
    s.socialMediaFollowers = Math.round((s.socialMediaFollowers + gain / 1_000_000) * 100) / 100;
    s.events = [...s.events, `📱 ${action.emoji} ${action.label} — gained ${(gain / 1_000_000).toFixed(1)}M followers!`];

    if (action.reputationChange !== 0) {
      s.popularity = clamp(s.popularity + action.reputationChange, 0, 100);
      if (action.reputationChange > 0) s.events = [...s.events, `✨ Reputation +${action.reputationChange}`];
      else s.events = [...s.events, `⚠️ Reputation ${action.reputationChange}`];
    }

    if (actionId === "troll_rival" && s.rival && !s.rival.retired) {
      s.events = [...s.events, `😤 Rivalry with ${s.rival.name} intensifies!`];
    }
  }

  // Update sponsorship tier
  const newTier = getActiveSponsorshipTier(s.socialMediaFollowers * 1_000_000);
  if (newTier && newTier !== s.activeSponsorship) {
    const tierInfo = SPONSORSHIP_TIERS.find(t => t.tier === newTier)!;
    s.activeSponsorship = newTier;
    s.events = [...s.events, `${tierInfo.emoji} NEW SPONSORSHIP: ${tierInfo.name} — €${tierInfo.income}M/year!`];
  }

  // FIFA Cover event check
  if (s.socialMediaFollowers * 1_000_000 >= 50_000_000 && s.overall >= 90 && !s.fifaCoverAccepted && !s.pendingFifaCoverEvent) {
    s.pendingFifaCoverEvent = true;
  }

  // If FIFA cover event triggered, stay on social media action phase to show it
  if (s.pendingFifaCoverEvent) {
    s.phase = "social_media_action";
  } else {
    // Mark as needing to continue via dismissSocialMediaPhase
    s.phase = "social_media_action";
  }
  return s;
}

export function handleFifaCoverDecision(prev: CareerState, accept: boolean): CareerState {
  const s = { ...prev };
  s.pendingFifaCoverEvent = false;
  if (accept) {
    s.fifaCoverAccepted = true;
    s.netWorth = Math.round((s.netWorth + 25) * 100) / 100;
    s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 5) * 100) / 100;
    s.events = [...s.events, "🎮 Became the FIFA Cover Athlete! €25M + 5M followers + Legacy +10"];
    s.awards = [...s.awards, { year: s.seasons[s.seasons.length - 1]?.year || 2024, name: "FIFA Cover Athlete", emoji: "🎮" }];
  } else {
    s.popularity = clamp(s.popularity + 5, 0, 100);
    s.events = [...s.events, "🎮 Declined FIFA cover — gained respect for being selective. Reputation +5"];
  }
  // Will continue via dismissSocialMediaPhase
  s.phase = "social_media_action";
  return s;
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

export function getYouthAcademyClub(clubs: ClubData[], nationality: string, overall?: number): ClubData {
  const ovr = overall ?? 50;
  
  if (ovr >= 75) {
    // Elite: top 6 club from player's country, or any elite club
    const eliteFromHome = clubs.filter(c => c.country === nationality && c.tier === 1 && ELITE_CLUBS.includes(c.name));
    if (eliteFromHome.length > 0) return pick(eliteFromHome);
    const anyT1Home = clubs.filter(c => c.country === nationality && c.tier === 1);
    if (anyT1Home.length > 0) return pick(anyT1Home);
    const anyElite = clubs.filter(c => ELITE_CLUBS.includes(c.name));
    if (anyElite.length > 0) return pick(anyElite);
    return pick(getClubsByTier(clubs, 1));
  }
  if (ovr >= 66) {
    // Good club academy (Tier 1-2)
    const homeTiers = clubs.filter(c => c.country === nationality && (c.tier === 1 || c.tier === 2));
    if (homeTiers.length > 0) return pick(homeTiers);
    const anyT1T2 = clubs.filter(c => c.tier === 1 || c.tier === 2);
    if (anyT1T2.length > 0) return pick(anyT1T2);
    return pick(getClubsByTier(clubs, 2));
  }
  if (ovr >= 55) {
    // Mid league academy (Tier 2-3)
    const homeTiers = clubs.filter(c => c.country === nationality && (c.tier === 2 || c.tier === 3));
    if (homeTiers.length > 0) return pick(homeTiers);
    const anyT2T3 = clubs.filter(c => c.tier === 2 || c.tier === 3);
    if (anyT2T3.length > 0) return pick(anyT2T3);
    return pick(getClubsByTier(clubs, 3));
  }
  if (ovr >= 40) {
    // Lower league (Tier 3-4)
    const homeClubs = clubs.filter(c => c.country === nationality && c.tier >= 3);
    if (homeClubs.length > 0) return pick(homeClubs);
    const anyT3T4 = clubs.filter(c => c.tier >= 3);
    if (anyT3T4.length > 0) return pick(anyT3T4);
    return pick(getClubsByTier(clubs, 4));
  }
  // 25-39: Tiny non-league (Tier 4)
  const homeT4 = clubs.filter(c => c.country === nationality && c.tier === 4);
  if (homeT4.length > 0) return pick(homeT4);
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

/* ─── Prime window helpers ─── */
function rollPrimeType(): PrimeType {
  const r = Math.random();
  if (r < 0.25) return "early";
  if (r < 0.65) return "normal";
  if (r < 0.90) return "late";
  return "extended";
}

function isInPrime(age: number, primeType: PrimeType): boolean {
  switch (primeType) {
    case "early": return age >= 22 && age <= 26;
    case "normal": return age >= 24 && age <= 28;
    case "late": return age >= 27 && age <= 31;
    case "extended": return age >= 23 && age <= 32;
  }
}

function isPastPrime(age: number, primeType: PrimeType): boolean {
  switch (primeType) {
    case "early": return age > 26;
    case "normal": return age > 28;
    case "late": return age > 31;
    case "extended": return age > 32;
  }
}

/* ─── Stat progression with prime system ─── */
function growStat(current: number, age: number, isYouth: boolean, isPace: boolean, primeType: PrimeType): number {
  let growth: number;
  if (isYouth) {
    growth = rand(2, 4);
  } else if (isInPrime(age, primeType)) {
    growth = rand(2, 4); // Prime phase — strong growth
  } else if (!isPastPrime(age, primeType)) {
    // Pre-prime professional years — moderate growth
    growth = rand(1, 3);
  } else {
    // Post-prime — decline starts at 32, accelerates after 35
    if (age >= 40) {
      growth = rand(-7, -4); // Extreme decline 40+
    } else if (age >= 38) {
      growth = rand(-6, -3); // Very sharp decline 38-39
    } else if (age >= 35) {
      growth = rand(-5, -2); // Accelerated decline 35-37
    } else if (age >= 32) {
      growth = rand(-3, -1); // Natural decline begins 32-34
    } else {
      const primeEnd = primeType === "early" ? 26 : primeType === "normal" ? 28 : primeType === "late" ? 31 : 32;
      const yearsPost = age - primeEnd;
      if (yearsPost <= 2) {
        growth = rand(-2, 0); // Gentle decline
      } else {
        growth = rand(-3, -1); // Moderate decline
      }
    }
  }
  // Pace always declines 1 extra from age 28+, and additional penalty at 35+
  if (isPace && age >= 28 && !isYouth) {
    growth -= 1;
    if (age >= 35) growth -= 1; // Extra pace loss after 35
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

/* ─── Market value per exact user table ─── */
function calcMarketValue(overall: number, age: number, _position: string, _socialMediaFollowers?: number): number {
  let minVal: number, maxVal: number;

  if (overall >= 95) {
    if (age >= 20 && age <= 28) { minVal = 280; maxVal = 400; }
    else if (age >= 29 && age <= 31) { minVal = 180; maxVal = 280; }
    else if (age >= 32 && age <= 34) { minVal = 80; maxVal = 150; }
    else if (age >= 35) { minVal = 20; maxVal = 60; }
    else { minVal = 100; maxVal = 200; } // Under 20
  } else if (overall >= 90) {
    if (age >= 20 && age <= 28) { minVal = 160; maxVal = 260; }
    else if (age >= 29 && age <= 31) { minVal = 100; maxVal = 180; }
    else if (age >= 32 && age <= 34) { minVal = 40; maxVal = 90; }
    else if (age >= 35) { minVal = 10; maxVal = 35; }
    else { minVal = 60; maxVal = 120; }
  } else if (overall >= 85) {
    if (age >= 20 && age <= 28) { minVal = 80; maxVal = 140; }
    else if (age >= 29 && age <= 31) { minVal = 50; maxVal = 100; }
    else if (age >= 32 && age <= 34) { minVal = 20; maxVal = 55; }
    else if (age >= 35) { minVal = 5; maxVal = 20; }
    else { minVal = 30; maxVal = 70; }
  } else if (overall >= 80) {
    if (age >= 20 && age <= 28) { minVal = 40; maxVal = 80; }
    else if (age >= 29 && age <= 31) { minVal = 25; maxVal = 55; }
    else if (age >= 32 && age <= 34) { minVal = 10; maxVal = 30; }
    else if (age >= 35) { minVal = 3; maxVal = 12; }
    else { minVal = 15; maxVal = 40; }
  } else if (overall >= 75) {
    if (age >= 20 && age <= 28) { minVal = 20; maxVal = 45; }
    else if (age >= 29 && age <= 31) { minVal = 10; maxVal = 25; }
    else if (age >= 32 && age <= 34) { minVal = 5; maxVal = 15; }
    else if (age >= 35) { minVal = 1; maxVal = 8; }
    else { minVal = 8; maxVal = 25; }
  } else if (overall >= 70) {
    if (age <= 28) { minVal = 8; maxVal = 25; }
    else if (age <= 31) { minVal = 4; maxVal = 14; }
    else { minVal = 1; maxVal = 6; }
  } else if (overall >= 65) {
    if (age <= 28) { minVal = 3; maxVal = 12; }
    else { minVal = 0.5; maxVal = 5; }
  } else {
    minVal = 0.1; maxVal = Math.max(0.5, overall * 0.05);
  }

  const value = minVal + Math.random() * (maxVal - minVal);
  return Math.max(0.1, Math.round(value * 10) / 10);
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

function calcSponsorshipIncome(popularity: number, socialMediaFollowers: number, sponsorDeal: string | null, activeSponsorship?: SponsorshipTier | null): number {
  let income = 0;
  // Base sponsorship from popularity
  if (popularity >= 80) income += 2;
  else if (popularity >= 60) income += 1;
  else if (popularity >= 40) income += 0.3;
  // Social media income
  income += socialMediaFollowers * 0.1; // €100k per 1M followers
  // Named sponsor deal (legacy)
  if (sponsorDeal === "Nike") income += 2;
  else if (sponsorDeal === "Adidas") income += 1.5;
  // Tiered sponsorship from social media actions
  income += getSponsorshipIncome(activeSponsorship || null);
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
  s.sponsorshipIncome = calcSponsorshipIncome(s.popularity, s.socialMediaFollowers, s.sponsorDeal, s.activeSponsorship);
  const totalIncome = wageIncome + s.sponsorshipIncome;
  // Lifestyle cost (auto + custom spending)
  s.lifestyleLevel = calcLifestyleLevel(s.netWorth + (s.totalAssetValue || 0));
  s.lifestyleCostPerYear = calcLifestyleCost(s.lifestyleLevel) + (s.customYearlyCosts || 0);
  // Net
  const netThisYear = totalIncome - s.lifestyleCostPerYear;
  s.netWorth = Math.round((s.netWorth + netThisYear) * 100) / 100;
  s.totalEarnings = Math.round((s.totalEarnings + totalIncome) * 100) / 100;
  // Resolve investments
  resolveInvestments(s);
  // Update total assets
  s.totalAssetValue = calcTotalAssets(s);
  // Social media
  const smGrowth = growSocialMedia(s, season);
  s.socialMediaFollowers = Math.round((s.socialMediaFollowers + smGrowth) * 100) / 100;
  // Lifestyle effects: personal chef gives morale
  if (s.purchasedItems.includes("personal_chef")) {
    s.morale = clamp(s.morale + 2, 0, 100);
  }
  // Deficit tracking
  if (netThisYear < 0) {
    s.consecutiveDeficitYears += 1;
  } else {
    s.consecutiveDeficitYears = 0;
  }
  // Financial crisis — also triggered by negative net worth
  if (s.consecutiveDeficitYears >= 3 || s.netWorth < -2) {
    s.events.push("💸 FINANCIAL CRISIS — Spending exceeds income! Forced to sell assets.");
    s.netWorth = Math.max(0, s.netWorth);
    s.lifestyleLevel = "Humble";
    s.lifestyleCostPerYear = 0.05;
    s.properties = [];
    s.purchasedItems = s.purchasedItems.filter(id => {
      const item = getSpendingItem(id);
      return item?.category === "lifestyle"; // keep lifestyle upgrades
    });
    s.customYearlyCosts = s.purchasedItems.reduce((sum, id) => {
      const item = getSpendingItem(id);
      return sum + (item?.monthlyCost || 0);
    }, 0);
    s.totalAssetValue = 0;
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
  // Pregnancy announcement (ages 23-30, in a relationship)
  if ((s.hasRelationship || s.family.isMarried) && !s.family.isDivorced && !s.pregnancyAnnounced && s.family.children < 3 && s.age >= 23 && s.age <= 30 && Math.random() < 0.2) {
    s.pregnancyAnnounced = true;
    s.morale = clamp(s.morale + 5, 0, 100);
    s.events.push("🤰 Your partner is pregnant. You are going to be a parent!");
    s.socialMediaFollowers += 0.3;
  }
  // Birth (season after pregnancy announced)
  else if (s.pregnancyAnnounced) {
    s.pregnancyAnnounced = false;
    s.family = { ...s.family, children: s.family.children + 1 };
    s.morale = clamp(s.morale + 10, 0, 100);
    s.socialMediaFollowers += 0.5;
    s.events.push(`👶 Your child is born. Congratulations! (${s.family.children} total) Morale +10, Legacy +5`);
    // Legacy +5 added via integrityBonus as a proxy
    s.integrityBonus += 5;
  }
  // Follow-up child events
  if (s.family.children >= 1 && Math.random() < 0.2) {
    const childEvents = [
      { id: "first_steps", emoji: "👣", text: "Your child's first steps! A moment you'll never forget.", morale: 3 },
      { id: "follow_footsteps", emoji: "⚽", text: "Your child wants to follow in your footsteps and become a footballer.", morale: 5 },
      { id: "watches_trophy", emoji: "🏆", text: "Your child watches you win a trophy — pure joy on their face!", morale: 8 },
    ];
    const available = childEvents.filter(e => !s.childEventsSeen.includes(e.id));
    if (available.length > 0) {
      const ev = available[Math.floor(Math.random() * available.length)];
      s.childEventsSeen = [...s.childEventsSeen, ev.id];
      s.morale = clamp(s.morale + ev.morale, 0, 100);
      s.events.push(`${ev.emoji} ${ev.text} Morale +${ev.morale}`);
    }
  }
  // Multiple children event
  if (s.family.children >= 2 && Math.random() < 0.15 && !s.childEventsSeen.includes("juggling_family")) {
    s.childEventsSeen = [...s.childEventsSeen, "juggling_family"];
    s.morale = clamp(s.morale + 3, 0, 100);
    s.events.push("👨‍👩‍👧‍👦 Juggling family life and football is tough but rewarding. Morale +3");
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

/* ─── Purchase spending item ─── */
export function purchaseSpendingItem(prev: CareerState, itemId: string): CareerState {
  const item = getSpendingItem(itemId);
  if (!item) return prev;
  const s = { ...prev, events: [...prev.events], purchasedItems: [...prev.purchasedItems], properties: [...prev.properties], investments: [...prev.investments], investmentHoldings: [...prev.investmentHoldings] };
  
  // Check if already owned (one-time items)
  if (item.oneTime && s.purchasedItems.includes(itemId)) return prev;
  
  // Check if can afford
  if (item.cost > 0 && s.netWorth < item.cost * 0.5) return prev; // need at least half net worth
  
  // Deduct cost
  s.netWorth = Math.round((s.netWorth - item.cost) * 100) / 100;
  s.purchasedItems.push(itemId);
  
  // Track in properties/investments arrays for display
  if (item.category === "property" || item.category === "vehicle") {
    s.properties.push(item.name);
  }
  if (item.category === "investment") {
    s.investments.push(item.name);
    const lastYear = s.seasons.length > 0 ? s.seasons[s.seasons.length - 1].year : 2020;
    s.investmentHoldings.push({
      id: itemId + "_" + Date.now(),
      name: item.name,
      invested: item.cost,
      yearPurchased: lastYear,
      resolved: false,
      returnAmount: 0,
    });
  }
  
  // Add ongoing costs
  if (item.monthlyCost) {
    s.customYearlyCosts = Math.round((s.customYearlyCosts + item.monthlyCost) * 1000) / 1000;
  }
  
  // Lifestyle effects
  if (itemId === "sports_psychologist") {
    s.morale = clamp(s.morale + 5, 0, 100);
    s.events.push("🧠 Hired a Sports Psychologist! +5 Morale permanently.");
  } else if (itemId === "personal_trainer") {
    s.events.push("💪 Hired a Personal Trainer! +1 Physical per season.");
  } else if (itemId === "elite_recovery") {
    s.events.push("🏥 Signed up for Elite Recovery Clinic! Injury recovery -50%.");
  } else if (itemId === "personal_chef") {
    s.events.push("👨‍🍳 Hired a Personal Chef! +2 Morale per season.");
  } else if (itemId === "rent_apartment" && item.cost === 0) {
    s.events.push("🏢 Renting a city apartment.");
  } else {
    s.events.push(`${item.emoji} Purchased ${item.name}! (€${item.cost >= 1 ? item.cost.toFixed(0) + "M" : Math.round(item.cost * 1000) + "k"})`);
  }
  
  // Update total asset value
  s.totalAssetValue = calcTotalAssets(s);
  s.lifestyleLevel = calcLifestyleLevel(s.netWorth + s.totalAssetValue);
  
  return s;
}

function calcTotalAssets(s: CareerState): number {
  let total = 0;
  // Properties & vehicles — appreciate/depreciate
  const propertyValues: Record<string, number> = {
    "city_apartment": 0.85, "luxury_house": 3.2, "mansion": 8.5, "private_island": 27,
    "sports_car": 0.1, "supercar_collection": 0.6, "private_jet": 10, "yacht": 5,
  };
  for (const id of s.purchasedItems) {
    if (propertyValues[id]) total += propertyValues[id];
  }
  // Unresolved investments at face value
  for (const h of s.investmentHoldings) {
    if (!h.resolved) total += h.invested;
  }
  return Math.round(total * 100) / 100;
}

function resolveInvestments(s: CareerState): void {
  for (let i = 0; i < s.investmentHoldings.length; i++) {
    const h = s.investmentHoldings[i];
    if (h.resolved) continue;
    const currentYear = s.seasons.length > 0 ? s.seasons[s.seasons.length - 1].year : 2020;
    const yearsHeld = currentYear - h.yearPurchased;
    
    if (h.name === "Football Club Shares") {
      // Steady 8% return per year — resolve as income, keep holding
      const yearlyReturn = h.invested * 0.08;
      s.netWorth = Math.round((s.netWorth + yearlyReturn) * 100) / 100;
      if (yearsHeld > 0 && yearsHeld % 1 === 0) {
        s.events.push(`⚽ Football Club Shares returned €${(yearlyReturn).toFixed(1)}M this year`);
      }
      continue; // never resolves — keeps paying
    }
    
    // Other investments resolve after 1-2 years
    if (yearsHeld < 1) continue;
    
    h.resolved = true;
    if (h.name === "Restaurant Chain") {
      if (Math.random() < 0.30) {
        h.returnAmount = 1.5;
        s.netWorth = Math.round((s.netWorth + h.returnAmount) * 100) / 100;
        s.events.push(`🍽️ Restaurant chain is thriving! Earned €${h.returnAmount.toFixed(1)}M profit!`);
      } else if (Math.random() < 0.5) {
        s.events.push("🍽️ Restaurant chain broke even. No profit, no loss.");
      } else {
        const loss = h.invested * 0.5;
        s.events.push(`🍽️ Restaurant chain struggling. Lost €${loss.toFixed(1)}M.`);
      }
    } else if (h.name === "Crypto") {
      if (Math.random() < 0.50) {
        h.returnAmount = h.invested * 3;
        s.netWorth = Math.round((s.netWorth + h.returnAmount) * 100) / 100;
        s.events.push(`₿ Crypto investment 3x'd! Earned €${h.returnAmount.toFixed(1)}M!`);
      } else {
        s.events.push("₿ Crypto investment crashed! Lost everything.");
      }
    } else if (h.name === "Tech Startup") {
      if (Math.random() < 0.20) {
        h.returnAmount = h.invested * 10;
        s.netWorth = Math.round((s.netWorth + h.returnAmount) * 100) / 100;
        s.events.push(`💻 Tech startup went viral! 10x return — €${h.returnAmount.toFixed(1)}M!`);
      } else {
        s.events.push("💻 Tech startup failed. Investment lost.");
      }
    }
  }
  // Remove old non-football resolved investments from the investments display
  s.investmentHoldings = s.investmentHoldings.filter(h => !h.resolved || h.name === "Football Club Shares");
}


const ELITE_CLUBS = ["Bayern Munich", "PSG", "Man City", "Real Madrid", "Barcelona", "Liverpool"];

/* ─── Appearances — league + UCL + cups for realistic totals ─── */
function calcAppearances(overall: number, clubTier: number, age: number, state?: CareerState): { apps: number; injured: boolean; injuryWeeks: number } {
  const clubAvg = clubAverageRating(clubTier);
  const diff = overall - clubAvg;

  const isEliteClub = state ? ELITE_CLUBS.includes(state.currentClub) : false;
  const seasonsAtClub = state ? state.seasons.filter(s => s.club === state.currentClub && s.type === "playing").length : 0;

  // --- League appearances (out of 38) ---
  let leagueMin: number, leagueMax: number;
  if (overall >= 95) { leagueMin = 34; leagueMax = 38; }
  else if (overall >= 90) { leagueMin = 32; leagueMax = 38; }
  else if (overall >= 85 && clubTier <= 2) { leagueMin = 30; leagueMax = 36; }
  else if (isEliteClub && diff <= -10) {
    if (seasonsAtClub === 0) { leagueMin = 8; leagueMax = 16; }
    else if (seasonsAtClub === 1) { leagueMin = 14; leagueMax = 22; }
    else { leagueMin = 12; leagueMax = 20; }
  } else if (isEliteClub && diff <= -5) {
    if (seasonsAtClub === 0) { leagueMin = 14; leagueMax = 22; }
    else { leagueMin = 20; leagueMax = 28; }
  } else if (diff >= 15) { leagueMin = 32; leagueMax = 38; }
  else if (diff >= 5) { leagueMin = 26; leagueMax = 34; }
  else if (diff >= -5) { leagueMin = 20; leagueMax = 30; }
  else { leagueMin = 8; leagueMax = 18; }

  let leagueApps = rand(leagueMin, leagueMax);

  // --- UCL appearances (0-13) — only Tier 1-2 clubs qualify ---
  let uclApps = 0;
  if (clubTier <= 2) {
    // Group stage: 6-8 games, knockouts add more
    const qualifies = clubTier === 1 ? true : Math.random() < 0.5;
    if (qualifies) {
      const groupApps = rand(6, 8);
      // Higher OVR players at top clubs go deeper
      const deepRunChance = overall >= 90 ? 0.7 : overall >= 85 ? 0.5 : 0.3;
      if (Math.random() < deepRunChance) {
        // Deep run: R16 + QF + SF + possibly Final = 4-5 more
        uclApps = groupApps + rand(3, 5);
      } else {
        // Group exit or R16 exit
        uclApps = groupApps + rand(0, 2);
      }
      // Reduce UCL apps for squad players
      if (leagueApps < 20) {
        uclApps = Math.round(uclApps * 0.5);
      }
    }
  }

  // --- Domestic cup appearances (0-7) ---
  let cupApps = 0;
  if (leagueApps >= 20) {
    // Starters play cups too
    cupApps = rand(3, 7);
  } else if (leagueApps >= 10) {
    cupApps = rand(2, 5);
  } else {
    cupApps = rand(1, 3);
  }

  let apps = leagueApps + uclApps + cupApps;

  let injured = false;
  let injuryWeeks = 0;
  if (Math.random() < 0.20) {
    injured = true;
    injuryWeeks = rand(2, 8);
    // Elite recovery clinic halves injury time
    if (state?.purchasedItems?.includes("elite_recovery")) {
      injuryWeeks = Math.max(1, Math.round(injuryWeeks * 0.5));
    }
    const missedApps = Math.round(injuryWeeks * apps / 46);
    apps = Math.max(1, apps - clamp(missedApps, 0, 12));
  }

  return { apps, injured, injuryWeeks };
}

/* ─── Goals per 38 apps by position & overall rating ─── */
function calcGoals(position: string, apps: number, overall?: number): number {
  const ovr = overall ?? 75;
  let lo: number, hi: number;

  switch (position) {
    case "ST":
      if (ovr >= 96) { lo = 35; hi = 48; }
      else if (ovr >= 93) { lo = 30; hi = 42; }
      else if (ovr >= 90) { lo = 25; hi = 35; }
      else if (ovr >= 85) { lo = 20; hi = 32; }
      else if (ovr >= 75) { lo = 12; hi = 22; }
      else if (ovr >= 65) { lo = 6; hi = 14; }
      else { lo = 3; hi = 8; }
      break;
    case "LW": case "RW":
      if (ovr >= 96) { lo = 32; hi = 45; }
      else if (ovr >= 93) { lo = 28; hi = 38; }
      else if (ovr >= 90) { lo = 22; hi = 32; }
      else if (ovr >= 85) { lo = 16; hi = 26; }
      else if (ovr >= 75) { lo = 8; hi = 16; }
      else if (ovr >= 65) { lo = 4; hi = 10; }
      else { lo = 2; hi = 6; }
      break;
    case "CAM":
      if (ovr >= 90) { lo = 14; hi = 22; }
      else if (ovr >= 85) { lo = 10; hi = 18; }
      else if (ovr >= 75) { lo = 6; hi = 12; }
      else { lo = 3; hi = 8; }
      break;
    case "CM":
      if (ovr >= 90) { lo = 6; hi = 12; }
      else { lo = 3; hi = 8; }
      break;
    case "CDM": lo = 1; hi = 4; break;
    case "CB": case "LB": case "RB": lo = 0; hi = 3; break;
    case "GK": return 0;
    default: lo = 0; hi = 3;
  }

  const rawGoals = Math.max(0, Math.round(rand(lo, hi) * apps / 38));

  // Floor for 90+ attackers in a full season (20+ apps)
  if (ovr >= 90 && apps >= 20 && ["ST", "LW", "RW", "CAM"].includes(position)) {
    return Math.max(15, rawGoals);
  }
  return rawGoals;
}

/* ─── Assists per 38 apps by position ─── */
function calcAssists(position: string, apps: number, overall?: number): number {
  const ovr = overall ?? 75;
  let lo: number, hi: number;

  if (ovr >= 90) {
    switch (position) {
      case "CAM": case "CM": lo = 15; hi = 22; break;
      case "LW": case "RW": lo = 12; hi = 18; break;
      case "ST": lo = 8; hi = 13; break;
      default: lo = 2; hi = 6;
    }
  } else {
    const per38: Record<string, [number, number]> = {
      CAM: [10, 18], LW: [8, 15], RW: [8, 15], CM: [5, 10],
      ST: [3, 8], CDM: [2, 6], CB: [1, 4], LB: [1, 4], RB: [1, 4], GK: [0, 0],
    };
    [lo, hi] = per38[position] || [1, 4];
  }
  return Math.max(0, Math.round(rand(lo, hi) * apps / 38));
}

/* ─── Season rating 1-10 ─── */
function calcSeasonRating(position: string, apps: number, goals: number, assists: number, cleanSheets: number, overall: number, clubTier: number): number {
  const clubAvg = clubAverageRating(clubTier);
  const diff = overall - clubAvg;
  let base = 6.0 + diff * 0.06;
  if (position === "GK") { base += cleanSheets * 0.08; }
  else if (["ST", "LW", "RW", "CAM"].includes(position)) { base += goals * 0.04 + assists * 0.03; }
  else { base += goals * 0.06 + assists * 0.04; }
  if (apps >= 30) base += 0.3;
  else if (apps < 15) base -= 0.4;
  base += (Math.random() - 0.5) * 0.8;
  return clamp(parseFloat(base.toFixed(1)), 3.0, 10.0);
}

/* ─── Season simulation ─── */
function generateSeasonStats(state: CareerState): SeasonRecord {
  const { position, age, overall, currentClubTier } = state;
  const isGK = position === "GK";
  const lastYear = state.seasons.length > 0 ? state.seasons[state.seasons.length - 1].year : 0;

  const { apps, injured, injuryWeeks } = calcAppearances(overall, currentClubTier, age, state);
  let goals = calcGoals(position, apps, overall);
  // Diving reputation: +2 goals from penalties
  if (state.divingActive && !isGK) goals += 2;
  const assists = calcAssists(position, apps, overall);
  const cleanSheets = isGK ? Math.round(apps * rand(20, 45) / 100) : 0;
  const yellowCards = rand(0, Math.min(8, Math.round(apps * 0.25)));
  const redCards = Math.random() < 0.08 ? 1 : 0;
  const rating = calcSeasonRating(position, apps, goals, assists, cleanSheets, overall, currentClubTier);

  // --- Trophy realism ---
  const isElite = ELITE_CLUBS.includes(state.currentClub);
  const performanceBoost = (overall >= 85 && rating >= 7.5) ? 0.15 :
                           (overall >= 80 && rating >= 7.0) ? 0.10 :
                           (overall >= 75 && rating >= 6.8) ? 0.05 : 0;

  let leagueChance: number, cupChance: number;
  if (isElite) { leagueChance = 0.65; cupChance = 0.35; }
  else if (currentClubTier === 1) { leagueChance = 0.25; cupChance = 0.20; }
  else if (currentClubTier === 2) { leagueChance = 0.10; cupChance = 0.15; }
  else { leagueChance = 0.03; cupChance = 0.05; }

  leagueChance = Math.min(0.85, leagueChance + performanceBoost);
  cupChance = Math.min(0.60, cupChance + performanceBoost);

  const winLeague = Math.random() < leagueChance;
  const winCup = Math.random() < cupChance;

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
  if (tier === 1) {
    if (overall >= 95) return rand(380000, 550000);
    if (overall >= 90) return rand(250000, 380000);
    if (overall >= 85) return rand(150000, 250000);
    if (overall >= 80) return rand(80000, 150000);
    return rand(30000, 80000);
  }
  if (tier === 2) {
    if (overall >= 85) return rand(70000, 120000);
    if (overall >= 80) return rand(40000, 80000);
    if (overall >= 75) return rand(20000, 50000);
    return rand(8000, 20000);
  }
  if (tier === 3) {
    if (overall >= 75) return rand(10000, 25000);
    return rand(5000, 15000);
  }
  // Tier 4
  return rand(500, 5000);
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
function getInterestedTiers(overall: number, age?: number): number[] {
  // Age-based restrictions: 40+ only lower league/amateur, 38+ rarely top clubs
  if (age && age >= 40) return [3, 4];
  if (age && age >= 38) {
    if (overall >= 86) return [2, 3]; // No tier 1 for 38+
    if (overall >= 76) return [2, 3];
    return [3, 4];
  }
  if (overall >= 86) return [1];
  if (overall >= 76) return [1, 2];
  if (overall >= 66) return [2, 3];
  return [3, 4];
}

/* ─── Realistic Transfer Fee ─── */
function realisticTransferFee(overall: number, age: number): number {
  let minFee: number, maxFee: number;
  if (overall >= 95) {
    if (age <= 22) { minFee = 220; maxFee = 300; }
    else if (age <= 26) { minFee = 250; maxFee = 320; }
    else if (age <= 29) { minFee = 190; maxFee = 260; }
    else if (age <= 32) { minFee = 80; maxFee = 140; }
    else { minFee = 30; maxFee = 70; }
  } else if (overall >= 90) {
    if (age <= 22) { minFee = 150; maxFee = 220; }
    else if (age <= 26) { minFee = 170; maxFee = 240; }
    else if (age <= 29) { minFee = 120; maxFee = 180; }
    else if (age <= 32) { minFee = 50; maxFee = 90; }
    else { minFee = 20; maxFee = 45; }
  } else if (overall >= 85) {
    if (age <= 22) { minFee = 80; maxFee = 130; }
    else if (age <= 26) { minFee = 100; maxFee = 160; }
    else if (age <= 29) { minFee = 70; maxFee = 110; }
    else if (age <= 32) { minFee = 25; maxFee = 55; }
    else { minFee = 10; maxFee = 30; }
  } else if (overall >= 80) {
    if (age <= 22) { minFee = 40; maxFee = 75; }
    else if (age <= 26) { minFee = 55; maxFee = 90; }
    else if (age <= 29) { minFee = 35; maxFee = 65; }
    else if (age <= 32) { minFee = 12; maxFee = 30; }
    else { minFee = 5; maxFee = 15; }
  } else if (overall >= 75) {
    if (age <= 22) { minFee = 20; maxFee = 45; }
    else if (age <= 26) { minFee = 28; maxFee = 55; }
    else if (age <= 29) { minFee = 15; maxFee = 35; }
    else { minFee = 5; maxFee = 18; }
  } else if (overall >= 65) { minFee = 1; maxFee = 8; }
  else { minFee = 0.1; maxFee = 1; }
  return Math.round((minFee + Math.random() * (maxFee - minFee)) * 10) / 10;
}

function feeDescription(feeMillions: number): string {
  if (feeMillions > 200) return pick(["record breaking transfer", "the most expensive signing in football history"]);
  if (feeMillions >= 150) return pick(["extraordinary transfer fee", "among the most expensive moves in history"]);
  if (feeMillions >= 100) return pick(["mega money move", "one of the biggest deals of the season"]);
  if (feeMillions >= 60) return pick(["huge transfer", "blockbuster deal"]);
  if (feeMillions >= 30) return pick(["big money move", "major signing"]);
  if (feeMillions >= 15) return pick(["significant transfer", "notable signing"]);
  if (feeMillions >= 5) return pick(["decent transfer fee", "solid investment"]);
  if (feeMillions >= 1) return pick(["modest fee", "reasonable deal", "solid signing"]);
  return pick(["budget signing", "low cost move", "bargain deal"]);
}

/* ─── Make a single offer ─── */
function makeOffer(clubs: ClubData[], tier: number, overall: number, age: number, exclude: Set<string>, marketValue: number, isDream = false): ContractOffer | null {
  const candidates = getClubsByTier(clubs, tier).filter(c => !exclude.has(c.name));
  if (candidates.length === 0) return null;
  const club = pick(candidates);
  exclude.add(club.name);
  let wage = wageForTier(tier, overall);
  if (isDream) wage = Math.round(wage * 0.65);
  const fee = realisticTransferFee(overall, age);
  return { club, contractYears: rand(1, 5), wage, transferFee: fee, isDreamClub: isDream, isPayCut: isDream };
}

/* ─── Determine transfer situation ─── */
export function determineTransferSituation(state: CareerState, clubs: ClubData[]): TransferSituation {
  const { overall, age, currentClub, currentClubTier, marketValue, contractYearsLeft } = state;
  const lastSeason = state.seasons[state.seasons.length - 1];
  const exclude = new Set<string>([currentClub]);
  const interestedTiers = getInterestedTiers(overall, age);

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
    const offer = makeOffer(clubs, pick(getInterestedTiers(state.overall, state.age)), state.overall, state.age, exclude, state.marketValue);
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
  const academyClub = getYouthAcademyClub(clubs, nationality, overall);
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
    pendingEvents: [], lastEventId: null, statBoostNextSeason: {}, pendingNews: [],
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
    purchasedItems: [], investmentHoldings: [], totalAssetValue: 0, customYearlyCosts: 0,
    awards: [],
    pendingBallonDor: null,
    lastUCLResult: null,
    legacy: null,
    postRetirementChoice: null,
    managerState: null,
    isFinalSeason: false,
    isPundit: false,
    punditEvents: [],
    primeType: rollPrimeType(),
    socialMediaActionUsedThisSeason: false,
    socialMediaFocusBoost: false,
    pendingFifaCoverEvent: false,
    fifaCoverAccepted: false,
    activeSponsorship: null,
    moralDilemmasTriggered: [],
    pendingMoralDilemma: null,
    pedSeasonsRemaining: 0,
    pedActive: false,
    matchFixBanned: 0,
    divingActive: false,
    integrityBonus: 0,
    pendingAppealResult: null,
    childEventsSeen: [],
    pregnancyAnnounced: false,
    punditState: null,
    ownerState: null,
    peakOverall: overall,
    retirementSuggested: false,
  };
}

/* ─── Advance youth year ─── */
export function advanceYouthYear(prev: CareerState, clubs: ClubData[]): CareerState {
  const s = { ...prev }; s.age += 1; s.events = [];
  s.pace = growStat(s.pace, s.age, true, true, s.primeType);
  s.shooting = growStat(s.shooting, s.age, true, false, s.primeType);
  s.passing = growStat(s.passing, s.age, true, false, s.primeType);
  s.dribbling = growStat(s.dribbling, s.age, true, false, s.primeType);
  s.defending = growStat(s.defending, s.age, true, false, s.primeType);
  s.physical = growStat(s.physical, s.age, true, false, s.primeType);
  s.reflexes = growStat(s.reflexes, s.age, true, false, s.primeType);
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
const TOP_NATIONS_WC = ["Brazil", "France", "Argentina", "Germany", "Spain", "England", "Portugal", "Netherlands", "Belgium", "Italy", "Croatia", "Uruguay"];
const STRONG_NATIONS_WC = ["USA", "Mexico", "Colombia", "Senegal", "Morocco", "Japan", "South Korea", "Denmark", "Switzerland", "Austria", "Poland", "Serbia", "Ecuador", "Peru", "Chile", "Nigeria", "Ghana", "Ivory Coast", "Egypt", "Algeria"];
const ALL_WC_POOL = [...TOP_NATIONS_WC, ...STRONG_NATIONS_WC, "Norway", "Sweden", "Turkey", "Scotland", "Wales", "Ireland", "Czech Republic", "Romania", "Greece", "Russia", "Ukraine", "Cameroon", "Tunisia", "Australia", "New Zealand", "Canada", "Jamaica", "Costa Rica"];

function getNationStrength(nation: string): number {
  if (TOP_NATIONS_WC.includes(nation)) return rand(85, 92);
  if (STRONG_NATIONS_WC.includes(nation)) return rand(78, 86);
  return rand(60, 74);
}

/* ─── Qualification chance by nation tier + player boost ─── */
function getQualificationChance(nation: string, playerOverall: number, isPlayerNation: boolean): number {
  let base: number;
  if (TOP_NATIONS_WC.includes(nation)) {
    base = 0.90;
  } else if (STRONG_NATIONS_WC.includes(nation)) {
    base = 0.70;
  } else {
    base = 0.25;
    // Player carrying a weaker nation
    if (isPlayerNation) {
      if (playerOverall >= 90) base = 0.75;
      else if (playerOverall >= 80) base = 0.55;
    }
  }
  return base;
}

function get32WCTeams(playerNation: string, playerOverall: number): string[] {
  const teams: string[] = [];
  
  // Check if player's nation qualifies
  const playerQualChance = getQualificationChance(playerNation, playerOverall, true);
  const playerQualified = Math.random() < playerQualChance;
  if (playerQualified) teams.push(playerNation);
  
  // Fill remaining spots from pool
  const pool = ALL_WC_POOL.filter(n => n !== playerNation);
  const qualifiedFromPool: string[] = [];
  
  for (const nation of pool) {
    const chance = getQualificationChance(nation, 0, false);
    if (Math.random() < chance) qualifiedFromPool.push(nation);
  }
  
  // Shuffle qualified nations and take enough to fill 32
  const needed = 32 - teams.length;
  const shuffled = qualifiedFromPool.sort(() => Math.random() - 0.5);
  
  if (shuffled.length >= needed) {
    teams.push(...shuffled.slice(0, needed));
  } else {
    // Not enough qualified — fill remainder from pool by strength
    teams.push(...shuffled);
    const remaining = pool.filter(n => !teams.includes(n))
      .map(n => ({ n, w: getNationStrength(n) + rand(0, 15) }))
      .sort((a, b) => b.w - a.w);
    for (const r of remaining) {
      if (teams.length >= 32) break;
      teams.push(r.n);
    }
  }
  
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
  const teams = get32WCTeams(nation, state.overall);
  
  // Check if player's nation didn't qualify
  if (!teams.includes(nation)) {
    const year = state.seasons[state.seasons.length - 1]?.year + 1 || 2022;
    return {
      year, nation, matches: [], playerApps: 0, playerGoals: 0, playerAssists: 0,
      playerAvgRating: 0, result: "Did Not Qualify", bestPlayer: false,
    };
  }
  
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
  // Reset social media action for new season
  s.socialMediaActionUsedThisSeason = false;
  // Apply focus boost from "stay off social media" last season
  if (s.socialMediaFocusBoost) {
    for (const k of ["pace", "shooting", "passing", "dribbling", "defending", "physical", "reflexes"] as const) {
      (s as any)[k] = clamp((s as any)[k] + 2, 20, 99);
    }
    s.socialMediaFocusBoost = false;
    s.events.push("🧘 Social media detox paid off — +2 to all stats!");
  }

  // Match fix ban — skip season
  if (s.matchFixBanned > 0) {
    s.matchFixBanned -= 1;
    s.events.push(`🚫 Serving match-fixing ban (${s.matchFixBanned > 0 ? s.matchFixBanned + " season(s) remaining" : "ban lifted!"})`);
    if (s.matchFixBanned > 0) {
      // Skip season entirely — add empty record
      const lastYear = s.seasons[s.seasons.length - 1].year;
      s.seasons = [...s.seasons, {
        year: lastYear + 1, age: s.age, club: "BANNED", clubCountry: "", clubTier: 99,
        apps: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0, rating: 0,
        leagueTitle: false, domesticCup: false, championsLeague: false, worldCup: false, ballonDor: false, ballonDorRank: null, type: "playing",
        intApps: 0, intGoals: 0, intAssists: 0, intRating: 0, tournament: null, tournamentResult: null,
      }];
      s.pendingSummary = s.seasons[s.seasons.length - 1];
      s.phase = "season_summary";
      simulateSeasonFinances(s, s.pendingSummary);
      return s;
    }
  }

  // PED tracking — check for failed test
  if (s.pedActive && s.pedSeasonsRemaining > 0) {
    s.pedSeasonsRemaining -= 1;
    if (Math.random() < 0.20) {
      // Failed test!
      s.pedActive = false;
      s.pedSeasonsRemaining = 0;
      // Remove PED stat boost
      for (const k of ["pace", "shooting", "passing", "dribbling", "defending", "physical", "reflexes"] as const) {
        (s as any)[k] = clamp((s as any)[k] - 5, 20, 99);
      }
      s.matchFixBanned = 1; // 1 year ban
      s.integrityBonus -= 25;
      s.popularity = clamp(s.popularity - 30, 0, 100);
      s.morale = clamp(s.morale - 25, 0, 100);
      s.socialMediaFollowers = Math.max(0, s.socialMediaFollowers - 3);
      s.events.push("🚨 FAILED DRUG TEST! Banned for 1 season. Legacy -25, reputation destroyed.");
      // Skip rest of season
      const lastYear = s.seasons[s.seasons.length - 1].year;
      s.seasons = [...s.seasons, {
        year: lastYear + 1, age: s.age, club: "BANNED (PED)", clubCountry: "", clubTier: 99,
        apps: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0, rating: 0,
        leagueTitle: false, domesticCup: false, championsLeague: false, worldCup: false, ballonDor: false, ballonDorRank: null, type: "playing",
        intApps: 0, intGoals: 0, intAssists: 0, intRating: 0, tournament: null, tournamentResult: null,
      }];
      s.pendingSummary = s.seasons[s.seasons.length - 1];
      s.phase = "season_summary";
      simulateSeasonFinances(s, s.pendingSummary);
      return s;
    }
    if (s.pedSeasonsRemaining === 0) {
      // PED wore off
      s.pedActive = false;
      for (const k of ["pace", "shooting", "passing", "dribbling", "defending", "physical", "reflexes"] as const) {
        (s as any)[k] = clamp((s as any)[k] - 5, 20, 99);
      }
      s.events.push("💊 The substance wore off. Stats returned to normal.");
    }
  }
  
  // Track peak overall
  if (s.overall > s.peakOverall) s.peakOverall = s.overall;
  
  // Forced retirement: overall below 50 at 33+, OR absolute max age 45
  if ((s.overall < 50 && s.age >= 33) || s.age >= 45) {
    s.retired = true;
    const reason = s.age >= 45 ? "👋 Hung up the boots at 45 — an incredible career!" : "👋 Body can no longer keep up — forced retirement";
    s.events.push(reason);
    const lastYr = s.seasons[s.seasons.length - 1].year;
    s.seasons = [...s.seasons, {
      year: lastYr + 1, age: s.age, club: s.currentClub, clubCountry: s.currentClubCountry, clubTier: s.currentClubTier,
      apps: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0, rating: 0,
      leagueTitle: false, domesticCup: false, championsLeague: false, worldCup: false, ballonDor: false, ballonDorRank: null, type: "retired",
      intApps: 0, intGoals: 0, intAssists: 0, intRating: 0, tournament: null, tournamentResult: null,
    }];
    if (s.rival) s.rivalrySummary = generateRivalrySummary(s);
    s.legacy = calculateLegacy(s);
    s.phase = "retirement_ceremony";
    return s;
  }
  
  // Retirement suggestion — when overall drops 10+ from peak OR drops to 75 or below (age 30+)
  if (!s.retirementSuggested && s.age >= 30) {
    const dropFromPeak = s.peakOverall - s.overall;
    if (dropFromPeak >= 10 || s.overall <= 75) {
      s.retirementSuggested = true;
      s.phase = "retirement_suggestion";
      return s;
    }
  }
  // Also show suggestion again each season if OVR <=65 and age >=34 (body wearing out)
  if (s.age >= 34 && s.overall <= 65 && Math.random() < 0.4) {
    s.phase = "retirement_suggestion";
    return s;
  }
  
  const season = generateSeasonStats(s);
  // Apply stat boosts from previous season's events
  for (const [key, val] of Object.entries(s.statBoostNextSeason)) {
    const k = key as keyof typeof s.statBoostNextSeason;
    if (k in s) (s as any)[k] = clamp((s as any)[k] + (val || 0), 20, 99);
  }
  s.statBoostNextSeason = {};
  s.pace = growStat(s.pace, s.age, false, true, s.primeType);
  s.shooting = growStat(s.shooting, s.age, false, false, s.primeType);
  s.passing = growStat(s.passing, s.age, false, false, s.primeType);
  s.dribbling = growStat(s.dribbling, s.age, false, false, s.primeType);
  s.defending = growStat(s.defending, s.age, false, false, s.primeType);
  s.physical = growStat(s.physical, s.age, false, false, s.primeType);
  // Personal trainer: +1 physical per season
  if (s.purchasedItems.includes("personal_trainer")) {
    s.physical = clamp(s.physical + 1, 20, 99);
  }
  s.reflexes = growStat(s.reflexes, s.age, false, false, s.primeType);
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

  // UCL Simulation
  const uclResult = simulateUCL(s, season);
  s.lastUCLResult = uclResult;
  if (uclResult.qualified) {
    season.championsLeague = uclResult.result === "Winner";
    if (season.championsLeague) s.events.push(`⭐ Won the Champions League!`);
    else if (uclResult.result === "Final") s.events.push(`⭐ Reached the Champions League Final`);
    if (uclResult.isTopScorer) {
      s.awards = [...s.awards, { year: thisYear, name: "UCL Top Scorer", emoji: "⚽" }];
      s.events.push(`⚽ Won the Champions League Golden Boot!`);
    }
  }

  if (season.leagueTitle) s.events.push(`🏆 Won the league with ${s.currentClub}!`);
  if (season.domesticCup) s.events.push(`🏆 Won the Domestic Cup with ${s.currentClub}!`);

  // Awards: Player of the Month — simulate month-by-month based on goals
  const MONTHS = ["August", "September", "October", "November", "December", "January", "February", "March", "April", "May"];
  const potmTotalGoals = season.goals;
  const potmTotalApps = season.apps;
  // Distribute goals roughly across 10 months proportional to apps
  let potmCount = 0;
  const potmMonths: string[] = [];
  for (const month of MONTHS) {
    // Each month gets roughly 1/10 of total goals with some variance
    const monthGoals = Math.max(0, Math.round((potmTotalGoals / 10) + (Math.random() * 2 - 1)));
    let chance = 0.02;
    if (monthGoals >= 4) chance = 0.75;
    else if (monthGoals >= 3) chance = 0.50;
    else if (monthGoals >= 2) chance = 0.25;
    else if (monthGoals >= 1) chance = 0.10;
    if (Math.random() < chance) {
      potmCount++;
      potmMonths.push(month);
    }
  }
  // Guarantee high POTM count for Ballon d'Or caliber seasons
  if (potmTotalGoals >= 30 && potmCount < 6) {
    const remaining = MONTHS.filter(m => !potmMonths.includes(m));
    while (potmCount < 6 && remaining.length > 0) {
      const idx = rand(0, remaining.length - 1);
      potmMonths.push(remaining.splice(idx, 1)[0]);
      potmCount++;
    }
  }
  if (potmTotalGoals >= 35 && potmCount < 7) {
    const remaining = MONTHS.filter(m => !potmMonths.includes(m));
    while (potmCount < 7 && remaining.length > 0) {
      const idx = rand(0, remaining.length - 1);
      potmMonths.push(remaining.splice(idx, 1)[0]);
      potmCount++;
    }
  }
  if (potmCount > 0) {
    for (const month of potmMonths) {
      s.awards = [...s.awards, { year: thisYear, name: "Player of the Month", emoji: "🏆" }];
      s.events.push(`🏆 Won Player of the Month (${month} ${thisYear})!`);
    }
  }
  
  // Player of the Year (domestic)
  if (season.rating >= 8.0 && s.overall >= 82 && Math.random() < 0.25) {
    s.awards = [...s.awards, { year: thisYear, name: "Player of the Year", emoji: "🌟" }];
    s.events.push(`🌟 Won Domestic Player of the Year!`);
    s.popularity = clamp(s.popularity + 10, 0, 100);
  }

  // International Player of the Year
  if (s.internationalCareer && season.intApps >= 6 && season.intRating >= 7.5 && s.overall >= 83 && Math.random() < 0.15) {
    s.awards = [...s.awards, { year: thisYear, name: "International Player of the Year", emoji: "🌍" }];
    s.events.push(`🌍 Named International Player of the Year!`);
  }

  const totalGoals = s.seasons.reduce((sum, ss) => sum + ss.goals, 0) + season.goals;
  const totalApps = s.seasons.reduce((sum, ss) => sum + ss.apps, 0) + season.apps;
  if (totalGoals >= 100 && totalGoals - season.goals < 100) s.events.push("💯 Reached 100 career goals!");
  if (totalGoals >= 200 && totalGoals - season.goals < 200) s.events.push("🔥 Reached 200 career goals!");
  if (totalGoals >= 500 && totalGoals - season.goals < 500) s.events.push("👑 Reached 500 career goals!");
  if (totalApps >= 500 && totalApps - season.apps < 500) s.events.push("🎖️ Made 500th career appearance!");
  s.seasons = [...s.seasons, season];
  s.pendingSummary = season;
  // Generate newspaper articles
  const news = generateNewsArticles(s, season, totalGoals, totalApps);
  s.pendingNews = news;
  s.phase = news.length > 0 ? "newspaper" : "season_summary";
  // Financial simulation
  simulateSeasonFinances(s, season);
  if (s.contractYearsLeft <= 1) s.events.push("⚠️ Your contract is expiring!");

  // World Cup year — trigger after summary (hard cap: 5 World Cups per career)
  if (isWCYear && s.internationalCareer && !s.intStats.isRetired && s.intStats.worldCups < 5) {
    const wcResult = simulateWorldCup(s);
    wcResult.year = thisYear;
    s.pendingWorldCup = wcResult;
    
    if (wcResult.result === "Did Not Qualify") {
      s.events.push(`😞 ${s.nationality} failed to qualify for the World Cup`);
      s.intStats = { ...s.intStats, tournaments: s.intStats.tournaments + 1, worldCups: s.intStats.worldCups + 1 };
    } else {
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
        s.awards = [...s.awards, { year: thisYear, name: "World Cup Best Player", emoji: "🌟" }];
      }
      // World Cup Golden Boot
      if (wcResult.playerGoals >= 4 && Math.random() < 0.4) {
        s.awards = [...s.awards, { year: thisYear, name: "World Cup Golden Boot", emoji: "👟" }];
        s.events.push(`👟 Won the World Cup Golden Boot!`);
      }
    }
    s.intStats = { ...s.intStats, worldCupResults: [...s.intStats.worldCupResults, wcResult] };
  }

  // Ballon d'Or calculation
  const bdorResult = calculateBallonDor(s, season, thisYear);
  s.pendingBallonDor = bdorResult;
  if (bdorResult.playerRank !== null) {
    season.ballonDorRank = bdorResult.playerRank;
    if (bdorResult.playerRank === 1) {
      season.ballonDor = true;
      s.awards = [...s.awards, { year: thisYear, name: "Ballon d'Or", emoji: "🏅" }];
      s.marketValue = Math.round((s.marketValue + 15) * 10) / 10;
      s.popularity = clamp(s.popularity + 20, 0, 100);
    } else if (bdorResult.playerRank <= 3) {
      s.popularity = clamp(s.popularity + 5, 0, 100);
    }
  }

  // International debut event
  if (s.intStats.debutYear === thisYear) {
    s.events.push(`🇺🇳 First international call-up for ${s.nationality}!`);
  }

  if (s.events.length === 0) s.events.push(`⚽ Solid season at ${s.currentClub}`);
  return s;
}

/* ─── Newspaper Article Generation ─── */
const NEWSPAPERS = ["The Daily Sport", "Football Weekly", "The Global Game", "Soccer Times", "The Beautiful Game Report"];

function generateNewsArticles(s: CareerState, season: SeasonRecord, totalGoals: number, totalApps: number): NewsArticle[] {
  const articles: NewsArticle[] = [];
  const name = s.playerName;
  const club = s.currentClub;
  const pos = s.position;
  const ovr = s.overall;
  const yearsPlaying = s.seasons.filter(ss => ss.type === "playing").length;
  const firstClub = s.seasons.find(ss => ss.type === "playing")?.club || club;
  const seasonsAtClub = s.seasons.filter(ss => ss.club === club && ss.type === "playing").length;

  type Template = { weight: number; check: () => boolean; gen: () => NewsArticle };

  const templates: Template[] = [
    { weight: 1, check: () => season.goals >= 2 && season.rating >= 7.5,
      gen: () => ({ newspaper: pick(NEWSPAPERS), type: "positive",
        headline: `${name} Silences Critics With Stunning Performance`,
        body: `${name} put in an outstanding display for ${club} this season, netting ${season.goals} goals and reminding the world of their immense talent. Pundits are running out of superlatives.` }) },
    { weight: 1, check: () => ovr >= 88,
      gen: () => ({ newspaper: pick(NEWSPAPERS), type: "positive",
        headline: `Is ${name} The Best ${pos} In The World Right Now?`,
        body: `With an overall rating of ${ovr}, ${name} continues to operate at a level few can match. Experts across the globe are debating whether the ${s.nationality} star has now surpassed every rival at ${pos}.` }) },
    { weight: 1, check: () => season.rating >= 7.8,
      gen: () => ({ newspaper: pick(NEWSPAPERS), type: "positive",
        headline: `${name} Named In Team Of The Season`,
        body: `After averaging a ${season.rating.toFixed(1)} rating across ${season.apps} appearances, ${name} has been selected in the official Team of the Season. A thoroughly deserved recognition.` }) },
    { weight: 1, check: () => s.marketValue >= 50 && s.currentClubTier > 1,
      gen: () => {
        const elites = ["Real Madrid", "Barcelona", "Manchester City", "Bayern Munich", "PSG", "Liverpool"];
        return { newspaper: pick(NEWSPAPERS), type: "transfer",
          headline: `Transfer Rumours: ${pick(elites)} Eyeing ${name} In Summer Window`,
          body: `Sources close to the deal suggest a bid of €${Math.round(s.marketValue)}M is being prepared. The ${s.nationality} international has been in outstanding form and could be set for a big move.` };
      } },
    { weight: 1, check: () => totalGoals > 0 && (totalGoals === 100 || totalGoals === 200 || totalGoals === 300 || totalGoals === 500),
      gen: () => ({ newspaper: pick(NEWSPAPERS), type: "milestone",
        headline: `${name} Breaks Club Record For Goals`,
        body: `With ${totalGoals} career goals to their name, ${name} has written themselves into the history books. An emotional moment at ${club} as teammates and fans celebrate the milestone.` }) },
    { weight: 1, check: () => yearsPlaying >= 5 && s.currentClubTier <= 2 && ovr >= 78,
      gen: () => ({ newspaper: pick(NEWSPAPERS), type: "positive",
        headline: `FROM ZERO TO HERO: ${name}'s Incredible Rise From ${firstClub} To The Top`,
        body: `${yearsPlaying} years ago, ${name} was an unknown prospect at ${firstClub}. Now at ${club}, the ${s.nationality} star has become one of football's most remarkable success stories. "I never gave up," they revealed.` }) },
    { weight: 1, check: () => seasonsAtClub >= 2 && s.popularity >= 50,
      gen: () => ({ newspaper: pick(NEWSPAPERS), type: "positive",
        headline: `${name} Voted Fan Favourite At ${club}`,
        body: `After ${seasonsAtClub} seasons of dedication, the ${club} faithful have spoken — ${name} is their Player of the Year. The bond between player and fans has become something truly special.` }) },
    { weight: 1, check: () => s.isLeader && (season.leagueTitle || season.domesticCup || season.championsLeague),
      gen: () => {
        const trophy = season.championsLeague ? "Champions League" : season.leagueTitle ? "League Title" : "Domestic Cup";
        return { newspaper: pick(NEWSPAPERS), type: "positive",
          headline: `CAPTAIN FANTASTIC: ${name} Leads ${club} To ${trophy} Glory`,
          body: `Wearing the armband with pride, ${name} delivered when it mattered most. A season that will live long in the memory of every ${club} supporter.` };
      } },
    { weight: 0.5, check: () => ovr >= 80 && s.popularity >= 60,
      gen: () => ({ newspaper: pick(NEWSPAPERS), type: "positive",
        headline: `${name} Reveals Secret To Success In Exclusive Interview: 'I Never Stopped Believing'`,
        body: `In a rare sit-down interview, ${name} opened up about the sacrifices, the doubts, and the determination that drove them to the top. "Every setback was a lesson," the ${pos} reflected.` }) },
    { weight: 0.5, check: () => s.socialMediaFollowers >= 1000000,
      gen: () => ({ newspaper: pick(NEWSPAPERS), type: "positive",
        headline: `SOCIAL MEDIA SENSATION: ${name} Hits ${formatFollowers(s.socialMediaFollowers)} Followers After Viral Moment`,
        body: `${name} broke the internet this week after a viral clip racked up millions of views. The ${club} star's social media presence continues to grow at a staggering pace.` }) },
    { weight: 1, check: () => season.rating < 6.3 && season.apps < 20,
      gen: () => ({ newspaper: pick(NEWSPAPERS), type: "negative",
        headline: `CRISIS AT ${club.toUpperCase()}: ${name} Dropped From Squad After Poor Run Of Form`,
        body: `Sources inside the dressing room confirm that ${name} has been left out of the matchday squad following a disappointing spell. With just ${season.apps} appearances and a ${season.rating.toFixed(1)} average rating, questions are mounting.` }) },
    { weight: 0.7, check: () => season.rating < 6.0,
      gen: () => ({ newspaper: pick(NEWSPAPERS), type: "negative",
        headline: `${name} Booed By Own Fans After Another Disappointing Display`,
        body: `Ugly scenes at ${club} as sections of the crowd turned on ${name} after another below-par performance. The ${s.nationality} international looked visibly shaken as boos rang around the stadium.` }) },
    { weight: 0.5, check: () => s.contractYearsLeft <= 1 && s.morale < 50,
      gen: () => ({ newspaper: pick(NEWSPAPERS), type: "negative",
        headline: `TRANSFER SAGA: ${name} Wants Out As Contract Talks Collapse`,
        body: `Negotiations between ${name}'s representatives and ${club} have broken down completely. With just ${s.contractYearsLeft} year${s.contractYearsLeft !== 1 ? "s" : ""} remaining, the club face losing their star for a cut-price fee.` }) },
    { weight: 0.5, check: () => season.apps < 15 && s.age < 34,
      gen: () => {
        const injuries = ["knee ligament damage", "hamstring tear", "ankle fracture", "groin injury", "shoulder dislocation"];
        return { newspaper: pick(NEWSPAPERS), type: "negative",
          headline: `INJURY BLOW: ${name} Could Miss Months With Serious ${pick(injuries).split(" ").map(w => w[0].toUpperCase() + w.slice(1)).join(" ")}`,
          body: `${club} have been dealt a devastating blow after scans confirmed ${name} faces an extended spell on the sidelines. The ${pos} managed only ${season.apps} appearances this season.` };
      } },
    { weight: 0.3, check: () => s.morale < 40,
      gen: () => ({ newspaper: pick(NEWSPAPERS), type: "negative",
        headline: `CONTROVERSY: ${name} Hits Out At Manager In Shock Interview`,
        body: `In a bombshell interview, ${name} publicly criticised the management at ${club}, claiming they have been "disrespected and undervalued." The fallout is expected to dominate headlines for weeks.` }) },
    { weight: 1, check: () => s.age >= 30 && ovr < 75 && season.rating < 6.5,
      gen: () => ({ newspaper: pick(NEWSPAPERS), type: "negative",
        headline: `HAS ${name.toUpperCase()} LOST IT? Former Star Struggles At ${club}`,
        body: `Once one of football's brightest talents, ${name} is now a shadow of their former self. At ${s.age}, the ${pos} averaged just ${season.rating.toFixed(1)} this campaign. Time may finally be catching up.` }) },
    { weight: 0.4, check: () => s.weeklyWage > 200000 && s.contractYearsLeft <= 2,
      gen: () => ({ newspaper: pick(NEWSPAPERS), type: "negative",
        headline: `WAGE DEMANDS SHOCK ${club.toUpperCase()} As ${name} Agent Demands Record Deal`,
        body: `${name}'s agent has reportedly demanded a staggering ${formatWage(Math.round(s.weeklyWage * 1.5))} weekly wage to extend their stay at ${club}. Board members are said to be "stunned" by the figures.` }) },
    { weight: 0.5, check: () => s.rival !== null && !s.rival.retired && s.rival.ballonDors > 0,
      gen: () => ({ newspaper: pick(NEWSPAPERS), type: "negative",
        headline: `RIVALS TAUNT ${name.toUpperCase()} After ${s.rival!.name} Wins Ballon d'Or Again`,
        body: `Social media erupted as ${s.rival!.name} claimed another Ballon d'Or, with fans of the ${s.rival!.nationality} star flooding ${name}'s channels with taunts. The rivalry shows no signs of cooling down.` }) },
    { weight: 0.7, check: () => s.marketValue >= 30,
      gen: () => {
        const bidders = ["Real Madrid", "Barcelona", "Manchester City", "PSG", "Chelsea", "Bayern Munich"];
        const bidClub = pick(bidders.filter(b => b !== club));
        const bidFee = realisticTransferFee(ovr, s.age);
        const desc = feeDescription(bidFee);
        return { newspaper: pick(NEWSPAPERS), type: "transfer",
          headline: `${bidClub} Launch €${Math.round(bidFee)}M Bid For ${name} In ${desc.charAt(0).toUpperCase() + desc.slice(1)}`,
          body: `${bidClub} have made an audacious move for ${name}, tabling a ${desc} worth €${bidFee.toFixed(1)}M. ${club} are yet to respond but are understood to be reluctant to sell.` };
      } },
    { weight: 1, check: () => {
        const playingSzns = s.seasons.filter(ss => ss.type === "playing");
        return playingSzns.length >= 2 && playingSzns[playingSzns.length - 1].club !== playingSzns[playingSzns.length - 2]?.club;
      },
      gen: () => {
        const prev = s.seasons.filter(ss => ss.type === "playing");
        const oldClub = prev.length >= 2 ? prev[prev.length - 2].club : "Unknown";
        const fee = realisticTransferFee(ovr, s.age);
        const desc = feeDescription(fee);
        return { newspaper: pick(NEWSPAPERS), type: "transfer",
          headline: `DONE DEAL: ${name} Signs For ${club} In ${desc.charAt(0).toUpperCase() + desc.slice(1)}`,
          body: `${name} has completed their move from ${oldClub} to ${club} in a ${desc} worth €${fee.toFixed(1)}M. The ${s.nationality} ${pos} is expected to make an immediate impact.` };
      } },
    { weight: 0.5, check: () => s.contractYearsLeft === 0,
      gen: () => ({ newspaper: pick(NEWSPAPERS), type: "transfer",
        headline: `FREE AGENT FRENZY: ${name} Available On Free Transfer`,
        body: `${name} is officially a free agent after their contract at ${club} expired. Multiple top clubs are reportedly circling for what could be the bargain of the window.` }) },
    { weight: 1, check: () => totalGoals >= 100 && totalGoals - season.goals < 100,
      gen: () => ({ newspaper: pick(NEWSPAPERS), type: "milestone",
        headline: `${name} Scores 100th Career Goal In Emotional Moment`,
        body: `There were tears of joy as ${name} reached the magical 100-goal mark for their career. The ${club} star celebrated with teammates and fans in an unforgettable moment.` }) },
    { weight: 1, check: () => s.intStats.caps >= 100 && (s.intStats.caps - (season.intApps || 0)) < 100,
      gen: () => ({ newspaper: pick(NEWSPAPERS), type: "milestone",
        headline: `CENTURION: ${name} Earns 100th International Cap`,
        body: `${name} was given a guard of honour by teammates before earning their 100th cap for ${s.nationality}. An incredible achievement for the veteran ${pos}.` }) },
    { weight: 1, check: () => s.isFinalSeason,
      gen: () => ({ newspaper: pick(NEWSPAPERS), type: "milestone",
        headline: `LEGEND STATUS: ${name} Announces Retirement After ${yearsPlaying} Year Career`,
        body: `In an emotional press conference, ${name} confirmed this will be their final season as a professional footballer. ${yearsPlaying} years, ${totalGoals} goals, and countless memories. A true legend of the game.` }) },
  ];

  const eligible = templates.filter(t => t.check());
  if (eligible.length === 0) return [];

  const count = eligible.length >= 2 && Math.random() < 0.5 ? 2 : 1;
  const shuffled = eligible.sort(() => Math.random() - 0.5).sort((a, b) => b.weight - a.weight);
  const selected = shuffled.slice(0, count);
  return selected.map(t => t.gen());
}

/* ─── Dismiss newspaper ─── */
export function dismissNewspaper(prev: CareerState): CareerState {
  const s = { ...prev };
  s.pendingNews = [];
  s.phase = "season_summary";
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
        { label: "Appeal the decision", emoji: "⚖️", color: "bg-amber-600", consequence: "Appeal submitted — result in 3-5 days",
          apply: s => {
            const success = Math.random() < 0.5;
            const banLength = success ? 0 : rand(2, 4);
            s.pendingAppealResult = { success, banLength };
            s.phase = "red_card_appeal_result" as any;
            return s;
          } },
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
    // New life events (31-40)
    { id: 31, emoji: "👗", title: "Met Gala Invitation!", description: "You are invited to the Met Gala — the most exclusive fashion event in the world.",
      category: "life", choices: [
        { label: "Attend in style", emoji: "✨", color: "bg-pink-600", consequence: "Followers +500k, Lifestyle upgrade",
          apply: s => { s.socialMediaFollowers += 0.5; s.popularity = clamp(s.popularity + 8, 0, 100); s.events = [...s.events, "👗 Attended the Met Gala — went viral"]; return s; } },
        { label: "Skip it — not my scene", emoji: "✋", color: "bg-muted", consequence: "Stay low-key",
          apply: s => { s.events = [...s.events, "👗 Declined Met Gala invitation"]; return s; } },
      ] },
    { id: 32, emoji: "🎥", title: "Documentary Crew!", description: "A documentary crew wants to follow your entire season for a Netflix-style series.",
      category: "life", choices: [
        { label: "Let them in", emoji: "📹", color: "bg-emerald-600", consequence: "Followers +2M, Legacy +5",
          apply: s => { s.socialMediaFollowers += 2; s.integrityBonus += 5; s.popularity = clamp(s.popularity + 10, 0, 100); s.events = [...s.events, "🎥 Documentary aired — massive following boost"]; return s; } },
        { label: "Too much pressure", emoji: "🚫", color: "bg-muted", consequence: "Privacy maintained",
          apply: s => { s.events = [...s.events, "🎥 Declined documentary crew"]; return s; } },
      ] },
    { id: 33, emoji: "📺", title: "TV Show Appearance!", description: "You are invited to appear on a popular late-night talk show.",
      category: "life", choices: [
        { label: "Go on the show", emoji: "🎤", color: "bg-blue-600", consequence: "Followers +1M, Fun appearance",
          apply: s => { s.socialMediaFollowers += 1; s.popularity = clamp(s.popularity + 5, 0, 100); s.events = [...s.events, "📺 Appeared on a popular TV show"]; return s; } },
        { label: "Decline — camera shy", emoji: "✋", color: "bg-muted", consequence: "No change",
          apply: s => { s.events = [...s.events, "📺 Declined TV show appearance"]; return s; } },
      ] },
    { id: 34, emoji: "🛣️", title: "Street Named After You!", description: "Your hometown council wants to name a street after you.",
      category: "life", choices: [
        { label: "Attend the ceremony", emoji: "🎉", color: "bg-amber-600", consequence: "Legacy +8, Emotional moment",
          apply: s => { s.integrityBonus += 8; s.morale = clamp(s.morale + 10, 0, 100); s.events = [...s.events, "🛣️ Your hometown named a street after you!"]; return s; } },
      ] },
    { id: 35, emoji: "🏅", title: "National Honour!", description: `You are awarded a national honour (MBE/equivalent) by ${state.nationality} for services to sport.`,
      category: "life", choices: [
        { label: "Accept with pride", emoji: "👑", color: "bg-amber-600", consequence: "Legacy +10, Prestige boost",
          apply: s => { s.integrityBonus += 10; s.popularity = clamp(s.popularity + 10, 0, 100); s.events = [...s.events, `🏅 Awarded national honour by ${s.nationality}`]; return s; } },
      ] },
    { id: 36, emoji: "💰", title: "Forbes Top 10!", description: "Forbes lists you in the top 10 highest-paid athletes in the world.",
      category: "life", choices: [
        { label: "Celebrate the milestone", emoji: "🥂", color: "bg-emerald-600", consequence: "Followers +1M, Net worth milestone",
          apply: s => { s.socialMediaFollowers += 1; s.popularity = clamp(s.popularity + 10, 0, 100); s.events = [...s.events, "💰 Forbes Top 10 highest-paid athletes!"]; return s; } },
      ] },
    { id: 37, emoji: "⚽🏫", title: "Football Academy!", description: "You have the opportunity to launch your own football academy for kids in your hometown. Cost: €2M.",
      category: "life", choices: [
        { label: "Launch the academy — €2M", emoji: "🎓", color: "bg-emerald-600", consequence: "Cost €2M, Legacy +15, Giving back",
          apply: s => { s.netWorth -= 2; s.integrityBonus += 15; s.popularity = clamp(s.popularity + 15, 0, 100); s.events = [...s.events, "⚽🏫 Launched football academy for kids — Legacy +15"]; return s; } },
        { label: "Maybe when I retire", emoji: "⏳", color: "bg-muted", consequence: "Postpone the dream",
          apply: s => { s.events = [...s.events, "⚽🏫 Postponed football academy plans"]; return s; } },
      ] },
    { id: 38, emoji: "😂", title: "Fan Tattoo Goes Viral!", description: "A fan gets a tattoo of your face. The internet explodes.",
      category: "life", choices: [
        { label: "Repost it — legendary", emoji: "📱", color: "bg-purple-600", consequence: "Followers +500k, Goes viral",
          apply: s => { s.socialMediaFollowers += 0.5; s.popularity = clamp(s.popularity + 5, 0, 100); s.events = [...s.events, "😂 Fan face tattoo went viral — +500k followers"]; return s; } },
        { label: "Pretend you didn't see it", emoji: "🙈", color: "bg-muted", consequence: "It still goes viral anyway",
          apply: s => { s.socialMediaFollowers += 0.2; s.events = [...s.events, "😂 Fan tattoo went viral without your help"]; return s; } },
      ] },
    { id: 39, emoji: "🏛️", title: "Meet the Head of State!", description: `You are invited to meet the President/Prime Minister of ${state.nationality}.`,
      category: "life", choices: [
        { label: "It would be an honour", emoji: "🤝", color: "bg-blue-600", consequence: "Legacy +5, Prestige moment",
          apply: s => { s.integrityBonus += 5; s.popularity = clamp(s.popularity + 5, 0, 100); s.events = [...s.events, `🏛️ Met the head of state of ${s.nationality}`]; return s; } },
        { label: "Politely decline", emoji: "✋", color: "bg-muted", consequence: "Stay out of politics",
          apply: s => { s.events = [...s.events, "🏛️ Declined meeting head of state"]; return s; } },
      ] },
    { id: 40, emoji: "🎬⭐", title: "Movie Star Cameo!", description: "A blockbuster director wants you for a speaking role in their new film. Not just a cameo — actual lines.",
      category: "life", choices: [
        { label: "Lights, camera, action!", emoji: "🎬", color: "bg-emerald-600", consequence: "Followers +3M, Major exposure",
          apply: s => { s.socialMediaFollowers += 3; s.netWorth += 0.8; s.popularity = clamp(s.popularity + 12, 0, 100); s.events = [...s.events, "🎬⭐ Starred in a blockbuster movie!"]; return s; } },
        { label: "I'm a footballer, not an actor", emoji: "⚽", color: "bg-muted", consequence: "Focus on football",
          apply: s => { s.events = [...s.events, "🎬⭐ Declined movie role"]; return s; } },
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
    // New events eligibility
    if (e.id === 31 && state.popularity < 60) return false; // Met Gala needs fame
    if (e.id === 32 && state.popularity < 50) return false; // Documentary needs fame
    if (e.id === 33 && state.popularity < 40) return false; // TV show
    if (e.id === 34 && (state.overall < 85 || state.age < 28)) return false; // Street naming — legend status
    if (e.id === 35 && (state.overall < 88 || state.age < 30)) return false; // National honour
    if (e.id === 36 && state.netWorth < 50) return false; // Forbes top 10
    if (e.id === 37 && state.netWorth < 3) return false; // Academy needs €2M+
    if (e.id === 38 && state.socialMediaFollowers < 5) return false; // Fan tattoo needs fame
    if (e.id === 39 && (state.popularity < 70 || state.overall < 85)) return false; // Meet head of state
    if (e.id === 40 && state.popularity < 55) return false; // Movie role
    return true;
  });
  const count = rand(1, 3);
  const shuffled = [...eligible].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/* ─── UCL Simulation ─── */
function simulateUCL(state: CareerState, season: SeasonRecord): UCLResult {
  const tier = state.currentClubTier;
  // Only T1-T2 clubs qualify
  if (tier > 2) return { qualified: false, matches: [], result: "N/A", playerGoals: 0, isTopScorer: false };
  // Qualification chance
  const qualChance = tier === 1 ? 0.85 : 0.35;
  if (Math.random() > qualChance) return { qualified: false, matches: [], result: "N/A", playerGoals: 0, isTopScorer: false };

  const rounds = ["R16", "QF", "SF", "Final"];
  const opponents = ["Bayern Munich", "Real Madrid", "Barcelona", "Man City", "PSG", "Juventus", "AC Milan", "Liverpool", "Inter Milan", "Dortmund", "Atletico Madrid", "Chelsea", "Arsenal", "Porto", "Ajax", "Benfica"];
  const matches: UCLKnockoutMatch[] = [];
  let totalPlayerGoals = 0;
  const usedOpponents = new Set<string>([state.currentClub]);

  for (const round of rounds) {
    const available = opponents.filter(o => !usedOpponents.has(o));
    const opponent = available.length > 0 ? pick(available) : "Unknown FC";
    usedOpponents.add(opponent);

    // Win probability: elite clubs get a significant boost
    const isEliteUCL = ELITE_CLUBS.includes(state.currentClub);
    const roundDifficulty = rounds.indexOf(round) * 0.04;
    const eliteBonus = isEliteUCL ? 0.15 : (tier === 1 ? 0.08 : 0);
    const winChance = clamp(0.3 + (state.overall - 75) * 0.012 + eliteBonus - roundDifficulty, 0.15, 0.75);
    const won = Math.random() < winChance;
    const goalsFor = won ? rand(1, 4) : rand(0, 2);
    const goalsAgainst = won ? rand(0, goalsFor - 1 < 0 ? 0 : goalsFor - 1) : rand(goalsFor + 1, goalsFor + 3);
    const isAttacker = ["ST", "CAM", "LW", "RW"].includes(state.position);
    const playerGoals = isAttacker ? (Math.random() < 0.4 ? rand(1, 2) : 0) :
                        state.position === "GK" ? 0 : (Math.random() < 0.1 ? 1 : 0);
    totalPlayerGoals += playerGoals;
    matches.push({ opponent, round, goalsFor, goalsAgainst: Math.max(0, goalsAgainst), playerGoals, won });
    if (!won) break;
  }

  const lastMatch = matches[matches.length - 1];
  const result = lastMatch.won && lastMatch.round === "Final" ? "Winner" :
                 lastMatch.round === "Final" ? "Final" :
                 lastMatch.round === "SF" ? "Semi-final" :
                 lastMatch.round === "QF" ? "Quarter-final" : "R16";
  
  // Top scorer if 6+ goals
  const isTopScorer = totalPlayerGoals >= 6 && Math.random() < 0.5;

  return { qualified: true, matches, result, playerGoals: totalPlayerGoals, isTopScorer };
}

/* ─── Ballon d'Or Calculation ─── */

interface RealContender {
  name: string;
  nationality: string;
  position: string;
  club: string;
  baseGoals: [number, number]; // min/max goals range
  startAge: number; // age in 2024
}

const REAL_CONTENDERS: RealContender[] = [
  { name: "Erling Haaland", nationality: "Norway", position: "ST", club: "Man City", baseGoals: [25, 45], startAge: 24 },
  { name: "Kylian Mbappé", nationality: "France", position: "ST", club: "Real Madrid", baseGoals: [20, 40], startAge: 25 },
  { name: "Vinícius Jr", nationality: "Brazil", position: "LW", club: "Real Madrid", baseGoals: [15, 30], startAge: 24 },
  { name: "Jude Bellingham", nationality: "England", position: "CAM", club: "Real Madrid", baseGoals: [12, 25], startAge: 21 },
  { name: "Mohamed Salah", nationality: "Egypt", position: "RW", club: "Liverpool", baseGoals: [18, 32], startAge: 32 },
  { name: "Lamine Yamal", nationality: "Spain", position: "RW", club: "Barcelona", baseGoals: [8, 20], startAge: 17 },
  { name: "Florian Wirtz", nationality: "Germany", position: "CAM", club: "Bayern Munich", baseGoals: [10, 22], startAge: 21 },
  { name: "Bukayo Saka", nationality: "England", position: "RW", club: "Arsenal", baseGoals: [12, 24], startAge: 23 },
  { name: "Pedri", nationality: "Spain", position: "CM", club: "Barcelona", baseGoals: [5, 15], startAge: 22 },
  { name: "Gavi", nationality: "Spain", position: "CM", club: "Barcelona", baseGoals: [4, 12], startAge: 20 },
  { name: "Phil Foden", nationality: "England", position: "CAM", club: "Man City", baseGoals: [10, 22], startAge: 24 },
  { name: "Rodri", nationality: "Spain", position: "CDM", club: "Man City", baseGoals: [3, 10], startAge: 28 },
  { name: "Federico Valverde", nationality: "Uruguay", position: "CM", club: "Real Madrid", baseGoals: [5, 15], startAge: 26 },
  { name: "Raphinha", nationality: "Brazil", position: "RW", club: "Barcelona", baseGoals: [10, 22], startAge: 27 },
  { name: "Rúben Dias", nationality: "Portugal", position: "CB", club: "Man City", baseGoals: [1, 5], startAge: 27 },
  { name: "Declan Rice", nationality: "England", position: "CDM", club: "Arsenal", baseGoals: [3, 10], startAge: 25 },
  { name: "Harry Kane", nationality: "England", position: "ST", club: "Bayern Munich", baseGoals: [22, 40], startAge: 31 },
  { name: "Roberto Firmino", nationality: "Brazil", position: "ST", club: "Al-Ahli", baseGoals: [10, 22], startAge: 33 },
  { name: "Antoine Griezmann", nationality: "France", position: "CAM", club: "Atletico Madrid", baseGoals: [12, 24], startAge: 33 },
  { name: "Bernardo Silva", nationality: "Portugal", position: "CAM", club: "Man City", baseGoals: [8, 18], startAge: 30 },
];

const REPLACEMENT_YOUNG_PLAYERS: RealContender[] = [
  { name: "Endrick", nationality: "Brazil", position: "ST", club: "Real Madrid", baseGoals: [10, 25], startAge: 18 },
  { name: "Alejandro Garnacho", nationality: "Argentina", position: "LW", club: "Man United", baseGoals: [8, 20], startAge: 20 },
  { name: "Mathys Tel", nationality: "France", position: "ST", club: "Bayern Munich", baseGoals: [8, 20], startAge: 19 },
  { name: "Kobbie Mainoo", nationality: "England", position: "CM", club: "Man United", baseGoals: [3, 12], startAge: 19 },
  { name: "Warren Zaïre-Emery", nationality: "France", position: "CM", club: "PSG", baseGoals: [4, 14], startAge: 18 },
  { name: "Pau Cubarsí", nationality: "Spain", position: "CB", club: "Barcelona", baseGoals: [1, 5], startAge: 17 },
  { name: "Nico Williams", nationality: "Spain", position: "LW", club: "Athletic Bilbao", baseGoals: [10, 22], startAge: 22 },
  { name: "Xavi Simons", nationality: "Netherlands", position: "CAM", club: "PSG", baseGoals: [10, 20], startAge: 21 },
];

/* ─── Generated player name pools by nationality ─── */
const GEN_FIRST_NAMES: Record<string, string[]> = {
  Brazil: ["Lucas", "Matheus", "Gabriel", "Rafael", "Vinícius", "Kaio", "Thiago", "Rodrigo", "Enzo", "Danilo"],
  France: ["Antoine", "Théo", "Aurélien", "Ousmane", "Kylian", "Adrien", "Hugo", "Ethan", "Rayan", "Loïc"],
  England: ["Marcus", "Jack", "Callum", "James", "Harry", "Oliver", "George", "Charlie", "Ethan", "Alfie"],
  Spain: ["Pablo", "Álvaro", "Carlos", "Adrián", "Hugo", "Marcos", "Iker", "Diego", "Álex", "Sergio"],
  Germany: ["Leon", "Kai", "Maximilian", "Florian", "Niklas", "Lukas", "Jonas", "Felix", "Tim", "Moritz"],
  Argentina: ["Santiago", "Valentín", "Thiago", "Matías", "Nicolás", "Franco", "Lautaro", "Emiliano", "Julián", "Tomás"],
  Portugal: ["Diogo", "Gonçalo", "Rúben", "Bernardo", "Pedro", "Rafael", "Francisco", "André", "Nuno", "Tiago"],
  Netherlands: ["Jurriën", "Xavi", "Quinten", "Donyell", "Tijjani", "Noa", "Lutsharel", "Jeremie", "Ryan", "Kenneth"],
  Italy: ["Marco", "Nicolò", "Gianluca", "Federico", "Sandro", "Matteo", "Lorenzo", "Alessandro", "Davide", "Andrea"],
  Norway: ["Martin", "Sander", "Jonas", "Oscar", "Alexander", "Fredrik", "Erling", "Kristian", "Emil", "Henrik"],
  Belgium: ["Kevin", "Youri", "Amadou", "Leandro", "Charles", "Loïs", "Dodi", "Arthur", "Alexis", "Michy"],
  Croatia: ["Luka", "Mateo", "Ivan", "Lovro", "Joško", "Mario", "Dominik", "Ante", "Nikola", "Borna"],
  Uruguay: ["Federico", "Darwin", "Rodrigo", "Nicolás", "Ronald", "José", "Matías", "Giorgian", "Agustín", "Manuel"],
  Egypt: ["Mohamed", "Ahmed", "Omar", "Mostafa", "Mahmoud", "Trezeguet", "Ibrahim", "Amr", "Ramadan", "Karim"],
  Colombia: ["Luis", "James", "Juan", "Duván", "Rafael", "Jhon", "Miguel", "Yerry", "David", "Falcao"],
  Nigeria: ["Victor", "Samuel", "Ademola", "Kelechi", "Alex", "Ola", "Taiwo", "Wilfred", "Calvin", "Moses"],
  Senegal: ["Sadio", "Ismaïla", "Kalidou", "Abdou", "Pape", "Idrissa", "Cheikhou", "Famara", "Boulaye", "Habib"],
  Japan: ["Takumi", "Kaoru", "Ritsu", "Daichi", "Takefusa", "Wataru", "Junya", "Ao", "Keito", "Yuki"],
  "South Korea": ["Son", "Hwang", "Kim", "Lee", "Park", "Cho", "Jeong", "Kwon", "Na", "Paik"],
};
const GEN_LAST_NAMES: Record<string, string[]> = {
  Brazil: ["Silva", "Santos", "Oliveira", "Souza", "Costa", "Ferreira", "Pereira", "Almeida", "Nascimento", "Ribeiro"],
  France: ["Dupont", "Martin", "Lefèvre", "Moreau", "Girard", "Bonnet", "Fournier", "Mercier", "Durand", "Leroy"],
  England: ["Smith", "Palmer", "Wilson", "Taylor", "Brown", "Davies", "Evans", "Walker", "Thompson", "Robinson"],
  Spain: ["García", "Martínez", "López", "González", "Hernández", "Ruiz", "Navarro", "Moreno", "Romero", "Torres"],
  Germany: ["Müller", "Schmidt", "Schneider", "Fischer", "Weber", "Meyer", "Wagner", "Becker", "Schäfer", "Koch"],
  Argentina: ["González", "Fernández", "Rodríguez", "López", "Martínez", "García", "Romero", "Pereyra", "Díaz", "Acuña"],
  Portugal: ["Silva", "Santos", "Ferreira", "Pereira", "Oliveira", "Costa", "Rodrigues", "Martins", "Fernandes", "Sousa"],
  Netherlands: ["de Jong", "van Dijk", "Bakker", "Visser", "de Boer", "Jansen", "Smit", "Meijer", "de Groot", "Mulder"],
  Italy: ["Rossi", "Romano", "Colombo", "Ferrari", "Bianchi", "Ricci", "Gallo", "Conti", "Esposito", "Greco"],
  Norway: ["Hansen", "Johansen", "Olsen", "Larsen", "Andersen", "Pedersen", "Nilsen", "Kristiansen", "Berg", "Haugen"],
  Belgium: ["Janssen", "Peeters", "Maes", "Jacobs", "Willems", "Claes", "Goossens", "Wouters", "Mertens", "Leclercq"],
  Croatia: ["Kovačić", "Horvat", "Babić", "Marić", "Jurić", "Tomić", "Knežević", "Pavlović", "Matić", "Perić"],
  Uruguay: ["Fernández", "Rodríguez", "Martínez", "González", "López", "Suárez", "Pérez", "Álvarez", "Núñez", "Cavani"],
  Egypt: ["Hassan", "Ali", "Ibrahim", "Mostafa", "Abdel", "Fathy", "Salah", "Zaki", "Tawfik", "Hegazi"],
  Colombia: ["García", "Rodríguez", "Martínez", "López", "Hernández", "Díaz", "Moreno", "Ramírez", "Torres", "Ospina"],
  Nigeria: ["Osimhen", "Okocha", "Ndidi", "Iheanacho", "Onyeka", "Bassey", "Chukwueze", "Aribo", "Awoniyi", "Simon"],
  Senegal: ["Diallo", "Diop", "Ndiaye", "Sarr", "Gueye", "Ba", "Sy", "Sow", "Cissé", "Fall"],
  Japan: ["Tanaka", "Suzuki", "Watanabe", "Takahashi", "Sato", "Ito", "Yamamoto", "Nakamura", "Kobayashi", "Yoshida"],
  "South Korea": ["Heung-min", "Hee-chan", "Min-jae", "Jae-sung", "In-beom", "Woo-yeong", "Young-gwon", "Seung-ho", "Jun-ho", "Ui-jo"],
};
const GEN_NATIONALITIES = ["Brazil", "France", "England", "Spain", "Germany", "Argentina", "Portugal", "Netherlands", "Italy", "Norway", "Belgium", "Croatia", "Uruguay", "Egypt", "Colombia", "Nigeria", "Senegal", "Japan", "South Korea"];
const GEN_CLUBS = ["Real Madrid", "Man City", "Barcelona", "Bayern Munich", "Arsenal", "Liverpool", "PSG", "Inter Milan", "Chelsea", "Dortmund", "Atletico Madrid", "Juventus", "AC Milan", "Tottenham", "Man United", "Napoli", "Leverkusen"];
const GEN_POSITIONS: Array<{ pos: string; goals: [number, number] }> = [
  { pos: "ST", goals: [18, 40] }, { pos: "LW", goals: [10, 28] }, { pos: "RW", goals: [10, 28] },
  { pos: "CAM", goals: [8, 22] }, { pos: "CM", goals: [4, 14] }, { pos: "CDM", goals: [2, 8] }, { pos: "CB", goals: [1, 5] },
];

function generateContender(usedNames: Set<string>, seed: number): RealContender {
  const nat = GEN_NATIONALITIES[(seed * 7 + 3) % GEN_NATIONALITIES.length];
  const firsts = GEN_FIRST_NAMES[nat] || GEN_FIRST_NAMES["England"];
  const lasts = GEN_LAST_NAMES[nat] || GEN_LAST_NAMES["England"];
  let name = "";
  for (let i = 0; i < 20; i++) {
    const f = firsts[(seed + i * 3) % firsts.length];
    const l = lasts[(seed + i * 5 + 1) % lasts.length];
    const candidate = `${f} ${l}`;
    if (!usedNames.has(candidate)) { name = candidate; break; }
  }
  if (!name) name = `${firsts[seed % firsts.length]} ${lasts[(seed + 1) % lasts.length]} Jr.`;
  const p = GEN_POSITIONS[(seed * 11) % GEN_POSITIONS.length];
  const club = GEN_CLUBS[(seed * 13 + 2) % GEN_CLUBS.length];
  return { name, nationality: nat, position: p.pos, club, baseGoals: p.goals, startAge: rand(19, 28) };
}
const LEAGUE_CLUBS: Record<string, string[]> = {
  "Premier League": ["Man City", "Arsenal", "Liverpool", "Man United", "Chelsea", "Tottenham"],
  "La Liga": ["Real Madrid", "Barcelona", "Atletico Madrid"],
  "Bundesliga": ["Bayern Munich", "Dortmund", "Leverkusen"],
  "Serie A": ["Inter Milan", "AC Milan", "Napoli", "Juventus"],
  "Ligue 1": ["PSG"],
};

function getClubLeague(club: string): string | null {
  for (const [league, clubs] of Object.entries(LEAGUE_CLUBS)) {
    if (clubs.includes(club)) return league;
  }
  return null;
}

function calcBdorPoints(goals: number, assists: number, overall: number, clubTier: number, trophies: string[], club: string): number {
  let pts = 0;
  // Goals: 0.7pt each, max 28 (reduced from 1pt/max 40)
  pts += Math.min(goals * 0.7, 28);
  // Assists: 0.3 each, max 8 (reduced from 0.5/max 15)
  pts += Math.min(assists * 0.3, 8);
  // Trophies
  if (trophies.includes("UCL")) pts += 25;
  if (trophies.includes("World Cup")) pts += 30;
  if (trophies.includes("League")) pts += 12;
  if (trophies.includes("Cup")) pts += 3;
  // Overall 92+ bonus (raised from 90)
  if (overall >= 92) pts += 8;
  else if (overall >= 88) pts += 4;
  // Top 6 club bonus (reduced from 10)
  if (TOP_6_CLUBS.includes(club)) pts += 5;
  return Math.round(pts);
}

function calculateBallonDor(state: CareerState, season: SeasonRecord, year: number): BallonDorResult {
  const yearOffset = year - 2024;

  // --- Determine season's trophy winners (one club per competition) ---
  const uclWinnerClub = pick(["Real Madrid", "Man City", "Barcelona", "Bayern Munich", "Liverpool", "Inter Milan", "Arsenal", "PSG", "Dortmund", "Atletico Madrid"]);
  // One league winner per league
  const leagueWinners: Record<string, string> = {};
  for (const [league, clubs] of Object.entries(LEAGUE_CLUBS)) {
    leagueWinners[league] = pick(clubs);
  }
  const isWorldCupYear = year % 4 === 2;

  // --- Player eligibility ---
  const isLowTierClub = state.currentClubTier >= 3;
  const hasMajorTrophy = season.leagueTitle || season.championsLeague || season.worldCup;
  const playerEligible = !isLowTierClub || (season.goals >= 40 && hasMajorTrophy);
  const playerCanContend = (state.currentClubTier <= 2) || (isLowTierClub && season.goals >= 40 && hasMajorTrophy);

  // Calculate player points (reduced scaling)
  const playerTrophies: string[] = [];
  if (season.leagueTitle) playerTrophies.push("League");
  if (season.championsLeague) playerTrophies.push("UCL");
  if (season.domesticCup) playerTrophies.push("Cup");
  if (season.worldCup) playerTrophies.push("World Cup");

  let playerPoints = 0;
  if (playerCanContend) {
    playerPoints = calcBdorPoints(season.goals, season.assists, state.overall, state.currentClubTier, playerTrophies, state.currentClub);
  }
  const playerNominated = playerCanContend && playerPoints > 45;

  // --- Generate real contender nominees with consistent trophies ---
  const activeContenders = REAL_CONTENDERS.filter(c => {
    const age = c.startAge + yearOffset;
    return age <= 36 && age >= 17;
  });
  const retiredCount = REAL_CONTENDERS.length - activeContenders.length;
  const replacements = REPLACEMENT_YOUNG_PLAYERS.filter(c => {
    const age = c.startAge + yearOffset;
    return age >= 17 && age <= 36;
  }).slice(0, retiredCount);
  const allContenders = [...activeContenders, ...replacements];
  const usedNames = new Set<string>([state.playerName]);
  if (state.rival) usedNames.add(state.rival.name);

  const allNomineeData: BallonDorNominee[] = [];
  for (const contender of allContenders) {
    if (usedNames.has(contender.name)) continue;
    usedNames.add(contender.name);
    const age = contender.startAge + yearOffset;
    const ageFactor = age <= 28 ? 1.0 : age <= 32 ? 0.85 : 0.65;
    const goals = Math.round(rand(contender.baseGoals[0], contender.baseGoals[1]) * ageFactor);
    const assists = rand(3, 18);

    // Assign trophies based on actual season winners — no conflicts
    const trophies: string[] = [];
    if (contender.club === uclWinnerClub && Math.random() < 0.85) trophies.push("UCL");
    const contenderLeague = getClubLeague(contender.club);
    if (contenderLeague && leagueWinners[contenderLeague] === contender.club && Math.random() < 0.8) trophies.push("League");
    if (isWorldCupYear && Math.random() < 0.04) trophies.push("World Cup");
    if (Math.random() < 0.15) trophies.push("Cup");

    const overall = clamp(rand(83, 93) + (age <= 28 ? 2 : age >= 33 ? -3 : 0), 75, 95);
    const pts = calcBdorPoints(goals, assists, overall, 1, trophies, contender.club);
    allNomineeData.push({
      name: contender.name, nationality: contender.nationality, position: contender.position,
      club: contender.club, points: pts, goals, trophies, isPlayer: false,
    });
  }

  // Add rival
  if (state.rival && !state.rival.retired && state.rival.clubTier <= 2) {
    const rivalGoals = state.rival.careerGoals > 0 ? rand(12, 30) : rand(5, 15);
    const rivalAssists = rand(3, 12);
    const rivalTrophies: string[] = [];
    // Check if rival's club won trophies this season
    if (state.rival.club === uclWinnerClub && Math.random() < 0.8) rivalTrophies.push("UCL");
    const rivalLeague = getClubLeague(state.rival.club);
    if (rivalLeague && leagueWinners[rivalLeague] === state.rival.club && Math.random() < 0.75) rivalTrophies.push("League");
    const rivalPts = calcBdorPoints(rivalGoals, rivalAssists, state.rival.overall, state.rival.clubTier, rivalTrophies, state.rival.club);
    allNomineeData.push({
      name: state.rival.name, nationality: state.rival.nationality, position: state.rival.position,
      club: state.rival.club, points: rivalPts, goals: rivalGoals, trophies: rivalTrophies, isPlayer: false,
    });
  }

  // Sort all contenders by points descending
  allNomineeData.sort((a, b) => b.points - a.points);

  // DIFFICULTY: Boost top NPC so there's always a strong rival for the award
  // Ensure at least 1-2 NPCs have very competitive scores
  if (allNomineeData.length >= 2) {
    // Give the top NPC a random bonus to make winning harder
    allNomineeData[0].points += rand(5, 15);
    if (allNomineeData[1]) allNomineeData[1].points += rand(2, 8);
  }

  const npcSpotsNeeded = playerNominated ? 9 : 10;
  const topNPCs = allNomineeData.slice(0, npcSpotsNeeded);

  // Filler nominees
  const fillerNames = [
    { name: "Lucas Hernández", nationality: "France", position: "CB", club: "PSG" },
    { name: "Jadon Sancho", nationality: "England", position: "RW", club: "Manchester United" },
    { name: "Federico Valverde", nationality: "Uruguay", position: "CM", club: "Real Madrid" },
    { name: "Bernardo Silva", nationality: "Portugal", position: "CAM", club: "Manchester City" },
    { name: "Martin Ødegaard", nationality: "Norway", position: "CAM", club: "Arsenal" },
    { name: "Declan Rice", nationality: "England", position: "CDM", club: "Arsenal" },
    { name: "Aurélien Tchouaméni", nationality: "France", position: "CDM", club: "Real Madrid" },
    { name: "Rodri", nationality: "Spain", position: "CDM", club: "Manchester City" },
    { name: "Bruno Fernandes", nationality: "Portugal", position: "CAM", club: "Manchester United" },
    { name: "Khvicha Kvaratskhelia", nationality: "Georgia", position: "LW", club: "PSG" },
  ];
  let fillerIdx = 0;
  while (topNPCs.length < npcSpotsNeeded && fillerIdx < fillerNames.length) {
    const f = fillerNames[fillerIdx++];
    if (usedNames.has(f.name)) continue;
    usedNames.add(f.name);
    const pts = rand(30, 50);
    topNPCs.push({
      name: f.name, nationality: f.nationality, position: f.position,
      club: f.club, points: pts, goals: rand(5, 15), trophies: [], isPlayer: false,
    });
  }

  // Add player if nominated
  if (playerNominated) {
    topNPCs.push({
      name: state.playerName, nationality: state.nationality, position: state.position,
      club: state.currentClub, points: playerPoints, goals: season.goals, trophies: playerTrophies, isPlayer: true,
    });
  }

  // Sort final list and take exactly 10
  topNPCs.sort((a, b) => b.points - a.points);
  const top10 = topNPCs.slice(0, 10);
  let playerRankIdx = top10.findIndex(n => n.isPlayer);
  let playerRank = playerRankIdx >= 0 ? playerRankIdx + 1 : null;

  // STRICT WIN CONDITIONS: Player can only win (rank 1) if they meet elite criteria
  if (playerRank === 1) {
    const hasUCLAndLeague = season.championsLeague && season.leagueTitle;
    const hasWorldCup = season.worldCup;
    const has30PlusGoals = season.goals >= 30;
    const meetsWinCondition = has30PlusGoals || hasUCLAndLeague || hasWorldCup;
    if (!meetsWinCondition) {
      // Demote player to 2nd — they weren't dominant enough
      const playerEntry = top10.find(n => n.isPlayer);
      if (playerEntry && top10.length >= 2) {
        // Swap with the top NPC
        const topNPC = top10.find(n => !n.isPlayer);
        if (topNPC) {
          topNPC.points = Math.max(topNPC.points, playerEntry.points + rand(2, 6));
          top10.sort((a, b) => b.points - a.points);
          playerRankIdx = top10.findIndex(n => n.isPlayer);
          playerRank = playerRankIdx >= 0 ? playerRankIdx + 1 : null;
        }
      }
    }
  }

  return { year, nominees: top10, playerRank, playerPoints, playerNominated };
}

/* ─── Flow helper: advance to next phase ─── */
function advanceToNextPhase(s: CareerState, clubs: ClubData[]): CareerState {
  // Check for Ballon d'Or ceremony — always show it
  if (s.pendingBallonDor) {
    s.phase = "ballon_dor";
    return s;
  }
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
  // Social media action — once per season, only during playing phase for pro players
  if (!s.socialMediaActionUsedThisSeason && s.age >= 18 && !s.retired) {
    s.phase = "social_media_action";
    return s;
  }
  // FIFA cover event
  if (s.pendingFifaCoverEvent) {
    // handled in UI as a special overlay within social_media_action flow
  }
  // Moral dilemma — triggered before random events
  if (tryTriggerMoralDilemma(s)) {
    s.phase = "moral_dilemma";
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

/* ─── Dismiss Social Media Action phase ─── */
export function dismissSocialMediaPhase(prev: CareerState, clubs: ClubData[]): CareerState {
  const s = { ...prev };
  // Continue to random events → transfer window
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

/* ─── Dismiss Ballon d'Or screen ─── */
export function dismissBallonDor(prev: CareerState, clubs: ClubData[]): CareerState {
  const s = { ...prev };
  s.pendingBallonDor = null;
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
  // If phase was set to red_card_appeal_result by the event, don't override
  if (s.phase === "red_card_appeal_result" as any) return s;
  // All events processed → transfer window
  if (s.age >= 18) {
    s.transferSituation = determineTransferSituation(s, clubs);
    s.phase = "transfer_window";
  } else { s.phase = "playing"; }
  return s;
}

/* ─── Dismiss appeal result and continue ─── */
export function dismissAppealResult(prev: CareerState, clubs: ClubData[]): CareerState {
  const s = { ...prev };
  const result = s.pendingAppealResult;
  if (result) {
    if (result.success) {
      s.events = [...s.events, "⚖️ Appeal Successful — Ban Overturned! Free to play."];
    } else {
      s.popularity = clamp(s.popularity - 5, 0, 100);
      s.events = [...s.events, `⚖️ Appeal Rejected — Must serve ${result.banLength}-match ban.`];
    }
  }
  s.pendingAppealResult = null;
  // Continue to remaining events or transfer window
  if (s.pendingEvents.length > 0) {
    s.phase = "random_events";
    return s;
  }
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
  return advanceToNextPhase(s, clubs);
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
    leagueTitles: t.leagueTitles + (s.leagueTitle ? 1 : 0), domesticCups: t.domesticCups + (s.domesticCup ? 1 : 0),
    championsLeagues: t.championsLeagues + (s.championsLeague ? 1 : 0),
    worldCups: t.worldCups + (s.worldCup ? 1 : 0), ballonDors: t.ballonDors + (s.ballonDor ? 1 : 0),
  }), { apps: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0, leagueTitles: 0, domesticCups: 0, championsLeagues: 0, worldCups: 0, ballonDors: 0 });
}

/* ─── Legacy Calculation ─── */
function getLegacyTier(score: number): LegacyTier {
  if (score >= 90) return "GOAT";
  if (score >= 80) return "LEGEND";
  if (score >= 70) return "GREAT";
  if (score >= 60) return "SOLID PRO";
  return "JOURNEYMAN";
}

function calculateLegacy(state: CareerState): LegacyResult {
  const totals = getCareerTotals(state.seasons);
  const breakdown: { label: string; points: number }[] = [];
  let score = 0;

  // Goals & assists relative to position
  const isAttacker = ["ST", "CAM", "LW", "RW"].includes(state.position);
  const isMid = ["CM", "CDM"].includes(state.position);
  const isDefender = ["CB", "LB", "RB"].includes(state.position);
  const isGK = state.position === "GK";
  
  let goalPoints = 0;
  if (isAttacker) goalPoints = Math.min(25, totals.goals * 0.08);
  else if (isMid) goalPoints = Math.min(20, totals.goals * 0.15);
  else if (isDefender) goalPoints = Math.min(15, totals.goals * 0.3);
  else if (isGK) goalPoints = Math.min(15, totals.cleanSheets * 0.15);
  breakdown.push({ label: isGK ? "Clean Sheets" : "Goals", points: Math.round(goalPoints) });
  score += goalPoints;

  const assistPoints = Math.min(10, totals.assists * 0.05);
  breakdown.push({ label: "Assists", points: Math.round(assistPoints) });
  score += assistPoints;

  // Trophies
  const uclPoints = Math.min(20, totals.championsLeagues * 8);
  breakdown.push({ label: "Champions League", points: Math.round(uclPoints) });
  score += uclPoints;

  const leaguePoints = Math.min(10, totals.leagueTitles * 3);
  breakdown.push({ label: "League Titles", points: Math.round(leaguePoints) });
  score += leaguePoints;

  const cupPoints = Math.min(5, totals.domesticCups * 1.5);
  breakdown.push({ label: "Domestic Cups", points: Math.round(cupPoints) });
  score += cupPoints;

  // Ballon d'Ors
  const bdorPoints = Math.min(15, totals.ballonDors * 5);
  breakdown.push({ label: "Ballon d'Or", points: Math.round(bdorPoints) });
  score += bdorPoints;

  // International trophies
  const intTrophyPoints = Math.min(10, (state.intStats.worldCupWins * 6) + (state.intStats.continentalWins * 3));
  breakdown.push({ label: "International Trophies", points: Math.round(intTrophyPoints) });
  score += intTrophyPoints;

  // Club loyalty (bonus for 5+ years at one club)
  const clubYears: Record<string, number> = {};
  state.seasons.filter(s => s.type === "playing").forEach(s => {
    clubYears[s.club] = (clubYears[s.club] || 0) + 1;
  });
  const maxYears = Math.max(0, ...Object.values(clubYears));
  const loyaltyPoints = maxYears >= 10 ? 8 : maxYears >= 7 ? 5 : maxYears >= 5 ? 3 : 0;
  breakdown.push({ label: "Club Loyalty", points: loyaltyPoints });
  score += loyaltyPoints;

  // Longevity
  const careerLength = state.seasons.filter(s => s.type === "playing").length;
  const longevityPoints = careerLength >= 18 ? 7 : careerLength >= 15 ? 5 : careerLength >= 12 ? 3 : 0;
  breakdown.push({ label: "Longevity", points: longevityPoints });
  score += longevityPoints;

  // Rivalry result
  if (state.rivalrySummary) {
    const rivalPoints = state.rivalrySummary.legacyBonus > 0 ? Math.min(5, state.rivalrySummary.legacyBonus / 3) : 0;
    breakdown.push({ label: "Rivalry", points: Math.round(rivalPoints) });
    score += rivalPoints;
  }

  // Pundit bonus
  if (state.isPundit) {
    breakdown.push({ label: "TV Pundit", points: 5 });
    score += 5;
  }

  // FIFA Cover Athlete bonus
  if (state.fifaCoverAccepted) {
    breakdown.push({ label: "FIFA Cover Athlete", points: 10 });
    score += 10;
  }

  // Integrity bonus from moral dilemmas
  if (state.integrityBonus !== 0) {
    const intPts = clamp(state.integrityBonus, -30, 20);
    breakdown.push({ label: state.integrityBonus > 0 ? "Integrity" : "Scandal", points: intPts });
    score += intPts;
  }

  score = Math.round(clamp(score, 0, 100));
  return { score, tier: getLegacyTier(score), breakdown };
}

/* ─── Manual Retirement ─── */
export function manualRetire(prev: CareerState): CareerState {
  const s = { ...prev };
  s.retired = true;
  s.events = [...s.events, "👋 Announced retirement from professional football"];
  if (s.rival) s.rivalrySummary = generateRivalrySummary(s);
  s.legacy = calculateLegacy(s);
  s.phase = "retirement_ceremony";
  return s;
}

/* ─── Post-retirement choices ─── */
export function choosePostRetirement(prev: CareerState, choice: PostRetirementChoice, clubs: ClubData[]): CareerState {
  const s = { ...prev };
  s.postRetirementChoice = choice;
  
  if (choice === "retire") {
    s.phase = "retired";
    return s;
  }
  
  if (choice === "pundit") {
    s.isPundit = true;
    s.punditState = {
      season: 0,
      predictions: [],
      controversies: 0,
      legacyBonus: 0,
      followerGains: 0,
    };
    s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 2) * 10) / 10;
    s.punditEvents = ["🎙️ Made your debut as a TV pundit!"];
    s.phase = "pundit_season";
    return s;
  }
  
  if (choice === "manager") {
    const managerClubs = clubs.filter(c => c.tier >= 3);
    const club = managerClubs.length > 0 ? pick(managerClubs) : { name: "Unknown FC", tier: 3 };
    s.managerState = {
      club: club.name,
      clubTier: club.tier,
      season: 0,
      trophies: 0,
      promotions: 0,
      seasonResults: [],
      nationalTeamOffer: false,
      managingNationalTeam: false,
    };
    s.phase = "manager_season";
    return s;
  }
  
  if (choice === "owner") {
    // Buy a lower-league club
    const ownerClubs = clubs.filter(c => c.tier >= 3);
    const club = ownerClubs.length > 0 ? pick(ownerClubs) : { name: "Unknown FC", tier: 4 };
    const purchasePrice = club.tier >= 4 ? 50 : 100; // €50-100M
    s.netWorth -= purchasePrice;
    s.ownerState = {
      club: club.name,
      clubTier: club.tier,
      season: 0,
      budget: 5, // €5M starting transfer budget
      trophies: 0,
      promotions: 0,
      seasonResults: [],
    };
    s.events = [...s.events, `🏟️ Purchased ${club.name} for €${purchasePrice}M!`];
    s.phase = "owner_season";
    return s;
  }
  
  return s;
}

/* ─── Retirement Suggestion — player can choose to continue or retire ─── */
export function acceptRetirementSuggestion(prev: CareerState): CareerState {
  const s = { ...prev };
  s.retired = true;
  s.events = [...s.events, "👋 Announced retirement from professional football"];
  const lastYear = s.seasons[s.seasons.length - 1].year;
  s.seasons = [...s.seasons, {
    year: lastYear + 1, age: s.age, club: s.currentClub, clubCountry: s.currentClubCountry, clubTier: s.currentClubTier,
    apps: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0, rating: 0,
    leagueTitle: false, domesticCup: false, championsLeague: false, worldCup: false, ballonDor: false, ballonDorRank: null, type: "retired",
    intApps: 0, intGoals: 0, intAssists: 0, intRating: 0, tournament: null, tournamentResult: null,
  }];
  if (s.rival) s.rivalrySummary = generateRivalrySummary(s);
  s.legacy = calculateLegacy(s);
  s.phase = "retirement_ceremony";
  return s;
}

export function declineRetirementSuggestion(prev: CareerState): CareerState {
  const s = { ...prev };
  s.events = [...s.events, "💪 Decided to push on — not ready to hang up the boots yet"];
  s.phase = "playing";
  return s;
}

/* ─── Manager Career ─── */
export function advanceManagerSeason(prev: CareerState, clubs: ClubData[]): CareerState {
  const s = { ...prev };
  if (!s.managerState) return s;
  const ms = { ...s.managerState };
  ms.season += 1;
  
  const promotionChance = ms.clubTier >= 3 ? 0.30 : ms.clubTier === 2 ? 0.20 : 0.15;
  const trophyChance = ms.clubTier <= 2 ? 0.20 : 0.10;
  const sacked = ms.season >= 2 && Math.random() < 0.15; // 15% sack chance
  const promoted = !sacked && ms.clubTier > 1 && Math.random() < promotionChance;
  const wonTrophy = !sacked && Math.random() < trophyChance;
  const scoutInterest = ms.season >= 2 && ms.clubTier >= 2 && Math.random() < 0.25;
  
  let result = "";
  if (sacked) {
    result = `Sacked after poor results!`;
    // Get new job at same or lower tier
    const newClubs = clubs.filter(c => c.tier >= ms.clubTier && c.name !== ms.club);
    if (newClubs.length > 0) {
      const newClub = pick(newClubs);
      ms.club = newClub.name;
      ms.clubTier = newClub.tier;
      result += ` Hired by ${newClub.name} (Tier ${newClub.tier})`;
    }
  } else if (promoted) {
    ms.promotions += 1;
    ms.clubTier -= 1;
    const newClubs = clubs.filter(c => c.tier === ms.clubTier);
    if (newClubs.length > 0) ms.club = pick(newClubs).name;
    result = `Promoted! Now managing ${ms.club} in Tier ${ms.clubTier}`;
  } else if (wonTrophy) {
    ms.trophies += 1;
    result = `Won the league trophy! 🏆`;
  } else {
    const positions = ["2nd", "3rd", "4th", "mid-table", "lower half"];
    result = `Finished ${pick(positions)}`;
  }
  
  if (scoutInterest && !sacked) {
    const biggerClubs = clubs.filter(c => c.tier < ms.clubTier && c.tier >= 1);
    if (biggerClubs.length > 0) {
      const offer = pick(biggerClubs);
      result += ` · 👀 Scouts from ${offer.name} watching your sessions`;
      // Auto-move if tier 1-2 offer
      if (offer.tier <= 2 && Math.random() < 0.5) {
        ms.club = offer.name;
        ms.clubTier = offer.tier;
        result += ` → HIRED by ${offer.name}!`;
      }
    }
  }
  
  ms.seasonResults = [...ms.seasonResults, { year: ms.season, club: ms.club, tier: ms.clubTier, result, trophy: wonTrophy }];
  
  // National team offer
  if (ms.season >= 3 && ms.clubTier <= 2 && !ms.nationalTeamOffer && Math.random() < 0.3) {
    ms.nationalTeamOffer = true;
    ms.managingNationalTeam = true;
    result += ` · 🇺🇳 Called to manage ${s.nationality} national team!`;
  }
  
  s.managerState = ms;
  s.events = [...s.events, `📋 Manager Season ${ms.season}: ${result}`];
  
  return s;
}

export function endManagerCareer(prev: CareerState): CareerState {
  const s = { ...prev };
  s.legacy = calculateLegacy(s);
  s.phase = "retired";
  return s;
}

/* ─── Pundit Career ─── */
export type PunditAction = "praise_player" | "criticise_manager" | "bold_prediction";

export function advancePunditSeason(prev: CareerState, action: PunditAction): CareerState {
  const s = { ...prev };
  if (!s.punditState) return s;
  const ps = { ...s.punditState };
  ps.season += 1;
  
  let eventText = "";
  switch (action) {
    case "praise_player": {
      s.socialMediaFollowers += 0.5;
      s.popularity = clamp(s.popularity + 3, 0, 100);
      ps.followerGains += 0.5;
      eventText = "🎙️ Praised a rising star — fans loved your insight. Followers +500k";
      break;
    }
    case "criticise_manager": {
      if (Math.random() < 0.4) {
        // Controversy!
        ps.controversies += 1;
        s.socialMediaFollowers += 2;
        s.popularity = clamp(s.popularity - 5, 0, 100);
        ps.followerGains += 2;
        eventText = "🔥 Your criticism went viral! Controversy but +2M followers";
      } else {
        s.socialMediaFollowers += 0.8;
        s.popularity = clamp(s.popularity + 2, 0, 100);
        ps.followerGains += 0.8;
        eventText = "🎙️ Constructive criticism well received. Followers +800k";
      }
      break;
    }
    case "bold_prediction": {
      const cameTrue = Math.random() < 0.35;
      ps.predictions.push({ season: ps.season, prediction: "Bold prediction", cameTrue });
      if (cameTrue) {
        ps.legacyBonus += 3;
        s.socialMediaFollowers += 1.5;
        s.popularity = clamp(s.popularity + 8, 0, 100);
        ps.followerGains += 1.5;
        eventText = "🎯 Your bold prediction came TRUE! Legacy +3, Followers +1.5M";
      } else {
        s.socialMediaFollowers += 0.3;
        ps.followerGains += 0.3;
        eventText = "❌ Bold prediction was wrong — but people remember you said it. +300k followers";
      }
      break;
    }
  }
  
  // Build media empire milestones
  if (ps.season === 3) eventText += " · 📺 Offered your own weekly show!";
  if (ps.season === 5) eventText += " · 🏢 You've built a media empire!";
  
  s.punditState = ps;
  s.punditEvents = [...s.punditEvents, eventText];
  s.events = [...s.events, eventText];
  
  return s;
}

export function endPunditCareer(prev: CareerState): CareerState {
  const s = { ...prev };
  if (s.punditState) {
    s.integrityBonus += s.punditState.legacyBonus;
  }
  s.isPundit = true;
  s.legacy = calculateLegacy(s);
  s.phase = "retired";
  return s;
}

/* ─── Club Owner Career ─── */
export function advanceOwnerSeason(prev: CareerState): CareerState {
  const s = { ...prev };
  if (!s.ownerState) return s;
  const os = { ...s.ownerState };
  os.season += 1;
  
  // Transfer budget grows with success
  os.budget = Math.round((os.budget + rand(1, 3)) * 10) / 10;
  
  const promoted = os.clubTier > 1 && Math.random() < 0.25;
  const wonTrophy = Math.random() < (os.clubTier <= 2 ? 0.15 : 0.10);
  const relegated = !promoted && os.clubTier < 4 && Math.random() < 0.1;
  
  let result = "";
  if (promoted) {
    os.promotions += 1;
    os.clubTier -= 1;
    result = `🎉 Promoted to Tier ${os.clubTier}!`;
    os.budget += 5;
  } else if (relegated) {
    os.clubTier += 1;
    result = `📉 Relegated to Tier ${os.clubTier}`;
    os.budget = Math.max(1, os.budget - 3);
  } else if (wonTrophy) {
    os.trophies += 1;
    result = `🏆 Won the league!`;
    os.budget += 3;
  } else {
    const positions = ["3rd", "5th", "8th", "mid-table", "lower half"];
    result = `Finished ${pick(positions)}`;
  }
  
  // Revenue from ownership
  const revenue = os.clubTier === 1 ? 20 : os.clubTier === 2 ? 8 : os.clubTier === 3 ? 3 : 1;
  s.netWorth += revenue;
  result += ` · Revenue: €${revenue}M`;
  
  os.seasonResults = [...os.seasonResults, { year: os.season, club: os.club, tier: os.clubTier, result, trophy: wonTrophy }];
  s.ownerState = os;
  s.events = [...s.events, `🏟️ Owner Season ${os.season} at ${os.club}: ${result}`];
  
  return s;
}

export function endOwnerCareer(prev: CareerState): CareerState {
  const s = { ...prev };
  if (s.ownerState) {
    // Owner gets legacy bonus
    s.integrityBonus += s.ownerState.promotions * 3 + s.ownerState.trophies * 5;
  }
  s.legacy = calculateLegacy(s);
  s.phase = "retired";
  return s;
}

/* ─── Share text ─── */
export function generateShareText(state: CareerState): string {
  const totals = getCareerTotals(state.seasons);
  const tier = state.legacy?.tier || "JOURNEYMAN";
  const totalTrophies = totals.leagueTitles + totals.domesticCups + totals.championsLeagues + totals.worldCups;
  return `I finished my Soccer Career as a ${tier} — ${totals.goals} goals, ${totalTrophies} trophies, ${totals.ballonDors} Ballon d'Ors. Can you beat me? douknowball.com/soccer-career`;
}
