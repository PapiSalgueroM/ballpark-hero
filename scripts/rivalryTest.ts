import { MORAL_DILEMMAS, applyMoralDilemmaChoice, purchaseSpendingItem, SPENDING_ITEMS, dismissRivalryEvent, generateRivalrySummary, type CareerState, type RivalPlayer, type RivalryEvent } from '@/lib/soccerCareerEngine';
import { FALLBACK_CLUBS } from '@/lib/soccerCareerEngine';
const CLUBS = FALLBACK_CLUBS;

function rival(): RivalPlayer {
  return {
    name: 'Rai Moreno', nationality: 'Brazil', position: 'ST', club: 'Rival FC', clubTier: 1,
    overall: 90, careerGoals: 350, careerAssists: 120, careerApps: 500, leagueTitles: 4,
    championsLeagues: 2, worldCups: 0, ballonDors: 1, intCaps: 80, intGoals: 40,
    marketValue: 100, age: 27, retired: false,
  };
}

function baseState(): CareerState {
  return {
    playerName: 'Test', nationality: 'Brazil', position: 'ST', era: 'today', age: 28,
    currentClub: 'Test FC', currentClubCountry: 'England', currentClubTier: 1, currentClubColor: '#fff',
    currentLeague: 'Premier League', contractYearsLeft: 3, weeklyWage: 200000, marketValue: 80,
    pace: 88, shooting: 89, passing: 82, dribbling: 87, defending: 40, physical: 80, reflexes: 60, overall: 89,
    seasons: [], events: [], retired: false, phase: 'playing',
    pendingAppealResult: null, pendingNews: [], pendingOffers: [], pendingSummary: null, transferSituation: null,
    pendingEvents: [], lastEventId: null, statBoostNextSeason: {}, internationalCareer: true,
    sponsorDeal: 'MegaBrand', totalEarnings: 60, popularity: 80, morale: 70, isLeader: true, hasRelationship: true,
    intStats: { caps: 50, goals: 25, debutAge: 20, worldCupResults: [], majorTrophies: [] } as any,
    pendingWorldCup: null, rival: rival(), rivalCreated: true, pendingRivalryEvent: null, lastRivalryEventId: null,
    rivalrySummary: null, netWorth: 150, lifestyleLevel: 'modest' as any, lifestyleCostPerYear: 1,
    socialMediaFollowers: 20_000_000, sponsorshipIncome: 5, properties: [], investments: [],
    consecutiveDeficitYears: 0, agentFeesPaid: 0, family: { married: false, children: 0 } as any,
    purchasedItems: [], investmentHoldings: [], totalAssetValue: 0, customYearlyCosts: 0,
    awards: [], pendingBallonDor: null, lastUCLResult: null, legacy: null, postRetirementChoice: null,
    managerState: null, punditState: null, ownerState: null, isFinalSeason: false, isPundit: false,
    punditEvents: [], primeType: 'normal' as any, peakOverall: 89, retirementSuggested: false,
    socialMediaActionUsedThisSeason: false, socialMediaFocusBoost: false, pendingCoverAthleteEvent: false,
    coverAthleteAccepted: false, activeSponsorship: null, moralDilemmasTriggered: [], pendingMoralDilemma: null,
    pedSeasonsRemaining: 0, pedActive: false, matchFixBanned: 0, divingActive: false, integrityBonus: 0,
    childEventsSeen: [], pregnancyAnnounced: false,
  } as unknown as CareerState;
}

