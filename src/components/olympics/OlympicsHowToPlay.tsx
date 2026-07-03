import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { HelpCircle } from 'lucide-react';

export default function OlympicsHowToPlay() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center justify-center w-10 h-10 -m-2 text-muted-foreground hover:text-foreground transition-colors" aria-label="How to play">
          <HelpCircle className="w-6 h-6" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">How to Play</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>🏅 We hide a mystery Olympic athlete behind clues about their career at the Games.</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>First clue: their sport. Guess right away for the most points</li>
            <li>Reveal more clues for country, year, achievements, and medals</li>
            <li>7 clue levels. Score drops from <strong>1000</strong> to <strong>100</strong> as you reveal more</li>
            <li>Play Daily for one puzzle a day, or switch to Unlimited</li>
          </ul>
          <p className="text-xs text-muted-foreground/60">Covers Summer and Winter Games from 1980 to 2024.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
