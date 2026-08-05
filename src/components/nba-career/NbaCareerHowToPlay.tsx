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

export function NbaCareerHowToPlay({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-primary text-xl font-display">
            🏀 How to Play
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            NBA Career Path
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm text-foreground">
          <div className="space-y-2">
            <p className="font-semibold text-primary">Goal</p>
            <p>Guess the mystery NBA player from progressive career clues.</p>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-primary">How it works</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>You start with the player's position</li>
              <li>Reveal more clues: country, draft, teams, stats, awards</li>
              <li>Guess at any point, earlier guesses earn more points</li>
              <li>Start at 1,000 points; each clue costs 150 (floor of 100)</li>
            </ul>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-primary">Modes</p>
            <p className="text-muted-foreground">
              Daily gives everyone the same player and saves your result. Unlimited serves random players from the pool.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
