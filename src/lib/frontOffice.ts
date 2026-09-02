import { FO_TEAMS, FO_TEAM_MAP, type FoPlayer, type FoTeam } from '@/data/frontOfficePlayers';
/* Round 211: no two men in one league share a name. */
import { leagueNames, uniqueName } from './foNames';

/**
 * NFL Front Office engine (2026-08-05, the manager-for-every-sport push).
 * A full GM sim over the REAL 2025-26 roster bake in frontOfficePlayers.ts:
 * cap sheet, releases, free agency, trades, a three-round draft of clearly
 * fictional prospects, a 17-game schedule with true divisional structure,
 * injuries, the real 14-team playoff format (7 seeds per conference, first
 * round byes for the 1 seeds), aging and contract churn across unlimited
 * seasons. Everything the GM does is explicitly hypothetical; player
 * ratings are derived by scripts/genFrontOfficeRoster.mjs from the 2026
 * rosters and the 2025 season (see the data file header for every rule).
 *
 * Determinism: all randomness flows through the caller's rng so headless
 * tests can replay seasons.
 */

export const SALARY_CAP_BASE = 260; // $M, rises 5% per season
export const REGULAR_WEEKS = 17;

export interface GmPlayer extends FoPlayer {
  id: string;
  /** Weeks remaining out injured (0 = healthy). */
  out: number;
  /** Hidden growth ceiling for young players. */
  pot: number;
}

export interface GmTeamState {
  abbr: string;
  players: GmPlayer[];
  defense: number;
  wins: number;
  losses: number;
  /** Draft capital markers, one entry per round held this year. */
  picks: number[];
}

export interface GmGame {
  week: number;
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
  winner: string;
}

export interface Prospect {
  id: string;
  name: string;
  pos: GmPlayer['pos'] | 'DEF';
  age: number;
  /** Scouted grade shown to the GM (true ovr hidden until drafted). */
  grade: number;
  trueOvr: number;
}

export interface LeagueState {
  season: number; // 2026, 2027, ...
  cap: number;
  teams: Record<string, GmTeamState>;
  freeAgents: GmPlayer[];
  schedule: GmGame[][]; // week -> games
  week: number; // 1..17, 18 = playoffs
  champions: { season: number; team: string }[];
}

let idCounter = 0;
export function freshId(): string {
  idCounter += 1;
  return `p${idCounter}`;
}

export function makeGmPlayer(p: FoPlayer, rng: () => number): GmPlayer {
  return {
    ...p,
    id: freshId(),
    out: 0,
    pot: p.age <= 25 ? Math.min(97, p.ovr + 2 + Math.floor(rng() * 6)) : p.ovr,
  };
}

export function initLeague(rng: () => number = Math.random): LeagueState {
  const teams: Record<string, GmTeamState> = {};
  for (const t of FO_TEAMS) {
    teams[t.abbr] = {
      abbr: t.abbr,
      players: t.players.map(p => makeGmPlayer(p, rng)),
      defense: t.defense,
      wins: 0,
      losses: 0,
      picks: [1, 2, 3],
    };
  }
  return {
    season: 2026,
    cap: SALARY_CAP_BASE,
    teams,
    /* Round 211: the pool is dealt against the names already on the
       thirty two rosters, so an invented free agent can never share a name
       with a real player either. */
    freeAgents: buildInitialFreeAgents(rng, leagueNames({ teams, freeAgents: [] })),
    schedule: buildSchedule(rng),
    week: 1,
    champions: [],
  };
}

/** A believable opening FA pool: fictional veterans at every position. */
function buildInitialFreeAgents(rng: () => number, taken: Set<string>): GmPlayer[] {
  const out: GmPlayer[] = [];
  /* Round 418: the opening market carries defenders too. It never did, so
     the two position groups Round 416 added were unsignable: you could see
     them on other teams and never acquire one except by trade. */
  const POS: GmPlayer['pos'][] = ['QB', 'RB', 'WR', 'WR', 'TE', 'OL', 'OL', 'DL', 'LB', 'DB'];
  for (let i = 0; i < 20; i++) {
    const pos = POS[i % POS.length];
    const ovr = 70 + Math.floor(rng() * 12);
    out.push({
      id: freshId(),
      name: prospectName(rng, taken),
      pos,
      age: 27 + Math.floor(rng() * 6),
      ovr,
      salary: salaryFor(pos, ovr),
      years: 1 + Math.floor(rng() * 2),
      out: 0,
      pot: ovr,
    });
  }
  return out;
}

export function salaryFor(pos: GmPlayer['pos'], ovr: number): number {
  if (pos === 'QB') return Math.round(Math.max(1.5, (ovr - 66) * 1.8 - 18) * 10) / 10;
  return Math.round(Math.max(1.0, (ovr - 66) * 1.15 - 12) * 10) / 10;
}

