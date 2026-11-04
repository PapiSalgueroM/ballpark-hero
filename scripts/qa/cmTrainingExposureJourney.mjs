import assert from 'node:assert/strict';

const LIGHT = { intensity: 'light', focus: 'firstTeam' };
const DOUBLE = { intensity: 'double', focus: 'youth' };
const copy = value => JSON.parse(JSON.stringify(value));
const countsOf = player => player.trainingExposure?.counts;
const caption = (weeks, rate) => weeks + ' recorded week' + (weeks === 1 ? '' : 's') + ' · summer mix ' + rate.toFixed(2) + 'x';

// Called by the shared producer after its real Node storage host and bundled engine are available.
export function createCmTrainingFixture({ engine: cm, fence }) {
  let c = cm.startCareer('Recorded Training Club', cm.DEFAULT_ERA_ID, {
    name: 'Recorded Training Club', stadium: 'Training Park', quality: 72, budgetTier: 'mid',
    leagueId: cm.leagueOf('Auckland FC').id, replacedClub: 'Auckland FC',
    crest: { shape: 0, pattern: 0, color1: '#123456', color2: '#ffffff', initials: 'RTC' },
  });
  c = cm.setTrainingPlan(c, LIGHT);
  const traversed = [];
  for (let guard = 0; guard < 48; guard++) {
    const entry = c.calendar[c.week];
    const weeks = cm.recordedTraining(c.squad[0], c).weeks;
    if (weeks >= 2 && entry && !entry.night && cm.entryInvolvesMe(c, entry) && cm.fixtureFor(c, entry)) break;
    const before = c.week;
    const result = cm.playNextEntry(c, { skipHalftime: true, noCoach: true, untilWeek: before + 1 });
    c = result.state;
    traversed.push({ before, after: c.week, kind: result.kind, night: !!entry?.night });
    assert.equal(c.week, before + 1, 'Fixture advances the real calendar one entry at a time');
    assert.ok(!c.sacked && !c.wilderness && !c.live);
  }
  const entry = c.calendar[c.week];
  assert.ok(entry && !entry.night && cm.entryInvolvesMe(c, entry) && cm.fixtureFor(c, entry), 'Native Quick Sim must charge exactly the next ordinary match');
  const next = cm.setTrainingPlan(c, DOUBLE);
  const prospective = new Set(cm.developingPlayers(next).slice(0, 10).map(p => p.id));
  const target = cm.developingPlayers(c).slice(0, 10).find(p => prospective.has(p.id)
    && cm.developmentRate(p, next) > cm.developmentRate(p, c));
  assert.ok(target, 'Actual generated squad has a visible player with a distinct light and double forecast');
  const h = target.trainingExposure, priorWeeks = cm.recordedTraining(target, c).weeks;
  assert.ok(priorWeeks >= 2);
  assert.deepEqual(h, { v: 1, club: c.clubName, season: c.season, counts: [priorWeeks, 0, 0, 0, 0, 0, 0, 0, 0] });
  localStorage.clear(); fence.adopt(cm.SAVE_KEY);
  assert.equal(cm.saveCareer(c), true);
  const loaded = cm.loadCareer();
  assert.ok(loaded);
  assert.equal(cm.saveCareer(loaded), true);
  const raw = localStorage.getItem(cm.SAVE_KEY);
  assert.deepEqual(cm.loadCareer(), loaded);
  return { raw, expected: { key: cm.SAVE_KEY, clubName: c.clubName, season: c.season,
    week: c.week, targetId: target.id, targetName: target.name, priorWeeks, traversed,
    fixtureScope: 'Actual fictional constructor and charged public calendar steps. No RNG or clock overrides.' } };
}

