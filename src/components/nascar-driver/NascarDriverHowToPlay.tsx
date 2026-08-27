import { useState } from 'react';
import { focusDialogOnMount, escapeCloses } from '@/lib/dialogA11y';

export function NascarDriverHowToPlay() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} className="inline-flex items-center rounded-full px-3 py-2 text-sm text-neutral-400 underline transition-colors hover:text-red-400">
        How to play
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="How to play" tabIndex={-1} ref={focusDialogOnMount} onKeyDown={escapeCloses(() => setOpen(false))} className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 max-w-sm w-full space-y-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-red-400">How to Play</h2>
            <ol className="text-sm text-neutral-300 space-y-2 list-decimal list-inside">
              <li>We pick a mystery NASCAR driver</li>
              <li>6 clues reveal one at a time</li>
              <li>Guess the driver after each clue</li>
              <li>Guess early for more points</li>
              <li>Clues: Vibe, Era, Car Number, Wins, Championships, Famous Moment</li>
            </ol>
            <div className="text-xs text-neutral-400 space-y-1">
              <p>🏆 1000 pts on clue 1, down to 100 pts on clue 6</p>
              <p>Covers Cup Series drivers from 1970 to 2025</p>
            </div>
            <button onClick={() => setOpen(false)} className="w-full py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-colors">
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
