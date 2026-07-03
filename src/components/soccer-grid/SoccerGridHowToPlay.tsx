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

export function SoccerGridHowToPlay({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display">How to Play</DialogTitle>
          <DialogDescription>Fill the 3×3 soccer grid with valid players.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm text-muted-foreground">
          <p>Each cell needs a soccer player who matches <strong>both</strong> its row and column.</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Tap a cell, type a player name, and submit</li>
            <li>Correct answers turn green and show a rarity percentage</li>
            <li>Wrong answers turn red, you can retry but it costs a guess</li>
            <li>You get 15 guesses to complete the grid</li>
          </ul>
          <div className="pt-2 border-t border-border">
            <p className="font-semibold text-foreground mb-1">Difficulty</p>
            <ul className="list-disc list-inside space-y-0.5 text-xs">
              <li><strong>Easy</strong>: clubs, leagues, positions, the widest answer pools</li>
              <li><strong>Normal</strong>: a mix of clubs, leagues, and nationalities</li>
              <li><strong>Hard</strong>: awards, Champions League and World Cup winners, narrow pools</li>
            </ul>
          </div>
          <div className="pt-2 border-t border-border">
            <p className="font-semibold text-foreground mb-1">Timer</p>
            <p className="text-xs">Pick Unlimited, or race the clock at 90s, 60s, or 40s.</p>
          </div>
          <div className="pt-2 border-t border-border">
            <p className="font-semibold text-foreground mb-1">Overtime</p>
            <p className="text-xs">Cells still empty when the round ends? Keep filling them in Overtime. Your score and rarity are already locked in, Overtime is just for fun.</p>
          </div>
          <div className="pt-2 border-t border-border">
            <p className="font-semibold text-foreground mb-1">Rarity Score</p>
            <p className="text-xs">Each correct pick shows what percent of players picked the same name. Lower is more impressive.</p>
          </div>
          <p>A new grid drops every day at midnight.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
