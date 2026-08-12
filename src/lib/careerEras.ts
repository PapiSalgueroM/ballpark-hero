/* ────────────────────────────────────────────────────────────────────────────
   careerEras.ts, era engine for Soccer Career ("My Player")
   Hand-written star pools per half-decade (1990-2029) so opponents, Ballon
   d'Or contenders, rivals and transfer clubs stay era-correct AND advance
   with time. Also: named injuries, position starting profiles, and the
   expanded life-event catalog (ids 41+).
   NOTE: this file only imports TYPES from soccerCareerEngine, so the
   engine -> careerEras runtime import has no cycle.
   ──────────────────────────────────────────────────────────────────────────── */
import type { CareerState, RandomEvent, ClubData } from "./soccerCareerEngine";

/* ─── tiny local helpers (duplicated on purpose: no runtime import cycle) ─── */
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const round1 = (v: number) => Math.round(v * 10) / 10;

/* ─── Era star pools ───
   power 1-10 = Ballon d'Or pedigree weight in that window. baseGoals is a
   season goal range. Pools shift every half-decade as the sim year advances. */
export interface EraStar {
  name: string;
  nationality: string;
  position: string;
  club: string;
  baseGoals: [number, number];
  power: number;
}

interface EraDef {
  from: number;
  to: number;
  stars: EraStar[];
  topClubs: string[];          // UCL-winner pool + prestige bonus clubs
  uclExtras: string[];         // extra knockout opponents beyond topClubs
  leagues: Record<string, string[]>; // league -> era title contenders
  rivalFirsts: string[];       // era-flavored first names for generated rivals
}

const S = (name: string, nationality: string, position: string, club: string, g0: number, g1: number, power: number): EraStar =>
  ({ name, nationality, position, club, baseGoals: [g0, g1], power });

