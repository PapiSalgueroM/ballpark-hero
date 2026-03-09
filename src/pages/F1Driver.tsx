import PageSeo from '@/components/seo/PageSeo';
import { F1DriverBoard } from '@/components/f1-driver/F1DriverBoard';

export default function F1Driver() {
  return (
    <>
      <PageSeo
        title="Guess The F1 Driver — DoUKnowBall"
        description="Can you identify the mystery F1 driver from progressive clues? Test your motorsport knowledge with daily challenges."
        path="/f1-driver"
      />
      <F1DriverBoard />
    </>
  );
}
