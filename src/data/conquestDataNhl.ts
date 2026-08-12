// NHL Conquest data (2026-08-05, the every-sport Imperialism push).
// Mirrors conquestDataNba.ts shape. 32 real franchises, official primary
// colors, editorial strength ratings written in the 2026 offseason:
// anchors are Florida's back-to-back Cups (2024, 2025), Edmonton's two
// straight Final runs, Winnipeg's 2024-25 Presidents' Trophy, and the
// rebuild curves in San Jose (Celebrini) and Chicago (Bedard). Ratings are
// strengths for simulation, not stat claims.
//
// TERRITORY MODEL: the same 58 rendered US territories the NBA map uses
// (NBA_STATES in usStatesPaths). Every territory is assigned to the NEAREST
// NHL ARENA, hand-checked; three Canadian clubs hold legitimate
// nearest-arena border footholds (Montreal-Vermont 95mi, Winnipeg-North
// Dakota 145mi to Grand Forks, Calgary-Montana 280mi to Great Falls).
// FIVE clubs genuinely have no nearest-arena claim on any US territory:
// Toronto, Ottawa, Edmonton, Vancouver (US neighbors closer to another
// arena) and Buffalo (upstate New York is one territory and Manhattan's
// Rangers hold it). They start LANDLESS as THE INVADERS: in imperialism
// rules one win takes a whole empire, so they are playable from round one.

export interface NhlTeam {
  id: string;
  city: string;
  name: string;
  color: string;
  overall: number;
}

export const NHL_TEAMS: NhlTeam[] = [
  { id: 'BOS', city: 'Boston', name: 'Bruins', color: '#FFB81C', overall: 78 },
  { id: 'BUF', city: 'Buffalo', name: 'Sabres', color: '#003087', overall: 76 },
  { id: 'DET', city: 'Detroit', name: 'Red Wings', color: '#CE1126', overall: 79 },
  { id: 'FLA', city: 'Florida', name: 'Panthers', color: '#C8102E', overall: 92 },
  { id: 'MTL', city: 'Montreal', name: 'Canadiens', color: '#AF1E2D', overall: 81 },
  { id: 'OTT', city: 'Ottawa', name: 'Senators', color: '#DA1A32', overall: 81 },
  { id: 'TBL', city: 'Tampa Bay', name: 'Lightning', color: '#002868', overall: 85 },
  { id: 'TOR', city: 'Toronto', name: 'Maple Leafs', color: '#00205B', overall: 85 },
  { id: 'CAR', city: 'Carolina', name: 'Hurricanes', color: '#CE1126', overall: 87 },
  { id: 'CBJ', city: 'Columbus', name: 'Blue Jackets', color: '#002654', overall: 80 },
  { id: 'NJD', city: 'New Jersey', name: 'Devils', color: '#CE1126', overall: 84 },
  { id: 'NYI', city: 'New York', name: 'Islanders', color: '#00539B', overall: 78 },
  { id: 'NYR', city: 'New York', name: 'Rangers', color: '#0038A8', overall: 80 },
  { id: 'PHI', city: 'Philadelphia', name: 'Flyers', color: '#F74902', overall: 77 },
  { id: 'PIT', city: 'Pittsburgh', name: 'Penguins', color: '#FCB514', overall: 76 },
  { id: 'WSH', city: 'Washington', name: 'Capitals', color: '#041E42', overall: 85 },
  { id: 'CHI', city: 'Chicago', name: 'Blackhawks', color: '#CF0A2C', overall: 75 },
  { id: 'COL', city: 'Colorado', name: 'Avalanche', color: '#6F263D', overall: 88 },
  { id: 'DAL', city: 'Dallas', name: 'Stars', color: '#006847', overall: 88 },
  { id: 'MIN', city: 'Minnesota', name: 'Wild', color: '#154734', overall: 82 },
  { id: 'NSH', city: 'Nashville', name: 'Predators', color: '#FFB81C', overall: 76 },
  { id: 'STL', city: 'St. Louis', name: 'Blues', color: '#002F87', overall: 82 },
  { id: 'UTA', city: 'Utah', name: 'Mammoth', color: '#6CACE4', overall: 80 },
  { id: 'WPG', city: 'Winnipeg', name: 'Jets', color: '#041E42', overall: 86 },
  { id: 'ANA', city: 'Anaheim', name: 'Ducks', color: '#F47A38', overall: 78 },
  { id: 'CGY', city: 'Calgary', name: 'Flames', color: '#D2001C', overall: 80 },
  { id: 'EDM', city: 'Edmonton', name: 'Oilers', color: '#FF4C00', overall: 90 },
  { id: 'LAK', city: 'Los Angeles', name: 'Kings', color: '#A2AAAD', overall: 84 },
  { id: 'SJS', city: 'San Jose', name: 'Sharks', color: '#006D75', overall: 74 },
  { id: 'SEA', city: 'Seattle', name: 'Kraken', color: '#99D9D9', overall: 77 },
  { id: 'VAN', city: 'Vancouver', name: 'Canucks', color: '#00843D', overall: 81 },
  { id: 'VGK', city: 'Vegas', name: 'Golden Knights', color: '#B4975A', overall: 86 },
];

