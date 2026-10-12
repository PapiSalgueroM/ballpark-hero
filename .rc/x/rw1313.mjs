// rw1313.mjs: the run lens reviewer's own walk for Round 1313 (never committed). Old saves built by the BASE code
// (src/test/fixtures/usRivalOldSavesB.json, recorded from b6eb78e7) are loaded into the served build of the branch
// and played one season through the UI, at 390x844 and 1280x900, motion on and reduced. Also a 2020 MLB reliever
// (a closer: the four part line in a short season) built by this tree's own code. Supabase is aborted.
// Every check prints "ok" or "FAIL"; the last line is "rw1313: N checks, F failed". Screenshots go to $RC_OUT.
import { build } from 'esbuild';
import { mkdirSync, readFileSync, unlinkSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const ROOT = process.cwd();
const BASE = process.env.BASE ?? 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx', 'rw-shots');
mkdirSync(OUT, { recursive: true });
let checks = 0; let failed = 0;
const say = (ok, msg) => { checks += 1; if (!ok) failed += 1; console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${msg}`); };

// Shapes and scores typed from src/lib/usCareerStatLine.ts and src/lib/careerAwards.ts (read 2026-10-12).
const N = String.raw`\d{1,3}(?:,\d{3})*`; const ERA = String.raw`\d+\.\d{2}`;
const HIT = String.raw`\.(\d{3}), (${N}) HR, (${N}) RBI`;
const SHAPE = {
  SP: `(${N})-(${N}), (${ERA}) ERA, (${N}) K`, RP: `(${N}) saves?, (${N}) holds?, (${ERA}) ERA, (${N}) K`,
  CF: HIT, RF: HIT, C: `(${N}) G, (${N}) A, (${N}) P`, G: String.raw`(${N}) W, \.(\d{3}) SV%`,
};
const num = s => Number(String(s).replace(/,/g, ''));
const SCORE = {
  SP: v => v[3] / 5 + v[0] * 2.2 + Math.max(0, (3.8 - v[2]) * 22),
  RP: v => v[0] * 1.5 + v[1] * 1.1 + v[3] / 4 + Math.max(0, (3.6 - v[2]) * 26),
  CF: v => v[1] * 1.6 + v[2] / 3 + Math.max(0, (v[0] / 1000 - 0.24) * 320),
  C: v => v[2], G: v => v[0] * 1.8 + Math.max(0, (v[1] / 1000 - 0.9) * 2400),
};
SCORE.RF = SCORE.CF;
const kindOf = (sp, pos) => (sp === 'nhl' ? (pos === 'G' ? 'G' : 'C') : (pos === 'SP' || pos === 'RP' ? pos : 'CF'));
const read = (sp, pos, text) => { const m = new RegExp(`^${SHAPE[kindOf(sp, pos)]}$`).exec(text ?? ''); return m ? m.slice(1).map(num) : null; };
const scoreOf = (sp, pos, v) => SCORE[kindOf(sp, pos)](v) * (sp === 'nhl' && pos === 'D' ? 1.35 : 1);
const lineInNote = note => { const m = / went (.+?)(?:[.] Nothing in it again| and had the better year of the two of you|[.] You had the better year)/.exec(note); return m ? m[1] : null; };

const SPORTS = {
  mlb: { route: '/mlb-my-career', key: 'mlb-my-career-save-v1' },
  nhl: { route: '/nhl-my-career', key: 'nhl-my-career-save-v1' },
};
const OLD = JSON.parse(readFileSync(path.join(ROOT, 'src/test/fixtures/usRivalOldSavesB.json'), 'utf8')).saves;
const CASES = [
  { sp: 'mlb', name: 'mlbRP', c: OLD.mlbRP }, { sp: 'mlb', name: 'mlbSP', c: OLD.mlbSP }, { sp: 'mlb', name: 'mlbDropped', c: OLD.mlbDropped },
  { sp: 'nhl', name: 'nhlG', c: OLD.nhlG }, { sp: 'nhl', name: 'nhlMade', c: OLD.nhlMade },
];

// A 2004 era MLB closer driven by this tree's own code to the 2020 season (60 games), live rival, nothing waiting.
const tmp = path.join(os.tmpdir(), `rw1313-${process.pid}.mjs`);
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
await build({ stdin: { contents: "export { MLB_CAREER_SPORT } from './src/lib/mlbCareerSport.ts';\nexport * as drive from './src/test/helpers/usCareerDrive.ts';", resolveDir: ROOT, loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', logLevel: 'error', alias: { '@': path.join(ROOT, 'src') }, outfile: tmp });
const E = await import(pathToFileURL(tmp).href); try { unlinkSync(tmp); } catch { /* best effort */ }
const S = E.MLB_CAREER_SPORT; const closerAt = S.create.archetypes.RP.findIndex(a => a.id === 'closer');
let short = null;
for (let i = 0; i < 120 && !short; i += 1) {
  const o = { key: `rw-short-rp-${i}`, pos: 'RP', arch: closerAt, eraId: 'y2004' };
  const first = JSON.parse(E.drive.driveCareer(S, { ...o, seasons: 0 }).json); const k = 2020 - first.year; if (k < 1) continue;
  const c = JSON.parse(E.drive.driveCareer(S, { ...o, seasons: k }).json);
  if (c.year === 2020 && c.archetype?.id === 'closer' && !c.retired && c.rival && !c.rival.retired && !c.pendingRivalryEvent && !c.pendingRivalryChoice && (c.suspendedSeasons ?? 0) === 0 && c.contractYears > 0) short = c;
}
say(!!short, `a 2004 era closer driven to 2020 with a live rival was found (${short ? `${short.team}, rival ${short.rival.name}` : 'none'})`);
if (short) CASES.push({ sp: 'mlb', name: 'shortRP2020', c: short, short: true });

const { chromium } = pw;
const browser = await chromium.launch();
const shot = async (page, name) => { try { await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false }); } catch (e) { console.log(`  note screenshot ${name} failed: ${e}`); } };
const saveOf = (page, key) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), key);
const sideways = page => page.evaluate(() => document.scrollingElement.scrollWidth - window.innerWidth);
const playButton = page => page.locator('button', { hasText: /^\s*Play the \d+ season\s*$/ });
async function open(sp, width, height, reduced) {
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const errors = []; let reached = 0;
  page.on('pageerror', e => errors.push(String(e)));
  page.on('requestfinished', r => { if (/supabase\.co/.test(r.url())) reached += 1; });
  await page.route(/supabase\.co/, r => r.abort());
  await page.addInitScript(route => localStorage.setItem(`rules-gate-seen:${route}`, '1'), sp.route);
  await page.goto(`${BASE}${sp.route}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const consent = page.locator('button:has-text("Essential only")');
  if (await consent.count()) { await consent.first().click().catch(() => {}); await page.waitForTimeout(300); }
  await page.locator('input[placeholder*="name"]').first().fill('Review Player');
  await page.locator('button:has-text("Enter the draft")').click();
  await page.waitForTimeout(900);
  return { ctx, page, errors, reached: () => reached };
}
async function load(page, sp, c) {
  const ok = await page.evaluate(([key, career]) => { const s = JSON.parse(localStorage.getItem(key) ?? 'null'); if (!s) return false; s.c = career; s.phase = 'season'; localStorage.setItem(key, JSON.stringify(s)); return true; }, [sp.key, c]);
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1200);
  return ok;
}
// One move the way a player would make it (the site's own controls, read off the screen).
async function step(page, leaveCard) {
  const lastIn = async sel => { const b = page.locator(`${sel} button:not([disabled])`); const n = await b.count(); if (!n) return false; await b.nth(n - 1).click(); return true; };
  const firstIn = async sel => { const b = page.locator(`${sel} button:not([disabled])`); if (!(await b.count())) return false; await b.first().click(); return true; };
  if (await page.locator('[role="alertdialog"]').count()) return lastIn('[role="alertdialog"]');
  if (await page.locator('[data-season-reveal]').count()) return leaveCard ? false : lastIn('[data-season-reveal]');
  if (await page.locator('[data-decision-continue]').count()) { await page.locator('[data-decision-continue]').first().click(); return true; }
  if (await page.locator('[data-rivalry-event]').count()) return lastIn('[data-rivalry-event]');
  if (await page.locator('[data-rivalry-choice]').count()) return (await page.locator('[data-rivalry-choice] [data-rivalry-outcome]').count()) ? lastIn('[data-rivalry-choice]') : firstIn('[data-rivalry-choice]');
  if (await page.locator('[data-extension-talk]').count()) return firstIn('[data-extension-talk]');
  const back = page.locator('button:not([disabled])', { hasText: /^\s*Back to offers\s*$/ });
  if (await back.count()) { await back.first().click(); return true; }
  if (await page.locator('[data-fa-window]').count()) {
    const sign = page.locator('[data-fa-window] button:not([disabled])', { hasText: /^\s*Sign\s*$/ });
    if (await sign.count()) { await sign.first().click(); return true; }
    return firstIn('[data-fa-window] :not([data-market-compare-open])');
  }
  const oneMore = page.locator('button', { hasText: 'One more year' });
  if (await oneMore.count()) { await oneMore.first().click(); return true; }
  const hub = page.locator('button', { hasText: /^\s*Hub\s*$/ });
  if (await hub.count()) { await hub.first().click(); return true; }
  return false;
}
async function toHub(page) {
  for (let i = 0; i < 40; i += 1) {
    if (await playButton(page).count() && !(await page.locator('[data-season-reveal]').count())) return true;
    if (!(await step(page, false))) await page.waitForTimeout(500); else await page.waitForTimeout(450);
  }
  return false;
}
// The innermost element holding `text`, measured against the rounded card around it.
const boxOf = (page, text) => page.evaluate(t => {
  const all = [...document.querySelectorAll('main *')].filter(e => (e.textContent ?? '').includes(t));
  const el = all[all.length - 1]; if (!el) return null;
  const card = el.closest('[class*="rounded"]') ?? el.parentElement;
  const a = el.getBoundingClientRect(); const b = card.getBoundingClientRect();
  return { cut: el.scrollWidth > el.clientWidth + 1, l: Math.round(a.left), r: Math.round(a.right), cl: Math.round(b.left), cr: Math.round(b.right), font: parseFloat(getComputedStyle(el).fontSize) };
}, text);
const fits = b => !!b && !b.cut && b.r <= b.cr + 0.5 && b.l >= b.cl - 0.5;
async function rivalScreen(page, tag, picture) {
  await page.locator('button:has(div.uppercase)').filter({ hasText: /News/i }).first().click(); await page.waitForTimeout(500);
  await page.locator('button', { hasText: /^\s*\S+ Rival\s*$/ }).first().click(); await page.waitForTimeout(700);
  const text = await page.locator('main').innerText();
  const m = /Last season he went (.+)[.]\s*$/m.exec(text);
  const box = await boxOf(page, 'Last season he went');
  const over = await sideways(page);
  await shot(page, picture);
  await page.locator('button', { hasText: /^\s*Hub\s*$/ }).first().click(); await page.waitForTimeout(400);
  return { line: m ? m[1] : null, text, box, over };
}
const PAIRS = [[390, 844, false], [390, 844, true], [1280, 900, false], [1280, 900, true]];
for (const cs of CASES) for (const [w, h, reduced] of PAIRS) {
  const sp = SPORTS[cs.sp]; const pos = cs.c.pos; const tag = `${cs.name}-${w}-${reduced ? 'reduced' : 'motion'}`;
  const o = await open(sp, w, h, reduced); const page = o.page;
  try {
    say(await load(page, sp, cs.c), `${tag}: the save loaded (${cs.c.pos} ${cs.c.year}, rival line "${cs.c.rival.lastLine}", ${cs.c.rival.myYears}-${cs.c.rival.hisYears})`);
    const s0 = await saveOf(page, sp.key); const pend = s0.c.pendingRivalryEvent; const morale0 = s0.c.morale;
    if (pend) {
      await shot(page, `${tag}-0-card`);
      const cardText = (await page.locator('[data-rivalry-event]').innerText().catch(() => '')).replace(/\s+/g, ' ');
      say(cardText.includes(pend.consequence), `${tag}: the pending card ${pend.id} shows its promise "${pend.consequence}" ("${cardText.slice(0, 160)}")`);
      const btn = page.locator('[data-rivalry-event] button:not([disabled])').last(); const bb = await btn.boundingBox();
      say(!!bb && bb.y + bb.height <= h, `${tag}: the card's button is above the fold (bottom ${bb ? Math.round(bb.y + bb.height) : 'none'} of ${h})`);
      await btn.click(); await page.waitForTimeout(800);
      const s1 = await saveOf(page, sp.key);
      const want = pend.consequence === 'Morale +5' ? Math.min(100, morale0 + 5) : pend.consequence === 'Morale -5' ? Math.max(0, morale0 - 5) : null;
      say(want !== null && s1.c.morale === want, `${tag}: the tap moved morale by what the chip printed (${morale0} to ${s1.c.morale}, want ${want})`);
    }
    say(await toHub(page), `${tag}: back at the hub before the season`);
    const before = await rivalScreen(page, tag, `${tag}-1-rival-before`);
    say(before.line === cs.c.rival.lastLine, `${tag}: the Rival screen shows his old line before a season ("${before.line}")`);
    say(before.text.includes(`${cs.c.rival.myYears}-${cs.c.rival.hisYears}`), `${tag}: the Rival screen shows the old tally ${cs.c.rival.myYears}-${cs.c.rival.hisYears}`);
    // One season through the UI.
    await playButton(page).first().click();
    for (let i = 0; i < 30 && !(await page.locator('[data-season-reveal]').count()); i += 1) {
      await page.waitForTimeout(500);
      if (await page.locator('[data-season-reveal]').count()) break;
      if (await step(page, true)) continue;
      if (await playButton(page).count()) await playButton(page).first().click();
    }
    const reached = await page.waitForSelector('[data-season-reveal]', { timeout: 15000 }).then(() => true, () => false);
    say(reached, `${tag}: the season card came up`);
    if (!reached) { await shot(page, `${tag}-lost`); continue; }
    const y0 = await page.evaluate(() => window.scrollY); await page.waitForTimeout(2600); const y1 = await page.evaluate(() => window.scrollY);
    console.log(`  note ${tag}: scrollY on the season card ${y0} then ${y1} after 2.6 s`);
    const card = await page.locator('[data-season-reveal]').innerText();
    const lines = card.split('\n').map(s => s.trim()).filter(Boolean);
    const mineText = lines.find(l => read(cs.sp, pos, l));
    const note = lines.find(l => / went /.test(l) && /head to head/i.test(l));
    await shot(page, `${tag}-2-season`);
    const after = await saveOf(page, sp.key); const r1 = after.c.rival; const season = after.c.seasons[after.c.seasons.length - 1];
    if (cs.short) say(season.year === 2020 && season.games <= 60, `${tag}: the season saved is the short 2020 one (${season.year}, ${season.games} games)`);
    if (!note) { say(!!r1.retired, `${tag}: no rival note, so he retired (${r1.retired})`); continue; }
    const hisText = lineInNote(note); const his = read(cs.sp, pos, hisText); const mine = read(cs.sp, pos, mineText);
    say(!!his, `${tag}: his line is a ${pos}'s own shape ("${hisText}")`);
    say(!!mine, `${tag}: my line on the card is in that shape ("${mineText}")`);
    say(hisText === r1.lastLine, `${tag}: the note's line is the saved line ("${r1.lastLine}")`);
    const won = r1.myYears > cs.c.rival.myYears;
    say(r1.myYears + r1.hisYears === cs.c.rival.myYears + cs.c.rival.hisYears + 1, `${tag}: the tally moved by one year (${cs.c.rival.myYears}-${cs.c.rival.hisYears} to ${r1.myYears}-${r1.hisYears})`);
    if (his && mine) {
      const a = scoreOf(cs.sp, pos, mine); const b = scoreOf(cs.sp, pos, his);
      say(won === (a > b), `${tag}: the year went to ${won ? 'me' : 'him'} and the two printed lines say ${a > b ? 'me' : 'him'} (${a.toFixed(2)} against ${b.toFixed(2)})`);
      const says = /You had the better year/.test(note) ? 'me' : /had the better year of the two of you/.test(note) ? 'him' : /Nothing in it/.test(note) ? 'tie' : '?';
      say(says === 'tie' || says === (won ? 'me' : 'him'), `${tag}: the note says ${says} and the save says ${won ? 'me' : 'him'} ("${note.slice(0, 200)}")`);
    }
    const nb = await boxOf(page, ' went ');
    say(fits(nb), `${tag}: the note ends inside the season card, not cut (${nb ? `${nb.l} to ${nb.r} in ${nb.cl} to ${nb.cr}` : 'none'})`);
    say(!!nb && nb.font >= 12, `${tag}: the note is 12px or more (${nb?.font}px)`);
    say((await sideways(page)) <= 1, `${tag}: nothing scrolls sideways on the season card (${await sideways(page)})`);
    await step(page, false); say(await toHub(page), `${tag}: back at the hub after the season`);
    const aft = await rivalScreen(page, tag, `${tag}-3-rival-after`);
    say(aft.line === r1.lastLine, `${tag}: the Rival screen shows the new line ("${aft.line}")`);
    say(aft.text.includes(`${r1.myYears}-${r1.hisYears}`), `${tag}: the Rival screen shows the tally ${r1.myYears}-${r1.hisYears}`);
    say(fits(aft.box) && aft.box.font >= 12, `${tag}: "Last season he went" ends inside its card at 12px or more (${aft.box ? `${aft.box.l} to ${aft.box.r} in ${aft.box.cl} to ${aft.box.cr}, ${aft.box.font}px` : 'none'})`);
    say(aft.over <= 1, `${tag}: nothing scrolls sideways on the Rival screen (${aft.over})`);
  } catch (e) {
    say(false, `${tag}: the walk threw (${String(e).slice(0, 200)})`); await shot(page, `${tag}-threw`);
  } finally {
    const real = o.errors.filter(e => !/supabase|Failed to fetch|CORS/i.test(e));
    say(real.length === 0, `${tag}: no page errors (${real[0] ?? 'clean'})`);
    say(o.reached() === 0, `${tag}: the database host was never reached`);
    await o.ctx.close();
  }
}
await browser.close();
console.log(`rw1313: ${checks} checks, ${failed} failed`);
process.exit(failed ? 1 : 0);
