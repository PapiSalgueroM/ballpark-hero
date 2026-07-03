import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface Props { open: boolean; onOpenChange: (open: boolean) => void; }

export function HockeyCareerHowToPlay({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-[hsl(var(--hk-silver))] text-xl font-display">🏒 How to Play</DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">Hockey Career Path</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm text-foreground">
          <div className="space-y-2">
            <p className="font-semibold text-[hsl(var(--hk-silver))]">Goal</p>
            <p>Guess the mystery hockey player from clues revealed one at a time. Guess early for more points.</p>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-[hsl(var(--hk-silver))]">Clues, in order</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Position (Forward, Defense, Goalie)</li>
              <li>Country of origin</li>
              <li>Draft round and year</li>
              <li>Teams played for</li>
              <li>Career stats</li>
              <li>Awards (Hart, Norris, Vezina, Stanley Cups)</li>
            </ul>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-[hsl(var(--hk-silver))]">Scoring</p>
            <p className="text-muted-foreground">You start at 1,000 points. Each clue costs 150. Floor is 100.</p>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-[hsl(var(--hk-silver))]">Daily Challenge</p>
            <p className="text-muted-foreground">New player every midnight. Share your score when you're done.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
