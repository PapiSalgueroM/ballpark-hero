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
 * Round 1524 regenerated it by the recipe below (rebuilt, not squashed into the eighth): its rows now also take out
 * Round 1524's engine lines, the club owner's tail (the owner branch of choosePostRetirement, advanceOwnerSeason and
 * its doors, OwnerState's optional fields) and the manager tail's table moved into playDugoutTable draw for draw.
 * Neither moves a career that never buys a club (scripts/simSoccerOwnerTail.mjs section 5 holds them byte equal to
 * the base).
 *
 * Applied IN ORDER to this round's engine they give the base's engine byte for byte (LF):
 *   src/lib/soccerCareerEngine.ts
 *     head sha256 c04bb96bf16fbb687cac94058a804dc96a923474ec26a83577b5891444a8b1c8
 *     base sha256 e37b73f25a17e4c63718430365de87cd1d5a001960ba8257ac674834e691dd90
 * (base: git show e814c2de:<file>, origin/main when the round started, whose engine is the eighth
 * inverse's head), so the recordings and the base pins stay as they were taken: an attribution, not a new recording.
 *
 * Every row is required exactly once at its turn, so this cannot go quietly idle when the source moves under it.
 * Line endings are read as LF by every caller. Rows are regenerated, never hand edited, after any change to the
 * engine (docs/audits/ROUND-1334-NOTES.md holds the recipe).
 */
import assert from 'node:assert/strict';

export const SOCCER_DECK_BASE = 'e814c2def671e07bd6163462dff8ab1230be2000';
export const SOCCER_DECK_SHA256 = {
  "src/lib/soccerCareerEngine.ts": {
    "head": "c04bb96bf16fbb687cac94058a804dc96a923474ec26a83577b5891444a8b1c8",
    "base": "e37b73f25a17e4c63718430365de87cd1d5a001960ba8257ac674834e691dd90"
  }
};
const ENGINE = 'src/lib/soccerCareerEngine.ts';

/* The rows, in the order they must be applied: each turns one block of this round's engine back into the base's. */
const EDITS = [
  { name: "engine-1", file: "src/lib/soccerCareerEngine.ts",
    from: "/* Round 929: every season's league finish, and the era aware elite rule. */\nimport { divisionMove, drawLeagueFinish, eliteInYear, finishZone, leagueKeyInYear, managerLeagueField, MANAGER_FIELD, ordinal, playDugoutTable } from \"./soccerCareerLeague\";\n/* Round 1524: the club owner tail is a lazy chunk behind its gate (src/lib/soccerOwnerGate.ts says why). */\nimport { ownerTail } from \"./soccerOwnerGate\";\nexport { loadOwnerTail, ownerTailReady } from \"./soccerOwnerGate\";\n/* Round 1012: real club rivalries, played as league derbies each season. */",
    to: "/* Round 929: every season's league finish, and the era aware elite rule. */\nimport { divisionMove, drawLeagueFinish, eliteInYear, finishZone, leagueKeyInYear, managerLeagueField, MANAGER_FIELD, ordinal } from \"./soccerCareerLeague\";\n/* Round 1012: real club rivalries, played as league derbies each season. */" },
  { name: "engine-2", file: "src/lib/soccerCareerEngine.ts",
    from: "import { personalGoalMilestone } from \"./soccerCareerMilestone\";\n/* Round 1334: the lazy soccer deck, reached only through its gate (src/lib/soccerDeckGate.ts says why); inert until loaded. */\nimport { soccerDeckPending, soccerDeckSlot } from \"./soccerDeckGate\";\n",
    to: "import { personalGoalMilestone } from \"./soccerCareerMilestone\";\n" },
  { name: "engine-3", file: "src/lib/soccerCareerEngine.ts",
    from: "/* ─── Club Owner System ─── */\n/** Round 1524: where a season's budget goes (soccerCareerOwner.ts). */\nexport type OwnerPlan = \"squad\" | \"youth\" | \"stadium\" | \"debt\";\n/** Round 1524: an owner season carries the dugout's table, the call he made\n *  and what it paid. Every new field is optional: an older row has none. */\nexport type OwnerSeasonRow = ManagerState[\"seasonResults\"][number] & { plan?: OwnerPlan; edge?: number; income?: number };\nexport interface OwnerState {",
    to: "/* ─── Club Owner System ─── */\nexport interface OwnerState {" },
  { name: "engine-4", file: "src/lib/soccerCareerEngine.ts",
    from: "  promotions: number;\n  seasonResults: OwnerSeasonRow[];\n  /* Round 1524, all optional so an owner save from before it loads as it\n     was and plays on from its next season */\n  /** The league the club plays in, moved by the table. */\n  league?: string;\n  /** The call made for the coming season, cleared when it is played. */\n  plan?: OwnerPlan;\n  /** What he paid, the game's estimate, €M. */\n  price?: number;\n  /** What the club owes, €M. */\n  debt?: number;\n  /** The signings' edge on the table, in league points. */\n  squad?: number;\n  /** Academy and ground levels, 0 to 5. */\n  academy?: number;\n  stadium?: number;\n}",
    to: "  promotions: number;\n  seasonResults: { year: number; club: string; tier: number; result: string; trophy: boolean }[];\n}" },
  { name: "engine-5", file: "src/lib/soccerCareerEngine.ts",
    from: "    ...getBootEvents(state, (SPONSORSHIP_TIERS.find(t => t.tier === \"global_ambassador\")?.minFollowers ?? 15_000_000) / 1_000_000),\n    /* Round 1334: a soccer deck card waiting in the batch, so its answer finds its apply ([] unless the deck is loaded). */\n    ...soccerDeckPending(state),\n  ];",
    to: "    ...getBootEvents(state, (SPONSORSHIP_TIERS.find(t => t.tier === \"global_ambassador\")?.minFollowers ?? 15_000_000) / 1_000_000),\n  ];" },
  { name: "engine-6", file: "src/lib/soccerCareerEngine.ts",
    from: "  }\n  /* Round 1334: at most one soccer deck card a summer, from its own keyed stream, FIRST: the old batch keeps its\n     order behind it and the last card answered stays the old batch's last ([] unless the deck is loaded). */\n  picked.unshift(...soccerDeckSlot(state, season, `${soccerDeckIdentity(state)}|${season}|deckslot`, picked));\n  /* Round 725: stamp the season on everything that is about to be shown.",
    to: "  }\n  /* Round 725: stamp the season on everything that is about to be shown." },
  { name: "engine-7", file: "src/lib/soccerCareerEngine.ts",
    from: "/* ─── Post-retirement choices ─── */\nexport function choosePostRetirement(prev: CareerState, choice: PostRetirementChoice, clubs: ClubData[], ownerClub?: string): CareerState {\n  const s = { ...prev };",
    to: "/* ─── Post-retirement choices ─── */\nexport function choosePostRetirement(prev: CareerState, choice: PostRetirementChoice, clubs: ClubData[]): CareerState {\n  const s = { ...prev };" },
  { name: "engine-8", file: "src/lib/soccerCareerEngine.ts",
    from: "  if (choice === \"owner\") {\n    /* Round 1524: he buys the club he picked off the list of clubs for sale\n       (ownerClubsOnSale); a caller that names none gets the list's first,\n       and a name that is not for sale buys nothing. Nothing is bought while\n       the owner tail is not loaded (the page awaits loadOwnerTail first). */\n    const tail = ownerTail();\n    if (!tail) return prev;\n    const forSale = tail.ownerClubsOnSale(prev, clubs);\n    const club = ownerClub === undefined\n      ? forSale[0] ?? { name: \"Unknown FC\", tier: 4, league: \"\", country: \"\", price: tail.OWNER_TIERS[4].price, debt: 0 }\n      : forSale.find(c => c.name === ownerClub);\n    if (!club) return prev;\n    s.netWorth -= club.price;\n    s.ownerState = tail.ownerStart(club);\n    s.events = [...s.events, `🏟️ Bought ${club.name} for €${club.price}M, the game's price for a Tier ${club.tier} club${club.debt > 0 ? `, with €${club.debt}M of debt` : \"\"}.`];\n    s.phase = \"owner_season\";",
    to: "  if (choice === \"owner\") {\n    // Buy a lower-league club\n    const ownerClubs = clubs.filter(c => c.tier >= 3);\n    const club = ownerClubs.length > 0 ? pick(ownerClubs) : { name: \"Unknown FC\", tier: 4 };\n    const purchasePrice = club.tier >= 4 ? 50 : 100; // €50-100M\n    s.netWorth -= purchasePrice;\n    s.ownerState = {\n      club: club.name,\n      clubTier: club.tier,\n      season: 0,\n      budget: 5, // €5M starting transfer budget\n      trophies: 0,\n      promotions: 0,\n      seasonResults: [],\n    };\n    s.events = [...s.events, `🏟️ Purchased ${club.name} for €${purchasePrice}M!`];\n    s.phase = \"owner_season\";" },
  { name: "engine-9", file: "src/lib/soccerCareerEngine.ts",
    from: "  const field: (string | null)[] = [...lf.named, ...Array<null>(Math.max(0, lf.size - 1 - lf.named.length)).fill(null)];\n",
    to: "  const field: (string | null)[] = [...lf.named, ...Array<null>(Math.max(0, lf.size - 1 - lf.named.length)).fill(null)];\n  const games = field.length * 2; // home and away vs each rival\n" },
  { name: "engine-10", file: "src/lib/soccerCareerEngine.ts",
    from: "\n  /* Round 1524: the table itself is playDugoutTable (soccerCareerLeague.ts),\n     which the club owner plays on too; moved there draw for draw. */\n  const { table, me, record } = playDugoutTable(field, ms.club, edge, Math.random);\n  const leagueSize = table.length;",
    to: "\n  /* Points for every club: base spread a real league produces, the player's\n     club nudged by the edge. Position is the SORT of the points, so the\n     table can never disagree with itself. */\n  const maxPts = games * 3;\n  const ptsOf = (bonus: number) => {\n    const r = (Math.random() + Math.random() + Math.random()) / 3; // bell-ish\n    let v = Math.max(Math.round(games * 0.35), Math.min(maxPts, Math.round(games * (0.7 + r * 1.6) + bonus)));\n    /* every total must be reachable in `games` games: 3W + D = v needs\n       W + D <= games, which knocks out totals like 3g - 1 */\n    while ((v - (v % 3)) / 3 + (v % 3) > games) v -= 1;\n    return v;\n  };\n  const rows = field.map(name => ({ club: name ?? \"\", pts: ptsOf(0), you: false, unnamed: name === null }));\n  rows.push({ club: ms.club, pts: ptsOf(edge), you: true, unnamed: false });\n  rows.sort((a, b) => b.pts - a.pts || (a.you ? -1 : 1));\n  const table = rows.map((r, i) => ({ club: r.club, pts: r.pts, pos: i + 1, you: r.you || undefined, unnamed: r.unnamed || undefined }));\n  const me = table.find(r => r.you)!;\n  const leagueSize = table.length;" },
  { name: "engine-11", file: "src/lib/soccerCareerEngine.ts",
    from: "\n  /* The domestic cup: a knockout run, each round a real toss shaded by the",
    to: "\n  /* W-D-L that adds up: 3W + D = pts forces D to share pts's remainder\n     mod 3. ptsOf guarantees the minimal split fits in the games played;\n     a few extra draw-triples go in when there is room, for realism. */\n  let draws = me.pts % 3;\n  for (let k = 0; k < 3; k += 1) {\n    if (Math.random() < 0.6 && (me.pts - (draws + 3)) >= 0 && (me.pts - (draws + 3)) / 3 + (draws + 3) <= games) draws += 3;\n  }\n  const wins = (me.pts - draws) / 3;\n  const losses = games - wins - draws;\n  const record = `${wins}W ${draws}D ${losses}L`;\n\n  /* The domestic cup: a knockout run, each round a real toss shaded by the" },
  { name: "engine-12", file: "src/lib/soccerCareerEngine.ts",
    from: "/* ─── Club Owner Career ─── */\n/* Round 1524: the owner tail is soccerCareerOwner.ts (the list of clubs for\n   sale and the season's call live there too); this is the season itself,\n   which waits for the tail to be loaded. */\nexport function advanceOwnerSeason(prev: CareerState, clubs: readonly ClubData[] = []): CareerState {\n  const tail = ownerTail();\n  if (!tail) return prev;\n  const s = { ...prev };",
    to: "/* ─── Club Owner Career ─── */\nexport function advanceOwnerSeason(prev: CareerState): CareerState {\n  const s = { ...prev };" },
  { name: "engine-13", file: "src/lib/soccerCareerEngine.ts",
    from: "  if (!s.ownerState) return s;\n  const season = s.ownerState.season + 1;\n  const year = (s.seasons[s.seasons.length - 1]?.year ?? 2024) + season;\n  const { os, result, income } = tail.playOwnerSeason(s.ownerState, { clubs, year, key: `${tail.ownerSaveKey(s)}|${s.ownerState.club}|${season}` });\n  s.netWorth += income;\n  s.ownerState = os;",
    to: "  if (!s.ownerState) return s;\n  const os = { ...s.ownerState };\n  os.season += 1;\n  \n  // Transfer budget grows with success\n  os.budget = Math.round((os.budget + rand(1, 3)) * 10) / 10;\n  \n  const promoted = os.clubTier > 1 && Math.random() < 0.25;\n  const wonTrophy = Math.random() < (os.clubTier <= 2 ? 0.15 : 0.10);\n  const relegated = !promoted && os.clubTier < 4 && Math.random() < 0.1;\n  \n  let result = \"\";\n  if (promoted) {\n    os.promotions += 1;\n    os.clubTier -= 1;\n    result = `🎉 Promoted to Tier ${os.clubTier}!`;\n    os.budget += 5;\n  } else if (relegated) {\n    os.clubTier += 1;\n    result = `📉 Relegated to Tier ${os.clubTier}`;\n    os.budget = Math.max(1, os.budget - 3);\n  } else if (wonTrophy) {\n    os.trophies += 1;\n    result = `🏆 Won the league!`;\n    os.budget += 3;\n  } else {\n    const positions = [\"3rd\", \"5th\", \"8th\", \"mid-table\", \"lower half\"];\n    result = `Finished ${pick(positions)}`;\n  }\n  \n  // Revenue from ownership\n  const revenue = os.clubTier === 1 ? 20 : os.clubTier === 2 ? 8 : os.clubTier === 3 ? 3 : 1;\n  s.netWorth += revenue;\n  result += ` · Revenue: €${revenue}M`;\n  \n  os.seasonResults = [...os.seasonResults, { year: os.season, club: os.club, tier: os.clubTier, result, trophy: wonTrophy }];\n  s.ownerState = os;" },
];

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
