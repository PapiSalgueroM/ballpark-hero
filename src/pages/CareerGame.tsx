import { useState, useRef, useEffect } from 'react';
import { useCareerGame } from '@/hooks/useCareerGame';
import { CareerBoard } from '@/components/career/CareerBoard';
import { GameNav } from '@/components/game/GameNav';
import { GameShell } from '@/components/game/GameShell';
import { ResultScreen } from '@/components/game/ResultScreen';
import { RulesGate } from '@/components/game/RulesGate';
import { GiveUpButton } from '@/components/game/GiveUpButton';
import { Search, Lightbulb } from 'lucide-react';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { cn } from '@/lib/utils';

const CareerGame = () => {
  const {
    mode,
    switchMode,
    difficulty,
    changeDifficulty,
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
    <>
      <PageSeo
        title="Soccer Career Path - Guess the Player from Transfers | DoUKnowBall"
        description="Identify the soccer player from their career history. Clubs revealed one by one. Free football trivia game."
        path="/career"
      />
      <GameShell help="none"
        width="wide"
        title="CAREER QUIZ"
        subtitle="Uncover boxes to reveal a player's career, then guess who it is!"
        headerExtra={
          <>
            <RulesGate title="How to Play: Career Quiz">
              <p className="text-muted-foreground text-center">
                A player's career is laid out season by season. Figure out who it is.
              </p>

              <section>
                <h3 className="font-bold text-foreground mb-2">The Board</h3>
                <p className="text-muted-foreground">
                  Each row is one season. <span className="text-foreground font-semibold">Season</span> is always
                  visible. <span className="text-foreground font-semibold">Club, Appearances, Goals, Assists</span>,
                  and <span className="text-foreground font-semibold">Market Value</span> are hidden behind boxes.
                </p>
              </section>

              <section>
                <h3 className="font-bold text-foreground mb-2">Uncovering Boxes</h3>
                <ul className="space-y-1.5 text-muted-foreground">
                  <li>Tap any hidden box to reveal that cell</li>
                  <li>
                    Press <span className="text-foreground font-semibold">Give Hint</span> to reveal{' '}
                    <span className="text-primary font-semibold">4 random boxes</span> at once
                  </li>
                  <li>Use Give Hint as many times as you need</li>
                </ul>
              </section>

              <section>
                <h3 className="font-bold text-foreground mb-2">Guessing</h3>
                <ul className="space-y-1.5 text-muted-foreground">
                  <li>Type a player name in the search bar and pick from the suggestions</li>
                  <li>You get <span className="text-primary font-semibold">8 guesses</span> to identify the player</li>
                  <li>Guess anytime, even before uncovering a single box</li>
                </ul>
              </section>

              <section>
                <h3 className="font-bold text-foreground mb-2">Strategy Tips</h3>
                <ul className="space-y-1.5 text-muted-foreground">
                  <li>Club names are the biggest tell: a unique transfer history narrows it down fast</li>
                  <li>Goal-heavy seasons point to prolific strikers</li>
                  <li>Market value peaks hint at a player's prime years</li>
                  <li>Fewer boxes used means a more impressive solve</li>
                </ul>
              </section>
            </RulesGate>

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

            {/* #78: difficulty tiers, unlimited mode only. Easy = biggest stars by
                peak career market value, Hard = deepest cuts, Normal = full pool. */}
            {mode === 'unlimited' && (
              <div className="flex items-center justify-center gap-2 mt-3">
                {(['easy', 'normal', 'hard'] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => changeDifficulty(d)}
                    className={cn(
                      'px-6 py-2 rounded-full text-sm font-semibold transition-all capitalize',
                      difficulty === d
                        ? d === 'easy'
                          ? 'bg-correct text-correct-foreground'
                          : d === 'hard'
                            ? 'bg-destructive text-destructive-foreground'
                            : 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
              <span>Boxes: <span className="text-foreground font-semibold">{boxesUsed}</span></span>
              <span>Guesses: <span className="text-foreground font-semibold">{guessesUsed}/{maxGuesses}</span></span>
            </div>
          </>
        }
      >
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
                      aria-label="Guess the player by name"
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
                  <GiveUpButton onGiveUp={giveUp} />
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
            {gameStatus !== 'playing' && (() => {
              const clubs = Array.from(new Set(targetPlayer.career.map((s) => s.club)));
              const peak = targetPlayer.career.reduce((a, b) => (b.marketValue > a.marketValue ? b : a));
              return (
                <div className="mt-8 flex justify-center">
                  <ResultScreen
                    won={gameStatus === 'won'}
                    outcomeEmoji={gameStatus === 'won' ? '🎉' : '😞'}
                    headline={gameStatus === 'won' ? 'Correct!' : 'Game Over'}
                    statLine={
                      gameStatus === 'won' ? (
                        <>You guessed <span className="font-bold text-primary">{targetPlayer.name}</span> in {guessesUsed} {guessesUsed === 1 ? 'guess' : 'guesses'} with {boxesUsed} {boxesUsed === 1 ? 'box' : 'boxes'} uncovered!</>
                      ) : (
                        <>The player was <span className="font-bold text-primary">{targetPlayer.name}</span></>
                      )
                    }
                    funFact={`💡 Did you know? ${targetPlayer.name} played for ${clubs.length} ${clubs.length === 1 ? 'club' : 'clubs'} and peaked at a €${peak.marketValue}M valuation.`}
                    emojiGrid={gameStatus === 'won' ? `${guessesUsed} guesses, ${boxesUsed} boxes` : `0/${maxGuesses}`}
                    share={{
                      score: gameStatus === 'won' ? `${guessesUsed} guesses, ${boxesUsed} boxes` : `0/${maxGuesses}`,
                      gameName: 'Career Quiz',
                      gamePath: '/career',
                    }}
                    onPlayAgain={mode === 'unlimited' ? () => { resetGame(); setInput(''); } : undefined}
                    playNext={mode === 'daily' ? 'Come back tomorrow for a new puzzle!' : undefined}
                  />
                </div>
              );
            })()}
          </>
        )}

        <GameSeoContent
          pageHasOwnH1
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

        <AdBanner slot="7540487748" format="horizontal" className="mt-8" />

        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="career" gameContext={{ targetPlayer: targetPlayer?.name }} />
        </div>
        <GameNav />
      </GameShell>
    </>
  );
};

export default CareerGame;
