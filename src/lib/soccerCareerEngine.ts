// Soccer Career Simulation Engine v2, Youth Academy + Pro System

import {
  getEraStars, getEraTopClubs, getEraLeagueClubs, getEraUclOpponents,
  getEraRivalName, adjustClubsForYear, getExtraEvents, rollSeasonInjury,
  BDOR_WIN_MIN_GOALS, rollPotential, pickPhoneTexts,
} from "./careerEras";
import type { PhoneChoiceDef } from "./careerEras";
/* Round 130: the phone is a real phone now. Threads, contacts, a relationship
   that cools when you ignore people, and a sports feed driven by a world model
   that actually moves players between clubs. All of it lives in soccerPhone so
   this file only has to call four functions. */
import {
  ensurePhone, phoneSeasonTick, phoneReply, phoneOpen, mirrorLegacyMessage,
  worldSeasonTick, worldClubOf, phoneAppsSwing, takePhoneOffers, unreadThreads,
} from "./soccerPhone";
import type { PhoneState, WorldSeason } from "./soccerPhone";
import { managerProfileFromCareer } from './soccerCareerToManager';
import { realJobOffers } from './managerJobMarket';
import { managerStanding } from './managerOffers';
import {
  getLifeEvents, getPriorityLifeEventIds,
  personalityFollowerMult, personalitySponsorMult,
  agentWageMult, agentIncomeCutRate, agentTransferCutRate,
} from "./soccerCareerLife";
import type { PlayerAppearance } from "./soccerCareerAppearance";
/* Round 131: height, weight and the specific attributes under each of the six
   families. buildEffects turns a build into the handful of multipliers the
   season simulation reads, and it returns exactly 1.00 on everything for a
   player who changed nothing, which is what makes it safe to bolt onto maths
   that was balanced before it existed. */
import {
  buildEffects, safePhysique, safeShape, defaultPhysique, NEUTRAL_EFFECTS,
} from "./soccerCareerAttributes";
import type { PlayerPhysique, AttrShape, BuildEffects } from "./soccerCareerAttributes";
import { getCorruptionEvents } from "./soccerCareerCorruption";
import { getRealismEvents } from "./soccerCareerRealism";
import {
  runInternationalSummer, tournamentForYear, offYearCaps, toHistoryEntry,
  nationStrength as intlNationStrength, confederationOf, pickSquad,
} from "./soccerInternational";
import type {
  IntlTournament, IntlHistoryEntry, PlayerForm,
} from "./soccerInternational";

export type {
  IntlTournament, IntlHistoryEntry, IntlTie, IntlTableRow, IntlMatch,
  IntlRound, QualifyingCampaign, SquadCall, Confederation, TournamentFormat,
} from "./soccerInternational";
export {
  confederationOf, nationStrength, fifaRankOf, hasPublishedRank,
  tournamentForYear,
} from "./soccerInternational";

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
  injury?: string | null;
  injuryWeeks?: number;
  injurySevere?: boolean;
  leagueTitle: boolean;
  domesticCup: boolean;
  championsLeague: boolean;
  worldCup: boolean;
  ballonDor: boolean;
  ballonDorRank: number | null; // 1-10 if nominated, 11-30 extended world ranking, null otherwise
  type: "youth" | "playing" | "retired" | "manager";
  // International stats for this season
  intApps: number;
  intGoals: number;
  intAssists: number;
  intRating: number;
  tournament: string | null; // "World Cup", "Continental", or null
  tournamentResult: string | null; // "Winner", "Runner-up", "Semi-final", "Quarter-final", "Group Stage", "Best Player"
  /** Round 124: won your continental championship this summer. Kept separate
      from worldCup so the cabinet does not pretend a Euros is a World Cup. */
  continentalCup?: boolean;
}

export interface ContractOffer {
  club: ClubData;
  contractYears: number;
  wage: number; // weekly wage in euros (not thousands)
  transferFee: number; // in millions
  isDreamClub?: boolean;
  isPayCut?: boolean;
  /** Round 54: the senior side of the academy that raised you. Always on the
      table when you turn pro, and again later as a romantic homecoming. */
  isHomegrown?: boolean;
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
  /* ─── Round 111: being out of work is a real place you can be ───
     Until now getting sacked hired you again on the very same line, at a
     random club, instantly. That is the opposite of what was asked for: if
     the sack has no consequence then the whole job is free. You now sit
     unemployed with a feed of offers you have to have earned, and it is
     genuinely possible to open it and find nothing. */
  unemployed?: boolean;
  /** Seasons spent out of work. Offers dry up the longer this runs. */
  seasonsOut?: number;
  /** Relegations, which follow you around. */
  relegations?: number;
  /** How the last job ended, which is the biggest short term factor. */
  departure?: 'relegated' | 'sacked' | 'mutual' | 'resigned' | 'poached' | 'retiredPlayer';
  /** The offers currently on the table, empty when nobody wants you. */
  offers?: ManagerJobOffer[];
  /** What to tell the player when the feed is empty. */
  offerNote?: string;
}

