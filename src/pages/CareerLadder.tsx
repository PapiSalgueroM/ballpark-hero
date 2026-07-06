import { useState, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, Loader2, Lock } from 'lucide-react';
import { GameNav } from '@/components/game/GameNav';
import { GameShell } from '@/components/game/GameShell';
import { ResultScreen } from '@/components/game/ResultScreen';
import { RulesGate } from '@/components/game/RulesGate';
import { GiveUpButton } from '@/components/game/GiveUpButton';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { useDailyPuzzle } from '@/hooks/useDailyPuzzle';
import {
  BASE_SCORE,
  CareerPlayer,
  CareerStint,
  LadderAction,
  MAX_GUESSES,
  MIN_STINTS,
  REVEAL_PENALTY,
  SCORE_FLOOR,
  WRONG_GUESS_PENALTY,
  careerScore,
  fetchCareerPool,
  flagForNationality,
  fmtMarketValue,
  normalizeName,
  pickDailyPlayer,
} from '@/lib/careerLadder';

type Phase = 'boot' | 'error' | 'playing' | 'won' | 'lost';
type LadderMode = 'daily' | 'unlimited';

function stintStats(s: CareerStint): string {
  const bits: string[] = [];
  if (s.appearances != null) bits.push(`${s.appearances} apps`);
  if (s.goals != null) bits.push(`${s.goals} G`);
  if (s.assists != null) bits.push(`${s.assists} A`);
  return bits.join(' · ');
}

