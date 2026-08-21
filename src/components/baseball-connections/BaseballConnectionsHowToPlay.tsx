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

export function BaseballConnectionsHowToPlay({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-[hsl(var(--bb-red-ink))] text-xl font-display">
            ⚾ How to Play
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            Baseball Connections
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm text-foreground">
          <div className="space-y-2">
            <p className="font-semibold text-[hsl(var(--bb-red-ink))]">Goal</p>
            <p>Find four groups of 5 baseball players who share a connection.</p>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-[hsl(var(--bb-red-ink))]">How it works</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Select 5 players you think belong together</li>
              <li>Tap "Submit" to check your guess</li>
              <li>Correct groups lock in and reveal their connection</li>
              <li>Wrong guesses cost a life. You get 4 total</li>
            </ul>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-[hsl(var(--bb-red-ink))]">Difficulty</p>
            <div className="space-y-1 text-muted-foreground">
              <p><span className="text-yellow-400 font-semibold">🟡 Yellow</span>: Easiest</p>
              <p><span className="text-emerald-400 font-semibold">🟢 Green</span>: Medium</p>
              <p><span className="text-blue-400 font-semibold">🔵 Blue</span>: Hard</p>
              <p><span className="text-purple-400 font-semibold">🟣 Purple</span>: Hardest</p>
            </div>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-[hsl(var(--bb-red-ink))]">Connections can include</p>
            <p className="text-muted-foreground">Same team, same draft class, same country, same award, same position, same era, and more.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
