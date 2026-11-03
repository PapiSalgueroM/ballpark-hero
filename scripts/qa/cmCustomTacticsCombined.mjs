import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = process.cwd(), self = fileURLToPath(import.meta.url);
const arg = name => { const i = process.argv.indexOf(name); return i < 0 ? null : process.argv[i + 1]; };
assert.ok(arg('--out'), '--out is required');
const out = path.resolve(arg('--out')), arm = arg('--arm');
await fs.mkdir(out, { recursive: true });
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const enginePath = 'src/lib/clubManager.ts';
const held = [enginePath, 'src/lib/clubManagerPositions.ts', 'src/lib/clubManagerTactics.ts', 'src/lib/clubManagerTacticsCore.ts', 'src/lib/clubManagerMatchPlans.ts'];
const before = Object.fromEntries(await Promise.all(held.map(async file => [file, hash(await fs.readFile(file))])));
assert.equal(before[enginePath], '1ca9560d8658ad88c96a4a085f676b51623a2c9134e665a872993564b95cf2a1');
const original = await fs.readFile(enginePath, 'utf8');
const needle = 'const geometry = positionEdge(xi, mentality, snapshot);';
assert.equal(original.split(needle).length - 1, 1, 'One executable first-half geometry anchor');
const mutant = original.replace(needle, 'const geometry = null;');
assert.notEqual(mutant, original); assert.notEqual(hash(mutant), hash(original));
const marker = 'CM_CUSTOM_COMBINED_TRADEOFFS';

