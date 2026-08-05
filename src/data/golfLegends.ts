/**
 * Men's major champions with 2+ majors, aggregated from public.golf_majors
 * (rank=1 rows, 2026-08-05). Counts are career MAJOR wins; tournaments lists
 * which of the four majors the player has won at least once. Era years are
 * first and last major win. Source of truth is the DB; regenerate with:
 *   select player_name, count(*), min(year), max(year), max(nationality),
 *          string_agg(distinct tournament, '|')
 *   from golf_majors where rank=1 or rank is null group by player_name;
 */
export interface GolfLegend {
  name: string;
  majors: number;
  firstWin: number;
  lastWin: number;
  nationality: string;
  tournaments: string[];
}

const M = 'Masters';
const P = 'PGA Championship';
const O = 'The Open';
const U = 'U.S. Open';

export const golfLegends: GolfLegend[] = [
  { name: 'Jack Nicklaus', majors: 18, firstWin: 1962, lastWin: 1986, nationality: 'United States', tournaments: [M, P, O, U] },
  { name: 'Tiger Woods', majors: 15, firstWin: 1997, lastWin: 2019, nationality: 'United States', tournaments: [M, P, O, U] },
  { name: 'Walter Hagen', majors: 11, firstWin: 1914, lastWin: 1929, nationality: 'United States', tournaments: [P, O, U] },
  { name: 'Gary Player', majors: 9, firstWin: 1959, lastWin: 1978, nationality: 'South Africa', tournaments: [M, P, O, U] },
  { name: 'Ben Hogan', majors: 9, firstWin: 1946, lastWin: 1953, nationality: 'United States', tournaments: [M, P, O, U] },
  { name: 'Tom Watson', majors: 8, firstWin: 1975, lastWin: 1983, nationality: 'United States', tournaments: [M, O, U] },
  { name: 'Arnold Palmer', majors: 7, firstWin: 1958, lastWin: 1964, nationality: 'United States', tournaments: [M, O, U] },
  { name: 'Sam Snead', majors: 7, firstWin: 1942, lastWin: 1954, nationality: 'United States', tournaments: [M, P, O] },
  { name: 'Gene Sarazen', majors: 7, firstWin: 1922, lastWin: 1935, nationality: 'United States', tournaments: [M, P, O, U] },
  { name: 'Harry Vardon', majors: 7, firstWin: 1896, lastWin: 1914, nationality: 'Jersey', tournaments: [O, U] },
  { name: 'Rory McIlroy', majors: 6, firstWin: 2011, lastWin: 2026, nationality: 'Northern Ireland', tournaments: [M, P, O, U] },
  { name: 'Phil Mickelson', majors: 6, firstWin: 2004, lastWin: 2021, nationality: 'United States', tournaments: [M, P, O] },
  { name: 'Nick Faldo', majors: 6, firstWin: 1987, lastWin: 1996, nationality: 'England', tournaments: [M, O] },
  { name: 'Lee Trevino', majors: 6, firstWin: 1968, lastWin: 1984, nationality: 'United States', tournaments: [P, O, U] },
  { name: 'Brooks Koepka', majors: 5, firstWin: 2017, lastWin: 2023, nationality: 'United States', tournaments: [P, U] },
  { name: 'Seve Ballesteros', majors: 5, firstWin: 1979, lastWin: 1988, nationality: 'Spain', tournaments: [M, O] },
  { name: 'Peter Thomson', majors: 5, firstWin: 1954, lastWin: 1965, nationality: 'Australia', tournaments: [O] },
  { name: 'Byron Nelson', majors: 5, firstWin: 1937, lastWin: 1945, nationality: 'United States', tournaments: [M, P, U] },
  { name: 'Bobby Jones', majors: 5, firstWin: 1926, lastWin: 1930, nationality: 'United States', tournaments: [O, U] },
  { name: 'John Henry Taylor', majors: 5, firstWin: 1894, lastWin: 1913, nationality: 'England', tournaments: [O] },
  { name: 'James Braid', majors: 5, firstWin: 1901, lastWin: 1910, nationality: 'Scotland', tournaments: [O] },
  { name: 'Scottie Scheffler', majors: 4, firstWin: 2022, lastWin: 2025, nationality: 'United States', tournaments: [M, P, O] },
  { name: 'Ernie Els', majors: 4, firstWin: 1994, lastWin: 2012, nationality: 'South Africa', tournaments: [O, U] },
  { name: 'Raymond Floyd', majors: 4, firstWin: 1969, lastWin: 1986, nationality: 'United States', tournaments: [M, P, U] },
  { name: 'Bobby Locke', majors: 4, firstWin: 1949, lastWin: 1957, nationality: 'South Africa', tournaments: [O] },
  { name: 'Jim Barnes', majors: 4, firstWin: 1916, lastWin: 1925, nationality: 'England', tournaments: [P, O, U] },
  { name: 'Willie Anderson', majors: 4, firstWin: 1901, lastWin: 1905, nationality: 'Scotland', tournaments: [U] },
  { name: 'Tom Morris Jr.', majors: 4, firstWin: 1868, lastWin: 1872, nationality: 'Scotland', tournaments: [O] },
  { name: 'Tom Morris Sr.', majors: 4, firstWin: 1861, lastWin: 1867, nationality: 'Scotland', tournaments: [O] },
  { name: 'Jordan Spieth', majors: 3, firstWin: 2015, lastWin: 2017, nationality: 'United States', tournaments: [M, O, U] },
  { name: 'Padraig Harrington', majors: 3, firstWin: 2007, lastWin: 2008, nationality: 'Republic of Ireland', tournaments: [P, O] },
  { name: 'Vijay Singh', majors: 3, firstWin: 1998, lastWin: 2004, nationality: 'Fiji', tournaments: [M, P] },
  { name: 'Payne Stewart', majors: 3, firstWin: 1989, lastWin: 1999, nationality: 'United States', tournaments: [P, U] },
  { name: 'Nick Price', majors: 3, firstWin: 1992, lastWin: 1994, nationality: 'Zimbabwe', tournaments: [P, O] },
  { name: 'Hale Irwin', majors: 3, firstWin: 1974, lastWin: 1990, nationality: 'United States', tournaments: [U] },
  { name: 'Larry Nelson', majors: 3, firstWin: 1981, lastWin: 1987, nationality: 'United States', tournaments: [P, U] },
  { name: 'Billy Casper', majors: 3, firstWin: 1959, lastWin: 1970, nationality: 'United States', tournaments: [M, U] },
  { name: 'Julius Boros', majors: 3, firstWin: 1952, lastWin: 1968, nationality: 'United States', tournaments: [P, U] },
  { name: 'Cary Middlecoff', majors: 3, firstWin: 1949, lastWin: 1956, nationality: 'United States', tournaments: [M, U] },
  { name: 'Jimmy Demaret', majors: 3, firstWin: 1940, lastWin: 1950, nationality: 'United States', tournaments: [M] },
  { name: 'Henry Cotton', majors: 3, firstWin: 1934, lastWin: 1948, nationality: 'England', tournaments: [O] },
  { name: 'Tommy Armour', majors: 3, firstWin: 1927, lastWin: 1931, nationality: 'United States', tournaments: [P, O, U] },
  { name: 'Xander Schauffele', majors: 2, firstWin: 2024, lastWin: 2024, nationality: 'United States', tournaments: [P, O] },
  { name: 'Bryson DeChambeau', majors: 2, firstWin: 2020, lastWin: 2024, nationality: 'United States', tournaments: [U] },
  { name: 'Jon Rahm', majors: 2, firstWin: 2021, lastWin: 2023, nationality: 'Spain', tournaments: [M, U] },
  { name: 'Justin Thomas', majors: 2, firstWin: 2017, lastWin: 2022, nationality: 'United States', tournaments: [P] },
  { name: 'Collin Morikawa', majors: 2, firstWin: 2020, lastWin: 2021, nationality: 'United States', tournaments: [P, O] },
  { name: 'Dustin Johnson', majors: 2, firstWin: 2016, lastWin: 2020, nationality: 'United States', tournaments: [M, U] },
  { name: 'Zach Johnson', majors: 2, firstWin: 2007, lastWin: 2015, nationality: 'United States', tournaments: [M, O] },
  { name: 'Bubba Watson', majors: 2, firstWin: 2012, lastWin: 2014, nationality: 'United States', tournaments: [M] },
  { name: 'Martin Kaymer', majors: 2, firstWin: 2010, lastWin: 2014, nationality: 'Germany', tournaments: [P, U] },
  { name: 'Angel Cabrera', majors: 2, firstWin: 2007, lastWin: 2009, nationality: 'Argentina', tournaments: [M, U] },
  { name: 'Retief Goosen', majors: 2, firstWin: 2001, lastWin: 2004, nationality: 'South Africa', tournaments: [U] },
  { name: 'Jose Maria Olazabal', majors: 2, firstWin: 1994, lastWin: 1999, nationality: 'Spain', tournaments: [M] },
  { name: "Mark O'Meara", majors: 2, firstWin: 1998, lastWin: 1998, nationality: 'United States', tournaments: [M, O] },
  { name: 'John Daly', majors: 2, firstWin: 1991, lastWin: 1995, nationality: 'United States', tournaments: [P, O] },
  { name: 'Ben Crenshaw', majors: 2, firstWin: 1984, lastWin: 1995, nationality: 'United States', tournaments: [M] },
  { name: 'Bernhard Langer', majors: 2, firstWin: 1985, lastWin: 1993, nationality: 'Germany', tournaments: [M] },
  { name: 'Greg Norman', majors: 2, firstWin: 1986, lastWin: 1993, nationality: 'Australia', tournaments: [O] },
  { name: 'Curtis Strange', majors: 2, firstWin: 1988, lastWin: 1989, nationality: 'United States', tournaments: [U] },
  { name: 'Sandy Lyle', majors: 2, firstWin: 1985, lastWin: 1988, nationality: 'Scotland', tournaments: [M, O] },
];

/** Modern-and-famous slice used for daily answers so casual fans have a shot. */
export const guessableGolfers: GolfLegend[] = golfLegends.filter(
  (g) => g.majors >= 4 || g.lastWin >= 1980,
);
