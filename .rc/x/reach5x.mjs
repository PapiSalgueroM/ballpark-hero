// Round 1334 fixer: a runner-only probe patch (never committed). Drives the soccer pack over five times the kit's
// section 10 seasons (5,000) and prints, per index pack, the three least dealt cards. Evidence for the lead's ruling on
// the reach check; each edit must find its text once.
import fs from 'node:fs';

const KIT = 'scripts/simEventDeck.mjs';
let src = fs.readFileSync(KIT, 'utf8');
const crlf = src.includes('\r\n');
if (crlf) src = src.split('\r\n').join('\n');
const once = (from, to) => {
  const hits = src.split(from).length - 1;
  if (hits !== 1) { console.error(`REACH5X: text found ${hits} times, refusing`); process.exit(2); }
  src = src.replace(from, () => to);
};
once("    for (let d = 0; d < DRIVES.FLEET.desks; d++) runDesk(pack, tag, seed, 'FLEET', d, { observe, bind: PACK_BINDS[tag] });",
  "    for (let d = 0; d < DRIVES.FLEET.desks * (tag === 'soccer' ? 5 : 1); d++) runDesk(pack, tag, seed, 'FLEET', d, { observe, bind: PACK_BINDS[tag] });");
const anchor = '    const unreached = p.events.filter(e => !r.n[e.id]).map(e => e.id);';
once(anchor, anchor + '\n    console.log(`REACH ${k} ` + p.events.map(e => [e.id, r.n[e.id] ?? 0]).sort((a, b) => a[1] - b[1]).slice(0, 3).map(x => x.join(":")).join(" ") + ` total ${r.total}`);');
fs.writeFileSync(KIT, crlf ? src.split('\n').join('\r\n') : src);
console.log('REACH5X applied');
