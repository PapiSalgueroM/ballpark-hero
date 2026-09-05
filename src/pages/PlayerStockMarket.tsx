import { useCallback, useRef, useState } from 'react';
import { Loader2, TrendingUp, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FlagImg } from '@/components/FlagImg';
import { GameShell } from '@/components/game/GameShell';
import { ResultScreen } from '@/components/game/ResultScreen';
import { GameNav } from '@/components/game/GameNav';
import AdBanner from '@/components/ads/AdBanner';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { getTodayET } from '@/lib/dateUtils';
import {
  Campaign, Holding, START_YEARS, STOCK_BUDGET, StockCard, StockFinish, YearStep,
  assembleCampaign, buildHoldings, canAfford, dailyCampaignSeed, fetchHoldingHistories,
  fetchStartSeasonPool, finishCampaign, formatMoney, formatPct, loadDailyResult,
  randomCampaignSeed, saveDailyResult, startYearFor, yearSteps,
} from '@/lib/playerStockMarket';

/**
 * Player Stock Market (Round 458, the owner's format): the market opens in
 * a past season with 200M, you fill the XI position by position seeing ONLY
 * the numbers, then the years roll forward one at a time to the latest
 * season and every holding moves as it really moved. Never a name, a
 * country or a club until the reveal at the end.
 */

type Phase = 'setup' | 'loading' | 'error' | 'buying' | 'rolling' | 'stepping' | 'done';
type Mode = 'daily' | 'unlimited';
const SLUG = 'player-stock-market';

