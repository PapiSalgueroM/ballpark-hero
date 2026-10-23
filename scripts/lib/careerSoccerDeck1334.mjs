/* Round 1334: the ninth inverse of the Soccer Career history harnesses.
 *
 * The harnesses that hold whole Soccer careers to an older engine (they replay a recording, or compare the engine
 * with the tree their round was cut from) already take eight earlier changes out of a COPY of the source, the
 * newest being Round 1329's world truth (scripts/lib/careerWorldTruth1329.mjs). This one goes in front of that one.
 *
 * Round 1334 binds the shared deck to Soccer Career, DARK: three engine lines (the gate's import, a spread at the
 * end of getAllEvents, one slot line in generateRandomEvents before the stamp) that return [] until something
 * loads the deck, and nothing in the game loads it yet. So no seeded career moves (scripts/simSoccerDeck.mjs
 * section 2 holds every save and the Math.random count byte equal to the base), but any engine byte moves the
 * eighth inverse's head pin, so the harnesses that check it need these rows taken out first.
 *
 * Round 1519 regenerated the rows by the recipe below, after its engine change (reconcileRetirement and its call
 * in repairCareer, the summary's Continue, the declined suggestion on a retired career). Those hunks are rows here
 * too, so the chain still ends on the same base pins; scripts/simSoccerCareerEndings.mjs section D holds that no
 * seeded career on the default path moves. The page's new import, retirementReason, lives in its own module
 * (src/lib/soccerCareerRetirementReason.ts), so a page bundled with the older engine still finds it.
 *
 * Applied IN ORDER to this round's engine they give the base's engine byte for byte (LF):
 *   src/lib/soccerCareerEngine.ts
 *     head sha256 90e8fc573532e8388b7d3a745e88550031ceca990e1717b43651ec281ace115a
 *     base sha256 e37b73f25a17e4c63718430365de87cd1d5a001960ba8257ac674834e691dd90
 * (base: git show e814c2de:<file>, origin/main when the round started, whose engine is the eighth
 * inverse's head), so the recordings and the base pins stay as they were taken: an attribution, not a new recording.
 *
 * Every row is required exactly once at its turn, so this cannot go quietly idle when the source moves under it.
 * Line endings are read as LF by every caller. Rows are regenerated, never hand edited, after any change to the
 * engine (docs/audits/ROUND-1334-NOTES.md holds the recipe).
 *
 * Round 1523 (morale that plays, the Puskas year) moved the engine after this file was written. Its rows live in
 * their own file, scripts/lib/careerSoccerMorale1523.mjs (the tenth inverse, with its own pins), and come off
 * inside the functions below, in front of this file's own rows.
 *
 * Round 1524 (the club owner tail) moved the engine after that. Its rows live in their own file,
 * scripts/lib/careerSoccerOwner1524.mjs (with its own pins), and come off FIRST of all. On Release BP, where 1524 was
 * merged after 1523, its rows were regenerated against the merged engine, so they give back 1523's head, 1523's give
 * back the head pinned above, and every importer of this file takes 1524, then 1523, then 1334 out, in that order,
 * with one receipt. This file's own rows and pins are unchanged.
 */
import assert from 'node:assert/strict';
import { SOCCER_MORALE_ROWS } from './careerSoccerMorale1523.mjs';
import { SOCCER_OWNER_ROWS } from './careerSoccerOwner1524.mjs';

export const SOCCER_DECK_BASE = 'e814c2def671e07bd6163462dff8ab1230be2000';
export const SOCCER_DECK_SHA256 = {
  "src/lib/soccerCareerEngine.ts": {
    "head": "90e8fc573532e8388b7d3a745e88550031ceca990e1717b43651ec281ace115a",
    "base": "e37b73f25a17e4c63718430365de87cd1d5a001960ba8257ac674834e691dd90"
  }
};
const ENGINE = 'src/lib/soccerCareerEngine.ts';

