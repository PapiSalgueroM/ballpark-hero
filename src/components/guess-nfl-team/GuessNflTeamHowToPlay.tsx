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

export function GuessNflTeamHowToPlay({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-primary text-xl font-display">
            🏈 How to Play
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            Guess The Pro Football Team
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm text-foreground">
          <div className="space-y-2">
            <p className="font-semibold text-primary">Goal</p>
            <p>Identify the mystery NFL team from progressive clues. The earlier you guess, the more points you earn!</p>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-primary">Clues (in order)</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-xs">
              <li>One-word vibe</li>
              <li>Geographic region</li>
              <li>Stadium capacity</li>
              <li>Conference & Division</li>
              <li>Super Bowl appearances</li>
              <li>Super Bowl wins</li>
              <li>Famous player era hint</li>
              <li>Uniform colors</li>
              <li>Stadium name hint</li>
              <li>Nickname hint</li>
              <li>City revealed</li>
            </ol>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-primary">Scoring</p>
            <p className="text-muted-foreground">1200 pts → 200 pts as clues reveal. Wrong guess reveals next clue!</p>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-primary">Game Modes</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li><strong>Daily:</strong> Same team for everyone</li>
              <li><strong>Unlimited:</strong> Random teams</li>
              <li><strong>Conference:</strong> Filter by AFC/NFC or division</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
