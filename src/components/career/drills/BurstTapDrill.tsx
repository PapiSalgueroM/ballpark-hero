/* Round 913: the five second burst, lifted out of Soccer Career's training
   panel (Round 81) so every career can play it. Hook and view, for the reason
   ConeRunDrill gives. */
import { useEffect, useRef, useState } from 'react';
import type { PracticeClock } from '@/hooks/usePracticeClock';
import type { BurstTapSkin } from '@/lib/careerTraining';

/** `active` is true while this drill is the one on screen. */
export function useBurstTap(active: boolean, finish: (score: number) => void, clock: PracticeClock) {
  const [clicks, setClicks] = useState(0);
  const [paceLeft, setPaceLeft] = useState(5.0);
  const [paceRunning, setPaceRunning] = useState(false);
  const paceTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (paceTimer.current) clock.clear(paceTimer.current);
  }, []);

  const reset = () => {
    setClicks(0); setPaceLeft(5.0); setPaceRunning(false);
    if (paceTimer.current) { clock.clear(paceTimer.current); paceTimer.current = null; }
  };

  const startPace = () => {
    if (clock.isPaused()) return;
    setPaceRunning(true);
    setClicks(0);
    setPaceLeft(5.0);
    const startedAt = clock.now();
    paceTimer.current = clock.interval(() => {
      const left = 5 - (clock.now() - startedAt) / 1000;
      if (left <= 0) {
        if (paceTimer.current) clock.clear(paceTimer.current);
        paceTimer.current = null;
        setPaceLeft(0);
        setPaceRunning(false);
      } else {
        setPaceLeft(left);
      }
    }, 100);
  };

  useEffect(() => {
    if (!paceRunning && paceLeft === 0 && active) {
      finish(clicks * 3.2);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paceRunning, paceLeft]);

  const tap = () => { if (paceRunning && !clock.isPaused()) setClicks(c => c + 1); };

  return { clicks, paceLeft, paceRunning, startPace, tap, reset };
}

export default function BurstTapDrill({ skin, run, onBack }: {
  skin: BurstTapSkin;
  run: ReturnType<typeof useBurstTap>;
  onBack: () => void;
}) {
  const { clicks, paceLeft, paceRunning, startPace, tap } = run;
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between text-xs font-bold">
        <button onClick={onBack} className="min-h-11 min-w-11 text-muted-foreground hover:text-foreground">‹ Drills</button>
        <span className="tabular-nums">{paceLeft.toFixed(1)}s</span>
        <span className="text-emerald-400 tabular-nums">{clicks} {skin.unit}</span>
      </div>
      {!paceRunning && paceLeft === 5.0 ? (
        <button onClick={startPace} className="w-full h-64 rounded-xl border-2 border-dashed border-border bg-muted/10 hover:bg-muted/20 text-center">
          <div className="text-4xl mb-2">{skin.startEmoji}</div>
          <div className="text-sm font-black">{skin.startTitle}</div>
          <div className="text-[11px] text-muted-foreground">{skin.startHint}</div>
        </button>
      ) : (
        <button onClick={tap}
          className="w-full h-64 rounded-xl bg-gradient-to-b from-sky-900 to-sky-950 border border-border text-center select-none active:scale-[0.99]">
          <div className="text-5xl mb-2">{skin.runEmoji}</div>
          <div className="text-2xl font-black tabular-nums">{clicks}</div>
          <div className="text-[11px] text-white/60">{paceRunning ? skin.go : skin.stop}</div>
        </button>
      )}
    </div>
  );
}