const ERA_DEFS: EraDef[] = [
  {
    from: 1990, to: 1994,
    stars: [
      S("Marco van Basten", "Netherlands", "ST", "AC Milan", 19, 32, 10),
      S("Ruud Gullit", "Netherlands", "CAM", "AC Milan", 10, 20, 8),
      S("Frank Rijkaard", "Netherlands", "CDM", "AC Milan", 4, 10, 7),
      S("Lothar Matthäus", "Germany", "CM", "Inter Milan", 8, 16, 9),
      S("Roberto Baggio", "Italy", "CAM", "Juventus", 15, 25, 10),
      S("Hristo Stoichkov", "Bulgaria", "ST", "Barcelona", 16, 28, 9),
      S("Romário", "Brazil", "ST", "Barcelona", 22, 34, 9),
      S("Gabriel Batistuta", "Argentina", "ST", "Fiorentina", 18, 28, 7),
      S("Jürgen Klinsmann", "Germany", "ST", "Tottenham", 15, 25, 7),
      S("Dennis Bergkamp", "Netherlands", "ST", "Inter Milan", 12, 22, 7),
      S("George Weah", "Liberia", "ST", "PSG", 14, 24, 8),
      S("Paolo Maldini", "Italy", "CB", "AC Milan", 1, 4, 8),
      S("Franco Baresi", "Italy", "CB", "AC Milan", 0, 3, 7),
      S("Eric Cantona", "France", "ST", "Man United", 14, 22, 8),
      S("Ryan Giggs", "Wales", "LW", "Man United", 8, 15, 6),
      S("Gheorghe Hagi", "Romania", "CAM", "Barcelona", 8, 15, 7),
      S("Peter Schmeichel", "Denmark", "GK", "Man United", 0, 0, 7),
      S("Alan Shearer", "England", "ST", "Blackburn Rovers", 22, 34, 7),
      S("Matthias Sammer", "Germany", "CB", "Dortmund", 4, 8, 7),
      S("Raí", "Brazil", "CAM", "PSG", 8, 16, 5),
    ],
    topClubs: ["AC Milan", "Barcelona", "Juventus", "Man United", "Real Madrid", "Inter Milan", "Ajax", "Marseille", "Bayern Munich", "Benfica"],
    uclExtras: ["Porto", "PSG", "Parma", "Sampdoria", "Red Star Belgrade", "Steaua Bucharest"],
    leagues: {
      "Premier League": ["Man United", "Arsenal", "Blackburn Rovers", "Newcastle", "Leeds United", "Liverpool"],
      "La Liga": ["Barcelona", "Real Madrid", "Atletico Madrid", "Deportivo", "Valencia"],
      "Bundesliga": ["Bayern Munich", "Dortmund", "Werder Bremen", "Kaiserslautern", "Stuttgart"],
      "Serie A": ["AC Milan", "Juventus", "Inter Milan", "Napoli", "Sampdoria", "Lazio"],
      "Ligue 1": ["Marseille", "PSG", "Monaco", "Nantes", "Bordeaux"],
    },
    rivalFirsts: ["Stefan", "Dario", "Gianluca", "Patrik", "Emile", "Dejan", "Tomas", "Brian", "Oliver", "Marcelo", "Iván", "Predrag", "Davor", "Nwankwo", "Marcel", "Youri", "Ariel", "Christophe", "Darko", "Kenneth"],
  },
  {
    from: 1995, to: 1999,
    stars: [
      S("Ronaldo", "Brazil", "ST", "Inter Milan", 25, 40, 10),
      S("Zinedine Zidane", "France", "CAM", "Juventus", 8, 16, 10),
      S("George Weah", "Liberia", "ST", "AC Milan", 16, 26, 9),
      S("Matthias Sammer", "Germany", "CB", "Dortmund", 4, 9, 8),
      S("Alessandro Del Piero", "Italy", "ST", "Juventus", 15, 25, 8),
      S("Rivaldo", "Brazil", "LW", "Barcelona", 18, 28, 9),
      S("Davor Šuker", "Croatia", "ST", "Real Madrid", 16, 26, 7),
      S("Michael Owen", "England", "ST", "Liverpool", 15, 24, 8),
      S("David Beckham", "England", "RW", "Man United", 6, 12, 8),
      S("Luís Figo", "Portugal", "RW", "Barcelona", 8, 14, 8),
      S("Dennis Bergkamp", "Netherlands", "CAM", "Arsenal", 12, 20, 8),
      S("Gabriel Batistuta", "Argentina", "ST", "Fiorentina", 18, 28, 7),
      S("Roberto Carlos", "Brazil", "LB", "Real Madrid", 4, 8, 7),
      S("Raúl", "Spain", "ST", "Real Madrid", 16, 25, 7),
      S("Andriy Shevchenko", "Ukraine", "ST", "Dynamo Kyiv", 18, 28, 7),
      S("Eric Cantona", "France", "ST", "Man United", 12, 18, 6),
      S("Paolo Maldini", "Italy", "CB", "AC Milan", 1, 3, 7),
      S("Oliver Kahn", "Germany", "GK", "Bayern Munich", 0, 0, 7),
      S("Christian Vieri", "Italy", "ST", "Inter Milan", 16, 26, 6),
      S("Jaap Stam", "Netherlands", "CB", "Man United", 1, 3, 6),
    ],
    topClubs: ["Juventus", "AC Milan", "Real Madrid", "Man United", "Bayern Munich", "Barcelona", "Dortmund", "Ajax", "Inter Milan", "Arsenal"],
    uclExtras: ["Parma", "Lazio", "PSG", "Porto", "Newcastle", "Valencia"],
    leagues: {
      "Premier League": ["Man United", "Arsenal", "Newcastle", "Liverpool", "Chelsea", "Leeds United"],
      "La Liga": ["Real Madrid", "Barcelona", "Atletico Madrid", "Valencia", "Deportivo"],
      "Bundesliga": ["Bayern Munich", "Dortmund", "Kaiserslautern", "Leverkusen"],
      "Serie A": ["Juventus", "AC Milan", "Inter Milan", "Lazio", "Parma", "Fiorentina"],
      "Ligue 1": ["PSG", "Monaco", "Marseille", "Lyon", "Bordeaux"],
    },
    rivalFirsts: ["Stefan", "Dario", "Gianluca", "Patrik", "Emile", "Dejan", "Tomas", "Brian", "Oliver", "Marcelo", "Iván", "Predrag", "Davor", "Nwankwo", "Marcel", "Youri", "Ariel", "Christophe", "Darko", "Kenneth"],
  },
  {
    from: 2000, to: 2004,
    stars: [
      S("Zinedine Zidane", "France", "CAM", "Real Madrid", 8, 15, 10),
      S("Luís Figo", "Portugal", "RW", "Real Madrid", 8, 14, 9),
      S("Michael Owen", "England", "ST", "Liverpool", 16, 26, 8),
      S("Ronaldo", "Brazil", "ST", "Real Madrid", 20, 30, 9),
      S("Pavel Nedvěd", "Czech Republic", "CAM", "Juventus", 10, 18, 8),
      S("Andriy Shevchenko", "Ukraine", "ST", "AC Milan", 20, 30, 9),
      S("Ronaldinho", "Brazil", "CAM", "Barcelona", 15, 25, 9),
      S("Thierry Henry", "France", "ST", "Arsenal", 24, 34, 9),
      S("Oliver Kahn", "Germany", "GK", "Bayern Munich", 0, 0, 8),
      S("Raúl", "Spain", "ST", "Real Madrid", 16, 26, 8),
      S("Rivaldo", "Brazil", "CAM", "Barcelona", 14, 24, 7),
      S("David Beckham", "England", "RW", "Real Madrid", 5, 10, 7),
      S("Roberto Carlos", "Brazil", "LB", "Real Madrid", 4, 8, 7),
      S("Ruud van Nistelrooy", "Netherlands", "ST", "Man United", 22, 32, 8),
      S("Francesco Totti", "Italy", "CAM", "Roma", 14, 22, 7),
      S("Paolo Maldini", "Italy", "CB", "AC Milan", 1, 3, 6),
      S("Deco", "Portugal", "CM", "Porto", 8, 14, 7),
      S("Steven Gerrard", "England", "CM", "Liverpool", 8, 14, 7),
      S("Frank Lampard", "England", "CM", "Chelsea", 10, 18, 7),
      S("Samuel Eto'o", "Cameroon", "ST", "Mallorca", 16, 26, 6),
      S("Alessandro Nesta", "Italy", "CB", "AC Milan", 0, 3, 6),
    ],
    topClubs: ["Real Madrid", "Bayern Munich", "AC Milan", "Porto", "Barcelona", "Man United", "Juventus", "Arsenal", "Liverpool", "Inter Milan"],
    uclExtras: ["Valencia", "Deportivo", "Leeds United", "Lazio", "PSV", "Monaco"],
    leagues: {
      "Premier League": ["Man United", "Arsenal", "Chelsea", "Liverpool", "Newcastle", "Leeds United"],
      "La Liga": ["Real Madrid", "Barcelona", "Valencia", "Deportivo", "Atletico Madrid"],
      "Bundesliga": ["Bayern Munich", "Dortmund", "Leverkusen", "Werder Bremen", "Stuttgart"],
      "Serie A": ["Juventus", "AC Milan", "Inter Milan", "Roma", "Lazio"],
      "Ligue 1": ["Lyon", "Monaco", "PSG", "Marseille", "Bordeaux"],
    },
    rivalFirsts: ["Fernando", "Diego", "Andrés", "Wesley", "Robin", "Arjen", "Franck", "Ricardo", "Milan", "Dimitar", "Emmanuel", "Obafemi", "Landon", "Gonzalo", "Sergio", "Karim", "Cesc", "Theo", "Mikel", "Klaas"],
  },
  {
    from: 2005, to: 2009,
    stars: [
      S("Ronaldinho", "Brazil", "CAM", "Barcelona", 18, 26, 10),
      S("Fabio Cannavaro", "Italy", "CB", "Real Madrid", 0, 3, 8),
      S("Kaká", "Brazil", "CAM", "AC Milan", 15, 25, 9),
      S("Cristiano Ronaldo", "Portugal", "RW", "Man United", 24, 42, 10),
      S("Lionel Messi", "Argentina", "RW", "Barcelona", 23, 38, 10),
      S("Thierry Henry", "France", "ST", "Barcelona", 18, 28, 8),
      S("Samuel Eto'o", "Cameroon", "ST", "Barcelona", 20, 30, 8),
      S("Fernando Torres", "Spain", "ST", "Liverpool", 18, 28, 8),
      S("Steven Gerrard", "England", "CM", "Liverpool", 10, 18, 8),
      S("Frank Lampard", "England", "CM", "Chelsea", 12, 20, 8),
      S("Xavi", "Spain", "CM", "Barcelona", 4, 10, 8),
      S("Andrés Iniesta", "Spain", "CM", "Barcelona", 4, 9, 8),
      S("Wayne Rooney", "England", "ST", "Man United", 14, 26, 8),
      S("Zlatan Ibrahimović", "Sweden", "ST", "Inter Milan", 16, 26, 8),
      S("Gianluigi Buffon", "Italy", "GK", "Juventus", 0, 0, 8),
      S("Didier Drogba", "Ivory Coast", "ST", "Chelsea", 15, 28, 8),
      S("Franck Ribéry", "France", "LW", "Bayern Munich", 10, 18, 7),
      S("David Villa", "Spain", "ST", "Valencia", 18, 28, 7),
      S("Andrea Pirlo", "Italy", "CM", "AC Milan", 4, 9, 7),
      S("John Terry", "England", "CB", "Chelsea", 1, 4, 6),
    ],
    topClubs: ["Barcelona", "AC Milan", "Liverpool", "Man United", "Chelsea", "Real Madrid", "Inter Milan", "Bayern Munich", "Arsenal", "Juventus"],
    uclExtras: ["Lyon", "Porto", "Sevilla", "Valencia", "Roma", "PSV"],
    leagues: {
      "Premier League": ["Man United", "Chelsea", "Arsenal", "Liverpool", "Tottenham", "Everton"],
      "La Liga": ["Barcelona", "Real Madrid", "Valencia", "Sevilla", "Villarreal"],
      "Bundesliga": ["Bayern Munich", "Werder Bremen", "Stuttgart", "Wolfsburg", "Dortmund"],
      "Serie A": ["Inter Milan", "AC Milan", "Juventus", "Roma", "Fiorentina"],
      "Ligue 1": ["Lyon", "Marseille", "Bordeaux", "PSG", "Monaco"],
    },
    rivalFirsts: ["Fernando", "Diego", "Andrés", "Wesley", "Robin", "Arjen", "Franck", "Ricardo", "Milan", "Dimitar", "Emmanuel", "Obafemi", "Landon", "Gonzalo", "Sergio", "Karim", "Cesc", "Theo", "Mikel", "Klaas"],
  },
  {
    from: 2010, to: 2014,
    stars: [
      S("Lionel Messi", "Argentina", "RW", "Barcelona", 35, 55, 10),
      S("Cristiano Ronaldo", "Portugal", "ST", "Real Madrid", 35, 55, 10),
      S("Xavi", "Spain", "CM", "Barcelona", 4, 10, 8),
      S("Andrés Iniesta", "Spain", "CM", "Barcelona", 4, 9, 9),
      S("Neymar", "Brazil", "LW", "Barcelona", 15, 28, 8),
      S("Zlatan Ibrahimović", "Sweden", "ST", "PSG", 20, 32, 8),
      S("Wayne Rooney", "England", "ST", "Man United", 15, 27, 7),
      S("Franck Ribéry", "France", "LW", "Bayern Munich", 10, 18, 9),
      S("Arjen Robben", "Netherlands", "RW", "Bayern Munich", 12, 20, 8),
      S("Radamel Falcao", "Colombia", "ST", "Atletico Madrid", 22, 32, 7),
      S("Gareth Bale", "Wales", "RW", "Real Madrid", 14, 22, 8),
      S("Luis Suárez", "Uruguay", "ST", "Liverpool", 22, 32, 8),
      S("Robert Lewandowski", "Poland", "ST", "Dortmund", 20, 30, 8),
      S("Sergio Agüero", "Argentina", "ST", "Man City", 20, 30, 8),
      S("Manuel Neuer", "Germany", "GK", "Bayern Munich", 0, 0, 9),
      S("Thomas Müller", "Germany", "CAM", "Bayern Munich", 12, 22, 8),
      S("Sergio Ramos", "Spain", "CB", "Real Madrid", 3, 6, 7),
      S("Yaya Touré", "Ivory Coast", "CM", "Man City", 12, 20, 7),
      S("Eden Hazard", "Belgium", "LW", "Chelsea", 12, 18, 7),
      S("Andrea Pirlo", "Italy", "CM", "Juventus", 3, 7, 7),
      S("James Rodríguez", "Colombia", "CAM", "Real Madrid", 10, 16, 6),
    ],
    topClubs: ["Barcelona", "Real Madrid", "Bayern Munich", "Chelsea", "Inter Milan", "Man United", "Dortmund", "Atletico Madrid", "Man City", "Juventus"],
    uclExtras: ["PSG", "Liverpool", "Porto", "Napoli", "Sevilla", "AC Milan"],
    leagues: {
      "Premier League": ["Man United", "Man City", "Chelsea", "Arsenal", "Liverpool", "Tottenham"],
      "La Liga": ["Barcelona", "Real Madrid", "Atletico Madrid", "Valencia", "Sevilla"],
      "Bundesliga": ["Bayern Munich", "Dortmund", "Leverkusen", "Schalke"],
      "Serie A": ["Juventus", "AC Milan", "Inter Milan", "Napoli", "Roma"],
      "Ligue 1": ["PSG", "Marseille", "Lyon", "Monaco", "Lille"],
    },
    rivalFirsts: ["Eden", "Isco", "Paulo", "Romelu", "Memphis", "Alexis", "Ángel", "Edinson", "Mario", "Marco", "Antoine", "Ousmane", "Leroy", "Kingsley", "Dele", "Raheem", "Thiago", "Ciro", "James", "Granit"],
  },
  {
    from: 2015, to: 2019,
    stars: [
      S("Lionel Messi", "Argentina", "RW", "Barcelona", 30, 50, 10),
      S("Cristiano Ronaldo", "Portugal", "ST", "Real Madrid", 28, 48, 10),
      S("Neymar", "Brazil", "LW", "PSG", 18, 30, 8),
      S("Luis Suárez", "Uruguay", "ST", "Barcelona", 24, 40, 8),
      S("Antoine Griezmann", "France", "ST", "Atletico Madrid", 16, 26, 8),
      S("Kylian Mbappé", "France", "ST", "PSG", 18, 33, 9),
      S("Mohamed Salah", "Egypt", "RW", "Liverpool", 20, 32, 9),
      S("Kevin De Bruyne", "Belgium", "CAM", "Man City", 8, 16, 9),
      S("Eden Hazard", "Belgium", "LW", "Chelsea", 12, 21, 8),
      S("Luka Modrić", "Croatia", "CM", "Real Madrid", 3, 8, 9),
      S("Robert Lewandowski", "Poland", "ST", "Bayern Munich", 25, 40, 9),
      S("Sergio Agüero", "Argentina", "ST", "Man City", 18, 28, 7),
      S("Harry Kane", "England", "ST", "Tottenham", 22, 32, 8),
      S("Sadio Mané", "Senegal", "LW", "Liverpool", 16, 26, 8),
      S("Virgil van Dijk", "Netherlands", "CB", "Liverpool", 2, 6, 9),
      S("Gareth Bale", "Wales", "RW", "Real Madrid", 10, 18, 7),
      S("Paulo Dybala", "Argentina", "CAM", "Juventus", 12, 22, 7),
      S("N'Golo Kanté", "France", "CDM", "Chelsea", 2, 5, 8),
      S("Raheem Sterling", "England", "LW", "Man City", 15, 25, 7),
      S("Alisson Becker", "Brazil", "GK", "Liverpool", 0, 0, 7),
    ],
    topClubs: ["Real Madrid", "Barcelona", "Bayern Munich", "Liverpool", "Atletico Madrid", "Juventus", "Man City", "PSG", "Tottenham", "Ajax"],
    uclExtras: ["Roma", "Monaco", "Napoli", "Dortmund", "Sevilla", "Porto"],
    leagues: {
      "Premier League": ["Man City", "Liverpool", "Chelsea", "Tottenham", "Arsenal", "Man United"],
      "La Liga": ["Barcelona", "Real Madrid", "Atletico Madrid", "Sevilla", "Valencia"],
      "Bundesliga": ["Bayern Munich", "Dortmund", "Leipzig", "Leverkusen"],
      "Serie A": ["Juventus", "Napoli", "Roma", "Inter Milan", "AC Milan"],
      "Ligue 1": ["PSG", "Monaco", "Lyon", "Marseille", "Lille"],
    },
    rivalFirsts: ["Eden", "Isco", "Paulo", "Romelu", "Memphis", "Alexis", "Ángel", "Edinson", "Mario", "Marco", "Antoine", "Ousmane", "Leroy", "Kingsley", "Dele", "Raheem", "Thiago", "Ciro", "James", "Granit"],
  },
  {
    from: 2020, to: 2024,
    stars: [
      S("Lionel Messi", "Argentina", "RW", "PSG", 16, 30, 10),
      S("Robert Lewandowski", "Poland", "ST", "Bayern Munich", 30, 48, 10),
      S("Karim Benzema", "France", "ST", "Real Madrid", 22, 40, 10),
      S("Kylian Mbappé", "France", "ST", "PSG", 25, 42, 9),
      S("Erling Haaland", "Norway", "ST", "Man City", 28, 48, 9),
      S("Kevin De Bruyne", "Belgium", "CAM", "Man City", 7, 15, 8),
      S("Mohamed Salah", "Egypt", "RW", "Liverpool", 18, 30, 8),
      S("Vinícius Jr", "Brazil", "LW", "Real Madrid", 15, 26, 9),
      S("Jude Bellingham", "England", "CAM", "Real Madrid", 12, 23, 8),
      S("Rodri", "Spain", "CDM", "Man City", 4, 10, 9),
      S("Luka Modrić", "Croatia", "CM", "Real Madrid", 2, 6, 7),
      S("Harry Kane", "England", "ST", "Bayern Munich", 25, 40, 8),
      S("Neymar", "Brazil", "LW", "PSG", 12, 22, 7),
      S("Lautaro Martínez", "Argentina", "ST", "Inter Milan", 18, 28, 7),
      S("Bukayo Saka", "England", "RW", "Arsenal", 12, 22, 7),
      S("Phil Foden", "England", "CAM", "Man City", 12, 20, 7),
      S("Federico Valverde", "Uruguay", "CM", "Real Madrid", 5, 12, 7),
      S("Antoine Griezmann", "France", "CAM", "Atletico Madrid", 12, 20, 7),
      S("Virgil van Dijk", "Netherlands", "CB", "Liverpool", 2, 5, 7),
      S("Thibaut Courtois", "Belgium", "GK", "Real Madrid", 0, 0, 7),
    ],
    topClubs: ["Real Madrid", "Man City", "Bayern Munich", "Chelsea", "Liverpool", "PSG", "Inter Milan", "Barcelona", "Arsenal", "Dortmund"],
    uclExtras: ["Atletico Madrid", "Napoli", "Benfica", "Porto", "AC Milan", "Ajax"],
    leagues: {
      "Premier League": ["Man City", "Liverpool", "Arsenal", "Chelsea", "Man United", "Tottenham"],
      "La Liga": ["Real Madrid", "Barcelona", "Atletico Madrid", "Sevilla", "Real Sociedad"],
      "Bundesliga": ["Bayern Munich", "Dortmund", "Leipzig", "Leverkusen"],
      "Serie A": ["Inter Milan", "AC Milan", "Napoli", "Juventus", "Atalanta"],
      "Ligue 1": ["PSG", "Marseille", "Monaco", "Lille", "Lyon"],
    },
    rivalFirsts: ["Kylian", "Erling", "Jude", "Bukayo", "Lamine", "Jamal", "Florian", "Pablo", "Jules", "Aurélien", "Eduardo", "Rasmus", "Cole", "Alejandro", "Xavi", "Kenan", "Arda", "Endrick", "Mathys", "Kobbie"],
  },
  {
    from: 2025, to: 2029,
    stars: [
      S("Kylian Mbappé", "France", "ST", "Real Madrid", 28, 45, 10),
      S("Erling Haaland", "Norway", "ST", "Man City", 28, 46, 9),
      S("Jude Bellingham", "England", "CAM", "Real Madrid", 12, 24, 9),
      S("Vinícius Jr", "Brazil", "LW", "Real Madrid", 16, 28, 9),
      S("Lamine Yamal", "Spain", "RW", "Barcelona", 14, 28, 10),
      S("Florian Wirtz", "Germany", "CAM", "Liverpool", 10, 22, 8),
      S("Jamal Musiala", "Germany", "CAM", "Bayern Munich", 10, 20, 8),
      S("Bukayo Saka", "England", "RW", "Arsenal", 12, 24, 8),
      S("Pedri", "Spain", "CM", "Barcelona", 4, 12, 8),
      S("Rodri", "Spain", "CDM", "Man City", 3, 9, 8),
      S("Federico Valverde", "Uruguay", "CM", "Real Madrid", 6, 12, 7),
      S("Harry Kane", "England", "ST", "Bayern Munich", 24, 38, 8),
      S("Mohamed Salah", "Egypt", "RW", "Liverpool", 16, 28, 7),
      S("Phil Foden", "England", "CAM", "Man City", 10, 20, 7),
      S("Declan Rice", "England", "CDM", "Arsenal", 4, 10, 7),
      S("Raphinha", "Brazil", "RW", "Barcelona", 14, 26, 8),
      S("Endrick", "Brazil", "ST", "Real Madrid", 12, 24, 7),
      S("Nico Williams", "Spain", "LW", "Athletic Bilbao", 10, 20, 7),
      S("Désiré Doué", "France", "LW", "PSG", 8, 18, 7),
      S("Kobbie Mainoo", "England", "CM", "Man United", 3, 10, 6),
      S("Gianluigi Donnarumma", "Italy", "GK", "PSG", 0, 0, 7),
    ],
    topClubs: ["Real Madrid", "Man City", "Barcelona", "Bayern Munich", "Arsenal", "Liverpool", "PSG", "Inter Milan", "Leverkusen", "Chelsea"],
    uclExtras: ["Newcastle", "Atletico Madrid", "Napoli", "Benfica", "Dortmund", "Juventus"],
    leagues: {
      "Premier League": ["Man City", "Arsenal", "Liverpool", "Chelsea", "Man United", "Newcastle"],
      "La Liga": ["Real Madrid", "Barcelona", "Atletico Madrid", "Athletic Bilbao", "Girona"],
      "Bundesliga": ["Bayern Munich", "Leverkusen", "Dortmund", "Leipzig"],
      "Serie A": ["Inter Milan", "Napoli", "AC Milan", "Juventus", "Atalanta"],
      "Ligue 1": ["PSG", "Monaco", "Marseille", "Lille", "Lyon"],
    },
    rivalFirsts: ["Kylian", "Erling", "Jude", "Bukayo", "Lamine", "Jamal", "Florian", "Pablo", "Jules", "Aurélien", "Eduardo", "Rasmus", "Cole", "Alejandro", "Xavi", "Kenan", "Arda", "Endrick", "Mathys", "Kobbie"],
  },
];

