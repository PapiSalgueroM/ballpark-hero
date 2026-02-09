export interface BlurredFacePlayer {
  name: string;
  wikipediaSlug: string;
  nationality: string;
  position: string;
  club: string;
  age: number;
  kitNumber: number;
  isActive: boolean;
  league: string;
}

export type BlurredFaceGameStatus = 'loading' | 'playing' | 'won' | 'lost' | 'gave-up';

export interface BlurredFaceHint {
  label: string;
  value: string;
  icon: string;
}
