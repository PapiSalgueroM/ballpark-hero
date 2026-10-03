/* Round 913: the six zone drill, lifted out of Soccer Career's training panel
   so every career can play it. Two ways to play it: 'pick' is the Round 81
   penalty (you place it, the other man guesses), 'save' is the Round 159
   keeper version (a tell flashes, the shot comes, you tap where it went).
   Hook and view, for the reason ConeRunDrill gives.

   Every random draw is where it was and in the order it was: the guess, the
   12 percent miss on the top row, the shot, the 65 percent honest tell and
   the dishonest tell's own guess. */
import { useEffect, useRef, useState } from 'react';
import type { ZonePickSkin } from '@/lib/careerTraining';
import feedback from '@/components/soccer-career/TrainingFeedback.module.css';

const ZONES = [
  { id: 0, w: 0.12 }, { id: 1, w: 0.08 }, { id: 2, w: 0.12 },
  { id: 3, w: 0.24 }, { id: 4, w: 0.20 }, { id: 5, w: 0.24 },
];

function keeperPick(): number {
  const r = Math.random();
  let acc = 0;
  for (const z of ZONES) { acc += z.w; if (r < acc) return z.id; }
  return 4;
}

/** `saving` is true while the save version of this drill is the one on screen. */
export function useZonePick(saving: boolean, finish: (score: number) => void) {
  // pick mode
  const [penNo, setPenNo] = useState(0);
  const [goals, setGoals] = useState(0);
  const [lastPen, setLastPen] = useState<{ shot: number; dive: number; outcome: 'made' | 'stopped' | 'over' } | null>(null);

  // Round 159: save mode. The shooter's tell flashes, then he hits.
  const [gkShotNo, setGkShotNo] = useState(0);
  const [gkSaves, setGkSaves] = useState(0);
  const [gkTell, setGkTell] = useState<number | null>(null);
  const [gkShot, setGkShot] = useState<number | null>(null);
  const [gkLast, setGkLast] = useState<{ shot: number; dive: number; saved: boolean } | null>(null);
  const gkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (gkTimer.current) clearTimeout(gkTimer.current);
  }, []);

  const reset = () => {
    setPenNo(0); setGoals(0); setLastPen(null);
    setGkShotNo(0); setGkSaves(0); setGkTell(null); setGkShot(null); setGkLast(null);
    if (gkTimer.current) { clearTimeout(gkTimer.current); gkTimer.current = null; }
  };

  const takePen = (zone: number) => {
    if (lastPen) return; // wait for the reveal to clear
    const dive = keeperPick();
    let outcome: 'made' | 'stopped' | 'over';
    let scored = false;
    if (zone <= 2 && Math.random() < 0.12) {
      outcome = 'over';
    } else if (zone === dive) {
      outcome = 'stopped';
    } else {
      outcome = 'made';
      scored = true;
    }
    setLastPen({ shot: zone, dive, outcome });
    const g = goals + (scored ? 1 : 0);
    setGoals(g);
    setTimeout(() => {
      setLastPen(null);
      if (penNo === 4) finish(g * 20);
      else setPenNo(p => p + 1);
    }, 1100);
  };

  /* Round 159: a tell flashes (honest about 65 percent of the time), the
     shot comes, you dive by tapping a zone. */
  const gkNextShot = () => {
    setGkLast(null);
    setGkShot(null);
    const shot = keeperPick();
    const honest = Math.random() < 0.65;
    const tell = honest ? shot : keeperPick();
    setGkTell(tell);
    gkTimer.current = setTimeout(() => {
      setGkTell(null);
      setGkShot(shot);
    }, 650);
  };

  const gkDive = (zone: number) => {
    if (gkShot === null || gkLast) return;
    const saved = zone === gkShot;
    const s = gkSaves + (saved ? 1 : 0);
    setGkSaves(s);
    setGkLast({ shot: gkShot, dive: zone, saved });
    gkTimer.current = setTimeout(() => {
      if (gkShotNo === 4) finish(s * 20);
      else { setGkShotNo(n => n + 1); gkNextShot(); }
    }, 1100);
  };

  /* The first shot arrives shortly after the save drill opens. */
  useEffect(() => {
    if (saving) {
      gkTimer.current = setTimeout(gkNextShot, 600);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saving]);

  return { penNo, goals, lastPen, takePen, gkShotNo, gkSaves, gkTell, gkShot, gkLast, gkDive, reset };
}

