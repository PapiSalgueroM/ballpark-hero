import { keyedRng } from './keyedRng';

interface RatingPlayer {
  id: string;
  name: string;
  age: number;
  ovr: number;
  pot: number;
}

interface RatingLeague<P extends RatingPlayer> {
  season: number;
  round: number;
  teams: Record<string, { players: P[] }>;
  freeAgents: P[];
}

interface RatingRules<P extends RatingPlayer> {
  sport: string;
  rounds: number;
  youngThrough: number;
  declineFrom: number | ((player: P) => number);
  acceleratedFrom: number;
  marketDeclineFrom: number;
  floor: number;
}

export type FoGrowth<P> = (abbr: string, player: P, points: number) => number;

/** Apply rating movement after the games in this round have used the old ratings. */
export function reviewFoRoundRatings<P extends RatingPlayer>(
  league: RatingLeague<P>, rules: RatingRules<P>, ownTeam: string,
  notes: string[], growth?: FoGrowth<P>,
): void {
  if (league.round < 1 || league.round > rules.rounds) return;
  const review = (p: P, abbr?: string) => {
    // The same curve follows a player when traded or signed from the market.
    const random = keyedRng(`${rules.sport}|round-rating|${league.season}|${p.name}`);
    const age = p.age + 1;
    const declineFrom = typeof rules.declineFrom === 'function' ? rules.declineFrom(p) : rules.declineFrom;
    let delta = 0;
    if (abbr && age <= rules.youngThrough) {
      const points = 1 + Math.floor(random() * 3);
      delta = growth?.(abbr, p, points) ?? points;
    } else if (age >= declineFrom || (!abbr && age >= rules.marketDeclineFrom)) {
      delta = -(1 + Math.floor(random() * 2) + (age >= rules.acceleratedFrom ? 2 : 0));
    }
    if (delta === 0) return;
    const phase = random();
    const before = Math.floor((league.round - 1) * Math.abs(delta) / rules.rounds + phase);
    const after = Math.floor(league.round * Math.abs(delta) / rules.rounds + phase);
    if (after === before || (!abbr && before >= 1)) return;
    if (delta > 0 && p.ovr < p.pot) p.ovr += 1;
    else if (delta < 0 && p.ovr > rules.floor) p.ovr -= 1;
    else return;
    if (abbr === ownTeam) notes.push(`${p.name} OVR ${delta > 0 ? '+1' : '-1'} to ${p.ovr}.`);
  };
  for (const [abbr, club] of Object.entries(league.teams)) {
    for (const player of club.players) review(player, abbr);
  }
  for (const player of league.freeAgents) review(player);
}
