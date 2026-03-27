export const POWER_UP_STATES = new Set(['WY', 'MT', 'ND', 'SD', 'VT', 'NH', 'AK']);

export interface StatePos {
  id: string;
  name: string;
  x: number;
  y: number;
}

// Tile-grid US map layout (580×360 viewBox, each tile 42×28)
const c = (col: number, row: number): [number, number] => [col * 46 + 10, row * 34 + 10];

export const STATE_POSITIONS: StatePos[] = [
  { id: 'AK', name: 'Alaska', x: c(0,0)[0], y: c(0,0)[1] },
  { id: 'ME', name: 'Maine', x: c(11,0)[0], y: c(11,0)[1] },
  { id: 'VT', name: 'Vermont', x: c(9,1)[0], y: c(9,1)[1] },
  { id: 'NH', name: 'New Hampshire', x: c(10,1)[0], y: c(10,1)[1] },
  { id: 'WA', name: 'Washington', x: c(0,2)[0], y: c(0,2)[1] },
  { id: 'ID', name: 'Idaho', x: c(1,2)[0], y: c(1,2)[1] },
  { id: 'MT', name: 'Montana', x: c(2,2)[0], y: c(2,2)[1] },
  { id: 'ND', name: 'North Dakota', x: c(3,2)[0], y: c(3,2)[1] },
  { id: 'MN', name: 'Minnesota', x: c(4,2)[0], y: c(4,2)[1] },
  { id: 'WI', name: 'Wisconsin', x: c(6,2)[0], y: c(6,2)[1] },
  { id: 'MI', name: 'Michigan', x: c(8,2)[0], y: c(8,2)[1] },
  { id: 'NY', name: 'New York', x: c(9,2)[0], y: c(9,2)[1] },
  { id: 'MA', name: 'Massachusetts', x: c(10,2)[0], y: c(10,2)[1] },
  { id: 'OR', name: 'Oregon', x: c(0,3)[0], y: c(0,3)[1] },
  { id: 'NV', name: 'Nevada', x: c(1,3)[0], y: c(1,3)[1] },
  { id: 'WY', name: 'Wyoming', x: c(2,3)[0], y: c(2,3)[1] },
  { id: 'SD', name: 'South Dakota', x: c(3,3)[0], y: c(3,3)[1] },
  { id: 'IA', name: 'Iowa', x: c(4,3)[0], y: c(4,3)[1] },
  { id: 'IL', name: 'Illinois', x: c(5,3)[0], y: c(5,3)[1] },
  { id: 'IN', name: 'Indiana', x: c(6,3)[0], y: c(6,3)[1] },
  { id: 'OH', name: 'Ohio', x: c(7,3)[0], y: c(7,3)[1] },
  { id: 'PA', name: 'Pennsylvania', x: c(8,3)[0], y: c(8,3)[1] },
  { id: 'NJ', name: 'New Jersey', x: c(9,3)[0], y: c(9,3)[1] },
  { id: 'CT', name: 'Connecticut', x: c(10,3)[0], y: c(10,3)[1] },
  { id: 'RI', name: 'Rhode Island', x: c(11,3)[0], y: c(11,3)[1] },
  { id: 'CA', name: 'California', x: c(0,4)[0], y: c(0,4)[1] },
  { id: 'UT', name: 'Utah', x: c(1,4)[0], y: c(1,4)[1] },
  { id: 'CO', name: 'Colorado', x: c(2,4)[0], y: c(2,4)[1] },
  { id: 'NE', name: 'Nebraska', x: c(3,4)[0], y: c(3,4)[1] },
  { id: 'MO', name: 'Missouri', x: c(4,4)[0], y: c(4,4)[1] },
  { id: 'KY', name: 'Kentucky', x: c(5,4)[0], y: c(5,4)[1] },
  { id: 'WV', name: 'West Virginia', x: c(7,4)[0], y: c(7,4)[1] },
  { id: 'VA', name: 'Virginia', x: c(8,4)[0], y: c(8,4)[1] },
  { id: 'MD', name: 'Maryland', x: c(9,4)[0], y: c(9,4)[1] },
  { id: 'DE', name: 'Delaware', x: c(10,4)[0], y: c(10,4)[1] },
  { id: 'AZ', name: 'Arizona', x: c(1,5)[0], y: c(1,5)[1] },
  { id: 'NM', name: 'New Mexico', x: c(2,5)[0], y: c(2,5)[1] },
  { id: 'KS', name: 'Kansas', x: c(3,5)[0], y: c(3,5)[1] },
  { id: 'AR', name: 'Arkansas', x: c(4,5)[0], y: c(4,5)[1] },
  { id: 'TN', name: 'Tennessee', x: c(5,5)[0], y: c(5,5)[1] },
  { id: 'NC', name: 'North Carolina', x: c(7,5)[0], y: c(7,5)[1] },
  { id: 'SC', name: 'South Carolina', x: c(8,5)[0], y: c(8,5)[1] },
  { id: 'OK', name: 'Oklahoma', x: c(3,6)[0], y: c(3,6)[1] },
  { id: 'LA', name: 'Louisiana', x: c(4,6)[0], y: c(4,6)[1] },
  { id: 'MS', name: 'Mississippi', x: c(5,6)[0], y: c(5,6)[1] },
  { id: 'AL', name: 'Alabama', x: c(6,6)[0], y: c(6,6)[1] },
  { id: 'GA', name: 'Georgia', x: c(7,6)[0], y: c(7,6)[1] },
  { id: 'HI', name: 'Hawaii', x: c(0,7)[0], y: c(0,7)[1] },
  { id: 'TX', name: 'Texas', x: c(3,7)[0], y: c(3,7)[1] },
  { id: 'FL', name: 'Florida', x: c(8,7)[0], y: c(8,7)[1] },
];

