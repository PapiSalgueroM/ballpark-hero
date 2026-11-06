import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import { createRequire } from 'node:module';
import pw, { chromium } from '../lib/playwrightLoader.mjs';
import { answerConsent } from '../lib/answerConsent.mjs';
import { waitForScrollIdle } from './nativeScrollReady.mjs';

const arg = name => { const i = process.argv.indexOf(name); assert(i >= 0 && process.argv[i + 1], name); return process.argv[i + 1]; };
const out = path.resolve(arg('--out')), dist = path.resolve(arg('--dist')), base = arg('--base-url').replace(/\/$/, ''), origin = new URL(base).origin;
assert(process.env.CI, 'Remote CI only');
const publicMode=true;
assert.equal(new URL(base).protocol,'https:','K_PUBLIC_HTTPS_ONLY');
assert.equal(origin,'https://douknowball.com','K_PUBLIC_EXACT_HOST');
assert.equal(new URL(base).pathname,'/','K_PUBLIC_ORIGIN_BASE_ONLY');assert.equal(new URL(base).search,'');assert.equal(new URL(base).hash,'');
const receipt = process.env.SIM_OFFLINE_RECEIPT;
const sha = b => createHash('sha256').update(b).digest('hex'), clone = v => JSON.parse(JSON.stringify(v));
const write = (file, v) => fs.writeFileSync(path.join(out, file), JSON.stringify(v, null, 2) + '\n');
function silent() { assert(receipt); assert.equal(fs.readFileSync(receipt).length, 0, 'CM_TEAM_NATIVE_NODE_OFFLINE_RECEIPT'); }
silent();
assert(!fs.existsSync(out) || fs.readdirSync(out).length === 0, 'Fresh owned output');
fs.mkdirSync(path.join(out, 'frames'), { recursive: true }); fs.mkdirSync(path.join(out, 'bodies'));
const m = JSON.parse(fs.readFileSync(arg('--manifest'), 'utf8'));
assert.equal(m.schema,'K_LEAGUE_PUBLIC_SOURCE_DIST_V1');
assert.equal(m.status,'QUALIFIED_NATIVE_BUILD_PUBLIC_INPUT');
assert.equal(m.product.commit,'25193b6efbde2e4855c171a91077efd6647d0285');
assert.equal(m.product.tree,'4debc9eb6ef46e9ace0c43e9a351e61efc6337c3');
assert.equal(m.public?.schema,'K_LEAGUE_PUBLIC_ACTUAL_AUTHORITY_V1');
assert.equal(m.public.status,'ACTUAL_PUBLISHED_NATIVE_BODY_AUTHORITY');
for(const field of ['nativeAdmission','buildAdmission'])assert.match(m.public[field],/^[a-f0-9]{64}$/);
assert.equal(m.public.buildAdmission,m.admissions.build);
assert.match(m.public.sourceCommit,/^[a-f0-9]{40}$/);assert.equal(m.public.sourceTree,m.product.tree);
assert.match(m.public.deploymentId,/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/);
assert.equal(m.public.origin,origin);assert.equal(m.public.nativeDriverGitBlob,'9f370ccbcd1534e6cfd5144059eb6a4fc8f3ee6d');
assert.match(m.product.commit, /^[a-f0-9]{40}$/); assert.match(m.product.tree, /^[a-f0-9]{40}$/);
for (const field of ['original', 'candidate', 'build']) assert.match(m.admissions[field], /^[a-f0-9]{64}$/);
assert.equal(m.admissions.original,'e3b1f2cd0774464113b64e62ac07d6939faf8a1254dcb8e32d70cf577718858c');
assert.deepEqual(m.sourceBefore, m.sourceAfter);
for (const file of ['src/pages/ClubManager.tsx', 'src/components/club-manager/ClubManagerTeamPicker.tsx']) assert.match(m.sourceAfter[file], /^[a-f0-9]{64}$/);
function sourceHeld() { for (const [file, digest] of Object.entries(m.sourceAfter)) assert.equal(sha(fs.readFileSync(file)), digest, file); }
sourceHeld();
const taskRequire = createRequire(path.join(process.cwd(), 'package.json'));
const blob = b => createHash('sha1').update(Buffer.from('blob ' + b.length + '\0')).update(b).digest('hex');
function pureReferences() {
  const codecPath='src/lib/soccerCareerSave.ts',dataPath='src/data/kLeague2026.ts';
  assert.equal(blob(fs.readFileSync(codecPath)),'86ec011693fd5bc702b5e8ccec05d27775a72a76');
  assert.equal(blob(fs.readFileSync(dataPath)),'7786c30acb29289ae929dbc605b1a14289dec388');
  const dir=path.join(out,'reference');fs.mkdirSync(dir);
  const moduleFile=path.join(dir,'codec.cjs'),result=taskRequire('esbuild').buildSync({entryPoints:[codecPath],bundle:true,platform:'node',format:'cjs',outfile:moduleFile,metafile:true,logLevel:'silent'});
  const inputs=Object.keys(result.metafile.inputs).map(file=>path.relative(process.cwd(),path.resolve(file)).split(path.sep).join('/')).sort();
  assert.deepEqual(inputs,['node_modules/lz-string/libs/lz-string.js',codecPath].sort(),'K_NATIVE_PURE_CODEC_INPUTS');
  for(const file of inputs){const bytes=fs.readFileSync(file),target=path.join(dir,'inputs',file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes,{flag:'wx'});}
  fs.writeFileSync(path.join(dir,'codec-metafile.json'),JSON.stringify(result.metafile,null,2)+'\n');
  const codec=taskRequire(moduleFile);for(const name of ['parseSoccerCareerSave','serializeSoccerCareerSave','isSoccerCareerSave'])assert.equal(typeof codec[name],'function');
  const ts=taskRequire('typescript'),sf=ts.createSourceFile(dataPath,fs.readFileSync(dataPath,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
  const unwrap=n=>{while(ts.isAsExpression(n)||ts.isParenthesizedExpression(n)||ts.isTypeAssertionExpression(n)||ts.isSatisfiesExpression(n))n=n.expression;return n;};
  const declarations=sf.statements.filter(ts.isVariableStatement).flatMap(n=>[...n.declarationList.declarations]),owner=declarations.filter(n=>ts.isIdentifier(n.name)&&n.name.text==='K_LEAGUE_2026');assert.equal(owner.length,1);
  const object=unwrap(owner[0].initializer);assert(ts.isObjectLiteralExpression(object));
  const property=(obj,name)=>{const matches=obj.properties.filter(p=>ts.isPropertyAssignment(p)&&(ts.isIdentifier(p.name)||ts.isStringLiteral(p.name))&&p.name.text===name);assert.equal(matches.length,1,name);return unwrap(matches[0].initializer);};
  const string=n=>{assert(ts.isStringLiteral(n));return n.text;};
  assert.equal(string(property(object,'id')),'kleague1');assert.equal(string(property(object,'country')),'South Korea');assert.equal(property(object,'modelOnlyRoster').kind,ts.SyntaxKind.TrueKeyword);
  const array=property(object,'clubs');assert(ts.isArrayLiteralExpression(array));
  const clubs=array.elements.map(node=>{const row=unwrap(node);assert(ts.isObjectLiteralExpression(row));const name=string(property(row,'name')),held=row.properties.filter(p=>ts.isPropertyAssignment(p)&&ts.isIdentifier(p.name)&&p.name.text==='accessHeld');assert(held.length<=1);if(held.length)assert.equal(held[0].initializer.kind,ts.SyntaxKind.TrueKeyword);return{name,accessHeld:held.length===1};});
  assert.deepEqual(clubs.map(c=>c.name),['Gangwon FC','Gwangju FC','Gimcheon Sangmu','Daejeon Hana Citizen','Bucheon FC 1995','FC Seoul','FC Anyang','Ulsan HD','Incheon United','Jeonbuk Motors','Jeju SK','Pohang Steelers']);
  assert.deepEqual(clubs.filter(c=>c.accessHeld).map(c=>c.name),['Gimcheon Sangmu']);
  fs.copyFileSync(dataPath,path.join(dir,'kLeague2026-source.ts'));
  const bytes=fs.readFileSync(moduleFile);write('pure-reference.json',{codecSource:{path:codecPath,gitBlob:blob(fs.readFileSync(codecPath))},codecModule:{file:'reference/codec.cjs',bytes:bytes.length,sha256:sha(bytes)},inputs,descriptorSource:{path:dataPath,gitBlob:blob(fs.readFileSync(dataPath))},clubs,scope:'Pure codec plus literal AST reading only. No engine import, model initialization, save fixture generation, RNG replacement or phase callback.'});
  const enginePath='src/lib/clubManager.ts',poolPath='src/data/players.ts';
  const engineBytes=fs.readFileSync(enginePath),poolBytes=fs.readFileSync(poolPath);
  assert.equal(blob(engineBytes),'a089f29e8f1adee4090927937bac4d50017ae7cf','K_NATIVE_OPENING_ENGINE_SOURCE');
  assert.equal(blob(poolBytes),'e3435eaae958a2853ae24de9d7eca29f5cfcf0da','K_NATIVE_OPENING_RAW_POOL_SOURCE');
  const engine=ts.createSourceFile(enginePath,engineBytes.toString('utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
  const vars=nodes=>nodes.filter(ts.isVariableStatement).flatMap(node=>[...node.declarationList.declarations]);
  const variable=(nodes,name)=>{const rows=vars(nodes).filter(node=>ts.isIdentifier(node.name)&&node.name.text===name);assert.equal(rows.length,1,name);return unwrap(rows[0].initializer);};
  const functionSource=name=>{const rows=engine.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);assert.equal(rows.length,1,name);return rows[0];};
  const suffix=variable(engine.statements,'YOUTH_PAD_SUFFIX');assert(ts.isStringLiteral(suffix));assert.equal(suffix.text,' (Youth)');
  const positions=name=>{const value=variable(engine.statements,name);assert(ts.isArrayLiteralExpression(value));return value.elements.map(string);};
  const coverage=functionSource('ensureSquadCoverage'),need=variable(coverage.body.statements,'need');assert(ts.isObjectLiteralExpression(need));
  const requirements=Object.fromEntries(need.properties.map(node=>{assert(ts.isPropertyAssignment(node)&&ts.isIdentifier(node.name)&&ts.isNumericLiteral(node.initializer));return[node.name.text,Number(node.initializer.text)];}));
  assert.deepEqual(requirements,{GK:2,DEF:5,MID:5,ATT:4});
  const poolSF=ts.createSourceFile(poolPath,poolBytes.toString('utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS),poolArray=variable(poolSF.statements,'players');assert(ts.isArrayLiteralExpression(poolArray));
  const rawPlayers=poolArray.elements.map(node=>{assert(ts.isObjectLiteralExpression(node));return{name:string(property(node,'name')),club:string(property(node,'club'))};});
  assert.equal(rawPlayers.length,557);assert.equal(rawPlayers.filter(row=>clubs.some(club=>club.name===row.club)).length,0,'K_NATIVE_NO_K_RAW_POOL_ROWS');
  const opening={engineGitBlob:blob(engineBytes),poolGitBlob:blob(poolBytes),youthSuffix:suffix.text,requirements,positions:{DEF:positions('POS_DEF'),MID:positions('POS_MID')},rawPoolNames:rawPlayers.map(row=>row.name),rawPoolRows:rawPlayers.length,rawKRows:0};
  write('opening-source-reference.json',{...opening,sourceFunctions:Object.fromEntries(['makeYouth','ensureSquadCoverage','buildSquad','toCMPlayer','groupOf'].map(name=>[name,functionSource(name).getText(engine)])),scope:'Pinned source AST/literals only. No model import or call, generated save, clock or RNG override.'});
  fs.copyFileSync(poolPath,path.join(dir,'opening-raw-pool-source.ts'));
  return{codec,clubs,ordinary:clubs.filter(c=>!c.accessHeld).map(c=>c.name),opening};
}
function attributeReferences() {
  const source = 'src/lib/soccerCareerAttributes.ts', expectedBlob = '2615a09ad90df3355f4f7d86ed84f95e91178137';
  assert.equal(blob(fs.readFileSync(source)), expectedBlob, 'K_ATTRIBUTES_PURE_OWNER_SOURCE');
  const file = path.join(out, 'reference', 'attributes.cjs'), result = taskRequire('esbuild').buildSync({ entryPoints: [source], bundle: true, platform: 'node', format: 'cjs', outfile: file, metafile: true, logLevel: 'silent' });
  const inputs = Object.keys(result.metafile.inputs).map(name => path.relative(process.cwd(), path.resolve(name)).split(path.sep).join('/')).sort();
  assert.deepEqual(inputs, [source], 'K_ATTRIBUTES_PURE_OWNER_ONLY');
  fs.copyFileSync(source, path.join(out, 'reference', 'soccerCareerAttributes-source.ts'));
  fs.writeFileSync(path.join(out, 'reference', 'attributes-metafile.json'), JSON.stringify(result.metafile, null, 2) + '\n');
  const api = taskRequire(file);
  for (const name of ['attrTreeFor', 'deriveAttributes', 'safePhysique', 'heightLabel', 'weightLabel', 'buildLabel', 'buildEffects', 'effectsSummary']) assert.equal(typeof api[name], 'function', name);
  write('attributes-pure-reference.json', { source, gitBlob: expectedBlob, inputs, module: { file: 'reference/attributes.cjs', bytes: fs.statSync(file).size, sha256: sha(fs.readFileSync(file)) }, scope: 'Existing pure UI arithmetic only. No engine import, initialization, progression, save write, clock or RNG override.' });
  return api;
}
const references = pureReferences(), ordinary = references.ordinary, memberNames = references.clubs.map(c=>c.name), oldFour = ['FC Seoul','Ulsan HD','Jeonbuk Motors','Pohang Steelers'];
const attributeMath = attributeReferences();
function validateGeneratedOpeningSquad(career){
 const squad=career.squad,ref=references.opening,marker='K_NATIVE_GENERATED_OPENING_SQUAD';
 assert(Array.isArray(squad)&&squad.length===Object.values(ref.requirements).reduce((sum,n)=>sum+n,0),marker+' coverage census');
 assert.equal(new Set(squad.map(player=>player.id)).size,squad.length,marker+' unique IDs');
 assert.equal(new Set(squad.map(player=>player.name)).size,squad.length,marker+' unique names');
 const groups={GK:0,DEF:0,MID:0,ATT:0};
 for(const player of squad){
  assert(typeof player.id==='string'&&/^youth-[a-z0-9]+-[1-9]\d*-[1-9]\d{2}$/.test(player.id),marker+' makeYouth ID');
  assert(!ref.rawPoolNames.includes(player.name),marker+' RAW_POOL exclusion');
  assert(player.isYouth===true&&typeof player.name==='string'&&player.name.endsWith(ref.youthSuffix),marker+' makeYouth name and flag');
  assert(Number.isInteger(player.age)&&player.age>=17&&player.age<=19&&Number.isInteger(player.rating)&&player.rating>=55&&player.rating<=68,marker+' makeYouth ranges');
  assert(player.fitness===100&&player.morale===72&&player.injuryWeeks===0&&player.suspendedMatches===0&&player.seasonGoals===0&&player.seasonAssists===0,marker+' makeYouth opening fields');
  groups[player.position==='GK'?'GK':ref.positions.DEF.includes(player.position)?'DEF':ref.positions.MID.includes(player.position)?'MID':'ATT']++;
 }
 assert.deepEqual(groups,ref.requirements,marker+' positional coverage');
 return{source:ref.engineGitBlob,rawPoolSource:ref.poolGitBlob,rawPoolRows:ref.rawPoolRows,rawKRows:ref.rawKRows,groups,uniqueIDs:squad.map(player=>player.id),scope:'Actual makeYouth/ensureSquadCoverage opening shape and zero RAW_POOL adoption. No nonexistent generated-field promise.'};
}
function generatedOpeningCopiedControls(career){
 const original=JSON.stringify(career),controls=[];
 for(const kind of ['youth-flag','raw-pool-name']){
  const copy=clone(career),player=copy.squad[0],old=kind==='youth-flag'?player.isYouth:player.name;
  if(kind==='youth-flag')player.isYouth=false;else player.name=references.opening.rawPoolNames[0];
  const fault=clone(player);assert.notEqual(JSON.stringify(copy),original);let owned;
  try{validateGeneratedOpeningSquad(copy);}catch(error){owned=error;}
  assert(owned instanceof assert.AssertionError);assert.match(owned.message,kind==='raw-pool-name'?/^K_NATIVE_GENERATED_OPENING_SQUAD RAW_POOL exclusion/:/^K_NATIVE_GENERATED_OPENING_SQUAD makeYouth name and flag/);
  if(kind==='youth-flag')player.isYouth=old;else player.name=old;
  assert.equal(JSON.stringify(copy),original);validateGeneratedOpeningSquad(copy);assert.equal(JSON.stringify(career),original);
  controls.push({kind,before:clone(career.squad[0]),fault,restored:clone(player),owned:{name:owned.name,message:owned.message},changed:true,wholeInverseExact:true,actualHeld:true});
 }
 return controls;
}
function parsedSave(raw,key) {
  if(raw===null)return null;
  assert.equal(typeof raw,'string');
  if(key===KEY){const value=JSON.parse(raw);assert(value&&typeof value.clubName==='string'&&Array.isArray(value.squad)&&Array.isArray(value.calendar)&&Array.isArray(value.table),'K_NATIVE_COMPLETE_CM_SAVE');return value;}
  const value=references.codec.parseSoccerCareerSave(raw);assert(references.codec.isSoccerCareerSave(value),'K_NATIVE_COMPLETE_SC_SAVE');assert.equal(references.codec.serializeSoccerCareerSave(value),raw,'K_NATIVE_SC_CODEC_WHOLE_ROUNDTRIP');return value;
}

function inventory() {
  const rows = [];
  function walk(rel = '') { for (const e of fs.readdirSync(path.join(dist, rel), { withFileTypes: true })) { const file = path.posix.join(rel, e.name); if (e.isDirectory()) walk(file); else { assert(e.isFile()); const b = fs.readFileSync(path.join(dist, file)); rows.push({ file, bytes: b.length, sha256: sha(b) }); } } }
  walk(); return rows.sort((a, b) => a.file < b.file ? -1 : a.file > b.file ? 1 : 0);
}
assert.deepEqual(inventory(), m.distBefore); assert.equal(sha(JSON.stringify(m.distBefore)), m.distDigest);
const refs = new Map(m.distBefore.map(r => [r.file, r])), marker = /["']data-cm-board-wants["']\s*:/;
const leafRows = m.distBefore.filter(r => r.file.startsWith('assets/') && r.file.endsWith('.js') && marker.test(fs.readFileSync(path.join(dist, r.file), 'utf8')));
assert.equal(leafRows.length, 1, 'CM_TEAM_NATIVE_ONE_EXECUTABLE_LEAF');
const leaf = leafRows[0], leafURL = origin + '/' + leaf.file, observed = new Map();
const attributeInput = m.scAttributes;
assert(attributeInput && attributeInput.status === 'QUALIFIED_ATTRIBUTES_SOURCE_AND_BUILD', 'K_ATTRIBUTES_ACTUAL_INPUT_MUST_BIND');
assert.equal(attributeInput.buildAdmission, m.admissions.build, 'K_ATTRIBUTES_SAME_ADMITTED_BUILD');
for (const owner of [attributeInput.page, attributeInput.component]) {
  assert(owner && typeof owner.path === 'string'); assert.match(owner.gitBlob, /^[a-f0-9]{40}$/); assert.match(owner.sha256, /^[a-f0-9]{64}$/);
  const bytes = fs.readFileSync(owner.path); assert.equal(blob(bytes), owner.gitBlob); assert.equal(sha(bytes), owner.sha256);
  assert.equal(m.sourceAfter[owner.path], owner.sha256, 'K_ATTRIBUTES_SOURCE_UNION');
}
assert.equal(attributeInput.page.path, 'src/pages/SoccerCareer.tsx');
assert.equal(attributeInput.page.gitBlob, '08a93b48a2bfcd42883b24c72e8f64f49caec6aa');
assert.equal(attributeInput.component.path, 'src/components/soccer-career/CareerAttributesScreen.tsx');
assert.equal(attributeInput.component.gitBlob, '7c0894da1cc8f59b1e0918291dfb6d598ec21462');
const attributeRows = m.distBefore.filter(row => row.file.startsWith('assets/') && row.file.endsWith('.js') && /["'], full attributes["']/.test(fs.readFileSync(path.join(dist, row.file), 'utf8')));
assert.equal(attributeRows.length, 1, 'K_ATTRIBUTES_ONE_EXECUTABLE_LEAF');
const attributesLeaf = attributeRows[0], attributesURL = origin + '/' + attributesLeaf.file;
assert.deepEqual(attributesLeaf, attributeInput.leaf, 'K_ATTRIBUTES_ACTUAL_COMPILED_LEAF_MUST_BIND');
assert.notEqual(attributesLeaf.file, leaf.file);
assert(refs.has('prerender-boot.js'));
assert.equal(m.cmCold?.schema,'K_LEAGUE_CM_COLD_EXTENSION_V1','K_NATIVE_CM_COLD_MANIFEST');
for(const [file,expected]of[['src/pages/ClubManager.tsx','e6ced533f6c6d5a76190dbc1042f9120d8bb39ea'],['src/components/club-manager/ClubManagerDeferredViews.tsx','6a38a686347c46d16c6f12bc26858197d3a14be5'],['src/components/ui/tabs.tsx','ba20fbb1b869b15d60f3e79507b68ebd2ee577ce']])assert.equal(blob(fs.readFileSync(file)),expected,'K_NATIVE_CM_COLD_SOURCE '+file);
const cmMarkers={deferredViews:/["']data-testid["']\s*:\s*["']cm-world-editor-tile["']/,tabs:/(?:["']className["']|className)\s*:\s*[\w$]+\(\s*["']inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground["']/};
const cmOwners={};
for(const role of ['deferredViews','tabs']){
 const row=m.cmCold[role];assert(row&&typeof row.file==='string');assert.deepEqual(refs.get(row.file),row,'K_NATIVE_CM_COLD_DIST_ROLE '+role);
 const matches=m.distBefore.filter(v=>v.file.startsWith('assets/')&&v.file.endsWith('.js')&&cmMarkers[role].test(fs.readFileSync(path.join(dist,v.file),'utf8')));
 assert.equal(matches.length,1,'K_NATIVE_CM_COLD_ONE_EXECUTABLE_OWNER '+role);assert.deepEqual(matches[0],row);cmOwners[role]=row;
}
assert.notEqual(cmOwners.deferredViews.file,cmOwners.tabs.file,'K_NATIVE_CM_COLD_SHARED_OWNER_REQUIRES_SEPARATE_PEER');
const cmURLs=Object.fromEntries(Object.entries(cmOwners).map(([role,row])=>[role,origin+'/'+row.file]));

const report = { schema: 'K_LEAGUE_PUBLIC_FULL_NATIVE_JOURNEYS_V1', status: 'incomplete', public:m.public, product: m.product, authority: { manifestSHA256: sha(fs.readFileSync(arg('--manifest'))), admissions: m.admissions, distDigest: m.distDigest }, executableLeaf: leaf, attributesLeaf, contexts: [], screenshots: [],
  scope: 'Three widths, nine independent fresh contexts. Actual current K CM11ordinary choices/12members/generated-squad disclosures and one actual job, table/Cup reads and real resume. Actual current SC50OVR ordinary academy and historical2005 old-four preview through real UI. Current SC also exercises the actual Attributes held/late/cold/warm/refusal/Retry lifecycle after real save commit. The three CM contexts additionally exercise actual World/header/overview/Tabs held/late/cold/warm/refusal/Retry with full committed fixture and tile values. Twenty fresh rendered tile rows plus the actual saved-trophy Cabinet condition cover all21source roles; no positive Cabinet or match-play claim is invented. Native CDP remains attached through each real context close. Every raw request/body/initiator is retained; only exact qualified host POSTs and actual linked read preflights are excluded by the complete inherited public protocol. All global game/provider writes are forbidden. Read-only frame counts and IDs stay raw, with their network interpretation closed after all original immediate/rAF traces and real context close. All clocks and browser RNG natural. No annual/model callback, old-custom load, nonpreseason table, Deadline End-journey, unobserved alias or private-fork claim.' };
const known = new Set(['https://flagcdn.com', 'https://fonts.googleapis.com', 'https://fonts.gstatic.com', 'https://flawuiqbvjobmkfkauhw.supabase.co']);
const idle = p => p.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const scrollOf = p => p.evaluate(() => ({ x: scrollX, y: scrollY }));
const active = p => p.evaluate(() => { const n = document.activeElement; return n ? { tag: n.tagName, id: n.id, name: n.getAttribute('aria-label'), text: n.textContent?.trim().slice(0, 100) } : null; });
const KEY = 'dukb-club-manager-save', STALE = 'dukb-reloaded-stale-chunk';
async function frame(p) { const raw = await p.evaluate(k => localStorage.getItem(k), KEY); assert.equal(raw, null, 'CM_TEAM_NATIVE_NO_CAREER_SAVE'); return { raw, state: null }; }
async function storage(p) { return p.evaluate(() => Object.fromEntries(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)]))); }
async function keyboardTo(p,r,target){
 assert.equal(await target.count(),1,'Unique keyboard target');
 const limit=await p.locator('a[href],button,input,select,textarea,[tabindex]').count()+2,events=[];
 for(let i=0;i<=limit;i++){if(await target.evaluate(n=>n===document.activeElement||n.contains(document.activeElement))){r.actions.push({type:'keyboard-reach',events,focus:await active(p)});return;}await p.keyboard.press('Tab');events.push(await active(p));}
 assert.fail('Actual Tab traversal did not reach the target');
}
const targetGeometry=target=>target.evaluate(n=>{const b=n.getBoundingClientRect();let clip={x:0,y:0,right:innerWidth,bottom:innerHeight};
   for(let a=n.parentElement;a;a=a.parentElement){const s=getComputedStyle(a),q=a.getBoundingClientRect();if(['auto','scroll'].includes(s.overflowY)&&a.scrollHeight>a.clientHeight+1){clip={x:Math.max(clip.x,q.x),y:Math.max(clip.y,q.y),right:Math.min(clip.right,q.right),bottom:Math.min(clip.bottom,q.bottom)};}}
   return{target:{x:b.x,y:b.y,right:b.right,bottom:b.bottom,height:b.height},clip};});
function validateTouchGeometry(box,width){
 const t=box.target,g=box.clip;
 assert(t.y>=g.y+4&&t.bottom<=g.bottom-4&&t.x>=g.x&&t.right<=Math.min(g.right,width),'SC_REAL_ENTRY_NATIVE_TOUCH_TARGET_UNREACHABLE');
}
function copiedTouchGeometryControl(box,width){
 const original=JSON.stringify(box),copy=clone(box),top=copy.target.y;copy.target.y=copy.clip.y-5;const fault=JSON.stringify(copy);assert.notEqual(fault,original);
 let owned=null;try{validateTouchGeometry(copy,width);}catch(error){owned=error;}
 assert(owned instanceof assert.AssertionError);assert.match(owned.message,/^SC_REAL_ENTRY_NATIVE_TOUCH_TARGET_UNREACHABLE/);copy.target.y=top;assert.equal(JSON.stringify(copy),original);
 return{before:box,fault:JSON.parse(fault),ownedFailure:{name:owned.name,message:owned.message},wholeInverseExact:true};
}
async function touchReach(p,r,target){
 assert.equal(await target.count(),1,'Unique touch target');const session=await p.context().newCDPSession(p),samples=[];
 try{for(let attempt=0;attempt<20;attempt++){
  const box=await targetGeometry(target);
  const t=box.target,g=box.clip;if(t.y>=g.y+4&&t.bottom<=g.bottom-4&&t.x>=g.x&&t.right<=Math.min(g.right,r.width))break;
  assert(g.bottom-g.y>48&&g.right-g.x>48,'A real touch scroll surface is visible');
  const down=t.bottom>g.bottom-4,x=(g.x+g.right)/2,start=down?g.bottom-20:g.y+20;
  const end=down?Math.max(g.y+20,start-Math.min(360,(g.bottom-g.y)*.65)):Math.min(g.bottom-20,start+Math.min(360,(g.bottom-g.y)*.65));
  const before=await scrollOf(p);
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:start,radiusX:1,radiusY:1,force:1,id:1}]});
  for(let step=1;step<=10;step++){await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:start+(end-start)*step/10,radiusX:1,radiusY:1,force:1,id:1}]});await p.waitForTimeout(25);}
  await p.waitForTimeout(120);await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await idle(p);
  samples.push({attempt,box,before,after:await scrollOf(p)});
 }}finally{await session.detach();}
 const reached=await targetGeometry(target);validateTouchGeometry(reached,r.width);r.touchReachControl??=copiedTouchGeometryControl(reached,r.width);
 r.actions.push({type:'trusted-touch-scroll-preparation',samples,reached});
}
async function prepareControl(p,r,target){
 await waitForScrollIdle(p);if(r.width<768)await touchReach(p,r,target);else await keyboardTo(p,r,target);
 await target.click({trial:true});await idle(p);await waitForScrollIdle(p);
}
async function pressPrepared(p,r,target,label){
 if(r.width<768)await target.tap();else{assert(await target.evaluate(n=>n===document.activeElement||n.contains(document.activeElement)),'Keyboard target keeps focus after preflight');await p.keyboard.press('Enter');}
 r.actions.push({type:r.actor,label,focus:await active(p)});
}
async function press(p,r,target,label){await prepareControl(p,r,target);await pressPrepared(p,r,target,label);await idle(p);}

