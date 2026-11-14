import { keyedRng } from './keyedRng';

type PlayerClass = 'FR' | 'SO' | 'JR' | 'SR';
type Player = { id: string; name: string; pos: string; cls: PlayerClass; ovr: number; pot: number };
type RatingRange = readonly [minimum: number, maximum: number];
type RatingPace = Record<Exclude<PlayerClass, 'SR'>, RatingRange>;

type CollegeRatingChange = { id: string; from: number; to: number };
export type CollegeRatingReview = {
  round: number;
  teamId: string;
  changes: CollegeRatingChange[];
};

export type CollegeRoundRating = Omit<CollegeRatingReview, 'changes'> & {
  changes: (CollegeRatingChange & { name: string })[];
};

type RatingState = {
  season: number;
  round: number;
  myTeam: string;
  teams: Record<string, { id: string; players: Player[] }>;
  ratingReview?: CollegeRatingReview;
  ratingHistory?: CollegeRoundRating[];
};

function recordCollegeRound(st: RatingState, review: CollegeRatingReview): void {
  const history = Array.isArray(st.ratingHistory) ? st.ratingHistory : [];
  if (history.some(row => row?.teamId === st.myTeam && row.round === review.round)) return;
  const names = new Map(st.teams[st.myTeam]?.players.map(player => [player.id, player.name]));
  const archive = (entry: CollegeRatingReview): CollegeRoundRating => ({
    ...entry,
    changes: entry.changes.flatMap(change => {
      const name = names.get(change.id);
      return name ? [{ ...change, name }] : [];
    }),
  });
  const previous = st.ratingReview;
  const existing = previous?.teamId === st.myTeam && previous.round < review.round
    && Array.isArray(previous.changes) && !history.some(row => row?.teamId === st.myTeam && row.round === previous.round)
    ? [archive(previous)] : [];
  st.ratingHistory = [...history, ...existing, archive(review)];
}

export function reviewCollegeRatings(st: RatingState, rounds: number, pace: RatingPace): void {
  const checkpoint = [1, 2, 3, 4].find(q => Math.ceil(q * rounds / 4) === st.round);
  const review: CollegeRatingReview = { round: st.round, teamId: st.myTeam, changes: [] };
  if (st.ratingReview?.round === st.round) return;
  if (!checkpoint) {
    recordCollegeRound(st, review);
    return;
  }
  for (const team of Object.values(st.teams)) {
    for (const [index, player] of team.players.entries()) {
      // Stable roster slots keep seeded games reproducible even if player IDs are repaired on load.
      const key = `college-rating|${rounds}|${st.season}|${team.id}|${index}|${player.name}|${player.pos}`;
      const development = keyedRng(key);
      const [min, max] = player.cls === 'SR' ? [0, 0] : pace[player.cls];
      const annual = min + Math.floor(development() * (max - min + 1));
      const offset = development();
      const at = (q: number) => Math.floor(annual * q / 4 + offset);
      const form = keyedRng(`${key}|${checkpoint}`)();
      const growth = at(checkpoint) - at(checkpoint - 1);
      const delta = form < 0.14 ? -1 : form > 0.9 ? Math.max(1, growth) : growth;
      const from = player.ovr;
      const to = Math.max(55, Math.min(player.pot, 99, from + delta));
      if (from === to) continue;
      player.ovr = to;
      if (team.id === st.myTeam) review.changes.push({ id: player.id, from, to });
    }
  }
  recordCollegeRound(st, review);
  st.ratingReview = review;
}
