import { UfcFighter, UfcCellResult, UfcCellStatus, UfcArrowDirection, UfcGuessResult, WEIGHT_CLASS_ORDER } from '@/types/ufc';

const continentMap: Record<string, string> = {
  'USA': 'North America', 'Canada': 'North America', 'Mexico': 'North America',
  'Brazil': 'South America', 'Cuba': 'South America', 'Argentina': 'South America',
  'England': 'Europe', 'Ireland': 'Europe', 'Poland': 'Europe', 'Russia': 'Europe',
  'Netherlands': 'Europe', 'France': 'Europe', 'Spain': 'Europe', 'Czech Republic': 'Europe',
  'Georgia': 'Europe', 'Armenia': 'Europe', 'Kyrgyzstan': 'Asia',
  'Nigeria': 'Africa', 'Cameroon': 'Africa', 'South Africa': 'Africa',
  'Australia': 'Oceania', 'New Zealand': 'Oceania',
  'China': 'Asia', 'Kazakhstan': 'Asia',
};

function compareNationality(guess: string, target: string): UfcCellResult {
  if (guess === target) return { value: guess, status: 'correct' };
  const gc = continentMap[guess] || 'Unknown';
  const tc = continentMap[target] || 'Unknown';
  if (gc === tc && gc !== 'Unknown') return { value: guess, status: 'close' };
  return { value: guess, status: 'incorrect' };
}

function compareWeightClass(guess: string, target: string): UfcCellResult {
  if (guess === target) return { value: guess, status: 'correct' };
  const gi = WEIGHT_CLASS_ORDER.indexOf(guess as any);
  const ti = WEIGHT_CLASS_ORDER.indexOf(target as any);
  if (gi === -1 || ti === -1) return { value: guess, status: 'incorrect' };
  const diff = Math.abs(gi - ti);
  const arrow: UfcArrowDirection = ti > gi ? 'up' : 'down';
  if (diff === 1) return { value: guess, status: 'close', arrow };
  return { value: guess, status: 'incorrect', arrow };
}

function compareNumeric(guessVal: number, targetVal: number, threshold: number, displayValue?: string): UfcCellResult {
  const display = displayValue || String(guessVal);
  if (guessVal === targetVal) return { value: display, status: 'correct' };
  const diff = Math.abs(guessVal - targetVal);
  const arrow: UfcArrowDirection = targetVal > guessVal ? 'up' : 'down';
  const status: UfcCellStatus = diff <= threshold ? 'close' : 'incorrect';
  return { value: display, status, arrow };
}

function getYearsActiveCount(fighter: UfcFighter): number {
  return fighter.yearsActiveEnd - fighter.yearsActiveStart;
}

function compareYearsActive(guess: UfcFighter, target: UfcFighter): UfcCellResult {
  const guessYears = getYearsActiveCount(guess);
  const targetYears = getYearsActiveCount(target);
  return compareNumeric(guessYears, targetYears, 2);
}

/** Round 660: whole years of age on dateStr (YYYY-MM-DD), from a YYYY-MM-DD
    birth date. Computed on the day the game is played so it never goes stale. */
export function ageOn(birthDate: string, dateStr: string): number {
  const [by, bm, bd] = birthDate.split('-').map(Number);
  const [y, m, d] = dateStr.split('-').map(Number);
  return y - by - (m < bm || (m === bm && d < bd) ? 1 : 0);
}

export function compareUfcGuess(guess: UfcFighter, target: UfcFighter, dateStr: string): UfcGuessResult {
  return {
    fighterName: guess.name,
    isCorrect: guess.name === target.name,
    cells: {
      yearsActive: compareYearsActive(guess, target),
      weightClass: compareWeightClass(guess.weightClass, target.weightClass),
      nationality: compareNationality(guess.nationality, target.nationality),
      age: compareNumeric(ageOn(guess.birthDate, dateStr), ageOn(target.birthDate, dateStr), 2),
      wins: compareNumeric(guess.wins, target.wins, 3),
      losses: compareNumeric(guess.losses, target.losses, 2),
      draws: compareNumeric(guess.draws, target.draws, 1),
      koTko: compareNumeric(guess.koTko, target.koTko, 3),
      submissions: compareNumeric(guess.submissions, target.submissions, 2),
    },
  };
}
