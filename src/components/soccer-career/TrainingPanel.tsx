/* ─── Round 81: training ground mini games. ───
   Skill drills, one session per season, straight off the owner's list:
   trace-the-cones dribbling, click-burst pace, penalty placement shooting.
   Score 50+ banks +1 to the drilled stat next season, 80+ banks +2, applied
   through the engine's existing statBoostNextSeason pipeline. Tile rule:
   a menu of drill tiles, each drill takes over the panel, back buttons
   everywhere. All timers cleaned up on unmount.

   Round 159, three of his asks in one pass: the cone slalom finally shows
   its stopwatch ticking while you run it, keepers get their own version of
   the shooting drill (they SAVE penalties instead of taking them, feeding
   the same reflexes stat the engine always mapped them to), and a fourth
   drill arrived: Passing Gates, tap the lit gate before it shuts. */
import { useEffect, useRef, useState } from "react";
import type { CareerState } from "@/lib/soccerCareerEngine";
import type { TrainingDrill } from "@/lib/soccerCareerEngine";

type Screen = "menu" | "dribbling" | "pace" | "shooting" | "passing" | "result";

const CONES = [
  { x: 50, y: 90 }, { x: 24, y: 78 }, { x: 68, y: 68 }, { x: 30, y: 56 },
  { x: 72, y: 44 }, { x: 38, y: 32 }, { x: 62, y: 20 }, { x: 50, y: 8 },
];

const ZONES = [
  { id: 0, label: "top left", w: 0.12 }, { id: 1, label: "top middle", w: 0.08 }, { id: 2, label: "top right", w: 0.12 },
  { id: 3, label: "bottom left", w: 0.24 }, { id: 4, label: "bottom middle", w: 0.20 }, { id: 5, label: "bottom right", w: 0.24 },
];

function keeperPick(): number {
  const r = Math.random();
  let acc = 0;
  for (const z of ZONES) { acc += z.w; if (r < acc) return z.id; }
  return 4;
}

