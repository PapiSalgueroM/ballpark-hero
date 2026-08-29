/**
 * Round 252: Hall of Champions, the museum idle game. Every rule lives in
 * src/lib/hallOfChampions.ts; this file is only the screen. Layout follows
 * the house tile rule: the working surfaces are small boxes (HubTiles, the
 * component the sim games share) and opening one REPLACES the grid rather
 * than stacking under it.
 *
 * The thing that makes this game different from the other two idles is on
 * the wall: every exhibit is a real championship read from the audited
 * tables, so the plaque under it is the record, not flavor text.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, HelpCircle, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GameNavbar } from '@/components/game/GameNavbar';
import { GameHelp } from '@/components/game/GameHelp';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { HubTiles, HubPanelHeader, type HubTile } from '@/components/hub/HubTiles';
import { useHallOfChampions } from '@/hooks/useHallOfChampions';
import {
  UPGRADES, SAVE_KEY, loadSave, MILESTONE_EVERY, PLAQUE_BONUS, RENOWN_BONUS, RENOWN_PER,
  REDEDICATE_MIN, RUSH_MULT, RUSH_COOLDOWN,
  artifactCost, upgradeCost, totalIncome, wingIncome, canBuyArtifact, canOpenWing,
  canBuyUpgrade, canRush, canRededicate, renownOnRededicate, totalArtifacts,
  rushSeconds, fmt, type Wing,
} from '@/lib/hallOfChampions';

type Panel = 'tours' | 'network' | 'shop' | 'archive' | 'renown' | null;

const HallOfChampions = () => {
  const {
    loadState, wings, state: s, floaters, offlineEarned, dismissOffline,
    doBuyArtifact, doOpenWing, doBuyUpgrade, doRush, doRededicate,
  } = useHallOfChampions();
  const [panel, setPanel] = useState<Panel>(null);
  const [showHelp, setShowHelp] = useState(false);
  useEffect(() => {
    /* The rules open themselves once, before a first museum. A save that
       fails to load is a first museum too: the engine hands that player a
       fresh hall, so asking localStorage whether a KEY exists would leave
       exactly the wrecked-save case staring at a game with no rules. Ask
       whether it LOADS instead. */
    try { if (!loadSave(localStorage.getItem(SAVE_KEY))) setShowHelp(true); } catch { setShowHelp(true); }
  }, []);

  const seo = (
    <GameSeoContent
      pageHasOwnH1
      title="Hall of Champions | DoUKnowBall"
      description="An idle museum built entirely on real championship history. Ten wings, hundreds of real title-winning teams from 1889 to today, each plaque checked against the same audited record books the rest of the site runs on."
      howToPlay={[
        'Visitors pay admission every second, even while the tab is closed',
        'Spend the takings acquiring real championships, oldest first in each wing',
        'Every 10 exhibits in a wing doubles that wing income',
        'Open new wings as the money allows, from the Super Bowl through to the NRL and AFL',
        'Rededicate when the hall is big enough to trade the exhibits for permanent renown',
      ]}
      examples={[
        'The first exhibit is Super Bowl I, and the plaque names the champion, the beaten team and the score',
        'Finishing a wing hangs a permanent plaque worth +25% income that survives every rededication',
        'Anniversary weekends triple admissions for a few seconds, and the archive vault makes them last longer',
      ]}
    />
  );

  if (loadState !== 'ready' || !s) {
    return (
      <div className="min-h-screen bg-background">
        <GameNavbar />
        <div className="relative mx-auto w-full max-w-4xl"><GameHelp /></div>
        <PageSeo
          title="Hall of Champions: Free Idle Sports Museum Game | DoUKnowBall"
          description="Build a sports museum out of real championship history. Every exhibit is a verified title winner, from Super Bowl I to this year. Free idle game, keeps earning while you are away, no sign-up."
          path="/hall-of-champions"
        />
        <main id="dukb-main" className="max-w-2xl mx-auto px-4 py-10 text-center">
          <h1 className="text-3xl md:text-5xl font-bold tracking-[0.08em] text-primary font-display mb-6">HALL OF CHAMPIONS</h1>
          {loadState === 'loading' ? (
            <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm">unpacking the archive...</p>
            </div>
          ) : (
            <div className="py-12 text-muted-foreground">
              <p className="mb-3">Couldn't load the championship archive right now.</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold"
              >Try again</button>
            </div>
          )}
          {seo}
        </main>
      </div>
    );
  }

  const income = totalIncome(wings, s, s.clock);
  const owned = totalArtifacts(s);
  const openWings = wings.filter(w => s.openWings.includes(w.key));
  const nextWing = wings.find(w => !s.openWings.includes(w.key));
  const rushLive = s.clock < s.rushUntil;
  const rushReady = canRush(s);
  const rushProgress = Math.min(100, Math.max(0, ((s.rushReadyAt - s.clock) / RUSH_COOLDOWN)) * 100);

  const tiles: HubTile[] = UPGRADES.map(u => {
    const lvl = s.levels[u.id];
    const cost = upgradeCost(u, lvl);
    const maxed = lvl >= u.maxLevel;
    return {
      key: u.id,
      icon: u.emoji,
      title: u.label,
      value: maxed ? `Level ${lvl}, maxed` : `Level ${lvl}`,
      sub: maxed ? 'nothing left to buy' : `next: ${fmt(cost)}`,
      accent: !maxed && s.funds >= cost,
    };
  });
  tiles.push({
    key: 'renown',
    icon: '⭐',
    title: 'Renown',
    value: s.renown === 0 ? 'A local curiosity' : `${s.renown} star${s.renown === 1 ? '' : 's'}`,
    sub: canRededicate(s) ? 'rededication is ON' : `${owned} exhibits of ${REDEDICATE_MIN} needed`,
    accent: canRededicate(s),
  });

  return (
    <div className="min-h-screen bg-background">
      <GameNavbar />
      <div className="relative mx-auto w-full max-w-4xl"><GameHelp /></div>
      <PageSeo
        title="Hall of Champions: Free Idle Sports Museum Game | DoUKnowBall"
        description="Build a sports museum out of real championship history. Every exhibit is a verified title winner, from Super Bowl I to this year. Free idle game, keeps earning while you are away, no sign-up."
        path="/hall-of-champions"
      />
      <main id="dukb-main" className="max-w-2xl mx-auto px-4 py-4 md:py-8">
        <header className="text-center mb-3">
          <h1 className="text-3xl md:text-5xl font-bold tracking-[0.08em] text-primary font-display">HALL OF CHAMPIONS</h1>
          <div className="inline-flex items-center gap-1.5 mt-1 text-xs font-bold text-foreground bg-secondary rounded-full px-3 py-0.5">
            🏛️ {owned} real champions on the walls
            <span className="text-[10px] text-muted-foreground font-normal">
              · {openWings.length} of {wings.length} wings open
            </span>
          </div>
          <div className="flex items-center justify-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              {Array.from({ length: Math.min(s.renown, 6) }, (_, i) => <Star key={i} className="w-3 h-3 fill-yellow-500 text-yellow-500" />)}
              {s.renown > 6 && <span className="font-bold text-yellow-500">x{s.renown}</span>}
              {s.renown > 0 && <span className="text-yellow-500 font-bold">+{Math.round(s.renown * RENOWN_BONUS * 100)}% admissions</span>}
            </span>
            <button onClick={() => setShowHelp(true)} className="inline-flex items-center gap-1 px-2 py-2 transition-colors hover:text-foreground">
              <HelpCircle className="w-3.5 h-3.5" /> How it works
            </button>
          </div>
        </header>

        {offlineEarned !== null && (
          <div className="mb-2 rounded-xl border border-gold/60 bg-gold/10 px-3 py-2 flex items-center justify-between gap-3">
            <span className="text-xs text-gold font-bold">
              🎟️ the hall stayed open: {fmt(offlineEarned)} in admissions while you were away
            </span>
            <button onClick={dismissOffline} className="text-gold/70 hover:text-gold p-1" aria-label="Dismiss the offline earnings notice">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* money header */}
        <div className="flex items-end justify-between mb-2 px-1">
          <div>
            <div className="text-3xl md:text-4xl font-bold font-display text-gold tabular-nums">{fmt(s.funds)}</div>
            <div className="text-[11px] text-muted-foreground">
              {fmt(income)} admissions a second
              {rushLive && <span className="text-gold font-bold"> · ANNIVERSARY x{RUSH_MULT} ({Math.ceil(s.rushUntil - s.clock)}s)</span>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold text-foreground tabular-nums">
              {s.plaques.length} plaque{s.plaques.length === 1 ? '' : 's'}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {s.plaques.length > 0 ? `+${Math.round(s.plaques.length * PLAQUE_BONUS * 100)}% forever` : 'complete a wing to earn one'}
            </div>
          </div>
        </div>

        {/* the heartbeat button */}
        <button
          onClick={doRush}
          disabled={!rushReady}
          className={cn(
            'relative w-full mb-2 py-2 rounded-xl font-bold text-sm overflow-hidden border transition-all',
            rushLive ? 'border-yellow-500 bg-yellow-500/15 text-yellow-400'
              : rushReady ? 'border-yellow-500 bg-yellow-500 text-black'
              : 'border-border bg-card text-muted-foreground',
          )}
        >
          {!rushReady && !rushLive && (
            <span className="absolute inset-y-0 left-0 bg-yellow-500/15 transition-all duration-700" style={{ width: `${100 - rushProgress}%` }} />
          )}
          <span className="relative">
            {rushLive ? `🎉 ANNIVERSARY WEEKEND: admissions x${RUSH_MULT} (${Math.ceil(s.rushUntil - s.clock)}s)`
              : rushReady ? `🎉 ANNIVERSARY WEEKEND READY: press for x${RUSH_MULT} for ${rushSeconds(s)}s`
              : `🎉 Next anniversary in ${Math.ceil(s.rushReadyAt - s.clock)}s`}
          </span>
        </button>

        {/* the wings */}
        <div className="space-y-2 mb-3">
          {openWings.map(w => (
            <WingRow key={w.key} wing={w} state={s} onBuy={() => doBuyArtifact(w.key)} />
          ))}
          {nextWing && (
            <button
              onClick={() => doOpenWing(nextWing.key)}
              disabled={!canOpenWing(nextWing, s)}
              className={cn(
                'w-full rounded-2xl border border-dashed p-3 text-left transition-colors',
                canOpenWing(nextWing, s) ? 'border-primary bg-primary/5 hover:bg-primary/10' : 'border-border bg-card/40',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-foreground">{nextWing.emoji} Open the {nextWing.title} wing</span>
                <span className={cn('text-sm font-bold tabular-nums', canOpenWing(nextWing, s) ? 'text-primary' : 'text-muted-foreground')}>
                  {fmt(nextWing.unlock)}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {nextWing.artifacts.length} real champions waiting, {nextWing.artifacts[0]?.year} to {nextWing.artifacts[nextWing.artifacts.length - 1]?.year}
              </p>
            </button>
          )}
        </div>

        {/* the boxes, or the one opened panel in their place */}
        {panel === null ? (
          <HubTiles tiles={tiles} onOpen={k => setPanel(k as Panel)} />
        ) : panel === 'renown' ? (
          <div className="space-y-2">
            <HubPanelHeader title="Renown" onBack={() => setPanel(null)} />
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <p className="text-xs text-muted-foreground leading-snug">
                Rededicate and the hall reopens empty: the funds, the exhibits, the wings and the upgrades all go.
                What stays is permanent. One renown star per {RENOWN_PER} exhibits you had collected, each worth
                +{Math.round(RENOWN_BONUS * 100)}% admissions forever, and every completed wing's plaque stays on
                the wall for good.
              </p>
              <div className="rounded-xl border border-border bg-background/40 p-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">exhibits now</span><span className="font-bold text-foreground tabular-nums">{owned}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">stars this would pay</span><span className="font-bold text-gold tabular-nums">{renownOnRededicate(s)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">rededications so far</span><span className="font-bold text-foreground tabular-nums">{s.rededications}</span></div>
              </div>
              <button
                onClick={doRededicate}
                disabled={!canRededicate(s)}
                className={cn(
                  'w-full rounded-xl py-2.5 text-sm font-bold transition-opacity',
                  canRededicate(s) ? 'bg-gold text-black hover:opacity-90' : 'bg-secondary text-muted-foreground cursor-not-allowed',
                )}
              >
                {canRededicate(s) ? `Rededicate for ${renownOnRededicate(s)} star${renownOnRededicate(s) === 1 ? '' : 's'}` : `Needs ${REDEDICATE_MIN} exhibits`}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {(() => {
              const def = UPGRADES.find(u => u.id === panel)!;
              const lvl = s.levels[def.id];
              const cost = upgradeCost(def, lvl);
              const maxed = lvl >= def.maxLevel;
              return (
                <>
                  <HubPanelHeader title={def.label} onBack={() => setPanel(null)} />
                  <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                    <p className="text-xs text-muted-foreground leading-snug">{def.blurb}</p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">level</span>
                      <span className="font-bold text-foreground tabular-nums">{lvl} / {def.maxLevel}</span>
                    </div>
                    <button
                      onClick={() => doBuyUpgrade(def.id)}
                      disabled={maxed || !canBuyUpgrade(def.id, s)}
                      className={cn(
                        'w-full rounded-xl py-2.5 text-sm font-bold transition-opacity',
                        !maxed && canBuyUpgrade(def.id, s) ? 'bg-primary text-primary-foreground hover:opacity-90' : 'bg-secondary text-muted-foreground cursor-not-allowed',
                      )}
                    >
                      {maxed ? 'Fully upgraded' : `Upgrade for ${fmt(cost)}`}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground mt-4">
          Every exhibit here is real. <Link to="/records" className="text-primary hover:underline">The Record Books</Link> list the same champions year by year.
        </p>

        {/* floaters */}
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-1 pointer-events-none">
          {floaters.map(f => (
            <div
              key={f.id}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-bold border shadow-lg',
                f.kind === 'buy' ? 'bg-card border-primary/50 text-foreground'
                  : f.kind === 'open' ? 'bg-primary/15 border-primary text-primary'
                  : f.kind === 'star' ? 'bg-gold/15 border-gold text-gold'
                  : 'bg-yellow-500/15 border-yellow-500 text-yellow-400',
              )}
            >
              {f.text}
            </div>
          ))}
        </div>

        {seo}
      </main>

      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" role="dialog" aria-modal="true" aria-label="How Hall of Champions works">
          <div className="max-w-md w-full rounded-2xl border border-border bg-card p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold text-primary font-display">HOW IT WORKS</h2>
              <button onClick={() => setShowHelp(false)} className="p-2 text-muted-foreground hover:text-foreground" aria-label="Close the rules">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-sm text-muted-foreground leading-snug">
              <p>You run a sports museum, and every single exhibit in it is a real championship. Visitors pay admission every second, and admission money buys more history.</p>
              <p className="font-semibold text-foreground">The rules:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Acquire champions oldest first. Each one costs more and earns more than the last.</li>
                <li>Every {MILESTONE_EVERY} exhibits in a wing DOUBLES that wing's income.</li>
                <li>Finish a wing and its plaque is yours forever: +{Math.round(PLAQUE_BONUS * 100)}% admissions, through every rededication.</li>
                <li>Anniversary weekends pay x{RUSH_MULT} for a few seconds. Tap the banner when it lights up.</li>
                <li>The hall keeps earning while you are away, at half speed for up to eight hours, and the gift shop raises that rate.</li>
                <li>Rededicate at {REDEDICATE_MIN}+ exhibits to trade them all for permanent renown stars.</li>
              </ul>
              <p className="font-semibold text-foreground">Worked example:</p>
              <p>Your first purchase is the oldest Super Bowl on the books, and the plaque under it names the real winner, the real beaten team and the real score. Ten Super Bowls in, that wing pays double. All sixty and the plaque is permanent.</p>
              <p className="text-xs">Nothing here is invented. Every year, team and result comes from the same checked record books our quiz games read.</p>
            </div>
            <button
              onClick={() => setShowHelp(false)}
              className="mt-4 w-full py-3 min-h-[44px] bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity"
            >
              Open the doors
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/** one wing: what is on the wall, what the next acquisition costs */
function WingRow({ wing, state, onBuy }: { wing: Wing; state: import('@/lib/hallOfChampions').HallState; onBuy: () => void }) {
  const n = state.owned[wing.key] ?? 0;
  const complete = n >= wing.artifacts.length;
  const next = complete ? null : wing.artifacts[n];
  const cost = complete ? 0 : artifactCost(wing, n, state);
  const affordable = canBuyArtifact(wing, state);
  const newest = n > 0 ? wing.artifacts[n - 1] : null;
  const toMilestone = MILESTONE_EVERY - (n % MILESTONE_EVERY);

  return (
    <div className={cn('rounded-2xl border p-3', complete ? 'border-gold/50 bg-gold/5' : 'border-border bg-card')}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-sm font-bold text-foreground">{wing.emoji} {wing.title}</span>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {n} / {wing.artifacts.length} · {fmt(wingIncome(wing, state))}/s
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden mb-2">
        <div className={cn('h-full rounded-full transition-all', complete ? 'bg-gold' : 'bg-primary')} style={{ width: `${(n / wing.artifacts.length) * 100}%` }} />
      </div>
      {newest && (
        <p className="text-[11px] text-muted-foreground mb-2 truncate">
          latest: <span className="text-foreground font-semibold">{newest.year} {newest.team}</span>
          {newest.beat ? `, beat ${newest.beat}` : ''}
        </p>
      )}
      {complete ? (
        <div className="text-center text-xs font-bold text-gold py-1.5">🏅 complete, plaque hung forever</div>
      ) : (
        <button
          onClick={onBuy}
          disabled={!affordable}
          className={cn(
            'w-full rounded-lg py-2 text-xs font-bold transition-opacity',
            affordable ? 'bg-primary text-primary-foreground hover:opacity-90' : 'bg-secondary text-muted-foreground cursor-not-allowed',
          )}
        >
          Acquire {next?.year} {next?.team} for {fmt(cost)}
          <span className="block text-[10px] font-normal opacity-70">
            {toMilestone === MILESTONE_EVERY ? `${MILESTONE_EVERY} more doubles this wing` : `${toMilestone} more doubles this wing`}
          </span>
        </button>
      )}
    </div>
  );
}

export default HallOfChampions;
