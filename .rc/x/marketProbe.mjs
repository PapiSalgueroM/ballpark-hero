// Round 1547 run-lens review probe: what the NFL Free Agency market offers after a retired great and a franchise
// legend sat on two clubs that fell. Uses the real src/lib/conquestMarket.ts and builds the never-on-market set with
// the predicate the NFL hook really passes (read from src/hooks/useConquest.ts), so a mutation of either shows.
// Exit 0 "market clean", exit 1 "MARKET OFFERS RETIRED MEN: ...", exit 2 when it cannot read the hook.
import { build } from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd().split(path.sep).join('/');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'marketProbe-'));
fs.writeFileSync(path.join(TMP, 'e.ts'), [
  `export * from '${ROOT}/src/lib/conquestMarket.ts';`,
  `export { RETIRED_GREATS_NFL, TEAM_LEGENDS } from '${ROOT}/src/data/conquestPowerups.ts';`,
  `export { NFL_TEAMS } from '${ROOT}/src/data/conquestData.ts';`,
].join('\n'));
await build({ entryPoints: [path.join(TMP, 'e.ts')], bundle: true, format: 'esm', platform: 'node', outfile: path.join(TMP, 'b.mjs'), logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
const m = await import(pathToFileURL(path.join(TMP, 'b.mjs')).href);

const hook = fs.readFileSync(path.join(ROOT, 'src/hooks/useConquest.ts'), 'utf8');
const pm = hook.match(/retiredNames\(TEAM_LEGENDS, RETIRED_GREATS_NFL, (n => [^)]*\))\)/);
if (!pm) { console.log('PROBE ABORTED: the hook no longer calls retiredNames(TEAM_LEGENDS, RETIRED_GREATS_NFL, n => ...)'); process.exit(2); }
const onTable = new Set(m.NFL_TEAMS.flatMap(t => (t.players || []).map(p => p.name)));
const pred = new Function('onTable', `return ${pm[1]};`)(onTable);
const never = m.retiredNames(m.TEAM_LEGENDS, m.RETIRED_GREATS_NFL, pred);

const great = m.RETIRED_GREATS_NFL[0].name;
const legend = m.TEAM_LEGENDS.CHI.name;
const rosters = Object.fromEntries(m.NFL_TEAMS.map(t => [t.id, (t.players || []).map(p => p.name)]));
rosters.KC.push(great);
rosters.CHI.push(legend);
const ids = m.NFL_TEAMS.map(t => t.id);
const state = { rosters, alive: ids.filter(x => x !== 'KC' && x !== 'CHI'), eliminated: ['KC', 'CHI'], cardOf: () => ({ position: '?', overall: 75 }), neverOnMarket: never };
const names = { KC: 'Chiefs', CHI: 'Bears' };
const market = m.fallenTeamMarket(state, id => names[id] || id);
const sign = m.signingList(state, m.RETIRED_GREATS_NFL);
console.log(`hook predicate: ${pm[1]}; never-on-market set ${never.size} names; market ${market.length}; power up list ${sign.length}`);
const badMarket = market.filter(c => c.name === great || c.name === legend);
const badSign = sign.filter(c => c.name === legend);
for (const c of badMarket) console.log(`  market: ${c.name} ${c.position} ${c.overall}, "${c.blurb}"`);
for (const c of badSign) console.log(`  power up list: ${c.name}, unlabelled`);
if (badMarket.length || badSign.length) { console.log(`MARKET OFFERS RETIRED MEN: ${[...badMarket, ...badSign].map(c => c.name).join(', ')}`); process.exit(1); }
console.log(`market clean: neither ${great} (retired great) nor ${legend} (CHI legend) is offered`);
