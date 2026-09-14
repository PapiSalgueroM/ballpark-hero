/**
 * Round 583: Stadium Tycoon's pitch. The match on it is the engine's match and
 * nothing else: the score is the engine's score on the frame it commits, and
 * every goal the engine commits while you watch is replayed here once, at the
 * end it went in, stamped with the minute the engine gave it. The pitch never
 * rolls a second time and nothing on it runs on a timer of its own
 * (docs/design/round-580-tycoon-merge.md, section 7).
 *
 * What moves, and what drives it:
 * - The ball sits at a spot hashed from the match count and the minute, so it
 *   moves when the match clock does. A replay sends it into the net, then the
 *   next queued replay or back into play.
 * - More than two replays waiting means the older ones land on their final
 *   frame, briefly, instead of queueing a minute behind the match.
 * - 22 players stand in a 4-3-3 each and breathe in place by CSS keyframes;
 *   the scoring side's shape pushes up during its replay.
 * - A tap pops the pitch and throws six sparks. The taps chip only counts.
 *
 * Under reduced motion no replay runs, and the drift, ripple, pop and sparks
 * do not animate; the score and the floaters still land when the engine
 * commits them. scripts/simTycoonPitch.mjs holds all of it.
 */
import { useEffect, useState } from 'react';
import type { CSSProperties, ReactNode, RefObject } from 'react';
import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Replay } from '@/hooks/useStadiumTycoon';

/** A replay's full run, and how long an older one shows its final frame. */
export const REPLAY_MS = 1300;
export const LAND_MS = 250;

/** Your shape, attacking right, in percent of the pitch. The opponent mirrors it. */
const FORMATION: [number, number][] = [
  [5, 50],
  [17, 15], [15, 38], [15, 62], [17, 85],
  [30, 28], [28, 50], [30, 72],
  [42, 18], [44, 50], [42, 82],
];

