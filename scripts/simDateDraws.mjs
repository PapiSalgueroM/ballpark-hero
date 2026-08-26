/**
 * Round 224 harness (number 91): every remaining date-seeded draw on the
 * site, measured, and the broken half replaced.
 *
 * Round 223 caught the pattern on the two biggest offenders: multiplying
 * the raw 8-digit date by 1103515245 passes 2 to the 53rd, the float
 * rounds its low bits away, and the modulo afterwards can only land on a
 * sliver of the pool. This round swept the REST of the site for the same
 * shape and measured all thirteen carriers over a simulated year before
 * touching anything. The verdicts, measured with real pool sizes:
 *
 *   BROKEN, fixed this round (moved onto dailyDraw/shuffledRange labels):
 *   - Grade the Transfer: reached 81 of its 800 fetched cases in a year,
 *     719 curated cases could never appear at all
 *   - Ball IQ: the first 400-point question came from the same NINE of
 *     72 clues all year, and the 600/800/1000 slots from half their tiers
 *   - Emoji Guess: the two easy slots could only ever show 3 of the 24
 *     easy puzzles, the same handful every day for a year
 *   - Mystery Box: each pack slot circled a sliver of its tier bucket
 *     (tier SEQUENCES were fine at 345 of 365 distinct, the per-slot
 *     player pick was not)
 *
 *   ADEQUATE, fenced as-is, not rewritten:
 *   - The seven Higher/Lower games (nba, mlb, tennis, cfb, f1, golf,
 *     hockey): their generator iterates with a 31-bit mask, which loses
 *     low bits too, but measured over a year every full board was
 *     distinct and the first pair repeated on at most one day. Damaged
 *     variety (257 to 319 distinct first pairs of 365, uniform gives
 *     about 330 to 355), not broken boards. Rewriting would reshuffle
 *     seven games' dailies for marginal gain.
 *   - Sports Quiz Board's category pick: the splice loop shrinks the pool
 *     each draw, which changes the modulus and un-collapses the walk;
 *     full category coverage, at most one identical day a year.
 *
 * The fence: year-long behaviour floors for the four fixes through the
 * REAL exported functions, a faithful-copy measurement of the HL shuffle
 * with fingerprints so the copy cannot silently diverge from the hooks,
 * and a site-wide allowlist for the overflow constant so it can never
 * spread to a new call site unmeasured.
 *
 * Live-data sections skip LOUDLY IN CAPITALS when Supabase is
 * unreachable, same honesty rule as simGridCells.
 *
 * Run: node scripts/simDateDraws.mjs
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { build } from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENTRY = "/tmp/datedraws-entry.mjs";
const OUT = "/tmp/datedraws.mjs";

writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const du = await import('${ROOT}/src/lib/dateUtils.ts');
export const grade = await import('${ROOT}/src/hooks/useGradeTransfer.ts');
export const emoji = await import('${ROOT}/src/hooks/useEmojiGuess.ts');
export const ballIq = await import('${ROOT}/src/hooks/useBallIq.ts');
export const mystery = await import('${ROOT}/src/hooks/useMysteryBox.ts');
export const emojiData = await import('${ROOT}/src/data/emojiPuzzles.ts');
export const quiz = await import('${ROOT}/src/lib/fetchQuizBoard.ts');
export const grades = await import('${ROOT}/src/lib/fetchTransferGrades.ts');
export { nbaHLPlayers } from '${ROOT}/src/data/nbaHLPlayers.ts';
export { mlbHLPlayers } from '${ROOT}/src/data/mlbHLPlayers.ts';
export { tennisHLPlayers } from '${ROOT}/src/data/tennisHLPlayers.ts';
export { cfbHLPlayers } from '${ROOT}/src/data/cfbHLPlayers.ts';
export { f1HLDrivers } from '${ROOT}/src/data/f1HLDrivers.ts';
export { golfLegends } from '${ROOT}/src/data/golfLegends.ts';
export { hockeyHLPlayers } from '${ROOT}/src/data/hockeyHLPlayers.ts';
export { aflGoalKickers } from '${ROOT}/src/data/aflGoalKickers.ts';
`);
await build({
  entryPoints: [ENTRY], bundle: true, format: "esm", platform: "node",
  outfile: OUT, logLevel: "error", alias: { "@": path.join(ROOT, "src") },
});
const mods = await import(pathToFileURL(OUT).href);
const { du } = mods;

let failures = 0;
const fail = m => { failures += 1; console.error("  FAIL: " + m); };
const days = Array.from({ length: 365 }, (_, d) =>
  new Date(Date.UTC(2026, 0, 1) + d * 86_400_000).toISOString().slice(0, 10));

/* ------------------------------------------- 1. Grade the Transfer, live */
console.log("1) Grade the Transfer deals the whole bank now");
{
  let pool = null;
  try {
    pool = await Promise.race([
      mods.grades.fetchTransferGrades(),
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 60000)),
    ]);
    if (pool && pool.length < 50) pool = null;
  } catch { pool = null; }
  if (!pool) {
    console.log("   SKIPPED, SUPABASE UNREACHABLE. THE TRANSFER BANK WAS NOT CHECKED.");
  } else {
    const seen = new Set();
    let prev = null, newSum = 0, ident = 0;
    for (const dt of days) {
      const picked = mods.grade.pickDaily(pool, dt);
      if (picked.length !== 5) { fail(`dealt ${picked.length} cases on ${dt}`); break; }
      const names = picked.map(c => c.playerName + "|" + c.moveYear);
      if (new Set(names).size !== 5) fail(`${dt}: a case repeated on one board`);
      const again = mods.grade.pickDaily(pool, dt).map(c => c.playerName + "|" + c.moveYear);
      if (names.join() !== again.join()) { fail(`not deterministic on ${dt}`); break; }
      names.forEach(n => seen.add(n));
      const key = [...names].sort().join("|");
      if (prev) {
        if (key === prev.key) ident += 1;
        newSum += names.filter(n => !prev.set.has(n)).length;
      }
      prev = { key, set: new Set(names) };
    }
    /* floors halfway between uniform (about 700 reached of 760, 4.97 new
       a day) and the measured broken values (81 reached, 4.62 new) */
    if (seen.size < 400) fail(`reached only ${seen.size} of ${pool.length} cases in a year (uniform: about 700, the old walk: 81)`);
    if (ident > 0) fail(`dealt an identical board on consecutive days ${ident} time(s)`);
    if (newSum / 364 < 4.8) fail(`turns over ${(newSum / 364).toFixed(2)} of 5 cases a day`);
    console.log(`   ${pool.length} cases fetched, ${seen.size} reached in a year, ${(newSum / 364).toFixed(2)}/5 fresh a day`);

    /* Round 225: move years are dated by the selling club's last season,
       which the famous moves prove out. These exact rows regressed once
       (Neymar's Santos to Barcelona was shown as 2015), so they are
       pinned: a pool rebuild that drifts the dating rule goes red here.
       Winter-window moves stay ambiguous by a few weeks in yearly
       snapshot data; these five are all summer moves and exact. */
    const PINNED = [
      ["Neymar", "Santos FC", "FC Barcelona", 2013],
      ["Neymar", "FC Barcelona", "Paris Saint-Germain", 2017],
      ["Eden Hazard", "LOSC Lille", "Chelsea FC", 2012],
      ["Erling Haaland", "Borussia Dortmund", "Manchester City", 2022],
      ["Jude Bellingham", "Birmingham City", "Borussia Dortmund", 2020],
    ];
    for (const [who, from, to, year] of PINNED) {
      const hit = pool.find(c => c.playerName === who && c.fromClub === from && c.toClub === to);
      if (!hit) fail(`pinned move missing from the pool: ${who} ${from} to ${to}`);
      else if (hit.moveYear !== year) fail(`${who} ${from} to ${to} is dated ${hit.moveYear}, the real year is ${year}`);
    }
    console.log(`   ${PINNED.length} famous moves pinned to their real years`);

    /* Round 230: merged-identity blobs are excluded at the source. These
       names are the poster children (the pool once carried a Fernandinho
       "Atletico Mineiro to Manchester City" move that never happened);
       any row for them means the taint rule fell out of the rebuild. */
    for (const ghost of ["Paulinho", "Fernandinho", "Marcelo", "Robinho"]) {
      const rows = pool.filter(c => c.playerName === ghost && c.nationality === "Brazil");
      if (rows.length) fail(`${ghost} (Brazil) is back in the pool with ${rows.length} row(s); the merged-identity exclusion is gone`);
    }
    console.log("   4 merged-identity ghosts confirmed out");
  }
}

