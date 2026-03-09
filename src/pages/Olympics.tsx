import { useState, useRef, useEffect } from 'react';
import { useOlympics } from '@/hooks/useOlympics';
import OlympicsHowToPlay from '@/components/olympics/OlympicsHowToPlay';
import ShareButtons from '@/components/game/ShareButtons';
import { GameNav } from '@/components/game/GameNav';
import { GameNavbar } from '@/components/game/GameNavbar';
import { shareResult } from '@/lib/share';
import PageSeo from '@/components/seo/PageSeo';
import { Trophy, ChevronDown, Award } from 'lucide-react';

export default function Olympics() {
  const {
    athlete,
    clueLevel,
    visibleClues,
    totalClues,
    status,
    score,
    guessInput,
    setGuessInput,
    submitGuess,
    revealNextClue,
    giveUp,
    wrongGuess,
    shareText,
    athleteNames,
  } = useOlympics();

  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = guessInput.trim().length >= 2
    ? athleteNames.filter(n => n.toLowerCase().includes(guessInput.toLowerCase())).slice(0, 6)
    : [];

  const handleSelect = (name: string) => {
    setGuessInput(name);
    setShowSuggestions(false);
    submitGuess(name);
    setGuessInput('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (guessInput.trim()) {
      submitGuess(guessInput);
      setGuessInput('');
    }
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.parentElement?.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const isGameOver = status !== 'playing';

  return (
    <>
      <PageSeo
        title="The Medal Games — DoUKnowBall"
        description="Guess the mystery athlete from progressive clues about their career at the Games. Daily challenge on DoUKnowBall."
        path="/olympics"
      />
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-lg mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Trophy className="w-7 h-7 text-[hsl(43,85%,55%)]" />
              <h1 className="text-2xl font-display font-bold text-[hsl(43,85%,55%)]">The Medal Games</h1>
            </div>
            <OlympicsHowToPlay />
          </div>
          <p className="text-sm text-muted-foreground mb-6">Guess the athlete from progressive clues</p>

          {/* Score bar */}
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
            <span>Clue {Math.min(clueLevel + 1, totalClues)} / {totalClues}</span>
            <span className="text-[hsl(43,85%,55%)] font-bold">
              {status === 'playing'
                ? `${[1000, 850, 700, 550, 400, 250, 100][Math.min(clueLevel, 6)]} pts available`
                : status === 'guessed'
                  ? `Score: ${score}`
                  : 'Game Over'}
            </span>
          </div>

          {/* Clues */}
          <div className="space-y-3 mb-6">
            {visibleClues.map((clue, i) => (
              <div
                key={clue.label}
                className="rounded-xl border border-[hsl(43,85%,55%)/0.2] bg-card p-4 animate-cell-reveal"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="text-xs font-semibold uppercase tracking-wider text-[hsl(43,85%,55%)] mb-1">
                  {clue.label}
                </div>
                <div className="text-foreground text-sm">{clue.value}</div>
              </div>
            ))}
          </div>

          {/* Game Over */}
          {isGameOver && (
            <div className="rounded-2xl border border-[hsl(43,85%,55%)/0.3] bg-card p-6 text-center mb-6 animate-cell-reveal">
              <Award className="w-10 h-10 text-[hsl(43,85%,55%)] mx-auto mb-3" />
              <p className="text-3xl font-display font-bold text-[hsl(43,85%,55%)] mb-1">{athlete.name}</p>
              <p className="text-sm text-muted-foreground mb-1">{athlete.sport} — {athlete.country}</p>
              <p className="text-xs text-muted-foreground mb-4">{athlete.gamesYear} {athlete.hostCity}</p>
              {status === 'guessed' ? (
                <p className="text-lg font-bold text-primary">Score: {score} 🏅</p>
              ) : (
                <p className="text-sm text-destructive">Better luck tomorrow!</p>
              )}
              <div className="mt-4">
                <button
                  onClick={() => shareResult(shareText)}
                  className="px-5 py-2.5 bg-[hsl(43,85%,55%)] text-background rounded-full text-sm font-semibold hover:opacity-90 transition-all"
                >
                  Share Score
                </button>
              </div>
              <ShareButtons score={String(score)} gameName="The Medal Games" gamePath="/olympics" />
            </div>
          )}

          {/* Controls */}
          {!isGameOver && (
            <div className="space-y-3 mb-6">
              <form onSubmit={handleSubmit} className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={guessInput}
                  onChange={(e) => { setGuessInput(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Type athlete name..."
                  className={`w-full px-4 py-3 rounded-xl bg-card border ${wrongGuess ? 'border-destructive' : 'border-border'} text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[hsl(43,85%,55%)/0.5]`}
                />
                {showSuggestions && filtered.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-xl bg-card border border-border shadow-lg overflow-hidden">
                    {filtered.map(name => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => handleSelect(name)}
                        className="block w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </form>
              <div className="flex gap-3">
                {clueLevel < totalClues - 1 && (
                  <button
                    onClick={revealNextClue}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-secondary text-secondary-foreground font-semibold text-sm hover:bg-secondary/80 transition-all"
                  >
                    <ChevronDown className="w-4 h-4" />
                    Next Clue
                  </button>
                )}
                <button
                  onClick={giveUp}
                  className="flex-1 px-4 py-3 rounded-xl border border-border text-muted-foreground text-sm font-semibold hover:bg-card transition-all"
                >
                  Give Up
                </button>
              </div>
            </div>
          )}

          <GameNav />
        </div>
      </div>
    </>
  );
}
