/**
 * Round 286 harness: the site's own face, and every place it is shown.
 *
 * WHY. The site shipped for months with an AI generated banner as its only
 * image: it said "10+ Free Sports Trivia Games" on a site with over a hundred,
 * carried a line of garbled text at the bottom, lived on the host's upload
 * bucket (an external image host, and the legal rule allows exactly one,
 * flagcdn.com), and doubled as the Organization logo in the structured data,
 * where a square mark belongs. There was no favicon.svg, no touch icon and no
 * theme colour at all. Round 286 generates a real mark and wordmark from one
 * source (scripts/logo/gen_logo.py) and this holds all of it in place:
 *
 *   1. every asset exists and is the size it claims to be
 *   2. the template links the icons, the social image and the theme colour
 *   3. no image the template points a crawler at lives off the domain
 *   4. the Organization logo is the square mark, in both copies of the block
 *   5. the header draws the mark from the generated geometry
 *   6. the shipped geometry is what the generator produces today, so the
 *      header and the files in public/ cannot have drifted apart
 *
 * NEGATIVE CONTROL: BRAND_CONTROL=external rewrites the template's og:image to
 * an off domain host in memory; section 3 must then fail. The rewrite is
 * asserted to have landed.
 *
 * Run: node scripts/simBrand.mjs
 */
