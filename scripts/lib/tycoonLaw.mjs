/**
 * Round 1532: the shared scoring law and the bonuses in seconds of income, as ONE
 * text patch of src/lib/stadiumTycoon.ts (brief-1532 design 3.3 and 3.4).
 *
 * Step 2a tunes the table on a patched copy in the OS temp folder (the controls'
 * own mechanism, never the file on disk). Step 2b lands this very text with the
 * tuned table (scripts/tuneTycoonScorelines.mjs --apply), so the engine that was
 * measured and the engine that ships cannot differ by a hand edit.
 *
 *   lawText(text, table)  the engine before the law -> the engine with it, every
 *                         anchor asserted present exactly once first. On a text
 *                         that already carries the law it only sets the table.
 *   setTable(text, table) rewrites SQUAD_POINTS and the ten rivalStrength values.
 *   tableOf(text)         reads them back.
 * A table is { sp, r: [R0, ..., R9] } in law points.
 */

const BLOCK_START = 'export const DIVISIONS: TycoonDivision[] = [';

function swapOnce(text, from, to, what) {
  const n = text.split(from).length - 1;
  if (n !== 1) throw new Error(`tycoonLaw: ${what}: expected exactly one ${JSON.stringify(from.slice(0, 70))}, found ${n}`);
  return text.replace(from, () => to);
}

const LEAGUE_MATCH_NO = `/**
 * The match count opponents are strengthened by. Until Round 582 it was the
 * career count, so every match was harder than the last forever, and under a
 * title-only league that turned into a wall: the review measured a club with a
 * squad of 3 never leaving the bottom league in 91 of 200 three hour runs, where
 * the old win count had promoted all 200, because a whole season has to be won
 * against rivals who kept getting stronger while it failed. A division's rivals
 * now play at the strength they had when its league was drawn, and every
 * division up is drawn later and is tougher, so the climb still steepens.
 */
export function leagueMatchNo(s: TycoonState): number {
  const base = s.league?.baseMatchNo;
  return Number.isFinite(base) ? Math.min(s.matchNo, base as number) : s.matchNo;
}

/** A rival's chance of scoring in one minute: today's baseline plus its offset. */
function rivalChancePerMin(st: TycoonState, c: LeagueClub): number {
  return Math.max(0.008, Math.min(0.14, 0.024 + leagueMatchNo(st) * 0.0011 + divisionOf(st).oppBoost + c.offset));
}
`;

const STRENGTH = `/* Round 1532: strength is counted in the points of the shared scoring law
 * (src/lib/season/law.ts, the law Club Manager scores with). Until this round a
 * rival's chance grew with the career match count and ours with the Squad alone,
 * so by minute fifteen a match was a timer, won 95 to 99 times in a hundred. Now
 * your side is the Squad, a rival is its division plus its own stored offset,
 * and the gap between the two sets both sides' expected goals. Nothing reads the
 * match count. */

/** Law points per Squad level: knob 1 of the Round 1532 tuning recipe. */
export const SQUAD_POINTS = 0.85;
/** A rival's stored offset (plus or minus OFFSET_SPREAD a minute) in law points. */
export const RIVAL_OFFSET_POINTS = 500;

/** Your side's strength: the Squad track. */
export function squadStrength(s: TycoonState): number {
  return levelOf(s, 'squad') * SQUAD_POINTS;
}

/** This division's average rival. The only reader of rivalStrength. */
export function divisionStrength(s: TycoonState): number {
  return divisionOf(s).rivalStrength;
}

/** One rival's strength: its division plus its own stored offset. */
function clubStrength(s: TycoonState, c: LeagueClub): number {
  return divisionStrength(s) + c.offset * RIVAL_OFFSET_POINTS;
}

/** Your strength minus today's opponent's, in law points. A carryover friendly
 *  and a save with no league meet a rival with offset 0. */
export function matchGap(s: TycoonState): number {
  return squadStrength(s) - divisionStrength(s) - currentOpponentOffset(s) * RIVAL_OFFSET_POINTS;
}

/** A rival's chance of scoring in one minute of a fixture you are not in: the
 *  law's expected goals against the other club at this venue, over ninety
 *  one roll minutes. */
export function rivalChancePerMin(st: TycoonState, c: LeagueClub, other: LeagueClub, venue: number): number {
  return goalLambda(clubStrength(st, c) - clubStrength(st, other), venue) / 90;
}
`;

