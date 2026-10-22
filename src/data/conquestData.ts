import { NFL_STATES } from '@/data/usStatesPaths';
import { TERRITORY_ADJACENCY } from '@/lib/conquestMapGeometry';
import type { ConquestMapSport } from '@/lib/conquestMapLook';

export const POWER_UP_STATES = new Set(['WY', 'MT', 'ND', 'SD', 'VT', 'NH']);

export interface StatePos {
  id: string;
  name: string;
  x: number;
  y: number;
}

// Tile-grid US map layout (580×360 viewBox, each tile 42×28)
const c = (col: number, row: number): [number, number] => [col * 46 + 10, row * 34 + 10];

export const STATE_POSITIONS: StatePos[] = [
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
  { id: 'OH_NE', name: 'Northeast Ohio', x: c(7,3)[0], y: c(7,3)[1] },
  { id: 'OH_SW', name: 'Southwest Ohio', x: c(7,4)[0], y: c(7,4)[1] },
  { id: 'PA_W', name: 'West Pennsylvania', x: c(8,3)[0], y: c(8,3)[1] },
  { id: 'PA_E', name: 'East Pennsylvania', x: c(9,3)[0] - 10, y: c(9,3)[1] },
  { id: 'NJ_N', name: 'North New Jersey', x: c(9,3)[0], y: c(9,3)[1] },
  { id: 'NJ_S', name: 'South New Jersey', x: c(9,4)[0], y: c(9,4)[1] },
  { id: 'CT', name: 'Connecticut', x: c(10,3)[0], y: c(10,3)[1] },
  { id: 'RI', name: 'Rhode Island', x: c(11,3)[0], y: c(11,3)[1] },
  { id: 'CA_N', name: 'Northern California', x: c(0,3)[0], y: c(0,3)[1] - 10 },
  { id: 'CA_NW', name: 'Bay Area', x: c(0,3)[0] - 8, y: c(0,3)[1] - 10 },
  { id: 'CA_NE', name: 'Sacramento Valley', x: c(0,3)[0] + 10, y: c(0,3)[1] - 12 },
  { id: 'CA_S', name: 'Southern California', x: c(0,4)[0], y: c(0,4)[1] },
  { id: 'CA_SC', name: 'SoCal Coast', x: c(0,5)[0], y: c(0,5)[1] - 10 },
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
  { id: 'TX_N', name: 'North Texas', x: c(3,6)[0], y: c(3,6)[1] },
  { id: 'TX_S', name: 'South Texas', x: c(3,7)[0], y: c(3,7)[1] },
  // NBA-only fine splits (rendered only by the NBA map; harmless extras here)
  { id: 'TX_E', name: 'East Texas', x: c(3,7)[0] + 24, y: c(3,7)[1] - 6 },
  { id: 'TX_CS', name: 'Central & South Texas', x: c(3,7)[0] - 14, y: c(3,7)[1] + 4 },
  { id: 'FL_N', name: 'North Florida', x: c(8,6)[0], y: c(8,6)[1] },
  { id: 'FL_W', name: 'Central Florida', x: c(8,7)[0], y: c(8,7)[1] },
  { id: 'FL_S', name: 'South Florida', x: c(9,7)[0], y: c(9,7)[1] },
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
  secondaryColor: string;
  offense: number;
  defense: number;
  overall: number;
  roster: string[];
  players?: ConquestPlayer[];
}

