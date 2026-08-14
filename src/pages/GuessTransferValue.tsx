import { useState, useEffect, useMemo } from 'react';
import { useGuessTransferValue } from '@/hooks/useGuessTransferValue';
import { cn } from '@/lib/utils';
import { Minus, Plus } from 'lucide-react';
import { GameNav } from '@/components/game/GameNav';
import { GameShell } from '@/components/game/GameShell';
import { ResultScreen } from '@/components/game/ResultScreen';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PostGameStats from '@/components/game/PostGameStats';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { LatestGuessCard, GuessHistory } from '@/components/transfer-value/GuessHeat';

const fmtUsd = (n: number) =>
  '$' + Math.round(n).toLocaleString('en-US');

const fmtCompact = (n: number) => {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
};

const fmtPct = (p: number) => `${Math.round(p * 100)}%`;

const STEP_OPTIONS = [
  { label: '-10M', delta: -10_000_000 },
  { label: '-1M', delta: -1_000_000 },
  { label: '+1M', delta: 1_000_000 },
  { label: '+10M', delta: 10_000_000 },
];

const GuessTransferValue = () => {
  const {
    mode,
    switchMode,
    isLoading,
    target,
    guesses,
    gameStatus,
    makeGuess,
    newUnlimitedPlayer,
    maxGuesses,
    attemptsLeft,
    emojiGrid,
  } = useGuessTransferValue();

  const [input, setInput] = useState<number>(50_000_000);

  // Reset input when target changes
  useEffect(() => {
    if (target) setInput(50_000_000);
  }, [target?.name]);

  const sliderMax = useMemo(() => 300_000_000, []);

  const submit = () => {
    if (gameStatus !== 'playing') return;
    makeGuess(input);
  };

  return (
    <>
      <PageSeo
        title="Guess The Transfer Value: Daily Soccer Market Value Game | DoUKnowBall"
        description="Guess a real soccer player's transfer market value in 6 tries. New player every day."
        path="/guess-transfer-value"
      />
      <GameShell
        width="wide"
        title="GUESS THE VALUE"
        subtitle="Read the player's profile, then guess their transfer market value in 6 tries. Higher/lower & hot/cold feedback after each guess."
        headerExtra={
          <>
            <div className="flex items-center justify-center gap-1 mt-5 bg-secondary rounded-full p-1 w-fit mx-auto">
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

            <p className="text-sm text-muted-foreground mt-4">
              Guesses:{' '}
              <span className="text-foreground font-semibold">{guesses.length}</span>{' '}
              / {maxGuesses}
              {gameStatus === 'playing' && (
                <span className={cn('ml-2 font-semibold', attemptsLeft <= 2 ? 'text-destructive' : 'text-primary')}>
                  · {attemptsLeft} left
                </span>
              )}
            </p>
          </>
        }
      >
        {isLoading || !target ? (
          <div className="text-center py-16 text-muted-foreground animate-pulse">Loading today's player…</div>
        ) : (
          <>
            {/* Player profile card */}
            <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-xl">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground">{target.name}</h2>
                  <p className="text-primary font-semibold mt-1">{target.club}</p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">Position</div>
                  <div className="text-foreground font-semibold">{target.position}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6 text-center">
                <Stat label="Nationality" value={target.nationality} />
                <Stat label="Age" value={String(target.age || '-')} />
                <Stat label="Matches" value={String(target.matches || 0)} />
                <Stat label="Goals" value={String(target.goals || 0)} />
                <Stat label="Assists" value={String(target.assists || 0)} />
              </div>
            </div>

            {/* Input */}
            {gameStatus === 'playing' && (
              <div className="mt-6 bg-card border border-border rounded-2xl p-6 shadow-xl">
                <div className="text-center">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Your guess</div>
                  <div className="text-3xl md:text-4xl font-bold text-primary font-display">
                    {fmtUsd(input)}
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
                  {STEP_OPTIONS.map(s => (
                    <button
                      key={s.label}
                      onClick={() => setInput(v => Math.max(100_000, v + s.delta))}
                      className="px-3 py-1.5 text-sm rounded-lg border border-border hover:border-primary hover:text-primary transition-colors flex items-center gap-1"
                    >
                      {s.delta < 0 ? <Minus className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                      {s.label.replace(/[-+]/, '')}
                    </button>
                  ))}
                </div>

                <input
                  type="range"
                  min={100_000}
                  max={sliderMax}
                  step={500_000}
                  value={Math.min(input, sliderMax)}
                  onChange={(e) => setInput(Number(e.target.value))}
                  className="w-full mt-5 accent-primary"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>$100K</span>
                  <span>{fmtCompact(sliderMax)}</span>
                </div>

                <div className="flex items-center gap-2 mt-5">
                  <input
                    type="number"
                    value={input}
                    min={100_000}
                    onChange={(e) => setInput(Math.max(0, Number(e.target.value) || 0))}
                    className="flex-1 min-w-0 px-4 py-2 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:border-primary"
                    placeholder="Enter exact amount in USD"
                  />
                  <button
                    onClick={submit}
                    className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity"
                  >
                    Guess
                  </button>
                </div>
                <p className="text-center text-xs text-muted-foreground mt-3">
                  <span className={cn('font-semibold', attemptsLeft <= 2 ? 'text-destructive' : 'text-foreground')}>
                    {attemptsLeft}
                  </span>{' '}
                  {attemptsLeft === 1 ? 'guess' : 'guesses'} remaining · red means warmer, blue means colder
                </p>
              </div>
            )}

            {/* Guess feedback: current guess pinned big on top, then every
                guess sorted hottest -> coldest on the warm/cold scale. */}
            {guesses.length > 0 && (
              <div className="mt-6 space-y-2">
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  {gameStatus === 'playing' ? 'Latest guess' : 'Final guess'}
                </div>
                <LatestGuessCard g={guesses[guesses.length - 1]} />
                {guesses.length > 1 && (
                  <>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1 mt-4">
                      All guesses · hottest to coldest
                    </div>
                    <GuessHistory guesses={guesses} latest={guesses[guesses.length - 1]} />
                  </>
                )}
              </div>
            )}

            {/* Game over */}
            {gameStatus !== 'playing' && (
              <div className="mt-8 flex justify-center">
                <ResultScreen
                  won={gameStatus === 'won'}
                  outcomeEmoji={gameStatus === 'won' ? '🎯' : '😞'}
                  headline={gameStatus === 'won' ? 'Nailed it!' : 'Out of guesses'}
                  statLine={
                    <>
                      <span className="font-bold text-primary">{target.name}</span> is valued at{' '}
                      <span className="font-bold text-primary">{fmtUsd(target.marketValue)}</span>
                    </>
                  }
                  funFact={
                    guesses.length > 0
                      ? `Your first guess was ${fmtPct(guesses[0].pctOff)} off. ${target.club} · ${target.position}`
                      : `${target.club} · ${target.position}`
                  }
                  statRow={
                    guesses.length > 0
                      ? [
                          { label: 'First guess', value: `${fmtPct(guesses[0].pctOff)} off` },
                          {
                            label: 'Closest',
                            value: `${fmtPct(Math.min(...guesses.map(g => g.pctOff)))} off`,
                          },
                          { label: 'Guesses', value: `${guesses.length}/${maxGuesses}` },
                        ]
                      : undefined
                  }
                  emojiGrid={emojiGrid || `${gameStatus === 'won' ? '🎯' : '😞'} ${target.name}`}
                  share={{
                    score: gameStatus === 'won' ? `${guesses.length}/${maxGuesses} guesses` : `0/${maxGuesses}`,
                    gameName: 'Guess The Value',
                    gamePath: '/guess-transfer-value',
                  }}
                  onPlayAgain={mode === 'unlimited' ? newUnlimitedPlayer : undefined}
                  playAgainLabel="New Player"
                  playNext={mode === 'daily' ? 'Come back tomorrow for a new player!' : undefined}
                >
                  <PostGameStats
                    gameSlug="guess-transfer-value"
                    userScore={gameStatus === 'won' ? Math.max(100, (maxGuesses - guesses.length + 1) * 150) : 0}
                    isVisible={true}
                  />
                </ResultScreen>
              </div>
            )}
          </>
        )}

        <AdBanner slot="1234567890" format="horizontal" className="mt-8" />

        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="guess-transfer-value" gameContext={{ target: target?.name }} />
        </div>

        <GameSeoContent
          title="Guess The Transfer Value: Daily Soccer Market Value Game"
          description="Read a real soccer player's profile and guess their transfer market value in 6 tries. After each guess, see higher/lower and a hot/cold cue to narrow in."
          howToPlay={[
            'Look at the player profile: club, position, nationality, age, and season stats.',
            'Enter your guess of their transfer market value (USD).',
            'After each guess you get higher/lower and a hot/cold cue. Win by getting within 5% in 6 tries.',
          ]}
          examples={[
            'Top stars sit in the $150M+ range.',
            'Most starting XI players from top-5 leagues land between $20M and $80M.',
            'Aging legends often have lower market values than their reputation suggests.',
          ]}
        />
        <GameNav />
      </GameShell>
    </>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-background/50 border border-border rounded-lg p-2">
    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
    <div className="text-sm font-semibold text-foreground truncate">{value}</div>
  </div>
);

export default GuessTransferValue;
