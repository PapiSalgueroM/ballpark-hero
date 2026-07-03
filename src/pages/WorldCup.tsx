import { useState, useEffect, useRef } from 'react';
import { FlagImg } from '@/components/FlagImg';
import { useWorldCup } from '@/hooks/useWorldCup';
import { worldCupPuzzles } from '@/data/worldCupPuzzles';
import { WorldCupHowToPlay } from '@/components/world-cup/WorldCupHowToPlay';
import { GameNav } from '@/components/game/GameNav';
import { GameNavbar } from '@/components/game/GameNavbar';
import { Footer } from '@/components/game/Footer';
import ShareButtons from '@/components/game/ShareButtons';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { HelpCircle, Lightbulb, Send, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

const WorldCup = () => {
  const {
    mode,
    switchMode,
    puzzle,
    revealedClues,
    revealedCount,
    totalClues,
    guess,
    setGuess,
    attempts,
    submitGuess,
    skipClue,
    giveUp,
    resetGame,
    gameStatus,
    score,
    isLoading,
  } = useWorldCup();

  const [showRules, setShowRules] = useState(false);
  const [showGiveUpConfirm, setShowGiveUpConfirm] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // All player names from puzzle bank for autocomplete
  const allNames = worldCupPuzzles.flatMap(p => [p.answer, ...(p.aliases ?? [])]);
  const suggestions = guess.length >= 2
    ? allNames.filter((n, i, arr) => arr.indexOf(n) === i && n.toLowerCase().includes(guess.toLowerCase())).slice(0, 8)
    : [];

  useEffect(() => { setHighlightIndex(0); }, [suggestions.length]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const seen = localStorage.getItem('wc-rules-seen');
    if (!seen) {
      setShowRules(true);
      localStorage.setItem('wc-rules-seen', '1');
    }
  }, []);

  const handleSelect = (name: string) => {
    setGuess(name);
    setShowSuggestions(false);
    setTimeout(() => { submitGuess(name); }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIndex(i => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Escape') setShowSuggestions(false);
    else if (e.key === 'Enter') { e.preventDefault(); if (suggestions[highlightIndex]) handleSelect(suggestions[highlightIndex]); }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    submitGuess(guess);
    setGuess('');
  };

  return (
    <main className="min-h-screen bg-background">
      <GameNavbar />
      <PageSeo
        title="World Cup Trivia - Guess the Legend | DoUKnowBall"
        description="Guess the mystery World Cup player from progressive clues. Covers every tournament from 1970 to 2026."
        path="/world-cup"
      />
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
        {/* Header */}
        <header className="text-center mb-8 relative">
          <button
            onClick={() => setShowRules(true)}
            className="absolute top-0 right-0 p-2 text-muted-foreground hover:text-[hsl(var(--wc-gold))] transition-colors"
            aria-label="How to play"
          >
            <HelpCircle className="w-6 h-6" />
          </button>

          <h1 className="text-4xl md:text-6xl font-bold tracking-[0.2em] font-display mb-1 text-[hsl(var(--wc-green))]">
            ⚽ WORLD CUP
          </h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-md mx-auto">
            Guess the mystery World Cup player from progressive clues. A new challenge every day!
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
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {m === 'daily' ? '📅 Daily' : '∞ Unlimited'}
              </button>
            ))}
          </div>

          <p className="text-sm text-muted-foreground mt-3">
            Clue{' '}
            <span className="font-semibold text-foreground">{Math.min(revealedCount, totalClues)}</span>{' '}
            / {totalClues}
          </p>
        </header>

        {/* Loading guard */}
        {isLoading && (
          <div className="mb-8 flex justify-center">
            <p className="text-muted-foreground text-sm animate-pulse">Loading today's puzzle…</p>
          </div>
        )}

        {/* Clues */}
        {!isLoading && (
          <div className="space-y-3 mb-8">
            {revealedClues.map((clue, i) => {
              const isFinalReveal = clue.label === 'Answer' && gameStatus !== 'playing';
              return (
                <div
                  key={i}
                  className={cn(
                    'rounded-xl border p-4 transition-all animate-in fade-in slide-in-from-top-2 duration-300',
                    isFinalReveal
                      ? 'border-[hsl(var(--wc-gold))]/50 bg-[hsl(var(--wc-gold))]/10'
                      : 'border-border bg-card'
                  )}
                >
                  <span className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--wc-green))]">
                    {clue.label}
                  </span>
                  <p className={cn(
                    'mt-1',
                    isFinalReveal
                      ? 'text-2xl md:text-3xl font-bold text-[hsl(var(--wc-gold))] font-display'
                      : 'text-foreground text-lg font-medium'
                  )}>
                    {(clue.label === 'Country' || clue.label === 'Host Country' || clue.label === 'Country (Host Nation)') ? (
                      <span className="inline-flex items-center gap-2"><FlagImg name={clue.value} size={24} />{clue.value}</span>
                    ) : clue.value}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Input area */}
        {!isLoading && gameStatus === 'playing' && (
          <div className="space-y-3 mb-4">
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={guess}
                  onChange={(e) => { setGuess(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => guess.length >= 2 && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your guess…"
                  autoComplete="off"
                  className="w-full rounded-full border border-border bg-card px-5 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[hsl(var(--wc-green))]/50"
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div ref={suggestionsRef} className="absolute z-50 left-0 right-0 top-full mt-1 max-h-60 overflow-y-auto rounded-xl border border-border bg-card shadow-lg">
                    {suggestions.map((name, i) => (
                      <button
                        key={name}
                        type="button"
                        onMouseDown={() => handleSelect(name)}
                        onMouseEnter={() => setHighlightIndex(i)}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${i === highlightIndex ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-accent'}`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={!guess.trim()}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold text-sm bg-[hsl(var(--wc-green))] text-white hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  <Send className="w-4 h-4" />
                  Guess
                </button>
                <button
                  type="button"
                  onClick={skipClue}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 px-4 py-3 rounded-full font-semibold text-sm bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all"
                >
                  <Lightbulb className="w-4 h-4" />
                  Hint
                </button>
              </div>
            </form>
            {attempts.length > 0 && !showGiveUpConfirm && (
              <div className="flex justify-center">
                <button
                  onClick={() => setShowGiveUpConfirm(true)}
                  className="text-sm text-muted-foreground hover:text-destructive transition-colors"
                >
                  🏳️ Give Up
                </button>
              </div>
            )}
            {showGiveUpConfirm && (
              <div className="text-center space-y-2 p-3 rounded-xl border border-destructive/20 bg-card">
                <p className="text-sm text-muted-foreground">Are you sure? You'll reveal the answer and score 0 points.</p>
                <div className="flex justify-center gap-3">
                  <button onClick={() => { giveUp(); setShowGiveUpConfirm(false); }} className="px-4 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-sm font-semibold hover:opacity-90 transition-colors">
                    Yes, Give Up
                  </button>
                  <button onClick={() => setShowGiveUpConfirm(false)} className="px-4 py-1.5 rounded-lg border border-border text-muted-foreground text-sm hover:bg-accent transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Wrong attempts */}
        {!isLoading && attempts.length > 0 && gameStatus === 'playing' && (
          <div className="flex flex-wrap gap-2 mb-6 justify-center">
            {attempts.map((a, i) => (
              <span key={i} className="px-3 py-1 rounded-full bg-destructive/15 text-destructive text-xs font-medium">
                ✗ {a}
              </span>
            ))}
          </div>
        )}

        {/* Result */}
        {!isLoading && gameStatus !== 'playing' && (
          <div className="flex justify-center mb-8">
            <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
              {gameStatus === 'won' ? (
                <>
                  <div className="text-5xl mb-3">🏆</div>
                  <h2 className="text-2xl font-bold text-[hsl(var(--wc-green))] font-display mb-2">
                    Correct!
                  </h2>
                  <p className="text-foreground">
                    You guessed{' '}
                    <span className="font-bold text-[hsl(var(--wc-gold))]">{puzzle.answer}</span>{' '}
                    in {revealedCount} {revealedCount === 1 ? 'clue' : 'clues'}!
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <Trophy className="w-5 h-5 text-[hsl(var(--wc-gold))]" />
                    <span className="text-xl font-bold text-[hsl(var(--wc-gold))]">{score} pts</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-5xl mb-3">😞</div>
                  <h2 className="text-2xl font-bold text-destructive font-display mb-2">Game Over</h2>
                  <p className="text-foreground">
                    The answer was{' '}
                    <span className="font-bold text-[hsl(var(--wc-gold))]">{puzzle.answer}</span>
                  </p>
                  <p className="text-muted-foreground text-sm mt-1">
                    <FlagImg name={puzzle.country} size={16} /> {puzzle.country} · {puzzle.year}
                  </p>
                </>
              )}
              <ShareButtons
                score={gameStatus === 'won' ? `${score} points in ${revealedCount} clues` : '0 points'}
                gameName="World Cup"
                gamePath="/world-cup"
              />
              {mode === 'unlimited' ? (
                <button
                  onClick={resetGame}
                  className="mt-4 inline-flex items-center gap-2 px-8 py-3 bg-[hsl(var(--wc-green))] text-white rounded-full font-semibold hover:opacity-90 transition-opacity"
                >
                  Play Again
                </button>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">Come back tomorrow for a new puzzle!</p>
              )}
            </div>
          </div>
        )}

        <GameSeoContent
          title="World Cup Trivia Game | DoUKnowBall"
          description="Guess the mystery World Cup player from progressive clues spanning every tournament from 1970 to 2026. Daily challenge: the same puzzle for everyone, resetting at midnight."
          howToPlay={[
            'Clues are revealed one at a time: year, host, position, country, club, and achievement',
            'Guess the player at any point. Earlier guesses earn more points (up to 1,000)',
            'Wrong guesses or skips reveal the next clue',
            'A new daily challenge drops at midnight, same puzzle for all players',
          ]}
          examples={[
            "Pelé: Brazil, 3× World Cup Winner (1958, 1962, 1970)",
            "Diego Maradona: Argentina, 1986 Hand of God & Goal of the Century",
            "Zinedine Zidane: France, 1998 & 2006 Finals, headbutt in Berlin",
            "Ronaldo Nazário: Brazil, 2002 Golden Boot, 15 World Cup goals",
            "Lionel Messi: Argentina, 2022 World Cup Winner, Golden Ball",
            "Miroslav Klose: Germany, All-time WC top scorer with 16 goals",
            "Kylian Mbappé: France, 2018 Winner, 2022 Final hat trick"
          ]}
        />

        <AdBanner slot="1234567899" format="horizontal" className="mt-8" />

        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="world-cup" gameContext={{ answer: puzzle.answer, year: puzzle.year }} />
        </div>
        <GameNav />
        <Footer />
      </div>

      <WorldCupHowToPlay open={showRules} onOpenChange={setShowRules} />
    </main>
  );
};

export default WorldCup;
