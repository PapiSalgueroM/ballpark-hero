import assert from "node:assert/strict";
import { readFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

// Compare the same simulated ballot twice. Only the submitted season changes.
const engineFile = path.resolve("src/lib/soccerCareerEngine.ts");
const out = path.join(tmpdir(), `ballot-roles-${process.pid}.mjs`);
let source = await readFile(engineFile, "utf8");
if (process.env.BDOR_ROLE_CONTROL === "ignore") {
  const gate = "if (!role || !season || season.apps < 20) return 0;";
  assert(source.includes(gate));
  source = source.replace(gate, "return 0;");
}

function reset(seed) {
  Math.random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

const originalRandom = Math.random;
const attributes = Object.fromEntries(["pace", "shooting", "passing", "dribbling", "defending", "physical", "reflexes"].map(k => [k, 88]));
try {
  await build({
    stdin: { contents: source + "\nexport { calculateBallonDor as ballot };", loader: "ts", resolveDir: path.dirname(engineFile) },
    outfile: out, bundle: true, format: "esm", platform: "node", logLevel: "error", alias: { "@": "./src" },
  });
  const engine = await import(pathToFileURL(out).href);
  const clubs = engine.FALLBACK_CLUBS;
  for (const [i, position] of ["ST", "CAM", "CM", "CDM", "CB", "GK"].entries()) {
    let improved = 0, sheetImproved = 0, strongWins = 0, ordinaryWins = 0, scorerPodiums = 0;
    for (let sample = 0; sample < 24; sample++) {
      const seed = 100907 + sample * 7919;
      reset(seed);
      let state = engine.initCareer("Position sample " + sample, "Brazil", position, "2020s", attributes, 88, 2020, clubs, null);
      while (state.phase === "youth") state = engine.advanceYouthYear(state, clubs);
      state = engine.acceptOffer(state, { club: clubs.find(c => c.tier === 1), contractYears: 5, wage: 150000, transferFee: 0 });
      state = engine.advanceProSeason({ ...state, age: 26, overall: 90, peakOverall: 90 }, clubs);
      const played = state.seasons.findLast(s => s.type === "playing");
      assert(played);
      const back = position === "CB" || position === "GK";
      const ordinary = {
        ...played, apps: 42, rating: 7, cleanSheets: back ? 6 : 0, leagueTitle: true, championsLeague: false, domesticCup: false,
        goals: position === "GK" ? 0 : position === "CB" ? 2 : 4, assists: position === "GK" ? 2 : 6,
      };
      function rank(changes) {
        reset(seed + i * 37);
        const vote = engine.ballot(structuredClone(state), { ...ordinary, ...changes }, played.year);
        return vote.playerRank ?? 31;
      }
      const before = rank({});
      const strong = rank({ apps: 49, cleanSheets: back ? 26 : 0, rating: 8.6 });
      if (before === 1) ordinaryWins++;
      if (strong === 1) strongWins++;
      if (strong < before) improved++;
      if (back && rank({ cleanSheets: 26 }) < before) sheetImproved++;
      assert(rank({ apps: 6, rating: 8.6 }) >= before, "A short run beat a full season on rating alone");
      if (position === "ST" && rank({ goals: 50, assists: 18 }) <= 3) scorerPodiums++;
    }
    console.log(`${position}: better rank ${improved}/24, clean sheets alone ${sheetImproved}/24, wins ${ordinaryWins} ordinary vs ${strongWins} standout`);
    if (position === "ST") {
      assert.equal(scorerPodiums, 24);
      assert.equal(improved, 0);
    } else {
      assert(improved >= 18, `A full standout ${position} season must beat its ordinary counterpart`);
      assert(strongWins > ordinaryWins, `A standout ${position} season must be able to win a contested ballot`);
      if (position === "GK" || position === "CB") assert(sheetImproved >= 15);
    }
  }
  console.log("PASS: matched season profiles, clean sheets, short seasons and elite scorers");
} finally {
  Math.random = originalRandom;
  await unlink(out).catch(() => {});
}
