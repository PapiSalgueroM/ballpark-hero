// Soccer Career Simulation Engine

export interface SeasonRecord {
  year: number;
  age: number;
  club: string;
  clubCountry: string;
  clubTier: number; // 1=elite, 2=top, 3=mid, 4=lower, 5=youth
  apps: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  yellowCards: number;
  redCards: number;
  rating: number; // season avg rating 1-10
  leagueTitle: boolean;
  championsLeague: boolean;
  worldCup: boolean;
  ballonDor: boolean;
  type: "youth" | "playing" | "retired" | "manager";
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
  contractYearsLeft: number;
  marketValue: number; // in millions
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
  isManager: boolean;
  managerYears: number;
}

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

export function getFlag(country: string): string {
  return FLAG_MAP[country] || "🏳️";
}

interface Club { name: string; country: string; tier: number; color: string; }

const CLUBS: Club[] = [
  // Tier 1 - Elite
  { name: "Real Madrid", country: "Spain", tier: 1, color: "#FEBE10" },
  { name: "Barcelona", country: "Spain", tier: 1, color: "#A50044" },
  { name: "Bayern Munich", country: "Germany", tier: 1, color: "#DC052D" },
  { name: "Manchester City", country: "England", tier: 1, color: "#6CABDD" },
  { name: "Liverpool", country: "England", tier: 1, color: "#C8102E" },
  { name: "PSG", country: "France", tier: 1, color: "#004170" },
  { name: "Juventus", country: "Italy", tier: 1, color: "#000000" },
  { name: "Inter Milan", country: "Italy", tier: 1, color: "#009BDB" },
  // Tier 2 - Top
  { name: "Arsenal", country: "England", tier: 2, color: "#EF0107" },
  { name: "Chelsea", country: "England", tier: 2, color: "#034694" },
  { name: "Man United", country: "England", tier: 2, color: "#DA291C" },
  { name: "Atletico Madrid", country: "Spain", tier: 2, color: "#CB3524" },
  { name: "Dortmund", country: "Germany", tier: 2, color: "#FDE100" },
  { name: "AC Milan", country: "Italy", tier: 2, color: "#FB090B" },
  { name: "Napoli", country: "Italy", tier: 2, color: "#12A0D7" },
  { name: "Tottenham", country: "England", tier: 2, color: "#132257" },
  { name: "Ajax", country: "Netherlands", tier: 2, color: "#D2122E" },
  { name: "Benfica", country: "Portugal", tier: 2, color: "#FF0000" },
  // Tier 3 - Mid
  { name: "Lyon", country: "France", tier: 3, color: "#1A56DB" },
  { name: "Monaco", country: "France", tier: 3, color: "#E7192E" },
  { name: "Sevilla", country: "Spain", tier: 3, color: "#F43333" },
  { name: "Villarreal", country: "Spain", tier: 3, color: "#FFE667" },
  { name: "Leicester", country: "England", tier: 3, color: "#003090" },
  { name: "West Ham", country: "England", tier: 3, color: "#7A263A" },
  { name: "Wolves", country: "England", tier: 3, color: "#FDB913" },
  { name: "Porto", country: "Portugal", tier: 3, color: "#003F87" },
  { name: "Sporting CP", country: "Portugal", tier: 3, color: "#008B47" },
  { name: "Lazio", country: "Italy", tier: 3, color: "#87D8F7" },
  { name: "Roma", country: "Italy", tier: 3, color: "#8E1F2F" },
  { name: "RB Leipzig", country: "Germany", tier: 3, color: "#DD0741" },
  { name: "Leverkusen", country: "Germany", tier: 3, color: "#E32221" },
  { name: "Feyenoord", country: "Netherlands", tier: 3, color: "#ED1C24" },
  { name: "PSV", country: "Netherlands", tier: 3, color: "#ED1C24" },
  // Tier 4 - Lower
  { name: "Aston Villa", country: "England", tier: 4, color: "#670E36" },
  { name: "Everton", country: "England", tier: 4, color: "#003399" },
  { name: "Brighton", country: "England", tier: 4, color: "#0057B8" },
  { name: "Real Sociedad", country: "Spain", tier: 4, color: "#143C8C" },
  { name: "Real Betis", country: "Spain", tier: 4, color: "#00954C" },
  { name: "Marseille", country: "France", tier: 4, color: "#2FAEE0" },
  { name: "Lille", country: "France", tier: 4, color: "#E31E24" },
  { name: "Fiorentina", country: "Italy", tier: 4, color: "#50267E" },
  { name: "Atalanta", country: "Italy", tier: 4, color: "#1E71B8" },
  { name: "Frankfurt", country: "Germany", tier: 4, color: "#E1000F" },
  { name: "Celtic", country: "Scotland", tier: 4, color: "#008B47" },
  { name: "Rangers", country: "Scotland", tier: 4, color: "#0000FF" },
  { name: "Galatasaray", country: "Turkey", tier: 4, color: "#FDB913" },
  { name: "Fenerbahce", country: "Turkey", tier: 4, color: "#FFED00" },
];

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