/* The rows, in the order they must be applied: each turns one block of this round's engine back into the base's. */
const OWN_EDITS = [
  { name: "engine-1", file: "src/lib/soccerCareerEngine.ts",
    from: "import { personalGoalMilestone } from \"./soccerCareerMilestone\";\n/* Round 1334: the lazy soccer deck, reached only through its gate (src/lib/soccerDeckGate.ts says why); inert until loaded. */\nimport { soccerDeckPending, soccerDeckSlot } from \"./soccerDeckGate\";\n",
    to: "import { personalGoalMilestone } from \"./soccerCareerMilestone\";\n" },
  { name: "engine-2", file: "src/lib/soccerCareerEngine.ts",
    from: "\n/**\n * Round 1519, a player report: \"i retired at 26 no injury no choice\". No step of\n * the engine ends a career before the age rules (33 with an overall under 50, or\n * 45) without the player: every way in is listed and driven in\n * scripts/simSoccerCareerEndings.mjs. The save could. isSoccerCareerSave checks\n * the retired flag and the phase one at a time and nothing put a pair that\n * disagrees back together, so a flag left on a playing career sent it straight\n * to the retired screen at the next summary, at any age, with no ceremony and no\n * choice of what comes next.\n *\n * So the rest of the save decides, never the flag alone. Every real retirement\n * leaves its legacy, and most leave a retired season row or the after career it\n * chose. With any of those the retirement stands: the flag comes back if it was\n * lost, and a playing phase goes back to the ceremony and its choices (or to the\n * after career already chosen: its season, or the retired screen). With none of\n * them the flag is the stray part, and the career plays on from Next Season,\n * including a save the old hop already put on the retired screen. A ceremony\n * that lost its legacy gets it back, since the card cannot draw without it. Any\n * other save whose flag and phase agree is left exactly as it is. Returns\n * whether the career is retired afterwards.\n *\n * Measured over 720 seeded careers in six ways of playing (three seed bases):\n * none ended before the age rules unless the player retired, took the\n * suggestion or played out a farewell he announced, and all 720 were alive at\n * 26 and 27; bans, drug test bans, trials and prison years all played on.\n */\nconst POST_CAREER_PHASES: CareerState[\"phase\"][] = [\"retirement_ceremony\", \"post_retirement\", \"retired\", \"manager_season\", \"pundit_season\", \"owner_season\"];\nfunction reconcileRetirement(s: CareerState): boolean {\n  /* A state with no flag at all (a hand built harness fixture; the loader refuses a save like that) says\n     nothing about the pair, so it is left alone. */\n  if (typeof s.retired !== \"boolean\") return false;\n  const post = POST_CAREER_PHASES.includes(s.phase);\n  const backed = !!(s.legacy || s.postRetirementChoice || s.managerState || s.punditState || s.ownerState\n    || s.seasons?.some(row => row?.type === \"retired\"));\n  /* The old summary hop wrote the flag AND the retired screen, a pair that agrees. Every real road to that\n     screen leaves a legacy or a chosen after career, so the screen with nothing behind it is the stray flag's\n     too, and that career plays on as well. A lost phase on a chosen manager, pundit or owner career goes back\n     to that career's season, never to the end. */\n  if (s.retired !== post || (s.phase === \"retired\" && !backed)) {\n    s.retired = backed;\n    const c = s.postRetirementChoice;\n    if (backed && !post) s.phase = !c ? \"retirement_ceremony\" : c !== \"retire\" && s[`${c}State` as const] ? `${c}_season` as const : \"retired\";\n    if (!backed && post) s.phase = s.seasons?.[s.seasons.length - 1]?.type === \"youth\" ? \"youth\" : \"playing\";\n  }\n  if (s.retired && s.phase === \"retirement_ceremony\" && !s.legacy) s.legacy = calculateLegacy(s);\n  return s.retired;\n}\n\n/**",
    to: "\n/**" },
  { name: "engine-3", file: "src/lib/soccerCareerEngine.ts",
    from: "  if (s.phase === \"season_summary\" && !s.pendingSummary) s.phase = \"playing\";\n  reconcileRetirement(s);\n  if (!s.primeType) s.primeType = rollPrimeType();",
    to: "  if (s.phase === \"season_summary\" && !s.pendingSummary) s.phase = \"playing\";\n  if (!s.primeType) s.primeType = rollPrimeType();" },
  { name: "engine-4", file: "src/lib/soccerCareerEngine.ts",
    from: "    ...getBootEvents(state, (SPONSORSHIP_TIERS.find(t => t.tier === \"global_ambassador\")?.minFollowers ?? 15_000_000) / 1_000_000),\n    /* Round 1334: a soccer deck card waiting in the batch, so its answer finds its apply ([] unless the deck is loaded). */\n    ...soccerDeckPending(state),\n  ];",
    to: "    ...getBootEvents(state, (SPONSORSHIP_TIERS.find(t => t.tier === \"global_ambassador\")?.minFollowers ?? 15_000_000) / 1_000_000),\n  ];" },
  { name: "engine-5", file: "src/lib/soccerCareerEngine.ts",
    from: "  }\n  /* Round 1334: at most one soccer deck card a summer, from its own keyed stream, FIRST: the old batch keeps its\n     order behind it and the last card answered stays the old batch's last ([] unless the deck is loaded). */\n  picked.unshift(...soccerDeckSlot(state, season, `${soccerDeckIdentity(state)}|${season}|deckslot`, picked));\n  /* Round 725: stamp the season on everything that is about to be shown.",
    to: "  }\n  /* Round 725: stamp the season on everything that is about to be shown." },
  { name: "engine-6", file: "src/lib/soccerCareerEngine.ts",
    from: "  const s = { ...prev }; s.pendingSummary = null;\n  /* Round 1519: a retired career goes to its ceremony and its choices (or the screen it already chose),\n     and a stray flag with nothing behind it plays on. This used to send any flag straight to the retired\n     screen, which is the one way a career could end at 26 with no choice (reconcileRetirement says why). */\n  if (s.retired && reconcileRetirement(s)) return s;\n  return advanceToNextPhase(s, clubs);",
    to: "  const s = { ...prev }; s.pendingSummary = null;\n  if (s.retired) { s.phase = \"retired\"; return s; }\n  return advanceToNextPhase(s, clubs);" },
  { name: "engine-7", file: "src/lib/soccerCareerEngine.ts",
    from: "  if (prev.phase !== \"retirement_suggestion\" || prev.retired) {\n    /* Round 1519: a retirement the repair stood up keeps its screen, never retired on Next Season. */\n    if (!s.retired) s.phase = \"playing\";\n    return s;",
    to: "  if (prev.phase !== \"retirement_suggestion\" || prev.retired) {\n    s.phase = \"playing\";\n    return s;" },
];
/* Rounds 1524 and 1523 (Release BP): 1524's rows first, then 1523's, then this round's, every row once at its turn. */
const EDITS = [...SOCCER_OWNER_ROWS, ...SOCCER_MORALE_ROWS, ...OWN_EDITS];

