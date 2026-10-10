/* Round 1048: the shape of the NBA and the NFL (conferences, divisions, and how
   often a team meets each kind of opponent), so a career's "week by week" can
   name who he played without inventing a schedule. Team ids are the GAME'S
   own (the ids the draft, free agency and the board already print).

   This file loads only with the Season Center (never with the hub) and
   imports nothing.

   What is real here: which division and conference each team is in, and the
   league's standard schedule formula. What is NOT claimed anywhere: who met
   whom on which night. The Season Center deals its own keyed schedule from
   the formula, and its "?" says so.

   SOURCES, all read 2026-10-07. Two independent sources agree on each fact.

   NBA divisions, 2025-26 (30 teams, 6 divisions of 5):
   1. Basketball Reference, "2025-26 NBA Standings" (division standings).
   2. ESPN, "NBA Standings 2025-26" grouped by division.
   NBA 82 game formula (4 facts: 4 games against each of the 4 division
   rivals; 4 against 6 other teams of the conference; 3 against the other 4;
   2 against each of the 15 teams of the other conference; 41 at home):
   1. NBAstuffer, "How the NBA Schedule is Made".
   2. Up In The Rafters, "How Many Games Are in an NBA Season? (2026-27
      Schedule)" (published 14 April 2026), and Hoop Heads, "How the NBA
      Schedule Works" (41 home and 41 away).
   THE WRINKLE both formula sources state: since the in season cup began in
   2023-24 only 80 games are set in the summer; the four cup group games are
   inside those 80 and the last two are set by the cup's results, so a real
   team's count against one opponent can differ from the formula by a game.
   So this is "the league's standard schedule formula", never a real schedule.

   NFL divisions, 2025 (32 teams, 8 divisions of 4):
   1. ESPN, "NFL Standings 2025".
   2. NFL.com, "2025 NFL Standings, Division".
   (src/data/frontOfficePlayers.ts holds the same table for the Front Office;
   scripts/simUsSeasonCentre.mjs cross checks the two. That is a consistency
   check between two files of this repo, not a source.)
   NFL 17 game formula (5 facts: 6 division games, home and away; 4 against
   one division of the same conference, 2 at home; 4 against one division of
   the other conference, 2 at home; 2 against the two remaining divisions of
   the same conference, 1 at home; 1 extra against the other conference):
   1. NFL Football Operations, "Creating the NFL Schedule".
   2. CBS Sports, "NFL 17-game schedule: Here's how the complicated
      scheduling formula will work with the extra game" (30 March 2021), and
      NFL Schedule Simulator, "How the NFL Schedule Formula Works".
   Which conference hosts the 17th game (AFC in odd years, NFC in even years,
   2021 to 2028):
   1. CBS Sports, "NFL will likely be making a tweak to the scheduling formula
      if the regular season stays at 17 games" (14 April 2026): the AFC East
      is at home in 2021, 2023, 2025 and 2027 and away in 2022, 2024, 2026 and
      2028, "the home conference for this game will rotate each season", and
      the league plans to flip the pairing from 2029 if it stays at 17 games.
   2. NFL Schedule Simulator (as above): "the AFC hosted the extra game in
      2021, the NFC in 2022, and it has alternated since"; ESPN, "NFL moves to
      17-game regular season in 2021" ("The AFC will have nine in 2021").
   From 2029 nothing is verified (a plan is not a fact), so `nflHosts17`
   answers null there and the Season Center keys who hosts.

   NBA league scoring, points per team game (2 facts):
   2003-04: 93.4. 1. Basketball Reference, "NBA League Averages - Per Game".
   2. Land of Basketball, "2003-04 NBA Regular Season: Teams with the Most
   Points Per Game" (29 teams, 82 games each, mean 93.40).
   2025-26: 115.6. 1. Basketball Reference (as above). 2. Land of Basketball,
   "2025-26 NBA Regular Season: Teams with the Most Points Per Game" (30
   teams, mean 115.6).

   THE PLAYOFF FORMAT THE PATH DRAWS (`US_PLAYOFF_FORMAT`), read 2026-10-09
   (Round 1147's fix pass; until then these were typed in the number files
   with no source written down).
   NFL, 2020 season on (every NFL season the Season Center opens is 2021 or
   later): 14 teams, seven a conference, one game a round, lose and you are
   out; the rounds are the Wild Card, the Divisional round, the conference
   championships and the Super Bowl, and the Super Bowl is the only round
   against the other conference. Only the top seed of each conference skips
   the Wild Card round.
   1. NBC Sports, "NFL officially expands playoff format in time for 2020
      playoffs" and "How many teams get a bye in the 2023 NFL playoffs?".
   2. Sports Illustrated, "NFL Playoff Format, Dates, History and
      Predictions". (The reviewer of this round read the same in Fox Sports,
      "NFL Playoff Format: How does the NFL postseason work?".)
   NOT MODELLED, and said in the "?": the top seed's bye. The career's engine
   saves four playoff games for every champion, so the path always starts at
   the Wild Card round.
   NBA, 2003 playoffs on (the throwback era starts with 2003-04): four
   rounds, every one a best of seven (the first round was a best of five
   through 2002).
   1. Harvard Sports Analysis Collective, "One and Done: A Thing of the
      Past? An Analysis of the NBA First-Round Playoff Format" (2010).
   2. Heavy, "How Many Games Are in an NBA Playoff Series? Updated Rules &
      Format" (2019).

   HOW FOOTBALL IS SCORED AND TIMED (`NFL_SCORING`, `NFL_CLOCK`), read
   2026-10-09:
   A touchdown is 6, the kick after it 1, a two point try 2 (so a touchdown
   drive is 6, 7 or 8), a field goal 3 and a safety 2.
   1. Under Armour, "How Football Scoring Works".
   2. Dummies, "The Various Ways American Football Teams Score Points".
   A regular season game still level after one overtime period of 10
   minutes is recorded as a tie; a playoff game plays on until somebody wins.
   1. NFL Football Operations, "NFL Overtime Rules".
   2. The Associated Press report of the Giants and the Commanders, 20-20 on
      4 December 2022 ("Giants and Commanders tie at 20 as Gano's kick falls
      short"), and Fox 5 DC, "Commanders tie Giants at 20 after New York's
      game winning kick falls short".
   Four quarters of 15 minutes. THIN, marked: the NFL rulebook's Rule 4,
   "Game Timing", is where it is written, and the league's own file did not
   open this round. What was read instead:
   1. Wikipedia, "American football rules", as a spot check ("four quarters
      of 15 minutes each").
   2. A copy of the rulebook's text on another site (ReadKong, "Rule 4 Game
      Timing, Section 1: Periods, Intermissions, Halftime").

   LEFT OUT, marked and not filled:
   - NFL 2005 throwback: no window. 2005 to 2020 are held (16 real games),
     and from 2021 the game's 2005 team list is no longer that season's
     league (three clubs had moved), so those seasons play "another team".
   - NBA 2003-04 throwback: no window. The 2003-04 alignment of the game's 29
     teams and that season's schedule formula were not two sourced in this
     round, and from 2004-05 a 30th team joined and the divisions were
     redrawn while the game's list stays 2003-04's. Those seasons play
     "another team". */

