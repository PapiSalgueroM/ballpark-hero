import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '../lib/playwrightLoader.mjs';
import { loadFonts, inventory, staticRequest, seed } from './siteMenuNavigationSupport.mjs';

async function main() {
const out = process.env.SAVED_MENU_OUT;
if (!out || !path.isAbsolute(out)) throw new Error('Absolute SAVED_MENU_OUT required');
fs.mkdirSync(out);
const base = 'http://127.0.0.1:4173';
const fonts = loadFonts(process.env.FREE_KICK_FONT_CACHE, process.env.FONT_CACHE_MANIFEST_SHA256);
const files = new Set(inventory('dist').map(row => '/' + row.file));
const keys = [
  'soccerCareerSave', 'dukb-club-manager-save', 'stadiumTycoonSaveV1', 'wonderkidFactoryV1',
  'rebuild-table', 'front-office-save-v1', 'nfl-my-career-save-v1', 'cfb-dynasty-save-v1',
  'cbb-dynasty-save-v1', 'nba-front-office-save-v1', 'nba-my-career-save-v1',
  'mlb-my-career-save-v1', 'mlb-front-office-save-v1', 'nhl-my-career-save-v1',
  'nhl-front-office-save-v1', 'aussie-rules-manager-save-v2', 'fight-career-save-v1',
  'fight-promoter-save-v1', 'fight-gym-save-v1', 'hallOfChampionsV1', 'dukb-idle-arena-v1',
];

function sample(saveKeys) {
  const box = node => {
    if (!node) return null;
    const r = node.getBoundingClientRect();
    const visible = node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden';
    return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom,
      visible, centerHit: visible && node.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)) };
  };
  const dialog = document.querySelector('[role="dialog"][data-state="open"]');
  const section = dialog?.querySelector('section[aria-label="Saved games"]');
  const scroller = dialog?.querySelector('nav')?.parentElement;
  const trigger = document.querySelector('button[aria-label="Open site menu"]');
  const active = document.activeElement;
  const lock = node => ({ overflow: getComputedStyle(node).overflow, paddingRight: getComputedStyle(node).paddingRight,
    position: getComputedStyle(node).position, pointerEvents: getComputedStyle(node).pointerEvents });
  return {
    href: location.href, viewport: { width: innerWidth, height: innerHeight, scrollX, scrollY, documentWidth: document.documentElement.scrollWidth },
    menu: box(dialog), trigger: { ...box(trigger), focused: active === trigger },
    section: section ? { ...box(section), text: section.textContent, excludedFromPrerender: section.hasAttribute('data-no-prerender') } : null,
    saved: section ? [...section.querySelectorAll('a')].map(node => ({ href: node.getAttribute('href'),
      label: node.textContent, current: node.getAttribute('aria-current'), focused: node === active, ...box(node) })) : [],
    allLinks: dialog ? [...dialog.querySelectorAll('nav a')].map(node => ({ href: node.getAttribute('href'), label: node.textContent })) : [],
    scroll: scroller ? { ...box(scroller), top: scroller.scrollTop, clientHeight: scroller.clientHeight,
      scrollHeight: scroller.scrollHeight, overflow: getComputedStyle(scroller).overflowY } : null,
    active: { tag: active?.tagName, text: active?.textContent?.slice(0,120), href: active?.getAttribute('href') },
    lock: { body: lock(document.body), root: lock(document.documentElement), scrollLocked: document.body.getAttribute('data-scroll-locked') },
    saves: Object.fromEntries(saveKeys.map(key => [key, localStorage.getItem(key)])),
    fonts: { status: document.fonts.status, inter: document.fonts.check('16px Inter'), display: document.fonts.check('16px "Space Grotesk"') },
    trusted: window.__siteMenuTrusted || [],
  };
}

