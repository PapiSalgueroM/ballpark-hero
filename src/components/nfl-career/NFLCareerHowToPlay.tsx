import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NFLCareerHowToPlay({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-display text-primary">How to Play</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>🏈 Guess the NFL player from clues about their career.</p>
          <ol className="list-decimal list-inside space-y-1.5">
            <li>Guess from the first clue for 6 points.</li>
            <li>A miss or a requested clue reveals the next clue and costs 1 point. Only guesses go in your history.</li>
            <li>Clues: Draft, College, First Team, Stats, Teams, Jersey Number</li>
            <li>On the final clue, a correct guess earns 1 point and a miss ends the round with 0.</li>
          </ol>
          <p className="text-xs">For example, reveal College after Draft and a correct first guess earns 5 points. Daily clues and guesses stay in this browser until the next challenge at midnight Eastern.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
