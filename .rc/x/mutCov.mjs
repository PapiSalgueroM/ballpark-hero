/* Round 1568 trial (never committed): puts scroll-mt-14 on Club Manager's fixture coverage note in CalendarScreen.tsx,
   to see whether playCmRealFixtures' missing case is the note parked under the site bar. Restore with git checkout. */
import fs from 'node:fs';
const f = 'src/components/club-manager/CalendarScreen.tsx';
const src = fs.readFileSync(f, 'utf8');
const old = 'className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground">';
if (src.split(old).length !== 2) { console.error('mutCov: anchor not found exactly once'); process.exit(3); }
fs.writeFileSync(f, src.replace(old, 'className="scroll-mt-14 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground">'));
console.log('mutCov: scroll-mt-14 on the coverage note');