/* ------------------------------------------------- 2. Emoji Guess, static */
console.log("2) Emoji Guess reaches its whole bank");
{
  const byDiff = { easy: 0, medium: 0, hard: 0 };
  for (const p of mods.emojiData.EMOJI_PUZZLES) byDiff[p.difficulty] += 1;
  const seen = new Set();
  let prev = null, ident = 0;
  for (const dt of days) {
    const picked = mods.emoji.pickDaily(dt);
    if (picked.length !== 5) { fail(`dealt ${picked.length} puzzles on ${dt}`); break; }
    if (new Set(picked.map(p => p.id)).size !== 5) fail(`${dt}: a puzzle repeated on one board`);
    picked.forEach(p => seen.add(p.id));
    const key = picked.map(p => p.id).sort().join("|");
    if (prev !== null && key === prev) ident += 1;
    prev = key;
  }
  const bank = mods.emojiData.EMOJI_PUZZLES.length;
  /* a year of 5-a-day from a 64 bank reaches essentially all of it under a
     uniform draw; the old walk pinned the two easy slots to 3 of 24 */
  if (seen.size < bank - 4) fail(`reached ${seen.size} of ${bank} puzzles in a year, part of the bank is starved`);
  if (ident > 0) fail(`dealt an identical five on consecutive days ${ident} time(s)`);
  console.log(`   bank of ${bank} (${byDiff.easy}/${byDiff.medium}/${byDiff.hard} by difficulty), ${seen.size} reached, ${ident} identical days`);
}

