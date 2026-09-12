import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { POINTS_PER_CALL, regionNoun, teamLabel, type ImperialismGameSpec, type ImperialismSport } from '@/lib/imperialismEngine';

/**
 * Round 529: the imperialism mode's own How to Play, one component for the
 * five routes with the sport's nouns injected. Same Dialog shape as
 * ConquestHowToPlay (open, onOpenChange) so the pages mount it the same way.
 * The worked round uses the sport's first two teams as an example of the
 * rule, not as a result that happened.
 */

export interface ImperialismHowToPlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sport: ImperialismSport;
  game: ImperialismGameSpec;
}

/** The imperialism mode's own How to Play in the shape of ConquestHowToPlay (Dialog, open, onOpenChange): the rules, the wheel, what a takeover means, a worked round, sport nouns from the spec. */
export function ImperialismHowToPlay({ open, onOpenChange, sport, game }: ImperialismHowToPlayProps) {
  const team = sport.teamNoun ?? 'club';
  const teams = `${team}s`;
  const region = sport.regionNoun;
  const regions = regionNoun(sport, 2);
  const round = sport.roundNoun.toLowerCase();
  const rounds = `${round}s`;
  const a = sport.teams[0];
  const b = sport.teams[1] ?? sport.teams[0];
  const nameA = teamLabel(sport, a.id);
  const nameB = teamLabel(sport, b.id);
  const [quarter, semi, final] = sport.playoffLabels;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border text-foreground max-h-[85vh] overflow-y-auto" data-imperialism-help>
        <DialogHeader>
          <DialogTitle className="text-2xl font-display text-primary text-center">
            How to Play
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 text-sm">
          <p className="text-muted-foreground text-center">
            {sport.teams.length} {teams} on one map. Pick yours, call its games, and watch the season play out {region} by {region} until one {team} rules the whole thing.
          </p>

          <section>
            <h3 className="font-bold text-foreground mb-2">🗺️ The rules</h3>
            <ul className="space-y-1.5 text-muted-foreground">
              <li>Every {region} opens in the hands of its nearest {team}. That is each {team}'s empire.</li>
              <li>Every {round}, the whole league plays. <span className="text-foreground">The winner takes the loser's entire empire.</span> Not a {region}, all of it.</li>
              <li>Wiped off the map? You are not out. A {team} with no land keeps playing, and one win takes its opponent's whole empire.</li>
              <li>No draws. A level game goes to {sport.score.tieBreakLabel} and somebody wins.</li>
              <li>After {sport.regularRounds} {rounds}, the eight biggest empires go into the playoffs: {quarter}, {semi}, then the {final}. The last {team} standing rules the map.</li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-foreground mb-2">🎡 The wheel and the scenes</h3>
            <ul className="space-y-1.5 text-muted-foreground">
              <li>Each {round} you get one game to call: your {team}'s game, or the biggest clash on the map if your {team} is not playing. Pick a winner and press Play.</li>
              <li>The wheel spins and lands on the attacker. The needle points the way to the defender. Then the map zooms in, the score lands, and the loser's land turns the winner's colour.</li>
              <li>Every game in the {round} plays out like that, one after the other, in the order they were drawn. Skip jumps to the results whenever you like.</li>
              <li>The ring on each empire marks where that {team}'s land started. Tap a {team} in Teams Remaining to light up its empire, and hold the timeline to see the map after any earlier {round}.</li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-foreground mb-2">⚔️ A worked {round}</h3>
            <p className="text-muted-foreground">
              Say {nameA} hold 6 {regions} and play {nameB}, who hold 4. {nameA} win, so they now hold all 10 and {nameB} hold none.
              Next {round} {nameB} beat somebody with 9 {regions}: {nameB} are back with 9, and their victim is the one with nothing.
              If you called {nameA} in the first game, that is +{POINTS_PER_CALL} on your score.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-foreground mb-2">🏆 Scoring and the daily</h3>
            <ul className="space-y-1.5 text-muted-foreground">
              <li>+{POINTS_PER_CALL} for every game you call right, plus points for every {region} your {team} holds at the end, a bonus for making the playoffs, and a big one for ruling the map.</li>
              <li>The Daily Challenge deals every player the same fixtures and the same results. One scored run per day, and it picks up where you left it if you close the tab.</li>
              <li>Free Play deals a fresh season every time.</li>
            </ul>
          </section>

          <button
            onClick={() => onOpenChange(false)}
            className="w-full min-h-[44px] py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity"
          >
            Got it, let's play {game.name}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
