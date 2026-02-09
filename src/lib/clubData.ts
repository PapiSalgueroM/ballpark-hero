// Club badge URLs from public football APIs/CDNs
// Using logo.clearbit.com for reliable club logos

const clubLogos: Record<string, string> = {
  // Premier League
  "Manchester City": "https://crests.football-data.org/65.png",
  "Liverpool": "https://crests.football-data.org/64.png",
  "Arsenal": "https://crests.football-data.org/57.png",
  "Chelsea": "https://crests.football-data.org/61.png",
  "Manchester United": "https://crests.football-data.org/66.png",
  "Tottenham": "https://crests.football-data.org/73.png",
  "Newcastle": "https://crests.football-data.org/67.png",
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
};

export function getClubLogoUrl(club: string): string {
  return clubLogos[club] || '';
}

// Map clubs to their leagues for comparison logic
const clubLeagueMap: Record<string, string> = {
  "Manchester City": "Premier League",
  "Liverpool": "Premier League",
  "Arsenal": "Premier League",
  "Chelsea": "Premier League",
  "Manchester United": "Premier League",
  "Tottenham": "Premier League",
  "Newcastle": "Premier League",
  "Real Madrid": "La Liga",
  "Barcelona": "La Liga",
  "Atlético Madrid": "La Liga",
  "Inter Milan": "Serie A",
  "AC Milan": "Serie A",
  "Juventus": "Serie A",
  "Roma": "Serie A",
  "Atalanta": "Serie A",
  "Bayern Munich": "Bundesliga",
  "Bayer Leverkusen": "Bundesliga",
  "Borussia Dortmund": "Bundesliga",
  "RB Leipzig": "Bundesliga",
  "PSG": "Ligue 1",
};

export function getClubLeague(club: string): string {
  return clubLeagueMap[club] || 'Unknown';
}

// Player image helper using a search-friendly URL
export function getPlayerImageUrl(playerName: string): string {
  // Using football API placeholder - in production you'd use a real API
  const encoded = encodeURIComponent(playerName);
  return `https://ui-avatars.com/api/?name=${encoded}&size=128&background=1a1a2e&color=4ade80&bold=true&format=svg`;
}
