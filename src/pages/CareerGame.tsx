import { useState, useRef, useEffect } from 'react';
import { useCareerGame } from '@/hooks/useCareerGame';
import { CareerBoard } from '@/components/career/CareerBoard';
import { GameNav } from '@/components/game/GameNav';
import { GameNavbar } from '@/components/game/GameNavbar';
import { Footer } from '@/components/game/Footer';
import { RotateCcw, Flag, Search, Lightbulb, HelpCircle } from 'lucide-react';
import ShareButtons from '@/components/game/ShareButtons';
import { CareerHowToPlay } from '@/components/career/CareerHowToPlay';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { cn } from '@/lib/utils';

const CareerGame = () => {
  const {
    mode,
    switchMode,
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
    isLoading,
    isLoadingPool,
  } = useCareerGame();

  const [showHelp, setShowHelp] = useState(false);
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = input.length >= 2
    ? playerNames.filter((n) => n.toLowerCase().includes(input.toLowerCase()))
    : [];

  const handleSelect = (name: string) => {
    setShowSuggestions(false);
    setSelectedIdx(-1);
    makeGuess(name);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setShowSuggestions(false); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx((prev) => Math.min(prev + 1, filtered.length - 1)); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx((prev) => Math.max(prev - 1, -1)); return; }
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

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { setSelectedIdx(-1); }, [filtered.length]);

  return (
    <main className="min-h-screen bg-background">
      <GameNavbar />
      <PageSeo
        title="Soccer Career Path - Guess the Player from Transfers | DoUKnowBall"
        description="Identify the soccer player from their career history. Clubs revealed one by one. Free football trivia game."
        path="/career"
      />
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
            Uncover boxes to reveal a player's career, then guess who it is!
          </p>

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

          <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
            <span>Boxes: <span className="text-foreground font-semibold">{boxesUsed}</span></span>
            <span>Guesses: <span className="text-foreground font-semibold">{guessesUsed}/{maxGuesses}</span></span>
          </div>
        </header>

        {/* Loading guard */}
        {(isLoadingPool || isLoading) ? (
          <div className="flex justify-center py-10">
            <p className="text-muted-foreground text-sm animate-pulse">Loading today's puzzle…</p>
          </div>
        ) : (
          <>
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
                          className={`w-full text-left px-4 py-2.5 text-sm text-foreground transition-colors first:rounded-t-xl last:rounded-b-xl ${idx === selectedIdx ? 'bg-secondary' : 'hover:bg-secondary/60'}`}
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
                  {(() => {
                    const clubs = Array.from(new Set(targetPlayer.career.map((s) => s.club)));
                    const peak = targetPlayer.career.reduce((a, b) => (b.marketValue > a.marketValue ? b : a));
                    return (
                      <p className="mt-3 text-sm text-muted-foreground">
                        💡 Did you know? {targetPlayer.name} played for {clubs.length} {clubs.length === 1 ? 'club' : 'clubs'} and peaked at a €{peak.marketValue}M valuation.
                      </p>
                    );
                  })()}
                  <ShareButtons
                    score={gameStatus === 'won' ? `${guessesUsed} guesses, ${boxesUsed} boxes` : `0/${maxGuesses}`}
                    gameName="Career Quiz"
                    gamePath="/career"
                  />
                  {mode === 'unlimited' ? (
                    <button
                      onClick={() => { resetGame(); setInput(''); }}
                      className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full font-semibold hover:opacity-90 transition-all"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Play Again
                    </button>
                  ) : (
                    <p className="mt-4 text-sm text-muted-foreground">Come back tomorrow for a new puzzle!</p>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        <GameSeoContent
          title="Career Path Game | DoUKnowBall"
          description="Guess the mystery sports player from their career history. Each clue reveals a team they played for. The fewer clues you need, the higher your score."
          howToPlay={[
            'Click boxes to reveal teams from the mystery player\'s career',
            'Use the search bar to guess the player at any time',
            'Use hints to reveal additional boxes automatically',
            'The fewer boxes and guesses you use, the better your score',
          ]}
          examples={[
            'Cristiano Ronaldo: Sporting → Man United → Real Madrid → Juventus → Man United → Al Nassr',
            'Zlatan Ibrahimović: Ajax → Juventus → Inter → Barcelona → AC Milan → PSG → Man United → LA Galaxy → AC Milan',
            'Thierry Henry: Monaco → Juventus → Arsenal → Barcelona → New York Red Bulls',
            'David Beckham: Man United → Real Madrid → LA Galaxy → AC Milan → PSG',
            'Ronaldinho: Grêmio → PSG → Barcelona → AC Milan → Flamengo',
            'Samuel Eto\'o: Real Madrid → Mallorca → Barcelona → Inter → Chelsea',
          ]}
        />

        <AdBanner slot="1234567891" format="horizontal" className="mt-8" />

        <CareerHowToPlay open={showHelp} onOpenChange={setShowHelp} />
        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="career" gameContext={{ targetPlayer: targetPlayer?.name }} />
        </div>
        <GameNav />
        <Footer />
      </div>
    </main>
  );
};

export default CareerGame;
