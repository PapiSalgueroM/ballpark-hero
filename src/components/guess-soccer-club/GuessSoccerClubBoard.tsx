import { useState } from 'react';
import { useGuessSoccerClub, MAX_CLUES } from '@/hooks/useGuessSoccerClub';
import { useScrollToGame } from '@/hooks/useScrollToGame';
import { Button } from '@/components/ui/button';
import { ClubSearch } from './ClubSearch';
import ShareButtons from '@/components/game/ShareButtons';
import { GameNav } from '@/components/game/GameNav';
import { POINTS_BY_CLUE, CLUE_LABELS } from '@/types/guessSoccerClub';
import { Trophy, HelpCircle } from 'lucide-react';
import { FlagImg } from '@/components/FlagImg';

const LEAGUES = ['Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1', 'MLS'];

const leagueCountry: Record<string, string> = {
  'Premier League': 'England',
  'La Liga': 'Spain',
  'Serie A': 'Italy',
  'Bundesliga': 'Germany',
  'Ligue 1': 'France',
  'MLS': 'USA',
};

export function GuessSoccerClubBoard() {
  const { gameState, startGame, makeGuess, giveUp, resetGame, pointsForCurrentClue,
          allClubNames, isLoadingPool } =
    useGuessSoccerClub();
  const gameRef = useScrollToGame(gameState);

  const [showHelp, setShowHelp] = useState(false);

  /* ─── Mode selection ─── */
  if (!gameState) {
    if (isLoadingPool) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p className="text-muted-foreground">Loading…</p>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="container mx-auto px-4 py-8 max-w-xl">
          <div className="text-center mb-10">
            <div className="text-5xl mb-3">⚽</div>
            <h1 className="text-4xl font-bold text-primary font-display mb-2">
              Guess The Football Club
            </h1>
            <p className="text-muted-foreground">
              Clues reveal one at a time. How quickly can you identify the mystery club?
            </p>
            <button
              onClick={() => setShowHelp(v => !v)}
              className="mt-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <HelpCircle className="w-4 h-4" /> How to Play
            </button>
            {showHelp && (
              <div className="mt-4 p-4 bg-card border border-border rounded-xl text-left text-sm space-y-1 text-muted-foreground max-w-sm mx-auto">
                <p>🟢 A mystery football club is chosen.</p>
                <p>🔢 6 clues are revealed one at a time: vibe, league, titles, kit colors, notable players, then the name.</p>
                <p>✅ Guess correctly on clue 1 = 1200 pts</p>
                <p>📉 Points decrease with each clue used.</p>
                <p>❌ After 5 wrong guesses the club is revealed.</p>
              </div>
            )}
          </div>

          {/* Mode buttons */}
          <div className="space-y-3">
            <Button
              className="w-full h-14 text-lg font-semibold"
              onClick={() => startGame('daily')}
            >
              🗓️ Daily Challenge
            </Button>
            <Button
              variant="outline"
              className="w-full h-14 text-lg font-semibold"
              onClick={() => startGame('unlimited')}
            >
              🔄 Unlimited
            </Button>

            <div className="pt-2">
              <p className="text-center text-sm text-muted-foreground mb-3 font-medium uppercase tracking-wide">
                Filter by League
              </p>
              <div className="grid grid-cols-2 gap-2">
                {LEAGUES.map(league => (
                  <Button
                    key={league}
                    variant="outline"
                    className="h-11 text-sm"
                    onClick={() => startGame('league', league)}
                  >
                    <span className="inline-flex items-center gap-1"><FlagImg name={leagueCountry[league]} size={16} /> {league}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <GameNav />
        </div>
      </div>
    );
  }

  const isPlaying = gameState.gameStatus === 'playing';
  const isWon = gameState.gameStatus === 'won';
  const isLost = gameState.gameStatus === 'lost';

  /* ─── Clue renderer ───
     6 tiers: vibe, league hint, league titles, kit colors, notable players,
     full name. "Notable Players" (index 4) is text-only (player names, no
     crests/photos) and is populated live from player_market_values for
     clubs with a confident name match (see fetchSoccerClubNotablePlayers.ts
     and useGuessSoccerClub's enrichment effect); puzzles without a match
     fall back to a plain-language note instead of an empty reveal. */
  const getClueContent = (index: number): string => {
    const { puzzle } = gameState;
    switch (index) {
      case 0: return `"${puzzle.clues.vibe}"`;
      case 1: return puzzle.clues.leagueHint;
      case 2:
        return puzzle.clues.leagueTitles === 0
          ? 'Has never won the league title'
          : `Has won ${puzzle.clues.leagueTitles} league title${puzzle.clues.leagueTitles !== 1 ? 's' : ''}`;
      case 3: return puzzle.clues.kitColors;
      case 4:
        return puzzle.notablePlayers && puzzle.notablePlayers.length > 0
          ? `Notable current players include ${puzzle.notablePlayers.join(', ')}`
          : 'No standout current player data for this club yet';
      case 5: return puzzle.fullName;
      default: return '';
    }
  };

  const modeLabel =
    gameState.mode === 'daily'
      ? '🗓️ Daily Challenge'
      : gameState.mode === 'league'
      ? `${gameState.leagueFilter}`
      : '🔄 Unlimited';

  const shareScore = isWon
    ? `I guessed today's Football Club in ${gameState.revealedClues} clue${gameState.revealedClues !== 1 ? 's' : ''}!\nScore: ${gameState.score} ⚽`
    : `I couldn't guess today's Football Club. It was ${gameState.puzzle.fullName} ⚽`;

  return (
    <div ref={gameRef} className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8 max-w-xl">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-primary font-display mb-1">
            ⚽ Guess The Football Club
          </h1>
          <p className="text-sm text-muted-foreground">{modeLabel}</p>
        </div>

        {/* Points pill */}
        {isPlaying && (
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 px-4 py-2 rounded-full">
              <Trophy className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Worth</span>
              <span className="text-lg font-bold text-primary">{pointsForCurrentClue} pts</span>
            </div>
          </div>
        )}

        {/* Clues */}
        <div className="space-y-2 mb-8">
          {Array.from({ length: MAX_CLUES }).map((_, i) => {
            const isRevealed = i < gameState.revealedClues || isWon || isLost;
            const isFinalReveal = i === MAX_CLUES - 1;

            return (
              <div
                key={i}
                className={`p-3 rounded-lg border transition-all duration-300 ${
                  isRevealed
                    ? isFinalReveal && (isWon || isLost)
                      ? 'bg-primary/10 border-primary/30'
                      : 'bg-card border-border'
                    : 'bg-muted/20 border-border/40'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                      isRevealed
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    {isRevealed ? (
                      <>
                        <p className="text-xs text-muted-foreground mb-0.5">{CLUE_LABELS[i]}</p>
                        <p
                          className={`text-foreground leading-snug ${
                            isFinalReveal ? 'text-2xl font-bold text-primary' : ''
                          }`}
                        >
                          {getClueContent(i)}
                        </p>
                      </>
                    ) : (
                      <p className="text-muted-foreground italic text-sm">
                        {CLUE_LABELS[i]} - {POINTS_BY_CLUE[i]} pts
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Playing state */}
        {isPlaying && (
          <div className="space-y-4">
            <ClubSearch usedGuesses={gameState.guesses} onGuess={makeGuess} allClubNames={allClubNames} />

            <div className="flex justify-center">
              <button
                onClick={giveUp}
                className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors"
              >
                🏳️ Give Up
              </button>
            </div>

            {gameState.guesses.length > 0 && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-2">Wrong guesses:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {gameState.guesses.map((g, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-destructive/15 text-destructive rounded-full text-sm"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Game over */}
        {(isWon || isLost) && (
          <div className="space-y-6 text-center">
            <div
              className={`p-6 rounded-xl border ${
                isWon
                  ? 'bg-primary/10 border-primary/30'
                  : 'bg-destructive/10 border-destructive/30'
              }`}
            >
              <h2
                className={`text-2xl font-bold mb-1 ${
                  isWon ? 'text-primary' : 'text-destructive'
                }`}
              >
                {isWon ? '🎉 Correct!' : '😞 Game Over'}
              </h2>
              {isWon && (
                <p className="text-muted-foreground mb-1">
                  You scored{' '}
                  <span className="text-primary font-bold text-xl">{gameState.score}</span>{' '}
                  points!
                </p>
              )}
              <p className="text-sm text-muted-foreground italic mt-3">
                {gameState.puzzle.funFact}
              </p>
            </div>

            <ShareButtons
              score={shareScore}
              gameName="Guess The Football Club"
              gamePath="/guess-soccer-club"
            />

            <Button onClick={resetGame} variant="outline" className="w-full max-w-xs mx-auto">
              Play Again
            </Button>
          </div>
        )}

        <GameNav />
      </div>
    </div>
  );
}