function getClubsByTier(tier: number): Club[] {
  return CLUBS.filter(c => c.tier === tier);
}

function calcOverall(s: CareerState): number {
  if (s.position === "GK") {
    return Math.round(s.reflexes * 0.3 + s.defending * 0.2 + s.physical * 0.2 + s.pace * 0.1 + s.passing * 0.1 + s.dribbling * 0.05 + s.shooting * 0.05);
  }
  return Math.round((s.pace + s.shooting + s.passing + s.dribbling + s.defending + s.physical) / 6);
}

function growStat(current: number, age: number, position: string): number {
  let growth = 0;
  if (age <= 20) growth = rand(2, 6);
  else if (age <= 24) growth = rand(1, 4);
  else if (age <= 28) growth = rand(-1, 2);
  else if (age <= 32) growth = rand(-3, 0);
  else if (age <= 35) growth = rand(-5, -1);
  else growth = rand(-7, -2);
  return clamp(current + growth, 20, 99);
}

function generateSeasonStats(state: CareerState): Omit<SeasonRecord, "leagueTitle" | "championsLeague" | "worldCup" | "ballonDor" | "type"> {
  const { position, age, overall } = state;
  const isGK = position === "GK";
  const tierMult = Math.max(0.6, 1 - (state.currentClubTier - 1) * 0.1);
  const ageMult = age <= 20 ? 0.7 : age <= 24 ? 0.85 : age <= 30 ? 1 : age <= 34 ? 0.8 : 0.6;
  const qualityMult = overall / 75;

  let apps = Math.round(rand(20, 38) * ageMult);
  if (age <= 18) apps = rand(5, 20);

  let goals = 0, assists = 0, cleanSheets = 0;

  if (isGK) {
    cleanSheets = Math.round(apps * rand(15, 40) / 100 * qualityMult * tierMult);
    assists = rand(0, 2);
  } else if (["ST", "LW", "RW", "CAM"].includes(position)) {
    goals = Math.round(apps * rand(20, 55) / 100 * qualityMult * tierMult);
    assists = Math.round(apps * rand(10, 30) / 100 * qualityMult);
  } else if (["CM", "CDM"].includes(position)) {
    goals = Math.round(apps * rand(5, 15) / 100 * qualityMult);
    assists = Math.round(apps * rand(8, 25) / 100 * qualityMult);
  } else {
    goals = Math.round(apps * rand(2, 10) / 100 * qualityMult);
    assists = Math.round(apps * rand(5, 20) / 100 * qualityMult);
  }

  const yellowCards = rand(1, 10);
  const redCards = Math.random() < 0.12 ? rand(1, 2) : 0;
  const rating = clamp(parseFloat((5.5 + (overall - 50) / 20 + (Math.random() - 0.5)).toFixed(1)), 4.0, 9.8);

  return {
    year: state.seasons.length > 0 ? state.seasons[state.seasons.length - 1].year + 1 : 0,
    age,
    club: state.currentClub,
    clubCountry: state.currentClubCountry,
    clubTier: state.currentClubTier,
    apps,
    goals,
    assists,
    cleanSheets,
    yellowCards,
    redCards,
    rating,
  };
}