/** Round 111: one job on the table, with the reason it exists. */
export interface ManagerJobOffer {
  club: string;
  country: string;
  tier: number;
  league: string;
  brief: string;
  reason: string;
  budget: number;
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
  /** Round 124: summers you were fit and available but the manager left you
      out, and summers your country simply did not make it. Both are stories. */
  squadSnubs?: number;
  failedQualifications?: number;
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
export type SpendingCategory = "property" | "vehicle" | "investment" | "lifestyle" | "performance" | "flex" | "family" | "shady";

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
  /** Round 54 generic effects, applied automatically on purchase so new items
      never need another branch in purchaseSpendingItem. */
  statBoosts?: Partial<Record<"pace" | "shooting" | "passing" | "dribbling" | "defending" | "physical" | "reflexes", number>>;
  moraleBoost?: number;
  popularityBoost?: number;
  followersBoostM?: number; // millions of followers gained on purchase
  heatChange?: number;      // corruption heat delta (shady items run hot)
  minPopularity?: number;   // some purchases need fame, not just money
  requiresDirty?: boolean;  // only appears once you have dirty money to move
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
  { id: "rent_apartment", name: "Rent Apartment", emoji: "🏢", category: "property", cost: 0, monthlyCost: 0.024, description: "Basic city apartment, €2k/month", oneTime: true },
  { id: "city_apartment", name: "City Apartment", emoji: "🏙️", category: "property", cost: 0.8, description: "Buy a stylish city apartment, €800k", oneTime: true, minNetWorth: 0.5 },
  { id: "luxury_house", name: "Luxury House", emoji: "🏠", category: "property", cost: 3, description: "Buy a luxury house, €3M", oneTime: true, minNetWorth: 2 },
  { id: "mansion", name: "Mansion", emoji: "🏰", category: "property", cost: 8, description: "Buy a sprawling mansion, €8M", oneTime: true, minNetWorth: 5 },
  { id: "private_island", name: "Private Island", emoji: "🏝️", category: "property", cost: 25, description: "Buy your own private island, €25M", oneTime: true, minNetWorth: 20 },
  // Vehicles
  { id: "sports_car", name: "Sports Car", emoji: "🏎️", category: "vehicle", cost: 0.15, description: "Buy a sports car, €150k", oneTime: false },
  { id: "supercar_collection", name: "Supercar Collection", emoji: "🚗", category: "vehicle", cost: 0.8, description: "Build a supercar collection, €800k", oneTime: true, minNetWorth: 1 },
  { id: "private_jet", name: "Private Jet", emoji: "✈️", category: "vehicle", cost: 15, monthlyCost: 0.5, description: "Buy a private jet, €15M + €500k/yr upkeep", oneTime: true, minNetWorth: 12 },
  { id: "yacht", name: "Yacht", emoji: "🛥️", category: "vehicle", cost: 8, monthlyCost: 0.3, description: "Buy a luxury yacht, €8M + €300k/yr upkeep", oneTime: true, minNetWorth: 6 },
  // Investments
  { id: "restaurant_chain", name: "Restaurant Chain", emoji: "🍽️", category: "investment", cost: 0.5, description: "30% chance profit €1.5M, 70% break even or loss", oneTime: false },
  { id: "crypto", name: "Crypto", emoji: "₿", category: "investment", cost: 0.2, description: "50% chance 3x return, 50% lose it all", oneTime: false },
  { id: "football_shares", name: "Football Club Shares", emoji: "⚽", category: "investment", cost: 5, description: "Steady 8% return per year", oneTime: true, minNetWorth: 4 },
  { id: "tech_startup", name: "Tech Startup", emoji: "💻", category: "investment", cost: 1, description: "20% chance 10x return, 80% lose it", oneTime: false },
  // Lifestyle upgrades
  { id: "personal_chef", name: "Personal Chef", emoji: "👨‍🍳", category: "lifestyle", cost: 0, monthlyCost: 0.05, description: "Hire a personal chef, €50k/year", oneTime: true, effect: "Better nutrition, +2 morale per season" },
  { id: "personal_trainer", name: "Personal Trainer", emoji: "💪", category: "lifestyle", cost: 0, monthlyCost: 0.08, description: "Private trainer, €80k/year", oneTime: true, effect: "+1 Physical stat per season" },
  { id: "sports_psychologist", name: "Sports Psychologist", emoji: "🧠", category: "lifestyle", cost: 0, monthlyCost: 0.06, description: "Mental coach, €60k/year", oneTime: true, effect: "+5 Morale permanently on hire" },
  { id: "elite_recovery", name: "Elite Recovery Clinic", emoji: "🏥", category: "lifestyle", cost: 0, monthlyCost: 0.1, description: "Top recovery tech, €100k/year", oneTime: true, effect: "Reduces injury recovery time by 50%" },
  // Performance upgrades
  { id: "perf_chef", name: "Private Chef", emoji: "🥗", category: "performance", cost: 2, description: "Elite nutrition plan, €2M", oneTime: true, effect: "+2 Physical, +2 Stamina" },
  { id: "perf_psychologist", name: "Sports Psychologist", emoji: "🧠", category: "performance", cost: 1.5, description: "Mental performance coach, €1.5M", oneTime: true, effect: "+3 Composure" },
  { id: "perf_cryo", name: "Cryotherapy Suite", emoji: "🧊", category: "performance", cost: 3, description: "Home cryo chamber, €3M", oneTime: true, effect: "Reduces injury risk by 15%" },
  { id: "perf_trainer", name: "Elite Personal Trainer", emoji: "🏋️", category: "performance", cost: 2.5, description: "World-class trainer, €2.5M", oneTime: true, effect: "+2 Pace, +2 Physical" },
  { id: "perf_biomech", name: "Biomechanics Coach", emoji: "🔬", category: "performance", cost: 2, description: "Technique specialist, €2M", oneTime: true, effect: "+2 Shooting, +2 Passing" },
  { id: "perf_altitude", name: "Altitude Training Camp", emoji: "⛰️", category: "performance", cost: 1, description: "High-altitude camp, €1M", oneTime: true, effect: "+3 Stamina" },
  { id: "perf_sleep", name: "Sleep Optimization Clinic", emoji: "😴", category: "performance", cost: 1.5, description: "Sleep science program, €1.5M", oneTime: true, effect: "Faster injury recovery" },
  { id: "perf_vr", name: "VR Training System", emoji: "🥽", category: "performance", cost: 2, description: "Virtual training tech, €2M", oneTime: true, effect: "+2 Decision Making" },
  { id: "perf_vision", name: "Vision Training Clinic", emoji: "👁️", category: "performance", cost: 1.5, description: "Visual processing training, €1.5M", oneTime: true, effect: "+2 Passing, better assist rate" },
  { id: "perf_setpiece", name: "Set Piece Coach", emoji: "🎯", category: "performance", cost: 1, description: "Dead ball specialist, €1M", oneTime: true, effect: "+3 Free Kick accuracy" },
  // 2026-08-05 money expansion (owner: "way more options to do with ur money")
  { id: "boyhood_club", name: "Buy Your Boyhood Club", emoji: "🏟️", category: "property", cost: 60, description: "Buy the club where it all started, €60M", oneTime: true, minNetWorth: 50, effect: "Legacy landmark, popularity +20" },
  { id: "hometown_academy", name: "Hometown Academy", emoji: "🎓", category: "property", cost: 10, description: "Build a youth academy back home, €10M", oneTime: true, minNetWorth: 8, effect: "Legacy +, popularity +10" },
  { id: "football_museum", name: "Museum of You", emoji: "🖼️", category: "property", cost: 12, description: "A museum about your own career, €12M", oneTime: true, minNetWorth: 15, effect: "Popularity +8, peak ego" },
  { id: "hypercar", name: "Hypercar", emoji: "🏎️", category: "vehicle", cost: 2, description: "A seven-figure hypercar, €2M", oneTime: false, minNetWorth: 3 },
  { id: "submarine", name: "Personal Submarine", emoji: "🛳️", category: "vehicle", cost: 30, monthlyCost: 0.4, description: "Yes, a submarine, €30M", oneTime: true, minNetWorth: 45, effect: "Absolutely unnecessary. Popularity +5" },
  { id: "teammate_startup", name: "Teammate's Startup", emoji: "🚀", category: "investment", cost: 1, description: "40% chance 5x return, 60% lose it", oneTime: false },
  { id: "meme_coin", name: "Meme Coin", emoji: "🐕", category: "investment", cost: 0.5, description: "10% chance 20x, 90% goes to zero", oneTime: false },
  { id: "art_collection", name: "Art Collection", emoji: "🎨", category: "investment", cost: 3, description: "Steady 12% a year, very classy", oneTime: true, minNetWorth: 5 },
  { id: "racehorse", name: "Racehorse", emoji: "🐎", category: "investment", cost: 2, description: "25% chance of a €6M champion, else modest stud fees", oneTime: false, minNetWorth: 4 },
  { id: "esports_org", name: "Esports Org", emoji: "🎮", category: "investment", cost: 4, description: "35% chance 3x return", oneTime: true, minNetWorth: 6 },
  { id: "security_team", name: "Security Team", emoji: "🕶️", category: "lifestyle", cost: 0, monthlyCost: 0.2, description: "Round-the-clock protection, €200k/year", oneTime: true, effect: "+3 Morale, sleeps easy" },
  { id: "documentary_crew", name: "Documentary Crew", emoji: "🎥", category: "lifestyle", cost: 0, monthlyCost: 0.15, description: "Your own all-access doc series, €150k/year", oneTime: true, effect: "+3 Popularity per season" },
  { id: "family_office", name: "Family Office", emoji: "🏦", category: "lifestyle", cost: 0, monthlyCost: 0.12, description: "Professional wealth managers, €120k/year", oneTime: true, effect: "+2% net worth growth per season" },
  { id: "charity_foundation", name: "Charity Foundation", emoji: "❤️", category: "lifestyle", cost: 5, monthlyCost: 0.1, description: "Your name, doing good, €5M + €100k/year", oneTime: true, minNetWorth: 8, effect: "Popularity +3 and legacy credit per season" },
  // 2026-08-05 second wave: even more outta pocket
  { id: "signature_cologne", name: "Signature Cologne", emoji: "🧴", category: "investment", cost: 2, description: "Launch your own fragrance, €2M. 60% chance it prints €5M, 40% it smells like a locker room", oneTime: true, minNetWorth: 3 },
  { id: "tequila_brand", name: "Celebrity Tequila", emoji: "🥃", category: "investment", cost: 4, description: "Every star has one, €4M. 45% chance 3x, else slow fade", oneTime: true, minNetWorth: 6 },
  { id: "video_game_studio", name: "Football Game Studio", emoji: "🎮", category: "investment", cost: 8, description: "Fund a studio making a game where YOU are the cover star, €8M. 25% chance 4x hit", oneTime: true, minNetWorth: 12 },
  { id: "space_flight", name: "Seat To Space", emoji: "🚀", category: "lifestyle", cost: 12, description: "Eleven minutes above the atmosphere, €12M. Popularity +12, perspective forever", oneTime: true, minNetWorth: 20 },
  { id: "rivals_boyhood_club", name: "Buy Your Rival's Boyhood Club", emoji: "🗿", category: "property", cost: 45, description: "The pettiest €45M in football history. Rename the stadium after yourself", oneTime: true, minNetWorth: 60, effect: "Popularity +8, the feud becomes eternal" },
  // ── Round 54 mega expansion: FLEX. Pure, glorious, unnecessary. ──
  { id: "flex_gold_chain", name: "Cuban Link Chain", emoji: "⛓️", category: "flex", cost: 0.3, description: "Half a kilo of gold around your neck, €300k", oneTime: true, popularityBoost: 2, effect: "Popularity +2" },
  { id: "flex_diamond_grill", name: "Diamond Grill", emoji: "😬", category: "flex", cost: 0.5, description: "Your smile now costs more than most transfers, €500k", oneTime: true, popularityBoost: 3, effect: "Popularity +3, blinding" },
  { id: "flex_watch_wall", name: "Watch Wall", emoji: "⌚", category: "flex", cost: 4, description: "A rotating display wall of 40 watches, €4M", oneTime: true, minNetWorth: 6, popularityBoost: 3, effect: "Popularity +3" },
  { id: "flex_sneaker_vault", name: "Sneaker Vault", emoji: "👟", category: "flex", cost: 1.5, description: "Climate-controlled room for 800 pairs, €1.5M", oneTime: true, minNetWorth: 2, moraleBoost: 4, effect: "+4 Morale" },
  { id: "flex_full_sleeve", name: "Full Tattoo Sleeve", emoji: "🖋️", category: "flex", cost: 0.05, description: "Your whole story in ink, €50k", oneTime: true, popularityBoost: 2, effect: "Popularity +2" },
  { id: "flex_back_tattoo", name: "Back Piece Of Yourself", emoji: "🎨", category: "flex", cost: 0.1, description: "A tattoo of you celebrating, on you, €100k", oneTime: true, minPopularity: 50, popularityBoost: 3, effect: "Peak ego. Popularity +3" },
  { id: "flex_tiger", name: "Pet Tiger", emoji: "🐅", category: "flex", cost: 1, monthlyCost: 0.15, description: "A literal tiger named Butters, €1M + upkeep", oneTime: true, minNetWorth: 5, popularityBoost: 5, heatChange: 5, effect: "Popularity +5, questions from authorities" },
  { id: "flex_exotic_aquarium", name: "Shark Aquarium", emoji: "🦈", category: "flex", cost: 2.5, monthlyCost: 0.1, description: "A wall-sized tank with two actual sharks, €2.5M", oneTime: true, minNetWorth: 8, moraleBoost: 3, effect: "+3 Morale, do not tap the glass" },
  { id: "flex_entourage", name: "Full-Time Entourage", emoji: "🕺", category: "flex", cost: 0, monthlyCost: 0.5, description: "Twelve guys whose job is agreeing with you, €500k/yr", oneTime: true, minNetWorth: 10, moraleBoost: 5, effect: "+5 Morale, zero honest feedback" },
  { id: "flex_gold_phone", name: "Solid Gold Phone", emoji: "📱", category: "flex", cost: 0.2, description: "It barely gets signal but it is GOLD, €200k", oneTime: true, popularityBoost: 1, effect: "Popularity +1" },
  { id: "flex_custom_cleats", name: "Diamond-Studded Boots", emoji: "💎", category: "flex", cost: 0.8, description: "Match-worn once, then straight into a display case, €800k", oneTime: true, minPopularity: 40, popularityBoost: 4, effect: "Popularity +4" },
  { id: "flex_hologram", name: "Hologram Of Yourself", emoji: "👻", category: "flex", cost: 3, description: "Greets guests in your foyer with your catchphrase, €3M", oneTime: true, minNetWorth: 12, popularityBoost: 3, effect: "Guests scream every time. Popularity +3" },
  { id: "flex_theme_park_day", name: "Rent A Theme Park", emoji: "🎢", category: "flex", cost: 1.2, description: "The whole park, one day, just your people, €1.2M", oneTime: false, minNetWorth: 4, moraleBoost: 6, effect: "+6 Morale" },
  { id: "flex_statue_garden", name: "Statue Garden Of You", emoji: "🗽", category: "flex", cost: 6, description: "Seven marble yous in seven iconic poses, €6M", oneTime: true, minNetWorth: 20, popularityBoost: 4, effect: "Popularity +4, deeply unsettling" },
  { id: "flex_racing_team", name: "Kart Racing Team", emoji: "🏎️", category: "flex", cost: 2, description: "Your own liveried karting outfit, €2M", oneTime: true, minNetWorth: 8, moraleBoost: 3, popularityBoost: 2, effect: "+3 Morale, +2 Popularity" },
  // ── FAMILY. The people who knew you before the money. ──
  { id: "fam_parents_house", name: "Buy Your Parents A House", emoji: "🏡", category: "family", cost: 1.5, description: "The first big promise, kept, €1.5M", oneTime: true, moraleBoost: 8, popularityBoost: 3, effect: "+8 Morale, +3 Popularity. The photo goes viral" },
  { id: "fam_mom_car", name: "Mom's Dream Car", emoji: "🚙", category: "family", cost: 0.15, description: "She cried at the dealership, €150k", oneTime: true, moraleBoost: 4, effect: "+4 Morale" },
  { id: "fam_college_fund", name: "Siblings' College Fund", emoji: "🎓", category: "family", cost: 0.5, description: "Every niece, nephew and cousin covered, €500k", oneTime: true, moraleBoost: 5, effect: "+5 Morale" },
  { id: "fam_grandpa_season", name: "Grandpa's Lifetime Season Ticket", emoji: "👴", category: "family", cost: 0.05, description: "Front row, halfway line, forever, €50k", oneTime: true, moraleBoost: 4, effect: "+4 Morale, he heckles the ref weekly" },
  { id: "fam_hometown_pitch", name: "Rebuild The Hometown Pitch", emoji: "🥅", category: "family", cost: 2, description: "The cage you learned in, redone properly with lights, €2M", oneTime: true, popularityBoost: 6, moraleBoost: 4, effect: "+6 Popularity, +4 Morale" },
  { id: "fam_family_vacation", name: "Whole-Family World Tour", emoji: "🌍", category: "family", cost: 0.8, description: "Twenty-three relatives, first class, one summer, €800k", oneTime: false, moraleBoost: 6, effect: "+6 Morale" },
  { id: "fam_wedding", name: "Fairytale Wedding", emoji: "💒", category: "family", cost: 3, description: "Castle, fireworks, a surprise performance by a global star, €3M", oneTime: true, minNetWorth: 5, moraleBoost: 8, popularityBoost: 4, effect: "+8 Morale, +4 Popularity" },
  { id: "fam_dad_pub", name: "Buy Dad The Local Pub", emoji: "🍺", category: "family", cost: 0.7, description: "He renames it after your first goal, €700k", oneTime: true, moraleBoost: 5, popularityBoost: 2, effect: "+5 Morale, +2 Popularity" },
  { id: "fam_security_family", name: "Family Security Detail", emoji: "🛡️", category: "family", cost: 0, monthlyCost: 0.25, description: "Round-the-clock protection for the whole family, €250k/yr", oneTime: true, minNetWorth: 15, moraleBoost: 4, effect: "+4 Morale, everyone sleeps easy" },
  { id: "fam_foundation_scholarship", name: "Hometown Scholarships", emoji: "📚", category: "family", cost: 1, monthlyCost: 0.1, description: "Ten kids a year through school in your name, €1M + €100k/yr", oneTime: true, popularityBoost: 5, effect: "+5 Popularity and legacy credit" },
  // ── SHADY. The catalogue nobody photographs. Every purchase runs hot. ──
  { id: "shady_offshore", name: "Offshore Account", emoji: "🏝️", category: "shady", cost: 0.5, description: "A quiet account in a sunny jurisdiction, €500k in fees", oneTime: true, minNetWorth: 3, heatChange: 12, effect: "Hides earnings from the taxman. Heat +12" },
  { id: "shady_shell_carwash", name: "Cash-Only Car Wash", emoji: "🧼", category: "shady", cost: 1, description: "Somehow washes 4,000 cars a week, €1M", oneTime: true, requiresDirty: true, heatChange: 8, effect: "Launders €2M of dirty money per season. Heat +8" },
  { id: "shady_nightclub", name: "Nightclub 'Offside'", emoji: "🪩", category: "shady", cost: 3, description: "VIP room, no cameras, cash bar, €3M", oneTime: true, minNetWorth: 5, requiresDirty: true, heatChange: 10, effect: "Launders €4M of dirty money per season. Heat +10" },
  { id: "shady_burner_phones", name: "Drawer Of Burner Phones", emoji: "📵", category: "shady", cost: 0.02, description: "Twelve prepaid phones, no names, €20k", oneTime: true, heatChange: 4, effect: "Shady arcs get safer calls. Heat +4" },
  { id: "shady_fixer_retainer", name: "The Fixer's Retainer", emoji: "🕴️", category: "shady", cost: 0, monthlyCost: 0.3, description: "A man who makes problems disappear, €300k/yr", oneTime: true, minNetWorth: 8, heatChange: 6, effect: "Reduces scandal fallout. Heat +6" },
  { id: "shady_ref_dinner", name: "'Dinner' With Officials", emoji: "🍷", category: "shady", cost: 0.25, description: "A very expensive restaurant, a very friendly whistle, €250k", oneTime: false, heatChange: 15, effect: "Next season runs smoother. Heat +15" },
  { id: "shady_passport", name: "Second Passport", emoji: "🛂", category: "shady", cost: 0.8, description: "A backup identity from a cooperative consulate, €800k", oneTime: true, minNetWorth: 5, heatChange: 10, effect: "An exit plan. Heat +10" },
  { id: "shady_casino_credit", name: "Casino Credit Line", emoji: "🎰", category: "shady", cost: 0, monthlyCost: 0.4, description: "The house always says yes to you, €400k/yr average damage", oneTime: true, minNetWorth: 10, heatChange: 8, effect: "Feeds the gambling arcs. Heat +8" },
  { id: "shady_paparazzi_payoff", name: "Paparazzi Payroll", emoji: "📸", category: "shady", cost: 0, monthlyCost: 0.2, description: "They shoot what you TELL them to shoot, €200k/yr", oneTime: true, heatChange: 5, popularityBoost: 3, effect: "+3 Popularity, the bad photos vanish. Heat +5" },
  { id: "shady_crypto_mixer", name: "Crypto Tumbler", emoji: "🌀", category: "shady", cost: 0.3, description: "Coins go in dirty, come out confused, €300k", oneTime: true, requiresDirty: true, heatChange: 12, effect: "Launders €1.5M of dirty money per season. Heat +12" },
  // ── More PROPERTY, VEHICLES and INVESTMENTS while we are here. ──
  { id: "ski_chalet", name: "Alpine Ski Chalet", emoji: "🎿", category: "property", cost: 6, description: "Snow, sauna, silence, €6M", oneTime: true, minNetWorth: 10, moraleBoost: 3, effect: "+3 Morale" },
  { id: "desert_palace", name: "Desert Palace", emoji: "🕌", category: "property", cost: 18, description: "Gold taps. Twelve bathrooms. Why not, €18M", oneTime: true, minNetWorth: 30, popularityBoost: 3, effect: "Popularity +3" },
  { id: "penthouse_row", name: "Penthouse In Five Cities", emoji: "🌆", category: "property", cost: 22, description: "Paris, Dubai, Miami, Tokyo, London. One key ring, €22M", oneTime: true, minNetWorth: 35, popularityBoost: 4, effect: "Popularity +4" },
  { id: "vineyard", name: "Tuscan Vineyard", emoji: "🍇", category: "property", cost: 9, description: "Your face on every bottle, €9M", oneTime: true, minNetWorth: 15, moraleBoost: 3, effect: "+3 Morale, surprisingly drinkable" },
  { id: "monster_truck", name: "Monster Truck", emoji: "🚛", category: "vehicle", cost: 0.4, description: "For the school run, €400k", oneTime: true, popularityBoost: 2, effect: "Popularity +2" },
  { id: "vintage_bus", name: "The Team Bus (Vintage)", emoji: "🚌", category: "vehicle", cost: 0.6, description: "Your first club's 1980s team bus, restored, €600k", oneTime: true, moraleBoost: 3, effect: "+3 Morale, pure nostalgia" },
  { id: "helicopter", name: "Personal Helicopter", emoji: "🚁", category: "vehicle", cost: 7, monthlyCost: 0.25, description: "Training is 90 seconds away, €7M", oneTime: true, minNetWorth: 12, effect: "Never late again" },
  { id: "superyacht", name: "Superyacht 'Golazo'", emoji: "🛳️", category: "vehicle", cost: 40, monthlyCost: 1, description: "Helipad, cinema, a smaller boat inside it, €40M", oneTime: true, minNetWorth: 60, popularityBoost: 6, effect: "Popularity +6" },
  { id: "inv_padel_chain", name: "Padel Club Chain", emoji: "🎾", category: "investment", cost: 2, description: "Every footballer's favorite retirement hobby, early. 50% chance 2x", oneTime: true, minNetWorth: 4 },
  { id: "inv_burger_franchise", name: "Burger Franchise", emoji: "🍔", category: "investment", cost: 1.5, description: "Your celebration is on the cups. 55% chance 2x, else break even", oneTime: true, minNetWorth: 3 },
  { id: "inv_womens_club", name: "Fund A Women's Team", emoji: "⚽", category: "investment", cost: 3, description: "Build the women's side of a club properly. Steady 6% and huge respect", oneTime: true, minNetWorth: 6, popularityBoost: 5, effect: "+5 Popularity" },
  { id: "inv_stadium_naming", name: "Stadium Naming Rights", emoji: "🏟️", category: "investment", cost: 15, description: "A real stadium, your name on it, 10 years. Steady 5% a year", oneTime: true, minNetWorth: 25, popularityBoost: 6, effect: "+6 Popularity" },
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
  /** Legacy field, kept so a save made before Round 124 still renders its
      half finished World Cup screen instead of throwing. Nothing sets it now. */
  pendingWorldCup: WorldCupResult | null;
  /** Round 124: the tournament waiting on the "world_cup" screen. */
  pendingTournament?: IntlTournament | null;
  /** The most recent tournament, kept in full so the bracket stays readable
      from the International tile all season. */
  lastTournament?: IntlTournament | null;
  /** One compact row per tournament ever played, player in it or not. */
  intlHistory?: IntlHistoryEntry[];
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
  /** Round 78: the hidden ceiling rolled at creation. Growth stalls hard as
   *  overall approaches it. Old saves have none and default generously. */
  potential?: number;
  /** Round 131: ceiling points earned back by an exceptional career. The
   *  rolled number is where you are expected to top out, not a wall welded
   *  shut: back to back seasons that are elite AND decorated, while already
   *  pressed against the ceiling, buy one point at a time. 99 is still the
   *  hard wall and nothing can push past it. */
  potentialEarned?: number;
  /** Consecutive seasons that were both elite and decorated. Sustained is the
   *  whole point, so the first one never counts. */
  eliteStreak?: number;
  /** The overall this career actually began at, so the legacy verdict can tell
   *  a kid who climbed from 55 apart from a player who was handed 99 on the
   *  creation screen. Absent on saves from before Round 131, and the verdict
   *  simply leaves the line out rather than guessing. */
  startingOverall?: number;
  /** Round 131: height and weight, and the specifics under each family stored
   *  as offsets that add to zero inside their family, so shaping a player can
   *  never move his overall. Both optional: an old save derives the position
   *  default and a completely neutral shape. */
  physique?: PlayerPhysique;
  attrShape?: AttrShape;
  /** Round 80: the phone. All optional so older saves keep loading. */
  karma?: number;              // 0-100 public karma, starts 50
  phoneInbox?: PhoneMessage[]; // waiting texts + answered thread log
  phoneUsedIds?: string[];     // pool ids already received this career
  /** Round 130: threads, contacts, relationships and the world feed. Optional
   *  for the same reason: a save from before this round has none and
   *  ensurePhone hands back an empty one on both the read and write paths. */
  phone?: PhoneState;
  /** Round 81: last season-year a training mini game was played (one per season). */
  trainingSeasonYear?: number;
  peakOverall: number;
  retirementSuggested: boolean; // has the player been shown the retirement suggestion
  // Social media action system
  socialMediaActionUsedThisSeason: boolean;
  socialMediaFocusBoost: boolean; // "Stay off social media" gives +2 all stats next season
  pendingCoverAthleteEvent: boolean;
  coverAthleteAccepted: boolean;
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
  /** 2026-08-05 storyline arcs. Optional so pre-expansion saves keep loading. */
  mafiaStage?: number;        // 0 none, 1 took the cup money, 2 arc closed
  bdorSnubFuel?: boolean;     // finished 2nd or 3rd last ceremony
  rivalryIntensity?: number;  // 0-100 heat of the feud, optional for old saves
  /** Round 49 life layer. Optional so pre-R49 saves keep loading. */
  personality?: string | null; // showman | iceman | hothead | professor | enigma
  agentId?: string | null;     // cousin | shark | super | self
  lifeFlags?: Record<string, number>; // chained life-event arcs
  /** Round 54 realism layer. All optional so pre-R54 saves keep loading. */
  appearance?: PlayerAppearance | null; // create-your-look, rendered by PlayerAvatar
  corruptionHeat?: number;   // 0-100 hidden. Dirty choices raise it, clean seasons cool it, investigators knock at the top
  dirtyMoney?: number;       // millions of unexplained income. Spends like cash, feeds heat every season
  prisonSeasons?: number;    // >0 = doing time. Season is skipped, stats rot, papers feast
  academyClubName?: string;  // parent club of the academy you came up at (no " Youth" suffix)
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

/* ─── Round 80: the phone (an in-world phone as the life layer) ───
   Texts arrive between seasons from the PHONE_POOL in careerEras; replying
   moves karma (0-100, neutral 50) plus small morale/popularity/cash effects.
   Karma drifts back toward 50 a little every season and gently couples into
   morale and popularity at the extremes. Everything optional-field so old
   saves keep loading untouched. */

export interface PhoneMessage {
  id: string;       // unique per career: defId-year
  defId: string;
  from: string;
  emoji: string;
  text: string;
  year: number;
  choices: PhoneChoiceDef[];
  answered?: number; // index into choices once replied
}

export function karmaOf(s: CareerState): number { return s.karma ?? 50; }

/** Round 130: the badge counts conversations waiting on you, not just Round
 *  80 texts, so a thread nobody has answered still shows up on the handset. */
export function unreadPhoneCount(s: CareerState): number {
  return unreadThreads(s);
}

/** Season tick: karma drift + coupling, then deliver up to 2 new texts. */
function receivePhoneTexts(s: CareerState, phase: "youth" | "pro"): void {
  const karma = s.karma ?? 50;
  const k = karma > 50 ? karma - 2 : karma < 50 ? Math.min(50, karma + 2) : karma;
  if (k >= 70) { s.popularity = clamp(s.popularity + 2, 0, 100); s.morale = clamp(s.morale + 2, 0, 100); }
  else if (k <= 30) { s.popularity = clamp(s.popularity - 2, 0, 100); s.morale = clamp(s.morale - 1, 0, 100); }
  s.karma = k;
  const inbox = [...(s.phoneInbox ?? [])];
  const used = [...(s.phoneUsedIds ?? [])];
  const unanswered = inbox.filter(m => m.answered === undefined).length;
  const want = Math.max(0, 2 - unanswered);
  const year = s.seasons[s.seasons.length - 1]?.year ?? 2020;
  const fresh: PhoneMessage[] = [];
  for (const def of pickPhoneTexts(s.age, phase, used, want)) {
    const msg: PhoneMessage = { id: `${def.id}-${year}`, defId: def.id, from: def.from, emoji: def.emoji, text: def.text, year, choices: def.choices };
    inbox.push(msg);
    fresh.push(msg);
    used.push(def.id);
  }
  /* Keep the thread tidy: dropping oldest ANSWERED first. Round 80 kept 18,
     which is about 8 KB of choice arrays in a save that is already tight, and
     since Round 130 the conversation itself lives in the thread list, so the
     only reason to hold a legacy message at all is so an unanswered one stays
     answerable. Six is plenty for that. */
  while (inbox.length > 6) {
    const idx = inbox.findIndex(m => m.answered !== undefined);
    if (idx === -1) break;
    inbox.splice(idx, 1);
  }
  s.phoneInbox = inbox;
  s.phoneUsedIds = used;
  /* Round 130: a Round 80 text is now the FIRST line of a conversation rather
     than a dead end, so mirror it into the thread list and let the thread
     system carry it on once you answer. */
  for (const m of fresh) mirrorLegacyMessage(s, m.id, m.from, m.text, m.year);
  phoneSeasonTick(s, phase);
}

/* ─── Round 81: training ground mini games ───
   Three drills (trace-the-cones dribbling, click-burst pace, penalty
   placement shooting), one session per season. 50+ scores +1, 80+ scores +2
   to the drilled stat via the existing statBoostNextSeason pipeline, so the
   gain lands with next season's growth exactly like event boosts do. */

export type TrainingDrill = "dribbling" | "pace" | "shooting";

export function trainingAvailable(s: CareerState): boolean {
  if (s.retired) return false;
  if (["retired", "post_retirement", "manager_season", "pundit_season", "owner_season", "retirement_ceremony"].includes(s.phase)) return false;
  const year = s.seasons[s.seasons.length - 1]?.year ?? 0;
  return s.trainingSeasonYear !== year;
}

export function applyTrainingResult(prev: CareerState, drill: TrainingDrill, score: number): CareerState {
  const s = { ...prev };
  const year = s.seasons[s.seasons.length - 1]?.year ?? 0;
  if (s.trainingSeasonYear === year) return prev; // one session per season
  const sc = clamp(Math.round(score), 0, 100);
  const stat: keyof CareerState["statBoostNextSeason"] =
    drill === "pace" ? "pace" : drill === "dribbling" ? "dribbling" : (s.position === "GK" ? "reflexes" : "shooting");
  const boost = sc >= 80 ? 2 : sc >= 50 ? 1 : 0;
  s.trainingSeasonYear = year;
  const label = stat === "reflexes" ? "Reflexes" : stat === "pace" ? "Pace" : stat === "dribbling" ? "Dribbling" : "Shooting";
  if (boost > 0) {
    s.statBoostNextSeason = { ...s.statBoostNextSeason, [stat]: (s.statBoostNextSeason[stat] || 0) + boost };
    s.morale = clamp(s.morale + 2, 0, 100);
    s.events = [...s.events, `🏋️ Training session: ${sc}/100. +${boost} ${label} coming with next season's growth`];
  } else {
    s.events = [...s.events, `🏋️ Training session: ${sc}/100. Rough day at the training ground, no gains`];
  }
  return s;
}

/* ─── Round 130: one write path for every tap in the Messages app ───
   The panel only ever gets (msgId, choiceIdx) from SoccerCareer.tsx, which
   another agent owns this round, so the two new actions ride on the same two
   arguments rather than on new props:
     th_<contact>   reply inside a thread, choiceIdx picks the preset
     open:<contact> start a conversation yourself, choiceIdx picks which one
   Anything else is a Round 80 message id and behaves exactly as it always
   did, so an old save's unanswered texts stay answerable. */
export function answerPhoneText(prev: CareerState, msgId: string, choiceIdx: number): CareerState {
  const phase: "youth" | "pro" = prev.phase === "youth" ? "youth" : "pro";

  if (msgId.startsWith("open:")) {
    const s = { ...prev };
    const res = phoneOpen(s, msgId.slice(5), phase, choiceIdx);
    return res.ok ? s : prev;
  }

  if (msgId.startsWith("th_")) {
    const s = { ...prev };
    const res = phoneReply(s, msgId, choiceIdx, phase);
    if (!res.ok) return prev;
    if (res.legacyMsgId !== undefined) {
      // The reply landed on a Round 80 text, so its karma effects still run
      // through the original path below. The thread has already carried on.
      const carried = answerLegacyText(s, res.legacyMsgId, res.legacyChoiceIdx ?? 0);
      return carried ?? s;
    }
    if (res.event) s.events = [...s.events, res.event];
    return s;
  }

  /* A bare Round 80 id. If a thread is holding that text, answer it through
     the thread so the conversation carries on the way it should. */
  const holder = ensurePhone(prev).threads.find(
    t => t.pending && t.pending.kind === "legacy" && t.pending.msgId === msgId,
  );
  if (holder) return answerPhoneText(prev, holder.id, choiceIdx);
  const legacy = answerLegacyText({ ...prev }, msgId, choiceIdx);
  return legacy ?? prev;
}

/** The Round 80 karma path, unchanged. Returns null when nothing applied. */
function answerLegacyText(s: CareerState, msgId: string, choiceIdx: number): CareerState | null {
  const inbox = [...(s.phoneInbox ?? [])];
  const i = inbox.findIndex(m => m.id === msgId);
  if (i === -1) return null;
  const msg = inbox[i];
  if (msg.answered !== undefined) return null;
  const choice = msg.choices[choiceIdx];
  if (!choice) return null;
  inbox[i] = { ...msg, answered: choiceIdx };
  s.phoneInbox = inbox;
  s.karma = clamp((s.karma ?? 50) + choice.karma, 0, 100);
  if (choice.morale) s.morale = clamp(s.morale + choice.morale, 0, 100);
  if (choice.popularity) s.popularity = clamp(s.popularity + choice.popularity, 0, 100);
  if (choice.cash) s.netWorth = Math.round((s.netWorth + choice.cash) * 100) / 100;
  const swing = choice.karma >= 5 ? " Karma up." : choice.karma <= -5 ? " Karma down." : "";
  s.events = [...s.events, `📱 Replied to ${msg.from}: ${choice.label}.${swing}`];
  return s;
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
      { label: "Ignore the noise", emoji: "🔇", consequence: "No change, let them talk" },
    ],
  },
  {
    id: "agent_corruption",
    emoji: "🕴️",
    title: "AGENT CORRUPTION",
    description: "Your accountant discovers your agent has been taking 20% commission instead of the agreed 10% for the last 3 years. That's millions stolen from you. He's sitting in your living room, sweating.",
    choices: [
      { label: "Fire him and sue", emoji: "⚖️", consequence: "Legal costs €500k, but recover the stolen money" },
      { label: "Keep him: he gets results", emoji: "🤝", consequence: "Accept the loss, maintain relationship" },
      { label: "Renegotiate to 12%", emoji: "📝", consequence: "Agent stays at 12%, partial money back" },
    ],
  },
  {
    id: "pitch_invader",
    emoji: "🏃",
    title: "PITCH INVADER",
    description: "Mid-match, a fan hops the barrier and sprints straight at you, phone out, screaming your name. Stewards are way behind. He's five yards away and closing.",
    choices: [
      { label: "Pose for the selfie", emoji: "🤳", consequence: "Popularity +10, but you concede possession and the crowd loves it" },
      { label: "Juke him like a defender", emoji: "🕺", consequence: "Viral clip! Popularity +15, morale +5" },
      { label: "Push him away hard", emoji: "✋", consequence: "Crowd boos, popularity -10, but stewards praise your composure" },
    ],
  },
  {
    id: "match_fixer_approach",
    emoji: "🎭",
    title: "THE FIXER RETURNS",
    description: "A different, smoother operator finds you at a hotel bar the night before a meaningless end-of-season game. \"Nobody cares about this one. Just miss a penalty if you get one. €2M, cash, tonight.\"",
    choices: [
      { label: "Take the deal", emoji: "💵", consequence: "€2M added instantly", risk: "25% chance of a leaked recording" },
      { label: "Film him and expose it", emoji: "🎥", consequence: "Hero status! Popularity +25, Fair Play recognition" },
      { label: "Politely decline, tell no one", emoji: "🚪", consequence: "Walk away clean. Nothing happens." },
    ],
  },
  {
    id: "captain_armband_feud",
    emoji: "©️",
    title: "THE ARMBAND WAR",
    description: "The manager is stripping the captaincy from a veteran teammate and offering it to you. The dressing room is split. The veteran hasn't spoken to you in three days.",
    choices: [
      { label: "Accept the armband", emoji: "🎖️", consequence: "Popularity +10 with fans, morale -8 with a chunk of the squad" },
      { label: "Refuse out of respect", emoji: "🙏", consequence: "Dressing room loyalty +, missed leadership bonus" },
      { label: "Broker peace between camps", emoji: "🕊️", consequence: "Morale +10 long term, no armband this season" },
    ],
  },
  {
    id: "tunnel_brawl",
    emoji: "🥊",
    title: "TUNNEL INCIDENT",
    description: "After a brutal derby loss, an opposition player shoves you in the tunnel and says something about your family. Cameras are everywhere. Your teammates are already grabbing your shirt to hold you back.",
    choices: [
      { label: "Swing back", emoji: "👊", consequence: "3-match ban, popularity +5 with your ultras, -15 elsewhere" },
      { label: "Walk away, report it", emoji: "🚶", consequence: "Federation fines the other player, your reputation +15" },
      { label: "Trash talk, no contact", emoji: "🗣️", consequence: "Minor fine, clip goes viral either way" },
    ],
  },
  {
    id: "sponsor_scandal",
    emoji: "📸",
    title: "SPONSOR MELTDOWN",
    description: "Your energy drink sponsor just got exposed in a tax fraud scandal. Journalists are calling your phone nonstop asking if you'll cut ties with a €3M-a-year deal.",
    choices: [
      { label: "Cut ties publicly", emoji: "✂️", consequence: "Lose €3M/year income, popularity +15" },
      { label: "Stay quiet, keep the money", emoji: "🤐", consequence: "Keep the deal, popularity -10 as backlash builds" },
      { label: "Donate the year's fee to charity", emoji: "❤️", consequence: "Keep the deal, popularity +20, net worth unchanged this year" },
    ],
  },
  {
    id: "betting_ring_teammate",
    emoji: "🎲",
    title: "TEAMMATE IN TROUBLE",
    description: "Your roommate on away trips confesses he owes a betting syndicate a huge sum and they've started asking about your team's injury news. He's begging you not to tell the club.",
    choices: [
      { label: "Report it to the club", emoji: "📢", consequence: "Teammate suspended, integrity bonus +15, morale -5 in the dressing room" },
      { label: "Lend him the money quietly", emoji: "💶", consequence: "Net worth -1.5M, loyalty earned, risk buried" },
      { label: "Tell him to fix it himself", emoji: "🤷", consequence: "Nothing happens immediately, but the situation lingers" },
    ],
  },
  {
    id: "wonderkid_jealousy",
    emoji: "🌟",
    title: "THE NEW WONDERKID",
    description: "The club just paid a fortune for a hyped 18-year-old who plays your exact position. The manager is clearly grooming him to replace you. He's also incredibly likeable, which makes it worse.",
    choices: [
      { label: "Mentor him openly", emoji: "🤝", consequence: "Popularity +15, but he develops faster and threatens your spot sooner" },
      { label: "Freeze him out", emoji: "🧊", consequence: "Morale -10, dressing room tension, but you keep your place longer" },
      { label: "Focus on yourself, ignore it", emoji: "🎯", consequence: "No change, business as usual" },
    ],
  },
  {
    id: "night_out_photo",
    emoji: "🍾",
    title: "THE NIGHT OUT PHOTO",
    description: "A photo leaks of you out until 4am, three days before a huge cup final. It is blowing up online. Training is in six hours and the manager wants to see you immediately.",
    choices: [
      { label: "Own it, apologize publicly", emoji: "🙇", consequence: "Popularity +5 for honesty, morale -5, fined one week's wages" },
      { label: "Deny everything", emoji: "🙅", consequence: "Story drags on, popularity -15 if it resurfaces later" },
      { label: "Let your agent spin it", emoji: "🎙️", consequence: "Story dies down fast, small net worth cost for the PR team" },
    ],
  },
  // 2026-08-05 storyline expansion (owner request: mafia arc, magazine offer, pitch chaos, more)
  {
    id: "magazine_shoot",
    emoji: "📸",
    title: "THE MAGAZINE CALL",
    description: "A famous magazine wants you on the cover. The tasteful version pays well. The artistic version, wearing nothing but a strategically held football, pays absurdly. Your agent is already laughing.",
    choices: [
      { label: "Tasteful calendar shoot", emoji: "😎", consequence: "2M fee, popularity +10" },
      { label: "The full artistic cover", emoji: "🙈", consequence: "6M fee, popularity +18", risk: "25% chance a sponsor drops you for 2M" },
      { label: "Decline politely", emoji: "🚪", consequence: "Nothing happens. Your grandmother approves." },
    ],
  },
  {
    id: "mafia_cup_ask",
    emoji: "🕴️",
    title: "AN OFFER FROM SERIOUS PEOPLE",
    description: "Two men in beautiful suits find you at a family restaurant. They know your order. They want next month's cup tie thrown. 8M, offshore, untouchable. A small favor between friends, they say.",
    choices: [
      { label: "Take the money", emoji: "💰", consequence: "8M offshore. They now consider you a friend.", risk: "They ALWAYS come back" },
      { label: "Refuse and go to the police", emoji: "🚔", consequence: "Federation protection, popularity +20, integrity +15" },
      { label: "Refuse, say nothing", emoji: "🤐", consequence: "They nod and leave. You sleep badly for a week." },
    ],
  },
  {
    id: "mafia_second_ask",
    emoji: "🎩",
    title: "THE FRIENDS RETURN",
    description: "Same restaurant. Same suits. This time it is the title decider they want, and the number is 15M. The smile is thinner now. Friends help friends twice, they say.",
    choices: [
      { label: "Do it one last time", emoji: "💶", consequence: "15M offshore", risk: "50% chance the investigation lands: 3-season ban, legacy shattered" },
      { label: "Refuse them", emoji: "✋", consequence: "They mention the first favor on the way out", risk: "40% chance the first fix leaks: 2-season ban" },
      { label: "Go to the police, full confession", emoji: "🚔", consequence: "Immunity for testimony, forced move abroad, popularity +25, the arc ends" },
    ],
  },
  {
    id: "streaker_proposal",
    emoji: "💍",
    title: "PITCH SIDE PROPOSAL",
    description: "A fan in a full wedding dress clears the hoardings, drops to one knee in the center circle, and holds up a ring the size of a grape. The stadium is HOWLING. The referee has given up.",
    choices: [
      { label: "Say yes as a joke", emoji: "💍", consequence: "The clip breaks the internet. Popularity +15" },
      { label: "Sign her sign, keep it moving", emoji: "🖊️", consequence: "Wholesome moment, popularity +8" },
      { label: "Play on, total professional", emoji: "⚽", consequence: "Pundits praise the focus, morale +3" },
    ],
  },
  {
    id: "deepfake_scandal",
    emoji: "🤖",
    title: "THE DEEPFAKE",
    description: "An AI video of you insulting your own fans is everywhere. It is fake, it is convincing, and your mentions are a war zone. The club wants a response within the hour.",
    choices: [
      { label: "Sue everyone involved", emoji: "⚖️", consequence: "1M legal costs, vindicated in court, popularity +15" },
      { label: "Post a parody of the parody", emoji: "🎭", consequence: "Popularity +20 if it lands", risk: "20% chance it reads wrong and costs 10 popularity" },
      { label: "Ignore it entirely", emoji: "🧘", consequence: "It burns out in a week. Small morale dip." },
    ],
  },
  {
    id: "hometown_statue",
    emoji: "🗿",
    title: "THE STATUE PROBLEM",
    description: "Your hometown commissioned a statue of you. The unveiling photos leak early. It looks like a melted action figure of someone else entirely. The sculptor is very proud.",
    choices: [
      { label: "Quietly fund a redo", emoji: "💶", consequence: "2M cost, the new one is beautiful, popularity +12" },
      { label: "Embrace the meme statue", emoji: "🗿", consequence: "It becomes a pilgrimage site. Popularity +18" },
      { label: "Ask them to take it down", emoji: "🙅", consequence: "The town is hurt. Popularity -5" },
    ],
  },
  {
    id: "haunted_hotel",
    emoji: "👻",
    title: "THE HAUNTED HOTEL",
    description: "Night before the biggest match of the season, half the squad swears the team hotel is haunted. Two defenders are refusing to sleep alone. The manager is furious. Somebody has to lead here.",
    choices: [
      { label: "Lead a squad seance", emoji: "🕯️", consequence: "Team bonding of the strangest kind. Morale +8" },
      { label: "Demand a hotel change", emoji: "🏨", consequence: "Awkward with the club, but everyone sleeps. Morale +3" },
      { label: "Sleep in the team bus", emoji: "🚌", consequence: "The photo goes viral. Popularity +10" },
    ],
  },
  {
    id: "valet_crash",
    emoji: "🔑",
    title: "THE VALET INCIDENT",
    description: "A hotel valet just reversed your hypercar into a fountain at 40 km/h. He is 19, shaking, and pretty sure his life is over. Forty phones are already filming.",
    choices: [
      { label: "Hug him, forgive publicly", emoji: "🤗", consequence: "The clip melts hearts. Popularity +12, the car costs 1.5M" },
      { label: "Insurance war", emoji: "📋", consequence: "Recover 1.5M, popularity -8, he loses his job" },
      { label: "Gift him a bus pass and a smile", emoji: "🚌", consequence: "Perfect comedy. Popularity +15, the car still costs 1.5M" },
    ],
  },
  {
    id: "wag_reality_show",
    emoji: "📺",
    title: "THE REALITY SHOW",
    description: "A production company offers serious money to film a reality series inside your house. Your partner is excited. Your center back already texted: do NOT do this.",
    choices: [
      { label: "Full season, full access", emoji: "🎬", consequence: "3M fee, popularity +8", risk: "25% chance a dressing-room secret airs: morale -10" },
      { label: "One tasteful episode", emoji: "🎞️", consequence: "1M fee, everyone survives" },
      { label: "Hard no", emoji: "🚪", consequence: "Partner sulks for a week, morale +4 long term" },
    ],
  },
  {
    id: "ultras_tattoo",
    emoji: "🐉",
    title: "THE ULTRAS' DEMAND",
    description: "After your derby winner, the ultras unfurl a banner: TATTOO THE CREST OR YOU NEVER LOVED US. They are outside training with a tattoo artist. He seems extremely available.",
    choices: [
      { label: "Get the crest tattooed", emoji: "🐉", consequence: "Popularity +15 here forever. Awkward if you ever transfer" },
      { label: "Henna prank first", emoji: "🖌️", consequence: "Popularity +8 for the joke", risk: "30% chance they find out it washed off: -10" },
      { label: "Respectfully decline", emoji: "🙏", consequence: "Popularity -5, your skin remains yours" },
    ],
  },
  {
    id: "bdor_snub",
    emoji: "🥈",
    title: "THE SNUB",
    description: "Everyone in your camp thought this was your Ballon d'Or. It went to someone else. The cameras cut to your face at the exact wrong moment and the whole world saw it.",
    choices: [
      { label: "Fuel. Pure fuel.", emoji: "🔥", consequence: "+3 to every stat next season, morale -5. Revenge tour begins" },
      { label: "Congratulate the winner beautifully", emoji: "🤝", consequence: "Popularity +10, integrity +5, the high road" },
      { label: "Skip the afterparty, train at midnight", emoji: "🌙", consequence: "The gym photo goes viral. +2 stats next season, popularity +5" },
    ],
  },
  {
    id: "biscuit_gate",
    emoji: "🍪",
    title: "BISCUIT GATE",
    description: "You were photographed enjoying a rival brand's biscuit while your cereal sponsor pays you millions. The internet has named it Biscuit Gate. The sponsor's lawyers have named it a breach.",
    choices: [
      { label: "Apologize with a taste test video", emoji: "🎥", consequence: "Sponsor placated, the video hits huge, popularity +10" },
      { label: "Declare biscuit independence", emoji: "🍪", consequence: "Lose 1M sponsor fee, popularity +15, folk hero status" },
      { label: "Blame a lookalike", emoji: "🥸", consequence: "Nobody believes you, popularity -5, it becomes a meme" },
    ],
  },
  // 2026-08-05 rivalry expansion: the feud gets interactive
  {
    id: "rival_club_offer",
    emoji: "📞",
    title: "THE ENEMY CALLS",
    description: "Your great rival's club triggers your release clause. Their sporting director says one sentence: come win everything next to him instead of against him. Your fans are already burning shirts preemptively.",
    choices: [
      { label: "Join forces with your rival", emoji: "🤝", consequence: "The most talked-about transfer of the decade. Signing bonus 10M, old fans furious" },
      { label: "Leak the offer and refuse", emoji: "📰", consequence: "Your fans crown you a legend of loyalty. Popularity +12, integrity +5" },
      { label: "Refuse quietly", emoji: "🤐", consequence: "Nobody ever knows how close it came" },
    ],
  },
  {
    id: "rival_bad_tackle",
    emoji: "🦵",
    title: "THE TACKLE",
    description: "Your rival went through your ankle in the derby, studs up, no ball. The referee gave a yellow. Your physio says you are fine. Your teammates want blood. The rematch is in May.",
    choices: [
      { label: "Plot revenge for the rematch", emoji: "😈", consequence: "The feud goes nuclear", risk: "30% chance you see red doing it: popularity and morale -5" },
      { label: "Accept his apology publicly", emoji: "🕊️", consequence: "Integrity +8, popularity +5, the feud cools" },
      { label: "Say nothing. Score twice in May.", emoji: "🥶", consequence: "+1 Shooting next season, ice in the veins" },
    ],
  },
  {
    id: "goat_debate_show",
    emoji: "🎤",
    title: "THE DEBATE SHOW",
    description: "A global sports network offers 2M for one live hour: you versus a panel of pundits arguing that your rival is better. No script, no edits, one microphone.",
    choices: [
      { label: "Go on and cook them", emoji: "🔥", consequence: "2M fee", risk: "35% chance a clip goes viral badly: popularity -8" },
      { label: "Send a highlight reel instead", emoji: "📼", consequence: "The reel does the talking. Popularity +8" },
      { label: "Decline. Legends do not debate.", emoji: "😎", consequence: "Integrity +5, the mystique grows" },
    ],
  },
  {
    id: "rival_charity_match",
    emoji: "💛",
    title: "TRUCE FOR ONE NIGHT",
    description: "Your rival's foundation asks you to co-headline a charity match for children's hospitals. Same pitch, same team, one night only. The photo of you two in the same shirt would break the internet.",
    choices: [
      { label: "Play, and split the donation", emoji: "🤝", consequence: "1M donated, popularity +10, integrity +8, the feud softens" },
      { label: "Play, but start a playful nutmeg war", emoji: "😉", consequence: "The clips are legendary. Popularity +12" },
      { label: "Send a check, skip the match", emoji: "💸", consequence: "1M donated quietly, integrity +3" },
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
    case "pitch_invader": {
      if (choiceIndex === 0) {
        s.popularity = clamp(s.popularity + 10, 0, 100);
        s.events = [...s.events, "🤳 Stopped for the selfie mid-match. The crowd adored it."];
      } else if (choiceIndex === 1) {
        s.popularity = clamp(s.popularity + 15, 0, 100);
        s.morale = clamp(s.morale + 5, 0, 100);
        s.events = [...s.events, "🕺 Juked the pitch invader like a seasoned defender. Viral clip! Popularity +15."];
      } else {
        s.popularity = clamp(s.popularity - 10, 0, 100);
        s.events = [...s.events, "✋ Shoved the invader away hard. Crowd booed, but stewards praised your composure."];
      }
      break;
    }
    case "match_fixer_approach": {
      if (choiceIndex === 0) {
        s.netWorth = Math.round((s.netWorth + 2) * 100) / 100;
        s.events = [...s.events, "💵 Took €2M from the fixer to miss a penalty..."];
        if (Math.random() < 0.25) {
          s.matchFixBanned = 2;
          s.popularity = clamp(s.popularity - 35, 0, 100);
          s.morale = clamp(s.morale - 25, 0, 100);
          s.integrityBonus -= 25;
          s.netWorth = Math.round((s.netWorth - 2) * 100) / 100;
          s.events = [...s.events, "🚨 A recording leaked! Caught match-fixing. 2-season ban, reputation in ruins."];
        } else {
          s.events = [...s.events, "🤐 The recording never surfaced. You got away with it, for now."];
        }
      } else if (choiceIndex === 1) {
        s.popularity = clamp(s.popularity + 25, 0, 100);
        s.integrityBonus += 15;
        s.awards = [...s.awards, { year: s.seasons[s.seasons.length - 1]?.year || 2024, name: "Fair Play Award", emoji: "🛡️" }];
        s.events = [...s.events, "🎥 Filmed the fixer and exposed him. Hero status! Popularity +25."];
      } else {
        s.events = [...s.events, "🚪 Declined the offer quietly and said nothing."];
      }
      break;
    }
    case "captain_armband_feud": {
      if (choiceIndex === 0) {
        s.isLeader = true;
        s.popularity = clamp(s.popularity + 10, 0, 100);
        s.morale = clamp(s.morale - 8, 0, 100);
        s.events = [...s.events, "🎖️ Accepted the captaincy. Fans love it, some teammates resent it."];
      } else if (choiceIndex === 1) {
        s.morale = clamp(s.morale + 8, 0, 100);
        s.events = [...s.events, "🙏 Refused the armband out of respect for the veteran. Dressing room loyalty grows."];
      } else {
        s.morale = clamp(s.morale + 10, 0, 100);
        s.events = [...s.events, "🕊️ Brokered peace between the manager and the veteran. No armband, but harmony restored."];
      }
      break;
    }
    case "tunnel_brawl": {
      if (choiceIndex === 0) {
        s.popularity = clamp(s.popularity - 10, 0, 100);
        s.events = [...s.events, "👊 Swung back in the tunnel. 3-match ban handed down. Your ultras loved it, everyone else didn't."];
      } else if (choiceIndex === 1) {
        s.popularity = clamp(s.popularity + 15, 0, 100);
        s.integrityBonus += 10;
        s.events = [...s.events, "🚶 Walked away and reported the incident. The federation fined the other player. Reputation +15."];
      } else {
        s.events = [...s.events, "🗣️ Traded words but kept your hands to yourself. Minor fine, clip goes viral anyway."];
      }
      break;
    }
    case "sponsor_scandal": {
      if (choiceIndex === 0) {
        s.sponsorshipIncome = Math.max(0, s.sponsorshipIncome - 3);
        s.popularity = clamp(s.popularity + 15, 0, 100);
        s.events = [...s.events, "✂️ Cut ties with the sponsor publicly. Lost €3M/year, popularity +15."];
      } else if (choiceIndex === 1) {
        s.popularity = clamp(s.popularity - 10, 0, 100);
        s.events = [...s.events, "🤐 Kept the sponsor money and stayed quiet. Backlash is building."];
      } else {
        s.popularity = clamp(s.popularity + 20, 0, 100);
        s.events = [...s.events, "❤️ Donated the year's sponsor fee to charity. Popularity +20, deal intact."];
      }
      break;
    }
    case "betting_ring_teammate": {
      if (choiceIndex === 0) {
        s.integrityBonus += 15;
        s.morale = clamp(s.morale - 5, 0, 100);
        s.events = [...s.events, "📢 Reported your teammate's betting trouble to the club. He was suspended. Integrity +15."];
      } else if (choiceIndex === 1) {
        s.netWorth = Math.round((s.netWorth - 1.5) * 100) / 100;
        s.morale = clamp(s.morale + 5, 0, 100);
        s.events = [...s.events, "💶 Quietly lent your teammate €1.5M to clear his debt. Loyalty earned."];
      } else {
        s.events = [...s.events, "🤷 Told him to sort it out himself. The situation lingers unresolved."];
      }
      break;
    }
    case "wonderkid_jealousy": {
      if (choiceIndex === 0) {
        s.popularity = clamp(s.popularity + 15, 0, 100);
        s.events = [...s.events, "🤝 Mentored the wonderkid openly. Popularity +15, but he's developing fast."];
      } else if (choiceIndex === 1) {
        s.morale = clamp(s.morale - 10, 0, 100);
        s.events = [...s.events, "🧊 Froze out the wonderkid. Dressing room tension rises, but you keep your place longer."];
      } else {
        s.events = [...s.events, "🎯 Ignored the drama and focused on your own game."];
      }
      break;
    }
    case "night_out_photo": {
      if (choiceIndex === 0) {
        s.popularity = clamp(s.popularity + 5, 0, 100);
        s.morale = clamp(s.morale - 5, 0, 100);
        s.netWorth = Math.round((s.netWorth - Math.max(0.02, s.weeklyWage / 1000000)) * 100) / 100;
        s.events = [...s.events, "🙇 Owned up publicly and apologized. Fined a week's wages, popularity +5 for honesty."];
      } else if (choiceIndex === 1) {
        s.events = [...s.events, "🙅 Denied everything. The story might resurface later."];
        if (Math.random() < 0.35) {
          s.popularity = clamp(s.popularity - 15, 0, 100);
          s.events = [...s.events, "📰 The denial didn't hold. Story resurfaced. Popularity -15."];
        }
      } else {
        s.netWorth = Math.round((s.netWorth - 0.1) * 100) / 100;
        s.events = [...s.events, "🎙️ Let your agent's PR team spin it. Story died down quickly."];
      }
      break;
    }
    case "magazine_shoot": {
      if (choiceIndex === 0) {
        s.netWorth = Math.round((s.netWorth + 2) * 100) / 100;
        s.totalEarnings += 2;
        s.popularity = clamp(s.popularity + 10, 0, 100);
        s.events = [...s.events, "😎 The tasteful calendar sells out in a week. 2M and popularity +10."];
      } else if (choiceIndex === 1) {
        s.netWorth = Math.round((s.netWorth + 6) * 100) / 100;
        s.totalEarnings += 6;
        s.popularity = clamp(s.popularity + 18, 0, 100);
        if (Math.random() < 0.25) {
          s.netWorth = Math.round((s.netWorth - 2) * 100) / 100;
          s.events = [...s.events, "🙈 The artistic cover breaks the internet. 6M earned, popularity +18... and a family-brand sponsor quietly walked, costing 2M."];
        } else {
          s.events = [...s.events, "🙈 The artistic cover breaks the internet. 6M earned, popularity +18. The football was held VERY strategically."];
        }
      } else {
        s.events = [...s.events, "🚪 Declined the shoot. Your grandmother frames the polite refusal letter."];
      }
      break;
    }
    case "mafia_cup_ask": {
      if (choiceIndex === 0) {
        s.netWorth = Math.round((s.netWorth + 8) * 100) / 100;
        s.mafiaStage = 1;
        s.morale = clamp(s.morale - 5, 0, 100);
        s.events = [...s.events, "💰 The cup tie slipped away. 8M appeared offshore. You are now a friend of serious people."];
      } else if (choiceIndex === 1) {
        s.mafiaStage = 2;
        s.popularity = clamp(s.popularity + 20, 0, 100);
        s.integrityBonus += 15;
        s.events = [...s.events, "🚔 You went straight to the police. Federation protection, national praise, and the suits vanished. Popularity +20."];
      } else {
        s.events = [...s.events, "🤐 You refused and said nothing. The suits nodded politely. Somewhere, a file with your name stays open."];
      }
      break;
    }
    case "mafia_second_ask": {
      if (choiceIndex === 0) {
        s.netWorth = Math.round((s.netWorth + 15) * 100) / 100;
        s.mafiaStage = 2;
        if (Math.random() < 0.5) {
          s.matchFixBanned = 3;
          s.popularity = clamp(s.popularity - 40, 0, 100);
          s.integrityBonus -= 40;
          s.events = [...s.events, "🚨 THE INVESTIGATION LANDED. Betting patterns, wiretaps, everything. 3-SEASON BAN. The 15M sits frozen while your name burns."];
        } else {
          s.events = [...s.events, "💶 The title decider slipped away. 15M offshore. The suits toast you from a distance. You check the news every morning."];
        }
      } else if (choiceIndex === 1) {
        s.mafiaStage = 2;
        if (Math.random() < 0.4) {
          s.matchFixBanned = 2;
          s.popularity = clamp(s.popularity - 30, 0, 100);
          s.integrityBonus -= 25;
          s.events = [...s.events, "🗞️ You refused, and the first fix leaked within a month. 2-SEASON BAN. The money was never worth this."];
        } else {
          s.morale = clamp(s.morale - 10, 0, 100);
          s.events = [...s.events, "✋ You refused. On the way out, one suit mentioned the cup tie by date. You have not slept properly since."];
        }
      } else {
        s.mafiaStage = 2;
        s.popularity = clamp(s.popularity + 25, 0, 100);
        s.integrityBonus += 10;
        s.transferSituation = s.transferSituation ?? null;
        s.events = [...s.events, "🚔 Full confession, full cooperation, immunity for testimony. The network falls. You will need a new city soon, but you sleep like a baby. Popularity +25."];
      }
      break;
    }
    case "streaker_proposal": {
      if (choiceIndex === 0) {
        s.popularity = clamp(s.popularity + 15, 0, 100);
        s.events = [...s.events, "💍 You said yes as a joke. The clip has 80 million views. You are now engaged to a stranger, legally speaking, in zero countries."];
      } else if (choiceIndex === 1) {
        s.popularity = clamp(s.popularity + 8, 0, 100);
        s.events = [...s.events, "🖊️ Signed the sign, hugged the steward who finally arrived. Wholesome scenes. Popularity +8."];
      } else {
        s.morale = clamp(s.morale + 3, 0, 100);
        s.events = [...s.events, "⚽ You played on like nothing happened. The pundits called it elite mentality."];
      }
      break;
    }
    case "deepfake_scandal": {
      if (choiceIndex === 0) {
        s.netWorth = Math.round((s.netWorth - 1) * 100) / 100;
        s.popularity = clamp(s.popularity + 15, 0, 100);
        s.events = [...s.events, "⚖️ You sued and won. The court statement trended. Popularity +15, lawyers +1M."];
      } else if (choiceIndex === 1) {
        if (Math.random() < 0.2) {
          s.popularity = clamp(s.popularity - 10, 0, 100);
          s.events = [...s.events, "🎭 The parody video read wrong. Think pieces everywhere. Popularity -10."];
        } else {
          s.popularity = clamp(s.popularity + 20, 0, 100);
          s.events = [...s.events, "🎭 Your parody of the deepfake was funnier than the deepfake. Internet won. Popularity +20."];
        }
      } else {
        s.morale = clamp(s.morale - 3, 0, 100);
        s.events = [...s.events, "🧘 You ignored it and it burned out in a week, like your media officer promised."];
      }
      break;
    }
    case "hometown_statue": {
      if (choiceIndex === 0) {
        s.netWorth = Math.round((s.netWorth - 2) * 100) / 100;
        s.popularity = clamp(s.popularity + 12, 0, 100);
        s.events = [...s.events, "💶 You quietly paid for a proper statue. The new unveiling made the town cry. Popularity +12."];
      } else if (choiceIndex === 1) {
        s.popularity = clamp(s.popularity + 18, 0, 100);
        s.events = [...s.events, "🗿 You embraced the cursed statue. It is now a pilgrimage site with its own hashtag. Popularity +18."];
      } else {
        s.popularity = clamp(s.popularity - 5, 0, 100);
        s.events = [...s.events, "🙅 The statue came down. The sculptor gave seventeen interviews about betrayal. Popularity -5."];
      }
      break;
    }
    case "haunted_hotel": {
      if (choiceIndex === 0) {
        s.morale = clamp(s.morale + 8, 0, 100);
        s.events = [...s.events, "🕯️ You led a squad seance at 1am. Nothing appeared except team chemistry. Morale +8."];
      } else if (choiceIndex === 1) {
        s.morale = clamp(s.morale + 3, 0, 100);
        s.events = [...s.events, "🏨 You made the club switch hotels at midnight. Everyone slept. The kit man still talks about the ghost."];
      } else {
        s.popularity = clamp(s.popularity + 10, 0, 100);
        s.events = [...s.events, "🚌 You slept in the team bus. The photo of you wrapped in a training bib went viral. Popularity +10."];
      }
      break;
    }
    case "valet_crash": {
      if (choiceIndex === 0) {
        s.netWorth = Math.round((s.netWorth - 1.5) * 100) / 100;
        s.popularity = clamp(s.popularity + 12, 0, 100);
        s.events = [...s.events, "🤗 You hugged the shaking valet on camera. The clip melted hearts. Popularity +12, hypercar -1.5M."];
      } else if (choiceIndex === 1) {
        s.netWorth = Math.round((s.netWorth + 1.5) * 100) / 100;
        s.popularity = clamp(s.popularity - 8, 0, 100);
        s.events = [...s.events, "📋 Insurance recovered 1.5M. The valet lost his job and the internet chose his side. Popularity -8."];
      } else {
        s.netWorth = Math.round((s.netWorth - 1.5) * 100) / 100;
        s.popularity = clamp(s.popularity + 15, 0, 100);
        s.events = [...s.events, "🚌 You handed him a bus pass and said maybe stick to these. Comedy gold. Popularity +15."];
      }
      break;
    }
    case "wag_reality_show": {
      if (choiceIndex === 0) {
        s.netWorth = Math.round((s.netWorth + 3) * 100) / 100;
        s.totalEarnings += 3;
        s.popularity = clamp(s.popularity + 8, 0, 100);
        if (Math.random() < 0.25) {
          s.morale = clamp(s.morale - 10, 0, 100);
          s.events = [...s.events, "🎬 The show was a hit... until episode six aired a dressing-room story. Training is FROSTY. Morale -10."];
        } else {
          s.events = [...s.events, "🎬 The show was a hit and nobody got burned. 3M earned, popularity +8."];
        }
      } else if (choiceIndex === 1) {
        s.netWorth = Math.round((s.netWorth + 1) * 100) / 100;
        s.totalEarnings += 1;
        s.events = [...s.events, "🎞️ One tasteful episode. Everyone survived. 1M earned."];
      } else {
        s.morale = clamp(s.morale + 4, 0, 100);
        s.events = [...s.events, "🚪 Hard no on the cameras. A week of sulking, then peace. Morale +4."];
      }
      break;
    }
    case "ultras_tattoo": {
      if (choiceIndex === 0) {
        s.popularity = clamp(s.popularity + 15, 0, 100);
        s.events = [...s.events, "🐉 You got the crest tattooed live outside training. The ultras wept. Popularity +15, forever."];
      } else if (choiceIndex === 1) {
        if (Math.random() < 0.3) {
          s.popularity = clamp(s.popularity - 10, 0, 100);
          s.events = [...s.events, "🖌️ The henna washed off at the pool and someone had a camera. The ultras are NOT laughing. Popularity -10."];
        } else {
          s.popularity = clamp(s.popularity + 8, 0, 100);
          s.events = [...s.events, "🖌️ The henna prank landed perfectly and you got the real one later. Popularity +8."];
        }
      } else {
        s.popularity = clamp(s.popularity - 5, 0, 100);
        s.events = [...s.events, "🙏 You respectfully declined the needle. The banner next week just said FINE."];
      }
      break;
    }
    case "bdor_snub": {
      s.bdorSnubFuel = false;
      if (choiceIndex === 0) {
        s.morale = clamp(s.morale - 5, 0, 100);
        s.statBoostNextSeason = { pace: 3, shooting: 3, passing: 3, dribbling: 3, defending: 3, physical: 3, reflexes: 3 };
        s.events = [...s.events, "🔥 You printed the final voting and taped it inside your locker. +3 EVERYTHING next season. The revenge tour is on."];
      } else if (choiceIndex === 1) {
        s.popularity = clamp(s.popularity + 10, 0, 100);
        s.integrityBonus += 5;
        s.events = [...s.events, "🤝 Your congratulation speech was so classy it trended above the winner. Popularity +10."];
      } else {
        s.popularity = clamp(s.popularity + 5, 0, 100);
        s.statBoostNextSeason = { pace: 2, shooting: 2, passing: 2, dribbling: 2, defending: 2, physical: 2, reflexes: 2 };
        s.events = [...s.events, "🌙 You skipped the afterparty and the midnight gym photo went viral. +2 stats next season."];
      }
      break;
    }
    case "biscuit_gate": {
      if (choiceIndex === 0) {
        s.popularity = clamp(s.popularity + 10, 0, 100);
        s.events = [...s.events, "🎥 The apology taste-test video got 40 million views. The sponsor renewed early. Popularity +10."];
      } else if (choiceIndex === 1) {
        s.netWorth = Math.round((s.netWorth - 1) * 100) / 100;
        s.popularity = clamp(s.popularity + 15, 0, 100);
        s.events = [...s.events, "🍪 You declared biscuit independence at a press conference. Lost 1M, became a folk hero. Popularity +15."];
      } else {
        s.popularity = clamp(s.popularity - 5, 0, 100);
        s.events = [...s.events, "🥸 The lookalike defense fooled no one. The meme lives forever. Popularity -5."];
      }
      break;
    }
    case "rival_club_offer": {
      const rivalName = s.rival?.name ?? "your rival";
      if (choiceIndex === 0) {
        s.netWorth = Math.round((s.netWorth + 10) * 100) / 100;
        s.popularity = clamp(s.popularity - 10, 0, 100);
        s.morale = clamp(s.morale + 5, 0, 100);
        s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) - 30, 0, 100);
        s.events = [...s.events, `📞 You answered the enemy's call. 10M signing bonus banked, and the football world lost its mind. Old fans are furious, ${rivalName} posted a handshake emoji.`];
      } else if (choiceIndex === 1) {
        s.popularity = clamp(s.popularity + 12, 0, 100);
        s.integrityBonus += 5;
        s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) + 10, 0, 100);
        s.events = [...s.events, "📰 The leaked offer made the front page. Your fans crowned you a legend of loyalty. Popularity +12."];
      } else {
        s.events = [...s.events, "🤐 You refused quietly. Somewhere in a drawer sits the most explosive transfer that never happened."];
      }
      break;
    }
    case "rival_bad_tackle": {
      const rivalName = s.rival?.name ?? "your rival";
      if (choiceIndex === 0) {
        s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) + 25, 0, 100);
        if (Math.random() < 0.3) {
          s.popularity = clamp(s.popularity - 5, 0, 100);
          s.morale = clamp(s.morale - 5, 0, 100);
          s.events = [...s.events, `🟥 Revenge tasted sweet for four seconds, then the red card came out. Popularity and morale -5, and ${rivalName} smiled the whole time.`];
        } else {
          s.morale = clamp(s.morale + 8, 0, 100);
          s.events = [...s.events, `😈 You got him back, clean enough to escape a card. The derby now has its own documentary crew.`];
        }
      } else if (choiceIndex === 1) {
        s.integrityBonus += 8;
        s.popularity = clamp(s.popularity + 5, 0, 100);
        s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) - 15, 0, 100);
        s.events = [...s.events, "🕊️ You accepted the apology on camera. The adults in the room won today. Integrity +8."];
      } else {
        s.statBoostNextSeason = { ...s.statBoostNextSeason, shooting: (s.statBoostNextSeason.shooting || 0) + 1 };
        s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) + 10, 0, 100);
        s.events = [...s.events, "🥶 You said nothing. May is circled on your calendar in red ink. +1 Shooting next season."];
      }
      break;
    }
    case "goat_debate_show": {
      if (choiceIndex === 0) {
        s.netWorth = Math.round((s.netWorth + 2) * 100) / 100;
        if (Math.random() < 0.35) {
          s.popularity = clamp(s.popularity - 8, 0, 100);
          s.events = [...s.events, "🎤 You went on the debate show and one heated clip went viral for the wrong reasons. 2M banked, popularity -8."];
        } else {
          s.popularity = clamp(s.popularity + 6, 0, 100);
          s.events = [...s.events, "🔥 You cooked the whole panel live on air. 2M banked and the clip is a permanent argument-ender. Popularity +6."];
        }
      } else if (choiceIndex === 1) {
        s.popularity = clamp(s.popularity + 8, 0, 100);
        s.events = [...s.events, "📼 You sent a four-minute highlight reel with no caption. It out-rated the show. Popularity +8."];
      } else {
        s.integrityBonus += 5;
        s.events = [...s.events, "😎 You declined. Legends do not debate. The mystique compounds like interest."];
      }
      break;
    }
    case "rival_charity_match": {
      const rivalName = s.rival?.name ?? "your rival";
      if (choiceIndex === 0) {
        s.netWorth = Math.round((s.netWorth - 1) * 100) / 100;
        s.popularity = clamp(s.popularity + 10, 0, 100);
        s.integrityBonus += 8;
        s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) - 20, 0, 100);
        s.events = [...s.events, `💛 One night, one shirt, one cause. You and ${rivalName} raised millions for children's hospitals. The feud took the night off.`];
      } else if (choiceIndex === 1) {
        s.popularity = clamp(s.popularity + 12, 0, 100);
        s.events = [...s.events, `😉 The charity match turned into a nutmeg war with ${rivalName}. The kids loved it, the internet melted. Popularity +12.`];
      } else {
        s.netWorth = Math.round((s.netWorth - 1) * 100) / 100;
        s.integrityBonus += 3;
        s.events = [...s.events, "💸 You sent the donation and skipped the cameras. The quiet kind of good. Integrity +3."];
      }
      break;
    }
  }

  // Stay on moral_dilemma phase, UI calls dismissMoralDilemma to continue
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
  // This is checked once per season advance, so at most one dilemma fires per
  // season here, matching "1-2 per season max" in practice, since a rivalry
  // or other event can occasionally also land the same season.
  // ~20% chance per season after age 20. Over a long career, the pool of 12
  // dilemmas can repeat once exhausted so drama doesn't dry up late in a save.
  // The mafia arc and a Ballon d'Or snub jump the queue: they are follow-ups
  // the player is waiting on, not random flavor.
  if ((s.mafiaStage ?? 0) === 1 && !s.moralDilemmasTriggered.includes("mafia_second_ask") && Math.random() < 0.6) {
    const second = MORAL_DILEMMAS.find(d => d.id === "mafia_second_ask");
    if (second) {
      s.pendingMoralDilemma = second;
      s.moralDilemmasTriggered = [...s.moralDilemmasTriggered, second.id];
      return true;
    }
  }
  if (s.bdorSnubFuel && !s.moralDilemmasTriggered.includes("bdor_snub")) {
    const snub = MORAL_DILEMMAS.find(d => d.id === "bdor_snub");
    if (snub) {
      s.pendingMoralDilemma = snub;
      s.moralDilemmasTriggered = [...s.moralDilemmasTriggered, snub.id];
      return true;
    }
  }
  if (Math.random() > 0.30) return false;

  // Prefer dilemmas not yet seen; once every one has fired, allow repeats.
  const unseen = MORAL_DILEMMAS.filter(d => !s.moralDilemmasTriggered.includes(d.id));
  const pool = unseen.length > 0 ? unseen : MORAL_DILEMMAS;

  // Filter contextually
  const eligible = pool.filter(d => {
    if (d.id === "match_fixing" && s.currentClubTier > 2) return false; // only big clubs
    if (d.id === "match_fixer_approach" && s.currentClubTier > 3) return false;
    if (d.id === "ped_offer" && s.overall > 90) return false; // already elite
    if (d.id === "diving_reputation" && s.position === "GK") return false;
    if (d.id === "agent_corruption" && s.totalEarnings < 5) return false; // need some earnings
    if (d.id === "betting_ring_teammate" && s.totalEarnings < 2) return false;
    if (d.id === "wonderkid_jealousy" && s.age < 24) return false; // need a few seasons in
    if (d.id === "captain_armband_feud" && s.age < 23) return false;
    if (d.id === "sponsor_scandal" && !s.sponsorDeal && s.sponsorshipIncome <= 0) return false;
    // 2026-08-05 expansion rules
    if (d.id === "magazine_shoot" && (s.popularity < 50 || s.age < 21)) return false;
    if (d.id === "mafia_cup_ask" && ((s.mafiaStage ?? 0) !== 0 || s.currentClubTier > 3)) return false;
    if (d.id === "mafia_second_ask") return false; // only via the priority path above
    if (d.id === "bdor_snub") return false;        // only via the priority path above
    if (d.id === "ultras_tattoo" && s.age < 24) return false;
    if (d.id === "wag_reality_show" && !s.hasRelationship) return false;
    if (d.id === "valet_crash" && !s.purchasedItems.some(i => i === "hypercar" || i === "sports_car" || i === "supercar_collection")) return false;
    if (d.id === "hometown_statue" && s.popularity < 70) return false;
    if (d.id === "biscuit_gate" && !s.sponsorDeal && s.sponsorshipIncome <= 0) return false;
    if ((d.id === "rival_club_offer" || d.id === "rival_bad_tackle" || d.id === "goat_debate_show" || d.id === "rival_charity_match") && (!s.rival || s.rival.retired)) return false;
    if (d.id === "rival_club_offer" && s.age < 24) return false;
    if (d.id === "goat_debate_show" && s.overall < 85) return false;
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

export type SponsorshipTier = "local_brand" | "nike_adidas" | "global_ambassador" | "merchandise_line" | "cover_athlete";

export const SOCIAL_MEDIA_ACTIONS: SocialMediaAction[] = [
  { id: "training_video", label: "Post training video", emoji: "🏋️", description: "Show off your skills in the gym", followerGain: [50_000, 200_000], reputationChange: 0 },
  { id: "viral_celebration", label: "Go viral with celebration clip", emoji: "🎬", description: "Post an iconic goal celebration", followerGain: [500_000, 2_000_000], reputationChange: 0 },
  { id: "controversial_opinion", label: "Post controversial opinion", emoji: "🔥", description: "Share a hot take about football", followerGain: [1_000_000, 1_000_000], reputationChange: -10, extraEffect: "Reputation -10" },
  { id: "charity_work", label: "Announce charity work", emoji: "❤️", description: "Highlight your philanthropic efforts", followerGain: [200_000, 200_000], reputationChange: 15, extraEffect: "Reputation +15" },
  { id: "personal_life", label: "Post about personal life", emoji: "📸", description: "Share a glimpse into your life off the pitch", followerGain: [300_000, 300_000], reputationChange: 0 },
  { id: "troll_rival", label: "Troll your rival on social media", emoji: "😈", description: "Take a shot at your rival online", followerGain: [800_000, 800_000], reputationChange: 0, extraEffect: "Rivalry intensity increases" },
  { id: "stay_off", label: "Stay off social media", emoji: "🧘", description: "Focus on football, no distractions", followerGain: [0, 0], reputationChange: 0, extraEffect: "+2 to all stats next season" },
];

export const SPONSORSHIP_TIERS: { tier: SponsorshipTier; name: string; emoji: string; minFollowers: number; income: number }[] = [
  { tier: "local_brand", name: "Local Brand Deal", emoji: "🏪", minFollowers: 1_000_000, income: 0.5 },
  { tier: "nike_adidas", name: "Global Boot Deal", emoji: "👟", minFollowers: 5_000_000, income: 3 },
  { tier: "global_ambassador", name: "Global Brand Ambassador", emoji: "🌍", minFollowers: 15_000_000, income: 8 },
  { tier: "merchandise_line", name: "Own Merchandise Line", emoji: "👕", minFollowers: 30_000_000, income: 15 },
  { tier: "cover_athlete", name: "Game Cover Athlete", emoji: "🎮", minFollowers: 50_000_000, income: 25 },
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
    s.events = [...s.events, "🧘 Stayed off social media: focus boost for next season (+2 all stats)"];
  } else {
    const gain = action.followerGain[0] === action.followerGain[1]
      ? action.followerGain[0]
      : rand(action.followerGain[0], action.followerGain[1]);
    s.socialMediaFollowers = Math.round((s.socialMediaFollowers + gain / 1_000_000) * 100) / 100;
    s.events = [...s.events, `📱 ${action.emoji} ${action.label}: gained ${(gain / 1_000_000).toFixed(1)}M followers!`];

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
    s.events = [...s.events, `${tierInfo.emoji} NEW SPONSORSHIP: ${tierInfo.name}, €${tierInfo.income}M/year!`];
  }

  // Cover athlete event check
  if (s.socialMediaFollowers * 1_000_000 >= 50_000_000 && s.overall >= 90 && !s.coverAthleteAccepted && !s.pendingCoverAthleteEvent) {
    s.pendingCoverAthleteEvent = true;
  }

  // If the cover athlete event triggered, stay on social media action phase to show it
  if (s.pendingCoverAthleteEvent) {
    s.phase = "social_media_action";
  } else {
    // Mark as needing to continue via dismissSocialMediaPhase
    s.phase = "social_media_action";
  }
  return s;
}

export function handleCoverAthleteDecision(prev: CareerState, accept: boolean): CareerState {
  const s = { ...prev };
  s.pendingCoverAthleteEvent = false;
  if (accept) {
    s.coverAthleteAccepted = true;
    s.netWorth = Math.round((s.netWorth + 25) * 100) / 100;
    s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 5) * 100) / 100;
    s.events = [...s.events, "🎮 You are the cover athlete of the world's biggest football video game! €25M + 5M followers + Legacy +10"];
    s.awards = [...s.awards, { year: s.seasons[s.seasons.length - 1]?.year || 2024, name: "Game Cover Athlete", emoji: "🎮" }];
  } else {
    s.popularity = clamp(s.popularity + 5, 0, 100);
    s.events = [...s.events, "🎮 Declined the game cover: gained respect for being selective. Reputation +5"];
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
  // Round 54 expansion: more flags, more nations, more everything
  "Saudi Arabia": "🇸🇦", "Qatar": "🇶🇦", "UAE": "🇦🇪", "Iran": "🇮🇷",
  "Iraq": "🇮🇶", "Israel": "🇮🇱", "China": "🇨🇳", "India": "🇮🇳",
  "Indonesia": "🇮🇩", "Thailand": "🇹🇭", "Vietnam": "🇻🇳", "Malaysia": "🇲🇾",
  "Philippines": "🇵🇭", "Singapore": "🇸🇬", "Uzbekistan": "🇺🇿", "Kazakhstan": "🇰🇿",
  "Georgia": "🇬🇪", "Armenia": "🇦🇲", "Azerbaijan": "🇦🇿", "South Africa": "🇿🇦",
  "Kenya": "🇰🇪", "Ethiopia": "🇪🇹", "Tanzania": "🇹🇿", "Angola": "🇦🇴",
  "Mozambique": "🇲🇿", "DR Congo": "🇨🇩", "Mali": "🇲🇱", "Burkina Faso": "🇧🇫",
  "Guinea": "🇬🇳", "Gabon": "🇬🇦", "Zambia": "🇿🇲", "Zimbabwe": "🇿🇼",
  "Venezuela": "🇻🇪", "Bolivia": "🇧🇴", "Paraguay": "🇵🇾", "Panama": "🇵🇦",
  "Honduras": "🇭🇳", "El Salvador": "🇸🇻", "Guatemala": "🇬🇹", "Haiti": "🇭🇹",
  "Trinidad and Tobago": "🇹🇹", "Iceland": "🇮🇸", "Finland": "🇫🇮", "Slovakia": "🇸🇰",
  "Slovenia": "🇸🇮", "Hungary": "🇭🇺", "Bulgaria": "🇧🇬", "Albania": "🇦🇱",
  "Bosnia": "🇧🇦", "North Macedonia": "🇲🇰", "Montenegro": "🇲🇪", "Kosovo": "🇽🇰",
  "Cuba": "🇨🇺", "Dominican Republic": "🇩🇴", "Monaco": "🇲🇨", "Luxembourg": "🇱🇺",
  "Cyprus": "🇨🇾", "Malta": "🇲🇹", "Estonia": "🇪🇪", "Latvia": "🇱🇻",
  "Lithuania": "🇱🇹", "Moldova": "🇲🇩",
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

/* ─── Stat progression with prime system ───
   Round 54: the whole curve slowed down (owner feedback: "progression is way
   too quick"). Youth years develop steadily, pro growth is a grind, and the
   late 80s onward are a wall: most world-class seasons move a stat by 0 or 1.
   Reaching 90+ should feel like a decade of work, not an accident. */
/**
 * Round 96: how fast this player is developing right now.
 *
 * The problem this fixes: growth used to depend on nothing but age. A player
 * with a 93 ceiling improved at exactly the same rate as one with a 74
 * ceiling, and nothing you did in a season changed it. Measured over 60
 * careers of a striker who trained every session, chased the biggest club
 * and took the ambitious option every time, 2 percent reached 85 overall and
 * NOBODY reached 90, even though one career in five rolls a ceiling of 84 or
 * better. The engine simply could not carry a player to his own potential,
 * which made every choice in the game decorative.
 *
 * Three things drive it now, which is how the games he is measuring us
 * against do it:
 *  1. HEADROOM. The further below your ceiling, the faster you climb, and it
 *     tails off to almost nothing once you are on it. This is what makes a
 *     wonderkid feel like a wonderkid instead of a slow grind.
 *  2. MINUTES AND FORM. Last season actually happened. You cannot develop
 *     from the bench, and a 7.6 rated season is worth a lot more than a 6.0.
 *  3. THE TRAINING GROUND. Elite clubs develop players faster.
 */
/* ─── Round 131: the ceiling, and the repair that makes old saves safe ─── */

/** The ceiling this career is actually fighting, rolled number plus anything
    an exceptional career has earned back, and never above 99. */
export function effectivePotential(s: CareerState): number {
  const base = s.potential ?? Math.max(90, s.overall + 3);
  const earned = Number(s.potentialEarned);
  return Math.min(99, base + (Number.isFinite(earned) ? Math.max(0, earned) : 0));
}

/** The build multipliers for this career, safe on a save that has neither a
    physique nor a shape (which is every save written before Round 131): those
    come back as the position default and an empty shape, which is exactly the
    reference, so every multiplier is 1.00 and nothing about an old career
    changes. */
export function careerBuildEffects(s: CareerState): BuildEffects {
  try {
    return buildEffects(s, s.position, s.overall, s.physique, s.attrShape);
  } catch {
    return NEUTRAL_EFFECTS;
  }
}

/**
 * Round 127's lesson, applied again: repairing a save only inside the step
 * function is not enough, because a screen can be opened before any step is
 * taken. This runs on load AND at the top of both step functions, and it is
 * deliberately total rather than clever. Everything it touches is optional on
 * the type, so a save that already has the fields comes out identical.
 */
export function repairCareer<T extends CareerState>(state: T): T {
  if (!state || typeof state !== "object") return state;
  const s = state as CareerState;
  if (!s.primeType) s.primeType = rollPrimeType();
  /* Round 133 renamed the top sponsorship tier off a product name. Saves
     written before that still carry the old value, and without this line those
     players silently lose a 25M a year deal they had already earned. */
  const legacySponsor = s as unknown as { activeSponsorship?: string };
  if (legacySponsor.activeSponsorship === 'fifa_cover') s.activeSponsorship = 'cover_athlete';
  const legacyCover = s as unknown as Record<string, unknown>;
  if (legacyCover.fifaCoverAccepted === true) s.coverAthleteAccepted = true; // rival-names-allow: old save field name, read only
  if (legacyCover.pendingFifaCoverEvent === true) s.pendingCoverAthleteEvent = true; // rival-names-allow: old save field name, read only
  const earned = Number(s.potentialEarned);
  s.potentialEarned = Number.isFinite(earned) ? Math.max(0, Math.round(earned)) : 0;
  const streak = Number(s.eliteStreak);
  s.eliteStreak = Number.isFinite(streak) ? Math.max(0, Math.round(streak)) : 0;
  s.physique = safePhysique(s.position, s.physique);
  s.attrShape = safeShape(s.position, s.attrShape);
  const start = Number(s.startingOverall);
  /* Left undefined on purpose when a save predates the field. There is no
     honest way to recover the overall a 2024 save began at, and inventing one
     would hand somebody a legacy line they did not earn either way. */
  if (Number.isFinite(start)) s.startingOverall = Math.round(clamp(start, 1, 99));
  else delete s.startingOverall;
  if (typeof s.peakOverall !== "number" || !Number.isFinite(s.peakOverall)) s.peakOverall = s.overall;
  return state;
}

function developmentRate(s: CareerState): number {
  const pot = effectivePotential(s);
  const gap = pot - s.overall;
  const headroom =
    gap <= 0 ? 0.15 :
    gap <= 3 ? 0.5 :
    gap <= 8 ? 1.0 :
    gap <= 15 ? 1.5 : 1.9;

  let form = 1;
  const last = s.seasons.length ? s.seasons[s.seasons.length - 1] : null;
  if (last && last.type !== "youth") {
    const apps = last.apps ?? 0;
    form *= apps >= 30 ? 1.25 : apps >= 18 ? 1 : apps >= 8 ? 0.78 : 0.5;
    const r = last.rating ?? 6.5;
    form *= r >= 7.6 ? 1.45 : r >= 7.1 ? 1.2 : r >= 6.6 ? 1 : r >= 6 ? 0.82 : 0.62;
  }

  const tierF = s.currentClubTier === 1 ? 1.2 : s.currentClubTier === 2 ? 1.07 : 1;
  return clamp(headroom * form * tierF, 0.1, 2.6);
}

function growStat(current: number, age: number, isYouth: boolean, isPace: boolean, primeType: PrimeType, potential = 99, currentOverall = 0, dev = 1): number {
  let growth: number;
  if (isYouth) {
    growth = current >= 78 ? rand(0, 1) : rand(1, 3);
  } else if (isInPrime(age, primeType)) {
    growth = rand(1, 3); // Prime phase, the best years still move
  } else if (!isPastPrime(age, primeType)) {
    // Pre-prime professional years, slow build
    growth = rand(0, 2);
  } else {
    // Post-prime, decline starts at 32, accelerates after 35
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
  // Round 96: the development rate scales real growth. Decline is left alone,
  // because no amount of good form stops a 37 year old losing a yard.
  if (growth > 0 && dev !== 1) {
    const scaled = growth * dev;
    growth = Math.floor(scaled) + (Math.random() < scaled % 1 ? 1 : 0);
  }
  // Round 54 elite ceiling: the closer to perfect, the harder every point.
  // 86+ growth is capped, 90+ usually stalls, 94+ is nearly frozen.
  if (growth > 0 && !isYouth) {
    if (current >= 94) growth = Math.random() < 0.20 ? 1 : 0;
    else if (current >= 90) growth = Math.random() < 0.45 ? 1 : 0;
    else if (current >= 86) growth = Math.min(growth, Math.random() < 0.5 ? 1 : 2);
  }
  // Round 78: the personal potential wall. At or past your rolled ceiling,
  // natural growth basically stops (events, training and the shop are the
  // only ways to squeeze more). Within 3 points, everything slows. Applies
  // to youth too, so a low-ceiling wonderkid plateaus honestly.
  if (growth > 0 && currentOverall > 0) {
    if (currentOverall >= potential) growth = Math.random() < 0.12 ? 1 : 0;
    else if (currentOverall >= potential - 3) growth = Math.min(growth, Math.random() < 0.55 ? 1 : 0);
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
  // "Nike"/"Adidas" kept for pre-R49 saves; new deals sign fictional brands
  if (sponsorDeal === "Nike" || sponsorDeal === "Vortex") income += 2;
  else if (sponsorDeal === "Adidas" || sponsorDeal === "Kinetiq") income += 1.5;
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
  // Round 49: personality shapes the algorithm
  growth *= personalityFollowerMult(state.personality);
  return Math.round(growth * 100) / 100;
}

function simulateSeasonFinances(s: CareerState, season: SeasonRecord): void {
  // Wage income (52 weeks, in millions)
  const wageIncome = (s.weeklyWage * 52) / 1_000_000;
  // Sponsorship income
  s.sponsorshipIncome = Math.round(calcSponsorshipIncome(s.popularity, s.socialMediaFollowers, s.sponsorDeal, s.activeSponsorship) * personalitySponsorMult(s.personality) * 100) / 100;
  const grossIncome = wageIncome + s.sponsorshipIncome;
  // Round 49: the agent takes a yearly cut of wage + sponsorship income
  const agentCut = Math.round(grossIncome * agentIncomeCutRate(s.agentId) * 100) / 100;
  if (agentCut > 0) s.agentFeesPaid = Math.round((s.agentFeesPaid + agentCut) * 100) / 100;
  const totalIncome = grossIncome - agentCut;
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
  if (s.purchasedItems.includes("documentary_crew")) {
    s.popularity = clamp(s.popularity + 3, 0, 100);
  }
  if (s.purchasedItems.includes("charity_foundation")) {
    s.popularity = clamp(s.popularity + 3, 0, 100);
    s.integrityBonus += 2;
  }
  if (s.purchasedItems.includes("family_office") && s.netWorth > 0) {
    const growth = Math.round(s.netWorth * 0.02 * 100) / 100;
    s.netWorth = Math.round((s.netWorth + growth) * 100) / 100;
  }
  if (s.purchasedItems.includes("personal_chef")) {
    s.morale = clamp(s.morale + 2, 0, 100);
  }
  // Deficit tracking
  if (netThisYear < 0) {
    s.consecutiveDeficitYears += 1;
  } else {
    s.consecutiveDeficitYears = 0;
  }
  // Financial crisis, also triggered by negative net worth
  if (s.consecutiveDeficitYears >= 3 || s.netWorth < -2) {
    s.events.push("💸 FINANCIAL CRISIS: Spending exceeds income! Forced to sell assets.");
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
      { id: "watches_trophy", emoji: "🏆", text: "Your child watches you win a trophy, pure joy on their face!", morale: 8 },
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

  // Round 54 gates: fame-locked and dirty-money-locked purchases
  if (item.minPopularity && s.popularity < item.minPopularity) return prev;
  if (item.requiresDirty && (s.dirtyMoney ?? 0) <= 0) return prev;
  
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
  } else if (itemId === "perf_chef") {
    s.physical = clamp(s.physical + 2, 20, 99);
    s.events.push("🥗 Hired a Private Chef! +2 Physical, +2 Stamina.");
  } else if (itemId === "perf_psychologist") {
    s.reflexes = clamp(s.reflexes + 3, 20, 99); // composure mapped to reflexes
    s.events.push("🧠 Hired a Sports Psychologist! +3 Composure.");
  } else if (itemId === "perf_cryo") {
    s.events.push("🧊 Installed a Cryotherapy Suite! Injury risk reduced by 15%.");
  } else if (itemId === "perf_trainer") {
    s.pace = clamp(s.pace + 2, 20, 99);
    s.physical = clamp(s.physical + 2, 20, 99);
    s.events.push("🏋️ Hired an Elite Personal Trainer! +2 Pace, +2 Physical.");
  } else if (itemId === "perf_biomech") {
    s.shooting = clamp(s.shooting + 2, 20, 99);
    s.passing = clamp(s.passing + 2, 20, 99);
    s.events.push("🔬 Hired a Biomechanics Coach! +2 Shooting, +2 Passing.");
  } else if (itemId === "perf_altitude") {
    s.physical = clamp(s.physical + 3, 20, 99);
    s.events.push("⛰️ Completed Altitude Training Camp! +3 Stamina.");
  } else if (itemId === "perf_sleep") {
    s.events.push("😴 Started Sleep Optimization Clinic! Faster injury recovery.");
  } else if (itemId === "perf_vr") {
    s.passing = clamp(s.passing + 2, 20, 99); // decision making mapped to passing
    s.events.push("🥽 Installed VR Training System! +2 Decision Making.");
  } else if (itemId === "perf_vision") {
    s.passing = clamp(s.passing + 2, 20, 99);
    s.events.push("👁️ Started Vision Training! +2 Passing, better assist rate.");
  } else if (itemId === "perf_setpiece") {
    s.shooting = clamp(s.shooting + 3, 20, 99);
    s.events.push("🎯 Hired a Set Piece Coach! +3 Free Kick accuracy.");
  } else if (itemId === "boyhood_club") {
    s.popularity = clamp(s.popularity + 20, 0, 100);
    s.integrityBonus += 15;
    s.events.push("🏟️ YOU BOUGHT YOUR BOYHOOD CLUB. The town declares a holiday. Popularity +20, legacy secured.");
  } else if (itemId === "hometown_academy") {
    s.popularity = clamp(s.popularity + 10, 0, 100);
    s.integrityBonus += 8;
    s.events.push("🎓 Opened a youth academy back home. Popularity +10, legacy credit banked.");
  } else if (itemId === "football_museum") {
    s.popularity = clamp(s.popularity + 8, 0, 100);
    s.events.push("🖼️ Opened a museum about yourself. Bold. Popularity +8.");
  } else if (itemId === "submarine") {
    s.popularity = clamp(s.popularity + 5, 0, 100);
    s.events.push("🛳️ Bought a personal submarine. Nobody knows why. Popularity +5.");
  } else if (itemId === "security_team") {
    s.morale = clamp(s.morale + 3, 0, 100);
    s.events.push("🕶️ Hired a security team. +3 Morale, you sleep easy now.");
  } else if (itemId === "documentary_crew") {
    s.events.push("🎥 Signed your own documentary crew. +3 Popularity per season.");
  } else if (itemId === "family_office") {
    s.events.push("🏦 Hired a family office. Your money now works while you train.");
  } else if (itemId === "charity_foundation") {
    s.popularity = clamp(s.popularity + 5, 0, 100);
    s.integrityBonus += 5;
    s.events.push("❤️ Launched your charity foundation. Popularity +5 now, legacy credit every season.");  } else if (itemId === "signature_cologne") {
    if (Math.random() < 0.6) {
      s.netWorth = Math.round((s.netWorth + 5) * 100) / 100;
      s.events.push("🧴 Your cologne sold out three restocks. +€5M and airports smell like you now.");
    } else {
      s.events.push("🧴 The cologne reviews said 'locker room after extra time'. The €2M is gone.");
    }
    s.popularity = clamp(s.popularity + 3, 0, 100);
  } else if (itemId === "tequila_brand") {
    if (Math.random() < 0.45) {
      s.netWorth = Math.round((s.netWorth + 12) * 100) / 100;
      s.events.push("🥃 The tequila took off in three continents. +€12M. Salud.");
    } else {
      s.events.push("🥃 The tequila sits on shelves next to eleven other celebrity bottles. Slow fade.");
    }
  } else if (itemId === "video_game_studio") {
    if (Math.random() < 0.25) {
      s.netWorth = Math.round((s.netWorth + 32) * 100) / 100;
      s.popularity = clamp(s.popularity + 8, 0, 100);
      s.events.push("🎮 Your studio's game hit number one in 40 countries with your face on the cover. +€32M.");
    } else {
      s.events.push("🎮 The game shipped buggy and the reviews were brutal. The €8M is a write-off, but the memes are immortal.");
    }
  } else if (itemId === "space_flight") {
    s.popularity = clamp(s.popularity + 12, 0, 100);
    s.morale = clamp(s.morale + 8, 0, 100);
    s.events.push("🚀 Eleven minutes in space. You saw the whole planet and it did not have a single defender in it. Popularity +12.");
  } else if (itemId === "rivals_boyhood_club") {
    s.popularity = clamp(s.popularity + 8, 0, 100);
    s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) + 40, 0, 100);
    s.events.push(`🗿 You bought ${s.rival ? s.rival.name + "'s" : "your rival's"} boyhood club and renamed the stadium after yourself. The pettiest move in football history. The feud is now eternal.`);
  } else {
    s.events.push(`${item.emoji} Purchased ${item.name}! (€${item.cost >= 1 ? item.cost.toFixed(0) + "M" : Math.round(item.cost * 1000) + "k"})`);
  }

  // Round 54: generic effect fields, so the 47 expansion items (and anything
  // added later) apply themselves without another branch above.
  if (item.statBoosts) {
    for (const [stat, delta] of Object.entries(item.statBoosts)) {
      const key = stat as keyof typeof item.statBoosts;
      s[key] = clamp(s[key] + (delta ?? 0), 20, 99);
    }
    s.overall = calcOverall(s, s.position);
  }
  if (item.moraleBoost) s.morale = clamp(s.morale + item.moraleBoost, 0, 100);
  if (item.popularityBoost) s.popularity = clamp(s.popularity + item.popularityBoost, 0, 100);
  if (item.followersBoostM) s.socialMediaFollowers = Math.round((s.socialMediaFollowers + item.followersBoostM) * 10) / 10;
  if (item.heatChange) {
    s.corruptionHeat = clamp((s.corruptionHeat ?? 0) + item.heatChange, 0, 100);
    if (item.heatChange >= 10) s.events.push("🌡️ Somewhere, an investigator opens a folder with your name on it.");
  }

  // Update total asset value
  s.totalAssetValue = calcTotalAssets(s);
  s.lifestyleLevel = calcLifestyleLevel(s.netWorth + s.totalAssetValue);
  // Recalculate overall if performance item changed stats
  if (item.category === "performance") {
    s.overall = calcOverall(s, s.position);
  }

  return s;
}

function calcTotalAssets(s: CareerState): number {
  let total = 0;
  // Properties & vehicles, appreciate/depreciate
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
      // Steady 8% return per year, resolve as income, keep holding
      const yearlyReturn = h.invested * 0.08;
      s.netWorth = Math.round((s.netWorth + yearlyReturn) * 100) / 100;
      if (yearsHeld > 0 && yearsHeld % 1 === 0) {
        s.events.push(`⚽ Football Club Shares returned €${(yearlyReturn).toFixed(1)}M this year`);
      }
      continue; // never resolves, keeps paying
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
    } else if (h.name === "Art Collection") {
      const yearlyReturn = h.invested * 0.12;
      s.netWorth = Math.round((s.netWorth + yearlyReturn) * 100) / 100;
      s.events.push(`🎨 Art collection appreciated €${yearlyReturn.toFixed(1)}M this year`);
      continue; // keeps paying like club shares
    } else if (h.name === "Teammate's Startup") {
      if (Math.random() < 0.40) {
        h.returnAmount = h.invested * 5;
        s.netWorth = Math.round((s.netWorth + h.returnAmount) * 100) / 100;
        s.events.push(`🚀 Your teammate's startup got acquired! 5x return: €${h.returnAmount.toFixed(1)}M!`);
      } else {
        s.events.push("🚀 The teammate's startup folded. He avoids you at training.");
      }
    } else if (h.name === "Meme Coin") {
      if (Math.random() < 0.10) {
        h.returnAmount = h.invested * 20;
        s.netWorth = Math.round((s.netWorth + h.returnAmount) * 100) / 100;
        s.events.push(`🐕 THE MEME COIN DID A 20X. €${h.returnAmount.toFixed(1)}M. Delete the evidence of how proud you are.`);
      } else {
        s.events.push("🐕 The meme coin went to zero, as meme coins do.");
      }
    } else if (h.name === "Racehorse") {
      if (Math.random() < 0.25) {
        h.returnAmount = 6;
        s.netWorth = Math.round((s.netWorth + h.returnAmount) * 100) / 100;
        s.events.push("🐎 Your horse WON THE BIG ONE. €6.0M in prize money and stud fees!");
      } else {
        h.returnAmount = h.invested * 0.4;
        s.netWorth = Math.round((s.netWorth + h.returnAmount) * 100) / 100;
        s.events.push(`🐎 The horse never won but the stud fees paid €${h.returnAmount.toFixed(1)}M back.`);
      }
    } else if (h.name === "Esports Org") {
      if (Math.random() < 0.35) {
        h.returnAmount = h.invested * 3;
        s.netWorth = Math.round((s.netWorth + h.returnAmount) * 100) / 100;
        s.events.push(`🎮 Your esports org won a major! 3x return: €${h.returnAmount.toFixed(1)}M!`);
      } else {
        s.events.push("🎮 The esports org burned through the money. Teenagers are expensive.");
      }
    } else if (h.name === "Tech Startup") {
      if (Math.random() < 0.20) {
        h.returnAmount = h.invested * 10;
        s.netWorth = Math.round((s.netWorth + h.returnAmount) * 100) / 100;
        s.events.push(`💻 Tech startup went viral! 10x return: €${h.returnAmount.toFixed(1)}M!`);
      } else {
        s.events.push("💻 Tech startup failed. Investment lost.");
      }
    }
  }
  // Remove old non-football resolved investments from the investments display
  s.investmentHoldings = s.investmentHoldings.filter(h => !h.resolved || h.name === "Football Club Shares");
}