function validateReadonlyReview(before,next){
 assert.deepEqual(next.document,before.document,'SC_REAL_ENTRY_NATIVE_REVIEW_DOCUMENT_SCROLL');
 assert.equal(next.saved.raw,before.saved.raw,'Phone read-only keeps every saved byte');assert.deepEqual(next.saved.state,before.saved.state);
 assert.deepEqual(next.storage,before.storage,'All browser storage held');assert.equal(next.url,before.url);deferPublicReadOnlyBoundary(before,next,'complete read-only review');
}
function copiedReviewScrollControl(before,after){
 const sample={before,after},original=JSON.stringify(sample),copy=clone(sample);copy.after.document.y+=10;const fault=JSON.stringify(copy);assert.notEqual(fault,original);
 let owned=null;try{validateReadonlyReview(copy.before,copy.after);}catch(error){owned=error;}
 assert(owned instanceof assert.AssertionError);assert.match(owned.message,/^SC_REAL_ENTRY_NATIVE_REVIEW_DOCUMENT_SCROLL/);
 const faultDocument=clone(copy.after.document);copy.after.document.y=after.document.y;assert.equal(JSON.stringify(copy),original);assert.equal(JSON.stringify(sample),original);
 return{actualSampleSHA256:sha(original),beforeDocument:before.document,actualAfterDocument:after.document,faultAfterDocument:faultDocument,ownedFailure:{name:owned.name,message:owned.message},wholeInverseExact:true,actualSampleHeld:true,scope:'Copied actual read-only review sample only. No physical input or signing-scroll control credit.'};
}

async function cardGeometry(card){return card.evaluate(n=>{const b=n.getBoundingClientRect();let clip={x:0,y:0,right:innerWidth,bottom:innerHeight};for(let a=n.parentElement;a;a=a.parentElement){const s=getComputedStyle(a),q=a.getBoundingClientRect();if(['auto','scroll','hidden','clip'].includes(s.overflowX)){clip.x=Math.max(clip.x,q.x);clip.right=Math.min(clip.right,q.right);}if(['auto','scroll','hidden','clip'].includes(s.overflowY)){clip.y=Math.max(clip.y,q.y);clip.bottom=Math.min(clip.bottom,q.bottom);}}const target={x:b.x,y:b.y,right:b.right,bottom:b.bottom,width:b.width,height:b.height},points=[];for(const x of[b.x+8,(b.x+b.right)/2,b.right-8])for(const y of[b.y+8,(b.y+b.bottom)/2,b.bottom-8]){const hit=document.elementFromPoint(x,y);points.push({x,y,inside:!!hit&&(hit===n||n.contains(hit))});}return{target,clip,points,document:{scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}};});}
function validateCard(box){const t=box.target,c=box.clip;assert(t.width>0&&t.height>0&&t.x>=c.x&&t.right<=c.right&&t.y>=c.y+4&&t.bottom<=c.bottom-4&&box.points.length===9&&box.points.every(p=>p.inside),'SC_REAL_ENTRY_CARD_WHOLE_VISIBLE');assert(box.document.scrollWidth<=box.document.clientWidth+1,'No horizontal document overflow');}
function cardControl(box){const before=JSON.stringify(box),copy=clone(box),y=copy.target.y;copy.target.y=copy.clip.y-5;assert.notEqual(JSON.stringify(copy),before);let owned=null;try{validateCard(copy);}catch(error){owned=error;}assert(owned instanceof assert.AssertionError);assert.match(owned.message,/^SC_REAL_ENTRY_CARD_WHOLE_VISIBLE/);copy.target.y=y;assert.equal(JSON.stringify(copy),before);assert.equal(JSON.stringify(box),before);return{changed:true,ownedFailure:{name:owned.name,message:owned.message},wholeInverseExact:true,actualHeld:true,scope:'Copied actual card geometry only, no physical negative-control credit.'};}

async function sessionStorageOf(p) { return p.evaluate(() => Object.fromEntries(Object.keys(sessionStorage).sort().map(k => [k, sessionStorage.getItem(k)]))); }
function writes(r) { return r.requests.filter(q => !['GET', 'HEAD'].includes(q.method)).length; }

async function sample(p, r, label) {
  const v = await p.evaluate(key => {
    const a = document.activeElement;
    return { url: location.href, html: document.documentElement.outerHTML, text: document.body.innerText,
      document: { x: scrollX, y: scrollY }, focus: a ? { tag: a.tagName, id: a.id, name: a.getAttribute('aria-label'), text: a.textContent?.trim().slice(0, 100) } : null,
      local: Object.fromEntries(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)])),
      session: Object.fromEntries(Object.keys(sessionStorage).sort().map(k => [k, sessionStorage.getItem(k)])),
      careerRaw: localStorage.getItem(key),
      rows: [...document.querySelectorAll('[data-cm-board-wants]')].map(n => ({ html: n.closest('button').outerHTML, demand: n.textContent, name: n.closest('button').querySelector('span.text-xs.font-bold.truncate')?.textContent })) };
  }, r.saveKey || KEY);
  if(!r.allowSave&&!r.committed)assert.equal(v.careerRaw,null,'K_NATIVE_NO_SAVE_BEFORE_REAL_COMMIT');
  v.careerState=parsedSave(v.careerRaw,r.saveKey || KEY);
  if(r.allowSave&&v.careerRaw!==null)r.committed=true;
  const full = { sequence: r.frames.length, label, phase: r.phase, at: performance.now(), writeRequests: writes(r), publicNetwork: publicRawNetwork(r,r.frames.length), value: v };
  const raw = Buffer.from(JSON.stringify(full) + '\n'), bytes = gzipSync(raw), file = 'frames/' + r.id + '-' + String(full.sequence).padStart(3, '0') + '.json.gz';
  assert(raw.length <= 44 * 1024 * 1024 && bytes.length <= 12 * 1024 * 1024, 'CM_TEAM_NATIVE_FULL_FRAME_RETENTION');
  fs.writeFileSync(path.join(out, file), bytes, { flag: 'wx' });
  r.frames.push({ sequence: full.sequence, label, phase: r.phase, file, bytes: bytes.length, sha256: sha(bytes), decodedBytes: raw.length, decodedSHA256: sha(raw) });
  return full;
}
function review(v) { return { document: v.value.document, saved: { raw: v.value.careerRaw, state: v.value.careerState }, storage: v.value.local, session: v.value.session, url: v.value.url, writeRequests: v.writeRequests, publicNetwork:v.publicNetwork }; }
function sameScreen(a, b) { validateReadonlyReview(review(a), review(b)); assert.deepEqual(b.value.session, a.value.session, 'CM_TEAM_NATIVE_SESSION_HELD'); }
async function beginWatch(p) {
  return p.evaluate(() => {
    const trace = window.__cmNativeTrace; assertTrace(trace);
    function assertTrace(v) { if (!v || v.watching) throw Error('CM_TEAM_NATIVE_TRACE_SETUP'); }
    trace.watching = true; trace.current = [];
    const read = () => { if (!trace.watching) return; const a = document.activeElement; trace.current.push({ sequence: trace.current.length, at: performance.now(), document: { x: scrollX, y: scrollY }, focus: a ? { tag: a.tagName, id: a.id, name: a.getAttribute('aria-label'), text: a.textContent?.trim().slice(0, 100) } : null, url: location.href, local: JSON.stringify(Object.fromEntries(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)]))), session: JSON.stringify(Object.fromEntries(Object.keys(sessionStorage).sort().map(k => [k, sessionStorage.getItem(k)]))) }); if (trace.current.length > 900) { trace.overflow = true; trace.watching = false; return; } requestAnimationFrame(read); };
    read(); return trace.events.length;
  });
}
async function endWatch(p, r, label, startEvent) {
  const t = await p.evaluate(() => { const t = window.__cmNativeTrace; t.watching = false; return { frames: t.current, events: t.events, overflow: t.overflow }; });
  assert.equal(t.overflow, false, 'CM_TEAM_NATIVE_TRACE_BOUND'); assert(t.frames.length >= 1);
  const value = { label, firstSequence: 0, lastSequence: t.frames.length - 1, frames: t.frames, events: t.events.slice(startEvent) };
  r.traces.push(value); return value;
}
function validateTrace(value, before, focusHeld) {
  assert.equal(value.frames.length, value.lastSequence - value.firstSequence + 1, 'CM_TEAM_NATIVE_TRACE_COMPLETE');
  for (let i = 0; i < value.frames.length; i++) {
    const f = value.frames[i]; assert.equal(f.sequence, value.firstSequence + i, 'CM_TEAM_NATIVE_TRACE_COMPLETE');
    assert.deepEqual(f.document, before.value.document, 'CM_TEAM_NATIVE_EARLY_DOCUMENT');
    assert.equal(f.url, before.value.url); assert.equal(f.local, JSON.stringify(before.value.local), 'CM_TEAM_NATIVE_EARLY_STORAGE');
    assert.equal(f.session, JSON.stringify(before.value.session), 'CM_TEAM_NATIVE_EARLY_SESSION');
    if (focusHeld) assert.deepEqual(f.focus, before.value.focus, 'CM_TEAM_NATIVE_ARRIVAL_FOCUS');
  }
}
function traceOmissionControl(value, before) {
  const original = JSON.stringify(value), copy = clone(value); assert(copy.frames.length > 1);
  const [removed] = copy.frames.splice(1, 1); assert.notEqual(JSON.stringify(copy), original);
  let owned; try { validateTrace(copy, before, true); } catch (e) { owned = e; }
  assert(owned instanceof assert.AssertionError); assert.match(owned.message, /^CM_TEAM_NATIVE_TRACE_COMPLETE/);
  copy.frames.splice(1, 0, removed); assert.equal(JSON.stringify(copy), original); assert.equal(JSON.stringify(value), original);
  return { changed: true, omittedSequence: removed.sequence, owned: { name: owned.name, message: owned.message }, wholeInverseExact: true, actualHeld: true };
}
async function earlySelect(p, r, target, label) {
  await prepareControl(p, r, target);
  const before = await sample(p, r, label + ' before actual input'), e = await beginWatch(p);
  await pressPrepared(p, r, target, label);
  for (const suffix of ['immediate', 'raf1', 'raf2']) { if (suffix !== 'immediate') await p.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve))); const after = await sample(p, r, label + ' ' + suffix); sameScreen(before, after); }
  await p.waitForTimeout(100);
  const after = await sample(p, r, label + ' early settled'); sameScreen(before, after);
  const trace = await endWatch(p, r, label, e); validateTrace(trace, before, false);
  assert(trace.events.some(v => v.trusted && (v.type === 'click' || v.type === 'keydown' && v.key === 'Enter')), 'CM_TEAM_NATIVE_TRUSTED_SELECTION');
  assert(await target.evaluate(n => n === document.activeElement || n.contains(document.activeElement)), 'Actual selection target owns focus');
  r.reviewScrollControl ??= copiedReviewScrollControl(review(before), review(after));
}
function validateFooter(box) {
  const t = box.target, c = box.clip;
  assert(t.width > 0 && t.height > 0 && t.x >= c.x - 1 && t.right <= c.right + 1 && t.y >= c.y - 1 && t.bottom <= c.bottom + 1 && box.points.length === 9 && box.points.every(p => p.inside), 'CM_TEAM_NATIVE_FIXED_FOOTER_WHOLE_VISIBLE');
  assert(box.document.scrollWidth <= box.document.clientWidth + 1, 'No horizontal document overflow');
}
function footerControl(box) {
  const original = JSON.stringify(box), copy = clone(box), bottom = copy.target.bottom; copy.target.bottom = copy.clip.bottom + 2; assert.notEqual(JSON.stringify(copy), original);
  let owned; try { validateFooter(copy); } catch (error) { owned = error; } assert(owned instanceof assert.AssertionError); assert.match(owned.message, /^CM_TEAM_NATIVE_FIXED_FOOTER_WHOLE_VISIBLE/);
  copy.target.bottom = bottom; assert.equal(JSON.stringify(copy), original); assert.equal(JSON.stringify(box), original); return { changed: true, owned: { name: owned.name, message: owned.message }, wholeInverseExact: true, actualHeld: true };
}
async function photo(p, r, label, target = null, fixedFooter = false) {
  const prep = await sample(p, r, label + ' before native photo preparation');
  let geometry = null;
  if (target) { if (!fixedFooter) await prepareControl(p, r, target); await waitForScrollIdle(p); geometry = await cardGeometry(target); if (fixedFooter) { validateFooter(geometry); r.footerControl ??= footerControl(geometry); } else { validateCard(geometry); r.cardControl ??= cardControl(geometry); } }
  const before = await sample(p, r, label + ' photo baseline');
  assert.deepEqual(before.value.local, prep.value.local); assert.deepEqual(before.value.session, prep.value.session); assert.equal(before.value.url, prep.value.url);
  const file = r.id + '-' + label + '.png'; await p.screenshot({ path: path.join(out, file) });
  const after = await sample(p, r, label + ' screenshot return'); sameScreen(before, after); assert.deepEqual(after.value.focus, before.value.focus);
  assert(await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), 'CM_TEAM_NATIVE_NO_HORIZONTAL_OVERFLOW');
  r.photos.push({ file, label, geometry, preparationFrame: prep.sequence, baselineFrame: before.sequence, afterFrame: after.sequence, scope: 'Viewport only, native preparation before fresh screenshot baseline.' }); report.screenshots.push(file);
}
function validateAssets(r) {
  assert.deepEqual(r.failures.filter(q => !r.aborts.some(a => a.id === q.id)), [], 'CM_TEAM_NATIVE_UNDECLARED_REQUEST_FAILURE');
  assert(r.assetBodies.some(a => a.path === 'prerender-boot.js'), 'CM_TEAM_NATIVE_BOOT_OBSERVED');
  for (const q of r.requests.filter(q => q.asset && !r.aborts.some(a => a.id === q.id))) assert.equal(r.assetBodies.filter(a => a.id === q.id).length, 1, 'CM_TEAM_NATIVE_BODY_RECEIPT');
  assert.equal(r.assetErrors.length, 0, 'CM_TEAM_NATIVE_BODY_READ_ERROR');
}
function assetControls(r) {
  const original = JSON.stringify(r), copy = clone(r);
  const index = copy.assetBodies.findIndex(v => v.path === leaf.file); assert(index >= 0);
  const [body] = copy.assetBodies.splice(index, 1); assert.notEqual(JSON.stringify(copy), original);
  let owned; try { validateAssets(copy); } catch (e) { owned = e; }
  assert(owned instanceof assert.AssertionError); assert.match(owned.message, /^CM_TEAM_NATIVE_BODY_RECEIPT/);
  copy.assetBodies.splice(index, 0, body); assert.equal(JSON.stringify(copy), original);
  const failure = copy.failures.find(f => copy.aborts.some(a => a.id === f.id)); assert(failure);
  const ix = copy.aborts.findIndex(a => a.id === failure.id), [abort] = copy.aborts.splice(ix, 1); assert.notEqual(JSON.stringify(copy), original);
  let abortOwned; try { validateAssets(copy); } catch (e) { abortOwned = e; }
  assert(abortOwned instanceof assert.AssertionError); assert.match(abortOwned.message, /^CM_TEAM_NATIVE_UNDECLARED_REQUEST_FAILURE/);
  copy.aborts.splice(ix, 0, abort); assert.equal(JSON.stringify(copy), original); assert.equal(JSON.stringify(r), original);
  return { body: { omitted: body, owned: { name: owned.name, message: owned.message } }, abort: { omitted: abort, owned: { name: abortOwned.name, message: abortOwned.message } }, wholeInverseExact: true, actualHeld: true };
}
function validateTeamRows(value){
 assert.deepEqual(value.rows.map(x=>x.name).sort(),[...ordinary].sort(),'K_NATIVE_ORDINARY_ROWS');
 for(const row of value.rows)assert(row.html.includes('generated squad')&&row.html.includes('Game rating')&&row.html.includes('Game budget'),'K_NATIVE_GENERATED_ROW_LABEL');
 const text=value.text.replace(/\s+/g,' ');assert(text.includes('catalogue has 12 members')&&text.includes('offers 11 ordinary jobs')&&text.includes('Gimcheon Sangmu remains in the league world as an opponent'),'K_NATIVE_MEMBER_ACCESS_NOTE');
}
function teamEvidenceControls(value){
 const source=JSON.stringify(value),copy=clone(value),row=copy.rows.pop();assert.notEqual(JSON.stringify(copy),source);let error;try{validateTeamRows(copy);}catch(e){error=e;}assert(error instanceof assert.AssertionError);assert.match(error.message,/^K_NATIVE_ORDINARY_ROWS/);copy.rows.push(row);assert.equal(JSON.stringify(copy),source);
 const before=copy.rows[0].html;assert.equal(before.split('generated squad').length,2);copy.rows[0].html=before.replace('generated squad','coverage omitted');let badgeError;try{validateTeamRows(copy);}catch(e){badgeError=e;}assert(badgeError instanceof assert.AssertionError);assert.match(badgeError.message,/^K_NATIVE_GENERATED_ROW_LABEL/);copy.rows[0].html=before;assert.equal(JSON.stringify(copy),source);assert.equal(JSON.stringify(value),source);
 return{rowOmission:{name:error.name,message:error.message},badgeOmission:{name:badgeError.name,message:badgeError.message},changed:true,wholeInverseExact:true,actualHeld:true,scope:'Copied actual DOM evidence only.'};
}
function validateDocuments(r){
 const requests=r.documentRequests,seen=new Set();assert(requests.length>0,'K_NATIVE_MAIN_DOCUMENT_GETS');
 for(const q of requests){
  assert(!seen.has(q.id),'K_NATIVE_UNIQUE_DOCUMENT_ID');seen.add(q.id);const rows=r.documentBodies.filter(b=>b.id===q.id);assert.equal(rows.length,1,'K_NATIVE_MAIN_DOCUMENT_BODY');
  const body=rows[0];assert.equal(body.url,q.url);assert.equal(body.status,200);const reference=refs.get(body.path);assert(reference);assert.deepEqual(body.reference,{bytes:reference.bytes,sha256:reference.sha256});
  const bytes=fs.readFileSync(path.join(out,body.file));assert.equal(bytes.length,body.bytes);assert.equal(sha(bytes),body.sha256);validatePublicDocument(fs.readFileSync(path.join(dist,body.path),'utf8'),bytes.toString('utf8'));
  const source=r.hostTelemetry.sources[body.publicSourceNavigation-1];assert(source,'K_PUBLIC_EVERY_DOCUMENT_SOURCE_QUALIFIED');assert.equal(source.document.url,body.url);assert.equal(source.document.bytes,body.bytes);assert.equal(source.document.sha256,body.sha256);
 }
 assert(r.documentBodies.every(row=>seen.has(row.id)),'K_NATIVE_NO_EXTRA_DOCUMENT_BODY');
 assert.equal(r.hostTelemetry.sources.length,requests.length,'K_PUBLIC_COMPLETE_DOCUMENT_SOURCE_CENSUS');
 assert.equal(r.publicDocuments.length,requests.length);assert(r.publicDocuments.every(row=>row.qualified),'K_PUBLIC_NO_UNQUALIFIED_DOCUMENT');
}
function documentControl(r){
 const before=JSON.stringify(r),copy=clone(r),body=copy.documentBodies.shift();assert(body);assert.notEqual(JSON.stringify(copy),before);let error;try{validateDocuments(copy);}catch(e){error=e;}assert(error instanceof assert.AssertionError);assert.match(error.message,/^K_NATIVE_MAIN_DOCUMENT_BODY/);copy.documentBodies.unshift(body);assert.equal(JSON.stringify(copy),before);assert.equal(JSON.stringify(r),before);
 return{omitted:body,name:error.name,message:error.message,changed:true,wholeInverseExact:true,actualHeld:true,scope:'Copied actual document response evidence; all raw framenavigated events remain separate.'};
}
async function readBlockReach(p,r,target,anchor){
 assert.equal(await target.count(),1,'Unique actual disclosure target');assert.equal(await anchor.count(),1,'Unique adjacent actual control');
 const before=await sample(p,r,'before read-only disclosure preparation');
 if(r.width<768)await touchReach(p,r,target);else{
  await prepareControl(p,r,anchor);let reached=false;const steps=[];
  for(let i=0;i<24;i++){await waitForScrollIdle(p);const box=await cardGeometry(target);try{validateCard(box);reached=true;break;}catch{}
   const key=box.target.y<box.clip.y+4?'PageUp':'PageDown';await p.keyboard.press(key);steps.push({key,geometry:box});await idle(p);
  }assert(reached,'K_NATIVE_DISCLOSURE_KEYBOARD_REACH');r.actions.push({type:'actual-keyboard-disclosure-reach',steps});
 }
 await waitForScrollIdle(p);const geometry=await cardGeometry(target);validateCard(geometry);const after=await sample(p,r,'after read-only disclosure preparation');assert.equal(after.value.careerRaw,before.value.careerRaw);assert.deepEqual(after.value.careerState,before.value.careerState);assert.deepEqual(after.value.local,before.value.local);assert.deepEqual(after.value.session,before.value.session);assert.equal(after.value.url,before.value.url);return geometry;
}
async function photoBlock(p,r,label,target,anchor){
 const geometry=await readBlockReach(p,r,target,anchor);await photo(p,r,label);assert.deepEqual(await cardGeometry(target),geometry);const actual=r.photos.at(-1);assert.equal(actual.label,label);actual.geometry=geometry;actual.actualDisclosureRead=true;return actual;
}
function savedBytesControl(full){
 const original=JSON.stringify(full),copy=clone(full);assert.equal(typeof copy.value.careerRaw,'string');const raw=copy.value.careerRaw;assert(raw.length>0);copy.value.careerRaw=String.fromCharCode(raw.charCodeAt(0)^1)+raw.slice(1);assert.notEqual(copy.value.careerRaw,raw);
 let error;try{validateReadonlyReview(review(full),review(copy));}catch(e){error=e;}assert(error instanceof assert.AssertionError);assert.match(error.message,/^Phone read-only keeps every saved byte/);copy.value.careerRaw=raw;assert.equal(JSON.stringify(copy),original);assert.equal(JSON.stringify(full),original);
 return{changed:true,owned:{name:error.name,message:error.message},wholeInverseExact:true,actualHeld:true,scope:'Copied actual complete saved literal only.'};
}
function validateKTable(names){
 assert.deepEqual([...names].sort(),[...memberNames].sort(),'K_NATIVE_TWELVE_MEMBER_TABLE');
}
function tableControl(names){
 const original=JSON.stringify(names),copy=[...names],index=copy.indexOf('Gimcheon Sangmu');assert(index>=0);const [club]=copy.splice(index,1);let error;try{validateKTable(copy);}catch(e){error=e;}assert(error instanceof assert.AssertionError);assert.match(error.message,/^K_NATIVE_TWELVE_MEMBER_TABLE/);copy.splice(index,0,club);assert.equal(JSON.stringify(copy),original);assert.equal(JSON.stringify(names),original);return{changed:true,owned:{name:error.name,message:error.message},wholeInverseExact:true,actualHeld:true};
}

