import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import pw, { chromium } from '../lib/playwrightLoader.mjs';
import { answerConsent } from '../lib/answerConsent.mjs';
import { waitForScrollIdle } from './nativeScrollReady.mjs';

const arg = name => { const i = process.argv.indexOf(name); assert(i >= 0 && process.argv[i + 1], name); return process.argv[i + 1]; };
const out = path.resolve(arg('--out')), dist = path.resolve(arg('--dist')), base = arg('--base-url').replace(/\/$/, ''), origin = new URL(base).origin;
assert(process.env.CI, 'Remote CI only');
assert.equal(new URL(base).hostname, '127.0.0.1', 'Completed local dist only');
const receipt = process.env.SIM_OFFLINE_RECEIPT;
const sha = b => createHash('sha256').update(b).digest('hex'), clone = v => JSON.parse(JSON.stringify(v));
const write = (file, v) => fs.writeFileSync(path.join(out, file), JSON.stringify(v, null, 2) + '\n');
function silent() { assert(receipt); assert.equal(fs.readFileSync(receipt).length, 0, 'CM_TEAM_NATIVE_NODE_OFFLINE_RECEIPT'); }
silent();
assert(!fs.existsSync(out) || fs.readdirSync(out).length === 0, 'Fresh owned output');
fs.mkdirSync(path.join(out, 'frames'), { recursive: true }); fs.mkdirSync(path.join(out, 'bodies'));
const m = JSON.parse(fs.readFileSync(arg('--manifest'), 'utf8'));
assert.equal(m.schema, 'CM_TEAM_PICKER_NATIVE_SOURCE_DIST_V1');
assert.equal(m.status, 'QUALIFIED_FIXED_BUILD_NATIVE_INPUT');
assert.match(m.product.commit, /^[a-f0-9]{40}$/); assert.match(m.product.tree, /^[a-f0-9]{40}$/);
for (const field of ['original', 'candidate']) assert.match(m.admissions[field], /^[a-f0-9]{64}$/);
assert.deepEqual(m.sourceBefore, m.sourceAfter);
for (const file of ['src/pages/ClubManager.tsx', 'src/components/club-manager/ClubManagerTeamPicker.tsx']) assert.match(m.sourceAfter[file], /^[a-f0-9]{64}$/);
function sourceHeld() { for (const [file, digest] of Object.entries(m.sourceAfter)) assert.equal(sha(fs.readFileSync(file)), digest, file); }
sourceHeld();
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
assert(refs.has('prerender-boot.js'));
const report = { schema: 1, status: 'incomplete', product: m.product, authority: { manifestSHA256: sha(fs.readFileSync(arg('--manifest'))), admissions: m.admissions, distDigest: m.distDigest }, executableLeaf: leaf, contexts: [], screenshots: [],
  scope: 'Three native widths, empty-storage current-era England/Premier League UI only. Held real leaf request, parent Back, late arrival, warm revisit, first/last rows, selection/footer/Manager Back, first stale-chunk automatic reload and second refusal global retry. Natural browser RNG and clock. No career start, historical runtime journey, fixture/model generation, public host protocol or private-fork tape claim.' };
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
 assert.deepEqual(next.storage,before.storage,'All browser storage held');assert.equal(next.url,before.url);assert.equal(next.writeRequests,before.writeRequests,'No new write request');
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
  }, KEY);
  assert.equal(v.careerRaw, null, 'CM_TEAM_NATIVE_NO_CAREER_SAVE');
  const full = { sequence: r.frames.length, label, phase: r.phase, at: performance.now(), writeRequests: writes(r), value: v };
  const raw = Buffer.from(JSON.stringify(full) + '\n'), bytes = gzipSync(raw), file = 'frames/' + r.id + '-' + String(full.sequence).padStart(3, '0') + '.json.gz';
  assert(raw.length <= 44 * 1024 * 1024 && bytes.length <= 12 * 1024 * 1024, 'CM_TEAM_NATIVE_FULL_FRAME_RETENTION');
  fs.writeFileSync(path.join(out, file), bytes, { flag: 'wx' });
  r.frames.push({ sequence: full.sequence, label, phase: r.phase, file, bytes: bytes.length, sha256: sha(bytes), decodedBytes: raw.length, decodedSHA256: sha(raw) });
  return full;
}
function review(v) { return { document: v.value.document, saved: { raw: v.value.careerRaw, state: null }, storage: v.value.local, session: v.value.session, url: v.value.url, writeRequests: v.writeRequests }; }
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
const browser = await chromium.launch({ headless: true });
async function journey(width) {
  const r = { id: 'cm-team-' + width, width, height: width === 390 ? 844 : 900, actor: width < 768 ? 'touch' : 'keyboard', status: 'incomplete', phase: 'initial', actions: [], frames: [], traces: [], photos: [], requests: [], responses: [], failures: [], aborts: [], assetBodies: [], assetErrors: [], console: [], pageErrors: [], navigations: [], leafAttempts: [], inputEvents: [] };
  report.contexts.push(r);
  const c = await browser.newContext({ viewport: { width, height: r.height }, deviceScaleFactor: 1, isMobile: width < 768, hasTouch: width < 768, serviceWorkers: 'block' });
  const p = await c.newPage(); p.setDefaultTimeout(15000); p.setDefaultNavigationTimeout(30000);
  const ids = new WeakMap(); let nextId = 0, mode = 'hold', held = null, lastAsset = Date.now();
  const activeAssets = new Set(), reads = new Set(), id = q => { if (!ids.has(q)) ids.set(q, ++nextId); return ids.get(q); };
  const isAsset = url => { const u = new URL(url); return u.origin === origin && (u.pathname.startsWith('/assets/') || u.pathname === '/prerender-boot.js'); };
  async function drain(allowHeld = false) {
    const deadline = Date.now() + 20000;
    while ([...activeAssets].some(q => !allowHeld || q.url() !== leafURL) || reads.size || Date.now() - lastAsset < 100) { assert(Date.now() < deadline, 'CM_TEAM_NATIVE_ASSET_DRAIN'); await p.waitForTimeout(25); }
    assert.equal(r.assetErrors.length, 0, 'CM_TEAM_NATIVE_ASSET_READ');
  }
  await p.exposeBinding('__cmNativeEvent', ({ frame }, event) => { r.inputEvents.push({ ...event, frameURL: frame.url(), phase: r.phase }); });
  await c.addInitScript(() => {
    const t = { events: [], current: [], watching: false, overflow: false }; window.__cmNativeTrace = t;
    for (const type of ['pointerdown', 'touchstart', 'click', 'keydown', 'focusin', 'scroll']) addEventListener(type, event => { const n = event.target; const row = { type, trusted: event.isTrusted, key: event.key ?? null, at: performance.now(), target: n instanceof Element ? { tag: n.tagName, id: n.id, text: n.textContent?.trim().slice(0, 100) } : null }; t.events.push(row); void window.__cmNativeEvent(row); if (t.events.length > 5000) t.overflow = true; }, true);
  });
  await c.route('**/*', async route => {
    const q = route.request(), u = new URL(q.url());
    if (u.origin !== origin || !['GET', 'HEAD'].includes(q.method())) { r.aborts.push({ id: id(q), url: q.url(), origin: u.origin, method: q.method(), reason: 'existing offline policy', phase: r.phase }); return route.abort('blockedbyclient'); }
    if (q.url() === leafURL) {
      const attempt = { id: id(q), url: q.url(), mode, phase: r.phase, at: performance.now() }; r.leafAttempts.push(attempt);
      if (mode === 'hold') { assert.equal(held, null, 'One held actual request'); await new Promise(resolve => { held = { resolve, attempt }; }); attempt.releasedAt = performance.now(); held = null; return route.continue(); }
      if (mode === 'refuse') { r.aborts.push({ id: id(q), url: q.url(), origin, method: q.method(), reason: 'actual refused leaf control', phase: r.phase }); return route.abort('failed'); }
    }
    return route.continue();
  });
  await c.routeWebSocket('**/*', async socket => { r.aborts.push({ id: 'ws', url: socket.url(), origin: new URL(socket.url()).origin, method: 'WEBSOCKET', reason: 'existing offline policy', phase: r.phase }); await socket.close({ code: 1008, reason: 'CM source-bound QA' }); });
  p.on('request', q => { r.requests.push({ id: id(q), url: q.url(), method: q.method(), resourceType: q.resourceType(), phase: r.phase, asset: isAsset(q.url()), at: performance.now() }); if (isAsset(q.url())) { activeAssets.add(q); lastAsset = Date.now(); } });
  const finished = q => { if (activeAssets.delete(q)) lastAsset = Date.now(); };
  p.on('requestfinished', finished); p.on('requestfailed', q => { r.failures.push({ id: id(q), url: q.url(), error: q.failure(), phase: r.phase }); finished(q); });
  p.on('response', response => {
    const q = response.request(), u = new URL(response.url()); r.responses.push({ id: id(q), url: response.url(), status: response.status(), phase: r.phase });
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
  async function navigate() {
    await drain();
    const response = await p.goto(base + '/club-manager', { waitUntil: 'load' }); assert.equal(response.status(), 200);
    const bytes = await response.body(), reference = fs.readFileSync(path.join(dist, 'club-manager/index.html')); assert(bytes.equals(reference), 'Actual completed route HTML');
    const file = 'bodies/' + sha(bytes) + '.html'; if (!fs.existsSync(path.join(out, file))) fs.writeFileSync(path.join(out, file), bytes, { flag: 'wx' });
    r.actions.push({ type: 'actual-route-document', url: response.url(), file, bytes: bytes.length, sha256: sha(bytes) });
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
    r.phase = 'nation'; await press(p, r, p.getByText('England', { exact: true }).locator('xpath=ancestor::button[1]'), 'Actual England'); await waitForScrollIdle(p); await sample(p, r, 'record existing League reveal');
  }
  const leagueButton = () => p.getByText('Premier League', { exact: true }).locator('xpath=ancestor::button[1]');
  const backButton = () => p.getByRole('button', { name: /Premier League/ }).first();
  const rowButtons = () => p.locator('[data-cm-board-wants]').locator('xpath=..');
  async function enterHeld(label) {
    await routeToLeague(); r.phase = label;
    const before = await sample(p, r, 'before real League trigger');
    await press(p, r, leagueButton(), 'Actual Premier League');
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
  try {
    await navigate();
    assert.equal(r.assetBodies.filter(b => b.path === leaf.file).length, 0, 'CM_TEAM_NATIVE_NO_EARLY_LEAF');
    await enterHeld('held-back'); await photo(p, r, 'held-parent-back', backButton());
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
    assert.equal(arrived.value.rows.length, 20, 'CM_TEAM_NATIVE_COMPLETE_CURRENT_ROWS');
    const arrivalTrace = await endWatch(p, r, 'leaf arrival no second reveal', event); validateTrace(arrivalTrace, arrival, true);
    r.traceOmissionControl = traceOmissionControl(arrivalTrace, arrival);
    await warm();
    const buttons = rowButtons(); assert.equal(await buttons.count(), 20);
    await photo(p, r, 'first-row', buttons.first()); await photo(p, r, 'last-row', buttons.last());
    await earlySelect(p, r, buttons.first(), 'Actual first Team selection');
    const selected = await buttons.first().locator('span.text-xs.font-bold.truncate').innerText();
    const footer = p.locator('div.fixed').filter({ has: p.getByRole('button', { name: 'Take the job', exact: true }) });
    assert.equal(await footer.count(), 1); assert((await footer.innerText()).includes(selected)); await photo(p, r, 'fixed-selection-footer', footer, true);
    r.phase = 'manager'; const beforeManager = await sample(p, r, 'before actual Manager navigation');
    await press(p, r, p.getByRole('button', { name: 'Take the job', exact: true }), 'Actual open ManagerForm');
    await p.getByRole('heading', { name: 'Who is in the dugout?', exact: true }).waitFor({ state: 'visible' }); await waitForScrollIdle(p);
    await sample(p, r, 'actual ManagerForm no career committed'); await press(p, r, p.getByRole('button', { name: selected, exact: true }), 'Actual Manager Back');
    await p.locator('[data-cm-board-wants]').first().waitFor({ state: 'visible' }); await waitForScrollIdle(p);
    const returned = await sample(p, r, 'actual Manager Back keeps selection'); assert.deepEqual(returned.value.local, beforeManager.value.local); assert.deepEqual(returned.value.session, beforeManager.value.session);
    assert((await footer.innerText()).includes(selected)); await photo(p, r, 'after-manager-back', footer, true);

    r.phase = 'refusal-new-page'; mode = 'refuse'; await navigate(); await routeToLeague();
    const old = await sample(p, r, 'before first real leaf refusal'), navCount = r.navigations.length;
    assert.equal(old.value.session[STALE], undefined);
    r.phase = 'refusal-first'; await pressReload(leagueButton(), 'First real leaf refusal');
    await p.getByText('2026-27', { exact: true }).waitFor({ state: 'visible' }); await drain(); await idle(p);
    const reloaded = await sample(p, r, 'existing freshBuild automatic reload');
    assert.equal(r.navigations.length, navCount + 1, 'Exactly one automatic stale-chunk reload');
    assert.deepEqual(reloaded.value.local, old.value.local); assert.deepEqual(reloaded.value.session, { ...old.value.session, [STALE]: '1' });
    await routeToLeague(); r.phase = 'refusal-second'; const second = await sample(p, r, 'before second real refusal'), secondNav = r.navigations.length;
    await press(p, r, leagueButton(), 'Second real leaf refusal');
    await p.getByRole('heading', { name: 'This page broke', exact: true }).waitFor({ state: 'visible' }); await idle(p);
    const boundary = await sample(p, r, 'existing RouteErrorBoundary actual refusal');
    assert.equal(r.navigations.length, secondNav); assert.deepEqual(boundary.value.local, second.value.local); assert.deepEqual(boundary.value.session, second.value.session);
    mode = 'allow'; r.phase = 'refusal-user-retry';
    await pressReload(p.getByRole('button', { name: 'Try this page again', exact: true }), 'Existing global retry button');
    await p.getByText('2026-27', { exact: true }).waitFor({ state: 'visible' }); await drain(); await routeToLeague();
    r.phase = 'recovered-team'; await press(p, r, leagueButton(), 'Actual post-reload Team reentry'); await p.locator('[data-cm-board-wants]').first().waitFor({ state: 'visible' }); await drain();
    const recovered = await sample(p, r, 'actual source-backed recovery, no unsaved selection promise');
    assert.equal(recovered.value.rows.length, 20); assert.equal(r.navigations.length, secondNav + 1);
    assert.equal(r.leafAttempts.filter(a => a.mode === 'refuse').length, 2, 'Two actual refused source-bound leaf requests');
    r.status = 'passed';
  } catch (error) {
    r.status = 'failed'; r.error = { name: error.name, message: error.message, stack: error.stack };
    try { await sample(p, r, 'failure full state'); const file = r.id + '-failure.png'; await p.screenshot({ path: path.join(out, file) }); r.failureScreenshot = file; } catch (captureError) { r.captureError = String(captureError.stack || captureError); }
  } finally {
    if (held) held.resolve();
    try { await drain(); } catch (error) { r.assetErrors.push({ message: String(error.stack || error), phase: 'finally drain' }); }
    try { const t = await p.evaluate(() => window.__cmNativeTrace); r.finalDOMTrace = t; assert.equal(t.overflow, false); } catch (error) { r.traceError = String(error.stack || error); r.status = 'failed'; }
    await c.close(); await Promise.all([...reads]);
    const expectedResource = e => /^Failed to load resource: net::ERR_(?:BLOCKED_BY_CLIENT(?:\.Inspector)?|FAILED)$/.test(e.text) && r.aborts.some(a => a.url === e.location.url);
    const expectedImport = e => /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/.test(e.message ?? e.text) && (e.message ?? e.text).includes(leafURL) && /^refusal-/.test(e.phase) && r.aborts.some(a => a.url === leafURL && a.phase === e.phase);
    r.expectedConsole = r.console.filter(e => e.type === 'error' && (expectedResource(e) || expectedImport(e)));
    r.unexpectedConsole = r.console.filter(e => e.type === 'error' && !expectedResource(e) && !expectedImport(e));
    r.expectedPageErrors = r.pageErrors.filter(expectedImport); r.unexpectedPageErrors = r.pageErrors.filter(e => !expectedImport(e));
    r.unexpectedExternalAborts = r.aborts.filter(a => a.origin !== origin && !known.has(a.origin.replace(/^ws/, 'http')));
    r.localHttpErrors = r.responses.filter(a => new URL(a.url).origin === origin && a.status >= 400);
    try { assert(r.inputEvents.length <= 15000, 'CM_TEAM_NATIVE_EVENT_BOUND'); validateAssets(r); r.assetControls = assetControls(r); assert.equal(writes(r), 0, 'CM_TEAM_NATIVE_NO_WRITE_ATTEMPT'); assert.equal(r.unexpectedConsole.length, 0); assert.equal(r.unexpectedPageErrors.length, 0); assert.equal(r.unexpectedExternalAborts.length, 0); assert.equal(r.localHttpErrors.length, 0); silent(); } catch (error) { r.status = 'failed'; r.classificationError = String(error.stack || error); }
    write('report.json', report);
  }
}
try { for (const width of [320, 390, 1280]) await journey(width); }
finally {
  try { sourceHeld(); assert.deepEqual(inventory(), m.distBefore); silent(); report.sourceHeld = true; report.distHeld = true; } catch (error) { report.finalHoldError = String(error.stack || error); }
  await browser.close(); report.status = report.contexts.length === 3 && report.contexts.every(r => r.status === 'passed') && report.sourceHeld && report.distHeld ? 'passed' : 'failed';
  write('report.json', report);
}
assert.equal(report.status, 'passed', 'CM_TEAM_NATIVE_ALL_THREE_CONTEXTS');
console.log('CM Team-picker native: 3 contexts, held/arrival/warm/selection/Manager Back and existing recovery complete; all actual bytes/source/dist held.');
