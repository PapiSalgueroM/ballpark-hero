/* Run against a built loopback site with BASE=http://127.0.0.1:4173.
 * --ranked, --careers or --home-search run the selected checks. HOST_TOP25 may name
 * a verified host export containing exactly 25 ranked public paths, one per line.
 * The publisher script and its creative requests are intercepted local fixtures.
 * Nothing from this replay is sent to an advertising or analytics provider. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { answerConsent } from './lib/answerConsent.mjs';
import { guardedAdBrowser, isSiteAsset, staticReply } from './lib/playwrightAdReplay.mjs';

const published = process.argv.includes('--published');
const origin = new URL(published ? 'https://douknowball.com' : process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://127.0.0.1:4173');
if (!published) assert(origin.protocol === 'http:' && origin.hostname === '127.0.0.1');
const publisher = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2929318086316376';
const localCreative = '/__ad-career-replay__/creative';
const slots = '[data-dukb-manual-ad] ins.adsbygoogle';
const privateScreen = '#soccer-career-slots, [data-testid="cm-slots"], [data-testid="cm-points"], [data-dukb-set-aside], [data-cm-startup]';
const selection = '[data-game-desktop-rails] :is(button, a[href], input, select, textarea, summary, [contenteditable="true"], [tabindex]:not([tabindex="-1"]), [draggable="true"], .cursor-pointer, canvas, video, table, [role="button"], [role="grid"], [role="application"], [data-cm-pitch])';
const guard = await guardedAdBrowser();
const { browser } = guard;
const widths = [320, 390, 1280, 1366, 1920];
const fixture = await build({ stdin: { resolveDir: process.cwd(), contents:
  "export { initCareer, FALLBACK_CLUBS } from './src/lib/soccerCareerEngine'; export { serializeSoccerCareerSave } from './src/lib/soccerCareerSave';" },
  bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'error' });
const { initCareer, FALLBACK_CLUBS, serializeSoccerCareerSave } = await import('data:text/javascript;base64,' + Buffer.from(fixture.outputFiles[0].text).toString('base64'));
const attrs = { pace: 62, shooting: 62, passing: 62, dribbling: 62, defending: 62, physical: 62, reflexes: 62 };
const initialCareer = initCareer('Career Reader', 'England', 'ST', '2020s', attrs, 62, 2020, FALLBACK_CLUBS, null);

async function profile(width, { soccer = false, gpc = false, returning = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: width === 320 ? 640 : width === 390 ? 844 : 960 },
    isMobile: width < 640, hasTouch: width < 640, serviceWorkers: 'block', reducedMotion: 'reduce' });
  const evidence = { loader: 0, creatives: [], errors: [] };
  await ctx.addInitScript(({ soccer, save, gpc, returning }) => {
    if (gpc) Object.defineProperty(navigator, 'globalPrivacyControl', { value: true });
    if (soccer && !localStorage.getItem('soccerCareerSave')) localStorage.setItem('soccerCareerSave', save);
    if (returning) localStorage.setItem('cookie-consent-v2', JSON.stringify({ version: 2, advertising: true, analytics: false, updatedAt: Date.now() }));
    localStorage.setItem('rules-gate-seen:/soccer-career', '1');
    localStorage.setItem('rules-gate-seen:/club-manager', '1');
  }, { soccer, save: soccer ? serializeSoccerCareerSave(initialCareer, 1) : null, gpc, returning });
  await ctx.routeWebSocket('**/*', socket => socket.close());
  await ctx.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url());
    if (url.href === publisher) {
      evidence.loader++;
      return route.fulfill({ contentType: 'text/javascript', body: `
        const used = new WeakSet();
        const documentId = crypto.randomUUID();
        let nextId = 0;
        window.adsbygoogle = window.adsbygoogle || [];
        const push = window.adsbygoogle.push.bind(window.adsbygoogle);
        window.adsbygoogle.push = function(entry) {
          const el = [...document.querySelectorAll(${JSON.stringify(slots)})].find(slot => !used.has(slot));
          if (!el) throw Error('Publisher push without a new manual placement');
          used.add(el);
          const url = new URL(${JSON.stringify(localCreative)}, location.origin);
          el.dataset.fixtureRequest = documentId + '-' + (++nextId);
          url.searchParams.set('id', el.dataset.fixtureRequest);
          url.searchParams.set('role', el.closest('[data-dukb-manual-ad]').dataset.dukbManualAd);
          url.searchParams.set('slot', el.dataset.adSlot);
          url.searchParams.set('private', String(Boolean(location.search || location.hash || document.querySelector(${JSON.stringify(privateScreen)}))));
          fetch(url).then(response => { if (response.ok && el.isConnected) el.setAttribute('data-ad-status', 'filled'); });
          return push(entry);
        };
      ` });
    }
    if (url.origin === origin.origin && url.pathname === localCreative) {
      evidence.creatives.push(Object.fromEntries(url.searchParams));
      return route.fulfill({ status: 204, body: '' });
    }
    if (url.origin === origin.origin && req.method() === 'GET') {
      const document = req.isNavigationRequest() && req.resourceType() === 'document'
        && /^\/(?:[a-z0-9-]+\/?)*$/.test(url.pathname) && !url.search;
      if (document || isSiteAsset(url)) {
        try {
          const response = await staticReply(url.href);
          if (document && process.env.AD_RELEASE_ENTRY) {
            assert(response.body.toString().includes('src="/assets/' + process.env.AD_RELEASE_ENTRY + '"'), 'Unexpected release entry');
          }
          return await route.fulfill(response);
        }
        catch (error) { evidence.errors.push('First-party file ' + url.pathname + ': ' + error.message); }
      }
    }
    return route.abort();
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(published ? 45000 : 12000);
  page.on('pageerror', e => evidence.errors.push(e.message));
  return { ctx, page, evidence };
}

