import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface HigherLowerHowToPlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HigherLowerHowToPlay({ open, onOpenChange }: HigherLowerHowToPlayProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border text-foreground max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display text-primary text-center">
            How to Play: Higher or Lower
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 text-sm">
          <p className="text-muted-foreground text-center">
            Compare two players' career stats and build the longest streak you can.
          </p>

          <section>
            <h3 className="font-bold text-foreground mb-2">🎮 Gameplay</h3>
            <ul className="space-y-1.5 text-muted-foreground">
              <li>• <span className="text-foreground font-semibold">Player A</span> shows all their career stats</li>
              <li>• <span className="text-foreground font-semibold">Player B</span> shows up next to them with stats hidden</li>
              <li>• Pick a stat from Player A you think is <span className="text-primary font-semibold">higher</span> than Player B's</li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-foreground mb-2">📊 The 3 Stats</h3>
            <ul className="space-y-1.5 text-muted-foreground">
              <li>🎽 <span className="text-foreground font-semibold">Appearances</span>: Competitive club games, all competitions</li>
              <li>⚽ <span className="text-foreground font-semibold">Goals</span>: Goals in those same club games</li>
              <li>🌍 <span className="text-foreground font-semibold">Int'l Caps</span>: Senior national team appearances</li>
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              Friendlies, tour games, youth and reserve football do not count. Caps are checked
              against two published sources before a player joins the pool, and the club columns
              say on the card when we are still checking them.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-foreground mb-2">🔥 Streak Reactions</h3>
            <ul className="space-y-1.5 text-muted-foreground">
              <li>😬 <span className="text-foreground">0</span>: Embarrassing</li>
              <li>😐 <span className="text-foreground">1-2</span>: Meh</li>
              <li>🙂 <span className="text-foreground">3-5</span>: Not bad</li>
              <li>😊 <span className="text-foreground">6-10</span>: Solid</li>
              <li>🔥 <span className="text-foreground">11-19</span>: On fire!</li>
              <li>🌟 <span className="text-foreground">20-29</span>: Incredible</li>
              <li>🏆 <span className="text-foreground">30+</span>: LEGENDARY</li>
            </ul>
          </section>

          <button
            onClick={() => onOpenChange(false)}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity"
          >
            Let's Go!
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