/* ---------------------------------------------------- 3. Ball IQ, live */
console.log("3) Ball IQ's twelve slots each roam their whole tier");
{
  let clues = null;
  try {
    clues = await Promise.race([
      mods.quiz.fetchQuizBoardClues(),
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 60000)),
    ]);
    if (clues && clues.length < 50) clues = null;
  } catch { clues = null; }
  if (!clues) {
    console.log("   SKIPPED, SUPABASE UNREACHABLE. THE CLUE BANK WAS NOT CHECKED.");
  } else {
    /* slot 0's tier is the 200s; measure the first slot of each value */
    const RAMP = [200, 400, 600, 800, 1000];
    for (const value of RAMP) {
      const tier = clues.filter(c => c.value === value);
      if (tier.length < 6) { fail(`the ${value} tier holds only ${tier.length} clues`); continue; }
      const qi = { 200: 0, 400: 3, 600: 6, 800: 8, 1000: 10 }[value];
      const seen = new Set();
      for (const dt of days) seen.add(du.dailyDraw(tier.length, `ball-iq:${dt}:q${qi}`));
      const uniform = tier.length * (1 - Math.pow(1 - 1 / tier.length, 365));
      if (seen.size < uniform * 0.6) {
        fail(`the ${value} tier's first slot reached ${seen.size} of ${tier.length} clues in a year (uniform: about ${Math.round(uniform)}, the old walk: about 12)`);
      }
      console.log(`   ${value} tier: ${tier.length} clues, first slot reached ${seen.size} across a year`);
    }
    /* and a dealt day is deterministic and 12 questions long */
    const q1 = mods.ballIq.buildQuestion(clues[0], clues, "ball-iq:2026-07-04:q0");
    const q2 = mods.ballIq.buildQuestion(clues[0], clues, "ball-iq:2026-07-04:q0");
    if (JSON.stringify(q1.options) !== JSON.stringify(q2.options)) fail("buildQuestion is not deterministic for one label");
    if (q1.options.length < 2) fail("buildQuestion produced fewer than 2 options for a healthy clue");
    if (!q1.options.includes(clues[0].answer)) fail("buildQuestion lost the correct answer from its options");
  }
}

