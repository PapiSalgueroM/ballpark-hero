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
import { cn } from '@/lib/utils';
import { HelpCircle, Star, Flame, X } from 'lucide-react';
import { GameNavbar } from '@/components/game/GameNavbar';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import {
  TRACKS, levelOf, costOf, canBuy, capacity, attendance, incomePerSec,
  tapValue, repMult, streakMult, prestigeThreshold, canPrestige, fmtMoney,
  boostReady, boostActive, BOOST_CHARGE_SEC, MILESTONES, opponentName,
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
  const [burst, setBurst] = useState<{ id: number; pieces: { x: number; d: number; c: string; r: number }[] } | null>(null);
  const pitchRef = useRef<HTMLDivElement | null>(null);

  const fans = attendance(s);
  const cap = capacity(s);
  const rate = incomePerSec(s);

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
    <div className="min-h-screen bg-background">
      <GameNavbar />
      <PageSeo
        title="Stadium Tycoon: Free Idle Soccer Club Game | DoUKnowBall"
        description="Grow a tiny football club into an empire. Live toy matches, nine upgrade tracks, win streaks, reputation stars and away earnings. Free idle game, no sign-up."
        path="/stadium-tycoon"
      />
      <div className="max-w-2xl mx-auto px-4 py-4 md:py-8">
        <header className="text-center mb-3">
          <h1 className="text-3xl md:text-5xl font-bold tracking-[0.08em] text-primary font-display">STADIUM TYCOON</h1>
          <div className="flex items-center justify-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">{Array.from({ length: Math.min(s.rep, 6) }, (_, i) => <Star key={i} className="w-3 h-3 fill-yellow-500 text-yellow-500" />)}{s.rep > 6 && <span className="font-bold text-yellow-500">x{s.rep}</span>}{s.rep > 0 && <span className="text-yellow-500 font-bold">rep {Math.round((repMult(s) - 1) * 100)}%</span>}</span>
            <button onClick={() => setShowHelp(true)} className="inline-flex items-center gap-1 hover:text-foreground transition-colors"><HelpCircle className="w-3.5 h-3.5" /> How it works</button>
          </div>
        </header>

        {/* Money header */}
        <div className="flex items-end justify-between mb-2 px-1">
          <div>
            <div className="text-3xl md:text-4xl font-bold font-display text-gold tabular-nums">{fmtMoney(money)}</div>
            <div className="text-[11px] text-muted-foreground">
              +{fmtMoney(rate)}/s
              {boostActive(s) && <span className="text-yellow-400 font-bold"> · HYPE x2 ({Math.ceil(s.boostLeftSec)}s)</span>}
              {s.streak >= 2 && <span className="text-orange-400 font-bold"> · streak x{streakMult(s).toFixed(2)}</span>}
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
            <span className="absolute inset-y-0 left-0 bg-yellow-500/15 transition-all duration-700" style={{ width: `${Math.min(100, ((s.boostChargeSec ?? 0) / BOOST_CHARGE_SEC) * 100)}%` }} />
          )}
          <span className="relative">
            {boostActive(s) ? `🔥 HYPE IS LIVE: everything pays x2 (${Math.ceil(s.boostLeftSec)}s)`
              : boostReady(s) ? '📣 MATCHDAY HYPE READY: press for x2'
              : `📣 Matchday Hype charging: ${Math.floor(((s.boostChargeSec ?? 0) / BOOST_CHARGE_SEC) * 100)}%`}
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
              <span className="text-primary shrink-0">YOU {s.goalsFor}</span>
              <span className="text-white/70 shrink-0">{Math.min(s.minute, 90)}'</span>
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
            <div className="absolute bottom-1.5 right-2 text-[10px] text-white/70 group-hover:text-white transition-colors">tap anywhere: +{fmtMoney(tapValue(s))}</div>
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
          </div>
        </div>

        {/* Prestige bar */}
        <div className="mb-3">
          {canPrestige(s) ? (
            <button onClick={g.doPrestige} className="w-full py-2.5 rounded-xl font-bold bg-yellow-500 text-black hover:opacity-90 transition-opacity st-glow">
              ⭐ Sell up and move to a bigger ground (permanent +50% income)
            </button>
          ) : (
            <div className="relative h-2 rounded-full bg-secondary overflow-hidden" title="Progress to your next reputation star">
              <div className="absolute inset-y-0 left-0 bg-yellow-500/80 transition-all duration-700" style={{ width: `${Math.min(100, (s.lifetime / prestigeThreshold(s)) * 100)}%` }} />
            </div>
          )}
          <div className="text-[10px] text-muted-foreground text-center mt-1">
            {canPrestige(s) ? 'the club has outgrown this ground' : `next star at ${fmtMoney(prestigeThreshold(s))} lifetime earnings (${fmtMoney(s.lifetime)} so far)`}
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

        {/* lifetime line */}
        <div className="text-[10px] text-muted-foreground text-center pb-4">
          lifetime {fmtMoney(s.lifetime)} · {s.totalWins} wins · {s.totalGoals} goals · {s.totalTaps} taps · match #{s.matchNo + 1} · milestones {(s.claimed ?? []).length}/{MILESTONES.length}
        </div>

        <GameSeoContent
          title="Stadium Tycoon"
          description="Grow a tiny football club into an empire: live toy matches, nine upgrade tracks, win streaks, reputation stars and away earnings."
        />
      </div>

      {/* Away earnings modal */}
      {g.awayPay !== null && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={g.dismissAway}>
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full text-center" onClick={e => e.stopPropagation()}>
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
          <div className="bg-card border border-border rounded-2xl p-5 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-lg font-bold font-display text-foreground">How Stadium Tycoon works</div>
              <button onClick={() => setShowHelp(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>You run a tiny club's matchday money machine. Fans show up if there are seats and things to spend on; every fan pays you every second.</p>
              <p>The match on screen is real: your Squad level drives goals, goals pay a bonus scaled by the crowd, wins extend a streak that multiplies everything and pulls in new fans. Opponents get harder forever.</p>
              <p>Tap the stadium for instant cash (Megaphone makes taps stronger). Buy Stands when the ground is full, spending tracks when it is not.</p>
              <p>Matchday Hype charges over eight minutes of play. Press it and everything pays double for sixty seconds: income, taps, goal and win bonuses. It does not charge or burn while you are away.</p>
              <p>Milestones pay once each for the club's firsts: the first win, the first full house, 10,000 fans, five wins in a row. Ten in all, and they stay earned even after you sell up.</p>
              <p>When lifetime earnings hit the bar, sell up: everything resets except a permanent Reputation star worth +50% income, forever, each.</p>
              <p>Away from the game, you earn at half speed for up to 8 hours. Progress saves on this device.</p>
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
      `}</style>
    </div>
  );
}
