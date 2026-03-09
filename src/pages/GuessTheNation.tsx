import { GuessTheNationBoard } from '@/components/guess-the-nation/GuessTheNationBoard';
import PageSeo from '@/components/seo/PageSeo';

export default function GuessTheNation() {
  return (
    <>
      <PageSeo
        title="Guess The Nation - World Sporting Trivia"
        description="Can you identify the mystery nation from clues about their sporting history? Test your knowledge of the world's greatest sporting nations!"
        path="/guess-the-nation"
      />
      <GuessTheNationBoard />
    </>
  );
}
