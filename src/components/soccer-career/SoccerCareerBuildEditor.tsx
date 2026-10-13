import { useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRevealScroll } from "@/hooks/useRevealScroll";
import { allocOverall, normalizeAllocation, allocMax, ALLOC_MIN, playsLike, stepAllocation } from "@/lib/careerEras";
import {
  type PlayerPhysique, type AttrShape,
  attrTreeFor, deriveAttributes, buildEffects, effectsSummary, safePhysique,
  applyFamilyOffset, defaultPhysique, heightLabel, weightLabel, buildLabel,
  SHAPE_MAX, HEIGHT_MIN, HEIGHT_MAX, WEIGHT_MIN, WEIGHT_MAX,
} from "@/lib/soccerCareerAttributes";

type Stats = { pace: number; shooting: number; passing: number; dribbling: number; defending: number; physical: number; reflexes: number };

/* ─── Round 131: the stepper he asked for ───

   His words: "It takes forever to manually change the overall of stuff, I
   would prefer if we had like a jump by 5 feature too, or just write the
   number u wanna start with."

   Both, because both are cheap. Minus five, minus one, a box you can type
   straight into, plus one, plus five. The typing is the part that has to be
   careful: the box holds whatever you type as text while you are typing, so
   backspacing to empty does not slam the value to the minimum under your
   finger, but the VALUE it reports is always a clamped whole number, never
   NaN and never out of the legal window. Blur or Enter tidies the text back up
   to the committed number.

   The clamp window is passed in rather than assumed, because on the build
   screen the top of the window is not a constant: it is whichever comes first
   out of the per stat cap and how many points you still have left to spend. */