const browser = await chromium.launch();
const cases = [];
try {
  for (const spec of [
    { width:320, height:568, theme:'dark', motion:'no-preference' },
    { width:328, height:515, theme:'dark', motion:'no-preference' },
    { width:390, height:844, theme:'light', motion:'no-preference' },
    { width:430, height:900, theme:'dark', motion:'no-preference' },
    { width:1280, height:900, theme:'light', motion:'no-preference' },
    { width:390, height:844, theme:'dark', motion:'reduce' },
  ]) {
    const id = spec.width + '-' + spec.height + '-' + spec.theme + '-' + spec.motion;
    const record = { id, ...spec, observations:[], errors:[], io:[] };
    const context = await browser.newContext({ viewport:{ width:spec.width, height:spec.height }, reducedMotion:spec.motion, serviceWorkers:'block' });
    await context.routeWebSocket('**/*', async socket => { record.io.push({ kind:'websocket-abort' }); await socket.close(); });
    const page = await context.newPage();
    page.on('pageerror', error => record.errors.push({ name:error.name, message:error.message, stack:error.stack }));
    await context.addInitScript(seed, { theme:spec.theme, pending:false });
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url()), font = fonts.get(request.url());
      if (font && request.method() === 'GET' && ['stylesheet','font'].includes(request.resourceType())) {
        record.io.push({ kind:'prepared-font', url:request.url(), sha256:font.sha256 });
        return route.fulfill({ status:200, contentType:font.contentType, body:font.body });
      }
      if (url.origin === base) {
        staticRequest(url, request.method(), base, files);
        return route.continue();
      }
      record.io.push({ kind:'external-abort', url:request.url(), method:request.method(), resourceType:request.resourceType() });
      return route.abort();
    });
    const observe = async name => record.observations.push({ name, value:await page.evaluate(sample, keys) });
    const trigger = page.getByRole('button', { name:'Open site menu', exact:true });
    const dialog = page.getByRole('dialog', { name:'Menu', exact:true });
    const open = async () => {
      await trigger.click();
      await dialog.waitFor({ state:'visible' });
      await page.waitForTimeout(350);
    };
    const close = async () => {
      await dialog.getByRole('button', { name:'Close', exact:true }).click();
      await dialog.waitFor({ state:'hidden' });
      await page.waitForTimeout(350);
    };
    try {
      await page.goto(base + '/soccer', { waitUntil:'domcontentloaded' });
      await trigger.waitFor();
      await page.evaluate(() => document.fonts.ready);
      await observe('before');
      await open();
      await observe('empty');
      await close();
      await page.evaluate(() => {
        localStorage.setItem('soccerCareerSave', '{"currentClub":"private-club-marker"}');
        localStorage.setItem('nba-my-career-save-v1', '{invalid-json');
      });
      await open();
      const section = dialog.getByRole('region', { name:'Saved games', exact:true });
      await section.waitFor();
      await section.scrollIntoViewIfNeeded();
      await observe('two-saves');
      await page.screenshot({ path:path.join(out, id + '-two-saves.png') });
      const first = section.getByRole('link').first();
      await first.focus();
      await observe('first-link-focus');
      await page.keyboard.press('Tab');
      await observe('next-link-focus');
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state:'hidden' });
      await page.waitForTimeout(350);
      await observe('escape-return');
      await page.evaluate(() => {
        localStorage.removeItem('soccerCareerSave');
        localStorage.setItem('fight-career-save-v1', 'null');
      });
      await open();
      await observe('changed-saves');
      await close();
      await page.evaluate(saveKeys => { for (const key of saveKeys) localStorage.setItem(key, '{menu-fixture'); }, keys);
      await open();
      await section.getByRole('link').first().scrollIntoViewIfNeeded();
      await observe('all-saves-top');
      await page.screenshot({ path:path.join(out, id + '-all-top.png') });
      await section.getByRole('link').last().scrollIntoViewIfNeeded();
      await observe('all-saves-bottom');
      await page.screenshot({ path:path.join(out, id + '-all-bottom.png') });
      const accessibility = dialog.getByRole('link', { name:'Accessibility', exact:true });
      await accessibility.scrollIntoViewIfNeeded();
      await observe('site-links-reachable');
      await accessibility.click();
      await page.waitForURL(base + '/accessibility');
      await dialog.waitFor({ state:'hidden' });
      await page.waitForTimeout(350);
      await observe('navigation-return');
      record.complete = true;
    } catch (error) {
      record.failure = { name:error.name, message:error.message, stack:error.stack };
      throw error;
    } finally {
      cases.push(record);
      fs.writeFileSync(path.join(out, id + '.json'), JSON.stringify(record,null,2) + '\n', { flag:'wx' });
      await context.close();
    }
  }
} finally {
  await browser.close();
  fs.writeFileSync(path.join(out,'browser-observations.json'),
    JSON.stringify({ source:process.env.GITHUB_SHA, run:process.env.GITHUB_RUN_ID, attempt:process.env.GITHUB_RUN_ATTEMPT,
      observationsOnly:true, pixelsReviewed:false, savedLinkRouteVerifiedHere:false, cases },null,2) + '\n', { flag:'wx' });
}
console.log('Retained ' + cases.length + ' menu contexts for geometry, save refresh, focus and original pixel review.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
