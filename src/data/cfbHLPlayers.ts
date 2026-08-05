/**
 * College Football Higher/Lower pool — career PASSING YARDS.
 *
 * Source: public.cfb_qb_stats (Supabase; sports-reference career leaderboard
 * scrape), verified 2026-07-21. The table follows the NCAA official record
 * book convention: bowl games before 2002 are NOT counted — which is why
 * Brees shows 10,909 (not the with-bowls 11,792) while every post-2002
 * career matches the number fans cite exactly. Internally consistent.
 *
 * Anchors verified vs canonical: Keenum 19,217 (all-time #1), Gabriel 18,722,
 * Chang 17,072, Landry Jones 16,646, Detmer 15,031, Mayfield 14,607,
 * P. Manning 11,201, Flutie 10,579, Tebow 9,285, Favre 7,695, Brady 4,773.
 *
 * Deliberately EXCLUDED: careers that started before 1980 (the scrape's
 * per-season floor), Elway shows 8,805 (missing 1979 = canonical 9,349),
 * Marino 6,397, Jim Kelly 4,507: all truncated. Only careers starting
 * ≥1981 are admitted. Also excluded: the OTHER "Josh Allen" (Maryland,
 * 9 career yards), same-name collision with the Wyoming star.
 *
 * The fun of this pool is famous NFL names with modest college totals:
 * Brady (4,773) loses to almost everyone, Cam Newton (2,908, one starting
 * year) loses to Brady's backup years, and Case Keenum beats them all.
 */
export interface CfbHLPlayer {
  name: string;
  /** School(s), comma-separated in career order. */
  schools: string;
  /** Career passing yards (NCAA official convention, see header). */
  careerPassYds: number;
  firstYear: number;
  lastYear: number;
}

