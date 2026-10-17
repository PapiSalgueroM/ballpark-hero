/**
 * Round 1335: Club Manager's board reads the season you had.
 *
 * Pure: nothing imported at runtime, no draw, no clock, nothing at module scope but literals. The engine
 * (src/lib/clubManager.ts) makes the legacy choice at each call site (legacySeason), so under the old
 * rules none of this is ever called and the old engine is exactly what it was.
 *
 * scripts/simCmBoardVerdict.mjs holds every rule here (section pure over full grids, and the fleets),
 * and src/lib/clubManagerBoardVerdict.test.ts holds the hunt's five cases as literals.
 */

/** The opening every career had before this round, kept for the switch, Manager Hot Seat and the kits. */
export const LEGACY_BOARD_START = 60;
/** The opening every new job (a move, a takeover, an application's yes) had before this round. */
export const LEGACY_NEW_JOB_BOARD = 62;
/** clubManagerMeters.ts's BOARD_SAFE, copied: importing it would pull the engine in at runtime.
 *  simCmBoardVerdict section pure holds the two equal (control safeline). */
export const BOARD_SAFE_LINE = 60;

/**
 * The opening of a new appointment: your first job, a move at the summer, a mid season takeover and an
 * application that said yes. BOARD_SAFE_LINE plus the 95th percentile of the board's fall on a fresh
 * career's first competitive match when that match is lost, rounded up, so one bad night leaves a new
 * manager Safe nineteen times in twenty.
 * Recipe (step 0, remote check r1335-s0 on d4f2c6f6, simCmBoardVerdict --part=measure MEASURE=falls):
 * 3200 fresh careers (four clubs a tier in each of the five worlds, 40 seeds each), 990 lost openers, all
 * league matches; the fall: tier 1 p95 8.5, tier 2 8.5, tier 3 7.2, tier 4 5.5; pooled median 5.5, p90 7.5,
 * p95 8.5, so 60 + 8.5 rounded up is 69. A tier 1 opener lands at about 60.5, a tier 4 one near 63.5.
 */
export const BOARD_FRESH = 69;

/**
 * The summer cheque of a club that stays never passes this share of its usual budget (or 10m, the old
 * floor). The smallest multiple of 0.05 at or above the 99th percentile of the flat allocation over the
 * budget across the tier 1 and tier 2 rollovers of the title and promotion fleets, so it binds on a small club's one
 * good year and almost never on a big club.
 * Recipe (step 0, remote check r1335-s0 on d4f2c6f6, MEASURE=rollover): 298 tier 1 and 2 staying rollovers,
 * flat over budget p99 1.68, so 1.7. Tier 3 p99 3.22 and tier 4 p99 7.0: at 1.7 the band binds 0 of 281
 * tier 1, 0 of 17 tier 2, 25 of 56 tier 3 (10 with a trophy) and 77 of 137 tier 4 (39 with a trophy).
 */
export const KITTY_TOP_SHARE = 1.7;

export type SeasonFate = 'up' | 'down' | 'escape';
export type BoardGrade = 'A' | 'B' | 'C' | 'D' | 'F';
/** Why a season got its grade: the kinds with lines of their own here, or the grade itself. */
export type VerdictKind = 'title' | 'silver' | 'over' | 'up' | 'escape' | 'down' | 'B' | 'C' | 'D' | 'F';

/** The five specific board asks of Round 474 (clubManagerBoardAsks.ts). */
const BOARD_ASK_IDS = ['natQuota', 'veterans', 'posGap', 'youngStar', 'marquee'];

/** The season's main demand (the title, a top four, promotion, survival) weighs three times a side ask,
 *  a board ask half of one, anything else (and an entry with no id) one. */
export function objectiveWeight(id: string | undefined): number {
  if (id === 'league') return 3;
  if (id !== undefined && BOARD_ASK_IDS.includes(id)) return 0.5;
  return 1;
}

const ORDER: BoardGrade[] = ['A', 'B', 'C', 'D', 'F'];
const atLeast = (g: BoardGrade, floor: BoardGrade): BoardGrade => (ORDER.indexOf(g) > ORDER.indexOf(floor) ? floor : g);
const atMost = (g: BoardGrade, cap: BoardGrade): BoardGrade => (ORDER.indexOf(g) < ORDER.indexOf(cap) ? cap : g);

