import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ConnectionsHowToPlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConnectionsHowToPlay({ open, onOpenChange }: ConnectionsHowToPlayProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold font-display text-primary">
            How to Play
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm text-foreground">
          <p>
            <strong>Soccer Connections</strong>: 16 players, 4 hidden categories.
            Pick 4 players you think belong together and hit Submit. Find all 4 groups before you run out of lives.
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
            <li>Select 4 players and press <strong className="text-foreground">Submit</strong> to check your guess</li>
            <li>You get 4 lives for the round</li>
            <li>Categories are never based on player position</li>
          </ul>

          <div>
            <p className="font-semibold text-foreground mb-2">Category examples</p>
            <ul className="space-y-1 text-muted-foreground text-xs">
              <li>• Played for Chelsea</li>
              <li>• From France</li>
              <li>• Won the Ballon d'Or</li>
              <li>• Over 100 goals in Premier League</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-foreground mb-2">Difficulty colors</p>
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-correct" /> Easy</span>
              <span className="text-muted-foreground">→</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-close" /> Medium</span>
              <span className="text-muted-foreground">→</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-500" /> Hard</span>
              <span className="text-muted-foreground">→</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-purple-500" /> Insane</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Watch for players who seem to fit more than one category. Only one grouping is correct.
            Use <strong className="text-foreground">Hint</strong> (up to 4 times) to reveal an unsolved category name, easiest first.
          </p>

          <p className="text-xs text-muted-foreground italic">
            Sixteen names, four hidden groups, four wrong guesses to spare.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
