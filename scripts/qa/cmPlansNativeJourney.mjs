import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const copy = value => JSON.parse(JSON.stringify(value));
const sha = value => createHash('sha256').update(value).digest('hex');
const NAME = 'Recovery shape';
const SLOT = 0;

// The caller owns isolated contexts, the manager's real recovery fixture, transport and completed-build holds.
export async function runMatchPlans({ page, width, base, fixture, engine, plans, photo, tap, goto, save }) {
  assert([320, 390, 1280].includes(width));
  for (const name of ['saveMatchPlan', 'applyMatchPlan', 'previewMatchPlan']) assert.equal(typeof plans[name], 'function', name);
  const key = fixture.expected.key;
  assert.equal(key, engine.SAVE_KEY);
  const read = async () => JSON.parse(await save(key));
  const resume = async () => {
    const resumeButton = page.getByRole('button', { name: 'Resume Career', exact: true });
    await resumeButton.waitFor({ state: 'visible' }); await tap(resumeButton);
    await page.locator('[data-cm-hub]').waitFor({ state: 'visible' });
  };
  const openPlans = async () => {
    await tap(page.getByRole('tab', { name: 'Tactics', exact: true }));
    await tap(page.locator('[data-cm-tile-btn="plans"]'));
    await page.locator('[data-cm-match-plans]').waitFor({ state: 'visible' });
  };
  const panel = page.locator('[data-cm-match-plans]');
  async function previewEvidence(state) {
    const before = copy(state), expected = plans.previewMatchPlan(state, SLOT);
    assert(expected && expected.rows.length === engine.FORMATIONS[state.formationIndex].slots.length);
    assert.deepEqual(state, before, 'Preview oracle does not change the saved input');
    await page.locator('[data-cm-plan-preview="0"]').waitFor({ state: 'visible' });
    assert.equal((await panel.locator('[data-cm-plan-title]').textContent()).trim(), NAME);
    assert.equal((await panel.locator('[data-cm-plan-geometry]').textContent()).trim(), expected.plan.customShape ? 'Custom positions' : 'Preset positions');
    assert.equal((await panel.locator('[data-cm-plan-strength]').textContent()).trim(),
      expected.currentStrength.toFixed(1) + ' now / ' + expected.strength.toFixed(1) + ' with plan');
    assert.equal((await panel.locator('[data-cm-plan-fitness]').textContent()).trim(),
      expected.fitness === null ? 'No available players' : Math.round(expected.fitness) + '% average');
    const details = panel.locator('[data-cm-plan-details]');
    if (await details.getAttribute('aria-expanded') !== 'true') await tap(details);
    await panel.locator('[data-cm-plan-lineup]').waitFor({ state: 'visible' });
    assert.equal(await panel.locator('[data-cm-plan-row]').count(), expected.rows.length);
    const rows = [];
    for (const row of expected.rows) {
      const actual = panel.locator('[data-cm-plan-row="' + row.slot + '"]');
      assert.equal(await actual.count(), 1);
      assert.equal(await actual.getAttribute('data-cm-plan-player'), row.player?.id ?? '');
      const text = (await actual.textContent()).replace(/\s+/g, ' ').trim();
      assert(text.includes(row.label + ': ' + (row.player?.name ?? 'No available player')));
      if (row.reason) assert(text.includes(row.reason + (row.picked ? ': ' + row.picked.name : '')));
      rows.push({ slot: row.slot, label: row.label, picked: row.pickedId, player: row.player?.id ?? null, reason: row.reason, text });
    }
    const assignments = engine.SET_PIECE_KEYS.map(id => state.squad.find(player => player.id === expected.state.setPieces?.[id])?.name ?? 'Auto pick');
    assert.deepEqual(await panel.locator('[data-cm-plan-assignments] dd').allTextContents(), assignments);
    const shootout = expected.state.shootoutOrder?.map(id => state.squad.find(player => player.id === id)?.name).join(', ') || 'Auto';
    assert.equal((await panel.locator('[data-cm-plan-shootout]').textContent()).trim(), 'Shootout order: ' + shootout);
    return { rows, assignments, shootout, currentStrength: expected.currentStrength, planStrength: expected.strength, fitness: expected.fitness };
  }

  await goto(base + '/club-manager'); await resume();
  const initialBytes = await save(key), initial = await read();
  assert.deepEqual(initial, JSON.parse(fixture.raw), 'The same canonical recovery save opens unchanged');
  assert.equal(initial.clubName, fixture.expected.clubName);
  assert.equal(initial.week, fixture.expected.week); assert.equal(initial.season, fixture.expected.season);
  assert.equal(initial.formationIndex, 0); assert.equal(initial.mentality, 'balanced');
  assert(Number.isFinite(initial.budget)); assert(initial.squad.length >= 11 && !initial.live);
  const expectedSaved = plans.saveMatchPlan(initial, SLOT, NAME);
  assert.notEqual(expectedSaved, initial, 'The real save operation is eligible');
  assert.deepEqual(initial, JSON.parse(initialBytes), 'Save oracle does not mutate the input');

  await openPlans();
  await tap(panel.locator('[data-cm-plan-slot="0"]'));
  await panel.getByRole('textbox', { name: 'Plan name', exact: true }).fill(NAME);
  await tap(panel.locator('[data-cm-plan-save]'));
  await page.waitForFunction(({ key, name }) => JSON.parse(localStorage.getItem(key)).matchPlans?.some(plan => plan.slot === 0 && plan.name === name), { key, name: NAME });
  const saved = await read(), savedBytes = await save(key);
  assert.deepEqual(saved, expectedSaved, 'CM_PLANS_NATIVE_SAVE_EXACT');
  const savedPlan = saved.matchPlans.find(plan => plan.slot === SLOT);
  assert.equal(savedPlan.version, 2); assert.deepEqual(savedPlan.xiIds, initial.xiIds);
  assert.equal(savedPlan.mentality, 'balanced'); assert.equal(savedPlan.formationIndex, 0);
  assert.deepEqual(saved.squad, initial.squad); assert.equal(saved.budget, initial.budget);
  const savedPreview = await previewEvidence(saved);
  assert.equal(await save(key), savedBytes, 'Reading the newly late preview is read-only');

  await tap(panel.getByRole('button', { name: 'Back', exact: true }));
  await tap(page.locator('[data-cm-mentality-btn="attacking"]'));
  await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).mentality === 'attacking', key);
  const changed = await read(), expectedChanged = { ...expectedSaved, mentality: 'attacking' };
  assert.deepEqual(changed, expectedChanged, 'Only the native mentality choice changes before applying');
  await tap(page.locator('[data-cm-tile-btn="plans"]'));
  await panel.waitFor({ state: 'visible' });
  const changedBytes = await save(key), changedPreview = await previewEvidence(changed);
  assert.equal(await save(key), changedBytes, 'Previewing the saved balanced setup never applies it');
  const expectedApplied = plans.applyMatchPlan(changed, SLOT);
  assert.notEqual(expectedApplied, changed, 'Apply uses an actual saved plan');
  assert.equal(expectedApplied.mentality, 'balanced');
  assert.deepEqual(changed, expectedChanged, 'Apply oracle does not mutate the input');
  await tap(panel.locator('[data-cm-plan-apply]'));
  await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).mentality === 'balanced', key);
  const applied = await read(), appliedBytes = await save(key);
  assert.deepEqual(applied, expectedApplied, 'CM_PLANS_NATIVE_APPLY_EXACT');
  assert.deepEqual(applied.squad, initial.squad, 'Applying never heals or resets players');
  assert.equal(applied.budget, initial.budget, 'Applying never resets the budget');
  assert.equal(applied.week, initial.week); assert.equal(applied.season, initial.season);
  assert.deepEqual(applied.calendar, initial.calendar); assert.deepEqual(applied.matchPlans, saved.matchPlans);
  const appliedPreview = await previewEvidence(applied);
  assert.equal(await save(key), appliedBytes, 'Applied preview is read-only');

  await page.reload({ waitUntil: 'domcontentloaded' }); await resume();
  assert.equal(await save(key), appliedBytes, 'CM_PLANS_NATIVE_RELOAD_BYTES');
  await openPlans();
  assert.equal((await panel.getByRole('textbox', { name: 'Plan name', exact: true }).inputValue()), NAME);
  const restoredPreview = await previewEvidence(await read());
  assert.deepEqual(restoredPreview, appliedPreview, 'Reloaded preview rows and assignments match the applied saved setup');
  assert.equal(await save(key), appliedBytes, 'Reopened preview keeps the full career bytes');
  await photo('match-plan-preview', '[data-cm-plan-preview="0"]');
  return {
    clubName: initial.clubName, week: initial.week, season: initial.season, slot: SLOT, planName: NAME,
    savedPlan, savedPreview, changedPreview, appliedPreview, restoredPreview, squadHeld: true, budgetHeld: initial.budget,
    saveExact: true, applyExact: true, reloadBytesHeld: true,
    hashes: { initial: sha(initialBytes), saved: sha(savedBytes), changed: sha(changedBytes), appliedAndReloaded: sha(appliedBytes) },
    scope: 'Native saved-plan editor/preview/save/apply/reload on the separate canonical recovery-fixture context. Injury availability is shown as saved, with no healing or natural-season claim.',
  };
}
