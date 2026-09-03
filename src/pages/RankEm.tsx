import { useMemo, useState, useCallback, useEffect } from 'react';
import { GameNav } from '@/components/game/GameNav';
import { GameShell } from '@/components/game/GameShell';
import { ResultScreen } from '@/components/game/ResultScreen';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { useDailyPuzzle } from '@/hooks/useDailyPuzzle';
import { getTodayET, dateSeed } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import { Trophy, ArrowDown, RotateCcw } from 'lucide-react';
import {
  RankRound,
  RANK_POINTS_PER_SLOT,
  getDailyRankRound,
  getRandomRankRound,
  scrambledNames,
  scoreRankGuess,
} from '@/lib/orderTheList';

/**
 * Rank 'Em (backlog: Order the List / Factle). Put five players in order by a
 * career stat, most to fewest. One submission; score = exact-position matches.
 * Deterministic ranking from verified DB totals, no answer-check backend.
 * Daily persistence via useDailyPuzzle's action log (sentinel pattern, same as
 * Missing Five/Nine/Eleven).
 */

type Mode = 'daily' | 'unlimited';
type RankAction = { order: string[] };
const SENTINEL = [{ id: 'rank-em-daily' }];

const RankEm = () => {
  const [mode, setMode] = useState<Mode>('daily');

  const dailyRound = useMemo<RankRound>(() => getDailyRankRound(), []);
  const [unlimitedRound, setUnlimitedRound] = useState<RankRound | null>(null);
  const [unlimitedSeed, setUnlimitedSeed] = useState<number | null>(null);

  const {
    guesses: dailyActions,
    addGuess: addDailyAction,
    gameStatus: rawDailyStatus,
    isLoading,
  } = useDailyPuzzle<{ id: string }, RankAction>({
    gameSlug: 'rank-em',
    puzzles: SENTINEL,
    maxGuesses: 1,
    isWon: (g) => g.length > 0 && scoreRankGuess(g[0].order, dailyRound) === 5,
    isLost: (g) => g.length > 0 && scoreRankGuess(g[0].order, dailyRound) < 5,
    deserializeGuesses: (raw) => raw as RankAction[],
  });

  const [unlimitedActions, setUnlimitedActions] = useState<RankAction[]>([]);

  const round = mode === 'daily' ? dailyRound : (unlimitedRound ?? dailyRound);
  const seed = mode === 'daily' ? dateSeed(getTodayET()) : (unlimitedSeed ?? 0);
  const actions = mode === 'daily' ? dailyActions : unlimitedActions;
  const submitted = actions.length > 0;
  const submittedOrder = submitted ? actions[0].order : null;

  const scramble = useMemo(() => scrambledNames(round, seed), [round.id, seed]);
  const [picks, setPicks] = useState<string[]>([]);

  // Reset the working picks whenever the round or mode changes.
  useEffect(() => { setPicks([]); }, [round.id, mode]);

  const over = submitted;
  const finalOrder = submittedOrder ?? picks;
  const correctCount = submitted ? scoreRankGuess(submittedOrder as string[], round) : 0;
  const score = correctCount * RANK_POINTS_PER_SLOT;
  const won = submitted && correctCount === 5;

  const act = useCallback((a: RankAction) => {
    if (mode === 'daily') addDailyAction(a);
    else setUnlimitedActions((prev) => [...prev, a]);
  }, [mode, addDailyAction]);

  const pick = useCallback((name: string) => {
    if (submitted) return;
    setPicks((prev) => {
      if (prev.includes(name) || prev.length >= 5) return prev;
      const next = [...prev, name];
      if (next.length === 5) act({ order: next });
      return next;
    });
  }, [submitted, act]);

  const undo = useCallback(() => { if (!submitted) setPicks((prev) => prev.slice(0, -1)); }, [submitted]);

  const switchMode = useCallback((nextMode: Mode) => {
    if (nextMode === 'unlimited' && unlimitedRound === null) {
      setUnlimitedRound(getRandomRankRound());
      setUnlimitedSeed(Math.floor(Math.random() * 1e9));
    }
    setMode(nextMode);
  }, [unlimitedRound]);

  const newUnlimited = useCallback(() => {
    setUnlimitedRound(getRandomRankRound());
    setUnlimitedSeed(Math.floor(Math.random() * 1e9));
    setUnlimitedActions([]);
    setPicks([]);
  }, []);

  useGameCompletion('rank-em', mode === 'daily' && rawDailyStatus !== 'playing', score);

  const remaining = scramble.filter((n) => !finalOrder.includes(n));

  const valueOf = (name: string): number | undefined => round.items.find((it) => it.name === name)?.value;

  return (
    <>
      <PageSeo
        title="Rank 'Em - Put the Players in Order | DoUKnowBall"
        description="Put five players in the correct order by a career stat, most to fewest. A new daily ranking across the NBA, NHL and MLB, every number verified."
        path="/rank-em"
      />
      <GameShell
        width="narrow"
        title="📊 RANK 'EM"
        subtitle="Put five players in order by the stat, most to fewest."
        headerExtra={
          <div className="flex items-center justify-center gap-1 mt-4 bg-secondary rounded-full p-1 w-fit mx-auto">
            {(['daily', 'unlimited'] as const).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={cn(
                  'px-5 py-1.5 rounded-full text-sm font-semibold transition-all',
                  mode === m ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {m === 'daily' ? '📅 Daily' : '∞ Unlimited'}
              </button>
            ))}
          </div>
        }
      >
        {!isLoading && (
          <>
            <div className="text-center mb-4">
              <p className="text-sm font-bold text-primary">{round.sport} · {round.statLabel}</p>
              <p className="text-xs text-muted-foreground mt-0.5 inline-flex items-center gap-1">
                Rank most <ArrowDown className="w-3 h-3" /> fewest
              </p>
            </div>

            {/* Ranking slots */}
            <div className="max-w-md mx-auto space-y-2 mb-4">
              {Array.from({ length: 5 }).map((_, i) => {
                const name = finalOrder[i];
                const isCorrect = over && name === round.items[i].name;
                return (
                  <div
                    key={i}
                    className={cn(
                      'flex items-center gap-3 px-4 py-2.5 rounded-xl border',
                      !name && 'bg-secondary/40 border-dashed border-border',
                      name && !over && 'bg-card border-border',
                      over && (isCorrect ? 'bg-correct/10 border-correct' : 'bg-destructive/10 border-destructive')
                    )}
                  >
                    <span className="w-6 text-sm font-bold text-muted-foreground shrink-0">{i + 1}</span>
                    <span className="flex-1 text-sm font-semibold text-foreground">{name ?? '-'}</span>
                    {over && name && (
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {valueOf(name)?.toLocaleString()} {round.unit}
                      </span>
                    )}
                    {over && (isCorrect ? <span className="text-correct text-sm font-bold">✓</span> : <span className="text-destructive text-sm font-bold">✗</span>)}
                  </div>
                );
              })}
            </div>

            {/* Pool */}
            {!over && (
              <div className="max-w-md mx-auto">
                <p className="text-xs text-muted-foreground text-center mb-2">Tap in order, highest first:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {remaining.map((name) => (
                    <button
                      key={name}
                      onClick={() => pick(name)}
                      className="px-3 py-2 rounded-xl bg-primary/10 border border-primary/30 text-sm font-semibold text-foreground hover:bg-primary/20 transition-colors"
                    >
                      {name}
                    </button>
                  ))}
                </div>
                {picks.length > 0 && (
                  <div className="flex justify-center mt-3">
                    <button onClick={undo} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                      <RotateCcw className="w-3 h-3" /> Undo last
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Result */}
            {over && (
              <div className="mt-4 flex justify-center">
                <ResultScreen
                  won={won}
                  outcomeEmoji={won ? '🏆' : correctCount >= 3 ? '👏' : '🙈'}
                  headline={`${correctCount} / 5 correct`}
                  statLine={<>{round.sport} · {round.statLabel}</>}
                  funFact={<>💡 Correct order: {round.items.map((it) => it.name).join(' › ')}</>}
                  statRow={[{ label: 'Score', value: <span className="inline-flex items-center gap-1"><Trophy className="w-4 h-4" />{score}</span> }]}
                  emojiGrid={`📊 Rank 'Em, ${round.sport} ${round.statLabel}: ${correctCount}/5`}
                  share={{
                    score: `${correctCount}/5 on today's Rank 'Em`,
                    gameName: "Rank 'Em",
                    gamePath: '/rank-em',
                  }}
                  onPlayAgain={mode === 'unlimited' ? newUnlimited : undefined}
                  playAgainLabel="New round"
                  playNext={mode === 'daily' ? <p className="text-sm text-muted-foreground">Come back tomorrow for a new ranking!</p> : undefined}
                />
              </div>
            )}
          </>
        )}

        <GameSeoContent
          pageHasOwnH1
          title="Rank 'Em | DoUKnowBall"
          description="A stat is named and you get five players near the top of it. Put them in the exact order, most to fewest. Every ranking is real career totals from the database, no opinions, one right answer."
          howToPlay={[
            'A career stat is named, with five players who rank near the top of it',
            'Tap the players in order, highest first, down to fifth',
            'You get one submission per day',
            'Your score is how many you place in the exact right spot (200 each, 1000 for a perfect 5/5)',
            'Every ranking is exact career totals from the database',
          ]}
          examples={[
            'Career points: is it Kobe or Dirk on top, and where does Iverson land?',
            'NHL goals: Ovechkin passed Gretzky, but who comes third?',
            'Career home runs: Bonds, Aaron, Ruth, Pujols, Mays, in what order?',
          ]}
        />

        <AdBanner slot="7540487748" format="horizontal" className="mt-8" />
        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="rank-em" gameContext={{ round: round.id }} />
        </div>
        <GameNav />
      </GameShell>
    </>
  );
};

export default RankEm;
