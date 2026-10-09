/* Reviewer walk for Release AP's seams (AP2, runner lens). Sent as .rc/x/walkAP2.mjs, never committed.
   BASE: the served build. RC_OUT: where screenshots and facts go. Every request to supabase.co is aborted. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const BASE = process.env.BASE ?? 'http://localhost:4173';
const OUT = process.env.RC_OUT ?? path.join(HERE, 'out');
fs.mkdirSync(OUT, { recursive: true });
const SAVES = JSON.parse(fs.readFileSync(path.join(HERE, 'walk-saves.json'), 'utf8'));
const { chromium } = await import(path.join(ROOT, 'scripts/lib/playwrightLoader.mjs').replace(/^([A-Za-z]:)/, 'file:///$1'));
const browser = await chromium.launch({ headless: true });
const facts = {};
let aborted = 0;
const say = (k, v) => { facts[k] = v; console.log(`${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`); };

async function open(tag, save, { width, height, reduced = false, helpSeen = true, route = '/nfl-my-career' }) {
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await ctx.addInitScript(([k, v, seen]) => {
    let t = 1147 >>> 0;
    Math.random = () => { t = (t + 0x6D2B79F5) >>> 0; let x = Math.imul(t ^ (t >>> 15), 1 | t); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
    try {
      if (!sessionStorage.getItem('ap2-walk')) {
        sessionStorage.setItem('ap2-walk', '1');
        localStorage.setItem('cookie-consent', 'essential');
        if (k) localStorage.setItem(k, v);
        if (seen) localStorage.setItem('seasonCentre:help:nfl', '1');
      }
    } catch { /* private mode */ }
  }, [save?.key ?? null, save?.value ?? null, helpSeen]);
  await ctx.route(/supabase\.co/, r => { aborted += 1; return r.abort(); });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(`pageerror: ${String(e).slice(0, 200)}`));
  page.on('console', m => { if (m.type() === 'error' && !/supabase|Failed to load resource|ERR_FAILED/.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  return { ctx, page, errors, tag };
}
const shot = async (P, name, full = false) => { try { await P.page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: full }); } catch (e) { console.log(`shot ${name} failed: ${String(e).slice(0, 120)}`); } };
const clickText = (page, text) => page.evaluate(t => {
  const b = [...document.querySelectorAll('button')].find(x => !x.disabled && (x.textContent ?? '').includes(t));
  if (!b) return false; b.click(); return true;
}, text);
const hubUp = page => page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => /Play the \d+ season/.test(b.textContent ?? '')), { timeout: 40000 }).then(() => true).catch(() => false);
const closeHowTo = async page => {
  for (let i = 0; i < 3; i += 1) {
    const had = await page.evaluate(() => { const b = [...document.querySelectorAll('[role="dialog"] button')].find(x => /Let's Play/.test(x.textContent ?? '')); if (b) b.click(); return !!b; });
    if (!had) break;
    await page.waitForTimeout(350);
  }
};
const entryFacts = page => page.evaluate(() => {
  const e = document.querySelector('[data-season-centre-entry]');
  if (e) e.scrollIntoView({ block: 'center' });
  const play = [...document.querySelectorAll('button')].find(b => /Play the \d+ season/.test(b.textContent ?? ''));
  const box = el => { if (!el) return null; const r = el.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; };
  return {
    play: play?.textContent?.trim() ?? null,
    entry: e ? (e.textContent ?? '').trim() : null,
    weekByWeek: !!document.querySelector('[data-week-by-week]'),
    watchLast: document.querySelector('[data-watch-last]')?.textContent?.trim() ?? null,
    held: document.querySelector('[data-season-centre-held]')?.textContent?.trim() ?? null,
    heldBox: box(document.querySelector('[data-season-centre-held]')),
    entryBox: box(e),
    sideways: document.documentElement.scrollWidth > innerWidth + 1,
    width: innerWidth,
  };
});
const saved = (page) => page.evaluate(() => { try { const v = JSON.parse(localStorage.getItem('nfl-my-career-save-v1') || 'null'); return v ? { year: v.c.year, seasons: v.c.seasons.map(s => ({ year: s.year, games: s.games, sacks: s.sacks, result: s.teamResult })) } : null; } catch { return null; } });
/** Back to the hub after a season: Continue, and the first option of whatever the offseason asks. */
async function toHub(P, tag) {
  for (let i = 0; i < 30; i += 1) {
    const at = await P.page.evaluate(() => {
      const bs = [...document.querySelectorAll('button')].filter(b => !b.disabled && b.offsetParent !== null);
      if (bs.some(b => /Play the \d+ season/.test(b.textContent ?? ''))) return 'hub';
      const pick = bs.find(b => /^(Continue|Next|Done|OK|Close|Skip|Let's Play)/.test((b.textContent ?? '').trim()))
        ?? document.querySelector('[data-career-decision-option="0"]') ?? [...document.querySelectorAll('[role="dialog"] button, [data-offer] button')].find(b => !b.disabled);
      if (pick) { const w = (pick.textContent ?? '').trim().slice(0, 40); pick.click(); return `pressed ${w}`; }
      return 'stuck';
    });
    if (at === 'hub') return true;
    if (at === 'stuck') { await shot(P, `${tag}-stuck-${i}`); const t = await P.page.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 600)); console.log(`${tag}: stuck on "${t}"`); return false; }
    await P.page.waitForTimeout(450);
  }
  return false;
}
async function viewerUp(P) {
  const ok = await P.page.waitForSelector('[data-season-centre] [data-kickoff], [data-centre-tile], [data-season-centre-failed]', { timeout: 25000 }).then(() => true).catch(() => false);
  await P.page.waitForTimeout(500);
  return ok;
}
const viewerFacts = page => page.evaluate(() => {
  const v = document.querySelector('[data-season-centre]');
  const text = (v?.innerText ?? '').replace(/\s+/g, ' ');
  const cut = [...(v?.querySelectorAll('*') ?? [])].filter(el => el.children.length === 0 && el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== 'visible' && (el.textContent ?? '').trim().length > 0).map(el => (el.textContent ?? '').trim().slice(0, 40)).slice(0, 6);
  return {
    up: !!v, text: text.slice(0, 700), cut,
    sideways: document.documentElement.scrollWidth > innerWidth + 1,
    tiles: [...document.querySelectorAll('[data-review-tile]')].map(el => `${el.dataset.reviewTile}=${el.firstElementChild?.textContent ?? ''}`),
    anims: document.getAnimations().filter(a => a.playState === 'running').length,
  };
});
async function watchThrough(P, tag, { help = false } = {}) {
  if (help) {
    await shot(P, `${tag}-help-first-open`);
    say(`${tag}.help`, await P.page.evaluate(() => (document.querySelector('[role="dialog"]')?.innerText ?? '').replace(/\s+/g, ' ').slice(0, 1800)));
    const closed = await P.page.evaluate(() => { const b = [...document.querySelectorAll('[role="dialog"] button')].find(x => /Got it|Close|OK|Let's/.test(x.textContent ?? '')) ?? [...document.querySelectorAll('[role="dialog"] button')].pop(); if (b) b.click(); return (b?.textContent ?? '').trim(); });
    say(`${tag}.helpClosedWith`, closed);
    await P.page.waitForTimeout(400);
  }
  await shot(P, `${tag}-viewer-kickoff`);
  say(`${tag}.kickoff`, await viewerFacts(P.page));
  await clickText(P.page, 'Kick off');
  await P.page.waitForTimeout(1800);
  await shot(P, `${tag}-viewer-live`);
  say(`${tag}.liveAnims`, (await viewerFacts(P.page)).anims);
  await clickText(P.page, 'Results');
  await P.page.waitForSelector('[data-full-time]', { timeout: 15000 }).catch(() => {});
  await P.page.waitForTimeout(400);
  await shot(P, `${tag}-viewer-final`);
  say(`${tag}.final`, await viewerFacts(P.page));
  for (let i = 0; i < 3; i += 1) { await clickText(P.page, '▶ Game'); await P.page.waitForTimeout(200); }
  await shot(P, `${tag}-viewer-game4`);
  await clickText(P.page, 'Sim the rest');
  await P.page.waitForSelector('[data-review]', { timeout: 10000 }).catch(() => {});
  await P.page.waitForTimeout(900);
  await shot(P, `${tag}-review`);
  say(`${tag}.review`, await viewerFacts(P.page));
}
const exitViewer = async P => { await P.page.evaluate(() => document.querySelector('[data-centre-exit]')?.click()); await P.page.waitForTimeout(600); };
const ONLY = (process.env.WALK_ONLY ?? '').split(',').filter(Boolean);
const run = async (name, fn) => { if (ONLY.length && !ONLY.includes(name)) return; try { await fn(); } catch (e) { say(`${name}.THREW`, String(e && e.stack ? e.stack : e).slice(0, 500)); } };

/* A: a save made BEFORE Round 1104 (main's engine: 17 game throwback seasons), about to play 2021, phone, first open of the viewer */
await run('A', async () => {
  const P = await open('A', SAVES.oldQB2021, { width: 390, height: 844, helpSeen: false });
  await P.page.waitForTimeout(2500); await closeHowTo(P.page); await shot(P, 'A-old2021-opens-on'); say('A.opensOn', await P.page.evaluate(() => (document.querySelector('main')?.innerText ?? document.body.innerText ?? '').replace(/s+/g, ' ').slice(0, 500))); say('A.toHubFirst', await toHub(P, 'A0')); await P.page.waitForTimeout(600);
  say('A.hub', await entryFacts(P.page)); await shot(P, 'A-old2021-hub-390'); await shot(P, 'A-old2021-hub-390-full', true);
  say('A.savedBefore', await saved(P.page));
  await P.page.evaluate(() => document.querySelector('[data-week-by-week]')?.click());
  say('A.viewerUp', await viewerUp(P));
  await watchThrough(P, 'A-old2021-390', { help: true });
  await exitViewer(P); await shot(P, 'A-old2021-curtain-390');
  say('A.curtain', await P.page.evaluate(() => (document.querySelector('[data-season-reveal]')?.innerText ?? '').replace(/\s+/g, ' ').slice(0, 500)));
  say('A.toHub', await toHub(P, 'A')); await P.page.waitForTimeout(700);
  say('A.hub2022', await entryFacts(P.page)); await shot(P, 'A-old2021-hub2022-390');
  say('A.savedAfter', await saved(P.page)); say('A.errors', P.errors);
  await P.ctx.close();
});

/* B: an old save whose last season is 2021 with sacks in tenths, about to play 2022 (held), phone, reduced motion */
await run('B', async () => {
  const P = await open('B', SAVES.oldLB2022, { width: 390, height: 844, reduced: true });
  await P.page.waitForTimeout(2500); await closeHowTo(P.page); say('B.toHubFirst', await toHub(P, 'B0')); await P.page.waitForTimeout(600);
  say('B.hub', await entryFacts(P.page)); await shot(P, 'B-old2022-hub-390-reduced');
  say('B.savedBefore', await saved(P.page));
  await P.page.evaluate(() => document.querySelector('[data-watch-last]')?.click());
  say('B.viewerUp', await viewerUp(P));
  await watchThrough(P, 'B-old2021again-390-reduced');
  await exitViewer(P); say('B.hubAfterWatch', await entryFacts(P.page));
  say('B.savedSame', JSON.stringify(await saved(P.page)) === JSON.stringify(facts['B.savedBefore']));
  await clickText(P.page, 'Play the'); await P.page.waitForTimeout(1500); await shot(P, 'B-old2022-played-curtain-390');
  say('B.curtain2022', await P.page.evaluate(() => (document.querySelector('[data-season-reveal]')?.innerText ?? document.body.innerText ?? '').replace(/\s+/g, ' ').slice(0, 500)));
  say('B.toHub', await toHub(P, 'B')); await P.page.waitForTimeout(700);
  say('B.hub2023', await entryFacts(P.page)); await shot(P, 'B-old2022-hub2023-390');
  say('B.savedAfter', await saved(P.page)); say('B.errors', P.errors);
  await P.ctx.close();
});

/* C: the branch's engine, a throwback rookie in 2020 (16 games, held), then 2021 (17, open), phone */
await run('C', async () => {
  const P = await open('C', SAVES.newWR2020, { width: 390, height: 844 });
  say('C.hubUp', await hubUp(P.page)); await P.page.waitForTimeout(800); await closeHowTo(P.page);
  say('C.hub2020', await entryFacts(P.page)); await shot(P, 'C-new2020-hub-390'); await shot(P, 'C-new2020-hub-390-full', true);
  await clickText(P.page, 'Play the'); await P.page.waitForTimeout(1800); await shot(P, 'C-new2020-curtain-390');
  say('C.curtain2020', await P.page.evaluate(() => (document.querySelector('[data-season-reveal]')?.innerText ?? document.body.innerText ?? '').replace(/\s+/g, ' ').slice(0, 500)));
  say('C.saved2020', await saved(P.page));
  say('C.toHub', await toHub(P, 'C')); await P.page.waitForTimeout(700);
  say('C.hub2021', await entryFacts(P.page)); await shot(P, 'C-new2021-hub-390');
  await P.page.evaluate(() => document.querySelector('[data-week-by-week]')?.click());
  say('C.viewerUp', await viewerUp(P));
  await watchThrough(P, 'C-new2021-390');
  await exitViewer(P); await shot(P, 'C-new2021-curtain-390');
  say('C.saved2021', await saved(P.page)); say('C.errors', P.errors);
  await P.ctx.close();
});

/* D: present day rookie quarterback, desktop: the how to play sheet, the hub, the viewer, its "?" */
await run('D', async () => {
  const P = await open('D', SAVES.newQBnow, { width: 1280, height: 900 });
  say('D.hubUp', await hubUp(P.page)); await P.page.waitForTimeout(900);
  await shot(P, 'D-now-howto-1280');
  say('D.howto', await P.page.evaluate(() => (document.querySelector('[role="dialog"]')?.innerText ?? '').replace(/\s+/g, ' ').slice(0, 2600)));
  await closeHowTo(P.page);
  say('D.hub', await entryFacts(P.page)); await shot(P, 'D-now-hub-1280');
  await P.page.evaluate(() => document.querySelector('[data-week-by-week]')?.click());
  say('D.viewerUp', await viewerUp(P));
  await watchThrough(P, 'D-now-1280');
  await P.page.evaluate(() => document.querySelector('[data-season-centre] button[aria-label="How the Season Center works"]')?.click());
  await P.page.waitForTimeout(500); await shot(P, 'D-now-viewer-help-1280');
  say('D.viewerHelp', await P.page.evaluate(() => [...document.querySelectorAll('[role="dialog"]')].map(d => (d.innerText ?? '').replace(/\s+/g, ' ')).join(' || ').slice(0, 2600)));
  say('D.errors', P.errors);
  await P.ctx.close();
});

/* E: the same, desktop, reduced motion: nothing may still be moving after the press */
await run('E', async () => {
  const P = await open('E', SAVES.newQBnow, { width: 1280, height: 900, reduced: true });
  say('E.hubUp', await hubUp(P.page)); await P.page.waitForTimeout(800); await closeHowTo(P.page);
  await P.page.evaluate(() => document.querySelector('[data-week-by-week]')?.click());
  say('E.viewerUp', await viewerUp(P));
  await clickText(P.page, 'Kick off'); await P.page.waitForTimeout(250);
  say('E.reduced', await viewerFacts(P.page)); await shot(P, 'E-now-viewer-reduced-1280');
  await clickText(P.page, 'Sim the rest'); await P.page.waitForSelector('[data-review]', { timeout: 10000 }).catch(() => {}); await P.page.waitForTimeout(250);
  say('E.reviewAnims', (await viewerFacts(P.page)).anims); await shot(P, 'E-now-review-reduced-1280');
  say('E.errors', P.errors);
  await P.ctx.close();
});

/* F: storage full on /nfl-my-career with the viewer open (Round 1144 on Round 1147's mount), phone */
await run('F', async () => {
  const P = await open('F', SAVES.newEDGE2021, { width: 390, height: 844 });
  say('F.hubUp', await hubUp(P.page)); await P.page.waitForTimeout(800); await closeHowTo(P.page);
  say('F.hub', await entryFacts(P.page));
  const before = await P.page.evaluate(() => localStorage.getItem('nfl-my-career-save-v1'));
  await P.page.evaluate(() => {
    const real = Storage.prototype.setItem;
    window.__realSet = real; window.__refuse = true;
    Storage.prototype.setItem = function setItem(k, v) { if (window.__refuse && this === window.localStorage) { throw new DOMException('The quota has been exceeded.', 'QuotaExceededError'); } return real.call(this, k, v); };
  });
  await P.page.evaluate(() => document.querySelector('[data-week-by-week]')?.click());
  say('F.viewerUp', await viewerUp(P)); await P.page.waitForTimeout(1500);
  await shot(P, 'F-full-viewer-390');
  const retry = () => P.page.evaluate(() => ({
    notice: !!document.querySelector('[data-us-career-save-error]'),
    toasts: [...document.querySelectorAll('[data-sonner-toast]')].map(t => (t.innerText ?? '').replace(/\s+/g, ' ').slice(0, 260)),
    hit: [...document.querySelectorAll('button')].filter(b => /^Retry( save)?$/.test((b.textContent ?? '').trim())).map(b => { const q = b.getBoundingClientRect(); const top = q.height > 0 ? document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2) : null; return { words: (b.textContent ?? '').trim(), box: [Math.round(q.left), Math.round(q.top), Math.round(q.width), Math.round(q.height)], onTop: !!top && (b === top || b.contains(top)) }; }),
    storageLine: [...document.querySelectorAll('[data-storage-notice], [role="status"], [role="alert"]')].map(el => (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 200)).filter(Boolean).slice(0, 5),
  }));
  say('F.refused', await retry());
  say('F.storeUntouched', (await P.page.evaluate(() => localStorage.getItem('nfl-my-career-save-v1'))) === before);
  await P.page.evaluate(() => { window.__refuse = false; });
  const pressed = await P.page.evaluate(() => { const b = [...document.querySelectorAll('button')].filter(x => /^Retry$/.test((x.textContent ?? '').trim())).pop() ?? [...document.querySelectorAll('button')].find(x => /^Retry save$/.test((x.textContent ?? '').trim())); if (!b) return null; const q = b.getBoundingClientRect(); return [q.left + q.width / 2, q.top + q.height / 2, (b.textContent ?? '').trim()]; });
  if (pressed) await P.page.mouse.click(pressed[0], pressed[1]);
  await P.page.waitForTimeout(1500);
  say('F.pressed', pressed); say('F.afterRetry', await retry()); say('F.savedAfterRetry', await saved(P.page)); say('F.viewerStillUp', await P.page.evaluate(() => !!document.querySelector('[data-season-centre]')));
  await shot(P, 'F-full-after-retry-390');
  await P.page.reload({ waitUntil: 'domcontentloaded' }); await P.page.waitForTimeout(3000); await shot(P, 'F-full-after-reload-390'); say('F.afterReloadReads', await P.page.evaluate(() => (document.querySelector('main')?.innerText ?? document.body.innerText ?? '').replace(/s+/g, ' ').slice(0, 600))); say('F.savedAfterReload', await saved(P.page));
  say('F.errors', P.errors);
  await P.ctx.close();
});

/* G: one disclaimer a page and one game count, on pages three of the pieces touch, phone */
await run('G', async () => {
  for (const route of ['/', '/nfl-my-career', '/whats-new', '/about', '/soccer-career']) {
    const P = await open('G', null, { width: 390, height: 844, route });
    await P.page.waitForTimeout(3500);
    const f = await P.page.evaluate(() => {
      const t = document.body.innerText || '';
      const count = (re) => (t.match(re) ?? []).length;
      const footers = document.querySelectorAll('footer').length;
      return { footers, fanProject: count(/independent fan project/gi), uefa: count(/UEFA/g), cookieChoices: count(/Cookie choices/g), counts: [...new Set(t.match(/\b\d{2,3}\+? (?:free )?games\b/gi) ?? [])], reportBug: count(/Report a bug/gi), sideways: document.documentElement.scrollWidth > innerWidth + 1 };
    });
    say(`G${route}`, f);
    if (route === '/' || route === '/whats-new') { await shot(P, `G-${route === '/' ? 'home' : 'whatsnew'}-390`); await P.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await P.page.waitForTimeout(600); await shot(P, `G-${route === '/' ? 'home' : 'whatsnew'}-footer-390`); }
    await P.ctx.close();
  }
  const llms = await fetch(`${BASE}/llms.txt`).then(r => r.text()).catch(() => '');
  say('G.llms', (llms.match(/\b\d{2,3}\+? games\b/g) ?? []).join(', '));
  const idx = await fetch(`${BASE}/`).then(r => r.text()).catch(() => '');
  say('G.indexHtmlCounts', [...new Set(idx.replace(/<script[\s\S]*?<\/script>/g, '').match(/\b\d{2,3}\+? (?:free )?games\b/gi) ?? [])]);
});

say('aborted supabase requests', aborted);
fs.writeFileSync(path.join(OUT, 'walk-facts.json'), JSON.stringify(facts, null, 1));
await browser.close();
console.log(`walkAP2: done, ${Object.keys(facts).length} facts, ${Object.keys(facts).filter(k => k.endsWith('THREW')).length} scenarios threw`);
process.exit(0);
