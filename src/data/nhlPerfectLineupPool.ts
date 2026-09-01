import { LineupConfig, GenericSimResult } from '@/lib/perfectLineupEngine';

export interface NhlPoolPlayer {
  name: string;
  pos: 'LW' | 'C' | 'RW' | 'D' | 'G';
  team: string; // most associated franchise
  era: string;
  rating: number; // rough peak rating 0..99
}

// Curated pool of notable NHL players across eras (authored with the owner's OK).
// Positions/teams/eras restricted to players I'm confident about.
export const NHL_POOL: NhlPoolPlayer[] = [
  // Centers
  { name: 'Wayne Gretzky', pos: 'C', team: 'Oilers', era: '1980s', rating: 99 },
  { name: 'Mario Lemieux', pos: 'C', team: 'Penguins', era: '1990s', rating: 99 },
  { name: 'Mark Messier', pos: 'C', team: 'Oilers', era: '1980s', rating: 95 },
  { name: 'Sidney Crosby', pos: 'C', team: 'Penguins', era: '2010s', rating: 98 },
  { name: 'Joe Sakic', pos: 'C', team: 'Avalanche', era: '2000s', rating: 94 },
  { name: 'Peter Forsberg', pos: 'C', team: 'Avalanche', era: '2000s', rating: 93 },
  { name: 'Steve Yzerman', pos: 'C', team: 'Red Wings', era: '1990s', rating: 94 },
  { name: 'Pavel Datsyuk', pos: 'C', team: 'Red Wings', era: '2000s', rating: 92 },
  { name: 'Evgeni Malkin', pos: 'C', team: 'Penguins', era: '2010s', rating: 93 },
  { name: 'Jonathan Toews', pos: 'C', team: 'Blackhawks', era: '2010s', rating: 90 },
  { name: 'Connor McDavid', pos: 'C', team: 'Oilers', era: '2020s', rating: 99 },
  { name: 'Nathan MacKinnon', pos: 'C', team: 'Avalanche', era: '2020s', rating: 96 },
  { name: 'Auston Matthews', pos: 'C', team: 'Maple Leafs', era: '2020s', rating: 95 },
  { name: 'Leon Draisaitl', pos: 'C', team: 'Oilers', era: '2020s', rating: 94 },
  { name: 'Patrice Bergeron', pos: 'C', team: 'Bruins', era: '2010s', rating: 90 },
  { name: 'Joe Thornton', pos: 'C', team: 'Sharks', era: '2000s', rating: 89 },
  // Left Wings
  { name: 'Alex Ovechkin', pos: 'LW', team: 'Capitals', era: '2010s', rating: 98 },
  { name: 'Luc Robitaille', pos: 'LW', team: 'Kings', era: '1990s', rating: 90 },
  { name: 'Brad Marchand', pos: 'LW', team: 'Bruins', era: '2010s', rating: 89 },
  { name: 'Ilya Kovalchuk', pos: 'LW', team: 'Thrashers', era: '2000s', rating: 89 },
  { name: 'Artemi Panarin', pos: 'LW', team: 'Rangers', era: '2020s', rating: 91 },
  { name: 'Jamie Benn', pos: 'LW', team: 'Stars', era: '2010s', rating: 86 },
  { name: 'John LeClair', pos: 'LW', team: 'Flyers', era: '1990s', rating: 86 },
  { name: 'Keith Tkachuk', pos: 'LW', team: 'Coyotes', era: '1990s', rating: 86 },
  { name: 'Brendan Shanahan', pos: 'LW', team: 'Red Wings', era: '1990s', rating: 90 },
  // Right Wings
  { name: 'Gordie Howe', pos: 'RW', team: 'Red Wings', era: '1960s', rating: 97 },
  { name: 'Jaromir Jagr', pos: 'RW', team: 'Penguins', era: '1990s', rating: 96 },
  { name: 'Brett Hull', pos: 'RW', team: 'Blues', era: '1990s', rating: 94 },
  { name: 'Mike Bossy', pos: 'RW', team: 'Islanders', era: '1980s', rating: 93 },
  { name: 'Teemu Selanne', pos: 'RW', team: 'Ducks', era: '2000s', rating: 91 },
  { name: 'Patrick Kane', pos: 'RW', team: 'Blackhawks', era: '2010s', rating: 92 },
  { name: 'Jarome Iginla', pos: 'RW', team: 'Flames', era: '2000s', rating: 90 },
  { name: 'Pavel Bure', pos: 'RW', team: 'Canucks', era: '1990s', rating: 91 },
  { name: 'Marian Hossa', pos: 'RW', team: 'Blackhawks', era: '2010s', rating: 88 },
  { name: 'David Pastrnak', pos: 'RW', team: 'Bruins', era: '2020s', rating: 91 },
  { name: 'Nikita Kucherov', pos: 'RW', team: 'Lightning', era: '2020s', rating: 93 },
  // Defensemen
  { name: 'Bobby Orr', pos: 'D', team: 'Bruins', era: '1970s', rating: 99 },
  { name: 'Ray Bourque', pos: 'D', team: 'Bruins', era: '1990s', rating: 95 },
  { name: 'Nicklas Lidstrom', pos: 'D', team: 'Red Wings', era: '2000s', rating: 96 },
  { name: 'Paul Coffey', pos: 'D', team: 'Oilers', era: '1980s', rating: 90 },
  { name: 'Chris Chelios', pos: 'D', team: 'Red Wings', era: '1990s', rating: 90 },
  { name: 'Chris Pronger', pos: 'D', team: 'Blues', era: '2000s', rating: 90 },
  { name: 'Scott Niedermayer', pos: 'D', team: 'Devils', era: '2000s', rating: 90 },
  { name: 'Erik Karlsson', pos: 'D', team: 'Senators', era: '2010s', rating: 90 },
  { name: 'Victor Hedman', pos: 'D', team: 'Lightning', era: '2010s', rating: 91 },
  { name: 'Cale Makar', pos: 'D', team: 'Avalanche', era: '2020s', rating: 94 },
  { name: 'Drew Doughty', pos: 'D', team: 'Kings', era: '2010s', rating: 89 },
  { name: 'Shea Weber', pos: 'D', team: 'Predators', era: '2010s', rating: 88 },
  { name: 'Denis Potvin', pos: 'D', team: 'Islanders', era: '1980s', rating: 92 },
  // Goalies
  { name: 'Patrick Roy', pos: 'G', team: 'Avalanche', era: '1990s', rating: 98 },
  { name: 'Martin Brodeur', pos: 'G', team: 'Devils', era: '2000s', rating: 96 },
  { name: 'Dominik Hasek', pos: 'G', team: 'Sabres', era: '1990s', rating: 97 },
  { name: 'Ed Belfour', pos: 'G', team: 'Stars', era: '2000s', rating: 90 },
  { name: 'Carey Price', pos: 'G', team: 'Canadiens', era: '2010s', rating: 91 },
  { name: 'Henrik Lundqvist', pos: 'G', team: 'Rangers', era: '2010s', rating: 91 },
  { name: 'Andrei Vasilevskiy', pos: 'G', team: 'Lightning', era: '2020s', rating: 93 },
  { name: 'Marc-Andre Fleury', pos: 'G', team: 'Penguins', era: '2010s', rating: 89 },
];

export const NHL_LINEUP_CONFIG: LineupConfig<NhlPoolPlayer> = {
  gameId: 'perfect-lineup-nhl',
  gameName: 'Perfect Lineup: NHL',
  gamePath: '/perfect-lineup-nhl',
  formation: [
    { label: 'LW', allowed: ['LW'] },
    { label: 'C', allowed: ['C'] },
    { label: 'RW', allowed: ['RW'] },
    { label: 'D', allowed: ['D'] },
    { label: 'D', allowed: ['D'] },
    { label: 'G', allowed: ['G'] },
  ],
  pool: NHL_POOL,
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
    const f = Math.max(1, Math.round((r.rating / 100) * 6));
    const a = Math.max(0, Math.round(((100 - r.rating) / 100) * 3));
    return { big: `${f}-${a}`, shareScore: `a ${f}-${a} win (Grade ${r.grade}, ${r.rating} OVR)` };
  },
};
