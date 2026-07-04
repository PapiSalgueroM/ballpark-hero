import { useHofOrBust } from '@/hooks/useHofOrBust';
import { GameShell } from '@/components/game/GameShell';
import { ResultScreen } from '@/components/game/ResultScreen';
import ReportQuestion from '@/components/game/ReportQuestion';
import { Eye, RotateCcw, Trophy, Skull } from 'lucide-react';
import { cn } from '@/lib/utils';

const SPORT_EMOJI: Record<string, string> = {
  soccer: '⚽', nfl: '🏈', nba: '🏀', baseball: '⚾', hockey: '🏒',
};

const VERDICT_LABEL: Record<string, { text: string; color: string }> = {
  hof: { text: '🏆 Hall of Fame', color: 'text-yellow-400' },
  borderline: { text: '⚖️ Borderline', color: 'text-blue-400' },
  bust: { text: '💀 Bust', color: 'text-red-400' },
};

export function HofOrBustBoard() {
  const {
    player, hintsRevealed, status, userVote, score, mode,
    communityVotes, vote, revealHint, switchToUnlimited, nextPuzzle, unlimitedIndex,
  } = useHofOrBust();

  const isRevealed = status === 'revealed';
  const verdictInfo = VERDICT_LABEL[player.verdict];
  const hofPct = communityVotes && (communityVotes.hof + communityVotes.bust) > 0
    ? Math.round((communityVotes.hof / (communityVotes.hof + communityVotes.bust)) * 100)
    : null;

  const shareScore = isRevealed ? `${score} pts` : '';
  const emojiResult = isRevealed
    ? `${userVote === 'hof' ? '🏆' : '💀'} → ${verdictInfo.text}`
    : '';

  return (
    <GameShell
      width="narrow"
      title="Hall of Fame or Bust?"
      subtitle="Look at the anonymized stats and vote: Hall of Famer or bust?"
      headerExtra={
        <p className="text-xs text-muted-foreground mt-1">
          {mode === 'daily' ? '📅 Daily Challenge' : `♾️ Unlimited #${unlimitedIndex + 1}`}
        </p>
      }
    >
      <div className="space-y-6">
        {/* Player card */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          {/* Sport badge */}
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl">{SPORT_EMOJI[player.sport]}</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {player.sport === 'nfl' ? 'NFL' : player.sport === 'nba' ? 'NBA' : player.sport.charAt(0).toUpperCase() + player.sport.slice(1)}
            </span>
          </div>

          {/* Mystery player indicator */}
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto text-3xl">
            {isRevealed ? SPORT_EMOJI[player.sport] : '❓'}
          </div>

          {isRevealed && (
            <h2 className="text-xl font-bold text-foreground text-center">{player.answer}</h2>
          )}

          {/* Stats */}
          <div className="space-y-1.5">
            {player.anonymizedStats.map((stat, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="text-primary mt-0.5">•</span>
                <span className="text-foreground">{stat}</span>
              </div>
            ))}
          </div>

          {/* Hints */}
          {hintsRevealed > 0 && (
            <div className="border-t border-border pt-3 space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Hints</p>
              {player.hints.slice(0, hintsRevealed).map((hint, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-yellow-500 mt-0.5">💡</span>
                  <span className="text-muted-foreground">{hint}</span>
                </div>
              ))}
            </div>
          )}

          {/* Hint button */}
          {!isRevealed && hintsRevealed < player.hints.length && (
            <button
              onClick={revealHint}
              className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              Reveal hint ({hintsRevealed + 1}/{player.hints.length}) · −100 pts
            </button>
          )}
        </div>

        {/* Vote buttons */}
        {!isRevealed && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => vote('hof')}
              className="flex flex-col items-center gap-1 py-5 rounded-2xl border-2 border-yellow-500/30 bg-yellow-500/5 hover:bg-yellow-500/15 hover:border-yellow-500/60 transition-all text-yellow-400 font-bold"
            >
              <Trophy className="w-8 h-8" />
              <span className="text-sm">Hall of Fame</span>
            </button>
            <button
              onClick={() => vote('bust')}
              className="flex flex-col items-center gap-1 py-5 rounded-2xl border-2 border-red-500/30 bg-red-500/5 hover:bg-red-500/15 hover:border-red-500/60 transition-all text-red-400 font-bold"
            >
              <Skull className="w-8 h-8" />
              <span className="text-sm">Bust</span>
            </button>
          </div>
        )}

        {/* Result */}
        {isRevealed && (
          <ResultScreen
            outcomeEmoji={userVote === 'hof' ? '🏆' : '💀'}
            headline="Verdict Revealed"
            statLine={
              <>
                You voted: <span className="font-bold text-foreground">{userVote === 'hof' ? '🏆 Hall of Fame' : '💀 Bust'}</span>
                {' · '}
                Official verdict: <span className={cn('font-bold', verdictInfo.color)}>{verdictInfo.text}</span>
              </>
            }
            funFact={player.funFact}
            statRow={[{ label: 'Score', value: `${score} pts` }]}
            emojiGrid={emojiResult}
            share={{
              score: shareScore,
              gameName: 'Hall of Fame or Bust?',
              gamePath: '/hof-or-bust',
            }}
            onPlayAgain={mode === 'unlimited' ? nextPuzzle : undefined}
            playAgainLabel="Next Player →"
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
          >
            {/* Community donut */}
            {communityVotes && (communityVotes.hof + communityVotes.bust) > 0 && (
              <div className="space-y-2 mb-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Community Vote</p>
                <div className="flex items-center justify-center gap-4">
                  <div className="relative w-20 h-20">
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                      <circle cx="18" cy="18" r="15.9" fill="none" className="stroke-red-500/30" strokeWidth="3" />
                      <circle
                        cx="18" cy="18" r="15.9" fill="none"
                        className="stroke-yellow-500"
                        strokeWidth="3"
                        strokeDasharray={`${hofPct} ${100 - (hofPct ?? 0)}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-foreground">
                      {hofPct}%
                    </span>
                  </div>
                  <div className="text-left text-xs space-y-1">
                    <p><span className="inline-block w-2 h-2 rounded-full bg-yellow-500 mr-1.5" />HOF: {communityVotes.hof}</p>
                    <p><span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1.5" />Bust: {communityVotes.bust}</p>
                  </div>
                </div>
              </div>
            )}
          </ResultScreen>
        )}

        <ReportQuestion
          gameType="hof-or-bust"
          gameContext={{ playerId: player.id, answer: player.answer }}
        />
      </div>
    </GameShell>
  );
}
