import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface Props { open: boolean; onOpenChange: (open: boolean) => void; }

export function HockeyHLHowToPlay({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-[hsl(var(--hk-silver))] text-xl font-display">🏒 How to Play</DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">Hockey Higher or Lower</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm text-foreground">
          <div className="space-y-2">
            <p className="font-semibold text-[hsl(var(--hk-silver))]">Goal</p>
            <p>Guess which hockey player has more career points.</p>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-[hsl(var(--hk-silver))]">How it works</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Two players shown with name, position, and country flag</li>
              <li>Tap the player you think has MORE career points</li>
              <li>Both point totals are revealed after your choice</li>
              <li>10 rounds per game</li>
            </ul>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-[hsl(var(--hk-silver))]">Scoring</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li><strong>10 points</strong> per correct answer</li>
              <li><strong>+5 bonus</strong> for each consecutive correct (streak)</li>
            </ul>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-[hsl(var(--hk-silver))]">Modes</p>
            <p className="text-muted-foreground"><strong>Daily:</strong> Same matchups for everyone. <strong>Unlimited:</strong> Random matchups, play again anytime.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
