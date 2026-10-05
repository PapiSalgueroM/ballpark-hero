/**
 * Round 958: a broken save never traps a long game.
 *
 * WHAT IT PROVES. For every long game listed in src/data/continueSaves.ts
 * (21 when this was written), a browser holding a structurally broken save
 * for that game reaches a usable start screen within two clicks, and the
 * broken save is kept aside under a backup key rather than deleted.
 *
 * "Structurally broken" is the SIM-04 class from
 * docs/audits/SIMULATION-AUDIT-2026-10-01.md: a save that parses and passes
 * the one truthy check most restores make (the name field the Continue card
 * reads is there), while everything the game draws from is missing or the
 * wrong type. Two shapes per route:
 *   shell      the fields continueSaves.ts names hold plausible values (a
 *              name, a small count, ended false) and nothing else exists
 *   wrongtype  the same fields hold an empty object where a string or a
 *              number belongs
 *
 * What counts. The page is loaded with the save in place. If the error page
 * ("This page broke") shows, the harness clicks "Start a fresh game" (click
 * one) and requires the raw save, byte for byte, under a key starting with
 * the game's own key plus ".broken-", and the game's page, reloaded, must show
 * the card that offers that save back (src/components/BrokenSaveRestore.tsx),
 * because the crash may have been a code bug rather than the save. If a
 * dialog then blocks the screen, it closes it (click two). Usable means: no
 * error page, no open dialog, and at least one visible, enabled button outside
 * the header, footer, nav and the restore card. A game that copes with the
 * save itself (discards it, or draws without throwing) also passes, and is
 * counted separately, so the summary says how many routes really needed the
 * button.
 *
 * WHAT "USABLE" DOES NOT PROVE. It is a live button, not a start screen.
 * Several games that cope draw their own dashboard from the broken save
 * rather than a creator (Stadium Tycoon, Wonderkid Factory and Idle Arena on
 * the merged build), and the walk does not play them. A later throw there
 * lands on the boundary, which offers the fresh start because the save
 * exists, so nobody is trapped; but this harness does not show that those
 * dashboards work.
 *
 * THE ROW COUNT. The routes are read one line per row from
 * continueSaves.ts. Every path: inside CONTINUE_SAVES must be a row that was
 * read, so a row written over several lines fails rather than going unwalked
 * while the floor of 21 still holds. Control CORRUPT_CONTROL=multiline
 * inserts such a row in memory (before the Idle Arena row, asserted present)
 * and must fail that check; it needs no build.
 *
 * NEGATIVE CONTROL. CORRUPT_CONTROL=nobutton removes the fresh start button
 * from every page as it appears. Every route that needed the button must
 * then fail, so the control fires only when at least one did; the harness
 * asserts the attribute it removes exists in the boundary's code and in the
 * built bundle first, so a renamed button cannot make the control a no-op.
 * CORRUPT_CONTROL=norestore hides the restore card the same way (its
 * attribute asserted in BrokenSaveRestore.tsx and in the bundle), and every
 * route that needed the button must then fail for want of a way back.
 *
 * NETWORK. Everything that is not this machine is aborted, the database host
 * included: this harness never reaches production.
 *
 * RUN. It needs a build: vite build, then
 *   CORRUPT_DIST=<dist folder> node scripts/playCorruptSaves.mjs
 * (default dist/). It serves the folder itself through
 * scripts/lib/hostLikeServer.mjs on a free port. ONLY=/fight-gym,/cfb-dynasty
 * narrows the routes (prefix MSYS_NO_PATHCONV=1 in Git Bash), and
 * CORRUPT_VARIANTS=shell narrows the shapes.
 *
 * MEASURED (Round 958, local vite build of the round's branch, chromium,
 * 390 by 844, both shapes, 42 broken saves over 21 games):
 *   17 reached the error page and needed the button: the four US My
 *      Careers, CFB and CBB Dynasty, Fight Promoter and Fight Gym in both
 *      shapes, and Fight Career in the wrongtype shape; every one reached its
 *      start screen in one click with the raw save kept aside
 *   23 were coped with by the game itself (Soccer Career and the NFL, NHL
 *      and MLB front offices offer their own delete; Club Manager, Stadium
 *      Tycoon, Wonderkid Factory, Rebuild, NBA Front Office, Aussie Rules
 *      Manager, Idle Arena and Fight Career's shell shape start over or draw)
 *    2 not judged offline (Hall of Champions, see OFFLINE_ONLY)
 *    0 trapped.
 * On the branch before it merged main at 665898cf the split was 20 needed,
 * 20 coped: MLB Front Office and Fight Career's shell shape then threw too,
 * and other rounds have since given them their own recovery.
 * Control nobutton: every route that needed the button trapped (17 of 17,
 * and 20 of 20 before the merge).
 * Not a statistical harness: every count above is deterministic for a given
 * build, so there is no band; any trapped route fails.
 */
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pw from './lib/playwrightLoader.mjs';

