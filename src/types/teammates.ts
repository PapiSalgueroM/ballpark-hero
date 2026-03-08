export interface TeammatesPair {
  player1: string;
  player2: string;
  sport: 'NFL' | 'NBA' | 'Soccer';
  answer: boolean;
  funFact: string;
  difficulty: 1 | 2 | 3; // 1=easy, 2=medium, 3=hard
}
