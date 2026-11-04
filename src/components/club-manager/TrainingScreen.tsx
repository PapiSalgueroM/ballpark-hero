import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Dumbbell, GraduationCap } from 'lucide-react';
import {
  developmentRate, developingPlayers, recordedTraining, recoveryWeekOf,
  retrainWeeks, retrainRefusal, heldPositions, MAX_SECONDARY_POSITIONS, RETRAIN_MIN_WEEKS, FORMATIONS, fitPenalty,
} from '@/lib/clubManager';
import type {
  CareerState, CMPlayer, TrainingFocus, TrainingIntensity, TrainingPlan,
} from '@/lib/clubManager';
import { ALL_POSITIONS } from '@/lib/positionFit';
import type { Position } from '@/types/game';
import { useRevealScroll } from '@/hooks/useRevealScroll';
import { SecondPositionChips } from '@/components/club-manager/SquadScreen';

interface TrainingScreenProps {
  career: CareerState;
  onSetPlan: (plan: TrainingPlan) => void;
  /** Round 505: put a man to work on a second position, and call it off. */
  onRetrain: (playerId: string, to: Position, paused?: boolean) => void;
  onStopRetrain: (playerId: string) => void;
}

const INTENSITY_INFO: Record<TrainingIntensity, { label: string; desc: string; emoji: string }> = {
  light: { label: 'Light', desc: 'Fresh legs on match day, with slower development.', emoji: '\u{1F6CC}' },
  normal: { label: 'Normal', desc: 'The safe middle. Steady development, normal fatigue.', emoji: '\u{2699}\uFE0F' },
  double: { label: 'Double', desc: 'They improve fastest and they pay for it in tired legs and knocks.', emoji: '\u{1F525}' },
};

const FOCUS_INFO: Record<TrainingFocus, { label: string; desc: string; emoji: string }> = {
  firstTeam: { label: 'First team', desc: 'Sessions built around the senior XI. The kids get left behind.', emoji: '\u{1F454}' },
  balanced: { label: 'Balanced', desc: 'Everyone gets the same session. Nothing is wasted, nothing is special.', emoji: '\u{2696}\uFE0F' },
  youth: { label: 'Youth', desc: 'The whole week is about the teenagers. Your senior players stagnate.', emoji: '\u{1F476}' },
};

const INTENSITIES: TrainingIntensity[] = ['light', 'normal', 'double'];
const FOCUSES: TrainingFocus[] = ['firstTeam', 'balanced', 'youth'];

const lastName = (n: string) => n.replace(' (Youth)', '').split(' ').slice(-1)[0];

/** Turns the growth multiplier into words, because a number means nothing. */
function rateLabel(rate: number): { text: string; cls: string } {
  if (rate >= 1.7) return { text: 'Flying', cls: 'text-primary' };
  if (rate >= 1.15) return { text: 'Improving fast', cls: 'text-emerald-400' };
  if (rate >= 0.75) return { text: 'Ticking along', cls: 'text-yellow-400' };
  return { text: 'Going nowhere', cls: 'text-muted-foreground' };
}

function PlayerRow({ p, career }: { p: CMPlayer; career: CareerState }) {
  const rate = developmentRate(p, career);
  const recorded = recordedTraining(p, career);
  const lab = rateLabel(rate);
  const head = (p.potential ?? p.rating) - p.rating;
  const apps = p.apps ?? 0;
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-border/30 last:border-0">
      <span className="w-9 shrink-0 text-[10px] font-bold text-muted-foreground bg-secondary rounded px-1 py-0.5 text-center">{p.position}</span>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-foreground truncate flex items-center gap-1">
          <span className="truncate">{p.name} <span className="text-muted-foreground">({p.age})</span></span>
          <SecondPositionChips p={p} />
          {p.academyGrad && <span className="ml-1 text-[8px] font-bold text-primary border border-primary/50 rounded px-1">ACADEMY</span>}
        </div>
        <div className="text-[9px] text-muted-foreground">
          {p.rating} now · {head >= 12 ? 'lots of room left' : head >= 6 ? 'plenty of room left' : 'a little room left'} · {apps} app{apps === 1 ? '' : 's'} this season
        </div>
        <div className="text-[10px] text-muted-foreground" data-cm-training-record={p.id}>
          {recorded.weeks ? `${recorded.weeks} recorded week${recorded.weeks === 1 ? '' : 's'} · summer mix ${recorded.rate.toFixed(2)}x` : 'No recorded weeks. Current plan used.'}
        </div>
      </div>
      <span className={cn('shrink-0 text-[9px] font-bold', lab.cls)}>{lab.text}</span>
    </div>
  );
}

