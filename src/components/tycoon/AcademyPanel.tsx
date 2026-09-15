/* Round 530: the setting the visitor already made. The glow stops
           looping and the floaters land as plain text until they are cleared. */

/**
 * Round 580: the academy, as a panel. This is Wonderkid Factory's screen moved
 * out of src/pages/WonderkidFactory.tsx verbatim, so the same academy can run on
 * its own page and on Stadium Tycoon's Academy tab without the two drifting. The
 * rules still live in src/lib/wonderkidFactory.ts and the save is still
 * wonderkidFactoryV1, read and written only by useWonderkidFactory.
 *
 * Round 216's layout rule holds: the working surfaces are small boxes (HubTiles,
 * the same component the nine sim games share) and opening one REPLACES the
 * grid, never stacks under it.
 *
 * `visible` is how the tycoon keeps the academy alive under the Stadium tab. The
 * page mounts this panel the first time the Academy tab opens and never unmounts
 * it after that, so the hook's clock keeps its watched pace (kids age, the scouts
 * work, Deadline Day comes round) exactly as if you were looking. While hidden it
 * runs its hooks and renders nothing, and it tells the page through `onStatus`
 * when something in here needs you, so the tab can light up.
 */
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Star, HelpCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HubTiles, HubPanelHeader, HubTile } from '@/components/hub/HubTiles';
import { useWonderkidFactory } from '@/hooks/useWonderkidFactory';
import { useRevealScroll } from '@/hooks/useRevealScroll';
import {
  FACILITIES, REGIONS, SAVE_KEY, MAX_REP,
  basePrice, capacity, facilityCost, findSec, fmtCash, priceMult,
  regionIndex, trainMult, canMoveUp, REP_TRAIN_BONUS, REP_FEE_BONUS,
  SHOWCASE_COOLDOWN, FIRST_TEAM_SLOTS, PROMOTE_AGE, LEAVE_AGE, SENIOR_YEAR_SEC, RETIRE_AGE, squadEdge,
} from '@/lib/wonderkidFactory';
import type { FactoryState } from '@/lib/wonderkidFactory';
import { academyStatus } from '@/lib/tycoonRooms';
import type { AcademyStatus } from '@/lib/tycoonRooms';
import { useTycoonRewards } from '@/hooks/useTycoonRewards';
import { balance, priceOf, canOpen } from '@/lib/tycoonRewards';
import { PACKS, TIERS, bedFree } from '@/lib/wonderkidFactory';

let decorationReady = false;
const CelebrationStyles = lazy(() => import('@/components/club-manager/CelebrationStyles').then(m => { decorationReady = true; return { default: m.CelebrationStyles }; }));

const ConfettiBurst = lazy(() => import('@/components/club-manager/Celebration').then(m => ({ default: m.ConfettiBurst })));

const AcademyFacilityPanel = lazy(() => import('@/components/tycoon/AcademyLegacyPanel').then(m => ({ default: m.AcademyFacilityPanel })));
const AcademyLegacyPanel = lazy(() => import('@/components/tycoon/AcademyLegacyPanel'));
const PacksPanel = lazy(() => import('@/components/tycoon/PacksPanel'));
const FirstTeamPanel = lazy(() => import('@/components/tycoon/FirstTeamPanel'));
const AcademyProspects = lazy(() => import('@/components/tycoon/AcademyProspects'));

type Panel = 'scouting' | 'coaching' | 'dorms' | 'agents' | 'legacy' | 'packs' | 'firstTeam' | null;