/** A division, with the game's own team ids. */
export interface UsDivision { conf: string; name: string; teams: readonly string[] }
/** Which schedule formula a shape is dealt with (the dealer lives with the sport's number file). */
export type UsFormula = { kind: 'nba82' } | { kind: 'nfl17' } | { kind: 'mlb162' };
export interface UsShape { divisions: readonly UsDivision[]; formula: UsFormula }
export interface UsShapeWindow { sport: 'nba' | 'nfl'; era: string; from: number; to: number | null; shape: UsShape }

const NBA_2025: UsShape = {
  formula: { kind: 'nba82' },
  divisions: [
    { conf: 'East', name: 'Atlantic', teams: ['BOS', 'BKN', 'NYK', 'PHI', 'TOR'] },
    { conf: 'East', name: 'Central', teams: ['CHI', 'CLE', 'DET', 'IND', 'MIL'] },
    { conf: 'East', name: 'Southeast', teams: ['ATL', 'CHA', 'MIA', 'ORL', 'WAS'] },
    { conf: 'West', name: 'Northwest', teams: ['DEN', 'MIN', 'OKC', 'POR', 'UTA'] },
    { conf: 'West', name: 'Pacific', teams: ['GSW', 'LAC', 'LAL', 'PHX', 'SAC'] },
    { conf: 'West', name: 'Southwest', teams: ['DAL', 'HOU', 'MEM', 'NOP', 'SAS'] },
  ],
};