const { chromium } = pw;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.resolve(process.env.CORRUPT_DIST || path.join(ROOT, 'dist'));
const CONTROL = process.env.CORRUPT_CONTROL || '';
if (CONTROL && !['nobutton', 'norestore', 'multiline'].includes(CONTROL)) { console.error(`CORRUPT_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(1); }
const VARIANTS = (process.env.CORRUPT_VARIANTS || 'shell,wrongtype').split(',').map(s => s.trim()).filter(Boolean);
for (const v of VARIANTS) if (!['shell', 'wrongtype'].includes(v)) { console.error(`unknown variant ${v}`); process.exit(1); }
const MARK = 'data-dukb-fresh-start';
const FRESH_LABEL = 'Start a fresh game';
/* The card on the game's page that offers the set-aside save back. */
const RESTORE_MARK = 'data-dukb-set-aside';
const RESTORE_LABEL = 'Put my old save back';
const BROKE = 'This page broke';
const NAME = 'Broken Save Test';
/* Routes that load their game data from the database before they read the
   save, so with the database aborted they stop at their own retry screen and
   this walk cannot judge them. Each is named with the reason; a new route that
   stops the same way fails until it is either judged or excused here. The
   vitest file src/test/routeErrorRecovery.test.tsx still covers the button on
   these routes. */
const OFFLINE_ONLY = {
  '/hall-of-champions': 'the championship archive comes from the database before the museum save is read',
};

/* Comments and strings are different things; a guard reads code, not prose. */
const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/* ------------------------------------------------------------------ */
/* The routes come from the list itself, so a new long game is walked the day
   it is added. Each row is one line of CONTINUE_SAVES. */
let listSrc = stripComments(fs.readFileSync(path.join(ROOT, 'src/data/continueSaves.ts'), 'utf8'));
/* Control multiline: a row in the prettier shape, over several lines, which
   the one line pattern below cannot read. The row count check must catch it. */
if (CONTROL === 'multiline') {
  const anchor = '  { path: \'/idle-arena\'';
  if (!listSrc.includes(anchor)) { console.error('playCorruptSaves control multiline: the anchor row is gone from continueSaves.ts, so the control would change nothing'); process.exit(1); }
  listSrc = listSrc.replace(anchor, "  {\n    path: '/control-multiline',\n    saveKey: 'control-multiline-v1',\n  },\n" + anchor);
}
const arr = s => (s ? [...s.matchAll(/'([^']*)'/g)].map(m => m[1]) : null);
const ENTRIES = [];
for (const line of listSrc.split('\n')) {
  const m = /^\s*\{ path: '([^']+)', saveKey: '([^']+)'/.exec(line);
  if (!m) continue;
  ENTRIES.push({
    path: m[1],
    saveKey: m[2],
    name: arr(/\bname: \[([^\]]*)\]/.exec(line)?.[1]),
    count: arr(/\bcount: \{ at: \[([^\]]*)\]/.exec(line)?.[1]),
    ended: arr(/\bended: \{ at: \[([^\]]*)\]/.exec(line)?.[1]),
  });
}
if (ENTRIES.length < 21) { console.error(`read ${ENTRIES.length} long games from continueSaves.ts, expected at least 21; the row pattern no longer matches`); process.exit(1); }
/* The floor above only catches rows lost. A new row written over several
   lines would be skipped by the one line pattern while the floor still held,
   so every path: inside the CONTINUE_SAVES array must be a row that was read. */
const listStart = listSrc.indexOf('CONTINUE_SAVES');
const listBody = listStart < 0 ? '' : listSrc.slice(listSrc.indexOf('[', listSrc.indexOf('=', listStart)), listSrc.indexOf('];', listStart));
const pathRows = (listBody.match(/\bpath:\s*'/g) || []).length;
if (pathRows !== ENTRIES.length) {
  const msg = `continueSaves.ts has ${pathRows} path: rows in CONTINUE_SAVES but the row pattern read ${ENTRIES.length}; a row written over several lines is not walked, so write it on one line or teach this parser its shape`;
  if (CONTROL === 'multiline') { console.log(`playCorruptSaves control multiline: FIRED. ${msg}`); process.exit(0); }
  console.error(msg);
  process.exit(1);
}
if (CONTROL === 'multiline') { console.error(`playCorruptSaves control multiline: DID NOT FIRE. ${pathRows} path: rows, ${ENTRIES.length} read`); process.exit(1); }
const ONLY = process.env.ONLY ? process.env.ONLY.split(',').map(s => s.trim()) : null;
const routes = ONLY ? ENTRIES.filter(e => ONLY.includes(e.path)) : ENTRIES;
if (routes.length === 0) { console.error('no routes matched ONLY'); process.exit(1); }

/** Sets one value at a path, making plain objects (or arrays for index steps) on the way. */
function put(root, at, value) {
  let cur = root;
  at.forEach((step, i) => {
    if (i === at.length - 1) { cur[step] = value; return; }
    if (cur[step] === undefined || cur[step] === null || typeof cur[step] !== 'object') cur[step] = /^\d+$/.test(at[i + 1]) ? [] : {};
    cur = cur[step];
  });
}

/** The broken save text for one route and one shape. */
function brokenSave(e, variant) {
  const save = {};
  const wrong = variant === 'wrongtype';
  if (e.name) put(save, e.name, wrong ? {} : NAME);
  if (e.count) put(save, e.count, wrong ? {} : 3);
  if (e.ended) put(save, e.ended, wrong ? {} : false);
  if (Object.keys(save).length === 0) save.broken = wrong ? {} : true;
  return JSON.stringify(save);
}

/* ------------------------------------------------------------------ */
/* The build has to be the tree under test, and the control has to have
   something to remove: the attribute in the boundary's code and in the bundle. */
const boundaryCode = stripComments(fs.readFileSync(path.join(ROOT, 'src/components/RouteErrorBoundary.tsx'), 'utf8'));
if (!boundaryCode.includes(MARK) || !boundaryCode.includes(FRESH_LABEL)) {
  console.error(`src/components/RouteErrorBoundary.tsx carries no ${MARK} button labelled "${FRESH_LABEL}", so there is nothing to walk and the control would remove nothing`);
  process.exit(1);
}
const restoreCode = stripComments(fs.readFileSync(path.join(ROOT, 'src/components/BrokenSaveRestore.tsx'), 'utf8'));
if (!restoreCode.includes(RESTORE_MARK) || !restoreCode.includes(RESTORE_LABEL)) {
  console.error(`src/components/BrokenSaveRestore.tsx carries no ${RESTORE_MARK} card with "${RESTORE_LABEL}", so the way back cannot be checked and the norestore control would remove nothing`);
  process.exit(1);
}
const assetsDir = path.join(DIST, 'assets');
if (!fs.existsSync(path.join(DIST, 'index.html')) || !fs.existsSync(assetsDir)) { console.error(`no build at ${DIST}; run vite build first`); process.exit(1); }
const bundleHasButton = fs.readdirSync(assetsDir).filter(f => f.endsWith('.js'))
  .some(f => { const t = fs.readFileSync(path.join(assetsDir, f), 'utf8'); return t.includes(MARK) && t.includes(FRESH_LABEL); });
if (!bundleHasButton) { console.error(`the build at ${DIST} has no fresh start button in any chunk; it predates the boundary, rebuild it`); process.exit(1); }
const bundleHasRestore = fs.readdirSync(assetsDir).filter(f => f.endsWith('.js'))
  .some(f => { const t = fs.readFileSync(path.join(assetsDir, f), 'utf8'); return t.includes(RESTORE_MARK) && t.includes(RESTORE_LABEL); });
if (!bundleHasRestore) { console.error(`the build at ${DIST} has no restore card in any chunk; it predates the way back, rebuild it`); process.exit(1); }

const freePort = () => new Promise((resolve, reject) => {
  const s = net.createServer();
  s.once('error', reject);
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
});
const PORT = await freePort();
const BASE = `http://127.0.0.1:${PORT}`;
const server = spawn(process.execPath, [path.join(ROOT, 'scripts/lib/hostLikeServer.mjs'), DIST, String(PORT)], { stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('the host-like server did not start within 20 s')), 20000);
  server.stdout.on('data', d => { if (String(d).includes('host-like server')) { clearTimeout(t); resolve(); } });
  server.once('exit', code => { clearTimeout(t); reject(new Error(`the host-like server exited with ${code}`)); });
});
const isLocal = u => u.startsWith(BASE) || u.startsWith('data:') || u.startsWith('blob:');

