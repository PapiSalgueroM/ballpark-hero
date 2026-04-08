import { useState, useEffect } from 'react';
import { useBaseballConnections } from '@/hooks/useBaseballConnections';
import { GameNav } from '@/components/game/GameNav';
import { GameNavbar } from '@/components/game/GameNavbar';
import { Footer } from '@/components/game/Footer';
import ShareButtons from '@/components/game/ShareButtons';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BaseballConnectionsHowToPlay } from '@/components/baseball-connections/BaseballConnectionsHowToPlay';

const DIFFICULTY_COLORS: Record<string, string> = {
  yellow: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-200',
  green: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200',
  blue: 'bg-blue-500/20 border-blue-500/40 text-blue-200',
  purple: 'bg-purple-500/20 border-purple-500/40 text-purple-200',
};

const DIFFICULTY_HEADER: Record<string, string> = {
  yellow: 'bg-yellow-500 text-yellow-950',
  green: 'bg-emerald-500 text-emerald-950',
  blue: 'bg-blue-500 text-blue-950',
  purple: 'bg-purple-500 text-purple-950',
};

const BaseballConnections = () => {
  const {
    puzzle,
    remainingPlayers,
    selected,
    togglePlayer,
    submitSelection,
    deselectAll,
    solvedGroups,
    lives,
    gameStatus,
    shakeWrong,
  } = useBaseballConnections();

  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem('bbconn-rules-seen');
    if (!seen) {
      setShowRules(true);
      localStorage.setItem('bbconn-rules-seen', '1');
    }
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <GameNavbar />
      <PageSeo
        title="Baseball Connections – Group 5 Players | DoUKnowBall"
        description="Find four groups of 5 baseball players that share a connection. Same team, award, country, or era. Daily challenge with 4 lives."
        path="/baseball-connections"
      />
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
        <header className="text-center mb-8 relative">
          <button
            onClick={() => setShowRules(true)}
            className="absolute top-0 right-0 p-2 text-muted-foreground hover:text-[hsl(var(--bb-red))] transition-colors"
            aria-label="How to play"
          >
            <HelpCircle className="w-6 h-6" />
          </button>

          <h1 className="text-3xl md:text-5xl font-bold tracking-[0.15em] font-display mb-1 text-[hsl(var(--bb-red))]">
            ⚾ CONNECTIONS
          </h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-md mx-auto">
            Find four groups of 5 baseball players that share a connection
          </p>
          <div className="flex items-center justify-center gap-4 mt-3 text-sm">
            <span className="text-muted-foreground">
              Groups found: <span className="font-semibold text-[hsl(var(--bb-red))]">{solvedGroups.length}</span>/4
            </span>
            <span className="text-muted-foreground">
              Lives: <span className="font-semibold text-foreground">{'❤️'.repeat(lives)}{'🖤'.repeat(Math.max(0, 4 - lives))}</span>
            </span>
          </div>
        </header>

        {/* Solved groups */}
        {solvedGroups.length > 0 && (
          <div className="space-y-3 mb-6">
            {solvedGroups.map((group) => (
              <div
                key={group.theme}
                className={cn(
                  'rounded-xl border p-4 animate-cell-reveal',
                  DIFFICULTY_COLORS[group.difficulty]
                )}
              >
                <p className={cn(
                  'text-xs font-bold uppercase tracking-wider mb-2 px-2 py-1 rounded-md inline-block',
                  DIFFICULTY_HEADER[group.difficulty]
                )}>
                  {group.theme}
                </p>
                <div className="flex flex-wrap gap-2">
                  {group.players.map((p) => (
                    <span key={p} className="text-sm font-semibold">{p}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Remaining player grid */}
        {gameStatus === 'playing' && remainingPlayers.length > 0 && (
          <div className={cn('mb-6', shakeWrong && 'animate-pulse')}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {remainingPlayers.map((name) => (
                <button
                  key={name}
                  onClick={() => togglePlayer(name)}
                  className={cn(
                    'px-3 py-3 rounded-xl border text-sm font-semibold transition-all text-center leading-tight',
                    selected.includes(name)
                      ? 'bg-[hsl(var(--bb-red))] text-white border-[hsl(var(--bb-red))]'
                      : 'bg-card border-border text-foreground hover:border-[hsl(var(--bb-red)/0.5)]'
                  )}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        {gameStatus === 'playing' && (
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={deselectAll}
              disabled={selected.length === 0}
              className="px-5 py-2.5 rounded-xl border border-border text-muted-foreground font-semibold text-sm hover:text-foreground transition-colors disabled:opacity-30"
            >
              Deselect All
            </button>
            <button
              onClick={submitSelection}
              disabled={selected.length !== 5}
              className="px-6 py-2.5 rounded-xl bg-[hsl(var(--bb-navy))] text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-30 border border-[hsl(var(--bb-red)/0.3)]"
            >
              Submit ({selected.length}/5)
            </button>
          </div>
        )}

        {/* Game complete */}
        {gameStatus === 'complete' && (
          <div className="mt-6 flex justify-center">
            <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
              <div className="text-5xl mb-3">{lives > 0 ? '🏆' : '⚾'}</div>
              <h2 className="text-2xl font-bold text-[hsl(var(--bb-red))] font-display mb-2">
                {lives > 0 ? 'All Groups Found!' : 'Out of Lives!'}
              </h2>
              <p className="text-foreground">
                Found <span className="font-bold text-[hsl(var(--bb-red))]">{solvedGroups.filter((_, i) => i < puzzle.groups.length && lives > 0 || lives <= 0).length}</span>/4 groups
                {lives > 0 && ` with ${lives} ${lives === 1 ? 'life' : 'lives'} remaining`}
              </p>
              <ShareButtons
                score={lives > 0 ? `all 4 groups with ${lives} ${lives === 1 ? 'life' : 'lives'} left on today's Baseball Connections` : `today's Baseball Connections`}
                gameName="Baseball Connections"
                gamePath="/baseball-connections"
              />
            </div>
          </div>
        )}

        <GameSeoContent
          title="Baseball Connections | DoUKnowBall"
          description="A daily puzzle where you group baseball players by what connects them — same team, same award, same country, or same era."
          howToPlay={[
            'Find four groups of 5 baseball players that share a connection',
            'Select 5 players and submit — if they form a group, it locks in',
            'Groups are color-coded: yellow (easiest) to purple (hardest)',
            'You have 4 lives — wrong guesses cost a life',
            'New puzzle daily — share your results!',
          ]}
          examples={[
            "2024 All-Stars — Aaron Judge, Shohei Ohtani, Mookie Betts, Ronald Acuña Jr.",
            "500+ Home Run Club — Barry Bonds, Hank Aaron, Babe Ruth, Alex Rodriguez",
            "Yankees Legends — Derek Jeter, Mariano Rivera, Mickey Mantle, Babe Ruth",
            "Cy Young Award Winners — Clayton Kershaw, Jacob deGrom, Max Scherzer, Greg Maddux",
            "Dominican Republic Stars — David Ortiz, Pedro Martínez, Manny Ramírez, Sammy Sosa"
          ]}
        />

        <AdBanner slot="1234567901" format="horizontal" className="mt-8" />

        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="baseball-connections" gameContext={{ puzzleId: puzzle.id }} />
        </div>
        <GameNav />
        <Footer />
      </div>

      <BaseballConnectionsHowToPlay open={showRules} onOpenChange={setShowRules} />
    </main>
  );
};

export default BaseballConnections;
