export type NbaPosition = 'PG' | 'SG' | 'SF' | 'PF' | 'C';

export interface NbaPositionSlot {
  role: NbaPosition;
  label: string;
}

export interface NbaFilledSlot extends NbaPositionSlot {
  /** Full "First Last" display name, shown in the court layout, review and result screens. */
  playerName: string;
  /**
   * The key the autocomplete's exclude set is built from, so a player already
   * picked cannot come back in the suggestions. It has to be the same shape
   * searchPlayers compares against, and Round 494 changed that shape: the
   * lineup now uses the shared NBA source, which searches both name columns,
   * so entity.name is the whole "First Last" name rather than the surname
   * alone. The field was called lastNameForExclude while it held a surname
   * and was renamed with its meaning. Never rendered directly.
   */
  excludeName: string;
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
