import { ReactNode, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * SlotReel: a gambling-machine style vertical reel.
 *
 * Owner feedback (July 2026): the old "spin" just swapped the flag every 80ms
 * at constant speed and stopped dead, so it read as "spews it out quickly"
 * rather than a slot machine. This reel renders a real strip of entries that
 * scrolls past a 3-row window, DECELERATES with an ease-out curve (fast blur
 * at the start, ticking slowly at the end), then locks onto the target with
 * the shared `animate-slot-settle` bounce. Pure requestAnimationFrame +
 * existing CSS keyframes; no new dependencies.
 *
 * A new spin starts whenever `spinKey` changes. Under prefers-reduced-motion
 * pass `instant` so the target renders immediately with no animation.
 */
interface SlotReelProps {
  /** Value the reel lands on (e.g. the drawn country). */
  target: string;
  /** Values cycled through while the reel is moving. */
  pool: string[];
  /** Bump this number to trigger a spin (initial reveal and every respin). */
  spinKey: number;
  /** Pixel height of one reel row; the window shows 3 rows. */
  rowHeight: number;
  /** Spin duration in ms (keep within ~1200-1800 for the slot-machine feel). */
  durationMs?: number;
  /** Reduced-motion escape hatch: render the target with no reel animation. */
  instant?: boolean;
  /** Renders one reel entry (flag + label, etc). */
  renderItem: (value: string) => ReactNode;
  /** Fired once when the reel locks onto the target. */
  onSettled?: () => void;
  /** Fired whenever the entry visible in the centre row changes mid-spin. */
  onTick?: (value: string) => void;
  className?: string;
}

/** Entries on the strip before the landing row. More = faster perceived start. */
const REEL_LEN = 16;

/** Ease-out cubic: high initial velocity, long deceleration tail. */
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export function SlotReel({
  target,
  pool,
  spinKey,
  rowHeight,
  durationMs = 1500,
  instant = false,
  renderItem,
  onSettled,
  onTick,
  className,
}: SlotReelProps) {
  const [strip, setStrip] = useState<string[]>([target]);
  const [spinning, setSpinning] = useState(false);
  const colRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const lastIdxRef = useRef(-1);
  // Callbacks live in refs so the spin effect depends on spinKey alone.
  const onSettledRef = useRef(onSettled);
  onSettledRef.current = onSettled;
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  useEffect(() => {
    if (instant || pool.length === 0) {
      setStrip([target]);
      setSpinning(false);
      onSettledRef.current?.();
      return;
    }
    // Build a fresh strip of random entries that ends on the target.
    const items: string[] = [];
    for (let i = 0; i < REEL_LEN - 1; i++) {
      items.push(pool[Math.floor(Math.random() * pool.length)]);
    }
    // Never show the target immediately before the landing row (looks like a stutter).
    if (items[items.length - 1] === target && pool.length > 1) {
      items[items.length - 1] = pool[(pool.indexOf(target) + 1) % pool.length];
    }
    items.push(target);
    setStrip(items);
    setSpinning(true);
    lastIdxRef.current = 0;

    const total = (items.length - 1) * rowHeight;
    const start = performance.now();
    const frame = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = easeOut(t);
      const offset = eased * total;
      const el = colRef.current;
      if (el) {
        // Motion blur + slight zoom proportional to reel velocity (d(eased)/dt).
        const vel = 3 * Math.pow(1 - t, 2);
        const fast = vel > 0.35;
        el.style.transform = `translateY(${-offset}px)${fast ? ' scale(1.03)' : ''}`;
        el.style.filter = fast ? `blur(${Math.min(3, vel * 1.5).toFixed(2)}px)` : 'none';
      }
      const idx = Math.min(items.length - 1, Math.round(offset / rowHeight));
      if (idx !== lastIdxRef.current) {
        lastIdxRef.current = idx;
        onTickRef.current?.(items[idx]);
      }
      if (t < 1) {
        rafRef.current = requestAnimationFrame(frame);
      } else {
        if (el) {
          el.style.transform = `translateY(${-total}px)`;
          el.style.filter = 'none';
        }
        setSpinning(false); // remounts the idle row, replaying the settle bounce
        onSettledRef.current?.();
      }
    };
    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinKey]);

  return (
    <div
      className={cn('relative overflow-hidden rounded-xl border border-border bg-background/60', className)}
      style={{ height: rowHeight * 3 }}
      aria-live="polite"
    >
      {spinning ? (
        <div ref={colRef} className="absolute inset-x-0 will-change-transform" style={{ top: rowHeight }}>
          {strip.map((v, i) => (
            <div key={i} className="flex items-center justify-center" style={{ height: rowHeight }}>
              {renderItem(v)}
            </div>
          ))}
        </div>
      ) : (
        <div
          className="absolute inset-x-0 flex items-center justify-center animate-slot-settle"
          style={{ top: rowHeight, height: rowHeight }}
        >
          {renderItem(target)}
        </div>
      )}
      {/* Edge fades so neighbouring rows read as "the rest of the reel". */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0"
        style={{ height: rowHeight, background: 'linear-gradient(to bottom, hsl(var(--card)) 20%, transparent)' }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0"
        style={{ height: rowHeight, background: 'linear-gradient(to top, hsl(var(--card)) 20%, transparent)' }}
      />
      {/* Payline guides around the centre row. */}
      <div
        className="pointer-events-none absolute inset-x-2 border-y-2 border-primary/40 rounded-sm"
        style={{ top: rowHeight, height: rowHeight }}
      />
    </div>
  );
}

export default SlotReel;
