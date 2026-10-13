// Runner side only, never committed: make playSoccerAgentReview print what it sees when the queued continuation is not
// found exactly once (the cousin journeys of rBB-gV3). The request line restores the file with git checkout afterwards.
import fs from 'node:fs';
const file = 'scripts/playSoccerAgentReview.mjs';
let s = fs.readFileSync(file, 'utf8');
const anchor = "check(await control.count()===1,'One actual queued continuation for '+phase);";
if (s.split(anchor).length !== 2) { console.log('dbgAgent: anchor not found once'); process.exit(3); }
const dbg = "if(await control.count()!==1){const ev=phase==='random_events'?state.pendingEvents[0]:null;" +
  "const text=await page.evaluate(()=>document.body.innerText.slice(0,4000));" +
  "console.log('DBG',width,fixture.id,phase,'count',await control.count(),JSON.stringify(ev?{title:ev.title,choices:ev.choices.map(c=>c.label),argument,events:state.pendingEvents.length}:null));" +
  "if(ev)console.log('DBG headings',await page.getByRole('heading',{name:ev.title,exact:true}).count(),'buttons with label',await page.getByRole('button').filter({hasText:ev.choices[argument].label}).count());" +
  "console.log('DBGTEXT',text.split(String.fromCharCode(10)).join(' / '));}";
s = s.replace(anchor, dbg + anchor);
fs.writeFileSync(file, s);
console.log('dbgAgent: debug inserted');
