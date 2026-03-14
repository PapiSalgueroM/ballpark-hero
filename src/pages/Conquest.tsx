import { GameNavbar } from '@/components/game/GameNavbar';
import ConquestBoard from '@/components/conquest/ConquestBoard';
import { GameNav } from '@/components/game/GameNav';
import PageSeo from '@/components/seo/PageSeo';
import { Footer } from '@/components/game/Footer';

const Conquest = () => {
  return (
    <>
      <PageSeo
        title="NFL Conquest — Territory Domination Game | Do You Know Ball"
        description="Watch 32 NFL teams battle across the US map for total domination. Spin the wheel, simulate games, steal players, and conquer every state."
        path="/conquest"
      />
      <div className="min-h-screen bg-background text-foreground">
        <GameNavbar />
        <main className="container max-w-2xl mx-auto px-4 py-6 pb-20">
          <div className="text-center mb-4">
            <h1 className="text-2xl font-display font-bold text-primary">NFL Conquest</h1>
            <p className="text-xs text-muted-foreground mt-1">
              32 teams. 50 states. One champion. Watch the simulation unfold and steal players after every battle.
            </p>
          </div>
          <ConquestBoard />
          <GameNav />
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Conquest;
