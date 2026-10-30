// Reviewer mutation (runner only): the NFL board's hub hides its boxes for desk panels only, not career panels
// (the NFL twin of hubpanels), to see whether the NFL side is guarded where the NHL side is not.
import fs from 'node:fs';
const file = 'src/components/front-office/FrontOfficeBoard.tsx';
const from = 'const deskPanelOpen = gmPanelFor(NFL_HUB_PANELS, gmOpen) !== null;';
const to = 'const deskPanelOpen = gmPanelFor(NFL_DESK_PANELS, gmOpen) !== null;';
const src = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const n = src.split(from).length - 1;
if (n !== 1) { console.error(`MUTATION ABORT: nflhub anchor occurs ${n} times`); process.exit(2); }
fs.writeFileSync(file, src.replace(from, to));
console.log('MUTATION APPLIED: nflhub');
