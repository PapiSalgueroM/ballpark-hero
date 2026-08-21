import { useMemo, useState, useCallback } from 'react';
import { GameNav } from '@/components/game/GameNav';
import { GameShell } from '@/components/game/GameShell';
import { ResultScreen } from '@/components/game/ResultScreen';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { useDailyPuzzle } from '@/hooks/useDailyPuzzle';
import { cn } from '@/lib/utils';
import { Trophy, Lightbulb } from 'lucide-react';
import {
  ActiveFivePuzzle,
  ALL_FIVE_NAMES,
  FIVE_SCORES,
  fiveHintForLevel,
  FiveHintLevel,
  getDailyFivePuzzle,
  getRandomFivePuzzle,
  isCorrectFiveGuess,
  normalizeFiveName,
} from '@/lib/missingFive';

/**
 * Missing Five (task #39), the NBA port of /missing-xi. A verified real
 * starting five with one name blanked; 3 guesses, hint ladder, 100/70/40.
 * Daily uses the sitewide ET-seeded convention via lib/missingFive.ts;
 * persistence via useDailyPuzzle's action log (sentinel-puzzle pattern,
 * same as the Higher/Lower hooks).
 */

type Mode = 'daily' | 'unlimited';
type FiveAction = { t: 'miss' } | { t: 'won' } | { t: 'give' };
const SENTINEL = [{ id: 'missing-five-daily' }];

