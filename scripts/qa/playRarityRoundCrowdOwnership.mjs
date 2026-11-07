// Remote Chromium evidence for the public Rarity Round category-owned crowd responses.
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync,spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {fileURLToPath} from 'node:url';
import pw from '../lib/playwrightLoader.mjs';

const PAGE='7c38b10a808cdf083bf5d1ed2f9d15b0a3cae93a';
const FIXED={"run":42367425437,"artifact":13572023105,"head":"52652b5eaca96d03ef6b8c4dc39e55a314a00a00","tree":"9dd996d8621a87e55f073d2df684bb80e17f5cd3","zipBytes":2003317,"zipSHA256":"b7e0dec79c5033c0ec07e671dce25f8b56f6fec9bfcdf8bca5164856355507ca","rawBytes":186786,"rawSHA256":"abc9f818b64a8305ae116f1f39650f12f4531aa65c4ac44ab8fa59d97c18df96"};
const CONTROLS={"run":42368193168,"artifact":13572209507,"head":"2e7aa5bce01943a6201393bd901259a4b2720ce6","tree":"72541d022e0cb48f88da39b86cd4662cd94ac4c2","zipBytes":4026580,"zipSHA256":"eb68fed5905a3449687fa40ec6db2c8ef2ca78aedbf4102e4467c3fedace8e61","admissionFile":"admission.json","admissionBytes":5768,"admissionSHA256":"ff01e404a0ed7ffa4bfb53659b56a5bbd5a5e71144532ad91ae0b07e12978e1b"};
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const ROUTE='/rarity-round',pageFile='src/pages/RarityRound.tsx';
const helperFile='scripts/qa/playRarityRoundCrowdOwnership.mjs';
const workflowFile='.github/workflows/rarity-round-crowd-ownership-20261107.yml';
const widths=[[320,568],[390,844],[1280,900]];
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const blob=bytes=>createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
const read=(...parts)=>fs.readFileSync(path.join(...parts));
const json=(...parts)=>JSON.parse(read(...parts));
const tuple=(file,bytes)=>({file,bytes:bytes.length,sha256:sha(bytes)});
const equal=assert.deepEqual;
const env=process.env;
assert(env.CI&&env.SIM_NETWORK==='offline'&&process.versions.node==='24.22.1');
assert.equal(env.RARITY_ROUND_CROWD_OWNERSHIP_PAGE_BLOB,PAGE);
function absoluteOutput(key){
  const value=env[key];
  assert(value&&path.isAbsolute(value)&&path.resolve(value).startsWith(ROOT+path.sep),key+' absolute path inside checkout');
  return path.resolve(value);
}
const out=absoluteOutput('RARITY_ROUND_CROWD_OWNERSHIP_BROWSER_OUT');
const full=absoluteOutput('RARITY_ROUND_CROWD_OWNERSHIP_FULL_UNIT');
const fixed=absoluteOutput('RARITY_ROUND_CROWD_OWNERSHIP_FIXED_REFERENCE');
const controls=absoluteOutput('RARITY_ROUND_CROWD_OWNERSHIP_CONTROLS_REFERENCE');
equal([out,fixed,controls].map(value=>path.dirname(value)),Array(3).fill(full));
assert(!fs.existsSync(out));fs.mkdirSync(out);
function save(file,body){
  const location=path.join(out,file);
  fs.mkdirSync(path.dirname(location),{recursive:true});
  fs.writeFileSync(location,body,{flag:'wx'});
  return tuple(file,body);
}
const write=(file,value)=>save(file,Buffer.from(JSON.stringify(value,null,2)+'\n'));
const git=(...args)=>execFileSync('git',args,{cwd:ROOT,encoding:'utf8',maxBuffer:16*1024*1024});
function walk(dir,prefix=''){
  return fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(entry=>{
    const file=prefix+entry.name;
    if(entry.isDirectory())return walk(path.join(dir,entry.name),file+'/');
    assert(entry.isFile(),'regular file '+file);
    return [file];
  });
}
const tracked=()=>git('ls-files','-z').split('\0').filter(Boolean).map(file=>tuple(file,read(ROOT,file)));
const built=()=>walk(path.join(ROOT,'dist'),'dist/').map(file=>tuple(file,read(ROOT,file)));
const index=()=>Buffer.from(git('ls-files','--stage','-z'));
function installed(){
  const lock=json(ROOT,'package-lock.json');
  const rows=Object.keys(lock.packages).filter(file=>file.startsWith('node_modules/')&&fs.existsSync(path.join(ROOT,file,'package.json')))
    .map(file=>[file,json(ROOT,file,'package.json').version]);
  assert.equal(rows.length,521);
  for(const [file,version] of rows)assert.equal(version,lock.packages[file].version,file);
  return rows;
}
const locks=()=>['package.json','package-lock.json','bun.lock','bun.lockb'].map(file=>tuple(file,read(ROOT,file)));
const offline=()=>{
  const file=path.resolve(ROOT,env.SIM_OFFLINE_RECEIPT);
  const receipt=tuple(path.relative(ROOT,file),read(file));
  assert.equal(receipt.bytes,0);
  return receipt;
};
function reference(directory,pin){
  const run=json(directory,'run.json'),meta=json(directory,'artifact.json');
  if(Object.hasOwn(meta,'artifacts'))assert.equal(meta.artifacts.length,1);
  const artifact=meta.artifacts?.[0]??meta;
  equal([run.id,run.status,run.conclusion,run.head_sha,run.head_commit.tree_id],
    [pin.run,'completed','success',pin.head,pin.tree]);
  equal([artifact.id,artifact.workflow_run.id,artifact.workflow_run.head_sha,artifact.size_in_bytes,artifact.digest],
    [pin.artifact,pin.run,pin.head,pin.zipBytes,'sha256:'+pin.zipSHA256]);
  const zip=read(directory,'artifact.zip');
  equal([zip.length,sha(zip)],[pin.zipBytes,pin.zipSHA256]);
  equal([read(directory,'packet','head.txt').toString('utf8').trim(),read(directory,'packet','tree.txt').toString('utf8').trim()],[pin.head,pin.tree]);
}
reference(fixed,FIXED);
reference(controls,CONTROLS);
const fullUnit=read(full,'public-cases.raw.json'),fixedUnit=read(fixed,'packet','fixed','public-cases.raw.json');
equal([fixedUnit.length,sha(fixedUnit)],[FIXED.rawBytes,FIXED.rawSHA256]);
assert(fullUnit.equals(fixedUnit),'whole fresh fixed RAW equals completed fixed run');
assert(/^[A-Za-z0-9._/-]+$/.test(CONTROLS.admissionFile)&&CONTROLS.admissionFile.split('/').every(part=>part&&part!=='.'&&part!=='..'));
const controlBody=read(controls,'packet',CONTROLS.admissionFile);
equal([controlBody.length,sha(controlBody)],[CONTROLS.admissionBytes,CONTROLS.admissionSHA256]);
const ORIGINAL={run:42366132461,artifact:13571383152,head:'18328be0c2fd1fc4047fa52c9b9104c68929ddee',
  tree:'5ef388371d25f1f871162f04d6503f727549b2f6',zipBytes:1000690,zipSHA256:'37dcbda51c1ac8d50da907fc31ff5f38c5362e75dca36c70bc36edd8e1512ccb',
  rawBytes:187817,rawSHA256:'a81bd4c4690a8b2bd8f0892af2d314d26ded00780722a4000871b8b49d19e5fe'};
