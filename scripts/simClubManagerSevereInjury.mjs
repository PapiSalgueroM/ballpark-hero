import assert from 'node:assert/strict';
import { importBundled } from './lib/cmFixtureSources/gameBundle.mjs';

const { cm, calendar, nights, setup } = await importBundled(`
  export * as cm from '@/lib/clubManager';
  export * as calendar from '@/lib/clubManagerCalendar';
  export * as nights from '@/lib/worldNights';
  export * as setup from '@/lib/clubManagerStart';
`);
Date.now = () => Date.UTC(2026, 7, 1);
const storage = new Map();
globalThis.localStorage = {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: key => storage.delete(key),
};

function seedMatch(seed, firstHit) {
  let hits = 0;
  let draws = 0;
  Math.random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    draws++;
    // Only the roll made directly in drawSegmentInjury. The nested victim,
    // duration and minute draws keep their actual seeded values.
    const caller = new Error().stack.split('\n')[2];
    if (caller.includes('drawSegmentInjury')) {
      const next = hits++ === 0 ? firstHit : 0.99;
      if (next !== undefined) return next;
    }
    return seed / 2 ** 32;
  };
  return () => ({ hits, draws });
}

const club = {
  name: 'Fixture Athletic', leagueId: 'premier', stadium: 'Fixture Park', budgetTier: 'mid', quality: 72,
  crest: { shape: 0, pattern: 0, color1: '#2563eb', color2: '#ffffff', initials: 'FA' }, replacedClub: '',
};
function opening(opts) {
  let seed = 1;
  Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  const career = cm.startCareer(club.name, 'now', club, undefined, undefined, null, opts);
  career.startOptions = { ...setup.defaultStartOptions(), noSack: 1 };
  return career;
}

const player = (career, id) => career.squad.find(p => p.id === id);
const ACL = 'ACL tear';
const ACHILLES = 'Achilles tendon rupture';
const ordinaryHit = 0.045;

function quick(career, hit) {
  const stats = seedMatch(19, hit);
  const result = cm.playNextEntry(career, { skipHalftime: true });
  assert.equal(result.kind, 'match');
  assert(stats().hits >= 2, 'the fixture must exercise both halves and any coached stretches');
  assert.equal(result.report.detail.injuries.length, 1, 'one first-half injury must be drawn');
  return { result, injury: result.report.detail.injuries[0], ...stats() };
}

const severeRules = { severeMatchInjuries: true };
const fresh = opening(severeRules);
const acl = quick(fresh, 0.0009);
assert.equal(acl.injury.severeInjury, ACL, 'the lower tail of a match injury should model an ACL tear');
assert(acl.injury.weeks >= 28 && acl.injury.weeks <= 36);
assert.equal(player(acl.result.state, acl.injury.id).severeInjury, ACL);
assert.equal(player(acl.result.state, acl.injury.id).injuryWeeks, acl.injury.weeks, 'the injury-causing fixture is not a recovery week');
assert.equal(fresh.severeMatchInjuries, true);
assert.equal(cm.isAvailable(player(acl.result.state, acl.injury.id)), false);

const achilles = quick(fresh, 0.00215);
assert.equal(achilles.injury.severeInjury, ACHILLES);
assert(achilles.injury.weeks >= 18 && achilles.injury.weeks <= 30);
assert.equal(achilles.injury.id, acl.injury.id);
assert.equal(achilles.injury.minute, acl.injury.minute);
assert.equal(achilles.draws, acl.draws);

const legacy = opening();
const legacyTail = quick(legacy, 0.0009);
const regular = quick(fresh, ordinaryHit);
assert.equal(regular.injury.severeInjury, undefined);
assert.deepEqual(regular.injury, legacyTail.injury);
assert.equal(regular.draws, legacyTail.draws);
const regularSave = structuredClone(regular.result.state);
delete regularSave.severeMatchInjuries;
const legacySave = structuredClone(legacyTail.result.state);
for (const saved of [regularSave, legacySave]) {
  // Press IDs contain a module-wide serial that advances between arms.
  assert.match(saved.press.pending.id, /^pq-1-0-\d+$/);
  saved.press.pending.id = 'pq-1-0';
}
assert.deepEqual(regularSave, legacySave);
assert.equal(acl.draws, legacyTail.draws);

function join(career) {
  seedMatch(7, 0.99);
  const joined = calendar.joinClubNow({
    ...career,
    jobHunt: {
      open: { club: 'Arsenal', league: 'Premier League', tier: 1, season: 1, week: 0, matchesLeft: 0, roll: 0, status: 'accepted' },
      cooldowns: [], sentSeason: 1, sent: 1, summerMove: null,
    },
  });
  assert.equal(joined?.clubName, 'Arsenal');
  return joined;
}
assert.equal(join(fresh).severeMatchInjuries, true);
assert.equal(join(legacy).severeMatchInjuries, undefined);

