import { GuessSoccerClubBoard } from '@/components/guess-soccer-club/GuessSoccerClubBoard';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';

export default function GuessSoccerClub() {
  return (
    <>
      <PageSeo
        title="Guess The Football Club — DoUKnowBall"
        description="Identify the mystery football club from progressive clues! Covers Premier League, La Liga, Serie A, Bundesliga, Ligue 1, and MLS."
        path="/guess-soccer-club"
      />
      <GuessSoccerClubBoard />
      <GameSeoContent
        title="Guess The Football Club | DoUKnowBall"
        description="Identify the mystery soccer club from progressive clues about their league, country, stadium, trophies, and famous players. Covers all major European leagues and MLS."
        howToPlay={[
          "Clues are revealed one by one — league, country, stadium, trophy count, and iconic players.",
          "Submit your guess when you think you know the club. Fewer clues equals a higher score.",
          "Choose from daily, unlimited, league-specific, or Big 6 modes."
        ]}
      />
    </>
  );
}
