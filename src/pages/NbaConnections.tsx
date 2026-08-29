import { useState, useEffect } from 'react';
import { useNbaConnections } from '@/hooks/useNbaConnections';
import { GameNav } from '@/components/game/GameNav';
import { GameShell } from '@/components/game/GameShell';
import { ResultScreen } from '@/components/game/ResultScreen';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NbaConnectionsHowToPlay } from '@/components/nba-connections/NbaConnectionsHowToPlay';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * NBA Connections, direct port of BaseballConnections.tsx (task #26) on the
 * generic primary palette (the baseball page's --bb-* vars stay baseball's).
 */

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

const NbaConnections = () => {
  const {
    mode,
    switchMode,
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
    resetGame,
    isLoading,
  } = useNbaConnections();

  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem('nbaconn-rules-seen');
    if (!seen) {
      setShowRules(true);
      localStorage.setItem('nbaconn-rules-seen', '1');
    }
  }, []);

  return (
    <>
      <PageSeo
        title="NBA Connections - Basketball Player Grouping Puzzle | DoUKnowBall"
        description="Find four groups of 5 NBA players that share a connection. Same franchise, milestone, or draft class. Daily challenge."
        path="/nba-connections"
      />
      <GameShell
        /* Round 348: this page passes its own labelled rules button through
           headerExtra, so the shell must not add a second one. */
        help="none"
        width="narrow"
        title="🏀 CONNECTIONS"
        subtitle="Find four groups of 5 NBA players that share a connection"
        headerExtra={
          <>
            {/* Daily / Unlimited toggle */}
            <div className="flex items-center justify-center gap-1 mt-4 bg-secondary rounded-full p-1 w-fit mx-auto">
              {(['daily', 'unlimited'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => switchMode(m)}
                  className={cn(
                    'px-5 py-1.5 rounded-full text-sm font-semibold transition-all',
                    mode === m
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {m === 'daily' ? '📅 Daily' : '∞ Unlimited'}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-center gap-4 mt-3 text-sm">
              <span className="text-muted-foreground">
                Groups found: <span className="font-semibold text-primary">{solvedGroups.length}</span>/4
              </span>
              <span className="text-muted-foreground">
                Lives: <span className="font-semibold text-foreground">{'❤️'.repeat(lives)}{'🖤'.repeat(Math.max(0, 4 - lives))}</span>
              </span>
            </div>

            <button
              onClick={() => setShowRules(true)}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-primary"
              aria-label="How to play"
            >
              <HelpCircle className="w-4 h-4" /> How to play
            </button>
          </>
        }
      >
        {/* Loading guard */}
        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" aria-live="polite" aria-busy="true">
            <span className="sr-only">Loading today's puzzle…</span>
            {Array.from({ length: 20 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        )}

        {/* Solved groups */}
        {!isLoading && solvedGroups.length > 0 && (
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
        {!isLoading && gameStatus === 'playing' && remainingPlayers.length > 0 && (
          <div className={cn('mb-6', shakeWrong && 'animate-pulse')}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {remainingPlayers.map((name) => (
                <button
                  key={name}
                  onClick={() => togglePlayer(name)}
                  className={cn(
                    'px-3 py-3 rounded-xl border text-sm font-semibold transition-all text-center leading-tight',
                    selected.includes(name)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card border-border text-foreground hover:border-primary/50'
                  )}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        {!isLoading && gameStatus === 'playing' && (
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
              className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-30"
            >
              Submit ({selected.length}/5)
            </button>
          </div>
        )}

        {/* Game complete */}
        {!isLoading && gameStatus === 'complete' && (
          <div className="mt-6 flex justify-center">
            <ResultScreen
              won={lives > 0}
              outcomeEmoji={lives > 0 ? '🏆' : '🏀'}
              headline={lives > 0 ? 'All Groups Found!' : 'Out of Lives!'}
              statLine={
                <>
                  Found <span className="font-bold text-primary">{solvedGroups.length}</span>/4 groups
                  {lives > 0 && ` with ${lives} ${lives === 1 ? 'life' : 'lives'} remaining`}
                </>
              }
              emojiGrid={lives > 0 ? `🏆 NBA Connections: all 4 groups, ${lives} ${lives === 1 ? 'life' : 'lives'} left` : `🏀 NBA Connections: ${solvedGroups.length}/4 groups`}
              share={{
                score: lives > 0 ? `all 4 groups with ${lives} ${lives === 1 ? 'life' : 'lives'} left on today's NBA Connections` : `today's NBA Connections`,
                gameName: 'NBA Connections',
                gamePath: '/nba-connections',
              }}
              onPlayAgain={mode === 'unlimited' ? resetGame : undefined}
              playNext={mode !== 'unlimited' && <p className="text-sm text-muted-foreground">Come back tomorrow for a new puzzle!</p>}
            />
          </div>
        )}

        <GameSeoContent
          pageHasOwnH1
          title="NBA Connections | DoUKnowBall"
          description="A daily puzzle where you group NBA players by what connects them: same franchise, same milestone, same country, or same draft slot."
          howToPlay={[
            'Find four groups of 5 NBA players that share a connection',
            'Select 5 players and submit. If they form a group, it locks in',
            'Groups are color-coded: yellow (easiest) to purple (hardest)',
            'You have 4 lives. Wrong guesses cost a life',
            'New puzzle daily. Share your results!',
          ]}
          examples={[
            '28,000+ career points: Karl Malone, Kobe Bryant, Dirk Nowitzki...',
            'Drafted #1 overall: Allen Iverson, Yao Ming, Zion Williamson...',
            'Born in France: Tony Parker, Rudy Gobert, Boris Diaw...',
            '10,000+ career assists: John Stockton, Jason Kidd, Chris Paul...',
          ]}
        />

        <AdBanner slot="1234567906" format="horizontal" className="mt-8" />

        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="nba-connections" gameContext={{ puzzleId: puzzle?.id }} />
        </div>
        <GameNav />

        <NbaConnectionsHowToPlay open={showRules} onOpenChange={setShowRules} />
      </GameShell>
    </>
  );
};

export default NbaConnections;
