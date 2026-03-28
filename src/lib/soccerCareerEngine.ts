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
  wage: number; // weekly wage in thousands
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
  // UI flow state
  phase: "youth" | "contract_offer" | "playing" | "season_summary" | "retired";
  pendingOffers: ContractOffer[];
  pendingSummary: SeasonRecord | null;
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

function growStat(current: number, age: number, isYouth: boolean): number {
  let growth: number;
  if (isYouth) {
    growth = rand(2, 4);
  } else if (age <= 22) {
    growth = rand(1, 3);
  } else if (age <= 26) {
    growth = rand(1, 3);
  } else if (age <= 29) {
    growth = rand(-1, 2);
  } else if (age <= 32) {
    growth = rand(-3, 0);
  } else if (age <= 35) {
    growth = rand(-5, -1);
  } else {
    growth = rand(-7, -2);
  }
  return clamp(current + growth, 20, 99);
}

function growStatByApps(current: number, apps: number): number {
  // More appearances = better growth (1-3 pts)
  const bonus = apps >= 25 ? rand(1, 3) : apps >= 15 ? rand(1, 2) : rand(0, 1);
  return clamp(current + bonus, 20, 99);
}

function calcMarketValue(overall: number, age: number, position: string): number {
  let base = Math.pow(Math.max(0, overall - 50), 2) * 0.02;
  if (age <= 22) base *= 1.4;
  else if (age <= 26) base *= 1.2;
  else if (age >= 30) base *= 0.7;
  else if (age >= 33) base *= 0.3;
  if (["ST", "LW", "RW"].includes(position)) base *= 1.15;
  if (position === "GK") base *= 0.7;
  return Math.max(0.1, Math.round(base * 10) / 10);
}

/* ─── Generate contract offers ─── */
export function generateContractOffers(clubs: ClubData[], overall: number, age: number): ContractOffer[] {
  let targetTiers: number[];

  if (overall >= 66) {
    targetTiers = [2, 2, 3]; // Higher league clubs
  } else if (overall >= 56) {
    targetTiers = [3, 3, 3]; // Mid-table lower
  } else {
    targetTiers = [3, 4, 4]; // Lower league
  }

  const offers: ContractOffer[] = [];
  const usedNames = new Set<string>();

  for (const tier of targetTiers) {
    const candidates = getClubsByTier(clubs, tier).filter(c => !usedNames.has(c.name));
    if (candidates.length === 0) continue;
    const club = pick(candidates);
    usedNames.add(club.name);
    offers.push({
      club,
      contractYears: rand(2, 4),
      wage: tier === 1 ? rand(40, 120) : tier === 2 ? rand(15, 50) : tier === 3 ? rand(3, 15) : rand(1, 5),
    });
  }

  return offers;
}

/* ─── Generate transfer offers for established players ─── */
export function generateTransferOffers(clubs: ClubData[], state: CareerState): ContractOffer[] {
  const { overall, age, currentClub, currentClubTier } = state;
  const offers: ContractOffer[] = [];
  const usedNames = new Set<string>([currentClub]);

  // Determine target tiers based on overall
  let targetTiers: number[] = [];
  if (overall >= 82 && currentClubTier > 1) targetTiers = [1, 1, 2];
  else if (overall >= 75 && currentClubTier > 1) targetTiers = [1, 2, 2];
  else if (overall >= 70) targetTiers = [Math.max(1, currentClubTier - 1), currentClubTier, currentClubTier];
  else if (overall >= 60) targetTiers = [currentClubTier, currentClubTier, Math.min(4, currentClubTier + 1)];
  else targetTiers = [Math.min(4, currentClubTier + 1), Math.min(4, currentClubTier + 1), currentClubTier];

  // Declining older player
  if (age >= 33 && overall < 70) targetTiers = [Math.min(4, currentClubTier + 1), Math.min(4, currentClubTier + 1), Math.min(4, currentClubTier + 1)];

  for (const tier of targetTiers) {
    const candidates = getClubsByTier(clubs, tier).filter(c => !usedNames.has(c.name));
    if (candidates.length === 0) continue;
    const club = pick(candidates);
    usedNames.add(club.name);
    offers.push({
      club,
      contractYears: rand(2, 5),
      wage: tier === 1 ? rand(50, 200) : tier === 2 ? rand(20, 80) : tier === 3 ? rand(5, 25) : rand(1, 8),
    });
  }

  return offers;
}

