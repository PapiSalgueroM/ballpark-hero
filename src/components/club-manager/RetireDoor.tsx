import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/* Round 1343: a door that ends a career, and its confirm, in place.

   Sport free on purpose: the words come in as props (Club Manager's live in
   clubManagerRetire.ts), so a GM desk can use the same door later.

   It cannot be tapped by accident. The confirm takes the door's place with its
   top where the door's top was, and its first row is the title, so a second tap
   on the door's spot lands on text. "Keep managing" takes the focus. The yes
   button arms ARM_MS after the card mounts and ignores a click whose pointer
   went down before it armed; until then it is dimmed and aria-disabled, in the
   same box, so nothing shifts. Escape and Keep managing put the door back. */
export const ARM_MS = 600;

export interface RetireDoorProps {
  door: string;
  title: string;
  lines: string[];
  keep: string;
  confirm: string;
  /** Answers true when it went through; false leaves the confirm open (the page says why). */
  onRetire: () => boolean;
  /** When the confirm opens, so the caller can start loading what comes next. */
  onOpen?: () => void;
  className?: string;
}

export default function RetireDoor({ door, title, lines, keep, confirm, onRetire, onOpen, className }: RetireDoorProps) {
  const [open, setOpen] = useState(false);
  const [armed, setArmed] = useState(false);
  const armedRef = useRef(false);
  const downEarly = useRef(false);
  const keepRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    armedRef.current = false;
    setArmed(false);
    keepRef.current?.focus({ preventScroll: true });
    const t = window.setTimeout(() => { armedRef.current = true; setArmed(true); }, ARM_MS);
    return () => window.clearTimeout(t);
  }, [open]);

  if (!open) {
    return (
      <button
        type="button"
        data-cm-retire-door
        onClick={() => { setOpen(true); onOpen?.(); }}
        className={cn('w-full min-h-11 rounded-lg border border-border px-3 py-2 text-xs font-bold text-muted-foreground hover:text-foreground hover:border-primary transition-colors', className)}
      >
        {door}
      </button>
    );
  }
  return (
    <div
      data-cm-retire-confirm
      role="group"
      aria-label={title}
      onKeyDown={e => { if (e.key === 'Escape') setOpen(false); }}
      className={cn('w-full rounded-lg border border-destructive/50 bg-card p-3 text-left', className)}
    >
      <p className="text-sm font-bold text-foreground">{title}</p>
      {lines.map((l, i) => <p key={i} className="mt-1 text-xs text-muted-foreground">{l}</p>)}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          ref={keepRef}
          data-cm-retire-keep
          onClick={() => setOpen(false)}
          className="flex-1 min-h-11 rounded-lg border border-border px-3 py-2 text-xs font-bold text-foreground hover:border-primary"
        >
          {keep}
        </button>
        <button
          type="button"
          data-cm-retire-yes
          aria-disabled={!armed}
          onPointerDown={() => { downEarly.current = !armedRef.current; }}
          onClick={() => {
            const early = downEarly.current;
            downEarly.current = false;
            if (!armedRef.current || early) return;
            onRetire();
          }}
          className={cn('flex-1 min-h-11 rounded-lg bg-destructive px-3 py-2 text-xs font-bold text-destructive-foreground transition-opacity', !armed && 'opacity-50')}
        >
          {confirm}
        </button>
      </div>
    </div>
  );
}
