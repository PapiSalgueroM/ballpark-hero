/* Observe the real publisher's outgoing display requests. Browser traffic is
 * denied at a local proxy. Only allowlisted static bytes are supplied to it.
 * Every auction, ad frame and measurement is intercepted before transmission.
 * BASE points to a built loopback site; --published uses the verified public build. */
import assert from 'node:assert/strict';
import { guardedAdBrowser, isSiteAsset, soccerCareerReplaySave, staticReply } from './lib/playwrightAdReplay.mjs';

const published = process.argv.includes('--published');
assert(process.argv.includes('--real-publisher'), 'Use --real-publisher to fetch the allowlisted static publisher libraries.');
const source = new URL(published ? 'https://douknowball.com' : process.env.BASE ?? 'http://127.0.0.1:4173');
if (!published) assert(source.protocol === 'http:' && source.hostname === '127.0.0.1');
const site = 'https://douknowball.com', vendor = 'https://pagead2.googlesyndication.com';
const client = 'ca-pub-2929318086316376', slot = '7540487748';
const loader = vendor + '/pagead/js/adsbygoogle.js?client=' + client;
const careerSave = await soccerCareerReplaySave();
const { browser, close } = await guardedAdBrowser();

async function observe(width, screen = 'lineup') {
  const path = screen === 'home' ? '/' : screen === 'lineup' ? '/build-your-xi' : '/soccer-career' + (screen === 'saves' ? '?view=saves' : '');
  const ctx = await browser.newContext({viewport: { width, height: width === 390 ? 844 : 900 }, hasTouch: width === 390,
    isMobile: width === 390, serviceWorkers: 'block', reducedMotion: 'reduce' });
  const result = { width, path, screen, documents: 0, beforeConsent: 0, publisher: 0, libraries: 0, framesBlocked: 0, auctionsBlocked: 0, matchedSizes: [], staticFailures: [] };
  let granted = false;
  try {
    if (screen === 'active' || screen === 'saves') await ctx.addInitScript(save => {
      localStorage.setItem('soccerCareerSave', save);
      localStorage.setItem('rules-gate-seen:/soccer-career', '1');
    }, careerSave);
    await ctx.routeWebSocket('**/*', socket => socket.close());
    await ctx.route('**/*', async route => {
      const req = route.request(), url = new URL(req.url()), type = req.resourceType();
      if (/\/(?:pagead|gampad)\/ads\/?$/.test(url.pathname)) {
        result.auctionsBlocked++;
        if (url.searchParams.get('client') === client && url.searchParams.get('slotname') === slot) {
          result.matchedSizes.push(Number(url.searchParams.get('w')) + 'x' + Number(url.searchParams.get('h')));
        }
        return route.abort();
      }
      const main = type === 'document' && url.href === site + path && req.isNavigationRequest() && result.documents === 0;
      if (type === 'document' && !main) { result.framesBlocked++; return route.abort(); }
      if (req.method() !== 'GET' || url.username || url.password) return route.abort();
      if ((main || isSiteAsset(url)) && url.origin === site) {
        try {
          const response = await staticReply(source.origin + url.pathname);
          if (main) {
            result.documents++;
            const html = response.body.toString('utf8');
            result.entry = html.match(/<script\b[^>]+\bsrc="\/assets\/(index-[\w-]+\.js)"/)?.[1];
            assert(result.entry, 'Document is missing the application entrypoint');
            if (process.env.AD_RELEASE_ENTRY) assert.equal(result.entry, process.env.AD_RELEASE_ENTRY);
          }
          return await route.fulfill(response);
        } catch (error) { result.staticFailures.push(url.pathname + ': ' + error.message); return route.abort(); }
      }
      const mainScript = url.href === loader;
      const library = url.origin === vendor && !url.search && /^\/pagead\/managed\/js\/adsense\/[\w-]+\/show_ads_impl[\w-]*\.js$/.test(url.pathname);
      if (type !== 'script' || !(mainScript || library)) return route.abort();
      if (!granted) { result.beforeConsent++; return route.abort(); }
      try {
        const response = await staticReply(url.href);
        assert.match(response.contentType, /javascript/);
        if (mainScript) result.publisher++; else result.libraries++;
        return await route.fulfill({ ...response, headers: { 'content-type': response.contentType, 'access-control-allow-origin': '*' } });
      } catch (error) { result.staticFailures.push(url.pathname + ': ' + error.message); return route.abort(); }
    });
    const page = await ctx.newPage();
    page.setDefaultTimeout(45000);
    await page.goto(site + path, { waitUntil: 'domcontentloaded' });
    const guide = page.getByRole('dialog', { name: /How to Play: Build Your XI/i });
    const baseline = process.argv.includes('--baseline');
    if (screen === 'lineup') {
      await guide.waitFor();
      if (baseline) await guide.getByRole('button', { name: 'Got it!', exact: true }).click();
    }
    if (screen === 'saves') await page.locator('#soccer-career-slots').waitFor();
    if (screen === 'active') await page.getByRole('button', { name: 'Next Year', exact: true }).waitFor();
    const region = page.getByRole('region', { name: 'Cookie choices' });
    await region.waitFor();
    if (screen === 'lineup' && !baseline) await guide.getByRole('region', { name: 'Cookie choices' }).waitFor();
    const manage = region.getByRole('button', { name: 'Manage choices', exact: true });
    if (await manage.isVisible()) await manage.click();
    const advertising = region.getByRole('checkbox', { name: 'Advertising', exact: true });
    assert(!await advertising.isChecked());
    assert(!await region.getByRole('checkbox', { name: 'Google Analytics', exact: true }).isChecked());
    assert.equal(result.publisher, 0);
    await advertising.check();
    granted = true;
    await region.getByRole('button', { name: 'Save choices', exact: true }).click();
    await region.waitFor({ state: 'hidden' });
    if (screen === 'lineup' && !baseline) await guide.getByRole('button', { name: 'Got it!', exact: true }).click();
    const soccerHelp = page.getByRole('dialog').getByRole('button', { name: /Let's Play!/i });
    if (screen === 'entry' && await soccerHelp.isVisible()) await soccerHelp.click();
    const purposes = await page.evaluate(() => JSON.parse(localStorage.getItem('cookie-consent-v2')));
    assert(purposes.advertising && !purposes.analytics);
    if (screen === 'saves') {
      await page.waitForTimeout(1500);
      assert.equal(await page.locator('ins.adsbygoogle').count(), 0);
      assert.deepEqual([result.beforeConsent, result.publisher, result.libraries, result.auctionsBlocked], [0, 0, 0, 0]);
      assert.deepEqual(result.staticFailures, []);
      console.log(JSON.stringify({ ...result, unrelatedAuctionsBlocked: 0, auctionsForwarded: 0, framesForwarded: 0 }));
      return;
    }
    const footer = page.locator('[data-public-footer-ad] ins');
    await footer.waitFor({state: 'attached'});
    await page.waitForTimeout(3500);
    const beforeScroll = [...result.matchedSizes];
    await page.evaluate(() => (document.querySelector('[data-public-footer-ad] ins') ?? document.querySelector('footer[data-site-chrome]'))?.scrollIntoView({ block: 'center' }));
    const widePair = width >= 1280 && !baseline;
    const railWidth = screen === 'home' ? (width >= 1920 ? 300 : 160) : (screen === 'active' && width >= 1366 ? 160 : 120);
    const expectedSizes = width === 390 ? ['320x100'] : widePair ? [railWidth + 'x600', railWidth + 'x600', '728x90'] : ['728x90'];
    const deadline = Date.now() + 18000;
    while (Date.now() < deadline && result.matchedSizes.length < expectedSizes.length) await page.waitForTimeout(200);
    console.log(JSON.stringify({ ...result, beforeScroll, unrelatedAuctionsBlocked: result.auctionsBlocked - result.matchedSizes.length, auctionsForwarded: 0, framesForwarded: 0 }));
    assert.deepEqual(result.staticFailures, []);
    assert.equal(result.beforeConsent, 0);
    assert.equal(result.documents, 1);
    assert.equal(result.publisher, 1);
    assert(result.libraries > 0);
    assert.deepEqual(result.matchedSizes.sort(), expectedSizes);
  } finally { await ctx.close(); }
}

try {
  const homeOnly = process.argv.includes('--home');
  if (homeOnly) for (const width of [1280, 1366, 1920]) await observe(width, 'home');
  if (!homeOnly && !process.argv.includes('--soccer')) for (const width of [390, 1280]) await observe(width);
  if (!homeOnly && !process.argv.includes('--lineup')) for (const width of [390, 1280, 1366]) {
    for (const screen of ['entry', 'active', 'saves']) await observe(width, screen);
  }
  console.log('PASS: real publisher attempted the expected manual displays after advertising-only consent; every auction and ad frame was blocked.');
} finally { await close(); }
