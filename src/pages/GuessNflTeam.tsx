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
        examples={[
          "Dallas Cowboys — NFC East, AT&T Stadium, 5× Super Bowl Champions",
          "Green Bay Packers — NFC North, Lambeau Field, 4× Super Bowl Champions",
          "New England Patriots — AFC East, Gillette Stadium, 6× Super Bowl Champions",
          "San Francisco 49ers — NFC West, Levi's Stadium, 5× Super Bowl Champions",
          "Kansas City Chiefs — AFC West, Arrowhead Stadium, 4× Super Bowl Champions",
          "Pittsburgh Steelers — AFC North, Acrisure Stadium, 6× Super Bowl Champions"
        ]}
      />
    </>
  );
}
