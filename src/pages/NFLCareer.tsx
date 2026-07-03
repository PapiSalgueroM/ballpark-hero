import { useState } from 'react';
import { useNFLCareer } from '@/hooks/useNFLCareer';
import { NFLCareerHowToPlay } from '@/components/nfl-career/NFLCareerHowToPlay';
import { GameNav } from '@/components/game/GameNav';
import { GameNavbar } from '@/components/game/GameNavbar';
import { Footer } from '@/components/game/Footer';
import { PlayerAutocomplete } from '@/components/game/PlayerAutocomplete';
import { NFL_ROSTER_SOURCE, type PlayerEntity } from '@/lib/playerSearch';
import { Flag, HelpCircle, RotateCcw } from 'lucide-react';
import ShareButtons from '@/components/game/ShareButtons';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';

const NFLCareer = () => {
  const {
    targetPlayer,
    clues,
    cluesRevealed,
    totalClues,
    score,
    gameStatus,
    guessHistory,
    excludedNames,
    makeGuess,
    giveUp,
    shareText,
  } = useNFLCareer();

  const [showHelp, setShowHelp] = useState(false);
  const [input, setInput] = useState('');

  const handleSelect = (entity: PlayerEntity) => {
    makeGuess(entity.name);
    setInput('');
  };

  return (
    <main className="min-h-screen bg-background">
      <GameNavbar />
      <PageSeo
        title="NFL Career Path - Guess the NFL Player | DoUKnowBall"
        description="Identify the NFL player from progressive career clues. Draft info, teams, stats, and awards. Free daily trivia."
        path="/nfl-career"
      />
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
        {/* Header */}
        <header className="text-center mb-8 relative">
          <button
            onClick={() => setShowHelp(true)}
            className="absolute top-0 right-0 p-2 text-muted-foreground hover:text-primary transition-colors"
            aria-label="How to play"
          >
            <HelpCircle className="w-6 h-6" />
          </button>
          <h1 className="text-4xl md:text-5xl font-bold tracking-[0.15em] text-primary font-display mb-1">
            🏈 NFL CAREER PATH
          </h1>
          <p className="text-muted-foreground text-sm">
            Guess the mystery NFL player from career clues!
          </p>
          <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
            <span>Clue <span className="text-foreground font-semibold">{cluesRevealed}/{totalClues}</span></span>
            <span>Score if correct: <span className="text-correct font-semibold">{score}</span></span>
          </div>
        </header>

        {/* Clue cards */}
        <div className="space-y-3 mb-8">
          {clues.map((clue, i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-xl px-5 py-4 flex items-center gap-4 animate-fade-in"
            >
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider w-24 shrink-0">
                {clue.label}
              </span>
              <span className="text-foreground font-semibold text-sm md:text-base">{clue.value}</span>
            </div>
          ))}
          {/* Unrevealed placeholders */}
          {Array.from({ length: totalClues - cluesRevealed }).map((_, i) => (
            <div
              key={`hidden-${i}`}
              className="bg-card/40 border border-border/50 rounded-xl px-5 py-4 flex items-center gap-4"
            >
              <span className="text-xs font-bold text-muted-foreground/50 uppercase tracking-wider w-24 shrink-0">
                Clue {cluesRevealed + i + 1}
              </span>
              <span className="text-muted-foreground/30 text-sm">???</span>
            </div>
          ))}
        </div>

        {/* Guess input */}
        {gameStatus === 'playing' && (
          <div className="mb-8 max-w-md mx-auto">
            <PlayerAutocomplete
              value={input}
              onChange={setInput}
              onSelect={handleSelect}
              searchOptions={{ source: NFL_ROSTER_SOURCE, exclude: excludedNames }}
              placeholder="Type player name to guess..."
              validateOnly
            />
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

        {/* Guess history */}
        {guessHistory.length > 0 && gameStatus === 'playing' && (
          <div className="mb-6 max-w-md mx-auto">
            <p className="text-xs text-muted-foreground mb-2">Previous guesses:</p>
            <div className="flex flex-wrap gap-2">
              {guessHistory.map((g, i) => (
                <span key={i} className="px-3 py-1 rounded-full bg-destructive/20 text-destructive text-xs">
                  {g}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Game Over */}
        {gameStatus !== 'playing' && (
          <div className="flex justify-center">
            <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
              {gameStatus === 'won' ? (
                <>
                  <div className="text-5xl mb-3">🎉</div>
                  <h2 className="text-2xl font-bold text-correct font-display mb-2">Correct!</h2>
                  <p className="text-foreground mb-1">
                    The player was <span className="font-bold text-primary">{targetPlayer.name}</span>
                  </p>
                  <p className="text-muted-foreground text-sm">
                    You got it in {cluesRevealed} clue{cluesRevealed > 1 ? 's' : ''}, {score} points!
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
              <p className="mt-3 text-sm text-muted-foreground">
                💡 Did you know? {targetPlayer.name} was drafted in round {targetPlayer.draftRound} ({targetPlayer.draftYear}) out of {targetPlayer.college}{targetPlayer.careerStat ? `, known for ${targetPlayer.careerStat}` : ''}.
              </p>
              <ShareButtons
                score={gameStatus === 'won' ? `${score} pts (${cluesRevealed} clues)` : '0 pts'}
                gameName="NFL Career Path"
                gamePath="/nfl-career"
              />
              <button
                onClick={() => window.location.reload()}
                className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full font-semibold hover:opacity-90 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                Play Again
              </button>
            </div>
          </div>
        )}

        <GameSeoContent
          title="NFL Career Path | DoUKnowBall"
          description="Guess the mystery NFL player from progressive career clues. Draft round, college, teams, stats, and jersey numbers."
          howToPlay={[
            "Each round reveals a new clue about the mystery NFL player",
            "Type your guess in the search bar after each clue",
            "Clues progress: Draft → College → First Team → Stats → Teams → Jersey #",
            "The fewer clues you need, the higher your score!",
          ]}
          examples={[
            "Tom Brady: 6th Round, Michigan, Patriots → Buccaneers, 7× Super Bowl Champion",
            "Patrick Mahomes: 1st Round, Texas Tech, Chiefs, 3× Super Bowl MVP",
            "Aaron Donald: 1st Round, Pitt, Rams, 3× DPOY",
            "Derrick Henry: 2nd Round, Alabama, Titans → Ravens, 2,000-yard rusher",
            "Justin Jefferson: 1st Round, LSU, Vikings, 3× Pro Bowl",
            "Travis Kelce: 3rd Round, Cincinnati, Chiefs, All-time TE receiving leader"
          ]}
        />

        <AdBanner slot="1234567891" format="horizontal" className="mt-8" />
        <NFLCareerHowToPlay open={showHelp} onOpenChange={setShowHelp} />
        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="nfl-career" gameContext={{ targetPlayer: targetPlayer?.name }} />
        </div>
        <GameNav />
        <Footer />
      </div>
    </main>
  );
};

export default NFLCareer;
