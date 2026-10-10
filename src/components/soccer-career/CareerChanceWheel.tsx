import { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import type { CareerChanceWheelReceipt } from '@/lib/careerChanceWheel';

export default function CareerChanceWheel({ receipt, onClose }: { receipt: CareerChanceWheelReceipt; onClose: () => void }) {
  const [spinning, setSpinning] = useState(false), [revealed, setRevealed] = useState(false);
  const opener = useRef(document.activeElement as HTMLElement | null), heading = useRef<HTMLHeadingElement>(null);
  const percent = Math.round(receipt.chance * 100);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const spin = () => {
    setSpinning(true);
    if (reducedMotion) setRevealed(true);
  };
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent data-career-chance-wheel className="flex max-h-[88dvh] w-[calc(100%-1.5rem)] max-w-sm flex-col overflow-hidden rounded-2xl [&>button]:hidden"
      onOpenAutoFocus={e => { e.preventDefault(); heading.current?.focus({ preventScroll: true }); }}
      onCloseAutoFocus={e => { e.preventDefault(); opener.current?.focus({ preventScroll: true }); }}>
      <DialogTitle ref={heading} tabIndex={-1} className="outline-none">{receipt.title}</DialogTitle>
      <DialogDescription>The wheel shows the chance from your choice. Your result is saved once. Spinning, skipping or reloading cannot change it.</DialogDescription>
      <div className="min-h-0 space-y-3 overflow-y-auto text-sm">
        <p><strong>{percent}%:</strong> {receipt.hit}<br /><strong>{100 - percent}%:</strong> {receipt.miss}</p>
        <p className="text-xs text-muted-foreground">Example: a 30% chance uses 30 of 100 equal parts. The pointer lands on the part picked by the game's original roll.</p>
        <div className="relative mx-auto mt-4 h-48 w-48" aria-hidden="true">
          <span className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 text-2xl">▼</span>
          <div data-wheel-disk className="h-full w-full rounded-full border-4 border-foreground/50 motion-reduce:transition-none"
            style={{ background: `conic-gradient(#f59e0b 0deg ${receipt.chance * 360}deg, #475569 ${receipt.chance * 360}deg 360deg)`, transform: `rotate(${spinning ? 1440 - receipt.roll * 360 : 0}deg)`, transition: reducedMotion ? 'none' : 'transform 2s cubic-bezier(.12,.7,.2,1)' }}
            onTransitionEnd={() => { if (spinning) setRevealed(true); }} />
        </div>
        <p className="text-xs text-muted-foreground">Amber: {receipt.hit}. Slate: {receipt.miss}.</p>
        <p data-wheel-result aria-live="polite" className="rounded-lg bg-muted p-3 font-bold">{revealed ? (receipt.result ? receipt.hit : receipt.miss) : 'Ready to reveal your saved result.'}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        {!spinning && !revealed && <button data-wheel-spin className="min-h-11 flex-1 rounded-lg bg-primary px-3 text-sm font-bold text-primary-foreground" onClick={spin}>Spin the wheel</button>}
        {!revealed && <button data-wheel-skip className="min-h-11 flex-1 rounded-lg border px-3 text-sm" onClick={() => setRevealed(true)}>Show result</button>}
        {revealed && <button data-wheel-continue className="min-h-11 w-full rounded-lg bg-primary px-3 font-bold text-primary-foreground" onClick={onClose}>Continue</button>}
      </div>
    </DialogContent>
  </Dialog>;
}