/* ------------------------------------------------- 4. Mystery Box slots */
console.log("4) Mystery Box tier sequences and per-slot rolls");
{
  /* tier sequence variety through the REAL exported tierFor */
  const seqs = new Set();
  let prev = null, ident = 0;
  for (const dt of days) {
    const seq = Array.from({ length: 15 }, (_, i) => mods.mystery.tierFor(dt, i)).join(",");
    if (seq !== Array.from({ length: 15 }, (_, i) => mods.mystery.tierFor(dt, i)).join(",")) { fail("tierFor is not deterministic"); break; }
    if (prev !== null && seq === prev) ident += 1;
    prev = seq; seqs.add(seq);
  }
  if (seqs.size < 350) fail(`only ${seqs.size} distinct tier sequences in 365 days`);
  if (ident > 0) fail(`identical pack-tier day ${ident} time(s)`);
  /* per-slot roll coverage for a bucket of 130 (the superstar bucket size
     the hook's own comment quotes) */
  const seen = new Set();
  for (const dt of days) seen.add(du.dailyDraw(130, `mystery-box:${dt}:pick:0`));
  const uniform = 130 * (1 - Math.pow(1 - 1 / 130, 365));
  if (seen.size < uniform * 0.6) fail(`slot 0 reached ${seen.size} of a 130 bucket in a year (uniform: about ${Math.round(uniform)})`);
  console.log(`   ${seqs.size}/365 distinct tier sequences; slot 0 reached ${seen.size} of a 130 bucket`);
}

