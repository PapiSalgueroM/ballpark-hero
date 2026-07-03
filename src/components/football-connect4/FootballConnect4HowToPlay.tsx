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

export function FootballConnect4HowToPlay({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-primary font-display">
            How to Play
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm text-foreground">
          <p>
            <strong>Soccer Connect 4</strong> is a two-player trivia game that combines
            classic Connect 4 with soccer knowledge!
          </p>
          <div className="space-y-2">
            <h4 className="font-semibold text-primary">Rules:</h4>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>🔵 Blue and 🔴 Red take turns</li>
              <li>Pick a column to drop your piece, it falls to the lowest empty row</li>
              <li>
                Name a soccer player who matches <strong>both</strong> the column attribute
                (top) and the row attribute (left side)
              </li>
              <li>If your answer is valid, your piece is placed</li>
              <li>First to get <strong>4 in a row</strong> (horizontal, vertical, or diagonal) wins!</li>
              <li>Each player can only be used once per game</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold text-primary">Example:</h4>
            <p className="text-muted-foreground">
              If the column says <em>"Played for Barcelona"</em> and the row says{' '}
              <em>"World Cup Winner"</em>, you could answer <strong>Thierry Henry</strong>{' '}
              (played for Barcelona & won the 1998 World Cup).
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
