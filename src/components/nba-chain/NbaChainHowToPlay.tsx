import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface NbaChainHowToPlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NbaChainHowToPlay({ open, onOpenChange }: NbaChainHowToPlayProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display text-primary">
            How to Play 🔗
          </DialogTitle>
          <DialogDescription className="sr-only">NBA Chain Game rules</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm text-foreground">
          <div>
            <h3 className="font-bold mb-1">🎯 Goal</h3>
            <p className="text-muted-foreground">
              Build the longest chain of NBA players you can. Each new player must have been a teammate of the last one, on the same NBA team.
            </p>
          </div>

          <div>
            <h3 className="font-bold mb-1">🔗 Valid Connections</h3>
            <p className="text-muted-foreground">
              Two players connect if they were ever on the same NBA team, even for a partial season, a trade, or a short stint.
            </p>
          </div>

          <div>
            <h3 className="font-bold mb-1">📋 Rules</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>No repeating players in the same chain</li>
              <li>Only NBA players, past or present</li>
              <li>Each player connects to the one right before it</li>
              <li>Nicknames and partial names work ("Bron", "KD")</li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold mb-1">🎯 Two Modes</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li><span className="font-semibold text-foreground">Endless</span> (default): keep going until you get stuck</li>
              <li><span className="font-semibold text-foreground">Round</span>: exactly 10 picks, scored against a par of 7</li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold mb-1">🏆 Scoring</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>+1 point per valid connection</li>
              <li>Endless mode: your best streak saves on this device</li>
              <li>Round mode: finishing above par 7 out of 10 picks is a strong round</li>
              <li>Share your chain when you're done</li>
            </ul>
          </div>

          <button
            onClick={() => onOpenChange(false)}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-all mt-2"
          >
            Let's Play!
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
