import { writeFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { initCfb, simCfbRound } from '@/lib/cfbDynasty';

const FIRST_SEED = 539004;
const SEED_STEP = 7919;
const SEASONS = 192;
const DISCOVERY_SEASONS = 128;
const WEEKS = 12;
const GAMES_PER_WEEK = 22;
const FIRST_BUCKET_END = 0.04;
const RATE_STEPS_PER_UNIT = 2000;

type ScoreCounts = { zero: number; one: number; two: number };
type GameRow = [home: string, away: string, hs: number, as: number, winner: string];
type BucketRow = [draw: number, loserScore: number];

function scoreCounts(): ScoreCounts {
  return { zero: 0, one: 0, two: 0 };
}

function countScore(counts: ScoreCounts, score: number) {
  if (score === 0) counts.zero += 1;
  if (score === 1) counts.one += 1;
  if (score === 2) counts.two += 1;
}

function sampleSeason(seed: number, split: 'discovery' | 'holdout') {
  let rngState = seed;
  let draws: number[] = [];
  const rng = () => {
    rngState = (Math.imul(rngState, 1664525) + 1013904223) >>> 0;
    const value = rngState / 4294967296;
    draws.push(value);
    return value;
  };
  const state = initCfb('ALA', rng, { depth: true });
  const kickoffDraws = draws.length;
  const rounds = Array.from({ length: WEEKS }, (_, i) => {
    state.round = i + 1;
    draws = [];
    const slate = state.slate?.rounds[i] ?? [];
    const { games } = simCfbRound(state, rng);
    return {
      round: state.round,
      slate,
      games: games.map(({ home, away, hs, as, winner }): GameRow => [home, away, hs, as, winner]),
      draws,
    };
  });
  return { seed, split, kickoffDraws, rounds };
}

type Sample = ReturnType<typeof sampleSeason>;

function measure(samples: Sample[]) {
  const result = {
    seasons: samples.length, rounds: 0, games: 0, kickoffDraws: 0, roundDraws: 0,
    scoreCounts: scoreCounts(), loserScores: scoreCounts(),
    homeWinners: 0, awayWinners: 0, tiedScores: 0, scoreWinnerConflicts: 0,
    invalidScores: 0, slateMismatches: 0, drawMismatches: 0, missingLoserDraws: 0,
  };
  const bucket: BucketRow[] = [];
  for (const sample of samples) {
    result.kickoffDraws += sample.kickoffDraws;
    for (const week of sample.rounds) {
      result.rounds += 1;
      result.games += week.games.length;
      result.roundDraws += week.draws.length;
      if (week.draws.length !== 3 * week.games.length || week.draws.some(draw => !(draw >= 0 && draw < 1))) {
        result.drawMismatches += 1;
      }
      if (week.games.length !== GAMES_PER_WEEK || week.slate.length !== GAMES_PER_WEEK ||
        week.games.some(([home, away], i) => week.slate[i]?.[0] !== home || week.slate[i]?.[1] !== away)) {
        result.slateMismatches += 1;
      }
      for (const [i, [home, away, hs, as, winner]] of week.games.entries()) {
        countScore(result.scoreCounts, hs);
        countScore(result.scoreCounts, as);
        if (!Number.isInteger(hs) || hs < 0 || !Number.isInteger(as) || as < 0) result.invalidScores += 1;
        if (hs === as) result.tiedScores += 1;
        const homeWon = winner === home;
        const awayWon = winner === away;
        if (homeWon) result.homeWinners += 1;
        if (awayWon) result.awayWinners += 1;
        if (!(homeWon && hs > as) && !(awayWon && as > hs)) result.scoreWinnerConflicts += 1;
        if (!homeWon && !awayWon) continue;
        const loserScore = homeWon ? as : hs;
        countScore(result.loserScores, loserScore);
        // The slate consumes no round draw. Each game takes winner, home score,
        // then away score. Reuse the observed loser's draw without asking rng.
        const loserDraw = week.draws[3 * i + (homeWon ? 2 : 1)];
        if (loserDraw === undefined) {
          result.missingLoserDraws += 1;
        } else if (loserDraw >= 0 && loserDraw < FIRST_BUCKET_END) {
          bucket.push([loserDraw, loserScore]);
        }
      }
    }
  }
  return { result, bucket };
}

function bucketCounts(rows: BucketRow[], upperExclusive: number, games: number) {
  const scores = scoreCounts();
  let draws = 0;
  for (const [draw, loserScore] of rows) {
    if (draw >= upperExclusive) continue;
    draws += 1;
    countScore(scores, loserScore);
  }
  return { draws, rate: draws / games, scores, otherScores: draws - scores.zero - scores.one - scores.two };
}

it('measures the held low-score baseline on discovery and holdout seasons', () => {
  const seasons = Array.from({ length: SEASONS }, (_, i) => sampleSeason(
    FIRST_SEED + i * SEED_STEP, i < DISCOVERY_SEASONS ? 'discovery' : 'holdout',
  ));
  const discovery = measure(seasons.slice(0, DISCOVERY_SEASONS));
  const zeroRate = discovery.result.loserScores.zero / discovery.result.games;
  const rate = Math.round(zeroRate * RATE_STEPS_PER_UNIT) / RATE_STEPS_PER_UNIT;
  const holdout = measure(seasons.slice(DISCOVERY_SEASONS));
  const summary = (sample: ReturnType<typeof measure>) => ({
    ...sample.result,
    firstBucket: bucketCounts(sample.bucket, FIRST_BUCKET_END, sample.result.games),
    sameDrawLowerTail: bucketCounts(sample.bucket, rate, sample.result.games),
  });
  const raw = {
    schema: 1, report: 'R0004',
    fixture: { firstSeed: FIRST_SEED, seedStep: SEED_STEP, seasons: SEASONS, discoverySeasons: DISCOVERY_SEASONS,
      holdoutSeasons: SEASONS - DISCOVERY_SEASONS, weeks: WEEKS, gamesPerWeek: GAMES_PER_WEEK, kickoffTeam: 'ALA' },
    candidate: { discoveryZeroRate: zeroRate, quantum: 1 / RATE_STEPS_PER_UNIT, rate,
      lowerInclusive: 0, upperExclusive: rate, diagnosticLoserDraw: 0.03 },
    discovery: summary(discovery), holdout: summary(holdout), seasons,
  };
  const file = process.env.CFB_DYNASTY_LOW_SCORE_CALIBRATION_RAW;
  if (file) writeFileSync(file, JSON.stringify(raw) + '\n');

  for (const cohort of [raw.discovery, raw.holdout]) {
    expect(cohort.rounds).toBe(cohort.seasons * WEEKS);
    expect(cohort.games).toBe(cohort.rounds * GAMES_PER_WEEK);
    expect(cohort.roundDraws).toBe(3 * cohort.games);
    expect(cohort.homeWinners + cohort.awayWinners).toBe(cohort.games);
    expect([cohort.tiedScores, cohort.scoreWinnerConflicts, cohort.invalidScores,
      cohort.slateMismatches, cohort.drawMismatches, cohort.missingLoserDraws]).toEqual([0, 0, 0, 0, 0, 0]);
  }
  expect(raw.discovery.loserScores.zero).toBeGreaterThan(0);
  expect(rate).toBeLessThanOrEqual(raw.candidate.diagnosticLoserDraw);
}, 120_000);
