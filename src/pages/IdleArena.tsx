/**
 * Round 288: Idle Arena, the screen. Every rule is in src/lib/idleArena.ts
 * and the clock and save are in src/hooks/useIdleArena.ts; this file only
 * draws. The core loop (the points, the tap, the squad) stays on the main
 * screen because it is the game. Everything else follows the house tile
 * rule: small boxes, and opening one replaces the boxes rather than
 * stacking under them.
 */
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, X, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GameNavbar } from '@/components/game/GameNavbar';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { HubTiles, HubPanelHeader, type HubTile } from '@/components/hub/HubTiles';
import { useRevealScroll } from '@/hooks/useRevealScroll';
import { useIdleArena } from '@/hooks/useIdleArena';
import {
  GENERATORS, UPGRADES, ACHIEVEMENTS, TROPHY_BONUS, TROPHY_FLOOR, ACHIEVEMENT_BONUS, OFFLINE_RATE, GROWTH,
  genCost, genCostN, affordable, genRate, totalRate, tapValue, upgradeAvailable, trophiesFor, canLift,
  fmt, fmtDuration, type ArenaState,
} from '@/lib/idleArena';

type Panel = 'upgrades' | 'trophy' | 'badges' | 'record' | null;
type BuyMode = 1 | 10 | 'max';

const BALLS = ['⚽', '🏀', '⚾', '🏒', '🏈', '🎾', '🏐', '🏉'];

