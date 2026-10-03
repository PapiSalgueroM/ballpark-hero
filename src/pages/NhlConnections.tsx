import { useState, useEffect, useRef } from 'react';
import { useRevealScroll } from '@/hooks/useRevealScroll';
import { useNhlConnections } from '@/hooks/useNhlConnections';
import { GameNav } from '@/components/game/GameNav';
import { GameShell } from '@/components/game/GameShell';
import { ResultScreen } from '@/components/game/ResultScreen';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NhlConnectionsHowToPlay } from '@/components/nhl-connections/NhlConnectionsHowToPlay';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * NHL Connections, direct port of NbaConnections/NflConnections (task #26).
 * Keep the connections pages in lockstep if the mechanic changes.
 */

const DIFFICULTY_COLORS: Record<string, string> = {
  yellow: 'bg-yellow-500/10 border-yellow-500/40 text-foreground',
  green: 'bg-emerald-500/10 border-emerald-500/40 text-foreground',
  blue: 'bg-blue-500/10 border-blue-500/40 text-foreground',
  purple: 'bg-purple-500/10 border-purple-500/40 text-foreground',
};

const NhlConnections = () => {
  const {
    mode,
    switchMode,
    puzzle,
    remainingPlayers,
    selected,
    drafts,
    selectDraft,
    notice,
    notesWarning,
    canSubmit,
    togglePlayer,
    submitSelection,
    deselectAll,
    solvedGroups,
    foundGroups,
    lives,
    gameStatus,
    shakeWrong,
    resetGame,
    isLoading,
  } = useNhlConnections();

  const [showRules, setShowRules] = useState(false);
  const actionRef = useRef<HTMLDivElement>(null);
  const focusedReceipt = useRef(0);
  const receiptRef = useRevealScroll(showRules ? null : `${mode}:${notice.id}:${gameStatus}`);
  useEffect(() => {
    if (notice.id > focusedReceipt.current && notice.text && !showRules) {
      focusedReceipt.current = notice.id;
      actionRef.current?.focus({ preventScroll: true });
    }
  }, [notice.id, notice.text, showRules]);

  useEffect(() => {
    let seen = false;
    try { seen = Boolean(localStorage.getItem('nhlconn-planning-rules-seen-v1')); } catch { /* Rules remain reachable. */ }
    if (!seen) {
      setShowRules(true);
      try { localStorage.setItem('nhlconn-planning-rules-seen-v1', '1'); } catch { /* Session only. */ }
    }
  }, []);

  return (
    <>
      <PageSeo
        title="NHL Connections - Hockey Player Grouping Puzzle | DoUKnowBall"
        description="Find four groups of 5 NHL players that share a connection. Same franchise or career milestone. Daily challenge."
        path="/nhl-connections"
      />
      <GameShell
        width="narrow"
        title="🏒 NHL CONNECTIONS"
        subtitle="Find four groups of 5 NHL players that share a connection"
        headerExtra={
          <>
            {/* Daily / Unlimited toggle */}
            <div className="flex items-center justify-center gap-1 mt-4 bg-secondary rounded-full p-1 w-fit mx-auto">
              {(['daily', 'unlimited'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => switchMode(m)}
                  aria-pressed={mode === m}
                  className={cn(
                    'min-h-[44px] px-5 py-1.5 rounded-full text-sm font-semibold transition-colors',
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
                Groups found: <span className="font-semibold text-primary">{foundGroups}</span>/4
              </span>
              <span className="text-muted-foreground">
                <span aria-label={`${lives} lives remaining`}>Lives: <span className="font-semibold text-foreground">{lives}/4</span></span>
              </span>
            </div>

            <button
              onClick={() => setShowRules(true)}
              className="mt-2 min-h-[44px] inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-primary"
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

        {/* Remaining player grid */}
        {!isLoading && gameStatus === 'playing' && remainingPlayers.length > 0 && (
          <section data-nhl-planning="" aria-label="Planning bench" className="space-y-3 rounded-2xl border border-border bg-card p-3">
            <div>
              <h2 className="font-display text-lg font-bold">Plan your groups</h2>
              <p className="text-xs text-muted-foreground">Park ideas in A to D. Tap a name to move it into your open draft; tap it again to remove it. A wrong submission costs one life.</p>
            </div>
            <div className="grid grid-cols-4 gap-1" aria-label="Draft groups">
              {['A', 'B', 'C', 'D'].map((label, index) => <button key={label}
                aria-label={`Draft ${label}`} aria-pressed={drafts?.active === index}
                onClick={() => { if (!showRules) selectDraft(index); }}
                className={cn('min-h-[44px] rounded-lg border px-1 text-sm font-semibold', drafts?.active === index ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground')}>
                {label} <span className="text-xs tabular-nums">{drafts?.groups[index].length ?? 0}/5</span>
              </button>)}
            </div>
            <div role="group" aria-label="Available players" tabIndex={0} className={cn('max-h-[272px] overflow-y-auto overscroll-contain rounded-lg p-1', shakeWrong && 'motion-safe:animate-pulse')}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {remainingPlayers.map((name) => {
                const assignment = drafts?.groups.findIndex(group => group.includes(name)) ?? -1;
                return (
                <button
                  key={name}
                  aria-label={name} aria-pressed={selected.includes(name)}
                  aria-description={assignment >= 0 ? `In draft ${'ABCD'[assignment]}` : 'Not assigned to a draft'}
                  onClick={() => { if (!showRules) togglePlayer(name); }}
                  className={cn(
                    'relative min-h-[52px] px-2 py-2 rounded-xl border text-sm font-semibold transition-colors text-center leading-tight',
                    selected.includes(name)
                      ? 'bg-primary/15 text-foreground border-primary'
                      : 'bg-card border-border text-foreground hover:border-primary/50'
                  )}
                >
                  <span className="block pr-3">{name}</span>
                  {assignment >= 0 && <span aria-hidden="true" className="absolute right-1 top-1 text-[10px] font-bold text-primary">{'ABCD'[assignment]}</span>}
                </button>
              ); })}
            </div>
          </div>
          <div ref={receiptRef}>
          <div ref={actionRef} tabIndex={-1} className="space-y-2 rounded-lg focus:outline-none">
            {notice.text && <p role="status" data-nhl-receipt="" className="text-sm font-semibold">{notice.text}</p>}
            <p className="text-xs text-muted-foreground">Draft {'ABCD'[drafts?.active ?? 0]}: {selected.length}/5. Planning costs nothing.</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => { if (!showRules) deselectAll(); }}
              disabled={selected.length === 0}
              className="min-h-[44px] px-2 py-2 rounded-xl border border-border text-muted-foreground font-semibold text-sm hover:text-foreground transition-colors disabled:opacity-30"
            >
              Clear draft
            </button>
            <button
              onClick={() => { if (!showRules) submitSelection(); }}
              disabled={!canSubmit}
              className="min-h-[44px] px-2 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-30"
            >
              Submit five
            </button>
          </div>
          </div>
          </div>
          {notesWarning && <p role="alert" className="text-xs text-amber-600 dark:text-amber-400">Notes could not be saved in this browser. Keep this tab open to keep planning.</p>}
          </section>
        )}

        {/* Game complete */}
        {!isLoading && gameStatus === 'complete' && (
          <div ref={receiptRef} data-nhl-final="" className="mt-4 flex justify-center">
            <ResultScreen
              won={lives > 0}
              outcomeEmoji={lives > 0 ? '🏆' : '🏒'}
              headline={lives > 0 ? 'All Groups Found!' : 'Out of Lives!'}
              statLine={
                <>
                  Found <span className="font-bold text-primary">{foundGroups}</span>/4 groups
                  {lives > 0 && ` with ${lives} ${lives === 1 ? 'life' : 'lives'} remaining`}
                </>
              }
              emojiGrid={lives > 0 ? `🏆 NHL Connections: all 4 groups, ${lives} ${lives === 1 ? 'life' : 'lives'} left` : `🏒 NHL Connections: ${foundGroups}/4 groups`}
              share={{
                score: lives > 0 ? `all 4 groups with ${lives} ${lives === 1 ? 'life' : 'lives'} left on today's NHL Connections` : `${foundGroups}/4 groups on today's NHL Connections`,
                gameName: 'NHL Connections',
                gamePath: '/nhl-connections',
              }}
              onPlayAgain={mode === 'unlimited' ? resetGame : undefined}
              playNext={mode !== 'unlimited' && <p className="text-sm text-muted-foreground">Come back tomorrow for a new puzzle!</p>}
            />
          </div>
        )}

        {!isLoading && solvedGroups.length > 0 && <div className="mt-4 space-y-2" aria-label="Revealed groups">
          {solvedGroups.map(group => <details key={group.theme} className={cn('rounded-xl border px-3', DIFFICULTY_COLORS[group.difficulty])}>
            <summary className="min-h-[44px] cursor-pointer py-3 text-sm font-bold">{group.theme}</summary>
            <p className="pb-3 text-sm">{group.players.join(', ')}</p>
          </details>)}
        </div>}

        <GameSeoContent
          pageHasOwnH1
          title="NHL Connections | DoUKnowBall"
          description="A daily puzzle where you group NHL players by what connects them: same franchise or same career milestone."
          howToPlay={[
            'Find four groups of 5 NHL players that share a connection',
            'Select 5 players and submit. If they form a group, it locks in',
            'Groups are color-coded: yellow (easiest) to purple (hardest)',
            'You have 4 lives. Wrong guesses cost a life',
            'New puzzle daily. Share your results!',
          ]}
          examples={[
            'Played for the Penguins: Crosby, Lemieux, Malkin...',
            '1,000+ career points: McDavid, Kucherov, MacKinnon...',
            'Played for the Red Wings: Lidström, Datsyuk, Fedorov...',
            'Played for the Ducks: Selänne, Getzlaf, Kariya...',
          ]}
        />

        <AdBanner slot="7540487748" format="horizontal" className="mt-8" />

        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="nhl-connections" gameContext={{ puzzleId: puzzle?.id }} />
        </div>
        <GameNav />

        <NhlConnectionsHowToPlay open={showRules} onOpenChange={setShowRules} />
      </GameShell>
    </>
  );
};

export default NhlConnections;
