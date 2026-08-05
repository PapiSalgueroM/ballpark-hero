import type { Connect4Board } from '@/types/nhlConnect4';

/**
 * NHL Connect 4 boards (task #22 follow-on). Every attribute string used
 * here has a definition in the nhl-connect4-validate edge function's system
 * prompt, add the definition there FIRST if you add a new attribute.
 *
 * Cell feasibility spot-checks for the toughest pairings, done while
 * authoring: Maple Leafs × 500+ Goals = Mats Sundin; Sabres × 500+ Goals =
 * Dave Andreychuk; Canucks × 500+ Goals = Mats Sundin again (2008-09 VAN);
 * Kings × Rocket Richard = Ilya Kovalchuk (2004 winner, LAK 2018); Kings ×
 * Conn Smythe = Justin Williams (2014); Blue Jackets × Stanley Cup =
 * Marian Gaborik (Cup 2014 LAK, CBJ 2013-14); Jets × Stanley Cup = Dustin
 * Byfuglien (Cup 2010 CHI, Thrashers/Jets franchise); Predators × Stanley
 * Cup = Ryan O'Reilly (Cup 2019 STL, NSH 2023); Wild × Stanley Cup = Eric
 * Staal (Cup 2006 CAR, MIN 2017-20); Golden Knights × Undrafted = Jonathan
 * Marchessault; Wild × Undrafted = Mats Zuccarello.
 *
 * NOTE: young-franchise columns (Golden Knights, Jets, Wild, Predators)
 * deliberately avoid "Hall of Famer" and "#1 Overall Draft Pick" rows —
 * those intersections are empty or near-empty.
 */
const curatedBoards: Connect4Board[] = [
  {
    id: 'original-six-1',
    name: 'Original Six & Friends',
    columnAttributes: ['Maple Leafs', 'Canadiens', 'Bruins', 'Rangers', 'Blackhawks', 'Red Wings', 'Penguins'],
    rowAttributes: ['Stanley Cup Champion', 'Hart Trophy Winner', 'All-Star', 'Hall of Famer', '500+ Career Goals', 'Played in the 2010s'],
  },
  {
    id: 'silverware-1',
    name: 'Silverware',
    columnAttributes: ['Stanley Cup Champion', 'Conn Smythe Winner', 'Art Ross Winner', 'Norris Trophy Winner', 'Rocket Richard Winner', 'Hall of Famer', '#1 Overall Draft Pick'],
    rowAttributes: ['Oilers', 'Penguins', 'Avalanche', 'Lightning', 'Blackhawks', 'Kings'],
  },
  {
    id: 'snipers-1',
    name: 'Snipers Row',
    columnAttributes: ['500+ Career Goals', '50-Goal Season', '100-Point Season', '1,000+ Career Points', 'Rocket Richard Winner', 'All-Star', 'Stanley Cup Champion'],
    rowAttributes: ['Capitals', 'Sabres', 'Islanders', 'Flames', 'Blues', 'Canucks'],
  },
  {
    id: 'passports-1',
    name: 'Passports',
    columnAttributes: ['Born in Sweden', 'Born in Russia', 'Born in the USA', 'Born in Canada', 'Born in Finland', 'Born in Czechia or Slovakia', 'Undrafted'],
    rowAttributes: ['Red Wings', 'Rangers', 'Penguins', 'Avalanche', 'Stars', 'Wild'],
  },
  {
    id: 'crease-1',
    name: 'Between the Pipes',
    columnAttributes: ['Goaltender', 'Vezina Trophy Winner', 'Conn Smythe Winner', 'Stanley Cup Champion', 'Hall of Famer', 'Calder Trophy Winner', 'All-Star'],
    rowAttributes: ['Canadiens', 'Devils', 'Rangers', 'Avalanche', 'Islanders', 'Kings'],
  },
  {
    id: 'expansion-1',
    name: 'New Blood',
    columnAttributes: ['Golden Knights', 'Jets', 'Wild', 'Predators', 'Hurricanes', 'Senators', 'Blue Jackets'],
    rowAttributes: ['All-Star', 'Stanley Cup Champion', 'Played in the 2010s', 'Born in Canada', 'Born in the USA', 'Undrafted'],
  },
];

export function getRandomConnect4Board(): Connect4Board {
  return curatedBoards[Math.floor(Math.random() * curatedBoards.length)];
}

export { curatedBoards };
