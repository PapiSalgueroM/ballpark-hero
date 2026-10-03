import { useCallback, useEffect, useMemo, useState } from 'react';
import { Swords, Dumbbell, UserPlus, ChevronLeft, Trophy, RotateCcw, HeartPulse, Flame } from 'lucide-react';
import ShareButtons from '@/components/game/ShareButtons';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { useRevealScroll } from '@/hooks/useRevealScroll';
import { markRestoredFinish } from '@/lib/restoredFinish';
import { cn } from '@/lib/utils';
import { Confetti, ConditionBar } from '@/components/soccer-career/CareerFx';
import { STYLES, TACTICS, weightById, ratingOf, effectiveAttrs, conditionTrack, type Tactic, type BoutResult } from '@/lib/fightCareer';
import {
  newGym, signProspect, trainFighter, offersForFighter, takeGymFight,
  releaseFighter, advanceWeek, gymVerdict, guessWeight, weeklyCost, cutRate, TRAIN_COST,
  trainedThisWeek, campQualityFor, sellGym, salePrice, canSellGym, sanitizeGym,
  SELL_MIN_WEEKS, BROKE_PENALTY, TRAIN_FOCI,
  type GymState, type GymOffer, type TrainFocus,
} from '@/lib/fightGym';
import { HowToPlayPopover } from '@/components/game/HowToPlayPopover';

const FOCUS_LABEL: Record<TrainFocus, string> = {
  conditioning: 'Conditioning',
  power: 'Power',
  defence: 'Defence',
  speed: 'Speed',
};

/* Round 955: the one place the new rules are written down for the player,
   because the page's guide lives in a file another lane is editing. The worked
   example uses this file's own numbers through the lib, so it cannot drift. */
function GymRules() {
  return (
    <HowToPlayPopover title="Training and selling up" triggerLabel="How training and selling work" floatingTrigger={false}>
      <div className="space-y-3 text-sm">
        <p>
          <strong>Training.</strong> Each fighter gets one training block a week, {TRAIN_COST.toFixed(3)}m a time. Pick what
          the block works on: conditioning, power, defence or speed. Only that area grows, and it grows less the closer he
          is to his ceiling.
        </p>
        <p>
          The work also carries into his next fight as sharpness, which is how long he keeps his output before he tires. A
          man nobody has worked with goes in at 50. Every block since his last fight adds 5, up to four blocks, and a
          conditioning block among them adds 10 more. It is a little more gas in the late rounds, not a new fighter. The
          fight spends it, so the next camp starts from zero.
        </p>
        <p className="rounded-md border bg-muted/40 p-2 text-xs">
          Example: you give him power in week 10, conditioning in week 11 and defence in week 12, then fight him in week 12.
          That is three blocks, so 50 + 15 + 10 for the conditioning, and he goes in at sharpness 75. Try a second block on
          him in week 12 and the gym says no.
        </p>
        <p>
          <strong>Selling up.</strong> From week {SELL_MIN_WEEKS} you can sell the gym. The buyer pays for your name, your
          belts and every man under contract who has fought for you, less what he is carrying. The men go with the keys
          and count as fighters who came through your gym, so a man you have wrecked counts against you whether you let
          him go first or sell him on. Selling ends the game and shows the verdict with the sale counted in. Run out of
          money instead and the doors close with {BROKE_PENALTY} points off.
        </p>
      </div>
    </HowToPlayPopover>
  );
}

type Phase = 'setup' | 'hub' | 'plan' | 'fight' | 'closed';

const SAVE_KEY = 'fight-gym-save-v1';

function Bar({ label, value, max = 99, tone = 'bg-primary' }: {
  label: string; value: number; max?: number; tone?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full rounded-full transition-all duration-500', tone)}
          style={{ width: `${Math.max(2, Math.min(100, (value / max) * 100))}%` }} />
      </div>
      <span className="w-6 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">{Math.round(value)}</span>
    </div>
  );
}

