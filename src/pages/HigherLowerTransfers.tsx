import { FlagImg } from '@/components/FlagImg';
import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { GameShell } from '@/components/game/GameShell';
import { ResultScreen } from '@/components/game/ResultScreen';
import { GameNav } from '@/components/game/GameNav';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { DealPlayer, fetchDealPlayers, fmtCompactUsd } from '@/lib/dealPlayers';

type Phase = 'boot' | 'error' | 'playing' | 'reveal' | 'done';

const BEST_KEY = 'hl_transfers_best_v1';

function loadBest(): number {
  try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const HigherLowerTransfers = () => {
  const [phase, setPhase] = useState<Phase>('boot');
  const [deck, setDeck] = useState<DealPlayer[]>([]);
  const [pos, setPos] = useState(0); // current = deck[pos], challenger = deck[pos+1]
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(() => loadBest());
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  // Run history (one entry per resolved guess this run) purely to build the
  // emoji grid per R5 spec 3.6 item 5. Does not affect scoring or timing.
  const [runHistory, setRunHistory] = useState<boolean[]>([]);

  const boot = useCallback(async () => {
    setPhase('boot');
    const pool = await fetchDealPlayers();
    if (!pool || pool.length < 20) {
      setPhase('error');
      return;
    }
    setDeck(shuffle(pool));
    setPos(0);
    setStreak(0);
    setLastCorrect(null);
    setRunHistory([]);
    setPhase('playing');
  }, []);

  useEffect(() => { boot(); }, [boot]);

  const current = deck[pos];
  const challenger = deck[pos + 1];

  const guess = (higher: boolean) => {
    if (phase !== 'playing' || !current || !challenger) return;
    const correct =
      challenger.value === current.value
        ? true // ties are a free pass
        : higher
        ? challenger.value > current.value
        : challenger.value < current.value;
    setLastCorrect(correct);
    setRunHistory(h => [...h, correct]);
    setPhase('reveal');
    setTimeout(() => {
      if (correct) {
        const s = streak + 1;
        setStreak(s);
        if (s > best) {
          setBest(s);
          try { localStorage.setItem(BEST_KEY, String(s)); } catch { /* private mode */ }
        }
        if (pos + 2 >= deck.length - 1) {
          // ran out of players: reshuffle and keep the run alive
          setDeck(d => shuffle(d));
          setPos(0);
        } else {
          setPos(p => p + 1);
        }
        setPhase('playing');
      } else {
        setPhase('done');
      }
    }, 1400);
  };

  // Emoji grid built from the run's full history of correct/incorrect picks,
  // per R5 spec 3.6 item 5 (always render a styled grid, not a one-line <pre>).
  const emojiGrid = [
    `📈 Transfer Market streak: ${streak}${streak >= best && streak > 0 ? ' 🏅 new best' : ''}`,
    runHistory.map(ok => (ok ? '🟩' : '🟥')).join('') || '⬜',
  ].join('\n');

  const card = (p: DealPlayer, showValue: boolean, tag: string, feedback?: 'correct' | 'wrong') => (
    <div
      className={cn(
        'bg-surface-1 border border-border rounded-2xl p-5 text-center flex-1 min-w-0 transition-all duration-200',
        feedback === 'correct' && 'animate-pop-correct shadow-[0_0_24px_hsl(var(--success-glow))] border-correct',
        feedback === 'wrong' && 'animate-shake-wrong border-destructive',
      )}
    >
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">{tag}</div>
      <div className="mb-1"><FlagImg name={p.nationality} size={32} /></div>
      <div className="font-bold text-foreground text-lg leading-tight mb-0.5 truncate">{p.name}</div>
      <div className="text-xs text-muted-foreground truncate mb-3">{p.club}</div>
      <div className={cn(
        'text-2xl font-bold font-display',
        /* Round 251: the phone contrast sweep finally ran here and the
           40% wash measured 1.94:1. The question marks carry the mystery
           on their own; the ink stays readable. */
        showValue ? 'text-primary' : 'text-muted-foreground'
      )}>
        {showValue ? fmtCompactUsd(p.value) : '???'}
      </div>
    </div>
  );

  return (
    <>
      <PageSeo
        title="Higher or Lower: Transfer Market | DoUKnowBall"
        description="Who is worth more? Guess higher or lower on real player market values and build the longest streak you can. Free, endless, no sign-up."
        path="/higher-lower-transfers"
        noindex
      />
      <GameShell
        width="narrow"
        title="TRANSFER MARKET"
        subtitle="Higher or lower? Real market values, endless deck, one wrong answer ends the run."
        headerExtra={
          <p className="text-xs text-muted-foreground mt-2">
            Streak <span className="text-primary font-bold">{streak}</span>
            {best > 0 && <> · Best <span className="text-primary font-bold">{best}</span></>}
          </p>
        }
      >
        {phase === 'boot' && (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        )}

        {phase === 'error' && (
          <div className="text-center py-12">
            <p className="text-destructive font-semibold mb-3">Couldn't load the transfer market right now.</p>
            <button onClick={boot} className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-semibold">
              Try again
            </button>
          </div>
        )}

        {(phase === 'playing' || phase === 'reveal' || phase === 'done') && current && challenger && (
          <>
            <div className="flex flex-col sm:flex-row gap-3 items-stretch mb-5">
              {card(current, true, 'Worth')}
              <div className="self-center text-muted-foreground font-bold text-sm shrink-0">VS</div>
              {card(
                challenger,
                phase !== 'playing',
                'Higher or lower?',
                phase === 'reveal' ? (lastCorrect ? 'correct' : 'wrong') : undefined
              )}
            </div>

            {phase === 'playing' && (
              <div className="flex gap-3">
                <button
                  onClick={() => guess(true)}
                  className="flex-1 px-5 py-3.5 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-2"
                >
                  <TrendingUp className="w-5 h-5" /> Higher
                </button>
                <button
                  onClick={() => guess(false)}
                  className="flex-1 px-5 py-3.5 bg-secondary text-foreground rounded-xl font-bold hover:bg-secondary/70 transition-colors inline-flex items-center justify-center gap-2"
                >
                  <TrendingDown className="w-5 h-5" /> Lower
                </button>
              </div>
            )}

            {phase === 'reveal' && (
              <div className={cn(
                'text-center font-bold text-lg',
                lastCorrect ? 'text-correct' : 'text-destructive'
              )}>
                {lastCorrect ? 'Called it ✅' : 'Wrong way ❌'}
              </div>
            )}

            {phase === 'done' && (
              <div className="mt-4">
                <ResultScreen
                  outcomeEmoji={streak >= 15 ? '🐐' : streak >= 8 ? '🔥' : streak >= 4 ? '👏' : '📉'}
                  headline={`Run over at ${streak}`}
                  statLine={
                    streak >= best && streak > 0
                      ? 'New personal best. The scouts are impressed.'
                      : best > 0
                      ? `Your best is ${best}. One more go?`
                      : 'Everyone starts somewhere.'
                  }
                  emojiGrid={emojiGrid}
                  share={{
                    score: String(streak),
                    gameName: 'Transfer Market Higher or Lower',
                    gamePath: '/higher-lower-transfers',
                  }}
                  onPlayAgain={boot}
                  playAgainLabel="New run"
                />
              </div>
            )}
          </>
        )}

        <AdBanner slot="1234567890" format="horizontal" className="mt-8" />

        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="higher-lower-transfers" />
        </div>

        <GameSeoContent
          pageHasOwnH1
          title="Higher or Lower: Transfer Market Edition"
          description="An endless streak game built on real market values from the world of football. See one player's value, then decide if the next player is worth more or less."
          howToPlay={[
            'One player shows their real market value.',
            'Decide if the next player is worth more or less.',
            'Every correct call extends your streak. One miss ends the run.',
            'Your best streak is saved on this device.',
          ]}
          examples={[
            'A 21 year old winger at a big club usually beats a 33 year old legend.',
            'Ties count in your favor, because we are generous like that.',
          ]}
        />
        <GameNav />
      </GameShell>
    </>
  );
};

export default HigherLowerTransfers;
