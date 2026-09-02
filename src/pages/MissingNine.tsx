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
  ActiveNinePuzzle,
  ALL_NINE_NAMES,
  NINE_SCORES,
  nineHintForLevel,
  NineHintLevel,
  getDailyNinePuzzle,
  getRandomNinePuzzle,
  isCorrectNineGuess,
  normalizeNineName,
} from '@/lib/missingNine';

/**
 * Missing Nine (task #39), the MLB port of /missing-five. A verified real
 * World Series starting nine shown IN BATTING ORDER with one name blanked;
 * 3 guesses, hint ladder, 100/70/40. Daily uses the sitewide ET-seeded
 * convention via lib/missingNine.ts; persistence via useDailyPuzzle's action
 * log (sentinel-puzzle pattern, same as Missing Five).
 */

type Mode = 'daily' | 'unlimited';
type NineAction = { t: 'miss' } | { t: 'won' } | { t: 'give' };
const SENTINEL = [{ id: 'missing-nine-daily' }];

const MissingNine = () => {
  const [mode, setMode] = useState<Mode>('daily');

  const dailyPuzzle = useMemo<ActiveNinePuzzle>(() => getDailyNinePuzzle(), []);
  const [unlimitedPuzzle, setUnlimitedPuzzle] = useState<ActiveNinePuzzle>(() => getRandomNinePuzzle());

  const {
    guesses: dailyActions,
    addGuess: addDailyAction,
    gameStatus: rawDailyStatus,
    isLoading,
  } = useDailyPuzzle<{ id: string }, NineAction>({
    gameSlug: 'missing-nine',
    puzzles: SENTINEL,
    maxGuesses: 999,
    isWon: (g) => g.some((a) => a.t === 'won'),
    isLost: (g) => g.filter((a) => a.t === 'miss').length >= 3 || g.some((a) => a.t === 'give'),
    deserializeGuesses: (raw) => raw as NineAction[],
  });

  const [unlimitedActions, setUnlimitedActions] = useState<NineAction[]>([]);

  const puzzle = mode === 'daily' ? dailyPuzzle : unlimitedPuzzle;
  const actions = mode === 'daily' ? dailyActions : unlimitedActions;
  const misses = actions.filter((a) => a.t === 'miss').length;
  const won = actions.some((a) => a.t === 'won');
  const gaveUp = actions.some((a) => a.t === 'give');
  const over = won || gaveUp || misses >= 3;
  // Round 52: full ladder unlocks on your last guess (level 3 was unreachable).
  const hintLevel = (misses >= 2 ? 3 : misses) as NineHintLevel;
  const score = won ? NINE_SCORES[Math.min(misses, NINE_SCORES.length - 1)] : 0;

  const [input, setInput] = useState('');
  const [wrongFlash, setWrongFlash] = useState(false);
  // Hard mode (task #12): no hints, no suggestions, positions hidden until
  // reveal. Presentation-only, scoring and daily persistence are unchanged.
  const [hard, setHard] = useState(false);

  const act = useCallback((a: NineAction) => {
    if (mode === 'daily') addDailyAction(a);
    else setUnlimitedActions((prev) => [...prev, a]);
  }, [mode, addDailyAction]);

  const submit = useCallback((raw: string) => {
    if (over || !raw.trim()) return;
    if (isCorrectNineGuess(raw, puzzle.candidate)) {
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
    setUnlimitedPuzzle(getRandomNinePuzzle());
    setUnlimitedActions([]);
    setInput('');
  }, []);

  const switchMode = useCallback((m: Mode) => { setMode(m); setInput(''); }, []);

  useGameCompletion('missing-nine', mode === 'daily' && rawDailyStatus !== 'playing', score);

  const suggestions = useMemo(() => {
    if (hard) return [];
    const q = normalizeNineName(input);
    if (q.length < 2) return [];
    return ALL_NINE_NAMES
      .filter((n) => normalizeNineName(n).includes(q) && normalizeNineName(n) !== q)
      .slice(0, 6);
  }, [input, hard]);

  const hints: string[] = [];
  if (!hard) for (let l = 1 as NineHintLevel; l <= hintLevel; l = (l + 1) as NineHintLevel) {
    const h = nineHintForLevel(l, puzzle.candidate);
    if (h) hints.push(h);
  }

  const { lineup, candidate } = puzzle;

  return (
    <>
      <PageSeo
        title="Missing Nine - Name the Missing World Series Starter | DoUKnowBall"
        description="A famous real World Series starting nine in batting order with one name blanked out. Can you remember who actually started? Daily challenge with verified lineups."
        path="/missing-nine"
      />
      <GameShell
        width="narrow"
        title="⚾ MISSING NINE"
        subtitle="One starter from a famous World Series batting order is blanked. Who was it?"
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
                'mt-2 mx-auto block text-xs px-3 py-2 rounded-full border transition-all',
                hard ? 'border-destructive text-destructive bg-destructive/10 font-semibold' : 'border-border text-muted-foreground hover:text-foreground'
              )}
            >
              😈 Hard mode: {hard ? 'ON' : 'off'}
            </button>
            <div className="flex items-center justify-center gap-4 mt-3 text-sm">
              <span className="text-muted-foreground">Guesses left: <span className="font-semibold text-foreground">{Math.max(0, 3 - misses)}</span></span>
              {!over && (
                <span className="text-muted-foreground">Worth: <span className="font-semibold text-gold">{NINE_SCORES[Math.min(misses, 2)]} pts</span></span>
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
              <p className="text-sm font-semibold text-foreground mt-1">{lineup.team} starting lineup</p>
            </div>

            {/* Batting order card */}
            <div className="max-w-md mx-auto rounded-2xl border border-border bg-gradient-to-b from-green-950/40 to-card overflow-hidden mb-6">
              <div className="px-4 py-2 border-b border-border/60 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Batting order</span>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Pos</span>
              </div>
              <div className="divide-y divide-border/40">
                {lineup.slots.map((slot, i) => {
                  const isBlank = i === candidate.slotIndex && !over;
                  const revealed = i === candidate.slotIndex && over;
                  return (
                    <div
                      key={i}
                      className={cn(
                        'flex items-center gap-3 px-4 py-2',
                        isBlank && 'bg-primary/10',
                        revealed && (won ? 'bg-correct/15' : 'bg-destructive/10')
                      )}
                    >
                      <span
                        className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0',
                          isBlank ? 'bg-primary text-primary-foreground animate-pulse' : 'bg-secondary text-muted-foreground'
                        )}
                      >
                        {i + 1}
                      </span>
                      <span
                        className={cn(
                          'flex-1 text-sm font-bold leading-tight',
                          isBlank
                            ? 'text-primary'
                            : revealed
                              ? 'text-foreground'
                              : 'text-foreground'
                        )}
                      >
                        {isBlank ? '?' : slot.name}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground w-8 text-right shrink-0">
                        {hard && !over ? '-' : slot.position}
                      </span>
                    </div>
                  );
                })}
              </div>
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
                    /* Round 274: a placeholder is not an accessible name. */
                    aria-label="Who was the missing starter"
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
                  <button onClick={giveUp} className="inline-flex items-center rounded-full px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-destructive">Give up</button>
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
                  funFact={candidate.fact ? <>💡 {candidate.fact}</> : <>That was the real starting nine that night.</>}
                  statRow={won ? [{ label: 'Score', value: <span className="inline-flex items-center gap-1"><Trophy className="w-4 h-4" />{score}</span> }] : undefined}
                  emojiGrid={won ? `⚾ Missing Nine: ${score} pts` : `⚾ Missing Nine: missed it`}
                  share={{
                    score: won ? `${score} points on today's Missing Nine` : `today's Missing Nine (stumped)`,
                    gameName: 'Missing Nine',
                    gamePath: '/missing-nine',
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
          title="Missing Nine | DoUKnowBall"
          description="A verified real World Series starting nine is shown in batting order with one name blanked out. Remember who actually started, including the surprise starters history forgot."
          howToPlay={[
            'A famous real World Series batting order is shown with one player blanked',
            'The batting-order spot and position are shown, the name is the mystery',
            'You get 3 guesses; each miss unlocks a hint',
            'Guess on the first try for 100 points, then 70, then 40',
            'Every lineup is verified against the official box score',
          ]}
          examples={[
            'Who started in left field for the 1988 Dodgers in Game 1? (Not Gibson, he never started...)',
            'Who caught Game 7 for the 2016 Cubs? (Not the guy who homered...)',
          ]}
        />

        <AdBanner slot="7540487748" format="horizontal" className="mt-8" />
        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="missing-nine" gameContext={{ lineup: lineup.id }} />
        </div>
        <GameNav />
      </GameShell>
    </>
  );
};

export default MissingNine;
