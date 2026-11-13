import type { SettleableTie } from './worldCompetition';

// The shared promotion match engine reserves rounds 1 and 2 for the two legs.
export const FRENCH_PLAYOFF_ROUNDS = [4, 5, 1, 2] as const;

export interface FrenchPlayoffs {
  season: number;
  third: string;
  topFlight: string;
  first: SettleableTie;
  second?: SettleableTie;
  barrage?: SettleableTie;
}

export function frenchPlayoffTie(playoffs: FrenchPlayoffs, round: number): SettleableTie | undefined {
  if (round === 4) return playoffs.first;
  if (round === 5) return playoffs.second;
  if (round === 1 || round === 2) return playoffs.barrage;
}

export function frenchPlayoffLabel(round: number): string {
  if (round === 4) return 'Ligue 2 playoff · first round';
  if (round === 5) return 'Ligue 2 playoff · second round';
  return `Ligue 1 barrage · ${round === 1 ? 'first leg' : 'second leg'}`;
}

export function frenchTie(home: string, away: string): SettleableTie {
  return { home, away, homeGoals: null, awayGoals: null, winner: null };
}
