import { useState, useEffect, useRef } from 'react';
import { useBlurredFace } from '@/hooks/useBlurredFace';
import { allPlayerNames } from '@/data/blurredFacePlayers';
import { BlurredFaceHowToPlay } from '@/components/blurred-face/BlurredFaceHowToPlay';
import { GameNav } from '@/components/game/GameNav';
import { Footer } from '@/components/game/Footer';
import { RotateCcw, HelpCircle, Flag, Search } from 'lucide-react';
import ShareButtons from '@/components/game/ShareButtons';

import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';

const BlurredFace = () => {
  const {
    targetPlayer,
    imageUrl,
    gameStatus,
    wrongGuesses,
    revealedHints,
    blurAmount,
    maxGuesses,
    makeGuess,
    giveUp,
    resetGame,
  } = useBlurredFace();

  const [showRules, setShowRules] = useState(false);
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Show rules on first visit
  useEffect(() => {
    const seen = localStorage.getItem('blurred-face-rules-seen');
    if (!seen) {
      setShowRules(true);
      localStorage.setItem('blurred-face-rules-seen', '1');
    }
  }, []);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredNames = query.length >= 1
    ? allPlayerNames.filter(name =>
        name.toLowerCase().includes(query.toLowerCase()) &&
        !wrongGuesses.map(g => g.toLowerCase()).includes(name.toLowerCase())
      ).slice(0, 8)
    : [];

  const handleSelect = (name: string) => {
    makeGuess(name);
    setQuery('');
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && filteredNames.length > 0) {
      handleSelect(filteredNames[0]);
    }
  };

  const isGameOver = gameStatus === 'won' || gameStatus === 'lost' || gameStatus === 'gave-up';


  return (
    <main className="min-h-screen bg-background">
      <PageSeo
        title="Guess the Face – Blurred Soccer Player Game | DoUKnowBall"
        description="Can you identify the soccer player from a blurred photo? Each wrong guess reveals more of the face. Free sports trivia — no signup required."
        path="/guess-the-face"
      />
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
        {/* Header */}
        <header className="text-center mb-8 relative">
          <button
            onClick={() => setShowRules(true)}
            className="absolute top-0 right-0 p-2 text-muted-foreground hover:text-primary transition-colors"
            aria-label="How to play"
          >
            <HelpCircle className="w-6 h-6" />
          </button>

          <h1 className="text-4xl md:text-6xl font-bold tracking-[0.15em] text-primary font-display mb-1">
            GUESS THE FACE
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Can you identify the soccer player from a blurred photo? Each wrong guess reveals more of the face. Test your knowledge in {maxGuesses} tries.
          </p>

          <p className="text-sm text-muted-foreground mt-4">
            Guesses: <span className="text-foreground font-semibold">{wrongGuesses.length}</span> / {maxGuesses}
          </p>
        </header>

        {/* Blurred Image */}
        <div className="flex justify-center mb-6">
          <div className="relative w-64 h-64 md:w-80 md:h-80 rounded-2xl overflow-hidden border-2 border-border bg-secondary">
            {gameStatus === 'loading' ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
              </div>
            ) : imageUrl ? (
              <img
                src={imageUrl}
                alt="Mystery footballer"
                className="w-full h-full object-cover transition-all duration-700"
                style={{ filter: isGameOver ? 'blur(0px)' : `blur(${blurAmount}px)` }}
                draggable={false}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <span className="text-6xl">👤</span>
              </div>
            )}
          </div>
        </div>

        {/* Hints */}
        {revealedHints.length > 0 && (
          <div className="mb-6">
            <h3 className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Hints
            </h3>
            <div className="flex flex-wrap justify-center gap-2">
              {revealedHints.map((hint, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-xl text-sm animate-in fade-in slide-in-from-bottom-2 duration-300"
                >
                  <span>{hint.icon}</span>
                  <span className="text-muted-foreground">{hint.label}:</span>
                  <span className="font-semibold text-foreground">{hint.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search Input */}
        {gameStatus === 'playing' && (
          <div className="mb-6 relative">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={handleKeyDown}
                placeholder="Type a player name..."
                className="w-full pl-12 pr-4 py-4 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-lg"
              />
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && filteredNames.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-xl overflow-hidden"
              >
                {filteredNames.map((name) => (
                  <button
                    key={name}
                    onClick={() => handleSelect(name)}
                    className="w-full text-left px-4 py-3 hover:bg-secondary transition-colors text-foreground border-b border-border/50 last:border-0"
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Give Up Button */}
        {gameStatus === 'playing' && (
          <div className="flex justify-center mb-6">
            <button
              onClick={giveUp}
              className="flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-full font-semibold hover:bg-secondary/80 transition-colors"
            >
              <Flag className="w-4 h-4" />
              Give Up
            </button>
          </div>
        )}

        {/* Wrong Guesses */}
        {wrongGuesses.length > 0 && gameStatus === 'playing' && (
          <div className="mb-6">
            <h3 className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Wrong Guesses
            </h3>
            <div className="flex flex-wrap justify-center gap-2">
              {wrongGuesses.map((guess, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 bg-destructive/20 text-destructive border border-destructive/30 rounded-lg text-sm font-medium"
                >
                  ✗ {guess}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Game Over */}
        {isGameOver && targetPlayer && (
          <div className="flex justify-center mb-8">
            <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
              {gameStatus === 'won' ? (
                <>
                  <div className="text-5xl mb-3">🎉</div>
                  <h2 className="text-2xl font-bold text-correct font-display mb-2">Correct!</h2>
                  <p className="text-foreground">
                    You guessed <span className="font-bold text-primary">{targetPlayer.name}</span> in{' '}
                    {wrongGuesses.length + 1} {wrongGuesses.length + 1 === 1 ? 'try' : 'tries'}!
                  </p>
                </>
              ) : (
                <>
                  <div className="text-5xl mb-3">{gameStatus === 'gave-up' ? '🏳️' : '😞'}</div>
                  <h2 className="text-2xl font-bold text-destructive font-display mb-2">
                    {gameStatus === 'gave-up' ? 'Gave Up' : 'Game Over'}
                  </h2>
                  <p className="text-foreground">
                    The player was <span className="font-bold text-primary">{targetPlayer.name}</span>
                  </p>
                  <p className="text-muted-foreground text-sm mt-1">
                    {targetPlayer.club} · {targetPlayer.nationality}
                  </p>
                </>
              )}

              <ShareButtons
                score={gameStatus === 'won' ? `${wrongGuesses.length + 1}/${maxGuesses} guesses` : `0/${maxGuesses}`}
                gameName="Guess the Face"
                gamePath="/guess-the-face"
              />
              <button
                onClick={resetGame}
                className="mt-4 inline-flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-full font-semibold hover:opacity-90 transition-opacity"
              >
                <RotateCcw className="w-4 h-4" />
                Play Again
              </button>
            </div>
          </div>
        )}

        <GameSeoContent
          title="Guess The Player | DoUKnowBall"
          description="Clues are revealed one by one — position, college, draft info, teams, stats and awards. Guess the mystery player before all clues run out."
          howToPlay={[
            "A blurred photo of a soccer player is shown",
            "Each wrong guess slightly unblurs the image and reveals a hint",
            "Use the hints (nationality, club, position) to narrow it down",
            "Guess correctly before running out of attempts to win",
          ]}
        />

        <AdBanner slot="1234567895" format="horizontal" className="mt-8" />

        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="guess-the-face" gameContext={{ targetPlayer: targetPlayer?.name }} />
        </div>
        <GameNav />
        <Footer />
      </div>

      <BlurredFaceHowToPlay open={showRules} onOpenChange={setShowRules} />
    </main>
  );
};

export default BlurredFace;
