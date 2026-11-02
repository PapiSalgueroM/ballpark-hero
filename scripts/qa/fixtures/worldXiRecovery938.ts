import type { WorldXiData, WxPlayer } from '@/lib/worldXi';
import type { Position } from '@/types/game';

// Fictional recovery DTOs from the admitted page test, not the archived roster.
export const KEEPER = 'AAA Fixture Keeper';
export const STRIKER = 'AAB Fixture Striker';
export const SHARED = 'Fixture Shared Name';
export const CLASSIC = Array.from({ length: 12 }, (_, index) => 'Fixture Country ' + String(index + 1).padStart(2, '0'));
const POSITIONS: Position[] = ['GK', 'GK', 'CB', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'RW', 'LW', 'ST', 'CF'];
function row(name: string, country: string, position: Position, club: string, value = 1_000): WxPlayer {
  return { name, country, position, club, value, age: 25 };
}
export function createWorldXiRecovery938(): WorldXiData {
  const byCountry = new Map<string, WxPlayer[]>();
  for (const country of CLASSIC) byCountry.set(country, Array.from({ length: 6 }, (_, cohort) => POSITIONS.map((position, index) => row(
    `Fixture ${country} ${position} ${cohort}-${index}`,
    country, position, `Fixture ${country} Club ${cohort}-${index}`, 20_000 - cohort * 100 - index,
  ))).flat());
  byCountry.set(KEEPER, [row(SHARED, KEEPER, 'GK', 'Fixture Keeper Club')]);
  byCountry.set(STRIKER, [row(SHARED, STRIKER, 'ST', 'Fixture Striker Club')]);
  return { players: [...byCountry.values()].flat(), byCountry, countries: [...CLASSIC] };
}
export function createWorldXiRecoveryMarketRows() {
  return createWorldXiRecovery938().players.map(player => ({
    player_name: player.name, nationality: player.country, position: player.position,
    club: player.club, market_value_usd: player.value, year: 2026, age: player.age,
  }));
}