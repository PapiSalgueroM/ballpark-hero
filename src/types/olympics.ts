export interface OlympicAthlete {
  id: string;
  sport: string;
  country: string;       // flag emoji
  gamesYear: number;
  hostCity: string;
  achievement: string;
  careerContext: string;
  medalSummary: string;  // e.g. "3 Gold, 1 Silver"
  name: string;
  season: 'summer' | 'winter';
}