export interface ConquestPlayer {
  name: string;
  position: string;
  overall: number;
  keyStat: string;
}

export interface NFLTeam {
  id: string;
  name: string;
  city: string;
  rating: number;
  color: string;
  roster: string[];
  players?: ConquestPlayer[];
}

export const NFL_TEAMS: NFLTeam[] = [
  { id: 'SEA', name: 'Seahawks', city: 'Seattle', rating: 96, color: '#002244', roster: ['Geno Smith', 'DK Metcalf', 'Jaxon Smith-Njigba', 'Devon Witherspoon', 'Leonard Williams'] },
  { id: 'NE', name: 'Patriots', city: 'New England', rating: 89, color: '#002244', roster: ['Drake Maye', 'Rhamondre Stevenson', 'Ja\'Lynn Polk', 'Christian Gonzalez', 'Keion White'] },
  { id: 'PHI', name: 'Eagles', city: 'Philadelphia', rating: 88, color: '#004C54', roster: ['Jalen Hurts', 'Saquon Barkley', 'A.J. Brown', 'DeVonta Smith', 'Quinyon Mitchell'] },
  { id: 'LAR', name: 'Rams', city: 'Los Angeles', rating: 88, color: '#003594', roster: ['Matthew Stafford', 'Puka Nacua', 'Cooper Kupp', 'Jared Verse', 'Kyren Williams'] },
  { id: 'BAL', name: 'Ravens', city: 'Baltimore', rating: 87, color: '#241773', roster: ['Lamar Jackson', 'Derrick Henry', 'Zay Flowers', 'Roquan Smith', 'Marlon Humphrey'] },
  { id: 'BUF', name: 'Bills', city: 'Buffalo', rating: 86, color: '#00338D', roster: ['Josh Allen', 'James Cook', 'Khalil Shakir', 'Ed Oliver', 'Matt Milano'] },
  { id: 'GB', name: 'Packers', city: 'Green Bay', rating: 85, color: '#203731', roster: ['Jordan Love', 'Josh Jacobs', 'Jayden Reed', 'Jaire Alexander', 'Rashan Gary'] },
  { id: 'SF', name: '49ers', city: 'San Francisco', rating: 85, color: '#AA0000', roster: ['Brock Purdy', 'Christian McCaffrey', 'Deebo Samuel', 'Nick Bosa', 'Fred Warner'] },
  { id: 'DEN', name: 'Broncos', city: 'Denver', rating: 84, color: '#FB4F14', roster: ['Bo Nix', 'Javonte Williams', 'Courtland Sutton', 'Pat Surtain II', 'Nik Bonitto'] },
  { id: 'DET', name: 'Lions', city: 'Detroit', rating: 83, color: '#0076B6', roster: ['Jared Goff', 'Jahmyr Gibbs', 'Amon-Ra St. Brown', 'Aidan Hutchinson', 'Brian Branch'] },
  { id: 'LAC', name: 'Chargers', city: 'Los Angeles', rating: 82, color: '#0080C6', roster: ['Justin Herbert', 'J.K. Dobbins', 'Ladd McConkey', 'Khalil Mack', 'Derwin James'] },
  { id: 'CHI', name: 'Bears', city: 'Chicago', rating: 80, color: '#0B162A', roster: ['Caleb Williams', 'D\'Andre Swift', 'DJ Moore', 'Montez Sweat', 'Jaylon Johnson'] },
  { id: 'HOU', name: 'Texans', city: 'Houston', rating: 80, color: '#03202F', roster: ['C.J. Stroud', 'Joe Mixon', 'Nico Collins', 'Will Anderson Jr.', 'Derek Stingley Jr.'] },
  { id: 'DAL', name: 'Cowboys', city: 'Dallas', rating: 79, color: '#003594', roster: ['Dak Prescott', 'CeeDee Lamb', 'Micah Parsons', 'DeMarcus Lawrence', 'Trevon Diggs'] },
  { id: 'MIN', name: 'Vikings', city: 'Minnesota', rating: 78, color: '#4F2683', roster: ['Sam Darnold', 'Justin Jefferson', 'Aaron Jones', 'Jonathan Greenard', 'Byron Murphy Jr.'] },
  { id: 'JAX', name: 'Jaguars', city: 'Jacksonville', rating: 78, color: '#006778', roster: ['Trevor Lawrence', 'Travis Etienne', 'Brian Thomas Jr.', 'Josh Hines-Allen', 'Tyson Campbell'] },
  { id: 'PIT', name: 'Steelers', city: 'Pittsburgh', rating: 77, color: '#FFB612', roster: ['Russell Wilson', 'Najee Harris', 'George Pickens', 'T.J. Watt', 'Minkah Fitzpatrick'] },
  { id: 'CIN', name: 'Bengals', city: 'Cincinnati', rating: 76, color: '#FB4F14', roster: ['Joe Burrow', 'Ja\'Marr Chase', 'Tee Higgins', 'Trey Hendrickson', 'Sam Hubbard'] },
  { id: 'CAR', name: 'Panthers', city: 'Carolina', rating: 76, color: '#0085CA', roster: ['Bryce Young', 'Chuba Hubbard', 'Adam Thielen', 'Derrick Brown', 'Jaycee Horn'] },
  { id: 'KC', name: 'Chiefs', city: 'Kansas City', rating: 74, color: '#E31837', roster: ['Patrick Mahomes', 'Isiah Pacheco', 'Travis Kelce', 'Chris Jones', 'Trent McDuffie'] },
  { id: 'WAS', name: 'Commanders', city: 'Washington', rating: 73, color: '#5A1414', roster: ['Jayden Daniels', 'Brian Robinson Jr.', 'Terry McLaurin', 'Jonathan Allen', 'Marshon Lattimore'] },
  { id: 'TB', name: 'Buccaneers', city: 'Tampa Bay', rating: 73, color: '#D50A0A', roster: ['Baker Mayfield', 'Bucky Irving', 'Mike Evans', 'Vita Vea', 'Antoine Winfield Jr.'] },
  { id: 'CLE', name: 'Browns', city: 'Cleveland', rating: 72, color: '#311D00', roster: ['Jameis Winston', 'Nick Chubb', 'Jerry Jeudy', 'Myles Garrett', 'Denzel Ward'] },
  { id: 'ATL', name: 'Falcons', city: 'Atlanta', rating: 72, color: '#A71930', roster: ['Michael Penix Jr.', 'Bijan Robinson', 'Drake London', 'Grady Jarrett', 'Jessie Bates III'] },
  { id: 'NO', name: 'Saints', city: 'New Orleans', rating: 71, color: '#D3BC8D', roster: ['Derek Carr', 'Alvin Kamara', 'Chris Olave', 'Cameron Jordan', 'Tyrann Mathieu'] },
  { id: 'TEN', name: 'Titans', city: 'Tennessee', rating: 70, color: '#0C2340', roster: ['Will Levis', 'Tony Pollard', 'Calvin Ridley', 'Harold Landry III', 'Jeffery Simmons'] },
  { id: 'IND', name: 'Colts', city: 'Indianapolis', rating: 68, color: '#002C5F', roster: ['Anthony Richardson', 'Jonathan Taylor', 'Michael Pittman Jr.', 'DeForest Buckner', 'Kenny Moore II'] },
  { id: 'MIA', name: 'Dolphins', city: 'Miami', rating: 68, color: '#008E97', roster: ['Tua Tagovailoa', 'De\'Von Achane', 'Tyreek Hill', 'Jaylen Waddle', 'Jalen Ramsey'] },
  { id: 'NYG', name: 'Giants', city: 'New York', rating: 65, color: '#0B2265', roster: ['Drew Lock', 'Malik Nabers', 'Wan\'Dale Robinson', 'Dexter Lawrence', 'Kayvon Thibodeaux'] },
  { id: 'ARI', name: 'Cardinals', city: 'Arizona', rating: 62, color: '#97233F', roster: ['Kyler Murray', 'James Conner', 'Marvin Harrison Jr.', 'Budda Baker', 'Zaven Collins'] },
  { id: 'LV', name: 'Raiders', city: 'Las Vegas', rating: 60, color: '#000000', roster: ['Aidan O\'Connell', 'Zamir White', 'Jakobi Meyers', 'Maxx Crosby', 'Marcus Epps'] },
  { id: 'NYJ', name: 'Jets', city: 'New York', rating: 58, color: '#125740', roster: ['Garrett Wilson', 'Breece Hall', 'Sauce Gardner', 'Quinnen Williams', 'Jermaine Johnson'] },
];

