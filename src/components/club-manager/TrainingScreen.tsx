import { cn } from '@/lib/utils';
import { Dumbbell } from 'lucide-react';
import { INTENSITY_INFO, FOCUS_INFO, developmentRate, developingPlayers } from '@/lib/clubManager';
import type {
  CareerState, CMPlayer, TrainingFocus, TrainingIntensity, TrainingPlan,
} from '@/lib/clubManager';

interface TrainingScreenProps {
  career: CareerState;
  onSetPlan: (plan: TrainingPlan) => void;
}

const INTENSITIES: TrainingIntensity[] = ['light', 'normal', 'double'];
const FOCUSES: TrainingFocus[] = ['firstTeam', 'balanced', 'youth'];

/** Turns the growth multiplier into words, because a number means nothing. */
function rateLabel(rate: number): { text: string; cls: string } {
  if (rate >= 1.7) return { text: 'Flying', cls: 'text-primary' };
  if (rate >= 1.15) return { text: 'Improving fast', cls: 'text-emerald-400' };
  if (rate >= 0.75) return { text: 'Ticking along', cls: 'text-yellow-400' };
  return { text: 'Going nowhere', cls: 'text-muted-foreground' };
}

function PlayerRow({ p, career }: { p: CMPlayer; career: CareerState }) {
  const rate = developmentRate(p, career);
  const lab = rateLabel(rate);
  const head = (p.potential ?? p.rating) - p.rating;
  const apps = p.apps ?? 0;
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-border/30 last:border-0">
      <span className="w-9 shrink-0 text-[10px] font-bold text-muted-foreground bg-secondary rounded px-1 py-0.5 text-center">{p.position}</span>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-foreground truncate">
          {p.name} <span className="text-muted-foreground">({p.age})</span>
          {p.academyGrad && <span className="ml-1 text-[8px] font-bold text-primary border border-primary/50 rounded px-1">ACADEMY</span>}
        </div>
        <div className="text-[9px] text-muted-foreground">
          {p.rating} now · {head >= 12 ? 'lots of room left' : head >= 6 ? 'plenty of room left' : 'a little room left'} · {apps} app{apps === 1 ? '' : 's'} this season
        </div>
      </div>
      <span className={cn('shrink-0 text-[9px] font-bold', lab.cls)}>{lab.text}</span>
    </div>
  );
}

/**
 * Round 116: the training ground. Two switches, and between them they decide
 * how fast everybody in the building gets better, what shape they turn up in
 * on Saturday, and how often somebody pulls up in a session.
 */
export function TrainingScreen({ career, onSetPlan }: TrainingScreenProps) {
  const plan = career.training ?? { intensity: 'normal' as TrainingIntensity, focus: 'balanced' as TrainingFocus };
  const growing = developingPlayers(career).slice(0, 10);

  return (
    <div className="space-y-2">
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
              <div className={cn('text-[10px] font-bold mt-1', plan.intensity === i ? 'text-primary' : 'text-foreground')}>
                {INTENSITY_INFO[i].label}
              </div>
            </button>
          ))}
        </div>
        <p className="text-[9px] text-muted-foreground mt-1.5">{INTENSITY_INFO[plan.intensity].desc}</p>
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
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Who is actually getting better</div>
        {growing.length === 0 && (
          <p className="text-[10px] text-muted-foreground">
            Nobody in this squad has room left to grow. Sign someone young or bring a kid up from the academy.
          </p>
        )}
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
