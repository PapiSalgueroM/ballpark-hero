// Round 1558 weight: the chunks that carry the three Connections data files, What's New and the three guides,
// at the head (dist from #!build) and at the base (the round's source files checked out from BASE and rebuilt).
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { execSync } from 'node:child_process';
const BASE = process.env.BASE_SHA ?? 'eccb77b18';
const FILES = ['src/data/baseballConnectionsPuzzles.ts', 'src/data/nflConnectionsPuzzles.ts', 'src/data/nhlConnectionsPuzzles.ts',
  'src/pages/WhatsNew.tsx', 'src/data/gameContent/baseball.ts', 'src/data/gameContent/football.ts', 'src/data/gameContent/hockey.ts',
  'src/data/searchKeywords.json'];
const MARKERS = {
  baseballData: "bconn-060",
  nflData: "nflconn-004",
  nhlData: "nhlconn-004",
  whatsNew: 'The running log of what changed around here',
  baseballGuide: 'MLB Connections walkthrough',
  footballGuide: 'NFL Connections walkthrough',
  hockeyGuide: 'NHL Connections tips',
};
function measure(label) {
  const dir = 'dist/assets';
  const out = {};
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.js')) continue;
    const buf = fs.readFileSync(path.join(dir, f));
    const s = buf.toString('utf8');
    for (const [k, m] of Object.entries(MARKERS)) if (s.includes(m)) (out[k] ??= []).push({ file: f, raw: buf.length, gzip: zlib.gzipSync(buf, { level: 9 }).length });
  }
  for (const [k, v] of Object.entries(out)) for (const c of v) console.log(`${label} ${k} ${c.file} raw=${c.raw} gzip=${c.gzip}`);
  return out;
}
const head = measure('head');
execSync(`git checkout ${BASE} -- ${FILES.join(' ')}`, { stdio: 'inherit' });
execSync('node_modules/.bin/vite build --logLevel error', { stdio: 'inherit' });
const base = measure('base');
execSync(`git checkout HEAD -- ${FILES.join(' ')}`, { stdio: 'inherit' });
const sum = (o, k, f) => (o[k] ?? []).reduce((t, c) => t + c[f], 0);
for (const k of Object.keys(MARKERS)) console.log(`delta ${k}: raw ${sum(head, k, 'raw') - sum(base, k, 'raw')} gzip ${sum(head, k, 'gzip') - sum(base, k, 'gzip')} (head raw ${sum(head, k, 'raw')} gzip ${sum(head, k, 'gzip')})`);
console.log('weight1558: done');