const ELITE_CLUBS = ["Bayern Munich", "PSG", "Man City", "Real Madrid", "Barcelona", "Liverpool"];

/* ─── Fallback club roster ───
   Used when the soccer_career_clubs table is unreachable or empty, so the game
   can always start instead of hanging on a blank/failed fetch. */
export const FALLBACK_CLUBS: ClubData[] = [
  // Tier 1, elite
  { id: "fb-1", name: "Real Madrid", country: "Spain", tier: 1, color: "#FEBE10", league: "La Liga" },
  { id: "fb-2", name: "Barcelona", country: "Spain", tier: 1, color: "#A50044", league: "La Liga" },
  { id: "fb-3", name: "Man City", country: "England", tier: 1, color: "#6CABDD", league: "Premier League" },
  { id: "fb-4", name: "Liverpool", country: "England", tier: 1, color: "#C8102E", league: "Premier League" },
  { id: "fb-5", name: "Bayern Munich", country: "Germany", tier: 1, color: "#DC052D", league: "Bundesliga" },
  { id: "fb-6", name: "PSG", country: "France", tier: 1, color: "#004170", league: "Ligue 1" },
  { id: "fb-7", name: "Juventus", country: "Italy", tier: 1, color: "#000000", league: "Serie A" },
  { id: "fb-8", name: "Inter Milan", country: "Italy", tier: 1, color: "#0068A8", league: "Serie A" },
  { id: "fb-9", name: "Man United", country: "England", tier: 1, color: "#DA291C", league: "Premier League" },
  { id: "fb-10", name: "Arsenal", country: "England", tier: 1, color: "#EF0107", league: "Premier League" },
  { id: "fb-11", name: "Chelsea", country: "England", tier: 1, color: "#034694", league: "Premier League" },
  { id: "fb-12", name: "Ajax", country: "Netherlands", tier: 1, color: "#D2122E", league: "Eredivisie" },
  { id: "fb-13", name: "Benfica", country: "Portugal", tier: 1, color: "#E30613", league: "Primeira Liga" },
  { id: "fb-14", name: "Porto", country: "Portugal", tier: 1, color: "#003399", league: "Primeira Liga" },
  { id: "fb-15", name: "Boca Juniors", country: "Argentina", tier: 1, color: "#003DA5", league: "Liga Profesional" },
  { id: "fb-16", name: "River Plate", country: "Argentina", tier: 1, color: "#E9040F", league: "Liga Profesional" },
  { id: "fb-17", name: "Flamengo", country: "Brazil", tier: 1, color: "#C8102E", league: "Brasileirao" },
  { id: "fb-18", name: "Sao Paulo", country: "Brazil", tier: 1, color: "#B40404", league: "Brasileirao" },
  // Tier 2, strong mid-table
  { id: "fb-19", name: "Atletico Madrid", country: "Spain", tier: 2, color: "#CB3524", league: "La Liga" },
  { id: "fb-20", name: "Sevilla", country: "Spain", tier: 2, color: "#D0021B", league: "La Liga" },
  { id: "fb-21", name: "Tottenham", country: "England", tier: 2, color: "#132257", league: "Premier League" },
  { id: "fb-22", name: "Newcastle", country: "England", tier: 2, color: "#241F20", league: "Premier League" },
  { id: "fb-23", name: "Dortmund", country: "Germany", tier: 2, color: "#FDE100", league: "Bundesliga" },
  { id: "fb-24", name: "Leipzig", country: "Germany", tier: 2, color: "#DD0741", league: "Bundesliga" },
  { id: "fb-25", name: "AC Milan", country: "Italy", tier: 2, color: "#FB090B", league: "Serie A" },
  { id: "fb-26", name: "Napoli", country: "Italy", tier: 2, color: "#12A0D7", league: "Serie A" },
  { id: "fb-27", name: "Roma", country: "Italy", tier: 2, color: "#8E1F2F", league: "Serie A" },
  { id: "fb-28", name: "Marseille", country: "France", tier: 2, color: "#2FA0DA", league: "Ligue 1" },
  { id: "fb-29", name: "Lyon", country: "France", tier: 2, color: "#1C2C5B", league: "Ligue 1" },
  { id: "fb-30", name: "Feyenoord", country: "Netherlands", tier: 2, color: "#00A03C", league: "Eredivisie" },
  { id: "fb-31", name: "PSV", country: "Netherlands", tier: 2, color: "#ED1C24", league: "Eredivisie" },
  { id: "fb-32", name: "Sporting CP", country: "Portugal", tier: 2, color: "#008148", league: "Primeira Liga" },
  { id: "fb-33", name: "Fenerbahce", country: "Turkey", tier: 2, color: "#0A2C59", league: "Super Lig" },
  { id: "fb-34", name: "Galatasaray", country: "Turkey", tier: 2, color: "#A90432", league: "Super Lig" },
  { id: "fb-35", name: "Al Hilal", country: "Saudi Arabia", tier: 2, color: "#003DA5", league: "Saudi Pro League" },
  { id: "fb-36", name: "Celtic", country: "Scotland", tier: 2, color: "#018749", league: "Scottish Premiership" },
  { id: "fb-37", name: "Rangers", country: "Scotland", tier: 2, color: "#1E3A8A", league: "Scottish Premiership" },
  { id: "fb-38", name: "Palmeiras", country: "Brazil", tier: 2, color: "#006437", league: "Brasileirao" },
  { id: "fb-39", name: "LA Galaxy", country: "USA", tier: 2, color: "#00245D", league: "MLS" },
  { id: "fb-40", name: "Inter Miami", country: "USA", tier: 2, color: "#F7B5CD", league: "MLS" },
  // Tier 3, solid domestic clubs
  { id: "fb-41", name: "Real Sociedad", country: "Spain", tier: 3, color: "#0067B1", league: "La Liga" },
  { id: "fb-42", name: "Villarreal", country: "Spain", tier: 3, color: "#FFE667", league: "La Liga" },
  { id: "fb-43", name: "West Ham", country: "England", tier: 3, color: "#7A263A", league: "Premier League" },
  { id: "fb-44", name: "Aston Villa", country: "England", tier: 3, color: "#670E36", league: "Premier League" },
  { id: "fb-45", name: "Everton", country: "England", tier: 3, color: "#003399", league: "Premier League" },
  { id: "fb-46", name: "Leverkusen", country: "Germany", tier: 3, color: "#E32221", league: "Bundesliga" },
  { id: "fb-47", name: "Frankfurt", country: "Germany", tier: 3, color: "#E1000F", league: "Bundesliga" },
  { id: "fb-48", name: "Atalanta", country: "Italy", tier: 3, color: "#1E71B8", league: "Serie A" },
  { id: "fb-49", name: "Fiorentina", country: "Italy", tier: 3, color: "#5B2A86", league: "Serie A" },
  { id: "fb-50", name: "Lille", country: "France", tier: 3, color: "#C60C30", league: "Ligue 1" },
  { id: "fb-51", name: "Monaco", country: "Monaco", tier: 3, color: "#E2231A", league: "Ligue 1" },
  { id: "fb-52", name: "Genk", country: "Belgium", tier: 3, color: "#0055A4", league: "Belgian Pro League" },
  { id: "fb-53", name: "Anderlecht", country: "Belgium", tier: 3, color: "#5E2C81", league: "Belgian Pro League" },
  { id: "fb-54", name: "FC Copenhagen", country: "Denmark", tier: 3, color: "#FFFFFF", league: "Danish Superliga" },
  { id: "fb-55", name: "Malmo FF", country: "Sweden", tier: 3, color: "#5CB8E4", league: "Allsvenskan" },
  { id: "fb-56", name: "Red Bull Salzburg", country: "Austria", tier: 3, color: "#DB021D", league: "Austrian Bundesliga" },
  { id: "fb-57", name: "Basel", country: "Switzerland", tier: 3, color: "#DB021D", league: "Swiss Super League" },
  { id: "fb-58", name: "Al Nassr", country: "Saudi Arabia", tier: 3, color: "#FFF200", league: "Saudi Pro League" },
  { id: "fb-59", name: "Cruz Azul", country: "Mexico", tier: 3, color: "#00539F", league: "Liga MX" },
  { id: "fb-60", name: "Club America", country: "Mexico", tier: 3, color: "#FFC72C", league: "Liga MX" },
  // Tier 4, smaller / lower league
  { id: "fb-61", name: "Real Betis", country: "Spain", tier: 4, color: "#00954C", league: "La Liga" },
  { id: "fb-62", name: "Celta Vigo", country: "Spain", tier: 4, color: "#8AC3EE", league: "La Liga" },
  { id: "fb-63", name: "Crystal Palace", country: "England", tier: 4, color: "#1B458F", league: "Premier League" },
  { id: "fb-64", name: "Brentford", country: "England", tier: 4, color: "#D20000", league: "Premier League" },
  { id: "fb-65", name: "Norwich City", country: "England", tier: 4, color: "#FFF200", league: "Championship" },
  { id: "fb-66", name: "Hertha Berlin", country: "Germany", tier: 4, color: "#004C9E", league: "Bundesliga" },
  { id: "fb-67", name: "Werder Bremen", country: "Germany", tier: 4, color: "#1D9053", league: "Bundesliga" },
  { id: "fb-68", name: "Torino", country: "Italy", tier: 4, color: "#881B1E", league: "Serie A" },
  { id: "fb-69", name: "Bologna", country: "Italy", tier: 4, color: "#A61C2E", league: "Serie A" },
  { id: "fb-70", name: "Nantes", country: "France", tier: 4, color: "#FCE300", league: "Ligue 1" },
  { id: "fb-71", name: "Strasbourg", country: "France", tier: 4, color: "#0072BB", league: "Ligue 1" },
  { id: "fb-72", name: "Utrecht", country: "Netherlands", tier: 4, color: "#D2122E", league: "Eredivisie" },
  { id: "fb-73", name: "Braga", country: "Portugal", tier: 4, color: "#DA020E", league: "Primeira Liga" },
  { id: "fb-74", name: "Aberdeen", country: "Scotland", tier: 4, color: "#D71920", league: "Scottish Premiership" },
  { id: "fb-75", name: "Santos", country: "Brazil", tier: 4, color: "#FFFFFF", league: "Brasileirao" },
  { id: "fb-76", name: "Colo-Colo", country: "Chile", tier: 4, color: "#FFFFFF", league: "Primera Division" },
  { id: "fb-77", name: "Al Ahly", country: "Egypt", tier: 4, color: "#C8102E", league: "Egyptian Premier League" },
  { id: "fb-78", name: "Kaizer Chiefs", country: "South Africa", tier: 4, color: "#FFD100", league: "PSL" },
  { id: "fb-79", name: "Yokohama F. Marinos", country: "Japan", tier: 4, color: "#00559A", league: "J1 League" },
  { id: "fb-80", name: "Urawa Red Diamonds", country: "Japan", tier: 4, color: "#D2001C", league: "J1 League" },
  { id: "fb-81", name: "Seattle Sounders", country: "USA", tier: 4, color: "#5D9741", league: "MLS" },
  // ── Round 54 expansion: 60+ new clubs so careers can wind through nearly
  // every football country on earth (owner: "more teams and more flags and
  // more of everything"). Tier 2, big names outside the usual five leagues.
  { id: "fb-82", name: "Al Ittihad", country: "Saudi Arabia", tier: 2, color: "#F9C623", league: "Saudi Pro League" },
  { id: "fb-83", name: "Club Brugge", country: "Belgium", tier: 2, color: "#0B4494", league: "Belgian Pro League" },
  { id: "fb-84", name: "Olympiacos", country: "Greece", tier: 2, color: "#D6202B", league: "Super League Greece" },
  { id: "fb-85", name: "Shakhtar Donetsk", country: "Ukraine", tier: 2, color: "#F26522", league: "Ukrainian Premier League" },
  { id: "fb-86", name: "Corinthians", country: "Brazil", tier: 2, color: "#141414", league: "Brasileirao" },
  { id: "fb-87", name: "Monterrey", country: "Mexico", tier: 2, color: "#0A2240", league: "Liga MX" },
  { id: "fb-88", name: "Tigres UANL", country: "Mexico", tier: 2, color: "#FDB913", league: "Liga MX" },
  { id: "fb-89", name: "Athletic Bilbao", country: "Spain", tier: 2, color: "#EE2523", league: "La Liga" },
  { id: "fb-90", name: "Brighton", country: "England", tier: 2, color: "#0057B8", league: "Premier League" },
  { id: "fb-91", name: "Stuttgart", country: "Germany", tier: 2, color: "#E32219", league: "Bundesliga" },
  { id: "fb-92", name: "LAFC", country: "USA", tier: 2, color: "#C39E6D", league: "MLS" },
  { id: "fb-93", name: "River Plate Asuncion", country: "Paraguay", tier: 4, color: "#CE1126", league: "Primera Division Paraguay" },
  { id: "fb-94", name: "Racing Club", country: "Argentina", tier: 2, color: "#75AADB", league: "Liga Profesional" },
  { id: "fb-95", name: "Zenit", country: "Russia", tier: 2, color: "#009FDF", league: "Russian Premier League" },
  { id: "fb-96", name: "Girona", country: "Spain", tier: 2, color: "#CD2534", league: "La Liga" },
  // Tier 3, strong clubs across Europe, Asia, Africa and the Americas.
  { id: "fb-97", name: "PAOK", country: "Greece", tier: 3, color: "#2B2B2B", league: "Super League Greece" },
  { id: "fb-98", name: "Panathinaikos", country: "Greece", tier: 3, color: "#00743F", league: "Super League Greece" },
  { id: "fb-99", name: "Dinamo Zagreb", country: "Croatia", tier: 3, color: "#1F4C9C", league: "HNL" },
  { id: "fb-100", name: "Red Star Belgrade", country: "Serbia", tier: 3, color: "#D6202B", league: "Serbian SuperLiga" },
  { id: "fb-101", name: "Legia Warsaw", country: "Poland", tier: 3, color: "#0F5B2F", league: "Ekstraklasa" },
  { id: "fb-102", name: "Slavia Prague", country: "Czech Republic", tier: 3, color: "#D6202B", league: "Czech First League" },
  { id: "fb-103", name: "Besiktas", country: "Turkey", tier: 3, color: "#2B2B2B", league: "Super Lig" },
  { id: "fb-104", name: "Trabzonspor", country: "Turkey", tier: 3, color: "#5C1F33", league: "Super Lig" },
  { id: "fb-105", name: "Nice", country: "France", tier: 3, color: "#CC0000", league: "Ligue 1" },
  { id: "fb-106", name: "Wolves", country: "England", tier: 3, color: "#FDB913", league: "Premier League" },
  { id: "fb-107", name: "Fulham", country: "England", tier: 3, color: "#111111", league: "Premier League" },
  { id: "fb-108", name: "Gremio", country: "Brazil", tier: 3, color: "#0D80BF", league: "Brasileirao" },
  { id: "fb-109", name: "Atletico Nacional", country: "Colombia", tier: 3, color: "#00A650", league: "Liga BetPlay" },
  { id: "fb-110", name: "Penarol", country: "Uruguay", tier: 3, color: "#FFD100", league: "Primera Division Uruguay" },
  { id: "fb-111", name: "Kawasaki Frontale", country: "Japan", tier: 3, color: "#009FE8", league: "J1 League" },
  { id: "fb-112", name: "Jeonbuk Motors", country: "South Korea", tier: 3, color: "#0C6B3E", league: "K League 1" },
  { id: "fb-113", name: "Al Sadd", country: "Qatar", tier: 3, color: "#2B2B2B", league: "Qatar Stars League" },
  { id: "fb-114", name: "Persepolis", country: "Iran", tier: 3, color: "#D6202B", league: "Persian Gulf Pro League" },
  { id: "fb-115", name: "Shanghai Port", country: "China", tier: 3, color: "#D6202B", league: "Chinese Super League" },
  { id: "fb-116", name: "Zamalek", country: "Egypt", tier: 3, color: "#FFFFFF", league: "Egyptian Premier League" },
  { id: "fb-117", name: "Wydad Casablanca", country: "Morocco", tier: 3, color: "#D6202B", league: "Botola Pro" },
  { id: "fb-118", name: "Esperance", country: "Tunisia", tier: 3, color: "#BC0C12", league: "Ligue 1 Tunisia" },
  { id: "fb-119", name: "Mamelodi Sundowns", country: "South Africa", tier: 3, color: "#FBC403", league: "PSL" },
  { id: "fb-120", name: "Toronto FC", country: "Canada", tier: 3, color: "#B81137", league: "MLS" },
  // Tier 4, the wide world where most careers actually start.
  { id: "fb-121", name: "Sparta Prague", country: "Czech Republic", tier: 4, color: "#7B0C11", league: "Czech First League" },
  { id: "fb-122", name: "Partizan", country: "Serbia", tier: 4, color: "#2B2B2B", league: "Serbian SuperLiga" },
  { id: "fb-123", name: "Ferencvaros", country: "Hungary", tier: 4, color: "#0E5C2F", league: "NB I" },
  { id: "fb-124", name: "Hajduk Split", country: "Croatia", tier: 4, color: "#0C4076", league: "HNL" },
  { id: "fb-125", name: "HJK Helsinki", country: "Finland", tier: 4, color: "#0056A3", league: "Veikkausliiga" },
  { id: "fb-126", name: "Breidablik", country: "Iceland", tier: 4, color: "#00954C", league: "Besta deild" },
  { id: "fb-127", name: "Slovan Bratislava", country: "Slovakia", tier: 4, color: "#57A8E2", league: "Slovak First League" },
  { id: "fb-128", name: "Ludogorets", country: "Bulgaria", tier: 4, color: "#00954C", league: "First League Bulgaria" },
  { id: "fb-129", name: "Sheriff Tiraspol", country: "Moldova", tier: 4, color: "#FBC403", league: "Super Liga Moldova" },
  { id: "fb-130", name: "Dinamo Tbilisi", country: "Georgia", tier: 4, color: "#0C4076", league: "Erovnuli Liga" },
  { id: "fb-131", name: "Pyunik", country: "Armenia", tier: 4, color: "#D6202B", league: "Armenian Premier League" },
  { id: "fb-132", name: "Qarabag", country: "Azerbaijan", tier: 4, color: "#2B2B2B", league: "Azerbaijan Premier League" },
  { id: "fb-133", name: "Kairat Almaty", country: "Kazakhstan", tier: 4, color: "#FBC403", league: "Kazakhstan Premier League" },
  { id: "fb-134", name: "Pakhtakor", country: "Uzbekistan", tier: 4, color: "#0056A3", league: "Uzbekistan Super League" },
  { id: "fb-135", name: "Mumbai City", country: "India", tier: 4, color: "#57A8E2", league: "Indian Super League" },
  { id: "fb-136", name: "Buriram United", country: "Thailand", tier: 4, color: "#0C2E5C", league: "Thai League 1" },
  { id: "fb-137", name: "Persija Jakarta", country: "Indonesia", tier: 4, color: "#D6202B", league: "Liga 1 Indonesia" },
  { id: "fb-138", name: "Hanoi FC", country: "Vietnam", tier: 4, color: "#5C2D91", league: "V.League 1" },
  { id: "fb-139", name: "Johor Darul Tazim", country: "Malaysia", tier: 4, color: "#0C2E5C", league: "Malaysia Super League" },
  { id: "fb-140", name: "Melbourne Victory", country: "Australia", tier: 4, color: "#0C2E5C", league: "A-League" },
  { id: "fb-141", name: "Auckland FC", country: "New Zealand", tier: 4, color: "#2B2B2B", league: "A-League" },
  { id: "fb-142", name: "Wellington Phoenix", country: "New Zealand", tier: 4, color: "#FBC403", league: "A-League" },
  { id: "fb-143", name: "Raja Casablanca", country: "Morocco", tier: 4, color: "#00954C", league: "Botola Pro" },
  { id: "fb-144", name: "TP Mazembe", country: "DR Congo", tier: 4, color: "#2B2B2B", league: "Linafoot" },
  { id: "fb-145", name: "Enyimba", country: "Nigeria", tier: 4, color: "#0056A3", league: "NPFL" },
  { id: "fb-146", name: "Asante Kotoko", country: "Ghana", tier: 4, color: "#D6202B", league: "Ghana Premier League" },
  { id: "fb-147", name: "Gor Mahia", country: "Kenya", tier: 4, color: "#00954C", league: "Kenyan Premier League" },
  { id: "fb-148", name: "Orlando Pirates", country: "South Africa", tier: 4, color: "#2B2B2B", league: "PSL" },
  { id: "fb-149", name: "Saint George", country: "Ethiopia", tier: 4, color: "#FBC403", league: "Ethiopian Premier League" },
  { id: "fb-150", name: "Young Africans", country: "Tanzania", tier: 4, color: "#00954C", league: "NBC Premier League" },
  { id: "fb-151", name: "Atletico Petroleos", country: "Angola", tier: 4, color: "#FBC403", league: "Girabola" },
  { id: "fb-152", name: "Nacional", country: "Uruguay", tier: 4, color: "#FFFFFF", league: "Primera Division Uruguay" },
  { id: "fb-153", name: "Universidad de Chile", country: "Chile", tier: 4, color: "#0C2E5C", league: "Primera Division" },
  { id: "fb-154", name: "Millonarios", country: "Colombia", tier: 4, color: "#0056A3", league: "Liga BetPlay" },
  { id: "fb-155", name: "LDU Quito", country: "Ecuador", tier: 4, color: "#FFFFFF", league: "LigaPro" },
  { id: "fb-156", name: "Alianza Lima", country: "Peru", tier: 4, color: "#0C2E5C", league: "Liga 1 Peru" },
  { id: "fb-157", name: "Olimpia", country: "Paraguay", tier: 4, color: "#2B2B2B", league: "Primera Division Paraguay" },
  { id: "fb-158", name: "Caracas FC", country: "Venezuela", tier: 4, color: "#7B0C11", league: "Liga FUTVE" },
  { id: "fb-159", name: "Bolivar", country: "Bolivia", tier: 4, color: "#57A8E2", league: "Division Profesional" },
  { id: "fb-160", name: "Saprissa", country: "Costa Rica", tier: 4, color: "#5C2D91", league: "Liga FPD" },
  { id: "fb-161", name: "Olimpia Tegucigalpa", country: "Honduras", tier: 4, color: "#FFFFFF", league: "Liga Nacional Honduras" },
  { id: "fb-162", name: "Alianza FC", country: "El Salvador", tier: 4, color: "#FFFFFF", league: "Primera Division El Salvador" },
  { id: "fb-163", name: "Comunicaciones", country: "Guatemala", tier: 4, color: "#FFFFFF", league: "Liga Nacional Guatemala" },
  { id: "fb-164", name: "Violette AC", country: "Haiti", tier: 4, color: "#5C2D91", league: "Ligue Haitienne" },
  { id: "fb-165", name: "Waterhouse FC", country: "Jamaica", tier: 4, color: "#D6202B", league: "Jamaica Premier League" },
  { id: "fb-166", name: "Defence Force FC", country: "Trinidad and Tobago", tier: 4, color: "#7B0C11", league: "TT Premier League" },
  { id: "fb-167", name: "Vancouver Whitecaps", country: "Canada", tier: 4, color: "#0C2E5C", league: "MLS" },
  { id: "fb-168", name: "Chivas", country: "Mexico", tier: 4, color: "#D6202B", league: "Liga MX" },
  { id: "fb-169", name: "Pumas", country: "Mexico", tier: 4, color: "#0C2E5C", league: "Liga MX" },
  { id: "fb-170", name: "Al Duhail", country: "Qatar", tier: 4, color: "#D6202B", league: "Qatar Stars League" },
  { id: "fb-171", name: "Al Ain", country: "UAE", tier: 4, color: "#5C2D91", league: "UAE Pro League" },
  { id: "fb-172", name: "Beijing Guoan", country: "China", tier: 4, color: "#00954C", league: "Chinese Super League" },
  { id: "fb-173", name: "Maccabi Tel Aviv", country: "Israel", tier: 4, color: "#FBC403", league: "Israeli Premier League" },
  { id: "fb-174", name: "APOEL", country: "Cyprus", tier: 4, color: "#F26522", league: "Cypriot First Division" },
  { id: "fb-175", name: "Flora Tallinn", country: "Estonia", tier: 4, color: "#00954C", league: "Meistriliiga" },
  { id: "fb-176", name: "Zalgiris Vilnius", country: "Lithuania", tier: 4, color: "#00954C", league: "A Lyga" },
];

