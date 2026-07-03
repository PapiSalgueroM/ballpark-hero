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

export function FootballDraftHowToPlay({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-[hsl(var(--ft-gold))] text-xl font-display">
            🏈 How to Play
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            Pro Football Draft Guesser
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm text-foreground">
          <div className="space-y-2">
            <p className="font-semibold text-[hsl(var(--ft-gold))]">Goal</p>
            <p>Guess what round each NFL player was drafted in. Clues reveal one at a time.</p>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-[hsl(var(--ft-gold))]">Clues, in order</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Position and college (always shown)</li>
              <li>Height and weight</li>
              <li>40-yard dash time</li>
              <li>Bench press reps and vertical jump</li>
              <li>Draft year</li>
            </ul>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-[hsl(var(--ft-gold))]">Scoring</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li><strong>Exact round:</strong> up to 30 points, more if you guess with fewer clues</li>
              <li><strong>One round off:</strong> 8 points</li>
              <li><strong>Two rounds off:</strong> 3 points</li>
              <li><strong>More than two off:</strong> 0 points</li>
            </ul>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-[hsl(var(--ft-gold))]">Daily Challenge</p>
            <p className="text-muted-foreground">5 players per game. New challenge at midnight, share your score.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
