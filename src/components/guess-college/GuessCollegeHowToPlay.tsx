import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';

const GuessCollegeHowToPlay = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="rounded-full">
          <HelpCircle className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">How to Play</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm text-muted-foreground">
          <p>
            Guess the mystery Division 1 college from clues revealed one at a time.
          </p>

          <div>
            <h3 className="font-semibold text-foreground mb-1">🎯 Clue Order</h3>
            <p>
              Clues go from vague to obvious: vibe, region, size, acceptance rate, conference, basketball, football, Olympics, NFL Draft, alumni, colors, reveal.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-1">📊 Scoring</h3>
            <ul className="space-y-0.5 list-disc list-inside">
              <li>Clue 1: 1200 pts, legendary territory</li>
              <li>Clue 2: 1000 pts</li>
              <li>Clues 3 to 11: drops from 900 to 100 pts</li>
              <li>All clues shown: 0 pts</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-1">🎮 Game Modes</h3>
            <ul className="space-y-0.5 list-disc list-inside">
              <li><strong>Daily:</strong> Same school for everyone, resets at midnight</li>
              <li><strong>Unlimited:</strong> Random school each round, play as many as you want</li>
              <li><strong>Conference:</strong> Filter by a specific athletic conference</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-1">🔥 Streaks (Unlimited)</h3>
            <ul className="space-y-0.5 list-disc list-inside">
              <li>3 in a row: 🔥 Hot</li>
              <li>5 in a row: 💪 Scholar</li>
              <li>10 in a row: 🎓 Superfan</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-1">💡 Difficulty</h3>
            <ul className="space-y-0.5 list-disc list-inside">
              <li><strong>Easy:</strong> Power 4 schools only (SEC, Big Ten, ACC, Big 12)</li>
              <li><strong>Hard:</strong> All 350+ D1 schools including mid-majors</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GuessCollegeHowToPlay;
