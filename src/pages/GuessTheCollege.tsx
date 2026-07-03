import { useState, useRef, useEffect } from 'react';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { GameNav } from '@/components/game/GameNav';
import { GameNavbar } from '@/components/game/GameNavbar';
import { Footer } from '@/components/game/Footer';
import ShareButtons from '@/components/game/ShareButtons';
import GuessCollegeHowToPlay from '@/components/guess-college/GuessCollegeHowToPlay';
import { useGuessTheCollege } from '@/hooks/useGuessTheCollege';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { CollegeGameMode } from '@/types/guessTheCollege';

const MODE_OPTIONS: { value: CollegeGameMode; label: string; icon: string }[] = [
  { value: 'daily', label: 'Daily', icon: '📅' },
  { value: 'unlimited', label: 'Unlimited', icon: '♾️' },
  { value: 'conference', label: 'Conference', icon: '🏆' },
];

const GuessTheCollege = () => {
  const {
    mode, setMode,
    difficulty, setDifficulty,
    selectedConference, setSelectedConference,
    currentCollege,
    revealedClues,
    clues,
    gameOver,
    won,
    score,
    streak,
    guessHistory,
    searchQuery, setSearchQuery,
    suggestions,
    pointsAvailable,
    conferences,
    submitGuess,
    skipClue,
    playAgain,
    getStreakBadge,
    getShareText,
    dailyCompleted,
    isLoading,
  } = useGuessTheCollege();

  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelectSuggestion = (name: string) => {
    submitGuess(name);
    setShowSuggestions(false);
  };

  const handleInputChange = (val: string) => {
    setSearchQuery(val);
    setShowSuggestions(val.length >= 2);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && suggestions.length > 0) {
      handleSelectSuggestion(suggestions[0].name);
    }
  };

  const streakBadge = getStreakBadge();

  return (
    <>
      <GameNavbar />
      <PageSeo
        title="Guess the College - D1 School Trivia Game | DoUKnowBall"
        description="Guess the Division 1 college from progressive clues. Test your knowledge of D1 schools. Daily challenge."
        path="/guess-the-college"
      />

      <div className="min-h-screen flex flex-col bg-background">
        <main className="flex-1 container max-w-2xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-3 mb-1">
              <h1 className="text-3xl font-bold font-display text-primary">🎓 Guess The College</h1>
              <GuessCollegeHowToPlay />
            </div>
            <p className="text-sm text-muted-foreground">Identify the D1 school from progressive clues</p>
          </div>

          {/* Mode selector */}
          <div className="flex justify-center gap-2 mb-3">
            {MODE_OPTIONS.map(opt => (
              <Button
                key={opt.value}
                variant={mode === opt.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMode(opt.value)}
                className="text-xs"
              >
                {opt.icon} {opt.label}
              </Button>
            ))}
          </div>

          {/* Difficulty toggle */}
          <div className="flex justify-center gap-2 mb-3">
            <Button
              variant={difficulty === 'easy' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDifficulty('easy')}
              className={cn("text-xs", difficulty === 'easy' && "bg-green-600 hover:bg-green-700")}
            >
              Easy (Power 4)
            </Button>
            <Button
              variant={difficulty === 'hard' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDifficulty('hard')}
              className={cn("text-xs", difficulty === 'hard' && "bg-red-600 hover:bg-red-700")}
            >
              Hard (All D1)
            </Button>
          </div>

          {/* Conference selector */}
          {mode === 'conference' && (
            <div className="flex justify-center mb-4">
              <select
                value={selectedConference || ''}
                onChange={e => setSelectedConference(e.target.value || null)}
                className="px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm"
              >
                <option value="">Select Conference</option>
                {conferences.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}

          {/* Streak display */}
          {mode === 'unlimited' && streak > 0 && (
            <div className="text-center mb-3">
              <Badge variant="secondary" className="text-sm px-3 py-1">
                🔥 Streak: {streak} {streakBadge}
              </Badge>
            </div>
          )}

          {/* Loading guard for daily mode */}
          {isLoading && (
            <div className="space-y-3 mb-5" aria-live="polite" aria-busy="true">
              <span className="sr-only">Loading today's puzzle…</span>
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-3/4 rounded-xl" />
            </div>
          )}

          {/* Progress indicator */}
          {!isLoading && !gameOver && currentCollege && (
            <div className="text-center mb-4">
              <p className="text-sm text-muted-foreground mb-2">
                Clue {Math.min(revealedClues, 11)} of 11:{' '}
                <span className="font-bold text-primary">{pointsAvailable} points</span> available
              </p>
              <Progress value={(Math.min(revealedClues, 11) / 11) * 100} className="h-2" />
            </div>
          )}

          {/* Clue cards */}
          {!isLoading && (
            <div className="space-y-3 mb-5">
              {clues.slice(0, Math.min(revealedClues, gameOver ? 12 : 11)).map((clue, i) => (
                <div
                  key={clue.number}
                  className={cn(
                    "p-4 rounded-xl border transition-all",
                    clue.number === 12
                      ? "bg-primary/10 border-primary shadow-lg"
                      : "bg-card border-border",
                  )}
                  style={{
                    animation: 'slideInUp 0.4s ease-out',
                    animationFillMode: 'both',
                    animationDelay: i === (gameOver ? Math.min(revealedClues, 12) : revealedClues) - 1 ? '0ms' : '0ms',
                  }}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl flex-shrink-0 mt-0.5">{clue.icon}</span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        {clue.label}
                      </p>
                      <p className={cn(
                        "mt-1 leading-relaxed",
                        clue.number === 12 ? "text-2xl font-bold text-primary" : "text-sm"
                      )}>
                        {clue.text}
                      </p>
                      {clue.number === 12 && currentCollege && (
                        <p className="text-sm text-muted-foreground mt-2 italic">
                          💡 {currentCollege.funFact}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Search input */}
          {!gameOver && currentCollege && (
            <div className="relative mb-4">
              <Input
                ref={inputRef}
                value={searchQuery}
                onChange={e => handleInputChange(e.target.value)}
                onFocus={() => searchQuery.length >= 2 && setShowSuggestions(true)}
                onKeyDown={handleKeyDown}
                placeholder="Type a college name..."
                className="w-full"
                autoComplete="off"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div
                  ref={suggestionsRef}
                  className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto"
                >
                  {suggestions.map(s => (
                    <button
                      key={s.name}
                      className="w-full text-left px-4 py-2.5 hover:bg-accent text-sm transition-colors border-b border-border/30 last:border-0"
                      onClick={() => handleSelectSuggestion(s.name)}
                    >
                      <span className="font-medium">{s.name}</span>
                      <span className="text-muted-foreground ml-2">({s.mascot})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Skip / Give Up button */}
          {!gameOver && currentCollege && (
            <div className="flex justify-center mb-4">
              <Button variant="outline" size="sm" onClick={skipClue}>
                {revealedClues >= 11 ? '🏳️ Give Up' : '⏭️ Skip (Next Clue)'}
              </Button>
            </div>
          )}

          {/* Previous guesses */}
          {guessHistory.length > 0 && !gameOver && (
            <div className="mb-4">
              <p className="text-xs text-muted-foreground mb-2">Previous guesses:</p>
              <div className="flex flex-wrap gap-1.5">
                {guessHistory.map((g, i) => (
                  <Badge key={i} variant="outline" className="text-destructive border-destructive/30 text-xs">
                    ✗ {g}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Game over */}
          {gameOver && (
            <div className="text-center space-y-4 py-4">
              {won ? (
                <div>
                  <p className="text-3xl font-bold text-primary mb-1">🎉 Correct!</p>
                  <p className="text-xl font-semibold">{score} points</p>
                  <p className="text-muted-foreground">
                    Guessed in {guessHistory.length} {guessHistory.length === 1 ? 'try' : 'tries'}
                  </p>
                  {score >= 1200 && <Badge className="mt-2 bg-amber-500">🏆 Legendary!</Badge>}
                  {score >= 700 && score < 1200 && <Badge className="mt-2 bg-green-500">🎯 Great job!</Badge>}
                </div>
              ) : (
                <div>
                  <p className="text-xl font-bold text-destructive mb-1">Better luck next time!</p>
                  <p className="text-lg text-muted-foreground">The answer was:</p>
                  <p className="text-2xl font-bold text-primary">{currentCollege?.name}</p>
                </div>
              )}

              {guessHistory.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Your guesses:</p>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {guessHistory.map((g, i) => {
                      const isLast = i === guessHistory.length - 1;
                      const isCorrectGuess = isLast && won;
                      return (
                        <Badge
                          key={i}
                          variant="outline"
                          className={cn(
                            "text-xs",
                            isCorrectGuess ? "text-green-500 border-green-500/30" : "text-destructive border-destructive/30"
                          )}
                        >
                          {isCorrectGuess ? '✓' : '✗'} {g}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}

              <ShareButtons
                score={`${score}`}
                gameName="Guess The College"
                gamePath="/guess-the-college"
              />

              {mode !== 'daily' && (
                <Button onClick={playAgain} className="mt-2">
                  🔄 Play Again
                </Button>
              )}
              {mode === 'daily' && dailyCompleted && (
                <p className="text-sm text-muted-foreground">
                  Come back tomorrow for a new daily challenge! Or try{' '}
                  <button className="text-primary underline" onClick={() => setMode('unlimited')}>
                    Unlimited Mode
                  </button>
                </p>
              )}
            </div>
          )}

          {/* No college available */}
          {!currentCollege && mode === 'conference' && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {selectedConference
                  ? `No schools found for ${selectedConference} with current difficulty setting.`
                  : 'Select a conference to start playing.'}
              </p>
            </div>
          )}
        </main>

        <div className="container max-w-2xl mx-auto px-4">
          <GameSeoContent
            title="Guess The College: D1 Trivia | DoUKnowBall"
            description="Guess the Division 1 college from progressive clues about their conference, mascot, location, and athletic history. Covers all Power 4 and Group of 5 schools."
            howToPlay={[
              "Read each clue about the mystery college: region, conference, mascot, and tournament history.",
              "Type your guess at any time. Fewer clues used means a higher score.",
              "Play daily mode, unlimited mode, or filter by specific conference."
            ]}
            examples={[
              "Alabama Crimson Tide: SEC, Tuscaloosa, 18× National Football Champions",
              "Ohio State Buckeyes: Big Ten, Columbus, 'THE' Ohio State University",
              "Clemson Tigers: ACC, Death Valley, 3× Football National Champions",
              "Michigan Wolverines: Big Ten, Ann Arbor, Winningest program in CFB",
              "LSU Tigers: SEC, Baton Rouge, Death Valley, 2019 Perfect Season",
              "Notre Dame Fighting Irish: Independent, South Bend, Touchdown Jesus"
            ]}
          />
          <GameNav />
          <Footer />
        </div>
      </div>

      <style>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
};

export default GuessTheCollege;
