// PROBE, never committed: a copy of scripts/playCmVar.mjs that walks only the crowdedGoal case (a half whose last
// kick is a real goal) and takes a picture of that last kick's scorer card. Written on the runner as
// scripts/zzLastKickWalk.mjs so the walk's relative imports hold; the request line removes it afterwards.
import fs from 'node:fs';
const src = fs.readFileSync('scripts/playCmVar.mjs', 'utf8').split('\r\n').join('\n');
const ins1 = fs.readFileSync('.rc/x/lkIns1.txt', 'utf8').split('\r\n').join('\n');
const ins2 = fs.readFileSync('.rc/x/lkIns2.txt', 'utf8').split('\r\n').join('\n');
const once = (text, anchor) => { const n = text.split(anchor).length - 1; if (n !== 1) { console.error(`mkLastKick: anchor found ${n} times, wanted once: ${anchor}`); process.exit(3); } };
let out = src;
const a1 = '    const whereBefore = await w.where();\n';
once(out, a1);
out = out.replace(a1, () => a1 + ins1);
const a2 = '      const seen = await w.page.evaluate(() => window.__seen);\n';
once(out, a2);
out = out.replace(a2, () => a2 + ins2);
const from = '  for (const profile of PROFILES) await hubHelp(profile);\n', to = '} finally { await browser.close();';
once(out, from); once(out, to);
const i = out.indexOf(from), j = out.indexOf(to);
if (!(i > 0 && j > i)) { console.error('mkLastKick: the schedule block is not where it was'); process.exit(3); }
out = out.slice(0, i)
  + "  for (const profile of PROFILES) await runCase(profile, 'no-preference', 'crowdedGoal', 'plain');\n"
  + "  await runCase(PROFILES[0], 'reduce', 'crowdedGoal', 'plain');\n"
  + out.slice(j);
fs.writeFileSync('scripts/zzLastKickWalk.mjs', out);
console.log(`mkLastKick: wrote scripts/zzLastKickWalk.mjs (${out.length} characters, three edits)`);