/* ─── Season simulation ─── */
function generateSeasonStats(state: CareerState, isFirstSeason: boolean): SeasonRecord {
  const { position, age, overall, currentClubTier } = state;
  const isGK = position === "GK";
  const qualityMult = overall / 75;
  const lastYear = state.seasons.length > 0 ? state.seasons[state.seasons.length - 1].year : 0;

  // Appearances
  let apps: number;
  if (isFirstSeason) {
    // First pro season: 5-20 based on rating vs club level
    const ratingAdvantage = overall - (70 - currentClubTier * 5); // Higher = more advantage
    apps = clamp(rand(5, 12) + Math.round(ratingAdvantage / 5), 5, 20);
  } else {
    const ageMult = age <= 20 ? 0.75 : age <= 30 ? 1 : age <= 34 ? 0.85 : 0.65;
    apps = Math.round(rand(22, 38) * ageMult);
    if (age <= 20) apps = rand(12, 28);
  }

  let goals = 0, assists = 0, cleanSheets = 0;
  if (isGK) {
    cleanSheets = Math.round(apps * rand(15, 40) / 100 * qualityMult);
    assists = rand(0, 2);
  } else if (["ST", "LW", "RW", "CAM"].includes(position)) {
    goals = Math.max(0, Math.round(apps * rand(18, 50) / 100 * qualityMult));
    assists = Math.max(0, Math.round(apps * rand(8, 28) / 100 * qualityMult));
  } else if (["CM", "CDM"].includes(position)) {
    goals = Math.max(0, Math.round(apps * rand(4, 14) / 100 * qualityMult));
    assists = Math.max(0, Math.round(apps * rand(6, 22) / 100 * qualityMult));
  } else {
    goals = Math.max(0, Math.round(apps * rand(2, 8) / 100 * qualityMult));
    assists = Math.max(0, Math.round(apps * rand(4, 18) / 100 * qualityMult));
  }

  const yellowCards = rand(0, Math.min(10, apps));
  const redCards = Math.random() < 0.1 ? rand(1, 2) : 0;
  const rating = clamp(parseFloat((5.5 + (overall - 50) / 18 + (Math.random() - 0.5) * 1.2).toFixed(1)), 4.0, 9.8);

  // Trophies
  const winLeague = currentClubTier <= 2 && Math.random() < (0.3 / currentClubTier);
  const winCL = currentClubTier === 1 && overall >= 78 && Math.random() < 0.07;
  const isWCYear = (lastYear + 1) % 4 === 2;
  const winWC = isWCYear && overall >= 80 && Math.random() < 0.05;
  const winBdor = overall >= 88 && Math.random() < 0.12;

  return {
    year: lastYear + 1,
    age,
    club: state.currentClub,
    clubCountry: state.currentClubCountry,
    clubTier: currentClubTier,
    apps, goals, assists, cleanSheets, yellowCards, redCards, rating,
    leagueTitle: winLeague,
    championsLeague: winCL,
    worldCup: winWC,
    ballonDor: winBdor,
    type: "playing",
  };
}

/* ─── Init career ─── */
export function initCareer(
  playerName: string, nationality: string, position: string, era: string,
  stats: { pace: number; shooting: number; passing: number; dribbling: number; defending: number; physical: number; reflexes: number },
  overall: number, startYear: number, clubs: ClubData[],
): CareerState {
  const academyClub = getYouthAcademyClub(clubs, nationality);

  return {
    playerName, nationality, position, era,
    age: 16,
    currentClub: `${academyClub.name} Youth`,
    currentClubCountry: academyClub.country,
    currentClubTier: academyClub.tier,
    currentClubColor: academyClub.color,
    currentLeague: academyClub.league,
    contractYearsLeft: 2,
    marketValue: 0.1,
    ...stats, overall,
    seasons: [{
      year: startYear, age: 16,
      club: `${academyClub.name} Youth`, clubCountry: academyClub.country, clubTier: academyClub.tier,
      apps: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0, rating: 0,
      leagueTitle: false, championsLeague: false, worldCup: false, ballonDor: false,
      type: "youth",
    }],
    events: [`📋 Joined ${academyClub.name} Youth Academy aged 16`],
    retired: false,
    phase: "youth",
    pendingOffers: [],
    pendingSummary: null,
  };
}

