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
  // Round 54 club expansion: keep the new-world clubs out of eras where they
  // did not exist yet (or were not professional outfits yet).
  "Toronto FC": 2006, "Vancouver Whitecaps": 2011, "Melbourne Victory": 2004,
  "Wellington Phoenix": 2007, "Auckland FC": 2024, "Mumbai City": 2014,
  "Buriram United": 2012, "Hanoi FC": 2006, "Al Duhail": 2009,
  "Shanghai Port": 2005, "Sheriff Tiraspol": 1997, "Beijing Guoan": 1992,
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
  // Round 54: era-honest tiers for the expansion clubs
  { name: "Girona", until: 2022, tier: 4 },
  { name: "Al Ittihad", until: 2022, tier: 4 },
  { name: "Brighton", until: 2016, tier: 4 }, { name: "Brighton", until: 2021, tier: 3 },
  { name: "Wolves", until: 2017, tier: 4 },
  { name: "Zenit", until: 2006, tier: 4 },
  { name: "Shakhtar Donetsk", until: 1999, tier: 4 },
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
/**
 * Round 78: start WAY lower (owner: "it should start way lower"). A 16 year
 * old academy kid is raw: most rolls land 46-58, a gifted start is uncommon
 * and an exceptional one is a 3 percent event.
 */
export function rollStartingOverall(position: string): number {
  const r = Math.random();
  let base: number;
  if (r < 0.55) base = rand(46, 54);        // raw, the normal case
  else if (r < 0.85) base = rand(53, 59);   // promising
  else if (r < 0.97) base = rand(58, 63);   // gifted
  else base = rand(63, 66);                 // exceptional, 3 percent
  const posAdj = position === "GK" ? -1 : ["CB", "LB", "RB"].includes(position) ? 0 : 1;
  return Math.max(44, Math.min(67, base + posAdj));
}

/**
 * Round 78: every career now rolls a hidden POTENTIAL at creation (owner:
 * "have a very few percentage of starting off with a high potential").
 * Half of all careers cap in the 70s, a solid chunk in the low 80s, and the
 * generational 93+ ceiling is a 1.5 percent roll. Stat growth stalls hard as
 * you approach it, so the shop, training and events are what squeeze out the
 * last points.
 */
export function rollPotential(startingOvr: number): number {
  const r = Math.random();
  let pot: number;
  if (r < 0.5) pot = rand(70, 79);          // journeyman to solid pro
  else if (r < 0.8) pot = rand(78, 84);     // very good career
  else if (r < 0.93) pot = rand(84, 89);    // star
  else if (r < 0.985) pot = rand(89, 93);   // world class, 5.5 percent
  else pot = rand(93, 97);                  // generational, 1.5 percent
  /* Round 159: capped at 99. A 95 roll used to project a 101 ceiling, which
     is a number the engine itself can never reach. */
  return Math.min(99, Math.max(pot, startingOvr + 6));
}

/** Scout-speak for a rolled potential, exact number never shown. */
export function potentialTier(pot: number): { label: string; color: string } {
  if (pot >= 93) return { label: "Generational talent", color: "text-purple-400" };
  if (pot >= 89) return { label: "World class ceiling", color: "text-amber-400" };
  if (pot >= 84) return { label: "Future star", color: "text-emerald-400" };
  if (pot >= 78) return { label: "Top league quality", color: "text-sky-400" };
  return { label: "Honest pro ceiling", color: "text-muted-foreground" };
}

/* ─── Round 79: spend a point budget on your own attributes, then get told
   who you play like (his ask: pick your starting stats yourself and have the
   game tell you which real player that build resembles) ───
   The roll gives you a point budget; the build screen lets you move points
   between the stats that actually feed the engine's overall. allocOverall
   mirrors soccerCareerEngine.calcOverall EXACTLY (same weights) and the sim
   harness asserts they never drift apart. Type-only imports here, so the
   mirror is duplicated on purpose like the helpers above. */

export type AllocKey = "pace" | "shooting" | "passing" | "dribbling" | "defending" | "physical" | "reflexes";
export interface AllocStats { pace: number; shooting: number; passing: number; dribbling: number; defending: number; physical: number; reflexes: number }
export interface AllocRow { key: AllocKey; label: string }

export const ALLOC_MIN = 25;
/* Round 131: the ceiling on a single attribute was 85, which quietly made the
   overall cap 85 too, because six attributes capped at 85 cannot average more
   than 85. His note was "there shouldn't be a cap on overalls. Like 99
   obviously, but when ur building ur player there shouldn't", so 99 it is. The
   plus eighteen is still there and still does the real work: it stops a 48
   overall academy kid from having one attribute at 99 and five at the floor. */
export function allocMax(ovr: number): number { return Math.min(99, ovr + 18); }

/** The stats a position can actually spend points on, with labels that say
    what the engine key DOES for that role. GK spends on all seven (weighted
    overall), outfielders on the six that make up their overall. */