export default function FightGymBoard() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [g, setG] = useState<GymState | null>(null);
  const [name, setName] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [offers, setOffers] = useState<GymOffer[]>([]);
  const [offer, setOffer] = useState<GymOffer | null>(null);
  const [tactics, setTactics] = useState<Tactic[]>(['box', 'press', 'counter']);
  const [result, setResult] = useState<BoutResult | null>(null);
  /* Round 955: which fighter's focus picker is open, and which one tap action is
     waiting on a second tap: 'reset', 'sell', or a fighter id to let go. */
  const [trainingId, setTrainingId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  const revealRef = useRevealScroll<HTMLDivElement>(`${phase}:${g?.week ?? 0}:${activeId ?? ''}`);
  const verdict = useMemo(() => (g ? gymVerdict(g) : null), [g]);
  useGameCompletion('fight-gym', !!g?.closed, verdict?.score ?? 0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw) as { g: GymState };
      if (!s?.g?.name) return;
      /* Round 643: a closed gym read back from storage is not a new close.
         This restore runs after mount, so without the mark every reload
         paid the verdict again. */
      if (s.g.closed) markRestoredFinish('fight-gym');
      const g0 = sanitizeGym(s.g);
      setG(g0);
      setPhase(g0.closed ? 'closed' : 'hub');
    } catch { /* a fresh gym is the right fallback */ }
  }, []);

  const persist = useCallback((next: GymState, ph: Phase) => {
    setG(next);
    setPhase(ph);
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ g: next })); } catch { /* ignore */ }
  }, []);

  const reset = () => {
    try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
    setG(null); setPhase('setup'); setActiveId(null); setOffer(null); setResult(null);
    setTrainingId(null); setConfirm(null);
  };

  if (phase === 'setup' || !g) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border bg-card p-4">
          <label htmlFor="fight-gym-name" className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Name the gym</label>
          <input id="fight-gym-name" value={name} onChange={e => setName(e.target.value)} maxLength={28}
            placeholder="Leave it blank and it is just The Gym"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
          <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
            You start with two kids nobody wanted and enough money for a few weeks. The fighters are yours to
            look after. Everything that happens to them is your decision.
          </p>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
            <GymRules />
            <span>One training block per fighter a week, and from week {SELL_MIN_WEEKS} you can sell up.</span>
          </div>
        </div>
        <button onClick={() => persist(newGym(name), 'hub')}
          className="min-h-[48px] w-full rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground">
          Open the doors
        </button>
      </div>
    );
  }

  const Header = (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-bold">{g.name}</h2>
          <p className="text-xs text-muted-foreground">Week {g.week} · {g.roster.length} on the books</p>
        </div>
        <div className="shrink-0 text-right">
          <p className={cn('text-sm font-bold tabular-nums', g.money < 0.05 ? 'text-destructive' : 'text-primary')}>
            {g.money.toFixed(3)}m
          </p>
          <p className="text-xs text-muted-foreground">bills {weeklyCost(g).toFixed(3)}m a week</p>
        </div>
      </div>
      <div className="mt-3">
        <Bar label="Name" value={g.reputation} max={100} tone="bg-amber-500" />
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        You take {(cutRate(g) * 100).toFixed(0)}% of every purse. A better name means a bigger cut and better
        fighters through the door.
      </p>
    </div>
  );

  if (phase === 'closed' && verdict) {
    return (
      <div className="space-y-4" ref={revealRef}>
        {Header}
        <div className="rounded-lg border bg-card p-4 text-center">
          <Trophy className={cn('mx-auto mb-2 h-7 w-7', g.exit === 'sold' ? 'text-amber-500' : 'text-muted-foreground')} />
          <p className="text-sm font-semibold">
            {g.exit === 'sold' ? `Sold for ${(g.soldFor ?? 0).toFixed(3)}m` : 'The doors closed'}
          </p>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">What the gym is remembered as</p>
          <p className="text-2xl font-bold text-primary">{verdict.tier}</p>
          <p className="mb-3 text-sm text-muted-foreground">{verdict.score} out of 100</p>
          <ul className="space-y-1 text-left text-sm text-muted-foreground">
            {verdict.bullets.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        </div>
        <ShareButtons gameName="Fight Gym" gamePath="/fight-gym"
          score={`${verdict.tier}, ${verdict.score}/100`}
          customText={g.exit === 'sold'
            ? `${g.name} put ${g.alumni.length} fighters through, sold up in week ${g.week} and went out as ${verdict.tier}.`
            : `${g.name} put ${g.alumni.length} fighters through and came out as ${verdict.tier}.`} />
        <button onClick={reset} className="min-h-[48px] w-full rounded-md border px-4 py-3 font-semibold">
          <RotateCcw className="mr-2 inline h-4 w-4" />Open a new gym
        </button>
      </div>
    );
  }

  /* ── the plan, and then the fight ── */
  if ((phase === 'plan' || phase === 'fight') && offer && activeId) {
    const f = g.roster.find(x => x.id === activeId);
    if (!f) { setPhase('hub'); return null; }
    const oppStyle = STYLES.find(s => s.id === offer.opponent.style);
    if (phase === 'plan') {
      return (
        <div className="space-y-4" ref={revealRef}>
          <button onClick={() => { setOffer(null); setPhase('hub'); }} className="flex min-h-[40px] items-center text-sm text-muted-foreground">
            <ChevronLeft className="h-4 w-4" />Back
          </button>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{f.name} fights</p>
            <p className="text-lg font-bold">{offer.opponent.name}</p>
            <p className="text-sm text-muted-foreground">{oppStyle?.label}. {oppStyle?.blurb}</p>
            {f.damage >= 55 && (
              <p className="mt-2 rounded-md border border-destructive/50 bg-destructive/10 p-2 text-[11px] text-destructive">
                He is carrying {f.damage.toFixed(0)} damage. Putting him in will be noticed, whatever happens.
              </p>
            )}
            <p className="mt-2 text-[11px] text-muted-foreground">
              Sharpness {Math.round(campQualityFor(g, f.id) * 100)}.{' '}
              {campQualityFor(g, f.id) > 0.5
                ? 'The training since his last fight gives him a bit more gas late.'
                : 'Nobody has worked with him since his last fight, so he goes in at an even 50.'}
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
                    <button key={t.id} onClick={() => setTactics(prev => prev.map((p, j) => (j === i ? t.id : p)))}
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
          <button
            onClick={() => {
              const r = takeGymFight(g, activeId, offer, tactics);
              if (!r) return;
              setResult(r.result);
              persist(r.state, 'fight');
            }}
            className="min-h-[48px] w-full rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground">
            <Swords className="mr-2 inline h-4 w-4" />Send him out
          </button>
        </div>
      );
    }
    if (!result) return null;
    const won = result.winner === 'player';
    /* Round 630: the same bars Fight Career uses, from the same function in the
       lib. They show what THIS fight took out of both men and nothing else:
       conditionTrack starts everybody at 100 and never reads f.damage. The
       permanent damage, which is what actually ends a career in this game, is
       the hub's Damage bar and the line above the bars, so the screen says
       which is which rather than letting a green bar under a nearly finished
       fighter's name read as a clean bill of health. */
    const track = conditionTrack(result);
    const end = track.length ? track[track.length - 1] : { round: 0, player: 100, opp: 100 };
    const busiest = Math.max(1, ...result.rounds.map(r => Math.max(r.playerLanded, r.oppLanded)));
    return (
      <div className="space-y-4" ref={revealRef}>
        <div className={cn('relative overflow-hidden rounded-lg border p-4 text-center', won ? 'border-emerald-500/60 bg-emerald-500/10' : 'bg-card')}>
          {won && <Confetti pieces={result.method === 'KO' || result.method === 'TKO' ? 46 : 28}
            gold={result.method === 'KO' || result.method === 'TKO'} />}
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {result.method === 'D' ? 'Drawn' : won ? `${f.name} wins` : `${f.name} loses`}
          </p>
          <p className="text-xl font-bold">
            {result.method}{result.method === 'KO' || result.method === 'TKO' ? `, round ${result.endedRound}` : ''}
          </p>
          <p className="text-sm text-muted-foreground">
            Cards {result.playerCard} to {result.oppCard} · purse {offer.purse.toFixed(3)}m, your cut {(offer.purse * cutRate(g)).toFixed(3)}m
          </p>
          <p className="mt-1 flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <HeartPulse className="h-3 w-3" />He took {result.damageTaken.toFixed(1)} damage tonight and he keeps it, so he is carrying {Math.round(f.damage)} now.
          </p>
          <p className="mt-3 text-[11px] uppercase tracking-wide text-muted-foreground">What each man had left when it ended</p>
          <div className="mt-1 flex items-start gap-3 text-left">
            <ConditionBar value={end.player} label={f.name} />
            <ConditionBar value={end.opp} label={offer.opponent.name} align="right" />
          </div>
        </div>
        <div className="space-y-1.5">
          {result.rounds.map(r => (
            <div key={r.round} className={cn('rounded-md border p-2 text-xs',
              r.knockdown === 'player' ? 'border-emerald-500/60 bg-emerald-500/10'
                : r.knockdown === 'opp' ? 'border-destructive/60 bg-destructive/10' : 'bg-card')}>
              <div className="flex justify-between font-semibold">
                <span>Round {r.round}</span><span className="tabular-nums">{r.playerScore} - {r.oppScore}</span>
              </div>
              <div className="mt-1 space-y-1" aria-hidden="true">
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-500 ease-out"
                    style={{ width: `${(r.playerLanded / busiest) * 100}%` }} />
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-muted-foreground/60 transition-[width] duration-500 ease-out"
                    style={{ width: `${(r.oppLanded / busiest) * 100}%` }} />
                </div>
              </div>
              <p className="mt-1 text-muted-foreground">
                He landed {r.playerLanded}, and took {r.oppLanded}.
              </p>
              {r.note && (
                <p className={cn(r.switched ? 'text-amber-500' : 'text-muted-foreground')}>
                  {r.switched && <Flame className="mr-1 inline h-3 w-3" />}{r.note}
                </p>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={() => {
            const next = advanceWeek(g);
            setResult(null); setOffer(null); setActiveId(null);
            persist(next, next.closed ? 'closed' : 'hub');
          }}
          className="min-h-[48px] w-full rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground">
          Next week
        </button>
      </div>
    );
  }

  /* ── the hub ── */
  return (
    <div className="space-y-4" ref={revealRef}>
      {Header}
      <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
        <span>Training limits and selling up</span>
        <GymRules />
      </div>

      <div>
        <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Your fighters</p>
        {g.roster.length === 0 && (
          <p className="rounded-md border bg-card p-3 text-sm text-muted-foreground">
            Nobody on the books. Sign somebody before the bills catch you.
          </p>
        )}
        <div className="space-y-2">
          {g.roster.map(f => {
            const ea = effectiveAttrs(f);
            return (
              <div key={f.id} className="rounded-lg border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{f.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {weightById(guessWeight(f)).label} · {STYLES.find(s => s.id === f.style)?.label} · age {Math.floor(f.age)} · {f.wins}-{f.losses}
                    </p>
                  </div>
                  <span className={cn('shrink-0 text-xs font-bold',
                    f.rank === 0 ? 'text-amber-500' : 'text-muted-foreground')}>
                    {f.rank === 0 ? 'CHAMPION' : f.rank >= 99 ? 'Unranked' : `#${f.rank}`}
                  </span>
                </div>
                <div className="mt-2 space-y-1">
                  <Bar label="Rating" value={ratingOf(f)} />
                  <Bar label="Damage" value={f.damage} max={82} tone="bg-destructive" />
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    onClick={() => { setActiveId(f.id); setOffers(offersForFighter(g, f.id)); }}
                    className="min-h-[36px] flex-1 rounded-md border px-3 py-1.5 text-xs font-medium hover:border-primary">
                    <Swords className="mr-1 inline h-3 w-3" />Find him a fight
                  </button>
                  <button
                    disabled={g.money < TRAIN_COST || trainedThisWeek(g, f.id)}
                    onClick={() => { setTrainingId(trainingId === f.id ? null : f.id); setConfirm(null); }}
                    className="min-h-[36px] rounded-md border px-3 py-1.5 text-xs disabled:opacity-40">
                    <Dumbbell className="mr-1 inline h-3 w-3" />
                    {trainedThisWeek(g, f.id) ? 'Trained this week' : `Train ${TRAIN_COST.toFixed(3)}m`}
                  </button>
                  <button
                    onClick={() => { setConfirm(confirm === f.id ? null : f.id); setTrainingId(null); }}
                    className="min-h-[36px] rounded-md border px-3 py-1.5 text-xs text-muted-foreground">
                    Let go
                  </button>
                </div>
                {trainingId === f.id && !trainedThisWeek(g, f.id) && (
                  <div className="mt-2 border-t pt-2">
                    <p className="mb-1 text-[11px] text-muted-foreground">One block this week. What does he work on?</p>
                    <div className="grid grid-cols-2 gap-2">
                      {TRAIN_FOCI.map(fo => (
                        <button key={fo}
                          onClick={() => { const t = trainFighter(g, f.id, fo); setTrainingId(null); if (t) persist(t, 'hub'); }}
                          className="min-h-[40px] rounded-md border px-2 py-1.5 text-xs font-medium hover:border-primary">
                          {FOCUS_LABEL[fo]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {confirm === f.id && (
                  <div className="mt-2 border-t pt-2">
                    <p className="mb-1 text-[11px] text-muted-foreground">
                      Let {f.name} go for good?{f.damage >= 50 ? ' Sending him out this hurt will cost the gym some of its name.' : ''}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { const r = releaseFighter(g, f.id); setConfirm(null); if (r) persist(r, 'hub'); }}
                        className="min-h-[40px] flex-1 rounded-md border border-destructive/60 px-3 py-1.5 text-xs font-medium text-destructive">
                        Yes, let him go
                      </button>
                      <button onClick={() => setConfirm(null)}
                        className="min-h-[40px] flex-1 rounded-md border px-3 py-1.5 text-xs">
                        Keep him
                      </button>
                    </div>
                  </div>
                )}
                {activeId === f.id && offers.length > 0 && (
                  <div className="mt-2 space-y-1.5 border-t pt-2">
                    {offers.map(o => (
                      <button key={o.id}
                        onClick={() => { setOffer(o); setPhase('plan'); setConfirm(null); setTrainingId(null); }}
                        className="w-full rounded-md border p-2 text-left text-xs hover:border-primary">
                        <span className="flex justify-between font-semibold">
                          <span>{o.label}</span><span className="text-primary">{o.purse.toFixed(3)}m</span>
                        </span>
                        <span className="block text-[11px] text-muted-foreground">
                          {o.opponent.name} · {STYLES.find(s => s.id === o.opponent.style)?.label} · {o.rounds} rounds
                          {o.title ? ' · for the world title' : ''}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Through the door this week</p>
        <div className="space-y-2">
          {g.prospects.map(p => (
            <div key={p.id} className="rounded-lg border bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{p.fighter.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {weightById(guessWeight(p.fighter)).label} · {STYLES.find(s => s.id === p.fighter.style)?.label} · age {Math.floor(p.fighter.age)}
                  </p>
                  <p className="text-[11px] italic text-muted-foreground">{p.word}</p>
                </div>
                <button
                  disabled={p.fee > g.money || g.roster.length >= 6}
                  onClick={() => { const s = signProspect(g, p.id); if (s) persist(s, 'hub'); }}
                  className="min-h-[36px] shrink-0 rounded-md border px-3 py-1.5 text-xs font-medium disabled:opacity-40">
                  <UserPlus className="mr-1 inline h-3 w-3" />{p.fee.toFixed(3)}m
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => {
          const n = advanceWeek(g);
          setActiveId(null); setOffers([]); setTrainingId(null); setConfirm(null);
          persist(n, n.closed ? 'closed' : 'hub');
        }}
        className="min-h-[48px] w-full rounded-md border px-4 py-3 font-semibold">
        Nothing this week, pay the bills
      </button>

      <div className="rounded-lg border bg-card p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Sell the gym</p>
            <p className="text-[11px] text-muted-foreground">
              {canSellGym(g)
                ? `A buyer will pay ${salePrice(g).toFixed(3)}m today. Selling ends it here and shows the verdict.`
                : `Nobody buys a gym this new. Offers start in week ${SELL_MIN_WEEKS}.`}
            </p>
          </div>
          <button
            disabled={!canSellGym(g)}
            onClick={() => { setConfirm(confirm === 'sell' ? null : 'sell'); setTrainingId(null); }}
            className="min-h-[36px] shrink-0 rounded-md border px-3 py-1.5 text-xs font-medium disabled:opacity-40">
            Sell
          </button>
        </div>
        {confirm === 'sell' && canSellGym(g) && (
          <div className="mt-2 flex gap-2 border-t pt-2">
            <button
              onClick={() => {
                const s = sellGym(g);
                setConfirm(null); setActiveId(null); setOffers([]);
                if (s) persist(s, 'closed');
              }}
              className="min-h-[40px] flex-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
              Yes, sell for {salePrice(g).toFixed(3)}m
            </button>
            <button onClick={() => setConfirm(null)}
              className="min-h-[40px] flex-1 rounded-md border px-3 py-1.5 text-xs">
              Not yet
            </button>
          </div>
        )}
      </div>

      {g.log.length > 0 && (
        <div className="rounded-lg border bg-card p-3">
          <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">The book</p>
          <div className="max-h-40 space-y-1 overflow-y-auto text-[11px] text-muted-foreground">
            {g.log.slice(0, 20).map((l, i) => <p key={i}>{l}</p>)}
          </div>
        </div>
      )}

      {confirm === 'reset' ? (
        <div className="rounded-lg border border-destructive/50 p-3">
          <p className="mb-2 text-xs text-muted-foreground">
            Walk away and start a new gym? This one is gone for good, with no verdict.
          </p>
          <div className="flex gap-2">
            <button onClick={reset}
              className="min-h-[44px] flex-1 rounded-md border border-destructive/60 px-3 py-2 text-sm text-destructive">
              Yes, start again
            </button>
            <button onClick={() => setConfirm(null)}
              className="min-h-[44px] flex-1 rounded-md border px-3 py-2 text-sm">
              Keep this gym
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => { setConfirm('reset'); setTrainingId(null); }}
          className="min-h-[44px] w-full rounded-md border px-4 py-2 text-sm text-muted-foreground">
          Close the gym and start again
        </button>
      )}
    </div>
  );
}
