import PageSeo from '@/components/seo/PageSeo';
import { ShirtNumberBoard } from '@/components/shirt-number/ShirtNumberBoard';

export default function ShirtNumber() {
  return (
    <>
      <PageSeo
        title="Shirt Number - Guess the Kit Number | DoUKnowBall"
        description="Can you guess what shirt number a player wears? 3 attempts, higher or lower hints. Daily and unlimited modes."
        path="/shirt-number"
      />
      <ShirtNumberBoard />
    </>
  );
}
