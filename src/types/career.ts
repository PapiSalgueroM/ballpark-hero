export interface CareerSeason {
  season: string;
  club: string;
  goals: number;
  /** Null where nobody counted assists in that league that season: 173 of the
   *  3,685 rows in career_seasons, across 8 players. Never coerce it to 0. */
  assists: number | null;
  appearances: number;
  marketValue: number;
}

export interface CareerPlayer {
  name: string;
  nationality: string;
  position: string;
  career: CareerSeason[];
}
