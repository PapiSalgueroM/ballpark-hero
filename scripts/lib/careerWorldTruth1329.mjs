/* Round 1329: the eighth inverse of the Soccer Career history harnesses.
 *
 * The harnesses that hold whole Soccer careers to an older engine (they replay a recording, or compare the engine
 * with the tree their round was cut from) already take seven earlier changes out of a COPY of the source, the
 * newest being Round 1327's event deck (scripts/lib/careerDeckFair1327.mjs). This one goes in front of that one.
 *
 * Round 1329 changes what Soccer Career says about the real world, on purpose: Player of the Month is won on the
 * month's football by position with the month's own year (a keyed stream decides it; the old lottery's draws are
 * still made and thrown away), the phone's world no longer moves real men or invents their goal tallies and re seats
 * each one at his era club every season (so the Ballon d'Or night finds him there), its feed names nobody's results
 * in a season that happened, the season log and the International panel name a tournament's winner only for a
 * summer still to come or finals he played, and the phone's quiz asks about the world only where it is the game's
 * own. Every seeded career's Math.random stream is where it was (scripts/simSoccerWorldTruth.mjs section 2), but
 * the awards, the log lines, the phone's map, its feed and the night's nominee clubs move, so a recording compared
 * field by field needs these rows taken out again.
 *
 * Applied IN ORDER to the four files of this round's head they give the base's four files byte for byte (LF):
 *   src/lib/soccerCareerEngine.ts
 *     head sha256 1a1c05feb120de043944ef45ec0880ed53e38f6b324e28889de2064fddd623ef
 *     base sha256 44f323390d962fc10fd760c593cae47b23175bab676ff4fe0a9dfb3a48bb0900
 *   src/lib/soccerPhone.ts
 *     head sha256 d7f3dd3784f08699af763eee7ac1cf5c960408fa7231940615901d3dbd36390b
 *     base sha256 43c30266828c0d6ed77fd061b29a0a14e70c44d73f157b859ef6f1c15a875000
 *   src/lib/soccerArcade.ts
 *     head sha256 9b6bb4f82528546cb3a0aead7e43b6f2f31388c308a9e799656b66a99e3786cd
 *     base sha256 bc8301f8b1405f6e4c037d6a04f13551fa8751031bdf4aa351fab378d02fd3d8
 *   src/components/soccer-career/InternationalPanel.tsx
 *     head sha256 872a55fb5a772279f263611b040afcbfb25dcecdcf6cc5586794370e487c993b
 *     base sha256 df3dd4e16e8a046a6928c832068a2e92f3ecbf15504eeb32fcbf598d59b66bb7
 * (base: git show c5fc5470:<file>, origin/release-bc-gate when the round started), so the recordings
 * and the base pins stay as they were taken: this is an attribution, not a new recording.
 * scripts/simSoccerWorldTruth.mjs section 6 proves every value on every run.
 *
 * Every row is required exactly once at its turn, so this cannot go quietly idle when the source moves under it.
 * Line endings are read as LF by every caller. Rows are regenerated, never hand edited, after any change to the
 * four files (docs/audits/ROUND-1329-NOTES.md holds the recipe).
 */
import assert from 'node:assert/strict';

