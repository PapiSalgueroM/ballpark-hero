// Review of Round 1538 (run lens): old saves. Careers are played on the BASE tree (1c7205d0, Round 1534's closing
// head, built as its own bundle). At every summer card the save is frozen as JSON; that JSON is then loaded on the
// base and on the head through the board's own load chain (the binding's repairNetWorth, repairSummerOnLoad,
// repairHallOnLoad, then seekSummerCard), and every answer of the card on screen is applied on both with the same
// stream and the same pinned Math.random. An answer this round did not change must land byte identical (line and
// save). A changed answer must keep its rule: the Skill answer never lifts past min(99, pot) nor lowers the rating,
// and says what it did; a paid answer moves earnings and Cash by the same amount, which its line prints.
// Exit 0 when every check holds, 1 when one does not, 2 when it could not run. Nothing here reaches the network.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';

const HEAD = process.cwd();
const BASE_SHA = process.env.OS_BASE || '1c7205d059cbcb380ebacaef99ba6751e8c641df';
const BASE = '/tmp/obase1538';
const CAREERS = Number(process.env.OS_CAREERS || 60);
if (!fs.existsSync(BASE)) execSync(`git worktree add ${BASE} ${BASE_SHA}`, { stdio: 'ignore' });
const US = [
  { id: 'nba', S: 'NBA', maint: 31 }, { id: 'nfl', S: 'NFL', maint: 30 },
  { id: 'mlb', S: 'MLB', maint: 32 }, { id: 'nhl', S: 'NHL', maint: 31 },
];
const ARCH = { nba: 'NBA_ARCHETYPES', nfl: 'ARCHETYPES', mlb: 'MLB_ARCHETYPES', nhl: 'NHL_ARCHETYPES' };
const ERAS = { nba: 'NBA_ERAS', nfl: 'NFL_ERAS', mlb: 'MLB_ERAS', nhl: 'NHL_ERAS' };
const SKILL = new Set(['Skill grind', 'Skill work', 'New pitch lab', 'Swing rebuild', 'Skills coach']);
const PAID = new Set(['Build the brand', 'Brand work', 'The commercial circuit', 'The content summer',
  'Tell your brand immediately', 'Sign all 5,000 yourself', 'Sign the cleaned up version, 2.5M', 'Play the tour straight, 900k',
  'Sign the clean version, 2M', 'Finish all 4,000 yourself', 'Sign the clean version, 1.8M', 'Only authenticate the real ones',
  'Sign the clean version, 1.5M']);

