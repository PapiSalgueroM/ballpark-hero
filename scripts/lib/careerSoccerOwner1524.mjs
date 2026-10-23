/* Round 1524: an inverse of the Soccer Career history harnesses, the club owner tail.
 *
 * Round 1524 gives the club owner a list of clubs for sale, the dugout's own table for his seasons and one budget
 * call a season (src/lib/soccerCareerOwner.ts, a lazy chunk behind src/lib/soccerOwnerGate.ts), and moves the
 * manager tail's table into playDugoutTable (soccerCareerLeague.ts) draw for draw. No career that never buys a club
 * moves (scripts/simSoccerOwnerTail.mjs section 6 holds them byte equal to the base), but any engine byte moves the
 * ninth's head pin, so every harness that holds whole careers to an older engine or a recording takes this round
 * out first: an attribution, not a new recording. The tenth on this branch; whichever of the rounds that each bring
 * one (1519, 1523, 1524) merges later regenerates its own in front of the others'.
 *
 * These rows are applied by scripts/lib/careerSoccerDeck1334.mjs (the ninth) IN FRONT of its own, inside the same
 * functions, so its seventeen importers take all of them out in order without a second wiring. On Release BP they
 * come off FIRST, in front of Round 1523's (scripts/lib/careerSoccerMorale1523.mjs). The ninth's own rows are
 * untouched (never squashed into one). Applied IN ORDER to this round's engine they give Round 1523's head byte for
 * byte (LF):
 *   src/lib/soccerCareerEngine.ts
 *     head sha256 c03243cdfa78f534caecb81bae82b93f9c0036aa9acd8acfdd0dccfa72a1f3c6
 *     base sha256 5619bf28ceb3fa07561d0c667a09de411439c488acb0170b45dae2fbc49bf990
 * (base: git show e4464a1e:<file>, the Release BP head the round was merged onto, after Rounds 1519
 * and 1523, whose engine is Round 1523's head pin; regenerated at that merge). Every row is required exactly once at its turn. Rows are regenerated, never hand edited, after any
 * change to the engine, this round's or a merge's: from the worktree root, node .tmp-fx/x/gen-inverse-1524.mjs <base>
 * then node .tmp-fx/x/write-inverse-1524.mjs (copies in C:/Users/antho/dukb-handoff/2026-10-10/results-g/r1524-tools).
 */
export const SOCCER_OWNER_BASE = 'e4464a1e03846a5ffca011d203268b22fb144f2e';
export const SOCCER_OWNER_SHA256 = {
  "src/lib/soccerCareerEngine.ts": {
    "head": "c03243cdfa78f534caecb81bae82b93f9c0036aa9acd8acfdd0dccfa72a1f3c6",
    "base": "5619bf28ceb3fa07561d0c667a09de411439c488acb0170b45dae2fbc49bf990"
  }
};

