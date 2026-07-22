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

export function MlbConnect4HowToPlay({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-primary text-xl font-display">
            ⚾ How to Play
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            MLB Connect 4
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm text-foreground">
          <div className="space-y-2">
            <p className="font-semibold text-primary">Goal</p>
            <p>Classic Connect 4, but every piece is earned with baseball knowledge. Get four of your color in a row.</p>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-primary">How it works</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Two players (red and blue) take turns — pass and play</li>
              <li>Pick a column; your piece falls to the lowest empty row</li>
              <li>Name an MLB player who matches BOTH the column and row criteria</li>
              <li>Valid answers claim the cell. Wrong answers don't cost your turn — try again or skip</li>
              <li>Every player name can only be used once per game</li>
            </ul>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-primary">Tips</p>
            <p className="text-muted-foreground">
              Franchise history counts across relocations — Brooklyn Dodgers count as Dodgers, Expos as Nationals. Any era is fair game, from Babe Ruth to today's stars.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
