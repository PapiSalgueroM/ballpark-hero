/**
 * Round 514 browser harness: compact game pages keep their useful content.
 *
 * This walks the four routes that gained an explicit GameNav this round plus
 * Footle and Club Manager, which exercise the normal and largest real page
 * trees. It checks the built application at the phone widths that commonly
 * expose overflow, and once on desktop.
 *
 * External origins are aborted. The assertions only need local registry and
 * guide chunks, while blocking Supabase, analytics and ads keeps this walk
 * read only. PAGE_COMFORT_CONTROL plants one owned defect on one page and one
 * viewport. Each control must change the tested DOM and fail only its named
 * assertion, so an unrelated failure can never make a negative control green.
 *
 * Run after building and starting the host-like server:
 *   BASE=http://127.0.0.1:4184 node scripts/playPageComfort.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import pw from './lib/playwrightLoader.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://127.0.0.1:4184';
const CONTROL = process.env.PAGE_COMFORT_CONTROL ?? '';
const INVENTORY_ONLY = process.env.PAGE_COMFORT_INVENTORY === '1';
const OUTPUT = process.env.PAGE_COMFORT_OUT ?? path.join(os.tmpdir(), 'dukb-page-comfort');
const BASE_ORIGIN = new URL(BASE).origin;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* Read the exported registry rather than maintaining a second route list in
   this harness. The temporary bundle follows the same Windows-safe house
   pattern as genSitemap and simRelatedGames. */
const REGISTRY_ENTRY = path.join(os.tmpdir(), `pageComfortRegistry-${process.pid}.mjs`);
const REGISTRY_BUNDLE = path.join(os.tmpdir(), `pageComfortRegistry-${process.pid}.bundle.mjs`);
fs.writeFileSync(REGISTRY_ENTRY, `
const reg = await import('${ROOT.replaceAll('\\', '/')}/src/data/gameRegistry.ts');
export const paths = reg.ALL_GAMES.map(game => game.path);
`);
execSync(`"${path.join(ROOT, 'node_modules', '.bin', 'esbuild')}" "${REGISTRY_ENTRY}" --bundle --format=esm --platform=node --outfile="${REGISTRY_BUNDLE}" --log-level=error`, { stdio: 'inherit' });
const { paths: ALL_GAME_ROUTES } = await import(pathToFileURL(REGISTRY_BUNDLE).href);
const ALL_GAME_ROUTE_SET = new Set(ALL_GAME_ROUTES);

const ROUTES = [
  '/perfect-lineup-nba',
  '/perfect-lineup-f1',
  '/perfect-lineup-nhl',
  '/transfer-path',
  '/footle',
  '/club-manager',
];
const VIEWPORTS = [
  { width: 320, height: 720 },
  { width: 390, height: 844 },
  { width: 430, height: 900 },
  { width: 1440, height: 900 },
];
const SPORT_LINKS = ['/soccer', '/pro-football', '/college', '/pro-basketball', '/baseball', '/hockey'];
const ABOUT_LINKS = ['/about', '/contact', '/whats-new', '/records', '/leaderboard', '/accessibility'];
const LEGAL_NAMES = [
  'NFL', 'NBA', 'UFC', 'NHL', 'MLB, FIFA, UEFA', 'Premier League',
  'English Football League', 'LaLiga', 'Serie A', 'Bundesliga', 'Ligue 1',
  'Eredivisie', 'MLS', 'Saudi Pro League', 'IOC', 'NCAA', 'F1', 'PGA Tour',
  'NASCAR', 'ATP', 'WTA',
];
const CONTROL_FAILURES = new Map([
  ['duplicate', ['play-next-count']],
  ['guide-open', ['guide-closed']],
  ['site-info-open', ['site-info-closed']],
  ['policies-inside', ['policies-outside']],
  ['report-inside', ['report-outside']],
  ['legal-truncated', ['legal-retention']],
  ['secondary-link-missing', ['secondary-links']],
  ['guide-hidden', ['guide-reveal']],
  ['overflow', ['closed-overflow', 'open-footer-overflow']],
]);