const open = (page, path) => page.goto(new URL(path, origin).href, { waitUntil: 'domcontentloaded' });
const stored = (page, key) => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
const counts = evidence => [evidence.loader, evidence.creatives.length];
async function excluded(page, evidence, prior, label) {
  await page.waitForTimeout(450);
  assert.equal(await page.locator(slots).count(), 0, label + ' has a placement');
  assert.deepEqual(counts(evidence), prior, label + ' made a request');
}

async function distances(page) {
  return page.evaluate(({ slots, selection }) => {
    const viewport = { width: document.documentElement.clientWidth, height: innerHeight };
    const inView = r => r.right > 0 && r.left < viewport.width && r.bottom > 0 && r.top < viewport.height;
    const clippedBox = el => {
      if (!el.checkVisibility({ visibilityProperty: true, opacityProperty: true })) return null;
      let { left, right, top, bottom } = el.getBoundingClientRect();
      for (let parent = el.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
        const css = getComputedStyle(parent);
        if (css.overflowX === 'visible' && css.overflowY === 'visible') continue;
        const box = parent.getBoundingClientRect();
        if (css.overflowX !== 'visible') { left = Math.max(left, box.left); right = Math.min(right, box.right); }
        if (css.overflowY !== 'visible') { top = Math.max(top, box.top); bottom = Math.min(bottom, box.bottom); }
      }
      return right - left > 1 && bottom - top > 1 ? { left, right, top, bottom } : null;
    };
    const controls = [...document.querySelectorAll(selection)].filter(el => !el.closest('[data-dukb-manual-ad]')).map(clippedBox).filter(Boolean);
    return [...document.querySelectorAll(slots)].filter(el => { const r = clippedBox(el); return r && inView(r); }).map(el => {
      const a = el.getBoundingClientRect();
      const gaps = controls.map(b => {
        const dx = Math.max(0, a.left - b.right, b.left - a.right), dy = Math.max(0, a.top - b.bottom, b.top - a.bottom);
        return Math.hypot(dx, dy);
      });
      return { role: el.closest('[data-dukb-manual-ad]').dataset.dukbManualAd, controls: gaps.length, inView: controls.filter(inView).length, px: gaps.length ? Math.min(...gaps) : null };
    });
  }, { slots, selection });
}

