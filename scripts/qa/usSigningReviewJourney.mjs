import assert from 'node:assert/strict';

const clone = value => JSON.parse(JSON.stringify(value));

export function createUsSigningFixture({ sport, appearance, market, signing }) {
  assert.ok(sport.slug === 'nba' || sport.slug === 'nfl');
  const pos = sport.create.defaultPos;
  const c = sport.startCareer('Contract Review', pos, sport.create.archetypes[pos][0], () => 0.6, appearance.defaultAppearance(), 'now');
  Object.assign(c, { contractYears: 0, role: 'starter', ovr: 98 });
  assert.equal(c.retired, false);
  assert.ok(!c.programme && !c.summer, 'Fresh fixture must not require a programme or summer repair');
  const window = sport.buildFaWindow(c, 80, () => 0.6);
  const talk = market.openMarketFreeAgency(c, sport.slug, window);
  assert.equal(talk.kind, 'freeagency');
  assert.deepEqual(market.restoreMarketTalk(talk, c, sport.slug), talk);
  const index = 1, offer = clone(window.offers[index]);
  assert.ok(offer && !offer.incumbent && !offer.gone);
  const before = { c, phase: 'freeagency', teamQuality: 80, coach: null, contractTalk: talk };
  const raw = JSON.stringify(before), after = clone(c);
  signing.applyFaSigning(after, offer);
  const premise = [0, 0.9999999999999999].map(value => {
    const state = clone(after), draws = [];
    const line = sport.campBattle(state, offer.quality, () => { draws.push(value); return value; });
    assert.equal(line, null, 'Elite starter must keep the role for this actual offer');
    assert.deepEqual(state, after, 'Camp may draw normally but must not change this fixture result');
    return { value, draws, unchanged: true };
  });
  assert.equal(after.team, offer.team); assert.equal(after.salary, offer.salary); assert.equal(after.contractYears, offer.years);
  assert.equal(after.role, 'starter'); assert.equal(after.fanbase, 40); assert.equal(after.morale, Math.min(100, c.morale + 6));
  const signed = { c: after, phase: 'season', teamQuality: offer.quality, coach: null };
  return { raw, expected: { key: sport.saveKey, path: '/' + sport.gameSlug, sport: sport.slug, index, offer,
    total: signing.faTotalValue(offer), before: clone(before), signed, premise } };
}

