import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { ShirtNumberBoard } from '@/components/shirt-number/ShirtNumberBoard';

export default function ShirtNumber() {
  return (
    <>
      <PageSeo
        title="Shirt Number - Guess the Kit Number | DoUKnowBall"
        description="Can you guess what shirt number a player wears? 3 attempts, higher or lower hints. Daily and unlimited modes."
        path="/shirt-number"
      />
      <ShirtNumberBoard />
      <GameSeoContent
        title="Shirt Number Game | DoUKnowBall"
        description="Test your football knowledge by guessing the kit number of famous soccer players. You get 3 attempts with higher/lower hints after each wrong guess."
        howToPlay={[
          "You're shown a player's name, club, league, and nationality.",
          "Enter the shirt number you think they wear (1-99).",
          "If wrong, you'll get a hint: is the real number higher or lower?",
          "Score 1000 points on your first try, 600 on the second, or 200 on the third."
        ]}
        examples={[
          "Lionel Messi at Inter Miami → #10",
          "Erling Haaland at Manchester City → #9",
          "Trent Alexander-Arnold at Liverpool → #66",
          "Phil Foden at Manchester City → #47",
          "Jude Bellingham at Real Madrid → #5"
        ]}
      />
    </>
  );
}
