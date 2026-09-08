import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
          <DialogDescription className="text-center">NBA Arcade: 30 teams, one map, one winner.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 text-sm">
          <p className="text-muted-foreground text-center">
            An unranked run on this device. Rosters, powers and progress reset when you leave the game.
          </p>

          <section>
            <h3 className="font-bold text-foreground mb-2">🏀 Overview</h3>
            <p className="text-muted-foreground">
              Each turn, a random team spins a direction and attacks a nearby enemy. If the attacker wins, it takes the defender's whole empire. If the attacker loses, both teams keep their land. The last team standing wins!
            </p>
          </section>

          <section>
            <h3 className="font-bold text-foreground mb-2">⚔️ Battles</h3>
            <ul className="space-y-1.5 text-muted-foreground">
              <li>🎯 <span className="text-foreground">Direction Spin:</span> A compass direction is chosen randomly</li>
              <li>📍 <span className="text-foreground">Targeting:</span> A nearby enemy territory in that direction is selected</li>
              <li>📺 <span className="text-foreground">Play-by-Play:</span> Watch 6 to 8 simulated possessions, or skip to the result</li>
              <li>📊 <span className="text-foreground">Box Score:</span> These scores and stats are simulated, using in-game ratings</li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-foreground mb-2">🏆 Stealing Players</h3>
            <p className="text-muted-foreground">
              After a win, review the box score and tap <span className="text-foreground font-semibold">"Choose Your Player"</span> to recruit someone from the losing roster. You can also skip the player. Player steals happen even when the winner repels an away raid and no land changes hands.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-foreground mb-2">⚡ Power-Ups</h3>
            <p className="text-muted-foreground mb-2">
              A successful conquest earns the attacker one random power after the player choice. The final conquest ends the game instead. A repelled raid or shielded defense earns no power.
            </p>
            <ul className="space-y-1.5 text-muted-foreground">
              <li>🛡️ <span className="text-foreground">Invincibility:</span> Keep your land after one home defeat. An away defeat does not spend the shield</li>
              <li>✍️ <span className="text-foreground">Free Agent:</span> Choose an available player from an eliminated NBA roster</li>
              <li>⬆️ <span className="text-foreground">Upgrade:</span> Choose a player to use 99 OVR in this team's next simulated battle, attacking or defending</li>
              <li>🐐 <span className="text-foreground">Legend:</span> Add your franchise legend at an in-game 99 OVR, if they are not already on an active roster</li>
              <li>🗺️ <span className="text-foreground">Territory Steal:</span> Choose a nearby enemy territory to take without a battle</li>
            </ul>
            <p className="text-muted-foreground mt-1.5">
              Use the power now or save up to 2 per team for this run. Saving a third replaces the oldest. Tap a saved power in the standings between battles to reopen it. If a power cannot be used yet, save it until it can. Back to Power keeps your selection unspent.
            </p>
            <p className="text-muted-foreground mt-1.5">
              Powers and 99 OVR boosts are game modifiers. An upgrade changes the selected player's simulated performance for that team's next battle, then wears off. Other teams' battles do not use it.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-foreground mb-2">💡 Example Turn</h3>
            <p className="text-muted-foreground">
              Your attacker wins at the defender's home. Choose a player or skip, then the attacker takes that empire and earns Upgrade. Save it, tap the saved arrow between battles, tap Use Now, and choose a player. That player uses 99 OVR when their team next plays, even if they are defending. A loss while attacking would keep both empires intact and award no power.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-foreground mb-2">🗺️ Map Colors</h3>
            <p className="text-muted-foreground">
              Every territory starts with an owner and uses that team's color. Toronto has no US home state, so the Raptors hold a northern border state for map purposes. Watch the colors change as teams expand and get eliminated.
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
