'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const out=process.env.WORLD_XI_ROUTE_OUT,sha=b=>createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(fs.readFileSync(path.join(out,'font-cache/manifest.json'),'utf8'));
const cache=new Map(manifest.map(row=>{const body=fs.readFileSync(path.join(out,'font-cache',row.file));assert.equal(sha(body),row.sha256);return[row.url,{body,contentType:row.contentType,sha256:row.sha256}];}));
const pw=require(path.join(process.cwd(),'node_modules/playwright'));
const launch=pw.chromium.launch.bind(pw.chromium);
pw.chromium.launch=async(...args)=>{
  const browser=await launch(...args),newContext=browser.newContext.bind(browser);
  browser.newContext=async(...options)=>{
    const context=await newContext(...options);
    await context.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//,async route=>{
      const url=route.request().url(),row=cache.get(url);
      if(!row){fs.appendFileSync(path.join(out,'font-cache-misses.jsonl'),JSON.stringify({url})+'\n');return route.abort();}
      fs.appendFileSync(path.join(out,'font-cache-use.jsonl'),JSON.stringify({url,sha256:row.sha256})+'\n');
      return route.fulfill({status:200,body:row.body,contentType:row.contentType});
    });
    await context.route(/^https:\/\/flagcdn\.com\//,route=>{fs.appendFileSync(path.join(out,'blocked-external.jsonl'),JSON.stringify({kind:'flag',url:route.request().url()})+'\n');return route.abort();});
    await context.route(/^https:\/\/[^/]+\.supabase\.co\//,route=>{fs.appendFileSync(path.join(out,'blocked-external.jsonl'),JSON.stringify({kind:'database',url:route.request().url()})+'\n');return route.abort();});
    return context;
  };
  return browser;
};