export function allocRowsFor(position: string): AllocRow[] {
  if (position === "GK") return [
    { key: "reflexes", label: "Reflexes" },
    { key: "shooting", label: "Shot Stopping" },
    { key: "defending", label: "Positioning" },
    { key: "physical", label: "Aerial Command" },
    { key: "passing", label: "Distribution" },
    { key: "dribbling", label: "Penalty Saving" },
    { key: "pace", label: "Sweeping Speed" },
  ];
  if (["CB", "LB", "RB"].includes(position)) return [
    { key: "defending", label: "Tackling" },
    { key: "physical", label: "Strength" },
    { key: "pace", label: "Pace" },
    { key: "passing", label: "Passing" },
    { key: "shooting", label: "Heading" },
    { key: "dribbling", label: "Ball Control" },
  ];
  if (["CDM", "CM", "CAM"].includes(position)) return [
    { key: "passing", label: "Passing" },
    { key: "dribbling", label: "Dribbling" },
    { key: "shooting", label: "Long Shots" },
    { key: "defending", label: "Defending" },
    { key: "physical", label: "Stamina" },
    { key: "pace", label: "Pace" },
  ];
  return [
    { key: "shooting", label: "Finishing" },
    { key: "pace", label: "Pace" },
    { key: "dribbling", label: "Dribbling" },
    { key: "passing", label: "Playmaking" },
    { key: "defending", label: "Off The Ball" },
    { key: "physical", label: "Strength" },
  ];
}

/** EXACT mirror of soccerCareerEngine.calcOverall. Sim-asserted in lockstep. */
export function allocOverall(s: AllocStats, position: string): number {
  if (position === "GK") {
    return Math.round(s.reflexes * 0.3 + s.defending * 0.2 + s.physical * 0.2 + s.pace * 0.1 + s.passing * 0.1 + s.dribbling * 0.05 + s.shooting * 0.05);
  }
  return Math.round((s.pace + s.shooting + s.passing + s.dribbling + s.defending + s.physical) / 6);
}

/** Nudge a generated stat line so allocOverall lands EXACTLY on targetOvr,
    only touching that position's allocatable keys, respecting bounds. The
    creation screen runs this once before opening the build editor so the
    pool math starts clean. */
export function normalizeAllocation(stats: AllocStats, position: string, targetOvr: number): AllocStats {
  const s: AllocStats = { ...stats };
  const keys = allocRowsFor(position).map(r => r.key);
  const max = allocMax(targetOvr);
  for (const k of keys) s[k] = clamp(s[k], ALLOC_MIN, max);
  let guard = 0;
  while (allocOverall(s, position) !== targetOvr && guard < 400) {
    guard++;
    if (allocOverall(s, position) < targetOvr) {
      let bestK: AllocKey | null = null;
      for (const k of keys) if (s[k] < max && (bestK === null || s[k] > s[bestK])) bestK = k;
      if (bestK === null) break;
      s[bestK] += 1;
    } else {
      let bestK: AllocKey | null = null;
      for (const k of keys) if (s[k] > ALLOC_MIN && (bestK === null || s[k] > s[bestK])) bestK = k;
      if (bestK === null) break;
      s[bestK] -= 1;
    }
  }
  return s;
}

/* ─── Round 131: one place that decides what a legal allocation move is ───

   The build screen has three ways to change a number now: minus one, minus or
   plus five, and typing straight into the box. All three go through here, and
   so does the fuzz harness, which is the point: a rule that lives inside a
   React component can only ever be tested by driving a browser, and the thing
   that has to be true (you can never reach an illegal state, and you can never
   strand yourself unable to spend what you have left) is exactly the kind of
   thing you want to hit a hundred thousand times.

   The rule itself: never below the floor, never above this overall's per
   attribute cap, and never more than the points you actually have left. */
export function stepAllocation(
  alloc: AllocStats, position: string, key: AllocKey, next: number, budget: number, target: number,
): AllocStats {
  const rows = allocRowsFor(position);
  if (!rows.some(r => r.key === key)) return alloc;
  const cur = alloc[key];
  const spent = rows.reduce((a, r) => a + alloc[r.key], 0);
  const pool = budget - spent;
  const max = Math.min(allocMax(target), cur + Math.max(0, pool));
  const raw = Math.round(Number(next));
  if (!Number.isFinite(raw)) return alloc;
  const v = clamp(raw, ALLOC_MIN, max);
  if (v === cur) return alloc;
  return { ...alloc, [key]: v };
}

/** How many points are still waiting to be spent. Zero is the only state the
    build screen will let you leave with. */
export function allocationPool(alloc: AllocStats, position: string, budget: number): number {
  return budget - allocRowsFor(position).reduce((a, r) => a + alloc[r.key], 0);
}

/** Can this state still be spent all the way down to zero using nothing but
    legal moves? It always can, and the harness proves it rather than trusting
    it: the budget is the sum of a line that was itself clamped under the same
    cap, so there is always at least as much room across the row as there are
    points left over. */
