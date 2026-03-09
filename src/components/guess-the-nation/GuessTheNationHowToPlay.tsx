import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { HelpCircle } from 'lucide-react';

export default function GuessTheNationHowToPlay() {
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
          <p>Guess the mystery nation from progressive clues about their sporting history.</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>12 clues are revealed one at a time</li>
            <li>Guess early for maximum points (up to <strong>1200</strong>)</li>
            <li>Each wrong guess reveals the next clue</li>
            <li>Easy mode: top 20 medal-winning nations</li>
            <li>Hard mode: all nations with at least one medal</li>
          </ul>
          <p className="font-medium text-foreground">Streak Badges:</p>
          <ul className="list-none space-y-0.5">
            <li>🥉 Bronze Medalist — 3 streak</li>
            <li>🥈 Silver Medalist — 5 streak</li>
            <li>🥇 Gold Medalist — 10 streak</li>
            <li>🐐 All Time Great — 15 streak</li>
          </ul>
          <p className="text-xs text-muted-foreground/60">Covers nations from the world's greatest sporting competitions, 1896–2024.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
