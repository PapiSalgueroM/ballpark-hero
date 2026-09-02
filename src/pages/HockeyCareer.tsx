import { TextWithFlags } from '@/components/FlagImg';
import { useState, useEffect } from 'react';
import { FlagImg } from '@/components/FlagImg';
import { useHockeyCareer } from '@/hooks/useHockeyCareer';
import { GameNav } from '@/components/game/GameNav';
import { GiveUpButton } from '@/components/game/GiveUpButton';
import { GameShell } from '@/components/game/GameShell';
import { ResultScreen } from '@/components/game/ResultScreen';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { HelpCircle, Eye, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HockeyCareerHowToPlay } from '@/components/hockey-career/HockeyCareerHowToPlay';
import { Skeleton } from '@/components/ui/skeleton';

const HockeyCareer = () => {
  const {
    mode, switchMode,
    puzzle, player, clueLevel, visibleClues, status, score,
    guessInput, setGuessInput, submitGuess, revealNextClue, giveUp, resetGame, wrongGuess, maxClue,
    isLoading, playerNames,
    hard, toggleHard,
  } = useHockeyCareer();

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
    const seen = localStorage.getItem('hkc-rules-seen');
    if (!seen) { setShowRules(true); localStorage.setItem('hkc-rules-seen', '1'); }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (guessInput.trim()) submitGuess(guessInput);
  };

  return (
    <>
      <PageSeo
        title="Hockey Career Path - Guess the NHL Player | DoUKnowBall"
        description="Progressive clues reveal a mystery hockey player. Guess from position, draft, teams, and stats. Daily challenge."
        path="/hockey-career"
      />
      <GameShell help="none"
        width="narrow"
        title="🏒 CAREER PATH"
        subtitle="Guess the mystery hockey player from progressive clues"
        headerExtra={
          <>
            <button onClick={() => setShowRules(true)} className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs text-muted-foreground hover:text-[hsl(var(--hk-silver))] transition-colors" aria-label="How to play">
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
            <button
              onClick={toggleHard}
              title="Hard mode: the easiest clues stay hidden"
              className={cn('mt-2 mx-auto block text-xs px-3 py-2 rounded-full border transition-all',
                hard ? 'border-destructive text-destructive bg-destructive/10 font-semibold' : 'border-border text-muted-foreground hover:text-foreground'
              )}
            >😈 Hard mode: {hard ? 'ON' : 'off'}</button>
          </>
        }
      >
        {isLoading ? (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-lg space-y-3" aria-live="polite" aria-busy="true">
            <span className="sr-only">Loading today's puzzle…</span>
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-3/4 rounded-xl" />
          </div>
        ) : (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
          {status === 'playing' && (
            <div className="text-center mb-4">
              <span className="text-sm text-muted-foreground">Current score if correct: </span>
              <span className="font-bold text-[hsl(var(--hk-silver))]">
                {1000 - clueLevel * 150 > 100 ? 1000 - clueLevel * 150 : 100} pts
              </span>
            </div>
          )}

          <div className="space-y-3 mb-6">
            {visibleClues.map((clue) => (
              <div key={clue.label} className="flex items-start gap-3 px-4 py-3 rounded-xl bg-[hsl(var(--hk-blue)/0.2)] border border-[hsl(var(--hk-blue)/0.3)] animate-cell-reveal">
                <span className="text-xs font-bold text-[hsl(var(--hk-silver))] uppercase w-24 shrink-0 pt-0.5">{clue.label}</span>
                <span className="font-semibold text-foreground text-sm"><TextWithFlags text={clue.value} size={16} /></span>
              </div>
            ))}
          </div>

          {status === 'playing' && clueLevel < maxClue && (
            <div className="flex items-center justify-center gap-3 mb-4">
              <button onClick={revealNextClue} className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-[hsl(var(--hk-silver)/0.3)] text-[hsl(var(--hk-silver))] hover:bg-[hsl(var(--hk-blue)/0.3)] transition-colors">
                <Eye className="w-4 h-4" /> Reveal Next Clue (−150 pts)
              </button>
              <GiveUpButton onGiveUp={giveUp} />
            </div>
          )}

          {status === 'playing' && (
            <div className="relative">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text" value={guessInput} onChange={(e) => setGuessInput(e.target.value)}
                placeholder="Type player name..."
                aria-label="Guess the player"
                className={cn(
                  'flex-1 min-w-0 px-4 py-3 rounded-xl bg-secondary border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all',
                  wrongGuess ? 'border-destructive ring-destructive/30' : 'border-border focus:ring-[hsl(var(--hk-silver)/0.4)]'
                )}
              />
              <button type="submit" disabled={!guessInput.trim()} className="px-6 py-3 rounded-xl bg-[hsl(var(--hk-blue))] text-[hsl(var(--hk-silver))] font-bold hover:opacity-90 transition-opacity disabled:opacity-40 border border-[hsl(var(--hk-silver)/0.2)]">
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
          {wrongGuess && <p className="text-destructive text-sm text-center mt-2 animate-cell-reveal">Wrong guess. Try again!</p>}
        </div>
        )}

        {(status === 'guessed' || status === 'revealed') && (
          <div className="mt-6 flex justify-center">
            <ResultScreen
              won={status === 'guessed'}
              outcomeEmoji={status === 'guessed' ? '🏒' : '😤'}
              headline={player!.name}
              statLine={<span className="inline-flex items-center gap-1"><FlagImg name={player!.country} size={16} /> {player!.position}</span>}
              funFact={
                <>
                  💡 Did you know? {player!.name} ({player!.country}) played for {player!.teams.length} {player!.teams.length === 1 ? 'club' : 'clubs'}{player!.awards.length ? ` and earned ${player!.awards.length} career ${player!.awards.length === 1 ? 'honor' : 'honors'}` : ''}.
                </>
              }
              statRow={status === 'guessed' ? [{ label: 'Score', value: <span className="inline-flex items-center gap-1"><Trophy className="w-4 h-4" />{score}</span> }] : undefined}
              emojiGrid={status === 'guessed' ? `${score} points on today's Hockey Career Path` : `today's Hockey Career Path (gave up)`}
              share={{
                score: status === 'guessed' ? `${score} points on today's Hockey Career Path` : `today's Hockey Career Path (gave up)`,
                gameName: 'Hockey Career Path',
                gamePath: '/hockey-career',
              }}
              onPlayAgain={mode === 'unlimited' ? resetGame : undefined}
              playNext={mode === 'daily' ? <p className="text-sm text-muted-foreground">Come back tomorrow for a new puzzle!</p> : undefined}
            />
          </div>
        )}

        <GameSeoContent
          pageHasOwnH1
          title="Hockey Career Path | DoUKnowBall"
          description="A daily game where you guess a mystery hockey player from progressive clues: position, country, draft, teams, stats, and awards."
          howToPlay={[
            'Clues revealed: position, country, draft, teams, stats, awards',
            'Guess at any point. Earlier guesses earn more points (max 1000)',
            'Each clue costs 150 points',
            'New player every day. Share your score!',
          ]}
          examples={[
            "Wayne Gretzky: Oilers → Kings → Blues → Rangers, C, 2,857 points",
            "Sidney Crosby: Penguins, C, 3× Stanley Cup, 2× MVP",
            "Alexander Ovechkin: Capitals, LW, 800+ goals, Hart Trophy",
            "Connor McDavid: Oilers, C, 4× Art Ross, 3× Hart Trophy",
            "Mario Lemieux: Penguins, C, 2× Stanley Cup, 690 goals",
            "Patrick Roy: Canadiens → Avalanche, G, 4× Stanley Cup"
          ]}
        />

        <AdBanner slot="7540487748" format="horizontal" className="mt-8" />
        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="hockey-career" gameContext={{ puzzleId: puzzle.id }} />
        </div>
        <GameNav />
      </GameShell>
      <HockeyCareerHowToPlay open={showRules} onOpenChange={setShowRules} />
    </>
  );
};

export default HockeyCareer;