/**
 * Curated NFL head-coach stints for the 17-0 Perfect Season coach card
 * (owner task 77: "coaches, defense, team-building depth").
 *
 * DATA RULES (hard-won, 2026-08-05): the nfl_team_seasons scrape's
 * head_coach / wins / playoff_result columns are Wikipedia garbage (award
 * blurbs, nulls), so coaches are hand-curated here instead, and ONLY stints
 * that are historically certain are included. Abbrs use the CURRENT
 * franchise codes exactly as nfl_team_seasons stores them (LAR covers the
 * St. Louis years, LAC San Diego, LV Oakland). Years are inclusive and
 * clamped to the 1999-2024 stats era on read. A team-year with no entry
 * gets the generic committee card, never an invented name.
 */

export interface CoachStint {
  coach: string;
  abbr: string;
  from: number;
  to: number;
  /** Pedigree rating on the same 40-99 scale as players. */
  rating: number;
  note: string;
}

const S = (coach: string, abbr: string, from: number, to: number, rating: number, note: string): CoachStint =>
  ({ coach, abbr, from, to, rating, note });

export const NFL_COACH_STINTS: CoachStint[] = [
  // Dynasty and hall-of-fame tier
  S('Bill Belichick', 'NE', 2000, 2023, 97, '6 rings in New England'),
  S('Andy Reid', 'PHI', 1999, 2012, 92, 'Built the 2000s Eagles'),
  S('Andy Reid', 'KC', 2013, 2024, 96, 'The Chiefs dynasty architect'),
  S('Sean McVay', 'LAR', 2017, 2024, 93, 'Youngest Super Bowl winning coach'),
  S('Tony Dungy', 'TB', 1999, 2001, 89, 'Built the Tampa 2'),
  S('Tony Dungy', 'IND', 2002, 2008, 92, 'Steady hand of the Manning Colts'),
  S('Mike Tomlin', 'PIT', 2007, 2024, 90, 'Never had a losing season'),
  S('Bill Cowher', 'PIT', 1999, 2006, 90, 'The Chin, one for the thumb'),
  S('Sean Payton', 'NO', 2006, 2011, 91, 'Turned the Saints into a machine'),
  S('Sean Payton', 'NO', 2013, 2021, 90, 'The offense never stopped'),
  S('Sean Payton', 'DEN', 2023, 2024, 84, 'Rebuilding the Broncos'),
  S('John Harbaugh', 'BAL', 2008, 2024, 90, 'Two rings, zero drama'),
  S('Pete Carroll', 'SEA', 2010, 2023, 90, 'Legion of Boom general'),
  S('Mike Shanahan', 'DEN', 1999, 2008, 89, 'Zone-run royalty'),
  S('Mike Shanahan', 'WAS', 2010, 2013, 78, 'Past the glory years'),
  S('Mike Holmgren', 'SEA', 1999, 2008, 87, 'Walrus took Seattle to a Super Bowl'),
  S('Jon Gruden', 'LV', 1999, 2001, 86, 'Chucky, the Oakland years'),
  S('Jon Gruden', 'TB', 2002, 2008, 88, 'Won the Super Bowl against his old team'),
  S('Jon Gruden', 'LV', 2018, 2021, 72, 'The sequel nobody needed'),
  S('Tom Coughlin', 'JAX', 1999, 2002, 84, 'Expansion-era overachiever'),
  S('Tom Coughlin', 'NYG', 2004, 2015, 89, 'Beat the 18-0 Patriots. Twice bothered them'),
  S('Kyle Shanahan', 'SF', 2017, 2024, 91, 'The scheme every team copies'),
  S('Jim Harbaugh', 'SF', 2011, 2014, 90, 'Took over a mess, made 3 straight title games'),
  S('Jim Harbaugh', 'LAC', 2024, 2024, 86, 'Khaki energy arrives in LA'),

  // Very good
  S('Matt LaFleur', 'GB', 2019, 2024, 87, 'Back-to-back 13 win seasons out the gate'),
  S('Sean McDermott', 'BUF', 2017, 2024, 86, 'Ended the drought, owns the East'),
  S('Nick Sirianni', 'PHI', 2021, 2024, 87, 'Ring in year four'),
  S('Dan Campbell', 'DET', 2021, 2024, 86, 'Kneecap-biting rebuild that worked'),
  S('Bruce Arians', 'ARI', 2013, 2017, 85, 'No risk it, no biscuit'),
  S('Bruce Arians', 'TB', 2019, 2021, 86, 'Won it all with Brady'),
  S('Doug Pederson', 'PHI', 2016, 2020, 85, 'Philly Special. Enough said'),
  S('Doug Pederson', 'JAX', 2022, 2024, 78, 'The 27-0 comeback game'),
  S('Gary Kubiak', 'HOU', 2006, 2013, 79, 'Built Houston respectability'),
  S('Gary Kubiak', 'DEN', 2015, 2016, 86, 'Rode that defense to Super Bowl 50'),
  S('Kevin O\'Connell', 'MIN', 2022, 2024, 85, 'Quarterback whisperer'),
  S('Mike McCarthy', 'GB', 2006, 2018, 84, 'A ring with Rodgers'),
  S('Mike McCarthy', 'DAL', 2020, 2024, 78, 'Regular season juggernaut'),
  S('Dick Vermeil', 'KC', 2001, 2005, 82, 'Cried after wins, deservedly'),
  S('Mike Sherman', 'GB', 2000, 2005, 79, 'Favre-era steady'),
  S('Brian Billick', 'BAL', 1999, 2007, 82, '2000 Ravens. That defense, his ring'),
  S('Marty Schottenheimer', 'LAC', 2002, 2006, 82, '14-2 and fired anyway'),
  S('John Fox', 'CAR', 2002, 2010, 80, 'Took Carolina to a Super Bowl'),
  S('John Fox', 'DEN', 2011, 2014, 82, 'Four straight division titles'),
  S('Jack Del Rio', 'JAX', 2003, 2011, 76, 'Keep chopping wood'),
  S('Lovie Smith', 'CHI', 2004, 2012, 80, 'Rex is our quarterback, still made a Super Bowl'),
  S('Dan Reeves', 'ATL', 1999, 2003, 78, 'Old school to the end'),
  S('Jeff Fisher', 'TEN', 1999, 2010, 80, 'One yard short forever'),
  S('Marvin Lewis', 'CIN', 2003, 2018, 75, 'Made the Bengals respectable, never won in January'),
  S('Zac Taylor', 'CIN', 2019, 2024, 80, 'Burrow believer'),
  S('Ron Rivera', 'CAR', 2011, 2019, 79, 'Riverboat Ron'),
  S('Ron Rivera', 'WAS', 2020, 2023, 70, 'Tough years in Washington'),
  S('Mike Zimmer', 'MIN', 2014, 2021, 78, 'Double A gap blitz artist'),
  S('Jim Caldwell', 'IND', 2009, 2011, 77, '14-0 start in year one'),
  S('Jim Caldwell', 'DET', 2014, 2017, 76, 'Detroit stability, briefly'),
  S('Chuck Pagano', 'IND', 2012, 2017, 76, 'Chuckstrong'),
  S('Frank Reich', 'IND', 2018, 2022, 76, 'Comeback king as a player and coach'),
  S('Kevin Stefanski', 'CLE', 2020, 2024, 78, 'Two-time coach of the year'),
  S('DeMeco Ryans', 'HOU', 2023, 2024, 82, 'Flipped Houston fast'),
  S('Mike McDaniel', 'MIA', 2022, 2024, 79, 'Speed in space scientist'),
  S('Rex Ryan', 'NYJ', 2009, 2014, 77, 'Back-to-back AFC title games, then snacks'),
  S('Herm Edwards', 'NYJ', 2001, 2005, 74, 'You play to win the game'),
  S('Wade Phillips', 'BUF', 1999, 2000, 74, 'Defensive genius, head-coach shrug'),
  S('Wade Phillips', 'DAL', 2007, 2010, 74, '13-3 and nobody remembers'),
  S('Jim Mora', 'IND', 1999, 2001, 72, 'Playoffs?! Playoffs?!'),

  // The cursed tier: hiring these should hurt
  S('Adam Gase', 'MIA', 2016, 2018, 58, 'The eyes told the story'),
  S('Adam Gase', 'NYJ', 2019, 2020, 50, 'An offensive guru without an offense'),
  S('Urban Meyer', 'JAX', 2021, 2021, 42, 'Did not survive the season'),
  S('Nathaniel Hackett', 'DEN', 2022, 2022, 43, 'Fired before his first bye week ended'),
  S('Hue Jackson', 'CLE', 2016, 2018, 45, '3-36-1. Three. Wins'),
  S('Rod Marinelli', 'DET', 2006, 2008, 48, 'Captain of the 0-16 ship'),
  S('Matt Patricia', 'DET', 2018, 2020, 52, 'Pencil on the ear, losses on the board'),
  S('Freddie Kitchens', 'CLE', 2019, 2019, 52, 'One year of chaos'),
  S('Josh McDaniels', 'DEN', 2009, 2010, 55, 'Traded everyone, won nothing'),
  S('Josh McDaniels', 'LV', 2022, 2023, 48, 'The second try went worse'),
  S('Marc Trestman', 'CHI', 2013, 2014, 55, 'The CFL genius experiment'),
  S('Jim Zorn', 'WAS', 2008, 2009, 53, 'Hip hip hooray'),
  S('David Culley', 'HOU', 2021, 2021, 55, 'Set up to fail, still fired'),
  S('Matt Rhule', 'CAR', 2020, 2022, 54, 'College magic did not travel'),
];

/** The certain coach for a team-year, or null (generic card territory). */
export function coachFor(abbr: string, year: number): CoachStint | null {
  return NFL_COACH_STINTS.find(s => s.abbr === abbr && year >= s.from && year <= s.to) ?? null;
}
