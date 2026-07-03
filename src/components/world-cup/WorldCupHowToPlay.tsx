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

export function WorldCupHowToPlay({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display">How to Play</DialogTitle>
          <DialogDescription>Guess the mystery World Cup player.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm text-muted-foreground">
          <p>We reveal clues one at a time. Each one narrows down the player.</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Guess early for more points, up to 1,000</li>
            <li>Tap Hint to reveal the next clue</li>
            <li>A wrong guess also reveals the next clue</li>
            <li>After all 7 clues, we show the answer</li>
          </ul>
          <div className="pt-2 border-t border-border">
            <p className="font-semibold text-foreground mb-1">Scoring</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
              <span>Clue 1: 1,000 pts</span><span>Clue 5: 300 pts</span>
              <span>Clue 2: 800 pts</span><span>Clue 6: 200 pts</span>
              <span>Clue 3: 600 pts</span><span>Clue 7: 100 pts</span>
              <span>Clue 4: 400 pts</span><span></span>
            </div>
          </div>
          <p>New puzzle every day at midnight. Same one for everyone.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
