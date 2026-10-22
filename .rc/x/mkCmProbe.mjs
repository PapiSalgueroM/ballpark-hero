/* BPH probe (runner only, never committed): a copy of scripts/playClubManager.mjs that, at the STUCK note in the live
   viewer, prints the whole screen text, every button's name, the save's live fields and takes a screenshot into RC_OUT.
   Run on the runner from the repo root: node .rc/x/mkCmProbe.mjs && node scripts/zzCmProbe.mjs */
import fs from 'node:fs';
const src = fs.readFileSync('scripts/playClubManager.mjs', 'utf8');
const anchor = "    note('STUCK  ', 'the live viewer offered neither a skip nor a way out');";
if (src.split(anchor).length !== 2) { console.log('mkCmProbe: ABORTED, the STUCK anchor is not there once'); process.exit(2); }
const dump = [
  "    console.log('PROBE screen: ' + (await screen()).slice(0, 2000));",
  "    console.log('PROBE buttons: ' + JSON.stringify(await page.getByRole('button').allInnerTexts().catch(() => [])).slice(0, 2000));",
  "    console.log('PROBE live: ' + await page.evaluate(() => { try { const s = JSON.parse(localStorage.getItem('dukb-club-manager-save')); const l = s.live || {}; return JSON.stringify({ week: l.week, minute: l.minute, h2Drawn: l.h2Drawn, instrLog: (l.instrLog || []).length, formChanges: (l.formChanges || []).length, instructions: s.instructions ?? null, liveKeys: Object.keys(l).slice(0, 40) }); } catch (e) { return String(e); } }));",
  "    if (process.env.RC_OUT) await page.screenshot({ path: process.env.RC_OUT + '/stuck.png', fullPage: false }).catch(() => {});",
].join('\n');
fs.writeFileSync('scripts/zzCmProbe.mjs', src.replace(anchor, () => dump + '\n' + anchor));
console.log('mkCmProbe: scripts/zzCmProbe.mjs written');
