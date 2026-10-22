/* Reviewer walk (Round 1556, runs lens): a sheet let stand on the NBA Front Office, played in Chromium.
 * A recap save (the lottery walk's own construction: a closed season, a real postseason) where the GM's club has a
 * restricted man rated 60, out of contract, with a rival's offer sheet on the table; the rival is filled to fourteen
 * men rated 72 or more on long deals, so after its draft night the summer's waiver reaches the sheet man first.
 * Steps, at 390x844 and 1280x900, reduced motion off and on: the hub at the recap, the Re-sign desk, his tile, the
 * sheet, "Let him go", the decided line, back to the hub, Go to the draft, Continue (the GM holds no pick, so the night
 * and the summer run), and then the save read back: he must be on the rival on the sheet's terms, the rival at fifteen
 * or fewer, he in no pool. Screenshots to $RC_OUT. Supabase aborted. Exit 0 green, 1 red, 2 could not run. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx', 'walk1556');
const KEY = 'nba-front-office-save-v1';
fs.mkdirSync(OUT, { recursive: true });
let fails = 0;
const say = (ok, msg) => { if (!ok) fails += 1; console.log(`  ${ok ? 'ok' : 'FAIL'} ${msg}`); };

const { build } = await import('esbuild');
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'walk1556-'));
process.on('exit', () => { try { fs.rmSync(work, { recursive: true, force: true }); } catch { /* best effort */ } });
fs.writeFileSync(path.join(work, 'entry.ts'), [
  "export { initNbaLeague, runNbaPlayoffs, NBA_ROUNDS, NBA_ROSTER_MAX } from '@/lib/nbaFrontOffice';",
  "export { openNbaDesk, syncNbaPicks, nbaPicksOf, nbaContractsOf } from '@/lib/nbaGmDesk';",
  "export { openNbaDraftNight } from '@/lib/nbaEarnedDraft';",
  "export { movePicks, pickKey } from '@/lib/gmEarnedDraft';",
  "export { withGmBlock } from '@/lib/gmDesk';",
  "export { deskCase } from '@/lib/gmContracts';",
  "export { nbaContractHost } from '@/lib/gmContractsHostNba';",
].join('\n'));
await build({ entryPoints: [path.join(work, 'entry.ts')], outfile: path.join(work, 'engine.mjs'), bundle: true, platform: 'node',
  format: 'esm', logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
if (fs.readFileSync(path.join(work, 'engine.mjs'), 'utf8').includes('supabase.co')) { console.error('refusing: bundle names supabase.co'); process.exit(2); }
const N = await import(pathToFileURL(path.join(work, 'engine.mjs')).href);
const clone = v => JSON.parse(JSON.stringify(v));
const lehmer = seed => { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; };

/* The lottery walk's recap, with the GM's two picks given away so Continue runs the night and the summer. */
function recap(seed) {
  const rng = lehmer(seed);
  const league = N.initNbaLeague(rng);
  const ids = Object.keys(league.teams).sort();
  ids.forEach((id, i) => { league.teams[id].wins = 26 + i; league.teams[id].losses = 56 - i; });
  league.round = N.NBA_ROUNDS;
  const { series, champion } = N.runNbaPlayoffs(league, rng);
  league.champions.push({ season: league.season, team: champion });
  const me = ids[6];
  const o = ids.find(c => c !== me);
  let gm = N.openNbaDesk(league, me);
  let ledger = N.nbaPicksOf(gm, league);
  for (const round of [1, 2]) ledger = N.movePicks(ledger, [N.pickKey({ year: league.season, round, orig: me })], o);
  N.syncNbaPicks(league, ledger);
  gm = N.withGmBlock(gm, 'picks', ledger);
  return { save: { league, myTeam: me, phase: 'recap', titles: 0, seasonsPlayed: 1, draftClass: null, picksLeft: 0, postseason: { series, champion, gradeLine: null }, gm }, me };
}

/* A restricted man at the bottom of the rival that tables his sheet. */
function craft() {
  for (let seed = 15; seed < 120; seed++) {
    const b = recap(seed);
    const { league, gm } = b.save;
    for (const p0 of [...league.teams[b.me].players].sort((a, c) => a.ovr - c.ovr)) {
      const lg = clone(league);
      const p = lg.teams[b.me].players.find(x => x.id === p0.id);
      Object.assign(p, { age: 22, ovr: 60, pot: 76, years: 1 });
      const led = clone(N.nbaContractsOf(gm, lg, b.me));
      led.men[p.id] = { since: lg.season - 1, how: 'draft', round: 2 };
      let c = N.deskCase(N.nbaContractHost, lg, led, p);
      const club = c.restricted?.sheet && c.restricted.club;
      if (!club) continue;
      const X = lg.teams[club];
      for (const q of X.players) Object.assign(q, { ovr: Math.max(q.ovr, 72), pot: Math.max(q.pot, q.ovr, 72), years: Math.max(q.years, 3), age: Math.min(Math.max(q.age, 25), 30) });
      for (let i = 0; X.players.length < 14; i++) X.players.push({ ...X.players[0], id: `walk-${club}-${i}`, name: `Walker ${club} ${i}`, ovr: 75, pot: 75, years: 3, age: 27, out: 0 });
      c = N.deskCase(N.nbaContractHost, lg, led, p);
      if (!c.restricted?.sheet || c.restricted.club !== club) continue;
      const save = { ...b.save, league: lg, gm: N.withGmBlock(gm, 'contracts', led) };
      return { save, me: b.me, man: { id: p.id, name: p.name }, club, sheet: c.restricted.sheet, seed, xCount: X.players.length };
    }
  }
  return null;
}
const S = craft();
if (!S) { console.error('walk1556: could not build a save with a sheet on a rated 60 man'); process.exit(2); }
console.log(`walk1556: seed ${S.seed}, GM ${S.me}, ${S.man.name} (60) has a sheet from ${S.club} (${S.xCount} men): ${S.sheet.years}y at ${S.sheet.salary}`);

const { answerConsent } = await import(pathToFileURL(path.join(ROOT, 'scripts', 'lib', 'answerConsent.mjs')).href);
let chromium;
try { ({ chromium } = await import('playwright')); } catch { console.error('walk1556: playwright is not installed'); process.exit(2); }
const browser = await chromium.launch();
const realErrors = errors => errors.filter(e => !/supabase|Failed to fetch|CORS|ERR_FAILED|NetworkError/i.test(e));
const lookAt = page => page.evaluate(() => {
  const vw = document.documentElement.clientWidth;
  const wide = document.scrollingElement.scrollWidth > vw + 1;
  const small = [...document.querySelectorAll('main button, [data-gm-desk] button, [data-resign-desk] button, [data-resign-table] button')]
    .filter(b => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.height < 43.5; }).map(b => `${b.textContent.trim().slice(0, 30)} (${Math.round(b.getBoundingClientRect().height)})`);
  const cut = [...document.querySelectorAll('[data-resign-desk] *, [data-resign-table] *')]
    .filter(n => n.children.length === 0 && n.textContent.trim() && n.getBoundingClientRect().right > vw + 0.5).map(n => n.textContent.trim().slice(0, 30));
  return { wide, small, cut };
});
async function click(page, loc, what) {
  const el = loc.first();
  try { await el.waitFor({ state: 'attached', timeout: 15000 }); } catch { say(false, `${what}: not found`); return false; }
  await el.evaluate(n => n.click());
  await page.waitForTimeout(400);
  return true;
}
for (const size of [{ w: 390, h: 844 }, { w: 1280, h: 900 }]) for (const reduced of [false, true]) {
  const tag = `${size.w}${reduced ? '-rm' : ''}`;
  console.log(`walk ${tag}`);
  const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h }, ...(reduced ? { reducedMotion: 'reduce' } : {}) });
  await ctx.addInitScript(s0 => { let s = s0; Math.random = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }, 15560);
  const page = await ctx.newPage();
  await page.route(/supabase\.co/, r => r.abort());
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${BASE}/robots.txt`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluate(([k, v]) => { localStorage.clear(); localStorage.setItem(k, v); }, [KEY, JSON.stringify(S.save)]);
  await page.goto(`${BASE}/nba-front-office`, { waitUntil: 'networkidle', timeout: 60000 });
  await answerConsent(page);
  await page.waitForTimeout(400);
  const shot = async name => { await page.screenshot({ path: path.join(OUT, `${tag}-${name}.png`), fullPage: false }); const l = await lookAt(page);
    say(!l.wide && !l.cut.length, `${tag} ${name}: no sideways scroll, nothing cut (${l.cut.slice(0, 2).join(' | ')})`);
    if (l.small.length) console.log(`  note ${tag} ${name}: buttons under 44 px: ${l.small.slice(0, 4).join(', ')}`); };
  await shot('1-recap');
  if (!await click(page, page.locator('[data-gm-desk="tiles"] button', { hasText: /end this summer/ }), `${tag} the Re-sign desk tile`)) { await ctx.close(); continue; }
  await page.locator('[data-resign-desk]').first().scrollIntoViewIfNeeded().catch(() => {});
  await shot('2-desk');
  if (!await click(page, page.locator('[data-resign-tile]', { hasText: S.man.name }), `${tag} his tile`)) { await ctx.close(); continue; }
  const table = await page.locator('[data-resign-table]').first().textContent().catch(() => '');
  say(table.includes('A rival club has signed him to an offer sheet'), `${tag} the sheet is on his table`);
  await page.locator('[data-resign-table]').first().scrollIntoViewIfNeeded().catch(() => {});
  await shot('3-sheet');
  if (!await click(page, page.getByRole('button', { name: /Let him go/ }), `${tag} Let him go`)) { await ctx.close(); continue; }
  const decided = await page.locator('[data-resign-decided]').first().textContent().catch(() => '');
  say(/Gone to the rival on its sheet/.test(decided ?? ''), `${tag} decided line: "${decided}"`);
  await shot('4-let-go');
  await click(page, page.getByRole('button', { name: /Back to the desk/ }), `${tag} Back to the desk`);
  await shot('5-desk-after');
  await click(page, page.getByRole('button', { name: /Hub/ }), `${tag} Hub`);
  await click(page, page.getByRole('button', { name: /Go to the draft/ }), `${tag} Go to the draft`);
  await page.waitForSelector('[data-lottery-continue]', { timeout: 15000 }).catch(() => {});
  await shot('6-lottery');
  await click(page, page.locator('[data-lottery-continue]'), `${tag} Continue`);
  await page.waitForTimeout(800);
  await shot('7-after-summer');
  const end = await page.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
  const X = end.league.teams[S.club];
  const him = X?.players.find(p => p.id === S.man.id);
  const elsewhere = Object.entries(end.league.teams).find(([, t]) => t.players.some(p => p.id === S.man.id))?.[0] ?? (end.league.freeAgents.some(p => p.id === S.man.id) ? 'the pool' : 'nowhere');
  say(end.phase === 'hub' && end.league.season === S.save.league.season + 1, `${tag} the summer ran (phase ${end.phase}, season ${end.league.season})`);
  say(!!him && him.years === S.sheet.years && him.salary === S.sheet.salary, `${tag} ${S.man.name} after the summer: at ${elsewhere}${him ? ` on ${him.years}y at ${him.salary}` : ''}, the sheet said ${S.club} ${S.sheet.years}y at ${S.sheet.salary}`);
  say(X.players.length <= N.NBA_ROSTER_MAX, `${tag} ${S.club} ends the summer at ${X.players.length}`);
  say(!(X.deadCap ?? []).some(d => d.playerId === S.man.id), `${tag} ${S.club} carries no dead money for him`);
  const leave = page.locator('[data-draft-continue], [data-gm-draft-leave]');
  if (await leave.count()) await click(page, leave, `${tag} the way out`);
  await shot('8-hub-next-season');
  const seen = await page.evaluate(n => document.body.innerText.includes(n), S.man.name);
  console.log(`  note ${tag}: his name on the hub after the summer: ${seen}`);
  say(realErrors(errors).length === 0, `${tag} page errors: ${realErrors(errors).slice(0, 2).join(' | ')}`);
  await ctx.close();
}
await browser.close();
console.log(fails ? `walk1556: RED, ${fails} failures` : 'walk1556: green');
process.exit(fails ? 1 : 0);