const NFL_2025: UsShape = {
  formula: { kind: 'nfl17' },
  divisions: [
    { conf: 'AFC', name: 'AFC East', teams: ['BUF', 'MIA', 'NE', 'NYJ'] },
    { conf: 'AFC', name: 'AFC North', teams: ['BAL', 'CIN', 'CLE', 'PIT'] },
    { conf: 'AFC', name: 'AFC South', teams: ['HOU', 'IND', 'JAX', 'TEN'] },
    { conf: 'AFC', name: 'AFC West', teams: ['DEN', 'KC', 'LAC', 'LV'] },
    { conf: 'NFC', name: 'NFC East', teams: ['DAL', 'NYG', 'PHI', 'WAS'] },
    { conf: 'NFC', name: 'NFC North', teams: ['CHI', 'DET', 'GB', 'MIN'] },
    { conf: 'NFC', name: 'NFC South', teams: ['ATL', 'CAR', 'NO', 'TB'] },
    { conf: 'NFC', name: 'NFC West', teams: ['ARI', 'LA', 'SEA', 'SF'] },
  ],
};

/** `to: null` carries the latest verified alignment forward: from 2026 on the
 *  league is the career's own world on today's format. */
export const US_LEAGUE_SHAPES: readonly UsShapeWindow[] = [
  { sport: 'nba', era: 'now', from: 2025, to: null, shape: NBA_2025 },
  { sport: 'nfl', era: 'now', from: 2025, to: null, shape: NFL_2025 },
];

/** The league's shape for that sport, era and season, or null (opponents are then "another team").
 *  An absent era id on an old save is the present day era. */
export function usLeagueShape(sport: string, eraId: string | undefined, year: number): UsShape | null {
  const era = eraId ?? 'now';
  const w = US_LEAGUE_SHAPES.find(x => x.sport === sport && x.era === era && year >= x.from && (x.to === null || year <= x.to));
  return w ? w.shape : null;
}

/** Whether `conf` hosts the 17th game of the NFL season of `year`, or null where it is not verified. */
export function nflHosts17(year: number, conf: string): boolean | null {
  if (year < 2021 || year > 2028 || (conf !== 'AFC' && conf !== 'NFC')) return null;
  return (year % 2 === 1) === (conf === 'AFC');
}

/** The playoff format the path draws: the round names in order, and a round's
 *  [wins needed, most games] (null: one game a round). Sources in the header. */
export const US_PLAYOFF_FORMAT = {
  nba: {
    rounds: ['First round', 'Conference semifinals', 'Conference finals', 'NBA Finals'],
    series: [[4, 7], [4, 7], [4, 7], [4, 7]],
  },
  nfl: {
    rounds: ['Wild Card', 'Divisional', 'Conference Championship', 'Super Bowl'],
    series: null,
  },
} as const;

/** What a scoring play is worth in football. Sources in the header. */
export const NFL_SCORING = { touchdown: 6, kickAfter: 1, twoPointTry: 2, fieldGoal: 3, safety: 2 } as const;
/** The game clock: four quarters of 15 minutes (thin, see the header). */
export const NFL_CLOCK = { quarters: 4, minutes: 15 } as const;

/** League points per team game by era id (2003-04, and 2025-26 for the present day era). */
export const NBA_SCORING: Readonly<Record<string, number>> = { now: 115.6, y2004: 93.4 };
