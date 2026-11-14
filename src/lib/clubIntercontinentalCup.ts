import { keyedRng } from '@/lib/keyedRng';
import { poissonGoals } from '@/lib/soccerInternational';
import type { CalDate } from '@/lib/calDate';

// 2025 regulations, articles 3, 4 and 11, and the official schedule.
// https://digitalhub.fifa.com/m/41ca9a261eb3f7d8/original/FIC2025_regulations_EN.pdf
// https://digitalhub.fifa.com/m/18d32b5e71e584f0/original/FIFA-Intercontinental-Cup-Qatar-2025-Match-Schedule.pdf
// https://assets1.afa.com.ar/Banners/Boletin-Comite-Ejecutivo-6729-%2817-07-2025%29.pdf
export const INTERCONTINENTAL_CUP_YEAR = 2025;
export const INTERCONTINENTAL_CUP_SCHEDULE = [
  { stage: 'African-Asian-Pacific play-off', month: 9, day: 14, venue: 'Cairo', host: true, home: 'Pyramids', away: 'Auckland City' },
  { stage: 'African-Asian-Pacific Cup', month: 9, day: 23, venue: 'Jeddah', host: true, home: 'Al Ahli', away: 0 },
  { stage: 'Derby of the Americas', month: 12, day: 10, venue: 'Al Rayyan', host: false, home: 'Cruz Azul', away: 'Flamengo' },
  { stage: 'Challenger Cup', month: 12, day: 13, venue: 'Al Rayyan', host: false, home: 2, away: 1 },
  { stage: 'Final', month: 12, day: 17, venue: 'Al Rayyan', host: false, home: 'PSG', away: 3 },
] as const;

export interface IntercontinentalCupMatch {
  home: string;
  away: string;
  homeGoals: number;
  awayGoals: number;
  winner: string;
  decidedBy: 'full time' | 'extra time' | 'penalties';
}

export function intercontinentalCupDate(fixture: (typeof INTERCONTINENTAL_CUP_SCHEDULE)[number]): CalDate {
  return { y: INTERCONTINENTAL_CUP_YEAR, m: fixture.month, d: fixture.day };
}

export function simIntercontinentalCupMatch(
  played: readonly IntercontinentalCupMatch[], seed: string, tierOf: (club: string) => number,
): IntercontinentalCupMatch {
  const { home: homeSlot, away: awaySlot, host } = INTERCONTINENTAL_CUP_SCHEDULE[played.length];
  const home = typeof homeSlot === 'string' ? homeSlot : played[homeSlot].winner;
  const away = typeof awaySlot === 'string' ? awaySlot : played[awaySlot].winner;
  const random = keyedRng(`intercontinental-cup|2025|${seed}|${played.length}|${home}|${away}`);
  const edge = (tierOf(away) - tierOf(home)) * 0.22 + (host ? 0.15 : 0);
  const homeRate = Math.max(0.2, 1.35 + edge);
  const awayRate = Math.max(0.2, 1.35 - edge);
  let homeGoals = poissonGoals(homeRate, random);
  let awayGoals = poissonGoals(awayRate, random);
  let decidedBy: IntercontinentalCupMatch['decidedBy'] = 'full time';
  if (homeGoals === awayGoals) {
    homeGoals += poissonGoals(homeRate / 3, random);
    awayGoals += poissonGoals(awayRate / 3, random);
    decidedBy = homeGoals === awayGoals ? 'penalties' : 'extra time';
  }
  const winner = (homeGoals === awayGoals ? random() < 0.5 : homeGoals > awayGoals) ? home : away;
  return { home, away, homeGoals, awayGoals, winner, decidedBy };
}
