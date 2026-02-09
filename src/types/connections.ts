export type ConnectionDifficulty = 'easy' | 'medium' | 'hard' | 'insane';

export interface ConnectionGroup {
  category: string;
  players: string[];
  difficulty: ConnectionDifficulty;
}

export interface ConnectionsPuzzle {
  id: string;
  groups: [ConnectionGroup, ConnectionGroup, ConnectionGroup, ConnectionGroup];
}

export type ConnectionColor = {
  bg: string;
  text: string;
  label: string;
};