export default function TrainingPanel({ career, available, onComplete, onClose }: {
  career: CareerState;
  available: boolean;
  onComplete: (drill: TrainingDrill, score: number) => void;
  onClose: () => void;
}) {
  const [screen, setScreen] = useState<Screen>("menu");
  const [drill, setDrill] = useState<TrainingDrill>("dribbling");
  const [score, setScore] = useState(0);
  const [banked, setBanked] = useState(false);

  // dribbling state
  const [coneIdx, setConeIdx] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const dribbleStart = useRef<number | null>(null);
  /* Round 159: the stopwatch he asked for. Ticks every 100ms from the first
     cone to the last, on screen the whole run. */
  const [runClock, setRunClock] = useState(0);
  const runTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // pace state
  const [clicks, setClicks] = useState(0);
  const [paceLeft, setPaceLeft] = useState(5.0);
  const [paceRunning, setPaceRunning] = useState(false);
  const paceTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // shooting state
  const [penNo, setPenNo] = useState(0);
  const [goals, setGoals] = useState(0);
  const [lastPen, setLastPen] = useState<{ shot: number; dive: number; result: string } | null>(null);

  // Round 159: keeper variant state. The shooter's tell flashes, then he hits.
  const isGK = career.position === "GK";
  const [gkShotNo, setGkShotNo] = useState(0);
  const [gkSaves, setGkSaves] = useState(0);
  const [gkTell, setGkTell] = useState<number | null>(null);
  const [gkShot, setGkShot] = useState<number | null>(null);
  const [gkLast, setGkLast] = useState<{ shot: number; dive: number; saved: boolean } | null>(null);
  const gkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Round 159: passing gates state.
  const [gateNo, setGateNo] = useState(0);
  const [gateHits, setGateHits] = useState(0);
  const [litGate, setLitGate] = useState<number | null>(null);
  const [gateWindow, setGateWindow] = useState(0);
  const gateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (paceTimer.current) clearInterval(paceTimer.current);
    if (runTimer.current) clearInterval(runTimer.current);
    if (gkTimer.current) clearTimeout(gkTimer.current);
    if (gateTimer.current) clearTimeout(gateTimer.current);
  }, []);

  const finish = (d: TrainingDrill, sc: number) => {
    setDrill(d);
    setScore(Math.max(0, Math.min(100, Math.round(sc))));
    setScreen("result");
  };

  const resetDrills = () => {
    setConeIdx(0); setMistakes(0); dribbleStart.current = null;
    setRunClock(0);
    if (runTimer.current) { clearInterval(runTimer.current); runTimer.current = null; }
    setClicks(0); setPaceLeft(5.0); setPaceRunning(false);
    if (paceTimer.current) { clearInterval(paceTimer.current); paceTimer.current = null; }
    setPenNo(0); setGoals(0); setLastPen(null);
    setGkShotNo(0); setGkSaves(0); setGkTell(null); setGkShot(null); setGkLast(null);
    if (gkTimer.current) { clearTimeout(gkTimer.current); gkTimer.current = null; }
    setGateNo(0); setGateHits(0); setLitGate(null); setGateWindow(0);
    if (gateTimer.current) { clearTimeout(gateTimer.current); gateTimer.current = null; }
  };

  const openDrill = (d: TrainingDrill) => { resetDrills(); setDrill(d); setScreen(d); };

  /* ── dribbling handlers ── */
  const clickCone = (i: number) => {
    if (i !== coneIdx) { setMistakes(m => m + 1); return; }
    if (coneIdx === 0) {
      dribbleStart.current = Date.now();
      // Round 159: the stopwatch starts with the run and ticks on screen.
      runTimer.current = setInterval(() => {
        setRunClock(Date.now() - (dribbleStart.current ?? Date.now()));
      }, 100);
    }
    if (i === CONES.length - 1) {
      const elapsed = Date.now() - (dribbleStart.current ?? Date.now());
      if (runTimer.current) { clearInterval(runTimer.current); runTimer.current = null; }
      setRunClock(elapsed);
      const sc = 100 - mistakes * 8 - Math.max(0, elapsed - 4000) / 130;
      finish("dribbling", sc);
      return;
    }
    setConeIdx(i + 1);
  };

  /* ── pace handlers ── */
  const startPace = () => {
    setPaceRunning(true);
    setClicks(0);
    setPaceLeft(5.0);
    const startedAt = Date.now();
    paceTimer.current = setInterval(() => {
      const left = 5 - (Date.now() - startedAt) / 1000;
      if (left <= 0) {
        if (paceTimer.current) clearInterval(paceTimer.current);
        paceTimer.current = null;
        setPaceLeft(0);
        setPaceRunning(false);
      } else {
        setPaceLeft(left);
      }
    }, 100);
  };

  useEffect(() => {
    if (!paceRunning && paceLeft === 0 && screen === "pace") {
      finish("pace", clicks * 3.2);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paceRunning, paceLeft]);

  /* ── shooting handlers ── */
  const takePen = (zone: number) => {
    if (lastPen) return; // wait for the reveal to clear
    const dive = keeperPick();
    let result: string;
    let scored = false;
    if (zone <= 2 && Math.random() < 0.12) {
      result = "Blazed over the bar!";
    } else if (zone === dive) {
      result = "Saved! Keeper guessed right.";
    } else {
      result = "GOAL!";
      scored = true;
    }
    setLastPen({ shot: zone, dive, result });
    const g = goals + (scored ? 1 : 0);
    setGoals(g);
    setTimeout(() => {
      setLastPen(null);
      if (penNo === 4) finish("shooting", g * 20);
      else setPenNo(p => p + 1);
    }, 1100);
  };

  /* ── Round 159: keeper drill handlers. A tell flashes (honest about 65
        percent of the time), the shot comes, you dive by tapping a zone. ── */
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
      if (gkShotNo === 4) finish("shooting", s * 20);
      else { setGkShotNo(n => n + 1); gkNextShot(); }
    }, 1100);
  };

  /* ── Round 159: passing gates handlers. Eight gates, each lit for a
        shrinking window; tap the lit one in time or it counts as sailed
        out of play. ── */
  const GATE_COUNT = 8;
  const gateWindowFor = (n: number) => Math.max(650, 1400 - n * 100);
  const lightGate = (n: number) => {
    const g = Math.floor(Math.random() * 6);
    setLitGate(g);
    setGateWindow(gateWindowFor(n));
    gateTimer.current = setTimeout(() => {
      // Too slow: the gate shuts itself and the drill moves on.
      setLitGate(null);
      if (n === GATE_COUNT - 1) finish("passing", (gateHitsRef.current) * 12.5);
      else { gateNoRef.current = n + 1; setGateNo(n + 1); lightGate(n + 1); }
    }, gateWindowFor(n));
  };
  // Refs mirror the two counters so the timeout chain reads fresh values.
  const gateHitsRef = useRef(0);
  const gateNoRef = useRef(0);
  const tapGate = (g: number) => {
    if (litGate === null) return;
    if (gateTimer.current) { clearTimeout(gateTimer.current); gateTimer.current = null; }
    const hit = g === litGate;
    if (hit) { gateHitsRef.current += 1; setGateHits(h => h + 1); }
    setLitGate(null);
    const n = gateNoRef.current;
    if (n === GATE_COUNT - 1) {
      finish("passing", gateHitsRef.current * 12.5);
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

  const drillMeta: Record<TrainingDrill, { emoji: string; name: string; stat: string }> = {
    dribbling: { emoji: "🌀", name: "Cone Slalom", stat: "Dribbling" },
    pace: { emoji: "⚡", name: "Sprint Burst", stat: "Pace" },
    shooting: isGK
      ? { emoji: "🧤", name: "Shot Stopping", stat: "Reflexes" }
      : { emoji: "🎯", name: "Penalty Placement", stat: "Shooting" },
    passing: { emoji: "🚩", name: "Passing Gates", stat: "Passing" },
  };

  /* The keeper's first shot arrives shortly after the drill opens. */
  useEffect(() => {
    if (screen === "shooting" && isGK) {
      gkTimer.current = setTimeout(gkNextShot, 600);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, isGK]);

  const tierText = score >= 80 ? "Elite session! +2 " + drillMeta[drill].stat + " next season" :
    score >= 50 ? "Solid work. +1 " + drillMeta[drill].stat + " next season" :
    "Rough day. No gains this time";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-md max-h-[88vh] overflow-y-auto rounded-2xl border border-border bg-card text-foreground shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="text-base font-black">🏋️ Training Ground</h2>
          <button onClick={onClose} className="text-xs font-bold text-muted-foreground hover:text-foreground px-2 py-1 rounded bg-muted/30">Close</button>
        </div>

        {screen === "menu" && (
          <div className="p-4 space-y-3">
            {!available ? (
              <div className="rounded-xl border border-border bg-muted/10 p-6 text-center space-y-1">
                <div className="text-3xl">😮‍💨</div>
                <div className="text-sm font-bold">Already trained this season</div>
                <p className="text-[11px] text-muted-foreground">The gaffer says recovery matters too. Come back after the next season kicks off.</p>
              </div>
            ) : (
              <>
                <p className="text-[11px] text-muted-foreground text-center">One session per season. Score 50+ for a +1, 80+ for a +2 to that stat with next season's growth.</p>
                <div className="grid grid-cols-1 gap-2.5">
                  {(Object.keys(drillMeta) as TrainingDrill[]).map(d => (
                    <button key={d} onClick={() => openDrill(d)}
                      className="flex items-center gap-3 rounded-xl border border-border bg-muted/10 hover:bg-muted/25 p-3.5 text-left transition-colors">
                      <span className="text-3xl">{drillMeta[d].emoji}</span>
                      <span className="flex-1">
                        <span className="block text-sm font-black">{drillMeta[d].name}</span>
                        <span className="block text-[10px] text-muted-foreground">Trains {drillMeta[d].stat}</span>
                      </span>
                      <span className="text-muted-foreground">›</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {screen === "dribbling" && (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <button onClick={() => setScreen("menu")} className="text-muted-foreground hover:text-foreground">‹ Drills</button>
              <span>Cone {Math.min(coneIdx + 1, CONES.length)}/{CONES.length}</span>
              {/* Round 159: the stopwatch, live. His words: "there should be a
                  little stop watch going while u playing". */}
              <span className={`tabular-nums ${coneIdx > 0 ? "text-sky-300" : "text-muted-foreground"}`}>⏱ {(runClock / 1000).toFixed(1)}s</span>
              <span className="text-amber-400">{mistakes} slips</span>
            </div>
            <p className="text-[11px] text-muted-foreground text-center">Tap the glowing cones in order, bottom to top. Fast and clean scores best. The stopwatch starts on the first cone.</p>
            <div className="relative w-full h-80 rounded-xl border border-border overflow-hidden" style={{ background: "linear-gradient(180deg, #14532d, #166534)" }}>
              {/* pitch lines */}
              <div className="absolute inset-x-0 top-1/2 h-px bg-white/20" />
              <div className="absolute left-1/2 top-1/2 w-20 h-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20" />
              {CONES.map((c, i) => (
                <button key={i} onClick={() => clickCone(i)}
                  className={`absolute w-9 h-9 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center text-sm font-black transition-all ${
                    i < coneIdx ? "bg-emerald-500/40 text-white/50 scale-90" :
                    i === coneIdx ? "bg-amber-400 text-black animate-pulse scale-110 shadow-lg" :
                    "bg-white/15 text-white/70"
                  }`}
                  style={{ left: `${c.x}%`, top: `${c.y}%` }}>
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        )}

        {screen === "pace" && (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <button onClick={() => { if (!paceRunning) setScreen("menu"); }} className="text-muted-foreground hover:text-foreground">‹ Drills</button>
              <span className="tabular-nums">{paceLeft.toFixed(1)}s</span>
              <span className="text-emerald-400 tabular-nums">{clicks} steps</span>
            </div>
            {!paceRunning && paceLeft === 5.0 ? (
              <button onClick={startPace} className="w-full h-64 rounded-xl border-2 border-dashed border-border bg-muted/10 hover:bg-muted/20 text-center">
                <div className="text-4xl mb-2">🏁</div>
                <div className="text-sm font-black">Tap to start the 5 second sprint</div>
                <div className="text-[11px] text-muted-foreground">Then tap the track as fast as you can</div>
              </button>
            ) : (
              <button onClick={() => paceRunning && setClicks(c => c + 1)}
                className="w-full h-64 rounded-xl bg-gradient-to-b from-sky-900 to-sky-950 border border-border text-center select-none active:scale-[0.99]">
                <div className="text-5xl mb-2">🏃</div>
                <div className="text-2xl font-black tabular-nums">{clicks}</div>
                <div className="text-[11px] text-white/60">{paceRunning ? "GO GO GO" : "Time!"}</div>
              </button>
            )}
          </div>
        )}

        {screen === "shooting" && isGK && (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <button onClick={() => setScreen("menu")} className="text-muted-foreground hover:text-foreground">‹ Drills</button>
              <span>Shot {gkShotNo + 1}/5</span>
              <span className="text-emerald-400">{gkSaves} saved</span>
            </div>
            <p className="text-[11px] text-muted-foreground text-center">You are in goal. Watch the striker's hips for the tell, then tap where you dive. The tell is honest most of the time. Most of it.</p>
            <div className="relative w-full rounded-xl border border-border overflow-hidden p-4" style={{ background: "linear-gradient(180deg, #0c4a6e 0%, #14532d 70%)" }}>
              <div className="mx-auto w-full max-w-[320px] border-4 border-white/80 border-b-0 rounded-t-lg bg-black/20">
                <div className="grid grid-cols-3 grid-rows-2 h-40">
                  {ZONES.map(z => (
                    <button key={z.id} onClick={() => gkDive(z.id)}
                      className={`relative border border-white/15 transition-colors ${
                        gkTell === z.id ? "bg-amber-400/40 animate-pulse" : gkShot !== null && !gkLast ? "hover:bg-white/15" : ""
                      }`}>
                      {gkLast?.shot === z.id && <span className="absolute inset-0 flex items-center justify-center text-2xl">⚽</span>}
                      {gkLast?.dive === z.id && <span className="absolute inset-0 flex items-center justify-center text-3xl">🧤</span>}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-8 flex items-center justify-center">
                {gkTell !== null && <span className="text-sm font-black text-amber-300">He is shaping up...</span>}
                {gkShot !== null && !gkLast && <span className="text-sm font-black text-white">SHOT! Dive!</span>}
                {gkLast && <span className={`text-sm font-black ${gkLast.saved ? "text-emerald-300" : "text-red-300"}`}>{gkLast.saved ? "SAVED! What a stop!" : "In the net. Wrong way."}</span>}
              </div>
            </div>
          </div>
        )}

        {screen === "passing" && (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <button onClick={() => setScreen("menu")} className="text-muted-foreground hover:text-foreground">‹ Drills</button>
              <span>Pass {Math.min(gateNo + 1, GATE_COUNT)}/{GATE_COUNT}</span>
              <span className="text-emerald-400">{gateHits} through</span>
            </div>
            <p className="text-[11px] text-muted-foreground text-center">A gate lights up: hit it before it shuts. The windows get shorter as you go.</p>
            {litGate === null && gateNo === 0 && gateHits === 0 ? (
              <button onClick={startGates} className="w-full h-64 rounded-xl border-2 border-dashed border-border bg-muted/10 hover:bg-muted/20 text-center">
                <div className="text-4xl mb-2">🚩</div>
                <div className="text-sm font-black">Tap to start the passing drill</div>
                <div className="text-[11px] text-muted-foreground">Eight passes, shrinking windows</div>
              </button>
            ) : (
              <div className="relative w-full h-64 rounded-xl border border-border overflow-hidden p-3" style={{ background: "linear-gradient(180deg, #14532d, #166534)" }}>
                <div className="absolute inset-x-0 top-1/2 h-px bg-white/20" />
                <div className="grid grid-cols-3 grid-rows-2 gap-3 h-full">
                  {[0, 1, 2, 3, 4, 5].map(g => (
                    <button key={g} onClick={() => tapGate(g)}
                      className={`rounded-xl border-2 transition-all flex items-center justify-center text-2xl ${
                        litGate === g
                          ? "border-amber-300 bg-amber-400/30 animate-pulse scale-105"
                          : "border-white/20 bg-white/5"
                      }`}>
                      {litGate === g ? "🚩" : ""}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {screen === "shooting" && !isGK && (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <button onClick={() => setScreen("menu")} className="text-muted-foreground hover:text-foreground">‹ Drills</button>
              <span>Penalty {penNo + 1}/5</span>
              <span className="text-emerald-400">{goals} scored</span>
            </div>
            <p className="text-[11px] text-muted-foreground text-center">Pick your spot. The keeper dives where he guesses. Top corners are riskier but nothing feels better.</p>
            <div className="relative w-full rounded-xl border border-border overflow-hidden p-4" style={{ background: "linear-gradient(180deg, #0c4a6e 0%, #14532d 70%)" }}>
              <div className="mx-auto w-full max-w-[320px] border-4 border-white/80 border-b-0 rounded-t-lg bg-black/20">
                <div className="grid grid-cols-3 grid-rows-2 h-40">
                  {ZONES.map(z => (
                    <button key={z.id} onClick={() => takePen(z.id)}
                      className={`relative border border-white/15 transition-colors ${lastPen ? "" : "hover:bg-white/15"}`}>
                      {lastPen?.dive === z.id && <span className="absolute inset-0 flex items-center justify-center text-3xl">🧤</span>}
                      {lastPen?.shot === z.id && <span className="absolute inset-0 flex items-center justify-center text-2xl">⚽</span>}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-8 flex items-center justify-center">
                {lastPen && <span className="text-sm font-black text-white">{lastPen.result}</span>}
              </div>
            </div>
          </div>
        )}

        {screen === "result" && (
          <div className="p-5 space-y-4 text-center">
            <div className="text-4xl">{drillMeta[drill].emoji}</div>
            <div>
              <div className={`text-5xl font-black tabular-nums ${score >= 80 ? "text-emerald-400" : score >= 50 ? "text-sky-400" : "text-amber-400"}`}>{score}</div>
              <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">session score</div>
            </div>
            <p className="text-sm font-bold">{tierText}</p>
            {!banked ? (
              <button
                onClick={() => { setBanked(true); onComplete(drill, score); }}
                className="w-full h-11 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black">
                Bank the session
              </button>
            ) : (
              <button onClick={onClose} className="w-full h-11 rounded-lg bg-muted/40 hover:bg-muted/60 text-sm font-black">
                Back to your career
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
