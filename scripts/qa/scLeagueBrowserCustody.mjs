import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {answerConsent,storedConsent} from '../lib/answerConsent.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
export function createLeagueCustody({ROOT,OUT,league}){
 assert(path.isAbsolute(OUT)&&OUT!==ROOT&&!OUT.startsWith(ROOT+path.sep),'SC_BROWSER_SETUP_EXTERNAL_OUTPUT');
 const file=process.env.SC_BROWSER_COMPILED,contractFile=process.env.SC_BROWSER_CONTRACT;
 assert(path.isAbsolute(file||'')&&path.isAbsolute(contractFile||''),'SC_BROWSER_SETUP_INPUT_PATHS');
 const raw=fs.readFileSync(file),compiled=JSON.parse(raw),contractRaw=fs.readFileSync(contractFile);
 assert.equal(sha(contractRaw),process.env.SC_BROWSER_CONTRACT_SHA256,'SC_BROWSER_SETUP_CONTRACT');
 const contract=JSON.parse(contractRaw),control=process.env.SC_BROWSER_CONTROL||'',only=process.env.SC_LEAGUE_BROWSER_WIDTH||'';
 assert(['','frame-ui'].includes(control),'SC_BROWSER_SETUP_KNOWN_CONTROL');
 assert(!only||(control==='frame-ui'&&only===(league==='L2'?'1280':'390')),'SC_BROWSER_SETUP_BOUNDED_CONTROL_PROFILE');
 assert.equal(compiled.product,contract.product,'SC_BROWSER_SETUP_PRODUCT');
 assert.equal(compiled.tree,contract.tree,'SC_BROWSER_SETUP_TREE');
 assert.equal(compiled.variant,control||'base','SC_BROWSER_SETUP_VARIANT');
 const files=new Map(compiled.distFiles.map(r=>[r.path,r])),chunks=new Map(compiled.chunks.map(r=>[r.file,r]));
 const evidence=new Map(),assetDir=path.join(OUT,'served-assets');fs.mkdirSync(assetDir,{recursive:true});
 function held(){
  const rows={};
  for(const [name,pin]of Object.entries(contract.sourcePins)){
   const body=fs.readFileSync(path.join(ROOT,name)),wanted=control&&name===contract.control.path?contract.control.changed:pin;
   assert.equal(blob(body),wanted.gitBlob,'SC_BROWSER_SETUP_SOURCE '+name);
   assert.equal(sha(body),wanted.sha256,'SC_BROWSER_SETUP_SOURCE_SHA '+name);
   assert.equal(compiled.sourcePins[name].gitBlob,wanted.gitBlob,'SC_BROWSER_SETUP_COMPILER_SOURCE '+name);
   rows[name]={gitBlob:blob(body),sha256:sha(body)};
  }
  assert.equal(compiled.bootstrapModules.length,1,'SC_BROWSER_SETUP_ONE_BOOTSTRAP');
  for(const name of contract.modules)assert(compiled.chunks.some(c=>c.modules.includes(name)),'SC_BROWSER_SETUP_MODULE '+name);
  return rows;
 }
 const sourceBefore=held();
 function fonts(){
  const dir=process.env.FREE_KICK_FONT_CACHE,manifest=fs.readFileSync(path.join(dir,'manifest.json'));
  assert.equal(sha(manifest),process.env.FONT_CACHE_MANIFEST_SHA256,'SC_BROWSER_SETUP_FONT_MANIFEST');
  const rows=JSON.parse(manifest),map=new Map();
  for(const row of rows){
   assert(!map.has(row.url)&&row.file===sha(row.url),'SC_BROWSER_SETUP_UNIQUE_FONT');
   assert(['https://fonts.googleapis.com','https://fonts.gstatic.com'].includes(new URL(row.url).origin),'SC_BROWSER_SETUP_FONT_ORIGIN');
   const body=fs.readFileSync(path.join(dir,row.file));assert.equal(sha(body),row.sha256,'SC_BROWSER_SETUP_FONT_BODY');
   map.set(row.url,{body,contentType:row.contentType});
  }
  const styles=[...fs.readFileSync(path.join(ROOT,'index.html'),'utf8').matchAll(/<link\s+href="(https:\/\/fonts\.googleapis\.com\/[^"]+)"\s+rel="stylesheet"/g)].map(m=>new URL(m[1]).href);
  assert.equal(styles.length,1,'SC_BROWSER_SETUP_TEMPLATE_FONT');
  const css=map.get(styles[0]);assert(css&&/^text\/css/.test(css.contentType),'SC_BROWSER_SETUP_FONT_CSS');
  const urls=[...new Set([...css.body.toString('utf8').matchAll(/url\(\s*['"]?(https:\/\/[^)'"\s]+)/g)].map(m=>m[1]))];
  assert(urls.length>0);assert.deepEqual([...map.keys()].sort(),[styles[0],...urls].sort(),'SC_BROWSER_SETUP_FONT_DEPENDENCIES');
  return map;
 }
 function attach(page,base,arm){
  const receipt={requests:[],assetFailures:[],localFailures:[],fontResponses:[]},pending=[];
  arm.custody=receipt;evidence.set(arm,{receipt,pending});
  page.on('requestfailed',request=>{if(new URL(request.url()).origin===base)receipt.localFailures.push(request.url()+' '+request.failure()?.errorText);});
  page.on('response',response=>{
   const task=(async()=>{
    const url=new URL(response.url()),request=response.request();
    if(['https://fonts.googleapis.com','https://fonts.gstatic.com'].includes(url.origin)){
     if(request.method()==='GET'){const body=await response.body();receipt.fontResponses.push({url:url.href,sha256:sha(body),bytes:body.length});}return;
    }
    if(url.origin!==base||request.method()!=='GET')return;
    if(response.status()>=400){receipt.localFailures.push(response.status()+' '+url.pathname);return;}
    if(!['document','script','stylesheet'].includes(request.resourceType()))return;
    let rel=decodeURIComponent(url.pathname).replace(/^\/+/,'');
    const candidates=[rel,path.posix.join(rel,'index.html')];if(!rel)candidates.unshift('index.html');
    rel=candidates.find(name=>files.has(name))||'index.html';
    const expected=files.get(rel),body=await response.body(),hash=sha(body);
    assert(expected&&hash===expected.sha256,'SC_BROWSER_SETUP_SERVED_BODY '+url.pathname);
    if(/^assets\/.*\.js$/.test(rel))assert(chunks.has(rel),'SC_BROWSER_SETUP_NO_OLD_SNAPSHOT_CHUNK '+rel);
    const saved=path.join(assetDir,hash);if(!fs.existsSync(saved))fs.writeFileSync(saved,body);
    receipt.requests.push({path:url.pathname,distPath:rel,resourceType:request.resourceType(),bytes:body.length,sha256:hash,compiledModules:chunks.get(rel)?.modules||[]});
   })().catch(error=>receipt.assetFailures.push(String(error)));pending.push(task);
  });
 }
 async function consent(page,arm){
  arm.custody.consent=await answerConsent(page);
  assert.equal(arm.custody.consent,'rejected','SC_BROWSER_SETUP_VISIBLE_ESSENTIAL_CHOICE');
  assert.equal(await storedConsent(page),'rejected','SC_BROWSER_SETUP_STORED_ESSENTIAL_CHOICE');
  await page.waitForFunction(()=>!document.body.hasAttribute('data-consent-pending'));
  arm.custody.fontFaces=await page.evaluate(async()=>{
   const rows=[];for(const family of ['Inter','Space Grotesk'])for(const weight of [400,500,600,700]){
    const faces=await document.fonts.load(weight+' 16px "'+family+'"','Soccer Career');
    rows.push({family,weight,loaded:faces.length>0&&faces.every(f=>f.status==='loaded')});
   }await document.fonts.ready;return rows;
  });
  assert(arm.custody.fontFaces.length===8&&arm.custody.fontFaces.every(f=>f.loaded),'SC_BROWSER_SETUP_REAL_FONT_FACES');
 }
 async function associate(page,arm){
  const {receipt,pending}=evidence.get(arm);
  await page.waitForLoadState('networkidle');await Promise.all(pending);
  assert.deepEqual(receipt.assetFailures,[],'SC_BROWSER_SETUP_ASSET_BODIES');
  assert.deepEqual(receipt.localFailures,[],'SC_BROWSER_SETUP_LOCAL_ASSETS');
  assert.deepEqual(arm.errors,[],'SC_BROWSER_SETUP_PAGE_RUNTIME');
  assert.deepEqual(arm.consoleErrors,[],'SC_BROWSER_SETUP_CONSOLE_RUNTIME');
  assert.deepEqual(arm.unknown,[],'SC_BROWSER_SETUP_UNKNOWN_EGRESS');
  const loaded=new Set(receipt.requests.map(r=>r.distPath));
  for(const boot of compiled.bootstrapModules)assert(loaded.has(boot),'SC_BROWSER_SETUP_CURRENT_BOOTSTRAP_LOADED');
  receipt.loadedCurrentGroups=contract.modules.map(name=>{
   const chunk=compiled.chunks.find(c=>c.modules.includes(name)&&loaded.has(c.file));
   assert(chunk,'SC_BROWSER_SETUP_CURRENT_MODULE_LOADED '+name);return{module:name,chunk:chunk.file,sha256:chunk.sha256};
  });
  receipt.domModuleScripts=await page.evaluate(()=>[...document.querySelectorAll('script[type="module"][src]')].map(el=>new URL(el.src).pathname.replace(/^\/+/,'')));
  assert(compiled.bootstrapModules.every(name=>receipt.domModuleScripts.includes(name)),'SC_BROWSER_SETUP_DOM_CURRENT_BOOTSTRAP');
  assert(receipt.fontResponses.length>0,'SC_BROWSER_SETUP_PREPARED_FONT_LOADED');
  receipt.associated=true;held();
 }
 function sources(){const after=held();assert.deepEqual(after,sourceBefore,'SC_BROWSER_SETUP_ALL_SOURCES_HELD');return after;}
 function exit(error){return error?.code==='ERR_ASSERTION'&&/^(L2|SB)_(FRAME|TABLE_CELLS|SAVE_BYTES|ACTION_DRAWS|NEXT_DRAW|WINDOW_POSITION|LEAGUE_IDENTITY)\b/.test(error.message)?1:2;}
 return{fonts,attach,consent,associate,sources,exit,receiptSHA256:sha(raw),only,control};
}
