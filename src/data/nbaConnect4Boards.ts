import type { Connect4Board } from '@/types/nbaConnect4';

const curatedBoards: Connect4Board[] = [
  {
    id: 'classic-1',
    name: 'Legends & Dynasties',
    columnAttributes: ['Lakers', 'Celtics', 'Bulls', 'Warriors', 'Heat', 'Spurs', 'Nets'],
    rowAttributes: ['MVP Winner', 'Champion', '20+ PPG Career', 'All-Star', 'Top 5 Pick', 'Played in 2010s'],
  },
  {
    id: 'classic-2',
    name: 'Awards & Accolades',
    columnAttributes: ['MVP Winner', 'DPOY Winner', 'Finals MVP', '6th Man of the Year', 'Most Improved', 'Rookie of the Year', 'All-Star MVP'],
    rowAttributes: ['Lakers', 'Celtics', 'Bulls', 'Rockets', '76ers', 'Knicks'],
  },
  {
    id: 'modern-1',
    name: 'Modern Era',
    columnAttributes: ['Bucks', 'Nuggets', 'Mavericks', 'Cavaliers', 'Raptors', 'Thunder', 'Clippers'],
    rowAttributes: ['Champion', 'MVP Winner', '25+ PPG Career', 'International Player', 'Played with LeBron', '#1 Overall Pick'],
  },
  {
    id: 'stats-1',
    name: 'Stat Masters',
    columnAttributes: ['20+ PPG Career', '10+ RPG Career', '7+ APG Career', '2+ SPG Career', '2+ BPG Career', '1500+ 3PM Career', '1000+ Games Played'],
    rowAttributes: ['Lakers', 'Celtics', 'Warriors', 'Heat', 'Rockets', 'Pistons'],
  },
  {
    id: 'mixed-1',
    name: 'The Gauntlet',
    columnAttributes: ['Knicks', 'Suns', 'Pacers', 'Timberwolves', 'Hawks', 'Trail Blazers', 'Kings'],
    rowAttributes: ['All-Star', 'Champion', '15+ PPG Career', 'Played with Kobe', '#1 Overall Pick', 'International Player'],
  },
  {
    id: 'mixed-2',
    name: 'Old School vs New School',
    columnAttributes: ['Champion', 'Only One NBA Team', 'Played with LeBron', 'MVP Winner', 'International Player', '#1 Overall Pick', 'DPOY Winner'],
    rowAttributes: ['Warriors', 'Celtics', 'Heat', 'Bulls', 'Cavaliers', 'Spurs'],
  },
  {
    id: 'classic-3',
    name: 'Coast to Coast',
    columnAttributes: ['Lakers', 'Knicks', 'Bulls', 'Rockets', 'Celtics', 'Wizards', 'Grizzlies'],
    rowAttributes: ['Champion', 'All-Star', '10+ RPG Career', 'DPOY Winner', 'Traded Mid-Season', '30+ PPG Season'],
  },
  {
    id: 'mixed-3',
    name: 'Career Milestones',
    columnAttributes: ['20000+ Career Points', '10000+ Career Rebounds', '5000+ Career Assists', 'Champion', 'MVP Winner', '500+ Career Blocks', '1000+ Career Steals'],
    rowAttributes: ['Lakers', 'Celtics', 'Spurs', 'Heat', 'Bulls', 'Pistons'],
  },
];

export function getRandomConnect4Board(): Connect4Board {
  return curatedBoards[Math.floor(Math.random() * curatedBoards.length)];
}

export { curatedBoards };
