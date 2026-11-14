import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from './lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [origin, entry, mode = 'candidate'] = process.argv.slice(2);
assert.ok(origin && /^\/assets\/index-[\w-]+\.js$/.test(entry), 'Pass the site origin and exact entry asset');
assert.ok(['baseline', 'candidate'].includes(mode));
const { outputFiles } = await build({
  absWorkingDir: ROOT, bundle: true, platform: 'node', format: 'esm', write: false,
  alias: { '@': path.join(ROOT, 'src') }, logLevel: 'error',
  stdin: { resolveDir: ROOT, contents: `
    export { acceptOffer, FALLBACK_CLUBS, repairCareer } from './src/lib/soccerCareerEngine';
    export { isSoccerCareerSave, parseSoccerCareerSave } from './src/lib/soccerCareerSave';
  ` },
});
const { acceptOffer, FALLBACK_CLUBS, repairCareer, isSoccerCareerSave, parseSoccerCareerSave } =
  await import('data:text/javascript;base64,' + Buffer.from(outputFiles[0].contents).toString('base64'));
const recorded = JSON.parse(readFileSync(path.join(ROOT, 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8'));
const recordedPlayer = recorded.saves.find(save => save.id === 'cha' && save.kind === 'player');
assert.ok(recordedPlayer, 'The captured Norwich City player fixture is available');
const career = structuredClone(recordedPlayer.state);
const madrid = FALLBACK_CLUBS.find(club => club.name === 'Real Madrid');
const twente = FALLBACK_CLUBS.find(club => club.name === 'Twente');
assert.ok(madrid && twente && ![madrid.name, twente.name].includes(career.currentClub));
const offerA = { club: madrid, contractYears: 4, wage: 55000, transferFee: 0 };
const offerB = { club: twente, contractYears: 2, wage: 22000, transferFee: 0 };
Object.assign(career, {
  age: 24, overall: 70, agentId: 'super', weeklyWage: 30000, contractYearsLeft: 2,
  phase: 'transfer_window', pendingOffers: [], pendingLoanOffers: null, loan: null,
  pendingSummary: null, pendingBallonDor: null, pendingNews: [], pendingEvents: [],
  pendingAppealResult: null, transferSituation: { type: 'bidding_war', offerA, offerB },
  isClubCaptain: false, captainClub: null, frozenOut: 0, badSeasonStreak: 0,
});
repairCareer(career);
assert.ok(isSoccerCareerSave(career));
const bytes = JSON.stringify(career);
assert.equal(JSON.stringify(repairCareer(structuredClone(career))), bytes);

const browser = await chromium.launch();
try {
  for (const [width, height, offer, range] of [
    [320, 568, offerA, [8, 16]], [390, 844, offerB, [32, 38]],
  ]) {
    const signed = acceptOffer(structuredClone(career), offer);
    assert.equal(signed.currentClub, offer.club.name, 'The existing signing rules accept the prepared offer');
    assert.notEqual(signed.weeklyWage, offer.wage, 'Agent-adjusted terms must differ from the raw offer');
    const context = await browser.newContext({
      viewport: { width, height }, isMobile: true, hasTouch: true,
      reducedMotion: 'reduce', serviceWorkers: 'block',
    });
    const errors = [];
    let writes = 0;
    try {
      await context.routeWebSocket('**/*', socket => socket.close());
      await context.route('**/*', route => {
        const request = route.request();
        return new URL(request.url()).origin === origin && ['GET', 'HEAD'].includes(request.method())
          ? route.continue() : route.abort();
      });
      context.on('requestfinished', request => {
        if (!['GET', 'HEAD'].includes(request.method())) writes++;
      });
      await context.addInitScript(raw => {
        if (sessionStorage.getItem('bidding-war-fixture')) return;
        sessionStorage.setItem('bidding-war-fixture', '1');
        localStorage.setItem('soccerCareerSave', raw);
        localStorage.setItem('cookie-consent-v2', JSON.stringify({
          version: 2, advertising: false, analytics: false, updatedAt: Date.now(),
        }));
        localStorage.removeItem('dukb-soccer-currency');
      }, bytes);
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(String(error)));
      const readSave = () => page.evaluate(() => localStorage.getItem('soccerCareerSave'));
      const response = await page.goto(origin + '/soccer-career?offer_comparison=' + Date.now(), {
        waitUntil: 'domcontentloaded', timeout: 25000,
      });
      assert.equal(response.status(), 200);
      assert.equal((await response.text()).match(/<script[^>]+src=["'](\/assets\/index-[\w-]+\.js)/)?.[1], entry);
      const review = page.getByRole('button', { name: 'Review contract with ' + offer.club.name });
      await review.waitFor();
      const comparison = page.getByRole('region', { name: 'Compare contract offers' });
      assert.equal(await comparison.count(), mode === 'candidate' ? 1 : 0);
      if (mode === 'candidate') {
        const offers = comparison.getByRole('listitem');
        assert.equal(await offers.count(), 2);
        const first = await offers.first().boundingBox();
        const second = await offers.nth(1).boundingBox();
        assert.ok(first.x < second.x && Math.abs(first.y - second.y) < 1, 'Both offers appear side by side');
        assert.ok(Math.max(first.height, second.height) <= 110, 'The comparison is compact');
        for (const [index, expectedOffer, expectedRange] of [[0, offerA, [8, 16]], [1, offerB, [32, 38]]]) {
          const panel = offers.nth(index);
          const expectedWage = acceptOffer(structuredClone(career), expectedOffer).weeklyWage;
          assert.ok((await panel.innerText()).includes(expectedOffer.club.name));
          assert.ok((await panel.innerText()).includes('€' + expectedWage.toLocaleString('en-US')));
          assert.ok((await panel.innerText()).includes(expectedOffer.contractYears + ' years'));
          assert.ok((await panel.innerText()).includes(expectedRange.join(' to ')));
        }
        assert.ok((await comparison.innerText()).includes('Estimated league games'));
        assert.equal(await comparison.evaluate(panel => panel.scrollWidth <= panel.clientWidth + 1), true);
      }
      assert.equal(await readSave(), bytes, 'Viewing the window preserves all save bytes');
      await review.tap();
      const dialog = page.getByRole('dialog', { name: 'Review contract' });
      assert.equal(await dialog.locator('[data-offer-signed-wage]').getAttribute('data-offer-signed-wage'), String(signed.weeklyWage));
      assert.equal(await readSave(), bytes, 'Opening the existing review preserves the save');
      await dialog.getByRole('button', { name: 'Back', exact: true }).tap();
      await dialog.waitFor({ state: 'hidden' });
      assert.equal(await readSave(), bytes, 'Back preserves both offers');
      await review.tap();
      await dialog.getByRole('button', { name: 'Sign contract', exact: true }).tap();
      await page.waitForFunction(raw => localStorage.getItem('soccerCareerSave') !== raw, bytes);
      const result = parseSoccerCareerSave(await readSave());
      for (const key of ['phase', 'currentClub', 'weeklyWage', 'contractYearsLeft', 'transferSituation']) {
        assert.deepEqual(result[key], signed[key], 'Existing signing settles ' + key);
      }
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForFunction(name => document.querySelector('main')?.innerText.includes(name), offer.club.name);
      assert.equal(parseSoccerCareerSave(await readSave()).currentClub, offer.club.name);
      assert.deepEqual(errors, []);
      assert.equal(writes, 0);
      console.log(JSON.stringify({ width, entry, mode, signed: offer.club.name, wage: signed.weeklyWage, range, writes }));
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
