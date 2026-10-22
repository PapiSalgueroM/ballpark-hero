import { nflHLPlayers } from '@/data/nflHLPlayers';

/**
 * NFL Higher/Lower stat categories (owner 2026-08-05: "it should be more than
 * just career touchdowns. There are way more stats u can do it about").
 * First baked from nflfastr_player_stats (REG season, careers starting 2000+
 * so the numbers are complete) on 2026-08-05.
 *
 * Round 1549: every value is now the official regular season total through
 * the 2025 season, read on 2026-10-22 from nfl.com (ESPN where nfl.com would
 * not render) and StatMuse, two per value, in
 * scripts/data/nflHigherLowerVerified2026-10.json, which
 * scripts/simHigherLowerFacts.mjs holds every category to. The nflfastr bake
 * was play by play derived and a few yards off on most careers (Brees 80,428
 * against an official 80,358), and grouping by display name had merged two
 * men twice: Adrian Peterson's 16,204 rushing yards (officially 14,918, so he
 * wrongly beat Frank Gore) and Steve Smith's 1,276 catches (Steve Smith Sr.
 * had 1,031). A player who played in 2025 shows lastSeason 2025 and his 2025
 * team. Rebake after each finished season.
 */
export interface NflHLCatPlayer {
  name: string;
  position: string;
  teams: string;
  value: number;
  lastSeason: number;
}

export interface NflHLCategory {
  key: string;
  /** Short chip label, e.g. "Passing yards". */
  label: string;
  /** Full question shown above the pair. */
  question: string;
  /** Unit suffix on reveal, e.g. "pass yds". */
  unit: string;
  players: NflHLCatPlayer[];
}

const P = (name: string, position: string, teams: string, value: number, lastSeason: number): NflHLCatPlayer =>
  ({ name, position, teams, value, lastSeason });