export function canSettleAllocation(alloc: AllocStats, position: string, budget: number, target: number): boolean {
  const rows = allocRowsFor(position);
  let pool = allocationPool(alloc, position, budget);
  if (pool < 0) return false;
  const max = allocMax(target);
  let room = 0;
  for (const r of rows) room += Math.max(0, max - alloc[r.key]);
  return room >= pool;
}

/* ─── The "plays like" bank ───
   Style SHAPES, not ratings: each vector is [pace, shooting, passing,
   dribbling, defending, physical, reflexes] emphasis around that player's own
   average. We compare the shape of your build to the shape of theirs, so a 52
   overall kid can still "play like" a superstar. Names and playing styles are
   public sporting facts; no ratings are claimed as real. */
export interface PlaysLikeEntry { name: string; positions: string[]; shape: number[]; style: string }

export const PLAYS_LIKE_BANK: PlaysLikeEntry[] = [
  // Strikers
  { name: "Erling Haaland", positions: ["ST"], shape: [6, 10, -4, -2, -6, 9, 0], style: "Runs in behind and finishes everything, a physical monster" },
  { name: "Kylian Mbappé", positions: ["ST", "LW"], shape: [10, 8, 0, 7, -8, 0, 0], style: "Blistering pace, attacks space like nobody else" },
  { name: "Harry Kane", positions: ["ST"], shape: [-4, 9, 8, 1, -5, 3, 0], style: "Drops deep, passes like a 10, finishes like a 9" },
  { name: "Robert Lewandowski", positions: ["ST"], shape: [-2, 10, 2, 3, -6, 4, 0], style: "Pure box movement and clinical finishing" },
  { name: "Victor Osimhen", positions: ["ST"], shape: [8, 7, -5, 0, -7, 7, 0], style: "Relentless running and a leap defenders hate" },
  { name: "Ronaldo Nazário", positions: ["ST"], shape: [9, 9, -1, 8, -10, 1, 0], style: "90s icon, speed and skill nobody could stop" },
  // Left wingers
  { name: "Vinícius Júnior", positions: ["LW"], shape: [9, 4, 0, 10, -8, -2, 0], style: "Takes his man on every single time" },
  { name: "Rafael Leão", positions: ["LW"], shape: [8, 4, -1, 8, -7, 3, 0], style: "Gliding runs that start at the halfway line" },
  { name: "Son Heung-min", positions: ["LW", "ST"], shape: [7, 8, 1, 4, -7, -1, 0], style: "Two footed and ruthless on the break" },
  // Right wingers
  { name: "Lamine Yamal", positions: ["RW"], shape: [5, 5, 7, 10, -8, -5, 0], style: "Wand of a left foot, sees passes others don't" },
  { name: "Mohamed Salah", positions: ["RW"], shape: [8, 9, 2, 5, -7, -1, 0], style: "Cuts inside and scores 25 a season" },
  { name: "Bukayo Saka", positions: ["RW"], shape: [5, 5, 5, 6, -4, 0, 0], style: "Balanced winger with end product both ways" },
  { name: "Jérémy Doku", positions: ["RW", "LW"], shape: [10, -2, -1, 10, -8, 0, 0], style: "Pure chaos, dribbles at fullbacks all day" },
  // Attacking mids
  { name: "Kevin De Bruyne", positions: ["CAM", "CM"], shape: [1, 7, 10, 3, -6, 1, 0], style: "Whips the final pass nobody else even attempts" },
  { name: "Jude Bellingham", positions: ["CAM", "CM"], shape: [3, 6, 3, 5, 0, 7, 0], style: "Box to box force who arrives late to score" },
  { name: "Jamal Musiala", positions: ["CAM"], shape: [4, 2, 3, 10, -6, -3, 0], style: "Wriggles through packed boxes like they are open" },
  { name: "Martin Ødegaard", positions: ["CAM"], shape: [0, 3, 9, 6, -4, -3, 0], style: "Sets the tempo from the half spaces" },
  { name: "Zinédine Zidane", positions: ["CAM"], shape: [0, 3, 8, 10, -4, 2, 0], style: "2000s icon, velvet touch and total control" },
  // Central mids
  { name: "Pedri", positions: ["CM"], shape: [0, -2, 9, 8, -2, -3, 0], style: "Never loses it, always shows for the ball" },
  { name: "Federico Valverde", positions: ["CM"], shape: [7, 6, 2, 1, 2, 6, 0], style: "Engine of the team, thunderbolts from deep" },
  { name: "Luka Modrić", positions: ["CM"], shape: [-2, 1, 10, 7, -1, -4, 0], style: "Dictates every rhythm of the game" },
  { name: "Vitinha", positions: ["CM"], shape: [-1, 0, 9, 6, 0, -3, 0], style: "Press resistant metronome in tight spaces" },
  // Defensive mids
  { name: "Rodri", positions: ["CDM", "CM"], shape: [-3, 2, 8, 2, 6, 4, 0], style: "Controls the whole game from the base" },
  { name: "Declan Rice", positions: ["CDM"], shape: [2, 0, 2, 0, 8, 7, 0], style: "Screens the back four then carries it forward" },
  { name: "Aurélien Tchouaméni", positions: ["CDM"], shape: [1, 1, 2, -1, 7, 6, 0], style: "Wins duels and breaks up everything" },
  { name: "Claude Makélélé", positions: ["CDM"], shape: [1, -6, 2, 0, 10, 3, 0], style: "2000s icon, the position is named after him" },
  // Centre backs
  { name: "Virgil van Dijk", positions: ["CB"], shape: [4, -2, 4, 0, 10, 8, 0], style: "Reads everything, wins everything in the air" },
  { name: "William Saliba", positions: ["CB"], shape: [7, -5, 2, 2, 9, 4, 0], style: "Recovery pace and ice in his veins" },
  { name: "Rúben Dias", positions: ["CB"], shape: [-1, -4, 2, -1, 10, 6, 0], style: "Organizes the line and defends the box like a wall" },
  { name: "Paolo Maldini", positions: ["CB", "LB"], shape: [3, -4, 3, 1, 10, 3, 0], style: "90s icon, perfect positioning for 25 years" },
  // Fullbacks
  { name: "Trent Alexander-Arnold", positions: ["RB"], shape: [2, 2, 10, 2, -2, -2, 0], style: "Quarterback passing from right back" },
  { name: "Achraf Hakimi", positions: ["RB"], shape: [10, 2, 1, 3, 0, 2, 0], style: "Wingback rocket, up and down all game" },
  { name: "Cafu", positions: ["RB"], shape: [8, 0, 3, 3, 4, 4, 0], style: "90s icon who never stopped overlapping" },
  { name: "Théo Hernandez", positions: ["LB"], shape: [9, 2, 0, 3, 1, 5, 0], style: "Charges forward like a freight train" },
  { name: "Alphonso Davies", positions: ["LB"], shape: [10, -1, 0, 5, 1, 2, 0], style: "Fastest man on the pitch, twice a game" },
  // Goalkeepers
  { name: "Alisson", positions: ["GK"], shape: [2, 0, 4, 0, 6, 3, 8], style: "Complete keeper who wins the one on ones" },
  { name: "Thibaut Courtois", positions: ["GK"], shape: [0, 0, 0, 0, 4, 7, 9], style: "Giant frame, impossible to beat at full stretch" },
  { name: "Ederson", positions: ["GK"], shape: [3, 0, 10, 2, 1, 1, 3], style: "Plays like an eleventh outfielder" },
  { name: "Gianluigi Donnarumma", positions: ["GK"], shape: [-1, 0, -2, 1, 3, 5, 10], style: "Pure shot stopper for the big nights" },
  { name: "Emiliano Martínez", positions: ["GK"], shape: [0, 0, 1, 9, 3, 3, 6], style: "Penalty specialist who lives for the shootout" },
  { name: "Gianluigi Buffon", positions: ["GK"], shape: [0, 0, 1, 2, 7, 3, 9], style: "2000s icon, two decades of world class" },
];

