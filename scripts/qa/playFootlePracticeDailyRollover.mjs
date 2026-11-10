// Remote Chromium evidence for Footle's saved Practice round at Eastern midnight.
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync,spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {fileURLToPath} from 'node:url';
import pw from '../lib/playwrightLoader.mjs';
import {frozenMarketRows} from './footle995-fixtures.mjs';

const PAGE='fe0b9bd8896d6f8888b0bbd860cede4e0a2c304c',HOOK='17fc817ad6873a09a9bac08d01174a40687d6a8b';
const FIXED={"run":42762361123,"artifact":13738475972,"head":"8182fa2db6e7ae1b36e95b9fcf187d7173a382a9","tree":"dc1eca03ab8a7f543f6413a6b0700c574cc585bf","zipBytes":2027497,"zipSHA256":"14f5421845e706302280d44f268558a297fde19b5e692683e31f5f56d46fd202","rawBytes":400361,"rawSHA256":"2144a7989776a6847d384e828fbeaf69a523a7da64ca2d4a13c4560745839788"},CONTROLS={"run":42762970118,"artifact":13738333067,"head":"3d2e49351089708ef3be747d602b59c320ebbf16","tree":"36fc4b5abda4bc4c65fa3ec501b52fda97530c51","zipBytes":4096348,"zipSHA256":"9e069f57bec9794ddb67e954078cc1e686530ae9df07ad7bd06b000e06b83f93","admissionBytes":5831,"admissionSHA256":"9b04f2c40c4e3bc65af35e5bb84460b17fbc5833ba94c966e27e94c23f2b4f4c"};
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const ROUTE='/footle',pageFile='src/pages/Footle.tsx',hookFile='src/hooks/useGame.ts';
const helperFile='scripts/qa/playFootlePracticeDailyRollover.mjs';
const workflowFile='.github/workflows/footle-practice-daily-rollover-20261107.yml';
const widths=[[320,568],[390,844],[1280,900]];
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const blob=bytes=>createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
const read=(...parts)=>fs.readFileSync(path.join(...parts));
const json=(...parts)=>JSON.parse(read(...parts));
const tuple=(file,bytes)=>({file,bytes:bytes.length,sha256:sha(bytes)});
const equal=assert.deepEqual;
const env=process.env;
assert(env.CI&&env.SIM_NETWORK==='offline'&&process.versions.node==='24.22.1');
equal([env.FOOTLE_PRACTICE_ROLLOVER_PAGE_BLOB,env.FOOTLE_PRACTICE_ROLLOVER_HOOK_BLOB],[PAGE,HOOK]);
function absoluteOutput(key){
  const value=env[key];
  assert(value&&path.isAbsolute(value)&&path.resolve(value).startsWith(ROOT+path.sep),key+' absolute path inside checkout');
  return path.resolve(value);
}
const out=absoluteOutput('FOOTLE_PRACTICE_ROLLOVER_BROWSER_OUT');
const full=absoluteOutput('FOOTLE_PRACTICE_ROLLOVER_FULL_UNIT');
const fixed=absoluteOutput('FOOTLE_PRACTICE_ROLLOVER_FIXED_REFERENCE');
const controls=absoluteOutput('FOOTLE_PRACTICE_ROLLOVER_CONTROLS_REFERENCE');
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
assert(fullUnit.equals(fixedUnit),'whole fresh RAW equals completed fixed run');
const controlBody=read(controls,'packet','admission.json');
equal([controlBody.length,sha(controlBody)],[CONTROLS.admissionBytes,CONTROLS.admissionSHA256]);
const custody=json(full,'packet-custody.json'),sourceJoin=json(full,'source-join.json');
assert.equal(custody.status,'passed');
for(const [role,pin] of [['fixed',FIXED],['controls',CONTROLS]])
  for(const key of ['run','artifact','head','tree','zipBytes','zipSHA256']) assert.equal(custody[role][key],pin[key]);
const head=git('rev-parse','HEAD').trim(),tree=git('rev-parse','HEAD^{tree}').trim();
assert.equal(head,env.GITHUB_SHA);
equal(git('rev-list','--parents','-n','1','HEAD').trim().split(' '),[head,FIXED.head]);
assert.equal(git('rev-parse',FIXED.head+'^{tree}').trim(),FIXED.tree);
const helper=git('rev-parse','HEAD:'+helperFile).trim(),workflow=git('rev-parse','HEAD:'+workflowFile).trim();
equal(git('diff','--name-status',FIXED.head,'HEAD').trim().split('\n').sort(),['A\t'+helperFile,'M\t'+workflowFile].sort());
const source={head,tree,workflow,trackedBodies:5795,scopedSourceRows:4666,heldFixedRows:5793,rootConfigurations:11,distBodies:850,installedVersions:521};
equal([sourceJoin.status,sourceJoin.head,sourceJoin.tree,sourceJoin.workflowBlob,sourceJoin.helperBlob,
  sourceJoin.trackedRows,sourceJoin.sourceRows,sourceJoin.heldFixedRows,sourceJoin.rootConfigurations.length],
  ['passed',head,tree,workflow,helper,5795,4666,5793,11]);
