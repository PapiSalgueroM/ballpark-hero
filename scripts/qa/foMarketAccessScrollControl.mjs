import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const arg=(name,fallback)=>{const i=process.argv.indexOf(name);return i<0?fallback:process.argv[i+1];};
for(const key of ['--out','--fixtures','--dist','--base-url'])assert(process.argv.includes(key),key);
const root=process.cwd(),out=path.resolve(arg('--out')),fixtures=path.resolve(arg('--fixtures')),dist=path.resolve(arg('--dist')),
 base=arg('--base-url'),publicMode=process.argv.includes('--public'),normalFile=path.resolve(root,arg('--driver','scripts/qa/foMarketAccessBrowser.mjs'));
const expectedNormal='8de230751f51b7f609ecf2b8c8ee4918f31d7cc7';
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const blob=value=>crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+value.length+'\0'),value])).digest('hex');
await fs.mkdir(out,{recursive:true});assert.equal((await fs.readdir(out)).length,0);
const normalBytes=await fs.readFile(normalFile),normal=normalBytes.toString('utf8');
assert.equal(blob(normalBytes),expectedNormal,'Exact admitted diagnostic-free normal driver');
const m=JSON.parse(await fs.readFile(fixtures+'/manifest.json'));
assert.equal(m.schema,1);assert.deepEqual(m.sourceBefore,m.sourceAfter);
const fixtureRaw=await fs.readFile(path.join(fixtures,m.fixtures.opening.file),'utf8'),expected=m.fixtures.opening.expected;
assert.equal(sha(fixtureRaw),m.fixtures.opening.sha256);assert.deepEqual(JSON.parse(fixtureRaw),expected.before);
async function sourceInventory(){
 const rows={};for(const file of Object.keys(m.sourceAfter).sort())rows[file]=sha(await fs.readFile(path.resolve(root,file)));return rows;
}
async function distInventory(){
 const rows=[];async function walk(rel=''){
  for(const e of await fs.readdir(path.join(dist,rel),{withFileTypes:true})){
   const file=path.posix.join(rel,e.name);if(e.isDirectory())await walk(file);
   else{assert(e.isFile());const bytes=await fs.readFile(path.join(dist,file));rows.push({file,bytes:bytes.length,sha256:sha(bytes)});}
  }
 }await walk();return rows.sort((a,b)=>a.file<b.file?-1:a.file>b.file?1:0);
}
const sourceBefore=await sourceInventory(),distBefore=await distInventory();
assert.deepEqual(sourceBefore,m.sourceAfter);assert.deepEqual(distBefore,m.distBefore);
const edits=[];let variant=normal;
const replace=(label,old,next)=>{
 assert.notEqual(old,next);assert.equal(variant.split(old).length-1,1,label+' unique source span');
 const before=sha(variant);variant=variant.replace(old,next);assert.notEqual(sha(variant),before,label+' changes source');
 edits.push({label,old,next,beforeSHA256:before,afterSHA256:sha(variant)});
};
for(const[name,relative]of [['playwright','../lib/playwrightLoader.mjs'],['consent','../lib/answerConsent.mjs'],['scroll-ready','./nativeScrollReady.mjs']]){
 const file=path.resolve(path.dirname(normalFile),relative);
 assert(Object.hasOwn(m.sourceAfter,path.relative(root,file).split(path.sep).join('/')),'Held source dependency');
 replace('absolute-source-import-'+name,"from '"+relative+"'","from "+JSON.stringify(pathToFileURL(file).href));
}
replace('only390','for(const width of [320,390,1280])await journey(','for(const width of [390])await journey(');
const actionSpan=" assert.equal((await readFrame(p)).raw,f.raw);\n if(r.width===1280)await p.keyboard.press('Enter');else await sign.tap();";

