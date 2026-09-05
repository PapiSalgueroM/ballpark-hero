import { Player, CellResult, CellStatus, ArrowDirection, GuessResult } from '@/types/game';

const continentMap: Record<string, string> = {
  'England': 'Europe', 'France': 'Europe', 'Germany': 'Europe',
  'Spain': 'Europe', 'Portugal': 'Europe', 'Netherlands': 'Europe',
  'Belgium': 'Europe', 'Croatia': 'Europe', 'Italy': 'Europe',
  'Poland': 'Europe', 'Sweden': 'Europe', 'Norway': 'Europe',
  'Switzerland': 'Europe', 'Serbia': 'Europe', 'Turkey': 'Europe',
  'Georgia': 'Europe', 'Denmark': 'Europe', 'Austria': 'Europe',
  'Scotland': 'Europe', 'Wales': 'Europe', 'Ukraine': 'Europe',
  'Czech Republic': 'Europe', 'Slovenia': 'Europe', 'Albania': 'Europe',
  'Greece': 'Europe', 'Israel': 'Europe', 'Bosnia': 'Europe',
  'Guinea-Bissau': 'Europe',
  'Brazil': 'South America', 'Argentina': 'South America',
  'Uruguay': 'South America', 'Colombia': 'South America',
  'Ecuador': 'South America', 'Paraguay': 'South America',
  'Chile': 'South America',
  'Egypt': 'Africa', 'Senegal': 'Africa', 'Nigeria': 'Africa',
  'Morocco': 'Africa', 'Ghana': 'Africa', 'Ivory Coast': 'Africa',
  'Cameroon': 'Africa', 'Guinea': 'Africa', 'Mali': 'Africa',
  'Algeria': 'Africa', 'Gabon': 'Africa',
  'South Korea': 'Asia', 'Japan': 'Asia',
  'Australia': 'Oceania', 'New Zealand': 'Oceania',
  'USA': 'North America', 'Mexico': 'North America', 'Canada': 'North America',
  'Jamaica': 'North America',
};

const positionGroupMap: Record<string, string> = {
  'GK': 'Goalkeeper',
  'CB': 'Defender', 'LB': 'Defender', 'RB': 'Defender', 'LWB': 'Defender', 'RWB': 'Defender',
  'CDM': 'Midfielder', 'CM': 'Midfielder', 'CAM': 'Midfielder', 'LM': 'Midfielder', 'RM': 'Midfielder',
  'LW': 'Forward', 'RW': 'Forward', 'CF': 'Forward', 'ST': 'Forward',
};

function compareNationality(guess: string, target: string): CellResult {
  if (guess === target) return { value: guess, status: 'correct' };
  const guessContinent = continentMap[guess] || 'Unknown';
  const targetContinent = continentMap[target] || 'Unknown';
  if (guessContinent === targetContinent && guessContinent !== 'Unknown') {
    return { value: guess, status: 'close' };
  }
  return { value: guess, status: 'incorrect' };
}

function compareClub(guessClub: string, targetClub: string, guessLeague: string, targetLeague: string): CellResult {
  if (guessClub === targetClub) {
    return { value: guessClub, status: 'correct' };
  }
  if (guessLeague === targetLeague) {
    return { value: guessClub, status: 'close' };
  }
  return { value: guessClub, status: 'incorrect' };
}

function compareNumeric(guessVal: number, targetVal: number, threshold: number, displayValue?: string): CellResult {
  const display = displayValue || String(guessVal);
  if (guessVal === targetVal) return { value: display, status: 'correct' };
  const diff = Math.abs(guessVal - targetVal);
  const arrow: ArrowDirection = targetVal > guessVal ? 'up' : 'down';
  const status: CellStatus = diff <= threshold ? 'close' : 'incorrect';
  return { value: display, status, arrow };
}

/**
 * Round 443. Squad numbers are hand entered in src/data/footleEnrichment.ts
 * and 1,375 of the 1,507 players in the live pool are not in it, including
 * Vinicius Junior and every one of the 1,200 obscure "insane" tier players.
 * Those arrive as kitNumber null (0 before this round), and the tile used to
 * print that as a number, paint it GREEN whenever the guess was also unknown,
 * and draw a higher/lower arrow pointing at it. Three separate claims about a
 * number nobody on either side of the guess has.
 *
 * An unknown squad number on either side now reads "?" and stays neutral: no
 * match, no arrow, no direction. Nothing is invented and nothing is hidden,
 * the tile just says it does not know. scripts/simNoZeroFacts.mjs section 1
 * scores every combination through compareGuess and fails on any of the three.
 *
 * The status is 'unknown' rather than 'incorrect' because the board speaks its
 * verdict as well as painting it (see GameBoard's sr-only span, added in Round
 * 306): "incorrect" would have a screen reader announce "question mark, wrong"
 * about a comparison nobody can make. Both paint the same neutral grey.
 */
function compareKitNumber(guess: number | null, target: number | null): CellResult {
  const guessKnown = typeof guess === 'number' && guess > 0;
  const targetKnown = typeof target === 'number' && target > 0;
  if (!guessKnown || !targetKnown) {
    return { value: guessKnown ? String(guess) : '?', status: 'unknown' };
  }
  return compareNumeric(guess as number, target as number, 3);
}

function comparePosition(guess: string, target: string): CellResult {
  if (guess === target) return { value: guess, status: 'correct' };
  const guessGroup = positionGroupMap[guess] || 'Unknown';
  const targetGroup = positionGroupMap[target] || 'Unknown';
  if (guessGroup === targetGroup) return { value: guess, status: 'close' };
  return { value: guess, status: 'incorrect' };
}

export function compareGuess(guess: Player, target: Player): GuessResult {
  return {
    playerName: guess.name,
    isCorrect: guess.name.trim().toLowerCase() === target.name.trim().toLowerCase(),
    cells: {
      nationality: compareNationality(guess.nationality, target.nationality),
      club: compareClub(guess.club, target.club, guess.league, target.league),
      goals: compareNumeric(guess.goals, target.goals, 3),
      assists: compareNumeric(guess.assists, target.assists, 3),
      position: comparePosition(guess.position, target.position),
      kitNumber: compareKitNumber(guess.kitNumber, target.kitNumber),
      age: compareNumeric(guess.age, target.age, 2),
      marketValue: compareNumeric(guess.marketValue, target.marketValue, 5, `$${guess.marketValue}M`),
    },
  };
}