function validateAttributesSurface(actual, state) {
  const tree = attributeMath.attrTreeFor(state.position), derived = attributeMath.deriveAttributes(state, state.position, state.physique, state.attrShape), phys = attributeMath.safePhysique(state.position, state.physique);
  assert.equal(actual.heading, state.playerName + ', full attributes', 'K_ATTRIBUTES_ACTUAL_HEADING');
  assert.equal(actual.summary[0], String(state.overall), 'K_ATTRIBUTES_OVERALL');
  assert.equal(actual.summary[1], attributeMath.heightLabel(phys.heightCm), 'K_ATTRIBUTES_HEIGHT');
  assert.equal(actual.summary[2], attributeMath.weightLabel(phys.weightKg), 'K_ATTRIBUTES_WEIGHT');
  assert(actual.buildText.includes(attributeMath.buildLabel(phys) + '.'), 'K_ATTRIBUTES_BUILD_LABEL');
  for (const line of attributeMath.effectsSummary(attributeMath.buildEffects(state, state.position, state.overall, state.physique, state.attrShape), state.position)) assert(actual.buildText.includes(line), 'K_ATTRIBUTES_BUILD_EFFECT');
  assert.deepEqual(actual.families.map(row => row.label), tree.map(row => row.label), 'K_ATTRIBUTES_ALL_FAMILIES');
  for (let i = 0; i < tree.length; i++) {
    const family = tree[i], row = actual.families[i]; assert.equal(row.value, Math.round(state[family.key]) || 0, 'K_ATTRIBUTES_FAMILY_VALUE');
    assert.deepEqual(row.children.map(child => child.label), family.children.map(child => child.label), 'K_ATTRIBUTES_ALL_CHILDREN');
    for (let j = 0; j < family.children.length; j++) {
      const expected = derived.find(value => value.id === family.children[j].id), child = row.children[j]; assert(expected);
      assert.equal(child.value, expected.value, 'K_ATTRIBUTES_CHILD_VALUE'); assert.equal(child.width, expected.value + '%', 'K_ATTRIBUTES_CHILD_BAR');
      assert.equal(child.delta, expected.frameDelta === 0 ? null : (expected.frameDelta > 0 ? '+' : '') + expected.frameDelta, 'K_ATTRIBUTES_FRAME_DELTA');
    }
  }
}
function attributeValueControl(actual, state) {
  const before = JSON.stringify(actual), copy = clone(actual), child = copy.families[0].children[0], value = child.value;
  child.value = value === 99 ? 98 : value + 1; assert.notEqual(JSON.stringify(copy), before);
  let error; try { validateAttributesSurface(copy, state); } catch (e) { error = e; }
  assert(error instanceof assert.AssertionError); assert.match(error.message, /^K_ATTRIBUTES_CHILD_VALUE/);
  child.value = value; assert.equal(JSON.stringify(copy), before); assert.equal(JSON.stringify(actual), before);
  return { changed: true, owned: { name: error.name, message: error.message }, wholeInverseExact: true, actualHeld: true, scope: 'Copied actual DOM value only.' };
}
async function runSoccerAttributes(p, r, api) {
  const { drain, setMode, held, release, pressReload } = api; let state = r.soccerCreation.created.state, raw = r.soccerCreation.created.raw;
  assert.equal(r.flow, 'sc-current'); assert.equal(r.committed, true); assert.equal(r.allowSave, false); assert.equal(typeof raw, 'string');
  const record = { status: 'incomplete', source: clone(attributeInput), naturalClock: true, naturalBrowserRng: true, captures: [], surfaces: [], navigationBoundaries: [], scope: 'One real current2026 youth career. Existing Full attributes navigation only. No annual/model call, prepared save or synthetic value. Navigation reveal is retained; resolved-arrival and late-after-Back windows are strict. Pending Back is replaced by the leaf Back, so its unmount focus boundary is retained without a persistent-focus claim.' };
  r.attributes = record;
  const open = () => p.getByRole('button', { name: /^Full attributes/ });
  const heading = () => p.getByRole('heading', { name: state.playerName + ', full attributes', exact: true });
  const root = () => heading().locator('..').locator('..');
  const topBack = () => p.getByRole('button', { name: '← Back', exact: true });
  const pending = () => p.getByText('Opening attributes...', { exact: true }).locator('..');
  const evidence = () => ({ documentGETIDs: r.documentRequests.map(row => row.id), frameNavigations: clone(r.navigations) });

  function firstLoadExpected(initial) {
    for (const key of ['frozenOut','badSeasonStreak','story','sponsorBonus','money']) assert(!Object.hasOwn(initial,key),'K_ATTRIBUTES_FRESH_DEFAULT_ABSENT '+key);
    const born=(initial.playerName||'x').split('').reduce((hash,char)=>(hash*31+char.charCodeAt(0))>>>0,7),seed=(born^((initial.seasons?.length??0)*2654435761))>>>0||1;
    const assets=['ladder','bricks','cleats','screens','spark'],map=value=>Object.fromEntries(assets.map(key=>[key,clone(value)]));
    return Object.assign(clone(initial),{frozenOut:0,badSeasonStreak:0,story:[],sponsorBonus:0,money:{seed,vault:0,hold:map(0),cost:map(0),price:map(100),hist:map([100]),log:[],year:0,age:0,won:0,lost:0,cPlays:0,cNet:0,cYear:0,cShut:false,aYear:0,aBest:0,aPlays:0}});
  }
  const fenceKey='dukb-fence:'+r.saveKey;
  function documentLocal(before,expectedRaw) {
    assert.equal(m.sourceBefore['src/lib/saveFence.ts'],'75ac3c8cf136acdb2dae50938cac5ffe522e2db7827f59c453b98b67519d6216','K_ATTRIBUTES_DOCUMENT_FENCE_SOURCE');
    assert.equal(m.sourceBefore['src/pages/SoccerCareer.tsx'],'df3ba374cf6e4faf545d2fbc0c849b6ea936e3cc9ff3939a9f0e91a8655bbfd2','K_ATTRIBUTES_DOCUMENT_SAVE_EFFECT_SOURCE');
    const generation=Number(before.value.local[fenceKey]);assert(Number.isSafeInteger(generation)&&generation>=0&&generation<Number.MAX_SAFE_INTEGER,'K_ATTRIBUTES_DOCUMENT_FENCE_GENERATION');assert.equal(before.value.local[fenceKey],String(generation));
    return {...before.value.local,[r.saveKey]:expectedRaw,[fenceKey]:String(generation+1)};
  }
  function documentSaved(before,after,expectedSession=before.frame.value.session) {
    assert.equal(after.documentGETIDs.length,before.documentGETIDs.length+1,'K_ATTRIBUTES_DOCUMENT_ONE_GET');assert.deepEqual(after.documentGETIDs.slice(0,-1),before.documentGETIDs,'K_ATTRIBUTES_DOCUMENT_GET_PREFIX');
    assert.equal(after.frame.value.careerRaw,before.frame.value.careerRaw,'K_ATTRIBUTES_DOCUMENT_SAVED_LITERAL');assert.deepEqual(after.frame.value.careerState,before.frame.value.careerState);
    assert.deepEqual(after.frame.value.local,documentLocal(before.frame,before.frame.value.careerRaw),'K_ATTRIBUTES_DOCUMENT_ONLY_FENCE_STORAGE');assert.deepEqual(after.frame.value.session,expectedSession);
    assert.equal(after.frame.value.url,before.frame.value.url);assert.equal(after.frame.writeRequests,before.frame.writeRequests);
  }
  function firstLoad(before,after) {
    const expected=firstLoadExpected(before.value.careerState),expectedRaw=references.codec.serializeSoccerCareerSave(expected);
    assert.deepEqual(after.value.careerState,expected,'K_ATTRIBUTES_FIRST_LOAD_EXACT_STATE');assert.equal(after.value.careerRaw,expectedRaw,'K_ATTRIBUTES_FIRST_LOAD_EXACT_BYTES');
    assert.deepEqual(after.value.local,documentLocal(before,expectedRaw),'K_ATTRIBUTES_FIRST_LOAD_ONLY_SAVE_STORAGE');assert.deepEqual(after.value.session,before.value.session);
    assert.equal(after.value.url,before.value.url);assert.equal(after.writeRequests,before.writeRequests);
    return expectedRaw;
  }
  async function capture(label,firstLoadBefore=null) {
    const frame = await sample(p, r, label), network = evidence();
    if(firstLoadBefore){
      assert.equal(record.navigationBoundaries.filter(row=>row.actualDocumentReload===true).length,0);assert.equal(label,'attributes-cold-arrival-document actual restored career');
      assert.equal(firstLoadBefore.value.careerRaw,raw);assert.deepEqual(firstLoadBefore.value.careerState,state);
      for(const [file,hash] of Object.entries({'src/lib/soccerCareerEngine.ts':'f855d1505380bafd563c7b1348d7690af90577f1fea850be0c84d5e4720a9b63','src/lib/soccerMoney.ts':'92addb9c145ad734bc6baa14f233ad055ec9084f4ea21722a4f380e417c713d7','src/lib/careerMoney.ts':'f158b9b831554819766c3820c08b01354b434809436343d75c9b8ec0cc9715a5'}))assert.equal(m.sourceBefore[file],hash,'K_ATTRIBUTES_FIRST_LOAD_SOURCE_OWNER');
      const expectedRaw=firstLoad(firstLoadBefore,frame),original=JSON.stringify(frame),copy=clone(frame),priorSeed=copy.value.careerState.money.seed;
      copy.value.careerState.money.seed=priorSeed===4294967295?1:priorSeed+1;copy.value.careerRaw=references.codec.serializeSoccerCareerSave(copy.value.careerState);copy.value.local[r.saveKey]=copy.value.careerRaw;assert.notEqual(JSON.stringify(copy),original);
      let error;try{firstLoad(firstLoadBefore,copy);}catch(e){error=e;}assert(error instanceof assert.AssertionError);assert.match(error.message,/^K_ATTRIBUTES_FIRST_LOAD_EXACT_STATE/);
      copy.value.careerState.money.seed=priorSeed;copy.value.careerRaw=frame.value.careerRaw;copy.value.local[r.saveKey]=frame.value.local[r.saveKey];assert.equal(JSON.stringify(copy),original);assert.equal(JSON.stringify(frame),original);
      const fenceCopy=clone(frame),actualFence=fenceCopy.value.local[fenceKey];fenceCopy.value.local[fenceKey]=firstLoadBefore.value.local[fenceKey];assert.notEqual(JSON.stringify(fenceCopy),original);
      let fenceError;try{firstLoad(firstLoadBefore,fenceCopy);}catch(e){fenceError=e;}assert(fenceError instanceof assert.AssertionError);assert.match(fenceError.message,/^K_ATTRIBUTES_FIRST_LOAD_ONLY_SAVE_STORAGE/);fenceCopy.value.local[fenceKey]=actualFence;assert.equal(JSON.stringify(fenceCopy),original);assert.equal(JSON.stringify(frame),original);
      record.initialLoadDefaults={before:firstLoadBefore.sequence,after:frame.sequence,originalRaw:raw,restoredRaw:expectedRaw,addedFields:['frozenOut','badSeasonStreak','story','sponsorBonus','money'],allExistingFieldsHeld:true,exactSourceDerivedDefaults:true,scope:'Existing first real load repair and one source-owned mount save/fence write only. No input save rewrite or model call. Every later saved byte remains strict.',control:{changed:true,owned:{name:error.name,message:error.message},wholeInverseExact:true,actualHeld:true},fenceControl:{changed:true,owned:{name:fenceError.name,message:fenceError.message},wholeInverseExact:true,actualHeld:true}};
      state=clone(frame.value.careerState);raw=expectedRaw;
    }
    assert.equal(frame.value.careerRaw, raw, 'K_ATTRIBUTES_EVERY_SAVED_BYTE'); assert.deepEqual(frame.value.careerState, state);
    record.captures.push({ sequence: frame.sequence, label, phase: r.phase, ...network }); return { frame, ...network };
  }
  function saved(before, after) {
    assert.equal(after.frame.value.careerRaw, before.frame.value.careerRaw, 'K_ATTRIBUTES_NAV_SAVED_LITERAL'); assert.deepEqual(after.frame.value.careerState, before.frame.value.careerState);
    assert.deepEqual(after.frame.value.local, before.frame.value.local, 'K_ATTRIBUTES_NAV_ALL_STORAGE'); assert.deepEqual(after.frame.value.session, before.frame.value.session);
    assert.equal(after.frame.value.url, before.frame.value.url); deferPublicReadOnlyBoundary(before.frame,after.frame,'Attributes whole-save boundary');
  }
  function noDocument(before, after) { assert.deepEqual(after.documentGETIDs, before.documentGETIDs, 'K_ATTRIBUTES_NO_DOCUMENT_GET_FOR_LOCAL_VIEW'); }
  async function change(target, label) {
    await prepareControl(p, r, target); const before = await capture(label + ' before');
    await pressPrepared(p, r, target, label);
    for (const suffix of ['immediate', 'raf1', 'raf2']) { if (suffix !== 'immediate') await p.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve))); const next = await capture(label + ' ' + suffix); saved(before, next); noDocument(before, next); }
    await waitForScrollIdle(p); const after = await capture(label + ' revealed'); saved(before, after); noDocument(before, after);
    record.navigationBoundaries.push({ label, before: before.frame.sequence, after: after.frame.sequence, intentionalDocumentRevealRetained: true, focusBefore: before.frame.value.focus, focusAfter: after.frame.value.focus });
    return after;
  }
  async function coldOpen(label) {
    r.phase = label; setMode('hold'); assert.equal(held(), null); const before = await change(open(), label);
    await pending().waitFor({ state: 'visible' }); for (let i = 0; !held() && i < 200; i++) await p.waitForTimeout(25);
    assert(held(), 'K_ATTRIBUTES_REAL_LEAF_REQUEST_HELD'); await drain(true); await prepareControl(p, r, topBack()); await waitForScrollIdle(p);
    const ready = await capture(label + ' pending Back reachable'); saved(before, ready); noDocument(before, ready); validateCard(await cardGeometry(pending()));
    return ready;
  }
  async function surface(label) {
    await heading().waitFor({ state: 'visible' }); await drain(); const before = await capture(label + ' values before read');
    const actual = await heading().evaluate(h => {
      const outer = h.parentElement.parentElement, cards = [...outer.children].filter(n => n.matches('div.bg-card.border'));
      return { heading: h.textContent, html: outer.outerHTML, text: outer.innerText, summary: [...cards[0].children].map(n => n.lastElementChild.innerText), buildText: cards[1].innerText,
        families: cards.slice(2).map(card => ({ label: card.firstElementChild.firstElementChild.textContent, value: Number(card.firstElementChild.lastElementChild.textContent), children: [...card.children].slice(1).map(row => ({ label: row.firstElementChild.textContent, value: Number(row.lastElementChild.textContent), width: row.children[1].firstElementChild.style.width, delta: row.children.length === 4 ? row.children[2].textContent : null })) })) };
    });
    validateAttributesSurface(actual, state); record.valueControl ??= attributeValueControl(actual, state);
    const after = await capture(label + ' values after read'); sameScreen(before.frame, after.frame); noDocument(before, after);
    record.surfaces.push({ label, before: before.frame.sequence, after: after.frame.sequence, actual, scope: 'Every displayed family/derived child/physique/build value compared with the pinned existing pure UI owner. Complete potential-progress DOM is retained, without a new independent potential oracle.' });
    return actual;
  }
  async function reloadSaved(label) {
    r.phase = label; const before = await capture(label + ' committed complete save'), count = r.documentRequests.length, response = await p.reload({ waitUntil: 'load' }); assert.equal(response.status(), 200);
    await open().waitFor({ state: 'visible' }); await idle(p); await drain(); await waitForScrollIdle(p);
    const initialLoad=record.navigationBoundaries.filter(row=>row.actualDocumentReload===true).length===0,after=await capture(label+' actual restored career',initialLoad?before.frame:null);if(!initialLoad)documentSaved(before,after);assert.equal(r.documentRequests.length,count+1,'K_ATTRIBUTES_ONE_RELOAD_DOCUMENT_GET');assert.deepEqual(after.documentGETIDs.slice(0,-1),before.documentGETIDs,'K_ATTRIBUTES_DOCUMENT_GET_PREFIX');
    record.navigationBoundaries.push({ label, before: before.frame.sequence, after: after.frame.sequence, documentGETID: r.documentRequests.at(-1).id, actualDocumentReload: true, wholeSavedLiteralExact: !initialLoad, exactSourceCheckedFirstLoadDefaults: initialLoad });
    return after;
  }
  assert.equal(r.assetBodies.filter(row => row.path === attributesLeaf.file).length, 0, 'K_ATTRIBUTES_NO_EARLY_EXECUTABLE_BODY');
  const committed = await capture('Attributes actual committed prerequisite'); assert.equal(committed.frame.value.careerRaw, raw); record.savedBytesControl = savedBytesControl(committed.frame);
  await coldOpen('attributes-held-back'); await photoBlock(p, r, 'sc-attributes-pending', pending(), topBack());
  await change(topBack(), 'Attributes actual Back while leaf held'); await open().waitFor({ state: 'visible' }); await prepareControl(p, r, open());
  r.phase = 'attributes-late-after-back'; const lateBefore = await capture('Attributes late body before release'), lateWatch = await beginWatch(p);
  release(); await drain(); await p.waitForTimeout(150); const lateAfter = await capture('Attributes late body remains on career');
  sameScreen(lateBefore.frame, lateAfter.frame); noDocument(lateBefore, lateAfter); assert.equal(await heading().count(), 0); validateTrace(await endWatch(p, r, 'Attributes late-after-Back trace', lateWatch), lateBefore.frame, true);
  await reloadSaved('attributes-cold-arrival-document'); const arrival = await coldOpen('attributes-held-arrival'), watch = await beginWatch(p);
  release(); await heading().waitFor({ state: 'visible' }); await drain(); await p.waitForTimeout(150);
  const arrived = await capture('Attributes actual leaf arrival'); sameScreen(arrival.frame, arrived.frame); noDocument(arrival, arrived);
  const trace = await endWatch(p, r, 'Attributes arrival no second document reveal', watch); validateTrace(trace, arrival.frame, false);
  const traceBefore = JSON.stringify(trace), traceCopy = clone(trace), omitted = traceCopy.frames.splice(1, 1)[0]; assert(omitted); assert.notEqual(JSON.stringify(traceCopy), traceBefore);
  let traceError; try { validateTrace(traceCopy, arrival.frame, false); } catch (e) { traceError = e; } assert(traceError instanceof assert.AssertionError); assert.match(traceError.message, /^CM_TEAM_NATIVE_TRACE_COMPLETE/); traceCopy.frames.splice(1, 0, omitted); assert.equal(JSON.stringify(traceCopy), traceBefore); assert.equal(JSON.stringify(trace), traceBefore);
  record.traceControl = { changed: true, owned: { name: traceError.name, message: traceError.message }, wholeInverseExact: true, actualHeld: true };
  await surface('Attributes cold full values'); const families = root().locator(':scope > div.bg-card.border'); assert.equal(await families.count(), attributeMath.attrTreeFor(state.position).length + 2);
  await photoBlock(p, r, 'sc-attributes-first', families.nth(2), topBack()); await photoBlock(p, r, 'sc-attributes-last', families.last(), p.getByRole('button', { name: 'Back to your career', exact: true }));
  await change(p.getByRole('button', { name: 'Back to your career', exact: true }), 'Attributes actual full-screen Back');
  r.phase = 'attributes-warm'; const attempts = r.attributeAttempts.length; await change(open(), 'Attributes actual warm Full attributes'); await surface('Attributes warm full values'); assert.equal(r.attributeAttempts.length, attempts, 'K_ATTRIBUTES_WARM_NO_NEW_LEAF_REQUEST');
  await photoBlock(p, r, 'sc-attributes-warm', root().locator(':scope > div.bg-card.border').nth(2), topBack()); await change(topBack(), 'Attributes warm Back');
  await reloadSaved('attributes-failure-fresh-document'); setMode('refuse'); r.phase = 'attributes-refusal-first';
  const refusal = await capture('Attributes verified save before actual first refusal'), firstDocuments = r.documentRequests.length; assert.equal(refusal.frame.value.session[STALE], undefined);
  await pressReload(open(), 'Attributes first real refused leaf'); await open().waitFor({ state: 'visible' }); await drain();
  const automatic = await capture('Attributes actual first-refusal automatic reload'); assert.equal(r.documentRequests.length, firstDocuments + 1); documentSaved(refusal,automatic,{...refusal.frame.value.session,[STALE]:'1'}); assert.deepEqual(automatic.frame.value.session, { ...refusal.frame.value.session, [STALE]: '1' });
  r.phase = 'attributes-refusal-second'; const second = await capture('Attributes before second real refused leaf'), secondDocuments = r.documentRequests.length;
  await change(open(), 'Attributes second real refused leaf'); const dialog = p.getByRole('dialog', { name: 'attributes', exact: true }); await dialog.waitFor({ state: 'visible' }); await drain();
  const failed = await capture('Attributes existing CentreMountBoundary'); saved(second, failed); noDocument(second, failed); assert.equal(r.documentRequests.length, secondDocuments);
  await photoBlock(p, r, 'sc-attributes-refused', dialog, dialog.getByRole('button', { name: /Retry/ }));
  setMode('allow'); r.phase = 'attributes-refusal-user-retry'; const retry = await capture('Attributes verified save before real Retry');
  await pressReload(dialog.getByRole('button', { name: /Retry/ }), 'Attributes existing saved-career Retry'); await open().waitFor({ state: 'visible' }); await drain();
  const recovered = await capture('Attributes real Retry document and complete save'); documentSaved(retry, recovered); assert.equal(r.documentRequests.length, secondDocuments + 1);
  r.phase = 'attributes-recovered'; await change(open(), 'Attributes actual recovered Full attributes'); await surface('Attributes recovered full values');
  await photoBlock(p, r, 'sc-attributes-recovered', root().locator(':scope > div.bg-card.border').nth(2), topBack()); await change(topBack(), 'Attributes recovered Back');
  await drain(); validateAssets(r);
  const complete = await capture('Attributes complete saved career returned'); assert.equal(r.attributeAttempts.filter(row => row.mode === 'hold').length, 2); assert.equal(r.attributeAttempts.filter(row => row.mode === 'refuse').length, 2);
  assert.equal(r.documentRequests.length, committed.documentGETIDs.length + 4, 'K_ATTRIBUTES_EXACT_FOUR_EXTRA_DOCUMENT_GETS');
  const successful = r.assetBodies.find(row => row.path === attributesLeaf.file); assert(successful, 'K_ATTRIBUTES_ACTUAL_EXECUTED_BODY'); assert.equal(successful.sha256, attributesLeaf.sha256); assert.equal(successful.bytes, attributesLeaf.bytes);
  const original = JSON.stringify(r.assetBodies), copied = { ...r, assetBodies: clone(r.assetBodies) }, at = copied.assetBodies.findIndex(row => row.id === successful.id);
  const [removed] = copied.assetBodies.splice(at, 1); assert.notEqual(JSON.stringify(copied.assetBodies), original);
  let bodyError; try { validateAssets(copied); } catch (e) { bodyError = e; } assert(bodyError instanceof assert.AssertionError); assert.match(bodyError.message, /^CM_TEAM_NATIVE_BODY_RECEIPT/);
  copied.assetBodies.splice(at, 0, removed); assert.equal(JSON.stringify(copied.assetBodies), original); assert.equal(JSON.stringify(r.assetBodies), original);
  record.bodyControl = { changed: true, omitted: clone(successful), owned: { name: bodyError.name, message: bodyError.message }, wholeInverseExact: true, actualHeld: true, scope: 'Copied actual attributed response row only.' };
  const completeBefore = JSON.stringify(complete), documentCopy = clone(complete); documentCopy.documentGETIDs.push(r.documentRequests[0].id); assert.notEqual(JSON.stringify(documentCopy), completeBefore);
  let documentError; try { noDocument(complete, documentCopy); } catch (e) { documentError = e; } assert(documentError instanceof assert.AssertionError); assert.match(documentError.message, /^K_ATTRIBUTES_NO_DOCUMENT_GET_FOR_LOCAL_VIEW/);
  documentCopy.documentGETIDs.pop(); assert.equal(JSON.stringify(documentCopy), completeBefore); assert.equal(JSON.stringify(complete), completeBefore);
  record.documentWindowControl = { changed: true, actualCopiedDocumentID: r.documentRequests[0].id, owned: { name: documentError.name, message: documentError.message }, wholeInverseExact: true, actualHeld: true, scope: 'Copied actual GET-ID window metadata only. Every raw frame-navigation event remains retained separately.' };
  record.completeFrame = complete.frame.sequence; record.status = 'ATTRIBUTES_ACTUAL_HELD_LATE_COLD_WARM_REFUSED_RETRY_PASSED';
}

