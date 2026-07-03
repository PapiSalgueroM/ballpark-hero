import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface UfcHowToPlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UfcHowToPlay({ open, onOpenChange }: UfcHowToPlayProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display">How to Play 🥊</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm text-muted-foreground">
          <p>Guess the mystery UFC fighter in <strong className="text-foreground">8 tries</strong>.</p>
          <p>Every guess colors in clues about the fighter you're chasing:</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-correct" />
              <span><strong className="text-foreground">Green</strong>: Exact match</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-close" />
              <span><strong className="text-foreground">Yellow</strong>: Close (same continent, adjacent weight class, or near value)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-incorrect" />
              <span><strong className="text-foreground">Grey</strong>: No match</span>
            </div>
          </div>
          <div className="pt-2 border-t border-border">
            <p className="font-semibold text-foreground mb-1">Columns:</p>
            <ul className="list-disc pl-4 space-y-1 text-xs">
              <li><strong>Years Active</strong>: Number of years active, yellow if within 2</li>
              <li><strong>Weight Class</strong>: Yellow if one class away, with ▲▼ direction</li>
              <li><strong>Nationality</strong>: Yellow if same continent</li>
              <li><strong>Age</strong>: Yellow if within 2 years</li>
              <li><strong>Wins</strong>: Yellow if within 3</li>
              <li><strong>Losses</strong>: Yellow if within 2</li>
              <li><strong>Draws</strong>: Yellow if within 1</li>
              <li><strong>KO/TKO</strong>: Yellow if within 3</li>
              <li><strong>Submissions</strong>: Yellow if within 2</li>
              <li><strong>P4P Rank</strong>: Highest all-time UFC P4P ranking, yellow if within 2</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
