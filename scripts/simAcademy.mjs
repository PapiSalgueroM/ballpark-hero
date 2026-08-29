/**
 * Round 116 harness: does the academy, the scouting network and the training
 * ground actually change a season, or are they three more screens?
 *
 * The failure mode this exists to catch is decoration. Before this round a
 * twenty year old improved by the same one to three points a season whether he
 * played forty games or none, whether he was a future world beater or a squad
 * filler, and whether the club had spent a hundred million on its training
 * ground or nothing at all, because growth read only his birthday. Any screen
 * built on top of that would have been a lie.
 *
 * So this measures OUTCOMES against a do nothing baseline: the same club, the
 * same number of seasons, one manager working the academy and one ignoring it,
 * and it prints the gap. It also checks the pieces underneath, because a
 * headline number that comes from one lucky run is worse than no number.
 *
 * Run: node scripts/simAcademy.mjs
 */
/* Round 299: seeded stream, see scripts/lib/seedRandom.mjs. First import on purpose. */
import './lib/seedRandom.mjs';
import os from 'node:os';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = path.join(os.tmpdir(), 'acaEntry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'aca.bundle.mjs');

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const mod = await import('${ROOT.replaceAll('\\', '/')}/src/lib/clubManager.ts');
export const cm = mod;
`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error`, { stdio: 'inherit' });

const { cm } = await import(pathToFileURL(BUNDLE).href);
const {
  startCareer, playNextEntry, finishSeason, startNextSeason,
  FORMATIONS, autoPickXI, objectiveStatuses, sellValue,
  ensureAcademy, upgradeAcademy, academyUpgradeCost, hireScout, recallScout,
  promoteProspect, releaseProspect, setTrainingPlan, developmentRate, developingPlayers,
  rollPotential, SCOUT_REGIONS, SCOUT_TRIPS, MAX_SCOUTS, MAX_PROSPECTS,
} = cm;

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const mean = a => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);

function runSeason(s) {
  let guard = 0;
  while (s.week < s.calendar.length && guard < 140) {
    guard++;
/* Round 125: Round 119 made every match stop at half time, and playNextEntry
   parks on the interval waiting for a decision unless it is told not to. This
   harness is about the season, not the interval, so every call below takes the
   straight through path, which is exactly the game this file was calibrated
   against before Round 119 existed. simHalftime and simOpposition are the two
   that DO want the break and they call playNextEntry raw on purpose. */
    const r = playNextEntry(s, { skipHalftime: true });
    s = r.state;
    if (r.kind === 'seasonOver') break;
  }
  return s;
}

/* ---------- 1. Intake quality tracks what you spent on the academy ---------- */
console.log('1) Intake day reads the setup, not a dice roll');
{
  // Rollovers only, no football: intake runs once per season change, so this
  // samples a lot of intakes cheaply.
  const sample = (levels) => {
    const counts = [];
    const pots = [];
    let best = 0;
    for (let run = 0; run < 12; run++) {
      let s = startCareer('Everton');
      ensureAcademy(s);
      for (let year = 0; year < 6; year++) {
        s.academy.recruitment = levels;
        s.academy.coaching = levels;
        s.academy.facilities = levels;
        const before = s.academy.prospects.length;
        s = startNextSeason(s);
        const fresh = s.academy.prospects.filter(p => p.source === 'Academy' && p.season === s.season);
        counts.push(s.academy.prospects.length - before + Math.max(0, before + fresh.length - MAX_PROSPECTS));
        for (const p of fresh) { pots.push(p.potential); best = Math.max(best, p.potential); }
        // clear the books so the cap never hides an intake
        s.academy.prospects = [];
      }
    }
    return { count: mean(counts), pot: mean(pots), best };
  };
  const poor = sample(3);
  const rich = sample(19);
  console.log(`   a starved academy (3/20): ${poor.count.toFixed(1)} kids a year, average ceiling ${poor.pot.toFixed(1)}, best seen ${poor.best}`);
  console.log(`   a maxed academy (19/20):  ${rich.count.toFixed(1)} kids a year, average ceiling ${rich.pot.toFixed(1)}, best seen ${rich.best}`);
  if (rich.count <= poor.count) fail('a maxed academy does not produce more players than a starved one');
  if (rich.pot <= poor.pot + 8) fail(`only ${(rich.pot - poor.pot).toFixed(1)} points of ceiling between a maxed and a starved academy`);
  if (poor.best >= 88) fail('a starved academy is producing generational talent');
  if (rich.best < 82) fail('a maxed academy never produced anyone worth having');
  // and the money has to be a real decision
  const early = academyUpgradeCost(4);
  const late = academyUpgradeCost(17);
  console.log(`   upgrading level 4 costs ${early}m, level 17 costs ${late}m`);
  if (late <= early * 3) fail('the upgrade curve is flat, so maxing everything is free');
}

