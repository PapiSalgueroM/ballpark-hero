// Release AU fix pass: src/test/careerStory.test.tsx measures the two parts Rounds 1197 to 1208 add to a save
// (a season's opening cup tie, the one chance wheel receipt) as parts of their own, so "the rest" is again what
// the save held before the train and keeps its bound. usage: node fxStoryParts.mjs <opening budget a season> <wheel budget>
import fs from 'node:fs';
const [openingBudget, wheelBudget, note] = process.argv.slice(2);
const p = 'src/test/careerStory.test.tsx';
const CR = String.fromCharCode(13), LF = String.fromCharCode(10);
const raw = fs.readFileSync(p, 'utf8'); const crlf = raw.includes(CR + LF);
let s = raw.split(CR + LF).join(LF);
const rep = (a, b) => { if (s.split(a).length !== 2) { console.error('NOT ONCE: ' + a.slice(0, 90)); process.exit(1); } s = s.replace(a, () => b); };
const L = (...lines) => lines.join(LF);
rep("    rest: bytesOf({ ...s, leagueWorld: undefined, seasons: s.seasons.map(r => ({ ...r, clubCupRun: undefined, leagueWorld: undefined })) }),",
  L("    /* Release AU fix pass: the two parts Rounds 1197 to 1208 add (THE PARTS below). */",
    "    opening: openingRows.reduce((n, r) => n + bytesOf(r.cupRun?.opening), 0), openingRows: openingRows.length,",
    "    wheel: bytesOf(s.chanceWheel),",
    "    rest: bytesOf({ ...s, leagueWorld: undefined, chanceWheel: undefined, seasons: s.seasons.map(r => ({ ...r, clubCupRun: undefined, leagueWorld: undefined, cupRun: r.cupRun?.opening ? { ...r.cupRun, opening: undefined } : r.cupRun })) }),"));
rep("  const divisionRows = s.seasons.filter(r => r.leagueWorld);" + LF, "  const divisionRows = s.seasons.filter(r => r.leagueWorld);" + LF + "  const openingRows = s.seasons.filter(r => r.cupRun?.opening);" + LF);
rep("    expect(p.ten).toBeLessThan(TEN_DIVISIONS_BYTES);" + LF,
  L("    expect(p.ten).toBeLessThan(TEN_DIVISIONS_BYTES);",
    "    console.log(`[save parts] seed ${seed}: opening cup ties ${p.opening} bytes over ${p.openingRows} seasons, chance wheel ${p.wheel} bytes`);",
    "    expect(p.openingRows, 'seasons with an opening cup tie to measure').toBeGreaterThanOrEqual(PART_SEASONS_FLOOR);",
    "    expect(p.opening / p.openingRows).toBeLessThan(OPENING_BYTES_PER_SEASON);",
    "    expect(p.wheel).toBeLessThan(WHEEL_BYTES);", ''));
rep("const REST_BOUND = 80_000;" + LF,
  L("/* Release AU fix pass (2026-10-10). Rounds 1197 to 1208 add two parts, and",
    "   both landed in \"the rest\", which then read 82,143 B on seed 9750 against",
    "   its 80,000 (about 2 KB of opening ties and one receipt of about 150 B).",
    "   They are parts like the train's, so they are measured as parts, and the",
    "   rest is again what the save held before the train, under the bound it",
    "   had then, unchanged:",
    "     opening cup ties: a 2026 on season row's opening tie in a named cup",
    "       (cupRun.opening), by the season that kept one. Twice the measured",
    "       mean, the story's rule.",
    "     chance wheel: the one receipt a save holds (chanceWheel), one object.",
    "       Half again over the largest measured, the whole save's rule.",
    "   MEASURED by this test on release-au-int (CI runner): " + (note || 'see the [save parts] lines') + " */",
    "const OPENING_BYTES_PER_SEASON = " + openingBudget + ";",
    "const WHEEL_BYTES = " + wheelBudget + ";",
    "const REST_BOUND = 80_000;", ''));
fs.writeFileSync(p, crlf ? s.split(LF).join(CR + LF) : s);
console.log('ok');
