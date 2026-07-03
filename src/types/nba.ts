export type NbaPosition = 'PG' | 'SG' | 'SF' | 'PF' | 'C';

export interface NbaPositionSlot {
  role: NbaPosition;
  label: string;
}

export interface NbaFilledSlot extends NbaPositionSlot {
  /** Full "First Last" display name, shown in the court layout, review and result screens. */
  playerName: string;
  /**
   * Last-name-only form (nba_players_extended_v2's searched/matched column,
   * see NBA_PLAYER_SOURCE_V2 in useNbaLineup.ts), kept alongside the full
   * playerName so the autocomplete's exclude set can stay keyed on the same
   * shape as entity.name during search. Never rendered directly.
   */
  lastNameForExclude: string;
  assignedTeam: string;
  statValue?: number | string;
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
