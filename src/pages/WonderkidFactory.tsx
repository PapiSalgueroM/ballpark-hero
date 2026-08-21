/**
 * Round 216: Wonderkid Factory, the academy idle game. The rules live in
 * src/lib/wonderkidFactory.ts; this file is only the screen. Layout follows
 * the house tile rule: the working surfaces are small boxes (HubTiles, the
 * same component the nine sim games share) and opening one REPLACES the
 * grid, never stacks under it.
 */
import { useEffect, useState } from 'react';
import { Star, HelpCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GameNavbar } from '@/components/game/GameNavbar';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { HubTiles, HubPanelHeader, HubTile } from '@/components/hub/HubTiles';
import { useWonderkidFactory } from '@/hooks/useWonderkidFactory';
import {
  FACILITIES, REGIONS, SAVE_KEY, MAX_REP,
  basePrice, capacity, facilityCost, findSec, fmtCash, potentialRead, priceMult,
  regionIndex, salePrice, trainMult, canMoveUp,
  SHOWCASE_COOLDOWN,
} from '@/lib/wonderkidFactory';

type Panel = 'scouting' | 'coaching' | 'dorms' | 'agents' | 'legacy' | null;

const WonderkidFactory = () => {
  const { state: s, floaters, doBuy, doSell, doShowcase, doMoveUp } = useWonderkidFactory();
  const [panel, setPanel] = useState<Panel>(null);
  /* the rules open themselves exactly once, before first play */
  const [showHelp, setShowHelp] = useState(false);
  useEffect(() => {
    try { if (!localStorage.getItem(SAVE_KEY)) setShowHelp(true); } catch { /* ignore */ }
  }, []);

  const region = REGIONS[regionIndex(s)];
  const cap = capacity(s);
  const goal = region.goal;
  const goalPct = Math.min(100, (s.lifetime / goal) * 100);
  const showcaseReady = s.showcaseCooldown <= 0 && s.showcaseLeft <= 0;

  const tiles: HubTile[] = FACILITIES.map(f => {
    const lvl = s.levels[f.id];
    const cost = facilityCost(s, f.id);
    const maxed = lvl >= f.maxLevel;
    return {
      key: f.id,
      icon: f.emoji,
      title: f.label,
      value: maxed ? `Level ${lvl}, maxed` : `Level ${lvl}`,
      sub: maxed ? 'nothing left to buy' : `next: ${fmtCash(cost)}`,
      accent: !maxed && s.cash >= cost,
    };
  });
  tiles.push({
    key: 'legacy',
    icon: '⭐',
    title: 'Reputation',
    value: s.rep === 0 ? 'Unknown academy' : `${s.rep} star${s.rep === 1 ? '' : 's'}`,
    sub: canMoveUp(s) ? 'the move up is ON' : `${fmtCash(s.lifetime)} of ${fmtCash(goal)}`,
    accent: canMoveUp(s),
  });

  return (
    <div className="min-h-screen bg-background">
      <GameNavbar />
      <PageSeo
        title="Wonderkid Factory: Free Idle Football Academy Game | DoUKnowBall"
        description="Run a youth academy: scouts find kids, coaches grow them toward hidden ceilings, and you decide when to cash out. Deadline day surges, reputation stars, six regions to climb. Free idle game, no sign-up."
        path="/wonderkid-factory"
      />
      <main id="dukb-main" className="max-w-2xl mx-auto px-4 py-4 md:py-8">
        <header className="text-center mb-3">
          <h1 className="text-3xl md:text-5xl font-bold tracking-[0.08em] text-primary font-display">WONDERKID FACTORY</h1>
          <div className="inline-flex items-center gap-1.5 mt-1 text-xs font-bold text-foreground bg-secondary rounded-full px-3 py-0.5">
            {region.emoji} {region.name}
            <span className="text-[10px] text-muted-foreground font-normal">
              {s.rep < MAX_REP ? `· earn ${fmtCash(goal)} here to move up` : '· nowhere higher to go'}
            </span>
          </div>
          <div className="flex items-center justify-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              {Array.from({ length: Math.min(s.rep, 6) }, (_, i) => <Star key={i} className="w-3 h-3 fill-yellow-500 text-yellow-500" />)}
              {s.rep > 6 && <span className="font-bold text-yellow-500">x{s.rep}</span>}
              {s.rep > 0 && <span className="text-yellow-500 font-bold">+{Math.round(s.rep * 15)}% training, +{Math.round(s.rep * 10)}% fees</span>}
            </span>
            <button onClick={() => setShowHelp(true)} className="inline-flex items-center gap-1 px-2 py-2 transition-colors hover:text-foreground">
              <HelpCircle className="w-3.5 h-3.5" /> How it works
            </button>
          </div>
        </header>

        {/* money header */}
        <div className="flex items-end justify-between mb-2 px-1">
          <div>
            <div className="text-3xl md:text-4xl font-bold font-display text-gold tabular-nums">{fmtCash(s.cash)}</div>
            <div className="text-[11px] text-muted-foreground">
              training x{trainMult(s).toFixed(2)} · fees x{priceMult(s).toFixed(2)}
              {s.deadlineLeft > 0 && <span className="text-gold font-bold"> · DEADLINE DAY ({Math.ceil(s.deadlineLeft)}s)</span>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold text-foreground tabular-nums">{s.prospects.length} / {cap} beds</div>
            <div className="text-[11px] text-muted-foreground">next find in ~{Math.max(0, Math.ceil(findSec(s) - s.scoutProgress))}s</div>
          </div>
        </div>

        {/* the heartbeat button */}
        <button
          onClick={doShowcase}
          disabled={!showcaseReady}
          className={cn(
            'relative w-full mb-2 py-2 rounded-xl font-bold text-sm overflow-hidden border transition-all',
            s.showcaseLeft > 0 ? 'border-yellow-500 bg-yellow-500/15 text-yellow-400'
              : showcaseReady ? 'border-yellow-500 bg-yellow-500 text-black wf-glow'
              : 'border-border bg-card text-muted-foreground',
          )}
        >
          {!showcaseReady && s.showcaseLeft <= 0 && (
            <span className="absolute inset-y-0 left-0 bg-yellow-500/15 transition-all duration-700" style={{ width: `${Math.min(100, ((SHOWCASE_COOLDOWN - s.showcaseCooldown) / SHOWCASE_COOLDOWN) * 100)}%` }} />
          )}
          <span className="relative">
            {s.showcaseLeft > 0 ? `🎪 SHOWCASE DAY: training x3 (${Math.ceil(s.showcaseLeft)}s)`
              : showcaseReady ? '🎪 SHOWCASE DAY READY: press for x3 training'
              : `🎪 Next showcase in ${Math.ceil(s.showcaseCooldown)}s`}
          </span>
        </button>

        {/* deadline banner when live */}
        {s.deadlineLeft > 0 && (
          <div className="mb-2 rounded-xl border border-gold/60 bg-gold/10 px-3 py-1.5 text-center text-xs font-bold text-gold">
            🚨 DEADLINE DAY: every fee pays x1.5 for {Math.ceil(s.deadlineLeft)}s
          </div>
        )}

        {/* the academy */}
        <div className="rounded-2xl border border-border bg-card p-3 mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">The academy</span>
            <span className="text-[10px] text-muted-foreground">sell when the price is right, kids leave free at 24</span>
          </div>
          {s.prospects.length === 0 ? (
            <div className="h-24 flex items-center justify-center text-xs text-muted-foreground text-center px-4">
              the beds are empty. The scouts are out looking, the first kid arrives in about {Math.max(1, Math.ceil(findSec(s) - s.scoutProgress))}s.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {s.prospects.map(p => {
                const read = potentialRead(s, p);
                const price = salePrice(s, p);
                const pct = Math.min(100, ((p.rating - 40) / 59) * 100);
                const nearCeiling = p.rating >= p.potential - 0.5;
                return (
                  <div key={p.id} className={cn('rounded-xl border p-2.5', nearCeiling ? 'border-gold/50 bg-gold/5' : 'border-border bg-background/40')}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-foreground">{p.name}</div>
                        <div className="text-[10px] text-muted-foreground">{p.pos} · {p.nation} · age {p.age}{p.age >= 21 ? ' · promise fading' : ''}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-lg font-black font-display text-foreground tabular-nums">{Math.floor(p.rating)}</div>
                        <div className="text-[9px] text-muted-foreground">
                          {read.kind === 'exact' ? `ceiling ${read.lo}` : read.kind === 'range' ? `ceiling ${read.lo} to ${read.hi}` : 'ceiling unknown'}
                        </div>
                      </div>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div className={cn('h-full rounded-full transition-all', nearCeiling ? 'bg-gold' : 'bg-primary')} style={{ width: `${pct}%` }} />
                    </div>
                    <button
                      onClick={() => doSell(p.id)}
                      className="mt-2 w-full rounded-lg bg-primary text-primary-foreground text-xs font-bold py-2 hover:opacity-90 transition-opacity"
                    >
                      Sell for {fmtCash(price)}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* the boxes, or the one opened panel in their place */}
        {panel === null ? (
          <HubTiles tiles={tiles} onOpen={k => setPanel(k as Panel)} />
        ) : panel === 'legacy' ? (
          <div className="space-y-2">
            <HubPanelHeader title="Reputation" onBack={() => setPanel(null)} />
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">earned in {region.name}</span>
                  <span className="font-bold text-foreground tabular-nums">{fmtCash(s.lifetime)} / {fmtCash(goal)}</span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${goalPct}%` }} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-snug">
                Move up and the academy starts again in a bigger place: cash, facilities and every kid stay behind.
                The star is forever: +15% training and +10% fees each, and the next region's scouts find higher ceilings.
              </p>
              {s.rep < REGIONS.length - 1 && (
                <p className="text-[11px] text-muted-foreground">next stop: {REGIONS[Math.min(s.rep + 1, REGIONS.length - 1)].emoji} {REGIONS[Math.min(s.rep + 1, REGIONS.length - 1)].name}, ceilings up to {REGIONS[Math.min(s.rep + 1, REGIONS.length - 1)].potMax}</p>
              )}
              <button
                onClick={doMoveUp}
                disabled={!canMoveUp(s)}
                className={cn(
                  'w-full py-2.5 rounded-xl font-bold text-sm transition-all',
                  canMoveUp(s) ? 'bg-gold text-gold-foreground wf-glow' : 'bg-secondary text-muted-foreground',
                )}
              >
                {canMoveUp(s) ? `⭐ Move up to ${REGIONS[Math.min(s.rep + 1, REGIONS.length - 1)].name}` : `earn ${fmtCash(Math.max(0, goal - s.lifetime))} more first`}
              </button>
              <div className="text-[10px] text-muted-foreground text-center">
                career: {fmtCash(s.careerEarned)} earned · {s.soldCareer} kids sold on · best fee {fmtCash(s.best)}{s.leftFree > 0 ? ` · ${s.leftFree} walked for free` : ''}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <HubPanelHeader title={FACILITIES.find(f => f.id === panel)!.label} onBack={() => setPanel(null)} />
            {(() => {
              const f = FACILITIES.find(x => x.id === panel)!;
              const lvl = s.levels[f.id];
              const cost = facilityCost(s, f.id);
              const maxed = lvl >= f.maxLevel;
              return (
                <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{f.emoji}</span>
                    <div>
                      <div className="text-sm font-bold text-foreground">Level {lvl}{maxed ? ' (maxed)' : ''}</div>
                      <p className="text-xs text-muted-foreground">{f.blurb}</p>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {panel === 'scouting' && <>a find every ~{Math.ceil(findSec(s))}s now{s.levels.scouting < 6 ? `, ceilings read ${s.levels.scouting < 3 ? 'blind' : 'as a range'}` : ', ceilings read exactly'}</>}
                    {panel === 'coaching' && <>training runs at x{trainMult(s).toFixed(2)} right now</>}
                    {panel === 'dorms' && <>{cap} beds, {s.prospects.length} in use. A full academy stops scouting</>}
                    {panel === 'agents' && <>every fee pays x{priceMult(s).toFixed(2)} right now</>}
                  </div>
                  <button
                    onClick={() => doBuy(f.id)}
                    disabled={maxed || s.cash < cost}
                    className={cn(
                      'w-full py-2.5 rounded-xl font-bold text-sm transition-all',
                      !maxed && s.cash >= cost ? 'bg-primary text-primary-foreground hover:opacity-90' : 'bg-secondary text-muted-foreground',
                    )}
                  >
                    {maxed ? 'maxed out' : `Upgrade for ${fmtCash(cost)}`}
                  </button>
                </div>
              );
            })()}
          </div>
        )}

        {/* floaters */}
        <div aria-hidden="true" className="pointer-events-none fixed bottom-20 inset-x-0 flex flex-col items-center gap-1 z-40">
          {floaters.map(f => (
            <div key={f.id} className={cn('wf-float rounded-full px-3 py-1 text-xs font-bold border',
              f.kind === 'sale' ? 'bg-gold/15 border-gold/50 text-gold'
                : f.kind === 'bad' ? 'bg-destructive/15 border-destructive/50 text-destructive'
                : 'bg-primary/15 border-primary/50 text-primary')}>
              {f.text}
            </div>
          ))}
        </div>

        <div className="text-[10px] text-muted-foreground text-center py-4">
          this run: {fmtCash(s.lifetime)} earned · {s.sold} sold · region {regionIndex(s) + 1} of {REGIONS.length}
        </div>

        <GameSeoContent
          pageHasOwnH1
          title="Wonderkid Factory"
          description="Run a youth academy: scouts bring in generated kids, coaches grow them toward hidden ceilings, and you decide when to cash out. Deadline day surges, reputation stars and six regions to climb."
        />
      </main>

      {/* rules modal, shown before first play and reopenable from the ? */}
      {showHelp && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowHelp(false)}>
          {/* Round 220: a real dialog to the platform, not just a styled div,
              and the house bottom button every rules screen carries. */}
          <div role="dialog" data-state="open" aria-modal="true" aria-label="How Wonderkid Factory works" className="bg-card border border-border rounded-2xl p-5 max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-lg font-bold font-display text-foreground">How Wonderkid Factory works</div>
              <button onClick={() => setShowHelp(false)} aria-label="Close the rules"><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>You run a youth academy. Scouts bring in kids, coaches make them better every second, and every kid has a hidden ceiling he will never grow past. Your whole job is deciding when to sell.</p>
              <p>A fee pays for the rating on the day PLUS a promise premium for the room still left to grow, and that premium is biggest while he is young. From 21 it fades, at 23 it is gone, and on his 24th birthday he walks out free. Patience pays right up until it does not.</p>
              <p>Four upgrades: the Scouting network finds kids faster (level 3 reads each ceiling as a range, level 6 reads it exactly), Coaching speeds all growth, Dorms add beds (a full academy stops scouting), and the Agent office fattens every fee.</p>
              <p>Showcase day is the button: press it and training runs x3 for 25 seconds. Deadline day arrives on its own every few minutes and pays x1.5 on every sale for 50 seconds, so hold your stars for it when you can.</p>
              <p>Earn the region's target and you can move the whole academy up in the world: cash, facilities and kids stay behind, the reputation star is forever (+15% training, +10% fees each) and the new region's kids have higher ceilings.</p>
              <p>Away from the game the scouts and coaches keep working at half speed for up to 8 hours, and the calendar waits for you: nobody ages while you are gone. Nothing sells itself either, the money moments are always yours.</p>
              <p>Worked example: a 17 year old rated 58 with a ceiling of 74 sells for about {fmtCash(salePriceExample(58, 74))} today. Coached to 71 he is worth about {fmtCash(salePriceExample(71, 74))}, and on deadline day that fee pays half as much again. Held to 23, the promise premium is gone and only the rating pays.</p>
            </div>
            <button
              onClick={() => setShowHelp(false)}
              className="mt-4 w-full py-3 rounded-xl font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Let's go
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes wfFloat { 0% { opacity: 0; transform: translateY(8px); } 10% { opacity: 1; transform: translateY(0); } 80% { opacity: 1; } 100% { opacity: 0; transform: translateY(-18px); } }
        .wf-float { animation: wfFloat 2.6s ease-out forwards; }
        @keyframes wfGlow { 0%, 100% { box-shadow: 0 0 6px rgba(234,179,8,0.5); } 50% { box-shadow: 0 0 22px rgba(234,179,8,0.9); } }
        .wf-glow { animation: wfGlow 1.6s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

/** the help modal's example fees ride the real price curve at x1
 *  multipliers, so the numbers can never drift from the game */
function salePriceExample(rating: number, potential: number): number {
  return Math.round(basePrice(rating, potential, 17));
}

export default WonderkidFactory;
