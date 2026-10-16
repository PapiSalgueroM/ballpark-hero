// Round 1347 review (run lens): the round is dark, so the walk proves the screens it could reach are as they were:
// a Club Manager save made by THIS branch's engine (a participant past the group stage, a today's world watcher,
// an era participant) is planted, resumed, and the hub and the Cups panel (UclGroupsCard reads the one engine file
// this round edits, clubManagerUclGroups.ts) are photographed at 390x844 and 1280x900, reduced motion on and off.
// Supabase is aborted. Run from the repo root on a served dist: BASE=http://localhost:4173 node .rc/x/walk1347.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const ROOT = process.cwd();
const BASE = process.env.BASE || process.env.SWEEP_BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-walk');
fs.mkdirSync(OUT, { recursive: true });
const findings = [];
const note = s => { findings.push(s); console.log(`  FINDING ${s}`); };

/* The saves, made by this tree's engine in a vm with a fake localStorage. */
const bundled = await build({ stdin: { contents: "export * as cm from './src/lib/clubManager';\nexport * as eras from './src/lib/clubManagerEras';\n", resolveDir: ROOT, sourcefile: 'walk.ts', loader: 'ts' },
  bundle: true, write: false, format: 'cjs', platform: 'node', target: 'node20', logLevel: 'silent', alias: { '@': path.join(ROOT, 'src') } });
const script = new vm.Script(bundled.outputFiles[0].text);
async function makeSave(club, era, entries) {
  const module = { exports: {} }; const store = new Map();
  const ctx = vm.createContext({ module, exports: module.exports, require: createRequire(path.join(ROOT, 'package.json')), console, process, Buffer, Math, Date, URL, URLSearchParams, TextEncoder, TextDecoder, structuredClone, setTimeout, clearTimeout, setInterval, clearInterval,
    fetch: () => Promise.reject(new Error('no network')), localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() } });
  script.runInContext(ctx);
  const { cm, eras } = module.exports;
  await eras.ensureAllEraRosters();
  let s = cm.startCareer(club, era);
  for (let i = 0; i < entries; i += 1) s = cm.playNextEntry(s, { skipHalftime: true, noCoach: true }).state;
  if (!cm.saveCareer(s)) throw new Error(`${club}: the save was refused`);
  const played = (s.uclGroup?.results ?? s.uclGroup?.played ?? []).length;
  console.log(`  save ${era ?? 'today'} ${club}: week ${s.week}, uclGroup ${s.uclGroup ? 'yes' : 'none'}, bracket ${s.uclBracket ? s.uclBracket.length : 0} ties, ${played} group results, ${[...store.keys()].length} keys`);
  return [...store.entries()];
}
const SAVES = [
  { id: 'rm', club: 'Real Madrid', era: undefined, entries: 34 },
  { id: 'chelsea', club: 'Chelsea', era: undefined, entries: 20 },
  { id: 'ars2010', club: 'Arsenal', era: 'era2010', entries: 34 },
];
for (const sv of SAVES) sv.store = await makeSave(sv.club, sv.era, sv.entries);

const browser = await pw.chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--no-sandbox', '--no-proxy-server'] });
const RUNS = [
  ['rm', 390, 844, 'reduce'], ['rm', 390, 844, 'no-preference'], ['rm', 1280, 900, 'reduce'], ['rm', 1280, 900, 'no-preference'],
  ['chelsea', 390, 844, 'reduce'], ['chelsea', 1280, 900, 'no-preference'], ['ars2010', 390, 844, 'no-preference'], ['ars2010', 1280, 900, 'reduce'],
];
for (const [id, width, height, motion] of RUNS) {
  const sv = SAVES.find(x => x.id === id);
  const tag = `${id}-${width}-${motion === 'reduce' ? 'rm' : 'mo'}`;
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: motion, ignoreHTTPSErrors: true });
  await ctx.route(/supabase\.co/, r => r.abort());
  await ctx.route(/googlesyndication|doubleclick|googletagmanager|google-analytics/, r => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(`pageerror ${e.message}`));
  page.on('console', m => { if (m.type() === 'error' && !/supabase|Failed to load resource|net::ERR/i.test(m.text())) errors.push(`console ${m.text().slice(0, 160)}`); });
  await page.goto(`${BASE}/robots.txt`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(entries => { localStorage.clear(); for (const [k, v] of entries) localStorage.setItem(k, v); }, sv.store);
  await page.goto(`${BASE}/club-manager`, { waitUntil: 'domcontentloaded' });
  const resume = page.getByRole('button', { name: /^Resume Career$/ }).first();
  await resume.waitFor({ timeout: 20000 }).catch(() => {});
  if (await resume.isVisible().catch(() => false)) await resume.click();
  else note(`${tag}: no Resume Career button`);
  await page.getByText(/Season 1/i).first().waitFor({ timeout: 20000 }).catch(() => note(`${tag}: the hub never showed Season 1`));
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, `${tag}-hub.png`) });
  const cups = page.locator('button', { hasText: 'Cups' }).first();
  if (await cups.count()) {
    await cups.click();
    await page.waitForTimeout(800);
    const panel = await page.evaluate(() => {
      const h = [...document.querySelectorAll('h2,h3,h4,div,p')].find(e => /Champions League/.test(e.textContent || '') && e.children.length < 3);
      return { text: (document.body.innerText || '').split('\n').filter(l => /Group [A-H]|Champions League|No European/.test(l)).slice(0, 12), sx: document.documentElement.scrollWidth, w: window.innerWidth, found: !!h };
    });
    console.log(`  ${tag}: cups lines ${JSON.stringify(panel.text)}`);
    if (panel.sx > panel.w + 1) note(`${tag}: sideways scroll ${panel.sx} > ${panel.w}`);
    await page.screenshot({ path: path.join(OUT, `${tag}-cups.png`), fullPage: true });
  } else note(`${tag}: no Cups tile`);
  for (const e of errors.slice(0, 5)) note(`${tag}: ${e}`);
  await ctx.close();
}
await browser.close();
console.log(`walk1347: ${findings.length === 0 ? 'clean' : `${findings.length} findings`}, ${RUNS.length} views, shots in ${OUT}`);
process.exit(findings.length === 0 ? 0 : 1);
