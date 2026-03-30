import { GuessTheYearBoard } from '@/components/guess-year/GuessTheYearBoard';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';

export default function GuessTheYear() {
  return (
    <>
      <PageSeo
        title="Guess The Year — Sports Trivia | DoUKnowBall"
        description="Can you guess what year these famous sports moments happened? Test your sports history knowledge with clues from NFL, NBA, MLB, NHL, UFC, College Football, and more!"
        path="/guess-the-year"
      />
      <GuessTheYearBoard />
      <GameSeoContent
        title="Guess The Year | DoUKnowBall"
        description="Test your sports history knowledge by guessing the year famous moments happened. Covers NFL, NBA, MLB, NHL, UFC, college football, soccer, and more."
        howToPlay={[
          "Read the clue describing a famous sports moment and guess what year it happened.",
          "Use the slider or type the year. You get points based on how close your guess is.",
          "Play through multiple rounds covering all major sports from the 1900s to today."
        ]}
      />
    </>
  );
}