/** Compare the SHAPE of a build to the bank and return the closest match.
    Cosine similarity over mean-centered vectors, position filtered. A
    perfectly flat build has no shape, which gets its own honest answer. */
export function playsLike(stats: AllocStats, position: string): { name: string; pct: number; style: string } {
  const pool = PLAYS_LIKE_BANK.filter(e => e.positions.includes(position));
  const keys: AllocKey[] = position === "GK"
    ? ["pace", "shooting", "passing", "dribbling", "defending", "physical", "reflexes"]
    : ["pace", "shooting", "passing", "dribbling", "defending", "physical"];
  const idxOf: Record<AllocKey, number> = { pace: 0, shooting: 1, passing: 2, dribbling: 3, defending: 4, physical: 5, reflexes: 6 };
  const mine = keys.map(k => stats[k]);
  const myMean = mine.reduce((a, b) => a + b, 0) / keys.length;
  const myVec = mine.map(v => v - myMean);
  const myMag = Math.sqrt(myVec.reduce((a, b) => a + b * b, 0));
  if (myMag < 0.9 || pool.length === 0) {
    return { name: "Nobody, honestly", pct: 0, style: "A perfectly flat build. Scouts have no comparison for you" };
  }
  let best = pool[0]; let bestCos = -2;
  for (const e of pool) {
    const theirs = keys.map(k => e.shape[idxOf[k]]);
    const thMean = theirs.reduce((a, b) => a + b, 0) / keys.length;
    const thVec = theirs.map(v => v - thMean);
    const thMag = Math.sqrt(thVec.reduce((a, b) => a + b * b, 0));
    if (thMag < 1e-6) continue;
    let dot = 0;
    for (let i = 0; i < keys.length; i++) dot += myVec[i] * thVec[i];
    const cos = dot / (myMag * thMag);
    if (cos > bestCos) { bestCos = cos; best = e; }
  }
  const pct = clamp(Math.round(bestCos * 100), 5, 98);
  return { name: best.name, pct, style: best.style };
}