// ── O/D/Overall ratings (Wave B) ──
// Derivation: z-scores from nflfastr_team_stats 2025 REG season, blended 70/30
// with the hand-set `rating` field above (the pre-existing judgment component).
// Offense z-score = 0.30*passing_yards + 0.30*rushing_yards + 0.20*passing_tds + 0.20*rushing_tds
// Defense z-score = 0.45*def_sacks + 0.40*def_interceptions + 0.15*def_tds
// z-scores mapped to a 55-95 scale via (z*8 + 75), clamped, then blended:
// offense = round(0.70*offenseStatRating + 0.30*rating), same for defense.
// overall = round((offense + defense) / 2). Abbreviations normalized (LA -> LAR)
// before joining to this table's team ids. Recompute by re-running the same
// query/script if nflfastr_team_stats is refreshed for a new season.
export const NFL_TEAMS: NFLTeam[] = [
  { id: 'KC', name: 'Chiefs', city: 'Kansas City', rating: 99, color: '#E31837', secondaryColor: '#FFB81C', offense: 79, defense: 77, overall: 78, roster: [], players: [
    { name: 'Patrick Mahomes', position: 'QB', overall: 97, keyStat: '2025: 3,587 pass yds' },
    { name: 'Chris Jones', position: 'DT', overall: 97, keyStat: '' },
    { name: 'Trent McDuffie', position: 'CB', overall: 94, keyStat: '' },
    { name: 'Travis Kelce', position: 'TE', overall: 91, keyStat: '2025: 851 rec yds' },
    { name: 'Kenneth Walker', position: 'RB', overall: 84, keyStat: '2025: 1,027 rush yds' },
    { name: 'Xavier Worthy', position: 'WR', overall: 83, keyStat: '2025: 532 rec yds' },
    { name: 'Nick Bolton', position: 'LB', overall: 83, keyStat: '' },
    { name: 'Rashee Rice', position: 'WR', overall: 87, keyStat: '2025: 571 rec yds' },
    { name: 'Jawaan Taylor', position: 'OT', overall: 82, keyStat: '' },
    { name: "L'Jarius Sneed", position: 'CB', overall: 80, keyStat: '' },
  ]},
  { id: 'BUF', name: 'Bills', city: 'Buffalo', rating: 96, color: '#00338D', secondaryColor: '#C60C30', offense: 89, defense: 81, overall: 85, roster: [], players: [
    { name: 'Josh Allen', position: 'QB', overall: 99, keyStat: '2025: 3,668 pass yds' },
    { name: 'James Cook', position: 'RB', overall: 91, keyStat: '2025: 1,621 rush yds' },
    { name: 'Joey Bosa', position: 'DE', overall: 86, keyStat: '' },
    { name: 'Khalil Shakir', position: 'WR', overall: 84, keyStat: '2025: 719 rec yds' },
    { name: 'Dion Dawkins', position: 'OT', overall: 84, keyStat: '' },
    { name: 'Josh Palmer', position: 'WR', overall: 83, keyStat: '2025: 303 rec yds' },
    { name: 'Ed Oliver', position: 'DT', overall: 83, keyStat: '' },
    { name: 'Greg Rousseau', position: 'DE', overall: 83, keyStat: '' },
    { name: 'Dawson Knox', position: 'TE', overall: 81, keyStat: '' },
    { name: 'Taylor Rapp', position: 'S', overall: 79, keyStat: '' },
  ]},
  { id: 'PHI', name: 'Eagles', city: 'Philadelphia', rating: 96, color: '#004C54', secondaryColor: '#A5ACAF', offense: 81, defense: 82, overall: 82, roster: [], players: [
    { name: 'Saquon Barkley', position: 'RB', overall: 99, keyStat: '2025: 1,140 rush yds' },
    { name: 'Lane Johnson', position: 'OT', overall: 98, keyStat: '' },
    { name: 'AJ Brown', position: 'WR', overall: 93, keyStat: '2025: 1,003 rec yds' },
    { name: 'Jalen Hurts', position: 'QB', overall: 92, keyStat: '2025: 3,224 pass yds' },
    { name: 'Jalen Carter', position: 'DT', overall: 90, keyStat: '' },
    { name: 'DeVonta Smith', position: 'WR', overall: 88, keyStat: '2025: 1,008 rec yds' },
    { name: 'Zack Baun', position: 'LB', overall: 88, keyStat: '' },
    { name: 'Dallas Goedert', position: 'TE', overall: 87, keyStat: '2025: 591 rec yds' },
    { name: 'Jordan Mailata', position: 'OT', overall: 85, keyStat: '' },
    { name: 'Reed Blankenship', position: 'S', overall: 82, keyStat: '' },
  ]},
  { id: 'BAL', name: 'Ravens', city: 'Baltimore', rating: 95, color: '#241773', secondaryColor: '#9E7C0C', offense: 84, defense: 78, overall: 81, roster: [], players: [
    { name: 'Lamar Jackson', position: 'QB', overall: 99, keyStat: '2025: 2,549 pass yds' },
    { name: 'Derrick Henry', position: 'RB', overall: 98, keyStat: '2025: 1,595 rush yds' },
    { name: 'Roquan Smith', position: 'LB', overall: 94, keyStat: '' },
    { name: 'Kyle Hamilton', position: 'S', overall: 93, keyStat: '' },
    { name: 'Mark Andrews', position: 'TE', overall: 91, keyStat: '2025: 422 rec yds' },
    { name: 'Marlon Humphrey', position: 'CB', overall: 88, keyStat: '' },
    { name: 'Nnamdi Madubuike', position: 'DT', overall: 84, keyStat: '' },
    { name: 'Zay Flowers', position: 'WR', overall: 86, keyStat: '2025: 1,211 rec yds' },
    { name: 'Ronnie Stanley', position: 'OT', overall: 84, keyStat: '' },
    { name: 'Trey Hendrickson', position: 'DE', overall: 90, keyStat: '' },
  ]},
  { id: 'SF', name: '49ers', city: 'San Francisco', rating: 94, color: '#AA0000', secondaryColor: '#B3995D', offense: 83, defense: 73, overall: 78, roster: [], players: [
    { name: 'Nick Bosa', position: 'DE', overall: 96, keyStat: '' },
    { name: 'George Kittle', position: 'TE', overall: 96, keyStat: '2025: 628 rec yds' },
    { name: 'Christian McCaffrey', position: 'RB', overall: 95, keyStat: '2025: 1,202 rush yds' },
    { name: 'Fred Warner', position: 'LB', overall: 93, keyStat: '' },
    { name: 'Mike Evans', position: 'WR', overall: 88, keyStat: '2025: 368 rec yds' },
    { name: 'Deommodore Lenoir', position: 'CB', overall: 85, keyStat: '' },
    { name: 'Brock Purdy', position: 'QB', overall: 87, keyStat: '2025: 2,167 pass yds' },
    { name: 'Mykel Williams', position: 'DE', overall: 80, keyStat: '' },
    { name: 'Ricky Pearsall', position: 'WR', overall: 82, keyStat: '2025: 528 rec yds' },
    { name: "Ji'Ayir Brown", position: 'S', overall: 79, keyStat: '' },
  ]},
  { id: 'DAL', name: 'Cowboys', city: 'Dallas', rating: 93, color: '#003594', secondaryColor: '#869397', offense: 86, defense: 76, overall: 81, roster: [], players: [
    { name: 'CeeDee Lamb', position: 'WR', overall: 98, keyStat: '2025: 1,077 rec yds' },
    { name: 'Tyler Smith', position: 'OG', overall: 89, keyStat: '' },
    { name: 'Dak Prescott', position: 'QB', overall: 88, keyStat: '2025: 4,552 pass yds' },
    { name: 'George Pickens', position: 'WR', overall: 87, keyStat: '2025: 1,429 rec yds' },
    { name: 'Trevon Diggs', position: 'CB', overall: 86, keyStat: '' },
    { name: 'Kenny Clark', position: 'DT', overall: 85, keyStat: '' },
    { name: 'Jake Ferguson', position: 'TE', overall: 85, keyStat: '2025: 600 rec yds' },
    { name: 'DaRon Bland', position: 'CB', overall: 86, keyStat: '' },
    { name: 'Osa Odighizuwa', position: 'DT', overall: 82, keyStat: '' },
    { name: 'Javonte Williams', position: 'RB', overall: 82, keyStat: '2025: 1,201 rush yds' },
  ]},
  { id: 'DET', name: 'Lions', city: 'Detroit', rating: 93, color: '#0076B6', secondaryColor: '#B0B7BC', offense: 86, defense: 82, overall: 84, roster: [], players: [
    { name: 'Amon-Ra St. Brown', position: 'WR', overall: 96, keyStat: '2025: 1,401 rec yds' },
    { name: 'Penei Sewell', position: 'OT', overall: 95, keyStat: '' },
    { name: 'Aidan Hutchinson', position: 'DE', overall: 93, keyStat: '' },
    { name: 'Jahmyr Gibbs', position: 'RB', overall: 90, keyStat: '2025: 1,223 rush yds' },
    { name: 'Jared Goff', position: 'QB', overall: 89, keyStat: '2025: 4,564 pass yds' },
    { name: 'Brian Branch', position: 'S', overall: 87, keyStat: '' },
    { name: 'David Montgomery', position: 'RB', overall: 85, keyStat: '2025: 716 rush yds' },
    { name: 'Sam LaPorta', position: 'TE', overall: 85, keyStat: '2025: 489 rec yds' },
    { name: 'DJ Reed', position: 'CB', overall: 84, keyStat: '' },
    { name: 'Alim McNeill', position: 'DT', overall: 83, keyStat: '' },
  ]},
  { id: 'CIN', name: 'Bengals', city: 'Cincinnati', rating: 92, color: '#FB4F14', secondaryColor: '#000000', offense: 80, defense: 79, overall: 80, roster: [], players: [
    { name: "Ja'Marr Chase", position: 'WR', overall: 99, keyStat: '2025: 1,412 rec yds' },
    { name: 'Joe Burrow', position: 'QB', overall: 95, keyStat: '2025: 1,809 pass yds' },
    { name: 'Shemar Stewart', position: 'DE', overall: 80, keyStat: '' },
    { name: 'Tee Higgins', position: 'WR', overall: 90, keyStat: '2025: 846 rec yds' },
    { name: 'Chase Brown', position: 'RB', overall: 84, keyStat: '2025: 1,019 rush yds' },
    { name: 'BJ Hill', position: 'DT', overall: 83, keyStat: '' },
    { name: 'Demetrius Knight Jr', position: 'LB', overall: 79, keyStat: '' },
    { name: 'Cam Taylor-Britt', position: 'CB', overall: 80, keyStat: '' },
    { name: 'Ted Karras', position: 'OG', overall: 81, keyStat: '' },
    { name: 'Andrei Iosivas', position: 'WR', overall: 80, keyStat: '2025: 435 rec yds' },
  ]},
  { id: 'MIA', name: 'Dolphins', city: 'Miami', rating: 91, color: '#008E97', secondaryColor: '#FC4C02', offense: 76, defense: 75, overall: 76, roster: [], players: [
    { name: 'Malik Washington', position: 'WR', overall: 78, keyStat: '2025: 317 rec yds' },
    { name: 'Jaylen Waddle', position: 'WR', overall: 90, keyStat: '2025: 910 rec yds' },
    { name: 'Patrick Paul', position: 'OT', overall: 79, keyStat: '' },
    { name: 'Malik Willis', position: 'QB', overall: 79, keyStat: '2025: 422 pass yds' },
    { name: "De'Von Achane", position: 'RB', overall: 88, keyStat: '2025: 1,350 rush yds' },
    { name: 'Jordyn Brooks', position: 'LB', overall: 86, keyStat: '' },
    { name: 'Minkah Fitzpatrick', position: 'S', overall: 90, keyStat: '' },
    { name: 'Zach Sieler', position: 'DT', overall: 86, keyStat: '' },
    { name: 'Chop Robinson', position: 'DE', overall: 83, keyStat: '' },
    { name: 'Kenneth Grant', position: 'DT', overall: 79, keyStat: '' },
  ]},
  { id: 'NYJ', name: 'Jets', city: 'New York', rating: 88, color: '#125740', secondaryColor: '#000000', offense: 73, defense: 69, overall: 71, roster: [], players: [
    { name: 'Brandon Stephens', position: 'CB', overall: 78, keyStat: '' },
    { name: 'Garrett Wilson', position: 'WR', overall: 91, keyStat: '2025: 395 rec yds' },
    { name: 'Quinnen Williams', position: 'DT', overall: 90, keyStat: '' },
    { name: 'Breece Hall', position: 'RB', overall: 88, keyStat: '2025: 1,065 rush yds' },
    { name: 'Will McDonald', position: 'DE', overall: 83, keyStat: '' },
    { name: 'Geno Smith', position: 'QB', overall: 78, keyStat: '2025: 3,025 pass yds' },
    { name: 'David Bailey', position: 'DE', overall: 79, keyStat: '' },
    { name: 'Jamien Sherwood', position: 'LB', overall: 81, keyStat: '' },
    { name: 'Olu Fashanu', position: 'OT', overall: 80, keyStat: '' },
    { name: 'Mason Taylor', position: 'TE', overall: 79, keyStat: '2025: 369 rec yds' },
  ]},
  { id: 'CLE', name: 'Browns', city: 'Cleveland', rating: 87, color: '#311D00', secondaryColor: '#FF3C00', offense: 72, defense: 84, overall: 78, roster: [], players: [
    { name: 'Myles Garrett', position: 'DE', overall: 99, keyStat: '' },
    { name: 'Quinshon Judkins', position: 'RB', overall: 82, keyStat: '2025: 827 rush yds' },
    { name: 'Carson Schwesinger', position: 'LB', overall: 84, keyStat: '' },
    { name: 'Denzel Ward', position: 'CB', overall: 86, keyStat: '' },
    { name: 'Jerry Jeudy', position: 'WR', overall: 84, keyStat: '2025: 602 rec yds' },
    { name: 'David Njoku', position: 'TE', overall: 85, keyStat: '' },
    { name: 'Greg Newsome', position: 'CB', overall: 83, keyStat: '' },
    { name: 'Dalvin Tomlinson', position: 'DT', overall: 81, keyStat: '' },
    { name: 'Grant Delpit', position: 'S', overall: 81, keyStat: '' },
    { name: 'Shedeur Sanders', position: 'QB', overall: 75, keyStat: '2025: 1,400 pass yds' },
  ]},
  { id: 'PIT', name: 'Steelers', city: 'Pittsburgh', rating: 87, color: '#FFB612', secondaryColor: '#101820', offense: 76, defense: 82, overall: 79, roster: [], players: [
    { name: 'TJ Watt', position: 'LB', overall: 99, keyStat: '' },
    { name: 'Jalen Ramsey', position: 'CB', overall: 88, keyStat: '' },
    { name: 'DK Metcalf', position: 'WR', overall: 92, keyStat: '2025: 850 rec yds' },
    { name: 'Cam Heyward', position: 'DT', overall: 90, keyStat: '' },
    { name: 'Alex Highsmith', position: 'DE', overall: 87, keyStat: '' },
    { name: 'Joey Porter Jr', position: 'CB', overall: 85, keyStat: '' },
    { name: 'Aaron Rodgers', position: 'QB', overall: 84, keyStat: '2025: 3,322 pass yds' },
    { name: 'Pat Freiermuth', position: 'TE', overall: 83, keyStat: '2025: 486 rec yds' },
    { name: 'Rico Dowdle', position: 'RB', overall: 84, keyStat: '2025: 1,076 rush yds' },
    { name: 'Sebastian Joseph-Day', position: 'DT', overall: 78, keyStat: '' },
  ]},
  { id: 'HOU', name: 'Texans', city: 'Houston', rating: 90, color: '#03202F', secondaryColor: '#A71930', offense: 77, defense: 85, overall: 81, roster: [], players: [
    { name: 'CJ Stroud', position: 'QB', overall: 90, keyStat: '2025: 3,041 pass yds' },
    { name: 'Will Anderson', position: 'DE', overall: 90, keyStat: '' },
    { name: 'Nico Collins', position: 'WR', overall: 89, keyStat: '2025: 1,117 rec yds' },
    { name: 'Derek Stingley', position: 'CB', overall: 89, keyStat: '' },
    { name: 'Kamari Lassiter', position: 'CB', overall: 84, keyStat: '' },
    { name: 'Danielle Hunter', position: 'DE', overall: 87, keyStat: '' },
    { name: 'Jayden Higgins', position: 'WR', overall: 80, keyStat: '2025: 525 rec yds' },
    { name: 'Woody Marks', position: 'RB', overall: 81, keyStat: '2025: 703 rush yds' },
    { name: 'Jalen Pitre', position: 'S', overall: 83, keyStat: '' },
    { name: 'Dalton Schultz', position: 'TE', overall: 82, keyStat: '2025: 777 rec yds' },
  ]},
  { id: 'JAX', name: 'Jaguars', city: 'Jacksonville', rating: 86, color: '#006778', secondaryColor: '#D7A22A', offense: 80, defense: 82, overall: 81, roster: [], players: [
    { name: 'Josh Hines-Allen', position: 'LB', overall: 89, keyStat: '' },
    { name: 'Foye Oluokun', position: 'LB', overall: 88, keyStat: '' },
    { name: 'Bhayshul Tuten', position: 'RB', overall: 80, keyStat: '2025: 307 rush yds' },
    { name: 'Brian Thomas Jr', position: 'WR', overall: 86, keyStat: '2025: 707 rec yds' },
    { name: 'Trevor Lawrence', position: 'QB', overall: 86, keyStat: '2025: 4,007 pass yds' },
    { name: 'Brenton Strange', position: 'TE', overall: 81, keyStat: '2025: 540 rec yds' },
    { name: 'Tyson Campbell', position: 'CB', overall: 84, keyStat: '' },
    { name: 'Jourdan Lewis', position: 'CB', overall: 81, keyStat: '' },
    { name: 'Devin Lloyd', position: 'LB', overall: 82, keyStat: '' },
    { name: 'Travis Hunter', position: 'WR', overall: 85, keyStat: '2025: 298 rec yds' },
  ]},
  { id: 'TEN', name: 'Titans', city: 'Tennessee', rating: 78, color: '#0C2340', secondaryColor: '#4B92DB', offense: 66, defense: 72, overall: 69, roster: [], players: [
    { name: 'Jeffery Simmons', position: 'DT', overall: 91, keyStat: '' },
    { name: 'Carnell Tate', position: 'WR', overall: 79, keyStat: '' },
    { name: 'Calvin Ridley', position: 'WR', overall: 84, keyStat: '2025: 303 rec yds' },
    { name: 'Cody Barton', position: 'LB', overall: 78, keyStat: '' },
    { name: 'Tony Pollard', position: 'RB', overall: 83, keyStat: '2025: 1,082 rush yds' },
    { name: 'Peter Skoronski', position: 'OT', overall: 82, keyStat: '' },
    { name: 'Chigoziem Okonkwo', position: 'TE', overall: 81, keyStat: '2025: 560 rec yds' },
    { name: 'Amani Hooker', position: 'S', overall: 82, keyStat: '' },
    { name: "T'Vondre Sweat", position: 'DT', overall: 81, keyStat: '' },
    { name: 'Cam Ward', position: 'QB', overall: 80, keyStat: '2025: 3,169 pass yds' },
  ]},
  { id: 'IND', name: 'Colts', city: 'Indianapolis', rating: 84, color: '#002C5F', secondaryColor: '#A2AAAD', offense: 80, defense: 78, overall: 79, roster: [], players: [
    { name: 'Jonathan Taylor', position: 'RB', overall: 91, keyStat: '2025: 1,585 rush yds' },
    { name: 'DeForest Buckner', position: 'DT', overall: 91, keyStat: '' },
    { name: 'Michael Pittman', position: 'WR', overall: 85, keyStat: '2025: 784 rec yds' },
    { name: 'Tyler Warren', position: 'TE', overall: 85, keyStat: '2025: 817 rec yds' },
    { name: 'Kwity Paye', position: 'DE', overall: 83, keyStat: '' },
    { name: 'Josh Downs', position: 'WR', overall: 82, keyStat: '2025: 566 rec yds' },
    { name: 'Camryn Bynum', position: 'S', overall: 83, keyStat: '' },
    { name: 'Sauce Gardner', position: 'CB', overall: 93, keyStat: '' },
    { name: 'Bernhard Raimann', position: 'OT', overall: 81, keyStat: '' },
    { name: 'Daniel Jones', position: 'QB', overall: 83, keyStat: '2025: 3,101 pass yds' },
  ]},
  { id: 'NE', name: 'Patriots', city: 'New England', rating: 80, color: '#002244', secondaryColor: '#C60C30', offense: 84, defense: 76, overall: 80, roster: [], players: [
    { name: 'Harold Landry', position: 'DE', overall: 83, keyStat: '' },
    { name: 'Milton Williams', position: 'DT', overall: 86, keyStat: '' },
    { name: 'Christian Gonzalez', position: 'CB', overall: 90, keyStat: '' },
    { name: 'Drake Maye', position: 'QB', overall: 89, keyStat: '2025: 4,394 pass yds' },
    { name: 'Rhamondre Stevenson', position: 'RB', overall: 83, keyStat: '2025: 603 rush yds' },
    { name: 'Mike Onwenu', position: 'OG', overall: 83, keyStat: '' },
    { name: 'Carlton Davis', position: 'CB', overall: 82, keyStat: '' },
    { name: 'TreVeyon Henderson', position: 'RB', overall: 82, keyStat: '2025: 911 rush yds' },
    { name: 'Hunter Henry', position: 'TE', overall: 80, keyStat: '2025: 768 rec yds' },
    { name: 'Stefon Diggs', position: 'WR', overall: 86, keyStat: '2025: 1,013 rec yds' },
  ]},
  { id: 'LV', name: 'Raiders', city: 'Las Vegas', rating: 75, color: '#000000', secondaryColor: '#A5ACAF', offense: 65, defense: 70, overall: 68, roster: [], players: [
    { name: 'Maxx Crosby', position: 'DE', overall: 96, keyStat: '' },
    { name: 'Brock Bowers', position: 'TE', overall: 92, keyStat: '2025: 680 rec yds' },
    { name: 'Fernando Mendoza', position: 'QB', overall: 79, keyStat: '' },
    { name: 'Kolton Miller', position: 'OT', overall: 84, keyStat: '' },
    { name: 'Jeremy Chinn', position: 'S', overall: 80, keyStat: '' },
    { name: 'Ashton Jeanty', position: 'RB', overall: 86, keyStat: '2025: 975 rush yds' },
    { name: 'Tre Tucker', position: 'WR', overall: 80, keyStat: '2025: 696 rec yds' },
    { name: 'Michael Mayer', position: 'TE', overall: 79, keyStat: '2025: 328 rec yds' },
    { name: 'Tyler Linderbaum', position: 'C', overall: 88, keyStat: '' },
    { name: 'Tyree Wilson', position: 'DE', overall: 78, keyStat: '' },
  ]},
  { id: 'DEN', name: 'Broncos', city: 'Denver', rating: 83, color: '#FB4F14', secondaryColor: '#002244', offense: 80, defense: 86, overall: 83, roster: [], players: [
    { name: 'Pat Surtain', position: 'CB', overall: 96, keyStat: '' },
    { name: 'Bo Nix', position: 'QB', overall: 84, keyStat: '2025: 3,931 pass yds' },
    { name: 'Talanoa Hufanga', position: 'S', overall: 84, keyStat: '' },
    { name: 'Courtland Sutton', position: 'WR', overall: 85, keyStat: '2025: 1,017 rec yds' },
    { name: 'Dre Greenlaw', position: 'LB', overall: 82, keyStat: '' },
    { name: 'RJ Harvey', position: 'RB', overall: 81, keyStat: '2025: 540 rush yds' },
    { name: 'Nik Bonitto', position: 'DE', overall: 90, keyStat: '' },
    { name: 'Jonathon Cooper', position: 'DE', overall: 81, keyStat: '' },
    { name: 'Troy Franklin', position: 'WR', overall: 81, keyStat: '2025: 709 rec yds' },
    { name: 'Evan Engram', position: 'TE', overall: 81, keyStat: '2025: 461 rec yds' },
  ]},
  { id: 'LAC', name: 'Chargers', city: 'Los Angeles', rating: 90, color: '#0080C6', secondaryColor: '#FFC20E', offense: 80, defense: 83, overall: 82, roster: [], players: [
    { name: 'Derwin James', position: 'S', overall: 94, keyStat: '' },
    { name: 'Justin Herbert', position: 'QB', overall: 93, keyStat: '2025: 3,727 pass yds' },
    { name: 'Rashawn Slater', position: 'OT', overall: 91, keyStat: '' },
    { name: 'Quentin Johnston', position: 'WR', overall: 81, keyStat: '2025: 735 rec yds' },
    { name: 'Ladd McConkey', position: 'WR', overall: 85, keyStat: '2025: 789 rec yds' },
    { name: 'Omarion Hampton', position: 'RB', overall: 85, keyStat: '2025: 545 rush yds' },
    { name: 'Kristian Fulton', position: 'CB', overall: 83, keyStat: '' },
    { name: 'Daiyan Henley', position: 'LB', overall: 85, keyStat: '' },
    { name: 'Tre Harris', position: 'WR', overall: 79, keyStat: '2025: 324 rec yds' },
    { name: 'Oronde Gadsden II', position: 'TE', overall: 82, keyStat: '2025: 664 rec yds' },
  ]},
  { id: 'GB', name: 'Packers', city: 'Green Bay', rating: 89, color: '#203731', secondaryColor: '#FFB612', offense: 80, defense: 75, overall: 78, roster: [], players: [
    { name: 'Micah Parsons', position: 'DE', overall: 99, keyStat: '' },
    { name: 'Jordan Love', position: 'QB', overall: 89, keyStat: '2025: 3,381 pass yds' },
    { name: 'Xavier McKinney', position: 'S', overall: 88, keyStat: '' },
    { name: 'Rashan Gary', position: 'DE', overall: 87, keyStat: '' },
    { name: 'Keisean Nixon', position: 'CB', overall: 82, keyStat: '' },
    { name: 'Jayden Reed', position: 'WR', overall: 86, keyStat: '2025: 207 rec yds' },
    { name: 'Josh Jacobs', position: 'RB', overall: 86, keyStat: '' },
    { name: 'Quay Walker', position: 'LB', overall: 83, keyStat: '' },
    { name: 'Tucker Kraft', position: 'TE', overall: 82, keyStat: '2025: 489 rec yds' },
    { name: 'Devonte Wyatt', position: 'DT', overall: 80, keyStat: '' },
  ]},
  { id: 'CHI', name: 'Bears', city: 'Chicago', rating: 84, color: '#0B162A', secondaryColor: '#C83803', offense: 82, defense: 83, overall: 82, roster: [], players: [
    { name: 'Montez Sweat', position: 'DE', overall: 89, keyStat: '' },
    { name: 'Kyler Gordon', position: 'CB', overall: 82, keyStat: '' },
    { name: 'DJ Moore', position: 'WR', overall: 87, keyStat: '2025: 682 rec yds' },
    { name: 'Jaylon Johnson', position: 'CB', overall: 85, keyStat: '' },
    { name: 'Caleb Williams', position: 'QB', overall: 85, keyStat: '2025: 3,942 pass yds' },
    { name: 'Tremaine Edmunds', position: 'LB', overall: 84, keyStat: '' },
    { name: 'Rome Odunze', position: 'WR', overall: 83, keyStat: '2025: 661 rec yds' },
    { name: 'Colston Loveland', position: 'TE', overall: 83, keyStat: '2025: 713 rec yds' },
    { name: 'Gervon Dexter', position: 'DT', overall: 81, keyStat: '' },
    { name: "D'Andre Swift", position: 'RB', overall: 83, keyStat: '2025: 1,087 rush yds' },
  ]},
  { id: 'MIN', name: 'Vikings', city: 'Minnesota', rating: 88, color: '#4F2683', secondaryColor: '#FFC62F', offense: 75, defense: 80, overall: 78, roster: [], players: [
    { name: 'Justin Jefferson', position: 'WR', overall: 99, keyStat: '2025: 1,048 rec yds' },
    { name: 'TJ Hockenson', position: 'TE', overall: 88, keyStat: '2025: 438 rec yds' },
    { name: "Brian O'Neill", position: 'OT', overall: 87, keyStat: '' },
    { name: 'Josh Metellus', position: 'S', overall: 82, keyStat: '' },
    { name: 'Jonathan Greenard', position: 'DE', overall: 85, keyStat: '' },
    { name: 'Jordan Addison', position: 'WR', overall: 85, keyStat: '2025: 610 rec yds' },
    { name: 'Andrew Van Ginkel', position: 'LB', overall: 84, keyStat: '' },
    { name: 'JJ McCarthy', position: 'QB', overall: 79, keyStat: '2025: 1,632 pass yds' },
    { name: 'Byron Murphy', position: 'CB', overall: 83, keyStat: '' },
    { name: 'Aaron Jones', position: 'RB', overall: 83, keyStat: '2025: 548 rush yds' },
  ]},
  { id: 'LAR', name: 'Rams', city: 'Los Angeles', rating: 86, color: '#003594', secondaryColor: '#FFA300', offense: 86, defense: 82, overall: 84, roster: [], players: [
    { name: 'Matthew Stafford', position: 'QB', overall: 93, keyStat: '2025: 4,707 pass yds' },
    { name: 'Davante Adams', position: 'WR', overall: 91, keyStat: '2025: 789 rec yds' },
    { name: 'Kamren Kinchens', position: 'S', overall: 83, keyStat: '' },
    { name: 'Puka Nacua', position: 'WR', overall: 88, keyStat: '2025: 1,715 rec yds' },
    { name: 'Kyren Williams', position: 'RB', overall: 87, keyStat: '2025: 1,252 rush yds' },
    { name: 'Kobie Turner', position: 'DT', overall: 86, keyStat: '' },
    { name: 'Byron Young', position: 'DE', overall: 83, keyStat: '' },
    { name: 'Jared Verse', position: 'DE', overall: 88, keyStat: '' },
    { name: 'Tyler Higbee', position: 'TE', overall: 82, keyStat: '2025: 281 rec yds' },
    { name: 'Quentin Lake', position: 'S', overall: 81, keyStat: '' },
  ]},
  { id: 'SEA', name: 'Seahawks', city: 'Seattle', rating: 85, color: '#002244', secondaryColor: '#69BE28', offense: 82, defense: 85, overall: 84, roster: [], players: [
    { name: 'Jaxon Smith-Njigba', position: 'WR', overall: 93, keyStat: '2025: 1,793 rec yds' },
    { name: 'Ernest Jones', position: 'LB', overall: 85, keyStat: '' },
    { name: 'Cooper Kupp', position: 'WR', overall: 87, keyStat: '2025: 593 rec yds' },
    { name: 'Devon Witherspoon', position: 'CB', overall: 87, keyStat: '' },
    { name: 'Zach Charbonnet', position: 'RB', overall: 83, keyStat: '2025: 730 rush yds' },
    { name: 'Leonard Williams', position: 'DT', overall: 85, keyStat: '' },
    { name: 'Nick Emmanwori', position: 'S', overall: 83, keyStat: '' },
    { name: 'Sam Darnold', position: 'QB', overall: 89, keyStat: '2025: 4,048 pass yds' },
    { name: 'AJ Barner', position: 'TE', overall: 80, keyStat: '2025: 519 rec yds' },
    { name: 'DeMarcus Lawrence', position: 'DE', overall: 83, keyStat: '' },
  ]},
  { id: 'ARI', name: 'Cardinals', city: 'Arizona', rating: 82, color: '#97233F', secondaryColor: '#000000', offense: 76, defense: 73, overall: 74, roster: [], players: [
    { name: 'Budda Baker', position: 'S', overall: 88, keyStat: '' },
    { name: 'Trey McBride', position: 'TE', overall: 87, keyStat: '2025: 1,239 rec yds' },
    { name: 'Marvin Harrison Jr', position: 'WR', overall: 87, keyStat: '2025: 608 rec yds' },
    { name: 'Jacoby Brissett', position: 'QB', overall: 79, keyStat: '2025: 3,366 pass yds' },
    { name: 'Josh Sweat', position: 'DE', overall: 84, keyStat: '' },
    { name: 'Zaven Collins', position: 'LB', overall: 83, keyStat: '' },
    { name: 'Jeremiyah Love', position: 'RB', overall: 83, keyStat: '' },
    { name: 'Will Johnson', position: 'CB', overall: 80, keyStat: '' },
    { name: 'Walter Nolen', position: 'DT', overall: 79, keyStat: '' },
    { name: 'Michael Wilson', position: 'WR', overall: 79, keyStat: '2025: 1,006 rec yds' },
  ]},
  { id: 'NO', name: 'Saints', city: 'New Orleans', rating: 83, color: '#D3BC8D', secondaryColor: '#101820', offense: 71, defense: 76, overall: 74, roster: [], players: [
    { name: 'Chris Olave', position: 'WR', overall: 88, keyStat: '2025: 1,163 rec yds' },
    { name: 'Kool-Aid McKinstry', position: 'CB', overall: 81, keyStat: '' },
    { name: 'Travis Etienne', position: 'RB', overall: 86, keyStat: '2025: 1,107 rush yds' },
    { name: 'Chase Young', position: 'DE', overall: 83, keyStat: '' },
    { name: 'Demario Davis', position: 'LB', overall: 85, keyStat: '' },
    { name: 'Tyler Shough', position: 'QB', overall: 77, keyStat: '2025: 2,384 pass yds' },
    { name: 'Justin Reid', position: 'S', overall: 83, keyStat: '' },
    { name: 'Bryan Bresee', position: 'DT', overall: 81, keyStat: '' },
    { name: 'Pete Werner', position: 'LB', overall: 79, keyStat: '' },
    { name: 'Juwan Johnson', position: 'TE', overall: 79, keyStat: '2025: 889 rec yds' },
  ]},
  { id: 'TB', name: 'Buccaneers', city: 'Tampa Bay', rating: 85, color: '#D50A0A', secondaryColor: '#34302B', offense: 77, defense: 79, overall: 78, roster: [], players: [
    { name: 'Antoine Winfield', position: 'S', overall: 91, keyStat: '' },
    { name: 'Vita Vea', position: 'DT', overall: 91, keyStat: '' },
    { name: 'Emeka Egbuka', position: 'WR', overall: 85, keyStat: '2025: 938 rec yds' },
    { name: 'Baker Mayfield', position: 'QB', overall: 85, keyStat: '2025: 3,693 pass yds' },
    { name: 'Tristan Wirfs', position: 'OT', overall: 93, keyStat: '' },
    { name: 'Lavonte David', position: 'LB', overall: 85, keyStat: '' },
    { name: 'Yaya Diaby', position: 'DE', overall: 84, keyStat: '' },
    { name: 'Chris Godwin', position: 'WR', overall: 84, keyStat: '2025: 360 rec yds' },
    { name: 'Bucky Irving', position: 'RB', overall: 86, keyStat: '2025: 588 rush yds' },
    { name: 'Zyon McCollum', position: 'CB', overall: 79, keyStat: '' },
  ]},
  { id: 'ATL', name: 'Falcons', city: 'Atlanta', rating: 85, color: '#A71930', secondaryColor: '#000000', offense: 77, defense: 84, overall: 80, roster: [], players: [
    { name: 'Bijan Robinson', position: 'RB', overall: 93, keyStat: '2025: 1,478 rush yds' },
    { name: 'AJ Terrell', position: 'CB', overall: 87, keyStat: '' },
    { name: 'Drake London', position: 'WR', overall: 89, keyStat: '2025: 919 rec yds' },
    { name: 'Kyle Pitts', position: 'TE', overall: 87, keyStat: '2025: 928 rec yds' },
    { name: 'Jessie Bates', position: 'S', overall: 85, keyStat: '' },
    { name: 'Jalon Walker', position: 'LB', overall: 80, keyStat: '' },
    { name: 'Michael Penix Jr', position: 'QB', overall: 81, keyStat: '2025: 1,982 pass yds' },
    { name: 'James Pearce Jr', position: 'DE', overall: 80, keyStat: '' },
    { name: 'Divine Deablo', position: 'LB', overall: 78, keyStat: '' },
    { name: 'Darnell Mooney', position: 'WR', overall: 80, keyStat: '2025: 443 rec yds' },
  ]},
  { id: 'CAR', name: 'Panthers', city: 'Carolina', rating: 76, color: '#0085CA', secondaryColor: '#101820', offense: 74, defense: 75, overall: 75, roster: [], players: [
    { name: 'Nic Scourton', position: 'DE', overall: 78, keyStat: '' },
    { name: 'Derrick Brown', position: 'DT', overall: 83, keyStat: '' },
    { name: 'Jaycee Horn', position: 'CB', overall: 83, keyStat: '' },
    { name: 'Trevin Wallace', position: 'LB', overall: 77, keyStat: '' },
    { name: "Tre'von Moehrig", position: 'S', overall: 82, keyStat: '' },
    { name: 'Chuba Hubbard', position: 'RB', overall: 80, keyStat: '2025: 511 rush yds' },
    { name: 'Xavier Legette', position: 'WR', overall: 78, keyStat: '2025: 363 rec yds' },
    { name: 'Tetairoa McMillan', position: 'WR', overall: 85, keyStat: '2025: 1,014 rec yds' },
    { name: 'Bryce Young', position: 'QB', overall: 79, keyStat: '2025: 3,011 pass yds' },
    { name: "Ja'Tavion Sanders", position: 'TE', overall: 78, keyStat: '' },
  ]},
  { id: 'NYG', name: 'Giants', city: 'New York', rating: 77, color: '#0B2265', secondaryColor: '#A71930', offense: 75, defense: 73, overall: 74, roster: [], players: [
    { name: 'Dexter Lawrence', position: 'DT', overall: 91, keyStat: '' },
    { name: 'Malik Nabers', position: 'WR', overall: 86, keyStat: '2025: 271 rec yds' },
    { name: 'Kayvon Thibodeaux', position: 'DE', overall: 85, keyStat: '' },
    { name: 'Jevon Holland', position: 'S', overall: 84, keyStat: '' },
    { name: 'Jaxson Dart', position: 'QB', overall: 82, keyStat: '2025: 2,272 pass yds' },
    { name: "Wan'Dale Robinson", position: 'WR', overall: 82, keyStat: '2025: 1,014 rec yds' },
    { name: 'Abdul Carter', position: 'LB', overall: 87, keyStat: '' },
    { name: 'Theo Johnson', position: 'TE', overall: 79, keyStat: '2025: 528 rec yds' },
    { name: 'Cam Skattebo', position: 'RB', overall: 81, keyStat: '2025: 410 rush yds' },
    { name: 'Paulson Adebo', position: 'CB', overall: 82, keyStat: '' },
  ]},
  { id: 'WAS', name: 'Commanders', city: 'Washington', rating: 84, color: '#5A1414', secondaryColor: '#FFB612', offense: 76, defense: 74, overall: 75, roster: [], players: [
    { name: 'Jayden Daniels', position: 'QB', overall: 88, keyStat: '2025: 1,262 pass yds' },
    { name: 'Daron Payne', position: 'DT', overall: 87, keyStat: '' },
    { name: 'Terry McLaurin', position: 'WR', overall: 87, keyStat: '2025: 582 rec yds' },
    { name: 'Frankie Luvu', position: 'LB', overall: 84, keyStat: '' },
    { name: 'Deebo Samuel', position: 'WR', overall: 85, keyStat: '2025: 727 rec yds' },
    { name: 'Marshon Lattimore', position: 'CB', overall: 84, keyStat: '' },
    { name: 'Quan Martin', position: 'S', overall: 81, keyStat: '' },
    { name: 'Jacory Croskey-Merritt', position: 'RB', overall: 81, keyStat: '2025: 805 rush yds' },
    { name: 'Javon Kinlaw', position: 'DT', overall: 82, keyStat: '' },
    { name: 'Zach Ertz', position: 'TE', overall: 80, keyStat: '2025: 504 rec yds' },
  ]},
];