// ---- 1. New rivalry events 109-118 all apply cleanly via dismissRivalryEvent
const EVT: [number, string][] = [
  [109, 'teammate'], [110, 'tunnel'], [111, 'chase'], [112, 'armband'], [113, 'shirt swap'],
  [114, 'injury'], [115, 'goat'], [116, 'banner'], [117, 'documentary'], [118, 'testimonial'],
];
for (const [id, label] of EVT) {
  const s = baseState();
  const evt: RivalryEvent = { id, emoji: 'x', title: `evt ${id}`, description: 'd', consequence: 'c' };
  s.pendingRivalryEvent = evt;
  const out = dismissRivalryEvent(s, CLUBS);
  if (out.pendingRivalryEvent !== null) throw new Error(`event ${id} (${label}) did not clear`);
  if (!out.events.some(e => e.includes(`evt ${id}`))) throw new Error(`event ${id} not logged`);
  if (Number.isNaN(out.netWorth) || Number.isNaN(out.popularity) || Number.isNaN(out.morale)) throw new Error(`NaN after event ${id}`);
  const ri = out.rivalryIntensity ?? 0;
  if (ri < 0 || ri > 100) throw new Error(`intensity out of range after ${id}: ${ri}`);
}
// intensity direction spot checks
{
  let s = baseState();
  s.pendingRivalryEvent = { id: 110, emoji: 'x', title: 't', description: 'd', consequence: 'c' };
  s = dismissRivalryEvent(s, CLUBS) as CareerState;
  if ((s.rivalryIntensity ?? 0) !== 15) throw new Error(`tunnel bust-up should heat feud to 15, got ${s.rivalryIntensity}`);
  s.pendingRivalryEvent = { id: 114, emoji: 'x', title: 't2', description: 'd', consequence: 'c' };
  s = dismissRivalryEvent(s, CLUBS) as CareerState;
  if ((s.rivalryIntensity ?? 0) !== 0) throw new Error(`injury sympathy should cool feud to 0, got ${s.rivalryIntensity}`);
}
// documentary pays
{
  let s = baseState();
  s.pendingRivalryEvent = { id: 117, emoji: 'x', title: 't', description: 'd', consequence: 'c' };
  const out = dismissRivalryEvent(s, CLUBS);
  if (out.netWorth !== 153) throw new Error(`documentary should pay 3M, netWorth ${out.netWorth}`);
}
console.log('rivalry events 109-118: all apply, clear, log, intensity bounded, doc pays');

// ---- 2. Four rival dilemmas, every choice
const RIVAL_DILEMMAS = ['rival_club_offer', 'rival_bad_tackle', 'goat_debate_show', 'rival_charity_match'];
for (const id of RIVAL_DILEMMAS) {
  const d = MORAL_DILEMMAS.find(x => x.id === id);
  if (!d) throw new Error(`missing dilemma ${id}`);
  for (let c = 0; c < d.choices.length; c++) {
    const s = baseState();
    s.pendingMoralDilemma = d;
    const out = applyMoralDilemmaChoice(s, c);
    if (out.events.length === 0) throw new Error(`${id} choice ${c} produced no event`);
    const line = out.events[out.events.length - 1];
    if (/[—–]/.test(line)) throw new Error(`em-dash in ${id} choice ${c}`);
    if (Number.isNaN(out.netWorth)) throw new Error(`NaN netWorth in ${id} choice ${c}`);
  }
}
// arc effects: joining the rival pays 10M and cools the feud
{
  let s = baseState();
  s.rivalryIntensity = 60;
  s.pendingMoralDilemma = MORAL_DILEMMAS.find(x => x.id === 'rival_club_offer')!;
  s = applyMoralDilemmaChoice(s, 0);
  if (s.netWorth !== 160) throw new Error(`joining rival should pay 10M, got ${s.netWorth}`);
  if ((s.rivalryIntensity ?? 0) !== 30) throw new Error(`joining should cool feud to 30, got ${s.rivalryIntensity}`);
}
// revenge tackle red-card rate ~30%
{
  let reds = 0;
  for (let i = 0; i < 300; i++) {
    let s = baseState();
    s.pendingMoralDilemma = MORAL_DILEMMAS.find(x => x.id === 'rival_bad_tackle')!;
    s = applyMoralDilemmaChoice(s, 0);
    if (s.events[s.events.length - 1].includes('red card')) reds += 1;
  }
  if (reds < 55 || reds > 125) throw new Error(`red card rate off: ${reds}/300`);
  console.log(`revenge tackle red-card rate OK (${reds}/300 ~ 30%)`);
}
console.log('all 4 rival dilemmas: every choice applies, logs, no em-dashes');

