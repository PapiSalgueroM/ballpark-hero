import { LineupConfig, GenericSimResult } from '@/lib/perfectLineupEngine';

export interface NbaPoolPlayer {
  name: string;
  pos: 'PG' | 'SG' | 'SF' | 'PF' | 'C';
  team: string; // most iconic franchise
  era: string;
  rating: number; // rough peak rating 0..99
}

// Curated pool of notable players across eras (authored with Anthony's OK).
// Team = the franchise the player is most associated with.
export const NBA_POOL: NbaPoolPlayer[] = [
  // PG
  { name: 'Magic Johnson', pos: 'PG', team: 'Lakers', era: '1980s', rating: 98 },
  { name: 'Isiah Thomas', pos: 'PG', team: 'Pistons', era: '1980s', rating: 92 },
  { name: 'John Stockton', pos: 'PG', team: 'Jazz', era: '1990s', rating: 90 },
  { name: 'Gary Payton', pos: 'PG', team: 'SuperSonics', era: '1990s', rating: 90 },
  { name: 'Jason Kidd', pos: 'PG', team: 'Nets', era: '2000s', rating: 89 },
  { name: 'Steve Nash', pos: 'PG', team: 'Suns', era: '2000s', rating: 90 },
  { name: 'Allen Iverson', pos: 'PG', team: '76ers', era: '2000s', rating: 93 },
  { name: 'Chris Paul', pos: 'PG', team: 'Clippers', era: '2010s', rating: 92 },
  { name: 'Russell Westbrook', pos: 'PG', team: 'Thunder', era: '2010s', rating: 92 },
  { name: 'Stephen Curry', pos: 'PG', team: 'Warriors', era: '2010s', rating: 98 },
  { name: 'Damian Lillard', pos: 'PG', team: 'Trail Blazers', era: '2010s', rating: 91 },
  { name: 'Kyrie Irving', pos: 'PG', team: 'Cavaliers', era: '2010s', rating: 90 },
  { name: 'Derrick Rose', pos: 'PG', team: 'Bulls', era: '2010s', rating: 88 },
  { name: 'Ja Morant', pos: 'PG', team: 'Grizzlies', era: '2020s', rating: 88 },
  { name: 'Luka Doncic', pos: 'PG', team: 'Mavericks', era: '2020s', rating: 95 },
  { name: 'Trae Young', pos: 'PG', team: 'Hawks', era: '2020s', rating: 87 },
  // SG
  { name: 'Michael Jordan', pos: 'SG', team: 'Bulls', era: '1990s', rating: 99 },
  { name: 'Clyde Drexler', pos: 'SG', team: 'Trail Blazers', era: '1990s', rating: 90 },
  { name: 'Reggie Miller', pos: 'SG', team: 'Pacers', era: '1990s', rating: 88 },
  { name: 'Kobe Bryant', pos: 'SG', team: 'Lakers', era: '2000s', rating: 98 },
  { name: 'Dwyane Wade', pos: 'SG', team: 'Heat', era: '2000s', rating: 93 },
  { name: 'Ray Allen', pos: 'SG', team: 'Celtics', era: '2000s', rating: 88 },
  { name: 'Tracy McGrady', pos: 'SG', team: 'Magic', era: '2000s', rating: 90 },
  { name: 'Vince Carter', pos: 'SG', team: 'Raptors', era: '2000s', rating: 89 },
  { name: 'James Harden', pos: 'SG', team: 'Rockets', era: '2010s', rating: 93 },
  { name: 'Klay Thompson', pos: 'SG', team: 'Warriors', era: '2010s', rating: 88 },
  { name: 'DeMar DeRozan', pos: 'SG', team: 'Raptors', era: '2010s', rating: 87 },
  { name: 'Devin Booker', pos: 'SG', team: 'Suns', era: '2020s', rating: 90 },
  { name: 'Donovan Mitchell', pos: 'SG', team: 'Cavaliers', era: '2020s', rating: 89 },
  { name: 'Anthony Edwards', pos: 'SG', team: 'Timberwolves', era: '2020s', rating: 90 },
  // SF
  { name: 'Larry Bird', pos: 'SF', team: 'Celtics', era: '1980s', rating: 97 },
  { name: 'Julius Erving', pos: 'SF', team: '76ers', era: '1980s', rating: 92 },
  { name: 'Scottie Pippen', pos: 'SF', team: 'Bulls', era: '1990s', rating: 91 },
  { name: 'Grant Hill', pos: 'SF', team: 'Pistons', era: '1990s', rating: 88 },
  { name: 'LeBron James', pos: 'SF', team: 'Cavaliers', era: '2010s', rating: 99 },
  { name: 'Kevin Durant', pos: 'SF', team: 'Thunder', era: '2010s', rating: 97 },
  { name: 'Paul George', pos: 'SF', team: 'Pacers', era: '2010s', rating: 89 },
  { name: 'Kawhi Leonard', pos: 'SF', team: 'Spurs', era: '2010s', rating: 93 },
  { name: 'Carmelo Anthony', pos: 'SF', team: 'Nuggets', era: '2000s', rating: 89 },
  { name: 'Paul Pierce', pos: 'SF', team: 'Celtics', era: '2000s', rating: 89 },
  { name: 'Jimmy Butler', pos: 'SF', team: 'Heat', era: '2020s', rating: 90 },
  { name: 'Jayson Tatum', pos: 'SF', team: 'Celtics', era: '2020s', rating: 92 },
  // PF
  { name: 'Karl Malone', pos: 'PF', team: 'Jazz', era: '1990s', rating: 95 },
  { name: 'Charles Barkley', pos: 'PF', team: 'Suns', era: '1990s', rating: 93 },
  { name: 'Dennis Rodman', pos: 'PF', team: 'Bulls', era: '1990s', rating: 84 },
  { name: 'Tim Duncan', pos: 'PF', team: 'Spurs', era: '2000s', rating: 97 },
  { name: 'Kevin Garnett', pos: 'PF', team: 'Timberwolves', era: '2000s', rating: 94 },
  { name: 'Dirk Nowitzki', pos: 'PF', team: 'Mavericks', era: '2000s', rating: 94 },
  { name: 'Pau Gasol', pos: 'PF', team: 'Lakers', era: '2000s', rating: 88 },
  { name: 'Chris Webber', pos: 'PF', team: 'Kings', era: '2000s', rating: 88 },
  { name: 'Blake Griffin', pos: 'PF', team: 'Clippers', era: '2010s', rating: 86 },
  { name: 'Anthony Davis', pos: 'PF', team: 'Pelicans', era: '2010s', rating: 93 },
  { name: 'Draymond Green', pos: 'PF', team: 'Warriors', era: '2010s', rating: 84 },
  { name: 'Giannis Antetokounmpo', pos: 'PF', team: 'Bucks', era: '2020s', rating: 97 },
  // C
  { name: 'Kareem Abdul-Jabbar', pos: 'C', team: 'Lakers', era: '1980s', rating: 98 },
  { name: 'Moses Malone', pos: 'C', team: '76ers', era: '1980s', rating: 92 },
  { name: 'Hakeem Olajuwon', pos: 'C', team: 'Rockets', era: '1990s', rating: 96 },
  { name: 'Patrick Ewing', pos: 'C', team: 'Knicks', era: '1990s', rating: 92 },
  { name: 'David Robinson', pos: 'C', team: 'Spurs', era: '1990s', rating: 94 },
  { name: 'Dikembe Mutombo', pos: 'C', team: 'Hawks', era: '1990s', rating: 84 },
  { name: 'Shaquille ONeal', pos: 'C', team: 'Lakers', era: '2000s', rating: 98 },
  { name: 'Yao Ming', pos: 'C', team: 'Rockets', era: '2000s', rating: 87 },
  { name: 'Dwight Howard', pos: 'C', team: 'Magic', era: '2000s', rating: 90 },
  { name: 'Rudy Gobert', pos: 'C', team: 'Jazz', era: '2010s', rating: 85 },
  { name: 'Joel Embiid', pos: 'C', team: '76ers', era: '2020s', rating: 95 },
  { name: 'Nikola Jokic', pos: 'C', team: 'Nuggets', era: '2020s', rating: 98 },
];

