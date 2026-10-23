// Review probe (read lens, Round 1558): list every judgement the checker leaves unknown, with why.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const R = ROOT.replaceAll('\\', '/');
const { makeUsChecker, fold } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/usConnectionsCheck.mjs')).href);
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'rvprobe-'));
fs.writeFileSync(path.join(TMP, 'entry.mjs'), `
export const baseball = (await import('${R}/src/data/baseballConnectionsPuzzles.ts')).baseballConnectionsPuzzles;
export const nfl = (await import('${R}/src/data/nflConnectionsPuzzles.ts')).nflConnectionsPuzzles;
export const nhl = (await import('${R}/src/data/nhlConnectionsPuzzles.ts')).nhlConnectionsPuzzles;
`);
await build({ entryPoints: [path.join(TMP, 'entry.mjs')], bundle: true, format: 'esm', platform: 'node', outfile: path.join(TMP, 'bundle.mjs'), logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
const data = await import(pathToFileURL(path.join(TMP, 'bundle.mjs')).href);
const rec = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/baseballConnectionsRecord-2026-10.json'), 'utf8'));
const men = new Map(Object.entries(rec.men).map(([k, v]) => [fold(k), v]));

const why = (name, c) => {
  const m = men.get(fold(name));
  if (!m) return 'NO RECORD ROW';
  const tot = Object.entries(m.posG ?? {}).filter(([p]) => p !== 'P').reduce((a, [, g]) => a + g, 0);
  const pos = Object.entries(m.posG ?? {}).map(([p, g]) => `${p}:${g}`).join(' ');
  if (c.kind === 'hofPitcher' || c.kind === 'starter') return `GS/pG=${m.car?.GS}/${m.car?.pG} SV=${m.car?.SV} throws=${m.throws}`;
  if (c.kind === 'club') return `seasons=${m.fr?.[c.id] ?? 0}`;
  return `posG(${tot}) ${pos}`;
};

for (const s of ['baseball', 'nfl', 'nhl']) {
  const { checker } = makeUsChecker(ROOT, s);
  let nm = 0, no = 0;
  console.log(`== ${s}`);
  for (const b of data[s]) for (const g of b.groups) {
    const c = checker.criterion(g.theme);
    if (!c) { console.log(`UNJUDGED ${b.id} "${g.theme}"`); continue; }
    for (const p of g.players) {
      const v = checker.fits(p, c);
      if (v === null || v === undefined) { nm += 1; console.log(`MEMBER? ${b.id} "${g.theme}" ${p} | ${s === 'baseball' ? why(p, c) : ''}`); }
    }
    for (const o of b.groups) if (o !== g) for (const p of o.players) {
      const v = checker.fits(p, c);
      if (v === null || v === undefined) { no += 1; console.log(`OTHER? ${b.id} "${g.theme}" <- ${p} (from "${o.theme}") | ${s === 'baseball' ? why(p, c) : ''}`); }
    }
  }
  console.log(`${s}: member unknown ${nm}, other unknown ${no}`);
}

const ask = (process.env.MEN ?? '').split(';').filter(Boolean);
for (const n of ask) {
  const m = men.get(fold(n));
  if (!m) { console.log(`ROW ${n}: none`); continue; }
  const { ss, ...rest } = m;
  console.log(`ROW ${n}: ${JSON.stringify(rest).slice(0, 900)}`);
}
console.log('probe1 done');
