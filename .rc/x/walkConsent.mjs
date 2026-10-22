// Round 1535 review (run lens), runner only, never committed. Plays the shared consent answer the way a walk uses it:
// first visit, reload, footer reopen, game routes with a rules gate, accept, a banner with no reject button, and a
// withdrawal (accept then reject). At 390x844 and 1280x900, reduced motion on and off. Every host but localhost is
// aborted (supabase.co included). Screenshots and measurements go to $RC_OUT. LABEL names the build (head or bn).
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';
import { answerConsent, storedConsent, consentButton, CONSENT_REGION } from '../../scripts/lib/answerConsent.mjs';

const { chromium } = pw;
const BASE = (process.env.BASE ?? 'http://localhost:4173').replace(/\/$/, '');
const LABEL = process.env.LABEL ?? 'head';
const OUT = process.env.RC_OUT ?? path.resolve('.tmp-fx/walk-out');
fs.mkdirSync(OUT, { recursive: true });
const REJECT = LABEL === 'bn' ? 'Essential only' : 'Reject all';
let n = 0, failed = 0;
const notes = [];
const say = (ok, msg) => { n++; if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'} [${LABEL}] ${msg}`); };
const note = (obj) => { notes.push(obj); console.log(`NOTE [${LABEL}] ${JSON.stringify(obj)}`); };
const VIEWS = [{ w: 390, h: 844 }, { w: 1280, h: 900 }];
const MOTIONS = ['reduce', 'no-preference'];
const ROUTES = ['/soccer-career', '/club-manager', '/football-grid', '/nba-my-career'];

const browser = await chromium.launch();
async function fresh(view, motion) {
  const ctx = await browser.newContext({ viewport: { width: view.w, height: view.h }, reducedMotion: motion });
  await ctx.route(url => !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(url.href), r => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.message).split('\n')[0].slice(0, 140)));
  return { ctx, page, errors };
}
const pending = page => page.evaluate(() => document.body.hasAttribute('data-consent-pending'));
const shot = (page, name) => page.screenshot({ path: path.join(OUT, `${LABEL}-${name}.png`) });
const bannerAfter = async (page, t0) => page.locator(CONSENT_REGION).first()
  .waitFor({ state: 'visible', timeout: 15000 }).then(() => Date.now() - t0, () => -1);
const footerButton = page => page.locator('footer button', { hasText: /^Cookie choices$/ }).first();

