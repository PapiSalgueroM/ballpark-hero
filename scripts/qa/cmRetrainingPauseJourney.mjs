import assert from 'node:assert/strict';

const copy = value => JSON.parse(JSON.stringify(value));
const BASE = { intensity: 'double', focus: 'youth' };
const history = (club, season, light) => ({ v: 1, club, season,
  counts: light ? [0, 0, 1, 0, 0, 0, 0, 0, 0] : [0, 0, 0, 0, 0, 0, 0, 0, 1] });
const targetOf = (state, id) => {
  const player = state.squad.find(p => p.id === id);
  assert.ok(player, 'The declared player is still in the current squad');
  return player;
};

export function createRetrainingPauseFixture({ engine: cm, fence }) {
  let c = cm.startCareer('Course Timing Borough', cm.DEFAULT_ERA_ID, {
    name: 'Course Timing Borough', stadium: 'Course Park', quality: 70, budgetTier: 'mid',
    leagueId: cm.leagueOf('Auckland FC').id, replacedClub: 'Auckland FC',
    crest: { shape: 0, pattern: 0, color1: '#123456', color2: '#ffffff', initials: 'CT' },
  });
  cm.ensureAcademy(c);
  c.budget = 1000; c.wageCap = 100000;
  c.squad = c.squad.map(p => ({ ...p, fitness: 50, injuryWeeks: 3, contractYears: 5 }));
  assert.ok(c.squad.every(p => !p.retraining), 'Constructor starts without invented retraining history');
  const target = c.squad.find(p => p.position !== 'GK');
  assert.ok(target);
  Object.assign(target, { position: 'LW', secondaryPositions: ['RW', 'CM'] });
  c = cm.startRetraining(c, target.id, 'ST');
  assert.ok(c, 'The real existing start API creates the course');
  targetOf(c, target.id).retraining.weeksLeft = 1;
  c.training = { ...BASE }; c.formationIndex = 0; c.mentality = 'balanced';
  c.setPieces = Object.fromEntries(cm.SET_PIECE_KEYS.map(key => [key, null]));
  c.shootoutOrder = [];
  const at = c.calendar.findIndex(entry => entry.type === 'window');
  assert.ok(at >= 0, 'Constructor generated a real paid January window');
  c.week = at; c.press.lastWeek = at;
  c.transferWindow = null; c.windowWeeksLeft = 0;
  localStorage.clear(); fence.adopt(cm.SAVE_KEY);
  assert.equal(cm.saveCareer(c), true);
  c = cm.loadCareer(); assert.ok(c); assert.equal(cm.saveCareer(c), true);
  const raw = localStorage.getItem(cm.SAVE_KEY), p = targetOf(c, target.id);
  assert.equal(c.calendar[c.week].type, 'window'); assert.equal(c.live ?? null, null);
  assert.deepEqual(p.secondaryPositions, ['RW', 'CM']);
  assert.equal(p.retraining.to, 'ST'); assert.equal(p.retraining.weeksLeft, 1);
  assert.ok(p.retraining.weeksTotal >= 1); assert.equal('paused' in p.retraining, false);
  assert.equal(p.fitness, 50); assert.equal(p.injuryWeeks, 3);
  const queue = { v: 1, club: c.clubName, season: c.season, playerId: p.id };

  // Producer-only synthetic skipped-night boundary, not a native played cup or natural progression claim.
  const night = cm.startRetraining(copy(c), p.id, 'ST', true);
  assert.ok(night); assert.equal(targetOf(night, p.id).retraining.paused, true);
  night.calendar.splice(night.week, 0, { type: 'oneOff', round: 0, night: { k: 'dsc', n: 999 } });
  const before = JSON.stringify(night), advanced = cm.playNextEntry(night,
    { skipHalftime: true, noCoach: true, untilWeek: night.week + 1 });
  assert.equal(JSON.stringify(night), before);
  assert.equal(advanced.state.week, night.week + 1);
  assert.deepEqual(advanced.state.squad, night.squad);
  assert.deepEqual(advanced.state.training, night.training);
  assert.equal(localStorage.getItem(cm.SAVE_KEY), raw);
  return { raw, expected: { key: cm.SAVE_KEY, clubName: c.clubName, season: c.season, week: c.week,
    target: { id: p.id, name: p.name, position: p.position }, course: p.retraining,
    positions: p.secondaryPositions, basePlan: BASE, queue, xiIds: c.xiIds, players: c.squad,
    paidFitness: { target: 98, peers: 81 }, paidInjuryWeeks: 2,
    nonPaidBoundary: { kind: advanced.kind, beforeWeek: night.week, afterWeek: advanced.state.week,
      squadHeld: true, courseHeld: true, mainSaveHeld: true,
      scope: 'Real engine with declared synthetic dsc/999 skipped night before the generated January window. Producer-only, not native cup play.' },
    scope: 'Real constructor with declared near-complete saved ST course, learned RW/CM and injured squad. Native paid window checks course pause alongside the released one-player Light recovery. No natural history, match-rest or healing claim.' } };
}

