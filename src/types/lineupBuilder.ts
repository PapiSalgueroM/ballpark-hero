export type Formation = '4-3-3' | '4-4-2' | '3-5-2' | '4-2-3-1' | '3-4-3' | '5-3-2';

export type PositionRole = 'GK' | 'CB' | 'LB' | 'RB' | 'LWB' | 'RWB' | 'CDM' | 'CM' | 'CAM' | 'LM' | 'RM' | 'LW' | 'RW' | 'ST' | 'CF';

export interface PositionSlot {
  role: PositionRole;
  label: string;
}

/**
 * Round 442: what the dropdown row the player picked actually said about him.
 *
 * These are the player_market_values columns the autocomplete already fetches
 * (PlayerEntity.meta), carried onto the slot instead of into a side map keyed
 * by name. The side map was already losing players: the validator can hand back
 * a different `fullName` and the slot gets renamed, after which a name-keyed
 * lookup misses and the pick silently stopped counting for chemistry.
 *
 * Every field is optional because a pick typed rather than chosen has none of
 * it. Nothing here is invented: it is the row, or it is absent.
 */
export interface PickMeta {
  /** Untouched player_market_values.position, e.g. "Goalkeeper". */
  rawPosition?: string;
  /** Normalized primary role from that value, once squadDeal's map has seen it. */
  position?: PositionRole;
  club?: string;
  nationality?: string;
  /** market_value_usd on the row the search kept (his highest-valued season). */
  value?: number;
  age?: number;
  /** Year of that row, so the result screen can say which season it is quoting. */
  year?: number;
}

export interface FilledSlot extends PositionSlot {
  playerName: string;
  assignedTeam: string;
  isNation: boolean;
  pick?: PickMeta;
}

export interface TeamAssignment {
  name: string;
  isNation: boolean;
}

export type GamePhase = 'formation' | 'building' | 'reviewing' | 'result';

export interface AIVerdict {
  rating: string;
  headline: string;
  analysis: string;
}

export const FORMATIONS: Record<Formation, PositionSlot[]> = {
  '4-3-3': [
    { role: 'GK', label: 'GK' },
    { role: 'LB', label: 'LB' }, { role: 'CB', label: 'CB' }, { role: 'CB', label: 'CB' }, { role: 'RB', label: 'RB' },
    { role: 'CM', label: 'CM' }, { role: 'CM', label: 'CM' }, { role: 'CM', label: 'CM' },
    { role: 'LW', label: 'LW' }, { role: 'ST', label: 'ST' }, { role: 'RW', label: 'RW' },
  ],
  '4-4-2': [
    { role: 'GK', label: 'GK' },
    { role: 'LB', label: 'LB' }, { role: 'CB', label: 'CB' }, { role: 'CB', label: 'CB' }, { role: 'RB', label: 'RB' },
    { role: 'LM', label: 'LM' }, { role: 'CM', label: 'CM' }, { role: 'CM', label: 'CM' }, { role: 'RM', label: 'RM' },
    { role: 'ST', label: 'ST' }, { role: 'ST', label: 'ST' },
  ],
  '3-5-2': [
    { role: 'GK', label: 'GK' },
    { role: 'CB', label: 'CB' }, { role: 'CB', label: 'CB' }, { role: 'CB', label: 'CB' },
    { role: 'LWB', label: 'LWB' }, { role: 'CM', label: 'CM' }, { role: 'CDM', label: 'CDM' }, { role: 'CM', label: 'CM' }, { role: 'RWB', label: 'RWB' },
    { role: 'ST', label: 'ST' }, { role: 'ST', label: 'ST' },
  ],
  '4-2-3-1': [
    { role: 'GK', label: 'GK' },
    { role: 'LB', label: 'LB' }, { role: 'CB', label: 'CB' }, { role: 'CB', label: 'CB' }, { role: 'RB', label: 'RB' },
    { role: 'CDM', label: 'CDM' }, { role: 'CDM', label: 'CDM' },
    { role: 'LW', label: 'LW' }, { role: 'CAM', label: 'CAM' }, { role: 'RW', label: 'RW' },
    { role: 'ST', label: 'ST' },
  ],
  '3-4-3': [
    { role: 'GK', label: 'GK' },
    { role: 'CB', label: 'CB' }, { role: 'CB', label: 'CB' }, { role: 'CB', label: 'CB' },
    { role: 'LM', label: 'LM' }, { role: 'CM', label: 'CM' }, { role: 'CM', label: 'CM' }, { role: 'RM', label: 'RM' },
    { role: 'LW', label: 'LW' }, { role: 'ST', label: 'ST' }, { role: 'RW', label: 'RW' },
  ],
  '5-3-2': [
    { role: 'GK', label: 'GK' },
    { role: 'LWB', label: 'LWB' }, { role: 'CB', label: 'CB' }, { role: 'CB', label: 'CB' }, { role: 'CB', label: 'CB' }, { role: 'RWB', label: 'RWB' },
    { role: 'CM', label: 'CM' }, { role: 'CM', label: 'CM' }, { role: 'CM', label: 'CM' },
    { role: 'ST', label: 'ST' }, { role: 'ST', label: 'ST' },
  ],
};
