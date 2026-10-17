import { SOCCER_LIFE_CONSEQUENCES } from './soccerCareerLifeConsequences';
import { SOCCER_CORRUPTION_CONSEQUENCES } from './soccerCareerCorruptionConsequences';

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
/** Apply the existing age and form policy to a new club's drawn terms. */
export function soccerTransferTerms(career: ExtensionCareer, offeredWage: number, offeredYears: number) {
  if (career.age < 30) return { wage: offeredWage, contractYears: offeredYears };
  const quote = soccerExtensionQuote({ ...career, weeklyWage: offeredWage }, 'renewal');
  return { wage: quote.weeklyWage, contractYears: offeredYears };
}

/** Project one money-talk outcome without renewing the contract or drawing. */
export function soccerWageDemand(career: ExtensionCareer) {
  if (career.age < 30) return {
    weeklyWage: Math.round(career.weeklyWage * 1.2),
    consequence: '50% chance: Wage +20% or relationship damaged',
    hit: '20% wage raise',
    event: '📝 Pushed for more, got a raise!',
  };
  const weeklyWage = Math.max(career.weeklyWage, soccerExtensionQuote(career, 'renewal').weeklyWage);
  const raised = weeklyWage > career.weeklyWage;
  const hit = raised ? `Wage €${weeklyWage}/wk` : `Current wage held (€${weeklyWage}/wk)`;
  return {
    weeklyWage, hit,
    consequence: `50% chance: ${hit} or relationship damaged`,
    event: raised ? '📝 Pushed for more, got a raise!' : '📝 Pushed for more, kept current wage',
  };
}

/** Refresh an unanswered choice label, including an older saved card. */
export function soccerEventChoiceConsequence(career: ExtensionCareer, eventId: number, choiceIndex: number, saved: string) {
  return eventId === 16 && choiceIndex === 1 ? soccerWageDemand(career).consequence : SOCCER_LIFE_CONSEQUENCES[eventId]?.[choiceIndex] ?? SOCCER_CORRUPTION_CONSEQUENCES[eventId]?.[choiceIndex] ?? saved;
}
