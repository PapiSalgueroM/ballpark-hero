import { useState } from 'react';
import { useScorePredictor } from '@/hooks/useScorePredictor';
import { GameShell } from '@/components/game/GameShell';
import { ResultScreen } from '@/components/game/ResultScreen';
import ReportQuestion from '@/components/game/ReportQuestion';
import { RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

const SPORT_EMOJI: Record<string, string> = { soccer: '⚽', nfl: '🏈', nba: '🏀' };

function ScoreLabel({ score }: { score: number }) {
  if (score === 1000) return <span className="text-primary font-bold">Exact Score! 🎯</span>;
  if (score >= 700) return <span className="text-primary font-bold">Close! 🔥</span>;
  if (score >= 400) return <span className="text-foreground font-bold">Not bad!</span>;
  if (score >= 200) return <span className="text-muted-foreground font-bold">Right winner</span>;
  return <span className="text-muted-foreground font-bold">Wrong winner</span>;
}

export function ScorePredictorBoard() {
  const {
    puzzle, status, guessHome, guessAway, score, mode,
    submit, switchToUnlimited, nextPuzzle, unlimitedIndex,
  } = useScorePredictor();

  const [inputHome, setInputHome] = useState('');
  const [inputAway, setInputAway] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const h = parseInt(inputHome, 10);
    const a = parseInt(inputAway, 10);
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) return;
    submit(h, a);
  };

  const isRevealed = status === 'revealed';

  const emojiResult = isRevealed
    ? `${guessHome}-${guessAway} → ${puzzle.homeScore}-${puzzle.awayScore}`
    : '';
  const shareScore = isRevealed ? `${score} pts` : '';

  return (
    <GameShell
      width="narrow"
      title="Score Predictor"
      headerExtra={
        <p className="text-xs text-muted-foreground mt-1">
          {mode === 'daily' ? '📅 Daily Challenge' : `♾️ Unlimited #${unlimitedIndex + 1}`}
        </p>
      }
    >
      <div className="space-y-6">
        {/* Match card */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          {/* Competition & date */}
          <div className="text-center space-y-1">
            <span className="text-2xl">{SPORT_EMOJI[puzzle.sport]}</span>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">{puzzle.competition}</p>
            <p className="text-[11px] text-muted-foreground">{puzzle.date}</p>
          </div>

          {/* Teams */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 text-center">
              <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mx-auto text-xl font-bold text-foreground">
                {puzzle.homeTeam.slice(0, 3).toUpperCase()}
              </div>
              <p className="text-sm font-bold text-foreground mt-2">{puzzle.homeTeam}</p>
              <p className="text-[10px] text-muted-foreground">Home</p>
            </div>
            <span className="text-lg font-bold text-muted-foreground">vs</span>
            <div className="flex-1 text-center">
              <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mx-auto text-xl font-bold text-foreground">
                {puzzle.awayTeam.slice(0, 3).toUpperCase()}
              </div>
              <p className="text-sm font-bold text-foreground mt-2">{puzzle.awayTeam}</p>
              <p className="text-[10px] text-muted-foreground">Away</p>
            </div>
          </div>

          {/* Hint */}
          <div className="rounded-lg bg-primary/5 border border-primary/10 px-3 py-2 text-center">
            <p className="text-xs text-muted-foreground">💡 <span className="italic">{puzzle.hint}</span></p>
          </div>
        </div>

        {/* Input area */}
        {!isRevealed && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 text-center">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                  {puzzle.homeTeam}
                </label>
                <input
                  type="number"
                  min={0}
                  max={200}
                  value={inputHome}
                  aria-label={`${puzzle.homeTeam} score`}
                  onChange={e => setInputHome(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-3 rounded-xl border border-border bg-card text-foreground text-center text-2xl font-bold placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  autoFocus
                />
              </div>
              <span className="text-lg font-bold text-muted-foreground mt-5">v</span>
              <div className="flex-1 text-center">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                  {puzzle.awayTeam}
                </label>
                <input
                  type="number"
                  min={0}
                  max={200}
                  value={inputAway}
                  aria-label={`${puzzle.awayTeam} score`}
                  onChange={e => setInputAway(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-3 rounded-xl border border-border bg-card text-foreground text-center text-2xl font-bold placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={inputHome === '' || inputAway === ''}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-40 transition-opacity"
            >
              Lock In Prediction
            </button>
          </form>
        )}

        {/* Result */}
        {isRevealed && (
          <ResultScreen
            won={guessHome === puzzle.homeScore && guessAway === puzzle.awayScore}
            outcomeEmoji="⚽"
            headline="Result Revealed"
            statLine={
              <>
                Your Prediction: <span className="font-bold text-foreground">{guessHome} - {guessAway}</span>
                {' · '}
                Actual: <span className={cn('font-bold', guessHome === puzzle.homeScore && guessAway === puzzle.awayScore ? 'text-primary' : 'text-foreground')}>{puzzle.homeScore} - {puzzle.awayScore}</span>
              </>
            }
            funFact={puzzle.funFact}
            statRow={[{ label: 'Score', value: <ScoreLabel score={score} /> }, { label: 'Points', value: `${score} pts` }]}
            emojiGrid={emojiResult}
            share={{
              score: shareScore,
              gameName: 'Score Predictor',
              gamePath: '/score-predictor',
            }}
            onPlayAgain={mode === 'unlimited' ? () => { nextPuzzle(); setInputHome(''); setInputAway(''); } : undefined}
            playAgainLabel="Next Match →"
            playNext={
              mode === 'daily' ? (
                <button
                  onClick={switchToUnlimited}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-border bg-card hover:bg-muted/50 text-sm font-semibold transition-colors"
                >
                  <RotateCcw className="w-4 h-4" /> Play Unlimited
                </button>
              ) : undefined
            }
          />
        )}

        <ReportQuestion
          gameType="score-predictor"
          gameContext={{ matchId: puzzle.id, homeTeam: puzzle.homeTeam, awayTeam: puzzle.awayTeam }}
        />
      </div>
    </GameShell>
  );
}
