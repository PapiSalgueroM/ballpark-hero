/* Round 1045: the Season Centre's match clock.

   A requestAnimationFrame clock from 0' to 90': about 15 seconds a match at
   1x, about 5 at 3x, nothing at all at Results. Every event of the derived
   game arrives at its minute and the score bug only ever shows the score
   that was true at the minute on screen (it changes when a goal lands, never
   before, and never counts through numbers). A hidden tab pauses the clock
   and it picks up where it was; reduced motion paints full time on the first
   frame. The event list has a fixed height and scrolls inside itself, so
   nothing below it moves while the match plays. */
import { useEffect, useRef, useState } from 'react';
import type { DerivedGame, SeasonEvent } from '@/lib/season/core';
import { minuteLabel } from '@/lib/clubManagerClock';

export type ClockSpeed = 1 | 3 | 'results';
const MATCH_SECONDS = { 1: 15, 3: 5 } as const;
export const FULL_TIME = 90;

/** The score at a minute, from the game's own events: [his club, the other side]. */
export function scoreAt(events: readonly SeasonEvent[], minute: number): [number, number] {
  let us = 0, them = 0;
  for (const e of events) if (e.kind === 'goal' && e.min <= minute) { if (e.side === 'us') us += 1; else them += 1; }
  return [us, them];
}

export function eventWords(e: SeasonEvent, us: string, them: string): string {
  if (e.kind === 'goal') return e.side === 'us' ? (e.mine ? '⚽ You score!' : `⚽ Goal, ${us}`) : `⚽ Goal, ${them}`;
  if (e.kind === 'assist') return '🅰️ You set it up';
  if (e.kind === 'yellow') return '🟨 You go in the book';
  if (e.kind === 'red') return '🟥 Sent off';
  if (e.kind === 'injury') return '🚑 You go off injured';
  if (e.kind === 'on') return '🔁 You come on';
  return '🔁 You come off';
}

interface Props {
  game: DerivedGame;
  usName: string;
  themName: string;
  speed: ClockSpeed;
  paused: boolean;
  reduced: boolean;
  onFullTime: () => void;
}

export function MatchClock({ game, usName, themName, speed, paused, reduced, onFullTime }: Props) {
  const instant = reduced || speed === 'results';
  const [minute, setMinute] = useState(() => (instant ? FULL_TIME : 0));
  const done = minute >= FULL_TIME;
  const listRef = useRef<HTMLOListElement | null>(null);
  const told = useRef(false);

  useEffect(() => {
    if (done) return;
    if (instant) { setMinute(FULL_TIME); return; }
    if (paused) return;
    let raf = 0;
    let last = performance.now();
    let hidden = typeof document !== 'undefined' && document.hidden;
    const onVis = () => { hidden = document.hidden; last = performance.now(); };
    document.addEventListener('visibilitychange', onVis);
    const perMs = FULL_TIME / (MATCH_SECONDS[speed as 1 | 3] * 1000);
    const tick = (now: number) => {
      const dt = Math.min(250, now - last);
      last = now;
      if (!hidden) setMinute(m => Math.min(FULL_TIME, m + dt * perMs));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', onVis); };
  }, [done, instant, paused, speed]);

  useEffect(() => {
    if (done && !told.current) { told.current = true; onFullTime(); }
  }, [done, onFullTime]);

  const shown = Math.floor(minute);
  const seen = game.events.filter(e => e.min <= shown);
  const [us, them] = scoreAt(game.events, shown);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [seen.length]);

  const homeName = game.home ? usName : themName;
  const awayName = game.home ? themName : usName;
  const hg = game.home ? us : them;
  const ag = game.home ? them : us;
  return (
    <div data-match-clock data-minute={shown} data-score={`${us}-${them}`}>
      <div className="flex items-center justify-between gap-2 rounded-xl bg-muted/30 px-3 py-2">
        <span className="min-w-0 flex-1 truncate text-sm font-bold">{homeName}</span>
        <span key={`${hg}-${ag}`} className={`${shown > 0 && !instant ? 'cm-slam' : ''} shrink-0 text-xl font-black tabular-nums`} data-score-bug>
          {hg}-{ag}
        </span>
        <span className="min-w-0 flex-1 truncate text-right text-sm font-bold">{awayName}</span>
      </div>
      <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="tabular-nums" data-clock-minute>{done ? 'FT' : minuteLabel({ minute: shown })}</span>
        {done && <span className={`${instant ? '' : 'cm-slam'} font-bold text-foreground`} data-full-time>Full time</span>}
      </div>
      <ol ref={listRef} className="mt-2 h-28 overflow-y-auto space-y-1 text-xs" aria-live="polite" data-clock-events>
        {seen.length === 0 && <li className="text-muted-foreground">Kick off.</li>}
        {seen.map((e, i) => (
          <li key={`${i}-${e.min}-${e.kind}`} className={`${instant ? '' : 'cm-tick-in'} flex gap-2`}>
            <span className="w-8 shrink-0 tabular-nums text-muted-foreground">{minuteLabel({ minute: e.min })}</span>
            <span className={e.mine ? 'font-bold text-primary' : ''}>{eventWords(e, usName, themName)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
