const clubLogos: Record<string, string> = {
  // Premier League
  "Manchester City": "https://crests.football-data.org/65.png",
  "Liverpool": "https://crests.football-data.org/64.png",
  "Arsenal": "https://crests.football-data.org/57.png",
  "Chelsea": "https://crests.football-data.org/61.png",
  "Manchester United": "https://crests.football-data.org/66.png",
  "Tottenham": "https://crests.football-data.org/73.png",
  "Newcastle": "https://crests.football-data.org/67.png",
  "Aston Villa": "https://crests.football-data.org/58.png",
  "Nottingham Forest": "https://crests.football-data.org/351.png",
  // La Liga
  "Real Madrid": "https://crests.football-data.org/86.png",
  "Barcelona": "https://crests.football-data.org/81.png",
  "Atlético Madrid": "https://crests.football-data.org/78.png",
  // Serie A
  "Inter Milan": "https://crests.football-data.org/108.png",
  "AC Milan": "https://crests.football-data.org/98.png",
  "Juventus": "https://crests.football-data.org/109.png",
  "Roma": "https://crests.football-data.org/100.png",
  "Atalanta": "https://crests.football-data.org/102.png",
  // Bundesliga
  "Bayern Munich": "https://crests.football-data.org/5.png",
  "Bayer Leverkusen": "https://crests.football-data.org/3.png",
  "Borussia Dortmund": "https://crests.football-data.org/4.png",
  "RB Leipzig": "https://crests.football-data.org/721.png",
  // Ligue 1
  "PSG": "https://crests.football-data.org/524.png",
  "Marseille": "https://crests.football-data.org/516.png",
  "Lille": "https://crests.football-data.org/521.png",
  // Liga Portugal
  "Porto": "https://crests.football-data.org/503.png",
  "Benfica": "https://crests.football-data.org/1903.png",
  "Sporting CP": "https://crests.football-data.org/498.png",
  // Eredivisie
  "Ajax": "https://crests.football-data.org/678.png",
  "PSV": "https://crests.football-data.org/674.png",
  "Feyenoord": "https://crests.football-data.org/675.png",
  // Turkish
  "Galatasaray": "https://crests.football-data.org/610.png",
  "Fenerbahçe": "https://crests.football-data.org/611.png",
  // Saudi
  "Al-Nassr": "https://upload.wikimedia.org/wikipedia/en/thumb/2/2e/Al-Nassr_FC.svg/120px-Al-Nassr_FC.svg.png",
  "Al-Hilal": "https://upload.wikimedia.org/wikipedia/en/thumb/3/34/Al_Hilal_SFC.svg/120px-Al_Hilal_SFC.svg.png",
  "Al-Ittihad": "https://upload.wikimedia.org/wikipedia/en/thumb/1/12/Ittihad_FC.png/120px-Ittihad_FC.png",
  "Al-Ahli": "https://upload.wikimedia.org/wikipedia/en/thumb/1/1b/Al-Ahli_Saudi_FC.svg/120px-Al-Ahli_Saudi_FC.svg.png",
  // MLS
  "Inter Miami": "https://upload.wikimedia.org/wikipedia/en/thumb/8/8a/Inter_Miami_CF_logo.svg/120px-Inter_Miami_CF_logo.svg.png",
  "LA Galaxy": "https://upload.wikimedia.org/wikipedia/en/thumb/6/63/LA_Galaxy_logo.svg/120px-LA_Galaxy_logo.svg.png",
  "LAFC": "https://upload.wikimedia.org/wikipedia/en/thumb/5/55/Los_Angeles_FC_logo.svg/120px-Los_Angeles_FC_logo.svg.png",
  "Toronto FC": "https://upload.wikimedia.org/wikipedia/en/thumb/4/46/Toronto_FC_Logo.svg/120px-Toronto_FC_Logo.svg.png",
  "DC United": "https://upload.wikimedia.org/wikipedia/en/thumb/4/48/D.C._United_logo_%282024%29.svg/120px-D.C._United_logo_%282024%29.svg.png",
  // Brazil
  "Palmeiras": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Palmeiras_logo.svg/120px-Palmeiras_logo.svg.png",
  "Botafogo": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Botafogo_de_Futebol_e_Regatas_logo.svg/120px-Botafogo_de_Futebol_e_Regatas_logo.svg.png",
  // Scottish
  "Celtic": "https://crests.football-data.org/732.png",
  // Swiss
  "Basel": "https://crests.football-data.org/1544.png",
  // Austrian
  "RB Salzburg": "https://crests.football-data.org/1877.png",
  // Greek
  "Olympiacos": "https://upload.wikimedia.org/wikipedia/en/thumb/e/e9/Olympiacos_FC_logo.svg/120px-Olympiacos_FC_logo.svg.png",
  // Danish
  "Copenhagen": "https://upload.wikimedia.org/wikipedia/en/thumb/9/93/F.C._Copenhagen_logo.svg/120px-F.C._Copenhagen_logo.svg.png",
  // Career mode extras
  "Monaco": "https://crests.football-data.org/548.png",
  "Flamengo": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Flamengo_bw.svg/120px-Flamengo_bw.svg.png",
  "Santos": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Santos_Logo.png/120px-Santos_Logo.png",
  "Lyon": "https://crests.football-data.org/523.png",
  "Fiorentina": "https://crests.football-data.org/99.png",
  "Sevilla": "https://crests.football-data.org/559.png",
  "Werder Bremen": "https://crests.football-data.org/12.png",
  "VfL Wolfsburg": "https://crests.football-data.org/11.png",
};

export function getClubLogoUrl(club: string): string {
  return clubLogos[club] || '';
}

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
  "Palmeiras": "Brazilian Série A", "Botafogo": "Brazilian Série A",
  "Celtic": "Scottish Premiership",
  "Basel": "Swiss Super League",
  "RB Salzburg": "Austrian Bundesliga",
  "Olympiacos": "Greek Super League",
  "Copenhagen": "Danish Superliga",
};

export function getPlayerImageUrl(playerName: string): string {
  const encoded = encodeURIComponent(playerName);
  return `https://ui-avatars.com/api/?name=${encoded}&size=128&background=1a1a2e&color=4ade80&bold=true&format=svg`;
}
