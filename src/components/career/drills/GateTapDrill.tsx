/* Round 913: the gate tap, lifted out of Soccer Career's training panel
   (Round 159, Passing Gates) so every career can play it. Eight gates, each
   lit for a shrinking window; tap the lit one in time or it counts as gone.
   Hook and view, for the reason ConeRunDrill gives. */
import { useEffect, useRef, useState } from 'react';
import type { GateTapSkin } from '@/lib/careerTraining';

const GATE_COUNT = 8;
const gateWindowFor = (n: number) => Math.max(650, 1400 - n * 100);

export function useGateTap(finish: (score: number) => void) {
  const [gateNo, setGateNo] = useState(0);
  const [gateHits, setGateHits] = useState(0);
  const [litGate, setLitGate] = useState<number | null>(null);
  const [gateWindow, setGateWindow] = useState(0);
  const gateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Refs mirror the two counters so the timeout chain reads fresh values.
  const gateHitsRef = useRef(0);
  const gateNoRef = useRef(0);

  useEffect(() => () => {
    if (gateTimer.current) clearTimeout(gateTimer.current);
  }, []);

  const reset = () => {
    setGateNo(0); setGateHits(0); setLitGate(null); setGateWindow(0);
    if (gateTimer.current) { clearTimeout(gateTimer.current); gateTimer.current = null; }
  };

  const lightGate = (n: number) => {
    const g = Math.floor(Math.random() * 6);
    setLitGate(g);
    setGateWindow(gateWindowFor(n));
    gateTimer.current = setTimeout(() => {
      // Too slow: the gate shuts itself and the drill moves on.
      setLitGate(null);
      if (n === GATE_COUNT - 1) finish((gateHitsRef.current) * 12.5);
      else { gateNoRef.current = n + 1; setGateNo(n + 1); lightGate(n + 1); }
    }, gateWindowFor(n));
  };
  const tapGate = (g: number) => {
    if (litGate === null) return;
    if (gateTimer.current) { clearTimeout(gateTimer.current); gateTimer.current = null; }
    const hit = g === litGate;
    if (hit) { gateHitsRef.current += 1; setGateHits(h => h + 1); }
    setLitGate(null);
    const n = gateNoRef.current;
    if (n === GATE_COUNT - 1) {
      finish(gateHitsRef.current * 12.5);
    } else {
      gateNoRef.current = n + 1;
      setGateNo(n + 1);
      gateTimer.current = setTimeout(() => lightGate(n + 1), 350);
    }
  };
  const startGates = () => {
    gateHitsRef.current = 0;
    gateNoRef.current = 0;
    setGateHits(0);
    setGateNo(0);
    lightGate(0);
  };

  return { gateNo, gateHits, litGate, gateWindow, tapGate, startGates, reset };
}

export default function GateTapDrill({ skin, run, onBack }: {
  skin: GateTapSkin;
  run: ReturnType<typeof useGateTap>;
  onBack: () => void;
}) {
  const { gateNo, gateHits, litGate, tapGate, startGates } = run;
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between text-xs font-bold">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground">‹ Drills</button>
        <span>{skin.unit} {Math.min(gateNo + 1, GATE_COUNT)}/{GATE_COUNT}</span>
        <span className="text-emerald-400">{gateHits} {skin.tally}</span>
      </div>
      <p className="text-[11px] text-muted-foreground text-center">{skin.how}</p>
      {litGate === null && gateNo === 0 && gateHits === 0 ? (
        <button onClick={startGates} className="w-full h-64 rounded-xl border-2 border-dashed border-border bg-muted/10 hover:bg-muted/20 text-center">
          <div className="text-4xl mb-2">{skin.startEmoji}</div>
          <div className="text-sm font-black">{skin.startTitle}</div>
          <div className="text-[11px] text-muted-foreground">{skin.startHint}</div>
        </button>
      ) : (
        <div className="relative w-full h-64 rounded-xl border border-border overflow-hidden p-3" style={{ background: skin.surface }}>
          <div className="absolute inset-x-0 top-1/2 h-px bg-white/20" />
          <div className="grid grid-cols-3 grid-rows-2 gap-3 h-full">
            {[0, 1, 2, 3, 4, 5].map(g => (
              <button key={g} onClick={() => tapGate(g)}
                className={`rounded-xl border-2 transition-all flex items-center justify-center text-2xl ${
                  litGate === g
                    ? "border-amber-300 bg-amber-400/30 animate-pulse scale-105"
                    : "border-white/20 bg-white/5"
                }`}>
                {litGate === g ? skin.lit : ""}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
