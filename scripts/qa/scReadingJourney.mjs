import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { waitForScrollIdle } from './nativeScrollReady.mjs';

export const READING_SOURCE_PINS = {
  'src/components/soccer-career/TrainingPanel.tsx': 'c98cb31af7d9d4298b78ffe908b26d3bbec89906',
  'src/components/soccer-career/PassingDecisionBoard.tsx': 'ac438cb04641766b5a09be676afca5829daa2b1f',
  'src/lib/soccerCareerEngine.ts': 'e88d6f91744bf14ac1d1afd43bbb26be9f9e15db',
  'src/lib/soccerCareerSave.ts': '86ec011693fd5bc702b5e8ccec05d27775a72a76',
  'src/pages/SoccerCareer.tsx': '1f4d448cc9718bc3fa97b6987be5f14b27496c47',
};
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const skills = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical', 'reflexes', 'overall'];
const situations = [
  { title: 'Find the open side', options: ['Force the centre pass', 'Pass left', 'Carry straight at the defender'], correct: 1,
    reason: 'Left is open. The central lane runs through the defender.' },
  { title: 'Use the return lane', options: ['Pass into the new space', 'Pass back to the old spot', 'Dribble toward the marker'], correct: 0,
    reason: 'Return the ball into the open space, not the spot the defender has covered.' },
  { title: 'Support under pressure', options: ['Turn into the defender', 'Hold the ball for the press', 'Set it back to Support'], correct: 2,
    reason: 'The open support pass keeps the ball away from the defender at your back.' },
  { title: 'Offer a useful angle', options: ['Stay behind the defender', 'Move into the open diagonal', 'Run closer along the blocked lane'], correct: 1,
    reason: 'A new angle gives Wide a passing lane; moving along the blocked line does not.' },
  { title: 'Choose the keeper outlet', options: ['Play into the marked centre', 'Wait for the press to arrive', 'Roll to Wide'], correct: 2,
    reason: 'The wide outlet has a clear lane and time to receive.' },
];

export function createReadingFixtures({ engine, codec }) {
  const fixtures = {};
  for (const [name, position, skill, answers, score, boost, label] of [
    ['cm', 'CM', 75, [1, 1, 2, 0, 2], 60, 1, 'Passing'],
    ['gk', 'GK', 98, [1, 0, 2, 1, 1], 80, 2, 'Distribution'],
  ]) {
    const stats = Object.fromEntries(skills.filter(key => key !== 'overall').map(key => [key, skill]));
    const created = engine.initCareer('Reading Fixture ' + position, 'England', position, '2020-24',
      stats, skill, 2024, engine.FALLBACK_CLUBS, null, 99);
    const initial = engine.repairCareer(codec.parseSoccerCareerSave(codec.serializeSoccerCareerSave(created)));
    assert(codec.isSoccerCareerSave(initial));
    const raw = codec.serializeSoccerCareerSave(initial);
    assert.equal(codec.serializeSoccerCareerSave(engine.repairCareer(codec.parseSoccerCareerSave(raw))), raw);
    const before = codec.parseSoccerCareerSave(raw), year = before.seasons.at(-1).year;
    assert.equal(year, 2024); assert.equal(before.phase, 'youth'); assert.equal(before.position, position);
    assert(engine.trainingAvailable(before)); assert.deepEqual(before.statBoostNextSeason, {});
    assert.deepEqual(skills.map(key => before[key]), skills.map(() => skill)); assert.equal(before.morale, 70);
    const paid = structuredClone(before);
    paid.trainingSeasonYear = year; paid.statBoostNextSeason = { passing: boost }; paid.morale = 72;
    paid.events = [...paid.events, '🏋️ Training session: ' + score + '/100. +' + boost + ' ' + label + " coming with next season's growth"];
    const paidRaw = codec.serializeSoccerCareerSave(paid);
    const actual = engine.applyTrainingResult(codec.parseSoccerCareerSave(raw), 'passing', score);
    assert.equal(codec.serializeSoccerCareerSave(actual), paidRaw, 'Independent literal reward equals the existing public model');
    assert.equal(codec.serializeSoccerCareerSave(before), raw, 'Reference reward does not mutate the input');
    assert.equal(engine.trainingAvailable(actual), false);
    assert.equal(engine.applyTrainingResult(actual, 'passing', 100), actual, 'Existing one-season cap refuses a second reward');
    fixtures[name] = { raw, expected: { key: 'soccerCareerSave', name, position, skill, year,
      answers, score, boost, label, situations, paidRaw, paid: codec.parseSoccerCareerSave(paidRaw),
      scope: 'Real constructor and repaired codec save for a declared fictional youth player. Existing passing reward model, no natural-career or immediate attribute-growth claim.' } };
  }
  return fixtures;
}