/* ---------- 2. Scouts: network finds, judgement tells the truth ---------- */
console.log('2) A scout is worth what you paid for him');
{
  const sendAndRun = (network, judgement, regionId, runs) => {
    let found = 0, pot = [], band = [];
    for (let run = 0; run < runs; run++) {
      let s = startCareer('Everton');
      ensureAcademy(s);
      s.budget = 500;
      s.academy.candidates[0] = { ...s.academy.candidates[0], network, judgement, fee: 2 };
      const hired = hireScout(s, s.academy.candidates[0].id, regionId, 32);
      if (!hired) { fail('a scout could not be sent with money in the bank'); break; }
      s = hired;
      s = runSeason(s);
      const kids = s.academy.prospects.filter(p => p.source !== 'Academy');
      found += kids.length;
      for (const k of kids) { pot.push(k.potential); band.push(k.highGuess - k.lowGuess); }
    }
    return { perTrip: found / runs, pot: mean(pot), band: mean(band) };
  };
  const weak = sendAndRun(1, 1, 'mexico', 20);
  const strong = sendAndRun(5, 5, 'brazil', 20);
  console.log(`   1 star in Mexico: ${weak.perTrip.toFixed(2)} finds a trip, average ceiling ${weak.pot.toFixed(1)}, report band ${weak.band.toFixed(1)} wide`);
  console.log(`   5 star in Brazil: ${strong.perTrip.toFixed(2)} finds a trip, average ceiling ${strong.pot.toFixed(1)}, report band ${strong.band.toFixed(1)} wide`);
  if (strong.perTrip <= weak.perTrip * 1.5) fail('a five star network barely finds more players than a one star one');
  if (strong.pot <= weak.pot + 6) fail('the country a scout is sent to barely changes what he finds');
  if (strong.band >= weak.band) fail('a five star judgement reports as vaguely as a one star one');
  if (weak.perTrip === 0) fail('a weak scout never finds anybody at all, so he is not a choice, he is a trap');
  // and the caps hold
  let s = startCareer('Arsenal');
  s.budget = 900;
  ensureAcademy(s);
  for (let i = 0; i < 6; i++) {
    const n = hireScout(s, s.academy.candidates[0].id, 'spain', 20);
    if (n) s = n;
  }
  console.log(`   tried to send six scouts, ${s.academy.scouts.length} went (cap ${MAX_SCOUTS})`);
  if (s.academy.scouts.length > MAX_SCOUTS) fail('the scout cap does not hold');
  const back = recallScout(s, s.academy.scouts[0].id);
  if (back.academy.scouts.length !== s.academy.scouts.length - 1) fail('recalling a scout did not bring him home');
}

