import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface HowToPlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HowToPlay({ open, onOpenChange }: HowToPlayProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border text-foreground max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display text-primary text-center">
            How to Play
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 text-sm">
          <p className="text-muted-foreground text-center">
            Guess the mystery football player in 8 tries!
          </p>

          <section>
            <h3 className="font-bold text-foreground mb-2">🎨 Color Guide</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-correct flex-shrink-0" />
                <div>
                  <span className="font-semibold text-correct-foreground">Green</span>
                  <span className="text-muted-foreground"> — Exact match!</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-close flex-shrink-0" />
                <div>
                  <span className="font-semibold">Yellow</span>
                  <span className="text-muted-foreground"> — Close! See thresholds below.</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-incorrect flex-shrink-0" />
                <div>
                  <span className="font-semibold">White</span>
                  <span className="text-muted-foreground"> — Not a match.</span>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h3 className="font-bold text-foreground mb-2">📏 "Close" Thresholds</h3>
            <ul className="space-y-1.5 text-muted-foreground">
              <li>🌍 <span className="text-foreground">Nationality:</span> Same continent</li>
              <li>🏟️ <span className="text-foreground">Club:</span> Same league = yellow</li>
              <li>⚽ <span className="text-foreground">Goals:</span> Within 3</li>
              <li>👟 <span className="text-foreground">Assists:</span> Within 3</li>
              <li>📍 <span className="text-foreground">Position:</span> Same group (Def/Mid/Fwd)</li>
              <li>👕 <span className="text-foreground">Kit Number:</span> Within 3</li>
              <li>📅 <span className="text-foreground">Age:</span> Within 2 years</li>
              <li>💰 <span className="text-foreground">Market Value:</span> Within $5M</li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-foreground mb-2">🔼 Arrow Hints</h3>
            <p className="text-muted-foreground">
              ▲ means the answer is <span className="text-foreground font-semibold">higher</span>, ▼ means it's <span className="text-foreground font-semibold">lower</span>.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-foreground mb-2">⚙️ Difficulty Modes</h3>
            <ul className="space-y-1.5 text-muted-foreground">
              <li><span className="text-foreground font-semibold">Easy:</span> Popular stars from the top 5 leagues</li>
              <li><span className="text-foreground font-semibold">Hard:</span> Includes reserves & rotation players</li>
              <li><span className="text-foreground font-semibold">Insane:</span> Any player from the top 20 leagues worldwide</li>
            </ul>
          </section>

          <button
            onClick={() => onOpenChange(false)}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity"
          >
            Let's Play!
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
