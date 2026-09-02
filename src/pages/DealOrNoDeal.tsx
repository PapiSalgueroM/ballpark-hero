import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Briefcase, Phone, Check, X, ArrowLeftRight, Loader2 } from 'lucide-react';
import { GameNav } from '@/components/game/GameNav';
import { GameShell } from '@/components/game/GameShell';
import { ResultScreen } from '@/components/game/ResultScreen';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { DealPlayer, fetchDealPlayers, pickSpread, flagFor, shortName, fmtCompactUsd } from '@/lib/dealPlayers';
import { FlagImg, TextWithFlags } from '@/components/FlagImg';

const VALUE_LADDER = [
  1, 5, 50, 100, 500, 1000, 5000, 10000,
  25000, 50000, 100000, 250000, 500000, 1000000, 5000000, 10000000,
];

// Cases to open each round. Sums to 14, which leaves one rival case for the
// final offer and the classic keep-or-swap decision.
const ROUND_SCHEDULE = [5, 4, 3, 1, 1];
// Banker generosity ramps up each round
const ROUND_FACTORS = [0.32, 0.45, 0.6, 0.78, 0.92];

const fmtUsd = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

interface CaseBox {
  id: number;
  value: number;
  opened: boolean;
  player?: DealPlayer;
}
type Phase = 'pick' | 'opening' | 'offer' | 'swap' | 'done';
type Mode = 'cash' | 'players';

interface GameResult {
  amount: number;
  dealt: boolean;
  swapped?: boolean;
  gaveUpValue?: number;
}

interface LifetimeStats {
  plays: number;
  best: number;
  totalWon: number;
  dealsTaken: number;
}

const STATS_KEY = 'dond_stats_v1';

function loadStats(): LifetimeStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      return {
        plays: Number(s.plays) || 0,
        best: Number(s.best) || 0,
        totalWon: Number(s.totalWon) || 0,
        dealsTaken: Number(s.dealsTaken) || 0,
      };
    }
  } catch { /* fresh stats */ }
  return { plays: 0, best: 0, totalWon: 0, dealsTaken: 0 };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function cleanRound(n: number): number {
  if (n >= 100000) return Math.round(n / 1000) * 1000;
  if (n >= 1000) return Math.round(n / 100) * 100;
  return Math.max(1, Math.round(n));
}

function bankerOffer(remaining: number[], roundIdx: number): number {
  const ev = remaining.reduce((a, b) => a + b, 0) / Math.max(1, remaining.length);
  const factor = ROUND_FACTORS[Math.min(roundIdx, ROUND_FACTORS.length - 1)];
  const noise = 0.93 + Math.random() * 0.14; // the Banker has moods
  return cleanRound(ev * factor * noise);
}

