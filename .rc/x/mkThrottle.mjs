/* Round 1314 probe, never committed: writes scripts/<walk>Throttled.mjs, a copy of a walk whose every
   ctx.newPage() page runs under CDP CPU throttling at rate 4 (critic's correction 8). The copy's file
   name differs, so its default page seed differs: pass the walk's own seed explicitly. */
import fs from 'node:fs';
const walk = process.argv[2];
const src = fs.readFileSync(`scripts/${walk}.mjs`, 'utf8').replace(/\r\n/g, '\n');
const lines = src.split('\n');
const at = lines.findIndex(l => /^const ctx = await browser\.newContext\(/.test(l));
if (at < 0) { console.error('mkThrottle: no "const ctx = await browser.newContext(" line'); process.exit(1); }
let end = at;
while (!/\);\s*$/.test(lines[end])) end += 1;
lines.splice(end + 1, 0,
  "{ const np = ctx.newPage.bind(ctx); ctx.newPage = async (...a) => { const p = await np(...a); const s = await ctx.newCDPSession(p); await s.send('Emulation.setCPUThrottlingRate', { rate: 4 }); return p; }; console.log('THROTTLED: every page of this run at CPU rate 4'); }");
fs.writeFileSync(`scripts/${walk}Throttled.mjs`, lines.join('\n'));
console.log(`mkThrottle: scripts/${walk}Throttled.mjs written, throttle after line ${end + 1}`);