/** Deterministic pseudo-random, the same as the page's seat placement. */
function seatRand(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function useReducedMotion(): boolean {
  const query = '(prefers-reduced-motion: reduce)';
  const [reduce, setReduce] = useState(() => typeof window !== 'undefined' && Boolean(window.matchMedia?.(query).matches));
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return;
    const on = () => setReduce(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return reduce;
}

type BallAt = 'play' | 'for' | 'against';

export interface TapFx { seq: number; x: number; y: number }

export default function TycoonPitch({
  areaRef, goalsFor, goalsAgainst, minute, totalMatches, streak, opponent,
  replays, onReplayEnd, tapFx, tapRun, children,
}: {
  areaRef: RefObject<HTMLDivElement>;
  goalsFor: number;
  goalsAgainst: number;
  minute: number;
  totalMatches: number;
  streak: number;
  opponent: string;
  replays: Replay[];
  onReplayEnd: (id: number) => void;
  tapFx: TapFx | null;
  tapRun: number;
  children?: ReactNode;
}) {
  const reduce = useReducedMotion();
  const head = replays[0] ?? null;
  const landing = replays.length > 2;
  const replay = reduce ? null : head;

  /* One replay at a time. Under reduced motion each one is let go at once. */
  useEffect(() => {
    if (!head) return;
    const t = window.setTimeout(() => onReplayEnd(head.id), reduce ? 0 : landing ? LAND_MS : REPLAY_MS);
    return () => window.clearTimeout(t);
  }, [head, landing, reduce, onReplayEnd]);

  const ballAt: BallAt = replay ? replay.side : 'play';
  const idle = { x: 32 + seatRand(totalMatches * 131 + minute * 7) * 36, y: 22 + seatRand(totalMatches * 17 + minute * 29) * 56 };
  const lane = replay ? 43 + seatRand(totalMatches * 7 + replay.minute * 3) * 14 : 50;
  const ball = ballAt === 'for' ? { x: 97, y: lane } : ballAt === 'against' ? { x: 3, y: lane } : idle;
  const shift = `${((idle.x - 50) * 0.15).toFixed(2)}%`;

  const team = (ours: boolean) => (
    <div
      aria-hidden="true"
      className={cn('absolute inset-0 st-team', ours ? ballAt === 'for' && 'st-push-for' : ballAt === 'against' && 'st-push-against')}
      style={{ '--shift': shift } as CSSProperties}
    >
      {FORMATION.map(([fx, fy], i) => {
        const k = ours ? i : i + 11;
        return (
          <span
            key={k}
            className={cn('absolute h-2.5 w-2.5 rounded-full shadow st-drift', ours ? 'bg-blue-400' : 'bg-red-400')}
            style={{
              left: `${ours ? fx : 100 - fx}%`,
              top: `${fy}%`,
              marginLeft: -5,
              marginTop: -5,
              '--dx': `${((seatRand(k * 3 + 1) - 0.5) * 14).toFixed(1)}px`,
              '--dy': `${((seatRand(k * 5 + 2) - 0.5) * 12).toFixed(1)}px`,
              '--dd': `${(2.2 + seatRand(k * 7) * 1.6).toFixed(2)}s`,
              animationDelay: `-${(seatRand(k * 11) * 3).toFixed(2)}s`,
            } as CSSProperties}
          />
        );
      })}
    </div>
  );

  return (
    <div
      ref={areaRef}
      data-tycoon-pitch
      className={cn('relative h-44 md:h-56 bg-emerald-700', tapFx && !reduce && (tapFx.seq % 2 ? 'st-pop-a' : 'st-pop-b'))}
    >
      {/* stripes and markings: halfway line, centre circle, both boxes and goals */}
      <div aria-hidden="true" className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent 0 12%, rgba(255,255,255,0.25) 12% 24%)' }} />
      <div aria-hidden="true" className="absolute inset-y-0 left-1/2 w-px bg-white/40" />
      <div aria-hidden="true" className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/40" />
      <div aria-hidden="true" className="absolute left-0 top-[20%] bottom-[20%] w-[14%] border border-l-0 border-white/40" />
      <div aria-hidden="true" className="absolute right-0 top-[20%] bottom-[20%] w-[14%] border border-r-0 border-white/40" />
      <div aria-hidden="true" className="absolute left-0 top-[35%] bottom-[35%] w-[5%] border border-l-0 border-white/40" />
      <div aria-hidden="true" className="absolute right-0 top-[35%] bottom-[35%] w-[5%] border border-r-0 border-white/40" />
      <span
        aria-hidden="true"
        key={ballAt === 'against' && replay ? `net-a-${replay.id}` : 'net-a'}
        data-net="against"
        className={cn('absolute left-0 top-[42%] h-[16%] w-[2.5%] border border-l-0 border-white/80 bg-white/10', ballAt === 'against' && !landing && 'st-ripple')}
      />
      <span
        aria-hidden="true"
        key={ballAt === 'for' && replay ? `net-f-${replay.id}` : 'net-f'}
        data-net="for"
        className={cn('absolute right-0 top-[42%] h-[16%] w-[2.5%] border border-r-0 border-white/80 bg-white/10', ballAt === 'for' && !landing && 'st-ripple')}
      />

      {/* scoreboard: the engine's score on the frame it commits */}
      <div className="absolute top-1.5 left-1/2 z-[1] -translate-x-1/2 flex items-center gap-2 bg-black/50 rounded-full px-3 py-1 text-xs font-bold text-white tabular-nums max-w-[92%]">
        <span key={`f${goalsFor}`} className={cn('inline-block shrink-0 text-[hsl(152,60%,52%)]', goalsFor > 0 && 'cm-slam')}>YOU {goalsFor}</span>
        <span className="text-white/90 shrink-0">{Math.min(minute, 90)}'</span>
        <span className="flex min-w-0 items-center gap-1 text-red-400">
          <span key={`a${goalsAgainst}`} className={cn('inline-block shrink-0', goalsAgainst > 0 && 'cm-slam')}>{goalsAgainst}</span>
          <span className="truncate">{opponent}</span>
        </span>
        {streak >= 2 && <span className="inline-flex items-center text-orange-400"><Flame className={cn('w-3.5 h-3.5', streak >= 5 && 'motion-safe:animate-pulse')} />{streak}</span>}
      </div>

      {team(true)}
      {team(false)}

      <span
        aria-hidden="true"
        data-ball
        data-ball-at={ballAt}
        data-replay-id={replay?.id}
        data-replay-minute={replay?.minute}
        className={cn('absolute h-2 w-2 rounded-full bg-white shadow st-ball', ballAt !== 'play' && (landing ? 'st-ball-landed' : 'st-ball-shot'))}
        style={{ left: `${ball.x}%`, top: `${ball.y}%`, marginLeft: -4, marginTop: -4 }}
      />

      {tapFx && !reduce && Array.from({ length: 6 }, (_, i) => {
        const a = seatRand(tapFx.seq * 13 + i) * Math.PI * 2;
        return (
          <span
            key={`${tapFx.seq}-${i}`}
            aria-hidden="true"
            className="pointer-events-none absolute h-1 w-1 rounded-full bg-yellow-200 st-spark"
            style={{ left: `${tapFx.x}%`, top: `${tapFx.y}%`, '--sx': `${(Math.cos(a) * 22).toFixed(1)}px`, '--sy': `${(Math.sin(a) * 22).toFixed(1)}px` } as CSSProperties}
          />
        );
      })}
      {tapRun >= 2 && (
        <span data-tap-run className="pointer-events-none absolute bottom-1.5 left-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-bold text-white tabular-nums">
          {tapRun} taps
        </span>
      )}

      {children}

      <style>{`
        .st-team { transform: translateX(var(--shift)); transition: transform 1.1s ease-in-out; }
        .st-push-for { transform: translateX(calc(var(--shift) + 10%)); }
        .st-push-against { transform: translateX(calc(var(--shift) - 10%)); }
        .st-ball { transition: left 1.1s ease-in-out, top 1.1s ease-in-out; }
        .st-ball-shot { transition-duration: 0.7s; transition-timing-function: ease-in; }
        .st-ball-landed { transition: none; }
        @keyframes stDrift { from { transform: translate(0, 0); } to { transform: translate(var(--dx), var(--dy)); } }
        .st-drift { animation: stDrift var(--dd) ease-in-out infinite alternate; }
        @keyframes stRipple { 0%, 45% { transform: scaleX(1); background-color: rgba(255,255,255,0.1); } 65% { transform: scaleX(1.9); background-color: rgba(255,255,255,0.55); } 100% { transform: scaleX(1); background-color: rgba(255,255,255,0.1); } }
        .st-ripple { animation: stRipple 1.2s ease-out 1; }
        @keyframes stPopA { 0% { transform: scale(1); } 50% { transform: scale(1.02); } 100% { transform: scale(1); } }
        @keyframes stPopB { 0% { transform: scale(1); } 50% { transform: scale(1.02); } 100% { transform: scale(1); } }
        .st-pop-a { animation: stPopA 120ms ease-out 1; }
        .st-pop-b { animation: stPopB 120ms ease-out 1; }
        @keyframes stSpark { 0% { opacity: 1; transform: translate(0, 0); } 100% { opacity: 0; transform: translate(var(--sx), var(--sy)); } }
        .st-spark { opacity: 0; animation: stSpark 450ms ease-out forwards; }
        @media (prefers-reduced-motion: reduce) {
          .st-drift, .st-ripple, .st-pop-a, .st-pop-b { animation: none; }
          .st-spark { animation: none; display: none; }
          .st-team, .st-ball { transition: none; }
        }
      `}</style>
    </div>
  );
}