/* ─── Advance youth year ─── */
export function advanceYouthYear(prev: CareerState, clubs: ClubData[]): CareerState {
  const s = { ...prev };
  s.age += 1;
  s.events = [];

  // Youth academy stat growth: 2-4 points
  s.pace = growStat(s.pace, s.age, true);
  s.shooting = growStat(s.shooting, s.age, true);
  s.passing = growStat(s.passing, s.age, true);
  s.dribbling = growStat(s.dribbling, s.age, true);
  s.defending = growStat(s.defending, s.age, true);
  s.physical = growStat(s.physical, s.age, true);
  s.reflexes = growStat(s.reflexes, s.age, true);
  s.overall = calcOverall(s, s.position);

  // Add youth season
  const lastYear = s.seasons[s.seasons.length - 1].year;
  s.seasons = [...s.seasons, {
    year: lastYear + 1, age: s.age,
    club: s.currentClub, clubCountry: s.currentClubCountry, clubTier: s.currentClubTier,
    apps: rand(10, 25), goals: s.position === "GK" ? 0 : rand(0, 8), assists: rand(0, 5),
    cleanSheets: s.position === "GK" ? rand(2, 8) : 0,
    yellowCards: rand(0, 4), redCards: 0, rating: 0,
    leagueTitle: false, championsLeague: false, worldCup: false, ballonDor: false,
    type: "youth",
  }];

  s.events.push(`📈 Stats improved during youth development (OVR ${s.overall})`);

  // At age 17, offer professional contract
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
  s.currentClub = offer.club.name;
  s.currentClubCountry = offer.club.country;
  s.currentClubTier = offer.club.tier;
  s.currentClubColor = offer.club.color;
  s.currentLeague = offer.club.league;
  s.contractYearsLeft = offer.contractYears;
  s.phase = "playing";
  s.pendingOffers = [];
  s.events = [`✍️ Signed professional contract with ${offer.club.name} ${getFlag(offer.club.country)} (${offer.contractYears}yr, €${offer.wage}k/wk)`];
  return s;
}

