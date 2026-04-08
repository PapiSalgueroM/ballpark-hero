import { TennisPlayerBoard } from '@/components/tennis-player/TennisPlayerBoard';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';

export default function GuessTennisPlayer() {
  return (
    <>
      <PageSeo
        title="Guess The Tennis Player — DoUKnowBall"
        description="Can you identify the mystery tennis player from clues about their career? Test your knowledge of ATP and WTA legends from 1970 to 2025!"
        path="/guess-tennis-player"
      />
      <TennisPlayerBoard />
      <GameSeoContent
        title="Guess The Tennis Player | DoUKnowBall"
        description="Identify the mystery tennis player from progressive clues about their Grand Slam record, nationality, era, and famous moments. Covers ATP and WTA from 1970 to 2025."
        howToPlay={[
          "Clues are revealed one at a time — tour, nationality, slam count, and career highlights.",
          "Submit your guess when you think you know the player. Fewer clues equals more points.",
          "Play the daily puzzle or switch to unlimited mode for endless tennis trivia."
        ]}
        examples={[
          "Roger Federer — Switzerland, 20 Grand Slams, 2003–2018 dominance",
          "Serena Williams — USA, 23 Grand Slams, WTA GOAT",
          "Rafael Nadal — Spain, 22 Grand Slams, King of Clay",
          "Novak Djokovic — Serbia, 24 Grand Slams, most weeks at #1",
          "Steffi Graf — Germany, 22 Slams, Golden Slam 1988",
          "Billie Jean King — USA, 12 Slams, Battle of the Sexes pioneer"
        ]}
      />
    </>
  );
}
