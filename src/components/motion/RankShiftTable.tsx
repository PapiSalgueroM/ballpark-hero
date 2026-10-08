/* Round 1046: a ranked list whose rows SLIDE from the place they truly had to
   the place they truly have. A wrapper, for any game: it draws its children
   untouched inside one element and moves the rows it finds in them (every
   element carrying `data-club`, the key of its row).

   The rules it keeps so a binder cannot forget them:
   - Two true orders only. A row starts where it stood at the last commit and
     ends where this commit put it; the numbers in the row are the new ones
     from the first frame, so nothing on screen was ever untrue.
   - A first mount plays nothing, and neither does a commit after one drawn
     with `slide` false (an order before a ball is kicked is not a table).
   - Reduced motion is read here, at every commit: nothing ever slides.
   - The last commit is held in a ref written in a layout effect, never
     during render, so a render React throws away cannot spend the move.
   - One flight at a time. Starting the next one, or unmounting, ends the
     one in the air at once (its timer and listener go with it), and the next
     starts from true places.
   - Transforms only: the box and the page never change size.
   A row that left the window is simply not there; one that entered it comes
   from where it would have been, fading in. */
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { rankShift } from '@/lib/motion/rankShift';

interface Held { order: readonly string[]; tops: Map<string, number>; slide: boolean; width: number }
interface Flight { timer: ReturnType<typeof setTimeout>; off: () => void }

export const RANK_SHIFT_MS = 450;
const EASE = 'cubic-bezier(.2,.8,.2,1)';

const reducedNow = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const rowsOf = (box: HTMLElement) => Array.from(box.querySelectorAll<HTMLElement>('[data-club]'));

function rest(box: HTMLElement) {
  for (const row of rowsOf(box)) { row.style.transition = ''; row.style.transform = ''; row.style.opacity = ''; }
  box.removeAttribute('data-rank-shifting');
}

export function RankShiftTable({ order, slide, children }: { order: readonly string[]; slide: boolean; children: ReactNode }) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const held = useRef<Held | null>(null);
  const flight = useRef<Flight | null>(null);
  const joined = order.join('\u0001');

  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    /* whatever was in the air ends here, so every top below is a resting one */
    if (flight.current) { clearTimeout(flight.current.timer); flight.current.off(); flight.current = null; }
    rest(box);
    const rows = rowsOf(box);
    const frame = box.getBoundingClientRect();
    const tops = new Map<string, number>();
    const heights: number[] = [];
    for (const row of rows) { const b = row.getBoundingClientRect(); tops.set(row.dataset.club ?? '', b.top - frame.top); heights.push(b.height); }
    const prev = held.current;
    held.current = { order, tops, slide, width: frame.width };
    if (!prev || !prev.slide || !slide || reducedNow() || rows.length === 0) return;
    if (Math.abs(prev.width - frame.width) > 0.5) return;
    if (prev.order.length === order.length && prev.order.every((k, i) => k === order[i])) return;

    const from = new Map(rankShift(prev.order, order).map(m => [m.club, m.from]));
    const pitch = heights.slice().sort((a, b) => a - b)[Math.floor(heights.length / 2)];
    const all = Array.from(tops.values());
    const lo = Math.min(...all) - pitch;
    const hi = Math.max(...all) + pitch;
    /* a row drawn at both commits anchors the ones the window brought in */
    const anchor = rows.map(r => r.dataset.club ?? '').find(k => prev.tops.has(k));
    const plan: { row: HTMLElement; dy: number; fade: boolean }[] = [];
    for (const row of rows) {
      const key = row.dataset.club ?? '';
      const top = tops.get(key)!;
      const was = prev.tops.get(key);
      if (was !== undefined) {
        if (Math.abs(was - top) >= 1) plan.push({ row, dy: was - top, fade: false });
        continue;
      }
      const stood = from.get(key) ?? -1;
      let dy = 0;
      if (anchor !== undefined && stood >= 0) {
        const virtual = prev.tops.get(anchor)! + (stood - (from.get(anchor) ?? 0)) * pitch;
        dy = Math.max(lo, Math.min(hi, virtual)) - top;
      }
      plan.push({ row, dy, fade: true });
    }
    if (plan.length === 0) return;

    for (const p of plan) {
      p.row.style.transition = 'none';
      if (p.dy !== 0) p.row.style.transform = `translateY(${p.dy}px)`;
      if (p.fade) p.row.style.opacity = '0';
    }
    void box.offsetHeight;
    box.setAttribute('data-rank-shifting', '');
    for (const p of plan) {
      p.row.style.transition = `transform ${RANK_SHIFT_MS}ms ${EASE}, opacity 220ms linear`;
      p.row.style.transform = '';
      p.row.style.opacity = '';
    }
    /* every row's slowest property lands, then the inline styles go; the timer is the backstop */
    const waiting = new Map<EventTarget, string>(plan.map(p => [p.row, p.dy !== 0 ? 'transform' : 'opacity']));
    const land = () => {
      if (!flight.current) return;
      clearTimeout(flight.current.timer); flight.current.off(); flight.current = null;
      rest(box);
    };
    const onEnd = (e: TransitionEvent) => {
      if (waiting.get(e.target as EventTarget) === e.propertyName) waiting.delete(e.target as EventTarget);
      if (waiting.size === 0) land();
    };
    box.addEventListener('transitionend', onEnd);
    box.addEventListener('transitioncancel', onEnd);
    flight.current = {
      timer: setTimeout(land, RANK_SHIFT_MS + 150),
      off: () => { box.removeEventListener('transitionend', onEnd); box.removeEventListener('transitioncancel', onEnd); },
    };
    // `order` is read through `joined`: a new array with the same keys is the same table
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joined, slide]);

  useLayoutEffect(() => () => {
    if (flight.current) { clearTimeout(flight.current.timer); flight.current.off(); flight.current = null; }
  }, []);

  return <div ref={boxRef} data-rank-shift="">{children}</div>;
}
