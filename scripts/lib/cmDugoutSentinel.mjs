/* Round 1606: the shared kit for proving Club Manager's real dugouts without a real name.

   A real manager's name may sit in a display slot and nowhere else (decision A). Proving that with the shipped
   table would prove it only for whatever names the table holds that day, and would prove nothing while it is
   empty. So the proof uses a SENTINEL: a made up name registered as real, injected into a bundled copy of the
   engine in a temp folder (an esbuild onLoad that replaces src/data/clubManagerDugouts.ts), never a hook in
   shipped code. The same bundler builds the twin with an EMPTY table, so every comparison is one tree against
   itself with only the table changed, and a base commit's tree for the byte identity fleet.

   Users: scripts/simManagers.mjs sections 7 and 8 and its controls namedsack and recycle;
   scripts/simNoInventedQuotes.mjs control dugout. */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { build } from 'esbuild';

export const SENTINEL = 'Testa Realmann';
export const SENTINEL_MONTH = '2025-07';
export const ERAS = ['now', 'era2020', 'era2015', 'era2010', 'era2005'];
/* The two leading characters of a chair line (the merry-go-round's sackings and appointments, and the takeover). */
export const CHAIR_MARKS = ['\u{1FA91}', '\u{1F91D}'];

const require = createRequire(import.meta.url);

/** Run fn on a seeded Math.random and a pinned clock; returns the value and the number of draws it made. */
export function seeded(seed, fn) {
  const random = Math.random, now = Date.now;
  let a = seed >>> 0, draws = 0;
  Math.random = () => {
    draws++;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  Date.now = () => 1791547200000;
  try { return { value: fn(), draws }; }
  finally { Math.random = random; Date.now = now; }
}

export function hashSeed(text) {
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}

/**
 * Bundle the engine (clubManager, its calendar and Manager Hot Seat) from `srcDir` into `tmp` and load it.
 * table/partial: null keeps the tree's own data file; an object replaces the WHOLE file with that table, after
 * checking the file still exports both names exactly once (else `refuse`). edit: { from, to } rewrites one
 * anchor in clubManager.ts, refused unless the anchor is there exactly once.
 */
export async function bundleEngine({ srcDir, tmp, name, table = null, partial = null, edit = null, nodeModules, refuse }) {
  const dugoutsFile = path.join(srcDir, 'data', 'clubManagerDugouts.ts');
  const cmFile = path.join(srcDir, 'lib', 'clubManager.ts');
  if (table) {
    const original = fs.existsSync(dugoutsFile) ? fs.readFileSync(dugoutsFile, 'utf8') : '';
    for (const anchor of ['export const CM_DUGOUTS:', 'export const CM_DUGOUTS_PARTIAL:']) {
      if (original.split(anchor).length !== 2) refuse(`the dugout table file does not export "${anchor}" exactly once, so the sentinel would replace nothing`);
    }
  }
  if (edit) {
    const text = fs.readFileSync(cmFile, 'utf8');
    const count = text.split(edit.from).length - 1;
    if (count !== 1) refuse(`the control's anchor is in clubManager.ts ${count} times, it must be there exactly once: ${edit.from}`);
  }
  const J = p => JSON.stringify(p.split(path.sep).join('/'));
  const entry = path.join(tmp, `${name}-entry.ts`), out = path.join(tmp, `${name}.cjs`);
  fs.writeFileSync(entry, `export * as cm from ${J(cmFile)};\n`
    + `export * as cal from ${J(path.join(srcDir, 'lib', 'clubManagerCalendar.ts'))};\n`
    + `export * as hs from ${J(path.join(srcDir, 'lib', 'managerHotSeat.ts'))};\n`);
  const plugin = {
    name: 'cm-dugout-sentinel',
    setup(b) {
      if (table) {
        b.onLoad({ filter: /clubManagerDugouts\.ts$/ }, () => ({
          contents: `export const CM_DUGOUTS = ${JSON.stringify(table)};\nexport const CM_DUGOUTS_PARTIAL = ${JSON.stringify(partial ?? {})};\n`,
          loader: 'ts',
        }));
      }
      if (edit) {
        b.onLoad({ filter: /clubManager\.ts$/ }, args => {
          if (path.resolve(args.path) !== path.resolve(cmFile)) return null;
          return { contents: fs.readFileSync(args.path, 'utf8').replace(edit.from, edit.to), loader: 'ts' };
        });
      }
    },
  };
  await build({
    entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile: out, logLevel: 'silent',
    jsx: 'automatic', external: ['react', 'react/jsx-runtime'], alias: { '@': srcDir }, nodePaths: [nodeModules], plugins: [plugin],
  });
  return require(out);
}

const isChairLine = line => typeof line === 'string' && CHAIR_MARKS.some(m => line.startsWith(m));
/* The vacancy prefix an offer blurb carries, whichever wording: the chair mark up to the first middle dot. */
const OFFER_PREFIX = /^\u{1FA91} [^\u{B7}]*\u{B7} /u;

/** How many chair lines a state's feed carries. */
export const chairLines = state => (state?.aiHeadlines ?? []).filter(isChairLine).length;

/**
 * A state with everything a real name may legitimately change taken out: the dugout record, the names on the
 * vacancy list, the words of the chair lines (their count stays) and the vacancy prefix of an offer blurb.
 * Two careers that differ only in their dugout table must strip to the same JSON, or the table moved the game.
 */
export function strip(state) {
  const s = JSON.parse(JSON.stringify(state));
  delete s.managers;
  if (Array.isArray(s.pendingVacancies)) s.pendingVacancies = s.pendingVacancies.map(v => ({ club: v.club, pos: v.pos }));
  if (Array.isArray(s.aiHeadlines)) s.aiHeadlines = s.aiHeadlines.map(l => (isChairLine(l) ? '<chair line>' : l));
  for (const o of s.pendingSummary?.offers ?? []) if (typeof o.blurb === 'string') o.blurb = o.blurb.replace(OFFER_PREFIX, '');
  return s;
}

/** The first path where two plain values differ, with both sides cut short, or null when they are equal. */
export function firstDiff(a, b, at = '') {
  if (JSON.stringify(a) === JSON.stringify(b)) return null;
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const d = firstDiff(a[k], b[k], `${at}.${k}`);
      if (d) return d;
    }
  }
  return `${at || '(root)'}: ${JSON.stringify(a)?.slice(0, 140)} vs ${JSON.stringify(b)?.slice(0, 140)}`;
}

