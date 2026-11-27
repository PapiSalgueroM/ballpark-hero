import { keyedRng } from './keyedRng';

export const NHL_DRAW_ASSIGNMENT = 'Take defensive-zone faceoffs';
export const NHL_DRAW_ICE_COST = 8;
export const NHL_DRAW_CAMP_MINIMUM = 30;
export const NHL_DRAW_CAMP_EDGE = 2;
export interface NhlDefensiveDraws { taken: number; won: number }

export function earnedDrawTrust(draws: NhlDefensiveDraws | undefined): boolean {
  return !!draws && Number.isSafeInteger(draws.taken) && Number.isSafeInteger(draws.won)
    && draws.taken >= NHL_DRAW_CAMP_MINIMUM && draws.won <= draws.taken && draws.won * 2 > draws.taken;
}

export function playDefensiveDraws(
  career: { name: string; team: string; year: number; role?: string; archetype: { id: string } },
  games: number, form: number,
): NhlDefensiveDraws {
  const taken = games * (career.role === 'backup' ? 2 : 4);
  const technique = career.archetype.id === 'faceoff' ? 0.065 : career.archetype.id === 'twoway' ? 0.03 : 0;
  const winChance = Math.max(0.36, Math.min(0.62, 0.48 + (form - 75) * 0.003 + technique));
  const rng = keyedRng(JSON.stringify(['defensive-zone draws', career.name, career.team, career.year]));
  let won = 0;
  for (let i = 0; i < taken; i++) if (rng() < winChance) won++;
  return { taken, won };
}