export function capUsed(team: GmTeamState): number {
  return Math.round(team.players.reduce((s, p) => s + p.salary, 0) * 10) / 10;
}

export function capRoom(team: GmTeamState, cap: number): number {
  return Math.round((cap - capUsed(team)) * 10) / 10;
}

export const SKILL_POS: GmPlayer['pos'][] = ['RB', 'WR', 'TE'];
export const DEF_POS: GmPlayer['pos'][] = ['DL', 'LB', 'DB'];

/* ROUND 418: THE DEFENCE IS THE DEFENDERS. Until now the 28 percent of team
   strength that defence is worth came from `team.defense`, a single stored
   number, and the men on the roster were worth nothing at all. That was
   deliberate for one round while the bake landed, and it left the game
   saying two different things at once: the old number came from a 2024
   team-unit rating, and measured against the 2026 defenders the same file
   now lists its correlation is MINUS 0.112. In other words a club could
   show you six good defenders and still be rated a poor defence, and
   trading for a great one changed nothing at all.
   It reads the roster now, so signing, trading, drafting or losing a
   defender moves the number the way signing a receiver always has.
   THERE IS NO FALLBACK TO THE STORED NUMBER, and an earlier draft of this
   round had one. It was meant to keep pre 416 saves playing as they always
   had, but no test on a count of defenders can tell a save that never had
   any from a 2026 club that has just cut its last one, so it turned into a
   live exploit: cutting your whole defence dropped you onto the stored
   number, which for 11 of the 32 clubs was an UPGRADE. A pre 416 save
   therefore keeps its titles, its seasons and its squad, and its defence
   sits at replacement level for every club EQUALLY until the first offseason
   gives everyone their six back. Equally is the load bearing word: a result
   reads the gap between two teams, so a uniform floor changes none of them. */
/** The defensive complement the roster file ships: DL 2, LB 2, DB 2. */
export const DEF_SLOTS = 6;
/* A man off the street. The bake's floor is 66, and the depth journeymen
   replenishRosters invents start at 66, so 60 is below anything a real
   roster holds: losing a defender and not replacing him has to cost. */
export const REPLACEMENT_OVR = 60;

/* A MEAN REWARDS CUTTING YOUR WORST MAN, and the first version of this was a
   mean. Releasing a below average defender raised the average, so it raised
   team strength: measured on the shipped league it made all 32 clubs
   stronger, worth a mean of +0.585 and up to +1.04, and cutting five of six
   was worth +2.95 while freeing 27M of cap. Worse, cutting all six fell
   through to the stored 2024 unit number, which for 11 of the 32 was an
   upgrade: Miami went from 73.85 to 79.22 and from 3.65 wins a season to
   6.38. The board displayed the rise as it happened, with the Cut buttons a
   dozen lines below the number, so the game was inviting it.
   The fix is the shape the skill term has always used: a FIXED denominator.
   The best DEF_SLOTS defenders count, and an empty slot counts as a
   replacement level man rather than being quietly left out of the average,
   so removing anybody can only ever lower the number. It is monotone by
   construction rather than by a check that has to think of the exploit
   first. A club that ships its full six is scored exactly as before, so
   nothing about the opening league changed.
   THE STORED NUMBER IS GONE, and that is a deliberate second change. Keeping
   it as the empty roster fallback is what made cutting your whole defence
   pay, and no test on the count of defenders can tell a pre 416 save that
   never had any from a 2026 club that has just cut its last one. A pre 416
   save therefore keeps its titles, its seasons and its squad, and its
   defence sits at replacement level for every club equally until the first
   offseason gives everyone their six back. Equally is the important word:
   game outcomes read the GAP between two teams, so a uniform floor changes
   no result between them. */
export function defenceRating(team: GmTeamState): number {
  const best = team.players
    .filter(p => p.out === 0 && DEF_POS.includes(p.pos))
    .map(p => p.ovr)
    .sort((a, b) => b - a)
    .slice(0, DEF_SLOTS);
  const filled = best.reduce((s, v) => s + v, 0);
  const empty = (DEF_SLOTS - best.length) * REPLACEMENT_OVR;
  return (filled + empty) / DEF_SLOTS;
}

/** Team strength: QB 30, skill 30, OL 12, DEF 28 (injured players excluded). */
export function teamStrength(team: GmTeamState): number {
  const healthy = team.players.filter(p => p.out === 0);
  const qb = Math.max(64, ...healthy.filter(p => p.pos === 'QB').map(p => p.ovr));
  const skill = healthy.filter(p => SKILL_POS.includes(p.pos)).sort((a, b) => b.ovr - a.ovr).slice(0, 5);
  const skillAvg = skill.length ? skill.reduce((s, p) => s + p.ovr, 0) / skill.length : 64;
  const ol = healthy.filter(p => p.pos === 'OL');
  const olAvg = ol.length ? ol.reduce((s, p) => s + p.ovr, 0) / ol.length : 64;
  return qb * 0.30 + skillAvg * 0.30 + olAvg * 0.12 + defenceRating(team) * 0.28;
}