const original=path.join(full,'original-reference');
reference(original,ORIGINAL);
const originalRaw=read(original,'packet','public-cases.raw.json');
equal([originalRaw.length,sha(originalRaw)],[ORIGINAL.rawBytes,ORIGINAL.rawSHA256]);
const unit=JSON.parse(fixedUnit),baseline=JSON.parse(originalRaw);
const keys=['oldWhileCurrentPending','oldAfterCurrentSettled'];
equal([unit.schema,unit.instant,unit.debounceMs],['rarity-round-crowd-ownership-v1','2026-11-12T17:00:00.000Z',200]);
equal([unit.instant,unit.fixtures],[baseline.instant,baseline.fixtures]);
const fixture=unit.fixtures,fixtureBody=write('fixture.json',fixture);
const currentCrowd=[{name:'Fixture B Six',picks:3},{name:'Fixture B Five',picks:2}];
const roles=['a','b'].flatMap(side=>['pool','search-direct','search-prominence','insert','crowd'].map(name=>side+'-'+name));
const project=body=>{
  const order=body.requests.map(row=>row.role);
  equal([...order].sort(),[...roles].sort());
  return roles.map(role=>{
    const {method,url,query,body:requestBody,status,rows}=body.requests.find(row=>row.role===role);
    return {role,method,url,query,requestBody,status,rows};
  });
};
const heldWire=project(baseline.cases[keys[0]]);
for(const role of keys){
  equal(project(baseline.cases[role]),heldWire);
  equal(project(unit.cases[role]),heldWire);
}
const specs=heldWire.map(({rows,...spec})=>({...spec,
  body:save('wire/'+spec.role+'.body',rows===null?Buffer.alloc(0):Buffer.from(JSON.stringify(rows)))}));
