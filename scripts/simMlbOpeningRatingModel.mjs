/* Round936: offline outcome proof for an unimported, partial simulation candidate.
   Literal opportunity fixtures discriminate shrinkage and dated-role behavior, not historical ability. */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readMlbOpeningRatingInputs, MLB_CURRENT_SOURCE_FILES, inputHash } from './lib/mlbOpeningRatingInputs.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const modelFile = 'scripts/lib/mlbOpeningRatingModel.mjs', generatorFile = 'scripts/genMlbOpeningRatings.mjs', outputFile = 'src/data/mlbOpeningRatings2026.ts';
const sourceFiles = [modelFile, generatorFile, outputFile, 'scripts/lib/mlbOpeningRatingInputs.mjs', 'scripts/data/mlbOpeningRatingInputs2026.json', ...MLB_CURRENT_SOURCE_FILES, 'src/lib/mlbFrontOffice.ts'];
const holdSource = bytes => ({ bytes, source: bytes.toString('utf8').replace(/\r\n/g, '\n') });
const held = sourceFiles.map(file => [file, holdSource(fs.readFileSync(path.join(root, file)))]);
const source = held[0][1].source, clone = value => JSON.parse(JSON.stringify(value));
const executable = source => source.replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, '');
const titles = {
  sources: 'frozen source observations remain complete and unchanged after model preparation',
  identity: 'all780 exact identity and original position tuples survive without name matching',
  cohorts: 'full-league annual reference cohorts use dated SP and RP participation',
  budget: 'all30 original opening budgets and13 priced plus13 floor shapes are exact',
  metadata: 'all780 original simulation grades have partial dated evidence without raw facts',
  small: 'tiny extreme hitting evidence cannot bypass clipped target and fixed prior',
  pitch: 'pitching K BB and HR features use independent opportunities and directions',
  saves: 'closer presentation and saves do not award a pitching ability bonus',
  missing: 'missing OPS zero outs and zero-variance features remain unmeasured',
  history: 'past evidence can recover or lower a shallow current season without veteran overrides',
  usage: 'each observation uses its dated role and marks current-role mismatches',
  recency: 'three season weights retain the explicit newest-first assumption',
  prices: 'literal apportionment holds positive floor prices and refuses missing core units',
  sensitivity: 'half and double shrinkage scales change support without authorizing source updates',
  deterministic: 'repeated generation matches the unimported candidate with LF and CRLF',
  refusal: 'incompatible frozen source checkpoints refuse before a candidate file is written',
};
const controls = {
  clip: ['const target = clampTarget(config.targetCenter + config.targetSpread * direction * (value - cohort.mean) / cohort.sd);', 'const target = config.targetCenter + config.targetSpread * direction * (value - cohort.mean) / cohort.sd;', [titles.metadata, titles.small, titles.pitch, titles.missing, titles.history, titles.usage, titles.deterministic]],
  prior: ['const raw = weight ? estimates.reduce((n, e) => n + e.value * e.weight, 0) / weight : config.prior;', 'const raw = weight ? estimates.reduce((n, e) => n + e.value * e.weight, 0) / weight : 0;', [titles.missing]],
  support: ['const sampleWeight = exposure / (1 + exposure), target = targetSum / exposure;', 'const sampleWeight = 1, target = targetSum / exposure;', [titles.metadata, titles.small, titles.pitch, titles.missing, titles.history, titles.usage, titles.recency, titles.sensitivity, titles.deterministic]],
  strikeout: ["const direction = feature === 'bb' || feature === 'hr' ? -1 : 1;", "const direction = feature === 'k' || feature === 'bb' || feature === 'hr' ? -1 : 1;", [titles.pitch, titles.usage, titles.deterministic]],
  walks: ["const direction = feature === 'bb' || feature === 'hr' ? -1 : 1;", "const direction = feature === 'hr' ? -1 : 1;", [titles.pitch, titles.usage, titles.deterministic]],
  homers: ["const direction = feature === 'bb' || feature === 'hr' ? -1 : 1;", "const direction = feature === 'bb' ? -1 : 1;", [titles.pitch, titles.usage, titles.deterministic]],
  homerOpportunity: ['hr: { SP: 300, RP: 120 }', 'hr: { SP: 150, RP: 60 }', [titles.pitch, titles.usage, titles.deterministic]],
  saves: ["const currentRole = currentGamePos === 'CL' ? 'RP' : currentGamePos;", "if (currentGamePos === 'CL') { const latest = observations[2026]; if (latest?.sv >= 20) return { ovr: Math.round(raw) + 2, raw: raw + 2, sampleWeight, usedSeasons: [...used].sort(), datedUsage, usageMismatch: false, basis: 'pitching-production', partial: true }; }\n  const currentRole = currentGamePos === 'CL' ? 'RP' : currentGamePos;", [titles.saves, titles.deterministic]],
  missingZero: ["if (feature === 'ops') return row && finite(row.pa) && row.pa > 0 && finite(row.ops) ? row.ops : null;", "if (feature === 'ops') return row && finite(row.pa) && row.pa > 0 && (row.ops === null || finite(row.ops)) ? (row.ops ?? 0) : null;", [titles.missing]],
  zeroOuts: ["return row && finite(row.outs) && row.outs > 0 && finite(row[feature]) ? 27 * row[feature] / row.outs : null;", "if (row && row.outs === 0) row.outs = 1; return row && finite(row.outs) && row.outs > 0 && finite(row[feature]) ? 27 * row[feature] / row.outs : null;", [titles.missing]],
  variance: ['!Number.isFinite(cohort.sd) || cohort.sd <= 0 || !Number.isFinite(cohort.mean)', 'false', [titles.missing]],
  datedRole: ["row.gs / row.g >= 0.5 ? 'SP' : 'RP'", "row.gs / row.g < 0.5 ? 'SP' : 'RP'", [titles.cohorts, titles.pitch, titles.saves, titles.usage, titles.deterministic]],
  recency: ['yearWeights: { 2024: 0.4, 2025: 0.65, 2026: 1 }', 'yearWeights: { 2024: 1, 2025: 1, 2026: 1 }', [titles.history, titles.usage, titles.recency, titles.deterministic]],
  floor: ['(coreSet.has(i) ? byIndex.get(i) : 7) / 10', '(coreSet.has(i) ? byIndex.get(i) : 0) / 10', [titles.budget, titles.prices, titles.deterministic]],
  budget: ['const available = budgetTenths - 13 * 7, weights', 'const available = budgetTenths, weights', [titles.budget, titles.prices, titles.deterministic]],
  partial: ['basis: p.basis, partial: true, sampleWeight:', 'basis: p.basis, partial: false, sampleWeight:', [titles.metadata, titles.deterministic]],
  mismatch: ['usageMismatch: !hitter && datedUsage.some(r => r.role !== currentRole)', 'usageMismatch: false', [titles.usage, titles.deterministic]],
  pinned: ['const input = readMlbOpeningRatingInputs(root);', "const input = JSON.parse(fs.readFileSync(path.join(root, 'scripts/data/mlbOpeningRatingInputs2026.json')));", [titles.refusal]],
};
const control = process.env.MLB_OPENING_MODEL_CONTROL ?? '';
assert.ok(!control || Object.hasOwn(controls, control), 'Known copied MLB model control');
for (const [anchor] of Object.values(controls)) {
  assert.equal(source.split(anchor).length - 1, 1, 'Unique source binding');
  assert.equal(executable(source).split(anchor).length - 1, 1, 'Executable binding, not a comment');
  assert.equal(holdSource(Buffer.from(source.replace(/\n/g, '\r\n'))).source.split(anchor).length - 1, 1, 'Synthetic CRLF binding');
}
const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-mlb936-model-proof-'));
const ownedCleanup = target => { const resolved = path.resolve(target); assert.equal(path.dirname(resolved), path.resolve(os.tmpdir())); assert.ok(path.basename(resolved).startsWith('dukb-mlb936-model-proof-')); fs.rmSync(resolved, { recursive: true, force: true }); };
const results = [];
try {
  let changed = source;
  if (control) { changed = source.replace(controls[control][0], controls[control][1]); assert.notEqual(changed, source, 'Copied control changes actual model'); }
  const copy = path.join(folder, 'model.mjs');
  const absoluteImports = value => value.replace("from './mlbOpeningRatingInputs.mjs'", `from '${pathToFileURL(path.join(root, 'scripts/lib/mlbOpeningRatingInputs.mjs')).href}'`).replace("from './mlbFoRecord.mjs'", `from '${pathToFileURL(path.join(root, 'scripts/lib/mlbFoRecord.mjs')).href}'`);
  fs.writeFileSync(copy, absoluteImports(changed));
  const M = await import(pathToFileURL(copy).href), candidate = M.buildMlbOpeningRatings(root), input = readMlbOpeningRatingInputs(root);
  const rows = Object.values(candidate.teams).flat(), stats = JSON.parse(fs.readFileSync(path.join(root, 'scripts/data/mlbStats2026.json')));
  const literalYear = { HIT: { ops: { count: 2, mean: 0.7, sd: 0.1 } }, SP: { k: { count: 2, mean: 9, sd: 3 }, bb: { count: 2, mean: 3, sd: 1 }, hr: { count: 2, mean: 1, sd: 0.5 } }, RP: { k: { count: 2, mean: 12, sd: 3 }, bb: { count: 2, mean: 4, sd: 1 }, hr: { count: 2, mean: 1.5, sd: 0.5 } } };
  const literal = { 2024: literalYear, 2025: literalYear, 2026: literalYear }, hit = (pa, ops) => ({ pa, ops }), pitch = (outs = 150) => ({ g: 10, gs: 10, outs, k: 50, bb: 0, hr: 0, sv: 0 });
  const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} differs from independently calculated ${expected}`);
  const budgets = { ARI:1829, ATH:1627, ATL:1703, BAL:1478, BOS:2116, CHC:1923, CHW:1838, CIN:1389, CLE:1687, COL:1541, DET:1694, HOU:1652, KCR:1309, LAA:1381, LAD:2283, MIA:1738, MIL:2301, MIN:1829, NYM:1493, NYY:2132, PHI:1880, PIT:2175, SDP:1586, SEA:1419, SFG:1534, STL:1189, TBR:2006, TEX:1839, TOR:1436, WSN:1494 };
  async function run(title, test) { try { await test(); results.push({ title, status: 'passed' }); } catch (error) { if (!(error instanceof assert.AssertionError)) throw error; results.push({ title, status: 'failed', message: error.message.slice(0,700) }); } }
  await run(titles.sources, () => {
    assert.deepEqual(input.sources.map(s => [s.season, s.group, s.rowCount]), [[2024,'hitting',742],[2024,'pitching',855],[2025,'hitting',765],[2025,'pitching',873]]);
    assert.equal(input.publisherLineages, 1); assert.equal(input.independentlyVerified, false);
    assert.equal(stats.hitting.length, 751); assert.equal(stats.pitching.length, 868);
  });
  await run(titles.identity, () => {
    const expected = input.current780.map(p => `${p.team}|${p.id}|${p.name}|${p.gamePos}`).sort();
    assert.deepEqual(Object.entries(candidate.teams).flatMap(([team, men]) => men.map(p => `${team}|${p.id}|${p.name}|${p.pos}`)).sort(), expected);
    assert.equal(rows.length, 780); assert.equal(new Set(rows.map(p => p.id)).size, 780);
    assert.equal(new Set(rows.map(p => p.name)).size, 780);
  });
  await run(titles.cohorts, () => {
    assert.deepEqual(Object.entries(candidate.cohorts).map(([year,c]) => [Number(year),c.HIT.ops.count,c.SP.k.count,c.RP.k.count]), [[2024,410,169,319],[2025,393,177,317],[2026,407,174,325]]);
    for (const year of Object.values(candidate.cohorts)) for (const group of Object.values(year)) for (const metric of Object.values(group)) assert.ok(metric.sd > 0 && Number.isFinite(metric.mean));
  });
  await run(titles.budget, () => {
    assert.deepEqual(candidate.budgets, budgets);
    const engine = held.find(([file]) => file === 'src/lib/mlbFrontOffice.ts')[1].source;
    const salaryBody = engine.match(/export function mlbSalaryFor\(ovr: number\): number \{([\s\S]*?)\n\}/)[1];
    const unitsBody = engine.slice(engine.indexOf('  const healthy = t.players.filter'), engine.indexOf('  return { bats, rot, pen };') + '  return { bats, rot, pen };'.length);
    const salary = new Function('ovr', salaryBody), units = new Function('t','isPitcher',unitsBody);
    for (const [team, original] of Object.entries(candidate.originalTeams)) {
      const selected = units({ players: original.map((p,i) => ({...p,i,out:0})) }, p => ['SP','RP','CL'].includes(p.pos));
      const core = new Set([...selected.bats,...selected.rot,...selected.pen].map(p => p.i));
      const independentBudget = original.reduce((n,p,i) => n + Math.round((core.has(i) ? salary(p.ovr) : 0.7)*10),0);
      assert.equal(independentBudget, budgets[team]);
      const men = candidate.teams[team]; assert.equal(men.length,26); assert.equal(men.filter(p=>p.salary===0.7).length,13);
      assert.equal(men.reduce((n,p)=>n+Math.round(p.salary*10),0),independentBudget);
      assert.ok(men.every(p=>p.salary>=0.7&&Number.isFinite(p.salary))); assert.ok(independentBudget<=2440);
    }
  });
  await run(titles.metadata, () => {
    assert.equal(rows.filter(p => p.evidence.partial === true).length,780);
    for (const [team, men] of Object.entries(candidate.teams)) for (const p of men) {
      assert.equal(p.evidence.originKey,`${team}|${p.id}|${p.name}|${p.pos}`); assert.equal(p.evidence.openingOvr,p.ovr);
      assert.equal(p.evidence.modelVersion,'mlb936-candidate-v1-2026-10-02'); assert.ok(p.ovr>=55&&p.ovr<=98);
      assert.ok(p.evidence.sampleWeight>=0&&p.evidence.sampleWeight<1); assert.ok(p.evidence.usedSeasons.every(y=>[2024,2025,2026].includes(y)));
      assert.deepEqual(Object.keys(p.evidence).sort(),['modelVersion','originKey','openingOvr','basis','partial','sampleWeight','usedSeasons','datedUsage','usageMismatch'].sort());
    }
  });
  await run(titles.small, () => {
    const tiny=M.rateMlbObservations({2026:hit(1,100)},literal,'DH'), large=M.rateMlbObservations({2026:hit(600,0.8)},literal,'DH');
    near(tiny.raw,72+26/151); near(tiny.sampleWeight,1/151); assert.equal(tiny.ovr,72);
    assert.deepEqual(tiny.usedSeasons,[2026]);
    near(large.raw,91.2); assert.equal(large.ovr,91); assert.ok(tiny.sampleWeight<large.sampleWeight);
  });
  await run(titles.pitch, () => {
    const result=M.rateMlbObservations({2026:pitch()},literal,'SP');
    near(result.raw,72+0.45*0.5*12+0.35*0.5*26+0.2/3*26); near(result.sampleWeight,0.45*0.5+0.35*0.5+0.2/3);
    assert.equal(result.ovr,81);
    const worse=M.rateMlbObservations({2026:{...pitch(),k:20,bb:40,hr:20}},literal,'SP'); assert.ok(worse.ovr<result.ovr);
    const lowK=M.rateMlbObservations({2026:{...pitch(270),k:60,bb:30,hr:10}},literal,'SP'), highK=M.rateMlbObservations({2026:{...pitch(270),k:120,bb:30,hr:10}},literal,'SP'); assert.ok(highK.raw>lowK.raw);
  });
  await run(titles.saves, () => {
    const row={...pitch(60),gs:0,k:25}, a=M.rateMlbObservations({2026:row},literal,'RP'), b=M.rateMlbObservations({2026:{...row,sv:100}},literal,'CL');
    assert.equal(b.raw,a.raw); assert.equal(b.ovr,a.ovr); assert.deepEqual(b.datedUsage,a.datedUsage); assert.equal(b.usageMismatch,false);
  });
  await run(titles.missing, () => {
    const absent=M.rateMlbObservations({2026:hit(150,null)},literal,'DH'), observed=M.rateMlbObservations({2026:hit(150,0)},literal,'DH');
    assert.equal(absent.ovr,72); assert.equal(absent.sampleWeight,0); assert.deepEqual(absent.usedSeasons,[]); assert.equal(absent.basis,'unmeasured-prior');
    near(observed.raw,63.5); assert.equal(observed.basis,'offensive-production');
    const zero=M.rateMlbObservations({2026:{...pitch(0),k:0}},literal,'SP'); assert.equal(zero.ovr,72); assert.deepEqual(zero.usedSeasons,[]);
    const unavailable=clone(literal); unavailable[2026].HIT.ops.sd=null;
    assert.equal(M.rateMlbObservations({2026:hit(600,1)},unavailable,'DH').basis,'unmeasured-prior');
    unavailable[2026].HIT.ops.sd=0;
    assert.equal(M.rateMlbObservations({2026:hit(600,1)},unavailable,'DH').sampleWeight,0);
    assert.equal(M.rateMlbObservations({2026:hit(600,1)},{},'DH').ovr,72);
    assert.equal(M.rateMlbObservations({},literal,'DH').ovr,72);
    assert.equal(M.rateMlbObservations({2026:hit(600,NaN)},literal,'DH').basis,'unmeasured-prior');
    const flat=M.buildMlbAnnualCohorts({2026:{hitting:[{id:1,pa:200,ops:.7},{id:2,pa:200,ops:.7}],pitching:[]}}); assert.equal(flat[2026].HIT.ops.sd,null);
  });
  await run(titles.history, () => {
    const now=M.rateMlbObservations({2026:hit(1,100)},literal,'DH'), good=M.rateMlbObservations({2025:hit(600,.8),2026:hit(1,100)},literal,'DH'), poor=M.rateMlbObservations({2025:hit(600,.4),2026:hit(1,100)},literal,'DH');
    const exposure=2.6+1/150, support=exposure/(1+exposure);
    near(good.raw,72+support*((96*2.6+98/150)/exposure-72)); near(poor.raw,72+support*((55*2.6+98/150)/exposure-72));
    assert.ok(good.ovr>now.ovr&&poor.ovr<now.ovr); assert.deepEqual(good.usedSeasons,[2025,2026]);
    const group=new Map(stats.hitting.map(p=>[p.id,p]));
    const shallow=rows.filter(p=>!['SP','RP','CL'].includes(p.pos)&&group.get(p.id).pa<150&&[2024,2025].some(year=>input.tables[year].hitting.some(x=>x.id===p.id&&x.pa>=150)));
    const delta=shallow.map(p=>p.ovr-M.rateMlbObservations({2026:group.get(p.id)},candidate.cohorts,p.pos).ovr);
    assert.ok(delta.some(n=>n>0)&&delta.some(n=>n<0),'Actual shallow prior evidence changes outcomes in both directions');
  });
  await run(titles.usage, () => {
    const observation={...pitch(60),gs:0,k:20,bb:0,hr:0};
    const value=M.rateMlbObservations({2024:observation},literal,'SP');
    const e=0.4,s=e/(1+e),h=0.2/(1.2),targetK=72;
    near(value.raw,72+0.45*s*(targetK-72)+0.35*s*26+0.2*h*26);
    assert.deepEqual(value.datedUsage,[{season:2024,role:'RP'}]); assert.equal(value.usageMismatch,true);
    assert.equal(rows.filter(p=>p.evidence.usageMismatch).length,67);
    const current=M.rateMlbObservations({2026:{...observation,gs:10}},literal,'SP'); assert.equal(current.usageMismatch,false);
  });
  await run(titles.recency, () => {
    const value=M.rateMlbObservations({2024:hit(150,.6),2025:hit(150,.7),2026:hit(150,.8)},literal,'DH');
    const e=2.05; near(value.raw,72+e/(1+e)*((72*.4+84*.65+96)/e-72)); near(value.sampleWeight,e/(1+e));
    assert.deepEqual(value.usedSeasons,[2024,2025,2026]);
  });
  await run(titles.prices, () => {
    const original=Array.from({length:26},(_,i)=>({name:`Simulated${i}`,pos:i<13?'DH':i<18?'SP':'RP',ovr:80})), rated=original.map(p=>({...p}));
    const result=M.allocateMlbOpeningPrices(original,rated); assert.equal(result.budgetTenths,1183);
    assert.deepEqual(result.salaries,original.map((_,i)=>i<8||[13,14,15,18,19].includes(i)?8.4:.7));
    assert.throws(()=>M.allocateMlbOpeningPrices(original,original.map(p=>({...p,pos:'DH'}))),/cannot preserve/);
  });
  await run(titles.sensitivity, () => {
    const half=M.rateMlbObservations({2026:hit(150,.8)},literal,'DH',.5), normal=M.rateMlbObservations({2026:hit(150,.8)},literal,'DH'), double=M.rateMlbObservations({2026:hit(150,.8)},literal,'DH',2);
    near(half.raw,88); near(normal.raw,84); near(double.raw,80); assert.ok(half.sampleWeight>normal.sampleWeight&&normal.sampleWeight>double.sampleWeight);
    assert.throws(()=>M.rateMlbObservations({},literal,'DH',3),/reviewed/);
  });
  await run(titles.deterministic, () => {
    assert.deepEqual(M.buildMlbOpeningRatings(root),candidate); const rendered=M.renderMlbOpeningRatings(candidate);
    assert.equal(rendered,held.find(([file])=>file===outputFile)[1].source);
    assert.equal(holdSource(Buffer.from(rendered.replace(/\n/g,'\r\n'))).source,rendered);
    const parsed=vm.runInNewContext('('+rendered.match(/MLB_OPENING_RATING_CANDIDATE:.*? = (\{[\s\S]*\});/)[1]+')',{}, {timeout:1000}); assert.equal(Object.values(parsed).flatMap(Object.values).length,780);
    assert.ok(rendered.includes('Not imported by any game.')); assert.ok(!/\b(?:ops|outs|pa|k|bb|hr|sv)\s*:/.test(rendered));
  });
  await run(titles.refusal, () => {
    const project=path.join(folder,'changed-checkpoint'); fs.mkdirSync(project);
    for (const file of ['scripts/data/mlbOpeningRatingInputs2026.json',...MLB_CURRENT_SOURCE_FILES]) { const output=path.join(project,file); fs.mkdirSync(path.dirname(output),{recursive:true}); fs.writeFileSync(output,held.find(([p])=>p===file)[1].bytes); }
    const wrong=clone(input); wrong.tables[2024].hitting[0].ops+=.001;
    // Even a caller-updated table seal cannot authorize changing this frozen observation snapshot.
    wrong.sources[0].compactSha256=inputHash(JSON.stringify(wrong.tables[2024].hitting));
    fs.writeFileSync(path.join(project,'scripts/data/mlbOpeningRatingInputs2026.json'),JSON.stringify(wrong));
    let refused=false; try { M.buildMlbOpeningRatings(project); } catch(error) { assert.match(error.message,/checkpoint refused/); refused=true; }
    assert.equal(refused,true);
    const sentinel=path.join(project,outputFile); fs.writeFileSync(sentinel,'OWNED CANDIDATE SENTINEL');
    const genSource=held.find(([p])=>p===generatorFile)[1].source;
    for(const binding of ["import './lib/offlineTransport.cjs';", "from './lib/mlbOpeningRatingModel.mjs'", "const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');"]) assert.equal(genSource.split(binding).length-1,1,'Actual generator binding is unique');
    const cli=genSource.replace("import './lib/offlineTransport.cjs';",`import '${pathToFileURL(path.join(root,'scripts/lib/offlineTransport.cjs')).href}';`).replace("from './lib/mlbOpeningRatingModel.mjs'",`from '${pathToFileURL(copy).href}'`).replace("const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');",`const root = ${JSON.stringify(project)};`);
    assert.notEqual(cli,genSource); const file=path.join(folder,'generator.mjs'); fs.writeFileSync(file,cli);
    const process=spawnSync(globalThis.process.execPath,[file],{cwd:root,encoding:'utf8',timeout:15000}); assert.equal(process.status,1); assert.match(process.stderr,/MLB source checkpoint refused/);
    assert.equal(fs.readFileSync(sentinel,'utf8'),'OWNED CANDIDATE SENTINEL'); assert.ok(!/SIM_OFFLINE_BLOCK/.test(process.stdout+process.stderr));
    fs.unlinkSync(path.join(project,'scripts/data/mlbOpeningRatingInputs2026.json'));
    assert.throws(()=>M.buildMlbOpeningRatings(project),/ENOENT/);
    const missing=spawnSync(globalThis.process.execPath,[file],{cwd:root,encoding:'utf8',timeout:15000}); assert.equal(missing.status,1); assert.match(missing.stderr,/ENOENT/); assert.equal(fs.readFileSync(sentinel,'utf8'),'OWNED CANDIDATE SENTINEL');
    assert.ok(!/SIM_OFFLINE_BLOCK/.test(missing.stdout+missing.stderr));
    fs.writeFileSync(path.join(project,'scripts/data/mlbOpeningRatingInputs2026.json'),held.find(([p])=>p==='scripts/data/mlbOpeningRatingInputs2026.json')[1].bytes);
    const good=spawnSync(globalThis.process.execPath,[file],{cwd:root,encoding:'utf8',timeout:15000}); assert.equal(good.status,0); assert.equal(fs.readFileSync(sentinel,'utf8'),M.renderMlbOpeningRatings(candidate));
    const check=spawnSync(globalThis.process.execPath,[file,'--check'],{cwd:root,encoding:'utf8',timeout:15000}); assert.equal(check.status,0); assert.ok(!/SIM_OFFLINE_BLOCK/.test(good.stdout+good.stderr+check.stdout+check.stderr));
  });
  assert.equal(results.length,16); assert.equal(new Set(results.map(r=>r.title)).size,16);
  console.log('MLB_MODEL_OUTCOMES '+JSON.stringify({control:control||'normal',results}));
  for(const title of [titles.sources,titles.identity]) assert.equal(results.find(r=>r.title===title).status,'passed','Independent frozen-source and identity baseline held');
  const failed=results.filter(r=>r.status==='failed');
  assert.deepEqual(failed.map(r=>r.title).sort(),[...(control?controls[control][2]:[])].sort(),'Exact effective copied model outcomes');
  console.log(`MLB model ${control||'normal'}: ${failed.length} intended failures/${16-failed.length} held passes; all16 execute, no skipped cases.`);
  console.log('MLB model:780 partial simulation estimates, dated2024/2025/2026 full-league cohorts, literal opportunity/role/missing-value outcomes discriminate.');
  console.log('MLB model:30 exact original budgets and13 core/13 depth prices held; incompatible checkpoints refuse before write; candidate stays unimported.');
} finally {
  ownedCleanup(folder);
  for(const [file,{bytes}] of held) { const currentBytes=fs.readFileSync(path.join(root,file)); assert.deepEqual(currentBytes,bytes,'Raw original and owned source bytes held'); }
}
console.log('MLB model:CRLF-safe controls, raw byte holds, bounded cleanup and offline transport guard passed. No runtime, season/save or approval claim.');