/* ─── Appearances, league + UCL + cups for realistic totals ─── */
function calcAppearances(overall: number, clubTier: number, age: number, state?: CareerState, fx: BuildEffects = NEUTRAL_EFFECTS): { apps: number; injured: boolean; injuryWeeks: number; injuryName: string | null; injurySevere: boolean } {
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

  /* Round 130: a happy dressing room gets you picked, a cold one does not.
     Two appearances out of thirty is on purpose. It is enough to measure and
     small enough that it cannot undo thirty rounds of balance work. */
  if (state) leagueApps = clamp(leagueApps + phoneAppsSwing(state), 0, 38);


  // --- UCL appearances (0-13), only Tier 1-2 clubs qualify ---
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

  /* Round 131: stamina, strength and balance decide whether you are still
     standing in April. Deliberately the smallest of the build effects, plus or
     minus seven percent at the extremes, because availability compounds across
     a whole career and it would run away with the game if it were any bigger.

     Applied to the total rather than to the league games on their own, which
     is not a detail: a first choice player at a big club is regularly already
     on 36 or 37 of a possible 38 in the league, so a multiplier applied there
     was being eaten by the ceiling and a build that should have been notably
     more durable came out two games better across twelve seasons. */
  apps = Math.max(0, Math.round(apps * fx.appsMult));

  let injured = false;
  let injuryWeeks = 0;
  let injuryName: string | null = null;
  let injurySevere = false;
  let injuryChance = clamp(0.20 + fx.injuryDelta, 0.05, 0.40);
  /* ─── Round 131: the wonderkid tax ───

     The build screen will now let you start at 99, and it should, because he
     asked for it. But the world has to react to a seventeen year old who is
     already the best player alive rather than shrugging, and what actually
     happens to that kid is that he plays every minute of every competition,
     every defender in the league goes through him, and his body pays for it.

     So this reads the overall the career BEGAN at, never the one it has grown
     to. That is the whole point: a player who climbed to 90 by twenty three
     earned it season by season and is not touched by this at all, while a
     player who was handed 90 on the creation screen carries the risk of it
     from his first pro season to his twenty fourth birthday. A 99 start adds
     seventeen points of injury chance a year for seven years. A 62 start adds
     one. Saves from before this round have no starting overall recorded and so
     are never affected, which is also correct: nobody was handed anything
     before this round, the cap was 85. */
  const startedAt = state?.startingOverall;
  if (typeof startedAt === "number" && startedAt > 60 && age <= 23) {
    injuryChance = clamp(injuryChance + clamp(startedAt - 60, 0, 39) * 0.0045, 0.05, 0.42);
  }
  // Cryotherapy reduces injury risk by 15%
  if (state?.purchasedItems?.includes("perf_cryo")) injuryChance -= 0.03;
  const injuryRoll = rollSeasonInjury(injuryChance);
  if (injuryRoll) {
    injured = true;
    injuryName = injuryRoll.name;
    injurySevere = injuryRoll.severe;
    injuryWeeks = injuryRoll.weeks;
    // Elite recovery clinic halves injury time
    if (state?.purchasedItems?.includes("elite_recovery")) {
      injuryWeeks = Math.max(1, Math.round(injuryWeeks * 0.5));
    }
    // Sleep optimization clinic reduces recovery further
    if (state?.purchasedItems?.includes("perf_sleep")) {
      injuryWeeks = Math.max(1, injuryWeeks - 1);
    }
    if (injuryWeeks < 14) injurySevere = false;
    const missedApps = Math.round(injuryWeeks * apps / 46);
    apps = Math.max(1, apps - clamp(missedApps, 0, injurySevere ? 34 : 12));
  }

  return { apps, injured, injuryWeeks, injuryName, injurySevere };
}

