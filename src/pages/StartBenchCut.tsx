import { useEffect, useState } from 'react';
import { Footer } from '@/components/game/Footer';
import { GameNavbar } from '@/components/game/GameNavbar';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import ShareButtons from '@/components/game/ShareButtons';
import { Button } from '@/components/ui/button';
import { Loader2, Armchair, RotateCcw, CalendarDays, Infinity as InfinityIcon, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { fetchBlindRankPool, type RankPlayer } from '@/lib/blindRank';
import {
  buildSbcRun, sbcDaySeed, scoreSbcRound, SLOTS,
  type SbcResult, type SbcRound, type SbcSlot,
} from '@/lib/startBenchCut';

type GameMode = 'daily' | 'unlimited';
type Phase = 'intro' | 'assign' | 'reveal' | 'done';

const SLOT_LABEL: Record<SbcSlot, string> = { start: 'START', bench: 'BENCH', cut: 'CUT' };
const SLOT_ACTIVE: Record<SbcSlot, string> = {
  start: 'border-emerald-400/70 bg-emerald-500/25 text-emerald-200',
  bench: 'border-amber-400/70 bg-amber-500/25 text-amber-200',
  cut: 'border-red-400/70 bg-red-500/25 text-red-200',
};

const StartBenchCut = () => {
  const [pool, setPool] = useState<RankPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [gameMode, setGameMode] = useState<GameMode>('daily');
  const [phase, setPhase] = useState<Phase>('intro');
  const [rounds, setRounds] = useState<SbcRound[]>([]);
  const [roundIdx, setRoundIdx] = useState(0);
  const [assignments, setAssignments] = useState<(SbcSlot | null)[]>([null, null, null]);
  const [revealStep, setRevealStep] = useState(0);   // staggered truth reveal progress (0..3)
  const [totalScore, setTotalScore] = useState(0);
  const [perfectRounds, setPerfectRounds] = useState(0);
  const [streak, setStreak] = useState(0);           // consecutive perfect trios
  const [lastResult, setLastResult] = useState<SbcResult | null>(null);

  useEffect(() => {
    fetchBlindRankPool().then(p => { setPool(p); setLoading(false); });
  }, []);

  const start = (gm: GameMode) => {
    const run = buildSbcRun(pool, gm === 'daily' ? sbcDaySeed() : undefined);
    if (!run) return;
    setGameMode(gm);
    setRounds(run);
    setRoundIdx(0);
    setAssignments([null, null, null]);
    setRevealStep(0);
    setTotalScore(0);
    setPerfectRounds(0);
    setStreak(0);
    setLastResult(null);
    setPhase('assign');
  };

  const round = phase === 'assign' || phase === 'reveal' ? rounds[roundIdx] : undefined;
  const allAssigned = assignments.every(s => s !== null);

  // Tap a role under a player: assign it, stealing from whoever held it.
  // Tapping the player's active role again clears it.
  const assign = (playerIdx: number, slot: SbcSlot) => {
    if (phase !== 'assign') return;
    setAssignments(prev => {
      const next = [...prev];
      if (next[playerIdx] === slot) { next[playerIdx] = null; return next; }
      next.forEach((s, i) => { if (s === slot) next[i] = null; });
      next[playerIdx] = slot;
      return next;
    });
  };

  const lockIn = () => {
    if (!round || !allAssigned) return;
    const res = scoreSbcRound(assignments, round.players, round.mode, streak);
    setLastResult(res);
    setTotalScore(t => t + res.total);
    if (res.perfect) { setStreak(s => s + 1); setPerfectRounds(n => n + 1); } else { setStreak(0); }
    setPhase('reveal');
    [0, 1, 2].forEach(i => setTimeout(() => setRevealStep(n => Math.max(n, i + 1)), 500 + i * 650));
  };

  const nextRound = () => {
    if (roundIdx + 1 >= rounds.length) { setPhase('done'); return; }
    setRoundIdx(roundIdx + 1);
    setAssignments([null, null, null]);
    setRevealStep(0);
    setLastResult(null);
    setPhase('assign');
  };

  const revealDone = revealStep >= 3;
  useGameCompletion('start-bench-cut', phase === 'done' && gameMode === 'daily', totalScore, perfectRounds);

  return (
    <>
      <PageSeo
        title="Start Bench Cut - Three Players, One Brutal Choice | DoUKnowBall"
        description="Three soccer players, one hidden stat: start one, bench one, cut one. Five trios per run, streak bonuses for perfect calls, and a new daily board every day."
        path="/start-bench-cut"
      />
      <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, hsl(222 35% 8%) 0%, hsl(152 30% 7%) 60%, hsl(222 30% 6%) 100%)' }}>
        <GameNavbar />
        <main className="flex-1 flex flex-col items-center px-4 py-6 sm:py-10">
          <div className="w-full max-w-2xl mx-auto space-y-5 text-center">

            {phase === 'intro' && (
              <>
                <div className="flex items-center justify-center text-primary">
                  <Armchair className="w-10 h-10 sm:w-14 sm:h-14" />
                </div>
                <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground">
                  Start Bench <span className="text-primary">Cut</span>
                </h1>
                <p className="text-base sm:text-xl text-muted-foreground max-w-md mx-auto leading-relaxed">
                  Three players, one stat. One <b>starts</b>, one rides the <b>bench</b>,
                  one gets <b>cut</b> — five brutal trios, no easy outs.
                </p>
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto" />
                ) : (
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button size="lg" className="text-lg px-8 py-6 font-bold" onClick={() => start('daily')}>
                      <CalendarDays className="w-5 h-5 mr-2" /> Daily Trios
                    </Button>
                    <Button size="lg" variant="outline" className="text-lg px-8 py-6 font-bold" onClick={() => start('unlimited')}>
                      <InfinityIcon className="w-5 h-5 mr-2" /> Unlimited
                    </Button>
                  </div>
                )}
              </>
            )}

            {round && (
              <>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-card/70 border border-border">
                  <span className="text-xs font-bold uppercase tracking-widest text-primary">{round.mode.title}</span>
                  <span className="text-xs text-muted-foreground">{round.mode.question}</span>
                </div>

                <div className="flex items-center justify-center gap-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  <span>Trio {roundIdx + 1}/{rounds.length}</span>
                  <span className="text-foreground">{totalScore} pts</span>
                  {streak >= 1 && <span className="text-amber-300 normal-case">🔥 x{streak}</span>}
                </div>

                {/* Player cards with tap-to-assign role buttons */}
                <div className="grid gap-3 sm:grid-cols-3">
                  {round.players.map((p, i) => {
                    const assigned = assignments[i];
                    const showTruth = phase === 'reveal' && revealStep > i && lastResult !== null;
                    const truthSlot = showTruth ? lastResult!.truth[i] : null;
                    const isCorrect = showTruth && truthSlot === assigned;
                    return (
                      <div
                        key={p.name}
                        className={cn(
                          'rounded-2xl border bg-card/80 backdrop-blur-md p-4 transition-all animate-in fade-in zoom-in-95',
                          !showTruth && 'border-border',
                          showTruth && (isCorrect ? 'border-emerald-500/60 bg-emerald-500/10' : 'border-red-500/50 bg-red-500/10'),
                        )}
                      >
                        <p className="text-lg font-extrabold text-foreground leading-tight truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground mb-3 truncate">{p.club} · {p.nationality}</p>
                        <div className="grid grid-cols-3 gap-1.5">
                          {SLOTS.map(slot => (
                            <button
                              key={slot}
                              disabled={phase !== 'assign'}
                              onClick={() => assign(i, slot)}
                              className={cn(
                                'rounded-lg border px-1 py-2 text-[11px] font-black tracking-wide transition-all',
                                assigned === slot ? SLOT_ACTIVE[slot] : 'border-border bg-card/60 text-muted-foreground',
                                phase === 'assign' && assigned !== slot && 'hover:border-primary/50 hover:text-foreground',
                              )}
                            >
                              {SLOT_LABEL[slot]}
                            </button>
                          ))}
                        </div>
                        {showTruth && truthSlot && (
                          <p className={cn('mt-2 text-xs font-semibold', isCorrect ? 'text-emerald-300' : 'text-red-300')}>
                            {isCorrect
                              ? `${SLOT_LABEL[truthSlot]} ✓ · ${round.mode.unit(p)}`
                              : `Truth: ${SLOT_LABEL[truthSlot]} · ${round.mode.unit(p)}`}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {phase === 'assign' && (
                  <Button size="lg" className="font-bold px-10" disabled={!allAssigned} onClick={lockIn}>
                    {allAssigned ? 'Lock it in' : 'Fill all three roles'}
                  </Button>
                )}

                {phase === 'reveal' && revealDone && lastResult && (
                  <div className="rounded-2xl border border-primary/40 bg-card/80 p-5 max-w-sm mx-auto space-y-3 animate-in fade-in slide-in-from-bottom-2">
                    <p className="text-3xl font-black text-primary">+{lastResult.total} pts</p>
                    <p className="text-sm text-muted-foreground font-semibold">
                      {lastResult.perfect
                        ? `PERFECT TRIO 🔥${streak >= 2 ? ` · ${streak} in a row (+${(streak - 1) * 10} streak bonus)` : ''}`
                        : lastResult.exact === 1 ? '1/3 in the right role' : '0/3 — the locker room is furious'}
                    </p>
                    <Button size="lg" className="w-full font-bold" onClick={nextRound}>
                      {roundIdx + 1 >= rounds.length ? 'Final whistle' : 'Next trio'} <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                )}
              </>
            )}

            {phase === 'done' && (
              <div className="rounded-2xl border border-primary/40 bg-card/80 p-6 max-w-sm mx-auto space-y-3 animate-in fade-in zoom-in-95">
                <Armchair className="w-10 h-10 text-primary mx-auto" />
                <p className="text-4xl font-black text-primary">{totalScore} pts</p>
                <p className="text-sm text-muted-foreground font-semibold">
                  {perfectRounds}/5 perfect trios{gameMode === 'daily' ? " on today's board" : ''}
                </p>
                <ShareButtons
                  gameName="Start Bench Cut"
                  gamePath="/start-bench-cut"
                  score={`${perfectRounds}/5 perfect trios (${totalScore} pts)`}
                  customText={`Start Bench Cut: ${perfectRounds}/5 perfect trios for ${totalScore} pts. Started the right man, cut the wrong one? Prove it at douknowball.com/start-bench-cut 🪑`}
                />
                <Button size="lg" variant="outline" className="w-full font-bold" onClick={() => start('unlimited')}>
                  <RotateCcw className="w-4 h-4 mr-2" /> {gameMode === 'daily' ? 'Keep going (unlimited)' : 'Run it back'}
                </Button>
              </div>
            )}
          </div>
        </main>

        <GameSeoContent
          title="Start Bench Cut: The Brutal Trio Challenge | DoUKnowBall"
          description="KOT4Q's classic format, soccer edition: every round deals three players and a hidden-stat context — 2026 market value, career goals, career assists or age. Start the best, bench the middle, cut the rest across five rounds, with a daily board and unlimited play."
          howToPlay={[
            'Each trio comes with a stat context: 2026 market value, career goals, career assists, or age — and in age rounds the YOUNGEST deserves the start.',
            'Tap START, BENCH or CUT under each player: start the best of the three by that stat, bench the middle, cut the worst. Lock it in once all roles are filled.',
            'Perfect trio = 30 points, with back-to-back perfects stacking a +10 streak bonus per round. Exactly one right role = 10 points. Five trios per run — a flawless run is 250.',
          ]}
          examples={[
            'Value trio: Mbappé, Bellingham and Saka walk in — someone elite is getting cut',
            'Career goals: the veteran poacher probably starts over the wonderkid',
            'Age rounds flip the logic: START the youngest, CUT the aging legend',
            'Miss one role and you have missed two — trios are unforgiving',
          ]}
        />
        <Footer />
      </div>
    </>
  );
};

export default StartBenchCut;
