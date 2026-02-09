import { Player } from '@/types/game';

export const players: Player[] = [
  // =================== PREMIER LEAGUE ===================
  // Easy
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
  { name: "Alisson", club: "Liverpool", nationality: "Brazil", league: "Premier League", goals: 0, assists: 0, position: "GK", kitNumber: 1, age: 34, marketValue: 30, difficulty: "easy" },
  { name: "Rodri", club: "Manchester City", nationality: "Spain", league: "Premier League", goals: 1, assists: 2, position: "CDM", kitNumber: 16, age: 30, marketValue: 120, difficulty: "easy" },
  { name: "Ollie Watkins", club: "Aston Villa", nationality: "England", league: "Premier League", goals: 11, assists: 5, position: "ST", kitNumber: 11, age: 30, marketValue: 60, difficulty: "easy" },
  // Hard
  { name: "Moises Caicedo", club: "Chelsea", nationality: "Ecuador", league: "Premier League", goals: 3, assists: 2, position: "CDM", kitNumber: 25, age: 24, marketValue: 85, difficulty: "hard" },
  { name: "Pedro Neto", club: "Chelsea", nationality: "Portugal", league: "Premier League", goals: 6, assists: 5, position: "LW", kitNumber: 7, age: 26, marketValue: 55, difficulty: "hard" },
  { name: "Micky van de Ven", club: "Tottenham", nationality: "Netherlands", league: "Premier League", goals: 1, assists: 3, position: "CB", kitNumber: 37, age: 25, marketValue: 65, difficulty: "hard" },
  { name: "Sandro Tonali", club: "Newcastle", nationality: "Italy", league: "Premier League", goals: 3, assists: 4, position: "CM", kitNumber: 8, age: 26, marketValue: 55, difficulty: "hard" },
  { name: "Dominic Solanke", club: "Tottenham", nationality: "England", league: "Premier League", goals: 7, assists: 3, position: "ST", kitNumber: 19, age: 28, marketValue: 50, difficulty: "hard" },
  { name: "Leandro Trossard", club: "Arsenal", nationality: "Belgium", league: "Premier League", goals: 6, assists: 3, position: "LW", kitNumber: 19, age: 31, marketValue: 40, difficulty: "hard" },
  { name: "Mateo Kovačić", club: "Manchester City", nationality: "Croatia", league: "Premier League", goals: 2, assists: 3, position: "CM", kitNumber: 8, age: 32, marketValue: 25, difficulty: "hard" },
  { name: "Enzo Fernández", club: "Chelsea", nationality: "Argentina", league: "Premier League", goals: 4, assists: 5, position: "CM", kitNumber: 8, age: 25, marketValue: 75, difficulty: "hard" },
  { name: "Luis Díaz", club: "Liverpool", nationality: "Colombia", league: "Premier League", goals: 9, assists: 4, position: "LW", kitNumber: 7, age: 29, marketValue: 55, difficulty: "hard" },
  { name: "Cody Gakpo", club: "Liverpool", nationality: "Netherlands", league: "Premier League", goals: 12, assists: 4, position: "LW", kitNumber: 18, age: 26, marketValue: 60, difficulty: "hard" },
  { name: "Trent Alexander-Arnold", club: "Liverpool", nationality: "England", league: "Premier League", goals: 2, assists: 7, position: "RB", kitNumber: 66, age: 27, marketValue: 65, difficulty: "hard" },
  { name: "Anthony Gordon", club: "Newcastle", nationality: "England", league: "Premier League", goals: 8, assists: 5, position: "LW", kitNumber: 10, age: 25, marketValue: 60, difficulty: "hard" },
  { name: "Bruno Guimarães", club: "Newcastle", nationality: "Brazil", league: "Premier League", goals: 3, assists: 4, position: "CM", kitNumber: 39, age: 28, marketValue: 65, difficulty: "hard" },
  { name: "Morgan Gibbs-White", club: "Nottingham Forest", nationality: "England", league: "Premier League", goals: 5, assists: 6, position: "CAM", kitNumber: 10, age: 26, marketValue: 50, difficulty: "hard" },
  { name: "Chris Wood", club: "Nottingham Forest", nationality: "New Zealand", league: "Premier League", goals: 13, assists: 2, position: "ST", kitNumber: 11, age: 34, marketValue: 8, difficulty: "hard" },
  { name: "Lisandro Martínez", club: "Manchester United", nationality: "Argentina", league: "Premier League", goals: 1, assists: 1, position: "CB", kitNumber: 6, age: 28, marketValue: 50, difficulty: "hard" },
  { name: "Rasmus Højlund", club: "Manchester United", nationality: "Denmark", league: "Premier League", goals: 8, assists: 3, position: "ST", kitNumber: 11, age: 23, marketValue: 55, difficulty: "hard" },
  { name: "Viktor Gyökeres", club: "Arsenal", nationality: "Sweden", league: "Premier League", goals: 14, assists: 4, position: "ST", kitNumber: 9, age: 28, marketValue: 90, difficulty: "hard" },
  { name: "Estêvão", club: "Chelsea", nationality: "Brazil", league: "Premier League", goals: 6, assists: 7, position: "RW", kitNumber: 41, age: 19, marketValue: 60, difficulty: "hard" },
  { name: "Kevin De Bruyne", club: "Manchester City", nationality: "Belgium", league: "Premier League", goals: 3, assists: 6, position: "CAM", kitNumber: 17, age: 35, marketValue: 25, difficulty: "hard" },

  // =================== LA LIGA ===================
  // Easy
  { name: "Kylian Mbappé", club: "Real Madrid", nationality: "France", league: "La Liga", goals: 19, assists: 5, position: "ST", kitNumber: 9, age: 27, marketValue: 180, difficulty: "easy" },
  { name: "Vinícius Júnior", club: "Real Madrid", nationality: "Brazil", league: "La Liga", goals: 15, assists: 8, position: "LW", kitNumber: 7, age: 26, marketValue: 200, difficulty: "easy" },
  { name: "Jude Bellingham", club: "Real Madrid", nationality: "England", league: "La Liga", goals: 11, assists: 7, position: "CAM", kitNumber: 5, age: 22, marketValue: 180, difficulty: "easy" },
  { name: "Robert Lewandowski", club: "Barcelona", nationality: "Poland", league: "La Liga", goals: 15, assists: 4, position: "ST", kitNumber: 9, age: 38, marketValue: 10, difficulty: "easy" },
  { name: "Lamine Yamal", club: "Barcelona", nationality: "Spain", league: "La Liga", goals: 12, assists: 13, position: "RW", kitNumber: 19, age: 18, marketValue: 200, difficulty: "easy" },
  { name: "Pedri", club: "Barcelona", nationality: "Spain", league: "La Liga", goals: 5, assists: 8, position: "CM", kitNumber: 8, age: 23, marketValue: 100, difficulty: "easy" },
  { name: "Raphinha", club: "Barcelona", nationality: "Brazil", league: "La Liga", goals: 12, assists: 7, position: "RW", kitNumber: 11, age: 29, marketValue: 85, difficulty: "easy" },
  { name: "Antoine Griezmann", club: "Atlético Madrid", nationality: "France", league: "La Liga", goals: 6, assists: 4, position: "CF", kitNumber: 7, age: 35, marketValue: 15, difficulty: "easy" },
  { name: "Federico Valverde", club: "Real Madrid", nationality: "Uruguay", league: "La Liga", goals: 5, assists: 4, position: "CM", kitNumber: 8, age: 27, marketValue: 120, difficulty: "easy" },
  // Hard
  { name: "Arda Güler", club: "Real Madrid", nationality: "Turkey", league: "La Liga", goals: 5, assists: 4, position: "CAM", kitNumber: 15, age: 21, marketValue: 60, difficulty: "hard" },
  { name: "Aurélien Tchouaméni", club: "Real Madrid", nationality: "France", league: "La Liga", goals: 2, assists: 2, position: "CDM", kitNumber: 18, age: 26, marketValue: 75, difficulty: "hard" },
  { name: "Alejandro Balde", club: "Barcelona", nationality: "Spain", league: "La Liga", goals: 1, assists: 5, position: "LB", kitNumber: 3, age: 22, marketValue: 55, difficulty: "hard" },
  { name: "Fermín López", club: "Barcelona", nationality: "Spain", league: "La Liga", goals: 4, assists: 3, position: "CM", kitNumber: 16, age: 22, marketValue: 55, difficulty: "hard" },
  { name: "Antonio Rüdiger", club: "Real Madrid", nationality: "Germany", league: "La Liga", goals: 2, assists: 1, position: "CB", kitNumber: 22, age: 33, marketValue: 25, difficulty: "hard" },
  { name: "Julián Álvarez", club: "Atlético Madrid", nationality: "Argentina", league: "La Liga", goals: 11, assists: 5, position: "ST", kitNumber: 19, age: 26, marketValue: 85, difficulty: "hard" },
  { name: "Gavi", club: "Barcelona", nationality: "Spain", league: "La Liga", goals: 3, assists: 4, position: "CM", kitNumber: 6, age: 21, marketValue: 60, difficulty: "hard" },
  { name: "Alphonso Davies", club: "Bayern Munich", nationality: "Canada", league: "Bundesliga", goals: 1, assists: 4, position: "LB", kitNumber: 19, age: 25, marketValue: 55, difficulty: "hard" },
  { name: "Jonathan Tah", club: "Bayern Munich", nationality: "Germany", league: "Bundesliga", goals: 2, assists: 1, position: "CB", kitNumber: 4, age: 29, marketValue: 35, difficulty: "hard" },

  // =================== SERIE A ===================
  // Easy
  { name: "Lautaro Martínez", club: "Inter Milan", nationality: "Argentina", league: "Serie A", goals: 14, assists: 3, position: "ST", kitNumber: 10, age: 28, marketValue: 100, difficulty: "easy" },
  { name: "Rafael Leão", club: "AC Milan", nationality: "Portugal", league: "Serie A", goals: 8, assists: 5, position: "LW", kitNumber: 10, age: 26, marketValue: 80, difficulty: "easy" },
  { name: "Dušan Vlahović", club: "Juventus", nationality: "Serbia", league: "Serie A", goals: 10, assists: 2, position: "ST", kitNumber: 9, age: 26, marketValue: 70, difficulty: "easy" },
  { name: "Marcus Thuram", club: "Inter Milan", nationality: "France", league: "Serie A", goals: 12, assists: 4, position: "ST", kitNumber: 9, age: 28, marketValue: 80, difficulty: "easy" },
  { name: "Nicolò Barella", club: "Inter Milan", nationality: "Italy", league: "Serie A", goals: 4, assists: 7, position: "CM", kitNumber: 23, age: 28, marketValue: 90, difficulty: "easy" },
  { name: "Paulo Dybala", club: "Roma", nationality: "Argentina", league: "Serie A", goals: 6, assists: 4, position: "CF", kitNumber: 21, age: 32, marketValue: 12, difficulty: "easy" },
  { name: "Mike Maignan", club: "AC Milan", nationality: "France", league: "Serie A", goals: 0, assists: 0, position: "GK", kitNumber: 16, age: 30, marketValue: 40, difficulty: "easy" },
  // Hard
  { name: "Hakan Çalhanoğlu", club: "Inter Milan", nationality: "Turkey", league: "Serie A", goals: 4, assists: 4, position: "CM", kitNumber: 20, age: 32, marketValue: 35, difficulty: "hard" },
  { name: "Federico Dimarco", club: "Inter Milan", nationality: "Italy", league: "Serie A", goals: 3, assists: 5, position: "LB", kitNumber: 32, age: 28, marketValue: 50, difficulty: "hard" },
  { name: "Ademola Lookman", club: "Atalanta", nationality: "Nigeria", league: "Serie A", goals: 9, assists: 4, position: "RW", kitNumber: 11, age: 28, marketValue: 55, difficulty: "hard" },
  { name: "Theo Hernández", club: "AC Milan", nationality: "France", league: "Serie A", goals: 3, assists: 4, position: "LB", kitNumber: 19, age: 28, marketValue: 45, difficulty: "hard" },
  { name: "Romelu Lukaku", club: "Napoli", nationality: "Belgium", league: "Serie A", goals: 8, assists: 3, position: "ST", kitNumber: 11, age: 32, marketValue: 15, difficulty: "hard" },
  { name: "Khéphren Thuram", club: "Juventus", nationality: "France", league: "Serie A", goals: 2, assists: 3, position: "CM", kitNumber: 8, age: 24, marketValue: 40, difficulty: "hard" },
  { name: "Mateo Retegui", club: "Atalanta", nationality: "Argentina", league: "Serie A", goals: 13, assists: 3, position: "ST", kitNumber: 32, age: 26, marketValue: 45, difficulty: "hard" },
  { name: "Gleison Bremer", club: "Juventus", nationality: "Brazil", league: "Serie A", goals: 1, assists: 0, position: "CB", kitNumber: 3, age: 28, marketValue: 35, difficulty: "hard" },
  { name: "Davide Frattesi", club: "Inter Milan", nationality: "Italy", league: "Serie A", goals: 5, assists: 2, position: "CM", kitNumber: 16, age: 26, marketValue: 40, difficulty: "hard" },

  // =================== BUNDESLIGA ===================
  // Easy
  { name: "Harry Kane", club: "Bayern Munich", nationality: "England", league: "Bundesliga", goals: 22, assists: 6, position: "ST", kitNumber: 9, age: 33, marketValue: 65, difficulty: "easy" },
  { name: "Florian Wirtz", club: "Bayer Leverkusen", nationality: "Germany", league: "Bundesliga", goals: 12, assists: 10, position: "CAM", kitNumber: 10, age: 23, marketValue: 150, difficulty: "easy" },
  { name: "Jamal Musiala", club: "Bayern Munich", nationality: "Germany", league: "Bundesliga", goals: 12, assists: 8, position: "CAM", kitNumber: 42, age: 23, marketValue: 150, difficulty: "easy" },
  // Hard
  { name: "Serhou Guirassy", club: "Borussia Dortmund", nationality: "Guinea", league: "Bundesliga", goals: 13, assists: 3, position: "ST", kitNumber: 9, age: 30, marketValue: 35, difficulty: "hard" },
  { name: "Leroy Sané", club: "Galatasaray", nationality: "Germany", league: "Turkish Süper Lig", goals: 5, assists: 4, position: "RW", kitNumber: 10, age: 30, marketValue: 35, difficulty: "hard" },
  { name: "Granit Xhaka", club: "Bayer Leverkusen", nationality: "Switzerland", league: "Bundesliga", goals: 3, assists: 5, position: "CM", kitNumber: 34, age: 33, marketValue: 22, difficulty: "hard" },
  { name: "Xavi Simons", club: "Tottenham", nationality: "Netherlands", league: "Premier League", goals: 10, assists: 8, position: "CAM", kitNumber: 7, age: 23, marketValue: 110, difficulty: "hard" },
  { name: "Alejandro Grimaldo", club: "Bayer Leverkusen", nationality: "Spain", league: "Bundesliga", goals: 3, assists: 7, position: "LB", kitNumber: 20, age: 30, marketValue: 38, difficulty: "hard" },
  { name: "Joshua Kimmich", club: "Bayern Munich", nationality: "Germany", league: "Bundesliga", goals: 2, assists: 5, position: "CDM", kitNumber: 6, age: 31, marketValue: 45, difficulty: "hard" },
  { name: "Karim Adeyemi", club: "Borussia Dortmund", nationality: "Germany", league: "Bundesliga", goals: 6, assists: 3, position: "LW", kitNumber: 27, age: 24, marketValue: 35, difficulty: "hard" },

  // =================== LIGUE 1 ===================
  // Easy
  { name: "Ousmane Dembélé", club: "PSG", nationality: "France", league: "Ligue 1", goals: 10, assists: 8, position: "RW", kitNumber: 10, age: 28, marketValue: 60, difficulty: "easy" },
  { name: "Bradley Barcola", club: "PSG", nationality: "France", league: "Ligue 1", goals: 12, assists: 5, position: "LW", kitNumber: 29, age: 23, marketValue: 95, difficulty: "easy" },
  { name: "Khvicha Kvaratskhelia", club: "PSG", nationality: "Georgia", league: "Ligue 1", goals: 8, assists: 5, position: "LW", kitNumber: 7, age: 25, marketValue: 80, difficulty: "easy" },
  { name: "Achraf Hakimi", club: "PSG", nationality: "Morocco", league: "Ligue 1", goals: 3, assists: 5, position: "RB", kitNumber: 2, age: 27, marketValue: 60, difficulty: "easy" },
  { name: "Gianluigi Donnarumma", club: "PSG", nationality: "Italy", league: "Ligue 1", goals: 0, assists: 0, position: "GK", kitNumber: 99, age: 27, marketValue: 35, difficulty: "easy" },
  { name: "Marquinhos", club: "PSG", nationality: "Brazil", league: "Ligue 1", goals: 2, assists: 1, position: "CB", kitNumber: 5, age: 32, marketValue: 22, difficulty: "easy" },
  // Hard
  { name: "Warren Zaïre-Emery", club: "PSG", nationality: "France", league: "Ligue 1", goals: 4, assists: 5, position: "CM", kitNumber: 33, age: 20, marketValue: 60, difficulty: "hard" },
  { name: "Gonçalo Ramos", club: "PSG", nationality: "Portugal", league: "Ligue 1", goals: 9, assists: 3, position: "ST", kitNumber: 9, age: 24, marketValue: 65, difficulty: "hard" },
  { name: "Lee Kang-in", club: "PSG", nationality: "South Korea", league: "Ligue 1", goals: 5, assists: 6, position: "CAM", kitNumber: 19, age: 24, marketValue: 45, difficulty: "hard" },
  { name: "Vitinha", club: "PSG", nationality: "Portugal", league: "Ligue 1", goals: 5, assists: 5, position: "CM", kitNumber: 17, age: 26, marketValue: 60, difficulty: "hard" },
  { name: "Jonathan David", club: "Juventus", nationality: "Canada", league: "Serie A", goals: 14, assists: 3, position: "ST", kitNumber: 9, age: 26, marketValue: 55, difficulty: "hard" },
  { name: "Mason Greenwood", club: "Marseille", nationality: "England", league: "Ligue 1", goals: 9, assists: 3, position: "RW", kitNumber: 10, age: 24, marketValue: 35, difficulty: "hard" },

  // =================== INSANE MODE - ADDITIONAL LEAGUES ===================
  // Liga Portugal
  { name: "Samu Omorodion", club: "Porto", nationality: "Spain", league: "Liga Portugal", goals: 14, assists: 3, position: "ST", kitNumber: 9, age: 21, marketValue: 45, difficulty: "insane" },
  { name: "Ángel Di María", club: "Benfica", nationality: "Argentina", league: "Liga Portugal", goals: 5, assists: 7, position: "RW", kitNumber: 11, age: 38, marketValue: 3, difficulty: "insane" },
  { name: "Vangelis Pavlidis", club: "Benfica", nationality: "Greece", league: "Liga Portugal", goals: 13, assists: 4, position: "ST", kitNumber: 9, age: 27, marketValue: 28, difficulty: "insane" },
  { name: "Pedro Gonçalves", club: "Sporting CP", nationality: "Portugal", league: "Liga Portugal", goals: 7, assists: 6, position: "CAM", kitNumber: 28, age: 27, marketValue: 28, difficulty: "insane" },

  // Eredivisie
  { name: "Brian Brobbey", club: "Ajax", nationality: "Netherlands", league: "Eredivisie", goals: 12, assists: 4, position: "ST", kitNumber: 9, age: 23, marketValue: 32, difficulty: "insane" },
  { name: "Santiago Giménez", club: "Feyenoord", nationality: "Mexico", league: "Eredivisie", goals: 13, assists: 2, position: "ST", kitNumber: 29, age: 24, marketValue: 42, difficulty: "insane" },

  // Turkish Süper Lig
  { name: "Victor Osimhen", club: "Galatasaray", nationality: "Nigeria", league: "Turkish Süper Lig", goals: 15, assists: 5, position: "ST", kitNumber: 45, age: 27, marketValue: 70, difficulty: "insane" },
  { name: "Dries Mertens", club: "Galatasaray", nationality: "Belgium", league: "Turkish Süper Lig", goals: 5, assists: 6, position: "CF", kitNumber: 10, age: 39, marketValue: 2, difficulty: "insane" },
  { name: "Edin Džeko", club: "Fenerbahçe", nationality: "Bosnia", league: "Turkish Süper Lig", goals: 7, assists: 3, position: "ST", kitNumber: 9, age: 40, marketValue: 1, difficulty: "insane" },
  { name: "Fred", club: "Fenerbahçe", nationality: "Brazil", league: "Turkish Süper Lig", goals: 2, assists: 4, position: "CM", kitNumber: 17, age: 33, marketValue: 6, difficulty: "insane" },

  // Saudi Pro League
  { name: "Cristiano Ronaldo", club: "Al-Nassr", nationality: "Portugal", league: "Saudi Pro League", goals: 14, assists: 3, position: "ST", kitNumber: 7, age: 41, marketValue: 10, difficulty: "insane" },
  { name: "Karim Benzema", club: "Al-Ittihad", nationality: "France", league: "Saudi Pro League", goals: 9, assists: 4, position: "ST", kitNumber: 9, age: 38, marketValue: 5, difficulty: "insane" },
  { name: "Sadio Mané", club: "Al-Nassr", nationality: "Senegal", league: "Saudi Pro League", goals: 6, assists: 3, position: "LW", kitNumber: 10, age: 34, marketValue: 8, difficulty: "insane" },
  { name: "N'Golo Kanté", club: "Al-Ittihad", nationality: "France", league: "Saudi Pro League", goals: 1, assists: 3, position: "CDM", kitNumber: 7, age: 35, marketValue: 8, difficulty: "insane" },
  { name: "Aleksandar Mitrović", club: "Al-Hilal", nationality: "Serbia", league: "Saudi Pro League", goals: 16, assists: 3, position: "ST", kitNumber: 9, age: 31, marketValue: 18, difficulty: "insane" },
  { name: "Riyad Mahrez", club: "Al-Ahli", nationality: "Algeria", league: "Saudi Pro League", goals: 4, assists: 5, position: "RW", kitNumber: 26, age: 35, marketValue: 6, difficulty: "insane" },

  // MLS
  { name: "Lionel Messi", club: "Inter Miami", nationality: "Argentina", league: "MLS", goals: 11, assists: 9, position: "RW", kitNumber: 10, age: 38, marketValue: 20, difficulty: "insane" },
  { name: "Riqui Puig", club: "LA Galaxy", nationality: "Spain", league: "MLS", goals: 6, assists: 8, position: "CAM", kitNumber: 6, age: 27, marketValue: 10, difficulty: "insane" },
  { name: "Christian Benteke", club: "DC United", nationality: "Belgium", league: "MLS", goals: 13, assists: 3, position: "ST", kitNumber: 9, age: 35, marketValue: 3, difficulty: "insane" },

  // Brazilian Série A
  { name: "Endrick", club: "Lyon", nationality: "Brazil", league: "Ligue 1", goals: 5, assists: 2, position: "ST", kitNumber: 16, age: 20, marketValue: 45, difficulty: "insane" },
  { name: "Luiz Henrique", club: "Botafogo", nationality: "Brazil", league: "Brazilian Série A", goals: 8, assists: 4, position: "RW", kitNumber: 7, age: 25, marketValue: 22, difficulty: "insane" },

  // Scottish Premiership
  { name: "Kyogo Furuhashi", club: "Celtic", nationality: "Japan", league: "Scottish Premiership", goals: 14, assists: 3, position: "ST", kitNumber: 8, age: 31, marketValue: 12, difficulty: "insane" },

  // Swiss Super League
  { name: "Xherdan Shaqiri", club: "Basel", nationality: "Switzerland", league: "Swiss Super League", goals: 5, assists: 3, position: "RW", kitNumber: 10, age: 34, marketValue: 2, difficulty: "insane" },

  // Austrian Bundesliga
  { name: "Oscar Gloukh", club: "RB Salzburg", nationality: "Israel", league: "Austrian Bundesliga", goals: 8, assists: 7, position: "CAM", kitNumber: 10, age: 22, marketValue: 25, difficulty: "insane" },

  // Greek Super League
  { name: "Ayoub El Kaabi", club: "Olympiacos", nationality: "Morocco", league: "Greek Super League", goals: 13, assists: 2, position: "ST", kitNumber: 9, age: 31, marketValue: 6, difficulty: "insane" },

  // Danish Superliga
  { name: "Patrick Vieira Jr", club: "Copenhagen", nationality: "Guinea-Bissau", league: "Danish Superliga", goals: 6, assists: 4, position: "CAM", kitNumber: 10, age: 24, marketValue: 10, difficulty: "insane" },
];
