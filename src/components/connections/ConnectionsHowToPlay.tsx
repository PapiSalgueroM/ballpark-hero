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
            <strong>Football Connections</strong> — 16 footballers, 4 hidden categories.
            Select 4 players you think belong together and hit Submit. Crack all 4 groups before your lives run out!
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
            <li>Select 4 players and press <strong className="text-foreground">Submit</strong> to check if you are correct.</li>
            <li>Find all 4 groups without using all of your lives!</li>
            <li>Connections will never be based upon player positions.</li>
          </ul>

          <div>
            <p className="font-semibold text-foreground mb-2">Category Examples</p>
            <ul className="space-y-1 text-muted-foreground text-xs">
              <li>• Played for Chelsea</li>
              <li>• From France</li>
              <li>• Won the Ballon d'Or</li>
              <li>• Over 100 goals in Premier League</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-foreground mb-2">Difficulty Colors</p>
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
            Watch out for players that seem to belong to multiple categories — there is only 1 acceptable solution.
            Use the <strong className="text-foreground">Hint</strong> button (up to 4 times) to reveal unsolved category names, starting from the easiest.
          </p>

          <p className="text-xs text-muted-foreground italic">
            Inspired by New York Times' Connections game.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
