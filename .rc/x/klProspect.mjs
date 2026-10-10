// keeper-libs reviewer (Release AU). Runner checkout only. Makes scripts/lib/realSaves.mjs build the NFL career fixture as
// the FIRST save a new NFL career writes on this head: the prospect journey (UsCareerBoard.tsx saveProspect), which holds
// prospect.v = 1 one level down. Nothing else changes. Refuses when an anchor is gone.
import fs from 'node:fs';
const FILE = 'scripts/lib/realSaves.mjs';
let src = fs.readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n');
const swap = (from, to, what) => { if (!src.includes(from)) { console.error('klProspect: CANNOT RUN, anchor gone: ' + what); process.exit(2); } src = src.replace(from, to); };
swap("import * as NFL from './src/lib/nflMyCareer';\n", "import * as NFL from './src/lib/nflMyCareer';\nimport { NFL_CAREER_SPORT } from './src/lib/nflCareerSport';\nimport { createUsCareerProspect } from './src/lib/usCareerProspect';\nimport { defaultAppearance } from './src/lib/soccerCareerAppearance';\n", 'the NFL import');
swap("  out['/nfl-my-career'] = usCareer((n, p, a, r) => NFL.startCareer(n, p, a, r, null), NFL.ARCHETYPES, seed);\n", [
  '  {',
  '    const sport = NFL_CAREER_SPORT;',
  '    const pos = sport.create.positions[seed % sport.create.positions.length];',
  '    const arch = sport.create.archetypes[pos][seed % sport.create.archetypes[pos].length];',
  "    const prospect = createUsCareerProspect(sport, { name: 'Real Save ' + seed, pos, archetypeId: arch.id, eraId: sport.create.eras[0].id, appearance: defaultAppearance(), seed: 'nfl:real' + seed });",
  "    console.log('klProspect: nfl seed ' + seed + ' prospect save, prospect.v = ' + prospect.v + ', keys ' + Object.keys(prospect).join(' '));",
  "    out['/nfl-my-career'] = JSON.stringify({ c: null, phase: 'prospect', teamQuality: null, coach: null, prospect });",
  '  }',
  '',
].join('\n'), 'the NFL fixture');
fs.writeFileSync(FILE, src);
console.log('klProspect: ' + FILE + ' rewritten in this checkout.');
