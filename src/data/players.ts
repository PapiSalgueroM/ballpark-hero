import { Player } from '@/types/game';

export const players: Player[] = [
  // =================== PREMIER LEAGUE ===================
  // Easy
  { name: "Erling Haaland", club: "Manchester City", nationality: "Norway", league: "Premier League", goals: 22, assists: 4, position: "ST", heightCm: 194, kitNumber: 9, age: 25, marketValue: 180, difficulty: "easy" },
  { name: "Mohamed Salah", club: "Liverpool", nationality: "Egypt", league: "Premier League", goals: 18, assists: 13, position: "RW", heightCm: 175, kitNumber: 11, age: 33, marketValue: 45, difficulty: "easy" },
  { name: "Bukayo Saka", club: "Arsenal", nationality: "England", league: "Premier League", goals: 14, assists: 11, position: "RW", heightCm: 178, kitNumber: 7, age: 24, marketValue: 150, difficulty: "easy" },
  { name: "Cole Palmer", club: "Chelsea", nationality: "England", league: "Premier League", goals: 16, assists: 9, position: "CAM", heightCm: 185, kitNumber: 20, age: 23, marketValue: 120, difficulty: "easy" },
  { name: "Bruno Fernandes", club: "Manchester United", nationality: "Portugal", league: "Premier League", goals: 7, assists: 8, position: "CAM", heightCm: 179, kitNumber: 8, age: 31, marketValue: 55, difficulty: "easy" },
  { name: "Son Heung-min", club: "Tottenham", nationality: "South Korea", league: "Premier League", goals: 13, assists: 5, position: "LW", heightCm: 183, kitNumber: 7, age: 33, marketValue: 35, difficulty: "easy" },
  { name: "Declan Rice", club: "Arsenal", nationality: "England", league: "Premier League", goals: 4, assists: 5, position: "CDM", heightCm: 185, kitNumber: 41, age: 27, marketValue: 120, difficulty: "easy" },
  { name: "Phil Foden", club: "Manchester City", nationality: "England", league: "Premier League", goals: 9, assists: 6, position: "LW", heightCm: 171, kitNumber: 47, age: 25, marketValue: 130, difficulty: "easy" },
  { name: "Alexander Isak", club: "Newcastle", nationality: "Sweden", league: "Premier League", goals: 17, assists: 4, position: "ST", heightCm: 192, kitNumber: 14, age: 26, marketValue: 100, difficulty: "easy" },
  { name: "Virgil van Dijk", club: "Liverpool", nationality: "Netherlands", league: "Premier League", goals: 3, assists: 1, position: "CB", heightCm: 193, kitNumber: 4, age: 34, marketValue: 28, difficulty: "easy" },
  { name: "Martin Ødegaard", club: "Arsenal", nationality: "Norway", league: "Premier League", goals: 6, assists: 9, position: "CAM", heightCm: 178, kitNumber: 8, age: 27, marketValue: 110, difficulty: "easy" },
  { name: "William Saliba", club: "Arsenal", nationality: "France", league: "Premier League", goals: 2, assists: 1, position: "CB", heightCm: 192, kitNumber: 2, age: 24, marketValue: 100, difficulty: "easy" },
  { name: "Alisson", club: "Liverpool", nationality: "Brazil", league: "Premier League", goals: 0, assists: 0, position: "GK", heightCm: 191, kitNumber: 1, age: 33, marketValue: 35, difficulty: "easy" },
  // Hard
  { name: "Moises Caicedo", club: "Chelsea", nationality: "Ecuador", league: "Premier League", goals: 2, assists: 2, position: "CDM", heightCm: 178, kitNumber: 25, age: 23, marketValue: 80, difficulty: "hard" },
  { name: "Pedro Neto", club: "Chelsea", nationality: "Portugal", league: "Premier League", goals: 5, assists: 6, position: "LW", heightCm: 175, kitNumber: 7, age: 25, marketValue: 60, difficulty: "hard" },
  { name: "Micky van de Ven", club: "Tottenham", nationality: "Netherlands", league: "Premier League", goals: 1, assists: 2, position: "CB", heightCm: 193, kitNumber: 37, age: 24, marketValue: 60, difficulty: "hard" },
  { name: "Sandro Tonali", club: "Newcastle", nationality: "Italy", league: "Premier League", goals: 2, assists: 3, position: "CM", heightCm: 181, kitNumber: 8, age: 25, marketValue: 50, difficulty: "hard" },
  { name: "Dominic Solanke", club: "Tottenham", nationality: "England", league: "Premier League", goals: 8, assists: 3, position: "ST", heightCm: 185, kitNumber: 19, age: 27, marketValue: 55, difficulty: "hard" },
  { name: "Leandro Trossard", club: "Arsenal", nationality: "Belgium", league: "Premier League", goals: 7, assists: 4, position: "LW", heightCm: 172, kitNumber: 19, age: 30, marketValue: 45, difficulty: "hard" },

  // =================== LA LIGA ===================
  // Easy
  { name: "Kylian Mbappé", club: "Real Madrid", nationality: "France", league: "La Liga", goals: 18, assists: 4, position: "ST", heightCm: 178, kitNumber: 9, age: 27, marketValue: 180, difficulty: "easy" },
  { name: "Vinícius Júnior", club: "Real Madrid", nationality: "Brazil", league: "La Liga", goals: 16, assists: 7, position: "LW", heightCm: 176, kitNumber: 7, age: 25, marketValue: 200, difficulty: "easy" },
  { name: "Jude Bellingham", club: "Real Madrid", nationality: "England", league: "La Liga", goals: 10, assists: 6, position: "CAM", heightCm: 186, kitNumber: 5, age: 22, marketValue: 180, difficulty: "easy" },
  { name: "Robert Lewandowski", club: "Barcelona", nationality: "Poland", league: "La Liga", goals: 17, assists: 4, position: "ST", heightCm: 185, kitNumber: 9, age: 37, marketValue: 15, difficulty: "easy" },
  { name: "Lamine Yamal", club: "Barcelona", nationality: "Spain", league: "La Liga", goals: 11, assists: 14, position: "RW", heightCm: 180, kitNumber: 19, age: 18, marketValue: 200, difficulty: "easy" },
  { name: "Pedri", club: "Barcelona", nationality: "Spain", league: "La Liga", goals: 4, assists: 7, position: "CM", heightCm: 174, kitNumber: 8, age: 23, marketValue: 100, difficulty: "easy" },
  { name: "Raphinha", club: "Barcelona", nationality: "Brazil", league: "La Liga", goals: 13, assists: 8, position: "RW", heightCm: 176, kitNumber: 11, age: 29, marketValue: 90, difficulty: "easy" },
  { name: "Antoine Griezmann", club: "Atlético Madrid", nationality: "France", league: "La Liga", goals: 7, assists: 5, position: "CF", heightCm: 176, kitNumber: 7, age: 34, marketValue: 20, difficulty: "easy" },
  { name: "Federico Valverde", club: "Real Madrid", nationality: "Uruguay", league: "La Liga", goals: 5, assists: 4, position: "CM", heightCm: 182, kitNumber: 8, age: 27, marketValue: 120, difficulty: "easy" },
  // Hard
  { name: "Arda Güler", club: "Real Madrid", nationality: "Turkey", league: "La Liga", goals: 4, assists: 3, position: "CAM", heightCm: 176, kitNumber: 15, age: 20, marketValue: 50, difficulty: "hard" },
  { name: "Aurélien Tchouaméni", club: "Real Madrid", nationality: "France", league: "La Liga", goals: 2, assists: 2, position: "CDM", heightCm: 187, kitNumber: 18, age: 25, marketValue: 80, difficulty: "hard" },
  { name: "Alejandro Balde", club: "Barcelona", nationality: "Spain", league: "La Liga", goals: 1, assists: 4, position: "LB", heightCm: 175, kitNumber: 3, age: 21, marketValue: 50, difficulty: "hard" },
  { name: "Fermín López", club: "Barcelona", nationality: "Spain", league: "La Liga", goals: 3, assists: 2, position: "CM", heightCm: 177, kitNumber: 16, age: 22, marketValue: 50, difficulty: "hard" },
  { name: "Antonio Rüdiger", club: "Real Madrid", nationality: "Germany", league: "La Liga", goals: 2, assists: 1, position: "CB", heightCm: 190, kitNumber: 22, age: 32, marketValue: 30, difficulty: "hard" },

  // =================== SERIE A ===================
  // Easy
  { name: "Lautaro Martínez", club: "Inter Milan", nationality: "Argentina", league: "Serie A", goals: 15, assists: 3, position: "ST", heightCm: 174, kitNumber: 10, age: 28, marketValue: 100, difficulty: "easy" },
  { name: "Rafael Leão", club: "AC Milan", nationality: "Portugal", league: "Serie A", goals: 9, assists: 6, position: "LW", heightCm: 188, kitNumber: 10, age: 26, marketValue: 85, difficulty: "easy" },
  { name: "Dušan Vlahović", club: "Juventus", nationality: "Serbia", league: "Serie A", goals: 11, assists: 2, position: "ST", heightCm: 190, kitNumber: 9, age: 26, marketValue: 75, difficulty: "easy" },
  { name: "Marcus Thuram", club: "Inter Milan", nationality: "France", league: "Serie A", goals: 13, assists: 4, position: "ST", heightCm: 192, kitNumber: 9, age: 28, marketValue: 80, difficulty: "easy" },
  { name: "Nicolò Barella", club: "Inter Milan", nationality: "Italy", league: "Serie A", goals: 5, assists: 8, position: "CM", heightCm: 172, kitNumber: 23, age: 28, marketValue: 90, difficulty: "easy" },
  { name: "Paulo Dybala", club: "Roma", nationality: "Argentina", league: "Serie A", goals: 7, assists: 4, position: "CF", heightCm: 177, kitNumber: 21, age: 32, marketValue: 18, difficulty: "easy" },
  // Hard
  { name: "Hakan Çalhanoğlu", club: "Inter Milan", nationality: "Turkey", league: "Serie A", goals: 5, assists: 4, position: "CM", heightCm: 178, kitNumber: 20, age: 31, marketValue: 40, difficulty: "hard" },
  { name: "Federico Dimarco", club: "Inter Milan", nationality: "Italy", league: "Serie A", goals: 3, assists: 6, position: "LB", heightCm: 175, kitNumber: 32, age: 27, marketValue: 50, difficulty: "hard" },
  { name: "Ademola Lookman", club: "Atalanta", nationality: "Nigeria", league: "Serie A", goals: 10, assists: 4, position: "RW", heightCm: 174, kitNumber: 11, age: 27, marketValue: 50, difficulty: "hard" },
  { name: "Theo Hernández", club: "AC Milan", nationality: "France", league: "Serie A", goals: 3, assists: 5, position: "LB", heightCm: 184, kitNumber: 19, age: 28, marketValue: 50, difficulty: "hard" },
  { name: "Álvaro Morata", club: "AC Milan", nationality: "Spain", league: "Serie A", goals: 6, assists: 2, position: "ST", heightCm: 189, kitNumber: 7, age: 33, marketValue: 20, difficulty: "hard" },
  { name: "Mike Maignan", club: "AC Milan", nationality: "France", league: "Serie A", goals: 0, assists: 0, position: "GK", heightCm: 191, kitNumber: 16, age: 30, marketValue: 40, difficulty: "easy" },

  // =================== BUNDESLIGA ===================
  // Easy
  { name: "Harry Kane", club: "Bayern Munich", nationality: "England", league: "Bundesliga", goals: 23, assists: 7, position: "ST", heightCm: 188, kitNumber: 9, age: 32, marketValue: 75, difficulty: "easy" },
  { name: "Florian Wirtz", club: "Bayer Leverkusen", nationality: "Germany", league: "Bundesliga", goals: 11, assists: 9, position: "CAM", heightCm: 176, kitNumber: 10, age: 22, marketValue: 150, difficulty: "easy" },
  { name: "Jamal Musiala", club: "Bayern Munich", nationality: "Germany", league: "Bundesliga", goals: 11, assists: 7, position: "CAM", heightCm: 184, kitNumber: 42, age: 22, marketValue: 150, difficulty: "easy" },
  { name: "Manuel Neuer", club: "Bayern Munich", nationality: "Germany", league: "Bundesliga", goals: 0, assists: 0, position: "GK", heightCm: 193, kitNumber: 1, age: 39, marketValue: 8, difficulty: "easy" },
  // Hard
  { name: "Serhou Guirassy", club: "Borussia Dortmund", nationality: "Guinea", league: "Bundesliga", goals: 14, assists: 3, position: "ST", heightCm: 187, kitNumber: 9, age: 29, marketValue: 40, difficulty: "hard" },
  { name: "Leroy Sané", club: "Bayern Munich", nationality: "Germany", league: "Bundesliga", goals: 6, assists: 5, position: "RW", heightCm: 183, kitNumber: 10, age: 29, marketValue: 40, difficulty: "hard" },
  { name: "Granit Xhaka", club: "Bayer Leverkusen", nationality: "Switzerland", league: "Bundesliga", goals: 3, assists: 5, position: "CM", heightCm: 185, kitNumber: 34, age: 33, marketValue: 25, difficulty: "hard" },
  { name: "Xavi Simons", club: "RB Leipzig", nationality: "Netherlands", league: "Bundesliga", goals: 9, assists: 7, position: "CAM", heightCm: 179, kitNumber: 7, age: 22, marketValue: 100, difficulty: "hard" },
  { name: "Alejandro Grimaldo", club: "Bayer Leverkusen", nationality: "Spain", league: "Bundesliga", goals: 3, assists: 8, position: "LB", heightCm: 171, kitNumber: 20, age: 30, marketValue: 40, difficulty: "hard" },

  // =================== LIGUE 1 ===================
  // Easy
  { name: "Ousmane Dembélé", club: "PSG", nationality: "France", league: "Ligue 1", goals: 9, assists: 7, position: "RW", heightCm: 178, kitNumber: 10, age: 28, marketValue: 65, difficulty: "easy" },
  { name: "Bradley Barcola", club: "PSG", nationality: "France", league: "Ligue 1", goals: 11, assists: 5, position: "LW", heightCm: 186, kitNumber: 29, age: 22, marketValue: 90, difficulty: "easy" },
  { name: "Khvicha Kvaratskhelia", club: "PSG", nationality: "Georgia", league: "Ligue 1", goals: 7, assists: 4, position: "LW", heightCm: 183, kitNumber: 7, age: 24, marketValue: 80, difficulty: "easy" },
  { name: "Achraf Hakimi", club: "PSG", nationality: "Morocco", league: "Ligue 1", goals: 3, assists: 5, position: "RB", heightCm: 181, kitNumber: 2, age: 27, marketValue: 65, difficulty: "easy" },
  { name: "Gianluigi Donnarumma", club: "PSG", nationality: "Italy", league: "Ligue 1", goals: 0, assists: 0, position: "GK", heightCm: 196, kitNumber: 99, age: 27, marketValue: 35, difficulty: "easy" },
  { name: "Marquinhos", club: "PSG", nationality: "Brazil", league: "Ligue 1", goals: 2, assists: 1, position: "CB", heightCm: 183, kitNumber: 5, age: 31, marketValue: 25, difficulty: "easy" },
  // Hard
  { name: "Warren Zaïre-Emery", club: "PSG", nationality: "France", league: "Ligue 1", goals: 3, assists: 4, position: "CM", heightCm: 178, kitNumber: 33, age: 19, marketValue: 50, difficulty: "hard" },
  { name: "Gonçalo Ramos", club: "PSG", nationality: "Portugal", league: "Ligue 1", goals: 8, assists: 3, position: "ST", heightCm: 185, kitNumber: 9, age: 24, marketValue: 60, difficulty: "hard" },
  { name: "Lee Kang-in", club: "PSG", nationality: "South Korea", league: "Ligue 1", goals: 4, assists: 6, position: "CAM", heightCm: 173, kitNumber: 19, age: 24, marketValue: 45, difficulty: "hard" },
  { name: "Vitinha", club: "PSG", nationality: "Portugal", league: "Ligue 1", goals: 5, assists: 5, position: "CM", heightCm: 172, kitNumber: 17, age: 25, marketValue: 55, difficulty: "hard" },
];