/**
 * The grade with the season's fate. First the ladder every season had (a Champions League, the league or
 * two trophies, or three places above expectation is an A; at or above expectation or a trophy a B; then
 * C, D and F at three and six places short), then: going up is at least a B, going down at most a C (a B
 * with a trophy), and staying up against the odds keeps its grade with a line of its own.
 */
export function seasonGrade(i: { position: number; expectation: number; trophies: number; europeWon: boolean; fate: SeasonFate | null }): { grade: BoardGrade; kind: VerdictKind } {
  const overshoot = i.expectation - i.position;
  let grade: BoardGrade;
  if (i.europeWon || i.position === 1 || overshoot >= 3 || i.trophies >= 2) grade = 'A';
  else if (overshoot >= 0 || i.trophies >= 1) grade = 'B';
  else if (overshoot >= -3) grade = 'C';
  else if (overshoot >= -6) grade = 'D';
  else grade = 'F';
  if (i.fate === 'up') return { grade: atLeast(grade, 'B'), kind: 'up' };
  if (i.fate === 'down') return { grade: atMost(grade, i.trophies >= 1 ? 'B' : 'C'), kind: 'down' };
  if (i.fate === 'escape') return { grade, kind: 'escape' };
  if (grade !== 'A') return { grade, kind: grade };
  return { grade, kind: i.europeWon || i.position === 1 ? 'title' : i.trophies >= 2 ? 'silver' : 'over' };
}

/** The board's lines for the kinds that have their own. A title or two trophies read the engine's own A
 *  lines, and every other season its grade's lines, exactly as before. {league} is filled by the engine. */
export const VERDICT_LINES: Record<'over' | 'up' | 'escape' | 'down', readonly [string, string]> = {
  over: [
    'Nobody saw that coming. The board has had to rewrite its expectations.',
    'Miles past what anyone asked of this squad. The fans are dreaming now.',
  ],
  up: [
    'Up to {league}. The board is delighted and the fans are planning away days.',
    'Promoted to {league}. That is the season the board asked for.',
  ],
  escape: [
    'Everyone had you going down and you stayed up. The board will not forget it.',
    'Survival nobody predicted. The fans sang your name all the way home.',
  ],
  down: [
    'Down to {league}. The board is hurting and so are the fans.',
    'Relegated to {league}. The board wants to come straight back up.',
  ],
};

/** A line with its league filled in. */
export function fillLeague(line: string, league: string): string {
  return line.replace('{league}', league);
}

/**
 * Next season's opening when the manager stays. 55, plus 1.5 a place above what the club he played for was
 * expected to do, plus 2 for each objective hit and minus 2 for each missed (times its weight), plus or minus 3
 * for each promise to the board. Then the verdict's band: an A or a B opens at least at BOARD_FRESH, a D or
 * an F under BOARD_SAFE_LINE, a C where the sum puts it; nothing under 35 or over 82.
 */
export function openingConfidence(i: { grade: BoardGrade; playedExpectation: number; finish: number; objectives: { id?: string; hit: boolean }[]; promiseNet: number }): number {
  const objNet = i.objectives.reduce((n, o) => n + objectiveWeight(o.id) * (o.hit ? 1 : -1), 0);
  let v = 55 + (i.playedExpectation - i.finish) * 1.5 + objNet * 2 + i.promiseNet * 3;
  if (i.grade === 'A' || i.grade === 'B') v = Math.max(v, BOARD_FRESH);
  else if (i.grade === 'D' || i.grade === 'F') v = Math.min(v, BOARD_SAFE_LINE - 1);
  return Math.max(35, Math.min(82, v));
}

/** The summer cheque of a club that stays: the flat formula it always had, never past KITTY_TOP_SHARE of
 *  its usual budget (or 10m). The carry rule after it is the engine's and is unchanged. */
export function kittyAllocation(i: { budget: number; expectation: number; finish: number; trophies: number }): number {
  const flat = Math.max(10, Math.round(i.budget + (i.expectation - i.finish) * 2 + i.trophies * 12));
  return Math.min(flat, Math.max(10, Math.floor(KITTY_TOP_SHARE * i.budget)));
}

/** A club may call a manager at most one tier above his own club (TIER_INFO, 1 Elite to 4 Underdogs), two
 *  after the league title or the Champions League; the same tier abroad stays allowed. The game's rule. */
export function offerStepOk(myTier: number, theirTier: number, bigSeason: boolean): boolean {
  return theirTier >= myTier - (bigSeason ? 2 : 1);
}
