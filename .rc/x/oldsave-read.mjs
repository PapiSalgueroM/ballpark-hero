/* Reviewer, Round 1223, old saves, part 2 (runner only). A second process: reads the JSON saves the base tree's
 * engines wrote (oldsave-gen.mjs) through the BRANCH's host and its four read adapters. Every read the host offers
 * (the harness's own readAll, sliced out as text), on each save as it rests, with no desk and with an older desk,
 * and on the shapes an even older save can have (the fields frontOfficeSave.ts calls optional left out).
 * Red when a read throws, writes to the save or the desk, or states a record the save does not hold. */
import fs from 'node:fs';
import { createRequire } from 'node:module';

const HEAD = process.cwd().replaceAll('\\', '/');
const IN = process.argv[2] || '/tmp/oldsaves.json';
const src = fs.readFileSync(`${HEAD}/scripts/simGmDeskHost.mjs`, 'utf8').replaceAll('\r\n', '\n');
const a = src.indexOf('function readAll(d, save, desk, counted, outcome) {');
const b = src.indexOf('let realSaves = 0;');
if (a < 0 || b < a) { console.log('oldsave-read: cannot find readAll in the harness'); process.exit(2); }
const readAllSrc = src.slice(a, b);

const lib = f => `'${HEAD}/src/lib/${f}.ts'`;
const ENTRY = '/tmp/oldsave-read-entry.mjs', BUNDLE = '/tmp/oldsave-head.cjs';
fs.writeFileSync(ENTRY, `
export * as H from ${lib('gmDeskHost')};
export * as SEAT from ${lib('gmSeat')};
export * as XP from ${lib('gmXp')};
export * as FM from ${lib('foOwnerMandate')};
export { nhlDeskHost } from ${lib('gmDeskHostNhl')};
export { nbaDeskHost } from ${lib('gmDeskHostNba')};
export { mlbDeskHost } from ${lib('gmDeskHostMlb')};
export { nflDeskHost } from ${lib('gmDeskHostNfl')};
export { GM_SPORTS } from ${lib('gmSport')};
`);
const esbuild = createRequire(`${HEAD}/`)('esbuild');
await esbuild.build({ entryPoints: [ENTRY], bundle: true, format: 'cjs', platform: 'node', jsx: 'automatic', alias: { '@': `${HEAD}/src` }, outfile: BUNDLE, logLevel: 'error' });
const M = createRequire(import.meta.url)(BUNDLE);
const { H, SEAT, XP, FM } = M;

const J = v => JSON.stringify(v);
const nameOf = id => `${id} club`;
const LIVE = XP.GM_TREES;
let words = 0;
const word = s => { words++; if (typeof s !== 'string' || !s.trim() || /undefined|NaN|\[object/.test(s)) fails.push(`a bad string: ${String(s).slice(0, 80)}`); };
const fails = [];
const readAll = new Function('H', 'M', 'nameOf', 'LIVE', 'word', `${readAllSrc}\nreturn readAll;`)(H, M, nameOf, LIVE, word);

const { sports, fleet } = JSON.parse(fs.readFileSync(IN, 'utf8'));
const oldDesk = () => ({ v: 1, blocks: { contracts: { from: 'an older build' }, staff: { level: 2 } } });
let read = 0, older = 0;
for (const sport of sports) {
  const d = { host: M[`${sport}DeskHost`] }, F = fleet[sport];
  const saves = [
    ...F.mid.map(x => ({ snap: x, phase: 'hub', counted: false, fired: false })),
    ...F.closed.map(x => ({ snap: x, phase: 'recap', counted: true, fired: false, outcome: x.outcomes[x.team] })),
    ...F.closed.map(x => ({ snap: x, phase: 'fired', counted: true, fired: true, outcome: x.outcomes[x.team] })),
    ...F.open.map(x => ({ snap: x, phase: 'hub', counted: false, fired: false })),
  ];
  for (const sv of saves) for (const shape of ['today', 'older']) for (const desk of [null, oldDesk()]) {
    const f = sv.snap.facts;
    /* A fresh parse for every read, as a page load would hand it over. */
    const lg = JSON.parse(J(sv.snap.lg));
    const save = { league: lg, myTeam: sv.snap.team, trust: sv.fired ? 0 : f.trust, fired: sv.fired, mandate: sv.snap.mandates[sv.snap.team], seasonsPlayed: f.seasonsPlayed, titles: f.titles, pressTilt: 0, seasonTradeLine: null, phase: sv.phase };
    if (shape === 'older') {
      /* What frontOfficeSave.ts lets a save leave out: the counters, the trust, the flag, the ask, the press state, and a club's cut lists. */
      for (const k of ['trust', 'mandate', 'seasonsPlayed', 'titles', 'pressTilt', 'seasonTradeLine']) delete save[k];
      if (!sv.fired) delete save.fired;
      for (const t of Object.values(lg.teams)) { delete t.deadCap; delete t.releasedThisSeason; }
      older++;
    }
    const before = J([save, desk]), at = `${sport} seed ${sv.snap.seed} season ${sv.snap.s + 1} ${sv.phase} ${shape}${desk ? ' with a desk' : ''}`;
    try {
      const r = readAll(d, save, desk, sv.counted, shape === 'older' ? null : sv.outcome);
      const seasons = shape === 'older' ? 0 : f.seasonsPlayed, titles = shape === 'older' ? 0 : Math.min(f.titles, f.seasonsPlayed);
      if ((r.market !== null) !== sv.fired) fails.push(`${at}: the market is ${r.market ? 'open' : 'null'}`);
      if (H.hostSeasonsRecorded(r.seat) !== seasons) fails.push(`${at}: the record holds ${H.hostSeasonsRecorded(r.seat)} seasons, the save played ${seasons}`);
      if (SEAT.careerTotals(r.seat.career).titles !== titles) fails.push(`${at}: the titles are not the save's`);
      if (shape === 'today' && sv.phase === 'recap' && r.legacy.lastGrade !== FM.gradeSeason(save.mandate, sv.outcome).result) fails.push(`${at}: the last grade is not the season's`);
      if (sv.phase === 'hub' && r.legacy.lastGrade !== null) fails.push(`${at}: a last grade on an open season`);
      if (d.host.clubs(lg).length !== Object.keys(lg.teams).length) fails.push(`${at}: not every club was read`);
    } catch (e) { fails.push(`${at}: a read threw (${String(e && e.stack).split('\n').slice(0, 2).join(' | ').slice(0, 220)})`); }
    if (J([save, desk]) !== before) fails.push(`${at}: a read wrote to the save or the desk`);
    read++;
  }
}
for (const f of fails.slice(0, 12)) console.log(`  FAIL ${f}`);
console.log(`oldsave-read: ${read} saves made by the base tree read through the branch's host (${older} in the older shape), ${words} strings, ${fails.length} failures`);
process.exit(fails.length ? 1 : 0);