const backend='https://flawuiqbvjobmkfkauhw.supabase.co';
const lookup=(url,method,requestBody)=>specs.find(spec=>{
  const pin=new URL(spec.url);
  return method===spec.method&&url.origin===pin.origin&&url.pathname===pin.pathname&&requestBody===spec.requestBody&&
    JSON.stringify([...url.searchParams].sort())===JSON.stringify([...spec.query].sort());
});
const head=git('rev-parse','HEAD').trim(),tree=git('rev-parse','HEAD^{tree}').trim();
assert.equal(head,env.GITHUB_SHA);
equal(git('rev-list','--parents','-n','1','HEAD').trim().split(' '),[head,FIXED.head]);
assert.equal(git('rev-parse',FIXED.head+'^{tree}').trim(),FIXED.tree);
const treeRows=ref=>git('ls-tree','-r','-z',ref).split('\0').filter(Boolean);
const fileOf=row=>row.split('\t')[1];
const beforeTree=treeRows(FIXED.head),afterTree=treeRows('HEAD');
const held=rows=>rows.filter(row=>![helperFile,workflowFile].includes(fileOf(row)));
const scoped=rows=>rows.filter(row=>/^(src|public|scripts)\//.test(fileOf(row))).length;
equal([beforeTree.length,afterTree.length,held(beforeTree).length,scoped(beforeTree),scoped(afterTree)],[5792,5793,5791,4664,4665]);
equal(held(beforeTree),held(afterTree));
equal(git('diff','--name-status',FIXED.head,'HEAD').trim().split('\n').sort(),['A\t'+helperFile,'M\t'+workflowFile].sort());
git('diff','--exit-code','HEAD','--','.');
const pins={
  [pageFile]:PAGE,
  'src/lib/rarityRound.ts':'ef8ed3977ede009210a10ce747dcca8e6d2b080f',
  'src/lib/dateUtils.ts':'12c9de0ed37b0797492f3e936bcba70bdc03d585',
  'src/components/game/PlayerAutocomplete.tsx':'a0bd500b63306c75e0dea251cb6fb67ea2ed9452',
  'src/components/game/HowToPlayPopover.tsx':'527f3c07171db29772d81c6887df5b238eb6e4c4',
  'src/lib/playerSearch.ts':'0d19f2c23735eb30512dc7fc3a447eacef5e128f',
  'src/lib/fetchAllRows.ts':'16a6d21750405e7a647576ff513ed8ee11d5ba6b',
  'src/App.tsx':'8bfedf7aaa1d076e0f0c8e2216c7e46632cd8a33',
  'src/data/gameRegistry.ts':'f560b40a74d1468ac72dfde4ee6fec6635a9a255',
  'public/rarity-round/index.html':'26482f1a578d7fa972f9efa54bc69212332e8c22',
  'src/test/rarityRoundCrowdOwnership.test.tsx':'5d983f1d199893480d47235321e31dd85a913ac4',
  'scripts/lib/offlineTransport.cjs':'0fda542a2649fe5da937c6976fd0f5b6073e74b6',
  'scripts/lib/hostLikeServer.mjs':'21059d5e8114669df61106c125d5272d357b6236',
};
for(const [file,oid] of Object.entries(pins))assert.equal(blob(read(ROOT,file)),oid,file);
const helper=git('rev-parse','HEAD:'+helperFile).trim(),workflow=git('rev-parse','HEAD:'+workflowFile).trim();
assert.equal(blob(read(ROOT,helperFile)),helper);
const source={head,tree,workflow,trackedBodies:5793,scopedSourceRows:4665,heldFixedRows:5791,rootConfigurations:11,distBodies:850,installedVersions:521};
const before={source:tracked(),dist:built(),locks:locks(),installed:installed(),offline:offline()};
equal([before.source.length,before.dist.length],[5793,850]);
equal(before.source,json(full,'tracked-before.json'));
equal(before.dist,json(full,'dist-before.json'));
equal(before.installed,json(full,'installed-before.json'));
const builtByName=new Map(before.dist.map(row=>[row.file,row]));
const docPath='dist/rarity-round/index.html',docBytes=read(ROOT,docPath);
equal(tuple(docPath,docBytes),builtByName.get(docPath));
const docHead=docBytes.toString('utf8').split('</head>')[0];
const modules=[...docHead.matchAll(/<script\b[^>]*\btype="module"[^>]*\bsrc="(\/assets\/index-[^"]+\.js)"[^>]*>/g)];
assert.equal(modules.length,1,'physical active Rarity Round module');
const entryPath=modules[0][1];
const indexBefore=save('index-before.bin',index());
const binding=write('qualified-input.json',{original:ORIGINAL,fixed:FIXED,controls:CONTROLS,fullUnit:tuple('public-cases.raw.json',fullUnit),source,page:PAGE,helper});
const report={version:1,status:'running',route:ROUTE,page:PAGE,helper,source,binding,fixture:fixtureBody,wire:specs,indexBefore,before,entryPath,journeys:[],
  limits:['Three fresh signed-out Chromium contexts on the exact normal built Rarity Round route.',
    'Date-only control holds the admitted fixture day, while timers and actual browser actions run normally.',
    '320 and 1280 cover late A while B remains pending. 390 covers late A after B already rendered. Each width uses one controlled delivery schedule.',
    'Both local POST acknowledgements and all fixture reads are intercepted. No provider writes, no third round, no run completion and no live crowd-data or hardware-touch claim.']};
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function wait(get,label,ms=15000){
  const until=Date.now()+ms;
  for(;;){const value=await get();if(value)return value;assert(Date.now()<until,label);await pause(30);}
}
async function reservePort(){
  const sock=createServer();
  await new Promise((resolve,reject)=>{sock.on('error',reject);sock.listen(0,'127.0.0.1',resolve);});
  const port=sock.address().port;
  await new Promise((resolve,reject)=>sock.close(error=>error?reject(error):resolve()));
  return port;
}
async function journey(browser,base,width,height){
  const id=String(width),caseKey=width===390?keys[1]:keys[0];
  const schedule=caseKey===keys[0]?['a','b']:['b','a'];
  const row={id,width,height,caseKey,schedule,status:'running',navigations:[],requests:[],responses:[],firstParty:[],errors:[],
    frames:[],actions:[],wheels:[],screenshots:[],deliveries:[]};
  report.journeys.push(row);
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,serviceWorkers:'block',reducedMotion:'reduce',timezoneId:'UTC'});
  let page;
  const tasks=new Set(),gates=new Map();
  const track=promise=>{
    tasks.add(promise);
    promise.then(()=>tasks.delete(promise),error=>{row.errors.push(String(error.stack||error));tasks.delete(promise);});
    return promise;
  };
  const frame=async name=>{
    const state=await page.evaluate(()=>{
      const main=document.querySelector('main#dukb-main'),words=node=>node?.textContent?.replace(/\s+/g,' ').trim()??'';
      const spans=[...main?.querySelectorAll('span')??[]].map(words);
      const paragraphs=[...main?.querySelectorAll('p')??[]];
      const rank=paragraphs.find(node=>/^Ranked \d+ of \d+ by fame in this category$/.test(words(node)));
      const crowd=paragraphs.find(node=>words(node).endsWith('What everyone else picked'))?.parentElement;
      const combo=main?.querySelector('input[role=combobox]');
      const list=combo?document.getElementById(combo.getAttribute('aria-controls')):null;
      const buttons=[...main?.querySelectorAll('button')??[]];
      const lock=buttons.find(button=>words(button)==='Lock in answer');
      const storage=area=>Object.fromEntries(Object.keys(area).sort().map(key=>[key,area.getItem(key)]));
      return {url:location.href,fixedAt:Date.now(),browserMs:performance.now(),visible:document.visibilityState,
        viewport:{width:innerWidth,height:innerHeight},scroll:{x:scrollX,y:scrollY},heading:words(main?.querySelector('h1')),
        phase:!main?'unmounted':rank?'revealed':combo?'playing':'other',
        round:spans.find(value=>/^Round \d+ of \d+$/.test(value))??null,
        prompt:paragraphs.map(words).find(value=>value==='Name a centre-forward'||value==='Name a right winger')??null,
        subtotal:spans.find(value=>value.includes('Rarity Round score so far:'))??null,
        result:rank?{answer:words(rank.previousElementSibling),rank:words(rank),points:Number(words(rank.nextElementSibling)),
          pointsLabel:words(rank.nextElementSibling?.nextElementSibling)}:null,
        crowd:crowd?[...crowd.children].slice(1).map(node=>{
          const [name,picks]=[...node.querySelectorAll('span')].map(words);
          return {name:name.replace(/^\d+\.\s*/,''),picks:Number.parseInt(picks,10)};
        }):null,
        next:buttons.some(button=>!button.disabled&&words(button)==='Next round'),lockEnabled:!!lock&&!lock.disabled,
        combo:combo?{value:combo.value,focus:document.activeElement===combo,expanded:combo.getAttribute('aria-expanded'),html:combo.outerHTML,
          options:[...list?.querySelectorAll('[role=option]')??[]].map(node=>({name:words(node.firstElementChild),text:words(node),html:node.outerHTML}))}:null,
        help:!!main?.querySelector('button[aria-label="How to play"]'),dialog:!!document.querySelector('[role=dialog]'),
        cookie:!!document.querySelector('[role=region][aria-label="Cookie choices"]'),html:main?.outerHTML??null,
        storage:{local:storage(localStorage),session:storage(sessionStorage)}};
    });
    const value={name,at:Date.now(),...state,pending:[...gates.keys()].filter(role=>!gates.get(role).releasedAt)};
    equal([value.url,value.visible,value.viewport,value.fixedAt],[base+ROUTE,'visible',{width,height},Date.parse(unit.instant)]);
    row.frames.push(write(id+'/frames/'+String(row.frames.length).padStart(2,'0')+'-'+name+'.json',value));
    return value;
  };
  const events=()=>page.evaluate(()=>window.__rarityNativeEvents);
  function geometry(locator){
    return locator.evaluate(el=>{
      const r=el.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,hit=document.elementFromPoint(x,y);
      const clip={left:0,top:0,right:innerWidth,bottom:innerHeight},ancestors=[];
      for(const node of document.querySelectorAll('header,[data-site-chrome]')){
        if(node.contains(el)||el.contains(node))continue;
        const style=getComputedStyle(node),box=node.getBoundingClientRect();
        if(!['fixed','sticky'].includes(style.position)||box.width<innerWidth/2||!box.height)continue;
        if(box.top<=2&&box.bottom>0)clip.top=Math.max(clip.top,box.bottom);
        if(box.bottom>=innerHeight-2&&box.top<innerHeight)clip.bottom=Math.min(clip.bottom,box.top);
      }
      for(let p=el.parentElement;p;p=p.parentElement){
        if(p===document.scrollingElement)continue;
        const css=getComputedStyle(p),box=p.getBoundingClientRect(),flags=['auto','scroll','hidden','clip','overlay'];
        if(flags.includes(css.overflowX)){clip.left=Math.max(clip.left,box.x+p.clientLeft);clip.right=Math.min(clip.right,box.x+p.clientLeft+p.clientWidth);}
        if(flags.includes(css.overflowY)){clip.top=Math.max(clip.top,box.y+p.clientTop);clip.bottom=Math.min(clip.bottom,box.y+p.clientTop+p.clientHeight);}
        if(flags.includes(css.overflowX)||flags.includes(css.overflowY))ancestors.push({tag:p.tagName,overflowX:css.overflowX,overflowY:css.overflowY,scrollTop:p.scrollTop});
      }
      return {rect:{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom},center:{x,y},clip,ancestors,
        scroll:{x:scrollX,y:scrollY},viewport:{width:innerWidth,height:innerHeight},hit:hit===el||el.contains(hit),
        enabled:!el.matches(':disabled')&&el.getAttribute('aria-disabled')!=='true',tag:el.tagName,text:el.textContent.replace(/\s+/g,' ').trim()};
    });
  }
  async function prepare(locator,label){
    assert.equal(await locator.count(),1,label+' unique');
    for(let attempt=0;attempt<12;attempt++){
      const g=await geometry(locator),{rect:r,clip:c}=g;
      if(g.hit&&g.enabled&&r.width>0&&r.height>0&&r.x>=c.left&&r.right<=c.right&&r.y>=c.top&&r.bottom<=c.bottom)return g;
      assert(r.width>0&&r.height>0&&r.x>=c.left&&r.right<=c.right&&c.bottom>c.top,label+' horizontally available');
      const delta=Math.round(r.y<c.top?r.y-c.top-12:r.bottom>c.bottom?r.bottom-c.bottom+12:0);
      assert(delta,label+' measured vertical positioning needed');
      const x=Math.max(2,Math.min(width-2,g.center.x)),y=Math.max(2,Math.min(height-2,(c.top+c.bottom)/2));
      const count=(await events()).length;
      await page.mouse.move(x,y);await page.mouse.wheel(0,delta);
      const wheelEvents=await wait(async()=>{const found=(await events()).slice(count).filter(event=>event.type==='wheel');return found.length?found:null;},label+' trusted wheel');
      assert(wheelEvents.every(event=>event.trusted&&event.deltaMode===0));
      assert.equal(wheelEvents.reduce((sum,event)=>sum+event.deltaY,0),delta);
      await pause(45);
      row.wheels.push({label,attempt,x,y,delta,before:g,after:await geometry(locator),events:wheelEvents});
    }
    throw Error(label+' never fit native hit target');
  }
  async function click(locator,label){
    const layout=await prepare(locator,label),start=(await events()).length;
    const before=await frame(label+'-before');
    await page.mouse.click(layout.center.x,layout.center.y);
    const observed=await wait(async()=>{
      const found=(await events()).slice(start).filter(event=>['pointerdown','pointerup','click'].includes(event.type));
      return found.length>=3?found:null;
    },label+' trusted pointer receipt');
    equal(observed.map(event=>event.type),['pointerdown','pointerup','click']);
    assert(observed.every(event=>event.trusted&&event.pointerType==='mouse'&&event.tag===layout.tag&&event.text===layout.text));
    assert(Math.abs(observed[2].x-layout.center.x)<=1&&Math.abs(observed[2].y-layout.center.y)<=1);
    const after=await frame(label+'-after');
    row.actions.push({label,method:'mouse',before:before.name,after:after.name,layout,events:observed});
    return after;
  }
  async function key(locator,label){
    const layout=await prepare(locator,label);
    const before=await frame(label+'-before'),start=(await events()).length;
    assert(before.combo?.focus&&before.combo.options.length===1,label+' actual combo and unique option');
    await page.keyboard.press('Enter');
    const observed=(await events()).slice(start).filter(event=>event.type==='keydown'||event.type==='keyup');
    equal(observed.map(event=>[event.type,event.key,event.trusted]),[['keydown','Enter',true],['keyup','Enter',true]]);
    equal([observed[0].tag,observed[0].role],['INPUT','combobox']);
    const after=await frame(label+'-after');
    assert(after.lockEnabled);
    row.actions.push({label,method:'keyboard',key:'Enter',before:before.name,after:after.name,layout,events:observed});
  }
  async function type(locator,text,label){
    const layout=await prepare(locator,label);
    const before=await frame(label+'-before'),start=(await events()).length;
    assert(before.combo?.focus&&before.combo.value==='',label+' empty focused combo');
    await page.keyboard.insertText(text);
    const observed=(await events()).slice(start).filter(event=>event.type==='input');
    equal(observed.map(event=>[event.trusted,event.tag,event.role,event.data,event.value]),[[true,'INPUT','combobox',text,text]]);
    const after=await frame(label+'-after');
    assert.equal(after.combo?.value,text);
    row.actions.push({label,method:'typing',text,before:before.name,after:after.name,layout,events:observed});
  }
  function reveal(value,side,crowd){
    const f=fixture[side];
    equal([value.phase,value.round,value.prompt,value.subtotal,value.result,value.crowd,value.next,value.combo],
      ['revealed','Round '+(side==='a'?1:2)+' of 5',f.prompt,'· Rarity Round score so far: '+(side==='a'?80:120),
        {answer:f.answer,rank:'Ranked '+f.rank+' of 6 by fame in this category',points:f.points,pointsLabel:'points (lower is better)'},crowd,true,null],value.name);
  }
  async function photo(locator,label,marker){
    const layout=await prepare(locator,'photo-'+label),before=await frame(label+'-photo-before');
    const png=await page.screenshot({fullPage:false,animations:'allow',caret:'initial',timeout:10000});
    equal([png.readUInt32BE(16),png.readUInt32BE(20)],[width,height]);
    const after=await frame(label+'-photo-after');
    for(const value of [before,after]){
      reveal(value,'b',marker.crowd);
      equal([value.pending,value.storage],[marker.pending,marker.storage]);
    }
    row.screenshots.push({...save(id+'-'+label+'.png',png),label,before:before.name,after:after.name,layout});
  }
  function gate(role){
    let finish;
    const ready=new Promise(resolve=>{finish=resolve;});
    const value={role,ready,finish};
    assert(!gates.has(role),role+' unique outstanding wire');
    gates.set(role,value);
    return value;
  }
  async function release(side){
    const role=side+'-crowd',value=gates.get(role);
    assert(value&&!value.releasedAt,role+' must be held first');
    value.releasedAt=Date.now();
    const receipt={role,at:value.releasedAt,beforeResponses:row.responses.filter(item=>item.role===role).length};
    assert.equal(receipt.beforeResponses,0);
    row.deliveries.push(receipt);
    value.finish(true);
    await wait(()=>row.responses.some(item=>item.role===role),role+' actual browser response body');
    await page.evaluate(async()=>{
      for(let i=0;i<2;i++)await new Promise(resolve=>{
        const channel=new MessageChannel();
        channel.port1.onmessage=()=>{channel.port1.close();channel.port2.close();resolve();};
        channel.port2.postMessage(0);
      });
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    });
  }
  try{
    await context.routeWebSocket('**/*',socket=>{row.errors.push('Unexpected WebSocket intent');socket.close();});
    await context.route('**/*',route=>track((async()=>{
      const request=route.request(),url=new URL(request.url()),method=request.method();
      if(url.origin===base){
        assert(['GET','HEAD'].includes(method)&&!request.postDataBuffer());
        await route.continue();return;
      }
      const headers=request.headers(),query=[...url.searchParams],requestBody=request.postDataBuffer()?.toString('utf8')??null;
      const item={at:Date.now(),url:url.href,method,query,requestBody,outcome:'blocked'};
      row.requests.push(item);
      const preflightMethod=headers['access-control-request-method'];
      if(method==='OPTIONS'&&url.origin===backend&&['GET','POST'].includes(preflightMethod)){
        const matches=specs.filter(spec=>spec.method===preflightMethod&&new URL(spec.url).pathname===url.pathname&&
          JSON.stringify([...query].sort())===JSON.stringify([...spec.query].sort()));
        if(matches.length){
          assert.equal(requestBody,null);
          await route.fulfill({status:204,headers:{'access-control-allow-origin':base,'access-control-allow-methods':preflightMethod+',OPTIONS',
            'access-control-allow-headers':headers['access-control-request-headers']??''}});
          item.outcome='local-cors';item.forMethod=preflightMethod;return;
        }
      }
      const spec=lookup(url,method,requestBody);
      if(spec){
        assert.equal(headers.origin,base);
        item.role=spec.role;item.body=spec.body;
        assert.equal(row.requests.filter(candidate=>candidate.role===spec.role).length,1,spec.role+' one request');
        if(spec.role.endsWith('-crowd')){
          const held=gate(spec.role);
          item.heldAt=Date.now();item.outcome='held-local';
          if(!await held.ready){item.outcome='cancelled';await route.abort();return;}
          item.releaseAt=held.releasedAt;
        }
        item.outcome='local-fixture';
        const body=read(out,spec.body.file);
        await route.fulfill({status:spec.status,contentType:'application/json',headers:{'access-control-allow-origin':base,'content-length':String(body.length)},body});
        item.fulfilledAt=Date.now();return;
      }
      const background=url.origin===backend&&['/rest/v1/live_scores','/rest/v1/game_completions'].includes(url.pathname)&&
        (method==='GET'||method==='OPTIONS'&&preflightMethod==='GET');
      const staticRead=method==='GET'&&((url.hostname==='fonts.googleapis.com'&&url.pathname==='/css2')||
        (url.hostname==='fonts.gstatic.com'&&url.pathname.startsWith('/s/'))||
        (url.hostname==='flagcdn.com'&&/^\/w(?:20|40|80|160|320)\/(?:[a-z]{2}|gb-(?:eng|sct|wls|nir))\.png$/.test(url.pathname)&&!url.search));
      await route.abort();
      assert(background||staticRead,'Undeclared refused transport '+method+' '+url.origin+url.pathname);
    })().catch(async error=>{try{await route.abort();}catch{}throw error;})));
    page=await context.newPage();
    page.on('pageerror',error=>row.errors.push(String(error.stack||error)));
    page.on('framenavigated',frame=>{if(frame===page.mainFrame())row.navigations.push({at:Date.now(),url:frame.url()});});
    page.on('response',response=>track((async()=>{
      const url=new URL(response.url()),request=response.request(),method=request.method();
      if(url.origin===base&&method==='GET'){
        const file=url.pathname===ROUTE?docPath:url.pathname==='/'?'dist/index.html':'dist'+decodeURIComponent(url.pathname);
        const expected=builtByName.get(file);
        assert(expected&&response.status()===200,'exact physical first-party body '+file);
        const body=await response.body(),actual=tuple(file,body);
        equal(actual,expected);
        row.firstParty.push({url:url.href,status:response.status(),type:request.resourceType(),body:actual});
      }else{
        const spec=lookup(url,method,request.postDataBuffer()?.toString('utf8')??null);
        if(!spec)return;
        assert.equal(response.status(),spec.status);
        let bytes;
        if(method==='POST'){
          assert.equal(await response.finished(),null);
          assert.equal(response.headers()['content-length'],'0');
          bytes=Buffer.alloc(0);
        }else bytes=await response.body();
        assert(bytes.equals(read(out,spec.body.file)));
        row.responses.push({at:Date.now(),role:spec.role,url:url.href,method,status:response.status(),body:tuple(spec.body.file,bytes)});
      }
    })()));
    await page.addInitScript(()=>{
      const tape=[];
      Object.defineProperty(window,'__rarityNativeEvents',{value:tape,writable:false});
      for(const type of ['pointerdown','pointerup','click','wheel','keydown','keyup','input'])document.addEventListener(type,event=>{
        const target=event.target?.closest?.('button,input')??event.target;
        tape.push({type,browserMs:performance.now(),trusted:event.isTrusted,pointerType:event.pointerType??null,key:event.key??null,data:event.data??null,
          tag:target?.tagName??null,role:target?.getAttribute?.('role')??null,text:target?.textContent?.replace(/\s+/g,' ').trim().slice(0,240)??null,
          value:target instanceof HTMLInputElement?target.value:null,x:event.clientX??null,y:event.clientY??null,deltaY:event.deltaY??null,deltaMode:event.deltaMode??null});
      },{capture:true,passive:true});
    });
    await page.clock.setFixedTime(new Date(unit.instant));
    const response=await page.goto(base+ROUTE,{waitUntil:'domcontentloaded'});
    assert.equal(response?.status(),200);
    const main=page.locator('main#dukb-main');
    const reject=page.getByRole('region',{name:'Cookie choices',exact:true}).getByRole('button',{name:'Reject all',exact:true});
    const combo=main.getByRole('combobox',{name:'Search for a player...',exact:true});
    const lock=main.getByRole('button',{name:'Lock in answer',exact:true});
    const next=main.getByRole('button',{name:'Next round',exact:true});
    const crowd=main.getByText('👥 What everyone else picked',{exact:true});
    const bRank=main.getByText('Ranked 4 of 6 by fame in this category',{exact:true});
    const heading=main.getByRole('heading',{level:1,name:'RARITY ROUND',exact:true});
    await wait(async()=>await heading.count()===1&&await heading.isVisible()&&await reject.count()===1&&await reject.isVisible(),
      'actual Rarity heading and real cookie choice');
    await click(reject,'reject-cookies');
    await wait(async()=>await reject.count()===0&&await combo.count()===1&&await combo.isVisible(),'real first round');
    const ready=await frame('a-playing');
    const consent=JSON.parse(ready.storage.local['cookie-consent-v2']);
    equal([ready.phase,ready.heading,ready.round,ready.prompt,ready.help,ready.dialog,ready.cookie,consent.version,consent.analytics,consent.advertising],
      ['playing','RARITY ROUND','Round 1 of 5',fixture.a.prompt,true,false,false,2,false,false]);
    assert(ready.html.includes("Today's categories, 2026-11-12"));
    async function submit(side){
      const name=fixture[side].answer,role=side+'-crowd';
      await wait(async()=>await combo.count()===1&&await combo.isVisible(),'actual '+side+' combo');
      await click(combo,'focus-'+side);
      await wait(async()=>await combo.count()===1&&await combo.evaluate(node=>node===document.activeElement),'actual focused '+side+' combo');
      await type(combo,name,'type-'+side);
      const options=main.getByRole('option');
      await wait(async()=>await options.count()===1&&await options.first().evaluate(node=>node.firstElementChild?.textContent?.trim())===name,'actual unique '+side+' option');
      const option=await frame(side+'-option');
      equal(option.combo.options.map(row=>row.name),[name]);
      await key(combo,'select-'+side);
      await click(lock,'lock-'+side);
      await wait(()=>gates.has(role)&&!row.responses.some(item=>item.role===role),role+' actual deferred GET');
      await wait(()=>row.responses.some(item=>item.role===side+'-insert'),side+' actual local POST acknowledgement');
      const revealed=await frame(side+'-revealed-held');
      reveal(revealed,side,null);
      return revealed;
    }
    const aHeld=await submit('a');
    equal(aHeld.pending,['a-crowd']);
    await click(next,'next-round');
    await wait(async()=>await combo.count()===1&&await combo.isVisible(),'real next round while old GET held');
    const bPlaying=await frame('b-playing');
    equal([bPlaying.phase,bPlaying.round,bPlaying.prompt,bPlaying.subtotal,bPlaying.pending],
      ['playing','Round 2 of 5',fixture.b.prompt,'· Rarity Round score so far: 80',['a-crowd']]);
    const bHeld=await submit('b');
    equal(bHeld.pending,['a-crowd','b-crowd']);
    await photo(bRank,'b-both-held',bHeld);
    const delivered=new Set();
    for(const [index,side] of schedule.entries()){
      await release(side);
      delivered.add(side);
      if(delivered.has('b'))await wait(async()=>await crowd.count()===1&&await crowd.isVisible(),'real current crowd shown');
      const observed=await frame('delivered-'+side);
      reveal(observed,'b',delivered.has('b')?currentCrowd:null);
      equal(observed.pending,index===0?[schedule[1]+'-crowd']:[]);
      equal(observed.storage,ready.storage);
      await photo(delivered.has('b')?crowd:bRank,index?'b-after-second':'b-after-first',observed);
    }
    row.checkpoints={aPlaying:ready.name,aHeld:aHeld.name,bPlaying:bPlaying.name,bHeld:bHeld.name,first:'delivered-'+schedule[0],second:'delivered-'+schedule[1]};
    await wait(()=>tasks.size===0,'all request/response bodies settled');
    equal(row.responses.map(item=>item.role).sort(),[...roles].sort());
    equal(row.deliveries.map(item=>item.role),schedule.map(side=>side+'-crowd'));
    equal([row.frames.length,row.actions.length,row.screenshots.length],[34,10,3]);
    assert(row.firstParty.some(item=>item.url===base+ROUTE&&item.type==='document'&&item.body.file===docPath));
    assert(row.firstParty.some(item=>item.url===base+'/prerender-boot.js'&&item.type==='script'&&item.body.file==='dist/prerender-boot.js'));
    assert(row.firstParty.some(item=>item.url===base+entryPath&&item.type==='script'&&item.body.file==='dist'+entryPath));
    assert(row.firstParty.some(item=>item.type==='script'&&/^dist\/assets\/RarityRound-[^/]+\.js$/.test(item.body.file)));
    assert(row.navigations.length>0&&row.navigations.every(item=>item.url===base+ROUTE));
    equal(row.errors,[]);
    row.status='passed';
  }catch(error){
    row.status='failed';row.error=String(error.stack||error);
    if(page)try{await frame('failure');}catch(capture){row.errors.push(String(capture.stack||capture));}
    throw error;
  }finally{
    for(const value of gates.values())if(!value.releasedAt)value.finish(false);
    if(page)try{row.events=await events();}catch(error){row.errors.push(String(error.stack||error));}
    await Promise.allSettled([...tasks]);
    await context.close();
  }
}

