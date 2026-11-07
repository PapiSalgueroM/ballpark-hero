import type { CareerState } from './soccerCareerEngine';

export const MAX_WORLD_NAMES = 28;

export const SOCCER_HISTORICAL_PLAYERS = [
  { id: 'soccer:neymar', name: 'Neymar', entryYear: 2009, entryClub: 'Santos' },
  { id: 'soccer:mbappe', name: 'Kylian Mbappé', entryYear: 2015, entryClub: 'Monaco' },
  { id: 'soccer:haaland', name: 'Erling Haaland', entryYear: 2016, entryClub: 'Bryne' },
  { id: 'soccer:bellingham', name: 'Jude Bellingham', entryYear: 2019, entryClub: 'Birmingham City' },
] as const;

type SoccerHistoricalEntry = Pick<(typeof SOCCER_HISTORICAL_PLAYERS)[number], 'id' | 'entryYear' | 'entryClub'>;
interface SoccerHistoricalArrivalsV2 {
  version: 2;
  players: SoccerHistoricalEntry[];
}

interface SoccerHistoricalArrivalsV3 {
  version: 3;
  startYear: 2010 | 2015;
  players: SoccerHistoricalEntry[];
}

export type SoccerHistoricalArrivals = SoccerHistoricalArrivalsV1 | SoccerHistoricalArrivalsV2 | SoccerHistoricalArrivalsV3;

interface SoccerHistoricalArrivalsV1 {
  version: 1;
  players: { id: 'soccer:neymar'; entryYear: 2009; entryClub: 'Santos' }[];
}

export function readSoccerHistoricalArrivals(s: CareerState): SoccerHistoricalArrivals | null {
  const value = s.historicalArrivals;
  if (value?.version === 3) {
    if ((value.startYear !== 2010 && value.startYear !== 2015) || s.seasons[0]?.year !== value.startYear) return null;
    const eligible = SOCCER_HISTORICAL_PLAYERS.filter(entry => entry.entryYear > value.startYear);
    if (!Array.isArray(value.players) || value.players.length > eligible.length ||
        new Set(value.players.map(p => p?.id)).size !== value.players.length) return null;
    return value.players.every(p => p && eligible.some(entry =>
      p.id === entry.id && p.entryYear === entry.entryYear && p.entryClub === entry.entryClub)) ? value : null;
  }
  if (value?.version === 2) {
    if (!Array.isArray(value.players) || value.players.length > SOCCER_HISTORICAL_PLAYERS.length ||
        new Set(value.players.map(p => p?.id)).size !== value.players.length) return null;
    return value.players.every(p => p && SOCCER_HISTORICAL_PLAYERS.some(entry =>
      p.id === entry.id && p.entryYear === entry.entryYear && p.entryClub === entry.entryClub)) ? value : null;
  }
  if (value?.version !== 1 || !Array.isArray(value.players) || value.players.length > 1) return null;
  return value.players.every(p => p && p.id === 'soccer:neymar' && p.entryYear === 2009 && p.entryClub === 'Santos') ? value : null;
}

export function soccerHistoricalEntryForName(s: CareerState, name: string): SoccerHistoricalEntry | undefined {
  const id = SOCCER_HISTORICAL_PLAYERS.find(entry => entry.name === name)?.id;
  return readSoccerHistoricalArrivals(s)?.players.find(entry => entry.id === id);
}

export function hasSoccerHistoricalPlayer(s: CareerState, name: string): boolean {
  if (s.historicalArrivals?.version === 2 || s.historicalArrivals?.version === 3) return !!soccerHistoricalEntryForName(s, name);
  return name === 'Neymar' && readSoccerHistoricalArrivals(s)?.players.length === 1;
}

/** Admit a sourced identity after the career actually commits its calendar year. Draws nothing. */
export function recordSoccerHistoricalArrivals(s: CareerState, year: number): void {
  const arrivals = readSoccerHistoricalArrivals(s);
  if (arrivals?.version === 2 || arrivals?.version === 3) {
    if (!Number.isSafeInteger(year) || !s.phone) return;
    const added = SOCCER_HISTORICAL_PLAYERS.filter(entry => (arrivals.version !== 3 || entry.entryYear > arrivals.startYear) && entry.entryYear <= year &&
      !arrivals.players.some(player => player.id === entry.id));
    const players = [...arrivals.players, ...added.map(({ id, entryYear, entryClub }) => ({ id, entryYear, entryClub }))];
    const clubs = { ...s.phone.clubs };
    const protectedNames = SOCCER_HISTORICAL_PLAYERS.filter(entry => players.some(player => player.id === entry.id));
    for (const entry of protectedNames) {
      if (added.some(player => player.id === entry.id) || !clubs[entry.name]) clubs[entry.name] = entry.entryClub;
    }
    const drop = Object.keys(clubs).filter(name => !protectedNames.some(entry => entry.name === name))
      .slice(0, Math.max(0, Object.keys(clubs).length - MAX_WORLD_NAMES));
    for (const name of drop) delete clubs[name];
    s.historicalArrivals = { ...arrivals, players };
    s.phone = { ...s.phone, clubs };
    return;
  }
  if (!arrivals || !Number.isSafeInteger(year) || year < 2009 || arrivals.players.length || !s.phone) return;
  s.historicalArrivals = { ...arrivals, players: [{ id: 'soccer:neymar', entryYear: 2009, entryClub: 'Santos' }] };
  const clubs: Record<string, string> = { ...s.phone.clubs, Neymar: 'Santos' };
  const drop = Object.keys(clubs).filter(name => name !== 'Neymar').slice(0, Math.max(0, Object.keys(clubs).length - MAX_WORLD_NAMES));
  for (const name of drop) delete clubs[name];
  s.phone = { ...s.phone, clubs };
}