for (const view of VIEWS) for (const motion of MOTIONS) {
  const tag = `${view.w}-${motion === 'reduce' ? 'rm' : 'motion'}`;
  // 1. first visit on the home page
  let { ctx, page, errors } = await fresh(view, motion);
  let t0 = Date.now();
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  const up = await bannerAfter(page, t0);
  note({ tag, route: '/', bannerMsFromDomContentLoaded: up });
  say(up >= 0, `${tag} /: the banner is up on a first visit`);
  note({ tag, buttons: await page.locator(CONSENT_REGION).first().getByRole('button').allInnerTexts() });
  say(await pending(page), `${tag} /: body carries data-consent-pending while it is up`);
  await page.waitForTimeout(500);
  await shot(page, `${tag}-home-banner`);
  const btn = await consentButton(page);
  say(!!btn && (await btn.innerText()).trim() === REJECT, `${tag} /: consentButton finds "${REJECT}" by its exact label`);
  let t1 = Date.now();
  const r = await answerConsent(page);
  say(r === 'rejected', `${tag} /: answerConsent says ${r} (${Date.now() - t1} ms)`);
  say((await page.locator(CONSENT_REGION).count()) === 0 && !(await pending(page)), `${tag} /: the banner and data-consent-pending are both gone`);
  say((await storedConsent(page)) === 'rejected', `${tag} /: the stored answer reads ${await storedConsent(page)}`);
  await page.waitForTimeout(300);
  await shot(page, `${tag}-home-after`);
  // 2. reload: the answer is kept, nothing to answer (and the cost of the wait when it is absent)
  await page.reload({ waitUntil: 'load' });
  t1 = Date.now();
  const r2 = await answerConsent(page);
  note({ tag, absentMs: Date.now() - t1 });
  say(r2 === 'absent', `${tag} /: after a reload answerConsent says ${r2}`);
  // 3. reopen from the footer and answer again
  const footer = footerButton(page);
  if (await footer.count()) {
    await footer.evaluate(el => el.click());
    const r3 = await answerConsent(page, { wait: 8000, timeout: 10000 }).catch(e => 'threw: ' + e.message.split('\n')[0]);
    say(r3 === 'rejected', `${tag} /: reopened from the footer, answerConsent says ${r3}`);
    say((await storedConsent(page)) === 'rejected', `${tag} /: still stored as rejected after the reopen`);
  } else say(false, `${tag} /: no footer "Cookie choices" button to reopen the banner`);
  say(errors.length === 0, `${tag} /: no page errors${errors.length ? ': ' + errors[0] : ''}`);
  await ctx.close();

  // 4. game routes, first visit (a rules gate may host the banner)
  for (const route of ROUTES) {
    ({ ctx, page, errors } = await fresh(view, motion));
    t0 = Date.now();
    await page.goto(BASE + route, { waitUntil: 'domcontentloaded' });
    const ms = await bannerAfter(page, t0);
    const inHelp = await page.evaluate(() => !!document.querySelector('[data-dukb-help-cookie-choices] [aria-label="Cookie choices"]'));
    note({ tag, route, bannerMsFromDomContentLoaded: ms, insideHelp: inHelp });
    const slug = route.slice(1);
    if (route === '/soccer-career' || route === '/football-grid') { await page.waitForTimeout(500); await shot(page, `${tag}-${slug}-banner`); }
    const rr = await answerConsent(page).catch(e => 'threw: ' + e.message.split('\n')[0]);
    say(rr === 'rejected', `${tag} ${route}: answerConsent says ${rr} (inside help: ${inHelp})`);
    say((await page.locator(CONSENT_REGION).count()) === 0 && !(await pending(page)), `${tag} ${route}: banner and pending both gone`);
    if (route === '/soccer-career' || route === '/football-grid') { await page.waitForTimeout(300); await shot(page, `${tag}-${slug}-after`); }
    say(errors.length === 0, `${tag} ${route}: no page errors${errors.length ? ': ' + errors[0] : ''}`);
    await ctx.close();
  }
  if (motion !== 'reduce') continue;

  // 5. accept, then withdraw from the footer (the head reloads the page on a withdrawal)
  ({ ctx, page, errors } = await fresh(view, motion));
  await page.goto(BASE + '/', { waitUntil: 'load' });
  const ra = await answerConsent(page, { choice: 'accept' }).catch(e => 'threw: ' + e.message.split('\n')[0]);
  say(ra === 'accepted', `${tag} accept: answerConsent({ choice: 'accept' }) says ${ra}`);
  say((await storedConsent(page)) === 'accepted', `${tag} accept: the stored answer reads ${await storedConsent(page)}`);
  const f2 = footerButton(page);
  if (await f2.count()) {
    await f2.evaluate(el => el.click());
    const rw = await answerConsent(page, { wait: 8000, timeout: 10000 }).catch(e => 'threw: ' + e.message.split('\n')[0]);
    await page.waitForLoadState('load').catch(() => {});
    note({ tag, withdrawalAnswer: rw, storedAfter: await storedConsent(page).catch(e => 'threw: ' + e.message.split('\n')[0]) });
  }
  await ctx.close();

  // 6. a banner that is up with no reject button must throw, never say 'absent'
  ({ ctx, page, errors } = await fresh(view, motion));
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await page.locator(CONSENT_REGION).first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  const renamed = await page.evaluate(() => {
    let k = 0;
    for (const b of document.querySelectorAll('[aria-label="Cookie choices"] button')) {
      if (b.textContent.trim() === 'Reject all' || b.textContent.trim() === 'Essential only') { b.textContent = 'Not now'; k++; }
    }
    return k;
  });
  let thrown = '';
  const rt = await answerConsent(page).catch(e => { thrown = e.message.split('\n')[0]; return 'threw'; });
  say(renamed === 1 && rt === 'threw' && thrown.includes('has no "Reject all" or "Essential only" button'),
    `${tag} no reject button: renamed ${renamed}, answerConsent ${rt} (${thrown.slice(0, 100)})`);
  await ctx.close();
}

await browser.close();
fs.writeFileSync(path.join(OUT, `${LABEL}-walkConsent.json`), JSON.stringify({ label: LABEL, base: BASE, checks: n, failed, notes }, null, 1));
const ms = notes.filter(x => typeof x.bannerMsFromDomContentLoaded === 'number').map(x => x.bannerMsFromDomContentLoaded).sort((a, b) => a - b);
console.log(`banner appearance after domcontentloaded (ms): ${ms.join(' ')}`);
console.log(`walkConsent [${LABEL}]: ${n} checks, ${failed} failed`);
process.exit(failed ? 1 : 0);
