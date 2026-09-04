import { GameNavbar } from '@/components/game/GameNavbar';
import { GameHelp } from '@/components/game/GameHelp';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import FreeKickBoard from '@/components/free-kick/FreeKickBoard';
import { ROUNDS_PER_RUN } from '@/lib/freeKick';

const FreeKick = () => (
  <>
    <PageSeo
      title="Free Kick: Bend One Into the Top Corner | DoUKnowBall"
      description="The first DoUKnowBall game you actually play rather than answer. Aim, bend it and time your power over ten free kicks, past a growing wall and a keeper who reads you. Daily and unlimited, free, no account needed."
      path="/free-kick"
    />
    <div className="min-h-screen bg-background">
      <GameNavbar />
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-6">
        <header className="mb-4 text-center">
          <h1 className="font-display text-3xl font-black text-foreground">Free Kick</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ten kicks. Aim it, bend it, and stop the power bar where you dare.
          </p>
        </header>

        <GameHelp />

        <FreeKickBoard />

        <GameSeoContent
          pageHasOwnH1
          title="Free Kick: The Set Piece Game | DoUKnowBall"
          description="Ten free kicks, one run. Aim across the goal, bend the ball with the outside or inside of your foot, and time the power bar. Blast it and it sprays wide, roll it and the keeper reaches it. Every kick moves further out with more men in the wall. Plays in the browser, free, no account needed."
          howToPlay={[
            'Aim with the arrow keys or by dragging the pitch, then bend the flight with Q and E.',
            'Hold space or the strike button to charge, and release to hit it. The bar sweeps, so the power you get is the power you timed.',
            `Ten kicks per run, each one harder: further out, more defenders, better keepers.`,
          ]}
          examples={[
            'A penalty rolled into the bottom corner beats a penalty smashed down the middle.',
            'Four in the wall and 20 metres out: lift it and bend it back, or waste the kick.',
            'The keeper who leans left has left you the right hand side, if you can find it under pressure.',
          ]}
        />
      </main>
    </div>
  </>
);

export default FreeKick;
