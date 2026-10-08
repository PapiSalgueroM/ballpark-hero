/* Round 1048: the Season Centre's plain one message tile, for any sport: a
   season that cannot be shown game by game, or an error drawing one, with
   the way out (and Retry after an error). It takes focus and Escape closes
   it. Sport neutral: the title and the words come from whoever shows it.
   (Soccer's binding still carries its own copy of this tile; folding it onto
   this file is owed, and is not this round's to touch.) */
import { focusDialogOnMount, escapeCloses } from '@/lib/dialogA11y';

export function CentreTile({ title, text, exitLabel, onClose, onRetry }: {
  title: string;
  text: string;
  exitLabel: string;
  onClose: () => void;
  onRetry?: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm" data-season-centre data-centre-tile>
      <div role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={focusDialogOnMount} onKeyDown={escapeCloses(onClose)} className="w-full max-w-sm space-y-3 rounded-2xl border border-border bg-card p-4 text-center outline-none">
        <div className="text-sm font-bold">📺 {title}</div>
        <p className="text-sm text-muted-foreground">{text}</p>
        <div className="flex gap-2">
          {onRetry && <button type="button" onClick={onRetry} className="h-11 flex-1 rounded-lg border border-border text-sm font-semibold">↻ Retry</button>}
          <button type="button" onClick={onClose} className="h-11 flex-1 rounded-lg bg-primary text-sm font-bold text-primary-foreground" data-centre-exit>{exitLabel}</button>
        </div>
      </div>
    </div>
  );
}
