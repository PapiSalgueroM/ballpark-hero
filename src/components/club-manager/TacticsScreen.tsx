import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronDown, Wand2, X } from 'lucide-react';
import {
  FORMATIONS, MENTALITIES, resolveXI, isAvailable, xiFitReport, fitGrade, FIT_PENALTY,
  slotPosition, defensiveLineY, lineLabel,
  benchFor, dutyOptions, slotDuty, DUTY_INFO,
  SET_PIECE_KEYS, SET_PIECE_INFO, setPieceCandidates,
} from '@/lib/clubManager';
import type { CareerState, CMPlayer, Mentality, Duty, SetPieceKey, FitGrade } from '@/lib/clubManager';
import { ratingTint, SecondPositionChips } from '@/components/club-manager/SquadScreen';
import { useRevealScroll } from '@/hooks/useRevealScroll';

const lastName = (n: string) => n.replace(' (Youth)', '').split(' ').slice(-1)[0];

/** How far a press has to travel before we call it a drag instead of a tap. */
const DRAG_SLOP = 6;

/** The duty chip under a token has room for one short word. */
const DUTY_SHORT: Record<Duty, string> = {
  sweeper: 'Sweeper', shotStopper: 'Shot stop',
  stopper: 'Stopper', cover: 'Cover',
  attackingFullBack: 'Attack', holdingFullBack: 'Hold',
  anchor: 'Anchor', deepPlaymaker: 'Deep PM',
  boxToBox: 'Box to box', playmaker: 'Playmaker',
  creator: 'Creator', shadowStriker: 'Shadow',
  winger: 'Winger', insideForward: 'Inside',
  poacher: 'Poacher', targetMan: 'Target', falseNine: 'False 9',
};

/** What a fit grade costs, in the words the screen uses. */
function fitWord(g: FitGrade): string {
  if (g === 'family') return `off, ${FIT_PENALTY.family} points`;
  if (g === 'wrong') return `wrong line, ${FIT_PENALTY.wrong} points`;
  if (g === 'keeper') return `keeper swap, ${FIT_PENALTY.keeper} points`;
  return '';
}

/** Round 505: the shapes grouped by how many sit in the back line. */
const BACK_LINES: { label: string; digit: string }[] = [
  { label: 'Back three', digit: '3' },
  { label: 'Back four', digit: '4' },
  { label: 'Back five', digit: '5' },
];

