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


function compareP4PRank(guessVal: number, targetVal: number): UfcCellResult {
  const display = `#${guessVal}`;
  if (guessVal === targetVal) return { value: display, status: 'correct' };
  const diff = Math.abs(guessVal - targetVal);
  // Lower rank number = better. If guess is lower number (better), target is "lower" (worse).
  const arrow: UfcArrowDirection = targetVal > guessVal ? 'down' : 'up';
  const status: UfcCellStatus = diff <= 2 ? 'close' : 'incorrect';
  return { value: display, status, arrow };
}

export function compareUfcGuess(guess: UfcFighter, target: UfcFighter): UfcGuessResult {
  return {
    fighterName: guess.name,
    isCorrect: guess.name === target.name,
    cells: {
      yearsActive: compareYearsActive(guess, target),
      weightClass: compareWeightClass(guess.weightClass, target.weightClass),
      nationality: compareNationality(guess.nationality, target.nationality),
      age: compareNumeric(guess.age, target.age, 2),
      wins: compareNumeric(guess.wins, target.wins, 3),
      losses: compareNumeric(guess.losses, target.losses, 2),
      draws: compareNumeric(guess.draws, target.draws, 1),
      koTko: compareNumeric(guess.koTko, target.koTko, 3),
      submissions: compareNumeric(guess.submissions, target.submissions, 2),
      p4pRank: compareP4PRank(guess.highestP4PRank, target.highestP4PRank),
    },
  };
}