let failures = 0;
let controlChanged = false;
let controlProof = '';
const failureKeys = [];
const pageErrors = [];
const screenshots = [];
const say = (ok, what, key) => {
  console.log((ok ? '  PASS  ' : '  FAIL  ') + what);
  if (!ok) {
    failures += 1;
    failureKeys.push(key || `unowned:${what}`);
  }
};
const sameLinks = (actual, expected) =>
  actual.length === expected.length && expected.every(link => actual.includes(link));

if (CONTROL && !CONTROL_FAILURES.has(CONTROL)) {
  console.error(`Unknown PAGE_COMFORT_CONTROL value: ${CONTROL}`);
  process.exit(1);
}

fs.mkdirSync(OUTPUT, { recursive: true });
const browser = await chromium.launch();
const routes = CONTROL ? ROUTES.slice(0, 1) : ROUTES;
const viewports = CONTROL ? VIEWPORTS.slice(0, 1) : VIEWPORTS;

async function inventoryAllGames() {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(() => localStorage.setItem('cookie-consent', 'essential'));
  await context.route('**/*', route => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.origin === BASE_ORIGIN || requestUrl.protocol === 'data:' || requestUrl.protocol === 'blob:') {
      return route.continue();
    }
    return route.abort();
  });
  const page = await context.newPage();
  let currentErrors = [];
  page.on('pageerror', error => currentErrors.push(String(error)));
  const missing = [];

  console.log(`0) Registry inventory: ${ALL_GAME_ROUTES.length} built game routes`);
  for (const route of ALL_GAME_ROUTES) {
    currentErrors = [];
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => {
      const body = document.body?.innerText ?? '';
      return !!document.querySelector('nav[aria-label="Play next"]')
        || !!document.querySelector('[data-seo-content="ready"]')
        || /failed to load|unable to load|something went wrong|could not (?:be )?load|couldn't (?:load|build)|did not arrive/i.test(body);
    }, { timeout: 8000 }).catch(() => {});

    /* The SEO block belongs to the page shell and can be ready while a child
       board is still loading. Give that board one bounded chance to reach its
       real state before calling it an external-data loader. */
    const childStillLoading = await page.evaluate(() =>
      !document.querySelector('nav[aria-label="Play next"]')
      && !!document.querySelector('[aria-busy="true"], .animate-spin, .animate-pulse'),
    );
    if (childStillLoading) {
      await page.waitForFunction(() => {
        const body = document.body?.innerText ?? '';
        const busy = !!document.querySelector('[aria-busy="true"], .animate-spin, .animate-pulse');
        return !!document.querySelector('nav[aria-label="Play next"]')
          || !busy
          || /failed to load|unable to load|something went wrong|could not (?:be )?load|couldn't (?:load|build)|did not arrive/i.test(body);
      }, { timeout: 8000 }).catch(() => {});
    }

    const state = await page.evaluate(() => {
      const body = (document.body?.innerText ?? '').replace(/\s+/g, ' ').trim();
      const navs = [...document.querySelectorAll('nav[aria-label="Play next"]')];
      const nav = navs[0];
      const seoReady = !!document.querySelector('[data-seo-content="ready"]');
      const busy = !!document.querySelector('[aria-busy="true"], .animate-spin, .animate-pulse')
        || /\bloading\b|fetching data/i.test(body);
      const visibleError = /failed to load|unable to load|something went wrong|could not (?:be )?load|couldn't (?:load|build)|did not arrive/i.test(body);
      const hrefs = [...(nav?.querySelectorAll('[data-play-next-game]') ?? [])]
        .map(link => link.getAttribute('href'))
        .filter(Boolean);
      return {
        navCount: navs.length,
        stable: !!nav?.hasAttribute('data-related-games') && !nav?.hasAttribute('data-no-prerender'),
        hrefs,
        seoReady,
        busy,
        visibleError,
        chars: body.length,
      };
    });
    const validHrefs = state.hrefs.length === 6
      && new Set(state.hrefs).size === 6
      && !state.hrefs.includes(route)
      && state.hrefs.every(href => ALL_GAME_ROUTE_SET.has(href));
    if (state.navCount === 1 && state.stable && validHrefs) continue;

    let kind = 'invalid-play-next';
    if (state.navCount === 0) {
      kind = 'rendered-no-nav';
      if (currentErrors.length > 0 || state.visibleError) kind = 'error';
      else if (state.busy && !state.seoReady) kind = 'external-data-loading';
      else if (state.seoReady) kind = 'completed-shell-no-nav';
    }
    missing.push({ route, kind, navCount: state.navCount, stable: state.stable, hrefs: state.hrefs, chars: state.chars, error: currentErrors[0] ?? '' });
    console.log(`  RED   ${route}  ${kind}  nav=${state.navCount}  stable=${state.stable}  links=${state.hrefs.length}  chars=${state.chars}${currentErrors[0] ? `  ${currentErrors[0]}` : ''}`);
  }
  await context.close();
  console.log(`  ${missing.length ? 'FAIL' : 'PASS'}  ${ALL_GAME_ROUTES.length - missing.length}/${ALL_GAME_ROUTES.length} registry routes show one valid stable six-link Play Next block`);
  return missing;
}

