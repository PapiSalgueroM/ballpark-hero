// ATG probe (never committed; sent to the runner as .rc/x/atgProbe.mjs).
// PROBE_PARTS=bar,help,reveal  PROBE_BASE=http://localhost:4173  PROBE_ROOT=.  PROBE_LABEL=head  PROBE_CAREERS=20
import pw from '../../scripts/lib/playwrightLoader.mjs';
import { build } from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const { chromium } = pw;
const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.PROBE_BASE || 'http://localhost:4173';
const ROOT = path.resolve(process.env.PROBE_ROOT || '.');
let LABEL = process.env.PROBE_LABEL || 'head';
const PARTS = (process.env.PROBE_PARTS || 'bar,help,reveal').split(',');
const OUT = process.env.RC_OUT || path.join(os.tmpdir(), 'atg-out');
fs.mkdirSync(OUT, { recursive: true });
const CONSENT = `try { localStorage.setItem('cookie-consent', 'essential'); } catch (e) {}`;
let NOFONTS = false;
let FONT = 'site font';

async function buildSave() {
  const entry = path.join(os.tmpdir(), `atgSeed-${LABEL}.mjs`);
  const bundle = path.join(os.tmpdir(), `atgSeed-${LABEL}.bundle.mjs`);
  fs.writeFileSync(entry, `globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const engine = await import('${ROOT.replaceAll('\\', '/')}/src/lib/soccerCareerEngine.ts');
export { engine };
`);
  await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: bundle, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
  const { engine } = await import(pathToFileURL(bundle).href);
  let save = engine.initCareer('Playtest', 'England', 'ST', '2020s',
    { pace: 74, shooting: 76, passing: 72, dribbling: 75, defending: 45, physical: 68, reflexes: 30 },
    72, 2020, engine.FALLBACK_CLUBS, null, 88);
  save = engine.advanceYouthYear(save, engine.FALLBACK_CLUBS);
  save = engine.acceptOffer(save, save.pendingOffers[0]);
  if (!save || save.phase !== 'playing') throw new Error(`save is not in the playing phase (${save && save.phase})`);
  return save;
}

async function openCareer(browser, save, width, extra = '') {
  const ctx = await browser.newContext({ viewport: { width, height: 844 } });
  await ctx.addInitScript(CONSENT);
  await ctx.addInitScript(`try { localStorage.setItem('soccerCareerSave', ${JSON.stringify(JSON.stringify(save))}); ${extra} } catch (e) {}`);
  const page = await ctx.newPage();
  await page.route(/supabase\.co/, r => r.abort());
  /* The squad walk's own page has no web font: with the font hosts blocked the real page wraps the way it does. */
  if (NOFONTS) await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await page.goto(BASE + '/soccer-career', { waitUntil: 'domcontentloaded', timeout: 40000 });
  await page.waitForTimeout(2200);
  for (const name of [/^essential only$/i, /^accept all$/i]) {
    await page.getByRole('button', { name }).first().click({ timeout: 900 }).catch(() => {});
  }
  await page.waitForTimeout(700);
  return { ctx, page };
}