export default function PlayerStockMarket() {
  /* Round 428: the day is read ONCE, at mount, and every daily decision
     (the seed, the record) uses this one value. A session that crosses
     midnight ET finishes the day it started; a reload deals the new day. */
  const todayStr = useRef(getTodayET()).current;
  /* A finished daily comes back from storage in the initializer: the page
     mounts on the result, useGameCompletion sees no transition, nothing
     records twice and nothing is fetched. */
  const [dailyResult, setDailyResult] = useState<StockFinish | null>(() => loadDailyResult(todayStr));
  const [finish, setFinish] = useState<StockFinish | null>(dailyResult);
  const [phase, setPhase] = useState<Phase>(dailyResult ? 'done' : 'setup');
  const [mode, setMode] = useState<Mode>('daily');
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [slotIndex, setSlotIndex] = useState(0);
  const [picks, setPicks] = useState<StockCard[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [steps, setSteps] = useState<YearStep[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState('');

  const start = useCallback(async (m: Mode, chosenYear?: number) => {
    if (m === 'daily' && dailyResult) {
      /* Today's market is closed: the result reopens, the cards do not. */
      setMode('daily');
      setFinish(dailyResult);
      setPhase('done');
      return;
    }
    setMode(m);
    setFinish(null);
    setPhase('loading');
    const seed = m === 'daily' ? dailyCampaignSeed(todayStr) : randomCampaignSeed();
    const year = m === 'daily' ? startYearFor(seed) : (chosenYear ?? startYearFor(seed));
    const rows = await fetchStartSeasonPool(year);
    const built = rows ? assembleCampaign(rows, seed, year) : null;
    if (!built) { setError(`Couldn't open the ${year} market right now. The season's rows need a connection.`); setPhase('error'); return; }
    setCampaign(built);
    setSlotIndex(0);
    setPicks([]);
    setPhase('buying');
  }, [dailyResult, todayStr]);

  const remaining = STOCK_BUDGET - picks.reduce((s, c) => s + c.price, 0);
  const current = campaign && phase === 'buying' ? campaign.slots[slotIndex] : null;

  /* The eleventh buy rolls the years: one query for the eleven, every
     season from the start to the final one, then a step per season. */
  const roll = useCallback(async (c: Campaign, bought: StockCard[]) => {
    setPhase('rolling');
    const names = bought.map(card => c.identities[card.id]).filter(Boolean);
    const rows = await fetchHoldingHistories(names, c.startYear, c.finalYear);
    if (!rows) { setError("Couldn't fetch the seasons after your buys. The year by year values need a connection."); setPhase('error'); return; }
    const built = buildHoldings(c, bought, rows);
    setHoldings(built);
    setSteps(yearSteps(built, c.startYear, c.finalYear));
    setStepIndex(0);
    setPhase('stepping');
  }, []);

  const buy = (c: StockCard) => {
    if (!campaign || !current || !canAfford(campaign, slotIndex, c, remaining)) return;
    const next = [...picks, c];
    setPicks(next);
    if (slotIndex + 1 >= campaign.slots.length) { void roll(campaign, next); return; }
    setSlotIndex(i => i + 1);
  };

  const advance = () => {
    if (!campaign) return;
    if (stepIndex + 1 < steps.length) { setStepIndex(i => i + 1); return; }
    const done = finishCampaign(campaign, picks, holdings);
    if (mode === 'daily') {
      saveDailyResult(todayStr, done);
      setDailyResult(done);
    }
    setFinish(done);
    setPhase('done');
  };

  useGameCompletion(SLUG, finish !== null, finish?.score ?? 0, finish ? finish.holdings.filter(h => h.final > h.price).length : 0);

  const step = phase === 'stepping' ? steps[stepIndex] : null;
  const prevTotal = step ? (stepIndex === 0 ? holdings.reduce((s, h) => s + h.price, 0) : steps[stepIndex - 1].total) : 0;
  const biggest = step
    ? step.lines.filter(l => l.value !== null).map(l => ({ i: l.holding, r: (l.value as number) / l.prev - 1 })).sort((a, b) => Math.abs(b.r) - Math.abs(a.r))[0]
    : null;

  return (
    <>
      <PageSeo
        title="Player Stock Market: Invest on Stats Alone | DoUKnowBall"
        description="Open the market in a past season with 200M. Every card is anonymous: position, age, matches, goals, assists, cards and the real price, never a name, country or club. Buy position by position until the XI is full, then roll forward year by year and see what those careers became."
        path="/player-stock-market"
      />
      <GameShell
        width="narrow"
        title="Player Stock Market"
        emoji="📈"
        subtitle="200M, a past season, and nothing but the numbers."
        showReportQuestion
      >
        {phase === 'setup' && (
          <div className="space-y-4 max-w-sm mx-auto">
            <div className="rounded-xl border border-border bg-surface-1 p-4 text-sm text-muted-foreground space-y-1.5">
              <p className="font-bold text-foreground">How to play</p>
              <p>The market opens in a past season with 200M in your wallet and the 4-3-3's eleven slots to fill, one position at a time.</p>
              <p>Every card is anonymous: position, age, matches, goals, assists, cards and the price, which is that season's real market value. Never a name, a country or a club.</p>
              <p>When the XI is full the years roll forward one at a time to the latest season, and every holding moves as it really moved. Then the names turn over.</p>
              <p><span className="font-semibold text-foreground">How you are scored:</span> on what your eleven are worth at the end against the best and the worst eleven that 200M could have bought from the same cards. Money you never spend buys nothing, so the wallet is there to be used.</p>
            </div>
            <button onClick={() => start('daily')} className="w-full rounded-xl border border-border bg-surface-1 p-4 text-left hover:border-primary/50 hover:bg-primary/5 transition-colors">
              <span className="block font-bold text-foreground">{dailyResult ? "Today's market is closed" : 'Daily market'}</span>
              <span className="block text-xs text-muted-foreground mt-0.5">{dailyResult ? 'See your result' : 'The same season and the same cards for everyone today'}</span>
            </button>
            <div className="rounded-xl border border-border bg-surface-1 p-4">
              <p className="font-bold text-foreground">Unlimited</p>
              <p className="text-xs text-muted-foreground mt-0.5 mb-2">Pick the season the market opens in, or let it roll one.</p>
              <div className="flex flex-wrap gap-1.5">
                {START_YEARS.map(y => (
                  <button key={y} onClick={() => start('unlimited', y)} className="px-3 py-1.5 rounded-full border border-border text-sm font-semibold text-foreground hover:border-primary/50 hover:bg-primary/5 transition-colors">
                    {y}
                  </button>
                ))}
                <button onClick={() => start('unlimited')} className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                  Surprise me
                </button>
              </div>
            </div>
          </div>
        )}

        {(phase === 'loading' || phase === 'rolling') && (
          <div className="flex flex-col items-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            {phase === 'rolling' && <p>Rolling the years forward</p>}
          </div>
        )}

        {phase === 'error' && (
          <div className="text-center py-12">
            <p className="text-destructive font-semibold mb-3">{error}</p>
            <button onClick={() => setPhase('setup')} className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-semibold">
              Back
            </button>
          </div>
        )}

        {phase === 'buying' && campaign && current && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Summer {campaign.startYear}</span>
              <span>Buy {slotIndex + 1} of {campaign.slots.length} · the {current.slot.label}</span>
              <span className="inline-flex items-center gap-1 text-primary"><Wallet className="w-4 h-4" /> {formatMoney(remaining)}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {current.candidates.map(c => {
                const affordable = canAfford(campaign, slotIndex, c, remaining);
                return (
                  <button
                    key={c.id}
                    onClick={() => buy(c)}
                    disabled={!affordable}
                    className={cn(
                      'rounded-xl border p-3 text-left transition-colors',
                      affordable ? 'bg-surface-1 border-border hover:border-primary/50' : 'bg-muted/20 border-border opacity-50',
                    )}
                  >
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-bold text-foreground">{c.position} · age {c.age ?? '?'}</span>
                      <span className="text-base font-black text-primary">{formatMoney(c.price)}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">
                      {c.matches === null ? 'matches not recorded' : `${c.matches} matches`} · {c.goals} goals · {c.assists} assists
                    </p>
                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      {c.yellowCards} yellow · {c.redCards} red
                    </p>
                    {!affordable && <p className="text-[10px] text-destructive mt-1">Too rich for the wallet with the rest of the XI still to buy</p>}
                  </button>
                );
              })}
            </div>

            <div className="rounded-xl border border-border bg-surface-1 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 text-center">Your XI so far</p>
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

        {phase === 'stepping' && campaign && step && (
          <div className="space-y-3">
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Season {stepIndex + 1} of {steps.length}</p>
              <p className="text-3xl font-black text-foreground">{step.year}</p>
              <p className={cn('text-sm font-semibold tabular-nums', step.total >= prevTotal ? 'text-correct' : 'text-destructive')}>
                {formatMoney(prevTotal)} to {formatMoney(step.total)}{step.known < step.lines.length ? ` across the ${step.known} of ${step.lines.length} with a row` : ''}
              </p>
              {biggest && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Biggest move: your {holdings[biggest.i].slot} ({holdings[biggest.i].position}) {formatPct(biggest.r)}
                </p>
              )}
            </div>
            <div className="rounded-xl border border-border bg-surface-1 divide-y divide-border/60">
              {step.lines.map(l => {
                const h = holdings[l.holding];
                return (
                  <div key={l.holding} className="flex items-center justify-between px-3 py-1.5 text-xs tabular-nums">
                    <span className="font-semibold text-foreground">{h.slot} · {h.position} · age {h.age === null ? '?' : h.age + (step.year - campaign.startYear)}</span>
                    {l.value === null ? (
                      <span className="text-muted-foreground">no row for {step.year}</span>
                    ) : (
                      <span className={l.value >= l.prev ? 'text-correct' : 'text-destructive'}>
                        {formatMoney(l.prev)} to {formatMoney(l.value)} ({formatPct(l.value / l.prev - 1)})
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <button onClick={advance} className="w-full px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-semibold">
              {stepIndex + 1 < steps.length ? `On to ${step.year + 1}` : 'Turn the cards over'}
            </button>
          </div>
        )}

        {phase === 'done' && finish && (
          <ResultScreen
            won={finish.growth >= 1}
            outcomeEmoji={finish.growth >= 1.5 ? '🚀' : finish.growth >= 1 ? '📈' : '📉'}
            headline={finish.growth >= 1.5 ? 'The market loved you!' : finish.growth >= 1 ? 'In the green' : 'The market bit back'}
            statLine={`Put ${formatMoney(finish.spend)} of your ${formatMoney(finish.budget)} to work in ${finish.startYear}; the eleven are worth ${formatMoney(finish.finalValue)} in ${finish.finalYear} (${formatPct(finish.growth - 1)} on the whole wallet)`}
            funFact={`The best eleven that ${formatMoney(finish.budget)} could have bought from these cards would be worth ${formatMoney(finish.bestValue)}; the worst, ${formatMoney(finish.worstValue)}.`}
            statRow={[{ label: 'Score', value: finish.score }]}
            emojiGrid={[`📈 Player Stock Market ${finish.startYear} to ${finish.finalYear}: ${finish.score} pts`, ...finish.holdings.map(h => `${h.final > h.price ? '🟩' : '🟥'} ${h.slot} ${formatMoney(h.price)} to ${formatMoney(h.final)}`)].join('\n')}
            share={{ score: String(finish.score), gameName: 'Player Stock Market', gamePath: '/player-stock-market' }}
            onPlayAgain={() => setPhase('setup')}
            playAgainLabel={mode === 'daily' ? 'Open another season' : 'New market'}
          >
            <div className="text-left text-sm space-y-1.5 my-4 py-3 px-4 rounded-xl bg-surface-2 border border-border/60">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> The reveal</p>
              {finish.holdings.map((h, i) => (
                <p key={i} className="text-muted-foreground">
                  <span className={cn('font-semibold', h.final > h.price ? 'text-correct' : 'text-destructive')}>{h.name}</span>
                  {' '}(<FlagImg name={h.nationality} size={12} showLabel />, {h.club} in {finish.startYear}): {formatMoney(h.price)} to {formatMoney(h.final)} in {finish.finalYear}, {formatPct(h.final / h.price - 1)}
                </p>
              ))}
              <p className="text-[11px] text-muted-foreground pt-1 tabular-nums">
                Year by year: {finish.holdings[0].series.map((_, k) => `${finish.startYear + k} ${formatMoney(finish.holdings.reduce((s, h) => s + (h.series[k] ?? 0), 0))}`).join(' · ')}
              </p>
            </div>
          </ResultScreen>
        )}

        <AdBanner slot="7540487748" format="horizontal" className="mt-8" />

        <GameSeoContent
          pageHasOwnH1
          title="Player Stock Market: Invest on Stats Alone"
          description="The anonymous portfolio game: open the market in a past season with 200M, and every card shows only a position, an age, that season's matches, goals, assists and cards, and the real price, never a name, country or club. Buy position by position until the XI is full, roll forward one season at a time to the present, and learn what those careers became. All values are real market history."
        />
        <GameNav />
      </GameShell>
    </>
  );
}