/* ------------------------------------------------------------------ */
/* What the screen is right now. Runs in the page. */
function readScreen({ broke, name, restoreMark }) {
  const visible = el => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const s = getComputedStyle(el);
    return s.display !== 'none' && s.visibility !== 'hidden';
  };
  const text = document.body?.innerText ?? '';
  const dialogs = [...document.querySelectorAll('[role="dialog"],[role="alertdialog"]')].filter(visible);
  const buttons = [...document.querySelectorAll('#root button')].filter(b => {
    const t = (b.textContent || '').trim();
    /* The restore card's buttons are ours, not the game's, so they never count
       toward a usable screen. */
    return visible(b) && !b.disabled && t && t !== '?' && !b.closest(`header,footer,nav,[role="dialog"],[role="alertdialog"],[${restoreMark}]`);
  });
  const card = document.querySelector(`[${restoreMark}]`);
  return {
    restoreOffered: !!card && visible(card),
    broke: text.includes(broke),
    dialog: dialogs.length > 0,
    buttons: buttons.length,
    sample: buttons.slice(0, 3).map(b => (b.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 24)),
    drewName: text.includes(name),
    /* The game's own data load failed (the database is aborted here) and the
       only thing on offer is its retry: the save was never even read. */
    offline: /couldn'?t load|could not load/i.test(text) && buttons.length > 0
      && buttons.every(b => /^try again$/i.test((b.textContent || '').trim())),
  };
}

