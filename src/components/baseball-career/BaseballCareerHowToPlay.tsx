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

export function BaseballCareerHowToPlay({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-[hsl(var(--bb-red))] text-xl font-display">
            ⚾ How to Play
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            Baseball Career Path
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm text-foreground">
          <div className="space-y-2">
            <p className="font-semibold text-[hsl(var(--bb-red))]">Goal</p>
            <p>Guess the mystery baseball player from progressive clues. The earlier you guess, the more points you earn!</p>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-[hsl(var(--bb-red))]">Clues revealed in order</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Position</li>
              <li>Draft round and year</li>
              <li>First MLB team</li>
              <li>Career teams (one by one)</li>
              <li>Career stats (AVG, HR, RBI or ERA, SO, W)</li>
              <li>Awards (Gold Glove, Cy Young, MVP, WS wins)</li>
            </ul>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-[hsl(var(--bb-red))]">Scoring</p>
            <p className="text-muted-foreground">Start at 1,000 points. Each clue revealed costs 150 points. Guess early for maximum score!</p>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-[hsl(var(--bb-red))]">Daily Challenge</p>
            <p className="text-muted-foreground">New player at midnight. Same challenge for everyone — share your score!</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
