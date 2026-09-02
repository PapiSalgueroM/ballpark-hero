/* Historical NFL team codes to the franchise's current code, by season.

   Round 404. The nflverse season rosters name teams by short codes whose
   meaning depends on the year: STL is the St. Louis Cardinals from 1970 to
   1987 and the St. Louis Rams from 1995 to 2001, BAL is the Colts until 1983
   and the Ravens from 1996. A grid that asks "played for the Cardinals" has
   to read STL 1980 as Arizona and STL 1999 as the Rams, so this map is
   season aware and every row is a documented relocation or rename.

   Measured first, then verified: the season ranges below are exactly the
   ranges each code occupies in the 1970 to 2001 files (recon 2026-09-02),
   and each maps to the franchise Pro Football Reference's franchise index
   and NFL.com's team histories both give for those seasons. Codes not listed
   are already the franchise's current code.

   The Browns are one franchise across the 1996 to 1998 gap (the NFL kept
   the name, colours and history in Cleveland when the 1995 team became the
   Ravens), which is why CLE 1970 to 1995 and CLE 1999 onward both stay CLE
   and BAL from 1996 is a different franchise from BAL before 1984.
*/
const RULES = [
  { code: 'BAL', from: 1970, to: 1983, current: 'IND', note: 'Baltimore Colts, moved to Indianapolis in 1984' },
  { code: 'BAL', from: 1996, to: 2001, current: 'BAL', note: 'Baltimore Ravens, a new franchise in 1996 (listed so the code has a rule for each of its two lives)' },
  { code: 'CLE', from: 1970, to: 1995, current: 'CLE', note: 'Cleveland Browns' },
  { code: 'CLE', from: 1999, to: 2001, current: 'CLE', note: 'Cleveland Browns, resumed in 1999 as the same franchise' },
  { code: 'BOS', from: 1970, to: 1970, current: 'NE', note: 'Boston Patriots, renamed New England in 1971' },
  { code: 'HOU', from: 1970, to: 1996, current: 'TEN', note: 'Houston Oilers, moved to Tennessee in 1997' },
  { code: 'LA', from: 1970, to: 1981, current: 'LA', note: 'Los Angeles Rams' },
  { code: 'RAM', from: 1982, to: 1994, current: 'LA', note: 'Los Angeles Rams, coded RAM while the Raiders shared the city' },
  { code: 'STL', from: 1970, to: 1987, current: 'ARI', note: 'St. Louis Cardinals, moved to Phoenix in 1988' },
  { code: 'PHO', from: 1988, to: 1993, current: 'ARI', note: 'Phoenix Cardinals, renamed Arizona in 1994' },
  { code: 'STL', from: 1995, to: 2001, current: 'LA', note: 'St. Louis Rams, moved back to Los Angeles in 2016' },
  { code: 'OAK', from: 1970, to: 1981, current: 'LV', note: 'Oakland Raiders' },
  { code: 'RAI', from: 1982, to: 1994, current: 'LV', note: 'Los Angeles Raiders' },
  { code: 'OAK', from: 1995, to: 2001, current: 'LV', note: 'Oakland Raiders again, to Las Vegas in 2020' },
  { code: 'SD', from: 1970, to: 2001, current: 'LAC', note: 'San Diego Chargers, moved to Los Angeles in 2017' },
];

/** The current franchise code for a historical roster code in a given season, or the code itself. */
export function currentCodeFor(code, season) {
  const c = String(code || '').toUpperCase();
  for (const r of RULES) if (r.code === c && season >= r.from && season <= r.to) return r.current;
  return c;
}

export const HISTORICAL_CODE_RULES = RULES;

/** Super Bowl winners as super_bowls spells them, for names nfl_team_codes
 *  does not carry (checked against the table 2026-09-02: Baltimore Colts,
 *  Washington Redskins, Los Angeles Raiders are the three winners it lacks;
 *  the rest are here so a future row cannot fall through silently). */
export const WINNER_NAME_CODES = {
  'Baltimore Colts': 'IND',
  'Boston Patriots': 'NE',
  'Houston Oilers': 'TEN',
  'Tennessee Oilers': 'TEN',
  'Los Angeles Raiders': 'LV',
  'Oakland Raiders': 'LV',
  'Phoenix Cardinals': 'ARI',
  'St. Louis Cardinals': 'ARI',
  'St. Louis Rams': 'LA',
  'San Diego Chargers': 'LAC',
  'Washington Redskins': 'WAS',
  'Washington Football Team': 'WAS',
};
