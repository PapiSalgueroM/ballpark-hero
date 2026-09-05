import { GameNavbar } from '@/components/game/GameNavbar';
import { GameHelp } from '@/components/game/GameHelp';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import BuzzerBeaterBoard from '@/components/buzzer-beater/BuzzerBeaterBoard';

const BuzzerBeater = () => (
  <>
    <PageSeo
      title="Buzzer Beater: Ten Jump Shots, One Run | DoUKnowBall"
      description="The basketball game you actually play. Set the arc, fade off the closeout and time the strength bar over ten jump shots, backing up every time. Real rim and ball sizes, so a flat shot has nothing to go through. Daily and unlimited, free, no account needed."
      path="/buzzer-beater"
    />
    <div className="min-h-screen bg-background">
      <GameNavbar />
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-6">
        <header className="mb-4 text-center">
          <h1 className="font-display text-3xl font-black text-foreground">Buzzer Beater</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ten jump shots. Pick the arc, beat the hand, and stop the bar where you dare.
          </p>
        </header>

        <GameHelp />

        <BuzzerBeaterBoard />

        <GameSeoContent
          pageHasOwnH1
          title="Buzzer Beater: The Jump Shot Game | DoUKnowBall"
          description="Ten jump shots, one run, and you back up on every one. Set the arc, fade off the closeout and stop the strength bar in the right place. The rim and the ball are their real sizes, so the hole shrinks as your shot flattens and a line drive has almost nothing to go through. Plays in the browser, free, no account needed."
          howToPlay={[
            'Set the arc with the up and down arrows, or by dragging up and down on the court.',
            'Fade off the closeout with left and right. The ring inset shows where you are pointing.',
            'Hold space or the shoot button to load the strength bar, and let go. The bar is absolute, so the right place to stop it moves with every shot.',
          ]}
          examples={[
            'From the free throw line the ball needs so little strength that a big arc is free, so shoot it high.',
            'From behind the arc that same big arc has to be thrown hard, and a hard release sprays, so flatten it a little.',
            'A hand in your face is a floor under your arc, not a reason to rush: go over it, or fade off it and give up the middle of the ring.',
          ]}
        />
      </main>
    </div>
  </>
);

export default BuzzerBeater;
