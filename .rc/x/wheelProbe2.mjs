// Release BQ triage probe (runner only): which save does wonTournamentSave give, and does it hold an unseen chance
// wheel? Run from the repo root: node .rc/x/wheelProbe.mjs
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const ROOT = process.cwd();
const { loadEngine, wonTournamentSave } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/careerMomentSaves.mjs')).href);
const engine = await loadEngine(ROOT);
const won = wonTournamentSave(engine, { unseenWheel: true });
const st = won.save ? JSON.parse(won.save) : null;
console.log(`won: seed ${won.seed}, tried ${won.tried}, ${won.name} ${won.year} ${won.nation}, rank ${won.rank}`);
console.log(`chanceWheel: ${st ? JSON.stringify(st.chanceWheel ?? null).slice(0, 300) : 'no save'}`);
console.log(`phase ${st?.phase}, age ${st?.age}, seasons ${st?.seasons?.length}, awards ${JSON.stringify((st?.awards ?? []).slice(-6))}`);
