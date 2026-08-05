import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { GameNavbar } from '@/components/game/GameNavbar';
import { JeopardyBoard } from '@/components/jeopardy/JeopardyBoard';

export default function Jeopardy() {
  return (
    <>
      <PageSeo
        title="Sports Jeopardy - Daily Trivia Board | DoUKnowBall"
        description="A fresh five-category sports Jeopardy board every day. Pick your value, answer the clue, and don't get greedy, wrong answers cost you."
        path="/jeopardy"
      />
      <GameNavbar />
      <JeopardyBoard />
      <GameSeoContent
        title="Sports Jeopardy | DoUKnowBall"
        description="A daily Jeopardy-style board across five sports categories, Ballon d'Or, Premier League, NBA Finals, Super Bowl and more. Clues are worth $200 to $1000 depending on how far back they go. Get it right and bank the money, get it wrong and lose it."
        howToPlay={[
          'Everyone gets the same board each day.',
          'Pick any tile, the value tells you how obscure the clue is.',
          '$200 clues are recent. $1000 clues go back decades.',
          'Type your answer. Close/reuse spelling is fine, surnames count.',
          'Correct answers add the value. Wrong answers subtract it, so the big-money tiles are a real gamble.',
          'Clear the board to bank your final score.',
        ]}
        examples={[
          '$200, "This player won the Ballon d\'Or in 2024" → Rodri',
          '$600, "This club won the Premier League title in 1995" → Blackburn Rovers',
          '$600, "This player was MVP of Super Bowl XXIX" → Steve Young',
          '$1000, the ones your dad would get and you wouldn\'t',
        ]}
      />
    </>
  );
}
