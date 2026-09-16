/* Position labels must show the actual season fields produced by NFL My Career.
   Offline: bundles the real engine, extracts the board's executable formatter,
   and proves the old receiving fallback fails for every defensive/kicking role. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import ts from 'typescript';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BOARD = path.join(ROOT, 'src/components/nfl-my-career/NflMyCareerBoard.tsx');
let scratch;
const source = fs.readFileSync(BOARD, 'utf8');
const parsed = ts.createSourceFile(BOARD, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const found = [];
const hubFound = [];
function visit(node) {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'statLine') found.push(node.initializer);
  if (ts.isJsxExpression(node) && node.expression && ts.isConditionalExpression(node.expression)
    && node.expression.condition.getText(parsed) === 'nflDefenseOrKickingLine(totals, career.pos) != null') hubFound.push(node.expression);
  ts.forEachChild(node, visit);
}
visit(parsed);
assert.equal(found.length, 1, 'exactly one executable board statLine');
const expression = found[0].getText(parsed);
assert.equal(hubFound.length, 1, 'exactly one executable career summary');
const hubExpression = hubFound[0].getText(parsed);
const engineSource = fs.readFileSync(path.join(ROOT, 'src/lib/nflMyCareer.ts'), 'utf8');
const engineParsed = ts.createSourceFile('nflMyCareer.ts', engineSource, ts.ScriptTarget.Latest, true);
function functionSource(name) {
  const matches = engineParsed.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  assert.equal(matches.length, 1, `one executable ${name}`);
  return matches[0].getText(engineParsed);
}
const helperSource = functionSource('nflDefenseOrKickingLine');
const totalsSource = functionSource('careerTotals');
const legacySource = functionSource('legacyOf');
function compile(code, binding = {}) {
  const compiled = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exported = {};
  new Function('exports', ...Object.keys(binding), compiled)(exported, ...Object.values(binding));
  return exported;
}
let actualHelper;
function formatter(expr, helper = actualHelper) {
  return compile(`export default ${expr};`, { nflDefenseOrKickingLine: helper }).default;
}
const old = `(s, p) => s.teamResult === 'SUSPENDED' ? 'Suspended, no season played'
  : p === 'QB' ? \`\${s.passYds} yds, \${s.passTd} TD, \${s.ints} INT\`
  : p === 'RB' ? \`\${s.rushYds} rush yds, \${s.rushTd} TD, \${s.rec} rec\`
  : \`\${s.rec} rec, \${s.recYds} yds, \${s.recTd} TD\``;
const oldFormatter = formatter(old);
// Frozen pre-repair production/legacy oracle from a96ed002, independent of new fields.
const oldTotals = c => {
  const t = { passYds: 0, passTd: 0, ints: 0, rushYds: 0, rushTd: 0, rec: 0, recYds: 0, recTd: 0 };
  for (const s of c.seasons) {
    t.passYds += s.passYds ?? 0; t.passTd += s.passTd ?? 0; t.ints += s.ints ?? 0;
    t.rushYds += s.rushYds ?? 0; t.rushTd += s.rushTd ?? 0;
    t.rec += s.rec ?? 0; t.recYds += s.recYds ?? 0; t.recTd += s.recTd ?? 0;
  }
  return t;
};
function oldLegacy(c) {
  const totals = oldTotals(c);
  let score = c.rings * 80 + c.mvps * 230 + c.allPros * 150 + c.seasons.length * 11;
  if (c.pos === 'QB') score += totals.passYds / 800 + totals.passTd * 0.5;
  if (c.pos === 'RB') score += totals.rushYds / 120;
  if (c.pos === 'WR') score += totals.recYds / 140;
  score = Math.round(score);
  const hof = score >= 520;
  const verdict = score >= 900 ? 'Inner-circle, first-ballot immortal'
    : score >= 520 ? 'Hall of Famer'
    : score >= 340 ? 'Ring of Honor type, Canton borderline'
    : score >= 180 ? 'A long, proud career'
    : 'A cup of coffee in the league';
  const bullets = [
    `${c.seasons.length} seasons, ${c.rings} ring${c.rings === 1 ? '' : 's'}, ${c.mvps} MVP${c.mvps === 1 ? '' : 's'}, ${c.allPros} All-Pro nod${c.allPros === 1 ? '' : 's'}`,
    c.pos === 'QB' ? `${totals.passYds.toLocaleString()} passing yards, ${totals.passTd} touchdowns`
      : c.pos === 'RB' ? `${totals.rushYds.toLocaleString()} rushing yards, ${totals.rushTd} touchdowns`
      : `${totals.rec} catches for ${totals.recYds.toLocaleString()} yards, ${totals.recTd} touchdowns`,
    `${Math.round(c.earnings)}M career earnings, drafted pick ${c.draftPick}`,
  ];
  return { score, verdict, hof, bullets };
}
function model(overrides = {}) {
  const helper = compile(overrides.helper ?? helperSource).nflDefenseOrKickingLine;
  const totals = compile(overrides.totals ?? totalsSource).careerTotals;
  const legacy = compile(overrides.legacy ?? legacySource, { careerTotals: totals, nflDefenseOrKickingLine: helper }).legacyOf;
  return { helper, totals, legacy, hub: formatter(`(career, totals) => (${overrides.hub ?? hubExpression})`, helper) };
}
const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'LB', 'CB', 'EDGE'];
const labels = {
  K: { pattern: /^(\d+)\/(\d+) FG, long (\d+) yds$/, fields: ['fgMade', 'fgAtt', 'longFg'] },
  LB: { pattern: /^(\d+) tackles, ([\d.]+) sacks, (\d+) INT, (\d+) forced fumbles$/, fields: ['tackles', 'sacks', 'picks', 'forcedFum'] },
  CB: { pattern: /^(\d+) tackles, (\d+) INT, (\d+) passes defended, (\d+) forced fumbles$/, fields: ['tackles', 'picks', 'passDef', 'forcedFum'] },
  EDGE: { pattern: /^([\d.]+) sacks, (\d+) tackles, (\d+) forced fumbles, (\d+) passes defended$/, fields: ['sacks', 'tackles', 'forcedFum', 'passDef'] },
};
const rng = seed => () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
const rows = [];
const careers = [];
function checkRole(fn, pos) {
  for (const row of rows.filter(r => r.pos === pos)) {
    const text = fn(row.line, pos);
    const mapping = labels[pos];
    if (!mapping) assert.equal(text, oldFormatter(row.line, pos), `${pos} existing offense text`);
    else {
      const match = text.match(mapping.pattern);
      assert.ok(match, `${pos} actual season labels: ${text}`);
      assert.deepEqual(match.slice(1).map(Number), mapping.fields.map(f => row.line[f]), `${pos} actual season values`);
    }
  }
}
function missing(fn) {
  for (const [pos, mapping] of Object.entries(labels)) {
    const text = fn({ games: 5, teamResult: 'Missed the playoffs' }, pos);
    const expected = pos === 'K' ? 2 : mapping.fields.length;
    assert.equal((text.match(/not recorded/g) ?? []).length, expected, `${pos} missing fields stay unrecorded`);
    assert.ok(!/undefined|NaN/.test(text), `${pos} missing fields remain readable`);
  }
}
function suspended(fn) {
  for (const pos of positions) assert.equal(fn({ games: 0, teamResult: 'SUSPENDED' }, pos), 'Suspended, no season played', `${pos} suspension has no fabricated stats`);
}
function noMade(fn) {
  assert.equal(fn({ games: 17, fgMade: 0, fgAtt: 2, longFg: 70 }, 'K'), '0/2 FG', 'no longest made kick without a made field goal');
  assert.equal(fn({ games: 0, fgMade: 1, fgAtt: 1, longFg: 70 }, 'K'), '1/1 FG', 'unplayed line has no longest kick illustration');
}
function once(text, before, after) {
  assert.equal(text.split(before).length, 2, `control anchor unique: ${before}`);
  const changed = text.replace(before, after);
  assert.notEqual(changed, text, 'control changes executable source');
  return changed;
}
function prove(name, mutated, check, intended) {
  assert.notEqual(mutated, expression, `${name} changed formatter`);
  assert.throws(() => check(formatter(mutated)), error => error.code === 'ERR_ASSERTION' && error.message.includes(intended), `${name} must fail its intended outcome`);
  console.log(`CONTROL PROVED ${name}: ${intended}`);
}
function proveHelper(name, mutated, check, intended) {
  assert.notEqual(mutated, helperSource, `${name} changed helper`);
  const helper = compile(mutated).nflDefenseOrKickingLine;
  assert.throws(() => check(formatter(expression, helper)), e => e.code === 'ERR_ASSERTION' && e.message.includes(intended), `${name} intended outcome`);
  console.log(`CONTROL PROVED ${name}: ${intended}`);
}
const counting = ['tackles', 'sacks', 'picks', 'passDef', 'forcedFum', 'fgMade', 'fgAtt'];
function aggregate(m) {
  for (const c of careers) {
    const t = m.totals(c);
    assert.deepEqual(Object.fromEntries(Object.keys(oldTotals(c)).map(k => [k, t[k]])), oldTotals(c), 'original offense totals stay identical');
    for (const key of counting) {
      const recorded = c.seasons.map(s => s[key]).filter(v => v != null);
      let expected = recorded.length ? recorded.reduce((sum, v) => sum + v, 0) : undefined;
      if (key === 'sacks' && expected != null) expected = Math.round(expected * 10) / 10;
      assert.equal(t[key], expected, `recorded ${key} career total`);
    }
  }
  const line = { games: 17, teamResult: 'Missed the playoffs' };
  const fractional = m.totals({ seasons: [{ ...line, sacks: 0.7 }, { ...line, sacks: 1.2 }] });
  assert.equal(fractional.sacks, 1.9, 'fractional sacks remain one decimal');
  const kicks = [
    { ...line, fgMade: 20, fgAtt: 25, longFg: 52 },
    { ...line, fgMade: 23, fgAtt: 26, longFg: 58 },
    { ...line, fgMade: 0, fgAtt: 2, longFg: 91 },
    { ...line, games: 0, fgMade: 1, fgAtt: 1, longFg: 88 },
    { ...line, teamResult: 'SUSPENDED', fgMade: 1, fgAtt: 1, longFg: 96 },
  ];
  assert.equal(m.totals({ seasons: kicks }).longFg, 58, 'longest is maximum of made, played, nonsuspended seasons');
  const missing = m.totals({ seasons: [line] });
  for (const key of [...counting, 'longFg']) assert.equal(missing[key], undefined, `missing history ${key} stays unrecorded`);
  const zeros = m.totals({ seasons: [{ ...line, tackles: 0, sacks: 0, picks: 0, passDef: 0, forcedFum: 0, fgMade: 0, fgAtt: 0 }] });
  for (const key of counting) assert.equal(zeros[key], 0, `recorded zero ${key} stays zero`);
  for (const seasons of [[], [{ games: 0, teamResult: 'SUSPENDED' }]]) {
    for (const key of counting) assert.equal(m.totals({ seasons })[key], 0, `no played season means zero ${key}`);
  }
}
function presentation(m) {
  for (const c of careers) {
    const totals = m.totals(c);
    for (const rings of [0, 4, 9]) {
      const specimen = { ...c, rings };
      const before = oldLegacy(specimen);
      const after = m.legacy(specimen);
      assert.deepEqual({ score: after.score, verdict: after.verdict, hof: after.hof }, { score: before.score, verdict: before.verdict, hof: before.hof }, 'legacy score verdict hof unchanged');
      assert.equal(after.bullets[0], before.bullets[0], 'career honors text unchanged');
      assert.equal(after.bullets[2], before.bullets[2], 'career earnings text unchanged');
      if (!labels[c.pos]) assert.deepEqual(after.bullets, before.bullets, `${c.pos} retirement offense text unchanged`);
      else {
        for (const [surface, text] of [['hub', m.hub(c, totals)], ['retirement', after.bullets[1]]]) {
          assert.ok(text.startsWith('Recorded totals: '), `${surface} marks recorded totals`);
          const match = text.slice('Recorded totals: '.length).match(labels[c.pos].pattern);
          assert.ok(match, `${surface} ${c.pos} actual position labels`);
          assert.deepEqual(match.slice(1).map(Number), labels[c.pos].fields.map(key => totals[key]), `${surface} ${c.pos} actual production values`);
        }
      }
    }
    if (!labels[c.pos]) {
      const expected = c.pos === 'QB' ? `${totals.passYds.toLocaleString()} pass yds` : c.pos === 'RB' ? `${totals.rushYds.toLocaleString()} rush yds` : `${totals.recYds.toLocaleString()} rec yds`;
      assert.equal(m.hub(c, totals), expected, `${c.pos} hub offense text unchanged`);
    } else {
      const oldSave = { ...c, seasons: [{ games: 10, teamResult: 'Missed the playoffs' }] };
      for (const text of [m.hub(oldSave, m.totals(oldSave)), m.legacy(oldSave).bullets[1]]) {
        assert.ok(text.includes('not recorded'), `${c.pos} incomplete career remains explicitly unrecorded`);
        assert.ok(!/undefined|NaN/.test(text), `${c.pos} incomplete career readable`);
      }
    }
  }
}
function proveModel(name, changes, check, intended) {
  assert.ok(Object.entries(changes).some(([k, v]) => v !== ({ helper: helperSource, totals: totalsSource, legacy: legacySource, hub: hubExpression })[k]), `${name} changes source`);
  assert.throws(() => check(model(changes)), e => e.code === 'ERR_ASSERTION' && e.message.includes(intended), `${name} intended outcome`);
  console.log(`CONTROL PROVED ${name}: ${intended}`);
}

try {
  scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-nfl-stat-display-'));
  const output = path.join(scratch, 'engine.mjs');
  await build({ absWorkingDir: ROOT, entryPoints: ['src/lib/nflMyCareer.ts'], bundle: true, format: 'esm', platform: 'node', outfile: output, alias: { '@': path.join(ROOT, 'src') }, logLevel: 'error' });
  const engine = await import(pathToFileURL(output).href);
  actualHelper = engine.nflDefenseOrKickingLine;
  for (const [i, pos] of positions.entries()) {
    const roll = rng(601 + i * 100);
    const career = engine.startCareer(`Fixture ${pos}`, pos, engine.ARCHETYPES[pos][0], roll, null);
    for (let season = 0; season < 3; season++) {
      const { line } = engine.simSeason(career, 82, roll);
      assert.equal(career.seasons.at(-1), line, 'fixture is the committed engine season');
      rows.push({ pos, line });
      engine.progress(career, roll);
    }
    careers.push(career);
  }
  const real = formatter(expression);
  for (const pos of positions) { checkRole(real, pos); console.log(`PASS ${pos}: 3 real engine season lines`); }
  missing(real); suspended(real); noMade(real);
  console.log('PASS missing fields, suspension and made-kick eligibility');
  const realModel = { ...model(), totals: engine.careerTotals, legacy: engine.legacyOf };
  aggregate(realModel); presentation(realModel);
  console.log('PASS recorded career totals, zero/missing history and fractional sacks');
  console.log('PASS real hub/retirement labels and frozen offense/legacy score oracle');
  for (const pos of Object.keys(labels)) prove(`old-${pos.toLowerCase()}`, old, f => checkRole(f, pos), `${pos} actual season labels`);
  proveHelper('kicker-values', once(helperSource, "${s.fgMade ?? 'not recorded'}/", "${s.fgAtt ?? 'not recorded'}/"), f => checkRole(f, 'K'), 'K actual season values');
  proveHelper('linebacker-values', once(helperSource, "${s.sacks ?? 'not recorded'} sacks, ${s.picks", "${s.tackles ?? 'not recorded'} sacks, ${s.picks"), f => checkRole(f, 'LB'), 'LB actual season values');
  proveHelper('corner-values', once(helperSource, "${s.picks ?? 'not recorded'} INT, ${s.passDef", "${s.tackles ?? 'not recorded'} INT, ${s.passDef"), f => checkRole(f, 'CB'), 'CB actual season values');
  proveHelper('edge-values', once(helperSource, "p === 'EDGE') return `${s.sacks", "p === 'EDGE') return `${s.tackles"), f => checkRole(f, 'EDGE'), 'EDGE actual season values');
  proveHelper('missing-zero', helperSource.replaceAll("'not recorded'", '0'), missing, 'missing fields stay unrecorded');
  prove('suspended', once(expression, "s.teamResult === 'SUSPENDED'", 'false'), suspended, 'suspension has no fabricated stats');
  proveHelper('no-made', once(helperSource, '(s.fgMade ?? 0) > 0 &&', 'true &&'), noMade, 'no longest made kick without a made field goal');
  proveHelper('unplayed', once(helperSource, '&& s.games !== 0', '&& true'), noMade, 'unplayed line has no longest kick illustration');
  proveModel('sum-longest', { totals: once(totalsSource, 'Math.max(t.longFg ?? 0, s.longFg)', '(t.longFg ?? 0) + s.longFg') }, aggregate, 'longest is maximum');
  proveModel('missed-longest', { totals: once(totalsSource, '&& (s.fgMade ?? 0) > 0', '&& true') }, aggregate, 'longest is maximum');
  proveModel('suspended-longest', { totals: once(totalsSource, "s.games > 0 && s.teamResult !== 'SUSPENDED' &&", 's.games > 0 && true &&') }, aggregate, 'longest is maximum');
  proveModel('unplayed-longest', { totals: once(totalsSource, "if (s.games > 0 && s.teamResult", 'if (true && s.teamResult') }, aggregate, 'longest is maximum');
  proveModel('missing-history', { totals: once(totalsSource, '? undefined : 0', '? 0 : 0') }, aggregate, 'recorded tackles career total');
  proveModel('fractional-sacks', { totals: once(totalsSource, 'Math.round(t.sacks * 10) / 10', 'Math.round(t.sacks)') }, aggregate, 'recorded sacks career total');
  proveModel('offense-total', { totals: once(totalsSource, 't.passYds += s.passYds ?? 0', 't.passYds += 0') }, aggregate, 'original offense totals stay identical');
  proveModel('legacy-score', { legacy: once(legacySource, 'c.rings * 80', 'c.rings * 81') }, presentation, 'legacy score verdict hof unchanged');
  proveModel('retirement-fallback', { legacy: once(legacySource, 'nflDefenseOrKickingLine(totals, c.pos) != null', 'false') }, presentation, 'retirement marks recorded totals');
  proveModel('hub-fallback', { hub: once(hubExpression, 'nflDefenseOrKickingLine(totals, career.pos) != null', 'false') }, presentation, 'hub marks recorded totals');
  console.log(`ALL NFL CAREER STAT DISPLAY CHECKS PASSED: ${rows.length} real seasons, 22 effective controls`);
} finally {
  if (scratch) {
    assert.equal(path.dirname(scratch), path.resolve(os.tmpdir()), 'cleanup stays inside OS temp');
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}
