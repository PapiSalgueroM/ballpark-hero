/* Round 1172 attribution only. Restore exactly the changed new-ballot and
   newspaper decisions in a copied bundle for the older full-save fixture.
   The unpatched bundle still runs every current award and speech invariant. */
export const awardsNight1172Attribution = [
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
