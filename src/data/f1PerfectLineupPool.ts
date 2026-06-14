import { LineupConfig, GenericSimResult } from '@/lib/perfectLineupEngine';

export interface F1PoolDriver {
  name: string;
  team: string; // constructor most associated with
  era: string;
  nationality: string;
  rating: number; // rough peak rating 0..99
}

// Curated pool of notable F1 drivers across eras (authored with Anthony's OK).
// "team" = the constructor the driver is most associated with.
export const F1_POOL: F1PoolDriver[] = [
  { name: 'Ayrton Senna', team: 'McLaren', era: '1990s', nationality: 'Brazil', rating: 98 },
  { name: 'Alain Prost', team: 'McLaren', era: '1990s', nationality: 'France', rating: 96 },
  { name: 'Nigel Mansell', team: 'Williams', era: '1990s', nationality: 'United Kingdom', rating: 90 },
  { name: 'Nelson Piquet', team: 'Williams', era: '1980s', nationality: 'Brazil', rating: 90 },
  { name: 'Niki Lauda', team: 'Ferrari', era: '1980s', nationality: 'Austria', rating: 92 },
  { name: 'Keke Rosberg', team: 'Williams', era: '1980s', nationality: 'Finland', rating: 82 },
  { name: 'Alan Jones', team: 'Williams', era: '1980s', nationality: 'Australia', rating: 82 },
  { name: 'Gerhard Berger', team: 'Ferrari', era: '1990s', nationality: 'Austria', rating: 84 },
  { name: 'Riccardo Patrese', team: 'Williams', era: '1990s', nationality: 'Italy', rating: 82 },
  { name: 'Damon Hill', team: 'Williams', era: '1990s', nationality: 'United Kingdom', rating: 86 },
  { name: 'Jacques Villeneuve', team: 'Williams', era: '1990s', nationality: 'Canada', rating: 85 },
  { name: 'Mika Hakkinen', team: 'McLaren', era: '1990s', nationality: 'Finland', rating: 92 },
  { name: 'Eddie Irvine', team: 'Ferrari', era: '1990s', nationality: 'United Kingdom', rating: 80 },
  { name: 'Michael Schumacher', team: 'Ferrari', era: '2000s', nationality: 'Germany', rating: 99 },
  { name: 'Fernando Alonso', team: 'Renault', era: '2000s', nationality: 'Spain', rating: 95 },
  { name: 'Kimi Raikkonen', team: 'Ferrari', era: '2000s', nationality: 'Finland', rating: 92 },
  { name: 'Juan Pablo Montoya', team: 'Williams', era: '2000s', nationality: 'Colombia', rating: 85 },
  { name: 'Ralf Schumacher', team: 'Williams', era: '2000s', nationality: 'Germany', rating: 80 },
  { name: 'Jenson Button', team: 'McLaren', era: '2000s', nationality: 'United Kingdom', rating: 88 },
  { name: 'Rubens Barrichello', team: 'Ferrari', era: '2000s', nationality: 'Brazil', rating: 86 },
  { name: 'Felipe Massa', team: 'Ferrari', era: '2000s', nationality: 'Brazil', rating: 85 },
  { name: 'David Coulthard', team: 'McLaren', era: '2000s', nationality: 'United Kingdom', rating: 84 },
  { name: 'Lewis Hamilton', team: 'Mercedes', era: '2010s', nationality: 'United Kingdom', rating: 98 },
  { name: 'Sebastian Vettel', team: 'Red Bull', era: '2010s', nationality: 'Germany', rating: 95 },
  { name: 'Nico Rosberg', team: 'Mercedes', era: '2010s', nationality: 'Germany', rating: 89 },
  { name: 'Mark Webber', team: 'Red Bull', era: '2010s', nationality: 'Australia', rating: 86 },
  { name: 'Daniel Ricciardo', team: 'Red Bull', era: '2010s', nationality: 'Australia', rating: 86 },
  { name: 'Valtteri Bottas', team: 'Mercedes', era: '2010s', nationality: 'Finland', rating: 85 },
  { name: 'Romain Grosjean', team: 'Haas', era: '2010s', nationality: 'France', rating: 78 },
  { name: 'Kevin Magnussen', team: 'Haas', era: '2010s', nationality: 'Denmark', rating: 76 },
  { name: 'Max Verstappen', team: 'Red Bull', era: '2020s', nationality: 'Netherlands', rating: 98 },
  { name: 'Charles Leclerc', team: 'Ferrari', era: '2020s', nationality: 'Monaco', rating: 92 },
  { name: 'Lando Norris', team: 'McLaren', era: '2020s', nationality: 'United Kingdom', rating: 91 },
  { name: 'George Russell', team: 'Mercedes', era: '2020s', nationality: 'United Kingdom', rating: 89 },
  { name: 'Carlos Sainz', team: 'Ferrari', era: '2020s', nationality: 'Spain', rating: 87 },
  { name: 'Oscar Piastri', team: 'McLaren', era: '2020s', nationality: 'Australia', rating: 89 },
  { name: 'Sergio Perez', team: 'Red Bull', era: '2020s', nationality: 'Mexico', rating: 84 },
  { name: 'Pierre Gasly', team: 'Alpine', era: '2020s', nationality: 'France', rating: 82 },
  { name: 'Esteban Ocon', team: 'Alpine', era: '2020s', nationality: 'France', rating: 81 },
  { name: 'Lance Stroll', team: 'Aston Martin', era: '2020s', nationality: 'Canada', rating: 76 },
  { name: 'Yuki Tsunoda', team: 'Red Bull', era: '2020s', nationality: 'Japan', rating: 78 },
];

export const F1_LINEUP_CONFIG: LineupConfig<F1PoolDriver> = {
  gameId: 'perfect-lineup-f1',
  gameName: 'Perfect Lineup: F1',
  gamePath: '/perfect-lineup-f1',
  formation: [
    { label: 'Driver 1', allowed: [] },
    { label: 'Driver 2', allowed: [] },
    { label: 'Driver 3', allowed: [] },
    { label: 'Driver 4', allowed: [] },
    { label: 'Driver 5', allowed: [] },
  ],
  pool: F1_POOL,
  nameOf: (p) => p.name,
  positionOf: () => '',
  ratingOf: (p) => p.rating,
  subtitleOf: (p) => `${p.team} · ${p.era}`,
  dimensions: [
    { key: 'team', label: 'Team', valueOf: (p) => p.team },
    { key: 'era', label: 'Era', valueOf: (p) => p.era },
    { key: 'nationality', label: 'Country', valueOf: (p) => p.nationality },
  ],
  chemistryOf: [(p) => p.team, (p) => p.nationality, (p) => p.era],
  constrainedSlots: 3,
  scoreline: (r: GenericSimResult) => {
    const wins = Math.round((r.rating / 100) * 22);
    return { big: `${wins} wins`, shareScore: `${wins} wins from 24 races (Grade ${r.grade}, ${r.rating} rating)` };
  },
};
