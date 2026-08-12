// MLB Conquest data (2026-08-05, the every-sport Imperialism push).
// 30 real franchises, official primary colors, editorial strength ratings
// written in the 2026 offseason: anchors are the Dodgers' back-to-back
// World Series (2024, 2025), Toronto's 2025 pennant, Milwaukee's and
// Detroit's 2025 regular-season dominance, and Colorado's historically bad
// stretch. Ratings are simulation strengths, not stat claims.
//
// TERRITORY MODEL: the same 58 rendered US territories the NBA/NHL maps
// use. Every territory goes to the NEAREST MLB PARK, hand-checked, with
// documented editorial calls where markets stack:
//   - NY holds Yankee Stadium and Citi Field; the Yankees take NY and
//     North Jersey, the Mets hold Connecticut (both parks are a coin flip
//     from the CT line; the split guarantees both a homeland).
//   - IA goes to the White Sox (nearest parks are actually KC/Milwaukee by
//     a whisker, but the Field of Dreams belongs to the South Siders).
//   - AR goes to St. Louis (Arlington is ~30mi nearer, but Arkansas is
//     deep Cardinals radio country).
//   - CA_NE goes to the Athletics (Sacramento is their 2025-27 home).
//   - NV goes to the Angels (Vegas's nearest park in 2026 is Anaheim).
// TWO clubs start LANDLESS as THE INVADERS: Toronto (foreign soil) and
// San Diego (boxed out by the map's LA-centric California splits). In
// imperialism rules one win takes a whole empire.

export interface MlbTeam {
  id: string;
  city: string;
  name: string;
  color: string;
  overall: number;
}

export const MLB_TEAMS: MlbTeam[] = [
  { id: 'NYY', city: 'New York', name: 'Yankees', color: '#0C2340', overall: 88 },
  { id: 'BOS', city: 'Boston', name: 'Red Sox', color: '#BD3039', overall: 82 },
  { id: 'TOR', city: 'Toronto', name: 'Blue Jays', color: '#134A8E', overall: 88 },
  { id: 'TBR', city: 'Tampa Bay', name: 'Rays', color: '#092C5C', overall: 79 },
  { id: 'BAL', city: 'Baltimore', name: 'Orioles', color: '#DF4601', overall: 83 },
  { id: 'CLE', city: 'Cleveland', name: 'Guardians', color: '#E31937', overall: 81 },
  { id: 'DET', city: 'Detroit', name: 'Tigers', color: '#FA4616', overall: 86 },
  { id: 'KCR', city: 'Kansas City', name: 'Royals', color: '#004687', overall: 78 },
  { id: 'MIN', city: 'Minnesota', name: 'Twins', color: '#002B5C', overall: 76 },
  { id: 'CHW', city: 'Chicago', name: 'White Sox', color: '#27251F', overall: 70 },
  { id: 'HOU', city: 'Houston', name: 'Astros', color: '#EB6E1F', overall: 84 },
  { id: 'SEA', city: 'Seattle', name: 'Mariners', color: '#0C2C56', overall: 84 },
  { id: 'TEX', city: 'Texas', name: 'Rangers', color: '#003278', overall: 82 },
  { id: 'LAA', city: 'Los Angeles', name: 'Angels', color: '#BA0021', overall: 72 },
  { id: 'ATH', city: 'Sacramento', name: 'Athletics', color: '#003831', overall: 74 },
  { id: 'ATL', city: 'Atlanta', name: 'Braves', color: '#CE1141', overall: 85 },
  { id: 'PHI', city: 'Philadelphia', name: 'Phillies', color: '#E81828', overall: 88 },
  { id: 'NYM', city: 'New York', name: 'Mets', color: '#FF5910', overall: 87 },
  { id: 'MIA', city: 'Miami', name: 'Marlins', color: '#00A3E0', overall: 74 },
  { id: 'WSN', city: 'Washington', name: 'Nationals', color: '#AB0003', overall: 73 },
  { id: 'MIL', city: 'Milwaukee', name: 'Brewers', color: '#FFC52F', overall: 87 },
  { id: 'CHC', city: 'Chicago', name: 'Cubs', color: '#0E3386', overall: 84 },
  { id: 'STL', city: 'St. Louis', name: 'Cardinals', color: '#C41E3A', overall: 75 },
  { id: 'CIN', city: 'Cincinnati', name: 'Reds', color: '#C6011F', overall: 79 },
  { id: 'PIT', city: 'Pittsburgh', name: 'Pirates', color: '#FDB827', overall: 74 },
  { id: 'LAD', city: 'Los Angeles', name: 'Dodgers', color: '#005A9C', overall: 93 },
  { id: 'SDP', city: 'San Diego', name: 'Padres', color: '#2F241D', overall: 84 },
  { id: 'SFG', city: 'San Francisco', name: 'Giants', color: '#FD5A1E', overall: 80 },
  { id: 'ARI', city: 'Arizona', name: 'Diamondbacks', color: '#A71930', overall: 80 },
  { id: 'COL', city: 'Colorado', name: 'Rockies', color: '#333366', overall: 68 },
];

export const MLB_TEAM_MAP = new Map(MLB_TEAMS.map(t => [t.id, t]));

/** Clubs that start with no territory (see the header note). */
export const MLB_INVADERS = ['TOR', 'SDP'];

/** Nearest-MLB-park assignment for all 58 rendered territories. */
export const INITIAL_TERRITORIES_MLB: Record<string, string> = {
  // New England (no Expos anymore: Fenway owns the whole region incl Vermont)
  MA: 'BOS', RI: 'BOS', NH: 'BOS', ME: 'BOS', VT: 'BOS',
  CT: 'NYM', // editorial split of the NYC market; see header
  NY: 'NYY', NJ_N: 'NYY', NJ_S: 'PHI', PA_E: 'PHI', DE: 'PHI',
  PA_W: 'PIT', WV: 'PIT',
  MD: 'BAL', VA: 'WSN',
  // Southeast
  NC: 'ATL', SC: 'ATL', GA: 'ATL', AL: 'ATL', TN: 'ATL', MS: 'ATL',
  FL_N: 'TBR', FL_W: 'TBR', FL_S: 'MIA',
  // Ohio Valley / Midwest
  OH_NE: 'CLE', OH_SW: 'CIN', KY: 'CIN', IN: 'CIN',
  MI: 'DET',
  IL: 'CHC', IA: 'CHW', WI: 'MIL',
  MN: 'MIN', ND: 'MIN', SD: 'MIN',
  KS: 'KCR', NE: 'KCR',
  MO: 'STL', AR: 'STL',
  // South / Texas
  TX_N: 'TEX', OK: 'TEX', TX_E: 'HOU', TX_CS: 'HOU', LA: 'HOU',
  // Mountain
  CO: 'COL', WY: 'COL', UT: 'COL', MT: 'COL',
  AZ: 'ARI', NM: 'ARI',
  NV: 'LAA',
  // Pacific
  WA: 'SEA', OR: 'SEA', ID: 'SEA',
  CA_NW: 'SFG', CA_NE: 'ATH', CA_S: 'LAD', CA_SC: 'LAA',
};
