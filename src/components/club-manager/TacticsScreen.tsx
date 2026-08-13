import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Wand2 } from 'lucide-react';
import {
  FORMATIONS, MENTALITIES, resolveXI, isAvailable, xiAverageRating,
  slotPosition, defensiveLineY, lineLabel,
} from '@/lib/clubManager';
import type { CareerState, CMPlayer, Mentality } from '@/lib/clubManager';
import { ratingTint } from '@/components/club-manager/SquadScreen';

const lastName = (n: string) => n.replace(' (Youth)', '').split(' ').slice(-1)[0];

/** How far a press has to travel before we call it a drag instead of a tap. */
const DRAG_SLOP = 6;

interface TacticsScreenProps {
  career: CareerState;
  onFormation: (idx: number) => void;
  onMentality: (m: Mentality) => void;
  onSlot: (slotIdx: number, playerId: string | null) => void;
  onSwap: (a: number, b: number) => void;
  onAutoPick: () => void;
}

/**
 * Formation, mentality and the XI on a mini pitch.
 *
 * Round 114, both halves of the same complaint from the owner: "Something I
 * don't like is that you can't drag the players on the tactics side. Also I
 * would love to see an animation or something for when u click defensive or
 * balanced or attacking."
 *
 * DRAGGING runs on pointer events with setPointerCapture, not mouse handlers
 * and not a drag library, because most of the traffic here is a phone. The
 * token carries touch-action none so the browser does not steal the gesture
 * for a scroll. Tapping without moving still opens the old picker dialog, so
 * anyone who cannot drag (keyboard, screen reader, a stylus that skips) has
 * exactly the path they had before.
 *
 * THE ANIMATION is one CSS transition on transform per token. Positions come
 * out of the engine (slotPosition) as percentages of the pitch, get turned
 * into pixels against the measured pitch box, and ride in a translate3d, so
 * the browser can move the whole shape on the compositor. Nothing animates
 * left or top. prefers-reduced-motion kills the transition, so the shape jumps
 * straight to its new spot instead of sliding.
 */