/* ─── Goals per 38 apps by position & overall rating ───
   Round 131: the last argument is the build multiplier. It is 1 for everybody
   who did not shape their player, and for the rival simulation and the
   international stub, which have no build to read. */
function calcGoals(position: string, apps: number, overall?: number, mult = 1): number {
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

  const rawGoals = Math.max(0, Math.round(rand(lo, hi) * apps / 38 * mult));

  // Floor for 90+ attackers in a full season (20+ apps)
  if (ovr >= 90 && apps >= 20 && ["ST", "LW", "RW", "CAM"].includes(position)) {
    return Math.max(Math.round(15 * mult), rawGoals);
  }
  return rawGoals;
}

/* ─── Assists per 38 apps by position ─── */
function calcAssists(position: string, apps: number, overall?: number, mult = 1): number {
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
  return Math.max(0, Math.round(rand(lo, hi) * apps / 38 * mult));
}

/* ─── Season rating 1-10 ─── */
function calcSeasonRating(position: string, apps: number, goals: number, assists: number, cleanSheets: number, overall: number, clubTier: number, buildDelta = 0): number {
  const clubAvg = clubAverageRating(clubTier);
  const diff = overall - clubAvg;
  let base = 6.0 + diff * 0.06;
  if (position === "GK") { base += cleanSheets * 0.08; }
  else if (["ST", "LW", "RW", "CAM"].includes(position)) { base += goals * 0.04 + assists * 0.03; }
  else { base += goals * 0.06 + assists * 0.04; }
  if (apps >= 30) base += 0.3;
  else if (apps < 15) base -= 0.4;
  /* Round 131: a build that suits the job reads better in the ratings than a
     build that does not, even at the same overall. A centre back is judged on
     his defending, a winger on what he does at the other end. */
  base += buildDelta;
  base += (Math.random() - 0.5) * 0.8;
  return clamp(parseFloat(base.toFixed(1)), 3.0, 10.0);
}

/* ─── Season simulation ─── */
function generateSeasonStats(state: CareerState): SeasonRecord {
  const { position, age, overall, currentClubTier } = state;
  const isGK = position === "GK";
  const lastYear = state.seasons.length > 0 ? state.seasons[state.seasons.length - 1].year : 0;

  /* Round 131: this is where the build stops being decoration. Two strikers on
     the same overall, one shaped for finishing and a light frame, one shaped
     for strength and a big one, now come out of this function with different
     numbers of games, goals, assists and a different rating. */
  const fx = careerBuildEffects(state);

  const { apps, injured, injuryWeeks, injuryName, injurySevere } = calcAppearances(overall, currentClubTier, age, state, fx);
  let goals = calcGoals(position, apps, overall, fx.goalMult);
  // Diving reputation: +2 goals from penalties
  if (state.divingActive && !isGK) goals += 2;
  const assists = calcAssists(position, apps, overall, fx.assistMult);
  const cleanSheets = isGK ? clamp(Math.round(apps * rand(20, 45) / 100 * fx.cleanSheetMult), 0, apps) : 0;
  const yellowCards = rand(0, Math.min(8, Math.round(apps * 0.25)));
  const redCards = Math.random() < 0.08 ? 1 : 0;
  const rating = calcSeasonRating(position, apps, goals, assists, cleanSheets, overall, currentClubTier, fx.ratingDelta);

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
    injury: injured ? injuryName : null, injuryWeeks: injured ? injuryWeeks : 0, injurySevere: injured ? injurySevere : false,
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
export function generateContractOffers(clubs: ClubData[], overall: number, age: number, academyClubName?: string): ContractOffer[] {
  let targetTiers: number[];
  if (overall >= 66) targetTiers = [2, 2, 3];
  else if (overall >= 56) targetTiers = [3, 3, 3];
  else targetTiers = [3, 4, 4];

  const offers: ContractOffer[] = [];
  const usedNames = new Set<string>();

  // Round 54: the club that raised you ALWAYS offers a first-team deal.
  // Slightly lighter wage (they know you would play for free), but it is the
  // only path to homegrown-legend storylines. Owner feedback: "you should be
  // able to play for the team you started at in academy".
  if (academyClubName) {
    const parentClub = clubs.find(c => c.name === academyClubName);
    if (parentClub) {
      usedNames.add(parentClub.name);
      offers.push({
        club: parentClub,
        contractYears: rand(3, 5),
        wage: Math.round(wageForTier(parentClub.tier, overall) * 0.8),
        transferFee: 0,
        isHomegrown: true,
      });
    }
  }

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
  clubs = adjustClubsForYear(clubs, (lastSeason?.year ?? 2024) + 1);
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

  // Round 49: a super agent gets dream clubs to actually pick up the phone
  const dreamChance = state.agentId === "super" ? 0.25 : 0.15;
  if (overall >= 75 && Math.abs(overall - 80) <= 5 && currentClubTier > 1 && Math.random() < dreamChance) {
    const dreamOffer = makeOffer(clubs, 1, overall, age, exclude, marketValue, true);
    if (dreamOffer) return { type: "dream_club", offer: dreamOffer };
  }

  // Round 54: the homecoming call. Late-career (or just homesick), the club
  // that raised you rings up wanting the prodigal star back.
  const academyName = state.academyClubName;
  if (academyName && academyName !== currentClub && age >= 27 && Math.random() < 0.12) {
    const homeClub = clubs.find(c => c.name === academyName);
    if (homeClub) {
      exclude.add(homeClub.name);
      const homecoming: ContractOffer = {
        club: homeClub,
        contractYears: rand(2, 4),
        wage: Math.round(wageForTier(homeClub.tier, overall) * 0.75),
        transferFee: realisticTransferFee(overall, age),
        isHomegrown: true,
        isPayCut: true,
      };
      return { type: "one_offer", offer: homecoming };
    }
  }

  /* Round 130: an agent you actually talk to works harder. Every banked
     conversation with him is one window where somebody picks up the phone
     that otherwise would not have. Capped at three banked, spent one at a
     time, so it is a nudge and not a cheat. */
  const banked = takePhoneOffers(state);
  const interestChance = (aboveLevel >= 15 ? 0.7 : aboveLevel >= 5 ? 0.5 : aboveLevel >= 0 ? 0.3 : 0.1)
    + (banked > 0 ? 0.3 : 0);
  if (Math.random() < interestChance) {
    const offer = makeOffer(clubs, pick(interestedTiers), overall, age, exclude, marketValue);
    if (offer) return { type: "one_offer", offer };
  }

  return { type: "no_interest" };
}

/* ─── Request transfer, 50/50 ─── */
export function requestTransfer(state: CareerState, clubs: ClubData[]): TransferSituation {
  clubs = adjustClubsForYear(clubs, (state.seasons[state.seasons.length - 1]?.year ?? 2024) + 1);
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
  appearance?: PlayerAppearance | null,
  potential?: number,
  /* Round 131: the frame you picked and the way you shaped the specifics under
     each family. Both optional so every existing caller, including four sim
     harnesses, keeps working untouched. */
  physique?: PlayerPhysique | null,
  attrShape?: AttrShape | null,
): CareerState {
  const academyClub = getYouthAcademyClub(adjustClubsForYear(clubs, startYear), nationality, overall);
  // Round 80: one text waiting on day one so the phone is alive immediately
  const seedTexts = pickPhoneTexts(16, "youth", [], 1);
  const created: CareerState = {
    playerName, nationality, position, era, age: 16,
    // Round 78: the hidden ceiling this career will fight to reach.
    // Round 79: clamped above the final overall, since the point-spend build
    // editor can nudge a keeper's overall a few points past the roll.
    /* Round 131: clamped at 99 as well as floored above the overall. Without
       the clamp a player who built himself to 99 on the creation screen was
       handed a ceiling of 101, a number the growth code can never reach, which
       quietly turned the wall off for exactly the player who most needs it. */
    potential: Math.min(99, Math.max(potential ?? rollPotential(overall), overall + 2)),
    potentialEarned: 0,
    eliteStreak: 0,
    startingOverall: overall,
    physique: safePhysique(position, physique ?? defaultPhysique(position)),
    attrShape: safeShape(position, attrShape),
    // Round 80: the phone starts neutral with one text waiting on day one
    karma: 50,
    phoneUsedIds: seedTexts.map(d => d.id),
    phoneInbox: seedTexts.map(def => ({
      id: `${def.id}-${startYear}`, defId: def.id, from: def.from, emoji: def.emoji,
      text: def.text, year: startYear, choices: def.choices,
    })),
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
      squadSnubs: 0, failedQualifications: 0,
    },
    pendingWorldCup: null,
    pendingTournament: null,
    lastTournament: null,
    intlHistory: [],
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
    pendingCoverAthleteEvent: false,
    coverAthleteAccepted: false,
    activeSponsorship: null,
    personality: null,
    agentId: null,
    lifeFlags: {},
    appearance: appearance ?? null,
    corruptionHeat: 0,
    dirtyMoney: 0,
    prisonSeasons: 0,
    academyClubName: academyClub.name,
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
    /* Round 130: the phone gets its own random stream so replying to a text
       can never shift the world sim's dice. That is what makes a "did I bother
       messaging" A/B test in the harness honest. */
    phone: {
      threads: [], feed: [], world: null, clubs: {}, rivalClub: null,
      seed: (Math.floor(Math.random() * 4294967295) >>> 0) || 7,
      offers: 0, perksTaken: 0,
    },
  };
  /* Day one: the Round 80 text is now the opening line of a thread, and mum
     is already mid conversation, so the Messages app is never empty. */
  for (const m of created.phoneInbox ?? []) {
    mirrorLegacyMessage(created, m.id, m.from, m.text, m.year);
  }
  phoneSeasonTick(created, "youth");
  return created;
}

/* ─── Advance youth year ─── */
export function advanceYouthYear(prev: CareerState, clubs: ClubData[]): CareerState {
  const s = repairCareer({ ...prev }); s.age += 1; s.events = [];
  receivePhoneTexts(s, "youth");
  // Round 78: legacy saves get a generous default so mid-career players are
  // not suddenly nerfed; new careers carry their rolled ceiling.
  const pot = effectivePotential(s);
  const devY = developmentRate(s);
  s.pace = growStat(s.pace, s.age, true, true, s.primeType, pot, s.overall, devY);
  s.shooting = growStat(s.shooting, s.age, true, false, s.primeType, pot, s.overall, devY);
  s.passing = growStat(s.passing, s.age, true, false, s.primeType, pot, s.overall, devY);
  s.dribbling = growStat(s.dribbling, s.age, true, false, s.primeType, pot, s.overall, devY);
  s.defending = growStat(s.defending, s.age, true, false, s.primeType, pot, s.overall, devY);
  s.physical = growStat(s.physical, s.age, true, false, s.primeType, pot, s.overall, devY);
  s.reflexes = growStat(s.reflexes, s.age, true, false, s.primeType, pot, s.overall, devY);
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
    // Round 54: old saves predate academyClubName, so recover it from the
    // "<Club> Youth" naming convention on the fly.
    const academyName = s.academyClubName || (s.currentClub.endsWith(" Youth") ? s.currentClub.slice(0, -6) : undefined);
    s.pendingOffers = generateContractOffers(adjustClubsForYear(clubs, lastYear + 1), s.overall, s.age, academyName);
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
  s.contractYearsLeft = offer.contractYears;
  // Round 49: your agent's negotiating skill decides the final wage
  s.weeklyWage = Math.round(offer.wage * agentWageMult(prev.agentId));
  s.phase = "playing"; s.pendingOffers = []; s.transferSituation = null;
  // Agent fee on the transfer (rate depends on who represents you; legacy saves keep 10%)
  const feeRate = agentTransferCutRate(prev.agentId);
  const agentFee = offer.transferFee > 0 ? Math.round(offer.transferFee * feeRate * 100) / 100 : 0;
  if (agentFee > 0) {
    s.agentFeesPaid = Math.round((s.agentFeesPaid + agentFee) * 100) / 100;
    s.events = [`✍️ Signed with ${offer.club.name} ${getFlag(offer.club.country)} (${offer.contractYears}yr, ${formatWage(s.weeklyWage)}) · Agent fee: €${agentFee.toFixed(1)}M`];
  } else {
    s.events = [`✍️ Signed with ${offer.club.name} ${getFlag(offer.club.country)} (${offer.contractYears}yr, ${formatWage(s.weeklyWage)})`];
  }
  // Round 54: staying loyal to the badge that raised you pays off in the
  // fans' hearts, and coming home later is an instant love story.
  if (offer.isHomegrown) {
    s.popularity = clamp(s.popularity + 10, 0, 100);
    s.morale = clamp(s.morale + 8, 0, 100);
    const cameThrough = (prev.academyClubName && offer.club.name === prev.academyClubName) || prev.currentClub === `${offer.club.name} Youth`;
    s.events.push(cameThrough && prev.currentClub.endsWith(" Youth")
      ? `🏠 One of our own! The ${offer.club.name} academy kid signs a first-team deal. The ultras already have a chant ready.`
      : `🏠 THE HOMECOMING! ${s.playerName} returns to ${offer.club.name}, the club that raised them. Scenes outside the stadium.`);
  }
  return s;
}

