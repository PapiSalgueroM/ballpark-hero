import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ALL_FAMILIES, BingoDifficulty, BingoFamily, BingoGoal, BingoSeatSetup, BingoTableSetup, CARD_SIZE, CPU_LEVELS,
  CpuLevel, DIFFICULTIES, FAMILIES, GOALS, MAX_SEATS, MIN_SEATS, allowedConditions, defaultSeats,
} from '@/lib/sportsBingo';

/**
 * Round 727: who is at the table and what the cards may hold. Two to four
 * seats, each a named person or a CPU temper, the condition families the
 * cards draw from, the pace, and what wins. One screen with a back button,
 * the way the owner's tile rule wants it, and the fallback note is on it
 * before anybody starts: a pick that cannot fill 24 squares says so here.
 */
interface PassDeviceSetupProps {
  onBack: () => void;
  onStart: (setup: BingoTableSetup) => void;
}

const chip = (on: boolean) => cn(
  'rounded-full border px-3 py-1.5 text-xs font-bold transition-colors',
  on ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:border-primary/40',
);

export function PassDeviceSetup({ onBack, onStart }: PassDeviceSetupProps) {
  const [seats, setSeats] = useState<BingoSeatSetup[]>(() => defaultSeats(2));
  const [families, setFamilies] = useState<BingoFamily[]>(ALL_FAMILIES);
  const [difficulty, setDifficulty] = useState<BingoDifficulty>('standard');
  const [goal, setGoal] = useState<BingoGoal>('line');

  const allowed = allowedConditions(families).length;
  const short = Math.max(0, CARD_SIZE - 1 - allowed);
  const humans = seats.filter(s => s.kind === 'human').length;

  const setCount = (n: number) => {
    setSeats(cur => (n <= cur.length ? cur.slice(0, n) : [...cur, ...defaultSeats(MAX_SEATS).slice(cur.length, n)]));
  };
  const patchSeat = (i: number, patch: Partial<BingoSeatSetup>) => {
    setSeats(cur => cur.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  };
  const toggleFamily = (f: BingoFamily) => {
    setFamilies(cur => (cur.includes(f) ? cur.filter(x => x !== f) : ALL_FAMILIES.filter(x => x === f || cur.includes(x))));
  };

  return (
    <div className="space-y-4 max-w-sm mx-auto">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to modes
      </button>

      <div className="rounded-xl border border-border bg-surface-1 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Who's playing, up to four on one phone</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {Array.from({ length: MAX_SEATS - MIN_SEATS + 1 }, (_, k) => MIN_SEATS + k).map(n => (
            <button key={n} onClick={() => setCount(n)} className={chip(seats.length === n)}>{n} seats</button>
          ))}
        </div>
        <div className="mt-3 space-y-2">
          {seats.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <button
                onClick={() => patchSeat(i, s.kind === 'cpu'
                  ? { kind: 'human', name: `Player ${i + 1}` }
                  : { kind: 'cpu', name: `${CPU_LEVELS.find(l => l.id === s.level)?.label ?? 'Casual'} CPU` })}
                aria-label={`Seat ${i + 1}, ${s.kind === 'cpu' ? 'CPU' : 'a person'}, tap to switch`}
                className={chip(s.kind === 'cpu')}
              >
                {s.kind === 'cpu' ? 'CPU' : 'Person'}
              </button>
              {s.kind === 'human' ? (
                <input
                  value={s.name}
                  maxLength={14}
                  onChange={e => patchSeat(i, { name: e.target.value })}
                  aria-label={`Seat ${i + 1} name`}
                  className="flex-1 min-w-0 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground"
                />
              ) : (
                <div className="flex-1 grid grid-cols-3 gap-1">
                  {CPU_LEVELS.map(l => (
                    <button
                      key={l.id}
                      onClick={() => patchSeat(i, { level: l.id as CpuLevel, name: `${l.label} CPU` })}
                      className={cn('rounded-lg border px-1 py-1.5 text-[11px] font-bold', s.level === l.id ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground')}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Everyone gets their own card and hears the same ten packs. You take turns on each pack, passing the phone between turns.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-surface-1 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">What the squares can be</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {FAMILIES.map(f => (
            <button key={f.id} onClick={() => toggleFamily(f.id)} className={chip(families.includes(f.id))} title={f.blurb}>
              {f.label}
            </button>
          ))}
        </div>
        <p className={cn('mt-2 text-[11px]', short > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground')}>
          {families.length === 0
            ? `Nothing picked, so the cards use the whole bank of ${allowedConditions(ALL_FAMILIES).length} conditions.`
            : short > 0
              ? `Your pick fills ${allowed} of ${CARD_SIZE - 1} squares, so ${short} on every card come from the families you dropped.`
              : `${allowed} conditions fit your pick, enough to fill every card.`}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-surface-1 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Difficulty</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {DIFFICULTIES.map(d => (
            <button key={d.id} onClick={() => setDifficulty(d.id)} className={cn('rounded-lg border px-2 py-2 text-center', difficulty === d.id ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40')}>
              <span className="block text-sm font-bold text-foreground">{d.label}</span>
              <span className="block text-[10px] text-muted-foreground">{d.seconds}s a pack</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface-1 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">What wins</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {GOALS.map(g => (
            <button key={g.id} onClick={() => setGoal(g.id)} className={cn('rounded-lg border px-2 py-2 text-left', goal === g.id ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40')}>
              <span className="block text-sm font-bold text-foreground">{g.label}</span>
              <span className="block text-[10px] text-muted-foreground">{g.blurb}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Level on the goal, whoever got there having turned up fewer players wins, then more squares, otherwise it's shared.
        </p>
      </div>

      <button
        onClick={() => onStart({ seats, families: families.length === 0 ? ALL_FAMILIES : families, difficulty, goal })}
        disabled={humans === 0}
        className="w-full rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-40"
      >
        {humans === 0 ? 'Somebody has to hold the phone' : 'Deal the cards'}
      </button>
    </div>
  );
}

export default PassDeviceSetup;
