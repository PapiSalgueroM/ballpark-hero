/* Rounds 1172, 1280 and 1318 attribution. Restore exactly the changed new-ballot and
   newspaper decisions in a copied bundle for the older full-save fixture.
   The unpatched bundle still runs every current award and speech invariant.
   Round 1318: the rows that undo the generated rivals' pool (Round 1318's own
   steps first, then the nine of Rounds 1280 to 1282) are their own list, so
   scripts/simSoccerAwardGenerations.mjs can build its original arm from this
   head with exactly these; the 1172 list still starts with all of them. */
export const awardGenerationsInverse = [
  // Round 1318 inverse first (correction 12): a saved rival whose name is taken this year is replaced at once.
  {
    "from": "    let entry = pool.entries.find(row => row.role === role && row.slot === slot && row.retiredYear === null);\n    /* Round 1318: a saved rival whose name is already taken this year (the\n       career's own rival, say) would be skipped below every year until he\n       retired, shifting every later draw. He leaves at once instead, and his\n       slot gets a new face from the age already drawn: no extra draw. */\n    if (entry && usedNames.has(entry.name)) { entry.retiredYear = year; entry = undefined; }\n",
    "to": "    let entry = pool.entries.find(row => row.role === role && row.slot === slot && row.retiredYear === null);\n",
    "file": "src/lib/soccerCareerEngine.ts"
  },
  {
    "from": "    } else if (!integer(entry.retiredYear) || entry.retiredYear > poolYear || entry.retiredYear <= entry.firstYear\n      || entry.retiredYear > entry.firstYear + 37 - entry.entryAge) return false;",
    "to": "    } else if (!integer(entry.retiredYear) || entry.retiredYear > poolYear\n      || entry.retiredYear !== entry.firstYear + 37 - entry.entryAge) return false;",
    "file": "src/lib/soccerCareerEngine.ts"
  },
  {
    "from": "   range of the rival's position, and a retirement in the year he turns 37,\n   or earlier (but after his first year) when his name was taken. */",
    "to": "   range of the rival's position, and a retirement in the year he turns 37. */",
    "file": "src/lib/soccerCareerEngine.ts"
  },
  // Round 1318 inverse first (ruling C3): the pool reader and the one guarded read of the saved pool.
  {
    "from": "/* Round 1318: the one reader of the saved pool of generated rivals (Rounds\n   1280 to 1282). Ruling C3 of Release AW: a save part that cannot be verified\n   is read as absent. So this never refuses a save; calculateBallonDor reads the\n   part only through here and starts a fresh pool in place of one it refuses.\n   It checks what those rounds write: version 1, a year no later than lastYear,\n   contiguous ids, one live rival per role and slot, unique names, the goal\n   range of the rival's position, and a retirement in the year he turns 37. */\nexport function isGeneratedBallonPool(v: unknown, lastYear: number): v is GeneratedBallonPool {\n  const record = (x: unknown): x is Record<string, unknown> => typeof x === \"object\" && x !== null && !Array.isArray(x);\n  const integer = (x: unknown): x is number => typeof x === \"number\" && Number.isSafeInteger(x);\n  const filled = (x: unknown): x is string => typeof x === \"string\" && x.trim().length > 0;\n  if (!record(v) || v.version !== 1 || !integer(v.year) || v.year < 0 || v.year > lastYear\n    || !integer(v.nextId) || !Array.isArray(v.entries) || v.entries.length === 0 || v.nextId !== v.entries.length) return false;\n  const poolYear = v.year, names = new Set<string>(), activeSlots = new Set<string>();\n  for (let index = 0; index < v.entries.length; index++) {\n    const entry: unknown = v.entries[index];\n    if (!record(entry)) return false;\n    const goals = GEN_POSITIONS.find(p => p.pos === entry.position)?.goals;\n    if (entry.id !== index || (entry.role !== \"primary\" && entry.role !== \"filler\")\n      || !integer(entry.slot) || entry.slot < 0 || entry.slot >= (entry.role === \"primary\" ? 15 : 20)\n      || !integer(entry.seed) || entry.seed < 0 || !integer(entry.firstYear) || entry.firstYear < 0 || entry.firstYear > poolYear\n      || !integer(entry.entryAge) || entry.entryAge < 19 || entry.entryAge > 28\n      || !filled(entry.name) || names.has(entry.name) || !filled(entry.nationality) || !filled(entry.club) || !goals\n      || !Array.isArray(entry.baseGoals) || entry.baseGoals.length !== 2\n      || entry.baseGoals[0] !== goals[0] || entry.baseGoals[1] !== goals[1]) return false;\n    names.add(entry.name);\n    if (entry.retiredYear === null) {\n      const slot = entry.role + \":\" + entry.slot;\n      if (entry.entryAge + poolYear - entry.firstYear >= 37 || activeSlots.has(slot)) return false;\n      activeSlots.add(slot);\n    } else if (!integer(entry.retiredYear) || entry.retiredYear > poolYear\n      || entry.retiredYear !== entry.firstYear + 37 - entry.entryAge) return false;\n  }\n  return true;\n}\n\nfunction generateContender(usedNames",
    "to": "function generateContender(usedNames",
    "file": "src/lib/soccerCareerEngine.ts"
  },
  {
    "from": "  /* Round 1318: a pool the reader refuses is read as absent (ruling C3). */\n  const previousPool = isGeneratedBallonPool(state.generatedBallonPool, year - 1) ? state.generatedBallonPool : undefined;\n",
    "to": "  const previousPool = state.generatedBallonPool;\n",
    "file": "src/lib/soccerCareerEngine.ts"
  },
  // Exact lifecycle inverse first; the complete older fixture stays unchanged.
{
    "from": "          club: gen.club, points: rand(30, 50), goals: rand(5, 15), trophies: [], isPlayer: false,\n          generatedId: gen.generatedId, generatedAge: gen.generatedAge,",
    "to": "          club: gen.club, points: rand(30, 50), goals: rand(5, 15), trophies: [], isPlayer: false,",
    "file": "src/lib/soccerCareerEngine.ts"
  },
  {
    "from": "        const slot = fillerSeed++;\n        const gen = generatedContender(\"filler\", slot, year * 31 + slot);",
    "to": "        const gen = generateContender(usedNames, year * 31 + fillerSeed++);",
    "file": "src/lib/soccerCareerEngine.ts"
  },
  {
    "from": "        club: gen.club, points: pts, goals, trophies, isPlayer: false,\n        generatedId: gen.generatedId, generatedAge: gen.generatedAge,",
    "to": "        club: gen.club, points: pts, goals, trophies, isPlayer: false,",
    "file": "src/lib/soccerCareerEngine.ts"
  },
  {
    "from": "      const gen = generatedContender(\"primary\", i, 9900 + i);",
    "to": "      const gen = generateContender(usedNames, 9900 + i);",
    "file": "src/lib/soccerCareerEngine.ts"
  },
  {
    "from": "  const previousPool = state.generatedBallonPool;\n  let generatedPool: GeneratedBallonPool | undefined;\n  if (previousPool) {\n    generatedPool = {\n      ...previousPool, year,\n      entries: previousPool.entries.map(entry => ({\n        ...entry, baseGoals: [...entry.baseGoals] as [number, number],\n        retiredYear: entry.retiredYear === null && entry.entryAge + year - entry.firstYear >= 37 ? entry.firstYear + 37 - entry.entryAge : entry.retiredYear,\n      })),\n    };\n    state.generatedBallonPool = generatedPool;\n  }\n  const generatedContender = (role: GeneratedBallonCandidate[\"role\"], slot: number, initialSeed: number) => {\n    // Consume the existing generated-call age draw; save only the entry age.\n    const entryAge = rand(19, 28);\n    generatedPool ??= { version: 1, year, nextId: 0, entries: [] };\n    const pool = generatedPool;\n    let entry = pool.entries.find(row => row.role === role && row.slot === slot && row.retiredYear === null);\n    if (!entry) {\n      const seed = pool.entries.some(row => row.role === role && row.slot === slot) ? 9900 + pool.nextId : initialSeed;\n      const reserved = new Set([...usedNames, ...pool.entries.map(row => row.name)]);\n      const { startAge, ...profile } = generateContender(reserved, seed, entryAge);\n      const baseName = profile.name;\n      let suffix = 1;\n      while (reserved.has(profile.name)) profile.name = baseName + \" \" + suffix++;\n      entry = { ...profile, baseGoals: [...profile.baseGoals] as [number, number], id: pool.nextId++, role, slot, seed, firstYear: year, entryAge: startAge, retiredYear: null };\n      pool.entries.push(entry);\n    }\n    state.generatedBallonPool = pool;\n    return { ...entry, generatedId: entry.id, generatedAge: entry.entryAge + year - entry.firstYear };\n  };\n\n  const allNomineeData: BallonDorNominee[] = [];",
    "to": "  const allNomineeData: BallonDorNominee[] = [];",
    "file": "src/lib/soccerCareerEngine.ts"
  },
  {
    "from": "  return { name, nationality: nat, position: p.pos, club, baseGoals: p.goals, startAge };",
    "to": "  return { name, nationality: nat, position: p.pos, club, baseGoals: p.goals, startAge: rand(19, 28) };",
    "file": "src/lib/soccerCareerEngine.ts"
  },
  {
    "from": "function generateContender(usedNames: Set<string>, seed: number, startAge = rand(19, 28)): RealContender {",
    "to": "function generateContender(usedNames: Set<string>, seed: number): RealContender {",
    "file": "src/lib/soccerCareerEngine.ts"
  },
  {
    "from": "  pendingBallonDor: BallonDorResult | null;\n  generatedBallonPool?: GeneratedBallonPool;",
    "to": "  pendingBallonDor: BallonDorResult | null;",
    "file": "src/lib/soccerCareerEngine.ts"
  },
  {
    "from": "interface GeneratedBallonCandidate {\n  id: number;\n  role: \"primary\" | \"filler\";\n  slot: number;\n  seed: number;\n  firstYear: number;\n  entryAge: number;\n  retiredYear: number | null;\n  name: string;\n  nationality: string;\n  position: string;\n  club: string;\n  baseGoals: [number, number];\n}\ninterface GeneratedBallonPool {\n  version: 1;\n  year: number;\n  nextId: number;\n  entries: GeneratedBallonCandidate[];\n}\nexport interface BallonDorNominee extends AwardsCandidate {\n  nationality: string;\n  club: string;\n  position: string;\n  goals: number;\n  trophies: string[];\n  generatedId?: number;\n  generatedAge?: number;\n}",
    "to": "export interface BallonDorNominee extends AwardsCandidate {\n  nationality: string;\n  club: string;\n  position: string;\n  goals: number;\n  trophies: string[];\n}",
    "file": "src/lib/soccerCareerEngine.ts"
  },
];
export const awardsNight1172Attribution = [
  ...awardGenerationsInverse,
  { file: 'src/lib/soccerCareerEngine.ts', from: `  const generation = Math.min(5, Math.max(0, year - 2027));
  const eraStars = getEraStars(year);
  const eraCount = Math.ceil(eraStars.length * (5 - generation) / 5);
  const generatedCount = generation * 3;`, to: `  const useEraStars = year <= 2032;` },
  { file: 'src/lib/soccerCareerEngine.ts', from: '  if (eraCount > 0) {', to: '  if (useEraStars) {' },
  { file: 'src/lib/soccerCareerEngine.ts', from: '    for (const star of eraStars.slice(0, eraCount)) {', to: '    for (const star of getEraStars(year)) {' },
  { file: 'src/lib/soccerCareerEngine.ts', from: `  }
  if (generatedCount > 0) {
    // A stable guarded pool recurs across years as its simulated seasons change.
    for (let i = 0; i < generatedCount; i++) {
      const gen = generateContender(usedNames, 9900 + i);`, to: `  } else {
    for (let i = 0; i < 15; i++) {
      const gen = generateContender(usedNames, (year - 2024) * 100 + i);` },
  { file: 'src/lib/soccerCareerEngine.ts', from: "headline: `All Eyes On The Ballon d'Or List After ${name}'s Season`,", to: "headline: `ROBBED! Fans Fume As ${name} Misses Out On Ballon d'Or AGAIN`," },
  { file: 'src/lib/soccerCareerEngine.ts', from: "body: `${season.goals} goals have put ${name} back in the conversation. After a past disappointment, fans are waiting for this year's ranked list. Nothing has been announced yet.`", to: 'body: `${season.goals} goals and still no golden ball. Social media has already produced 4,000 conspiracy charts, a petition, and one very angry podcast episode. "The voters watch highlights on mute," wrote one fan. Hard to argue.`' },
  { file: 'src/lib/soccerCareerEngine.ts', from: 'headline: `${name} And ${s.rival!.name}: Another Season Of Rivalry`,', to: "headline: `RIVALS TAUNT ${name.toUpperCase()} After ${s.rival!.name} Wins Ballon d'Or Again`," },
  { file: 'src/lib/soccerCareerEngine.ts', from: "body: `${name} and ${s.rival!.name} have given fans another season to compare. This year's ranked list has not arrived. The rivalry keeps everyone watching.`", to: "body: `Social media erupted as ${s.rival!.name} claimed another Ballon d'Or, with fans of the ${s.rival!.nationality} star flooding ${name}'s channels with taunts. The rivalry shows no signs of cooling down.`" },
  { file: 'src/pages/SoccerCareer.tsx', from: `      reveal={{ complete: !!bdor.revealed || !!bdor.speech, onComplete: () => onReveal?.() }}
      confetti={false}`, to: '' },
];
