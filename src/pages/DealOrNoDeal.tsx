import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Briefcase, RotateCcw, Phone, Check, X } from 'lucide-react';
import ShareButtons from '@/components/game/ShareButtons';
import { GameNav } from '@/components/game/GameNav';
import { GameNavbar } from '@/components/game/GameNavbar';
import { Footer } from '@/components/game/Footer';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';

const VALUE_LADDER = [
  1, 5, 50, 100, 500, 1000, 5000, 10000,
  25000, 50000, 100000, 250000, 500000, 1000000, 5000000, 10000000,
];

// cases to open each round (sums to 15 = all cases except the player's own)
const ROUND_SCHEDULE = [5, 4, 3, 2, 1];
// banker generosity ramps up each round
const ROUND_FACTORS = [0.35, 0.5, 0.65, 0.8, 1];

const fmtUsd = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

interface CaseBox {
  id: number;
  value: number;
  opened: boolean;
}
type Phase = 'pick' | 'opening' | 'offer' | 'done';

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

const DealOrNoDeal = () => {
  const [cases, setCases] = useState<CaseBox[]>([]);
  const [phase, setPhase] = useState<Phase>('pick');
  const [myCaseId, setMyCaseId] = useState<number | null>(null);
  const [roundIdx, setRoundIdx] = useState(0);
  const [offer, setOffer] = useState<number | null>(null);
  const [bankerCalling, setBankerCalling] = useState(false);
  const [result, setResult] = useState<{ amount: number; dealt: boolean } | null>(null);
  const [best, setBest] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const init = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    const shuffled = shuffle(VALUE_LADDER);
    setCases(shuffled.map((v, i) => ({ id: i + 1, value: v, opened: false })));
    setPhase('pick');
    setMyCaseId(null);
    setRoundIdx(0);
    setOffer(null);
    setBankerCalling(false);
    setResult(null);
  }, []);

  useEffect(() => {
    init();
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [init]);

  const myCase = cases.find(c => c.id === myCaseId) || null;
  const openedCount = cases.filter(c => c.opened).length;
  const cumTarget = ROUND_SCHEDULE.slice(0, roundIdx + 1).reduce((a, b) => a + b, 0);
  const opensThisRound = Math.max(0, cumTarget - openedCount);
  const remainingValues = useMemo(
    () => cases.filter(c => !c.opened).map(c => c.value),
    [cases]
  );

  // Round transition: once enough cases are opened, the Banker calls (or final reveal)
  useEffect(() => {
    if (phase !== 'opening' || cases.length === 0 || myCaseId == null) return;
    if (openedCount < cumTarget) return;
    const remainingNonMine = cases.filter(c => !c.opened && c.id !== myCaseId).length;
    if (remainingNonMine <= 0) {
      const won = myCase ? myCase.value : 0;
      setPhase('done');
      setResult({ amount: won, dealt: false });
      setBest(b => Math.max(b, won));
      return;
    }
    const remaining = cases.filter(c => !c.opened).map(c => c.value);
    const avg = remaining.reduce((a, b) => a + b, 0) / remaining.length;
    const factor = ROUND_FACTORS[Math.min(roundIdx, ROUND_FACTORS.length - 1)];
    const o = cleanRound(avg * factor);
    setBankerCalling(true);
    setPhase('offer');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setOffer(o);
      setBankerCalling(false);
    }, 1300);
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
    setPhase('done');
    setResult({ amount: offer, dealt: true });
    setBest(b => Math.max(b, offer));
  };

  const rejectDeal = () => {
    if (phase !== 'offer') return;
    setOffer(null);
    setRoundIdx(r => r + 1);
    setPhase('opening');
  };

  const emojiGrid = result
    ? (result.dealt ? '🤝💼 ' : '💼✨ ') + fmtUsd(result.amount)
    : '';

  const half = Math.ceil(VALUE_LADDER.length / 2);
  const ladderSorted = [...VALUE_LADDER].sort((a, b) => a - b);
  const leftLadder = ladderSorted.slice(0, half);
  const rightLadder = ladderSorted.slice(half);
  const isLive = (v: number) => remainingValues.includes(v);

  return (
    <main className="min-h-screen bg-background">
      <GameNavbar />
      <PageSeo
        title="Deal or No Deal — Bank or Gamble Against the Banker | DoUKnowBall"
        description="Play Deal or No Deal: pick your case, open the rest, and decide whether to take the Banker's offer or risk it all. Free arcade game."
        path="/deal-or-no-deal"
      />
      <div className="max-w-4xl mx-auto px-4 py-6 md:py-10">
        <header className="text-center mb-6">
          <h1 className="text-4xl md:text-6xl font-bold tracking-[0.12em] text-primary font-display mb-1">
            DEAL OR NO DEAL
          </h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto">
            Pick your case, eliminate the rest, and decide: take the Banker's offer, or hold out for what's in your case?
          </p>
          {best > 0 && (
            <p className="text-xs text-muted-foreground mt-3">
              Best winnings this session: <span className="text-primary font-semibold">{fmtUsd(best)}</span>
            </p>
          )}
        </header>

        <div className="grid grid-cols-2 gap-2 max-w-md mx-auto mb-6">
          {[leftLadder, rightLadder].map((col, ci) => (
            <div key={ci} className="space-y-1">
              {col.map(v => (
                <div
                  key={v}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-sm font-semibold text-center transition-all',
                    isLive(v)
                      ? 'bg-primary/15 text-primary border border-primary/30'
                      : 'bg-secondary/40 text-muted-foreground/40 line-through'
                  )}
                >
                  {fmtUsd(v)}
                </div>
              ))}
            </div>
          ))}
        </div>

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
        </div>

        {phase !== 'done' && (
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 md:gap-3 max-w-3xl mx-auto">
            {cases.map(c => {
              const isMine = c.id === myCaseId;
              return (
                <button
                  key={c.id}
                  onClick={() => (phase === 'pick' ? pickMyCase(c.id) : openCase(c.id))}
                  disabled={c.opened || isMine || phase === 'offer'}
                  className={cn(
                    'aspect-[3/4] rounded-xl flex flex-col items-center justify-center font-bold transition-all border',
                    c.opened
                      ? 'bg-secondary/30 border-border text-muted-foreground/50'
                      : isMine
                      ? 'bg-primary text-primary-foreground border-primary shadow-lg scale-105'
                      : 'bg-card border-border hover:border-primary hover:scale-105 text-foreground'
                  )}
                >
                  {c.opened ? (
                    <span className="text-[10px] md:text-xs px-1 text-center leading-tight">{fmtUsd(c.value)}</span>
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

        {phase === 'done' && result && (
          <div className="mt-4 flex justify-center">
            <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
              <div className="text-5xl mb-3">{result.amount >= 100000 ? '🤑' : result.amount >= 1000 ? '🎉' : '😬'}</div>
              <h2 className="text-2xl font-bold text-primary font-display mb-2">
                You won {fmtUsd(result.amount)}
              </h2>
              <p className="text-muted-foreground text-sm">
                {result.dealt
                  ? 'You took the deal. Your case held ' + fmtUsd(myCase ? myCase.value : 0) + '.'
                  : 'You held your case all the way!'}
              </p>
              {result.dealt && myCase && (
                <p className={cn(
                  'text-sm font-semibold mt-1',
                  myCase.value > result.amount ? 'text-destructive' : 'text-correct'
                )}>
                  {myCase.value > result.amount ? 'The Banker won that round 😈' : 'Great deal! 🎯'}
                </p>
              )}

              {emojiGrid && <pre className="mt-4 text-base tracking-wide">{emojiGrid}</pre>}

              <ShareButtons
                score={fmtUsd(result.amount)}
                gameName="Deal or No Deal"
                gamePath="/deal-or-no-deal"
                emojiGrid={emojiGrid}
              />

              <button
                onClick={init}
                className="mt-4 inline-flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-full font-semibold hover:opacity-90 transition-opacity"
              >
                <RotateCcw className="w-4 h-4" /> Play Again
              </button>
            </div>
          </div>
        )}

        <AdBanner slot="1234567890" format="horizontal" className="mt-8" />

        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="deal-or-no-deal" />
        </div>

        <GameSeoContent
          title="Deal or No Deal — The Banker Game"
          description="A football-flavored take on the classic Deal or No Deal. Pick a case, eliminate the others, and weigh the Banker's offers against the mystery value in your own case."
          howToPlay={[
            'Pick one case to keep as your own.',
            'Open the other cases to eliminate their hidden amounts.',
            'After each round the Banker offers to buy your case — take the DEAL or say NO DEAL and keep going.',
            'Hold out to the end to win whatever is in your case.',
          ]}
          examples={[
            'Open low amounts early to push the Banker offers higher.',
            'A big offer late is the Banker hedging against a huge case.',
          ]}
        />
        <GameNav />
        <Footer />
      </div>
    </main>
  );
};

export default DealOrNoDeal;
