/* Round 1525: the eleventh inverse of the Soccer Career history harnesses, season awards won against a field.
 *
 * Round 1525 moves seeded careers on purpose: the eight season awards (Player of the Year, Puskas, Golden Boot,
 * Golden Glove, Young Player, UEFA Player, Comeback, Fair Play) are won against a drawn field on keyed streams
 * (src/lib/soccerSeasonAwards.ts) and only in the seasons they were given for. Every old Math.random coin is still
 * drawn and thrown away, so the main stream is the base's, but an award won or lost moves the awards list, the
 * events, and popularity (Player of the Year +10, Young Player +5), and from there the rest of a career. So every
 * harness that holds whole careers to an older engine or a recording takes this round out first, an attribution
 * and not a new recording: scripts/simSoccerSeasonAwards.mjs proves what the round changes.
 *
 * These rows are applied by scripts/lib/careerSoccerMorale1523.mjs (the tenth) IN FRONT of its own (its
 * SOCCER_MORALE_ROWS starts with them), so every importer of the tenth, and through it of the ninth, takes 1525,
 * then 1523, then 1334 out in that order with one receipt. Applied IN ORDER to this round's engine they give the
 * tenth's head byte for byte (LF):
 *   src/lib/soccerCareerEngine.ts
 *     head sha256 66805cfe259b84fafd971cbae2cc3e796c07d5fa0fc8b94f12e62513ab31a7b7
 *     base sha256 41e017d973ddbff539d6752313ca068cec04a08dbc671a7698728f1d7961650f
 * (base: git show 41368514:<file>, Round 1523's closing head, whose engine is the tenth inverse's head
 * pin). Every row is required exactly once at its turn. Rows are regenerated, never hand edited, after any change to
 * the engine, this round's or a merge's: from the worktree root, node .tmp-fx/x/gen-inverse-1525.mjs <base> then
 * node .tmp-fx/x/write-inverse-1525.mjs (copies in C:/Users/antho/dukb-handoff/2026-10-10/results-g/r1525-tools).
 */
export const SOCCER_AWARDS_BASE = '41368514';
export const SOCCER_AWARDS_SHA256 = {
  "src/lib/soccerCareerEngine.ts": {
    "head": "66805cfe259b84fafd971cbae2cc3e796c07d5fa0fc8b94f12e62513ab31a7b7",
    "base": "41e017d973ddbff539d6752313ca068cec04a08dbc671a7698728f1d7961650f"
  }
};