export const TEAM_MAP = new Map(NFL_TEAMS.map(t => [t.id, t]));

// Initial territory assignments — 32 teams each get 1 state, rest unclaimed
export const INITIAL_TERRITORIES: Record<string, string> = {
  WA: 'SEA', MA: 'NE', MD: 'BAL', IN: 'IND', CO: 'DEN', NV: 'LV',
  MI: 'DET', WI: 'GB', MN: 'MIN', LA: 'NO', TN: 'TEN', AZ: 'ARI',
  OH: 'CLE', NY: 'BUF', TX: 'DAL', CA: 'LAR', FL: 'JAX', PA: 'PHI',
  MO: 'KC', NC: 'CAR', VA: 'WAS', NJ: 'NYG', IL: 'CHI', GA: 'ATL',
  KY: 'CIN', CT: 'NYJ', OR: 'SF', UT: 'LAC', SC: 'MIA', AL: 'TB',
  WV: 'PIT', MS: 'HOU',
};

export const DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;

export const DIR_LABELS: Record<string, string> = {
  N: '⬆️ North', NE: '↗️ Northeast', E: '➡️ East', SE: '↘️ Southeast',
  S: '⬇️ South', SW: '↙️ Southwest', W: '⬅️ West', NW: '↖️ Northwest',
};

export const DIR_ANGLES: Record<string, number> = {
  N: -Math.PI / 2, NE: -Math.PI / 4, E: 0, SE: Math.PI / 4,
  S: Math.PI / 2, SW: 3 * Math.PI / 4, W: Math.PI, NW: -3 * Math.PI / 4,
};

export const TILE_W = 42;
export const TILE_H = 28;

export function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5;
}
