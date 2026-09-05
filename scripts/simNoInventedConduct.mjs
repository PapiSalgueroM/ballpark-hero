/* No invented conduct about a real, named person.

   Round 449. Found by the Round 442 builder while lifting World XI's season
   sim into Build Your XI: /world-xi's season report drew a random real
   footballer from the player's XI and printed one of six lines about him,
   for example that he "handed in a transfer request after a bust-up with the
   board" or that "agents for" him "leaked interest from three leagues to
   force a bumper new contract". Round 442 kept those lines off the new page
   and left them on the old one, so the two pages disagreed about it.

   THE LINE, because it is easy to cross by accident. A simulated season can
   say a real player scored twelve goals in the XI you built, or missed six
   weeks: the screen is plainly a sim of your squad, and every manager game
   on this site does the same. It cannot say he fell out with the board, or
   that his agents leaked interest, or that he rejected a bid: those are
   claims about the man's conduct, and CLAUDE.md names invented transfers and
   invented words in a real person's mouth as the exposure that matters most.
   The shape to watch for is flavour text that puts a real name next to a
   conduct verb.

   WHAT THIS HOLDS:
     1) No template array anywhere in src puts a name placeholder in the
        same line as a conduct verb.
     2) The REAL World XI engine, run over many seeded XIs of real players,
        never prints a narrative line that pairs a squad member's name with a
        conduct verb. Injuries and goals are allowed to name him; conduct is
        not.
     3) World XI and Build Your XI render the same report: neither page
        filters the transfer line any more.

   Negative control:
     INVENTED_CONDUCT_CONTROL=saga restores the six old templates and the
       name interpolation in memory; sections 1 and 2 must go red, naming a
       real player.
   Refuses to run if its rewrite changed nothing.

   Run: node scripts/simNoInventedConduct.mjs
*/
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.INVENTED_CONDUCT_CONTROL || '';
if (CONTROL && CONTROL !== 'saga') {
  console.error(`INVENTED_CONDUCT_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n');
const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/* Conduct, as opposed to a simulated result. */
const CONDUCT = /transfer request|bust-up|bust up|agents? for|leaked|reject(ed|s)? a|refus(ed|es)|demand(ed|s)|storm(ed|s) out|fell out|falling out|row over|walked out|went on strike|downed tools|sulk|tantrum|forced? (a|his) (move|exit)|handed in/i;

const OLD_TEMPLATES = [
  "  '{name} handed in a transfer request after a bust-up with the board.',",
  "  'Reports linked {name} with a shock exit all winter, but the move fell through on deadline day.',",
  "  'A release clause row over {name} rumbled on for months before a new deal was signed.',",
  "  '{name} rejected a club-record bid, insisting the trophy hunt was not finished.',",
  "  'Agents for {name} leaked interest from three leagues to force a bumper new contract.',",
  "  'A medical was booked, then cancelled, then booked again in the {name} saga that dominated deadline day.',",
].join('\n');

let worldXiSrc = read('src/lib/worldXi.ts');
if (CONTROL === 'saga') {
  const arr = /const TRANSFER_SAGA_TEMPLATES = \[[\s\S]*?\];/.exec(worldXiSrc)?.[0];
  const interp = "template.replace('{role}', sagaRoleFor(sagaPlayer.position))";
  if (!arr || !worldXiSrc.includes(interp)) { console.error('control cannot run: worldXi.ts is not in the shape this control rewrites'); process.exit(1); }
  worldXiSrc = worldXiSrc.replace(arr, `const TRANSFER_SAGA_TEMPLATES = [\n${OLD_TEMPLATES}\n];`).replace(interp, "template.replace('{name}', sagaPlayer.name)");
  console.log('NEGATIVE CONTROL ON: the six old templates and the name interpolation are back');
}

console.log('1) no template array in src pairs a name placeholder with a conduct verb');
{
  const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'node_modules' ? [] : walk(p);
    return /\.(ts|tsx)$/.test(e.name) && !/\.test\./.test(e.name) ? [p] : [];
  });
  const files = walk(path.join(ROOT, 'src'));
  let arrays = 0, offenders = [];
  for (const file of files) {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    const src = rel === 'src/lib/worldXi.ts' ? worldXiSrc : fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
    const code = stripComments(src);
    for (const m of code.matchAll(/const \w*TEMPLATES\w* = \[([\s\S]*?)\];/g)) {
      arrays += 1;
      const lineNo = code.slice(0, m.index).split('\n').length;
      for (const s of m[1].matchAll(/['"`]([^'"`\n]*)['"`]/g)) {
        const line = s[1];
        if (/\{name\}/.test(line) && CONDUCT.test(line)) offenders.push(`${rel}:${lineNo} "${line.slice(0, 70)}"`);
      }
    }
  }
  console.log(`   ${arrays} template arrays across ${files.length} files`);
  if (offenders.length) fail(`${offenders.length} template line(s) put a real name next to a conduct verb: ${offenders.slice(0, 3).join(' | ')}`);
  else console.log('   none pairs {name} with conduct');
}