export async function runUsSigning({ page, width, base, fixture, photo, tap, goto, save }) {
  const e = fixture.expected;
  const row = { sport: e.sport, width, key: e.key, offer: e.offer, transitions: [], keyboard: [], campDrawScope: 'Unit old/fixed comparator owns exact tapes; browser RNG is untouched.' };
  const read = async () => {
    const raw = await save(e.key);
    assert.equal(typeof raw, 'string');
    return raw;
  };
  const y = () => page.evaluate(() => window.scrollY);
  const heldY = (before, after, marker) => assert.equal(after, before, marker);
  const active = locator => locator.evaluate(node => document.activeElement === node);
  const offerCard = page.locator(`[data-fa-offer="${e.index}"]`);
  const opener = offerCard.getByRole('button', { name: 'Sign', exact: true });
  const review = page.locator('[data-fa-sign-review]');
  const title = review.getByRole('heading', { name: `Sign with ${e.offer.label}?`, exact: true });
  const back = review.getByRole('button', { name: 'Back to offers', exact: true });
  const confirm = review.getByRole('button', { name: 'Confirm signing', exact: true });
  const keyboard = async key => { row.keyboard.push(key); await page.keyboard.press(key); };
  const waitTitle = async () => {
    await review.waitFor({ state: 'visible' });
    assert.equal(await review.count(), 1);
    await page.waitForFunction(() => {
      const title = document.querySelector('[data-fa-sign-review] h2');
      return !!title && document.activeElement === title;
    });
    assert.equal(await active(title), true, 'US_NATIVE_REVIEW_ENTRY_FOCUS');
  };
  const waitOpener = async () => {
    await review.waitFor({ state: 'hidden' });
    await page.waitForFunction(index => {
      const button = document.querySelector(`[data-fa-sign="${index}"]`);
      return !!button && document.activeElement === button;
    }, e.index);
    assert.equal(await active(opener), true, 'US_NATIVE_REVIEW_BACK_FOCUS');
  };

  await goto(new URL(e.path, base).href);
  await opener.waitFor({ state: 'visible' });
  assert.equal(await opener.count(), 1);
  assert.equal(await read(), fixture.raw, 'US_NATIVE_COLD_LOAD_BYTES');
  await opener.scrollIntoViewIfNeeded();
  if (width === 1280) { await opener.click({ trial: true }); await opener.focus(); }
  else await opener.tap({ trial: true });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const beforeOpen = await y();
  if (width === 1280) await keyboard('Enter'); else await tap(opener);
  await waitTitle();
  const afterOpen = await y();
  heldY(beforeOpen, afterOpen, 'US_NATIVE_REVIEW_ENTRY_SCROLL');
  assert.equal(await read(), fixture.raw, 'US_NATIVE_REVIEW_READ_ONLY');
  const terms = await review.locator('dl').innerText();
  assert.ok(terms.includes(`$${e.offer.salary}M`) && terms.includes(`$${e.total}M`));
  assert.ok(terms.includes(`${e.offer.years} year`) && terms.includes(String(e.offer.quality)));
  assert.equal(await confirm.isEnabled(), true);
  row.transitions.push({ action: 'review', beforeY: beforeOpen, afterY: afterOpen, exactSaveHeld: true, entryFocus: 'title', terms });
  await photo('signing-review', '[data-fa-sign-review]');

  if (width === 1280) {
    await keyboard('Tab'); assert.equal(await active(back), true, 'US_NATIVE_BACK_TAB'); await keyboard('Enter');
  } else await tap(back);
  await waitOpener();
  const afterBack = await y();
  heldY(beforeOpen, afterBack, 'US_NATIVE_REVIEW_BACK_SCROLL');
  assert.equal(await read(), fixture.raw, 'US_NATIVE_BACK_READ_ONLY');
  row.transitions.push({ action: 'back', beforeY: beforeOpen, afterY: afterBack, exactSaveHeld: true, returnedToExactOffer: true });

  if (width === 1280) await keyboard('Enter'); else await tap(opener);
  await waitTitle();
  const afterReopen = await y();
  heldY(beforeOpen, afterReopen, 'US_NATIVE_REVIEW_REOPEN_SCROLL');
  assert.equal(await read(), fixture.raw);
  if (width === 1280) {
    await keyboard('Tab'); assert.equal(await active(back), true, 'US_NATIVE_REOPEN_BACK_TAB');
    await keyboard('Tab'); assert.equal(await active(confirm), true, 'US_NATIVE_CONFIRM_TAB'); await keyboard('Enter');
  } else await tap(confirm);
  await page.waitForFunction(key => {
    const raw = localStorage.getItem(key);
    return !!raw && JSON.parse(raw).phase === 'season';
  }, e.key);
  await review.waitFor({ state: 'hidden' });
  const accepted = await read();
  assert.deepEqual(JSON.parse(accepted), e.signed, 'US_NATIVE_COMPLETE_SIGNED_SAVE');
  assert.equal(await page.locator('[data-fa-window]').count(), 0);
  row.transitions.push({ action: 'confirm', fullSavedFrameEqual: true, team: e.signed.c.team, salary: e.signed.c.salary,
    years: e.signed.c.contractYears, teamQuality: e.signed.teamQuality });

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /^Play .*season/i }).waitFor({ state: 'visible' });
  assert.equal(await read(), accepted, 'US_NATIVE_RELOAD_EXACT_SIGNED_BYTES');
  assert.equal(await review.count(), 0);
  assert.equal(await page.locator('[data-fa-window]').count(), 0);
  row.transitions.push({ action: 'reload', exactAcceptedBytesHeld: true });
  row.signed = JSON.parse(accepted);
  return row;
}