const pins={
  [pageFile]:PAGE,[hookFile]:HOOK,[helperFile]:helper,
  'scripts/qa/footle995-fixtures.mjs':'f3fd46948a0b40b1f908a08c8cb05cfd86a5e2e2',
  'src/lib/fetchFootlePlayerPool.ts':'356adf65dd26f3a9e7001214bc1e194d7828d0dd',
  'src/lib/dateUtils.ts':'12c9de0ed37b0797492f3e936bcba70bdc03d585',
  'src/hooks/useDailyPuzzle.ts':'b8a0d6ba268efe0e728c4ee96fbc6c60fcc73846',
  'public/footle/index.html':'a54dc5d7b9c7743ca4c45b13244b51a57597672e',
};
for(const [file,oid] of Object.entries(pins))assert.equal(blob(read(ROOT,file)),oid,file);
const before={source:tracked(),dist:built(),locks:locks(),installed:installed(),offline:offline()};
equal(before.source,json(full,'tracked-before.json'));
equal(before.dist,json(full,'dist-before.json'));
equal(before.installed,json(full,'installed-before.json'));
const builtByName=new Map(before.dist.map(row=>[row.file,row]));
const docPath='dist/footle/index.html',docBytes=read(ROOT,docPath);
const entries=body=>[...body.toString('utf8').matchAll(/<script\b[^>]*\btype="module"[^>]*\bsrc="(\/assets\/index-[^"]+\.js)"[^>]*>/g)].map(row=>row[1]);
const direct=entries(docBytes),boot=direct.length===0;
assert(direct.length<=1);
if(boot)assert(/<script\b[^>]*\bsrc="\/prerender-boot\.js(?:\?[^"]*)?"/.test(docBytes.toString('utf8')));
const appEntries=boot?entries(read(ROOT,'dist/index.html')):direct;
assert.equal(appEntries.length,1);
const entryPath=appEntries[0];

const dates={a:'2026-11-08T04:59:59.000Z',b:'2026-11-08T05:00:01.000Z'};
const days={a:'2026-11-07',b:'2026-11-08'};
const named=n=>'Practice Fixture Famous '+String(n).padStart(3,'0');
const answerA=named(83),answerB=named(81),dailyMiss=named(1),practiceMiss=named(2);
const hard=Array.from({length:6},(_,i)=>named(81+i));
const runKey='footle-practice-run-v1',unlimitedKey='footle-unlimited-session-v1',guestKey='dukb-guest-handle';
const recordKeys=['dukb-local-completions','dukb-streaks-v1','dukb-play-diary-v1'];
const dailyKey=side=>'footle-daily-'+days[side];
const pendingText="Checking today's Daily...",pausedText="Finish today's Daily to resume this puzzle.";
const backend='https://flawuiqbvjobmkfkauhw.supabase.co';
const market='/rest/v1/player_market_values',completions='/rest/v1/game_completions',standing='/rest/v1/rpc/daily_score_standing';
const marketSource=read(ROOT,'src/lib/fetchFootlePlayerPool.ts').toString('utf8');
const clubMap=marketSource.match(/export const INSANE_CLUB_LEAGUE[^=]*=\s*\{([\s\S]*?)\n\};/);
assert(clubMap);
const cleanClubMap=clubMap[1].replace(/\/\/[^\n]*/g,'');
const clubNames=[...cleanClubMap.matchAll(/^\s*'([^']+)'\s*:|,\s*'([^']+)'\s*:/gm)].map(row=>row[1]??row[2]);
assert.equal(clubNames.length,137);assert.equal(new Set(clubNames).size,137);
assert(clubNames.includes('Udinese Calcio')&&clubNames.every(name=>!/[,()]/.test(name)));
const mid=Math.ceil(clubNames.length/2),chunks=[clubNames.slice(0,mid),clubNames.slice(mid)];
const fields='player_name,position,age,nationality,club,market_value_usd,goals,assists';
const frozen=frozenMarketRows(),fixtureRows={famous:frozen.famous.slice(0,86),obscure:frozen.obscure};
assert.equal(fixtureRows.famous.length,86);assert.equal(fixtureRows.obscure.length,12);
const fixedBodies={
  famous:save('wire/famous.json',Buffer.from(JSON.stringify(fixtureRows.famous))),
  'obscure-1':save('wire/obscure-1.json',Buffer.from(JSON.stringify(chunks[0].includes('Udinese Calcio')?fixtureRows.obscure:[]))),
  'obscure-2':save('wire/obscure-2.json',Buffer.from(JSON.stringify(chunks[1].includes('Udinese Calcio')?fixtureRows.obscure:[]))),
  empty:save('wire/empty.json',Buffer.from('[]')),
};
const indexBefore=save('index-before.bin',index());
const binding=write('qualified-input.json',{fixed:FIXED,controls:CONTROLS,fullUnit:tuple('public-cases.raw.json',fullUnit),source,page:PAGE,hook:HOOK,helper});
const report={version:1,status:'running',route:ROUTE,page:PAGE,hook:HOOK,helper,source,binding,entryPath,boot,indexBefore,before,
  fixture:{dates,days,answerA,answerB,dailyMiss,practiceMiss,hard,clubChunks:chunks,bodies:fixedBodies},journeys:[],
  limits:['Fresh signed-out Chromium contexts with a distinct Page on each side of Eastern midnight.',
    'Date held per document. No storage seed, RNG override, provider forwarding, live-tab or signed-in claim.',
    'Native pointer and typing. The actual Daily completion write is locally aborted. Standings and badge reads are fulfilled locally.']};

