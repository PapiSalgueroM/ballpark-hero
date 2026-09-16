import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Swords, Dumbbell, Trophy, RotateCcw, ChevronLeft, Flame, HeartPulse } from 'lucide-react';
import ShareButtons from '@/components/game/ShareButtons';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { useRevealScroll } from '@/hooks/useRevealScroll';
import { cn } from '@/lib/utils';
import { Confetti, ConditionBar, HitFlash } from '@/components/soccer-career/CareerFx';
import {
  WEIGHT_CLASSES, STYLES, TACTICS, weightById,
  newFightCareer, runCamp, takeFight, legacyOf, ratingOf, effectiveAttrs,
  conditionTrack,
  type FightCareerState, type Offer, type BoutResult, type CampPlan,
  type Tactic, type FightStyle, type WeightId,
} from '@/lib/fightCareer';

type Phase = 'setup' | 'hub' | 'camp' | 'plan' | 'fight' | 'result' | 'retired';

const SAVE_KEY = 'fight-career-save-v1';
const CAMP_WEEKS = 6;

interface SaveShape { st: FightCareerState; phase: Phase }

/* A small labelled bar. Kept deliberately plain: this screen already has a lot
   of numbers on it and a phone has about 360 usable pixels across. */
function Bar({ label, value, max = 99, tone = 'bg-primary' }: {
  label: string; value: number; max?: number; tone?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full rounded-full transition-all duration-500', tone)}
          style={{ width: `${Math.max(2, Math.min(100, (value / max) * 100))}%` }} />
      </div>
      <span className="w-7 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">{Math.round(value)}</span>
    </div>
  );
}

