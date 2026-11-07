// Remote native proof of Fantasy Draft recovery through the public player Retry.
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
assert(process.env.SIM_OFFLINE_RECEIPT);
const qualifiedFixed = {
  head: '6634ddc74568be76f4b8eedfb5273eaa4561bac2',
  tree: '1f6bcd362ba0c9678ee23cd77c26230e645beb24',
  newRawBytes: '3209645',
  newRawSHA256: 'a83873e78c7a78d847ec9bda4e4554f63098604bd97709e55352bd6591c7c889',
};
const qualifiedControls = {
  head: '563e91a571fe4afc0922e70f74b8572394c243a5',
  tree: 'df0a3d24fdfcc26c55bb7267eeb365f72c6bfd11',
  admissionBytes: '7050',
  admissionSHA256: '06d2d21152a36bf42dace69166a07e9e4643d57eb1ce3b88326655a2fbbb895f',
};
const priorRaw = {
  bytes: 297995,
  sha256: '5d7eed69f22896ddfb7d5b7af946f6643d4d83d2d492b6cfd71027af8ac5f93e',
};
for (const value of [qualifiedFixed.head, qualifiedFixed.tree, qualifiedControls.head, qualifiedControls.tree]) {
  assert(/^[0-9a-f]{40}$/.test(value), 'Actual qualified source identity is required');
}
for (const value of [qualifiedFixed.newRawBytes, qualifiedControls.admissionBytes]) {
  assert(/^[1-9][0-9]*$/.test(value), 'Actual qualified body byte count is required');
}
for (const value of [qualifiedFixed.newRawSHA256, qualifiedControls.admissionSHA256]) {
  assert(/^[0-9a-f]{64}$/.test(value), 'Actual qualified body digest is required');
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ROUTE = '/fantasy-draft';
const HELPER = 'scripts/qa/playFantasyDraftPoolRecovery.mjs';
const WORKFLOW = '.github/workflows/fantasy-draft-pool-error-20261106.yml';
const PAGE_FILE = 'src/pages/FantasyDraft.tsx';
const PAGE = 'a1ec7dda9bd2c7a7fc674b5471fc0dad63a67509';
const WIDTHS = [[320, 568], [390, 844], [1280, 900]];
const configFiles = ['index.html', 'package.json', 'package-lock.json', 'bun.lock', 'bun.lockb', 'vite.config.ts', 'tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json', 'postcss.config.js', 'tailwind.config.ts'];
const criteria = 'Under 25s: Every player must be 25 or younger';
const poolProjection = 'id,name,position,nationality,market_value_millions,dominant_foot,age';
const quotas = { GK: 1, DEF: 4, MID: 3, FWD: 3 };

const pathFromEnv = name => {
  const value = process.env[name];
  assert(value, name + ' must be set');
  const resolved = path.resolve(ROOT, value);
  assert(resolved.startsWith(ROOT + path.sep), name + ' stays under the current checkout');
  assert(!/^(?:src|public|scripts|dist|node_modules|\.git)(?:[\\/]|$)/.test(path.relative(ROOT, resolved)), name + ' stays outside physical source and build inputs');
  return resolved;
};
const OUT = pathFromEnv('FD_POOL_RECOVERY_BROWSER_OUT');
const fixedDirectory = pathFromEnv('FD_POOL_RECOVERY_FIXED_REFERENCE');
const fullUnitDirectory = pathFromEnv('FD_POOL_RECOVERY_FULL_UNIT');
const controlsDirectory = pathFromEnv('FD_POOL_RECOVERY_CONTROLS_REFERENCE');
assert.equal(new Set([OUT, fixedDirectory, fullUnitDirectory, controlsDirectory]).size, 4);
assert(!fs.existsSync(OUT), 'Fresh browser evidence directory');
fs.mkdirSync(OUT, { recursive: true });

const sha=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex');
const fileRef=file=>{const b=fs.readFileSync(path.join(OUT,file));return{file,bytes:b.length,sha256:sha(b)};};
const put=(name,value)=>{const file=name+'.json',bytes=Buffer.from(JSON.stringify(value,null,2)+'\n');fs.mkdirSync(path.dirname(path.join(OUT,file)),{recursive:true});fs.writeFileSync(path.join(OUT,file),bytes,{flag:name==='report'?'w':'wx'});return fileRef(file);};
const textFile=(file,text)=>{fs.writeFileSync(path.join(OUT,file),text,{flag:'wx'});return fileRef(file);};
const readRef=ref=>{const b=fs.readFileSync(path.join(OUT,ref.file));assert.equal(b.length,ref.bytes);assert.equal(sha(b),ref.sha256);return JSON.parse(b);};
const sourceReceipt=file=>{const b=fs.readFileSync(path.join(ROOT,file));return{file,bytes:b.length,sha256:sha(b)};};
const git = (...args) => execFileSync('git', args, {cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024});
const tracked = () => git('ls-files', '-z').split('\0').filter(Boolean).map(sourceReceipt);
const inventory = dir => fs.readdirSync(path.join(ROOT, dir), {withFileTypes: true}).sort((a, b) => a.name.localeCompare(b.name)).flatMap(entry => {
  const file = dir + '/' + entry.name;
  if (entry.isDirectory()) return inventory(file);
  assert(entry.isFile(), file + ' is a regular build body');
  return [sourceReceipt(file)];
});
const versions=()=>{const lock=JSON.parse(fs.readFileSync(path.join(ROOT,'package-lock.json')));const rows=Object.keys(lock.packages).filter(p=>p.startsWith('node_modules/')&&fs.existsSync(path.join(ROOT,p,'package.json'))).map(p=>[p,JSON.parse(fs.readFileSync(path.join(ROOT,p,'package.json'))).version]);assert.equal(rows.length,521);for(const[p,v]of rows)assert.equal(v,lock.packages[p].version,p);return rows;};
const offline=()=>{const file=path.resolve(ROOT,process.env.SIM_OFFLINE_RECEIPT),b=fs.readFileSync(file);assert.equal(b.length,0);return{file:path.relative(ROOT,file),bytes:0,sha256:sha(b)};};

const pins = {
  [PAGE_FILE]: PAGE,
  'src/components/fantasy-draft/PlayerPool.tsx': '08a84d008390d68293482de3e818fada9120c5b3',
  'src/components/fantasy-draft/DraftRoster.tsx': '61d938308edcded2adffc810c01b7d9c12fd3a35',
  'src/lib/fantasyCriteria.ts': 'f6f7d27ee0af80e4386e650a9d7128cd89702f90',
  'src/lib/searchDiscard.ts': '2ae5bc4d6b728e9d5e0f102ece352e59708a0b16',
  'src/lib/completions.ts': '61daf9b6c528f884551cd1d42f71357681c8728a',
  'src/test/fantasyDraftPoolRecovery.test.tsx': 'ab43be6a72f000cbf50c0bb557408e1f7108201c',
  'src/test/fantasyDraftCriteriaStart.test.tsx': '4e9d54803677696454ef0cbbf155182192e03769',
  'src/test/fantasyDraftFormation.test.tsx': '4db9e392fdc40f01e2c668342e45eafcf37b79f6',
  'src/components/game/GameHelp.tsx': 'be6d3941548b5c059bae2dc5822a0018700df8d8',
  'src/components/game/HowToPlayPopover.tsx': '527f3c07171db29772d81c6887df5b238eb6e4c4',
  'src/components/CookieConsent.tsx': '7ffba7ff4099c051d949cd20fe31bc75332f215b',
  'src/components/FlagImg.tsx': 'f415a12892f747ecf07414e61710584ca98be6a8',
  'src/integrations/supabase/client.ts': 'd055e064f5c1c0c90230ca562966ee04dfdcd3ce',
  'src/App.tsx': '8bfedf7aaa1d076e0f0c8e2216c7e46632cd8a33',
  'src/data/gameRegistry.ts': 'f560b40a74d1468ac72dfde4ee6fec6635a9a255',
  'public/fantasy-draft/index.html': 'c2d51909d1e2f4b50c8b37f504d1cd5fdd0f47f5',
  'scripts/lib/hostLikeServer.mjs': '21059d5e8114669df61106c125d5272d357b6236',
  'scripts/lib/answerConsent.mjs': 'c6d16997e4c06e8b35dcfd0bab5efcad3069d899',
  'package.json': '2ff64986fb76ebc51b706f2fd24765768874008a',
  'package-lock.json': '97d6f12a052f25f400462938c241789a083f0bfe',
};
for (const [file, expected] of Object.entries(pins)) {
  assert.equal(blob(fs.readFileSync(path.join(ROOT, file))), expected, file + ' physical reviewed pin');
}
const fixedRead = file => fs.readFileSync(path.join(fixedDirectory, file));
const controlRead = file => fs.readFileSync(path.join(controlsDirectory, file));
const fullUnitRead = file => fs.readFileSync(path.join(fullUnitDirectory, file));
const checkBody = (body, bytes, digest) => {
  assert.equal(body.length, Number(bytes));
  assert.equal(sha(body), digest);
};
assert.equal(fixedRead('head.txt').toString('utf8').trim(), qualifiedFixed.head);
assert.equal(fixedRead('tree.txt').toString('utf8').trim(), qualifiedFixed.tree);
assert.equal(controlRead('head.txt').toString('utf8').trim(), qualifiedControls.head);
assert.equal(controlRead('tree.txt').toString('utf8').trim(), qualifiedControls.tree);
const fixedNew = fixedRead('raw.json'), fullNew = fullUnitRead('raw.json');
const fixedPrior = fixedRead('criteria-start-raw.json'), fullPrior = fullUnitRead('criteria-start-raw.json');
checkBody(fixedNew, qualifiedFixed.newRawBytes, qualifiedFixed.newRawSHA256);
checkBody(fixedPrior, priorRaw.bytes, priorRaw.sha256);
assert(fixedNew.equals(fullNew), 'Complete current unit RAW equals qualified fixed unit RAW');
assert(fixedPrior.equals(fullPrior), 'Complete current criteria-start RAW equals qualified fixed prior RAW');
const fixedAdmission = JSON.parse(fixedRead('fixed-admission.json'));
assert.equal(fixedAdmission.status, 'passed-fixed-fantasy-pool-recovery-qualification');
assert.deepEqual([fixedAdmission.source.head, fixedAdmission.source.tree, fixedAdmission.source.page], [qualifiedFixed.head, qualifiedFixed.tree, PAGE]);
assert.deepEqual([fixedAdmission.actualCases, fixedAdmission.actualPasses, fixedAdmission.actualFailures, fixedAdmission.totalFrames], [8, 8, 0, 80]);
assert.deepEqual([fixedAdmission.raw.bytes, fixedAdmission.raw.sha256], [fixedNew.length, sha(fixedNew)]);
assert.deepEqual([fixedAdmission.prior.bytes, fixedAdmission.prior.sha256], [fixedPrior.length, sha(fixedPrior)]);
const controlsBody = controlRead('controls-admission.json');
checkBody(controlsBody, qualifiedControls.admissionBytes, qualifiedControls.admissionSHA256);
const controlsAdmission = JSON.parse(controlsBody);
const controlSummary = controlsAdmission.summary;
assert.equal(controlsAdmission.status, 'passed-three-physical-pool-recovery-control-arms');
assert.deepEqual([controlSummary.completedArms, controlSummary.actualRows, controlSummary.actualPasses, controlSummary.actualNamedBusinessReds, controlSummary.totalFrames, controlSummary.wholePreservationVectors], [3, 24, 22, 2, 240, 6]);
assert(controlSummary.allTrackedRestored && controlSummary.indexHeld && controlSummary.locksHeld && controlSummary.installed521Held && controlSummary.offlineHeld);

const currentHead = git('rev-parse', 'HEAD').trim();
const currentTree = git('rev-parse', 'HEAD^{tree}').trim();
assert.equal(git('rev-parse', qualifiedFixed.head + '^{tree}').trim(), qualifiedFixed.tree);
assert.equal(git('rev-parse', qualifiedControls.head + '^{tree}').trim(), qualifiedControls.tree);
const treeRows = commit => new Map(git('ls-tree', '-r', '-z', commit).split('\0').filter(Boolean).map(row => {
  const tab = row.indexOf('\t');
  const [mode, type, oid] = row.slice(0, tab).split(' ');
  assert(type === 'blob' && /^100(?:644|755)$/.test(mode) && /^[0-9a-f]{40}$/.test(oid), 'Regular source tree leaf');
  return [row.slice(tab + 1), { mode, oid }];
}));
const fixedTree = treeRows(qualifiedFixed.head), currentRows = treeRows(currentHead);
assert.equal(fixedTree.size, 5784);
assert.equal(currentRows.size, fixedTree.size + 1);
const changed = [...fixedTree].filter(([file, row]) => {
  const after = currentRows.get(file);
  return !after || row.mode !== after.mode || row.oid !== after.oid;
}).map(([file]) => file);
const added = [...currentRows.keys()].filter(file => !fixedTree.has(file));
assert.deepEqual(changed, [WORKFLOW]);
assert.deepEqual(added, [HELPER]);
for (const [file, row] of currentRows) {
  assert(fs.lstatSync(path.join(ROOT, file)).isFile(), file + ' physical regular file');
  assert.equal(blob(fs.readFileSync(path.join(ROOT, file))), row.oid, file + ' current physical byte join');
}
const scopedCount = rows => [...rows.keys()].filter(file => /^(src|public|scripts)\//.test(file)).length;
assert.deepEqual([scopedCount(fixedTree), scopedCount(currentRows)], [4660, 4661]);
for (const file of configFiles) {
  assert(fixedTree.has(file) && currentRows.has(file), file + ' required root configuration');
  assert.deepEqual(currentRows.get(file), fixedTree.get(file), file + ' root configuration held');
}
const currentIndex = git('ls-files', '--stage', '-z').split('\0').filter(Boolean).map(row => {
  const tab = row.indexOf('\t'), [mode, oid, stage] = row.slice(0, tab).split(' ');
  assert.equal(stage, '0');
  return [row.slice(tab + 1), { mode, oid }];
});
assert.deepEqual(new Map(currentIndex), currentRows, 'Exact current path, mode and blob index rows');
textFile('head.txt', currentHead + '\n');
textFile('tree.txt', currentTree + '\n');
const qualifiedInput = put('qualified-input-binding', {
  fixed: {...qualifiedFixed, newRawBytes: fixedNew.length, page: PAGE},
  priorRaw,
  controls: {...qualifiedControls, admissionBytes: controlsBody.length},
  freshFullNewRawByteEqual: true, freshFullPriorRawByteEqual: true,
  currentHead, currentTree, scopedFixedRows: 4660, scopedCurrentRows: 4661, rootConfigurations: configFiles,
  heldFixedRows: fixedTree.size - 1, changed, added,
  scope: 'Qualified fixed/control input identities and fresh unit byte joins. Artifact archive custody is bound by the enclosing workflow.',
});
const snapshot = fs.readFileSync(path.join(ROOT, 'public/fantasy-draft/index.html'));
assert.equal(snapshot.length, 21557);
const snapshotDOM = new JSDOM(snapshot.toString('utf8'));
const savedDoc = snapshotDOM.window.document;
assert.equal(savedDoc.querySelector('link[rel=canonical]')?.getAttribute('href'), 'https://douknowball.com' + ROUTE);
assert.equal(savedDoc.querySelectorAll('#dukb-snapshot').length, 1);
assert(savedDoc.querySelector('#dukb-snapshot').textContent.trim().length > 500);
assert([...savedDoc.querySelectorAll('#dukb-snapshot h1')].some(node => node.textContent.trim() === 'Fantasy Draft Showdown'));
assert(![...savedDoc.querySelectorAll('meta')].some(node => {
  const name = (node.getAttribute('name') || '').toLowerCase();
  const content = node.getAttribute('content') || '';
  return name.startsWith('dukb-retired-') || (node.getAttribute('http-equiv') || '').toLowerCase() === 'refresh' ||
    (['robots', 'googlebot', 'bingbot'].includes(name) && /(?:^|[\s,])(?:noindex|none)(?:[\s,]|$)/i.test(content));
}));
const savedReadable = savedDoc.querySelector('#dukb-snapshot').outerHTML;
snapshotDOM.window.close();

const fixture = [
  ...[['GK', 4, 10], ['DEF', 8, 20], ['MID', 6, 30], ['FWD', 8, 40]].flatMap(([position, count, value]) =>
    Array.from({length: count}, (_, i) => ({
      id: 'fixture-' + position + '-' + i, name: 'Fixture ' + position + ' ' + String(i).padStart(2, '0'),
      position, nationality: 'Fixture Country', dominant_foot: 'Right', market_value_millions: value, age: 24,
    }))),
  {id: 'fixture-veteran', name: 'Fixture Veteran FWD', position: 'FWD', nationality: 'Fixture Country', dominant_foot: 'Right', market_value_millions: 900, age: 40},
];
const poolError = {message: 'Fictional player pool temporarily unavailable', details: '', hint: '', code: 'FIXTURE_POOL_UNAVAILABLE'};
const fixtureByName = new Map(fixture.map(player => [player.name, player]));
assert.equal(fixture.length, 27);
const fixedFixture = JSON.parse(fixedNew).fixture;
assert.deepEqual(fixture, fixedFixture, 'Every fictional input row joins the admitted fixed unit fixture');
const responseBodies = {
  criteria: textFile('wire-criteria.json', JSON.stringify({criteria})),
  firstPool: textFile('wire-first-pool-503.json', JSON.stringify(poolError)),
  retryPool: textFile('wire-retry-pool-200.json', JSON.stringify(fixture)),
};
const indexBefore = textFile('index-before.txt', git('ls-files', '--stage', '-z'));
const report = {
  version: 1, status: 'running', route: ROUTE, page: PAGE, helper: currentRows.get(HELPER).oid, pins, qualifiedInput, responseBodies,
  sourceBefore: tracked(), distBefore: inventory('dist'), locksBefore: ['package.json', 'package-lock.json'].map(sourceReceipt),
  installedBefore: versions(), offlineBefore: offline(), indexBefore,
  activeEntry: {snapshot: sourceReceipt('public/fantasy-draft/index.html'), canonical: 'https://douknowball.com' + ROUTE},
  journeys: [], screenshots: [], checks: 0,
  limits: [
    'Fresh Chromium emulated viewports on the built app with real native mouse, wheel and owned Escape events.',
    'The public initial turn is observed under native randomness. Aggregate seat coverage is reported as observed.',
    'Bound criterion and two fictional player reads are intercepted at their exact wire boundary. Every other external request is refused.',
    'Partial draft only. Each viewport reaches genuine legal user and AI picks. Public timers and resulting picks are observed on real time.',
    'Each operated target has whole viewport, chrome and ancestor clipping, center hit and enabled checks. PNGs are actual viewport crops.',
    'Storage records include every observed string and CDP changed-value event. Unit evidence supplies the exact RNG and fake timer proof.',
  ],
};
assert.equal(report.sourceBefore.length, 5785);
assert.equal(report.distBefore.length, 850);
const builtDocument = fs.readFileSync(path.join(ROOT, 'dist/fantasy-draft/index.html'));
const builtDOM = new JSDOM(builtDocument.toString('utf8'));
const builtDoc = builtDOM.window.document;
assert.equal(builtDoc.querySelector('link[rel=canonical]')?.getAttribute('href'), report.activeEntry.canonical);
assert.equal(builtDoc.querySelector('#dukb-snapshot')?.outerHTML, savedReadable, 'Build holds the complete readable snapshot while adding its boot assets');
const moduleURL = builtDoc.querySelector('script[type=module][src]')?.getAttribute('src');
assert(/^\/assets\/[A-Za-z0-9_-]+\.js$/.test(moduleURL || ''), 'Built route loads a local module asset');
report.activeEntry.builtDocument = sourceReceipt('dist/fantasy-draft/index.html');
report.activeEntry.module = sourceReceipt('dist' + moduleURL);
builtDOM.window.close();
const check = (condition, label) => { report.checks++; assert(condition, label); };
const equal = (actual, expected, label) => { report.checks++; assert.deepEqual(actual, expected, label); };
const wait = async (predicate, label, timeout = 15000) => {
  const end = Date.now() + timeout;
  while (!(await predicate())) {
    assert(Date.now() < end, label);
    await new Promise(resolve => setTimeout(resolve, 40));
  }
};
const deferred = () => {
  let release;
  const promise = new Promise(resolve => { release = resolve; });
  return {promise, release};
};
let browser, host;
async function runContext(BASE, width, height) {
  const id = String(width);
  const row = {
    id, width, height, seat: null, status: 'running', navigations: [], events: [], storageEvents: [],
    requests: [], wireResponses: [], webSockets: [], errors: [], assetErrors: [], routeErrors: [],
    frames: [], actions: [], preparations: [], layouts: [], wheels: [], screenshots: [],
    observedClose: [], checkpoints: {}, firstPartyReads: [], picks: [],
  };
  const journey = report.journeys.find(item => item.width === width);
  journey.contexts.push(row);
  let context, page, cdp;
  const routeTasks = new Set(), responseTasks = new Set();
  const gates = {criteria: deferred(), firstPool: deferred(), retryPool: deferred()};
  const plannedWire = {criteria: {method: 'POST', status: 200}, firstPool: {method: 'GET', status: 503}, retryPool: {method: 'GET', status: 200}};
  const observedReads = () => row.requests.filter(request => request.wireKind);
  const poolReads = () => observedReads().filter(request => request.method === 'GET');
  const hasPending = kind => observedReads().some(request => request.wireKind === kind && request.outcome === 'waiting-for-release');
  const button = name => page.getByRole('button', {name, exact: true});
  const main = () => page.locator('main#dukb-main');
  const poolLoader = () => main().locator('svg.w-8.h-8.animate-spin.text-primary');
  const turn = () => main().locator('div.inline-flex.items-center').filter({hasText: /^\s*Your Pick\s*Round\s+\d+\s*•\s*Pick\s+\d+\/22\s*$/});
  const settle = async () => page.evaluate(async () => {
    await document.fonts.ready;
    let previous = '', same = 0;
    const end = performance.now() + 8000;
    do {
      await new Promise(requestAnimationFrame);
      const rects = [...document.querySelectorAll('main button,main input,[role=dialog],button[aria-label="How to play"],[role=region][aria-label="Cookie choices"] button')]
        .filter(element => element.getClientRects().length).map(element => {
          const rect = element.getBoundingClientRect();
          return [rect.x, rect.y, rect.width, rect.height];
        });
      const value = JSON.stringify(rects);
      same = value === previous ? same + 1 : 1;
      previous = value;
      if (same >= 4) return;
    } while (performance.now() < end);
    throw Error('Actual control geometry did not settle');
  });
  const state = () => page.evaluate(() => {
    const main = document.querySelector('main#dukb-main');
    const directText = element => [...element.childNodes].filter(node => node.nodeType === 3).map(node => node.textContent).join('').trim();
    const describe = element => element ? {html: element.outerHTML, text: element.textContent} : null;
    const control = element => element ? {...describe(element), disabled: element.disabled} : null;
    const buttons = [...(main?.querySelectorAll('button') || [])];
    const byText = (elements, text) => elements.find(element => element.textContent.trim() === text);
    const badge = [...(main?.querySelectorAll('div') || [])].find(element => ['Your Pick', 'AI is picking...'].includes(directText(element)));
    const parsed = /Round (\d+) • Pick (\d+)\/(\d+)/.exec(badge?.textContent || '');
    const poolHeading = byText([...(main?.querySelectorAll('h3') || [])], 'Player Pool');
    const pool = poolHeading?.parentElement?.parentElement;
    const search = pool?.querySelector('input[aria-label="Search players"]');
    const criterion = byText([...(main?.querySelectorAll('p,span') || [])], 'Under 25s: Every player must be 25 or younger');
    const roster = name => {
      const heading = byText([...(main?.querySelectorAll('span') || [])], name);
      const root = heading?.parentElement?.parentElement;
      if (!root) return null;
      return {...describe(root), slots: [...root.querySelectorAll('[data-draft-slot]')].map(slot => ({
        ...describe(slot), index: slot.getAttribute('data-draft-slot'), pick: slot.getAttribute('data-draft-pick'),
        name: slot.querySelector('[title]')?.getAttribute('title') ?? null,
      }))};
    };
    const formation = [...(main?.querySelectorAll('[role=status]') || [])].filter(element => ['Your formation', 'AI formation'].includes(element.getAttribute('aria-label')));
    const dialog = document.querySelector('[role=dialog]'), active = document.activeElement;
    const readStorage = storage => Object.fromEntries(Object.keys(storage).sort().map(key => [key, storage.getItem(key)]));
    const alert = main?.querySelector('[role=alert]'), loader = main?.querySelector('svg.w-8.h-8.animate-spin.text-primary');
    return {
      at: Date.now(), url: location.href, timeOrigin: performance.timeOrigin, visibility: document.visibilityState,
      viewport: {width: innerWidth, height: innerHeight}, documentWidth: document.documentElement.scrollWidth,
      scroll: {x: scrollX, y: scrollY}, storage: readStorage(localStorage), sessionStorage: readStorage(sessionStorage),
      turn: badge ? directText(badge) === 'Your Pick' ? 'user' : 'ai' : null,
      round: parsed ? Number(parsed[1]) : null, pick: parsed ? Number(parsed[2]) : null, total: parsed ? Number(parsed[3]) : null,
      badge: describe(badge), criterion: describe(criterion), alert: describe(alert), loader: describe(loader),
      start: control(byText(buttons, 'Start Draft')), retry: control(byText(buttons, 'Retry players')),
      rosters: {human: roster('Your XI'), ai: roster('AI XI')}, formation: formation.map(describe),
      pool: pool ? {...describe(pool), status: describe(pool.querySelector('[role=status]')), search: search ? {...describe(search), value: search.value} : null,
        cards: [...pool.querySelectorAll('button')].filter(card => card.querySelector('p')).map(card => ({
          ...control(card), name: card.querySelector('p').textContent, title: card.getAttribute('title'),
        })),
      } : null,
      verdicts: ['Draft Complete!', 'Your draft wins the season!', 'Dead level after 38 games', 'The AI drafted better'].filter(text => main?.textContent.includes(text)),
      help: control(document.querySelector('button[aria-label="How to play"]')),
      dialog: {open: !!dialog, title: dialog?.querySelector('h2')?.textContent ?? null, labelledBy: dialog?.getAttribute('aria-labelledby') ?? null,
        html: dialog?.outerHTML ?? null, ownsFocus: !!dialog && !!active && dialog.contains(active)},
      cookieChoices: !!document.querySelector('[role=region][aria-label="Cookie choices"]'),
      focus: {tag: active?.tagName ?? null, text: active?.textContent ?? null, label: active?.getAttribute('aria-label') ?? null,
        html: active?.outerHTML ?? null, insideMain: !!main && !!active && main.contains(active), insideDialog: !!dialog && !!active && dialog.contains(active)},
      html: main?.outerHTML ?? null, text: main?.textContent ?? null, documentHTML: document.documentElement.outerHTML,
    };
  });
  const frame = async name => {
    await settle();
    const value = await state();
    check(value.url === BASE + ROUTE && value.viewport.width === width && value.viewport.height === height && value.documentWidth <= width && value.visibility === 'visible', id + ' actual active viewport');
    const network = {
      reads: observedReads().map(({wireKind, method, at, outcome, status, releasedAt, finishedAt, responseBody}) =>
        ({wireKind, method, at, outcome, status: status ?? null, releasedAt: releasedAt ?? null, finishedAt: finishedAt ?? null, responseBody: responseBody ?? null})),
      responseCount: row.wireResponses.length, requestCount: row.requests.length, storageEventCount: row.storageEvents.length,
    };
    const body = {name, ...value, network};
    const ref = put(id + '/frames/' + String(row.frames.length).padStart(3, '0') + '-' + name, body);
    row.frames.push(ref);
    return {ref, value: body};
  };
  const stableCore = (before, after, label) => {
    for (const key of ['url','timeOrigin','turn','round','pick','total','criterion','storage','sessionStorage','rosters','formation','pool','alert','loader','start','retry','verdicts']) {
      equal(before[key], after[key], id + ' ' + label + ' ' + key);
    }
  };
 const geometry=target=>target.evaluate(el=>{const r=el.getBoundingClientRect(),center={x:r.x+r.width/2,y:r.y+r.height/2},hit=document.elementFromPoint(center.x,center.y),ancestors=[];let top=0,bottom=0;
  for(const x of[6,innerWidth/2,innerWidth-6])for(const[y,edge]of[[1,'top'],[innerHeight-2,'bottom']])for(const n of document.elementsFromPoint(x,y)){const s=getComputedStyle(n),b=n.getBoundingClientRect();if(!['fixed','sticky'].includes(s.position)||b.height<=0||b.height>innerHeight*.4||n.contains(el))continue;if(edge==='top'&&b.y<=2&&b.bottom>0)top=Math.max(top,b.bottom);if(edge==='bottom'&&b.bottom>=innerHeight-2&&b.y<innerHeight)bottom=Math.max(bottom,innerHeight-b.y);}
  for(let n=el.parentElement;n;n=n.parentElement){const s=getComputedStyle(n),b=n.getBoundingClientRect();if(n===document.scrollingElement)continue;const cx=['auto','scroll','hidden','clip','overlay'].includes(s.overflowX),cy=['auto','scroll','hidden','clip','overlay'].includes(s.overflowY);if(cx||cy)ancestors.push({tag:n.tagName,cx,cy,x:b.x+n.clientLeft,y:b.y+n.clientTop,right:b.x+n.clientLeft+n.clientWidth,bottom:b.y+n.clientTop+n.clientHeight,scrollableY:['auto','scroll','overlay'].includes(s.overflowY)&&n.scrollHeight>n.clientHeight+1,scrollTop:n.scrollTop,scrollHeight:n.scrollHeight,clientHeight:n.clientHeight});}
  return{at:Date.now(),rect:{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom},center,chrome:{top,bottom},ancestors,hit:hit===el||el.contains(hit),enabled:!el.matches(':disabled')&&el.getAttribute('aria-disabled')!=='true',tag:el.tagName,text:el.textContent.trim(),label:el.getAttribute('aria-label'),meets44:r.width>=44&&r.height>=44};});
 const qualifies=g=>g.rect.width>0&&g.rect.height>0&&g.rect.x>=0&&g.rect.right<=width&&g.rect.y>=g.chrome.top&&g.rect.bottom<=height-g.chrome.bottom&&g.ancestors.every(c=>(!c.cx||(g.rect.x>=c.x&&g.rect.right<=c.right))&&(!c.cy||(g.rect.y>=c.y&&g.rect.bottom<=c.bottom)))&&g.hit&&g.enabled;


 const prepare=async(target,name,kind)=>{
  check(await target.count()===1&&await target.isVisible(),id+' unique visible '+name);
  const wheelStart=row.wheels.length;
  for(let attempt=0;attempt<18;attempt++){
   const g=await geometry(target);
   if(qualifies(g)){const layout={name,kind,usedForActuation:kind!=='display',qualified:true,...g};const layoutRef=put(id+'/layouts/'+String(row.layouts.length).padStart(3,'0')+'-'+name,layout);row.layouts.push(layoutRef);row.preparations.push(put(id+'/preparations/'+String(row.preparations.length).padStart(3,'0')+'-'+name,{name,kind,layout:layoutRef,wheels:row.wheels.slice(wheelStart),scope:'Read-only geometry; any actual native wheel has its own complete before/after state frames.'}));return{layout,layoutRef};}
   const verticalAncestors=g.ancestors.filter(c=>c.cy),viewTop=g.chrome.top,viewBottom=height-g.chrome.bottom;
   const clipTop=Math.max(viewTop,...verticalAncestors.map(c=>c.y)),clipBottom=Math.min(viewBottom,...verticalAncestors.map(c=>c.bottom));
   const top=clipTop,bottom=clipBottom;
   check(g.rect.width>0&&g.rect.height>0&&g.rect.height<=bottom-top,id+' target can fit measured vertical remedy '+name+' '+JSON.stringify(g));
   check(g.rect.x>=0&&g.rect.right<=width&&g.ancestors.every(c=>!c.cx||(g.rect.x>=c.x&&g.rect.right<=c.right)),id+' actual horizontal target clip');
   const deltaY=g.rect.y<top?Math.floor(g.rect.y-top-8):g.rect.bottom>bottom?Math.ceil(g.rect.bottom-bottom+8):0;
   check(deltaY!==0,id+' center is blocked without a scroll remedy');
   const container=g.ancestors.find(c=>c.scrollableY&&Math.min(c.bottom,viewBottom)>Math.max(c.y,viewTop));
   const visibleTop=container?Math.max(container.y,viewTop,0):viewTop,visibleBottom=container?Math.min(container.bottom,viewBottom):viewBottom;
   const point={x:container?Math.max(2,Math.min(width-2,(Math.max(0,container.x)+Math.min(width,container.right))/2)):width/2,y:(visibleTop+visibleBottom)/2};
   const wheelBefore=await frame(name+'-wheel-'+attempt+'-before'),eventStart=row.events.length;
   await page.mouse.move(point.x,point.y);await page.mouse.wheel(0,deltaY);
   await wait(async()=>{const next=await geometry(target);return Math.abs(next.rect.y-g.rect.y)>0.5||JSON.stringify(next.ancestors.map(c=>c.scrollTop))!==JSON.stringify(g.ancestors.map(c=>c.scrollTop))||(await state()).scroll.y!==wheelBefore.value.scroll.y;},id+' actual native wheel changes scroll geometry');
   const wheelAfter=await frame(name+'-wheel-'+attempt+'-after'),events=row.events.slice(eventStart);
   check(events.some(e=>e.type==='wheel'&&e.trusted&&e.deltaMode===0&&e.deltaY===deltaY),id+' measured trusted native wheel');
   if(row.baseline)stableCore(wheelBefore.value,wheelAfter.value,'wheel holds game');
   row.wheels.push(put(id+'/wheels/'+String(row.wheels.length).padStart(3,'0')+'-'+name,{name,point,deltaX:0,deltaY,before:wheelBefore.ref,after:wheelAfter.ref,geometryBefore:g,geometryAfter:await geometry(target),events}));
  }
  throw Error(id+' bounded native wheel preparation exhausted '+name);
 };
 const mouseAction=async(name,target,kind,done)=>{
  await prepare(target,name,kind);let measured=await geometry(target);await page.mouse.move(measured.center.x,measured.center.y);await settle();measured=await geometry(target);check(qualifies(measured),id+' final hovered whole-target geometry');
  const layoutRef=put(id+'/layouts/'+String(row.layouts.length).padStart(3,'0')+'-'+name+'-click',{name,kind,usedForActuation:true,qualified:true,...measured});row.layouts.push(layoutRef);
  const before=await frame(name+'-before'),eventStart=row.events.length;
  await page.mouse.click(measured.center.x,measured.center.y);
  if(done)await wait(done,id+' completed action '+name);
  const after=await frame(name+'-after'),events=row.events.slice(eventStart),clicks=events.filter(e=>e.type==='click');
  check(clicks.length===1&&clicks[0].trusted&&clicks[0].targetTag===measured.tag&&clicks[0].targetText===measured.text&&clicks[0].targetLabel===measured.label,id+' actual single trusted mouse click '+name);
  const ref=put(id+'/actions/'+String(row.actions.length).padStart(3,'0')+'-'+name,{name,kind,method:'mouse',targetText:measured.text,targetLabel:measured.label,layout:layoutRef,before:before.ref,after:after.ref,events});
  row.actions.push(ref);return{ref,before,after};
 };
 const escapeHelp=async name=>{
  const dialog=page.getByRole('dialog',{name:'How to play',exact:true});await dialog.waitFor({state:'visible'});await settle();
  await wait(async()=>{const s=await state();return s.dialog.open&&s.dialog.ownsFocus;},id+' actual open help owns focus');
  const close=dialog.getByRole('button',{name:'Close',exact:true});check(await close.count()===1,id+' actual inherited Close exists');
  const closeGeometry=await geometry(close);row.observedClose.push(put(id+'/observed-close-'+row.observedClose.length,{name,usedForActuation:false,qualifiedForClick:qualifies(closeGeometry),geometry:closeGeometry,scope:'Observed inherited Close geometry only. Dismissal uses public Escape, not a Close click or44px/whole-page claim.'}));
  const before=await frame(name+'-before');check(before.value.dialog.open&&before.value.dialog.ownsFocus&&before.value.focus.insideDialog,id+' Escape dialog ownership');const eventStart=row.events.length;
  await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
  const after=await frame(name+'-after'),events=row.events.slice(eventStart),keys=events.filter(e=>e.type==='keydown'&&e.key==='Escape');
  check(keys.length===1&&keys[0].trusted&&keys[0].inDialog,id+' actual trusted owned Escape');check(!after.value.dialog.open,id+' actual dialog closed');
  const ref=put(id+'/actions/'+String(row.actions.length).padStart(3,'0')+'-'+name,{name,kind:'startup',method:'keyboard',key:'Escape',owner:before.value.dialog.labelledBy,observedClose:row.observedClose.at(-1),before:before.ref,after:after.ref,events});
  row.actions.push(ref);return{ref,before,after};
 };

 const checkpoint=async name=>{const f=await frame(name);row.checkpoints[name]=f.ref;return f;};
 const photo=async(name,target)=>{
  const prepared=await prepare(target,name+'-photo','display');const before=await frame(name+'-photo-before');
  const display=await geometry(target);check(qualifies(display),id+' final photo target qualifies');
  const focus=await page.evaluateHandle(()=>document.activeElement),file=id+'-'+name+'.png';
  await page.screenshot({path:path.join(OUT,file),fullPage:false,caret:'initial'});const after=await frame(name+'-photo-after');
  stableCore(before.value,after.value,'photo holds game');equal(before.value.scroll,after.value.scroll,id+' photo scroll held');
  const sameFocus=await page.evaluate(el=>document.activeElement===el,focus);await focus.dispose();check(sameFocus,id+' photo actual focus identity held');
  const ref={...fileRef(file),name,context:id,seat:row.seat,layout:prepared.layoutRef,viewport:{width,height},before:before.ref,after:after.ref,focusIdentityHeld:sameFocus};row.screenshots.push(ref);report.screenshots.push(ref);
 };
  try {
    context = await browser.newContext({viewport: {width, height}, isMobile: width < 1000, hasTouch: width < 1000, serviceWorkers: 'block'});
    await context.routeWebSocket('**/*', socket => {
      row.webSockets.push({at: Date.now(), outcome: 'refused-closed'});
      socket.close();
    });
    await context.route('**/*', route => {
      const task = (async () => {
        const request = route.request(), url = new URL(request.url()), method = request.method();
        if (url.origin === BASE && ['GET', 'HEAD'].includes(method) && !request.postDataBuffer()) {
          row.firstPartyReads.push({at: Date.now(), url: url.href, method, outcome: 'continued-local-read'});
          await route.continue();
          return;
        }
        const body = request.postDataBuffer();
        const item = {
          at: Date.now(), url: url.href, path: url.pathname, method, query: [...url.searchParams],
          headers: null, body: body ? {redacted: true, bytes: body.length, sha256: sha(body)} : null,
          outcome: 'pending',
        };
        row.requests.push(item);
        const backend = url.origin === 'https://flawuiqbvjobmkfkauhw.supabase.co';
        const daily = backend && url.pathname === '/functions/v1/fantasy-draft-daily';
        const players = backend && url.pathname === '/rest/v1/fantasy_draft_players';
        try {
          const headers = await request.allHeaders();
          const redacted = ['authorization', 'apikey', 'cookie', 'proxy-authorization'];
          item.headers = Object.fromEntries(Object.entries(headers).map(([key, value]) => [key, redacted.includes(key)
            ? {redacted: true, bytes: Buffer.byteLength(value), sha256: sha(Buffer.from(value))} : value]));
          const allowOrigin = {'access-control-allow-origin': BASE};
          if ((daily || players) && method === 'OPTIONS') {
            const wanted = daily ? 'POST' : 'GET';
            equal([headers.origin, headers['access-control-request-method']], [BASE, wanted], id + ' exact observed CORS preflight');
            const asked = (headers['access-control-request-headers'] || '').split(',').map(value => value.trim()).filter(Boolean);
            check(asked.length > 0 && asked.every(header => ['accept-profile', 'apikey', 'authorization', 'content-type', 'x-client-info'].includes(header)), id + ' bounded CORS headers');
            if (daily) equal(item.query, [], id + ' criterion preflight URL');
            else equal(item.query, [['select', poolProjection], ['order', 'name.asc']], id + ' player preflight URL');
            equal(item.body, null, id + ' empty preflight request body');
            await route.fulfill({status: 204, headers: {...allowOrigin, 'access-control-allow-methods': wanted + ',OPTIONS', 'access-control-allow-headers': asked.join(',')}});
            item.outcome = 'admitted-cors-fulfilled';
            item.finishedAt = Date.now();
            return;
          }
          if (daily && method === 'POST' || players && method === 'GET') {
            equal([headers.origin, !!headers.authorization, !!headers.apikey], [BASE, true, true], id + ' held client origin and redacted auth headers');
            equal(item.body, null, id + ' exact empty SDK request body');
            let kind;
            if (daily) {
              equal(item.query, [], id + ' exact no-options criterion invoke');
              equal(observedReads().length, 0, id + ' one criterion read before player requests');
              kind = 'criteria';
            } else {
              equal(item.query, [['select', poolProjection], ['order', 'name.asc']], id + ' exact player projection and order');
              equal([headers.range ?? null, headers['range-unit'] ?? null, headers['accept-profile']], [null, null, 'public'], id + ' exact public read headers');
              check(observedReads().some(read => read.wireKind === 'criteria' && read.outcome === 'fulfilled'), id + ' criterion delivered before player request');
              const ordinal = poolReads().length;
              check(ordinal < 2, id + ' duplicate or unowned third player query refused');
              if (ordinal === 1) check(poolReads()[0].outcome === 'fulfilled' && poolReads()[0].status === 503, id + ' second read follows delivered 503');
              kind = ordinal === 0 ? 'firstPool' : 'retryPool';
            }
            item.wireKind = kind;
            item.outcome = 'waiting-for-release';
            const decision = await gates[kind].promise;
            if (!decision) {
              await route.abort().catch(() => {});
              item.outcome = 'fixture-aborted-on-closure';
              item.finishedAt = Date.now();
              return;
            }
            const {status} = plannedWire[kind], responseBody = responseBodies[kind];
            const bytes = fs.readFileSync(path.join(OUT, responseBody.file));
            checkBody(bytes, responseBody.bytes, responseBody.sha256);
            item.status = status;
            item.releasedAt = Date.now();
            item.responseBody = responseBody;
            await route.fulfill({status, contentType: 'application/json', headers: allowOrigin, body: bytes});
            item.outcome = 'fulfilled';
            item.finishedAt = Date.now();
            return;
          }

          const read = method === 'GET' && !body;
          const fonts = read && ((url.hostname === 'fonts.googleapis.com' && url.pathname === '/css2') ||
            (url.hostname === 'fonts.gstatic.com' && url.pathname.startsWith('/s/')));
          const flags = read && url.hostname === 'flagcdn.com' && /^\/w(?:20|40|80|160|320)\/(?:[a-z]{2}|gb-(?:eng|sct|wls|nir))\.png$/.test(url.pathname) && !url.search;
          const live = read && backend && url.pathname === '/rest/v1/live_scores';
          const history = read && backend && url.pathname === '/rest/v1/game_completions';
          if (live) {
            const query = Object.fromEntries(url.searchParams), dates = url.searchParams.getAll('start_at');
            check(query.select === '*' && query.order === 'start_at.asc' && query.limit === '150' &&
              dates.length === 2 && dates.some(value => value.startsWith('gte.')) && dates.some(value => value.startsWith('lte.')) &&
              [...url.searchParams.keys()].every(key => ['select', 'order', 'limit', 'start_at'].includes(key)), id + ' bounded held live-score read');
          }
          if (history) {
            const query = Object.fromEntries(url.searchParams);
            check(query.select === 'game,completed_on' && query.order === 'completed_on.desc' && query.limit === '500' &&
              query.player_name?.startsWith('eq.') && Object.keys(query).sort().join(',') === 'limit,order,player_name,select', id + ' bounded completion history read');
          }
          check(fonts || flags || live || history, id + ' refused unexpected traffic ' + method + ' ' + url.origin + url.pathname);
          item.refusal = fonts ? 'known-font' : flags ? 'known-flag' : live ? 'known-live-score' : 'known-completion-history';
          await route.abort();
          item.outcome = 'known-foreign-refused';
          item.finishedAt = Date.now();
        } catch (error) {
          item.outcome = 'route-error';
          item.error = String(error.stack || error);
          row.routeErrors.push(item.error);
          await route.abort().catch(() => {});
          item.finishedAt = Date.now();
        }
      })();
      routeTasks.add(task);
      task.then(() => routeTasks.delete(task), error => {
        routeTasks.delete(task);
        row.routeErrors.push(String(error.stack || error));
      });
      return task;
    });
    page = await context.newPage();
    cdp = await context.newCDPSession(page);
    await cdp.send('DOMStorage.enable');
    for (const type of ['domStorageItemAdded', 'domStorageItemUpdated', 'domStorageItemRemoved', 'domStorageItemsCleared']) {
      cdp.on('DOMStorage.' + type, event => row.storageEvents.push({at: Date.now(), type, ...event}));
    }
    page.on('pageerror', error => row.errors.push(String(error.stack || error)));
    page.on('framenavigated', observed => {
      if (observed === page.mainFrame()) row.navigations.push({at: Date.now(), url: observed.url()});
    });
    page.on('requestfailed', request => {
      if (request.url().startsWith(BASE + '/')) row.assetErrors.push({url: request.url(), error: request.failure()?.errorText});
    });
    page.on('response', response => {
      const url = new URL(response.url()), method = response.request().method();
      if (url.origin !== 'https://flawuiqbvjobmkfkauhw.supabase.co') return;
      const endpoint = method === 'POST' && url.pathname === '/functions/v1/fantasy-draft-daily' ? 'criteria'
        : method === 'GET' && url.pathname === '/rest/v1/fantasy_draft_players' ? 'players' : null;
      if (!endpoint) return;
      const status = response.status(), seenAt = Date.now();
      const task = (async () => {
        const kind = endpoint === 'criteria' ? 'criteria' : status === 503 ? 'firstPool' : 'retryPool';
        const bytes = await response.body(), ref = responseBodies[kind];
        checkBody(bytes, ref.bytes, ref.sha256);
        equal(status, plannedWire[kind].status, id + ' actual received wire status');
        equal(response.headers()['content-type'], 'application/json', id + ' actual received JSON content type');
        row.wireResponses.push({kind, method, status, url: url.href, at: seenAt, receivedAt: Date.now(), responseBody: ref});
      })();
      responseTasks.add(task);
      task.then(() => responseTasks.delete(task), error => {
        responseTasks.delete(task);
        row.routeErrors.push(String(error.stack || error));
      });
    });
    await page.exposeBinding('__fantasyPoolRecoveryNativeEvent', (_, event) => row.events.push(event));
    const navigation = await page.goto(BASE + ROUTE, {waitUntil: 'domcontentloaded'});
    check(navigation?.ok(), id + ' actual local navigation response');
    const documentBytes = await navigation.body();
    check(documentBytes.equals(builtDocument), id + ' actual browser document joins current built snapshot bytes');
    row.documentResponse = {url: navigation.url(), status: navigation.status(), at: Date.now(), bytes: documentBytes.length, sha256: sha(documentBytes)};
    await button('How to play').waitFor({state: 'visible'});
    await page.evaluate(() => {
      for (const type of ['pointerdown', 'pointerup', 'click', 'keydown', 'keyup', 'wheel', 'scroll']) {
        addEventListener(type, event => {
          const target = event.target?.closest?.('button,input') ?? event.target;
          const dialog = event.target?.closest?.('[role=dialog]');
          window.__fantasyPoolRecoveryNativeEvent({
            at: Date.now(), type, trusted: event.isTrusted, pointerType: event.pointerType ?? null, key: event.key ?? null,
            deltaX: event.deltaX ?? null, deltaY: event.deltaY ?? null, deltaMode: event.deltaMode ?? null,
            targetTag: target?.tagName ?? null, targetRole: target?.getAttribute?.('role') ?? null,
            targetText: target?.textContent?.trim() ?? null, targetLabel: target?.getAttribute?.('aria-label') ?? null,
            inDialog: !!dialog, dialogOwner: dialog?.getAttribute('aria-labelledby') ?? null,
          });
        }, true);
      }
    });
    const progress = frameValue => {
      const names = side => frameValue.rosters[side]?.slots.filter(slot => slot.name !== null).map(slot => slot.name) ?? [];
      return {turn: frameValue.turn, round: frameValue.round, pick: frameValue.pick, total: frameValue.total, human: names('human'), ai: names('ai')};
    };
    const recordPick = (side, before, after, expectedName = null) => {
      const previous = progress(before.value), next = progress(after.value);
      const other = side === 'human' ? 'ai' : 'human';
      equal(next[other], previous[other], id + ' the other roster stays held for this pick');
      equal(next[side].slice(0, -1), previous[side], id + ' actual roster appends one pick');
      equal(next[side].length, previous[side].length + 1, id + ' actual single pick');
      const name = next[side].at(-1), player = fixtureByName.get(name);
      check(player && player.age === 24 && ![...previous.human, ...previous.ai].includes(name), id + ' actual unused eligible fictional pick');
      if (expectedName !== null) equal(name, expectedName, id + ' exact chosen public card joins human roster');
      equal(next.pick, previous.pick + 1, id + ' one public pick of progression');
      equal(next.round, Math.floor((next.pick - 1) / 2) + 1, id + ' snake round follows actual pick');
      equal(next.total, 22, id + ' actual draft length');
      check(next[side].filter(picked => fixtureByName.get(picked)?.position === player.position).length <= quotas[player.position], id + ' actual position quota');
      const slot = after.value.rosters[side].slots.find(item => item.name === name);
      check(slot && slot.pick === 'latest' && slot.html && slot.text, id + ' actual latest roster slot');
      row.picks.push({side, player, slot, before: before.ref, after: after.ref, at: after.value.at});
    };
    const settleWire = async (kind, predicate) => {
      check(hasPending(kind), id + ' actual response is held before release ' + kind);
      gates[kind].release(true);
      await wait(async () => observedReads().some(request => request.wireKind === kind && request.outcome === 'fulfilled') &&
        row.wireResponses.some(response => response.kind === kind) && await predicate(), id + ' actual browser response and Page state ' + kind);
    };
    await wait(() => hasPending('criteria'), id + ' actual criterion request held');
    const beforeCriteria = await checkpoint('criterion-pending');
    check(beforeCriteria.value.start?.disabled === true && beforeCriteria.value.criterion === null && beforeCriteria.value.turn === null && beforeCriteria.value.pool === null, id + ' actual criterion gate');
    equal(beforeCriteria.value.network.reads.map(request => [request.wireKind, request.outcome]), [['criteria', 'waiting-for-release']], id + ' only one pending criterion request');

    const help = await mouseAction('startup-open-help', button('How to play'), 'startup', async () => (await state()).dialog.ownsFocus);
    check(help.after.value.dialog.title === 'How to play' && help.after.value.dialog.html.includes('The steps') &&
      help.after.value.dialog.html.includes('The rules') && help.after.value.dialog.html.includes('A worked example'), id + ' actual shared route guide and worked example');
    await escapeHelp('startup-owned-help-escape');
    const cookies = page.getByRole('region', {name: 'Cookie choices', exact: true});
    await cookies.waitFor({state: 'visible'});
    await mouseAction('startup-reject-all', cookies.getByRole('button', {name: 'Reject all', exact: true}), 'startup', async () => !(await state()).cookieChoices);
    equal(await storedConsent(page), 'rejected', id + ' actual optional consent rejection');
    await settleWire('criteria', async () => {
      const value = await state();
      return value.start?.disabled === false && value.criterion?.text === criteria;
    });
    const baseline = await checkpoint('criterion-settled');
    row.baseline = baseline.ref;
    check(!Object.keys(baseline.value.storage).some(key => key.startsWith('sb-') && key.endsWith('-auth-token')), id + ' actually signed out');
    check(baseline.value.start?.disabled === false && baseline.value.criterion?.text === criteria, id + ' actual criterion visible and Start enabled');
    equal(poolReads().length, 0, id + ' criteria readiness did not issue player read');

    const start = await mouseAction('start-draft', button('Start Draft'), 'business', async () => hasPending('firstPool') && !!(await state()).loader);
    const initial = start.after;
    row.seat = initial.value.turn;
    check(['user', 'ai'].includes(row.seat), id + ' natural actual first seat');
    const entry = {turn: row.seat, round: 1, pick: 1, total: 22, human: [], ai: []};
    equal(progress(initial.value), entry, id + ' original live seat and initial public pick');
    check(initial.value.pool === null && initial.value.alert === null && initial.value.retry === null && initial.value.start === null, id + ' player pool visibly pending');
    equal(initial.value.criterion?.text, criteria, id + ' actual live criterion');
    equal(poolReads().length, 1, id + ' actual first player read');

    const heldEntry = (frameValue, label) => {
      equal(progress(frameValue), entry, id + ' ' + label + ' same seat, round, pick and empty rosters');
      equal(frameValue.criterion, initial.value.criterion, id + ' ' + label + ' exact live criterion');
      equal(frameValue.formation, initial.value.formation, id + ' ' + label + ' same visible empty formations');
      equal(frameValue.storage, initial.value.storage, id + ' ' + label + ' every local storage string held');
      equal(frameValue.sessionStorage, initial.value.sessionStorage, id + ' ' + label + ' every session storage string held');
    };
    await settleWire('firstPool', async () => {
      const value = await state();
      return value.alert?.text.includes("Couldn't load the players.") && value.retry?.disabled === false;
    });
    const error = await checkpoint('first-pool-error');
    heldEntry(error.value, 'actual 503');
    const retryControl = main().getByRole('alert').getByRole('button', {name: 'Retry players', exact: true});
    check(error.value.retry?.disabled === false && error.value.loader === null && error.value.pool === null &&
      error.value.rosters.human === null && error.value.rosters.ai === null, id + ' actual error branch with actionable Retry');
    await photo('player-error', retryControl);
    equal(poolReads().length, 1, id + ' error and screenshot do not trigger an automatic read');

    const retry = await mouseAction('retry-players', retryControl, 'business', async () => hasPending('retryPool') && !!(await state()).loader);
    heldEntry(retry.after.value, 'actual Retry pending');
    check(retry.after.value.retry === null && retry.after.value.alert === null && retry.after.value.pool === null, id + ' spinner replaces Retry and error during actual pending read');
    const duplicate = await checkpoint('duplicate-retry-pending');
    const duplicateCount = await button('Retry players').count();
    equal([duplicateCount, duplicate.value.retry, poolReads().length, hasPending('retryPool')], [0, null, 2, true], id + ' no public duplicate Retry or third query');
    heldEntry(duplicate.value, 'duplicate opportunity');
    row.duplicateOpportunity = {frame: duplicate.ref, exactPublicRetryCount: duplicateCount, actualActivation: false, playerReads: poolReads().length, heldRead: 'retryPool'};
    await photo('retry-pending', poolLoader());
    check(hasPending('retryPool') && poolReads().length === 2, id + ' actual same retry remained held across display proof');

    await settleWire('retryPool', async () => (await state()).pool !== null);
    const admitted = await checkpoint('retry-pool-settled');
    heldEntry(admitted.value, 'actual fictional pool settled');
    check(admitted.value.pool?.cards.length === 10 && admitted.value.loader === null && admitted.value.alert === null &&
      admitted.value.retry === null && admitted.value.rosters.human?.slots.length === 11 && admitted.value.rosters.ai?.slots.length === 11, id + ' real pool and both real empty roster columns returned');
    equal(admitted.value.pool.status.text, 'Showing 10 of 26 available players.', id + ' actual shortlist and veteran exclusion');
    let humanReady = admitted;
    if (row.seat === 'ai') {
      await wait(async () => {const value = await state(); return value.turn === 'user' && value.pick === 2;}, id + ' real initial AI advances after admitted pool');
      humanReady = await checkpoint('initial-ai-picked');
      recordPick('ai', admitted, humanReady);
    }

    const candidate = humanReady.value.pool.cards.find(card => !card.disabled);
    check(candidate && humanReady.value.turn === 'user', id + ' actual available current human candidate');
    const expectedPlayer = fixtureByName.get(candidate.name);
    check(expectedPlayer && expectedPlayer.age === 24, id + ' public card joins exact eligible fictional input');
    const candidateButton = main().locator('button').filter({has: page.getByText(candidate.name, {exact: true})});
    const human = await mouseAction('pick-actual-player', candidateButton, 'business', async () => progress(await state()).human.includes(candidate.name));
    row.chosenCard = {fixture: expectedPlayer, actualCard: candidate, selectionBefore: human.before.ref, selectionAfter: human.after.ref};
    recordPick('human', human.before, human.after, candidate.name);

    if (row.seat === 'user') {
      equal([human.after.value.turn, human.after.value.pick], ['ai', 2], id + ' actual initial user pick hands round to AI');
      await wait(async () => {const value = await state(); return value.turn === 'ai' && value.pick === 3;}, id + ' real first snake AI pick');
      const first = await checkpoint('first-snake-ai-picked');
      recordPick('ai', human.after, first);
      await wait(async () => {const value = await state(); return value.turn === 'user' && value.pick === 4;}, id + ' real second snake AI pick');
      const second = await checkpoint('second-snake-ai-picked');
      recordPick('ai', first, second);
    } else {
      equal([human.after.value.turn, human.after.value.pick], ['user', 3], id + ' actual AI-first snake stays human at next round start');
    }
    const final = await checkpoint('legal-progress');
    const result = progress(final.value);
    equal([result.turn, result.round, result.pick, result.total, result.human.length, result.ai.length], row.seat === 'user'
      ? ['user', 2, 4, 22, 1, 2] : ['user', 2, 3, 22, 1, 1], id + ' actual partial legal snake progress for the observed seat');
    equal(final.value.criterion, initial.value.criterion, id + ' current criterion held after legal progress');
    equal(final.value.storage, initial.value.storage, id + ' exact local storage preserved across active draft');
    equal(final.value.sessionStorage, initial.value.sessionStorage, id + ' exact session storage preserved across active draft');
    equal(final.value.verdicts, [], id + ' no premature verdict or draft completion');
    await photo('legal-progress', turn());

    await Promise.allSettled([...routeTasks, ...responseTasks]);
    const actions = row.actions.map(readRef), count = kind => actions.filter(action => action.kind === kind && action.method === 'mouse').length;
    equal([count('startup'), count('business'), actions.filter(action => action.key === 'Escape').length], [2, 3, 1], id + ' actual startup and draft public actions');
    equal([row.actions.length, row.preparations.length, row.layouts.length, row.screenshots.length, row.observedClose.length], [6, 8, 13, 3, 1], id + ' actual receipt bodies');
    equal(row.frames.length, (row.seat === 'user' ? 26 : 25) + 2 * row.wheels.length, id + ' complete source-derived frame bodies plus measured wheel frames');
    equal(observedReads().map(request => [request.wireKind, request.method, request.status, request.outcome]), [
      ['criteria', 'POST', 200, 'fulfilled'], ['firstPool', 'GET', 503, 'fulfilled'], ['retryPool', 'GET', 200, 'fulfilled'],
    ], id + ' exact consumed HTTP transport legs');
    equal(row.wireResponses.map(response => [response.kind, response.status]), [['criteria', 200], ['firstPool', 503], ['retryPool', 200]], id + ' exact actual received HTTP response legs');
    const completions = row.requests.filter(request => request.path === '/rest/v1/game_completions' && request.method === 'POST');
    equal(completions.length, 0, id + ' no completion attempt before completed draft');
    check(row.requests.every(request => ['fulfilled', 'admitted-cors-fulfilled', 'known-foreign-refused'].includes(request.outcome) &&
      Number.isFinite(request.finishedAt)), id + ' every intercepted or refused request settled');
    check(!row.errors.length && !row.assetErrors.length && !row.routeErrors.length && !row.webSockets.length, id + ' no App, local asset or route failure and no WebSocket traffic');
    const frames = row.frames.map(readRef);
    check(frames.every(value => value.timeOrigin === frames[0].timeOrigin && value.url === BASE + ROUTE), id + ' actual single document through recovery');
    check(row.navigations.length >= 1 && row.navigations.every((navigation, i) => navigation.url === BASE + ROUTE &&
      Number.isFinite(navigation.at) && navigation.at <= frames[0].at && (!i || navigation.at >= row.navigations[i - 1].at)), id + ' every observed startup navigation belongs to the actual route');
    row.census = {
      actions: row.actions.length, frames: row.frames.length, preparations: row.preparations.length, layouts: row.layouts.length,
      wheels: row.wheels.length, screenshots: row.screenshots.length, navigations: row.navigations.length,
      startupMouseClicks: count('startup'), startupEscapeKeys: 1, businessMouseClicks: count('business'),
      criterionReads: 1, playerReads: poolReads().length, actualWireResponses: row.wireResponses.length,
      corsRequests: row.requests.filter(request => request.outcome === 'admitted-cors-fulfilled').length,
      firstPartyReads: row.firstPartyReads.length, storageEvents: row.storageEvents.length,
      humanPicks: result.human.length, aiPicks: result.ai.length, completionAttempts: completions.length,
    };
    row.status = 'passed';
  } catch (error) {
    row.status = 'failed';
    row.error = String(error.stack || error);
    if (page && !page.isClosed()) {
      try { await frame('failure'); } catch (frameError) {
        row.failureCaptureError = String(frameError.stack || frameError);
        try {
          const fallback = await state();
          row.failureObservation = put(id + '/failure-unqualified', fallback);
        } catch (fallbackError) { row.failureFallbackError = String(fallbackError.stack || fallbackError); }
      }
    }
    throw error;
  } finally {
    row.closingAt = Date.now();
    for (const gate of Object.values(gates)) gate.release(false);
    if (context) await context.close().catch(error => {row.closeError = String(error);});
    await Promise.allSettled([...routeTasks, ...responseTasks]);
    if (row.status === 'passed' && (row.closeError || row.errors.length || row.assetErrors.length || row.routeErrors.length ||
      row.webSockets.length || row.requests.some(request => !['fulfilled', 'admitted-cors-fulfilled', 'known-foreign-refused'].includes(request.outcome)))) {
      row.status = 'failed';
      row.error = 'Context/request closure failed';
    }
    put('report', report);
  }
  check(row.status === 'passed', id + ' actual completed and closed context');
  return row;
}
try {
  const port = await new Promise((resolve, reject) => {
    const socket = createServer();
    socket.once('error', reject);
    socket.listen(0, '127.0.0.1', () => {
      const bound = socket.address().port;
      socket.close(() => resolve(bound));
    });
  });
  const BASE = 'http://127.0.0.1:' + port;
  report.base = BASE;
  host = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', String(port)], {cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe']});
  let hostStdout = '', hostStderr = '';
  host.stdout.on('data', chunk => {hostStdout += String(chunk);});
  host.stderr.on('data', chunk => {hostStderr += String(chunk);});
  host.on('exit', (code, signal) => {report.hostExit = {code, signal};});
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('Local host startup timeout')), 15000);
    host.stdout.on('data', () => {
      if (hostStdout.includes('host-like server:')) {clearTimeout(timer); resolve();}
    });
    host.once('error', error => {clearTimeout(timer); reject(error);});
    host.once('exit', code => {clearTimeout(timer); reject(Error('Local host exited ' + code));});
  });
  report.hostStartup = {stdout: hostStdout, stderr: hostStderr};
  browser = await pw.chromium.launch({headless: true});
  report.browserVersion = browser.version();
  report.nodeVersion = process.versions.node;
  for (const [width, height] of WIDTHS) report.journeys.push({width, height, status: 'running', contexts: []});
  const journeyOutcomes = await Promise.allSettled(report.journeys.map(async journey => {
    try {
      await runContext(BASE, journey.width, journey.height);
      journey.status = 'passed';
    } catch (error) {
      journey.status = 'failed';
      journey.error = String(error.stack || error);
      throw error;
    }
  }));
  const rejectedJourney = journeyOutcomes.find(result => result.status === 'rejected');
  if (rejectedJourney) throw rejectedJourney.reason;

  const contexts = report.journeys.flatMap(journey => journey.contexts);
  const sum = field => contexts.reduce((total, context) => total + context.census[field], 0);
  const observedSeats = contexts.map(context => ({width: context.width, height: context.height, seat: context.seat}));
  const userFirst = contexts.filter(context => context.seat === 'user').length;
  const aiFirst = contexts.filter(context => context.seat === 'ai').length;
  const summedFields = Object.keys(contexts[0].census);
  report.census = {journeys: report.journeys.length, contexts: contexts.length, observedSeats, userFirst, aiFirst,
    ...Object.fromEntries(summedFields.map(field => [field, sum(field)]))};
  equal([report.journeys.length, contexts.length, userFirst + aiFirst], [3, 3, 3], 'Exactly one fresh natural-seat context at each viewport');
  equal([sum('actions'), sum('startupMouseClicks'), sum('startupEscapeKeys'), sum('businessMouseClicks'),
    sum('preparations'), sum('layouts'), sum('screenshots'), sum('criterionReads'), sum('playerReads'), sum('actualWireResponses'),
    sum('humanPicks'), sum('completionAttempts')], [18, 6, 3, 9, 24, 39, 9, 3, 6, 9, 3, 0], 'Complete actual public native and wire scope');
  equal(sum('aiPicks'), 2 * userFirst + aiFirst, 'Natural-seat-dependent actual AI picks');
  equal(sum('frames'), 26 * userFirst + 25 * aiFirst + 2 * sum('wheels'), 'All body frames include actual seat and measured native wheel branches');
  report.status = 'passed';
} catch (error) {
  report.status = 'failed';
  report.error = String(error.stack || error);
  throw error;
} finally {
  if (browser) {
    try { await browser.close(); } catch (error) {report.browserCloseError = String(error.stack || error); report.status = 'failed';}
  }
  if (host) host.kill();
  try {
    report.sourceAfter = tracked();
    report.distAfter = inventory('dist');
    report.locksAfter = ['package.json', 'package-lock.json'].map(sourceReceipt);
    report.installedAfter = versions();
    report.offlineAfter = offline();
    report.indexAfter = textFile('index-after.txt', git('ls-files', '--stage', '-z'));
    report.sourceHeld = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter);
    report.distHeld = JSON.stringify(report.distBefore) === JSON.stringify(report.distAfter);
    report.locksHeld = JSON.stringify(report.locksBefore) === JSON.stringify(report.locksAfter);
    report.installedHeld = JSON.stringify(report.installedBefore) === JSON.stringify(report.installedAfter);
    report.offlineHeld = JSON.stringify(report.offlineBefore) === JSON.stringify(report.offlineAfter);
    report.indexHeld = fs.readFileSync(path.join(OUT, 'index-before.txt')).equals(fs.readFileSync(path.join(OUT, 'index-after.txt')));
    assert([report.sourceHeld, report.distHeld, report.locksHeld, report.installedHeld, report.offlineHeld, report.indexHeld].every(Boolean), 'Physical source, dist, locks, 521 installed packages, offline and index hold');
  } catch (error) {
    report.status = 'failed';
    report.holdError = String(error.stack || error);
  }
  const raw = {
    version: 1, route: ROUTE, page: PAGE, helper: report.helper, qualifiedInput, responseBodies, limits: report.limits,
    contexts: report.journeys.flatMap(journey => journey.contexts).map(context => ({
      id: context.id, width: context.width, height: context.height, seat: context.seat, status: context.status,
      events: context.events, storageEvents: context.storageEvents, navigations: context.navigations,
      documentResponse: context.documentResponse ?? null, requests: context.requests, wireResponses: context.wireResponses,
      firstPartyReads: context.firstPartyReads, webSockets: context.webSockets, picks: context.picks,
      chosenCard: context.chosenCard ?? null, duplicateOpportunity: context.duplicateOpportunity ?? null,
      frames: context.frames.map(readRef), actions: context.actions.map(readRef),
      preparations: context.preparations.map(readRef), layouts: context.layouts.map(readRef), wheels: context.wheels.map(readRef),
      observedClose: context.observedClose.map(readRef), screenshots: context.screenshots, checkpoints: context.checkpoints,
      census: context.census ?? null, errors: context.errors, assetErrors: context.assetErrors, routeErrors: context.routeErrors,
      error: context.error ?? null, closeError: context.closeError ?? null,
      failureCaptureError: context.failureCaptureError ?? null, failureObservation: context.failureObservation ?? null,
      failureFallbackError: context.failureFallbackError ?? null,
    })),
  };
  report.raw = put('raw', raw);
  put('report', report);
  const walk = (dir, prefix = '') => fs.readdirSync(dir, {withFileTypes: true}).sort((a, b) => a.name.localeCompare(b.name)).flatMap(entry => {
    const file = prefix + entry.name;
    if (entry.isDirectory()) return walk(path.join(dir, entry.name), file + '/');
    assert(entry.isFile(), file + ' regular evidence file');
    return [file];
  });
  const bodies = walk(OUT).filter(file => file !== 'body-manifest.json').map(fileRef);
  put('body-manifest', {version: 1, files: bodies, filesCount: bodies.length, bodyBytes: bodies.reduce((n, row) => n + row.bytes, 0),
    limits: 'Every native evidence body except this nonrecursive manifest. Qualified input and physical source/build pins refer to separate authenticated workflow roles.'});
  assert.equal(report.status, 'passed', 'Native scope and physical holds must actually pass');
}