const wilderness = cm.enterWilderness({
  ...legacy, sacked: true,
  jobHunt: { open: null, cooldowns: [], sentSeason: 1, sent: 1, summerMove: { club: 'Arsenal', blurb: 'Start in the summer' } },
});
assert.equal(wilderness.wilderness.offers[0]?.club, 'Arsenal');
const reemployed = cm.acceptWildernessJob(wilderness, 'Arsenal', severeRules);
assert.equal(reemployed?.clubName, 'Arsenal');
assert.equal(reemployed.season, 2);
assert.equal(reemployed.severeMatchInjuries, true);

const daily = opening(cm.DAILY_START);
assert.equal(daily.severeMatchInjuries, undefined);
assert.equal(quick(daily, 0.0009).injury.severeInjury, undefined);
assert.equal(cm.startNextSeason(legacy).severeMatchInjuries, undefined);
const routine = legacy.squad.find(p => p.age < 26);
routine.injuryWeeks = 3;
routine.contractYears = 4;
const activated = cm.startNextSeason(legacy, undefined, severeRules);
assert.equal(activated.severeMatchInjuries, true);
assert.equal(player(activated, routine.id).injuryWeeks, 0);

seedMatch(19, 0.0009);
const legacyHalf = cm.playNextEntry(legacy);
assert.equal(legacyHalf.kind, 'halftime');
assert(legacyHalf.live.h1Injuries.length > 0);
assert(cm.saveCareer(legacyHalf.state));
const oldPause = cm.loadCareer();
assert.equal(oldPause.severeMatchInjuries, undefined);
assert.equal(oldPause.live.h1Injuries[0].severeInjury, undefined);
seedMatch(41, 0.99);
assert.equal(cm.resumeMatch(oldPause).report.detail.injuries[0].severeInjury, undefined);

seedMatch(19, 0.00215);
const first = cm.playNextEntry(fresh);
assert.equal(first.kind, 'halftime');
assert.equal(first.live.h1Injuries[0].severeInjury, ACHILLES);
assert(cm.saveCareer(first.state));
const restored = cm.loadCareer();
const savedInjury = first.live.h1Injuries[0];
assert.deepEqual(restored.live.h1Injuries[0], savedInjury);
seedMatch(41, 0.99);
const resumed = cm.resumeMatch(restored);
assert.deepEqual(resumed.report.detail.injuries[0], savedInjury);
assert.equal(player(resumed.state, savedInjury.id).injuryWeeks, savedInjury.weeks);

let end = acl.result.state;
end.week = end.calendar.length;
const existing = player(end, acl.injury.id);
existing.contractYears = 4;
const finalDate = calendar.entryDatesOf(end).at(-1);
const summerWeeks = Math.floor(calendar.daysBetween(finalDate, calendar.seasonKickoff(calendar.worldYearOf(end) + 1)) / 7);
assert(summerWeeks > 0 && summerWeeks < existing.injuryWeeks, 'the summer fixture must leave a partial recovery');
let next = cm.startNextSeason(cm.finishSeason(end).state);
if (process.env.CM_SEVERE_CONTROL === 'summer') {
  assert(player(next, existing.id).injuryWeeks > 0, 'summer control must erase a carried spell');
  player(next, existing.id).injuryWeeks = 0;
}
assert.equal(player(next, existing.id).injuryWeeks, existing.injuryWeeks - summerWeeks);
assert.equal(player(next, existing.id).severeInjury, ACL);
assert(cm.saveCareer(next));
next = cm.loadCareer();
assert.equal(player(next, existing.id).severeInjury, ACL);

const initialRecovery = player(next, existing.id).injuryWeeks;
let creditedWeeks = 0;
let played = 0;
while (player(next, existing.id).injuryWeeks > 0 && played < 45) {
  const weeksBefore = nights.tickingWeeksDone(next.calendar, next.week);
  const previous = player(next, existing.id).injuryWeeks;
  seedMatch(100 + played, 0.99);
  const result = cm.playNextEntry(next, { skipHalftime: true });
  next = result.state;
  const elapsed = nights.tickingWeeksDone(next.calendar, next.week) - weeksBefore;
  assert.equal(player(next, existing.id).injuryWeeks, Math.max(0, previous - elapsed));
  creditedWeeks += elapsed;
  played++;
}
assert.equal(creditedWeeks, initialRecovery);
assert.equal(player(next, existing.id).injuryWeeks, 0);
assert.equal(player(next, existing.id).severeInjury, undefined);
assert.equal(cm.isAvailable(player(next, existing.id)), true);
console.log(`Match injury draws: ACL ${acl.injury.weeks} weeks, Achilles ${achilles.injury.weeks} weeks. Victim, minute and draw counts agree with the routine path.`);
console.log(`Recovery: ${summerWeeks} summer weeks and ${creditedWeeks} paid weeks to clearance.`);
console.log('The new halftime save retained its diagnosis and the legacy halftime save kept routine injuries.');
console.log('simClubManagerSevereInjury: career handoffs, legacy rollover and daily controls passed.');
