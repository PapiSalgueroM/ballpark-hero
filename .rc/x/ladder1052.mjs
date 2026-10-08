// Round 1052 (never committed): the attribution ladder for the rules digest, run from the repo root.
//   node ladder1052.mjs <outDir>
// Builds throwaway copies of src under .legs/, takes the digest of each with the harness's own root override,
// and prints which hashes of each part moved between one leg and the next.
//   leg1  the whole round out of the world (the league row, its rules row, its nation, both spreads of the join)
//         and the two name bank edits undone: must reproduce the committed baseline in every part
//   leg1b the same with the two name bank edits back in (the scout surname, the era filler's list)
//   leg2  the join back in, the rows still out
//   leg3  the tree as it is
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const OUT = path.resolve(process.argv[2]);
fs.mkdirSync(OUT, { recursive: true });
const ROOT = process.cwd();
const BASELINE = path.join(ROOT, 'scripts/data/cmLeagueRulesDigest.json');
const baseText = fs.readFileSync(BASELINE, 'utf8');
const base = JSON.parse(baseText).parts;
const LEAGUES = (process.env.LADDER_LEAGUES || 'russia').split(',');
const NATIONS = (process.env.LADDER_NATIONS || 'russia').split(',');
const PREFIXES = (process.env.LADDER_PREFIXES || 'RUSSIA').split(',');

