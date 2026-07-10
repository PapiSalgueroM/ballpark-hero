import { useEffect, useMemo, useState } from 'react';
import { Footer } from '@/components/game/Footer';
import { GameNavbar } from '@/components/game/GameNavbar';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import ShareButtons from '@/components/game/ShareButtons';
import { Button } from '@/components/ui/button';
import { Loader2, ListOrdered, RotateCcw, CalendarDays, Infinity as InfinityIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import {
  buildRound, daySeed, fetchBlindRankPool, scoreRound,
  type ModeDef, type RankPlayer,
} from '@/lib/blindRank';

type GameMode = 'daily' | 'unlimited';
type Phase = 'intro' | 'playing' | 'reveal';

const BlindRank = () => {
  const [pool, setPool] = useState<RankPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [gameMode, setGameMode] = useState<GameMode>('daily');
  const [phase, setPhase] = useState<Phase>('intro');
  const [mode, setMode] = useState<ModeDef | null>(null);
  const [players, setPlayers] = useState<RankPlayer[]>([]);
  const [revealIndex, setRevealIndex] = useState(0);            // which player is being placed (0..4)
  const [placements, setPlacements] = useState<(number | null)[]>([null, null, null, null, null]); // slot -> player index
  const [revealedSlots, setRevealedSlots] = useState(0);        // reveal animation progress

  useEffect(() => {
    fetchBlindRankPool().then(p => { setPool(p); setLoading(false); });
  }, []);

  const start = (gm: GameMode) => {
    const round = buildRound(pool, gm === 'daily' ? daySeed() : undefined);
    if (!round) return;
    setGameMode(gm);
    setMode(round.mode);
    setPlayers(round.players);
    setRevealIndex(0);
    setPlacements([null, null, null, null, null]);
    setRevealedSlots(0);
    setPhase('playing');
  };

  const place = (slot: number) => {
    if (placements[slot] !== null || revealIndex >= 5) return;
    const next = [...placements];
    next[slot] = revealIndex;
    setPlacements(next);
    if (revealIndex + 1 >= 5) {
      setPhase('reveal');
      // staggered reveal animation
      [0, 1, 2, 3, 4].forEach(i => setTimeout(() => setRevealedSlots(n => Math.max(n, i + 1)), 600 + i * 700));
    } else {
      setRevealIndex(revealIndex + 1);
    }
  };

  const result = useMemo(
    () => (phase === 'reveal' && mode ? scoreRound(placements, players, mode) : null),
    [phase, placements, players, mode],
  );
  const revealDone = revealedSlots >= 5;
  useGameCompletion('blind-rank', phase === 'reveal' && revealDone && gameMode === 'daily', result?.total ?? 0, result?.exact ?? 0);

  const currentPlayer = revealIndex < 5 ? players[revealIndex] : null;

  return (
    <>
      <PageSeo
        title="Blind Rank - Rank Players Blind | DoUKnowBall"
        description="Five players revealed one at a time. Lock each into a rank slot before seeing who's next, then watch the true order get revealed. New daily board every day."
        path="/blind-rank"
      />
      <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, hsl(222 35% 8%) 0%, hsl(262 30% 7%) 60%, hsl(222 30% 6%) 100%)' }}>
        <GameNavbar />
        <main className="flex-1 flex flex-col items-center px-4 py-6 sm:py-10">
          <div className="w-full max-w-2xl mx-auto space-y-5 text-center">

            {phase === 'intro' && (
              <>
                <div className="flex items-center justify-center text-primary">
                  <ListOrdered className="w-10 h-10 sm:w-14 sm:h-14" />
                </div>
                <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground">
                  Blind <span className="text-primary">Rank</span>
                </h1>
                <p className="text-base sm:text-xl text-muted-foreground max-w-md mx-auto leading-relaxed">
                  5 players, revealed one at a time. Slot each into a rank <b>immediately</b> —
                  no take-backs, no seeing who's next. Then the truth comes out.
                </p>
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto" />
                ) : (
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button size="lg" className="text-lg px-8 py-6 font-bold" onClick={() => start('daily')}>
                      <CalendarDays className="w-5 h-5 mr-2" /> Daily Board
                    </Button>
                    <Button size="lg" variant="outline" className="text-lg px-8 py-6 font-bold" onClick={() => start('unlimited')}>
                      <InfinityIcon className="w-5 h-5 mr-2" /> Unlimited
                    </Button>
                  </div>
                )}
              </>
            )}

            {phase !== 'intro' && mode && (
              <>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-card/70 border border-border">
                  <span className="text-xs font-bold uppercase tracking-widest text-primary">{mode.title}</span>
                  <span className="text-xs text-muted-foreground">{mode.question}</span>
                </div>

                {/* Current player card */}
                {phase === 'playing' && currentPlayer && (
                  <div className="rounded-2xl border border-primary/40 bg-card/80 backdrop-blur-md p-5 max-w-sm mx-auto shadow-lg shadow-primary/10 animate-in fade-in zoom-in-95">
                    <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold mb-1">
                      Player {revealIndex + 1} of 5 — place them now
                    </p>
                    <p className="text-2xl font-extrabold text-foreground">{currentPlayer.name}</p>
                    <p className="text-sm text-muted-foreground">{currentPlayer.club} · {currentPlayer.nationality}</p>
                  </div>
                )}

                {/* Rank slots */}
                <div className="space-y-2 max-w-sm mx-auto">
                  {[0, 1, 2, 3, 4].map(slot => {
                    const playerIdx = placements[slot];
                    const placed = playerIdx !== null ? players[playerIdx] : null;
                    const showTruth = phase === 'reveal' && revealedSlots > slot && result;
                    const isCorrect = showTruth && result!.truth[slot] === playerIdx;
                    const truthPlayer = showTruth ? players[result!.truth[slot]] : null;
                    return (
                      <button
                        key={slot}
                        disabled={phase !== 'playing' || placed !== null}
                        onClick={() => place(slot)}
                        className={cn(
                          'w-full flex items-center gap-3 rounded-xl border px-4 py-3 transition-all text-left',
                          phase === 'playing' && placed === null && 'border-primary/50 bg-primary/5 hover:bg-primary/15 cursor-pointer animate-pulse',
                          placed !== null && phase === 'playing' && 'border-border bg-card/70',
                          showTruth && (isCorrect ? 'border-emerald-500/60 bg-emerald-500/10' : 'border-red-500/50 bg-red-500/10'),
                          phase === 'reveal' && !showTruth && 'border-border bg-card/50 opacity-70',
                        )}
                      >
                        <span className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0',
                          slot === 0 ? 'bg-amber-400/25 text-amber-300' : 'bg-secondary text-foreground',
                        )}>
                          {slot + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          {placed ? (
                            <>
                              <p className={cn('font-bold truncate', showTruth && !isCorrect ? 'text-red-300 line-through decoration-2' : 'text-foreground')}>
                                {placed.name}
                              </p>
                              {showTruth && !isCorrect && truthPlayer && (
                                <p className="text-xs text-emerald-300 font-semibold truncate">Truth: {truthPlayer.name} — {mode.unit(truthPlayer)}</p>
                              )}
                              {showTruth && isCorrect && (
                                <p className="text-xs text-emerald-300 font-semibold">{mode.unit(placed)} ✓</p>
                              )}
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground font-semibold">{phase === 'playing' ? 'Tap to place here' : '—'}</p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Reveal footer */}
                {phase === 'reveal' && revealDone && result && (
                  <div className="rounded-2xl border border-primary/40 bg-card/80 p-5 max-w-sm mx-auto space-y-3 animate-in fade-in slide-in-from-bottom-2">
                    <p className="text-3xl font-black text-primary">{result.total} pts</p>
                    <p className="text-sm text-muted-foreground font-semibold">
                      {result.exact}/5 exact · {result.close} one-off{result.perfect ? ' · PERFECT BOARD +50 🔥' : ''}
                    </p>
                    <ShareButtons
                      gameName="Blind Rank"
                      gamePath="/blind-rank"
                      score={`${result.exact}/5 exact (${result.total} pts)`}
                      customText={`Blind Rank (${mode.title}): ${result.exact}/5 exact for ${result.total} pts${result.perfect ? ' — PERFECT BOARD 🔥' : ''}. Rank them blind at douknowball.com/blind-rank 🧠`}
                    />
                    <Button size="lg" variant="outline" className="w-full font-bold" onClick={() => (gameMode === 'daily' ? start('unlimited') : start('unlimited'))}>
                      <RotateCcw className="w-4 h-4 mr-2" /> {gameMode === 'daily' ? 'Keep going (unlimited)' : 'Next board'}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </main>

        <GameSeoContent
          title="Blind Rank: Rank Soccer Players Blind | DoUKnowBall"
          description="The blind ranking challenge: five players appear one at a time and every placement is final. Rank by market value, career goals, assists or age — a new daily board every day plus unlimited mode."
          howToPlay={[
            'A stat category is drawn: market value, career goals, career assists, or age.',
            'Players appear ONE at a time. Tap a rank slot to lock each one in — you cannot move them later, and you don\'t know who\'s still coming.',
            'After all five placements the true order is revealed: 20 points per exact slot, 10 for one-off, +50 for a perfect board.',
          ]}
          examples={[
            'Is Bellingham worth more than Haaland right now? Slot him before Mbappé appears...',
            'Career goals: Lewandowski appears first — rank 1 or save the top spot?',
            'Age mode: rank 1 is the YOUNGEST — Yamal is a safe top pick',
            'Perfect board = 150 points and eternal bragging rights',
          ]}
        />
        <Footer />
      </div>
    </>
  );
};

export default BlindRank;