const injectedAction=" assert.equal((await readFrame(p)).raw,f.raw);\n assert.equal(r.width,390,'Scroll control uses the actual mobile actor');\n const controlBeforeSaved=await readFrame(p);\n r.controlDiagnostic={beforeScroll:beforeSign,beforeSavedFrame:controlBeforeSaved.frame,beforeSavedBytes:controlBeforeSaved.raw};\n await sign.evaluate(node=>{\n  const trace={clicks:0,trusted:false,fired:false};\n  window.__FO_MARKET_SCROLL_CONTROL__=trace;\n  node.addEventListener('click',event=>{\n   trace.clicks++;trace.trusted=event.isTrusted;\n   if(!event.isTrusted){trace.error='FO_CONTROL_UNTRUSTED_CLICK';return;}\n   requestAnimationFrame(()=>{\n    const before={x:scrollX,y:scrollY};\n    scrollTo({left:scrollX,top:scrollY+10,behavior:'instant'});\n    trace.fired=true;trace.applied={before,requestedY:before.y+10,after:{x:scrollX,y:scrollY}};\n   });\n  },{capture:true,once:true});\n });\n if(r.width===1280)await p.keyboard.press('Enter');else await sign.tap();";
replace('trusted-actual-sign-post-click-scroll',actionSpan,injectedAction);
const guardSpan=" sameScroll(beforeSign,afterSign,'FO_NATIVE_SIGN_DOCUMENT_SCROLL');";
const guardedDiagnostic=" r.controlDiagnostic={...r.controlDiagnostic,afterScroll:afterSign,actualSignedFrame:signed.frame,actualSignedBytes:signed.raw,\n  referenceSignedFrame:f.expected.signed,referenceSignedBytes:f.expected.signedBytes,\n  unrelated:await save(p,'feature-unrelated'),trace:await p.evaluate(()=>window.__FO_MARKET_SCROLL_CONTROL__??null)};\n assert.equal(r.controlDiagnostic.trace?.clicks,1,'One actual Sign click reaches the once listener');\n assert.equal(r.controlDiagnostic.trace?.trusted,true,'Actual trusted feature click required');\n assert.equal(r.controlDiagnostic.trace?.fired,true,'Actual post-click animation frame required');\n assert.equal(r.controlDiagnostic.trace?.applied?.after.y-r.controlDiagnostic.trace?.applied?.before.y,10,'Actual scrollTo moves ten pixels');\n assert.equal(afterSign.y-beforeSign.y,10,'Measured physical control reaches the unchanged strict guard at plus ten');\n assert.equal(afterSign.x,beforeSign.x,'Only vertical document scroll changes');\n sameScroll(beforeSign,afterSign,'FO_NATIVE_SIGN_DOCUMENT_SCROLL');";
replace('actual-diagnostic-before-unchanged-guard',guardSpan,guardedDiagnostic);
assert.equal(edits.length,6);
assert.equal(variant.split("sameScroll(beforeSign,afterSign,'FO_NATIVE_SIGN_DOCUMENT_SCROLL');").length-1,1);
assert.equal(variant.split("if(r.width===1280)await p.keyboard.press('Enter');else await sign.tap();").length-1,1,'Actual actor stays verbatim');
assert(!variant.includes('tap({trial:true})'));assert.notEqual(sha(variant),sha(normal));
let inverse=variant;
for(const edit of [...edits].reverse()){assert.equal(inverse.split(edit.next).length-1,1,edit.label+' inverse unique');inverse=inverse.replace(edit.next,edit.old);}
assert.equal(inverse,normal,'Exact whole-source inverse');
const variantDir=path.join(out,'physical-variant');await fs.mkdir(variantDir);
const variantFile=path.join(variantDir,'foMarketAccessBrowser.control.mjs');
await fs.writeFile(variantFile,variant,{flag:'wx'});
const report={status:'incomplete',normal:{file:path.relative(root,normalFile),blob:blob(normalBytes),bytes:normalBytes.length,sha256:sha(normalBytes)},
 variant:{file:path.relative(out,variantFile),bytes:Buffer.byteLength(variant),sha256:sha(variant),edits},sourceBefore,distBefore,
 scope:'QA-only physical390px trusted-sign +10pixel scroll. Tracked normal driver is never modified. External variant uses actual source assets/actors. Complete actual signed save equals the existing engine reference before the unchanged strict guard rejects. No normal journey, app fix or original failure-cause claim.'};