function shouldGetTransfer(state: CareerState): Club | null {
  const { overall, age, currentClubTier } = state;

  // Youth academy exit at 18-19
  if (state.currentClub === "Youth Academy" && age >= 18) {
    const targetTier = overall >= 65 ? 3 : overall >= 58 ? 4 : 4;
    const clubs = getClubsByTier(targetTier);
    return pick(clubs);
  }

  // Big club signing
  if (overall >= 82 && currentClubTier > 1 && Math.random() < 0.6) {
    return pick(getClubsByTier(1));
  }
  if (overall >= 75 && currentClubTier > 2 && Math.random() < 0.5) {
    return pick(getClubsByTier(2));
  }

  // Step up
  if (overall >= 70 && currentClubTier >= 3 && Math.random() < 0.35) {
    return pick(getClubsByTier(Math.max(1, currentClubTier - 1)));
  }

  // Contract expiry move
  if (state.contractYearsLeft <= 0 && Math.random() < 0.7) {
    const tier = clamp(currentClubTier + rand(-1, 1), 1, 4);
    return pick(getClubsByTier(tier));
  }

  // Declining player goes down
  if (age >= 33 && overall < 70 && Math.random() < 0.5) {
    return pick(getClubsByTier(Math.min(4, currentClubTier + 1)));
  }

  return null;
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

export function initCareer(
  playerName: string, nationality: string, position: string, era: string,
  stats: { pace: number; shooting: number; passing: number; dribbling: number; defending: number; physical: number; reflexes: number; },
  overall: number, startYear: number,
): CareerState {
  return {
    playerName, nationality, position, era,
    age: 16,
    currentClub: "Youth Academy",
    currentClubCountry: nationality,
    currentClubTier: 5,
    contractYearsLeft: 3,
    marketValue: 0.1,
    ...stats,
    overall,
    seasons: [{
      year: startYear,
      age: 16,
      club: "Youth Academy",
      clubCountry: nationality,
      clubTier: 5,
      apps: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0,
      rating: 0,
      leagueTitle: false, championsLeague: false, worldCup: false, ballonDor: false,
      type: "youth",
    }],
    events: ["📋 Joined the Youth Academy aged 16"],
    retired: false,
    isManager: false,
    managerYears: 0,
  };
}

export function advanceSeason(prev: CareerState): CareerState {
  const s = { ...prev };
  s.age += 1;
  s.events = [];

  // Retirement check
  if (s.age >= 38 || (s.age >= 34 && s.overall < 60 && Math.random() < 0.5)) {
    s.retired = true;
    s.events.push("👋 Announced retirement from professional football");
    s.seasons = [...s.seasons, {
      year: s.seasons[s.seasons.length - 1].year + 1,
      age: s.age, club: s.currentClub, clubCountry: s.currentClubCountry, clubTier: s.currentClubTier,
      apps: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0, rating: 0,
      leagueTitle: false, championsLeague: false, worldCup: false, ballonDor: false, type: "retired",
    }];
    return s;
  }

  // Grow stats
  s.pace = growStat(s.pace, s.age, s.position);
  s.shooting = growStat(s.shooting, s.age, s.position);
  s.passing = growStat(s.passing, s.age, s.position);
  s.dribbling = growStat(s.dribbling, s.age, s.position);
  s.defending = growStat(s.defending, s.age, s.position);
  s.physical = growStat(s.physical, s.age, s.position);
  s.reflexes = growStat(s.reflexes, s.age, s.position);
  s.overall = calcOverall(s);
  s.contractYearsLeft = Math.max(0, s.contractYearsLeft - 1);

  // Transfer check
  const transfer = shouldGetTransfer(s);
  if (transfer) {
    const fee = s.currentClub === "Youth Academy" ? 0 : calcMarketValue(s.overall, s.age, s.position);
    s.events.push(`✍️ Signed for ${transfer.name} ${getFlag(transfer.country)}${fee > 0 ? ` for €${fee}M` : ''}`);
    s.currentClub = transfer.name;
    s.currentClubCountry = transfer.country;
    s.currentClubTier = transfer.tier;
    s.contractYearsLeft = rand(2, 5);
  } else if (s.contractYearsLeft <= 1 && s.currentClub !== "Youth Academy") {
    s.contractYearsLeft = rand(2, 4);
    s.events.push(`📝 Renewed contract for ${s.contractYearsLeft} years`);
  }

  // Generate season
  const seasonStats = generateSeasonStats(s);
  const lastYear = s.seasons[s.seasons.length - 1].year;

  // Trophies
  const winLeague = s.currentClubTier <= 2 && Math.random() < (0.35 / s.currentClubTier);
  const winCL = s.currentClubTier <= 2 && s.overall >= 78 && Math.random() < 0.08;
  const isWCYear = (lastYear + 1) % 4 === 2; // WC years
  const winWC = isWCYear && s.overall >= 80 && Math.random() < 0.06;
  const winBdor = s.overall >= 88 && Math.random() < 0.15;

  if (winLeague) s.events.push(`🏆 Won the league with ${s.currentClub}!`);
  if (winCL) s.events.push(`⭐ Won the Champions League!`);
  if (winWC) s.events.push(`🌍 Won the World Cup with ${s.nationality}!`);
  if (winBdor) s.events.push(`🏅 Won the Ballon d'Or!`);

  // Injury event
  if (Math.random() < 0.15) {
    const weeks = rand(2, 12);
    s.events.push(`🤕 Missed ${weeks} weeks with injury`);
  }

  // Milestone events
  const totalGoals = s.seasons.reduce((sum, ss) => sum + ss.goals, 0) + seasonStats.goals;
  const totalApps = s.seasons.reduce((sum, ss) => sum + ss.apps, 0) + seasonStats.apps;
  if (totalGoals >= 100 && totalGoals - seasonStats.goals < 100) s.events.push("💯 Reached 100 career goals!");
  if (totalGoals >= 200 && totalGoals - seasonStats.goals < 200) s.events.push("🔥 Reached 200 career goals!");
  if (totalApps >= 500 && totalApps - seasonStats.apps < 500) s.events.push("🎖️ Made 500th career appearance!");

  if (s.events.length === 0) {
    s.events.push(`⚽ Completed the ${lastYear + 1}/${(lastYear + 2).toString().slice(-2)} season`);
  }

  s.marketValue = calcMarketValue(s.overall, s.age, s.position);

  s.seasons = [...s.seasons, {
    ...seasonStats,
    year: lastYear + 1,
    leagueTitle: winLeague,
    championsLeague: winCL,
    worldCup: winWC,
    ballonDor: winBdor,
    type: "playing",
  }];

  return s;
}

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

export function getClubColor(clubName: string): string {
  return CLUBS.find(c => c.name === clubName)?.color || "#22c55e";
}
