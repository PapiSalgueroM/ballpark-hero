/**
 * F1 Higher/Lower pool, career GRAND PRIX WINS, baked from f1_driver_standings
 * (sum of per-season wins by stable driver_id) on 2026-07-22.
 *
 * Wins, not points: points systems changed massively across eras (a 1950s
 * season awarded ~8 for a win vs 25 today), so career points make every older
 * driver auto-low and the game guessable. Wins compare across eras.
 *
 * Verified against canonical records: Hamilton 105, Schumacher 91, Vettel 53,
 * Prost 51, Senna 41, Mansell 31, Stewart 27, Fangio 24, Moss 16, Ascari 13.
 * driver_name was verified 0% bad by the 2026-07-15 audit_name_columns() scan.
 * Pool = every driver with 8+ wins (42 drivers, 1950s through 2025).
 */
export interface F1HLDriver {
  name: string;
  careerWins: number;
  titles: number;
  constructors: string;
  firstSeason: number;
  lastSeason: number;
}

export const f1HLDrivers: F1HLDriver[] = [
  { name: 'Lewis Hamilton', careerWins: 105, titles: 7, constructors: 'McLaren, Mercedes, Ferrari', firstSeason: 2007, lastSeason: 2025 },
  { name: 'Michael Schumacher', careerWins: 91, titles: 7, constructors: 'Benetton, Ferrari, Mercedes', firstSeason: 1991, lastSeason: 2012 },
  { name: 'Max Verstappen', careerWins: 71, titles: 4, constructors: 'Toro Rosso, Red Bull', firstSeason: 2015, lastSeason: 2025 },
  { name: 'Sebastian Vettel', careerWins: 53, titles: 4, constructors: 'Red Bull, Ferrari, Aston Martin', firstSeason: 2007, lastSeason: 2022 },
  { name: 'Alain Prost', careerWins: 51, titles: 4, constructors: 'McLaren, Renault, Ferrari, Williams', firstSeason: 1980, lastSeason: 1993 },
  { name: 'Ayrton Senna', careerWins: 41, titles: 3, constructors: 'Toleman, Lotus, McLaren, Williams', firstSeason: 1984, lastSeason: 1994 },
  { name: 'Fernando Alonso', careerWins: 32, titles: 2, constructors: 'Renault, Ferrari, McLaren, Aston Martin', firstSeason: 2001, lastSeason: 2025 },
  { name: 'Nigel Mansell', careerWins: 31, titles: 1, constructors: 'Lotus, Williams, Ferrari, McLaren', firstSeason: 1980, lastSeason: 1995 },
  { name: 'Jackie Stewart', careerWins: 27, titles: 3, constructors: 'BRM, Matra, Tyrrell', firstSeason: 1965, lastSeason: 1973 },
  { name: 'Niki Lauda', careerWins: 25, titles: 3, constructors: 'BRM, Ferrari, Brabham, McLaren', firstSeason: 1971, lastSeason: 1985 },
  { name: 'Jim Clark', careerWins: 25, titles: 2, constructors: 'Lotus', firstSeason: 1960, lastSeason: 1968 },
  { name: 'Juan Manuel Fangio', careerWins: 24, titles: 5, constructors: 'Alfa Romeo, Maserati, Mercedes, Ferrari', firstSeason: 1950, lastSeason: 1958 },
  { name: 'Nelson Piquet', careerWins: 23, titles: 3, constructors: 'Brabham, Williams, Benetton', firstSeason: 1978, lastSeason: 1991 },
  { name: 'Nico Rosberg', careerWins: 23, titles: 1, constructors: 'Williams, Mercedes', firstSeason: 2006, lastSeason: 2016 },
  { name: 'Damon Hill', careerWins: 22, titles: 1, constructors: 'Brabham, Williams, Arrows, Jordan', firstSeason: 1992, lastSeason: 1999 },
  { name: 'Kimi Räikkönen', careerWins: 21, titles: 1, constructors: 'Sauber, McLaren, Ferrari, Alfa Romeo', firstSeason: 2001, lastSeason: 2021 },
  { name: 'Mika Häkkinen', careerWins: 20, titles: 2, constructors: 'Lotus, McLaren', firstSeason: 1991, lastSeason: 2001 },
  { name: 'Stirling Moss', careerWins: 16, titles: 0, constructors: 'HWM, Maserati, Mercedes, Cooper', firstSeason: 1951, lastSeason: 1961 },
  { name: 'Jenson Button', careerWins: 15, titles: 1, constructors: 'BAR, Honda, Brawn, McLaren', firstSeason: 2000, lastSeason: 2017 },
  { name: 'Emerson Fittipaldi', careerWins: 14, titles: 2, constructors: 'Lotus, McLaren, Fittipaldi', firstSeason: 1970, lastSeason: 1980 },
  { name: 'Graham Hill', careerWins: 14, titles: 2, constructors: 'Lotus, BRM, Brabham', firstSeason: 1958, lastSeason: 1975 },
  { name: 'Jack Brabham', careerWins: 14, titles: 3, constructors: 'Cooper, Brabham', firstSeason: 1955, lastSeason: 1970 },
  { name: 'Alberto Ascari', careerWins: 13, titles: 2, constructors: 'Ferrari, Maserati, Lancia', firstSeason: 1950, lastSeason: 1955 },
  { name: 'David Coulthard', careerWins: 13, titles: 0, constructors: 'Williams, McLaren, Red Bull', firstSeason: 1994, lastSeason: 2008 },
  { name: 'Alan Jones', careerWins: 12, titles: 1, constructors: 'Hesketh, Shadow, Williams, Arrows', firstSeason: 1975, lastSeason: 1986 },
  { name: 'Mario Andretti', careerWins: 12, titles: 1, constructors: 'Lotus, Ferrari, Alfa Romeo', firstSeason: 1968, lastSeason: 1982 },
  { name: 'Carlos Reutemann', careerWins: 12, titles: 0, constructors: 'Brabham, Ferrari, Lotus, Williams', firstSeason: 1972, lastSeason: 1982 },
  { name: 'Felipe Massa', careerWins: 11, titles: 0, constructors: 'Sauber, Ferrari, Williams', firstSeason: 2002, lastSeason: 2017 },
  { name: 'Jacques Villeneuve', careerWins: 11, titles: 1, constructors: 'Williams, BAR, Renault, Sauber', firstSeason: 1996, lastSeason: 2006 },
  { name: 'Rubens Barrichello', careerWins: 11, titles: 0, constructors: 'Jordan, Ferrari, Honda, Brawn', firstSeason: 1993, lastSeason: 2011 },
  { name: 'Lando Norris', careerWins: 11, titles: 1, constructors: 'McLaren', firstSeason: 2019, lastSeason: 2025 },
  { name: 'Gerhard Berger', careerWins: 10, titles: 0, constructors: 'ATS, Benetton, Ferrari, McLaren', firstSeason: 1984, lastSeason: 1997 },
  { name: 'James Hunt', careerWins: 10, titles: 1, constructors: 'Hesketh, McLaren, Wolf', firstSeason: 1973, lastSeason: 1979 },
  { name: 'Ronnie Peterson', careerWins: 10, titles: 0, constructors: 'March, Lotus, Tyrrell', firstSeason: 1970, lastSeason: 1978 },
  { name: 'Valtteri Bottas', careerWins: 10, titles: 0, constructors: 'Williams, Mercedes, Alfa Romeo, Sauber', firstSeason: 2013, lastSeason: 2024 },
  { name: 'Jody Scheckter', careerWins: 10, titles: 1, constructors: 'McLaren, Tyrrell, Wolf, Ferrari', firstSeason: 1972, lastSeason: 1980 },
  { name: 'Oscar Piastri', careerWins: 9, titles: 0, constructors: 'McLaren', firstSeason: 2023, lastSeason: 2025 },
  { name: 'Mark Webber', careerWins: 9, titles: 0, constructors: 'Minardi, Jaguar, Williams, Red Bull', firstSeason: 2002, lastSeason: 2013 },
  { name: 'Denny Hulme', careerWins: 8, titles: 1, constructors: 'Brabham, McLaren', firstSeason: 1965, lastSeason: 1974 },
  { name: 'Jacky Ickx', careerWins: 8, titles: 0, constructors: 'Ferrari, Brabham, Lotus, Ligier', firstSeason: 1967, lastSeason: 1979 },
  { name: 'Daniel Ricciardo', careerWins: 8, titles: 0, constructors: 'HRT, Red Bull, Renault, McLaren', firstSeason: 2011, lastSeason: 2024 },
  { name: 'Charles Leclerc', careerWins: 8, titles: 0, constructors: 'Sauber, Ferrari', firstSeason: 2018, lastSeason: 2025 },
];