// ---------------------------------------------------------------------------
// Schedule: 6 divisional games (home and away vs each rival) + 11 crossover
// games rotated deterministically. Every team plays exactly 17.
// ---------------------------------------------------------------------------

export function divisionOf(abbr: string): string {
  return FO_TEAM_MAP.get(abbr)!.division;
}

/* ROUND 419: EVERY CLUB PLAYS SEVENTEEN GAMES, and until now most seasons had
   one that did not. The shape was documented and believed: six divisional
   games home and away against three rivals, plus eleven crossover games,
   seventeen in all for all thirty two clubs. Measured over 3,000 built
   schedules it delivered that 10.6 percent of the time. In the other 89.4
   percent a club came up short, as low as NINE games, because the crossover
   pairing walked a greedy loop and gave up the moment one club was left
   needing partners nobody could legally supply. Standings sort on wins, so a
   club with eight fewer chances to win is not cosmetic: it cannot reach the
   playoffs, and the mandate ownership grades it against assumes it can. The
   same pass also placed a club in the same week twice 40.8 times a season on
   average, under a comment calling that rare and harmless. It was neither.

   GREEDY CANNOT DO THIS, WHICH IS WHY IT IS NOT GREEDY ANY MORE. Fixing the
   old loop to serve the hungriest club first still only completed the pairing
   17 times in 300, and fitting the result into seventeen weeks with nobody
   playing twice then succeeded 0 times out of those 17. Seventeen weeks of
   sixteen games with all thirty two clubs busy every week is a perfect
   partition, and a greedy walk does not find one by trying harder.
   The league's own shape hands over a construction instead. Eight divisions
   of four is a round robin waiting to be used:
     THE SIX DIVISIONAL WEEKS. Four clubs playing home and away is a double
     round robin, exactly six rounds of two games, and all eight divisions run
     theirs at the same time. Six weeks, sixteen games each, everybody busy.
     THE ELEVEN CROSSOVER WEEKS. Round robin the eight DIVISIONS against each
     other: seven rounds, each pairing four divisions with four others. In a
     week where division X meets division Y their four clubs pair off, so
     every club plays exactly one non division opponent. That is seven weeks.
     For the remaining four, the same division pairings are used again with a
     DIFFERENT internal matching (club i meets club i+m rather than club i),
     so no two clubs ever meet twice.
   Seventeen weeks, sixteen games each, 272 in all, every club on seventeen
   and nobody scheduled twice in a week, by construction rather than by luck.
   The check at the bottom stays anyway and FAILS CLOSED: a game that will not
   start is a bug somebody fixes, a season where one club plays nine games is
   a bug nobody sees. */
const CROSSOVER_GAMES = 11;
const DIVISIONAL_GAMES = 6;
export const GAMES_PER_CLUB = CROSSOVER_GAMES + DIVISIONAL_GAMES;

/** Round robin pairings of n items, n even: n-1 rounds, the circle method. */
function circleRounds<T>(items: T[]): [T, T][][] {
  const n = items.length;
  const ring = items.slice(1);
  const rounds: [T, T][][] = [];
  for (let r = 0; r < n - 1; r += 1) {
    const round: [T, T][] = [[items[0], ring[r % ring.length]]];
    for (let i = 1; i < n / 2; i += 1) {
      const a = ring[(r + i) % ring.length];
      const b = ring[(r + ring.length - i) % ring.length];
      round.push([a, b]);
    }
    rounds.push(round);
    // rotate for the next round
  }
  return rounds;
}

