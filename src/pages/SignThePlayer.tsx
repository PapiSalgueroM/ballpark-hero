import { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GameShell } from '@/components/game/GameShell';
import { ResultScreen } from '@/components/game/ResultScreen';
import { StatTile } from '@/components/game/StatTile';
import { HowToPlayPopover } from '@/components/game/HowToPlayPopover';
import { GameNav } from '@/components/game/GameNav';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { getTodayET } from '@/lib/dateUtils';
import { flagFor, fmtCompactUsd } from '@/lib/dealPlayers';
import {
  fetchMarketPool,
  buildSlateForMode,
  isWithinTolerance,
  summarizeSquad,
  gradeSquad,
  buildEmojiGrid,
  roundSummaryLine,
  type PlayMode,
  type MarketPlayer,
  type RoundSlot,
  type RoundOutcome,
} from '@/lib/signThePlayer';

type Phase = 'boot' | 'error' | 'playing' | 'revealed' | 'done';

/**
 * Sign the Player: "Guess the Value, Get the Player" (MASTER_PLAN #54). See
 * src/lib/signThePlayer.ts for the full mechanic writeup, verified pool
 * sizes, and tolerance-band formula. 11 rounds, one per slot of a real
 * formation; each round shows a real current player with market value
 * hidden, and a correct-enough guess signs them into that formation slot.
 */
