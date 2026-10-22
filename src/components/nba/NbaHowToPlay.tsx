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
              Spin for a career stat (points, assists, rebounds, steals or blocks per game, threes made or games played) and a direction:
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
              <li>• Each player's real <span className="text-orange-400 font-semibold">career number</span> shows on the court, straight from our stat table</li>
              <li>• A <span className="text-primary font-semibold">running total</span> tracks your combined number</li>
              <li>• Every pick needs a career line in our table (careers from 1965-66 on). If we can't find one, pick someone else</li>
              <li>• Steals and blocks only count careers that started in 1973-74 or later, when the league began keeping them</li>
              <li>• Submit and your five is scored out of 100: the best five your teams allowed is 100, the worst is 0</li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-foreground mb-2">🧮 Worked Example</h3>
            <p className="text-muted-foreground">
              The spin is HIGHEST points per game. Your five adds up to 98.0. Using only players the search offered for your
              five teams, the best possible five adds up to 120.0 and the worst 0.5. Your score is
              (98.0 minus 0.5) divided by (120.0 minus 0.5), which is 82 out of 100. On a LOWEST spin it flips: the
              smallest five your teams allowed is the 100.
            </p>
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
