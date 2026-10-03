import { useState, useEffect, useMemo, useRef } from 'react';
import { useGame, footleScore, FOOTLE_SCORE_BUCKETS } from '@/hooks/useGame';
import type { GuessResult, Player } from '@/types/game';
import { PlayerSearch } from '@/components/game/PlayerSearch';
import FootleClueDesk from '@/components/footle/FootleClueDesk';
import { GameShell } from '@/components/game/GameShell';
import { ResultScreen } from '@/components/game/ResultScreen';
import { HowToPlayPopover } from '@/components/game/HowToPlayPopover';
import { compareGuess } from '@/lib/gameLogic';
import { useRevealScroll } from '@/hooks/useRevealScroll';
import { cn } from '@/lib/utils';
import { GameNav } from '@/components/game/GameNav';
import { GiveUpButton } from '@/components/game/GiveUpButton';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PostGameStats from '@/components/game/PostGameStats';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { fmtCompactUsd } from '@/lib/dealPlayers';

const Index = () => {
  const {
    mode,
    switchMode,
    dailyTier,
    difficulty,
    changeDifficulty,
    guesses,
    gameStatus,
    makeGuess,
    giveUp,
    resetGame,
    availablePlayers,
    guessedPlayerNames,
    maxGuesses,
    targetPlayer,
    isLoading,
    isLoadingPool,
    practiceRun,
    practiceSaveFailed,
    practiceComplete,
    practiceReady,
    startPractice,
    advancePractice,
    examplePlayer,
  } = useGame();

  const [showRules, setShowRules] = useState(false);
  const [reviewRound, setReviewRound] = useState<number | null>(null);
  const [returnSerial, setReturnSerial] = useState(0);
  const reviewOpener = useRef<HTMLButtonElement | null>(null);
  const inPractice = mode === 'practice';
  const practicePlaying = inPractice && !!practiceRun && !practiceComplete;
  const searchArea = useRevealScroll<HTMLDivElement>(returnSerial);
  const practicePanel = useRevealScroll<HTMLElement>(`${inPractice}:${practiceRun?.index}:${gameStatus}`, { enabled: inPractice && !showRules, skipFirst: false });
  const reviewGuesses = useMemo(() => {
    if (!practiceComplete || !practiceRun || reviewRound === null) return [];
    const answer = practiceRun.pool.find(player => player.name === practiceRun.targets[reviewRound])!;
    return practiceRun.rounds[reviewRound].guesses.map(name => compareGuess(practiceRun.pool.find(player => player.name === name)!, answer));
  }, [practiceComplete, practiceRun, reviewRound]);
  useEffect(() => { setReviewRound(null); }, [mode, practiceRun?.targets]);
  const returnToSearch = () => {
    searchArea.current?.querySelector<HTMLInputElement>('input[role="combobox"]')?.focus({ preventScroll: true });
    setReturnSerial(value => value + 1);
  };
  useEffect(() => {
    if (inPractice) practicePanel.current?.focus({ preventScroll: true });
  }, [inPractice, practiceRun?.index, gameStatus]);

  // Show rules on first visit
  useEffect(() => {
    const seen = localStorage.getItem('footle-rules-seen');
    if (!seen) {
      setShowRules(true);
      localStorage.setItem('footle-rules-seen', '1');
    }
  }, []);

  // ---- Unlimited tier purity (owner: "I put unlimited mode on insane and I
  // just got Messi") -----------------------------------------------------------
  // useGame's buildPool() is cumulative for target selection (hard = easy+hard,
  // insane = the whole pool), so the hook can roll a superstar as the insane
  // answer. The GUESSABLE list should stay cumulative (probing with stars is
  // legitimate), but the TARGET must come from the selected tier only. useGame
  // is out of scope for this fix, so a fresh unlimited round (no guesses yet)
  // re-rolls until the target's own tier matches the selected difficulty. With
  // the new pool (~80 easy / ~220 hard / ~1,000 insane) this converges in 1-2
  // rolls; the some() guard prevents a re-roll loop if a tier is absent (e.g.
  // the obscure batch failed and the pool has no insane players).
  useEffect(() => {
    if (mode !== 'unlimited' || gameStatus !== 'playing' || isLoadingPool) return;
    if (guesses.length > 0 || !targetPlayer) return;
    if (targetPlayer.difficulty === difficulty) return;
    if (!availablePlayers.some(p => p.difficulty === difficulty)) return;
    resetGame();
  }, [mode, gameStatus, isLoadingPool, guesses.length, targetPlayer, difficulty, availablePlayers, resetGame]);

  return (
    <>
      <PageSeo
        title="Footle - Daily Soccer Player Guessing Game | DoUKnowBall"
        description="Guess the mystery soccer player in 8 tries. New player every day. Free daily football puzzle game."
        path="/footle"
      />
      <GameShell help="none"
        width="wide"
        title="FOOTLE"
        subtitle="Guess the soccer player in 8 tries. Each guess gives you club, nationality and stat clues."
        headerExtra={
          <>
            <HowToPlayPopover title="How to Play Footle" open={showRules} onOpenChange={setShowRules}>
              <p className="text-muted-foreground text-center">
                Guess the mystery soccer player in 8 tries!
              </p>

              <section>
                <h3 className="font-bold text-foreground mb-2">🎨 Color Guide</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-correct flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-correct">Green</span>
                      <span className="text-muted-foreground">: Exact match!</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-close flex-shrink-0" />
                    <div>
                      <span className="font-semibold">Yellow</span>
                      <span className="text-muted-foreground">: Close, see thresholds below.</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-incorrect flex-shrink-0" />
                    <div>
                      <span className="font-semibold">White</span>
                      <span className="text-muted-foreground">: Not a match.</span>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="font-bold text-foreground mb-2">📏 "Close" Thresholds</h3>
                <ul className="space-y-1.5 text-muted-foreground">
                  <li>🌍 <span className="text-foreground">Nationality:</span> Same continent</li>
                  <li>🏟️ <span className="text-foreground">Club:</span> Same league = yellow</li>
                  <li>⚽ <span className="text-foreground">Goals:</span> Within 3</li>
                  <li>👟 <span className="text-foreground">Assists:</span> Within 3</li>
                  <li>📍 <span className="text-foreground">Position:</span> Same group (Def/Mid/Fwd)</li>
                  <li>👕 <span className="text-foreground">Kit Number:</span> Within 3</li>
                  <li>📅 <span className="text-foreground">Age:</span> Within 2 years</li>
                  <li>💰 <span className="text-foreground">Market Value:</span> Within $5M</li>
                </ul>
              </section>

              <section>
                <h3 className="font-bold text-foreground mb-2">🔼 Arrow Hints</h3>
                <p className="text-muted-foreground">
                  ▲ means the answer is <span className="text-foreground font-semibold">higher</span>, ▼ means it's <span className="text-foreground font-semibold">lower</span>.
                </p>
              </section>

              <section>
                <h3 className="font-bold text-foreground mb-2">Your clue desk</h3>
                <p className="text-muted-foreground">Each guess opens eight cards. Read the value, comparison and higher or lower direction. The numbered history buttons revisit your earlier guesses. Back to search returns you to your next pick.</p>
                <p className="text-muted-foreground mt-2">When a five-puzzle run ends, choose a puzzle to review the guesses you actually made. Reviews use that run's saved clues and never change your score.</p>
              </section>

              <section>
                <h3 className="font-bold text-foreground mb-2">Try a five-puzzle run</h3>
                <p className="text-muted-foreground">Pick a difficulty and solve five different players. You get eight guesses per player. Give up reveals that answer and counts as a miss. Finish all five for your run receipt. Practice never changes your daily score.</p>
                <p className="text-muted-foreground mt-2">Worked example: if your guess has 10 goals and the answer has 12, the goals tile is yellow with an up arrow. These example numbers are hypothetical.</p>
                {examplePlayer && <p className="text-muted-foreground mt-2">From this puzzle pool: {examplePlayer.name} is listed with {examplePlayer.club}, {examplePlayer.nationality}, position {examplePlayer.position}.</p>}
                <p className="text-muted-foreground mt-2">Stats and values use the puzzle data snapshot, not live totals. A question mark or unknown comparison means a clue is unavailable. Different clubs with an unknown league cannot be compared by league.</p>
              </section>

              <section>
                <h3 className="font-bold text-foreground mb-2">⚙️ Difficulty Modes</h3>
                <ul className="space-y-1.5 text-muted-foreground">
                  {/* ROUND 381: this said "the world's most famous stars", and
                      the rule is the 80 most VALUABLE players plus a list of
                      all time greats. Value at 18 is priced potential, not
                      fame: 12 of the current 80 are 21 or younger and the
                      youngest is 17, which is what a player meant by reporting
                      that an easy answer was "not a player like current". The
                      promise is corrected rather than the pool, because
                      changing the pool size moves the daily answer under
                      anyone mid puzzle. */}
                  <li><span className="text-foreground font-semibold">Easy:</span> The 80 most valuable players in the world right now, plus the all-time greats</li>
                  <li><span className="text-foreground font-semibold">Hard:</span> Squad &amp; rotation names from big clubs</li>
                  <li><span className="text-foreground font-semibold">Insane:</span> Genuinely obscure pros: second divisions, smaller leagues, deep squads</li>
                </ul>
              </section>
            </HowToPlayPopover>

            {/* Daily / Unlimited toggle */}
            <div className="flex flex-wrap items-center justify-center gap-1 mt-6 bg-secondary rounded-2xl p-1 w-fit max-w-full mx-auto">
              {(['daily', 'unlimited', 'practice'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => switchMode(m)}
                  aria-pressed={mode === m}
                  data-footle-mode={m}
                  className={cn(
                    'px-4 py-2 min-h-[44px] rounded-xl text-sm font-semibold transition-all',
                    mode === m
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {m === 'daily' ? '📅 Daily' : m === 'unlimited' ? '∞ Unlimited' : 'Five-puzzle run'}
                </button>
              ))}
            </div>

            {/* Daily tier banner: visible before first guess and throughout */}
            {mode === 'daily' && (
              <div className={cn(
                'inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold mt-3',
                dailyTier === 'easy' && 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
                dailyTier === 'hard' && 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
                dailyTier === 'insane' && 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
              )}>
                Today's Daily: {dailyTier.toUpperCase()} MODE
              </div>
            )}

            {/* Difficulty selector: unlimited mode only */}
            {(mode === 'unlimited' || (inPractice && (!practiceRun || practiceComplete))) && (
              <div className="flex items-center justify-center gap-2 mt-3">
                {(['easy', 'hard', 'insane'] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => changeDifficulty(d)}
                    aria-pressed={difficulty === d}
                    disabled={isLoadingPool}
                    className={cn(
                      'px-5 py-2 min-h-[44px] rounded-full text-sm font-semibold transition-all capitalize disabled:opacity-50',
                      difficulty === d
                        ? d === 'easy'
                          ? 'bg-correct text-correct-foreground'
                          : d === 'hard'
                            ? 'bg-yellow-500 text-black'
                            : 'bg-destructive text-destructive-foreground'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}

            {/* Guess Counter */}
            {(!inPractice || practicePlaying) && <p className="text-sm text-muted-foreground mt-4">
              Guesses:{' '}
              <span className="text-foreground font-semibold">
                {guesses.length}
              </span>{' '}
              / {maxGuesses}
            </p>}
          </>
        }
      >
        {inPractice && (
          <section ref={practicePanel} tabIndex={-1} aria-label="Five-puzzle run" data-footle-practice="" data-testid="footle-practice" data-practice-index={practiceRun?.index ?? -1} className="mb-6 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-4 sm:p-6 outline-none focus-visible:ring-2 focus-visible:ring-primary">
            {!practiceRun ? (
              <>
                <h2 className="font-display text-2xl sm:text-3xl text-foreground">Five players. One run.</h2>
                <p className="mt-2 text-sm text-muted-foreground">Eight guesses each. Five different answers. See how many you can solve.</p>
                <div className="mt-4 grid grid-cols-5 gap-2" aria-hidden="true">
                  {[1, 2, 3, 4, 5].map(number => <div key={number} className="rounded-xl border border-primary/20 bg-background/60 py-3 text-center font-display text-xl text-primary">{number}</div>)}
                </div>
                <p className="mt-4 text-sm text-muted-foreground">Pick your difficulty above. Your run saves on this device. The daily answer is left out.</p>
                <button data-testid="practice-start" onClick={startPractice} disabled={!practiceReady} className="mt-4 w-full min-h-[44px] rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-50">Start run</button>
                {!isLoadingPool && !practiceReady && <p role="status" className="mt-2 text-sm text-muted-foreground">This tier needs five available players. Try another difficulty.</p>}
              </>
            ) : practiceComplete ? (
              <div data-footle-practice-result="" data-testid="practice-receipt">
                <h2 className="font-display text-3xl text-foreground">Run complete</h2>
                <p className="mt-2 text-lg font-semibold text-primary">{practiceRun.rounds.filter(round => round.status === 'won').length} of 5 solved</p>
                <p className="text-sm text-muted-foreground">{practiceRun.rounds.reduce((total, round) => total + round.guesses.length, 0)} total guesses · {practiceRun.tier} · no daily points used</p>
                <button data-testid="practice-start" onClick={startPractice} disabled={!practiceReady} className="mt-4 w-full min-h-[44px] rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-50">Play another five</button>
                <div className="mt-4 grid grid-cols-5 gap-1" role="group" aria-label="Review completed puzzles">
                  {practiceRun.rounds.map((round, index) => <button key={index} aria-label={`Review puzzle ${index + 1}`} aria-pressed={reviewRound === index}
                    onClick={event => { reviewOpener.current = event.currentTarget; setReviewRound(index); }} className={cn('min-h-[44px] rounded-lg border px-1 py-2 text-xs font-semibold', reviewRound === index ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-foreground')}>
                    <span className="block">{index + 1}</span><span className="block text-[10px]">{round.status === 'won' ? 'Solved' : 'Missed'}</span>
                  </button>)}
                </div>
                {reviewRound !== null && <div className="mt-4" data-footle-review={reviewRound + 1}>
                  <p className="mb-3 min-w-0 break-words text-sm font-semibold">Puzzle {reviewRound + 1} · {practiceRun.targets[reviewRound]}</p>
                  <FootleClueDesk key={reviewRound} guesses={reviewGuesses} playing={false} reviewing helpOpen={showRules}
                    onReturn={() => { setReviewRound(null); reviewOpener.current?.focus({ preventScroll: true }); reviewOpener.current?.scrollIntoView({ block: 'nearest' }); }} />
                </div>}
                <details className="mt-3"><summary className="min-h-[44px] cursor-pointer py-3 text-sm font-semibold text-primary">All five player details</summary>
                <ol className="mt-4 grid gap-2 sm:grid-cols-2">
                  {practiceRun.rounds.map((round, index) => {
                    const answer = practiceRun.pool.find(player => player.name === practiceRun.targets[index])!;
                    return <li key={answer.name} className="min-w-0 rounded-xl border border-border bg-background/70 p-3">
                      <p className="text-xs font-semibold text-muted-foreground">Puzzle {index + 1} · {round.status === 'won' ? 'Solved' : 'Missed'} · {round.guesses.length} {round.guesses.length === 1 ? 'guess' : 'guesses'}</p>
                      <p className="mt-1 break-words font-semibold text-foreground">{answer.name}</p>
                      <p className="break-words text-xs text-muted-foreground">{answer.club} · {answer.position}</p>
                      <details className="mt-2"><summary className="min-h-[44px] cursor-pointer py-3 text-xs font-semibold text-primary">View player details</summary><PracticeAnswer player={answer} /></details>
                    </li>;
                  })}
                </ol>
                </details>
                <p className="mt-3 text-xs text-muted-foreground">Player details are from this run's saved puzzle snapshot.</p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-display text-2xl text-foreground" data-testid="practice-progress">Puzzle {practiceRun.index + 1} of 5</h2>
                  <span className="text-sm capitalize text-muted-foreground">{practiceRun.tier} · {practiceRun.rounds.filter(round => round.status === 'won').length} solved</span>
                </div>
                <ol className="mt-3 grid grid-cols-5 gap-2" aria-label="Run progress">
                  {practiceRun.rounds.map((round, index) => <li key={index} aria-current={index === practiceRun.index ? 'step' : undefined} className={cn('rounded-lg border py-2 text-center text-sm font-semibold', round.status === 'won' ? 'border-correct bg-correct/15 text-foreground' : round.status === 'lost' ? 'border-border bg-secondary text-muted-foreground' : index === practiceRun.index ? 'border-primary text-primary' : 'border-border text-muted-foreground')}><span aria-hidden="true">{round.status === 'won' ? '✓' : round.status === 'lost' ? '×' : index + 1}</span><span className="sr-only">Puzzle {index + 1}: {round.status === 'won' ? 'solved' : round.status === 'lost' ? 'missed' : index === practiceRun.index ? 'current' : 'up next'}</span></li>)}
                </ol>
                {gameStatus !== 'playing' && targetPlayer ? (
                  <div className="mt-4" data-testid="practice-feedback">
                    <p role="status" className="font-semibold text-foreground">{gameStatus === 'won' ? 'Solved!' : 'The answer was'} {targetPlayer.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{targetPlayer.club} · {targetPlayer.nationality} · {targetPlayer.position}</p>
                    <button data-testid="practice-next" onClick={advancePractice} className="mt-4 w-full min-h-[44px] rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground">Next puzzle</button>
                    <details className="mt-2"><summary className="min-h-[44px] cursor-pointer py-3 text-sm font-semibold text-primary">View player details</summary><PracticeAnswer player={targetPlayer} /></details>
                  </div>
                ) : <p className="mt-3 text-sm text-muted-foreground">Use the clues below. Every player in the saved pool is available to guess.</p>}
              </>
            )}
            {practiceSaveFailed && <p role="alert" className="mt-3 text-sm text-destructive">This device could not save your run. You can keep playing, but reloading may lose your progress.</p>}
          </section>
        )}
        {/* Search */}
        {(!inPractice && (isLoadingPool || isLoading)) ? (
          <div className="mb-8 flex justify-center">
            <p data-no-prerender className="text-muted-foreground text-sm animate-pulse">Loading today's puzzle…</p>
          </div>
        ) : gameStatus === 'playing' && (!inPractice || practicePlaying) ? (
          <div ref={searchArea} className="mb-5 space-y-3">
            <PlayerSearch
              players={availablePlayers}
              guessedNames={guessedPlayerNames}
              onSelect={makeGuess}
            />
            <div className={cn('flex justify-center', inPractice && '[&_button]:min-h-[44px]')}>
              <GiveUpButton onGiveUp={giveUp} className={inPractice ? 'min-h-[44px]' : undefined} />
            </div>
          </div>
        ) : null}

        {(!inPractice || practicePlaying) && <FootleClueDesk key={`${mode}:${targetPlayer?.name ?? ''}`}
          guesses={guesses} playing={gameStatus === 'playing'} helpOpen={showRules} onReturn={returnToSearch} />}

        {/* Game Over */}
        {!inPractice && gameStatus !== 'playing' && (
          <div className="mt-8 flex justify-center">
            <ResultScreen
              won={gameStatus === 'won'}
              outcomeEmoji={gameStatus === 'won' ? '🎉' : '😞'}
              headline={gameStatus === 'won' ? 'Correct!' : 'Game Over'}
              statLine={
                gameStatus === 'won' ? (
                  <>
                    You guessed{' '}
                    <span className="font-bold text-primary">{targetPlayer?.name}</span>{' '}
                    in {guesses.length} {guesses.length === 1 ? 'try' : 'tries'}!
                  </>
                ) : (
                  <>
                    The player was{' '}
                    <span className="font-bold text-primary">{targetPlayer?.name}</span>
                    <span className="block text-muted-foreground text-sm mt-1">
                      {targetPlayer?.club} · {targetPlayer?.league}
                    </span>
                  </>
                )
              }
              funFact={
                targetPlayer
                  ? `Puzzle snapshot: ${targetPlayer.name} is listed as a ${targetPlayer.position} and valued at ${fmtCompactUsd(targetPlayer.marketValue * 1_000_000)}.`
                  : undefined
              }
              emojiGrid={footleEmojiGrid(guesses, maxGuesses)}
              share={{
                score: gameStatus === 'won' ? `${guesses.length}/${maxGuesses} guesses` : `0/${maxGuesses}`,
                gameName: 'Footle',
                gamePath: '/footle',
              }}
              onPlayAgain={mode === 'unlimited' ? () => resetGame() : undefined}
              playNext={
                mode === 'daily'
                  ? <button onClick={() => switchMode('practice')} className="min-h-[44px] w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground">{practiceRun && !practiceComplete ? 'Resume five-puzzle run' : 'Play five more'}</button>
                  : undefined
              }
            >
              <PostGameStats
                gameSlug="footle"
                userScore={footleScore(gameStatus === 'won', guesses.length)}
                buckets={FOOTLE_SCORE_BUCKETS}
                isVisible={mode === 'daily'}
              />
            </ResultScreen>
          </div>
        )}

        {/* Legend */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-correct" />
            <span>Correct</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-close" />
            <span>Close</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-incorrect" />
            <span>Not a match</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>▲▼</span>
            <span>Higher / Lower hint</span>
          </div>
        </div>

        {/* Ad placement */}
        <AdBanner slot="7540487748" format="horizontal" className="mt-8" />

        <div className="flex justify-center mt-6">
          {/* Round 390: the mode and the tier that mode actually used. The old
              `difficulty` was the unlimited selector, which reads "easy" on
              every daily report ever filed. */}
          <ReportQuestion gameType="footle" gameContext={{ mode, tier: mode === 'daily' ? dailyTier : difficulty, targetPlayer: targetPlayer?.name }} />
        </div>

        {/* Game Navigation */}
        <GameSeoContent
          pageHasOwnH1
          title="Footle: Soccer Player Guessing Game"
          description="Guess the mystery soccer player in 8 tries. Each guess reveals clues about the player's club, league, nationality, position, and age. One of 100+ free sports games on DoUKnowBall."
          howToPlay={[
            "Type a soccer player's name and submit your guess. You get 8 attempts.",
            "After each guess, colored tiles show how close you are: green means correct, yellow means close.",
            "Use the clues to narrow down the mystery player. A new puzzle is available every day."
          ]}
          examples={examplePlayer ? [`${examplePlayer.name}: ${examplePlayer.club}, ${examplePlayer.league}, ${examplePlayer.nationality}, ${examplePlayer.position}. From this puzzle pool.`] : []}
        />
        <GameNav />
      </GameShell>
    </>
  );
};

function PracticeAnswer({ player }: { player: Player }) {
  const facts = [
    ['Club', player.club], ['League', player.league === 'Other' ? 'Unknown' : player.league],
    ['Nation', player.nationality], ['Position', player.position], ['Goals', player.goals ?? 'Unknown'],
    ['Assists', player.assists ?? 'Unknown'], ['Age', player.age], ['Kit #', player.kitNumber ?? 'Unknown'],
    ['Value', fmtCompactUsd(player.marketValue * 1_000_000)],
  ];
  return <><dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">{facts.map(([label, value]) => <div key={label} className="min-w-0 rounded-lg bg-background/70 p-2"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="break-words text-sm font-medium text-foreground">{value}</dd></div>)}</dl><p className="mt-2 text-xs text-muted-foreground">Puzzle snapshot, not live totals.</p></>;
}

/** Builds a shareable emoji grid from Footle's guess history: one row per
 *  guess, one colored square per revealed cell. Per R5 spec Problem 6, Footle
 *  previously sent no emojiGrid to ShareButtons/ResultScreen at all. */
function footleEmojiGrid(guesses: GuessResult[], maxGuesses: number): string {
  const resultTag = guesses.length > 0 && guesses[guesses.length - 1].isCorrect
    ? `${guesses.length}/${maxGuesses}`
    : `X/${maxGuesses}`;
  const rows = guesses.map(g =>
    FOOTLE_CELL_ORDER.map(key => {
      const status = g.cells[key].status;
      return status === 'correct' ? '🟩' : status === 'close' ? '🟨' : '⬜';
    }).join('')
  );
  return [`Footle ${resultTag}`, ...rows].join('\n');
}

const FOOTLE_CELL_ORDER = [
  'nationality', 'club', 'goals', 'assists', 'position', 'kitNumber', 'age', 'marketValue',
] as const;

export default Index;