/* ─── Round 124: international football lives in soccerInternational.ts ───

   What used to sit here was three hardcoded nation tiers, a getNationStrength
   that rolled a fresh random number every call (so the same nation could be
   strong in the group stage and weak in the final), a one line qualification
   coin flip, and a simulateWorldCup that returned the moment the player's
   nation went out, which meant nobody ever lifted the trophy in the seasons
   you did not reach the final. All of it is replaced by a real four year
   cycle with verified formats, a qualifying campaign you can fail and a
   squad you can be dropped from. See src/lib/soccerInternational.ts.

   WorldCupResult and WCMatch stay as types because a save written before this
   round can still be sitting on one. simulateWorldCup is gone.
*/

/* ─── International call-up check ─── */
function shouldGetCallUp(state: CareerState): boolean {
  if (state.intStats.isRetired) return false;
  if (state.age < 18 || state.age > 33) return false;
  const threshold = state.currentClubTier <= 2 ? 70 : 72;
  return state.overall >= threshold;
}

/** Everything the international code needs to know about the player. */
function playerFormOf(state: CareerState): PlayerForm {
  const last = state.seasons[state.seasons.length - 1];
  return {
    overall: state.overall,
    position: state.position,
    lastRating: last?.rating ?? 6.8,
    lastGoals: last?.goals ?? 0,
    age: state.age,
    isCaptain: state.intStats.isCaptain,
  };
}

/* ─── International season stats ─── */
function generateIntSeasonStats(state: CareerState, year: number): { intApps: number; intGoals: number; intAssists: number; intRating: number; tournament: string | null; tournamentResult: string | null } {
  if (!state.internationalCareer || state.intStats.isRetired) {
    return { intApps: 0, intGoals: 0, intAssists: 0, intRating: 0, tournament: null, tournamentResult: null };
  }
  /* Friendlies and qualifiers. The tournament itself is simulated separately
     and adds its own caps on top, so this no longer invents a continental
     championship result out of a random number.

     Round 124: these caps are earned, not automatic. Before this round, one
     call-up at 18 meant five to nine caps EVERY year until you retired, so an
     average career finished on 111 caps whether the manager rated you or not.
     A player who cannot get into the squad does not get called up for the
     friendlies either. */
  const form = playerFormOf(state);
  if (!pickSquad(state.nationality, form).called) {
    return { intApps: 0, intGoals: 0, intAssists: 0, intRating: 0, tournament: null, tournamentResult: null };
  }
  const apps = offYearCaps(form);
  const goals = calcGoals(state.position, apps);
  const assists = calcAssists(state.position, apps);
  const rating = clamp(parseFloat((6.5 + (state.overall - 72) * 0.06 + (Math.random() - 0.3) * 1.0).toFixed(1)), 4.0, 10.0);
  return { intApps: apps, intGoals: goals, intAssists: assists, intRating: rating, tournament: null, tournamentResult: null };
}


/* ─── Round 124: one international summer ───

   Called every tournament year, ALWAYS. If the player has no international
   career the tournament still runs and still crowns a champion, exactly the
   way the Champions League bracket in Club Manager finishes without you.
   Three things can go wrong for the player and all three are real football:
   the country misses out, the manager leaves you at home, or you go and lose.
*/
function runTournamentSummer(s: CareerState, season: SeasonRecord, year: number): void {
  const fmt = tournamentForYear(s.nationality, year);
  if (!fmt) return;
  const eligible = s.internationalCareer && !s.intStats.isRetired && !s.retired;
  const t = runInternationalSummer(s.nationality, year, eligible ? playerFormOf(s) : null);
  if (!t) return;

  s.lastTournament = t;
  s.intlHistory = [...(s.intlHistory ?? []), toHistoryEntry(t, eligible)];
  season.tournament = t.name;
  season.tournamentResult = eligible ? t.myResult : null;

  // The champion is announced whether you were there or not.
  if (t.champion === s.nationality && !eligible) {
    s.events.push(`🏆 ${s.nationality} won the ${t.name} without you.`);
  } else if (t.champion !== s.nationality) {
    s.events.push(`🌍 ${t.champion} won the ${t.name}.`);
  }

  if (!eligible) return;
  // Only show the screen to a player the tournament actually concerns.
  s.pendingTournament = t;

  if (!t.qualified) {
    s.intStats = {
      ...s.intStats,
      failedQualifications: (s.intStats.failedQualifications ?? 0) + 1,
    };
    s.events.push(`😞 ${s.nationality} did not qualify for the ${t.name}. Your summer is free.`);
    s.morale = clamp(s.morale - 8, 0, 100);
    return;
  }

  if (!t.squad?.called) {
    s.intStats = { ...s.intStats, squadSnubs: (s.intStats.squadSnubs ?? 0) + 1 };
    s.events.push(`📋 Left out of the ${s.nationality} squad for the ${t.name}. You watch it at home.`);
    s.morale = clamp(s.morale - 12, 0, 100);
    return;
  }

  // You are in it.
  const isWC = t.kind === "World Cup";
  s.intStats = {
    ...s.intStats,
    caps: s.intStats.caps + t.playerApps,
    goals: s.intStats.goals + t.playerGoals,
    assists: s.intStats.assists + t.playerAssists,
    tournaments: s.intStats.tournaments + 1,
    worldCups: s.intStats.worldCups + (isWC ? 1 : 0),
    continentals: s.intStats.continentals + (isWC ? 0 : 1),
  };
  season.intApps += t.playerApps;
  season.intGoals += t.playerGoals;
  season.intAssists += t.playerAssists;

  if (t.myResult === "Winner") {
    if (isWC) {
      s.intStats = { ...s.intStats, worldCupWins: s.intStats.worldCupWins + 1 };
      season.worldCup = true;
      s.events.push(`🏆 WORLD CUP WINNER with ${s.nationality}!`);
    } else {
      s.intStats = { ...s.intStats, continentalWins: s.intStats.continentalWins + 1 };
      season.continentalCup = true;
      s.events.push(`🏆 Won the ${t.name} with ${s.nationality}!`);
    }
    s.popularity = clamp(s.popularity + (isWC ? 20 : 12), 0, 100);
    s.morale = clamp(s.morale + 15, 0, 100);
  } else if (t.myResult === "Runner-up") {
    s.events.push(`🥈 Lost the ${t.name} final with ${s.nationality}.`);
    s.morale = clamp(s.morale - 5, 0, 100);
  }

  if (t.bestPlayer) {
    s.events.push(`🌟 Named Best Player of the ${t.name}!`);
    s.awards = [...s.awards, { year, name: `${t.short} Best Player`, emoji: "🌟" }];
  }
  if (t.goldenBoot) {
    s.awards = [...s.awards, { year, name: `${t.short} Golden Boot`, emoji: "👟" }];
    s.events.push(`👟 Won the ${t.name} Golden Boot with ${t.playerGoals} goals!`);
  }
}

