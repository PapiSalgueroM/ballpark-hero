import { useState } from 'react';

export function NascarDriverHowToPlay() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-sm text-neutral-500 hover:text-red-400 underline transition-colors">
        How to play
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setOpen(false)}>
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 max-w-sm w-full space-y-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-red-400">How to Play</h2>
            <ol className="text-sm text-neutral-300 space-y-2 list-decimal list-inside">
              <li>A mystery NASCAR driver is chosen</li>
              <li>6 clues are revealed one at a time</li>
              <li>Guess the driver after each clue</li>
              <li>Earlier guesses earn more points</li>
              <li>Clues: Vibe → Era → Car Number → Wins → Championships → Famous Moment</li>
            </ol>
            <div className="text-xs text-neutral-500 space-y-1">
              <p>🏆 1000 pts on clue 1 → 100 pts on clue 6</p>
              <p>Covers Cup Series drivers from 1970–2025</p>
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