export const NBA_LINEUP_CONFIG: LineupConfig<NbaPoolPlayer> = {
  gameId: 'perfect-lineup-nba',
  gameName: 'Perfect Lineup: NBA',
  gamePath: '/perfect-lineup-nba',
  formation: [
    { label: 'PG', allowed: ['PG', 'SG'] },
    { label: 'SG', allowed: ['SG', 'PG', 'SF'] },
    { label: 'SF', allowed: ['SF', 'SG', 'PF'] },
    { label: 'PF', allowed: ['PF', 'SF', 'C'] },
    { label: 'C', allowed: ['C', 'PF'] },
  ],
  pool: NBA_POOL,
  nameOf: (p) => p.name,
  positionOf: (p) => p.pos,
  ratingOf: (p) => p.rating,
  subtitleOf: (p) => `${p.team} · ${p.era}`,
  dimensions: [
    { key: 'era', label: 'Era', valueOf: (p) => p.era },
    { key: 'team', label: 'Team', valueOf: (p) => p.team },
  ],
  chemistryOf: [(p) => p.team, (p) => p.era],
  constrainedSlots: 3,
  scoreline: (r: GenericSimResult) => {
    const f = 95 + Math.round((r.rating / 100) * 35);
    const a = 95 + Math.round(((100 - r.rating) / 100) * 20);
    return { big: `${f}-${a}`, shareScore: `a ${f}-${a} win (Grade ${r.grade}, ${r.rating} OVR)` };
  },
};