console.log('2) the real World XI engine never prints conduct beside a squad member\'s name');
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-conduct-'));
  const entry = path.join(tmp, 'worldXi.ts');
  fs.writeFileSync(entry, worldXiSrc);
  const out = path.join(tmp, 'worldXi.mjs');
  const esbuild = path.join(ROOT, 'node_modules', '.bin', process.platform === 'win32' ? 'esbuild.cmd' : 'esbuild');
  try {
    execFileSync(esbuild, [entry, '--bundle', '--format=esm', '--platform=node', `--outfile=${out}`, `--alias:@=${path.join(ROOT, 'src')}`, '--log-level=error'], { stdio: 'pipe', shell: process.platform === 'win32' });
  } catch (e) {
    fail(`could not bundle worldXi.ts: ${String(e.stderr || e.message).slice(0, 200)}`);
  }
  if (fs.existsSync(out)) {
    /* The bundle pulls in the Supabase client, which reads localStorage at
       module scope. A Map stands in for it, the way every harness that
       bundles a real module does. */
    if (typeof globalThis.localStorage === 'undefined') {
      const store = new Map();
      globalThis.localStorage = {
        getItem: k => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => { store.set(k, String(v)); },
        removeItem: k => { store.delete(k); },
        clear: () => store.clear(),
        key: i => [...store.keys()][i] ?? null,
        get length() { return store.size; },
      };
    }
    const mod = await import(pathToFileURL(out).href);
    const simulate = mod.simulateSeason || mod.simulateWorldXiSeason || mod.runSeason;
    if (typeof simulate !== 'function') {
      const names = Object.keys(mod).filter(k => /season|simulate/i.test(k));
      fail(`worldXi.ts exports no season simulator this harness recognises (saw: ${names.join(', ') || 'nothing matching'})`);
    } else {
      /* Real, named footballers in the shape the engine reads. The names
         matter: the check is that none of them ends up beside a conduct verb. */
      const squad = [
        ['Thibaut Courtois', 'GK', 20000000], ['Trent Alexander-Arnold', 'RB', 75000000], ['Virgil van Dijk', 'CB', 30000000],
        ['Ruben Dias', 'CB', 80000000], ['Theo Hernandez', 'LB', 50000000], ['Rodri', 'CDM', 120000000],
        ['Jude Bellingham', 'CAM', 180000000], ['Pedri', 'CM', 100000000], ['Bukayo Saka', 'RW', 140000000],
        ['Vinicius Junior', 'LW', 180000000], ['Erling Haaland', 'ST', 180000000],
      ].map(([name, position, marketValue], i) => ({ id: `p${i}`, name, position, marketValue, nationality: 'x', club: 'x' }));
      let lines = 0, named = 0, offenders = [];
      for (let seed = 1; seed <= 400; seed += 1) {
        let report;
        try { report = simulate(squad, seed); } catch (e) { fail(`simulate threw on seed ${seed}: ${String(e.message).slice(0, 120)}`); break; }
        const narrative = Array.isArray(report?.narrative) ? report.narrative : [];
        for (const line of narrative) {
          lines += 1;
          const who = squad.find(p => line.includes(p.name));
          if (!who) continue;
          named += 1;
          if (CONDUCT.test(line)) offenders.push(`seed ${seed}: "${line.slice(0, 90)}"`);
        }
      }
      console.log(`   400 seasons, ${lines} narrative lines, ${named} naming a squad member (goals and injuries are allowed to)`);
      if (lines === 0) fail('the engine produced no narrative at all, so this section measured nothing');
      if (offenders.length) fail(`${offenders.length} line(s) put a real name beside conduct: ${offenders.slice(0, 2).join(' | ')}`);
      else if (lines > 0) console.log('   none of them beside a conduct verb');
    }
  }
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log('3) World XI and Build Your XI show the same report');
{
  const lb = stripComments(read('src/pages/LineupBuilder.tsx'));
  const wx = stripComments(read('src/pages/WorldXi.tsx'));
  if (/\.filter\(\(line\) => line !== seasonReport\.transferHeadline\)/.test(lb)) fail('Build Your XI still filters the transfer line out, so the two pages disagree about what the engine may say');
  if (!/seasonReport\.narrative/.test(lb)) fail('Build Your XI does not render the narrative, so this check read nothing');
  if (!/seasonReport\.narrative/.test(wx)) fail('World XI does not render the narrative, so this check read nothing');
  if (!failures) console.log('   both pages render seasonReport.narrative unfiltered');
}

await new Promise(r => setTimeout(r, 50));
if (CONTROL) {
  if (failures > 0) { console.log(`\ncontrol "${CONTROL}": ${failures} failure(s) fired as expected, the check works`); process.exit(0); }
  console.error(`\ncontrol "${CONTROL}": changed NOTHING, the check is dead`);
  process.exit(1);
}
if (failures > 0) { console.error(`\nsimNoInventedConduct: ${failures} failure(s)`); process.exit(1); }
console.log('\nsimNoInventedConduct: green. A real player can score in your sim and get hurt in it. He cannot fall out with the board in it.');
