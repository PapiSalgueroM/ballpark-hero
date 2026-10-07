/* ─── Round 913: the training ground, for every career ────────────────────

   This is Soccer Career's training panel (Round 81, grown in Rounds 159, 468
   and 784) with the soccer taken out: a menu of drill tiles, each drill takes
   over the panel, a result screen, one bank. What a sport brings is a skin
   (src/lib/careerTraining.ts): drill names, the words on every screen, the
   emoji, and the word for what each drill trains. Tile rule: small tiles and
   a back button everywhere, never a long page.

   The four drills keep their state here, in the panel, through their hooks,
   rather than inside their own screens. That is on purpose. It is where the
   state always lived. Abandoning a drill cancels its callbacks. The historical
   replay holds uninterrupted mechanics while lifecycle tests cover pausing,
   cancellation and restarting without an old result leaking into a new run.

   Screens: "menu", "drill" (the open drill is `drill`), "result", or the id
   of an extra, so an extra may not be called any of those three. */
import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { usePracticeClock } from '@/hooks/usePracticeClock';
import { focusDialogOnMount, escapeCloses } from '@/lib/dialogA11y';
import { trainingScore, trainingTier, type TrainingSport } from '@/lib/careerTraining';
import ConeRunDrill, { useConeRun } from '@/components/career/drills/ConeRunDrill';
import BurstTapDrill, { useBurstTap } from '@/components/career/drills/BurstTapDrill';
import ZonePickDrill, { useZonePick } from '@/components/career/drills/ZonePickDrill';
import GateTapDrill, { useGateTap } from '@/components/career/drills/GateTapDrill';
import feedback from '@/components/soccer-career/TrainingFeedback.module.css';

/** A tile on the menu that opens a screen of the game's own (Soccer Career's
    position drill and First Touch live here). */
export interface TrainingExtra {
  id: string;
  tile: (open: () => void) => ReactNode;
  screen: (back: () => void) => ReactNode;
}