function NumberStepper({ value, min, max, onChange, label, disabled, wide }: {
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
  label: string;
  disabled?: boolean;
  wide?: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const clampTo = (v: number) => Math.max(min, Math.min(max, Math.round(v)));
  const commit = (raw: string) => {
    /* Keep a leading minus, because the shaping steppers run from -12 to +12,
       and throw away everything that is not a digit. */
    const digits = (raw.match(/-?\d*/) || [""])[0];
    if (digits === "" || digits === "-") { setDraft(digits); return; }
    const n = Number(digits);
    if (!Number.isFinite(n)) { setDraft(""); return; }
    const c = clampTo(n);
    onChange(c);
    /* Found by driving it at 390 wide: typing 99999 into the overall box left
       99999 sitting in it while the career underneath was correctly 99, which
       reads as a broken control even though nothing was broken. The box keeps
       what you typed only while what you typed is legal. */
    setDraft(c === n ? digits : String(c));
  };
  const btn = "h-8 w-8 shrink-0 rounded-md border border-border bg-muted/20 text-[11px] font-black text-foreground disabled:opacity-30 active:scale-95 transition-transform";
  return (
    <div className="flex items-center gap-1">
      <button type="button" aria-label={`${label} down 5`} disabled={disabled || value <= min} onClick={() => onChange(clampTo(value - 5))} className={btn}>-5</button>
      <button type="button" aria-label={`${label} down 1`} disabled={disabled || value <= min} onClick={() => onChange(clampTo(value - 1))} className={btn}>-1</button>
      <input
        aria-label={label}
        inputMode="numeric"
        pattern="[0-9]*"
        disabled={disabled}
        value={draft ?? String(value)}
        onChange={(e) => commit(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={() => setDraft(null)}
        onKeyDown={(e) => { if (e.key === "Enter") { setDraft(null); (e.currentTarget as HTMLInputElement).blur(); } }}
        className={`${wide ? "w-16" : "w-12"} h-8 shrink-0 rounded-md border border-border bg-background text-center text-sm font-black tabular-nums focus:border-emerald-500`}
      />
      <button type="button" aria-label={`${label} up 1`} disabled={disabled || value >= max} onClick={() => onChange(clampTo(value + 1))} className={btn}>+1</button>
      <button type="button" aria-label={`${label} up 5`} disabled={disabled || value >= max} onClick={() => onChange(clampTo(value + 5))} className={btn}>+5</button>
    </div>
  );
}

/* ─── Round 79 build editor, rebuilt in Round 131 ───

   Three things changed and all three came straight off his list.

   ONE, THE OVERALL CAP IS GONE. "And there shouldn't be a cap on overalls.
   Like 99 obviously, but when ur building ur player there shouldn't." So the
   starting overall is a control now and it runs all the way to 99.

   That is the easy half. The honest half is that a career which starts at 99
   with nothing left to chase is a WORSE game than one that starts at 62, and
   permitting the choice without answering it would have been the lazy version.
   So the screen answers it in three ways, in view, at the moment you make the
   choice. It shows you your headroom, and the headroom is the whole growth
   economy: at 99 you have none, so training, the shop, the ceiling push and
   every development system in the game are switched off for you on day one. It
   shows you the ceiling the roll gave you and how a high start eats the
   distance to it. And when you retire, the verdict knows what you started at,
   so climbing from 54 to 91 reads as a bigger career than being handed 99 and
   staying there, which is exactly how anybody actually talks about a
   footballer.

   TWO, THE STEPPERS. Minus five, minus one, type it, plus one, plus five, on
   every row including the overall itself.

   THREE, THE SHAPE UNDERNEATH. Each family opens its own screen where you
   split it between the specifics a football person would name, and the frame
   tile sets your height and weight. Both feed real multipliers on goals,
   assists, games played, rating and injury risk, so two strikers with the same
   overall genuinely play differently.

   The tile rule is why all of that is behind three small tiles instead of
   stacked into one enormous scroll. */

type BuildScreen = { kind: "root" } | { kind: "family"; key: string } | { kind: "frame" };

const BUILD_OVR_MIN = 40;
const BUILD_OVR_MAX = 99;

export default function BuildEditor({ position, targetOvr, baseStats, rolledPot, physique, onPhysique, shape, onShape, onConfirm, onCancel }: {
  position: string;
  targetOvr: number;
  baseStats: Stats;
  rolledPot: number | null;
  physique: PlayerPhysique;
  onPhysique: (p: PlayerPhysique) => void;
  shape: AttrShape;
  onShape: (s: AttrShape) => void;
  onConfirm: (stats: Stats, calcOvr: number) => void;
  onCancel: () => void;
}) {
  /* Round 131: the six rows are named off the attribute tree rather than off
     allocRowsFor. Same keys, same maths, but the tree is the canonical shape
     now, so the row on the build screen, the screen it opens and the bars on
     the career page all use the one set of names. Before this, a striker's
     shooting row was labelled "Finishing", it opened a screen headed
     "Shooting", and the first attribute inside that screen was also called
     "Finishing", which is three names for two different things. */
  const rows = attrTreeFor(position).map(f => ({ key: f.key as string, label: f.label }));
  const sumOf = (s: Stats) => rows.reduce((a, r) => a + ((s as any)[r.key] as number), 0);
  const startRef = useRef<{ stats: Stats; ovr: number } | null>(null);
  if (startRef.current === null) startRef.current = { stats: normalizeAllocation(baseStats, position, targetOvr) as Stats, ovr: targetOvr };

  const [target, setTarget] = useState(targetOvr);
  const [alloc, setAlloc] = useState<Stats>(startRef.current.stats);
  const [budget, setBudget] = useState(() => sumOf(startRef.current!.stats));
  const [screen, setScreen] = useState<BuildScreen>({ kind: "root" });
  /* NO SCROLL RULE, and this one was found by driving it at 390 wide rather
     than by reading the code. The Customize your build button sits near the
     bottom of a long creation screen, so by the time you reach it the page is
     three thousand pixels down. Swapping in a shorter full screen editor left
     the window exactly where it was, which put the player in the middle of the
     page's own How To Play copy with the thing he just opened somewhere above
     him. Same for every drill in from here. The house hook does the right
     thing already: it puts the top of the new screen just under whatever is
     pinned to the top of the window, and it does nothing at all when the new
     screen is already readable. skipFirst is off because a fresh mount IS the
     reveal here, unlike an overlay that appears inside a page. */
  const revealRef = useRevealScroll<HTMLDivElement>(
    screen.kind === "family" ? `family:${screen.key}` : screen.kind,
    { skipFirst: false },
  );

  const spent = sumOf(alloc);
  const pool = budget - spent;
  const maxStat = allocMax(target);
  const liveOvr = allocOverall(alloc, position);
  const comp = playsLike(alloc, position);
  const ceiling = Math.min(99, Math.max(rolledPot ?? liveOvr + 6, liveOvr + 2));
  const headroom = Math.max(0, ceiling - liveOvr);
  const fx = buildEffects(alloc, position, liveOvr, physique, shape);
  const fxLines = effectsSummary(fx, position);

  /* Changing the starting overall renormalizes the whole line onto the new
     number and resets the pool to match, so you can never end up with a budget
     that belongs to an overall you have since moved away from. */
  const retarget = (next: number) => {
    const t = Math.max(BUILD_OVR_MIN, Math.min(BUILD_OVR_MAX, Math.round(next)));
    if (t === target) return;
    const line = normalizeAllocation(alloc, position, t) as Stats;
    setTarget(t);
    setAlloc(line);
    setBudget(sumOf(line));
  };

  /* Both of these are one line because the rules they enforce live in the libs
     rather than in this component. That is deliberate: scripts/simCreation.mjs
     fuzzes the exact same two functions a quarter of a million times, which it
     could not do if the rules only existed inside a React handler. */
  const setStat = (key: string, next: number) => {
    setAlloc(prev => stepAllocation(prev as any, position, key as any, next, budget, target) as Stats);
  };

  const setOffset = (famKey: string, id: string, next: number) => {
    onShape(applyFamilyOffset(position, shape, famKey, id, next));
  };

  const backBar = (title: string, onBack: () => void) => (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" onClick={onBack} className="h-8 px-2 text-muted-foreground">← Back</Button>
      <h1 className="text-base font-black truncate">{title}</h1>
    </div>
  );

  /* ── Frame screen: height and weight ── */
  if (screen.kind === "frame") {
    const derived = deriveAttributes(alloc, position, physique, shape).filter(d => d.frameDelta !== 0);
    derived.sort((a, b) => Math.abs(b.frameDelta) - Math.abs(a.frameDelta));
    return (
      <div ref={revealRef} className="max-w-xl mx-auto space-y-3 animate-fade-in">
        {backBar("Height and Weight", () => setScreen({ kind: "root" }))}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-bold">Height</span>
              <span className="text-[11px] text-muted-foreground tabular-nums">{heightLabel(physique.heightCm)}</span>
            </div>
            <NumberStepper label="Height in centimetres" value={physique.heightCm} min={HEIGHT_MIN} max={HEIGHT_MAX} wide
              onChange={(v) => onPhysique(safePhysique(position, { ...physique, heightCm: v }))} />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-bold">Weight</span>
              <span className="text-[11px] text-muted-foreground tabular-nums">{weightLabel(physique.weightKg)}</span>
            </div>
            <NumberStepper label="Weight in kilograms" value={physique.weightKg} min={WEIGHT_MIN} max={WEIGHT_MAX} wide
              onChange={(v) => onPhysique(safePhysique(position, { ...physique, weightKg: v }))} />
          </div>
          <div className="rounded-lg bg-muted/20 px-3 py-2 text-center">
            <span className="text-xs font-bold">{buildLabel(physique)}</span>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 space-y-2">
          <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">What your frame is doing</div>
          {derived.length === 0 && <p className="text-[11px] text-muted-foreground">Textbook size for this position, so nothing is pushed either way.</p>}
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {derived.slice(0, 12).map(d => (
              <div key={d.id} className="flex items-center justify-between gap-1">
                <span className="text-[11px] text-muted-foreground truncate">{d.label}</span>
                <span className={`text-[11px] font-black tabular-nums ${d.frameDelta > 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {d.frameDelta > 0 ? "+" : ""}{d.frameDelta}
                </span>
              </div>
            ))}
          </div>
        </div>
        <Button variant="outline" className="w-full h-11 text-sm font-bold"
          onClick={() => onPhysique(defaultPhysique(position))}>↩️ Back to a normal frame</Button>
        <Button className="w-full h-11 text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-black" onClick={() => setScreen({ kind: "root" })}>Done</Button>
      </div>
    );
  }

  /* ── Family screen: split one family between its specifics ── */
  if (screen.kind === "family") {
    const fam = attrTreeFor(position).find(f => f.key === screen.key);
    if (!fam) { setScreen({ kind: "root" }); return null; }
    const famValue = (alloc as any)[fam.key] as number;
    const derived = deriveAttributes(alloc, position, physique, shape);
    return (
      <div ref={revealRef} className="max-w-xl mx-auto space-y-3 animate-fade-in">
        {backBar(fam.label, () => setScreen({ kind: "root" }))}
        <div className="bg-card border border-border rounded-xl p-3 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{fam.label}</div>
            <div className="text-2xl font-black tabular-nums">{famValue}</div>
          </div>
          <p className="text-[10px] text-muted-foreground text-right max-w-[62%] leading-snug">
            Push one up and the others come down. The average never moves, so shaping your player here cannot change your overall.
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 space-y-2.5">
          {fam.children.map(c => {
            const d = derived.find(x => x.id === c.id);
            const off = shape[c.id] ?? 0;
            return (
              <div key={c.id} className="rounded-lg border border-border/60 bg-muted/10 p-2 space-y-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-bold truncate">{c.label}</span>
                  <span className="text-sm font-black tabular-nums shrink-0">{d?.value ?? famValue}</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-snug">{c.does}</p>
                <NumberStepper label={`${c.label} shaping`} value={off} min={-SHAPE_MAX} max={SHAPE_MAX}
                  onChange={(v) => setOffset(fam.key, c.id, v)} />
              </div>
            );
          })}
        </div>
        <Button className="w-full h-11 text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-black" onClick={() => setScreen({ kind: "root" })}>Done</Button>
      </div>
    );
  }

  /* ── Root ── */
  return (
    <div ref={revealRef} className="max-w-xl mx-auto space-y-3 animate-fade-in">
      {backBar("🎮 Build Your Player", onCancel)}

      <div className="bg-card border border-border rounded-xl p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Starting overall</div>
            <div className="text-3xl font-black tabular-nums leading-none">{liveOvr}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Room to grow</div>
            <div className={`text-3xl font-black tabular-nums leading-none ${headroom >= 20 ? "text-emerald-400" : headroom >= 8 ? "text-amber-400" : "text-red-400"}`}>{headroom}</div>
          </div>
        </div>
        <NumberStepper label="Starting overall" value={target} min={BUILD_OVR_MIN} max={BUILD_OVR_MAX} wide onChange={retarget} />
        <p className="text-[10px] text-muted-foreground leading-snug">
          {headroom <= 2
            ? `Start here and you are finished before you begin. Scouts have you at a ${ceiling} ceiling, so there is nothing left to train for and the whole development side of the game is switched off for you. Your legacy is judged on how far you climbed, and this is a climb of ${Math.max(0, ceiling - liveOvr)}.`
            : headroom <= 10
              ? `Scouts have you at a ${ceiling} ceiling, so there are ${headroom} points left in you. Starting this high buys the good years now and spends most of the climb.`
              : `Scouts have you at a ${ceiling} ceiling, so there are ${headroom} points left in you. Start low and the climb is the game.`}
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl p-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Points to spend</span>
          <span className={`text-lg font-black tabular-nums ${pool > 0 ? "text-emerald-400" : "text-foreground"}`}>{pool}</span>
        </div>
        {rows.map(r => {
          const v = (alloc as any)[r.key] as number;
          const famTop = deriveAttributes(alloc, position, physique, shape)
            .filter(d => d.family === r.key)
            .reduce((best, d) => (best && best.value >= d.value ? best : d), null as any);
          /* Found at 320 wide: the name, the bar and the standout attribute all
             on one line pushed a keeper's build screen 68px off the side of the
             phone, because "Aerial Command" and "Claiming Crosses 62" are both
             long and neither of them can shrink. The bar gets its own line
             instead, which is easier to read anyway. */
          return (
            <div key={r.key} className="rounded-lg border border-border/60 bg-muted/10 p-2 space-y-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <button type="button" onClick={() => setScreen({ kind: "family", key: r.key })} className="flex items-center gap-1 min-w-0 flex-1 text-left">
                  <span className="text-xs font-bold truncate">{r.label}</span>
                  <ChevronRight className="w-3 h-3 shrink-0 opacity-60" />
                </button>
                <span className="text-[10px] text-muted-foreground truncate max-w-[52%] tabular-nums">{famTop ? `${famTop.label} ${famTop.value}` : ""}</span>
              </div>
              <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.min(100, v)}%` }} />
              </div>
              <NumberStepper label={r.label} value={v} min={ALLOC_MIN} max={Math.min(maxStat, v + Math.max(0, pool))} onChange={(n) => setStat(r.key, n)} />
            </div>
          );
        })}
        <p className="text-[10px] text-muted-foreground text-center">Take points out of one to spend on another. Cap {maxStat} per attribute at this overall. Tap a name to shape what is underneath it.</p>
      </div>

      <button type="button" onClick={() => setScreen({ kind: "frame" })} className="w-full bg-card border border-border rounded-xl p-3 flex items-center justify-between text-left active:scale-[0.99] transition-transform">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Height and weight</div>
          <div className="text-sm font-black truncate">{physique.heightCm} cm · {physique.weightKg} kg</div>
          <div className="text-[10px] text-muted-foreground truncate">{buildLabel(physique)}</div>
        </div>
        <ChevronRight className="w-4 h-4 shrink-0 opacity-60" />
      </button>

      <div className="bg-card border border-border rounded-xl p-3 space-y-1.5">
        <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">What this build does to your seasons</div>
        <div className="flex flex-wrap gap-1.5">
          {fxLines.map(l => (
            <span key={l} className="px-2 py-1 rounded-md bg-muted/30 text-[11px] font-bold">{l}</span>
          ))}
        </div>
        <div className="pt-1 text-[11px] text-muted-foreground">
          Scouts say you play like <span className="font-black text-foreground">{comp.name}</span>
          {comp.pct > 0 ? ` (${comp.pct}% match)` : ""}
        </div>
      </div>

      {/* Stacked on a narrow phone. These two have sat side by side since
          Round 79 and shadcn's Button carries whitespace-nowrap, so at 320
          wide the Lock In button ran 68px off the right hand edge of the
          screen and could not be pressed. Nobody had measured this screen at
          320 before. */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Button variant="outline" className="w-full sm:flex-1 h-11 text-sm font-bold" onClick={() => {
          const s = startRef.current as { stats: Stats; ovr: number };
          setTarget(s.ovr); setAlloc(s.stats); setBudget(sumOf(s.stats));
          onPhysique(defaultPhysique(position)); onShape({});
        }}>↩️ Reset to scout build</Button>
        <Button className="w-full sm:flex-1 h-11 text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-black disabled:opacity-40" disabled={pool !== 0} onClick={() => onConfirm(alloc, liveOvr)}>
          {pool !== 0 ? `Spend your ${pool} points first` : "✅ Lock in build"}
        </Button>
      </div>
    </div>
  );
}
