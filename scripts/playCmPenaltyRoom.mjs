import assert from 'node:assert/strict';
import { penaltyExample } from './lib/cmPenaltyRoomFixture.mjs';
import { guardedAdBrowser, isSiteAsset, staticReply } from './lib/playwrightAdReplay.mjs';

const origin = new URL(process.env.BASE ?? 'http://127.0.0.1:4173');
assert(['127.0.0.1', 'douknowball.com'].includes(origin.hostname));
const entry = process.env.PENALTY_ENTRY;
assert.match(entry ?? '', /^index-[\w-]+\.js$/);
const { career, fixture, best, worst, play } = await penaltyExample();
let draw = 0;
for (; draw < 512; draw++) {
  const a = play(draw, best).score, b = play(draw, worst).score;
  if (a.mine > a.theirs && b.mine < b.theirs) break;
}
assert(draw < 512);
const careerKey = 'dukb-club-manager-save';
const browser = await guardedAdBrowser();
try {
  for (const width of [320, 390, 1366]) {
    const ctx = await browser.browser.newContext({ viewport: { width, height: width > 700 ? 900 : 844 }, hasTouch: width < 700, serviceWorkers: 'block', reducedMotion: 'reduce' });
    try {
      const errors = [];
      await ctx.routeWebSocket('**/*', socket => socket.close());
      await ctx.route('**/*', async r => {
        const req = r.request(), url = new URL(req.url());
        const doc = req.resourceType() === 'document' && url.pathname === '/club-manager' && !url.search;
        if (req.method() !== 'GET' || url.origin !== origin.origin || !(doc || isSiteAsset(url))) return r.abort();
        try {
          const reply = await staticReply(url.href);
          if (doc) assert(reply.body.toString().includes('src="/assets/' + entry + '"'), 'Wrong release entry');
          return await r.fulfill(reply);
        } catch (e) { errors.push(e.message); return r.abort(); }
      });
      await ctx.addInitScript(({ careerKey, career }) => {
        if (localStorage.getItem('qa-penalties')) return;
        localStorage.setItem(careerKey, JSON.stringify(career));
        localStorage.setItem('cm-guide-seen','1');
        localStorage.setItem('rules-gate-seen:/club-manager','1');
        localStorage.setItem('cookie-consent-v2',JSON.stringify({ version:2, advertising:false, analytics:false, updatedAt:Date.now() }));
        localStorage.setItem('qa-penalties','1');
      }, { careerKey, career });
      const p = await ctx.newPage();
      p.on('pageerror', e => errors.push(e.message));
      const dialog = p.getByRole('dialog', { name: 'Penalty Room' });
      const open = p.getByRole('button', { name: /^Penalty Room/ });
      async function openRoom() {
        const tab = p.getByRole('tab', { name: 'Tactics', exact: true });
        const resume = p.getByRole('button', { name: 'Resume Career', exact: true });
        await resume.or(tab).first().waitFor();
        if (await resume.count()) await resume.first().click();
        await tab.click(); await open.click();
      }
      const readCareer = () => p.evaluate(k => localStorage.getItem(k), careerKey);
      await p.goto(new URL('/club-manager', origin).href);
      await openRoom();
      const before = await readCareer();
      await p.evaluate(draw => {
        const standard = crypto.getRandomValues.bind(crypto);
        crypto.getRandomValues = array => {
          if (array instanceof Uint32Array && array.length === 1) {
            array[0] = draw;
            crypto.getRandomValues = standard;
            return array;
          }
          return standard(array);
        };
      }, draw);
      await dialog.getByRole('button', { name: 'Call every kick' }).click();
      for (const [n, order] of [worst, best].entries()) {
        const { run, score } = play(draw, order);
        for (const [index, id] of run.picks.entries()) {
          const row = dialog.locator('[data-penalty-taker]').filter({ hasText: fixture.players.find(p => p.id === id).name });
          await row.click();
          await row.waitFor({ state: 'detached' });
          if (n === 0 && index === 1) {
            const partial = await dialog.locator('[data-penalty-score]').innerText();
            await p.reload(); await openRoom();
            await dialog.getByText('Choose taker 3', { exact: true }).waitFor();
            assert.equal(await dialog.locator('[data-penalty-score]').innerText(), partial);
          }
        }
        await dialog.getByText(n === 0 ? 'Shootout lost' : 'Shootout won', { exact: true }).waitFor();
        assert.equal(await dialog.locator('[data-penalty-score]').innerText(), career.clubName + ' ' + score.mine + ' : ' + score.theirs + ' ' + fixture.opponent);
        assert.equal(await readCareer(), before);
        if (!n) {
          await dialog.getByRole('button', { name: 'Replay same draw' }).click();
        } else {
          await dialog.getByRole('button', { name: 'Use these takers in competitive shootouts' }).click();
          await dialog.getByText('Your match shootout order is set.').waitFor();
          await p.waitForFunction(({ key, picks }) => JSON.stringify(JSON.parse(localStorage.getItem(key)).shootoutOrder) === JSON.stringify(picks), { key: careerKey, picks: run.picks });
          assert.deepEqual(JSON.parse(await readCareer()), { ...JSON.parse(before), shootoutOrder: run.picks });
          await p.reload(); await openRoom();
          await dialog.getByText('Your match shootout order is set.').waitFor();
        }
        console.log(width, career.clubName, score.mine, score.theirs, fixture.opponent, 'draw', draw);
      }
      await p.keyboard.press('Escape');
      assert(await open.evaluate(e => e === document.activeElement));
      assert(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      assert.deepEqual(errors, []);
    } finally { await ctx.close(); }
  }
} finally { await browser.close(); }
console.log(entry, 'passed Penalty Room on all three widths.');
