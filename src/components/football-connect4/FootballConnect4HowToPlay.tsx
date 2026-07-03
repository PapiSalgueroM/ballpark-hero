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
            <strong>Soccer Connect 4</strong> mixes classic Connect 4 with soccer trivia. Two players, one board.
          </p>
          <div className="space-y-2">
            <h4 className="font-semibold text-primary">Rules:</h4>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>🔵 Blue and 🔴 Red take turns</li>
              <li>Pick a column. Your piece drops to the lowest empty row</li>
              <li>
                Name a soccer player who matches <strong>both</strong> the column attribute
                (top) and the row attribute (left side)
              </li>
              <li>Valid answer places your piece</li>
              <li>First to <strong>4 in a row</strong> wins, horizontal, vertical, or diagonal</li>
              <li>Each player gets used once per game</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold text-primary">Example:</h4>
            <p className="text-muted-foreground">
              Column says <em>"Played for Barcelona"</em>, row says{' '}
              <em>"World Cup Winner"</em>. Answer: <strong>Thierry Henry</strong>{' '}
              (Barcelona and the 1998 World Cup).
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
