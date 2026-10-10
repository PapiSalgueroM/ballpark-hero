// Keep the installed locked dependency versions and package bytes across the extra browser install.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
const out=path.resolve('soccer-agent-review-artifacts');fs.mkdirSync(out,{recursive:true});
const sha=value=>createHash('sha256').update(value).digest('hex');
const packageFiles=['package.json','package-lock.json'].map(file=>({file,sha256:sha(fs.readFileSync(file))}));
const mode=process.argv[2],file=path.join(out,'dependencies-before.json');
if(mode==='before'){
 const lock=JSON.parse(fs.readFileSync('package-lock.json','utf8')),packages=[];
 for(const [directory,metadata]of Object.entries(lock.packages)){
  const manifest=path.join(directory,'package.json');if(!directory.startsWith('node_modules/')||!fs.existsSync(manifest)||typeof metadata.version!=='string')continue;
  const actual=JSON.parse(fs.readFileSync(manifest,'utf8'));assert.equal(actual.version,metadata.version,'Installed actual package matches locked version '+directory);
  packages.push({directory,name:actual.name,version:actual.version});
 }
 assert(packages.length>0);fs.writeFileSync(file,JSON.stringify({packageFiles,packages},null,2));console.log('PASS locked installed inventory before browser install:'+packages.length+' exact versions.');
}else if(mode==='after'){
 const before=JSON.parse(fs.readFileSync(file,'utf8'));assert.deepEqual(packageFiles,before.packageFiles,'Package and lock bytes held');
 const packages=before.packages.map(saved=>{const actual=JSON.parse(fs.readFileSync(path.join(saved.directory,'package.json'),'utf8'));assert.equal(actual.name,saved.name);assert.equal(actual.version,saved.version,'Browser install cannot upgrade or remove a locked dependency');return{directory:saved.directory,name:actual.name,version:actual.version};});
 assert.deepEqual(packages,before.packages);fs.writeFileSync(path.join(out,'dependencies-after.json'),JSON.stringify({packageFiles,packages,addedBrowserPackage:JSON.parse(fs.readFileSync('node_modules/playwright/package.json','utf8')).version},null,2));console.log('PASS locked installed inventory after browser install:'+packages.length+' exact versions,package bytes held.');
}else throw Error('Unknown dependency receipt mode');