export function buildSchedule(rng: () => number): GmGame[][] {
  const shuffle = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  /* clubs grouped by division, both orders shuffled so two seasons do not
     produce the same fixture list */
  const byDiv = new Map<string, string[]>();
  for (const t of FO_TEAMS) {
    byDiv.set(t.division, [...(byDiv.get(t.division) ?? []), t.abbr]);
  }
  const divisions = shuffle([...byDiv.keys()]);
  const clubs = new Map(divisions.map(d => [d, shuffle(byDiv.get(d)!)]));

  /* THE CONSTRUCTION ASSUMES THE LEAGUE'S SHAPE, so it says so out loud rather
     than quietly producing nonsense if a data refresh ever changes it. An even
     number of divisions, each the same even size, is what makes both round
     robins work. */
  const divSize = clubs.get(divisions[0])!.length;
  const shapeOk = divisions.length % 2 === 0
    && divSize % 2 === 0
    && divisions.every(d => clubs.get(d)!.length === divSize);
  if (!shapeOk) {
    throw new Error(
      `buildSchedule needs an even number of equal, even sized divisions and found `
      + `${divisions.length} divisions of ${divisions.map(d => clubs.get(d)!.length).join('/')}. `
      + 'Refusing to guess at a schedule for a league shape it was not built for.');
  }
  /* Each division pairing can be reused divSize times before two clubs would
     meet twice, because the internal matching only has that many offsets. */
  const maxCrossover = (divisions.length - 1) * divSize;
  if (CROSSOVER_GAMES > maxCrossover) {
    throw new Error(
      `buildSchedule was asked for ${CROSSOVER_GAMES} crossover games but this league shape `
      + `supports at most ${maxCrossover} before two clubs would have to meet twice.`);
  }

  const weeks: GmGame[][] = [];
  const add = (list: GmGame[], home: string, away: string) => {
    list.push({ week: weeks.length + 1, home, away, homeScore: 0, awayScore: 0, winner: '' });
  };

  /* six divisional weeks: a double round robin inside every division at once */
  for (const [ri, round] of circleRounds([0, 1, 2, 3]).entries()) {
    for (const back of [false, true]) {
      const w: GmGame[] = [];
      for (const d of divisions) {
        const m = clubs.get(d)!;
        for (const [i, j] of round) {
          if (back) add(w, m[j], m[i]);
          else add(w, m[i], m[j]);
        }
      }
      weeks.push(w);
      void ri;
    }
  }

  /* eleven crossover weeks: round robin the divisions, then repeat four of
     those weeks with a different internal matching */
  const divRounds = circleRounds(divisions);
  for (let r = 0; r < CROSSOVER_GAMES; r += 1) {
    const pairs = divRounds[r % divRounds.length];
    const matching = Math.floor(r / divRounds.length);
    const w: GmGame[] = [];
    for (const [x, y] of pairs) {
      const xs = clubs.get(x)!;
      const ys = clubs.get(y)!;
      for (let i = 0; i < xs.length; i += 1) {
        const j = (i + matching) % ys.length;
        /* alternate the host so neither division hosts everything */
        if ((r + i) % 2 === 0) add(w, xs[i], ys[j]);
        else add(w, ys[j], xs[i]);
      }
    }
    weeks.push(w);
  }

  /* the promise, checked before it ships rather than assumed */
  const played = new Map(FO_TEAMS.map(t => [t.abbr, 0]));
  for (const w of weeks) {
    const here = new Set<string>();
    for (const g of w) {
      if (here.has(g.home) || here.has(g.away)) {
        throw new Error(`buildSchedule put a club in week ${g.week} twice, which the season is not allowed to do.`);
      }
      here.add(g.home);
      here.add(g.away);
      played.set(g.home, played.get(g.home)! + 1);
      played.set(g.away, played.get(g.away)! + 1);
    }
  }
  const short = [...played.entries()].filter(([, n]) => n !== GAMES_PER_CLUB);
  if (short.length || weeks.length !== REGULAR_WEEKS) {
    throw new Error(
      `buildSchedule produced ${weeks.length} weeks and left ${short.length} club(s) off ${GAMES_PER_CLUB} games `
      + `(${short.map(([a, n]) => `${a} ${n}`).join(', ')}). Refusing to return a season where somebody plays fewer `
      + 'games than the rest, which is what shipped before Round 419.');
  }
  return weeks;
}

// ---------------------------------------------------------------------------
// Game sim
// ---------------------------------------------------------------------------

export function winProb(home: GmTeamState, away: GmTeamState): number {
  const gap = teamStrength(home) - teamStrength(away) + 2;
  return 1 / (1 + Math.pow(10, -gap / 14));
}

export function simGame(g: GmGame, teams: Record<string, GmTeamState>, rng: () => number): GmGame {
  const home = teams[g.home], away = teams[g.away];
  const p = winProb(home, away);
  const homeWins = rng() < p;
  const base = 16 + Math.floor(rng() * 15);
  const margin = 1 + Math.floor(rng() * 17);
  const hs = homeWins ? base + margin : base;
  const as = homeWins ? base : base + margin;
  const done: GmGame = { ...g, homeScore: hs, awayScore: as, winner: homeWins ? g.home : g.away };
  const loser = homeWins ? away : home;
  const winner = homeWins ? home : away;
  winner.wins += 1;
  loser.losses += 1;
  return done;
}

/** Weekly injury pass: small chance a starter goes down 1-4 weeks. */
export function injuryPass(teams: Record<string, GmTeamState>, rng: () => number): { team: string; player: string; weeks: number }[] {
  const news: { team: string; player: string; weeks: number }[] = [];
  for (const t of Object.values(teams)) {
    for (const p of t.players) {
      if (p.out > 0) { p.out -= 1; continue; }
      if (rng() < 0.012) {
        p.out = 1 + Math.floor(rng() * 4);
        news.push({ team: t.abbr, player: p.name, weeks: p.out });
      }
    }
  }
  return news;
}

