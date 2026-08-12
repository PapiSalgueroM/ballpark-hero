/**
 * MLB Higher/Lower pool, career HOME RUNS, baked from lahman_batting joined
 * to lahman_people (playerid -> name) on 2026-07-22.
 *
 * The Lahman copy in this DB ends at 2021, so the pool admits only careers
 * finished by 2019, otherwise active players' totals would be presented as
 * career numbers while silently truncated (Pujols would read 679, not 703).
 * That makes this an all-time-legends pool by construction, which suits the
 * stat: every era from Ruth to Ortiz is here and HR counts compare across all
 * of them.
 *
 * Verified canonical: Bonds 762, Aaron 755, Ruth 714, A-Rod 696, Mays 660,
 * Griffey Jr. 630, Ted Williams 521, Gehrig 493, Ripken 431.
 * ("Ken Griffey" in Lahman is ambiguous with his father, displayed as Jr.;
 * the 630 row is unambiguously Junior's.)
 */
export interface MlbHLPlayer {
  name: string;
  careerHrs: number;
  firstSeason: number;
  lastSeason: number;
  seasons: number;
}

export const mlbHLPlayers: MlbHLPlayer[] = [
  { name: 'Barry Bonds', careerHrs: 762, firstSeason: 1986, lastSeason: 2007, seasons: 22 },
  { name: 'Hank Aaron', careerHrs: 755, firstSeason: 1954, lastSeason: 1976, seasons: 23 },
  { name: 'Babe Ruth', careerHrs: 714, firstSeason: 1914, lastSeason: 1935, seasons: 22 },
  { name: 'Alex Rodriguez', careerHrs: 696, firstSeason: 1994, lastSeason: 2016, seasons: 22 },
  { name: 'Willie Mays', careerHrs: 660, firstSeason: 1951, lastSeason: 1973, seasons: 22 },
  { name: 'Ken Griffey Jr.', careerHrs: 630, firstSeason: 1989, lastSeason: 2010, seasons: 22 },
  { name: 'Jim Thome', careerHrs: 612, firstSeason: 1991, lastSeason: 2012, seasons: 22 },
  { name: 'Sammy Sosa', careerHrs: 609, firstSeason: 1989, lastSeason: 2007, seasons: 18 },
  { name: 'Frank Robinson', careerHrs: 586, firstSeason: 1956, lastSeason: 1976, seasons: 21 },
  { name: 'Mark McGwire', careerHrs: 583, firstSeason: 1986, lastSeason: 2001, seasons: 16 },
  { name: 'Harmon Killebrew', careerHrs: 573, firstSeason: 1954, lastSeason: 1975, seasons: 22 },
  { name: 'Rafael Palmeiro', careerHrs: 569, firstSeason: 1986, lastSeason: 2005, seasons: 20 },
  { name: 'Reggie Jackson', careerHrs: 563, firstSeason: 1967, lastSeason: 1987, seasons: 21 },
  { name: 'Manny Ramirez', careerHrs: 555, firstSeason: 1993, lastSeason: 2011, seasons: 19 },
  { name: 'Mike Schmidt', careerHrs: 548, firstSeason: 1972, lastSeason: 1989, seasons: 18 },
  { name: 'David Ortiz', careerHrs: 541, firstSeason: 1997, lastSeason: 2016, seasons: 20 },
  { name: 'Mickey Mantle', careerHrs: 536, firstSeason: 1951, lastSeason: 1968, seasons: 18 },
  { name: 'Jimmie Foxx', careerHrs: 534, firstSeason: 1925, lastSeason: 1945, seasons: 20 },
  { name: 'Willie McCovey', careerHrs: 521, firstSeason: 1959, lastSeason: 1980, seasons: 22 },
  { name: 'Ted Williams', careerHrs: 521, firstSeason: 1939, lastSeason: 1960, seasons: 19 },
  { name: 'Frank Thomas', careerHrs: 521, firstSeason: 1990, lastSeason: 2008, seasons: 19 },
  { name: 'Ernie Banks', careerHrs: 512, firstSeason: 1953, lastSeason: 1971, seasons: 19 },
  { name: 'Eddie Mathews', careerHrs: 512, firstSeason: 1952, lastSeason: 1968, seasons: 17 },
  { name: 'Mel Ott', careerHrs: 511, firstSeason: 1926, lastSeason: 1947, seasons: 22 },
  { name: 'Gary Sheffield', careerHrs: 509, firstSeason: 1988, lastSeason: 2009, seasons: 22 },
  { name: 'Eddie Murray', careerHrs: 504, firstSeason: 1977, lastSeason: 1997, seasons: 21 },
  { name: 'Fred McGriff', careerHrs: 493, firstSeason: 1986, lastSeason: 2004, seasons: 19 },
  { name: 'Lou Gehrig', careerHrs: 493, firstSeason: 1923, lastSeason: 1939, seasons: 17 },
  { name: 'Adrian Beltre', careerHrs: 477, firstSeason: 1998, lastSeason: 2018, seasons: 21 },
  { name: 'Stan Musial', careerHrs: 475, firstSeason: 1941, lastSeason: 1963, seasons: 22 },
  { name: 'Willie Stargell', careerHrs: 475, firstSeason: 1962, lastSeason: 1982, seasons: 21 },
  { name: 'Carlos Delgado', careerHrs: 473, firstSeason: 1993, lastSeason: 2009, seasons: 17 },
  { name: 'Chipper Jones', careerHrs: 468, firstSeason: 1993, lastSeason: 2012, seasons: 19 },
  { name: 'Dave Winfield', careerHrs: 465, firstSeason: 1973, lastSeason: 1995, seasons: 22 },
  { name: 'Jose Canseco', careerHrs: 462, firstSeason: 1985, lastSeason: 2001, seasons: 17 },
  { name: 'Adam Dunn', careerHrs: 462, firstSeason: 2001, lastSeason: 2014, seasons: 14 },
  { name: 'Carl Yastrzemski', careerHrs: 452, firstSeason: 1961, lastSeason: 1983, seasons: 23 },
  { name: 'Jeff Bagwell', careerHrs: 449, firstSeason: 1991, lastSeason: 2005, seasons: 15 },
  { name: 'Vladimir Guerrero', careerHrs: 449, firstSeason: 1996, lastSeason: 2011, seasons: 16 },
  { name: 'Dave Kingman', careerHrs: 442, firstSeason: 1971, lastSeason: 1986, seasons: 16 },
  { name: 'Jason Giambi', careerHrs: 440, firstSeason: 1995, lastSeason: 2014, seasons: 20 },
  { name: 'Paul Konerko', careerHrs: 439, firstSeason: 1997, lastSeason: 2014, seasons: 18 },
  { name: 'Andre Dawson', careerHrs: 438, firstSeason: 1976, lastSeason: 1996, seasons: 21 },
  { name: 'Carlos Beltran', careerHrs: 435, firstSeason: 1998, lastSeason: 2017, seasons: 20 },
  { name: 'Juan Gonzalez', careerHrs: 434, firstSeason: 1989, lastSeason: 2005, seasons: 17 },
  { name: 'Andruw Jones', careerHrs: 434, firstSeason: 1996, lastSeason: 2012, seasons: 17 },
  { name: 'Cal Ripken Jr.', careerHrs: 431, firstSeason: 1981, lastSeason: 2001, seasons: 21 },
  { name: 'Mike Piazza', careerHrs: 427, firstSeason: 1992, lastSeason: 2007, seasons: 16 },
  { name: 'Billy Williams', careerHrs: 426, firstSeason: 1959, lastSeason: 1976, seasons: 18 },
  { name: 'Darrell Evans', careerHrs: 414, firstSeason: 1969, lastSeason: 1989, seasons: 21 },
  { name: 'Alfonso Soriano', careerHrs: 412, firstSeason: 1999, lastSeason: 2014, seasons: 16 },
  { name: 'Mark Teixeira', careerHrs: 409, firstSeason: 2003, lastSeason: 2016, seasons: 14 },
  { name: 'Duke Snider', careerHrs: 407, firstSeason: 1947, lastSeason: 1964, seasons: 18 },
  { name: 'Andres Galarraga', careerHrs: 399, firstSeason: 1985, lastSeason: 2004, seasons: 19 },
  { name: 'Al Kaline', careerHrs: 399, firstSeason: 1953, lastSeason: 1974, seasons: 22 },
];
