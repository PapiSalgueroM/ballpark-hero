export interface FreeAgent {
  name: string;
  position: string;
  overall: number;
}

export const FREE_AGENTS: FreeAgent[] = [
  { name: 'Stefon Diggs', position: 'WR', overall: 88 },
  { name: 'Odell Beckham', position: 'WR', overall: 84 },
  { name: 'Ndamukong Suh', position: 'DT', overall: 82 },
  { name: 'Adrian Peterson', position: 'RB', overall: 80 },
  { name: 'Earl Thomas', position: 'S', overall: 82 },
  { name: 'Eric Berry', position: 'S', overall: 81 },
  { name: 'Dez Bryant', position: 'WR', overall: 80 },
  { name: 'Josh Norman', position: 'CB', overall: 79 },
  { name: "Le'Veon Bell", position: 'RB', overall: 80 },
  { name: 'Demaryius Thomas', position: 'WR', overall: 78 },
  { name: 'Marshawn Lynch', position: 'RB', overall: 79 },
  { name: 'Michael Crabtree', position: 'WR', overall: 77 },
  { name: 'Reggie Wayne', position: 'WR', overall: 76 },
  { name: 'Anquan Boldin', position: 'WR', overall: 77 },
  { name: 'Vernon Davis', position: 'TE', overall: 78 },
  { name: 'Cordarrelle Patterson', position: 'RB', overall: 78 },
  { name: 'Golden Tate', position: 'WR', overall: 77 },
  { name: 'Danny Amendola', position: 'WR', overall: 76 },
  { name: 'Pierre Garcon', position: 'WR', overall: 76 },
  { name: 'Torrey Smith', position: 'WR', overall: 75 },
];

export interface LegendPlayer {
  name: string;
  position: string;
  overall: number;
}

export const TEAM_LEGENDS: Record<string, LegendPlayer> = {
  KC: { name: 'Derrick Thomas', position: 'DE', overall: 99 },
  BUF: { name: 'Bruce Smith', position: 'DE', overall: 99 },
  PHI: { name: 'Reggie White', position: 'DE', overall: 99 },
  BAL: { name: 'Ray Lewis', position: 'LB', overall: 99 },
  SF: { name: 'Jerry Rice', position: 'WR', overall: 99 },
  DAL: { name: 'Emmitt Smith', position: 'RB', overall: 99 },
  DET: { name: 'Barry Sanders', position: 'RB', overall: 99 },
  CIN: { name: 'Chad Johnson', position: 'WR', overall: 99 },
  MIA: { name: 'Dan Marino', position: 'QB', overall: 99 },
  NYJ: { name: 'Joe Namath', position: 'QB', overall: 99 },
  CLE: { name: 'Jim Brown', position: 'RB', overall: 99 },
  PIT: { name: 'Terry Bradshaw', position: 'QB', overall: 99 },
  HOU: { name: 'JJ Watt', position: 'DE', overall: 99 },
  JAX: { name: 'Tony Boselli', position: 'OT', overall: 99 },
  TEN: { name: 'Steve McNair', position: 'QB', overall: 99 },
  IND: { name: 'Peyton Manning', position: 'QB', overall: 99 },
  NE: { name: 'Tom Brady', position: 'QB', overall: 99 },
  LV: { name: 'Bo Jackson', position: 'RB', overall: 99 },
  DEN: { name: 'John Elway', position: 'QB', overall: 99 },
  LAC: { name: 'LaDainian Tomlinson', position: 'RB', overall: 99 },
  GB: { name: 'Brett Favre', position: 'QB', overall: 99 },
  CHI: { name: 'Walter Payton', position: 'RB', overall: 99 },
  MIN: { name: 'Adrian Peterson', position: 'RB', overall: 99 },
  LAR: { name: 'Marshall Faulk', position: 'RB', overall: 99 },
  SEA: { name: 'Marshawn Lynch', position: 'RB', overall: 99 },
  ARI: { name: 'Larry Fitzgerald', position: 'WR', overall: 99 },
  NO: { name: 'Drew Brees', position: 'QB', overall: 99 },
  TB: { name: 'Derrick Brooks', position: 'LB', overall: 99 },
  ATL: { name: 'Julio Jones', position: 'WR', overall: 99 },
  CAR: { name: 'Cam Newton', position: 'QB', overall: 99 },
  NYG: { name: 'Lawrence Taylor', position: 'LB', overall: 99 },
  WAS: { name: 'Darrell Green', position: 'CB', overall: 99 },
};

export type PowerupId = 'invincibility' | 'free_agent' | 'upgrade' | 'legend' | 'territory_steal';

export interface PowerupDef {
  id: PowerupId;
  label: string;
  icon: string;
  description: string;
}

export const POWERUPS: PowerupDef[] = [
  { id: 'invincibility', label: 'Invincibility', icon: '🛡️', description: 'Survive your next loss — keep all states and stay alive.' },
  { id: 'free_agent', label: 'Free Agent Signing', icon: '✍️', description: 'Sign a top free agent or eliminated player to your roster.' },
  { id: 'upgrade', label: 'Upgrade', icon: '⬆️', description: 'Boost a random roster player to 99 OVR for your next battle.' },
  { id: 'legend', label: 'All-Time Great', icon: '🐐', description: 'Add your franchise legend at 99 OVR permanently.' },
  { id: 'territory_steal', label: 'Territory Steal', icon: '🗺️', description: 'Instantly claim a random enemy border state.' },
];

export function getRandomPowerup(): PowerupDef {
  return POWERUPS[Math.floor(Math.random() * POWERUPS.length)];
}
