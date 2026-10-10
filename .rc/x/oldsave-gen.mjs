/* Reviewer, Round 1223, old saves, part 1 (runner only). Makes front office saves with the BASE tree's engines
 * (origin/main checked out at argv[2]) in this process and writes them to disk as JSON, the way a browser keeps them.
 * The four drivers are the harness's own (sliced out of scripts/simGmDeskHost.mjs as text, so the board order is the
 * one the builder used), but every engine line they run is bundled from the base tree. */
import fs from 'node:fs';
import { createRequire } from 'node:module';

const HEAD = process.cwd().replaceAll('\\', '/');
const BASE_DIR = (process.argv[2] || '/tmp/base').replaceAll('\\', '/');
const OUT = process.argv[3] || '/tmp/oldsaves.json';
await import(`${HEAD}/scripts/lib/seedRandom.mjs`);

const src = fs.readFileSync(`${HEAD}/scripts/simGmDeskHost.mjs`, 'utf8').replaceAll('\r\n', '\n');
const a = src.indexOf('function mulberry32(seed) {');
const b = src.indexOf('/* Every string a walk meets');
if (a < 0 || b < a) { console.log('oldsave-gen: cannot find the fleet builder in the harness'); process.exit(2); }
const raw = src.slice(a, b);
const WORDS_OF = 'd.host.pack.words';
if (raw.split(WORDS_OF).length !== 2) { console.log('oldsave-gen: the mandate line is not where it was'); process.exit(2); }
const slice = raw.replace(WORDS_OF, 'GM_SEAT_PACKS[sport].words');

const lib = f => `'${BASE_DIR}/src/lib/${f}.ts'`;
const ENTRY = '/tmp/oldsave-entry.mjs', BUNDLE = '/tmp/oldsave-base.cjs';
fs.writeFileSync(ENTRY, `
export * as SEAT from ${lib('gmSeat')};
export * as XP from ${lib('gmXp')};
export * as FM from ${lib('foOwnerMandate')};
export * as G from ${lib('gmDesk')};
export * as ENhl from ${lib('nhlFrontOffice')};
export * as ENba from ${lib('nbaFrontOffice')};
export * as EMlb from ${lib('mlbFrontOffice')};
export * as ENfl from ${lib('frontOffice')};
export { nhlContractHost } from ${lib('gmContractsHostNhl')};
export { nbaContractHost } from ${lib('gmContractsHostNba')};
export { mlbContractHost } from ${lib('gmContractsHostMlb')};
export { nflContractHost } from ${lib('gmContractsHostNfl')};
export { nbaCloseSeasonStats } from ${lib('nbaSeasonStats')};
export { leagueNames } from ${lib('foNames')};
export { GM_SEAT_PACKS } from '${BASE_DIR}/src/data/gmSeat/packs.ts';
export { NHL_OPENING_RATINGS } from '${BASE_DIR}/src/data/nhlOpeningRatings.ts';
export { NBA_OPENING_RATINGS } from '${BASE_DIR}/src/data/nbaOpeningRatings.ts';
export { FO_DEPTH } from '${BASE_DIR}/src/data/frontOfficeDepth.ts';
`);
const esbuild = createRequire(`${HEAD}/`)('esbuild');
await esbuild.build({
  entryPoints: [ENTRY], bundle: true, format: 'cjs', platform: 'node', jsx: 'automatic', alias: { '@': `${BASE_DIR}/src` },
  nodePaths: [`${HEAD}/node_modules`], outfile: BUNDLE, logLevel: 'error',
});
const text = fs.readFileSync(BUNDLE, 'utf8');
if (text.includes('supabase.co')) { console.log('oldsave-gen: refusing, the bundle names the database'); process.exit(2); }
if (text.includes('gmDeskHost')) { console.log('oldsave-gen: the base bundle holds the host, so it is not the base'); process.exit(2); }
const baseName = BASE_DIR.split('/').pop();
const fromBase = (text.match(new RegExp(`// .*${baseName}[/]src[/]lib[/](nhlFrontOffice|nbaFrontOffice|mlbFrontOffice|frontOffice)[.]ts`, 'g')) ?? []).length;

const M = createRequire(import.meta.url)(BUNDLE);
const { SEAT, XP, FM, G, ENhl, ENba, EMlb, ENfl, leagueNames, GM_SEAT_PACKS } = M;
const SEEDS = (process.env.OLDSAVE_SEEDS || '31,32,33').split(',').map(Number), SEASONS = 3, J = v => JSON.stringify(v);
const build = new Function('M', 'SEAT', 'XP', 'FM', 'G', 'ENhl', 'ENba', 'EMlb', 'ENfl', 'leagueNames', 'GM_SEAT_PACKS', 'SEEDS', 'SEASONS', 'J', 'H',
  `${slice}\nreturn { FLEET, SPORTS };`);
const { FLEET, SPORTS } = build(M, SEAT, XP, FM, G, ENhl, ENba, EMlb, ENfl, leagueNames, GM_SEAT_PACKS, SEEDS, SEASONS, J, undefined);
const count = SPORTS.reduce((s, k) => s + FLEET[k].mid.length + FLEET[k].closed.length + FLEET[k].open.length, 0);
const body = JSON.stringify({ sports: SPORTS, seeds: SEEDS, fleet: FLEET });
fs.writeFileSync(OUT, body);
console.log(`oldsave-gen: ${count} leagues from the base tree's engines (${fromBase} engine files bundled from ${BASE_DIR}), ${body.length} bytes, seeds ${SEEDS.join(',')}`);
