import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { NascarDriverBoard } from '@/components/nascar-driver/NascarDriverBoard';

export default function GuessNascarDriver() {
  return (
    <>
      <PageSeo
        title="Guess the NASCAR Driver - Cup Series Trivia Game | DoUKnowBall"
        description="Identify the mystery NASCAR Cup Series driver from progressive clues. Daily motorsport trivia challenge."
        path="/guess-nascar-driver"
      />
      <NascarDriverBoard />
      <GameSeoContent
        title="Guess The NASCAR Driver | DoUKnowBall"
        description="Identify the mystery NASCAR Cup Series driver from progressive clues about their era, wins, car number, championships, and famous moments."
        howToPlay={[
          "Clues are revealed progressively: era, win count, car number, and iconic career moments.",
          "Submit your guess when you know the driver. Fewer clues means a higher score.",
          "Play daily for the shared puzzle or switch to unlimited for more NASCAR trivia."
        ]}
        examples={[
          "Dale Earnhardt: #3, 7× Cup Champion, 'The Intimidator', Daytona",
          "Jeff Gordon: #24, 4× Cup Champion, 93 wins, Hendrick Motorsports",
          "Richard Petty: #43, 7× Cup Champion, 'The King', 200 wins",
          "Jimmie Johnson: #48, 7× Cup Champion, Hendrick, 83 wins",
          "Dale Earnhardt Jr.: #8/#88, Most Popular Driver 15×, DEI/Hendrick",
          "Kyle Busch: #18, 2× Cup Champion, 60+ wins, Joe Gibbs Racing"
        ]}
      />
    </>
  );
}
