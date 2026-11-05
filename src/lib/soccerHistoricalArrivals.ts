import type { CareerState } from './soccerCareerEngine';

export interface SoccerHistoricalArrivals {
  version: 1;
  players: { id: 'soccer:neymar'; entryYear: 2009; entryClub: 'Santos' }[];
}

export function readSoccerHistoricalArrivals(s: CareerState): SoccerHistoricalArrivals | null {
  const value = s.historicalArrivals;
  if (value?.version !== 1 || !Array.isArray(value.players) || value.players.length > 1) return null;
  return value.players.every(p => p && p.id === 'soccer:neymar' && p.entryYear === 2009 && p.entryClub === 'Santos') ? value : null;
}

export function hasSoccerHistoricalPlayer(s: CareerState, name: string): boolean {
  return name === 'Neymar' && readSoccerHistoricalArrivals(s)?.players.length === 1;
}

/** Admit a sourced identity after the career actually commits its calendar year. Draws nothing. */
export function recordSoccerHistoricalArrivals(s: CareerState, year: number): void {
  const arrivals = readSoccerHistoricalArrivals(s);
  if (!arrivals || year < 2009 || arrivals.players.length || !s.phone) return;
  s.historicalArrivals = { ...arrivals, players: [{ id: 'soccer:neymar', entryYear: 2009, entryClub: 'Santos' }] };
  s.phone = { ...s.phone, clubs: { ...s.phone.clubs, Neymar: 'Santos' } };
}