export const TEAM_MAP = new Map(NFL_TEAMS.map(t => [t.id, t]));

/** Round 457: what the NFL injects into the shared conquest map. Data only. */
export const NFL_CONQUEST_MAP: ConquestMapSport = {
  key: 'nfl',
  regions: NFL_STATES,
  adjacency: TERRITORY_ADJACENCY,
  teams: NFL_TEAMS,
  viewBox: { width: 590, height: 310 },
  regionNoun: 'state',
};

// Initial territory assignments, 32 teams each get 1 home state/sub-territory.
// Shared-state teams get their own real-geography sub-territory (item 83),
// not a neighboring state stand-in:
// CA split: SF → CA_N, LAR → CA_S, LAC → CA_SC
// TX split: DAL → TX_N, HOU → TX_S
// OH split: CLE → OH_NE, CIN → OH_SW
// PA split: PIT → PA_W, PHI → PA_E
// NJ split: NYG → NJ_N, NYJ → NJ_S
// FL split: JAX → FL_N, TB → FL_W, MIA → FL_S
export const INITIAL_TERRITORIES: Record<string, string> = {
  // Each team starts with ONLY their home state/region, everything else is neutral
  WA: 'SEA', CA_N: 'SF', CA_S: 'LAR', CA_SC: 'LAC', NV: 'LV', AZ: 'ARI', CO: 'DEN',
  MO: 'KC', TX_N: 'DAL', TX_S: 'HOU', MN: 'MIN', WI: 'GB', IL: 'CHI',
  MI: 'DET', OH_NE: 'CLE', OH_SW: 'CIN', PA_W: 'PIT', PA_E: 'PHI',
  NJ_N: 'NYG', NJ_S: 'NYJ', MA: 'NE', NY: 'BUF',
  FL_N: 'JAX', FL_W: 'TB', FL_S: 'MIA', GA: 'ATL', NC: 'CAR', LA: 'NO',
  TN: 'TEN', IN: 'IND', MD: 'BAL', VA: 'WAS',
};