async function checkActive(page, evidence, label) {
  const footer = page.locator('[data-public-footer-ad] ins[data-ad-status="filled"]');
  await footer.waitFor();
  await page.waitForTimeout(650);
  const roles = await page.locator(slots).evaluateAll(els => els.map(el => el.closest('[data-dukb-manual-ad]').dataset.dukbManualAd).sort());
  assert.deepEqual(roles, roles.length === 1 ? ['public-footer'] : ['left-rail', 'public-footer', 'right-rail'], label);
  if (page.viewportSize().width < 1280) assert.equal(roles.length, 1);
  assert(evidence.creatives.every(row => row.slot === '7540487748' && row.private === 'false'), label + ': unapproved request');
  const activeIds = await page.locator(slots).evaluateAll(els => els.map(el => el.dataset.fixtureRequest));
  const activeRequests = evidence.creatives.filter(row => activeIds.includes(row.id));
  assert.deepEqual(activeRequests.map(row => row.role).sort(), roles, label + ': missing placement request');
  const samples = [];
  for (const fraction of [0, 0.5, 1]) {
    await page.evaluate(f => scrollTo({ top: document.scrollingElement.scrollHeight * f, behavior: 'instant' }), fraction);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    samples.push(...await distances(page));
  }
  assert.deepEqual([...new Set(samples.map(sample => sample.role))].sort(), roles, label + ': a placement was never in view');
  assert(samples.every(sample => sample.px === null || sample.px >= 149.5), label + ': ads too close to controls ' + JSON.stringify(samples));
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  console.log(JSON.stringify({ label, viewport: page.viewportSize(), roles, loaderRequests: evidence.loader, fixtureCreativeRequests: evidence.creatives.length, samples }));
}

async function clearanceControl(page) {
  const selected = await page.evaluate(({ slots, selection }) => {
    const target = [...document.querySelectorAll(selection)].find(el => !el.closest('[data-site-chrome], [data-seo-content]') &&
      el.checkVisibility({ visibilityProperty: true }) && el.getBoundingClientRect().width > 10);
    const ad = document.querySelector('[data-public-footer-ad] ins');
    if (!target || !ad || !document.querySelector(slots)) return false;
    target.scrollIntoView({ block: 'center', behavior: 'instant' });
    const box = target.getBoundingClientRect();
    ad.dataset.qaOldStyle = ad.getAttribute('style');
    Object.assign(ad.style, { position: 'fixed', top: box.top + 'px', left: box.left + 'px', width: box.width + 'px', height: box.height + 'px', zIndex: '999999' });
    return ad.getBoundingClientRect().top === box.top;
  }, { slots, selection });
  assert(selected, 'The clearance control must physically move a filled ad over a control');
  assert((await distances(page)).some(sample => sample.role === 'public-footer' && sample.px === 0), 'Collision control was not detected');
  await page.locator('[data-qa-old-style]').evaluate(el => { el.setAttribute('style', el.dataset.qaOldStyle); delete el.dataset.qaOldStyle; });
  assert((await distances(page)).every(sample => sample.px !== 0), 'Restoring the placement did not clear the collision');
}

async function soccer(width) {
  const {ctx, page, evidence} = await profile(width, { soccer: true });
  try {
    await open(page, '/soccer-career');
    const next = page.getByRole('button', { name: 'Next Year', exact: true });
    await next.waitFor();
    await excluded(page, evidence, [0, 0], 'Before accepting');
    assert.equal(await answerConsent(page, { choice: 'accept' }), 'accepted');
    const start = await stored(page, 'soccerCareerSave');
    await next.click();
    await page.waitForFunction(age => JSON.parse(localStorage.getItem('soccerCareerSave')).age > age, start.age);
    const played = await stored(page, 'soccerCareerSave');
    await checkActive(page, evidence, 'Soccer played a year');
    if (width === 390) await clearanceControl(page);
    const before = counts(evidence);
    await page.getByRole('button', { name: 'Career saves', exact: true }).click();
    await page.locator('#soccer-career-slots').waitFor();
    await excluded(page, evidence, before, 'Soccer save list');
    await page.getByRole('link', { name: 'Resume slot 1' }).click();
    await checkActive(page, evidence, 'Soccer resumed');
    const resumed = await stored(page, 'soccerCareerSave');
    assert.equal(resumed.age, played.age);
    assert.deepEqual(resumed.seasons, played.seasons);
    assert.equal(evidence.loader, 1);
    assert.deepEqual(evidence.errors, []);
  } finally { await ctx.close(); }
}

