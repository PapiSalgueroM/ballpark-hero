import { useState, useEffect } from 'react';
import { GameNavbar } from '@/components/game/GameNavbar';
import { GameHelp } from '@/components/game/GameHelp';
import ConquestBoardNba from '@/components/conquest/ConquestBoardNba';
import ImperialismBoardNba from '@/components/conquest/ImperialismBoardNba';
import { GameNav } from '@/components/game/GameNav';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { ConquestHowToPlayNba } from '@/components/conquest/ConquestHowToPlayNba';
import { HelpCircle } from 'lucide-react';

type ConquestMode = 'select' | 'imperialism' | 'arcade';

const ConquestNba = () => {
  const [showHelp, setShowHelp] = useState(false);
  const [mode, setMode] = useState<ConquestMode>('select');

  useEffect(() => {
    if (mode !== 'arcade') return;
    const seen = localStorage.getItem('conquest-nba-how-to-play-seen');
    if (!seen) {
      setShowHelp(true);
      localStorage.setItem('conquest-nba-how-to-play-seen', 'true');
    }
  }, [mode]);

  return (
    <>
      <PageSeo
        title="NBA Conquest - Territory Control Basketball Game | DoUKnowBall"
        description="Territory conquest with NBA teams. Draft players and conquer the US map. Strategy meets basketball trivia."
        path="/conquest-nba"
      />
      <div className="min-h-screen bg-background text-foreground">
        <GameNavbar />
        <div className="relative z-10 mx-auto w-full max-w-4xl"><GameHelp /></div>
        <main id="dukb-main" className="container max-w-2xl mx-auto px-4 py-6 pb-20">
          <div className="text-center mb-4 relative">
            <h1 className="text-2xl font-display font-bold text-primary">NBA Conquest</h1>
            <p className="text-xs text-muted-foreground mt-1">
              {mode === 'imperialism'
                ? 'The imperialism map: winners take entire empires, the wiped-out fight back, one team ends up ruling America.'
                : '30 teams. One map. One champion.'}
            </p>
            {mode === 'arcade' && (
              <button
                onClick={() => setShowHelp(true)}
                className="absolute top-0 right-0 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="How to play"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
            )}
            {mode !== 'select' && (
              <button
                onClick={() => setMode('select')}
                className="absolute top-0 left-0 rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground"
              >
                Modes
              </button>
            )}
          </div>

          {mode === 'select' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => setMode('imperialism')}
                className="rounded-2xl border-2 border-primary/50 bg-card p-5 text-left transition-all hover:border-primary hover:scale-[1.01]"
              >
                <div className="text-3xl">🗺️</div>
                <p className="mt-2 font-display text-lg font-bold text-foreground">Imperialism</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  The format the internet knows. Every territory belongs to its nearest NBA arena,
                  every winner annexes the loser's whole empire, and wiped-out teams can storm back
                  with one win. Pick a team, call the games, survive 14 rounds and the playoffs.
                </p>
                <span className="mt-2 inline-block rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">NEW · recommended</span>
              </button>
              <button
                onClick={() => setMode('arcade')}
                className="rounded-2xl border border-border bg-card p-5 text-left transition-all hover:border-primary/50 hover:scale-[1.01]"
              >
                <div className="text-3xl">🎮</div>
                <p className="mt-2 font-display text-lg font-bold text-foreground">Arcade</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  The original mode: play-by-play battles, steal a player from every beaten team,
                  grab power-ups, and expand territory by territory until the map is yours.
                </p>
              </button>
            </div>
          )}

          {mode === 'imperialism' && <ImperialismBoardNba />}
          {mode === 'arcade' && <ConquestBoardNba />}
          <GameSeoContent
          pageHasOwnH1
            title="NBA Conquest: Territory Domination Game"
            description="Two ways to conquer America. Imperialism mode plays the classic map format: every territory starts with its nearest NBA arena, winners annex the loser's entire empire, wiped-out teams can storm back with one win, and a territory-seeded playoff crowns the ruler of the map. Arcade mode is the original battle sim with player steals and power-ups."
            howToPlay={[
              "Imperialism mode: pick your team, predict their game each round, then watch all 30 results redraw the map. Winners take EVERYTHING the loser owned.",
              "Wiped off the map? Keep playing. One win takes your conqueror's whole empire back.",
              "After 14 rounds the top 8 empires enter the playoffs. Losers hand everything to the winners until one team rules America.",
              "Arcade mode keeps the original formula: play-by-play battles, steal a player from every beaten team, grab power-ups, expand territory by territory."
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
      </div>
      <ConquestHowToPlayNba open={showHelp} onOpenChange={setShowHelp} />
    </>
  );
};

export default ConquestNba;
