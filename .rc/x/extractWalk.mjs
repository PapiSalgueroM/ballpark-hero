// Diagnostic for a failed journey of one of the other lane's native walks: what the save and the screen held when it stopped.
// usage on the runner: node .rc/x/extractWalk.mjs <artifact dir>/native     (writes into $RC_OUT)
import fs from 'node:fs';
import path from 'node:path';
const dir = process.argv[2], out = process.env.RC_OUT;
const report = JSON.parse(fs.readFileSync(path.join(dir, 'report.json'), 'utf8'));
const rows = [];
for (const c of report.cases.filter(c => !c.ok)) {
  let s = null;
  try { s = JSON.parse(c.failureState); } catch { /* no state */ }
  const event = s?.pendingEvents?.[0];
  rows.push({ id: c.id, checks: c.checks, error: String(c.error).split('\n').slice(0, 3).join(' | '),
    phase: s?.phase, age: s?.age, seasons: s?.seasons?.length, agentId: s?.agentId,
    chanceWheel: s?.chanceWheel ?? null,
    pendingEvents: (s?.pendingEvents ?? []).map(e => ({ id: e.id, title: e.title, choices: e.choices.map(ch => ch.label + ' :: ' + ch.consequence) })),
    eventTitle: event?.title, lastEvents: (s?.events ?? []).slice(-4),
    actions: (c.actions ?? []).slice(-6), errors: c.errors, failureBody: c.failureBody });
}
fs.writeFileSync(path.join(out, 'failed-cases.json'), JSON.stringify(rows, null, 2));
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('-failure.png')).slice(0, 3)) fs.copyFileSync(path.join(dir, f), path.join(out, f));
console.log('failed cases:', rows.length, rows.map(r => `${r.id} phase=${r.phase} wheel=${r.chanceWheel ? (r.chanceWheel.seen ? 'seen' : 'UNSEEN ' + r.chanceWheel.title) : 'none'} event=${r.eventTitle}`).join(' ; '));
