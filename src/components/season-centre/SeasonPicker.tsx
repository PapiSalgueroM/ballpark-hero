/* Round 1046: the list of seasons a career can watch again, for any sport's
   Season Centre. One tile over the page with its own scroll box and one way
   back: the page behind is locked exactly as the viewer locks it, and the
   list keeps a wheel or a swipe to itself.

   The sport hands in the rows. A row with `locked` is not a button: it says,
   in the sport's own honest words, why that season cannot be replayed. */
import { focusDialogOnMount, escapeCloses } from '@/lib/dialogA11y';
import { useBodyLock } from './useBodyLock';

export interface PickerRow {
  id: string;
  /** "2031/32 · Arsenal" */
  label: string;
  /** "4th of 20 · 34 apps · 12 goals" */
  sub: string;
  /** A small mark at the end of the row (a trophy). */
  chip?: string;
  /** Why this season cannot be opened; the row is then a plain tile, not a button. */
  locked?: string;
}

interface Props {
  title: string;
  rows: PickerRow[];
  exitLabel: string;
  onPick: (id: string) => void;
  onClose: () => void;
}

export function SeasonPicker({ title, rows, exitLabel, onPick, onClose }: Props) {
  useBodyLock();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm" data-season-centre data-season-picker>
      <div role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={focusDialogOnMount} onKeyDown={escapeCloses(onClose)} className="cm-rise w-full max-w-sm space-y-3 rounded-2xl border border-border bg-card p-4 outline-none">
        <div className="text-sm font-bold">{title}</div>
        <ul className="max-h-[60vh] space-y-2 overflow-y-auto overscroll-contain" data-picker-list>
          {rows.map(r => (
            <li key={r.id}>
              {r.locked ? (
                <div className="flex min-h-14 flex-col justify-center rounded-lg border border-border/50 px-3 py-2 text-muted-foreground" data-replay-locked={r.id}>
                  <span className="text-sm font-semibold">{r.label}</span>
                  <span className="text-xs">{r.locked}</span>
                </div>
              ) : (
                <button type="button" onClick={() => onPick(r.id)} className="flex min-h-14 w-full items-center gap-2 rounded-lg border border-border px-3 py-2 text-left hover:bg-muted/40" data-replay-row={r.id}>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold">{r.label}</span>
                    <span className="block text-xs text-muted-foreground">{r.sub}</span>
                  </span>
                  {r.chip && <span className="shrink-0 text-base" aria-hidden="true">{r.chip}</span>}
                </button>
              )}
            </li>
          ))}
        </ul>
        <button type="button" onClick={onClose} className="h-11 w-full rounded-lg bg-primary text-sm font-bold text-primary-foreground" data-picker-exit>{exitLabel}</button>
      </div>
    </div>
  );
}
