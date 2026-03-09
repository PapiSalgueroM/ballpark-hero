import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { HelpCircle } from 'lucide-react';

const RULES = [
  'A mystery F1 driver is chosen each round.',
  'Clues are revealed one at a time — from a vibe word to a famous moment.',
  "Type the driver's name to guess after each clue.",
  'Fewer clues used = higher score (max 1,000 points).',
  'Daily challenge gives everyone the same driver.',
];

export function F1DriverHowToPlay() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
      >
        <HelpCircle className="w-4 h-4" /> How to Play
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md bg-zinc-900 border-zinc-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-400 text-center">How to Play</DialogTitle>
          </DialogHeader>
          <ul className="space-y-2 text-sm text-zinc-300">
            {RULES.map((r, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-red-400 font-bold">{i + 1}.</span> {r}
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