/* The rows, in the order they must be applied: each turns one block of this round's engine back into the base's. */
export const SOCCER_AWARDS_ROWS = [
  { name: "awards-engine-1", file: "src/lib/soccerCareerEngine.ts",
    from: "import type { PhoneState, WorldSeason } from \"./soccerPhone\";\n/* Round 1523: morale that plays (src/lib/careerForm.ts). */\nimport { dressingRoomApps, soccerMoraleRating } from \"./careerForm\";",
    to: "import type { PhoneState, WorldSeason } from \"./soccerPhone\";\n/* Round 1523: morale that plays (src/lib/careerForm.ts) and the first season the Puskas Award was given for. */\nimport { dressingRoomApps, soccerMoraleRating } from \"./careerForm\";" },
  { name: "awards-engine-2", file: "src/lib/soccerCareerEngine.ts",
    from: "import { dressingRoomApps, soccerMoraleRating } from \"./careerForm\";\n/* Round 1525: the season awards, won against a field, only in the seasons they were given for. */\nimport { soccerAwardWon, type SoccerAwardSeason, type SoccerSeasonAward } from \"./soccerSeasonAwards\";\n/* Round 134: money stops being a number that only goes up. A savings account,",
    to: "import { dressingRoomApps, soccerMoraleRating } from \"./careerForm\";\nimport { puskasAwardExists } from \"./soccerWorldTruth\";\n/* Round 134: money stops being a number that only goes up. A savings account," },
  { name: "awards-engine-3", file: "src/lib/soccerCareerEngine.ts",
    from: "}\n/* Round 1525: a season's rating reads his overall against his club's average, this much a point. */\nconst RATING_PER_OVERALL = 0.06;\n/** Round 1525: the rating the same season would carry at an elite club, so a national award reads one scale\n *  whatever club he plays for (soccerSeasonAwards.ts). */\nexport function seasonLevel(rating: number, clubTier: number): number {\n  return rating - RATING_PER_OVERALL * (clubAverageRating(1) - clubAverageRating(clubTier));\n}\nfunction calcSeasonRating(position: string, apps: number, goals: number, assists: number, cleanSheets: number, overall: number, clubTier: number, buildDelta = 0): number {",
    to: "}\nfunction calcSeasonRating(position: string, apps: number, goals: number, assists: number, cleanSheets: number, overall: number, clubTier: number, buildDelta = 0): number {" },
  { name: "awards-engine-4", file: "src/lib/soccerCareerEngine.ts",
    from: "  const diff = overall - clubAvg;\n  let base = 6.0 + diff * RATING_PER_OVERALL;\n  if (position === \"GK\") { base += cleanSheets * 0.08; }",
    to: "  const diff = overall - clubAvg;\n  let base = 6.0 + diff * 0.06;\n  if (position === \"GK\") { base += cleanSheets * 0.08; }" },
  { name: "awards-engine-5", file: "src/lib/soccerCareerEngine.ts",
    from: "\n  /* Round 1525: the season awards were a bar on his own numbers and a coin (a 40 goal season lost the Golden Boot\n     seven times in ten). Each is now won against a field drawn on a stream keyed to the career, the season and\n     the award (soccerSeasonAwards.ts, on careerAwards.ts's draw), and only in the seasons it was given for. Every\n     old coin is still drawn, the same ones in the same order, and thrown away (the Round 1329 rule): the sum of\n     them feeds a branch the bundler cannot rule out, so nothing later in the season moves. */\n  const playedBefore = s.seasons.filter(ss => ss.type === \"playing\");\n  const awardSeason: SoccerAwardSeason = {\n    ...season, year: thisYear, position: s.position, age: s.age, level: seasonLevel(season.rating, season.clubTier),\n    prevRating: playedBefore.length >= 2 ? (playedBefore[playedBefore.length - 1]?.rating || 0) : null,\n  };\n  const wonSeasonAward = (award: SoccerSeasonAward): boolean =>\n    soccerAwardWon(award, awardSeason, keyedRng(`${soccerDeckIdentity(s)}|${season.year}|award|${award}`));\n\n  // Player of the Year (domestic)",
    to: "\n  // Player of the Year (domestic)" },
  { name: "awards-engine-6", file: "src/lib/soccerCareerEngine.ts",
    from: "  // Player of the Year (domestic)\n  const poyCoin = season.rating >= 8.0 && s.overall >= 82 ? Math.random() : 0;\n  if (wonSeasonAward(\"Player of the Year\")) {\n    s.awards = [...s.awards, { year: thisYear, name: \"Player of the Year\", emoji: \"🌟\" }];",
    to: "  // Player of the Year (domestic)\n  if (season.rating >= 8.0 && s.overall >= 82 && Math.random() < 0.25) {\n    s.awards = [...s.awards, { year: thisYear, name: \"Player of the Year\", emoji: \"🌟\" }];" },
  { name: "awards-engine-7", file: "src/lib/soccerCareerEngine.ts",
    from: "\n  // Puskás Award (goal of the season): every goal he scored is a chance at it, from 2008-09 (Round 1523's two sources)\n  const puskasCoin = season.goals >= 15 && s.overall >= 80 ? Math.random() : 0;\n  if (wonSeasonAward(\"Puskás Award\")) {\n    s.awards = [...s.awards, { year: thisYear, name: \"Puskás Award\", emoji: \"🎯\" }];",
    to: "\n  /* Puskás Award (best goal of the year), random chance for high-performing attackers. Round 1523: only from the\n     season it was first given for (soccerWorldTruth.ts puskasAwardExists, with its two sources). An earlier\n     season still makes the same draw and throws it away, the Round 1329 rule, so nothing later moves. */\n  const puskasDrawn = season.goals >= 15 && s.overall >= 80 && Math.random() < 0.08;\n  if (puskasDrawn && puskasAwardExists(thisYear)) {\n    s.awards = [...s.awards, { year: thisYear, name: \"Puskás Award\", emoji: \"🎯\" }];" },
  { name: "awards-engine-8", file: "src/lib/soccerCareerEngine.ts",
    from: "\n  // Golden Boot (top league scorer), at a club of the top two tiers\n  const bootCoin = season.goals >= 25 && s.currentClubTier <= 2 ? Math.random() : 0;\n  if (wonSeasonAward(\"Golden Boot\")) {\n    s.awards = [...s.awards, { year: thisYear, name: \"Golden Boot\", emoji: \"👟\" }];",
    to: "\n  // Golden Boot (top league scorer), must be top scorer caliber\n  if (season.goals >= 25 && s.currentClubTier <= 2 && Math.random() < 0.3) {\n    s.awards = [...s.awards, { year: thisYear, name: \"Golden Boot\", emoji: \"👟\" }];" },
  { name: "awards-engine-9", file: "src/lib/soccerCareerEngine.ts",
    from: "\n  // Golden Glove (most clean sheets), keepers only, from 2004-05\n  const gloveCoin = s.position === \"GK\" && season.cleanSheets >= 12 && season.rating >= 7.5 ? Math.random() : 0;\n  if (wonSeasonAward(\"Golden Glove\")) {\n    s.awards = [...s.awards, { year: thisYear, name: \"Golden Glove\", emoji: \"🧤\" }];",
    to: "\n  // Golden Glove (goalkeeper of the year), GK only\n  if (s.position === \"GK\" && season.cleanSheets >= 12 && season.rating >= 7.5 && Math.random() < 0.3) {\n    s.awards = [...s.awards, { year: thisYear, name: \"Golden Glove\", emoji: \"🧤\" }];" },
  { name: "awards-engine-10", file: "src/lib/soccerCareerEngine.ts",
    from: "  // Young Player of the Year, under 23 only\n  const youngCoin = s.age < 23 && season.rating >= 7.5 && s.overall >= 75 ? Math.random() : 0;\n  if (wonSeasonAward(\"Young Player of the Year\")) {\n    s.awards = [...s.awards, { year: thisYear, name: \"Young Player of the Year\", emoji: \"⭐\" }];",
    to: "  // Young Player of the Year, under 23 only\n  if (s.age < 23 && season.rating >= 7.5 && s.overall >= 75 && Math.random() < 0.2) {\n    s.awards = [...s.awards, { year: thisYear, name: \"Young Player of the Year\", emoji: \"⭐\" }];" },
  { name: "awards-engine-11", file: "src/lib/soccerCareerEngine.ts",
    from: "\n  // UEFA Player of the Year, a Champions League winner, only in the seasons UEFA gave it (2010-11 to 2022-23)\n  const uefaCoin = season.championsLeague && season.rating >= 8.0 && s.overall >= 85 ? Math.random() : 0;\n  if (wonSeasonAward(\"UEFA Player of the Year\")) {\n    s.awards = [...s.awards, { year: thisYear, name: \"UEFA Player of the Year\", emoji: \"🇪🇺\" }];",
    to: "\n  // UEFA Player of the Year, elite performances in European competition\n  if (season.championsLeague && season.rating >= 8.0 && s.overall >= 85 && Math.random() < 0.25) {\n    s.awards = [...s.awards, { year: thisYear, name: \"UEFA Player of the Year\", emoji: \"🇪🇺\" }];" },
  { name: "awards-engine-12", file: "src/lib/soccerCareerEngine.ts",
    from: "\n  // Comeback Player of the Year, after a season rated 6.5 or less\n  const comebackCoin = awardSeason.prevRating !== null && awardSeason.prevRating <= 6.5 && season.rating >= 7.8 ? Math.random() : 0;\n  if (wonSeasonAward(\"Comeback Player of the Year\")) {\n    s.awards = [...s.awards, { year: thisYear, name: \"Comeback Player of the Year\", emoji: \"💪\" }];\n    s.events.push(`💪 Won Comeback Player of the Year!`);\n  }",
    to: "\n  // Comeback Player of the Year, significant OVR recovery after a dip\n  const prevSeasons = s.seasons.filter(ss => ss.type === \"playing\");\n  if (prevSeasons.length >= 2) {\n    const prevRating = prevSeasons[prevSeasons.length - 1]?.rating || 0;\n    if (prevRating <= 6.5 && season.rating >= 7.8 && Math.random() < 0.3) {\n      s.awards = [...s.awards, { year: thisYear, name: \"Comeback Player of the Year\", emoji: \"💪\" }];\n      s.events.push(`💪 Won Comeback Player of the Year!`);\n    }\n  }" },
  { name: "awards-engine-13", file: "src/lib/soccerCareerEngine.ts",
    from: "\n  // Fair Play Award, a full season with at most one booking and no red card\n  const fairCoin = season.yellowCards <= 1 && season.redCards === 0 && season.rating >= 7.5 && season.apps >= 25 ? Math.random() : 0;\n  if (wonSeasonAward(\"Fair Play Award\")) {\n    const alreadyFairPlayThisYear = s.awards.some(a => a.name === \"Fair Play Award\" && a.year === thisYear);",
    to: "\n  // Fair Play Award, good conduct season (low cards, high rating)\n  if (season.yellowCards <= 1 && season.redCards === 0 && season.rating >= 7.5 && season.apps >= 25 && Math.random() < 0.1) {\n    const alreadyFairPlayThisYear = s.awards.some(a => a.name === \"Fair Play Award\" && a.year === thisYear);" },
  { name: "awards-engine-14", file: "src/lib/soccerCareerEngine.ts",
    from: "  }\n  if (poyCoin + puskasCoin + bootCoin + gloveCoin + youngCoin + uefaCoin + comebackCoin + fairCoin < 0) s.events.push(\"\");\n",
    to: "  }\n" },
];

