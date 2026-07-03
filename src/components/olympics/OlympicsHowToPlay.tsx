import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { HelpCircle } from 'lucide-react';

export default function OlympicsHowToPlay() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-muted-foreground hover:text-foreground transition-colors" aria-label="How to play">
          <HelpCircle className="w-6 h-6" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">How to Play</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>Guess the mystery athlete from progressive clues about their career at the Games.</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Start with the <strong>sport/discipline</strong>. Guess early for max points!</li>
            <li>Reveal more clues: country, year, achievements, medals</li>
            <li>Scoring: <strong>1000</strong> → <strong>100</strong> across 7 clue levels</li>
            <li>New challenge every day at midnight</li>
          </ul>
          <p className="text-xs text-muted-foreground/60">Covers Summer &amp; Winter Games from 1980–2024.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
