import { useState, useEffect } from 'react';
import { useUfcGame } from '@/hooks/useUfcGame';
import { UfcFighterSearch } from '@/components/ufc/UfcFighterSearch';
import { UfcGameBoard } from '@/components/ufc/UfcGameBoard';
import { ufcShareGrid } from '@/components/ufc/ufcClues';
import { UfcHowToPlay } from '@/components/ufc/UfcHowToPlay';
import UfcDivisionRun from '@/components/ufc/UfcDivisionRun';
import UfcDebutTimeline from '@/components/ufc/UfcDebutTimeline';
import { GameNav } from '@/components/game/GameNav';
import { GiveUpButton } from '@/components/game/GiveUpButton';
import { GameShell } from '@/components/game/GameShell';
import { ResultScreen } from '@/components/game/ResultScreen';
import { HelpCircle } from 'lucide-react';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { cn } from '@/lib/utils';
import { safeSessionStorage, safeSetItem } from '@/lib/safeStorage';

const UfcGame = () => {
  const {
    mode,
    switchMode,
    guesses,
    gameStatus,
    makeGuess,
    giveUp,
    resetGame,
    fighters,
    guessedFighterNames,
    maxGuesses,
    targetFighter,
    isLoading,
  } = useUfcGame();

  const [showRules, setShowRules] = useState(false);
  const [division, setDivision] = useState(() => safeSessionStorage.getItem('ufc-division-open') === '1');

  useEffect(() => {
    const seen = localStorage.getItem('ufc-rules-seen');
    if (!seen) {
      setShowRules(true);
      safeSetItem('ufc-rules-seen', '1');
    }
  }, []);

  return (
    <>
      <PageSeo
        title="UFC Fighter Guesser - MMA Trivia Game | DoUKnowBall"
        description="Guess the UFC fighter from clues about their record, weight class, and career highlights."
        path="/ufc"
      />
      <GameShell
        width="wide"
        help="none"
        title="UFC GUESSER"
        subtitle={division ? 'Find three fighters from one weight class in eight guesses.' : 'Guess the UFC fighter in 8 tries using clues like weight class, record, and nationality. Free MMA trivia, no login needed.'}
        headerExtra={
          <>
            <div className="flex max-w-full items-center justify-center gap-1 mt-6 bg-secondary rounded-full p-1 w-fit mx-auto">
              {(['daily', 'unlimited', 'division'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={division ? m === 'division' : mode === m}
                  onClick={() => {
                    setDivision(m === 'division');
                    if (m === 'division') safeSessionStorage.setItem('ufc-division-open', '1');
                    else { safeSessionStorage.removeItem('ufc-division-open'); switchMode(m); }
                  }}
                  className={cn(
                    'min-h-11 whitespace-nowrap px-2.5 sm:px-5 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all',
                    (division ? m === 'division' : mode === m)
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {m === 'daily' ? '📅 Daily' : m === 'unlimited' ? '∞ Unlimited' : 'Division run'}
                </button>
              ))}
            </div>

            <UfcDebutTimeline />

            {!division && <p className="text-sm text-muted-foreground mt-4">
              Guesses:{' '}
              <span className="text-foreground font-semibold">{guesses.length}</span> / {maxGuesses}
            </p>}

            <button
              onClick={() => setShowRules(true)}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-primary"
              aria-label="How to play"
            >
              <HelpCircle className="w-4 h-4" /> How to play
            </button>
          </>
        }
      >
        {division ? <UfcDivisionRun /> : <>
        {isLoading ? (
          <div className="mb-8 flex justify-center">
            <p data-no-prerender className="text-muted-foreground text-sm animate-pulse">Loading today's puzzle…</p>
          </div>
        ) : gameStatus === 'playing' ? (
          <div className="mb-8 space-y-3">
            <UfcFighterSearch
              fighters={fighters}
              guessedNames={guessedFighterNames}
              onSelect={makeGuess}
            />
            <div className="flex justify-center">
              <GiveUpButton onGiveUp={giveUp} />
            </div>
          </div>
        ) : null}

        <UfcGameBoard key={mode} guesses={guesses} maxGuesses={maxGuesses} />

        {gameStatus !== 'playing' && (
          <div className="mt-8 flex justify-center">
            <ResultScreen
              won={gameStatus === 'won'}
              outcomeEmoji={gameStatus === 'won' ? '🏆' : '😞'}
              headline={gameStatus === 'won' ? 'Correct!' : 'Game Over'}
              statLine={
                gameStatus === 'won' ? (
                  <>
                    You guessed{' '}
                    <span className="font-bold text-primary">{targetFighter?.name}</span> in{' '}
                    {guesses.length} {guesses.length === 1 ? 'try' : 'tries'}!
                  </>
                ) : (
                  <>
                    The fighter was{' '}
                    <span className="font-bold text-primary">{targetFighter?.name}</span>
                  </>
                )
              }
              funFact={gameStatus === 'lost' ? <>{targetFighter?.weightClass} · {targetFighter?.record}</> : undefined}
              emojiGrid={ufcShareGrid(guesses)}
              share={{
                score: `${gameStatus === 'won' ? guesses.length : 'X'}/${maxGuesses} (${mode === 'daily' ? 'Daily' : 'Unlimited'})`,
                gameName: 'UFC Guesser',
                gamePath: '/ufc',
              }}
              onPlayAgain={mode === 'unlimited' ? resetGame : undefined}
              playNext={mode !== 'unlimited' && <p className="text-sm text-muted-foreground">Come back tomorrow for a new puzzle!</p>}
            />
          </div>
        )}

        </>}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-correct" />
            <span>Correct</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-close" />
            <span>Close</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-incorrect" />
            <span>Not a match</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>▲▼</span>
            <span>Higher / Lower hint</span>
          </div>
        </div>

        <GameSeoContent
          reportControl={<ReportQuestion gameType="ufc" gameContext={division ? { mode: 'division' } : { mode, targetFighter: targetFighter?.name }} />}
          pageHasOwnH1
          title="UFC Guesser: Guess the MMA Fighter | DoUKnowBall"
          description="Test your UFC and MMA knowledge with daily trivia puzzles covering fighters, records, weight classes and championship history."
          howToPlay={[
            "A mystery UFC fighter is selected. Guess who it is in 8 tries",
            "Each guess reveals clues: weight class, record, nationality and more",
            "Green means correct, yellow means close, red means wrong",
            "Use the higher/lower arrows to narrow down numeric stats",
          ]}
          examples={[
            "Conor McGregor: Featherweight/Lightweight, Ireland, 22-6",
            "Khabib Nurmagomedov: Lightweight, Russia, 29-0",
            "Jon Jones: Light Heavyweight/Heavyweight, USA, 27-1",
            "Amanda Nunes: Bantamweight/Featherweight, Brazil, 21-5",
            "Israel Adesanya: Middleweight, Nigeria/New Zealand, 24-3",
            "Charles Oliveira: Lightweight, Brazil, 34-10"
          ]}
        />

        <AdBanner slot="7540487748" format="horizontal" className="mt-8" />


        <GameNav />

        <UfcHowToPlay open={showRules} onOpenChange={setShowRules} />
      </GameShell>
    </>
  );
};

export default UfcGame;
