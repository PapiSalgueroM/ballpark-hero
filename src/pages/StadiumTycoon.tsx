/**
 * Stadium Tycoon (Round 146): the idle game, animation first. The owner's
 * ask: an idle sports tycoon of our own, "add more animation especially to
 * the idle game. Suprise me." The surprises are all motion: a live toy match
 * with player dots that actually chase the ball, a crowd that fills the
 * stands seat by seat as the real attendance number grows, money that
 * physically floats off everything, confetti on goals, count-up cash, pulse
 * rings on every purchase, and a streak flame that grows with the run.
 *
 * No scroll on the core loop (pitch + upgrades fit a phone screen), tiles
 * per the house style, "?" rules modal, everything original.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { focusDialogOnMount, escapeCloses } from '@/lib/dialogA11y';
import { cn } from '@/lib/utils';
import { HelpCircle, Star, Flame, X } from 'lucide-react';
import { GameNavbar } from '@/components/game/GameNavbar';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import {
  TRACKS, levelOf, costOf, canBuy, capacity, attendance, incomePerSec,
  tapValue, repMult, streakMult, prestigeThreshold, canPrestige, fmtMoney,
  boostReady, boostActive, boostChargeSecOf, MILESTONES, opponentName,
  DIVISIONS, divisionOf, divisionIndex, winsToNextDivision,
  STAFF, staffLevelOf, staffCostOf, canHire, totalStaffLevels,
  ACHIEVEMENTS, achMult, goldenActive, GOLDEN_INFO,
  LEGACY_PERKS, perkLevelOf, perkCostOf, canBuyPerk, legacyPointsOf,
  totalPerkLevels, pointsForSale,
} from '@/lib/stadiumTycoon';
import { useStadiumTycoon } from '@/hooks/useStadiumTycoon';

/* ---------- tiny animation helpers ---------- */

