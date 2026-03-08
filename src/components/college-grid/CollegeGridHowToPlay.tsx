import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CollegeGridHowToPlay({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display">How to Play</DialogTitle>
          <DialogDescription>Fill the 3×3 grid with college football players!</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm text-muted-foreground">
          <p>Each cell needs a player who matches <strong>both</strong> the row and column attribute.</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Tap a cell, type a player name, and submit</li>
            <li>Correct answers turn green with a rarity percentage</li>
            <li>Wrong answers turn red — retry costs a guess</li>
            <li>You have 15 guesses to complete the grid</li>
          </ul>
          <div className="pt-2 border-t border-border">
            <p className="font-semibold text-foreground mb-1">Rarity System</p>
            <ul className="list-disc list-inside space-y-0.5 text-xs">
              <li><span className="text-[hsl(43,85%,52%)]">🔥 Rare Pick</span> — under 5% of players chose this</li>
              <li><span className="text-blue-400">Uncommon</span> — 5–25% of players</li>
              <li>Standard — over 25%</li>
            </ul>
          </div>
          <p>Players from 2000–2026. New grid every day at midnight!</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
