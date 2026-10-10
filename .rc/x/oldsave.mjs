// reviewer walk (runner only, never committed): BASE_OLD=http://localhost:4174 node .rc/x/oldsave.mjs
// A save MADE BY THE BASE'S BUILD (Round 1221's head) is opened by the head's build and played to the recap, with
// Math.random seeded the same way in both builds. The saves each build writes are compared as strings: base against
// base (is the method steady?), base against head (did the default path move?), head with another seed (can it see a move?).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium } = pw;
const HEAD = process.env.BASE ?? 'http://localhost:4173';
const OLD = process.env.BASE_OLD ?? 'http://localhost:4174';
const OUT = process.env.RC_OUT || '.';
const KEY = 'front-office-save-v1';
let failures = 0;
const say = (ok, what) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + what); if (!ok) failures += 1; };
const sha = s => crypto.createHash('sha1').update(String(s)).digest('hex').slice(0, 12);
const seeded = seed => `(() => { let a = ${seed} >>> 0; Math.random = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();`;
const browser = await chromium.launch();

async function open(base, seed, inject) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.route(/supabase\.co/, r => r.abort());
  await page.addInitScript(seeded(seed));
  if (inject) await page.addInitScript(`if (!sessionStorage.getItem('rv')) { sessionStorage.setItem('rv', '1'); localStorage.setItem(${JSON.stringify(KEY)}, ${JSON.stringify(inject)}); }`);
  await page.goto(`${base}/front-office`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  return { ctx, page, errors };
}
const readSave = page => page.evaluate(k => localStorage.getItem(k), KEY);
const pressPlay = async page => {
  const btn = page.locator('button:has-text("Play Week"), button:has-text("Play the final week")');
  if (await btn.count() === 0) return false;
  await btn.first().click();
  await page.waitForTimeout(350);
  return true;
};

/* 1: the base's build makes the save */
console.log('1) the base build makes a save: a new franchise, three weeks played');
let made;
{
  const { ctx, page, errors } = await open(OLD, 111, null);
  await page.locator('.grid button').first().click();
  await page.waitForTimeout(900);
  const press = page.locator('[data-gm-press] button');
  if (await press.count() > 0) { await press.first().click(); await page.waitForTimeout(500); }
  await page.locator('button:has-text("This week")').first().click();
  await page.waitForTimeout(400);
  for (let i = 0; i < 3; i += 1) await pressPlay(page);
  made = await readSave(page);
  const s = made ? JSON.parse(made) : null;
  say(!!s && s.league && s.league.week === 4, `the base build wrote a save at week ${s && s.league ? s.league.week : '?'} (${made ? made.length : 0} characters, ${sha(made)})`);
  say(errors.length === 0, `no page error on the base build (${errors.slice(0, 1).join('')})`);
  await ctx.close();
}
if (!made) { console.log('oldsave: no save was made, nothing to compare'); process.exit(1); }
fs.writeFileSync(path.join(OUT, 'oldsave-made-by-base.json'), made);

/* 2: that save, opened and played to the recap by each build */
async function playOn(label, base, seed) {
  const { ctx, page, errors } = await open(base, seed, made);
  const opened = await readSave(page);
  const body0 = await page.locator('body').innerText();
  const refused = /couldn.t open this save/i.test(body0);
  const week = page.locator('button:has-text("This week")');
  if (await week.count() > 0) { await week.first().click(); await page.waitForTimeout(400); }
  const offersWeek4 = await page.locator('button:has-text("Play Week 4")').count();
  if (label === 'head') await page.screenshot({ path: path.join(OUT, 'oldsave-head-1-opened.png') });
  await pressPlay(page);
  await pressPlay(page);
  const mid = await readSave(page);
  let presses = 2;
  while (presses < 24 && await pressPlay(page)) presses += 1;
  await page.waitForTimeout(600);
  const end = await readSave(page);
  const text = await page.locator('body').innerText();
  if (label === 'head' || label === 'base-a') await page.screenshot({ path: path.join(OUT, `oldsave-${label}-2-recap.png`) });
  await ctx.close();
  const e = end ? JSON.parse(end) : null;
  return { label, opened, refused, offersWeek4, mid, end, presses, errors, phase: e ? e.phase : null, champions: e && e.league ? JSON.stringify(e.league.champions) : null, text };
}
console.log('2) the same save opened and played to the recap, Math.random seeded alike');
const baseA = await playOn('base-a', OLD, 222);
const baseB = await playOn('base-b', OLD, 222);
const head = await playOn('head', HEAD, 222);
const other = await playOn('head-other-seed', HEAD, 333);
for (const r of [baseA, baseB, head, other]) console.log(`  ${r.label}: opened ${sha(r.opened)}, refused ${r.refused}, Play Week 4 offered ${r.offersWeek4}, ${r.presses} presses, phase ${r.phase}, save after two presses ${sha(r.mid)}, at the end ${sha(r.end)} (${r.end ? r.end.length : 0} characters), champions ${r.champions}, page errors ${r.errors.length}`);
say(head.opened === made && !head.refused && head.offersWeek4 === 1, 'the head build opens the base-made save where it was left (Play Week 4 is offered, nothing refused, the stored string untouched by the load)');
say(head.errors.length === 0, `no page error on the head build (${head.errors.slice(0, 1).join('')})`);
say(head.phase !== 'hub' && head.presses >= 14, `the head build played it to the end of the season (${head.presses} presses, phase ${head.phase})`);
const steady = baseA.mid === baseB.mid && baseA.end === baseB.end;
say(steady, 'the method is steady: the base build twice gives the same two saves, character for character');
say(head.mid === baseA.mid, 'two weeks on: the head build writes the save the base build writes, character for character');
say(head.end === baseA.end, 'at the recap (the one press final week and postseason): the head build writes the save the base build writes, character for character');
say(other.end !== head.end && other.mid !== head.mid, 'the comparison can see a move: another seed writes other saves');
if (head.end !== baseA.end && head.end && baseA.end) {
  const a = JSON.parse(baseA.end); const b = JSON.parse(head.end);
  console.log(`  top level keys that differ: ${[...new Set([...Object.keys(a), ...Object.keys(b)])].filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k])).join(', ')}`);
}
const keys = head.end ? Object.keys(JSON.parse(head.end)).sort().join(',') : '';
say(!/playoffs|lastGame|bracket/i.test(keys), `the head build's save holds no new field (${keys})`);
fs.writeFileSync(path.join(OUT, 'oldsave-summary.json'), JSON.stringify({ made: sha(made), baseA: [sha(baseA.mid), sha(baseA.end)], baseB: [sha(baseB.mid), sha(baseB.end)], head: [sha(head.mid), sha(head.end)], other: [sha(other.mid), sha(other.end)], keys }, null, 1));
await browser.close();
console.log(failures === 0 ? 'oldsave: green. A save made by the base build opens on the head build and both builds play it to the same saves.' : `oldsave: ${failures} FAILED`);
process.exit(failures ? 1 : 0);