/* ─── Era accessors, clamp outside 1990-2029 (2030+ reuses the 2025-29 pool) ─── */
function eraDefFor(year: number): EraDef {
  if (year <= ERA_DEFS[0].to) return ERA_DEFS[0];
  for (const def of ERA_DEFS) { if (year >= def.from && year <= def.to) return def; }
  return ERA_DEFS[ERA_DEFS.length - 1];
}

export function getEraStars(year: number): EraStar[] { return eraDefFor(year).stars; }
export function getEraTopClubs(year: number): string[] { return eraDefFor(year).topClubs; }
export function getEraLeagueClubs(year: number): Record<string, string[]> { return eraDefFor(year).leagues; }
export function getEraUclOpponents(year: number): string[] {
  const def = eraDefFor(year);
  return [...def.topClubs, ...def.uclExtras];
}

/* ─── Era rival identity ─── */
const RIVAL_LASTS = ["Silva", "Fernández", "Müller", "Santos", "Rossi", "Andersen", "Johansson", "López", "Martínez", "Hernández", "Dubois", "Weber", "Petrov", "Nielsen", "Eriksen", "Moreno", "Torres", "Schmidt", "Costa", "Bernard", "Okafor", "Diallo", "van den Berg", "Kovač", "Ferreira"];
export function getEraRivalName(year: number): string {
  return pick(eraDefFor(year).rivalFirsts) + " " + pick(RIVAL_LASTS);
}

