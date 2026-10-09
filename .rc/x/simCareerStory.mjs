/* Round 974 harness: the Soccer Career story keeps every season.

   THE BUG. Both season steps (advanceYouthYear, advanceProSeason) started
   with events = [], so every line the engine wrote about an earlier season
   was thrown away, and the page drew the last three lines of the current one.
   Round 974 writes the season that is ending into CareerState.story at both
   resets (archiveSeasonStory) and the Career Story screen reads it back.
   AND A SECOND ONE, found by looking at the first story on a phone: a
   signing (acceptOffer) and a loan (acceptLoan) did not add their line to
   the log, they replaced the log with it. A season that ended in a move kept
   one line. On the measured run below that was 13,522 of 28,599 lines, about
   half of every story, gone before any reset ran. Both now append.

   WHAT IT DOES. Bundles the real engine and plays CAREERS full careers (four
   seeds by default, eight positions and three choice styles, transfers and
   loans taken and refused), noting before every season step what the log
   holds and which season row it belongs to. That note is what the story must
   end up holding.

   CHECKS, all on outcomes:
     1. Completeness, walked step by step: after every season step the story
        has grown by exactly that season, and at the end every line of every
        finished season is in the story, in order, once, under its own row.
        Baseline: before Round 974 a finished career kept only its live
        season, printed below as the share of lines a player could still read.
     2. No draw moved: every career plays identically (rows, log, overall,
        money) on a second bundle of the same source with the archive taken
        out of both resets, which is the engine before Round 974.
     3. Size: mean bytes per story season and mean save size at the end of a
        career, against bands set from measurement (below). Never a max.
     4. The log only grows between resets: after every other step the old log
        is still the start of the new one. Fails if fewer than one signing in
        four careers was seen, so it cannot pass by never meeting a move.

   MEASURED 2026-10-03, eight seeds x 24 careers, both fixes in:
     seed     story bytes a season   seasons a career   save mean bytes
     9741            428                  21.9              37,552
     19741           423                  22.4              37,791
     29741           428                  22.7              38,985
     39741           424                  22.0              37,939
     49741           432                  21.8              37,968
     59741           433                  22.5              38,705
     69741           433                  22.7              38,841
     79741           431                  22.4              38,721
     all 192 careers: 2,287 signings and 54 loans, 28,599 lines written, every
     one kept; a finished career could read 244 of them (0.9%) before this
     round. With the signing still writing over the log (the wipe control) the
     same 192 careers kept 15,077. Run time about 60 s.
   The default run is the first four seeds. Bands: story bytes a season 300
   to 650 (seed spread 423 to 433, so 650 is half again over and catches a
   line that starts carrying data), save mean 28,000 to 50,000 (seed spread
   37,552 to 38,985; the old save without a story ran about 34,000 on the
   same driver). Means only; a max is noise.

   RE-MEASURED at Release AQ (2026-10-09, release-aq-int 2caf7f51, on a CI
   runner, one seed a run, 24 careers each), because the Soccer Career train
   (the other lane's Rounds 1169 to 1178) saves more on purpose: every
   season's continental cup games on its row (Round 1173), each 2026 on
   season's own division and the career's ten divisions (Round 1175), and
   the log lines for a ban, a move and a club changing division:
     seed     story bytes a season   save mean bytes
     9741            464                 57,121
     19741           476                 60,949
     29741           464                 60,796
     39741           479                 60,386
     49741           475                 60,684
     59741           488                 64,643
     69741           479                 66,349
     79741           477                 62,781
   (As the train arrived the default run's mean was 70,788: every row also
   carried the whole world's 26 moves a season, read by nothing, and the
   release cut that to the clubs that left his own division; 59,813 after.)
   The story band does not move (464 to 488 sits inside 300 to 650). The save
   mean band keeps the shape it had, about a quarter under the lowest seed
   and a quarter over the highest: 42,000 to 85,000. THIS BAND IS THE
   RELEASE LEAD'S TO CONFIRM: the integration moved it, in a commit of its
   own, so the harness could be read on the release.

   CONTROLS. CAREER_STORY_CONTROL=reset drops the archive at the pro season
   reset, =cap keeps 5 lines a season, =draw makes the archive draw once,
   =wipe puts the signing back to writing over the log. Each mutates the
   engine source as it is bundled (the anchor is asserted to be there first)
   and must fail its own check: reset and cap fail check 1, draw fails check
   2, wipe fails check 4. A control run exits 0 only when its check failed and
   prints which one; it exits 1 when the control did not fire.

   Run: node scripts/simCareerStory.mjs [careersPerSeed]
   Reads no network: fetch is replaced with a thrower before the engine loads. */