/**
 * Round 505: a second position, learned over weeks. The owner asked for
 * "position retraining over weeks" beside the freedom to play anyone
 * anywhere, and this is the honest half of that: a man who learns the spot
 * stops paying the out of position price in it. The estimate is the engine's
 * own (retrainWeeks), so what the chip promises is what the tick delivers.
 * A refusal is printed, never swallowed.
 */
function RetrainCard({ career, onRetrain, onStopRetrain }: { career: CareerState; onRetrain: (id: string, to: Position, paused?: boolean) => void; onStopRetrain: (id: string) => void }) {
  const [pickId, setPickId] = useState('');
  const pickRef = useRef<HTMLSelectElement>(null);
  const [refusal, setRefusal] = useState<string | null>(null);
  const targetsRef = useRevealScroll<HTMLDivElement>(`retrain:${pickId}`, { enabled: !!pickId, skipFirst: false });

  const learning = career.squad.filter(p => p.retraining);
  const pool = [...career.squad]
    .filter(p => p.position !== 'GK' && !p.retraining)
    .sort((a, b) => b.rating - a.rating);
  const picked = pool.find(p => p.id === pickId) ?? null;
  const targets: Position[] = picked
    ? ALL_POSITIONS.filter(pos => pos !== 'GK' && !heldPositions(picked).includes(pos))
    : [];
  const formation = FORMATIONS[career.formationIndex] ?? FORMATIONS[0];

  const start = (to: Position) => {
    if (!picked) return;
    const why = retrainRefusal(picked, to);
    if (why) { setRefusal(why); return; }
    onRetrain(picked.id, to);
    setPickId('');
    setRefusal(null);
    pickRef.current?.focus({ preventScroll: true });
  };

  return (
    <div className="bg-card border border-border rounded-xl p-3" data-cm-retrain-card="1">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
        <GraduationCap className="w-3 h-3" /> A second position
      </div>

      {learning.length === 0 && (
        <p className="text-[10px] text-muted-foreground">Nobody is learning one right now.</p>
      )}
      {learning.map(p => {
        const r = p.retraining!;
        const pct = Math.round((100 * (r.weeksTotal - r.weeksLeft)) / Math.max(1, r.weeksTotal));
        return (
          <div key={p.id} className="py-1.5 border-b border-border/30 last:border-0" data-cm-retraining={p.id} data-cm-retraining-to={r.to}>
            <div className="flex items-center gap-2">
              <span className="w-9 shrink-0 text-[10px] font-bold text-muted-foreground bg-secondary rounded px-1 py-0.5 text-center">{p.position}</span>
              <span className="flex-1 min-w-0 text-xs text-foreground truncate">
                {p.name} <span className="text-muted-foreground">learning {r.to}</span>
              </span>
              <span className="text-[9px] text-muted-foreground shrink-0 tabular-nums" data-cm-retrain-left={r.weeksLeft}>
                {r.weeksLeft} week{r.weeksLeft === 1 ? '' : 's'} left
              </span>
              <button
                type="button"
                data-cm-retrain-stop={p.id}
                onClick={() => onStopRetrain(p.id)}
                className="text-[9px] font-bold text-red-400 border border-red-400/50 rounded px-1.5 py-0.5 hover:bg-red-500/10"
              >
                Stop
              </button>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-secondary overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(3, pct)}%` }} />
            </div>
            {Object.prototype.hasOwnProperty.call(r, 'paused') && typeof r.paused !== 'boolean' ? (
              <p className="mt-1 text-[10px] text-amber-400">This course has an unknown pause setting. Progress is held; Pause and Resume are unavailable. Stop still cancels the whole course.</p>
            ) : (
              <button type="button" aria-label={`${r.paused === true ? 'Resume' : 'Pause'} retraining for ${p.name}`}
                onClick={() => onRetrain(p.id, r.to, r.paused !== true)}
                className="mt-1 min-h-11 rounded-lg border border-border px-3 text-[11px] font-bold text-foreground hover:border-primary/60">
                {r.paused === true ? 'Resume retraining' : 'Pause retraining'}
              </button>
            )}
            {r.paused === true && <p className="mt-1 text-[10px] text-primary">Paused: {r.weeksLeft} paid week{r.weeksLeft === 1 ? '' : 's'} still to go.</p>}
          </div>
        );
      })}

      <div className="mt-2 flex items-center gap-1.5">
        <span className="text-[9px] text-muted-foreground uppercase tracking-wider w-14 shrink-0">Retrain</span>
        <select
          ref={pickRef}
          data-cm-retrain-pick="1"
          value={pickId}
          onChange={e => { setPickId(e.target.value); setRefusal(null); }}
          className="flex-1 min-w-0 bg-secondary border border-border rounded px-1.5 py-1.5 text-[11px] text-foreground"
          aria-label="Player to retrain"
        >
          <option value="">Pick a man</option>
          {pool.map(p => (
            <option key={p.id} value={p.id}>{p.position} {p.name} ({p.rating})</option>
          ))}
        </select>
      </div>

      {picked && (
        <div ref={targetsRef} className="mt-2" data-cm-retrain-targets={picked.id}>
          <p className="text-[9px] text-muted-foreground mb-1">
            {lastName(picked.name)} plays {heldPositions(picked).join(', ')}. Pick what he learns next{picked.age > 30 ? ', and he is past thirty, so it takes half as long again' : ''}:
          </p>
          <p className="text-[10px] text-muted-foreground mb-1">
            Fit points remove his out-of-position cost in {formation.name}; a minus adds a cost. His OVR and your XI stay as they are.
          </p>
          <div className="flex flex-wrap gap-1">
            {targets.map(to => {
              const secondaryPositions = [...(picked.secondaryPositions ?? []).filter(pos => pos !== to && pos !== picked.position), to].slice(-MAX_SECONDARY_POSITIONS);
              const trained = { ...picked, secondaryPositions };
              const replaced = (picked.secondaryPositions ?? []).filter(pos => !secondaryPositions.includes(pos));
              const changes = formation.slots.flatMap((slot, index) => {
                const before = fitPenalty(picked, slot), after = fitPenalty(trained, slot);
                return before === after ? [] : [{ label: slot.label, index, before, after }];
              });
              return (
                <button
                  key={to}
                  type="button"
                  data-cm-retrain-to={to}
                  onClick={() => start(to)}
                  className="rounded-lg border border-border px-2 py-1 text-left hover:border-primary/60 transition-colors"
                >
                  <span className="block text-[10px] font-bold text-foreground">{to}</span>
                  <span className="block text-[8px] text-muted-foreground">about {retrainWeeks(career, picked, to)} weeks</span>
                  <span className="block max-w-40 text-[10px] text-muted-foreground" data-cm-retrain-fit={to}>
                    {changes.length === 0 ? 'No fit change in this formation' : changes.map((change, i) => (
                      <span key={change.index} data-cm-fit-slot={change.index} data-cm-fit-before={change.before} data-cm-fit-after={change.after}>
                        {i > 0 ? ' · ' : ''}{change.label}: {change.before > change.after ? '+' : ''}{change.before - change.after} fit
                      </span>
                    ))}
                  </span>
                  {replaced.length > 0 && <span className="block text-[10px] text-amber-400">Replaces {replaced.join(', ')}</span>}
                </button>
              );
            })}
          </div>
          {refusal && <p className="text-[10px] text-red-400 mt-1" data-cm-retrain-refusal="1">{refusal}</p>}
        </div>
      )}

      <p className="text-[9px] text-muted-foreground mt-1.5">
        A position next to one he holds is the quickest, another on the same line takes longer, and crossing lines takes longest; past thirty it is half as long again, a better training ground shortens all of it, and nothing goes under {RETRAIN_MIN_WEEKS} weeks. One man learns one position at a time, keeps {MAX_SECONDARY_POSITIONS} at most, and keepers stay keepers. Every second position in this squad was earned here: the real data gives each man one. Pause keeps the remaining weeks and his current positions; Resume continues from there. Completion can replace the oldest second position, while Stop discards the course. Pausing does not rest him from matches or change normal training. For example, pause a near-complete ST course to keep learned RW cover until you are ready to finish it.
      </p>
    </div>
  );
}

/**
 * Round 116: the training ground. Two switches, and between them they decide
 * how fast everybody in the building gets better, what shape they turn up in
 * on Saturday, and how often somebody pulls up in a session.
 * Round 505: and the third card, a second position learned over weeks.
 */
export function TrainingScreen({ career, onSetPlan, onRetrain, onStopRetrain }: TrainingScreenProps) {
  const [recoveryId, setRecoveryId] = useState('');
  const plan: TrainingPlan = career.training ?? { intensity: 'normal' as TrainingIntensity, focus: 'balanced' as TrainingFocus };
  const growing = developingPlayers(career).slice(0, 10);
  const recovery = recoveryWeekOf(plan.recoveryWeek);
  const recoveryBlocked = plan.recoveryWeek !== undefined && !recovery;
  const pickedRecovery = career.squad.find(p => p.id === recoveryId);
  const pendingRecovery = recovery && recovery.club === career.clubName && recovery.season === career.season
    ? career.squad.find(p => p.id === recovery.playerId) : null;

  return (
    <div className="space-y-2" style={{ overflowAnchor: 'none' }}>
      <div className="bg-card border border-border rounded-xl p-3">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
          <Dumbbell className="w-3 h-3" /> How hard you work them
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {INTENSITIES.map(i => (
            <button
              key={i}
              onClick={() => onSetPlan({ ...plan, intensity: i })}
              className={cn(
                'rounded-lg border px-2 py-2 text-center transition-colors',
                plan.intensity === i ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40',
              )}
            >
              <div className="text-base leading-none">{INTENSITY_INFO[i].emoji}</div>
              <div className={cn('text-xs font-bold mt-1', plan.intensity === i ? 'text-primary' : 'text-foreground')}>
                {INTENSITY_INFO[i].label}
              </div>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">{INTENSITY_INFO[plan.intensity].desc}</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-3">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Who the week is built around</div>
        <div className="grid grid-cols-3 gap-1.5">
          {FOCUSES.map(f => (
            <button
              key={f}
              onClick={() => onSetPlan({ ...plan, focus: f })}
              className={cn(
                'rounded-lg border px-2 py-2 text-center transition-colors',
                plan.focus === f ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40',
              )}
            >
              <div className="text-base leading-none">{FOCUS_INFO[f].emoji}</div>
              <div className={cn('text-[10px] font-bold mt-1', plan.focus === f ? 'text-primary' : 'text-foreground')}>
                {FOCUS_INFO[f].label}
              </div>
            </button>
          ))}
        </div>
        <p className="text-[9px] text-muted-foreground mt-1.5">{FOCUS_INFO[plan.focus].desc}</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-3">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">One player's recovery week</div>
        <p className="text-[10px] text-muted-foreground mb-2">
          Give one player Light training for the next paid week. Everyone else keeps your plan. Light training trades some summer growth for fresher legs, your picked XI stays unchanged, and injuries still count down normally. Midweek nights do not use this order.
        </p>
        {recoveryBlocked ? (
          <p className="text-[10px] text-amber-400">This recovery order uses a different format. It is kept unchanged; recovery edits are unavailable.</p>
        ) : (
          <>
            {recovery && <p className="text-[11px] text-primary mb-2">
              {pendingRecovery ? <>{pendingRecovery.name}: Light next paid week, then {INTENSITY_INFO[plan.intensity].label} again. {FOCUS_INFO[plan.focus].label} stays on.</>
                : <>This old recovery order is inactive. It clears at the next paid week, or you can replace or cancel it now.</>}
            </p>}
            <label className="block text-[10px] text-muted-foreground mb-1" htmlFor="cm-recovery-player">Player for recovery</label>
            <select id="cm-recovery-player" aria-label="Player for recovery" value={recoveryId}
              onChange={e => setRecoveryId(e.target.value)}
              className="w-full min-h-[44px] bg-secondary border border-border rounded px-2 text-[11px] text-foreground">
              <option value="">Pick a player</option>
              {career.squad.map(p => <option key={p.id} value={p.id}>{p.position} {p.name} ({p.fitness}% fitness)</option>)}
            </select>
            <div className="flex flex-wrap gap-2 mt-2">
              <button type="button" disabled={!pickedRecovery}
                onClick={() => { if (pickedRecovery) onSetPlan({ ...plan, recoveryWeek: {
                  v: 1, club: career.clubName, season: career.season, playerId: pickedRecovery.id,
                } }); }}
                className="min-h-[44px] rounded-lg border border-primary px-3 text-[11px] font-bold text-primary disabled:opacity-40">
                Queue recovery week
              </button>
              {recovery && <button type="button" onClick={() => {
                const { recoveryWeek: _cancelled, ...standing } = plan; onSetPlan(standing);
              }} className="min-h-[44px] rounded-lg border border-border px-3 text-[11px] text-muted-foreground">
                Cancel recovery week
              </button>}
            </div>
          </>
        )}
        <p className="text-[9px] text-muted-foreground mt-2">For example, keep Double for the squad while one player takes one Light paid week. This does not rest him from matches or cure an injury.</p>
      </div>

      <RetrainCard career={career} onRetrain={onRetrain} onStopRetrain={onStopRetrain} />

      <div className="bg-card border border-border rounded-xl p-3">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Who is actually getting better</div>
        {growing.length === 0 && (
          <p className="text-[10px] text-muted-foreground">
            Nobody in this squad has room left to grow. Sign someone young or bring a kid up from the academy.
          </p>
        )}
        <p className="text-[10px] text-muted-foreground mb-1.5">
          Summer growth uses each player's recorded mix. Earlier weeks are not reconstructed. With no record, the current plan is used. The status at right previews the current plan, not a promised OVR gain.
        </p>
        {growing.map(p => <PlayerRow key={p.id} p={p} career={career} />)}
        {growing.length > 0 && (
          <p className="text-[9px] text-muted-foreground mt-1.5">
            Game time is the biggest lever on this list. A teenager who never gets on the pitch improves at about a third of the rate of one who plays every week.
          </p>
        )}
      </div>
    </div>
  );
}