async function runSoccerCreation(p,r,api){
 const {flow,sample,press,photoBlock,drain,navigate,prepareControl,touchReach,idle,references,ordinary,oldFour}=api;
 assert(flow==='sc-current'||flow==='sc-historical');
 assert.equal(r.saveKey,'soccerCareerSave');assert.equal(r.allowSave,false);
 assert.equal(ordinary.length,11);assert.equal(new Set(ordinary).size,11);assert.equal(oldFour.length,4);
 const current=flow==='sc-current',expected= current?ordinary:oldFour;
 const expectedEra=current?'2026':'2005-09',expectedYear=current?2026:2005;
 const playerName=current?'Native K Current Tester':'Native K Historical Tester';
 const codec=references.codec;assert.equal(typeof codec.parseSoccerCareerSave,'function');assert.equal(typeof codec.serializeSoccerCareerSave,'function');assert.equal(typeof codec.isSoccerCareerSave,'function');
 const record={flow,naturalClock:true,naturalBrowserRng:true,expectedEra,expectedYear,steps:[],scope:'Actual creation controls and natural academy selection only. No forced club, model callback, annual progression, private RNG observation or fabricated save.'};
 r.soccerCreation=record;
async function typeInto(p,r,target,value,label){
 await prepareControl(p,r,target);if(r.width<768)await target.tap();
 await p.keyboard.press('ControlOrMeta+A');await p.keyboard.type(value);await p.keyboard.press('Tab');await idle(p);
 r.actions.push({type:'real-text-entry',actor:r.actor,label,value});
}
async function reachNationalityOption(label){
 const measure=()=>label.evaluate(node=>{const option=node.closest('[role="option"]'),viewport=option?.closest('[data-radix-select-viewport]');if(!option||!viewport)throw new Error('Actual nationality option scroll owner missing');const options=[...viewport.querySelectorAll('[role="option"]')];return{optionCount:options.length,targetIndex:options.indexOf(option),scrollTop:viewport.scrollTop,scrollHeight:viewport.scrollHeight,clientHeight:viewport.clientHeight,optionHeight:option.getBoundingClientRect().height};});
 const initial=await measure();assert(initial.optionCount>0&&initial.targetIndex>=0&&initial.clientHeight>48&&initial.scrollHeight>=initial.clientHeight,'K_SC_NATIONALITY_ACTUAL_SCROLL_EXTENT');
 const limit=initial.optionCount+Math.ceil(initial.scrollHeight/initial.clientHeight)+2;
 const run={initial,attemptLimit:limit,samples:[],status:'preparing',scope:'Nationality-option-only real touch preparation. Bound derives from actual DOM option census plus complete scroll pages. Generic20 touch reach and final geometry guard are unchanged.'};
 record.nationalityReach=run;const session=await p.context().newCDPSession(p);
 try{
  for(let attempt=0;attempt<limit;attempt++){
   const box=await targetGeometry(label),before=await measure(),row={attempt,box,before};run.samples.push(row);
   const t=box.target,g=box.clip;if(t.y>=g.y+4&&t.bottom<=g.bottom-4&&t.x>=g.x&&t.right<=Math.min(g.right,r.width)){row.alreadyReached=true;break;}
   assert(g.bottom-g.y>48&&g.right-g.x>48,'A real touch scroll surface is visible');
   const down=t.bottom>g.bottom-4,x=(g.x+g.right)/2,start=down?g.bottom-20:g.y+20;
   const end=down?Math.max(g.y+20,start-Math.min(360,(g.bottom-g.y)*.65)):Math.min(g.bottom-20,start+Math.min(360,(g.bottom-g.y)*.65));
   await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:start,radiusX:1,radiusY:1,force:1,id:1}]});
   for(let step=1;step<=10;step++){await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:start+(end-start)*step/10,radiusX:1,radiusY:1,force:1,id:1}]});await p.waitForTimeout(25);}
   await p.waitForTimeout(120);await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await idle(p);
   row.after=await measure();row.afterBox=await targetGeometry(label);
  }
 }finally{await session.detach();run.final={box:await targetGeometry(label),scroll:await measure()};run.status='final-geometry-retained';}
 validateTouchGeometry(run.final.box,r.width);run.status='passed';r.touchReachControl??=copiedTouchGeometryControl(run.final.box,r.width);
 r.actions.push({type:'trusted-touch-nationality-scroll-preparation',attempts:run.samples.length,attemptLimit:limit,reached:run.final.box});
}
async function selectOption(p,r,index,text){
 const trigger=p.getByRole('combobox').nth(index);await press(p,r,trigger,'Open actual creation picker '+index);
 const list=p.getByRole('listbox');await list.waitFor({state:'visible'});assert.equal(await list.count(),1);
 const target=list.getByRole('option',index===0?{name:/^South Korea(?:\s+South Korea)?$/}:{name:text,exact:true});await target.waitFor({state:'visible'});assert.equal(await target.count(),1);
 if(r.width<768){const label=target.locator(':scope > span').last();assert.equal(await label.count(),1);assert((await label.innerText()).includes(text));if(index===0)await reachNationalityOption(label);else await touchReach(p,r,label);await label.tap();}
 else{const wanted=await target.evaluate(n=>[...n.closest('[role="listbox"]').querySelectorAll('[role="option"]')].indexOf(n));assert(wanted>=0);await p.keyboard.press('Home');await idle(p);for(let i=0;i<wanted;i++){await p.keyboard.press('ArrowDown');await idle(p);}await p.waitForFunction(n=>n===document.activeElement||n.contains(document.activeElement),await target.elementHandle());await p.keyboard.press('Enter');}
 await idle(p);assert((await trigger.innerText()).includes(text));r.actions.push({type:'real-select',actor:r.actor,index,text});
}

 async function capture(label){await drain();const value=await sample(p,r,label);record.steps.push({label,sample:value});return value;}
 async function noSave(label){const value=await capture(label);assert.equal(value.value.careerRaw,null,'K_LEAGUE_NATIVE_SC_PREVIEW_NO_SAVE');return value;}
 await navigate('/soccer-career');await noSave(flow+' empty creation');
 await typeInto(p,r,p.getByPlaceholder('Enter your player name...'),playerName,'Actual K player name');await noSave(flow+' named');
 await selectOption(p,r,0,'South Korea');await noSave(flow+' South Korea selected');
 await selectOption(p,r,1,'Central Mid (CM)');await noSave(flow+' CM selected');
 await selectOption(p,r,2,current?'Current era (2026 start)':'Late 2000s (2005 start)');await noSave(flow+' era selected');
 await press(p,r,p.getByRole('button',{name:/Generate Starting Potential|Roll again/}),'Actual natural K starting roll');
 const customize=p.getByRole('button',{name:/Customize your build/});
 await customize.waitFor({state:'visible'});assert.equal(await customize.count(),1);await idle(p);
 await noSave(flow+' natural roll completed');
 await press(p,r,customize,'Open actual build editor for domestic academy request');
 const overall=p.getByRole('textbox',{name:'Starting overall',exact:true});
 await overall.waitFor({state:'visible'});assert.equal(await overall.count(),1);
 let value=Number(await overall.inputValue());assert(Number.isInteger(value)&&value>=40&&value<=99);
 record.naturalRolledOverall=value;record.overallSteps=[];
 for(let count=0;value!==50;count++){
  assert(count<60,'Source-bounded overall step count');
  const delta=value>50?(value-50>=5?-5:-1):(50-value>=5?5:1);
  const direction=delta<0?'down':'up',size=Math.abs(delta),before=await noSave(flow+' overall before '+count);
  await press(p,r,p.getByRole('button',{name:'Starting overall '+direction+' '+size,exact:true}),'Actual Starting overall '+direction+' '+size);
  const actual=Number(await overall.inputValue());assert.equal(actual,value+delta,'K_LEAGUE_NATIVE_SC_REAL_STEPPER_VALUE');
  const after=await noSave(flow+' overall after '+count);record.overallSteps.push({beforeValue:value,delta,afterValue:actual,before,after});value=actual;
 }
 assert.equal(await overall.inputValue(),'50');
 const lock=p.getByRole('button',{name:/Lock in build/});assert.equal(await lock.count(),1);assert.equal(await lock.isEnabled(),true);
 await press(p,r,lock,'Actual Lock in build at50');
 const begin=p.getByRole('button',{name:/Begin Career/});await begin.waitFor({state:'visible'});
 await p.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>/Begin Career/.test(b.textContent)&&!b.disabled));
 const stats=p.getByRole('heading',{name:'Starting Stats',exact:true}).locator('..');assert.equal(await stats.count(),1);
 assert.equal((await stats.locator(':scope > span').innerText()).trim(),'50','K_LEAGUE_NATIVE_SC_LOCKED_OVERALL');
 const academy=p.getByText('Academy Placement',{exact:true}).locator('..');await academy.waitFor({state:'visible'});assert.equal(await academy.count(),1);
 const nameElement=academy.locator('div.font-bold.text-sm.flex.items-center.gap-1');assert.equal(await nameElement.count(),1,'K_LEAGUE_NATIVE_SC_ACADEMY_NAME_OWNER');
 const nameReadout=await nameElement.evaluate(node=>({directText:[...node.childNodes].filter(child=>child.nodeType===Node.TEXT_NODE).map(child=>child.textContent).join('').trim(),children:[...node.children].map(child=>({tag:child.tagName,html:child.outerHTML,flagAlts:[...child.querySelectorAll('img')].map(img=>img.alt)})),html:node.outerHTML,fullText:node.textContent}));
 assert.equal(nameReadout.children.length,1,'K_LEAGUE_NATIVE_SC_ONLY_FLAG_CHILD_EXCLUDED');assert.equal(nameReadout.children[0].tag,'SPAN');assert.deepEqual(nameReadout.children[0].flagAlts,['South Korea']);
 const matches=expected.filter(name=>nameReadout.directText===name+' Youth');assert.equal(matches.length,1,'K_LEAGUE_NATIVE_SC_ELIGIBLE_ACADEMY');
 const chosen=matches[0];assert(references.clubs.some(row=>row.name===chosen));
 for(const row of references.clubs)if(row.accessHeld||!expected.includes(row.name))assert.notEqual(nameReadout.directText,row.name+' Youth','K_LEAGUE_NATIVE_SC_NO_HELD_OR_FUTURE_ACADEMY');
 record.preview={name:chosen,allEligible:expected.slice(),nameReadout,fullText:await academy.innerText(),snapshot:await noSave(flow+' actual50 academy preview')};
 await photoBlock(p,r,current?'sc-current-academy':'sc-historical-academy',academy,begin);
 await noSave(flow+' academy photo complete');
 if(!current){record.status='ACTUAL_HISTORICAL_PREVIEW_PASSED_NO_CAREER_COMMIT';return record;}
 r.allowSave=true;
 await press(p,r,begin,'Actual current K Begin Career');
 await p.waitForFunction(key=>localStorage.getItem(key)!==null,r.saveKey);await idle(p);
 const created=await capture(flow+' actual youth committed'),raw=created.value.careerRaw;
 assert.equal(typeof raw,'string');const state=codec.parseSoccerCareerSave(raw);assert(codec.isSoccerCareerSave(state));
 assert.deepEqual(state,created.value.careerState);assert.equal(codec.serializeSoccerCareerSave(state),raw,'K_LEAGUE_NATIVE_SC_COMPLETE_CODEC');
 assert.equal(state.playerName,playerName);assert.equal(state.nationality,'South Korea');assert.equal(state.position,'CM');
 assert.equal(state.era,expectedEra);assert.equal(state.phase,'youth');assert.equal(state.seasons.length,1);assert.equal(state.seasons[0].year,expectedYear);
 assert.equal(state.overall,50);assert.equal(state.academyClubName,chosen);assert.equal(state.currentClub,chosen+' Youth','K_LEAGUE_NATIVE_SC_PREVIEW_BEGIN_IDENTITY');
 assert.equal(state.currentClubCountry,'South Korea');assert(ordinary.includes(state.academyClubName));
 record.created={sample:created,raw,state};r.allowSave=false;
 const youth=p.locator('div.bg-card.border.border-border.rounded-xl.p-4.flex.items-center.gap-4').filter({has:p.getByText('Youth Academy',{exact:true})});await youth.waitFor({state:'visible'});assert.equal(await youth.count(),1);
 const youthClub=youth.locator(':scope > div.flex-1.min-w-0 > div.font-bold');assert.equal(await youthClub.count(),1,'K_LEAGUE_NATIVE_SC_CURRENT_CLUB_OWNER');assert.equal(await youthClub.evaluate(node=>[...node.childNodes].filter(child=>child.nodeType===Node.TEXT_NODE).map(child=>child.textContent).join('').trim()),chosen+' Youth','K_LEAGUE_NATIVE_SC_CURRENT_CLUB_IDENTITY');
 await photoBlock(p,r,'sc-current-youth',youth,p.getByRole('button',{name:'Open your phone',exact:true}));
 const after=await capture(flow+' youth photo complete');assert.equal(after.value.careerRaw,raw);assert.deepEqual(after.value.careerState,state);
 record.status='ACTUAL_CURRENT_PREVIEW_AND_YOUTH_PASSED';return record;
}

const browser = await chromium.launch({ headless: true });
const photoLabels = {
 cm:['cm-world-pending-parent-back','cm-world-ready-tile','cm-held-parent-back','cm-team-first','cm-team-last','cm-fixed-selection-footer','cm-manager-back','cm-fresh-hub','cm-generated-squad','cm-table-first','cm-table-last','cm-korea-cup','cm-reloaded-hub','cm-header-pending-managers','cm-header-ready-summary','cm-header-refused','cm-tabs-pending-managers','cm-tabs-ready-list','cm-tabs-refused'],
 'sc-current':['sc-current-academy','sc-current-youth','sc-attributes-pending','sc-attributes-first','sc-attributes-last','sc-attributes-warm','sc-attributes-refused','sc-attributes-recovered'],
 'sc-historical':['sc-historical-academy']
};
function validatePhotoCensus(r){assert.deepEqual(r.photos.map(row=>row.label),photoLabels[r.flow],'K_NATIVE_COMPLETE_REQUESTED_PHOTOS');}
function photoOmissionControl(r){
 const before=JSON.stringify(r.photos),copy={flow:r.flow,photos:clone(r.photos)},removed=copy.photos.pop();assert(removed);assert.notEqual(JSON.stringify(copy.photos),before);
 let error;try{validatePhotoCensus(copy);}catch(e){error=e;}assert(error instanceof assert.AssertionError);assert.match(error.message,/^K_NATIVE_COMPLETE_REQUESTED_PHOTOS/);copy.photos.push(removed);assert.equal(JSON.stringify(copy.photos),before);assert.equal(JSON.stringify(r.photos),before);
 return{removed:removed.label,changed:true,name:error.name,message:error.message,wholeInverseExact:true,actualHeld:true};
}

const CM_FIRST_LOAD_BLOCKS={
  "facilities": {
    "v": 1,
    "stadium": 1,
    "trainingGround": 1,
    "medical": 1,
    "dressingRoom": 1,
    "seasonSpend": 0
  },
  "books": {
    "v": 1,
    "concessionTier": 1,
    "fanMood": 50,
    "season": {
      "weeks": 0,
      "homeGames": 0,
      "awayTrips": 0,
      "tickets": 0,
      "concessions": 0,
      "sponsor": 0,
      "playerWages": 0,
      "staffWages": 0,
      "travel": 0,
      "shirts": {
        "v": 1,
        "weeks": 0,
        "openingPence": 0,
        "grossPence": 0,
        "costPence": 0,
        "paidPence": 0
      }
    },
    "lastSeason": null,
    "pushed": {},
    "walked": []
  },
  "staff": {
    "v": 1,
    "attack": {
      "id": "st-b67v6b",
      "name": "Caspar Falkner",
      "level": 1,
      "potential": 2,
      "wage": 5,
      "since": 1,
      "academy": false
    },
    "defence": {
      "id": "st-1kn4jvx",
      "name": "Hendrik Bertelsen",
      "level": 1,
      "potential": 3,
      "wage": 5,
      "since": 1,
      "academy": false
    },
    "goalkeeping": {
      "id": "st-14ak425",
      "name": "Nedim Eeckhout",
      "level": 1,
      "potential": 3,
      "wage": 5,
      "since": 1,
      "academy": false
    },
    "scout": {
      "id": "st-qp2vrq",
      "name": "Idris Hollander",
      "level": 1,
      "potential": 1,
      "wage": 5,
      "since": 1,
      "academy": false
    },
    "poach": null,
    "matchesLeft": 2,
    "hires": 0,
    "seasonSpend": 0
  },
  "managerXp": {
    "v": 1,
    "xp": 0,
    "points": {
      "tactics": 0,
      "recruitment": 0,
      "negotiation": 0,
      "youth": 0,
      "manManagement": 0,
      "finance": 0,
      "media": 0
    }
  },
  "startOptions": {
    "v": 1,
    "currency": "GBP",
    "nationJobs": true,
    "strictness": 3
  }
};
function cmFirstLoadSavedInput(value){
 const state=value.careerState;assert.equal(state.clubName,'Gangwon FC');assert.equal(state.eraId,'now');assert.equal(state.season,1);assert.equal(state.startYear,2026);assert.equal(state.week,0);assert.equal(state.budget,8);assert.equal(state.manager,undefined);assert.equal(state.finance,undefined);assert.equal(Object.keys(state).length,66);
 for(const key of Object.keys(CM_FIRST_LOAD_BLOCKS))assert(!Object.hasOwn(state,key),'K_CM_FIRST_LOAD_DEFAULT_ABSENT '+key);
 for(const [file,hash]of Object.entries({'src/lib/clubManager.ts':'cb709aa22ac9d0ce58e80a2b192c366d86a4fdf61cda8d112be2c223fb12ccfc','src/lib/clubManagerFacilities.ts':'4c9fe7ab744b099f4659f0171724395723fc51b3d4cd01c90a9617d86972ac2c','src/lib/clubManagerFinances.ts':'4d897be5eacbc45b715ed175ec24bbfe3ad5c7115166a275bcc6b3c69bab5233','src/lib/clubManagerStaff.ts':'7b6ce706f968a168f2f06b006bb27964911aa222d1c5ccd6d9304724ed59fdbf','src/lib/gmStaff.ts':'2fa3c824f86850a38da9bd6e0ccd1520a827cb0bceb4b9c98c07066eb6b12ba3','src/lib/clubManagerXp.ts':'5c1ca7124b93c7451644a9c421d4bd1fd37827820fecbf092ed60ce470ce5b26','src/lib/clubManagerStart.ts':'930288f04d6cb1a880eb70948472f2452fafdab4af1c519cd189af8cfa76f0ad'}))assert.equal(m.sourceBefore[file],hash,'K_CM_FIRST_LOAD_SOURCE_OWNER');
 assert.equal(typeof value.careerRaw,'string');assert.equal(value.careerRaw.at(-1),'}');assert.deepEqual(JSON.parse(value.careerRaw),state);
 const expectedState=Object.assign(clone(state),clone(CM_FIRST_LOAD_BLOCKS)),expectedRaw=value.careerRaw.slice(0,-1)+','+JSON.stringify(CM_FIRST_LOAD_BLOCKS).slice(1);assert.equal(JSON.stringify(expectedState),expectedRaw,'K_CM_FIRST_LOAD_CANONICAL_APPEND');
 return{careerRaw:expectedRaw,careerState:expectedState};
}
function validateCMFirstLoad(before,after){
 const expected=cmFirstLoadSavedInput(before.value);assert.deepEqual(after.value.careerState,expected.careerState,'K_CM_FIRST_LOAD_EXACT_STATE');assert.equal(after.value.careerRaw,expected.careerRaw,'K_CM_FIRST_LOAD_EXACT_BYTES');return expected;
}
function cmFirstLoadControls(before,actual){
 const original=JSON.stringify(actual),controls=[];
 for(const field of ['existing-budget','added-staff-wage']){
  const copy=clone(actual);if(field==='existing-budget')copy.value.careerState.budget+=1;else copy.value.careerState.staff.attack.wage+=1;
  copy.value.careerRaw=JSON.stringify(copy.value.careerState);copy.value.local['dukb-club-manager-save']=copy.value.careerRaw;assert.notEqual(JSON.stringify(copy),original);
  let error;try{validateCMFirstLoad(before,copy);}catch(e){error=e;}assert(error instanceof assert.AssertionError);assert.match(error.message,/^K_CM_FIRST_LOAD_EXACT_STATE/);
  if(field==='existing-budget')copy.value.careerState.budget=actual.value.careerState.budget;else copy.value.careerState.staff.attack.wage=actual.value.careerState.staff.attack.wage;
  copy.value.careerRaw=actual.value.careerRaw;copy.value.local['dukb-club-manager-save']=actual.value.local['dukb-club-manager-save'];assert.equal(JSON.stringify(copy),original);assert.equal(JSON.stringify(actual),original);
  controls.push({field,changed:true,owned:{name:error.name,message:error.message},wholeInverseExact:true,actualHeld:true});
 }
 return controls;
}
function cmOverviewSavedReference(r){
 const baseline=r.cmOverview.baseline,projection=r.cmOverview.firstLoadSavedInput;assert(projection,'K_CM_OVERVIEW_SOURCE_LOAD_PROJECTION');assert.equal(projection.originalRaw,baseline.frame.value.careerRaw);
 const expected=cmFirstLoadSavedInput(baseline.frame.value);assert.equal(projection.careerRaw,expected.careerRaw);assert.deepEqual(projection.careerState,expected.careerState);
 return{frame:{value:expected},rows:baseline.rows,fixture:baseline.fixture,census:baseline.census};
}
async function captureCMOverview(p,r,label,sample){
 const frame=await sample(p,r,label);
 assert.equal(typeof frame.value.careerRaw,'string','K_CM_OVERVIEW_FULL_SAVED_INPUT');
 const state=frame.value.careerState;assert(state&&typeof state==='object');
 assert(Array.isArray(state.trophies),'K_CM_OVERVIEW_REAL_TROPHY_ARRAY');
 assert.deepEqual(JSON.parse(frame.value.careerRaw),state,'K_CM_OVERVIEW_COMPLETE_CODEC');
 const actual=await p.evaluate(key=>{
  const text=n=>n?.textContent?.trim()??null;
  const board=[...document.querySelectorAll('button')].filter(n=>{
   const c=[...n.children];return c.length>=3&&c.length<=4&&c[0].tagName==='DIV'&&c[1].tagName==='DIV'&&c[2].tagName==='DIV'&&text(c[1])==='Board'&&c[0].firstElementChild?.tagName==='SPAN';
  });
  if(board.length!==1)throw Error('K_CM_OVERVIEW_UNIQUE_REAL_BOARD_TILE');
  const grid=board[0].parentElement;if(!grid)throw Error('K_CM_OVERVIEW_ACTUAL_GRID_OWNER');
  const rows=[...grid.children].map(n=>{
   if(n.tagName!=='BUTTON')throw Error('K_CM_OVERVIEW_DIRECT_BUTTON_ROWS');
   const c=[...n.children];if(c.length<3||c.length>4||c.some(x=>x.tagName!=='DIV')||c[0].firstElementChild?.tagName!=='SPAN')throw Error('K_CM_OVERVIEW_ACTUAL_HUBTILE_SHAPE');
   return{icon:text(c[0].firstElementChild),title:text(c[1]),value:text(c[2]),sub:c.length===4?text(c[3]):null,html:n.outerHTML,text:n.innerText};
  });
  const panel=grid.closest('[role="tabpanel"]');if(!panel)throw Error('K_CM_OVERVIEW_ACTUAL_HOME_PANEL');
  const cards=[...panel.querySelectorAll('div.bg-card.border.border-border.rounded-2xl.p-4.text-center')];
  if(cards.length!==1)throw Error('K_CM_OVERVIEW_SOURCE_OWNED_FIXTURE_CARD');
  const card=cards[0],matches=[...card.querySelectorAll('[data-cm-next-match]')],buttons=[...card.querySelectorAll('button')];
  const window=buttons.filter(n=>text(n)==='Open the Window'),season=buttons.filter(n=>text(n)==='See Season Review');
  if(matches.length>1||window.length>1||season.length>1||Number(matches.length>0)+Number(window.length>0)+Number(season.length>0)>1)throw Error('K_CM_OVERVIEW_ONE_ACTUAL_FIXTURE_KIND');
  const fixture={kind:matches.length?'match':window.length?'window':season.length?'season':'none',html:card.outerHTML,text:card.innerText,
   match:matches.length?{html:matches[0].outerHTML,text:matches[0].innerText,sides:[...matches[0].querySelectorAll('[data-cm-next-side]')].map(n=>({side:n.getAttribute('data-cm-next-side'),text:text(n),html:n.outerHTML}))}:null,
   buttons:buttons.map(n=>({text:text(n),disabled:n.disabled,html:n.outerHTML,way:n.getAttribute('data-cm-way'),shootout:n.getAttribute('data-cm-shootout-link')}))};
  return{rows,fixture,raw:localStorage.getItem(key)};
 },r.saveKey);
 assert.equal(actual.raw,frame.value.careerRaw,'K_CM_OVERVIEW_CAPTURE_SAME_COMPLETE_SAVE');
 const allTitles=['Board','Inbox','Calendar','League','Cups','Stats','Finances','Facilities','Staff','Skills','Options','Save points','Manager','Treatment','Rival watch','Press room','Dressing room','Academy','Training','Market','Cabinet'];
 const cabinetExpected=state.trophies.length>0,expectedTitles=cabinetExpected?allTitles:allTitles.slice(0,-1),observedTitles=actual.rows.map(row=>row.title);
 assert.deepEqual(observedTitles,expectedTitles,'K_CM_OVERVIEW_ACTUAL_ROLE_CENSUS');
 const census={sourceRoles:21,expectedVisible:expectedTitles.length,observedVisible:actual.rows.length,allTitles,expectedTitles,observedTitles,
  cabinet:{expected:cabinetExpected,actual:observedTitles.includes('Cabinet'),actualSavedTrophies:state.trophies.length,absenceExplicit:!cabinetExpected},
  fixtureKind:actual.fixture.kind,scope:'Actual unchanged full save and source-owned Home DOM only. No model import, formula replay, forced trophy, action or new photo.'};
 return{frame,rows:actual.rows,fixture:actual.fixture,census};
}
function assertCMOverview(reference,actual){
 assert.equal(actual.frame.value.careerRaw,reference.frame.value.careerRaw,'K_CM_OVERVIEW_COMPLETE_SAVED_LITERAL');
 assert.deepEqual(actual.frame.value.careerState,reference.frame.value.careerState,'K_CM_OVERVIEW_COMPLETE_SAVED_STATE');
 assert.deepEqual(actual.rows,reference.rows,'K_CM_OVERVIEW_COMPLETE_ACTUAL_ROWS');
 assert.deepEqual(actual.fixture,reference.fixture,'K_CM_OVERVIEW_COMPLETE_ACTUAL_FIXTURE');
 assert.deepEqual(actual.census,reference.census,'K_CM_OVERVIEW_COMPLETE_ACTUAL_CENSUS');
}
function cmOverviewCopiedControls(reference){
 const original=JSON.stringify(reference),copy=JSON.parse(original);assert(copy.rows.length>0);assert.equal(typeof copy.rows[0].value,'string');
 const value=copy.rows[0].value;copy.rows[0].value=value+'\u0000copied-wrong-value';assert.notEqual(JSON.stringify(copy),original);
 let valueOwned;try{assertCMOverview(reference,copy);}catch(error){valueOwned=error;}
 assert(valueOwned instanceof assert.AssertionError);assert.match(valueOwned.message,/^K_CM_OVERVIEW_COMPLETE_ACTUAL_ROWS/);
 copy.rows[0].value=value;assert.equal(JSON.stringify(copy),original);
 const at=copy.rows.length-1,[removed]=copy.rows.splice(at,1);assert.notEqual(JSON.stringify(copy),original);
 let omissionOwned;try{assertCMOverview(reference,copy);}catch(error){omissionOwned=error;}
 assert(omissionOwned instanceof assert.AssertionError);assert.match(omissionOwned.message,/^K_CM_OVERVIEW_COMPLETE_ACTUAL_ROWS/);
 copy.rows.splice(at,0,removed);assert.equal(JSON.stringify(copy),original);assert.equal(JSON.stringify(reference),original);assertCMOverview(reference,copy);
 return{valueMutation:{changed:true,owned:{name:valueOwned.name,message:valueOwned.message}},rowOmission:{changed:true,owned:{name:omissionOwned.name,message:omissionOwned.message}},wholeInverseExact:true,actualHeld:true,
  scope:'Two copied actual DOM/reference guard controls only. No physical cold/network fault or fabricated trophy credit. Complete original and restored reference bodies retained by caller.'};
}