/** A number that rolls toward its target instead of jumping. */
function useCountUp(target: number): number {
  const [shown, setShown] = useState(target);
  const ref = useRef(target);
  useEffect(() => {
    ref.current = target;
    let raf = 0;
    const step = () => {
      setShown(cur => {
        const d = ref.current - cur;
        if (Math.abs(d) < 1) return ref.current;
        return cur + d * 0.18;
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return shown;
}

/** Deterministic pseudo-random for stable crowd seat positions. */
function seatRand(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const CONFETTI_COLORS = ['#22c55e', '#eab308', '#3b82f6', '#ef4444', '#a855f7', '#f97316'];

export default function StadiumTycoon() {
  const g = useStadiumTycoon();
  const s = g.state;
  const money = useCountUp(s.money);
  const [showHelp, setShowHelp] = useState(false);
  /* Round 162: the drawers (Round 196 added the boardroom). Tiles per the
     house style: each opens its own panel instead of stretching the page. */
  const [drawer, setDrawer] = useState<'none' | 'ach' | 'stats' | 'legacy'>('none');
  const [burst, setBurst] = useState<{ id: number; pieces: { x: number; d: number; c: string; r: number }[] } | null>(null);
  const pitchRef = useRef<HTMLDivElement | null>(null);

  const fans = attendance(s);
  const cap = capacity(s);
  const rate = incomePerSec(s);
  const div = divisionOf(s);
  const nextDivIn = winsToNextDivision(s);
  const achCount = (s.ach ?? []).length;

  // Goal confetti: a fresh burst every time the hook's counter moves.
  useEffect(() => {
    if (g.confetti === 0) return;
    const pieces = Array.from({ length: 26 }, (_, i) => ({
      x: 8 + seatRand(i + g.confetti * 31) * 84,
      d: 0.5 + seatRand(i * 7 + g.confetti) * 0.9,
      c: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      r: Math.floor(seatRand(i * 13 + g.confetti * 3) * 360),
    }));
    setBurst({ id: g.confetti, pieces });
    const t = setTimeout(() => setBurst(null), 1700);
    return () => clearTimeout(t);
  }, [g.confetti]);

  /* The toy match: 10 dots and a ball, all eased toward posts that reshuffle
     every couple of seconds, biased toward whichever end the score momentum
     points at. Pure decoration driven by real sim state. */
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPhase(p => p + 1), 1900);
    return () => clearInterval(id);
  }, []);
  const dots = useMemo(() => {
    const attacking = s.goalsFor >= s.goalsAgainst;
    return Array.from({ length: 10 }, (_, i) => {
      const ours = i < 5;
      const jitterX = seatRand(phase * 17 + i * 3) * 30;
      const jitterY = seatRand(phase * 29 + i * 7) * 56;
      const homeBase = ours ? (attacking ? 48 : 28) : (attacking ? 62 : 40);
      return {
        x: Math.max(6, Math.min(94, homeBase + jitterX - 15)),
        y: Math.max(12, Math.min(88, 22 + jitterY)),
        ours,
      };
    });
  }, [phase, s.goalsFor, s.goalsAgainst]);
  const ball = useMemo(() => ({
    x: 20 + seatRand(phase * 41) * 60,
    y: 25 + seatRand(phase * 53) * 50,
  }), [phase]);

  /* The crowd: one dot per ~14 fans, placed deterministically so the stand
     fills seat by seat as attendance really grows. Capped for perf. */
  const crowdDots = useMemo(() => {
    const n = Math.min(220, Math.floor(fans / 14));
    return Array.from({ length: n }, (_, i) => ({
      x: 2 + seatRand(i * 11) * 96,
      y: seatRand(i * 23) * 78,
      c: seatRand(i * 5) < 0.5 ? 'bg-primary/70' : 'bg-yellow-500/70',
    }));
  }, [fans]);

  const onPitchClick = (e: React.MouseEvent) => {
    const el = pitchRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    g.doTap(((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100);
  };

  return (
    <div id="dukb-main" tabIndex={-1} className="min-h-screen bg-background">
      {/* Round 335: this page draws its own rules control, so the navbar
          does not add a second one. */}
      <GameNavbar help="none" />
      <PageSeo
        title="Stadium Tycoon: Free Idle Soccer Club Game | DoUKnowBall"
        description="Grow a tiny football club into an empire. Live toy matches, ten divisions, a staff payroll, golden whistles, 47 badges, reputation stars and a legacy boardroom of permanent perks. Free idle game, no sign-up."
        path="/stadium-tycoon"
      />
      <div className="max-w-2xl mx-auto px-4 py-4 md:py-8">
        <header className="text-center mb-3">
          <h1 className="text-3xl md:text-5xl font-bold tracking-[0.08em] text-primary font-display">STADIUM TYCOON</h1>
          {/* Round 162: the ladder this ground is climbing, front and center. */}
          <div className="inline-flex items-center gap-1.5 mt-1 text-xs font-bold text-foreground bg-secondary rounded-full px-3 py-0.5">
            {div.emoji} {div.name}
            <span className="text-[10px] text-muted-foreground font-normal">
              {nextDivIn !== null ? `· ${nextDivIn} win${nextDivIn === 1 ? '' : 's'} to go up` : '· the top of the pyramid'}
            </span>
          </div>
          <div className="flex items-center justify-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">{Array.from({ length: Math.min(s.rep, 6) }, (_, i) => <Star key={i} className="w-3 h-3 fill-yellow-500 text-yellow-500" />)}{s.rep > 6 && <span className="font-bold text-yellow-500">x{s.rep}</span>}{s.rep > 0 && <span className="text-yellow-500 font-bold">rep {Math.round((repMult(s) - 1) * 100)}%</span>}</span>
            {achCount > 0 && <span className="text-emerald-400 font-bold">badges +{achCount * 2}%</span>}
            <button onClick={() => setShowHelp(true)} className="inline-flex items-center gap-1 px-2 py-2 transition-colors hover:text-foreground"><HelpCircle className="w-3.5 h-3.5" /> How it works</button>
          </div>
        </header>

        {/* Money header */}
        <div className="flex items-end justify-between mb-2 px-1">
          <div>
            <div className="text-3xl md:text-4xl font-bold font-display text-gold tabular-nums">{fmtMoney(money)}</div>
            <div className="text-[11px] text-muted-foreground">
              +{fmtMoney(rate)}/s
              {boostActive(s) && <span className="text-yellow-400 font-bold"> · HYPE x2 ({Math.ceil(s.boostLeftSec)}s)</span>}
              {goldenActive(s) && s.goldenKind && (
                <span className="text-amber-300 font-bold"> · {GOLDEN_INFO[s.goldenKind].label} ({Math.ceil(s.goldenLeftSec ?? 0)}s)</span>
              )}
              {s.streak >= 2 && <span className="text-orange-400 font-bold"> · streak x{streakMult(s).toFixed(2)}</span>}
              {divisionIndex(s) > 0 && <span className="text-sky-400 font-bold"> · stage x{div.incomeMult.toFixed(2)}</span>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold text-foreground tabular-nums">{fans.toLocaleString()} <span className="text-[10px] text-muted-foreground font-normal">/ {cap.toLocaleString()} seats</span></div>
            <div className="text-[11px] text-muted-foreground">{Math.floor(s.fanbase).toLocaleString()} fans follow you</div>
          </div>
        </div>

        {/* Round 150: Matchday Hype. Charges over eight minutes of play,
            one press pays double for a minute. The button is the genre's
            heartbeat and his reference screenshots had it front and center. */}
        <button
          onClick={g.doBoost}
          disabled={!boostReady(s)}
          className={cn(
            'relative w-full mb-2 py-2 rounded-xl font-bold text-sm overflow-hidden border transition-all',
            boostActive(s) ? 'border-yellow-500 bg-yellow-500/15 text-yellow-400'
              : boostReady(s) ? 'border-yellow-500 bg-yellow-500 text-black st-glow'
              : 'border-border bg-card text-muted-foreground',
          )}
        >
          {!boostActive(s) && !boostReady(s) && (
            <span className="absolute inset-y-0 left-0 bg-yellow-500/15 transition-all duration-700" style={{ width: `${Math.min(100, ((s.boostChargeSec ?? 0) / boostChargeSecOf(s)) * 100)}%` }} />
          )}
          <span className="relative">
            {boostActive(s) ? `🔥 HYPE IS LIVE: everything pays x2 (${Math.ceil(s.boostLeftSec)}s)`
              : boostReady(s) ? '📣 MATCHDAY HYPE READY: press for x2'
              : `📣 Matchday Hype charging: ${Math.floor(((s.boostChargeSec ?? 0) / boostChargeSecOf(s)) * 100)}%`}
          </span>
        </button>

        {/* The stadium: stand + pitch + all the motion */}
        <div ref={pitchRef} onClick={onPitchClick} className="relative rounded-2xl overflow-hidden border border-border cursor-pointer select-none mb-3 group">
          {/* Stand (crowd) */}
          <div className="relative h-16 md:h-20 bg-gradient-to-b from-secondary to-secondary/40 border-b border-border overflow-hidden">
            {crowdDots.map((d, i) => (
              <span key={i} className={cn('absolute w-1.5 h-1.5 rounded-full transition-opacity duration-700', d.c)} style={{ left: `${d.x}%`, top: `${d.y}%` }} />
            ))}
            {fans < 30 && <span className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground">the stand is nearly empty. build something worth watching</span>}
          </div>
          {/* Pitch */}
          <div className="relative h-44 md:h-56 bg-emerald-700">
            {/* stripes + lines */}
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent 0 12%, rgba(255,255,255,0.25) 12% 24%)' }} />
            <div className="absolute inset-x-0 top-1/2 h-px bg-white/40" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border border-white/40" />
            <div className="absolute left-0 top-1/4 bottom-1/4 w-8 border border-white/40 border-l-0" />
            <div className="absolute right-0 top-1/4 bottom-1/4 w-8 border border-white/40 border-r-0" />
            {/* scoreboard */}
            <div className="absolute top-1.5 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/50 rounded-full px-3 py-1 text-xs font-bold text-white tabular-nums max-w-[92%]">
              <span className="text-[hsl(152,60%,52%)] shrink-0">YOU {s.goalsFor}</span>
              <span className="text-white/90 shrink-0">{Math.min(s.minute, 90)}'</span>
              <span className="text-red-400 truncate">{s.goalsAgainst} {opponentName(s)}</span>
              {s.streak >= 2 && <span className="inline-flex items-center text-orange-400"><Flame className={cn('w-3.5 h-3.5', s.streak >= 5 && 'animate-pulse')} />{s.streak}</span>}
            </div>
            {/* players */}
            {dots.map((d, i) => (
              <span
                key={i}
                className={cn('absolute w-2.5 h-2.5 rounded-full shadow transition-all ease-in-out', d.ours ? 'bg-blue-400' : 'bg-red-400')}
                style={{ left: `${d.x}%`, top: `${d.y}%`, transitionDuration: '1800ms' }}
              />
            ))}
            {/* ball */}
            <span className="absolute w-2 h-2 rounded-full bg-white shadow transition-all ease-in-out" style={{ left: `${ball.x}%`, top: `${ball.y}%`, transitionDuration: '1700ms' }} />
            {/* tap hint */}
            <div className="absolute bottom-1.5 right-2 text-[10px] text-white/90 group-hover:text-white transition-colors">tap anywhere: +{fmtMoney(tapValue(s))}</div>
            {/* floaters */}
            {g.floaters.map(f => (
              <span
                key={f.id}
                className={cn(
                  'absolute pointer-events-none font-bold st-float whitespace-nowrap',
                  f.kind === 'goal' && 'text-yellow-300 text-lg',
                  f.kind === 'win' && 'text-emerald-300 text-lg',
                  f.kind === 'tap' && 'text-white text-sm',
                  f.kind === 'money' && 'text-emerald-200 text-sm',
                  f.kind === 'bad' && 'text-red-300 text-xs',
                )}
                style={{ left: `${f.x}%`, top: `${f.y}%` }}
              >
                {f.text}
              </span>
            ))}
            {/* confetti */}
            {burst && burst.pieces.map((p, i) => (
              <span key={`${burst.id}-${i}`} className="absolute top-0 w-1.5 h-2.5 st-confetti" style={{ left: `${p.x}%`, backgroundColor: p.c, animationDuration: `${p.d + 0.7}s`, transform: `rotate(${p.r}deg)` }} />
            ))}
            {/* Round 162: the golden whistle, drifting until caught or gone. */}
            {g.golden && (
              <button
                onClick={e => { e.stopPropagation(); g.doCatchGolden(); }}
                aria-label="Catch the golden whistle"
                className="absolute z-10 text-2xl st-goldwob drop-shadow-[0_0_10px_rgba(251,191,36,0.95)]"
                style={{ left: `${g.golden.x}%`, top: `${g.golden.y}%` }}
              >
                🪙
              </button>
            )}
          </div>
        </div>

        {/* Prestige bar */}
        <div className="mb-3">
          {canPrestige(s) ? (
            <button onClick={g.doPrestige} data-sell-up className="w-full py-2.5 rounded-xl font-bold bg-yellow-500 text-black hover:opacity-90 transition-opacity st-glow">
              ⭐ Sell up: permanent +50% income, +{pointsForSale(s)} legacy point{pointsForSale(s) === 1 ? '' : 's'}
            </button>
          ) : (
            <div className="relative h-2 rounded-full bg-secondary overflow-hidden" title="Progress to your next reputation star">
              <div className="absolute inset-y-0 left-0 bg-yellow-500/80 transition-all duration-700" style={{ width: `${Math.min(100, (s.lifetime / prestigeThreshold(s)) * 100)}%` }} />
            </div>
          )}
          <div className="text-[10px] text-muted-foreground text-center mt-1">
            {canPrestige(s)
              ? `the club has outgrown this ground${winsToNextDivision(s) !== null ? `. One more division before selling would pay ${pointsForSale(s) + 1} legacy points instead` : ''}`
              : `next star at ${fmtMoney(prestigeThreshold(s))} lifetime earnings (${fmtMoney(s.lifetime)} so far)`}
          </div>
        </div>

        {/* Upgrades */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pb-6">
          {TRACKS.map(t => {
            const lvl = levelOf(s, t.id);
            const cost = costOf(s, t.id);
            const ok = canBuy(s, t.id);
            return (
              <button
                key={t.id}
                onClick={() => g.doBuy(t.id)}
                disabled={!ok}
                className={cn(
                  'relative rounded-xl border p-2.5 text-left transition-all active:scale-[0.97]',
                  ok ? 'bg-card border-border hover:border-primary' : 'bg-card/50 border-border/50 opacity-70',
                )}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-base leading-none">{t.emoji}</span>
                  <span className="text-xs font-bold text-foreground truncate">{t.name}</span>
                  <span className="ml-auto text-[9px] font-bold text-muted-foreground bg-secondary rounded px-1 py-0.5">Lv {lvl}</span>
                </div>
                <div className="text-[9px] text-muted-foreground mt-1 leading-snug min-h-[22px]">{t.blurb}</div>
                <div className={cn('text-[11px] font-bold mt-1 tabular-nums', ok ? 'text-gold' : 'text-muted-foreground')}>{fmtMoney(cost)}</div>
              </button>
            );
          })}
        </div>

        {/* Round 162: the payroll. Staff earn every second, forever, and the
            tiers escalate the way an idle game should: each one about five
            times the price and four and a half times the pay of the last. */}
        <div className="mb-1 flex items-center justify-between px-1">
          <div className="text-xs font-bold text-foreground">🧑‍🤝‍🧑 The payroll</div>
          <div className="text-[10px] text-muted-foreground">{totalStaffLevels(s)} hired · earning {fmtMoney(STAFF.reduce((sum, t) => sum + staffLevelOf(s, t.id) * t.rate, 0))}/s base</div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pb-4">
          {STAFF.map(t => {
            const lvl = staffLevelOf(s, t.id);
            const cost = staffCostOf(s, t.id);
            const ok = canHire(s, t.id);
            return (
              <button
                key={t.id}
                onClick={() => g.doHire(t.id)}
                disabled={!ok}
                className={cn(
                  'relative rounded-xl border p-2.5 text-left transition-all active:scale-[0.97]',
                  ok ? 'bg-card border-border hover:border-primary' : 'bg-card/50 border-border/50 opacity-70',
                )}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-base leading-none">{t.emoji}</span>
                  <span className="text-[11px] font-bold text-foreground truncate">{t.name}</span>
                  <span className="ml-auto text-[9px] font-bold text-muted-foreground bg-secondary rounded px-1 py-0.5">{lvl}</span>
                </div>
                <div className="text-[9px] text-muted-foreground mt-1 leading-snug min-h-[22px]">{t.blurb}</div>
                <div className="flex items-center justify-between mt-1">
                  <span className={cn('text-[11px] font-bold tabular-nums', ok ? 'text-gold' : 'text-muted-foreground')}>{fmtMoney(cost)}</span>
                  <span className="text-[9px] text-emerald-400 tabular-nums">+{fmtMoney(t.rate)}/s</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Round 162: the drawers. Achievements are the long game's long game:
            every badge is +2% income, forever, across every ground.
            Round 196: the boardroom joins them. */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <button
            onClick={() => setDrawer(d => (d === 'ach' ? 'none' : 'ach'))}
            className={cn('rounded-xl border py-2 text-xs font-bold transition-all',
              drawer === 'ach' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-foreground hover:border-primary')}
          >
            🏅 Badges {achCount}/{ACHIEVEMENTS.length}
          </button>
          <button
            data-legacy-drawer
            onClick={() => setDrawer(d => (d === 'legacy' ? 'none' : 'legacy'))}
            className={cn('rounded-xl border py-2 text-xs font-bold transition-all',
              drawer === 'legacy' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-foreground hover:border-primary',
              legacyPointsOf(s) > 0 && drawer !== 'legacy' && 'border-gold text-gold')}
          >
            🏛️ Legacy{legacyPointsOf(s) > 0 ? ` (${legacyPointsOf(s)} pts)` : ''}
          </button>
          <button
            onClick={() => setDrawer(d => (d === 'stats' ? 'none' : 'stats'))}
            className={cn('rounded-xl border py-2 text-xs font-bold transition-all',
              drawer === 'stats' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-foreground hover:border-primary')}
          >
            📊 Records
          </button>
        </div>

        {drawer === 'ach' && (
          <div className="bg-card border border-border rounded-xl p-3 mb-3">
            <div className="text-[10px] text-muted-foreground mb-2">Every badge is a permanent +2% to everything you earn, on every ground, forever. {achCount} of {ACHIEVEMENTS.length} earned.</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-72 overflow-y-auto pr-1">
              {ACHIEVEMENTS.map(a => {
                const got = (s.ach ?? []).includes(a.id);
                return (
                  <div
                    key={a.id}
                    className={cn('rounded-lg border px-2 py-1.5 text-[10px] flex items-center gap-1.5',
                      got ? 'border-emerald-500/40 bg-emerald-500/10 text-foreground' : 'border-border/60 bg-background/40 text-muted-foreground')}
                  >
                    <span className="text-sm leading-none">{got ? a.emoji : '🔒'}</span>
                    <span className="truncate">{a.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Round 196: the boardroom. Legacy points buy permanent perks. */}
        {drawer === 'legacy' && (
          <div data-legacy-board className="bg-card border border-border rounded-xl p-3 mb-3">
            <div className="text-[10px] text-muted-foreground mb-2">
              Selling up pays legacy points: 1 for the sale plus 1 per division that ground climbed, so a Summit sale pays 10.
              Every perk bought here is permanent, on every future ground, forever.
              You have <b className="text-gold">{legacyPointsOf(s)} point{legacyPointsOf(s) === 1 ? '' : 's'}</b> to spend.
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {LEGACY_PERKS.map(p => {
                const lvl = perkLevelOf(s, p.id);
                const cost = perkCostOf(s, p.id);
                const ok = canBuyPerk(s, p.id);
                return (
                  <div key={p.id} data-perk={p.id} className={cn('rounded-lg border px-2 py-1.5 text-[10px] flex items-center gap-2',
                    lvl > 0 ? 'border-gold/40 bg-gold/5' : 'border-border/60 bg-background/40')}>
                    <span className="text-base leading-none shrink-0">{p.emoji}</span>
                    <span className="min-w-0 flex-1">
                      <span className="font-bold text-foreground">{p.name}</span>
                      <span className="ml-1 text-muted-foreground">Lv {lvl}/{p.costs.length}</span>
                      <span className="block text-muted-foreground leading-snug">{p.blurb}</span>
                    </span>
                    {cost === null ? (
                      <span className="shrink-0 text-[9px] font-bold text-gold">MAXED</span>
                    ) : (
                      <button
                        onClick={() => g.doLegacyPerk(p.id)}
                        disabled={!ok}
                        className={cn('shrink-0 rounded-full px-2.5 py-1 text-[9px] font-bold transition-all active:scale-95',
                          ok ? 'bg-gold text-black hover:opacity-90' : 'bg-secondary text-muted-foreground')}
                      >
                        {cost} pt{cost === 1 ? '' : 's'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {drawer === 'stats' && (
          <div className="bg-card border border-border rounded-xl p-3 mb-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center">
              {[
                ['Lifetime, this ground', fmtMoney(s.lifetime)],
                ['Career wins', s.totalWins.toLocaleString()],
                ['Career goals', s.totalGoals.toLocaleString()],
                ['Matches played', (s.totalMatches ?? 0).toLocaleString()],
                ['Taps', s.totalTaps.toLocaleString()],
                ['Best division', `${DIVISIONS[Math.min(s.bestDivision ?? 0, DIVISIONS.length - 1)].emoji} ${DIVISIONS[Math.min(s.bestDivision ?? 0, DIVISIONS.length - 1)].name}`],
                ['Golden whistles caught', (s.goldenCaught ?? 0).toLocaleString()],
                ['Hype boosts pressed', (s.boostsUsed ?? 0).toLocaleString()],
                ['Reputation stars', s.rep.toLocaleString()],
                ['Legacy points unspent', legacyPointsOf(s).toLocaleString()],
                ['Legacy perk levels', totalPerkLevels(s).toLocaleString()],
              ].map(([label, value]) => (
                <div key={label as string} className="rounded-lg bg-secondary/50 px-2 py-2">
                  <div className="text-xs font-bold font-display text-foreground truncate">{value}</div>
                  <div className="text-[9px] text-muted-foreground">{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* lifetime line */}
        <div className="text-[10px] text-muted-foreground text-center pb-4">
          lifetime {fmtMoney(s.lifetime)} · {s.totalWins} wins · {s.totalGoals} goals · {s.totalTaps} taps · match #{s.matchNo + 1} · milestones {(s.claimed ?? []).length}/{MILESTONES.length} · badges {achCount}/{ACHIEVEMENTS.length}
        </div>

        <GameSeoContent
          pageHasOwnH1
          title="Stadium Tycoon"
          description="Grow a tiny football club into an empire: live toy matches, ten divisions to climb, a staff payroll, golden whistles, 47 badges, reputation stars and a legacy boardroom of permanent perks."
        />
      </div>

      {/* Away earnings modal */}
      {g.awayPay !== null && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={g.dismissAway}>
          <div role="dialog" aria-modal="true" aria-label="While you were away" tabIndex={-1} ref={focusDialogOnMount} onKeyDown={escapeCloses(g.dismissAway)} className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full text-center" onClick={e => e.stopPropagation()}>
            <div className="text-4xl mb-2">🏟️</div>
            <div className="text-lg font-bold font-display text-foreground">While you were away</div>
            <p className="text-sm text-muted-foreground mt-1">The turnstiles kept spinning at half speed.</p>
            <div className="text-3xl font-bold font-display text-gold mt-3">+{fmtMoney(g.awayPay)}</div>
            <button onClick={g.dismissAway} className="mt-4 w-full py-2.5 rounded-xl font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity">Back to work</button>
          </div>
        </div>
      )}

      {/* Rules modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowHelp(false)}>
          <div role="dialog" aria-modal="true" aria-label="How Stadium Tycoon works" tabIndex={-1} ref={focusDialogOnMount} onKeyDown={escapeCloses(() => setShowHelp(false))} className="bg-card border border-border rounded-2xl p-5 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-lg font-bold font-display text-foreground">How Stadium Tycoon works</div>
              <button onClick={() => setShowHelp(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>You run a tiny club's matchday money machine. Fans show up if there are seats and things to spend on; every fan pays you every second.</p>
              <p>The match on screen is real: your Squad level drives goals, goals pay a bonus scaled by the crowd, wins extend a streak that multiplies everything and pulls in new fans. Opponents get harder forever.</p>
              <p>Tap the stadium for instant cash (Megaphone makes taps stronger). Buy Stands when the ground is full, spending tracks when it is not.</p>
              <p>Matchday Hype charges over eight minutes of play (Stadium Voltage in the boardroom trims that to seven, then six). Press it and everything pays double for sixty seconds: income, taps, goal and win bonuses. It does not charge or burn while you are away.</p>
              <p>Wins at your ground climb a ladder of ten divisions, from the Muddy Meadows League to The Summit. Every division multiplies all income, up to x5.5 at the top, and going up pays a promotion bonus on the spot. Higher divisions send tougher opponents.</p>
              <p>The payroll hires eight staff, from a matchday steward to a club legend. Every staff level adds steady income of its own before the multipliers touch it, so a deep payroll compounds hard.</p>
              <p>While you play, a golden whistle drifts onto the pitch every couple of minutes. You get about 12 seconds to catch it, for one of five prizes: DERBY DAY (everything pays x7 for 77 seconds), CROWD SURGE (taps pay x25 for 30 seconds), TV WINDFALL (fifteen minutes of income, instantly), WONDERGOAL GOES VIRAL (the fanbase jumps) or SPONSOR GIFT (a free upgrade level).</p>
              <p>Milestones pay once each for the club's firsts: the first win, the first full house, 10,000 fans, five wins in a row. Ten in all, and they stay earned even after you sell up.</p>
              <p>Badges are the long game: 47 of them, from 500 fans to promotion into The Summit, and each one earned is +2% income forever. Check them in the Badges drawer, and your career numbers in Club records.</p>
              <p>When lifetime earnings hit the bar, sell up: fans, ground, staff and division reset, but you keep a permanent Reputation star worth +50% income each, every badge, and your club records. The ladder is faster every run.</p>
              <p>Selling up also pays legacy points: 1 for the sale plus 1 per division that ground climbed, so cashing out early pays 1 and a sale from The Summit pays 10. Spend them in the Legacy boardroom on eight permanent perks, from Boardroom Sway (+10% income per level, forever) to a Steady Dressing Room that keeps half your streak through a loss. The whole board costs exactly 100 points. Perks survive every future sale.</p>
              <p>Away from the game, you earn at half speed for up to 8 hours (the Away Day Deal perk raises both, up to 80% for 12 hours). Progress saves on this device.</p>
              <p>Worked example: at 400 fans and $12/s, one goal pays about $240, a win about $880, and Stands level 10 (adding 40 seats) pays itself back in under two minutes if the ground was full.</p>
            </div>
          </div>
        </div>
      )}

      {/* local animation keyframes */}
      <style>{`
        @keyframes stFloat { 0% { opacity: 0; transform: translateY(6px) scale(0.9); } 12% { opacity: 1; transform: translateY(0) scale(1.06); } 100% { opacity: 0; transform: translateY(-46px) scale(1); } }
        .st-float { animation: stFloat 1.8s ease-out forwards; }
        @keyframes stConfetti { 0% { opacity: 1; transform: translateY(-8px) rotate(0deg); } 100% { opacity: 0; transform: translateY(190px) rotate(540deg); } }
        .st-confetti { animation-name: stConfetti; animation-timing-function: ease-in; animation-fill-mode: forwards; }
        @keyframes stGlow { 0%, 100% { box-shadow: 0 0 6px rgba(234,179,8,0.5); } 50% { box-shadow: 0 0 22px rgba(234,179,8,0.9); } }
        .st-glow { animation: stGlow 1.6s ease-in-out infinite; }
        @keyframes stGoldwob { 0%, 100% { transform: rotate(-14deg) scale(1); filter: brightness(1); } 25% { transform: rotate(10deg) scale(1.22); filter: brightness(1.35); } 50% { transform: rotate(-8deg) scale(1.05); filter: brightness(1.1); } 75% { transform: rotate(12deg) scale(1.18); filter: brightness(1.3); } }
        .st-goldwob { animation: stGoldwob 0.9s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
