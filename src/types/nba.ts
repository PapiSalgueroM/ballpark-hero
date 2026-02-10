export type NbaPosition = 'PG' | 'SG' | 'SF' | 'PF' | 'C';

export interface NbaPositionSlot {
  role: NbaPosition;
  label: string;
}

export interface NbaFilledSlot extends NbaPositionSlot {
  playerName: string;
  assignedTeam: string;
}

export interface StatChallenge {
  stat: string;
  direction: 'highest' | 'lowest';
  unit: string;
  emoji: string;
}

export type NbaGamePhase = 'challenge' | 'building' | 'reviewing' | 'result';

export interface NbaAIVerdict {
  rating: string;
  headline: string;
  analysis: string;
}

export const NBA_POSITIONS: NbaPositionSlot[] = [
  { role: 'PG', label: 'PG' },
  { role: 'SG', label: 'SG' },
  { role: 'SF', label: 'SF' },
  { role: 'PF', label: 'PF' },
  { role: 'C', label: 'C' },
];
