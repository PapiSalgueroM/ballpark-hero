import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FootballTimelineHowToPlay({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-[hsl(var(--ft-gold))] text-xl font-display">
            🏈 How to Play
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            Pro Football Timeline
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm text-foreground">
          <div className="space-y-2">
            <p className="font-semibold text-[hsl(var(--ft-gold))]">Goal</p>
            <p>Put 5 NFL players in order by draft year: earliest at the top, most recent at the bottom.</p>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-[hsl(var(--ft-gold))]">How it works</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>You see each player's name and position</li>
              <li>Use the arrows to move players up or down</li>
              <li>Tap "Lock In Order" when you're set</li>
              <li>We reveal the correct draft years right after</li>
            </ul>
            <p className="text-muted-foreground">Example: a 1998 pick goes above a 2015 pick.</p>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-[hsl(var(--ft-gold))]">Scoring</p>
            <p className="text-muted-foreground">1 point for each player in the right spot. 5/5 is perfect.</p>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-[hsl(var(--ft-gold))]">Daily Challenge</p>
            <p className="text-muted-foreground">New puzzle at midnight, same one for everyone. Share your score.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