/* ---------- 3. Growth reads game time, ceiling and the training plan ---------- */
console.log('3) Development reads minutes, ceiling and the plan');
{
  const s = startCareer('Everton');
  ensureAcademy(s);
  const kid = { ...s.squad[0], age: 18, rating: 60, potential: 84, apps: 0 };
  const played = { ...kid, apps: 34 };
  const capped = { ...kid, potential: 61 };
  const benchRate = developmentRate(kid, s);
  const playRate = developmentRate(played, s);
  const cappedRate = developmentRate(capped, s);
  console.log(`   same 18 year old: ${benchRate.toFixed(2)} on the bench, ${playRate.toFixed(2)} playing every week`);
  console.log(`   a kid with nothing left to give: ${cappedRate.toFixed(2)}`);
  if (playRate <= benchRate * 1.5) fail('playing every week barely beats never playing');
  if (cappedRate >= benchRate * 0.5) fail('a player at his ceiling develops like one with room left');

  const youthPlan = setTrainingPlan(s, { intensity: 'double', focus: 'youth' });
  const seniorPlan = setTrainingPlan(s, { intensity: 'light', focus: 'firstTeam' });
  const a = developmentRate(played, youthPlan);
  const b = developmentRate(played, seniorPlan);
  console.log(`   double sessions built round the kids: ${a.toFixed(2)} vs light sessions built round the seniors: ${b.toFixed(2)}`);
  if (a <= b * 1.6) fail('the training plan barely moves a teenager');

  // coaching level has to matter on its own
  const poorCoach = JSON.parse(JSON.stringify(s));
  poorCoach.academy.coaching = 1; poorCoach.academy.facilities = 1;
  const goodCoach = JSON.parse(JSON.stringify(s));
  goodCoach.academy.coaching = 20; goodCoach.academy.facilities = 20;
  const lo = developmentRate(played, poorCoach);
  const hi = developmentRate(played, goodCoach);
  console.log(`   worst staff in the game ${lo.toFixed(2)} vs the best ${hi.toFixed(2)}`);
  if (hi <= lo * 1.25) fail('coaching and facilities barely change how fast anyone improves');

  // end to end: the same squad, aged twice, differing only in who played
  const growth = (apps) => {
    const gains = [];
    for (let run = 0; run < 30; run++) {
      let st = startCareer('Everton');
      ensureAcademy(st);
      st.squad = st.squad.map(p => (p.age <= 22 ? { ...p, apps, potential: Math.max(p.potential ?? p.rating, p.rating + 12) } : p));
      const before = new Map(st.squad.filter(p => p.age <= 22).map(p => [p.id, p.rating]));
      const after = startNextSeason(st);
      for (const p of after.squad) {
        if (before.has(p.id)) gains.push(p.rating - before.get(p.id));
      }
    }
    return mean(gains);
  };
  const benched = growth(0);
  const regular = growth(34);
  console.log(`   a season later, the under 22s gained ${benched.toFixed(2)} on the bench and ${regular.toFixed(2)} playing`);
  if (regular <= benched + 0.6) fail('a full season of football is worth less than a rating point');
}

