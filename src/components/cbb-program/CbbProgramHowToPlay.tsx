import { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { HelpCircle } from 'lucide-react';
import { POINTS_BY_CLUE } from '@/types/cbbProgram';

const RULES = [
  'We pick a mystery college basketball program each round.',
  'Clues reveal one at a time, from a vibe word to the mascot.',
  'Type the school name to guess after each clue.',
  'A wrong guess opens the next clue. Miss on the final clue and the round ends.',
  'Guess early for a higher score. Max is 1,000 points.',
  'Daily challenge gives everyone the same program.',
];

export function CbbProgramHowToPlay() {
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        ref={opener}
        onClick={() => setOpen(true)}
        className="inline-flex min-h-[44px] min-w-[44px] items-center gap-1.5 rounded-full px-3 py-2 text-sm text-slate-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <HelpCircle className="w-4 h-4" /> How to Play
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onCloseAutoFocus={event => { event.preventDefault(); opener.current?.focus({ preventScroll: true }); }} className="max-w-md bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-amber-400 text-center">How to Play</DialogTitle>
          </DialogHeader>
          <ul className="space-y-2 text-sm text-slate-300">
            {RULES.map((r, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-amber-400 font-bold">{i + 1}.</span> {r}
              </li>
            ))}
          </ul>
          <DialogDescription className="text-sm text-slate-300">Fictional example: you have {POINTS_BY_CLUE[0].toLocaleString('en-US')} points available. Make one wrong guess, then a correct guess is worth {POINTS_BY_CLUE[1]} points. At clue 6, it is worth {POINTS_BY_CLUE[5]}.</DialogDescription>
        </DialogContent>
      </Dialog>
    </>
  );
}