// The caller owns isolated contexts, seed bytes, consent, source/fixture/payload holds and traffic evidence.
export async function runRetrainingPause({ page, width, base, fixture, engine, photo, tap, goto, save }) {
  const x = fixture.expected, key = x.key, actions = [];
  assert.equal(engine.SAVE_KEY, key);
  const read = async () => JSON.parse(await save(key));
  const idle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const scroll = () => page.evaluate(() => ({ x: scrollX, y: scrollY }));
  const native = async (control, action) => {
    await control.scrollIntoViewIfNeeded();
    if (width < 768) await control.tap({ trial: true }); else await control.click({ trial: true });
    await idle(); const before = await scroll();
    await action(); await idle(); const after = await scroll();
    assert.deepEqual(after, before, 'CM_RETRAIN_PAUSE_APP_NO_JUMP');
    actions.push({ before, after });
  };
  const resumeCareer = async () => {
    const button = page.getByRole('button', { name: 'Resume Career', exact: true });
    await button.waitFor({ state: 'visible' }); await tap(button);
    await page.locator('[data-cm-hub]').waitFor({ state: 'visible' });
  };
  const home = async () => {
    await tap(page.getByRole('tab', { name: 'Home', exact: true }));
    const back = page.getByRole('button', { name: 'Club home', exact: true });
    if (await back.isVisible()) await tap(back);
  };
  const training = async () => {
    await home();
    const tile = page.getByRole('button').filter({ has: page.getByText('Training', { exact: true }) });
    await tile.waitFor({ state: 'visible' }); await tap(tile);
    await page.locator('[data-cm-retraining]').waitFor({ state: 'visible' });
  };
  const waitPause = async paused => page.waitForFunction(({ key, id, paused }) => {
    const p = JSON.parse(localStorage.getItem(key)).squad.find(row => row.id === id);
    return p && (paused ? p.retraining?.paused === true : p.retraining && !('paused' in p.retraining));
  }, { key, id: x.target.id, paused });
  const waitQueue = async present => page.waitForFunction(({ key, queue, present }) => {
    const pending = JSON.parse(localStorage.getItem(key)).training?.recoveryWeek;
    return present ? JSON.stringify(pending) === JSON.stringify(queue) : pending === undefined;
  }, { key, queue: x.queue, present });
  const queue = async () => {
    await page.getByRole('combobox', { name: 'Player for recovery', exact: true }).selectOption(x.target.id);
    const button = page.getByRole('button', { name: 'Queue recovery week', exact: true });
    await native(button, async () => { await tap(button); await waitQueue(true); });
    return read();
  };

  await goto(base + '/club-manager'); await resumeCareer();
  const initial = await read(), initialBytes = await save(key);
  assert.equal(initial.clubName, x.clubName); assert.equal(initial.week, x.week); assert.equal(initial.season, x.season);
  assert.deepEqual(initial.training, x.basePlan); assert.deepEqual(initial.xiIds, x.xiIds);
  assert.deepEqual(initial.squad, x.players); assert.deepEqual(targetOf(initial, x.target.id).retraining, x.course);
  await training();
  assert.equal(await save(key), initialBytes, 'CM_RETRAIN_PAUSE_APP_READING_IS_READONLY');
  const pause = page.getByRole('button', { name: 'Pause retraining for ' + x.target.name, exact: true });
  await native(pause, async () => { await tap(pause); await waitPause(true); });
  const paused = await read(), expectedPaused = copy(initial);
  targetOf(expectedPaused, x.target.id).retraining.paused = true;
  assert.deepEqual(paused, expectedPaused, 'CM_RETRAIN_PAUSE_APP_ONLY_ADDS_FLAG');

  const queuedExpected = copy(expectedPaused); queuedExpected.training = { ...x.basePlan, recoveryWeek: x.queue };
  assert.deepEqual(await queue(), queuedExpected, 'CM_RETRAIN_PAUSE_APP_RECOVERY_ONLY_ADDS_ORDER');
  const cancel = page.getByRole('button', { name: 'Cancel recovery week', exact: true });
  await native(cancel, async () => { await tap(cancel); await waitQueue(false); });
  assert.deepEqual(await read(), expectedPaused, 'CM_RETRAIN_PAUSE_APP_RELEASED_CANCEL_KEEPS_COURSE');
  assert.deepEqual(await queue(), queuedExpected);
  const queuedBytes = await save(key);
  await page.reload({ waitUntil: 'domcontentloaded' }); await resumeCareer(); await training();
  assert.equal(await save(key), queuedBytes, 'CM_RETRAIN_PAUSE_APP_RELOAD_PENDING_BYTES');
  const courseRow = page.locator('[data-cm-retraining]').filter({ has: page.getByRole('button', {
    name: 'Resume retraining for ' + x.target.name, exact: true }) });
  await courseRow.getByText('Paused: 1 paid week still to go.', { exact: true }).waitFor({ state: 'visible' });
  const card = page.locator('[data-cm-retrain-card]'); await card.scrollIntoViewIfNeeded();
  const geometry = await card.evaluate(node => {
    const r = node.getBoundingClientRect();
    return { x: r.x, right: r.right, width: r.width, scroll: node.scrollWidth, client: node.clientWidth,
      document: document.documentElement.scrollWidth, viewport: innerWidth };
  });
  assert.ok(geometry.width > 0 && geometry.x >= -1 && geometry.right <= width + 1
    && geometry.scroll <= geometry.client + 1 && geometry.document <= width + 1, 'CM_RETRAIN_PAUSE_APP_READABLE');
  const r = await courseRow.getByRole('button', { name: 'Resume retraining for ' + x.target.name, exact: true }).boundingBox();
  assert.ok(r && r.width >= 44 && r.height >= 44, 'CM_RETRAIN_PAUSE_APP_NATIVE_TARGET');
  await photo('retraining-pause', '[data-cm-retrain-card]');

  await home(); await tap(page.getByRole('button', { name: 'Open the Window', exact: true }));
  await page.waitForFunction(({ key, week }) => JSON.parse(localStorage.getItem(key)).week === week + 1,
    { key, week: x.week });
  const paid = await read();
  assert.equal(paid.week, x.week + 1); assert.deepEqual(paid.training, x.basePlan);
  assert.deepEqual(paid.xiIds, initial.xiIds, 'CM_RETRAIN_PAUSE_APP_DOES_NOT_RESELECT_XI');
  const expectedPlayers = expectedPaused.squad.map(p => ({ ...p,
    fitness: p.id === x.target.id ? x.paidFitness.target : x.paidFitness.peers,
    injuryWeeks: x.paidInjuryWeeks, trainingExposure: history(x.clubName, x.season, p.id === x.target.id) }));
  assert.deepEqual(paid.squad, expectedPlayers, 'CM_RETRAIN_PAUSE_APP_PAID_COURSE_HELD_RECOVERY_EXACT');
  assert.deepEqual(targetOf(paid, x.target.id).secondaryPositions, x.positions);
  const paidBytes = await save(key);
  await page.reload({ waitUntil: 'domcontentloaded' }); await resumeCareer(); await training();
  assert.equal(await save(key), paidBytes, 'CM_RETRAIN_PAUSE_APP_PAID_RELOAD_BYTES');
  const resume = page.getByRole('button', { name: 'Resume retraining for ' + x.target.name, exact: true });
  await native(resume, async () => { await tap(resume); await waitPause(false); });
  const resumed = await read(), expectedResumed = copy(paid);
  delete targetOf(expectedResumed, x.target.id).retraining.paused;
  assert.deepEqual(resumed, expectedResumed, 'CM_RETRAIN_PAUSE_APP_RESUME_REMOVES_ONLY_FLAG');
  assert.deepEqual(targetOf(resumed, x.target.id).retraining, x.course);
  const resumedBytes = await save(key);
  await page.reload({ waitUntil: 'domcontentloaded' }); await resumeCareer(); await training();
  assert.equal(await save(key), resumedBytes, 'CM_RETRAIN_PAUSE_APP_RESUMED_RELOAD_BYTES');
  await page.getByRole('button', { name: 'Pause retraining for ' + x.target.name, exact: true }).waitFor({ state: 'visible' });
  return { status: 'pass', width, target: x.target, geometry, control: r, actions,
    pausedCourse: targetOf(paid, x.target.id).retraining, resumedCourse: targetOf(resumed, x.target.id).retraining,
    paidWeek: paid.week, basePlan: x.basePlan, xiHeld: true, paidPlayers: paid.squad,
    pendingReloadBytesHeld: true, paidReloadBytesHeld: true, resumedReloadBytesHeld: true,
    nonPaidBoundary: x.nonPaidBoundary, rngOrClockOverrides: false,
    scope: 'Native pause, existing recovery queue/cancel/requeue, exact reloads and one real paid January window, then resume without losing progress. No automatic XI rest, extra healing or global RNG-tape claim. Completion/replacement and unknown metadata are unit scope; skipped-night check is producer-only.' };
}