/* ---------- 4. THE HEADLINE: engaged versus ignoring the lot ---------- */
console.log('4) An engaged manager versus one who never opens the door');
{
  const SEASONS = 6;
  const RUNS = 30;

  /** Force up to three academy graduates into the XI, the way a manager would. */
  const bloodTheKids = (s) => {
    const formation = FORMATIONS[s.formationIndex] ?? FORMATIONS[0];
    const xi = autoPickXI(s.squad, formation);
    const byId = new Map(s.squad.map(p => [p.id, p]));
    const grads = s.squad
      .filter(p => p.academyGrad && p.injuryWeeks === 0)
      .sort((a, b) => (b.potential ?? b.rating) - (a.potential ?? a.rating))
      .slice(0, 3);
    for (const g of grads) {
      if (xi.includes(g.id)) continue;
      let target = -1;
      for (let i = 0; i < formation.slots.length; i++) {
        if (!formation.slots[i].allowed.includes(g.position)) continue;
        const cur = xi[i] ? byId.get(xi[i]) : null;
        if (!cur) { target = i; break; }
        if (target < 0 || (byId.get(xi[target])?.rating ?? 99) > cur.rating) target = i;
      }
      if (target >= 0) xi[target] = g.id;
    }
    return { ...s, xiIds: xi };
  };

  const play = (engaged) => {
    let s = startCareer('Everton');
    let promoted = 0, youthMet = 0, spentOnAcademy = 0;
    for (let year = 0; year < SEASONS; year++) {
      if (engaged) {
        // Pour the summer budget into the setup, keeping a little back.
        for (const kind of ['recruitment', 'coaching', 'facilities', 'recruitment', 'coaching']) {
          const before = s.budget;
          const n = upgradeAcademy(s, kind);
          if (n && n.budget >= 6) { spentOnAcademy += before - n.budget; s = n; }
        }
        s = setTrainingPlan(s, { intensity: 'double', focus: 'youth' });
        if (s.academy.scouts.length < MAX_SCOUTS && s.academy.candidates.length) {
          const best = [...s.academy.candidates].sort((a, b) => (b.network + b.judgement) - (a.network + a.judgement))[0];
          const n = hireScout(s, best.id, 'brazil', 32);
          if (n) { spentOnAcademy += s.budget - n.budget; s = n; }
        }
        // Sign the two best reported kids, drop anyone hopeless.
        const ranked = [...s.academy.prospects].sort((a, b) => b.highGuess - a.highGuess);
        for (const p of ranked.slice(0, 2)) {
          const n = promoteProspect(s, p.id);
          if (n) { s = n; promoted += 1; }
        }
        for (const p of ranked.slice(6)) s = releaseProspect(s, p.id);
        s = bloodTheKids(s);
      }
      s = runSeason(s);
      const statuses = objectiveStatuses({ ...s, week: s.calendar.length });
      if (statuses.some(o => o.objective.id === 'youth' && o.status === 'done')) youthMet += 1;
      s = finishSeason(s).state;
      s = startNextSeason(s);
    }
    const grads = s.squad.filter(p => p.academyGrad);
    const xi = [...s.squad].sort((a, b) => b.rating - a.rating).slice(0, 11);
    return {
      promoted,
      grads: grads.length,
      bestGrad: grads.length ? Math.max(...grads.map(p => p.rating)) : 0,
      goodGrads: grads.filter(p => p.rating >= 72).length,
      gradValue: grads.reduce((t, p) => t + sellValue(p), 0),
      xiAvg: xi.reduce((t, p) => t + p.rating, 0) / 11,
      under23: s.squad.filter(p => p.age <= 23 && p.rating >= 70).length,
      youthMet,
      spentOnAcademy,
    };
  };

  const arms = {};
  for (const engaged of [false, true]) {
    const runs = [];
    for (let i = 0; i < RUNS; i++) runs.push(play(engaged));
    arms[engaged ? 'engaged' : 'ignored'] = {
      promoted: mean(runs.map(r => r.promoted)),
      grads: mean(runs.map(r => r.grads)),
      bestGrad: mean(runs.map(r => r.bestGrad)),
      goodGrads: mean(runs.map(r => r.goodGrads)),
      gradValue: mean(runs.map(r => r.gradValue)),
      xiAvg: mean(runs.map(r => r.xiAvg)),
      under23: mean(runs.map(r => r.under23)),
      youthMet: mean(runs.map(r => r.youthMet)),
      spent: mean(runs.map(r => r.spentOnAcademy)),
    };
  }
  const ig = arms.ignored, en = arms.engaged;
  console.log(`   ${RUNS} careers per arm, ${SEASONS} seasons each, both at Everton`);
  console.log(`   IGNORED: ${ig.grads.toFixed(1)} academy players in the squad, best of them ${ig.bestGrad.toFixed(1)}, ${ig.goodGrads.toFixed(1)} of them 72 plus`);
  console.log(`   ENGAGED: ${en.grads.toFixed(1)} academy players in the squad, best of them ${en.bestGrad.toFixed(1)}, ${en.goodGrads.toFixed(1)} of them 72 plus`);
  console.log(`   best XI average after ${SEASONS} seasons: ${ig.xiAvg.toFixed(2)} ignoring it, ${en.xiAvg.toFixed(2)} working it (gap ${(en.xiAvg - ig.xiAvg).toFixed(2)})`);
  console.log(`   under 23s rated 70 plus: ${ig.under23.toFixed(1)} vs ${en.under23.toFixed(1)}`);
  console.log(`   free talent on the books: ${ig.gradValue.toFixed(0)}m vs ${en.gradValue.toFixed(0)}m of sellable academy players`);
  console.log(`   board's blood the kids objective met: ${ig.youthMet.toFixed(1)}/${SEASONS} seasons vs ${en.youthMet.toFixed(1)}/${SEASONS}`);
  console.log(`   the engaged manager put ${en.spent.toFixed(0)}m through the academy to get there`);

  if (en.grads < 2) fail('an engaged manager finished with almost no academy players');
  if (ig.grads > 0.2) fail('a manager who never opened the academy still ended up with graduates');
  if (en.bestGrad < 70) fail(`the best academy player an engaged manager produced was only ${en.bestGrad.toFixed(1)}`);
  if (en.xiAvg <= ig.xiAvg + 1) fail(`working the academy is worth only ${(en.xiAvg - ig.xiAvg).toFixed(2)} on the XI, which is noise`);
  if (en.under23 <= ig.under23 + 0.5) fail('the engaged manager has no more young talent than the one who ignored it');
  if (en.gradValue < 25) fail('the academy never produced anything worth money');
  if (en.goodGrads < 1) fail('no academy player ever became genuinely good');
  // The board's blood the kids objective is nearly always met either way,
  // because every squad carries youth pads, so this is a regression guard and
  // not a headline. Asserting engaged BEATS ignored here would flap.
  if (en.youthMet < ig.youthMet - 0.5) fail('working the academy somehow made the youth objective harder to meet');
  if (en.spent < 20) fail('the engaged path did not actually cost anything, so it is not a trade');
}