async function manager(width) {
  const {ctx, page, evidence} = await profile(width);
  try {
    await open(page, '/club-manager');
    const button = name => page.getByRole('button', { name }).first();
    await button(/2026-27/).waitFor();
    assert.equal(await answerConsent(page, { choice: 'accept' }), 'accepted');
    for (const name of [/2026-27/, /England/i, /Premier League/i, /Crystal Palace/i, /Take the job/i, /skip.*just manage/i]) await button(name).click();
    const managers = page.getByTestId('cm-show-slots');
    await managers.waitFor();
    await page.getByRole('tab', { name: 'Market', exact: true }).click();
    await page.getByRole('textbox', { name: 'Search player or club' }).fill('Palmer');
    const shortlist = page.getByRole('button', { name: 'Save Cole Palmer', exact: true });
    await shortlist.click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('dukb-club-manager-save'))?.recruitment?.targets?.some(target => target.name === 'Cole Palmer'));
    const saved = await stored(page, 'dukb-club-manager-save');
    assert.equal(saved.clubName, 'Crystal Palace');
    assert(saved.recruitment.targets.some(target => target.name === 'Cole Palmer'));
    await checkActive(page, evidence, 'Manager shortlisted a player');
    const before = counts(evidence);
    await managers.click();
    await page.getByTestId('cm-slots').waitFor();
    await excluded(page, evidence, before, 'Manager save list');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByTestId('cm-slot-1').waitFor();
    await excluded(page, evidence, before, 'Manager loaded save list');
    await page.getByTestId('cm-slot-1').getByRole('button', { name: /Resume Career/i }).click();
    await managers.waitFor();
    await checkActive(page, evidence, 'Manager resumed');
    const resumed = await stored(page, 'dukb-club-manager-save');
    assert.deepEqual(resumed.recruitment.targets, saved.recruitment.targets);
    assert.equal(resumed.budget, saved.budget);
    assert.deepEqual(evidence.errors, []);
  } finally { await ctx.close(); }
}

async function privacy(width, gpc) {
  const {ctx, page, evidence} = await profile(width, { gpc });
  try {
    await open(page, '/');
    await page.getByRole('region', { name: 'Cookie choices' }).waitFor();
    await excluded(page, evidence, [0, 0], 'Before a choice');
    const choice = gpc ? 'accept' : 'reject';
    assert.equal(await answerConsent(page, { choice }), gpc ? 'accepted' : 'rejected');
    await excluded(page, evidence, [0, 0], gpc ? 'GPC after accepting' : 'Rejected');
    await page.locator('#root a[href="/soccer-career"]').first().click();
    await page.waitForURL(url => url.pathname === '/soccer-career');
    await excluded(page, evidence, [0, 0], 'Privacy carried into game');
    await page.goBack();
    await page.waitForURL(url => url.pathname === '/');
    await excluded(page, evidence, [0, 0], 'Privacy carried Back');
    assert.deepEqual(evidence.errors, []);
    console.log(JSON.stringify({ width, decision: gpc ? 'GPC + accept' : 'reject', loaderRequests: evidence.loader, fixtureCreativeRequests: evidence.creatives.length }));
  } finally { await ctx.close(); }
}

async function privacyControls() {
  const { ctx, page, evidence } = await profile(390);
  try {
    await open(page, '/privacy');
    await answerConsent(page, { choice: 'reject' });
    await excluded(page, evidence, [0, 0], 'Clean privacy page');
    await page.evaluate(() => {
      const wrapper = document.createElement('aside');
      wrapper.dataset.dukbManualAd = 'public-footer';
      wrapper.innerHTML = '<ins class="adsbygoogle"></ins>';
      document.body.append(wrapper);
    });
    await assert.rejects(excluded(page, evidence, [0, 0], 'Unrequested slot control'), /Unrequested slot control has a placement/);
    await page.locator('[data-dukb-manual-ad]').evaluate(el => el.remove());
    await excluded(page, evidence, [0, 0], 'Restored privacy page');
    await page.evaluate(src => {
      const script = document.createElement('script');
      script.src = src;
      document.head.append(script);
    }, publisher);
    await assert.rejects(excluded(page, evidence, [0, 0], 'Loader-only control'), /Loader-only control made a request/);
    assert.deepEqual(counts(evidence), [1, 0]);
    console.log('PASS: independent negative controls detected a slot without a request and a publisher request without a slot.');
  } finally { await ctx.close(); }
}

