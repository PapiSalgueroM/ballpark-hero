// Runner side only, never committed: make playSoccerAgentReview print every random event a journey meets, and at a
// missing queued continuation, what hides the event card from the accessibility tree. The line restores the file after.
import fs from 'node:fs';
const file = 'scripts/playSoccerAgentReview.mjs';
let s = fs.readFileSync(file, 'utf8');
const a1 = "if(phase==='random_events'){const event=state.pendingEvents[0],seed=900+step;";
const a2 = "check(await control.count()===1,'One actual queued continuation for '+phase);";
for (const a of [a1, a2]) if (s.split(a).length !== 2) { console.log('dbgAgent2: anchor not found once: ' + a.slice(0, 50)); process.exit(3); }
const ev = "console.log('DBGEVENT',width,fixture.id,step,state.pendingEvents[0].title,state.pendingEvents[0].id||'');";
const dbg = "if(await control.count()!==1){const info=await page.evaluate(()=>{const hs=[...document.querySelectorAll('h1,h2,h3,h4')].filter(h=>h.textContent.includes('Party')||h.textContent.includes('!'));" +
  "const out={h3:hs.map(h=>{const hid=h.closest('[aria-hidden=\"true\"]'),inert=h.closest('[inert]');return{text:h.textContent,ariaHidden:hid?hid.tagName+' '+(hid.id||'')+' '+String(hid.className).slice(0,80):null,inert:inert?inert.tagName+' '+String(inert.className).slice(0,80):null,display:getComputedStyle(h).display,visibility:getComputedStyle(h).visibility};})};" +
  "out.dialogs=[...document.querySelectorAll('[role=dialog],[role=alertdialog],[data-state=open],[aria-modal=true]')].map(d=>d.tagName+' '+(d.getAttribute('role')||'')+' '+d.textContent.slice(0,160));" +
  "out.bodyHidden=[...document.body.children].map(c=>c.tagName+' '+(c.id||'')+' aria-hidden='+c.getAttribute('aria-hidden')+' inert='+c.hasAttribute('inert')+' '+c.textContent.slice(0,60));return out;});" +
  "console.log('DBG2',width,fixture.id,step,JSON.stringify(info).slice(0,3500));}";
s = s.replace(a1, a1 + ev).replace(a2, dbg + a2);
fs.writeFileSync(file, s);
console.log('dbgAgent2: debug inserted');
