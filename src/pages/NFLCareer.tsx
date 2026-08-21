import { useState } from 'react';
import { useNFLCareer } from '@/hooks/useNFLCareer';
import { NFLCareerHowToPlay } from '@/components/nfl-career/NFLCareerHowToPlay';
import { GameNav } from '@/components/game/GameNav';
import { GiveUpButton } from '@/components/game/GiveUpButton';
import { GameShell } from '@/components/game/GameShell';
import { ResultScreen } from '@/components/game/ResultScreen';
import { PlayerAutocomplete } from '@/components/game/PlayerAutocomplete';
import { NFL_ROSTER_SOURCE, type PlayerEntity } from '@/lib/playerSearch';
import { HelpCircle } from 'lucide-react';
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
    playerNames,
    makeGuess,
    giveUp,
    shareText,
    hard, toggleHard,
    mode, switchMode, nextUnlimited,
  } = useNFLCareer();

  const [showHelp, setShowHelp] = useState(false);
  const [input, setInput] = useState('');

  const handleSelect = (entity: PlayerEntity) => {
    makeGuess(entity.name);
    setInput('');
  };

  return (
    <>
      <PageSeo
        title="NFL Career Path - Guess the NFL Player | DoUKnowBall"
        description="Identify the NFL player from progressive career clues. Draft info, teams, stats, and awards. Free daily trivia."
        path="/nfl-career"
      />
      <GameShell
        width="narrow"
        emoji="🏈"
        title="NFL CAREER PATH"
        subtitle="Guess the mystery NFL player from career clues!"
        headerExtra={
          <>
            <button
              onClick={() => setShowHelp(true)}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-primary"
              aria-label="How to play"
            >
              <HelpCircle className="w-4 h-4" /> How to play
            </button>
            <div className="flex items-center justify-center gap-2 mt-2">
              <button
                onClick={() => switchMode('daily')}
                className={'px-3 py-2 rounded-full text-xs font-semibold border transition-all ' + (mode === 'daily' ? 'bg-primary text-primary-foreground border-primary/40' : 'bg-secondary text-muted-foreground border-border')}
              >Daily</button>
              <button
                onClick={() => switchMode('unlimited')}
                className={'px-3 py-2 rounded-full text-xs font-semibold border transition-all ' + (mode === 'unlimited' ? 'bg-primary text-primary-foreground border-primary/40' : 'bg-secondary text-muted-foreground border-border')}
              >Unlimited</button>
              <button
                onClick={toggleHard}
                title="Hard mode: the easiest clues stay hidden"
                className={'text-xs px-3 py-2 rounded-full border transition-all ' + (hard ? 'border-destructive text-destructive bg-destructive/10 font-semibold' : 'border-border text-muted-foreground hover:text-foreground')}
              >😈 Hard: {hard ? 'ON' : 'off'}</button>
            </div>
            <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
              <span>Clue <span className="text-foreground font-semibold">{cluesRevealed}/{totalClues}</span></span>
              <span>Score if correct: <span className="text-correct font-semibold">{score}</span></span>
            </div>
          </>
        }
      >
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
              localNames={playerNames}
            />
            <div className="flex justify-center mt-4">
              <GiveUpButton onGiveUp={giveUp} />
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
            <ResultScreen
              won={gameStatus === 'won'}
              outcomeEmoji={gameStatus === 'won' ? '🎉' : '😞'}
              headline={gameStatus === 'won' ? 'Correct!' : 'Game Over'}
              statLine={
                gameStatus === 'won' ? (
                  <>
                    The player was <span className="font-bold text-primary">{targetPlayer.name}</span>. You got it in{' '}
                    {cluesRevealed} clue{cluesRevealed > 1 ? 's' : ''}, {score} points!
                  </>
                ) : (
                  <>The player was <span className="font-bold text-primary">{targetPlayer.name}</span></>
                )
              }
              funFact={
                <>💡 Did you know? {targetPlayer.name} was drafted in round {targetPlayer.draftRound} ({targetPlayer.draftYear}) out of {targetPlayer.college}{targetPlayer.careerStat ? `, known for ${targetPlayer.careerStat}` : ''}.</>
              }
              emojiGrid={gameStatus === 'won' ? `NFL Career Path: solved in ${cluesRevealed} clue${cluesRevealed > 1 ? 's' : ''}` : 'NFL Career Path: not solved'}
              share={{
                score: gameStatus === 'won' ? `${score} pts (${cluesRevealed} clues)` : '0 pts',
                gameName: 'NFL Career Path',
                gamePath: '/nfl-career',
              }}
              onPlayAgain={nextUnlimited}
              playAgainLabel={mode === 'unlimited' ? 'Next Player' : 'Play Unlimited'}
            />
          </div>
        )}

        <GameSeoContent
          pageHasOwnH1
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
      </GameShell>
    </>
  );
};

export default NFLCareer;