// ---------------------------------------------------------------------------
// Standings and the real playoff format
// ---------------------------------------------------------------------------

export function conferenceOf(abbr: string): 'AFC' | 'NFC' {
  return divisionOf(abbr).startsWith('AFC') ? 'AFC' : 'NFC';
}

export function standings(teams: Record<string, GmTeamState>): GmTeamState[] {
  return Object.values(teams).sort(
    (a, b) => b.wins - a.wins || a.losses - b.losses || teamStrength(b) - teamStrength(a),
  );
}

/** Real format: 4 division winners seeded 1-4 by record, plus 3 wildcards. */
export function conferenceSeeds(teams: Record<string, GmTeamState>, conf: 'AFC' | 'NFC'): string[] {
  const confTeams = standings(teams).filter(t => conferenceOf(t.abbr) === conf);
  const divisions = new Map<string, GmTeamState>();
  for (const t of confTeams) {
    const d = divisionOf(t.abbr);
    if (!divisions.has(d)) divisions.set(d, t);
  }
  const winners = [...divisions.values()].sort((a, b) => b.wins - a.wins || a.losses - b.losses);
  const winnerSet = new Set(winners.map(t => t.abbr));
  const wildcards = confTeams.filter(t => !winnerSet.has(t.abbr)).slice(0, 3);
  return [...winners, ...wildcards].map(t => t.abbr);
}

export interface PlayoffRound {
  name: string;
  games: GmGame[];
}

/**
 * Runs the full 14-team bracket: wildcard (2v7 3v6 4v5 per conference, 1
 * seeds bye), divisional (1 vs lowest remaining), championship, Super Bowl.
 */
export function runPlayoffs(
  teams: Record<string, GmTeamState>,
  rng: () => number,
): { rounds: PlayoffRound[]; champion: string } {
  const rounds: PlayoffRound[] = [];
  const bracket: Record<'AFC' | 'NFC', string[]> = {
    AFC: conferenceSeeds(teams, 'AFC'),
    NFC: conferenceSeeds(teams, 'NFC'),
  };
  const seedOf: Record<string, number> = {};
  (['AFC', 'NFC'] as const).forEach(conf => bracket[conf].forEach((t, i) => { seedOf[t] = i + 1; }));

  const playRound = (name: string, pairs: [string, string][]): string[] => {
    const games = pairs.map(([h, a]) => simGame({ week: 0, home: h, away: a, homeScore: 0, awayScore: 0, winner: '' }, teams, rng));
    // playoff games should not count toward regular season records
    for (const g of games) {
      teams[g.winner].wins -= 1;
      teams[g.winner === g.home ? g.away : g.home].losses -= 1;
    }
    rounds.push({ name, games });
    return games.map(g => g.winner);
  };

  const alive: Record<'AFC' | 'NFC', string[]> = { AFC: [], NFC: [] };
  for (const conf of ['AFC', 'NFC'] as const) {
    const s = bracket[conf];
    const winners = playRound(`${conf} Wild Card`, [[s[1], s[6]], [s[2], s[5]], [s[3], s[4]]]);
    alive[conf] = [s[0], ...winners].sort((a, b) => seedOf[a] - seedOf[b]);
  }
  for (const conf of ['AFC', 'NFC'] as const) {
    const s = alive[conf];
    const winners = playRound(`${conf} Divisional`, [[s[0], s[3]], [s[1], s[2]]]);
    alive[conf] = winners.sort((a, b) => seedOf[a] - seedOf[b]);
  }
  const finalists: string[] = [];
  for (const conf of ['AFC', 'NFC'] as const) {
    const [w] = playRound(`${conf} Championship`, [[alive[conf][0], alive[conf][1]]]);
    finalists.push(w);
  }
  const [champion] = playRound('Super Bowl', [[finalists[0], finalists[1]]]);
  return { rounds, champion };
}

// ---------------------------------------------------------------------------
// GM moves
// ---------------------------------------------------------------------------

/** Release: cap relief now, the player joins the FA pool. */
export function releasePlayer(team: GmTeamState, freeAgents: GmPlayer[], playerId: string): boolean {
  const idx = team.players.findIndex(p => p.id === playerId);
  if (idx < 0 || team.players.length <= 6) return false;
  const [p] = team.players.splice(idx, 1);
  freeAgents.push({ ...p, years: 1 });
  return true;
}

export function signPlayer(team: GmTeamState, freeAgents: GmPlayer[], playerId: string, cap: number): boolean {
  const idx = freeAgents.findIndex(p => p.id === playerId);
  if (idx < 0) return false;
  const p = freeAgents[idx];
  if (capRoom(team, cap) < p.salary) return false;
  freeAgents.splice(idx, 1);
  team.players.push(p);
  return true;
}