export async function runReadingSession({ page, width, base, fixture, engine, codec, photo, goto, save }) {
  const x = fixture.expected, key = x.key, actions = [];
  let held = fixture.raw, pointerProbes = 0, answerChecks = 0;
  const frames = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const xy = () => page.evaluate(() => ({ x: scrollX, y: scrollY }));
  const main = () => save(key);
  const heldSave = async label => assert.equal(await main(), held, 'SC_READING_APP_FULL_SAVE_HELD:' + label);
  const prepare = async control => {
    await control.waitFor({ state: 'visible' }); assert.equal(await control.count(), 1);
    await waitForScrollIdle(page); await control.scrollIntoViewIfNeeded(); await control.click({ trial: true });
    if (width >= 768) for (let i = 0; !(await control.evaluate(node => document.activeElement === node)); i++) {
      assert(i < 160, 'SC_READING_APP_NATIVE_TAB_TARGET'); await page.keyboard.press('Tab');
    }
    await waitForScrollIdle(page);
  };
  const native = async (label, control, settled) => {
    await prepare(control); await frames(); const before = await xy();
    if (width < 768) await control.tap(); else await page.keyboard.press('Enter');
    if (settled) await settled(); await frames(); const after = await xy();
    actions.push({ label, before, after, savedSHA256: sha(await main()) });
    assert.deepEqual(after, before, 'SC_READING_APP_NO_JUMP:' + label);
  };
  const dialog = page.getByRole('dialog', { name: 'Training ground', exact: true });
  const board = dialog.locator('section[aria-label="Read the pass"]');
  const scoreIs = async value => assert.equal(Number(await board.getByLabel('Reading session score', { exact: true }).textContent()), value);
  const open = async () => {
    const opener = page.getByRole('button', { name: 'Open the training ground', exact: true });
    await opener.waitFor({ state: 'visible' });
    await native('open-training', opener, () => dialog.waitFor({ state: 'visible' }));
    await heldSave('open');
  };
  const intro = async () => {
    const tile = dialog.getByRole('button', { name: /Read the pass/ });
    await tile.waitFor({ state: 'visible' }); assert.match(await tile.textContent(), new RegExp('Trains ' + x.label));
    await native('open-reading', tile, () => board.getByRole('button', { name: 'Start reading session', exact: true }).waitFor({ state: 'visible' }));
    assert.match(await board.textContent(), /Worked example:/); assert.match(await board.textContent(), /no timer/i);
    assert.match(await board.textContent(), /Three correct reads score 60; four score 80/);
    await heldSave('instructions');
    await native('start-reading', board.getByRole('button', { name: 'Start reading session', exact: true }),
      () => board.getByRole('group', { name: 'Decision 1 of 5: ' + situations[0].title, exact: true }).waitFor({ state: 'visible' }));
    await scoreIs(0); await heldSave('start');
  };
  const complete = async (answers, photograph, probe) => {
    let points = 0;
    for (let i = 0; i < situations.length; i++) {
      const s = situations[i], groupName = 'Decision ' + (i + 1) + ' of 5: ' + s.title;
      const group = board.getByRole('group', { name: groupName, exact: true });
      await group.waitFor({ state: 'visible' });
      assert.deepEqual((await group.getByRole('button').allTextContents()).map(text => text.trim()), s.options);
      assert.deepEqual(await group.getByRole('button').evaluateAll(nodes => nodes.map(node => node.disabled)), [false, false, false]);
      points += answers[i] === s.correct ? 20 : 0;
      await native('answer-' + (i + 1), group.getByRole('button', { name: s.options[answers[i]], exact: true }),
        () => page.waitForFunction(label => {
          const group = [...document.querySelectorAll('[role="group"]')].find(node => node.getAttribute('aria-label') === label);
          return group && group.querySelectorAll('button').length === 3 && [...group.querySelectorAll('button')].every(node => node.disabled);
        }, groupName));
      await scoreIs(points); await heldSave('answer');
      const feedback = board.getByRole('status', { name: 'Reading feedback', exact: true });
      await feedback.waitFor({ state: 'visible' }); assert((await feedback.textContent()).includes(s.reason));
      const pressed = [false, false, false]; pressed[answers[i]] = true;
      assert.deepEqual(await group.getByRole('button').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-pressed') === 'true')), pressed);
      answerChecks++;
      if (probe) {
        const another = group.getByRole('button', { name: s.options[(answers[i] + 1) % 3], exact: true });
        assert(await another.isDisabled()); await another.scrollIntoViewIfNeeded(); await waitForScrollIdle(page);
        const box = await another.boundingBox(); assert(box && box.width >= 44 && box.height >= 44);
        assert(await another.evaluate(node => { const b = node.getBoundingClientRect(), hit = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2); return hit === node || node.contains(hit); }));
        const before = await xy();
        if (width < 768) await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
        else await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        await frames(); const after = await xy();
        actions.push({ label: 'disabled-second-answer-' + (i + 1), before, after, savedSHA256: sha(await main()) });
        assert.deepEqual(after, before, 'SC_READING_APP_NO_JUMP:disabled-second-answer');
        await scoreIs(points); await heldSave('locked-second-answer');
        assert.deepEqual(await group.getByRole('button').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-pressed') === 'true')), pressed);
        pointerProbes++;
      }
      const wrongPhoto = photograph && answers[i] !== s.correct && i === x.answers.findIndex((answer, at) => answer !== situations[at].correct);
      if (wrongPhoto) {
        const help = board.getByRole('button', { name: 'Reading session rules', exact: true });
        await native('reopen-rules', help, () => page.waitForFunction(() => document.querySelector('section[aria-label="Read the pass"] button[aria-label="Reading session rules"]')?.getAttribute('aria-expanded') === 'true'));
        assert.match(await board.textContent(), /Worked example:/); await scoreIs(points); await heldSave('rules-open');
        await native('close-rules', help, () => page.waitForFunction(() => document.querySelector('section[aria-label="Read the pass"] button[aria-label="Reading session rules"]')?.getAttribute('aria-expanded') === 'false'));
        await scoreIs(points); assert((await feedback.textContent()).includes(s.reason)); await heldSave('rules-close');
        await photo('reading-' + x.name + '-locked', 'section[aria-label="Read the pass"]');
      }
      const next = board.getByRole('button', { name: i === 4 ? 'See session score' : 'Next decision', exact: true });
      await native('advance-' + (i + 1), next, () => i === 4
        ? dialog.locator('[data-training-score]').waitFor({ state: 'visible' })
        : board.getByRole('group', { name: 'Decision ' + (i + 2) + ' of 5: ' + situations[i + 1].title, exact: true }).waitFor({ state: 'visible' }));
      await heldSave('advance');
    }
    assert.equal(Number(await dialog.locator('[data-training-score]').textContent()), points);
    return points;
  };
  const close = async () => {
    await native('close-training', dialog.getByRole('button', { name: 'Close', exact: true }), () => dialog.waitFor({ state: 'hidden' }));
    const opener = page.getByRole('button', { name: 'Open the training ground', exact: true });
    assert.equal(await opener.evaluate(node => document.activeElement === node), true, 'SC_READING_APP_RETURN_FOCUS');
    await heldSave('close');
  };
  try {
    await goto(base + '/soccer-career');
    await page.getByRole('button', { name: 'Open the training ground', exact: true }).waitFor({ state: 'visible' });
    await heldSave('loaded-canonical-fixture');
    await open(); await intro(); assert.equal(await complete(x.answers, true, true), x.score);
    const bank = dialog.getByRole('button', { name: 'Bank the session', exact: true });
    await native('bank', bank, () => page.waitForFunction(({ key, expected }) => localStorage.getItem(key) === expected, { key, expected: x.paidRaw }));
    held = x.paidRaw; await heldSave('bank-once');
    const decoded = codec.parseSoccerCareerSave(await main()); assert(codec.isSoccerCareerSave(decoded));
    assert.deepEqual(decoded, x.paid); assert.deepEqual(skills.map(key => decoded[key]), skills.map(() => x.skill));
    assert.equal(engine.trainingAvailable(decoded), false); assert.equal(await bank.count(), 0);
    await native('immediate-try-again', dialog.getByRole('button', { name: 'Try again', exact: true }),
      () => board.getByRole('button', { name: 'Start reading session', exact: true }).waitFor({ state: 'visible' }));
    await heldSave('same-panel-retry');
    await native('retry-start', board.getByRole('button', { name: 'Start reading session', exact: true }),
      () => board.getByRole('group', { name: 'Decision 1 of 5: ' + situations[0].title, exact: true }).waitFor({ state: 'visible' }));
    await scoreIs(0); await heldSave('retry-reset');
    await native('back-to-drills', board.getByRole('button', { name: 'Back to drills', exact: true }),
      () => dialog.getByRole('button', { name: /Read the pass/ }).waitFor({ state: 'visible' }));
    await close(); await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Open the training ground', exact: true }).waitFor({ state: 'visible' });
    await heldSave('paid-codec-reload'); assert.deepEqual(codec.parseSoccerCareerSave(await main()), x.paid);
    await open(); await intro(); assert.equal(await complete(situations.map(s => s.correct), false, false), 100);
    assert.equal(await dialog.getByRole('button', { name: 'Bank the session', exact: true }).count(), 0, 'SC_READING_APP_SPENT_REPLAY_NO_BANK');
    await heldSave('perfect-spent-replay'); await close();
    return { status: 'passed', position: x.position, score: x.score, boost: x.boost, label: x.label,
      actions, answerChecks, disabledNativePointerProbes: pointerProbes, samePanelRetryReset: true,
      codecReloadHeld: true, perfectSpentReplayScore: 100, spentFullBytesHeld: true, currentSkillsHeld: true,
      finalRaw: held, finalSHA256: sha(held), scope: x.scope, clockOverride: false, rngOverride: false };
  } catch (error) { error.readingActions = actions; throw error; }
}
