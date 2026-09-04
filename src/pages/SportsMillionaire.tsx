import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Loader2, Lock, Scissors, Users, Repeat, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GameShell } from '@/components/game/GameShell';
import { ResultScreen } from '@/components/game/ResultScreen';
import { RulesGate } from '@/components/game/RulesGate';
import { GameNav } from '@/components/game/GameNav';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { getTodayET } from '@/lib/dateUtils';
import { markRestoredFinish } from '@/lib/restoredFinish';
import { TriviaPool, TriviaQuestion } from '@/lib/triviaQuestionBank';
import {
  MONEY_LADDER,
  SAFE_HAVEN_INDICES,
  LADDER_SIZE,
  fmtMoney,
  freshLifelines,
  applyFiftyFifty,
  generateCrowdPoll,
  safeHavenAmount,
  loadMillionairePool,
  buildFreshLadder,
  swapQuestion,
  buildMillionaireEmojiGrid,
  loadDailyRecord,
  saveDailyRecord,
  type LifelineState,
  type MillionaireDailyRecord,
} from '@/lib/sportsMillionaire';

type PlayMode = 'daily' | 'unlimited';
// boot: fetching pool. error: pool failed. playing: choosing an option.
// locked: option locked in, suspense beat before reveal. revealed: showing
// correct/wrong flash. done: run ended (win, wrong, or walked away).
type Phase = 'boot' | 'error' | 'playing' | 'locked' | 'revealed' | 'done';

const REVEAL_SUSPENSE_MS = 1600;
const REVEAL_FLASH_MS = 1400;

/**
 * Sports Millionaire (MASTER_PLAN task #199): a 15-question money ladder
 * where each right answer doubles the stakes, built on the shared
 * triviaQuestionBank generator so the question pool scales with the site's
 * live Supabase data instead of a fixed hand-authored set. See
 * src/lib/sportsMillionaire.ts for the ladder/lifeline/scoring logic and
 * src/lib/triviaQuestionBank.ts for how each question type is generated
 * and verified against source tables.
 *
 * Every hook lives above every conditional return, per the site's React
 * error #310 rule (TransferPathBoard's known bug class). The loading,
 * error, and end-of-game UI are all decided in the JSX below, never via an
 * early return above a hook.
 */
