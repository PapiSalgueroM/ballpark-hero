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

export function GuessTheYearHowToPlay({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-primary text-xl font-display">
            📅 How to Play
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            Guess The Year
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm text-foreground">
          <div className="space-y-2">
            <p className="font-semibold text-primary">Goal</p>
            <p>Figure out which year all the sports facts are from. Every clue in the round happened in the same year!</p>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-primary">Gameplay</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>You start with 1 clue revealed</li>
              <li>Make a guess using the year picker</li>
              <li>Wrong guess? A new clue is revealed</li>
              <li>6 clues total, 6 chances to guess</li>
            </ul>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-primary">Scoring</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Clue 1: 1,000 points</li>
              <li>Clue 2: 800 points</li>
              <li>Clue 3: 600 points</li>
              <li>Clue 4: 400 points</li>
              <li>Clue 5: 200 points</li>
              <li>Clue 6: 100 points</li>
            </ul>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-primary">Sports Covered</p>
            <p className="text-muted-foreground">NFL, NBA, MLB, NHL, UFC, College Football, World Cup, and Olympics</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
