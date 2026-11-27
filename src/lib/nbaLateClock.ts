import { keyedRng } from './keyedRng';

export type LateClockRead = 'late-shot' | 'late-pass';
export interface LateClockResult {
  read: LateClockRead;
  coverage: 'single coverage' | 'double teams';
  possessions: number;
  matching: number;
  baskets: number;
}
type ScoutingSeason = { team: string; year: number };

function expectedCoverage(c: ScoutingSeason): LateClockResult['coverage'] {
  return keyedRng(JSON.stringify(['late-clock scouting', c.team, c.year]))() < 0.5 ? 'single coverage' : 'double teams';
}

export function nbaLateClockOptions(c: ScoutingSeason) {
  const report = `Your simulated scouting report expects more ${expectedCoverage(c)} this season. `;
  return [
    { id: 'late-shot' as const, label: 'Take the late-clock shot', effect: report + 'Against one defender, finish the two-pointer yourself. Each basket you take adds two points and costs you one assist.' },
    { id: 'late-pass' as const, label: 'Pass out of the late double', effect: report + 'When two defenders come to you, hit the cutter. Each finish you give up trades two of your points for one assist.' },
  ];
}

/** Reassign made two-point baskets within the regular-season line. The team already scored them. */
export function playNbaLateClock(c: ScoutingSeason, read: LateClockRead, games: number, stat: { mpg: number; ppg: number; apg: number }): LateClockResult {
  const coverage = expectedCoverage(c);
  const rng = keyedRng(JSON.stringify(['late-clock looks', c.team, c.year]));
  const possessions = Math.floor(games * Math.min(stat.mpg, 40) / 40);
  let matching = 0;
  for (let i = 0; i < possessions; i++) {
    const single = rng() < (coverage === 'single coverage' ? 2 / 3 : 1 / 3);
    if (single === (read === 'late-shot')) matching++;
  }
  const shooting = read === 'late-shot';
  // Work in tenths, the precision of the saved stat line, before taking whole baskets.
  const points = Math.round(stat.ppg * 10), assists = Math.round(stat.apg * 10);
  const pointRoom = shooting ? 380 - points : points - 10;
  const assistRoom = shooting ? assists - 3 : 130 - assists;
  const baskets = Math.max(0, Math.min(matching, Math.floor(pointRoom * games / 20), Math.floor(assistRoom * games / 10)));
  if (baskets > 0) {
    const moved = shooting ? baskets : -baskets;
    stat.ppg = Math.round(points + 20 * moved / games) / 10;
    stat.apg = Math.round(assists - 10 * moved / games) / 10;
  }
  return { read, coverage, possessions, matching, baskets };
}