/* The rows, in the order they must be applied: each turns one block of this round's engine back into the base's. */
export const SOCCER_OWNER_ROWS = [
  { name: "owner-engine-1", file: "src/lib/soccerCareerEngine.ts",
    from: "/* Round 929: every season's league finish, and the era aware elite rule. */\nimport { divisionMove, drawLeagueFinish, eliteInYear, finishZone, leagueKeyInYear, managerLeagueField, MANAGER_FIELD, ordinal, playDugoutTable } from \"./soccerCareerLeague\";\n/* Round 1524: the club owner tail is a lazy chunk behind its gate (src/lib/soccerOwnerGate.ts says why). */\nimport { ownerTail } from \"./soccerOwnerGate\";\nexport { loadOwnerTail, ownerTailReady } from \"./soccerOwnerGate\";\n/* Round 1012: real club rivalries, played as league derbies each season. */",
    to: "/* Round 929: every season's league finish, and the era aware elite rule. */\nimport { divisionMove, drawLeagueFinish, eliteInYear, finishZone, leagueKeyInYear, managerLeagueField, MANAGER_FIELD, ordinal } from \"./soccerCareerLeague\";\n/* Round 1012: real club rivalries, played as league derbies each season. */" },
  { name: "owner-engine-2", file: "src/lib/soccerCareerEngine.ts",
    from: "/* ─── Club Owner System ─── */\n/** Round 1524: where a season's budget goes (soccerCareerOwner.ts). */\nexport type OwnerPlan = \"squad\" | \"youth\" | \"stadium\" | \"debt\";\n/** Round 1524: an owner season carries the dugout's table, the call he made\n *  and what it paid. Every new field is optional: an older row has none. */\nexport type OwnerSeasonRow = ManagerState[\"seasonResults\"][number] & { plan?: OwnerPlan; edge?: number; income?: number };\nexport interface OwnerState {",
    to: "/* ─── Club Owner System ─── */\nexport interface OwnerState {" },
  { name: "owner-engine-3", file: "src/lib/soccerCareerEngine.ts",
    from: "  promotions: number;\n  seasonResults: OwnerSeasonRow[];\n  /* Round 1524, all optional so an owner save from before it loads as it\n     was and plays on from its next season */\n  /** The league the club plays in, moved by the table. */\n  league?: string;\n  /** The call made for the coming season, cleared when it is played. */\n  plan?: OwnerPlan;\n  /** What he paid, the game's estimate, €M. */\n  price?: number;\n  /** What the club owes, €M. */\n  debt?: number;\n  /** The signings' edge on the table, in league points. */\n  squad?: number;\n  /** Academy and ground levels, 0 to 5. */\n  academy?: number;\n  stadium?: number;\n}",
    to: "  promotions: number;\n  seasonResults: { year: number; club: string; tier: number; result: string; trophy: boolean }[];\n}" },
  { name: "owner-engine-4", file: "src/lib/soccerCareerEngine.ts",
    from: "/* ─── Post-retirement choices ─── */\nexport function choosePostRetirement(prev: CareerState, choice: PostRetirementChoice, clubs: ClubData[], ownerClub?: string): CareerState {\n  const s = { ...prev };",
    to: "/* ─── Post-retirement choices ─── */\nexport function choosePostRetirement(prev: CareerState, choice: PostRetirementChoice, clubs: ClubData[]): CareerState {\n  const s = { ...prev };" },
  { name: "owner-engine-5", file: "src/lib/soccerCareerEngine.ts",
    from: "  if (choice === \"owner\") {\n    /* Round 1524: he buys the club he picked off the list of clubs for sale\n       (ownerClubsOnSale); a caller that names none gets the list's first,\n       and a name that is not for sale buys nothing. Nothing is bought while\n       the owner tail is not loaded (the page awaits loadOwnerTail first). */\n    return ownerTail()?.ownerBuy(s, clubs, ownerClub) ?? prev;\n  }",
    to: "  if (choice === \"owner\") {\n    // Buy a lower-league club\n    const ownerClubs = clubs.filter(c => c.tier >= 3);\n    const club = ownerClubs.length > 0 ? pick(ownerClubs) : { name: \"Unknown FC\", tier: 4 };\n    const purchasePrice = club.tier >= 4 ? 50 : 100; // €50-100M\n    s.netWorth -= purchasePrice;\n    s.ownerState = {\n      club: club.name,\n      clubTier: club.tier,\n      season: 0,\n      budget: 5, // €5M starting transfer budget\n      trophies: 0,\n      promotions: 0,\n      seasonResults: [],\n    };\n    s.events = [...s.events, `🏟️ Purchased ${club.name} for €${purchasePrice}M!`];\n    s.phase = \"owner_season\";\n    return s;\n  }" },
  { name: "owner-engine-6", file: "src/lib/soccerCareerEngine.ts",
    from: "  const field: (string | null)[] = [...lf.named, ...Array<null>(Math.max(0, lf.size - 1 - lf.named.length)).fill(null)];\n",
    to: "  const field: (string | null)[] = [...lf.named, ...Array<null>(Math.max(0, lf.size - 1 - lf.named.length)).fill(null)];\n  const games = field.length * 2; // home and away vs each rival\n" },
  { name: "owner-engine-7", file: "src/lib/soccerCareerEngine.ts",
    from: "\n  /* Round 1524: the table itself is playDugoutTable (soccerCareerLeague.ts),\n     which the club owner plays on too; moved there draw for draw. */\n  const { table, me, record } = playDugoutTable(field, ms.club, edge, Math.random);\n  const leagueSize = table.length;",
    to: "\n  /* Points for every club: base spread a real league produces, the player's\n     club nudged by the edge. Position is the SORT of the points, so the\n     table can never disagree with itself. */\n  const maxPts = games * 3;\n  const ptsOf = (bonus: number) => {\n    const r = (Math.random() + Math.random() + Math.random()) / 3; // bell-ish\n    let v = Math.max(Math.round(games * 0.35), Math.min(maxPts, Math.round(games * (0.7 + r * 1.6) + bonus)));\n    /* every total must be reachable in `games` games: 3W + D = v needs\n       W + D <= games, which knocks out totals like 3g - 1 */\n    while ((v - (v % 3)) / 3 + (v % 3) > games) v -= 1;\n    return v;\n  };\n  const rows = field.map(name => ({ club: name ?? \"\", pts: ptsOf(0), you: false, unnamed: name === null }));\n  rows.push({ club: ms.club, pts: ptsOf(edge), you: true, unnamed: false });\n  rows.sort((a, b) => b.pts - a.pts || (a.you ? -1 : 1));\n  const table = rows.map((r, i) => ({ club: r.club, pts: r.pts, pos: i + 1, you: r.you || undefined, unnamed: r.unnamed || undefined }));\n  const me = table.find(r => r.you)!;\n  const leagueSize = table.length;" },
  { name: "owner-engine-8", file: "src/lib/soccerCareerEngine.ts",
    from: "\n  /* The domestic cup: a knockout run, each round a real toss shaded by the",
    to: "\n  /* W-D-L that adds up: 3W + D = pts forces D to share pts's remainder\n     mod 3. ptsOf guarantees the minimal split fits in the games played;\n     a few extra draw-triples go in when there is room, for realism. */\n  let draws = me.pts % 3;\n  for (let k = 0; k < 3; k += 1) {\n    if (Math.random() < 0.6 && (me.pts - (draws + 3)) >= 0 && (me.pts - (draws + 3)) / 3 + (draws + 3) <= games) draws += 3;\n  }\n  const wins = (me.pts - draws) / 3;\n  const losses = games - wins - draws;\n  const record = `${wins}W ${draws}D ${losses}L`;\n\n  /* The domestic cup: a knockout run, each round a real toss shaded by the" },
  { name: "owner-engine-9", file: "src/lib/soccerCareerEngine.ts",
    from: "/* ─── Club Owner Career ─── */\n/* Round 1524: the owner tail is soccerCareerOwner.ts (the list of clubs for\n   sale and the season's call live there too); this is the season itself,\n   which waits for the tail to be loaded. */\nexport function advanceOwnerSeason(prev: CareerState, clubs: readonly ClubData[] = []): CareerState {\n  const s = ownerTail()?.ownerSeason(prev, clubs);\n  if (!s) return prev;\n  applyRetirementMoneySeason(s, s.ownerState!.season);\n  return s;",
    to: "/* ─── Club Owner Career ─── */\nexport function advanceOwnerSeason(prev: CareerState): CareerState {\n  const s = { ...prev };\n  if (!s.ownerState) return s;\n  const os = { ...s.ownerState };\n  os.season += 1;\n  \n  // Transfer budget grows with success\n  os.budget = Math.round((os.budget + rand(1, 3)) * 10) / 10;\n  \n  const promoted = os.clubTier > 1 && Math.random() < 0.25;\n  const wonTrophy = Math.random() < (os.clubTier <= 2 ? 0.15 : 0.10);\n  const relegated = !promoted && os.clubTier < 4 && Math.random() < 0.1;\n  \n  let result = \"\";\n  if (promoted) {\n    os.promotions += 1;\n    os.clubTier -= 1;\n    result = `🎉 Promoted to Tier ${os.clubTier}!`;\n    os.budget += 5;\n  } else if (relegated) {\n    os.clubTier += 1;\n    result = `📉 Relegated to Tier ${os.clubTier}`;\n    os.budget = Math.max(1, os.budget - 3);\n  } else if (wonTrophy) {\n    os.trophies += 1;\n    result = `🏆 Won the league!`;\n    os.budget += 3;\n  } else {\n    const positions = [\"3rd\", \"5th\", \"8th\", \"mid-table\", \"lower half\"];\n    result = `Finished ${pick(positions)}`;\n  }\n  \n  // Revenue from ownership\n  const revenue = os.clubTier === 1 ? 20 : os.clubTier === 2 ? 8 : os.clubTier === 3 ? 3 : 1;\n  s.netWorth += revenue;\n  result += ` · Revenue: €${revenue}M`;\n  \n  os.seasonResults = [...os.seasonResults, { year: os.season, club: os.club, tier: os.clubTier, result, trophy: wonTrophy }];\n  s.ownerState = os;\n  s.events = [...s.events, `🏟️ Owner Season ${os.season} at ${os.club}: ${result}`];\n  applyRetirementMoneySeason(s, os.season);\n\n  return s;" },
];

