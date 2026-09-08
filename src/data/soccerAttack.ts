import type { AttackSetup } from '@/lib/conquestAttack';
import map from '@/data/soccerAttackMap.json';

export function makeSoccerAttackSetup(seed: number): AttackSetup {
  return structuredClone({
    dataVersion: map.dataVersion,
    seed, teams: map.teams, regions: map.regions, bounds: map.bounds,
  }) as AttackSetup;
}