export const WORLD_TRUTH_BASE = 'c5fc5470b3e377f22d6d538f459b9f5310b08dd0';
export const WORLD_TRUTH_SHA256 = {
  "src/lib/soccerCareerEngine.ts": {
    "head": "1a1c05feb120de043944ef45ec0880ed53e38f6b324e28889de2064fddd623ef",
    "base": "44f323390d962fc10fd760c593cae47b23175bab676ff4fe0a9dfb3a48bb0900"
  },
  "src/lib/soccerPhone.ts": {
    "head": "d7f3dd3784f08699af763eee7ac1cf5c960408fa7231940615901d3dbd36390b",
    "base": "43c30266828c0d6ed77fd061b29a0a14e70c44d73f157b859ef6f1c15a875000"
  },
  "src/lib/soccerArcade.ts": {
    "head": "9b6bb4f82528546cb3a0aead7e43b6f2f31388c308a9e799656b66a99e3786cd",
    "base": "bc8301f8b1405f6e4c037d6a04f13551fa8751031bdf4aa351fab378d02fd3d8"
  },
  "src/components/soccer-career/InternationalPanel.tsx": {
    "head": "872a55fb5a772279f263611b040afcbfb25dcecdcf6cc5586794370e487c993b",
    "base": "df3dd4e16e8a046a6928c832068a2e92f3ecbf15504eeb32fcbf598d59b66bb7"
  }
};
const ENGINE = 'src/lib/soccerCareerEngine.ts';
const PHONE = 'src/lib/soccerPhone.ts';