const OLD_CHANCES = `/** Chance our toy team scores in one match minute. */
export function goalChancePerMin(s: TycoonState): number {
  const sq = levelOf(s, 'squad');
  return Math.min(0.16, 0.028 + sq * 0.0016);
}

/** Chance the opponent scores in one minute; opponents scale forever. */
export function oppChancePerMin(s: TycoonState, edge = 0): number {
  const sq = levelOf(s, 'squad');
  // Round 162: the division you climbed into shoots back. Promotion is a
  // real thing, not a bigger number with the same Sunday opposition.
  // Round 582: plus the strength of the league rival you are playing today.
  const opp = 0.024 + leagueMatchNo(s) * 0.0011 + divisionOf(s).oppBoost + currentOpponentOffset(s);
  // Your squad defends too: half its levels push the opponent back down.
  const base = Math.max(0.008, Math.min(0.14, opp - sq * 0.0008));
  const defence = Number.isFinite(edge) ? Math.max(0, Math.min(0.40, edge)) : 0;
  return Math.max(0.008, base * (1 - defence));
}

/** Bonus paid the moment we score: the crowd goes up as one. */
export function goalBonus(s: TycoonState): number {
  return Math.round(attendance(s) * 0.6 * repMult(s) * streakMult(s));
}
`;

const NEW_CHANCES = `/** Chance our team scores in one match minute. Round 1532: the shared law's
 *  expected goals for you at your ground (every watched match is at home,
 *  contract section 8), over ninety one roll minutes. */
export function goalChancePerMin(s: TycoonState): number {
  return goalLambda(matchGap(s), LAW.home) / 90;
}

/** Chance the opponent scores in one minute. Round 1532: the law's expected
 *  goals for today's rival as the away side; every division up sends stronger
 *  rivals, and a stronger Squad pushes their share down as it pushes yours up. */
export function oppChancePerMin(s: TycoonState, edge = 0): number {
  // Round 586: the first team's edge takes exactly its share off the rival's
  // expected goals, with no floor after it, so every step of it counts.
  const defence = Number.isFinite(edge) ? Math.max(0, Math.min(0.40, edge)) : 0;
  return goalLambda(-matchGap(s), LAW.away) * (1 - defence) / 90;
}

/** Round 1532: the law's numbers the rules quote, so the page never imports the
 *  law itself: each side's expected goals when the two are level (you at home),
 *  and the expected goals one Squad level moves, to two decimals. */
export function scoringFacts(): { evenFor: number; evenAgainst: number; levelGoals: number } {
  const r2 = (x: number) => Math.round(x * 100) / 100;
  return { evenFor: r2(goalLambda(0, LAW.home)), evenAgainst: r2(goalLambda(0, LAW.away)), levelGoals: r2(SQUAD_POINTS * LAW.perPoint) };
}

/** Round 1532: a goal, a win and a promotion pay seconds of the club's own
 *  income, so they are worth the same at every stage of a run. They used to
 *  scale with the crowd, which stops growing when the ground is full, and by
 *  two hours a win paid a fraction of a second. */
export const GOAL_BONUS_SEC = 5;
export const WIN_BONUS_SEC = 20;
export const PROMOTION_BONUS_SEC = 120;

/** Income with no Matchday Hype and no golden whistle: what away pay and every
 *  match bonus are counted in. */
export function unboostedIncomePerSec(s: TycoonState): number {
  return incomePerSec({ ...s, boostLeftSec: 0, goldenLeftSec: 0, goldenKind: null });
}

/** Bonus paid the moment we score: the crowd goes up as one. */
export function goalBonus(s: TycoonState): number {
  return Math.round(unboostedIncomePerSec(s) * GOAL_BONUS_SEC);
}
`;

const EDITS = [
  ['the law import', "import { roundRobinCalendar, tableOrder, mulberry32, hash32 } from '@/lib/leagueCore';\n",
    "import { roundRobinCalendar, tableOrder, mulberry32, hash32 } from '@/lib/leagueCore';\nimport { goalLambda, LAW } from '@/lib/season/law';\n"],
  ['the division field', '  /** Opponents up here are better, permanently. */\n  oppBoost: number;\n',
    "  /** Round 1532: this division's average rival, in the scoring law's points.\n   *  Strictly rising: every division up sends stronger rivals. */\n  rivalStrength: number;\n"],
  ['the ladder comment', BLOCK_START,
    '/* Round 1532: rivalStrength is tuned by the recipe of brief-1532 design 3.5,\n * never set by feel. Division 0 is knob 4; division d above it is\n * round(SQUAD_POINTS x A_d) - ARRIVAL_EDGE, where A_d is the Squad a club that\n * kept pace had when it was promoted into d before the law\n * (scripts/data/tycoonScorelineBaseline.json) and ARRIVAL_EDGE is knob 3, measured\n * by scripts/tuneTycoonScorelines.mjs into scripts/data/tycoonScorelineTuning.json. */\n'
    + BLOCK_START],
  ['the baseMatchNo comment', "  /** Round 582 review: the career match count when this division's league was\n   *  drawn. Its rivals play at that strength for as long as you chase the title,\n   *  so a club that could compete on arrival can always win it eventually. */\n",
    "  /** Round 582 review: the career match count when this division's league was\n   *  drawn. Since Round 1532 no chance reads it, but it is still written, so a\n   *  rollback to an older build plays these rivals at the strength they were\n   *  drawn at rather than at the career count. */\n"],
  ['leagueMatchNo and the rival chance', LEAGUE_MATCH_NO, STRENGTH],
  ['the home fixture', '    const ph = rivalChancePerMin(st, clubs[h]);\n    const pa = rivalChancePerMin(st, clubs[a]);\n',
    '    const ph = rivalChancePerMin(st, clubs[h], clubs[a], LAW.home);\n    const pa = rivalChancePerMin(st, clubs[a], clubs[h], LAW.away);\n'],
  ['the Summit pay', '    const pay = Math.round(attendance(st) * 8 * d.incomeMult * repMult(st));\n',
    '    const pay = Math.round(unboostedIncomePerSec(st) * PROMOTION_BONUS_SEC);\n'],
  ['the promotion pay', '  const pay = Math.round(attendance(st) * 8 * nd.incomeMult * repMult(st));\n',
    '  const pay = Math.round(unboostedIncomePerSec({ ...st, league: next }) * PROMOTION_BONUS_SEC);\n'],
  ['the chances and the goal bonus', OLD_CHANCES, NEW_CHANCES],
  ['the win bonus', '  return Math.round(attendance(s) * 2.2 * repMult(s));\n', '  return Math.round(unboostedIncomePerSec(s) * WIN_BONUS_SEC);\n'],
  ['away pay', '  return Math.round(incomePerSec({ ...s, boostLeftSec: 0, goldenLeftSec: 0, goldenKind: null }) * capped * offlineRateOf(s));\n',
    '  return Math.round(unboostedIncomePerSec(s) * capped * offlineRateOf(s));\n'],
];

