import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface CareerHowToPlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CareerHowToPlay({ open, onOpenChange }: CareerHowToPlayProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border text-foreground max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display text-primary text-center">
            How to Play: Career Quiz
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 text-sm">
          <p className="text-muted-foreground text-center">
            A player's career is laid out season by season. Figure out who it is.
          </p>

          <section>
            <h3 className="font-bold text-foreground mb-2">📋 The Board</h3>
            <p className="text-muted-foreground">
              Each row is one season. <span className="text-foreground font-semibold">Season</span> is always visible.
              <span className="text-foreground font-semibold"> Club, Appearances, Goals, Assists</span>, and <span className="text-foreground font-semibold">Market Value</span> are hidden behind boxes.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-foreground mb-2">👆 Uncovering Boxes</h3>
            <ul className="space-y-1.5 text-muted-foreground">
              <li>• Tap any hidden box to reveal that cell</li>
              <li>• Press <span className="text-foreground font-semibold">Give Hint</span> to reveal <span className="text-primary font-semibold">4 random boxes</span> at once</li>
              <li>• Use Give Hint as many times as you need</li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-foreground mb-2">🎯 Guessing</h3>
            <ul className="space-y-1.5 text-muted-foreground">
              <li>• Type a player name in the search bar and pick from the suggestions</li>
              <li>• You get <span className="text-primary font-semibold">8 guesses</span> to identify the player</li>
              <li>• Guess anytime, even before uncovering a single box</li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-foreground mb-2">🏆 Strategy Tips</h3>
            <ul className="space-y-1.5 text-muted-foreground">
              <li>• Club names are the biggest tell: a unique transfer history narrows it down fast</li>
              <li>• Goal-heavy seasons point to prolific strikers</li>
              <li>• Market value peaks hint at a player's prime years</li>
              <li>• Fewer boxes used means a more impressive solve</li>
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