/* ---------- 5. Working them harder is a real trade, not a free win ---------- */
console.log('5) Double sessions cost you something');
{
  // Injuries are counted as player weeks accumulated across the whole run, not
  // as a snapshot on one date. A snapshot of "who is hurt right now" over
  // twenty runs is a handful of players and it flapped.
  const RUNS = 30;
  const measure = (intensity) => {
    let fit = [], hurtWeeks = 0;
    for (let run = 0; run < RUNS; run++) {
      let s = startCareer('Everton');
      s = setTrainingPlan(s, { intensity, focus: 'balanced' });
      let guard = 0;
      while (guard < 24 && s.week < s.calendar.length) {
        guard++;
        const r = playNextEntry(s, { skipHalftime: true });
        s = r.state;
        hurtWeeks += s.squad.filter(p => p.injuryWeeks > 0).length;
        if (r.kind === 'seasonOver' || s.sacked) break;
      }
      fit.push(mean(s.squad.map(p => p.fitness)));
    }
    return { fit: mean(fit), knocks: hurtWeeks / RUNS };
  };
  const light = measure('light');
  const normal = measure('normal');
  const double = measure('double');
  console.log(`   after 24 weeks: light leaves the squad on ${light.fit.toFixed(1)} fitness, normal ${normal.fit.toFixed(1)}, double ${double.fit.toFixed(1)}`);
  console.log(`   player weeks lost to knocks over those 24 weeks: light ${light.knocks.toFixed(1)}, normal ${normal.knocks.toFixed(1)}, double ${double.knocks.toFixed(1)}`);
  if (light.fit <= double.fit) fail('light training does not leave a fresher squad, so intensity is free');
  if (double.knocks <= light.knocks) fail('double sessions never hurt anybody, so there is no downside');
  if (light.fit - double.fit > 25) fail('double training wipes the squad out so hard nobody would ever pick it');
}

/* ---------- 6. Old saves, and the repair is a no-op twice ---------- */
console.log('6) A save from before any of this existed');
{
  const s = startCareer('Ajax');
  const legacy = JSON.parse(JSON.stringify(s));
  delete legacy.academy;
  delete legacy.training;
  delete legacy.academyGraduates;
  for (const p of legacy.squad) delete p.potential;
  ensureAcademy(legacy);
  const missing = legacy.squad.filter(p => p.potential === undefined).length;
  console.log(`   repaired: ${legacy.squad.length} potentials set (${missing} missing), academy ${legacy.academy.recruitment}/${legacy.academy.coaching}/${legacy.academy.facilities}, training ${legacy.training.intensity}`);
  if (missing > 0) fail(`${missing} players came out of the repair with no ceiling`);
  if (!legacy.academy || !legacy.training) fail('the repair did not build an academy or a training plan');
  if (legacy.academy.candidates.length < 3) fail('the repair left nobody to hire');
  const before = JSON.stringify(legacy);
  ensureAcademy(legacy);
  if (JSON.stringify(legacy) !== before) fail('the repair changed an already repaired save');
  // nobody starts above his own ceiling
  let over = 0;
  for (const club of ['Manchester City', 'Burnley', 'Real Madrid', 'Inter Miami']) {
    const st = startCareer(club);
    over += st.squad.filter(p => (p.potential ?? 0) < p.rating).length;
    const old = st.squad.filter(p => p.age >= 31);
    if (old.length && old.every(p => p.potential > p.rating + 1)) fail(`${club}: veterans are still carrying big ceilings`);
  }
  console.log(`   ${over} players across four clubs start above their own ceiling`);
  if (over > 0) fail('a player starts rated higher than his ceiling');
  // and rollPotential stays inside the rails
  let bad = 0;
  for (let i = 0; i < 4000; i++) {
    const r = 40 + Math.floor(Math.random() * 55);
    const a = 16 + Math.floor(Math.random() * 22);
    const pot = rollPotential(r, a);
    if (pot < r || pot > 95) bad++;
  }
  if (bad > 0) fail(`${bad} rolled ceilings landed outside the rails`);
}

