import { GuessTheNationBoard } from '@/components/guess-the-nation/GuessTheNationBoard';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';

export default function GuessTheNation() {
  return (
    <>
      <PageSeo
        title="Guess The Nation — DoUKnowBall"
        description="Can you identify the mystery nation from clues about their sporting history? Test your knowledge of the world's greatest sporting nations!"
        path="/guess-the-nation"
      />
      <GuessTheNationBoard />
      <GameSeoContent
        title="Guess The Sporting Nation | DoUKnowBall"
        description="Identify the mystery nation from progressive clues about their Olympic history, medal count, famous sporting moments, and best sports."
        howToPlay={[
          "Each clue reveals details about the nation — continent, medal count, famous moments, and signature sports.",
          "Guess the country at any time. Fewer clues used means a higher score.",
          "Play daily, unlimited, or filter by continent and season focus."
        ]}
      />
    </>
  );
}
