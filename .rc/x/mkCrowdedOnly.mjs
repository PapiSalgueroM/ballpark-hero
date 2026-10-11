// CONTROL HELPER, never committed: a copy of scripts/playCmVar.mjs that walks only the crowdedGoal case (the half
// that ends on a real goal at the whistle's own clock place), at 390 with motion and at 390 with reduced motion.
// Written on the runner as scripts/zzCrowdedOnly.mjs so the walk's relative imports hold; the request line removes it.
import fs from 'node:fs';
const src = fs.readFileSync('scripts/playCmVar.mjs', 'utf8').split('\r\n').join('\n');
const once = (text, anchor) => { const n = text.split(anchor).length - 1; if (n !== 1) { console.error(`mkCrowdedOnly: anchor found ${n} times, wanted once: ${anchor}`); process.exit(3); } };
const from = '  for (const profile of PROFILES) await hubHelp(profile);\n', to = '} finally { await browser.close();';
once(src, from); once(src, to);
/* The standing case this control is about must be in the walk it cuts down. */
once(src, "`${id}-0-last-kick-card`");
once(src, 'the last kick of the half never got its scorer card with the goal on the score');
const i = src.indexOf(from), j = src.indexOf(to);
if (!(i > 0 && j > i)) { console.error('mkCrowdedOnly: the schedule block is not where it was'); process.exit(3); }
const out = src.slice(0, i)
  + "  await runCase(PROFILES[0], 'no-preference', 'crowdedGoal', 'plain');\n"
  + "  await runCase(PROFILES[0], 'reduce', 'crowdedGoal', 'plain');\n"
  + src.slice(j);
fs.writeFileSync('scripts/zzCrowdedOnly.mjs', out);
console.log(`mkCrowdedOnly: wrote scripts/zzCrowdedOnly.mjs (${out.length} characters, the schedule cut to two crowdedGoal cases)`);
