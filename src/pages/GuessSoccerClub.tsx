import { GuessSoccerClubBoard } from '@/components/guess-soccer-club/GuessSoccerClubBoard';
import PageSeo from '@/components/seo/PageSeo';

export default function GuessSoccerClub() {
  return (
    <>
      <PageSeo
        title="Guess The Football Club - Soccer Trivia Game"
        description="Identify the mystery football club from progressive clues! Covers Premier League, La Liga, Serie A, Bundesliga, Ligue 1, and MLS."
        path="/guess-soccer-club"
      />
      <GuessSoccerClubBoard />
    </>
  );
}
