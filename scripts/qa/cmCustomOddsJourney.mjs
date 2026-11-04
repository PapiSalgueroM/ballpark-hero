import assert from 'node:assert/strict';

const copy = value => JSON.parse(JSON.stringify(value));
const INSTRUCTIONS = { press: -1, tempo: 1, width: 1, line: -1 };
const PLAN_NAME = 'Forward shape';
function stationaryOdds(mine, theirs) {
  const probabilities = lambda => {
    const p = [Math.exp(-lambda)];
    for (let n = 1; n <= 9; n++) p.push(p[n - 1] * lambda / n);
    return p;
  };
  const a = probabilities(mine), b = probabilities(theirs), sums = [0, 0, 0];
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) sums[i > j ? 0 : i === j ? 1 : 2] += a[i] * b[j];
  const total = sums.reduce((sum, n) => sum + n, 0), win = Math.round(100 * sums[0] / total);
  let draw = Math.round(100 * sums[1] / total), loss = 100 - win - draw;
  if (loss < 0) { draw += loss; loss = 0; }
  return { win, draw, loss };
}

// The caller bundles the unchanged clubManagerTactics side-effect import beside its cm namespace.
export function createCmTrainingFixture({ engine: cm, fence }) {
  let c = cm.startCareer('Shape Forecast Borough', cm.DEFAULT_ERA_ID, {
    name: 'Shape Forecast Borough', stadium: 'Forecast Park', quality: 70, budgetTier: 'mid',
    leagueId: cm.leagueOf('Auckland FC').id, replacedClub: 'Auckland FC',
    crest: { shape: 0, pattern: 0, color1: '#123456', color2: '#ffffff', initials: 'SF' },
  });
  const entry = c.calendar[c.week];
  assert.ok(entry && !entry.night && cm.entryInvolvesMe(c, entry) && cm.fixtureFor(c, entry), 'Actual current ordinary fixture');
  c.formationIndex = 0; c.mentality = 'balanced'; c.teamTalk = null;
  delete c.press;
  c.squad = c.squad.map(p => ({ ...p, fitness: 100, morale: 68, injuryWeeks: 0, suspendedMatches: 0 }));
  c.xiIds = cm.autoPickXI(c.squad, cm.FORMATIONS[0]);
  assert.ok(c.xiIds.every(Boolean));
  c = cm.setDuty(c, 1, 'attackingFullBack'); assert.ok(c);
  c = cm.setDuty(c, 5, 'playmaker'); assert.ok(c);
  c.setPieces = Object.fromEntries(cm.SET_PIECE_KEYS.map(key => [key, null]));
  c.shootoutOrder = [];
  c.instructions = { ...INSTRUCTIONS };
  c.customShape = { v: 1, formationIndex: 0, points: cm.FORMATIONS[0].slots.map((s, i) => ({
    x: i === 0 ? 90 : s.x, y: i === 0 ? 30 : Math.max(6, s.y - 26),
  })) };
  delete c.matchPlans;
  localStorage.clear(); fence.adopt(cm.SAVE_KEY);
  assert.equal(cm.saveCareer(c), true);
  const loaded = cm.loadCareer(); assert.ok(loaded); assert.equal(cm.saveCareer(loaded), true);
  const raw = localStorage.getItem(cm.SAVE_KEY);
  const players = state => state.squad.map(p => [p.id, p.rating, p.fitness, p.morale]);
  const rates = input => {
    const before = JSON.stringify(input), kicked = cm.playNextEntry(input, { noCoach: true });
    assert.equal(kicked.kind, 'halftime'); assert.ok(kicked.state.live);
    assert.equal(kicked.state.week, input.week); assert.deepEqual(players(kicked.state), players(input));
    assert.equal(JSON.stringify(input), before);
    const { lamMine: mine, lamOpp: theirs } = kicked.state.live;
    return { mine, theirs, odds: stationaryOdds(2 * mine, 2 * theirs) };
  };
  const preset = copy(loaded); delete preset.customShape;
  const custom = rates(loaded), ordinary = rates(preset);
  const noInstructions = copy(loaded); delete noInstructions.instructions;
  const withoutInstructions = rates(noInstructions);
  assert.notDeepEqual([custom.mine, custom.theirs], [withoutInstructions.mine, withoutInstructions.theirs],
    'Producer must include the real existing tactics module for the half-stable philosophy');
  assert.notDeepEqual(custom.odds, ordinary.odds, 'Fixture has a visible, independently observed geometry consequence');
  assert.equal(localStorage.getItem(cm.SAVE_KEY), raw, 'Actual kickoff sampling never writes a career');
  return { raw, expected: { key: cm.SAVE_KEY, clubName: loaded.clubName, week: loaded.week, season: loaded.season,
    shape: loaded.customShape, instructions: INSTRUCTIONS, duties: loaded.xiDuties, xiIds: loaded.xiIds,
    custom, preset: ordinary, planName: PLAN_NAME,
    scope: 'Fictional current-fixture setup; expected stationary ninety-minute Poisson estimates come from actual kickoff lambda times2 in a neutral, half-stable context. No natural progression or full-match calibration claim.' } };
}

