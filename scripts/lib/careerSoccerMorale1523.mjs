/* Round 1523: the tenth inverse of the Soccer Career history harnesses, morale that plays and the Puskas year.
 *
 * Round 1523 moves seeded careers on purpose: a season reads the morale he pressed on as a step of league games
 * (beside the dressing room, capped together at three) and a tenth of rating a step (src/lib/careerForm.ts), and the
 * Puskas Award is only given from the 2008-09 season on (its Math.random draw is kept and thrown away before that).
 * So every harness that holds whole careers to an older engine or a recording takes this round out first, an
 * attribution and not a new recording: scripts/simCareerForm.mjs proves what the round changes.
 *
 * These rows are applied by scripts/lib/careerSoccerDeck1334.mjs (the ninth) IN FRONT of its own, inside the same
 * functions, so its seventeen importers take both out in order without a second wiring. The ninth's own rows are
 * untouched (never squashed into one). Applied IN ORDER to this round's engine they give the ninth's head byte for
 * byte (LF):
 *   src/lib/soccerCareerEngine.ts
 *     head sha256 5619bf28ceb3fa07561d0c667a09de411439c488acb0170b45dae2fbc49bf990
 *     base sha256 90e8fc573532e8388b7d3a745e88550031ceca990e1717b43651ec281ace115a
 * (base: git show 6c63ce98:<file>, the Release BP head the round was merged onto, after Round 1519, whose
 * engine is the ninth inverse's head pin; regenerated at that merge). Every row is required exactly once at its turn. Rows are regenerated, never hand edited, after any
 * change to the engine, this round's or a merge's: from the worktree root, node .tmp-fx/x/gen-inverse-1523.mjs <base>
 * then node .tmp-fx/x/write-inverse-1523.mjs (copies in C:/Users/antho/dukb-handoff/2026-10-10/results-g/r1523-tools).
 */
export const SOCCER_MORALE_BASE = '6c63ce989fc6fe1e46c91b3ec5bc63a484b56717';
export const SOCCER_MORALE_SHA256 = {
  "src/lib/soccerCareerEngine.ts": {
    "head": "5619bf28ceb3fa07561d0c667a09de411439c488acb0170b45dae2fbc49bf990",
    "base": "90e8fc573532e8388b7d3a745e88550031ceca990e1717b43651ec281ace115a"
  }
};

