interface ExtensionCareer {
  age: number;
  overall: number;
  weeklyWage: number;
  seasons: readonly { type: string; rating: number; apps?: number }[];
}

/** A game contract quote. Reading it never negotiates or writes the save. */
export function soccerExtensionQuote(career: ExtensionCareer, kind: 'extension' | 'renewal' = 'extension') {
  if (career.age < 30) {
    return {
      weeklyWage: Math.round(career.weeklyWage * (kind === 'extension' ? 1.15 : 1)),
      contractYears: null as number | null,
      rationale: kind === 'extension' ? 'A 15% raise on your current deal.' : 'Renew on your current wage.',
    };
  }
  const last = [...career.seasons].reverse().find(row => row.type === 'playing');
  const form = last?.rating;
  const veteran = career.age >= 34;
  const elite = career.overall >= 90 && form !== undefined && form >= 8 && (last?.apps ?? 0) >= 20;
  const holdingLevel = career.overall >= 80 && form !== undefined && form >= 7;
  const multiplier = elite ? (veteran ? 1.05 : 1.1)
    : holdingLevel ? 1
    : (veteran ? 0.85 : 0.95) - (form !== undefined && form < 6.7 ? 0.05 : 0);
  return {
    weeklyWage: Math.round(career.weeklyWage * multiplier),
    contractYears: veteran ? 1 : 2,
    rationale: elite ? 'Your elite level and latest season earn a raise on a shorter deal.'
      : holdingLevel ? 'Your level and latest season keep your wage on a shorter deal.'
      : 'A shorter deal and lower wage reflect your age, level and latest season.',
  };
}
