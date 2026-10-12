// p2side.mjs: the run lens reviewer's print of what the brief's P2 side print asked for and the builder left undone
// (brief section 3, the P2 row: "mean seasons, All-Stars a career, final morale and fanbase, before and after", with
// every card answered). Printed, never judged. Before = the tree at P2_BEFORE (default 48cb9d4b, origin/main the
// branch merged), after = this tree. 1,000 careers a sport through src/test/helpers/usCareerDrive.ts, 40 seasons
// asked, positions and eras cycled the way simUsRivalSense's P2 cycles them. Never reads the network.
import { build } from 'esbuild';
import { execSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { unlinkSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const BEFORE = process.env.P2_BEFORE || '48cb9d4b';
const N = Number(process.env.P2_N || 1000);
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const norm = s => s.replace(/\r\n/g, '\n');
const STDIN = ['nfl', 'mlb', 'nhl', 'nba'].map(s => `export { ${s.toUpperCase()}_CAREER_SPORT } from './src/lib/${s}CareerSport.ts';`).join('\n') + "\nexport * as drive from './src/test/helpers/usCareerDrive.ts';";
async function bundle(commit) {
  const changed = commit ? execSync(`git diff --name-only ${commit} -- src`, { cwd: ROOT }).toString().split('\n').map(x => x.trim()).filter(Boolean) : [];
  const plugin = { name: 'at', setup(b) { b.onLoad({ filter: /[.]tsx?$/ }, args => {
    const rel = path.relative(ROOT, args.path).replace(/\\/g, '/');
    if (!changed.includes(rel)) return undefined;
    let contents; try { contents = execSync(`git show ${commit}:${rel}`, { cwd: ROOT, maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }).toString(); } catch { return undefined; }
    return { contents: norm(contents), loader: rel.endsWith('x') ? 'tsx' : 'ts' };
  }); } };
  const out = path.join(os.tmpdir(), `p2side-${process.pid}-${commit || 'head'}.mjs`);
  await build({ stdin: { contents: STDIN, resolveDir: ROOT, loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', logLevel: 'error', alias: { '@': path.join(ROOT, 'src') }, outfile: out, plugins: [plugin] });
  const m = await import(pathToFileURL(out).href); try { unlinkSync(out); } catch { /* ok */ }
  console.log(`bundle ${commit || 'HEAD (this tree)'}: ${changed.length} src files read at that commit`);
  return m;
}
const FLEET = {
  nfl: { pos: ['QB', 'RB', 'WR', 'TE', 'LB', 'CB', 'EDGE', 'K'], eras: ['now', 'y2005'], award: 'All-Pro' },
  mlb: { pos: ['SP', 'RP', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'], eras: ['now', 'y2004'], award: 'All-Star' },
  nhl: { pos: ['C', 'LW', 'RW', 'D', 'G'], eras: ['now', 'y2006'], award: 'All-Star' },
  nba: { pos: ['PG', 'SG', 'SF', 'PF', 'C'], eras: ['now'], award: 'All-Star' },
};
const A = await bundle(''); const B = await bundle(BEFORE);
function fleet(M, sport) {
  const F = FLEET[sport]; const S = M[`${sport.toUpperCase()}_CAREER_SPORT`];
  const t = { careers: 0, seasons: 0, allStars: 0, morale: 0, fanbase: 0, cards: 0, choices: 0, mine: 0, his: 0, hash: '' };
  const parts = [];
  for (let i = 0; i < N; i += 1) {
    const pos = F.pos[i % F.pos.length]; const era = F.eras[Math.floor(i / F.pos.length) % F.eras.length];
    let cards = 0; let choices = 0;
    const counted = { ...S, dismissRivalryEvent: c => { cards += 1; return S.dismissRivalryEvent(c); }, resolveRivalryChoice: (...a) => { const r = S.resolveRivalryChoice(...a); if (r) choices += 1; return r; } };
    const out = M.drive.driveCareer(counted, { key: `p2-${i}`, pos, arch: i, eraId: era === 'now' ? undefined : era, seasons: 40 });
    const c = JSON.parse(out.json);
    t.careers += 1; t.seasons += c.seasons.length; t.morale += c.morale ?? 0; t.fanbase += c.fanbase ?? 0; t.cards += cards; t.choices += choices;
    t.allStars += c.seasons.filter(s => (s.awards ?? []).includes(F.award)).length;
    if (c.rival) { t.mine += c.rival.myYears ?? 0; t.his += c.rival.hisYears ?? 0; }
    parts.push(out.json.length);
  }
  return t;
}
const f = (x, d = 2) => x.toFixed(d);
for (const sport of ['mlb', 'nhl', 'nfl', 'nba']) {
  const b = fleet(B, sport); const a = fleet(A, sport);
  const row = (tag, t) => `${tag}: mean seasons ${f(t.seasons / t.careers)}, ${FLEET[sport].award}s a career ${f(t.allStars / t.careers)}, final morale ${f(t.morale / t.careers, 1)}, final fanbase ${f(t.fanbase / t.careers, 1)}, rivalry cards answered ${t.cards}, rival choices ${t.choices}, head to head mine ${t.mine} his ${t.his} (${f(100 * t.mine / Math.max(1, t.mine + t.his), 1)} percent)`;
  console.log(`P2SIDE ${sport} ${row('before', b)}`);
  console.log(`P2SIDE ${sport} ${row('after ', a)}`);
}
console.log('p2side: printed (never judged)');
