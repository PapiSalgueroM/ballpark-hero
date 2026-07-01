import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { RotateCcw, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import ShareButtons from '@/components/game/ShareButtons';
import { GameNav } from '@/components/game/GameNav';
import { GameNavbar } from '@/components/game/GameNavbar';
import { Footer } from '@/components/game/Footer';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { DealPlayer, fetchDealPlayers, flagFor, fmtCompactUsd } from '@/lib/dealPlayers';

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

  const emojiGrid = `📈 Transfer Market streak: ${streak}${streak >= best && streak > 0 ? ' 🏅 new best' : ''}`;

  const card = (p: DealPlayer, showValue: boolean, tag: string) => (
    <div className="bg-card border border-border rounded-2xl p-5 text-center flex-1 min-w-0">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">{tag}</div>
      <div className="text-3xl mb-1">{flagFor(p.nationality)}</div>
      <div className="font-bold text-foreground text-lg leading-tight mb-0.5 truncate">{p.name}</div>
      <div className="text-xs text-muted-foreground truncate mb-3">{p.club}</div>
      <div className={cn(
        'text-2xl font-bold font-display',
        showValue ? 'text-primary' : 'text-muted-foreground/40'
      )}>
        {showValue ? fmtCompactUsd(p.value) : '???'}
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-background">
      <GameNavbar />
      <PageSeo
        title="Higher or Lower: Transfer Market | DoUKnowBall"
        description="Who is worth more? Guess higher or lower on real player market values and build the longest streak you can. Free, endless, no sign-up."
        path="/higher-lower-transfers"
      />
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
        <header className="text-center mb-6">
          <h1 className="text-4xl md:text-5xl font-bold tracking-[0.08em] text-primary font-display mb-1">
            TRANSFER MARKET
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Higher or lower? Real market values, endless deck, one wrong answer ends the run.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Streak <span className="text-primary font-bold">{streak}</span>
            {best > 0 && <> · Best <span className="text-primary font-bold">{best}</span></>}
          </p>
        </header>

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
            <div className="flex gap-3 items-stretch mb-5">
              {card(current, true, 'Worth')}
              <div className="self-center text-muted-foreground font-bold text-sm shrink-0">VS</div>
              {card(challenger, phase !== 'playing', 'Higher or lower?')}
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
              <div className="bg-card border border-border rounded-2xl p-6 text-center mt-4">
                <div className="text-4xl mb-2">{streak >= 15 ? '🐐' : streak >= 8 ? '🔥' : streak >= 4 ? '👏' : '📉'}</div>
                <h2 className="text-2xl font-bold text-primary font-display mb-1">
                  Run over at {streak}
                </h2>
                <p className="text-sm text-muted-foreground mb-3">
                  {streak >= best && streak > 0
                    ? 'New personal best. The scouts are impressed.'
                    : best > 0
                    ? `Your best is ${best}. One more go?`
                    : 'Everyone starts somewhere.'}
                </p>
                <pre className="text-sm tracking-wide whitespace-pre-wrap mb-2">{emojiGrid}</pre>
                <ShareButtons
                  score={String(streak)}
                  gameName="Transfer Market Higher or Lower"
                  gamePath="/higher-lower-transfers"
                  emojiGrid={emojiGrid}
                />
                <button
                  onClick={boot}
                  className="mt-4 inline-flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-full font-semibold hover:opacity-90 transition-opacity"
                >
                  <RotateCcw className="w-4 h-4" /> New run
                </button>
              </div>
            )}
          </>
        )}

        <AdBanner slot="1234567890" format="horizontal" className="mt-8" />

        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="higher-lower-transfers" />
        </div>

        <GameSeoContent
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
        <Footer />
      </div>
    </main>
  );
};

export default HigherLowerTransfers;
