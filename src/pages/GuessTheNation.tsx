import { GuessTheNationBoard } from '@/components/guess-the-nation/GuessTheNationBoard';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { GameNavbar } from '@/components/game/GameNavbar';
import { GameHelp } from '@/components/game/GameHelp';

export default function GuessTheNation() {
  return (
    <>
      <PageSeo
        title="Guess the Nation - Sporting Nation Trivia | DoUKnowBall"
        description="Identify the mystery nation from clues about their sporting history. Daily world sports trivia challenge."
        path="/guess-the-nation"
      />
      <GameNavbar />
      <div className="relative mx-auto w-full max-w-4xl"><GameHelp /></div>
      <GuessTheNationBoard />
      <GameSeoContent
          pageHasOwnH1
        title="Guess The Sporting Nation | DoUKnowBall"
        description="Identify the mystery nation from progressive clues about their Olympic history, medal count, famous sporting moments, and best sports."
        howToPlay={[
          "Each clue reveals details about the nation: continent, medal count, famous moments, and signature sports.",
          "Guess the country at any time. Fewer clues used means a higher score.",
          "Play daily, unlimited, or filter by continent and season focus."
        ]}
        examples={[
          "USA: 2,600+ Olympic medals, home to NFL/NBA/MLB, hosted 1984/1996 Games",
          "Jamaica: Sprint powerhouse, Usain Bolt, Bob Marley's homeland",
          "Norway: Winter Olympics dominance, cross-country skiing, 400+ medals",
          "Australia: Cricket, rugby, swimming, hosted 2000 Sydney Games",
          "Brazil: 5× FIFA World Cup, Pelé, hosted 2016 Rio Olympics",
          "South Korea: 1988 Seoul Olympics, archery dominance, esports powerhouse",
          "Kenya: Marathon legends, Eliud Kipchoge, East African distance running"
        ]}
      />
    </>
  );
}
