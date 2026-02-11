import { Player } from '@/types/game';

export const players: Player[] = [
  // =================== EASY MODE — ~150 Most Recognizable Active Stars Worldwide ===================
  // These are the most globally famous, recognizable active footballers as of Feb 2026

  // === PREMIER LEAGUE ===
  { name: "Erling Haaland", club: "Manchester City", nationality: "Norway", league: "Premier League", goals: 20, assists: 3, position: "ST", kitNumber: 9, age: 26, marketValue: 180, difficulty: "easy" },
  { name: "Mohamed Salah", club: "Liverpool", nationality: "Egypt", league: "Premier League", goals: 17, assists: 12, position: "RW", kitNumber: 11, age: 34, marketValue: 40, difficulty: "easy" },
  { name: "Bukayo Saka", club: "Arsenal", nationality: "England", league: "Premier League", goals: 13, assists: 10, position: "RW", kitNumber: 7, age: 24, marketValue: 160, difficulty: "easy" },
  { name: "Cole Palmer", club: "Chelsea", nationality: "England", league: "Premier League", goals: 15, assists: 8, position: "CAM", kitNumber: 20, age: 24, marketValue: 130, difficulty: "easy" },
  { name: "Bruno Fernandes", club: "Manchester United", nationality: "Portugal", league: "Premier League", goals: 6, assists: 7, position: "CAM", kitNumber: 8, age: 32, marketValue: 45, difficulty: "easy" },
  { name: "Son Heung-min", club: "Tottenham", nationality: "South Korea", league: "Premier League", goals: 12, assists: 4, position: "LW", kitNumber: 7, age: 34, marketValue: 28, difficulty: "easy" },
  { name: "Declan Rice", club: "Arsenal", nationality: "England", league: "Premier League", goals: 3, assists: 4, position: "CDM", kitNumber: 41, age: 27, marketValue: 110, difficulty: "easy" },
  { name: "Phil Foden", club: "Manchester City", nationality: "England", league: "Premier League", goals: 8, assists: 5, position: "LW", kitNumber: 47, age: 26, marketValue: 120, difficulty: "easy" },
  { name: "Alexander Isak", club: "Newcastle", nationality: "Sweden", league: "Premier League", goals: 18, assists: 3, position: "ST", kitNumber: 14, age: 27, marketValue: 110, difficulty: "easy" },
  { name: "Virgil van Dijk", club: "Liverpool", nationality: "Netherlands", league: "Premier League", goals: 2, assists: 1, position: "CB", kitNumber: 4, age: 35, marketValue: 22, difficulty: "easy" },
  { name: "Martin Ødegaard", club: "Arsenal", nationality: "Norway", league: "Premier League", goals: 7, assists: 10, position: "CAM", kitNumber: 8, age: 27, marketValue: 110, difficulty: "easy" },
  { name: "William Saliba", club: "Arsenal", nationality: "France", league: "Premier League", goals: 2, assists: 1, position: "CB", kitNumber: 2, age: 25, marketValue: 110, difficulty: "easy" },
  { name: "Kevin De Bruyne", club: "Manchester City", nationality: "Belgium", league: "Premier League", goals: 3, assists: 6, position: "CAM", kitNumber: 17, age: 35, marketValue: 25, difficulty: "easy" },
  { name: "Alisson", club: "Liverpool", nationality: "Brazil", league: "Premier League", goals: 0, assists: 0, position: "GK", kitNumber: 1, age: 34, marketValue: 30, difficulty: "easy" },
  { name: "Rodri", club: "Manchester City", nationality: "Spain", league: "Premier League", goals: 1, assists: 2, position: "CDM", kitNumber: 16, age: 30, marketValue: 120, difficulty: "easy" },
  { name: "Ollie Watkins", club: "Aston Villa", nationality: "England", league: "Premier League", goals: 11, assists: 5, position: "ST", kitNumber: 11, age: 30, marketValue: 60, difficulty: "easy" },
  { name: "Trent Alexander-Arnold", club: "Liverpool", nationality: "England", league: "Premier League", goals: 2, assists: 7, position: "RB", kitNumber: 66, age: 27, marketValue: 65, difficulty: "easy" },
  { name: "Marcus Rashford", club: "Manchester United", nationality: "England", league: "Premier League", goals: 4, assists: 2, position: "LW", kitNumber: 10, age: 28, marketValue: 45, difficulty: "easy" },
  { name: "Raheem Sterling", club: "Arsenal", nationality: "England", league: "Premier League", goals: 3, assists: 2, position: "LW", kitNumber: 30, age: 31, marketValue: 15, difficulty: "easy" },
  { name: "Casemiro", club: "Manchester United", nationality: "Brazil", league: "Premier League", goals: 2, assists: 1, position: "CDM", kitNumber: 18, age: 34, marketValue: 10, difficulty: "easy" },
  { name: "Bernardo Silva", club: "Manchester City", nationality: "Portugal", league: "Premier League", goals: 5, assists: 6, position: "CAM", kitNumber: 20, age: 31, marketValue: 60, difficulty: "easy" },
  { name: "Luis Díaz", club: "Liverpool", nationality: "Colombia", league: "Premier League", goals: 9, assists: 4, position: "LW", kitNumber: 7, age: 29, marketValue: 55, difficulty: "easy" },
  { name: "Cody Gakpo", club: "Liverpool", nationality: "Netherlands", league: "Premier League", goals: 12, assists: 4, position: "LW", kitNumber: 18, age: 26, marketValue: 60, difficulty: "easy" },
  { name: "Enzo Fernández", club: "Chelsea", nationality: "Argentina", league: "Premier League", goals: 4, assists: 5, position: "CM", kitNumber: 8, age: 25, marketValue: 75, difficulty: "easy" },
  { name: "Viktor Gyökeres", club: "Arsenal", nationality: "Sweden", league: "Premier League", goals: 14, assists: 4, position: "ST", kitNumber: 9, age: 28, marketValue: 90, difficulty: "easy" },
  { name: "Estêvão", club: "Chelsea", nationality: "Brazil", league: "Premier League", goals: 6, assists: 7, position: "RW", kitNumber: 41, age: 19, marketValue: 60, difficulty: "easy" },
  { name: "Xavi Simons", club: "Tottenham", nationality: "Netherlands", league: "Premier League", goals: 10, assists: 8, position: "CAM", kitNumber: 7, age: 23, marketValue: 110, difficulty: "easy" },
  { name: "Paul Pogba", club: "Manchester United", nationality: "France", league: "Premier League", goals: 1, assists: 2, position: "CM", kitNumber: 6, age: 33, marketValue: 5, difficulty: "easy" },

  // === LA LIGA ===
  { name: "Kylian Mbappé", club: "Real Madrid", nationality: "France", league: "La Liga", goals: 19, assists: 5, position: "ST", kitNumber: 9, age: 27, marketValue: 180, difficulty: "easy" },
  { name: "Vinícius Júnior", club: "Real Madrid", nationality: "Brazil", league: "La Liga", goals: 15, assists: 8, position: "LW", kitNumber: 7, age: 26, marketValue: 200, difficulty: "easy" },
  { name: "Jude Bellingham", club: "Real Madrid", nationality: "England", league: "La Liga", goals: 11, assists: 7, position: "CAM", kitNumber: 5, age: 22, marketValue: 180, difficulty: "easy" },
  { name: "Robert Lewandowski", club: "Barcelona", nationality: "Poland", league: "La Liga", goals: 15, assists: 4, position: "ST", kitNumber: 9, age: 38, marketValue: 10, difficulty: "easy" },
  { name: "Lamine Yamal", club: "Barcelona", nationality: "Spain", league: "La Liga", goals: 12, assists: 13, position: "RW", kitNumber: 19, age: 18, marketValue: 200, difficulty: "easy" },
  { name: "Pedri", club: "Barcelona", nationality: "Spain", league: "La Liga", goals: 5, assists: 8, position: "CM", kitNumber: 8, age: 23, marketValue: 100, difficulty: "easy" },
  { name: "Raphinha", club: "Barcelona", nationality: "Brazil", league: "La Liga", goals: 12, assists: 7, position: "RW", kitNumber: 11, age: 29, marketValue: 85, difficulty: "easy" },
  { name: "Antoine Griezmann", club: "Atlético Madrid", nationality: "France", league: "La Liga", goals: 6, assists: 4, position: "CF", kitNumber: 7, age: 35, marketValue: 15, difficulty: "easy" },
  { name: "Federico Valverde", club: "Real Madrid", nationality: "Uruguay", league: "La Liga", goals: 5, assists: 4, position: "CM", kitNumber: 8, age: 27, marketValue: 120, difficulty: "easy" },
  { name: "Luka Modrić", club: "Real Madrid", nationality: "Croatia", league: "La Liga", goals: 2, assists: 4, position: "CM", kitNumber: 10, age: 40, marketValue: 3, difficulty: "easy" },
  { name: "Gavi", club: "Barcelona", nationality: "Spain", league: "La Liga", goals: 3, assists: 4, position: "CM", kitNumber: 6, age: 21, marketValue: 60, difficulty: "easy" },
  { name: "Julián Álvarez", club: "Atlético Madrid", nationality: "Argentina", league: "La Liga", goals: 11, assists: 5, position: "ST", kitNumber: 19, age: 26, marketValue: 85, difficulty: "easy" },
  { name: "Arda Güler", club: "Real Madrid", nationality: "Turkey", league: "La Liga", goals: 5, assists: 4, position: "CAM", kitNumber: 15, age: 21, marketValue: 60, difficulty: "easy" },
  { name: "Aurélien Tchouaméni", club: "Real Madrid", nationality: "France", league: "La Liga", goals: 2, assists: 2, position: "CDM", kitNumber: 18, age: 26, marketValue: 75, difficulty: "easy" },
  { name: "Antonio Rüdiger", club: "Real Madrid", nationality: "Germany", league: "La Liga", goals: 2, assists: 1, position: "CB", kitNumber: 22, age: 33, marketValue: 25, difficulty: "easy" },
  { name: "Alejandro Balde", club: "Barcelona", nationality: "Spain", league: "La Liga", goals: 1, assists: 5, position: "LB", kitNumber: 3, age: 22, marketValue: 55, difficulty: "easy" },

  // === SERIE A ===
  { name: "Lautaro Martínez", club: "Inter Milan", nationality: "Argentina", league: "Serie A", goals: 14, assists: 3, position: "ST", kitNumber: 10, age: 28, marketValue: 100, difficulty: "easy" },
  { name: "Rafael Leão", club: "AC Milan", nationality: "Portugal", league: "Serie A", goals: 8, assists: 5, position: "LW", kitNumber: 10, age: 26, marketValue: 80, difficulty: "easy" },
  { name: "Dušan Vlahović", club: "Juventus", nationality: "Serbia", league: "Serie A", goals: 10, assists: 2, position: "ST", kitNumber: 9, age: 26, marketValue: 70, difficulty: "easy" },
  { name: "Marcus Thuram", club: "Inter Milan", nationality: "France", league: "Serie A", goals: 12, assists: 4, position: "ST", kitNumber: 9, age: 28, marketValue: 80, difficulty: "easy" },
  { name: "Nicolò Barella", club: "Inter Milan", nationality: "Italy", league: "Serie A", goals: 4, assists: 7, position: "CM", kitNumber: 23, age: 28, marketValue: 90, difficulty: "easy" },
  { name: "Paulo Dybala", club: "Roma", nationality: "Argentina", league: "Serie A", goals: 6, assists: 4, position: "CF", kitNumber: 21, age: 32, marketValue: 12, difficulty: "easy" },
  { name: "Romelu Lukaku", club: "Napoli", nationality: "Belgium", league: "Serie A", goals: 8, assists: 3, position: "ST", kitNumber: 11, age: 32, marketValue: 15, difficulty: "easy" },
  { name: "Theo Hernández", club: "AC Milan", nationality: "France", league: "Serie A", goals: 3, assists: 4, position: "LB", kitNumber: 19, age: 28, marketValue: 45, difficulty: "easy" },
  { name: "Ademola Lookman", club: "Atalanta", nationality: "Nigeria", league: "Serie A", goals: 9, assists: 4, position: "RW", kitNumber: 11, age: 28, marketValue: 55, difficulty: "easy" },
  { name: "Mike Maignan", club: "AC Milan", nationality: "France", league: "Serie A", goals: 0, assists: 0, position: "GK", kitNumber: 16, age: 30, marketValue: 40, difficulty: "easy" },
  { name: "Jonathan David", club: "Juventus", nationality: "Canada", league: "Serie A", goals: 14, assists: 3, position: "ST", kitNumber: 9, age: 26, marketValue: 55, difficulty: "easy" },

  // === BUNDESLIGA ===
  { name: "Harry Kane", club: "Bayern Munich", nationality: "England", league: "Bundesliga", goals: 22, assists: 6, position: "ST", kitNumber: 9, age: 33, marketValue: 65, difficulty: "easy" },
  { name: "Florian Wirtz", club: "Bayer Leverkusen", nationality: "Germany", league: "Bundesliga", goals: 12, assists: 10, position: "CAM", kitNumber: 10, age: 23, marketValue: 150, difficulty: "easy" },
  { name: "Jamal Musiala", club: "Bayern Munich", nationality: "Germany", league: "Bundesliga", goals: 12, assists: 8, position: "CAM", kitNumber: 42, age: 23, marketValue: 150, difficulty: "easy" },
  { name: "Joshua Kimmich", club: "Bayern Munich", nationality: "Germany", league: "Bundesliga", goals: 2, assists: 5, position: "CDM", kitNumber: 6, age: 31, marketValue: 45, difficulty: "easy" },
  { name: "Alphonso Davies", club: "Bayern Munich", nationality: "Canada", league: "Bundesliga", goals: 1, assists: 4, position: "LB", kitNumber: 19, age: 25, marketValue: 55, difficulty: "easy" },
  { name: "Jonathan Tah", club: "Bayern Munich", nationality: "Germany", league: "Bundesliga", goals: 2, assists: 1, position: "CB", kitNumber: 4, age: 29, marketValue: 35, difficulty: "easy" },
  { name: "Manuel Neuer", club: "Bayern Munich", nationality: "Germany", league: "Bundesliga", goals: 0, assists: 0, position: "GK", kitNumber: 1, age: 40, marketValue: 5, difficulty: "easy" },
  { name: "Granit Xhaka", club: "Bayer Leverkusen", nationality: "Switzerland", league: "Bundesliga", goals: 3, assists: 5, position: "CM", kitNumber: 34, age: 33, marketValue: 22, difficulty: "easy" },

  // === LIGUE 1 ===
  { name: "Ousmane Dembélé", club: "PSG", nationality: "France", league: "Ligue 1", goals: 10, assists: 8, position: "RW", kitNumber: 10, age: 28, marketValue: 60, difficulty: "easy" },
  { name: "Bradley Barcola", club: "PSG", nationality: "France", league: "Ligue 1", goals: 12, assists: 5, position: "LW", kitNumber: 29, age: 23, marketValue: 95, difficulty: "easy" },
  { name: "Khvicha Kvaratskhelia", club: "PSG", nationality: "Georgia", league: "Ligue 1", goals: 8, assists: 5, position: "LW", kitNumber: 7, age: 25, marketValue: 80, difficulty: "easy" },
  { name: "Achraf Hakimi", club: "PSG", nationality: "Morocco", league: "Ligue 1", goals: 3, assists: 5, position: "RB", kitNumber: 2, age: 27, marketValue: 60, difficulty: "easy" },
  { name: "Gianluigi Donnarumma", club: "PSG", nationality: "Italy", league: "Ligue 1", goals: 0, assists: 0, position: "GK", kitNumber: 99, age: 27, marketValue: 35, difficulty: "easy" },
  { name: "Marquinhos", club: "PSG", nationality: "Brazil", league: "Ligue 1", goals: 2, assists: 1, position: "CB", kitNumber: 5, age: 32, marketValue: 22, difficulty: "easy" },
  { name: "Mason Greenwood", club: "Marseille", nationality: "England", league: "Ligue 1", goals: 9, assists: 3, position: "RW", kitNumber: 10, age: 24, marketValue: 35, difficulty: "easy" },

  // === SAUDI PRO LEAGUE ===
  { name: "Cristiano Ronaldo", club: "Al-Nassr", nationality: "Portugal", league: "Saudi Pro League", goals: 14, assists: 3, position: "ST", kitNumber: 7, age: 41, marketValue: 10, difficulty: "easy" },
  { name: "Karim Benzema", club: "Al-Ittihad", nationality: "France", league: "Saudi Pro League", goals: 9, assists: 4, position: "ST", kitNumber: 9, age: 38, marketValue: 5, difficulty: "easy" },
  { name: "Sadio Mané", club: "Al-Nassr", nationality: "Senegal", league: "Saudi Pro League", goals: 6, assists: 3, position: "LW", kitNumber: 10, age: 34, marketValue: 8, difficulty: "easy" },
  { name: "N'Golo Kanté", club: "Al-Ittihad", nationality: "France", league: "Saudi Pro League", goals: 1, assists: 3, position: "CDM", kitNumber: 7, age: 35, marketValue: 8, difficulty: "easy" },
  { name: "Neymar", club: "Santos", nationality: "Brazil", league: "Brazilian Série A", goals: 3, assists: 2, position: "LW", kitNumber: 10, age: 34, marketValue: 10, difficulty: "easy" },
  { name: "Riyad Mahrez", club: "Al-Ahli", nationality: "Algeria", league: "Saudi Pro League", goals: 4, assists: 5, position: "RW", kitNumber: 26, age: 35, marketValue: 6, difficulty: "easy" },

  // === MLS ===
  { name: "Lionel Messi", club: "Inter Miami", nationality: "Argentina", league: "MLS", goals: 11, assists: 9, position: "RW", kitNumber: 10, age: 38, marketValue: 20, difficulty: "easy" },
  { name: "Luis Suárez", club: "Inter Miami", nationality: "Uruguay", league: "MLS", goals: 8, assists: 4, position: "ST", kitNumber: 9, age: 39, marketValue: 3, difficulty: "easy" },

  // === TURKISH SÜPER LIG ===
  { name: "Victor Osimhen", club: "Galatasaray", nationality: "Nigeria", league: "Turkish Süper Lig", goals: 15, assists: 5, position: "ST", kitNumber: 45, age: 27, marketValue: 70, difficulty: "easy" },
  { name: "Leroy Sané", club: "Galatasaray", nationality: "Germany", league: "Turkish Süper Lig", goals: 5, assists: 4, position: "RW", kitNumber: 10, age: 30, marketValue: 35, difficulty: "easy" },

  // === OTHER GLOBALLY FAMOUS ACTIVE PLAYERS ===
  { name: "Pierre-Emerick Aubameyang", club: "Marseille", nationality: "Gabon", league: "Ligue 1", goals: 7, assists: 2, position: "ST", kitNumber: 10, age: 37, marketValue: 3, difficulty: "easy" },
  { name: "James Rodríguez", club: "León", nationality: "Colombia", league: "MLS", goals: 2, assists: 5, position: "CAM", kitNumber: 10, age: 35, marketValue: 2, difficulty: "easy" },
  { name: "Alexis Sánchez", club: "Udinese", nationality: "Chile", league: "Serie A", goals: 2, assists: 1, position: "CF", kitNumber: 7, age: 37, marketValue: 2, difficulty: "easy" },

  // === MORE PL STARS ===
  { name: "Moises Caicedo", club: "Chelsea", nationality: "Ecuador", league: "Premier League", goals: 3, assists: 2, position: "CDM", kitNumber: 25, age: 24, marketValue: 85, difficulty: "easy" },
  { name: "Pedro Neto", club: "Chelsea", nationality: "Portugal", league: "Premier League", goals: 6, assists: 5, position: "LW", kitNumber: 7, age: 26, marketValue: 55, difficulty: "easy" },
  { name: "Micky van de Ven", club: "Tottenham", nationality: "Netherlands", league: "Premier League", goals: 1, assists: 3, position: "CB", kitNumber: 37, age: 25, marketValue: 65, difficulty: "easy" },
  { name: "Sandro Tonali", club: "Newcastle", nationality: "Italy", league: "Premier League", goals: 3, assists: 4, position: "CM", kitNumber: 8, age: 26, marketValue: 55, difficulty: "easy" },
  { name: "Leandro Trossard", club: "Arsenal", nationality: "Belgium", league: "Premier League", goals: 6, assists: 3, position: "LW", kitNumber: 19, age: 31, marketValue: 40, difficulty: "easy" },
  { name: "Anthony Gordon", club: "Newcastle", nationality: "England", league: "Premier League", goals: 8, assists: 5, position: "LW", kitNumber: 10, age: 25, marketValue: 60, difficulty: "easy" },
  { name: "Bruno Guimarães", club: "Newcastle", nationality: "Brazil", league: "Premier League", goals: 3, assists: 4, position: "CM", kitNumber: 39, age: 28, marketValue: 65, difficulty: "easy" },
  { name: "Rasmus Højlund", club: "Manchester United", nationality: "Denmark", league: "Premier League", goals: 8, assists: 3, position: "ST", kitNumber: 11, age: 23, marketValue: 55, difficulty: "easy" },
  { name: "Lisandro Martínez", club: "Manchester United", nationality: "Argentina", league: "Premier League", goals: 1, assists: 1, position: "CB", kitNumber: 6, age: 28, marketValue: 50, difficulty: "easy" },
  { name: "Dominic Solanke", club: "Tottenham", nationality: "England", league: "Premier League", goals: 7, assists: 3, position: "ST", kitNumber: 19, age: 28, marketValue: 50, difficulty: "easy" },
  { name: "Morgan Gibbs-White", club: "Nottingham Forest", nationality: "England", league: "Premier League", goals: 5, assists: 6, position: "CAM", kitNumber: 10, age: 26, marketValue: 50, difficulty: "easy" },
  { name: "Chris Wood", club: "Nottingham Forest", nationality: "New Zealand", league: "Premier League", goals: 13, assists: 2, position: "ST", kitNumber: 11, age: 34, marketValue: 8, difficulty: "easy" },
  { name: "Mateo Kovačić", club: "Manchester City", nationality: "Croatia", league: "Premier League", goals: 2, assists: 3, position: "CM", kitNumber: 8, age: 32, marketValue: 25, difficulty: "easy" },

  // === MORE LA LIGA / SERIE A / BUNDESLIGA / LIGUE 1 STARS ===
  { name: "Hakan Çalhanoğlu", club: "Inter Milan", nationality: "Turkey", league: "Serie A", goals: 4, assists: 4, position: "CM", kitNumber: 20, age: 32, marketValue: 35, difficulty: "easy" },
  { name: "Federico Dimarco", club: "Inter Milan", nationality: "Italy", league: "Serie A", goals: 3, assists: 5, position: "LB", kitNumber: 32, age: 28, marketValue: 50, difficulty: "easy" },
  { name: "Serhou Guirassy", club: "Borussia Dortmund", nationality: "Guinea", league: "Bundesliga", goals: 13, assists: 3, position: "ST", kitNumber: 9, age: 30, marketValue: 35, difficulty: "easy" },
  { name: "Alejandro Grimaldo", club: "Bayer Leverkusen", nationality: "Spain", league: "Bundesliga", goals: 3, assists: 7, position: "LB", kitNumber: 20, age: 30, marketValue: 38, difficulty: "easy" },
  { name: "Karim Adeyemi", club: "Borussia Dortmund", nationality: "Germany", league: "Bundesliga", goals: 6, assists: 3, position: "LW", kitNumber: 27, age: 24, marketValue: 35, difficulty: "easy" },
  { name: "Warren Zaïre-Emery", club: "PSG", nationality: "France", league: "Ligue 1", goals: 4, assists: 5, position: "CM", kitNumber: 33, age: 20, marketValue: 60, difficulty: "easy" },
  { name: "Gonçalo Ramos", club: "PSG", nationality: "Portugal", league: "Ligue 1", goals: 9, assists: 3, position: "ST", kitNumber: 9, age: 24, marketValue: 65, difficulty: "easy" },
  { name: "Fermín López", club: "Barcelona", nationality: "Spain", league: "La Liga", goals: 4, assists: 3, position: "CM", kitNumber: 16, age: 22, marketValue: 55, difficulty: "easy" },
  { name: "Mateo Retegui", club: "Atalanta", nationality: "Argentina", league: "Serie A", goals: 13, assists: 3, position: "ST", kitNumber: 32, age: 26, marketValue: 45, difficulty: "easy" },
  { name: "Davide Frattesi", club: "Inter Milan", nationality: "Italy", league: "Serie A", goals: 5, assists: 2, position: "CM", kitNumber: 16, age: 26, marketValue: 40, difficulty: "easy" },
  { name: "Khéphren Thuram", club: "Juventus", nationality: "France", league: "Serie A", goals: 2, assists: 3, position: "CM", kitNumber: 8, age: 24, marketValue: 40, difficulty: "easy" },
  { name: "Lee Kang-in", club: "PSG", nationality: "South Korea", league: "Ligue 1", goals: 5, assists: 6, position: "CAM", kitNumber: 19, age: 24, marketValue: 45, difficulty: "easy" },
  { name: "Vitinha", club: "PSG", nationality: "Portugal", league: "Ligue 1", goals: 5, assists: 5, position: "CM", kitNumber: 17, age: 26, marketValue: 60, difficulty: "easy" },
  { name: "Gleison Bremer", club: "Juventus", nationality: "Brazil", league: "Serie A", goals: 1, assists: 0, position: "CB", kitNumber: 3, age: 28, marketValue: 35, difficulty: "easy" },
  { name: "Endrick", club: "Lyon", nationality: "Brazil", league: "Ligue 1", goals: 5, assists: 2, position: "ST", kitNumber: 16, age: 20, marketValue: 45, difficulty: "easy" },

  // === MORE GLOBAL STARS ===
  { name: "Aleksandar Mitrović", club: "Al-Hilal", nationality: "Serbia", league: "Saudi Pro League", goals: 16, assists: 3, position: "ST", kitNumber: 9, age: 31, marketValue: 18, difficulty: "easy" },
  { name: "Riqui Puig", club: "LA Galaxy", nationality: "Spain", league: "MLS", goals: 6, assists: 8, position: "CAM", kitNumber: 6, age: 27, marketValue: 10, difficulty: "easy" },
  { name: "Ángel Di María", club: "Benfica", nationality: "Argentina", league: "Liga Portugal", goals: 5, assists: 7, position: "RW", kitNumber: 11, age: 38, marketValue: 3, difficulty: "easy" },
  { name: "Samu Omorodion", club: "Porto", nationality: "Spain", league: "Liga Portugal", goals: 14, assists: 3, position: "ST", kitNumber: 9, age: 21, marketValue: 45, difficulty: "easy" },

  // === ADDITIONAL RECOGNIZABLE NAMES ===
  { name: "Marc-André ter Stegen", club: "Barcelona", nationality: "Germany", league: "La Liga", goals: 0, assists: 0, position: "GK", kitNumber: 1, age: 34, marketValue: 25, difficulty: "easy" },
  { name: "Thibaut Courtois", club: "Real Madrid", nationality: "Belgium", league: "La Liga", goals: 0, assists: 0, position: "GK", kitNumber: 1, age: 34, marketValue: 25, difficulty: "easy" },
  { name: "Jan Oblak", club: "Atlético Madrid", nationality: "Slovenia", league: "La Liga", goals: 0, assists: 0, position: "GK", kitNumber: 13, age: 33, marketValue: 22, difficulty: "easy" },
  { name: "Ederson", club: "Manchester City", nationality: "Brazil", league: "Premier League", goals: 0, assists: 0, position: "GK", kitNumber: 31, age: 32, marketValue: 28, difficulty: "easy" },
  { name: "David Raya", club: "Arsenal", nationality: "Spain", league: "Premier League", goals: 0, assists: 0, position: "GK", kitNumber: 22, age: 30, marketValue: 35, difficulty: "easy" },
  { name: "Dries Mertens", club: "Galatasaray", nationality: "Belgium", league: "Turkish Süper Lig", goals: 5, assists: 6, position: "CF", kitNumber: 10, age: 39, marketValue: 2, difficulty: "easy" },
  { name: "Christian Benteke", club: "DC United", nationality: "Belgium", league: "MLS", goals: 13, assists: 3, position: "ST", kitNumber: 9, age: 35, marketValue: 3, difficulty: "easy" },
  { name: "Edin Džeko", club: "Fenerbahçe", nationality: "Bosnia", league: "Turkish Süper Lig", goals: 7, assists: 3, position: "ST", kitNumber: 9, age: 40, marketValue: 1, difficulty: "easy" },
  { name: "Fred", club: "Fenerbahçe", nationality: "Brazil", league: "Turkish Süper Lig", goals: 2, assists: 4, position: "CM", kitNumber: 17, age: 33, marketValue: 6, difficulty: "easy" },
  { name: "Vangelis Pavlidis", club: "Benfica", nationality: "Greece", league: "Liga Portugal", goals: 13, assists: 4, position: "ST", kitNumber: 9, age: 27, marketValue: 28, difficulty: "easy" },
  { name: "Pedro Gonçalves", club: "Sporting CP", nationality: "Portugal", league: "Liga Portugal", goals: 7, assists: 6, position: "CAM", kitNumber: 28, age: 27, marketValue: 28, difficulty: "easy" },
  { name: "Brian Brobbey", club: "Ajax", nationality: "Netherlands", league: "Eredivisie", goals: 12, assists: 4, position: "ST", kitNumber: 9, age: 23, marketValue: 32, difficulty: "easy" },
  { name: "Santiago Giménez", club: "Feyenoord", nationality: "Mexico", league: "Eredivisie", goals: 13, assists: 2, position: "ST", kitNumber: 29, age: 24, marketValue: 42, difficulty: "easy" },
  { name: "Luiz Henrique", club: "Botafogo", nationality: "Brazil", league: "Brazilian Série A", goals: 8, assists: 4, position: "RW", kitNumber: 7, age: 25, marketValue: 22, difficulty: "easy" },
  { name: "Kyogo Furuhashi", club: "Celtic", nationality: "Japan", league: "Scottish Premiership", goals: 14, assists: 3, position: "ST", kitNumber: 8, age: 31, marketValue: 12, difficulty: "easy" },
  { name: "Xherdan Shaqiri", club: "Basel", nationality: "Switzerland", league: "Swiss Super League", goals: 5, assists: 3, position: "RW", kitNumber: 10, age: 34, marketValue: 2, difficulty: "easy" },
  { name: "Oscar Gloukh", club: "RB Salzburg", nationality: "Israel", league: "Austrian Bundesliga", goals: 8, assists: 7, position: "CAM", kitNumber: 10, age: 22, marketValue: 25, difficulty: "easy" },
  { name: "Ayoub El Kaabi", club: "Olympiacos", nationality: "Morocco", league: "Greek Super League", goals: 13, assists: 2, position: "ST", kitNumber: 9, age: 31, marketValue: 6, difficulty: "easy" },

  // =================== HARD MODE — Bench, rotation, and lesser-known players (~500) ===================
  // Hard mode includes all Easy players PLUS these. Top 5 league squads + big clubs worldwide.

  // === PREMIER LEAGUE — Bench & Rotation ===
  // Arsenal
  { name: "Gabriel Jesus", club: "Arsenal", nationality: "Brazil", league: "Premier League", goals: 4, assists: 3, position: "ST", kitNumber: 9, age: 28, marketValue: 35, difficulty: "hard" },
  { name: "Gabriel Magalhães", club: "Arsenal", nationality: "Brazil", league: "Premier League", goals: 3, assists: 0, position: "CB", kitNumber: 6, age: 28, marketValue: 75, difficulty: "hard" },
  { name: "Ben White", club: "Arsenal", nationality: "England", league: "Premier League", goals: 1, assists: 3, position: "RB", kitNumber: 4, age: 28, marketValue: 55, difficulty: "hard" },
  { name: "Kai Havertz", club: "Arsenal", nationality: "Germany", league: "Premier League", goals: 9, assists: 4, position: "CF", kitNumber: 29, age: 27, marketValue: 65, difficulty: "hard" },
  { name: "Jurriën Timber", club: "Arsenal", nationality: "Netherlands", league: "Premier League", goals: 1, assists: 2, position: "RB", kitNumber: 12, age: 24, marketValue: 45, difficulty: "hard" },
  { name: "Thomas Partey", club: "Arsenal", nationality: "Ghana", league: "Premier League", goals: 1, assists: 2, position: "CDM", kitNumber: 5, age: 32, marketValue: 20, difficulty: "hard" },
  { name: "Jakub Kiwior", club: "Arsenal", nationality: "Poland", league: "Premier League", goals: 0, assists: 1, position: "CB", kitNumber: 15, age: 25, marketValue: 22, difficulty: "hard" },
  { name: "Riccardo Calafiori", club: "Arsenal", nationality: "Italy", league: "Premier League", goals: 1, assists: 2, position: "LB", kitNumber: 33, age: 23, marketValue: 45, difficulty: "hard" },
  { name: "Ethan Nwaneri", club: "Arsenal", nationality: "England", league: "Premier League", goals: 2, assists: 1, position: "CAM", kitNumber: 53, age: 18, marketValue: 15, difficulty: "hard" },

  // Manchester City
  { name: "Jack Grealish", club: "Manchester City", nationality: "England", league: "Premier League", goals: 3, assists: 4, position: "LW", kitNumber: 10, age: 30, marketValue: 35, difficulty: "hard" },
  { name: "John Stones", club: "Manchester City", nationality: "England", league: "Premier League", goals: 1, assists: 1, position: "CB", kitNumber: 5, age: 31, marketValue: 28, difficulty: "hard" },
  { name: "Nathan Aké", club: "Manchester City", nationality: "Netherlands", league: "Premier League", goals: 1, assists: 1, position: "CB", kitNumber: 6, age: 31, marketValue: 30, difficulty: "hard" },
  { name: "Jeremy Doku", club: "Manchester City", nationality: "Belgium", league: "Premier League", goals: 4, assists: 6, position: "LW", kitNumber: 11, age: 23, marketValue: 55, difficulty: "hard" },
  { name: "Rúben Dias", club: "Manchester City", nationality: "Portugal", league: "Premier League", goals: 1, assists: 0, position: "CB", kitNumber: 3, age: 28, marketValue: 65, difficulty: "hard" },
  { name: "Kyle Walker", club: "Manchester City", nationality: "England", league: "Premier League", goals: 0, assists: 2, position: "RB", kitNumber: 2, age: 36, marketValue: 5, difficulty: "hard" },
  { name: "Rico Lewis", club: "Manchester City", nationality: "England", league: "Premier League", goals: 2, assists: 3, position: "RB", kitNumber: 82, age: 21, marketValue: 35, difficulty: "hard" },
  { name: "Savinho", club: "Manchester City", nationality: "Brazil", league: "Premier League", goals: 3, assists: 5, position: "RW", kitNumber: 26, age: 21, marketValue: 50, difficulty: "hard" },
  { name: "Joško Gvardiol", club: "Manchester City", nationality: "Croatia", league: "Premier League", goals: 3, assists: 2, position: "LB", kitNumber: 24, age: 24, marketValue: 65, difficulty: "hard" },
  { name: "Stefan Ortega", club: "Manchester City", nationality: "Germany", league: "Premier League", goals: 0, assists: 0, position: "GK", kitNumber: 18, age: 33, marketValue: 5, difficulty: "hard" },

  // Liverpool
  { name: "Darwin Núñez", club: "Liverpool", nationality: "Uruguay", league: "Premier League", goals: 8, assists: 5, position: "ST", kitNumber: 9, age: 27, marketValue: 55, difficulty: "hard" },
  { name: "Diogo Jota", club: "Liverpool", nationality: "Portugal", league: "Premier League", goals: 6, assists: 3, position: "CF", kitNumber: 20, age: 29, marketValue: 40, difficulty: "hard" },
  { name: "Curtis Jones", club: "Liverpool", nationality: "England", league: "Premier League", goals: 3, assists: 5, position: "CM", kitNumber: 17, age: 24, marketValue: 30, difficulty: "hard" },
  { name: "Alexis Mac Allister", club: "Liverpool", nationality: "Argentina", league: "Premier League", goals: 4, assists: 5, position: "CM", kitNumber: 10, age: 27, marketValue: 70, difficulty: "hard" },
  { name: "Ryan Gravenberch", club: "Liverpool", nationality: "Netherlands", league: "Premier League", goals: 3, assists: 4, position: "CDM", kitNumber: 38, age: 24, marketValue: 50, difficulty: "hard" },
  { name: "Ibrahima Konaté", club: "Liverpool", nationality: "France", league: "Premier League", goals: 2, assists: 0, position: "CB", kitNumber: 5, age: 26, marketValue: 50, difficulty: "hard" },
  { name: "Andy Robertson", club: "Liverpool", nationality: "Scotland", league: "Premier League", goals: 0, assists: 3, position: "LB", kitNumber: 26, age: 32, marketValue: 18, difficulty: "hard" },
  { name: "Dominik Szoboszlai", club: "Liverpool", nationality: "Hungary", league: "Premier League", goals: 5, assists: 6, position: "CAM", kitNumber: 8, age: 25, marketValue: 55, difficulty: "hard" },
  { name: "Joe Gomez", club: "Liverpool", nationality: "England", league: "Premier League", goals: 0, assists: 1, position: "CB", kitNumber: 2, age: 28, marketValue: 22, difficulty: "hard" },
  { name: "Caoimhín Kelleher", club: "Liverpool", nationality: "Ireland", league: "Premier League", goals: 0, assists: 0, position: "GK", kitNumber: 62, age: 27, marketValue: 12, difficulty: "hard" },
  { name: "Federico Chiesa", club: "Liverpool", nationality: "Italy", league: "Premier League", goals: 2, assists: 1, position: "RW", kitNumber: 14, age: 28, marketValue: 20, difficulty: "hard" },

  // Chelsea
  { name: "Nicolas Jackson", club: "Chelsea", nationality: "Senegal", league: "Premier League", goals: 10, assists: 4, position: "ST", kitNumber: 15, age: 25, marketValue: 55, difficulty: "hard" },
  { name: "Noni Madueke", club: "Chelsea", nationality: "England", league: "Premier League", goals: 8, assists: 5, position: "RW", kitNumber: 11, age: 23, marketValue: 55, difficulty: "hard" },
  { name: "Mykhailo Mudryk", club: "Chelsea", nationality: "Ukraine", league: "Premier League", goals: 2, assists: 2, position: "LW", kitNumber: 10, age: 24, marketValue: 25, difficulty: "hard" },
  { name: "Reece James", club: "Chelsea", nationality: "England", league: "Premier League", goals: 0, assists: 2, position: "RB", kitNumber: 24, age: 26, marketValue: 25, difficulty: "hard" },
  { name: "Wesley Fofana", club: "Chelsea", nationality: "France", league: "Premier League", goals: 0, assists: 0, position: "CB", kitNumber: 33, age: 24, marketValue: 30, difficulty: "hard" },
  { name: "Levi Colwill", club: "Chelsea", nationality: "England", league: "Premier League", goals: 1, assists: 1, position: "CB", kitNumber: 6, age: 22, marketValue: 40, difficulty: "hard" },
  { name: "Robert Sánchez", club: "Chelsea", nationality: "Spain", league: "Premier League", goals: 0, assists: 0, position: "GK", kitNumber: 1, age: 28, marketValue: 18, difficulty: "hard" },
  { name: "Romeo Lavia", club: "Chelsea", nationality: "Belgium", league: "Premier League", goals: 1, assists: 2, position: "CDM", kitNumber: 45, age: 21, marketValue: 35, difficulty: "hard" },
  { name: "Marc Cucurella", club: "Chelsea", nationality: "Spain", league: "Premier League", goals: 1, assists: 3, position: "LB", kitNumber: 3, age: 27, marketValue: 30, difficulty: "hard" },
  { name: "Christopher Nkunku", club: "Chelsea", nationality: "France", league: "Premier League", goals: 7, assists: 3, position: "CF", kitNumber: 18, age: 28, marketValue: 50, difficulty: "hard" },
  { name: "João Félix", club: "Chelsea", nationality: "Portugal", league: "Premier League", goals: 5, assists: 3, position: "CF", kitNumber: 14, age: 26, marketValue: 30, difficulty: "hard" },

  // Manchester United
  { name: "Alejandro Garnacho", club: "Manchester United", nationality: "Argentina", league: "Premier League", goals: 5, assists: 4, position: "LW", kitNumber: 17, age: 21, marketValue: 45, difficulty: "hard" },
  { name: "Kobbie Mainoo", club: "Manchester United", nationality: "England", league: "Premier League", goals: 2, assists: 3, position: "CM", kitNumber: 37, age: 20, marketValue: 45, difficulty: "hard" },
  { name: "Diogo Dalot", club: "Manchester United", nationality: "Portugal", league: "Premier League", goals: 1, assists: 3, position: "RB", kitNumber: 20, age: 27, marketValue: 35, difficulty: "hard" },
  { name: "Luke Shaw", club: "Manchester United", nationality: "England", league: "Premier League", goals: 0, assists: 2, position: "LB", kitNumber: 23, age: 30, marketValue: 18, difficulty: "hard" },
  { name: "Harry Maguire", club: "Manchester United", nationality: "England", league: "Premier League", goals: 2, assists: 0, position: "CB", kitNumber: 5, age: 33, marketValue: 10, difficulty: "hard" },
  { name: "Christian Eriksen", club: "Manchester United", nationality: "Denmark", league: "Premier League", goals: 1, assists: 3, position: "CAM", kitNumber: 14, age: 34, marketValue: 5, difficulty: "hard" },
  { name: "André Onana", club: "Manchester United", nationality: "Cameroon", league: "Premier League", goals: 0, assists: 0, position: "GK", kitNumber: 24, age: 30, marketValue: 22, difficulty: "hard" },
  { name: "Manuel Ugarte", club: "Manchester United", nationality: "Uruguay", league: "Premier League", goals: 0, assists: 2, position: "CDM", kitNumber: 25, age: 24, marketValue: 40, difficulty: "hard" },
  { name: "Matthijs de Ligt", club: "Manchester United", nationality: "Netherlands", league: "Premier League", goals: 1, assists: 0, position: "CB", kitNumber: 4, age: 26, marketValue: 35, difficulty: "hard" },
  { name: "Joshua Zirkzee", club: "Manchester United", nationality: "Netherlands", league: "Premier League", goals: 3, assists: 2, position: "ST", kitNumber: 11, age: 25, marketValue: 30, difficulty: "hard" },
  { name: "Noussair Mazraoui", club: "Manchester United", nationality: "Morocco", league: "Premier League", goals: 0, assists: 2, position: "RB", kitNumber: 3, age: 28, marketValue: 22, difficulty: "hard" },
  { name: "Amad Diallo", club: "Manchester United", nationality: "Ivory Coast", league: "Premier League", goals: 6, assists: 5, position: "RW", kitNumber: 16, age: 23, marketValue: 35, difficulty: "hard" },

  // Tottenham
  { name: "James Maddison", club: "Tottenham", nationality: "England", league: "Premier League", goals: 5, assists: 7, position: "CAM", kitNumber: 10, age: 29, marketValue: 38, difficulty: "hard" },
  { name: "Richarlison", club: "Tottenham", nationality: "Brazil", league: "Premier League", goals: 4, assists: 2, position: "ST", kitNumber: 9, age: 29, marketValue: 28, difficulty: "hard" },
  { name: "Cristian Romero", club: "Tottenham", nationality: "Argentina", league: "Premier League", goals: 1, assists: 1, position: "CB", kitNumber: 17, age: 28, marketValue: 50, difficulty: "hard" },
  { name: "Rodrigo Bentancur", club: "Tottenham", nationality: "Uruguay", league: "Premier League", goals: 1, assists: 2, position: "CM", kitNumber: 30, age: 28, marketValue: 22, difficulty: "hard" },
  { name: "Dejan Kulusevski", club: "Tottenham", nationality: "Sweden", league: "Premier League", goals: 5, assists: 5, position: "RW", kitNumber: 21, age: 26, marketValue: 45, difficulty: "hard" },
  { name: "Pedro Porro", club: "Tottenham", nationality: "Spain", league: "Premier League", goals: 2, assists: 4, position: "RB", kitNumber: 23, age: 26, marketValue: 45, difficulty: "hard" },
  { name: "Guglielmo Vicario", club: "Tottenham", nationality: "Italy", league: "Premier League", goals: 0, assists: 0, position: "GK", kitNumber: 13, age: 29, marketValue: 30, difficulty: "hard" },
  { name: "Brennan Johnson", club: "Tottenham", nationality: "Wales", league: "Premier League", goals: 7, assists: 3, position: "RW", kitNumber: 19, age: 25, marketValue: 35, difficulty: "hard" },
  { name: "Destiny Udogie", club: "Tottenham", nationality: "Italy", league: "Premier League", goals: 1, assists: 3, position: "LB", kitNumber: 13, age: 23, marketValue: 35, difficulty: "hard" },

  // Newcastle
  { name: "Joelinton", club: "Newcastle", nationality: "Brazil", league: "Premier League", goals: 4, assists: 3, position: "CM", kitNumber: 7, age: 29, marketValue: 35, difficulty: "hard" },
  { name: "Harvey Barnes", club: "Newcastle", nationality: "England", league: "Premier League", goals: 5, assists: 3, position: "LW", kitNumber: 11, age: 28, marketValue: 28, difficulty: "hard" },
  { name: "Kieran Trippier", club: "Newcastle", nationality: "England", league: "Premier League", goals: 0, assists: 3, position: "RB", kitNumber: 2, age: 36, marketValue: 5, difficulty: "hard" },
  { name: "Nick Pope", club: "Newcastle", nationality: "England", league: "Premier League", goals: 0, assists: 0, position: "GK", kitNumber: 22, age: 34, marketValue: 12, difficulty: "hard" },
  { name: "Lewis Hall", club: "Newcastle", nationality: "England", league: "Premier League", goals: 1, assists: 3, position: "LB", kitNumber: 33, age: 21, marketValue: 25, difficulty: "hard" },
  { name: "Fabian Schär", club: "Newcastle", nationality: "Switzerland", league: "Premier League", goals: 2, assists: 0, position: "CB", kitNumber: 5, age: 34, marketValue: 5, difficulty: "hard" },
  { name: "Dan Burn", club: "Newcastle", nationality: "England", league: "Premier League", goals: 1, assists: 0, position: "CB", kitNumber: 33, age: 33, marketValue: 5, difficulty: "hard" },

  // Aston Villa
  { name: "Emiliano Martínez", club: "Aston Villa", nationality: "Argentina", league: "Premier League", goals: 0, assists: 0, position: "GK", kitNumber: 1, age: 33, marketValue: 28, difficulty: "hard" },
  { name: "Moussa Diaby", club: "Aston Villa", nationality: "France", league: "Premier League", goals: 5, assists: 3, position: "RW", kitNumber: 19, age: 26, marketValue: 42, difficulty: "hard" },
  { name: "Leon Bailey", club: "Aston Villa", nationality: "Jamaica", league: "Premier League", goals: 6, assists: 4, position: "RW", kitNumber: 31, age: 28, marketValue: 28, difficulty: "hard" },
  { name: "Amadou Onana", club: "Aston Villa", nationality: "Belgium", league: "Premier League", goals: 3, assists: 1, position: "CDM", kitNumber: 24, age: 24, marketValue: 45, difficulty: "hard" },
  { name: "Youri Tielemans", club: "Aston Villa", nationality: "Belgium", league: "Premier League", goals: 3, assists: 4, position: "CM", kitNumber: 8, age: 29, marketValue: 22, difficulty: "hard" },
  { name: "Jacob Ramsey", club: "Aston Villa", nationality: "England", league: "Premier League", goals: 2, assists: 3, position: "CM", kitNumber: 41, age: 24, marketValue: 28, difficulty: "hard" },
  { name: "Pau Torres", club: "Aston Villa", nationality: "Spain", league: "Premier League", goals: 1, assists: 0, position: "CB", kitNumber: 4, age: 28, marketValue: 35, difficulty: "hard" },
  { name: "Lucas Digne", club: "Aston Villa", nationality: "France", league: "Premier League", goals: 0, assists: 3, position: "LB", kitNumber: 12, age: 32, marketValue: 8, difficulty: "hard" },

  // West Ham
  { name: "Mohammed Kudus", club: "West Ham", nationality: "Ghana", league: "Premier League", goals: 6, assists: 3, position: "RW", kitNumber: 14, age: 25, marketValue: 45, difficulty: "hard" },
  { name: "Jarrod Bowen", club: "West Ham", nationality: "England", league: "Premier League", goals: 7, assists: 5, position: "RW", kitNumber: 20, age: 29, marketValue: 35, difficulty: "hard" },
  { name: "Lucas Paquetá", club: "West Ham", nationality: "Brazil", league: "Premier League", goals: 3, assists: 4, position: "CAM", kitNumber: 11, age: 28, marketValue: 28, difficulty: "hard" },
  { name: "Niclas Füllkrug", club: "West Ham", nationality: "Germany", league: "Premier League", goals: 4, assists: 2, position: "ST", kitNumber: 9, age: 33, marketValue: 15, difficulty: "hard" },
  { name: "Edson Álvarez", club: "West Ham", nationality: "Mexico", league: "Premier League", goals: 1, assists: 2, position: "CDM", kitNumber: 19, age: 28, marketValue: 22, difficulty: "hard" },

  // Brighton
  { name: "Kaoru Mitoma", club: "Brighton", nationality: "Japan", league: "Premier League", goals: 5, assists: 4, position: "LW", kitNumber: 22, age: 28, marketValue: 32, difficulty: "hard" },
  { name: "João Pedro", club: "Brighton", nationality: "Brazil", league: "Premier League", goals: 7, assists: 3, position: "ST", kitNumber: 9, age: 24, marketValue: 35, difficulty: "hard" },
  { name: "Evan Ferguson", club: "Brighton", nationality: "Ireland", league: "Premier League", goals: 3, assists: 1, position: "ST", kitNumber: 28, age: 21, marketValue: 25, difficulty: "hard" },

  // Nottingham Forest
  { name: "Callum Hudson-Odoi", club: "Nottingham Forest", nationality: "England", league: "Premier League", goals: 5, assists: 4, position: "RW", kitNumber: 11, age: 25, marketValue: 22, difficulty: "hard" },
  { name: "Nikola Milenković", club: "Nottingham Forest", nationality: "Serbia", league: "Premier League", goals: 2, assists: 0, position: "CB", kitNumber: 4, age: 28, marketValue: 15, difficulty: "hard" },

  // Wolverhampton / Everton / Crystal Palace / Other PL
  { name: "Matheus Cunha", club: "Wolverhampton", nationality: "Brazil", league: "Premier League", goals: 9, assists: 5, position: "CF", kitNumber: 10, age: 26, marketValue: 42, difficulty: "hard" },
  { name: "Hwang Hee-chan", club: "Wolverhampton", nationality: "South Korea", league: "Premier League", goals: 5, assists: 2, position: "ST", kitNumber: 11, age: 29, marketValue: 18, difficulty: "hard" },
  { name: "Abdoulaye Doucouré", club: "Everton", nationality: "Mali", league: "Premier League", goals: 2, assists: 2, position: "CM", kitNumber: 16, age: 33, marketValue: 5, difficulty: "hard" },
  { name: "Dominic Calvert-Lewin", club: "Everton", nationality: "England", league: "Premier League", goals: 5, assists: 1, position: "ST", kitNumber: 9, age: 29, marketValue: 15, difficulty: "hard" },
  { name: "Eberechi Eze", club: "Crystal Palace", nationality: "England", league: "Premier League", goals: 6, assists: 4, position: "CAM", kitNumber: 10, age: 28, marketValue: 42, difficulty: "hard" },
  { name: "Michael Olise", club: "Bayern Munich", nationality: "France", league: "Bundesliga", goals: 7, assists: 5, position: "RW", kitNumber: 11, age: 24, marketValue: 60, difficulty: "hard" },
  { name: "Jean-Philippe Mateta", club: "Crystal Palace", nationality: "France", league: "Premier League", goals: 8, assists: 2, position: "ST", kitNumber: 14, age: 28, marketValue: 25, difficulty: "hard" },
  { name: "James Ward-Prowse", club: "West Ham", nationality: "England", league: "Premier League", goals: 3, assists: 4, position: "CM", kitNumber: 7, age: 31, marketValue: 12, difficulty: "hard" },

  // === LA LIGA — Bench & Rotation ===
  // Real Madrid
  { name: "Eduardo Camavinga", club: "Real Madrid", nationality: "France", league: "La Liga", goals: 1, assists: 3, position: "CM", kitNumber: 6, age: 23, marketValue: 70, difficulty: "hard" },
  { name: "Dani Carvajal", club: "Real Madrid", nationality: "Spain", league: "La Liga", goals: 1, assists: 2, position: "RB", kitNumber: 2, age: 34, marketValue: 12, difficulty: "hard" },
  { name: "Rodrygo", club: "Real Madrid", nationality: "Brazil", league: "La Liga", goals: 7, assists: 5, position: "RW", kitNumber: 11, age: 25, marketValue: 100, difficulty: "hard" },
  { name: "Éder Militão", club: "Real Madrid", nationality: "Brazil", league: "La Liga", goals: 1, assists: 0, position: "CB", kitNumber: 3, age: 27, marketValue: 50, difficulty: "hard" },
  { name: "David Alaba", club: "Real Madrid", nationality: "Austria", league: "La Liga", goals: 0, assists: 0, position: "CB", kitNumber: 4, age: 33, marketValue: 15, difficulty: "hard" },
  { name: "Ferland Mendy", club: "Real Madrid", nationality: "France", league: "La Liga", goals: 0, assists: 2, position: "LB", kitNumber: 23, age: 30, marketValue: 22, difficulty: "hard" },
  { name: "Lucas Vázquez", club: "Real Madrid", nationality: "Spain", league: "La Liga", goals: 1, assists: 3, position: "RB", kitNumber: 17, age: 34, marketValue: 5, difficulty: "hard" },
  { name: "Brahim Díaz", club: "Real Madrid", nationality: "Morocco", league: "La Liga", goals: 4, assists: 3, position: "RW", kitNumber: 21, age: 26, marketValue: 30, difficulty: "hard" },
  // Endrick already in easy

  // Barcelona
  { name: "Dani Olmo", club: "Barcelona", nationality: "Spain", league: "La Liga", goals: 5, assists: 4, position: "CAM", kitNumber: 20, age: 27, marketValue: 55, difficulty: "hard" },
  { name: "Frenkie de Jong", club: "Barcelona", nationality: "Netherlands", league: "La Liga", goals: 2, assists: 4, position: "CM", kitNumber: 21, age: 28, marketValue: 45, difficulty: "hard" },
  { name: "Jules Koundé", club: "Barcelona", nationality: "France", league: "La Liga", goals: 1, assists: 3, position: "RB", kitNumber: 23, age: 27, marketValue: 55, difficulty: "hard" },
  { name: "Ronald Araújo", club: "Barcelona", nationality: "Uruguay", league: "La Liga", goals: 1, assists: 0, position: "CB", kitNumber: 4, age: 26, marketValue: 55, difficulty: "hard" },
  { name: "Andreas Christensen", club: "Barcelona", nationality: "Denmark", league: "La Liga", goals: 0, assists: 0, position: "CB", kitNumber: 15, age: 29, marketValue: 18, difficulty: "hard" },
  { name: "Pau Cubarsí", club: "Barcelona", nationality: "Spain", league: "La Liga", goals: 0, assists: 1, position: "CB", kitNumber: 2, age: 18, marketValue: 50, difficulty: "hard" },
  { name: "Iñigo Martínez", club: "Barcelona", nationality: "Spain", league: "La Liga", goals: 1, assists: 0, position: "CB", kitNumber: 5, age: 34, marketValue: 5, difficulty: "hard" },
  { name: "Ansu Fati", club: "Barcelona", nationality: "Spain", league: "La Liga", goals: 2, assists: 1, position: "LW", kitNumber: 10, age: 23, marketValue: 15, difficulty: "hard" },
  { name: "Iñaki Peña", club: "Barcelona", nationality: "Spain", league: "La Liga", goals: 0, assists: 0, position: "GK", kitNumber: 13, age: 26, marketValue: 8, difficulty: "hard" },

  // Atlético Madrid
  { name: "Alexander Sörloth", club: "Atlético Madrid", nationality: "Norway", league: "La Liga", goals: 8, assists: 2, position: "ST", kitNumber: 9, age: 30, marketValue: 22, difficulty: "hard" },
  { name: "Rodrigo De Paul", club: "Atlético Madrid", nationality: "Argentina", league: "La Liga", goals: 2, assists: 4, position: "CM", kitNumber: 5, age: 31, marketValue: 18, difficulty: "hard" },
  { name: "José María Giménez", club: "Atlético Madrid", nationality: "Uruguay", league: "La Liga", goals: 1, assists: 0, position: "CB", kitNumber: 2, age: 30, marketValue: 18, difficulty: "hard" },
  { name: "Marcos Llorente", club: "Atlético Madrid", nationality: "Spain", league: "La Liga", goals: 2, assists: 3, position: "CM", kitNumber: 14, age: 31, marketValue: 15, difficulty: "hard" },
  { name: "Samuel Lino", club: "Atlético Madrid", nationality: "Brazil", league: "La Liga", goals: 3, assists: 2, position: "LW", kitNumber: 12, age: 25, marketValue: 18, difficulty: "hard" },
  { name: "Conor Gallagher", club: "Atlético Madrid", nationality: "England", league: "La Liga", goals: 3, assists: 3, position: "CM", kitNumber: 8, age: 26, marketValue: 30, difficulty: "hard" },

  // Other La Liga
  { name: "Isco", club: "Real Betis", nationality: "Spain", league: "La Liga", goals: 3, assists: 4, position: "CAM", kitNumber: 22, age: 34, marketValue: 3, difficulty: "hard" },
  { name: "Álvaro Morata", club: "AC Milan", nationality: "Spain", league: "Serie A", goals: 6, assists: 2, position: "ST", kitNumber: 7, age: 33, marketValue: 12, difficulty: "hard" },
  { name: "Iago Aspas", club: "Celta Vigo", nationality: "Spain", league: "La Liga", goals: 8, assists: 3, position: "CF", kitNumber: 10, age: 38, marketValue: 2, difficulty: "hard" },
  { name: "Takefusa Kubo", club: "Real Sociedad", nationality: "Japan", league: "La Liga", goals: 5, assists: 4, position: "RW", kitNumber: 14, age: 24, marketValue: 40, difficulty: "hard" },
  { name: "Mikel Oyarzabal", club: "Real Sociedad", nationality: "Spain", league: "La Liga", goals: 6, assists: 3, position: "LW", kitNumber: 10, age: 28, marketValue: 30, difficulty: "hard" },
  { name: "Gerard Moreno", club: "Villarreal", nationality: "Spain", league: "La Liga", goals: 5, assists: 3, position: "ST", kitNumber: 7, age: 34, marketValue: 5, difficulty: "hard" },
  { name: "Yeremy Pino", club: "Villarreal", nationality: "Spain", league: "La Liga", goals: 4, assists: 3, position: "RW", kitNumber: 21, age: 23, marketValue: 30, difficulty: "hard" },

  // === SERIE A — Bench & Rotation ===
  // Inter Milan
  { name: "Henrikh Mkhitaryan", club: "Inter Milan", nationality: "Armenia", league: "Serie A", goals: 2, assists: 3, position: "CM", kitNumber: 22, age: 37, marketValue: 3, difficulty: "hard" },
  { name: "Denzel Dumfries", club: "Inter Milan", nationality: "Netherlands", league: "Serie A", goals: 2, assists: 4, position: "RWB", kitNumber: 2, age: 30, marketValue: 25, difficulty: "hard" },
  { name: "Yann Sommer", club: "Inter Milan", nationality: "Switzerland", league: "Serie A", goals: 0, assists: 0, position: "GK", kitNumber: 1, age: 37, marketValue: 3, difficulty: "hard" },
  { name: "Alessandro Bastoni", club: "Inter Milan", nationality: "Italy", league: "Serie A", goals: 1, assists: 3, position: "CB", kitNumber: 95, age: 26, marketValue: 65, difficulty: "hard" },
  { name: "Stefan de Vrij", club: "Inter Milan", nationality: "Netherlands", league: "Serie A", goals: 1, assists: 0, position: "CB", kitNumber: 6, age: 34, marketValue: 5, difficulty: "hard" },
  { name: "Piotr Zieliński", club: "Inter Milan", nationality: "Poland", league: "Serie A", goals: 3, assists: 3, position: "CM", kitNumber: 7, age: 32, marketValue: 15, difficulty: "hard" },

  // Juventus
  { name: "Teun Koopmeiners", club: "Juventus", nationality: "Netherlands", league: "Serie A", goals: 4, assists: 4, position: "CAM", kitNumber: 8, age: 28, marketValue: 40, difficulty: "hard" },
  { name: "Weston McKennie", club: "Juventus", nationality: "USA", league: "Serie A", goals: 2, assists: 3, position: "CM", kitNumber: 16, age: 27, marketValue: 18, difficulty: "hard" },
  { name: "Timothy Weah", club: "Juventus", nationality: "USA", league: "Serie A", goals: 3, assists: 2, position: "RW", kitNumber: 22, age: 26, marketValue: 12, difficulty: "hard" },
  { name: "Andrea Cambiaso", club: "Juventus", nationality: "Italy", league: "Serie A", goals: 2, assists: 4, position: "LB", kitNumber: 27, age: 25, marketValue: 30, difficulty: "hard" },
  { name: "Danilo", club: "Juventus", nationality: "Brazil", league: "Serie A", goals: 0, assists: 1, position: "RB", kitNumber: 6, age: 34, marketValue: 3, difficulty: "hard" },
  { name: "Kenan Yıldız", club: "Juventus", nationality: "Turkey", league: "Serie A", goals: 4, assists: 3, position: "LW", kitNumber: 10, age: 21, marketValue: 35, difficulty: "hard" },
  { name: "Francisco Conceição", club: "Juventus", nationality: "Portugal", league: "Serie A", goals: 3, assists: 4, position: "RW", kitNumber: 7, age: 23, marketValue: 30, difficulty: "hard" },
  { name: "Michele Di Gregorio", club: "Juventus", nationality: "Italy", league: "Serie A", goals: 0, assists: 0, position: "GK", kitNumber: 29, age: 28, marketValue: 18, difficulty: "hard" },

  // AC Milan
  { name: "Christian Pulisic", club: "AC Milan", nationality: "USA", league: "Serie A", goals: 7, assists: 5, position: "RW", kitNumber: 11, age: 27, marketValue: 35, difficulty: "hard" },
  { name: "Tijjani Reijnders", club: "AC Milan", nationality: "Netherlands", league: "Serie A", goals: 5, assists: 4, position: "CM", kitNumber: 14, age: 27, marketValue: 45, difficulty: "hard" },
  { name: "Samuel Chukwueze", club: "AC Milan", nationality: "Nigeria", league: "Serie A", goals: 3, assists: 2, position: "RW", kitNumber: 21, age: 26, marketValue: 18, difficulty: "hard" },
  { name: "Fikayo Tomori", club: "AC Milan", nationality: "England", league: "Serie A", goals: 1, assists: 0, position: "CB", kitNumber: 23, age: 28, marketValue: 22, difficulty: "hard" },
  { name: "Yunus Musah", club: "AC Milan", nationality: "USA", league: "Serie A", goals: 1, assists: 2, position: "CM", kitNumber: 80, age: 23, marketValue: 18, difficulty: "hard" },
  { name: "Ruben Loftus-Cheek", club: "AC Milan", nationality: "England", league: "Serie A", goals: 2, assists: 2, position: "CM", kitNumber: 8, age: 30, marketValue: 12, difficulty: "hard" },

  // Napoli
  { name: "Matteo Politano", club: "Napoli", nationality: "Italy", league: "Serie A", goals: 5, assists: 4, position: "RW", kitNumber: 21, age: 32, marketValue: 10, difficulty: "hard" },
  { name: "Giovanni Di Lorenzo", club: "Napoli", nationality: "Italy", league: "Serie A", goals: 2, assists: 3, position: "RB", kitNumber: 22, age: 32, marketValue: 18, difficulty: "hard" },
  { name: "André Zambo Anguissa", club: "Napoli", nationality: "Cameroon", league: "Serie A", goals: 1, assists: 3, position: "CM", kitNumber: 99, age: 30, marketValue: 22, difficulty: "hard" },
  { name: "Scott McTominay", club: "Napoli", nationality: "Scotland", league: "Serie A", goals: 4, assists: 2, position: "CM", kitNumber: 4, age: 29, marketValue: 25, difficulty: "hard" },
  { name: "Stanislav Lobotka", club: "Napoli", nationality: "Slovakia", league: "Serie A", goals: 0, assists: 2, position: "CDM", kitNumber: 68, age: 31, marketValue: 25, difficulty: "hard" },
  { name: "Alex Meret", club: "Napoli", nationality: "Italy", league: "Serie A", goals: 0, assists: 0, position: "GK", kitNumber: 1, age: 28, marketValue: 12, difficulty: "hard" },

  // Roma / Lazio / Fiorentina
  { name: "Lorenzo Pellegrini", club: "Roma", nationality: "Italy", league: "Serie A", goals: 3, assists: 4, position: "CAM", kitNumber: 7, age: 29, marketValue: 22, difficulty: "hard" },
  { name: "Gianluca Mancini", club: "Roma", nationality: "Italy", league: "Serie A", goals: 2, assists: 0, position: "CB", kitNumber: 23, age: 29, marketValue: 15, difficulty: "hard" },
  { name: "Ciro Immobile", club: "Besiktas", nationality: "Italy", league: "Turkish Süper Lig", goals: 8, assists: 2, position: "ST", kitNumber: 9, age: 36, marketValue: 4, difficulty: "hard" },
  { name: "Moise Kean", club: "Fiorentina", nationality: "Italy", league: "Serie A", goals: 9, assists: 2, position: "ST", kitNumber: 18, age: 26, marketValue: 30, difficulty: "hard" },
  { name: "Albert Guðmundsson", club: "Fiorentina", nationality: "Iceland", league: "Serie A", goals: 5, assists: 3, position: "CF", kitNumber: 10, age: 28, marketValue: 22, difficulty: "hard" },

  // === BUNDESLIGA — Bench & Rotation ===
  // Bayern Munich
  // Leroy Sané already in easy
  { name: "Kingsley Coman", club: "Bayern Munich", nationality: "France", league: "Bundesliga", goals: 4, assists: 4, position: "RW", kitNumber: 11, age: 29, marketValue: 28, difficulty: "hard" },
  { name: "Leon Goretzka", club: "Bayern Munich", nationality: "Germany", league: "Bundesliga", goals: 2, assists: 3, position: "CM", kitNumber: 8, age: 31, marketValue: 18, difficulty: "hard" },
  { name: "Dayot Upamecano", club: "Bayern Munich", nationality: "France", league: "Bundesliga", goals: 1, assists: 0, position: "CB", kitNumber: 2, age: 27, marketValue: 40, difficulty: "hard" },
  { name: "Min-jae Kim", club: "Bayern Munich", nationality: "South Korea", league: "Bundesliga", goals: 1, assists: 0, position: "CB", kitNumber: 3, age: 29, marketValue: 55, difficulty: "hard" },
  { name: "João Palhinha", club: "Bayern Munich", nationality: "Portugal", league: "Bundesliga", goals: 1, assists: 2, position: "CDM", kitNumber: 6, age: 30, marketValue: 35, difficulty: "hard" },
  { name: "Serge Gnabry", club: "Bayern Munich", nationality: "Germany", league: "Bundesliga", goals: 5, assists: 3, position: "RW", kitNumber: 7, age: 30, marketValue: 22, difficulty: "hard" },
  { name: "Thomas Müller", club: "Bayern Munich", nationality: "Germany", league: "Bundesliga", goals: 3, assists: 5, position: "CF", kitNumber: 25, age: 37, marketValue: 3, difficulty: "hard" },

  // Borussia Dortmund
  { name: "Marcel Sabitzer", club: "Borussia Dortmund", nationality: "Austria", league: "Bundesliga", goals: 4, assists: 3, position: "CM", kitNumber: 20, age: 32, marketValue: 12, difficulty: "hard" },
  { name: "Julian Brandt", club: "Borussia Dortmund", nationality: "Germany", league: "Bundesliga", goals: 5, assists: 6, position: "CAM", kitNumber: 10, age: 30, marketValue: 25, difficulty: "hard" },
  { name: "Nico Schlotterbeck", club: "Borussia Dortmund", nationality: "Germany", league: "Bundesliga", goals: 2, assists: 1, position: "CB", kitNumber: 4, age: 26, marketValue: 30, difficulty: "hard" },
  { name: "Emre Can", club: "Borussia Dortmund", nationality: "Germany", league: "Bundesliga", goals: 1, assists: 2, position: "CDM", kitNumber: 23, age: 32, marketValue: 8, difficulty: "hard" },
  { name: "Gregor Kobel", club: "Borussia Dortmund", nationality: "Switzerland", league: "Bundesliga", goals: 0, assists: 0, position: "GK", kitNumber: 1, age: 28, marketValue: 28, difficulty: "hard" },
  { name: "Jamie Gittens", club: "Borussia Dortmund", nationality: "England", league: "Bundesliga", goals: 7, assists: 3, position: "LW", kitNumber: 43, age: 21, marketValue: 35, difficulty: "hard" },
  { name: "Ramy Bensebaini", club: "Borussia Dortmund", nationality: "Algeria", league: "Bundesliga", goals: 1, assists: 2, position: "LB", kitNumber: 5, age: 30, marketValue: 12, difficulty: "hard" },

  // Bayer Leverkusen
  { name: "Patrik Schick", club: "Bayer Leverkusen", nationality: "Czech Republic", league: "Bundesliga", goals: 7, assists: 2, position: "ST", kitNumber: 14, age: 30, marketValue: 15, difficulty: "hard" },
  { name: "Jeremie Frimpong", club: "Bayer Leverkusen", nationality: "Netherlands", league: "Bundesliga", goals: 4, assists: 5, position: "RWB", kitNumber: 30, age: 25, marketValue: 42, difficulty: "hard" },
  { name: "Exequiel Palacios", club: "Bayer Leverkusen", nationality: "Argentina", league: "Bundesliga", goals: 2, assists: 3, position: "CM", kitNumber: 25, age: 27, marketValue: 22, difficulty: "hard" },
  // Jonathan Tah already in easy
  { name: "Robert Andrich", club: "Bayer Leverkusen", nationality: "Germany", league: "Bundesliga", goals: 2, assists: 2, position: "CDM", kitNumber: 21, age: 31, marketValue: 18, difficulty: "hard" },

  // RB Leipzig / Others
  { name: "Benjamin Šeško", club: "RB Leipzig", nationality: "Slovenia", league: "Bundesliga", goals: 12, assists: 3, position: "ST", kitNumber: 14, age: 22, marketValue: 60, difficulty: "hard" },
  // Dani Olmo - duplicate removed
  { name: "Loïs Openda", club: "RB Leipzig", nationality: "Belgium", league: "Bundesliga", goals: 10, assists: 4, position: "ST", kitNumber: 11, age: 26, marketValue: 55, difficulty: "hard" },
  { name: "Deniz Undav", club: "VfB Stuttgart", nationality: "Germany", league: "Bundesliga", goals: 9, assists: 5, position: "ST", kitNumber: 17, age: 29, marketValue: 30, difficulty: "hard" },
  { name: "Tim Kleindienst", club: "Borussia Mönchengladbach", nationality: "Germany", league: "Bundesliga", goals: 8, assists: 3, position: "ST", kitNumber: 9, age: 30, marketValue: 12, difficulty: "hard" },
  { name: "Omar Marmoush", club: "Eintracht Frankfurt", nationality: "Egypt", league: "Bundesliga", goals: 13, assists: 6, position: "ST", kitNumber: 7, age: 26, marketValue: 40, difficulty: "hard" },

  // === LIGUE 1 — Bench & Rotation ===
  // PSG
  { name: "Randal Kolo Muani", club: "PSG", nationality: "France", league: "Ligue 1", goals: 3, assists: 2, position: "ST", kitNumber: 23, age: 27, marketValue: 35, difficulty: "hard" },
  { name: "Nuno Mendes", club: "PSG", nationality: "Portugal", league: "Ligue 1", goals: 0, assists: 3, position: "LB", kitNumber: 25, age: 23, marketValue: 40, difficulty: "hard" },
  { name: "Presnel Kimpembe", club: "PSG", nationality: "France", league: "Ligue 1", goals: 0, assists: 0, position: "CB", kitNumber: 3, age: 30, marketValue: 8, difficulty: "hard" },
  { name: "Fabian Ruiz", club: "PSG", nationality: "Spain", league: "Ligue 1", goals: 3, assists: 4, position: "CM", kitNumber: 8, age: 30, marketValue: 25, difficulty: "hard" },
  { name: "Milan Škriniar", club: "PSG", nationality: "Slovakia", league: "Ligue 1", goals: 1, assists: 0, position: "CB", kitNumber: 37, age: 31, marketValue: 15, difficulty: "hard" },

  // Marseille / Lyon / Monaco
  { name: "Elye Wahi", club: "Marseille", nationality: "France", league: "Ligue 1", goals: 5, assists: 2, position: "ST", kitNumber: 9, age: 22, marketValue: 22, difficulty: "hard" },
  { name: "Adrien Rabiot", club: "Marseille", nationality: "France", league: "Ligue 1", goals: 3, assists: 3, position: "CM", kitNumber: 25, age: 31, marketValue: 15, difficulty: "hard" },
  { name: "Rayan Cherki", club: "Lyon", nationality: "France", league: "Ligue 1", goals: 6, assists: 5, position: "CAM", kitNumber: 18, age: 22, marketValue: 30, difficulty: "hard" },
  { name: "Alexandre Lacazette", club: "Lyon", nationality: "France", league: "Ligue 1", goals: 8, assists: 3, position: "ST", kitNumber: 10, age: 35, marketValue: 5, difficulty: "hard" },
  { name: "Lamine Camara", club: "Monaco", nationality: "Senegal", league: "Ligue 1", goals: 3, assists: 4, position: "CM", kitNumber: 28, age: 21, marketValue: 22, difficulty: "hard" },
  { name: "Eliesse Ben Seghir", club: "Monaco", nationality: "Morocco", league: "Ligue 1", goals: 4, assists: 3, position: "LW", kitNumber: 7, age: 20, marketValue: 22, difficulty: "hard" },
  { name: "Folarin Balogun", club: "Monaco", nationality: "USA", league: "Ligue 1", goals: 6, assists: 2, position: "ST", kitNumber: 9, age: 24, marketValue: 22, difficulty: "hard" },

  // === OTHER BIG CLUBS WORLDWIDE ===
  // Liga Portugal
  { name: "Mehdi Taremi", club: "Inter Milan", nationality: "Iran", league: "Serie A", goals: 4, assists: 3, position: "ST", kitNumber: 99, age: 33, marketValue: 15, difficulty: "hard" },
  { name: "Galeno", club: "Porto", nationality: "Brazil", league: "Liga Portugal", goals: 8, assists: 5, position: "LW", kitNumber: 70, age: 27, marketValue: 30, difficulty: "hard" },
  { name: "Pepê", club: "Porto", nationality: "Brazil", league: "Liga Portugal", goals: 5, assists: 3, position: "RW", kitNumber: 17, age: 28, marketValue: 18, difficulty: "hard" },
  { name: "Rafa Silva", club: "Benfica", nationality: "Portugal", league: "Liga Portugal", goals: 4, assists: 5, position: "RW", kitNumber: 27, age: 32, marketValue: 8, difficulty: "hard" },
  // Viktor Gyökeres already in easy

  // Eredivisie
  { name: "Mats Wieffer", club: "Brighton", nationality: "Netherlands", league: "Premier League", goals: 1, assists: 2, position: "CDM", kitNumber: 4, age: 26, marketValue: 22, difficulty: "hard" },
  { name: "Lutsharel Geertruida", club: "RB Leipzig", nationality: "Netherlands", league: "Bundesliga", goals: 2, assists: 3, position: "RB", kitNumber: 22, age: 25, marketValue: 22, difficulty: "hard" },
  { name: "Quinten Timber", club: "Feyenoord", nationality: "Netherlands", league: "Eredivisie", goals: 3, assists: 5, position: "CM", kitNumber: 21, age: 24, marketValue: 15, difficulty: "hard" },
  { name: "Kenneth Taylor", club: "Ajax", nationality: "Netherlands", league: "Eredivisie", goals: 4, assists: 3, position: "CM", kitNumber: 8, age: 23, marketValue: 15, difficulty: "hard" },
  { name: "Jorrel Hato", club: "Ajax", nationality: "Netherlands", league: "Eredivisie", goals: 2, assists: 3, position: "LB", kitNumber: 4, age: 19, marketValue: 25, difficulty: "hard" },

  // Turkish Süper Lig
  { name: "Hakim Ziyech", club: "Galatasaray", nationality: "Morocco", league: "Turkish Süper Lig", goals: 4, assists: 6, position: "CAM", kitNumber: 10, age: 33, marketValue: 5, difficulty: "hard" },
  { name: "Mauro Icardi", club: "Galatasaray", nationality: "Argentina", league: "Turkish Süper Lig", goals: 5, assists: 2, position: "ST", kitNumber: 9, age: 33, marketValue: 5, difficulty: "hard" },
  { name: "Cenk Tosun", club: "Besiktas", nationality: "Turkey", league: "Turkish Süper Lig", goals: 6, assists: 2, position: "ST", kitNumber: 23, age: 35, marketValue: 2, difficulty: "hard" },
  // José Mourinho removed (manager, not a player)

  // Saudi Pro League
  { name: "Roberto Firmino", club: "Al-Ahli", nationality: "Brazil", league: "Saudi Pro League", goals: 7, assists: 4, position: "CF", kitNumber: 9, age: 34, marketValue: 5, difficulty: "hard" },
  { name: "Ivan Toney", club: "Al-Ahli", nationality: "England", league: "Saudi Pro League", goals: 8, assists: 3, position: "ST", kitNumber: 18, age: 30, marketValue: 22, difficulty: "hard" },
  { name: "Sergej Milinković-Savić", club: "Al-Hilal", nationality: "Serbia", league: "Saudi Pro League", goals: 4, assists: 5, position: "CM", kitNumber: 21, age: 31, marketValue: 15, difficulty: "hard" },
  // Neymar already in easy
  { name: "Rúben Neves", club: "Al-Hilal", nationality: "Portugal", league: "Saudi Pro League", goals: 2, assists: 4, position: "CM", kitNumber: 8, age: 29, marketValue: 18, difficulty: "hard" },
  // Moussa Diaby already in hard (above)
  { name: "Brozović", club: "Al-Nassr", nationality: "Croatia", league: "Saudi Pro League", goals: 1, assists: 3, position: "CDM", kitNumber: 77, age: 33, marketValue: 5, difficulty: "hard" },
  { name: "Aymeric Laporte", club: "Al-Nassr", nationality: "Spain", league: "Saudi Pro League", goals: 1, assists: 0, position: "CB", kitNumber: 4, age: 32, marketValue: 12, difficulty: "hard" },
  { name: "Fabinho", club: "Al-Ittihad", nationality: "Brazil", league: "Saudi Pro League", goals: 1, assists: 2, position: "CDM", kitNumber: 3, age: 32, marketValue: 8, difficulty: "hard" },
  { name: "Jota", club: "Al-Ittihad", nationality: "Portugal", league: "Saudi Pro League", goals: 5, assists: 3, position: "LW", kitNumber: 11, age: 26, marketValue: 15, difficulty: "hard" },

  // MLS
  { name: "Lorenzo Insigne", club: "Toronto FC", nationality: "Italy", league: "MLS", goals: 5, assists: 4, position: "LW", kitNumber: 24, age: 35, marketValue: 3, difficulty: "hard" },
  { name: "Giorgos Giakoumakis", club: "Cruz Azul", nationality: "Greece", league: "MLS", goals: 8, assists: 2, position: "ST", kitNumber: 9, age: 31, marketValue: 5, difficulty: "hard" },
  { name: "Héctor Herrera", club: "Houston Dynamo", nationality: "Mexico", league: "MLS", goals: 2, assists: 3, position: "CM", kitNumber: 16, age: 36, marketValue: 2, difficulty: "hard" },
  { name: "Hugo Lloris", club: "LAFC", nationality: "France", league: "MLS", goals: 0, assists: 0, position: "GK", kitNumber: 1, age: 39, marketValue: 2, difficulty: "hard" },
  { name: "Olivier Giroud", club: "LAFC", nationality: "France", league: "MLS", goals: 7, assists: 2, position: "ST", kitNumber: 9, age: 39, marketValue: 2, difficulty: "hard" },
  { name: "Denis Bouanga", club: "LAFC", nationality: "Gabon", league: "MLS", goals: 14, assists: 5, position: "LW", kitNumber: 99, age: 30, marketValue: 5, difficulty: "hard" },
  { name: "Cucho Hernández", club: "Columbus Crew", nationality: "Colombia", league: "MLS", goals: 11, assists: 4, position: "ST", kitNumber: 9, age: 26, marketValue: 10, difficulty: "hard" },

  // Brazilian Série A
  // Luiz Henrique already in easy
  { name: "Memphis Depay", club: "Corinthians", nationality: "Netherlands", league: "Brazilian Série A", goals: 7, assists: 4, position: "CF", kitNumber: 94, age: 32, marketValue: 5, difficulty: "hard" },
  { name: "Thiago Almada", club: "Botafogo", nationality: "Argentina", league: "Brazilian Série A", goals: 4, assists: 5, position: "CAM", kitNumber: 23, age: 24, marketValue: 22, difficulty: "hard" },
  { name: "Germán Cano", club: "Fluminense", nationality: "Argentina", league: "Brazilian Série A", goals: 6, assists: 2, position: "ST", kitNumber: 14, age: 37, marketValue: 2, difficulty: "hard" },

  // Scottish Premiership / Other
  { name: "Matt O'Riley", club: "Brighton", nationality: "Denmark", league: "Premier League", goals: 3, assists: 4, position: "CM", kitNumber: 20, age: 24, marketValue: 22, difficulty: "hard" },
  { name: "Daizen Maeda", club: "Celtic", nationality: "Japan", league: "Scottish Premiership", goals: 10, assists: 3, position: "LW", kitNumber: 38, age: 28, marketValue: 8, difficulty: "hard" },
  { name: "Reo Hatate", club: "Celtic", nationality: "Japan", league: "Scottish Premiership", goals: 4, assists: 5, position: "CM", kitNumber: 41, age: 28, marketValue: 8, difficulty: "hard" },
  { name: "Callum McGregor", club: "Celtic", nationality: "Scotland", league: "Scottish Premiership", goals: 2, assists: 4, position: "CM", kitNumber: 42, age: 32, marketValue: 5, difficulty: "hard" },
  { name: "James Tavernier", club: "Rangers", nationality: "England", league: "Scottish Premiership", goals: 5, assists: 6, position: "RB", kitNumber: 2, age: 34, marketValue: 3, difficulty: "hard" },

  // More worldwide
  { name: "Patrick Vieira Jr", club: "Copenhagen", nationality: "Guinea-Bissau", league: "Danish Superliga", goals: 6, assists: 4, position: "CAM", kitNumber: 10, age: 24, marketValue: 10, difficulty: "hard" },
  { name: "Takumi Minamino", club: "Monaco", nationality: "Japan", league: "Ligue 1", goals: 3, assists: 2, position: "CAM", kitNumber: 18, age: 31, marketValue: 8, difficulty: "hard" },
  { name: "André Silva", club: "RB Leipzig", nationality: "Portugal", league: "Bundesliga", goals: 4, assists: 1, position: "ST", kitNumber: 9, age: 30, marketValue: 10, difficulty: "hard" },
  { name: "Willian", club: "Olympiacos", nationality: "Brazil", league: "Greek Super League", goals: 3, assists: 4, position: "RW", kitNumber: 10, age: 37, marketValue: 1, difficulty: "hard" },
  { name: "Youssef En-Nesyri", club: "Fenerbahçe", nationality: "Morocco", league: "Turkish Süper Lig", goals: 7, assists: 2, position: "ST", kitNumber: 18, age: 28, marketValue: 18, difficulty: "hard" },
  { name: "Talisca", club: "Fenerbahçe", nationality: "Brazil", league: "Turkish Süper Lig", goals: 6, assists: 3, position: "CAM", kitNumber: 94, age: 31, marketValue: 5, difficulty: "hard" },
  { name: "Edinson Cavani", club: "Boca Juniors", nationality: "Uruguay", league: "Argentine Primera División", goals: 5, assists: 2, position: "ST", kitNumber: 10, age: 39, marketValue: 2, difficulty: "hard" },
  { name: "Ángel Correa", club: "Atlético Madrid", nationality: "Argentina", league: "La Liga", goals: 4, assists: 3, position: "CF", kitNumber: 10, age: 30, marketValue: 18, difficulty: "hard" },
  { name: "Marcos Acuña", club: "Sevilla", nationality: "Argentina", league: "La Liga", goals: 1, assists: 3, position: "LB", kitNumber: 19, age: 34, marketValue: 3, difficulty: "hard" },
  { name: "Wissam Ben Yedder", club: "Free Agent", nationality: "France", league: "Ligue 1", goals: 0, assists: 0, position: "ST", kitNumber: 9, age: 36, marketValue: 1, difficulty: "hard" },
  { name: "Wilfried Zaha", club: "Galatasaray", nationality: "Ivory Coast", league: "Turkish Süper Lig", goals: 3, assists: 2, position: "LW", kitNumber: 11, age: 33, marketValue: 5, difficulty: "hard" },
  { name: "Raphaël Varane", club: "Como", nationality: "France", league: "Serie A", goals: 0, assists: 0, position: "CB", kitNumber: 5, age: 33, marketValue: 3, difficulty: "hard" },
  { name: "Keylor Navas", club: "Newell's Old Boys", nationality: "Costa Rica", league: "Argentine Primera División", goals: 0, assists: 0, position: "GK", kitNumber: 1, age: 39, marketValue: 1, difficulty: "hard" },

  // More PL bench / rotation
  { name: "Yoane Wissa", club: "Brentford", nationality: "DR Congo", league: "Premier League", goals: 8, assists: 3, position: "ST", kitNumber: 11, age: 29, marketValue: 22, difficulty: "hard" },
  { name: "Bryan Mbeumo", club: "Brentford", nationality: "Cameroon", league: "Premier League", goals: 10, assists: 5, position: "RW", kitNumber: 19, age: 26, marketValue: 35, difficulty: "hard" },
  // Ivan Toney - duplicate removed
  { name: "Emile Smith Rowe", club: "Fulham", nationality: "England", league: "Premier League", goals: 4, assists: 3, position: "CAM", kitNumber: 10, age: 25, marketValue: 22, difficulty: "hard" },
  { name: "Carlos Alcaraz", club: "Southampton", nationality: "Argentina", league: "Premier League", goals: 2, assists: 2, position: "CM", kitNumber: 28, age: 22, marketValue: 12, difficulty: "hard" },
  { name: "Raúl Jiménez", club: "Fulham", nationality: "Mexico", league: "Premier League", goals: 6, assists: 2, position: "ST", kitNumber: 9, age: 35, marketValue: 5, difficulty: "hard" },
  { name: "Douglas Luiz", club: "Juventus", nationality: "Brazil", league: "Serie A", goals: 2, assists: 3, position: "CM", kitNumber: 26, age: 27, marketValue: 25, difficulty: "hard" },
  { name: "Ezri Konsa", club: "Aston Villa", nationality: "England", league: "Premier League", goals: 1, assists: 0, position: "CB", kitNumber: 4, age: 28, marketValue: 30, difficulty: "hard" },
  { name: "Iliman Ndiaye", club: "Everton", nationality: "Senegal", league: "Premier League", goals: 4, assists: 2, position: "ST", kitNumber: 10, age: 25, marketValue: 18, difficulty: "hard" },
  { name: "André Gomes", club: "Everton", nationality: "Portugal", league: "Premier League", goals: 0, assists: 1, position: "CM", kitNumber: 21, age: 32, marketValue: 2, difficulty: "hard" },
  { name: "Danilo Gallinari", club: "Wolverhampton", nationality: "Italy", league: "Premier League", goals: 2, assists: 1, position: "CM", kitNumber: 5, age: 24, marketValue: 12, difficulty: "hard" },
  { name: "Rayan Aït-Nouri", club: "Wolverhampton", nationality: "Algeria", league: "Premier League", goals: 2, assists: 4, position: "LB", kitNumber: 3, age: 24, marketValue: 25, difficulty: "hard" },
  { name: "Joao Gomes", club: "Wolverhampton", nationality: "Brazil", league: "Premier League", goals: 2, assists: 2, position: "CM", kitNumber: 28, age: 24, marketValue: 22, difficulty: "hard" },
  { name: "James Trafford", club: "Burnley", nationality: "England", league: "Premier League", goals: 0, assists: 0, position: "GK", kitNumber: 1, age: 23, marketValue: 8, difficulty: "hard" },
  { name: "Wout Faes", club: "Leicester", nationality: "Belgium", league: "Premier League", goals: 1, assists: 0, position: "CB", kitNumber: 3, age: 27, marketValue: 12, difficulty: "hard" },
  { name: "Jamie Vardy", club: "Leicester", nationality: "England", league: "Premier League", goals: 5, assists: 2, position: "ST", kitNumber: 9, age: 39, marketValue: 2, difficulty: "hard" },
  { name: "Danny Ings", club: "West Ham", nationality: "England", league: "Premier League", goals: 2, assists: 1, position: "ST", kitNumber: 18, age: 33, marketValue: 2, difficulty: "hard" },
  { name: "Pascal Groß", club: "Borussia Dortmund", nationality: "Germany", league: "Bundesliga", goals: 2, assists: 4, position: "CM", kitNumber: 15, age: 34, marketValue: 5, difficulty: "hard" },
  { name: "Fabio Carvalho", club: "Brentford", nationality: "Portugal", league: "Premier League", goals: 3, assists: 2, position: "CAM", kitNumber: 20, age: 23, marketValue: 15, difficulty: "hard" },
  { name: "Diego Carlos", club: "Aston Villa", nationality: "Brazil", league: "Premier League", goals: 1, assists: 0, position: "CB", kitNumber: 15, age: 32, marketValue: 8, difficulty: "hard" },
];
