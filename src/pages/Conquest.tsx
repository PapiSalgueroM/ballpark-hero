import { useState, useEffect } from 'react';
import { GameNavbar } from '@/components/game/GameNavbar';
import ConquestBoard from '@/components/conquest/ConquestBoard';
import ImperialismBoard from '@/components/conquest/ImperialismBoard';
import { GameNav } from '@/components/game/GameNav';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { ConquestHowToPlay } from '@/components/conquest/ConquestHowToPlay';
import { HelpCircle } from 'lucide-react';

type ConquestMode = 'select' | 'imperialism' | 'arcade';

const Conquest = () => {
  const [showHelp, setShowHelp] = useState(false);
  const [mode, setMode] = useState<ConquestMode>('select');

  useEffect(() => {
    if (mode !== 'arcade') return;
    const seen = localStorage.getItem('conquest-how-to-play-seen');
    if (!seen) {
      setShowHelp(true);
      localStorage.setItem('conquest-how-to-play-seen', 'true');
    }
  }, [mode]);

  return (
    <>
      <PageSeo
        title="NFL Conquest - Territory Control Football Game | DoUKnowBall"
        description="Risk-style NFL territory game. Draft players and conquer the US map. Strategy meets football trivia."
        path="/conquest"
      />
      <div className="min-h-screen bg-background text-foreground">
        <GameNavbar />
        <main className="container max-w-2xl mx-auto px-4 py-6 pb-20">
          <div className="text-center mb-4 relative">
            <h1 className="text-2xl font-display font-bold text-primary">NFL Conquest</h1>
            <p className="text-xs text-muted-foreground mt-1">
              {mode === 'imperialism'
                ? 'The imperialism map: winners take entire empires, the wiped-out fight back, one team ends up ruling America.'
                : '32 teams. 50 states. One champion.'}
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
                  The format the internet knows. Every state belongs to its nearest stadium, every
                  winner annexes the loser's whole empire, and wiped-out teams can storm back with
                  one win. Pick a team, call the games, survive 18 weeks and the playoffs.
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
                  grab power-ups, and expand state by state until the map is yours.
                </p>
              </button>
            </div>
          )}

          {mode === 'imperialism' && <ImperialismBoard />}
          {mode === 'arcade' && <ConquestBoard />}
          <GameSeoContent
            title="NFL Conquest: Territory Domination Game"
            description="Two ways to conquer America. Imperialism mode plays the classic map format: every state starts with its nearest stadium, winners annex the loser's entire empire, wiped-out teams can storm back with one win, and a territory-seeded playoff crowns the ruler of the map. Arcade mode is the original battle sim with player steals and power-ups."
            howToPlay={[
              "Imperialism mode: pick your team, predict their game each week, then watch all 32 results redraw the map. Winners take EVERYTHING the loser owned.",
              "Wiped off the map? Keep playing. One win takes your conqueror's whole empire back.",
              "After 18 weeks the top 8 empires enter the playoffs. Losers hand everything to the winners until one team rules America.",
              "Arcade mode keeps the original formula: play-by-play battles, steal a player from every beaten team, grab power-ups, expand state by state."
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
      </div>
      <ConquestHowToPlay open={showHelp} onOpenChange={setShowHelp} />
    </>
  );
};

export default Conquest;