/* ── part one: every button that mentions next season, and the bar 3,000px down ── */
async function barPart(browser, save) {
  for (const width of [430, 390]) {
    const { ctx, page } = await openCareer(browser, save, width);
    const hits = await page.evaluate(() => [...document.querySelectorAll('button')]
      .filter(b => /next (year|season)/i.test(b.innerText || ''))
      .map(b => {
        const r = b.getBoundingClientRect();
        return {
          text: (b.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 70),
          top: Math.round(r.top + window.scrollY), h: Math.round(r.height),
          inBar: !!b.closest('[data-career-action-bar]'),
          marks: b.getAttributeNames().filter(n => n.startsWith('data-')).join(' '),
        };
      }));
    console.log(`[bar ${LABEL} @${width}] buttons whose words contain "next season" or "next year": ${hits.length}`);
    for (const h of hits) console.log(`    top ${h.top} height ${h.h} inBar ${h.inBar} marks "${h.marks}" text "${h.text}"`);
    await page.evaluate(() => window.scrollTo(0, 3000));
    await page.waitForTimeout(500);
    const bar = await page.evaluate(() => {
      const el = document.querySelector('[data-career-action-bar]');
      if (!el) return { err: 'no [data-career-action-bar] on the page' };
      const r = el.getBoundingClientRect();
      const next = [...el.querySelectorAll('button')].find(b => /^\s*next (year|season)\s*$/i.test(b.innerText || ''));
      const nr = next ? next.getBoundingClientRect() : null;
      const hit = nr ? document.elementFromPoint(Math.round(nr.left + nr.width / 2), Math.round(nr.top + nr.height / 2)) : null;
      return {
        mode: el.getAttribute('data-career-action-bar'), position: getComputedStyle(el).position,
        top: Math.round(r.top), bottom: Math.round(r.bottom), scrollY: Math.round(window.scrollY), vh: window.innerHeight,
        nextTop: nr ? Math.round(nr.top) : null, nextBottom: nr ? Math.round(nr.bottom) : null,
        reachable: !!(hit && next && (hit === next || next.contains(hit))),
        docH: document.documentElement.scrollHeight,
      };
    });
    console.log(`[bar ${LABEL} @${width}] 3000px down: ${JSON.stringify(bar)}`);
    await page.screenshot({ path: path.join(OUT, `bar-${LABEL}-${width}-y3000.png`) });
    await ctx.close();
  }
}

/* ── part two: the squad help at 390 by 844, line by line, and candidate sentences ── */
const HELP_MEASURE = `(() => {
  const sheet = document.querySelector('[data-squad-sheet]');
  const panel = sheet && sheet.querySelector('[role="dialog"]');
  const body = panel && panel.querySelector('[data-squad-body]');
  const ol = panel && panel.querySelector('[data-squad-help]');
  if (!ol) return { err: 'no help list on screen' };
  const lh = parseFloat(getComputedStyle(ol).lineHeight);
  const lis = [...ol.children].map(li => {
    const h = li.getBoundingClientRect().height;
    return { chars: li.textContent.length, h: Math.round(h * 10) / 10, lines: Math.round(h / lh) };
  });
  return {
    panelH: Math.round(panel.getBoundingClientRect().height), maxH: window.innerHeight - 24,
    bodyScroll: body.scrollHeight, bodyClient: body.clientHeight, over: body.scrollHeight - body.clientHeight,
    lineHeight: lh, fontSize: getComputedStyle(ol).fontSize, textWidth: Math.round(ol.children[0].getBoundingClientRect().width),
    inter: document.fonts.check('12px Inter'), family: getComputedStyle(ol).fontFamily.slice(0, 40),
    lines: lis.reduce((n, l) => n + l.lines, 0), lis,
  };
})()`;

