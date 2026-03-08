export interface DraftGuesserPlayer {
  name: string;
  college: string;
  position: string;
  heightWeight: string;
  fortyTime: string | null;
  benchPress: string | null;
  verticalJump: string | null;
  draftRound: number | null; // null = undrafted
  draftYear: number;
  draftPick?: number;
}

export interface DraftGuesserPuzzle {
  id: string;
  players: DraftGuesserPlayer[];
}

export const draftGuesserPuzzles: DraftGuesserPuzzle[] = [
  {
    id: 'dg-001',
    players: [
      { name: 'Patrick Mahomes', college: 'Texas Tech', position: 'QB', heightWeight: '6-2, 225', fortyTime: '4.80', benchPress: null, verticalJump: '30.0"', draftRound: 1, draftYear: 2017, draftPick: 10 },
      { name: 'Dak Prescott', college: 'Mississippi State', position: 'QB', heightWeight: '6-2, 238', fortyTime: '4.79', benchPress: null, verticalJump: '32.5"', draftRound: 4, draftYear: 2016, draftPick: 135 },
      { name: 'Aaron Donald', college: 'Pittsburgh', position: 'DT', heightWeight: '6-1, 285', fortyTime: '4.68', benchPress: '35 reps', verticalJump: '32.0"', draftRound: 1, draftYear: 2014, draftPick: 13 },
      { name: 'Tony Romo', college: 'Eastern Illinois', position: 'QB', heightWeight: '6-2, 227', fortyTime: null, benchPress: null, verticalJump: null, draftRound: null, draftYear: 2003 },
      { name: 'Richard Sherman', college: 'Stanford', position: 'CB', heightWeight: '6-3, 195', fortyTime: '4.56', benchPress: null, verticalJump: '33.5"', draftRound: 5, draftYear: 2011, draftPick: 154 },
    ],
  },
  {
    id: 'dg-002',
    players: [
      { name: 'Tom Brady', college: 'Michigan', position: 'QB', heightWeight: '6-4, 211', fortyTime: '5.28', benchPress: null, verticalJump: '24.5"', draftRound: 6, draftYear: 2000, draftPick: 199 },
      { name: 'J.J. Watt', college: 'Wisconsin', position: 'DE', heightWeight: '6-5, 290', fortyTime: '4.81', benchPress: '34 reps', verticalJump: '37.0"', draftRound: 1, draftYear: 2011, draftPick: 11 },
      { name: 'Russell Wilson', college: 'Wisconsin', position: 'QB', heightWeight: '5-11, 204', fortyTime: '4.55', benchPress: null, verticalJump: '33.0"', draftRound: 3, draftYear: 2012, draftPick: 75 },
      { name: 'Tyreek Hill', college: 'West Alabama', position: 'WR', heightWeight: '5-10, 185', fortyTime: '4.29', benchPress: null, verticalJump: '35.5"', draftRound: 5, draftYear: 2016, draftPick: 165 },
      { name: 'Travis Kelce', college: 'Cincinnati', position: 'TE', heightWeight: '6-5, 260', fortyTime: '4.61', benchPress: '26 reps', verticalJump: '33.5"', draftRound: 3, draftYear: 2013, draftPick: 63 },
    ],
  },
  {
    id: 'dg-003',
    players: [
      { name: 'Lamar Jackson', college: 'Louisville', position: 'QB', heightWeight: '6-2, 212', fortyTime: '4.34', benchPress: null, verticalJump: '32.5"', draftRound: 1, draftYear: 2018, draftPick: 32 },
      { name: 'Cooper Kupp', college: 'Eastern Washington', position: 'WR', heightWeight: '6-1, 208', fortyTime: '4.62', benchPress: null, verticalJump: '35.5"', draftRound: 3, draftYear: 2017, draftPick: 69 },
      { name: 'Fred Warner', college: 'BYU', position: 'LB', heightWeight: '6-3, 236', fortyTime: '4.65', benchPress: '18 reps', verticalJump: '35.0"', draftRound: 3, draftYear: 2018, draftPick: 70 },
      { name: 'Micah Parsons', college: 'Penn State', position: 'LB', heightWeight: '6-3, 245', fortyTime: '4.39', benchPress: null, verticalJump: '34.0"', draftRound: 1, draftYear: 2021, draftPick: 12 },
      { name: 'Arian Foster', college: 'Tennessee', position: 'RB', heightWeight: '6-1, 227', fortyTime: '4.68', benchPress: null, verticalJump: null, draftRound: null, draftYear: 2009 },
    ],
  },
  {
    id: 'dg-004',
    players: [
      { name: "Ja'Marr Chase", college: 'LSU', position: 'WR', heightWeight: '6-0, 201', fortyTime: null, benchPress: null, verticalJump: null, draftRound: 1, draftYear: 2021, draftPick: 5 },
      { name: 'Stefon Diggs', college: 'Maryland', position: 'WR', heightWeight: '6-0, 195', fortyTime: '4.46', benchPress: null, verticalJump: '33.5"', draftRound: 5, draftYear: 2015, draftPick: 146 },
      { name: 'Maxx Crosby', college: 'Eastern Michigan', position: 'DE', heightWeight: '6-5, 255', fortyTime: '4.66', benchPress: '27 reps', verticalJump: '35.0"', draftRound: 4, draftYear: 2019, draftPick: 106 },
      { name: 'Josh Allen', college: 'Wyoming', position: 'QB', heightWeight: '6-5, 237', fortyTime: '4.75', benchPress: null, verticalJump: '33.5"', draftRound: 1, draftYear: 2018, draftPick: 7 },
      { name: 'Adam Thielen', college: 'Minnesota State', position: 'WR', heightWeight: '6-2, 200', fortyTime: '4.45', benchPress: null, verticalJump: '38.5"', draftRound: null, draftYear: 2013 },
    ],
  },
  {
    id: 'dg-005',
    players: [
      { name: 'Derrick Henry', college: 'Alabama', position: 'RB', heightWeight: '6-3, 247', fortyTime: '4.54', benchPress: '22 reps', verticalJump: '37.0"', draftRound: 2, draftYear: 2016, draftPick: 45 },
      { name: 'George Kittle', college: 'Iowa', position: 'TE', heightWeight: '6-4, 250', fortyTime: '4.52', benchPress: '18 reps', verticalJump: '35.5"', draftRound: 5, draftYear: 2017, draftPick: 146 },
      { name: 'Nick Bosa', college: 'Ohio State', position: 'DE', heightWeight: '6-4, 266', fortyTime: null, benchPress: null, verticalJump: null, draftRound: 1, draftYear: 2019, draftPick: 2 },
      { name: 'Darius Slay', college: 'Mississippi State', position: 'CB', heightWeight: '6-0, 190', fortyTime: '4.36', benchPress: '14 reps', verticalJump: '36.0"', draftRound: 2, draftYear: 2013, draftPick: 36 },
      { name: 'Antonio Brown', college: 'Central Michigan', position: 'WR', heightWeight: '5-10, 186', fortyTime: '4.48', benchPress: null, verticalJump: '36.5"', draftRound: 6, draftYear: 2010, draftPick: 195 },
    ],
  },
  {
    id: 'dg-006',
    players: [
      { name: 'Justin Herbert', college: 'Oregon', position: 'QB', heightWeight: '6-6, 236', fortyTime: '4.68', benchPress: null, verticalJump: '35.5"', draftRound: 1, draftYear: 2020, draftPick: 6 },
      { name: 'Davante Adams', college: 'Fresno State', position: 'WR', heightWeight: '6-1, 215', fortyTime: '4.56', benchPress: null, verticalJump: '34.5"', draftRound: 2, draftYear: 2014, draftPick: 53 },
      { name: 'Chris Jones', college: 'Mississippi State', position: 'DT', heightWeight: '6-6, 310', fortyTime: '4.95', benchPress: '32 reps', verticalJump: '30.0"', draftRound: 2, draftYear: 2016, draftPick: 37 },
      { name: 'Baker Mayfield', college: 'Oklahoma', position: 'QB', heightWeight: '6-1, 215', fortyTime: '4.84', benchPress: null, verticalJump: '28.5"', draftRound: 1, draftYear: 2018, draftPick: 1 },
      { name: 'James Robinson', college: 'Illinois State', position: 'RB', heightWeight: '5-9, 219', fortyTime: null, benchPress: null, verticalJump: null, draftRound: null, draftYear: 2020 },
    ],
  },
  {
    id: 'dg-007',
    players: [
      { name: 'Caleb Williams', college: 'USC', position: 'QB', heightWeight: '6-1, 215', fortyTime: null, benchPress: null, verticalJump: null, draftRound: 1, draftYear: 2024, draftPick: 1 },
      { name: 'Brock Purdy', college: 'Iowa State', position: 'QB', heightWeight: '6-1, 220', fortyTime: '4.74', benchPress: null, verticalJump: '30.0"', draftRound: 7, draftYear: 2022, draftPick: 262 },
      { name: 'Sauce Gardner', college: 'Cincinnati', position: 'CB', heightWeight: '6-3, 190', fortyTime: '4.41', benchPress: null, verticalJump: '35.0"', draftRound: 1, draftYear: 2022, draftPick: 4 },
      { name: 'Amon-Ra St. Brown', college: 'USC', position: 'WR', heightWeight: '6-0, 197', fortyTime: '4.51', benchPress: '14 reps', verticalJump: '34.5"', draftRound: 4, draftYear: 2021, draftPick: 112 },
      { name: 'Phillip Lindsay', college: 'Colorado', position: 'RB', heightWeight: '5-8, 190', fortyTime: '4.39', benchPress: '17 reps', verticalJump: '35.5"', draftRound: null, draftYear: 2018 },
    ],
  },
  {
    id: 'dg-008',
    players: [
      { name: 'C.J. Stroud', college: 'Ohio State', position: 'QB', heightWeight: '6-3, 218', fortyTime: '4.74', benchPress: null, verticalJump: '31.0"', draftRound: 1, draftYear: 2023, draftPick: 2 },
      { name: 'Puka Nacua', college: 'BYU', position: 'WR', heightWeight: '6-2, 213', fortyTime: '4.64', benchPress: null, verticalJump: '32.0"', draftRound: 5, draftYear: 2023, draftPick: 177 },
      { name: 'T.J. Watt', college: 'Wisconsin', position: 'LB', heightWeight: '6-4, 252', fortyTime: '4.69', benchPress: '21 reps', verticalJump: '37.0"', draftRound: 1, draftYear: 2017, draftPick: 30 },
      { name: 'Terry McLaurin', college: 'Ohio State', position: 'WR', heightWeight: '6-0, 208', fortyTime: '4.35', benchPress: '18 reps', verticalJump: '36.0"', draftRound: 3, draftYear: 2019, draftPick: 76 },
      { name: 'Victor Cruz', college: 'Massachusetts', position: 'WR', heightWeight: '6-0, 204', fortyTime: null, benchPress: null, verticalJump: null, draftRound: null, draftYear: 2010 },
    ],
  },
  {
    id: 'dg-009',
    players: [
      { name: 'Myles Garrett', college: 'Texas A&M', position: 'DE', heightWeight: '6-4, 272', fortyTime: '4.64', benchPress: '33 reps', verticalJump: '41.0"', draftRound: 1, draftYear: 2017, draftPick: 1 },
      { name: 'Mark Andrews', college: 'Oklahoma', position: 'TE', heightWeight: '6-5, 256', fortyTime: '4.67', benchPress: '17 reps', verticalJump: '36.0"', draftRound: 3, draftYear: 2018, draftPick: 86 },
      { name: 'Cameron Jordan', college: 'California', position: 'DE', heightWeight: '6-4, 287', fortyTime: '4.73', benchPress: '30 reps', verticalJump: '32.5"', draftRound: 1, draftYear: 2011, draftPick: 24 },
      { name: 'Mike Williams', college: 'Clemson', position: 'WR', heightWeight: '6-4, 218', fortyTime: '4.53', benchPress: null, verticalJump: '36.0"', draftRound: 1, draftYear: 2017, draftPick: 7 },
      { name: 'Austin Ekeler', college: 'Western State', position: 'RB', heightWeight: '5-10, 200', fortyTime: null, benchPress: null, verticalJump: null, draftRound: null, draftYear: 2017 },
    ],
  },
  {
    id: 'dg-010',
    players: [
      { name: 'Joe Burrow', college: 'LSU', position: 'QB', heightWeight: '6-4, 221', fortyTime: null, benchPress: null, verticalJump: null, draftRound: 1, draftYear: 2020, draftPick: 1 },
      { name: 'Deebo Samuel', college: 'South Carolina', position: 'WR', heightWeight: '5-11, 214', fortyTime: '4.48', benchPress: '17 reps', verticalJump: '39.0"', draftRound: 2, draftYear: 2019, draftPick: 36 },
      { name: 'Jalen Hurts', college: 'Oklahoma', position: 'QB', heightWeight: '6-1, 223', fortyTime: '4.59', benchPress: null, verticalJump: '35.5"', draftRound: 2, draftYear: 2020, draftPick: 53 },
      { name: 'Aidan Hutchinson', college: 'Michigan', position: 'DE', heightWeight: '6-7, 260', fortyTime: '4.74', benchPress: '28 reps', verticalJump: '36.0"', draftRound: 1, draftYear: 2022, draftPick: 2 },
      { name: 'Wes Welker', college: 'Texas Tech', position: 'WR', heightWeight: '5-9, 190', fortyTime: null, benchPress: null, verticalJump: null, draftRound: null, draftYear: 2004 },
    ],
  },
  {
    id: 'dg-011',
    players: [
      { name: 'Saquon Barkley', college: 'Penn State', position: 'RB', heightWeight: '6-0, 233', fortyTime: '4.40', benchPress: '29 reps', verticalJump: '41.0"', draftRound: 1, draftYear: 2018, draftPick: 2 },
      { name: 'Kirk Cousins', college: 'Michigan State', position: 'QB', heightWeight: '6-3, 214', fortyTime: '4.94', benchPress: null, verticalJump: '28.0"', draftRound: 4, draftYear: 2012, draftPick: 102 },
      { name: 'Trevon Diggs', college: 'Alabama', position: 'CB', heightWeight: '6-1, 205', fortyTime: '4.48', benchPress: null, verticalJump: '33.5"', draftRound: 2, draftYear: 2020, draftPick: 51 },
      { name: 'Will Anderson Jr.', college: 'Alabama', position: 'DE', heightWeight: '6-4, 253', fortyTime: '4.60', benchPress: '24 reps', verticalJump: '34.5"', draftRound: 1, draftYear: 2023, draftPick: 3 },
      { name: 'Chris Harris Jr.', college: 'Kansas', position: 'CB', heightWeight: '5-10, 199', fortyTime: null, benchPress: null, verticalJump: null, draftRound: null, draftYear: 2011 },
    ],
  },
  {
    id: 'dg-012',
    players: [
      { name: 'Chase Young', college: 'Ohio State', position: 'DE', heightWeight: '6-5, 264', fortyTime: '4.56', benchPress: null, verticalJump: '36.0"', draftRound: 1, draftYear: 2020, draftPick: 2 },
      { name: 'DK Metcalf', college: 'Ole Miss', position: 'WR', heightWeight: '6-3, 228', fortyTime: '4.33', benchPress: '27 reps', verticalJump: '40.5"', draftRound: 2, draftYear: 2019, draftPick: 64 },
      { name: 'Marvin Harrison Jr.', college: 'Ohio State', position: 'WR', heightWeight: '6-4, 209', fortyTime: '4.33', benchPress: null, verticalJump: '36.5"', draftRound: 1, draftYear: 2024, draftPick: 4 },
      { name: 'Sam Darnold', college: 'USC', position: 'QB', heightWeight: '6-3, 225', fortyTime: '4.85', benchPress: null, verticalJump: '30.5"', draftRound: 1, draftYear: 2018, draftPick: 3 },
      { name: 'Malcolm Butler', college: 'West Alabama', position: 'CB', heightWeight: '5-11, 190', fortyTime: null, benchPress: null, verticalJump: null, draftRound: null, draftYear: 2014 },
    ],
  },
  {
    id: 'dg-013',
    players: [
      { name: 'Justin Jefferson', college: 'LSU', position: 'WR', heightWeight: '6-1, 202', fortyTime: '4.43', benchPress: null, verticalJump: '34.0"', draftRound: 1, draftYear: 2020, draftPick: 22 },
      { name: 'Brandon Aiyuk', college: 'Arizona State', position: 'WR', heightWeight: '6-0, 205', fortyTime: '4.50', benchPress: null, verticalJump: '40.0"', draftRound: 1, draftYear: 2020, draftPick: 25 },
      { name: 'Bijan Robinson', college: 'Texas', position: 'RB', heightWeight: '5-11, 215', fortyTime: '4.46', benchPress: '22 reps', verticalJump: '36.0"', draftRound: 1, draftYear: 2023, draftPick: 8 },
      { name: 'Geno Smith', college: 'West Virginia', position: 'QB', heightWeight: '6-3, 221', fortyTime: '4.59', benchPress: null, verticalJump: '34.0"', draftRound: 2, draftYear: 2013, draftPick: 39 },
      { name: 'Jason Kelce', college: 'Cincinnati', position: 'C', heightWeight: '6-3, 295', fortyTime: '5.00', benchPress: '26 reps', verticalJump: '27.0"', draftRound: 6, draftYear: 2011, draftPick: 191 },
    ],
  },
  {
    id: 'dg-014',
    players: [
      { name: 'Kyler Murray', college: 'Oklahoma', position: 'QB', heightWeight: '5-10, 207', fortyTime: '4.36', benchPress: null, verticalJump: '35.5"', draftRound: 1, draftYear: 2019, draftPick: 1 },
      { name: 'Dexter Lawrence', college: 'Clemson', position: 'DT', heightWeight: '6-4, 342', fortyTime: '5.05', benchPress: '36 reps', verticalJump: '29.0"', draftRound: 1, draftYear: 2019, draftPick: 17 },
      { name: 'Jayden Daniels', college: 'LSU', position: 'QB', heightWeight: '6-4, 210', fortyTime: '4.47', benchPress: null, verticalJump: '35.0"', draftRound: 1, draftYear: 2024, draftPick: 2 },
      { name: 'Rashawn Slater', college: 'Northwestern', position: 'OT', heightWeight: '6-4, 304', fortyTime: null, benchPress: null, verticalJump: null, draftRound: 1, draftYear: 2021, draftPick: 13 },
      { name: 'Miles Sanders', college: 'Penn State', position: 'RB', heightWeight: '5-11, 211', fortyTime: '4.49', benchPress: null, verticalJump: '36.0"', draftRound: 2, draftYear: 2019, draftPick: 53 },
    ],
  },
  {
    id: 'dg-015',
    players: [
      { name: 'Tua Tagovailoa', college: 'Alabama', position: 'QB', heightWeight: '6-0, 217', fortyTime: null, benchPress: null, verticalJump: null, draftRound: 1, draftYear: 2020, draftPick: 5 },
      { name: 'A.J. Brown', college: 'Ole Miss', position: 'WR', heightWeight: '6-0, 226', fortyTime: '4.49', benchPress: null, verticalJump: '36.5"', draftRound: 2, draftYear: 2019, draftPick: 51 },
      { name: 'Bryce Young', college: 'Alabama', position: 'QB', heightWeight: '5-10, 204', fortyTime: '4.55', benchPress: null, verticalJump: '32.5"', draftRound: 1, draftYear: 2023, draftPick: 1 },
      { name: 'Jonathan Taylor', college: 'Wisconsin', position: 'RB', heightWeight: '5-10, 226', fortyTime: '4.39', benchPress: '17 reps', verticalJump: '36.0"', draftRound: 2, draftYear: 2020, draftPick: 41 },
      { name: 'Jake Elliott', college: 'Memphis', position: 'K', heightWeight: '5-9, 167', fortyTime: null, benchPress: null, verticalJump: null, draftRound: 5, draftYear: 2017, draftPick: 153 },
    ],
  },
];
