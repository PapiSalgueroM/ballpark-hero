import { GuessSoccerClubBoard } from '@/components/guess-soccer-club/GuessSoccerClubBoard';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';

export default function GuessSoccerClub() {
  return (
    <>
      <PageSeo
        title="Guess the Football Club - Soccer Club Trivia | DoUKnowBall"
        description="Identify the mystery football club from progressive clues. Premier League, La Liga, Serie A, and more."
        path="/guess-soccer-club"
      />
      <GuessSoccerClubBoard />
      <GameSeoContent
        title="Guess The Football Club | DoUKnowBall"
        description="Identify the mystery soccer club from progressive text clues about their vibe, league, trophies, kit colors, and notable current players. Covers all major European leagues and MLS."
        howToPlay={[
          "Clues are revealed one by one: vibe, league and country, league titles won, kit colors, notable current players, then the club name.",
          "Submit your guess when you think you know the club. Fewer clues equals a higher score.",
          "Choose from daily, unlimited, league-specific, or Big 6 modes."
        ]}
        examples={[
          "Real Madrid: La Liga, Santiago Bernabéu, 15× Champions League",
          "Liverpool: Premier League, Anfield, 6× Champions League",
          "Bayern Munich: Bundesliga, Allianz Arena, 6× Champions League",
          "AC Milan: Serie A, San Siro, 7× Champions League",
          "Barcelona: La Liga, Spotify Camp Nou, Messi, Xavi, Iniesta",
          "Inter Miami: MLS, Chase Stadium, Messi, Busquets, Alba"
        ]}
      />
    </>
  );
}
