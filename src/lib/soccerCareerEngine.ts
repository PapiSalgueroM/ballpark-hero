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
  weeklyWage: number; // euros per week
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
  phase: "youth" | "contract_offer" | "playing" | "season_summary" | "transfer_window" | "retired";
  pendingOffers: ContractOffer[];
  pendingSummary: SeasonRecord | null;
  transferSituation: TransferSituation | null;
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

/* ─── Dismiss summary → transfer window ─── */
export function dismissSummary(prev: CareerState, clubs: ClubData[]): CareerState {
  const s = { ...prev }; s.pendingSummary = null;
  if (s.retired) { s.phase = "retired"; return s; }
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
