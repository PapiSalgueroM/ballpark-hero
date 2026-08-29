import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { GameNavbar } from '@/components/game/GameNavbar';
import { GameHelp } from '@/components/game/GameHelp';
import { EmojiGuessBoard } from '@/components/emoji-guess/EmojiGuessBoard';

export default function EmojiGuess() {
  return (
    <>
      <PageSeo
        title="Emoji Guess - Football in Emoji | DoUKnowBall"
        description="Five football emoji riddles a day: players, clubs, managers and iconic moments. Three guesses each, a hint after your first miss."
        path="/emoji-guess"
      />
      <GameNavbar />
      <div className="relative z-10 mx-auto w-full max-w-4xl"><GameHelp /></div>
      <EmojiGuessBoard />
      <GameSeoContent
        title="Emoji Guess | DoUKnowBall"
        description="A daily set of five football emoji riddles, the same five for everyone. Each puzzle is a player, club, manager or iconic moment told entirely in emoji. Three guesses per puzzle, with a hint after your first miss. Fewer guesses, more points."
        howToPlay={[
          'Five emoji riddles a day: players, clubs, managers, and iconic moments.',
          'Type your answer, surnames are fine, spelling is forgiving.',
          'First try scores 100, second 60, third 30.',
          'A hint appears after your first wrong guess.',
          'Share the coloured grid when you finish.',
        ]}
        examples={[
          '🐐🇦🇷, you know this one',
          '🍒, a Premier League club',
          '✋🇦🇷1986, a moment that still starts arguments',
          '🧔🍷🇮🇹, a midfielder with a vineyard',
        ]}
      />
    </>
  );
}
