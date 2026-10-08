// Reviewer's mutation runner (never committed). Runs on the GitHub runner from the repo root, one mutation at a
// time: patch one file (the anchor must be there exactly once), optionally re-bake the data files the way a builder
// would, run the round's gates, restore every byte. Prints one block per mutation and writes $RC_OUT/mutations.json.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const OUT = process.env.RC_OUT || '.';
const MODEL = 'scripts/lib/nflFoRatingModel.mjs', PROD = 'scripts/lib/nflProduction.mjs', GEN = 'scripts/genFrontOfficeRoster.mjs';
const DATA = ['src/data/frontOfficePlayers.ts', 'src/data/frontOfficeDepth.ts', 'scripts/data/nflRosters2026LeftOut.json'];
const once = (anchor, replacement) => text => {
  const n = text.split(anchor).length - 1;
  if (n !== 1) throw new Error(`anchor occurs ${n} times: ${anchor.slice(0, 80)}`);
  return text.replace(anchor, () => replacement);
};
const MUTATIONS = [
  { name: 'M0-none', file: MODEL, patch: t => t, regen: true },
  { name: 'M1-scale-centre-84-to-87', file: MODEL, regen: true, patch: once('const measured=clip(84+layer.gain*(', 'const measured=clip(87+layer.gain*(') },
  { name: 'M2-fullback-by-label-alone', file: MODEL, regen: true, patch: once("record.sourceIdentity.depthChartPosition==='FB'&&!!layer.fullbacks?.has(record.key)", "record.sourceIdentity.depthChartPosition==='FB'") },
  { name: 'M3-disputed-rows-feed-ratings', file: PROD, regen: true, patch: once("if (row.status === 'agree') return Object.fromEntries(row.agreed.map(f => [f, row.a[f]]));", "if (row.status === 'agree') return Object.fromEntries(row.agreed.map(f => [f, row.a[f]]));\n  if (row.status === 'disagree') return Object.fromEntries(fieldsFor(row.shelf).filter(f => Number.isFinite(row.a[f])).map(f => [f, row.a[f]]));") },
  { name: 'M4-one-starters-number-plus-one-no-rebake', file: DATA[0], regen: false, patch: t => {
    const lines = t.split('\n'), i = lines.findIndex(l => l.includes("name: 'Ashton Jeanty'"));
    if (i < 0) throw new Error('no Jeanty row');
    const m = lines[i].match(/ovr: (\d+),/); if (!m) throw new Error('no ovr on the row');
    lines[i] = lines[i].replace(`ovr: ${m[1]},`, `ovr: ${Number(m[1]) + 1},`);
    return lines.join('\n');
  } },
  { name: 'M5-production-term-dropped', file: MODEL, regen: true, patch: once('const zProd=hasLine?clip((line.score/line.games-cohort.mean)/cohort.sd,-2.5,2.5):zVol;', 'const zProd=zVol;') },
  { name: 'M6-minGames-off-by-one', file: MODEL, regen: true, patch: once('line&&line.games>=layer.minGames&&cohort', 'line&&line.games>layer.minGames&&cohort') },
  { name: 'M7-practice-squad-not-rerated', file: GEN, regen: true, patch: once("for (const tier of ['bench', 'practice']) result[tier] = t[tier].map(p => one(t.abbr, p));", "for (const tier of ['bench']) result[tier] = t[tier].map(p => one(t.abbr, p));") },
  { name: 'M9-carry-all-one', file: MODEL, regen: true, patch: once('carry:Object.freeze({2023:.6,2024:.8,2025:1})', 'carry:Object.freeze({2023:1,2024:1,2025:1})') },
  { name: 'M10-gain-13-to-16', file: MODEL, regen: true, patch: once('gain:13,minGames:4,fullbackOvr:63', 'gain:16,minGames:4,fullbackOvr:63') },
  { name: 'M11-efficiency-weight-zero', file: MODEL, regen: true, patch: once('blend:Object.freeze({efficiency:.45,workload:.2,production:.35})', 'blend:Object.freeze({efficiency:0,workload:.2,production:.8})') },
];
const only = (process.env.MUT_ONLY || '').split(',').filter(Boolean);
const run = (cmd, timeoutMs = 240000) => {
  const r = spawnSync('bash', ['-c', cmd], { encoding: 'utf8', timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024 });
  return { exit: r.status, out: (r.stdout || '') + (r.stderr || '') };
};
const lastLine = text => text.trim().split('\n').filter(Boolean).pop() ?? '';
const results = [];
// the suite hashes the record as this PC holds it (CRLF); fold it once, as the builder's own request lines do
run("sed -i 's/\\r*$/\\r/' scripts/data/nflRosters2026.json");
for (const m of MUTATIONS) {
  if (only.length && !only.some(o => m.name.startsWith(o))) continue;
  const touched = [...new Set([m.file, ...DATA])];
  const original = new Map(touched.map(f => [f, fs.readFileSync(f)]));
  const row = { name: m.name, regen: m.regen };
  try {
    const before = fs.readFileSync(m.file, 'utf8'), after = m.patch(before);
    if (m.name !== 'M0-none' && after === before) throw new Error('the patch changed nothing');
    fs.writeFileSync(m.file, after);
    if (m.regen) { const g = run(`node ${GEN}`); row.rebake = { exit: g.exit, last: lastLine(g.out).slice(0, 200) }; }
    row.dataChanged = DATA.filter(f => !fs.readFileSync(f).equals(original.get(f))).length;
    if (!m.regen || row.rebake.exit === 0) {
      const c = run(`node ${GEN} --check`); row.gencheck = c.exit;
      const h = run('node scripts/simFoRatingOrder.mjs');
      row.order = { exit: h.exit, last: lastLine(h.out).slice(0, 220), fails: h.out.split('\n').filter(l => l.includes('FAIL [')).map(l => l.trim().slice(0, 260)).slice(0, 8) };
      row.measures = h.out.split('\n').filter(l => /rank agreement with 2025|mean wins of the clubs|the spread of the 32|opening club strength|among the fifteen highest rated/.test(l)).map(l => l.trim().slice(0, 150));
      {
        const scale = {};
        for (const line of fs.readFileSync(DATA[0], 'utf8').split('\n')) { const m = line.match(/pos: '(QB|RB|WR|TE)', age: \d+, ovr: (\d+),/); if (m) (scale[m[1]] ??= []).push(Number(m[2])); }
        row.fifteen = Object.fromEntries(Object.entries(scale).map(([pos, v]) => { const mean = v.reduce((a, b) => a + b, 0) / v.length; return [pos, `${mean.toFixed(2)} sd ${Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / v.length).toFixed(2)} n ${v.length}`]; }));
      }
      if (process.env.MUT_FAST) { for (const [f, bytes] of original) fs.writeFileSync(f, bytes); results.push(row); console.log(`\n=== ${m.name} ===\n` + JSON.stringify(row, null, 1)); continue; }
      const json = path.join(OUT, `suite-${m.name}.json`);
      const s = run(`node_modules/.bin/vitest run src/lib/frontOfficeRatings.test.ts --reporter=json --outputFile=${json}`);
      let failed = ['(no json)'];
      try { const j = JSON.parse(fs.readFileSync(json, 'utf8')); failed = j.testResults.flatMap(t => t.assertionResults).filter(a => a.status !== 'passed').map(a => a.title.slice(0, 110)); row.suiteTotal = j.numTotalTests; fs.rmSync(json); } catch { /* keep the marker */ }
      row.suite = { exit: s.exit, failed };
      const r = run('node scripts/simFrontOfficeRoster.mjs'); row.roster = { exit: r.exit, last: lastLine(r.out).slice(0, 160) };
      const n = run('node scripts/simNflFullRosters.mjs'); row.fullRosters = { exit: n.exit, last: lastLine(n.out).slice(0, 160) };
    }
  } catch (e) { row.error = String(e.message).slice(0, 300); }
  for (const [f, bytes] of original) fs.writeFileSync(f, bytes);
  row.restored = run('git status --porcelain --untracked-files=no -- scripts/lib scripts/genFrontOfficeRoster.mjs src/data').out.trim() === '';
  results.push(row);
  console.log(`\n=== ${m.name} (rebake ${m.regen ? 'yes' : 'no'}) ===`);
  console.log(JSON.stringify(row, null, 1));
}
fs.writeFileSync(path.join(OUT, 'mutations.json'), JSON.stringify(results, null, 1));
console.log(`\nmutations run: ${results.length}`);
