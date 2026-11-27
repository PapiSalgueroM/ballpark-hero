import { keyedRng } from './keyedRng';

export const CHANGEUP_LABEL = 'Feature a two-strike changeup';
export const CHANGEUP_REPS = 40;

export interface MlbChangeupLine {
  faced: number;
  strikeouts: number;
  walks: number;
  experienceBefore: number;
  fatigue?: number;
}

type Season = { games: number; changeup?: MlbChangeupLine };

export function changeupExperience(seasons: readonly Season[]): number {
  return Math.min(CHANGEUP_REPS, seasons.reduce((total, season) => {
    const faced = season.changeup?.faced;
    return total + (Number.isSafeInteger(faced) && faced === season.games && faced > 0 ? faced : 0);
  }, 0));
}

export function pitchChangeups(career: { name: string; year: number; team: string; seasons: readonly Season[] }, appearances: number, form: number): MlbChangeupLine {
  const experienceBefore = changeupExperience(career.seasons);
  const rng = keyedRng(JSON.stringify(['two-strike changeups', career.name, career.team, career.year]));
  const command = Math.max(-0.035, Math.min(0.035, (form - 75) * 0.002));
  let strikeouts = 0, walks = 0;
  for (let outing = 0; outing < appearances; outing++) {
    const learned = Math.min(1, (experienceBefore + outing) / CHANGEUP_REPS);
    const draw = rng();
    if (draw < 0.14 + 0.17 * learned + command) strikeouts++;
    else if (draw > 1 - (0.22 - 0.12 * learned - command)) walks++;
  }
  return { faced: appearances, experienceBefore, strikeouts, walks };
}
