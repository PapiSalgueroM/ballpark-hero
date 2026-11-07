// Remote Chromium proof of newer empty Soccer Grid cell selection ownership.
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import pw from '../lib/playwrightLoader.mjs';
import { storedConsent } from '../lib/answerConsent.mjs';

assert(process.env.CI, 'Remote CI only');
assert.equal(process.env.SIM_NETWORK, 'offline');
assert.equal(process.versions.node, '24.22.1');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ROUTE = '/soccer-grid';
const HELPER = 'scripts/qa/playSoccerGridSelectionOwnership.mjs';
const WORKFLOW = '.github/workflows/soccer-grid-selection-ownership-20261106.yml';
const HOOK_FILE = 'src/hooks/useSoccerGrid.ts';
const HOOK = '9b724907eae0a2fbf9e20d38f60d226281051693';
const PAGE = 'fd793d83fef33fa075fcac53e97453cdbf83fff7';
const WIDTHS = [[320, 568, 'unverified'], [390, 844, 'valid'], [1280, 900, 'invalid']];
const configFiles = ["index.html","package.json","package-lock.json","bun.lock","bun.lockb","vite.config.ts","tsconfig.json","tsconfig.app.json","tsconfig.node.json","postcss.config.js","tailwind.config.ts"];
const pins = {
  "src/App.tsx": "8bfedf7aaa1d076e0f0c8e2216c7e46632cd8a33",
  "src/data/gameRegistry.ts": "f560b40a74d1468ac72dfde4ee6fec6635a9a255",
  "public/soccer-grid/index.html": "65fcae9819d92e53462c9f7826bd7d2fa2012fe4",
  "src/pages/SoccerGrid.tsx": "fd793d83fef33fa075fcac53e97453cdbf83fff7",
  "src/hooks/useSoccerGrid.ts": "9b724907eae0a2fbf9e20d38f60d226281051693",
  "src/components/soccer-grid/SoccerGridBoard.tsx": "15007fda66e6a52bf13727d934dcc796bb30f3bb",
  "src/components/soccer-grid/SoccerGridSearch.tsx": "14450f17982a89cc5de886d89fa1a78462ff509f",
  "src/hooks/useDailyPuzzle.ts": "b8a0d6ba268efe0e728c4ee96fbc6c60fcc73846",
  "src/hooks/useGameCompletion.ts": "b104822551fd5d9b1c5d6ddb14f01c79e5a662b2",
  "src/lib/fetchCareerPlayers.ts": "05ba3b3e7893599e3566f00e75ca05e80ab6e872",
  "src/lib/fetchSoccerGridPuzzles.ts": "66f9bdc37d429fda0af9bbc72e856727cb342871",
  "src/lib/fetchAllRows.ts": "16a6d21750405e7a647576ff513ed8ee11d5ba6b",
  "src/lib/soccerGridDifficulty.ts": "d3b1d1882005eb6801db7e9bfa3921091f5fab77",
  "src/data/soccerGridPuzzles.ts": "49141305cd850bf5ae655be8a4575b4d2db5d61e",
  "src/components/CookieConsent.tsx": "7ffba7ff4099c051d949cd20fe31bc75332f215b",
  "src/components/game/HowToPlayPopover.tsx": "527f3c07171db29772d81c6887df5b238eb6e4c4",
  "src/integrations/supabase/client.ts": "d055e064f5c1c0c90230ca562966ee04dfdcd3ce",
  "scripts/lib/answerConsent.mjs": "c6d16997e4c06e8b35dcfd0bab5efcad3069d899",
  "scripts/lib/playwrightLoader.mjs": "4f7739e217e0a47ee82e6bfc8be1c04bed17454a",
  "scripts/lib/hostLikeServer.mjs": "21059d5e8114669df61106c125d5272d357b6236",
  "scripts/lib/offlineTransport.cjs": "0fda542a2649fe5da937c6976fd0f5b6073e74b6",
  "src/test/soccerGridSelectionOwnership.test.tsx": "bda5963ef068981f9d5c81c4767192e9e47f05b5",
  "src/test/soccerGridSubmissionOwnership.test.tsx": "7cb7f94a73ce7340243e7bdae6d6759e2c1a6f11",
  "docs/plans/2026-11-07-soccer-grid-selection-ownership.md": "af9c485b73a30903cd72af884b521ecab6d8eeb2",
  "src/lib/gridRarity.ts": "4d4ad8e7367a6d22f6c29297499a9a7b416e0a8f",
  "src/lib/dateUtils.ts": "12c9de0ed37b0797492f3e936bcba70bdc03d585",
  "src/types/soccerGrid.ts": "fd75d4df578faac66ec19e73269fee96bf2ea779",
  "index.html": "12598fe720eec4fc88d3d33c53ede612d018150c",
  "package.json": "2ff64986fb76ebc51b706f2fd24765768874008a",
  "package-lock.json": "97d6f12a052f25f400462938c241789a083f0bfe",
  "bun.lock": "dff081dcd34a1aa928ddc90d910774a6b855dfe3",
  "bun.lockb": "5d9d33a3bf4f45fa099e2aa3014149e034981149",
  "vite.config.ts": "0112b6ac4f2ad80b2fc04f9ec2f7185300913e7d",
  "tsconfig.json": "6b68d80b7d92d0c4a5d774897f2bedfa95b42669",
  "tsconfig.app.json": "51f581dd91641b4c1f1219f646788e73cf6bf00c",
  "tsconfig.node.json": "3133162c20350e1741b94b8d2ff77b811bec8363",
  "postcss.config.js": "2aa7205d4b402a1bdfbe07110c61df920b370066",
  "tailwind.config.ts": "f83c4f4032d359bc9285828eac3b0961a46c6b17"
};
const qualifiedFixed = {
  run: 42350567717, artifact: 13565521874, head: '740ab572fea80ed4d817d0fa3b739cd5412a6f00',
  tree: '562bed1b146d037a47b6bf4ff9a5d99021740604', newRawBytes: 391364,
  newRawSHA256: 'c9bc6b5b2f950a73c2456306a31cc2c2dafe7efba87e0be2c26751a880fcb821',
};
const qualifiedControls = {
  run: '42351066565', artifact: '13565223258',
  head: '2264389687f5a95ce7b195e6ed891ffc38dbcc42', tree: 'f1be383a949787774128a9aa6992af6b87210a94',
  admissionBytes: '6628', admissionSHA256: '89c4045e292a26f8ae1204b969070e57d69f8acfccbfef0d1ca159ba31951a4d',
};
const priorRaw = { bytes: 667882, sha256: '7519caac4e812d063b8fc74ae832ddc8215be67fcb20c73c5b4946c74d27f55a' };
const wholeAOnly = { key: 'aOnly', frames: 7, offset: 788, bytes: 81284, sha256: 'da562826df59b2352b24c48154ca5aff83e49852a825a44797a322e79bd1c62f' };
for (const value of [qualifiedControls.run, qualifiedControls.artifact, qualifiedControls.admissionBytes]) assert(/^[1-9]\d*$/.test(value), 'Actual qualified controls numeric pin required');
for (const value of [qualifiedControls.head, qualifiedControls.tree]) assert(/^[a-f0-9]{40}$/.test(value), 'Actual qualified controls source pin required');
assert(/^[a-f0-9]{64}$/.test(qualifiedControls.admissionSHA256), 'Actual qualified controls body digest required');
assert.equal(process.env.SOCCER_GRID_SELECTION_HOOK_BLOB, HOOK);

