import { GuessTheYearBoard } from '@/components/guess-year/GuessTheYearBoard';
import PageSeo from '@/components/seo/PageSeo';

export default function GuessTheYear() {
  return (
    <>
      <PageSeo
        title="Guess The Year - Sports Trivia Game"
        description="Can you guess what year these famous sports moments happened? Test your sports history knowledge with clues from NFL, NBA, MLB, NHL, UFC, College Football, and more!"
        path="/guess-the-year"
      />
      <GuessTheYearBoard />
    </>
  );
}