/* ─── Advance pro season ─── */
export function advanceProSeason(prev: CareerState, clubs: ClubData[]): CareerState {
  const s = repairCareer({ ...prev }); s.age += 1; s.events = [];
  receivePhoneTexts(s, "pro");
  // Reset social media action for new season
  s.socialMediaActionUsedThisSeason = false;
  // Apply focus boost from "stay off social media" last season
  if (s.socialMediaFocusBoost) {
    for (const k of ["pace", "shooting", "passing", "dribbling", "defending", "physical", "reflexes"] as const) {
      (s as any)[k] = clamp((s as any)[k] + 2, 20, 99);
    }
    s.socialMediaFocusBoost = false;
    s.events.push("🧘 Social media detox paid off: +2 to all stats!");
  }

  // Match fix ban, skip season
  if (s.matchFixBanned > 0) {
    s.matchFixBanned -= 1;
    s.events.push(`🚫 Serving match-fixing ban (${s.matchFixBanned > 0 ? s.matchFixBanned + " season(s) remaining" : "ban lifted!"})`);
    if (s.matchFixBanned > 0) {
      // Skip season entirely, add empty record
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

  // ── Round 54: doing time. Prison eats the season whole. ──
  if ((s.prisonSeasons ?? 0) > 0) {
    s.prisonSeasons = (s.prisonSeasons ?? 0) - 1;
    // A year inside rots the body faster than any bench
    for (const k of ["pace", "shooting", "passing", "dribbling", "defending", "physical", "reflexes"] as const) {
      (s as any)[k] = clamp((s as any)[k] - rand(3, 5), 20, 99);
    }
    s.overall = calcOverall(s, s.position);
    s.marketValue = calcMarketValue(s.overall, s.age, s.position);
    s.morale = clamp(s.morale - 15, 0, 100);
    s.events.push(s.prisonSeasons > 0
      ? `⛓️ A year served. ${s.prisonSeasons} more to go. You run laps of the yard to stay sharp.`
      : "⛓️ RELEASED. You walk out to forty cameras and one loyal agent. The comeback starts now.");
    const lastYearP = s.seasons[s.seasons.length - 1].year;
    s.seasons = [...s.seasons, {
      year: lastYearP + 1, age: s.age, club: "PRISON", clubCountry: "", clubTier: 99,
      apps: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0, rating: 0,
      leagueTitle: false, domesticCup: false, championsLeague: false, worldCup: false, ballonDor: false, ballonDorRank: null, type: "playing",
      intApps: 0, intGoals: 0, intAssists: 0, intRating: 0, tournament: null, tournamentResult: null,
    }];
    s.pendingSummary = s.seasons[s.seasons.length - 1];
    s.phase = "season_summary";
    simulateSeasonFinances(s, s.pendingSummary);
    return s;
  }

  // ── Round 54: the corruption thermostat. Dirty money wants washing, heat
  // wants cooling, and investigators want promotions. ──
  const dirtyNow = s.dirtyMoney ?? 0;
  if (dirtyNow > 0) {
    let washCapacity = 0;
    if (s.purchasedItems.includes("shady_shell_carwash")) washCapacity += 2;
    if (s.purchasedItems.includes("shady_nightclub")) washCapacity += 4;
    if (s.purchasedItems.includes("shady_crypto_mixer")) washCapacity += 1.5;
    if (washCapacity > 0) {
      const washed = Math.min(dirtyNow, washCapacity);
      s.dirtyMoney = Math.round((dirtyNow - washed) * 100) / 100;
      s.netWorth = Math.round((s.netWorth + washed) * 100) / 100;
      s.events.push(`🧼 The businesses had a "great year": €${washed.toFixed(1)}M of quiet money is now clean.`);
    }
    if ((s.dirtyMoney ?? 0) > 0) {
      s.corruptionHeat = clamp((s.corruptionHeat ?? 0) + 6, 0, 100);
      s.events.push(`💼 €${(s.dirtyMoney ?? 0).toFixed(1)}M still sits in the duffel bags. Money that loud attracts ears.`);
    }
  } else if ((s.corruptionHeat ?? 0) > 0) {
    s.corruptionHeat = clamp((s.corruptionHeat ?? 0) - 8, 0, 100);
  }

  const heat = s.corruptionHeat ?? 0;
  if (heat >= 90 && Math.random() < 0.5) {
    // The trial. It was always going to end like this.
    const confiscated = Math.round(((s.dirtyMoney ?? 0) + s.netWorth * 0.3) * 100) / 100;
    s.dirtyMoney = 0;
    s.netWorth = Math.round(s.netWorth * 0.7 * 100) / 100;
    s.prisonSeasons = 1;
    s.corruptionHeat = 20;
    s.popularity = clamp(s.popularity - 35, 0, 100);
    s.integrityBonus -= 30;
    s.events.push(`⚖️ CONVICTED. Fraud, bribery, and one very confused judge reading out the submarine receipts. €${confiscated.toFixed(1)}M seized, 1 year inside.`);
    s.pendingNews = [{
      newspaper: "The Daily Sport", type: "negative",
      headline: `GUILTY: ${s.playerName} Going To Prison`,
      body: `The fall is complete. ${s.playerName} was convicted on all counts after prosecutors traced years of unexplained income. The courtroom sketch artist gave them enormous sad eyes and the internet made it a meme within the hour.`,
    }];
    s.phase = "newspaper";
    return s;
  } else if (heat >= 70 && Math.random() < 0.35) {
    // The dawn raid: painful, survivable, very public
    const fine = Math.round((s.netWorth * 0.2 + (s.dirtyMoney ?? 0) * 0.5) * 100) / 100;
    s.netWorth = Math.round((s.netWorth - fine) * 100) / 100;
    s.dirtyMoney = Math.round(((s.dirtyMoney ?? 0) * 0.5) * 100) / 100;
    s.corruptionHeat = clamp(heat - 30, 0, 100);
    s.popularity = clamp(s.popularity - 15, 0, 100);
    s.integrityBonus -= 10;
    s.events.push(`🚔 DAWN RAID. Financial crimes unit, seven vans, one very smug spokesperson. Settled for €${fine.toFixed(1)}M to avoid charges.`);
  }

  // PED tracking, check for failed test
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
    const reason = s.age >= 45 ? "👋 Hung up the boots at 45. An incredible career!" : "👋 Body can no longer keep up. Forced retirement";
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
  
  // Retirement suggestion, when overall drops 10+ from peak OR drops to 75 or below (age 30+)
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
  // Injury report, named injuries that actually cost matches
  if (season.injury) {
    s.events.push(`🚑 Injury: ${season.injury}, out ${season.injuryWeeks} weeks, missed matches`);
    if (season.injurySevere) {
      s.pace = clamp(s.pace - 2, 20, 99);
      s.physical = clamp(s.physical - 1, 20, 99);
      s.morale = clamp(s.morale - 10, 0, 100);
      s.events.push("🏥 Long rehab took a toll: Pace -2, Physical -1");
    }
  }
  // Apply stat boosts from previous season's events
  for (const [key, val] of Object.entries(s.statBoostNextSeason)) {
    const k = key as keyof typeof s.statBoostNextSeason;
    if (k in s) (s as any)[k] = clamp((s as any)[k] + (val || 0), 20, 99);
  }
  s.statBoostNextSeason = {};
  // Round 78: growth respects the rolled potential (legacy default generous).
  const potWall = effectivePotential(s);
  // Round 96: the season you just played decides how much you improve.
  const dev = developmentRate(s);
  s.pace = growStat(s.pace, s.age, false, true, s.primeType, potWall, s.overall, dev);
  s.shooting = growStat(s.shooting, s.age, false, false, s.primeType, potWall, s.overall, dev);
  s.passing = growStat(s.passing, s.age, false, false, s.primeType, potWall, s.overall, dev);
  s.dribbling = growStat(s.dribbling, s.age, false, false, s.primeType, potWall, s.overall, dev);
  s.defending = growStat(s.defending, s.age, false, false, s.primeType, potWall, s.overall, dev);
  s.physical = growStat(s.physical, s.age, false, false, s.primeType, potWall, s.overall, dev);
  // Personal trainer: +1 physical per season
  if (s.purchasedItems.includes("personal_trainer")) {
    s.physical = clamp(s.physical + 1, 20, 99);
  }
  s.reflexes = growStat(s.reflexes, s.age, false, false, s.primeType, potWall, s.overall, dev);
  s.overall = calcOverall(s, s.position);
  s.contractYearsLeft = Math.max(0, s.contractYearsLeft - 1);
  s.marketValue = calcMarketValue(s.overall, s.age, s.position, s.socialMediaFollowers);

  // International career check, first call-up
  if (!s.internationalCareer && !s.intStats.isRetired && shouldGetCallUp(s)) {
    s.internationalCareer = true;
    s.intStats = { ...s.intStats, debutYear: season.year, debutAge: s.age };
    // Don't set phase yet, show in season summary, debut screen comes after
  }

  // International season stats
  const lastYear = s.seasons.length > 0 ? s.seasons[s.seasons.length - 1].year : season.year - 1;
  const thisYear = lastYear + 1;
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
    // Round 124: the continental championship used to be decided right here
    // by one call to Math.random, with no opponents and no bracket. It is a
    // real tournament now, run by runTournamentSummer below.
    // 100 caps milestone
    const prevCaps = s.intStats.caps - intSeason.intApps;
    if (s.intStats.caps >= 100 && prevCaps < 100) {
      s.events.push(`🎖️ INTERNATIONAL LEGEND: reached 100 caps for ${s.nationality}!`);
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
    s.rival = simulateRivalSeason(s.rival, clubs, thisYear);
  }
  
  // Rivalry event (1 per year)
  if (s.rival && !s.rival.retired && Math.random() < 0.5) {
    const rivalEvents = getRivalryEvents(s).filter(e => e.id !== s.lastRivalryEventId);
    if (rivalEvents.length > 0) {
      s.pendingRivalryEvent = pick(rivalEvents);
    }
  }
  // Rival just retired, show retirement event
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

  // Awards: Player of the Month, simulate month-by-month based on goals
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

  // --- NEW AWARDS ---

  // Puskás Award (best goal of the year), random chance for high-performing attackers
  if (season.goals >= 15 && s.overall >= 80 && Math.random() < 0.08) {
    s.awards = [...s.awards, { year: thisYear, name: "Puskás Award", emoji: "🎯" }];
    s.events.push(`🎯 Won the Puskás Award for Goal of the Year!`);
  }

  // Golden Boot (top league scorer), must be top scorer caliber
  if (season.goals >= 25 && s.currentClubTier <= 2 && Math.random() < 0.3) {
    s.awards = [...s.awards, { year: thisYear, name: "Golden Boot", emoji: "👟" }];
    s.events.push(`👟 Won the League Golden Boot with ${season.goals} goals!`);
  }

  // Golden Glove (goalkeeper of the year), GK only
  if (s.position === "GK" && season.cleanSheets >= 12 && season.rating >= 7.5 && Math.random() < 0.3) {
    s.awards = [...s.awards, { year: thisYear, name: "Golden Glove", emoji: "🧤" }];
    s.events.push(`🧤 Won the Golden Glove Award!`);
  }

  // Young Player of the Year, under 23 only
  if (s.age < 23 && season.rating >= 7.5 && s.overall >= 75 && Math.random() < 0.2) {
    s.awards = [...s.awards, { year: thisYear, name: "Young Player of the Year", emoji: "⭐" }];
    s.events.push(`⭐ Named Young Player of the Year!`);
    s.popularity = clamp(s.popularity + 5, 0, 100);
  }

  // UEFA Player of the Year, elite performances in European competition
  if (season.championsLeague && season.rating >= 8.0 && s.overall >= 85 && Math.random() < 0.25) {
    s.awards = [...s.awards, { year: thisYear, name: "UEFA Player of the Year", emoji: "🇪🇺" }];
    s.events.push(`🇪🇺 Named UEFA Player of the Year!`);
  }

  // Comeback Player of the Year, significant OVR recovery after a dip
  const prevSeasons = s.seasons.filter(ss => ss.type === "playing");
  if (prevSeasons.length >= 2) {
    const prevRating = prevSeasons[prevSeasons.length - 1]?.rating || 0;
    if (prevRating <= 6.5 && season.rating >= 7.8 && Math.random() < 0.3) {
      s.awards = [...s.awards, { year: thisYear, name: "Comeback Player of the Year", emoji: "💪" }];
      s.events.push(`💪 Won Comeback Player of the Year!`);
    }
  }

  // Club Legend status, 300+ appearances for one club
  const clubAppsMap: Record<string, number> = {};
  for (const ss of s.seasons) {
    if (ss.type === "playing") clubAppsMap[ss.club] = (clubAppsMap[ss.club] || 0) + ss.apps;
  }
  clubAppsMap[s.currentClub] = (clubAppsMap[s.currentClub] || 0) + season.apps;
  const alreadyClubLegend = s.awards.some(a => a.name === "Club Legend");
  if (!alreadyClubLegend && clubAppsMap[s.currentClub] >= 300) {
    s.awards = [...s.awards, { year: thisYear, name: "Club Legend", emoji: "🏛️" }];
    s.events.push(`🏛️ Granted Club Legend status at ${s.currentClub}! (300+ appearances)`);
    s.popularity = clamp(s.popularity + 15, 0, 100);
  }

  // All Time Top Scorer for country, international goals record
  const INT_RECORDS: Record<string, number> = {
    Brazil: 77, France: 57, Argentina: 106, Germany: 71, Spain: 29, England: 66,
    Portugal: 135, Netherlands: 50, Italy: 35, Belgium: 68, Croatia: 35, Uruguay: 36,
    Norway: 33, Egypt: 51, Colombia: 25, Nigeria: 28, Senegal: 35, Japan: 55, "South Korea": 36,
  };
  if (s.internationalCareer) {
    const intGoals = s.intStats.goals;
    const record = INT_RECORDS[s.nationality] || 40;
    const alreadyTopScorer = s.awards.some(a => a.name === "All Time Top Scorer");
    if (!alreadyTopScorer && intGoals > record) {
      s.awards = [...s.awards, { year: thisYear, name: "All Time Top Scorer", emoji: "👑" }];
      s.events.push(`👑 Became ${s.nationality}'s All Time Top International Scorer with ${intGoals} goals!`);
    }
  }

  // Fair Play Award, good conduct season (low cards, high rating)
  if (season.yellowCards <= 1 && season.redCards === 0 && season.rating >= 7.5 && season.apps >= 25 && Math.random() < 0.1) {
    const alreadyFairPlayThisYear = s.awards.some(a => a.name === "Fair Play Award" && a.year === thisYear);
    if (!alreadyFairPlayThisYear) {
      s.awards = [...s.awards, { year: thisYear, name: "Fair Play Award", emoji: "🤝" }];
      s.events.push(`🤝 Won the Fair Play Award for exemplary conduct!`);
    }
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

  /* ─── Round 124: the international summer ───
     Runs every tournament year whether the player is involved or not, so the
     World Cup and the continental championships crown a winner across a whole
     career even if you never get a cap. */
  runTournamentSummer(s, season, thisYear);

  /* ─── Round 130: the rest of the football world has a season too ───
     Runs BEFORE the Ballon d'Or on purpose. It decides who won each league,
     who won Europe and which of the era's names changed clubs, and the Ballon
     d'Or below reads the same answers, so the phone's sports feed and the
     awards screen can never contradict each other. */
  const world = worldSeasonTick(s, {
    year: thisYear,
    playerLeagueTitle: season.leagueTitle,
    playerUcl: season.championsLeague,
  });

  // Ballon d'Or calculation
  const bdorResult = calculateBallonDor(s, season, thisYear, world);
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
      s.bdorSnubFuel = true; // the snub storyline can fire next season
    }
  }

  // International debut event
  if (s.intStats.debutYear === thisYear) {
    s.events.push(`🇺🇳 First international call-up for ${s.nationality}!`);
  }

  /* Round 131: last thing that happens, because it needs the Champions League,
     the Ballon d'Or and the league title, all of which are decided above. */
  pushCeiling(s, season);

  if (s.events.length === 0) s.events.push(`⚽ Solid season at ${s.currentClub}`);
  return s;
}

/* ─── Round 131: breaking your own ceiling ───

   His note: "For your starting overall and ur potential cap. I would say u
   shouldn't have a cap and you can go past it but u gotta do a lot of things."

   So the rolled ceiling is soft now, and this is the only door through it.
   Three things have to be true in the same season, and then it has to happen
   again the season after, because one enormous year is a purple patch and two
   in a row is a player who has genuinely outgrown what he was scouted as.

   1. PRESSING. You are within two of your own ceiling already. A player with
      fifteen points of room left has somewhere to go and does not need this.
   2. ELITE. Thirty games and a 7.5 season rating. You cannot do it from the
      bench and you cannot do it having a quiet year.
   3. DECORATED. A league title, a Champions League, a World Cup, a Ballon
      d'Or, thirty goals or an 8.2 rated season. Something that goes on the
      wall.

   Miss any one of them and the streak resets to zero, so drifting cannot get
   you there no matter how many seasons you play. 99 is a hard wall and this
   never opens it. */
function pushCeiling(s: CareerState, season: SeasonRecord): void {
  const ceiling = effectivePotential(s);
  const elite = (season.rating ?? 0) >= 7.5 && (season.apps ?? 0) >= 30;
  /* The level matters, and this is the bit the harness caught. Season rating
     is measured against the club's own average, so a 72 overall centre back
     dropping into the fourth tier rates 8.5 every year and wins the odd
     divisional title without ever being tested by anything. Left as it was,
     one drifting career in two hundred and fifty quietly bought a ceiling
     point off the back of that, which is precisely the thing this was written
     to make impossible. So everything except the three trophies nobody can win
     by accident has to happen in the top two tiers. */
  const topLevel = (season.clubTier ?? 4) <= 2;
  const decorated = !!(season.championsLeague || season.worldCup || season.ballonDor)
    || (topLevel && (
      !!season.leagueTitle
      || (season.goals ?? 0) >= 30
      || (season.rating ?? 0) >= 8.2
    ));
  const pressing = s.overall >= ceiling - 2;

  if (elite && decorated) s.eliteStreak = (s.eliteStreak ?? 0) + 1;
  else { s.eliteStreak = 0; return; }

  if (!pressing || ceiling >= 99) return;
  if ((s.eliteStreak ?? 0) < 2) return;

  s.potentialEarned = (s.potentialEarned ?? 0) + 1;
  s.events.push("🔓 Another season like that at your ceiling. The coaches say there is more in you than anybody thought");
}

/* ─── Newspaper Article Generation ─── */
const NEWSPAPERS = ["The Daily Sport", "Football Weekly", "The Global Game", "Soccer Times", "The Beautiful Game Report", "The Daily Nutmeg", "El Golazo", "Tackle Weekly", "The Sunday Volley", "90+4 Magazine"];

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
        body: `After ${seasonsAtClub} seasons of dedication, the ${club} faithful have spoken: ${name} is their Player of the Year. The bond between player and fans has become something truly special.` }) },
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
    // ── Round 54: twenty more stories. The papers now cover your snubs, your
    // scandals, your shopping and your softest moments. ──
    { weight: 1.4, check: () => s.bdorSnubFuel === true && season.goals >= 25,
      gen: () => ({ newspaper: pick(NEWSPAPERS), type: "negative",
        headline: `ROBBED! Fans Fume As ${name} Misses Out On Ballon d'Or AGAIN`,
        body: `${season.goals} goals and still no golden ball. Social media has already produced 4,000 conspiracy charts, a petition, and one very angry podcast episode. "The voters watch highlights on mute," wrote one fan. Hard to argue.` }) },
    { weight: 1.2, check: () => (s.corruptionHeat ?? 0) >= 50,
      gen: () => ({ newspaper: pick(NEWSPAPERS), type: "negative",
        headline: `WHERE DOES THE MONEY COME FROM? Questions Mount Over ${name}'s Empire`,
        body: `An investigative series has begun sniffing around ${name}'s business affairs. A car wash that outsells the national chain. A nightclub with no music license. Nothing proven, the lawyers stress. Yet.` }) },
    { weight: 1, check: () => (s.dirtyMoney ?? 0) > 3,
      gen: () => ({ newspaper: pick(NEWSPAPERS), type: "negative",
        headline: `THE DUFFEL BAG FILES: Mystery Cash Linked To ${name}'s Circle`,
        body: `A leaked memo describes "sports bags of unusual weight" moving through ${name}'s entourage. The player's spokesperson called the story "gym equipment." The gym in question could not be located.` }) },
    { weight: 1.3, check: () => s.seasons.filter(ss => ss.club === "PRISON").length > 0 && season.apps > 0 && season.rating >= 7.0,
      gen: () => ({ newspaper: pick(NEWSPAPERS), type: "positive",
        headline: `REDEMPTION: ${name} Is Officially BACK`,
        body: `From a cell to ${season.goals} goals. Whatever you think of the past, ${name}'s comeback season at ${club} is one of the great sporting redemption stories. The away fans still sing about it. The home fans sing louder.` }) },
    { weight: 1, check: () => s.purchasedItems.includes("flex_tiger"),
      gen: () => ({ newspaper: pick(NEWSPAPERS), type: "negative",
        headline: `${name}'s Pet Tiger Escapes Garden, Delays Training`,
        body: `Butters the tiger was found napping in a neighbour's gazebo on Tuesday. Animal control described the situation as "genuinely outside our training." ${name} apologised and bought the street lunch. The tiger remains extremely large.` }) },
    { weight: 0.8, check: () => s.purchasedItems.includes("superyacht") || s.purchasedItems.includes("private_island"),
      gen: () => ({ newspaper: pick(NEWSPAPERS), type: "negative",
        headline: `OUT OF TOUCH? ${name}'s Latest Purchase Raises Eyebrows`,
        body: `As ticket prices climb, photos of ${name}'s newest toy did the rounds this week. A club source shrugged: "They scored ${season.goals} this season, they can buy a moon." Fans remain split roughly 50-50 between outrage and requests for a ride.` }) },
    { weight: 1, check: () => s.family.children > 0 && season.goals >= 15,
      gen: () => ({ newspaper: pick(NEWSPAPERS), type: "positive",
        headline: `DAD GOALS: ${name} Celebrates Every Strike With The Kids In The Stands`,
        body: `The now-famous routine, goal, run to the family section, ${s.family.children > 1 ? "high-five the kids" : "lift the little one"}, has become the league's most wholesome tradition. Cameras cut to the family before the ball even hits the net now.` }) },
    { weight: 0.9, check: () => s.personality === "showman" && s.socialMediaFollowers >= 5,
      gen: () => ({ newspaper: pick(NEWSPAPERS), type: "positive",
        headline: `BOX OFFICE: Every ${name} Match Is A Show Now`,
        body: `Nutmegs, no-look passes, a celebration catalogue deeper than most players' highlight reels. Purists grumble. Everyone else buys tickets. "I play football," ${name} shrugged, "the theatre is free."` }) },
    { weight: 0.9, check: () => s.personality === "iceman" && season.rating >= 7.5,
      gen: () => ({ newspaper: pick(NEWSPAPERS), type: "positive",
        headline: `THE MACHINE: ${name} Never Celebrates, Never Blinks, Never Misses`,
        body: `Another ${season.goals}-goal season delivered with the emotional range of a filing cabinet. Teammates say they have seen ${name} smile twice. Both times were at tactics boards.` }) },
    { weight: 0.9, check: () => s.personality === "hothead" && (season.yellowCards >= 8 || season.redCards >= 1),
      gen: () => ({ newspaper: pick(NEWSPAPERS), type: "negative",
        headline: `TICKING TIME BOMB: ${name} Walks Disciplinary Tightrope AGAIN`,
        body: `${season.yellowCards} yellows${season.redCards > 0 ? ` and ${season.redCards} red` : ""} this season. The talent is undeniable, the temper is unmissable. The league's referees have reportedly started a group chat.` }) },
    { weight: 1, check: () => s.academyClubName !== undefined && club === s.academyClubName && seasonsAtClub >= 3 && ovr >= 80,
      gen: () => ({ newspaper: pick(NEWSPAPERS), type: "positive",
        headline: `ONE OF OUR OWN: ${name} Is ${club}'s Greatest Homegrown Story`,
        body: `From the academy pitches to ${season.goals} goals a season, ${name} never needed to leave to become world class. The club shop cannot print the name fast enough. There are babies in this town named after a ${pos}.` }) },
    { weight: 0.8, check: () => season.goals >= 30 && s.age <= 21,
      gen: () => ({ newspaper: pick(NEWSPAPERS), type: "positive",
        headline: `WONDERKID ALERT: ${s.age}-Year-Old ${name} Breaks The Scouting Apps`,
        body: `${season.goals} goals at ${s.age}. Scouts from every superclub attended the last home game, and one reportedly cried. Comparisons to legends are premature, say pundits, before making seven of them in the same sentence.` }) },
    { weight: 0.7, check: () => s.morale >= 85 && season.rating >= 7.3,
      gen: () => ({ newspaper: pick(NEWSPAPERS), type: "positive",
        headline: `HAPPIEST MAN IN FOOTBALL: The Secret To ${name}'s Golden Season`,
        body: `Sources close to the player credit "family, sleep, and turning the phone off." Whatever it is, it produced a ${season.rating.toFixed(1)} average rating and the widest grin in the league.` }) },
    { weight: 0.7, check: () => s.weeklyWage >= 400000,
      gen: () => ({ newspaper: pick(NEWSPAPERS), type: "transfer",
        headline: `${formatWage(s.weeklyWage)} A WEEK: Inside ${name}'s Monster Contract`,
        body: `Leaked figures put ${name} among the best paid players alive. The club insists the deal "reflects performance." The performance this season: ${season.goals} goals, ${season.assists} assists. The accountants have stopped complaining.` }) },
    { weight: 0.6, check: () => s.intStats.isCaptain && (season.intApps || 0) > 0,
      gen: () => ({ newspaper: pick(NEWSPAPERS), type: "positive",
        headline: `LEADER OF THE NATION: ${name} Wears The ${s.nationality} Armband Like Armour`,
        body: `Since taking the captaincy, ${name} has turned the national side into a family business. Teammates describe the pre-match speeches as "somewhere between a sermon and a heist briefing."` }) },
    { weight: 0.6, check: () => s.purchasedItems.includes("fam_parents_house"),
      gen: () => ({ newspaper: pick(NEWSPAPERS), type: "positive",
        headline: `THE PROMISE: ${name} Bought Mum The House, And The Video Broke The Internet`,
        body: `The clip of ${name}'s mother opening her new front door has passed 40 million views. "I told her when I was nine," the player said, and that was all anyone needed. Not a dry eye in the press room.` }) },
    { weight: 0.6, check: () => season.cleanSheets >= 15 && pos === "GK",
      gen: () => ({ newspaper: pick(NEWSPAPERS), type: "positive",
        headline: `THE WALL: ${name} Posts ${season.cleanSheets} Clean Sheets, Strikers In Therapy`,
        body: `Opposition forwards have begun passing backwards on sight of ${name}. ${season.cleanSheets} shutouts this season, and at least three saves that appeared to violate physics. The league is investigating the goalkeeper for witchcraft. (It is not.)` }) },
    { weight: 0.6, check: () => s.rival !== null && !s.rival.retired && (s.rivalryIntensity ?? 0) >= 60,
      gen: () => ({ newspaper: pick(NEWSPAPERS), type: "negative",
        headline: `THE FEUD: ${name} vs ${s.rival!.name} Is Football's Coldest War`,
        body: `No handshake. No eye contact. One suspiciously timed unfollow. The rivalry between ${name} and ${s.rival!.name} now has its own fan wikis, timeline threads, and at least one university thesis.` }) },
    { weight: 0.5, check: () => s.lifestyleLevel === "Billionaire" || s.netWorth >= 500,
      gen: () => ({ newspaper: pick(NEWSPAPERS), type: "milestone",
        headline: `THE BILLION CLUB: ${name} Is Officially Richer Than The Club That Pays Them`,
        body: `Forbes confirmed it this week: ${name}'s empire, boots, brands, buildings and businesses, has crossed into billionaire territory. The club's owner reportedly asked THEM for a loan. It was declined, politely.` }) },
    { weight: 0.5, check: () => s.age >= 36 && season.goals >= 15,
      gen: () => ({ newspaper: pick(NEWSPAPERS), type: "positive",
        headline: `AGELESS: ${s.age}-Year-Old ${name} Refuses To Read The Calendar`,
        body: `${season.goals} goals at ${s.age}. Nutritionists want the meal plan, scientists want the bloodwork, defenders want it to stop. "I will retire when it stops being fun," ${name} smiled, ominously, at everyone under 30.` }) },
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
          apply: s => { s.morale = clamp(s.morale + 10, 0, 100); s.events = [...s.events, "⚽ Scored a derby winner, stayed humble"]; return s; } },
      ] },
    { id: 2, emoji: "🎙️", title: "Manager Praise", description: "A top manager says in an interview you are one of the best players in your position in the world.",
      category: "positive", choices: [
        { label: "Use it as motivation", emoji: "💪", color: "bg-emerald-600", consequence: "Market value +€5M, All stats +2 next season",
          apply: s => { s.marketValue += 5; s.statBoostNextSeason = { pace: 2, shooting: 2, passing: 2, dribbling: 2, defending: 2, physical: 2 }; s.events = [...s.events, "🎙️ Top manager praised you, confidence boosted"]; return s; } },
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
        { label: "Sign with Vortex", emoji: "✔️", color: "bg-emerald-600", consequence: "+€2M/year income",
          apply: s => { s.sponsorDeal = "Vortex"; s.totalEarnings += 2; s.events = [...s.events, "👟 Signed the Vortex boot deal"]; return s; } },
        { label: "Sign with Kinetiq", emoji: "✔️", color: "bg-blue-600", consequence: "+€1.5M/year income",
          apply: s => { s.sponsorDeal = "Kinetiq"; s.totalEarnings += 1.5; s.events = [...s.events, "👟 Signed the Kinetiq boot deal"]; return s; } },
        { label: "Reject all offers", emoji: "✋", color: "bg-muted", consequence: "No deal, stay independent",
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
        { label: "Appeal the decision", emoji: "⚖️", color: "bg-amber-600", consequence: "Appeal submitted, result in 3-5 days",
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
          apply: s => { s.marketValue = Math.max(0.1, s.marketValue - 1); s.popularity = clamp(s.popularity + 5, 0, 100); s.events = [...s.events, "💉 Fought doping accusation publicly, cleared"]; return s; } },
        { label: "Stay silent, let lawyers handle it", emoji: "🤫", color: "bg-muted", consequence: "Market value -€2M",
          apply: s => { s.marketValue = Math.max(0.1, s.marketValue - 2); s.events = [...s.events, "💉 Doping accusation, stayed silent"]; return s; } },
        { label: "Hold press conference", emoji: "📺", color: "bg-emerald-600", consequence: "Market value +€1M, popularity +10",
          apply: s => { s.marketValue += 1; s.popularity = clamp(s.popularity + 10, 0, 100); s.events = [...s.events, "💉 Press conference, cleared name completely"]; return s; } },
      ] },
    { id: 11, emoji: "🏥", title: "Serious Injury!", description: "You pick up a serious hamstring injury.",
      category: "negative", choices: [
        { label: "Focus on recovery", emoji: "🏥", color: "bg-red-600", consequence: "Pace -2 permanently, miss apps next season",
          apply: s => { s.pace = clamp(s.pace - 2, 20, 99); s.morale = clamp(s.morale - 10, 0, 100); s.events = [...s.events, "🏥 Serious hamstring injury: Pace -2"]; return s; } },
        { label: "Rush back early", emoji: "⚡", color: "bg-amber-600", consequence: "Pace -1 but 30% chance of reinjury (Pace -3)",
          apply: s => { if (Math.random() < 0.3) { s.pace = clamp(s.pace - 3, 20, 99); s.events = [...s.events, "🏥 Rushed back, reinjured! Pace -3"]; } else { s.pace = clamp(s.pace - 1, 20, 99); s.events = [...s.events, "🏥 Rushed back successfully: Pace -1"]; } return s; } },
      ] },
    { id: 12, emoji: "👔", title: "New Manager!", description: "Your manager is sacked. The new manager does not rate you.",
      category: "negative", choices: [
        { label: "Prove yourself in training", emoji: "💪", color: "bg-emerald-600", consequence: "Morale -5 but possible stat boost",
          apply: s => { s.morale = clamp(s.morale - 5, 0, 100); s.statBoostNextSeason = { ...s.statBoostNextSeason, physical: (s.statBoostNextSeason.physical || 0) + 1 }; s.events = [...s.events, "👔 New manager, training harder"]; return s; } },
        { label: "Accept reduced role", emoji: "😔", color: "bg-muted", consequence: "Morale -10, fewer appearances",
          apply: s => { s.morale = clamp(s.morale - 10, 0, 100); s.events = [...s.events, "👔 New manager doesn't rate you, reduced role"]; return s; } },
      ] },
    { id: 13, emoji: "📸", title: "Party Scandal!", description: "You are photographed at a party the night before a big match. The media goes wild.",
      category: "negative", choices: [
        { label: "Apologize publicly", emoji: "😔", color: "bg-blue-600", consequence: "Popularity -3, Manager relationship saved",
          apply: s => { s.popularity = clamp(s.popularity - 3, 0, 100); s.events = [...s.events, "📸 Party scandal, apologized publicly"]; return s; } },
        { label: "Deny it", emoji: "🤷", color: "bg-muted", consequence: "50/50: believed or more backlash",
          apply: s => { if (Math.random() < 0.5) { s.events = [...s.events, "📸 Denied party, public believed you"]; } else { s.popularity = clamp(s.popularity - 8, 0, 100); s.events = [...s.events, "📸 Denied party, backlash got worse"]; } return s; } },
        { label: "Laugh it off on social media", emoji: "😂", color: "bg-amber-600", consequence: "Popularity +5 with fans, -5 with manager",
          apply: s => { s.popularity = clamp(s.popularity + 5, 0, 100); s.morale = clamp(s.morale - 5, 0, 100); s.events = [...s.events, "📸 Laughed off party scandal, fans loved it"]; return s; } },
      ] },
    { id: 14, emoji: "😤", title: "Rival Provocation!", description: "A rival player publicly claims he is better than you in a magazine interview.",
      category: "negative", choices: [
        { label: "Let your feet do the talking", emoji: "⚽", color: "bg-emerald-600", consequence: "Motivation boost: all stats +1 next season",
          apply: s => { s.statBoostNextSeason = { pace: 1, shooting: 1, passing: 1, dribbling: 1, defending: 1, physical: 1 }; s.events = [...s.events, "😤 Rival provoked you, used it as motivation"]; return s; } },
        { label: "Fire back in the media", emoji: "🎙️", color: "bg-red-600", consequence: "Popularity +5 but rivalry intensifies",
          apply: s => { s.popularity = clamp(s.popularity + 5, 0, 100); s.events = [...s.events, "😤 Fired back at rival in media"]; return s; } },
      ] },
    { id: 15, emoji: "📋", title: "Dropped!", description: "You are dropped from the starting lineup without explanation.",
      category: "negative", choices: [
        { label: "Demand explanation", emoji: "😠", color: "bg-red-600", consequence: "Morale -5, 50% chance manager explains",
          apply: s => { s.morale = clamp(s.morale - 5, 0, 100); if (Math.random() < 0.5) { s.events = [...s.events, "📋 Demanded explanation, manager understood"]; } else { s.events = [...s.events, "📋 Demanded explanation, relationship worsened"]; } return s; } },
        { label: "Train harder, fight for place", emoji: "💪", color: "bg-emerald-600", consequence: "Physical +1, Morale +5",
          apply: s => { s.physical = clamp(s.physical + 1, 20, 99); s.morale = clamp(s.morale + 5, 0, 100); s.events = [...s.events, "📋 Dropped, trained harder to fight back"]; return s; } },
      ] },
    { id: 16, emoji: "📝", title: "Contract Breakdown!", description: "Contract talks break down. Club offers less than expected.",
      category: "negative", choices: [
        { label: "Accept lower wage, stay loyal", emoji: "🤝", color: "bg-blue-600", consequence: "Wage -15%, Morale +5",
          apply: s => { s.weeklyWage = Math.round(s.weeklyWage * 0.85); s.morale = clamp(s.morale + 5, 0, 100); s.events = [...s.events, "📝 Accepted lower wage, stayed loyal"]; return s; } },
        { label: "Push for more money", emoji: "💰", color: "bg-amber-600", consequence: "50% chance: Wage +20% or relationship damaged",
          apply: s => { if (Math.random() < 0.5) { s.weeklyWage = Math.round(s.weeklyWage * 1.2); s.events = [...s.events, "📝 Pushed for more, got a raise!"]; } else { s.morale = clamp(s.morale - 10, 0, 100); s.events = [...s.events, "📝 Pushed too hard, relationship damaged"]; } return s; } },
        { label: "Walk away when contract expires", emoji: "🚶", color: "bg-red-600", consequence: "Contract not renewed, become free agent sooner",
          apply: s => { s.contractYearsLeft = Math.min(s.contractYearsLeft, 1); s.events = [...s.events, "📝 Walking away, will leave on free"]; return s; } },
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
          apply: s => { s.morale = clamp(s.morale - 5, 0, 100); s.events = [...s.events, "🏆❌ Left out of World Cup, accepted it"]; return s; } },
        { label: "Publicly question manager", emoji: "🎙️", color: "bg-amber-600", consequence: "Popularity +5, International career at risk",
          apply: s => { s.popularity = clamp(s.popularity + 5, 0, 100); s.morale = clamp(s.morale - 10, 0, 100); s.events = [...s.events, "🏆❌ Publicly questioned World Cup snub"]; return s; } },
        { label: "Retire from internationals", emoji: "🚶", color: "bg-red-600", consequence: "International career ends",
          apply: s => { s.internationalCareer = false; s.events = [...s.events, "🏆❌ Retired from international football in protest"]; return s; } },
      ] },
    { id: 20, emoji: "❤️", title: "Love Interest", description: "You meet someone special and get into a relationship.",
      category: "life", choices: [
        { label: "Start dating", emoji: "💕", color: "bg-pink-600", consequence: "Morale +10, Stability boost",
          apply: s => { s.hasRelationship = true; s.morale = clamp(s.morale + 10, 0, 100); s.events = [...s.events, "❤️ Started a relationship"]; return s; } },
        { label: "Focus on football", emoji: "⚽", color: "bg-muted", consequence: "No change, stay focused",
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
          apply: s => { if (Math.random() < 0.5) { s.netWorth += 1; s.investments = [...s.investments, "Restaurant Chain ✅"]; s.events = [...s.events, "💼 Restaurant investment succeeded! +€1M"]; } else { s.netWorth -= 0.5; s.investments = [...s.investments, "Restaurant Chain ❌"]; s.events = [...s.events, "💼 Restaurant investment failed, lost €500k"]; } return s; } },
        { label: "Pass on it", emoji: "✋", color: "bg-muted", consequence: "No risk, no reward",
          apply: s => { s.events = [...s.events, "💼 Passed on restaurant investment"]; return s; } },
      ] },
    { id: 23, emoji: "🏠", title: "Property Opportunity!", description: `Buy a house in ${state.currentClubCountry} for €2M?`,
      category: "life", choices: [
        { label: "Buy it: €2M", emoji: "🏠", color: "bg-emerald-600", consequence: "Property added, Lifestyle upgrade, Morale +5",
          apply: s => { s.netWorth -= 2; s.properties = [...s.properties, `House in ${s.currentClubCountry}`]; s.morale = clamp(s.morale + 5, 0, 100); s.events = [...s.events, "🏠 Bought a property"]; return s; } },
        { label: "Save the money", emoji: "💰", color: "bg-muted", consequence: "Smart financial decision",
          apply: s => { s.events = [...s.events, "🏠 Decided to save money instead"]; return s; } },
      ] },
    { id: 24, emoji: "🌍", title: "Brand Ambassador!", description: "You are offered a role as brand ambassador for your country.",
      category: "life", choices: [
        { label: "Accept the role", emoji: "✔️", color: "bg-emerald-600", consequence: "Followers +2M, Sponsorship income boost",
          apply: s => { s.popularity = clamp(s.popularity + 20, 0, 100); s.socialMediaFollowers += 2; s.sponsorshipIncome += 1; s.events = [...s.events, "🌍 Became brand ambassador"]; return s; } },
        { label: "Decline: too distracting", emoji: "✋", color: "bg-muted", consequence: "Focus on football",
          apply: s => { s.events = [...s.events, "🌍 Declined brand ambassador role"]; return s; } },
      ] },
    // Financial events (25-30)
    { id: 25, emoji: "🚗", title: "Supercar Fleet!", description: "You buy a fleet of supercars. Cost: €800k.",
      category: "life", choices: [
        { label: "Buy the fleet 🚗", emoji: "🏎️", color: "bg-red-600", consequence: "Net worth -€800k, Lifestyle upgrade, Followers +500k",
          apply: s => { s.netWorth -= 0.8; s.socialMediaFollowers += 0.5; s.popularity = clamp(s.popularity + 3, 0, 100); s.events = [...s.events, "🚗 Bought a supercar fleet, €800k"]; return s; } },
        { label: "Keep it humble", emoji: "✋", color: "bg-muted", consequence: "Save the money",
          apply: s => { s.events = [...s.events, "🚗 Decided not to buy supercars"]; return s; } },
      ] },
    { id: 26, emoji: "📈", title: "Crypto Tip!", description: "A friend tips you on a crypto investment. High risk, high reward.",
      category: "life", choices: [
        { label: "Invest €200k", emoji: "🪙", color: "bg-amber-600", consequence: "Could 10x or lose everything",
          apply: s => { const roll = Math.random(); if (roll < 0.15) { s.netWorth += 2; s.investments = [...s.investments, "Crypto 10x 🚀"]; s.events = [...s.events, "📈 Crypto went 10x! +€2M!"]; } else if (roll < 0.5) { s.netWorth += 0.2; s.investments = [...s.investments, "Crypto 2x"]; s.events = [...s.events, "📈 Crypto doubled, +€200k"]; } else { s.netWorth -= 0.2; s.investments = [...s.investments, "Crypto ❌"]; s.events = [...s.events, "📈 Crypto crashed, lost €200k"]; } return s; } },
        { label: "Stay away from crypto", emoji: "✋", color: "bg-muted", consequence: "Smart move? Or missed opportunity?",
          apply: s => { s.events = [...s.events, "📈 Avoided crypto investment"]; return s; } },
      ] },
    { id: 27, emoji: "🎬", title: "Movie Cameo!", description: "A Hollywood director wants you for a cameo in a blockbuster film.",
      category: "life", choices: [
        { label: "Accept: €500k fee", emoji: "🎬", color: "bg-emerald-600", consequence: "Net worth +€500k, Followers +3M",
          apply: s => { s.netWorth += 0.5; s.socialMediaFollowers += 3; s.popularity = clamp(s.popularity + 10, 0, 100); s.events = [...s.events, "🎬 Appeared in a blockbuster film!"]; return s; } },
        { label: "Decline: focus on football", emoji: "⚽", color: "bg-muted", consequence: "Stay professional",
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
        { label: "Buy them: €400k", emoji: "⌚", color: "bg-amber-600", consequence: "Net worth -€400k, Status symbol, Followers +200k",
          apply: s => { s.netWorth -= 0.4; s.socialMediaFollowers += 0.2; s.events = [...s.events, "💎 Bought luxury watch collection"]; return s; } },
        { label: "Not worth it", emoji: "✋", color: "bg-muted", consequence: "Save the money",
          apply: s => { s.events = [...s.events, "💎 Declined watch collection"]; return s; } },
      ] },
    { id: 30, emoji: "🎮", title: "Gaming Brand Deal!", description: "A gaming company offers you a brand deal to stream and promote their games.",
      category: "life", choices: [
        { label: "Sign the deal: €300k/year", emoji: "🎮", color: "bg-purple-600", consequence: "Income +€300k, Followers +1M",
          apply: s => { s.sponsorshipIncome += 0.3; s.socialMediaFollowers += 1; s.events = [...s.events, "🎮 Signed gaming brand deal"]; return s; } },
        { label: "Not my thing", emoji: "✋", color: "bg-muted", consequence: "Stay focused on football",
          apply: s => { s.events = [...s.events, "🎮 Declined gaming brand deal"]; return s; } },
      ] },
    // New life events (31-40)
    { id: 31, emoji: "👗", title: "Met Gala Invitation!", description: "You are invited to the Met Gala, the most exclusive fashion event in the world.",
      category: "life", choices: [
        { label: "Attend in style", emoji: "✨", color: "bg-pink-600", consequence: "Followers +500k, Lifestyle upgrade",
          apply: s => { s.socialMediaFollowers += 0.5; s.popularity = clamp(s.popularity + 8, 0, 100); s.events = [...s.events, "👗 Attended the Met Gala, went viral"]; return s; } },
        { label: "Skip it: not my scene", emoji: "✋", color: "bg-muted", consequence: "Stay low-key",
          apply: s => { s.events = [...s.events, "👗 Declined Met Gala invitation"]; return s; } },
      ] },
    { id: 32, emoji: "🎥", title: "Documentary Crew!", description: "A documentary crew wants to follow your entire season for a Netflix-style series.",
      category: "life", choices: [
        { label: "Let them in", emoji: "📹", color: "bg-emerald-600", consequence: "Followers +2M, Legacy +5",
          apply: s => { s.socialMediaFollowers += 2; s.integrityBonus += 5; s.popularity = clamp(s.popularity + 10, 0, 100); s.events = [...s.events, "🎥 Documentary aired, massive following boost"]; return s; } },
        { label: "Too much pressure", emoji: "🚫", color: "bg-muted", consequence: "Privacy maintained",
          apply: s => { s.events = [...s.events, "🎥 Declined documentary crew"]; return s; } },
      ] },
    { id: 33, emoji: "📺", title: "TV Show Appearance!", description: "You are invited to appear on a popular late-night talk show.",
      category: "life", choices: [
        { label: "Go on the show", emoji: "🎤", color: "bg-blue-600", consequence: "Followers +1M, Fun appearance",
          apply: s => { s.socialMediaFollowers += 1; s.popularity = clamp(s.popularity + 5, 0, 100); s.events = [...s.events, "📺 Appeared on a popular TV show"]; return s; } },
        { label: "Decline: camera shy", emoji: "✋", color: "bg-muted", consequence: "No change",
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
        { label: "Launch the academy: €2M", emoji: "🎓", color: "bg-emerald-600", consequence: "Cost €2M, Legacy +15, Giving back",
          apply: s => { s.netWorth -= 2; s.integrityBonus += 15; s.popularity = clamp(s.popularity + 15, 0, 100); s.events = [...s.events, "⚽🏫 Launched football academy for kids, Legacy +15"]; return s; } },
        { label: "Maybe when I retire", emoji: "⏳", color: "bg-muted", consequence: "Postpone the dream",
          apply: s => { s.events = [...s.events, "⚽🏫 Postponed football academy plans"]; return s; } },
      ] },
    { id: 38, emoji: "😂", title: "Fan Tattoo Goes Viral!", description: "A fan gets a tattoo of your face. The internet explodes.",
      category: "life", choices: [
        { label: "Repost it: legendary", emoji: "📱", color: "bg-purple-600", consequence: "Followers +500k, Goes viral",
          apply: s => { s.socialMediaFollowers += 0.5; s.popularity = clamp(s.popularity + 5, 0, 100); s.events = [...s.events, "😂 Fan face tattoo went viral, +500k followers"]; return s; } },
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
    { id: 40, emoji: "🎬⭐", title: "Movie Star Cameo!", description: "A blockbuster director wants you for a speaking role in their new film. Not just a cameo: actual lines.",
      category: "life", choices: [
        { label: "Lights, camera, action!", emoji: "🎬", color: "bg-emerald-600", consequence: "Followers +3M, Major exposure",
          apply: s => { s.socialMediaFollowers += 3; s.netWorth += 0.8; s.popularity = clamp(s.popularity + 12, 0, 100); s.events = [...s.events, "🎬⭐ Starred in a blockbuster movie!"]; return s; } },
        { label: "I'm a footballer, not an actor", emoji: "⚽", color: "bg-muted", consequence: "Focus on football",
          apply: s => { s.events = [...s.events, "🎬⭐ Declined movie role"]; return s; } },
      ] },
    ...getExtraEvents(state),
    ...getLifeEvents(state),
    // Round 54: the corruption layer (ids 300-349) and the realism layer
    // (ids 400+). Both self-gate, so no eligibility rules are needed here.
    ...getCorruptionEvents(state),
    ...getRealismEvents(state),
  ];
}

/* ─── Generate 2-4 random events for a season ─── */
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
    if (e.id === 34 && (state.overall < 85 || state.age < 28)) return false; // Street naming, legend status
    if (e.id === 35 && (state.overall < 88 || state.age < 30)) return false; // National honour
    if (e.id === 36 && state.netWorth < 50) return false; // Forbes top 10
    if (e.id === 37 && state.netWorth < 3) return false; // Academy needs €2M+
    if (e.id === 38 && state.socialMediaFollowers < 5) return false; // Fan tattoo needs fame
    if (e.id === 39 && (state.popularity < 70 || state.overall < 85)) return false; // Meet head of state
    if (e.id === 40 && state.popularity < 55) return false; // Movie role
    return true;
  });
  const count = rand(2, 4);
  const shuffled = [...eligible].sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, count);
  // Round 49: identity beats (personality reveal, agent signing) always show up
  // the season they become due instead of losing the random draw.
  for (const pid of getPriorityLifeEventIds(state)) {
    if (!picked.some(e => e.id === pid)) {
      const ev = all.find(e => e.id === pid);
      if (ev) picked.unshift(ev);
    }
  }
  return picked;
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
  const uclYear = state.seasons.length > 0 ? state.seasons[state.seasons.length - 1].year + 1 : 2024;
  const opponents = getEraUclOpponents(uclYear).filter(o => o !== state.currentClub);
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
const TOP_6_CLUBS = ["Real Madrid", "Man City", "Barcelona", "Bayern Munich", "Arsenal", "Liverpool"];
const LEAGUE_CLUBS: Record<string, string[]> = {
  "Premier League": ["Man City", "Arsenal", "Liverpool", "Man United", "Chelsea", "Tottenham"],
  "La Liga": ["Real Madrid", "Barcelona", "Atletico Madrid"],
  "Bundesliga": ["Bayern Munich", "Dortmund", "Leverkusen"],
  "Serie A": ["Inter Milan", "AC Milan", "Napoli", "Juventus"],
  "Ligue 1": ["PSG"],
};

function getClubLeagueEra(club: string, leagueMap: Record<string, string[]>): string | null {
  for (const [league, clubs] of Object.entries(leagueMap)) {
    if (clubs.includes(club)) return league;
  }
  return null;
}

function calcBdorPoints(goals: number, assists: number, overall: number, clubTier: number, trophies: string[], club: string, topClubs: string[]): number {
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
  if (topClubs.includes(club)) pts += 5;
  return Math.round(pts);
}

