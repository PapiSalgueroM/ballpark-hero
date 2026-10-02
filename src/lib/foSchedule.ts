/**
 * Round 851: a real schedule for the round based front offices (NBA, MLB, NHL).
 *
 * Until now each of those three engines played a round by letting every club
 * pick a random opponent per game slot and then throwing a coin to skip half
 * the picks. Nothing booked a game for both clubs, so a finished season had
 * clubs on very different game counts while the standings compared raw wins.
 * Measured on origin/main (cf3679e7) over 20 seeded full seasons: the NBA ran
 * 58 to 101 games a club against the 80 the board promises, MLB 136 to 204
 * against 162, the NHL 63 to 104 against 80, with a median spread inside one
 * season of 30, 41 and 30 games. The NFL front office already builds a real
 * fixture list (buildSchedule in frontOffice.ts, Round 419) and is untouched.
 *
 * The construction, shared by all three because they share the shape:
 *   THE MATCHINGS. The circle method splits every pairing of n clubs (n even)
 *   into n - 1 rounds in which every club plays exactly once. One shuffled
 *   order of those matchings is drawn per season, and game slot s of the season
 *   uses matching perm[s mod (n - 1)]. Every slot is a full matching, so every
 *   club plays exactly one game per slot and exactly rounds * perRound games in
 *   all. A round's slots are consecutive and perRound is below n - 1, so no
 *   pairing can come up twice inside one round. Pairs meet either floor or ceil
 *   of the slots over n - 1 times across the season.
 *   HOME AND AWAY. Every club ends on the same even total in all three leagues
 *   (80, 162, 80), so the season's games form a graph where every degree is
 *   even, and walking it in closed trails (Hierholzer) and hosting each game at
 *   the club the walk leaves from gives every club exactly as many home games
 *   as away games.
 * The schedule is saved with the league as "HOME-AWAY" strings per round, so a
 * reload plays the same fixtures. A league saved before this round has none:
 * it finishes the season it was saved in the old way (foPlayRound's fallback,
 * draw for draw what it always did) and gets a schedule at its next summer.
 */

export type FoSchedule = string[][];

/** The n - 1 perfect matchings of n clubs, n even (the circle method). */
function circleMatchings(clubs: string[]): [string, string][][] {
  const n = clubs.length;
  const fixed = clubs[n - 1];
  const ring = clubs.slice(0, n - 1);
  const m = ring.length;
  const out: [string, string][][] = [];
  for (let r = 0; r < m; r += 1) {
    const round: [string, string][] = [[fixed, ring[r]]];
    for (let i = 1; i < n / 2; i += 1) round.push([ring[(r + i) % m], ring[(r - i + m) % m]]);
    out.push(round);
  }
  return out;
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Host every game so each club's home count equals its away count: each club
    plays an even number of games, so closed trails cover every edge, and the
    club a trail leaves from hosts. */
function orientEvenly(games: [string, string][]): void {
  const adj = new Map<string, number[]>();
  const link = (v: string, e: number) => { const l = adj.get(v); if (l) l.push(e); else adj.set(v, [e]); };
  games.forEach(([a, b], e) => { link(a, e); link(b, e); });
  const used = new Array<boolean>(games.length).fill(false);
  const ptr = new Map<string, number>();
  for (const start of adj.keys()) {
    const stack = [start];
    while (stack.length) {
      const v = stack[stack.length - 1];
      const list = adj.get(v)!;
      let i = ptr.get(v) ?? 0;
      while (i < list.length && used[list[i]]) i += 1;
      ptr.set(v, i);
      if (i === list.length) { stack.pop(); continue; }
      const e = list[i];
      used[e] = true;
      const [a, b] = games[e];
      const other = a === v ? b : a;
      games[e] = [v, other];
      stack.push(other);
    }
  }
}

/** A balanced season: `rounds` rounds of `perRound` games for every club. */
export function buildFoSchedule(clubs: string[], rounds: number, perRound: number, rng: () => number): FoSchedule {
  const n = clubs.length;
  /* The construction needs an even league and fewer games per round than
     matchings; it says so rather than quietly booking a club twice. */
  if (n < 2 || n % 2 !== 0 || perRound >= n - 1 || (rounds * perRound) % 2 !== 0) {
    throw new Error(`buildFoSchedule cannot book ${rounds} x ${perRound} games for ${n} clubs.`);
  }
  const matchings = circleMatchings(shuffle(clubs, rng));
  const perm = shuffle(matchings.map((_, i) => i), rng);
  const slots = rounds * perRound;
  const games: [string, string][] = [];
  for (let s = 0; s < slots; s += 1) for (const pair of matchings[perm[s % perm.length]]) games.push([pair[0], pair[1]]);
  orientEvenly(games);
  const perSlot = n / 2;
  const out: FoSchedule = [];
  for (let r = 0; r < rounds; r += 1) {
    out.push(games.slice(r * perRound * perSlot, (r + 1) * perRound * perSlot).map(([h, a]) => `${h}-${a}`));
  }
  return out;
}

/**
 * Play the league's current round: every booked game once, home club first,
 * with `k` the game's index in the round. A league with no schedule for this
 * round (saved before Round 851, mid season) plays the old way, exactly as it
 * always did draw for draw, and is given a schedule at its next summer. One
 * saved before the round with nobody's first game played yet is booked here.
 */
export function foPlayRound(
  league: { schedule?: FoSchedule; round: number; teams: Record<string, { wins: number; losses: number; otLosses?: number }> },
  abbrs: string[],
  perRound: number,
  rng: () => number,
  play: (home: string, away: string, k: number) => void,
  book: () => FoSchedule,
): void {
  if (!league.schedule && league.round === 1
    && Object.values(league.teams).every(t => t.wins + t.losses + (t.otLosses ?? 0) === 0)) {
    league.schedule = book();
  }
  const booked = league.schedule?.[league.round - 1];
  if (booked) {
    booked.forEach((g, k) => { const [home, away] = g.split('-'); play(home, away, k); });
    return;
  }
  for (let ai = 0; ai < abbrs.length; ai += 1) {
    const abbr = abbrs[ai];
    for (let g = 0; g < perRound; g += 1) {
      let opp = abbrs[Math.floor(rng() * abbrs.length)];
      if (opp === abbr) opp = abbrs[(abbrs.indexOf(abbr) + 1) % abbrs.length];
      // each matchup is counted once from the home side only: half rate
      if (rng() < 0.5) continue;
      play(abbr, opp, ai * perRound + g);
    }
  }
}