/** Trade evaluation: AI accepts when incoming value beats outgoing by margin. */
export function tradeValue(p: GmPlayer): number {
  const posW = p.pos === 'QB' ? 1.5 : 1;
  const ageW = Math.max(0.55, 1.25 - Math.max(0, p.age - 25) * 0.06);
  return p.ovr * posW * ageW;
}

export function proposeTrade(
  my: GmTeamState, their: GmTeamState, myPlayerId: string, theirPlayerId: string,
  sweetenerPick: boolean, cap: number,
): 'accepted' | 'rejected' | 'invalid' {
  const mine = my.players.find(p => p.id === myPlayerId);
  const theirs = their.players.find(p => p.id === theirPlayerId);
  if (!mine || !theirs || my.players.length <= 6 || their.players.length <= 6) return 'invalid';
  // Round 82: salary matching so cap-strapped teams can still swap contracts
  const fitsMe = capRoom(my, cap) + mine.salary >= theirs.salary || theirs.salary <= mine.salary * 1.5 + 5;
  const fitsThem = capRoom(their, cap) + theirs.salary >= mine.salary || mine.salary <= theirs.salary * 1.5 + 5;
  if (!fitsMe || !fitsThem) return 'invalid';
  const pickValue = sweetenerPick && my.picks.length > 0 ? 14 : 0;
  if (tradeValue(mine) + pickValue < tradeValue(theirs) * 1.08) return 'rejected';
  my.players = my.players.filter(p => p.id !== myPlayerId);
  their.players = their.players.filter(p => p.id !== theirPlayerId);
  my.players.push(theirs);
  their.players.push(mine);
  if (sweetenerPick && my.picks.length > 0) {
    their.picks.push(my.picks.pop()!);
    their.picks.sort();
  }
  return 'accepted';
}

/* Round 190: execute a deal the trade TALKS agreed. The negotiation
   already settled the value question (that is what the phone call was
   for), so this enforces only the hard rules, roster floor and salary
   matching, exactly proposeTrade's, and moves the agreed pick when the
   package includes one. An agreed 1.02 deal executes here where the old
   1.08 threshold would have hung up, which the harness pins. */
export function executeTalksTrade(
  my: GmTeamState, their: GmTeamState, myPlayerId: string, theirPlayerId: string,
  addPick: boolean, cap: number,
): 'done' | 'invalid' {
  const mine = my.players.find(p => p.id === myPlayerId);
  const theirs = their.players.find(p => p.id === theirPlayerId);
  if (!mine || !theirs || my.players.length <= 6 || their.players.length <= 6) return 'invalid';
  if (addPick && my.picks.length === 0) return 'invalid';
  const fitsMe = capRoom(my, cap) + mine.salary >= theirs.salary || theirs.salary <= mine.salary * 1.5 + 5;
  const fitsThem = capRoom(their, cap) + theirs.salary >= mine.salary || mine.salary <= theirs.salary * 1.5 + 5;
  if (!fitsMe || !fitsThem) return 'invalid';
  my.players = my.players.filter(p => p.id !== myPlayerId);
  their.players = their.players.filter(p => p.id !== theirPlayerId);
  my.players.push(theirs);
  their.players.push(mine);
  if (addPick) {
    their.picks.push(my.picks.pop()!);
    their.picks.sort();
  }
  return 'done';
}

// ---------------------------------------------------------------------------
// Draft (fictional prospects, clearly generated)
// ---------------------------------------------------------------------------

/* Round 211: widened from 20x20 to 34x34. Four hundred possible people
   still put the same man in a new league's free agent pool twice in six of
   thirty measured leagues. Every pairing is enumerated against the
   real-name wall by simInventedNames on each suite run. */
const FIRST = [
  'Jalen', 'Marcus', 'Tyrese', 'Caden', 'DeShawn', 'Malik', 'Brock', 'Xavier', 'Trey', 'Jaxon',
  'Amari', 'Kai', 'Darius', 'Cooper', 'Zion', 'Roman', 'Elijah', 'Nico', 'Grant', 'Omar',
  'Bo', 'Cade', 'Deion', 'Ezra', 'Finn', 'Hollis', 'Isaiah', 'Jamari', 'Keegan', 'Lincoln',
  'Maddox', 'Nash', 'Quincy', 'Rashad',
];
const LAST = [
  'Whitfield', 'Calloway', 'Bridgewater', 'Sterling', 'Maddox', 'Rourke', 'Delacroix', 'Okafor', 'Vandermeer', 'Holloway',
  /* Round 416: Redmond left the bank. The roster bake added the real 2026
     squads, one of whom is Jalen Redmond, and Jalen is in the first name
     list, so the draft class generator could hand a fictional prospect a
     real man's name. simInventedNames caught it the first time it ran
     against the new file, which is what it is for. */
  'Kingsley', 'Beaumont', 'Ashford', 'Winslow', 'Marchetti', 'Duvall', 'Slater', 'Ellingsworth', 'Crowder', 'Bishop',
  'Ravensworth', 'Sutcliffe', 'Thackery', 'Underhill', 'Valentine', 'Wexford', 'Yarborough', 'Zimmerman', 'Aldridge', 'Braddock',
  'Chesterton', 'Draycott', 'Eastmond', 'Fenwick',
];