const FRAME = {
  goal: "mx-auto w-full max-w-[320px] border-4 border-white/80 border-b-0 rounded-t-lg bg-black/20",
  box: "mx-auto w-full max-w-[320px] border-4 border-white/80 rounded-lg bg-black/20",
};

export default function ZonePickDrill({ skin, run, onBack }: {
  skin: ZonePickSkin;
  run: ReturnType<typeof useZonePick>;
  onBack: () => void;
}) {
  const { penNo, goals, lastPen, takePen, gkShotNo, gkSaves, gkTell, gkShot, gkLast, gkDive } = run;
  if (skin.mode === 'save') {
    return (
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between text-xs font-bold">
          <button onClick={onBack} className="text-muted-foreground hover:text-foreground">‹ Drills</button>
          <span>{skin.unit} {gkShotNo + 1}/5</span>
          <span className="text-emerald-400">{gkSaves} {skin.tally}</span>
        </div>
        <p className="text-[11px] text-muted-foreground text-center">{skin.how}</p>
        <div className="relative w-full rounded-xl border border-border overflow-hidden p-4" style={{ background: skin.surface }}>
          <div className={FRAME[skin.frame]}>
            <div className="grid grid-cols-3 grid-rows-2 h-40">
              {ZONES.map(z => (
                <button key={z.id} onClick={() => gkDive(z.id)} aria-label={`${skin.verb} ${skin.zones[z.id]}`} data-training-zone={z.id}
                  className={`relative border border-white/15 transition-colors ${
                    gkTell === z.id ? "bg-amber-400/40 animate-pulse" : gkShot !== null && !gkLast ? "hover:bg-white/15" : ""
                  }`}>
                  {gkLast?.shot === z.id && <span className="absolute inset-0 flex items-center justify-center text-2xl"><span className={feedback.marker} data-training-marker="ball">{skin.ball}</span></span>}
                  {gkLast?.dive === z.id && <span className="absolute inset-0 flex items-center justify-center text-3xl"><span className={feedback.marker} data-training-marker="glove">{skin.glove}</span></span>}
                </button>
              ))}
            </div>
          </div>
          <div className="h-8 flex items-center justify-center">
            {gkTell !== null && <span className="text-sm font-black text-amber-300">{skin.tell}</span>}
            {gkShot !== null && !gkLast && <span className="text-sm font-black text-white">{skin.shot}</span>}
            {gkLast && <span data-training-feedback={gkLast.saved ? "success" : "miss"} className={`text-sm font-black ${gkLast.saved ? "text-emerald-300" : "text-red-300"} ${gkLast.saved ? feedback.success : feedback.miss}`}>{gkLast.saved ? skin.saved : skin.beaten}</span>}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between text-xs font-bold">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground">‹ Drills</button>
        <span>{skin.unit} {penNo + 1}/5</span>
        <span className="text-emerald-400">{goals} {skin.tally}</span>
      </div>
      <p className="text-[11px] text-muted-foreground text-center">{skin.how}</p>
      <div className="relative w-full rounded-xl border border-border overflow-hidden p-4" style={{ background: skin.surface }}>
        <div className={FRAME[skin.frame]}>
          <div className="grid grid-cols-3 grid-rows-2 h-40">
            {ZONES.map(z => (
              <button key={z.id} onClick={() => takePen(z.id)} aria-label={`${skin.verb} ${skin.zones[z.id]}`} data-training-zone={z.id}
                className={`relative border border-white/15 transition-colors ${lastPen ? "" : "hover:bg-white/15"}`}>
                {lastPen?.dive === z.id && <span className="absolute inset-0 flex items-center justify-center text-3xl"><span className={feedback.marker} data-training-marker="glove">{skin.glove}</span></span>}
                {lastPen?.shot === z.id && <span className="absolute inset-0 flex items-center justify-center text-2xl"><span className={feedback.marker} data-training-marker="ball">{skin.ball}</span></span>}
              </button>
            ))}
          </div>
        </div>
        <div className="h-8 flex items-center justify-center">
          {lastPen && <span data-training-feedback={lastPen.outcome === "made" ? "success" : "miss"} className={`text-sm font-black text-white ${lastPen.outcome === "made" ? feedback.success : feedback.miss}`}>{skin[lastPen.outcome]}</span>}
        </div>
      </div>
    </div>
  );
}
