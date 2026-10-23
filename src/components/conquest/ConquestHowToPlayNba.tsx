import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ConquestHowToPlayNbaProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConquestHowToPlayNba({ open, onOpenChange }: ConquestHowToPlayNbaProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border text-foreground max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display text-primary text-center">
            How to Play
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 text-sm">
          <p className="text-muted-foreground text-center">
            Watch 30 NBA teams battle for total US domination!
          </p>

          <section>
            <h3 className="font-bold text-foreground mb-2">🏀 Overview</h3>
            <p className="text-muted-foreground">
              Each turn, a random team spins a direction and attacks the closest enemy or claims neutral territory. Battles are simulated using real player ratings. The last team standing wins!
            </p>
          </section>

          <section>
            <h3 className="font-bold text-foreground mb-2">⚔️ Battles</h3>
            <ul className="space-y-1.5 text-muted-foreground">
              <li>🎯 <span className="text-foreground">Direction Spin:</span> A compass direction is chosen randomly</li>
              <li>📍 <span className="text-foreground">Targeting:</span> The closest enemy or neutral state in that direction is selected</li>
              <li>📺 <span className="text-foreground">Play-by-Play:</span> Watch 6 to 8 live possessions featuring real player names</li>
              <li>📊 <span className="text-foreground">Box Score:</span> Full stats are shown after the game simulation</li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-foreground mb-2">🏆 Stealing Players</h3>
            <p className="text-muted-foreground">
              When a team wins, you choose one player from the losing roster to add to the winner's team. Review the box score first, then tap <span className="text-foreground font-semibold">"Choose Your Player"</span> when ready.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-foreground mb-2">⚡ Power-Ups</h3>
            <ul className="space-y-1.5 text-muted-foreground">
              <li>🛡️ <span className="text-foreground">Invincibility:</span> Survive one loss without losing territory</li>
              <li>✍️ <span className="text-foreground">Free Agent:</span> Sign a top available player</li>
              <li>⬆️ <span className="text-foreground">Upgrade:</span> Boost a random player to 99 OVR</li>
              <li>🐐 <span className="text-foreground">Legend:</span> Add a franchise legend to the roster</li>
              <li>🗺️ <span className="text-foreground">Territory Steal:</span> Claim a bordering enemy state for free</li>
            </ul>
            <p className="text-muted-foreground mt-1.5">
              Power-ups appear on ⚡ marked states. Use them now or save for later (max 2 saved).
            </p>
          </section>

          <section>
            <h3 className="font-bold text-foreground mb-2">🗺️ Map Colors</h3>
            <p className="text-muted-foreground">
              Each team's territory is shown in their team color. Gray states are neutral, claimed automatically when targeted. Toronto has no US home state, so the Raptors hold a northern border state for map purposes. Watch the map update in real time as teams expand and get eliminated.
            </p>
          </section>

          <button
            onClick={() => onOpenChange(false)}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity"
          >
            Start Conquering!
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