export const NHL_TEAM_MAP = new Map(NHL_TEAMS.map(t => [t.id, t]));

/** Clubs that start with no territory (see the header note). */
export const NHL_INVADERS = ['TOR', 'OTT', 'EDM', 'VAN', 'BUF'];

/**
 * Nearest-NHL-arena assignment for all 58 rendered territories.
 * Hand-tuned 2026-08-05; distances checked market by market. Editorial
 * calls documented inline where two arenas are close.
 */
export const INITIAL_TERRITORIES_NHL: Record<string, string> = {
  // New England
  MA: 'BOS', RI: 'BOS', NH: 'BOS', ME: 'BOS',
  CT: 'NYI', // Bridgeport is Islanders country (their AHL home); Boston and MSG are both ~60mi from the border
  VT: 'MTL', // Burlington's nearest NHL arena is the Bell Centre, 95 miles
  // New York / Mid-Atlantic
  NY: 'NYR', NJ_N: 'NJD', NJ_S: 'PHI', PA_E: 'PHI', DE: 'PHI',
  PA_W: 'PIT', WV: 'PIT',
  MD: 'WSH', VA: 'WSH',
  // Southeast
  NC: 'CAR', SC: 'CAR',
  GA: 'NSH', // Atlanta's nearest NHL arena is Bridgestone, ~250mi
  FL_N: 'TBL', FL_W: 'TBL', FL_S: 'FLA',
  AL: 'NSH', TN: 'NSH', KY: 'NSH', MS: 'NSH',
  // Ohio Valley / Midwest
  OH_NE: 'CBJ', OH_SW: 'CBJ', IN: 'CBJ', // Indy to Nationwide 175mi edges Chicago's 183
  MI: 'DET',
  IL: 'CHI', WI: 'CHI',
  MN: 'MIN', IA: 'MIN', SD: 'MIN', NE: 'MIN',
  ND: 'WPG', // Grand Forks to Canada Life Centre is 145mi, the closest NHL rink to North Dakota
  MO: 'STL', KS: 'STL',
  // South / Texas
  AR: 'DAL', LA: 'DAL', OK: 'DAL', TX_N: 'DAL', TX_E: 'DAL', TX_CS: 'DAL',
  // Mountain
  CO: 'COL', WY: 'COL', NM: 'COL',
  UT: 'UTA', ID: 'UTA',
  NV: 'VGK', AZ: 'VGK',
  MT: 'CGY', // Great Falls to the Saddledome is ~280mi, closer than any US rink
  // Pacific
  WA: 'SEA', OR: 'SEA',
  CA_NW: 'SJS', CA_NE: 'SJS', CA_S: 'LAK', CA_SC: 'ANA',
};