async function helpPart(browser, save) {
  const { ctx, page } = await openCareer(browser, save, 390, `localStorage.setItem('soccerSquad:help', '1');`);
  const tile = page.locator('[data-squad-tile]');
  if (!(await tile.count())) { console.log(`[help ${LABEL}] no squad tile on this save`); await ctx.close(); return; }
  await tile.first().click();
  await page.waitForSelector('[data-squad-sheet]', { timeout: 15000 });
  await page.click('[data-squad-sheet] button[aria-label="How the squad works"]');
  await page.waitForSelector('[data-squad-sheet] [data-squad-screen="help"]', { timeout: 8000 });
  await page.waitForTimeout(900);
  const served = await page.evaluate(HELP_MEASURE);
  console.log(`[help ${LABEL}] as served at 390 by 844: ${JSON.stringify(served)}`);
  await page.screenshot({ path: path.join(OUT, `help-${LABEL}-390-served.png`) });
  const file = path.join(HERE, 'helpVariants.json');
  if (fs.existsSync(file)) {
    const { singles = {}, sets = {} } = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const [name, text] of Object.entries(singles)) {
      const lines = await page.evaluate(([t]) => {
        const ol = document.querySelector('[data-squad-sheet] [data-squad-help]');
        const li = ol.children[0];
        const keep = li.textContent;
        li.textContent = t;
        const lh = parseFloat(getComputedStyle(ol).lineHeight);
        const n = Math.round(li.getBoundingClientRect().height / lh);
        li.textContent = keep;
        return n;
      }, [text]);
      console.log(`[help ${LABEL}] single ${name}: ${text.length} chars, ${lines} lines`);
    }
    for (const [name, rules] of Object.entries(sets)) {
      const keep = await page.evaluate(([rs]) => {
        const ol = document.querySelector('[data-squad-sheet] [data-squad-help]');
        const before = [...ol.children].map(li => li.textContent);
        while (ol.children.length > rs.length) ol.removeChild(ol.lastChild);
        while (ol.children.length < rs.length) ol.appendChild(ol.children[0].cloneNode(true));
        rs.forEach((t, i) => { ol.children[i].textContent = t; });
        return before;
      }, [rules]);
      await page.waitForTimeout(200);
      const m = { out: await page.evaluate(HELP_MEASURE), keep };
      console.log(`[help ${LABEL}] set ${name}: lines ${m.out.lines} per rule ${m.out.lis.map(l => l.lines).join(',')} panel ${m.out.panelH} of ${m.out.maxH} over ${m.out.over} spare ${m.out.maxH - m.out.panelH}`);
      await page.screenshot({ path: path.join(OUT, `help-${LABEL}-390-set-${name}.png`) });
      await page.evaluate(([keep]) => {
        const ol = document.querySelector('[data-squad-sheet] [data-squad-help]');
        while (ol.children.length > keep.length) ol.removeChild(ol.lastChild);
        while (ol.children.length < keep.length) ol.appendChild(ol.children[0].cloneNode(true));
        keep.forEach((t, i) => { ol.children[i].textContent = t; });
      }, [m.keep]);
    }
  }
  await ctx.close();
}
/* ── part three: rookie NFL careers through three curtains; what is behind each, and does the hub come back ── */
async function screenOf(page) {
  if (await page.locator('[data-season-reveal]').count()) return 'curtain';
  if (await page.locator('[data-rivalry-event]').count()) return 'beat';
  if (await page.locator('[data-rivalry-choice] [data-rivalry-outcome]').count()) return 'choice-outcome';
  if (await page.locator('[data-rivalry-choice]').count()) return 'choice';
  if (await page.locator('[data-decision-continue]').count()) return 'decision-outcome';
  if (await page.locator('[data-career-decision-option]').count()) return 'decision';
  if (await page.locator('button:has-text("Play the")').count()) return 'hub';
  if (await page.locator('div.grid.gap-1\\.5 > button').count()) return 'grid';
  return 'unknown';
}
async function dump(page) {
  return page.evaluate(() => ({
    marks: [...new Set([...document.querySelectorAll('main *')].flatMap(el => el.getAttributeNames().filter(n => n.startsWith('data-'))))].slice(0, 30).join(' '),
    words: (document.querySelector('main')?.innerText ?? document.body.innerText).replace(/\s+/g, ' ').slice(0, 300),
  }));
}
async function revealPart(browser) {
  const N = Number(process.env.PROBE_CAREERS || 20);
  const first = {};
  const tally = { seasons: 0, hubBack: 0, stuck: 0, choiceAsked: 0, choiceAnswered: 0, beats: 0, pageErrors: 0 };
  const stuck = [];
  for (let i = 0; i < N; i += 1) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    page.on('pageerror', () => { tally.pageErrors += 1; });
    await page.route(/supabase\.co/, r => r.abort());
    await page.addInitScript(() => localStorage.setItem('rules-gate-seen:/nfl-my-career', '1'));
    await page.goto(`${BASE}/nfl-my-career`, { waitUntil: 'domcontentloaded', timeout: 40000 });
    await page.waitForTimeout(1500);
    await page.locator('input[placeholder*="name"]').first().fill('Curtain Probe');
    await page.locator('button:has-text("Enter the draft")').click();
    await page.waitForTimeout(700);
    for (let season = 1; season <= 3; season += 1) {
      if (await screenOf(page) !== 'hub') { stuck.push({ i, season, at: 'before Play', ...(await dump(page)) }); tally.stuck += 1; break; }
      await page.locator('button:has-text("Play the")').first().click();
      await page.waitForTimeout(700);
      if (await screenOf(page) !== 'curtain') { stuck.push({ i, season, at: 'no curtain', kind: await screenOf(page), ...(await dump(page)) }); tally.stuck += 1; break; }
      await page.locator('[data-season-reveal] button:has-text("Continue")').click();
      await page.waitForTimeout(600);
      tally.seasons += 1;
      const kind = await screenOf(page);
      first[kind] = (first[kind] || 0) + 1;
      let back = false;
      for (let step = 0; step < 16; step += 1) {
        const k = await screenOf(page);
        if (k === 'hub') { back = true; break; }
        if (k === 'beat') { tally.beats += 1; await page.locator('[data-rivalry-event] button:has-text("Continue")').click(); }
        else if (k === 'choice') { tally.choiceAsked += 1; await page.locator('[data-rivalry-choice] [data-rivalry-option]').first().click(); }
        else if (k === 'choice-outcome') { tally.choiceAnswered += 1; await page.locator('[data-rivalry-choice] button:has-text("Continue")').click(); }
        else if (k === 'decision-outcome') await page.locator('[data-decision-continue]').first().click();
        else if (k === 'decision') await page.locator('[data-career-decision-option]').first().click();
        else if (k === 'grid') await page.locator('div.grid.gap-1\\.5 > button').first().click();
        else break;
        await page.waitForTimeout(500);
      }
      if (back) tally.hubBack += 1;
      else { stuck.push({ i, season, at: 'after the curtain', kind: await screenOf(page), ...(await dump(page)) }); tally.stuck += 1; break; }
    }
    await page.close();
  }
  console.log(`[reveal ${LABEL}] ${N} rookie NFL careers named Curtain Probe, three seasons each`);
  console.log(`[reveal ${LABEL}] first screen behind the curtain: ${JSON.stringify(first)}`);
  console.log(`[reveal ${LABEL}] ${JSON.stringify(tally)}`);
  for (const s of stuck.slice(0, 6)) console.log(`[reveal ${LABEL}] STUCK ${JSON.stringify(s)}`);
  console.log(`[reveal ${LABEL}] verdict: ${tally.stuck === 0 && tally.hubBack === tally.seasons ? 'the hub came back after every curtain' : 'A PLAYER CAN GET STUCK, see above'}`);
}

const browser = await chromium.launch({ args: ['--no-sandbox'] });
let code = 0;
try {
  const save = PARTS.includes('bar') || PARTS.includes('help') ? await buildSave() : null;
  if (PARTS.includes('bar')) await barPart(browser, save);
  if (PARTS.includes('help')) {
    await helpPart(browser, save);
    if (process.env.PROBE_NOFONTS === '1') { NOFONTS = true; LABEL = LABEL + '-nofonts'; await helpPart(browser, save); }
  }
  if (PARTS.includes('reveal')) await revealPart(browser);
} catch (e) {
  console.log(`PROBE THREW: ${String(e && e.stack || e).slice(0, 900)}`);
  code = 1;
}
await browser.close();
console.log(`atgProbe ${LABEL} parts ${PARTS.join(',')} finished, exit ${code}`);
process.exit(code);