export const SOCCER_DECK_FILES = Object.keys(SOCCER_DECK_SHA256);
export const SOCCER_DECK_ADDITIONS = EDITS.map(row => row.name);

/** The rows as patches ({ id, addition, file, from, to }), for a harness that applies a list in order. */
export function soccerDeckPatches() {
  return EDITS.map(row => ({ id: `soccer-deck-${row.name}`, addition: row.name, file: row.file, from: row.from, to: row.to }));
}

/**
 * One bundled file with Round 1334 taken out. `relative` is the file's path from the repo root; a file this round
 * did not edit comes back as it was. `receipt` gains one row per edit made, for the harness's proof.
 */
export function inverseSoccerDeck(relative, source, receipt = []) {
  const rows = EDITS.filter(row => row.file === relative);
  if (rows.length === 0) return source;
  let out = source.split('\r\n').join('\n');
  for (const row of rows) {
    assert.equal(out.split(row.from).length, 2, `the ${row.name} row of Round 1334's inverse must be in ${relative} exactly once at its turn`);
    out = out.replace(row.from, () => row.to);
    receipt.push({ addition: row.name, file: relative });
  }
  return out;
}

/**
 * An esbuild plugin that loads `files` (paths from the repo root) of the tree at `root` with Round 1334 taken
 * out, for a bundle whose other plugins do not already load them. `receipt` gains one row per edit made.
 */
export function soccerDeckOutPlugin(root, pathMod, fsMod, receipt = [], files = SOCCER_DECK_FILES) {
  const targets = new Map(files.map(file => [pathMod.resolve(root, file).split(pathMod.sep).join('/').toLowerCase(), file]));
  return { name: 'soccer-deck-out', setup(b) {
    b.onLoad({ filter: /\.(ts|tsx)$/ }, args => {
      const relative = targets.get(pathMod.resolve(args.path).split(pathMod.sep).join('/').toLowerCase());
      if (!relative) return undefined;
      return { contents: inverseSoccerDeck(relative, fsMod.readFileSync(args.path, 'utf8'), receipt), loader: relative.endsWith('.tsx') ? 'tsx' : 'ts' };
    });
  } };
}

/**
 * What is wrong with a receipt, or '' when nothing is: every file the bundle loaded had all its rows applied once,
 * in order, and the engine was among them.
 */
export function soccerDeckReceiptProblem(receipt, required = [ENGINE]) {
  const seen = new Map();
  for (const row of receipt) seen.set(row.file, [...(seen.get(row.file) || []), row.addition]);
  for (const file of required) if (!seen.has(file)) return `Round 1334's inverse never ran on ${file}`;
  for (const [file, got] of seen) {
    const want = EDITS.filter(row => row.file === file).map(row => row.name);
    if (got.join() !== want.join()) return `Round 1334's inverse ran ${got.join(' ')} on ${file}, not ${want.join(' ')}`;
  }
  return '';
}
