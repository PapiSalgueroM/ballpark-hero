import { useRef, useState } from 'react';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { HigherLowerThrough } from '@/components/game/HigherLowerThrough';
import { hockeyHLPlayers, type HockeyHLPlayer } from '@/data/hockeyHLPlayers';
import { keyedRng } from '@/lib/keyedRng';

type Matchup = { player1: HockeyHLPlayer; player2: HockeyHLPlayer; correct: boolean };
type PlayerPair = [HockeyHLPlayer, HockeyHLPlayer];

function isCorrect(pair: PlayerPair, side: number) {
  return pair[side].careerPoints >= pair[1 - side].careerPoints;
}

function practicePairs(results: Matchup[]) {
  const played = new Set(results.flatMap(r => [r.player1.name, r.player2.name]));
  const opponents = hockeyHLPlayers.filter(player => !played.has(player.name));
  const random = keyedRng(JSON.stringify([...played]));
  const pairs: PlayerPair[] = [];
  for (const { player1, player2, correct } of results) {
    if (correct || !opponents.length) continue;
    const returning = random() < 0.5 ? player1 : player2;
    const gap = (player: HockeyHLPlayer) => Math.abs(returning.careerPoints - player.careerPoints);
    opponents.sort((a, b) => gap(a) - gap(b));
    const index = Math.floor(random() * Math.min(3, opponents.length));
    const [opponent] = opponents.splice(index, 1);
    pairs.push(random() < 0.5 ? [returning, opponent] : [opponent, returning]);
  }
  return pairs;
}

export function HockeyMissPractice({ results }: { results: Matchup[] }) {
  const [pairs] = useState(() => practicePairs(results));
  const [round, setRound] = useState(0);
  const [picks, setPicks] = useState<number[]>([]);
  const firstCard = useRef<HTMLButtonElement>(null);
  if (!pairs.length) return null;

  const pair = pairs[round];
  const pick = picks[round];
  const revealed = pick !== undefined;
  const correct = picks.filter((side, i) => isCorrect(pairs[i], side)).length;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="min-h-11 w-full max-w-sm rounded-xl border border-primary/50 bg-primary/10 px-4 font-semibold text-foreground">
          Practice your misses
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-sm overflow-y-auto rounded-xl">
        <DialogHeader>
          <DialogTitle>Practice your misses</DialogTitle>
          <DialogDescription>
            {pair ? `Matchup ${round + 1} of ${pairs.length}. One player from a miss, one new opponent. Who has more career points?`
              : 'Your practice results'}
          </DialogDescription>
        </DialogHeader>
        {pair ? <>
          <div className="grid grid-cols-2 gap-2">
            {pair.map((player, side) => (
              <button type="button" key={side} ref={side === 0 ? firstCard : undefined}
                aria-disabled={revealed} onClick={() => setPicks(previous => previous.length === round ? [...previous, side] : previous)}
                className={`min-h-24 rounded-xl border p-3 text-sm focus-visible:outline-primary ${revealed && isCorrect(pair, side) ? 'border-correct bg-correct/10' : 'border-border bg-card'}`}>
                <span className="block font-bold">{player.name}</span>
                <span className="block text-xs text-muted-foreground">{player.position}</span>
                {revealed && <span className="mt-2 flex flex-col">
                  <strong>{player.careerPoints.toLocaleString('en-US')} pts</strong>
                  <HigherLowerThrough through={player.lastSeason} />
                </span>}
              </button>
            ))}
          </div>
          <p aria-live="polite" className="text-center text-sm font-semibold">
            {revealed && (pair[0].careerPoints === pair[1].careerPoints ? 'Tie. Either pick counts.'
              : isCorrect(pair, pick) ? 'Correct!' : `${pair[1 - pick].name} had more points.`)}
          </p>
          {revealed && <button type="button" className="min-h-11 rounded-lg bg-primary px-3 font-semibold text-primary-foreground"
            onClick={() => { firstCard.current?.focus(); setRound(round + 1); }}>
            {round + 1 === pairs.length ? 'Finish practice' : 'Next matchup'}
          </button>}
        </> : <>
          <p role="status" className="text-center text-lg font-bold">{correct} of {pairs.length} practice matchups correct</p>
          <DialogClose asChild><button type="button" className="min-h-11 rounded-lg bg-primary font-semibold text-primary-foreground">Back to results</button></DialogClose>
        </>}
      </DialogContent>
    </Dialog>
  );
}
