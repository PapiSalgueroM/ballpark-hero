import assert from 'node:assert/strict';

const POSITIONS = ['GK', 'RB', 'CB', 'CB', 'LB', 'CM', 'CM', 'CM', 'RW', 'ST', 'LW'];
const ORDINARY = ['p0', 'starter-rb', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10'];
const ROTATED = ['p0', 'fresh-rb', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10'];
const copy = value => JSON.parse(JSON.stringify(value));

// The shared producer supplies its real storage host, bundled engine and existing save fence.
export function createCmTrainingFixture({ engine: cm, fence }) {
  let c = cm.startCareer('Rotation Borough', cm.DEFAULT_ERA_ID, {
    name: 'Rotation Borough', stadium: 'Rotation Park', quality: 70, budgetTier: 'mid',
    leagueId: cm.leagueOf('Auckland FC').id, replacedClub: 'Auckland FC',
    crest: { shape: 0, pattern: 0, color1: '#123456', color2: '#ffffff', initials: 'RB' },
  });
  const traversed = [];
  for (let guard = 0; guard < 12; guard++) {
    const entry = c.calendar[c.week];
    if (entry && !entry.night && cm.entryInvolvesMe(c, entry) && cm.fixtureFor(c, entry)) break;
    const before = c.week, result = cm.playNextEntry(c, { skipHalftime: true, noCoach: true, untilWeek: before + 1 });
    c = result.state; traversed.push({ before, after: c.week, kind: result.kind });
    assert.equal(c.week, before + 1); assert.ok(!c.live && !c.sacked);
  }
  const entry = c.calendar[c.week];
  assert.ok(entry && !entry.night && cm.entryInvolvesMe(c, entry) && cm.fixtureFor(c, entry));
  assert.deepEqual(cm.FORMATIONS[0].slots.map(s => s.label), POSITIONS);
  const template = c.squad[0];
  const player = (id, position, rating = 70, fitness = 100) => {
    const p = { ...template, id, name: 'Rotation Player ' + id, position, rating, fitness, morale: 68,
      age: 25, potential: rating, injuryWeeks: 0, suspendedMatches: 0, contractYears: 5,
      apps: 0, seasonGoals: 0, seasonAssists: 0, seasonYellows: 0, seasonReds: 0,
      cleanSheets: 0, ratingSum: 0, transferStatus: 'blocked', lastTen: [], isYouth: false };
    for (const key of ['secondaryPositions', 'retraining', 'worldRosterKey', 'worldRosterSince', 'trainingExposure']) delete p[key];
    return p;
  };
  c.squad = POSITIONS.map((position, i) => player('p' + i, position));
  c.squad[1] = player('starter-rb', 'RB', 90, 60);
  c.squad.push(player('fresh-rb', 'RB', 88, 85));
  c.formationIndex = 0; c.xiIds = [...ORDINARY]; c.xiDuties = Array(11).fill(null);
  c.form = []; c.budget = 1000; c.training = { intensity: 'normal', focus: 'balanced' };
  delete c.instructions;
  c.customShape = { v: 1, formationIndex: 0,
    points: cm.FORMATIONS[0].slots.map(s => ({ x: s.x, y: Math.max(6, s.y - 3) })) };
  assert.deepEqual(cm.autoPickXI(c.squad, cm.FORMATIONS[0]), ORDINARY);
  localStorage.clear(); fence.adopt(cm.SAVE_KEY);
  assert.equal(cm.saveCareer(c), true);
  const loaded = cm.loadCareer(); assert.ok(loaded);
  assert.deepEqual(loaded.xiIds, ORDINARY);
  assert.deepEqual(loaded.squad.map(p => [p.id, p.rating, p.fitness]), c.squad.map(p => [p.id, p.rating, p.fitness]));
  assert.equal(cm.saveCareer(loaded), true);
  return { raw: localStorage.getItem(cm.SAVE_KEY), expected: { key: cm.SAVE_KEY, clubName: loaded.clubName,
    season: loaded.season, week: loaded.week, ordinary: ORDINARY, rotated: ROTATED, traversed,
    fixtureScope: 'Explicit fictional rotation fixture on a real constructor, calendar and save writer. No natural progression or browser RNG/clock override.' } };
}

// The shared caller owns isolation, native tap/click helpers, consent, photos and all source/asset/network closure.
export async function runCmTraining({ page, width, base, fixture, engine: cm, photo, tap, goto, save }) {
  const expected = fixture.expected, key = expected.key;
  const read = async () => JSON.parse(await save(key));
  const member = (c, id) => { const p = c.squad.find(p => p.id === id); assert.ok(p); return p; };
  const resume = async () => {
    const button = page.getByRole('button', { name: 'Resume Career', exact: true });
    await button.waitFor({ state: 'visible' }); await tap(button);
    await page.locator('[data-cm-hub]').waitFor({ state: 'visible' });
  };
  const tactics = async () => {
    await tap(page.getByRole('tab', { name: 'Tactics', exact: true }));
    await page.getByRole('button', { name: 'Auto Pick', exact: true }).waitFor({ state: 'visible' });
  };
  const waitXI = async ids => {
    await page.waitForFunction(({ key, ids }) => {
      const raw = localStorage.getItem(key), nodes = [...document.querySelectorAll('[data-cm-slot]')];
      return raw && JSON.stringify(JSON.parse(raw).xiIds) === JSON.stringify(ids)
        && nodes.length === 11 && JSON.stringify(nodes.map(n => n.getAttribute('data-cm-pid'))) === JSON.stringify(ids);
    }, { key, ids });
    assert.deepEqual((await read()).xiIds, ids, 'CM_FRESH_APP_SAVED_XI');
    assert.deepEqual(await page.locator('[data-cm-slot]').evaluateAll(ns => ns.map(n => n.getAttribute('data-cm-pid'))), ids,
      'CM_FRESH_APP_ACTUAL_ELEVEN');
  };
  await goto(base + '/club-manager'); await resume(); await tactics();
  const before = await read();
  assert.equal(before.clubName, expected.clubName); assert.equal(before.week, expected.week);
  assert.equal(before.season, expected.season);
  await tap(page.getByRole('button', { name: 'Auto Pick', exact: true })); await waitXI(expected.ordinary);
  assert.deepEqual(await read(), before, 'CM_FRESH_APP_ORDINARY_REMAINS_UNCHANGED');
  const fresh = page.getByRole('button', { name: 'Fresh XI', exact: true });
  await fresh.waitFor({ state: 'visible' }); await tap(fresh); await waitXI(expected.rotated);
  const rotated = await read();
  assert.deepEqual({ ...rotated, xiIds: before.xiIds }, before, 'CM_FRESH_APP_ONLY_ASSIGNMENTS_CHANGE');
  assert.equal(member(rotated, 'starter-rb').rating, 90); assert.equal(member(rotated, 'starter-rb').fitness, 60);
  assert.equal(member(rotated, 'fresh-rb').rating, 88); assert.equal(member(rotated, 'fresh-rb').fitness, 85);
  const strength = { ordinary: cm.matchStrengthNow(before), fresh: cm.matchStrengthNow(rotated) };
  assert.ok(Math.abs((strength.fresh - strength.ordinary) - 1.5 / 11) < 1e-10, 'CM_FRESH_APP_REAL_STRENGTH_TRADEOFF');
  assert.match(await page.getByText(/Fresh XI prefers 80\+/).innerText(), /Tired players fill gaps/);
  const geometry = await fresh.evaluate(node => {
    const r = node.getBoundingClientRect(), auto = [...document.querySelectorAll('button')].find(n => n.textContent.trim() === 'Auto Pick');
    const a = auto.getBoundingClientRect(), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return { fresh: { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right },
      ordinary: { x: a.x, y: a.y, width: a.width, height: a.height, right: a.right },
      viewport: innerWidth, document: document.documentElement.scrollWidth, hitOwn: !!hit && node.contains(hit),
      client: node.clientWidth, scroll: node.scrollWidth };
  });
  assert.ok(geometry.fresh.width >= 43.5 && geometry.fresh.height >= 43.5 && geometry.hitOwn, 'CM_FRESH_APP_NATIVE_CONTROL');
  assert.ok(geometry.fresh.x >= -1 && geometry.fresh.right <= width + 1 && geometry.ordinary.right <= width + 1
    && geometry.document <= width + 1 && geometry.scroll <= geometry.client + 1, 'CM_FRESH_APP_CONTROL_READABLE');
  await photo('fresh-xi', '[data-cm-pitch]');
  const saved = await save(key);
  await page.reload({ waitUntil: 'domcontentloaded' }); await resume(); await tactics(); await waitXI(expected.rotated);
  assert.equal(await save(key), saved, 'CM_FRESH_APP_RELOAD_BYTES');
  assert.deepEqual(await read(), rotated, 'CM_FRESH_APP_RELOAD_FRAME');
  await tap(page.getByRole('button', { name: 'Auto Pick', exact: true })); await waitXI(expected.ordinary);
  assert.deepEqual(await read(), before, 'CM_FRESH_APP_MANAGER_CAN_RETURN_TO_RATING_PICK');
  await tap(page.getByRole('button', { name: 'Fresh XI', exact: true })); await waitXI(expected.rotated);
  await tap(page.getByRole('tab', { name: 'Home', exact: true }));
  await tap(page.locator('[data-cm-way="quick"]'));
  await page.waitForFunction(({ key, week }) => JSON.parse(localStorage.getItem(key)).week === week + 1, { key, week: before.week });
  await page.getByRole('heading', { name: 'FULL TIME', exact: true }).waitFor({ state: 'visible' });
  const advanced = await read(), starter = member(advanced, 'starter-rb'), reserve = member(advanced, 'fresh-rb');
  assert.equal(advanced.season, before.season);
  assert.deepEqual(advanced.squad.map(p => p.id), before.squad.map(p => p.id));
  assert.deepEqual(reserve.lastTen, [1], 'CM_FRESH_APP_RESERVE_ACTUALLY_STARTED');
  assert.equal(starter.lastTen.length, 1); assert.ok(starter.lastTen[0] >= 0 && starter.lastTen[0] < 1, 'CM_FRESH_APP_TIRED_MAN_DID_NOT_START');
  assert.ok(reserve.fitness >= 72 && reserve.fitness <= 80, 'CM_FRESH_APP_RESERVE_PAID_MATCH_COST');
  if (starter.lastTen[0] === 0) assert.equal(starter.fitness, 92, 'CM_FRESH_APP_RESTED_PLAYER_RECOVERED');
  else assert.ok(starter.fitness >= 64 && starter.fitness <= 72, 'CM_FRESH_APP_LEGAL_SUBSTITUTE_PAID_MATCH_COST');
  return { status: 'pass', width, expected, ordinaryIds: before.xiIds, freshIds: rotated.xiIds, strength, geometry,
    onlyXIChanged: true, reloadBytesHeld: true, rngOrClockOverrides: false,
    chargedMatch: { week: advanced.week, starter: { fitness: starter.fitness, lastTen: starter.lastTen },
      reserve: { fitness: reserve.fitness, lastTen: reserve.lastTen },
      scope: 'Real Quick Sim uses the selected starters. Its original coach can later make legal injury substitutions.' } };
}
