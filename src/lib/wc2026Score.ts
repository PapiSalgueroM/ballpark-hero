/**
 * Scoring a 2026 bracket against the tournament as it was played. Round 395.
 *
 * Pure: takes what the player predicted (group seeds, the eight thirds they
 * chose, the knockout rounds the bracket built from their picks, their award
 * picks) and the real results from src/data/wc2026Results.ts, and returns a
 * breakdown plus a points total. Nothing here reads the clock or storage.
 *
 * The points scheme rewards the harder calls more:
 *   1 per correct qualifier (a team you had in a group's top two that really
 *     finished in that group's top two), 24 available
 *   1 per correct group winner, 12
 *   1 per correct qualified third, 8
 *   2 per team you put in the round of 16 that really got there, 16 teams
 *   3 per quarter-finalist, 8
 *   5 per semi-finalist, 4
 *   8 per finalist, 2
 *   15 for the champion
 *   5 per individual award (Golden Boot, Golden Glove, Golden Ball)
 * Maximum 166.
 */
import { WC2026_GROUPS, WC2026_KNOCKOUT, WC2026_CHAMPION, WC2026_AWARDS, wc2026TeamsInRound } from '@/data/wc2026Results';

export interface PredictedSeed { first: string; second: string; third: string }
export interface PredictedMatch { teamA: string; teamB: string; winner: string }
export interface PredictedAwards { goldenBoot: string; goldenGlove: string; goldenBall: string }

export interface RoundScore { right: number; total: number; points: number; rightTeams: string[] }
export interface BracketScore {
  qualifiers: RoundScore;
  groupWinners: RoundScore;
  thirds: RoundScore;
  r16: RoundScore;
  qf: RoundScore;
  sf: RoundScore;
  finalists: RoundScore;
  champion: { picked: string; right: boolean; points: number };
  awards: { goldenBoot: boolean; goldenGlove: boolean; goldenBall: boolean; points: number };
  points: number;
  maxPoints: number;
  /** True when the player has not filled enough of the bracket to score. */
  empty: boolean;
}

export const WC2026_MAX_POINTS = 166;
const POINTS = { qualifier: 1, groupWinner: 1, third: 1, r16: 2, qf: 3, sf: 5, finalist: 8, champion: 15, award: 5 } as const;

/** Real top two per group, group winners, and the eight qualified thirds. */
function realGroupFacts() {
  const topTwo = new Map<string, string>();
  const winners = new Set<string>();
  const thirds = new Set<string>();
  for (const g of WC2026_GROUPS) {
    topTwo.set(g.teams[0], g.letter);
    topTwo.set(g.teams[1], g.letter);
    winners.add(g.teams[0]);
    if (g.thirdQualified) thirds.add(g.teams[2]);
  }
  return { topTwo, winners, thirds };
}

/** Normalises the few spellings the page and the results file could differ on. */
export function sameTeam(a: string, b: string): boolean {
  const n = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
  const alias: Record<string, string> = { unitedstates: 'usa', czechia: 'czechrepublic', turkiye: 'turkey', congodr: 'drcongo', bosniaandherzegovina: 'bosniaherzegovina' };
  const k = (s: string) => { const x = n(s); return alias[x] || x; };
  return !!a && !!b && k(a) === k(b);
}

function countRound(predicted: string[], real: string[], each: number): RoundScore {
  const rightTeams = predicted.filter(p => p && real.some(r => sameTeam(p, r)));
  return { right: rightTeams.length, total: real.length, points: rightTeams.length * each, rightTeams };
}

/**
 * @param seeds the player's group seeds, letter to first/second/third
 * @param selectedThirds the eight third-placed teams the player sent through
 * @param rounds the bracket's rounds as built from the player's picks, in the
 *   order round of 32, round of 16, quarters, semis, third place, final
 * @param awards the player's award picks by display name
 */
