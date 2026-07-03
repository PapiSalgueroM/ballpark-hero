import { useState, useEffect } from 'react';
import { GameNavbar } from '@/components/game/GameNavbar';
import ConquestBoardNba from '@/components/conquest/ConquestBoardNba';
import { GameNav } from '@/components/game/GameNav';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { Footer } from '@/components/game/Footer';
import { ConquestHowToPlayNba } from '@/components/conquest/ConquestHowToPlayNba';
import { HelpCircle } from 'lucide-react';

const ConquestNba = () => {
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem('conquest-nba-how-to-play-seen');
    if (!seen) {
      setShowHelp(true);
      localStorage.setItem('conquest-nba-how-to-play-seen', 'true');
    }
  }, []);

  return (
    <>
      <PageSeo
        title="NBA Conquest - Territory Control Basketball Game | DoUKnowBall"
        description="Risk-style NBA territory game. Draft players and conquer the US map. Strategy meets basketball trivia."
        path="/conquest-nba"
      />
      <div className="min-h-screen bg-background text-foreground">
        <GameNavbar />
        <main className="container max-w-2xl mx-auto px-4 py-6 pb-20">
          <div className="text-center mb-4 relative">
            <h1 className="text-2xl font-display font-bold text-primary">NBA Conquest</h1>
            <p className="text-xs text-muted-foreground mt-1">
              30 teams. 50 states. One champion. Watch the simulation unfold and steal players after every battle.
            </p>
            <button
              onClick={() => setShowHelp(true)}
              className="absolute top-0 right-0 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="How to play"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>
          <ConquestBoardNba />
          <GameSeoContent
            title="NBA Conquest: Territory Domination Game"
            description="Watch 30 NBA teams battle across the US map for total domination. Spin the wheel, simulate realistic play-by-play games, steal players, and conquer every state."
            howToPlay={[
              "Watch NBA teams battle for control of US states in simulated play-by-play matchups.",
              "After each battle, steal a player from the losing team to strengthen your roster.",
              "The last team standing wins. Use power-ups and strategy to dominate the map."
            ]}
            examples={[
              "Denver Nuggets start in Colorado and expand across the Mountain West",
              "Boston Celtics control New England and push into the Northeast",
              "Los Angeles Lakers and Clippers battle for Southern California",
              "Golden State Warriors defend the Bay Area against Pacific rivals",
              "Miami Heat push north from South Florida into the Southeast",
              "Power-ups: Free Agent Signing, Franchise Legend, Territory Steal"
            ]}
          />
          <GameNav />
        </main>
        <Footer />
      </div>
      <ConquestHowToPlayNba open={showHelp} onOpenChange={setShowHelp} />
    </>
  );
};

export default ConquestNba;
