import { useEffect, useMemo, useState, useCallback } from 'react';
import { GameNav } from '@/components/game/GameNav';
import { GameShell } from '@/components/game/GameShell';
import { ResultScreen } from '@/components/game/ResultScreen';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { useDailyPuzzle } from '@/hooks/useDailyPuzzle';
import { cn } from '@/lib/utils';
import { Loader2, TrendingUp, TrendingDown, Trophy } from 'lucide-react';
import {
  StockRound,
  StockPlayer,
  STOCK_PICKS,
  dailyStockSeed,
  randomStockSeed,
  fetchStockRound,
  playerReturn,
  scoreRound,
  formatMoney,
  formatPct,
} from '@/lib/playerStockMarket';

/**
 * Player Stock Market (task #36). Six real players at a real past year with
 * real market values; buy exactly 3, the market advances one real year, and
 * your portfolio return is scored against the best possible trio. All values
 * come from player_market_values at runtime, nothing authored.
 */

type Mode = 'daily' | 'unlimited';
type StockAction = { t: 'lock'; picks: string[] };
const SENTINEL = [{ id: 'player-stock-market-daily' }];

function Sparkline({ p, revealed }: { p: StockPlayer; revealed: boolean }) {
  const pts = revealed ? [...p.series, { year: 0, value: p.next }] : p.series;
  if (pts.length < 2) return <div className="h-8" />;
  const vals = pts.map((x) => x.value);
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = max - min || 1;
  const W = 96, H = 32;
  const step = W / (pts.length - 1);
  const poly = pts.map((x, i) => `${(i * step).toFixed(1)},${(H - 4 - ((x.value - min) / span) * (H - 8)).toFixed(1)}`).join(' ');
  const up = revealed ? p.next >= p.current : vals[vals.length - 1] >= vals[0];
  return (
    <svg width={W} height={H} className="overflow-visible">
      <polyline
        points={poly}
        fill="none"
        strokeWidth="2"
        className={up ? 'stroke-emerald-400' : 'stroke-red-400'}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

const PlayerStockMarket = () => {
  const [mode, setMode] = useState<Mode>('daily');

  const daily = useMemo(() => dailyStockSeed(), []);
  const [unl, setUnl] = useState(() => randomStockSeed());
  const active = mode === 'daily' ? daily : unl;

  const [round, setRound] = useState<StockRound | null>(null);
  const [loadingRound, setLoadingRound] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoadingRound(true);
    setLoadError(false);
    setRound(null);
    fetchStockRound(active.year, active.seed).then((r) => {
      if (!alive) return;
      if (r) setRound(r);
      else setLoadError(true);
      setLoadingRound(false);
    });
    return () => { alive = false; };
  }, [active.year, active.seed]);

  const {
    guesses: dailyActions,
    addGuess: addDailyAction,
    gameStatus: rawDailyStatus,
    isLoading,
  } = useDailyPuzzle<{ id: string }, StockAction>({
    gameSlug: 'player-stock-market',
    puzzles: SENTINEL,
    maxGuesses: 999,
    isWon: (g) => g.some((a) => a.t === 'lock'),
    isLost: () => false,
    deserializeGuesses: (raw) => raw as StockAction[],
  });

  // Round 67: the mirror of the base game. Classic is numbers only (names
  // hidden). Names style shows you exactly who they are and hides every number
  // until the market moves, so you are buying on reputation alone. Unlimited
  // only, so the daily stays one shared fair test.
  const [style, setStyle] = useState<'numbers' | 'names'>('numbers');
  const namesStyle = mode === 'unlimited' && style === 'names';

  const [unlimitedActions, setUnlimitedActions] = useState<StockAction[]>([]);
  const actions = mode === 'daily' ? dailyActions : unlimitedActions;
  const locked = actions.find((a) => a.t === 'lock');

  const [picks, setPicks] = useState<string[]>([]);
  const effectivePicks = locked ? locked.picks : picks;

  const result = useMemo(() => {
    if (!locked || !round) return null;
    return scoreRound(round.players, locked.picks);
  }, [locked, round]);

  useGameCompletion('player-stock-market', mode === 'daily' && rawDailyStatus !== 'playing', result?.score ?? 0);

  const togglePick = useCallback((name: string) => {
    if (locked) return;
    setPicks((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name)
        : prev.length >= STOCK_PICKS ? prev
        : [...prev, name]
    );
  }, [locked]);

  const lockIn = useCallback(() => {
    if (locked || picks.length !== STOCK_PICKS) return;
    const a: StockAction = { t: 'lock', picks };
    if (mode === 'daily') addDailyAction(a);
    else setUnlimitedActions([a]);
  }, [locked, picks, mode, addDailyAction]);

  const newUnlimited = useCallback(() => {
    setUnl(randomStockSeed());
    setUnlimitedActions([]);
    setPicks([]);
  }, []);

  const switchMode = useCallback((m: Mode) => { setMode(m); setPicks([]); }, []);

  const switchStyle = useCallback((st: 'numbers' | 'names') => {
    setStyle(st);
    setUnl(randomStockSeed());
    setUnlimitedActions([]);
    setPicks([]);
  }, []);

  const revealed = !!locked && !!round;

  return (
    <>
      <PageSeo
        title="Player Stock Market - Buy Low, Sell High on Real Careers | DoUKnowBall"
        description="Six real players at a real past season with their real market values. Buy three, then watch the market advance one real year. Can you beat the optimal portfolio?"
        path="/player-stock-market"
      />
      <GameShell
        width="narrow"
        title="📈 PLAYER STOCK MARKET"
        subtitle="You don't know who they are. Buy 3 mystery players on the numbers alone, then the market moves one real year and the names drop."
        headerExtra={
          <div className="flex flex-col items-center gap-2 mt-4">
          <div className="flex items-center justify-center gap-1 bg-secondary rounded-full p-1 w-fit mx-auto">
            {(['daily', 'unlimited'] as const).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={cn(
                  'px-5 py-1.5 rounded-full text-sm font-semibold transition-all',
                  mode === m ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {m === 'daily' ? '📅 Daily' : '∞ Unlimited'}
              </button>
            ))}
          </div>
          {mode === 'unlimited' && (
            <div className="flex items-center justify-center gap-1 bg-secondary rounded-full p-1 w-fit mx-auto">
              {(['numbers', 'names'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => switchStyle(st)}
                  className={cn(
                    'px-4 py-1 rounded-full text-xs font-semibold transition-all',
                    style === st ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {st === 'numbers' ? '🔢 Numbers only' : '🧠 Names only'}
                </button>
              ))}
            </div>
          )}
          </div>
        }
      >
        {(isLoading || loadingRound) && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && !loadingRound && loadError && (
          <p className="text-center text-muted-foreground py-12">
            The market is closed (couldn't load player values). Try again shortly.
          </p>
        )}

        {!isLoading && !loadingRound && round && (
          <>
            <div className="text-center mb-4">
              <p className="text-sm font-bold text-primary">Market year: {round.year}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {revealed
                  ? `The market advanced to ${round.year + 1}. Real values revealed.`
                  : namesStyle
                    ? `You know exactly who they are. You have no idea what they cost. Buy ${STOCK_PICKS}, then the market advances to ${round.year + 1} for real.`
                    : `Buy exactly ${STOCK_PICKS}, then the market advances to ${round.year + 1} for real.`}
              </p>
            </div>

            <div className="max-w-md mx-auto space-y-2 mb-5">
              {round.players.map((p, idx) => {
                const bought = effectivePicks.includes(p.name);
                const r = playerReturn(p);
                const inBest = result?.bestPicks.includes(p.name);
                // Owner 2026-08-05 (box2box rules): you invest BLIND. Names and
                // clubs stay hidden until the market moves; you only get the
                // numbers: position, age, nationality and the value history.
                const mysteryLabel = `Mystery ${p.position} ${String.fromCharCode(65 + idx)}`;
                return (
                  <button
                    key={p.name}
                    onClick={() => togglePick(p.name)}
                    disabled={!!locked}
                    className={cn(
                      'w-full text-left rounded-xl border px-3 py-2.5 transition-all flex items-center gap-3',
                      bought ? 'border-primary bg-primary/10' : 'border-border bg-card',
                      !locked && 'hover:border-primary/50 cursor-pointer',
                      locked && 'cursor-default'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground truncate">
                          {revealed || namesStyle ? p.name : `🕵️ ${mysteryLabel}`}
                        </span>
                        {bought && <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary text-primary-foreground shrink-0">Bought</span>}
                        {revealed && inBest && <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-gold/20 text-gold shrink-0">Optimal</span>}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {revealed || namesStyle ? `${p.club} · ` : ''}{p.position} · age {p.age} · {p.nationality}
                      </p>
                      <p className="text-sm font-bold mt-0.5 text-foreground">
                        {namesStyle && !revealed ? '€ hidden' : formatMoney(p.current)}
                        {revealed && (
                          <span className={cn('ml-2 inline-flex items-center gap-1 text-xs font-bold', r >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                            {r >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                            {formatMoney(p.next)} ({formatPct(r)})
                          </span>
                        )}
                      </p>
                    </div>
                    {namesStyle && !revealed
                      ? <span className="text-lg" aria-hidden="true">🤫</span>
                      : <Sparkline p={p} revealed={revealed} />}
                  </button>
                );
              })}
            </div>

            {!locked && (
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={lockIn}
                  disabled={picks.length !== STOCK_PICKS}
                  className="px-8 py-3 rounded-full bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  Lock in portfolio ({picks.length}/{STOCK_PICKS})
                </button>
                <p className="text-[11px] text-muted-foreground">Tap players to buy and sell before locking in.</p>
              </div>
            )}

            {revealed && result && (
              <div className="mt-4 flex justify-center">
                <ResultScreen
                  won={result.score >= 50}
                  outcomeEmoji={result.score >= 90 ? '🐐' : result.score >= 50 ? '📈' : '📉'}
                  headline={`Portfolio: ${formatPct(result.yourReturn)}`}
                  statLine={<>Market year {round.year} → {round.year + 1}</>}
                  funFact={<>💡 Best possible trio returned {formatPct(result.bestReturn)}; the worst returned {formatPct(result.worstReturn)}.</>}
                  statRow={[{ label: 'Score', value: <span className="inline-flex items-center gap-1"><Trophy className="w-4 h-4" />{result.score}/100</span> }]}
                  emojiGrid={`📈 Player Stock Market ${round.year}${namesStyle ? ' (names only)' : ''}: ${formatPct(result.yourReturn)} · ${result.score}/100`}
                  share={{
                    score: `${result.score}/100 on the ${round.year} Player Stock Market`,
                    gameName: 'Player Stock Market',
                    gamePath: '/player-stock-market',
                  }}
                  onPlayAgain={mode === 'unlimited' ? newUnlimited : undefined}
                  playAgainLabel="New market"
                  playNext={mode === 'daily' ? <p className="text-sm text-muted-foreground">A new market opens tomorrow!</p> : undefined}
                />
              </div>
            )}
          </>
        )}

        <GameSeoContent
          title="Player Stock Market | DoUKnowBall"
          description="Six real players at a real past year with their actual market values and value history. Buy three, watch the market advance one real year, and get scored against the optimal portfolio."
          howToPlay={[
            'The market shows 6 real players at a real past year with their real market values',
            'Each card shows a 3-year value history sparkline, momentum or mirage?',
            'Buy exactly 3 players, then lock in your portfolio',
            'The market advances one real year: actual next-year values decide your return',
            'Score 0-100 against the best possible trio. 100 = the optimal portfolio',
          ]}
          examples={[
            'Would you have bought a 30-year-old superstar in 2018, or the teenager whose value was about to triple?',
            'A falling sparkline can keep falling, or be the buy-low of the year.',
          ]}
        />

        <AdBanner slot="1234567916" format="horizontal" className="mt-8" />
        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="player-stock-market" gameContext={{ year: round?.year }} />
        </div>
        <GameNav />
      </GameShell>
    </>
  );
};

export default PlayerStockMarket;