/**
 * Round 211: a name nobody in this league already has.
 *
 * The `taken` book is optional so the harnesses and any caller that only
 * wants a plausible string still work, but every caller inside the engine
 * passes one, because a free agent who shares a name with a man on a
 * roster is the same bug as two free agents sharing one.
 */
export function prospectName(rng: () => number, taken?: Set<string>): string {
  if (taken) return uniqueName(rng, FIRST, LAST, taken);
  return `${FIRST[Math.floor(rng() * FIRST.length)]} ${LAST[Math.floor(rng() * LAST.length)]}`;
}

export function generateDraftClass(rng: () => number, size = 40, taken: Set<string> = new Set()): Prospect[] {
  /* Round 418: a defensive pick arrives as a person. It used to be one 'DEF'
     entry that added a point or two to the team's defence number and never
     got a position, so the board announced a name you could not look at
     afterwards. Defenders are drafted at their actual position now, in the
     shape the roster carries (two each of DL, LB and DB against one QB). */
  const POS: Prospect['pos'][] = ['QB', 'RB', 'WR', 'WR', 'TE', 'OL', 'OL', 'DL', 'DL', 'LB', 'LB', 'DB', 'DB'];
  const out: Prospect[] = [];
  for (let i = 0; i < size; i++) {
    const pos = POS[Math.floor(rng() * POS.length)];
    const trueOvr = 66 + Math.floor(rng() * 22); // 66-87
    const noise = Math.floor(rng() * 9) - 4;     // scouting error -4..+4
    out.push({
      id: freshId(),
      name: prospectName(rng, taken),
      pos,
      age: 21 + Math.floor(rng() * 3),
      grade: Math.max(62, Math.min(92, trueOvr + noise)),
      trueOvr,
    });
  }
  return out.sort((a, b) => b.grade - a.grade);
}

/** Reverse standings draft order (worst record first). */
export function draftOrder(teams: Record<string, GmTeamState>): string[] {
  return standings(teams).map(t => t.abbr).reverse();
}

export function prospectToPlayer(pr: Prospect, rng: () => number): GmPlayer | null {
  /* Round 418: nothing is refused any more. A pre 418 save can still hold a
     'DEF' prospect in its stored draft class, so that one value is turned
     into a real position rather than dropped on the floor, which is what
     used to happen to every defensive pick. */
  if (pr.pos === 'DEF') {
    const spread = DEF_POS[Math.floor(rng() * DEF_POS.length)];
    return prospectToPlayer({ ...pr, pos: spread }, rng);
  }
  const ovr = pr.trueOvr;
  return {
    id: freshId(),
    name: pr.name,
    pos: pr.pos,
    age: pr.age,
    ovr,
    salary: Math.max(1, Math.round((ovr - 60) * 0.35 * 10) / 10),
    years: 4,
    out: 0,
    pot: Math.min(97, ovr + 3 + Math.floor(rng() * 8)),
  };
}

// ---------------------------------------------------------------------------
// Offseason
// ---------------------------------------------------------------------------

export interface OffseasonNews {
  retired: { team: string; player: string }[];
  expired: { team: string; player: string }[];
  developed: { team: string; player: string; from: number; to: number }[];
}

