/* Reviewer probe (runner only, never committed): the base and the head judge the FILE boards the same way, and
   every base record man, field and ledger fact is still there at the head.
   node .rc/x/rvparity.mjs /tmp/base        (run from the head's root)
   RV_MUT=verdict flips one head verdict in memory (must exit 1); RV_MUT=record drops one base field (must exit 1). */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const HEAD = path.resolve('.');
const BASE = path.resolve(process.argv[2] ?? '/tmp/base');
const MUT = process.env.RV_MUT ?? '';
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'rvparity-'));
const R = HEAD.split(path.sep).join('/');
fs.writeFileSync(path.join(TMP, 'e.mjs'), `
export const baseball = (await import('${R}/src/data/baseballConnectionsPuzzles.ts')).baseballConnectionsPuzzles;
export const nfl = (await import('${R}/src/data/nflConnectionsPuzzles.ts')).nflConnectionsPuzzles;
export const nhl = (await import('${R}/src/data/nhlConnectionsPuzzles.ts')).nhlConnectionsPuzzles;
`);
await build({ entryPoints: [path.join(TMP, 'e.mjs')], bundle: true, format: 'esm', platform: 'node', outfile: path.join(TMP, 'o.mjs'), logLevel: 'error', alias: { '@': path.join(HEAD, 'src') } });
const data = await import(pathToFileURL(path.join(TMP, 'o.mjs')).href);
const H = await import(pathToFileURL(path.join(HEAD, 'scripts/lib/usConnectionsCheck.mjs')).href);
const B = await import(pathToFileURL(path.join(BASE, 'scripts/lib/usConnectionsCheck.mjs')).href);

let bad = 0;
const say = m => { bad += 1; if (bad <= 25) console.error('  DIFF ' + m); };
const s2 = v => (v === undefined ? 'undefined' : JSON.stringify(v));
let verdicts = 0;
for (const s of ['baseball', 'nfl', 'nhl']) {
  const h = H.makeUsChecker(HEAD, s).checker;
  const b = B.makeUsChecker(BASE, s).checker;
  let n = 0;
  for (const board of data[s]) {
    const tiles = board.groups.flatMap(g => g.players);
    for (const g of board.groups) {
      const ch = h.criterion(g.theme), cb = b.criterion(g.theme);
      if (!!ch !== !!cb) say(`${s} ${board.id} "${g.theme}": judged at head ${!!ch}, at base ${!!cb}`);
      for (const p of tiles) {
        n += 1;
        let fh = ch ? s2(h.fits(p, ch)) : 'unjudged';
        const fb = cb ? s2(b.fits(p, cb)) : 'unjudged';
        if (MUT === 'verdict' && s === 'nhl' && n === 7) fh = fh === 'true' ? 'false' : 'true';
        if (fh !== fb) say(`${s} ${board.id} "${g.theme}" ${p}: fits head ${fh} base ${fb}`);
        const wh = ch ? s2(h.watch(p, ch) || null) : 'u', wb = cb ? s2(b.watch(p, cb) || null) : 'u';
        if (wh !== wb) say(`${s} ${board.id} "${g.theme}" ${p}: watch head ${wh} base ${wb}`);
        const ah = s2(h.active?.(p)), ab = s2(b.active?.(p));
        if (ah !== ab) say(`${s} ${board.id} ${p}: active head ${ah} base ${ab}`);
      }
    }
  }
  verdicts += n;
  /* records only grow: every base man and every base field verbatim at the head */
  const rec = (root) => JSON.parse(fs.readFileSync(path.join(root, 'scripts/data', `${s}ConnectionsRecord-2026-10.json`), 'utf8'));
  const rb = rec(BASE), rh = rec(HEAD);
  if (MUT === 'record' && s === 'nhl') { const k = Object.keys(rh.men)[0]; delete rh.men[k].career; }
  let men = 0, fields = 0;
  for (const [name, m] of Object.entries(rb.men ?? {})) {
    men += 1;
    const hm = rh.men?.[name];
    if (!hm) { say(`${s} record: ${name} missing at head`); continue; }
    for (const [k, v] of Object.entries(m)) { fields += 1; if (JSON.stringify(hm[k]) !== JSON.stringify(v)) say(`${s} record: ${name}.${k} changed`); }
  }
  /* the ledger's base facts and fixed keys verbatim at the head */
  const led = (root) => { const f = path.join(root, 'scripts/data', `${s}ConnectionsVerified-2026-10.json`); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {}; };
  const lb = led(BASE), lh = led(HEAD);
  const hf = new Set((lh.facts ?? []).map(f => JSON.stringify(f)));
  let lost = 0;
  for (const f of lb.facts ?? []) if (!hf.has(JSON.stringify(f))) { lost += 1; say(`${s} ledger: base fact ${f.name} | ${f.label} not verbatim at head`); }
  for (const k of lb.fixed ?? []) if (!(lh.fixed ?? []).includes(k)) say(`${s} ledger: base fixed key ${k} gone`);
  for (const k of Object.keys(lb)) if (!(k in lh)) say(`${s} ledger: base key ${k} gone`);
  console.log(`${s}: ${data[s].length} file boards, ${n} (group, tile) verdicts compared; record ${men} base men, ${fields} base fields; ledger ${(lb.facts ?? []).length} base facts (${lost} not verbatim), head ${(lh.facts ?? []).length}`);
}
if (bad) { console.error(`rvparity: ${bad} differences between base and head${MUT ? ` (RV_MUT=${MUT})` : ''}`); process.exit(1); }
console.log(`rvparity: green, ${verdicts} file board verdicts, watches and active flags identical; every base record field and ledger fact kept`);
