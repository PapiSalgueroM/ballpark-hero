import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { F1ConstructorBoard } from '@/components/f1-constructor/F1ConstructorBoard';

export default function F1Constructor() {
  return (
    <>
      <PageSeo
        title="Guess the F1 Constructor - Formula 1 Team Puzzle | DoUKnowBall"
        description="Guess the Formula 1 constructor from clues about their history, championships, and famous drivers."
        path="/f1-constructor"
      />
      <F1ConstructorBoard />
      <GameSeoContent
        title="Guess The F1 Constructor | DoUKnowBall"
        description="Identify the mystery Formula 1 constructor from progressive clues about their championship history, drivers, and iconic moments."
        howToPlay={[
          "Each clue reveals something about the constructor — era, championship count, famous drivers, and key moments.",
          "Guess the constructor at any time. The fewer clues you need, the higher your score.",
          "Try the daily challenge or play unlimited mode for more practice."
        ]}
        examples={[
          "Ferrari — 16× Constructors' Champion, Schumacher/Lauda/Prost, Maranello",
          "McLaren — 8× Constructors' Champion, Senna/Prost/Hamilton, Woking",
          "Red Bull Racing — 6× Constructors' Champion, Vettel/Verstappen, Milton Keynes",
          "Mercedes — 8× Constructors' Champion (2014–2021), Hamilton/Rosberg",
          "Williams — 9× Constructors' Champion, Mansell/Prost/Senna, Grove",
          "Lotus — 7× Constructors' Champion, Jim Clark, Colin Chapman era"
        ]}
      />
    </>
  );
}