/* ─── Round 80: the phone. An in-world phone as the life layer for Soccer Career.
   Texts arrive between seasons; how you reply moves your karma (0-100,
   starts 50) plus small morale/popularity/cash effects. Casual PG-13 tone,
   never em dashes (the sim harness lints the whole pool for them). ─── */

export interface PhoneChoiceDef {
  label: string;
  reply: string;      // what your player answers, shown in the thread
  karma: number;      // -12..+12
  morale?: number;
  popularity?: number;
  cash?: number;      // net worth delta in £m, can be negative
}

export interface PhoneTextDef {
  id: string;
  from: string;
  emoji: string;
  text: string;
  phase: "youth" | "pro" | "any";
  minAge?: number;
  maxAge?: number;
  choices: PhoneChoiceDef[];
}

export const PHONE_POOL: PhoneTextDef[] = [
  {
    id: "mum_call", from: "Mum", emoji: "❤️", phase: "any",
    text: "Hi love, haven't heard from you in weeks. Everything ok? Call me when you can.",
    choices: [
      { label: "Call her tonight", reply: "Calling you after training, promise. Love you", karma: 8, morale: 6 },
      { label: "Leave it on read", reply: "", karma: -6, morale: -2 },
    ],
  },
  {
    id: "kid_dm", from: "Fan DM", emoji: "🧒", phase: "any",
    text: "ur my favorite player ever. im in hospital and my dream is a signed shirt. no worries if not",
    choices: [
      { label: "Send a signed shirt and visit", reply: "Shirt is on the way and I'm coming to see you next week. Stay strong", karma: 12, popularity: 6, cash: -0.1 },
      { label: "Send the shirt", reply: "On its way little legend", karma: 6, popularity: 3 },
      { label: "Ignore it", reply: "", karma: -8 },
    ],
  },
  {
    id: "agent_boots", from: "Agent", emoji: "💼", phase: "any",
    text: "Boot deal on the table. Decent money but the brand got caught using sweatshops last year. Your call.",
    choices: [
      { label: "Take the money", reply: "Money is money. Send the contract", karma: -7, cash: 1.5 },
      { label: "Turn it down publicly", reply: "Not wearing that. And I'm saying why", karma: 9, popularity: 4 },
      { label: "Quietly decline", reply: "Pass on this one. Keep it quiet", karma: 4 },
    ],
  },
  {
    id: "teammate_benched", from: "Teammate", emoji: "😤", phase: "pro",
    text: "Gaffer benched me again bro. Thinking of asking away in January. You think I should go?",
    choices: [
      { label: "Be honest with him", reply: "You deserve minutes mate. If he won't give them, go get them somewhere", karma: 6, morale: 2 },
      { label: "Tell him to stop whining", reply: "Train harder then. Nobody owes you a shirt", karma: -5 },
      { label: "Dodge the question", reply: "Tough one bro. Sleep on it", karma: -1 },
    ],
  },
  {
    id: "granny_scam", from: "Unknown", emoji: "🎣", phase: "any",
    text: "CONGRATULATIONS! You won 2 MILLION. Just send account details plus a small release fee to claim.",
    choices: [
      { label: "Report and warn fans", reply: "Posting this so nobody falls for it. Stay safe out there", karma: 7, popularity: 3 },
      { label: "Delete it", reply: "", karma: 1 },
      { label: "Reply as a joke and string them along", reply: "Amazing news!! My account number is 1-2-3-GET-A-JOB", karma: 2, popularity: 2 },
    ],
  },
  {
    id: "kitman_fine", from: "Kit man", emoji: "🧺", phase: "pro",
    text: "You left the away kit at the hotel AGAIN. Club wants to fine you. I can cover for you this once.",
    choices: [
      { label: "Own it, pay the fine", reply: "My fault Tony. I'll pay it. Pint on me too", karma: 7, cash: -0.05 },
      { label: "Let him cover for you", reply: "You're a legend. I owe you", karma: -5, morale: 2 },
    ],
  },
  {
    id: "charity_gala", from: "Foundation", emoji: "🎗️", phase: "pro", minAge: 19,
    text: "We're hosting a children's hospital gala Friday. Would mean the world if you came. Press will be there.",
    choices: [
      { label: "Go and donate", reply: "Count me in. And put me down for a donation", karma: 10, popularity: 5, cash: -0.5 },
      { label: "Go for the cameras only", reply: "I'll swing by for an hour", karma: 2, popularity: 3 },
      { label: "Skip it", reply: "Can't make it, good luck", karma: -6 },
    ],
  },
  {
    id: "old_coach", from: "Youth coach", emoji: "👴", phase: "pro",
    text: "Watched you play last weekend. Still remember you at 12 refusing to pass. Proud of you kid.",
    choices: [
      { label: "Thank him properly", reply: "Everything started with you coach. Tickets for you whenever you want, for life", karma: 8, morale: 5 },
      { label: "Thumbs up emoji", reply: "👍", karma: -3 },
    ],
  },
  {
    id: "party_final", from: "Promoter", emoji: "🎉", phase: "pro", minAge: 18,
    text: "Biggest party of the year Saturday night. VIP table with your name on it. Cup final is Sunday btw.",
    choices: [
      { label: "Stay home and rest", reply: "Final tomorrow. Another time", karma: 6, morale: 2 },
      { label: "Go but leave early", reply: "One hour max, then I'm gone", karma: -3, popularity: 2 },
      { label: "Full send", reply: "Save me the good seat", karma: -9, popularity: 4, morale: 3 },
    ],
  },
  {
    id: "rookie_advice", from: "Academy kid", emoji: "🌱", phase: "pro", minAge: 21,
    text: "Just got promoted to first team training. Any advice? Kinda terrified honestly.",
    choices: [
      { label: "Take him under your wing", reply: "Come in early tomorrow, we'll do finishing drills together. You'll be fine", karma: 9, morale: 3 },
      { label: "One line of advice", reply: "First ball, first tackle, win it. Rest follows", karma: 4 },
      { label: "Big time him", reply: "Earn it like I did", karma: -7 },
    ],
  },
  {
    id: "journalist_leak", from: "Journalist", emoji: "📰", phase: "pro",
    text: "I know the dressing room fell out with the manager. Give me the inside story, I'll keep you anonymous.",
    choices: [
      { label: "Keep it in house", reply: "Nothing to tell. Dressing room stays in the dressing room", karma: 8, morale: 2 },
      { label: "Leak it", reply: "Ok but this NEVER came from me", karma: -10, popularity: 3 },
    ],
  },
  {
    id: "barber_cut", from: "Barber", emoji: "💈", phase: "any",
    text: "New style idea for you. Bold. Might break the internet, might get you fined by the boss. You in?",
    choices: [
      { label: "Send it", reply: "Chair. Tomorrow. Do your worst", karma: 2, popularity: 4 },
      { label: "Keep it classic", reply: "Usual trim mate, big game week", karma: 1 },
    ],
  },
  {
    id: "lost_wallet", from: "Groundskeeper", emoji: "👛", phase: "any",
    text: "Found a wallet in the car park with 800 quid inside. No ID. What do I do with it?",
    choices: [
      { label: "Hand it to reception", reply: "Reception, mate. Someone's having a bad day", karma: 6 },
      { label: "Finders keepers", reply: "That's the football gods paying you. Keep it", karma: -6 },
    ],
  },
  {
    id: "ex_club_message", from: "Old teammate", emoji: "🫂", phase: "pro", minAge: 22,
    text: "Club legends match at your first club next month. They're asking if you'd come back and play 45 minutes.",
    choices: [
      { label: "Play the full 90", reply: "45? I'm playing the whole thing. That badge made me", karma: 8, popularity: 4, morale: 3 },
      { label: "Politely decline", reply: "Season's too heavy, give everyone my love", karma: -2 },
    ],
  },
  {
    id: "crypto_bro", from: "School friend", emoji: "🪙", phase: "pro", minAge: 19,
    text: "Bro I need you to promote my new coin BallerCoin to your followers. It's guaranteed 100x. Family discount.",
    choices: [
      { label: "Hard pass", reply: "Not putting my fans into that. Look after yourself", karma: 7 },
      { label: "Promote it", reply: "Sending the post now. We better get rich", karma: -11, cash: 0.8, popularity: -3 },
    ],
  },
  {
    id: "training_extra", from: "Fitness coach", emoji: "🏋️", phase: "any",
    text: "Optional double sessions next month. Brutal but they work. Most of the squad is dodging them.",
    choices: [
      { label: "Sign up", reply: "Put my name down. First one in, last one out", karma: 5, morale: -2 },
      { label: "Skip them", reply: "Rest is part of training too coach", karma: -3, morale: 2 },
    ],
  },
  {
    id: "youth_bully", from: "Academy mate", emoji: "🥺", phase: "youth",
    text: "The older lads keep hiding my boots and binning my kit. Coach says toughen up. Don't know what to do.",
    choices: [
      { label: "Stand up for him", reply: "Sit with me at lunch. If they touch your stuff again they deal with me", karma: 10, morale: 2 },
      { label: "Stay out of it", reply: "Rough mate. Keep your head down", karma: -6 },
    ],
  },
  {
    id: "youth_homework", from: "Tutor", emoji: "📚", phase: "youth",
    text: "You've missed three sessions. The academy requires passing grades to keep your registration. Tonight, 6pm?",
    choices: [
      { label: "Show up", reply: "I'll be there. Sorry, no excuses", karma: 6 },
      { label: "Blow it off for extra shooting", reply: "Football is my exam", karma: -4 },
    ],
  },
  {
    id: "youth_poach", from: "Stranger", emoji: "🕶️", phase: "youth",
    text: "I represent players. Ditch the academy's advisor, sign with me quietly, I'll get your family paid NOW.",
    choices: [
      { label: "Tell the academy", reply: "Reported you to the club. Don't message me again", karma: 8 },
      { label: "Meet him in secret", reply: "Where and when?", karma: -8, cash: 0.05 },
    ],
  },
  {
    id: "nutrition_cheat", from: "Nutritionist", emoji: "🥗", phase: "any",
    text: "Your body fat crept up. I'm putting you on the strict plan. No takeaways for eight weeks. Confirm?",
    choices: [
      { label: "Commit fully", reply: "Locked in. Hide the menus", karma: 5, morale: -1 },
      { label: "Secret cheat days", reply: "Confirmed 😇 (orders kebab)", karma: -4, morale: 3 },
    ],
  },
  {
    id: "grandad_game", from: "Grandad", emoji: "🧓", phase: "any",
    text: "Never miss you on the telly. My hip's too dodgy for the stadium now. One day take the trophy round mine eh?",
    choices: [
      { label: "Visit with your shirt", reply: "Coming round Sunday with a shirt and biscuits. Put the kettle on", karma: 9, morale: 5 },
      { label: "Promise vaguely", reply: "One day grandad, promise", karma: 1 },
    ],
  },
  {
    id: "referee_apology", from: "Referee assoc.", emoji: "🟨", phase: "pro",
    text: "Your comments about Saturday's officiating went viral. We'd welcome a public clarification.",
    choices: [
      { label: "Apologize properly", reply: "I was out of order. Refs have the hardest job in football. Apologies", karma: 6, popularity: -1 },
      { label: "Double down", reply: "I said what I said", karma: -7, popularity: 5 },
    ],
  },
  {
    id: "stadium_worker", from: "Steward", emoji: "🦺", phase: "pro",
    text: "30 years at this club, retiring Saturday. Would you sign my hi-vis after the game? Means a lot.",
    choices: [
      { label: "Sign it and get the squad to", reply: "I'll get the whole squad on it. Thanks for everything", karma: 9, popularity: 3 },
      { label: "If there's time", reply: "If I can, busy day", karma: -2 },
    ],
  },
  {
    id: "diving_tip", from: "Veteran", emoji: "🎭", phase: "pro", maxAge: 24,
    text: "Kid, lesson one. In the box, feel contact, go down. Refs give it every time. That's how you win games.",
    choices: [
      { label: "Refuse to dive", reply: "I stay on my feet. I score them properly", karma: 8 },
      { label: "Take the advice", reply: "Noted. Whatever wins", karma: -8 },
    ],
  },
  {
    id: "hometown_pitch", from: "Council", emoji: "🏗️", phase: "pro", minAge: 20,
    text: "The pitch you grew up on is closing without funding. 200 kids play there weekly. Sponsorship would save it.",
    choices: [
      { label: "Fund it and rename it", reply: "I'll cover it. Name it after my old coach, not me", karma: 12, popularity: 5, cash: -1.2 },
      { label: "Fund it quietly", reply: "Invoice my foundation. No press", karma: 10, cash: -1.2 },
      { label: "Share a fundraiser", reply: "Posting the link, let's all chip in", karma: 4, popularity: 1 },
    ],
  },
  {
    id: "team_fine_pot", from: "Captain", emoji: "🍺", phase: "pro",
    text: "End of season squad night out, fines pot pays. You're 400 in the pot for late gym arrivals. Coming?",
    choices: [
      { label: "Pay up and go", reply: "Fair cop. First round's the fine pot anyway", karma: 4, morale: 4, cash: -0.01 },
      { label: "Dispute the fines", reply: "The gym clock is WRONG and I have evidence", karma: -3, morale: 1 },
    ],
  },
  {
    id: "kids_camp", from: "Community team", emoji: "⚽", phase: "any",
    text: "Summer kids camp needs a surprise guest coach for a morning. No fee, just chaos and juice boxes.",
    choices: [
      { label: "Do the full morning", reply: "I'm in. Someone else does the juice run though", karma: 8, popularity: 3, morale: 3 },
      { label: "Send signed balls instead", reply: "Can't make it, sending a box of signed balls", karma: 3 },
    ],
  },
  {
    id: "tax_scheme", from: "Financial advisor", emoji: "🏝️", phase: "pro", minAge: 21,
    text: "New structure for your image rights. Runs through three islands. Technically legal. Probably. Saves millions.",
    choices: [
      { label: "Keep it clean", reply: "Pay what I owe where I earn it. Not risking my name", karma: 8 },
      { label: "Do the scheme", reply: "If it's legal, file it", karma: -9, cash: 2.0 },
    ],
  },
  {
    id: "injury_teammate", from: "Teammate", emoji: "🏥", phase: "pro",
    text: "ACL gone. Nine months. Sitting in this hospital bed wondering if I'll ever be the same, honestly.",
    choices: [
      { label: "Visit weekly", reply: "I'm there every week bro. Rehab buddies. You're coming back stronger", karma: 10, morale: 2 },
      { label: "Send a message", reply: "Gutted for you. Speedy recovery brother", karma: 3 },
      { label: "Read it later", reply: "", karma: -6 },
    ],
  },
  {
    id: "boot_kid_swap", from: "Ballkid", emoji: "👟", phase: "pro",
    text: "You gave me your boots after the match!! My mum says I have to check you actually meant it??",
    choices: [
      { label: "Meant it, keep them", reply: "All yours. Score goals in them", karma: 7, popularity: 2 },
      { label: "Ask for them back", reply: "Actually those are my lucky pair... sorry kid", karma: -9, popularity: -3 },
    ],
  },
  {
    id: "podcast_invite", from: "Podcast", emoji: "🎙️", phase: "pro", minAge: 20,
    text: "Come on the show. Fans love unfiltered. We WILL ask about your manager, your rival and your contract.",
    choices: [
      { label: "Go and stay classy", reply: "I'll come on. Keeping club stuff in house though", karma: 5, popularity: 3 },
      { label: "Go and spill everything", reply: "Unfiltered? You'll get unfiltered", karma: -6, popularity: 6 },
      { label: "Decline", reply: "Not my thing, good luck with the show", karma: 1 },
    ],
  },
  {
    id: "penalty_gift", from: "Rival striker", emoji: "🤝", phase: "pro", minAge: 22,
    text: "You're one goal off the golden boot and we've got a dead rubber Sunday. Win a pen, I won't complain. Us strikers stick together.",
    choices: [
      { label: "Win it fair", reply: "If I get the boot I'm getting it properly. Respect though", karma: 7 },
      { label: "Take the free pen", reply: "Say less. Drinks on me if it lands", karma: -8 },
    ],
  },
  {
    id: "documentary", from: "Streaming service", emoji: "🎬", phase: "pro", minAge: 23,
    text: "All access documentary on your season. Big fee. Cameras everywhere including the bad days.",
    choices: [
      { label: "Do it honestly", reply: "Deal, but you show the real thing, not a highlight reel", karma: 5, popularity: 6, cash: 1.0 },
      { label: "Decline", reply: "Dressing room stays sacred. Pass", karma: 3 },
    ],
  },
  {
    id: "matchday_nerves", from: "Sports psych", emoji: "🧠", phase: "any",
    text: "Noticed you've been quiet before big games. My door is open Thursday if you want to talk it through.",
    choices: [
      { label: "Book the session", reply: "Thursday works. Cheers doc", karma: 5, morale: 5 },
      { label: "Tough it out", reply: "I'm fine. Just focused", karma: -2 },
    ],
  },
  {
    id: "old_boots_museum", from: "Club museum", emoji: "🏛️", phase: "pro", minAge: 26,
    text: "We'd love your debut boots for the club museum display. Fans keep asking about you.",
    choices: [
      { label: "Donate with a note", reply: "They're yours. I'll write the story that goes with them", karma: 6, popularity: 3 },
      { label: "Keep them", reply: "Those stay with me forever, sorry", karma: 0 },
    ],
  },
];

