import { GuessNflTeamBoard } from '@/components/guess-nfl-team/GuessNflTeamBoard';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';

export default function GuessNflTeam() {
  return (
    <>
      <PageSeo
        title="Guess The NFL Team — DoUKnowBall"
        description="Can you identify the mystery NFL team from progressive clues? Test your football knowledge with hints about history, stadium, colors, and more!"
        path="/guess-nfl-team"
      />
      <GuessNflTeamBoard />
      <GameSeoContent
        title="Guess The Pro Football Team | DoUKnowBall"
        description="Identify the mystery NFL team from progressive clues about their division, stadium, history, Super Bowl record, and iconic players."
        howToPlay={[
          "Each clue reveals a detail about the team — division, history, stadium, colors, and star players.",
          "Guess the team at any time. The fewer clues you need, the more points you earn.",
          "Play daily for a shared puzzle or try unlimited mode for endless NFL team trivia."
        ]}
      />
    </>
  );
}
