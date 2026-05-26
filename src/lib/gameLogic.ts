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
      kitNumber: compareNumeric(guess.kitNumber, target.kitNumber, 3),
      age: compareNumeric(guess.age, target.age, 2),
      marketValue: compareNumeric(guess.marketValue, target.marketValue, 5, `$${guess.marketValue}M`),
    },
  };
}