// Context isolation, consent, exact assets/console/traffic and source closure belong to the shared caller.
export async function runCmTraining({ page, width, base, fixture, photo, tap, goto, save }) {
  const x = fixture.expected, key = x.key;
  const read = async () => JSON.parse(await save(key));
  const resume = async () => {
    const button = page.getByRole('button', { name: 'Resume Career', exact: true });
    await button.waitFor({ state: 'visible' }); await tap(button);
    await page.locator('[data-cm-hub]').waitFor({ state: 'visible' });
  };
  const tactics = async () => {
    await tap(page.getByRole('tab', { name: 'Tactics', exact: true }));
    await page.locator('[data-cm-tile-btn="plans"]').waitFor({ state: 'visible' });
  };
  const centre = async wanted => {
    await tap(page.getByRole('tab', { name: 'Home', exact: true }));
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => {
      const r = button.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && (button.textContent.trim() === 'Club home'
        || button.textContent.includes('Match Centre: form, head to head, odds, team talk'));
    }));
    const back = page.getByRole('button', { name: 'Club home', exact: true });
    if (await back.isVisible()) await tap(back);
    await tap(page.getByRole('button', { name: /Match Centre: form, head to head, odds, team talk/ }));
    const labels = ['Win ' + wanted.win + '%', 'Draw ' + wanted.draw + '%', 'They win ' + wanted.loss + '%'];
    for (const label of labels) await page.getByText(label, { exact: true }).waitFor({ state: 'visible' });
    return labels;
  };
  const plans = async () => {
    await tactics(); await tap(page.locator('[data-cm-tile-btn="plans"]'));
    await page.locator('[data-cm-match-plans]').waitFor({ state: 'visible' });
  };
  await goto(base + '/club-manager'); await resume();
  const initial = await read(), initialBytes = await save(key);
  assert.equal(initial.clubName, x.clubName); assert.equal(initial.week, x.week); assert.equal(initial.season, x.season);
  assert.deepEqual(initial.customShape, x.shape); assert.deepEqual(initial.instructions, x.instructions);
  const firstOdds = await centre(x.custom.odds);
  assert.equal(await save(key), initialBytes, 'CM_CUSTOM_ODDS_APP_READING_IS_READONLY');
  await plans();
  await page.getByRole('textbox', { name: 'Plan name', exact: true }).fill(x.planName);
  await tap(page.locator('[data-cm-plan-save]'));
  await page.waitForFunction(({ key, name }) => JSON.parse(localStorage.getItem(key)).matchPlans?.some(p => p.slot === 0 && p.name === name),
    { key, name: x.planName });
  const saved = await read(), plan = saved.matchPlans.find(p => p.slot === 0);
  assert.equal(plan.version, 2); assert.deepEqual(plan.customShape, x.shape);
  assert.deepEqual(plan.instructions, x.instructions); assert.deepEqual(plan.xiDuties, x.duties); assert.deepEqual(plan.xiIds, x.xiIds);
  const outside = { ...saved };
  if (initial.matchPlans === undefined) delete outside.matchPlans; else outside.matchPlans = initial.matchPlans;
  assert.deepEqual(outside, initial, 'CM_CUSTOM_ODDS_APP_SAVE_ONLY_ADDS_THE_PLAN');
  await tap(page.locator('[data-cm-match-plans]').getByRole('button', { name: 'Back', exact: true }));
  await tap(page.getByRole('button', { name: 'Move players', exact: true }));
  await tap(page.getByRole('button', { name: 'Reset to preset', exact: true }));
  await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).customShape === undefined, key);
  const reset = await read();
  const expectedReset = copy(saved); delete expectedReset.customShape;
  assert.deepEqual(reset, expectedReset, 'CM_CUSTOM_ODDS_APP_RESET_ONLY_CLEARS_CURRENT_GEOMETRY');
  const presetBytes = await save(key), presetOdds = await centre(x.preset.odds);
  assert.equal(await save(key), presetBytes);
  await plans(); await tap(page.locator('[data-cm-plan-apply]'));
  await page.waitForFunction(({ key, shape }) => JSON.stringify(JSON.parse(localStorage.getItem(key)).customShape) === JSON.stringify(shape),
    { key, shape: x.shape });
  const applied = await read();
  assert.deepEqual(applied, saved, 'CM_CUSTOM_ODDS_APP_APPLY_RESTORES_THE_WHOLE_SAVED_SETUP');
  const appliedBytes = await save(key);
  await page.reload({ waitUntil: 'domcontentloaded' }); await resume();
  assert.equal(await save(key), appliedBytes, 'CM_CUSTOM_ODDS_APP_RELOAD_BYTES');
  const restoredOdds = await centre(x.custom.odds);
  assert.deepEqual(restoredOdds, firstOdds); assert.deepEqual(await read(), applied);
  const win = page.getByText(firstOdds[0], { exact: true }); await win.scrollIntoViewIfNeeded();
  const geometry = await win.evaluate(node => {
    const r = node.getBoundingClientRect();
    return { x: r.x, right: r.right, width: r.width, height: r.height, viewport: innerWidth,
      client: node.clientWidth, scroll: node.scrollWidth, document: document.documentElement.scrollWidth };
  });
  assert.ok(geometry.width > 0 && geometry.height > 0 && geometry.x >= -1 && geometry.right <= width + 1
    && geometry.scroll <= geometry.client + 1 && geometry.document <= width + 1, 'CM_CUSTOM_ODDS_APP_READABLE');
  await photo('custom-shape-odds', '.max-w-md.mx-auto.space-y-3:has([data-cm-way="live"])');
  await tap(page.locator('[data-cm-way="live"]'));
  await page.waitForFunction(key => !!JSON.parse(localStorage.getItem(key)).live?.startXi, key);
  const kicked = await read(), live = kicked.live;
  assert.equal(kicked.week, x.week); assert.equal(live.positionRules, 1);
  assert.deepEqual(live.customShape, x.shape); assert.deepEqual(live.startXi, x.xiIds);
  assert.ok(Math.abs(live.lamMine - x.custom.mine) < 1e-12 && Math.abs(live.lamOpp - x.custom.theirs) < 1e-12,
    'CM_CUSTOM_ODDS_APP_ACTUAL_KICKOFF_RATES');
  assert.deepEqual(stationaryOdds(2 * live.lamMine, 2 * live.lamOpp), x.custom.odds,
    'CM_CUSTOM_ODDS_APP_DISPLAY_MATCHES_STATIONARY_KICKOFF_ESTIMATE');
  return { status: 'pass', width, expected: x, firstOdds, presetOdds, restoredOdds, geometry,
    plan: { name: plan.name, version: plan.version, shape: plan.customShape, instructions: plan.instructions,
      duties: plan.xiDuties, xiIds: plan.xiIds },
    initialReadOnly: true, reloadBytesHeld: true, actualKickoff: { mine: live.lamMine, theirs: live.lamOpp, xiIds: live.startXi },
    rngOrClockOverrides: false,
    scope: 'Native custom-plan save/reset/apply/reload and visible stationary pre-match estimate, then the actual same-fixture kickoff. Original live animation, draws and later management remain untouched.' };
}