import { build } from "esbuild";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENGINE = path.join(ROOT, "src", "lib", "soccerCareerEngine.ts");
const WORLD = path.join(ROOT, "src", "lib", "soccerCareerLeagueWorld.ts");
const CONTROL = process.env.CAREER_STORY_CONTROL || "";
const PER_SEED = Number(process.argv[2] || 24);
const SEEDS = (process.env.CAREER_STORY_SEEDS || "9741,19741,29741,39741").split(",").map(Number);

const RESET = "s.age += 1; s.story = archiveSeasonStory(s); s.events = [];";
const WORLD_FILTER = ".filter(m => m.from === snapshot.league);";
const CUP_COPY = "if (uclResult.qualified) season.clubCupRun = JSON.parse(JSON.stringify(s.lastUCLResult)) as UCLResult;";
const MUTATIONS = {
  reset: { anchor: RESET, count: 2, apply: src => { const i = src.lastIndexOf(RESET); return src.slice(0, i) + "s.age += 1; s.events = [];" + src.slice(i + RESET.length); } },
  cap: { anchor: "export const STORY_LINES_PER_SEASON = 40;", count: 1, apply: src => src.replace("export const STORY_LINES_PER_SEASON = 40;", "export const STORY_LINES_PER_SEASON = 5;") },
  draw: { anchor: "export function archiveSeasonStory(s: CareerState): CareerStorySeason[] {", count: 1, apply: src => src.replace("export function archiveSeasonStory(s: CareerState): CareerStorySeason[] {", "export function archiveSeasonStory(s: CareerState): CareerStorySeason[] {\n  Math.random();") },
  /* the signing written over the season's log again, as it was before 974 */
  wipe: { anchor: "s.events = [...s.events, `✍️ Signed with", count: 2, apply: src => src.split("s.events = [...s.events, `✍️ Signed with").join("s.events = [`✍️ Signed with") },
  /* Release AQ: every season row carries the whole world's moves again, the
     way the Soccer Career train arrived (the settle's filter taken out) */
  worldmoves: { file: "world", anchor: WORLD_FILTER, count: 1, apply: src => src.replace(WORLD_FILTER, ";") },
  /* Release AQ: a season's continental cup games written on its row twice */
  cuptwice: { anchor: CUP_COPY, count: 1, apply: src => src.replace(CUP_COPY, CUP_COPY + " if (season.clubCupRun) (season.clubCupRun as unknown as Record<string, unknown>).again = JSON.parse(JSON.stringify(s.lastUCLResult));") },
};
const EXPECT_FAIL = { reset: "completeness", cap: "completeness", draw: "draws", wipe: "log", worldmoves: "parts", cuptwice: "parts" };
if (CONTROL && !MUTATIONS[CONTROL]) { console.error(`unknown CAREER_STORY_CONTROL ${CONTROL}`); process.exit(2); }

const original = fs.readFileSync(ENGINE, "utf8");
const worldOriginal = fs.readFileSync(WORLD, "utf8");
let engineText = original;
let worldText = worldOriginal;
if (CONTROL) {
  const m = MUTATIONS[CONTROL];
  const before = m.file === "world" ? worldOriginal : original;
  const found = before.split(m.anchor).length - 1;
  if (found !== m.count) { console.error(`control ${CONTROL}: anchor found ${found} times, expected ${m.count}`); process.exit(1); }
  const after = m.apply(before);
  if (after === before) { console.error(`control ${CONTROL} changed nothing`); process.exit(1); }
  if (m.file === "world") worldText = after; else engineText = after;
}

