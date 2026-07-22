import type { Connect4Board } from '@/types/nflConnect4';

/**
 * NFL Connect 4 boards (task #22 follow-on). Every attribute string used
 * here has a definition in the nfl-connect4-validate edge function's system
 * prompt — add the definition there FIRST if you add a new attribute.
 *
 * Cell feasibility spot-checks for the toughest pairings, done while
 * authoring: Chargers × Super Bowl MVP = Drew Brees (SB44 MVP, SD 2001-05);
 * Jaguars × Super Bowl Champion = Mark Brunell (SB44 Saints); Bills ×
 * Super Bowl Champion = Drew Bledsoe (SB36 Patriots roster); Cardinals ×
 * Undrafted = Kurt Warner; Colts × Undrafted = Adam Vinatieri; Vikings ×
 * Undrafted = John Randle; Raiders × Undrafted = James Jett; Eagles ×
 * #1 Overall = Sam Bradford; Chiefs × #1 Overall = Eric Fisher; Lions ×
 * League MVP = Barry Sanders; Vikings × League MVP = Fran Tarkenton.
 */
const curatedBoards: Connect4Board[] = [
  {
    id: 'dynasties-1',
    name: 'Dynasties',
    columnAttributes: ['Patriots', 'Steelers', 'Cowboys', '49ers', 'Packers', 'Giants', 'Chiefs'],
    rowAttributes: ['Super Bowl Champion', 'League MVP', 'Pro Bowler', 'Hall of Famer', 'All-Pro', 'Played in the 2010s'],
  },
  {
    id: 'qbs-1',
    name: 'Field Generals',
    columnAttributes: ['40,000+ Career Passing Yards', 'League MVP', 'Super Bowl MVP', '#1 Overall Draft Pick', '4,000-Yard Passing Season', 'Hall of Famer', 'Super Bowl Champion'],
    rowAttributes: ['Colts', 'Broncos', 'Packers', 'Saints', 'Chargers', 'Buccaneers'],
  },
  {
    id: 'ground-1',
    name: 'Ground & Pound',
    columnAttributes: ['10,000+ Career Rushing Yards', '1,500-Yard Rushing Season', 'Rookie of the Year', 'Hall of Famer', 'Pro Bowler', 'Super Bowl Champion', 'League MVP'],
    rowAttributes: ['Cowboys', 'Bears', 'Rams', 'Titans', 'Vikings', 'Lions'],
  },
  {
    id: 'airraid-1',
    name: 'Air Raid',
    columnAttributes: ['10,000+ Career Receiving Yards', '100+ Receiving TDs', '1,000+ Career Receptions', 'Pro Bowler', 'Super Bowl Champion', 'Undrafted', 'Hall of Famer'],
    rowAttributes: ['Cardinals', 'Bengals', 'Vikings', 'Steelers', 'Colts', 'Raiders'],
  },
  {
    id: 'defense-1',
    name: 'Steel Curtain',
    columnAttributes: ['100+ Career Sacks', '50+ Career Interceptions', 'Defensive Player of the Year', 'Hall of Famer', 'Super Bowl Champion', 'Pro Bowler', 'All-Pro'],
    rowAttributes: ['Steelers', 'Ravens', 'Bears', 'Broncos', 'Seahawks', 'Eagles'],
  },
  {
    id: 'modern-1',
    name: 'New School',
    columnAttributes: ['Chiefs', 'Bills', 'Eagles', 'Bengals', 'Lions', 'Texans', 'Jaguars'],
    rowAttributes: ['Pro Bowler', '4,000-Yard Passing Season', 'Rookie of the Year', 'Super Bowl Champion', 'Played in the 2010s', '#1 Overall Draft Pick'],
  },
];

export function getRandomConnect4Board(): Connect4Board {
  return curatedBoards[Math.floor(Math.random() * curatedBoards.length)];
}

export { curatedBoards };
