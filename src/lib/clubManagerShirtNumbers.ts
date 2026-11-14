import type { CareerState } from '@/lib/clubManager';

export function validShirtNumber(number?: number): number is number {
  return typeof number === 'number' && Number.isInteger(number) && number >= 1 && number <= 99;
}

export function assignShirtNumber(career: CareerState, playerId: string, number: number | null, swapWith?: string): CareerState | null {
  if (career.live || career.sacked || career.retired || career.wilderness) return null;
  const player = career.squad.find(p => p.id === playerId);
  if (!player || (number !== null && !validShirtNumber(number))) return null;
  if ((player.shirtNumber ?? null) === number) return null;
  if (number !== null && career.loanedOut?.some(loan => loan.player.shirtNumber === number)) return null;
  const holder = number === null ? undefined : career.squad.find(p => p.shirtNumber === number);
  if (holder?.id !== swapWith) return null;
  return {
    ...career,
    squad: career.squad.map(p => {
      if (p.id === playerId) return { ...p, shirtNumber: number ?? undefined };
      if (p.id === holder?.id) return { ...p, shirtNumber: player.shirtNumber };
      return p;
    }),
  };
}