const MissingFive = () => {
  const [mode, setMode] = useState<Mode>('daily');

  const dailyPuzzle = useMemo<ActiveFivePuzzle>(() => getDailyFivePuzzle(), []);
  const [unlimitedPuzzle, setUnlimitedPuzzle] = useState<ActiveFivePuzzle>(() => getRandomFivePuzzle());

  const {
    guesses: dailyActions,
    addGuess: addDailyAction,
    gameStatus: rawDailyStatus,
    isLoading,
  } = useDailyPuzzle<{ id: string }, FiveAction>({
    gameSlug: 'missing-five',
    puzzles: SENTINEL,
    maxGuesses: 999,
    isWon: (g) => g.some((a) => a.t === 'won'),
    isLost: (g) => g.filter((a) => a.t === 'miss').length >= 3 || g.some((a) => a.t === 'give'),
    deserializeGuesses: (raw) => raw as FiveAction[],
  });

  const [unlimitedActions, setUnlimitedActions] = useState<FiveAction[]>([]);

  const puzzle = mode === 'daily' ? dailyPuzzle : unlimitedPuzzle;
  const actions = mode === 'daily' ? dailyActions : unlimitedActions;
  const misses = actions.filter((a) => a.t === 'miss').length;
  const won = actions.some((a) => a.t === 'won');
  const gaveUp = actions.some((a) => a.t === 'give');
  const over = won || gaveUp || misses >= 3;
  // Round 52: at 2 misses (your last guess) the FULL ladder shows; level 3 used
  // to unlock only when the game was already over.
  const hintLevel = (misses >= 2 ? 3 : misses) as FiveHintLevel;
  const score = won ? FIVE_SCORES[Math.min(misses, FIVE_SCORES.length - 1)] : 0;

  const [input, setInput] = useState('');
  const [wrongFlash, setWrongFlash] = useState(false);
  // Hard mode (task #12): no hints, no suggestions, positions hidden until
  // reveal. Presentation-only, scoring and daily persistence are unchanged.
  const [hard, setHard] = useState(false);

  const act = useCallback((a: FiveAction) => {
    if (mode === 'daily') addDailyAction(a);
    else setUnlimitedActions((prev) => [...prev, a]);
  }, [mode, addDailyAction]);

  const submit = useCallback((raw: string) => {
    if (over || !raw.trim()) return;
    if (isCorrectFiveGuess(raw, puzzle.candidate)) {
      act({ t: 'won' });
    } else {
      act({ t: 'miss' });
      setWrongFlash(true);
      setTimeout(() => setWrongFlash(false), 1200);
    }
    setInput('');
  }, [over, puzzle, act]);

  const giveUp = useCallback(() => { if (!over) act({ t: 'give' }); }, [over, act]);

  const newUnlimited = useCallback(() => {
    setUnlimitedPuzzle(getRandomFivePuzzle());
    setUnlimitedActions([]);
    setInput('');
  }, []);

  const switchMode = useCallback((m: Mode) => { setMode(m); setInput(''); }, []);

  useGameCompletion('missing-five', mode === 'daily' && rawDailyStatus !== 'playing', score);

  const suggestions = useMemo(() => {
    if (hard) return [];
    const q = normalizeFiveName(input);
    if (q.length < 2) return [];
    return ALL_FIVE_NAMES
      .filter((n) => normalizeFiveName(n).includes(q) && normalizeFiveName(n) !== q)
      .slice(0, 6);
  }, [input, hard]);

  const hints: string[] = [];
  if (!hard) for (let l = 1 as FiveHintLevel; l <= hintLevel; l = (l + 1) as FiveHintLevel) {
    const h = fiveHintForLevel(l, puzzle.candidate);
    if (h) hints.push(h);
  }

  const { lineup, candidate } = puzzle;

  return (
    <>
      <PageSeo
        title="Missing Five - Name the Missing NBA Starter | DoUKnowBall"
        description="A famous real NBA starting five with one name blanked out. Can you remember who actually started? Daily challenge with verified lineups."
        path="/missing-five"
      />
      <GameShell
        width="narrow"
        title="🏀 MISSING FIVE"
        subtitle="One starter from a famous real lineup is blanked. Who was it?"
        headerExtra={
          <>
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
            <button
              onClick={() => setHard((h) => !h)}
              title="Hard mode: no hints, no suggestions, positions hidden"
              className={cn(
                'mt-2 mx-auto block text-xs px-3 py-1 rounded-full border transition-all',
                hard ? 'border-destructive text-destructive bg-destructive/10 font-semibold' : 'border-border text-muted-foreground hover:text-foreground'
              )}
            >
              😈 Hard mode: {hard ? 'ON' : 'off'}
            </button>
            <div className="flex items-center justify-center gap-4 mt-3 text-sm">
              <span className="text-muted-foreground">Guesses left: <span className="font-semibold text-foreground">{Math.max(0, 3 - misses)}</span></span>
              {!over && (
                <span className="text-muted-foreground">Worth: <span className="font-semibold text-gold">{FIVE_SCORES[Math.min(misses, 2)]} pts</span></span>
              )}
            </div>
          </>
        }
      >
        {!isLoading && (
          <>
            {/* Match header */}
            <div className="text-center mb-4">
              <p className="text-sm font-bold text-primary">{lineup.dateLabel}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{lineup.scoreLine} · {lineup.venue}</p>
              <p className="text-sm font-semibold text-foreground mt-1">{lineup.team} starting five</p>
            </div>

            {/* Half court */}
            <div className="relative w-full max-w-md mx-auto aspect-[4/5] rounded-2xl border border-border bg-gradient-to-b from-orange-950/40 to-card overflow-hidden mb-6">
              {/* court markings */}
              <div className="absolute left-1/2 -translate-x-1/2 top-0 w-[55%] h-[38%] border-2 border-orange-300/20 border-t-0 rounded-b-[50%]" />
              <div className="absolute left-1/2 -translate-x-1/2 top-0 w-[30%] h-[26%] border-2 border-orange-300/20 border-t-0" />
              <div className="absolute left-1/2 -translate-x-1/2 top-[4%] w-3 h-3 rounded-full border-2 border-orange-300/40" />

              {lineup.slots.map((slot, i) => {
                const isBlank = i === candidate.slotIndex && !over;
                const revealed = i === candidate.slotIndex && over;
                return (
                  <div
                    key={i}
                    className="absolute -translate-x-1/2 -translate-y-1/2 text-center"
                    style={{ left: `${slot.x}%`, top: `${100 - slot.y}%` }}
                  >
                    <div className={cn(
                      'px-2.5 py-2 rounded-xl border text-xs font-bold min-w-[86px] leading-tight',
                      isBlank
                        ? 'bg-primary/15 border-primary text-primary animate-pulse'
                        : revealed
                          ? (won ? 'bg-correct/20 border-correct text-foreground' : 'bg-destructive/15 border-destructive/50 text-foreground')
                          : 'bg-card/90 border-border text-foreground'
                    )}>
                      <span className="block text-[9px] uppercase tracking-wider opacity-70">{hard && !over ? '?' : slot.position}</span>
                      {isBlank ? '?' : slot.name}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Hints */}
            {!over && hints.length > 0 && (
              <div className="max-w-md mx-auto mb-4 space-y-2">
                {hints.map((h, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-secondary/60 border border-border animate-cell-reveal">
                    <Lightbulb className="w-4 h-4 text-gold shrink-0" /> <span className="text-foreground">{h}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Input */}
            {!over && (
              <div className="max-w-md mx-auto relative">
                <form
                  onSubmit={(e) => { e.preventDefault(); submit(input); }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Who was the missing starter?"
                    className={cn(
                      'flex-1 min-w-0 px-4 py-3 rounded-xl bg-secondary border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all',
                      wrongFlash ? 'border-destructive ring-destructive/30' : 'border-border focus:ring-primary/40'
                    )}
                  />
                  <button type="submit" disabled={!input.trim()} className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity disabled:opacity-40">
                    Guess
                  </button>
                </form>
                {suggestions.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
                    {suggestions.map((name) => (
                      <button key={name} type="button" onClick={() => submit(name)} className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors">
                        {name}
                      </button>
                    ))}
                  </div>
                )}
                {wrongFlash && <p className="text-destructive text-sm text-center mt-2 animate-cell-reveal">Not that night. Try again!</p>}
                <div className="flex justify-center mt-3">
                  <button onClick={giveUp} className="text-xs text-muted-foreground hover:text-destructive transition-colors">Give up</button>
                </div>
              </div>
            )}

            {/* Result */}
            {over && (
              <div className="mt-2 flex justify-center">
                <ResultScreen
                  won={won}
                  outcomeEmoji={won ? '🏆' : '🙈'}
                  headline={candidate.name}
                  statLine={<>{lineup.team} · {lineup.dateLabel}</>}
                  funFact={candidate.fact ? <>💡 {candidate.fact}</> : <>That was the real starting five that night.</>}
                  statRow={won ? [{ label: 'Score', value: <span className="inline-flex items-center gap-1"><Trophy className="w-4 h-4" />{score}</span> }] : undefined}
                  emojiGrid={won ? `🏀 Missing Five: ${score} pts` : `🏀 Missing Five: missed it`}
                  share={{
                    score: won ? `${score} points on today's Missing Five` : `today's Missing Five (stumped)`,
                    gameName: 'Missing Five',
                    gamePath: '/missing-five',
                  }}
                  onPlayAgain={mode === 'unlimited' ? newUnlimited : undefined}
                  playAgainLabel="New lineup"
                  playNext={mode === 'daily' ? <p className="text-sm text-muted-foreground">Come back tomorrow for a new lineup!</p> : undefined}
                />
              </div>
            )}
          </>
        )}

        <GameSeoContent
          pageHasOwnH1
          title="Missing Five | DoUKnowBall"
          description="A verified real NBA starting five is shown with one name blanked out. Remember who actually started, including the surprise starters history forgot."
          howToPlay={[
            'A famous real NBA starting five is shown with one player blanked',
            'The position is shown, the name is the mystery',
            'You get 3 guesses; each miss unlocks a hint',
            'Guess on the first try for 100 points, then 70, then 40',
            'Every lineup is verified against the official box score',
          ]}
          examples={[
            'Who started at center for the Warriors in Game 7 of the 2016 Finals? (Not Bogut...)',
            "Who started at power forward for the Bulls on the night of Jordan's Last Shot? (Not Rodman...)",
          ]}
        />

        <AdBanner slot="1234567912" format="horizontal" className="mt-8" />
        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="missing-five" gameContext={{ lineup: lineup.id }} />
        </div>
        <GameNav />
      </GameShell>
    </>
  );
};

export default MissingFive;
