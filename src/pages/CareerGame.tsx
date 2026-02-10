import { useState, useRef, useEffect } from 'react';
import { useCareerGame } from '@/hooks/useCareerGame';
import { CareerBoard } from '@/components/career/CareerBoard';
import { GameNav } from '@/components/game/GameNav';
import { Footer } from '@/components/game/Footer';
import { getClubLogoUrl } from '@/lib/clubData';
import { RotateCcw, Flag, Search, Lightbulb, HelpCircle, Share2 } from 'lucide-react';
import { CareerHowToPlay } from '@/components/career/CareerHowToPlay';
import { shareResult } from '@/lib/share';
import AdBanner from '@/components/ads/AdBanner';

const CareerGame = () => {
  const {
    targetPlayer,
    revealedCells,
    revealCell,
    makeGuess,
    giveUp,
    giveHint,
    resetGame,
    gameStatus,
    boxesUsed,
    guessesUsed,
    maxGuesses,
    playerNames,
    allRevealed,
  } = useCareerGame();

  const [showHelp, setShowHelp] = useState(false);
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = input.length >= 2
    ? playerNames.filter(n => n.toLowerCase().includes(input.toLowerCase())).slice(0, 8)
    : [];

  const handleSelect = (name: string) => {
    setShowSuggestions(false);
    setSelectedIdx(-1);
    makeGuess(name);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(prev => Math.min(prev + 1, filtered.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(prev => Math.max(prev - 1, -1));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIdx >= 0 && filtered[selectedIdx]) {
        handleSelect(filtered[selectedIdx]);
      } else if (filtered.length > 0) {
        handleSelect(filtered[0]);
      } else if (input.trim()) {
        makeGuess(input.trim());
        setInput('');
      }
    }
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Reset selectedIdx when filtered changes
  useEffect(() => {
    setSelectedIdx(-1);
  }, [filtered.length]);

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-6 md:py-10">
        {/* Header */}
        <header className="text-center mb-8 relative">
          <button
            onClick={() => setShowHelp(true)}
            className="absolute top-0 right-0 p-2 text-muted-foreground hover:text-primary transition-colors"
            aria-label="How to play"
          >
            <HelpCircle className="w-6 h-6" />
          </button>
          <h1 className="text-4xl md:text-6xl font-bold tracking-[0.2em] text-primary font-display mb-1">
            CAREER QUIZ
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Uncover boxes to reveal a player's career — then guess who it is!
          </p>
          <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
            <span>Boxes: <span className="text-foreground font-semibold">{boxesUsed}</span></span>
            <span>Guesses: <span className="text-foreground font-semibold">{guessesUsed}/{maxGuesses}</span></span>
          </div>
        </header>

        {/* Search / Guess input */}
        {gameStatus === 'playing' && (
          <div className="mb-8 max-w-md mx-auto">
            <div ref={containerRef} className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => { setInput(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => input.length >= 2 && setShowSuggestions(true)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type player name to guess..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  autoComplete="off"
                />
              </div>
              {showSuggestions && filtered.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-xl max-h-60 overflow-y-auto">
                  {filtered.map((name, idx) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => handleSelect(name)}
                      className={`w-full text-left px-4 py-2.5 text-sm text-foreground transition-colors first:rounded-t-xl last:rounded-b-xl ${
                        idx === selectedIdx ? 'bg-secondary' : 'hover:bg-secondary/60'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-center gap-3 mt-4">
              <button
                onClick={giveHint}
                disabled={allRevealed}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Lightbulb className="w-4 h-4" />
                Give Hint
              </button>
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
                    You guessed <span className="font-bold text-primary">{targetPlayer.name}</span> in {guessesUsed} {guessesUsed === 1 ? 'guess' : 'guesses'} with {boxesUsed} {boxesUsed === 1 ? 'box' : 'boxes'} uncovered!
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
              <div className="mt-6 flex items-center gap-3 justify-center">
                <button
                  onClick={() => { resetGame(); setInput(''); }}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-full font-semibold hover:bg-secondary/80 transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  Play Again
                </button>
                <button
                  onClick={() => {
                    const result = gameStatus === 'won'
                      ? `🎉 Career Quiz\nGuessed ${targetPlayer.name} in ${guessesUsed} ${guessesUsed === 1 ? 'guess' : 'guesses'} with ${boxesUsed} ${boxesUsed === 1 ? 'box' : 'boxes'} uncovered!`
                      : `😞 Career Quiz\nCouldn't guess ${targetPlayer.name}`;
                    shareResult(`${result}\n\nPlay at footyfein.lovable.app/career`, 'Career Quiz');
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full font-semibold hover:opacity-90 transition-all"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
              </div>
            </div>
          </div>
        )}

        <AdBanner slot="1234567891" format="horizontal" className="mt-8" />

        <CareerHowToPlay open={showHelp} onOpenChange={setShowHelp} />
        <GameNav />
        <Footer />
      </div>
    </main>
  );
};

export default CareerGame;