await fs.writeFile(out+'/source-variant.json',JSON.stringify(report,null,2)+'\n');
let failure=null;
try{
 const childOut=path.join(out,'browser'),args=[variantFile,...(publicMode?['--public']:[]),'--out',childOut,'--fixtures',fixtures,'--dist',dist,'--base-url',base];
 const child=spawnSync(process.execPath,args,{cwd:root,env:process.env,encoding:'utf8',maxBuffer:30*1024*1024,timeout:15*60*1000});
 await fs.writeFile(out+'/native.stdout.log',child.stdout??'');await fs.writeFile(out+'/native.stderr.log',child.stderr??'');
 report.child={command:[process.execPath,...args],exit:child.status,signal:child.signal,error:child.error?String(child.error.stack||child.error):null};
 assert.equal(child.error,undefined,'Actual native child reaches its assertions');assert.equal(child.signal,null);assert.equal(child.status,1);
 const native=JSON.parse(await fs.readFile(childOut+'/report.json'));report.native=native;
 assert.equal(native.status,'failed');assert.equal(native.sourceHeld,true);assert.equal(native.distHeld,true);assert.equal(native.contexts.length,1);
 const c=native.contexts[0];assert.equal(c.width,390);assert.equal(c.status,'failed');
 assert.match(c.error,/^AssertionError \[ERR_ASSERTION\]: FO_NATIVE_SIGN_DOCUMENT_SCROLL\b/,'Only the owned actual exact-scroll context assertion fails');
 assert.equal(c.errorClassification,undefined);
 for(const key of ['pageErrors','assetErrors','unexpectedConsole','undeclaredAborts','localHttpErrors'])assert.deepEqual(c[key],[],key+' empty');
 assert(c.assetBodies.length>0);
 assert.deepEqual(c.requestFailures.filter(row=>!c.aborts.some(a=>a.url===row.url)),[],'No undeclared request failures');
 const d=c.controlDiagnostic;assert(d);
 assert.deepEqual(d.beforeSavedFrame,expected.before);assert.equal(d.beforeSavedBytes,fixtureRaw);
 assert.deepEqual(d.actualSignedFrame,expected.signed);assert.equal(d.actualSignedBytes,expected.signedBytes);
 assert.deepEqual(d.referenceSignedFrame,expected.signed);assert.equal(d.referenceSignedBytes,expected.signedBytes);assert.equal(d.unrelated,'held');
 assert.equal(d.trace.clicks,1);assert.equal(d.trace.trusted,true);assert.equal(d.trace.fired,true);assert.equal(d.trace.error,undefined);
 assert.deepEqual(d.trace.applied.before,d.beforeScroll);assert.equal(d.trace.applied.requestedY,d.beforeScroll.y+10);
 assert.equal(d.trace.applied.after.y-d.trace.applied.before.y,10);assert.equal(d.trace.applied.after.x,d.trace.applied.before.x);
 assert.deepEqual(d.afterScroll,d.trace.applied.after);assert.equal(d.afterScroll.y-d.beforeScroll.y,10);assert.equal(d.afterScroll.x,d.beforeScroll.x);
 report.owned={marker:'FO_NATIVE_SIGN_DOCUMENT_SCROLL',failures:1,width:390,actualVerticalPixels:10,trustedClicks:1,completeSignedFrameEqual:true,
  completeSignedBytesEqual:true,normalDriverUntouched:true};report.status='admitted';
}catch(error){failure=error;report.status='failed';report.error=String(error.stack||error);}
finally{
 report.sourceAfter=await sourceInventory();report.distAfter=await distInventory();
 const normalAfter=await fs.readFile(normalFile);report.normalAfter={bytes:normalAfter.length,blob:blob(normalAfter),sha256:sha(normalAfter)};
 try{
  assert.deepEqual(report.sourceAfter,sourceBefore);assert.deepEqual(report.distAfter,distBefore);
  assert.deepEqual(normalAfter,normalBytes,'Normal diagnostic-free driver is exact before normal3width');
  assert.equal(report.normalAfter.blob,expectedNormal);assert.equal(inverse,normal);
  report.sourceHeld=true;report.distHeld=true;report.normalHeld=true;report.inverseWholeSourceExact=true;
 }catch(error){failure??=error;report.status='failed';report.holdError=String(error.stack||error);}
 await fs.writeFile(out+'/control-report.json',JSON.stringify(report,null,2)+'\n');
}
if(failure)throw failure;
assert.equal(report.status,'admitted');
console.log('foMarketAccessScrollControl: one actual trusted390px post-sign +10pixel jump rejected by the unchanged guard; full signed bytes, actual assets and normal source held.');
