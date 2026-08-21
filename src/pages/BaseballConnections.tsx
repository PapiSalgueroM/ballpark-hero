import { useState, useEffect } from 'react';
import { useBaseballConnections } from '@/hooks/useBaseballConnections';
import { GameNav } from '@/components/game/GameNav';
import { GameShell } from '@/components/game/GameShell';
import { ResultScreen } from '@/components/game/ResultScreen';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BaseballConnectionsHowToPlay } from '@/components/baseball-connections/BaseballConnectionsHowToPlay';
import { Skeleton } from '@/components/ui/skeleton';

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
    foundGroups,
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
    <>
      <PageSeo
        title="Baseball Connections - MLB Player Grouping Puzzle | DoUKnowBall"
        description="Find four groups of 5 baseball players that share a connection. Same team, award, or era. Daily challenge."
        path="/baseball-connections"
      />
      <GameShell
        width="narrow"
        title="⚾ CONNECTIONS"
        subtitle="Find four groups of 5 baseball players that share a connection"
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
                Groups found: <span className="font-semibold text-[hsl(var(--bb-red-ink))]">{foundGroups}</span>/4
              </span>
              <span className="text-muted-foreground">
                Lives: <span className="font-semibold text-foreground">{'❤️'.repeat(lives)}{'🖤'.repeat(Math.max(0, 4 - lives))}</span>
              </span>
            </div>

            <button
              onClick={() => setShowRules(true)}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs text-muted-foreground hover:text-[hsl(var(--bb-red-ink))] transition-colors"
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
              className="px-6 py-2.5 rounded-xl bg-[hsl(var(--bb-navy))] text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-30 border border-[hsl(var(--bb-red)/0.3)]"
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
              outcomeEmoji={lives > 0 ? '🏆' : '⚾'}
              headline={lives > 0 ? 'All Groups Found!' : 'Out of Lives!'}
              statLine={
                <>
                  Found <span className="font-bold text-[hsl(var(--bb-red-ink))]">{solvedGroups.filter((_, i) => i < puzzle.groups.length && lives > 0 || lives <= 0).length}</span>/4 groups
                  {lives > 0 && ` with ${lives} ${lives === 1 ? 'life' : 'lives'} remaining`}
                </>
              }
              emojiGrid={lives > 0 ? `🏆 Baseball Connections: all 4 groups, ${lives} ${lives === 1 ? 'life' : 'lives'} left` : `⚾ Baseball Connections: ${foundGroups}/4 groups`}
              share={{
                score: lives > 0 ? `all 4 groups with ${lives} ${lives === 1 ? 'life' : 'lives'} left on today's Baseball Connections` : `today's Baseball Connections`,
                gameName: 'Baseball Connections',
                gamePath: '/baseball-connections',
              }}
              onPlayAgain={mode === 'unlimited' ? resetGame : undefined}
              playNext={mode !== 'unlimited' && <p className="text-sm text-muted-foreground">Come back tomorrow for a new puzzle!</p>}
            />
          </div>
        )}

        <GameSeoContent
          pageHasOwnH1
          title="Baseball Connections | DoUKnowBall"
          description="A daily puzzle where you group baseball players by what connects them: same team, same award, same country, or same era."
          howToPlay={[
            'Find four groups of 5 baseball players that share a connection',
            'Select 5 players and submit. If they form a group, it locks in',
            'Groups are color-coded: yellow (easiest) to purple (hardest)',
            'You have 4 lives. Wrong guesses cost a life',
            'New puzzle daily. Share your results!',
          ]}
          examples={[
            "2024 All-Stars: Aaron Judge, Shohei Ohtani, Mookie Betts, Ronald Acuña Jr.",
            "500+ Home Run Club: Barry Bonds, Hank Aaron, Babe Ruth, Alex Rodriguez",
            "Yankees Legends: Derek Jeter, Mariano Rivera, Mickey Mantle, Babe Ruth",
            "Cy Young Award Winners: Clayton Kershaw, Jacob deGrom, Max Scherzer, Greg Maddux",
            "Dominican Republic Stars: David Ortiz, Pedro Martínez, Manny Ramírez, Sammy Sosa"
          ]}
        />

        <AdBanner slot="1234567901" format="horizontal" className="mt-8" />

        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="baseball-connections" gameContext={{ puzzleId: puzzle.id }} />
        </div>
        <GameNav />

        <BaseballConnectionsHowToPlay open={showRules} onOpenChange={setShowRules} />
      </GameShell>
    </>
  );
};

export default BaseballConnections;
