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

export function CollegeGridHowToPlay({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display">How to Play</DialogTitle>
          <DialogDescription>Fill the 3×3 grid with college football players.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm text-muted-foreground">
          <p>
            Each cell needs a player who matches <strong>both</strong> its row and column. Rows are schools. Columns
            are a position, Heisman Winner, or a draft pick like First Round Pick or Top 10 Pick.
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Tap a cell, start typing, and pick a player from the list</li>
            <li>Correct answers turn green with a rarity percentage</li>
            <li>If the records say he doesn't fit, the cell flashes red and it costs a guess</li>
            <li>If the records can't settle it, it's free, and you'll see what they do have on him</li>
            <li>Each player goes on the board once</li>
            <li>You get 15 guesses, and correct answers use one too</li>
            <li>After the last guess, open Review missed cells to see your misses and possible picks for each open spot</li>
          </ul>
          <div className="pt-2 border-t border-border">
            <p className="font-semibold text-foreground mb-1">Example</p>
            <p className="text-xs">
              Florida State + Defensive Back: Deion Sanders fits. Alabama + Quarterback: Jalen Hurts fits too, because
              the records have him at Alabama as well as Oklahoma.
            </p>
          </div>
          <div className="pt-2 border-t border-border">
            <p className="font-semibold text-foreground mb-1">Rarity Score</p>
            <p className="text-xs">
              Each correct pick gets a rarity percentage: how many players picked the same name. Lower is better. Your final Rarity Score averages your correct cells.
            </p>
          </div>
          <div className="pt-2 border-t border-border">
            <p className="font-semibold text-foreground mb-1">Scouting challenge</p>
            <p className="text-xs">Practice with three players from a school outside the daily grid. Assign a different player to each spot.
              For example, save your only top-ten pick for that spot if another player fits the first round. You can read one scouting
              report, rearrange your picks and submit twice. Practice has its own save and earns no daily points.</p>
          </div>
          <p>New grid every day at midnight.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