export function scoreWc2026Bracket(
  seeds: Record<string, PredictedSeed>,
  selectedThirds: string[],
  rounds: PredictedMatch[][],
  awards: PredictedAwards,
): BracketScore {
  const real = realGroupFacts();

  const predictedTopTwo: string[] = [];
  const predictedWinners: string[] = [];
  for (const [letter, s] of Object.entries(seeds)) {
    if (s.first) predictedTopTwo.push(`${letter}:${s.first}`);
    if (s.second) predictedTopTwo.push(`${letter}:${s.second}`);
    if (s.first) predictedWinners.push(s.first);
  }
  /* a qualifier counts only in the group it was actually in */
  const qualRight = predictedTopTwo.filter(tag => {
    const [letter, team] = [tag.slice(0, 1), tag.slice(2)];
    const realLetter = [...real.topTwo.entries()].find(([t]) => sameTeam(t, team))?.[1];
    return realLetter === letter;
  }).map(tag => tag.slice(2));
  const qualifiers: RoundScore = { right: qualRight.length, total: 24, points: qualRight.length * POINTS.qualifier, rightTeams: qualRight };
  const groupWinners = countRound(predictedWinners, [...real.winners], POINTS.groupWinner);
  const thirds = countRound(selectedThirds, [...real.thirds], POINTS.third);

  const teamsIn = (idx: number) => {
    const r = rounds[idx] || [];
    const out: string[] = [];
    for (const m of r) { if (m.teamA && m.teamA !== 'TBD') out.push(m.teamA); if (m.teamB && m.teamB !== 'TBD') out.push(m.teamB); }
    return out;
  };
  const r16 = countRound(teamsIn(1), wc2026TeamsInRound('r16'), POINTS.r16);
  const qf = countRound(teamsIn(2), wc2026TeamsInRound('qf'), POINTS.qf);
  const sf = countRound(teamsIn(3), wc2026TeamsInRound('sf'), POINTS.sf);
  const finalists = countRound(teamsIn(5), wc2026TeamsInRound('f'), POINTS.finalist);
  const picked = rounds[5]?.[0]?.winner || '';
  const championRight = sameTeam(picked, WC2026_CHAMPION);
  const champion = { picked, right: championRight, points: championRight ? POINTS.champion : 0 };

  const awardHit = (pick: string, real: string) => {
    if (!pick) return false;
    const n = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const p = n(pick), r = n(real);
    /* the pick lists use surnames or short names, the results the full name */
    return r === p || r.endsWith(' ' + p) || r.split(' ').includes(p) || p.endsWith(' ' + r);
  };
  const goldenBoot = awardHit(awards.goldenBoot, WC2026_AWARDS.goldenBoot.player);
  const goldenGlove = awardHit(awards.goldenGlove, WC2026_AWARDS.goldenGlove.player);
  const goldenBall = awardHit(awards.goldenBall, WC2026_AWARDS.goldenBall.player);
  const awardsScore = { goldenBoot, goldenGlove, goldenBall, points: [goldenBoot, goldenGlove, goldenBall].filter(Boolean).length * POINTS.award };

  const points = qualifiers.points + groupWinners.points + thirds.points + r16.points + qf.points + sf.points + finalists.points + champion.points + awardsScore.points;
  const empty = predictedTopTwo.length === 0 && teamsIn(1).length === 0 && !picked;
  return { qualifiers, groupWinners, thirds, r16, qf, sf, finalists, champion, awards: awardsScore, points, maxPoints: WC2026_MAX_POINTS, empty };
}

/** The real bracket, in the same round order the page draws, for a results view. */
export function realRounds(): PredictedMatch[][] {
  const order = ['r32', 'r16', 'qf', 'sf', 'tp', 'f'] as const;
  return order.map(r => WC2026_KNOCKOUT.filter(m => m.round === r).map(m => ({ teamA: m.team1, teamB: m.team2, winner: m.winner })));
}