function calculateBallonDor(state: CareerState, season: SeasonRecord, year: number, world?: WorldSeason): BallonDorResult {
  const yearOffset = year - 2024;
  const eraTopClubs = getEraTopClubs(year);
  const eraLeagues = getEraLeagueClubs(year);

  /* --- This season's trophy winners, era-correct ---
     Round 130: these used to be picked here, in private, which meant the phone
     could not report them without inventing a second answer. They are decided
     by worldSeasonTick now and simply read here. Same uniform pick over the
     same era pools, so the shape of the award is unchanged. The fallback keeps
     this function usable on its own. */
  const uclWinnerClub = world?.ucl ?? pick(eraTopClubs);
  // One league winner per league
  const leagueWinners: Record<string, string> = {};
  for (const [league, clubs] of Object.entries(eraLeagues)) {
    leagueWinners[league] = world?.leagues?.[league] ?? pick(clubs);
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
  // Round 124: winning the Euros or the Copa in the summer is a real Ballon
  // d'Or argument, worth less than a World Cup but a long way above nothing.
  if (season.continentalCup) playerTrophies.push("Continental");

  let playerPoints = 0;
  if (playerCanContend) {
    playerPoints = calcBdorPoints(season.goals, season.assists, state.overall, state.currentClubTier, playerTrophies, state.currentClub, eraTopClubs);
  }
  const playerNominated = playerCanContend && playerPoints > 45;

  // --- Generate contender nominees ---
  // Era-correct star pools (1990-2029, clamped at both ends) until 2032,
  // then fully fictional generated contenders for far-future seasons.
  const useEraStars = year <= 2032;
  const usedNames = new Set<string>([state.playerName]);
  if (state.rival) usedNames.add(state.rival.name);

  const allNomineeData: BallonDorNominee[] = [];
  if (useEraStars) {
    for (const star of getEraStars(year)) {
      if (usedNames.has(star.name)) continue;
      usedNames.add(star.name);
      const goals = rand(star.baseGoals[0], star.baseGoals[1]);
      const assists = rand(3, 18);
      /* Round 130: if the sim has moved him, he is at the club the sim moved
         him to. One truth, shared with the phone's transfer feed. */
      const starClub = worldClubOf(state, star.name) ?? star.club;

      // Assign trophies based on this season's era-correct winners, no conflicts
      const trophies: string[] = [];
      if (starClub === uclWinnerClub && Math.random() < 0.85) trophies.push("UCL");
      const starLeague = getClubLeagueEra(starClub, eraLeagues);
      if (starLeague && leagueWinners[starLeague] === starClub && Math.random() < 0.8) trophies.push("League");
      if (isWorldCupYear && Math.random() < 0.04) trophies.push("World Cup");
      if (Math.random() < 0.15) trophies.push("Cup");

      const overall = clamp(82 + star.power + rand(-2, 2), 78, 96);
      const pts = calcBdorPoints(goals, assists, overall, 1, trophies, starClub, eraTopClubs) + star.power * rand(1, 3);
      allNomineeData.push({
        name: star.name, nationality: star.nationality, position: star.position,
        club: starClub, points: pts, goals, trophies, isPlayer: false,
      });
    }
  } else {
    // Generate 15 fictional contenders
    for (let i = 0; i < 15; i++) {
      const gen = generateContender(usedNames, yearOffset * 100 + i);
      if (usedNames.has(gen.name)) continue;
      usedNames.add(gen.name);
      const goals = rand(gen.baseGoals[0], gen.baseGoals[1]);
      const assists = rand(3, 18);
      const trophies: string[] = [];
      if (gen.club === uclWinnerClub && Math.random() < 0.85) trophies.push("UCL");
      const genLeague = getClubLeagueEra(gen.club, eraLeagues);
      if (genLeague && leagueWinners[genLeague] === gen.club && Math.random() < 0.8) trophies.push("League");
      if (isWorldCupYear && Math.random() < 0.04) trophies.push("World Cup");
      if (Math.random() < 0.15) trophies.push("Cup");
      const overall = clamp(rand(83, 93), 75, 95);
      const pts = calcBdorPoints(goals, assists, overall, 1, trophies, gen.club, eraTopClubs);
      allNomineeData.push({
        name: gen.name, nationality: gen.nationality, position: gen.position,
        club: gen.club, points: pts, goals, trophies, isPlayer: false,
      });
    }
  }

  // Add rival
  if (state.rival && !state.rival.retired && state.rival.clubTier <= 2) {
    const rivalGoals = state.rival.careerGoals > 0 ? rand(12, 30) : rand(5, 15);
    const rivalAssists = rand(3, 12);
    const rivalTrophies: string[] = [];
    // Check if rival's club won trophies this season
    if (state.rival.club === uclWinnerClub && Math.random() < 0.8) rivalTrophies.push("UCL");
    const rivalLeague = getClubLeagueEra(state.rival.club, eraLeagues);
    if (rivalLeague && leagueWinners[rivalLeague] === state.rival.club && Math.random() < 0.75) rivalTrophies.push("League");
    const rivalPts = calcBdorPoints(rivalGoals, rivalAssists, state.rival.overall, state.rival.clubTier, rivalTrophies, state.rival.club, eraTopClubs);
    allNomineeData.push({
      name: state.rival.name, nationality: state.rival.nationality, position: state.rival.position,
      club: state.rival.club, points: rivalPts, goals: rivalGoals, trophies: rivalTrophies, isPlayer: false,
    });
  }

  // Sort all contenders by points descending
  allNomineeData.sort((a, b) => b.points - a.points);

  // Round 54 FAIRNESS RULE (owner feedback: "you can have the best stats that
  // season and they won't give you the award").
  //
  // ROOT CAUSE: calcBdorPoints caps goals at 28 points and assists at 8, while
  // NPC stars get an uncapped `power * rand(1,3)` pedigree bonus on top of the
  // same formula. A player could post 46 goals and 11 assists (59 pts) and lose
  // to a nominee sitting on 119. No stat line could ever beat reputation, which
  // is exactly what the owner hit.
  //
  // FIX: judge dominance on PRODUCTION, comparing like for like. Every nominee
  // carries goals + trophies, so score the player and the field on the same
  // scale and let the numbers speak. Reputation still decides close years, but
  // it can no longer beat a season that objectively led the world.
  const productionScore = (goals: number, assists: number, trophies: string[]): number => {
    let p = goals + assists * 0.5;
    if (trophies.includes("World Cup")) p += 22;
    if (trophies.includes("Continental")) p += 11;
    if (trophies.includes("UCL")) p += 18;
    if (trophies.includes("League")) p += 9;
    if (trophies.includes("Cup")) p += 3;
    return p;
  };
  const playerProduction = productionScore(season.goals, season.assists, playerTrophies);
  // Nominees do not expose assists, so give every one of them a generous
  // benefit-of-the-doubt assist total (12) rather than assuming zero.
  const fieldBest = allNomineeData.reduce(
    (mx, n) => Math.max(mx, productionScore(n.goals, 12, n.trophies)),
    0,
  );
  const gaTotal = season.goals + season.assists;
  const trebleSeason = season.leagueTitle && season.championsLeague && season.domesticCup;
  const statMonster = gaTotal >= 55 || season.goals >= 45 || (gaTotal >= 45 && (season.leagueTitle || season.championsLeague || season.worldCup));
  // Outscored every single nominee, the plainest version of "best stats".
  const fieldTopGoals = allNomineeData.reduce((mx, n) => Math.max(mx, n.goals), 0);
  const outscoredEveryone = season.goals > fieldTopGoals;
  const wonMajor = season.leagueTitle || season.championsLeague || season.worldCup || !!season.continentalCup;
  // Led the world on production, or outscored the entire field while winning a
  // major, or posted a monster line and at least matched the best of the field,
  // or won a domestic treble while staying in touch.
  const playerDominant = playerCanContend && (
    playerProduction > fieldBest ||
    (outscoredEveryone && wonMajor) ||
    (statMonster && playerProduction >= fieldBest * 0.95) ||
    (trebleSeason && playerProduction >= fieldBest * 0.9)
  );

  // DIFFICULTY: Boost top NPC so there's always a strong rival for the award,
  // but never against a dominant player season (that was the snub machine).
  if (allNomineeData.length >= 2 && !playerDominant) {
    // Give the top NPC a random bonus to make winning harder
    allNomineeData[0].points += rand(5, 15);
    if (allNomineeData[1]) allNomineeData[1].points += rand(2, 8);
  }

  // A dominant season is always on the shortlist, even if the legacy points
  // formula would have left it off. Same for any monster line: the old
  // nomination gate (points > 45) could not be cleared by goals alone, because
  // goals are capped at 28 points, so a 45-goal trophyless season was not even
  // NOMINATED. That was the purest form of the snub the owner reported.
  const playerInTop10 = playerCanContend && (playerNominated || playerDominant || statMonster);
  const npcSpotsNeeded = playerInTop10 ? 9 : 10;
  const topNPCs = allNomineeData.slice(0, npcSpotsNeeded);

  // Filler nominees (only needed if the era pool somehow ran short)
  let fillerSeed = 0;
  while (topNPCs.length < npcSpotsNeeded && fillerSeed < 20) {
    const gen = generateContender(usedNames, year * 31 + fillerSeed++);
    if (usedNames.has(gen.name)) continue;
    usedNames.add(gen.name);
    topNPCs.push({
      name: gen.name, nationality: gen.nationality, position: gen.position,
      club: gen.club, points: rand(30, 50), goals: rand(5, 15), trophies: [], isPlayer: false,
    });
  }

  // Add player if nominated (or if the season was flat out dominant)
  if (playerInTop10) {
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

  // Round 54: a dominant season is untouchable. If the raw numbers say the
  // player owned the year, they lift the trophy, even if a filler nominee
  // landed above them on a technicality.
  if (playerDominant && playerRank !== 1) {
    const playerEntry = top10.find(n => n.isPlayer);
    if (playerEntry) {
      playerEntry.points = top10.reduce((mx, n) => Math.max(mx, n.points), 0) + rand(3, 9);
      top10.sort((a, b) => b.points - a.points);
      playerRankIdx = top10.findIndex(n => n.isPlayer);
      playerRank = playerRankIdx >= 0 ? playerRankIdx + 1 : null;
    }
  }

  // STRICT WIN CONDITIONS: Player can only win (rank 1) if they meet elite criteria.
  // Round 54 widened the paths so voters respect stats, not just trophies:
  // 30+ goals, UCL+League double, World Cup, a domestic treble, or a 45+ goal
  // involvement season alongside any major trophy all count as winning material.
  if (playerRank === 1 && !playerDominant) {
    const hasUCLAndLeague = season.championsLeague && season.leagueTitle;
    const hasWorldCup = season.worldCup;
    const has30PlusGoals = season.goals >= BDOR_WIN_MIN_GOALS;
    const bigInvolvementPlusTrophy = gaTotal >= 45 && (season.leagueTitle || season.championsLeague);
    const meetsWinCondition = has30PlusGoals || hasUCLAndLeague || hasWorldCup || trebleSeason || bigInvolvementPlusTrophy;
    if (!meetsWinCondition) {
      // Demote player to 2nd, they weren't dominant enough
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

  // Round 54 PODIUM FLOOR: even in a year someone else legitimately owned, a
  // monster individual season cannot be shoved down to 8th. 45+ goals, or 55+
  // goal involvements, guarantees at least a podium finish.
  if (statMonster && playerRank !== null && playerRank > 3) {
    const playerEntry = top10.find(n => n.isPlayer);
    if (playerEntry) {
      const thirdBest = [...top10].sort((a, b) => b.points - a.points)[2];
      playerEntry.points = (thirdBest ? thirdBest.points : playerEntry.points) + rand(1, 4);
      top10.sort((a, b) => b.points - a.points);
      playerRankIdx = top10.findIndex(n => n.isPlayer);
      playerRank = playerRankIdx >= 0 ? playerRankIdx + 1 : null;
    }
  }

  // Extended top-30 ranking: strong-but-not-nominated seasons still place in the world top 30
  if (playerRank === null && playerCanContend && playerPoints >= 12) {
    const better = allNomineeData.filter(n => !n.isPlayer && n.points > playerPoints).length;
    const extendedRank = Math.max(11, better + 1);
    if (extendedRank <= 30) playerRank = extendedRank;
  }

  return { year, nominees: top10, playerRank, playerPoints, playerNominated: playerInTop10 };
}

/* ─── Flow helper: advance to next phase ─── */
function advanceToNextPhase(s: CareerState, clubs: ClubData[]): CareerState {
  // Check for Ballon d'Or ceremony, always show it
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
  // Check for the international tournament screen. pendingWorldCup is the
  // pre Round 124 field, still honoured so an old save is not left stranded.
  if ((s.pendingTournament || s.pendingWorldCup) && s.phase !== "world_cup") {
    s.phase = "world_cup";
    return s;
  }
  // Rivalry event
  if (s.pendingRivalryEvent) {
    s.phase = "rivalry_event";
    return s;
  }
  // Social media action, once per season, only during playing phase for pro players
  if (!s.socialMediaActionUsedThisSeason && s.age >= 18 && !s.retired) {
    s.phase = "social_media_action";
    return s;
  }
  // Cover athlete event
  if (s.pendingCoverAthleteEvent) {
    // handled in UI as a special overlay within social_media_action flow
  }
  // Moral dilemma, triggered before random events
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

/* 2026-08-05 Ballon d'Or ceremony upgrade: the winner gives a speech.
   Choices are gated in the UI (rival option needs a rival, family option
   needs a child). Effects land on top of the automatic win bonuses. */
export type BdorSpeechChoice = "thank_rival" | "family_on_stage" | "tears" | "greatest_ever";

export function applyBdorSpeech(prev: CareerState, choice: BdorSpeechChoice, clubs: ClubData[]): CareerState {
  const s = { ...prev };
  const rivalName = s.rival?.name ?? "your rival";
  switch (choice) {
    case "thank_rival":
      s.popularity = clamp(s.popularity + 12, 0, 100);
      s.integrityBonus += 5;
      s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) - 20, 0, 100);
      s.events = [...s.events, `🎤 On the biggest stage you thanked ${rivalName} by name: "he made me this good." The room stood up. The feud will never be the same.`];
      break;
    case "family_on_stage":
      s.popularity = clamp(s.popularity + 15, 0, 100);
      s.morale = clamp(s.morale + 10, 0, 100);
      s.events = [...s.events, "👶 You carried your kid on stage and let them hold the golden ball. Every camera in the theatre wept."];
      break;
    case "tears":
      s.popularity = clamp(s.popularity + 10, 0, 100);
      s.morale = clamp(s.morale + 8, 0, 100);
      s.events = [...s.events, "😭 You cried from the first sentence to the last. The clip of you thanking your youth coach is everywhere."];
      break;
    case "greatest_ever":
      s.morale = clamp(s.morale + 5, 0, 100);
      if (Math.random() < 0.35) {
        s.popularity = clamp(s.popularity - 10, 0, 100);
        s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) + 10, 0, 100);
        s.events = [...s.events, '🐐 "I am the greatest to ever do this." Half the room gasped, the pundits fed on it for weeks. Popularity -10, but you meant every word.'];
      } else {
        s.popularity = clamp(s.popularity + 8, 0, 100);
        s.events = [...s.events, '🐐 "I am the greatest to ever do this." Delivered with such calm that people just... agreed. Popularity +8.'];
      }
      break;
  }
  s.pendingBallonDor = null;
  return advanceToNextPhase(s, clubs);
}

/* ─── Dismiss international debut screen ─── */
export function dismissDebut(prev: CareerState, clubs: ClubData[]): CareerState {
  const s = { ...prev };
  // Clear the debut trigger by nullifying it so we don't re-show
  s.intStats = { ...s.intStats, debutYear: -1 };
  // Check for the international tournament
  if (s.pendingTournament || s.pendingWorldCup) {
    s.phase = "world_cup";
    return s;
  }
  return advanceToNextPhase(s, clubs);
}

/* ─── Dismiss the international tournament screen ─── */
export function dismissWorldCup(prev: CareerState, clubs: ClubData[]): CareerState {
  const s = { ...prev };
  s.pendingWorldCup = null;
  s.pendingTournament = null;
  return advanceToNextPhase(s, clubs);
}

/* ─── World Cup winner's speech (Round 54) ───
   BUG FIX: the winner branch of WorldCupResultCard rendered four speech
   buttons that called an `onSpeech` prop the component never received, and
   that branch had no Continue button. Winning the World Cup, the single best
   moment in the game, threw a ReferenceError on click and left the player
   stuck with no way forward. Now the moment has its own real speech with real
   effects, and every path ends by clearing the pending result. */
export type WorldCupSpeechChoice = "for_the_country" | "shirt_to_the_fans" | "call_out_doubters" | "quiet_lap";

export function applyWorldCupSpeech(prev: CareerState, choice: WorldCupSpeechChoice, clubs: ClubData[]): CareerState {
  const s = { ...prev };
  switch (choice) {
    case "for_the_country":
      s.popularity = clamp(s.popularity + 18, 0, 100);
      s.morale = clamp(s.morale + 12, 0, 100);
      s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 3) * 100) / 100;
      s.events = [...s.events, `🏆 You dedicated it to every kid in ${s.nationality} playing on a broken pitch right now. A nation lost its mind.`];
      break;
    case "shirt_to_the_fans":
      s.popularity = clamp(s.popularity + 14, 0, 100);
      s.morale = clamp(s.morale + 8, 0, 100);
      s.integrityBonus += 6;
      s.events = [...s.events, "🎽 You threw the match shirt into the away end and walked off in a training top. That photo is now a mural."];
      break;
    case "call_out_doubters":
      s.morale = clamp(s.morale + 15, 0, 100);
      s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 4) * 100) / 100;
      if (Math.random() < 0.4) {
        s.popularity = clamp(s.popularity - 8, 0, 100);
        s.events = [...s.events, '📢 "Where are they now?" Named three pundits live on air. Iconic, petty, and replayed for a decade. Popularity -8.'];
      } else {
        s.popularity = clamp(s.popularity + 10, 0, 100);
        s.events = [...s.events, '📢 "Where are they now?" Named three pundits live on air and the whole country cheered. Popularity +10.'];
      }
      break;
    case "quiet_lap":
      s.morale = clamp(s.morale + 10, 0, 100);
      s.integrityBonus += 10;
      s.popularity = clamp(s.popularity + 6, 0, 100);
      s.events = [...s.events, "🚶 No speech. You walked one slow lap with the trophy, found your family in row 12, and said nothing at all."];
      break;
  }
  s.pendingWorldCup = null;
  s.pendingTournament = null;
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
      s.events = [...s.events, "⚖️ Appeal Successful. Ban Overturned! Free to play."];
    } else {
      s.popularity = clamp(s.popularity - 5, 0, 100);
      s.events = [...s.events, `⚖️ Appeal Rejected. Must serve ${result.banLength}-match ban.`];
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
  const rivalYear = state.seasons.length > 0 ? state.seasons[state.seasons.length - 1].year : 2024;
  clubs = adjustClubsForYear(clubs, rivalYear);
  const ovrDiff = rand(-5, 5);
  const rivalOvr = clamp(state.overall + ovrDiff, 45, 95);
  // Pick a different club at appropriate tier
  const tiers = rivalOvr >= 80 ? [1] : rivalOvr >= 70 ? [1, 2] : rivalOvr >= 60 ? [2, 3] : [3, 4];
  const candidates = clubs.filter(c => tiers.includes(c.tier) && c.name !== state.currentClub);
  const rivalClub = candidates.length > 0 ? pick(candidates) : { name: "Unknown FC", tier: 2 };
  // Pick nationality, prefer same region
  const sameNatChance = Math.random();
  const rivalNat = sameNatChance < 0.3 ? state.nationality : pick(Object.keys(FLAG_MAP));
  return {
    name: getEraRivalName(rivalYear),
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

function simulateRivalSeason(rival: RivalPlayer, clubs: ClubData[], year?: number): RivalPlayer {
  if (year !== undefined) clubs = adjustClubsForYear(clubs, year);
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
  
  // 2026-08-05 rivalry expansion: ten more beats in the saga
  if (r.club === state.currentClub) {
    events.push({ id: 109, emoji: "😬", title: "Your Rival Is Now Your Teammate", description: `${r.name} just signed for YOUR club. The first training session is the most watched non-match footage of the year.`, consequence: "The feud cools, the cameras multiply" });
  }
  events.push({ id: 110, emoji: "🤬", title: "Tunnel Bust-Up", description: `Cameras catch you and ${r.name} chest to chest in the tunnel after a bad-blood derby. Lip readers are having the week of their lives.`, consequence: "Rivalry intensifies, the league schedules you for prime time" });
  if (r.careerGoals >= 300) {
    events.push({ id: 111, emoji: "🎯", title: "The Chase", description: `${r.name} just passed 300 career goals. Every broadcast now shows your tallies side by side in real time.`, consequence: "Motivation surges: +1 Shooting next season" });
  }
  if (r.nationality === state.nationality) {
    events.push({ id: 112, emoji: "💫", title: "The Armband Snub", description: `The national team named ${r.name} captain. Your shirt number stays, the armband does not.`, consequence: "Morale -5, motivation +2 Physical next season" });
  }
  events.push({ id: 113, emoji: "👕", title: "The Shirt Swap", description: `After a classic against ${r.name}, you swap shirts and embrace. The photo becomes the wallpaper of half the football internet.`, consequence: "Popularity +8, the feud softens" });
  events.push({ id: 114, emoji: "🏥", title: "Rival Goes Down", description: `${r.name} tears a ligament and faces a year out. You post a genuine get-well message within the hour.`, consequence: "Integrity +5, Popularity +5, rivalry cools" });
  if (state.overall >= 88 && r.overall >= 88) {
    events.push({ id: 115, emoji: "🐐", title: "The GOAT Debate", description: `Every pundit panel this week ran the same segment: you or ${r.name}. Your teammates printed the losing poll and taped it to his locker room door.`, consequence: "Popularity +5, the era has a name now" });
  }
  if (state.popularity >= 40) {
    events.push({ id: 116, emoji: "🏴", title: "The Banner", description: `${r.name}'s ultras unveil a 40-meter banner mocking you before kickoff. You answer the only way that matters.`, consequence: "+1 Shooting and +1 Dribbling next season, rivalry intensifies" });
  }
  if (state.age >= 28) {
    events.push({ id: 117, emoji: "🎬", title: "The Rivalry Documentary", description: `A streaming giant offers to make a series about you and ${r.name}. Both camps say yes before the call ends.`, consequence: "Net worth +3M, Popularity +8" });
  }
  if (state.age >= 32) {
    events.push({ id: 118, emoji: "🤝", title: "Testimonial Invitation", description: `${r.name} personally invites you to captain the opposition in his testimonial match. Two decades of war, one guard of honor.`, consequence: "Integrity +8, Popularity +8, the feud becomes history" });
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
    case 109:
      s.morale = clamp(s.morale + 3, 0, 100);
      s.popularity = clamp(s.popularity + 5, 0, 100);
      s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) - 10, 0, 100);
      break;
    case 110:
      s.popularity = clamp(s.popularity + 3, 0, 100);
      s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) + 15, 0, 100);
      break;
    case 111:
      s.statBoostNextSeason = { ...s.statBoostNextSeason, shooting: (s.statBoostNextSeason.shooting || 0) + 1 };
      s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) + 5, 0, 100);
      break;
    case 112:
      s.morale = clamp(s.morale - 5, 0, 100);
      s.statBoostNextSeason = { ...s.statBoostNextSeason, physical: (s.statBoostNextSeason.physical || 0) + 2 };
      s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) + 10, 0, 100);
      break;
    case 113:
      s.popularity = clamp(s.popularity + 8, 0, 100);
      s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) - 15, 0, 100);
      break;
    case 114:
      s.integrityBonus += 5;
      s.popularity = clamp(s.popularity + 5, 0, 100);
      s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) - 20, 0, 100);
      break;
    case 115:
      s.popularity = clamp(s.popularity + 5, 0, 100);
      s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) + 10, 0, 100);
      break;
    case 116:
      s.statBoostNextSeason = { ...s.statBoostNextSeason, shooting: (s.statBoostNextSeason.shooting || 0) + 1, dribbling: (s.statBoostNextSeason.dribbling || 0) + 1 };
      s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) + 10, 0, 100);
      break;
    case 117:
      s.netWorth = Math.round((s.netWorth + 3) * 100) / 100;
      s.popularity = clamp(s.popularity + 8, 0, 100);
      break;
    case 118:
      s.integrityBonus += 8;
      s.popularity = clamp(s.popularity + 8, 0, 100);
      s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) - 25, 0, 100);
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
  const legacyBonus = overallWinner === "player" ? 15 : overallWinner === "tie" ? 5 : -5 + (((state.rivalryIntensity ?? 0) >= 70) ? 5 : 0);
  
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
    // Round 124: continental championships are counted, and counted separately
    // so a Euros never quietly reads as a World Cup in the cabinet.
    continentalCups: t.continentalCups + (s.continentalCup ? 1 : 0),
  }), { apps: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0, leagueTitles: 0, domesticCups: 0, championsLeagues: 0, worldCups: 0, ballonDors: 0, continentalCups: 0 });
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

  /* International trophies. Round 124 raised this ceiling from 10 to 16 and
     added caps, because before this round two identical club careers scored
     the same whether one of them had a World Cup winner's medal or not, and
     that is not how anybody talks about a footballer. A World Cup is now the
     single biggest line a player can put on this list, and a hundred caps for
     a country is a legacy on its own even without a trophy. */
  const capPoints = Math.min(4, state.intStats.caps * 0.035);
  const intTrophyPoints = Math.min(16,
    (state.intStats.worldCupWins * 8) + (state.intStats.continentalWins * 4) + capPoints);
  breakdown.push({ label: "International", points: Math.round(intTrophyPoints) });
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

  /* Cover star bonus. Round 129 scrubbed the offer card itself of the real
     game's name and missed this label, which is on the retirement screen every
     player who took the deal reads. Same rule, so it says what it is. */
  if (state.coverAthleteAccepted) {
    breakdown.push({ label: "Cover Star", points: 10 });
    score += 10;
  }

  /* ─── Round 131: the climb ───

     He asked for the overall cap on the build screen to go, and it has gone,
     so somebody can now start a career at 99. Permitting that without
     answering it would be the lazy version: a 99 start with nothing left to
     chase is a worse game than a 62 start, and the game should say so rather
     than pretend the two are the same story.

     So the verdict knows where you began. A kid who came out of an academy at
     54 and finished at 91 climbed 37 points and that is most of what people
     will remember about him. A player handed 99 on the creation screen climbed
     nothing, and the same trophy haul reads differently because of it. Worth
     up to eight points on a hundred point score, and it can cost you six.

     Saves from before this round have no starting overall recorded and there
     is no honest way to work one out after the fact, so they simply do not get
     this line, and their score is exactly what it always was. */
  let climbPoints = 0;
  if (typeof state.startingOverall === "number" && state.startingOverall > 0) {
    const climb = Math.max(0, state.peakOverall - state.startingOverall);
    /* Two halves. What you climbed, against the dozen points a normal academy
       career picks up, and what you were HANDED, measured against 67, which is
       the highest overall the scouts can roll a sixteen year old at. Anything
       above 67 could not have come from a roll, so it came from the build
       screen, and the verdict knows the difference. */
    const handed = clamp(state.startingOverall - 67, 0, 32);
    climbPoints = clamp(Math.round((climb - 12) * 0.42 - handed * 0.34), -18, 8);
  }

  // Integrity bonus from moral dilemmas
  if (state.integrityBonus !== 0) {
    const intPts = clamp(state.integrityBonus, -30, 20);
    breakdown.push({ label: state.integrityBonus > 0 ? "Integrity" : "Scandal", points: intPts });
    score += intPts;
  }

  score = Math.round(clamp(score, 0, 100));
  /* The climb is applied AFTER the hundred point clamp, and that is not a
     detail. A career that wins everything sums to about a hundred and fifty
     before the clamp, so a climb line added in with the rest would have been
     swallowed whole and a player handed 99 on the creation screen would still
     have come out a flat GOAT. Applied here it actually lands: win the lot
     having been given your peak for free and the verdict says LEGEND rather
     than the greatest of all time, which is the honest read. */
  if (climbPoints !== 0) {
    breakdown.push({ label: "The Climb", points: climbPoints });
    score = Math.round(clamp(score + climbPoints, 0, 100));
  }
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

/* ─── Retirement Suggestion, player can choose to continue or retire ─── */
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
  s.events = [...s.events, "💪 Decided to push on, not ready to hang up the boots yet"];
  s.phase = "playing";
  return s;
}

/* ─── Manager Career ─── */
/**
 * Round 111: rebuild the offer feed for an unemployed manager.
 *
 * Everything the job market judges you on comes from the save you have
 * already played: the trophies you won as a player, the caps, the level you
 * finished at, then what you have done in the dugout since. That is the
 * whole point of continuing in the same career rather than starting a new
 * manager game.
 */
export function refreshManagerOffers(s: CareerState, ms: ManagerState): void {
  const played = s.seasons.filter(x => x.type === "playing");
  const profile = managerProfileFromCareer({
    nationality: s.nationality,
    peakOverall: s.peakOverall,
    intCaps: s.intStats?.caps ?? 0,
    seasons: played.map(x => ({
      club: x.club, clubCountry: x.clubCountry, clubTier: x.clubTier,
      apps: x.apps, goals: x.goals, rating: x.rating,
      leagueTitle: x.leagueTitle, championsLeague: x.championsLeague,
      worldCup: x.worldCup, ballonDor: x.ballonDor, type: x.type,
    })),
  });
  // Fold in what has actually happened since he put the boots away.
  profile.seasonsManaged = ms.season;
  profile.managerTrophies = ms.trophies;
  profile.promotions = ms.promotions;
  profile.relegations = ms.relegations ?? 0;
  profile.lastTier = Math.max(1, Math.min(4, ms.clubTier)) as 1 | 2 | 3 | 4;
  profile.seasonsOut = ms.seasonsOut ?? 0;
  profile.seasonsSinceRetired = ms.season;
  profile.departure = ms.departure ?? "sacked";

  const offers = realJobOffers(profile, Math.random, [ms.club]);
  ms.offers = offers.map(o => ({
    club: o.club, country: o.country, tier: o.tier, league: o.league,
    brief: o.brief, reason: o.reason, budget: o.budget,
  }));
  const standing = managerStanding(profile);
  ms.offerNote = offers.length === 0
    ? (standing < 25
        ? "Silence. Nobody is calling, and sitting here another season will only make it quieter."
        : "No offers this window. Boards move slowly. See who panics in the spring.")
    : offers.length === 1
      ? "One club came in."
      : `${offers.length} clubs want to talk.`;
}

/** Round 111: take one of the jobs on the table. */
export function acceptManagerOffer(prev: CareerState, index: number): CareerState {
  const s = { ...prev };
  if (!s.managerState) return s;
  const ms = { ...s.managerState };
  const offer = (ms.offers ?? [])[index];
  if (!offer) return s;
  ms.club = offer.club;
  ms.clubTier = offer.tier;
  ms.unemployed = false;
  ms.seasonsOut = 0;
  ms.offers = [];
  ms.offerNote = undefined;
  ms.seasonResults = [...ms.seasonResults, {
    year: ms.season, club: offer.club, tier: offer.tier,
    result: `Took the ${offer.club} job. ${offer.brief}`, trophy: false,
  }];
  s.managerState = ms;
  return s;
}

export function advanceManagerSeason(prev: CareerState, clubs: ClubData[]): CareerState {
  const s = { ...prev };
  if (!s.managerState) return s;
  const ms = { ...s.managerState };
  ms.season += 1;

  // Round 111: out of work means you sit through the season, and every
  // season you sit makes the next feed thinner.
  if (ms.unemployed) {
    ms.seasonsOut = (ms.seasonsOut ?? 0) + 1;
    refreshManagerOffers(s, ms);
    ms.seasonResults = [...ms.seasonResults, {
      year: ms.season, club: "Out of work", tier: ms.clubTier,
      result: ms.offers && ms.offers.length
        ? `A season out. ${ms.offers.length} club${ms.offers.length === 1 ? '' : 's'} interested.`
        : "Another season out of the game. The phone stayed quiet.",
      trophy: false,
    }];
    s.managerState = ms;
    return s;
  }
  
  const promotionChance = ms.clubTier >= 3 ? 0.30 : ms.clubTier === 2 ? 0.20 : 0.15;
  const trophyChance = ms.clubTier <= 2 ? 0.20 : 0.10;
  const sacked = ms.season >= 2 && Math.random() < 0.15; // 15% sack chance
  const promoted = !sacked && ms.clubTier > 1 && Math.random() < promotionChance;
  const wonTrophy = !sacked && Math.random() < trophyChance;
  const scoutInterest = ms.season >= 2 && ms.clubTier >= 2 && Math.random() < 0.25;
  
  let result = "";
  if (sacked) {
    // Round 111: no more instant rehire. You are out of work, and whether
    // anyone calls depends on what you did as a player, what you have won in
    // the dugout, how badly this ended and how long you sit.
    const wentDown = ms.clubTier >= 3 && Math.random() < 0.45;
    result = wentDown ? 'Relegated, and sacked on the spot.' : 'Sacked after a bad run.';
    ms.unemployed = true;
    ms.seasonsOut = 0;
    ms.departure = wentDown ? 'relegated' : 'sacked';
    if (wentDown) ms.relegations = (ms.relegations ?? 0) + 1;
    refreshManagerOffers(s, ms);
    result += ms.offers && ms.offers.length
      ? ` ${ms.offers.length} club${ms.offers.length === 1 ? '' : 's'} came in.`
      : ' Nobody has called.';
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
      // Round 111: a bigger club only moves for you if your record justifies
      // it. Watching a session is not the same as offering the job.
      const earned = ms.trophies + ms.promotions * 2 + Math.max(0, 4 - ms.clubTier);
      if (offer.tier <= 2 && earned >= 3 && Math.random() < 0.45) {
        ms.club = offer.name;
        ms.clubTier = offer.tier;
        ms.departure = 'poached';
        result += ` and HIRED by ${offer.name}`;
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
      eventText = "🎙️ Praised a rising star. Fans loved your insight. Followers +500k";
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
        eventText = "❌ Bold prediction was wrong, but people remember you said it. +300k followers";
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
  return `I finished my Soccer Career as a ${tier}: ${totals.goals} goals, ${totalTrophies} trophies, ${totals.ballonDors} Ballon d'Ors. Can you beat me? douknowball.com/soccer-career`;
}