/* ─── Advance pro season ─── */
export function advanceProSeason(prev: CareerState, clubs: ClubData[]): CareerState {
  const s = { ...prev };
  s.age += 1;
  s.events = [];

  // Retirement
  if (s.age >= 38 || (s.age >= 34 && s.overall < 58 && Math.random() < 0.5)) {
    s.retired = true;
    s.phase = "retired";
    s.events.push("👋 Announced retirement from professional football");
    const lastYear = s.seasons[s.seasons.length - 1].year;
    s.seasons = [...s.seasons, {
      year: lastYear + 1, age: s.age,
      club: s.currentClub, clubCountry: s.currentClubCountry, clubTier: s.currentClubTier,
      apps: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0, rating: 0,
      leagueTitle: false, championsLeague: false, worldCup: false, ballonDor: false,
      type: "retired",
    }];
    return s;
  }

  // Check if this is the first pro season
  const playingSeasons = s.seasons.filter(ss => ss.type === "playing");
  const isFirstSeason = playingSeasons.length === 0;

  // Generate season
  const season = generateSeasonStats(s, isFirstSeason);

  // Stat growth based on appearances
  s.pace = growStatByApps(growStat(s.pace, s.age, false), season.apps);
  s.shooting = growStatByApps(growStat(s.shooting, s.age, false), season.apps);
  s.passing = growStatByApps(growStat(s.passing, s.age, false), season.apps);
  s.dribbling = growStatByApps(growStat(s.dribbling, s.age, false), season.apps);
  s.defending = growStatByApps(growStat(s.defending, s.age, false), season.apps);
  s.physical = growStatByApps(growStat(s.physical, s.age, false), season.apps);
  s.reflexes = growStatByApps(growStat(s.reflexes, s.age, false), season.apps);
  s.overall = calcOverall(s, s.position);

  s.contractYearsLeft = Math.max(0, s.contractYearsLeft - 1);
  s.marketValue = calcMarketValue(s.overall, s.age, s.position);

  // Events
  if (season.leagueTitle) s.events.push(`🏆 Won the league with ${s.currentClub}!`);
  if (season.championsLeague) s.events.push(`⭐ Won the Champions League!`);
  if (season.worldCup) s.events.push(`🌍 Won the World Cup with ${s.nationality}!`);
  if (season.ballonDor) s.events.push(`🏅 Won the Ballon d'Or!`);
  if (Math.random() < 0.12) s.events.push(`🤕 Missed ${rand(2, 10)} weeks with injury`);

  // Milestone events
  const totalGoals = s.seasons.reduce((sum, ss) => sum + ss.goals, 0) + season.goals;
  const totalApps = s.seasons.reduce((sum, ss) => sum + ss.apps, 0) + season.apps;
  if (totalGoals >= 100 && totalGoals - season.goals < 100) s.events.push("💯 Reached 100 career goals!");
  if (totalGoals >= 200 && totalGoals - season.goals < 200) s.events.push("🔥 Reached 200 career goals!");
  if (totalApps >= 500 && totalApps - season.apps < 500) s.events.push("🎖️ Made 500th career appearance!");

  s.seasons = [...s.seasons, season];

  // Show season summary, then check for transfer
  s.pendingSummary = season;
  s.phase = "season_summary";

  // Check if transfer offer comes
  const shouldTransfer = s.contractYearsLeft <= 0 ||
    (s.overall >= 75 && s.currentClubTier > 1 && Math.random() < 0.4) ||
    (s.overall >= 82 && s.currentClubTier > 1 && Math.random() < 0.6) ||
    (s.age >= 33 && s.overall < 65 && Math.random() < 0.4);

  if (shouldTransfer) {
    s.pendingOffers = generateTransferOffers(clubs, s);
    if (s.pendingOffers.length > 0) {
      s.events.push("📩 Transfer offers received!");
    }
  } else if (s.contractYearsLeft <= 1 && !shouldTransfer) {
    s.contractYearsLeft = rand(2, 4);
    s.events.push(`📝 Renewed contract with ${s.currentClub} for ${s.contractYearsLeft} years`);
  }

  if (s.events.length === 0) {
    s.events.push(`⚽ Solid season at ${s.currentClub}`);
  }

  return s;
}

/* ─── Dismiss summary (continue or choose transfer) ─── */
export function dismissSummary(prev: CareerState): CareerState {
  const s = { ...prev };
  s.pendingSummary = null;
  if (s.pendingOffers.length > 0) {
    s.phase = "contract_offer";
  } else {
    s.phase = "playing";
  }
  return s;
}

/* ─── Stay at current club (decline all offers) ─── */
export function stayAtClub(prev: CareerState): CareerState {
  const s = { ...prev };
  s.pendingOffers = [];
  s.phase = "playing";
  if (s.contractYearsLeft <= 0) {
    s.contractYearsLeft = rand(2, 4);
    s.events = [...s.events, `📝 Renewed contract with ${s.currentClub} for ${s.contractYearsLeft} years`];
  }
  return s;
}

/* ─── Totals ─── */
export function getCareerTotals(seasons: SeasonRecord[]) {
  return seasons.reduce((t, s) => ({
    apps: t.apps + s.apps,
    goals: t.goals + s.goals,
    assists: t.assists + s.assists,
    cleanSheets: t.cleanSheets + s.cleanSheets,
    yellowCards: t.yellowCards + s.yellowCards,
    redCards: t.redCards + s.redCards,
    leagueTitles: t.leagueTitles + (s.leagueTitle ? 1 : 0),
    championsLeagues: t.championsLeagues + (s.championsLeague ? 1 : 0),
    worldCups: t.worldCups + (s.worldCup ? 1 : 0),
    ballonDors: t.ballonDors + (s.ballonDor ? 1 : 0),
  }), { apps: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0, leagueTitles: 0, championsLeagues: 0, worldCups: 0, ballonDors: 0 });
}