async function homeSearch(width, acceptDuringSearch) {
  const { ctx, page, evidence } = await profile(width);
  try {
    await open(page, '/');
    const input = page.getByLabel('Search games', { exact: true });
    await input.waitFor();
    const inventory = width < 1280 ? 1 : 3;
    async function expectInventory(prior) {
      await page.waitForFunction(({ slots, inventory }) => document.querySelectorAll(slots + '[data-ad-status="filled"]').length === inventory, { slots, inventory });
      assert.equal(evidence.creatives.length - prior, inventory);
    }
    if (acceptDuringSearch) {
      await input.fill('basketball');
      await page.locator('[data-home-search-active]').waitFor();
    }
    assert.equal(await answerConsent(page, { choice: 'accept' }), 'accepted');
    if (acceptDuringSearch) {
      await excluded(page, evidence, [0, 0], 'Accepted during first search');
      await input.fill('');
    }
    await expectInventory(0);
    const before = counts(evidence);
    for (const query of ['soccer', 'hockey']) {
      await input.fill(query);
      await page.locator('[data-home-search-active]').waitFor();
      await excluded(page, evidence, before, 'Searching after Home placements');
      await input.fill('');
      await page.locator('[data-home-search-active]').waitFor({ state: 'detached' });
      await excluded(page, evidence, before, 'Cleared repeat search');
    }
    await page.locator('#root a[href="/soccer"]:visible').first().click();
    await page.waitForURL(url => url.pathname === '/soccer');
    await expectInventory(before[1]);
    assert.deepEqual(evidence.errors, []);
    console.log(JSON.stringify({ width, acceptDuringSearch, homeRequests: before[1], requestsAfterTwoSearches: before[1], destinationRequests: evidence.creatives.length - before[1] }));
  } finally { await ctx.close(); }
}