const DIR = fs.mkdtempSync(path.join(os.tmpdir(), "career-story974-"));
const ENTRY = path.join(DIR, "entry.mjs");
const OUT = path.join(DIR, "engine.mjs");
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
globalThis.fetch = () => { throw new Error("simCareerStory reads no network"); };
const mod = await import('${ROOT.replaceAll("\\", "/")}/src/lib/soccerCareerEngine.ts');
export const engine = mod;
`);
/* Two bundles of the same source: the engine as it ships (or as the control
   mutated it), and the baseline, the same text with the archive taken out of
   both season resets, which is the engine before Round 974. */
const baselineText = engineText.split(RESET).join("s.age += 1; s.events = [];");
if (!CONTROL && baselineText.split("archiveSeasonStory(s)").length - 1 !== 0) { console.error("the baseline still archives"); process.exit(1); }
async function bundle(text, name) {
  const out = OUT.replace(/engine\.mjs$/, `${name}.mjs`);
  const swapEngine = {
    name: "swap-engine",
    setup(b) {
      b.onLoad({ filter: /soccerCareerEngine\.ts$/ }, args =>
        path.resolve(args.path) === path.resolve(ENGINE) ? { contents: text, loader: "ts" } : undefined);
      /* the league world as a control mutated it, in both bundles alike */
      b.onLoad({ filter: /soccerCareerLeagueWorld\.ts$/ }, args =>
        worldText !== worldOriginal && path.resolve(args.path) === path.resolve(WORLD) ? { contents: worldText, loader: "ts" } : undefined);
    },
  };
  await build({ entryPoints: [ENTRY], bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "error", alias: { "@": "./src" }, plugins: [swapEngine] });
  return (await import(pathToFileURL(out).href)).engine;
}
const E = await bundle(engineText, "engine");
const BASE = await bundle(baselineText, "baseline");
fs.rmSync(DIR, { recursive: true, force: true });
const clubs = E.FALLBACK_CLUBS;

function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const NATIONS = ["England", "Brazil", "France", "Japan", "Nigeria", "Argentina", "Morocco", "Norway"];
const POSITIONS = ["ST", "CAM", "CM", "CB", "GK", "LW", "RB", "CDM"];

/* One full career. Before every season step it notes the log and its row;
   after the step it checks the story grew by exactly that season (the walk
   over every rung, not just the two ends). E is the engine bundle to play,
   the shipped one or the baseline; walk is off for the baseline, which keeps
   no story by design. */
function career(E, seed, c, walk) {
  Math.random = seeded(seed * 1000 + c);
  const ovr = 45 + (c % 25);
  const st = { pace: ovr, shooting: ovr, passing: ovr, dribbling: ovr, defending: ovr, physical: ovr, reflexes: ovr };
  let s = E.initCareer(`Story ${seed}-${c}`, NATIONS[c % 8], POSITIONS[c % 8], "2020s", st, ovr, 2020, clubs, null);
  const seen = [];
  const stepFaults = [];
  const logFaults = [];
  let lines = 0;
  for (let guard = 0; guard < 1500 && !s.retired; guard++) {
    const phase = s.phase;
    if (phase === "youth" || phase === "playing") {
      const row = s.seasons[s.seasons.length - 1];
      const had = (s.story ?? []).length;
      const wrote = s.events.length > 0;
      if (wrote) { seen.push({ year: row.year, age: row.age, club: row.club, lines: [...s.events] }); lines += s.events.length; }
      s = phase === "youth" ? E.advanceYouthYear(s, clubs) : E.advanceProSeason(s, clubs);
      if (walk) {
        const want = had + (wrote ? 1 : 0);
        if ((s.story ?? []).length !== want) stepFaults.push(`${seed}/${c} age ${s.age}: story ${(s.story ?? []).length}, want ${want}`);
      }
      continue;
    }
    const logBefore = s.events;
    const loanable = phase === "transfer_window" && c % 3 === 1 && (s.pendingLoanOffers?.length ?? 0) > 0;
    switch (loanable ? "loan" : phase) {
      case "loan": s = E.acceptLoan(s, s.pendingLoanOffers[0]); loans++; break;
      case "contract_offer": { const o = s.pendingOffers || []; s = o.length ? E.acceptOffer(s, o.find(x => x.isHomegrown) || o[0]) : { ...s, phase: "playing" }; break; }
      case "rehab_choice": s = E.applyRehabChoice(s, c % 3); break;
      case "newspaper": s = E.dismissNewspaper(s); break;
      case "season_summary": s = E.dismissSummary(s, clubs); break;
      case "random_events": s = s.pendingEvents?.[0] ? E.applyEventChoice(s, c % 3 === 0 ? 0 : Math.min(s.pendingEvents[0].choices.length - 1, 1), clubs) : { ...s, pendingEvents: [], phase: "playing" }; break;
      case "moral_dilemma": s = s.pendingMoralDilemma ? E.applyMoralDilemmaChoice(s, c % 2) : E.dismissMoralDilemma(s, clubs); break;
      case "social_media_action": s = E.dismissSocialMediaPhase(s, clubs); break;
      case "red_card_appeal_result": s = E.dismissAppealResult(s, clubs); break;
      case "international_debut": s = E.dismissDebut(s, clubs); break;
      case "world_cup": s = E.dismissWorldCup(s, clubs); break;
      case "rivalry_event": s = E.dismissRivalryEvent(s, clubs); break;
      case "ballon_dor": s = E.dismissBallonDor(s, clubs); break;
      case "transfer_window": {
        const sit = s.transferSituation;
        if (sit?.type === "contract_expiry") { const o = sit.offers || []; s = o.length ? E.acceptOffer(s, o[0]) : E.signExtension(s); }
        else if (sit?.offer && c % 2 === 0) s = E.acceptOffer(s, sit.offer);
        else if (sit?.offerA && c % 2 === 0) s = E.acceptOffer(s, sit.offerA);
        else s = E.stayAtClub(s);
        break;
      }
      case "retirement_suggestion": s = c % 4 === 0 ? E.acceptRetirementSuggestion(s) : E.declineRetirementSuggestion(s, clubs); break;
      default: throw new Error(`no move for ${phase} (${seed}/${c})`);
    }
    /* check 4: off the two season resets nothing may take a line back out of
       the log; a transfer or a loan used to write over the whole season */
    if (walk && s.events.some((l, i) => l.includes("Signed with") && logBefore[i] !== l)) transfers++;
    if (walk && (s.events.length < logBefore.length || logBefore.some((l, i) => s.events[i] !== l))) {
      logFaults.push(`${seed}/${c} ${phase}${loanable ? " (loan)" : ""} at ${s.age}: the log went from ${logBefore.length} lines to ${s.events.length}, dropping earlier ones`);
    }
  }
  return { s, seen, lines, stepFaults, logFaults };
}

/* Bands, set from the measured numbers in the header. */
const BANDS = {
  storyBytesPerSeason: [300, 650],
  saveBytesMean: [42000, 85000],
  /* check 5, the parts (see THE PARTS in the header) */
  restBytesMean: [28000, 50000],
  cupBytesPerSeason: [1200, 2400],
  divisionBytesPerSeason: [400, 950],
  tenDivisionsBytesMean: [3000, 6800],
};
/* Seasons a career that must stand behind a part's mean, well under measured. */
const PART_FLOORS = { cupRows: 1, divisionRows: 5 };

/* Check 5: the save in the parts the Soccer Career train made of it. The two
   things it keeps on a season row, the career's ten divisions, and the rest,
   which is everything the save held before the train. */
const bytesOf = v => (v === undefined ? 0 : JSON.stringify(v).length);
function saveParts(s) {
  const cupRows = s.seasons.filter(r => r.clubCupRun);
  const divisionRows = s.seasons.filter(r => r.leagueWorld);
  return {
    cup: cupRows.reduce((n, r) => n + bytesOf(r.clubCupRun), 0), cupRows: cupRows.length,
    division: divisionRows.reduce((n, r) => n + bytesOf(r.leagueWorld), 0), divisionRows: divisionRows.length,
    ten: bytesOf(s.leagueWorld),
    rest: bytesOf({ ...s, leagueWorld: undefined, seasons: s.seasons.map(r => ({ ...r, clubCupRun: undefined, leagueWorld: undefined })) }),
  };
}

const fails = { completeness: [], draws: [], size: [], log: [], parts: [] };
const part = { cup: 0, cupRows: 0, division: 0, divisionRows: 0, ten: 0, rest: 0 };
const partBySeed = { ...part };
let loans = 0, transfers = 0;
let careers = 0, seasonsKept = 0, linesKept = 0, linesWritten = 0, liveLines = 0, cut = 0;
let storyBytes = 0, saveBytes = 0;
const saves = [];
const bySeed = { careers: 0, storyBytes: 0, seasons: 0, saveBytes: 0 };
for (const seed of SEEDS) {
  for (let c = 0; c < PER_SEED; c++) {
    const a = career(E, seed, c, true);
    const b = career(BASE, seed, c, false);
    careers++;
    const story = a.s.story ?? [];
    fails.completeness.push(...a.stepFaults);
    fails.log.push(...a.logFaults);
    if (story.length !== a.seen.length) fails.completeness.push(`${seed}/${c}: story ${story.length} seasons, played ${a.seen.length}`);
    story.forEach((e, i) => {
      const want = a.seen[i];
      if (!want) return;
      if (e.year !== want.year || e.age !== want.age || e.club !== want.club) fails.completeness.push(`${seed}/${c} season ${i}: filed under ${e.year}/${e.age}/${e.club}, belongs to ${want.year}/${want.age}/${want.club}`);
      if (JSON.stringify(e.lines) !== JSON.stringify(want.lines)) fails.completeness.push(`${seed}/${c} season ${i}: ${e.lines.length} lines kept of ${want.lines.length}`);
      if (e.more) cut += e.more;
    });
    const same = JSON.stringify(a.s.seasons) === JSON.stringify(b.s.seasons) && a.s.overall === b.s.overall && a.s.netWorth === b.s.netWorth && JSON.stringify(a.s.events) === JSON.stringify(b.s.events);
    if (!same) fails.draws.push(`${seed}/${c}: the career played differently from the engine without the story`);
    seasonsKept += story.length;
    linesKept += story.reduce((n, e) => n + e.lines.length, 0);
    linesWritten += a.lines + a.s.events.length;
    liveLines += a.s.events.length;
    storyBytes += JSON.stringify(story).length;
    const bytes = JSON.stringify(a.s).length;
    saveBytes += bytes;
    saves.push(bytes);
    const p = saveParts(a.s);
    for (const k of Object.keys(part)) part[k] += p[k];
  }
  const n = careers - bySeed.careers, sb = storyBytes - bySeed.storyBytes, ss = seasonsKept - bySeed.seasons, vb = saveBytes - bySeed.saveBytes;
  console.log(`seed ${seed}: ${n} careers, story ${(sb / Math.max(1, ss)).toFixed(0)} bytes a season, ${(ss / Math.max(1, n)).toFixed(1)} seasons a career, save mean ${(vb / Math.max(1, n)).toFixed(0)} bytes`);
  const d = Object.fromEntries(Object.keys(part).map(k => [k, part[k] - partBySeed[k]]));
  console.log(`seed ${seed} parts: rest mean ${(d.rest / Math.max(1, n)).toFixed(0)} bytes, cup games ${(d.cup / Math.max(1, d.cupRows)).toFixed(0)} bytes a season over ${d.cupRows} seasons, division ${(d.division / Math.max(1, d.divisionRows)).toFixed(0)} bytes a season over ${d.divisionRows} seasons, ten divisions mean ${(d.ten / Math.max(1, n)).toFixed(0)} bytes`);
  Object.assign(bySeed, { careers, storyBytes, seasons: seasonsKept, saveBytes });
  Object.assign(partBySeed, part);
}
if (transfers < careers / 4) fails.log.push(`only ${transfers} signings over ${careers} careers: the log check saw too few moves to mean anything`);
if (cut > 0) fails.completeness.push(`${cut} lines past the season cap were not kept`);
const perSeason = storyBytes / Math.max(1, seasonsKept);
const meanSave = saveBytes / Math.max(1, careers);
if (perSeason < BANDS.storyBytesPerSeason[0] || perSeason > BANDS.storyBytesPerSeason[1]) fails.size.push(`mean story bytes a season ${perSeason.toFixed(0)} outside ${BANDS.storyBytesPerSeason}`);
if (meanSave < BANDS.saveBytesMean[0] || meanSave > BANDS.saveBytesMean[1]) fails.size.push(`mean save bytes ${meanSave.toFixed(0)} outside ${BANDS.saveBytesMean}`);
if (seasonsKept < careers * 10) fails.completeness.push(`only ${seasonsKept} story seasons over ${careers} careers: the driver is not playing careers`);
/* check 5: each part inside its own band, and enough seasons behind each mean */
const partMeans = {
  restBytesMean: part.rest / Math.max(1, careers),
  cupBytesPerSeason: part.cup / Math.max(1, part.cupRows),
  divisionBytesPerSeason: part.division / Math.max(1, part.divisionRows),
  tenDivisionsBytesMean: part.ten / Math.max(1, careers),
};
for (const [name, value] of Object.entries(partMeans)) {
  if (value < BANDS[name][0] || value > BANDS[name][1]) fails.parts.push(`${name} ${value.toFixed(0)} outside ${BANDS[name]}`);
}
if (part.cupRows < careers * PART_FLOORS.cupRows) fails.parts.push(`only ${part.cupRows} seasons with continental cup games over ${careers} careers: too few to measure`);
if (part.divisionRows < careers * PART_FLOORS.divisionRows) fails.parts.push(`only ${part.divisionRows} seasons with a division over ${careers} careers: too few to measure`);

saves.sort((x, y) => x - y);
console.log(`moves the log check saw: ${transfers} signings, ${loans} loans`);
console.log(`careers ${careers} (${SEEDS.length} seeds x ${PER_SEED}), story seasons ${seasonsKept}, lines written ${linesWritten}, kept in the story ${linesKept} plus ${liveLines} live`);
console.log(`baseline before Round 974: a finished career could read ${liveLines} of ${linesWritten} lines (${(100 * liveLines / Math.max(1, linesWritten)).toFixed(1)}%); now ${linesKept + liveLines} (${(100 * (linesKept + liveLines) / Math.max(1, linesWritten)).toFixed(1)}%)`);
console.log(`size: story ${perSeason.toFixed(0)} bytes a season, save mean ${meanSave.toFixed(0)} bytes, median ${saves[Math.floor(saves.length / 2)]}`);
console.log(`parts: rest mean ${partMeans.restBytesMean.toFixed(0)} bytes (the save before the train's parts), cup games ${partMeans.cupBytesPerSeason.toFixed(0)} bytes a season over ${part.cupRows} seasons, division ${partMeans.divisionBytesPerSeason.toFixed(0)} bytes a season over ${part.divisionRows} seasons, ten divisions mean ${partMeans.tenDivisionsBytesMean.toFixed(0)} bytes`);
for (const [name, list] of Object.entries(fails)) {
  console.log(`check ${name}: ${list.length === 0 ? "ok" : `FAIL (${list.length})`}`);
  for (const f of list.slice(0, 5)) console.log(`  ${f}`);
}
const failed = Object.keys(fails).filter(k => fails[k].length > 0);
if (CONTROL) {
  const want = EXPECT_FAIL[CONTROL];
  if (failed.includes(want)) { console.log(`simCareerStory control ${CONTROL}: fired, check ${want} failed as it must (failed: ${failed.join(", ")})`); process.exit(0); }
  console.log(`simCareerStory control ${CONTROL}: DID NOT FIRE, check ${want} stayed green`); process.exit(1);
}
if (failed.length) { console.log(`simCareerStory: RED, ${failed.join(", ")}`); process.exit(1); }
console.log(`simCareerStory: GREEN, ${careers} careers keep every season's lines in order, draw nothing and stay inside the size bands`);