function inputDir(key) {
  const value = process.env[key];
  assert(value && path.isAbsolute(value), key + ' must be an absolute output path');
  const resolved = path.resolve(value);
  assert(resolved.startsWith(ROOT + path.sep), key + ' must remain inside the full checkout output');
  return resolved;
}
const OUT = inputDir('SOCCER_GRID_SELECTION_BROWSER_OUT');
const fixedDirectory = inputDir('SOCCER_GRID_SELECTION_FIXED_REFERENCE');
const controlsDirectory = inputDir('SOCCER_GRID_SELECTION_CONTROLS_REFERENCE');
const fullUnitDirectory = inputDir('SOCCER_GRID_SELECTION_FULL_UNIT');
assert.deepEqual([OUT, fixedDirectory, controlsDirectory].map(file => path.dirname(file)), Array(3).fill(fullUnitDirectory));
assert(!fs.existsSync(OUT), 'Fresh browser evidence directory required');
fs.mkdirSync(OUT);

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const blob = bytes => createHash('sha1').update(Buffer.from('blob ' + bytes.length + '\0')).update(bytes).digest('hex');
const refOf = (file, bytes) => ({file, bytes: bytes.length, sha256: sha(bytes)});
const readRoot = file => fs.readFileSync(path.join(ROOT, file));
const sourceReceipt = file => refOf(file, readRoot(file));
const fileRef = file => refOf(file, fs.readFileSync(path.join(OUT, file)));
function write(file, body) {
  const target = path.join(OUT, file);
  fs.mkdirSync(path.dirname(target), {recursive: true});
  fs.writeFileSync(target, body, {flag: 'wx'});
  return fileRef(file);
}
const put = (name, value) => write(name + '.json', JSON.stringify(value, null, 2) + '\n');
function readRef(ref) {
  const bytes = fs.readFileSync(path.join(OUT, ref.file));
  assert.deepEqual(refOf(ref.file, bytes), ref);
  return JSON.parse(bytes);
}
const git = (...args) => execFileSync('git', args, {cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024});
const tracked = () => git('ls-files', '-z').split('\0').filter(Boolean).map(sourceReceipt);
function files(dir, prefix = '') {
  return fs.readdirSync(dir, {withFileTypes: true}).sort((a,b) => a.name.localeCompare(b.name)).flatMap(entry => {
    const file = prefix + entry.name;
    if (entry.isDirectory()) return files(path.join(dir, entry.name), file + '/');
    assert(entry.isFile(), 'Regular file required: ' + file);
    return [file];
  });
}
const distInventory = () => files(path.join(ROOT, 'dist'), 'dist/').map(sourceReceipt);
function versions() {
  const lock = JSON.parse(readRoot('package-lock.json'));
  const rows = Object.keys(lock.packages).filter(file => file.startsWith('node_modules/') && fs.existsSync(path.join(ROOT, file, 'package.json')))
    .map(file => [file, JSON.parse(readRoot(file + '/package.json')).version]);
  assert.equal(rows.length, 521);
  for (const [file, version] of rows) assert.equal(version, lock.packages[file].version, file);
  return rows;
}
function offline() {
  const receipt = sourceReceipt(path.relative(ROOT, path.resolve(ROOT, process.env.SIM_OFFLINE_RECEIPT)));
  assert.equal(receipt.bytes, 0);
  return receipt;
}
const fixedRead = file => fs.readFileSync(path.join(fixedDirectory, 'packet', file));
const controlRead = file => fs.readFileSync(path.join(controlsDirectory, 'packet', file));
const fullUnitRead = file => fs.readFileSync(path.join(fullUnitDirectory, file));
function exactBody(bytes, size, digest) {
  assert.deepEqual([bytes.length, sha(bytes)], [Number(size), digest]);
}
for (const [directory, expected] of [[fixedDirectory, qualifiedFixed], [controlsDirectory, qualifiedControls]]) {
  const run = JSON.parse(fs.readFileSync(path.join(directory, 'run.json')));
  const meta = JSON.parse(fs.readFileSync(path.join(directory, 'artifact.json')));
  if (Object.hasOwn(meta, 'artifacts')) assert.equal(meta.artifacts.length, 1);
  const artifact = meta.artifacts?.[0] ?? meta;
  assert.deepEqual([run.id,run.status,run.conclusion,run.head_sha,run.head_commit.tree_id,artifact.id,artifact.workflow_run.id,artifact.workflow_run.head_sha],
    [Number(expected.run),'completed','success',expected.head,expected.tree,Number(expected.artifact),Number(expected.run),expected.head]);
}
for (const [read, expected] of [[fixedRead, qualifiedFixed], [controlRead, qualifiedControls]]) {
  assert.equal(read('head.txt').toString('utf8').trim(), expected.head);
  assert.equal(read('tree.txt').toString('utf8').trim(), expected.tree);
}
const fixedNew = fixedRead('raw.json'), fullNew = fullUnitRead('raw.json');
const fixedPrior = fixedRead('prior-submission-raw.json'), fullPrior = fullUnitRead('prior-submission-raw.json');
exactBody(fixedNew, qualifiedFixed.newRawBytes, qualifiedFixed.newRawSHA256);
exactBody(fixedPrior, priorRaw.bytes, priorRaw.sha256);
assert(fullNew.equals(fixedNew) && fullPrior.equals(fixedPrior), 'Complete fresh fixed and prior RAW bytes must match admitted references');
const slice = fullNew.subarray(wholeAOnly.offset, wholeAOnly.offset + wholeAOnly.bytes);
exactBody(slice, wholeAOnly.bytes, wholeAOnly.sha256);
assert(slice.equals(fixedRead('preserve-aOnly.literal.json')) && slice.equals(fullUnitRead('preserve-aOnly.literal.json')));
for (const read of [fixedRead, fullUnitRead]) {
  const adm = JSON.parse(read('fixed-admission.json'));
  assert.deepEqual([adm.status,adm.actualCases,adm.actualPasses,adm.actualFailures,adm.newFrames,adm.priorFrames,adm.wholeAOnlyLiteralHeld,adm.wholePriorRawLiteralHeld],
    ['passed-fixed-soccer-grid-selection-ownership-qualification',18,18,0,32,56,true,true]);
}
const controlsBody = controlRead('controls-admission.json');
exactBody(controlsBody, qualifiedControls.admissionBytes, qualifiedControls.admissionSHA256);
const controls = JSON.parse(controlsBody);
assert.equal(controls.status, 'passed-three-physical-grid-selection-control-arms');
assert.equal(controls.exactSourceIndexLocksInstalledOfflineRestored, true);
assert.deepEqual(Object.values(controls.totals), [3,54,51,3,96,168,84,66,210,3,21]);
assert.deepEqual(controls.arms.map(row => row.name), ['fixed', 'original', 'restored']);
assert.deepEqual([controls.source.head,controls.source.tree,controls.fixedReference.head,controls.fixedReference.tree,controls.fixedReference.rawSHA256],
  [qualifiedControls.head,qualifiedControls.tree,qualifiedFixed.head,qualifiedFixed.tree,qualifiedFixed.newRawSHA256]);

