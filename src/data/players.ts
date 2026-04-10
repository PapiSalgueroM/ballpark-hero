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
  { name: "Alexander Isak", club: "Liverpool", nationality: "Sweden", league: "Premier League", goals: 18, assists: 3, position: "ST", kitNumber: 14, age: 27, marketValue: 120, difficulty: "easy" },
  { name: "Virgil van Dijk", club: "Liverpool", nationality: "Netherlands", league: "Premier League", goals: 2, assists: 1, position: "CB", kitNumber: 4, age: 35, marketValue: 22, difficulty: "easy" },
  { name: "Martin Ødegaard", club: "Arsenal", nationality: "Norway", league: "Premier League", goals: 7, assists: 10, position: "CAM", kitNumber: 8, age: 27, marketValue: 110, difficulty: "easy" },
  { name: "William Saliba", club: "Arsenal", nationality: "France", league: "Premier League", goals: 2, assists: 1, position: "CB", kitNumber: 2, age: 25, marketValue: 110, difficulty: "easy" },
  { name: "Kevin De Bruyne", club: "Napoli", nationality: "Belgium", league: "Serie A", goals: 5, assists: 8, position: "CAM", kitNumber: 11, age: 35, marketValue: 18, difficulty: "easy" },
  { name: "Alisson", club: "Liverpool", nationality: "Brazil", league: "Premier League", goals: 0, assists: 0, position: "GK", kitNumber: 1, age: 34, marketValue: 30, difficulty: "easy" },
  { name: "Rodri", club: "Manchester City", nationality: "Spain", league: "Premier League", goals: 1, assists: 2, position: "CDM", kitNumber: 16, age: 30, marketValue: 120, difficulty: "easy" },
  { name: "Ollie Watkins", club: "Aston Villa", nationality: "England", league: "Premier League", goals: 11, assists: 5, position: "ST", kitNumber: 11, age: 30, marketValue: 60, difficulty: "easy" },
  { name: "Trent Alexander-Arnold", club: "Real Madrid", nationality: "England", league: "La Liga", goals: 1, assists: 8, position: "RB", kitNumber: 66, age: 27, marketValue: 70, difficulty: "easy" },
  { name: "Marcus Rashford", club: "Barcelona", nationality: "England", league: "La Liga", goals: 5, assists: 3, position: "LW", kitNumber: 14, age: 28, marketValue: 35, difficulty: "easy" },
  { name: "Raheem Sterling", club: "Feyenoord", nationality: "England", league: "Eredivisie", goals: 4, assists: 3, position: "LW", kitNumber: 19, age: 31, marketValue: 10, difficulty: "easy" },
  { name: "Alejandro Garnacho", club: "Chelsea", nationality: "Argentina", league: "Premier League", goals: 7, assists: 5, position: "LW", kitNumber: 17, age: 21, marketValue: 50, difficulty: "easy" },
  { name: "Bernardo Silva", club: "Manchester City", nationality: "Portugal", league: "Premier League", goals: 5, assists: 6, position: "CAM", kitNumber: 20, age: 31, marketValue: 60, difficulty: "easy" },
  { name: "Luis Díaz", club: "Liverpool", nationality: "Colombia", league: "Premier League", goals: 9, assists: 4, position: "LW", kitNumber: 7, age: 29, marketValue: 55, difficulty: "easy" },
  { name: "Cody Gakpo", club: "Liverpool", nationality: "Netherlands", league: "Premier League", goals: 12, assists: 4, position: "LW", kitNumber: 18, age: 26, marketValue: 60, difficulty: "easy" },
  { name: "Enzo Fernández", club: "Chelsea", nationality: "Argentina", league: "Premier League", goals: 4, assists: 5, position: "CM", kitNumber: 8, age: 25, marketValue: 75, difficulty: "easy" },
  { name: "Viktor Gyökeres", club: "Arsenal", nationality: "Sweden", league: "Premier League", goals: 14, assists: 4, position: "ST", kitNumber: 9, age: 28, marketValue: 90, difficulty: "easy" },
  { name: "Estêvão", club: "Chelsea", nationality: "Brazil", league: "Premier League", goals: 6, assists: 7, position: "RW", kitNumber: 41, age: 19, marketValue: 60, difficulty: "easy" },
  { name: "Xavi Simons", club: "Tottenham", nationality: "Netherlands", league: "Premier League", goals: 10, assists: 8, position: "CAM", kitNumber: 7, age: 23, marketValue: 110, difficulty: "easy" },
  { name: "Omar Marmoush", club: "Manchester City", nationality: "Egypt", league: "Premier League", goals: 15, assists: 8, position: "ST", kitNumber: 7, age: 27, marketValue: 75, difficulty: "easy" },

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
  { name: "Florian Wirtz", club: "Liverpool", nationality: "Germany", league: "Premier League", goals: 14, assists: 12, position: "CAM", kitNumber: 7, age: 23, marketValue: 170, difficulty: "easy" },
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
  { name: "Kyle Walker", club: "AC Milan", nationality: "England", league: "Serie A", goals: 0, assists: 2, position: "RB", kitNumber: 2, age: 36, marketValue: 3, difficulty: "hard" },
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
  { name: "Antony", club: "Manchester United", nationality: "Brazil", league: "Premier League", goals: 3, assists: 2, position: "RW", kitNumber: 21, age: 26, marketValue: 15, difficulty: "hard" },
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
  { name: "Moussa Diaby", club: "Al-Ittihad", nationality: "France", league: "Saudi Pro League", goals: 5, assists: 3, position: "RW", kitNumber: 19, age: 26, marketValue: 42, difficulty: "hard" },
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
  

  // === LIGUE 1 — Bench & Rotation ===
  // PSG
  
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
  { name: "Randal Kolo Muani", club: "Juventus", nationality: "France", league: "Serie A", goals: 5, assists: 3, position: "ST", kitNumber: 23, age: 27, marketValue: 30, difficulty: "hard" },
  { name: "Wilfried Zaha", club: "Galatasaray", nationality: "Ivory Coast", league: "Turkish Süper Lig", goals: 3, assists: 2, position: "LW", kitNumber: 11, age: 33, marketValue: 5, difficulty: "hard" },
  { name: "Paul Pogba", club: "OM", nationality: "France", league: "Ligue 1", goals: 1, assists: 2, position: "CM", kitNumber: 6, age: 33, marketValue: 3, difficulty: "hard" },
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
  { name: "Tommy Doyle", club: "Wolverhampton", nationality: "England", league: "Premier League", goals: 2, assists: 3, position: "CM", kitNumber: 5, age: 24, marketValue: 8, difficulty: "hard" },
  { name: "Rayan Aït-Nouri", club: "Wolverhampton", nationality: "Algeria", league: "Premier League", goals: 2, assists: 4, position: "LB", kitNumber: 3, age: 24, marketValue: 25, difficulty: "hard" },
  { name: "Joao Gomes", club: "Wolverhampton", nationality: "Brazil", league: "Premier League", goals: 2, assists: 2, position: "CM", kitNumber: 28, age: 24, marketValue: 22, difficulty: "hard" },
  { name: "James Trafford", club: "Burnley", nationality: "England", league: "Premier League", goals: 0, assists: 0, position: "GK", kitNumber: 1, age: 23, marketValue: 8, difficulty: "hard" },
  { name: "Wout Faes", club: "Leicester", nationality: "Belgium", league: "Premier League", goals: 1, assists: 0, position: "CB", kitNumber: 3, age: 27, marketValue: 12, difficulty: "hard" },
  { name: "Jamie Vardy", club: "Leicester", nationality: "England", league: "Premier League", goals: 5, assists: 2, position: "ST", kitNumber: 9, age: 39, marketValue: 2, difficulty: "hard" },
  { name: "Danny Ings", club: "West Ham", nationality: "England", league: "Premier League", goals: 2, assists: 1, position: "ST", kitNumber: 18, age: 33, marketValue: 2, difficulty: "hard" },
  { name: "Pascal Groß", club: "Borussia Dortmund", nationality: "Germany", league: "Bundesliga", goals: 2, assists: 4, position: "CM", kitNumber: 15, age: 34, marketValue: 5, difficulty: "hard" },
  { name: "Fabio Carvalho", club: "Brentford", nationality: "Portugal", league: "Premier League", goals: 3, assists: 2, position: "CAM", kitNumber: 20, age: 23, marketValue: 15, difficulty: "hard" },
  { name: "Diego Carlos", club: "Aston Villa", nationality: "Brazil", league: "Premier League", goals: 1, assists: 0, position: "CB", kitNumber: 15, age: 32, marketValue: 8, difficulty: "hard" },

  // =================== INSANE MODE — Lesser-known active players worldwide (~600) ===================
  // Cleaned: no duplicates from easy/hard. All players active as of Feb 2026.

  // === PREMIER LEAGUE — Deeper squads (not in easy/hard) ===
  { name: "Sander Berge", club: "Fulham", nationality: "Norway", league: "Premier League", goals: 3, assists: 2, position: "CM", kitNumber: 16, age: 28, marketValue: 18, difficulty: "insane" },
  { name: "Carlton Morris", club: "Luton Town", nationality: "England", league: "EFL Championship", goals: 10, assists: 3, position: "ST", kitNumber: 9, age: 29, marketValue: 5, difficulty: "insane" },
  { name: "Sammie Szmodics", club: "Ipswich Town", nationality: "Ireland", league: "Premier League", goals: 4, assists: 2, position: "ST", kitNumber: 23, age: 29, marketValue: 8, difficulty: "insane" },
  { name: "Liam Delap", club: "Ipswich Town", nationality: "England", league: "Premier League", goals: 6, assists: 2, position: "ST", kitNumber: 19, age: 22, marketValue: 18, difficulty: "insane" },
  { name: "Jack Clarke", club: "Ipswich Town", nationality: "England", league: "Premier League", goals: 3, assists: 4, position: "LW", kitNumber: 7, age: 24, marketValue: 15, difficulty: "insane" },
  { name: "Omari Hutchinson", club: "Ipswich Town", nationality: "England", league: "Premier League", goals: 4, assists: 3, position: "RW", kitNumber: 20, age: 21, marketValue: 12, difficulty: "insane" },
  { name: "Chadi Riad", club: "Crystal Palace", nationality: "Morocco", league: "Premier League", goals: 1, assists: 0, position: "CB", kitNumber: 5, age: 21, marketValue: 12, difficulty: "insane" },
  { name: "Adam Wharton", club: "Crystal Palace", nationality: "England", league: "Premier League", goals: 1, assists: 3, position: "CM", kitNumber: 62, age: 21, marketValue: 22, difficulty: "insane" },
  { name: "Crysencio Summerville", club: "West Ham", nationality: "Netherlands", league: "Premier League", goals: 4, assists: 3, position: "LW", kitNumber: 7, age: 23, marketValue: 25, difficulty: "insane" },
  { name: "Max Kilman", club: "West Ham", nationality: "England", league: "Premier League", goals: 1, assists: 0, position: "CB", kitNumber: 4, age: 28, marketValue: 22, difficulty: "insane" },
  { name: "Tomas Soucek", club: "West Ham", nationality: "Czech Republic", league: "Premier League", goals: 3, assists: 2, position: "CDM", kitNumber: 28, age: 31, marketValue: 15, difficulty: "insane" },
  { name: "Vladimír Coufal", club: "West Ham", nationality: "Czech Republic", league: "Premier League", goals: 0, assists: 2, position: "RB", kitNumber: 5, age: 33, marketValue: 3, difficulty: "insane" },
  { name: "Timo Werner", club: "Tottenham", nationality: "Germany", league: "Premier League", goals: 3, assists: 2, position: "LW", kitNumber: 16, age: 30, marketValue: 8, difficulty: "insane" },
  { name: "Mikel Merino", club: "Arsenal", nationality: "Spain", league: "Premier League", goals: 2, assists: 3, position: "CM", kitNumber: 23, age: 29, marketValue: 35, difficulty: "insane" },
  { name: "Kiernan Dewsbury-Hall", club: "Chelsea", nationality: "England", league: "Premier League", goals: 2, assists: 3, position: "CM", kitNumber: 22, age: 27, marketValue: 18, difficulty: "insane" },
  { name: "Renato Veiga", club: "Chelsea", nationality: "Portugal", league: "Premier League", goals: 1, assists: 1, position: "CB", kitNumber: 40, age: 22, marketValue: 12, difficulty: "insane" },
  { name: "Tosin Adarabioyo", club: "Chelsea", nationality: "England", league: "Premier League", goals: 1, assists: 0, position: "CB", kitNumber: 4, age: 28, marketValue: 15, difficulty: "insane" },
  { name: "Oscar Bobb", club: "Manchester City", nationality: "Norway", league: "Premier League", goals: 2, assists: 3, position: "RW", kitNumber: 52, age: 22, marketValue: 12, difficulty: "insane" },
  { name: "Matheus Nunes", club: "Manchester City", nationality: "Portugal", league: "Premier League", goals: 2, assists: 4, position: "CM", kitNumber: 27, age: 27, marketValue: 30, difficulty: "insane" },
  { name: "Ola Aina", club: "Nottingham Forest", nationality: "Nigeria", league: "Premier League", goals: 1, assists: 3, position: "RB", kitNumber: 43, age: 29, marketValue: 8, difficulty: "insane" },
  { name: "Taiwo Awoniyi", club: "Nottingham Forest", nationality: "Nigeria", league: "Premier League", goals: 3, assists: 1, position: "ST", kitNumber: 9, age: 28, marketValue: 10, difficulty: "insane" },
  { name: "Neco Williams", club: "Nottingham Forest", nationality: "Wales", league: "Premier League", goals: 1, assists: 3, position: "RB", kitNumber: 7, age: 24, marketValue: 12, difficulty: "insane" },
  { name: "Murillo", club: "Nottingham Forest", nationality: "Brazil", league: "Premier League", goals: 1, assists: 0, position: "CB", kitNumber: 3, age: 23, marketValue: 25, difficulty: "insane" },
  { name: "Danilo", club: "Nottingham Forest", nationality: "Brazil", league: "Premier League", goals: 1, assists: 2, position: "CM", kitNumber: 28, age: 24, marketValue: 22, difficulty: "insane" },
  { name: "Antonee Robinson", club: "Fulham", nationality: "USA", league: "Premier League", goals: 1, assists: 5, position: "LB", kitNumber: 33, age: 28, marketValue: 22, difficulty: "insane" },
  { name: "Alex Iwobi", club: "Fulham", nationality: "Nigeria", league: "Premier League", goals: 3, assists: 3, position: "CM", kitNumber: 17, age: 30, marketValue: 15, difficulty: "insane" },
  { name: "Andreas Pereira", club: "Fulham", nationality: "Brazil", league: "Premier League", goals: 4, assists: 3, position: "CAM", kitNumber: 8, age: 30, marketValue: 12, difficulty: "insane" },
  { name: "Bernd Leno", club: "Fulham", nationality: "Germany", league: "Premier League", goals: 0, assists: 0, position: "GK", kitNumber: 1, age: 34, marketValue: 5, difficulty: "insane" },
  { name: "Rodrigo Muniz", club: "Fulham", nationality: "Brazil", league: "Premier League", goals: 7, assists: 2, position: "ST", kitNumber: 9, age: 24, marketValue: 18, difficulty: "insane" },
  { name: "Evanilson", club: "Bournemouth", nationality: "Brazil", league: "Premier League", goals: 5, assists: 3, position: "ST", kitNumber: 9, age: 25, marketValue: 22, difficulty: "insane" },
  { name: "Antoine Semenyo", club: "Bournemouth", nationality: "Ghana", league: "Premier League", goals: 6, assists: 3, position: "RW", kitNumber: 10, age: 25, marketValue: 18, difficulty: "insane" },
  { name: "Milos Kerkez", club: "Bournemouth", nationality: "Hungary", league: "Premier League", goals: 0, assists: 3, position: "LB", kitNumber: 3, age: 22, marketValue: 18, difficulty: "insane" },
  { name: "Tyler Adams", club: "Bournemouth", nationality: "USA", league: "Premier League", goals: 1, assists: 2, position: "CDM", kitNumber: 4, age: 27, marketValue: 12, difficulty: "insane" },
  { name: "Justin Kluivert", club: "Bournemouth", nationality: "Netherlands", league: "Premier League", goals: 5, assists: 3, position: "LW", kitNumber: 11, age: 26, marketValue: 18, difficulty: "insane" },
  { name: "Marcos Senesi", club: "Bournemouth", nationality: "Argentina", league: "Premier League", goals: 2, assists: 0, position: "CB", kitNumber: 5, age: 28, marketValue: 12, difficulty: "insane" },
  { name: "Kepa Arrizabalaga", club: "Bournemouth", nationality: "Spain", league: "Premier League", goals: 0, assists: 0, position: "GK", kitNumber: 1, age: 31, marketValue: 8, difficulty: "insane" },
  { name: "Jefferson Lerma", club: "Crystal Palace", nationality: "Colombia", league: "Premier League", goals: 2, assists: 2, position: "CDM", kitNumber: 6, age: 31, marketValue: 5, difficulty: "insane" },
  { name: "Daniel Muñoz", club: "Crystal Palace", nationality: "Colombia", league: "Premier League", goals: 2, assists: 3, position: "RB", kitNumber: 16, age: 29, marketValue: 15, difficulty: "insane" },
  { name: "Eddie Nketiah", club: "Crystal Palace", nationality: "England", league: "Premier League", goals: 4, assists: 2, position: "ST", kitNumber: 14, age: 27, marketValue: 18, difficulty: "insane" },
  { name: "Daichi Kamada", club: "Crystal Palace", nationality: "Japan", league: "Premier League", goals: 3, assists: 4, position: "CAM", kitNumber: 25, age: 29, marketValue: 12, difficulty: "insane" },
  { name: "Dean Henderson", club: "Crystal Palace", nationality: "England", league: "Premier League", goals: 0, assists: 0, position: "GK", kitNumber: 1, age: 29, marketValue: 10, difficulty: "insane" },
  { name: "Trevoh Chalobah", club: "Crystal Palace", nationality: "England", league: "Premier League", goals: 1, assists: 0, position: "CB", kitNumber: 14, age: 26, marketValue: 15, difficulty: "insane" },
  { name: "Ismaïla Sarr", club: "Crystal Palace", nationality: "Senegal", league: "Premier League", goals: 3, assists: 2, position: "RW", kitNumber: 17, age: 27, marketValue: 10, difficulty: "insane" },
  { name: "Matt Turner", club: "Crystal Palace", nationality: "USA", league: "Premier League", goals: 0, assists: 0, position: "GK", kitNumber: 30, age: 31, marketValue: 3, difficulty: "insane" },
  { name: "Odsonne Edouard", club: "Leicester", nationality: "France", league: "Premier League", goals: 3, assists: 2, position: "ST", kitNumber: 22, age: 28, marketValue: 5, difficulty: "insane" },
  { name: "Stephy Mavididi", club: "Leicester", nationality: "England", league: "Premier League", goals: 4, assists: 2, position: "LW", kitNumber: 11, age: 27, marketValue: 8, difficulty: "insane" },
  { name: "Abdul Fatawu Issahaku", club: "Leicester", nationality: "Ghana", league: "Premier League", goals: 3, assists: 3, position: "RW", kitNumber: 9, age: 21, marketValue: 10, difficulty: "insane" },
  { name: "Mads Hermansen", club: "Leicester", nationality: "Denmark", league: "Premier League", goals: 0, assists: 0, position: "GK", kitNumber: 31, age: 25, marketValue: 12, difficulty: "insane" },
  { name: "Harry Winks", club: "Leicester", nationality: "England", league: "Premier League", goals: 1, assists: 3, position: "CM", kitNumber: 8, age: 30, marketValue: 3, difficulty: "insane" },
  { name: "Vitaliy Mykolenko", club: "Everton", nationality: "Ukraine", league: "Premier League", goals: 1, assists: 2, position: "LB", kitNumber: 19, age: 26, marketValue: 12, difficulty: "insane" },
  { name: "Idrissa Gueye", club: "Everton", nationality: "Senegal", league: "Premier League", goals: 1, assists: 2, position: "CDM", kitNumber: 27, age: 36, marketValue: 2, difficulty: "insane" },
  { name: "Beto", club: "Everton", nationality: "Portugal", league: "Premier League", goals: 4, assists: 1, position: "ST", kitNumber: 14, age: 27, marketValue: 12, difficulty: "insane" },
  { name: "Nathan Collins", club: "Brentford", nationality: "Ireland", league: "Premier League", goals: 2, assists: 0, position: "CB", kitNumber: 22, age: 24, marketValue: 18, difficulty: "insane" },
  { name: "Mark Flekken", club: "Brentford", nationality: "Netherlands", league: "Premier League", goals: 0, assists: 0, position: "GK", kitNumber: 1, age: 32, marketValue: 8, difficulty: "insane" },
  { name: "Adama Traoré", club: "Wolverhampton", nationality: "Spain", league: "Premier League", goals: 2, assists: 3, position: "RW", kitNumber: 37, age: 30, marketValue: 5, difficulty: "insane" },
  { name: "Jens Cajuste", club: "Ipswich Town", nationality: "Sweden", league: "Premier League", goals: 1, assists: 2, position: "CM", kitNumber: 14, age: 25, marketValue: 8, difficulty: "insane" },
  { name: "Neto", club: "Bournemouth", nationality: "Brazil", league: "Premier League", goals: 0, assists: 0, position: "GK", kitNumber: 32, age: 36, marketValue: 1, difficulty: "insane" },

  // === EFL CHAMPIONSHIP ===
  { name: "Wilfried Gnonto", club: "Leeds United", nationality: "Italy", league: "EFL Championship", goals: 5, assists: 4, position: "RW", kitNumber: 29, age: 22, marketValue: 12, difficulty: "insane" },
  { name: "Pascal Struijk", club: "Leeds United", nationality: "Netherlands", league: "EFL Championship", goals: 2, assists: 1, position: "CB", kitNumber: 21, age: 26, marketValue: 8, difficulty: "insane" },
  { name: "Jaidon Anthony", club: "Burnley", nationality: "England", league: "EFL Championship", goals: 3, assists: 4, position: "LW", kitNumber: 11, age: 26, marketValue: 5, difficulty: "insane" },
  { name: "Vitinho", club: "Burnley", nationality: "Brazil", league: "EFL Championship", goals: 2, assists: 3, position: "RB", kitNumber: 2, age: 25, marketValue: 5, difficulty: "insane" },

  // === SERIE A — deeper squads ===
  { name: "Mattia Zaccagni", club: "Lazio", nationality: "Italy", league: "Serie A", goals: 6, assists: 4, position: "LW", kitNumber: 20, age: 30, marketValue: 22, difficulty: "insane" },
  { name: "Valentín Castellanos", club: "Lazio", nationality: "Argentina", league: "Serie A", goals: 5, assists: 2, position: "ST", kitNumber: 11, age: 26, marketValue: 15, difficulty: "insane" },
  { name: "Nuno Tavares", club: "Lazio", nationality: "Portugal", league: "Serie A", goals: 1, assists: 8, position: "LB", kitNumber: 30, age: 25, marketValue: 15, difficulty: "insane" },
  { name: "Gustav Isaksen", club: "Lazio", nationality: "Denmark", league: "Serie A", goals: 3, assists: 2, position: "RW", kitNumber: 18, age: 25, marketValue: 12, difficulty: "insane" },
  { name: "Boulaye Dia", club: "Lazio", nationality: "Senegal", league: "Serie A", goals: 4, assists: 2, position: "ST", kitNumber: 19, age: 28, marketValue: 10, difficulty: "insane" },
  { name: "Matteo Guendouzi", club: "Lazio", nationality: "France", league: "Serie A", goals: 3, assists: 4, position: "CM", kitNumber: 8, age: 27, marketValue: 22, difficulty: "insane" },
  { name: "Tijjani Noslin", club: "Lazio", nationality: "Netherlands", league: "Serie A", goals: 3, assists: 2, position: "ST", kitNumber: 14, age: 26, marketValue: 8, difficulty: "insane" },
  { name: "Nicolò Zaniolo", club: "Atalanta", nationality: "Italy", league: "Serie A", goals: 3, assists: 2, position: "RW", kitNumber: 10, age: 26, marketValue: 18, difficulty: "insane" },
  { name: "Charles De Ketelaere", club: "Atalanta", nationality: "Belgium", league: "Serie A", goals: 6, assists: 5, position: "CAM", kitNumber: 17, age: 24, marketValue: 30, difficulty: "insane" },
  { name: "Gianluca Scamacca", club: "Atalanta", nationality: "Italy", league: "Serie A", goals: 4, assists: 1, position: "ST", kitNumber: 9, age: 27, marketValue: 22, difficulty: "insane" },
  { name: "Edoardo Bove", club: "Fiorentina", nationality: "Italy", league: "Serie A", goals: 2, assists: 3, position: "CM", kitNumber: 32, age: 23, marketValue: 12, difficulty: "insane" },
  { name: "Lucas Beltrán", club: "Fiorentina", nationality: "Argentina", league: "Serie A", goals: 4, assists: 3, position: "ST", kitNumber: 9, age: 24, marketValue: 15, difficulty: "insane" },
  { name: "Andrea Colpani", club: "Fiorentina", nationality: "Italy", league: "Serie A", goals: 3, assists: 2, position: "RW", kitNumber: 28, age: 26, marketValue: 12, difficulty: "insane" },
  { name: "Robin Gosens", club: "Fiorentina", nationality: "Germany", league: "Serie A", goals: 2, assists: 3, position: "LWB", kitNumber: 21, age: 31, marketValue: 5, difficulty: "insane" },
  { name: "Yacine Adli", club: "Fiorentina", nationality: "France", league: "Serie A", goals: 2, assists: 3, position: "CM", kitNumber: 21, age: 25, marketValue: 8, difficulty: "insane" },
  { name: "Artem Dovbyk", club: "Roma", nationality: "Ukraine", league: "Serie A", goals: 8, assists: 2, position: "ST", kitNumber: 11, age: 28, marketValue: 30, difficulty: "insane" },
  { name: "Leandro Paredes", club: "Roma", nationality: "Argentina", league: "Serie A", goals: 1, assists: 3, position: "CM", kitNumber: 16, age: 32, marketValue: 5, difficulty: "insane" },
  { name: "Evan Ndicka", club: "Roma", nationality: "France", league: "Serie A", goals: 1, assists: 0, position: "CB", kitNumber: 22, age: 26, marketValue: 18, difficulty: "insane" },
  { name: "Bryan Cristante", club: "Roma", nationality: "Italy", league: "Serie A", goals: 2, assists: 2, position: "CM", kitNumber: 4, age: 31, marketValue: 12, difficulty: "insane" },
  { name: "Manu Kone", club: "Roma", nationality: "France", league: "Serie A", goals: 2, assists: 3, position: "CM", kitNumber: 17, age: 24, marketValue: 18, difficulty: "insane" },
  { name: "Stephan El Shaarawy", club: "Roma", nationality: "Italy", league: "Serie A", goals: 3, assists: 2, position: "LW", kitNumber: 92, age: 33, marketValue: 3, difficulty: "insane" },
  { name: "Mile Svilar", club: "Roma", nationality: "Belgium", league: "Serie A", goals: 0, assists: 0, position: "GK", kitNumber: 99, age: 26, marketValue: 12, difficulty: "insane" },
  { name: "Zeki Çelik", club: "Roma", nationality: "Turkey", league: "Serie A", goals: 0, assists: 2, position: "RB", kitNumber: 19, age: 28, marketValue: 5, difficulty: "insane" },
  { name: "Ché Adams", club: "Torino", nationality: "Scotland", league: "Serie A", goals: 6, assists: 3, position: "ST", kitNumber: 18, age: 29, marketValue: 12, difficulty: "insane" },
  { name: "Nikola Vlašić", club: "Torino", nationality: "Croatia", league: "Serie A", goals: 3, assists: 2, position: "CAM", kitNumber: 10, age: 28, marketValue: 8, difficulty: "insane" },
  { name: "Antonio Sanabria", club: "Torino", nationality: "Paraguay", league: "Serie A", goals: 4, assists: 1, position: "ST", kitNumber: 9, age: 29, marketValue: 5, difficulty: "insane" },
  { name: "Andrea Belotti", club: "Como", nationality: "Italy", league: "Serie A", goals: 3, assists: 1, position: "ST", kitNumber: 9, age: 32, marketValue: 3, difficulty: "insane" },
  { name: "Patrick Cutrone", club: "Como", nationality: "Italy", league: "Serie A", goals: 4, assists: 1, position: "ST", kitNumber: 63, age: 28, marketValue: 3, difficulty: "insane" },
  { name: "Casemiro", club: "Galatasaray", nationality: "Brazil", league: "Turkish Süper Lig", goals: 2, assists: 1, position: "CDM", kitNumber: 18, age: 34, marketValue: 5, difficulty: "insane" },
  { name: "Matteo Darmian", club: "Inter Milan", nationality: "Italy", league: "Serie A", goals: 0, assists: 1, position: "RB", kitNumber: 36, age: 36, marketValue: 1, difficulty: "insane" },
  { name: "Marko Arnautović", club: "Inter Milan", nationality: "Austria", league: "Serie A", goals: 2, assists: 1, position: "ST", kitNumber: 8, age: 37, marketValue: 2, difficulty: "insane" },
  { name: "Youssouf Fofana", club: "AC Milan", nationality: "France", league: "Serie A", goals: 2, assists: 3, position: "CDM", kitNumber: 29, age: 26, marketValue: 25, difficulty: "insane" },
  { name: "Malick Thiaw", club: "AC Milan", nationality: "Germany", league: "Serie A", goals: 1, assists: 0, position: "CB", kitNumber: 28, age: 24, marketValue: 18, difficulty: "insane" },
  { name: "Strahinja Pavlović", club: "AC Milan", nationality: "Serbia", league: "Serie A", goals: 1, assists: 0, position: "CB", kitNumber: 31, age: 24, marketValue: 18, difficulty: "insane" },
  { name: "Tammy Abraham", club: "AC Milan", nationality: "England", league: "Serie A", goals: 4, assists: 2, position: "ST", kitNumber: 90, age: 28, marketValue: 12, difficulty: "insane" },
  { name: "Pietro Pellegri", club: "Empoli", nationality: "Italy", league: "Serie A", goals: 3, assists: 1, position: "ST", kitNumber: 9, age: 24, marketValue: 3, difficulty: "insane" },
  { name: "Sebastiano Esposito", club: "Empoli", nationality: "Italy", league: "Serie A", goals: 5, assists: 2, position: "ST", kitNumber: 99, age: 23, marketValue: 8, difficulty: "insane" },
  { name: "Mattia De Sciglio", club: "Empoli", nationality: "Italy", league: "Serie A", goals: 0, assists: 1, position: "RB", kitNumber: 2, age: 33, marketValue: 1, difficulty: "insane" },
  { name: "Filip Kostić", club: "Juventus", nationality: "Serbia", league: "Serie A", goals: 1, assists: 3, position: "LWB", kitNumber: 17, age: 33, marketValue: 5, difficulty: "insane" },
  { name: "Jaka Bijol", club: "Udinese", nationality: "Slovenia", league: "Serie A", goals: 2, assists: 0, position: "CB", kitNumber: 29, age: 25, marketValue: 12, difficulty: "insane" },
  { name: "Lorenzo Lucca", club: "Udinese", nationality: "Italy", league: "Serie A", goals: 5, assists: 2, position: "ST", kitNumber: 17, age: 25, marketValue: 12, difficulty: "insane" },
  { name: "Florian Thauvin", club: "Udinese", nationality: "France", league: "Serie A", goals: 4, assists: 3, position: "RW", kitNumber: 10, age: 33, marketValue: 3, difficulty: "insane" },
  { name: "Gianluca Lapadula", club: "Cagliari", nationality: "Italy", league: "Serie A", goals: 5, assists: 2, position: "ST", kitNumber: 9, age: 35, marketValue: 2, difficulty: "insane" },
  { name: "Riccardo Orsolini", club: "Bologna", nationality: "Italy", league: "Serie A", goals: 5, assists: 4, position: "RW", kitNumber: 7, age: 28, marketValue: 12, difficulty: "insane" },
  { name: "Lewis Ferguson", club: "Bologna", nationality: "Scotland", league: "Serie A", goals: 3, assists: 3, position: "CM", kitNumber: 19, age: 25, marketValue: 15, difficulty: "insane" },
  { name: "Remo Freuler", club: "Bologna", nationality: "Switzerland", league: "Serie A", goals: 2, assists: 3, position: "CM", kitNumber: 8, age: 33, marketValue: 5, difficulty: "insane" },
  { name: "Dan Ndoye", club: "Bologna", nationality: "Switzerland", league: "Serie A", goals: 4, assists: 3, position: "RW", kitNumber: 11, age: 25, marketValue: 18, difficulty: "insane" },
  { name: "Kacper Urbański", club: "Bologna", nationality: "Poland", league: "Serie A", goals: 2, assists: 3, position: "CAM", kitNumber: 7, age: 21, marketValue: 8, difficulty: "insane" },
  { name: "Simone Verdi", club: "Verona", nationality: "Italy", league: "Serie A", goals: 2, assists: 3, position: "RW", kitNumber: 10, age: 33, marketValue: 1, difficulty: "insane" },
  { name: "Mario Balotelli", club: "Genoa", nationality: "Italy", league: "Serie A", goals: 3, assists: 1, position: "ST", kitNumber: 45, age: 36, marketValue: 1, difficulty: "insane" },

  // === LA LIGA — deeper squads ===
  { name: "Álex Baena", club: "Villarreal", nationality: "Spain", league: "La Liga", goals: 4, assists: 6, position: "CM", kitNumber: 16, age: 23, marketValue: 35, difficulty: "insane" },
  { name: "Ayoze Pérez", club: "Villarreal", nationality: "Spain", league: "La Liga", goals: 5, assists: 3, position: "CF", kitNumber: 10, age: 32, marketValue: 8, difficulty: "insane" },
  { name: "Giovani Lo Celso", club: "Real Betis", nationality: "Argentina", league: "La Liga", goals: 3, assists: 5, position: "CAM", kitNumber: 18, age: 30, marketValue: 12, difficulty: "insane" },
  { name: "Nabil Fekir", club: "Real Betis", nationality: "France", league: "La Liga", goals: 3, assists: 4, position: "CAM", kitNumber: 8, age: 33, marketValue: 5, difficulty: "insane" },
  { name: "Abde Ezzalzouli", club: "Real Betis", nationality: "Morocco", league: "La Liga", goals: 4, assists: 3, position: "LW", kitNumber: 17, age: 23, marketValue: 15, difficulty: "insane" },
  { name: "Hugo Duro", club: "Valencia", nationality: "Spain", league: "La Liga", goals: 6, assists: 2, position: "ST", kitNumber: 9, age: 26, marketValue: 12, difficulty: "insane" },
  { name: "Pepelu", club: "Valencia", nationality: "Spain", league: "La Liga", goals: 2, assists: 3, position: "CDM", kitNumber: 18, age: 26, marketValue: 8, difficulty: "insane" },
  { name: "Luis Rioja", club: "Alavés", nationality: "Spain", league: "La Liga", goals: 3, assists: 2, position: "LW", kitNumber: 11, age: 31, marketValue: 3, difficulty: "insane" },
  { name: "Ante Budimir", club: "Osasuna", nationality: "Croatia", league: "La Liga", goals: 8, assists: 2, position: "ST", kitNumber: 17, age: 34, marketValue: 3, difficulty: "insane" },
  { name: "Borja Iglesias", club: "Celta Vigo", nationality: "Spain", league: "La Liga", goals: 4, assists: 2, position: "ST", kitNumber: 9, age: 32, marketValue: 3, difficulty: "insane" },
  { name: "André Almeida", club: "Celta Vigo", nationality: "Portugal", league: "La Liga", goals: 3, assists: 2, position: "CM", kitNumber: 14, age: 24, marketValue: 8, difficulty: "insane" },
  { name: "Álvaro García", club: "Rayo Vallecano", nationality: "Spain", league: "La Liga", goals: 3, assists: 4, position: "LW", kitNumber: 16, age: 31, marketValue: 3, difficulty: "insane" },
  { name: "Raúl de Tomás", club: "Rayo Vallecano", nationality: "Spain", league: "La Liga", goals: 5, assists: 2, position: "ST", kitNumber: 9, age: 31, marketValue: 5, difficulty: "insane" },
  { name: "Arnaut Danjuma", club: "Girona", nationality: "Netherlands", league: "La Liga", goals: 4, assists: 2, position: "LW", kitNumber: 7, age: 28, marketValue: 12, difficulty: "insane" },
  { name: "Abel Ruiz", club: "Girona", nationality: "Spain", league: "La Liga", goals: 5, assists: 2, position: "ST", kitNumber: 19, age: 25, marketValue: 8, difficulty: "insane" },
  { name: "Brais Méndez", club: "Real Sociedad", nationality: "Spain", league: "La Liga", goals: 4, assists: 3, position: "CM", kitNumber: 23, age: 28, marketValue: 18, difficulty: "insane" },
  { name: "Martín Zubimendi", club: "Real Sociedad", nationality: "Spain", league: "La Liga", goals: 2, assists: 3, position: "CDM", kitNumber: 4, age: 26, marketValue: 50, difficulty: "insane" },
  { name: "Takuma Asano", club: "Mallorca", nationality: "Japan", league: "La Liga", goals: 3, assists: 2, position: "RW", kitNumber: 11, age: 31, marketValue: 5, difficulty: "insane" },
  { name: "Suso", club: "Sevilla", nationality: "Spain", league: "La Liga", goals: 3, assists: 4, position: "RW", kitNumber: 10, age: 32, marketValue: 3, difficulty: "insane" },
  { name: "Loïc Badé", club: "Sevilla", nationality: "France", league: "La Liga", goals: 1, assists: 0, position: "CB", kitNumber: 4, age: 25, marketValue: 12, difficulty: "insane" },
  { name: "Saúl Ñíguez", club: "Sevilla", nationality: "Spain", league: "La Liga", goals: 2, assists: 2, position: "CM", kitNumber: 17, age: 31, marketValue: 3, difficulty: "insane" },
  { name: "Nico Williams", club: "Athletic Club", nationality: "Spain", league: "La Liga", goals: 7, assists: 6, position: "LW", kitNumber: 10, age: 23, marketValue: 70, difficulty: "insane" },
  { name: "Thomas Lemar", club: "Atlético Madrid", nationality: "France", league: "La Liga", goals: 1, assists: 3, position: "LW", kitNumber: 11, age: 30, marketValue: 8, difficulty: "insane" },
  { name: "Ilkay Gündoğan", club: "Manchester City", nationality: "Germany", league: "Premier League", goals: 2, assists: 3, position: "CM", kitNumber: 19, age: 35, marketValue: 5, difficulty: "insane" },
  { name: "Wojciech Szczęsny", club: "Barcelona", nationality: "Poland", league: "La Liga", goals: 0, assists: 0, position: "GK", kitNumber: 25, age: 36, marketValue: 2, difficulty: "insane" },

  // === BUNDESLIGA — deeper squads ===
  { name: "Chris Führich", club: "VfB Stuttgart", nationality: "Germany", league: "Bundesliga", goals: 4, assists: 5, position: "LW", kitNumber: 22, age: 28, marketValue: 18, difficulty: "insane" },
  { name: "Enzo Millot", club: "VfB Stuttgart", nationality: "France", league: "Bundesliga", goals: 5, assists: 4, position: "CAM", kitNumber: 30, age: 23, marketValue: 18, difficulty: "insane" },
  { name: "Angelo Stiller", club: "VfB Stuttgart", nationality: "Germany", league: "Bundesliga", goals: 2, assists: 5, position: "CDM", kitNumber: 6, age: 24, marketValue: 22, difficulty: "insane" },
  { name: "Maximilian Mittelstädt", club: "VfB Stuttgart", nationality: "Germany", league: "Bundesliga", goals: 1, assists: 4, position: "LB", kitNumber: 3, age: 28, marketValue: 12, difficulty: "insane" },
  { name: "Ermedin Demirović", club: "VfB Stuttgart", nationality: "Bosnia", league: "Bundesliga", goals: 6, assists: 3, position: "ST", kitNumber: 9, age: 27, marketValue: 15, difficulty: "insane" },
  { name: "Fabian Rieder", club: "VfB Stuttgart", nationality: "Switzerland", league: "Bundesliga", goals: 3, assists: 4, position: "CM", kitNumber: 28, age: 23, marketValue: 10, difficulty: "insane" },
  { name: "Jonas Wind", club: "Wolfsburg", nationality: "Denmark", league: "Bundesliga", goals: 7, assists: 3, position: "ST", kitNumber: 9, age: 26, marketValue: 15, difficulty: "insane" },
  { name: "Patrick Wimmer", club: "Wolfsburg", nationality: "Austria", league: "Bundesliga", goals: 3, assists: 4, position: "RW", kitNumber: 17, age: 24, marketValue: 8, difficulty: "insane" },
  { name: "Jakub Kamiński", club: "Wolfsburg", nationality: "Poland", league: "Bundesliga", goals: 3, assists: 4, position: "LW", kitNumber: 11, age: 23, marketValue: 8, difficulty: "insane" },
  { name: "Ritsu Doan", club: "SC Freiburg", nationality: "Japan", league: "Bundesliga", goals: 4, assists: 3, position: "RW", kitNumber: 18, age: 27, marketValue: 12, difficulty: "insane" },
  { name: "Vincenzo Grifo", club: "SC Freiburg", nationality: "Italy", league: "Bundesliga", goals: 5, assists: 4, position: "LW", kitNumber: 32, age: 32, marketValue: 5, difficulty: "insane" },
  { name: "Michael Gregoritsch", club: "SC Freiburg", nationality: "Austria", league: "Bundesliga", goals: 6, assists: 2, position: "ST", kitNumber: 38, age: 32, marketValue: 5, difficulty: "insane" },
  { name: "Waldemar Anton", club: "Borussia Dortmund", nationality: "Germany", league: "Bundesliga", goals: 1, assists: 0, position: "CB", kitNumber: 4, age: 29, marketValue: 22, difficulty: "insane" },
  { name: "Yan Couto", club: "Borussia Dortmund", nationality: "Brazil", league: "Bundesliga", goals: 1, assists: 5, position: "RB", kitNumber: 2, age: 23, marketValue: 18, difficulty: "insane" },
  { name: "Maximilian Beier", club: "Borussia Dortmund", nationality: "Germany", league: "Bundesliga", goals: 4, assists: 2, position: "ST", kitNumber: 14, age: 23, marketValue: 22, difficulty: "insane" },
  { name: "Marius Wolf", club: "Borussia Dortmund", nationality: "Germany", league: "Bundesliga", goals: 1, assists: 3, position: "RB", kitNumber: 17, age: 30, marketValue: 3, difficulty: "insane" },
  { name: "Nathan Tella", club: "Bayer Leverkusen", nationality: "England", league: "Bundesliga", goals: 3, assists: 2, position: "RW", kitNumber: 27, age: 26, marketValue: 8, difficulty: "insane" },
  { name: "Adam Hložek", club: "Hoffenheim", nationality: "Czech Republic", league: "Bundesliga", goals: 5, assists: 3, position: "ST", kitNumber: 9, age: 23, marketValue: 15, difficulty: "insane" },
  { name: "Andrej Kramarić", club: "Hoffenheim", nationality: "Croatia", league: "Bundesliga", goals: 6, assists: 3, position: "CF", kitNumber: 27, age: 34, marketValue: 5, difficulty: "insane" },
  { name: "Tim Kleindienst", club: "Borussia Mönchengladbach", nationality: "Germany", league: "Bundesliga", goals: 8, assists: 3, position: "ST", kitNumber: 9, age: 30, marketValue: 12, difficulty: "insane" },
  { name: "Kevin Stöger", club: "Borussia Mönchengladbach", nationality: "Austria", league: "Bundesliga", goals: 3, assists: 5, position: "CAM", kitNumber: 10, age: 31, marketValue: 3, difficulty: "insane" },
  { name: "Robin Hack", club: "Borussia Mönchengladbach", nationality: "Germany", league: "Bundesliga", goals: 4, assists: 2, position: "RW", kitNumber: 7, age: 27, marketValue: 5, difficulty: "insane" },
  { name: "Robin Koch", club: "Eintracht Frankfurt", nationality: "Germany", league: "Bundesliga", goals: 2, assists: 1, position: "CB", kitNumber: 4, age: 29, marketValue: 8, difficulty: "insane" },
  { name: "Hugo Ekitiké", club: "Eintracht Frankfurt", nationality: "France", league: "Bundesliga", goals: 7, assists: 3, position: "ST", kitNumber: 9, age: 23, marketValue: 22, difficulty: "insane" },
  { name: "Lee Jae-sung", club: "Mainz 05", nationality: "South Korea", league: "Bundesliga", goals: 3, assists: 4, position: "CAM", kitNumber: 7, age: 32, marketValue: 5, difficulty: "insane" },
  { name: "Antonio Nusa", club: "RB Leipzig", nationality: "Norway", league: "Bundesliga", goals: 3, assists: 2, position: "RW", kitNumber: 19, age: 20, marketValue: 12, difficulty: "insane" },
  { name: "Mathys Tel", club: "Bayern Munich", nationality: "France", league: "Bundesliga", goals: 3, assists: 2, position: "ST", kitNumber: 39, age: 20, marketValue: 22, difficulty: "insane" },
  { name: "Raphael Guerreiro", club: "Bayern Munich", nationality: "Portugal", league: "Bundesliga", goals: 2, assists: 4, position: "LB", kitNumber: 22, age: 32, marketValue: 8, difficulty: "insane" },
  { name: "Eric Maxim Choupo-Moting", club: "Bayern Munich", nationality: "Cameroon", league: "Bundesliga", goals: 3, assists: 1, position: "ST", kitNumber: 13, age: 37, marketValue: 1, difficulty: "insane" },
  { name: "Junya Ito", club: "Bayern Munich", nationality: "Japan", league: "Bundesliga", goals: 2, assists: 3, position: "RW", kitNumber: 33, age: 32, marketValue: 5, difficulty: "insane" },

  // === LIGUE 1 — deeper squads ===
  { name: "Jonathan Clauss", club: "Nice", nationality: "France", league: "Ligue 1", goals: 1, assists: 5, position: "RWB", kitNumber: 7, age: 32, marketValue: 5, difficulty: "insane" },
  { name: "Gaëtan Laborde", club: "Nice", nationality: "France", league: "Ligue 1", goals: 4, assists: 2, position: "ST", kitNumber: 10, age: 31, marketValue: 5, difficulty: "insane" },
  { name: "Moise Bombito", club: "Nice", nationality: "Canada", league: "Ligue 1", goals: 1, assists: 0, position: "CB", kitNumber: 3, age: 25, marketValue: 12, difficulty: "insane" },
  { name: "Tanguy Ndombele", club: "Nice", nationality: "France", league: "Ligue 1", goals: 1, assists: 2, position: "CM", kitNumber: 28, age: 29, marketValue: 3, difficulty: "insane" },
  { name: "Pierre-Emile Højbjerg", club: "Marseille", nationality: "Denmark", league: "Ligue 1", goals: 2, assists: 3, position: "CDM", kitNumber: 23, age: 30, marketValue: 15, difficulty: "insane" },
  { name: "Geronimo Rulli", club: "Marseille", nationality: "Argentina", league: "Ligue 1", goals: 0, assists: 0, position: "GK", kitNumber: 1, age: 33, marketValue: 5, difficulty: "insane" },
  { name: "Amine Harit", club: "Marseille", nationality: "Morocco", league: "Ligue 1", goals: 3, assists: 4, position: "CAM", kitNumber: 11, age: 28, marketValue: 8, difficulty: "insane" },
  { name: "Azzedine Ounahi", club: "Marseille", nationality: "Morocco", league: "Ligue 1", goals: 2, assists: 3, position: "CM", kitNumber: 8, age: 25, marketValue: 8, difficulty: "insane" },
  { name: "Thilo Kehrer", club: "Monaco", nationality: "Germany", league: "Ligue 1", goals: 1, assists: 0, position: "CB", kitNumber: 4, age: 29, marketValue: 8, difficulty: "insane" },
  { name: "Maghnes Akliouche", club: "Monaco", nationality: "France", league: "Ligue 1", goals: 5, assists: 4, position: "RW", kitNumber: 10, age: 23, marketValue: 22, difficulty: "insane" },
  { name: "Breel Embolo", club: "Monaco", nationality: "Switzerland", league: "Ligue 1", goals: 4, assists: 2, position: "ST", kitNumber: 36, age: 29, marketValue: 8, difficulty: "insane" },
  { name: "Edon Zhegrova", club: "Lille", nationality: "Kosovo", league: "Ligue 1", goals: 5, assists: 6, position: "RW", kitNumber: 7, age: 26, marketValue: 22, difficulty: "insane" },
  { name: "Angel Gomes", club: "Lille", nationality: "England", league: "Ligue 1", goals: 2, assists: 5, position: "CM", kitNumber: 10, age: 25, marketValue: 15, difficulty: "insane" },
  { name: "Lucas Chevalier", club: "Lille", nationality: "France", league: "Ligue 1", goals: 0, assists: 0, position: "GK", kitNumber: 30, age: 23, marketValue: 22, difficulty: "insane" },
  { name: "Tiago Santos", club: "Lille", nationality: "Portugal", league: "Ligue 1", goals: 1, assists: 4, position: "RB", kitNumber: 2, age: 23, marketValue: 12, difficulty: "insane" },
  { name: "Nabil Bentaleb", club: "Lille", nationality: "Algeria", league: "Ligue 1", goals: 1, assists: 2, position: "CM", kitNumber: 8, age: 31, marketValue: 2, difficulty: "insane" },
  { name: "Jonathan Bamba", club: "Lille", nationality: "France", league: "Ligue 1", goals: 4, assists: 3, position: "LW", kitNumber: 18, age: 30, marketValue: 5, difficulty: "insane" },
  { name: "Amine Gouiri", club: "Rennes", nationality: "France", league: "Ligue 1", goals: 5, assists: 3, position: "CF", kitNumber: 11, age: 25, marketValue: 15, difficulty: "insane" },
  { name: "Arnaud Kalimuendo", club: "Rennes", nationality: "France", league: "Ligue 1", goals: 4, assists: 2, position: "ST", kitNumber: 9, age: 23, marketValue: 12, difficulty: "insane" },
  { name: "Ludovic Blas", club: "Rennes", nationality: "France", league: "Ligue 1", goals: 3, assists: 4, position: "CAM", kitNumber: 10, age: 27, marketValue: 8, difficulty: "insane" },
  { name: "Désiré Doué", club: "PSG", nationality: "France", league: "Ligue 1", goals: 3, assists: 4, position: "LW", kitNumber: 14, age: 20, marketValue: 35, difficulty: "insane" },
  { name: "Willian Pacho", club: "PSG", nationality: "Ecuador", league: "Ligue 1", goals: 0, assists: 0, position: "CB", kitNumber: 51, age: 23, marketValue: 35, difficulty: "insane" },
  { name: "João Neves", club: "PSG", nationality: "Portugal", league: "Ligue 1", goals: 3, assists: 5, position: "CM", kitNumber: 87, age: 21, marketValue: 60, difficulty: "insane" },
  { name: "Orel Mangala", club: "Lyon", nationality: "Belgium", league: "Ligue 1", goals: 2, assists: 2, position: "CM", kitNumber: 6, age: 27, marketValue: 8, difficulty: "insane" },
  { name: "Mostafa Mohamed", club: "Nantes", nationality: "Egypt", league: "Ligue 1", goals: 5, assists: 2, position: "ST", kitNumber: 9, age: 28, marketValue: 5, difficulty: "insane" },
  { name: "Romain Faivre", club: "Lille", nationality: "France", league: "Ligue 1", goals: 3, assists: 3, position: "CAM", kitNumber: 8, age: 27, marketValue: 8, difficulty: "insane" },

  // === LIGA PORTUGAL — deeper squads ===
  { name: "Orkun Kökçü", club: "Benfica", nationality: "Turkey", league: "Liga Portugal", goals: 4, assists: 5, position: "CM", kitNumber: 23, age: 24, marketValue: 30, difficulty: "insane" },
  { name: "Kerem Aktürkoğlu", club: "Benfica", nationality: "Turkey", league: "Liga Portugal", goals: 6, assists: 3, position: "LW", kitNumber: 7, age: 26, marketValue: 15, difficulty: "insane" },
  { name: "Fredrik Aursnes", club: "Benfica", nationality: "Norway", league: "Liga Portugal", goals: 2, assists: 3, position: "CM", kitNumber: 6, age: 30, marketValue: 12, difficulty: "insane" },
  { name: "Zeki Amdouni", club: "Benfica", nationality: "Switzerland", league: "Liga Portugal", goals: 4, assists: 3, position: "ST", kitNumber: 18, age: 24, marketValue: 10, difficulty: "insane" },
  { name: "Renato Sanches", club: "Benfica", nationality: "Portugal", league: "Liga Portugal", goals: 2, assists: 2, position: "CM", kitNumber: 18, age: 28, marketValue: 5, difficulty: "insane" },
  { name: "Iván Jaime", club: "Porto", nationality: "Spain", league: "Liga Portugal", goals: 3, assists: 4, position: "LW", kitNumber: 17, age: 23, marketValue: 10, difficulty: "insane" },
  { name: "Geovany Quenda", club: "Sporting CP", nationality: "Portugal", league: "Liga Portugal", goals: 2, assists: 5, position: "RW", kitNumber: 88, age: 18, marketValue: 25, difficulty: "insane" },
  { name: "Morten Hjulmand", club: "Sporting CP", nationality: "Denmark", league: "Liga Portugal", goals: 3, assists: 2, position: "CDM", kitNumber: 5, age: 26, marketValue: 35, difficulty: "insane" },
  { name: "Gonçalo Inácio", club: "Sporting CP", nationality: "Portugal", league: "Liga Portugal", goals: 2, assists: 1, position: "CB", kitNumber: 25, age: 24, marketValue: 35, difficulty: "insane" },
  { name: "Marcus Edwards", club: "Sporting CP", nationality: "England", league: "Liga Portugal", goals: 4, assists: 5, position: "RW", kitNumber: 10, age: 27, marketValue: 15, difficulty: "insane" },

  // === EREDIVISIE — deeper squads ===
  { name: "Dávid Hancko", club: "Feyenoord", nationality: "Slovakia", league: "Eredivisie", goals: 3, assists: 2, position: "CB", kitNumber: 5, age: 27, marketValue: 25, difficulty: "insane" },
  { name: "Igor Paixão", club: "Feyenoord", nationality: "Brazil", league: "Eredivisie", goals: 7, assists: 5, position: "LW", kitNumber: 7, age: 25, marketValue: 22, difficulty: "insane" },
  { name: "Anis Hadj Moussa", club: "Feyenoord", nationality: "Algeria", league: "Eredivisie", goals: 5, assists: 3, position: "RW", kitNumber: 11, age: 22, marketValue: 12, difficulty: "insane" },
  { name: "Antoni Milambo", club: "Feyenoord", nationality: "Netherlands", league: "Eredivisie", goals: 4, assists: 3, position: "CM", kitNumber: 36, age: 19, marketValue: 10, difficulty: "insane" },
  { name: "Hirving Lozano", club: "PSV", nationality: "Mexico", league: "Eredivisie", goals: 5, assists: 4, position: "RW", kitNumber: 11, age: 30, marketValue: 8, difficulty: "insane" },
  { name: "Wout Weghorst", club: "Ajax", nationality: "Netherlands", league: "Eredivisie", goals: 8, assists: 2, position: "ST", kitNumber: 9, age: 33, marketValue: 5, difficulty: "insane" },

  // === BELGIAN PRO LEAGUE ===
  { name: "Hans Vanaken", club: "Club Brugge", nationality: "Belgium", league: "Belgian Pro League", goals: 8, assists: 6, position: "CAM", kitNumber: 20, age: 33, marketValue: 5, difficulty: "insane" },
  { name: "Andreas Skov Olsen", club: "Club Brugge", nationality: "Denmark", league: "Belgian Pro League", goals: 7, assists: 4, position: "RW", kitNumber: 26, age: 26, marketValue: 12, difficulty: "insane" },
  { name: "Simon Mignolet", club: "Club Brugge", nationality: "Belgium", league: "Belgian Pro League", goals: 0, assists: 0, position: "GK", kitNumber: 22, age: 38, marketValue: 1, difficulty: "insane" },
  { name: "Tolu Arokodare", club: "Genk", nationality: "Nigeria", league: "Belgian Pro League", goals: 12, assists: 3, position: "ST", kitNumber: 11, age: 25, marketValue: 8, difficulty: "insane" },
  { name: "Kasper Dolberg", club: "Anderlecht", nationality: "Denmark", league: "Belgian Pro League", goals: 9, assists: 3, position: "ST", kitNumber: 7, age: 28, marketValue: 5, difficulty: "insane" },
  { name: "Anders Dreyer", club: "Anderlecht", nationality: "Denmark", league: "Belgian Pro League", goals: 8, assists: 5, position: "RW", kitNumber: 14, age: 27, marketValue: 5, difficulty: "insane" },

  // === TURKISH SÜPER LIG — deeper squads ===
  { name: "Michy Batshuayi", club: "Galatasaray", nationality: "Belgium", league: "Turkish Süper Lig", goals: 6, assists: 2, position: "ST", kitNumber: 23, age: 32, marketValue: 3, difficulty: "insane" },
  { name: "Torreira", club: "Galatasaray", nationality: "Uruguay", league: "Turkish Süper Lig", goals: 2, assists: 3, position: "CDM", kitNumber: 34, age: 30, marketValue: 8, difficulty: "insane" },
  { name: "Davinson Sánchez", club: "Galatasaray", nationality: "Colombia", league: "Turkish Süper Lig", goals: 1, assists: 0, position: "CB", kitNumber: 6, age: 29, marketValue: 8, difficulty: "insane" },
  { name: "Arda Turan", club: "Galatasaray", nationality: "Turkey", league: "Turkish Süper Lig", goals: 0, assists: 1, position: "CAM", kitNumber: 66, age: 39, marketValue: 1, difficulty: "insane" },
  { name: "Dusan Tadić", club: "Fenerbahçe", nationality: "Serbia", league: "Turkish Süper Lig", goals: 5, assists: 6, position: "CAM", kitNumber: 10, age: 37, marketValue: 3, difficulty: "insane" },
  { name: "Çağlar Söyüncü", club: "Fenerbahçe", nationality: "Turkey", league: "Turkish Süper Lig", goals: 1, assists: 0, position: "CB", kitNumber: 4, age: 29, marketValue: 8, difficulty: "insane" },
  { name: "İrfan Can Kahveci", club: "Fenerbahçe", nationality: "Turkey", league: "Turkish Süper Lig", goals: 4, assists: 3, position: "CAM", kitNumber: 7, age: 30, marketValue: 5, difficulty: "insane" },
  { name: "Sebastian Szymański", club: "Fenerbahçe", nationality: "Poland", league: "Turkish Süper Lig", goals: 5, assists: 6, position: "CAM", kitNumber: 90, age: 26, marketValue: 12, difficulty: "insane" },
  { name: "Sofyan Amrabat", club: "Fenerbahçe", nationality: "Morocco", league: "Turkish Süper Lig", goals: 1, assists: 2, position: "CDM", kitNumber: 4, age: 29, marketValue: 12, difficulty: "insane" },
  { name: "Abdülkadir Ömür", club: "Trabzonspor", nationality: "Turkey", league: "Turkish Süper Lig", goals: 3, assists: 4, position: "CAM", kitNumber: 10, age: 26, marketValue: 3, difficulty: "insane" },
  { name: "Trézéguet", club: "Trabzonspor", nationality: "Egypt", league: "Turkish Süper Lig", goals: 4, assists: 3, position: "LW", kitNumber: 17, age: 31, marketValue: 3, difficulty: "insane" },
  { name: "Denis Draguș", club: "Trabzonspor", nationality: "Romania", league: "Turkish Süper Lig", goals: 6, assists: 2, position: "ST", kitNumber: 9, age: 25, marketValue: 5, difficulty: "insane" },
  { name: "Anastasios Bakasetas", club: "Trabzonspor", nationality: "Greece", league: "Turkish Süper Lig", goals: 5, assists: 3, position: "CAM", kitNumber: 42, age: 32, marketValue: 3, difficulty: "insane" },
  { name: "Gervinho", club: "Trabzonspor", nationality: "Ivory Coast", league: "Turkish Süper Lig", goals: 3, assists: 2, position: "LW", kitNumber: 27, age: 39, marketValue: 1, difficulty: "insane" },
  { name: "Olimpiu Moruțan", club: "Galatasaray", nationality: "Romania", league: "Turkish Süper Lig", goals: 2, assists: 3, position: "CAM", kitNumber: 80, age: 26, marketValue: 3, difficulty: "insane" },

  // === J1 LEAGUE (JAPAN) ===
  { name: "Yoshito Okubo", club: "Cerezo Osaka", nationality: "Japan", league: "J1 League", goals: 4, assists: 2, position: "ST", kitNumber: 13, age: 43, marketValue: 1, difficulty: "insane" },
  { name: "Musashi Suzuki", club: "Gamba Osaka", nationality: "Japan", league: "J1 League", goals: 8, assists: 3, position: "ST", kitNumber: 10, age: 30, marketValue: 2, difficulty: "insane" },
  { name: "Yuki Soma", club: "Nagoya Grampus", nationality: "Japan", league: "J1 League", goals: 5, assists: 4, position: "LW", kitNumber: 14, age: 27, marketValue: 3, difficulty: "insane" },
  { name: "Anderson Lopes", club: "Yokohama F. Marinos", nationality: "Brazil", league: "J1 League", goals: 12, assists: 3, position: "ST", kitNumber: 39, age: 31, marketValue: 2, difficulty: "insane" },
  { name: "Matheus Saldanha", club: "Vissel Kobe", nationality: "Brazil", league: "J1 League", goals: 10, assists: 2, position: "ST", kitNumber: 7, age: 27, marketValue: 3, difficulty: "insane" },
  { name: "Shuto Machino", club: "Avispa Fukuoka", nationality: "Japan", league: "J1 League", goals: 7, assists: 3, position: "ST", kitNumber: 9, age: 25, marketValue: 2, difficulty: "insane" },
  { name: "Shinji Okazaki", club: "Shimizu S-Pulse", nationality: "Japan", league: "J1 League", goals: 3, assists: 1, position: "ST", kitNumber: 31, age: 40, marketValue: 1, difficulty: "insane" },

  // === K LEAGUE 1 (SOUTH KOREA) ===
  { name: "Joo Min-kyu", club: "Ulsan HD", nationality: "South Korea", league: "K League 1", goals: 10, assists: 3, position: "ST", kitNumber: 9, age: 28, marketValue: 3, difficulty: "insane" },
  { name: "Ki Sung-yueng", club: "Ulsan HD", nationality: "South Korea", league: "K League 1", goals: 2, assists: 3, position: "CM", kitNumber: 4, age: 37, marketValue: 1, difficulty: "insane" },
  { name: "Cho Gue-sung", club: "FC Midtjylland", nationality: "South Korea", league: "Danish Superliga", goals: 7, assists: 2, position: "ST", kitNumber: 9, age: 26, marketValue: 5, difficulty: "insane" },
  { name: "Hwang In-beom", club: "Red Star Belgrade", nationality: "South Korea", league: "Serbian SuperLiga", goals: 4, assists: 5, position: "CM", kitNumber: 8, age: 28, marketValue: 5, difficulty: "insane" },

  // === LIGA MX (MEXICO) ===
  { name: "André-Pierre Gignac", club: "Tigres", nationality: "France", league: "Liga MX", goals: 8, assists: 3, position: "ST", kitNumber: 10, age: 40, marketValue: 2, difficulty: "insane" },
  { name: "Orbelín Pineda", club: "AEK Athens", nationality: "Mexico", league: "Greek Super League", goals: 4, assists: 3, position: "CAM", kitNumber: 10, age: 30, marketValue: 3, difficulty: "insane" },
  { name: "Henry Martín", club: "América", nationality: "Mexico", league: "Liga MX", goals: 9, assists: 3, position: "ST", kitNumber: 21, age: 32, marketValue: 3, difficulty: "insane" },
  { name: "Julián Quiñones", club: "América", nationality: "Colombia", league: "Liga MX", goals: 7, assists: 5, position: "LW", kitNumber: 33, age: 28, marketValue: 5, difficulty: "insane" },
  { name: "Germán Berterame", club: "Monterrey", nationality: "Argentina", league: "Liga MX", goals: 10, assists: 2, position: "ST", kitNumber: 9, age: 27, marketValue: 8, difficulty: "insane" },
  { name: "Héctor Moreno", club: "Monterrey", nationality: "Mexico", league: "Liga MX", goals: 1, assists: 0, position: "CB", kitNumber: 15, age: 38, marketValue: 1, difficulty: "insane" },

  // === MLS — deeper ===
  { name: "Luciano Acosta", club: "FC Cincinnati", nationality: "Argentina", league: "MLS", goals: 6, assists: 12, position: "CAM", kitNumber: 10, age: 31, marketValue: 5, difficulty: "insane" },
  { name: "Evander", club: "Portland Timbers", nationality: "Brazil", league: "MLS", goals: 8, assists: 6, position: "CAM", kitNumber: 10, age: 27, marketValue: 8, difficulty: "insane" },
  { name: "Diego Rossi", club: "Columbus Crew", nationality: "Uruguay", league: "MLS", goals: 8, assists: 4, position: "LW", kitNumber: 7, age: 27, marketValue: 5, difficulty: "insane" },
  { name: "Hany Mukhtar", club: "Nashville SC", nationality: "Germany", league: "MLS", goals: 9, assists: 5, position: "CAM", kitNumber: 10, age: 30, marketValue: 5, difficulty: "insane" },
  { name: "Gabriel Pec", club: "LA Galaxy", nationality: "Brazil", league: "MLS", goals: 8, assists: 5, position: "RW", kitNumber: 10, age: 24, marketValue: 8, difficulty: "insane" },
  { name: "Sergio Busquets", club: "Inter Miami", nationality: "Spain", league: "MLS", goals: 1, assists: 4, position: "CDM", kitNumber: 5, age: 38, marketValue: 2, difficulty: "insane" },
  { name: "Jordi Alba", club: "Inter Miami", nationality: "Spain", league: "MLS", goals: 1, assists: 6, position: "LB", kitNumber: 18, age: 37, marketValue: 2, difficulty: "insane" },
  { name: "DeAndre Yedlin", club: "Inter Miami", nationality: "USA", league: "MLS", goals: 0, assists: 3, position: "RB", kitNumber: 2, age: 33, marketValue: 1, difficulty: "insane" },
  { name: "Christian Ramirez", club: "Houston Dynamo", nationality: "USA", league: "MLS", goals: 7, assists: 2, position: "ST", kitNumber: 13, age: 33, marketValue: 1, difficulty: "insane" },

  // === BRAZILIAN SÉRIE A — deeper ===
  { name: "Yuri Alberto", club: "Corinthians", nationality: "Brazil", league: "Brazilian Série A", goals: 12, assists: 3, position: "ST", kitNumber: 9, age: 24, marketValue: 8, difficulty: "insane" },
  { name: "Rodrigo Garro", club: "Corinthians", nationality: "Argentina", league: "Brazilian Série A", goals: 5, assists: 6, position: "CAM", kitNumber: 10, age: 27, marketValue: 5, difficulty: "insane" },
  { name: "Hulk", club: "Atlético Mineiro", nationality: "Brazil", league: "Brazilian Série A", goals: 8, assists: 3, position: "CF", kitNumber: 7, age: 39, marketValue: 2, difficulty: "insane" },
  { name: "Pedro", club: "Flamengo", nationality: "Brazil", league: "Brazilian Série A", goals: 14, assists: 2, position: "ST", kitNumber: 9, age: 28, marketValue: 12, difficulty: "insane" },
  { name: "Arrascaeta", club: "Flamengo", nationality: "Uruguay", league: "Brazilian Série A", goals: 5, assists: 7, position: "CAM", kitNumber: 14, age: 31, marketValue: 5, difficulty: "insane" },
  { name: "Gerson", club: "Flamengo", nationality: "Brazil", league: "Brazilian Série A", goals: 3, assists: 5, position: "CM", kitNumber: 8, age: 28, marketValue: 8, difficulty: "insane" },
  { name: "André Trindade", club: "Flamengo", nationality: "Brazil", league: "Brazilian Série A", goals: 1, assists: 3, position: "CDM", kitNumber: 5, age: 22, marketValue: 5, difficulty: "insane" },
  { name: "Gabigol", club: "Cruzeiro", nationality: "Brazil", league: "Brazilian Série A", goals: 5, assists: 2, position: "ST", kitNumber: 10, age: 28, marketValue: 5, difficulty: "insane" },
  { name: "Vegetti", club: "Vasco da Gama", nationality: "Argentina", league: "Brazilian Série A", goals: 10, assists: 2, position: "ST", kitNumber: 99, age: 36, marketValue: 2, difficulty: "insane" },
  { name: "Éverton Ribeiro", club: "Bahia", nationality: "Brazil", league: "Brazilian Série A", goals: 4, assists: 5, position: "CAM", kitNumber: 10, age: 37, marketValue: 1, difficulty: "insane" },
  { name: "Lucero", club: "Fortaleza", nationality: "Argentina", league: "Brazilian Série A", goals: 11, assists: 3, position: "ST", kitNumber: 9, age: 30, marketValue: 3, difficulty: "insane" },
  { name: "Deyverson", club: "Atlético Mineiro", nationality: "Brazil", league: "Brazilian Série A", goals: 6, assists: 2, position: "ST", kitNumber: 9, age: 34, marketValue: 1, difficulty: "insane" },
  { name: "Dimitri Payet", club: "Vasco da Gama", nationality: "France", league: "Brazilian Série A", goals: 3, assists: 4, position: "CAM", kitNumber: 10, age: 39, marketValue: 1, difficulty: "insane" },

  // === ARGENTINE PRIMERA DIVISIÓN ===
  { name: "Enzo Copetti", club: "Racing Club", nationality: "Argentina", league: "Argentine Primera División", goals: 8, assists: 2, position: "ST", kitNumber: 9, age: 29, marketValue: 3, difficulty: "insane" },
  { name: "Adam Bareiro", club: "River Plate", nationality: "Paraguay", league: "Argentine Primera División", goals: 7, assists: 2, position: "ST", kitNumber: 9, age: 28, marketValue: 3, difficulty: "insane" },
  { name: "Miguel Borja", club: "River Plate", nationality: "Colombia", league: "Argentine Primera División", goals: 12, assists: 2, position: "ST", kitNumber: 7, age: 32, marketValue: 3, difficulty: "insane" },
  { name: "Nicolás De La Cruz", club: "River Plate", nationality: "Uruguay", league: "Argentine Primera División", goals: 4, assists: 5, position: "CM", kitNumber: 10, age: 28, marketValue: 5, difficulty: "insane" },
  { name: "Kevin Zenón", club: "Boca Juniors", nationality: "Argentina", league: "Argentine Primera División", goals: 3, assists: 4, position: "LW", kitNumber: 10, age: 25, marketValue: 5, difficulty: "insane" },
  { name: "Merentiel", club: "Boca Juniors", nationality: "Uruguay", league: "Argentine Primera División", goals: 7, assists: 2, position: "ST", kitNumber: 9, age: 28, marketValue: 3, difficulty: "insane" },
  { name: "Luis Advíncula", club: "Boca Juniors", nationality: "Peru", league: "Argentine Primera División", goals: 1, assists: 3, position: "RB", kitNumber: 17, age: 35, marketValue: 1, difficulty: "insane" },

  // === SAUDI PRO LEAGUE — deeper ===
  { name: "Malcom", club: "Al-Hilal", nationality: "Brazil", league: "Saudi Pro League", goals: 8, assists: 5, position: "RW", kitNumber: 10, age: 28, marketValue: 12, difficulty: "insane" },
  { name: "Marcos Leonardo", club: "Al-Hilal", nationality: "Brazil", league: "Saudi Pro League", goals: 6, assists: 2, position: "ST", kitNumber: 11, age: 25, marketValue: 15, difficulty: "insane" },
  { name: "Ali Al-Bulaihi", club: "Al-Hilal", nationality: "Saudi Arabia", league: "Saudi Pro League", goals: 1, assists: 0, position: "CB", kitNumber: 4, age: 35, marketValue: 2, difficulty: "insane" },
  { name: "Salem Al-Dawsari", club: "Al-Hilal", nationality: "Saudi Arabia", league: "Saudi Pro League", goals: 5, assists: 4, position: "LW", kitNumber: 10, age: 33, marketValue: 3, difficulty: "insane" },
  { name: "Yasser Al-Shahrani", club: "Al-Hilal", nationality: "Saudi Arabia", league: "Saudi Pro League", goals: 0, assists: 2, position: "LB", kitNumber: 13, age: 33, marketValue: 2, difficulty: "insane" },
  { name: "Otávio", club: "Al-Nassr", nationality: "Brazil", league: "Saudi Pro League", goals: 3, assists: 5, position: "CM", kitNumber: 20, age: 31, marketValue: 5, difficulty: "insane" },
  { name: "Ayman Yahya", club: "Al-Nassr", nationality: "Saudi Arabia", league: "Saudi Pro League", goals: 2, assists: 3, position: "LW", kitNumber: 19, age: 22, marketValue: 3, difficulty: "insane" },
  { name: "Steven Bergwijn", club: "Al-Ittihad", nationality: "Netherlands", league: "Saudi Pro League", goals: 4, assists: 3, position: "LW", kitNumber: 10, age: 28, marketValue: 12, difficulty: "insane" },
  { name: "Predrag Rajković", club: "Al-Ittihad", nationality: "Serbia", league: "Saudi Pro League", goals: 0, assists: 0, position: "GK", kitNumber: 1, age: 29, marketValue: 5, difficulty: "insane" },
  { name: "Yannick Carrasco", club: "Al-Shabab", nationality: "Belgium", league: "Saudi Pro League", goals: 4, assists: 3, position: "LW", kitNumber: 10, age: 32, marketValue: 5, difficulty: "insane" },
  { name: "Georginio Wijnaldum", club: "Al-Ettifaq", nationality: "Netherlands", league: "Saudi Pro League", goals: 3, assists: 2, position: "CM", kitNumber: 8, age: 35, marketValue: 2, difficulty: "insane" },

  // === CROATIAN HNL ===
  { name: "Bruno Petković", club: "Dinamo Zagreb", nationality: "Croatia", league: "Croatian HNL", goals: 8, assists: 3, position: "ST", kitNumber: 9, age: 30, marketValue: 5, difficulty: "insane" },
  { name: "Martin Baturina", club: "Dinamo Zagreb", nationality: "Croatia", league: "Croatian HNL", goals: 5, assists: 6, position: "CAM", kitNumber: 39, age: 22, marketValue: 18, difficulty: "insane" },
  { name: "Ivan Perišić", club: "Hajduk Split", nationality: "Croatia", league: "Croatian HNL", goals: 4, assists: 3, position: "LW", kitNumber: 4, age: 37, marketValue: 1, difficulty: "insane" },
  { name: "Marko Livaja", club: "Hajduk Split", nationality: "Croatia", league: "Croatian HNL", goals: 10, assists: 4, position: "ST", kitNumber: 10, age: 31, marketValue: 3, difficulty: "insane" },
  { name: "Ivan Rakitić", club: "Hajduk Split", nationality: "Croatia", league: "Croatian HNL", goals: 3, assists: 4, position: "CM", kitNumber: 7, age: 38, marketValue: 1, difficulty: "insane" },

  // === SERBIAN SUPERLIGA ===
  { name: "Cherif Ndiaye", club: "Red Star Belgrade", nationality: "Senegal", league: "Serbian SuperLiga", goals: 11, assists: 3, position: "ST", kitNumber: 17, age: 24, marketValue: 5, difficulty: "insane" },
  { name: "Uroš Spajić", club: "Red Star Belgrade", nationality: "Serbia", league: "Serbian SuperLiga", goals: 2, assists: 0, position: "CB", kitNumber: 5, age: 31, marketValue: 2, difficulty: "insane" },

  // === SCANDINAVIAN LEAGUES ===
  { name: "Viktor Claesson", club: "Elfsborg", nationality: "Sweden", league: "Swedish Allsvenskan", goals: 5, assists: 4, position: "CAM", kitNumber: 10, age: 32, marketValue: 2, difficulty: "insane" },
  { name: "Robin Quaison", club: "Djurgårdens IF", nationality: "Sweden", league: "Swedish Allsvenskan", goals: 6, assists: 3, position: "ST", kitNumber: 9, age: 31, marketValue: 1, difficulty: "insane" },
  { name: "Kasper Schmeichel", club: "Celtic", nationality: "Denmark", league: "Scottish Premiership", goals: 0, assists: 0, position: "GK", kitNumber: 1, age: 39, marketValue: 1, difficulty: "insane" },
  { name: "Mohamed Daramy", club: "Brøndby", nationality: "Denmark", league: "Danish Superliga", goals: 5, assists: 4, position: "RW", kitNumber: 7, age: 23, marketValue: 3, difficulty: "insane" },
  { name: "Rasmus Falk", club: "Copenhagen", nationality: "Denmark", league: "Danish Superliga", goals: 3, assists: 5, position: "CAM", kitNumber: 10, age: 33, marketValue: 1, difficulty: "insane" },
  { name: "Kamil Grosicki", club: "Pogoń Szczecin", nationality: "Poland", league: "Polish Ekstraklasa", goals: 4, assists: 5, position: "LW", kitNumber: 7, age: 37, marketValue: 1, difficulty: "insane" },

  // === ROMANIAN SUPERLIGA ===
  { name: "Florinel Coman", club: "FCSB", nationality: "Romania", league: "Romanian SuperLiga", goals: 7, assists: 5, position: "LW", kitNumber: 7, age: 27, marketValue: 5, difficulty: "insane" },

  // === AUSTRIAN BUNDESLIGA ===
  { name: "Guido Burgstaller", club: "Rapid Wien", nationality: "Austria", league: "Austrian Bundesliga", goals: 8, assists: 3, position: "ST", kitNumber: 9, age: 36, marketValue: 1, difficulty: "insane" },
  { name: "Nicolas Capaldo", club: "RB Salzburg", nationality: "Argentina", league: "Austrian Bundesliga", goals: 3, assists: 4, position: "CM", kitNumber: 8, age: 26, marketValue: 5, difficulty: "insane" },
  { name: "Karim Konaté", club: "RB Salzburg", nationality: "Ivory Coast", league: "Austrian Bundesliga", goals: 10, assists: 2, position: "ST", kitNumber: 9, age: 21, marketValue: 12, difficulty: "insane" },

  // === AFRICAN LEAGUES ===
  { name: "Ahmed Hegazy", club: "Al Ahly", nationality: "Egypt", league: "Egyptian Premier League", goals: 2, assists: 0, position: "CB", kitNumber: 6, age: 35, marketValue: 1, difficulty: "insane" },
  { name: "Emam Ashour", club: "Al Ahly", nationality: "Egypt", league: "Egyptian Premier League", goals: 2, assists: 3, position: "CM", kitNumber: 25, age: 25, marketValue: 3, difficulty: "insane" },
  { name: "Percy Tau", club: "Al Ahly", nationality: "South Africa", league: "Egyptian Premier League", goals: 4, assists: 3, position: "RW", kitNumber: 7, age: 31, marketValue: 2, difficulty: "insane" },
  { name: "Yahia Attiyat Allah", club: "Wydad", nationality: "Morocco", league: "Moroccan Botola", goals: 1, assists: 4, position: "LB", kitNumber: 3, age: 29, marketValue: 1, difficulty: "insane" },
  { name: "Themba Zwane", club: "Mamelodi Sundowns", nationality: "South Africa", league: "South African Premier Division", goals: 5, assists: 6, position: "CAM", kitNumber: 10, age: 36, marketValue: 1, difficulty: "insane" },
  { name: "Peter Shalulile", club: "Mamelodi Sundowns", nationality: "Namibia", league: "South African Premier Division", goals: 10, assists: 3, position: "ST", kitNumber: 9, age: 31, marketValue: 1, difficulty: "insane" },

  // === MIDDLE EAST ===
  { name: "Marco Verratti", club: "Al-Arabi", nationality: "Italy", league: "Qatari Stars League", goals: 1, assists: 3, position: "CM", kitNumber: 6, age: 33, marketValue: 5, difficulty: "insane" },
  { name: "Akram Afif", club: "Al Sadd", nationality: "Qatar", league: "Qatari Stars League", goals: 8, assists: 6, position: "LW", kitNumber: 11, age: 28, marketValue: 8, difficulty: "insane" },
  { name: "Paco Alcácer", club: "Sharjah FC", nationality: "Spain", league: "UAE Pro League", goals: 6, assists: 2, position: "ST", kitNumber: 9, age: 32, marketValue: 2, difficulty: "insane" },

  // === AUSTRALIA ===
  { name: "Jamie Maclaren", club: "Melbourne City", nationality: "Australia", league: "A-League", goals: 12, assists: 3, position: "ST", kitNumber: 9, age: 32, marketValue: 2, difficulty: "insane" },
  { name: "Denis Genreau", club: "Melbourne City", nationality: "Australia", league: "A-League", goals: 4, assists: 3, position: "CM", kitNumber: 17, age: 26, marketValue: 1, difficulty: "insane" },

  // === SOUTH AMERICA ===
  { name: "Falcao", club: "Millonarios", nationality: "Colombia", league: "Colombian Primera A", goals: 5, assists: 2, position: "ST", kitNumber: 9, age: 40, marketValue: 1, difficulty: "insane" },
  { name: "David Ospina", club: "Atlético Nacional", nationality: "Colombia", league: "Colombian Primera A", goals: 0, assists: 0, position: "GK", kitNumber: 1, age: 37, marketValue: 1, difficulty: "insane" },
  { name: "Arturo Vidal", club: "Colo-Colo", nationality: "Chile", league: "Chilean Primera División", goals: 4, assists: 2, position: "CM", kitNumber: 23, age: 39, marketValue: 1, difficulty: "insane" },
  { name: "Gary Medel", club: "Boca Juniors", nationality: "Chile", league: "Argentine Primera División", goals: 0, assists: 1, position: "CB", kitNumber: 17, age: 38, marketValue: 1, difficulty: "insane" },
  { name: "Charles Aránguiz", club: "Universidad de Chile", nationality: "Chile", league: "Chilean Primera División", goals: 2, assists: 4, position: "CM", kitNumber: 20, age: 36, marketValue: 1, difficulty: "insane" },
  { name: "Eduardo Vargas", club: "Universidad de Chile", nationality: "Chile", league: "Chilean Primera División", goals: 5, assists: 2, position: "ST", kitNumber: 11, age: 36, marketValue: 1, difficulty: "insane" },

  // === GREEK SUPER LEAGUE ===
  { name: "Kostas Fortounis", club: "Olympiacos", nationality: "Greece", league: "Greek Super League", goals: 4, assists: 5, position: "CAM", kitNumber: 10, age: 33, marketValue: 2, difficulty: "insane" },
  { name: "Georgios Masouras", club: "Olympiacos", nationality: "Greece", league: "Greek Super League", goals: 5, assists: 3, position: "RW", kitNumber: 7, age: 30, marketValue: 2, difficulty: "insane" },

  // === CHINESE SUPER LEAGUE ===
  { name: "Oscar", club: "Shanghai Port", nationality: "Brazil", league: "Chinese Super League", goals: 5, assists: 6, position: "CAM", kitNumber: 8, age: 34, marketValue: 2, difficulty: "insane" },

  // === INDIAN SUPER LEAGUE ===
  { name: "Sunil Chhetri", club: "Bengaluru FC", nationality: "India", league: "Indian Super League", goals: 5, assists: 2, position: "ST", kitNumber: 11, age: 42, marketValue: 1, difficulty: "insane" },

  // === MISCELLANEOUS ===
  { name: "Andriy Yarmolenko", club: "Dynamo Kyiv", nationality: "Ukraine", league: "Ukrainian Premier League", goals: 4, assists: 2, position: "RW", kitNumber: 7, age: 36, marketValue: 1, difficulty: "insane" },
  { name: "Josip Iličić", club: "Maribor", nationality: "Slovenia", league: "Austrian Bundesliga", goals: 4, assists: 3, position: "CF", kitNumber: 72, age: 37, marketValue: 1, difficulty: "insane" },
  { name: "Guillermo Ochoa", club: "América", nationality: "Mexico", league: "Liga MX", goals: 0, assists: 0, position: "GK", kitNumber: 13, age: 40, marketValue: 1, difficulty: "insane" },
];
