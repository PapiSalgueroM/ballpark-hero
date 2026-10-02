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
            <h3 className="font-bold text-foreground mb-2">🧩 Fit, Chemistry and Balance</h3>
            <ul className="space-y-1.5 text-muted-foreground">
              <li>• Under the pitch, and again before you submit, three tiles show how your eleven fits together. The season sim plays all three on top of your squad rating</li>
              <li>• <span className="text-foreground font-semibold">Role fit:</span> a man in a slot his recorded positions cover plays at full value. Next door (a right back at left back, say) costs 2 rating points on him, averaged over the eleven. The slot check never lets anyone further out of position than that</li>
              <li>• <span className="text-foreground font-semibold">Chemistry:</span> two men standing next to each other on the pitch who are at the same club on our data add +0.6, from the same country +0.2, up to +2 for the side</li>
              <li>• <span className="text-foreground font-semibold">Balance:</span> no defensive midfielder in a CM or CDM slot costs 1. A wide slot held by someone who is not a wide player (a centre back at full back) costs 0.5 for that flank</li>
              <li>• Tap a tile to see exactly why, and Back to return</li>
            </ul>
            <div className="mt-2 space-y-1 rounded-lg bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
              <p><span className="text-foreground font-semibold">Worked example:</span> a 4-3-3 rated 82 on paper. A right back is covering at left back: 2 off him, 0.2 off the side. The two centre backs are at the same club: +0.6. Three central midfielders and not one of them a defensive mid: -1.</p>
              <p>Total -0.6, so the league is played at 81.4. The season report then says what each one was worth in league points, replaying the same season without it.</p>
            </div>
          </section>

          <section>
            <h3 className="font-bold text-foreground mb-2">🏆 Rating & Sharing</h3>
            <ul className="space-y-1.5 text-muted-foreground">
              <li>• Submit your finished team for an <span className="text-primary font-semibold">AI rating</span></li>
              <li>• Then a <span className="text-foreground font-semibold">season report</span>: squad rating, where you finish, points, trophies and a top scorer</li>
              <li>• Under it, a month by month tab and a player stats tab (goals and assists add up to the team's, and clean sheets are the ones each man played in), young player and goal of the season, and one line on what a different shape or a stronger pick in your weakest slot would have changed on the same rolls</li>
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
