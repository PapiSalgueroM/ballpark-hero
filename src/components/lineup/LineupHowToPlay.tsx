import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface LineupHowToPlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LineupHowToPlay({ open, onOpenChange }: LineupHowToPlayProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border text-foreground max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display text-primary text-center">
            How to Play — Build Your XI
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 text-sm">
          <p className="text-muted-foreground text-center">
            Pick a formation, then fill every position with a real player from the club or nation you're given!
          </p>

          <section>
            <h3 className="font-bold text-foreground mb-2">⚽ How It Works</h3>
            <ul className="space-y-1.5 text-muted-foreground">
              <li>• Choose one of <span className="text-primary font-semibold">6 formations</span> (4-3-3, 4-4-2, etc.)</li>
              <li>• For each position, a <span className="text-foreground font-semibold">club or nation</span> is randomly assigned via the spinner</li>
              <li>• Type a player who plays (or played) for that team and submit</li>
              <li>• AI verifies your pick — if valid, the slot is filled!</li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-foreground mb-2">🎰 The Spinner</h3>
            <ul className="space-y-1.5 text-muted-foreground">
              <li>• Each position gets a random team assignment</li>
              <li>• Don't like the team? Hit the <span className="text-foreground font-semibold">🔀 Reroll</span> button for a new one</li>
              <li>• Teams can be clubs (🏟️) or nations (🏳️)</li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-foreground mb-2">📝 Filling Positions</h3>
            <ul className="space-y-1.5 text-muted-foreground">
              <li>• Tap any empty position on the pitch to select it</li>
              <li>• Type a player name — suggestions will appear to help</li>
              <li>• Each player can only be used <span className="text-primary font-semibold">once</span></li>
              <li>• Fill all 11 spots to complete your squad</li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-foreground mb-2">🏆 Rating & Sharing</h3>
            <ul className="space-y-1.5 text-muted-foreground">
              <li>• Once complete, submit your team for an <span className="text-primary font-semibold">AI rating</span></li>
              <li>• Get a score, headline, and detailed analysis</li>
              <li>• Share your lineup with friends and challenge them to beat it!</li>
            </ul>
          </section>

          <button
            onClick={() => onOpenChange(false)}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity"
          >
            Got it!
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