function once(text, from, to, what) {
  const n = text.split(from).length - 1;
  if (n !== 1) throw new Error(`${what}: anchor found ${n} times`);
  return text.replace(from, to);
}
function cutBlock(text, startMarker, endMarker, what) {
  const a = text.indexOf(startMarker);
  if (a < 0 || text.indexOf(startMarker, a + 1) >= 0) throw new Error(`${what}: start marker not found exactly once`);
  const b = text.indexOf(endMarker, a);
  if (b < 0) throw new Error(`${what}: end marker missing`);
  return text.slice(0, a) + text.slice(b + endMarker.length);
}
function makeLeg(name, { rowsOut, joinOut, banksOut }) {
  const dir = path.join(ROOT, '.legs', name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  fs.cpSync(path.join(ROOT, 'src'), path.join(dir, 'src'), { recursive: true });
  const enginePath = path.join(dir, 'src/lib/clubManager.ts');
  let eng = fs.readFileSync(enginePath, 'utf8').split('\r\n').join('\n');
  if (rowsOut) {
    for (const id of LEAGUES) {
      eng = cutBlock(eng, `\n  ${id}: {\n`, `\n  },`, `rules row ${id}`);
      eng = cutBlock(eng, `\n  {\n    id: '${id}',`, `\n  },`, `league row ${id}`);
    }
    for (const id of NATIONS) eng = cutBlock(eng, `\n  { id: '${id}', name: `, ` },`, `nation ${id}`);
  }
  if (banksOut) eng = once(eng, "'Brennan', 'Brankov', 'Delgado',", "'Brennan', 'Kovac', 'Delgado',", 'scout bank');
  fs.writeFileSync(enginePath, eng);
  if (banksOut) {
    const p = path.join(dir, 'src/lib/clubManagerEras.ts');
    fs.writeFileSync(p, once(fs.readFileSync(p, 'utf8').split('\r\n').join('\n'), "\n  'Ismael Silva',\n", '\n', 'era filler list'));
  }
  if (joinOut) {
    const p = path.join(dir, 'src/data/clubManagerWorldRosters.ts');
    let t = fs.readFileSync(p, 'utf8').split('\r\n').join('\n');
    for (const pre of PREFIXES) {
      t = once(t, `, ...CM_${pre}_ROSTERS`, '', `roster spread ${pre}`);
      t = once(t, `, ...CM_${pre}_PARTIAL`, '', `partial spread ${pre}`);
    }
    fs.writeFileSync(p, t);
  }
  return dir;
}
function digestOf(name, dir) {
  let ok = true;
  try {
    execFileSync('node', ['scripts/simCmLeagueRules.mjs', '--part=modern,eras,pure', '--write'], { cwd: ROOT, env: { ...process.env, ...(dir ? { CM_RULES_ROOT: dir } : {}) }, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
  } catch (e) { ok = false; console.log(`${name}: the harness exited ${e.status}: ${(e.stdout || '').split('\n').slice(-4).join(' / ')} ${(e.stderr || '').split('\n').slice(-3).join(' / ')}`); }
  const text = fs.readFileSync(BASELINE, 'utf8');
  fs.writeFileSync(path.join(OUT, `digest-${name}.json`), text);
  fs.writeFileSync(BASELINE, baseText);
  return { ok, parts: JSON.parse(text).parts, text };
}
function diff(a, b) {
  const out = {};
  for (const part of ['modern', 'eras', 'pure']) {
    const A = a[part] ?? {}; const B = b[part] ?? {};
    const moved = Object.keys(A).filter(k => k in B && JSON.stringify(A[k]) !== JSON.stringify(B[k]));
    const added = Object.keys(B).filter(k => !(k in A));
    const gone = Object.keys(A).filter(k => !(k in B));
    out[part] = { keys: Object.keys(B).length, moved: moved.length, added, gone, movedKeys: moved };
  }
  return out;
}
const show = (label, d) => console.log(`${label}: ` + ['modern', 'eras', 'pure'].map(p => `${p} ${d[p].keys} keys, ${d[p].moved} moved, +${d[p].added.length} -${d[p].gone.length}${d[p].added.length ? ' (added ' + d[p].added.join(', ') + ')' : ''}`).join(' | '));

const legs = {};
legs.leg1 = digestOf('leg1', makeLeg('leg1', { rowsOut: true, joinOut: true, banksOut: true }));
legs.leg1b = digestOf('leg1b', makeLeg('leg1b', { rowsOut: true, joinOut: true, banksOut: false }));
legs.leg2 = digestOf('leg2', makeLeg('leg2', { rowsOut: true, joinOut: false, banksOut: false }));
legs.leg3 = digestOf('leg3', null);
const d1 = diff(base, legs.leg1.parts); const d1b = diff(legs.leg1.parts, legs.leg1b.parts); const d2 = diff(legs.leg1b.parts, legs.leg2.parts); const d3 = diff(legs.leg2.parts, legs.leg3.parts); const dAll = diff(base, legs.leg3.parts);
show('leg 1  (round out of the world, bank edits undone) against the committed baseline', d1);
console.log('leg 1 file byte identical to the baseline: ' + (legs.leg1.text.split('\r\n').join('\n') === baseText.split('\r\n').join('\n')));
show('leg 1b (the two name bank edits in) against leg 1', d1b);
show('leg 2  (the join in, the rows out) against leg 1b', d2);
show('leg 3  (the tree as it is) against leg 2', d3);
show('whole  (the tree as it is) against the committed baseline', dAll);
fs.writeFileSync(path.join(OUT, 'ladder.json'), JSON.stringify({ d1, d1b, d2, d3, dAll }, null, 1));
for (const p of ['modern', 'eras', 'pure']) if (d1b[p].moved) console.log(`  leg 1b ${p} moved: ${d1b[p].movedKeys.join(', ')}`);
for (const p of ['modern', 'eras', 'pure']) if (d2[p].moved) console.log(`  leg 2 ${p} moved: ${d2[p].movedKeys.join(', ')}`);
for (const p of ['pure']) if (dAll[p].moved) console.log(`  PURE KEYS MOVED (a rule changed): ${dAll[p].movedKeys.join(', ')}`);

/* ---------- the derby board: a full snapshot of the base world (leg 1) and of the tree as it is ---------- */
{
  const LINE = "console.log('board rivals', Object.keys(snap).length, sha(sortedJson(snap)));";
  const src = fs.readFileSync(path.join(ROOT, 'scripts/simCareerDerbies.mjs'), 'utf8');
  if (src.split(LINE).length !== 2) throw new Error('the derby harness record line was not found exactly once');
  const patched = src.replace(LINE, LINE + " fs.writeFileSync(process.env.DERBY_SNAP_OUT, JSON.stringify(snap));");
  const run = (scriptDir, outFile) => {
    fs.mkdirSync(path.join(scriptDir, 'lib'), { recursive: true });
    if (path.resolve(scriptDir) !== path.join(ROOT, 'scripts')) {
      fs.cpSync(path.join(ROOT, 'scripts/lib'), path.join(scriptDir, 'lib'), { recursive: true });
      fs.cpSync(path.join(ROOT, 'scripts/data'), path.join(scriptDir, 'data'), { recursive: true });
    }
    const file = path.join(scriptDir, '__derbyRecord1052.mjs');
    fs.writeFileSync(file, patched);
    let out = '';
    try { out = execFileSync('node', [file, '--record'], { cwd: path.dirname(scriptDir), env: { ...process.env, DERBY_SNAP_OUT: outFile }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
    catch (e) { out = `EXIT ${e.status} ${(e.stdout || '').slice(-300)} ${(e.stderr || '').slice(-300)}`; }
    fs.rmSync(file, { force: true });
    return out.trim().split('\n').join(' | ');
  };
  const baseOut = path.join(OUT, 'derby-board-base.json'); const nowOut = path.join(OUT, 'derby-board-now.json');
  console.log('derby board, the round out of the world: ' + run(path.join(ROOT, '.legs/leg1/scripts'), baseOut));
  console.log('derby board, the tree as it is:          ' + run(path.join(ROOT, 'scripts'), nowOut));
  if (fs.existsSync(baseOut) && fs.existsSync(nowOut)) {
    const a = JSON.parse(fs.readFileSync(baseOut, 'utf8')); const b = JSON.parse(fs.readFileSync(nowOut, 'utf8'));
    const changed = Object.keys(a).filter(k => k in b && JSON.stringify(a[k]) !== JSON.stringify(b[k]));
    const dropped = Object.keys(a).filter(k => !(k in b));
    const added = Object.keys(b).filter(k => !(k in a));
    console.log(`derby board: ${Object.keys(a).length} clubs before, ${Object.keys(b).length} now; changed ${changed.length} ${changed.slice(0, 8).join(', ')}; dropped ${dropped.length}; added ${added.length}`);
    for (const k of added) console.log(`   + ${k}: ${JSON.stringify(b[k])}`);
  }
}

process.exit(d1.modern.moved + d1.eras.moved + d1.pure.moved + dAll.pure.moved + dAll.pure.gone.length ? 1 : 0);
