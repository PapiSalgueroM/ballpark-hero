export interface HigherLowerPlayer {
  name: string;
  nationality: string;
  isIcon: boolean;
  stats: {
    appearances: number;
    goals: number;
    assists: number;
    trophies: number;
    internationalCaps: number;
  };
}