/** Everything a state says outside the dugout record and the vacancy list, as one string to search. */
export function spoken(state) {
  const s = JSON.parse(JSON.stringify(state ?? {}));
  delete s.managers;
  delete s.pendingVacancies;
  return JSON.stringify(s);
}

/**
 * The sentinel table: per era, per league, a career is started at its last playable club by name and the league
 * it really plays in is read off that career (a league's playable list and the season's membership differ where
 * clubs went up or down). In that league the first other club by name holds the sentinel, the second is on the
 * partial list and the third is the second chair a summer empties. A club already used by an earlier league of
 * the same era is skipped, so every league holds the sentinel exactly once. One name across every league, as one
 * real man registered for every chair. `start` is the plain engine's startCareer.
 */
export async function sentinelPlan(cm) {
  const table = {}, partial = {}, leagues = [];
  for (const era of ERAS) {
    await cm.ensureEraRosters(era);
    const defs = cm.worldLeagueDefs({ eraId: era });
    table[era] = {};
    partial[era] = [];
    const used = new Set();
    for (const def of defs) {
      const playable = (era === 'now' ? cm.playableClubs(def.id) : cm.eraPlayableClubs(era, def.id)).map(c => c.name).sort();
      const career = playable.filter(c => !used.has(c)).pop();
      if (!career) continue;
      const c = seeded(hashSeed(`plan|${era}|${def.id}`), () => cm.startCareer(career, era)).value;
      const others = [...c.leagueClubs].filter(club => club !== career).sort();
      if (others.length < 3 || others.slice(0, 3).some(club => used.has(club))) continue;
      const [sentinel, part, second] = others;
      for (const club of c.leagueClubs) used.add(club);
      table[era][sentinel] = { name: SENTINEL, appointed: SENTINEL_MONTH };
      partial[era].push(part);
      leagues.push({ era, id: def.id, sentinel, partial: part, second, career });
    }
  }
  return { table, partial, leagues };
}

/** A base commit's src tree, read with git archive into `dir` (an empty folder). Returns the src path. */
export function baseTree(root, commit, dir) {
  const sha = execFileSync('git', ['rev-parse', '--verify', `${commit}^{commit}`], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  execFileSync('git', ['archive', '--format=tar', '-o', path.join(dir, 'src.tar'), sha, 'src'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  execFileSync('tar', ['-xf', 'src.tar'], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
  return { sha, src: path.join(dir, 'src') };
}
