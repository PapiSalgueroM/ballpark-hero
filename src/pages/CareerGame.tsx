import { useState, useRef, useEffect } from 'react';
import { useCareerGame } from '@/hooks/useCareerGame';
import { CareerBoard } from '@/components/career/CareerBoard';
import { GameNav } from '@/components/game/GameNav';
import { getClubLogoUrl } from '@/lib/clubData';
import { RotateCcw, Flag, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

const CareerGame = () => {
  const {
    targetPlayer,
    revealedCells,
    revealCell,
    makeGuess,
    giveUp,
    resetGame,
    gameStatus,
    boxesUsed,
    playerNames,
  } = useCareerGame();

  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = input.length >= 2
    ? playerNames.filter(n => n.toLowerCase().includes(input.toLowerCase())).slice(0, 8)
    : [];

  const handleSelect = (name: string) => {
    setInput(name);
    setShowSuggestions(false);
    makeGuess(name);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      makeGuess(input.trim());
    }
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.parentElement?.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-6 md:py-10">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-6xl font-bold tracking-[0.2em] text-primary font-display mb-1">
            CAREER QUIZ
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Uncover boxes to reveal a player's career — then guess who it is!
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Boxes uncovered: <span className="text-foreground font-semibold">{boxesUsed}</span>
          </p>
        </header>

        {/* Search / Guess input */}
        {gameStatus === 'playing' && (
          <div className="mb-8 max-w-md mx-auto">
            <form onSubmit={handleSubmit} className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => { setInput(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Type player name to guess..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              {showSuggestions && filtered.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-xl max-h-60 overflow-y-auto">
                  {filtered.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => handleSelect(name)}
                      className="w-full text-left px-4 py-2.5 hover:bg-secondary/60 text-sm text-foreground transition-colors first:rounded-t-xl last:rounded-b-xl"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </form>
            <div className="flex justify-center mt-4">
              <button
                onClick={giveUp}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm rounded-full bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity"
              >
                <Flag className="w-4 h-4" />
                Give Up
              </button>
            </div>
          </div>
        )}

        {/* Career Board */}
        <CareerBoard
          career={targetPlayer.career}
          revealedCells={revealedCells}
          onReveal={revealCell}
          gameOver={gameStatus !== 'playing'}
        />

        {/* Game Over */}
        {gameStatus !== 'playing' && (
          <div className="mt-8 flex justify-center">
            <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
              {targetPlayer && (
                <div className="flex justify-center mb-4">
                  <img
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(targetPlayer.name)}&size=128&background=1a1a2e&color=4ade80&bold=true&format=svg`}
                    alt={targetPlayer.name}
                    className="w-24 h-24 rounded-full object-cover bg-secondary border-2 border-primary/30"
                    onError={(e) => {
                      const lastClub = targetPlayer.career[targetPlayer.career.length - 1]?.club;
                      const logo = getClubLogoUrl(lastClub || '');
                      if (logo) {
                        e.currentTarget.src = logo;
                        e.currentTarget.className = "w-24 h-24 rounded-full object-contain bg-secondary border-2 border-primary/30 p-3";
                      }
                    }}
                  />
                </div>
              )}
              {gameStatus === 'won' ? (
                <>
                  <div className="text-5xl mb-3">🎉</div>
                  <h2 className="text-2xl font-bold text-correct font-display mb-2">Correct!</h2>
                  <p className="text-foreground">
                    You guessed <span className="font-bold text-primary">{targetPlayer.name}</span> after uncovering {boxesUsed} {boxesUsed === 1 ? 'box' : 'boxes'}!
                  </p>
                </>
              ) : (
                <>
                  <div className="text-5xl mb-3">😞</div>
                  <h2 className="text-2xl font-bold text-destructive font-display mb-2">Game Over</h2>
                  <p className="text-foreground">
                    The player was <span className="font-bold text-primary">{targetPlayer.name}</span>
                  </p>
                </>
              )}
              <button
                onClick={() => { resetGame(); setInput(''); }}
                className="mt-6 inline-flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-full font-semibold hover:opacity-90 transition-opacity"
              >
                <RotateCcw className="w-4 h-4" />
                Play Again
              </button>
            </div>
          </div>
        )}

        {/* Nav to other games */}
        <GameNav />
      </div>
    </main>
  );
};

export default CareerGame;