function validateCMColdTranscript(r){
 assert.equal(r.cmCold.status,'passed','K_CM_COLD_COMPLETE_STATUS');
 assert.deepEqual(r.cmCold.arrival.map(v=>v.role),['deferredViews','deferredViews','tabs'],'K_CM_COLD_COMPLETE_ARRIVAL_ROLES');
 assert.deepEqual(r.cmCold.late.map(v=>v.role),['deferredViews','deferredViews','tabs'],'K_CM_COLD_COMPLETE_LATE_ROLES');
 assert.deepEqual(r.cmCold.warm.map(v=>v.role),['deferredViews','deferredViews','tabs'],'K_CM_COLD_COMPLETE_WARM_ROLES');
 assert.deepEqual(r.cmCold.recovery.map(v=>v.role),['deferredViews','tabs'],'K_CM_COLD_COMPLETE_RECOVERY_ROLES');
 const receipts=[];
 for(const role of ['deferredViews','tabs']){
  const attempts=r.cmColdAttempts.filter(v=>v.role===role);assert(attempts.some(v=>v.mode==='hold'));assert.equal(attempts.filter(v=>v.mode==='refuse').length,1,'K_CM_COLD_ACTUAL_REFUSAL_CENSUS');
  for(const attempt of attempts){
   const bodies=r.assetBodies.filter(v=>v.id===attempt.id&&v.path===cmOwners[role].file);
   if(attempt.mode==='refuse'){assert.equal(bodies.length,0);assert(r.aborts.some(v=>v.id===attempt.id&&v.role===role&&v.method==='GET'&&v.reason==='actual refused CM '+role+' control'),'K_CM_COLD_PHYSICAL_REFUSAL');}
   else{assert.equal(bodies.length,1,'K_CM_COLD_BODY_RECEIPT');assert.equal(bodies[0].bytes,cmOwners[role].bytes);assert.equal(bodies[0].sha256,cmOwners[role].sha256);if(attempt.mode==='hold')assert.equal(typeof attempt.releasedAt,'number');receipts.push({role,id:attempt.id,body:clone(bodies[0])});}
  }
 }
 assert(r.cmOverview.baseline&&r.cmOverview.reads.length>=8,'K_CM_COLD_FULL_OVERVIEW_READS');
 for(const read of r.cmOverview.reads)assertCMOverview(cmOverviewSavedReference(r),read);
 return{receipts,arrivalRoles:r.cmCold.arrival.map(v=>v.role),lateRoles:r.cmCold.late.map(v=>v.role),warmRoles:r.cmCold.warm.map(v=>v.role),recoveredRoles:r.cmCold.recovery.map(v=>v.role),overviewReads:r.cmOverview.reads.length,allActual:true};
}
function cmColdCopiedControls(r){
 const original=JSON.stringify({cmCold:r.cmCold,cmColdAttempts:r.cmColdAttempts,assetBodies:r.assetBodies,aborts:r.aborts,cmOverview:r.cmOverview}),copy=clone({cmCold:r.cmCold,cmColdAttempts:r.cmColdAttempts,assetBodies:r.assetBodies,aborts:r.aborts,cmOverview:r.cmOverview}),proof=validateCMColdTranscript(copy),row=proof.receipts[0];assert(row);
 const at=copy.assetBodies.findIndex(v=>v.id===row.id&&v.path===cmOwners[row.role].file),removed=copy.assetBodies.splice(at,1)[0];assert(at>=0&&removed);assert.notEqual(JSON.stringify(copy),original);
 let bodyError;try{validateCMColdTranscript(copy);}catch(error){bodyError=error;}assert(bodyError instanceof assert.AssertionError);assert.match(bodyError.message,/^K_CM_COLD_BODY_RECEIPT/);copy.assetBodies.splice(at,0,removed);assert.equal(JSON.stringify(copy),original);
 const last=copy.cmCold.recovery.pop();assert(last);assert.notEqual(JSON.stringify(copy),original);let roleError;try{validateCMColdTranscript(copy);}catch(error){roleError=error;}assert(roleError instanceof assert.AssertionError);assert.match(roleError.message,/^K_CM_COLD_COMPLETE_RECOVERY_ROLES/);copy.cmCold.recovery.push(last);assert.equal(JSON.stringify(copy),original);assert.equal(JSON.stringify({cmCold:r.cmCold,cmColdAttempts:r.cmColdAttempts,assetBodies:r.assetBodies,aborts:r.aborts,cmOverview:r.cmOverview}),original);
 return{bodyOmission:{id:row.id,name:bodyError.name,message:bodyError.message},roleOmission:{role:last.role,name:roleError.name,message:roleError.message},changed:true,wholeInverseExact:true,actualHeld:true};
}
const HOST_SCRIPT='/__l5e/events.270c78a44fc53e7b.js',HOST_WRITE='/__l5e/trackevents',publicHostResponses=new WeakMap();
const hostScriptPath=p=>/^\/__l5e\/events(?:\.[a-f0-9]+)?\.js$/.test(p);
function requireHostBody(body,first){assert.equal(body.length,first.length,'SC_REAL_ENTRY_PUBLIC_HOST_BODY_EQUAL');assert(body.equals(first),'SC_REAL_ENTRY_PUBLIC_HOST_BODY_EQUAL');}
async function qualifyPublicTelemetry(p,r,response){
 assert(publicMode);assert.equal(response.status(),200);await p.waitForLoadState('load');
 const html=await response.body(),text=html.toString();
 const tags=[...text.replace(/<!--[\s\S]*?-->/g,'').matchAll(/<script\b([^>]*)>[\s\S]*?<\/script\s*>/gi)].map(x=>x[0]);
 const declarations=tags.map(tag=>{const a=/\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(tag);return a?{tag,url:new URL(a[1]??a[2],response.url())}:null;}).filter(x=>x&&x.url.origin===origin&&hostScriptPath(x.url.pathname)&&x.url.search===''&&x.url.hash==='');
 assert.equal(declarations.length,1,'SC_REAL_ENTRY_PUBLIC_HOST_SOURCE_DECLARED');const declaration=declarations[0];
 assert(/\bdata-autocapture="1"/.test(declaration.tag)&&/\bdata-consent="1"/.test(declaration.tag),'Actual declared host event script attributes');
 const dom=await p.locator('script[src]').evaluateAll(nodes=>nodes.map(n=>n.src));assert.equal(dom.filter(url=>url===declaration.url.href).length,1,'Current page loaded its freshly declared host script');
 const chainOf=actual=>{const chain=[];for(let request=actual.request();request;request=request.redirectedFrom()){assert(chain.length<8,'Bounded actual host redirect chain');assert.equal(request.method(),'GET');assert.equal(new URL(request.url()).origin,origin);chain.unshift({url:request.url(),method:request.method(),resourceType:request.resourceType()});}return chain;};
 const observed=(publicHostResponses.get(p)??[]).map(actual=>({actual,chain:chainOf(actual)})).filter(row=>row.chain[0]?.url===declaration.url.href);
 assert.equal(observed.length,1,'SC_REAL_ENTRY_PUBLIC_OBSERVED_CURRENT_HOST_SCRIPT');const {actual,chain}=observed[0];
 assert.equal(actual.request().resourceType(),'script');assert.equal(actual.request().frame(),p.mainFrame());assert.equal(actual.status(),200);assert.equal(chain.at(-1).url,actual.url());const code=await actual.body();assert(code.length>0);
 r.hostTelemetry.sources??=[];const number=r.hostTelemetry.sources.length+1,folder=path.join(out,'host-telemetry');await fsp.mkdir(folder,{recursive:true});
 const stem=r.id+'-navigation-'+String(number).padStart(2,'0'),htmlFile=stem+'-document.html',scriptFile=stem+'-events.js';
 await fsp.writeFile(path.join(folder,htmlFile),html,{flag:'wx'});await fsp.writeFile(path.join(folder,scriptFile),code,{flag:'wx'});
 if(r.hostTelemetry.source){const first=await fsp.readFile(path.join(out,r.hostTelemetry.source.script.file));requireHostBody(code,first);}
 else{assert.equal(declaration.url.href,origin+HOST_SCRIPT,'Initial actual hashed host declaration');assert.equal(actual.url(),origin+HOST_SCRIPT);}
 const sourceMatches=[];for(const file of Object.keys(m.sourceAfter).filter(p=>p.startsWith('src/')))if((await fsp.readFile(file)).includes(Buffer.from(HOST_WRITE)))sourceMatches.push(file);assert.deepEqual(sourceMatches,[],'Exact host endpoint absent from every tracked src body');
 const record={status:'actual-declared-and-observed-host-script',navigation:number,url:actual.url(),declarationURL:declaration.url.href,redirectChain:chain,
  document:{url:response.url(),status:response.status(),file:'host-telemetry/'+htmlFile,bytes:html.length,sha256:sha(html),scriptTag:declaration.tag},
  script:{status:actual.status(),resourceType:actual.request().resourceType(),file:'host-telemetry/'+scriptFile,bytes:code.length,sha256:sha(code)},sourceEndpointMatches:sourceMatches,
  scope:'Fresh main HTML, current DOM declaration and this navigation actual script response body. Later bodies equal the first full executed body; older proofs remain retained.'};
 r.hostTelemetry.source??=record;r.hostTelemetry.sources.push(record);
 if(!r.hostTelemetry.bodyControl){const copy=Buffer.from(code),first=copy[0];copy[0]^=1;assert(!copy.equals(code));let owned;try{requireHostBody(copy,code);}catch(error){owned=error;}assert(owned instanceof assert.AssertionError);assert.match(owned.message,/^SC_REAL_ENTRY_PUBLIC_HOST_BODY_EQUAL/);const faultFile=r.id+'-copied-host-body-control.js';await fsp.writeFile(path.join(folder,faultFile),copy,{flag:'wx'});const faultSHA256=sha(copy);copy[0]=first;assert(copy.equals(code));r.hostTelemetry.bodyControl={changed:true,source:record.script,faultFile:'host-telemetry/'+faultFile,faultSHA256,ownedFailure:{name:owned.name,message:owned.message},wholeInverseExact:true,actualHeld:true,scope:'Copied actual script-body byte mutation only, never a replaced HTTP/App response.'};}
}
function initiatorURLs(initiator){const urls=[];for(let stack=initiator?.stack;stack;stack=stack.parent)for(const frame of stack.callFrames??[])if(frame.url)urls.push(frame.url);if(initiator?.url)urls.push(initiator.url);return urls;}
function validateReadPreflight(row){
 const {preflight,read,pw,abort}=row,marker='SC_REAL_ENTRY_PUBLIC_LINKED_READ_PREFLIGHT',u=new URL(preflight.url);
 assert.equal(preflight.method,'OPTIONS',marker);assert.equal(preflight.initiator?.type,'preflight',marker);assert.equal(preflight.postData,null,marker);
 assert.equal(u.origin,'https://flawuiqbvjobmkfkauhw.supabase.co',marker);assert.equal(u.pathname,'/rest/v1/live_scores',marker);
 assert.equal(preflight.initiator.url,preflight.url,marker);assert.equal(preflight.initiator.requestId,read.requestId,marker);
 assert.equal(read.method,'GET',marker);assert.equal(read.url,preflight.url,marker);assert.equal(pw.method,'GET',marker);assert.equal(pw.url,read.url,marker);
 assert.equal(abort.requestId,pw.requestId,marker);assert.equal(abort.method,pw.method,marker);assert.equal(abort.url,pw.url,marker);
}
function publicProtocolRows(r){
 const traces=[],preflights=[];
 for(const preflight of r.hostTelemetry.initiators){
  if(preflight.method!=='OPTIONS'||preflight.initiator?.type!=='preflight'){traces.push(preflight);continue;}
  const parents=[...r.hostTelemetry.reads,...r.hostTelemetry.initiators].filter(q=>q.requestId===preflight.initiator.requestId);
  if(parents.length===0)assert.fail('SC_REAL_ENTRY_PUBLIC_READ_PARENT_PENDING');assert.equal(parents.length,1,'Unique native preflight parent');
  const read=parents[0];assert.equal(read.method,'GET','SC_REAL_ENTRY_PUBLIC_LINKED_READ_PREFLIGHT');
  const requests=r.requests.filter(q=>q.method===read.method&&q.url===read.url);
  if(requests.length===0)assert.fail('SC_REAL_ENTRY_PUBLIC_PW_READ_PENDING');assert.equal(requests.length,1,'Unique actual preflight-triggering read');
  const pw=requests[0],aborts=r.aborts.filter(a=>a.requestId===pw.requestId);
  if(aborts.length===0)assert.fail('SC_REAL_ENTRY_PUBLIC_READ_ABORT_PENDING');assert.equal(aborts.length,1,'Unique actual read abort');
  const row={preflight:clone(preflight),read:clone(read),pw:clone(pw),abort:clone(aborts[0])};validateReadPreflight(row);preflights.push(row);
 }
 return{traces,preflights};
}
function copiedReadPreflightControl(next){
 const actual=JSON.stringify(next),copy=clone(next.writeWindow.preflights[0]);assert(copy,'Actual linked read preflight control anchor');
 const original=JSON.stringify(copy),held=copy.read.method;copy.read.method='POST';const fault=JSON.stringify(copy);assert.notEqual(fault,original);
 let owned;try{validateReadPreflight(copy);}catch(error){owned=error;}
 assert(owned instanceof assert.AssertionError);assert.match(owned.message,/^SC_REAL_ENTRY_PUBLIC_LINKED_READ_PREFLIGHT/);
 copy.read.method=held;assert.equal(JSON.stringify(copy),original);assert.equal(JSON.stringify(next),actual);
 return{changed:true,actualPreflight:next.writeWindow.preflights[0],faultParentMethod:'POST',faultSHA256:sha(fault),
  ownedFailure:{name:owned.name,message:owned.message},wholeInverseExact:true,actualSampleHeld:true,
  scope:'Copied actual native preflight with only triggering parent method changed. Same pure preflight validator must refuse; full inverse. No provider availability or physical fault claim.'};
}
function publicWriteWindow(r){
 assert(r.hostTelemetry.source,'SC_REAL_ENTRY_PUBLIC_HOST_SOURCE_BEFORE_REVIEW');
 const writes=r.requests.filter(q=>!['GET','HEAD'].includes(q.method)),{traces,preflights}=publicProtocolRows(r);
 assert.equal(traces.length,writes.length,'SC_REAL_ENTRY_PUBLIC_COMPLETE_WRITE_INITIATORS');
 return{source:clone(r.hostTelemetry.source),sources:clone(r.hostTelemetry.sources??[]),preflights,writes:writes.map((q,i)=>{
  const trace=traces[i];assert.equal(trace.url,q.url,'Exact ordered native write URL');assert.equal(trace.method,q.method,'Exact ordered native write method');
  const body=trace.postData===null?Buffer.alloc(0):Buffer.from(trace.postData,'utf8');
  assert.equal(body.length,q.body.bytes,'SC_REAL_ENTRY_PUBLIC_NATIVE_WRITE_BODY');assert.equal(sha(body),q.body.sha256,'SC_REAL_ENTRY_PUBLIC_NATIVE_WRITE_BODY');assert.equal(body.toString('base64'),q.body.base64??'','SC_REAL_ENTRY_PUBLIC_NATIVE_WRITE_BODY');
  const aborts=r.aborts.filter(a=>a.requestId===q.requestId);if(aborts.length===0)assert.fail('SC_REAL_ENTRY_PUBLIC_WRITE_ABORT_PENDING');assert.equal(aborts.length,1,'Every attempted write has one actual abort declaration');
  return{request:clone(q),abort:clone(aborts[0]),trace:clone(trace)};
 })};
}
function gameWriteIds(window){
 return window.writes.filter(({request:q,abort,trace})=>{
  const u=new URL(q.url),host=q.method==='POST'&&u.origin===origin&&u.pathname===HOST_WRITE&&u.search===''&&u.hash==='';
  if(!host)return true;
  assert.equal(window.source.status,'actual-declared-and-observed-host-script','SC_REAL_ENTRY_PUBLIC_HOST_ATTRIBUTION');
  assert.equal(window.source.url,origin+HOST_SCRIPT,'SC_REAL_ENTRY_PUBLIC_HOST_ATTRIBUTION');
  assert.equal(abort.requestId,q.requestId);assert.equal(abort.url,q.url);assert.equal(abort.method,q.method);
  assert.equal(trace.url,q.url);assert.equal(trace.method,q.method);
  const urls=initiatorURLs(trace.initiator),proofs=(window.sources??[]).filter(source=>urls.includes(source.url));
  assert(proofs.length>0,'SC_REAL_ENTRY_PUBLIC_HOST_INITIATOR');for(const proof of proofs){assert.equal(proof.status,'actual-declared-and-observed-host-script','SC_REAL_ENTRY_PUBLIC_HOST_ATTRIBUTION');assert.equal(proof.script.bytes,window.source.script.bytes,'SC_REAL_ENTRY_PUBLIC_HOST_BODY_EQUAL');assert.equal(proof.script.sha256,window.source.script.sha256,'SC_REAL_ENTRY_PUBLIC_HOST_BODY_EQUAL');}
  return false;
 }).map(row=>row.request.requestId);
}
function writeSnapshot(r,paired){
 if(!publicMode)return{writeRequests:r.requests.filter(q=>!['GET','HEAD'].includes(q.method)).length};
 const writeWindow=paired??publicWriteWindow(r);return{writeRequests:gameWriteIds(writeWindow).length,writeWindow};
}
async function completePublicWriteSnapshot(r,label){
 const started=Date.now(),deadline=started+5000,wait={label,maximumMilliseconds:5000,intervalMilliseconds:25,status:'waiting',samples:[]};
 r.hostTelemetry.completionWaits.push(wait);
 const pending=/^(?:SC_REAL_ENTRY_PUBLIC_COMPLETE_WRITE_INITIATORS|SC_REAL_ENTRY_PUBLIC_READ_PARENT_PENDING|SC_REAL_ENTRY_PUBLIC_PW_READ_PENDING|SC_REAL_ENTRY_PUBLIC_READ_ABORT_PENDING|SC_REAL_ENTRY_PUBLIC_WRITE_ABORT_PENDING)/;
 for(;;){
  if(Date.now()>=deadline){wait.status='timeout';assert.fail('SC_REAL_ENTRY_PUBLIC_WRITE_COMPLETION_TIMEOUT '+label);}
  const sample={elapsedMilliseconds:Date.now()-started,pwWrites:r.requests.filter(q=>!['GET','HEAD'].includes(q.method)).length,nativeNonReads:r.hostTelemetry.initiators.length,nativeReads:r.hostTelemetry.reads.length};
  try{const window=publicWriteWindow(r),snapshot=writeSnapshot(r,window);sample.pairedWrites=window.writes.length;sample.linkedReadPreflights=window.preflights.length;if(Date.now()>=deadline){wait.status='timeout';assert.fail('SC_REAL_ENTRY_PUBLIC_WRITE_COMPLETION_TIMEOUT '+label);}sample.status='paired';wait.samples.push(sample);wait.status='paired';wait.elapsedMilliseconds=Date.now()-started;wait.windowSHA256=sha(JSON.stringify(window));return snapshot;}
  catch(error){sample.error={name:error.name,message:error.message};sample.status='not-paired';wait.samples.push(sample);if(!(error instanceof assert.AssertionError)||!pending.test(error.message)){wait.status=String(error.message).startsWith('SC_REAL_ENTRY_PUBLIC_WRITE_COMPLETION_TIMEOUT')?'timeout':'fatal';throw error;}if(Date.now()>=deadline){wait.status='timeout';assert.fail('SC_REAL_ENTRY_PUBLIC_WRITE_COMPLETION_TIMEOUT '+label);}await new Promise(resolve=>setTimeout(resolve,Math.min(25,Math.max(1,deadline-Date.now()))));}
 }
}
function copiedUnknownWriteControl(before,next){
 const actual=JSON.stringify({before,next}),window=clone(next.writeWindow),original=JSON.stringify(window);
 const target=window.writes.find(row=>row.request.url===origin+HOST_WRITE&&row.request.method==='POST');assert(target,'Actual host POST control anchor');
 const old=target.request.url;target.request.url=origin+'/__l5e/unrecognized-write-control';
 const fault=JSON.stringify(window);assert.notEqual(fault,original);const altered={...next,writeWindow:window,writeRequests:gameWriteIds(window).length};
 let owned;try{validateReadonlyReview(before,altered);}catch(error){owned=error;}
 assert(owned instanceof assert.AssertionError);assert.match(owned.message,/^No new write request/);
 target.request.url=old;assert.equal(JSON.stringify(window),original);assert.equal(JSON.stringify({before,next}),actual);
 return{changed:true,actualSampleSHA256:sha(actual),actualRequestURL:old,faultRequestURL:origin+'/__l5e/unrecognized-write-control',
  faultSHA256:sha(fault),ownedFailure:{name:owned.name,message:owned.message},wholeInverseExact:true,actualSampleHeld:true,
  scope:'Copied actual attempted POST with only URL changed, through the same write classifier and unchanged read-only validator. Guard logic only, no physical or App fault claim.'};
}
function copiedHostInitiatorControl(next){
 const actual=JSON.stringify(next),window=clone(next.writeWindow),original=JSON.stringify(window),sources=new Set(window.sources.map(source=>source.url));
 const target=window.writes.find(row=>row.request.url===origin+HOST_WRITE&&row.request.method==='POST');assert(target);
 const held=clone(target.trace.initiator);let removed=0;
 for(let stack=target.trace.initiator?.stack;stack;stack=stack.parent){const before=stack.callFrames??[];stack.callFrames=before.filter(frame=>!sources.has(frame.url));removed+=before.length-stack.callFrames.length;}
 if(sources.has(target.trace.initiator.url)){delete target.trace.initiator.url;removed++;}
 assert(removed>0);assert(!initiatorURLs(target.trace.initiator).some(url=>sources.has(url)));const fault=JSON.stringify(window);assert.notEqual(fault,original);
 let owned;try{gameWriteIds(window);}catch(error){owned=error;}
 assert(owned instanceof assert.AssertionError);assert.match(owned.message,/^SC_REAL_ENTRY_PUBLIC_HOST_INITIATOR/);
 const faultInitiator=clone(target.trace.initiator);target.trace.initiator=held;assert.equal(JSON.stringify(window),original);assert.equal(JSON.stringify(next),actual);
 return{changed:true,removedSourceEntries:removed,source:window.source.url,qualifiedSourceURLs:[...sources],actualInitiator:held,faultInitiator,faultSHA256:sha(fault),
  ownedFailure:{name:owned.name,message:owned.message},wholeInverseExact:true,actualSampleHeld:true,
  scope:'Copied actual attempted host POST loses every occurrence of its actual initiating host script. Same classifier must refuse the exclusion; the complete copy is then restored. Guard logic only.'};
}
function copiedRegistryOmissionControl(next){
 const actual=JSON.stringify(next),window=clone(next.writeWindow),original=JSON.stringify(window),target=window.writes.find(row=>row.request.method==='POST'&&row.request.url===origin+HOST_WRITE);assert(target);
 const urls=new Set(initiatorURLs(target.trace.initiator)),held=window.sources;window.sources=held.filter(source=>!urls.has(source.url));assert(window.sources.length<held.length);const fault=JSON.stringify(window);assert.notEqual(fault,original);
 let owned;try{gameWriteIds(window);}catch(error){owned=error;}assert(owned instanceof assert.AssertionError);assert.match(owned.message,/^SC_REAL_ENTRY_PUBLIC_HOST_INITIATOR/);window.sources=held;assert.equal(JSON.stringify(window),original);assert.equal(JSON.stringify(next),actual);
 return{changed:true,removedSources:held.filter(source=>urls.has(source.url)),faultSHA256:sha(fault),ownedFailure:{name:owned.name,message:owned.message},wholeInverseExact:true,actualSampleHeld:true,scope:'Copied actual qualified-registry omission, no live response or App mutation.'};
}