/* The rows, in the order they must be applied: each turns one block of this round's file back into the base's. */
const EDITS = [
  { name: "engine-1", file: "src/lib/soccerCareerEngine.ts",
    from: "import { keyedRng } from \"./keyedRng\";\nimport { monthAwards, monthYear, tournamentWinnerShown } from \"./soccerWorldTruth\";\nimport { personalGoalMilestone } from \"./soccerCareerMilestone\";",
    to: "import { keyedRng } from \"./keyedRng\";\nimport { personalGoalMilestone } from \"./soccerCareerMilestone\";" },
  { name: "engine-2", file: "src/lib/soccerCareerEngine.ts",
    from: "\n  /* The champion is announced whether you were there or not. Round 1329: who\n     won a summer that really happened is a fact about the real world, so it\n     goes in the log only when he played those finals (then it is his story);\n     a summer still to come is the game's own and keeps both lines. */\n  if (tournamentWinnerShown(year, eligible ? t.myResult : \"\")) {\n    if (t.champion === s.nationality && !eligible) {\n      s.events.push(`🏆 ${s.nationality} won the ${t.name} without you.`);\n    } else if (t.champion !== s.nationality) {\n      s.events.push(`🌍 ${t.champion} won the ${t.name}.`);\n    }\n  }",
    to: "\n  // The champion is announced whether you were there or not.\n  if (t.champion === s.nationality && !eligible) {\n    s.events.push(`🏆 ${s.nationality} won the ${t.name} without you.`);\n  } else if (t.champion !== s.nationality) {\n    s.events.push(`🌍 ${t.champion} won the ${t.name}.`);\n  }" },
  { name: "engine-3", file: "src/lib/soccerCareerEngine.ts",
    from: "\n  /* Awards: Player of the Month. Round 1329: it was a goals lottery (a month\n     with no goal still won 2 percent of the time, so a keeper who never scored\n     won it about once in three seasons) and it printed every month with the\n     season's starting year (\"April 1992\" in 1992/93). Now a month is won on\n     the month's football by position, with the month's own year\n     (soccerWorldTruth.ts monthAwards and monthYear). The old lottery's\n     Math.random calls are still made, the same number in the same order, and\n     thrown away: the Round 521 and Round 1041 rule, every branch draws exactly\n     as before, so nothing later in the season moves. The award reads a stream\n     keyed to the career and the season instead. The production bundler\n     counts Math.random as pure and drops a draw whose result goes nowhere,\n     so every draw is summed and the sum feeds a branch it cannot rule out\n     (a sum of draws is never negative); without it the built game made 20\n     fewer draws than the engine (playSoccerCareerDepth, node 170, page 150). */\n  const legacyMonthDraws = (goals: number): number => {\n    let won = 0, total = 0;\n    for (let m = 0; m < 10; m += 1) {\n      const swing = Math.random();\n      const monthGoals = Math.max(0, Math.round((goals / 10) + (swing * 2 - 1)));\n      const chance = monthGoals >= 4 ? 0.75 : monthGoals >= 3 ? 0.5 : monthGoals >= 2 ? 0.25 : monthGoals >= 1 ? 0.1 : 0.02;\n      const roll = Math.random();\n      if (roll < chance) won += 1;\n      total += swing + roll;\n    }",
    to: "\n  // Awards: Player of the Month, simulate month-by-month based on goals\n  const MONTHS = [\"August\", \"September\", \"October\", \"November\", \"December\", \"January\", \"February\", \"March\", \"April\", \"May\"];\n  const potmTotalGoals = season.goals;\n  const potmTotalApps = season.apps;\n  // Distribute goals roughly across 10 months proportional to apps\n  let potmCount = 0;\n  const potmMonths: string[] = [];\n  for (const month of MONTHS) {\n    // Each month gets roughly 1/10 of total goals with some variance\n    const monthGoals = Math.max(0, Math.round((potmTotalGoals / 10) + (Math.random() * 2 - 1)));\n    let chance = 0.02;\n    if (monthGoals >= 4) chance = 0.75;\n    else if (monthGoals >= 3) chance = 0.50;\n    else if (monthGoals >= 2) chance = 0.25;\n    else if (monthGoals >= 1) chance = 0.10;\n    if (Math.random() < chance) {\n      potmCount++;\n      potmMonths.push(month);\n    }\n  }\n  // Guarantee high POTM count for Ballon d'Or caliber seasons\n  if (potmTotalGoals >= 30 && potmCount < 6) {\n    const remaining = MONTHS.filter(m => !potmMonths.includes(m));\n    while (potmCount < 6 && remaining.length > 0) {\n      const idx = rand(0, remaining.length - 1);\n      potmMonths.push(remaining.splice(idx, 1)[0]);\n      potmCount++;\n    }\n  }\n  if (potmTotalGoals >= 35 && potmCount < 7) {\n    const remaining = MONTHS.filter(m => !potmMonths.includes(m));\n    while (potmCount < 7 && remaining.length > 0) {\n      const idx = rand(0, remaining.length - 1);\n      potmMonths.push(remaining.splice(idx, 1)[0]);\n      potmCount++;\n    }\n  }\n  if (potmCount > 0) {\n    for (const month of potmMonths) {\n      s.awards = [...s.awards, { year: thisYear, name: \"Player of the Month\", emoji: \"🏆\" }];\n      s.events.push(`🏆 Won Player of the Month (${month} ${thisYear})!`);\n    }" },
  { name: "engine-4", file: "src/lib/soccerCareerEngine.ts",
    from: "    }\n    if (goals >= 30) for (; won < 6; won += 1) total += rand(0, 9 - won);\n    if (goals >= 35) for (; won < 7; won += 1) total += rand(0, 9 - won);\n    return total;\n  };\n  if (legacyMonthDraws(season.goals) < 0) s.events.push(\"\");\n  for (const month of monthAwards(season, s.position, keyedRng(`${soccerDeckIdentity(s)}|${season.year}|potm`))) {\n    s.awards = [...s.awards, { year: thisYear, name: \"Player of the Month\", emoji: \"🏆\" }];\n    s.events.push(`🏆 Won Player of the Month (${month} ${monthYear(month, thisYear)})!`);\n  }",
    to: "    }\n  }" },
  { name: "engine-5", file: "src/lib/soccerCareerEngine.ts",
    from: "  }\n\n  // Player of the Year (domestic)",
    to: "  }\n  \n  // Player of the Year (domestic)" },
  { name: "phone-1", file: "src/lib/soccerPhone.ts",
    from: "import { cupFor, WORLD_LEAGUE_ASSOCIATION } from \"./soccerCareerCup\";\nimport { LAST_REAL_YEAR, seasonHappened, summerHappened, feedPastSeasonLine, feedFutureSeasonLine } from \"./soccerWorldTruth\";\n",
    to: "import { cupFor, WORLD_LEAGUE_ASSOCIATION } from \"./soccerCareerCup\";\n" },
  { name: "phone-2", file: "src/lib/soccerPhone.ts",
    from: "\n/* LAST_REAL_YEAR (2032: past it the era pools run out of people who could\n   plausibly still be playing, so the world generates its own names) lives in\n   soccerWorldTruth.ts since Round 1329, so the quiz reads the same year. */\n",
    to: "\n/* Past this the era pools run out of people who could plausibly still be\n   playing, so the world generates its own names, exactly like the Ballon d'Or\n   already does past 2032. Nobody real gets a fictional future. */\nconst LAST_REAL_YEAR = 2032;\n" },
  { name: "phone-3", file: "src/lib/soccerPhone.ts",
    from: "\n  /* Seed anybody new into the map at their era club, then let the map rule.\n     Round 1329: a real man is never moved by the sim, so in a real names year\n     every one of them sits at the club his era pool gives for this season\n     (careerEras.ts), which is where the Ballon d'Or night finds him too\n     (worldClubOf). Generated names are seeded once, as before. */\n  for (const st of stars) if (realNames || !p.clubs[st.name]) p.clubs[st.name] = st.club;\n",
    to: "\n  // Seed anybody new into the map at their era club, then let the map rule.\n  for (const st of stars) if (!p.clubs[st.name]) p.clubs[st.name] = st.club;\n" },
  { name: "phone-4", file: "src/lib/soccerPhone.ts",
    from: "  const movedAlready = new Set<string>();\n  /* Round 1329: every draw of a move is still made and counted, so the\n     season's later draws do not move, but only a generated man changes clubs:\n     a real one stays where his era pool put him. */\n  let drawnMoves = 0;\n  for (const st of movers) {",
    to: "  const movedAlready = new Set<string>();\n  for (const st of movers) {" },
  { name: "phone-5", file: "src/lib/soccerPhone.ts",
    from: "  for (const st of movers) {\n    if (drawnMoves >= wanted) break;\n    if (movedAlready.has(st.name)) continue;",
    to: "  for (const st of movers) {\n    if (moves.length >= wanted) break;\n    if (movedAlready.has(st.name)) continue;" },
  { name: "phone-6", file: "src/lib/soccerPhone.ts",
    from: "    const fee = Math.round((22 + st.power * 7 + rng.int(0, 34)) / 5) * 5;\n    drawnMoves += 1;\n    if (realNames) continue;\n    p.clubs[st.name] = to;",
    to: "    const fee = Math.round((22 + st.power * 7 + rng.int(0, 34)) / 5) * 5;\n    p.clubs[st.name] = to;" },
  { name: "phone-7", file: "src/lib/soccerPhone.ts",
    from: "    const goals = rng.int(st.baseGoals[0], st.baseGoals[1]);\n    /* Round 1329: both draws stay; a real man's tally is never made up. */\n    if (!realNames) topScorer = { who: st.name, club, goals, league: leagueOfClub(club, leagues) ?? \"the league\" };\n  }",
    to: "    const goals = rng.int(st.baseGoals[0], st.baseGoals[1]);\n    topScorer = { who: st.name, club, goals, league: leagueOfClub(club, leagues) ?? \"the league\" };\n  }" },
  { name: "phone-8", file: "src/lib/soccerPhone.ts",
    from: "\n  /* Feed lines. Every one of them is read straight off `world`. Round 1329:\n     the feed is the world around him, so each line is a claim about the real\n     world. A season that really happened says so in one line and states\n     nothing about other people's results, which the game draws but cannot\n     stand behind (soccerWorldTruth.ts); a season of the game's own future\n     prints as before, under a line that says it is his world's. The feed is\n     shown newest first, so that line goes in last and sits on top of its\n     season. A tournament's winner is named only for a summer still to come:\n     finals he played in a summer that happened are his story, told on his\n     International card and in his season log, never here as world news. The\n     rival's move is a generated man's, every year. */\n  const happened = seasonHappened(year);\n  const items: string[] = [];",
    to: "\n  /* Feed lines. Every one of them is read straight off `world`. */\n  const items: string[] = [];" },
  { name: "phone-9", file: "src/lib/soccerPhone.ts",
    from: "  const items: string[] = [];\n  if (!happened) {\n    for (const m of moves) {\n      items.push(`🔄 DONE DEAL. ${m.who} joins ${m.to} from ${m.from}. Fee around ${m.fee}m.`);\n    }\n  }",
    to: "  const items: string[] = [];\n  for (const m of moves) {\n    items.push(`🔄 DONE DEAL. ${m.who} joins ${m.to} from ${m.from}. Fee around ${m.fee}m.`);\n  }" },
  { name: "phone-10", file: "src/lib/soccerPhone.ts",
    from: "  }\n  if (!happened) {\n    if (ucl !== s.currentClub) items.push(`⭐ ${ucl} are champions of Europe.`);\n    const titles = Object.entries(leagueWinners).filter(([, club]) => club !== s.currentClub);\n    for (const [lg, club] of titles.slice(0, 2)) {\n      items.push(`🏆 ${club} win ${leaguePhrase(lg)}.`);\n    }\n    if (topScorer && topScorer.club !== s.currentClub) {\n      const where = topScorer.league === \"the league\" ? \"his league\" : leaguePhrase(topScorer.league);\n      items.push(`🥅 ${topScorer.who} finished top scorer in ${where} on ${topScorer.goals}.`);\n    }\n  }",
    to: "  }\n  if (ucl !== s.currentClub) items.push(`⭐ ${ucl} are champions of Europe.`);\n  const titles = Object.entries(leagueWinners).filter(([, club]) => club !== s.currentClub);\n  for (const [lg, club] of titles.slice(0, 2)) {\n    items.push(`🏆 ${club} win ${leaguePhrase(lg)}.`);\n  }\n  if (topScorer && topScorer.club !== s.currentClub) {\n    const where = topScorer.league === \"the league\" ? \"his league\" : leaguePhrase(topScorer.league);\n    items.push(`🥅 ${topScorer.who} finished top scorer in ${where} on ${topScorer.goals}.`);\n  }" },
  { name: "phone-11", file: "src/lib/soccerPhone.ts",
    from: "  }\n  if (intl && !summerHappened(year)) items.push(`🌍 ${intl.champion} win the ${intl.name}.`);\n  items.push(happened ? feedPastSeasonLine(year) : feedFutureSeasonLine(year));\n",
    to: "  }\n  if (intl) items.push(`🌍 ${intl.champion} win the ${intl.name}.`);\n" },
  { name: "arcade-1", file: "src/lib/soccerArcade.ts",
    from: "import { phoneWorld } from \"./soccerPhone\";\nimport { LAST_REAL_YEAR, seasonHappened } from \"./soccerWorldTruth\";\n",
    to: "import { phoneWorld } from \"./soccerPhone\";\n" },
  { name: "arcade-2", file: "src/lib/soccerArcade.ts",
    from: "\n  /* Round 1329: his own story, read off the saved rows only, so a career in a\n     season that really happened (where the world asks nothing, below) still\n     gets its three. The row is the latest season he played games in; when the\n     last one was lost to injury, its goals and games are asked here instead. */\n  const own = [...played].reverse().find(x => x.apps > 0);\n  if (own) {\n    if (own !== last) {\n      if (s.position !== \"GK\") {\n        const q = build(\n          `How many goals did you score in ${own.year}?`,\n          String(own.goals), nearNumbers(own.goals, rng),\n          `You got ${own.goals} in ${own.apps} games for ${own.club}.`, rng,\n        );\n        if (q) candidates.push(q);\n      }\n      const q = build(\n        `How many games did you play in ${own.year}?`,\n        String(own.apps), nearNumbers(own.apps, rng),\n        `${own.apps} appearances for ${own.club}.`, rng,\n      );\n      if (q) candidates.push(q);\n    }\n    const sheets = own.cleanSheets ?? 0;\n    if (sheets > 0) {\n      const q = build(\n        `How many clean sheets did you keep in ${own.year}?`,\n        String(sheets), nearNumbers(sheets, rng),\n        `${sheets} in ${own.apps} games for ${own.club}.`, rng,\n      );\n      if (q) candidates.push(q);\n    }\n    const months = (s.awards ?? []).filter(a => a.name === \"Player of the Month\" && a.year === own.year).length;\n    if (months > 0) {\n      const q = build(\n        `How many Player of the Month awards did you win in ${own.year}?`,\n        String(months), nearNumbers(months, rng),\n        `${months}, in a ${own.rating.toFixed(1)} rated season.`, rng,\n      );\n      if (q) candidates.push(q);\n    }\n    const tenths = Math.round(own.rating * 10);\n    if (tenths > 0) {\n      const near: string[] = [];\n      for (let guard = 0; guard < 40 && near.length < 6; guard += 1) {\n        const v = tenths + rng.int(-8, 8);\n        const label = (v / 10).toFixed(1);\n        if (v !== tenths && v >= 30 && v <= 100 && !near.includes(label)) near.push(label);\n      }\n      const q = build(\n        `What was your season rating in ${own.year}?`,\n        (tenths / 10).toFixed(1), near,\n        `${(tenths / 10).toFixed(1)} over ${own.apps} games for ${own.club}.`, rng,\n      );\n      if (q) candidates.push(q);\n    }\n  }\n\n  /* Round 1329: who won what in a season that really happened is a fact about\n     the real world, which this phone cannot stand behind (soccerWorldTruth.ts),\n     so the world is asked about only for a season still to come, the game's\n     own; and a move or a goal tally only past the last real names year, so an\n     old save whose 2028 world still holds a real man's move never asks about\n     him. That is how the quiz stays never wrong. */\n  const w: WorldSeason | null = world;",
    to: "\n  const w: WorldSeason | null = world;" },
  { name: "arcade-3", file: "src/lib/soccerArcade.ts",
    from: "  const w: WorldSeason | null = world;\n  if (w && !seasonHappened(w.year)) {\n    const leagueNames = Object.keys(w.leagues);",
    to: "  const w: WorldSeason | null = world;\n  if (w) {\n    const leagueNames = Object.keys(w.leagues);" },
  { name: "arcade-4", file: "src/lib/soccerArcade.ts",
    from: "    }\n    if (w.year > LAST_REAL_YEAR && w.moves.length >= 1) {\n      const mv = w.moves[rng.int(0, w.moves.length - 1)];",
    to: "    }\n    if (w.moves.length >= 1) {\n      const mv = w.moves[rng.int(0, w.moves.length - 1)];" },
  { name: "arcade-5", file: "src/lib/soccerArcade.ts",
    from: "    }\n    if (w.year > LAST_REAL_YEAR && w.topScorer) {\n      const ts = w.topScorer;",
    to: "    }\n    if (w.topScorer) {\n      const ts = w.topScorer;" },
  { name: "panel-1", file: "src/components/soccer-career/InternationalPanel.tsx",
    from: "import { SOCCER_WORLD_CUP_SPEECHES } from \"@/lib/soccerCareerEngine\";\nimport { summerAtHomeLine, tournamentWinnerShown } from \"@/lib/soccerWorldTruth\";\nimport type {",
    to: "import { SOCCER_WORLD_CUP_SPEECHES } from \"@/lib/soccerCareerEngine\";\nimport type {" },
  { name: "panel-2", file: "src/components/soccer-career/InternationalPanel.tsx",
    from: "        )}\n        {screen === \"bracket\" && tournamentWinnerShown(t.year, t.myResult) && (\n          <>",
    to: "        )}\n        {screen === \"bracket\" && (\n          <>" },
  { name: "panel-3", file: "src/components/soccer-career/InternationalPanel.tsx",
    from: "    },\n    /* Round 1329: the whole edition's bracket names who won it, so it is offered only where the winner may be\n       named: a summer still to come, or finals he played (soccerWorldTruth.ts). */\n    ...(tournamentWinnerShown(t.year, t.myResult) ? [{ key: \"bracket\" as const, emoji: \"🗺️\", label: \"Bracket\", sub: `${t.teams} nations` }] : []),\n    { key: \"matches\", emoji: \"⚽\", label: \"Your Games\", sub: `${t.playerApps} apps` },",
    to: "    },\n    { key: \"bracket\", emoji: \"🗺️\", label: \"Bracket\", sub: `${t.teams} nations` },\n    { key: \"matches\", emoji: \"⚽\", label: \"Your Games\", sub: `${t.playerApps} apps` }," },
  { name: "panel-4", file: "src/components/soccer-career/InternationalPanel.tsx",
    from: "  );\n  /* Round 1329: who won a summer that really happened is the world's fact, so\n     the line is there only for a summer still to come or finals he played. */\n  const championsLine = tournamentWinnerShown(t.year, t.myResult) ? (\n    <p",
    to: "  );\n  const championsLine = (\n    <p" },
  { name: "panel-5", file: "src/components/soccer-career/InternationalPanel.tsx",
    from: "    </p>\n  ) : null;\n",
    to: "    </p>\n  );\n" },
  { name: "panel-6", file: "src/components/soccer-career/InternationalPanel.tsx",
    from: "\n      <div className={`grid grid-cols-2 gap-1.5${tiles.length % 2 === 1 ? \" [&>*:last-child]:col-span-2\" : \"\"}`}>\n        {tiles.map(tile => (",
    to: "\n      <div className=\"grid grid-cols-2 gap-1.5\">\n        {tiles.map(tile => (" },
  { name: "panel-7", file: "src/components/soccer-career/InternationalPanel.tsx",
    from: "              <div className=\"flex items-start justify-between gap-2\">\n                {tournamentWinnerShown(h.year, h.myResult) ? (\n                  <span className=\"flex flex-1 items-center gap-1 min-w-0\">\n                    <FlagImg name={h.champion} size={13} />\n                    <span className=\"min-w-0 break-words\">{h.champion}</span>\n                  </span>\n                ) : (\n                  <span className=\"flex-1 min-w-0 text-xs text-muted-foreground\">Watched from home</span>\n                )}\n                <span className=\"shrink-0\"><ResultPill result={h.myResult} /></span>",
    to: "              <div className=\"flex items-start justify-between gap-2\">\n                <span className=\"flex flex-1 items-center gap-1 min-w-0\">\n                  <FlagImg name={h.champion} size={13} />\n                  <span className=\"min-w-0 break-words\">{h.champion}</span>\n                </span>\n                <span className=\"shrink-0\"><ResultPill result={h.myResult} /></span>" },
  { name: "panel-8", file: "src/components/soccer-career/InternationalPanel.tsx",
    from: "\n  /* Round 1329: the last edition's bracket and winner follow the card's rule. */\n  const lastShown = !!last && tournamentWinnerShown(last.year, last.myResult);\n  if (open === \"bracket\" && last && lastShown) {\n    return (",
    to: "\n  if (open === \"bracket\" && last) {\n    return (" },
  { name: "panel-9", file: "src/components/soccer-career/InternationalPanel.tsx",
    from: "      <button\n        onClick={() => setOpen(lastShown ? \"bracket\" : \"history\")}\n        className=\"bg-muted/20 hover:bg-muted/40 border border-border rounded-lg p-2 text-left transition-colors min-w-0\"",
    to: "      <button\n        onClick={() => setOpen(last ? \"bracket\" : \"history\")}\n        className=\"bg-muted/20 hover:bg-muted/40 border border-border rounded-lg p-2 text-left transition-colors min-w-0\"" },
  { name: "panel-10", file: "src/components/soccer-career/InternationalPanel.tsx",
    from: "        <div className=\"text-[11px] font-bold truncate\">{latest?.short ?? \"Last\"} {latest?.year ?? \"\"}</div>\n        <div className=\"text-[9px] text-muted-foreground truncate\">\n          {latest && tournamentWinnerShown(latest.year, latest.myResult) ? `${latest.champion} won it` : summerAtHomeLine(latest?.myResult)}\n        </div>\n      </button>",
    to: "        <div className=\"text-[11px] font-bold truncate\">{latest?.short ?? \"Last\"} {latest?.year ?? \"\"}</div>\n        <div className=\"text-[9px] text-muted-foreground truncate\">{latest?.champion ?? \"\"} won it</div>\n      </button>" },
];