export const SOCCER_OWNER_FILES = Object.keys(SOCCER_OWNER_SHA256);

/**
 * The attribution switch for a harness that holds this tree to an older base on its own (not through the ninth),
 * the scripts/lib/careerLifeChainBF.mjs pattern: each harness names its own variable. Unset is ON (Round 1524 taken
 * out of the bundle compared with the base); an empty value is OFF, the unattributed arm, red on this head by design,
 * which is how the attribution is shown to be the only change.
 */
export function soccerOwnerOut(envName) {
  const value = process.env[envName];
  return value === undefined || value.trim() !== '';
}

/** One file with Round 1524 alone taken out (LF). A file the round did not edit comes back as it was. */
export function inverseSoccerOwner(relative, source, receipt = []) {
  const rows = SOCCER_OWNER_ROWS.filter(row => row.file === relative);
  if (rows.length === 0) return source;
  let out = source.split('\r\n').join('\n');
  for (const row of rows) {
    if (out.split(row.from).length !== 2) throw new Error(`the ${row.name} row of Round 1524's inverse must be in ${relative} exactly once at its turn`);
    out = out.replace(row.from, () => row.to);
    receipt.push({ addition: row.name, file: relative });
  }
  return out;
}

/** '' when every row came off once, in order, in every file the receipt names, and the engine was among them. */
export function soccerOwnerReceiptProblem(receipt) {
  const want = SOCCER_OWNER_ROWS.map(row => row.name).join();
  const got = receipt.map(row => row.addition).join();
  return got === want ? '' : `Round 1524's inverse ran ${got || 'nothing'}, not ${want}`;
}