const SignThePlayer = () => {
  const [playMode, setPlayMode] = useState<PlayMode>('daily');

  const [phase, setPhase] = useState<Phase>('boot');
  const [pool, setPool] = useState<MarketPlayer[]>([]);
  const [rounds, setRounds] = useState<RoundSlot[]>([]);
  const [formationName, setFormationName] = useState('');
  const [roundIndex, setRoundIndex] = useState(0);
  const [outcomes, setOutcomes] = useState<RoundOutcome[]>([]);

  const [guessValue, setGuessValue] = useState('');
  const [lastOutcome, setLastOutcome] = useState<RoundOutcome | null>(null);

  const currentRound = rounds[roundIndex];

  // Every hook lives above this point and none of them are conditional, per
  // the site's React error #310 rule (hooks must never sit below an early
  // return). The loading/error UI is decided entirely in the JSX below.

  const startRun = useCallback((nextPlayMode: PlayMode, sourcePool: MarketPlayer[]) => {
    setPlayMode(nextPlayMode);
    const slate = buildSlateForMode(nextPlayMode, sourcePool);
    if (!slate || slate.rounds.length === 0) {
      setPhase('error');
      return;
    }
    setRounds(slate.rounds);
    setFormationName(slate.formation.name);
    setRoundIndex(0);
    setOutcomes([]);
    setGuessValue('');
    setLastOutcome(null);
    setPhase('playing');
  }, []);

  // Boot: fetch the pool once, then start the daily run.
  useEffect(() => {
    let cancelled = false;
    fetchMarketPool()
      .then(fetched => {
        if (cancelled) return;
        if (!fetched || fetched.length === 0) {
          setPhase('error');
          return;
        }
        setPool(fetched);
        startRun('daily', fetched);
      })
      .catch(() => {
        if (!cancelled) setPhase('error');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchPlayMode = (m: PlayMode) => {
    if (m === playMode || pool.length === 0) return;
    startRun(m, pool);
  };

  const submitGuess = () => {
    if (!currentRound || phase !== 'playing') return;
    const parsed = Number(guessValue.replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(parsed) || parsed < 0) return;

    const trueValue = currentRound.player.value;
    const signed = isWithinTolerance(parsed, trueValue, currentRound.tolerance);
    const errorFraction = trueValue > 0 ? Math.abs(parsed - trueValue) / trueValue : 1;

    const outcome: RoundOutcome = {
      slot: currentRound.slot,
      player: currentRound.player,
      guess: parsed,
      tolerance: currentRound.tolerance,
      errorFraction,
      signed,
    };
    setLastOutcome(outcome);
    setOutcomes(o => [...o, outcome]);
    setPhase('revealed');
  };

  const nextRound = () => {
    const nextIndex = roundIndex + 1;
    if (nextIndex >= rounds.length) {
      setPhase('done');
      return;
    }
    setRoundIndex(nextIndex);
    setGuessValue('');
    setLastOutcome(null);
    setPhase('playing');
  };

  const summary = useMemo(() => summarizeSquad(outcomes), [outcomes]);
  const { grade, headline } = useMemo(() => gradeSquad(summary), [summary]);
  const isComplete = phase === 'done';

  // Score = total value of the signed squad (USD), correctAnswers = signed count.
  useGameCompletion('sign-the-player', isComplete, summary.totalValue, summary.signedCount);

  const emojiGrid = useMemo(() => buildEmojiGrid(outcomes, summary), [outcomes, summary]);

  const outcomeEmoji = summary.signedCount === summary.totalRounds && summary.totalRounds > 0
    ? '🏆'
    : summary.signedCount >= summary.totalRounds * 0.6
    ? '⚽'
    : summary.signedCount > 0
    ? '🧐'
    : '📉';

  return (
    <>
      <PageSeo
        title="Sign the Player | DoUKnowBall"
        description="Guess a real footballer's market value to sign them into your XI. 11 rounds, real transfer data, tighter tolerance for the superstars. Free to play daily."
        path="/sign-the-player"
      />
      <GameShell
        width="narrow"
        title="SIGN THE PLAYER"
        subtitle="Guess each player's market value closely enough to sign them into your XI."
        headerExtra={
          <>
            <HowToPlayPopover title="How to Play Sign the Player">
              <section>
                <h3 className="font-bold text-foreground mb-2">🎯 The idea</h3>
                <p className="text-muted-foreground">
                  Each of the 11 rounds shows a real current player: club, nationality, position and
                  age, all visible. Their market value is hidden. Type your best guess in US dollars.
                </p>
              </section>
              <section>
                <h3 className="font-bold text-foreground mb-2">✍️ Signing a player</h3>
                <p className="text-muted-foreground">
                  Guess close enough to the real value and you SIGN that player into your XI at their
                  position. Miss by too much and the round is lost, leaving that spot empty.
                </p>
              </section>
              <section>
                <h3 className="font-bold text-foreground mb-2">🎚️ Tolerance</h3>
                <p className="text-muted-foreground">
                  Superstars are worth more but are also more famous, so the window to sign them is
                  tighter. Lesser-known players give you a much wider window to land the guess.
                </p>
              </section>
              <section>
                <h3 className="font-bold text-foreground mb-2">🏆 Scoring</h3>
                <p className="text-muted-foreground">
                  Your final squad is rated on how many of the 11 slots you filled and the total value
                  of everyone you signed.
                </p>
              </section>
              <section>
                <h3 className="font-bold text-foreground mb-2">📅 Daily vs Unlimited</h3>
                <p className="text-muted-foreground">
                  Daily gives everyone the same 11 players and formation each day. Unlimited shuffles a
                  fresh slate every time you play.
                </p>
              </section>
            </HowToPlayPopover>

            {/* Daily / Unlimited toggle */}
            <div className="flex items-center justify-center gap-1 mt-6 bg-secondary rounded-full p-1 w-fit mx-auto">
              {(['daily', 'unlimited'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => switchPlayMode(m)}
                  disabled={pool.length === 0}
                  className={cn(
                    'px-5 py-2 rounded-full text-sm font-semibold transition-all disabled:opacity-50',
                    playMode === m ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {m === 'daily' ? '📅 Daily' : '∞ Unlimited'}
                </button>
              ))}
            </div>

            {playMode === 'daily' && (
              <p className="text-xs text-muted-foreground mt-3">Today's slate, {getTodayET()}. Same 11 players for everyone.</p>
            )}
          </>
        }
      >
        {phase === 'boot' && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {phase === 'error' && (
          <div className="text-center py-12">
            <p className="text-destructive font-semibold mb-3">Couldn't load Sign the Player right now.</p>
            <button
              onClick={() => (pool.length > 0 ? startRun(playMode, pool) : window.location.reload())}
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-semibold"
            >
              Try again
            </button>
          </div>
        )}

        {phase !== 'boot' && phase !== 'error' && phase !== 'done' && currentRound && (
          <div className="space-y-5">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground font-semibold uppercase tracking-wider">
              <span>
                Round {roundIndex + 1} of {rounds.length} &middot; {formationName}
              </span>
              {outcomes.length > 0 && (
                <span className="text-primary">&middot; Signed {summary.signedCount}/{outcomes.length}</span>
              )}
            </div>

            <div className="bg-surface-1 border border-border rounded-2xl p-6 text-center">
              <p className="text-xl md:text-2xl font-display font-bold text-foreground mb-1">
                {currentRound.player.name}
              </p>
              <p className="text-sm text-muted-foreground">
                Signing for the <span className="font-semibold text-foreground">{currentRound.slot.label}</span> slot
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <StatTile label="Club" value={currentRound.player.club} state="pending" />
              <StatTile label="Nationality" value={flagFor(currentRound.player.nationality)} state="pending" />
              <StatTile label="Position" value={currentRound.player.position} state="pending" />
              <StatTile label="Age" value={currentRound.player.age || '?'} state="pending" />
            </div>

            {phase === 'playing' && (
              <div className="space-y-3">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={guessValue}
                    onChange={e => setGuessValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') submitGuess();
                    }}
                    placeholder="Guess the market value..."
                    autoFocus
                    className="w-full rounded-xl border border-border bg-card pl-8 pr-4 py-3 text-sm text-foreground text-center placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <button
                  onClick={submitGuess}
                  disabled={!guessValue.trim()}
                  className="w-full py-3.5 min-h-[44px] bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Submit bid
                </button>
              </div>
            )}

            {phase === 'revealed' && lastOutcome && (
              <div
                className={cn(
                  'bg-surface-1 border rounded-2xl p-6 text-center animate-pop-correct',
                  lastOutcome.signed
                    ? 'border-correct shadow-[0_0_24px_hsl(var(--success-glow))]'
                    : 'border-destructive/50',
                )}
              >
                <p className="text-2xl mb-1">{lastOutcome.signed ? '✅ SIGNED' : '❌ MISSED'}</p>
                <p className="text-sm text-muted-foreground mb-1">
                  True value: <span className="font-bold text-foreground">{fmtCompactUsd(lastOutcome.player.value)}</span>
                </p>
                <p className="text-sm text-muted-foreground mb-3">
                  Your bid: {fmtCompactUsd(lastOutcome.guess)} &middot; off by {Math.round(lastOutcome.errorFraction * 100)}%
                  {!lastOutcome.signed && ` (needed within ${Math.round(lastOutcome.tolerance * 100)}%)`}
                </p>
                <button
                  onClick={nextRound}
                  className="px-8 py-3 min-h-[44px] bg-primary text-primary-foreground rounded-full font-semibold hover:opacity-90 transition-opacity"
                >
                  {roundIndex + 1 >= rounds.length ? 'See final squad' : 'Next round'}
                </button>
              </div>
            )}
          </div>
        )}

        {phase === 'done' && (
          <div className="mt-4">
            <ResultScreen
              won={summary.signedCount === summary.totalRounds}
              outcomeEmoji={outcomeEmoji}
              headline={headline}
              statLine={`You signed ${summary.signedCount} of ${summary.totalRounds} players`}
              statRow={[
                { label: 'Grade', value: grade },
                { label: 'Squad Value', value: fmtCompactUsd(summary.totalValue) },
                { label: 'Signed', value: `${summary.signedCount}/${summary.totalRounds}` },
              ]}
              emojiGrid={emojiGrid}
              share={{
                score: fmtCompactUsd(summary.totalValue),
                gameName: 'Sign the Player',
                gamePath: '/sign-the-player',
              }}
              onPlayAgain={() => startRun('unlimited', pool)}
              playAgainLabel={playMode === 'daily' ? 'Play Unlimited' : 'New slate'}
            >
              <div className="text-left text-sm text-muted-foreground space-y-1 my-4 py-3 px-4 rounded-xl bg-surface-2 border border-border/60">
                {outcomes.map((o, i) => (
                  <p key={i}>{roundSummaryLine(o)}</p>
                ))}
              </div>
            </ResultScreen>
          </div>
        )}

        <AdBanner slot="1234567892" format="horizontal" className="mt-8" />

        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="sign-the-player" />
        </div>

        <GameSeoContent
          title="Sign the Player: Guess the Value, Get the Player"
          description="A transfer-market trivia game built on real soccer data. Guess a real player's market value closely enough and sign them into your XI. Tolerance is tighter for the biggest stars."
          howToPlay={[
            'Read the player\'s club, nationality, position and age.',
            'Type your best guess of their market value in US dollars.',
            'Guess close enough and you sign them into your XI at their position.',
            'Play all 11 rounds, then see your final squad rated.',
          ]}
        />
        <GameNav />
      </GameShell>
    </>
  );
};

export default SignThePlayer;
