import type { Connect4Board } from '@/types/mlbConnect4';

/**
 * MLB Connect 4 boards (task #22). Every attribute string used here has a
 * definition in the mlb-connect4-validate edge function's system prompt —
 * add the definition there FIRST if you add a new attribute string.
 *
 * Cell feasibility spot-checks done while authoring (every column×row pair
 * needs at least one real answer; toughest cells verified by example):
 * Royals × 3000+ Hits = George Brett; Royals × World Series MVP = Salvador
 * Pérez; Rays × MVP Winner = José Canseco (1988 MVP, Rays 1999-2000);
 * Guardians × Hall of Famer = Bob Feller; Twins × Born Outside the USA =
 * Tony Oliva; White Sox × Cy Young = Jack McDowell; Angels × World Series
 * Champion = 2002 roster; Blue Jays × Rookie of the Year = Alfredo Griffin.
 */
const curatedBoards: Connect4Board[] = [
  {
    id: 'classic-1',
    name: 'October Legends',
    columnAttributes: ['Yankees', 'Red Sox', 'Dodgers', 'Cardinals', 'Giants', 'Braves', 'Cubs'],
    rowAttributes: ['MVP Winner', 'World Series Champion', 'All-Star', '500+ Career Home Runs', 'Hall of Famer', 'Gold Glove Winner'],
  },
  {
    id: 'aces-1',
    name: 'Aces & Arms',
    columnAttributes: ['Cy Young Winner', '3000+ Career Strikeouts', '300+ Career Saves', 'Left-Handed Pitcher', 'No-Hitter Thrown', '20+ Win Season', 'World Series Champion'],
    rowAttributes: ['Yankees', 'Dodgers', 'Mets', 'Astros', 'Phillies', 'Tigers'],
  },
  {
    id: 'bats-1',
    name: 'Big Bats',
    columnAttributes: ['3000+ Career Hits', '500+ Career Home Runs', '.300+ Career Average', '40+ HR Season', 'Switch Hitter', 'Batting Champion', 'Silver Slugger Winner'],
    rowAttributes: ['Yankees', 'Red Sox', 'Mariners', 'Rangers', 'Padres', 'Pirates'],
  },
  {
    id: 'modern-1',
    name: 'Modern Era',
    columnAttributes: ['Astros', 'Blue Jays', 'Nationals', 'Rays', 'Mets', 'Angels', 'Braves'],
    rowAttributes: ['All-Star', 'World Series Champion', 'MVP Winner', '40+ HR Season', 'Rookie of the Year', 'Born Outside the USA'],
  },
  {
    id: 'legends-1',
    name: 'Cooperstown Row',
    columnAttributes: ['Hall of Famer', 'MVP Winner', '3000+ Career Hits', 'World Series MVP', 'Only One MLB Team', '30/30 Season', 'All-Star'],
    rowAttributes: ['Cardinals', 'Giants', 'Tigers', 'Royals', 'Reds', 'Orioles'],
  },
  {
    id: 'mixed-1',
    name: 'Coast to Coast',
    columnAttributes: ['Dodgers', 'Athletics', 'Mariners', 'Cubs', 'White Sox', 'Twins', 'Guardians'],
    rowAttributes: ['MVP Winner', 'Cy Young Winner', '40+ HR Season', 'Gold Glove Winner', 'Born Outside the USA', 'Hall of Famer'],
  },
];

export function getRandomConnect4Board(): Connect4Board {
  return curatedBoards[Math.floor(Math.random() * curatedBoards.length)];
}

export { curatedBoards };