/** Pick up to `count` unseen texts that fit the player's age and phase. */
export function pickPhoneTexts(age: number, phase: "youth" | "pro", usedIds: string[], count: number): PhoneTextDef[] {
  const used = new Set(usedIds);
  const fits = PHONE_POOL.filter(t =>
    !used.has(t.id) &&
    (t.phase === "any" || t.phase === phase) &&
    (t.minAge === undefined || age >= t.minAge) &&
    (t.maxAge === undefined || age <= t.maxAge)
  );
  const out: PhoneTextDef[] = [];
  const pool = [...fits];
  while (out.length < count && pool.length > 0) {
    const i = Math.floor(Math.random() * pool.length);
    out.push(pool[i]);
    pool.splice(i, 1);
  }
  return out;
}

/** Karma meter copy for the phone status bar and Life app. */
export function karmaTier(karma: number): { label: string; color: string; emoji: string } {
  if (karma >= 80) return { label: "Fan favorite", color: "text-emerald-400", emoji: "😇" };
  if (karma >= 60) return { label: "Good egg", color: "text-sky-400", emoji: "🙂" };
  if (karma >= 40) return { label: "Neutral", color: "text-muted-foreground", emoji: "😐" };
  if (karma >= 20) return { label: "Villain era", color: "text-amber-400", emoji: "😈" };
  return { label: "Public enemy", color: "text-red-400", emoji: "🔥" };
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