const lf = text => text.split('\r\n').join('\n');
export const hasLaw = text => lf(text).includes('export const SQUAD_POINTS = ');

function divisionsBlock(text) {
  const a = text.indexOf(BLOCK_START);
  const b = a < 0 ? -1 : text.indexOf('\n];\n', a);
  if (a < 0 || b < 0) throw new Error('tycoonLaw: cannot find the DIVISIONS block');
  return [a, b];
}

/** Rewrite SQUAD_POINTS and the ten rivalStrength values. */
export function setTable(text, table) {
  let t = lf(text);
  if (!Array.isArray(table.r) || table.r.length !== 10 || !table.r.every(Number.isFinite)) throw new Error('tycoonLaw: a table needs ten finite rivalStrength values');
  for (let i = 1; i < 10; i += 1) if (!(table.r[i] > table.r[i - 1])) throw new Error(`tycoonLaw: rivalStrength must rise strictly, ${table.r.join(' ')}`);
  if (!(table.sp > 0)) throw new Error('tycoonLaw: SQUAD_POINTS must be positive');
  const spLine = /export const SQUAD_POINTS = [0-9.]+;/;
  if (!spLine.test(t)) throw new Error('tycoonLaw: no SQUAD_POINTS line');
  t = t.replace(spLine, `export const SQUAD_POINTS = ${table.sp};`);
  const [a, b] = divisionsBlock(t);
  let k = 0;
  const block = t.slice(a, b).replace(/rivalStrength: -?[0-9.]+ \}/g, () => `rivalStrength: ${table.r[k++]} }`);
  if (k !== 10) throw new Error(`tycoonLaw: found ${k} rivalStrength rows, not 10`);
  return t.slice(0, a) + block + t.slice(b);
}

/** Read the table back out of a lib that carries the law. */
export function tableOf(text) {
  const t = lf(text);
  const sp = Number((t.match(/export const SQUAD_POINTS = ([0-9.]+);/) ?? [])[1]);
  const [a, b] = divisionsBlock(t);
  const r = [...t.slice(a, b).matchAll(/rivalStrength: (-?[0-9.]+) \}/g)].map(m => Number(m[1]));
  return { sp, r };
}

/** The engine before Round 1532 -> the engine with the law, then the table set. */
export function lawText(text, table) {
  let t = lf(text);
  if (!hasLaw(t)) {
    for (const [what, from, to] of EDITS) t = swapOnce(t, from, to, what);
    const [a, b] = divisionsBlock(t);
    const block = t.slice(a, b);
    const rows = block.split('oppBoost: ').length - 1;
    if (rows !== 10) throw new Error(`tycoonLaw: expected ten oppBoost rows, found ${rows}`);
    t = t.slice(0, a) + block.split('oppBoost: ').join('rivalStrength: ') + t.slice(b);
    if (t.includes('oppBoost') || t.includes('leagueMatchNo')) throw new Error('tycoonLaw: a reader of oppBoost or leagueMatchNo survived the patch');
  }
  return setTable(t, table);
}

/** Design 3.5: rivalStrength[d] = round(sp x A_d) - ae for d 1 to 9, forced strictly rising above r0. */
export function ladder(sp, A, ae, r0) {
  const r = [r0];
  for (let d = 1; d <= 9; d += 1) r.push(Math.max(Math.round(sp * A[d]) - ae, r[d - 1] + 1));
  return r;
}