if (!arm) {
  const runs = [];
  for (const name of ['fixed', 'omit-geometry']) {
    const target = path.join(out, name);
    const run = spawnSync(process.execPath, [self, '--out', target, '--arm', name], {
      cwd: root, env: process.env, encoding: 'utf8', timeout: 18 * 60 * 1000, maxBuffer: 16 * 1024 * 1024,
    });
    const log = (run.stdout || '') + '\n' + (run.stderr || '');
    await fs.writeFile(path.join(out, name + '.log'), log);
    assert.ok(!run.error && !run.signal, name + ' must complete');
    const observed = JSON.parse(await fs.readFile(path.join(target, 'measurement.json'), 'utf8'));
    assert.equal(observed.rows.length, 4 * 243 * 5);
    assert.equal(observed.kickoffs, 4 * 243 * 6);
    assert.equal(observed.presetDrawPairs, 4 * 243);
    assert.equal(observed.sourceHeld, true);
    assert.equal(run.status, name === 'fixed' ? 0 : 1);
    assert.doesNotMatch(log, /SyntaxError|TypeError|ReferenceError|Transform failed|Cannot find module|Unhandled Rejection/);
    if (name === 'fixed') assert.equal(observed.status, 'passed');
    else {
      assert.equal(observed.status, 'owned-rejection');
      assert.ok(log.includes(marker), 'The actual changed calculation must fail the tradeoff gate');
      assert.ok(observed.rows.every(row => row.delta.mine === 0 && row.delta.opponent === 0));
      assert.ok(observed.rows.some(row => row.profile.atk !== 0 || row.profile.conceded !== 0));
      assert.equal(observed.mutation.anchorCount, 1);
      assert.notEqual(observed.mutation.originalSha256, observed.mutation.changedSha256);
    }
    runs.push({ arm: name, exit: run.status, rows: observed.rows.length, kickoffs: observed.kickoffs, sourceHeld: observed.sourceHeld, status: observed.status });
  }
  const after = Object.fromEntries(await Promise.all(held.map(async file => [file, hash(await fs.readFile(file))])));
  assert.deepEqual(after, before);
  await fs.writeFile(path.join(out, 'admission.json'), JSON.stringify({
    status: 'ACTUAL_COMBINED_RATE_MEASUREMENT_AND_EFFECTIVE_OMISSION_PASS', runs, before, after,
    scope: 'First-half expected-goal rates from actual fictional-club kickoffs. All81 four-axis mixes with3mentalities,5saved-shape variants and4builder states. Not score calibration, natural seasons or a universal optimal-tactic claim.',
  }, null, 2) + '\n');
  console.log('Combined custom tactics: actual rate tradeoffs and effective geometry omission passed.');
} else {
  assert.ok(['fixed', 'omit-geometry'].includes(arm));
  const entry = path.join(out, 'entry.mjs'), bundle = path.join(out, 'bundle.mjs');
  await fs.writeFile(entry, [
    'const memory = new Map();',
    'globalThis.localStorage = {getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,String(v)),removeItem:k=>memory.delete(k),clear:()=>memory.clear()};',
    'export const E = await import(' + JSON.stringify(path.join(root, enginePath)) + ');',
    'export const T = await import(' + JSON.stringify(path.join(root, 'src/lib/clubManagerTactics.ts')) + ');',
    'export const C = await import(' + JSON.stringify(path.join(root, 'src/lib/clubManagerTacticsCore.ts')) + ');',
    'export const P = await import(' + JSON.stringify(path.join(root, 'src/lib/clubManagerPositions.ts')) + ');',
  ].join('\n') + '\n', { flag: 'wx' });
  const plugins = arm === 'omit-geometry' ? [{
    name: 'declared-first-half-omission',
    setup(api) {
      api.onLoad({ filter: /[/\\]src[/\\]lib[/\\]clubManager\.ts$/ }, args => {
        assert.equal(path.resolve(args.path), path.resolve(enginePath));
        return { contents: mutant, loader: 'ts', resolveDir: path.dirname(args.path) };
      });
    },
  }] : [];
  await build({ entryPoints: [entry], outfile: bundle, bundle: true, platform: 'node', format: 'esm', alias: {'@':path.join(root,'src')}, plugins, logLevel:'error' });
  const priorRandom = Math.random, priorNow = Date.now, priorStore = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const stream = initial => { let seed = initial; return () => { seed = (Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; }; };
  Math.random = stream(7101); Date.now = () => Date.UTC(2026,10,3,12);
  let E, registration;
  const rows = [], fixtures = [], sums = {};
  let kickoffs = 0, presetDrawPairs = 0, caught;
  const clamp = value => Math.max(6,Math.min(94,value));
  const measurement = {
    status: 'incomplete', arm, scope: 'Controlled fictional builder states and actual first-half rates; no invented real sports data or browser override.',
    shapePolicy: {advancedOutfieldY:-10,wideFactor:1.15,compactFactor:0.85,keeperY:60},
    epsilon: 1e-12, epsilonMeaning:'Floating-point equality tolerance only. Tradeoff direction uses its mathematical zero boundary, not a sampled score margin.',
    mutation: arm === 'omit-geometry' ? {anchorCount:1,from:needle,to:'const geometry = null;',originalSha256:hash(original),changedSha256:hash(mutant)} : null,
    sourceBefore:before, rows, fixtures,
  };
  try {
    const api = await import(pathToFileURL(bundle).href); E = api.E; registration = E.engineRegistrations();
    assert.ok(api.C.tacticsImpl(), 'Real instruction implementation must be loaded');
    const mixes = [];
    for (const press of [-1,0,1]) for (const tempo of [-1,0,1]) for (const width of [-1,0,1]) for (const line of [-1,0,1]) mixes.push({press,tempo,width,line});
    assert.equal(mixes.length,81);
    const mentalities = E.MENTALITIES.map(value=>value.id);
    assert.deepEqual([...mentalities].sort(),['attacking','balanced','defensive']);
    const formationsBefore = JSON.stringify(E.FORMATIONS);
    function kickoff(input, seed) {
      const body = JSON.stringify(input), draws = [], next = stream(seed);
      Math.random = () => { const value = next(); draws.push(value); return value; };
      const result = E.playNextEntry(input,{noCoach:true}); kickoffs++;
      assert.equal(result.kind,'halftime'); assert.ok(result.state.live);
      const live = result.state.live;
      assert.equal(result.state.calendar[live.week].type,'league');
      assert.ok([live.lamMine,live.lamOpp].every(value=>Number.isFinite(value)&&value>=0.06&&value<=2.1));
      assert.equal(JSON.stringify(input),body);
      const nextDraw = Math.random();
      return {mine:live.lamMine,opponent:live.lamOpp,draws,nextDraw,formationIndex:live.formationIndex,startXi:live.startXi};
    }
    for (let f=0;f<4;f++) {
      Math.random = stream(7201+f);
      let base = E.startCareer('Geometry Lab '+(f+1),'now',{
        name:'Geometry Lab '+(f+1),leagueId:'premier',stadium:'Lab Ground',budgetTier:'small',quality:72+f*4,replacedClub:'',
        crest:{shape:0,pattern:0,color1:'#2563eb',color2:'#ffffff',initials:'GL'},
      });
      for (let step=0;E.nextFixture(base).kind==='window'&&step<12;step++) base=E.playNextEntry(base).state;
      assert.equal(E.nextFixture(base).kind,'match'); assert.ok(!base.live);
      const formation = E.FORMATIONS[base.formationIndex], preset = formation.slots.map(({x,y})=>({x,y}));
      assert.equal(formation.slots.length,11);
      assert.equal(E.effectiveXIWithSlots(base).length,11);
      fixtures.push({fixture:f,seed:7201+f,club:base.clubName,quality:72+f*4,week:base.week,formationIndex:base.formationIndex,bodySha256:hash(JSON.stringify(base)),scope:'Actual fictional builder state, coach automation disabled identically in every paired kickoff'});
      await fs.writeFile(path.join(out,'fixture-'+f+'.json'),JSON.stringify(base)+'\n');
      for (const mentality of mentalities) for (let mixIndex=0;mixIndex<mixes.length;mixIndex++) {
        const instructions=mixes[mixIndex], state=E.setInstructions({...structuredClone(base),mentality},instructions);
        assert.ok(state); assert.deepEqual(E.instructionsOf(state),instructions); const seed=90001+f*1000+mentalities.indexOf(mentality)*100+mixIndex;
        const baseline=kickoff(state,seed), active=E.effectiveXIWithSlots(state);
        const rawShapes={
          preset,
          advanced:preset.map((p,i)=>({x:p.x,y:formation.slots[i].allowed.includes('GK')?p.y:clamp(p.y-10)})),
          wide:preset.map((p,i)=>({x:formation.slots[i].allowed.includes('GK')?p.x:clamp(50+(p.x-50)*1.15),y:p.y})),
          compact:preset.map((p,i)=>({x:formation.slots[i].allowed.includes('GK')?p.x:clamp(50+(p.x-50)*0.85),y:p.y})),
          keeper:preset.map((p,i)=>({x:p.x,y:formation.slots[i].allowed.includes('GK')?60:p.y})),
        };
        for (const [mode,points] of Object.entries(rawShapes)) {
          const customShape={v:1,formationIndex:state.formationIndex,points};
          assert.ok(api.P.readCustomShape(customShape,state.formationIndex,formation.slots));
          const profile=api.P.customShapeProfile(formation.slots,active,
            formation.slots.map(slot=>E.slotPosition(slot,mentality)),
            formation.slots.map((slot,i)=>E.slotPosition(slot,mentality,points[i])));
          assert.ok(profile);
          const observed=kickoff({...state,customShape},seed);
          assert.equal(observed.formationIndex,baseline.formationIndex);assert.deepEqual(observed.startXi,baseline.startXi);
          const delta={mine:observed.mine-baseline.mine,opponent:observed.opponent-baseline.opponent};
          if(mode==='preset') {
            assert.deepEqual(profile,{advance:0,width:0,crowding:0,keeperExposure:0,atk:0,conceded:0});
            assert.equal(delta.mine,0);assert.equal(delta.opponent,0);
            assert.deepEqual(observed.draws,baseline.draws);assert.equal(observed.nextDraw,baseline.nextDraw);presetDrawPairs++;
          }
          rows.push({fixture:f,mentality,instructions,mode,baseline:{mine:baseline.mine,opponent:baseline.opponent},observed:{mine:observed.mine,opponent:observed.opponent},delta,profile,
            baselineDrawCount:baseline.draws.length,observedDrawCount:observed.draws.length,presetDrawEquality:mode==='preset'?true:null});
          const key=mentality+':'+mode, sum=sums[key]??={count:0,mine:0,opponent:0};
          sum.count++;sum.mine+=delta.mine;sum.opponent+=delta.opponent;
        }
      }
    }
    assert.equal(JSON.stringify(E.FORMATIONS),formationsBefore);
    measurement.means=Object.fromEntries(Object.entries(sums).map(([key,value])=>[key,{count:value.count,mine:value.mine/value.count,opponent:value.opponent/value.count}]));
    assert.equal(rows.length,4860);assert.equal(kickoffs,5832);assert.equal(presetDrawPairs,972);
    const eps=1e-12;
    const direction=mentalities.every(mental=> {
      const mean=mode=>measurement.means[mental+':'+mode];
      return mean('advanced').mine>eps&&mean('advanced').opponent>eps
        &&mean('wide').mine>eps&&mean('wide').opponent>eps
        &&mean('compact').mine< -eps&&mean('compact').opponent< -eps
        &&Math.abs(mean('keeper').mine)<=eps&&mean('keeper').opponent>eps;
    });
    const monotone=rows.every(row=>{
      const a=row.delta.mine,b=row.delta.opponent;
      if(['advanced','wide'].includes(row.mode))return a>=-eps&&b>=-eps;
      if(row.mode==='compact')return a<=eps&&b<=eps;
      if(row.mode==='keeper')return Math.abs(a)<=eps&&b>=-eps;
      return a===0&&b===0;
    });
    assert.ok(direction&&monotone,marker);
    measurement.status='passed';
  } catch(error) {
    caught=error;measurement.status=String(error.message).includes(marker)?'owned-rejection':'setup-or-unrelated-failure';
    measurement.error=String(error.stack||error);
  } finally {
    if(E&&registration)E.restoreEngineRegistrations(registration);
    Math.random=priorRandom;Date.now=priorNow;
    if(priorStore===undefined)delete globalThis.localStorage;else Object.defineProperty(globalThis,'localStorage',priorStore);
    measurement.kickoffs=kickoffs;measurement.presetDrawPairs=presetDrawPairs;
    measurement.sourceAfter=Object.fromEntries(await Promise.all(held.map(async file=>[file,hash(await fs.readFile(file))])));
    measurement.sourceHeld=JSON.stringify(before)===JSON.stringify(measurement.sourceAfter);
    measurement.bundleSha256=hash(await fs.readFile(bundle));
    await fs.writeFile(path.join(out,'measurement.json'),JSON.stringify(measurement,null,2)+'\n');
    assert.deepEqual(measurement.sourceAfter,before);
  }
  if(caught){console.error(caught.stack||caught);process.exitCode=1;}
  else console.log('Actual combined rate sample: '+rows.length+' paired custom rows and '+kickoffs+' real kickoffs.');
}
