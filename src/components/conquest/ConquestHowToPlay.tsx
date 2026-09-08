import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ConquestHowToPlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConquestHowToPlay({ open, onOpenChange }: ConquestHowToPlayProps) {
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
            Watch 32 NFL teams battle for total US domination!
          </p>

          <section>
            <h3 className="font-bold text-foreground mb-2">🏈 Overview</h3>
            <p className="text-muted-foreground">
              Each turn, a random team spins a direction and attacks the closest enemy or claims neutral territory. Battles are simulated using real player ratings. The last team standing wins!
            </p>
          </section>

          <section>
            <h3 className="font-bold text-foreground mb-2">⚔️ Battles</h3>
            <ul className="space-y-1.5 text-muted-foreground">
              <li>🎯 <span className="text-foreground">Direction Spin:</span> A compass direction is chosen randomly</li>
              <li>📍 <span className="text-foreground">Targeting:</span> The closest enemy or neutral state in that direction is selected</li>
              <li>📺 <span className="text-foreground">Play-by-Play:</span> Watch 6 to 8 live plays featuring real player names</li>
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
              <li>🛡️ <span className="text-foreground">Invincibility:</span> Survive one home loss without losing territory</li>
              <li>✍️ <span className="text-foreground">Free Agent:</span> Choose an offered player for the awarded team</li>
              <li>⬆️ <span className="text-foreground">Upgrade:</span> Choose a roster player, or pick randomly, to boost to 99 OVR for that team's next actual battle</li>
              <li>🐐 <span className="text-foreground">Legend:</span> Add a franchise legend to the roster</li>
              <li>🗺️ <span className="text-foreground">Territory Steal:</span> Choose a bordering enemy state, or use the random option, to claim it for free</li>
            </ul>
            <p className="text-muted-foreground mt-1.5">
              Claim a ⚡ marked neutral state to earn a power for that team. Keep up to 2 saved powers per team in this run. Saving a third replaces the oldest. Tap a team's saved power between turns to reopen it.
            </p>
            <p className="text-muted-foreground mt-1.5">
              Use Now opens the player or state picker when a choice is needed. Back to Power keeps the card. Closing a picker also returns to the card. Closing the power card saves it for later. Saved powers clear when you start a new run.
            </p>
            <p className="text-muted-foreground mt-1.5">
              For example, earn Upgrade on a lightning state. Save it, then tap that team's saved Upgrade between turns. Choose Use Now to pick a player, or Back to Power to keep the card for later.
            </p>
            <p className="text-muted-foreground mt-1.5">
              Neutral claims and other teams' battles keep your upgrade queued. Different teams can each have their own upgrades. If a team already has an upgrade queued, choose Save for Later on its next Upgrade card.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-foreground mb-2">✍️ Free Agency Panel</h3>
            <p className="text-muted-foreground">
              Pick a surviving team, then settle 3 battles to unlock a signing. The available player replaces your team's lowest-rated in-game player and adds a +2 team-rating bonus, subject to the run's rating caps. A queued upgrade is lost if its player is waived. Changing teams does not reset the cooldown. Finish the current turn and any pending power before changing teams or signing.
            </p>
            <p className="text-muted-foreground mt-1.5">
              This Arcade pool follows the rosters in your run, including players released by eliminated teams. For example, after your third settled battle, sign one available player. The next signing unlocks after 3 more settled battles. Claiming a neutral state does not count as a settled battle.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-foreground mb-2">🗺️ Map Colors</h3>
            <p className="text-muted-foreground">
              Each team's territory is shown in their team color. Gray states are neutral, claimed automatically when targeted. Watch the map update in real time as teams expand and get eliminated.
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
