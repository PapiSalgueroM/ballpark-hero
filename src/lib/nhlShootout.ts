import { keyedRng } from '@/lib/keyedRng';

export const NHL_SHOOTOUT_STANCES = {
  'shootout-challenge': 'Challenge the shootout shooter',
  'shootout-hold': 'Hold for the deke',
} as const;
export type ShootoutStance = keyof typeof NHL_SHOOTOUT_STANCES;
export interface NhlShootoutResult {
  stance: ShootoutStance;
  earlyShots: number;
  dekes: number;
  usualWins: number;
  wins: number;
  recoveries?: number;
}
type GoalieSeason = { year: number; games: number; shootout?: NhlShootoutResult };

export function isShootoutStance(choice: unknown): choice is ShootoutStance {
  return choice === 'shootout-challenge' || choice === 'shootout-hold';
}

export function expectsEarlyShootoutShots(team: string, year: number): boolean {
  return keyedRng(JSON.stringify(['shootout scouting', team, year]))() < 0.5;
}

export function practicedShootoutStance(career: { year: number; seasons: readonly GoalieSeason[] }): ShootoutStance | undefined {
  const last = career.seasons.at(-1);
  const run = last?.shootout;
  if (last?.year === career.year - 1 && run && isShootoutStance(run.stance) && Number.isSafeInteger(last.games) && last.games >= 18 &&
    Number.isSafeInteger(run.earlyShots) && run.earlyShots >= 0 && Number.isSafeInteger(run.dekes) && run.dekes >= 0 &&
    run.earlyShots + run.dekes === Math.floor(last.games / 6)) return run.stance;
}

export function nhlShootoutOptions(c: {
  pos: string; team: string; year: number; contractYears: number; retired: boolean; suspendedSeasons?: number; seasons: readonly GoalieSeason[];
}) {
  if (c.pos !== 'G' || c.contractYears <= 0 || c.retired || c.suspendedSeasons) return [];
  const threat = expectsEarlyShootoutShots(c.team, c.year) ? 'early shots' : 'dekes';
  const familiar = practicedShootoutStance(c);
  return (['shootout-challenge', 'shootout-hold'] as const).map(id => {
    const technique = id === 'shootout-challenge' ? 'Come out to cut the angle on early shots. A deke can take you out of the play.'
      : "Stay deep and wait for the shooter's move. A quick shot has more open net.";
    const practice = familiar === id ? 'You practiced this stance last season and can recover some beaten reads.'
      : 'Three shootouts prepare this stance for next season.';
    return { id, label: NHL_SHOOTOUT_STANCES[id], effect: `${technique} Your scout expects more ${threat} this season. Every six regular-season starts give you one deciding shootout attempt. The result counts in your wins. ${practice}` };
  });
}

export function playGoalieShootouts(
  career: { name: string; team: string; year: number; seasons: readonly GoalieSeason[] }, stance: ShootoutStance, starts: number, seasonWins: number,
): NhlShootoutResult {
  const rng = keyedRng(JSON.stringify(['deciding shootouts', career.name, career.team, career.year]));
  const earlyChance = expectsEarlyShootoutShots(career.team, career.year) ? 0.7 : 0.3;
  const practiced = practicedShootoutStance(career) === stance;
  const result: NhlShootoutResult = { stance, earlyShots: 0, dekes: 0, usualWins: 0, wins: 0, ...(practiced && { recoveries: 0 }) };
  for (let i = 0; i < Math.floor(starts / 6); i++) {
    // Select from the actual wins and losses without reusing a start.
    const usualWin = rng() < (seasonWins - result.usualWins) / (starts - i);
    const early = rng() < earlyChance;
    const read = rng();
    const rightDepth = early === (stance === 'shootout-challenge');
    if (usualWin) result.usualWins++;
    if (early) result.earlyShots++; else result.dekes++;
    if (read >= 0.45 ? usualWin : rightDepth) result.wins++;
    else if (result.recoveries !== undefined && usualWin && read >= 0.30) {
      result.recoveries++;
      result.wins++;
    }
  }
  return result;
}
