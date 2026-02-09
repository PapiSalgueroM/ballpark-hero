export interface CareerSeason {
  season: string;
  club: string;
  goals: number;
  assists: number;
  appearances: number;
  marketValue: number;
}

export interface CareerPlayer {
  name: string;
  nationality: string;
  position: string;
  career: CareerSeason[];
}
