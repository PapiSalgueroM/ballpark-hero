/**
 * Round 216: Wonderkid Factory, the academy idle game. The rules live in
 * src/lib/wonderkidFactory.ts.
 *
 * Round 580: the screen itself moved into src/components/tycoon/AcademyPanel.tsx,
 * because the same academy now also runs on Stadium Tycoon's Academy tab. This
 * page renders that one panel, so the two doors cannot drift, and both read and
 * write the same wonderkidFactoryV1 save through the same hook.
 */
import { Link } from 'react-router-dom';
import { GameNavbar } from '@/components/game/GameNavbar';
import { CelebrationStyles } from '@/components/club-manager/Celebration';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import AcademyPanel from '@/components/tycoon/AcademyPanel';

const WonderkidFactory = () => {
  return (
    <div className="min-h-screen bg-background">
      <GameNavbar />
      <PageSeo
        title="Wonderkid Factory: Free Idle Football Academy Game | DoUKnowBall"
        description="Run a youth academy: scouts find kids, coaches grow them toward hidden ceilings, and you decide when to cash out. Deadline day surges, reputation stars, six regions to climb. Free idle game, no sign-up."
        path="/wonderkid-factory"
      />
      <main id="dukb-main" className="max-w-2xl mx-auto px-4 py-4 md:py-8">
        <CelebrationStyles />
        <header className="text-center mb-1">
          <h1 className="text-3xl md:text-5xl font-bold tracking-[0.08em] text-primary font-display">WONDERKID FACTORY</h1>
        </header>
        <p className="text-center text-[11px] text-muted-foreground mb-1">
          This academy also runs inside <Link to="/stadium-tycoon" className="underline hover:text-foreground">Stadium Tycoon</Link>, on its Academy tab, with the same save.
        </p>

        <AcademyPanel />

        <GameSeoContent
          pageHasOwnH1
          title="Wonderkid Factory"
          description="Run a youth academy: scouts bring in generated kids, coaches grow them toward hidden ceilings, and you decide when to cash out. Deadline day surges, reputation stars and six regions to climb."
        />
      </main>
    </div>
  );
};

export default WonderkidFactory;
