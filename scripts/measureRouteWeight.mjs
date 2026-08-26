/**
 * Round 273: measure what a phone actually waits for on any route.
 *
 * This exists so the ceiling in scripts/simFlagshipWeight.mjs is a MEASUREMENT
 * anyone can repeat rather than a number in a comment that nobody can check.
 * If you are about to raise that ceiling, run this first and put the new
 * numbers in the harness header next to the old ones.
 *
 * It serves exactly what the host serves: public/ answers the routes, because
 * those are the prerendered snapshots, and dist/ answers the assets. Then it
 * loads each route on a throttled mid range phone and times the moment the
 * game is actually playable, not the moment something appeared.
 *
 * The conditions, and why these:
 *   slow 4G, 1.6 Mbps down, 562 ms round trip, 4x CPU slowdown, 390x844.
 * That is a mid range phone on mobile data, which is what a daily trivia site
 * gets a lot of. It is deliberately not a laptop on office wifi, because a
 * laptop on office wifi never notices any of this.
 *
 * Google Fonts is stubbed rather than left to hang. In a sandbox with no
 * egress that request never resolves and never fails, which adds about twelve
 * seconds to every number and makes the whole measurement a lie about the
 * live site. Learned the hard way while writing this.
 *
 *   node scripts/measureRouteWeight.mjs [label]
 *   ROUTES=/soccer-career,/footle,/ RUNS=3 node scripts/measureRouteWeight.mjs
 *
 * The default readiness marker is the Begin Career button, which is what
 * /soccer-career is measured on. Pass READY to give another route its own.
 */
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import pw from 'playwright';
const ROOT=process.cwd(), DIST=path.join(ROOT,'dist'), PUBLIC=path.join(ROOT,'public'), PORT=4460;
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.json':'application/json','.txt':'text/plain','.xml':'application/xml','.webmanifest':'application/json','.woff2':'font/woff2'};
const isFile=f=>{try{return statSync(f).isFile()}catch{return false}};
const server=createServer((req,res)=>{const p=decodeURIComponent(req.url.split('?')[0]);let f=null;
 if(p==='/'||p==='/index.html')f=path.join(DIST,'index.html');
 else{for(const base of [PUBLIC,DIST]){const a=path.join(base,p.replace(/^\//,''));if(isFile(a)){f=a;break}const b=path.join(a,'index.html');if(isFile(b)){f=b;break}}}
 if(!f)f=path.join(DIST,'index.html');
 let body;try{body=readFileSync(f)}catch{res.writeHead(404);res.end();return}
 res.writeHead(200,{'content-type':MIME[path.extname(f)]??'application/octet-stream'});res.end(body)});
await new Promise(r=>server.listen(PORT,r));
const browser=await pw.chromium.launch({executablePath:process.env.CHROME_PATH||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const label=process.argv[2]||'run';
const RUNS=Number(process.env.RUNS||3);
const routes=(process.env.ROUTES||'/soccer-career').split(',');
for(const route of routes){
  const rows=[];
  for(let i=0;i<RUNS;i++){
    const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
    const page=await ctx.newPage();
    const cdp=await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:562,downloadThroughput:1.6*1024*1024/8,uploadThroughput:750*1024/8});
    await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
    await page.route('**://*.supabase.co/**',()=>{});
    await page.route('**fonts.googleapis.com**', r=>r.fulfill({status:200,contentType:'text/css',body:'/* stub */'}));
    await page.route('**fonts.gstatic.com**', r=>r.abort());
    let bytes=0, js=0, reqs=0, lastJs=0;
    const t0=Date.now();
    page.on('response', async r=>{ reqs+=1; try{const b=(await r.body()).length; bytes+=b;
      if(r.url().endsWith('.js')){ js+=b; lastJs=Math.max(lastJs, Date.now()-t0); } }catch{} });
    await page.goto(`http://127.0.0.1:${PORT}${route}`,{waitUntil:'commit',timeout:180000});
    /* the honest marker: the button that actually starts a career */
    const ready = await page.waitForFunction(
      marker => [...document.querySelectorAll('#root button')].some(b => b.innerText.includes(marker)),
      process.env.READY || 'Begin Career',
      { timeout: 180000 }).then(()=>Date.now()-t0).catch(()=>-1);
    const booted=await page.evaluate(()=>document.querySelectorAll('#root [class]').length);
    rows.push({playable: ready});
    Object.assign(rows[rows.length-1],{bytes,js,reqs,lastJs,booted});
    await ctx.close();
  }
  const med=k=>{const v=rows.map(r=>r[k]).sort((a,b)=>a-b);return v[Math.floor(v.length/2)];};
  console.log(`${label.padEnd(8)} ${route.padEnd(16)} total ${(med('bytes')/1024).toFixed(0).padStart(5)}K  js ${(med('js')/1024).toFixed(0).padStart(5)}K  reqs ${String(med('reqs')).padStart(3)}  playable ${String(med('playable')).padStart(6)}ms  (${RUNS} runs, median; styled nodes ${med('booted')})`);
}
await browser.close(); server.close();
