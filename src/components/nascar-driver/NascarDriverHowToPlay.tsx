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
            {/* ROUND 374: this list used to promise "Vibe, Era, Car Number,
                Wins, Championships, Famous Moment", which were the six columns
                the game tried to read and none of which exist. It now says
                what the clues actually are. */}
            <ol className="text-sm text-neutral-300 space-y-2 list-decimal list-inside">
              <li>We pick a mystery NASCAR driver</li>
              <li>6 clues reveal one at a time</li>
              <li>Guess the driver after each clue</li>
              <li>Guess early for more points</li>
              <li>Clues go from the years they were winning, to their title count, to three races they actually won</li>
            </ol>
            <div className="rounded-xl border border-neutral-700 bg-neutral-950 p-3 text-xs text-neutral-300 space-y-1">
              <p className="font-semibold text-red-400">Worked example</p>
              <p>Clue 1 says "Has race wins on record between 1970 and 1984". Clue 2 says "Won the Cup Series championship 7 times". Only a handful of drivers have seven, so you are already close. Clue 3 says "Took a title year driving a Plymouth", which dates him further. Clue 4 says "Won the Daytona 500 in 1973".</p>
              <p className="text-neutral-400">That one is Richard Petty. Answering on clue 2 scores 800; waiting until clue 4 scores 400.</p>
            </div>
            <div className="text-xs text-neutral-400 space-y-1">
              <p>🏆 1000 pts on clue 1, down to 100 pts on clue 6</p>
              <p>59 Cup Series drivers, with wins on record from 1970 to 2025</p>
              <p>Every clue comes from a real race result or a real championship season. Where our records are thin we say "on record" rather than guessing at a career total.</p>
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
