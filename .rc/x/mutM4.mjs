// Fix pass mutation M4 (the engine reviewer's): the extension push is no longer written to the save.
// Runs in the runner's checkout only; the request line restores src afterwards.
import { readFileSync, writeFileSync } from 'node:fs';
const FILE = 'src/components/us-career/UsCareerBoard.tsx';
const src = readFileSync(FILE, 'utf8');
const from = "    setMarketTalk(next);\n    persist(career, 'extension', teamQuality);";
const to = "    setMarketTalk(next);";
if (src.split(from).length !== 2) { console.log('mutM4: ABORT, the anchor does not stand exactly once'); process.exit(3); }
writeFileSync(FILE, src.replace(from, to));
console.log('mutM4: applied (the extension push is not written to the save)');