const IdleArena = () => {
  const { state: s, fresh, offline, dismissOffline, floaters, doTap, doBuy, doUpgrade, doLift } = useIdleArena();
  const [panel, setPanel] = useState<Panel>(null);
  const [mode, setMode] = useState<BuyMode>(1);
  const [showHelp, setShowHelp] = useState(fresh);
  const [confirmLift, setConfirmLift] = useState(false);
  const arenaRef = useRef<HTMLDivElement>(null);
  const panelRef = useRevealScroll<HTMLDivElement>(panel);
  useEffect(() => { if (panel !== 'trophy') setConfirmLift(false); }, [panel]);

  const rate = totalRate(s);
  const perTap = tapValue(s);
  const lifts = trophiesFor(s.earned);
  const nextTrophyAt = Math.pow(lifts + 1, 2) * TROPHY_FLOOR;
  const ready = UPGRADES.filter(u => upgradeAvailable(s, u));
  const readyNow = ready.filter(u => u.cost <= s.points).length;
  const highest = GENERATORS.reduce((h, g, i) => ((s.owned[g.id] ?? 0) > 0 ? i : h), 0);
  const shown = GENERATORS.slice(0, Math.min(GENERATORS.length, highest + 3));
  const ball = BALLS[Math.floor(s.taps / 25) % BALLS.length];

  const onTap = (e: PointerEvent<HTMLButtonElement>) => {
    const box = arenaRef.current?.getBoundingClientRect();
    const x = box ? e.clientX - box.left : 80;
    const y = box ? e.clientY - box.top : 40;
    doTap(x, y);
  };
  const onTapKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    const box = arenaRef.current?.getBoundingClientRect();
    doTap(box ? box.width / 2 : 80, 24);
  };

  const tiles: HubTile[] = [
    {
      key: 'upgrades', icon: '🛠️', title: 'Upgrades',
      value: readyNow > 0 ? `${readyNow} affordable` : `${s.upgrades.length} of ${UPGRADES.length} bought`,
      sub: ready.length > 0 ? `next: ${fmt(ready.slice().sort((a, b) => a.cost - b.cost)[0].cost)}` : 'everything bought this run',
      accent: readyNow > 0,
    },
    {
      key: 'trophy', icon: '🏆', title: 'Trophy',
      value: lifts > 0 ? `${lifts} to lift` : `${s.trophies} held`,
      sub: lifts > 0 ? `+${Math.round(lifts * TROPHY_BONUS * 100)}% forever` : `${fmt(s.earned)} of ${fmt(TROPHY_FLOOR)} earned`,
      accent: lifts > 0,
    },
    {
      key: 'badges', icon: '🎖️', title: 'Badges',
      value: `${s.ach.length} of ${ACHIEVEMENTS.length}`,
      sub: s.ach.length > 0 ? `+${s.ach.length}% on everything` : 'each one is +1% forever',
      accent: false,
    },
    {
      key: 'record', icon: '📒', title: 'Record',
      value: `${fmt(s.allTime)} all time`,
      sub: `${s.taps.toLocaleString()} taps, ${s.runs} reset${s.runs === 1 ? '' : 's'}`,
      accent: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <GameNavbar />
      <PageSeo
        title="Idle Arena: Free Sports Clicker Game | DoUKnowBall"
        description="Tap to score, sign a squad that scores for you, and come back to a bigger number. A free sports idle clicker with eight archetypes, fourteen upgrades, trophies that make every run stronger, and eight hours of offline earnings. No sign-up."
        path="/idle-arena"
      />
      <main id="dukb-main" className="max-w-2xl mx-auto px-4 py-4 md:py-8">
        <header className="text-center mb-3">
          <h1 className="text-3xl md:text-5xl font-bold tracking-[0.08em] text-primary font-display">IDLE ARENA</h1>
          <div className="flex items-center justify-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              {s.trophies > 0 && <><Trophy className="w-3 h-3 text-gold" /> <span className="text-gold font-bold">{s.trophies} trophies, +{Math.round(s.trophies * TROPHY_BONUS * 100)}%</span></>}
              {s.trophies === 0 && <span>run {s.runs + 1}</span>}
            </span>
            <button onClick={() => setShowHelp(true)} className="inline-flex items-center gap-1 px-2 py-2 transition-colors hover:text-foreground">
              <HelpCircle className="w-3.5 h-3.5" /> How it works
            </button>
          </div>
        </header>

        {offline && (
          <div className="mb-2 rounded-xl border border-gold/60 bg-gold/10 px-3 py-2 flex items-center justify-between gap-3">
            <span className="text-xs text-gold font-bold">
              🌙 the squad kept scoring: {fmt(offline.earned)} points in {fmtDuration(offline.seconds)} while you were away
            </span>
            <button onClick={dismissOffline} className="text-gold/70 hover:text-gold p-1" aria-label="Dismiss the offline earnings notice">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* the scoreboard */}
        <div className="flex items-end justify-between mb-2 px-1">
          <div>
            <div className="text-3xl md:text-4xl font-bold font-display text-gold tabular-nums" aria-live="off">{fmt(s.points)}</div>
            <div className="text-[11px] text-muted-foreground">{fmt(rate)} a second from the squad</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold text-foreground tabular-nums">{fmt(perTap)} a tap</div>
            <div className="text-[11px] text-muted-foreground">{fmt(s.earned)} this run</div>
          </div>
        </div>

        {/* the arena */}
        <div ref={arenaRef} className="relative mb-3 rounded-2xl border border-border bg-card overflow-hidden select-none">
          <button
            type="button"
            onPointerDown={onTap}
            onKeyDown={onTapKey}
            aria-label="Tap to score"
            className="w-full py-6 flex flex-col items-center gap-1 active:bg-primary/10 transition-colors touch-manipulation"
          >
            <span className="text-6xl md:text-7xl leading-none transition-transform active:scale-90" aria-hidden="true">{ball}</span>
            <span className="text-xs font-bold text-primary tracking-wider">TAP TO SCORE</span>
          </button>
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            {floaters.map(f => (
              <span
                key={f.id}
                className="absolute text-sm font-bold text-gold dukb-floater"
                style={{ left: f.x, top: f.y }}
              >
                {f.text}
              </span>
            ))}
          </div>
        </div>

        {/* the squad */}
        <div className="flex items-center justify-between mb-1 px-1">
          <span className="text-xs font-bold text-foreground uppercase tracking-wider">The squad</span>
          <div className="inline-flex rounded-full border border-border bg-card p-0.5" role="group" aria-label="How many to sign at once">
            {([1, 10, 'max'] as BuyMode[]).map(m => (
              <button
                key={String(m)}
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={cn('px-3 py-2 min-h-[32px] rounded-full text-[11px] font-bold', mode === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
              >
                {m === 'max' ? 'max' : `x${m}`}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5 mb-3">
          {shown.map(g => <GenRow key={g.id} gen={g} state={s} mode={mode} onBuy={() => doBuy(g.id, mode)} />)}
          {shown.length < GENERATORS.length && (
            <p className="text-center text-[11px] text-muted-foreground py-1">{GENERATORS.length - shown.length} more archetypes to unlock</p>
          )}
        </div>

        {/* the boxes, or the one opened panel in their place */}
        {panel === null ? (
          <HubTiles tiles={tiles} onOpen={k => setPanel(k as Panel)} />
        ) : (
          <div ref={panelRef} className="space-y-2">
            {panel === 'upgrades' && (
              <>
                <HubPanelHeader title="Upgrades" onBack={() => setPanel(null)} />
                <div className="space-y-1.5">
                  {ready.length === 0 && (
                    <div className="rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground">
                      Every upgrade on offer is bought. More appear as the squad grows: each archetype's own upgrade needs five of them signed.
                    </div>
                  )}
                  {ready.slice().sort((a, b) => a.cost - b.cost).map(u => {
                    const ok = u.cost <= s.points;
                    return (
                      <button
                        key={u.id}
                        onClick={() => doUpgrade(u.id)}
                        disabled={!ok}
                        className={cn(
                          'w-full rounded-2xl border p-3 text-left transition-colors',
                          ok ? 'border-primary/60 bg-primary/5 hover:bg-primary/10' : 'border-border bg-card',
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold text-foreground">{u.label}</span>
                          <span className={cn('text-sm font-bold tabular-nums', ok ? 'text-primary' : 'text-muted-foreground')}>{fmt(u.cost)}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{u.blurb}</p>
                      </button>
                    );
                  })}
                  {s.upgrades.length > 0 && (
                    <p className="text-[11px] text-muted-foreground px-1 pt-1">
                      bought this run: {UPGRADES.filter(u => s.upgrades.includes(u.id)).map(u => u.label).join(', ')}
                    </p>
                  )}
                </div>
              </>
            )}

            {panel === 'trophy' && (
              <>
                <HubPanelHeader title="Trophy" onBack={() => setPanel(null)} />
                <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                  <p className="text-xs text-muted-foreground leading-snug">
                    Lift the trophy and the run starts again: the points, the squad and the upgrades all go.
                    What stays is permanent. One trophy for the first {fmt(TROPHY_FLOOR)} points earned in a run, two trophies
                    at {fmt(4 * TROPHY_FLOOR)}, three at {fmt(9 * TROPHY_FLOOR)}, and every trophy is
                    +{Math.round(TROPHY_BONUS * 100)}% on everything, taps and squad alike, in every run after it.
                  </p>
                  <div className="rounded-xl border border-border bg-background/40 p-3 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">earned this run</span><span className="font-bold text-foreground tabular-nums">{fmt(s.earned)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">trophies this would lift</span><span className="font-bold text-gold tabular-nums">{lifts}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">one more at</span><span className="font-bold text-foreground tabular-nums">{fmt(nextTrophyAt)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">trophies held</span><span className="font-bold text-foreground tabular-nums">{s.trophies}</span></div>
                  </div>
                  {!confirmLift ? (
                    <button
                      onClick={() => setConfirmLift(true)}
                      disabled={!canLift(s)}
                      className={cn(
                        'w-full rounded-xl py-2.5 text-sm font-bold transition-opacity',
                        canLift(s) ? 'bg-gold text-black hover:opacity-90' : 'bg-secondary text-muted-foreground cursor-not-allowed',
                      )}
                    >
                      {canLift(s) ? `Lift ${lifts} troph${lifts === 1 ? 'y' : 'ies'}` : `Needs ${fmt(TROPHY_FLOOR)} earned in one run`}
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => setConfirmLift(false)} className="flex-1 rounded-xl py-2.5 text-sm font-bold bg-secondary text-foreground">Keep playing</button>
                      <button
                        onClick={() => { doLift(); setConfirmLift(false); setPanel(null); }}
                        className="flex-1 rounded-xl py-2.5 text-sm font-bold bg-gold text-black hover:opacity-90"
                      >
                        Lift and reset
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {panel === 'badges' && (
              <>
                <HubPanelHeader title="Badges" onBack={() => setPanel(null)} />
                <p className="text-[11px] text-muted-foreground px-1">
                  Each badge is +{Math.round(ACHIEVEMENT_BONUS * 100)}% on everything, and badges survive every trophy lift.
                </p>
                <ul className="grid grid-cols-2 gap-1.5">
                  {ACHIEVEMENTS.map(a => {
                    const got = s.ach.includes(a.id);
                    return (
                      <li key={a.id} className={cn('rounded-xl border p-2.5', got ? 'border-gold/50 bg-gold/5' : 'border-border bg-card/60')}>
                        <div className={cn('text-xs font-bold', got ? 'text-gold' : 'text-muted-foreground')}>{got ? '🎖️ ' : '🔒 '}{a.label}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{a.blurb}</div>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}

            {panel === 'record' && (
              <>
                <HubPanelHeader title="Record" onBack={() => setPanel(null)} />
                <div className="rounded-2xl border border-border bg-card p-4 text-sm space-y-1">
                  <Row k="points, all time" v={fmt(s.allTime)} />
                  <Row k="points, this run" v={fmt(s.earned)} />
                  <Row k="a second, right now" v={fmt(rate)} />
                  <Row k="a tap, right now" v={fmt(perTap)} />
                  <Row k="taps" v={s.taps.toLocaleString()} />
                  <Row k="squad signed" v={String(Object.values(s.owned).reduce((a, b) => a + b, 0))} />
                  <Row k="trophies" v={String(s.trophies)} />
                  <Row k="trophy lifts" v={String(s.runs)} />
                  <Row k="badges" v={`${s.ach.length} of ${ACHIEVEMENTS.length}`} />
                  <Row k="playing since" v={new Date(s.started).toLocaleDateString()} />
                </div>
              </>
            )}
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground mt-4">
          Want an idle game with something to manage? Try <Link to="/hall-of-champions" className="text-primary hover:underline">Hall of Champions</Link>,{' '}
          <Link to="/stadium-tycoon" className="text-primary hover:underline">Stadium Tycoon</Link> or{' '}
          <Link to="/wonderkid-factory" className="text-primary hover:underline">Wonderkid Factory</Link>.
        </p>

        <GameSeoContent
          pageHasOwnH1
          title="Idle Arena | DoUKnowBall"
          description="A sports idle clicker with no real names in it and nothing to get wrong. Tap to score, sign eight archetypes from Ball Boy to Champion, buy fourteen upgrades, lift trophies for a permanent bonus, and earn at half speed for up to eight hours while you are away."
          howToPlay={[
            'Tap the ball to score a point',
            'Sign Ball Boys, Sunday Strikers and the rest, and they score every second for you',
            'Buy upgrades to double a line or boost everything',
            'Lift the trophy once a run has earned a million: it resets the run and pays a permanent bonus',
            'The squad keeps scoring while you are away, at half speed, for up to eight hours, tab open or shut',
          ]}
          examples={[
            'A Ball Boy costs 15 and scores 0.4 a second; the tenth one costs 53',
            'A run that earns four million lifts two trophies, worth 10% on everything forever',
            'Own five Sunday Strikers and New Boots appears, doubling every one of them',
          ]}
        />
      </main>

      <style>{`
        @keyframes dukb-float { 0% { transform: translate(-50%, 0); opacity: 1 } 100% { transform: translate(-50%, -44px); opacity: 0 } }
        .dukb-floater { animation: dukb-float 0.7s ease-out forwards }
        @media (prefers-reduced-motion: reduce) { .dukb-floater { animation-duration: 0.3s } }
      `}</style>

      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" role="dialog" aria-modal="true" aria-label="How Idle Arena works">
          <div className="max-w-md w-full rounded-2xl border border-border bg-card p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold text-primary font-display">HOW IT WORKS</h2>
              <button onClick={() => setShowHelp(false)} className="p-2 text-muted-foreground hover:text-foreground" aria-label="Close the rules">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-sm text-muted-foreground leading-snug">
              <p>Tap the ball and the number goes up. Spend the number on a squad and the number goes up on its own. That is the whole game, and it does not stop.</p>
              <p className="font-semibold text-foreground">The rules:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Every tap scores. Upgrades make each tap worth more.</li>
                <li>Sign archetypes, from a {fmt(GENERATORS[0].baseCost)} point Ball Boy up to a Champion. Each one you sign costs {Math.round((GROWTH - 1) * 100)}% more than the last, and each scores every second.</li>
                <li>Own five of an archetype and its own upgrade appears. It doubles that whole line.</li>
                <li>Earn {fmt(TROPHY_FLOOR)} in one run and you can lift the trophy. The run resets, the trophy stays, and every trophy is +{Math.round(TROPHY_BONUS * 100)}% on everything in every run after it.</li>
                <li>Badges are +{Math.round(ACHIEVEMENT_BONUS * 100)}% each and never go away either.</li>
                <li>Walk away and the squad keeps scoring at {Math.round(OFFLINE_RATE * 100)}% speed for up to eight hours. Closing the tab and leaving it sitting open pay the same.</li>
              </ul>
              <p className="font-semibold text-foreground">Worked example:</p>
              <p>Your first Ball Boy is free. You tap eighteen times and sign a second one. Two of them make 0.8 a second, which pays for a third in about twenty five seconds, and the three of them start saving toward a Sunday Striker at 100. A few minutes in, the squad is scoring more in a second than your thumb did in the first minute.</p>
              <p className="text-xs">Nobody in this arena is real. The squad is a cast of archetypes, so there are no stats to check and nothing to argue about, just the number.</p>
            </div>
            <button
              onClick={() => setShowHelp(false)}
              className="mt-4 w-full py-3 min-h-[44px] bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity"
            >
              Start tapping
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-bold text-foreground tabular-nums">{v}</span>
    </div>
  );
}

/** one archetype: how many are signed, what they score, what the next costs */
function GenRow({ gen, state, mode, onBuy }: { gen: (typeof GENERATORS)[number]; state: ArenaState; mode: BuyMode; onBuy: () => void }) {
  const n = state.owned[gen.id] ?? 0;
  const count = mode === 'max' ? Math.max(1, affordable(gen, n, state.points)) : mode;
  const cost = mode === 'max' && affordable(gen, n, state.points) === 0 ? genCost(gen, n) : genCostN(gen, n, count);
  const ok = cost <= state.points;
  const rate = genRate(state, gen);
  return (
    <div className={cn('rounded-2xl border p-2.5 flex items-center gap-3', ok ? 'border-primary/40 bg-card' : 'border-border bg-card/70')}>
      <span className="text-2xl leading-none w-8 text-center" aria-hidden="true">{gen.emoji}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-bold text-foreground truncate">{gen.label}</span>
          <span className="text-[11px] text-muted-foreground tabular-nums">x{n}</span>
        </div>
        <div className="text-[11px] text-muted-foreground truncate">
          {n > 0 ? `${fmt(rate)} a second` : gen.blurb}
        </div>
      </div>
      <button
        onClick={onBuy}
        disabled={!ok}
        aria-label={`Sign ${count} ${gen.label} for ${fmt(cost)}`}
        className={cn(
          'shrink-0 rounded-lg px-3 py-2 min-w-[5.5rem] text-xs font-bold text-right tabular-nums transition-opacity',
          ok ? 'bg-primary text-primary-foreground hover:opacity-90' : 'bg-secondary text-muted-foreground cursor-not-allowed',
        )}
      >
        <span className="block">{fmt(cost)}</span>
        <span className="block text-[10px] font-normal opacity-80">sign {count}</span>
      </button>
    </div>
  );
}

export default IdleArena;
