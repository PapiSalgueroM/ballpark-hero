import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NFLCareerHowToPlay({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-display text-primary">How to Play</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>Guess the NFL player from progressive career clues!</p>
          <ol className="list-decimal list-inside space-y-1.5">
            <li>Each round reveals a new clue about the mystery player</li>
            <li>Type your guess using the search bar after each clue</li>
            <li>Clues: Draft → College → First Team → Stats → Teams → Jersey #</li>
            <li>Fewer clues = higher score (6 pts max, 1 pt min)</li>
          </ol>
          <p className="text-xs">New daily challenge at midnight!</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