async function ranked() {
  const doc = await readFile('docs/TRAFFIC-PRIORITIES-2026-11-26.md', 'utf8');
  const search = [...doc.matchAll(/^\| \d+ \| (\/[^ ]*) \|/gm)].map(row => row[1]);
  const host = [...doc.matchAll(/^\| \d+ \| \/[^ ]* \| (\/[^ ]*) \|/gm)].map(row => row[1]);
  assert.equal(new Set(search).size, 25);
  assert.equal(new Set(host).size, 10);
  if (process.env.HOST_TOP25) {
    const paths = (await readFile(process.env.HOST_TOP25, 'utf8')).trim().split(/\r?\n/).map(path => path.trim());
    assert(paths.every(path => /^\/(?:[a-z0-9-]+\/?)*$/.test(path)));
    assert.equal(paths.length, 25);
    assert.equal(new Set(paths).size, 25);
    host.splice(0, host.length, ...paths);
  }
  const hubs = ['/soccer', '/pro-basketball', '/pro-football', '/baseball', '/hockey', '/college'];
  const previousPriorities = ['/front-office', '/soccer-perfect-season', '/records', '/records/nba-champions'];
  const routes = [...new Set([...search, ...host, ...hubs, ...previousPriorities])];
  const results = [], failures = [];
  for (const width of [320, 390, 1280, 1366, 1920]) {
    await Promise.all([0, 1, 2].map(async worker => {
      const { ctx, page, evidence } = await profile(width, { returning: true });
      try {
        for (const path of routes.filter((_, i) => i % 3 === worker)) {
          const before = counts(evidence);
          try {
            await open(page, path);
            await page.locator('[data-public-footer-ad] ins[data-ad-status="filled"]').waitFor();
            await page.waitForTimeout(900);
            const roles = await page.locator(slots).evaluateAll(els => els.map(el => {
              if (el.dataset.adStatus !== 'filled') throw Error('A placement never received its fixture');
              return el.closest('[data-dukb-manual-ad]').dataset.dukbManualAd;
            }).sort());
            const attempts = evidence.creatives.slice(before[1]);
            assert.equal(evidence.loader - before[0], 1, 'Expected one publisher request');
            assert.deepEqual(attempts.map(row => row.role).sort(), roles, 'A requested placement disappeared or a rendered slot was never requested');
            assert(attempts.every(row => row.slot === '7540487748' && row.private === 'false'));
            assert.deepEqual(roles, roles.length === 1 ? ['public-footer'] : ['left-rail', 'public-footer', 'right-rail']);
            if (width < 1280) assert.equal(roles.length, 1);
            if (width >= 1280 && ['/', '/soccer', '/pro-basketball', '/pro-football', '/baseball', '/hockey', '/college'].includes(path)) assert.equal(roles.length, 3);
            if (width === 1280 && path === '/build-your-xi') {
              assert.equal(roles.length, process.argv.includes('--baseline') ? 1 : 3, 'Build Your XI compact-desktop allocation');
            }
            const playable = !!await page.locator('[data-playable-route]').count();
            const samples = await distances(page);
            await page.locator('[data-public-footer-ad] ins').evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
            samples.push(...await distances(page));
            const footerGap = await page.evaluate(() => document.querySelector('[data-public-footer-ad] ins').getBoundingClientRect().top -
              document.querySelector('footer[data-site-chrome]').getBoundingClientRect().bottom);
            assert(footerGap >= 149.5, 'Footer clearance ' + footerGap);
            if (playable || !process.argv.includes('--baseline')) assert(samples.every(s => s.px === null || s.px >= 149.5), 'Control clearance ' + JSON.stringify(samples));
            assert.deepEqual([...new Set(samples.map(sample => sample.role))].sort(), roles, 'A placement was never in view');
            const frame = await page.evaluate(() => {
              const wrapper = document.querySelector('[data-game-desktop-rails]');
              const box = (getComputedStyle(wrapper).display === 'contents' ? wrapper.parentElement : wrapper).getBoundingClientRect();
              const viewport = document.documentElement.clientWidth;
              return { offCenter: Math.abs(box.left - (viewport - box.right)), overflow: document.documentElement.scrollWidth - viewport };
            });
            assert(frame.offCenter <= 2 && frame.overflow <= 1, 'Off-center or overflowing content ' + JSON.stringify(frame));
            const result = { path, width, roles, attempted: attempts.length, fixtureFills: roles.length, footerGap, samples };
            results.push(result);
            console.log(JSON.stringify(result));
          } catch (error) { const message = path + ' @' + width + ': ' + error.message; failures.push(message); console.error(message); }
        }
        assert.deepEqual(evidence.errors, []);
      } finally { await ctx.close(); }
    }));
  }
  assert.deepEqual(failures, []);
  assert.equal(results.length, routes.length * 5);
  console.log('PASS: ' + search.length + ' Google and ' + host.length + ' host rankings, ' + routes.length + ' distinct routes with hubs, five widths, ' + results.length + ' direct cases.');
}

try {
  const onlySearch = process.argv.includes('--home-search');
  if (!onlySearch && !process.argv.includes('--careers')) await ranked();
  if (!onlySearch && !process.argv.includes('--ranked')) {
    for (const width of widths) {
      await soccer(width);
      await manager(width);
      await privacy(width, false);
      await privacy(width, true);
    }
    await privacyControls();
    console.log('PASS: two played careers saved and resumed at five widths, consent and GPC persisted across navigation, and the rendered collision control tripped.');
  }
  if (!process.argv.includes('--ranked') && !process.argv.includes('--baseline')) {
    for (const width of [390, 1366]) {
      await homeSearch(width, false);
      await homeSearch(width, true);
    }
    console.log('PASS: repeat Home searches created no extra placements and the next public route received its placements.');
  }
} finally { await guard.close(); }
