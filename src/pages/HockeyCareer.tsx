import { useState, useEffect } from 'react';
import { useHockeyCareer } from '@/hooks/useHockeyCareer';
import { GameNav } from '@/components/game/GameNav';
import { GameNavbar } from '@/components/game/GameNavbar';
import { Footer } from '@/components/game/Footer';
import ShareButtons from '@/components/game/ShareButtons';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { HelpCircle, Eye, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HockeyCareerHowToPlay } from '@/components/hockey-career/HockeyCareerHowToPlay';

const HockeyCareer = () => {
  const {
    puzzle, player, clueLevel, visibleClues, status, score,
    guessInput, setGuessInput, submitGuess, revealNextClue, giveUp, wrongGuess, maxClue,
  } = useHockeyCareer();

  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem('hkc-rules-seen');
    if (!seen) { setShowRules(true); localStorage.setItem('hkc-rules-seen', '1'); }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (guessInput.trim()) submitGuess(guessInput);
  };

  return (
    <main className="min-h-screen bg-background">
      <PageSeo
        title="Hockey Career Path – Guess the Player | DoUKnowBall"
        description="Progressive clues reveal a mystery hockey player. Guess from position, country, draft, teams, stats, and awards. Daily challenge."
        path="/hockey-career"
      />
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
        <header className="text-center mb-8 relative">
          <button onClick={() => setShowRules(true)} className="absolute top-0 right-0 p-2 text-muted-foreground hover:text-[hsl(var(--hk-silver))] transition-colors" aria-label="How to play">
            <HelpCircle className="w-6 h-6" />
          </button>
          <h1 className="text-3xl md:text-5xl font-bold tracking-[0.15em] font-display mb-1 text-[hsl(var(--hk-silver))]">
            🏒 CAREER PATH
          </h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-md mx-auto">
            Guess the mystery hockey player from progressive clues
          </p>
        </header>

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
                <span className="font-semibold text-foreground text-sm">{clue.value}</span>
              </div>
            ))}
          </div>

          {status === 'playing' && clueLevel < maxClue && (
            <div className="flex items-center justify-center gap-3 mb-4">
              <button onClick={revealNextClue} className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-[hsl(var(--hk-silver)/0.3)] text-[hsl(var(--hk-silver))] hover:bg-[hsl(var(--hk-blue)/0.3)] transition-colors">
                <Eye className="w-4 h-4" /> Reveal Next Clue (−150 pts)
              </button>
              <button onClick={giveUp} className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors">
                Give Up
              </button>
            </div>
          )}

          {status === 'playing' && (
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text" value={guessInput} onChange={(e) => setGuessInput(e.target.value)}
                placeholder="Type player name..."
                className={cn(
                  'flex-1 px-4 py-3 rounded-xl bg-secondary border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all',
                  wrongGuess ? 'border-destructive ring-destructive/30' : 'border-border focus:ring-[hsl(var(--hk-silver)/0.4)]'
                )}
              />
              <button type="submit" disabled={!guessInput.trim()} className="px-6 py-3 rounded-xl bg-[hsl(var(--hk-blue))] text-[hsl(var(--hk-silver))] font-bold hover:opacity-90 transition-opacity disabled:opacity-40 border border-[hsl(var(--hk-silver)/0.2)]">
                Guess
              </button>
            </form>
          )}
          {wrongGuess && <p className="text-destructive text-sm text-center mt-2 animate-cell-reveal">Wrong guess — try again!</p>}

          {(status === 'guessed' || status === 'revealed') && (
            <div className="text-center mt-4 py-4 rounded-xl bg-[hsl(var(--hk-blue)/0.3)] border border-[hsl(var(--hk-silver)/0.3)] animate-cell-reveal">
              <p className="text-4xl font-bold text-[hsl(var(--hk-silver))] font-display mb-1">{player.name}</p>
              <p className="text-muted-foreground text-sm">{player.countryFlag} {player.position}</p>
              {status === 'guessed' && (
                <div className="flex items-center justify-center gap-2 mt-3">
                  <Trophy className="w-5 h-5 text-[hsl(var(--hk-silver))]" />
                  <span className="text-lg font-bold text-[hsl(var(--hk-silver))]">{score} points!</span>
                </div>
              )}
              {status === 'revealed' && <p className="text-muted-foreground text-sm mt-2">Better luck tomorrow!</p>}
            </div>
          )}
        </div>

        {(status === 'guessed' || status === 'revealed') && (
          <div className="mt-6 flex justify-center">
            <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full text-center shadow-lg">
              <ShareButtons
                score={status === 'guessed' ? `${score} points on today's Hockey Career Path` : `today's Hockey Career Path (gave up)`}
                gameName="Hockey Career Path"
                gamePath="/hockey-career"
              />
            </div>
          </div>
        )}

        <GameSeoContent
          title="Hockey Career Path | DoUKnowBall"
          description="A daily game where you guess a mystery hockey player from progressive clues — position, country, draft, teams, stats, and awards."
          howToPlay={[
            'Clues revealed: position, country, draft, teams, stats, awards',
            'Guess at any point — earlier guesses earn more points (max 1000)',
            'Each clue costs 150 points',
            'New player every day — share your score!',
          ]}
        />

        <AdBanner slot="1234567901" format="horizontal" className="mt-8" />
        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="hockey-career" gameContext={{ puzzleId: puzzle.id }} />
        </div>
        <GameNav />
        <Footer />
      </div>
      <HockeyCareerHowToPlay open={showRules} onOpenChange={setShowRules} />
    </main>
  );
};

export default HockeyCareer;
