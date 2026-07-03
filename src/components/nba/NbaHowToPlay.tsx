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
            Build a 5-man NBA lineup that hits a random stat target.
          </p>

          <section>
            <h3 className="font-bold text-foreground mb-2">🎰 The Challenge</h3>
            <p className="text-muted-foreground">
              Spin for a stat (PPG, RPG, Championships, Height, and more) and a direction:
              build the <span className="text-green-400 font-semibold">HIGHEST</span> or{' '}
              <span className="text-blue-400 font-semibold">LOWEST</span> combined total.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-foreground mb-2">🏀 Building Your Lineup</h3>
            <ul className="space-y-1.5 text-muted-foreground">
              <li>• Pick any open position (PG, SG, SF, PF, C) in <span className="text-foreground font-semibold">any order you want</span></li>
              <li>• Each pick gets a <span className="text-orange-400 font-semibold">random NBA team</span> assigned to it</li>
              <li>• You can only name players who <span className="text-foreground font-semibold">played for that team</span></li>
              <li>• Players must match the <span className="text-primary font-semibold">position you picked</span>, no out-of-position subs</li>
              <li>• Each player and position gets used <span className="text-foreground font-semibold">once</span></li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-foreground mb-2">🔄 Reroll</h3>
            <p className="text-muted-foreground">
              Don't like your team? Hit <span className="text-foreground font-semibold">shuffle</span> for a different one.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-foreground mb-2">📊 Stats & Scoring</h3>
            <ul className="space-y-1.5 text-muted-foreground">
              <li>• Each player's <span className="text-orange-400 font-semibold">career stat</span> shows on the court</li>
              <li>• A <span className="text-primary font-semibold">running total</span> tracks your combined number</li>
              <li>• Fill all 5 spots and an AI rates how well you did</li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-foreground mb-2">🏆 Strategy Tips</h3>
            <ul className="space-y-1.5 text-muted-foreground">
              <li>• Know your all-time greats and role players for each team</li>
              <li>• For "lowest" challenges, look for short careers or specialists</li>
              <li>• Fill your hardest position first while you still have picks left</li>
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
