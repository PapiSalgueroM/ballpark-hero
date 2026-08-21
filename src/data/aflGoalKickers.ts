/**
 * VFL/AFL career goal kicking leaders, RETIRED players only, so no total
 * can ever go stale. Two-source verified 2026-08-20: the aflonline.com.au
 * all-time leading goalkickers table cross-checked against the well
 * documented career records (Lockett 1,360 is the all-time record,
 * Coventry 1,299, Dunstall 1,254, Franklin 1,066, Ablett Sr 1,031). Four
 * still-active players on the source list (Jeremy Cameron, Taylor Walker,
 * Jack Gunston, Jack Darling) and one 2025 finisher were deliberately
 * left out: an active man's total moves, and this site does not ship
 * numbers that quietly go wrong.
 *
 * The game built on this is the site's first Australian rules content.
 * The analytics case: Australia is the number two country at 3,551 visits
 * a month (31-day Lovable pull, 2026-08-20) and the menu had nothing for
 * them.
 */
export interface AflGoalKicker {
  name: string;
  goals: number;
  clubs: string;
  firstYear: number;
  lastYear: number;
}

export const aflGoalKickers: AflGoalKicker[] = [
  { name: 'Tony Lockett', goals: 1360, clubs: 'St Kilda & Sydney', firstYear: 1983, lastYear: 2002 },
  { name: 'Gordon Coventry', goals: 1299, clubs: 'Collingwood', firstYear: 1920, lastYear: 1937 },
  { name: 'Jason Dunstall', goals: 1254, clubs: 'Hawthorn', firstYear: 1985, lastYear: 1998 },
  { name: 'Lance Franklin', goals: 1066, clubs: 'Hawthorn & Sydney', firstYear: 2005, lastYear: 2023 },
  { name: 'Doug Wade', goals: 1057, clubs: 'Geelong & North Melbourne', firstYear: 1961, lastYear: 1975 },
  { name: 'Gary Ablett Sr', goals: 1031, clubs: 'Hawthorn & Geelong', firstYear: 1982, lastYear: 1996 },
  { name: 'Jack Titus', goals: 970, clubs: 'Richmond', firstYear: 1926, lastYear: 1943 },
  { name: 'Matthew Lloyd', goals: 926, clubs: 'Essendon', firstYear: 1995, lastYear: 2009 },
  { name: 'Leigh Matthews', goals: 915, clubs: 'Hawthorn', firstYear: 1969, lastYear: 1985 },
  { name: 'Peter McKenna', goals: 874, clubs: 'Collingwood & Carlton', firstYear: 1965, lastYear: 1977 },
  { name: 'Bernie Quinlan', goals: 817, clubs: 'Footscray & Fitzroy', firstYear: 1969, lastYear: 1986 },
  { name: 'Matthew Richardson', goals: 800, clubs: 'Richmond', firstYear: 1993, lastYear: 2009 },
  { name: 'Tom Hawkins', goals: 796, clubs: 'Geelong', firstYear: 2007, lastYear: 2024 },
  { name: 'Jack Riewoldt', goals: 787, clubs: 'Richmond', firstYear: 2007, lastYear: 2023 },
  { name: 'Kevin Bartlett', goals: 778, clubs: 'Richmond', firstYear: 1965, lastYear: 1983 },
  { name: 'Saverio Rocca', goals: 748, clubs: 'Collingwood & North Melbourne', firstYear: 1992, lastYear: 2006 },
  { name: 'Barry Hall', goals: 746, clubs: 'St Kilda & Sydney', firstYear: 1996, lastYear: 2011 },
  { name: 'Stephen Kernahan', goals: 738, clubs: 'Carlton', firstYear: 1986, lastYear: 1997 },
  { name: 'Bill Mohr', goals: 735, clubs: 'St Kilda', firstYear: 1929, lastYear: 1941 },
  { name: 'Wayne Carey', goals: 727, clubs: 'North Melbourne & Adelaide', firstYear: 1989, lastYear: 2004 },
  { name: 'Peter Hudson', goals: 727, clubs: 'Hawthorn', firstYear: 1967, lastYear: 1977 },
  { name: 'Josh Kennedy', goals: 723, clubs: 'Carlton & West Coast', firstYear: 2006, lastYear: 2022 },
  { name: 'Harry Vallence', goals: 722, clubs: 'Carlton', firstYear: 1926, lastYear: 1938 },
  { name: 'Nick Riewoldt', goals: 718, clubs: 'St Kilda', firstYear: 2001, lastYear: 2017 },
  { name: 'Dick Lee', goals: 707, clubs: 'Collingwood', firstYear: 1906, lastYear: 1922 },
  { name: 'Matthew Pavlich', goals: 700, clubs: 'Fremantle', firstYear: 2000, lastYear: 2016 },
  { name: 'Bob Pratt', goals: 681, clubs: 'South Melbourne', firstYear: 1930, lastYear: 1946 },
  { name: 'Jack Moriarty', goals: 662, clubs: 'Essendon & Fitzroy', firstYear: 1922, lastYear: 1933 },
  { name: 'Eddie Betts', goals: 640, clubs: 'Carlton & Adelaide', firstYear: 2005, lastYear: 2021 },
  { name: 'Alastair Lynch', goals: 633, clubs: 'Fitzroy & Brisbane', firstYear: 1988, lastYear: 2004 },
  { name: 'David Neitz', goals: 631, clubs: 'Melbourne', firstYear: 1993, lastYear: 2008 },
  { name: 'Michael Moncrieff', goals: 629, clubs: 'Hawthorn', firstYear: 1971, lastYear: 1983 },
  { name: 'Brendan Fevola', goals: 623, clubs: 'Carlton & Brisbane', firstYear: 1999, lastYear: 2010 },
  { name: 'Michael Roach', goals: 607, clubs: 'Richmond', firstYear: 1977, lastYear: 1989 },
  { name: 'Stewart Loewe', goals: 594, clubs: 'St Kilda', firstYear: 1986, lastYear: 2002 },
  { name: 'Jonathan Brown', goals: 594, clubs: 'Brisbane Lions', firstYear: 2000, lastYear: 2014 },
  { name: 'Kelvin Templeton', goals: 593, clubs: 'Footscray & Melbourne', firstYear: 1974, lastYear: 1985 },
  { name: 'Tony Modra', goals: 588, clubs: 'Adelaide & Fremantle', firstYear: 1992, lastYear: 2001 },
  { name: 'Jarryd Roughead', goals: 578, clubs: 'Hawthorn', firstYear: 2005, lastYear: 2019 },
  { name: 'Simon Madden', goals: 575, clubs: 'Essendon', firstYear: 1974, lastYear: 1992 }, // real Essendon ruckman, not the football video game: rival-names-allow
  { name: 'Simon Beasley', goals: 575, clubs: 'Footscray', firstYear: 1982, lastYear: 1989 },
  { name: 'Richard Osborne', goals: 574, clubs: 'Fitzroy, Sydney, Footscray & Collingwood', firstYear: 1982, lastYear: 1998 },
  { name: 'Stephen Milne', goals: 574, clubs: 'St Kilda', firstYear: 2001, lastYear: 2013 },
  { name: 'Norm Smith', goals: 572, clubs: 'Melbourne & Fitzroy', firstYear: 1935, lastYear: 1950 },
  { name: 'Paul Salmon', goals: 561, clubs: 'Essendon & Hawthorn', firstYear: 1983, lastYear: 2002 },
  { name: 'Brad Johnson', goals: 558, clubs: 'Footscray', firstYear: 1994, lastYear: 2010 },
  { name: 'Chris Grant', goals: 554, clubs: 'Footscray', firstYear: 1990, lastYear: 2007 },
  { name: 'Peter Daicos', goals: 549, clubs: 'Collingwood', firstYear: 1979, lastYear: 1993 },
  { name: 'Warren Tredrea', goals: 549, clubs: 'Port Adelaide', firstYear: 1997, lastYear: 2010 },
  { name: 'Fraser Gehrig', goals: 549, clubs: 'West Coast & St Kilda', firstYear: 1995, lastYear: 2008 },
  { name: 'Dick Harris', goals: 548, clubs: 'Richmond', firstYear: 1934, lastYear: 1944 },
  { name: 'Lindsay White', goals: 540, clubs: 'Geelong & South Melbourne', firstYear: 1941, lastYear: 1950 },
  { name: 'John Coleman', goals: 537, clubs: 'Essendon', firstYear: 1949, lastYear: 1954 },
  { name: 'Brian Taylor', goals: 527, clubs: 'Richmond & Collingwood', firstYear: 1980, lastYear: 1990 },
  { name: 'Daniel Bradshaw', goals: 524, clubs: 'Brisbane & Sydney', firstYear: 1996, lastYear: 2010 },
  { name: "Michael O'Loughlin", goals: 521, clubs: 'Sydney', firstYear: 1995, lastYear: 2009 },
  { name: 'Brent Harvey', goals: 518, clubs: 'North Melbourne', firstYear: 1996, lastYear: 2016 },
  { name: 'Steve Johnson', goals: 516, clubs: 'Geelong & GWS', firstYear: 2002, lastYear: 2017 },
  { name: 'Peter Sumich', goals: 514, clubs: 'West Coast', firstYear: 1989, lastYear: 1997 },
  { name: 'John Longmire', goals: 511, clubs: 'North Melbourne', firstYear: 1988, lastYear: 1999 },
];
