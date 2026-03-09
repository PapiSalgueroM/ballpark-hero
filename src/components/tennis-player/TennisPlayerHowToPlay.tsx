import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export function TennisPlayerHowToPlay() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-sm text-purple-400 underline underline-offset-2 hover:text-purple-300 transition-colors">
          How to Play
        </button>
      </DialogTrigger>
      <DialogContent className="bg-green-950 border-green-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-purple-400 text-xl">How to Play</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm text-green-300">
          <p>A mystery tennis player is hidden behind <strong className="text-purple-400">6 clues</strong>.</p>
          <p>Clues are revealed one at a time — guess after each one!</p>
          <ol className="list-decimal list-inside space-y-1 text-green-400">
            <li>Vibe word</li>
            <li>Nationality & era</li>
            <li>Tour (ATP / WTA)</li>
            <li>Grand Slam wins</li>
            <li>Which Slams they won</li>
            <li>Famous moment</li>
          </ol>
          <p>Scoring: <strong className="text-purple-400">1000</strong> for clue 1 down to <strong className="text-purple-400">100</strong> for clue 6.</p>
          <p>Wrong guesses reveal the next clue.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
