import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { CareerState } from '@/lib/clubManager';
import { boardMeter, fanMeter } from '@/lib/clubManagerMeters';
import type { Meter, MeterTone } from '@/lib/clubManagerMeters';

const BAR_TONE: Record<MeterTone, string> = { good: 'bg-emerald-500', mid: 'bg-yellow-500', bad: 'bg-red-500' };
const TEXT_TONE: Record<MeterTone, string> = { good: 'text-emerald-400', mid: 'text-yellow-400', bad: 'text-red-400' };

/**
 * Round 465: the two meters in the header, on every tab. His words: "Two
 * meters, always visible: board patience (how close to fired) and fan
 * mood." Words by default, the number on tap, one tap flips both. The
 * board meter is the sacking rule itself and the fan meter is derived from
 * results, the table, the ticket policy and the season's trophies; both
 * live in src/lib/clubManagerMeters.ts and nothing here computes anything.
 */
export function MetersStrip({ career }: { career: CareerState }) {
  const [numbers, setNumbers] = useState(false);
  const toggle = () => setNumbers(v => !v);
  return (
    <div className="max-w-sm mx-auto mt-2 grid grid-cols-2 gap-2" data-cm-meters={numbers ? 'numbers' : 'words'}>
      <MeterBar name="Board" meter={boardMeter(career)} numbers={numbers} onToggle={toggle} />
      <MeterBar name="Fans" meter={fanMeter(career)} numbers={numbers} onToggle={toggle} />
    </div>
  );
}

function MeterBar({ name, meter, numbers, onToggle }: { name: string; meter: Meter; numbers: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={numbers}
      aria-label={`${name}: ${meter.shown} out of 100, ${meter.band}. Tap to swap the words and the number.`}
      className="block w-full text-left rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
      data-cm-meter={name.toLowerCase()}
      data-cm-value={meter.shown}
    >
      <div className="flex items-center justify-between gap-1 text-[9px] text-muted-foreground mb-0.5 whitespace-nowrap">
        <span>{name}</span>
        <span className={cn('font-semibold', TEXT_TONE[meter.tone])}>
          {numbers ? `${meter.shown}/100` : meter.band}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', BAR_TONE[meter.tone])} style={{ width: `${Math.max(3, meter.value)}%` }} />
      </div>
    </button>
  );
}

export default MetersStrip;
