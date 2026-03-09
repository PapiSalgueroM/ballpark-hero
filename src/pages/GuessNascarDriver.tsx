import PageSeo from '@/components/seo/PageSeo';
import { NascarDriverBoard } from '@/components/nascar-driver/NascarDriverBoard';

export default function GuessNascarDriver() {
  return (
    <>
      <PageSeo
        title="Guess The NASCAR Driver — DoUKnowBall"
        description="Can you identify the mystery NASCAR Cup Series driver from progressive clues? Test your motorsport knowledge with daily challenges."
        path="/guess-nascar-driver"
      />
      <NascarDriverBoard />
    </>
  );
}
