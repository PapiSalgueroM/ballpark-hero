import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface NbaConnect4HowToPlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NbaConnect4HowToPlay({ open, onOpenChange }: NbaConnect4HowToPlayProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border text-foreground max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display text-primary text-center">
            How to Play: NBA Connect 4
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 text-sm">
          <p className="text-muted-foreground text-center">
            A two-player NBA trivia battle. Get 4 in a row to win.
          </p>

          <section>
            <h3 className="font-bold text-foreground mb-2">🏀 The Board</h3>
            <p className="text-muted-foreground">
              A 7×6 grid with an <span className="text-primary font-semibold">NBA attribute</span> on each column and row: teams, awards, stats, career traits.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-foreground mb-2">🎯 How to Play</h3>
            <ul className="space-y-1.5 text-muted-foreground">
              <li>• <span className="text-red-400 font-semibold">Team Red</span> and <span className="text-blue-400 font-semibold">Team Blue</span> take turns</li>
              <li>• Pick a <span className="text-foreground font-semibold">column</span>. Your piece drops to the lowest empty row</li>
              <li>• Name an NBA player who matches <span className="text-primary font-semibold">BOTH</span> the column and the row</li>
              <li>• Each player gets used <span className="text-foreground font-semibold">once</span> per game</li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-foreground mb-2">⏭️ Skipping</h3>
            <p className="text-muted-foreground">
              Blanking on a name? <span className="text-foreground font-semibold">Skip your turn</span> and let your opponent go.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-foreground mb-2">🏆 Winning</h3>
            <p className="text-muted-foreground">
              First to <span className="text-primary font-semibold">4 in a row</span> wins, horizontal, vertical, or diagonal. Full board with no winner is a draw.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-foreground mb-2">💡 Example</h3>
            <p className="text-muted-foreground">
              Column says <span className="text-orange-400 font-semibold">"Lakers"</span>, row says <span className="text-orange-400 font-semibold">"MVP Winner"</span>. You need someone who won MVP <em>and</em> played for the Lakers: LeBron James, Kobe Bryant, Shaquille O'Neal.
            </p>
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
