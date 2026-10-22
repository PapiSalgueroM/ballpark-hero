/* Reviewer probe for Round 1523 (run lens). Never committed. Runs on a GitHub runner from the repo root.
   PART=hub: does the hub's line under the Morale bar (and the squad plan) tell the truth about the press it
     precedes? At every press of a fleet: the line's games and step computed on the save the hub shows, against
     what the engine then played (the phone after the summer's texts, the morale noted at the press).
   PART=save: saves written by origin/main's engine (BASE_ROOT, a worktree at the merge base) are loaded by this
     branch's save parser and pressed once on both trees with one seeded stream. At a morale inside the zero band
     (74 to 88) and pinned at 81 the two must be byte identical with the same draws; outside it they differ by design.
   Env: PART, N (careers), SEED, FLEET (house|engaged), BASE_ROOT. Last line: PROBE <part> ... */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const PART = process.env.PART || 'hub';
const N = Number(process.env.N || 120);
const SEED = Number(process.env.SEED || 1523);
const FLEET = process.env.FLEET || 'house';
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'probe1523-'));
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const mulberry = seed => { let s = seed | 0; return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
let draws = 0;
const seedRandom = seed => { const r = mulberry(seed); draws = 0; Math.random = () => { draws += 1; return r(); }; };

async function bundle(root, name, mods, hooks = false) {
  const entry = path.join(TMP, `${name}-entry.ts`);
  fs.writeFileSync(entry, Object.entries(mods).map(([k, m]) => `export * as ${k} from '${path.join(root, 'src/lib', m).split(path.sep).join('/')}';`).join('\n'));
  const out = path.join(TMP, `${name}.mjs`);
  await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error',
    alias: { '@': path.join(root, 'src') }, absWorkingDir: root, nodePaths: [path.join(ROOT, 'node_modules')] });
  let text = fs.readFileSync(out, 'utf8');
  if (hooks) {
    const PRESS = 'MORALE_AT_PRESS.set(s, s.morale);';
    if (text.split(PRESS).length !== 2) { console.log('ABORT: the press mark is not in the bundle once'); process.exit(2); }
    text = text.replace(PRESS, `${PRESS} if (globalThis.__press) globalThis.__press(s.morale);`);
    const APPS = 'dressingRoomApps(phoneAppsSwing(state), moraleAtPress(state))';
    const at = text.indexOf(APPS);
    if (at < 0 || text.indexOf(APPS, at + 1) >= 0) { console.log('ABORT: the apps line is not in the bundle once'); process.exit(2); }
    const end = text.indexOf(';', at) + 1;
    text = `${text.slice(0, end)}\n  if (globalThis.__apps) globalThis.__apps(state);${text.slice(end)}`;
  }
  fs.writeFileSync(out, text);
  return import(pathToFileURL(out).href);
}
const { careerStep } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/careerStep.mjs')).href);
const POS = ['ST', 'CM', 'CB', 'GK', 'LW', 'CAM', 'CDM', 'RB', 'RW', 'LB'];
const STAT_KEYS = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical', 'reflexes'];
function newCareer(S, i) {
  const ovr = 56 + (i % 5) * 3, pos = POS[i % POS.length], off = S.A.POSITION_OFFSETS[pos];
  const stats = Object.fromEntries(STAT_KEYS.map((k, j) => [k, Math.max(25, Math.min(99, ovr + off[j]))]));
  return S.E.initCareer('Probe Man', i % 2 ? 'England' : 'Spain', pos, '2020-24', stats, ovr, 2020, S.E.FALLBACK_CLUBS, null, Math.min(94, ovr + 20));
}
function step(S, c) {
  if (c.phase === 'retirement_suggestion') return S.E.declineRetirementSuggestion(c, S.E.FALLBACK_CLUBS);
  if (['retirement_ceremony', 'post_retirement', 'retired'].includes(c.phase)) return { ...c, retired: true };
  return careerStep(S.E, c, S.E.FALLBACK_CLUBS);
}
function engage(S, c) {
  for (let r = 0; r < 6; r += 1) {
    const t = (c.phone?.threads ?? []).find(th => th.pending);
    const next = t ? S.E.answerPhoneText(c, t.id, 0) : c;
    if (next === c) break;
    c = next;
  }
  return c;
}

