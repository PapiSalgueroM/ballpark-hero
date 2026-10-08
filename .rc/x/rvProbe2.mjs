/* Reviewer's probe (never committed): what the screen says under the uncaught "keeps" mutation, and how often a
   roles sheet numbers a man with the player's own ordinal. The mutation is applied in memory by an esbuild plugin:
   no file in the worktree is touched. */
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..').replaceAll('\\', '/');
const WORK = path.join(ROOT, '.tmp-fx', `rvprobe2-${Date.now()}`);
fs.mkdirSync(WORK, { recursive: true });
const NEEDLE = 'chart.men[ELEVEN_SHAPE[chart.group] - 1] ?? null,';
async function load(tag, mutate) {
  const entry = path.join(WORK, `${tag}.mjs`);
  fs.writeFileSync(entry, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const lib = await import('${ROOT}/src/lib/soccerClubSquad.ts');
export const sheet = await import('${ROOT}/src/lib/soccerClubSquadSheet.ts');
export const engine = await import('${ROOT}/src/lib/soccerCareerEngine.ts');
`);
  const plugin = { name: 'mutate', setup(b) {
    b.onLoad({ filter: /soccerClubSquad\.ts$/ }, args => {
      let text = fs.readFileSync(args.path, 'utf8').replace(/\r\n/g, '\n');
      if (mutate) { if (text.split(NEEDLE).length !== 2) throw new Error('needle not found once'); text = text.replace(NEEDLE, 'chart.men[ELEVEN_SHAPE[chart.group]] ?? null,'); }
      return { contents: text, loader: 'ts' };
    });
  } };
  const out = path.join(WORK, `${tag}.out.mjs`);
  await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out, alias: { '@': `${ROOT}/src` }, logLevel: 'error', plugins: [plugin] });
  return import(pathToFileURL(out).href);
}
const good = await load('good', false);
const bad = await load('bad', true);
const abil = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
const mk = (m, club, country, tier, ovr, lastYear, pos = 'ST') => {
  const base = m.engine.initCareer('Jo Vale', 'England', pos, '2025', abil(60), 60, 2025, m.engine.FALLBACK_CLUBS, null);
  return { ...JSON.parse(JSON.stringify(base)), phase: 'playing', position: pos, overall: ovr, currentClub: club, currentClubCountry: country, currentClubTier: tier,
    seasons: [{ ...base.seasons[0], year: lastYear - 1 }, { ...base.seasons[0], year: lastYear, type: 'playing', club, clubTier: tier, clubCountry: country, leagueApps: 11, apps: 14, ovr, rating: 6.6 }] };
};
for (const ovr of [66, 65, 64, 60]) {
  for (const [tag, m] of [['HEAD  ', good], ['MUTANT', bad]]) {
    const v = m.lib.squadView(mk(m, 'Leeds', 'England', 2, ovr, 2030));
    console.log(`${tag} ovr ${ovr}: rank ${v.rank}/${v.groupSize} | ${m.sheet.rankHeadline(v)}`);
  }
}
/* roles: over ratings 45 to 90 at four clubs and three lines, how often is a man numbered with the player's own ordinal */
let n = 0; let clash = 0; let firstUnder = 0;
const ORD = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth'];
for (const club of ['Leeds', 'Derby County', 'Athletic Bilbao', 'Girona']) for (const pos of ['ST', 'CM', 'CB']) for (let ovr = 45; ovr <= 90; ovr += 1) {
  const v = good.lib.squadView(mk(good, club, 'England', 2, ovr, 2003, pos));
  if (!v || v.source !== 'roles') continue;
  n += 1;
  const below = v.queue[v.rank];
  if (below && below.name.startsWith(`${ORD[v.rank - 1]} choice`)) clash += 1;
  if (v.rank === 1 && below && below.name.startsWith('First choice')) firstUnder += 1;
}
console.log(`roles sheets read: ${n}; the man directly under the player carries the player's own ordinal in ${clash} (${Math.round((clash / n) * 100)}%); the player is 1st with a "First choice" man under him in ${firstUnder}`);
console.log('PROBE2 DONE');
