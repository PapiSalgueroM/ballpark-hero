/* Review probe (read lens, Round 1510): what the Super cup tile and its card say for a new career in every league
 * of today's world and of each era. Read only: bundles the committed engine and the world view, starts one career
 * per league (first club of the league) in a fresh vm, and prints the tile's two lines and the card's lines as
 * SuperCupCard (WorldCompScreen.tsx 546 to 577) would render them. No network: fetch rejects. */
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const root = process.cwd();
const ENTRY = [
  "export * as cm from './src/lib/clubManager';",
  "export * as eras from './src/lib/clubManagerEras';",
  "export * as wv from './src/lib/clubManagerWorldView';",
].join('\n');
const out = await build({ stdin: { contents: ENTRY, resolveDir: root, sourcefile: 'probe-read-1510.ts', loader: 'ts' },
  bundle: true, write: false, format: 'cjs', platform: 'node', target: 'node20', logLevel: 'silent' });
const script = new vm.Script(out.outputFiles[0].text, { filename: 'probe-read-1510.cjs' });
async function fresh() {
  const module = { exports: {} };
  const store = new Map();
  const NOW = 1791633600000;
  class HeldDate extends Date { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } }
  const ctx = vm.createContext({ module, exports: module.exports, require: createRequire(path.join(root, 'package.json')),
    console, process, Buffer, Math, Date: HeldDate, URL, URLSearchParams, TextEncoder, TextDecoder, structuredClone,
    setTimeout, clearTimeout, setInterval, clearInterval, fetch: () => Promise.reject(new Error('no network here')),
    localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() } });
  script.runInContext(ctx);
  await module.exports.eras.ensureAllEraRosters();
  return module.exports;
}
const SEASON_ONE_LINE = 'The game plays this one: you follow it from outside, and play in it from a summer your club earns a place.';
const ERA_LINE = "This save keeps its era's super cup every season.";
function cardLines(v) {
  const lines = [v.name ? v.name : '(empty bold title)'];
  if (v.format) lines.push(v.format);
  if (v.ground) lines.push(v.ground);
  if (v.stub) lines.push(v.stub);
  for (const c of v.clubs) lines.push(`${c.club}: ${c.why}`);
  for (const m of v.matches) lines.push(`${m.label}: ${m.home} ${m.homeGoals ?? 'v'}${m.homeGoals === null ? '' : '-' + m.awayGoals} ${m.away}`);
  if (v.seasonOne && !v.stub && !v.mine) lines.push(SEASON_ONE_LINE);
  if (v.era && v.name) lines.push(ERA_LINE);
  return lines;
}
const probe = await fresh();
const jobs = [];
for (const l of probe.cm.REAL_LEAGUES) jobs.push({ era: 'now', league: l.id, club: l.clubs[0] });
for (const [era, leagues] of Object.entries(probe.cm.ERA_LEAGUES)) for (const l of leagues) jobs.push({ era, league: l.id, club: l.clubs[0] });
let falseSeasonOne = 0, noneHere = 0, notConfirmed = 0, ran = 0;
for (const j of jobs) {
  const M = await fresh();
  let s;
  try { s = M.cm.startCareer(j.club, j.era); } catch (e) { console.log(`SKIP ${j.era} ${j.league} ${j.club}: ${String(e).slice(0, 80)}`); continue; }
  ran += 1;
  const nation = M.cm.leagueRulesOf(M.cm.careerLeagueOf(s).id).nationId;
  const v = M.wv.superCupView(s);
  const st = M.wv.superCupStatus(v);
  const lines = cardLines(v);
  if (st.value === 'None here') noneHere += 1;
  if (st.value === 'Not confirmed') notConfirmed += 1;
  if (!v.name && lines.includes(SEASON_ONE_LINE)) falseSeasonOne += 1;
  console.log(`${j.era} ${j.league} (${nation}) ${j.club} season ${s.season} | tile: ${st.value} / ${st.sub} | card: ${lines.join(' || ')}`);
}
console.log(`probeRead1510: ${ran} careers; tile None here ${noneHere}, Not confirmed ${notConfirmed}; no-row cards that print the season one line ${falseSeasonOne}`);
