import { useState, useEffect, useMemo } from 'react';
import { useGame } from '@/hooks/useGame';
import type { GuessResult } from '@/types/game';
import { PlayerSearch } from '@/components/game/PlayerSearch';
import { GameBoard } from '@/components/game/GameBoard';
import { GameShell } from '@/components/game/GameShell';
import { ResultScreen } from '@/components/game/ResultScreen';
import { HowToPlayPopover } from '@/components/game/HowToPlayPopover';
import { StatTile } from '@/components/game/StatTile';
import { cn } from '@/lib/utils';
import { GameNav } from '@/components/game/GameNav';
import { GiveUpButton } from '@/components/game/GiveUpButton';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PostGameStats from '@/components/game/PostGameStats';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';

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
  } = useGame();

  const [showRules, setShowRules] = useState(false);

  // Show rules on first visit
  useEffect(() => {
    const seen = localStorage.getItem('footle-rules-seen');
    if (!seen) {
      setShowRules(true);
      localStorage.setItem('footle-rules-seen', '1');
    }
  }, []);

  // ---- Attribute-tile supplementary layer (R6 Wave 14 / Part 1 item 4) -----
  // Footle's GameBoard already renders a full per-guess attribute-tile row
  // (nationality/club/goals/assists/position/kitNumber/age/marketValue), so
  // that row already is the "attribute-tile hybrid guesser" pattern the R6
  // spec describes. This block adds a genuinely separate, non-duplicative
  // supplementary signal on top of it: a compact "Best Guess So Far" strip
  // that surfaces the single closest prior guess (by count of correct/close
  // cells) so players get an at-a-glance read without rescanning the whole
  // board. Purely derived from existing guesses state; does not touch
  // useGame.ts, compareGuess, GameBoard, scoring, or the share grid.
  const bestGuess = useMemo(() => {
    if (guesses.length === 0) return null;
    let best = guesses[0];
    let bestScore = -1;
    for (const g of guesses) {
      const cellScore = FOOTLE_CELL_ORDER.reduce((sum, key) => {
        const status = g.cells[key].status;
        return sum + (status === 'correct' ? 2 : status === 'close' ? 1 : 0);
      }, 0);
      if (cellScore > bestScore) {
        bestScore = cellScore;
        best = g;
      }
    }
    return best;
  }, [guesses]);

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
      <GameShell
        width="wide"
        title="FOOTLE"
        subtitle="Guess the soccer player in 8 tries. One of 10+ free sports trivia games across soccer, NBA and UFC. No login. No tracking. Just play."
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
                      <span className="font-semibold text-correct-foreground">Green</span>
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
                <h3 className="font-bold text-foreground mb-2">⚙️ Difficulty Modes</h3>
                <ul className="space-y-1.5 text-muted-foreground">
                  <li><span className="text-foreground font-semibold">Easy:</span> The world's most famous stars &amp; legends</li>
                  <li><span className="text-foreground font-semibold">Hard:</span> Squad &amp; rotation names from big clubs</li>
                  <li><span className="text-foreground font-semibold">Insane:</span> Genuinely obscure pros: second divisions, smaller leagues, deep squads</li>
                </ul>
              </section>
            </HowToPlayPopover>

            {/* Daily / Unlimited toggle */}
            <div className="flex items-center justify-center gap-1 mt-6 bg-secondary rounded-full p-1 w-fit mx-auto">
              {(['daily', 'unlimited'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => switchMode(m)}
                  className={cn(
                    'px-5 py-2 rounded-full text-sm font-semibold transition-all',
                    mode === m
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {m === 'daily' ? '📅 Daily' : '∞ Unlimited'}
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
            {mode === 'unlimited' && (
              <div className="flex items-center justify-center gap-2 mt-3">
                {(['easy', 'hard', 'insane'] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => changeDifficulty(d)}
                    className={cn(
                      'px-6 py-2 rounded-full text-sm font-semibold transition-all capitalize',
                      difficulty === d
                        ? d === 'easy'
                          ? 'bg-correct text-correct-foreground'
                          : d === 'hard'
                            ? 'bg-yellow-500 text-white'
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
            <p className="text-sm text-muted-foreground mt-4">
              Guesses:{' '}
              <span className="text-foreground font-semibold">
                {guesses.length}
              </span>{' '}
              / {maxGuesses}
            </p>
          </>
        }
      >
        {/* Search */}
        {(isLoadingPool || isLoading) ? (
          <div className="mb-8 flex justify-center">
            <p className="text-muted-foreground text-sm animate-pulse">Loading today's puzzle…</p>
          </div>
        ) : gameStatus === 'playing' ? (
          <div className="mb-8 space-y-3">
            <PlayerSearch
              players={availablePlayers}
              guessedNames={guessedPlayerNames}
              onSelect={makeGuess}
            />
            <div className="flex justify-center">
              <GiveUpButton onGiveUp={giveUp} />
            </div>
          </div>
        ) : null}

        {/* Best Guess So Far: supplementary attribute-tile summary, additive
            only, shown once there are at least 2 guesses to compare. */}
        {gameStatus === 'playing' && bestGuess && guesses.length > 1 && (
          <div className="mb-8">
            <p className="text-xs text-center text-muted-foreground uppercase tracking-wider mb-2">
              🔥 Best Guess So Far: <span className="text-foreground font-semibold">{bestGuess.playerName}</span>
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {FOOTLE_CELL_ORDER.map((key) => (
                <StatTile
                  key={key}
                  label={FOOTLE_CELL_LABELS[key]}
                  value={bestGuess.cells[key].value}
                  state={bestGuess.cells[key].status}
                  direction={bestGuess.cells[key].arrow ?? null}
                  className="min-w-[80px]"
                />
              ))}
            </div>
          </div>
        )}

        {/* Game Board */}
        <GameBoard guesses={guesses} maxGuesses={maxGuesses} />

        {/* Game Over */}
        {gameStatus !== 'playing' && (
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
                  ? `💡 Did you know? ${targetPlayer.name} plays as a ${targetPlayer.position} and is valued at €${targetPlayer.marketValue}M.`
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
                  ? <p className="text-sm text-muted-foreground">Come back tomorrow for a new puzzle!</p>
                  : undefined
              }
            >
              <PostGameStats
                gameSlug="footle"
                userScore={gameStatus === 'won' ? Math.max(0, 1000 - (guesses.length - 1) * 125) : 0}
                isVisible={true}
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
        <AdBanner slot="1234567890" format="horizontal" className="mt-8" />

        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="footle" gameContext={{ targetPlayer: targetPlayer?.name, difficulty }} />
        </div>

        {/* Game Navigation */}
        <GameSeoContent
          title="Footle: Soccer Player Guessing Game"
          description="Guess the mystery soccer player in 8 tries. Each guess reveals clues about the player's club, league, nationality, position, and age. One of 100+ free sports games on DoUKnowBall."
          howToPlay={[
            "Type a soccer player's name and submit your guess. You get 8 attempts.",
            "After each guess, colored tiles show how close you are: green means correct, yellow means close.",
            "Use the clues to narrow down the mystery player. A new puzzle is available every day."
          ]}
          examples={[
            "Lionel Messi: Inter Miami, MLS, Argentina, Forward",
            "Erling Haaland: Manchester City, Premier League, Norway, Forward",
            "Jude Bellingham: Real Madrid, La Liga, England, Midfielder",
            "Kylian Mbappé: Real Madrid, La Liga, France, Forward",
            "Bukayo Saka: Arsenal, Premier League, England, Winger",
            "Vinícius Júnior: Real Madrid, La Liga, Brazil, Forward",
            "Pedri: Barcelona, La Liga, Spain, Midfielder",
            "Florian Wirtz: Bayer Leverkusen, Bundesliga, Germany, Midfielder"
          ]}
        />
        <GameNav />
      </GameShell>
    </>
  );
};

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

const FOOTLE_CELL_LABELS: Record<typeof FOOTLE_CELL_ORDER[number], string> = {
  nationality: 'Nation',
  club: 'Club',
  goals: 'Goals',
  assists: 'Assists',
  position: 'Position',
  kitNumber: 'Kit #',
  age: 'Age',
  marketValue: 'Value',
};

export default Index;