const DealOrNoDeal = () => {
  const [mode, setMode] = useState<Mode>('cash');
  const [playerPool, setPlayerPool] = useState<DealPlayer[] | null>(null);
  const [poolStatus, setPoolStatus] = useState<'idle' | 'loading' | 'ready' | 'failed'>('idle');
  const [cases, setCases] = useState<CaseBox[]>([]);
  const [phase, setPhase] = useState<Phase>('pick');
  const [myCaseId, setMyCaseId] = useState<number | null>(null);
  const [roundIdx, setRoundIdx] = useState(0);
  const [offer, setOffer] = useState<number | null>(null);
  const [offerHistory, setOfferHistory] = useState<number[]>([]);
  const [bankerCalling, setBankerCalling] = useState(false);
  const [result, setResult] = useState<GameResult | null>(null);
  const [stats, setStats] = useState<LifetimeStats>(() => loadStats());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buildBoard = useCallback((m: Mode, pool: DealPlayer[] | null) => {
    if (m === 'players' && pool && pool.length >= 16) {
      const picks = pickSpread(pool, 16);
      const order = shuffle(picks);
      return order.map((p, i) => ({ id: i + 1, value: p.value, opened: false, player: p }));
    }
    return shuffle(VALUE_LADDER).map((v, i) => ({ id: i + 1, value: v, opened: false }));
  }, []);

  const init = useCallback((m: Mode, pool: DealPlayer[] | null) => {
    if (timer.current) clearTimeout(timer.current);
    setCases(buildBoard(m, pool));
    setPhase('pick');
    setMyCaseId(null);
    setRoundIdx(0);
    setOffer(null);
    setOfferHistory([]);
    setBankerCalling(false);
    setResult(null);
  }, [buildBoard]);

  useEffect(() => {
    init('cash', null);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [init]);

  const switchMode = async (m: Mode) => {
    if (phase !== 'pick' || m === mode) return;
    if (m === 'cash') {
      setMode('cash');
      init('cash', null);
      return;
    }
    if (playerPool) {
      setMode('players');
      init('players', playerPool);
      return;
    }
    setPoolStatus('loading');
    const pool = await fetchDealPlayers();
    if (pool) {
      setPlayerPool(pool);
      setPoolStatus('ready');
      setMode('players');
      init('players', pool);
    } else {
      setPoolStatus('failed');
    }
  };

  const myCase = cases.find(c => c.id === myCaseId) || null;
  const openedCount = cases.filter(c => c.opened).length;
  const cumTarget = ROUND_SCHEDULE.slice(0, roundIdx + 1).reduce((a, b) => a + b, 0);
  const opensThisRound = Math.max(0, cumTarget - openedCount);
  const lastRivalCase = useMemo(
    () => cases.find(c => !c.opened && c.id !== myCaseId) || null,
    [cases, myCaseId]
  );

  const finishGame = useCallback((r: GameResult) => {
    setPhase('done');
    setResult(r);
    setStats(prev => {
      const next: LifetimeStats = {
        plays: prev.plays + 1,
        best: Math.max(prev.best, r.amount),
        totalWon: prev.totalWon + r.amount,
        dealsTaken: prev.dealsTaken + (r.dealt ? 1 : 0),
      };
      try { localStorage.setItem(STATS_KEY, JSON.stringify(next)); } catch { /* private mode */ }
      return next;
    });
  }, []);

  // Round transition: once enough cases are opened, the Banker calls
  useEffect(() => {
    if (phase !== 'opening' || cases.length === 0 || myCaseId == null) return;
    if (openedCount < cumTarget) return;
    const remaining = cases.filter(c => !c.opened).map(c => c.value);
    const o = bankerOffer(remaining, roundIdx);
    setBankerCalling(true);
    setPhase('offer');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setOffer(o);
      setOfferHistory(h => [...h, o]);
      setBankerCalling(false);
    }, 1200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openedCount, phase, cases, myCaseId, roundIdx, cumTarget]);

  const pickMyCase = (id: number) => {
    if (phase !== 'pick') return;
    setMyCaseId(id);
    setPhase('opening');
  };

  const openCase = (id: number) => {
    if (phase !== 'opening' || id === myCaseId) return;
    setCases(prev => prev.map(c => (c.id === id ? { ...c, opened: true } : c)));
  };

  const acceptDeal = () => {
    if (phase !== 'offer' || offer == null) return;
    finishGame({ amount: offer, dealt: true });
  };

  const rejectDeal = () => {
    if (phase !== 'offer') return;
    setOffer(null);
    if (roundIdx + 1 >= ROUND_SCHEDULE.length) {
      // Only your case and one rival case remain: the classic final decision
      setPhase('swap');
    } else {
      setRoundIdx(r => r + 1);
      setPhase('opening');
    }
  };

  const resolveSwap = (swap: boolean) => {
    if (phase !== 'swap' || !myCase || !lastRivalCase) return;
    const kept = swap ? lastRivalCase : myCase;
    const gaveUp = swap ? myCase : lastRivalCase;
    finishGame({ amount: kept.value, dealt: false, swapped: swap, gaveUpValue: gaveUp.value });
  };

  const caseLabel = (c: CaseBox | null) =>
    c?.player ? `${flagFor(c.player.nationality)} ${c.player.name}` : c ? fmtUsd(c.value) : '';

  const emojiGrid = result
    ? (result.dealt ? '🤝💼 ' : result.swapped ? '🔄💼 ' : '💼✨ ')
      + fmtUsd(result.amount)
      + (mode === 'players' ? ' ⚽ Player Edition' : '')
    : '';

  const ladder = useMemo(() => [...cases].sort((a, b) => a.value - b.value), [cases]);
  const half = Math.ceil(ladder.length / 2);
  const ladderCols = [ladder.slice(0, half), ladder.slice(half)];

  const avgWon = stats.plays > 0 ? stats.totalWon / stats.plays : 0;

  return (
    <>
      <PageSeo
        title="Mystery Box: Bank or Gamble Against the Banker | DoUKnowBall"
        description="Play Mystery Box free: classic cash mode or Player Edition, where every case hides a real footballer's market value. Beat the Banker."
        path="/deal-or-no-deal"
      />
      <GameShell
        width="wide"
        title="MYSTERY BOX"
        subtitle="Pick your case, eliminate the rest, and decide: take the Banker's offer, or hold out for what's in your case?"
        headerExtra={
          stats.plays > 0 && (
            <p className="text-xs text-muted-foreground mt-3">
              {stats.plays} game{stats.plays === 1 ? '' : 's'} played · Best <span className="text-primary font-semibold">{fmtUsd(stats.best)}</span> · Avg {fmtUsd(avgWon)}
            </p>
          )
        }
      >
        {phase === 'pick' && (
          <div className="flex flex-col items-center gap-2 mb-6">
            <div className="inline-flex rounded-full border border-border bg-card p-1">
              <button
                onClick={() => switchMode('cash')}
                className={cn(
                  'px-4 py-1.5 rounded-full text-sm font-semibold transition-colors',
                  mode === 'cash' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                💵 Classic Cash
              </button>
              <button
                onClick={() => switchMode('players')}
                disabled={poolStatus === 'loading'}
                className={cn(
                  'px-4 py-1.5 rounded-full text-sm font-semibold transition-colors inline-flex items-center gap-1.5',
                  mode === 'players' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {poolStatus === 'loading' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                ⚽ Player Edition
              </button>
            </div>
            {mode === 'players' && (
              <p className="text-xs text-muted-foreground">Every case hides a real footballer. You win their market value.</p>
            )}
            {poolStatus === 'failed' && (
              <p className="text-xs text-destructive">Player data is unavailable right now, so Cash mode it is.</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 max-w-xl mx-auto mb-6">
          {ladderCols.map((col, ci) => (
            <div key={ci} className="space-y-1">
              {col.map(c => (
                <div
                  key={c.id}
                  className={cn(
                    'px-2.5 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-all flex items-center justify-between gap-2',
                    !c.opened
                      ? 'bg-primary/15 text-primary border border-primary/30'
                      : 'bg-secondary/40 text-muted-foreground/40 line-through'
                  )}
                >
                  {c.player ? (
                    <>
                      <span className="truncate"><FlagImg name={c.player.nationality} size={14} /> {shortName(c.player.name)}</span>
                      <span className="shrink-0">{fmtCompactUsd(c.value)}</span>
                    </>
                  ) : (
                    <span className="w-full text-center">{fmtUsd(c.value)}</span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        {offerHistory.length > 0 && phase !== 'done' && (
          <div className="flex flex-wrap justify-center gap-1.5 mb-4">
            {offerHistory.map((o, i) => (
              <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-secondary/60 text-muted-foreground">
                Offer {i + 1}: {fmtUsd(o)}
              </span>
            ))}
          </div>
        )}

        <div className="text-center mb-5 min-h-[28px]">
          {phase === 'pick' && (
            <p className="text-foreground font-semibold">Choose your case to keep 💼</p>
          )}
          {phase === 'opening' && (
            <p className="text-foreground font-semibold">
              Open <span className="text-primary">{opensThisRound}</span> case{opensThisRound === 1 ? '' : 's'}
            </p>
          )}
          {phase === 'offer' && bankerCalling && (
            <p className="text-primary font-semibold inline-flex items-center gap-2 animate-pulse">
              <Phone className="w-4 h-4" /> The Banker is calling…
            </p>
          )}
          {phase === 'swap' && (
            <p className="text-foreground font-semibold">Two cases left. Trust your gut or trade it away?</p>
          )}
        </div>

        {(phase === 'pick' || phase === 'opening' || phase === 'offer') && (
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 md:gap-3 max-w-3xl mx-auto">
            {cases.map(c => {
              const isMine = c.id === myCaseId;
              return (
                <button
                  key={c.id}
                  onClick={() => (phase === 'pick' ? pickMyCase(c.id) : openCase(c.id))}
                  disabled={c.opened || isMine || phase === 'offer'}
                  className={cn(
                    'aspect-[3/4] rounded-xl flex flex-col items-center justify-center font-bold transition-all border px-0.5',
                    c.opened
                      ? 'bg-secondary/30 border-border text-muted-foreground/50'
                      : isMine
                      ? 'bg-primary text-primary-foreground border-primary shadow-lg scale-105'
                      : 'bg-card border-border hover:border-primary hover:scale-105 text-foreground'
                  )}
                >
                  {c.opened ? (
                    c.player ? (
                      <span className="text-[9px] md:text-[11px] px-0.5 text-center leading-tight">
                        {shortName(c.player.name)}
                        <br />
                        <span className="opacity-80">{fmtCompactUsd(c.value)}</span>
                      </span>
                    ) : (
                      <span className="text-[10px] md:text-xs px-1 text-center leading-tight">{fmtUsd(c.value)}</span>
                    )
                  ) : (
                    <>
                      <Briefcase className="w-5 h-5 md:w-6 md:h-6 mb-1" />
                      <span className="text-xs md:text-sm">{c.id}</span>
                      {isMine && <span className="text-[9px] uppercase tracking-wide mt-0.5">Yours</span>}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {phase === 'offer' && offer != null && (
          <div className="mt-8 bg-card border border-primary/40 rounded-2xl p-6 md:p-8 max-w-md mx-auto text-center shadow-xl">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">The Banker offers</div>
            <div className="text-4xl md:text-5xl font-bold text-primary font-display mb-5">{fmtUsd(offer)}</div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={acceptDeal}
                className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" /> DEAL
              </button>
              <button
                onClick={rejectDeal}
                className="flex-1 px-6 py-3 bg-secondary text-foreground rounded-xl font-bold hover:bg-secondary/70 transition-colors inline-flex items-center justify-center gap-2"
              >
                <X className="w-5 h-5" /> NO DEAL
              </button>
            </div>
          </div>
        )}

        {phase === 'swap' && myCase && lastRivalCase && (
          <div className="mt-4 bg-card border border-primary/40 rounded-2xl p-6 md:p-8 max-w-md mx-auto text-center shadow-xl">
            <div className="flex justify-center gap-6 mb-6">
              {[{ c: myCase, label: 'Your case' }, { c: lastRivalCase, label: 'Last case' }].map(({ c, label }) => (
                <div key={c.id} className="flex flex-col items-center gap-1">
                  <div className="w-20 h-24 rounded-xl bg-primary/15 border border-primary/40 flex flex-col items-center justify-center">
                    <Briefcase className="w-7 h-7 text-primary mb-1" />
                    <span className="font-bold text-primary">{c.id}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => resolveSwap(false)}
                className="flex-1 px-5 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-opacity"
              >
                Keep mine
              </button>
              <button
                onClick={() => resolveSwap(true)}
                className="flex-1 px-5 py-3 bg-secondary text-foreground rounded-xl font-bold hover:bg-secondary/70 transition-colors inline-flex items-center justify-center gap-2"
              >
                <ArrowLeftRight className="w-4 h-4" /> Swap
              </button>
            </div>
          </div>
        )}

        {phase === 'done' && result && (() => {
          const won = result.dealt
            ? (myCase ? result.amount >= myCase.value : undefined)
            : (result.gaveUpValue != null ? result.amount >= result.gaveUpValue : undefined);
          const wonCase = result.dealt ? null : cases.find(c => !result.swapped ? c.id === myCaseId : (c.id !== myCaseId && c.id === lastRivalCase?.id));
          const p = mode === 'players' ? wonCase?.player : undefined;
          return (
            <div className="mt-4 flex justify-center">
              <ResultScreen
                won={won}
                outcomeEmoji={result.amount >= 1000000 ? '🤑' : result.amount >= 10000 ? '🎉' : '😬'}
                headline={`You won ${fmtUsd(result.amount)}`}
                statLine={
                  result.dealt && myCase ? (
                    <>You took the deal. Your case held <TextWithFlags text={caseLabel(myCase)} size={14} />{myCase.player ? ` (${fmtUsd(myCase.value)})` : ''}.</>
                  ) : !result.dealt && result.gaveUpValue != null ? (
                    <>{result.swapped ? 'You swapped at the death.' : 'You kept your case all the way.'} The other case held {fmtUsd(result.gaveUpValue)}.</>
                  ) : undefined
                }
                funFact={
                  result.dealt && myCase ? (
                    myCase.value > result.amount ? 'The Banker won that round 😈' : 'Great deal! 🎯'
                  ) : !result.dealt && result.gaveUpValue != null ? (
                    result.amount >= result.gaveUpValue ? 'Right call! 🎯' : 'Ouch. Wrong case 😈'
                  ) : undefined
                }
                emojiGrid={emojiGrid || `Mystery Box: ${fmtUsd(result.amount)}`}
                share={{
                  score: fmtUsd(result.amount),
                  gameName: 'Mystery Box',
                  gamePath: '/deal-or-no-deal',
                }}
                onPlayAgain={() => init(mode, playerPool)}
              >
                {p && (
                  <div className="mt-3 rounded-xl bg-primary/10 border border-primary/30 px-4 py-3 text-sm">
                    <span className="font-semibold text-primary"><FlagImg name={p.nationality} size={16} /> {p.name}</span>
                    <span className="text-muted-foreground"> · {p.club} · {fmtCompactUsd(p.value)}</span>
                  </div>
                )}
                {offerHistory.length > 0 && (
                  <div className="mt-4 text-xs text-muted-foreground">
                    Offers: {offerHistory.map(o => fmtUsd(o)).join(' → ')}
                  </div>
                )}
              </ResultScreen>
            </div>
          );
        })()}

        <AdBanner slot="7540487748" format="horizontal" className="mt-8" />

        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="mystery-box" />
        </div>

        <GameSeoContent
          pageHasOwnH1
          title="Mystery Box: The Banker Game"
          description="A sports take on the classic box gamble. Play for cash, or switch to Player Edition where every case hides a real footballer and you win their market value."
          howToPlay={[
            'Pick one case to keep as your own.',
            'Open the other cases to eliminate their hidden amounts.',
            'After each round the Banker offers to buy your case. Take the DEAL or say NO DEAL and keep going.',
            'Reject every offer and you reach the final two cases, where you can keep yours or swap.',
            'Try Player Edition: every case hides a real footballer and their market value.',
          ]}
          examples={[
            'Open low amounts early to push the Banker offers higher.',
            'A big offer late means the Banker is scared of your case.',
          ]}
        />
        <GameNav />
      </GameShell>
    </>
  );
};

export default DealOrNoDeal;