/* ─── Era-correct transfer market: tier overrides + clubs that did not exist yet ─── */
const CLUB_FOUNDED_AFTER: Record<string, number> = {
  "Leipzig": 2010, "RB Leipzig": 2010, "Inter Miami": 2020, "LAFC": 2018,
  "Los Angeles FC": 2018, "New York City FC": 2015, "Austin FC": 2021, "Charlotte FC": 2022,
};
interface TierRule { name: string; from?: number; until?: number; tier: number }
const ERA_TIER_RULES: TierRule[] = [
  { name: "Man City", until: 2008, tier: 4 }, { name: "Man City", until: 2010, tier: 2 },
  { name: "Chelsea", until: 1996, tier: 3 }, { name: "Chelsea", until: 2003, tier: 2 },
  { name: "PSG", until: 2011, tier: 2 },
  { name: "Arsenal", until: 1996, tier: 2 },
  { name: "Liverpool", until: 2000, tier: 2 },
  { name: "AC Milan", until: 2011, tier: 1 },
  { name: "Napoli", until: 1992, tier: 2 }, { name: "Napoli", until: 2010, tier: 4 },
  { name: "Newcastle", from: 2007, until: 2021, tier: 3 },
  { name: "Tottenham", until: 2009, tier: 3 },
  { name: "Atletico Madrid", until: 2010, tier: 3 },
  { name: "Dortmund", until: 1993, tier: 3 }, { name: "Dortmund", until: 2002, tier: 1 },
  { name: "Monaco", until: 2004, tier: 2 },
  { name: "Marseille", until: 1993, tier: 1 },
  { name: "Al Hilal", until: 2022, tier: 4 }, { name: "Al Nassr", until: 2022, tier: 4 },
  { name: "Leipzig", until: 2015, tier: 4 },
];
export function adjustClubsForYear(clubs: ClubData[], year: number): ClubData[] {
  return clubs
    .filter(c => {
      const founded = CLUB_FOUNDED_AFTER[c.name];
      return founded === undefined || year >= founded;
    })
    .map(c => {
      for (const rule of ERA_TIER_RULES) {
        if (rule.name !== c.name) continue;
        if (rule.from !== undefined && year < rule.from) continue;
        if (rule.until !== undefined && year > rule.until) continue;
        if (c.tier === rule.tier) return c;
        return { ...c, tier: rule.tier };
      }
      return c;
    });
}

/* ─── Named injuries that actually fire ─── */
const INJ_MINOR = ["Bruised ribs", "Ankle knock", "Dead leg", "Tight calf", "Twisted ankle", "Hip knock"];
const INJ_MODERATE = ["Hamstring tear", "Groin strain", "MCL sprain", "Metatarsal fracture", "Dislocated shoulder", "Calf tear", "High ankle sprain"];
const INJ_SEVERE = ["ACL rupture", "Achilles tendon rupture", "Broken leg", "Back stress fracture", "Ruptured quad"];
export interface SeasonInjury { name: string; weeks: number; severe: boolean }
export function rollSeasonInjury(chance: number): SeasonInjury | null {
  if (Math.random() >= chance) return null;
  const sev = Math.random();
  if (sev < 0.15) return { name: pick(INJ_SEVERE), weeks: rand(14, 30), severe: true };
  if (sev < 0.50) return { name: pick(INJ_MODERATE), weeks: rand(5, 10), severe: false };
  return { name: pick(INJ_MINOR), weeks: rand(2, 4), severe: false };
}

/* ─── Ballon d'Or win threshold (configurable) ─── */
export const BDOR_WIN_MIN_GOALS = 30;

/* ─── Starting overall by position group, deliberately capped low (55-68)
   so growth, boosters and purchases actually matter ─── */
export function rollStartingOverall(position: string): number {
  if (position === "GK") return rand(55, 64);
  if (["CB", "LB", "RB"].includes(position)) return rand(55, 66);
  if (["CDM", "CM", "CAM"].includes(position)) return rand(56, 67);
  return rand(56, 68);
}

/* ─── Expanded life-event catalog (ids 41+) ───
   Same RandomEvent shape as the engine's built-in events; getExtraEvents
   returns only the events currently eligible for this player. Everything
   is PG-13 and text-only. */