if (!CONTROL) {
  const missing = await inventoryAllGames();
  failures += missing.length;
  if (INVENTORY_ONLY) {
    await browser.close();
    if (failures > 0) {
      console.error(`\n${failures} REGISTRY ROUTE${failures === 1 ? '' : 'S'} MISSING PLAY NEXT`);
      process.exit(1);
    }
    console.log('\nALL REGISTRY ROUTES CARRY PLAY NEXT');
    process.exit(0);
  }
}

console.log(`playPageComfort: ${routes.length} routes at ${viewports.length} viewport${viewports.length === 1 ? '' : 's'}`);

for (const viewport of viewports) {
  const context = await browser.newContext({ viewport });
  await context.addInitScript(() => localStorage.setItem('cookie-consent', 'essential'));
  await context.route('**/*', route => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.origin === BASE_ORIGIN || requestUrl.protocol === 'data:' || requestUrl.protocol === 'blob:') {
      return route.continue();
    }
    return route.abort();
  });

  const page = await context.newPage();
  page.on('pageerror', error => pageErrors.push(`${viewport.width}px ${page.url()}: ${String(error)}`));

  for (const route of routes) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.locator('[data-seo-content="ready"]').waitFor({ state: 'attached', timeout: 20000 });
    await page.locator('nav[aria-label="Play next"]').waitFor({ state: 'visible', timeout: 20000 });
    await page.locator('footer[data-site-chrome]').waitFor({ state: 'visible', timeout: 20000 });
    /* Several games correctly open their existing help dialog on a first
       visit. Close that dialog like a visitor before testing controls behind
       it. Opening-help coverage belongs to its own audit. */
    const openingDialog = page.locator('[role="dialog"]:visible');
    if (await openingDialog.count()) {
      await page.keyboard.press('Escape');
      await openingDialog.first().waitFor({ state: 'hidden', timeout: 5000 });
    }

    if (CONTROL && !controlChanged) {
      const planted = await page.evaluate(control => {
        const nav = document.querySelector('nav[aria-label="Play next"]');
        const guide = document.querySelector('[data-seo-content="ready"] details');
        const siteInfo = document.querySelector('footer[data-site-chrome] details');
        const policies = document.querySelector('footer[data-site-chrome] nav[aria-label="Policies and preferences"]');
        const report = [...document.querySelectorAll('footer[data-site-chrome] button')]
          .find(button => /report a bug/i.test(button.textContent ?? ''));
        if (control === 'duplicate') {
          const before = document.querySelectorAll('nav[aria-label="Play next"]').length;
          if (!nav?.parentElement) return { changed: false, proof: 'Play Next parent missing' };
          nav.parentElement.append(nav.cloneNode(true));
          const after = document.querySelectorAll('nav[aria-label="Play next"]').length;
          return { changed: before === 1 && after === 2, proof: `Play Next count ${before} to ${after}` };
        }
        if (control === 'guide-open') {
          const before = !!guide?.hasAttribute('open');
          guide?.setAttribute('open', '');
          const after = !!guide?.hasAttribute('open');
          return { changed: !before && after, proof: `guide open ${before} to ${after}` };
        }
        if (control === 'site-info-open') {
          const before = !!siteInfo?.hasAttribute('open');
          siteInfo?.setAttribute('open', '');
          const after = !!siteInfo?.hasAttribute('open');
          return { changed: !before && after, proof: `Site info open ${before} to ${after}` };
        }
        if (control === 'policies-inside') {
          const before = policies?.closest('details') ?? null;
          if (!policies || !siteInfo) return { changed: false, proof: 'policies or Site info missing' };
          siteInfo.append(policies);
          return { changed: before === null && policies.closest('details') === siteInfo, proof: 'policies moved inside Site info' };
        }
        if (control === 'report-inside') {
          const before = report?.closest('details') ?? null;
          if (!report || !siteInfo) return { changed: false, proof: 'report or Site info missing' };
          siteInfo.append(report);
          return { changed: before === null && report.closest('details') === siteInfo, proof: 'report moved inside Site info' };
        }
        if (control === 'legal-truncated') {
          const legal = siteInfo?.querySelector('p');
          const before = legal?.textContent ?? '';
          if (!legal) return { changed: false, proof: 'legal paragraph missing' };
          legal.textContent = 'DoUKnowBall site information.';
          return { changed: before.length > legal.textContent.length && !legal.textContent.includes('independent fan project'), proof: `legal text ${before.length} to ${legal.textContent.length} chars` };
        }
        if (control === 'secondary-link-missing') {
          const links = [...(siteInfo?.querySelectorAll('nav[aria-label="Sports"] a, nav[aria-label="About the site"] a') ?? [])];
          const before = links.length;
          links.at(-1)?.remove();
          const after = siteInfo?.querySelectorAll('nav[aria-label="Sports"] a, nav[aria-label="About the site"] a').length ?? 0;
          return { changed: before === 12 && after === 11, proof: `secondary links ${before} to ${after}` };
        }
        if (control === 'guide-hidden') {
          const article = guide?.querySelector('article, div.border-t');
          if (!(article instanceof HTMLElement)) return { changed: false, proof: 'guide content missing' };
          const before = article.style.display;
          article.style.display = 'none';
          return { changed: before !== 'none' && article.style.display === 'none', proof: `guide display ${before || '(unset)'} to none` };
        }
        if (control === 'overflow') {
          const before = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth;
          const wide = document.createElement('div');
          wide.style.width = '5000px';
          wide.style.height = '1px';
          wide.dataset.pageComfortOverflowControl = '';
          document.body.append(wide);
          const after = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth;
          return { changed: before <= 1 && after > 100, proof: `overflow ${before}px to ${after}px` };
        }
        return { changed: false, proof: `unhandled control ${control}` };
      }, CONTROL);
      controlChanged = planted.changed;
      controlProof = planted.proof;
    }

    const closed = await page.evaluate(() => {
      const navs = [...document.querySelectorAll('nav[aria-label="Play next"]')];
      const nav = navs[0];
      const guide = document.querySelector('[data-seo-content="ready"] details');
      const footer = document.querySelector('footer[data-site-chrome]');
      const siteInfo = footer?.querySelector('details');
      const policies = footer?.querySelector('nav[aria-label="Policies and preferences"]');
      const report = [...(footer?.querySelectorAll('button') ?? [])]
        .find(button => /report a bug/i.test(button.textContent ?? ''));
      const visible = element => {
        if (!(element instanceof HTMLElement)) return false;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      };
      const policyLabels = ['Privacy Policy', 'Terms of Service', 'Cookie choices'];
      const policyItems = policyLabels.map(label => [...(policies?.querySelectorAll('a,button') ?? [])]
        .find(item => (item.textContent ?? '').trim() === label));
      const pageWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
      return {
        navCount: navs.length,
        stable: !!nav?.hasAttribute('data-related-games') && !nav?.hasAttribute('data-no-prerender'),
        tileCount: nav?.querySelectorAll('[data-play-next-game]').length ?? 0,
        guideClosed: !!guide && !guide.hasAttribute('open'),
        guideSummaryVisible: visible(guide?.querySelector('summary')),
        siteInfoClosed: !!siteInfo && !siteInfo.hasAttribute('open'),
        policiesVisible: visible(policies),
        policyItemsVisible: policyItems.every(visible),
        policiesOutsideSiteInfo: !!policies && !policies.closest('details'),
        reportVisible: visible(report),
        reportOutsideSiteInfo: !!report && !report.closest('details'),
        overflow: pageWidth - window.innerWidth,
      };
    });

    const label = `${route} at ${viewport.width}px`;
    say(closed.navCount === 1, `${label}: exactly one Play Next block (saw ${closed.navCount})`, 'play-next-count');
    say(closed.stable && closed.tileCount === 6, `${label}: stable six-link game graph`, 'stable-game-graph');
    say(closed.guideClosed && closed.guideSummaryVisible, `${label}: Game guide starts closed with a visible control`, 'guide-closed');
    say(closed.siteInfoClosed, `${label}: Site info starts closed`, 'site-info-closed');
    say(closed.policiesVisible && closed.policyItemsVisible && closed.policiesOutsideSiteInfo,
      `${label}: policies and cookie choice remain available outside Site info`, 'policies-outside');
    say(closed.reportVisible && closed.reportOutsideSiteInfo,
      `${label}: Report a bug remains available outside Site info`, 'report-outside');
    say(closed.overflow <= 1, `${label}: no closed-page horizontal overflow (${closed.overflow}px)`, 'closed-overflow');

    /* The two closed-state controls must not also break their later click
       checks merely because the plant left the disclosure open. */
    if (CONTROL === 'guide-open' || CONTROL === 'site-info-open') {
      await page.evaluate(control => {
        const selector = control === 'guide-open'
          ? '[data-seo-content="ready"] details'
          : 'footer[data-site-chrome] details';
        document.querySelector(selector)?.removeAttribute('open');
      }, CONTROL);
    }

    if (!CONTROL && route === '/footle' && viewport.width === 390) {
      await page.locator('[data-seo-content="ready"] summary').scrollIntoViewIfNeeded();
      const screenshot = path.join(OUTPUT, 'page-comfort-footle-390.png');
      await page.screenshot({ path: screenshot });
      screenshots.push(screenshot);
    }

    if ((!CONTROL && viewport.width === 390) || CONTROL === 'guide-hidden') {
      const guide = page.locator('[data-seo-content="ready"] details');
      await guide.locator('summary').click();
      const openedGuide = await guide.evaluate(element => ({
        open: element.hasAttribute('open'),
        heading: [...element.querySelectorAll('h2')]
          .find(node => /^How to play/i.test(node.textContent ?? ''))?.textContent?.trim() ?? '',
        readableChars: (element.textContent ?? '').replace(/\s+/g, ' ').trim().length,
      }));
      const headingVisible = await guide.locator('h2').filter({ hasText: /^How to play/i }).first().isVisible();
      say(openedGuide.open && headingVisible && openedGuide.readableChars > 500,
        `${label}: clicking Game guide reveals ${openedGuide.heading || 'no heading'} and real content`, 'guide-reveal');
      await guide.locator('summary').click();
    }

    const siteInfo = page.locator('footer[data-site-chrome] details');
    await siteInfo.locator('summary').click();
    const openedFooter = await siteInfo.evaluate((element, expectedLegal) => {
      const legal = element.querySelector('p')?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
      const sportLinks = [...element.querySelectorAll('nav[aria-label="Sports"] a')]
        .map(link => link.getAttribute('href'))
        .filter(Boolean);
      const aboutLinks = [...element.querySelectorAll('nav[aria-label="About the site"] a')]
        .map(link => link.getAttribute('href'))
        .filter(Boolean);
      const visible = node => {
        if (!(node instanceof HTMLElement)) return false;
        const rect = node.getBoundingClientRect();
        return getComputedStyle(node).visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      };
      return {
        open: element.hasAttribute('open'),
        legalVisible: visible(element.querySelector('p')),
        legalComplete: legal.includes('DoUKnowBall is an independent fan project')
          && legal.includes('Player names and statistics are used for identification and commentary only')
          && expectedLegal.every(name => legal.includes(name)),
        sportLinks,
        aboutLinks,
        secondaryVisible: visible(element.querySelector('nav[aria-label="Sports"]'))
          && visible(element.querySelector('nav[aria-label="About the site"]')),
        overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
      };
    }, LEGAL_NAMES);
    say(openedFooter.open && openedFooter.legalVisible && openedFooter.legalComplete,
      `${label}: Site info click reveals the full legal text`, 'legal-retention');
    say(openedFooter.secondaryVisible
      && sameLinks(openedFooter.sportLinks, SPORT_LINKS)
      && sameLinks(openedFooter.aboutLinks, ABOUT_LINKS),
    `${label}: Site info reveals all ${SPORT_LINKS.length + ABOUT_LINKS.length} secondary links`, 'secondary-links');
    say(openedFooter.overflow <= 1, `${label}: no open-footer horizontal overflow (${openedFooter.overflow}px)`, 'open-footer-overflow');

    if (!CONTROL && route === '/club-manager' && viewport.width === 1440) {
      await siteInfo.scrollIntoViewIfNeeded();
      const screenshot = path.join(OUTPUT, 'page-comfort-club-manager-footer-1440.png');
      await siteInfo.screenshot({ path: screenshot });
      screenshots.push(screenshot);
    }
  }
  await context.close();
}

