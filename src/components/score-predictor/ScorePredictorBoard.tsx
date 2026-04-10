import { useState } from 'react';
import { useScorePredictor } from '@/hooks/useScorePredictor';
import { GameNavbar } from '@/components/game/GameNavbar';
import ShareButtons from '@/components/game/ShareButtons';
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
    <div className="min-h-screen bg-background text-foreground">
      <GameNavbar />
      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-display font-bold text-primary">Score Predictor</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {mode === 'daily' ? '📅 Daily Challenge' : `♾️ Unlimited #${unlimitedIndex + 1}`}
          </p>
        </div>

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
                  onChange={e => setInputHome(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-3 rounded-xl border border-border bg-card text-foreground text-center text-2xl font-bold placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  autoFocus
                />
              </div>
              <span className="text-lg font-bold text-muted-foreground mt-5">–</span>
              <div className="flex-1 text-center">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                  {puzzle.awayTeam}
                </label>
                <input
                  type="number"
                  min={0}
                  max={200}
                  value={inputAway}
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
          <div className="rounded-2xl border border-border bg-card p-6 text-center space-y-4">
            {/* Score comparison */}
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Your Prediction</p>
              <p className="text-xl font-bold text-muted-foreground">
                {guessHome} – {guessAway}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Actual Score</p>
              <div className={cn(
                'text-3xl font-display font-bold transition-all',
                guessHome === puzzle.homeScore && guessAway === puzzle.awayScore
                  ? 'text-primary'
                  : 'text-foreground'
              )}>
                {puzzle.homeScore} – {puzzle.awayScore}
              </div>
            </div>

            <div className="space-y-1">
              <ScoreLabel score={score} />
              <p className="text-2xl font-display font-bold text-primary">{score} pts</p>
            </div>

            <p className="text-xs text-muted-foreground italic">💡 {puzzle.funFact}</p>

            <ShareButtons
              score={shareScore}
              gameName="Score Predictor"
              gamePath="/score-predictor"
              emojiGrid={emojiResult}
            />

            <div className="flex flex-col gap-2 pt-2">
              {mode === 'daily' && (
                <button
                  onClick={switchToUnlimited}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-border bg-card hover:bg-muted/50 text-sm font-semibold transition-colors"
                >
                  <RotateCcw className="w-4 h-4" /> Play Unlimited
                </button>
              )}
              {mode === 'unlimited' && (
                <button
                  onClick={() => { nextPuzzle(); setInputHome(''); setInputAway(''); }}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold transition-colors"
                >
                  Next Match →
                </button>
              )}
            </div>
          </div>
        )}

        <ReportQuestion
          gameType="score-predictor"
          gameContext={{ matchId: puzzle.id, homeTeam: puzzle.homeTeam, awayTeam: puzzle.awayTeam }}
        />
      </div>
    </div>
  );
}