/* ---------- 7. The books and the squad both stay sane ---------- */
console.log('7) Caps, money and the squad list hold up');
{
  let s = startCareer('Burnley');
  ensureAcademy(s);
  s.budget = 0;
  const broke = upgradeAcademy(s, 'coaching');
  if (broke) fail('an academy upgrade went through with no money');
  s.budget = 400;
  for (let i = 0; i < 40; i++) {
    s.academy.prospects.push({
      id: `t-${i}`, name: `Test ${i}`, position: 'CM', age: 17, rating: 55,
      potential: 60 + (i % 30), lowGuess: 58, highGuess: 60 + (i % 30), source: 'Academy',
      flag: '', fee: 0, season: 1,
    });
  }
  // the cap only trims through addProspect, so this checks the promote path
  console.log(`   books forced to ${s.academy.prospects.length}, promoting until the squad is full`);
  let signed = 0;
  for (const p of [...s.academy.prospects]) {
    const n = promoteProspect(s, p.id);
    if (n) { s = n; signed++; } else break;
  }
  console.log(`   ${signed} signed, squad now ${s.squad.length}, ${s.academy.prospects.length} still on the books`);
  if (s.squad.length > 30) fail(`the squad blew past the cap at ${s.squad.length}`);
  if (signed === 0) fail('no prospect could be promoted at all');
  const noSuch = promoteProspect(s, 'not-a-real-id');
  if (noSuch) fail('promoting a player who does not exist worked');
  for (const p of s.squad.filter(x => x.academyGrad)) {
    if (!p.wage || p.wage < 1) fail(`${p.name} came up from the academy with no wage`);
    if (!p.contractYears) fail(`${p.name} came up from the academy with no contract`);
    if (p.potential === undefined) fail(`${p.name} came up from the academy with no ceiling`);
  }
  // a graduate has to be a real player, sellable and biddable, not a youth pad
  const grad = s.squad.find(p => p.academyGrad);
  if (grad && grad.isYouth) fail('an academy graduate is flagged as a youth pad, so he sells for a fraction of his worth');
  const dev = developingPlayers(s);
  console.log(`   ${dev.length} players in the squad still have room to grow`);
  if (dev.length === 0) fail('nobody in a squad full of teenagers has room to grow');
}

/* ---------- 8. Copy check ---------- */
console.log('8) Copy check');
{
  const files = [
    'src/lib/clubManager.ts',
    'src/components/club-manager/AcademyScreen.tsx',
    'src/components/club-manager/TrainingScreen.tsx',
    'src/hooks/useClubManager.ts',
    'src/pages/ClubManager.tsx',
  ];
  let dashes = 0;
  for (const f of files) {
    const text = fs.readFileSync(path.join(ROOT, f), 'utf8');
    text.split('\n').forEach((line, i) => {
      if (/[–—]/.test(line) && !line.includes('─')) { dashes++; fail(`${f}:${i + 1} has an em or en dash`); }
    });
  }
  if (dashes === 0) console.log(`   ${files.length} files clean`);
}

console.log(failures === 0 ? '\nALL ACADEMY CHECKS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