// The shared driver owns context isolation, consent, traffic, console, source and completed-dist closure.
export async function runCmTraining({ page, width, base, fixture, photo, tap, goto, save, engine: cm }) {
  const expected = fixture.expected, key = expected.key;
  const read = async () => JSON.parse(await save(key));
  const target = c => {
    const p = c.squad.find(row => row.id === expected.targetId);
    assert.ok(p, 'CM_TRAINING_APP_PLAYER_HELD'); return p;
  };
  const rateAt = (p, c, plan) => cm.developmentRate(p, { ...c, training: plan });
  const record = () => page.locator('[data-cm-training-record=' + JSON.stringify(expected.targetId) + ']');
  const showTraining = async () => {
    await tap(page.getByRole('tab', { name: 'Home', exact: true }));
    await tap(page.getByRole('button').filter({ has: page.getByText('Training', { exact: true }) }));
    await record().waitFor({ state: 'visible' });
  };
  const resume = async () => {
    const button = page.getByRole('button', { name: 'Resume Career', exact: true });
    await button.waitFor({ state: 'visible' }); await tap(button);
    await page.locator('[data-cm-hub]').waitFor({ state: 'visible' });
  };
  const waitCaption = async (weeks, rate) => {
    const text = caption(weeks, rate);
    await page.waitForFunction(({ id, text }) =>
      document.querySelector('[data-cm-training-record=' + JSON.stringify(id) + ']')?.textContent.trim() === text,
    { id: expected.targetId, text });
    assert.equal((await record().innerText()).trim(), text, 'CM_TRAINING_APP_VISIBLE_MIX');
    return text;
  };
  await goto(base + '/club-manager'); await resume(); await showTraining();
  const before = await read();
  assert.equal(before.clubName, expected.clubName); assert.equal(before.week, expected.week);
  assert.equal(before.season, expected.season);
  assert.deepEqual(before.training, LIGHT);
  const oldRate = rateAt(target(before), before, LIGHT);
  const initialCaption = await waitCaption(expected.priorWeeks, oldRate);
  await tap(page.getByRole('button').filter({ has: page.getByText('Double', { exact: true }) }));
  await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).training.intensity === 'double', key);
  await tap(page.getByRole('button').filter({ has: page.getByText('Youth', { exact: true }) }));
  await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).training.focus === 'youth', key);
  const switched = await read();
  assert.deepEqual(switched.training, DOUBLE);
  assert.deepEqual({ ...switched, training: before.training }, before, 'CM_TRAINING_APP_PLAN_DOES_NOT_REWRITE_HISTORY');
  assert.equal(await waitCaption(expected.priorWeeks, oldRate), initialCaption);
  await tap(page.getByRole('button', { name: 'Club home', exact: true }));
  await tap(page.locator('[data-cm-way="quick"]'));
  await page.waitForFunction(({ key, week }) => JSON.parse(localStorage.getItem(key)).week === week + 1,
    { key, week: before.week });
  await page.getByRole('heading', { name: 'FULL TIME', exact: true }).waitFor({ state: 'visible' });
  await tap(page.getByRole('button', { name: 'Continue', exact: true }));
  await page.locator('[data-cm-hub]').waitFor({ state: 'visible' });
  const advanced = await read(), p = target(advanced);
  const expectedCounts = [expected.priorWeeks, 0, 0, 0, 0, 0, 0, 0, 1];
  assert.deepEqual(advanced.squad.map(p => p.id), before.squad.map(p => p.id), 'CM_TRAINING_APP_SQUAD_HELD');
  for (const member of advanced.squad) assert.deepEqual(member.trainingExposure,
    { v: 1, club: advanced.clubName, season: advanced.season, counts: expectedCounts }, 'CM_TRAINING_APP_REAL_CHARGED_WEEK');
  assert.deepEqual(countsOf(p), expectedCounts);
  const mixed = (expected.priorWeeks * rateAt(p, advanced, LIGHT) + rateAt(p, advanced, DOUBLE)) / (expected.priorWeeks + 1);
  await showTraining();
  const advancedCaption = await waitCaption(expected.priorWeeks + 1, mixed);
  const savedBytes = await save(key);
  await page.reload({ waitUntil: 'domcontentloaded' }); await resume(); await showTraining();
  assert.equal(await save(key), savedBytes, 'CM_TRAINING_APP_RELOAD_BYTES');
  assert.deepEqual(await read(), advanced, 'CM_TRAINING_APP_RELOAD_FRAME');
  const reloadCaption = await waitCaption(expected.priorWeeks + 1, mixed);
  assert.equal(reloadCaption, advancedCaption);
  const geometry = await record().evaluate(node => {
    const r = node.getBoundingClientRect();
    return { text: node.textContent, x: r.x, right: r.right, width: r.width,
      clientWidth: node.clientWidth, scrollWidth: node.scrollWidth,
      viewport: innerWidth, document: document.documentElement.scrollWidth };
  });
  assert.ok(geometry.width > 0 && geometry.x >= -1 && geometry.right <= geometry.viewport + 1
    && geometry.scrollWidth <= geometry.clientWidth + 1 && geometry.document <= geometry.viewport + 1,
  'CM_TRAINING_APP_RECORD_READABLE');
  await photo('recorded-training', '[data-cm-training-record=' + JSON.stringify(expected.targetId) + ']');
  return { status: 'pass', width, scope: 'Real manager plan choice, one charged match, fenced saved bytes and reload.',
    rngOrClockOverrides: false, expected, initialCaption, advancedCaption, reloadCaption, geometry,
    before: { week: before.week, training: before.training, player: target(before) },
    switched: { week: switched.week, training: switched.training, player: target(switched) },
    advanced: { week: advanced.week, training: advanced.training, player: p },
    savedBytesHeldAfterReload: true };
}
