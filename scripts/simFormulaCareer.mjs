import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync, gunzipSync } from 'node:zlib';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.env.FORMULA_EVIDENCE_DIR || process.env.FORMULA_CAREER_OUT || path.join(ROOT, 'formula-career-artifacts/proof'));
mkdirSync(OUT, { recursive: true });
const sha = b => createHash('sha256').update(b).digest('hex');
const json = v => JSON.stringify(v);
const clone = v => JSON.parse(json(v));
const same = (a, b) => json(a) === json(b);
function semantic(a,b) {
  if(a===b)return true;
  if(a===null||b===null||typeof a!==typeof b||typeof a!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
  if(Array.isArray(a))return a.length===b.length&&a.every((v,i)=>semantic(v,b[i]));
  const ak=Object.keys(a).sort(),bk=Object.keys(b).sort();
  return same(ak,bk)&&ak.every(k=>semantic(a[k],b[k]));
}
const manifest = new Map(), decoded = new Map();
const runtimeBundles=[];
function object(v) {
  const raw = Buffer.from(json(v)), hash = sha(raw);
  if (!manifest.has(hash)) {
    const packed = gzipSync(raw, { level: 9, mtime: 0 }), file = 'objects/' + hash + '.json.gz';
    mkdirSync(path.join(OUT, 'objects'), { recursive: true });
    writeFileSync(path.join(OUT, file), packed);
    assert.deepEqual(gunzipSync(packed), raw, 'complete object codec round trip');
    manifest.set(hash, { hash, file, bytes: raw.length, packedBytes: packed.length, packedSha256: sha(packed) });
  }
  return hash;
}
function value(hash) {
  assert(manifest.has(hash), 'declared complete object reference');
  if (!decoded.has(hash)) {
    const row = manifest.get(hash), packed = readFileSync(path.join(OUT, row.file)), raw = gunzipSync(packed);
    assert.equal(sha(packed), row.packedSha256); assert.equal(sha(raw), hash); assert.equal(raw.length, row.bytes);
    decoded.set(hash, raw.toString('utf8'));
  }
  return JSON.parse(decoded.get(hash));
}
const failures = [];
const check = (id, ok, detail = null) => { if (!ok) failures.push({ id, detail }); };
const groups = ['field', 'qualifying', 'points', 'standings', 'history', 'guards', 'save', 'read-only', 'progression', 'stream', 'replay'];
const report = { status: 'running', model: 'Generated 2025 GP-only simplified career', source: {}, population: [], bundles: [],
  careers: [], probes: [], controls: [], observationControls: [], failures, groups, fixtures: {}, qualifications: [
    'No Formula Career engine exists in the AA baseline. Actual new source unobserved/observed replay and independent saved-outcome oracles are used.',
    'Full state checkpoints use declared complete final-ledger-prefix references; complete original race rows remain once in each final ledger. No fields or failed cases are dropped.',
    'Global startup/action/read tapes are separate from the copied actual private draw observer. Unobserved source has saved rng/draws observations, not a fabricated private value tape.',
    'Altered recorded states are labelled counterexamples. All cohort careers and browser fixtures use actual actions from explicit seeds, without seed search.',
    'Loader output is checked as complete strict typed values, including all object keys and array order. Zod schema property-order changes receive no raw save reserialization equality claim.',
    'No balance floor, real driver/team/rating/result, live transport or regulatory completeness is claimed.'
  ] };
const ENGINE = path.join(ROOT, 'src/lib/formulaCareer.ts');
const DATA = path.join(ROOT, 'src/data/formulaCareer2025.ts');
let engineRaw = readFileSync(ENGINE, 'utf8'), dataRaw = readFileSync(DATA, 'utf8');
const engineSource = engineRaw, dataSource = dataRaw;
engineRaw = engineRaw.replace(/\r\n/g, '\n'); dataRaw = dataRaw.replace(/\r\n/g, '\n');
report.source = { engineRaw: object(engineSource), rulesRaw: object(dataSource), engine: object(engineRaw), rules: object(dataRaw),
  rawEngineSha256: sha(engineSource), rawRulesSha256: sha(dataSource), engineSha256: sha(engineRaw), rulesSha256: sha(dataRaw),
  qualification: 'Raw source bytes remain retained. Source-copy matching and complete undo use explicit LF text; saved state and runtime output bytes are never normalized.' };
report.codec = { format: 'ordered-values-ledger-v1', grammar: '[field,[value,scalar]|[object,fullJSONHash]|[ledger,careerLedger,prefix]]',
  qualification: 'Every whole state is reconstructed in original key order with complete referenced objects and full final race rows, then checked against its original raw JSON length and SHA256.' };
const replacements = [];
function replaceOnce(body, from, to, name) {
  assert.equal(body.split(from).length - 1, 1, name + ' unique forward');
  const changed = body.replace(from, to);
  assert.notEqual(changed, body, name + ' effective body');
  assert.equal(changed.split(to).length - 1, 1, name + ' unique reverse');
  assert.equal(changed.replace(to, from), body, name + ' whole undo');
  replacements.push({ name, from, to, before: object(body), after: object(changed), undo: object(changed.replace(to, from)) });
  return changed;
}
const DRAW_FROM = '  return ((n ^ (n >>> 14)) >>> 0) / 4294967296;';
const DRAW_TO = '  const value = ((n ^ (n >>> 14)) >>> 0) / 4294967296;\n  globalThis.__formulaDraw?.({ rng: s.rng, draws: s.draws, value });\n  return value;';
const observedRaw = replaceOnce(engineRaw, DRAW_FROM, DRAW_TO, 'private-observer');
const faultDefs = [
  { id: 'points', group: 'points', from: '      result.points = FORMULA_GP_POINTS[place - 1] ?? 0;', to: '      result.points = place === 1 ? 24 : (FORMULA_GP_POINTS[place - 1] ?? 0);', cases: ['race','season-finish'], expected: ['race/points','season-finish/progression'] },
  { id: 'session', group: 'qualifying', from: '  const q3 = session(q2.slice(0, 10).map(t => next.drivers.find(d => d.id === t.driverId)!));', to: '  const q3 = q2.slice(0, 10);', cases: ['qualify'] },
  { id: 'seat', group: 'progression', from: '    outgoing.teamId = player.teamId; player.teamId = offer.teamId;', to: '    outgoing.teamId = offer.teamId; player.teamId = offer.teamId;', cases: ['seat'] },
  { id: 'race-repeat', group: 'guards', from: "  if (s.phase !== 'grid' || !s.qualifying || expectedId !== formulaWeekendId(s)\n    || s.qualifying.id !== expectedId || s.races.some(r => r.id === expectedId)) return s;",
    to: '  if (!s.qualifying || expectedId !== formulaWeekendId(s)\n    || s.qualifying.id !== expectedId) return s;', cases: ['race-repeat'] },
  { id: 'read-draw', group: 'read-only', from: "  const results = s.races.map(r => r.results.find(result => result.driverId === 'player')!);",
    to: "  draw(s);\n  const results = s.races.map(r => r.results.find(result => result.driverId === 'player')!);", cases: ['stats'] },
  { id: 'age', group: 'progression', from: '    d.age += 1;', to: '    d.age += 0;', cases: ['seat'] },
  { id: 'countback', group: 'standings', from: '  for (let i = 0; i < 20; i++) if (a.countback[i] !== b.countback[i]) return b.countback[i] - a.countback[i];',
    to: '  for (let i = 0; i < 0; i++) if (a.countback[i] !== b.countback[i]) return b.countback[i] - a.countback[i];', cases: ['countback'] },
  { id: 'serial', group: 'save', from: '        || Number(d.id.slice(7)) >= s.serial))', to: '        || Number(d.id.slice(7)) < 0))', cases: ['invalid-serial'] },
  { id: 'serial-ceiling', group: 'save', from: 'serial: number.int().positive().max(21 + 19 * (FORMULA_CAREER_SEASONS - 1))',
    to: 'serial: number.int().positive()', cases: ['invalid-unsafe-serial'] },
  { id: 'completion', group: 'save', from: '    if (s.completionEvent !== completion) return null;', to: '    if (s.completionEvent !== completion && false) return null;', cases: ['invalid-completion'] },
  { id: 'current-grid', group: 'save', from: '      && JSON.stringify(s.qualifying.grid) !== JSON.stringify(s.races[s.races.length - 1].grid)) return null;',
    to: '      && JSON.stringify(s.qualifying.grid) !== JSON.stringify(s.races[s.races.length - 1].grid) && false) return null;', cases: ['invalid-current-grid'] },
  { id: 'historical-seats', group: 'save', from: '        || s.teams.some(t => race.grid.filter(g => g.teamId === t.id).length !== 2)',
    to: '        || (s.teams.some(t => race.grid.filter(g => g.teamId === t.id).length !== 2) && false)', cases: ['invalid-historical-seats'] },
  { id: 'historical-contract', group: 'save', from: "        || race.grid.find(g => g.driverId === 'player')?.teamId !== s.contracts[race.season - 1]?.teamId",
    to: "        || (race.grid.find(g => g.driverId === 'player')?.teamId !== s.contracts[race.season - 1]?.teamId && false)", cases: ['invalid-historical-contract'] },
  { id: 'historical-id', group: 'save', from: "        || race.grid.some(g => g.driverId !== 'player' && (!/^driver-[1-9][0-9]*$/.test(g.driverId)\n          || Number(g.driverId.slice(7)) >= s.serial))",
    to: "        || (race.grid.some(g => g.driverId !== 'player' && (!/^driver-[1-9][0-9]*$/.test(g.driverId)\n          || Number(g.driverId.slice(7)) >= s.serial)) && false)", cases: ['invalid-historical-serial','invalid-historical-id'] },
  { id: 'terminal-contracts', group: 'save', from: "      || (s.phase === 'contracts' && (s.season === 20 || s.round !== 23 || s.offers.length < 1))",
    to: "      || (s.phase === 'contracts' && (s.round !== 23 || s.offers.length < 1))", cases: ['invalid-terminal-contracts'] },
  { id: 'season-completion', group: 'progression', from: "  if (next.round === FORMULA_CALENDAR.length - 1) next.completionEvent = next.careerId + ':season-' + next.season;",
    to: "  if (next.round === FORMULA_CALENDAR.length - 1 && false) next.completionEvent = next.careerId + ':season-' + next.season;", cases: ['season-finish'] },
  { id: 'negotiation-salary', group: 'negotiation', from: '  target.negotiated = true;', to: '  target.negotiated = true; target.salary += 1;', cases: ['negotiate'] },
  { id: 'old-history', group: 'history', from: '  next.contracts.push({ season: next.season, teamId: player.teamId, salary: offer.salary });',
    to: "  next.contracts.push({ season: next.season, teamId: player.teamId, salary: offer.salary });\n  next.races[0].grid[0].name = 'Corrupted history';", cases: ['seat'] },
];
async function bundle(id, body, observe) {
  const dir = path.join(OUT, 'bundles', id); mkdirSync(dir, { recursive: true });
  const entry = path.join(ROOT, '.tmp-fx/formula-proof-entry.ts');
  mkdirSync(path.dirname(entry), { recursive: true });
  const entryBody = "export * from '../src/lib/formulaCareer';\nexport * from '../src/data/formulaCareer2025';\n";
  writeFileSync(entry, entryBody);
  const loaded = [];
  const result = await build({ absWorkingDir: ROOT, entryPoints: [entry], outfile: path.join(dir, 'compiled.cjs'),
    bundle: true, platform: 'node', format: 'cjs', target: 'node22', write: false, metafile: true,
    alias: { '@': path.join(ROOT, 'src') }, plugins: [{ name: 'retained-inputs', setup(b) {
      b.onLoad({ filter: /\.[cm]?[jt]sx?$/ }, async args => {
        const raw = readFileSync(args.path, 'utf8'), contents = args.path === ENGINE ? body : raw;
        loaded.push({ path: path.relative(ROOT, args.path).replaceAll('\\', '/'), namespace: args.namespace,
          raw: object(raw), loaded: object(contents), rawBytes: Buffer.byteLength(raw), loadedBytes: Buffer.byteLength(contents),
          rawSha256: sha(raw), loadedSha256: sha(contents) });
        return { contents, loader: /tsx$/.test(args.path) ? 'tsx' : /ts$/.test(args.path) ? 'ts' : 'js' };
      });
    } }] });
  const code = result.outputFiles.find(f => f.path.endsWith('compiled.cjs')).contents;
  writeFileSync(path.join(dir, 'compiled.cjs'), code);
  writeFileSync(path.join(dir, 'metafile.json'), json(result.metafile));
  writeFileSync(path.join(dir, 'entry.ts'), entryBody);
  writeFileSync(path.join(dir, 'engine.ts'), body);
  const privateTape = [], globalTape = [], module = { exports: {} };
  const math = Object.create(Math);
  math.random = () => { const v = Math.random(); globalTape.push(v); return v; };
  const context = vm.createContext({ module, exports: module.exports, require: createRequire(entry), structuredClone,
    Math: math, console, __formulaDraw: row => privateTape.push(clone(row)) });
  new vm.Script(Buffer.from(code).toString('utf8'), { filename: 'formula-retained.cjs' }).runInContext(context);
  const startup = { global: globalTape.slice(), private: privateTape.slice() };
  const metadata = { id, observe, source: object(body), compiledBytes: code.length, compiledSha256: sha(code),
    metafile: object(result.metafile), loaded: object(loaded), startup: object(startup) };
  report.bundles.push(metadata);
  const runtime={ id, api: module.exports, privateTape, globalTape, startup, metadata };
  runtimeBundles.push(runtime);return runtime;
}
const independentPoints = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
const calendar = ['Australia','China','Japan','Bahrain','Saudi Arabia','Miami','Emilia-Romagna','Monaco','Spain','Canada','Austria','Great Britain','Belgium','Hungary','Netherlands','Italy','Azerbaijan','Singapore','United States','Mexico','Brazil','Las Vegas','Qatar','Abu Dhabi'];
function field(s) {
  return s.drivers.length === 20 && new Set(s.drivers.map(d => d.id)).size === 20 && s.teams.length === 10
    && new Set(s.teams.map(t => t.id)).size === 10 && s.teams.every(t => s.drivers.filter(d => d.teamId === t.id).length === 2)
    && s.drivers.filter(d => d.id === 'player').length === 1;
}
function qualifying(s, before, emitted) {
  const q = s.qualifying;
  if (!q || q.q1.length !== 20 || q.q2.length !== 15 || q.q3.length !== 10 || emitted.length !== 45) return false;
  const sorted = rows => rows.every((r,i) => !i || rows[i-1].ms < r.ms || (rows[i-1].ms === r.ms && rows[i-1].driverId.localeCompare(r.driverId) < 0));
  const set = rows => rows.map(r => r.driverId).sort().join('|');
  const expected = [...q.q3.map(r => ({...r,stage:3})), ...q.q2.slice(10).map(r => ({...r,stage:2})), ...q.q1.slice(15).map(r => ({...r,stage:1}))].map((r,i) => {
    const d = s.drivers.find(d => d.id === r.driverId); return {...r,name:d.name,teamId:d.teamId,position:i+1};
  });
  return [q.q1,q.q2,q.q3].every(sorted) && set(q.q1) === set(before.drivers.map(d => ({ driverId: d.id })))
    && set(q.q2) === set(q.q1.slice(0,15)) && set(q.q3) === set(q.q2.slice(0,10)) && same(expected,q.grid)
    && s.draws - before.draws === 45;
}
function racePoints(race) {
  if (race.results.length !== 20 || new Set(race.results.map(r => r.driverId)).size !== 20) return false;
  let place = 0, retired = false;
  return race.results.every(r => {
    const g = race.grid.find(g => g.driverId === r.driverId);
    if (!g || r.name !== g.name || r.teamId !== g.teamId || r.grid !== g.position) return false;
    if (r.status === 'retired') { retired = true; return r.position === null && r.points === 0 && typeof r.reason === 'string'; }
    return !retired && r.position === ++place && r.points === (independentPoints[place-1] || 0) && r.reason === null;
  });
}
function standings(s, season = s.season) {
  const ds = new Map(), ts = new Map();
  const fresh = (id,name) => ({id,name,points:0,wins:0,podiums:0,rank:1,countback:Array(20).fill(0)});
  if (season === s.season) for (const d of s.drivers) ds.set(d.id,fresh(d.id,d.name));
  for (const t of s.teams) ts.set(t.id,fresh(t.id,t.name));
  for (const race of s.races.filter(r => r.season === season)) for (const r of race.results) {
    if (!ds.has(r.driverId)) ds.set(r.driverId,fresh(r.driverId,r.name));
    for (const row of [ds.get(r.driverId),ts.get(r.teamId)]) {
      row.points += r.points;
      if(r.position !== null) { row.countback[r.position-1]++; row.wins += Number(r.position===1); row.podiums += Number(r.position<=3); }
    }
  }
  const compare = (a,b) => b.points-a.points || a.countback.reduce((n,v,i) => n || b.countback[i]-v,0);
  const rank = m => {
    const rows = [...m.values()].sort((a,b) => compare(a,b) || a.id.localeCompare(b.id));
    rows.forEach((r,i) => r.rank = i && compare(rows[i-1],r)===0 ? rows[i-1].rank : i+1);
    return rows;
  };
  return {drivers:rank(ds),teams:rank(ts)};
}
function stats(s) {
  const rows = s.races.map(r => r.results.find(d => d.driverId==='player'));
  const points = rows.reduce((n,r) => n+r.points,0);
  let titles=0;
  for(let season=1;season<=s.season;season++) if(s.races.filter(r=>r.season===season).length===24 && standings(s,season).drivers.find(d=>d.id==='player')?.rank===1) titles++;
  return {starts:rows.length,points,wins:rows.filter(r=>r.position===1).length,podiums:rows.filter(r=>r.position!==null&&r.position<=3).length,titles,
    earnings:Math.round(s.contracts.reduce((n,c)=>n+c.salary*s.races.filter(r=>r.season===c.season).length/24,0)),score:rows.length?Math.round(100*points/(25*rows.length)):0};
}
function call(b, method, args, capturedInput) {
  const input = args[0] && typeof args[0]==='object' ? capturedInput??json(args[0]) : null;
  const p0=b.privateTape.length,g0=b.globalTape.length;
  let output, error;
  try { output=b.api[method](...args); } catch(e) { error={name:e.name,message:e.message,stack:e.stack}; }
  const inputAfter=input===null?null:json(args[0]);
  return {output,error,inputHeld:input===null||input===inputAfter,inputAfter,private:b.privateTape.slice(p0),global:b.globalTape.slice(g0)};
}
function stateLink(s, ledger, raw=json(s)) {
  const entries = Object.entries(s).map(([key, v]) => [key, key === 'races'
    ? ['ledger', ledger, v.length] : v !== null && typeof v === 'object' ? ['object', object(v)] : ['value', v]]);
  return { entries: object(entries), ledger, prefix: s.races.length, rawSha256: sha(raw), rawBytes: Buffer.byteLength(raw) };
}
function restore(link, ledger) {
  const entries = value(link.entries), result = {}, keys = new Set();
  for (const [key, node] of entries) {
    assert(!keys.has(key), 'unique state field'); keys.add(key);
    if (node[0] === 'ledger') {
      assert.equal(key, 'races'); assert.equal(node[1], link.ledger); assert.equal(node[2], link.prefix);
      assert(Number.isInteger(node[2]) && node[2] >= 0 && (link.ledgerOverride||node[2] <= ledger.length), 'complete ledger prefix');
      result[key] = link.ledgerOverride?value(link.ledgerOverride):ledger.slice(0, node[2]);
      assert.equal(result[key].length,node[2],'full retained prefix length');
    } else if (node[0] === 'object') result[key] = value(node[1]);
    else { assert.equal(node[0], 'value'); result[key] = node[1]; }
  }
  return result;
}
function completion(s) {
  const completed=Math.floor(s.races.length/24);
  return s.phase==='retired' && s.races.length%24 ? s.careerId+':retirement' : completed ? s.careerId+':season-'+completed : null;
}
function traceAction(b, trace, ledger, method, state, rest, id) {
  const beforeRaw=json(state), before=stateLink(state,ledger,beforeRaw), beforeCount=state.races.length,
    beforeDraws=state.draws,beforeRng=state.rng,oldRaces=json(state.races), outcome=call(b,method,[state,...rest],beforeRaw), next=outcome.output;
  if(!outcome.inputHeld&&oldRaces!==json(state.races))before.ledgerOverride=object(JSON.parse(oldRaces));
  if(outcome.error) {
    trace.push({id,method,args:rest,before,inputAfter:stateLink(state,ledger,outcome.inputAfter),
      error:outcome.error,private:outcome.private,global:outcome.global});
    throw Object.assign(new Error(outcome.error.message), {retained:outcome.error});
  }
  check(id+'/input',outcome.inputHeld);
  const historyHeld=oldRaces===json(next.races.slice(0,beforeCount));
  if(!historyHeld)before.ledgerOverride=object(JSON.parse(oldRaces));
  check(id+'/history',historyHeld);
  check(id+'/global',outcome.global.length===0);
  if(b.metadata.observe) {
    check(id+'/stream',outcome.private.length===next.draws-beforeDraws && outcome.private.every((r,i)=>r.draws===beforeDraws+i+1
      && r.rng===((beforeRng+Math.imul(i+1,0x6D2B79F5))>>>0) && Number.isFinite(r.value)&&r.value>=0&&r.value<1)
      && (outcome.private.length?outcome.private.at(-1).rng===next.rng:next.rng===beforeRng));
  }
  trace.push({id,method,args:rest,before,inputAfter:stateLink(state,ledger,outcome.inputAfter),after:stateLink(next,ledger),
    private:outcome.private,global:outcome.global});
  return next;
}
async function career(b,spec) {
  const create=call(b,'createFormulaCareer',[spec.name,spec.seed]), initial=create.output;
  const ledger='career:'+spec.id, trace=[];
  let s=initial;
  check(spec.id+'/field',field(s));
  check(spec.id+'/constructor-global',create.global.length===0);
  const checkpoints=[{id:'initial',state:stateLink(s,ledger)}], seasons=[], qualificationRows=[];
  try {
  for(let season=1;season<=20;season++) {
    for(let round=0;round<24;round++) {
      const readIdBefore=stateLink(s,ledger),readId=call(b,'formulaWeekendId',[s]), key=readId.output, focus=spec.training==='pace'?'pace':['pace','racecraft','composure'][(season+round-1)%3];
      check(spec.id+'/'+season+'/'+round+'/id-read',readId.inputHeld&&readId.private.length===0&&readId.global.length===0&&key===s.careerId+':'+season+':'+round);
      trace.push({id:spec.id+'/'+season+'/'+round+'/id',method:'formulaWeekendId',before:readIdBefore,inputAfter:stateLink(s,ledger),output:key??null,error:readId.error??null,private:readId.private,global:readId.global});
      const before=s,p0=b.privateTape.length;
      s=traceAction(b,trace,ledger,'qualifyFormulaCareer',s,[key,focus,spec.approach],spec.id+'/'+season+'/'+round+'/qualify');
      if(b.metadata.observe) check(spec.id+'/'+season+'/'+round+'/qualifying',qualifying(s,before,b.privateTape.slice(p0)));
      qualificationRows.push({id:key,qualifying:object(s.qualifying)});
      if(round===0&&season===1) checkpoints.push({id:'first-grid',state:stateLink(s,ledger)});
      if(round===23&&season===1) checkpoints.push({id:'season-1-last-grid',state:stateLink(s,ledger)});
      check(spec.id+'/'+season+'/'+round+'/field',field(s));
      s=traceAction(b,trace,ledger,'raceFormulaCareer',s,[key],spec.id+'/'+season+'/'+round+'/race');
      const race=s.races.at(-1);
      check(spec.id+'/'+season+'/'+round+'/points',racePoints(race));
      check(spec.id+'/'+season+'/'+round+'/calendar',race.id===key&&race.season===season&&race.round===round&&race.event===calendar[round]);
      if(round===0&&season===1) checkpoints.push({id:'first-result',state:stateLink(s,ledger)});
      if(round===23&&season===20) checkpoints.push({id:'last-result',state:stateLink(s,ledger)});
      s=traceAction(b,trace,ledger,'advanceFormulaCareer',s,[key],spec.id+'/'+season+'/'+round+'/advance');
    }
    const views=call(b,'formulaStandings',[s]), personal=call(b,'formulaCareerStats',[s]);
    check(spec.id+'/'+season+'/standings',same(views.output,standings(s)));
    check(spec.id+'/'+season+'/stats',same(personal.output,stats(s)));
    check(spec.id+'/'+season+'/reads',views.inputHeld&&personal.inputHeld&&views.private.length===0&&personal.private.length===0&&views.global.length===0&&personal.global.length===0);
    check(spec.id+'/'+season+'/completion',s.completionEvent===completion(s));
    seasons.push({season,state:stateLink(s,ledger),standings:views.output,stats:personal.output,
      readPrivate:[...views.private,...personal.private],readGlobal:[...views.global,...personal.global]});
    checkpoints.push({id:'season-'+season,state:stateLink(s,ledger)});
    if(season===20) break;
    const target=s.offers.find(o=>o.teamId!==s.drivers.find(d=>d.id==='player').teamId)||s.offers[0];
    check(spec.id+'/'+season+'/offers',!!target);
    if(!target) break;
    if(season===1) checkpoints.push({id:'first-contracts',state:stateLink(s,ledger)});
    s=traceAction(b,trace,ledger,'negotiateFormulaOffer',s,[target.id],spec.id+'/'+season+'/negotiate');
    const old=s;
    s=traceAction(b,trace,ledger,'acceptFormulaOffer',s,[target.id],spec.id+'/'+season+'/accept');
    check(spec.id+'/'+season+'/annual-field',field(s));
    check(spec.id+'/'+season+'/annual-age',s.drivers.every(d=>d.id==='player'||!old.drivers.some(p=>p.id===d.id)||d.age===old.drivers.find(p=>p.id===d.id).age+1));
    check(spec.id+'/'+season+'/player-age',s.drivers.find(d=>d.id==='player').age===old.drivers.find(d=>d.id==='player').age+1);
    check(spec.id+'/'+season+'/past-teams',same(s.races,old.races));
    const loaded=call(b,'parseFormulaCareer',[json(s)]);
    check(spec.id+'/'+season+'/reload',semantic(loaded.output,s)&&loaded.private.length===0&&loaded.global.length===0);
    if(season===1) checkpoints.push({id:'first-next-season',state:stateLink(s,ledger)});
  }
  check(spec.id+'/endpoint',s.phase==='retired'&&s.season===20&&s.races.length===480);
  const final=clone(s);
  for(const row of [...trace.flatMap(r=>[r.before,r.inputAfter,...(r.after?[r.after]:[])]),...checkpoints.map(r=>r.state),...seasons.map(r=>r.state)]) {
    const reconstructed=restore(row,final.races);
    check(spec.id+'/ledger-reference',reconstructed.races.length===row.prefix&&sha(json(reconstructed))===row.rawSha256&&Buffer.byteLength(json(reconstructed))===row.rawBytes);
  }
  const payload={spec,initial,constructor:{private:create.private,global:create.global},ledgerId:ledger,final,
    trace,checkpoints,seasons,qualifications:qualificationRows};
  return payload;
  } catch(error) {
    const partial={spec,initial,current:s,constructor:{private:create.private,global:create.global},ledgerId:ledger,
      trace,checkpoints,seasons,qualifications:qualificationRows,error:{name:error.name,message:error.message,stack:error.stack,retained:error.retained??null}};
    (report.partialCareers??=[]).push({id:spec.id,arm:b.id,body:object(partial)});
    throw error;
  }
}
function countbackFixture(state) {
  const s=clone(state), a='player', b=s.races[0].results.find(r=>r.driverId!==a).driverId;
  for(const race of s.races) {
    const rows=new Map(race.results.map(r=>[r.driverId,r]));
    const other=[...rows.keys()].filter(id=>id!==a&&id!==b);
    const places=new Map();
    if(race.round===0){places.set(a,1);places.set(b,2);}
    if(race.round===1){places.set(a,10);places.set(b,6);}
    let n=1;
    const filled=new Set(places.values());
    for(const id of other){while(filled.has(n))n++;places.set(id,n++);}
    race.results=[...rows.values()].map(r=>places.has(r.driverId)?{...r,status:'finished',position:places.get(r.driverId),points:independentPoints[places.get(r.driverId)-1]||0,reason:null}:{...r,status:'retired',position:null,points:0,reason:'Counterexample'});
    race.results.sort((x,y)=>(x.position??100)-(y.position??100)||x.grid-y.grid);
  }
  return s;
}
function probeInputs(base) {
  const first=base.trace.find(t=>t.method==='qualifyFormulaCareer');
  const grid=restore(first.after,base.final.races), result=restore(base.trace.find(t=>t.method==='raceFormulaCareer').after,base.final.races);
  const contract=restore(base.checkpoints.find(c=>c.id==='first-contracts').state,base.final.races);
  const lastFirstGrid=restore(base.checkpoints.find(c=>c.id==='season-1-last-grid').state,base.final.races);
  const actual=base.final, serial=clone(grid), unsafeSerial=clone(base.initial), badCompletion=clone(contract), badGrid=clone(result);
  serial.serial=1; unsafeSerial.serial=9007199254740992; badCompletion.completionEvent=badCompletion.careerId+':season-20';
  badGrid.qualifying.q3[0].ms-=1; badGrid.qualifying.grid[0].ms-=1;
  const historicalSeats=clone(contract), historicalContract=clone(contract), historicalSerial=clone(contract), historicalId=clone(contract), terminal=clone(actual);
  const changeTeam=(s,driverId,teamId) => {
    s.races[0].grid.find(r=>r.driverId===driverId).teamId=teamId;
    s.races[0].results.find(r=>r.driverId===driverId).teamId=teamId;
  };
  const sourceTeam=historicalSeats.contracts[0].teamId, otherTeam=historicalSeats.teams.find(t=>t.id!==sourceTeam).id;
  changeTeam(historicalSeats,historicalSeats.races[0].grid.find(r=>r.driverId!=='player'&&r.teamId===sourceTeam).driverId,otherTeam);
  const swap=historicalContract.races[0].grid.find(r=>r.teamId===otherTeam).driverId;
  changeTeam(historicalContract,'player',otherTeam);changeTeam(historicalContract,swap,sourceTeam);
  for(const [s,id] of [[historicalSerial,'driver-'+historicalSerial.serial],[historicalId,'unknown-generated']]) {
    const oldId=s.races[0].grid.find(r=>r.driverId!=='player').driverId;
    s.races[0].grid.find(r=>r.driverId===oldId).driverId=id;s.races[0].results.find(r=>r.driverId===oldId).driverId=id;
  }
  terminal.phase='contracts';
  terminal.offers=contract.offers.map(o=>({...o,id:terminal.careerId+':offer-20-'+o.teamId,
    outgoingDriverId:terminal.drivers.find(d=>d.teamId===o.teamId&&d.id!=='player').id}));
  const target=contract.offers.find(o=>o.teamId!==contract.drivers.find(d=>d.id==='player').teamId);
  assert(target,'fixed seed1 genuine other-team offer for structural probe');
  const inputs=[
    {id:'qualify',method:'qualifyFormulaCareer',input:base.initial,args:[base.initial.careerId+':1:0','pace','careful'],kind:'qualifying'},
    {id:'race',method:'raceFormulaCareer',input:grid,args:[grid.careerId+':1:0'],kind:'points'},
    {id:'season-finish',method:'raceFormulaCareer',input:lastFirstGrid,args:[lastFirstGrid.careerId+':1:23'],kind:'season-finish'},
    {id:'race-repeat',method:'raceFormulaCareer',input:result,args:[result.careerId+':1:0'],kind:'guard'},
    {id:'qualify-repeat',method:'qualifyFormulaCareer',input:grid,args:[grid.careerId+':1:0','pace','steady'],kind:'guard'},
    {id:'race-stale',method:'raceFormulaCareer',input:grid,args:['wrong:1:0'],kind:'guard'},
    {id:'advance-stale',method:'advanceFormulaCareer',input:result,args:['wrong:1:0'],kind:'guard'},
    {id:'seat',method:'acceptFormulaOffer',input:contract,args:[target.id],kind:'seat'},
    {id:'negotiate',method:'negotiateFormulaOffer',input:contract,args:[target.id],kind:'negotiation'},
    {id:'stats',method:'formulaCareerStats',input:actual,args:[],kind:'stats'},
    {id:'weekend-id',method:'formulaWeekendId',input:grid,args:[],kind:'id'},
    {id:'countback',method:'formulaStandings',input:countbackFixture(contract),args:[],kind:'standings'},
    {id:'invalid-serial',method:'parseFormulaCareer',input:serial,args:[],kind:'invalid'},
    {id:'invalid-unsafe-serial',method:'parseFormulaCareer',input:unsafeSerial,args:[],kind:'invalid'},
    {id:'invalid-completion',method:'parseFormulaCareer',input:badCompletion,args:[],kind:'invalid'},
    {id:'invalid-current-grid',method:'parseFormulaCareer',input:badGrid,args:[],kind:'invalid'},
    {id:'invalid-historical-seats',method:'parseFormulaCareer',input:historicalSeats,args:[],kind:'invalid'},
    {id:'invalid-historical-contract',method:'parseFormulaCareer',input:historicalContract,args:[],kind:'invalid'},
    {id:'invalid-historical-serial',method:'parseFormulaCareer',input:historicalSerial,args:[],kind:'invalid'},
    {id:'invalid-historical-id',method:'parseFormulaCareer',input:historicalId,args:[],kind:'invalid'},
    {id:'invalid-terminal-contracts',method:'parseFormulaCareer',input:terminal,args:[],kind:'invalid'},
    {id:'invalid-json',method:'parseFormulaCareer',input:'{',args:[],kind:'invalid-raw'},
    {id:'valid-grid',method:'parseFormulaCareer',input:grid,args:[],kind:'valid'},
    {id:'valid-final',method:'parseFormulaCareer',input:actual,args:[],kind:'valid'},
    {id:'retire-empty',method:'retireFormulaCareer',input:base.initial,args:[],kind:'retire'},
    {id:'retire-grid',method:'retireFormulaCareer',input:grid,args:[],kind:'guard'},
    {id:'retire-partial',method:'retireFormulaCareer',input:result,args:[],kind:'retire'},
    {id:'retire-full',method:'retireFormulaCareer',input:contract,args:[],kind:'retire'},
  ];
  for(const [id,mutate] of [
    ['version',s=>s.version=2],['rulebook',s=>s.rulebook='unknown'],['round',s=>s.round=24],
    ['duplicate-driver',s=>s.drivers[1].id='player'],['duplicate-team',s=>s.teams[1].id=s.teams[0].id],
    ['missing-seat',s=>s.drivers[1].teamId=s.teams[1].id],['wrong-points',s=>s.races[0].results[0].points=999],
    ['duplicate-race',s=>s.races.push(clone(s.races[0]))],['qualifying-member',s=>s.qualifying.q2[0].driverId='absent'],
    ['future-offer',s=>s.offers[0].id='foreign'],['contract-team',s=>s.contracts[0].teamId='absent']]) {
    const altered=clone(contract);mutate(altered);inputs.push({id:'invalid-'+id,method:'parseFormulaCareer',input:altered,args:[],kind:'invalid'});
  }
  return inputs;
}
function evaluateProbe(b,p) {
  const input=clone(p.input), result=call(b,p.method,p.method==='parseFormulaCareer'?[p.kind==='invalid-raw'?input:json(input)]:[input,...p.args]);
  const out=result.output, errors=[];
  const bad=id=>errors.push(p.id+'/'+id);
  if(result.error) return {id:p.id,kind:p.kind,method:p.method,input:object(p.input),args:object(p.args),inputAfter:object(input),output:object(null),
    private:object(result.private),global:object(result.global),error:result.error,errors:[p.id+'/exception']};
  let repeatEvidence=null;
  if(!result.inputHeld||result.global.length)bad('read-only');
  if(p.kind==='qualifying'&&!qualifying(out,p.input,result.private))bad('qualifying');
  if(p.kind==='points'&&!racePoints(out.races.at(-1)))bad('points');
  if(p.kind==='season-finish'&&(!racePoints(out.races.at(-1))||out.races.length!==24||out.completionEvent!==out.careerId+':season-1'
    ||result.private.length!==60||!same(out.races.slice(0,23),p.input.races)))bad('progression');
  if(p.kind==='guard'&&(!same(out,p.input)||result.private.length||result.global.length))bad('guards');
  if(p.kind==='stats') {
    if(!same(out,stats(p.input)))bad('stats');
    if(!same(input,p.input)||result.private.length)bad('read-only');
  }
  if(p.kind==='id'&&(out!==p.input.careerId+':'+p.input.season+':'+p.input.round||result.private.length||result.global.length||!same(input,p.input)))bad('read-only');
  if(p.kind==='standings'&&!same(out,standings(p.input)))bad('standings');
  if((p.kind==='invalid'||p.kind==='invalid-raw')&&out!==null)bad('save');
  if(p.kind==='valid'&&(!semantic(out,p.input)||result.private.length))bad('save');
  if(p.kind==='seat') {
    if(!field(out))bad('progression');
    if(!out.drivers.every(d=>!p.input.drivers.some(x=>x.id===d.id)||d.age===p.input.drivers.find(x=>x.id===d.id).age+1))bad('progression');
    if(!same(out.races,p.input.races))bad('history');
    const offer=p.input.offers.find(o=>o.id===p.args[0]);
    if(out.contracts.at(-1).teamId!==offer.teamId||out.contracts.at(-1).salary!==offer.salary)bad('contract');
  }
  if(p.kind==='negotiation') {
    const after=out.offers.find(o=>o.id===p.args[0]), before=p.input.offers.find(o=>o.id===p.args[0]);
    if(!after.negotiated||result.private.length!==1||!same(out.races,p.input.races))bad('negotiation');
    const points=standings(p.input).drivers.find(d=>d.id==='player').points,chance=Math.min(0.85,0.25+points/600),roll=result.private[0]?.value;
    const decision=roll<chance?'raise':roll<chance+0.2?'counter':'refused';
    const salary=decision==='raise'?Math.round(before.salary*1.15):decision==='counter'?Math.round(before.salary*1.05):before.salary;
    const expected=clone(p.input);expected.rng=result.private[0]?.rng;expected.draws+=1;
    Object.assign(expected.offers.find(o=>o.id===p.args[0]),{salary,decision,negotiated:true});
    if(!Number.isFinite(roll)||!same(out,expected))bad('negotiation');
    const repeatBefore=clone(out), repeat=call(b,'negotiateFormulaOffer',[out,p.args[0]]);
    repeatEvidence={input:object(repeatBefore),inputAfter:object(out),output:object(repeat.output??null),private:object(repeat.private),global:object(repeat.global),error:repeat.error??null};
    if(repeat.error||!same(repeat.output,repeatBefore)||!same(out,repeatBefore)||repeat.private.length||repeat.global.length)bad('guards');
    if(after.decision==='refused'&&after.salary!==before.salary)bad('negotiation');
  }
  if(p.kind==='retire'&&(out.phase!=='retired'||out.completionEvent!==completion(out)||!same(out.races,p.input.races)||result.private.length))bad('retirement');
  return {id:p.id,kind:p.kind,method:p.method,input:object(p.input),args:object(p.args),inputAfter:object(input),output:object(out),
    private:object(result.private),global:object(result.global),repeat:repeatEvidence,errors:[...new Set(errors)]};
}
function measurements(payload) {
  const s=payload.final, ps=stats(s), changes=s.contracts.slice(1).filter((c,i)=>c.teamId!==s.contracts[i].teamId).length;
  return {id:payload.spec.id,seed:payload.spec.seed,approach:payload.spec.approach,training:payload.spec.training,...ps,
    retirements:s.races.filter(r=>r.results.find(d=>d.driverId==='player').status==='retired').length,
    seatChanges:changes,rivalIdentities:new Set(s.races.flatMap(r=>r.results.map(d=>d.driverId))).size,
    firstPlayer:payload.initial.drivers.find(d=>d.id==='player'),lastPlayer:s.drivers.find(d=>d.id==='player'),
    firstTeams:payload.initial.teams,lastTeams:s.teams,privateDraws:s.draws};
}
try {
  const original=await bundle('unobserved',engineRaw,false), current=await bundle('current',observedRaw,true);
  check('rules/points',same(current.api.FORMULA_GP_POINTS,independentPoints));
  check('rules/calendar',same(current.api.FORMULA_CALENDAR,calendar));
  check('rules/seasons',current.api.FORMULA_CAREER_SEASONS===20&&current.api.FORMULA_RULEBOOK==='gp-2025-simple-v1');
  for(let seed=1;seed<=8;seed++) for(const approach of ['careful','steady','attack']) for(const training of ['pace','rotate'])
    report.population.push({id:seed+'-'+approach+'-'+training,name:'Formula Proof '+seed,seed,approach,training});
  let base;
  for(const spec of report.population) {
    const a=await career(original,spec), b=await career(current,spec);
    const aComparable={...a,constructor:{global:a.constructor.global},trace:a.trace.map(({private:ignored,...r})=>r)};
    const bComparable={...b,constructor:{global:b.constructor.global},trace:b.trace.map(({private:ignored,...r})=>r)};
    check(spec.id+'/replay',same(aComparable,bComparable));
    const refs={id:spec.id,unobserved:object(a),observed:object(b),measurements:measurements(b)};
    report.careers.push(refs);
    if(spec.id==='1-careful-pace')base=b;
    if(spec.id==='2-careful-pace')report.fixtures['replacement-initial']=object(b.initial);
  }
  assert(base,'declared first career retained');
  const inputs=probeInputs(base); report.probeInputs=object(inputs);
  const healthy=inputs.map(p=>evaluateProbe(current,p));report.probes=healthy;
  check('healthy/probes',healthy.every(r=>r.errors.length===0));
  for(const fault of faultDefs) {
    const changed=replaceOnce(observedRaw,fault.from,fault.to,fault.id), faulty=await bundle(fault.id,changed,true);
    const rows=inputs.map(p=>evaluateProbe(faulty,p)), actual=rows.flatMap(r=>r.errors), expected=fault.expected??fault.cases.map(id=>id+'/'+fault.group);
    check(fault.id+'/map',same(actual,expected),{actual,expected});
    const changedIds=rows.filter((r,i)=>!same({...r,errors:[]},{...healthy[i],errors:[]})).map(r=>r.id);
    check(fault.id+'/effective',changedIds.length>0);
    check(fault.id+'/unrelated',changedIds.every(id=>fault.cases.includes(id)),{changedIds,declared:fault.cases});
    report.controls.push({id:fault.id,expected,actual,changedIds,rows:object(rows)});
  }
  const undoRaw=observedRaw.replace(DRAW_TO,DRAW_FROM);
  assert.equal(undoRaw,engineRaw,'whole actual observer source undo');
  const undone=await bundle('whole-undo',replaceOnce(undoRaw,DRAW_FROM,DRAW_TO,'undo-observer'),true);
  const undoRows=inputs.map(p=>evaluateProbe(undone,p));
  check('undo/runtime',same(undoRows,healthy));
  check('undo/compiled',undone.metadata.compiledSha256===current.metadata.compiledSha256);
  report.wholeUndo={rows:object(undoRows),source:object(undoRaw),compiledEqual:undone.metadata.compiledSha256===current.metadata.compiledSha256};
  const observationOriginal=clone(healthy[0]);
  for(const [id,mutate,expected] of [
    ['missing-output',r=>r.output=object(null),['whole-output']],
    ['input-mutation',r=>r.inputAfter=object({...base.initial,draws:base.initial.draws+1}),['input']],
    ['missing-private',r=>r.private=object([]),['private']],
  ]) {
    const faulty=clone(observationOriginal);mutate(faulty);
    const detect=r=> {
      const result=[];
      if(!same(value(r.output),value(observationOriginal.output)))result.push('whole-output');
      if(!same(value(r.inputAfter),value(r.input)))result.push('input');
      const draws=value(r.private),after=value(observationOriginal.output),before=value(r.input);
      if(!Array.isArray(draws)||draws.length!==45||!after||after.draws-before.draws!==45
        || !draws.every((d,i)=>d.draws===before.draws+i+1&&Number.isFinite(d.value)&&d.value>=0&&d.value<1))result.push('private');
      return result;
    };
    const actual=detect(faulty), undo=clone(faulty);
    for(const k of ['output','inputAfter','private'])undo[k]=observationOriginal[k];
    check('observation/'+id+'/effective',!same(faulty,observationOriginal));
    check('observation/'+id+'/map',same(actual,expected));
    check('observation/'+id+'/undo',same(undo,observationOriginal)&&detect(undo).length===0);
    report.observationControls.push({id,original:object(observationOriginal),fault:object(faulty),undo:object(undo),expected,actual});
  }
  const decodeOriginal=clone(base.checkpoints.find(c=>c.id==='first-result').state), decodedState=restore(decodeOriginal,base.final.races);
  const altered=clone(decodeOriginal), alteredEntries=value(altered.entries), ledgerNode=alteredEntries.find(([key])=>key==='races')[1];
  altered.prefix-=1;ledgerNode[2]-=1;altered.entries=object(alteredEntries);
  const detectLink=link=> { const raw=json(restore(link,base.final.races)); return sha(raw)===link.rawSha256&&Buffer.byteLength(raw)===link.rawBytes?[]:['whole-state']; };
  const actual=detectLink(altered), undoneLink=clone(altered), undoEntries=value(undoneLink.entries);
  undoneLink.prefix+=1;undoEntries.find(([key])=>key==='races')[1][2]+=1;undoneLink.entries=object(undoEntries);
  check('codec/effective',!same(altered,decodeOriginal)&&!same(restore(altered,base.final.races),decodedState));
  check('codec/map',same(actual,['whole-state']));
  check('codec/undo',same(undoneLink,decodeOriginal)&&same(restore(undoneLink,base.final.races),decodedState)&&detectLink(undoneLink).length===0);
  report.ledgerCodec={original:object(decodeOriginal),fault:object(altered),undo:object(undoneLink),decoded:object(decodedState),expected:['whole-state'],actual,wholeUndo:true};
  for(const id of ['initial','first-grid','first-result','season-1-last-grid','first-contracts','first-next-season','last-result','season-20']) {
    const c=base.checkpoints.find(c=>c.id===id);
    if(c)report.fixtures[id]=object(restore(c.state,base.final.races));
  }
  report.browserActions=[];
  for(const [id,fixture,method,args] of [
    ['loaded-first-grid','initial','qualifyFormulaCareer',s=>[s.careerId+':1:0','pace','careful']],
    ['loaded-first-result','first-grid','raceFormulaCareer',s=>[s.careerId+':1:0']],
    ['loaded-second-weekend','first-result','advanceFormulaCareer',s=>[s.careerId+':1:0']],
    ['loaded-season-1-last-result','season-1-last-grid','raceFormulaCareer',s=>[s.careerId+':1:23']],
    ['loaded-completed-retired','loaded-season-1-last-result','retireFormulaCareer',()=>[]],
    ['loaded-negotiated','first-contracts','negotiateFormulaOffer',s=>[s.offers.find(o=>o.teamId!==s.drivers.find(d=>d.id==='player').teamId).id]],
    ['loaded-terminal','last-result','advanceFormulaCareer',s=>[s.careerId+':20:23']],
    ['loaded-partial-retired','first-result','retireFormulaCareer',()=>[]],
  ]) {
    const rawInput=value(report.fixtures[fixture]), parsed=call(current,'parseFormulaCareer',[json(rawInput)]);
    check(id+'/parse',semantic(parsed.output,rawInput)&&parsed.private.length===0&&parsed.global.length===0);
    const input=clone(parsed.output), before=clone(input), rest=args(input), outcome=call(current,method,[input,...rest]);
    check(id+'/actual',!outcome.error&&outcome.inputHeld&&outcome.global.length===0);
    const row={id,fixture,method,args:object(rest),rawInput:object(rawInput),parsed:object(before),inputAfter:object(input),output:object(outcome.output??null),
      parsePrivate:object(parsed.private),parseGlobal:object(parsed.global),private:object(outcome.private),global:object(outcome.global),error:outcome.error??null};
    report.browserActions.push(row);report.fixtures[id]=row.output;
    report.fixtures['parsed-'+fixture]=row.parsed;
    if(id==='loaded-negotiated') {
      const beforeAccept=clone(outcome.output), accepted=call(current,'acceptFormulaOffer',[outcome.output,...rest]);
      check('loaded-next-season/actual',!accepted.error&&accepted.inputHeld&&accepted.global.length===0&&field(accepted.output));
      const acceptedRow={id:'loaded-next-season',fixture:id,method:'acceptFormulaOffer',args:object(rest),rawInput:row.output,parsed:object(beforeAccept),
        inputAfter:object(outcome.output),output:object(accepted.output??null),private:object(accepted.private),global:object(accepted.global),error:accepted.error??null};
      report.browserActions.push(acceptedRow);report.fixtures['loaded-next-season']=acceptedRow.output;
    }
  }
  report.privateTape=object(current.privateTape);report.globalTape=object(current.globalTape);
  report.sourcePatches=object(replacements);
  report.counts={careers:report.careers.length,races:report.careers.reduce((n,r)=>n+r.measurements.starts,0),
    probeCases:inputs.length,sourceFaults:faultDefs.length,bundles:report.bundles.length,
    privateValues:current.privateTape.length,globalValues:current.globalTape.length,observationControls:report.observationControls.length};
  report.status=failures.length?'fail':'pass';
} catch(error) {
  report.status='fail';report.error={name:error.name,message:error.message,stack:error.stack};
} finally {
  report.bundleTapes=runtimeBundles.map(b=>({id:b.id,private:object(b.privateTape),global:object(b.globalTape),startup:object(b.startup)}));
  report.sourcePatches=object(replacements);
  writeFileSync(path.join(OUT,'objects.json'),json([...manifest.values()]));
  writeFileSync(path.join(OUT,'report.json'),json(report));
  const size=dir=>readdirSync(dir,{withFileTypes:true}).reduce((n,e)=>n+(e.isDirectory()?size(path.join(dir,e.name)):readFileSync(path.join(dir,e.name)).length),0);
  writeFileSync(path.join(OUT,'size.json'),json({bytes:0,cap:430000000,allDeclaredEvidence:true}));
  let bytes=size(OUT);
  for(let i=0;i<3;i++){writeFileSync(path.join(OUT,'size.json'),json({bytes,cap:430000000,allDeclaredEvidence:true}));bytes=size(OUT);}
  if(bytes>=430000000){report.status='fail';report.sizeFailure={bytes,cap:430000000};writeFileSync(path.join(OUT,'report.json'),json(report));}
}
if(report.status!=='pass') {
  console.error('Formula Career proof failed',json({error:report.error,failures:report.failures,size:report.sizeFailure}));
  process.exitCode=1;
} else {
  console.log('Formula Career full careers: '+report.counts.careers+', saved GP rows: '+report.counts.races);
  console.log('Actual private stream values: '+report.counts.privateValues+', global values: '+report.counts.globalValues);
  console.log('Independent probe cases: '+report.counts.probeCases+', source faults: '+report.counts.sourceFaults+', full runtime undo held');
  console.log('Complete raw source, checkpoints, qualifying, race and final ledger objects retained');
  console.log('PASS Formula Career');
}
