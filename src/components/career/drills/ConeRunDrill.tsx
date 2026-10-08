/* Round 913: the cone run, lifted out of Soccer Career's training panel
   (Round 81, with the Round 159 stopwatch) so every career can play it.

   The hook holds the run and the view draws it. They are two pieces because
   the state has to live in the training ground itself, not in the drill's own
   screen. Leaving a drill cancels its work; the historical replay still
   holds uninterrupted timing, random draws and scores. */
import { useEffect, useRef, useState } from 'react';
import type { PracticeClock } from '@/hooks/usePracticeClock';
import type { ConeRunSkin } from '@/lib/careerTraining';

const CONES = [
  { x: 50, y: 90 }, { x: 24, y: 78 }, { x: 68, y: 68 }, { x: 30, y: 56 },
  { x: 72, y: 44 }, { x: 38, y: 32 }, { x: 62, y: 20 }, { x: 50, y: 8 },
];

export function useConeRun(finish: (score: number) => void, clock: PracticeClock) {
  const [coneIdx, setConeIdx] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const dribbleStart = useRef<number | null>(null);
  /* Round 159: the stopwatch he asked for. Ticks every 100ms from the first
     cone to the last, on screen the whole run. */
  const [runClock, setRunClock] = useState(0);
  const runTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (runTimer.current) clock.clear(runTimer.current);
  }, []);

  const reset = () => {
    setConeIdx(0); setMistakes(0); dribbleStart.current = null;
    setRunClock(0);
    if (runTimer.current) { clock.clear(runTimer.current); runTimer.current = null; }
  };

  const clickCone = (i: number) => {
    if (clock.isPaused()) return;
    if (i !== coneIdx) { setMistakes(m => m + 1); return; }
    if (coneIdx === 0) {
      dribbleStart.current = clock.now();
      // Round 159: the stopwatch starts with the run and ticks on screen.
      runTimer.current = clock.interval(() => {
        setRunClock(clock.now() - (dribbleStart.current ?? clock.now()));
      }, 100);
    }
    if (i === CONES.length - 1) {
      const elapsed = clock.now() - (dribbleStart.current ?? clock.now());
      if (runTimer.current) { clock.clear(runTimer.current); runTimer.current = null; }
      setRunClock(elapsed);
      const sc = 100 - mistakes * 8 - Math.max(0, elapsed - 4000) / 130;
      finish(sc);
      return;
    }
    setConeIdx(i + 1);
  };

  return { coneIdx, mistakes, runClock, clickCone, reset };
}

export default function ConeRunDrill({ skin, run, onBack }: {
  skin: ConeRunSkin;
  run: ReturnType<typeof useConeRun>;
  onBack: () => void;
}) {
  const { coneIdx, mistakes, runClock, clickCone } = run;
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between text-xs font-bold">
        <button onClick={onBack} className="min-h-11 min-w-11 text-muted-foreground hover:text-foreground">‹ Drills</button>
        <span>{skin.unit} {Math.min(coneIdx + 1, CONES.length)}/{CONES.length}</span>
        {/* Round 159: the stopwatch, live. His words: "there should be a
            little stop watch going while u playing". */}
        <span className={`tabular-nums ${coneIdx > 0 ? "text-sky-300" : "text-muted-foreground"}`}>⏱ {(runClock / 1000).toFixed(1)}s</span>
        <span className="text-amber-400">{mistakes} {skin.slips}</span>
      </div>
      <p className="text-[11px] text-muted-foreground text-center">{skin.how}</p>
      <div className="relative w-full h-80 rounded-xl border border-border overflow-hidden" style={{ background: skin.surface }}>
        {skin.pitchLines && <div className="absolute inset-x-0 top-1/2 h-px bg-white/20" />}
        {skin.pitchLines && <div className="absolute left-1/2 top-1/2 w-20 h-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20" />}
        {CONES.map((c, i) => (
          <button key={i} onClick={() => clickCone(i)}
            className={`absolute w-9 h-9 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center text-sm font-black transition-all ${
              i < coneIdx ? "bg-emerald-500/40 text-black/50 scale-90" :
              i === coneIdx ? "bg-amber-400 text-black animate-pulse scale-110 shadow-lg" :
              "bg-white/15 text-white/70"
            }`}
            style={{ left: `${c.x}%`, top: `${c.y}%` }}>
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
