#!/usr/bin/env node
/**
 * Round 1132: the sound kit, held to numbers.
 *
 * A sound cannot be read in a diff. So every cue in src/lib/soundKit.ts is
 * rendered to its sample buffer and held to what it claims to be (how long,
 * how loud, where its energy sits, how it moves), every named moment is mixed
 * and held under the ceiling, the source is scanned so the audio graph has one
 * home and no audio file ships, and the switch in src/lib/sound.ts is driven
 * against a fake audio graph through every way it could make a noise it
 * should not: off, never chosen, a hostile stored value, before a tap, in a
 * hidden tab, under the prerenderer, after a hush, late.
 *
 * Offline by construction: it opens no socket and reads no clock but the
 * process's own.
 *
 *   node scripts/simSound.mjs                      the whole harness
 *   SIM_SOUND_CONTROL=<name> node scripts/...      one negative control; exit 0 only when its aimed checks went RED
 *   SIM_SOUND_CONTROL=all node scripts/...         every control in turn; exit 0 only when every one fired
 *   SIM_SOUND_WAV=<folder> node scripts/...        also writes every cue and every moment as a WAV, for ears
 *
 * MEASURED (see the MEASURED block below the helpers for every number and its date).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = ROOT.replaceAll('\\', '/');
const CONTROL = process.env.SIM_SOUND_CONTROL || '';
const WAV = process.env.SIM_SOUND_WAV || '';
const require = createRequire(path.join(ROOT, 'package.json'));
const esbuild = require('esbuild');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), `simSound-${process.pid}-`));

/** Every read of a file under src: CRLF normalised, so an anchor matches on any checkout. */
const readSrc = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
/** Strip comments so a check can only be satisfied by code, never by prose about the rule. */
const code = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');

/* ---------- the bundle: the switch and the kit as one node module ---------- */
const ENTRY = path.join(TMP, 'entry.ts');
fs.writeFileSync(ENTRY, `export * from '${R}/src/lib/sound.ts';\nexport * as kit from '${R}/src/lib/soundKit.ts';\n`);
const BASE = path.join(TMP, 'bundle.mjs');
await esbuild.build({ entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: BASE, logLevel: 'error' });
const BASE_TEXT = fs.readFileSync(BASE, 'utf8');
let serial = 0;
/** A loader over one bundle text: every call is a fresh module, so no scene inherits another's state. */
function loaderFor(text, memory) {
  const file = path.join(TMP, `bundle-${serial += 1}.mjs`);
  fs.writeFileSync(file, text);
  return async () => {
    const lib = await import(`${pathToFileURL(file).href}?s=${serial += 1}`);
    if (memory) memory(lib);
    return lib;
  };
}

