export type Formation = '4-3-3' | '4-4-2' | '3-5-2' | '4-2-3-1' | '3-4-3' | '5-3-2';

export type PositionRole = 'GK' | 'CB' | 'LB' | 'RB' | 'LWB' | 'RWB' | 'CDM' | 'CM' | 'CAM' | 'LM' | 'RM' | 'LW' | 'RW' | 'ST' | 'CF';

export interface PositionSlot {
  role: PositionRole;
  label: string;
}

export interface FilledSlot extends PositionSlot {
  playerName: string;
  assignedTeam: string;
  isNation: boolean;
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
