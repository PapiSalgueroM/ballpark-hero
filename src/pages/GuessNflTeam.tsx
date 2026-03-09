import { GuessNflTeamBoard } from '@/components/guess-nfl-team/GuessNflTeamBoard';
import PageSeo from '@/components/seo/PageSeo';

export default function GuessNflTeam() {
  return (
    <>
      <PageSeo
        title="Guess The Pro Football Team - NFL Trivia Game"
        description="Can you identify the mystery NFL team from progressive clues? Test your football knowledge with hints about history, stadium, colors, and more!"
        path="/guess-nfl-team"
      />
      <GuessNflTeamBoard />
    </>
  );
}
