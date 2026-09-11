/**
 * Round 529: the week slider the web map has.
 *
 * One stop per map the run has kept: Start, then every settled round, so
 * index i shows run.history[i]. The board owns what scrubbing means (it
 * hands the scrubbed map to the stage while the thumb is held and returns to
 * the live map on release); this is only the control. The thumb is 30px so
 * it clears the sweep's tap floor on a phone.
 */

export interface ConquestTimelineProps {
  labels: string[];
  index: number;
  onChange: (index: number) => void;
  disabled?: boolean;
}

/** A range input (data-timeline, 30px thumb) from labels[0] "Start" to the last settled round; index i shows run.history[i]. */
export default function ConquestTimeline({ labels, index, onChange, disabled = false }: ConquestTimelineProps) {
  const last = Math.max(0, labels.length - 1);
  const at = Math.min(Math.max(0, index), last);
  return (
    <div data-timeline-wrap className="rounded-2xl border border-border bg-card px-3 py-2">
      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span>{labels[0] ?? 'Start'}</span>
        <span data-timeline-label className="text-foreground">{labels[at] ?? ''}</span>
        <span>{labels[last] ?? ''}</span>
      </div>
      <input
        type="range"
        data-timeline
        data-stops={labels.length}
        className="cq-timeline mt-1 w-full"
        min={0}
        max={last}
        step={1}
        value={at}
        disabled={disabled || labels.length < 2}
        aria-label="Season timeline: hold and drag to see the map after any round"
        aria-valuetext={labels[at] ?? ''}
        onChange={e => onChange(Number(e.currentTarget.value))}
      />
      <p className="text-center text-[10px] text-muted-foreground">Hold and drag to see the map after any round. Let go to come back to now.</p>
      <style>{`
        .cq-timeline { -webkit-appearance: none; appearance: none; height: 30px; background: transparent; cursor: pointer; }
        .cq-timeline:disabled { cursor: default; opacity: 0.5; }
        .cq-timeline::-webkit-slider-runnable-track { height: 6px; border-radius: 3px; background: hsl(var(--muted)); }
        .cq-timeline::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 30px; height: 30px; margin-top: -12px; border-radius: 50%; background: hsl(var(--gold)); border: 3px solid hsl(var(--card)); box-shadow: 0 1px 4px rgba(0,0,0,0.5); }
        .cq-timeline::-moz-range-track { height: 6px; border-radius: 3px; background: hsl(var(--muted)); }
        .cq-timeline::-moz-range-thumb { width: 30px; height: 30px; border-radius: 50%; background: hsl(var(--gold)); border: 3px solid hsl(var(--card)); box-shadow: 0 1px 4px rgba(0,0,0,0.5); }
        @media (prefers-reduced-motion: reduce) { .cq-timeline { transition: none; } }
      `}</style>
    </div>
  );
}
