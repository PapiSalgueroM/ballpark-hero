// NOTE: a club-crest URL map + getClubLogoUrl() used to live here (Wikipedia /
// football-data.org hotlinked club badges). Removed as part of the IP audit
// (MASTER_PLAN #111): official club crests are trademarked assets and this
// export had zero callers anywhere in src/, so deleting it is a pure cleanup
// with no behavior change. Do not re-add real club logos/crests here.

export function getClubLeague(club: string): string {
  return clubLeagueMap[club] || 'Unknown';
}

const clubLeagueMap: Record<string, string> = {
  "Manchester City": "Premier League", "Liverpool": "Premier League", "Arsenal": "Premier League",
  "Chelsea": "Premier League", "Manchester United": "Premier League", "Tottenham": "Premier League",
  "Newcastle": "Premier League", "Aston Villa": "Premier League", "Nottingham Forest": "Premier League",
  "Real Madrid": "La Liga", "Barcelona": "La Liga", "Atlético Madrid": "La Liga",
  "Inter Milan": "Serie A", "AC Milan": "Serie A", "Juventus": "Serie A", "Roma": "Serie A", "Atalanta": "Serie A",
  "Bayern Munich": "Bundesliga", "Bayer Leverkusen": "Bundesliga", "Borussia Dortmund": "Bundesliga", "RB Leipzig": "Bundesliga",
  "PSG": "Ligue 1", "Marseille": "Ligue 1", "Lille": "Ligue 1",
  "Porto": "Liga Portugal", "Benfica": "Liga Portugal", "Sporting CP": "Liga Portugal",
  "Ajax": "Eredivisie", "PSV": "Eredivisie", "Feyenoord": "Eredivisie",
  "Galatasaray": "Turkish Süper Lig", "Fenerbahçe": "Turkish Süper Lig",
  "Al-Nassr": "Saudi Pro League", "Al-Hilal": "Saudi Pro League", "Al-Ittihad": "Saudi Pro League", "Al-Ahli": "Saudi Pro League",
  "Inter Miami": "MLS", "LA Galaxy": "MLS", "LAFC": "MLS", "Toronto FC": "MLS", "DC United": "MLS",
  "Palmeiras": "Brazilian Série A", "Botafogo": "Brazilian Série A", "Flamengo": "Brazilian Série A", "Santos": "Brazilian Série A", "Fluminense": "Brazilian Série A",
  "Celtic": "Scottish Premiership",
  "Basel": "Swiss Super League",
  "RB Salzburg": "Austrian Bundesliga",
  "Olympiacos": "Greek Super League",
  "Copenhagen": "Danish Superliga",
  "Monaco": "Ligue 1", "Lyon": "Ligue 1", "Rennes": "Ligue 1", "Lens": "Ligue 1",
  "Fiorentina": "Serie A", "Napoli": "Serie A", "Palermo": "Serie A", "Udinese": "Serie A", "Sampdoria": "Serie A",
  "Sevilla": "La Liga", "Real Sociedad": "La Liga", "Villarreal": "La Liga", "Las Palmas": "La Liga",
  "Werder Bremen": "Bundesliga", "VfL Wolfsburg": "Bundesliga", "Hamburg": "Bundesliga",
  "Southampton": "Premier League", "West Ham": "Premier League", "Everton": "Premier League", "Birmingham City": "Championship",
};

export function getPlayerImageUrl(playerName: string): string {
  const encoded = encodeURIComponent(playerName);
  return `https://ui-avatars.com/api/?name=${encoded}&size=128&background=1a1a2e&color=4ade80&bold=true&format=svg`;
}