export const NFL_HL_CATEGORIES: NflHLCategory[] = [
  {
    key: 'tds',
    label: 'TDs scored',
    question: 'Who scored more career touchdowns?',
    unit: 'TDs',
    players: nflHLPlayers.map((p) => ({
      name: p.name, position: p.position, teams: p.teams, value: p.careerTds, lastSeason: p.lastSeason,
    })),
  },
  {
    key: 'passYds',
    label: 'Passing yards',
    question: 'Who threw for more career yards?',
    unit: 'pass yds',
    players: [
      P('Tom Brady', 'QB', 'NE, TB', 89214, 2022),
      P('Drew Brees', 'QB', 'LAC, NO', 80358, 2020),
      P('Ben Roethlisberger', 'QB', 'PIT', 64088, 2021),
      P('Philip Rivers', 'QB', 'LAC, IND', 63984, 2025),
      P('Aaron Rodgers', 'QB', 'GB, NYJ, PIT', 66274, 2025),
      P('Matt Ryan', 'QB', 'ATL, IND', 62792, 2022),
      P('Matthew Stafford', 'QB', 'DET, LA', 64516, 2025),
      P('Eli Manning', 'QB', 'NYG', 57023, 2019),
      P('Carson Palmer', 'QB', 'CIN, ARI', 46247, 2017),
      P('Russell Wilson', 'QB', 'SEA, DEN, PIT, NYG', 46966, 2025),
      P('Joe Flacco', 'QB', 'BAL, CLE, IND, CIN', 48176, 2025),
      P('Kirk Cousins', 'QB', 'WAS, MIN, ATL', 44700, 2025),
      P('Derek Carr', 'QB', 'LV, NO', 41245, 2024),
      P('Andy Dalton', 'QB', 'CIN, DAL, CAR', 39793, 2025),
      P('Jay Cutler', 'QB', 'DEN, CHI, MIA', 35133, 2017),
      P('Jared Goff', 'QB', 'LA, DET', 39622, 2025),
      P('Ryan Fitzpatrick', 'QB', 'BUF, HOU, MIA', 34990, 2021),
      P('Ryan Tannehill', 'QB', 'MIA, TEN', 34881, 2023),
      P('Tony Romo', 'QB', 'DAL', 34183, 2016),
      P('Cam Newton', 'QB', 'CAR, NE', 32382, 2021),
      P('Patrick Mahomes', 'QB', 'KC', 35939, 2025),
      P('Dak Prescott', 'QB', 'DAL', 35989, 2025),
      P('Josh Allen', 'QB', 'BUF', 30102, 2025),
      P('Baker Mayfield', 'QB', 'CLE, LA, TB', 28525, 2025),
      P('Jameis Winston', 'QB', 'TB, NO, CLE, NYG', 24792, 2025),
      P('Andrew Luck', 'QB', 'IND', 23671, 2018),
      P('Michael Vick', 'QB', 'ATL, PHI, NYJ', 22464, 2015),
      P('Carson Wentz', 'QB', 'PHI, IND, LA, MIN', 23626, 2025),
      P('Justin Herbert', 'QB', 'LAC', 24820, 2025),
      P('Lamar Jackson', 'QB', 'BAL', 22608, 2025),
      P('Kyler Murray', 'QB', 'ARI', 20460, 2025),
      P('Geno Smith', 'QB', 'NYJ, SEA, LV', 22168, 2025),
      P('Joe Burrow', 'QB', 'CIN', 20810, 2025),
      P('Deshaun Watson', 'QB', 'HOU, CLE', 17904, 2024),
    ],
  },
  {
    key: 'passTds',
    label: 'Passing TDs',
    question: 'Who threw more career touchdown passes?',
    unit: 'pass TDs',
    players: [
      P('Tom Brady', 'QB', 'NE, TB', 649, 2022),
      P('Drew Brees', 'QB', 'LAC, NO', 571, 2020),
      P('Aaron Rodgers', 'QB', 'GB, NYJ, PIT', 527, 2025),
      P('Philip Rivers', 'QB', 'LAC, IND', 425, 2025),
      P('Ben Roethlisberger', 'QB', 'PIT', 418, 2021),
      P('Matt Ryan', 'QB', 'ATL, IND', 381, 2022),
      P('Matthew Stafford', 'QB', 'DET, LA', 423, 2025),
      P('Eli Manning', 'QB', 'NYG', 366, 2019),
      P('Russell Wilson', 'QB', 'SEA, DEN, PIT, NYG', 353, 2025),
      P('Carson Palmer', 'QB', 'CIN, ARI', 294, 2017),
      P('Kirk Cousins', 'QB', 'WAS, MIN, ATL', 298, 2025),
      P('Joe Flacco', 'QB', 'BAL, CLE, IND, CIN', 272, 2025),
      P('Derek Carr', 'QB', 'LV, NO', 257, 2024),
      P('Andy Dalton', 'QB', 'CIN, DAL, CAR', 254, 2025),
      P('Tony Romo', 'QB', 'DAL', 248, 2016),
      P('Patrick Mahomes', 'QB', 'KC', 267, 2025),
      P('Jay Cutler', 'QB', 'DEN, CHI, MIA', 227, 2017),
      P('Ryan Fitzpatrick', 'QB', 'BUF, HOU, MIA', 223, 2021),
      P('Jared Goff', 'QB', 'LA, DET', 256, 2025),
      P('Ryan Tannehill', 'QB', 'MIA, TEN', 216, 2023),
      P('Dak Prescott', 'QB', 'DAL', 243, 2025),
      P('Josh Allen', 'QB', 'BUF', 220, 2025),
      P('Cam Newton', 'QB', 'CAR, NE', 194, 2021),
      P('Baker Mayfield', 'QB', 'CLE, LA, TB', 197, 2025),
      P('Andrew Luck', 'QB', 'IND', 171, 2018),
      P('Lamar Jackson', 'QB', 'BAL', 187, 2025),
      P('Jameis Winston', 'QB', 'TB, NO, CLE, NYG', 156, 2025),
      P('Carson Wentz', 'QB', 'PHI, IND, LA, MIN', 159, 2025),
      P('Joe Burrow', 'QB', 'CIN', 157, 2025),
      P('Justin Herbert', 'QB', 'LAC', 163, 2025),
      P('Michael Vick', 'QB', 'ATL, PHI, NYJ', 133, 2015),
      P('Deshaun Watson', 'QB', 'HOU, CLE', 123, 2024),
      P('Kyler Murray', 'QB', 'ARI', 121, 2025),
      P('Geno Smith', 'QB', 'NYJ, SEA, LV', 124, 2025),
    ],
  },
  {
    key: 'rushYds',
    label: 'Rushing yards',
    question: 'Who ran for more career yards?',
    unit: 'rush yds',
    players: [
      P('Adrian Peterson', 'RB', 'MIN, ARI, DET', 14918, 2021),
      P('Frank Gore', 'RB', 'SF, IND, BUF', 16000, 2020),
      P('LaDainian Tomlinson', 'RB', 'LAC, NYJ', 13684, 2011),
      P('Steven Jackson', 'RB', 'LA, ATL, NE', 11438, 2015),
      P('Derrick Henry', 'RB', 'TEN, BAL', 13018, 2025),
      P('LeSean McCoy', 'RB', 'PHI, BUF, KC', 11102, 2020),
      P('Thomas Jones', 'RB', 'ARI, CHI, NYJ', 10591, 2011),
      P('Jamal Lewis', 'RB', 'BAL, CLE', 10607, 2009),
      P('Marshawn Lynch', 'RB', 'BUF, SEA, LV', 10413, 2019),
      P('Clinton Portis', 'RB', 'DEN, WAS', 9923, 2010),
      P('Matt Forte', 'RB', 'CHI, NYJ', 9796, 2017),
      P('Chris Johnson', 'RB', 'TEN, NYJ, ARI', 9651, 2017),
      P('Shaun Alexander', 'RB', 'SEA, WAS', 9453, 2008),
      P('Ezekiel Elliott', 'RB', 'DAL, NE', 9130, 2024),
      P('Willis McGahee', 'RB', 'BUF, BAL, DEN', 8474, 2013),
      P('Maurice Jones-Drew', 'RB', 'JAX, LV', 8167, 2014),
      P('Mark Ingram', 'RB', 'NO, BAL, HOU', 8111, 2022),
      P('DeAngelo Williams', 'RB', 'CAR, PIT', 8096, 2016),
      P('Jamaal Charles', 'RB', 'KC, DEN, JAX', 7563, 2018),
      P('Joe Mixon', 'RB', 'CIN, HOU', 7428, 2024),
      P('Michael Turner', 'RB', 'LAC, ATL', 7338, 2012),
      P('Jonathan Stewart', 'RB', 'CAR, NYG', 7335, 2018),
      P('Saquon Barkley', 'RB', 'NYG, PHI', 8356, 2025),
      P('DeMarco Murray', 'RB', 'DAL, PHI, TEN', 7174, 2017),
      P('Aaron Jones', 'RB', 'GB, MIN', 7626, 2025),
      P('Josh Jacobs', 'RB', 'LV, GB', 7803, 2025),
      P('Nick Chubb', 'RB', 'CLE, HOU', 7349, 2025),
      P('Alvin Kamara', 'RB', 'NO', 7250, 2025),
      P("Le'Veon Bell", 'RB', 'PIT, NYJ, KC', 6554, 2021),
      P('Melvin Gordon', 'RB', 'LAC, DEN', 6543, 2023),
      P('Arian Foster', 'RB', 'HOU, MIA', 6527, 2016),
    ],
  },
  {
    key: 'recYds',
    label: 'Receiving yards',
    question: 'Who racked up more career receiving yards?',
    unit: 'rec yds',
    players: [
      P('Larry Fitzgerald', 'WR', 'ARI', 17492, 2020),
      P('Steve Smith Sr.', 'WR', 'CAR, BAL', 14731, 2016),
      P('Reggie Wayne', 'WR', 'IND', 14345, 2014),
      P('Andre Johnson', 'WR', 'HOU, IND, TEN', 14185, 2016),
      P('Anquan Boldin', 'WR', 'ARI, BAL, SF', 13779, 2016),
      P('Julio Jones', 'WR', 'ATL, TEN, TB', 13703, 2023),
      P('Jason Witten', 'TE', 'DAL, LV', 13046, 2020),
      P('DeAndre Hopkins', 'WR', 'HOU, ARI, TEN, KC, BAL', 13295, 2025),
      P('Mike Evans', 'WR', 'TB', 13052, 2025),
      P('Brandon Marshall', 'WR', 'DEN, MIA, CHI, NYG', 12351, 2018),
      P('Antonio Brown', 'WR', 'PIT, TB', 12291, 2021),
      P('Travis Kelce', 'TE', 'KC', 13002, 2025),
      P('Davante Adams', 'WR', 'GB, LV, NYJ, LA', 12633, 2025),
      P('Antonio Gates', 'TE', 'LAC', 11841, 2018),
      P('Calvin Johnson', 'WR', 'DET', 11619, 2015),
      P('DeSean Jackson', 'WR', 'PHI, WAS, TB', 11263, 2022),
      P('Keenan Allen', 'WR', 'LAC, CHI', 12051, 2025),
      P('Tyreek Hill', 'WR', 'KC, MIA', 11363, 2025),
      P('Chad Johnson', 'WR', 'CIN, NE', 11059, 2011),
      P('Roddy White', 'WR', 'ATL', 10863, 2015),
      P('A.J. Green', 'WR', 'CIN, ARI', 10514, 2022),
      P('Stefon Diggs', 'WR', 'MIN, BUF, HOU, NE', 11504, 2025),
      P('Santana Moss', 'WR', 'NYJ, WAS', 10283, 2014),
      P('Amari Cooper', 'WR', 'LV, DAL, CLE, BUF', 10033, 2024),
      P('Wes Welker', 'WR', 'MIA, NE, DEN', 9924, 2015),
      P('T.Y. Hilton', 'WR', 'IND, DAL', 9812, 2022),
      P('Marques Colston', 'WR', 'NO', 9759, 2015),
      P('Demaryius Thomas', 'WR', 'DEN, HOU, NYJ', 9763, 2019),
      P('Brandin Cooks', 'WR', 'NO, NE, LA, HOU, BUF', 9811, 2025),
      P('Rob Gronkowski', 'TE', 'NE, TB', 9286, 2021),
      P('Emmanuel Sanders', 'WR', 'PIT, DEN, NO', 9245, 2021),
    ],
  },
  {
    key: 'recs',
    label: 'Receptions',
    question: 'Who caught more career passes?',
    unit: 'catches',
    players: [
      P('Larry Fitzgerald', 'WR', 'ARI', 1432, 2020),
      P('Steve Smith Sr.', 'WR', 'CAR, BAL', 1031, 2016),
      P('Jason Witten', 'TE', 'DAL, LV', 1228, 2020),
      P('Anquan Boldin', 'WR', 'ARI, BAL, SF', 1076, 2016),
      P('Reggie Wayne', 'WR', 'IND', 1070, 2014),
      P('Andre Johnson', 'WR', 'HOU, IND, TEN', 1062, 2016),
      P('Travis Kelce', 'TE', 'KC', 1080, 2025),
      P('DeAndre Hopkins', 'WR', 'HOU, ARI, TEN, KC, BAL', 1006, 2025),
      P('Keenan Allen', 'WR', 'LAC, CHI', 1055, 2025),
      P('Brandon Marshall', 'WR', 'DEN, MIA, CHI, NYG', 970, 2018),
      P('Davante Adams', 'WR', 'GB, LV, NYJ, LA', 1017, 2025),
      P('Antonio Gates', 'TE', 'LAC', 955, 2018),
      P('Antonio Brown', 'WR', 'PIT, TB', 928, 2021),
      P('Julio Jones', 'WR', 'ATL, TEN, TB', 914, 2023),
      P('Wes Welker', 'WR', 'MIA, NE, DEN', 903, 2015),
      P('Stefon Diggs', 'WR', 'MIN, BUF, HOU, NE', 942, 2025),
      P('Mike Evans', 'WR', 'TB', 866, 2025),
      P('Roddy White', 'WR', 'ATL', 808, 2015),
      P('Tyreek Hill', 'WR', 'KC, MIA', 819, 2025),
      P('Zach Ertz', 'TE', 'PHI, ARI, WAS', 825, 2025),
      P('Chad Johnson', 'WR', 'CIN, NE', 766, 2011),
      P('Greg Olsen', 'TE', 'CHI, CAR, SEA', 742, 2020),
      P('Calvin Johnson', 'WR', 'DET', 731, 2015),
      P('A.J. Green', 'WR', 'CIN, ARI', 727, 2022),
      P('Demaryius Thomas', 'WR', 'DEN, HOU, NYJ', 724, 2019),
      P('Jimmy Graham', 'TE', 'NO, SEA, GB, CHI', 719, 2023),
      P('Jarvis Landry', 'WR', 'MIA, CLE, NO', 713, 2022),
      P('Amari Cooper', 'WR', 'LV, DAL, CLE, BUF', 711, 2024),
      P('Brandin Cooks', 'WR', 'NO, NE, LA, HOU, BUF', 734, 2025),
      P('Emmanuel Sanders', 'WR', 'PIT, DEN, NO', 704, 2021),
    ],
  },
];