/* --------------------------------- 5. the HL family, fenced as measured */
console.log("5) the seven Higher/Lower dailies: adequate, and held there");
{
  /* the harness's faithful copy of the hooks' seededShuffle */
  const seededShuffle = (arr, seed) => {
    const a = [...arr];
    let s = seed;
    for (let i = a.length - 1; i > 0; i--) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const j = s % (i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  /* fingerprint: if a hook's generator text changes, this copy no longer
     measures reality and must be re-verified by hand */
  const CANON = "s = (s * 1103515245 + 12345) & 0x7fffffff;";
  const HL = [
    ["nba", "useNbaHL.ts", mods.nbaHLPlayers],
    ["mlb", "useMlbHL.ts", mods.mlbHLPlayers],
    ["tennis", "useTennisHL.ts", mods.tennisHLPlayers],
    ["cfb", "useCfbHL.ts", mods.cfbHLPlayers],
    ["f1", "useF1HL.ts", mods.f1HLDrivers],
    ["golf", "useGolfHL.ts", mods.golfLegends],
    ["hockey", "useHockeyHL.ts", mods.hockeyHLPlayers],
    ["afl", "useAflHL.ts", mods.aflGoalKickers],
  ];
  const dateSeed = s => parseInt(s.replace(/-/g, ""), 10);
  for (const [name, file, pool] of HL) {
    const t = readFileSync(path.join(ROOT, "src/hooks", file), "utf-8");
    if (!t.includes(CANON)) {
      fail(`${file}: the shuffle body changed, this fence's copy no longer measures it; re-measure before trusting`);
      continue;
    }
    if (pool.length < 40) fail(`${name}: pool shrank to ${pool.length}, below the size the adequacy measurement assumed`);
    let identBoard = 0, identFirst = 0, prevB = null, prevF = null;
    for (const dt of days) {
      const sh = seededShuffle(pool.map((_, i) => i), dateSeed(dt));
      const first = sh[0] + "|" + sh[1];
      const board = sh.slice(0, 20).join(",");
      if (prevB !== null) {
        if (board === prevB) identBoard += 1;
        if (first === prevF) identFirst += 1;
      }
      prevB = board; prevF = first;
    }
    if (identBoard > 0) fail(`${name}: a full board repeated on consecutive days ${identBoard} time(s)`);
    if (identFirst > 3) fail(`${name}: the opening pair repeated on consecutive days ${identFirst} times (measured baseline: at most 1)`);
    console.log(`   ${name}: pool ${pool.length}, ${identBoard} identical boards, ${identFirst} identical opening pairs`);
  }
  /* NFL HL deals by category rather than a flat pool, so the pair walk above
     does not apply; its generator is the same iterated shape, so at least
     pin the body to the measured form. */
  const nfl = readFileSync(path.join(ROOT, "src/hooks/useNflHL.ts"), "utf-8");
  if (!nfl.includes(CANON)) fail("useNflHL.ts: the shuffle body changed, re-measure before trusting");
}

/* -------------------------- 6. the constant cannot spread to new sites */
console.log("6) the overflow constant is allowlisted, everywhere else it is banned");
{
  /* the HL seededShuffle and Quiz Board's splice loop measured adequate and
     keep the constant; every other appearance in src is a regression. The
     harness and this file's own doc lines are exempt by location. */
  const ALLOWED = new Set([
    "src/hooks/useNbaHL.ts", "src/hooks/useMlbHL.ts", "src/hooks/useTennisHL.ts",
    "src/hooks/useCfbHL.ts", "src/hooks/useF1HL.ts", "src/hooks/useGolfHL.ts",
    "src/hooks/useHockeyHL.ts", "src/hooks/useNflHL.ts", "src/hooks/useQuizBoard.ts",
    /* Round 231: the AFL HL joined the family with the same measured-adequate
       iterated shuffle; fenced in section 5 like its siblings */
    "src/hooks/useAflHL.ts",
  ]);
  /* Round 272: this scan used to read the raw file text, and it went red on
     src/lib/fetchOverratedPool.ts, which does not USE the constant. It has a
     header comment explaining the Round 223 bug, and that comment quotes the
     constant, as it should: the write-up of a fix is how the next person knows
     not to redo it. So the guard was failing on its own documentation.
     Widening the allowlist would have been the wrong fix twice over, because
     it would then permit a real regression in that exact file. The guard reads
     CODE now and comments are stripped first, which keeps it strict where it
     matters and stops it punishing anyone for writing down what happened.
     Negative controlled: a live `seed * 1103515245` added to a non allowlisted
     source is still caught. */
  const codeOnly = t => t
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .map(line => {
      /* a // inside a URL is not a comment, and cutting there would hide
         whatever followed on the same line */
      const i = line.indexOf('//');
      return i >= 0 && !/https?:$/.test(line.slice(0, i + 1).trim().slice(-6)) && !line.includes('http') ? line.slice(0, i) : line;
    })
    .join('\n');
  const offenders = [];
  const walk = d => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.tsx?$/.test(e.name)) {
        const rel = path.relative(ROOT, p).replaceAll("\\", "/");
        const t = readFileSync(p, "utf-8");
        if (codeOnly(t).includes("1103515245") && !ALLOWED.has(rel)) offenders.push(rel);
      }
    }
  };
  walk(path.join(ROOT, "src"));
  for (const o of offenders) fail(`${o}: the overflow-prone multiply appeared outside the measured allowlist`);
  console.log(`   ${ALLOWED.size} measured carriers allowed, ${offenders.length} offenders`);
}

console.log("");
if (failures > 0) {
  console.error(`simDateDraws: ${failures} failure${failures === 1 ? "" : "s"}`);
  process.exit(1);
}
console.log("simDateDraws: green. Every date-seeded draw reaches its whole pool or is fenced where measured.");
