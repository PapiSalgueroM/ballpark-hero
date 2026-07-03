import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface NbaHowToPlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NbaHowToPlay({ open, onOpenChange }: NbaHowToPlayProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border text-foreground max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display text-primary text-center">
            How to Play: Build Your Starting 5
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 text-sm">
          <p className="text-muted-foreground text-center">
            Build the ultimate NBA Starting 5 by optimizing for a random stat challenge!
          </p>

          <section>
            <h3 className="font-bold text-foreground mb-2">🎰 The Challenge</h3>
            <p className="text-muted-foreground">
              A random stat is spun (PPG, RPG, Championships, Height, etc.) along with a direction:
              find the <span className="text-green-400 font-semibold">HIGHEST</span> or{' '}
              <span className="text-blue-400 font-semibold">LOWEST</span> combined total.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-foreground mb-2">🏀 Building Your Lineup</h3>
            <ul className="space-y-1.5 text-muted-foreground">
              <li>• Pick any open position (PG, SG, SF, PF, C): <span className="text-foreground font-semibold">you choose the order</span></li>
              <li>• A <span className="text-orange-400 font-semibold">random NBA team</span> is assigned for each pick</li>
              <li>• You can only select players who have <span className="text-foreground font-semibold">played for that team</span></li>
              <li>• Players must match the <span className="text-primary font-semibold">position you selected</span>: no out-of-position picks</li>
              <li>• Each player and position can only be used <span className="text-foreground font-semibold">once</span></li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-foreground mb-2">🔄 Reroll</h3>
            <p className="text-muted-foreground">
              Don't like your assigned team? Hit the <span className="text-foreground font-semibold">shuffle button</span> to reroll and get a different team.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-foreground mb-2">📊 Stats & Scoring</h3>
            <ul className="space-y-1.5 text-muted-foreground">
              <li>• Each player's <span className="text-orange-400 font-semibold">career stat</span> is shown on the court</li>
              <li>• A <span className="text-primary font-semibold">running total</span> tracks your combined stat</li>
              <li>• After filling all 5 positions, AI evaluates how well you optimized</li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-foreground mb-2">🏆 Strategy Tips</h3>
            <ul className="space-y-1.5 text-muted-foreground">
              <li>• Think about all-time greats and role players for each team</li>
              <li>• For "lowest" challenges, look for short-career or specialized players</li>
              <li>• Pick your hardest position first when you have more teams to choose from</li>
            </ul>
          </section>

          <button
            onClick={() => onOpenChange(false)}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity"
          >
            Got it! 🏀
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
