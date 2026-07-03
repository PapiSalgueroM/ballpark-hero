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

export function TeammatesHowToPlay({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-display text-primary">How to Play</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>Were these two athletes ever teammates?</p>
          <ol className="list-decimal list-inside space-y-1.5">
            <li>Two player names are shown from NFL, NBA, or Soccer</li>
            <li>Tap <strong>YES</strong> or <strong>NO</strong>: did they play on the same team?</li>
            <li>After answering, a fun fact reveals the truth</li>
            <li>10 questions per round, difficulty increases</li>
          </ol>
          <p className="text-xs">Mix of NFL, NBA, and soccer players!</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