const SportsMillionaire = () => {
  const [playMode, setPlayMode] = useState<PlayMode>('daily');
  const [phase, setPhase] = useState<Phase>('boot');
  const [pool, setPool] = useState<TriviaPool | null>(null);
  const [ladder, setLadder] = useState<TriviaQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lastCorrectIndex, setLastCorrectIndex] = useState(-1); // -1 = no safe money banked yet
  const [lifelines, setLifelines] = useState<LifelineState>(() => freshLifelines());
  const [visibleOptions, setVisibleOptions] = useState<Set<number> | null>(null);
  const [crowdPoll, setCrowdPoll] = useState<number[] | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null);
  const [finalAmount, setFinalAmount] = useState<number | null>(null);
  const [walkedAway, setWalkedAway] = useState(false);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /* Round 428: the day is captured once per mount, the shared daily hook's
     rule, so a run that crosses midnight is filed under the day whose
     ladder it played; loadMillionairePool stamps the ladder at the same
     moment. dailySaved latches the one record a daily gets. */
  const dailySaved = useRef(false);
  const todayStr = useRef(getTodayET()).current;

  // Every hook above this line, none conditional. Loading/error/done states
  // are rendered conditionally in JSX further down, not via early return.

  /* Round 428: a finished daily comes back as it was on both ways in, the
     boot effect and the Daily toggle. Both run after mount, so to
     useGameCompletion the restore looks exactly like the player finishing,
     and it says what it is right before the phase goes to done. */
  const restoreDaily = useCallback((done: MillionaireDailyRecord) => {
    setPlayMode('daily');
    setCurrentIndex(done.currentIndex);
    setLastCorrectIndex(done.lastCorrectIndex);
    setFinalAmount(done.finalAmount);
    setWalkedAway(done.walkedAway);
    setVisibleOptions(null);
    setCrowdPoll(null);
    setSelectedIndex(null);
    setWasCorrect(null);
    dailySaved.current = true;
    markRestoredFinish('sports-millionaire');
    setPhase('done');
  }, []);

  const startRun = useCallback((mode: PlayMode, sourcePool: TriviaPool | null) => {
    setPlayMode(mode);
    if (!sourcePool) return;
    const freshLadder = buildFreshLadder(sourcePool, mode);
    if (freshLadder.length < LADDER_SIZE) {
      setPhase('error');
      return;
    }
    setLadder(freshLadder);
    if (mode === 'daily') {
      const done = loadDailyRecord(todayStr);
      if (done) {
        restoreDaily(done);
        return;
      }
    }
    dailySaved.current = false;
    setCurrentIndex(0);
    setLastCorrectIndex(-1);
    setLifelines(freshLifelines());
    setVisibleOptions(null);
    setCrowdPoll(null);
    setSelectedIndex(null);
    setWasCorrect(null);
    setFinalAmount(null);
    setWalkedAway(false);
    setPhase('playing');
  }, [restoreDaily, todayStr]);

  // Boot: load the shared trivia pool once, then start daily mode. The two
  // deps are a stable callback and a per mount constant, so this still runs
  // once.
  useEffect(() => {
    let cancelled = false;
    loadMillionairePool('daily')
      .then(({ pool: loadedPool, ladder: dailyLadder }) => {
        if (cancelled) return;
        if (!loadedPool || dailyLadder.length < LADDER_SIZE) {
          setPhase('error');
          return;
        }
        setPool(loadedPool);
        setLadder(dailyLadder);
        const done = loadDailyRecord(todayStr);
        if (done) {
          restoreDaily(done);
          return;
        }
        setCurrentIndex(0);
        setLastCorrectIndex(-1);
        setLifelines(freshLifelines());
        setPhase('playing');
      })
      .catch(() => {
        if (!cancelled) setPhase('error');
      });
    return () => {
      cancelled = true;
      if (revealTimer.current) clearTimeout(revealTimer.current);
    };
  }, [restoreDaily, todayStr]);

  const switchPlayMode = (mode: PlayMode) => {
    if (mode === playMode || !pool) return;
    startRun(mode, pool);
  };

  const question = ladder[currentIndex];
  const isSafeHaven = SAFE_HAVEN_INDICES.includes(currentIndex);
  const guaranteedAmount = safeHavenAmount(lastCorrectIndex);

  const selectOption = (optionIndex: number) => {
    if (phase !== 'playing' || !question) return;
    if (visibleOptions && !visibleOptions.has(optionIndex)) return;
    setSelectedIndex(optionIndex);
    setPhase('locked');
    revealTimer.current = setTimeout(() => {
      const correct = optionIndex === question.correctIndex;
      setWasCorrect(correct);
      setPhase('revealed');
      revealTimer.current = setTimeout(() => {
        if (correct) {
          const newLastCorrect = currentIndex;
          setLastCorrectIndex(newLastCorrect);
          if (currentIndex + 1 >= LADDER_SIZE) {
            setFinalAmount(MONEY_LADDER[MONEY_LADDER.length - 1]);
            setPhase('done');
          } else {
            setCurrentIndex((i) => i + 1);
            setVisibleOptions(null);
            setCrowdPoll(null);
            setSelectedIndex(null);
            setWasCorrect(null);
            setPhase('playing');
          }
        } else {
          setFinalAmount(safeHavenAmount(lastCorrectIndex));
          setWalkedAway(false);
          setPhase('done');
        }
      }, REVEAL_FLASH_MS);
    }, REVEAL_SUSPENSE_MS);
  };

  const walkAway = () => {
    if (phase !== 'playing') return;
    setFinalAmount(currentWalkAwayDisplay());
    setWalkedAway(true);
    setPhase('done');
  };

  function currentWalkAwayDisplay(): number {
    return lastCorrectIndex >= 0 ? MONEY_LADDER[lastCorrectIndex] : 0;
  }

  const useFiftyFifty = () => {
    if (phase !== 'playing' || lifelines.used['fifty-fifty'] || !question) return;
    setVisibleOptions(applyFiftyFifty(question));
    setLifelines((l) => ({ used: { ...l.used, 'fifty-fifty': true } }));
  };

  const useAskCrowd = () => {
    if (phase !== 'playing' || lifelines.used['ask-crowd'] || !question) return;
    setCrowdPoll(generateCrowdPoll(question));
    setLifelines((l) => ({ used: { ...l.used, 'ask-crowd': true } }));
  };

  const useSwapQuestion = () => {
    if (phase !== 'playing' || lifelines.used['swap-question'] || !question || !pool) return;
    const swapped = swapQuestion(pool, question);
    setLadder((prev) => {
      const next = [...prev];
      next[currentIndex] = swapped;
      return next;
    });
    setVisibleOptions(null);
    setCrowdPoll(null);
    setLifelines((l) => ({ used: { ...l.used, 'swap-question': true } }));
  };

  const isComplete = phase === 'done';
  const scoreForCompletion = finalAmount ?? 0;

  // Score = dollar amount reached (internal points), correctAnswers = questions cleared correctly.
  useGameCompletion('sports-millionaire', isComplete && playMode === 'daily', scoreForCompletion, Math.max(lastCorrectIndex + 1, 0));

  /* Round 428: the one record a daily gets, written once the run ends on
     any of its three paths (the million, a wrong answer, a walk away).
     finalAmount is tested against null and not for truth: a walk away
     before Q1 or a miss before the first safe haven ends on $0, and that
     day has to lock too. */
  useEffect(() => {
    if (playMode !== 'daily' || phase !== 'done' || finalAmount === null || dailySaved.current) return;
    dailySaved.current = true;
    saveDailyRecord(todayStr, { currentIndex, lastCorrectIndex, finalAmount, walkedAway });
  }, [playMode, phase, finalAmount, currentIndex, lastCorrectIndex, walkedAway, todayStr]);

  const emojiGrid = useMemo(() => {
    if (!isComplete) return '';
    return buildMillionaireEmojiGrid({
      mode: playMode,
      ladder,
      currentIndex,
      lifelines,
      visibleOptions,
      crowdPoll,
      lockedInIndex: selectedIndex,
      status: walkedAway ? 'walked-away' : (finalAmount === MONEY_LADDER[MONEY_LADDER.length - 1] ? 'completed-all' : 'wrong'),
      lastCorrectIndex,
      finalAmount,
    });
  }, [isComplete, playMode, ladder, currentIndex, lifelines, visibleOptions, crowdPoll, selectedIndex, walkedAway, finalAmount, lastCorrectIndex]);

  const wonTheGame = finalAmount === MONEY_LADDER[MONEY_LADDER.length - 1] && !walkedAway;

  return (
    <>
      <PageSeo
        title="Sports Millionaire: The Money Ladder Trivia Game | DoUKnowBall"
        description="Climb a 15-question money ladder built from real sports data. Use 50:50, Ask the Crowd, and Swap Question lifelines. Free, no sign-up, new questions every play."
        path="/sports-millionaire"
      />
      <GameShell help="none"
        width="wide"
        title="SPORTS MILLIONAIRE"
        subtitle="Climb the ladder. Lock in your answer. Walk away anytime with what you've won."
        headerExtra={
          <>
            <RulesGate title="How to Play Sports Millionaire">
              <section>
                <h3 className="font-bold text-foreground mb-2">💰 The ladder</h3>
                <p className="text-muted-foreground">
                  15 multiple-choice sports questions, one at a time. Each correct answer climbs the money
                  ladder from $100 up to $1,000,000. Questions get harder as you climb.
                </p>
              </section>
              <section>
                <h3 className="font-bold text-foreground mb-2">🛟 Safe havens</h3>
                <p className="text-muted-foreground">
                  Question 5 ($1,000) and question 10 ($32,000) are safe havens. A wrong answer drops you
                  back to the last safe haven you passed, or to $0 if you haven't reached one.
                </p>
              </section>
              <section>
                <h3 className="font-bold text-foreground mb-2">🧰 Lifelines</h3>
                <p className="text-muted-foreground">
                  50:50 removes two wrong answers. Ask the Crowd shows a poll of how others answered.
                  Swap Question trades your current question for a new one at the same difficulty. Each
                  lifeline can be used once per game.
                </p>
              </section>
              <section>
                <h3 className="font-bold text-foreground mb-2">🚪 Walk away</h3>
                <p className="text-muted-foreground">
                  Before locking in an answer, you can walk away and keep whatever you've already won.
                </p>
              </section>
            </RulesGate>

            <div className="flex items-center justify-center gap-1 mt-6 bg-secondary rounded-full p-1 w-fit mx-auto">
              {(['daily', 'unlimited'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => switchPlayMode(m)}
                  disabled={!pool}
                  className={cn(
                    'px-5 py-2 rounded-full text-sm font-semibold transition-all disabled:opacity-50',
                    playMode === m ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {m === 'daily' ? '📅 Daily' : '∞ Unlimited'}
                </button>
              ))}
            </div>
            {playMode === 'daily' && (
              <p className="text-xs text-muted-foreground mt-3">Today's ladder, {getTodayET()}. Same 15 questions for everyone.</p>
            )}
          </>
        }
      >
        {phase === 'boot' && (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        )}

        {phase === 'error' && (
          <div className="text-center py-12">
            <p className="text-destructive font-semibold mb-3">Couldn't load Sports Millionaire right now.</p>
            <button
              onClick={() => (pool ? startRun(playMode, pool) : window.location.reload())}
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-semibold"
            >
              Try again
            </button>
          </div>
        )}

        {(phase === 'playing' || phase === 'locked' || phase === 'revealed') && question && (
          <div className="grid md:grid-cols-[1fr_220px] gap-6">
            {/* Main question column */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Question {currentIndex + 1} of {LADDER_SIZE}
                  {isSafeHaven && <span className="ml-2 text-gold">🛟 Safe haven</span>}
                </span>
                <span className="text-sm font-bold font-display text-primary">
                  {fmtMoney(MONEY_LADDER[currentIndex])}
                </span>
              </div>

              <div className="bg-surface-1 border border-border rounded-2xl p-5 md:p-6 mb-4">
                <p className="text-lg md:text-xl font-semibold text-foreground text-center leading-snug">
                  {question.question}
                </p>
              </div>

              {crowdPoll && phase === 'playing' && (
                <div className="mb-4 bg-surface-2 border border-border/60 rounded-xl p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> Ask the Crowd
                  </p>
                  <div className="space-y-1.5">
                    {question.options.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="w-6 shrink-0 text-muted-foreground">{String.fromCharCode(65 + i)}</span>
                        <div className="flex-1 h-4 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary/70 rounded-full transition-all duration-500"
                            style={{ width: `${crowdPoll[i]}%` }}
                          />
                        </div>
                        <span className="w-9 shrink-0 text-right font-semibold text-foreground">{crowdPoll[i]}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-3">
                {question.options.map((opt, i) => {
                  const hidden = visibleOptions && !visibleOptions.has(i);
                  const isLockedIn = selectedIndex === i && (phase === 'locked' || phase === 'revealed');
                  const showCorrect = phase === 'revealed' && i === question.correctIndex;
                  const showWrong = phase === 'revealed' && isLockedIn && !wasCorrect;
                  return (
                    <button
                      key={i}
                      onClick={() => selectOption(i)}
                      disabled={phase !== 'playing' || !!hidden}
                      className={cn(
                        'text-left px-4 py-3.5 rounded-xl border font-medium transition-all flex items-center gap-3',
                        hidden && 'opacity-0 pointer-events-none h-0 !p-0 !border-0 overflow-hidden',
                        !hidden && phase === 'playing' && 'bg-card border-border hover:border-primary hover:bg-primary/5',
                        isLockedIn && phase === 'locked' && 'border-primary bg-primary/10 animate-pulse',
                        showCorrect && 'border-correct bg-correct/15 text-correct animate-pop-correct',
                        showWrong && 'border-destructive bg-destructive/15 text-destructive animate-shake-wrong',
                      )}
                    >
                      <span className={cn(
                        'w-7 h-7 shrink-0 rounded-full border flex items-center justify-center text-xs font-bold',
                        showCorrect ? 'border-correct text-correct' : showWrong ? 'border-destructive text-destructive' : 'border-border text-muted-foreground',
                      )}>
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="flex-1">{opt}</span>
                      {isLockedIn && phase === 'locked' && <Lock className="w-4 h-4 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {phase === 'locked' && (
                <p className="text-center text-sm font-semibold text-primary mt-4 animate-pulse">
                  Locking in your answer&hellip;
                </p>
              )}
              {phase === 'revealed' && (
                <p className={cn('text-center text-lg font-bold mt-4', wasCorrect ? 'text-correct' : 'text-destructive')}>
                  {wasCorrect ? 'Correct! 🎉' : 'Wrong answer 💥'}
                </p>
              )}

              {phase === 'playing' && (
                <div className="flex flex-col items-center gap-2 mt-5">
                  <button
                    onClick={walkAway}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-secondary text-foreground font-semibold text-sm hover:bg-secondary/70 transition-colors"
                  >
                    <Flag className="w-4 h-4" /> Walk away with {fmtMoney(currentWalkAwayDisplay())}
                  </button>
                  {guaranteedAmount > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Guaranteed minimum if you miss: {fmtMoney(guaranteedAmount)}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Sidebar: lifelines + ladder */}
            <div className="space-y-4">
              <div className="bg-surface-1 border border-border rounded-2xl p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Lifelines</p>
                <div className="flex md:flex-col gap-2">
                  <button
                    onClick={useFiftyFifty}
                    disabled={phase !== 'playing' || lifelines.used['fifty-fifty']}
                    className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-secondary text-foreground text-sm font-semibold disabled:opacity-35 hover:bg-secondary/70 transition-colors"
                  >
                    <Scissors className="w-4 h-4" /> 50:50
                  </button>
                  <button
                    onClick={useAskCrowd}
                    disabled={phase !== 'playing' || lifelines.used['ask-crowd']}
                    className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-secondary text-foreground text-sm font-semibold disabled:opacity-35 hover:bg-secondary/70 transition-colors"
                  >
                    <Users className="w-4 h-4" /> Crowd
                  </button>
                  <button
                    onClick={useSwapQuestion}
                    disabled={phase !== 'playing' || lifelines.used['swap-question']}
                    className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-secondary text-foreground text-sm font-semibold disabled:opacity-35 hover:bg-secondary/70 transition-colors"
                  >
                    <Repeat className="w-4 h-4" /> Swap
                  </button>
                </div>
              </div>

              <div className="bg-surface-1 border border-border rounded-2xl p-4 hidden md:block">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Money Ladder</p>
                <div className="space-y-1">
                  {[...MONEY_LADDER].map((amt, i) => (
                    <div
                      key={i}
                      className={cn(
                        'flex items-center justify-between px-2 py-1 rounded-lg text-xs font-semibold',
                        i === currentIndex ? 'bg-primary text-primary-foreground' :
                        i <= lastCorrectIndex ? 'text-correct' :
                        SAFE_HAVEN_INDICES.includes(i) ? 'text-gold' : 'text-muted-foreground',
                      )}
                    >
                      <span>{i + 1}</span>
                      <span>{fmtMoney(amt)}</span>
                    </div>
                  )).reverse()}
                </div>
              </div>
            </div>
          </div>
        )}

        {phase === 'done' && (
          <div className="mt-4 flex justify-center">
            <ResultScreen
              won={walkedAway ? undefined : wonTheGame}
              outcomeEmoji={wonTheGame ? '🏆' : walkedAway ? '🚪' : (finalAmount ?? 0) >= 32_000 ? '🎉' : (finalAmount ?? 0) > 0 ? '😬' : '💥'}
              headline={
                wonTheGame
                  ? 'You won $1,000,000!'
                  : walkedAway
                    ? `Walked away with ${fmtMoney(finalAmount ?? 0)}`
                    : `Game over: ${fmtMoney(finalAmount ?? 0)}`
              }
              statLine={
                walkedAway
                  ? `You banked your winnings after ${currentIndex} question${currentIndex === 1 ? '' : 's'}.`
                  : wonTheGame
                    ? 'Every question on the ladder, cleared.'
                    : `You made it to question ${currentIndex + 1} of ${LADDER_SIZE}.`
              }
              statRow={[
                { label: 'Final', value: fmtMoney(finalAmount ?? 0) },
                { label: 'Cleared', value: `${Math.max(lastCorrectIndex + 1, 0)}/${LADDER_SIZE}` },
                { label: 'Mode', value: playMode === 'daily' ? 'Daily' : 'Unlimited' },
              ]}
              emojiGrid={emojiGrid}
              share={{
                score: fmtMoney(finalAmount ?? 0),
                gameName: 'Sports Millionaire',
                gamePath: '/sports-millionaire',
              }}
              onPlayAgain={() => pool && startRun('unlimited', pool)}
              playAgainLabel={playMode === 'daily' ? 'Play Unlimited' : 'New Ladder'}
            />
          </div>
        )}

        <AdBanner slot="7540487748" format="horizontal" className="mt-8" />

        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="sports-millionaire" />
        </div>

        <GameSeoContent
          pageHasOwnH1
          title="Sports Millionaire: The Money Ladder Trivia Game"
          description="Climb a money ladder where every right answer raises the stakes. Fifteen questions built from real market values, nationalities, positions, and Ballon d'Or history. Use your lifelines wisely."
          howToPlay={[
            'Answer 15 multiple-choice sports questions in order, easiest to hardest.',
            'Each correct answer climbs the money ladder toward $1,000,000.',
            'Questions 5 and 10 are safe havens: a wrong answer after that drops you only to the last safe haven.',
            'Use 50:50, Ask the Crowd, and Swap Question once each to help on a tough question.',
            'Walk away anytime before locking in an answer to keep your current winnings.',
          ]}
          examples={[
            'A wrong guess on question 3 (before any safe haven) drops you to $0.',
            'Clearing question 10 locks in $32,000 no matter what happens after.',
          ]}
        />
        <GameNav />
      </GameShell>
    </>
  );
};

export default SportsMillionaire;