// ---- 3. New money items purchasable with effects
const NEW_ITEMS = ['signature_cologne', 'tequila_brand', 'video_game_studio', 'space_flight', 'rivals_boyhood_club'];
for (const id of NEW_ITEMS) {
  const item = SPENDING_ITEMS.find(i => i.id === id);
  if (!item) throw new Error(`missing item ${id}`);
  const s = baseState();
  s.netWorth = 500;
  const out = purchaseSpendingItem(s, id);
  if (!out.purchasedItems.includes(id)) throw new Error(`${id} not recorded as purchased`);
  if (out.netWorth >= 500) {
    // cost must have been deducted unless a payout larger than cost fired
    const payoutPossible = id === 'signature_cologne' || id === 'tequila_brand' || id === 'video_game_studio';
    if (!payoutPossible) throw new Error(`${id} cost not deducted: ${out.netWorth}`);
  }
  if (Number.isNaN(out.netWorth)) throw new Error(`NaN after buying ${id}`);
}
// pettiest purchase heats the feud
{
  const s = baseState();
  s.netWorth = 500;
  const out = purchaseSpendingItem(s, 'rivals_boyhood_club');
  if ((out.rivalryIntensity ?? 0) !== 40) throw new Error(`petty purchase should heat feud to 40, got ${out.rivalryIntensity}`);
  if (!out.events.some(e => e.includes("Rai Moreno's"))) throw new Error('petty purchase should name the rival');
}
console.log(`all 5 new money options purchasable (catalog now ${SPENDING_ITEMS.length} items)`);

// ---- 4. Feud heat feeds legacy: intensity 70+ earns the era bonus
{
  const cold = baseState();
  cold.rivalryIntensity = 10;
  cold.seasons = [{ goals: 30, assists: 10, apps: 40 }] as any;
  const hot = baseState();
  hot.rivalryIntensity = 85;
  hot.seasons = [{ goals: 30, assists: 10, apps: 40 }] as any;
  const sc = generateRivalrySummary(cold);
  const sh = generateRivalrySummary(hot);
  if (!sc || !sh) throw new Error('summary null');
  if (sh.legacyBonus - sc.legacyBonus !== 5) throw new Error(`era bonus should be +5, got ${sh.legacyBonus - sc.legacyBonus}`);
}
console.log('era-defining feud (intensity 70+) adds +5 legacy in the rivalry summary');

// ---- 5. Old saves: state without rivalryIntensity works through everything
{
  let s = baseState();
  delete (s as any).rivalryIntensity;
  s.pendingRivalryEvent = { id: 113, emoji: 'x', title: 't', description: 'd', consequence: 'c' };
  const out = dismissRivalryEvent(s, CLUBS);
  if ((out.rivalryIntensity ?? 0) !== 0) throw new Error('old save should land at floor 0 after softening event');
}
console.log('old-save compatibility OK (missing rivalryIntensity tolerated)');

console.log('RIVALRY EXPANSION VERIFIED');

// ---- 6. Ballon d'Or acceptance speech (2026-08-05 ceremony upgrade)
{
  const { applyBdorSpeech } = await import('@/lib/soccerCareerEngine');
  for (const choice of ['thank_rival', 'family_on_stage', 'tears', 'greatest_ever'] as const) {
    const s = baseState();
    s.pendingBallonDor = { year: 2030, nominees: [], playerRank: 1, playerPoints: 99, playerNominated: true } as any;
    const out = applyBdorSpeech(s, choice, CLUBS);
    if (out.pendingBallonDor !== null) throw new Error(`speech ${choice} did not clear the ceremony`);
    if (out.events.length === 0) throw new Error(`speech ${choice} logged nothing`);
    if (/[—–]/.test(out.events[out.events.length - 1])) throw new Error(`em-dash in speech ${choice}`);
  }
  // thanking the rival cools the feud by 20 and names him
  const s = baseState();
  s.rivalryIntensity = 50;
  s.pendingBallonDor = { year: 2030, nominees: [], playerRank: 1, playerPoints: 99, playerNominated: true } as any;
  const out = applyBdorSpeech(s, 'thank_rival', CLUBS);
  if ((out.rivalryIntensity ?? 0) !== 30) throw new Error(`thank_rival should cool feud to 30, got ${out.rivalryIntensity}`);
  if (!out.events.some(e => e.includes('Rai Moreno'))) throw new Error('speech should name the rival');
  // arrogance backfire rate ~35%
  let backfires = 0;
  for (let i = 0; i < 300; i++) {
    const t = baseState();
    t.pendingBallonDor = { year: 2030, nominees: [], playerRank: 1, playerPoints: 99, playerNominated: true } as any;
    const o = applyBdorSpeech(t, 'greatest_ever', CLUBS);
    if (o.events[o.events.length - 1].includes('-10')) backfires += 1;
  }
  if (backfires < 70 || backfires > 140) throw new Error(`backfire rate off: ${backfires}/300`);
  console.log(`bdor speech OK (all 4 choices, rival named, feud cooled, arrogance backfire ${backfires}/300 ~ 35%)`);
}