/* ---------- measuring a buffer ---------- */
/** power spectrum of a buffer, kept per buffer: the transform is the slow part and several rows read one cue */
const spectra = new WeakMap();
function fftPower(buf, SR) {
  const kept = spectra.get(buf);
  if (kept) return kept;
  let n = 1;
  while (n < buf.length) n <<= 1;
  const re = new Float64Array(n), im = new Float64Array(n);
  re.set(buf);
  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { const t = re[i]; re[i] = re[j]; re[j] = t; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k += 1) {
        const a = i + k, b = a + len / 2;
        const xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi;
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
  const p = new Float64Array(n / 2);
  for (let i = 0; i < n / 2; i += 1) p[i] = re[i] * re[i] + im[i] * im[i];
  const out = { p, hz: i => i * SR / n };
  spectra.set(buf, out);
  return out;
}
const SR = 44100;
/** share of the energy from `lo` to `hi` Hz, of the energy at or above `floor` Hz */
function share(buf, lo, hi, floor = 0) {
  const { p, hz } = fftPower(buf, SR);
  let band = 0, all = 0;
  for (let i = 1; i < p.length; i += 1) { const f = hz(i); if (f < floor) continue; all += p[i]; if (f >= lo && f < hi) band += p[i]; }
  return all > 0 ? band / all : 0;
}
function rms(buf, a = 0, b = buf.length / SR) {
  const i0 = Math.round(a * SR), i1 = Math.min(buf.length, Math.round(b * SR));
  let s = 0;
  for (let i = i0; i < i1; i += 1) s += buf[i] * buf[i];
  return Math.sqrt(s / Math.max(1, i1 - i0));
}
const peak = buf => { let m = 0; for (let i = 0; i < buf.length; i += 1) m = Math.max(m, Math.abs(buf[i])); return m; };
const slice = (buf, a, b) => buf.subarray(Math.round(a * SR), Math.round(b * SR));
function goertzel(buf, f) {
  const c = 2 * Math.cos(2 * Math.PI * f / SR);
  let s1 = 0, s2 = 0;
  for (let i = 0; i < buf.length; i += 1) { const s0 = buf[i] + c * s1 - s2; s2 = s1; s1 = s0; }
  return s1 * s1 + s2 * s2 - c * s1 * s2;
}
function centroid(buf, floor) {
  const { p, hz } = fftPower(buf, SR);
  let a = 0, b = 0;
  for (let i = 1; i < p.length; i += 1) { const f = hz(i); if (f < floor) continue; a += f * p[i]; b += p[i]; }
  return b > 0 ? a / b : 0;
}
const f3 = x => (Number.isFinite(x) ? x.toFixed(3) : String(x));
const SEEDS = Array.from({ length: 20 }, (_, i) => (i + 1) * 7919 + 3);
/** A cue rendered on its default seed and on the 20 others, once per loaded kit (a render is the slow part). */
const renders = new WeakMap();
function buffersOf(kit, name) {
  let mine = renders.get(kit.CUES);
  if (!mine) renders.set(kit.CUES, mine = {});
  return mine[name] ??= [kit.CUES[name].render(), ...SEEDS.map(s => kit.CUES[name].render(s))];
}

/* ---------- reporting ---------- */
let checks = 0, failed = 0, quietRun = false;
/** ids of the checks that went red in this run, so a control can count the ones it aimed at */
let reds = [];
function check(id, ok, msg) {
  checks += 1;
  if (!ok) { failed += 1; reds.push(id); }
  if (!quietRun) console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${msg}`);
}
const head = s => { if (!quietRun) console.log(`\n${s}`); };

/* ---------- MEASURED on 2026-10-07 (SIM_SOUND_MEASURE=1), every band and floor below comes from these ----------
   rms on the default seed and on 20 others (s * 7919 + 3, s from 1 to 20); a band is 0.75 times the lowest to
   1.25 times the highest. A cue is a fixed function of its seed, so these are properties of a buffer, the same
   on every run, not a sample of anything.
     whistle 0.248 to 0.261    net 0.087 to 0.103    crowd 0.061 to 0.085
     tick    0.067 to 0.079    sting 0.121 (no noise in it, one buffer)    thud 0.140 to 0.147
   Character, the worst of the 21 seeds, and what the wrong sound scores on the same statistic:
     whistle  share 2,500 to 3,600 Hz        0.982          the thud 0.000              floor 0.85
     thud     share below 600 Hz             0.993          the whistle 0.000, the tick 0.000   floor 0.85
     thud     share 300 to 1,500 Hz          0.206          the thud with no knock 0.002        floor 0.10
     tick     share 1,000 to 3,000 Hz        0.994          the thud 0.000              floor 0.85
     tick     share in the first 25 ms       0.996          flat noise 0.486            floor 0.90
     crowd    middle over the first 0.12 s   19.7           flat noise 1.00             floor 5
     crowd    middle over the last 0.12 s    23.3           flat noise 1.00             floor 5
     crowd    share above 4,000 Hz           0.034 (highest) flat noise 0.818           ceiling 0.15
     net      centroid early over late       1.518          noise that does not fall 1.034   floor 1.25
     sting    each note's lead in its window 11.5, 4.3, 4.7, 2.03   played backwards 0.002, 0.157, 0.402, 0.920   floor 1.4
   The thud was retuned in this round before anything played it: as first designed 99.8 percent of its energy
   sat below 300 Hz, where a phone's speaker carries almost nothing, so a miss would have been silence on the
   device most players hold. It now has a short knock from 580 down to 400 Hz over the low tone. */
const RMS_BAND = {
  whistle: [0.186, 0.326],
  net: [0.065, 0.129],
  crowd: [0.046, 0.106],
  tick: [0.050, 0.099],
  sting: [0.091, 0.151],
  thud: [0.105, 0.183],
};

/* ---------- 1. every cue is a finite, audible, short buffer ---------- */
async function section1(fresh) {
  head('1) Every cue is a finite, audible, short buffer');
  const { kit } = await fresh();
  for (const [name, cue] of Object.entries(kit.CUES)) {
    const b = cue.render();
    const want = Math.round(cue.seconds * kit.SAMPLE_RATE);
    check(`1.length.${name}`, b.length === want && cue.seconds <= 1.5, `${name}: ${b.length} samples, ${f3(b.length / kit.SAMPLE_RATE)} s (declared ${cue.seconds} s, at most 1.5)`);
    let finite = true, sum = 0;
    for (let i = 0; i < b.length; i += 1) { if (!Number.isFinite(b[i])) finite = false; sum += b[i]; }
    check(`1.finite.${name}`, finite, `${name}: every sample finite`);
    check(`1.edges.${name}`, Math.abs(b[0]) < 1e-6 && Math.abs(b[b.length - 1]) < 1e-6, `${name}: starts and ends on zero`);
    const pk = peak(b);
    check(`1.peak.${name}`, Math.abs(pk - cue.peak) <= 0.005 && cue.peak <= 0.9, `${name}: peak ${f3(pk)} (declared ${cue.peak}, at most 0.9)`);
    check(`1.dc.${name}`, Math.abs(sum / b.length) <= 0.01, `${name}: mean ${(sum / b.length).toExponential(1)} (within 0.01 of zero)`);
    const again = cue.render();
    let same = again.length === b.length;
    for (let i = 0; same && i < b.length; i += 1) if (again[i] !== b[i]) same = false;
    check(`1.twice.${name}`, same, `${name}: two renders are sample for sample identical`);
    const band = RMS_BAND[name];
    if (!band) { check(`1.rms.${name}`, false, `${name}: no rms band. Measure it over 20 seeds (SIM_SOUND_MEASURE=1) and add the row`); continue; }
    const all = buffersOf(kit, name).map(x => rms(x));
    const lo = Math.min(...all), hi = Math.max(...all);
    check(`1.rms.${name}`, lo >= band[0] && hi <= band[1], `${name}: rms ${f3(all[0])} on the default seed, ${f3(lo)} to ${f3(hi)} over 21 seeds (band ${band[0]} to ${band[1]})`);
  }
}

/* ---------- 2. each cue sounds like what it says ---------- */
const STING_WINDOWS = [[0.01, 0.11], [0.13, 0.23], [0.25, 0.35], [0.38, 0.60]];
/** how far the k-th pitch leads the strongest of the other three inside the k-th window (below 1: it does not lead) */
const stingLead = k => (b, kit) => {
  const g = kit.STING_NOTES.map(f => goertzel(slice(b, STING_WINDOWS[k][0], STING_WINDOWS[k][1]), f));
  return g[k] / Math.max(...g.filter((_, i) => i !== k));
};
const noises = new Map();
function whiteNoise(n) {
  if (noises.has(n)) return noises.get(n);
  const w = new Float32Array(n);
  noises.set(n, w);
  let t = 99;
  for (let i = 0; i < n; i += 1) { t = (Math.imul(t, 1664525) + 1013904223) >>> 0; w[i] = (t / 4294967296) * 2 - 1; }
  return w;
}
/** The thud as first designed, with no knock: almost nothing a phone's speaker can carry. The wrong sound for the thud's body row. */
function thudWithNoKnock(kit) {
  const n = Math.round(0.22 * SR), buf = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i += 1) {
    const t = i / SR;
    ph += 2 * Math.PI * (55 + 95 * Math.exp(-t / 0.06)) / SR;
    buf[i] = Math.sin(ph) * Math.exp(-t / 0.055) * Math.min(1, i / 88, (n - 1 - i) / 661);
  }
  const m = peak(buf);
  for (let i = 0; i < n; i += 1) buf[i] *= kit.CUES.thud.peak / m;
  return buf;
}
const reversed = b => Float32Array.from(b).reverse();
/* One row per thing a cue claims. `min` or `max` is the floor or ceiling, held on the default seed and on 20
   others. `wrong` is a sound that must FAIL the row, checked on every run: a floor the wrong sound also clears
   measures nothing. */
const CHARACTER = {
  whistle: [
    { id: 'band', label: 'share of energy from 2,500 to 3,600 Hz', stat: b => share(b, 2500, 3600), min: 0.85, wrong: ['the thud', kit => kit.CUES.thud.render()] },
  ],
  thud: [
    { id: 'low', label: 'share of energy below 600 Hz', stat: b => share(b, 0, 600), min: 0.85, wrong: ['the whistle', kit => kit.CUES.whistle.render()], wrong2: ['the tick', kit => kit.CUES.tick.render()] },
    { id: 'body', label: 'share of energy from 300 to 1,500 Hz (what a phone can carry)', stat: b => share(b, 300, 1500), min: 0.10, wrong: ['the thud with no knock', thudWithNoKnock] },
  ],
  tick: [
    { id: 'band', label: 'share of energy from 1,000 to 3,000 Hz', stat: b => share(b, 1000, 3000), min: 0.85, wrong: ['the thud', kit => kit.CUES.thud.render().subarray(0, 2205)] },
    { id: 'early', label: 'share of energy in the first 25 ms', stat: b => (rms(b, 0, 0.025) ** 2 * Math.round(0.025 * SR)) / (rms(b) ** 2 * b.length), min: 0.90, wrong: ['flat noise', () => whiteNoise(2205)] },
  ],
  crowd: [
    { id: 'rise', label: 'rms of 0.35 to 0.85 s over the first 0.12 s', stat: b => rms(b, 0.35, 0.85) / rms(b, 0, 0.12), min: 5, wrong: ['flat noise', () => whiteNoise(61740)] },
    { id: 'fall', label: 'rms of 0.35 to 0.85 s over the last 0.12 s', stat: b => rms(b, 0.35, 0.85) / rms(b, b.length / SR - 0.12, b.length / SR), min: 5, wrong: ['flat noise', () => whiteNoise(61740)] },
    { id: 'dull', label: 'share of energy above 4,000 Hz', stat: b => share(b, 4000, 22051), max: 0.15, wrong: ['flat noise', () => whiteNoise(61740)] },
  ],
  net: [
    { id: 'falls', label: 'centroid above 500 Hz, first 60 ms over 150 to 300 ms', stat: b => centroid(slice(b, 0, 0.06), 500) / centroid(slice(b, 0.15, 0.30), 500), min: 1.25, wrong: ['noise that does not fall', () => whiteNoise(13230)] },
  ],
  sting: [0, 1, 2, 3].map(k => ({ id: `note${k + 1}`, label: `note ${k + 1} leads the other three in its window`, stat: stingLead(k), min: 1.4, wrong: ['the sting played backwards', kit => reversed(kit.CUES.sting.render())] })),
};
/** a statistic on the default seed and the 20 others: [worst for the row, lowest, highest] */
function overSeeds(name, row, kit) {
  const v = buffersOf(kit, name).map(b => row.stat(b, kit));
  const lo = Math.min(...v), hi = Math.max(...v);
  return [row.max === undefined ? lo : hi, lo, hi];
}
async function section2(fresh) {
  head('2) Each cue sounds like what it says');
  const { kit } = await fresh();
  for (const [name, cue] of Object.entries(kit.CUES)) {
    const rows = CHARACTER[name];
    if (!rows || !rows.length) { check(`2.row.${name}`, false, `${name}: no character row. Say what it is as a number, measure it over 20 seeds and add the row`); continue; }
    for (const row of rows) {
      const [worst, lo, hi] = overSeeds(name, row, kit);
      const passes = v => (row.max === undefined ? v >= row.min : v <= row.max);
      const bar = row.max === undefined ? `at least ${row.min}` : `at most ${row.max}`;
      check(`2.${name}.${row.id}`, passes(worst), `${name}: ${row.label}: ${f3(lo)} to ${f3(hi)} over 21 seeds (${bar})`);
      for (const w of [row.wrong, row.wrong2]) {
        if (!w) continue;
        const v = row.stat(w[1](kit), kit);
        check(`2.${name}.${row.id}.wrong`, !passes(v), `${name}: ${w[0]} in its place scores ${f3(v)} and fails that row`);
      }
    }
  }
}

/* ---------- 3. every moment mixes cleanly ---------- */
/** a moment's steps summed at their offsets and gains, as the audio graph would sum them */
function mixOf(kit, recipe) {
  const cues = recipe.steps.map(s => kit.CUES[s.cue]?.render());
  if (cues.some(c => !c)) return null;
  const len = Math.max(...recipe.steps.map((s, i) => Math.round((s.at ?? 0) * SR) + cues[i].length));
  const mix = new Float32Array(len);
  recipe.steps.forEach((s, i) => {
    const off = Math.round((s.at ?? 0) * SR), g = s.gain ?? 1, b = cues[i];
    for (let k = 0; k < b.length; k += 1) mix[off + k] += b[k] * g;
  });
  return mix;
}
/** the names in the SoundMoment union, read from the switch's source with comments stripped */
function unionNames() {
  const m = code(readSrc('src/lib/sound.ts')).match(/export type SoundMoment =([^;]+);/);
  return m ? [...m[1].matchAll(/'([A-Za-z]+)'/g)].map(x => x[1]) : [];
}
async function section3(fresh) {
  head('3) Every moment mixes cleanly');
  const { kit } = await fresh();
  const names = Object.keys(kit.MOMENTS), union = unionNames();
  check('3.union', union.length > 0 && union.length === names.length && union.every(n => names.includes(n)),
    `the moments table has exactly the ${union.length} names of the SoundMoment union (${names.length} rows)`);
  for (const [name, recipe] of Object.entries(kit.MOMENTS)) {
    const steps = recipe.steps ?? [];
    const known = steps.every(s => kit.CUES[s.cue]);
    check(`3.steps.${name}`, steps.length >= 1 && steps.length <= 4 && known && steps.every(s => (s.at ?? 0) >= 0 && (s.gain ?? 1) > 0 && (s.gain ?? 1) <= 1.5),
      `${name}: ${steps.length} step(s), every one a known cue at zero or later with a gain above 0 and at most 1.5`);
    const mix = known ? mixOf(kit, recipe) : null;
    if (!mix) { check(`3.mix.${name}`, false, `${name}: cannot be mixed`); continue; }
    const out = peak(mix) * kit.MASTER_GAIN;
    check(`3.mix.${name}`, mix.length / SR <= 2.0 && out <= 0.9 && out >= 0.15,
      `${name}: ${f3(mix.length / SR)} s, peak after the master gain ${f3(out)} (0.15 to 0.9, at most 2 s)`);
    const buzz = recipe.buzz ?? [];
    check(`3.buzz.${name}`, buzz.length <= 3 && buzz.every(ms => ms >= 10 && ms <= 80) && buzz.reduce((a, b) => a + b, 0) <= 200,
      `${name}: buzz ${buzz.length ? JSON.stringify(buzz) : 'none'} (at most three, 10 to 80 ms each, 200 ms in all)`);
  }
}

/* ---------- 4. no audio file, no audio element, one home for the audio graph ----------
   Source text with comments stripped (prose about a rule is where its words are guaranteed to appear) and test
   files left out. Every rule matches a SHAPE, never a bare word: a guide may say a phone vibrates. First run
   2026-10-08 on origin/release-al-int at e7f435e0 plus the kit and the switch alone: 1,381 files read, every
   shape rule green, so the base held none of these shapes before this round. */
const AUDIO_EXT = 'mp3|ogg|oga|wav|m4a|aac|flac|opus|weba|mid|midi';
const KIT_FILE = 'src/lib/soundKit.ts', SWITCH_FILE = 'src/lib/sound.ts', HOOK_FILE = 'src/hooks/useSoundPlan.ts';
function walk(rel, out = []) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return out;
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    const child = `${rel}/${e.name}`;
    if (e.isDirectory()) walk(child, out);
    else out.push(child);
  }
  return out;
}
const isTest = rel => /\.test\.tsx?$/.test(rel) || rel.startsWith('src/test/');
/** the files a rule reads, as code: [relative path, text with comments stripped]; a control's patch lands here */
let scanPatch = null;
function scannedCode() {
  const files = [...walk('src').filter(f => /\.(tsx?|jsx?|mjs|cjs|css|html|json)$/.test(f) && !isTest(f)), 'index.html'];
  return files.map(rel => {
    let text = readSrc(rel);
    if (scanPatch && scanPatch.file === rel) text += `\n${scanPatch.add}\n`;
    return [rel, code(text)];
  });
}
/** the files where a shape is found, as "file (n)" */
function found(files, re, except = []) {
  const hits = [];
  for (const [rel, text] of files) {
    if (except.includes(rel)) continue;
    const n = (text.match(re) ?? []).length;
    if (n) hits.push(`${rel} (${n})`);
  }
  return hits;
}
const none = hits => (hits.length ? `FOUND in ${hits.slice(0, 4).join(', ')}${hits.length > 4 ? ` and ${hits.length - 4} more` : ''}` : 'none');
async function section4() {
  head('4) No audio file, no audio element, one home for the audio graph');
  const extRe = new RegExp(`\\.(${AUDIO_EXT})$`, 'i');
  const all = [...walk('src'), ...walk('public')];
  const audioFiles = all.filter(f => extRe.test(f));
  check('4.files', all.length > 1000 && !audioFiles.length, `${all.length} files under src and public, audio files among them: ${audioFiles.length ? audioFiles.slice(0, 4).join(', ') : 'none'}`);
  const files = scannedCode();
  check('4.read', files.length > 1000, `${files.length} source files read as code (tests left out, comments stripped)`);
  check('4.element', !found(files, /<audio[\s>/]|new\s+Audio\s*\(|HTMLAudioElement/g).length,
    `an audio element, new Audio( or HTMLAudioElement: ${none(found(files, /<audio[\s>/]|new\s+Audio\s*\(|HTMLAudioElement/g))}`);
  const pathRe = new RegExp(`['"\`][^'"\`\\n]*\\.(${AUDIO_EXT})(\\?[^'"\`\\n]*)?['"\`]`, 'gi');
  check('4.path', !found(files, pathRe).length, `a quoted path ending in an audio extension: ${none(found(files, pathRe))}`);
  for (const [id, label, re] of [
    ['context', 'AudioContext', /AudioContext/g],
    ['source', 'createBufferSource', /createBufferSource/g],
    ['oscillator', 'createOscillator', /createOscillator/g],
    ['vibrate', 'navigator.vibrate or .vibrate(', /navigator\s*\??\.\s*vibrate|\.vibrate\s*\(/g],
  ]) check(`4.graph.${id}`, !found(files, re, [KIT_FILE]).length, `${label} outside ${KIT_FILE}: ${none(found(files, re, [KIT_FILE]))}`);
  const kitText = files.find(([rel]) => rel === KIT_FILE)?.[1] ?? '', switchText = files.find(([rel]) => rel === SWITCH_FILE)?.[1] ?? '';
  check('4.home', kitText.includes("'dukb-synth-kit-1'") && /AudioContext/.test(kitText),
    `the kit lives at ${KIT_FILE} (the build names its chunk after the file, and freshBuild's guard matches that name)`);
  const staticRe = /(from|import)\s*['"][^'"\n]*soundKit(\.ts)?['"]/g;
  check('4.static', !found(files, staticRe).length, `a static import of the kit: ${none(found(files, staticRe))}`);
  const dynRe = /(?<!typeof\s)import\s*\(\s*['"][^'"\n]*soundKit(\.ts)?['"]\s*\)/g;
  const dyn = found(files, dynRe);
  check('4.dynamic', dyn.length === 1 && dyn[0] === `${SWITCH_FILE} (1)`, `the one dynamic import of the kit is in ${SWITCH_FILE}: ${dyn.join(', ') || 'none found'}`);
  const mark = found(files, /['"`]dukb-synth-kit-1['"`]/g), key = found(files, /['"`]dukb-sound['"`]/g);
  check('4.mark', mark.length === 1 && mark[0] === `${KIT_FILE} (1)`, `the quoted kit mark is in ${KIT_FILE} alone, once: ${mark.join(', ') || 'none found'}`);
  check('4.key', key.length === 1 && key[0] === `${SWITCH_FILE} (1)`, `the quoted storage key is in ${SWITCH_FILE} alone, once: ${key.join(', ') || 'none found'}`);
  const own = files.filter(([rel]) => [KIT_FILE, SWITCH_FILE, HOOK_FILE].includes(rel));
  check('4.random', own.length === 3 && !found(own, /Math\s*\.\s*random/g).length, `Math.random in ${own.map(([rel]) => rel.split('/').pop()).join(', ')}: ${none(found(own, /Math\s*\.\s*random/g))}`);
  check('4.react', switchText.length > 0 && !/^\s*import\s/m.test(switchText) && !/['"]react['"]/.test(switchText),
    `${SWITCH_FILE} has no import statement at all (it reaches the kit's type through typeof import), so no React`);
}

/* ---------- 5. off means off ----------
   The switch and the kit's player half against a fake audio graph. Every scene builds its own world (a window,
   a document, a navigator, a clock) BEFORE it loads a fresh copy of the bundle, so a fault at module scope is
   seen too. The fake context never plays anything: a scene reads the calls the kit made on it. */
const REAL = { performance: globalThis.performance, navigator: Object.getOwnPropertyDescriptor(globalThis, 'navigator') };
const setGlobal = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
async function world(fresh, { pref = null, active = true, hidden = false, prerender = false, reduced = false, storageThrows = false, ua = true, resume = 'now', bare = false } = {}) {
  const log = { made: 0, starts: [], stops: 0, buzz: [], suspends: 0, resumes: 0, listeners: 0, docListeners: 0 };
  const clock = { t: 0 }, handlers = {}, held = [];
  setGlobal('performance', { now: () => clock.t });
  if (bare) {
    delete globalThis.window; delete globalThis.document; setGlobal('navigator', undefined);
    return { lib: await fresh(), log, clock };
  }
  const store = new Map(pref === null ? [] : [['dukb-sound', pref]]);
  class FakeCtx {
    constructor() { log.made += 1; this.state = 'suspended'; this.currentTime = 0; this.destination = {}; }
    createGain() { return { gain: { value: 1 }, connect() {} }; }
    createBuffer(ch, len, sr) { const d = new Float32Array(len); return { length: len, sampleRate: sr, getChannelData: () => d }; }
    createBufferSource() { const s = { buffer: null, connect() {}, start(t) { log.starts.push({ t, len: s.buffer.length }); }, stop() { log.stops += 1; } }; return s; }
    resume() {
      log.resumes += 1;
      if (resume === 'never') return new Promise(() => {});
      if (resume === 'held') return new Promise(done => held.push(() => { this.state = 'running'; done(); }));
      this.state = 'running';
      return Promise.resolve();
    }
    suspend() { log.suspends += 1; this.state = 'suspended'; return Promise.resolve(); }
  }
  setGlobal('window', {
    localStorage: {
      getItem: k => { if (storageThrows) throw new Error('blocked'); return store.has(k) ? store.get(k) : null; },
      setItem: (k, v) => { if (storageThrows) throw new Error('blocked'); store.set(k, v); },
    },
    addEventListener: (t, f) => { log.listeners += 1; (handlers[t] ??= []).push(f); }, removeEventListener: () => {}, dispatchEvent: () => true,
    AudioContext: FakeCtx, matchMedia: () => ({ matches: reduced }), __DUKB_PRERENDER__: prerender,
  });
  setGlobal('document', { visibilityState: hidden ? 'hidden' : 'visible', addEventListener: (t, f) => { log.docListeners += 1; (handlers[t] ??= []).push(f); } });
  const nav = { vibrate: p => { log.buzz.push(p); return true; } };
  if (ua) nav.userActivation = { hasBeenActive: active };
  setGlobal('navigator', nav);
  return {
    lib: await fresh(), log, clock, store, nav,
    settle: (ms = 5) => new Promise(r => setTimeout(r, ms)),
    fire: t => (handlers[t] ?? []).forEach(f => f()),
    release: () => held.splice(0).forEach(f => f()),
  };
}
function unworld() {
  setGlobal('performance', REAL.performance);
  delete globalThis.window; delete globalThis.document;
  if (REAL.navigator) Object.defineProperty(globalThis, 'navigator', REAL.navigator);
}
const said = log => `contexts ${log.made}, starts ${log.starts.length}, buzzes ${log.buzz.length}, listeners ${log.listeners}`;
const silent = log => log.made === 0 && log.starts.length === 0 && log.buzz.length === 0 && log.listeners === 0;
const near = (a, b, tol = 0.001) => Math.abs(a - b) <= tol;
async function section5(fresh) {
  head('5) Off means off');
  try {
    const len = Object.fromEntries(Object.entries((await fresh()).kit.CUES).map(([name, cue]) => [name, Math.round(cue.seconds * SR)]));
    { let threw = null, on = null;
      try { const s = await world(fresh, { bare: true }); on = s.lib.soundOn(); s.lib.sound('goal'); s.lib.hush(); s.lib.primeSound(); s.lib.preloadSound(); await new Promise(r => setTimeout(r, 5)); } catch (e) { threw = e; }
      check('5.a', !threw && on === false, `a. a bare process, no window, no document, no navigator: nothing throws and soundOn() is false${threw ? ` (threw: ${threw.message})` : ''}`); }
    { const s = await world(fresh, { pref: null }); s.lib.sound('goal'); await s.settle();
      check('5.b', silent(s.log), `b. choice absent, page tapped, a goal: ${said(s.log)} (all zero: the kit was never entered)`); }
    { const s = await world(fresh, { pref: 'off' }); s.lib.sound('goal'); await s.settle();
      check('5.c', silent(s.log), `c. choice off, a goal: ${said(s.log)}`); }
    for (const bad of ['ON', '1', 'true', ' on', '{"on":true}']) {
      const s = await world(fresh, { pref: bad }); s.lib.sound('goal'); await s.settle();
      check('5.d', silent(s.log) && s.lib.soundOn() === false, `d. a stored ${JSON.stringify(bad)}, a goal: ${said(s.log)}`);
    }
    { const s = await world(fresh, { pref: 'on', storageThrows: true }); s.lib.sound('goal'); await s.settle();
      check('5.d', silent(s.log), `d. a read that throws, a goal: ${said(s.log)}`); }
    { const s = await world(fresh, { pref: 'on', active: false }); s.lib.sound('goal'); await s.settle();
      check('5.e.before', s.log.made === 0 && s.log.starts.length === 0, `e. choice on, page NOT tapped, a goal: contexts ${s.log.made}, starts ${s.log.starts.length} (nothing before a tap)`);
      s.nav.userActivation.hasBeenActive = true; s.fire('pointerdown'); await s.settle();
      check('5.e.tap', s.log.made === 1 && s.log.starts.length === 0, `e. then the tap arrives: contexts ${s.log.made}, starts ${s.log.starts.length} (the goal he missed is not played late)`);
      s.lib.sound('goal'); await s.settle();
      const [a, b] = s.log.starts;
      check('5.e.goal', s.log.starts.length === 2 && near(a.t, 0) && a.len === len.net && near(b.t, 0.05) && b.len === len.crowd && JSON.stringify(s.log.buzz) === '[[40]]',
        `e. then a goal: starts ${JSON.stringify(s.log.starts.map(x => [x.t, x.len]))} (the net at 0, the crowd at 0.05), buzz ${JSON.stringify(s.log.buzz)}`); }
    { const s = await world(fresh, { pref: 'on', hidden: true }); s.lib.sound('goal'); await s.settle();
      check('5.f', silent(s.log), `f. choice on, tab hidden, a goal: ${said(s.log)}`); }
    { const s = await world(fresh, { pref: 'on', prerender: true }); s.lib.sound('goal'); await s.settle();
      check('5.g', silent(s.log), `g. choice on, the prerender flag, a goal: ${said(s.log)}`); }
    { const s = await world(fresh, { pref: 'on', reduced: true }); s.lib.sound('goal'); await s.settle();
      check('5.h', s.log.starts.length === 2 && s.log.buzz.length === 0, `h. choice on, reduced motion, a goal: starts ${s.log.starts.length}, buzzes ${s.log.buzz.length} (he hears it, the phone does not shake)`); }
    await section5b(fresh, len);
  } finally { unworld(); }
}
async function section5b(fresh, len) {
  { const s = await world(fresh, { pref: 'on' }); s.lib.sound('goal'); await s.settle(); s.lib.setSoundOn(false); await s.settle();
    check('5.i.off', s.log.stops === 2 && s.log.suspends === 1, `i. a goal, then switched off: stops ${s.log.stops}, suspends ${s.log.suspends} (both sources stopped, the context rests)`);
    s.lib.sound('goal'); await s.settle();
    check('5.i.quiet', s.log.starts.length === 2, `i. a goal while off: starts still ${s.log.starts.length}`);
    s.lib.setSoundOn(true); await s.settle();
    check('5.i.on', s.log.made === 1 && s.log.starts.length === 3 && s.log.starts[2].len === len.tick, `i. switched on again: contexts ${s.log.made}, one more start of ${s.log.starts[2]?.len} samples (the tick)`); }
  { const s = await world(fresh, { pref: 'on', resume: 'never' }); s.lib.sound('goal'); await s.settle();
    check('5.j', s.log.made === 1 && s.log.starts.length === 0, `j. a context that never wakes: contexts ${s.log.made}, starts ${s.log.starts.length}`); }
  { const s = await world(fresh, { pref: 'on' }); s.lib.sound('tap', { delay: 1 }); s.lib.hush(); await s.settle();
    check('5.k.before', s.log.starts.length === 0, `k. a delayed tap, hushed in the same tick: starts ${s.log.starts.length}`);
    s.lib.sound('awardWin', { delay: 0.15 }); await s.settle(); s.lib.hush(); await s.settle(260);
    check('5.k.after', s.log.starts.length === 2 && s.log.stops === 2 && s.log.buzz.length === 0, `k. a delayed winner's night, scheduled, then hushed: starts ${s.log.starts.length}, stops ${s.log.stops}, buzzes ${s.log.buzz.length} past its time (its buzz never fires)`); }
  { const s = await world(fresh, { pref: 'on' }); const mine = {}, theirs = {};
    s.lib.sound('awardWin', { delay: 0.15, scope: mine }); s.lib.sound('awardWin', { delay: 0.15, scope: theirs }); await s.settle();
    s.lib.hush(mine); await s.settle(260);
    check('5.k.scope', s.log.starts.length === 4 && s.log.stops === 2 && s.log.buzz.length === 1, `k. two scopes each with a winner's night, one hushed: starts ${s.log.starts.length}, stops ${s.log.stops}, buzzes ${s.log.buzz.length} (only its two sources stop, the other's buzz still fires)`);
    s.lib.sound('tap', { delay: 1, scope: mine }); s.lib.sound('tap', { delay: 1, scope: theirs }); s.lib.hush(theirs); await s.settle();
    check('5.k.scope.wait', s.log.starts.length === 5, `k. two scopes each waiting on a tap, one hushed in the same tick: ${s.log.starts.length - 4} start (the other's)`); }
  { const s = await world(fresh, { pref: 'on' }); for (let i = 0; i < 20; i += 1) s.lib.sound('tap'); await s.settle();
    check('5.m', s.log.made === 1 && s.log.starts.length === 20, `m. twenty taps: contexts ${s.log.made}, starts ${s.log.starts.length}`); }
  { const s = await world(fresh, { pref: null, storageThrows: true }); s.lib.setSoundOn(true); await s.settle();
    check('5.n', s.lib.soundOn() === true && s.log.made === 1 && s.log.starts.length === 1, `n. storage that throws, switched on: soundOn() ${s.lib.soundOn()} for the visit, contexts ${s.log.made}, starts ${s.log.starts.length}`); }
  { const s = await world(fresh, { pref: 'on', ua: false }); s.lib.sound('goal'); await s.settle();
    check('5.o.before', s.log.made === 0 && s.log.starts.length === 0, `o. a browser with no userActivation, a goal before any event: contexts ${s.log.made}, starts ${s.log.starts.length}`);
    s.fire('keydown'); s.lib.sound('goal'); await s.settle();
    check('5.o.after', s.log.made === 1 && s.log.starts.length === 2, `o. after a key press, a goal: contexts ${s.log.made}, starts ${s.log.starts.length}`); }
  { const s = await world(fresh, { pref: 'on', resume: 'held' }); s.lib.sound('goal'); await s.settle();
    s.clock.t += 400; s.release(); await s.settle();
    check('5.p', s.log.made === 1 && s.log.resumes >= 1 && s.log.starts.length === 0, `p. a context that wakes 400 ms late: contexts ${s.log.made}, starts ${s.log.starts.length} (the goal had passed)`); }
  { const s = await world(fresh, { pref: 'on' }); s.lib.sound('award', { delay: 2 }); await s.settle();
    check('5.q', s.log.starts.length === 1 && near(s.log.starts[0].t, 2) && s.log.starts[0].len === len.sting, `q. an award asked for 2 s ahead: ${s.log.starts.length} start at ${s.log.starts[0]?.t} on the audio clock`); }
  { /* a cold kit: the clock moves 400 ms between the ask and the moment the kit hears of it */
    const s = await world(fresh, { pref: 'on' }); s.lib.sound('tap'); s.clock.t += 400; await s.settle();
    check('5.r.tap', s.log.made === 1 && s.log.starts.length === 0, `r. a tap the kit hears of 400 ms late: starts ${s.log.starts.length} (dropped, never late)`);
    const had = s.log.starts.length; s.lib.sound('award', { delay: 2 }); s.clock.t += 400; await s.settle();
    const got = s.log.starts.slice(had);
    check('5.r.award', got.length === 1 && near(got[0].t, 1.6, 0.01), `r. an award 2 s ahead that the kit hears of 400 ms late: ${got.length} start at ${got[0]?.t} (1.6: the wait came off its delay)`); }
  { const s = await world(fresh, { pref: 'on', active: false }); s.lib.primeSound(); await s.settle();
    check('5.prime.arm', s.log.listeners === 3 && s.log.docListeners === 1 && s.log.made === 0 && s.log.starts.length === 0, `prime. choice on, primed, no tap: gesture listeners ${s.log.listeners}, contexts ${s.log.made}, starts ${s.log.starts.length}`);
    s.nav.userActivation.hasBeenActive = true; s.fire('pointerdown'); await s.settle();
    check('5.prime.tap', s.log.made === 1 && s.log.resumes === 1 && s.log.starts.length === 0, `prime. then his first tap anywhere: contexts ${s.log.made}, resumes ${s.log.resumes}, starts ${s.log.starts.length} (made and woken inside the tap)`);
    s.lib.sound('goal'); await s.settle();
    check('5.prime.goal', s.log.made === 1 && s.log.starts.length === 2, `prime. then a goal: starts ${s.log.starts.length}`); }
  for (const [label, opts] of [['absent', { pref: null }], ['off', { pref: 'off' }], ['on under the prerender flag', { pref: 'on', prerender: true }]]) {
    const s = await world(fresh, opts); s.lib.primeSound(); await s.settle();
    check('5.prime.off', silent(s.log) && s.log.docListeners === 0, `prime. choice ${label}, primed: ${said(s.log)} (the kit is never entered)`);
  }
}

/* ---------- 6. the always loaded part is small and the kit is not in it ----------
   Two bundles as a page would get them, minified. A is what a page that shows the switch and binds a plan
   carries whether or not he ever turns sound on: the switch, the toggle and the hook, with the kit left out.
   K is the kit alone, the chunk nobody fetches until the switch is on. A cap is its own measurement plus 15
   percent, never raised to fit: when one goes red, find what grew. */
let leakKit = false;
async function minified(entryText, external) {
  const entry = path.join(TMP, `size-${serial += 1}.tsx`);
  fs.writeFileSync(entry, entryText);
  const r = await esbuild.build({
    entryPoints: [entry], bundle: true, minify: true, format: 'esm', write: false, jsx: 'automatic', target: 'es2020',
    alias: { '@': path.join(ROOT, 'src') }, external, logLevel: 'error',
  });
  return r.outputFiles[0].text;
}
const gz = s => zlib.gzipSync(Buffer.from(s)).length;
/* MEASURED 2026-10-08: the always loaded part 2,825 bytes minified, 1,318 gzipped; the kit 5,153 and 2,382.
   The design's prototype measured 1,132 and 2,294. The always loaded part grew 186 bytes past it, and every
   one of them is a correction the design's review asked for: the stamp a moment carries so a cold kit cannot
   play it late, primeSound and the effect that calls it, a scope per plan so one screen's hush leaves another
   screen's whistle alone, a kit that resolved to nothing counted as a failed load, the text switch's fixed
   box, and the icon shape's real 44 px box. Each cap is the measurement plus 15 percent. */
const SIZE_CAP = { always: 1515, kit: 2739 };
async function section6() {
  head('6) The always loaded part is small and the kit is not in it');
  const always = await minified(
    `export { SoundToggle } from '${R}/src/components/game/SoundToggle.tsx';\nexport { useSoundPlan, stillMotion } from '${R}/${HOOK_FILE}';\nexport { sound, hush, soundOn, setSoundOn } from '${R}/${SWITCH_FILE}';\n`,
    ['react', 'react/jsx-runtime', ...(leakKit ? [] : ['./soundKit'])],
  );
  const kit = await minified(`export * from '${R}/${KIT_FILE}';\n`, ['./sound']);
  check('6.always.size', gz(always) <= SIZE_CAP.always, `the always loaded part (switch, toggle, hook): ${always.length} bytes minified, ${gz(always)} gzipped (at most ${SIZE_CAP.always})`);
  const leaked = ['AudioContext', 'createBufferSource', 'vibrate', 'dukb-synth-kit-1'].filter(w => always.includes(w));
  check('6.always.clean', !leaked.length, `no line of the audio graph in it: ${leaked.length ? `FOUND ${leaked.join(', ')}` : 'none of AudioContext, createBufferSource, vibrate or the kit mark'}`);
  check('6.always.import', (always.match(/import\(\s*["']\.\/soundKit["']\s*\)/g) ?? []).length === (leakKit ? 0 : 1), 'it reaches the kit through exactly one dynamic import');
  const once = always.match(/\.current\.playedKey===\w+/g) ?? [];
  check('6.always.once', once.length === 1, `the once guard is one comparison in the built code, ${once.length} found${once[0] ? ` (${once[0]})` : ''}: playSoundGate's everytick control breaks exactly that`);
  check('6.kit.size', gz(kit) <= SIZE_CAP.kit, `the kit: ${kit.length} bytes minified, ${gz(kit)} gzipped (at most ${SIZE_CAP.kit})`);
  const gate = kit.match(/(\w+)\?\1\.hasBeenActive:\w+/g) ?? [];
  check('6.kit.marks', kit.includes('dukb-synth-kit-1') && gate.length === 1, `the kit carries its mark and one activation guard${gate[0] ? ` (${gate[0]})` : ''}: playSoundGate finds the chunk and plants nowait by them`);
}

/* ---------- negative controls ----------
   A control plants one fault, runs the sections it is aimed at, and FIRES only when a check it names went red.
   `text` replaces one exact string of the bundle (the needle must be there exactly once, and the text must
   change); `memory` changes a loaded kit and throws when what it replaces was already that; `scan` changes
   the source text section 4 reads. A control that cannot be planted exits 1 with the reason: a control that
   changes nothing would leave the harness green for the wrong reason. */
function swapRender(lib, name, make) {
  const cue = lib.kit.CUES[name], orig = cue.render;
  const before = orig(), after = make(orig)(undefined);
  let differs = before.length !== after.length;
  for (let i = 0; !differs && i < before.length; i += 1) if (!Object.is(before[i], after[i])) differs = true;
  if (!differs) throw new Error(`the ${name} already renders that`);
  cue.render = make(orig);
}
const CONTROLS = {
  silent: { sections: [section1], red: /^1\.(peak|rms)\.tick$/, memory: lib => swapRender(lib, 'tick', orig => s => new Float32Array(orig(s).length)) },
  nan: { sections: [section1], red: /^1\.finite\.crowd$/, memory: lib => swapRender(lib, 'crowd', orig => s => { const b = orig(s); b[1000] = NaN; return b; }) },
  long: { sections: [section1], red: /^1\.length\.crowd$/, memory: lib => swapRender(lib, 'crowd', orig => s => { const b = new Float32Array(Math.round(1.8 * SR)); b.set(orig(s)); return b; }) },
  random: { sections: [section1], red: /^1\.twice\.net$/, memory: lib => swapRender(lib, 'net', orig => s => { const b = orig(s); for (let i = 1; i < b.length - 1; i += 1) b[i] += (Math.random() - 0.5) * 1e-3; return b; }) },
  swap: { sections: [section2], red: /^2\.whistle\.band$/, memory: lib => { const thud = lib.kit.CUES.thud.render; swapRender(lib, 'whistle', () => s => thud(s)); } },
  flatcrowd: { sections: [section2], red: /^2\.crowd\.(rise|fall|dull)$/, memory: lib => swapRender(lib, 'crowd', orig => s => {
    const want = rms(orig(s)), w = Float32Array.from(whiteNoise(61740)), have = rms(w);
    for (let i = 0; i < w.length; i += 1) w[i] *= want / have;
    return w;
  }) },
  subthud: { sections: [section2], red: /^2\.thud\.body$/, memory: lib => swapRender(lib, 'thud', () => () => thudWithNoKnock(lib.kit)) },
  hot: { sections: [section3], red: /^3\.mix\./, text: ['MASTER_GAIN = 0.6;', 'MASTER_GAIN = 2;'] },
  ghoststep: { sections: [section3], red: /^3\.steps\.tap$/, memory: lib => {
    if (lib.kit.CUES.ghost) throw new Error('a cue named ghost exists');
    lib.kit.MOMENTS.tap.steps.push({ cue: 'ghost' });
  } },
  audiotag: { sections: [section4], red: /^4\.(element|path)$/, scan: { file: 'src/components/career/AwardsNightCard.tsx', add: "const w = new Audio('/whistle.mp3');" } },
  secondhome: { sections: [section4], red: /^4\.graph\.context$/, scan: { file: SWITCH_FILE, add: 'const c = new AudioContext();' } },
  staticimport: { sections: [section4], red: /^4\.static$/, scan: { file: SWITCH_FILE, add: "import { play } from './soundKit';" } },
  /* section 5: each is one exact string of the bundle, the code as esbuild prints it */
  eager: { sections: [section5], red: /^5\.b$/, text: ['    armed = false;', '    armed = false;\n    try { ctx = new window.AudioContext(); } catch {}'] },
  nogate: { sections: [section5], red: /^5\.[bcd]$/, text: ['!!window.__DUKB_PRERENDER__ || !soundOn();', '!!window.__DUKB_PRERENDER__;'] },
  nohide: { sections: [section5], red: /^5\.f$/, text: ['if (skip() || document.visibilityState === "hidden") return;', 'if (skip()) return;'] },
  noprerender: { sections: [section5], red: /^5\.g$/, text: ['!!window.__DUKB_PRERENDER__ || ', ''] },
  nowait: { sections: [section5], red: /^5\.e\.before$/, text: ['  if (!active()) return null;\n', ''] },
  late: { sections: [section5], red: /^5\.p$/, text: ['    if (due < -STALE_MS / 1e3) return;\n', ''] },
  nohush: { sections: [section5], red: /^5\.k\.before$/, text: ['if (c.state !== "running" || !alive()) return;', 'if (c.state !== "running") return;'] },
  twocontexts: { sections: [section5], red: /^5\.m$/, text: ['  if (ctx) return ctx;\n', ''] },
  buzzstill: { sections: [section5], red: /^5\.h$/, text: ['if (still() || !active() ||', 'if (!active() ||'] },
  keepplaying: { sections: [section5], red: /^5\.i\.off$/, text: ['function sleep() {\n  stopAll();', 'function sleep() {'] },
  coldlate: { sections: [section5], red: /^5\.r\./, text: ['const due = (opts?.delay ?? 0) - (performance.now() - at) / 1e3;', 'const due = opts?.delay ?? 0;'] },
  noprime: { sections: [section5], red: /^5\.prime\.arm$/, text: ['void kit().then((k) => k.arm()).catch(quiet2);', 'void kit().catch(quiet2);'] },
  globalhush: { sections: [section5], red: /^5\.k\.scope$/, text: ['k.stopAll(scope)', 'k.stopAll()'] },
  /* section 6: the always loaded part built with the kit folded in */
  leak: { sections: [section6], red: /^6\.always\.(size|clean)$/, flag: on => { leakKit = on; } },
};
async function runControl(name) {
  const c = CONTROLS[name];
  let text = BASE_TEXT;
  if (c.scan) {
    /* a patch that lands on no file, or adds what the file already says, would change nothing */
    if (!fs.existsSync(path.join(ROOT, c.scan.file))) { console.log(`control ${name}: CANNOT BE PLANTED, ${c.scan.file} is not there`); return false; }
    if (readSrc(c.scan.file).includes(c.scan.add)) { console.log(`control ${name}: CANNOT BE PLANTED, ${c.scan.file} already holds that line`); return false; }
  }
  if (c.text) {
    const hits = text.split(c.text[0]).length - 1;
    if (hits !== 1) { console.log(`control ${name}: CANNOT BE PLANTED, its needle appears ${hits} times in the bundle`); return false; }
    text = text.replace(c.text[0], c.text[1]);
    if (text === BASE_TEXT) { console.log(`control ${name}: CANNOT BE PLANTED, the replacement changed nothing`); return false; }
  }
  checks = 0; failed = 0; reds = []; quietRun = true; scanPatch = c.scan ?? null;
  if (c.flag) c.flag(true);
  let broke = null;
  try {
    const fresh = loaderFor(text, c.memory);
    for (const section of c.sections) await section(fresh);
  } catch (e) { broke = e; }
  quietRun = false; scanPatch = null;
  if (c.flag) c.flag(false);
  if (broke) { console.log(`control ${name}: CANNOT BE PLANTED, ${broke.message}`); return false; }
  const aimed = reds.filter(id => c.red.test(id));
  if (!aimed.length) { console.log(`control ${name}: DID NOT FIRE (${reds.length} checks red, none of them aimed)`); return false; }
  console.log(`control ${name}: fired, ${aimed.length} aimed checks red`);
  return true;
}

/* ---------- for ears: every cue and every moment as a WAV ---------- */
async function writeWavs(fresh) {
  const dir = path.resolve(WAV);
  fs.mkdirSync(dir, { recursive: true });
  const { kit } = await fresh();
  const save = (name, buf, gain) => {
    const out = Buffer.alloc(44 + buf.length * 2);
    out.write('RIFF', 0); out.writeUInt32LE(36 + buf.length * 2, 4); out.write('WAVEfmt ', 8);
    out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22);
    out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34);
    out.write('data', 36); out.writeUInt32LE(buf.length * 2, 40);
    for (let i = 0; i < buf.length; i += 1) out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i] * gain)) * 32767), 44 + i * 2);
    const file = path.join(dir, `${name}.wav`);
    fs.writeFileSync(file, out);
    console.log(`   wrote ${file}`);
  };
  console.log('\nWAV files, as the master gain would play them:');
  for (const [name, cue] of Object.entries(kit.CUES)) save(`cue-${name}`, cue.render(), kit.MASTER_GAIN);
  for (const [name, recipe] of Object.entries(kit.MOMENTS)) save(`moment-${name}`, mixOf(kit, recipe), kit.MASTER_GAIN);
}

/* ---------- main ---------- */
const SECTIONS = [section1, section2, section3, section4, section5, section6];
if (process.env.SIM_SOUND_MEASURE) {
  /* For whoever adds a cue or retunes one: the numbers a band or a floor is set from. */
  const { kit } = await loaderFor(BASE_TEXT)();
  for (const [name, cue] of Object.entries(kit.CUES)) {
    const all = buffersOf(kit, name).map(x => rms(x));
    console.log(`${name}: rms ${f3(all[0])} default, ${f3(Math.min(...all))} to ${f3(Math.max(...all))} over 21 seeds; band would be ${f3(0.75 * Math.min(...all))} to ${f3(1.25 * Math.max(...all))}`);
    for (const row of CHARACTER[name] ?? []) {
      const [, lo, hi] = overSeeds(name, row, kit);
      const wrong = [row.wrong, row.wrong2].filter(Boolean).map(w => `${w[0]} ${f3(row.stat(w[1](kit), kit))}`).join(', ');
      console.log(`   ${row.label}: ${f3(lo)} to ${f3(hi)}${wrong ? `; wrong: ${wrong}` : ''}`);
    }
  }
  process.exit(0);
}
if (CONTROL) {
  const names = CONTROL === 'all' ? Object.keys(CONTROLS) : [CONTROL];
  if (names.some(n => !CONTROLS[n])) { console.error(`unknown control ${CONTROL}. Known: ${Object.keys(CONTROLS).join(', ')}`); process.exit(2); }
  let fired = 0;
  for (const name of names) if (await runControl(name)) fired += 1;
  if (names.length > 1) console.log(`\nsimSound controls: ${fired} of ${names.length} fired`);
  process.exit(fired === names.length ? 0 : 1);
}
if (WAV) {
  /* refuse a bad folder before anything runs */
  const rel = path.relative(ROOT, path.resolve(WAV)).replaceAll('\\', '/');
  if (/^(src|public|dist)(\/|$)/.test(rel)) { console.error(`SIM_SOUND_WAV refuses ${rel}: no audio file may land in src, public or dist`); process.exit(2); }
}
const fresh = loaderFor(BASE_TEXT);
for (const section of SECTIONS) await section(fresh);
if (WAV) await writeWavs(fresh);
console.log(`\nsimSound: ${checks} checks, ${failed} failed`);
process.exit(failed ? 1 : 0);