/* The rows, in the order they must be applied: each turns one block of this round's engine back into the base's. */
export const SOCCER_MORALE_ROWS = [
  { name: "morale-engine-1", file: "src/lib/soccerCareerEngine.ts",
    from: "import type { PhoneState, WorldSeason } from \"./soccerPhone\";\n/* Round 1523: morale that plays (src/lib/careerForm.ts) and the first season the Puskas Award was given for. */\nimport { dressingRoomApps, soccerMoraleRating } from \"./careerForm\";\nimport { puskasAwardExists } from \"./soccerWorldTruth\";\n/* Round 134: money stops being a number that only goes up. A savings account,",
    to: "import type { PhoneState, WorldSeason } from \"./soccerPhone\";\n/* Round 134: money stops being a number that only goes up. A savings account," },
  { name: "morale-engine-2", file: "src/lib/soccerCareerEngine.ts",
    from: "\n/* Round 1523: a season reads the morale he pressed on, the number the hub showed him, not the one the summer's\n   texts leave behind. advanceProSeason notes it before the phone moves it; a season resumed from the retirement\n   screen reads the save's own. A WeakMap, so nothing new is ever saved and nothing outlives the press. */\nconst MORALE_AT_PRESS = new WeakMap<CareerState, number>();\nconst moraleAtPress = (state: CareerState): number => MORALE_AT_PRESS.get(state) ?? state.morale;\n\n/* exported for simLoanSpell, which proves the projection and the draw share one table */",
    to: "\n/* exported for simLoanSpell, which proves the projection and the draw share one table */" },
  { name: "morale-engine-3", file: "src/lib/soccerCareerEngine.ts",
    from: "     small enough that it cannot undo thirty rounds of balance work. */\n  /* Round 1523: and his head, a step of up to two games from his morale, capped together with the dressing room\n     at three either way (careerForm.ts dressingRoomApps), so a warm phone and a happy head never stack past it. */\n  if (state) leagueApps = clamp(leagueApps + dressingRoomApps(phoneAppsSwing(state), moraleAtPress(state)) + recentClubForm(state).swing + reducedRoleSwing(state), 0, 38);\n",
    to: "     small enough that it cannot undo thirty rounds of balance work. */\n  if (state) leagueApps = clamp(leagueApps + phoneAppsSwing(state) + recentClubForm(state).swing + reducedRoleSwing(state), 0, 38);\n" },
  { name: "morale-engine-4", file: "src/lib/soccerCareerEngine.ts",
    from: "  const redCards = Math.random() < 0.08 * programme.redCardMult && apps > 0 ? 1 : 0;\n  /* Round 1523: his morale is worth a tenth of a rating point a step, beside the build's own delta. */\n  const rating = calcSeasonRating(position, apps, goals, assists, cleanSheets, overall, currentClubTier, fx.ratingDelta + soccerMoraleRating(moraleAtPress(state)));\n",
    to: "  const redCards = Math.random() < 0.08 * programme.redCardMult && apps > 0 ? 1 : 0;\n  const rating = calcSeasonRating(position, apps, goals, assists, cleanSheets, overall, currentClubTier, fx.ratingDelta);\n" },
  { name: "morale-engine-5", file: "src/lib/soccerCareerEngine.ts",
    from: "  const s = repairCareer({ ...prev }); s.age += 1; s.story = archiveSeasonStory(s); s.events = [];\n  MORALE_AT_PRESS.set(s, s.morale); /* Round 1523: the morale he pressed on, before the summer's texts */\n  prepareLeagueWorld(s, clubs, (s.seasons[s.seasons.length - 1]?.year ?? 2024) + 1);",
    to: "  const s = repairCareer({ ...prev }); s.age += 1; s.story = archiveSeasonStory(s); s.events = [];\n  prepareLeagueWorld(s, clubs, (s.seasons[s.seasons.length - 1]?.year ?? 2024) + 1);" },
  { name: "morale-engine-6", file: "src/lib/soccerCareerEngine.ts",
    from: "\n  /* Puskás Award (best goal of the year), random chance for high-performing attackers. Round 1523: only from the\n     season it was first given for (soccerWorldTruth.ts puskasAwardExists, with its two sources). An earlier\n     season still makes the same draw and throws it away, the Round 1329 rule, so nothing later moves. */\n  const puskasDrawn = season.goals >= 15 && s.overall >= 80 && Math.random() < 0.08;\n  if (puskasDrawn && puskasAwardExists(thisYear)) {\n    s.awards = [...s.awards, { year: thisYear, name: \"Puskás Award\", emoji: \"🎯\" }];",
    to: "\n  // Puskás Award (best goal of the year), random chance for high-performing attackers\n  if (season.goals >= 15 && s.overall >= 80 && Math.random() < 0.08) {\n    s.awards = [...s.awards, { year: thisYear, name: \"Puskás Award\", emoji: \"🎯\" }];" },
];

export const SOCCER_MORALE_FILES = Object.keys(SOCCER_MORALE_SHA256);

/**
 * The attribution switch for a harness that holds this tree to an older base on its own (not through the ninth),
 * the scripts/lib/careerLifeChainBF.mjs pattern: each harness names its own variable. Unset is ON (Round 1523 taken
 * out of the bundle compared with the base); an empty value is OFF, the unattributed arm, red on this head by design,
 * which is how the attribution is shown to be the only change.
 */
export function soccerMoraleOut(envName) {
  const value = process.env[envName];
  return value === undefined || value.trim() !== '';
}

/** One file with Round 1523 alone taken out (LF). A file the round did not edit comes back as it was. */
export function inverseSoccerMorale(relative, source, receipt = []) {
  const rows = SOCCER_MORALE_ROWS.filter(row => row.file === relative);
  if (rows.length === 0) return source;
  let out = source.split('\r\n').join('\n');
  for (const row of rows) {
    if (out.split(row.from).length !== 2) throw new Error(`the ${row.name} row of Round 1523's inverse must be in ${relative} exactly once at its turn`);
    out = out.replace(row.from, () => row.to);
    receipt.push({ addition: row.name, file: relative });
  }
  return out;
}

/** '' when every row came off once, in order, in every file the receipt names, and the engine was among them. */
export function soccerMoraleReceiptProblem(receipt) {
  const want = SOCCER_MORALE_ROWS.map(row => row.name).join();
  const got = receipt.map(row => row.addition).join();
  return got === want ? '' : `Round 1523's inverse ran ${got || 'nothing'}, not ${want}`;
}