await browser.close();

if (pageErrors.length > 0) {
  for (const error of pageErrors) say(false, `page error: ${error}`, 'page-error');
} else {
  say(true, 'no browser page errors across the walk', 'page-error');
}

if (CONTROL) {
  if (!controlChanged) {
    console.error(`\nCONTROL FAILED: ${CONTROL} changed nothing (${controlProof})`);
    process.exit(1);
  }
  const expected = CONTROL_FAILURES.get(CONTROL);
  if (failureKeys.length !== expected.length || failureKeys.some((key, index) => key !== expected[index])) {
    console.error(`\nCONTROL FAILED: ${CONTROL} expected ${expected.join(', ')} but failed ${failureKeys.join(', ') || 'nothing'} (${controlProof})`);
    process.exit(1);
  }
  console.log(`\nCONTROL PASSED: ${CONTROL} changed ${controlProof} and failed exactly ${failureKeys.join(', ')}`);
  process.exit(0);
}

if (failures > 0) {
  console.error(`\n${failures} PAGE COMFORT CHECK${failures === 1 ? '' : 'S'} FAILED`);
  process.exit(1);
}
console.log(`\nALL PAGE COMFORT CHECKS PASSED`);
for (const screenshot of screenshots) console.log(`  screenshot: ${screenshot}`);