const CareerLadder = () => {
  // Every hook sits above any conditional rendering. This component has no
  // early returns at all, so the hook count can never change between renders
  // (the React error #310 trap that bit TransferPathBoard).
  const [phase, setPhase] = useState<Phase>('boot');
  const [pool, setPool] = useState<CareerPlayer[]>([]);
  const [usedIds, setUsedIds] = useState<string[]>([]);
  const [player, setPlayer] = useState<CareerPlayer | null>(null);
  const [revealed, setRevealed] = useState(1);
  const [wrongGuesses, setWrongGuesses] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [finalScore, setFinalScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);

  // ---- Daily / Unlimited toggle, same convention as Footle / Career Quiz ----
  const [mode, setMode] = useState<LadderMode>('daily');
  const switchMode = useCallback((m: LadderMode) => setMode(m), []);

  // ---- Daily: target player is date-seeded once the pool has loaded -------
  const dailyPlayer = useMemo(() => (pool.length > 0 ? pickDailyPlayer(pool) : null), [pool]);

  // dailyPlayer resolves asynchronously (Supabase fetch via boot()), so it is
  // passed as supabasePuzzle rather than via the static puzzles array.
  // useDailyPuzzle's internal selection memo only re-evaluates on
  // supabasePuzzle transitioning null -> value (see its own doc comment),
  // not on puzzles array content changing after mount.
  //
  // maxGuesses is set high (never auto-triggers) and loss is instead decided
  // by a custom isLost that counts only 'wrong' actions. Otherwise the
  // hook's built-in "array length >= maxGuesses" check would count reveal
  // clicks toward the guess limit too, since reveals share the same action
  // log. Mirrors useCareerGame.ts's identical maxGuesses:999 + custom isLost
  // pattern for the sibling Career Path game.
  const {
    guesses: dailyActions,
    addGuess: addDailyAction,
    isLoading: isDailyLoading,
  } = useDailyPuzzle<CareerPlayer, LadderAction>({
    gameSlug: 'career-ladder',
    puzzles: [],
    supabasePuzzle: dailyPlayer,
    getPuzzleId: (p) => p.id,
    maxGuesses: 999,
    isWon: (g) => g.some((a) => a.t === 'won'),
    isLost: (g) => g.some((a) => a.t === 'give') || g.filter((a) => a.t === 'wrong').length >= MAX_GUESSES,
    deserializeGuesses: (raw) => raw as LadderAction[],
  });

  const dailyRevealed = useMemo(
    () => 1 + dailyActions.filter((a) => a.t === 'reveal' || a.t === 'wrong').length,
    [dailyActions],
  );
  const dailyWrongGuesses = useMemo(
    () => dailyActions.filter((a): a is { t: 'wrong'; name: string } => a.t === 'wrong').map((a) => a.name),
    [dailyActions],
  );
  const dailyWonAction = dailyActions.find((a): a is { t: 'won'; score: number } => a.t === 'won');
  const dailyGaveUp = dailyActions.some((a) => a.t === 'give');
  const dailyPhase: Phase = !dailyPlayer
    ? 'boot'
    : dailyWonAction
      ? 'won'
      : dailyGaveUp || dailyWrongGuesses.length >= MAX_GUESSES
        ? 'lost'
        : 'playing';
  const dailyFinalScore = dailyWonAction?.score ?? 0;

  // ---- Active (mode-switched) values ---------------------------------------
  const activePhase = mode === 'daily' ? dailyPhase : phase;
  const activePlayer = mode === 'daily' ? dailyPlayer : player;
  const activeRevealed = mode === 'daily' ? dailyRevealed : revealed;
  const activeWrongGuesses = mode === 'daily' ? dailyWrongGuesses : wrongGuesses;
  const activeFinalScore = mode === 'daily' ? dailyFinalScore : finalScore;

  const startRound = useCallback((available: CareerPlayer[], used: string[]) => {
    const eligible = available.filter(p => p.seasons.length >= MIN_STINTS);
    if (eligible.length === 0) {
      setPhase('error');
      return;
    }
    let fresh = eligible.filter(p => !used.includes(p.id));
    let carriedUsed = used;
    if (fresh.length === 0) {
      // Pool exhausted: start excluding repeats from scratch.
      fresh = eligible;
      carriedUsed = [];
    }
    const pick = fresh[Math.floor(Math.random() * fresh.length)];
    setUsedIds([...carriedUsed, pick.id]);
    setPlayer(pick);
    setRevealed(1);
    setWrongGuesses([]);
    setInput('');
    setFinalScore(0);
    setPhase('playing');
  }, []);

  const boot = useCallback(async () => {
    setPhase('boot');
    const data = await fetchCareerPool();
    if (!data || data.filter(p => p.seasons.length >= MIN_STINTS).length < 10) {
      setPhase('error');
      return;
    }
    setPool(data);
    startRound(data, []);
  }, [startRound]);

  useEffect(() => { boot(); }, [boot]);

  const allNames = useMemo(() => pool.map(p => p.name), [pool]);

  const ended = activePhase === 'won' || activePhase === 'lost';
  const total = activePlayer ? activePlayer.seasons.length : 0;
  const shown = activePlayer ? (ended ? total : Math.min(activeRevealed, total)) : 0;
  const visibleStints = activePlayer ? activePlayer.seasons.slice(0, shown) : [];
  const hiddenCount = total - shown;
  const flagUnlocked = activePlayer !== null && activeRevealed * 2 >= total;
  const guessesLeft = MAX_GUESSES - activeWrongGuesses.length;
  const potential = careerScore(Math.max(1, Math.min(activeRevealed, total)), activeWrongGuesses.length);

  const query = normalizeName(input);
  const wrongNorms = activeWrongGuesses.map(normalizeName);
  const suggestions =
    activePhase === 'playing' && query.length >= 2
      ? allNames
          .filter(n => {
            const norm = normalizeName(n);
            return norm.includes(query) && !wrongNorms.includes(norm);
          })
          .slice(0, 8)
      : [];

  const handleGuess = (name: string) => {
    if (activePhase !== 'playing' || !activePlayer) return;
    setInput('');
    const norm = normalizeName(name);
    if (wrongNorms.includes(norm)) return;

    if (norm === normalizeName(activePlayer.name)) {
      const score = careerScore(Math.min(activeRevealed, total), activeWrongGuesses.length);
      if (mode === 'daily') {
        addDailyAction({ t: 'won', score });
      } else {
        setFinalScore(score);
        setBestScore(b => Math.max(b, score));
        setPhase('won');
      }
      return;
    }

    if (mode === 'daily') {
      // A single action; isLost (wrong-count >= MAX_GUESSES) derives the loss
      // state from the updated log, so no separate 'lost' dispatch is needed
      // (and dispatching two actions here would race against addGuess's
      // stale-closure-per-call read of guesses, see useDailyPuzzle.ts).
      addDailyAction({ t: 'wrong', name });
    } else {
      const nextWrong = [...wrongGuesses, name];
      setWrongGuesses(nextWrong);
      if (nextWrong.length >= MAX_GUESSES) {
        setPhase('lost');
      } else {
        setRevealed(r => Math.min(total, r + 1));
      }
    }
  };

  // Only a suggestion pick or an exact full-name match can ever submit, so an
  // invalid guess is impossible.
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.length < 2) return;
    const exact = allNames.find(n => normalizeName(n) === query);
    if (exact) handleGuess(exact);
  };

  const revealNext = () => {
    if (activePhase !== 'playing' || activeRevealed >= total) return;
    if (mode === 'daily') {
      addDailyAction({ t: 'reveal' });
    } else {
      setRevealed(r => Math.min(total, r + 1));
    }
  };

  // Give Up: reveals the answer and ends the round at 0, same shape as
  // useCareerGame's giveUp for the sibling Career Path game.
  const giveUp = () => {
    if (activePhase !== 'playing') return;
    if (mode === 'daily') {
      addDailyAction({ t: 'give' });
    } else {
      setFinalScore(0);
      setPhase('lost');
    }
  };

  // Honest marginal cost of the next reveal: what the button advertises must
  // match what careerScore() will actually deduct once the floor (100) is
  // reached, rather than always claiming a flat REVEAL_PENALTY (150) even
  // when the score is already at or near the floor.
  const nextRevealCost = potential - careerScore(
    Math.max(1, Math.min(activeRevealed + 1, total)),
    activeWrongGuesses.length,
  );

  const cluesUsed = Math.max(1, Math.min(activeRevealed, total));
  const emojiGrid =
    activePhase === 'won'
      ? `🪜 got it in ${cluesUsed} ${cluesUsed === 1 ? 'clue' : 'clues'} · ${activeFinalScore} pts`
      : `🪜 stumped after ${MAX_GUESSES} guesses`;

  // ---- Completion tracking (daily only, mirrors Footle/Career Quiz) -------
  const dailyCompletionScore = dailyPhase === 'won' ? dailyFinalScore : 0;
  useGameCompletion('career-ladder', dailyPhase !== 'playing' && dailyPhase !== 'boot', dailyCompletionScore);

  // phase tracks the single shared pool fetch (boot()), so an error there
  // means neither mode has data. Surface it regardless of which mode the
  // user currently has selected.
  const isBooting = phase !== 'error' && (mode === 'daily' ? (phase === 'boot' || isDailyLoading || !dailyPlayer) : phase === 'boot');
  const showError = phase === 'error';

  return (
    <>
      <PageSeo
        title="Career Ladder: Guess the Footballer | DoUKnowBall"
        description="A mystery footballer's career appears one stint at a time. Name the player within 6 guesses. Fewer clues means more points. Daily challenge or unlimited free play."
        path="/career-ladder"
      />
      <GameShell
        width="narrow"
        title="CAREER LADDER"
        subtitle="One career, revealed stint by stint. Name the player before the ladder runs out."
        headerExtra={
          <>
            <RulesGate title="How to Play Career Ladder">
              <section>
                <h3 className="font-bold text-foreground mb-2">The idea</h3>
                <p className="text-muted-foreground">
                  A mystery footballer's career appears one stint at a time, earliest first. Name the player
                  before the ladder runs out.
                </p>
              </section>
              <section>
                <h3 className="font-bold text-foreground mb-2">Guessing</h3>
                <p className="text-muted-foreground">
                  Type at least 2 letters and pick a name from the list. You get {MAX_GUESSES} guesses. Every
                  wrong guess reveals the next stint. You can also reveal one on purpose.
                </p>
              </section>
              <section>
                <h3 className="font-bold text-foreground mb-2">Hints</h3>
                <p className="text-muted-foreground">
                  A nationality flag hint appears once half the career is on the board.
                </p>
              </section>
              <section>
                <h3 className="font-bold text-foreground mb-2">Scoring</h3>
                <p className="text-muted-foreground">
                  Start from {BASE_SCORE} points. Extra stints cost {REVEAL_PENALTY}, wrong guesses cost{' '}
                  {WRONG_GUESS_PENALTY}, and the score never drops below the floor of {SCORE_FLOOR}. Give Up
                  reveals the answer and scores 0.
                </p>
              </section>
            </RulesGate>

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
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {m === 'daily' ? '📅 Daily' : '∞ Unlimited'}
                </button>
              ))}
            </div>

            {mode === 'unlimited' && bestScore > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Session best <span className="text-primary font-bold">{bestScore} pts</span>
              </p>
            )}
          </>
        }
      >
        {isBooting && (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        )}

        {showError && (
          <div className="text-center py-12">
            <p className="text-destructive font-semibold mb-3">Couldn't load the career data right now.</p>
            <button onClick={boot} className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-semibold">
              Try again
            </button>
          </div>
        )}

        {!isBooting && (activePhase === 'playing' || ended) && activePlayer && (
          <>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
              <span>
                Stints <span className="text-primary font-bold">{shown}</span> / {total}
              </span>
              {activePhase === 'playing' && (
                <span>
                  Worth <span className="text-primary font-bold">{potential} pts</span>
                </span>
              )}
              <span>
                Guesses left{' '}
                <span className={cn('font-bold', guessesLeft <= 2 ? 'text-destructive' : 'text-primary')}>
                  {guessesLeft}
                </span>
              </span>
            </div>

            <div className="space-y-2 mb-4">
              {visibleStints.map((s, i) => (
                <div
                  key={`${s.sortOrder}-${i}`}
                  className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3"
                >
                  <span className="text-[10px] font-bold text-primary w-6 shrink-0">#{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-foreground text-sm truncate">{s.club}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {s.season}
                      {stintStats(s) ? ` · ${stintStats(s)}` : ''}
                    </div>
                  </div>
                  {fmtMarketValue(s.marketValue) !== '' && (
                    <span className="text-xs font-bold text-primary shrink-0">{fmtMarketValue(s.marketValue)}</span>
                  )}
                </div>
              ))}
              {hiddenCount > 0 && (
                <div className="flex items-center justify-center gap-2 border border-dashed border-border rounded-xl px-4 py-3 text-xs text-muted-foreground">
                  <Lock className="w-3.5 h-3.5" />
                  {hiddenCount} more {hiddenCount === 1 ? 'stint' : 'stints'} still hidden
                </div>
              )}
            </div>

            {activePhase === 'playing' && flagUnlocked && (
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-4">
                Nationality hint
                <span className="text-2xl leading-none">{flagForNationality(activePlayer.nationality)}</span>
              </div>
            )}

            {activePhase === 'playing' && (
              <div className="space-y-2">
                <form onSubmit={handleSubmit} className="relative">
                  <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Who is it? Type at least 2 letters..."
                    className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  {suggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 rounded-xl border border-border bg-card shadow-lg z-20 max-h-48 overflow-y-auto">
                      {suggestions.map(name => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => handleGuess(name)}
                          className="w-full text-left px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors border-b border-border last:border-0"
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  )}
                </form>
                <p className="text-[10px] text-center text-muted-foreground">
                  Pick a name from the list to lock in a guess. Wrong guesses cost {WRONG_GUESS_PENALTY} pts and reveal the next stint.
                </p>
                {activeWrongGuesses.length > 0 && (
                  <p className="text-xs text-destructive text-center">
                    Not {activeWrongGuesses.join(', not ')}
                  </p>
                )}
                <button
                  onClick={revealNext}
                  disabled={activeRevealed >= total}
                  className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-secondary text-foreground text-xs font-semibold hover:bg-secondary/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronDown className="w-4 h-4" />
                  {activeRevealed >= total
                    ? 'The whole career is on the board'
                    : nextRevealCost > 0
                      ? `Reveal next stint · costs ${nextRevealCost} pts`
                      : `Reveal next stint · you're already at the ${SCORE_FLOOR}-pt floor`}
                </button>
                <div className="flex justify-center pt-1">
                  <GiveUpButton onGiveUp={giveUp} />
                </div>
              </div>
            )}

            {ended && (
              <div className="mt-2">
                <ResultScreen
                  won={activePhase === 'won'}
                  outcomeEmoji={activePhase === 'won' ? '🪜' : '🙈'}
                  headline={activePhase === 'won' ? 'You know ball' : 'Out of guesses'}
                  statLine={
                    activePhase === 'won' ? (
                      <>
                        Named after {cluesUsed} {cluesUsed === 1 ? 'clue' : 'clues'} and{' '}
                        {activeWrongGuesses.length} wrong {activeWrongGuesses.length === 1 ? 'guess' : 'guesses'}.{' '}
                        <span className="text-primary font-bold">{activeFinalScore} pts</span>
                      </>
                    ) : (
                      'The full ladder is above. It happens to the best of us.'
                    )
                  }
                  emojiGrid={emojiGrid}
                  share={{
                    score: activePhase === 'won' ? `${activeFinalScore} pts` : '0 pts',
                    gameName: 'Career Ladder',
                    gamePath: '/career-ladder',
                  }}
                  onPlayAgain={mode === 'unlimited' ? () => startRound(pool, usedIds) : undefined}
                  playAgainLabel="Next player"
                  playNext={mode === 'daily' ? 'Come back tomorrow for a new ladder!' : undefined}
                >
                  <div className="bg-secondary rounded-xl px-4 py-3 inline-flex items-center gap-3 mb-3">
                    <span className="text-3xl">{flagForNationality(activePlayer.nationality)}</span>
                    <span className="text-left">
                      <span className="block font-bold text-foreground">{activePlayer.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {activePlayer.position} · {activePlayer.nationality} · {total} stints
                      </span>
                    </span>
                  </div>
                </ResultScreen>
              </div>
            )}
          </>
        )}

        <AdBanner slot="1234567890" format="horizontal" className="mt-8" />

        <div className="flex justify-center mt-6">
          <ReportQuestion
            gameType="career-ladder"
            gameContext={activePlayer ? { playerId: activePlayer.id, playerName: activePlayer.name } : {}}
          />
        </div>

        <GameSeoContent
          title="Career Ladder: Guess the Footballer from Their Career"
          description="Every round hides a real footballer behind their career ladder. You start with a single early stint, just a club, a season and a stat line, and work out who climbed it. The fewer clues you need, the bigger your score."
          howToPlay={[
            'Play Daily for one shared ladder per day, or Unlimited for endless rounds.',
            'A mystery player starts with only their earliest career stint showing.',
            'Type at least 2 letters and pick a name from the list. You get 6 guesses.',
            'Every wrong guess reveals the next stint. You can also reveal one on purpose.',
            'A nationality flag hint appears once half the career is on the board.',
            'Start from 1000 points. Extra stints cost 150, wrong guesses cost 100, and the floor is 100.',
          ]}
          examples={[
            'A teenager scoring at Palmeiras before a move to Madrid narrows things down fast.',
            'Six straight seasons at Ajax and then Chelsea? That is basically a signed confession.',
          ]}
        />
        <GameNav />
      </GameShell>
    </>
  );
};

export default CareerLadder;