export const WORLD_TRUTH_FILES = Object.keys(WORLD_TRUTH_SHA256);
export const WORLD_TRUTH_ADDITIONS = EDITS.map(row => row.name);

/** The rows as patches ({ id, addition, file, from, to }), for a harness that applies a list in order. */
export function worldTruthPatches() {
  return EDITS.map(row => ({ id: `world-truth-${row.name}`, addition: row.name, file: row.file, from: row.from, to: row.to }));
}

/**
 * One bundled file with Round 1329 taken out. `relative` is the file's path from the repo root; a file this round
 * did not edit comes back as it was. `receipt` gains one row per edit made, for the harness's proof.
 */
export function inverseWorldTruth(relative, source, receipt = []) {
  const rows = EDITS.filter(row => row.file === relative);
  if (rows.length === 0) return source;
  let out = source.split('\r\n').join('\n');
  for (const row of rows) {
    assert.equal(out.split(row.from).length, 2, `the ${row.name} row of Round 1329's inverse must be in ${relative} exactly once at its turn`);
    out = out.replace(row.from, () => row.to);
    receipt.push({ addition: row.name, file: relative });
  }
  return out;
}

/**
 * An esbuild plugin that loads `files` (paths from the repo root) of the tree at `root` with Round 1329 taken
 * out, for a bundle whose other plugins do not already load them. `receipt` gains one row per edit made.
 */