export const cfbHLPlayers: CfbHLPlayer[] = [
  { name: 'Case Keenum', schools: 'Houston', careerPassYds: 19217, firstYear: 2007, lastYear: 2011 },
  { name: 'Dillon Gabriel', schools: 'UCF, Oklahoma, Oregon', careerPassYds: 18722, firstYear: 2019, lastYear: 2024 },
  { name: 'Timmy Chang', schools: 'Hawaii', careerPassYds: 17072, firstYear: 2000, lastYear: 2004 },
  { name: 'Landry Jones', schools: 'Oklahoma', careerPassYds: 16646, firstYear: 2009, lastYear: 2012 },
  { name: 'Graham Harrell', schools: 'Texas Tech', careerPassYds: 15793, firstYear: 2005, lastYear: 2008 },
  { name: 'Sam Hartman', schools: 'Wake Forest, Notre Dame', careerPassYds: 15656, firstYear: 2018, lastYear: 2023 },
  { name: 'Bo Nix', schools: 'Auburn, Oregon', careerPassYds: 15351, firstYear: 2019, lastYear: 2023 },
  { name: 'Ty Detmer', schools: 'BYU', careerPassYds: 15031, firstYear: 1988, lastYear: 1991 },
  { name: 'Will Rogers', schools: 'Mississippi State, Washington', careerPassYds: 14773, firstYear: 2020, lastYear: 2024 },
  { name: 'Kellen Moore', schools: 'Boise State', careerPassYds: 14667, firstYear: 2008, lastYear: 2011 },
  { name: 'Baker Mayfield', schools: 'Texas Tech, Oklahoma', careerPassYds: 14607, firstYear: 2013, lastYear: 2017 },
  { name: 'Luke Falk', schools: 'Washington State', careerPassYds: 14486, firstYear: 2014, lastYear: 2017 },
  { name: 'Colt Brennan', schools: 'Hawaii', careerPassYds: 14193, firstYear: 2005, lastYear: 2007 },
  { name: 'Michael Penix Jr.', schools: 'Indiana, Washington', careerPassYds: 13741, firstYear: 2018, lastYear: 2023 },
  { name: 'Mason Rudolph', schools: 'Oklahoma State', careerPassYds: 13618, firstYear: 2014, lastYear: 2017 },
  { name: 'Philip Rivers', schools: 'North Carolina State', careerPassYds: 13484, firstYear: 2000, lastYear: 2003 },
  { name: 'Colt McCoy', schools: 'Texas', careerPassYds: 13253, firstYear: 2006, lastYear: 2009 },
  { name: 'Aaron Murray', schools: 'Georgia', careerPassYds: 13166, firstYear: 2010, lastYear: 2013 },
  { name: 'Kevin Kolb', schools: 'Houston', careerPassYds: 12964, firstYear: 2003, lastYear: 2006 },
  { name: 'Derek Carr', schools: 'Fresno State', careerPassYds: 12843, firstYear: 2009, lastYear: 2013 },
  { name: 'Jayden Daniels', schools: 'Arizona State, LSU', careerPassYds: 12749, firstYear: 2019, lastYear: 2023 },
  { name: 'Chase Daniel', schools: 'Missouri', careerPassYds: 12515, firstYear: 2005, lastYear: 2008 },
  { name: 'Kliff Kingsbury', schools: 'Texas Tech', careerPassYds: 12429, firstYear: 1999, lastYear: 2002 },
  { name: 'Russell Wilson', schools: 'NC State, Wisconsin', careerPassYds: 11720, firstYear: 2008, lastYear: 2011 },
  { name: 'Geno Smith', schools: 'West Virginia', careerPassYds: 11662, firstYear: 2009, lastYear: 2012 },
  { name: 'Carson Palmer', schools: 'USC', careerPassYds: 11388, firstYear: 1998, lastYear: 2002 },
  { name: 'Patrick Mahomes', schools: 'Texas Tech', careerPassYds: 11252, firstYear: 2014, lastYear: 2016 },
  { name: 'Peyton Manning', schools: 'Tennessee', careerPassYds: 11201, firstYear: 1994, lastYear: 1997 },
  { name: 'Drew Brees', schools: 'Purdue', careerPassYds: 10909, firstYear: 1997, lastYear: 2000 },
  { name: 'Danny Wuerffel', schools: 'Florida', careerPassYds: 10875, firstYear: 1993, lastYear: 1996 },
  { name: 'Marcus Mariota', schools: 'Oregon', careerPassYds: 10796, firstYear: 2012, lastYear: 2014 },
  { name: 'Matt Leinart', schools: 'USC', careerPassYds: 10693, firstYear: 2003, lastYear: 2005 },
  { name: 'Doug Flutie', schools: 'Boston College', careerPassYds: 10579, firstYear: 1981, lastYear: 1984 },
  { name: 'Justin Herbert', schools: 'Oregon', careerPassYds: 10541, firstYear: 2016, lastYear: 2019 },
  { name: 'Robert Griffin III', schools: 'Baylor', careerPassYds: 10366, firstYear: 2008, lastYear: 2011 },
  { name: 'Andy Dalton', schools: 'TCU', careerPassYds: 10314, firstYear: 2007, lastYear: 2010 },
  { name: 'Deshaun Watson', schools: 'Clemson', careerPassYds: 10163, firstYear: 2014, lastYear: 2016 },
  { name: 'Eli Manning', schools: 'Ole Miss', careerPassYds: 10119, firstYear: 2000, lastYear: 2003 },
  { name: 'Trevor Lawrence', schools: 'Clemson', careerPassYds: 10098, firstYear: 2018, lastYear: 2020 },
  { name: 'Caleb Williams', schools: 'Oklahoma, USC', careerPassYds: 10082, firstYear: 2021, lastYear: 2023 },
  { name: 'Jalen Hurts', schools: 'Alabama, Oklahoma', careerPassYds: 9477, firstYear: 2016, lastYear: 2019 },
  { name: 'Andrew Luck', schools: 'Stanford', careerPassYds: 9430, firstYear: 2009, lastYear: 2011 },
  { name: 'Dak Prescott', schools: 'Mississippi State', careerPassYds: 9376, firstYear: 2012, lastYear: 2015 },
  { name: 'Matt Ryan', schools: 'Boston College', careerPassYds: 9313, firstYear: 2004, lastYear: 2007 },
  { name: 'Tim Tebow', schools: 'Florida', careerPassYds: 9285, firstYear: 2006, lastYear: 2009 },
  { name: 'Kirk Cousins', schools: 'Michigan State', careerPassYds: 9131, firstYear: 2008, lastYear: 2011 },
  { name: 'Lamar Jackson', schools: 'Louisville', careerPassYds: 9043, firstYear: 2015, lastYear: 2017 },
  { name: 'Joe Burrow', schools: 'Ohio State, LSU', careerPassYds: 8852, firstYear: 2016, lastYear: 2019 },
  { name: 'Tim Couch', schools: 'Kentucky', careerPassYds: 8435, firstYear: 1996, lastYear: 1998 },
  { name: 'Sam Bradford', schools: 'Oklahoma', careerPassYds: 8403, firstYear: 2007, lastYear: 2009 },
  { name: 'C.J. Stroud', schools: 'Ohio State', careerPassYds: 8123, firstYear: 2020, lastYear: 2022 },
  { name: 'Jameis Winston', schools: 'Florida State', careerPassYds: 7964, firstYear: 2013, lastYear: 2014 },
  { name: 'Johnny Manziel', schools: 'Texas A&M', careerPassYds: 7820, firstYear: 2012, lastYear: 2013 },
  { name: 'Steve Young', schools: 'BYU', careerPassYds: 7733, firstYear: 1981, lastYear: 1983 },
  { name: 'Matthew Stafford', schools: 'Georgia', careerPassYds: 7731, firstYear: 2006, lastYear: 2008 },
  { name: 'Brett Favre', schools: 'Southern Miss', careerPassYds: 7695, firstYear: 1987, lastYear: 1990 },
  { name: 'Tua Tagovailoa', schools: 'Alabama', careerPassYds: 7442, firstYear: 2017, lastYear: 2019 },
  { name: 'Vince Young', schools: 'Texas', careerPassYds: 6040, firstYear: 2003, lastYear: 2005 },
  { name: 'Charlie Ward', schools: 'Florida State', careerPassYds: 5747, firstYear: 1989, lastYear: 1993 },
  { name: 'Aaron Rodgers', schools: 'California', careerPassYds: 5469, firstYear: 2003, lastYear: 2004 },
  { name: 'Kyler Murray', schools: 'Texas A&M, Oklahoma', careerPassYds: 5406, firstYear: 2015, lastYear: 2018 },
  { name: 'Josh Allen', schools: 'Wyoming', careerPassYds: 5066, firstYear: 2015, lastYear: 2017 },
  { name: 'Tom Brady', schools: 'Michigan', careerPassYds: 4773, firstYear: 1996, lastYear: 1999 },
  { name: 'Michael Vick', schools: 'Virginia Tech', careerPassYds: 3074, firstYear: 1999, lastYear: 2000 },
  { name: 'Cam Newton', schools: 'Florida, Auburn', careerPassYds: 2908, firstYear: 2007, lastYear: 2010 },
];
