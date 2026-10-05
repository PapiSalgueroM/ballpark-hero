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

export function NbaConnectionsHowToPlay({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md [&>button]:min-h-[44px] [&>button]:min-w-[44px]">
        <DialogHeader>
          <DialogTitle className="text-center text-primary text-xl font-display">
            🏀 How to Play
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            NBA Connections
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm text-foreground">
          <div className="space-y-2">
            <p className="font-semibold text-primary">Goal</p>
            <p>Find four groups of 5 NBA players who share a connection.</p>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-primary">How it works</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Open draft A, B, C or D, then tap names to plan a group</li>
              <li>Names move between drafts. Tap a name in its current draft to remove it</li>
              <li>Planning is free. Tap "Submit five" to check only the open draft</li>
              <li>Correct groups lock in and reveal their connection</li>
              <li>Wrong guesses cost a life. You get 4 total</li>
            </ul>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-primary">Try this example</p>
            <p className="text-muted-foreground">Park four names in A while you think about the fifth. Keep another idea in B. When A has five, submit it. A wrong group costs one life and stays editable; B stays where you left it.</p>
            <p className="text-xs text-muted-foreground">Notes are saved for each mode and puzzle. Daily progress also survives a refresh. Unlimited reopens the saved puzzle with your notes and four fresh lives.</p>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-primary">Difficulty</p>
            <div className="space-y-1 text-muted-foreground">
              <p><span className="text-yellow-400 font-semibold">🟡 Yellow</span>: Easiest</p>
              <p><span className="text-emerald-400 font-semibold">🟢 Green</span>: Medium</p>
              <p><span className="text-blue-400 font-semibold">🔵 Blue</span>: Hard</p>
              <p><span className="text-purple-400 font-semibold">🟣 Purple</span>: Hardest</p>
            </div>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-primary">Connections can include</p>
            <p className="text-muted-foreground">Same franchise, same draft class, same country, career milestones, same era, and more.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
