import { useMemo, useState, useEffect, useCallback } from 'react';
import { searchPlayers, NFL_ROSTER_SOURCE } from '@/lib/playerSearch';
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
  ActiveElevenPuzzle,
  ALL_ELEVEN_NAMES,
  ELEVEN_SCORES,
  elevenHintForLevel,
  ElevenHintLevel,
  getDailyElevenPuzzle,
  getRandomElevenPuzzle,
  isCorrectElevenGuess,
  normalizeElevenName,
} from '@/lib/missingEleven';

/**
 * Missing Eleven (task #39), the NFL port of /missing-five. A verified real
 * Super Bowl starting UNIT (offense or defense) with one name blanked;
 * 3 guesses, hint ladder, 100/70/40. Daily uses the sitewide ET-seeded convention via
 * lib/missingEleven.ts; persistence via useDailyPuzzle's action log
 * (sentinel-puzzle pattern, same as Missing Five/Nine).
 */

type Mode = 'daily' | 'unlimited';
type ElevenAction = { t: 'miss' } | { t: 'won' } | { t: 'give' };
const SENTINEL = [{ id: 'missing-eleven-daily' }];

const MissingEleven = () => {
  const [mode, setMode] = useState<Mode>('daily');

  const dailyPuzzle = useMemo<ActiveElevenPuzzle>(() => getDailyElevenPuzzle(), []);
  const [unlimitedPuzzle, setUnlimitedPuzzle] = useState<ActiveElevenPuzzle>(() => getRandomElevenPuzzle());

  const {
    guesses: dailyActions,
    addGuess: addDailyAction,
    gameStatus: rawDailyStatus,
    isLoading,
  } = useDailyPuzzle<{ id: string }, ElevenAction>({
    gameSlug: 'missing-eleven',
    puzzles: SENTINEL,
    maxGuesses: 999,
    isWon: (g) => g.some((a) => a.t === 'won'),
    isLost: (g) => g.filter((a) => a.t === 'miss').length >= 3 || g.some((a) => a.t === 'give'),
    deserializeGuesses: (raw) => raw as ElevenAction[],
  });

  const [unlimitedActions, setUnlimitedActions] = useState<ElevenAction[]>([]);

  const puzzle = mode === 'daily' ? dailyPuzzle : unlimitedPuzzle;
  const actions = mode === 'daily' ? dailyActions : unlimitedActions;
  const misses = actions.filter((a) => a.t === 'miss').length;
  const won = actions.some((a) => a.t === 'won');
  const gaveUp = actions.some((a) => a.t === 'give');
  const over = won || gaveUp || misses >= 3;
  const hintLevel = Math.min(misses, 3) as ElevenHintLevel;
  const score = won ? ELEVEN_SCORES[Math.min(misses, ELEVEN_SCORES.length - 1)] : 0;

  const [input, setInput] = useState('');
  const [wrongFlash, setWrongFlash] = useState(false);
  // Hard mode (task #12): no hints, no suggestions, positions hidden until
  // reveal. Presentation-only, scoring and daily persistence are unchanged.
  const [hard, setHard] = useState(false);

  const act = useCallback((a: ElevenAction) => {
    if (mode === 'daily') addDailyAction(a);
    else setUnlimitedActions((prev) => [...prev, a]);
  }, [mode, addDailyAction]);

  const submit = useCallback((raw: string) => {
    if (over || !raw.trim()) return;
    if (isCorrectElevenGuess(raw, puzzle.candidate)) {
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
    setUnlimitedPuzzle(getRandomElevenPuzzle());
    setUnlimitedActions([]);
    setInput('');
  }, []);

  const switchMode = useCallback((m: Mode) => { setMode(m); setInput(''); }, []);

  useGameCompletion('missing-eleven', mode === 'daily' && rawDailyStatus !== 'playing', score);

  // Owner 2026-08-05: the suggestion bar must search the WHOLE league, not
  // just the handful of names in the puzzle pool (which quietly leaked the
  // answer). Typing part of any NFL name now suggests real players from the
  // full nflfastr roster table; puzzle-pool names still surface instantly.
  const localSuggestions = useMemo(() => {
    if (hard) return [];
    const q = normalizeElevenName(input);
    if (q.length < 2) return [];
    return ALL_ELEVEN_NAMES
      .filter((n) => normalizeElevenName(n).includes(q) && normalizeElevenName(n) !== q)
      .slice(0, 3);
  }, [input, hard]);

  const [wideSuggestions, setWideSuggestions] = useState<string[]>([]);
  useEffect(() => {
    if (hard || input.trim().length < 2) { setWideSuggestions([]); return; }
    let cancelled = false;
    const t = window.setTimeout(async () => {
      try {
        const { results: found } = await searchPlayers({
          query: input, source: NFL_ROSTER_SOURCE, minChars: 2, limit: 6,
        });
        if (!cancelled) setWideSuggestions(found.map((e) => e.name));
      } catch { if (!cancelled) setWideSuggestions([]); }
    }, 200);
    return () => { cancelled = true; window.clearTimeout(t); };
  }, [input, hard]);

  const suggestions = useMemo(() => {
    const merged: string[] = [];
    const seen = new Set<string>();
    for (const n of [...localSuggestions, ...wideSuggestions]) {
      const k = normalizeElevenName(n);
      if (seen.has(k)) continue;
      seen.add(k);
      merged.push(n);
      if (merged.length >= 6) break;
    }
    return merged;
  }, [localSuggestions, wideSuggestions]);

  const hints: string[] = [];
  if (!hard) for (let l = 1 as ElevenHintLevel; l <= hintLevel; l = (l + 1) as ElevenHintLevel) {
    const h = elevenHintForLevel(l, puzzle.candidate);
    if (h) hints.push(h);
  }

  const { lineup, candidate } = puzzle;
  const unit = lineup.unit ?? 'offense';

  return (
    <>
      <PageSeo
        title="Missing Eleven - Name the Missing Super Bowl Starter | DoUKnowBall"
        description="A famous real Super Bowl starting lineup, offense or defense, with one name blanked out. Can you remember who actually started? Daily challenge with verified lineups."
        path="/missing-eleven"
      />
      <GameShell
        width="narrow"
        title="🏈 MISSING ELEVEN"
        subtitle="One starter from a famous Super Bowl lineup is blanked. Who was it?"
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
                <span className="text-muted-foreground">Worth: <span className="font-semibold text-gold">{ELEVEN_SCORES[Math.min(misses, 2)]} pts</span></span>
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
              <p className="text-sm font-semibold text-foreground mt-1">{lineup.team} starting {unit}</p>
            </div>

            {/* Starting unit card */}
            <div className="max-w-md mx-auto rounded-2xl border border-border bg-gradient-to-b from-emerald-950/40 to-card overflow-hidden mb-6">
              <div className="px-4 py-2 border-b border-border/60 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Starting {unit}</span>
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
                        'flex items-center gap-3 px-4 py-1.5',
                        isBlank && 'bg-primary/10',
                        revealed && (won ? 'bg-correct/15' : 'bg-destructive/10')
                      )}
                    >
                      <span
                        className={cn(
                          'w-9 text-[10px] uppercase tracking-wider font-bold shrink-0',
                          isBlank ? 'text-primary' : 'text-muted-foreground'
                        )}
                      >
                        {hard && !over ? '-' : slot.position}
                      </span>
                      <span
                        className={cn(
                          'flex-1 text-sm font-bold leading-tight',
                          isBlank ? 'text-primary animate-pulse' : 'text-foreground'
                        )}
                      >
                        {isBlank ? '?' : slot.name}
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
                  funFact={candidate.fact ? <>💡 {candidate.fact}</> : <>That was the real starting {unit} that night.</>}
                  statRow={won ? [{ label: 'Score', value: <span className="inline-flex items-center gap-1"><Trophy className="w-4 h-4" />{score}</span> }] : undefined}
                  emojiGrid={won ? `🏈 Missing Eleven: ${score} pts` : `🏈 Missing Eleven: missed it`}
                  share={{
                    score: won ? `${score} points on today's Missing Eleven` : `today's Missing Eleven (stumped)`,
                    gameName: 'Missing Eleven',
                    gamePath: '/missing-eleven',
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
          title="Missing Eleven | DoUKnowBall"
          description="A verified real Super Bowl starting lineup, offense or defense, is shown with one name blanked out. Remember who actually started, including the surprise starters history forgot."
          howToPlay={[
            'A famous real Super Bowl starting offense or defense is shown with one player blanked',
            'The position is shown, the name is the mystery',
            'You get 3 guesses; each miss unlocks a hint',
            'Guess on the first try for 100 points, then 70, then 40',
            'Every lineup is verified against the official starters table',
          ]}
          examples={[
            'Who started at running back for the Patriots in Super Bowl LI? (Not Blount, not White...)',
            'Who started at tight end for the 28-3 Falcons? (Not the guy who caught the TD...)',
            'Who started at linebacker for the Super Bowl XLVIII Seahawks? (Not the MVP...)',
            'Who started at strong safety for the 2000 Ravens? (Everyone forgets him...)',
          ]}
        />

        <AdBanner slot="7540487748" format="horizontal" className="mt-8" />
        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="missing-eleven" gameContext={{ lineup: lineup.id }} />
        </div>
        <GameNav />
      </GameShell>
    </>
  );
};

export default MissingEleven;
