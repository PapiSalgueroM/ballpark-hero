import { useCallback, useMemo, useState } from 'react';
import { Loader2, TrendingUp, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GameShell } from '@/components/game/GameShell';
import { ResultScreen } from '@/components/game/ResultScreen';
import { GameNav } from '@/components/game/GameNav';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import {
  AnonCandidate, Campaign, STOCK_BUDGET, assembleCampaign, canAfford, candidateRatio,
  dailyCampaignSeed, fetchCampaignRows, formatMoney, formatPct, randomCampaignSeed,
  scoreCampaign, startYearFor,
} from '@/lib/playerStockMarket';

/**
 * Player Stock Market (rebuilt Round 329 to the owner's spec): start six
 * seasons back with 200M, move year by year, and buy position by position
 * until the XI is full, seeing ONLY the stats. No name, no country, no
 * club, ever, until the reveal. Then the campaign jumps to the present and
 * your portfolio is worth what those careers really became.
 */

type Phase = 'setup' | 'loading' | 'error' | 'buying' | 'done';
type Mode = 'daily' | 'unlimited';
const SLUG = 'player-stock-market';

export default function PlayerStockMarket() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [mode, setMode] = useState<Mode>('daily');
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [slotIndex, setSlotIndex] = useState(0);
  const [picks, setPicks] = useState<AnonCandidate[]>([]);

  const start = useCallback(async (m: Mode) => {
    setMode(m);
    setPhase('loading');
    const seed = m === 'daily' ? dailyCampaignSeed() : randomCampaignSeed();
    const rows = await fetchCampaignRows(startYearFor(seed));
    const built = rows ? assembleCampaign(rows, seed) : null;
    if (!built) { setPhase('error'); return; }
    setCampaign(built);
    setSlotIndex(0);
    setPicks([]);
    setPhase('buying');
  }, []);

  const remaining = STOCK_BUDGET - picks.reduce((s, c) => s + c.price, 0);
  const current = campaign && phase === 'buying' ? campaign.slots[slotIndex] : null;

  const buy = (c: AnonCandidate) => {
    if (!campaign || !current || !canAfford(campaign, slotIndex, c, remaining)) return;
    const next = [...picks, c];
    setPicks(next);
    if (slotIndex + 1 >= campaign.slots.length) { setPhase('done'); return; }
    setSlotIndex(i => i + 1);
  };

  const result = useMemo(
    () => (campaign && phase === 'done' ? scoreCampaign(campaign, picks) : null),
    [campaign, phase, picks],
  );
  useGameCompletion(SLUG, phase === 'done' && !!result, result?.score ?? 0, picks.filter(c => c.final > c.price).length);

  const trend = (c: AnonCandidate) => {
    if (c.series.length < 2) return '→';
    const a = c.series[0].value; const b = c.series[c.series.length - 1].value;
    return b > a * 1.15 ? '↗' : b < a * 0.85 ? '↘' : '→';
  };

  return (
    <>
      <PageSeo
        title="Player Stock Market: Invest on Stats Alone | DoUKnowBall"
        description="Start six seasons back with 200M. Every candidate is anonymous: position, age, real value trajectory and output, never a name, country or club. Buy position by position until the XI is full, then jump to today and see what those careers became."
        path="/player-stock-market"
      />
      <GameShell width="narrow" title="Player Stock Market" emoji="📈" subtitle="200M, six seasons back, and nothing but the numbers.">
        {phase === 'setup' && (
          <div className="space-y-4 max-w-sm mx-auto">
            <div className="rounded-xl border border-border bg-surface-1 p-4 text-sm text-muted-foreground space-y-1.5">
              <p className="font-bold text-foreground">How to play</p>
              <p>The market opens six seasons in the past with 200M in your wallet and the 4-3-3's eleven slots to fill, two buys a year.</p>
              <p>Every candidate is anonymous: you see the position, the age, the real market value trajectory and the last two seasons of goals and assists. Never a name, a country or a club.</p>
              <p>You pay the real market value of the year you are in. After the eleventh buy the campaign jumps to today, the cards turn over, and your portfolio is worth what those careers really became.</p>
            </div>
            <button onClick={() => start('daily')} className="w-full rounded-xl border border-border bg-surface-1 p-4 text-left hover:border-primary/50 hover:bg-primary/5 transition-colors">
              <span className="block font-bold text-foreground">Daily market</span>
              <span className="block text-xs text-muted-foreground mt-0.5">The same campaign for everyone today</span>
            </button>
            <button onClick={() => start('unlimited')} className="w-full rounded-xl border border-border bg-surface-1 p-4 text-left hover:border-primary/50 hover:bg-primary/5 transition-colors">
              <span className="block font-bold text-foreground">Unlimited</span>
              <span className="block text-xs text-muted-foreground mt-0.5">A fresh market every run</span>
            </button>
          </div>
        )}

        {phase === 'loading' && (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        )}

        {phase === 'error' && (
          <div className="text-center py-12">
            <p className="text-destructive font-semibold mb-3">Couldn't open the market right now. The full value history needs a connection.</p>
            <button onClick={() => setPhase('setup')} className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-semibold">
              Back
            </button>
          </div>
        )}

        {phase === 'buying' && campaign && current && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Summer {current.offerYear}</span>
              <span>Buy {slotIndex + 1} of {campaign.slots.length} · the {current.slot.label}</span>
              <span className="inline-flex items-center gap-1 text-primary"><Wallet className="w-4 h-4" /> {formatMoney(remaining)}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {current.candidates.map((c, ci) => {
                const affordable = canAfford(campaign, slotIndex, c, remaining);
                return (
                  <button
                    key={ci}
                    onClick={() => buy(c)}
                    disabled={!affordable}
                    className={cn(
                      'rounded-xl border p-3 text-left transition-colors',
                      affordable ? 'bg-surface-1 border-border hover:border-primary/50' : 'bg-muted/20 border-border opacity-50',
                    )}
                  >
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-bold text-foreground">Anonymous {c.position} · age {c.age || '?'}</span>
                      <span className="text-base font-black text-primary">{formatMoney(c.price)}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">
                      Value {trend(c)} {c.series.map(sv => `${String(sv.year).slice(2)}: ${formatMoney(sv.value)}`).join(' · ')}
                    </p>
                    {c.output.length > 0 && (
                      <p className="text-[11px] text-muted-foreground tabular-nums">
                        Output {c.output.map(o => `${String(o.year).slice(2)}: ${o.goals}g ${o.assists}a`).join(' · ')}
                      </p>
                    )}
                    {!affordable && <p className="text-[10px] text-destructive mt-1">Too rich for the wallet with the rest of the XI still to buy</p>}
                  </button>
                );
              })}
            </div>

            <div className="rounded-xl border border-border bg-surface-1 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 text-center">Your portfolio so far</p>
              <div className="flex flex-wrap gap-1 justify-center">
                {campaign.slots.map((s, i) => (
                  <span key={i} className={cn(
                    'px-1.5 py-0.5 rounded text-[9px] font-semibold',
                    picks[i] ? 'bg-correct/15 text-foreground' : i === slotIndex ? 'bg-primary text-primary-foreground' : 'bg-secondary/60 text-muted-foreground',
                  )}>
                    {s.slot.label}{picks[i] ? ` ${formatMoney(picks[i].price)}` : ''}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {phase === 'done' && campaign && result && (
          <ResultScreen
            won={result.growth >= 1}
            outcomeEmoji={result.growth >= 1.5 ? '🚀' : result.growth >= 1 ? '📈' : '📉'}
            headline={result.growth >= 1.5 ? 'The market loved you!' : result.growth >= 1 ? 'In the green' : 'The market bit back'}
            statLine={`Spent ${formatMoney(result.spend)} between ${campaign.startYear} and ${campaign.startYear + 5}; worth ${formatMoney(result.finalValue)} in ${campaign.finalYear} (${formatPct(result.growth - 1)})`}
            funFact={`The unlimited wallet's best picks grew ${formatPct(result.bestGrowth - 1)}; the worst shrank to ${formatPct(result.worstGrowth - 1)}.`}
            statRow={[{ label: 'Score', value: result.score }]}
            emojiGrid={[`📈 Player Stock Market: ${result.score} pts`, ...picks.map(c => `${c.final > c.price ? '🟩' : '🟥'} ${formatMoney(c.price)} to ${formatMoney(c.final)}`)].join('\n')}
            share={{ score: String(result.score), gameName: 'Player Stock Market', gamePath: '/player-stock-market' }}
            onPlayAgain={() => setPhase('setup')}
            playAgainLabel="New market"
          >
            <div className="text-left text-sm space-y-1.5 my-4 py-3 px-4 rounded-xl bg-surface-2 border border-border/60">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> The reveal</p>
              {picks.map((c, i) => (
                <p key={i} className="text-muted-foreground">
                  <span className={cn('font-semibold', c.final > c.price ? 'text-correct' : 'text-destructive')}>{c.name}</span>
                  {' '}({c.nationality}, {c.club}): {formatMoney(c.price)} in {campaign.slots[i].offerYear} to {formatMoney(c.final)} today, {formatPct(candidateRatio(c) - 1)}
                </p>
              ))}
            </div>
          </ResultScreen>
        )}

        <AdBanner slot="1234567891" format="horizontal" className="mt-8" />
        <div className="flex justify-center mt-6">
          <ReportQuestion gameType={SLUG} />
        </div>

        <GameSeoContent
          pageHasOwnH1
          title="Player Stock Market: Invest on Stats Alone"
          description="The anonymous portfolio game: start six seasons back with 200M, and every candidate shows only a position, an age, a real market value trajectory and two seasons of output, never a name, country or club. Buy position by position until the XI is full, then jump to the present and learn what those careers became. All values are real market history."
        />
        <GameNav />
      </GameShell>
    </>
  );
}
