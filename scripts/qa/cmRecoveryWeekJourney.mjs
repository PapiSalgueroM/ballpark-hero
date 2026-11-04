import assert from 'node:assert/strict';

const copy = value => JSON.parse(JSON.stringify(value));
const BASE = { intensity: 'double', focus: 'youth' };
const history = (club, season, light) => ({ v: 1, club, season,
  counts: light ? [0, 0, 1, 0, 0, 0, 0, 0, 0] : [0, 0, 0, 0, 0, 0, 0, 0, 1] });

export function createRecoveryWeekFixture({ engine: cm, fence }) {
  let c = cm.startCareer('Recovery Borough', cm.DEFAULT_ERA_ID, {
    name: 'Recovery Borough', stadium: 'Recovery Park', quality: 70, budgetTier: 'mid',
    leagueId: cm.leagueOf('Auckland FC').id, replacedClub: 'Auckland FC',
    crest: { shape: 0, pattern: 0, color1: '#123456', color2: '#ffffff', initials: 'RB' },
  });
  cm.ensureAcademy(c);
  c.budget = 1000; c.wageCap = 100000;
  c.squad = c.squad.map(p => ({ ...p, fitness: 50, injuryWeeks: 3, contractYears: 5 }));
  c.training = { ...BASE }; c.formationIndex = 0; c.mentality = 'balanced';
  c.setPieces = Object.fromEntries(cm.SET_PIECE_KEYS.map(key => [key, null]));
  c.shootoutOrder = [];
  const at = c.calendar.findIndex(entry => entry.type === 'window');
  assert.ok(at >= 0, 'Constructor generated a real January window');
  c.week = at; c.press.lastWeek = at;
  c.transferWindow = null; c.windowWeeksLeft = 0;
  localStorage.clear(); fence.adopt(cm.SAVE_KEY);
  assert.equal(cm.saveCareer(c), true);
  c = cm.loadCareer(); assert.ok(c); assert.equal(cm.saveCareer(c), true);
  const raw = localStorage.getItem(cm.SAVE_KEY), target = c.squad[0];
  assert.ok(target && target.injuryWeeks === 3 && target.fitness === 50);
  assert.equal(c.calendar[c.week].type, 'window'); assert.equal(c.live ?? null, null);
  const queue = { v: 1, club: c.clubName, season: c.season, playerId: target.id };

  // This is an explicit producer-only skipped-night boundary check, not a native played cup journey.
  const night = cm.setTrainingPlan(copy(c), { ...BASE, recoveryWeek: queue });
  night.calendar.splice(night.week, 0, { type: 'oneOff', round: 0, night: { k: 'dsc', n: 999 } });
  const before = JSON.stringify(night), advanced = cm.playNextEntry(night,
    { skipHalftime: true, noCoach: true, untilWeek: night.week + 1 });
  assert.equal(JSON.stringify(night), before);
  assert.equal(advanced.state.week, night.week + 1);
  assert.deepEqual(advanced.state.squad, night.squad);
  assert.deepEqual(advanced.state.training, night.training);
  assert.equal(localStorage.getItem(cm.SAVE_KEY), raw);
  return { raw, expected: { key: cm.SAVE_KEY, clubName: c.clubName, season: c.season, week: c.week,
    basePlan: BASE, queue, target: { id: target.id, name: target.name, position: target.position },
    xiIds: c.xiIds, players: c.squad,
    paidFitness: { target: 98, peers: 81 }, paidInjuryWeeks: 2,
    nonPaidBoundary: { kind: advanced.kind, beforeWeek: night.week, afterWeek: advanced.state.week,
      squadHeld: true, pendingHeld: true, mainSaveHeld: true,
      scope: 'Real engine, declared synthetic dsc/999 skipped night before the actual generated window. Producer-only boundary, not native cup play.' },
    scope: 'Explicit injured-player real-constructor fixture. One native paid January window demonstrates existing Light recovery and its recorded growth tradeoff, not healing, automatic XI rest or natural career progression.' } };
}