async function bundle(root, name) {
  const p = s => path.join(root, s).split(path.sep).join('/');
  const entry = path.join('/tmp', `os1538-${name}.ts`);
  fs.writeFileSync(entry, [
    ...US.map(s => `export * as ${s.id} from '${p(`src/lib/${s.id}MyCareer.ts`)}';`),
    ...US.map(s => `export { ${s.S}_CAREER_SPORT as ${s.id}Sport } from '${p(`src/lib/${s.id}CareerSport.ts`)}';`),
    `export { startSummer, answerSummerCard, seekSummerCard, repairSummerOnLoad } from '${p('src/lib/usCareerSummer.ts')}';`,
    `export { repairHallOnLoad } from '${p('src/lib/usCareerRetirementFlow.ts')}';`,
  ].join('\n'));
  const out = path.join('/tmp', `os1538-${name}.mjs`);
  await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error',
    alias: { '@': p('src') }, absWorkingDir: root, nodePaths: [path.join(HEAD, 'node_modules')],
    loader: { '.json': 'json' } });
  return import(`file://${out}?v=${Date.now()}`);
}
const mulberry = seed => { let s = seed | 0; return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const pinned = (seed, f) => { const real = Math.random; Math.random = mulberry(seed ^ 0x51ed); try { return f(); } finally { Math.random = real; } };

let B, H;
try { B = await bundle(BASE, 'base'); H = await bundle(HEAD, 'head'); } catch (e) { console.log(`oldsave1538: could not run, ${String(e).slice(0, 300)}`); process.exit(2); }

function load(X, sport, json) {
  const SB = X[`${sport.id}Sport`];
  const c = SB.repairNetWorth(JSON.parse(json));
  X.repairSummerOnLoad(c); X.repairHallOnLoad(c);
  const ev = c.summer ? X.seekSummerCard(c, SB) : null;
  return { c, ev, SB };
}
const bad = [];
const tally = Object.fromEntries(US.map(s => [s.id, { saves: 0, answers: 0, same: 0, skill: 0, paid: 0, seek: 0, loadseek: 0, overpot: 0, loadgone: 0, atcap: 0, overcap: 0, skillYoung: 0 }]));
const note = (sport, msg) => { if (bad.length < 25) console.log(`   BAD ${sport.id}: ${msg}`); bad.push(msg); };
// v2: a later card's skip can end the summer on one tree only, so the summer block is set aside whole
const strip = c => { const x = JSON.parse(JSON.stringify(c)); delete x.summer; return JSON.stringify(x); };

function checkPair(sport, json, opt, seed, t) {
  const b = load(B, sport, json), h = load(H, sport, json);
  if (!b.ev || !h.ev) { if (b.ev || h.ev) t.loadgone += 1; return; }
  if (b.ev.id !== h.ev.id) { t.loadseek += 1; return; }
  const label = b.ev.options[opt]?.label;
  const hopt = h.ev.options.findIndex(o => o.label === label);
  if (hopt !== opt) { note(sport, `${b.ev.id}: answer ${opt} "${label}" is at ${hopt} on the head`); return; }
  const before = JSON.parse(json);
  const ob = pinned(seed, () => B.answerSummerCard(b.c, b.SB, b.ev, opt, mulberry(seed)));
  const oh = pinned(seed, () => H.answerSummerCard(h.c, h.SB, h.ev, opt, mulberry(seed)));
  t.answers += 1;
  const cap = Math.min(99, before.pot);
  if (SKILL.has(label)) {
    t.skill += 1;
    if (h.c.ovr > Math.max(before.ovr, cap)) note(sport, `Skill "${label}" lifted ${before.ovr} to ${h.c.ovr} over the ceiling ${cap}`);
    if (h.c.ovr < before.ovr) note(sport, `Skill "${label}" lowered ${before.ovr} to ${h.c.ovr} (pot ${before.pot})`);
    const m = /Rating \+(\d+)/.exec(oh.line);
    if (m && h.c.ovr - before.ovr !== Number(m[1])) note(sport, `Skill line "${oh.line}" but the rating went ${before.ovr} to ${h.c.ovr}`);
    if (/already at your ceiling/.test(oh.line) && h.c.ovr !== before.ovr) note(sport, `Skill line "${oh.line}" but the rating moved`);
    if (before.ovr > cap) t.overpot += 1;
    if (before.age < sport.maint) { t.skillYoung += 1; if (before.ovr === cap) t.atcap += 1; if (before.ovr > cap) t.overcap += 1; }
    return;
  }
  if (PAID.has(label)) {
    t.paid += 1;
    const de = Math.round((h.c.earnings - before.earnings) * 1e6) / 1e6;
    const dc = Math.round(((h.c.netWorth ?? 0) - (before.netWorth ?? Math.round(before.earnings * 0.45 * 10) / 10)) * 1e6) / 1e6;
    if (Math.abs(de - dc) > 1e-6) note(sport, `"${label}" moved earnings ${de} and Cash ${dc}`);
    if (!oh.line.includes(`${Math.round(de * 10) / 10}M`)) note(sport, `"${label}" line "${oh.line}" does not print the ${de}M that landed`);
    if (h.c.netWorth !== Math.round(h.c.netWorth * 10000) / 10000) note(sport, `"${label}" left Cash at ${h.c.netWorth}`);
    return;
  }
  if (oh.line === ob.line && JSON.stringify(h.c) === JSON.stringify(b.c) && (oh.next?.id ?? null) === (ob.next?.id ?? null)) { t.same += 1; return; }
  if (oh.line === ob.line && strip(h.c) === strip(b.c)) { t.seek += 1; return; }
  note(sport, `${b.ev.id} "${label}" differs on an answer this round did not change: base "${ob.line}" head "${oh.line}"`);
}

for (const sport of US) {
  const t = tally[sport.id];
  for (let k = 0; k < CAREERS; k += 1) {
    const lib = B[sport.id], SB = B[`${sport.id}Sport`];
    const positions = Object.keys(lib[ARCH[sport.id]]);
    const pos = positions[k % positions.length], archs = lib[ARCH[sport.id]][pos];
    const arch = archs[Math.floor(k / positions.length) % archs.length], era = lib[ERAS[sport.id]][k % lib[ERAS[sport.id]].length].id;
    const rng = mulberry(1538 * 7919 + k);
    pinned(k, () => {
      const c = SB.startCareer(`Old save ${k}`, pos, arch, rng, null, era);
      let tq = null;
      for (let season = 0; season < 24 && !c.retired; season += 1) {
        if ((c.suspendedSeasons ?? 0) > 0) { c.suspendedSeasons -= 1; c.seasons.push(SB.suspendedLine(c)); SB.progress(c, rng); continue; }
        tq = SB.rollTeamQuality(tq, rng); SB.campBattle(c, tq, rng); SB.simSeason(c, tq, rng); SB.progress(c, rng);
        if (SB.shouldRetire(c)) break;
        let ev = B.startSummer(c, SB, rng);
        let n = 0;
        while (ev && n < 6) {
          const json = JSON.stringify(c);
          t.saves += 1;
          for (let o = 0; o < ev.options.length; o += 1) {
            const seed = (k * 1009 + season * 31 + n * 7 + o) | 0;
            try { checkPair(sport, json, o, seed, t); } catch (e) { note(sport, `threw on ${ev.id} answer ${o}: ${String(e).slice(0, 160)}`); }
          }
          /* v2: old saves at the ceiling, the shape the old rider left behind: the same save standing on the training
             card with the rating at the ceiling and one over it (pot + 1, which the old Skill answer reached). */
          if (ev.id === 'training' && c.age < sport.maint) {
            const cap = Math.min(99, c.pot);
            for (const ovr of [cap, cap + 1]) {
              const v = JSON.parse(json); v.ovr = ovr;
              const vj = JSON.stringify(v);
              for (let o = 0; o < ev.options.length; o += 1) {
                const seed = (k * 1013 + season * 37 + ovr * 3 + o) | 0;
                try { checkPair(sport, vj, o, seed, t); } catch (e) { note(sport, `threw on the ceiling variant ${ovr}, answer ${o}: ${String(e).slice(0, 160)}`); }
              }
            }
          }
          const real = Math.random;
          const out = B.answerSummerCard(c, SB, ev, Math.floor(rng() * ev.options.length), rng);
          Math.random = real;
          ev = out.next; n += 1;
        }
      }
    });
  }
  console.log(`   ${sport.id}: ${CAREERS} base careers, ${t.saves} saves on a summer card, ${t.answers} answers on both trees: ${t.same} byte identical, ${t.seek} differ only in the summer's place (a later card's skip), ${t.skill} Skill (${t.overpot} from a rating above the ceiling), ${t.paid} paid; ${t.loadseek} saves load onto a different card, ${t.loadgone} load with the summer over on one tree only; under the maintenance age ${t.skillYoung} Skill answers, ${t.atcap} at the ceiling and ${t.overcap} over it`);
}
console.log(bad.length ? `oldsave1538: RED, ${bad.length} findings` : 'oldsave1538: green, every old save loads and answers as the round says');
process.exit(bad.length ? 1 : 0);
