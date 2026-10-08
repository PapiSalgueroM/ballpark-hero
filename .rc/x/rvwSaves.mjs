// Reviewer's probe (never committed): a league and a save made by the BASE's code and data (origin/main, the merge's
// second parent), opened and played on this branch's engine. Runs from the repo root on the runner.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const ROOT = process.cwd();
const BASE = process.env.RVW_BASE || 'c623e77d22541ac88c30f48b078a9a8a9c699e1d';
const FILES = ['src/lib/frontOffice.ts', 'src/data/frontOfficePlayers.ts', 'src/data/frontOfficeDepth.ts'];
const norm = t => t.split('\r\n').join('\n');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'rvw-saves-'));
async function arm(tag, commit) {
  const dir = path.join(TMP, tag); fs.mkdirSync(dir);
  for (const file of FILES) {
    let text;
    if (commit) { const shown = spawnSync('git', ['show', `${commit}:${file}`], { cwd: ROOT, maxBuffer: 32 * 1024 * 1024 }); if (shown.status !== 0) throw new Error(`git show ${commit}:${file}: ${shown.stderr}`); text = shown.stdout.toString(); }
    else text = fs.readFileSync(path.join(ROOT, file), 'utf8');
    if (file.includes('/lib/')) text = norm(text).replace(/(from\s+['"])\.\/([^'"]+)(['"])/g, '$1@/lib/$2$3');
    fs.writeFileSync(path.join(dir, path.basename(file)), text);
  }
  const outfile = path.join(dir, 'arm.cjs');
  await build({ stdin: { contents: "export * as engine from './frontOffice.ts'; export { FO_DEPTH } from './frontOfficeDepth.ts'; export { isFrontOfficeSave } from '@/lib/frontOfficeSave';", resolveDir: dir, loader: 'ts' }, outfile, bundle: true, platform: 'node', format: 'cjs', logLevel: 'error',
    alias: { '@/data/frontOfficePlayers': path.join(dir, 'frontOfficePlayers.ts'), '@/data/frontOfficeDepth': path.join(dir, 'frontOfficeDepth.ts'), '@': path.join(ROOT, 'src') } });
  return createRequire(import.meta.url)(outfile);
}
const seeded = seed => { let state = seed >>> 0, count = 0; return { draw: () => { count += 1; state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; }, count: () => count }; };
function canonical(value) {
  const ids = new Map();
  const walk = v => { if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') { for (const key of ['id', 'playerId']) if (typeof v[key] === 'string' && !ids.has(v[key])) ids.set(v[key], '#' + ids.size); Object.values(v).forEach(walk); } };
  walk(value);
  return JSON.parse(JSON.stringify(value, (_k, v) => (typeof v === 'string' && ids.has(v) ? ids.get(v) : v)));
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const base = await arm('base', BASE), head = await arm('head', null);
const OFFENSE = ['QB', 'RB', 'WR', 'TE'];
let bad = 0;
const say = (ok, what) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${what}`); if (!ok) bad += 1; };

console.log(`base ${BASE.slice(0, 8)} against the working tree`);
/* ---- 1. a NEW league, seed by seed: what moved and what did not ---- */
for (const seed of [1130, 1131, 1132, 7, 20261008]) {
  const rb = seeded(seed), rh = seeded(seed);
  const B = canonical(base.engine.initLeague(rb.draw, { depth: base.FO_DEPTH, userTeam: 'LV' }));
  const H = canonical(head.engine.initLeague(rh.draw, { depth: head.FO_DEPTH, userTeam: 'LV' }));
  const men = lg => new Map(Object.values(lg.teams).flatMap(t => [...t.players.map(p => [`${t.abbr}|${p.name}|${p.pos}|active`, p]), ...(t.practice ?? []).map(p => [`${t.abbr}|${p.name}|${p.pos}|practice`, p])]));
  const mb = men(B), mh = men(H);
  const strip = (p, keys) => Object.fromEntries(Object.entries(p).filter(([k]) => !keys.includes(k)));
  let defMoved = 0, defOther = 0, offMoved = 0, offOther = 0, potGap = 0, missing = 0; const samples = [];
  for (const [key, p] of mb) {
    const q = mh.get(key); if (!q) { missing += 1; continue; }
    const offense = OFFENSE.includes(p.pos);
    const lineage = (x) => { const e = x.openingRatingEvidence; return e ? { ...e, modelVersion: 0, openingOvr: offense ? 0 : e.openingOvr } : e; };
    const rest = x => JSON.stringify({ ...strip(x, offense ? ['ovr', 'salary', 'pot', 'openingRatingEvidence'] : ['salary', 'openingRatingEvidence']), l: lineage(x) });
    if (p.ovr !== q.ovr) { if (offense) offMoved += 1; else { defMoved += 1; samples.push(`${key} ${p.ovr}->${q.ovr}`); } }
    if (rest(p) !== rest(q)) { if (offense) offOther += 1; else defOther += 1; if (samples.length < 6) samples.push(`${key}: ${rest(p).slice(0, 150)} | ${rest(q).slice(0, 150)}`); }
    if (offense && (p.pot - p.ovr) !== (q.pot - q.ovr)) potGap += 1;
  }
  const payroll = lg => Object.fromEntries(Object.values(lg.teams).map(t => [t.abbr, Math.round(t.players.reduce((n, p) => n + p.salary, 0) * 10)]));
  const pb = payroll(B), ph = payroll(H), payMoved = Object.keys(pb).filter(c => pb[c] !== ph[c]);
  const order = lg => Object.values(lg.teams).map(t => t.players.map(p => p.name + '|' + p.pos).join(',')).join(';');
  console.log(`seed ${seed}: draws ${rb.count()} base, ${rh.count()} head; men ${mb.size} and ${mh.size}; offense numbers moved ${offMoved}; other shelves moved ${defMoved}; other fields moved on offense ${offOther}, elsewhere ${defOther}; offense men whose hidden ceiling sits another distance over the number ${potGap}; clubs with another payroll ${payMoved.length}`);
  say(rb.count() === rh.count(), `seed ${seed}: the same number of random draws`);
  say(same(B.schedule, H.schedule), `seed ${seed}: the same schedule`);
  say(same(B.freeAgents, H.freeAgents), `seed ${seed}: the same opening free agent pool`);
  say(missing === 0 && mb.size === mh.size, `seed ${seed}: the same men on the same clubs and tiers`);
  say(order(B) === order(H), `seed ${seed}: the same row order on every club`);
  say(defMoved === 0 && defOther === 0, `seed ${seed}: no lineman or defender moved in any field but his price (${samples.slice(0, 3).join(' ; ')})`);
  say(offOther === 0, `seed ${seed}: an offense man differs only in number, price, ceiling and lineage`);
  say(payMoved.length === 0, `seed ${seed}: every club's active payroll is the same to the tenth (${payMoved.slice(0, 4).map(c => `${c} ${pb[c] / 10} -> ${ph[c] / 10}`).join(', ')})`);
  const lv = name => { const b = [...mb].find(([k]) => k.startsWith(`LV|${name}|`))?.[1], h = [...mh].find(([k]) => k.startsWith(`LV|${name}|`))?.[1]; return `${name} ${b?.ovr} (pot ${b?.pot}) -> ${h?.ovr} (pot ${h?.pot}), lineage ${JSON.stringify(h?.openingRatingEvidence)}`; };
  if (seed === 1130) { console.log('   ' + lv('Ashton Jeanty')); console.log('   ' + lv('Connor Heyward')); }
}

/* ---- 2. a save the base wrote, opened and played by this branch ---- */
for (const team of ['LV', 'KC']) {
  const league = base.engine.initLeague(seeded(4242).draw, { depth: base.FO_DEPTH, userTeam: team });
  const text = JSON.stringify({ league, myTeam: team, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0 });
  if (team === 'LV') fs.writeFileSync('/tmp/rvw-base-save-LV.json', text);
  const opened = JSON.parse(text);
  say(head.isFrontOfficeSave(opened, 'NFL', 17) === true, `${team}: this branch's validator accepts the base's save (${(text.length / 1024).toFixed(0)} KiB)`);
  say(head.engine.ensureFoLeagueIds(opened.league, opened.draftClass) === 0, `${team}: the id repair finds nothing to repair`);
  say(JSON.stringify(opened) === text, `${team}: the save is the same string after this branch opened it`);
  const play = (engine, weeks) => { const lg = JSON.parse(text).league, rng = seeded(99).draw; for (let w = 0; w < weeks; w += 1) { engine.injuryPass(lg.teams, rng); for (const g of lg.schedule[w]) engine.simGame(g, lg.teams, rng); } return lg; };
  say(same(canonical(play(base.engine, 1)), canonical(play(head.engine, 1))), `${team}: week 1 of the saved league is the same on both engines`);
  const fb = play(base.engine, 17), fh = play(head.engine, 17);
  say(same(canonical(fb), canonical(fh)), `${team}: the whole 17 week season of the saved league is the same on both engines`);
  if (typeof head.engine.runOffseason === 'function' && typeof base.engine.runOffseason === 'function') {
    let ob, oh, err = '';
    try { ob = base.engine.runOffseason(fb, seeded(5).draw); oh = head.engine.runOffseason(fh, seeded(5).draw); } catch (e) { err = String(e.message).slice(0, 120); }
    if (err) console.log(`   ${team}: runOffseason could not be called this way (${err}), not judged`);
    else say(same(canonical(ob ?? fb), canonical(oh ?? fh)), `${team}: the offseason after it is the same on both engines`);
  }
  const jeanty = opened.league.teams.LV.players.find(p => p.name === 'Ashton Jeanty');
  if (team === 'LV') console.log(`   the saved Ashton Jeanty: ovr ${jeanty?.ovr}, lineage ${JSON.stringify(jeanty?.openingRatingEvidence)}`);
}
console.log(bad ? `rvwSaves: ${bad} FAILURE(S)` : 'rvwSaves: all held');
process.exit(bad ? 1 : 0);