const publicContexts=new Map();
function publicRawNetwork(r,sequence){
 return{context:r.id,sequence,observedAfterDOM:true,playwrightWriteIds:r.requests.filter(q=>!['GET','HEAD'].includes(q.method)).map(q=>q.requestId),nativeNonReadIds:r.nativeRequests.filter(q=>!['GET','HEAD'].includes(q.method)).map(q=>q.requestId)};
}
function deferPublicReadOnlyBoundary(before,after,label){
 const a=before.publicNetwork,b=after.publicNetwork;assert(a&&b,'K_PUBLIC_BOUNDARY_RAW_NETWORK');
 assert.equal(a.context,b.context,'K_PUBLIC_BOUNDARY_CONTEXT');assert(b.sequence>=a.sequence,'K_PUBLIC_BOUNDARY_FRAME_ORDER');
 const r=publicContexts.get(a.context);assert(r,'K_PUBLIC_BOUNDARY_ACTUAL_CONTEXT');
 const row={id:r.publicBoundaries.length,label,before:clone(a),after:clone(b),status:'pending-global-protocol-close'};
 r.publicBoundaries.push(row);return row.id;
}
function requirePublicZero(window){assert.deepEqual(gameWriteIds(window),[],'K_PUBLIC_NO_GAME_OR_PROVIDER_WRITE');}
function requirePublicWriteCensus(requests,window){
 assert.deepEqual(window.writes.map(row=>row.request.requestId),requests.filter(row=>!['GET','HEAD'].includes(row.method)).map(row=>row.requestId),'K_PUBLIC_FINAL_RAW_WRITE_CENSUS');
}
function validatePublicBoundarySet(rows,expectedIds,frameProofs,window,nativeNonReadIds){
 assert.deepEqual(rows.map(row=>row.id),expectedIds,'K_PUBLIC_BOUNDARY_CENSUS');requirePublicZero(window);
 const pwIds=window.writes.map(row=>row.request.requestId);
 for(const row of rows){
  for(const edge of ['before','after']){
   const n=row[edge],proof=frameProofs.get(n.sequence);assert(proof,'K_PUBLIC_BOUNDARY_FRAME_LINK');
   assert.deepEqual(n,proof.publicNetwork,'K_PUBLIC_BOUNDARY_FRAME_LINK');assert.equal(proof.rawWriteRequests,n.playwrightWriteIds.length,'K_PUBLIC_RAW_FRAME_WRITE_COUNT');
   assert.equal(n.context,proof.context,'K_PUBLIC_BOUNDARY_FRAME_LINK');
   assert.equal(n.observedAfterDOM,true,'K_PUBLIC_BOUNDARY_FRAME_LINK');
   assert.deepEqual(n.playwrightWriteIds,pwIds.slice(0,n.playwrightWriteIds.length),'K_PUBLIC_BOUNDARY_PW_PREFIX');
   assert.deepEqual(n.nativeNonReadIds,nativeNonReadIds.slice(0,n.nativeNonReadIds.length),'K_PUBLIC_BOUNDARY_NATIVE_PREFIX');
  }
 }
}
function copiedPublicBoundaryControls(r,window,proofs,nativeIds){
 const original=JSON.stringify(r.publicBoundaries),expected=r.publicBoundaries.map(row=>row.id),controls=[];
 assert(expected.length>0,'K_PUBLIC_ACTUAL_READONLY_BOUNDARIES_FOR_CONTROL');
 const copy=clone(r.publicBoundaries),removed=copy.shift();assert.notEqual(JSON.stringify(copy),original);
 let owned;try{validatePublicBoundarySet(copy,expected,proofs,window,nativeIds);}catch(error){owned=error;}
 assert(owned instanceof assert.AssertionError);assert.match(owned.message,/^K_PUBLIC_BOUNDARY_CENSUS/);
 copy.unshift(removed);assert.equal(JSON.stringify(copy),original);assert.equal(JSON.stringify(r.publicBoundaries),original);
 controls.push({kind:'copied actual boundary omission',removed,changed:true,ownedFailure:{name:owned.name,message:owned.message},wholeInverseExact:true,actualHeld:true});
 const missing=new Map(proofs),seq=removed.before.sequence,proof=missing.get(seq);assert(proof);missing.delete(seq);assert.equal(proofs.size-missing.size,1);
 let linkError;try{validatePublicBoundarySet(copy,expected,missing,window,nativeIds);}catch(error){linkError=error;}
 assert(linkError instanceof assert.AssertionError);assert.match(linkError.message,/^K_PUBLIC_BOUNDARY_FRAME_LINK/);
 missing.set(seq,proof);assert.deepEqual([...missing].sort((a,b)=>a[0]-b[0]),[...proofs].sort((a,b)=>a[0]-b[0]));
 controls.push({kind:'copied retained frame-link omission',sequence:seq,changed:true,ownedFailure:{name:linkError.name,message:linkError.message},wholeInverseExact:true,actualHeld:true});
 return controls;
}
function copiedPublicProtocolControls(r,window){
 const original=JSON.stringify(window),controls=[];
 const copy=clone(window),target=copy.writes.find(row=>row.request.method==='POST'&&row.request.url===origin+HOST_WRITE);assert(target,'K_PUBLIC_ACTUAL_HOST_WRITE_CONTROL');
 const old=target.request.url;target.request.url=origin+'/__l5e/unrecognized-write-control';assert.notEqual(JSON.stringify(copy),original);
 let owned;try{requirePublicZero(copy);}catch(error){owned=error;}assert(owned instanceof assert.AssertionError);assert.match(owned.message,/^K_PUBLIC_NO_GAME_OR_PROVIDER_WRITE/);
 target.request.url=old;assert.equal(JSON.stringify(copy),original);assert.equal(JSON.stringify(window),original);
 controls.push({kind:'copied actual unknown write URL',changed:true,ownedFailure:{name:owned.name,message:owned.message},wholeInverseExact:true,actualHeld:true});
 const censusCopy=clone(window),removed=censusCopy.writes.shift();assert(removed);assert.notEqual(JSON.stringify(censusCopy),original);
 let census;try{requirePublicWriteCensus(r.requests,censusCopy);}catch(error){census=error;}assert(census instanceof assert.AssertionError);assert.match(census.message,/^K_PUBLIC_FINAL_RAW_WRITE_CENSUS/);
 censusCopy.writes.unshift(removed);assert.equal(JSON.stringify(censusCopy),original);
 controls.push({kind:'copied actual final write omission',removedRequestId:removed.request.requestId,changed:true,ownedFailure:{name:census.name,message:census.message},wholeInverseExact:true,actualHeld:true});
 return controls;
}
function requirePublicNativeMethods(r){
 for(const row of r.nativeRequests)assert(['GET','HEAD','POST','OPTIONS'].includes(row.method),'K_PUBLIC_UNKNOWN_NATIVE_METHOD '+row.method);
 for(const row of r.requests)assert(['GET','HEAD','POST','OPTIONS'].includes(row.method),'K_PUBLIC_UNKNOWN_PW_METHOD '+row.method);
 assert.equal(r.aborts.filter(row=>row.method==='WEBSOCKET').length,0,'K_PUBLIC_WEBSOCKET_ATTEMPT');
 assert.deepEqual(r.hostTelemetry.initiators.map(row=>({requestId:row.requestId,url:row.url,method:row.method})),r.nativeRequests.filter(row=>!['GET','HEAD'].includes(row.method)).map(row=>({requestId:row.requestId,url:row.url,method:row.method})),'K_PUBLIC_COMPLETE_NATIVE_INITIATOR_CENSUS');
}
function copiedPublicNativeMethodControl(r){
 const original=JSON.stringify({requests:r.requests,nativeRequests:r.nativeRequests,hostTelemetry:r.hostTelemetry,aborts:r.aborts}),copy=clone({requests:r.requests,nativeRequests:r.nativeRequests,hostTelemetry:r.hostTelemetry,aborts:r.aborts}),row=copy.nativeRequests.find(q=>q.method==='GET');assert(row);
 row.method='PUT';assert.notEqual(JSON.stringify(copy),original);let owned;try{requirePublicNativeMethods(copy);}catch(error){owned=error;}
 assert(owned instanceof assert.AssertionError);assert.match(owned.message,/^K_PUBLIC_UNKNOWN_NATIVE_METHOD/);row.method='GET';assert.equal(JSON.stringify(copy),original);
 assert.equal(JSON.stringify({requests:r.requests,nativeRequests:r.nativeRequests,hostTelemetry:r.hostTelemetry,aborts:r.aborts}),original);
 return{changed:true,method:'PUT',ownedFailure:{name:owned.name,message:owned.message},wholeInverseExact:true,actualHeld:true,scope:'Copied actual native GET only; no physical fault claim.'};
}
async function closePublicNetwork(r){
 const final=await completePublicWriteSnapshot(r,'actual context closed after final asset drain');
 requirePublicNativeMethods(r);requirePublicWriteCensus(r.requests,final.writeWindow);requirePublicZero(final.writeWindow);
 const proofs=new Map(),sequences=new Set(r.publicBoundaries.flatMap(row=>[row.before.sequence,row.after.sequence]));
 for(const sequence of sequences){
  const meta=r.frames[sequence];assert(meta&&meta.sequence===sequence,'K_PUBLIC_BOUNDARY_FRAME_LINK');
  const stored=fs.readFileSync(path.join(out,meta.file));assert.equal(stored.length,meta.bytes);assert.equal(sha(stored),meta.sha256);
  const decoded=gunzipSync(stored);assert.equal(decoded.length,meta.decodedBytes);assert.equal(sha(decoded),meta.decodedSHA256);
  const frame=JSON.parse(decoded.toString());assert.equal(frame.sequence,sequence);assert.equal(frame.publicNetwork.context,r.id);
  proofs.set(sequence,{context:r.id,publicNetwork:frame.publicNetwork,rawWriteRequests:frame.writeRequests,file:meta.file,decodedSHA256:meta.decodedSHA256});
 }
 const nativeIds=r.nativeRequests.filter(row=>!['GET','HEAD'].includes(row.method)).map(row=>row.requestId),expected=r.publicBoundaries.map(row=>row.id);
 validatePublicBoundarySet(r.publicBoundaries,expected,proofs,final.writeWindow,nativeIds);
 const next={writeWindow:final.writeWindow};
 r.publicProtocolControls={writeAndCensus:copiedPublicProtocolControls(r,final.writeWindow),initiator:copiedHostInitiatorControl(next),registry:copiedRegistryOmissionControl(next),nativeMethod:copiedPublicNativeMethodControl(r),boundaries:copiedPublicBoundaryControls(r,final.writeWindow,proofs,nativeIds)};
 if(final.writeWindow.preflights.length)r.publicProtocolControls.preflight=copiedReadPreflightControl(next);
 r.publicNetworkClosed={status:'complete-actual-native-pw-preflight-body-source-abort-census',finalWindow:final.writeWindow,rawPWNonReadIds:final.writeWindow.writes.map(row=>row.request.requestId),rawNativeNonReadIds:nativeIds,gameWriteIds:gameWriteIds(final.writeWindow),boundaries:r.publicBoundaries.map(row=>({...row,status:'closed-by-full-global-zero-game-write-proof'})),retainedFrameProofs:[...proofs].map(([sequence,proof])=>({sequence,...proof})),scope:'Raw counts and IDs in every original immediate/rAF frame remain unchanged. Pairing occurred only after the final real context close, never inside a DOM sampler or early window.'};
}
function htmlShape(text){
 const clean=text.replace(/<!--[\s\S]*?-->/g,'');
 const scripts=[...clean.matchAll(/<script\b([^>]*)>[\s\S]*?<\/script\s*>/gi)].map(m=>{
  const src=/(?:^|\s)src\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(m[1]),type=/(?:^|\s)type\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(m[1]);
  return {tag:m[0],src:src?(src[1]??src[2]):null,type:type?(type[1]??type[2]).toLowerCase():null};
 });
 const body=clean.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi,'');
 return {scripts,modules:scripts.filter(s=>s.type==='module'),snapshot:/<div\b[^>]*\sid\s*=\s*(?:"dukb-snapshot"|'dukb-snapshot')[^>]*>/i.test(body)};
}

