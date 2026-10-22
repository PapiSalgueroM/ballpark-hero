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
 * Applied IN ORDER to this round's engine they give the base's engine byte for byte (LF):
 *   src/lib/soccerCareerEngine.ts
 *     head sha256 0b3d35bc584867da38ced517c5d2ed9c2507fbced8c200c916f5b830ed39d5a1
 *     base sha256 e37b73f25a17e4c63718430365de87cd1d5a001960ba8257ac674834e691dd90
 * (base: git show e814c2de:<file>, origin/main when the round started, whose engine is the eighth
 * inverse's head), so the recordings and the base pins stay as they were taken: an attribution, not a new recording.
 *
 * Every row is required exactly once at its turn, so this cannot go quietly idle when the source moves under it.
 * Line endings are read as LF by every caller. Rows are regenerated, never hand edited, after any change to the
 * engine (docs/audits/ROUND-1334-NOTES.md holds the recipe).
 *
 * Round 1524 (the club owner tail) moved the engine after this file was written. Its rows live in their own file,
 * scripts/lib/careerSoccerOwner1524.mjs (with its own pins), and come off FIRST inside the functions below, so every
 * importer of this file takes 1524 and then 1334 out, in that order, with one receipt. This file's own rows and pins
 * are unchanged: 1524's rows give back exactly the head pinned above.
 */
import assert from 'node:assert/strict';
import { SOCCER_OWNER_ROWS } from './careerSoccerOwner1524.mjs';

export const SOCCER_DECK_BASE = 'e814c2def671e07bd6163462dff8ab1230be2000';
export const SOCCER_DECK_SHA256 = {
  "src/lib/soccerCareerEngine.ts": {
    "head": "0b3d35bc584867da38ced517c5d2ed9c2507fbced8c200c916f5b830ed39d5a1",
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
    from: "    ...getBootEvents(state, (SPONSORSHIP_TIERS.find(t => t.tier === \"global_ambassador\")?.minFollowers ?? 15_000_000) / 1_000_000),\n    /* Round 1334: a soccer deck card waiting in the batch, so its answer finds its apply ([] unless the deck is loaded). */\n    ...soccerDeckPending(state),\n  ];",
    to: "    ...getBootEvents(state, (SPONSORSHIP_TIERS.find(t => t.tier === \"global_ambassador\")?.minFollowers ?? 15_000_000) / 1_000_000),\n  ];" },
  { name: "engine-3", file: "src/lib/soccerCareerEngine.ts",
    from: "  }\n  /* Round 1334: at most one soccer deck card a summer, from its own keyed stream, FIRST: the old batch keeps its\n     order behind it and the last card answered stays the old batch's last ([] unless the deck is loaded). */\n  picked.unshift(...soccerDeckSlot(state, season, `${soccerDeckIdentity(state)}|${season}|deckslot`, picked));\n  /* Round 725: stamp the season on everything that is about to be shown.",
    to: "  }\n  /* Round 725: stamp the season on everything that is about to be shown." },
];
/* Round 1524: its rows first, then this round's, every row once at its turn. */
const EDITS = [...SOCCER_OWNER_ROWS, ...OWN_EDITS];

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