export function TacticsScreen({ career, onFormation, onMentality, onSlot, onSwap, onAutoPick }: TacticsScreenProps) {
  const [openSlot, setOpenSlot] = useState<number | null>(null);
  // A one-shot pitch flourish on top of the shape move, keyed so it replays.
  const [mentPulse, setMentPulse] = useState(0);
  const pitchRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  // Held off for one frame so the shape does not slide in from nowhere on mount.
  const [ready, setReady] = useState(false);
  const [drag, setDrag] = useState<{ from: number; dx: number; dy: number; over: number } | null>(null);
  const pressRef = useRef<{ from: number; startX: number; startY: number; moved: boolean } | null>(null);
  // A drag ends in a click event on most engines. This stops that click from
  // opening the picker on top of the swap you just made.
  const clickGuard = useRef(0);

  const formation = FORMATIONS[career.formationIndex];
  const xi = resolveXI(career);
  const slot = openSlot !== null ? formation.slots[openSlot] : null;
  const usedIds = new Set(career.xiIds.filter((id): id is string => !!id));
  const lineY = defensiveLineY(formation, career.mentality);
  const baseLineY = defensiveLineY(formation, 'balanced');

  useLayoutEffect(() => {
    const el = pitchRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setBox({ w: r.width, h: r.height });
    };
    measure();
    const raf = requestAnimationFrame(() => setReady(true));
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', measure); };
    }
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  const pickMentality = (m: Mentality) => {
    onMentality(m);
    setMentPulse(p => p + 1);
  };

  /** Nearest spot to a screen point, or -1 if the point is nowhere near one. */
  const slotUnder = useCallback((clientX: number, clientY: number): number => {
    const el = pitchRef.current;
    if (!el) return -1;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return -1;
    const px = ((clientX - r.left) / r.width) * 100;
    const py = ((clientY - r.top) / r.height) * 100;
    let best = -1;
    let bestDist = Infinity;
    for (let i = 0; i < formation.slots.length; i++) {
      const pos = slotPosition(formation.slots[i], career.mentality);
      // The pitch is taller than it is wide, so measure in real pixels.
      const ddx = ((pos.x - px) / 100) * r.width;
      const ddy = ((pos.y - py) / 100) * r.height;
      const dist = Math.sqrt(ddx * ddx + ddy * ddy);
      if (dist < bestDist) { bestDist = dist; best = i; }
    }
    return bestDist <= Math.max(48, r.width * 0.17) ? best : -1;
  }, [formation, career.mentality]);

  /** Pointer delta, held inside the grass so a lifted token never disappears. */
  const clampDelta = (from: number, rawX: number, rawY: number) => {
    const el = pitchRef.current;
    const r = el?.getBoundingClientRect();
    if (!r || !r.width || !r.height) return { dx: rawX, dy: rawY };
    const base = slotPosition(formation.slots[from], career.mentality);
    const minX = ((4 - base.x) / 100) * r.width;
    const maxX = ((96 - base.x) / 100) * r.width;
    const minY = ((4 - base.y) / 100) * r.height;
    const maxY = ((96 - base.y) / 100) * r.height;
    return {
      dx: Math.max(minX, Math.min(maxX, rawX)),
      dy: Math.max(minY, Math.min(maxY, rawY)),
    };
  };

  const handleDown = (i: number) => (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button > 0) return;
    pressRef.current = { from: i, startX: e.clientX, startY: e.clientY, moved: false };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* engine without capture, drag still tracks */ }
  };

  const handleMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const p = pressRef.current;
    if (!p) return;
    const rawX = e.clientX - p.startX;
    const rawY = e.clientY - p.startY;
    if (!p.moved && Math.abs(rawX) + Math.abs(rawY) < DRAG_SLOP) return;
    p.moved = true;
    const { dx, dy } = clampDelta(p.from, rawX, rawY);
    setDrag({ from: p.from, dx, dy, over: slotUnder(e.clientX, e.clientY) });
  };

  const handleUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const p = pressRef.current;
    pressRef.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* nothing to release */ }
    if (!p) return;
    if (p.moved) {
      clickGuard.current = Date.now();
      const target = slotUnder(e.clientX, e.clientY);
      if (target >= 0 && target !== p.from) onSwap(p.from, target);
    }
    setDrag(null);
  };

  const handleCancel = () => { pressRef.current = null; setDrag(null); };

  const openPicker = (i: number) => {
    if (Date.now() - clickGuard.current < 500) return;
    setOpenSlot(i);
  };

  const candidates: CMPlayer[] = slot
    ? [...career.squad]
        .filter(p => isAvailable(p))
        .sort((a, b) => {
          const aFit = slot.allowed.includes(a.position) ? 1 : 0;
          const bFit = slot.allowed.includes(b.position) ? 1 : 0;
          return bFit - aFit || b.rating - a.rating;
        })
    : [];

  const dragName = drag ? (xi[drag.from] ? lastName(xi[drag.from]!.name) : 'that spot') : '';
  const overName = drag && drag.over >= 0 && drag.over !== drag.from
    ? (xi[drag.over] ? lastName(xi[drag.over]!.name) : formation.slots[drag.over].label)
    : '';

  return (
    <div className="space-y-4">
      {/* Formation */}
      <div>
        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">Formation</div>
        <div className="flex flex-wrap gap-1.5">
          {FORMATIONS.map((f, i) => (
            <button
              key={f.name}
              onClick={() => onFormation(i)}
              className={cn(
                'px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all',
                i === career.formationIndex
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card border-border text-foreground hover:border-primary',
              )}
            >
              {f.name}
            </button>
          ))}
        </div>
      </div>

      {/* Mentality */}
      <div>
        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">Mentality</div>
        <div className="grid grid-cols-3 gap-1.5">
          {MENTALITIES.map(m => (
            <button
              key={m.id}
              data-cm-mentality-btn={m.id}
              onClick={() => pickMentality(m.id)}
              className={cn(
                'rounded-lg border p-2 text-center transition-all',
                career.mentality === m.id ? 'bg-primary/10 border-primary' : 'bg-card border-border hover:border-primary',
              )}
            >
              <div className="text-base">{m.emoji}</div>
              <div className={cn('text-[10px] font-bold', career.mentality === m.id ? 'text-primary' : 'text-foreground')}>{m.label}</div>
              <div className="text-[8px] text-muted-foreground leading-tight hidden md:block">{m.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Pitch */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">
            Starting XI · avg <span className="text-primary font-bold">{xiAverageRating(career)}</span>
          </div>
          <button
            onClick={onAutoPick}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:opacity-80 transition-opacity"
          >
            <Wand2 className="w-3.5 h-3.5" /> Auto Pick
          </button>
        </div>
        <style>{`
          @keyframes cmSurge { 0% { opacity: 0; transform: translateY(0); } 30% { opacity: 0.85; } 100% { opacity: 0; transform: translateY(var(--surge, -46px)); } }
          @keyframes cmHold { 0% { opacity: 0; transform: scaleX(0.6); } 40% { opacity: 0.8; } 100% { opacity: 0; transform: scaleX(1.15); } }
          .cm-token { touch-action: none; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; will-change: transform; transition: transform 460ms cubic-bezier(0.22, 1, 0.36, 1); }
          .cm-line { will-change: transform; transition: transform 460ms cubic-bezier(0.22, 1, 0.36, 1); }
          .cm-still { transition: none !important; }
          @media (prefers-reduced-motion: reduce) {
            .cm-ment-fx { display: none; }
            .cm-slot, .cm-token, .cm-line { transition: none !important; }
          }
        `}</style>
        <div
          ref={pitchRef}
          data-cm-pitch="1"
          data-cm-mentality={career.mentality}
          data-cm-formation={formation.name}
          className="relative w-full max-w-md mx-auto rounded-2xl border border-border overflow-hidden"
          style={{ aspectRatio: '3 / 4', background: 'linear-gradient(to top, hsl(var(--secondary)) 0%, hsl(var(--card)) 100%)' }}
        >
          <div className="absolute inset-x-0 top-1/2 h-px bg-border/40" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border border-border/40" />

          {/* The back line, so you can see the block move and not just feel it. */}
          <div
            data-cm-defline={Math.round(lineY * 10) / 10}
            className={cn('cm-line absolute inset-x-0 pointer-events-none', !ready && 'cm-still')}
            style={{
              top: `${baseLineY}%`,
              transform: `translate3d(0, ${((lineY - baseLineY) / 100) * box.h}px, 0)`,
            }}
          >
            <div className="h-px w-full bg-primary/35" style={{ backgroundImage: 'repeating-linear-gradient(to right, hsl(var(--primary) / 0.5) 0 6px, transparent 6px 12px)' }} />
            <span className="absolute right-1.5 -top-3.5 text-[8px] uppercase tracking-wider text-primary/70 font-bold">
              {lineLabel(career.mentality)}
            </span>
          </div>

          {/* One-shot mentality flourish, keyed so every click replays it. */}
          {mentPulse > 0 && career.mentality !== 'balanced' && (
            <div key={mentPulse} className="cm-ment-fx absolute inset-0 pointer-events-none">
              {[18, 50, 82].map(x => (
                <span
                  key={x}
                  className={cn('absolute text-2xl', career.mentality === 'attacking' ? 'text-emerald-400' : 'text-sky-400')}
                  style={{
                    left: `${x}%`,
                    top: career.mentality === 'attacking' ? '62%' : '30%',
                    ['--surge' as string]: career.mentality === 'attacking' ? '-52px' : '52px',
                    animation: 'cmSurge 0.7s ease-out forwards',
                    transform: 'translateX(-50%)',
                  }}
                >
                  {career.mentality === 'attacking' ? '⌃' : '⌄'}
                </span>
              ))}
            </div>
          )}
          {mentPulse > 0 && career.mentality === 'balanced' && (
            <div key={mentPulse} className="cm-ment-fx absolute inset-0 pointer-events-none">
              <span
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-px bg-yellow-400"
                style={{ animation: 'cmHold 0.7s ease-out forwards' }}
              />
            </div>
          )}

          {formation.slots.map((sl, i) => {
            const p = xi[i];
            const unavailable = p ? !isAvailable(p) : false;
            const pos = slotPosition(sl, career.mentality);
            const shiftX = ((pos.x - sl.x) / 100) * box.w;
            const shiftY = ((pos.y - sl.y) / 100) * box.h;
            const lifted = drag !== null && drag.from === i;
            const target = drag !== null && drag.over === i && drag.from !== i;
            const tx = shiftX + (lifted ? drag.dx : 0);
            const ty = shiftY + (lifted ? drag.dy : 0);
            const scale = lifted ? 1.18 : target ? 1.1 : 1;
            return (
              <button
                key={i}
                type="button"
                data-cm-slot={i}
                data-cm-slot-label={sl.label}
                data-cm-name={p ? lastName(p.name) : ''}
                data-cm-pid={p ? p.id : ''}
                data-cm-shift={`${Math.round(shiftX)},${Math.round(shiftY)}`}
                aria-label={`${sl.label}, ${p ? p.name : 'empty'}. Drag onto another spot to swap, or tap to pick someone else.`}
                onPointerDown={handleDown(i)}
                onPointerMove={handleMove}
                onPointerUp={handleUp}
                onPointerCancel={handleCancel}
                onDragStart={e => e.preventDefault()}
                onClick={() => openPicker(i)}
                className={cn(
                  'cm-token cm-slot absolute flex flex-col items-center',
                  (lifted || !ready) && 'cm-still',
                )}
                style={{
                  left: `${sl.x}%`,
                  top: `${sl.y}%`,
                  transform: `translate3d(calc(-50% + ${tx}px), calc(-50% + ${ty}px), 0) scale(${scale})`,
                  zIndex: lifted ? 30 : target ? 20 : 10,
                }}
              >
                <div className={cn(
                  'w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center text-[9px] font-bold border-2 transition-colors',
                  p
                    ? unavailable
                      ? 'bg-destructive/70 text-destructive-foreground border-destructive'
                      : 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card/70 border-dashed border-primary/70 text-primary',
                  lifted && 'ring-4 ring-primary/30 shadow-lg',
                  target && 'ring-4 ring-yellow-400/70',
                )}>
                  {p ? p.rating : sl.label}
                </div>
                <span className="text-[8px] md:text-[9px] text-foreground mt-0.5 max-w-[64px] truncate text-center leading-tight">
                  {p ? lastName(p.name) : '-'}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-1.5 min-h-[1.2em]" data-cm-hint>
          {drag
            ? (overName ? `Drop to swap ${dragName} with ${overName}` : `Moving ${dragName}, let go on someone to swap`)
            : 'Drag a player onto another to swap them. Tap a spot to pick someone else.'}
        </p>
      </div>

      {/* Slot picker dialog, still the fallback for anyone who cannot drag */}
      <Dialog open={openSlot !== null} onOpenChange={(o) => { if (!o) setOpenSlot(null); }}>
        <DialogContent className="max-w-md bg-card border-border text-foreground max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-display text-primary text-center">
              Pick your {slot ? slot.label : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            {candidates.map(p => {
              const fits = slot ? slot.allowed.includes(p.position) : true;
              const isHere = openSlot !== null && career.xiIds[openSlot] === p.id;
              const elsewhere = usedIds.has(p.id) && !isHere;
              return (
                <button
                  key={p.id}
                  onClick={() => { if (openSlot !== null) { onSlot(openSlot, p.id); setOpenSlot(null); } }}
                  className={cn(
                    'w-full flex items-center gap-2 rounded-lg border p-2 text-left transition-all',
                    isHere ? 'border-primary bg-primary/10' : 'border-border bg-surface-1 hover:border-primary',
                  )}
                >
                  <span className="w-9 shrink-0 text-[10px] font-bold text-muted-foreground bg-secondary rounded px-1 py-0.5 text-center">{p.position}</span>
                  <span className={cn('flex-1 text-xs truncate', p.isYouth ? 'text-muted-foreground italic' : 'text-foreground')}>
                    {p.name}
                    {elsewhere && <span className="text-[8px] text-primary ml-1">(swaps places)</span>}
                    {!fits && <span className="text-[8px] text-yellow-400 ml-1">(out of position)</span>}
                  </span>
                  <span className="text-[9px] text-muted-foreground">fit {p.fitness}</span>
                  <span className={cn('text-sm font-bold font-display', ratingTint(p.rating))}>{p.rating}</span>
                </button>
              );
            })}
            {candidates.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">No fit players available. Everyone is injured or suspended.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TacticsScreen;
