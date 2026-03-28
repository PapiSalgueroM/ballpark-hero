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
  championsLeague: boolean;
  worldCup: boolean;
  ballonDor: boolean;
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
  phase: "youth" | "contract_offer" | "playing" | "season_summary" | "transfer_window" | "random_events" | "retired";
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
  popularity: number; // 0-100
  morale: number; // 0-100
  isLeader: boolean;
  hasRelationship: boolean;
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

/* ─── Market value per user spec ─── */
function calcMarketValue(overall: number, age: number, position: string): number {
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

  return Math.max(0.1, Math.round(base * 10) / 10);
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

  // Trophies
  const winLeague = currentClubTier <= 2 && Math.random() < (0.25 / currentClubTier);
  const winCL = currentClubTier === 1 && overall >= 78 && Math.random() < 0.07;
  const isWCYear = (lastYear + 1) % 4 === 2;
  const winWC = isWCYear && overall >= 80 && Math.random() < 0.05;
  const winBdor = overall >= 88 && Math.random() < 0.10;

  return {
    year: lastYear + 1, age,
    club: state.currentClub, clubCountry: state.currentClubCountry, clubTier: currentClubTier,
    apps, goals, assists, cleanSheets, yellowCards, redCards, rating,
    leagueTitle: winLeague, championsLeague: winCL, worldCup: winWC, ballonDor: winBdor,
    type: "playing",
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
      leagueTitle: false, championsLeague: false, worldCup: false, ballonDor: false, type: "youth",
    }],
    events: [`📋 Joined ${academyClub.name} Youth Academy aged 16`],
    retired: false, phase: "youth", pendingOffers: [], pendingSummary: null, transferSituation: null,
    pendingEvents: [], lastEventId: null, statBoostNextSeason: {},
    internationalCareer: false, sponsorDeal: null, totalEarnings: 0,
    popularity: 10, morale: 70, isLeader: false, hasRelationship: false,
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
    leagueTitle: false, championsLeague: false, worldCup: false, ballonDor: false, type: "youth",
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
  s.events = [`✍️ Signed with ${offer.club.name} ${getFlag(offer.club.country)} (${offer.contractYears}yr, ${formatWage(offer.wage)})`];
  return s;
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
    }];
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
  s.marketValue = calcMarketValue(s.overall, s.age, s.position);
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
  if (s.contractYearsLeft <= 1) s.events.push("⚠️ Your contract is expiring!");
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
    { id: 22, emoji: "💼", title: "Business Venture", description: "You invest €500k in a business venture.",
      category: "life", choices: [
        { label: "Invest", emoji: "💰", color: "bg-emerald-600", consequence: "Random: +€1M profit or -€500k loss",
          apply: s => { if (Math.random() < 0.5) { s.totalEarnings += 1; s.events = [...s.events, "💼 Business venture succeeded! +€1M"]; } else { s.totalEarnings -= 0.5; s.events = [...s.events, "💼 Business venture failed — lost €500k"]; } return s; } },
        { label: "Pass on it", emoji: "✋", color: "bg-muted", consequence: "No risk, no reward",
          apply: s => { s.events = [...s.events, "💼 Passed on business venture"]; return s; } },
      ] },
    { id: 23, emoji: "🏠", title: "Luxury Mansion!", description: "You buy a luxury mansion.",
      category: "life", choices: [
        { label: "Buy it", emoji: "🏠", color: "bg-emerald-600", consequence: "Lifestyle upgrade, Morale +5",
          apply: s => { s.morale = clamp(s.morale + 5, 0, 100); s.totalEarnings -= 2; s.events = [...s.events, "🏠 Bought a luxury mansion"]; return s; } },
        { label: "Save the money", emoji: "💰", color: "bg-muted", consequence: "Smart financial decision",
          apply: s => { s.events = [...s.events, "🏠 Decided to save money instead"]; return s; } },
      ] },
    { id: 24, emoji: "🌍", title: "Brand Ambassador!", description: "You are offered a role as brand ambassador for your country.",
      category: "life", choices: [
        { label: "Accept the role", emoji: "✔️", color: "bg-emerald-600", consequence: "Social media +200k, Income +€1M/year",
          apply: s => { s.popularity = clamp(s.popularity + 20, 0, 100); s.totalEarnings += 1; s.events = [...s.events, "🌍 Became brand ambassador for your country"]; return s; } },
        { label: "Decline — too distracting", emoji: "✋", color: "bg-muted", consequence: "Focus on football",
          apply: s => { s.events = [...s.events, "🌍 Declined brand ambassador role"]; return s; } },
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
    return true;
  });
  const count = rand(1, 3);
  const shuffled = [...eligible].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/* ─── Dismiss summary → random events → transfer window ─── */
export function dismissSummary(prev: CareerState, clubs: ClubData[]): CareerState {
  const s = { ...prev }; s.pendingSummary = null;
  if (s.retired) { s.phase = "retired"; return s; }
  // Generate random events for this season
  const events = generateRandomEvents(s);
  if (events.length > 0) {
    s.pendingEvents = events;
    s.phase = "random_events";
    return s;
  }
  // No events, go to transfer window
  if (s.age >= 18) {
    s.transferSituation = determineTransferSituation(s, clubs);
    s.phase = "transfer_window";
  } else { s.phase = "playing"; }
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

/* ─── Totals ─── */
export function getCareerTotals(seasons: SeasonRecord[]) {
  return seasons.reduce((t, s) => ({
    apps: t.apps + s.apps, goals: t.goals + s.goals, assists: t.assists + s.assists,
    cleanSheets: t.cleanSheets + s.cleanSheets, yellowCards: t.yellowCards + s.yellowCards, redCards: t.redCards + s.redCards,
    leagueTitles: t.leagueTitles + (s.leagueTitle ? 1 : 0), championsLeagues: t.championsLeagues + (s.championsLeague ? 1 : 0),
    worldCups: t.worldCups + (s.worldCup ? 1 : 0), ballonDors: t.ballonDors + (s.ballonDor ? 1 : 0),
  }), { apps: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0, leagueTitles: 0, championsLeagues: 0, worldCups: 0, ballonDors: 0 });
}