const head = git('rev-parse', 'HEAD').trim(), tree = git('rev-parse', 'HEAD^{tree}').trim();
assert.equal(head, process.env.GITHUB_SHA);
assert.deepEqual(git('rev-list','--parents','-n','1','HEAD').trim().split(' '), [head, qualifiedFixed.head]);
assert.equal(git('rev-parse', qualifiedFixed.head + '^{tree}').trim(), qualifiedFixed.tree);
const index = () => git('ls-files', '--stage', '-z');
const treeRows = ref => new Map(git('ls-tree','-r','-z',ref).split('\0').filter(Boolean).map(line => {
  const [tuple, file] = line.split('\t');
  const [mode, type, oid] = tuple.split(' ');
  assert.equal(type, 'blob');
  return [file, {mode, blob: oid}];
}));
const fixedTree = treeRows(qualifiedFixed.head), currentTree = treeRows('HEAD');
assert.deepEqual([fixedTree.size,currentTree.size], [5786,5787]);
assert.deepEqual([...currentTree.keys()].filter(file => !fixedTree.has(file)), [HELPER]);
assert.deepEqual([...fixedTree.keys()].filter(file => !currentTree.has(file)), []);
assert.deepEqual([...fixedTree].filter(([file,row]) => JSON.stringify(row) !== JSON.stringify(currentTree.get(file))).map(([file]) => file), [WORKFLOW]);
const scoped = rows => [...rows.keys()].filter(file => /^(src|public|scripts)\//.test(file)).length;
assert.deepEqual([scoped(fixedTree),scoped(currentTree),configFiles.length], [4661,4662,11]);
for (const [file,want] of Object.entries(pins)) assert.deepEqual([fixedTree.get(file).blob,currentTree.get(file).blob,blob(readRoot(file))], [want,want,want], file);
for (const line of index().split('\0').filter(Boolean)) {
  const [tuple,file] = line.split('\t');
  const [mode,oid,stage] = tuple.split(' ');
  assert.deepEqual([mode,oid,stage],[currentTree.get(file).mode,currentTree.get(file).blob,'0'], file);
  assert.equal(blob(readRoot(file)), oid, 'Physical current source '+file);
}
git('diff', '--exit-code', 'HEAD', '--', '.');
const qualifiedInput = put('qualified-input-binding', {
  fixed: qualifiedFixed, controls: qualifiedControls, priorRaw, wholeAOnly,
  freshUnitRAWByteEqual: true, freshPriorRAWByteEqual: true, wholeAOnlyLiteralEqual: true,
  current: {head,tree,workflow:currentTree.get(WORKFLOW).blob,helper:currentTree.get(HELPER).blob,hook:HOOK},
  sourceJoin: {fixedTracked:5786,currentTracked:5787,fixedScoped:4661,currentScoped:4662,rootConfigs:11,heldFixedRows:5785,changed:[WORKFLOW],added:[HELPER]},
  limits: 'Input pins refer to separately authenticated fixed and controls workflow evidence. Only the displayed browser evidence files are internal body references.',
});
const snapshot = readRoot('public/soccer-grid/index.html');
assert.equal(snapshot.length,22206);
assert.equal(sha(snapshot),'1192edbcd5e66208e50a5e5c7578b933687a5480fa0453638bea45211ac15823');
const builtDocument = readRoot('dist/soccer-grid/index.html');
const dom = new JSDOM(builtDocument.toString('utf8'));
const builtModule = dom.window.document.querySelector('script[type=module][src]')?.getAttribute('src');
assert(builtModule?.startsWith('/assets/'));
dom.window.close();
const distBefore = distInventory();
assert.equal(distBefore.length,850);
const distByFile = new Map(distBefore.map(row => [row.file,row]));
const fixture = JSON.parse(fixedNew).fixture;
assert.equal(fixture.puzzle.id,'fixture-selection-ownership');
assert.deepEqual(fixture.puzzle.rows.map(row => row.label),['Fixture Row 0','Fixture Row 1','Fixture Row 2']);
assert.deepEqual(fixture.puzzle.cols.map(row => row.label),['Fixture Column 0','Fixture Column 1','Fixture Column 2']);
assert.deepEqual(fixture.players.map(player => player.player_name),['Fixture Aster']);
assert.deepEqual(fixture.seasons.map(season => season.player_id),[fixture.players[0].id]);
const NAME = fixture.players[0].player_name, ID = fixture.puzzle.id;
const backend = 'https://flawuiqbvjobmkfkauhw.supabase.co';
const aLabels = [fixture.puzzle.rows[0].label,fixture.puzzle.cols[0].label];
const bLabels = [fixture.puzzle.rows[1].label,fixture.puzzle.cols[1].label];
const retryNotice = "Couldn't verify that answer, please try again.";
const validatorBody = {playerName:NAME,rowAttribute:aLabels[0],colAttribute:aLabels[1]};
const selectionBody = {puzzle_id:ID,cell_index:0,player_name:NAME.toLowerCase()};
const countQuery = {select:'*',puzzle_id:'eq.'+ID,cell_index:'eq.0'};
const specs = {
  puzzles: {method:'GET',path:'/rest/v1/soccer_grid_puzzles',query:{select:'puzzle_id,rows_json,cols_json',order:'sort_order.asc'},status:200},
  players: {method:'GET',path:'/rest/v1/career_players',query:{select:'id,player_name,nationality,position',order:'player_name.asc'},status:200},
  seasons: {method:'GET',path:'/rest/v1/career_seasons',query:{select:'player_id,season,club,goals,assists,appearances,market_value,sort_order',order:'player_id.asc,sort_order.asc',offset:'0',limit:'1000'},status:200},
  validator: {method:'POST',path:'/functions/v1/soccer-grid-validate',query:{},status:200},
  rarityTotal: {method:'HEAD',path:'/rest/v1/soccer_grid_selections',query:countQuery,status:200},
  rarityPlayer: {method:'HEAD',path:'/rest/v1/soccer_grid_selections',query:{...countQuery,player_name:'eq.'+NAME.toLowerCase()},status:200},
  selectionInsert: {method:'POST',path:'/rest/v1/soccer_grid_selections',query:{},status:201},
};
const responseBodies = Object.fromEntries(Object.entries({
  puzzles:[{puzzle_id:ID,rows_json:fixture.puzzle.rows,cols_json:fixture.puzzle.cols}],players:fixture.players,seasons:fixture.seasons,
  valid:{valid:true,fullName:NAME},unverified:{valid:false,unverified:true},invalid:{valid:false},
}).map(([name,value]) => [name,write('wire/'+name+'.json',JSON.stringify(value))]));
const report = {
  version:1,status:'running',route:ROUTE,hook:HOOK,page:PAGE,helper:currentTree.get(HELPER).blob,head,tree,qualifiedInput,
  pins,configFiles,responseBodies,sourceBefore:tracked(),distBefore,locksBefore:['package.json','package-lock.json'].map(sourceReceipt),
  installedBefore:versions(),offlineBefore:offline(),indexBefore:write('index-before.txt',index()),
  builtDocument:distByFile.get('dist/soccer-grid/index.html'),builtModule,journeys:[],screenshots:[],
  limits:['Three viewport Chromium contexts, one verdict per viewport.','Actual trusted mouse and keyboard; normal browser time. No browser clock, RNG, DOM or storage mutation.','Fictional SDK boundary. All external network continuation blocked. No B submission, completion or provider write.','Viewport photographs document measured anchors. No whole-page fit or hardware-touch claim.'],
};
assert.deepEqual([report.sourceBefore.length, report.distBefore.length], [5787,850]);
const wait = async (predicate, label, timeout = 15000) => {
  const end = Date.now() + timeout;
  while (!(await predicate())) {
    assert(Date.now() < end, label);
    await new Promise(resolve => setTimeout(resolve, 35));
  }
};
let browser, host;

async function runContext(BASE, journey) {
  const {width,height,verdict} = journey, id = String(width);
  const row = {id,width,height,verdict,status:'running',navigations:[],events:[],storageEvents:[],requests:[],wireResponses:[],
    webSockets:[],errors:[],assetErrors:[],routeErrors:[],frames:[],actions:[],preparations:[],layouts:[],wheels:[],screenshots:[],
    checkpoints:{},firstPartyReads:[],firstPartyResponses:[]};
  journey.contexts.push(row);
  const context = await browser.newContext({viewport:{width,height},deviceScaleFactor:1,serviceWorkers:'block',locale:'en-US'});
  let page, probe;
  let release;
  const held = new Promise(resolve => {release = resolve;});
  const routeTasks = new Set(), responseTasks = new Set();
  const remember = (tasks, task) => {
    tasks.add(task);
    task.then(() => tasks.delete(task), error => {
      tasks.delete(task);
      row.routeErrors.push(String(error.stack || error));
    });
    return task;
  };
  const readState = () => page.evaluate(observation => observation.read(), probe);
  const main = () => page.locator('main#dukb-main');
  const cell = n => main().locator('button[data-grid-cell-status]').nth(n);
  const input = () => main().getByRole('combobox',{name:'Search for a player',exact:true});
  const button = name => main().getByRole('button',{name,exact:true});
  const dialog = () => page.getByRole('dialog',{name:'How to Play Soccer Grid',exact:true});
  const cookies = () => page.getByRole('region',{name:'Cookie choices',exact:true});
  const wire = () => row.requests.filter(item => item.wireKind);
  const pending = () => wire().filter(item => item.outcome === 'waiting-for-release');
  const check = (truth,label) => assert(truth,id+' '+label);
  const equal = (actual,expected,label) => assert.deepEqual(actual,expected,id+' '+label);

  const settle = () => page.evaluate(async () => {
    await document.fonts.ready;
    let previous = '', same = 0;
    const end = performance.now() + 8000;
    do {
      await new Promise(requestAnimationFrame);
      const rects = [...document.querySelectorAll('main button,main input,[role=dialog],[role=region][aria-label="Cookie choices"] button')]
        .filter(element => element.getClientRects().length).map(element => {
          const rect = element.getBoundingClientRect();
          return [rect.x,rect.y,rect.width,rect.height];
        });
      const value = JSON.stringify(rects);
      same = value === previous ? same + 1 : 1;
      previous = value;
      if (same >= 4) return;
    } while (performance.now() < end);
    throw Error('Actual control geometry did not settle');
  });
  const frame = async (name, observed) => {
    if (!observed) await settle();
    const state = observed ?? await readState();
    equal([state.url,state.viewport.width,state.viewport.height,state.visibility],[BASE+ROUTE,width,height,'visible'],'actual route and viewport');
    const network = {sampledAt:Date.now(),requests:row.requests.length,responses:row.wireResponses.length,storageEvents:row.storageEvents.length,
      wire:wire().map(({wireKind,method,at,outcome,status,releasedAt,finishedAt,responseBody}) =>
        ({wireKind,method,at,outcome,status:status??null,releasedAt:releasedAt??null,finishedAt:finishedAt??null,responseBody:responseBody??null}))};
    const value = {name,capture:observed?'passive-mutation':'live',...state,network};
    const ref = put(id+'/frames/'+String(row.frames.length).padStart(3,'0')+'-'+name,value);
    row.frames.push(ref);
    return {ref,value};
  };
  const checkpoint = async (name, observed) => {
    const f = await frame(name, observed);
    row.checkpoints[name] = f.ref;
    return f.value;
  };
  function stableGame(a,b,label) {
    for (const key of ['url','timeOrigin','cells','selected','prompt','search','correct','guessesLeft','timer','storage','sessionStorage','daily']) {
      equal(a[key],b[key],label+' '+key);
    }
  }
  const geometry = target => target.evaluate(el => {
    const r = el.getBoundingClientRect(), center = {x:r.x+r.width/2,y:r.y+r.height/2};
    const hit = document.elementFromPoint(center.x,center.y), ancestors = [];
    let top = 0, bottom = 0;
    for (const x of [6,innerWidth/2,innerWidth-6]) for (const [y,edge] of [[1,'top'],[innerHeight-2,'bottom']]) {
      for (const node of document.elementsFromPoint(x,y)) {
        const style = getComputedStyle(node), rect = node.getBoundingClientRect();
        if (!['fixed','sticky'].includes(style.position) || rect.height<=0 || rect.height>innerHeight*.4 || node.contains(el)) continue;
        if (edge==='top' && rect.y<=2 && rect.bottom>0) top = Math.max(top,rect.bottom);
        if (edge==='bottom' && rect.bottom>=innerHeight-2 && rect.y<innerHeight) bottom = Math.max(bottom,innerHeight-rect.y);
      }
    }
    for (let node=el.parentElement;node;node=node.parentElement) {
      if (node===document.scrollingElement) continue;
      const style=getComputedStyle(node), rect=node.getBoundingClientRect();
      const clips=['auto','scroll','hidden','clip','overlay'], cx=clips.includes(style.overflowX), cy=clips.includes(style.overflowY);
      if (cx||cy) ancestors.push({tag:node.tagName,cx,cy,x:rect.x+node.clientLeft,y:rect.y+node.clientTop,
        right:rect.x+node.clientLeft+node.clientWidth,bottom:rect.y+node.clientTop+node.clientHeight,
        scrollableY:['auto','scroll','overlay'].includes(style.overflowY)&&node.scrollHeight>node.clientHeight+1,
        scrollTop:node.scrollTop,scrollHeight:node.scrollHeight,clientHeight:node.clientHeight});
    }
    return {at:Date.now(),rect:{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom},center,
      viewport:{width:innerWidth,height:innerHeight},chrome:{top,bottom},ancestors,hit:hit===el||el.contains(hit),
      enabled:!el.matches(':disabled')&&el.getAttribute('aria-disabled')!=='true',tag:el.tagName,text:el.textContent.trim(),
      label:el.getAttribute('aria-label'),cellIndex:[...document.querySelectorAll('main button[data-grid-cell-status]')].indexOf(el),
      meets44:r.width>=44&&r.height>=44};
  });
  const qualifies = g => g.rect.width>0&&g.rect.height>0&&g.rect.x>=0&&g.rect.right<=width&&g.rect.y>=g.chrome.top&&
    g.rect.bottom<=height-g.chrome.bottom&&g.ancestors.every(c=>(!c.cx||(g.rect.x>=c.x&&g.rect.right<=c.right))&&
      (!c.cy||(g.rect.y>=c.y&&g.rect.bottom<=c.bottom)))&&g.hit&&g.enabled;
  const saveLayout = (name,kind,g,usedForActuation) => {
    const ref = put(id+'/layouts/'+String(row.layouts.length).padStart(3,'0')+'-'+name,{name,kind,usedForActuation,qualified:true,...g});
    row.layouts.push(ref);
    return ref;
  };
  async function prepare(target,name,kind) {
    check(await target.count()===1&&await target.isVisible(),'unique visible '+name);
    const firstWheel = row.wheels.length;
    for (let attempt=0;attempt<16;attempt++) {
      const g = await geometry(target);
      if (qualifies(g)) {
        const layout = saveLayout(name,kind,g,false);
        const ref = put(id+'/preparations/'+String(row.preparations.length).padStart(3,'0')+'-'+name,{name,kind,layout,wheels:row.wheels.slice(firstWheel)});
        row.preparations.push(ref);
        return layout;
      }
      const viewTop=g.chrome.top, viewBottom=height-g.chrome.bottom;
      const clips=g.ancestors.filter(c=>c.cy);
      const top=Math.max(viewTop,...clips.map(c=>c.y)), bottom=Math.min(viewBottom,...clips.map(c=>c.bottom));
      check(g.rect.width>0&&g.rect.height>0&&g.rect.height<=bottom-top,'target fits measured vertical clip '+name+' '+JSON.stringify(g));
      check(g.rect.x>=0&&g.rect.right<=width&&g.ancestors.every(c=>!c.cx||(g.rect.x>=c.x&&g.rect.right<=c.right)),'target fits measured horizontal clip '+name);
      const dy=g.rect.y<top?Math.floor(g.rect.y-top-8):g.rect.bottom>bottom?Math.ceil(g.rect.bottom-bottom+8):0;
      check(dy!==0,'visible center is blocked without a scroll remedy '+name);
      const container=g.ancestors.find(c=>c.scrollableY&&Math.min(c.bottom,viewBottom)>Math.max(c.y,viewTop));
      const point={x:container?Math.max(2,Math.min(width-2,(Math.max(0,container.x)+Math.min(width,container.right))/2)):width/2,
        y:container?(Math.max(0,viewTop,container.y)+Math.min(viewBottom,container.bottom))/2:(viewTop+viewBottom)/2};
      const before=await frame(name+'-wheel-'+attempt+'-before'), start=row.events.length;
      await page.mouse.move(point.x,point.y);
      await page.mouse.wheel(0,dy);
      await wait(async()=>{const next=await geometry(target);return Math.abs(next.rect.y-g.rect.y)>.5||
        JSON.stringify(next.ancestors.map(c=>c.scrollTop))!==JSON.stringify(g.ancestors.map(c=>c.scrollTop));},id+' actual wheel changes target geometry');
      const after=await frame(name+'-wheel-'+attempt+'-after'),events=row.events.slice(start);
      check(events.some(event=>event.type==='wheel'&&event.trusted&&event.deltaMode===0&&event.deltaY===dy),'measured trusted native wheel');
      if (row.checkpoints.ready) stableGame(before.value,after.value,'wheel holds game');
      const ref=put(id+'/wheels/'+String(row.wheels.length).padStart(3,'0')+'-'+name,{name,point,deltaX:0,deltaY:dy,
        before:before.ref,after:after.ref,geometryBefore:g,geometryAfter:await geometry(target),events});
      row.wheels.push(ref);
    }
    throw Error(id+' bounded native wheel preparation exhausted '+name);
  }
  function action(name,value) {
    const ref=put(id+'/actions/'+String(row.actions.length).padStart(3,'0')+'-'+name,{name,...value});
    row.actions.push(ref);
  }
  async function click(name,target,kind,done) {
    await prepare(target,name,kind);
    let measured=await geometry(target);
    await page.mouse.move(measured.center.x,measured.center.y);
    await settle();
    measured=await geometry(target);
    check(qualifies(measured),'final hovered whole-target geometry '+name);
    const layout=saveLayout(name+'-click',kind,measured,true);
    const before=await frame(name+'-before'),start=row.events.length;
    await page.mouse.click(measured.center.x,measured.center.y);
    if (done) await wait(done,id+' completed action '+name);
    const after=await frame(name+'-after'),events=row.events.slice(start),clicks=events.filter(event=>event.type==='click');
    check(clicks.length===1,'one actual native click '+name);
    const received=clicks[0];
    equal([received.trusted,received.pointerType,received.targetTag,received.targetText,received.targetLabel,received.cellIndex],
      [true,'mouse',measured.tag,measured.text,measured.label,measured.cellIndex],'actual click targets qualified control '+name);
    check(Math.abs(received.x-measured.center.x)<=1&&Math.abs(received.y-measured.center.y)<=1,'actual click uses measured center '+name);
    action(name,{kind,method:'mouse',layout,before:before.ref,after:after.ref,events});
    return after.value;
  }
  async function typeA() {
    await prepare(input(),'type-a','keyboard');
    const measured=await geometry(input());
    check(qualifies(measured),'typing input geometry');
    const layout=saveLayout('type-a-keyboard','keyboard',measured,true);
    const before=await frame('type-a-before'),start=row.events.length;
    check(before.value.focus.isSearch&&before.value.search?.value===''&&!before.value.search.disabled,'actual empty A combobox owns focus');
    const focus=await page.evaluateHandle(()=>document.activeElement);
    try {
      await page.keyboard.type(NAME);
      await wait(async()=>{const s=await readState();return s.search?.value===NAME&&s.search.options.some(option=>option.name===NAME);},id+' actual fictional career suggestion');
      const after=await frame('type-a-after'),events=row.events.slice(start);
      const typing=events.filter(event=>event.type==='input');
      check(typing.length>0&&typing.every(event=>event.trusted&&event.targetRole==='combobox'&&event.targetLabel==='Search for a player'),'trusted typing in owned combobox');
      equal(typing.at(-1).value,NAME,'actual typed value');
      const focusIdentityHeld=await page.evaluate(el=>document.activeElement===el,focus);
      check(focusIdentityHeld&&after.value.focus.isSearch,'actual typing focus held');
      action('type-a',{kind:'business',method:'typing',requested:NAME,layout,before:before.ref,after:after.ref,events,focusIdentityHeld});
    } finally {await focus.dispose();}
  }
  async function photo(name,target) {
    await prepare(target,name+'-photo','display');
    const measured=await geometry(target);
    check(qualifies(measured),'qualified viewport photo anchor '+name);
    const layout=saveLayout(name+'-photo-final','display',measured,false);
    const before=await frame(name+'-photo-before'),focus=await page.evaluateHandle(()=>document.activeElement);
    const file=id+'-'+name+'.png';
    try {
      await page.screenshot({path:path.join(OUT,file),fullPage:false,caret:'initial'});
      const after=await frame(name+'-photo-after');
      stableGame(before.value,after.value,'photo holds game');
      equal(before.value.scroll,after.value.scroll,'photo holds scroll');
      const focusIdentityHeld=await page.evaluate(el=>document.activeElement===el,focus);
      check(focusIdentityHeld,'photo holds actual focus identity');
      const ref={...fileRef(file),name,context:id,verdict,layout,viewport:{width,height},before:before.ref,after:after.ref,focusIdentityHeld};
      row.screenshots.push(ref);report.screenshots.push(ref);
    } finally {await focus.dispose();}
  }

  function refusedBackground(url,method,headers,body) {
    if (body) return null;
    if (method==='GET' && ((url.hostname==='fonts.googleapis.com'&&url.pathname==='/css2') ||
        (url.hostname==='fonts.gstatic.com'&&url.pathname.startsWith('/s/')))) return 'known-font';
    if (method==='GET'&&url.hostname==='flagcdn.com'&&/^\/w(?:20|40|80|160|320)\/(?:[a-z]{2}|gb-(?:eng|sct|wls|nir))\.png$/.test(url.pathname)&&!url.search) return 'known-flag';
    if (url.origin!==backend || !(method==='GET'||method==='OPTIONS'&&headers['access-control-request-method']==='GET')) return null;
    const query=Object.fromEntries(url.searchParams);
    if (url.pathname==='/rest/v1/live_scores') {
      const dates=url.searchParams.getAll('start_at');
      check(query.select==='*'&&query.order==='start_at.asc'&&query.limit==='150'&&dates.length===2&&
        dates.some(value=>value.startsWith('gte.'))&&dates.some(value=>value.startsWith('lte.'))&&
        [...url.searchParams.keys()].every(key=>['select','order','limit','start_at'].includes(key)),'bounded held live-score intent');
      return 'known-live-score';
    }
    if (url.pathname==='/rest/v1/game_completions') {
      check(query.select==='game,completed_on'&&query.order==='completed_on.desc'&&query.limit==='500'&&
        query.player_name?.startsWith('eq.')&&Object.keys(query).sort().join(',')==='limit,order,player_name,select','bounded held completion-history intent');
      return 'known-completion-history';
    }
    return null;
  }
  async function routeRequest(route) {
    const request=route.request(),url=new URL(request.url()),method=request.method(),body=request.postDataBuffer();
    if (url.origin===BASE&&['GET','HEAD'].includes(method)&&!body) {
      row.firstPartyReads.push({at:Date.now(),url:url.href,method,resourceType:request.resourceType(),outcome:'continued-local-read'});
      await route.continue();
      return;
    }
    const item={sequence:row.requests.length,at:Date.now(),url:url.href,path:url.pathname,method,query:[...url.searchParams],
      headers:null,body:body?{redacted:true,bytes:body.length,sha256:sha(body)}:null,outcome:'pending'};
    row.requests.push(item);
    try {
      const headers=await request.allHeaders();
      const redacted=['authorization','apikey','cookie','proxy-authorization'];
      item.headers=Object.fromEntries(Object.entries(headers).map(([key,value])=>[key,redacted.includes(key)?
        {redacted:true,bytes:Buffer.byteLength(value),sha256:sha(Buffer.from(value))}:value]));
      const allowOrigin={'access-control-allow-origin':BASE};
      const requestedMethod=method==='OPTIONS'?headers['access-control-request-method']:method;
      const match=url.origin===backend?Object.entries(specs).find(([,spec])=>spec.path===url.pathname&&spec.method===requestedMethod&&
        url.searchParams.size===Object.keys(spec.query).length&&Object.entries(spec.query).every(([key,value])=>url.searchParams.get(key)===value)):null;
      if (match) {
        const [kind,spec]=match;
        check(headers.origin===BASE,'actual SDK origin');
        if (verdict!=='valid') check(!['rarityTotal','rarityPlayer','selectionInsert'].includes(kind),'no count or insert for '+verdict);
        if (method==='OPTIONS') {
          const requested=(headers['access-control-request-headers']||'').split(',').map(value=>value.trim()).filter(Boolean);
          check(!body&&requested.length>0&&requested.every(header=>['accept-profile','apikey','authorization','content-profile','content-type',
            'prefer','range','range-unit','x-client-info','x-supabase-api-version'].includes(header)),'bounded exact SDK CORS request');
          item.corsFor=kind;item.status=204;
          item.responseHeaders={...allowOrigin,'access-control-allow-methods':requestedMethod+',OPTIONS','access-control-allow-headers':requested.join(',')};
          await route.fulfill({status:204,headers:item.responseHeaders});
          item.outcome='admitted-cors-fulfilled';
        } else {
          check(headers.apikey&&headers.authorization,'actual pinned SDK request auth headers present');
          check(!wire().some(entry=>entry.wireKind===kind),'one actual '+kind+' request');
          const expected=kind==='validator'?validatorBody:kind==='selectionInsert'?selectionBody:null;
          if (expected) {
            check(body&&headers['content-type']?.includes('application/json'),'actual SDK JSON request bytes');
            const utf8=body.toString('utf8');
            check(Buffer.from(utf8).equals(body),'exact UTF-8 fictional SDK request body');
            equal(JSON.parse(utf8),expected,'actual '+kind+' request body');
            item.body={utf8,bytes:body.length,sha256:sha(body)};
          } else equal(body,null,'empty '+kind+' request body');
          if (method==='GET'||method==='HEAD') equal(headers['accept-profile'],'public','actual public read profile');
          if (method==='HEAD') check(headers.prefer?.split(',').map(value=>value.trim()).includes('count=exact'),'exact rarity count preference');
          if (kind==='validator') check(['puzzles','players','seasons'].every(key=>wire().some(r=>r.wireKind===key&&r.outcome==='fulfilled')),'all three actual fixture reads delivered before validator');
          const prerequisite={rarityTotal:'validator',rarityPlayer:'rarityTotal',selectionInsert:'rarityPlayer'}[kind];
          if (prerequisite) check(wire().some(r=>r.wireKind===prerequisite&&r.outcome==='fulfilled'),'exact '+kind+' follows '+prerequisite);
          item.wireKind=kind;
          if (kind==='validator') {
            item.outcome='waiting-for-release';
            const gate=await held;
            if (!gate) {
              await route.abort().catch(()=>{});
              item.outcome='fixture-aborted-on-closure';
              item.finishedAt=Date.now();
              return;
            }
            item.release=gate;
            item.releasedAt=Date.now();
          }
          const ref=responseBodies[kind==='validator'?verdict:kind]??null;
          const bytes=ref?fs.readFileSync(path.join(OUT,ref.file)):Buffer.alloc(0);
          if (ref) exactBody(bytes,ref.bytes,ref.sha256);
          item.status=spec.status;item.responseBody=ref;
          item.responseHeaders={...allowOrigin,...(ref?{'content-type':'application/json'}:{}),
            ...(method==='HEAD'?{'content-range':'*/0','access-control-expose-headers':'content-range'}:{})};
          await route.fulfill({status:spec.status,headers:item.responseHeaders,body:bytes});
          item.outcome='fulfilled';
        }
      } else {
        const refusal=refusedBackground(url,method,headers,body);
        check(refusal,'undeclared network intent refused '+method+' '+url.origin+url.pathname);
        item.refusal=refusal;
        await route.abort();
        item.outcome='known-foreign-refused';
      }
    } catch (error) {
      item.outcome='route-error';
      item.error=String(error.stack||error);row.routeErrors.push(item.error);
      await route.abort().catch(()=>{});
    } finally {item.finishedAt=Date.now();}
  }
  async function observeResponse(response) {
    const request=response.request(),url=new URL(response.url()),method=request.method(),at=Date.now();
    if (url.origin===BASE) {
      const file=url.pathname===ROUTE?'dist/soccer-grid/index.html':'dist'+decodeURIComponent(url.pathname);
      const expected=distByFile.get(file);
      check(expected&&response.ok(),'successful admitted first-party body '+url.pathname);
      const bytes=method==='HEAD'?null:await response.body();
      if (bytes) exactBody(bytes,expected.bytes,expected.sha256);
      row.firstPartyResponses.push({at,receivedAt:Date.now(),url:url.href,method,status:response.status(),resourceType:request.resourceType(),dist:expected,body:bytes?refOf(file,bytes):null});
      return;
    }
    if (url.origin!==backend||method==='OPTIONS') return;
    const item=row.requests.find(row=>row.method===method&&row.url===url.href&&row.wireKind);
    check(item,'browser SDK response joined to observed wire request');
    equal(response.status(),item.status,'actual '+item.wireKind+' status');
    const headers=response.headers();
    for (const [key,value] of Object.entries(item.responseHeaders)) equal(headers[key],value,'actual '+item.wireKind+' '+key+' header');
    const bytes=method==='HEAD'?null:await response.body();
    if (bytes&&item.responseBody) exactBody(bytes,item.responseBody.bytes,item.responseBody.sha256);
    else if (bytes) equal(bytes.length,0,'actual empty acknowledgement');
    row.wireResponses.push({wireKind:item.wireKind,sequence:item.sequence,url:url.href,method,status:response.status(),headers,
      at,receivedAt:Date.now(),responseBody:item.responseBody,observedBody:bytes?{bytes:bytes.length,sha256:sha(bytes)}:null});
  }
  function selection(state,cellIndex,labels,disabled) {
    equal([state.selected,state.prompt?.labels,state.search?.value,state.search?.disabled,state.search?.submitDisabled],
      [[cellIndex],labels,'',disabled,true],'actual owned cell, prompt and Search state');
    equal([state.cells[cellIndex].status,state.cells[cellIndex].disabled],['empty',false],'actual empty enabled selection cell');
  }
  const dateKey=state=>'soccer-grid-daily-'+state.dateET;
  const unrelated=state=>Object.fromEntries(Object.entries(state.storage).filter(([key])=>!key.startsWith('soccer-grid-daily-')));
  function settledState(state,ready,status) {
    selection(state,4,bLabels,false);
    equal([state.cells[0].status,state.cells.slice(1).map(entry=>entry.status),state.timer],[status,Array(8).fill('empty'),[]],'actual A outcome and empty other cells');
    equal([state.correct,state.guessesLeft],[verdict==='valid'?'Correct: 1/9':'Correct: 0/9',verdict==='unverified'?'Guesses left: 15':'Guesses left: 14'],'actual A counters');
    if (verdict==='valid') check(state.cells[0].player===NAME&&state.cells[0].text.includes('Only you!')&&state.cells[0].disabled,'actual correct A and rarity');
    if (verdict==='unverified') check(state.toasts.some(toast=>toast.title===retryNotice&&toast.visible),'fresh real retry toast');
    if (verdict==='unverified') equal(state.daily,{},'free unverified has no Daily effect');
    else {
      equal(Object.keys(state.daily),[dateKey(state)],'one exact current Daily key');
      equal(JSON.parse(state.daily[dateKey(state)]),{v:1,date:state.dateET,puzzleIndex:0,puzzleId:ID,
        guesses:[verdict==='valid'?{t:'ok',cellIndex:0,playerName:NAME,rarity:101}:{t:'x'}],gameStatus:'playing'},'exact actual A Daily outcome');
    }
    equal([unrelated(state),state.sessionStorage],[ready.storage,ready.sessionStorage],'all unrelated storage bytes held');
  }
  try {
    await context.routeWebSocket('**/*',socket=>{
      row.webSockets.push({at:Date.now(),url:socket.url(),outcome:'refused-closed'});
      socket.close();
    });
    await context.route('**/*',route=>remember(routeTasks,routeRequest(route)));
    page=await context.newPage();
    page.setDefaultTimeout(15000);
    const cdp=await context.newCDPSession(page);
    await cdp.send('DOMStorage.enable');
    for (const type of ['domStorageItemAdded','domStorageItemUpdated','domStorageItemRemoved','domStorageItemsCleared']) {
      cdp.on('DOMStorage.'+type,event=>row.storageEvents.push({at:Date.now(),type,...event}));
    }
    page.on('pageerror',error=>row.errors.push(String(error.stack||error)));
    page.on('framenavigated',observed=>{
      if (observed===page.mainFrame()) row.navigations.push({at:Date.now(),url:observed.url()});
    });
    page.on('requestfailed',request=>{
      if (new URL(request.url()).origin===BASE) row.assetErrors.push({url:request.url(),error:request.failure()?.errorText});
    });
    page.on('response',response=>remember(responseTasks,observeResponse(response)));
    await page.exposeBinding('__gridSelectionNativeEvent',(_,event)=>row.events.push(event));
    const nav=await page.goto(BASE+ROUTE,{waitUntil:'domcontentloaded'});
    check(nav?.ok(),'actual loopback navigation');
    const documentBytes=await nav.body();
    check(documentBytes.equals(builtDocument),'actual served route document joins built member');
    row.documentResponse={url:nav.url(),status:nav.status(),at:Date.now(),...refOf('dist/soccer-grid/index.html',documentBytes)};
    await dialog().waitFor({state:'visible'});
    probe=await page.evaluateHandle(()=>{
      for (const type of ['pointerdown','pointerup','click','keydown','keyup','input','wheel','scroll']) addEventListener(type,event=>{
        const target=event.target?.closest?.('button,input')??event.target;
        const dialog=event.target?.closest?.('[role=dialog]');
        const cookie=event.target?.closest?.('[role=region][aria-label="Cookie choices"]');
        window.__gridSelectionNativeEvent({at:Date.now(),type,trusted:event.isTrusted,pointerType:event.pointerType??null,key:event.key??null,
          x:event.clientX??null,y:event.clientY??null,deltaX:event.deltaX??null,deltaY:event.deltaY??null,deltaMode:event.deltaMode??null,
          targetTag:target?.tagName??null,targetRole:target?.getAttribute?.('role')??null,targetText:target?.textContent?.trim()??null,
          targetLabel:target?.getAttribute?.('aria-label')??null,cellIndex:[...document.querySelectorAll('main button[data-grid-cell-status]')].indexOf(target),
          value:target?.tagName==='INPUT'?target.value:null,inDialog:!!dialog,inCookieChoices:!!cookie,dialogOwner:dialog?.getAttribute('aria-labelledby')??null});
      },true);
      const describe=element=>element?{html:element.outerHTML,text:element.textContent}:null;
      const storage=area=>Object.fromEntries(Object.keys(area).sort().map(key=>[key,area.getItem(key)]));
      const dateFormat=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'});
      function read() {
        const main=document.querySelector('main#dukb-main');
        const active=document.activeElement,dialog=document.querySelector('[role=dialog]');
        const cookie=document.querySelector('[role=region][aria-label="Cookie choices"]');
        const box=main?.querySelector('input[aria-label="Search for a player"]');
        const prompt=[...(main?.querySelectorAll('p')??[])].find(node=>node.textContent.trim().startsWith('Find a player who:'));
        const numberText=prefix=>[...(main?.querySelectorAll('span')??[])].find(node=>node.textContent.trim().startsWith(prefix))?.textContent.trim()??null;
        const cells=[...(main?.querySelectorAll('button[data-grid-cell-status]')??[])].map((button,index)=>({
          index,status:button.dataset.gridCellStatus,selected:button.classList.contains('ring-2'),disabled:button.disabled,
          player:button.querySelector('[title]')?.getAttribute('title')??null,text:button.textContent,html:button.outerHTML,
        }));
        const toasts=[...document.querySelectorAll('[data-sonner-toast]')].map(node=>({html:node.outerHTML,title:node.querySelector('[data-title]')?.textContent??null,
          visible:node.dataset.visible==='true'&&!!node.getClientRects().length}));
        const local=storage(localStorage), dateParts=Object.fromEntries(dateFormat.formatToParts(new Date()).map(part=>[part.type,part.value]));
        return {at:Date.now(),url:location.href,timeOrigin:performance.timeOrigin,visibility:document.visibilityState,
          viewport:{width:innerWidth,height:innerHeight},documentWidth:document.documentElement.scrollWidth,scroll:{x:scrollX,y:scrollY},
          dateET:dateParts.year+'-'+dateParts.month+'-'+dateParts.day,storage:local,sessionStorage:storage(sessionStorage),
          daily:Object.fromEntries(Object.entries(local).filter(([key])=>key.startsWith('soccer-grid-daily-'))),
          cells,selected:cells.filter(entry=>entry.selected).map(entry=>entry.index),
          prompt:prompt?{...describe(prompt),labels:[...prompt.querySelectorAll('span')].map(node=>node.textContent)}:null,
          search:box?{html:box.form.outerHTML,value:box.value,disabled:box.disabled,submitDisabled:box.form.querySelector('button[type=submit]').disabled,
            options:[...box.form.querySelectorAll('[role=option]')].map(node=>({...describe(node),name:node.querySelector('span')?.textContent??null}))}:null,
          correct:numberText('Correct:'),guessesLeft:numberText('Guesses left:'),timer:[...(main?.querySelectorAll('svg.lucide-clock')??[])].map(node=>describe(node.parentElement)),
          dialog:{open:!!dialog,title:dialog?.querySelector('h2')?.textContent??null,html:dialog?.outerHTML??null,ownsFocus:!!dialog?.contains(active)},
          cookieChoices:cookie?{...describe(cookie),inDialog:!!dialog?.contains(cookie)}:null,toasts,
          focus:{tag:active?.tagName??null,label:active?.getAttribute('aria-label')??null,html:active?.outerHTML??null,isSearch:!!box&&active===box},
          html:main?.outerHTML??null,documentHTML:document.documentElement.outerHTML};
      }
      let observer, armedAt=null, wrong=null, cleared=null;
      return {read,arm(){
        const main=document.querySelector('main#dukb-main');
        const status=()=>main.querySelector('button[data-grid-cell-status]')?.dataset.gridCellStatus;
        armedAt=Date.now();
        observer=new MutationObserver(()=>{
          if (!wrong&&status()==='wrong') wrong=read();
          else if (wrong&&!cleared&&status()==='empty') {cleared=read();observer.disconnect();}
        });
        observer.observe(main,{subtree:true,childList:true,attributes:true,attributeFilter:['data-grid-cell-status']});
        return armedAt;
      },transitions:()=>({armedAt,wrong,cleared}),stop:()=>observer?.disconnect()};
    });

    await cookies().getByRole('button',{name:'Reject all',exact:true}).waitFor({state:'visible'});
    const entry=await checkpoint('entry');
    check(entry.dialog.open&&entry.dialog.title==='How to Play Soccer Grid'&&entry.cookieChoices,'actual rules and consent offered');
    equal([entry.daily,entry.storage['cookie-consent-v2']??null,await storedConsent(page)],[{},null,null],'fresh browser entry without preseeded game or consent');
    const rejected=await click('reject-cookies',cookies().getByRole('button',{name:'Reject all',exact:true}),'startup',async()=>!(await readState()).cookieChoices);
    check(rejected.dialog.open&&!rejected.cookieChoices,'actual consent rejected while rules remain');
    equal(await storedConsent(page),'rejected','effective consent after trusted rejection');
    const consent=JSON.parse(rejected.storage['cookie-consent-v2']);
    equal([consent.version,consent.advertising,consent.analytics],[2,false,false],'exact saved rejection');
    await click('enter-grid',dialog().getByRole('button',{name:"Let's Play!",exact:true}),'startup',async()=>!(await readState()).dialog.open);
    await wait(async()=>{
      const state=await readState();
      return state.cells.length===9&&wire().filter(r=>r.outcome==='fulfilled').length===3&&
        [...fixture.puzzle.rows,...fixture.puzzle.cols].every(item=>state.html?.includes(item.label));
    },id+' actual game and fetched fixture ready');
    const ready=await checkpoint('ready');
    equal(ready.cells.map(({status,disabled})=>[status,disabled]),Array.from({length:9},()=>['empty',false]),'nine actual empty enabled cells');
    equal([ready.selected,ready.prompt,ready.search,ready.correct,ready.guessesLeft,ready.timer,ready.daily],
      [[],null,null,'Correct: 0/9','Guesses left: 15',[],{}],'fresh untimed grid state');
    equal(ready.storage['sg-rules-seen'],'1','actual onboarding save');
    const a=await click('select-a',cell(0),'business',async()=>{const state=await readState();return state.selected.join(',')==='0'&&state.focus.isSearch;});
    selection(a,0,aLabels,false);
    await typeA();
    await click('submit-a',button('Submit'),'business',async()=>pending().some(item=>item.wireKind==='validator')&&(await readState()).search?.disabled===true);
    const pendingA=await checkpoint('a-pending');
    selection(pendingA,0,aLabels,true);
    equal([pendingA.correct,pendingA.guessesLeft,pendingA.storage,pendingA.sessionStorage],[ready.correct,ready.guessesLeft,ready.storage,ready.sessionStorage],'no speculative A effect');
    await click('select-b',cell(4),'business',async()=>{const state=await readState();return state.selected.join(',')==='4'&&state.search?.disabled===true;});
    const pendingB=await checkpoint('b-pending');
    selection(pendingB,4,bLabels,true);
    equal([pendingB.cells[0].status,pendingB.correct,pendingB.guessesLeft,pendingB.storage,pendingB.sessionStorage],
      ['empty',ready.correct,ready.guessesLeft,ready.storage,ready.sessionStorage],'B selected before any A outcome');
    equal(pending().map(item=>item.wireKind),['validator'],'one still-held validator');
    equal(wire().map(item=>item.wireKind).sort(),['players','puzzles','seasons','validator'],'no second request or B outcome');
    await photo('pending',cell(4));
    equal(pending().map(item=>item.wireKind),['validator'],'validator still held after pending PNG');
    const armedAt=verdict==='invalid'?await page.evaluate(observation=>observation.arm(),probe):null;
    row.release={at:Date.now(),armedAt,bPending:row.checkpoints['b-pending'],pendingPNG:row.screenshots[0]};
    release(row.release);

    if (verdict==='invalid') {
      await wait(async()=>await page.evaluate(observation=>observation.transitions().cleared!==null,probe),id+' actual native wrong flash and timeout cleanup');
      const transitions=await page.evaluate(observation=>observation.transitions(),probe);
      check(transitions.armedAt===armedAt&&transitions.wrong.at>=armedAt&&transitions.cleared.at>transitions.wrong.at,'actual native flash chronology');
      const wrong=await checkpoint('a-settled',transitions.wrong);
      const cleared=await checkpoint('a-flash-cleared',transitions.cleared);
      settledState(wrong,ready,'wrong');
      settledState(cleared,ready,'empty');
      equal(wrong.daily,cleared.daily,'flash cleanup preserves exact A miss bytes');
      row.wrongFlash={armedAt,wrongAt:wrong.at,clearedAt:cleared.at,durationMs:cleared.at-wrong.at,
        wrong:row.checkpoints['a-settled'],cleared:row.checkpoints['a-flash-cleared']};
    } else {
      await wait(async()=>{
        const s=await readState();
        return s.selected.join(',')==='4'&&s.search?.disabled===false&&
          (verdict==='valid'?s.cells[0].status==='correct':s.toasts.some(toast=>toast.title===retryNotice&&toast.visible));
      },id+' actual A outcome and retained B Search');
      settledState(await checkpoint('a-settled'),ready,verdict==='valid'?'correct':'empty');
    }
    await photo('settled',input());
    await wait(()=>routeTasks.size===0&&responseTasks.size===0&&wire().length===row.wireResponses.length,id+' completed request and response journal');
    const expectedWire=verdict==='valid'?['validator','rarityTotal','rarityPlayer','selectionInsert']:['validator'];
    equal(wire().slice(3).map(item=>item.wireKind),expectedWire,'exact actual A effects and no B transport');
    equal(wire().map(item=>item.outcome),Array(3+expectedWire.length).fill('fulfilled'),'all wire requests settled');
    equal(row.wireResponses.map(item=>item.sequence).sort((a,b)=>a-b),wire().map(item=>item.sequence),'each actual wire response joined');
    check(row.firstPartyResponses.some(item=>new URL(item.url).pathname===builtModule&&item.resourceType==='script'&&item.body),'actual built entry module received');
    check(row.firstPartyResponses.some(item=>/\/assets\/SoccerGrid-[^/]+\.js$/.test(new URL(item.url).pathname)&&item.resourceType==='script'&&item.body),'actual held lazy Soccer Grid module received');
    const final=await checkpoint('final');
    const dailyEvents=row.storageEvents.filter(event=>event.key?.startsWith('soccer-grid-daily-'));
    if (verdict==='unverified') equal(dailyEvents,[],'no actual Daily write for unverified');
    else {
      equal(dailyEvents.length,1,'one actual Daily write for A');
      const [event]=dailyEvents;
      equal([event.type,event.storageId.isLocalStorage,event.key,event.newValue],
        ['domStorageItemAdded',true,dateKey(final),final.daily[dateKey(final)]],'actual CDP Daily write joins exact retained bytes');
    }
    const completionAttempts=row.requests.filter(item=>item.method==='POST'&&item.path==='/rest/v1/game_completions').length;
    equal([row.errors,row.assetErrors,row.routeErrors,row.webSockets,pending(),completionAttempts],[[],[],[],[],[],0],'no runtime errors, unknown traffic, pending replies or completion');
    row.census={frames:row.frames.length,actions:row.actions.length,preparations:row.preparations.length,layouts:row.layouts.length,
      wheels:row.wheels.length,viewportPNGs:row.screenshots.length,navigations:row.navigations.length,firstPartyReads:row.firstPartyReads.length,
      firstPartyResponses:row.firstPartyResponses.length,corsPreflights:row.requests.filter(item=>item.corsFor).length,
      startupMouseClicks:2,businessMouseClicks:3,typings:1,validatorAttempts:wire().filter(item=>item.wireKind==='validator').length,
      rarityReads:wire().filter(item=>item.method==='HEAD').length,selectionWritesIntercepted:wire().filter(item=>item.wireKind==='selectionInsert').length,
      puzzleReads:wire().filter(item=>item.wireKind==='puzzles').length,careerReads:wire().filter(item=>['players','seasons'].includes(item.wireKind)).length,
      actualWireResponses:row.wireResponses.length,completionAttempts};
    equal([row.census.actions,row.census.preparations,row.census.layouts,row.census.viewportPNGs,row.census.frames],
      [6,8,16,2,(verdict==='invalid'?23:22)+2*row.census.wheels],'closed actual per-context action, layout and frame count');
    row.status='passed';
  } catch (error) {
    row.status='failed';row.error=String(error.stack||error);
    if (page&&probe) {
      try {row.failureObservation=(await frame('failure',await readState())).ref;}
      catch (captureError) {row.failureCaptureError=String(captureError.stack||captureError);}
    }
    throw error;
  } finally {
    release(null);
    try {
      if (probe) {await page.evaluate(observation=>observation.stop(),probe);await probe.dispose();}
    } catch (error) {row.closeError=String(error.stack||error);}
    await Promise.allSettled([...routeTasks]);
    try {await context.close();}
    catch (error) {row.closeError=String(error.stack||error);}
    await Promise.allSettled([...responseTasks]);
    if (row.closeError||row.routeErrors.length||row.assetErrors.length||row.errors.length) {
      row.status='failed';
      throw Error(id+' context closure or recorded request/runtime error');
    }
  }
}

try {
  const port=await new Promise((resolve,reject)=>{
    const server=createServer();
    server.once('error',reject);
    server.listen(0,'127.0.0.1',()=>{const port=server.address().port;server.close(()=>resolve(port));});
  });
  const BASE='http://127.0.0.1:'+port;
  report.base=BASE;
  host=spawn(process.execPath,['scripts/lib/hostLikeServer.mjs','dist',String(port)],{cwd:ROOT,stdio:['ignore','pipe','pipe']});
  let stdout='',stderr='';
  host.stdout.on('data',bytes=>{stdout+=String(bytes);});
  host.stderr.on('data',bytes=>{stderr+=String(bytes);});
  host.on('exit',(code,signal)=>{report.hostExit={code,signal};});
  await wait(()=>stdout.includes('host-like server:'),'Actual loopback host startup');
  report.hostStartup={stdout,stderr};
  browser=await pw.chromium.launch({headless:true});
  report.browserVersion=browser.version();
  report.nodeVersion=process.versions.node;
  report.journeys=WIDTHS.map(([width,height,verdict])=>({width,height,verdict,status:'running',contexts:[]}));
  const outcomes=await Promise.allSettled(report.journeys.map(async journey=>{
    try {await runContext(BASE,journey);journey.status='passed';}
    catch (error) {journey.status='failed';journey.error=String(error.stack||error);throw error;}
  }));
  const failure=outcomes.find(outcome=>outcome.status==='rejected');
  if (failure) throw failure.reason;
  const contexts=report.journeys.flatMap(journey=>journey.contexts);
  const sum=field=>contexts.reduce((total,row)=>total+row.census[field],0);
  report.census={journeys:report.journeys.length,contexts:contexts.length,
    ...Object.fromEntries(Object.keys(contexts[0].census).map(field=>[field,sum(field)]))};
  assert.deepEqual([report.census.journeys,report.census.contexts,sum('viewportPNGs'),sum('startupMouseClicks'),sum('businessMouseClicks'),sum('typings'),
    sum('puzzleReads'),sum('careerReads'),sum('validatorAttempts'),sum('rarityReads'),sum('selectionWritesIntercepted'),sum('actualWireResponses'),sum('completionAttempts')],
    [3,3,6,6,9,3,3,6,3,2,1,15,0]);
  report.status='passed';
} catch (error) {
  report.status='failed';
  report.error=String(error.stack||error);
  throw error;
} finally {
  if (browser) {
    try {await browser.close();}
    catch (error) {report.browserCloseError=String(error.stack||error);report.status='failed';}
  }
  if (host) host.kill();
  try {
    report.sourceAfter=tracked();
    report.distAfter=distInventory();
    report.locksAfter=['package.json','package-lock.json'].map(sourceReceipt);
    report.installedAfter=versions();
    report.offlineAfter=offline();
    report.indexAfter=write('index-after.txt',index());
    report.sourceHeld=JSON.stringify(report.sourceBefore)===JSON.stringify(report.sourceAfter);
    report.distHeld=JSON.stringify(report.distBefore)===JSON.stringify(report.distAfter);
    report.locksHeld=JSON.stringify(report.locksBefore)===JSON.stringify(report.locksAfter);
    report.installedHeld=JSON.stringify(report.installedBefore)===JSON.stringify(report.installedAfter);
    report.offlineHeld=JSON.stringify(report.offlineBefore)===JSON.stringify(report.offlineAfter);
    report.indexHeld=fs.readFileSync(path.join(OUT,'index-before.txt')).equals(fs.readFileSync(path.join(OUT,'index-after.txt')));
    assert([report.sourceHeld,report.distHeld,report.locksHeld,report.installedHeld,report.offlineHeld,report.indexHeld].every(Boolean),'All physical source, dist, locks, 521 versions, index and offline holds');
  } catch (error) {report.status='failed';report.holdError=String(error.stack||error);}
  const raw={version:1,route:ROUTE,hook:HOOK,page:PAGE,helper:report.helper,qualifiedInput,responseBodies,limits:report.limits,
    contexts:report.journeys.flatMap(journey=>journey.contexts).map(row=>({...row,
      ...Object.fromEntries(['frames','actions','preparations','layouts','wheels'].map(field=>[field,row[field].map(readRef)])),
    }))};
  report.raw=put('raw',raw);
  put('report',report);
  const bodies=files(OUT).map(fileRef);
  put('body-manifest',{version:1,files:bodies,filesCount:bodies.length,bodyBytes:bodies.reduce((total,row)=>total+row.bytes,0),
    limits:'Every retained native body except this nonrecursive manifest. Source, build and qualified workflow inputs have separate custody.'});
  assert.equal(report.status,'passed','Native and physical holds must pass');
}
