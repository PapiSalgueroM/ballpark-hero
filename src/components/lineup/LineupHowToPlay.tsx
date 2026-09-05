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
            How to Play: Build Your XI
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 text-sm">
          <p className="text-muted-foreground text-center">
            Pick a formation, then fill every position with a real player from the club or nation you get.
          </p>

          <section>
            <h3 className="font-bold text-foreground mb-2">⚽ How It Works</h3>
            <ul className="space-y-1.5 text-muted-foreground">
              <li>• Choose one of <span className="text-primary font-semibold">6 formations</span> (4-3-3, 4-4-2, and more)</li>
              <li>• Each position gets a <span className="text-foreground font-semibold">club or nation</span> from the spinner</li>
              <li>• Type a player who plays or played for that team and submit</li>
              <li>• If your pick checks out, the slot fills</li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-foreground mb-2">🎰 The Spinner</h3>
            <ul className="space-y-1.5 text-muted-foreground">
              <li>• Each position gets a random team assignment</li>
              <li>• Don't like the team? Hit <span className="text-foreground font-semibold">🔀 Reroll</span> for a new one</li>
              <li>• Teams can be clubs (🏟️) or nations (🏳️)</li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-foreground mb-2">📝 Filling Positions</h3>
            <ul className="space-y-1.5 text-muted-foreground">
              <li>• Tap any empty position on the pitch to select it</li>
              <li>• Type a player name and pick from the suggestions</li>
              <li>• Each player gets used <span className="text-primary font-semibold">once</span></li>
              <li>• Fill all 11 spots to complete your squad</li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-foreground mb-2">🧤 Positions Have To Fit</h3>
            <ul className="space-y-1.5 text-muted-foreground">
              <li>• A slot takes a player who plays there or right next to it</li>
              <li>• Full backs and wing backs cover each other, wingers count on both flanks, CM covers CDM and CAM, strikers cover each other</li>
              <li>• A keeper only ever goes in goal, and only a keeper goes in goal</li>
            </ul>
            <div className="mt-2 space-y-1 rounded-lg bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
              <p><span className="text-correct font-semibold">Works:</span> Barcelona, CM slot, Sergio Busquets (a defensive mid, same family)</p>
              <p><span className="text-correct font-semibold">Works:</span> Real Madrid, RB slot, Sergio Ramos (a centre back can shift out)</p>
              <p><span className="text-destructive font-semibold">Refused:</span> Barcelona, CM slot, Marc-André ter Stegen (he is a goalkeeper)</p>
            </div>
          </section>

          <section>
            <h3 className="font-bold text-foreground mb-2">🏆 Rating & Sharing</h3>
            <ul className="space-y-1.5 text-muted-foreground">
              <li>• Submit your finished team for an <span className="text-primary font-semibold">AI rating</span></li>
              <li>• Then a <span className="text-foreground font-semibold">season report</span>: squad rating, where you finish, points, trophies and a top scorer</li>
              <li>• Every player is judged at his peak, so retired legends are not punished for being retired</li>
              <li>• Share your lineup and challenge friends to beat it</li>
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
