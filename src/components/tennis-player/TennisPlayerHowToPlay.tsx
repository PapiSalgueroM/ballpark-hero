import { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { POINTS_BY_CLUE } from '@/types/tennisPlayer';

export function TennisPlayerHowToPlay() {
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button ref={opener} className="inline-flex min-h-[44px] min-w-[44px] items-center rounded-full px-3 py-2 text-sm text-purple-400 underline underline-offset-2 transition-colors hover:text-purple-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          How to Play
        </button>
      </DialogTrigger>
      <DialogContent onCloseAutoFocus={event => { event.preventDefault(); opener.current?.focus({ preventScroll: true }); }} className="bg-green-950 border-green-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-purple-400 text-xl">How to Play</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm text-green-300">
          <p>🎾 We're hiding a tennis player behind <strong className="text-purple-400">6 clues</strong>. Guess who it is.</p>
          <ol className="list-decimal list-inside space-y-1 text-green-400">
            <li>Vibe word</li>
            <li>Nationality & era</li>
            <li>Tour (ATP or WTA)</li>
            <li>Grand Slam wins</li>
            <li>Which Slams they won</li>
            <li>Famous moment</li>
          </ol>
          <p>Wrong guesses and hints reveal the next clue. Miss on the final clue and the round ends.</p>
          <p>Guess early for more points: <strong className="text-purple-400">1000</strong> on clue 1, down to <strong className="text-purple-400">100</strong> on clue 6.</p>
        </div>
        <DialogDescription className="text-sm text-green-300">Fictional example: you have {POINTS_BY_CLUE[0].toLocaleString('en-US')} points available. Take one hint or make one wrong guess, then a correct guess is worth {POINTS_BY_CLUE[1]} points. At clue 6, it is worth {POINTS_BY_CLUE[5]}.</DialogDescription>
      </DialogContent>
    </Dialog>
  );
}
