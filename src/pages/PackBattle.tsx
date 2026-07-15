import { FlagImg } from '@/components/FlagImg';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GameShell } from '@/components/game/GameShell';
import { ResultScreen } from '@/components/game/ResultScreen';
import { HowToPlayPopover } from '@/components/game/HowToPlayPopover';
import { GameNav } from '@/components/game/GameNav';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { getTodayET } from '@/lib/dateUtils';

import {
  fetchPackPool,
  buildPackForMode,
  resolveCall,
  gradePack,
  buildPackEmojiGrid,
  fmtCompactUsd,
  type PlayMode,
  type PackCard,
  type PackResult,
} from '@/lib/packBattle';

type Phase = 'boot' | 'error' | 'playing' | 'reveal' | 'done';

/**
 * Pack Battle: daily football-trumps pack opener (R6 build plan Part 1 item
 * 9, MASTER_PLAN Wave 15d). See src/lib/packBattle.ts for the full mechanic
 * writeup and the data source docs.
 */
const PackBattle = () => {
  const [playMode, setPlayMode] = useState<PlayMode>('daily');

  const [phase, setPhase] = useState<Phase>('boot');
  const [pool, setPool] = useState<PackCard[]>([]);
  const [cards, setCards] = useState<PackCard[]>([]);
  const [cardIndex, setCardIndex] = useState(0); // index of the card currently face-up / being called on
  const [calls, setCalls] = useState<(boolean | null)[]>([]);
  const [bankedValue, setBankedValue] = useState(0);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [busted, setBusted] = useState(false);

  // Every hook lives above this point and none of them are conditional, per
  // the site's React error #310 rule (hooks must never sit below an early
  // return). The loading/error UI is decided entirely in the JSX below.

  const startRun = useCallback((nextPlayMode: PlayMode, sourcePool: PackCard[]) => {
    setPlayMode(nextPlayMode);
    const pack = buildPackForMode(nextPlayMode, sourcePool);
    if (!pack || pack.length < 2) {
      setPhase('error');
      return;
    }
    setCards(pack);
    setCardIndex(0);
    setCalls([]);
    setBankedValue(pack[0].value);
    setLastCorrect(null);
    setBusted(false);
    setPhase('playing');
  }, []);

  // Boot: fetch the pool once, then start the daily run.
  useEffect(() => {
    let cancelled = false;
    fetchPackPool()
      .then(fetched => {
        if (cancelled) return;
        if (!fetched || fetched.length < 20) {
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

  const bankedCard = cards[cardIndex];
  const nextCard = cards[cardIndex + 1];

  const call = (calledHigher: boolean) => {
    if (phase !== 'playing' || !bankedCard || !nextCard) return;
    const correct = resolveCall(bankedCard.value, nextCard.value, calledHigher);
    setLastCorrect(correct);
    setCalls(c => [...c, correct]);
    setPhase('reveal');
    setTimeout(() => {
      if (correct) {
        setBankedValue(nextCard.value);
        const isLastCard = cardIndex + 1 >= cards.length - 1;
        if (isLastCard) {
          setCardIndex(i => i + 1);
          setPhase('done');
        } else {
          setCardIndex(i => i + 1);
          setPhase('playing');
        }
      } else {
        setBusted(true);
        setPhase('done');
      }
    }, 1400);
  };

  const result: PackResult = useMemo(() => {
    const filledCalls: (boolean | null)[] = [...calls];
    while (filledCalls.length < cards.length - 1) filledCalls.push(null);
    return {
      cards,
      calls: filledCalls,
      bankedValue,
      bustIndex: busted ? calls.length : null,
      cleared: !busted && calls.length === cards.length - 1 && cards.length > 0,
    };
  }, [cards, calls, bankedValue, busted]);

  const isComplete = phase === 'done';
  const correctCalls = calls.filter(c => c === true).length;

  // Score = total banked value (USD), correctAnswers = number of correct calls.
  useGameCompletion('pack-battle', isComplete, bankedValue, correctCalls);

  const { grade, headline } = useMemo(() => gradePack(result), [result]);
  const emojiGrid = useMemo(() => buildPackEmojiGrid(result), [result]);

  const outcomeEmoji = result.cleared ? '🏆' : correctCalls >= 3 ? '🃏' : correctCalls >= 1 ? '😬' : '💥';

  const card = (p: PackCard, faceUp: boolean, tag: string, feedback?: 'correct' | 'wrong') => (
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
        faceUp ? 'text-primary' : 'text-muted-foreground/40'
      )}>
        {faceUp ? fmtCompactUsd(p.value) : '???'}
      </div>
    </div>
  );

  return (
    <>
      <PageSeo
        title="Pack Battle | DoUKnowBall"
        description="Open a daily 5-card pack of real footballers. Call higher or lower on market value before each flip. One wrong call busts the pack. Free, no sign-up."
        path="/pack-battle"
      />
      <GameShell
        width="narrow"
        title="PACK BATTLE"
        subtitle="Call higher or lower on market value before each card flips. One miss busts the pack."
        headerExtra={
          <>
            <HowToPlayPopover title="How to Play Pack Battle">
              <section>
                <h3 className="font-bold text-foreground mb-2">🃏 The idea</h3>
                <p className="text-muted-foreground">
                  A pack of 5 real footballers, revealed one at a time. Your first card is already
                  face up with its market value shown.
                </p>
              </section>
              <section>
                <h3 className="font-bold text-foreground mb-2">📈 Calling the next card</h3>
                <p className="text-muted-foreground">
                  Before the next card flips, call whether it is worth more or less than the card you
                  are holding. Get it right and that card becomes your new banked card. Get it wrong
                  and the pack busts immediately.
                </p>
              </section>
              <section>
                <h3 className="font-bold text-foreground mb-2">🏆 Scoring</h3>
                <p className="text-muted-foreground">
                  Your score is the market value of the last card you correctly banked. Clear all 5
                  cards for a perfect pack.
                </p>
              </section>
              <section>
                <h3 className="font-bold text-foreground mb-2">📅 Daily vs Unlimited</h3>
                <p className="text-muted-foreground">
                  Daily gives everyone the same 5-card pack each day. Unlimited shuffles a fresh pack
                  every time you play.
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
              <p className="text-xs text-muted-foreground mt-3">Today's pack, {getTodayET()}. Same 5 cards for everyone.</p>
            )}
          </>
        }
      >
        {phase === 'boot' && (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        )}

        {phase === 'error' && (
          <div className="text-center py-12">
            <p className="text-destructive font-semibold mb-3">Couldn't load Pack Battle right now.</p>
            <button
              onClick={() => (pool.length > 0 ? startRun(playMode, pool) : window.location.reload())}
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-semibold"
            >
              Try again
            </button>
          </div>
        )}

        {(phase === 'playing' || phase === 'reveal') && bankedCard && nextCard && (
          <>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-4">
              <span>Card {cardIndex + 2} of {cards.length}</span>
              <span className="text-primary">&middot; Banked {fmtCompactUsd(bankedValue)}</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-stretch mb-5">
              {card(bankedCard, true, 'Banked')}
              <div className="self-center text-muted-foreground font-bold text-sm shrink-0">VS</div>
              {card(
                nextCard,
                phase !== 'playing',
                'Higher or lower?',
                phase === 'reveal' ? (lastCorrect ? 'correct' : 'wrong') : undefined
              )}
            </div>

            {phase === 'playing' && (
              <div className="flex gap-3">
                <button
                  onClick={() => call(true)}
                  className="flex-1 px-5 py-3.5 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-2"
                >
                  <TrendingUp className="w-5 h-5" /> Higher
                </button>
                <button
                  onClick={() => call(false)}
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
                {lastCorrect ? 'Card banked ✅' : 'Pack busted ❌'}
              </div>
            )}
          </>
        )}

        {phase === 'done' && (
          <div className="mt-4">
            <ResultScreen
              won={result.cleared}
              outcomeEmoji={outcomeEmoji}
              headline={headline}
              statLine={
                result.cleared
                  ? `Full pack cleared, ${fmtCompactUsd(bankedValue)} banked`
                  : `Busted after ${correctCalls} correct call${correctCalls === 1 ? '' : 's'}`
              }
              statRow={[
                { label: 'Grade', value: grade },
                { label: 'Banked', value: fmtCompactUsd(bankedValue) },
                { label: 'Calls', value: `${correctCalls}/${cards.length - 1}` },
              ]}
              emojiGrid={emojiGrid}
              share={{
                score: fmtCompactUsd(bankedValue),
                gameName: 'Pack Battle',
                gamePath: '/pack-battle',
              }}
              onPlayAgain={() => startRun('unlimited', pool)}
              playAgainLabel={playMode === 'daily' ? 'Play Unlimited' : 'New pack'}
            />
          </div>
        )}

        <AdBanner slot="1234567893" format="horizontal" className="mt-8" />

        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="pack-battle" />
        </div>

        <GameSeoContent
          title="Pack Battle: Football Trumps"
          description="A daily pack-opening trivia game built on real market values from the world of football. Call higher or lower before each card flips. One wrong call busts the pack."
          howToPlay={[
            'Your first card is face up with its market value shown.',
            'Call whether the next card is worth more or less before it flips.',
            'A correct call banks that card and keeps the pack alive.',
            'One wrong call busts the pack. Clear all 5 for a perfect run.',
          ]}
          examples={[
            'A young star at a big club usually beats a veteran squad player.',
            'Ties count in your favor, because we are generous like that.',
          ]}
        />
        <GameNav />
      </GameShell>
    </>
  );
};

export default PackBattle;