function validatePublicDocument(reference,actual){
 const expected=htmlShape(reference),served=htmlShape(actual),entries=expected.modules.map(row=>row.src);
 assert.equal(entries.length,1,'K_PUBLIC_REFERENCE_ONE_ENTRY');assert.match(entries[0],/^\/assets\/index-[^/?#]+\.js$/);
 assert(expected.snapshot,'K_PUBLIC_REFERENCE_SNAPSHOT');assert(expected.scripts.some(row=>row.src==='/prerender-boot.js'),'K_PUBLIC_REFERENCE_BOOT');
 assert.deepEqual(served.modules.map(row=>row.src),entries,'K_PUBLIC_DOCUMENT_CURRENT_ENTRY');
 assert(served.snapshot,'K_PUBLIC_DOCUMENT_SNAPSHOT');assert(served.scripts.some(row=>row.src==='/prerender-boot.js'),'K_PUBLIC_DOCUMENT_STABLE_BOOT');
 return{entries,snapshot:true,stableBoot:true,scope:'Full published HTML retained. Exact module entry and snapshot/stable boot contract only; host HTML is not claimed byte-equal to local HTML. Every executed observed App/CSS/boot body remains full byte-equal to the admitted dist.'};
}
function copiedPublicDocumentControl(reference,actual){
 const original=actual,tag=htmlShape(actual).modules[0].tag,entry=htmlShape(actual).modules[0].src;
 assert.equal(actual.split(tag).length-1,1);const changed=tag.replace(entry,'/assets/index-k-public-stale-control.js'),fault=actual.replace(tag,changed);assert.notEqual(fault,actual);
 let owned;try{validatePublicDocument(reference,fault);}catch(error){owned=error;}
 assert(owned instanceof assert.AssertionError);assert.match(owned.message,/^K_PUBLIC_DOCUMENT_CURRENT_ENTRY/);assert.equal(fault.replace(changed,tag),original);
 return{changed:true,originalSHA256:sha(original),faultSHA256:sha(fault),ownedFailure:{name:owned.name,message:owned.message},wholeInverseExact:true,actualHeld:true,scope:'Copied actual raw HTML only; no response replacement.'};
}

async function journey(width, flow) {
  const r = { id: 'k-' + flow + '-' + width, flow, saveKey:flow==='cm'?KEY:'soccerCareerSave', allowSave:false, width, height: width === 390 ? 844 : 900, actor: width < 768 ? 'touch' : 'keyboard', status: 'incomplete', phase: 'initial', actions: [], frames: [], traces: [], photos: [], requests: [], responses: [], failures: [], aborts: [], assetBodies: [], assetErrors: [], console: [], pageErrors: [], navigations: [], documentRequests:[], documentBodies:[], nativeRequests:[], nativeEvents:[], cmColdAttempts:[], leafAttempts: [], attributeAttempts: [], inputEvents: [] };
  report.contexts.push(r);r.publicBoundaries=[];r.publicDocuments=[];r.hostTelemetry={initiators:[],reads:[],completionWaits:[]};publicContexts.set(r.id,r);
  const c = await browser.newContext({ viewport: { width, height: r.height }, deviceScaleFactor: 1, isMobile: width < 768, hasTouch: width < 768, serviceWorkers: 'block' });
  const p = await c.newPage(); p.setDefaultTimeout(15000); p.setDefaultNavigationTimeout(30000);
  const ids = new WeakMap(),publicDocumentResponses=[]; let nextId = 0, mode = 'hold', held = null, lastAsset = Date.now();
  let attributesMode = 'hold', attributesHeld = null;
  const cmModes={deferredViews:'hold',tabs:'allow'},cmHeld={deferredViews:null,tabs:null};
  const activeAssets = new Set(), reads = new Set(), nativeSession=await c.newCDPSession(p), id = q => { if (!ids.has(q)) ids.set(q, ++nextId); return ids.get(q); };
  const isAsset = url => { const u = new URL(url); return u.origin === origin && (u.pathname.startsWith('/assets/') || u.pathname === '/prerender-boot.js'); };
  async function drain(allowHeld = false) {
    const deadline = Date.now() + 20000;
    while ([...activeAssets].some(q => !allowHeld || q.url() !== leafURL && !(flow === 'sc-current' && attributesHeld && attributesHeld.attempt.id === id(q) && q.url() === attributesURL) && !(flow==='cm'&&Object.entries(cmHeld).some(([role,value])=>value&&value.attempt.id===id(q)&&q.url()===cmURLs[role]))) || reads.size || Date.now() - lastAsset < 100) { assert(Date.now() < deadline, 'CM_TEAM_NATIVE_ASSET_DRAIN'); await p.waitForTimeout(25); }
    assert.equal(r.assetErrors.length, 0, 'CM_TEAM_NATIVE_ASSET_READ');
    for(const {response,record:doc} of publicDocumentResponses.filter(row=>!row.record.qualified)){
      assert.equal(doc.requestId,r.documentRequests.at(-1)?.id,'K_PUBLIC_QUALIFY_CURRENT_DOCUMENT');
      await qualifyPublicTelemetry(p,r,response);
      doc.body.publicSourceNavigation=r.hostTelemetry.sources.length;doc.qualified=true;
    }
  }
 nativeSession.on('Network.requestWillBeSent',event=>{
  r.nativeEvents.push({kind:'requestWillBeSent',event,phase:r.phase,at:performance.now()});
  const row={requestId:event.requestId,url:event.request.url,method:event.request.method,postData:event.request.postData??null,initiator:event.initiator,loaderId:event.loaderId,documentURL:event.documentURL,phase:r.phase,at:performance.now()};r.nativeRequests.push(row);
  if(['GET','HEAD'].includes(event.request.method))r.hostTelemetry.reads.push({url:event.request.url,method:event.request.method,requestId:event.requestId,timestamp:event.timestamp});
  else r.hostTelemetry.initiators.push({url:event.request.url,method:event.request.method,postData:event.request.postData??null,initiator:clone(event.initiator),requestId:event.requestId,timestamp:event.timestamp});
  if(row.method==='POST'&&row.postData===null){
   const work=nativeSession.send('Network.getRequestPostData',{requestId:row.requestId}).then(v=>{row.postData=v.postData;row.postDataSource='actual Network.getRequestPostData';const trace=r.hostTelemetry.initiators.find(q=>q.requestId===row.requestId);assert(trace,'K_PUBLIC_NATIVE_BODY_OWNER');trace.postData=v.postData;trace.postDataSource=row.postDataSource;}).catch(error=>{row.postDataError=String(error.message);});
   reads.add(work);void work.finally(()=>reads.delete(work));
  }
 });
 nativeSession.on('Network.loadingFailed',event=>r.nativeEvents.push({kind:'loadingFailed',event,phase:r.phase,at:performance.now()}));
 nativeSession.on('Network.responseReceived',event=>r.nativeEvents.push({kind:'responseReceived',event,phase:r.phase,at:performance.now()}));
 await nativeSession.send('Network.enable',{maxPostDataSize:1048576});
  await p.exposeBinding('__cmNativeEvent', ({ frame }, event) => { r.inputEvents.push({ ...event, frameURL: frame.url(), phase: r.phase }); });
  await c.addInitScript(() => {
    const t = { events: [], current: [], watching: false, overflow: false }; window.__cmNativeTrace = t;
    for (const type of ['pointerdown', 'touchstart', 'click', 'keydown', 'focusin', 'scroll']) addEventListener(type, event => { const n = event.target; const row = { type, trusted: event.isTrusted, key: event.key ?? null, at: performance.now(), target: n instanceof Element ? { tag: n.tagName, id: n.id, text: n.textContent?.trim().slice(0, 100) } : null }; t.events.push(row); void window.__cmNativeEvent(row); if (t.events.length > 5000) t.overflow = true; }, true);
  });
  await c.route('**/*', async route => {
    const q = route.request(), u = new URL(q.url());
    if (u.origin !== origin || !['GET', 'HEAD'].includes(q.method())) { r.aborts.push({ id: id(q), requestId:id(q), url: q.url(), origin: u.origin, method: q.method(), reason: 'existing offline policy', phase: r.phase }); return route.abort('blockedbyclient'); }
    if(flow==='cm'){
      const role=Object.keys(cmURLs).find(name=>q.url()===cmURLs[name]);
      if(role){const attempt={role,id:id(q),url:q.url(),mode:cmModes[role],phase:r.phase,at:performance.now()};r.cmColdAttempts.push(attempt);
        if(cmModes[role]==='hold'){assert.equal(cmHeld[role],null,'One actual held CM presentation request');await new Promise(resolve=>{cmHeld[role]={resolve,attempt};});attempt.releasedAt=performance.now();cmHeld[role]=null;return route.continue();}
        if(cmModes[role]==='refuse'){r.aborts.push({role,id:id(q),url:q.url(),origin,method:q.method(),reason:'actual refused CM '+role+' control',phase:r.phase});return route.abort('failed');}
      }
    }
    if (flow === 'sc-current' && q.url() === attributesURL) {
      const attempt = { id: id(q), url: q.url(), mode: attributesMode, phase: r.phase, at: performance.now() }; r.attributeAttempts.push(attempt);
      if (attributesMode === 'hold') { assert.equal(attributesHeld, null, 'One held actual Attributes request'); await new Promise(resolve => { attributesHeld = { resolve, attempt }; }); attempt.releasedAt = performance.now(); attributesHeld = null; return route.continue(); }
      if (attributesMode === 'refuse') { r.aborts.push({ id: id(q), url: q.url(), origin, method: q.method(), reason: 'actual refused Attributes leaf control', phase: r.phase }); return route.abort('failed'); }
    }
    if (q.url() === leafURL) {
      const attempt = { id: id(q), url: q.url(), mode, phase: r.phase, at: performance.now() }; r.leafAttempts.push(attempt);
      if (mode === 'hold') { assert.equal(held, null, 'One held actual request'); await new Promise(resolve => { held = { resolve, attempt }; }); attempt.releasedAt = performance.now(); held = null; return route.continue(); }
      if (mode === 'refuse') { r.aborts.push({ id: id(q), url: q.url(), origin, method: q.method(), reason: 'actual refused leaf control', phase: r.phase }); return route.abort('failed'); }
    }
    return route.continue();
  });
  await c.routeWebSocket('**/*', async socket => { r.aborts.push({ id: 'ws', url: socket.url(), origin: new URL(socket.url()).origin, method: 'WEBSOCKET', reason: 'existing offline policy', phase: r.phase }); await socket.close({ code: 1008, reason: 'CM source-bound QA' }); });
  p.on('request', q => {
    const row={ id:id(q),requestId:id(q),url:q.url(),method:q.method(),postData:q.postData(),resourceType:q.resourceType(),phase:r.phase,asset:isAsset(q.url()),at:performance.now() };
    if(!['GET','HEAD'].includes(row.method)){const body=q.postDataBuffer();row.body={bytes:body?.length??0,sha256:sha(body??Buffer.alloc(0)),base64:body?.toString('base64')??null};}
    r.requests.push(row);
    if(q.resourceType()==='document'&&q.isNavigationRequest()&&q.frame()===p.mainFrame()){
      assert.equal(q.method(),'GET');r.documentRequests.push({...row,mainDocument:true});publicHostResponses.set(p,[]);
    }
    if(isAsset(q.url())){activeAssets.add(q);lastAsset=Date.now();}
  });
  const finished = q => { if (activeAssets.delete(q)) lastAsset = Date.now(); };
  p.on('requestfinished', finished); p.on('requestfailed', q => { r.failures.push({ id: id(q), url: q.url(), error: q.failure(), phase: r.phase }); finished(q); });
  p.on('response', response => {
    const q = response.request(), u = new URL(response.url()); r.responses.push({ id: id(q), url: response.url(), status: response.status(), phase: r.phase });
    if(u.origin===origin&&hostScriptPath(u.pathname)&&q.resourceType()==='script'){const rows=publicHostResponses.get(p)??[];rows.push(response);publicHostResponses.set(p,rows);}
    if(q.resourceType()==='document'&&q.isNavigationRequest()&&q.frame()===p.mainFrame()){
      const work=(async()=>{
        const bytes=await response.body(),file='bodies/'+sha(bytes)+'.html';
        if(!fs.existsSync(path.join(out,file)))fs.writeFileSync(path.join(out,file),bytes,{flag:'wx'});else assert(fs.readFileSync(path.join(out,file)).equals(bytes));
        const pathname=new URL(response.url()).pathname,rel=pathname==='/'?'index.html':pathname.replace(/^\//,'').replace(/\/$/,'')+'/index.html',reference=refs.get(rel);
        const body={id:id(q),url:response.url(),status:response.status(),path:rel,file,bytes:bytes.length,sha256:sha(bytes),phase:r.phase};r.documentBodies.push(body);
        assert.equal(response.status(),200);assert(reference,'Actual public document belongs to admitted dist route');
        const source=fs.readFileSync(path.join(dist,rel),'utf8');body.publicContract=validatePublicDocument(source,bytes.toString('utf8'));
        body.reference={bytes:reference.bytes,sha256:reference.sha256};body.control=copiedPublicDocumentControl(source,bytes.toString('utf8'));
        const record={requestId:id(q),body,qualified:false};r.publicDocuments.push(record);publicDocumentResponses.push({response,record});
      })().catch(error=>r.assetErrors.push({url:response.url(),message:String(error.stack||error),phase:r.phase}));
      reads.add(work);void work.finally(()=>{reads.delete(work);lastAsset=Date.now();});
    }
    if (!isAsset(response.url())) return;
    const work = (async () => {
      const rel = decodeURIComponent(u.pathname.slice(1)), ref = refs.get(rel); assert(ref, 'Unknown completed asset ' + rel); assert.equal(response.status(), 200);
      const bytes = await response.body(); assert.equal(bytes.length, ref.bytes); assert.equal(sha(bytes), ref.sha256);
      const expected = fs.readFileSync(path.join(dist, rel)); assert(bytes.equals(expected), 'actual served body differs from completed dist');
      const file = 'bodies/' + sha(bytes) + path.extname(rel);
      if (!observed.has(rel)) { if (!fs.existsSync(path.join(out, file))) fs.writeFileSync(path.join(out, file), bytes, { flag: 'wx' }); else assert(fs.readFileSync(path.join(out, file)).equals(bytes)); observed.set(rel, ref.sha256); } else assert.equal(observed.get(rel), ref.sha256);
      r.assetBodies.push({ id: id(q), path: rel, url: response.url(), status: response.status(), file, bytes: bytes.length, sha256: sha(bytes), gzipBytes: gzipSync(bytes).length, phase: r.phase });
    })().catch(e => r.assetErrors.push({ url: response.url(), message: String(e.stack || e), phase: r.phase }));
    reads.add(work); void work.finally(() => { reads.delete(work); lastAsset = Date.now(); });
  });
  p.on('console', e => r.console.push({ type: e.type(), text: e.text(), location: e.location(), phase: r.phase }));
  p.on('pageerror', e => r.pageErrors.push({ name: e.name, message: e.message, stack: e.stack, phase: r.phase }));
  p.on('framenavigated', f => { if (f === p.mainFrame()) r.navigations.push({ url: f.url(), phase: r.phase, at: performance.now() }); });
  async function navigate(route='/club-manager') {
    await drain();
    const response = await p.goto(base + route, { waitUntil: 'load' }); assert.equal(response.status(), 200);
    const bytes = await response.body(), reference = fs.readFileSync(path.join(dist, route.replace(/^\//,'')+'/index.html')); validatePublicDocument(reference.toString('utf8'),bytes.toString('utf8'));
    const file = 'bodies/' + sha(bytes) + '.html'; if (!fs.existsSync(path.join(out, file))) fs.writeFileSync(path.join(out, file), bytes, { flag: 'wx' });
    r.actions.push({ type: 'actual-route-document', url: response.url(), file, bytes: bytes.length, sha256: sha(bytes) });
    await drain();
    await p.locator('#dukb-main').waitFor({ state: 'visible' }); await answerConsent(p, { wait: 1000 }); await idle(p); await drain();
    await sample(p, r, 'actual empty-storage current creation');
  }
  async function pressReload(target, label) {
    await prepareControl(p, r, target);
    const eventStart = r.inputEvents.length, navigation = p.waitForEvent('framenavigated', { predicate: f => f === p.mainFrame(), timeout: 30000 });
    const results = await Promise.allSettled([pressPrepared(p, r, target, label), navigation]);
    assert.equal(results[1].status, 'fulfilled', 'CM_TEAM_NATIVE_ACTUAL_RELOAD_REQUIRED');
    if (results[0].status === 'rejected') { const error = results[0].reason; assert.match(String(error.message), /Execution context was destroyed|Cannot find context with specified id/); r.actions.push({ type: 'actual-native-input-replaced-document', label, error: { name: error.name, message: error.message } }); }
    assert(r.inputEvents.slice(eventStart).some(e => e.trusted && (e.type === 'click' || e.type === 'keydown' && e.key === 'Enter')), 'CM_TEAM_NATIVE_TRUSTED_RELOAD_INPUT');
  }
  async function routeToLeague() {
    r.phase = 'era'; await press(p, r, p.getByText('2026-27', { exact: true }).locator('xpath=ancestor::button[1]'), 'Actual current era'); await waitForScrollIdle(p); await sample(p, r, 'record existing nation reveal');
    r.phase = 'nation'; await press(p, r, countryButton(), 'Actual South Korea'); await waitForScrollIdle(p); await sample(p, r, 'record existing League reveal');
  }
  const leagueButton = () => p.getByText('K League 1', { exact: true }).locator('xpath=ancestor::button[1]');
  const backButton = () => p.getByRole('button', { name: /K League 1/ }).first();
  const rowButtons = () => p.locator('[data-cm-board-wants]').locator('xpath=..');
  async function enterHeld(label) {
    await routeToLeague(); r.phase = label;
    const before = await sample(p, r, 'before real League trigger');
    await press(p, r, leagueButton(), 'Actual K League 1');
    await p.waitForFunction(() => [...document.querySelectorAll('[role="status"]')].some(n => n.textContent === 'Loading screen...'));
    for (let i = 0; !held && i < 200; i++) await p.waitForTimeout(25);
    assert(held, 'Actual executable leaf request held'); await waitForScrollIdle(p); await drain(true);
    const settled = await sample(p, r, 'existing pickRef Team reveal settled before leaf');
    assert.equal(settled.value.rows.length, 0); assert.deepEqual(settled.value.local, before.value.local); assert.deepEqual(settled.value.session, before.value.session);
    r.actions.push({ type: 'existing-navigation-reveal', before: before.sequence, after: settled.sequence, intentionalMovementRetained: true });
    return settled;
  }
  async function release() { assert(held); held.resolve(); await p.locator('[data-cm-board-wants]').first().waitFor({ state: 'visible', timeout: 30000 }); await idle(p); await drain(); }
  async function warm() {
    const before = await sample(p, r, 'before actual warm revisit Back'), rows = before.value.rows;
    await press(p, r, backButton(), 'Actual Back to League'); await waitForScrollIdle(p);
    const count = r.leafAttempts.length; await press(p, r, leagueButton(), 'Actual warm Team reentry'); await p.locator('[data-cm-board-wants]').first().waitFor({ state: 'visible' }); await waitForScrollIdle(p); await drain();
    const after = await sample(p, r, 'actual warm Team rows'); assert.deepEqual(after.value.rows, rows); assert.deepEqual(after.value.local, before.value.local); assert.deepEqual(after.value.session, before.value.session);
    assert.equal(r.leafAttempts.length, count, 'Warm module request held absent');
  }
  const eraButton=()=>p.getByText('2026-27',{exact:true}).locator('xpath=ancestor::button[1]');
  const countryButton=()=>p.getByRole('button',{name:/^South Korea(?:\s|$)/});
  const nationBack=()=>p.getByRole('button',{name:/Starting 2026-27/});
  const worldTile=()=>p.locator('[data-testid="cm-world-editor-tile"]');
  const managers=()=>p.getByRole('button',{name:'Managers',exact:true});
  const resumeCareer=()=>p.getByRole('button',{name:'Resume Career',exact:true});
  const slots=()=>p.locator('[data-testid="cm-slots"]');
  const hub=()=>p.locator('[data-cm-hub]');
  if(flow==='cm')r.cmCold={status:'incomplete',roles:clone(cmOwners),captures:[],arrival:[],late:[],warm:[],recovery:[],scope:'Actual parent World editor and actual committed current K save; no state rewrite, model callback or assumed fresh stale flag.'};
  function cmNetwork(){return{documentGETIDs:r.documentRequests.map(q=>q.id),rawFrameNavigations:clone(r.navigations)};}
  async function cmCapture(label){const full=await sample(p,r,label);r.cmCold.captures.push({label,sequence:full.sequence,...cmNetwork()});return full;}
  function cmSaved(a,b,auxiliary=false){
    assert.equal(b.value.careerRaw,a.value.careerRaw,'K_CM_COLD_WHOLE_SAVED_RAW');assert.deepEqual(b.value.careerState,a.value.careerState,'K_CM_COLD_WHOLE_SAVED_STATE');assert.equal(b.value.url,a.value.url);deferPublicReadOnlyBoundary(a,b,'CM cold whole-save boundary');
    if(!auxiliary){assert.deepEqual(b.value.local,a.value.local,'K_CM_COLD_ALL_STORAGE');assert.deepEqual(b.value.session,a.value.session);}
  }
  async function cmChange(target,label,auxiliary=false){
    await prepareControl(p,r,target);const before=await cmCapture(label+' before real input'),documents=cmNetwork().documentGETIDs;
    await pressPrepared(p,r,target,label);
    for(const point of ['immediate','raf1','raf2']){if(point!=='immediate')await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));const next=await cmCapture(label+' '+point);cmSaved(before,next,auxiliary);assert.deepEqual(cmNetwork().documentGETIDs,documents,'K_CM_COLD_NO_DOCUMENT_FOR_LOCAL_ACTION');}
    await waitForScrollIdle(p);const after=await cmCapture(label+' navigation reveal settled');cmSaved(before,after,auxiliary);
    r.actions.push({type:'actual-cm-cold-navigation',label,before:before.sequence,after:after.sequence,auxiliaryStorageChangesRetained:auxiliary,intentionalRevealRetained:true});return after;
  }
  async function cmWaitHeld(role){
    for(let i=0;!cmHeld[role]&&i<200;i++)await p.waitForTimeout(25);assert(cmHeld[role],'K_CM_COLD_ACTUAL_HELD '+role);await drain(true);
  }
  async function cmLate(role,label,absent){
    await waitForScrollIdle(p);await drain(true);const before=await cmCapture(label+' settled before late release'),documents=cmNetwork().documentGETIDs,watch=await beginWatch(p);
    assert(cmHeld[role]);cmHeld[role].resolve();await drain();await p.waitForTimeout(150);
    const after=await cmCapture(label+' actual late body');sameScreen(before,after);assert.deepEqual(after.value.focus,before.value.focus);assert.deepEqual(cmNetwork().documentGETIDs,documents);await absent();
    const trace=await endWatch(p,r,label,watch);validateTrace(trace,before,true);r.cmCold.late.push({role,label,before:before.sequence,after:after.sequence,documents,trace:r.traces.length-1});
  }
  async function cmActiveArrival(role,label,anchor,ready){
    await cmWaitHeld(role);await prepareControl(p,r,anchor);await waitForScrollIdle(p);await drain(true);
    const before=await cmCapture(label+' persistent anchor after existing reveal'),documents=cmNetwork().documentGETIDs,watch=await beginWatch(p);
    cmHeld[role].resolve();await ready();await waitForScrollIdle(p);await drain();await p.waitForTimeout(150);
    const after=await cmCapture(label+' actual active leaf arrived');sameScreen(before,after);assert.deepEqual(after.value.focus,before.value.focus);assert.deepEqual(cmNetwork().documentGETIDs,documents);const trace=await endWatch(p,r,label,watch);validateTrace(trace,before,true);
    r.cmCold.arrival.push({role,label,before:before.sequence,after:after.sequence,documents,trace:r.traces.length-1});return after;
  }
  async function cmWorldPrelude(){
    cmModes.deferredViews='hold';r.phase='cm-world-held-back';await navigate();
    const before=await cmCapture('World editor real current-era input');await cmChange(eraButton(),'Actual current era before World presentation');
    await countryButton().waitFor({state:'visible'});assert.equal(await countryButton().count(),1);await cmWaitHeld('deferredViews');assert.equal(await worldTile().count(),0);
    const pending=await cmCapture('World pending: real nation grid and parent Back');cmSaved(before,pending);await photo(p,r,'cm-world-pending-parent-back',nationBack());
    await cmChange(nationBack(),'Actual parent Back while World presentation is held');await eraButton().waitFor({state:'visible'});
    await cmLate('deferredViews','World editor late body after parent Back',async()=>{assert.equal(await worldTile().count(),0);assert.equal(await eraButton().count(),1);});
    cmModes.deferredViews='hold';r.phase='cm-world-active-arrival';await navigate();await cmChange(eraButton(),'Actual current era for active World presentation');
    await countryButton().waitFor({state:'visible'});assert.equal(await countryButton().count(),1);
    await cmActiveArrival('deferredViews','World presentation active arrival',nationBack(),()=>worldTile().waitFor({state:'visible'}));
    await photo(p,r,'cm-world-ready-tile',worldTile());
    await cmChange(worldTile(),'Actual World editor open');await p.locator('[data-testid="cm-world-editor"]').waitFor({state:'visible'});await drain();
    const editor=await cmCapture('Actual unchanged World editor, no clubs moved');assert.equal(editor.value.careerRaw,null);assert((await p.locator('[data-testid="cm-world-editor"]').innerText()).includes('the real world, nothing moved yet'));
    await cmChange(p.getByRole('button',{name:'All nations',exact:true}),'Actual World editor Back without edits');await worldTile().waitFor({state:'visible'});await drain();
    const warmCount=r.cmColdAttempts.filter(a=>a.role==='deferredViews').length;await cmChange(nationBack(),'Actual warm World parent Back');await eraButton().waitFor({state:'visible'});await cmChange(eraButton(),'Actual warm World current-era revisit');await worldTile().waitFor({state:'visible'});await drain();
    assert.equal(r.cmColdAttempts.filter(a=>a.role==='deferredViews').length,warmCount,'K_CM_COLD_WORLD_WARM_NO_NEW_REQUEST');r.cmCold.warm.push({role:'deferredViews',label:'actual World presentation warm reentry',attempts:warmCount});
    cmModes.deferredViews='allow';r.phase='cm-world-preface-complete';
  }
  async function cmOverview(label){
    await p.getByRole('tab',{name:'Home',exact:true}).waitFor({state:'visible'});assert.equal(await p.getByRole('tab',{name:'Home',exact:true}).getAttribute('data-state'),'active');
    const value=await captureCMOverview(p,r,label,sample);assertCMOverview(cmOverviewSavedReference(r),value);r.cmOverview.reads.push(value);return value;
  }
  async function cmReload(role,mode,label){
    await drain();cmModes[role]=mode;r.phase=label;const before=await cmCapture(label+' before actual saved-career reload'),beforeDocs=cmNetwork().documentGETIDs;
    assert.equal(before.value.session[STALE],'1','K_CM_COLD_REAL_TEAM_ONCE_FLAG_ALREADY_SPENT');const response=await p.reload({waitUntil:'load'});assert.equal(response.status(),200);await slots().waitFor({state:'visible'});await waitForScrollIdle(p);await drain();
    const after=await cmCapture(label+' actual slots after real reload');assert.equal(after.value.careerRaw,before.value.careerRaw);assert.deepEqual(after.value.careerState,before.value.careerState);assert.equal(after.value.session[STALE],'1');
    assert.equal(r.documentRequests.length,beforeDocs.length+1,'K_CM_COLD_ONE_REAL_RELOAD_GET');return after;
  }
  async function cmResume(label,heldRole=null){
    await cmChange(resumeCareer(),label,true);await hub().waitFor({state:'visible'});await managers().waitFor({state:'visible'});
    if(heldRole)await cmWaitHeld(heldRole);else{await p.getByRole('heading',{name:r.freshCareer.chosen,exact:true}).waitFor({state:'visible'});await p.getByRole('tab',{name:'Home',exact:true}).waitFor({state:'visible'});await drain();}
    return cmCapture(label+' actual resumed hub');
  }
  async function cmRefusal(role,photoLabel){
    await cmReload(role,'refuse','cm-'+role+'-refusal');
    const before=await cmCapture(role+' before actual refused saved Resume'),documents=cmNetwork().documentGETIDs;await cmChange(resumeCareer(),'Actual '+role+' refused saved Resume',true);
    await p.getByRole('heading',{name:'This page broke',exact:true}).waitFor({state:'visible'});await drain();await waitForScrollIdle(p);
    const boundary=await cmCapture(role+' actual existing global boundary');assert.equal(boundary.value.careerRaw,before.value.careerRaw);assert.deepEqual(boundary.value.careerState,before.value.careerState);assert.deepEqual(cmNetwork().documentGETIDs,documents,'K_CM_COLD_SPENT_FLAG_NO_SECOND_AUTOMATIC_RELOAD');
    const retry=p.getByRole('button',{name:'Try this page again',exact:true});await photoBlock(p,r,photoLabel,p.getByRole('heading',{name:'This page broke',exact:true}),retry);
    cmModes[role]='allow';r.phase='cm-'+role+'-recovery';await pressReload(retry,'Actual existing '+role+' global retry');await slots().waitFor({state:'visible'});await waitForScrollIdle(p);await drain();await cmResume('Actual '+role+' saved Resume after user retry');await cmOverview(role+' actual recovered fixture and tile values');
    const recovered=await cmCapture(role+' recovered full saved career');assert.equal(recovered.value.careerRaw,before.value.careerRaw);assert.deepEqual(recovered.value.careerState,before.value.careerState);assert.equal(r.documentRequests.length,documents.length+1);
    r.cmCold.recovery.push({role,before:before.sequence,boundary:boundary.sequence,recovered:recovered.sequence,documents:cmNetwork().documentGETIDs,staleFlagRetained:true});
  }
  async function cmSavedColdRoles(){
    assert(r.committed&&r.freshCareer&&r.cmOverview.baseline,'K_CM_COLD_EARNED_FULL_SAVE_REQUIRED');
    cmModes.tabs='allow';await cmReload('deferredViews','hold','cm-header-held-back');await cmResume('Actual saved Resume while header and overview are held','deferredViews');
    await photo(p,r,'cm-header-pending-managers',managers());await cmChange(managers(),'Actual Managers while header presentation is held',true);await slots().waitFor({state:'visible'});
    await cmLate('deferredViews','Saved header late body after Managers',async()=>{assert.equal(await hub().count(),0);assert.equal(await slots().count(),1);});
    await cmResume('Actual warm saved Resume after header late body');await cmOverview('Actual warm full fixture and tile values after header late body');
    const warm=r.cmColdAttempts.filter(a=>a.role==='deferredViews').length;await cmChange(managers(),'Actual Managers before warm header revisit',true);await slots().waitFor({state:'visible'});await cmResume('Actual warm header revisit');await cmOverview('Actual warm overview values');
    assert.equal(r.cmColdAttempts.filter(a=>a.role==='deferredViews').length,warm,'K_CM_COLD_HEADER_WARM_NO_NEW_REQUEST');r.cmCold.warm.push({role:'deferredViews',label:'saved header and overview',attempts:warm});
    await cmReload('deferredViews','hold','cm-header-active-arrival');await cmResume('Actual saved Resume for active cold header','deferredViews');
    await cmActiveArrival('deferredViews','Saved header and overview active arrival',managers(),async()=>{await p.getByRole('heading',{name:r.freshCareer.chosen,exact:true}).waitFor({state:'visible'});await hub().getByRole('button',{name:/^Board: /}).waitFor({state:'visible'});});
    await cmOverview('Actual cold resolved fixture and all tile values');await photoBlock(p,r,'cm-header-ready-summary',p.getByRole('heading',{name:r.freshCareer.chosen,exact:true}),managers());
    await cmRefusal('deferredViews','cm-header-refused');
    cmModes.deferredViews='allow';await cmReload('tabs','hold','cm-tabs-held-back');await cmResume('Actual saved Resume while Tabs are held','tabs');assert.equal(await p.getByRole('tab',{name:'Home',exact:true}).count(),0);
    await photo(p,r,'cm-tabs-pending-managers',managers());await cmChange(managers(),'Actual Managers while Tabs are held',true);await slots().waitFor({state:'visible'});
    await cmLate('tabs','Tabs late body after Managers',async()=>{assert.equal(await hub().count(),0);assert.equal(await slots().count(),1);});
    await cmResume('Actual warm saved Resume after Tabs late body');await cmOverview('Actual warm overview after Tabs late body');
    const warmTabs=r.cmColdAttempts.filter(a=>a.role==='tabs').length;await cmChange(managers(),'Actual Managers before warm Tabs revisit',true);await slots().waitFor({state:'visible'});await cmResume('Actual warm Tabs revisit');
    assert.equal(r.cmColdAttempts.filter(a=>a.role==='tabs').length,warmTabs,'K_CM_COLD_TABS_WARM_NO_NEW_REQUEST');r.cmCold.warm.push({role:'tabs',label:'saved Tabs warm revisit',attempts:warmTabs});
    await cmReload('tabs','hold','cm-tabs-active-arrival');await cmResume('Actual saved Resume for active cold Tabs','tabs');
    await cmActiveArrival('tabs','Actual saved Tabs active arrival',managers(),()=>p.getByRole('tab',{name:'Home',exact:true}).waitFor({state:'visible'}));
    const tabs=p.getByRole('tablist');assert.equal(await tabs.count(),1);assert.deepEqual(await tabs.getByRole('tab').allTextContents(),['Home','Squad','Tactics','Table','Market']);await cmOverview('Actual cold Tabs resolved fixture and tile values');
    await photoBlock(p,r,'cm-tabs-ready-list',tabs,managers());
    await readOnlyPanel(p.getByRole('tab',{name:'Table',exact:true}),'Actual Arrow path to Table after cold Tabs',()=>p.locator('[data-world-tables]').waitFor({state:'visible'}));
    await readOnlyPanel(p.getByRole('tab',{name:'Home',exact:true}),'Actual Arrow path Home after cold Tabs',()=>hub().getByRole('button',{name:/^Board: /}).waitFor({state:'visible'}));await cmOverview('Actual arrow Home complete overview');
    await cmRefusal('tabs','cm-tabs-refused');r.cmCold.status='passed';
  }
  async function readOnlyPanel(target,label,ready){
    const isTab=await target.getAttribute('role')==='tab';
    if(r.width>=768&&isTab){
      const wanted=await target.getAttribute('data-state');assert(wanted==='active'||wanted==='inactive');const name=await target.innerText();
      const tabGroup=target.locator('xpath=..'),activeTab=tabGroup.locator('[role="tab"][data-state="active"]');assert.equal(await activeTab.count(),1);await prepareControl(p,r,activeTab);const documents=cmNetwork().documentGETIDs;
      const count=await tabGroup.getByRole('tab').count();let reached=false;
      for(let step=0;step<count;step++){
        if(await target.getAttribute('data-state')==='active'){reached=true;break;}
        assert.equal(await activeTab.count(),1,'K_CM_COLD_ONE_SELECTED_TAB');assert(await activeTab.evaluate(node=>node===document.activeElement||node.contains(document.activeElement)),'K_CM_COLD_SELECTED_TAB_OWNS_ARROW');
        const before=await sample(p,r,label+' before actual ArrowRight '+step),eventStart=r.inputEvents.length;await p.keyboard.press('ArrowRight');
        for(const point of ['immediate','raf1','raf2']){if(point!=='immediate')await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));const early=await sample(p,r,label+' ArrowRight '+step+' '+point);cmSaved(before,early);assert.deepEqual(cmNetwork().documentGETIDs,documents);}
        await waitForScrollIdle(p);await drain();const after=await sample(p,r,label+' ArrowRight '+step+' settled');cmSaved(before,after);assert(r.inputEvents.slice(eventStart).some(e=>e.trusted&&e.type==='keydown'&&e.key==='ArrowRight'),'K_CM_COLD_REAL_ARROW_ACK');r.actions.push({type:'actual-selected-tab-arrow',label,wanted:name,step,before:before.sequence,after:after.sequence});
      }
      if(await target.getAttribute('data-state')==='active')reached=true;assert(reached,'K_CM_COLD_ACTUAL_TAB_ARROW_REACH');await ready();await waitForScrollIdle(p);await drain();return sample(p,r,label+' actual selected tab settled');
    }
    await prepareControl(p,r,target);const before=await sample(p,r,label+' before real input');
    await pressPrepared(p,r,target,label);
    for(const point of ['immediate','raf1','raf2']){
      if(point!=='immediate')await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));
      const early=await sample(p,r,label+' '+point);assert.equal(early.value.careerRaw,before.value.careerRaw);assert.deepEqual(early.value.careerState,before.value.careerState);assert.deepEqual(early.value.local,before.value.local);assert.deepEqual(early.value.session,before.value.session);assert.equal(early.value.url,before.value.url);
    }
    await ready();await waitForScrollIdle(p);await drain();const after=await sample(p,r,label+' settled');
    assert.equal(after.value.careerRaw,before.value.careerRaw);assert.deepEqual(after.value.careerState,before.value.careerState);assert.deepEqual(after.value.local,before.value.local);assert.deepEqual(after.value.session,before.value.session);assert.equal(after.value.url,before.value.url);
    r.actions.push({type:'actual-read-only-panel',label,before:before.sequence,after:after.sequence,intentionalNavigationRevealRetained:true});return after;
  }
  async function finishCurrentCM(){
    r.phase='fresh-k-job';validateTeamRows((await sample(p,r,'recovered K ordinary choices before actual commit')).value);
    const first=rowButtons().first();await earlySelect(p,r,first,'Actual ordinary K re-selection after recovery');
    const chosen=await first.locator('span.text-xs.font-bold.truncate').innerText();assert(ordinary.includes(chosen));
    await press(p,r,p.getByRole('button',{name:'Take the job',exact:true}),'Actual K ManagerForm after recovery');
    await p.getByRole('heading',{name:'Who is in the dugout?',exact:true}).waitFor({state:'visible'});await waitForScrollIdle(p);await drain();
    const before=await sample(p,r,'real K ManagerForm immediately before Skip');assert.equal(before.value.careerRaw,null);
    const skip=p.getByRole('button',{name:'Skip: just manage',exact:true});assert.equal(await skip.count(),1);
    r.allowSave=true;await press(p,r,skip,'Actual real-club Skip manager confirmation');
    await p.waitForFunction(key=>localStorage.getItem(key)!==null,KEY);
    const model=p.locator('[data-cm-kleague-model]');await model.waitFor({state:'visible'});await waitForScrollIdle(p);await drain();
    const created=await sample(p,r,'actual current K career committed by real ManagerForm'),c=created.value.careerState;
    assert(c);assert.equal(c.clubName,chosen);assert(!c.customClub,'K_NATIVE_NO_CUSTOM_REAL_JOB');assert(c.squad.length>=11);r.openingSquadProof=validateGeneratedOpeningSquad(c);r.openingSquadControls=generatedOpeningCopiedControls(c);
    assert.equal(c.calendar.filter(entry=>entry.type==='league').length,22,'K_NATIVE_22_MODEL_LEAGUE_GAMES');
    validateKTable(c.table.map(row=>row.club));
    r.committed=true;r.allowSave=false;r.freshCareer={chosen,fullCreated:created,scope:'One actual current UI job. No direct constructor/model or season callback.'};r.savedBytesControl=savedBytesControl(created);
    const home=p.getByRole('tab',{name:'Home',exact:true});assert.equal(await home.count(),1);
    const overview=await captureCMOverview(p,r,'Actual natural K Home fixture and all source tile roles',sample);r.cmOverview={baseline:overview,reads:[],controls:cmOverviewCopiedControls(overview)};
    const modelText=(await model.innerText()).replace(/\s+/g,' ');assert(modelText.includes('22 simulated league games')&&modelText.includes('real 2026 league used 33 games, then 5 split games')&&modelText.includes('not played here'));
    await photoBlock(p,r,'cm-fresh-hub',model,home);
    const squad=p.getByRole('tab',{name:'Squad',exact:true});
    await readOnlyPanel(squad,'Actual K Squad tab',()=>p.locator('[data-cm-squad-list]').waitFor({state:'visible'}));
    const players=p.locator('[data-cm-squad-row]');assert.equal(await players.count(),c.squad.length);
    const ids=await players.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-cm-squad-row')));assert.deepEqual(ids.slice().sort(),c.squad.map(player=>player.id).sort());
    const title='Not a real player. This club has no verified opening roster here, so its starting squad is generated.';
    for(let i=0;i<await players.count();i++){assert.equal(await players.nth(i).getByText('MADE UP',{exact:true}).count(),1,'K_NATIVE_VISIBLE_GENERATED_LABEL');assert.equal(await players.nth(i).locator('span[title]').filter({hasText:'MADE UP'}).getAttribute('title'),title,'K_NATIVE_K_GENERATED_TOOLTIP');}
    await photoBlock(p,r,'cm-generated-squad',players.first(),players.first().getByRole('button').first());
    const tableTab=p.getByRole('tab',{name:'Table',exact:true});
    await readOnlyPanel(tableTab,'Actual K Table tab',()=>p.locator('[data-world-tables]').waitFor({state:'visible'}));
    const table=p.locator('[data-world-tables]'),rows=table.locator('[data-club]');
    const names=await rows.evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-club')));validateKTable(names);r.tableOmissionControl=tableControl(names);
    const note=table.locator('[data-cm-kleague-table]');assert.equal(await note.count(),1);assert((await note.innerText()).includes('22-match league'));
    const tableCaption=table.getByText('K League 1 · pre-season, alphabetical order',{exact:true});assert.equal(await tableCaption.count(),1,'K_NATIVE_PRESEASON_CAPTION_OWNER');assert(await tableCaption.isVisible(),'K_NATIVE_PRESEASON_CAPTION_VISIBLE');assert.equal((await tableCaption.textContent()).trim(),'K League 1 · pre-season, alphabetical order','K_NATIVE_PRESEASON_CAPTION_SOURCE_TEXT');
    assert.equal(await table.locator('.text-emerald-400').count(),0,'K_NATIVE_PRESEASON_NO_CONTINENTAL_ZONE_COLOUR');
    r.tableEvidence={memberNames:names,fullText:await table.innerText(),nonPreseasonRuntimeRendering:'NOT_RUN_BY_NATIVE_OR_CURRENT_HEADLESS',zoneTopSourcePropOnly:true,fullSaved:await sample(p,r,'actual K12 preseason table')};
    assert.equal(await rows.first().evaluate(node=>node.tagName),'BUTTON');assert.equal(await rows.last().evaluate(node=>node.tagName),'BUTTON');
    await photoBlock(p,r,'cm-table-first',rows.first(),rows.first());await photoBlock(p,r,'cm-table-last',rows.last(),rows.last());
    await readOnlyPanel(home,'Actual Home return before Cups',()=>p.getByText('Cups',{exact:true}).waitFor({state:'visible'}));
    const cups=p.getByText('Cups',{exact:true}).locator('xpath=ancestor::button[1]');assert.equal(await cups.count(),1);
    await readOnlyPanel(cups,'Actual Cups panel',()=>p.locator('[data-cm-cups-view="tiles"]').waitFor({state:'visible'}));
    const koreaCup=p.locator('[data-cm-cups-view="tiles"] [data-cm-world-tile="cup"]');assert.equal(await koreaCup.count(),1);assert.equal((await koreaCup.locator(':scope > div').nth(1).textContent()).trim(),'Korea Cup');
    await readOnlyPanel(koreaCup,'Actual Korea Cup detail',()=>p.locator('[data-cm-kleague-cup]').waitFor({state:'visible'}));
    const cup=p.locator('[data-cm-kleague-cup]');const cupText=(await cup.innerText()).replace(/\s+/g,' ');
    assert(cupText.includes('Korea Cup is not played here')&&cupText.includes('22-game league simulation')&&cupText.includes('AFC competitions and promotion/relegation are not played'));
    r.cupEvidence={fullText:cupText,fullSaved:await sample(p,r,'actual K Cup unplayed disclosure'),scope:'Domestic Korea Cup note only. No claim that other leagues have no playable world competitions.'};
    await photoBlock(p,r,'cm-korea-cup',cup,p.getByRole('tab',{name:'Home',exact:true}));
    const prior=await sample(p,r,'actual K complete save before reload');r.phase='actual-k-reload';
    const response=await p.reload({waitUntil:'load'});assert.equal(response.status(),200);await p.locator('[data-testid="cm-slots"]').waitFor({state:'visible'});await idle(p);await drain();
    const slot=await sample(p,r,'actual K manager slot after real reload');assert.equal(prior.value.careerRaw,r.cmOverview.baseline.frame.value.careerRaw,'K_CM_FIRST_LOAD_ORIGINAL_OVERVIEW_SAVE');
    const expected=validateCMFirstLoad(prior,slot),controls=cmFirstLoadControls(prior,slot);
    r.cmOverview.firstLoadSavedInput={kind:'SOURCE_DERIVED_COMPARATOR_INPUT_NOT_A_CAPTURE',before:prior.sequence,after:slot.sequence,originalRaw:prior.value.careerRaw,careerRaw:expected.careerRaw,careerState:expected.careerState,scope:'Only the saved-input projection changes. Original baseline frame, rows, fixture and census remain intact.'};
    const resume=p.getByRole('button',{name:'Resume Career',exact:true});assert.equal(await resume.count(),1);await press(p,r,resume,'Actual K Resume Career');
    await model.waitFor({state:'visible'});await waitForScrollIdle(p);await drain();
    const resumed=await sample(p,r,'actual K hub after real slot resume');assert.equal(resumed.value.careerRaw,expected.careerRaw);assert.deepEqual(resumed.value.careerState,expected.careerState);
    r.reloadEvidence={before:prior,slots:slot,resumed,firstLoadDefaults:{addedFields:Object.keys(CM_FIRST_LOAD_BLOCKS),allOriginalFieldsHeld:true,exactSourceDerivedDefaults:true,controls},scope:'The first real load is the complete original save plus five exact source-derived missing blocks. Complete original and restored bytes/states are retained. Every later career byte/state remains exact. Auxiliary local/session maps retained, without an all-storage-across-reload equality claim.'};
    await photoBlock(p,r,'cm-reloaded-hub',model,p.getByRole('tab',{name:'Home',exact:true}));
  }
  try {
    if(flow==='cm'){
    await cmWorldPrelude();
    await navigate();
    assert.equal(r.assetBodies.filter(b => b.path === leaf.file).length, 0, 'CM_TEAM_NATIVE_NO_EARLY_LEAF');
    await enterHeld('held-back'); await photo(p, r, 'cm-held-parent-back', backButton());
    const beforeBack = await sample(p, r, 'held Back before input'); await press(p, r, backButton(), 'Actual parent Back while request held');
    await leagueButton().waitFor({ state: 'visible' }); await waitForScrollIdle(p);
    const onLeague = await sample(p, r, 'parent League after held Back'); assert.deepEqual(onLeague.value.local, beforeBack.value.local); assert.deepEqual(onLeague.value.session, beforeBack.value.session);
    const w = await beginWatch(p), releasePoint = await sample(p, r, 'late release after parent Back');
    assert(held); held.resolve(); await drain(); await p.waitForTimeout(150);
    const late = await sample(p, r, 'late body cannot reenter Team'); assert.equal(late.value.rows.length, 0); sameScreen(releasePoint, late);
    validateTrace(await endWatch(p, r, 'late leaf after Back', w), releasePoint, true);
    mode = 'hold'; r.phase = 'new-cold-page'; await navigate(); await enterHeld('held-arrival');
    await prepareControl(p, r, backButton()); await waitForScrollIdle(p);
    const arrival = await sample(p, r, 'settled parent Back focus before actual leaf release'), event = await beginWatch(p);
    await release(); await p.waitForTimeout(150);
    const arrived = await sample(p, r, 'actual leaf arrival after reveal'); sameScreen(arrival, arrived); assert.deepEqual(arrived.value.focus, arrival.value.focus);
    assert.equal(arrived.value.rows.length, 11, 'K_NATIVE_COMPLETE_ORDINARY_ROWS');validateTeamRows(arrived.value);r.teamEvidenceControls=teamEvidenceControls(arrived.value);
    const arrivalTrace = await endWatch(p, r, 'leaf arrival no second reveal', event); validateTrace(arrivalTrace, arrival, true);
    r.traceOmissionControl = traceOmissionControl(arrivalTrace, arrival);
    await warm();
    const buttons = rowButtons(); assert.equal(await buttons.count(), 11);
    await photo(p, r, 'cm-team-first', buttons.first()); await photo(p, r, 'cm-team-last', buttons.last());
    await earlySelect(p, r, buttons.first(), 'Actual first Team selection');
    const selected = await buttons.first().locator('span.text-xs.font-bold.truncate').innerText();
    const footer = p.locator('div.fixed').filter({ has: p.getByRole('button', { name: 'Take the job', exact: true }) });
    assert.equal(await footer.count(), 1); assert((await footer.innerText()).includes(selected)); await photo(p, r, 'cm-fixed-selection-footer', footer, true);
    r.phase = 'manager'; const beforeManager = await sample(p, r, 'before actual Manager navigation');
    await press(p, r, p.getByRole('button', { name: 'Take the job', exact: true }), 'Actual open ManagerForm');
    await p.getByRole('heading', { name: 'Who is in the dugout?', exact: true }).waitFor({ state: 'visible' }); await waitForScrollIdle(p);
    await sample(p, r, 'actual ManagerForm no career committed'); await press(p, r, p.getByRole('button', { name: selected, exact: true }), 'Actual Manager Back');
    await p.locator('[data-cm-board-wants]').first().waitFor({ state: 'visible' }); await waitForScrollIdle(p);
    const returned = await sample(p, r, 'actual Manager Back keeps selection'); assert.deepEqual(returned.value.local, beforeManager.value.local); assert.deepEqual(returned.value.session, beforeManager.value.session);
    assert((await footer.innerText()).includes(selected)); await photo(p, r, 'cm-manager-back', footer, true);

    r.phase = 'refusal-new-page'; mode = 'refuse'; await navigate(); await routeToLeague();
    const old = await sample(p, r, 'before first real leaf refusal'), navCount = r.documentRequests.length;
    assert.equal(old.value.session[STALE], undefined);
    r.phase = 'refusal-first'; await pressReload(leagueButton(), 'First real leaf refusal');
    await p.getByText('2026-27', { exact: true }).waitFor({ state: 'visible' }); await drain(); await idle(p);
    const reloaded = await sample(p, r, 'existing freshBuild automatic reload');
    assert.equal(r.documentRequests.length, navCount + 1, 'Exactly one automatic stale-chunk document GET');
    assert.deepEqual(reloaded.value.local, old.value.local); assert.deepEqual(reloaded.value.session, { ...old.value.session, [STALE]: '1' });
    await routeToLeague(); r.phase = 'refusal-second'; const second = await sample(p, r, 'before second real refusal'), secondNav = r.documentRequests.length;
    await press(p, r, leagueButton(), 'Second real leaf refusal');
    await p.getByRole('heading', { name: 'This page broke', exact: true }).waitFor({ state: 'visible' }); await idle(p);
    const boundary = await sample(p, r, 'existing RouteErrorBoundary actual refusal');
    assert.equal(r.documentRequests.length, secondNav); assert.deepEqual(boundary.value.local, second.value.local); assert.deepEqual(boundary.value.session, second.value.session);
    mode = 'allow'; r.phase = 'refusal-user-retry';
    await pressReload(p.getByRole('button', { name: 'Try this page again', exact: true }), 'Existing global retry button');
    await p.getByText('2026-27', { exact: true }).waitFor({ state: 'visible' }); await drain(); await routeToLeague();
    r.phase = 'recovered-team'; await press(p, r, leagueButton(), 'Actual post-reload Team reentry'); await p.locator('[data-cm-board-wants]').first().waitFor({ state: 'visible' }); await drain();
    const recovered = await sample(p, r, 'actual source-backed recovery, no unsaved selection promise');
    assert.equal(recovered.value.rows.length, 11);validateTeamRows(recovered.value); assert.equal(r.documentRequests.length, secondNav + 1);
    assert.equal(r.leafAttempts.filter(a => a.mode === 'refuse').length, 2, 'Two actual refused source-bound leaf requests');
    await finishCurrentCM();
    await cmSavedColdRoles();
    }else{mode='allow';r.phase=flow+'-actual-creation';await runSoccerCreation(p,r,{flow,sample,press,photoBlock,drain:()=>drain(false),navigate,prepareControl,touchReach,active,idle,references,ordinary,oldFour});
      if(flow==='sc-current')await runSoccerAttributes(p,r,{drain,setMode:value=>{assert(['hold','refuse','allow'].includes(value));attributesMode=value;},held:()=>attributesHeld,release:()=>{assert(attributesHeld);attributesHeld.resolve();},pressReload});
    }
    validatePhotoCensus(r);r.photoOmissionControl=photoOmissionControl(r);r.status = 'passed';
  } catch (error) {
    r.status = 'failed'; r.error = { name: error.name, message: error.message, stack: error.stack };
    try { await sample(p, r, 'failure full state'); const file = r.id + '-failure.png'; await p.screenshot({ path: path.join(out, file) }); r.failureScreenshot = file; } catch (captureError) { r.captureError = String(captureError.stack || captureError); }
  } finally {
    if (held) held.resolve();
    if (attributesHeld) attributesHeld.resolve();
    for(const value of Object.values(cmHeld))if(value)value.resolve();
    try { await drain(); } catch (error) { r.assetErrors.push({ message: String(error.stack || error), phase: 'finally drain' }); }
    try { const t = await p.evaluate(() => window.__cmNativeTrace); r.finalDOMTrace = t; assert.equal(t.overflow, false); } catch (error) { r.traceError = String(error.stack || error); r.status = 'failed'; }
    await c.close(); await Promise.all([...reads]);
    try{await closePublicNetwork(r);}catch(error){r.status='failed';r.publicProtocolError=String(error.stack||error);}
    // CDP remains attached until context close; no early detach can hide a late request.
    const expectedResource = e => /^Failed to load resource: net::ERR_(?:BLOCKED_BY_CLIENT(?:\.Inspector)?|FAILED)$/.test(e.text) && r.aborts.some(a => a.url === e.location.url);
    const expectedImport = e => /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/.test(e.message ?? e.text) && (e.message ?? e.text).includes(leafURL) && /^refusal-/.test(e.phase) && r.aborts.some(a => a.url === leafURL && a.phase === e.phase) || flow==='cm' && /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/.test(e.message??e.text) && Object.entries(cmURLs).some(([role,url])=>(e.message??e.text).includes(url)&&e.phase==='cm-'+role+'-refusal'&&r.aborts.some(a=>a.role===role&&a.url===url&&a.phase===e.phase&&a.method==='GET'&&a.reason==='actual refused CM '+role+' control')) || flow === 'sc-current' && /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/.test(e.message ?? e.text) && (e.message ?? e.text).includes(attributesURL) && /^attributes-refusal-/.test(e.phase) && r.aborts.some(a => a.url === attributesURL && a.phase === e.phase && a.method === 'GET' && a.reason === 'actual refused Attributes leaf control');
    r.expectedConsole = r.console.filter(e => e.type === 'error' && (expectedResource(e) || expectedImport(e)));
    r.unexpectedConsole = r.console.filter(e => e.type === 'error' && !expectedResource(e) && !expectedImport(e));
    r.expectedPageErrors = r.pageErrors.filter(expectedImport); r.unexpectedPageErrors = r.pageErrors.filter(e => !expectedImport(e));
    r.unexpectedExternalAborts = r.aborts.filter(a => a.origin !== origin && !known.has(a.origin.replace(/^ws/, 'http')));
    r.localHttpErrors = r.responses.filter(a => new URL(a.url).origin === origin && a.status >= 400);
    try { assert(r.inputEvents.length <= 15000, 'CM_TEAM_NATIVE_EVENT_BOUND'); validateAssets(r); if(flow==='cm'){r.assetControls=assetControls(r);r.cmColdProof=validateCMColdTranscript(r);r.cmColdControls=cmColdCopiedControls(r);}validateDocuments(r);r.documentControl=documentControl(r);assert.equal(r.publicNetworkClosed?.status,'complete-actual-native-pw-preflight-body-source-abort-census','K_PUBLIC_PROTOCOL_CLOSE_REQUIRED');assert.deepEqual(r.publicNetworkClosed.gameWriteIds,[]); assert.equal(r.unexpectedConsole.length, 0); assert.equal(r.unexpectedPageErrors.length, 0); assert.equal(r.unexpectedExternalAborts.length, 0); assert.equal(r.localHttpErrors.length, 0); silent(); } catch (error) { r.status = 'failed'; r.classificationError = String(error.stack || error); }
    write('report.json', report);
  }
}
try { for (const width of [320, 390, 1280]) for(const flow of ['cm','sc-current','sc-historical']) await journey(width,flow); }
finally {
  try { sourceHeld(); assert.deepEqual(inventory(), m.distBefore); silent(); report.sourceHeld = true; report.distHeld = true; } catch (error) { report.finalHoldError = String(error.stack || error); }
  await browser.close(); report.status = report.contexts.length === 9 && report.screenshots.length === 84 && report.contexts.every(r => r.status === 'passed') && report.sourceHeld && report.distHeld ? 'passed' : 'failed';
  write('report.json', report);
}
assert.equal(report.status, 'passed', 'K_LEAGUE_PUBLIC_ALL_NINE_CONTEXTS');
console.log('K League public: nine fresh contexts and all84 actual native photo targets, current CM/SC creation and cold-owner journeys; every actual document qualifies its declared executed host source, raw immediate/rAF observations precede the complete through-close native/PW/preflight/body/abort proof. Global game/provider writes zero, source/dist and full saved states held. No Deadline End or unobserved alias claim.');