const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function wait(check,label,ms=15000){
  const end=Date.now()+ms;
  while(Date.now()<end){
    const value=await check();
    if(value)return value;
    await pause(25);
  }
  throw Error('Timed out waiting for '+label);
}
const sameQuery=(a,b)=>JSON.stringify([...a].sort())===JSON.stringify([...b].sort());
const marketCommon=[['select',fields],['year','eq.2026'],['age','not.is.null'],['order','market_value_usd.desc,player_name.asc']];
const queries={
  famous:[...marketCommon,['limit','300']],
  ...Object.fromEntries(chunks.map((chunk,i)=>['obscure-'+(i+1),[...marketCommon,['limit','1000'],
    ['market_value_usd','gt.0'],['market_value_usd','lt.8000000'],['club','in.('+chunk.join(',')+')']]])),
};
const badgesQuery=guest=>[['select','game,completed_on'],['player_name','eq.'+guest],['order','completed_on.desc'],['limit','500']];
const marketRole=url=>Object.keys(queries).find(key=>sameQuery(url.searchParams,queries[key]));
function roleOf(url,method,guest){
  if(url.origin!==backend)return null;
  if(url.pathname===market&&method==='GET')return marketRole(url);
  if(url.pathname===completions&&method==='POST'&&!url.search)return 'completion';
  if(url.pathname===standing&&method==='POST'&&!url.search)return 'standing';
  if(url.pathname===completions&&method==='GET'&&guest&&sameQuery(url.searchParams,badgesQuery(guest)))return 'badge-history';
  return null;
}
function refusedRead(url,method,forMethod){
  const background=url.origin===backend&&url.pathname==='/rest/v1/live_scores'&&(method==='GET'||method==='OPTIONS'&&forMethod==='GET');
  const staticRead=method==='GET'&&((url.hostname==='fonts.googleapis.com'&&url.pathname==='/css2')||
    (url.hostname==='fonts.gstatic.com'&&url.pathname.startsWith('/s/'))||
    (url.hostname==='flagcdn.com'&&/^\/w(?:20|40|80|160|320)\/(?:[a-z]{2}|gb-(?:eng|sct|wls|nir))\.png$/.test(url.pathname)&&!url.search));
  return background||staticRead;
}
const frameBodies={};
async function journey(browser,base,width,height){
  const id=String(width),row={id,width,height,status:'running',documents:[],navigations:[],frames:[],actions:[],wheels:[],
    screenshots:[],requests:[],responses:[],firstParty:[],storageEvents:[],events:[],errors:[],release:null};
  report.journeys.push(row);
  frameBodies[id]=[];
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,serviceWorkers:'block',reducedMotion:'reduce',timezoneId:'UTC'});
  const sides=new Map(),tasks=new Set();
  let page,side,guest,allowB;
  const pendingB=new Promise(resolve=>{allowB=resolve;});
  const captureError=error=>row.errors.push(String(error.stack||error));
  const track=promise=>{
    tasks.add(promise);
    promise.then(()=>tasks.delete(promise),error=>{captureError(error);tasks.delete(promise);});
    return promise;
  };
  const reqSide=request=>sides.get(request.frame().page());
  const assets=file=>builtByName.has(file);
  const fileFor=url=>url.pathname===ROUTE?docPath:url.pathname==='/'?'dist/index.html':'dist'+decodeURIComponent(url.pathname);
  const roleCount=(document,role)=>row.requests.filter(r=>r.document===document&&r.role===role).length;
  const responseCount=(document,roles)=>row.responses.filter(r=>r.document===document&&roles.includes(r.role)).length;
  const heldRecords=frame=>Object.fromEntries(recordKeys.map(key=>[key,frame.storage.local[key]??null]));
  function assertNoPlay(frame){
    const records=heldRecords(frame),streak=JSON.parse(records['dukb-streaks-v1']),diary=JSON.parse(records['dukb-play-diary-v1']);
    equal([records['dukb-local-completions'],streak?.totalPlays??0,streak?.totalPoints??0,streak?.perGame?.footle??null,
      diary?.global.days??[],diary?.perGame?.footle??null],[null,0,0,null,[],null],frame.name);
  }
  const practice=frame=>JSON.parse(frame.storage.local[runKey]??'null');
  const frameBytes=frame=>frame.storage.local[runKey];
  const loadedMarkets=['famous','obscure-1','obscure-2'];
  const completionAttempts=()=>row.requests.filter(r=>r.role==='completion').length;

  async function frame(name){
    const value=await page.evaluate(()=>{
      const main=document.querySelector('main#dukb-main');
      const text=node=>node?.textContent?.replace(/\s+/g,' ').trim()??null;
      const buttons=[...main?.querySelectorAll('button')??[]];
      const actions=Object.fromEntries(['Give up','Yes, reveal it','Next puzzle','Resume five-puzzle run'].map(label=>
        [label,buttons.filter(button=>text(button)===label).map(button=>!button.disabled&&button.getAttribute('aria-disabled')!=='true')]));
      const p=main?.querySelector('[data-footle-practice]'),combo=main?.querySelector('input[role=combobox]');
      const stored=area=>Object.fromEntries(Object.keys(area).sort().map(key=>[key,area.getItem(key)]));
      const dates=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'})
        .formatToParts(new Date()).map(part=>[part.type,part.value]));
      return {url:location.href,fixedAt:Date.now(),day:dates.year+'-'+dates.month+'-'+dates.day,browserMs:performance.now(),
        timeOrigin:performance.timeOrigin,viewport:{width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth},
        scroll:{x:scrollX,y:scrollY},heading:text(main?.querySelector('h1')),
        mode:main?.querySelector('[data-footle-mode][aria-pressed=true]')?.getAttribute('data-footle-mode')??null,
        progress:text(p?.querySelector('[data-testid=practice-progress]')),practiceIndex:p?Number(p.getAttribute('data-practice-index')):null,
        practiceStatus:text(p?.querySelector('[role=status]')),practiceFeedback:text(p?.querySelector('[data-testid=practice-feedback] [role=status]')),
        practiceReceipt:text(p?.querySelector('[data-footle-practice-result]')),
        combo:combo?{value:combo.value,disabled:combo.disabled,focused:document.activeElement===combo}:null,
        actions,cookie:!!document.querySelector('[role=region][aria-label="Cookie choices"]'),dialog:!!document.querySelector('[role=dialog]'),
        mainText:text(main),html:document.documentElement.outerHTML,storage:{local:stored(localStorage),session:stored(sessionStorage)}};
    });
    const result={name,document:side,at:Date.now(),...value,
      heldB:row.requests.filter(r=>r.document==='b'&&r.outcome==='held').map(r=>r.role).sort(),completionAttempts:completionAttempts()};
    equal([result.url,result.fixedAt,result.day,result.viewport.width,result.viewport.height,result.heading],
      [base+ROUTE,Date.parse(dates[side]),days[side],width,height,'FOOTLE'],name);
    assert(result.viewport.scrollWidth<=width,name+' no horizontal overflow');
    assert(!row.frames.some(ref=>ref.name===name),name+' unique frame');
    const ref=write(id+'/frames/'+String(row.frames.length).padStart(3,'0')+'-'+name+'.json',result);
    row.frames.push({name,...ref});frameBodies[id].push(result);
    return result;
  }

  const browserEvents=()=>page.evaluate(()=>window.__footleEvents);
  async function geometry(locator){
    return locator.evaluate(el=>{
      const r=el.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,hit=document.elementFromPoint(x,y);
      const clip={left:0,top:0,right:innerWidth,bottom:innerHeight},ancestors=[];
      for(let p=el.parentElement;p;p=p.parentElement){
        if(p===document.scrollingElement)continue;
        const css=getComputedStyle(p),box=p.getBoundingClientRect(),flags=['auto','scroll','hidden','clip','overlay'];
        if(flags.includes(css.overflowX)){clip.left=Math.max(clip.left,box.x+p.clientLeft);clip.right=Math.min(clip.right,box.x+p.clientLeft+p.clientWidth);}
        if(flags.includes(css.overflowY)){clip.top=Math.max(clip.top,box.y+p.clientTop);clip.bottom=Math.min(clip.bottom,box.y+p.clientTop+p.clientHeight);}
        if(flags.includes(css.overflowX)||flags.includes(css.overflowY))ancestors.push({tag:p.tagName,overflowX:css.overflowX,overflowY:css.overflowY,scrollTop:p.scrollTop});
      }
      return {rect:{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom},center:{x,y},clip,ancestors,
        scroll:{x:scrollX,y:scrollY},viewport:{width:innerWidth,height:innerHeight},hit:hit===el||el.contains(hit),
        enabled:!el.matches(':disabled')&&el.getAttribute('aria-disabled')!=='true',tag:el.tagName,role:el.getAttribute('role'),
        text:el.textContent.replace(/\s+/g,' ').trim()};
    });
  }
  async function prepare(locator,label,operate=true){
    await wait(async()=>await locator.count()===1&&await locator.isVisible(),label+' unique visible control or photo anchor');
    for(let attempt=0;attempt<12;attempt++){
      const g=await geometry(locator),{rect:r,clip:c}=g;
      if((!operate||g.hit&&g.enabled)&&r.width>0&&r.height>0&&r.x>=c.left-1&&r.right<=c.right+1&&r.y>=c.top-1&&r.bottom<=c.bottom+1)return g;
      assert(r.width>0&&r.height>0&&r.x>=c.left-1&&r.right<=c.right+1&&c.bottom>c.top,label+' horizontally available');
      const delta=Math.round(r.y<c.top?r.y-c.top-12:r.bottom>c.bottom?r.bottom-c.bottom+12:0);
      assert(delta,label+' must reach the actual enabled hit target');
      const x=Math.max(2,Math.min(width-2,g.center.x)),y=Math.max(2,Math.min(height-2,(c.top+c.bottom)/2));
      const count=(await browserEvents()).length;
      await page.mouse.move(x,y);await page.mouse.wheel(0,delta);
      const observed=await wait(async()=>{
        const found=(await browserEvents()).slice(count).filter(event=>event.type==='wheel');
        return found.length?found:null;
      },label+' trusted wheel');
      assert(observed.every(event=>event.trusted&&event.deltaMode===0));
      assert.equal(observed.reduce((sum,event)=>sum+event.deltaY,0),delta);
      await pause(45);
      row.wheels.push({document:side,label,attempt,x,y,delta,before:g,after:await geometry(locator),events:observed});
    }
    throw Error(label+' did not fit after real scroll');
  }
  async function click(locator,label){
    await prepare(locator,label);
    const before=await frame(label+'-before'),start=(await browserEvents()).length;
    const layout=await prepare(locator,label);
    assert(layout.enabled&&layout.hit,label+' exact operated geometry');
    await page.mouse.click(layout.center.x,layout.center.y);
    const events=await wait(async()=>{
      const found=(await browserEvents()).slice(start).filter(e=>['pointerdown','pointerup','click'].includes(e.type));
      return found.length>=3?found:null;
    },label+' trusted pointer receipt');
    equal(events.map(e=>e.type),['pointerdown','pointerup','click']);
    assert(events.every(e=>e.trusted&&e.pointerType==='mouse'&&e.tag===layout.tag&&e.text===layout.text));
    const after=await frame(label+'-after');
    row.actions.push({document:side,label,method:'mouse',before:before.name,after:after.name,layout,events});
    return after;
  }
  const main=()=>page.locator('main#dukb-main');
  const combo=()=>main().getByRole('combobox',{name:'Search for a player',exact:true});
  const button=name=>main().getByRole('button',{name,exact:true});
  const mode=name=>main().locator('[data-footle-mode="'+name+'"]');
  async function guess(label,name){
    const input=combo();
    await click(input,label+'-focus');
    const before=await frame(label+'-type-before'),layout=await geometry(input),start=(await browserEvents()).length;
    equal(before.combo,{value:'',disabled:false,focused:true},label+' focused empty input');
    await page.keyboard.insertText(name);
    const events=(await browserEvents()).slice(start).filter(e=>e.type==='input');
    equal(events.map(e=>[e.trusted,e.tag,e.role,e.data,e.value]),[[true,'INPUT','combobox',name,name]]);
    const after=await frame(label+'-type-after');
    assert.equal(after.combo?.value,name);
    row.actions.push({document:side,label:label+'-type',method:'typing',before:before.name,after:after.name,layout,events,value:name});
    const option=main().getByRole('option').filter({has:page.getByText(name,{exact:true})});
    return click(option,label+'-pick');
  }
  async function giveUp(label){
    await click(button('Give up'),label+'-open');
    return click(button('Yes, reveal it'),label+'-confirm');
  }
  async function photo(anchor,label,verify){
    const layout=await prepare(anchor,'photo-'+label,false);
    const before=await frame(label+'-photo-before');verify(before);
    const body=await page.screenshot({fullPage:false,animations:'allow',caret:'initial',timeout:10000});
    equal([body.readUInt32BE(16),body.readUInt32BE(20)],[width,height]);
    const after=await frame(label+'-photo-after');verify(after);
    equal(after.storage,before.storage,label+' held storage');
    row.screenshots.push({...save(id+'-'+label+'.png',body),document:side,label,before:before.name,after:after.name,layout});
  }
  async function open(document){
    side=document;
    page=await context.newPage();sides.set(page,document);
    const current=page;
    current.on('pageerror',captureError);
    current.on('framenavigated',f=>{if(f===current.mainFrame())row.navigations.push({document,at:Date.now(),url:f.url()});});
    current.on('requestfailed',req=>{
      const item=row.requests.find(r=>r.document===document&&r.url===req.url()&&r.method===req.method()&&!r.failure);
      if(item)item.failure=req.failure()?.errorText??null;
    });
    current.on('response',response=>track((async()=>{
      const req=response.request(),url=new URL(req.url()),method=req.method(),at=Date.now();
      if(url.origin===base&&method==='GET'){
        const file=fileFor(url);
        assert(assets(file)&&response.status()===200,'actual physical first-party body '+file);
        const body=await response.body(),actual=tuple(file,body);
        equal(actual,builtByName.get(file));
        row.firstParty.push({document,at,url:url.href,status:response.status(),type:req.resourceType(),body:actual});
      }else{
        const role=roleOf(url,method,guest);
        if(!role||role==='completion')return;
        const expected=fixedBodies[role]??fixedBodies.empty;
        assert.equal(response.status(),200);
        const body=await response.body();
        equal(tuple(expected.file,body),expected);
        row.responses.push({document,at,url:url.href,method,role,status:200,body:expected});
      }
    })()));
    const cdp=await context.newCDPSession(current);
    for(const kind of ['domStorageItemAdded','domStorageItemUpdated','domStorageItemRemoved','domStorageItemsCleared'])
      cdp.on('DOMStorage.'+kind,change=>row.storageEvents.push({document,at:Date.now(),kind,change}));
    await cdp.send('DOMStorage.enable');
    await current.addInitScript(()=>{
      const tape=[];
      Object.defineProperty(window,'__footleEvents',{value:tape});
      for(const type of ['pointerdown','pointerup','click','wheel','input'])document.addEventListener(type,event=>{
        const target=event.target?.closest?.('button,input')??event.target;
        tape.push({type,browserMs:performance.now(),trusted:event.isTrusted,pointerType:event.pointerType??null,
          tag:target?.tagName??null,role:target?.getAttribute?.('role')??null,text:target?.textContent?.replace(/\s+/g,' ').trim()??null,
          data:event.data??null,value:target instanceof HTMLInputElement?target.value:null,
          x:event.clientX??null,y:event.clientY??null,deltaY:event.deltaY??null,deltaMode:event.deltaMode??null});
      },{capture:true,passive:true});
    });
    await current.clock.setFixedTime(new Date(dates[document]));
    const response=await current.goto(base+ROUTE,{waitUntil:'domcontentloaded'});
    assert.equal(response?.status(),200);
    await wait(async()=>await mode('daily').count()===1,'mounted actual Footle mode controls');
    const {frameTree:{frame:loaded}}=await cdp.send('Page.getFrameTree');
    assert(!loaded.parentId&&typeof loaded.id==='string'&&loaded.id&&typeof loaded.loaderId==='string'&&loaded.loaderId);
    assert.equal(loaded.url,base+ROUTE);
    const mounted=await frame('day-'+document+'-mounted');
    row.documents.push({side:document,fixedAt:mounted.fixedAt,day:mounted.day,timeOrigin:mounted.timeOrigin,firstFrame:mounted.name,
      browserDocument:{frameId:loaded.id,loaderId:loaded.loaderId,url:loaded.url}});
  }
  function assertDaily(frame,day,puzzle,status,guesses){
    const saved=JSON.parse(frame.storage.local[dailyKey(day)]??'null');
    assert(saved,frame.name+' real Daily save');
    equal([frame.mode,saved.date,saved.puzzleId,saved.gameStatus],
      ['daily',days[day],puzzle,status],frame.name);
    equal(saved.guesses.map(guess=>[guess.playerName,guess.isCorrect]),guesses,frame.name);
    return frame.storage.local[dailyKey(day)];
  }
  function protectedState(frame,status,saved,index){
    equal([frame.mode,frame.practiceStatus,frame.practiceFeedback,frame.practiceIndex,frame.combo,frame.completionAttempts],
      ['practice',status,null,index,null,0],frame.name);
    assert(!frame.actions['Give up'].some(Boolean)&&!frame.actions['Yes, reveal it'].some(Boolean)
      &&!frame.mainText.includes(answerB),frame.name+' no live reveal or protected answer');
    assert.equal(frameBytes(frame),saved,frame.name+' literal Practice bytes');
  }

  try{
    await context.routeWebSocket('**/*',socket=>{captureError(Error('Unexpected WebSocket intent'));socket.close();});
    await context.route('**/*',route=>track((async()=>{
      const request=route.request(),url=new URL(request.url()),method=request.method(),document=reqSide(request);
      assert(document,'request belongs to an actual Footle Page');
      if(url.origin===base){
        assert(['GET','HEAD'].includes(method)&&!request.postDataBuffer()&&assets(fileFor(url)),'exact local static request');
        await route.continue();return;
      }
      const headers=request.headers(),forMethod=headers['access-control-request-method']??null;
      const body=request.postDataBuffer()?.toString('utf8')??null;
      const item={document,at:Date.now(),url:url.href,method,forMethod,query:[...url.searchParams],body,outcome:'refused'};
      row.requests.push(item);
      const role=roleOf(url,method==='OPTIONS'?forMethod:method,guest);
      if(role&&method==='OPTIONS'){
        assert.equal(body,null);
        item.outcome='local-cors';item.corsRole=role;
        await route.fulfill({status:204,headers:{'access-control-allow-origin':base,'access-control-allow-methods':forMethod+',OPTIONS',
          'access-control-allow-headers':headers['access-control-request-headers']??''}});
        return;
      }
      if(role){
        assert.equal(headers.origin,base);
        item.role=role;
        assert.equal(roleCount(document,role),1,document+' '+role+' once');
        if(loadedMarkets.includes(role)){
          assert.equal(body,null);
          if(document==='b'){
            item.outcome='held';item.heldAt=Date.now();
            if(!await pendingB){item.outcome='cancelled';await route.abort();return;}
            item.releasedAt=row.release.at;
          }
        }else{
          equal([document,typeof guest],['b','string']);
          if(role==='completion'){
            equal(JSON.parse(body),{game:'footle',score:600,player_name:guest});
            item.outcome='aborted-completion';await route.abort();return;
          }
          if(role==='standing')equal(JSON.parse(body),{p_game:'footle',p_edges:[0,100,300,500,700],p_score:600,p_player:guest});
          if(role==='badge-history')assert.equal(body,null);
        }
        const expected=fixedBodies[role]??fixedBodies.empty;
        const bytes=read(out,expected.file);
        item.outcome='local-fixture';item.response=expected;
        await route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':base,
          'content-length':String(bytes.length)},body:bytes});
        item.fulfilledAt=Date.now();return;
      }
      await route.abort();
      assert(refusedRead(url,method,forMethod),'Undeclared refused transport '+method+' '+url.origin+url.pathname);
    })().catch(async error=>{try{await route.abort();}catch{}throw error;})));

    await open('a');
    const dialog=page.getByRole('dialog',{name:'How to Play Footle',exact:true});
    await wait(async()=>await dialog.count()===1&&await dialog.isVisible(),'real first-visit Footle help');
    const cookie=page.getByRole('region',{name:'Cookie choices',exact:true});
    await click(dialog.getByRole('button',{name:"Let's Play!",exact:true}),'dismiss-help');
    await wait(async()=>await dialog.count()===0,'actual help closes before cookie choice');
    await click(cookie.getByRole('button',{name:'Reject all',exact:true}),'reject-cookies');
    await wait(async()=>await combo().count()===1&&await combo().isVisible()&&responseCount('a',loadedMarkets)===3,'actual loaded Day A');
    const ready=await frame('day-a-ready');
    assert.equal(ready.mode,'daily');assert(!ready.dialog&&!ready.cookie);
    const consent=JSON.parse(ready.storage.local['cookie-consent-v2']);
    equal([consent.version,consent.analytics,consent.advertising],[2,false,false]);
    guest=ready.storage.local[guestKey];assert(typeof guest==='string'&&guest);
    row.guest=guest;
    const oldDaily=assertDaily(await guess('a-daily-miss',dailyMiss),'a',answerA,'playing',[[dailyMiss,false]]);
    await click(mode('practice'),'start-practice-mode');
    await click(button('hard'),'select-hard');
    const started=await click(button('Start run'),'start-run');
    const startRun=practice(started);
    equal([started.mode,startRun.active,startRun.tier,startRun.index],['practice',true,'hard',0]);
    equal([...startRun.targets].sort(),hard.filter(name=>name!==answerA).sort());
    equal(startRun.rounds,Array.from({length:5},()=>({guesses:[],status:'playing'})));
    const i=startRun.targets.indexOf(answerB);row.predecessors=i;
    assert(i>=0&&i<=4);
    for(let n=0;n<i;n++){
      const result=await giveUp('a-predecessor-'+n);
      equal([result.practiceIndex,result.practiceFeedback],[n,'The answer was '+startRun.targets[n]]);
      equal(practice(result).rounds[n],{guesses:[],status:'lost'});
      const next=await click(button('Next puzzle'),'a-advance-'+n);
      assert.equal(next.practiceIndex,n+1);
    }
    await guess('a-practice-miss',practiceMiss);
    const a=await frame('day-a-collision-saved'),saved=frameBytes(a),aRun=practice(a);
    equal([a.mode,a.practiceIndex,aRun.active,aRun.targets[i],aRun.rounds[i],a.practiceFeedback,a.storage.local[dailyKey('a')],a.completionAttempts],
      ['practice',i,true,answerB,{guesses:[practiceMiss],status:'playing'},null,oldDaily,0]);
    assert(a.combo&&!a.combo.disabled&&a.actions['Give up'].some(Boolean)&&!a.mainText.includes(answerB));
    assert(!Object.hasOwn(a.storage.local,unlimitedKey));
    assertNoPlay(a);
    await wait(()=>tasks.size===0,'settled Day A network receipts');
    row.events.push({document:'a',items:await browserEvents()});
    await page.close();
    row.documents[0].closedAt=Date.now();

    await open('b');
    await wait(()=>loadedMarkets.every(role=>roleCount('b',role)===1),'all three Day B market requests held');
    const pending=await frame('day-b-pool-pending');
    protectedState(pending,pendingText,saved,i);
    equal(pending.heldB,[...loadedMarkets].sort());
    assert(!pending.dialog&&!pending.cookie);
    assert(!Object.hasOwn(pending.storage.local,dailyKey('b')));
    await photo(main().getByText(pendingText,{exact:true}),'pending',f=>{
      protectedState(f,pendingText,saved,i);equal(f.heldB,[...loadedMarkets].sort());
    });
    row.release={at:Date.now(),roles:[...pending.heldB]};
    allowB(true);
    await wait(async()=>responseCount('b',loadedMarkets)===3&&await main().getByText(pausedText,{exact:true}).isVisible(),'fetched Day B visibly pauses Practice');
    const paused=await frame('day-b-pool-paused');
    protectedState(paused,pausedText,saved,i);equal(paused.heldB,[]);
    assertNoPlay(pending);assertNoPlay(paused);
    assert(!Object.hasOwn(paused.storage.local,dailyKey('a'))&&!Object.hasOwn(paused.storage.local,dailyKey('b')));
    await photo(main().getByText(pausedText,{exact:true}),'paused',f=>protectedState(f,pausedText,saved,i));

    await click(mode('daily'),'b-show-daily');
    const miss=await guess('b-daily-miss',dailyMiss);
    const bDaily=assertDaily(miss,'b',answerB,'playing',[[dailyMiss,false]]);
    const pausedAgain=await click(mode('practice'),'b-revisit-paused-practice');
    protectedState(pausedAgain,pausedText,saved,i);
    assert.equal(pausedAgain.storage.local[dailyKey('b')],bDaily);
    assertNoPlay(pausedAgain);
    await click(mode('daily'),'b-return-to-daily');
    await guess('b-daily-solve',answerB);
    await wait(async()=>responseCount('b',['standing','badge-history'])===2&&completionAttempts()===1
      &&row.requests.some(r=>r.role==='completion'&&r.failure)
      &&await page.evaluate(()=>localStorage.getItem('dukb-earned-badges-v1')!==null),'actual Daily completion attempt and settled local reads');
    const won=await frame('day-b-daily-won');
    const wonBytes=assertDaily(won,'b',answerB,'won',[[dailyMiss,false],[answerB,true]]);
    assert(won.mainText.includes('Correct!')&&won.mainText.includes(answerB)&&won.actions['Resume five-puzzle run'].some(Boolean));
    assert.equal(won.completionAttempts,1);
    const wonRecords=heldRecords(won);
    equal(JSON.parse(wonRecords['dukb-local-completions']),{date:days.b,slugs:['footle']});
    const streak=JSON.parse(wonRecords['dukb-streaks-v1']),diary=JSON.parse(wonRecords['dukb-play-diary-v1']);
    equal([streak.totalPlays,streak.totalPoints,streak.perGame.footle,diary.perGame.footle.days],
      [1,600,{current:1,longest:1,lastDate:days.b},[days.b]]);
    const resumed=await click(button('Resume five-puzzle run'),'b-resume-practice');
    function resumedState(f){
      equal([f.mode,f.practiceIndex,f.practiceStatus,f.practiceFeedback,frameBytes(f),f.storage.local[dailyKey('b')],f.completionAttempts],
        ['practice',i,null,null,saved,wonBytes,1],f.name);
      assert(f.combo&&!f.combo.disabled&&f.actions['Give up'].some(Boolean)&&!f.mainText.includes(answerB));
    }
    resumedState(resumed);
    await photo(combo(),'resumed',resumedState);

    const finished=await giveUp('b-legitimate-practice-forfeit');
    const expectedRun={...aRun,rounds:aRun.rounds.map((round,n)=>n===i?{...round,status:'lost'}:round)};
    equal(practice(finished),expectedRun);
    equal([finished.mode,finished.practiceIndex,finished.storage.local[dailyKey('b')],finished.completionAttempts],['practice',i,wonBytes,1]);
    if(i<4)equal([finished.practiceFeedback,finished.practiceReceipt],['The answer was '+answerB,null]);
    else assert(finished.practiceFeedback===null&&finished.practiceReceipt?.includes('Run complete')&&
      finished.practiceReceipt.includes('0 of 5 solved')&&finished.practiceReceipt.includes(answerB),'actual fifth-round completion receipt');
    equal(heldRecords(finished),wonRecords);
    assert(!Object.hasOwn(finished.storage.local,unlimitedKey));
    await wait(()=>tasks.size===0,'settled Day B network receipts');
    for(const document of ['a','b']){
      const served=row.firstParty.filter(entry=>entry.document===document);
      equal(served.filter(entry=>entry.type==='document').map(entry=>[entry.url,entry.body.file]),[[base+ROUTE,docPath]]);
      assert(served.some(entry=>entry.type==='script'&&new URL(entry.url).pathname===entryPath));
      assert(served.some(entry=>entry.type==='script'&&/^dist\/assets\/Footle-[^/]+\.js$/.test(entry.body.file)));
      if(boot)assert(served.some(entry=>entry.body.file==='dist/index.html'&&new URL(entry.url).pathname==='/'));
    }
    for(const document of ['a','b']){
      const nav=row.navigations.filter(entry=>entry.document===document);
      const mounted=frameBodies[id].find(f=>f.name==='day-'+document+'-mounted');
      assert(nav.length>=1&&nav.length<=2);
      assert(nav.every((entry,n)=>entry.url===base+ROUTE&&Number.isFinite(entry.at)&&entry.at<=mounted.at&&(!n||entry.at>=nav[n-1].at)));
    }
    assert.notEqual(row.documents[0].browserDocument.loaderId,row.documents[1].browserDocument.loaderId);
    assert(row.documents[0].closedAt<=frameBodies[id].find(f=>f.name==='day-b-mounted').at);
    equal(row.requests.filter(r=>r.role).map(r=>r.document+':'+r.role).sort(),
      [...loadedMarkets.map(r=>'a:'+r),...loadedMarkets.map(r=>'b:'+r),'b:completion','b:standing','b:badge-history'].sort());
    equal(row.errors,[]);
    row.events.push({document:'b',items:await browserEvents()});
    await page.close();row.documents[1].closedAt=Date.now();
    row.status='passed';
  }catch(error){
    captureError(error);row.status='failed';
    if(page&&!page.isClosed()){
      try{row.events.push({document:side,items:await browserEvents()});}catch{}
      try{await frame('failure-observed');}catch{}
    }
    throw error;
  }finally{
    allowB(false);
    await context.close();
    await Promise.allSettled([...tasks]);
  }
}
async function reservePort(){
  const server=createServer();
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const port=server.address().port;
  await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
  return port;
}
let host,browser;
try{
  const port=await reservePort(),base='http://127.0.0.1:'+port;
  report.base=base;
  host=spawn(process.execPath,['scripts/lib/hostLikeServer.mjs','dist',String(port)],{cwd:ROOT,stdio:['ignore','pipe','pipe']});
  let stdout='',stderr='';
  host.stdout.on('data',data=>{stdout+=String(data);});
  host.stderr.on('data',data=>{stderr+=String(data);});
  host.on('error',error=>{report.hostError=String(error.stack||error);});
  await wait(()=>stdout.includes('host-like server:')||report.hostError,'physical dist loopback startup');
  assert(!report.hostError);
  report.host={stdout,stderr};
  browser=await pw.chromium.launch({headless:true});
  report.chromium=browser.version();
  const outcomes=await Promise.allSettled(widths.map(([width,height])=>journey(browser,base,width,height)));
  const failed=outcomes.find(result=>result.status==='rejected');
  if(failed)throw failed.reason;
  equal(report.journeys.map(row=>[row.width,row.height]),widths);
  assert(report.journeys.every(row=>row.status==='passed'));
  const sum=get=>report.journeys.reduce((count,row)=>count+get(row),0);
  report.census={journeys:report.journeys.length,contexts:report.journeys.length,
    documents:sum(row=>row.documents.length),viewportPNGs:sum(row=>row.screenshots.length),
    marketReads:sum(row=>row.responses.filter(r=>['famous','obscure-1','obscure-2'].includes(r.role)).length),
    dailyWins:sum(row=>row.frames.filter(r=>r.name==='day-b-daily-won').length),
    completionAttempts:sum(row=>row.requests.filter(r=>r.outcome==='aborted-completion').length),
    standingReads:sum(row=>row.responses.filter(r=>r.role==='standing').length),badgeReads:sum(row=>row.responses.filter(r=>r.role==='badge-history').length),
    resumed:sum(row=>row.frames.filter(r=>r.name==='b-resume-practice-after').length),
    legitimateForfeits:sum(row=>row.frames.filter(r=>r.name==='b-legitimate-practice-forfeit-confirm-after').length),
    priorPracticeForfeits:sum(row=>row.predecessors),frames:sum(row=>row.frames.length),actions:sum(row=>row.actions.length),
    mouseActions:sum(row=>row.actions.filter(a=>a.method==='mouse').length),typingActions:sum(row=>row.actions.filter(a=>a.method==='typing').length),
    wheels:sum(row=>row.wheels.length),navigations:sum(row=>row.navigations.length),firstPartyResponses:sum(row=>row.firstParty.length),
    corsPreflights:sum(row=>row.requests.filter(r=>r.outcome==='local-cors').length)};
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
  }catch(error){report.status='failed';report.holdError=String(error.stack||error);}
  write('report.json',report);
  write('raw.json',{...report,journeys:report.journeys.map(row=>({...row,frames:frameBodies[row.id]}))});
  write('body-manifest.json',{version:1,files:walk(out).map(file=>tuple(file,read(out,file)))});
  if(report.status!=='passed')throw Error(report.error??report.holdError??report.closeError??'Footle native qualification failed');
}
console.log('PASS actual Footle three-viewports Practice pause, Daily solve and same-round resume');