if (PART === 'hub') {
  const S = await bundle(ROOT, 'head', { E: 'soccerCareerEngine', A: 'soccerCareerAttributes', F: 'careerForm', P: 'soccerPhone', Q: 'soccerClubSquad' }, true);
  let presses = 0, pressedMoved = 0, phoneMoved = 0, gamesLie = 0, stepLie = 0, planLie = 0, capHub = 0, capEng = 0;
  const examples = [];
  let pressed = null, engPhone = null;
  globalThis.__press = m => { pressed = m; };
  globalThis.__apps = st => { engPhone = S.P.phoneAppsSwing(st); };
  for (let i = 0; i < N; i += 1) {
    seedRandom(SEED * 1000 + i);
    let c = newCareer(S, i);
    for (let k = 0; k < 2000 && !c.retired; k += 1) {
      if (FLEET === 'engaged' && c.phase === 'playing') c = engage(S, c);
      if (c.phase === 'playing' && !c.retired) {
        const hubPhone = S.P.phoneAppsSwing(c), hubGames = S.F.dressingRoomApps(hubPhone, c.morale) - hubPhone;
        const hubStep = S.F.soccerMoraleStep(c.morale), line = S.F.soccerMoraleLine(c.morale, hubPhone);
        let planGames = null;
        try { const at = S.Q.squadNow(c); if (at) planGames = S.Q.managerTrust(c, at).moraleGames; } catch { planGames = null; }
        pressed = null; engPhone = null;
        const before = c;
        c = step(S, c);
        if (pressed !== null && engPhone !== null) {
          presses += 1;
          const engGames = S.F.dressingRoomApps(engPhone, pressed) - engPhone, engStep = S.F.soccerMoraleStep(pressed);
          if (pressed !== before.morale) pressedMoved += 1;
          if (engPhone !== hubPhone) phoneMoved += 1;
          if (hubGames !== S.F.soccerMoraleStep(before.morale)) capHub += 1;
          if (engGames !== engStep) capEng += 1;
          if (engStep !== hubStep) stepLie += 1;
          if (engGames !== hubGames) { gamesLie += 1; if (examples.length < 6) examples.push(`"${line}" (phone ${hubPhone} on the hub, ${engPhone} at the draw): the engine played ${engGames} games from morale`); }
          if (planGames !== null && planGames !== engGames) planLie += 1;
        }
        continue;
      }
      c = step(S, c);
    }
  }
  console.log(`hub probe, ${FLEET} fleet, ${N} careers, seed ${SEED}: ${presses} presses`);
  console.log(`  pressed morale differs from the hub's: ${pressedMoved}; phone swing at the draw differs from the hub's: ${phoneMoved}`);
  console.log(`  the cap took a share of the morale step: on the hub ${capHub}, at the draw ${capEng}`);
  console.log(`  the line's games disagree with the engine's: ${gamesLie} (${(100 * gamesLie / Math.max(1, presses)).toFixed(2)} percent); its rating step: ${stepLie}; the squad plan's morale games: ${planLie}`);
  for (const e of examples) console.log(`  e.g. ${e}`);
  console.log(`PROBE hub ${FLEET}: presses=${presses} gamesLie=${gamesLie} stepLie=${stepLie} planLie=${planLie} phoneMoved=${phoneMoved}`);
}

