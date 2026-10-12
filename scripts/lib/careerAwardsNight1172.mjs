/* Rounds 1172 and 1280 attribution. Restore exactly the changed new-ballot and
   newspaper decisions in a copied bundle for the older full-save fixture.
   The unpatched bundle still runs every current award and speech invariant. */
export const awardsNight1172Attribution = [
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
