import fs from 'node:fs';import assert from 'node:assert/strict';
const [file,out]=process.argv.slice(2);const r=JSON.parse(fs.readFileSync(file));assert.equal(r.contexts.length,2);assert.equal(r.status,'failed');
for(const c of r.contexts){
 assert.equal(c.status,'failed');assert.equal(c.scrollControl.fired,1);assert.equal(c.scrollControl.events.length,1);
 const e=c.scrollControl.events[0];assert.equal(e.trusted,true);assert.equal(e.after-e.before,10,'Actual native click caused ten real pixels');
 assert.equal(c.pageErrors.length,0);assert.equal(c.unexpectedConsole.length,0);assert.equal(c.assetErrors.length,0);
 const cm=c.name==='cm-post-click-scroll-control';assert.equal(c.name,cm?'cm-post-click-scroll-control':'nfl-post-click-scroll-control');
 assert(c.error.includes('AssertionError'));assert(c.error.includes(cm?'CM_RETRAIN_PAUSE_APP_NO_JUMP':'US_NATIVE_REVIEW_ENTRY_SCROLL'));
 const before=c.scrollControl.beforeSave;assert.equal(typeof before,'string');assert.equal(typeof c.controlSave,'string');
 if(cm){const expected=JSON.parse(before),actual=JSON.parse(c.controlSave);const target=expected.squad.filter(p=>p.retraining);assert.equal(target.length,1);assert.equal('paused' in target[0].retraining,false);target[0].retraining.paused=true;assert.deepEqual(actual,expected,'Real course only gained the intended flag');}
 else assert.equal(c.controlSave,before,'Actual review still preserves full save bytes');
}
fs.writeFileSync(out,JSON.stringify({status:'qualified',ownedScrollFailures:2,realPostClickPixels:10,exactGuardsUnchanged:true,unrelatedStateEffects:false,scope:'Synthetic real-browser scroll faults only, no normal-journey or application-fix credit'},null,2)+'\n');
console.log('Both unchanged strict guards rejected a real injected post-click scroll while the intended save behavior held.');