// The caller owns isolated contexts, fixture seeding, consent, traffic and source/payload inventories.
export async function runRecoveryWeek({ page, width, base, fixture, engine, photo, tap, goto, save }) {
  const x = fixture.expected, key = x.key;
  assert.equal(engine.SAVE_KEY, key);
  const read = async () => JSON.parse(await save(key));
  const resume = async () => {
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
    await page.getByRole('combobox', { name: 'Player for recovery', exact: true }).waitFor({ state: 'visible' });
  };
  const waitQueue = async present => page.waitForFunction(({ key, queue, present }) => {
    const pending = JSON.parse(localStorage.getItem(key)).training?.recoveryWeek;
    return present ? JSON.stringify(pending) === JSON.stringify(queue) : pending === undefined;
  }, { key, queue: x.queue, present });
  const queue = async () => {
    await page.getByRole('combobox', { name: 'Player for recovery', exact: true }).selectOption(x.target.id);
    await tap(page.getByRole('button', { name: 'Queue recovery week', exact: true }));
    await waitQueue(true);
    await page.getByText(/Light next paid week/i).waitFor({ state: 'visible' });
    return read();
  };

  await goto(base + '/club-manager'); await resume();
  const initial = await read(), initialBytes = await save(key);
  assert.equal(initial.clubName, x.clubName); assert.equal(initial.week, x.week); assert.equal(initial.season, x.season);
  assert.deepEqual(initial.training, x.basePlan); assert.deepEqual(initial.xiIds, x.xiIds);
  assert.deepEqual(initial.squad, x.players);
  await training();
  assert.equal(await save(key), initialBytes, 'CM_RECOVERY_APP_TRAINING_READ_IS_READONLY');
  const first = await queue(), expectedQueued = copy(initial);
  expectedQueued.training = { ...x.basePlan, recoveryWeek: x.queue };
  assert.deepEqual(first, expectedQueued, 'CM_RECOVERY_APP_QUEUE_ONLY_ADDS_THE_ORDER');
  await tap(page.getByRole('button', { name: 'Cancel recovery week', exact: true })); await waitQueue(false);
  assert.deepEqual(await read(), initial, 'CM_RECOVERY_APP_CANCEL_RESTORES_THE_WHOLE_FRAME');
  assert.equal(await save(key), initialBytes);

  const queued = await queue(), queuedBytes = await save(key);
  assert.deepEqual(queued, expectedQueued);
  await page.reload({ waitUntil: 'domcontentloaded' }); await resume(); await training();
  assert.equal(await save(key), queuedBytes, 'CM_RECOVERY_APP_RELOAD_DOES_NOT_CONSUME_OR_REWRITE');
  const pending = page.getByText(/Light next paid week/i);
  await pending.waitFor({ state: 'visible' }); assert.ok((await pending.textContent()).includes(x.target.name));
  const card = page.locator('div.bg-card').filter({ has: page.getByRole('combobox', { name: 'Player for recovery', exact: true }) });
  await card.scrollIntoViewIfNeeded();
  const geometry = await card.evaluate(node => {
    const r = node.getBoundingClientRect();
    return { x: r.x, right: r.right, width: r.width, scroll: node.scrollWidth, client: node.clientWidth,
      document: document.documentElement.scrollWidth, viewport: innerWidth };
  });
  assert.ok(geometry.width > 0 && geometry.x >= -1 && geometry.right <= width + 1
    && geometry.scroll <= geometry.client + 1 && geometry.document <= width + 1, 'CM_RECOVERY_APP_READABLE');
  const controls = [];
  for (const control of [page.getByRole('combobox', { name: 'Player for recovery', exact: true }),
    page.getByRole('button', { name: 'Queue recovery week', exact: true }),
    page.getByRole('button', { name: 'Cancel recovery week', exact: true })]) {
    const r = await control.boundingBox(); assert.ok(r && r.width >= 44 && r.height >= 44, 'CM_RECOVERY_APP_NATIVE_TARGET');
    controls.push(r);
  }
  await photo('recovery-week', 'div.bg-card:has(select[aria-label="Player for recovery"])');

  await home(); await tap(page.getByRole('button', { name: 'Open the Window', exact: true }));
  await page.waitForFunction(({ key, week }) => JSON.parse(localStorage.getItem(key)).week === week + 1,
    { key, week: x.week });
  const paid = await read();
  assert.equal(paid.week, x.week + 1); assert.deepEqual(paid.training, x.basePlan);
  assert.deepEqual(paid.xiIds, initial.xiIds, 'CM_RECOVERY_APP_DOES_NOT_RESELECT_XI');
  const expectedPlayers = initial.squad.map(p => ({ ...p,
    fitness: p.id === x.target.id ? x.paidFitness.target : x.paidFitness.peers,
    injuryWeeks: x.paidInjuryWeeks, trainingExposure: history(x.clubName, x.season, p.id === x.target.id) }));
  assert.deepEqual(paid.squad, expectedPlayers, 'CM_RECOVERY_APP_ONLY_TARGET_GETS_LIGHT_WITH_EXISTING_INJURY_COUNTDOWN');
  const paidBytes = await save(key);
  await page.reload({ waitUntil: 'domcontentloaded' }); await resume(); await training();
  assert.equal(await save(key), paidBytes, 'CM_RECOVERY_APP_PAID_RELOAD_BYTES');
  assert.equal(await page.getByRole('button', { name: 'Cancel recovery week', exact: true }).count(), 0);
  assert.equal(await page.getByText(/Light next paid week/i).count(), 0);
  return { status: 'pass', width, target: x.target, basePlan: x.basePlan, geometry, controls,
    queueCancelFullFramesHeld: true, pendingReloadBytesHeld: true, paidReloadBytesHeld: true,
    paidWeek: paid.week, xiHeld: true, paidPlayers: paid.squad.map(p => ({ id: p.id, fitness: p.fitness,
      injuryWeeks: p.injuryWeeks, trainingExposure: p.trainingExposure })),
    nonPaidBoundary: x.nonPaidBoundary, rngOrClockOverrides: false,
    scope: 'Native queue/cancel/requeue/reload and one real paid January window. Same existing Light policy applies to one injured player, peers keep Double/youth, no extra healing or lineup change. Synthetic skipped-night boundary is producer-only; second paid-week return and default tapes are unit scope.' };
}
