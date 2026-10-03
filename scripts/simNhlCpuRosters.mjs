/* Actual owner-enabled NHL CPU roster decisions and physical two-argument baseline. */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const engine = 'src/lib/nhlFrontOffice.ts', fixture = 'src/test/NhlCpuRosters.outcomes.ts';
const files = [engine, fixture, 'scripts/simNhlCpuRosters.mjs', 'src/lib/frontOfficeCuts.ts', 'src/lib/frontOfficeSave.ts', 'src/lib/foSchedule.ts', 'src/lib/entityIds.ts', 'src/lib/foNames.ts', 'src/data/nhlFoPlayers.ts', 'src/data/nhlOpeningRatings.ts'];
const holdSource = bytes => ({ bytes, source: bytes.toString('utf8').replaceAll('\r\n', '\n') });
const held = new Map(await Promise.all(files.map(async file => [file, holdSource(await readFile(path.join(root, file)))])));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const source = held.get(engine).source, test = held.get(fixture).source;
const titles = [...test.matchAll(/^ \['([^']+)', \(\) =>/gm)].map(m => m[1]);
assert.equal(titles.length, 8, 'Eight complete outcome bodies are bound');
const original = spawnSync('git', ['show', 'd14814c9:' + engine], { cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
assert.ok(!original.error && !original.signal); assert.equal(original.status, 0, 'Physical before-cuts engine exists');
const before = original.stdout.replaceAll('\r\n', '\n');
assert.equal(hash(before), '6e1a5eb77a318b1caeca09e156eb7b8b008fcbfdecc8ee1e91b971b14d2a3f28', 'Immutable before-cuts engine');
const block = "  if (typeof userTeam === 'string' && Object.prototype.hasOwnProperty.call(league.teams, userTeam)) {\n    let released = false;\n    for (const t of Object.values(league.teams)) {\n      if (t.abbr === userTeam) continue;\n      while (t.players.length > NHL_ROSTER_MAX) {\n        const selected = nhlContributors(t);\n        const protectedIds = new Set([...selected.forwards, ...selected.defense, ...(selected.goalie === null ? [] : [selected.goalie])]);\n        const down = t.players.filter(p => !protectedIds.has(p.id))\n          .sort((a, b) => a.ovr - b.ovr || b.age - a.age || a.name.localeCompare(b.name))[0];\n        if (!down || !nhlRelease(t, league.freeAgents, down.id, league.ratingModelVersion)) break;\n        released = true;\n      }\n    }\n    if (released) league.freeAgents = league.freeAgents.sort((a, b) => b.ovr - a.ovr).slice(0, 30);\n  }\n";
const replace = (text, anchor, value) => { assert.equal(text.split(anchor).length - 1, 1, 'Exact executable control anchor'); assert.notEqual(anchor, value); const changed = text.replace(anchor, value); assert.notEqual(changed, text); return changed; };
const controls = {
  omit: [text => replace(text, block, ''), [2, 3, 4, 6]],
  human: [text => replace(text, '      if (t.abbr === userTeam) continue;\n', ''), [5]],
  preferences: [text => replace(text, '        const protectedIds = new Set([...selected.forwards, ...selected.defense, ...(selected.goalie === null ? [] : [selected.goalie])]);', '        const protectedIds = new Set<string>();'), [3, 4, 6]],
  waiver: [text => replace(text, '        if (!down || !nhlRelease(t, league.freeAgents, down.id, league.ratingModelVersion)) break;', '        if (!down) break;\n        t.players.splice(t.players.findIndex(p => p.id === down.id), 1);\n        league.freeAgents.push({ ...down, years: 1 });'), [2, 3, 4, 6]],
  earlyRoll: [text => {
    let changed = replace(text, block, '');
    const inner = block.slice(block.indexOf('      while (t.players.length > NHL_ROSTER_MAX) {'), block.lastIndexOf('    }')).split('\n').filter(Boolean).map(line => line.slice(2)).join('\n');
    changed = replace(changed, '  const taken = leagueNames(league);', '  const taken = leagueNames(league);\n  let released = false;');
    changed = replace(changed, '    rollDeadCap(t);\n', "    if (typeof userTeam === 'string' && Object.prototype.hasOwnProperty.call(league.teams, userTeam) && t.abbr !== userTeam) {\n" + inner + '\n    }\n    rollDeadCap(t);\n');
    return replace(changed, '  league.cap = Math.round(league.cap * 1.09);', '  if (released) league.freeAgents = league.freeAgents.sort((a, b) => b.ovr - a.ovr).slice(0, 30);\n  league.cap = Math.round(league.cap * 1.09);');
  }, [2, 3, 4, 6]],
  earlyAge: [text => replace(replace(text, block, ''), '  league.freeAgents = league.freeAgents.sort((a, b) => b.ovr - a.ovr).slice(0, 30);\n', block + '  league.freeAgents = league.freeAgents.sort((a, b) => b.ovr - a.ovr).slice(0, 30);\n'), [3, 4]],
  order: [text => replace(text, '.sort((a, b) => a.ovr - b.ovr || b.age - a.age || a.name.localeCompare(b.name))[0];', '.sort((a, b) => b.ovr - a.ovr || b.age - a.age || a.name.localeCompare(b.name))[0];'), [2, 3, 4, 6]],
  pool: [text => replace(text, '    if (released) league.freeAgents = league.freeAgents.sort((a, b) => b.ovr - a.ovr).slice(0, 30);\n', ''), [3, 4]],
  quote: [text => replace(text, 'nhlRelease(t, league.freeAgents, down.id, league.ratingModelVersion)', 'nhlRelease(t, league.freeAgents, down.id)'), [3, 4]],
  owner: [text => replace(text, 'Object.prototype.hasOwnProperty.call(league.teams, userTeam)', 'userTeam in league.teams'), [0]],
};
const mode = process.env.NHL_CPU_ROSTERS_CONTROL || '';
assert.ok(!mode || mode === 'all' || Object.hasOwn(controls, mode), 'Known CPU roster control');
const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
assert.equal(code.split(block).length - 1, 1, 'Actual cut block is executable code');
for (const [change] of Object.values(controls)) assert.notEqual(change(source), source, 'Every declared copied control changes source');
const parent = path.join(root, '.sim-control'); await mkdir(parent, { recursive: true });
const folder = await mkdtemp(path.join(parent, 'nhl-cpu969-'));
const receipts = await mkdtemp(path.join(os.tmpdir(), 'dukb-nhl969-proof-'));
const rows = [];
try {
  for (const current of mode === 'all' ? ['', ...Object.keys(controls)] : [mode]) {
    const imports = text => text.replace(/(from\s+['"])\.\/([^'"]+)(['"])/g, '$1@/lib/$2$3');
    await writeFile(path.join(folder, 'Engine.ts'), imports(current ? controls[current][0](source) : source));
    await writeFile(path.join(folder, 'Original.ts'), imports(before));
    await writeFile(path.join(folder, 'entry.ts'), `export {run} from '${path.join(root, fixture).replaceAll('\\', '/')}';\nexport * as reference from './Original';\n`);
    const compiled = await build({ entryPoints: [path.join(folder, 'entry.ts')], outfile: path.join(folder, 'product.mjs'), bundle: true, platform: 'node', format: 'esm', packages: 'external', logLevel: 'silent', metafile: true, alias: { '@/lib/nhlFrontOffice': path.join(folder, 'Engine.ts'), '@': path.join(root, 'src') } });
    assert.ok(!Object.keys(compiled.metafile.inputs).some(file => /supabase|fetchPlayers|useAuth/.test(file)), 'Offline engine proof has no data transport');
    await writeFile(path.join(receipts, (current || 'normal') + '-metafile.json'), JSON.stringify(compiled.metafile, null, 2));
    await writeFile(path.join(folder, 'runner.mjs'), "import fs from 'node:fs';\nimport {run,reference} from './product.mjs';\nconst report=run(reference);fs.writeFileSync(process.env.NHL_CPU_ROSTERS_REPORT,JSON.stringify(report,null,2));for(const row of report.rows)console.log(row.status+': '+row.title);process.exitCode=report.failed?1:0;\n");
    const reportFile = path.join(receipts, (current || 'normal') + '.json'), transport = path.join(receipts, (current || 'normal') + '-transport.txt');
    const child = spawnSync(process.execPath, ['--max-old-space-size=3072', '--require', path.join(root, 'scripts/lib/offlineTransport.cjs'), path.join(folder, 'runner.mjs')], { cwd: root, env: { ...process.env, NHL_CPU_ROSTERS_REPORT: reportFile, SIM_OFFLINE_RECEIPT: transport }, encoding: 'utf8', timeout: 90000, maxBuffer: 16 * 1024 * 1024, windowsHide: true });
    const name = current || 'normal', output = (child.stdout || '') + '\n' + (child.stderr || '');
    await writeFile(path.join(receipts, name + '.log'), output);
    await writeFile(path.join(receipts, name + '-child.json'), JSON.stringify({ status: child.status, signal: child.signal, error: child.error?.message ?? null }, null, 2));
    assert.ok(!child.error && !child.signal, 'Bounded actual engine child completes');
    assert.doesNotMatch(output, /SIM_OFFLINE_BLOCK|Unhandled (?:Error|Rejection)|SyntaxError|TypeError|ReferenceError|Cannot find module|Transform failed/);
    const report = JSON.parse(await readFile(reportFile, 'utf8')), expected = current ? controls[current][1] : [];
    const rejected = report.rows.flatMap((row, index) => row.status === 'FAIL' ? [index] : []);
    rows.push({ mode: name, expected, rejected, status: child.status, report: reportFile });
    assert.equal(report.total, 8); assert.equal(report.rows.length, 8); assert.deepEqual(report.rows.map(row => row.title), titles);
    assert.ok(report.rows.every(row => ['PASS', 'FAIL'].includes(row.status)), 'All eight outcomes execute without skips');
    assert.deepEqual(rejected, expected, 'Exact observed meaningful control map'); assert.equal(report.failed, expected.length); assert.equal(report.passed, 8 - expected.length);
    assert.equal(child.status, expected.length ? 1 : 0);
    for (const row of report.rows.filter(row => row.status === 'FAIL')) assert.equal(row.error.name, 'AssertionError', 'Copied controls reject assertions, never crashes');
    for (const index of [1, 7]) assert.equal(report.rows[index].status, 'PASS', 'No-cut and existing age-path baselines stay held');
    try { assert.equal((await readFile(transport, 'utf8')).trim(), '', 'No outside transport'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    for (const [file, { bytes }] of held) {
      const currentBytes = await readFile(path.join(root, file));
      assert.deepEqual(currentBytes, bytes, 'Source bytes held: ' + file);
    }
    console.log('simNhlCpuRosters ' + name + ':8 outcomes, ' + expected.length + ' exact assertion rejects, ' + (8 - expected.length) + ' held.');
  }
  await writeFile(path.join(receipts, 'verified-summary.json'), JSON.stringify({ rows, reference: { commit: 'd14814c9', engineNormalizedSha256: hash(before) }, sourceHashes: Object.fromEntries([...held].map(([file, { bytes }]) => [file, hash(bytes)])), limits: 'Eight engine outcomes. Actual seed17 season/draft and human trade/four-choice paths use unchanged constructor data; directed CPU rosters, market and salaries are labelled fictional test fixtures. Exact single-offseason RNG, actual waivers and JSON identity, not historical data verification, global multiyear RNG equality, advanced AI, native input or a completed browser season. Actual Board owner-forwarding proof is separate.' }, null, 2));
  console.log('simNhlCpuRosters passed: ' + receipts);
} finally {
  assert.ok(folder.startsWith(path.join(parent, 'nhl-cpu969-')), 'Cleanup stays inside owned disposable folder');
  await rm(folder, { recursive: true, force: true });
}
