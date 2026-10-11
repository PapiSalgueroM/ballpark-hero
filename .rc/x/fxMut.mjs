// Reviewer's runner helper: damage the fixture IN THE RUNNER'S CHECKOUT ONLY, to see whether section A's
// floors that have no control of their own really fire. The request line restores the file afterwards.
// usage: node fxMut.mjs <nosave|nophase|noresultless>
import { readFileSync, writeFileSync } from 'node:fs';
const FILE = 'scripts/data/usBoardFixture.json';
const mode = process.argv[2];
const fx = JSON.parse(readFileSync(FILE, 'utf8'));
const s = fx.sports.nba;
if (mode === 'nosave') {
  // the named save taken on an unseen wheel is lost in one sport (its screens go with it)
  if (!s.saves.wheel || !s.screens.wheel) { console.log('fxMut nosave: nothing to remove, ABORT'); process.exit(3); }
  delete s.saves.wheel; delete s.screens.wheel;
  console.log('fxMut nosave: removed nba save "wheel" and its screens');
} else if (mode === 'nophase') {
  // no step of one sport's path is saved in the free agency phase any more
  const hit = s.path.filter(st => st.p === 'freeagency');
  if (!hit.length) { console.log('fxMut nophase: nothing to change, ABORT'); process.exit(3); }
  for (const st of hit) st.p = 'season';
  console.log(`fxMut nophase: ${hit.length} nba path steps moved from freeagency to season`);
} else { console.log('fxMut: unknown mode'); process.exit(3); }
// written the way the recorder writes it is not needed: section A parses the JSON
writeFileSync(FILE, JSON.stringify(fx));