let host,browser;
try{
  const port=await reservePort(),base='http://127.0.0.1:'+port;
  report.base=base;
  host=spawn(process.execPath,['scripts/lib/hostLikeServer.mjs','dist',String(port)],{cwd:ROOT,stdio:['ignore','pipe','pipe']});
  let stdout='',stderr='';
  host.stdout.on('data',bytes=>{stdout+=String(bytes);});host.stderr.on('data',bytes=>{stderr+=String(bytes);});
  host.on('error',error=>{report.hostError=String(error.stack||error);});
  await wait(()=>stdout.includes('host-like server:')||report.hostError,'physical dist loopback startup');
  assert(!report.hostError);
  report.host={stdout,stderr};
  browser=await pw.chromium.launch({headless:true});
  report.chromium=browser.version();
  const outcomes=await Promise.allSettled(widths.map(([width,height])=>journey(browser,base,width,height)));
  const failed=outcomes.find(outcome=>outcome.status==='rejected');
  if(failed)throw failed.reason;
  equal(report.journeys.map(row=>[row.width,row.height]),widths);
  assert(report.journeys.every(row=>row.status==='passed'&&row.errors.length===0));
  const sum=get=>report.journeys.reduce((n,row)=>n+get(row),0);
  report.census={journeys:3,contexts:3,viewportPNGs:sum(row=>row.screenshots.length),
    oldWhileCurrentPending:sum(row=>Number(row.caseKey===keys[0])),oldAfterCurrentSettled:sum(row=>Number(row.caseKey===keys[1])),
    roundsRevealed:sum(row=>row.frames.filter(ref=>/-(a|b)-revealed-held\.json$/.test(ref.file)).length),
    roundAdvances:sum(row=>row.actions.filter(action=>action.label==='next-round').length),
    crowdReads:sum(row=>row.responses.filter(item=>item.role.endsWith('-crowd')).length),
    localPickInserts:sum(row=>row.responses.filter(item=>item.role.endsWith('-insert')).length),
    completionAttempts:sum(row=>row.requests.filter(item=>item.method==='POST'&&new URL(item.url).pathname==='/rest/v1/game_completions').length),
    frames:sum(row=>row.frames.length),actions:sum(row=>row.actions.length),mouseActions:sum(row=>row.actions.filter(action=>action.method==='mouse').length),
    keyboardActions:sum(row=>row.actions.filter(action=>action.method==='keyboard').length),typingActions:sum(row=>row.actions.filter(action=>action.method==='typing').length),
    wheels:sum(row=>row.wheels.length),navigations:sum(row=>row.navigations.length),firstPartyResponses:sum(row=>row.firstParty.length),
    poolReads:sum(row=>row.responses.filter(item=>item.role.endsWith('-pool')).length),
    searchReads:sum(row=>row.responses.filter(item=>item.role.includes('-search-')).length),
    corsPreflights:sum(row=>row.requests.filter(item=>item.outcome==='local-cors').length)};
  equal([report.census.roundsRevealed,report.census.completionAttempts],[6,0]);
  report.status='passed';
}catch(error){
  report.status='failed';report.error=String(error.stack||error);
  throw error;
}finally{
  if(browser)try{await browser.close();}catch(error){report.status='failed';report.closeError=String(error.stack||error);}
  if(host)host.kill();
  try{
    report.after={source:tracked(),dist:built(),locks:locks(),installed:installed(),offline:offline()};
    equal(report.after,before);
    report.indexAfter=save('index-after.bin',index());
    assert(read(out,report.indexBefore.file).equals(read(out,report.indexAfter.file)));
    assert(read(full,'public-cases.raw.json').equals(fixedUnit));
    git('diff','--exit-code','HEAD','--','.');
    report.holds={source:true,dist:true,locks:true,installed521:true,offline:true,index:true,fullUnitLiteral:true};
  }catch(error){report.status='failed';report.holdError=String(error.stack||error);}
  report.raw=write('raw.json',{version:1,route:ROUTE,page:PAGE,helper,binding,fixture:fixtureBody,wire:specs,
    journeys:report.journeys.map(row=>({...row,frames:row.frames.map(ref=>json(out,ref.file))}))});
  write('report.json',report);
  const bodies=walk(out).map(file=>tuple(file,read(out,file)));
  write('body-manifest.json',{version:1,files:bodies,filesCount:bodies.length,bodyBytes:bodies.reduce((n,row)=>n+row.bytes,0)});
}
assert.equal(report.status,'passed',report.holdError??report.closeError??'native evidence and final holds');
