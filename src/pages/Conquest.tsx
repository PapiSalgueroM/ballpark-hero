import { useState, useEffect } from 'react';
import { GameNavbar } from '@/components/game/GameNavbar';
import ConquestBoard from '@/components/conquest/ConquestBoard';
import { GameNav } from '@/components/game/GameNav';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { Footer } from '@/components/game/Footer';
import { ConquestHowToPlay } from '@/components/conquest/ConquestHowToPlay';
import { HelpCircle } from 'lucide-react';

const Conquest = () => {
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem('conquest-how-to-play-seen');
    if (!seen) {
      setShowHelp(true);
      localStorage.setItem('conquest-how-to-play-seen', 'true');
    }
  }, []);

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
          <div className="text-center mb-4 relative">
            <h1 className="text-2xl font-display font-bold text-primary">NFL Conquest</h1>
            <p className="text-xs text-muted-foreground mt-1">
              32 teams. 50 states. One champion. Watch the simulation unfold and steal players after every battle.
            </p>
            <button
              onClick={() => setShowHelp(true)}
              className="absolute top-0 right-0 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="How to play"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>
          <ConquestBoard />
          <GameSeoContent
            title="NFL Conquest — Territory Domination Game"
            description="Watch 32 NFL teams battle across the US map for total domination. Spin the wheel, simulate realistic play-by-play games, steal players, and conquer every state."
            howToPlay={[
              "Watch NFL teams battle for control of US states in simulated play-by-play matchups.",
              "After each battle, steal a player from the losing team to strengthen your roster.",
              "The last team standing wins. Use power-ups and strategy to dominate the map."
            ]}
            examples={[
              "Kansas City Chiefs start in Missouri and expand westward",
              "Dallas Cowboys control Texas and push into the South",
              "New England Patriots dominate the Northeast corridor",
              "San Francisco 49ers battle for the Pacific Coast",
              "Green Bay Packers defend the Midwest against the Bears",
              "Power-ups: Draft Pick, Trade Block, Home Field Advantage"
            ]}
          />
          <GameNav />
        </main>
        <Footer />
      </div>
      <ConquestHowToPlay open={showHelp} onOpenChange={setShowHelp} />
    </>
  );
};

export default Conquest;
