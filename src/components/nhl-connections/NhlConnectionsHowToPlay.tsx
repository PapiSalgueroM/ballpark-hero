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

export function NhlConnectionsHowToPlay({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-primary text-xl font-display">
            🏒 How to Play
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            NHL Connections
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm text-foreground">
          <div className="space-y-2">
            <p className="font-semibold text-primary">Goal</p>
            <p>Find four groups of 5 NHL players who share a connection.</p>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-primary">How it works</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Select 5 players you think belong together</li>
              <li>Tap "Submit" to check your guess</li>
              <li>Correct groups lock in and reveal their connection</li>
              <li>Wrong guesses cost a life. You get 4 total</li>
            </ul>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-primary">Difficulty</p>
            <div className="space-y-1 text-muted-foreground">
              <p><span className="text-yellow-400 font-semibold">🟡 Yellow</span>: Easiest</p>
              <p><span className="text-emerald-400 font-semibold">🟢 Green</span>: Medium</p>
              <p><span className="text-blue-400 font-semibold">🔵 Blue</span>: Hard</p>
              <p><span className="text-purple-400 font-semibold">🟣 Purple</span>: Hardest</p>
            </div>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-primary">Connections can include</p>
            <p className="text-muted-foreground">Same franchise, career milestones, same era, and more. A player's career counts for every team it touched.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
