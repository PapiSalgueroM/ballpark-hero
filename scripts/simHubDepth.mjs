/**
 * Round 357 harness: the sport hubs are cornerstone pages, and stay different.
 *
 * Why it exists. The AdSense render audit found exactly one real weakness on
 * the indexable site, and it was these six pages: simultaneously the thinnest
 * (521 to 614 words against a site median of 584 unique and a 90th percentile
 * of 970) and the most similar to one another (25 to 36 percent five word
 * shingle overlap, the highest of any indexable cluster). That was not an
 * accident. src/lib/sportHub.ts said in its own comment that the copy was
 * "kept together so the tone stays consistent and so a new hub is obviously a
 * copy of an existing one", which is a reasonable instinct for tone and the
 * exact recipe for six pages that read as one template.
 *
 * So both properties are fenced, because fixing one and losing the other is
 * the easy failure: a hub could be padded to length with sentences that would
 * work for any sport, which is worse than being short.
 *
 *   1. DEPTH. Every hub's shipped document carries at least WORD_FLOOR words
 *      of readable text.
 *   2. DIFFERENCE. No two hubs share more than PAIR_CEILING of their five word
 *      shingles. Shingles rather than words, because two pages can use the
 *      same vocabulary and still say different things; repeated PHRASES are
 *      what templating actually looks like.
 *   3. NOT PADDING. Each hub names games that only it has, so the extra words
 *      are about that sport rather than about the site in general.
 *
 * NEGATIVE CONTROL: HUBDEPTH_CONTROL=clone copies one hub's readable text over
 * another's before comparing (asserting the two were different to begin with),
 * which is the exact regression being fenced, and section 2 must go red.
 *
 * Run: node scripts/simHubDepth.mjs   (reads the built public/ snapshots)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.HUBDEPTH_CONTROL || '';
if (CONTROL && CONTROL !== 'clone') {
  console.error(`HUBDEPTH_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const HUBS = ['/soccer', '/pro-football', '/pro-basketball', '/baseball', '/hockey', '/college'];
/* Floors set from measurement after the Round 357 rewrite, half of the
   measured figure per the harness convention. Before the rewrite these pages
   sat at 521 to 614 words and 25 to 36 percent overlap. */
const WORD_FLOOR = 700;
const PAIR_CEILING = 0.22;

const readable = html => html
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<head[\s\S]*?<\/head>/i, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&[a-z]+;/gi, ' ')
  .replace(/\s+/g, ' ')
  .toLowerCase().trim();

const pages = {};
const links = {};
for (const hub of HUBS) {
  const f = path.join(ROOT, 'public', hub.slice(1), 'index.html');
  if (!fs.existsSync(f)) {
    fail(`${hub} has no shipped snapshot at public${hub}/index.html`);
    continue;
  }
  const html = fs.readFileSync(f, 'utf8');
  pages[hub] = readable(html);
  /* Links come off the HTML, BEFORE the tags are stripped. The first cut of
     section 3 looked for paths in the readable text, where an href cannot be,
     and duly reported zero unique paths for all six hubs. A check that returns
     the same answer for every input is not measuring anything. */
  links[hub] = new Set([...html.matchAll(/href="(\/[a-z0-9-]+)"/g)].map(m => m[1]));
}
if (Object.keys(pages).length < HUBS.length) {
  console.error('simHubDepth: a hub is missing its snapshot, so nothing else was checked');
  process.exit(1);
}

if (CONTROL === 'clone') {
  const [a, b] = HUBS;
  if (pages[a] === pages[b]) { console.error('control found nothing to clone: those two hubs are already identical'); process.exit(1); }
  pages[b] = pages[a];
  console.log(`   NEGATIVE CONTROL ON: ${b}'s text replaced with ${a}'s, section 2 must go red`);
}

console.log(`1) every hub is a page worth landing on (floor ${WORD_FLOOR} words)`);
for (const hub of HUBS) {
  const n = pages[hub].split(' ').filter(Boolean).length;
  console.log(`   ${hub.padEnd(16)} ${String(n).padStart(5)} words`);
  if (n < WORD_FLOOR) fail(`${hub} carries ${n} readable words, under the ${WORD_FLOOR} floor, so it is still a list of links`);
}

console.log(`2) no two hubs are the same page with the nouns swapped (ceiling ${Math.round(PAIR_CEILING * 100)}%)`);
{
  const shingles = {};
  for (const hub of HUBS) {
    const w = pages[hub].split(' ').filter(Boolean);
    const s = new Set();
    for (let i = 0; i + 5 <= w.length; i++) s.add(w.slice(i, i + 5).join(' '));
    shingles[hub] = s;
  }
  let worst = { pair: '', v: 0 };
  for (let i = 0; i < HUBS.length; i++) {
    for (let j = i + 1; j < HUBS.length; j++) {
      const a = shingles[HUBS[i]], b = shingles[HUBS[j]];
      let inter = 0;
      for (const s of a) if (b.has(s)) inter += 1;
      const jac = inter / (a.size + b.size - inter);
      if (jac > worst.v) worst = { pair: `${HUBS[i]} vs ${HUBS[j]}`, v: jac };
      if (jac > PAIR_CEILING) {
        fail(`${HUBS[i]} and ${HUBS[j]} share ${Math.round(jac * 100)}% of their phrasing, over the ${Math.round(PAIR_CEILING * 100)}% ceiling`);
      }
    }
  }
  console.log(`   worst pair ${worst.pair} at ${Math.round(worst.v * 100)}%`);
}

console.log('3) the words are about the sport, not about the site');
for (const hub of HUBS) {
  /* Every hub should name at least a few games no other hub names. If the
     extra length were generic site copy this would not hold. */
  let unique = 0;
  for (const p of links[hub]) {
    let elsewhere = false;
    for (const other of HUBS) {
      if (other === hub) continue;
      if (links[other].has(p)) { elsewhere = true; break; }
    }
    if (!elsewhere) unique += 1;
  }
  console.log(`   ${hub.padEnd(16)} ${unique} paths only this hub names`);
  if (unique < 3) fail(`${hub} names only ${unique} paths no other hub names, so its content is about the site rather than the sport`);
}

console.log('');
if (CONTROL === 'clone') {
  if (failures > 0) { console.log(`simHubDepth control: green. The cloned hub was caught (${failures} finding).`); process.exit(0); }
  console.error('simHubDepth control: RED. Two identical hubs passed the difference check.');
  process.exit(1);
}
if (failures > 0) { console.error(`simHubDepth: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('simHubDepth: green. Six hubs, six pages worth landing on, none of them the same page twice.');