export function getExtraEvents(state: CareerState): RandomEvent[] {
  const evts: RandomEvent[] = [];
  const st = state;
  const married = st.family.isMarried;

  if (!st.hasRelationship && st.age >= 19 && st.popularity >= 25) {
    evts.push({ id: 41, emoji: "💘", title: "Dating Rumors", description: "Paparazzi snap you at dinner with a well-known singer. Your phone will not stop buzzing.", category: "life", choices: [
      { label: "Go public together", emoji: "💑", color: "bg-pink-600", consequence: "Relationship begins, Popularity +5, Followers +0.5M", apply: s => { s.hasRelationship = true; s.popularity = clamp(s.popularity + 5, 0, 100); s.socialMediaFollowers = round1(s.socialMediaFollowers + 0.5); s.morale = clamp(s.morale + 5, 0, 100); s.events = [...s.events, "💘 Went public with a new relationship"]; return s; } },
      { label: "Stay single, stay focused", emoji: "🎯", color: "bg-muted", consequence: "Physical +1 next season", apply: s => { s.statBoostNextSeason = { ...s.statBoostNextSeason, physical: (s.statBoostNextSeason.physical || 0) + 1 }; s.morale = clamp(s.morale + 2, 0, 100); s.events = [...s.events, "💘 Shut down the dating rumors. Football first"]; return s; } },
    ] });
  }

  if (st.hasRelationship && !married && st.age >= 24) {
    evts.push({ id: 42, emoji: "💍", title: "The Proposal", description: "After years together, it feels like the moment. Do you pop the question?", category: "life", choices: [
      { label: "Lavish celebrity wedding", emoji: "🎉", color: "bg-pink-600", consequence: "-€2M, Married, Popularity +8, Morale +10", apply: s => { s.netWorth = round1(Math.max(0, s.netWorth - 2)); s.family = { ...s.family, isMarried: true, marriedAge: s.age }; s.popularity = clamp(s.popularity + 8, 0, 100); s.morale = clamp(s.morale + 10, 0, 100); s.events = [...s.events, "💍 Married in a star-studded ceremony!"]; return s; } },
      { label: "Small private ceremony", emoji: "🤍", color: "bg-emerald-600", consequence: "-€0.1M, Married, Morale +12", apply: s => { s.netWorth = round1(Math.max(0, s.netWorth - 0.1)); s.family = { ...s.family, isMarried: true, marriedAge: s.age }; s.morale = clamp(s.morale + 12, 0, 100); s.events = [...s.events, "💍 Married quietly surrounded by family"]; return s; } },
      { label: "Not ready yet", emoji: "😬", color: "bg-muted", consequence: "50% chance the relationship ends", apply: s => { if (Math.random() < 0.5) { s.hasRelationship = false; s.morale = clamp(s.morale - 8, 0, 100); s.events = [...s.events, "💔 Cold feet cost you the relationship"]; } else { s.events = [...s.events, "💍 You both agreed: no rush"]; } return s; } },
    ] });
  }

  if (st.hasRelationship && !married) {
    evts.push({ id: 43, emoji: "💔", title: "Relationship on the Rocks", description: "Away trips, training camps, constant travel. Your partner says they barely see you anymore.", category: "life", choices: [
      { label: "Fight for it", emoji: "🌹", color: "bg-emerald-600", consequence: "Relationship survives, Morale -3 (exhausting season)", apply: s => { s.morale = clamp(s.morale - 3, 0, 100); s.events = [...s.events, "🌹 Worked through the rough patch together"]; return s; } },
      { label: "Break up", emoji: "💔", color: "bg-red-600", consequence: "Single again, Morale -10, Shooting +1 (channel the pain)", apply: s => { s.hasRelationship = false; s.morale = clamp(s.morale - 10, 0, 100); s.statBoostNextSeason = { ...s.statBoostNextSeason, shooting: (s.statBoostNextSeason.shooting || 0) + 1 }; s.events = [...s.events, "💔 The relationship ended"]; return s; } },
    ] });
  }

  if ((married || st.hasRelationship) && st.age >= 23 && st.family.children < 4) {
    evts.push({ id: 44, emoji: "👶", title: "Baby News!", description: "You are going to be a parent. Life is about to change forever.", category: "life", choices: [
      { label: "Announce it to the world", emoji: "📣", color: "bg-emerald-600", consequence: "Child +1, Morale +12, Popularity +4", apply: s => { s.family = { ...s.family, children: s.family.children + 1 }; s.morale = clamp(s.morale + 12, 0, 100); s.popularity = clamp(s.popularity + 4, 0, 100); s.customYearlyCosts = round1(s.customYearlyCosts + 0.05); s.events = [...s.events, "👶 Welcomed a child, announced with a baby-boot photo"]; return s; } },
      { label: "Keep it private", emoji: "🤫", color: "bg-muted", consequence: "Child +1, Morale +8", apply: s => { s.family = { ...s.family, children: s.family.children + 1 }; s.morale = clamp(s.morale + 8, 0, 100); s.customYearlyCosts = round1(s.customYearlyCosts + 0.05); s.events = [...s.events, "👶 Became a parent, far from the cameras"]; return s; } },
    ] });
  }

  if (!married && st.age >= 24 && st.popularity >= 40) {
    evts.push({ id: 45, emoji: "🧾", title: "Child Support Claim", description: "A lawyer's letter arrives: someone claims you are the parent of their child and demands support.", category: "negative", choices: [
      { label: "Settle quietly", emoji: "🤐", color: "bg-muted", consequence: "-5% net worth, Child +1, Morale -5", apply: s => { s.netWorth = round1(Math.max(0, s.netWorth * 0.95)); s.family = { ...s.family, children: s.family.children + 1 }; s.morale = clamp(s.morale - 5, 0, 100); s.events = [...s.events, "🧾 Settled a child support case privately"]; return s; } },
      { label: "Demand a DNA test", emoji: "🧬", color: "bg-blue-600", consequence: "50%: cleared · 50%: confirmed + public scandal", apply: s => { if (Math.random() < 0.5) { s.popularity = clamp(s.popularity - 3, 0, 100); s.events = [...s.events, "🧬 DNA test cleared you, case dismissed"]; } else { s.family = { ...s.family, children: s.family.children + 1 }; s.netWorth = round1(Math.max(0, s.netWorth * 0.92)); s.popularity = clamp(s.popularity - 10, 0, 100); s.morale = clamp(s.morale - 8, 0, 100); s.events = [...s.events, "🧬 DNA test confirmed paternity, tabloid frenzy"]; } return s; } },
    ] });
  }

  if (st.age >= 20) {
    evts.push({ id: 46, emoji: "📸", title: "Nightclub Photos Leak", description: "Blurry 3am photos of you at a nightclub surface two days before a big match.", category: "negative", choices: [
      { label: "Public apology", emoji: "🙇", color: "bg-emerald-600", consequence: "Popularity -4, board respects honesty", apply: s => { s.popularity = clamp(s.popularity - 4, 0, 100); s.morale = clamp(s.morale - 3, 0, 100); s.events = [...s.events, "📸 Apologized for the nightclub photos"]; return s; } },
      { label: "Deny everything", emoji: "🙅", color: "bg-red-600", consequence: "50%: blows over · 50%: Popularity -12", apply: s => { if (Math.random() < 0.5) { s.events = [...s.events, "📸 The nightclub story fizzled out"]; } else { s.popularity = clamp(s.popularity - 12, 0, 100); s.morale = clamp(s.morale - 8, 0, 100); s.events = [...s.events, "📸 More photos dropped. The denial backfired badly"]; } return s; } },
      { label: "Own it + charity donation", emoji: "❤️", color: "bg-blue-600", consequence: "-€0.3M, Popularity +2", apply: s => { s.netWorth = round1(Math.max(0, s.netWorth - 0.3)); s.popularity = clamp(s.popularity + 2, 0, 100); s.integrityBonus += 2; s.events = [...s.events, "📸 Owned the night out and donated a week's wage to charity"]; return s; } },
    ] });
  }

  if (st.netWorth >= 5) {
    evts.push({ id: 47, emoji: "🏦", title: "Tax Investigation", description: "The tax office flags your image-rights structure. Your accountant looks nervous.", category: "negative", choices: [
      { label: "Pay back taxes", emoji: "💸", color: "bg-emerald-600", consequence: "-8% net worth, case closed", apply: s => { s.netWorth = round1(Math.max(0, s.netWorth * 0.92)); s.morale = clamp(s.morale - 5, 0, 100); s.events = [...s.events, "🏦 Paid back taxes and closed the case"]; return s; } },
      { label: "Fight it in court", emoji: "⚖️", color: "bg-red-600", consequence: "40%: win · 60%: -15% net worth + scandal", apply: s => { if (Math.random() < 0.4) { s.popularity = clamp(s.popularity + 3, 0, 100); s.events = [...s.events, "⚖️ Won the tax case, fully vindicated"]; } else { s.netWorth = round1(Math.max(0, s.netWorth * 0.85)); s.popularity = clamp(s.popularity - 10, 0, 100); s.morale = clamp(s.morale - 6, 0, 100); s.events = [...s.events, "⚖️ Lost the tax case: headlines and a huge bill"]; } return s; } },
    ] });
  }

  if (st.netWorth >= 1 && st.popularity >= 35 && st.socialMediaFollowers >= 2) {
    evts.push({ id: 48, emoji: "🪙", title: "Crypto Endorsement Collapses", description: "The crypto token you promoted last year just crashed to zero. Fans who bought in are furious.", category: "negative", choices: [
      { label: "Refund fans out of pocket", emoji: "💳", color: "bg-emerald-600", consequence: "-€1.5M, Popularity +6, respect earned", apply: s => { s.netWorth = round1(Math.max(0, s.netWorth - 1.5)); s.popularity = clamp(s.popularity + 6, 0, 100); s.integrityBonus += 5; s.events = [...s.events, "🪙 Personally refunded fans after the crypto collapse"]; return s; } },
      { label: "Quietly delete the posts", emoji: "🫥", color: "bg-red-600", consequence: "Followers -1M, Popularity -8", apply: s => { s.socialMediaFollowers = Math.max(0, round1(s.socialMediaFollowers - 1)); s.popularity = clamp(s.popularity - 8, 0, 100); s.events = [...s.events, "🪙 Deleted the crypto posts, but screenshots live forever"]; return s; } },
    ] });
  }

  evts.push({ id: 49, emoji: "🎤", title: "Live TV Interview", description: "A prime-time host asks: are you the best player in the league right now?", category: "life", choices: [
    { label: "Stay humble", emoji: "🤝", color: "bg-emerald-600", consequence: "Popularity +6, board approves", apply: s => { s.popularity = clamp(s.popularity + 6, 0, 100); s.morale = clamp(s.morale + 3, 0, 100); s.events = [...s.events, "🎤 The humble interview won everyone over"]; return s; } },
    { label: "\"Yes. Easily.\"", emoji: "😎", color: "bg-amber-600", consequence: "Followers +1.5M, Popularity -4, Shooting +1 (confidence)", apply: s => { s.socialMediaFollowers = round1(s.socialMediaFollowers + 1.5); s.popularity = clamp(s.popularity - 4, 0, 100); s.statBoostNextSeason = { ...s.statBoostNextSeason, shooting: (s.statBoostNextSeason.shooting || 0) + 1 }; s.events = [...s.events, "🎤 Declared yourself the best. The clip went viral"]; return s; } },
    { label: "Dodge the question", emoji: "🧊", color: "bg-muted", consequence: "No drama", apply: s => { s.morale = clamp(s.morale + 1, 0, 100); s.events = [...s.events, "🎤 Gave the media nothing to work with"]; return s; } },
  ] });

  evts.push({ id: 50, emoji: "🕴️", title: "Streaker Steals the Show", description: "A streaker interrupts your match and attempts your signature celebration on the way out.", category: "positive", choices: [
    { label: "Laugh and applaud", emoji: "😂", color: "bg-emerald-600", consequence: "Popularity +3, Followers +0.5M", apply: s => { s.popularity = clamp(s.popularity + 3, 0, 100); s.socialMediaFollowers = round1(s.socialMediaFollowers + 0.5); s.events = [...s.events, "🕴️ Your reaction to the streaker became a meme"]; return s; } },
    { label: "Complain to the ref", emoji: "😤", color: "bg-muted", consequence: "Popularity -2", apply: s => { s.popularity = clamp(s.popularity - 2, 0, 100); s.morale = clamp(s.morale - 2, 0, 100); s.events = [...s.events, "🕴️ Fumed about the streaker. Fans called you no fun"]; return s; } },
  ] });

  if (st.age >= 20) {
    evts.push({ id: 51, emoji: "🥊", title: "Dressing Room Bust-Up", description: "A teammate blames you loudly for a defeat. Shoving follows. Cameras hear everything.", category: "negative", choices: [
      { label: "Squash it privately", emoji: "🤝", color: "bg-emerald-600", consequence: "Morale +4, leadership respect", apply: s => { s.morale = clamp(s.morale + 4, 0, 100); s.popularity = clamp(s.popularity + 1, 0, 100); s.events = [...s.events, "🥊 Cleared the air with your teammate behind closed doors"]; return s; } },
      { label: "Let it fester", emoji: "🧊", color: "bg-red-600", consequence: "Morale -8, Passing -1 (no chemistry)", apply: s => { s.morale = clamp(s.morale - 8, 0, 100); s.statBoostNextSeason = { ...s.statBoostNextSeason, passing: (s.statBoostNextSeason.passing || 0) - 1 }; s.events = [...s.events, "🥊 The feud froze the dressing room"]; return s; } },
      { label: "Demand the club sells him", emoji: "📤", color: "bg-amber-600", consequence: "50%: board backs you · 50%: board backs him", apply: s => { if (Math.random() < 0.5) { s.morale = clamp(s.morale + 6, 0, 100); s.events = [...s.events, "📤 The board backed you. He was sold in January"]; } else { s.morale = clamp(s.morale - 10, 0, 100); s.popularity = clamp(s.popularity - 4, 0, 100); s.events = [...s.events, "📤 The board backed HIM. Awkward training sessions ahead"]; } return s; } },
    ] });
  }

  if (st.netWorth >= 0.5) {
    evts.push({ id: 52, emoji: "🎰", title: "High-Stakes Poker Invitation", description: "A veteran teammate invites you to a private poker night. The buy-in is eye-watering.", category: "life", choices: [
      { label: "Decline politely", emoji: "🚪", color: "bg-emerald-600", consequence: "Stay clean, Morale +1", apply: s => { s.integrityBonus += 2; s.morale = clamp(s.morale + 1, 0, 100); s.events = [...s.events, "🎰 Skipped the poker night"]; return s; } },
      { label: "One night only", emoji: "🃏", color: "bg-amber-600", consequence: "55%: win €0.4M · 45%: lose €0.8M", apply: s => { if (Math.random() < 0.55) { s.netWorth = round1(s.netWorth + 0.4); s.events = [...s.events, "🃏 Cleaned up at the poker table (+€0.4M)"]; } else { s.netWorth = round1(Math.max(0, s.netWorth - 0.8)); s.morale = clamp(s.morale - 4, 0, 100); s.events = [...s.events, "🃏 Lost big at poker (-€0.8M)"]; } return s; } },
      { label: "Become a regular", emoji: "🎲", color: "bg-red-600", consequence: "-5% net worth, tabloids notice, Morale -6", apply: s => { s.netWorth = round1(Math.max(0, s.netWorth * 0.95)); s.popularity = clamp(s.popularity - 6, 0, 100); s.morale = clamp(s.morale - 6, 0, 100); s.events = [...s.events, "🎲 The poker habit made the back pages"]; return s; } },
    ] });
  }

  evts.push({ id: 53, emoji: "🏥", title: "Children's Hospital Visit", description: "The club asks for a volunteer to visit the local children's hospital on your day off.", category: "positive", choices: [
    { label: "Spend the whole day", emoji: "❤️", color: "bg-emerald-600", consequence: "Popularity +6, Morale +6", apply: s => { s.popularity = clamp(s.popularity + 6, 0, 100); s.morale = clamp(s.morale + 6, 0, 100); s.integrityBonus += 3; s.events = [...s.events, "❤️ Spent your day off at the children's hospital"]; return s; } },
    { label: "Send signed shirts", emoji: "👕", color: "bg-muted", consequence: "Popularity +2", apply: s => { s.popularity = clamp(s.popularity + 2, 0, 100); s.events = [...s.events, "👕 Sent signed shirts to the children's ward"]; return s; } },
  ] });

  if (st.overall >= 76 && st.age <= 30) {
    evts.push({ id: 54, emoji: "👟", title: "Boot Deal Bidding War", description: "Two sportswear giants are fighting over your signature boot line.", category: "positive", choices: [
      { label: "Sign with the giant", emoji: "💰", color: "bg-emerald-600", consequence: "+€2.5M, Followers +1M", apply: s => { s.netWorth = round1(s.netWorth + 2.5); s.socialMediaFollowers = round1(s.socialMediaFollowers + 1); s.sponsorDeal = s.sponsorDeal || "Boot Giant"; s.events = [...s.events, "👟 Signed a monster boot deal (+€2.5M)"]; return s; } },
      { label: "Stay loyal to the small brand", emoji: "🤝", color: "bg-blue-600", consequence: "+€0.5M, Popularity +5", apply: s => { s.netWorth = round1(s.netWorth + 0.5); s.popularity = clamp(s.popularity + 5, 0, 100); s.integrityBonus += 2; s.events = [...s.events, "👟 Stayed loyal to the brand that believed in you first"]; return s; } },
    ] });
  }

  if (st.popularity >= 30) {
    evts.push({ id: 55, emoji: "📱", title: "Pundit Calls You Overrated", description: "A famous TV pundit spends ten minutes explaining why you are \"the most overrated player in football\".", category: "negative", choices: [
      { label: "Clap back online", emoji: "🔥", color: "bg-amber-600", consequence: "Followers +2M, Popularity -3", apply: s => { s.socialMediaFollowers = round1(s.socialMediaFollowers + 2); s.popularity = clamp(s.popularity - 3, 0, 100); s.morale = clamp(s.morale + 2, 0, 100); s.events = [...s.events, "🔥 Your reply to the pundit broke the internet"]; return s; } },
      { label: "Respond on the pitch", emoji: "⚽", color: "bg-emerald-600", consequence: "Shooting +1, Pace +1 next season", apply: s => { s.statBoostNextSeason = { ...s.statBoostNextSeason, shooting: (s.statBoostNextSeason.shooting || 0) + 1, pace: (s.statBoostNextSeason.pace || 0) + 1 }; s.morale = clamp(s.morale + 3, 0, 100); s.events = [...s.events, "⚽ Used the criticism as fuel"]; return s; } },
      { label: "Ignore it", emoji: "🧘", color: "bg-muted", consequence: "Inner peace", apply: s => { s.morale = clamp(s.morale + 1, 0, 100); s.events = [...s.events, "🧘 Never even watched the clip"]; return s; } },
    ] });
  }

  if (st.age >= 21) {
    evts.push({ id: 56, emoji: "🕶️", title: "Agent Demands 15%", description: "Your agent says he made you, and now wants his cut raised from 10% to 15%.", category: "negative", choices: [
      { label: "Fire him", emoji: "🚪", color: "bg-red-600", consequence: "50%: better agent · 50%: representation chaos", apply: s => { if (Math.random() < 0.5) { s.morale = clamp(s.morale + 3, 0, 100); s.popularity = clamp(s.popularity + 1, 0, 100); s.events = [...s.events, "🚪 Fired your agent and found a sharper one"]; } else { s.morale = clamp(s.morale - 6, 0, 100); s.events = [...s.events, "🚪 The agent split turned messy: endless leaks"]; } return s; } },
      { label: "Pay the 15%", emoji: "💸", color: "bg-muted", consequence: "-€0.5M in fees, Morale -2", apply: s => { s.netWorth = round1(Math.max(0, s.netWorth - 0.5)); s.agentFeesPaid = round1(s.agentFeesPaid + 0.5); s.morale = clamp(s.morale - 2, 0, 100); s.events = [...s.events, "💸 Gave in to the agent's new cut"]; return s; } },
      { label: "Negotiate hard to keep 10%", emoji: "🤝", color: "bg-emerald-600", consequence: "Relationship tense but intact", apply: s => { s.morale = clamp(s.morale + 1, 0, 100); s.events = [...s.events, "🤝 Talked your agent down, 10% stands"]; return s; } },
    ] });
  }

  if (st.contractYearsLeft <= 2 && st.age >= 22 && st.overall >= 72) {
    evts.push({ id: 57, emoji: "📄", title: "Contract Standoff", description: "Talks over a new deal have stalled. Your camp believes you are worth far more.", category: "life", choices: [
      { label: "Hold out of training", emoji: "🪧", color: "bg-red-600", consequence: "50%: wage +20% · 50%: fined + fan backlash", apply: s => { if (Math.random() < 0.5) { s.weeklyWage = Math.round(s.weeklyWage * 1.2); s.popularity = clamp(s.popularity - 6, 0, 100); s.events = [...s.events, "🪧 The holdout worked: wage up 20%"]; } else { s.netWorth = round1(Math.max(0, s.netWorth * 0.98)); s.popularity = clamp(s.popularity - 8, 0, 100); s.morale = clamp(s.morale - 6, 0, 100); s.events = [...s.events, "🪧 Fined and criticized. The holdout backfired"]; } return s; } },
      { label: "Sign quietly", emoji: "🖊️", color: "bg-emerald-600", consequence: "Wage +5%, Morale +3", apply: s => { s.weeklyWage = Math.round(s.weeklyWage * 1.05); s.morale = clamp(s.morale + 3, 0, 100); s.events = [...s.events, "🖊️ Signed a modest new deal without drama"]; return s; } },
      { label: "Play out the contract", emoji: "⏳", color: "bg-muted", consequence: "Bet on yourself", apply: s => { s.events = [...s.events, "⏳ No new deal, betting on a big season"]; return s; } },
    ] });
  }

  if (st.popularity >= 45) {
    evts.push({ id: 58, emoji: "🌍", title: "Charity Match Invitation", description: "A legends charity match for disaster relief wants you as the headline act.", category: "positive", choices: [
      { label: "Headline the match", emoji: "🌟", color: "bg-emerald-600", consequence: "Popularity +7, Morale +5", apply: s => { s.popularity = clamp(s.popularity + 7, 0, 100); s.morale = clamp(s.morale + 5, 0, 100); s.integrityBonus += 3; s.events = [...s.events, "🌍 Headlined the charity match, millions raised"]; return s; } },
      { label: "Politely decline", emoji: "🙏", color: "bg-muted", consequence: "Rest instead", apply: s => { s.morale = clamp(s.morale + 1, 0, 100); s.events = [...s.events, "🌍 Skipped the charity match to rest"]; return s; } },
    ] });
  }

  if (st.age >= 30) {
    evts.push({ id: 59, emoji: "🏟️", title: "Testimonial Invitation", description: "Your boyhood club wants to host a testimonial in your honour.", category: "positive", choices: [
      { label: "Play the testimonial", emoji: "🥹", color: "bg-emerald-600", consequence: "Popularity +6, Morale +8", apply: s => { s.popularity = clamp(s.popularity + 6, 0, 100); s.morale = clamp(s.morale + 8, 0, 100); s.events = [...s.events, "🏟️ A sold-out testimonial at your boyhood club"]; return s; } },
      { label: "Too busy this year", emoji: "📅", color: "bg-muted", consequence: "Popularity -3", apply: s => { s.popularity = clamp(s.popularity - 3, 0, 100); s.events = [...s.events, "📅 Postponed the testimonial. Locals were hurt"]; return s; } },
    ] });
  }

  if (st.overall >= 80) {
    evts.push({ id: 60, emoji: "🎮", title: "Video Game Rating Snub", description: "The new football game rates you 3 points lower than last year. Everyone is tagging you.", category: "life", choices: [
      { label: "Post a sarcastic meme", emoji: "😏", color: "bg-amber-600", consequence: "Followers +1.5M", apply: s => { s.socialMediaFollowers = round1(s.socialMediaFollowers + 1.5); s.popularity = clamp(s.popularity + 2, 0, 100); s.events = [...s.events, "😏 Your rating-snub meme got a million likes"]; return s; } },
      { label: "Let your feet talk", emoji: "🏋️", color: "bg-emerald-600", consequence: "Physical +1 next season", apply: s => { s.statBoostNextSeason = { ...s.statBoostNextSeason, physical: (s.statBoostNextSeason.physical || 0) + 1 }; s.events = [...s.events, "🏋️ Trained harder. Ratings are just numbers"]; return s; } },
    ] });
  }

  evts.push({ id: 61, emoji: "🚌", title: "Team Bus Breaks Down", description: "The team bus dies on the motorway, three hours from home. Fans start gathering.", category: "life", choices: [
    { label: "Selfies with everyone", emoji: "🤳", color: "bg-emerald-600", consequence: "Popularity +4, Followers +0.4M", apply: s => { s.popularity = clamp(s.popularity + 4, 0, 100); s.socialMediaFollowers = round1(s.socialMediaFollowers + 0.4); s.events = [...s.events, "🤳 Turned the bus breakdown into a fan meet-up"]; return s; } },
    { label: "Sulk with headphones on", emoji: "🎧", color: "bg-muted", consequence: "Morale -2", apply: s => { s.morale = clamp(s.morale - 2, 0, 100); s.events = [...s.events, "🎧 Waited out the breakdown in silence"]; return s; } },
  ] });

  evts.push({ id: 62, emoji: "🦴", title: "Training Ground Collision", description: "You clash knees with a teammate in training. It hurts, but the physio says it is borderline.", category: "negative", choices: [
    { label: "Push through it", emoji: "😤", color: "bg-amber-600", consequence: "70%: fine · 30%: aggravate it (Physical -2)", apply: s => { if (Math.random() < 0.3) { s.statBoostNextSeason = { ...s.statBoostNextSeason, physical: (s.statBoostNextSeason.physical || 0) - 2 }; s.morale = clamp(s.morale - 4, 0, 100); s.events = [...s.events, "🦴 Played through the knock and made it worse"]; } else { s.morale = clamp(s.morale + 2, 0, 100); s.events = [...s.events, "🦴 Gritted through the training knock"]; } return s; } },
    { label: "Sit out two weeks", emoji: "🛌", color: "bg-emerald-600", consequence: "Safe choice, Morale -1", apply: s => { s.morale = clamp(s.morale - 1, 0, 100); s.events = [...s.events, "🛌 Rested the knee. Better safe than sorry"]; return s; } },
  ] });

  if (st.age >= 21) {
    evts.push({ id: 63, emoji: "💬", title: "Leaked Group Chat", description: "A private message where you rate the manager's tactics \"stone age\" leaks to the press.", category: "negative", choices: [
      { label: "Apologize to the gaffer", emoji: "🙇", color: "bg-emerald-600", consequence: "Awkward but resolved", apply: s => { s.morale = clamp(s.morale + 2, 0, 100); s.events = [...s.events, "💬 Apologized for the leaked message"]; return s; } },
      { label: "Stand by every word", emoji: "🗿", color: "bg-red-600", consequence: "50%: manager respects it · 50%: benched briefly", apply: s => { if (Math.random() < 0.5) { s.morale = clamp(s.morale + 6, 0, 100); s.popularity = clamp(s.popularity + 3, 0, 100); s.events = [...s.events, "🗿 The manager respected the honesty and cleared the air"]; } else { s.morale = clamp(s.morale - 5, 0, 100); s.statBoostNextSeason = { ...s.statBoostNextSeason, passing: (s.statBoostNextSeason.passing || 0) - 1 }; s.events = [...s.events, "🗿 Spent a month on the bench for that one"]; } return s; } },
    ] });
  }

  if (st.popularity >= 50) {
    evts.push({ id: 64, emoji: "🍳", title: "Celebrity Cooking Show", description: "A hit cooking show wants you for its celebrity special.", category: "life", choices: [
      { label: "Bring the apron", emoji: "👨\u200d🍳", color: "bg-emerald-600", consequence: "Popularity +5, Followers +1M", apply: s => { s.popularity = clamp(s.popularity + 5, 0, 100); s.socialMediaFollowers = round1(s.socialMediaFollowers + 1); s.morale = clamp(s.morale + 4, 0, 100); s.events = [...s.events, "🍳 Burned the dessert on national TV. Everyone loved it"]; return s; } },
      { label: "Decline", emoji: "🚫", color: "bg-muted", consequence: "No distractions", apply: s => { s.events = [...s.events, "🍳 Passed on the cooking show"]; return s; } },
    ] });
  }

  if (st.age >= 20 && st.currentClubTier <= 2) {
    evts.push({ id: 65, emoji: "✈️", title: "Lost Passport Before European Night", description: "Your passport is missing the morning of a Champions League away trip.", category: "negative", choices: [
      { label: "Emergency charter scramble", emoji: "🛩️", color: "bg-amber-600", consequence: "-€0.2M, you make kickoff", apply: s => { s.netWorth = round1(Math.max(0, s.netWorth - 0.2)); s.morale = clamp(s.morale - 2, 0, 100); s.events = [...s.events, "🛩️ Chartered a jet after the passport chaos and made kickoff"]; return s; } },
      { label: "Miss the match", emoji: "📺", color: "bg-red-600", consequence: "Morale -6, Popularity -3", apply: s => { s.morale = clamp(s.morale - 6, 0, 100); s.popularity = clamp(s.popularity - 3, 0, 100); s.events = [...s.events, "📺 Watched the away match from your sofa. Unforgivable"]; return s; } },
    ] });
  }

  if (st.socialMediaFollowers >= 3) {
    evts.push({ id: 66, emoji: "🧢", title: "Bootleg Merch Everywhere", description: "Street stalls are selling knock-off shirts with your face (and a questionable likeness).", category: "life", choices: [
      { label: "Lawyer up", emoji: "⚖️", color: "bg-blue-600", consequence: "+€0.5M settlement after fees", apply: s => { s.netWorth = round1(s.netWorth + 0.5); s.events = [...s.events, "⚖️ Won a settlement from the bootleggers"]; return s; } },
      { label: "Let it slide", emoji: "😄", color: "bg-emerald-600", consequence: "Popularity +2 (man of the people)", apply: s => { s.popularity = clamp(s.popularity + 2, 0, 100); s.events = [...s.events, "😄 Posed with a bootleg shirt. Fans loved it"]; return s; } },
    ] });
  }

  if (st.socialMediaFollowers >= 1) {
    evts.push({ id: 67, emoji: "💇", title: "New Haircut Goes Viral", description: "Your bold new haircut is trending, and not entirely in a good way.", category: "life", choices: [
      { label: "Lean into it", emoji: "😎", color: "bg-emerald-600", consequence: "Followers +1.2M, Popularity +3", apply: s => { s.socialMediaFollowers = round1(s.socialMediaFollowers + 1.2); s.popularity = clamp(s.popularity + 3, 0, 100); s.events = [...s.events, "💇 Owned the haircut. Barbers copied it nationwide"]; return s; } },
      { label: "Hat until it grows back", emoji: "🧢", color: "bg-muted", consequence: "Morale -2", apply: s => { s.morale = clamp(s.morale - 2, 0, 100); s.events = [...s.events, "💇 Wore a beanie for two months straight"]; return s; } },
    ] });
  }

  if (st.age >= 25 && st.socialMediaFollowers >= 2) {
    evts.push({ id: 68, emoji: "🎙️", title: "Launch Your Own Podcast", description: "A production company offers to launch your podcast: tactics, teammates, tea.", category: "life", choices: [
      { label: "Launch it", emoji: "🎧", color: "bg-emerald-600", consequence: "+€0.6M, Followers +1M", apply: s => { s.netWorth = round1(s.netWorth + 0.6); s.socialMediaFollowers = round1(s.socialMediaFollowers + 1); s.morale = clamp(s.morale + 2, 0, 100); s.events = [...s.events, "🎙️ Your podcast topped the charts in week one"]; return s; } },
      { label: "Focus on football", emoji: "⚽", color: "bg-muted", consequence: "Passing +1 next season", apply: s => { s.statBoostNextSeason = { ...s.statBoostNextSeason, passing: (s.statBoostNextSeason.passing || 0) + 1 }; s.events = [...s.events, "⚽ Turned down the podcast. Reps over takes"]; return s; } },
    ] });
  }

  if (st.popularity >= 40) {
    evts.push({ id: 69, emoji: "📣", title: "Ultras Ask You to Lead the Chant", description: "After a huge win, the ultras hand you the megaphone in front of the whole end.", category: "positive", choices: [
      { label: "Grab the megaphone", emoji: "🗣️", color: "bg-emerald-600", consequence: "Popularity +6, Morale +6", apply: s => { s.popularity = clamp(s.popularity + 6, 0, 100); s.morale = clamp(s.morale + 6, 0, 100); s.events = [...s.events, "📣 Led the chant from the fence. Instant cult hero"]; return s; } },
      { label: "Wave and jog off", emoji: "👋", color: "bg-muted", consequence: "Morale +2", apply: s => { s.morale = clamp(s.morale + 2, 0, 100); s.events = [...s.events, "👋 Kept it low-key with the ultras"]; return s; } },
    ] });
  }

  if (st.morale <= 50) {
    evts.push({ id: 70, emoji: "🧠", title: "Sports Psychologist", description: "The club doctor quietly suggests sessions with a sports psychologist. Form and mood are linked.", category: "life", choices: [
      { label: "Commit to sessions", emoji: "🛋️", color: "bg-emerald-600", consequence: "Morale +15, Passing +1", apply: s => { s.morale = clamp(s.morale + 15, 0, 100); s.statBoostNextSeason = { ...s.statBoostNextSeason, passing: (s.statBoostNextSeason.passing || 0) + 1 }; s.events = [...s.events, "🧠 The psychologist sessions changed everything"]; return s; } },
      { label: "\"I'm fine.\"", emoji: "🧱", color: "bg-muted", consequence: "Morale -3", apply: s => { s.morale = clamp(s.morale - 3, 0, 100); s.events = [...s.events, "🧱 Brushed off the psychologist suggestion"]; return s; } },
    ] });
  }

  if (st.age >= 28) {
    evts.push({ id: 71, emoji: "🧑\u200d🏫", title: "Mentor the Academy Kid", description: "A 16-year-old wonderkid joins first-team training. The manager asks you to look after him.", category: "positive", choices: [
      { label: "Take him under your wing", emoji: "🕊️", color: "bg-emerald-600", consequence: "Popularity +4, Morale +6, leadership grows", apply: s => { s.popularity = clamp(s.popularity + 4, 0, 100); s.morale = clamp(s.morale + 6, 0, 100); s.isLeader = true; s.integrityBonus += 2; s.events = [...s.events, "🕊️ Mentored the academy wonderkid all season"]; return s; } },
      { label: "Not my job", emoji: "🤷", color: "bg-muted", consequence: "Morale -1", apply: s => { s.morale = clamp(s.morale - 1, 0, 100); s.events = [...s.events, "🤷 Left the wonderkid to figure it out alone"]; return s; } },
    ] });
  }

  evts.push({ id: 72, emoji: "🐕", title: "Adopt a Rescue Dog", description: "A shelter you follow posts a scruffy rescue dog that nobody wants. You cannot stop thinking about it.", category: "life", choices: [
    { label: "Adopt him", emoji: "🐾", color: "bg-emerald-600", consequence: "Morale +8, Followers +0.8M", apply: s => { s.morale = clamp(s.morale + 8, 0, 100); s.socialMediaFollowers = round1(s.socialMediaFollowers + 0.8); s.customYearlyCosts = round1(s.customYearlyCosts + 0.01); s.events = [...s.events, "🐕 Adopted a rescue dog. He has his own fan account now"]; return s; } },
    { label: "Not right now", emoji: "😔", color: "bg-muted", consequence: "No change", apply: s => { s.events = [...s.events, "🐕 Decided a dog can wait until retirement"]; return s; } },
  ] });

  return evts;
}
