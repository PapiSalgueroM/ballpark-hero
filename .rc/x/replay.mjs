/* Reviewer tool (Round 1556): saves made by the BASE's code, replayed through the desk's summer on the base and on
   the head (this checkout). Each save is played as written and, where the GM let a sheet stand that summer, also as a
   bottom copy (the sheet club carries sixteen men rated one above his ceiling, so the engine's waiver reaches him).
   As written: head must equal base byte for byte (minted ids named by order) unless the hand back acted, and then
   only because the base lost the man. Bottom copy: the head keeps every sheet man on his club on the sheet's terms.
   usage: node .rc/x/replay.mjs <base tree> <dump.jsonl> [more dumps]   exit 0 green, 1 red, 2 could not run */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { pathToFileURL } from 'node:url';

const [baseTree, ...dumps] = process.argv.slice(2);
const { build } = await import('esbuild');
async function bundle(root, tag) {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), `replay-${tag}-`));
  fs.writeFileSync(path.join(work, 'entry.ts'), "export * as D from '@/lib/nbaGmDesk';\nexport { NBA_ROSTER_MAX } from '@/lib/nbaFrontOffice';\n");
  await build({ entryPoints: [path.join(work, 'entry.ts')], outfile: path.join(work, 'e.mjs'), bundle: true, platform: 'node',
    format: 'esm', jsx: 'automatic', logLevel: 'error', alias: { '@': path.join(path.resolve(root), 'src') } });
  if (fs.readFileSync(path.join(work, 'e.mjs'), 'utf8').includes('supabase.co')) { console.error('refusing: bundle names supabase.co'); process.exit(2); }
  return import(pathToFileURL(path.join(work, 'e.mjs')).href);
}
const B = await bundle(baseTree, 'base');
const H = await bundle(process.cwd(), 'head');
const mulberry32 = seed => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const J = v => JSON.stringify(v);
function norm(out, known) {
  let s = J(out); const L = out.league; const seen = [];
  for (const k of Object.keys(L.teams).sort()) for (const p of L.teams[k].players) if (!known.has(p.id)) seen.push(p.id);
  for (const p of L.freeAgents) if (!known.has(p.id) && !seen.includes(p.id)) seen.push(p.id);
  seen.forEach((id, i) => { s = s.split(`"${id}"`).join(`"minted-${i}"`); });
  return s;
}
function summer(M, save, mut) {
  const lg = JSON.parse(save.lgJ), desk = JSON.parse(save.deskJ);
  if (mut) mut(lg, desk);
  const known = new Set([...Object.values(lg.teams).flatMap(t => t.players.map(p => p.id)), ...lg.freeAgents.map(p => p.id)]);
  const r = M.D.nbaDeskOffseason(lg, desk, save.team, mulberry32(4242 + lg.season));
  return { out: { ok: r.ok, notes: r.notes ?? null, lines: r.lines ?? null, league: lg, desk: r.ok ? r.desk : desk }, known, lg };
}
const n = { saves: 0, equal: 0, differ: 0, differExplained: 0, sheets: 0, bottom: 0, bottomHeadKept: 0, bottomBaseLost: 0 };
const bad = [];
for (const file of dumps) {
  const rl = readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    const row = JSON.parse(line);
    const save = { team: row.team, lgJ: J(row.lg), deskJ: J(row.desk), where: row.where };
    n.saves++;
    const takes = H.D.nbaContractsOf(row.desk, row.lg, row.team).decisions.filter(d => d.season === row.lg.season && d.kind === 'take-picks');
    n.sheets += takes.length;
    const b = summer(B, save), h = summer(H, save);
    if (norm(b.out, b.known) === norm(h.out, h.known)) n.equal++;
    else {
      n.differ++;
      const lostOnBase = takes.filter(d => !b.lg.teams[d.club]?.players.some(p => p.id === d.id) && h.lg.teams[d.club]?.players.some(p => p.id === d.id));
      if (lostOnBase.length) n.differExplained++; else bad.push(`${file} ${save.where}: head differs from base and no sheet man explains it`);
    }
    for (const d of takes) {
      const mut = lg => { const club = lg.teams[d.club]; const man = lg.teams[save.team]?.players.find(p => p.id === d.id); if (!club || !man || man.pot + 1 > 99) return;
        for (let i = 0; i < 16; i++) club.players.push({ ...club.players[0], id: `top-${d.club}-${i}`, name: `Topper ${d.club} ${i}`, age: 27, ovr: man.pot + 1, pot: man.pot + 1, years: 3, out: 0 }); };
      const probe = JSON.parse(save.lgJ); const man0 = probe.teams[save.team]?.players.find(p => p.id === d.id);
      if (!man0 || man0.pot + 1 > 99) continue;
      n.bottom++;
      const bb = summer(B, save, mut), hb = summer(H, save, mut);
      const retired = (hb.out.notes ?? []).some(x => x.includes(`${d.name} retires`));
      const ph = hb.lg.teams[d.club].players.find(p => p.id === d.id);
      if (retired || (ph && ph.years === d.years && ph.salary === d.salary && hb.lg.teams[d.club].players.length <= H.NBA_ROSTER_MAX)) n.bottomHeadKept++;
      else bad.push(`${file} ${save.where} bottom: ${d.name} at ${d.club} on the head: ${ph ? `${ph.years}y ${ph.salary}, club ${hb.lg.teams[d.club].players.length}` : 'not there'}`);
      if (!bb.lg.teams[d.club].players.some(p => p.id === d.id)) n.bottomBaseLost++;
    }
  }
}
console.log(`replay: ${n.saves} base saves (${n.sheets} sheets let stand); as written ${n.equal} byte equal, ${n.differ} differ (${n.differExplained} because the base lost a sheet man the head kept); bottom copies ${n.bottom}: head kept ${n.bottomHeadKept}, base lost ${n.bottomBaseLost}`);
for (const m of bad.slice(0, 8)) console.log(`  FAIL ${m}`);
if (n.saves < 50) { console.log('replay: too few saves'); process.exit(2); }
console.log(bad.length ? `replay: RED, ${bad.length} failures` : 'replay: green');
process.exit(bad.length ? 1 : 0);
