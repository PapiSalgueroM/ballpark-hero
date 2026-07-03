import { GuessTheYearBoard } from '@/components/guess-year/GuessTheYearBoard';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';

export default function GuessTheYear() {
  return (
    <>
      <PageSeo
        title="Guess the Year - Sports History Trivia Game | DoUKnowBall"
        description="Guess what year famous sports moments happened. NFL, NBA, MLB, NHL, UFC, and more. Daily trivia challenge."
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
        examples={[
          "Michael Jordan hits 'The Last Shot' to win his 6th title: 1998",
          "Leicester City wins the Premier League at 5000-1 odds: 2016",
          "USA Women's Soccer wins the World Cup on home soil: 1999",
          "Tom Brady wins his first Super Bowl with the Patriots: 2002",
          "Usain Bolt breaks the 100m world record in Beijing: 2008",
          "Argentina wins the World Cup in Qatar, Messi's crowning moment: 2022",
          "Tiger Woods wins the Masters in his iconic comeback: 2019"
        ]}
      />
    </>
  );
}
