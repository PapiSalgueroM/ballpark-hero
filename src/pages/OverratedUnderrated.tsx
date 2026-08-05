import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { GameNavbar } from '@/components/game/GameNavbar';
import { OverratedBoard } from '@/components/overrated-underrated/OverratedBoard';

export default function OverratedUnderrated() {
  return (
    <>
      <PageSeo
        title="Overrated or Underrated? - Daily Football Debate | DoUKnowBall"
        description="Ten real players, ten verdicts. Call each one overrated or underrated, then see exactly how the rest of the internet voted. No right answers, just opinions."
        path="/overrated-underrated"
      />
      <GameNavbar />
      <OverratedBoard />
      <GameSeoContent
        title="Overrated or Underrated? | DoUKnowBall"
        description="A daily football opinion game. You get ten real players with their club, position, age and market value. Call each one overrated or underrated, and after every pick you see the live community split. There is no correct answer, the score is how often you went against the crowd."
        howToPlay={[
          'Each day you get the same 10 players as everyone else.',
          'For each one, decide: is this player overrated or underrated at that market value?',
          'After you vote, the real community split is revealed instantly.',
          'Your score is your contrarian count, how many times you disagreed with the majority.',
          'Go 7+ against the crowd and you are a certified contrarian. Go 0-1 and, well, baa.',
        ]}
        examples={[
          'A €90M forward with 4 goals in 30 games → most vote Overrated',
          'A €12M midfielder starting every game for a title winner → most vote Underrated',
          'A €50M keeper nobody can name → the split gets interesting',
          'Your favourite player, valued fairly → prepare to be outvoted',
        ]}
      />
    </>
  );
}