export function worldTruthOutPlugin(root, pathMod, fsMod, receipt = [], files = WORLD_TRUTH_FILES) {
  const targets = new Map(files.map(file => [pathMod.resolve(root, file).split(pathMod.sep).join('/').toLowerCase(), file]));
  return { name: 'world-truth-out', setup(b) {
    b.onLoad({ filter: /\.(ts|tsx)$/ }, args => {
      const relative = targets.get(pathMod.resolve(args.path).split(pathMod.sep).join('/').toLowerCase());
      if (!relative) return undefined;
      return { contents: inverseWorldTruth(relative, fsMod.readFileSync(args.path, 'utf8'), receipt), loader: relative.endsWith('.tsx') ? 'tsx' : 'ts' };
    });
  } };
}

/**
 * What is wrong with a receipt, or '' when nothing is: every file the bundle loaded had all its rows applied once,
 * in order, and the engine and the phone (every Soccer Career bundle loads both) were among them.
 */
export function worldTruthReceiptProblem(receipt, required = [ENGINE, PHONE]) {
  const seen = new Map();
  for (const row of receipt) seen.set(row.file, [...(seen.get(row.file) || []), row.addition]);
  for (const file of required) if (!seen.has(file)) return `Round 1329's inverse never ran on ${file}`;
  for (const [file, got] of seen) {
    const want = EDITS.filter(row => row.file === file).map(row => row.name);
    if (got.join() !== want.join()) return `Round 1329's inverse ran ${got.join(' ')} on ${file}, not ${want.join(' ')}`;
  }
  return '';
}
