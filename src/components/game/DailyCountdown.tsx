import { useEffect, useState } from 'react';

/**
 * #27: compact ticking countdown to the next daily puzzle rollover.
 *
 * The site's daily convention (see src/lib/dateUtils.ts, src/lib/streaks.ts)
 * is that "today" is an America/New_York (ET) calendar date, so the new
 * puzzle becomes available at midnight ET, not midnight UTC or the visitor's
 * local midnight. This component computes the next ET midnight the same
 * DST-safe way those modules compute "today": by formatting the current
 * instant into ET wall-clock fields with Intl.DateTimeFormat rather than
 * doing fixed UTC-4/UTC-5 offset arithmetic, which would drift by an hour
 * across the DST boundary twice a year.
 *
 * Rendered only for games flagged `daily: true` in the registry (see
 * GameNav.tsx, which owns that gating).
 */

/**
 * Milliseconds remaining until the next America/New_York midnight, computed
 * from `now`. DST-safe: reads the current ET wall-clock time via
 * Intl.DateTimeFormat (which already knows about EST/EDT transitions) and
 * measures the gap to the next 00:00:00 in that same wall-clock frame,
 * rather than assuming a fixed offset from UTC.
 */
function msUntilNextEtMidnight(now: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(now);

  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '0';
  const hour = parseInt(get('hour'), 10) % 24; // Intl can render midnight as "24"
  const minute = parseInt(get('minute'), 10);
  const second = parseInt(get('second'), 10);

  const secondsSinceEtMidnight = hour * 3600 + minute * 60 + second;
  const secondsRemaining = 24 * 3600 - secondsSinceEtMidnight;

  return secondsRemaining * 1000;
}

function formatHms(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function DailyCountdown() {
  const [remainingMs, setRemainingMs] = useState(() => msUntilNextEtMidnight(new Date()));

  useEffect(() => {
    const tick = () => {
      const ms = msUntilNextEtMidnight(new Date());
      // Recompute rather than a blind -1000 decrement each tick, so the DST
      // "fall back" and "spring forward" boundaries self-correct on the very
      // next tick instead of drifting by an hour until a full page reload.
      setRemainingMs(ms > 0 ? ms : msUntilNextEtMidnight(new Date()));
    };
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <p className="text-center text-xs text-muted-foreground mt-2" aria-live="off">
      Next puzzle in <span className="tabular-nums font-medium">{formatHms(remainingMs)}</span>
    </p>
  );
}
