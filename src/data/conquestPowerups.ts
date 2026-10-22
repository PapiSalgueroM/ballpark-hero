/* A name the Sign a Player power up can deal. lastSeason is set only on a
   retired great, and the dialog prints it beside his name. */
export interface FreeAgent {
  name: string;
  position: string;
  overall: number;
  lastSeason?: string;
}

export interface RetiredGreat {
  name: string;
  position: string;
  overall: number;
  lastSeason: string;
}

/* Round 1547: the Sign a Player power up's own pool is retired greats, and it
   says so. Until this round it was "top free agents" and dealt a man who died
   in 2021 beside men retired for a decade, and NBA Conquest dealt this same
   football list onto basketball rosters. Every row here is a man whose
   retirement and last season two publishers print, recorded with both in
   scripts/data/conquestPeopleSources2026-10.json; scripts/simConquestPeople.mjs
   holds the two together and keeps any name on the ledger's deceased list
   out. No franchise legend (TEAM_LEGENDS, TEAM_LEGENDS_NBA) and nobody on a
   Conquest roster. The overall is the game's rating, not a claim. */
export const RETIRED_GREATS_NFL: RetiredGreat[] = [
  { name: 'Calvin Johnson', position: 'WR', overall: 84, lastSeason: '2015' },
  { name: 'Luke Kuechly', position: 'LB', overall: 84, lastSeason: '2019' },
  { name: 'Andrew Luck', position: 'QB', overall: 84, lastSeason: '2018' },
  { name: 'Troy Polamalu', position: 'S', overall: 82, lastSeason: '2014' },
  { name: 'Tony Gonzalez', position: 'TE', overall: 82, lastSeason: '2013' },
  { name: 'Darrelle Revis', position: 'CB', overall: 82, lastSeason: '2017' },
  { name: 'Charles Woodson', position: 'S', overall: 80, lastSeason: '2015' },
  { name: 'Vernon Davis', position: 'TE', overall: 78, lastSeason: '2019' },
  { name: 'Anquan Boldin', position: 'WR', overall: 77, lastSeason: '2016' },
  { name: 'Reggie Wayne', position: 'WR', overall: 76, lastSeason: '2014' },
];

export const RETIRED_GREATS_NBA: RetiredGreat[] = [
  { name: 'Steve Nash', position: 'G', overall: 82, lastSeason: '2013-14' },
  { name: 'Pau Gasol', position: 'F-C', overall: 82, lastSeason: '2018-19' },
  { name: 'Paul Pierce', position: 'F', overall: 82, lastSeason: '2016-17' },
  { name: 'Carmelo Anthony', position: 'F', overall: 82, lastSeason: '2021-22' },
  { name: 'Yao Ming', position: 'C', overall: 82, lastSeason: '2010-11' },
  { name: 'Tony Parker', position: 'G', overall: 80, lastSeason: '2018-19' },
  { name: 'Manu Ginobili', position: 'G', overall: 80, lastSeason: '2017-18' },
  { name: 'Ray Allen', position: 'G', overall: 80, lastSeason: '2013-14' },
  { name: 'Derrick Rose', position: 'G', overall: 80, lastSeason: '2023-24' },
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
  { id: 'invincibility', label: 'Invincibility', icon: '🛡️', description: 'Survive your next loss, keep all states and stay alive.' },
  { id: 'free_agent', label: 'Sign a Player', icon: '✍️', description: 'Sign a player from a fallen team, or call a retired great back for one more run.' },
  { id: 'upgrade', label: 'Upgrade', icon: '⬆️', description: 'Choose a roster player to boost to 99 OVR for your next battle.' },
  { id: 'legend', label: 'All-Time Great', icon: '🐐', description: 'Add your franchise legend at 99 OVR permanently.' },
  { id: 'territory_steal', label: 'Territory Steal', icon: '🗺️', description: 'Claim a bordering enemy state of your choice.' },
];

export function getRandomPowerup(): PowerupDef {
  return POWERUPS[Math.floor(Math.random() * POWERUPS.length)];
}