interface TacticsScreenProps {
  career: CareerState;
  onFormation: (idx: number) => void;
  onMentality: (m: Mentality) => void;
  onSlot: (slotIdx: number, playerId: string | null) => void;
  onSwap: (a: number, b: number) => void;
  onAutoPick: () => void;
  /** Round 505: a duty on a slot, null to clear it. */
  onDuty: (slotIdx: number, duty: Duty | null) => void;
  /** Round 505: the armband or a set piece job to a man. */
  onSetPiece: (key: SetPieceKey, playerId: string | null) => void;
  onAutoSetPieces: () => void;
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
 *
 * Round 505, the owner's tactics list: "subs and reserves listed under the
 * pitch, tap one player then another to swap. Out of position penalties,
 * position retraining over weeks, but full freedom to place anyone anywhere
 * (ten defenders if you want). Captain, corner takers left and right, free
 * kick and penalty takers. Way more formations and variants. Player roles:
 * attacking or holding fullbacks, sweeper keeper, and so on. Sub suggestions
 * ordered by same position first."
 *
 * So under the pitch there is now the BENCH: everyone not in the eleven,
 * ordered for the spot you last tapped (same position first, then the family,
 * then the rest, the engine's own benchFor), the men who cannot play greyed
 * with the reason. Tap a bench man then a spot and he is in it; tap a spot
 * then a bench man and the same thing happens. Nothing here ever refuses a
 * placement: the engine prices it instead, and every token wears its fit
 * (amber ring for a neighbouring position, red for the wrong line or a keeper
 * swap) so the price is visible before kick off. Each token carries a DUTY
 * chip that opens a sheet of what that slot can be asked to do, the shapes
 * are grouped by back line, and a set piece card names the captain and the
 * takers with the same-position-first lists the engine ranks.
 */
export function TacticsScreen({
  career, onFormation, onMentality, onSlot, onSwap, onAutoPick, onDuty, onSetPiece, onAutoSetPieces,
}: TacticsScreenProps) {
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
  /* Round 505: the two halves of a tap-tap placement. A spot you tapped
     (the bench reorders for it), and a bench man you tapped (the next spot
     you tap takes him). Only one of the two is ever the "first tap". */
  const [selSlot, setSelSlot] = useState<number | null>(null);
  const [benchPick, setBenchPick] = useState<string | null>(null);
  const [dutySlot, setDutySlot] = useState<number | null>(null);
  const [spKey, setSpKey] = useState<SetPieceKey | null>(null);
  /* Round 505 review: the bench and the set pieces are tiles under the pitch
     that open one at a time, so the tab is the pitch plus two headers rather
     than a long stack with a scroll list inside it. */
  const [openTile, setOpenTile] = useState<'bench' | 'setpieces' | null>(null);

  /* Round 505 review: a shape switch leaves nothing half tapped behind. The
     spot you picked, the bench man you held, the open duty sheet and an
     Escaped picker's slot all point at slots of the old shape, so they go
     with it. */
  useEffect(() => {
    setSelSlot(null);
    setBenchPick(null);
    setDutySlot(null);
    setOpenSlot(null);
  }, [career.formationIndex]);

  const formation = FORMATIONS[career.formationIndex] ?? FORMATIONS[0];
  const xi = resolveXI(career);
  const slot = openSlot !== null ? formation.slots[openSlot] : null;
  const usedIds = new Set(career.xiIds.filter((id): id is string => !!id));
  const lineY = defensiveLineY(formation, career.mentality);
  const baseLineY = defensiveLineY(formation, 'balanced');
  const fit = xiFitReport(career);
  const captainId = career.setPieces?.captain ?? null;
  const byId = (id: string | null | undefined): CMPlayer | null => (id ? career.squad.find(p => p.id === id) ?? null : null);
  const benchMan = byId(benchPick);

  /* The next step after each tap is the thing that gets revealed: the pitch
     once a bench man is picked (his spot is up there), the duty sheet when a
     chip opens it, the candidate list when a set piece row opens it. The
     enabled gate keeps the mount quiet, so the first real open is not the
     one the hook skips. */
  const pitchWrapRef = useRevealScroll<HTMLDivElement>(`bench:${benchPick ?? ''}`, { enabled: benchPick !== null, skipFirst: false });
  const dutyRef = useRevealScroll<HTMLDivElement>(`duty:${dutySlot ?? ''}`, { enabled: dutySlot !== null, skipFirst: false });
  const spRef = useRevealScroll<HTMLDivElement>(`sp:${spKey ?? ''}`, { enabled: spKey !== null, skipFirst: false });

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

  /** A tap on a spot: the second half of a bench pick, or the first half of one plus the picker. */
  const openPicker = (i: number) => {
    if (Date.now() - clickGuard.current < 500) return;
    if (benchPick !== null) {
      onSlot(i, benchPick);
      setBenchPick(null);
      setSelSlot(null);
      return;
    }
    setSelSlot(i);
    setOpenSlot(i);
    setOpenTile('bench');
  };

  /** A tap on a bench man: into the spot you tapped first, or held for the spot you tap next. */
  const tapBench = (p: CMPlayer) => {
    if (selSlot !== null) {
      onSlot(selSlot, p.id);
      setSelSlot(null);
      setBenchPick(null);
      return;
    }
    setBenchPick(prev => (prev === p.id ? null : p.id));
    setOpenTile('bench');
  };

  /* Round 505: the picker lists the whole available squad same position
     first (the engine's grade, not a label match), so the man who belongs in
     the spot is at the top and the price of anyone else is written on him. */
  const candidates: CMPlayer[] = slot
    ? [...career.squad]
        .filter(p => isAvailable(p))
        .sort((a, b) => {
          const tier = (p: CMPlayer) => { const g = fitGrade(p, slot); return g === 'natural' ? 0 : g === 'family' ? 1 : g === 'wrong' ? 2 : 3; };
          return tier(a) - tier(b) || b.rating - a.rating;
        })
    : [];

  /* The bench: everyone not in the eleven. For a tapped spot the engine
     orders it for that spot; with no spot picked it is simply best first.
     Either way the men who cannot play this week sit at the back, greyed. */
  const bench: CMPlayer[] = useMemo(() => {
    /* This tab edits the PICKED eleven, so its bench is read off that even
       while a match is paused (a save reloaded at the interval lands in the
       hub with career.live set). Off the live match, benchFor would list
       the men not on the pitch and a man who came on at the break vanished
       from the tab. */
    const list = benchFor({ ...career, live: undefined }, undefined, selSlot ?? undefined);
    if (selSlot !== null) return list;
    return [...list].sort((a, b) => (isAvailable(a) ? 0 : 1) - (isAvailable(b) ? 0 : 1) || b.rating - a.rating);
  }, [career, selSlot]);
  const benchSlot = selSlot !== null ? formation.slots[selSlot] : null;

  /* A held bench man who is no longer on the bench (the auto pick took him,
     a swap put him out there) is not held any more. */
  useEffect(() => {
    if (benchPick !== null && !bench.some(p => p.id === benchPick)) setBenchPick(null);
  }, [bench, benchPick]);

  const tileRef = useRevealScroll<HTMLDivElement>(`tile:${openTile ?? ''}`, { enabled: openTile !== null, skipFirst: false });
  const spPicked = SET_PIECE_KEYS.filter(k => !!career.setPieces?.[k]).length;

  /* The keeper boundary is the one placement worth a sentence of its own. */
  const keeperWarnings: string[] = [];
  fit.grades.forEach((g, i) => {
    if (g !== 'keeper') return;
    const p = xi[i];
    const sl = formation.slots[i];
    if (!p || !sl) return;
    keeperWarnings.push(p.position === 'GK'
      ? `A keeper at ${sl.label} costs ${FIT_PENALTY.keeper} points on him.`
      : `${lastName(p.name)} in goal costs ${FIT_PENALTY.keeper} points on him.`);
  });

  const dragName = drag ? (xi[drag.from] ? lastName(xi[drag.from]!.name) : 'that spot') : '';
  const overName = drag && drag.over >= 0 && drag.over !== drag.from
    ? (xi[drag.over] ? lastName(xi[drag.over]!.name) : formation.slots[drag.over].label)
    : '';

  const hint = drag
    ? (overName ? `Drop to swap ${dragName} with ${overName}` : `Moving ${dragName}, let go on someone to swap`)
    : benchMan
      ? `Tap a spot on the pitch for ${lastName(benchMan.name)}.`
      : benchSlot
        ? `${benchSlot.label} picked. Tap a bench man below to put him there.`
        : 'Drag a player onto another to swap them. Tap a spot to pick someone else, or a bench man below then a spot.';

  const dutySheetSlot = dutySlot !== null ? formation.slots[dutySlot] ?? null : null;
  const dutyNow = dutySlot !== null ? slotDuty(career, formation, dutySlot) : null;
  const sp = career.setPieces;

  return (
    <div className="space-y-4">
      {/* Formation, grouped by the back line */}
      <div>
        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">Formation</div>
        <div className="space-y-1.5">
          {BACK_LINES.map(bl => {
            const entries = FORMATIONS.map((f, i) => ({ f, i })).filter(x => x.f.name.startsWith(bl.digit));
            if (!entries.length) return null;
            return (
              <div key={bl.digit} className="flex items-start gap-1.5" data-cm-formation-group={bl.digit}>
                <span className="text-[8px] uppercase tracking-wider text-muted-foreground w-9 shrink-0 pt-1.5 leading-tight">{bl.label}</span>
                <div className="flex flex-wrap gap-1">
                  {entries.map(({ f, i }) => (
                    <button
                      key={f.name}
                      type="button"
                      data-cm-formation-btn={f.name}
                      onClick={() => onFormation(i)}
                      className={cn(
                        'px-2 py-1 rounded-lg border text-[10px] font-bold transition-all',
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
            );
          })}
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
      <div ref={pitchWrapRef}>
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">
            Starting XI · avg <span className="text-primary font-bold" data-cm-xi-avg={fit.rating}>{fit.rating}</span>
          </div>
          <button
            onClick={onAutoPick}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:opacity-80 transition-opacity"
          >
            <Wand2 className="w-3.5 h-3.5" /> Auto Pick
          </button>
        </div>
        {fit.penalty > 0 && (
          <p className="text-[9px] text-amber-400 mb-1" data-cm-fit-adjusted={fit.penalty}>
            fit adjusted: {fit.raw} on paper, {fit.rating} the way the match reads them. A neighbouring position costs {FIT_PENALTY.family} on that man, the wrong line {FIT_PENALTY.wrong}, a keeper swap {FIT_PENALTY.keeper}.
          </p>
        )}
        <style>{`
          @keyframes cmSurge { 0% { opacity: 0; transform: translateY(0); } 30% { opacity: 0.85; } 100% { opacity: 0; transform: translateY(var(--surge, -46px)); } }
          @keyframes cmHold { 0% { opacity: 0; transform: scaleX(0.6); } 40% { opacity: 0.8; } 100% { opacity: 0; transform: scaleX(1.15); } }
          .cm-token { touch-action: none; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; will-change: transform; transition: transform 460ms cubic-bezier(0.22, 1, 0.36, 1); }
          .cm-line, .cm-chip { will-change: transform; transition: transform 460ms cubic-bezier(0.22, 1, 0.36, 1); }
          .cm-still { transition: none !important; }
          @media (prefers-reduced-motion: reduce) {
            .cm-ment-fx { display: none; }
            .cm-slot, .cm-token, .cm-line, .cm-chip { transition: none !important; }
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

          {/* Round 505: the duty chip under each spot. A sibling of the
              token rather than a child, because a button cannot hold a
              button, placed by the same slot maths and riding the same
              mentality shift. */}
          {formation.slots.map((sl, i) => {
            const pos = slotPosition(sl, career.mentality);
            const shiftX = ((pos.x - sl.x) / 100) * box.w;
            const shiftY = ((pos.y - sl.y) / 100) * box.h;
            const d = slotDuty(career, formation, i);
            return (
              <button
                key={`duty${i}`}
                type="button"
                data-cm-duty={i}
                data-cm-duty-value={d ?? ''}
                aria-label={`Duty for ${sl.label}: ${d ? DUTY_INFO[d].label : 'none set'}. Tap to change.`}
                onClick={() => setDutySlot(dutySlot === i ? null : i)}
                /* A calm chip sits above a calm token (15 over 10): in 5-3-2
                   and 5-4-1 the middle centre back's chip lands on the top of
                   the keeper's token, and under it a tap opened the GK picker.
                   A lifted token (30) and a drop target (20) still ride over it. */
                className={cn(
                  'cm-chip absolute z-[15] px-1 rounded-full border text-[7px] font-bold leading-[13px] whitespace-nowrap',
                  d ? 'bg-primary/15 border-primary/60 text-primary' : 'bg-card/80 border-border text-muted-foreground',
                  dutySlot === i && 'ring-2 ring-primary',
                  !ready && 'cm-still',
                )}
                style={{
                  left: `${sl.x}%`,
                  top: `calc(${sl.y}% + 27px)`,
                  transform: `translate3d(calc(-50% + ${shiftX}px), ${shiftY}px, 0)`,
                }}
              >
                {d ? DUTY_SHORT[d] : 'duty'}
              </button>
            );
          })}

          {formation.slots.map((sl, i) => {
            const p = xi[i];
            const unavailable = p ? !isAvailable(p) : false;
            const grade = fit.grades[i];
            const pos = slotPosition(sl, career.mentality);
            const shiftX = ((pos.x - sl.x) / 100) * box.w;
            const shiftY = ((pos.y - sl.y) / 100) * box.h;
            const lifted = drag !== null && drag.from === i;
            const target = drag !== null && drag.over === i && drag.from !== i;
            const tx = shiftX + (lifted ? drag.dx : 0);
            const ty = shiftY + (lifted ? drag.dy : 0);
            const scale = lifted ? 1.18 : target ? 1.1 : 1;
            const calm = !lifted && !target;
            return (
              <button
                key={i}
                type="button"
                data-cm-slot={i}
                data-cm-slot-label={sl.label}
                data-cm-name={p ? lastName(p.name) : ''}
                data-cm-pid={p ? p.id : ''}
                data-cm-shift={`${Math.round(shiftX)},${Math.round(shiftY)}`}
                data-cm-fit={grade ?? ''}
                data-cm-selected={selSlot === i ? '1' : undefined}
                data-cm-captain={p && p.id === captainId ? '1' : undefined}
                aria-label={`${sl.label}, ${p ? p.name : 'empty'}${grade && grade !== 'natural' ? `, ${fitWord(grade)}` : ''}. Drag onto another spot to swap, or tap to pick someone else.`}
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
                  'relative w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center text-[9px] font-bold border-2 transition-colors',
                  p
                    ? unavailable
                      ? 'bg-destructive/70 text-destructive-foreground border-destructive'
                      : 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card/70 border-dashed border-primary/70 text-primary',
                  lifted && 'ring-4 ring-primary/30 shadow-lg',
                  target && 'ring-4 ring-yellow-400/70',
                  calm && selSlot === i && 'ring-4 ring-primary/40',
                  calm && selSlot !== i && benchMan && 'ring-2 ring-emerald-400/70',
                  calm && selSlot !== i && !benchMan && grade === 'family' && 'ring-2 ring-amber-400',
                  calm && selSlot !== i && !benchMan && (grade === 'wrong' || grade === 'keeper') && 'ring-2 ring-red-500',
                )}>
                  {p ? p.rating : sl.label}
                  {p && p.id === captainId && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-yellow-400 text-black text-[7px] font-black flex items-center justify-center border border-black/30">C</span>
                  )}
                </div>
                <span className={cn(
                  'text-[8px] md:text-[9px] mt-0.5 max-w-[64px] truncate text-center leading-tight',
                  grade === 'wrong' || grade === 'keeper' ? 'text-red-400' : 'text-foreground',
                )}>
                  {p ? lastName(p.name) : '-'}
                  {grade === 'family' && <span className="text-amber-400"> off</span>}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-1.5 min-h-[1.2em]" data-cm-hint>
          {hint}
        </p>
        {keeperWarnings.map(w => (
          <p key={w} className="text-[10px] text-red-400 text-center" data-cm-keeper-warning>{w}</p>
        ))}

        {/* Round 505: the duty sheet, under the pitch, for the chip you tapped. */}
        {dutySlot !== null && dutySheetSlot && (
          <div ref={dutyRef} className="mt-2 bg-card border border-border rounded-xl p-3" data-cm-duty-sheet={dutySlot}>
            <div className="flex items-center justify-between">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Duty for {dutySheetSlot.label}{xi[dutySlot] ? `, ${lastName(xi[dutySlot]!.name)}` : ''}
              </div>
              <button
                type="button"
                onClick={() => setDutySlot(null)}
                aria-label="Close"
                className="min-w-[36px] min-h-[36px] -mr-2 -mt-2 inline-flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1 mt-1">
              {dutyOptions(dutySheetSlot).map(d => (
                <button
                  key={d}
                  type="button"
                  data-cm-duty-opt={d}
                  onClick={() => { onDuty(dutySlot, d); setDutySlot(null); }}
                  className={cn(
                    'w-full rounded-lg border px-2 py-1.5 text-left transition-colors',
                    dutyNow === d ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50',
                  )}
                >
                  <span className={cn('block text-xs font-bold', dutyNow === d ? 'text-primary' : 'text-foreground')}>{DUTY_INFO[d].label}</span>
                  <span className="block text-[9px] text-muted-foreground leading-tight">{DUTY_INFO[d].blurb}</span>
                </button>
              ))}
              <button
                type="button"
                data-cm-duty-opt=""
                onClick={() => { onDuty(dutySlot, null); setDutySlot(null); }}
                className={cn(
                  'w-full rounded-lg border px-2 py-1.5 text-left transition-colors',
                  dutyNow === null ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50',
                )}
              >
                <span className={cn('block text-xs font-bold', dutyNow === null ? 'text-primary' : 'text-foreground')}>No duty</span>
                <span className="block text-[9px] text-muted-foreground leading-tight">Plays the spot straight, no nudge either way.</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Round 505: the bench, a tile under the pitch, ordered for the spot
          you tapped. A tapped spot or a held bench man opens it on its own,
          and it is the whole list once open: no scroll box inside a tile. */}
      <div ref={openTile === 'bench' ? tileRef : undefined} data-cm-tile="bench" data-cm-tile-open={openTile === 'bench' ? '1' : undefined}>
        <button
          type="button"
          data-cm-tile-btn="bench"
          aria-expanded={openTile === 'bench'}
          onClick={() => setOpenTile(openTile === 'bench' ? null : 'bench')}
          className={cn(
            'w-full flex items-center justify-between gap-2 rounded-xl border bg-card px-3 min-h-[44px] text-left transition-colors',
            openTile === 'bench' ? 'border-primary rounded-b-none' : 'border-border hover:border-primary/50',
          )}
        >
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider min-w-0 truncate">
            Bench <span className="text-foreground font-bold" data-cm-bench-count={bench.length}>{bench.length}</span>
            {benchSlot
              ? <span className="text-primary normal-case"> for {benchSlot.label}, same position first</span>
              : benchMan ? <span className="text-primary normal-case"> holding {lastName(benchMan.name)}</span> : null}
          </span>
          <ChevronDown className={cn('w-4 h-4 shrink-0 text-muted-foreground transition-transform', openTile === 'bench' && 'rotate-180')} />
        </button>
        {openTile === 'bench' && (
        <div className="bg-card border border-t-0 border-primary rounded-b-xl p-3" data-cm-bench-list={selSlot ?? ''}>
        {(selSlot !== null || benchPick !== null) && (
          <div className="flex items-center justify-end mb-1.5">
            <button
              type="button"
              data-cm-bench-clear="1"
              onClick={() => { setSelSlot(null); setBenchPick(null); }}
              className="text-[10px] font-semibold text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          </div>
        )}
        {bench.length === 0 && <p className="text-[10px] text-muted-foreground">Everybody is in the eleven.</p>}
        <div className="space-y-0.5">
          {bench.map(p => {
            const avail = isAvailable(p);
            const grade = benchSlot ? fitGrade(p, benchSlot) : null;
            const why = p.injuryWeeks > 0
              ? `injured, ${p.injuryWeeks} week${p.injuryWeeks === 1 ? '' : 's'}`
              : p.suspendedMatches > 0 ? `suspended, ${p.suspendedMatches} match${p.suspendedMatches === 1 ? '' : 'es'}` : '';
            return (
              <button
                key={p.id}
                type="button"
                data-cm-bench={p.id}
                data-cm-bench-fit={grade ?? ''}
                disabled={!avail}
                onClick={() => tapBench(p)}
                className={cn(
                  'w-full flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors min-h-[40px]',
                  benchPick === p.id ? 'border-primary bg-primary/10' : 'border-border/60 hover:border-primary/50',
                  !avail && 'opacity-45',
                )}
              >
                <span className="w-9 shrink-0 text-[10px] font-bold text-muted-foreground bg-secondary rounded px-1 py-0.5 text-center">{p.position}</span>
                <span className="flex-1 min-w-0">
                  <span className={cn('block text-xs truncate', p.isYouth ? 'text-muted-foreground italic' : 'text-foreground')}>
                    {p.name}
                    <SecondPositionChips p={p} className="ml-1" />
                  </span>
                  <span className="block text-[9px] text-muted-foreground">
                    {avail
                      ? (grade && grade !== 'natural' ? <span className={grade === 'family' ? 'text-amber-400' : 'text-red-400'}>{fitWord(grade)}</span> : `fit ${Math.round(p.fitness)}`)
                      : <span className="text-red-400">{why}</span>}
                  </span>
                </span>
                <span className={cn('text-sm font-bold font-display', ratingTint(p.rating))}>{p.rating}</span>
              </button>
            );
          })}
        </div>
        </div>
        )}
      </div>

      {/* Round 505: the armband and the set piece takers, the second tile. */}
      <div ref={openTile === 'setpieces' ? tileRef : undefined} data-cm-tile="setpieces" data-cm-tile-open={openTile === 'setpieces' ? '1' : undefined}>
        <button
          type="button"
          data-cm-tile-btn="setpieces"
          aria-expanded={openTile === 'setpieces'}
          onClick={() => { setOpenTile(openTile === 'setpieces' ? null : 'setpieces'); setSpKey(null); }}
          className={cn(
            'w-full flex items-center justify-between gap-2 rounded-xl border bg-card px-3 min-h-[44px] text-left transition-colors',
            openTile === 'setpieces' ? 'border-primary rounded-b-none' : 'border-border hover:border-primary/50',
          )}
        >
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider min-w-0 truncate">
            Set pieces <span className="text-foreground font-bold" data-cm-sp-count={spPicked}>{spPicked}/{SET_PIECE_KEYS.length}</span>
            {byId(captainId) && <span className="text-primary normal-case"> captain {lastName(byId(captainId)!.name)}</span>}
          </span>
          <ChevronDown className={cn('w-4 h-4 shrink-0 text-muted-foreground transition-transform', openTile === 'setpieces' && 'rotate-180')} />
        </button>
        {openTile === 'setpieces' && (
        <div className="bg-card border border-t-0 border-primary rounded-b-xl p-3" data-cm-setpieces="1">
        <div className="flex items-center justify-between mb-1">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Captain and takers</div>
          <button
            type="button"
            data-cm-sp-auto="1"
            onClick={() => { onAutoSetPieces(); setSpKey(null); }}
            className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary hover:opacity-80"
          >
            <Wand2 className="w-3 h-3" /> Auto pick
          </button>
        </div>
        {SET_PIECE_KEYS.map(k => {
          const man = byId(sp?.[k]);
          const open = spKey === k;
          return (
            <div key={k}>
              <button
                type="button"
                data-cm-sp-row={k}
                onClick={() => setSpKey(open ? null : k)}
                className={cn(
                  'w-full flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors min-h-[40px]',
                  open ? 'border-primary bg-primary/10' : 'border-transparent hover:border-border',
                )}
              >
                <span className="w-[76px] shrink-0 text-[9px] font-bold uppercase tracking-wider text-muted-foreground leading-tight">{SET_PIECE_INFO[k].label}</span>
                <span className="flex-1 min-w-0 text-xs text-foreground truncate" data-cm-sp-man={k}>
                  {man ? man.name : 'picked at kick off'}
                </span>
                {man && <span className="w-9 shrink-0 text-[10px] font-bold text-muted-foreground bg-secondary rounded px-1 py-0.5 text-center">{man.position}</span>}
                {man && <span className={cn('text-sm font-bold font-display', ratingTint(man.rating))}>{man.rating}</span>}
              </button>
              {open && (
                <div ref={spRef} className="mt-1 mb-2 rounded-lg border border-border/60 p-2" data-cm-sp-list={k}>
                  <p className="text-[9px] text-muted-foreground mb-1">{SET_PIECE_INFO[k].blurb}</p>
                  <div className="space-y-0.5">
                    {setPieceCandidates(career, k).map(p => (
                      <button
                        key={p.id}
                        type="button"
                        data-cm-sp-opt={p.id}
                        onClick={() => { onSetPiece(k, p.id); setSpKey(null); }}
                        className={cn(
                          'w-full flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors',
                          man && man.id === p.id ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50',
                        )}
                      >
                        <span className="w-9 shrink-0 text-[10px] font-bold text-muted-foreground bg-secondary rounded px-1 py-0.5 text-center">{p.position}</span>
                        <span className={cn('flex-1 min-w-0 text-xs truncate', p.isYouth ? 'text-muted-foreground italic' : 'text-foreground')}>
                          {p.name}
                          {usedIds.has(p.id) && <span className="text-[8px] text-primary ml-1">XI</span>}
                        </span>
                        <span className={cn('text-sm font-bold font-display', ratingTint(p.rating))}>{p.rating}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <p className="text-[9px] text-muted-foreground mt-1">
          A corner goes to that flag's man while he is on the pitch, a penalty or a direct free kick is the taker's goal, and the armband takes a point off what a defeat costs the eleven.
        </p>
        </div>
        )}
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
              const grade = slot ? fitGrade(p, slot) : 'natural';
              const isHere = openSlot !== null && career.xiIds[openSlot] === p.id;
              const elsewhere = usedIds.has(p.id) && !isHere;
              return (
                <button
                  key={p.id}
                  onClick={() => { if (openSlot !== null) { onSlot(openSlot, p.id); setOpenSlot(null); setSelSlot(null); } }}
                  className={cn(
                    'w-full flex items-center gap-2 rounded-lg border p-2 text-left transition-all',
                    isHere ? 'border-primary bg-primary/10' : 'border-border bg-surface-1 hover:border-primary',
                  )}
                >
                  <span className="w-9 shrink-0 text-[10px] font-bold text-muted-foreground bg-secondary rounded px-1 py-0.5 text-center">{p.position}</span>
                  <span className={cn('flex-1 text-xs truncate', p.isYouth ? 'text-muted-foreground italic' : 'text-foreground')}>
                    {p.name}
                    {elsewhere && <span className="text-[8px] text-primary ml-1">(swaps places)</span>}
                    {grade !== 'natural' && (
                      <span className={cn('text-[8px] ml-1', grade === 'family' ? 'text-yellow-400' : 'text-red-400')}>({fitWord(grade)})</span>
                    )}
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
