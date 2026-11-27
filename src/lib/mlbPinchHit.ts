export const SWINGS = {
  take: 'Take pitch',
  contact: 'Protect the plate',
  fastball: 'Hunt fastball',
  offspeed: 'Sit on offspeed',
} as const;

export type Swing = keyof typeof SWINGS;
type PitchType = 'fastball' | 'offspeed';
type Spot = 'high strike' | 'outside' | 'on the corner' | 'down the middle' | 'in the dirt';
type Pitch = readonly [PitchType, Spot];

interface Matchup {
  title: string;
  scout: string;
  runners: readonly number[];
  outs: number;
  balls: number;
  strikes: number;
  pitches: readonly Pitch[];
}

export const MATCHUPS: readonly Matchup[] = [
  {
    title: 'Bring the runner home', scout: 'The high fastball is this pitcher’s first choice. A short swing can lift it deep enough to score the runner.',
    runners: [3], outs: 1, balls: 1, strikes: 1,
    pitches: [['fastball', 'high strike'], ['offspeed', 'outside'], ['fastball', 'down the middle']],
  },
  {
    title: 'Make the pitcher come to you', scout: 'This reliever tries to get a chase with a breaking ball, then comes back to the corner with a fastball.',
    runners: [1, 2, 3], outs: 2, balls: 3, strikes: 1,
    pitches: [['offspeed', 'in the dirt'], ['fastball', 'on the corner'], ['offspeed', 'down the middle']],
  },
  {
    title: 'Stay alive with two strikes', scout: 'Watch for a fastball on the corner. Foul it back and the next breaking ball can hang over the plate.',
    runners: [1, 2], outs: 2, balls: 0, strikes: 2,
    pitches: [['fastball', 'on the corner'], ['offspeed', 'down the middle'], ['fastball', 'high strike']],
  },
];

export type Outcome = 'Walk' | 'Strikeout' | 'Sacrifice fly' | 'Flyout' | 'Single' | 'Double' | 'Home run';
export interface AtBat { balls: number; strikes: number; log: string[]; outcome?: Outcome; rbi: number }

function swingAt(pitch: Pitch, swing: Swing, matchup: Matchup) {
  const [type, spot] = pitch;
  const ball = spot === 'outside' || spot === 'in the dirt';
  if (swing === 'take') return ball ? 'Ball' : 'Called strike';
  if (ball) return 'Swinging strike';
  if (spot === 'on the corner') return swing === 'contact' || swing === type ? 'Foul' : 'Swinging strike';
  if (swing === 'contact') {
    if (spot === 'high strike') return matchup.outs < 2 && matchup.runners.includes(3) ? 'Sacrifice fly' : 'Flyout';
    return 'Single';
  }
  if (swing !== type) return 'Swinging strike';
  return spot === 'high strike' ? 'Double' : 'Home run';
}

function runsDrivenIn(outcome: Outcome, runners: readonly number[]): number {
  switch (outcome) {
    case 'Home run': return runners.length + 1;
    case 'Double': return runners.filter(base => base >= 2).length;
    case 'Single': return Number(runners.includes(3));
    case 'Sacrifice fly': return 1;
    case 'Walk': return Number(runners.length === 3);
    default: return 0;
  }
}

export function playAtBat(matchup: Matchup, swings: readonly Swing[]): AtBat {
  const result: AtBat = { balls: matchup.balls, strikes: matchup.strikes, log: [], rbi: 0 };
  for (const swing of swings) {
    if (result.outcome) break;
    const pitch = matchup.pitches[result.log.length % matchup.pitches.length];
    const call = swingAt(pitch, swing, matchup);
    if (call === 'Ball') {
      result.balls += 1;
      if (result.balls === 4) result.outcome = 'Walk';
    } else if (call === 'Called strike' || call === 'Swinging strike') {
      result.strikes += 1;
      if (result.strikes === 3) result.outcome = 'Strikeout';
    } else if (call === 'Foul') {
      result.strikes = Math.min(2, result.strikes + 1);
    } else {
      result.outcome = call;
    }
    result.log.push(`${pitch[0] === 'fastball' ? 'Fastball' : 'Breaking ball'}, ${pitch[1]}. ${call}.`);
  }
  if (result.outcome) result.rbi = runsDrivenIn(result.outcome, matchup.runners);
  return result;
}

export interface SeriesCard { atBats: Swing[][]; best: number | null }
export const newSeries = (): SeriesCard => ({ atBats: [[]], best: null });

export function readSeries(raw: string | null): SeriesCard {
  try {
    const card = JSON.parse(raw ?? 'null') as SeriesCard | null;
    if (!card || !Array.isArray(card.atBats) || !card.atBats.length || card.atBats.length > MATCHUPS.length) return newSeries();
    for (const [i, swings] of card.atBats.entries()) {
      if (!Array.isArray(swings) || swings.length > 9 ||
          !swings.every(s => typeof s === 'string' && Object.prototype.hasOwnProperty.call(SWINGS, s))) return newSeries();
      const played = playAtBat(MATCHUPS[i], swings);
      if (played.log.length !== swings.length || (i < card.atBats.length - 1 && !played.outcome)) return newSeries();
    }
    const best = card.best;
    return { atBats: card.atBats, best: Number.isInteger(best) && best >= 0 && best <= 9 ? best : null };
  } catch {
    return newSeries();
  }
}