export default function AcademyPanel({ visible = true, stylesReady = false, onStatus, onSnapshot }: { visible?: boolean; stylesReady?: boolean; onStatus?: (s: AcademyStatus) => void; onSnapshot?: (s: FactoryState) => void }) {
  const { state: s, floaters, doBuy, doSell, doShowcase, doMoveUp, doOpenPack, doDismissPack, packSaveBlocked, doPromote, doSellSenior, academySaveBlocked, doEquipBoot, doUpgradeBoot, gearSaveBlocked } = useWonderkidFactory();
  /* Round 585: the gem ledger, shared with the stadium that earns it. */
  const ledger = useTycoonRewards();
  const [panel, setPanel] = useState<Panel>(null);
  const firstTeamRef = useRevealScroll(panel === 'firstTeam', { enabled: visible });
  const onSnapshotRef = useRef(onSnapshot);
  onSnapshotRef.current = onSnapshot;
  useEffect(() => { onSnapshotRef.current?.(s); });
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

  /* Round 580: what the Academy tab's accent reads. Reported only when one of
     the four answers changes, so four ticks a second cost the page nothing. */
  const status = academyStatus(s);
  const onStatusRef = useRef(onStatus);
  onStatusRef.current = onStatus;
  useEffect(() => {
    onStatusRef.current?.({ deadline: status.deadline, bedsFull: status.bedsFull, moveUp: status.moveUp, leavingSoon: status.leavingSoon });
  }, [status.deadline, status.bedsFull, status.moveUp, status.leavingSoon]);

  /* Round 530: the move up gets a card naming the new region, in the tile
     slot for four seconds or until Continue. The engine is a mutable object
     behind the hook's ref, so the flip is read off the star count between
     renders rather than off an event. */
  const [moved, setMoved] = useState<{ name: string; emoji: string; seq: number; animate: boolean } | null>(null);
  const prevRep = useRef(s.rep);
  useEffect(() => {
    if (s.rep > prevRep.current) setMoved({ name: region.name, emoji: region.emoji, seq: s.rep, animate: stylesReady || decorationReady });
    prevRep.current = s.rep;
  }, [s.rep, region]);
  useEffect(() => {
    if (!moved) return;
    const t = window.setTimeout(() => setMoved(null), 4000);
    return () => window.clearTimeout(t);
  }, [moved]);

  /* Round 530: a kid walking out at 24 shakes a line in the academy box.
     leftFree is the engine's count; the name comes from the bed he was in on
     the previous render, and when that cannot be pinned to the count the
     line says a kid rather than guessing a name. */
  const [walked, setWalked] = useState<{ text: string; seq: number; animate: boolean } | null>(null);
  const bedsRef = useRef(s.prospects.map(p => ({ id: p.id, name: p.name })));
  const prevLeftFree = useRef(s.leftFree);
  useEffect(() => {
    const before = bedsRef.current;
    bedsRef.current = s.prospects.map(p => ({ id: p.id, name: p.name }));
    const gone = s.leftFree - prevLeftFree.current;
    prevLeftFree.current = s.leftFree;
    if (gone <= 0) return;
    const still = new Set(s.prospects.map(p => p.id));
    const names = before.filter(k => !still.has(k.id)).map(k => k.name);
    const who = names.length === gone ? names.join(' and ') : gone === 1 ? 'a kid' : `${gone} kids`;
    setWalked({ text: `${who} turned 24 and walked out on a free`, seq: s.leftFree, animate: stylesReady || decorationReady });
  });
  useEffect(() => {
    if (!walked) return;
    const t = window.setTimeout(() => setWalked(null), 4000);
    return () => window.clearTimeout(t);
  }, [walked]);

  if (!visible) return null;

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
  /* Round 585: packs of generated kids, opened with gems won at the ground. */
  const firstFree = PACKS.find(p => priceOf(ledger, p.id) === 0);
  tiles.unshift({
    key: 'firstTeam', icon: '⚽', title: 'First team',
    value: `${s.firstTeam?.length ?? 0} / ${FIRST_TEAM_SLOTS} players`,
    sub: `up to ${(squadEdge(s, ledger.gearLevel) * 100).toFixed(1)}% fewer rival chances`,
    accent: (s.firstTeam?.length ?? 0) < FIRST_TEAM_SLOTS && s.prospects.some(p => p.age >= PROMOTE_AGE),
  });
  tiles.push({
    key: 'packs',
    icon: '🎁',
    title: 'Packs',
    value: `${balance(ledger)} gem${balance(ledger) === 1 ? '' : 's'}`,
    sub: ledger.pending ? 'a new kid is waiting' : firstFree ? `your first ${firstFree.name} is free` : 'odds on every pack',
    accent: ledger.pending !== null || PACKS.some(p => canOpen(ledger, p.id, bedFree(s))),
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
    <div data-academy-panel>
      {academySaveBlocked && <p role="alert" className="mb-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs">The academy could not save that change. Free some browser storage, then try again. Your player stayed where he was.</p>}
      <div className="text-center mb-3">
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
            {s.rep > 0 && <span className="text-yellow-500 font-bold">+{Math.round(s.rep * REP_TRAIN_BONUS * 100)}% training, +{Math.round(s.rep * REP_FEE_BONUS * 100)}% fees</span>}
          </span>
          <button onClick={() => setShowHelp(true)} className="inline-flex items-center gap-1 px-2 py-2 transition-colors hover:text-foreground">
            <HelpCircle className="w-3.5 h-3.5" /> How it works
          </button>
        </div>
      </div>

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

      <div ref={firstTeamRef}>
      {panel === 'firstTeam' ? (
        <Suspense fallback={<p className="min-h-48 p-3 text-sm text-muted-foreground">Opening the first team...</p>}>
          <FirstTeamPanel state={s} ledger={ledger} onSell={doSellSenior} onEquip={doEquipBoot} onUpgrade={doUpgradeBoot} gearSaveBlocked={gearSaveBlocked} onBack={() => setPanel(null)} />
        </Suspense>
      ) : (
      /* the academy */
      <div className="relative rounded-2xl border border-border bg-card p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">The academy</span>
          <span className="text-[10px] text-muted-foreground">sell when the price is right, kids leave free at 24</span>
        </div>
        {/* Round 530 review: the walked line lies OVER the academy header
            for its four seconds rather than in the flow above the beds. In
            the flow it pushed every bed card and its sell button down about
            34px on arrival and snapped them back when the timer cleared it,
            which is the no scroll rule's layout shift and, worse, a sell tap
            during the snap lands on a different kid. Nothing under it moves
            now, and it does not take taps. */}
        {walked && (
          <div key={walked.seq} className="pointer-events-none absolute inset-x-3 top-3 z-10 rounded-lg bg-card">
            <p className={cn(walked.animate && 'cm-loss-shake', 'rounded-lg border border-destructive/40 bg-destructive/10 px-2.5 py-1.5 text-xs font-bold text-destructive')}>
              🚪 {walked.text}
            </p>
          </div>
        )}
        {s.prospects.length === 0 ? (
          <div className="h-24 flex items-center justify-center text-xs text-muted-foreground text-center px-4">
            the beds are empty. The scouts are out looking, the first kid arrives in about {Math.max(1, Math.ceil(findSec(s) - s.scoutProgress))}s.
          </div>
        ) : (
          <Suspense fallback={<div role="status" className="h-24 flex items-center justify-center text-xs text-muted-foreground">Opening player cards...</div>}>
            <AcademyProspects s={s} doSell={doSell} doPromote={doPromote} />
          </Suspense>
        )}
      </div>
      )}
      </div>

      {/* the boxes, or the one opened panel in their place, or the move up
          card (Round 530) while the new region is being announced */}
      {panel === 'firstTeam' ? null : moved ? (
        <div key={`moved|${moved.seq}`} className="relative overflow-hidden rounded-2xl border border-gold/60 bg-card p-4 text-center">
          <Suspense fallback={null}><ConfettiBurst seed={moved.seq} count={30} /></Suspense>
          <p className={cn(moved.animate && 'cm-slam', 'font-display text-xl font-black text-gold')} style={{ animationDelay: '0.05s' }}>
            {moved.emoji} Welcome to {moved.name}
          </p>
          <p className={cn(moved.animate && 'cm-rise', 'mt-1 text-xs text-muted-foreground')} style={{ animationDelay: '0.45s' }}>
            star {s.rep} is forever: +{Math.round(s.rep * REP_TRAIN_BONUS * 100)}% training, +{Math.round(s.rep * REP_FEE_BONUS * 100)}% fees, and the scouts here find ceilings up to {region.potMax}
          </p>
          <button
            onClick={() => setMoved(null)}
            className={cn(moved.animate && 'cm-rise', 'mt-3 inline-flex min-h-[36px] items-center rounded-full bg-primary px-6 py-2 text-sm font-bold text-primary-foreground hover:brightness-110')}
            style={{ animationDelay: '0.7s' }}
          >
            Continue
          </button>
        </div>
      ) : panel === null ? (
        <HubTiles tiles={tiles} onOpen={k => setPanel(k as Panel)} />
      ) : panel === 'packs' ? (
        <div className="space-y-2">
          <HubPanelHeader title="Packs" onBack={() => setPanel(null)} />
          <Suspense fallback={<p role="status" className="min-h-48 p-3 text-sm text-muted-foreground">Opening packs...</p>}>
            <PacksPanel ledger={ledger} bedFree={bedFree(s)} delivered={ledger.pending !== null && (s.packsDelivered ?? 0) >= ledger.pending.seq} saveBlocked={packSaveBlocked} onOpen={doOpenPack} onDismiss={doDismissPack} />
          </Suspense>
        </div>
      ) : panel === 'legacy' ? (
        <div className="space-y-2">
          <HubPanelHeader title="Reputation" onBack={() => setPanel(null)} />
          <Suspense fallback={<p role="status" className="min-h-48 p-3 text-sm text-muted-foreground">Opening reputation...</p>}>
            <AcademyLegacyPanel s={s} region={region} goal={goal} goalPct={goalPct} doMoveUp={doMoveUp} />
          </Suspense>
        </div>
      ) : (
        <div className="space-y-2">
          <HubPanelHeader title={FACILITIES.find(f => f.id === panel)!.label} onBack={() => setPanel(null)} />
          <Suspense fallback={<p role="status" className="min-h-48 p-3 text-sm text-muted-foreground">Opening facility...</p>}>
            <AcademyFacilityPanel s={s} panel={panel} cap={cap} doBuy={doBuy} />
          </Suspense>
        </div>
      )}

      {(moved || walked) && <Suspense fallback={null}><CelebrationStyles /></Suspense>}

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
              <p>Packs bring generated kids straight into a free bed. They cost gems, which only results at Stadium Tycoon's ground earn, and each pack prints its odds before you open it: the {PACKS.map(p => p.name).join(', ')} climb from {TIERS[0].label} kids toward {TIERS[TIERS.length - 1].label}s, and a pack kid arrives with his ceiling's band already known.</p>
              <p>Promote a player aged {PROMOTE_AGE} to {LEAVE_AGE - 1} into your first team, with room for {FIRST_TEAM_SLOTS}. His bed opens for a new kid. First-team players above 60 rating cut opponents' scoring chances in watched and away stadium matches, so keeping a graduate can help win the next title.</p>
              <p>A first-team year lasts {SENIOR_YEAR_SEC / 60} watched academy minutes. Seniors train at half the academy rate until their 28th birthday, hold their rating at 28 and 29, then lose 1.2 rating each birthday from 30. Sale value starts falling at 28 and they retire at {RETIRE_AGE} without a fee. Their cards show the next birthday and its fee without further training. The first team survives both an academy move and selling the ground.</p>
              <p>First-team example: promoting a graduate frees his bed without paying a transfer fee. Holding him can protect the lead in a title race; selling him pays the quote on his card and opens a first-team place for your next graduate. Away time trains your seniors but never ages them.</p>
              <p>League titles at Stadium Tycoon earn fictional boots and kit upgrades. Open First team, then Boot room, to choose a wearer or improve a pair. A pair can move between graduates and stays with the club when its wearer leaves. Boots add to match rating for defense, without changing a transfer fee.</p>
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

        @media (prefers-reduced-motion: reduce) {
          .wf-glow { animation: none; }
          .wf-float { animation: none; opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  );
}

/** the help modal's example fees ride the real price curve at x1
 *  multipliers, so the numbers can never drift from the game */
function salePriceExample(rating: number, potential: number): number {
  return Math.round(basePrice(rating, potential, 17));
}