/* Waits for the page to draw something (or break), then for the restore
   effects that run after mount, then reads it. */
async function settle(page) {
  await page.waitForFunction(broke => {
    const t = document.body?.innerText ?? '';
    return t.includes(broke) || (document.querySelectorAll('#root button').length > 0 && t.trim().length > 80);
  }, BROKE, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1500);
  return page.evaluate(readScreen, { broke: BROKE, name: NAME, restoreMark: RESTORE_MARK });
}

/* Every backup value this browser holds for one save key. */
const backupsOf = (page, saveKey) => page.evaluate(prefix => {
  const out = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const k = localStorage.key(i);
    if (k && k.startsWith(prefix)) out.push(localStorage.getItem(k));
  }
  return out;
}, `${saveKey}.broken-`);

async function walk(browser, e, variant) {
  const raw = brokenSave(e, variant);
  const r = { route: e.path, variant, clicks: 0, outcome: '', ok: false, why: '', sample: [] };
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  try {
    await ctx.route('**/*', req => (isLocal(req.request().url()) ? req.continue() : req.abort()));
    if (CONTROL === 'nobutton' || CONTROL === 'norestore') {
      await ctx.addInitScript(mark => {
        const add = () => {
          const s = document.createElement('style');
          s.textContent = `[${mark}]{display:none !important}`;
          document.documentElement.appendChild(s);
        };
        if (document.documentElement) add(); else document.addEventListener('DOMContentLoaded', add);
      }, CONTROL === 'nobutton' ? MARK : RESTORE_MARK);
    }
    const page = await ctx.newPage();
    /* Seed once, on a file that is not the game, so the reload after a fresh
       start does not put the broken save straight back. */
    await page.goto(`${BASE}/robots.txt`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.evaluate(([k, v]) => localStorage.setItem(k, v), [e.saveKey, raw]);
    await page.goto(`${BASE}${e.path}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    let s = await settle(page);
    if (s.broke) {
      r.outcome = 'needed the button';
      const btn = page.locator(`[${MARK}]`);
      if (!(await btn.isVisible().catch(() => false))) { r.why = 'the error page showed and offered no fresh start'; return r; }
      r.clicks += 1;
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 45000 }),
        btn.evaluate(b => b.click()),
      ]);
      const kept = await backupsOf(page, e.saveKey);
      if (!kept.includes(raw)) { r.why = `the broken save was not kept aside byte for byte (${kept.length} backup(s) found)`; return r; }
      s = await settle(page);
      /* The way back: the crash may have been a code bug rather than the save,
         so the game's page must offer the set-aside save back. */
      if (!s.restoreOffered) { r.why = 'the game\'s page offered no way to put the set-aside save back'; return r; }
    } else {
      r.outcome = s.drewName ? 'drew the save itself' : 'coped without the button';
    }
    if (s.dialog) {
      r.clicks += 1;
      const closed = await page.evaluate(() => {
        const d = [...document.querySelectorAll('[role="dialog"],[role="alertdialog"]')].find(el => el.getBoundingClientRect().width > 0);
        const b = d && [...d.querySelectorAll('button')].find(x => /close|got it|let'?s|play|start|ok|continue/i.test(`${x.getAttribute('aria-label') || ''} ${x.textContent || ''}`));
        if (b) { b.click(); return true; }
        return false;
      });
      if (!closed) await page.keyboard.press('Escape');
      s = await settle(page);
    }
    r.sample = s.sample;
    if (!s.broke && s.offline) {
      r.outcome = 'not judged offline';
      if (OFFLINE_ONLY[e.path]) r.ok = true;
      else r.why = 'its data never loaded with the database aborted, so the save was never read, and the route is not excused in OFFLINE_ONLY';
      return r;
    }
    if (s.broke) r.why = 'still on the error page';
    else if (s.dialog) r.why = 'a dialog still covers the screen';
    else if (s.buttons < 1) r.why = 'no usable button on the screen';
    else if (r.clicks > 2) r.why = `took ${r.clicks} clicks`;
    else r.ok = true;
    return r;
  } catch (err) {
    r.why = `walk threw: ${String(err?.message || err).split('\n')[0]}`;
    return r;
  } finally {
    await ctx.close().catch(() => {});
  }
}

/* ------------------------------------------------------------------ */
const results = [];
const browser = await chromium.launch();
try {
  if (CONTROL) console.log(`NEGATIVE CONTROL ON (${CONTROL}): the ${CONTROL === 'nobutton' ? 'fresh start button' : 'restore card'} is hidden on every page, every route that needs the button must fail`);
  for (const e of routes) {
    for (const variant of VARIANTS) {
      const r = await walk(browser, e, variant);
      results.push(r);
      const how = `${r.outcome}, ${r.clicks} click(s)${r.sample.length ? `, buttons: ${r.sample.join(' | ')}` : ''}`;
      const tag = r.outcome === 'not judged offline' ? 'SKIP' : 'PASS';
      console.log(r.ok ? `  ${tag}  ${r.route} ${r.variant}: ${how}` : `  FAIL  ${r.route} ${r.variant}: ${r.why} (${r.outcome || 'no outcome'})`);
    }
  }
} finally {
  await browser.close().catch(() => {});
  server.kill();
}

const failed = results.filter(r => !r.ok);
const needed = results.filter(r => r.outcome === 'needed the button');
const coped = results.filter(r => r.outcome === 'coped without the button');
const drew = results.filter(r => r.outcome === 'drew the save itself');
const unjudged = results.filter(r => r.outcome === 'not judged offline');
/* An excuse is a ratchet: a route that can be judged now must leave the list. */
for (const p of Object.keys(OFFLINE_ONLY)) {
  const walked = results.filter(r => r.route === p);
  if (walked.length && walked.every(r => r.outcome !== 'not judged offline')) {
    failed.push({ route: p, variant: 'all', why: 'excused in OFFLINE_ONLY but judged fine offline now, so remove the excuse' });
    console.log(`  FAIL  ${p}: excused in OFFLINE_ONLY but judged offline now, remove the excuse`);
  }
}
for (const r of unjudged.filter(x => x.ok)) console.log(`  note  ${r.route} ${r.variant} not judged offline: ${OFFLINE_ONLY[r.route]}`);
console.log('');
console.log(`${results.length} broken saves over ${routes.length} long games: ${needed.length} reached the error page and needed the button, ${coped.length} were coped with by the game, ${drew.length} drew the broken save without throwing, ${unjudged.length} could not be judged offline, ${failed.length} trapped`);

if (CONTROL) {
  if (needed.length === 0) { console.error(`playCorruptSaves control: CANNOT FIRE. No broken save reached the error page, so hiding the ${CONTROL === 'nobutton' ? 'button' : 'restore card'} changes nothing here.`); process.exit(1); }
  const stillPassed = needed.filter(r => r.ok);
  if (failed.length > 0 && stillPassed.length === 0) { console.log(`playCorruptSaves control: FIRED. With the ${CONTROL === 'nobutton' ? 'button' : 'restore card'} hidden, ${failed.length} of ${needed.length} routes that need it are trapped.`); process.exit(0); }
  console.error(`playCorruptSaves control: DID NOT FIRE. ${stillPassed.length} route(s) that reached the error page still passed with the ${CONTROL === 'nobutton' ? 'button' : 'restore card'} hidden.`);
  process.exit(1);
}
if (failed.length > 0) {
  console.error(`playCorruptSaves: ${failed.length} broken save(s) trap the player: ${failed.map(r => `${r.route} ${r.variant}`).join(', ')}`);
  process.exit(1);
}
console.log('playCorruptSaves: green. No broken save traps a long game.');