export default function FightCareerBoard() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [st, setSt] = useState<FightCareerState | null>(null);
  const [name, setName] = useState('');
  const [weight, setWeight] = useState<WeightId>('welter');
  const [style, setStyle] = useState<FightStyle>('outboxer');
  const [offer, setOffer] = useState<Offer | null>(null);
  const [camp, setCamp] = useState<CampPlan>({ conditioning: 2, power: 2, defence: 1, speed: 1 });
  const [tactics, setTactics] = useState<Tactic[]>(['box', 'press', 'counter']);
  const [result, setResult] = useState<BoutResult | null>(null);
  const [shown, setShown] = useState(0);
  const [animate, setAnimate] = useState(true);

  const revealRef = useRevealScroll<HTMLDivElement>(`${phase}:${st?.fightNo ?? 0}:${shown}`);

  const legacy = useMemo(() => (st ? legacyOf(st) : null), [st]);
  useGameCompletion('fight-career', !!st?.retired, legacy?.score ?? 0);

  /* ── save and restore ── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw) as SaveShape;
      if (!s?.st?.fighter?.name) return;
      setSt(s.st);
      /* Never restore straight into a half played bout: the result is not on
         the save, so the fight would have no rounds to show. */
      setPhase(s.st.retired ? 'retired' : s.phase === 'fight' || s.phase === 'result' ? 'hub' : s.phase);
    } catch { /* a fresh career is the right fallback */ }
  }, []);

  const persist = useCallback((next: FightCareerState, ph: Phase) => {
    setSt(next);
    setPhase(ph);
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ st: next, phase: ph })); } catch { /* ignore */ }
  }, []);

  /* ── the bout reveal, beat by beat, and always skippable ── */
  const timer = useRef<number | null>(null);
  useEffect(() => {
    if (phase !== 'fight' || !result) return;
    if (!animate) { setShown(result.rounds.length); return; }
    if (shown >= result.rounds.length) return;
    timer.current = window.setTimeout(() => setShown(s => s + 1), 620);
    return () => { if (timer.current) window.clearTimeout(timer.current); };
  }, [phase, result, shown, animate]);

  const start = () => {
    const next = newFightCareer(name, weight, style);
    persist(next, 'hub');
  };

  const chooseOffer = (o: Offer) => { setOffer(o); setPhase('camp'); };

  const intoCamp = () => {
    if (!st) return;
    persist(runCamp(st, camp), 'plan');
  };

  const fight = () => {
    if (!st || !offer) return;
    const res = takeFight(st, offer.id, tactics);
    if (!res) return;
    setResult(res.result);
    setShown(animate ? 0 : res.result.rounds.length);
    setSt(res.state);
    setPhase('fight');
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ st: res.state, phase: 'hub' })); } catch { /* ignore */ }
  };

  const backToHub = () => {
    if (!st) return;
    setResult(null);
    setOffer(null);
    setShown(0);
    setCamp({ conditioning: 2, power: 2, defence: 1, speed: 1 });
    setPhase(st.retired ? 'retired' : 'hub');
  };

  const reset = () => {
    try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
    setSt(null); setResult(null); setOffer(null); setShown(0); setPhase('setup');
  };

  const campTotal = camp.conditioning + camp.power + camp.defence + camp.speed;

  /* ═══════════════ setup ═══════════════ */
  if (phase === 'setup' || !st) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border bg-card p-4">
          <label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Your name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Leave it blank and we will name you"
            maxLength={28}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="rounded-lg border bg-card p-4">
          <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Weight class</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {WEIGHT_CLASSES.map(w => (
              <button key={w.id} onClick={() => setWeight(w.id)}
                className={cn('min-h-[44px] rounded-md border px-2 py-2 text-xs font-medium transition',
                  weight === w.id ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted')}>
                {w.label}
                <span className="block text-[10px] text-muted-foreground">{w.lbs} lbs</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">How you fight</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {STYLES.map(s => (
              <button key={s.id} onClick={() => setStyle(s.id)}
                className={cn('min-h-[44px] rounded-md border p-3 text-left transition',
                  style === s.id ? 'border-primary bg-primary/10' : 'hover:bg-muted')}>
                <span className="block text-sm font-semibold">{s.label}</span>
                <span className="block text-[11px] leading-snug text-muted-foreground">{s.blurb}</span>
              </button>
            ))}
          </div>
        </div>

        <button onClick={start}
          className="min-h-[48px] w-full rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground">
          Turn professional
        </button>
      </div>
    );
  }

  const f = st.fighter;
  const ea = effectiveAttrs(f);
  const rankLabel = st.champion ? 'CHAMPION' : f.rank >= 99 ? 'Unranked' : `#${f.rank}`;

  const Header = (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-bold">{f.name}</h2>
          <p className="text-xs text-muted-foreground">
            {weightById(st.weight).label} · {STYLES.find(s => s.id === f.style)?.label} · age {Math.floor(f.age)}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className={cn('text-sm font-bold', st.champion ? 'text-amber-500' : 'text-primary')}>{rankLabel}</p>
          <p className="text-xs tabular-nums text-muted-foreground">{f.wins}-{f.losses}{f.draws ? `-${f.draws}` : ''} ({f.kos} KO)</p>
        </div>
      </div>
      <div className="mt-3 space-y-1.5">
        <Bar label="Power" value={ea.power} />
        <Bar label="Chin" value={ea.chin} />
        <Bar label="Speed" value={ea.speed} />
        <Bar label="Defence" value={ea.defence} />
        <Bar label="Damage" value={f.damage} max={82} tone="bg-destructive" />
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Purse so far {st.earnings.toFixed(2)}m. Damage never heals, and it is what ends you.
      </p>
    </div>
  );

  /* ═══════════════ retired ═══════════════ */
  if (phase === 'retired' && legacy) {
    return (
      <div className="space-y-4" ref={revealRef}>
        {Header}
        <div className="rounded-lg border bg-card p-4 text-center">
          <Trophy className="mx-auto mb-2 h-7 w-7 text-amber-500" />
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Final verdict</p>
          <p className="text-2xl font-bold text-primary">{legacy.tier}</p>
          <p className="mb-3 text-sm text-muted-foreground">{legacy.score} out of 100</p>
          <ul className="space-y-1 text-left text-sm">
            {legacy.bullets.map((b, i) => <li key={i} className="text-muted-foreground">{b}</li>)}
          </ul>
        </div>
        <ShareButtons
          gameName="Fight Career"
          gamePath="/fight-career"
          score={`${legacy.tier}, ${legacy.score}/100`}
          customText={`${f.name} retired ${f.wins}-${f.losses} with ${f.kos} knockouts and went down as a ${legacy.tier}.`}
        />
        <button onClick={reset} className="min-h-[48px] w-full rounded-md border px-4 py-3 font-semibold">
          <RotateCcw className="mr-2 inline h-4 w-4" />Start a new fighter
        </button>
      </div>
    );
  }

  /* ═══════════════ hub, the offers ═══════════════ */
  if (phase === 'hub') {
    return (
      <div className="space-y-4" ref={revealRef}>
        {Header}
        <div>
          <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
            {st.champion ? 'Defend the title' : 'What do you take?'}
          </p>
          <div className="space-y-2">
            {st.offers.map(o => {
              const gap = ratingOf(o.opponent) - ratingOf(f);
              const risk = gap >= 6 ? 'Dangerous' : gap >= -3 ? 'Even' : 'Comfortable';
              const tone = gap >= 6 ? 'text-destructive' : gap >= -3 ? 'text-amber-500' : 'text-emerald-500';
              return (
                <button key={o.id} onClick={() => chooseOffer(o)}
                  className="min-h-[56px] w-full rounded-lg border bg-card p-3 text-left transition hover:border-primary">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{o.label}</span>
                    <span className="shrink-0 text-sm font-bold text-primary">{o.purse.toFixed(2)}m</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {o.opponent.name} · {STYLES.find(s => s.id === o.opponent.style)?.label} · {o.rounds} rounds
                  </p>
                  <p className={cn('text-[11px] font-medium', tone)}>
                    {risk}{o.title ? ' · for the world title' : o.rankGain ? ` · up to ${o.rankGain} places` : ''}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
        {st.history.length > 0 && (
          <div className="rounded-lg border bg-card p-3">
            <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Record</p>
            <div className="max-h-40 space-y-0.5 overflow-y-auto text-xs">
              {st.history.slice().reverse().map(h => (
                <div key={h.no} className="flex justify-between gap-2 tabular-nums">
                  <span className={cn('font-semibold', h.result === 'W' ? 'text-emerald-500' : h.result === 'L' ? 'text-destructive' : 'text-muted-foreground')}>
                    {h.result}
                  </span>
                  <span className="flex-1 truncate text-muted-foreground">{h.opponent}</span>
                  <span className="text-muted-foreground">{h.method}{h.method === 'KO' || h.method === 'TKO' ? ` R${h.round}` : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <button onClick={reset} className="min-h-[44px] w-full rounded-md border px-4 py-2 text-sm text-muted-foreground">
          Retire and start again
        </button>
      </div>
    );
  }

  /* ═══════════════ camp ═══════════════ */
  if (phase === 'camp' && offer) {
    const rows: { k: keyof CampPlan; label: string }[] = [
      { k: 'conditioning', label: 'Conditioning' },
      { k: 'power', label: 'Power' },
      { k: 'defence', label: 'Defence' },
      { k: 'speed', label: 'Speed' },
    ];
    return (
      <div className="space-y-4" ref={revealRef}>
        <button onClick={backToHub} className="flex min-h-[40px] items-center text-sm text-muted-foreground">
          <ChevronLeft className="h-4 w-4" />Back
        </button>
        <div className="rounded-lg border bg-card p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Dumbbell className="h-4 w-4" />Six weeks of camp
          </p>
          <p className="mb-3 text-xs text-muted-foreground">
            You have {CAMP_WEEKS - campTotal} week{CAMP_WEEKS - campTotal === 1 ? '' : 's'} left to place.
            Spreading them keeps you ready everywhere. Piling them on one thing makes you sharp there and short of gas.
          </p>
          <div className="space-y-2">
            {rows.map(r => (
              <div key={r.k} className="flex items-center gap-2">
                <span className="w-24 shrink-0 text-sm">{r.label}</span>
                <button
                  onClick={() => setCamp(c => ({ ...c, [r.k]: Math.max(0, c[r.k] - 1) }))}
                  className="h-9 w-9 rounded-md border text-lg leading-none">-</button>
                <span className="w-6 text-center text-sm tabular-nums">{camp[r.k]}</span>
                <button
                  disabled={campTotal >= CAMP_WEEKS}
                  onClick={() => setCamp(c => ({ ...c, [r.k]: c[r.k] + 1 }))}
                  className="h-9 w-9 rounded-md border text-lg leading-none disabled:opacity-40">+</button>
              </div>
            ))}
          </div>
        </div>
        <button onClick={intoCamp}
          className="min-h-[48px] w-full rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground">
          Finish camp
        </button>
      </div>
    );
  }

  /* ═══════════════ the game plan ═══════════════ */
  if (phase === 'plan' && offer) {
    const oppStyle = STYLES.find(s => s.id === offer.opponent.style);
    return (
      <div className="space-y-4" ref={revealRef}>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Tonight</p>
          <p className="text-lg font-bold">{offer.opponent.name}</p>
          <p className="text-sm text-muted-foreground">{oppStyle?.label}. {oppStyle?.blurb}</p>
          <p className="mt-2 text-[11px] text-muted-foreground">
            He will change how he fights if you keep doing one thing, so give him three different looks.
          </p>
        </div>
        <div className="space-y-3">
          {[0, 1, 2].map(i => (
            <div key={i}>
              <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                {i === 0 ? 'First look' : i === 1 ? 'Second look' : 'Third look'}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {TACTICS.map(t => (
                  <button key={t.id}
                    onClick={() => setTactics(prev => prev.map((p, j) => (j === i ? t.id : p)))}
                    className={cn('min-h-[44px] rounded-md border px-2 py-2 text-left text-xs transition',
                      tactics[i] === t.id ? 'border-primary bg-primary/10' : 'hover:bg-muted')}>
                    <span className="block font-semibold">{t.label}</span>
                    <span className="block text-[10px] leading-tight text-muted-foreground">{t.blurb}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" checked={animate} onChange={e => setAnimate(e.target.checked)} className="h-4 w-4" />
          Play the fight out round by round
        </label>
        <button onClick={fight}
          className="min-h-[48px] w-full rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground">
          <Swords className="mr-2 inline h-4 w-4" />Fight
        </button>
      </div>
    );
  }

  /* ═══════════════ the fight, and the result underneath it ═══════════════ */
  if ((phase === 'fight' || phase === 'result') && result && offer) {
    const visible = result.rounds.slice(0, shown);
    const done = shown >= result.rounds.length;
    const won = result.winner === 'player';
    /* Round 628: the bars are computed in the lib, not here, so the harness can
       measure them. See conditionTrack in src/lib/fightCareer.ts. */
    const track = conditionTrack(result);
    const at = shown > 0 ? track[Math.min(shown, track.length) - 1] : { round: 0, player: 100, opp: 100 };
    const myCard = visible.reduce((a, r) => a + r.playerScore, 0);
    const hisCard = visible.reduce((a, r) => a + r.oppScore, 0);
    /* The most punches either man landed in one round, so the per round bars
       are drawn against the fight's own scale rather than an invented ceiling.
       Guarded at 1 because a round where nobody lands anything is legal. */
    const busiest = Math.max(1, ...result.rounds.map(r => Math.max(r.playerLanded, r.oppLanded)));
    const lastKd = visible.length ? visible[visible.length - 1].knockdown : null;
    return (
      <div className="space-y-4" ref={revealRef}>
        <div className="relative overflow-hidden rounded-lg border bg-card p-4">
          {/* Keyed on the round, so a new knockdown remounts it and it replays,
              and a later render of the same round keeps the same key, so it
              does not. Gated on the round by round reveal rather than on the
              fight still running: the old `!done` gate meant the knockdown in
              the last round never flashed, and in a stoppage that is nearly
              always the one that ended it. A fight shown all at once gets no
              flash, because nothing was revealed. */}
          {lastKd && animate && (
            <HitFlash key={`kd-${visible.length}`}
              tone={lastKd === 'player' ? 'bg-emerald-400/30' : 'bg-destructive/30'} />
          )}
          <div className="flex items-center justify-between text-sm font-semibold">
            <span className="truncate">{f.name}</span>
            <span className="shrink-0 px-2 text-xs text-muted-foreground">vs</span>
            <span className="truncate text-right">{offer.opponent.name}</span>
          </div>

          <div className="mt-2 flex items-start gap-3">
            <ConditionBar value={at.player} label="You" />
            <ConditionBar value={at.opp} label="Him" align="right" />
          </div>

          <div className="mt-2 flex items-center justify-between text-xs tabular-nums text-muted-foreground">
            {/* count-pop keyed on the score itself: it replays only when the
                number actually changes, not on every reveal tick. */}
            <span key={`p${myCard}`} className="animate-count-pop font-semibold text-foreground">{myCard}</span>
            <span>after {visible.length} of {result.rounds.length}</span>
            <span key={`o${hisCard}`} className="animate-count-pop font-semibold text-foreground">{hisCard}</span>
          </div>
        </div>

        <div className="space-y-2">
          {visible.map(r => (
            <div key={r.round}
              className={cn('relative animate-round-in overflow-hidden rounded-md border p-2.5 text-xs',
                r.knockdown === 'player' ? 'border-emerald-500/60 bg-emerald-500/10'
                  : r.knockdown === 'opp' ? 'border-destructive/60 bg-destructive/10' : 'bg-card')}>
              <div className="flex items-center justify-between font-semibold">
                <span>Round {r.round}</span>
                <span className="tabular-nums">{r.playerScore} - {r.oppScore}</span>
              </div>

              {/* Punches landed, drawn against the busiest round of the night.
                  The sentence underneath still says the numbers, because a bar
                  on its own is a shape and the player wants the count. */}
              <div className="mt-1.5 space-y-1" aria-hidden="true">
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-500 ease-out"
                    style={{ width: `${(r.playerLanded / busiest) * 100}%` }} />
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-muted-foreground/60 transition-[width] duration-500 ease-out"
                    style={{ width: `${(r.oppLanded / busiest) * 100}%` }} />
                </div>
              </div>

              <p className="mt-1.5 text-muted-foreground">
                You {TACTICS.find(t => t.id === r.tactic)?.label.toLowerCase()}, landing {r.playerLanded}. He landed {r.oppLanded}.
              </p>
              {r.note && (
                <p className={cn('mt-0.5 font-medium',
                  r.knockdown === 'player' ? 'text-emerald-500'
                    : r.knockdown === 'opp' ? 'text-destructive'
                      : r.switched ? 'text-amber-500' : 'text-muted-foreground')}>
                  {r.switched && <Flame className="mr-1 inline h-3 w-3" />}{r.note}
                </p>
              )}
            </div>
          ))}
        </div>

        {!done && (
          <button onClick={() => setShown(result.rounds.length)}
            className="min-h-[44px] w-full rounded-md border px-4 py-2 text-sm">
            Skip to the decision
          </button>
        )}

        {done && (
          <>
            <div className={cn('relative overflow-hidden rounded-lg border p-4 text-center',
              won ? 'border-emerald-500/60 bg-emerald-500/10' : 'bg-card')}>
              {/* A win is the moment worth celebrating, and a stoppage is the
                  biggest one, so it gets the gold. A loss gets nothing: the
                  screen going quiet is the point. */}
              {won && <Confetti pieces={result.method === 'KO' || result.method === 'TKO' ? 46 : 28}
                gold={result.method === 'KO' || result.method === 'TKO'} />}
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {result.method === 'D' ? 'Drawn' : won ? 'You win' : 'You lose'}
              </p>
              <p className="text-xl font-bold">
                {result.method}{result.method === 'KO' || result.method === 'TKO' ? `, round ${result.endedRound}` : ''}
              </p>
              <p className="text-sm text-muted-foreground">
                Cards {result.playerCard} to {result.oppCard} · purse {offer.purse.toFixed(2)}m
              </p>
              <p className="mt-1 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <HeartPulse className="h-3 w-3" />
                You took {result.damageTaken.toFixed(1)} damage tonight, and you keep it.
              </p>
            </div>
            <button onClick={backToHub}
              className="min-h-[48px] w-full rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground">
              {st.retired ? 'See how you are remembered' : 'Next'}
            </button>
          </>
        )}
      </div>
    );
  }

  return null;
}
