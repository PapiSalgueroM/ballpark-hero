import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { GameNavbar } from '@/components/game/GameNavbar';
import { NascarDriverBoard } from '@/components/nascar-driver/NascarDriverBoard';

export default function GuessNascarDriver() {
  return (
    <>
      <PageSeo
        title="Guess the NASCAR Driver - Cup Series Trivia Game | DoUKnowBall"
        description="Identify the mystery NASCAR Cup Series driver from progressive clues. Daily motorsport trivia challenge."
        path="/guess-nascar-driver"
      />
      <GameNavbar />
      <NascarDriverBoard />
      {/* ROUND 374: this block promised the game as designed rather than as
          built. It advertised car numbers and famous moments, which no clue has
          ever carried and no column in the database holds, and its examples
          quoted career win totals ("93 wins", "200 wins") that nothing here can
          source: nascar_race_results is missing nineteen seasons and mixes in
          exhibition races. The description is what a crawler reads, so it was
          the last place the never-built game survived. */}
      <GameSeoContent
          pageHasOwnH1
        title="Guess The NASCAR Driver | DoUKnowBall"
        description="Identify the mystery NASCAR Cup Series driver from six clues, starting with the years they were winning and ending with races they actually won."
        howToPlay={[
          "Clues reveal in a fixed order: the years they were winning, their championship count, what they drove in a title year, then three real races they won.",
          "Submit your guess when you know the driver. Fewer clues means a higher score.",
          "Play daily for the shared puzzle or switch to unlimited for more NASCAR trivia."
        ]}
      />
    </>
  );
}
