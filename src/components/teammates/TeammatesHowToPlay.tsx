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
          <p>🏆 We show you two athletes. You say whether they were ever teammates.</p>
          <ol className="list-decimal list-inside space-y-1.5">
            <li>Two players pop up from NFL, NBA, or soccer</li>
            <li>Tap <strong>YES</strong> or <strong>NO</strong></li>
            <li>See the fun fact that reveals the answer</li>
            <li>10 questions per round, getting harder as you go</li>
          </ol>
        </div>
      </DialogContent>
    </Dialog>
  );
}
