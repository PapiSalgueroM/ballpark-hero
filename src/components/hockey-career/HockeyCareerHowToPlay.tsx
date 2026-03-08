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
            <p>Guess the mystery hockey player from progressive clues. Earlier guesses earn more points!</p>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-[hsl(var(--hk-silver))]">Clues revealed in order</p>
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
            <p className="text-muted-foreground">Start at 1,000 points, −150 per clue. Minimum 100 points.</p>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-[hsl(var(--hk-silver))]">Daily Challenge</p>
            <p className="text-muted-foreground">New player at midnight — share your score!</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
