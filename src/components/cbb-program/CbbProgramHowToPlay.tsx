import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { HelpCircle } from 'lucide-react';

const RULES = [
  'We pick a mystery college basketball program each round.',
  'Clues reveal one at a time, from a vibe word to the mascot.',
  'Type the school name to guess after each clue.',
  'Guess early for a higher score. Max is 1,000 points.',
  'Daily challenge gives everyone the same program.',
];

export function CbbProgramHowToPlay() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-slate-400 transition-colors hover:text-white"
      >
        <HelpCircle className="w-4 h-4" /> How to Play
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-700 text-white">
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
        </DialogContent>
      </Dialog>
    </>
  );
}