export const DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;

export const DIR_LABELS: Record<string, string> = {
  N: '⬆️ North', NE: '↗️ Northeast', E: '➡️ East', SE: '↘️ Southeast',
  S: '⬇️ South', SW: '↙️ Southwest', W: '⬅️ West', NW: '↖️ Northwest',
};

// Compass angles in radians: 0 = North, PI/2 = East, PI = South, 3PI/2 = West
export const DIR_ANGLES: Record<string, number> = {
  N: 0, NE: Math.PI / 4, E: Math.PI / 2, SE: 3 * Math.PI / 4,
  S: Math.PI, SW: 5 * Math.PI / 4, W: 3 * Math.PI / 2, NW: 7 * Math.PI / 4,
};

// Real geographic center coordinates (lat, lon) for each state/territory
export const STATE_GEO_COORDS: Record<string, { lat: number; lon: number }> = {
  WA: { lat: 47.5, lon: -120.5 },
  OR: { lat: 44.0, lon: -120.5 },
  CA_N: { lat: 38.5, lon: -121.5 },
  CA_S: { lat: 34.0, lon: -118.0 },
  CA_SC: { lat: 34.0, lon: -118.0 },  // SoCal Coast same as LA area
  NV: { lat: 39.5, lon: -116.5 },
  ID: { lat: 44.5, lon: -114.0 },
  MT: { lat: 47.0, lon: -110.0 },
  WY: { lat: 43.0, lon: -107.5 },
  CO: { lat: 39.0, lon: -105.5 },
  UT: { lat: 39.5, lon: -111.5 },
  AZ: { lat: 34.5, lon: -111.5 },
  NM: { lat: 34.5, lon: -106.0 },
  ND: { lat: 47.5, lon: -100.5 },
  SD: { lat: 44.5, lon: -100.5 },
  NE: { lat: 41.5, lon: -99.5 },
  KS: { lat: 38.5, lon: -98.5 },
  OK: { lat: 35.5, lon: -97.5 },
  TX_N: { lat: 33.0, lon: -97.0 },
  TX_S: { lat: 29.5, lon: -95.5 },
  TX_E: { lat: 29.8, lon: -95.4 },   // Houston
  TX_CS: { lat: 29.4, lon: -98.5 },  // San Antonio
  CA_NW: { lat: 37.8, lon: -122.4 }, // Bay Area
  CA_NE: { lat: 38.6, lon: -121.5 }, // Sacramento
  MN: { lat: 46.5, lon: -94.5 },
  IA: { lat: 42.0, lon: -93.5 },
  MO: { lat: 38.5, lon: -92.5 },
  WI: { lat: 44.5, lon: -90.0 },
  IL: { lat: 40.0, lon: -89.5 },
  MI: { lat: 44.5, lon: -85.5 },
  IN: { lat: 40.0, lon: -86.5 },
  OH_NE: { lat: 41.5, lon: -81.5 },
  OH_SW: { lat: 39.0, lon: -84.5 },
  KY: { lat: 37.5, lon: -85.0 },
  TN: { lat: 36.0, lon: -86.5 },
  MS: { lat: 32.5, lon: -89.5 },
  AL: { lat: 32.5, lon: -86.5 },
  GA: { lat: 32.5, lon: -83.5 },
  FL_N: { lat: 30.5, lon: -82.0 },
  FL_W: { lat: 28.0, lon: -82.5 },
  FL_S: { lat: 25.5, lon: -80.5 },
  AR: { lat: 35.0, lon: -92.5 },
  LA: { lat: 31.0, lon: -91.5 },
  NC: { lat: 35.5, lon: -79.5 },
  SC: { lat: 33.5, lon: -81.0 },
  VA: { lat: 37.5, lon: -79.5 },
  WV: { lat: 38.5, lon: -80.5 },
  MD: { lat: 39.0, lon: -76.5 },
  PA_W: { lat: 40.5, lon: -80.0 },
  PA_E: { lat: 40.0, lon: -75.5 },
  NJ_N: { lat: 40.8, lon: -74.5 },
  NJ_S: { lat: 40.2, lon: -74.5 },
  NY: { lat: 43.0, lon: -78.5 },
  CT: { lat: 41.5, lon: -72.5 },
  MA: { lat: 42.0, lon: -71.5 },
  VT: { lat: 44.5, lon: -72.5 },
  NH: { lat: 43.5, lon: -71.5 },
  ME: { lat: 45.0, lon: -69.0 },
  RI: { lat: 41.5, lon: -71.5 },
  DE: { lat: 39.0, lon: -75.5 },
};

export const TILE_W = 42;
export const TILE_H = 28;

export function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5;
}

// ── Free Agency tab candidate (item 87) ──
// Round 1547: the panel's market is the players fallen teams left behind
// (src/lib/conquestMarket.ts). The hand typed pool of "recent free agents"
// that sat here is gone: every row was a claim about a real man's status
// that went stale the day it was typed, with career blurbs and no date.
export interface ConquestFreeAgentCandidate {
  name: string;
  position: string;
  overall: number;
  blurb: string; // one line on how he reached the market
}