import { readFileSync, existsSync, statSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const read = p => readFileSync(path.join(ROOT, p), 'utf8');

const CONTROL = process.env.BRAND_CONTROL || '';
if (CONTROL && CONTROL !== 'external') { console.error(`BRAND_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(1); }

/* ── 1: the assets ────────────────────────────────────────────────────── */
console.log('1) every brand asset exists and is what it says it is');
const pngSize = f => {
  const b = readFileSync(f);
  if (b.length < 24 || b.readUInt32BE(0) !== 0x89504e47) return null;
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
};
const WANT_PNG = [
  ['favicon-16.png', 16, 16], ['favicon-32.png', 32, 32], ['apple-touch-icon.png', 180, 180],
  ['icon-192.png', 192, 192], ['icon-512.png', 512, 512], ['og-image.png', 1200, 630],
];
for (const [f, w, h] of WANT_PNG) {
  const p = path.join(PUBLIC, f);
  if (!existsSync(p)) { fail(`public/${f} is missing`); continue; }
  const s = pngSize(p);
  if (!s) { fail(`public/${f} is not a PNG`); continue; }
  if (s.w !== w || s.h !== h) fail(`public/${f} is ${s.w}x${s.h}, expected ${w}x${h}`);
}
for (const f of ['favicon.svg', 'logo.svg', 'logo-mark.svg', 'logo-wordmark.svg']) {
  const p = path.join(PUBLIC, f);
  if (!existsSync(p)) { fail(`public/${f} is missing`); continue; }
  const svg = readFileSync(p, 'utf8');
  if (!/^<svg\b/.test(svg.trim())) fail(`public/${f} does not start with an svg element`);
  if (/<text\b/.test(svg)) fail(`public/${f} uses a text element, so it depends on a font the viewer may not have; the wordmark must be outlines`);
  if (!/<path\b/.test(svg)) fail(`public/${f} has no path in it`);
}
{
  const p = path.join(PUBLIC, 'favicon.ico');
  if (!existsSync(p)) fail('public/favicon.ico is missing');
  else {
    const b = readFileSync(p);
    const count = b.length >= 6 && b.readUInt16LE(0) === 0 && b.readUInt16LE(2) === 1 ? b.readUInt16LE(4) : 0;
    if (count < 3) fail(`favicon.ico carries ${count} image(s), expected 16, 32 and 48`);
  }
}
console.log(`   ${WANT_PNG.length} PNGs at their sizes, 4 SVGs made of outlines, the .ico with three sizes`);

/* ── 2 and 3: the template ────────────────────────────────────────────── */
console.log('2) the template links the icons, the social image and the theme colour');
let indexHtml = read('index.html');
if (CONTROL === 'external') {
  const before = indexHtml;
  indexHtml = indexHtml.replace('content="https://douknowball.com/og-image.png"', 'content="https://storage.googleapis.com/some-bucket/banner.webp"');
  if (indexHtml === before) { console.error('control: the og:image line was not found, so this control would prove nothing'); process.exit(1); }
  console.log('   NEGATIVE CONTROL ON: og:image rewritten to an off domain host in memory, section 3 must go red');
}
const head = indexHtml.replace(/<!--[\s\S]*?-->/g, ' ');
const tags = [...head.matchAll(/<(link|meta)\b[^>]*>/g)].map(m => m[0]);
const attr = (tag, name) => (tag.match(new RegExp(`\\b${name}="([^"]*)"`)) || [])[1] ?? null;
const links = tags.filter(t => t.startsWith('<link'));
const metas = tags.filter(t => t.startsWith('<meta'));
const iconHrefs = links.filter(t => /\brel="(icon|apple-touch-icon)"/.test(t)).map(t => attr(t, 'href'));
if (!iconHrefs.includes('/favicon.svg')) fail('index.html does not link /favicon.svg');
if (!iconHrefs.includes('/favicon.ico')) fail('index.html does not link /favicon.ico');
if (!links.some(t => /\brel="apple-touch-icon"/.test(t) && attr(t, 'href') === '/apple-touch-icon.png')) fail('index.html has no apple-touch-icon');
if (!metas.some(t => attr(t, 'name') === 'theme-color' && /^#[0-9a-f]{6}$/i.test(attr(t, 'content') || ''))) fail('index.html has no theme-color');
const og = metas.find(t => attr(t, 'property') === 'og:image');
const tw = metas.find(t => attr(t, 'name') === 'twitter:image');
if (!og) fail('index.html has no og:image'); if (!tw) fail('index.html has no twitter:image');
const ogW = metas.find(t => attr(t, 'property') === 'og:image:width'), ogH = metas.find(t => attr(t, 'property') === 'og:image:height');
if (!ogW || attr(ogW, 'content') !== '1200' || !ogH || attr(ogH, 'content') !== '630') fail('og:image is not declared as 1200 by 630');
for (const href of iconHrefs) {
  if (href && href.startsWith('/') && !existsSync(path.join(PUBLIC, href.slice(1)))) fail(`index.html links ${href} and there is no such file`);
}
console.log(`   ${iconHrefs.length} icon links, og:image and twitter:image present, theme colour set`);

console.log('3) no image the template points a crawler at lives off the domain');
{
  const urls = [];
  for (const t of metas) {
    const p = attr(t, 'property') || attr(t, 'name') || '';
    if (/^(og:image|twitter:image|og:logo)$/.test(p)) urls.push(attr(t, 'content'));
  }
  for (const t of links) if (/\brel="(icon|apple-touch-icon)"/.test(t)) urls.push(attr(t, 'href'));
  let off = 0;
  for (const u of urls) {
    if (!u) continue;
    const m = u.match(/^https?:\/\/([^/]+)/);
    if (!m) continue;
    const host = m[1].toLowerCase();
    if (host !== 'douknowball.com' && host !== 'www.douknowball.com' && host !== 'flagcdn.com') { off += 1; fail(`${u} is an image on ${host}, and the only permitted external image host is flagcdn.com`); }
    else if (host.endsWith('douknowball.com')) {
      const f = path.join(PUBLIC, u.replace(/^https?:\/\/[^/]+\//, ''));
      if (!existsSync(f)) fail(`${u} points at a file that does not exist in public/`);
    }
  }
  console.log(`   ${urls.length} image references, ${off} off the domain`);
}

/* ── 4: the Organization logo ─────────────────────────────────────────── */
console.log('4) the Organization logo is the square mark, in both copies of the site block');
{
  const inline = (head.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/) || [])[1] || '';
  let logo = null;
  try { logo = (JSON.parse(inline).find(x => x['@type'] === 'Organization') || {}).logo ?? null; } catch { fail('the site block in index.html does not parse as JSON'); }
  if (logo !== 'https://douknowball.com/icon-512.png') fail(`the template's Organization logo is ${JSON.stringify(logo)}, expected the square mark`);
  const schema = read('src/lib/pageSchema.ts').replace(/\/\*[\s\S]*?\*\//g, ' ');
  if (!/logo:\s*`\$\{SITE\}\/icon-512\.png`/.test(schema)) fail('pageSchema.ts does not name icon-512.png as the Organization logo');
  const s = pngSize(path.join(PUBLIC, 'icon-512.png'));
  if (!s || s.w < 112 || s.h < 112 || s.w !== s.h) fail('the logo file is not a square of at least 112px, which is the floor Google states for a logo');
  console.log('   both say /icon-512.png, a 512 by 512 square');
}

/* ── 5 and 6: the header, and the generator agreeing with the files ──── */
console.log('5) the header draws the mark from the generated geometry');
{
  const header = read('src/components/layout/Header.tsx').replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ');
  if (!/<LogoMark\b/.test(header)) fail('Header.tsx does not render LogoMark');
  const logo = read('src/components/layout/Logo.tsx');
  if (!/from '\.\/logoMark'/.test(logo)) fail('Logo.tsx does not read its shape from the generated logoMark.ts');
  if (!/aria-hidden="true"/.test(logo)) fail('the inline mark is not aria-hidden, so screen readers get an unlabelled drawing before the wordmark');
  console.log('   LogoMark in the header, shape from logoMark.ts, hidden from screen readers');
}

console.log('6) the shipped geometry and SVGs are exactly what the generator produces');
{
  const gen = path.join(ROOT, 'scripts/logo/gen_logo.py');
  let py = null;
  for (const c of ['python3', 'python']) { try { execFileSync(c, ['--version'], { stdio: 'ignore' }); py = c; break; } catch { /* next */ } }
  if (!py) {
    fail('no python on this machine, so the generator cannot be re-run and drift between the header and the files cannot be ruled out');
  } else {
    const tmp = mkdtempSync(path.join(tmpdir(), 'dukb-logo-'));
    try {
      execFileSync(py, [gen, tmp], { stdio: 'pipe' });
      let drift = 0;
      for (const [fresh, shipped] of [
        [path.join(tmp, 'logoMark.ts'), path.join(ROOT, 'src/components/layout/logoMark.ts')],
        [path.join(tmp, 'favicon.svg'), path.join(PUBLIC, 'favicon.svg')],
        [path.join(tmp, 'logo.svg'), path.join(PUBLIC, 'logo.svg')],
        [path.join(tmp, 'logo-mark.svg'), path.join(PUBLIC, 'logo-mark.svg')],
        [path.join(tmp, 'logo-wordmark.svg'), path.join(PUBLIC, 'logo-wordmark.svg')],
      ]) {
        if (!existsSync(shipped)) { drift += 1; fail(`${path.relative(ROOT, shipped)} is missing`); continue; }
        if (readFileSync(fresh, 'utf8') !== readFileSync(shipped, 'utf8')) { drift += 1; fail(`${path.relative(ROOT, shipped)} differs from what scripts/logo/gen_logo.py produces now; re-run the generator and the rasteriser`); }
      }
      console.log(`   generator re-run, 5 files compared, ${drift} drifted`);
    } catch (e) {
      fail(`the generator could not be run: ${String(e).split('\n')[0].slice(0, 160)}`);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }
}

console.log('');
if (CONTROL === 'external') {
  if (failures > 0) { console.log(`simBrand control: green. The off domain image was reported (${failures} finding).`); process.exit(0); }
  console.error('simBrand control: RED. An off domain og:image went unreported, so section 3 proves nothing.');
  process.exit(1);
}
if (failures > 0) {
  console.error(`simBrand: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simBrand: green. One mark, drawn from one source, everywhere the site shows its face.');
