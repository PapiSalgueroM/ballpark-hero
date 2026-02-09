import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface BlurredFaceHowToPlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BlurredFaceHowToPlay({ open, onOpenChange }: BlurredFaceHowToPlayProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border text-foreground max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display text-primary text-center">
            How to Play — Guess the Face
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 text-sm">
          <p className="text-muted-foreground text-center">
            A footballer's face is completely blurred — figure out who it is!
          </p>

          <section>
            <h3 className="font-bold text-foreground mb-2">🖼️ The Image</h3>
            <p className="text-muted-foreground">
              You'll see a heavily blurred photo of a footballer. With each wrong guess, the image gets
              <span className="text-foreground font-semibold"> a little clearer</span>.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-foreground mb-2">💡 Hints</h3>
            <ul className="space-y-1.5 text-muted-foreground">
              <li>• After each wrong guess, a <span className="text-primary font-semibold">new hint</span> is revealed</li>
              <li>• Hints include: Active/Retired, Nationality, Position, Club, Age, League</li>
              <li>• Use the hints to narrow down your guess!</li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-foreground mb-2">🎯 Guessing</h3>
            <ul className="space-y-1.5 text-muted-foreground">
              <li>• Type a player name and select from suggestions</li>
              <li>• You have <span className="text-primary font-semibold">6 guesses</span> before the face is fully revealed</li>
              <li>• You can <span className="text-foreground font-semibold">Give Up</span> at any time if you're stuck</li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-foreground mb-2">🏆 Strategy Tips</h3>
            <ul className="space-y-1.5 text-muted-foreground">
              <li>• Look for distinctive features even in the blur — hairstyle, skin tone, build</li>
              <li>• The first hint (Active/Retired) eliminates a lot of options</li>
              <li>• Club + Nationality together usually narrows it to 1-2 players</li>
            </ul>
          </section>

          <button
            onClick={() => onOpenChange(false)}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity"
          >
            Got it!
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
