import { useState, useEffect } from 'react';
import { useBaseballCareer } from '@/hooks/useBaseballCareer';
import { GameNav } from '@/components/game/GameNav';
import { GameShell } from '@/components/game/GameShell';
import { ResultScreen } from '@/components/game/ResultScreen';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { HelpCircle, Eye, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BaseballCareerHowToPlay } from '@/components/baseball-career/BaseballCareerHowToPlay';
import { Skeleton } from '@/components/ui/skeleton';

const BaseballCareer = () => {
  const {
    mode,
    switchMode,
    puzzle,
    player,
    clueLevel,
    visibleClues,
    status,
    score,
    guessInput,
    setGuessInput,
    submitGuess,
    revealNextClue,
    giveUp,
    resetGame,
    wrongGuess,
    maxClue,
    isLoading,
    playerNames,
  } = useBaseballCareer();

  const [showRules, setShowRules] = useState(false);

  const suggestions =
    guessInput.trim().length >= 2
      ? playerNames
          .filter(
            (n) =>
              n.toLowerCase().includes(guessInput.trim().toLowerCase()) &&
              n.toLowerCase() !== guessInput.trim().toLowerCase(),
          )
          .slice(0, 8)
      : [];

  useEffect(() => {
    const seen = localStorage.getItem('bbc-rules-seen');
    if (!seen) {
      setShowRules(true);
      localStorage.setItem('bbc-rules-seen', '1');
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (guessInput.trim()) submitGuess(guessInput);
  };

  return (
    <>
      <PageSeo
        title="Baseball Career Path - Guess the MLB Player | DoUKnowBall"
        description="Progressive clues reveal a mystery baseball player. Guess from position, draft, teams, and stats. Daily challenge."
        path="/baseball-career"
      />
      <GameShell
        width="narrow"
        title="⚾ CAREER PATH"
        subtitle="Guess the mystery baseball player from progressive clues"
        headerExtra={
          <>
            <button
              onClick={() => setShowRules(true)}
              className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-[hsl(var(--bb-red))] transition-colors"
              aria-label="How to play"
            >
              <HelpCircle className="w-4 h-4" /> How to play
            </button>

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
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {m === 'daily' ? '📅 Daily' : '∞ Unlimited'}
                </button>
              ))}
            </div>
          </>
        }
      >
        {/* Clue card */}
        {isLoading ? (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-lg space-y-3" aria-live="polite" aria-busy="true">
            <span className="sr-only">Loading today's puzzle…</span>
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-3/4 rounded-xl" />
          </div>
        ) : (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
          {/* Score indicator */}
          {status === 'playing' && (
            <div className="text-center mb-4">
              <span className="text-sm text-muted-foreground">Current score if correct: </span>
              <span className="font-bold text-[hsl(var(--bb-red))]">
                {1000 - clueLevel * 150 > 0 ? 1000 - clueLevel * 150 : 0} pts
              </span>
            </div>
          )}

          {/* Revealed clues */}
          <div className="space-y-3 mb-6">
            {visibleClues.map((clue, i) => (
              <div
                key={clue.label}
                className="flex items-start gap-3 px-4 py-3 rounded-xl bg-[hsl(var(--bb-navy)/0.15)] border border-[hsl(var(--bb-navy)/0.2)] animate-cell-reveal"
              >
                <span className="text-xs font-bold text-[hsl(var(--bb-red))] uppercase w-24 shrink-0 pt-0.5">
                  {clue.label}
                </span>
                <span className="font-semibold text-foreground text-sm">{clue.value}</span>
              </div>
            ))}
          </div>

          {/* Reveal / Give Up buttons */}
          {status === 'playing' && clueLevel < maxClue && (
            <div className="flex items-center justify-center gap-3 mb-4">
              <button
                onClick={revealNextClue}
                className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-[hsl(var(--bb-red)/0.3)] text-[hsl(var(--bb-red))] hover:bg-[hsl(var(--bb-navy)/0.2)] transition-colors"
              >
                <Eye className="w-4 h-4" />
                Reveal Next Clue (−150 pts)
              </button>
              <button
                onClick={giveUp}
                className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors"
              >
                Give Up
              </button>
            </div>
          )}

          {/* Guess input */}
          {status === 'playing' && (
            <div className="relative">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={guessInput}
                onChange={(e) => setGuessInput(e.target.value)}
                placeholder="Type player name..."
                className={cn(
                  'flex-1 px-4 py-3 rounded-xl bg-secondary border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all',
                  wrongGuess
                    ? 'border-destructive ring-destructive/30'
                    : 'border-border focus:ring-[hsl(var(--bb-red)/0.4)]'
                )}
              />
              <button
                type="submit"
                disabled={!guessInput.trim()}
                className="px-6 py-3 rounded-xl bg-[hsl(var(--bb-red))] text-white font-bold hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                Guess
              </button>
            </form>
            {suggestions.length > 0 && (
              <div className="absolute z-20 left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden max-h-60 overflow-y-auto">
                {suggestions.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => submitGuess(name)}
                    className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
            </div>
          )}
          {wrongGuess && (
            <p className="text-destructive text-sm text-center mt-2 animate-cell-reveal">Wrong guess. Try again!</p>
          )}
        </div>
        )}

        {/* Result + share + replay */}
        {(status === 'guessed' || status === 'revealed') && (
          <div className="mt-6 flex justify-center">
            <ResultScreen
              won={status === 'guessed'}
              outcomeEmoji={status === 'guessed' ? '⚾' : '😤'}
              headline={player!.name}
              statLine={player!.position}
              funFact={
                <>
                  💡 Did you know? {player!.name} suited up for {player!.teams.length} {player!.teams.length === 1 ? 'team' : 'teams'}{player!.awards.length ? `, including ${player!.awards[0]}` : ''}.
                </>
              }
              statRow={status === 'guessed' ? [{ label: 'Score', value: <span className="inline-flex items-center gap-1"><Trophy className="w-4 h-4" />{score}</span> }] : undefined}
              emojiGrid={status === 'guessed' ? `${score} points on today's Baseball Career Path` : `today's Baseball Career Path (gave up)`}
              share={{
                score: status === 'guessed' ? `${score} points on today's Baseball Career Path` : `today's Baseball Career Path (gave up)`,
                gameName: 'Baseball Career Path',
                gamePath: '/baseball-career',
              }}
              onPlayAgain={mode === 'unlimited' ? resetGame : undefined}
              playNext={mode === 'daily' ? <p className="text-sm text-muted-foreground">Come back tomorrow for a new puzzle!</p> : undefined}
            />
          </div>
        )}

        <GameSeoContent
          title="Baseball Career Path | DoUKnowBall"
          description="A daily game where you guess a mystery baseball player from progressive clues: position, draft info, teams, stats, and awards."
          howToPlay={[
            'Clues are revealed one at a time: position, draft, first team, career teams, stats, and awards',
            'Guess the player at any point. Earlier guesses earn more points',
            'Maximum 1000 points (clue 1), decreasing by 150 per clue revealed',
            'New player every day. Share your score with friends',
          ]}
          examples={[
            "Mike Trout: Angels, CF, 3× MVP, 2012 Rookie of the Year",
            "Derek Jeter: Yankees, SS, 5× World Series Champion, 3,465 hits",
            "Ken Griffey Jr.: Mariners → Reds → White Sox → Mariners, CF, 630 HR",
            "Clayton Kershaw: Dodgers, LHP, 3× Cy Young, 2020 World Series",
            "Albert Pujols: Cardinals → Angels → Dodgers, 1B, 703 HR",
            "Shohei Ohtani: Angels → Dodgers, DH/P, 2× MVP"
          ]}
        />

        <AdBanner slot="1234567901" format="horizontal" className="mt-8" />

        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="baseball-career" gameContext={{ puzzleId: puzzle.id }} />
        </div>
        <GameNav />
      </GameShell>

      <BaseballCareerHowToPlay open={showRules} onOpenChange={setShowRules} />
    </>
  );
};

export default BaseballCareer;
