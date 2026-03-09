import PageSeo from '@/components/seo/PageSeo';
import { F1ConstructorBoard } from '@/components/f1-constructor/F1ConstructorBoard';

export default function F1Constructor() {
  return (
    <>
      <PageSeo
        title="Guess The F1 Constructor — DoUKnowBall"
        description="Can you identify the mystery F1 constructor from progressive clues? Test your motorsport knowledge with daily challenges."
        path="/f1-constructor"
      />
      <F1ConstructorBoard />
    </>
  );
}
