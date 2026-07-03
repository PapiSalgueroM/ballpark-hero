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
            <h3 className="font-bold text-foreground mb-2">📊 The 5 Stats</h3>
            <ul className="space-y-1.5 text-muted-foreground">
              <li>🎽 <span className="text-foreground font-semibold">Appearances</span>: All-time career games</li>
              <li>⚽ <span className="text-foreground font-semibold">Goals</span>: All-time career goals</li>
              <li>👟 <span className="text-foreground font-semibold">Assists</span>: All-time career assists</li>
              <li>🏆 <span className="text-foreground font-semibold">Trophies</span>: Total silverware won</li>
              <li>🌍 <span className="text-foreground font-semibold">Int'l Caps</span>: National team appearances</li>
            </ul>
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