if (PART === 'save') {
  const BASE_ROOT = process.env.BASE_ROOT || '/tmp/base';
  const B = await bundle(BASE_ROOT, 'base', { E: 'soccerCareerEngine', A: 'soccerCareerAttributes', SAVE: 'soccerCareerSave', P: 'soccerPhone' });
  const H = await bundle(ROOT, 'head2', { E: 'soccerCareerEngine', A: 'soccerCareerAttributes', SAVE: 'soccerCareerSave', P: 'soccerPhone', F: 'careerForm' });
  const tally = { inband: [0, 0], outband: [0, 0], pinned: [0, 0] };
  let saves = 0, parseDiffer = 0, notSave = 0, badLine = 0, retireSaves = 0;
  const odd = [];
  const playOn = (S, c0, seed) => {
    seedRandom(seed);
    const trail = [];
    let c = step(S, c0); trail.push(JSON.stringify(c));
    for (let n = 0; n < 10 && c.phase !== 'playing' && !c.retired; n += 1) { c = step(S, c); trail.push(JSON.stringify(c)); }
    return { trail: trail.join('\n'), draws };
  };
  for (let i = 0; i < N; i += 1) {
    seedRandom(SEED * 1000 + i);
    let c = newCareer(B, i);
    const target = 1 + (i % 14);
    let seen = 0;
    for (let k = 0; k < 2000 && !c.retired; k += 1) {
      if (c.phase === 'playing' || c.phase === 'retirement_suggestion') { seen += 1; if (seen >= target) break; }
      c = step(B, c);
    }
    if (c.retired || !(c.phase === 'playing' || c.phase === 'retirement_suggestion')) continue;
    saves += 1;
    if (c.phase === 'retirement_suggestion') retireSaves += 1;
    const raw = B.SAVE.serializeSoccerCareerSave(c);
    const h0 = H.SAVE.parseSoccerCareerSave(raw), b0 = B.SAVE.parseSoccerCareerSave(raw);
    if (!H.SAVE.isSoccerCareerSave(h0)) notSave += 1;
    if (JSON.stringify(h0) !== JSON.stringify(b0)) parseDiffer += 1;
    const line = H.F.soccerMoraleLine(h0.morale, H.P.phoneAppsSwing(h0));
    if (/undefined|NaN/.test(line)) badLine += 1;
    const seed = SEED * 7919 + i * 131;
    for (const kind of ['natural', 'pinned']) {
      const hb = JSON.parse(JSON.stringify(b0)), hh = JSON.parse(JSON.stringify(h0));
      if (kind === 'pinned') { hb.morale = 81; hh.morale = 81; }
      const ob = playOn(B, hb, seed), oh = playOn(H, hh, seed);
      const same = ob.trail === oh.trail && ob.draws === oh.draws;
      const bucket = kind === 'pinned' ? 'pinned' : (H.F.soccerMoraleStep(hh.morale) === 0 ? 'inband' : 'outband');
      tally[bucket][same ? 0 : 1] += 1;
      if (!same && bucket !== 'outband' && odd.length < 6) odd.push(`career ${i} ${kind} morale ${hh.morale} phase ${hh.phase} year ${hh.seasons?.at(-1)?.year}: draws ${ob.draws} vs ${oh.draws}`);
    }
  }
  console.log(`save probe: ${saves} saves written by the base engine (${retireSaves} on the retirement screen), seed ${SEED}`);
  console.log(`  parsed by this branch as a save: ${saves - notSave} of ${saves}; parsed differently from the base: ${parseDiffer}; hub line with undefined or NaN: ${badLine}`);
  console.log(`  pressed on both trees, one seeded stream, through the season's screens:`);
  console.log(`    morale inside 74 to 88: ${tally.inband[0]} byte identical, ${tally.inband[1]} not`);
  console.log(`    morale pinned at 81:    ${tally.pinned[0]} byte identical, ${tally.pinned[1]} not`);
  console.log(`    morale outside the band: ${tally.outband[0]} identical, ${tally.outband[1]} moved (by design)`);
  for (const o of odd) console.log(`  odd: ${o}`);
  const ok = notSave === 0 && parseDiffer === 0 && badLine === 0 && tally.inband[1] === 0 && tally.pinned[1] === 0 && tally.outband[1] > 0;
  console.log(`PROBE save: ${ok ? 'green' : 'RED'} inband=${tally.inband.join('/')} pinned=${tally.pinned.join('/')} outband=${tally.outband.join('/')}`);
  process.exit(ok ? 0 : 1);
}