export function runOffseason(league: LeagueState, rng: () => number): OffseasonNews {
  const news: OffseasonNews = { retired: [], expired: [], developed: [] };
  for (const t of Object.values(league.teams)) {
    const keep: GmPlayer[] = [];
    for (const p of t.players) {
      p.age += 1;
      p.out = 0;
      // development and decline
      if (p.age <= 25 && p.ovr < p.pot) {
        const from = p.ovr;
        p.ovr = Math.min(p.pot, p.ovr + 1 + Math.floor(rng() * 2));
        if (p.ovr - from >= 2) news.developed.push({ team: t.abbr, player: p.name, from, to: p.ovr });
      } else if (p.age >= 31) {
        p.ovr = Math.max(62, p.ovr - (1 + Math.floor(rng() * 2) + (p.age >= 34 ? 1 : 0)));
      }
      // retirement
      if (p.age >= 34 && (p.ovr <= 70 || rng() < 0.3 || p.age >= 40)) {
        news.retired.push({ team: t.abbr, player: p.name });
        continue;
      }
      // contracts
      p.years -= 1;
      if (p.years <= 0) {
        // AI teams re-sign their stars, let the rest walk; the user chooses in UI beforehand
        p.years = years0(p.age);
        p.salary = salaryFor(p.pos, p.ovr);
        if (p.ovr < 76 && rng() < 0.5) {
          news.expired.push({ team: t.abbr, player: p.name });
          league.freeAgents.push({ ...p, years: 1 });
          continue;
        }
      }
      keep.push(p);
    }
    t.players = keep;
    t.wins = 0;
    t.losses = 0;
    t.picks = [1, 2, 3];
    /* Round 418: team.defense NO LONGER REACHES THE SIM AT ALL. An earlier
       draft of that round kept it as defenceRating's empty roster fallback,
       and that fallback was the exploit (cutting your whole defence dropped
       you onto a stored number that was an upgrade for 11 of the 32 clubs),
       so it was removed. The field and this drift are kept only because they
       sit inside every saved league in localStorage and removing them would
       be a save migration for a number nothing reads. Do not restore a code
       path to it without reading the note above defenceRating first. */
    t.defense = Math.round(Math.max(60, Math.min(95, t.defense + (77 - t.defense) * 0.2 + (rng() * 8 - 4))));
  }
  // trim the FA pool to the useful part
  league.freeAgents = league.freeAgents.sort((a, b) => b.ovr - a.ovr).slice(0, 40);
  for (const fa of league.freeAgents) { fa.age += 1; fa.ovr = fa.age >= 31 ? Math.max(62, fa.ovr - 1) : fa.ovr; }
  replenishRosters(league, rng);
  league.cap = Math.round(league.cap * 1.05);
  league.season += 1;
  league.week = 1;
  league.schedule = buildSchedule(rng);
  return news;
}

/**
 * Every club fills out to a playable roster after churn: at least one QB,
 * two OL, two each of DL, LB and DB, and fifteen players total, which is the
 * shape the roster file ships. Depth arrives as clearly generated journeymen
 * (same fictional-name pool as the draft).
 */
export function replenishRosters(league: LeagueState, rng: () => number): void {
  /* Round 211: one name book for the whole replenishment pass. */
  const taken = leagueNames(league);
  for (const t of Object.values(league.teams)) {
    const addDepth = (pos: GmPlayer['pos']) => {
      const ovr = 66 + Math.floor(rng() * 8);
      t.players.push({
        id: freshId(),
        name: prospectName(rng, taken),
        pos,
        age: 24 + Math.floor(rng() * 8),
        ovr,
        salary: salaryFor(pos, ovr),
        years: 1 + Math.floor(rng() * 2),
        out: 0,
        pot: ovr,
      });
    };
    /* Round 416: the defence has to be replenished too, or it drains away.
       The roster ships with six defenders per club now, and this pass only
       ever guaranteed a quarterback and two linemen and then filled to nine
       off an offence-only cycle. Left alone, every defender a club released,
       traded or retired was replaced by a receiver, so after enough seasons
       a save quietly reverts to the offence-only roster this round set out
       to end, and the Trade Finder would have nothing defensive left to
       show. The floor and the cycle now match the shape the data file
       actually ships (QB 1, RB 2, WR 3, TE 1, OL 2, DL 2, LB 2, DB 2). */
    if (!t.players.some(p => p.pos === 'QB')) addDepth('QB');
    while (t.players.filter(p => p.pos === 'OL').length < 2) addDepth('OL');
    for (const d of ['DL', 'LB', 'DB'] as GmPlayer['pos'][]) {
      while (t.players.filter(p => p.pos === d).length < 2) addDepth(d);
    }
    const CYCLE: GmPlayer['pos'][] = ['WR', 'RB', 'DB', 'TE', 'LB', 'WR', 'DL', 'OL'];
    let i = 0;
    while (t.players.length < 15) addDepth(CYCLE[i++ % CYCLE.length]);
  }
}

function years0(age: number): number {
  if (age <= 25) return 4;
  if (age <= 28) return 3;
  if (age <= 31) return 2;
  return 1;
}

/** AI teams take sensible weekly actions: sign a FA upgrade if cap allows. */
export function aiWeeklyMoves(league: LeagueState, userTeam: string, rng: () => number): string[] {
  const log: string[] = [];
  for (const t of Object.values(league.teams)) {
    if (t.abbr === userTeam) continue;
    if (rng() > 0.15) continue;
    const room = capRoom(t, league.cap);
    const target = league.freeAgents
      .filter(p => p.salary <= room)
      .sort((a, b) => b.ovr - a.ovr)[0];
    if (!target) continue;
    const worstSamePos = t.players.filter(p => p.pos === target.pos).sort((a, b) => a.ovr - b.ovr)[0];
    if (worstSamePos && worstSamePos.ovr + 2 < target.ovr) {
      signPlayer(t, league.freeAgents, target.id, league.cap);
      log.push(`${t.abbr} sign ${target.name} (${target.pos} ${target.ovr})`);
    }
  }
  return log;
}