export default function TrainingGround<Id extends string>({ sport, available, onComplete, onClose, extras = [], bankedNote, instructions }: {
  sport: TrainingSport<Id>;
  /** false once this season's session has been banked */
  available: boolean;
  onComplete: (drill: Id, score: number) => void;
  onClose: () => void;
  extras?: TrainingExtra[];
  bankedNote?: string;
  instructions?: string;
}) {
  const [screen, setScreen] = useState<string>("menu");
  const [drill, setDrill] = useState<Id>(sport.drills[0].id);
  const [score, setScore] = useState(0);
  const [banked, setBanked] = useState(false);
  const [showRules, setShowRules] = useState(false);

  const skin = sport.drills.find(d => d.id === drill) ?? sport.drills[0];
  const playing = screen === "drill";
  const clock = usePracticeClock(playing);
  const attemptRef = useRef(0);
  const attempt = attemptRef.current;
  useEffect(() => () => { attemptRef.current += 1; }, []);

  const finish = (d: Id, sc: number) => {
    if (attempt !== attemptRef.current || !playing || clock.isPaused()) return;
    clock.clearAll();
    setDrill(d);
    setScore(trainingScore(sc));
    setScreen("result");
  };
  const done = (sc: number) => finish(drill, sc);

  const cone = useConeRun(done, clock);
  const burst = useBurstTap(playing && skin.kind === "burst", done, clock);
  const zone = useZonePick(playing && skin.kind === "zones" && skin.mode === "save", done, clock);
  const gate = useGateTap(done, clock);

  const openDrill = (d: Id) => {
    attemptRef.current += 1;
    clock.reset();
    cone.reset(); burst.reset(); zone.reset(); gate.reset();
    setShowRules(false);
    setDrill(d);
    setScreen("drill");
  };
  const toMenu = () => {
    attemptRef.current += 1;
    clock.reset();
    cone.reset(); burst.reset(); zone.reset(); gate.reset();
    setShowRules(false);
    setScreen("menu");
  };
  const close = () => { attemptRef.current += 1; clock.clearAll(); onClose(); };

  const tier = trainingTier(score);
  const tierText = sport.tierLine(tier, skin.stat);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={close}>
      <div role="dialog" aria-modal="true" aria-label={sport.label} data-practice-screen={screen} data-practice-paused={clock.paused} tabIndex={-1} ref={focusDialogOnMount} onKeyDown={e => {
        escapeCloses(close)(e);
        if (!instructions || e.key !== 'Tab') return;
        const buttons = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === e.currentTarget)) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }} className="w-full max-w-md max-h-[88vh] overflow-y-auto rounded-2xl border border-border bg-card text-foreground shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="text-base font-black">{sport.title}</h2>
          {instructions && <button aria-label="Practice rules" aria-expanded={showRules || screen === 'menu'} onClick={() => { if (playing) clock.pause(); setShowRules(s => !s); }} className="min-h-11 min-w-11 rounded-lg bg-muted/30 font-bold">?</button>}
          <button onClick={close} className={instructions ? "min-h-11 rounded-lg bg-muted/30 px-3 text-xs font-bold" : "min-h-11 min-w-11 text-xs font-bold text-muted-foreground hover:text-foreground px-2 py-1 rounded bg-muted/30"}>Close</button>
        </div>

        {instructions && (showRules || screen === 'menu') && <p className="border-b border-border bg-primary/5 p-4 text-xs leading-relaxed" data-practice-rules>{instructions}</p>}
        {playing && <div data-practice-chrome className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
          <p role="status" className="text-xs text-muted-foreground">{clock.paused ? 'Paused. Your time and score are saved for this drill.' : 'Take a break whenever you need.'}</p>
          <button data-practice-pause onClick={() => { if (clock.isPaused()) { setShowRules(false); clock.resume(); } else clock.pause(); }} className="min-h-11 min-w-11 shrink-0 rounded-lg bg-muted/30 px-3 text-xs font-bold">{clock.paused ? 'Resume practice' : 'Pause practice'}</button>
        </div>}

        {screen === "menu" && (
          <div className="p-4 space-y-3">
            {extras.map(e => <Fragment key={e.id}>{e.tile(() => setScreen(e.id))}</Fragment>)}
            {!available ? (
              <div className="rounded-xl border border-border bg-muted/10 p-6 text-center space-y-1">
                <div className="text-3xl">{sport.shut.emoji}</div>
                <div className="text-sm font-bold">{sport.shut.title}</div>
                <p className="text-[11px] text-muted-foreground">{sport.shut.body}</p>
              </div>
            ) : (
              <>
                <p className="text-[11px] text-muted-foreground text-center">{sport.rule}</p>
                {sport.note && (
                  <p className="text-[11px] text-muted-foreground text-center" {...{ [`data-training-${sport.note.marker}-rule`]: true }}>
                    {sport.note.text}
                  </p>
                )}
                <div className="grid grid-cols-1 gap-2.5">
                  {sport.drills.map(d => (
                    <button key={d.id} onClick={() => openDrill(d.id)}
                      className="flex items-center gap-3 rounded-xl border border-border bg-muted/10 hover:bg-muted/25 p-3.5 text-left transition-colors">
                      <span className="text-3xl">{d.emoji}</span>
                      <span className="flex-1">
                        <span className="block text-sm font-black">{d.name}</span>
                        <span className="block text-[10px] text-muted-foreground">Trains {d.stat}</span>
                      </span>
                      <span className="text-muted-foreground">›</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {extras.map(e => screen === e.id && <Fragment key={e.id}>{e.screen(toMenu)}</Fragment>)}

        {playing && skin.kind === "cones" && <ConeRunDrill skin={skin} run={cone} onBack={toMenu} />}
        {playing && skin.kind === "burst" && <BurstTapDrill skin={skin} run={burst} onBack={toMenu} />}
        {playing && skin.kind === "zones" && <ZonePickDrill skin={skin} run={zone} onBack={toMenu} />}
        {playing && skin.kind === "gates" && <GateTapDrill skin={skin} run={gate} onBack={toMenu} />}

        {screen === "result" && (
          <div className="p-5 space-y-4 text-center" data-training-result={drill}>
            <div className={`space-y-4 ${feedback.result}`} data-training-summary>
              <div className="text-4xl">{skin.emoji}</div>
              <div>
                <div data-training-score className={`text-5xl font-black tabular-nums ${tier === 2 ? "text-emerald-400" : tier === 1 ? "text-sky-400" : "text-amber-400"}`}>{score}</div>
                <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{sport.scoreLabel}</div>
              </div>
              <p className="text-sm font-bold" role={bankedNote && banked ? 'status' : undefined}>{banked && bankedNote ? bankedNote : tierText}</p>
            </div>
            {!banked ? (
              <button
                onClick={() => { setBanked(true); onComplete(drill, score); }}
                className="w-full h-11 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-black text-sm font-black">
                {sport.bank}
              </button>
            ) : (
              <button onClick={close} data-training-banked className={`w-full h-11 rounded-lg bg-muted/40 hover:bg-muted/60 text-sm font-black ${feedback.banked}`}>
                {sport.done}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