export const SOCCER_AWARDS_FILES = Object.keys(SOCCER_AWARDS_SHA256);

/**
 * The attribution switch for a harness that holds this tree to an older base on its own, the
 * scripts/lib/careerLifeChainBF.mjs pattern: each harness names its own variable. Unset is ON (Round 1525 taken out
 * of the bundle compared with the base); an empty value is OFF, the unattributed arm.
 */
export function soccerAwardsOut(envName) {
  const value = process.env[envName];
  return value === undefined || value.trim() !== '';
}

/** One file with Round 1525 alone taken out (LF). A file the round did not edit comes back as it was. */
export function inverseSoccerAwards(relative, source, receipt = []) {
  const rows = SOCCER_AWARDS_ROWS.filter(row => row.file === relative);
  if (rows.length === 0) return source;
  let out = source.split('\r\n').join('\n');
  for (const row of rows) {
    if (out.split(row.from).length !== 2) throw new Error(`the ${row.name} row of Round 1525's inverse must be in ${relative} exactly once at its turn`);
    out = out.replace(row.from, () => row.to);
    receipt.push({ addition: row.name, file: relative });
  }
  return out;
}

/** '' when every row came off once, in order, and the engine was among them. */
export function soccerAwardsReceiptProblem(receipt) {
  const want = SOCCER_AWARDS_ROWS.map(row => row.name).join();
  const got = receipt.map(row => row.addition).join();
  return got === want ? '' : `Round 1525's inverse ran ${got || 'nothing'}, not ${want}`;
}
