import { TennisPlayerBoard } from '@/components/tennis-player/TennisPlayerBoard';
import PageSeo from '@/components/seo/PageSeo';

export default function GuessTennisPlayer() {
  return (
    <>
      <PageSeo
        title="Guess The Tennis Player - Tennis Trivia Game"
        description="Can you identify the mystery tennis player from clues about their career? Test your knowledge of ATP and WTA legends from 1970 to 2025!"
        path="/guess-tennis-player"
      />
      <TennisPlayerBoard />
    </>
  );
}
