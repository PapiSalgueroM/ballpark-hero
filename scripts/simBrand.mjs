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
 *   6. the shipped geometry and social card are what the generators produce
 *      today, so the files in public/ cannot have drifted apart
 *   7. every default social image reference uses the current cache key
 *
 * NEGATIVE CONTROL: BRAND_CONTROL=manifest points a manifest icon at a file that
 * does not exist, in memory; section 8 must go red.
 * NEGATIVE CONTROL: BRAND_CONTROL=external rewrites the template's og:image to
 * an off domain host in memory; section 3 must then fail. The rewrite is
 * asserted to have landed.
 * NEGATIVE CONTROL: BRAND_CONTROL=stale-cache rewrites the template, PageSeo
 * default and one committed snapshot back to the old social-card URL in
 * memory; section 7 must then report exactly those five planted references.
 * NEGATIVE CONTROL: BRAND_CONTROL=raster changes one byte in the freshly
 * generated social card in memory; section 6 must report exactly that drift.
 *
 * Run: node scripts/simBrand.mjs
 */
import { readFileSync, existsSync, statSync, mkdtempSync, rmSync } from 'node:fs';
import { readRoutes } from './lib/retiredRoutes.mjs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');
const SOCIAL_IMAGE_FILE = 'og-image-daily-sports.png';
const SOCIAL_IMAGE_URL = `https://douknowball.com/${SOCIAL_IMAGE_FILE}`;
const STALE_SOCIAL_IMAGE_URL = 'https://douknowball.com/og-image.png';
const EXTERNAL_CONTROL_URL = 'https://storage.googleapis.com/some-bucket/banner.webp';
let failures = 0;
let staleControlFindings = 0;
let externalControlFindings = 0;
let manifestControlFindings = 0;
let rasterControlFindings = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const read = p => readFileSync(path.join(ROOT, p), 'utf8');

const CONTROL = process.env.BRAND_CONTROL || '';
if (CONTROL && !['external', 'manifest', 'raster', 'stale-cache'].includes(CONTROL)) { console.error(`BRAND_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(1); }

/* ── 1: the assets ────────────────────────────────────────────────────── */
console.log('1) every brand asset exists and is what it says it is');
const pngSize = f => {
  const b = readFileSync(f);
  if (b.length < 24 || b.readUInt32BE(0) !== 0x89504e47) return null;
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
};
const WANT_PNG = [
  ['favicon-16.png', 16, 16], ['favicon-32.png', 32, 32], ['apple-touch-icon.png', 180, 180],
  ['icon-192.png', 192, 192], ['icon-512.png', 512, 512],
  ['og-image.png', 1200, 630], [SOCIAL_IMAGE_FILE, 1200, 630],
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
let pageSeoSource = read('src/components/seo/PageSeo.tsx');
if (CONTROL === 'external') {
  const before = indexHtml;
  indexHtml = indexHtml.replace(`content="${SOCIAL_IMAGE_URL}"`, `content="${EXTERNAL_CONTROL_URL}"`);
  if (indexHtml === before) { console.error('control: the og:image line was not found, so this control would prove nothing'); process.exit(1); }
  console.log('   NEGATIVE CONTROL ON: og:image rewritten to an off domain host in memory, section 3 must go red');
}
if (CONTROL === 'stale-cache') {
  const indexBefore = indexHtml;
  const pageSeoBefore = pageSeoSource;
  indexHtml = indexHtml.replaceAll(SOCIAL_IMAGE_URL, STALE_SOCIAL_IMAGE_URL);
  pageSeoSource = pageSeoSource.replace('`${BASE_URL}/og-image-daily-sports.png`', '`${BASE_URL}/og-image.png`');
  const changedTemplateRefs = indexBefore.split(SOCIAL_IMAGE_URL).length - indexHtml.split(SOCIAL_IMAGE_URL).length;
  if (changedTemplateRefs !== 2 || pageSeoSource === pageSeoBefore) {
    console.error(`control: expected to stale two template references and the PageSeo default, changed ${changedTemplateRefs} template reference(s)`);
    process.exit(1);
  }
  console.log('   NEGATIVE CONTROL ON: template and PageSeo use the old social-card URL in memory; one snapshot will follow in section 7');
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
if (og && attr(og, 'content') !== SOCIAL_IMAGE_URL) {
  const url = attr(og, 'content');
  if (!(CONTROL === 'external' && url === EXTERNAL_CONTROL_URL)) {
    fail(`index.html og:image is ${JSON.stringify(url)}, expected ${SOCIAL_IMAGE_URL}`);
    if (CONTROL === 'stale-cache' && url === STALE_SOCIAL_IMAGE_URL) staleControlFindings += 1;
  }
}
if (tw && attr(tw, 'content') !== SOCIAL_IMAGE_URL) {
  fail(`index.html twitter:image is ${JSON.stringify(attr(tw, 'content'))}, expected ${SOCIAL_IMAGE_URL}`);
  if (CONTROL === 'stale-cache' && attr(tw, 'content') === STALE_SOCIAL_IMAGE_URL) staleControlFindings += 1;
}
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
    if (host !== 'douknowball.com' && host !== 'www.douknowball.com' && host !== 'flagcdn.com') {
      off += 1;
      fail(`${u} is an image on ${host}, and the only permitted external image host is flagcdn.com`);
      if (CONTROL === 'external' && u === EXTERNAL_CONTROL_URL) externalControlFindings += 1;
    }
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

console.log('6) the shipped geometry, SVGs and social PNG are exactly what the generators produce');
{
  const gen = path.join(ROOT, 'scripts/logo/gen_logo.py');
  const raster = path.join(ROOT, 'scripts/logo/rasterize.mjs');
  let py = null;
  /* Round 320: 'py' is the Windows launcher. On a stock Windows shell
     'python' and 'python3' resolve to Microsoft Store stubs that exit
     non-zero, so without the launcher this check reported "no python" on the
     one machine the desktop lane actually runs on. */
  for (const c of ['python3', 'python', 'py']) { try { execFileSync(c, ['--version'], { stdio: 'ignore' }); py = c; break; } catch { /* next */ } }
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
        [path.join(tmp, 'og-image.svg'), path.join(ROOT, 'scripts/logo/og-image.svg')],
      ]) {
        if (!existsSync(shipped)) { drift += 1; fail(`${path.relative(ROOT, shipped)} is missing`); continue; }
        if (readFileSync(fresh, 'utf8') !== readFileSync(shipped, 'utf8')) { drift += 1; fail(`${path.relative(ROOT, shipped)} differs from what scripts/logo/gen_logo.py produces now; re-run the generator and the rasteriser`); }
      }
      execFileSync(process.execPath, [raster, tmp], { cwd: ROOT, stdio: 'pipe' });
      const freshSocial = path.join(tmp, SOCIAL_IMAGE_FILE);
      const shippedSocial = path.join(PUBLIC, SOCIAL_IMAGE_FILE);
      if (!existsSync(freshSocial)) {
        drift += 1;
        fail(`scripts/logo/rasterize.mjs did not produce ${SOCIAL_IMAGE_FILE}`);
      } else if (!existsSync(shippedSocial)) {
        drift += 1;
        fail(`public/${SOCIAL_IMAGE_FILE} is missing`);
      } else {
        let freshBytes = readFileSync(freshSocial);
        if (CONTROL === 'raster') {
          const before = freshBytes;
          freshBytes = Buffer.from(freshBytes);
          freshBytes[freshBytes.length - 1] ^= 1;
          if (freshBytes.equals(before)) {
            console.error('control: could not change the fresh social raster in memory, so this control would prove nothing');
            process.exit(1);
          }
          console.log('   NEGATIVE CONTROL ON: one generated social-card byte changed in memory, section 6 must go red');
        }
        if (!freshBytes.equals(readFileSync(shippedSocial))) {
          drift += 1;
          fail(`public/${SOCIAL_IMAGE_FILE} differs from a fresh raster of scripts/logo/og-image.svg`);
          if (CONTROL === 'raster') rasterControlFindings += 1;
        }
      }
      console.log(`   generators re-run, 6 source files and the social PNG compared, ${drift} drifted`);
    } catch (e) {
      fail(`the brand generators could not be run: ${String(e).split('\n')[0].slice(0, 160)}`);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }
}

console.log('7) every default social image reference uses the fresh cache key');
{
  const generator = read('scripts/logo/gen_logo.py').replace(/#[^\n]*/g, ' ');
  const wantedCopy = 'Every game plays without an account. No downloads.';
  if (!generator.includes(`('${wantedCopy}', 522, 34, GREEN, 1.0)`)) fail(`the social card generator does not carry the approved line ${JSON.stringify(wantedCopy)}`);
  if (generator.includes('No sign-up. No downloads.')) fail('the social card generator still makes the misleading no sign-up claim');

  const pageSeoCode = pageSeoSource.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
  if (!new RegExp('const\\s+DEFAULT_OG_IMAGE\\s*=\\s*`\\$\\{BASE_URL\\}/og-image-daily-sports\\.png`').test(pageSeoCode)) {
    fail(`PageSeo does not default to ${SOCIAL_IMAGE_URL}`);
    if (CONTROL === 'stale-cache' && pageSeoCode.includes('`${BASE_URL}/og-image.png`')) staleControlFindings += 1;
  }

  let checkedSnapshots = 0;
  let hiddenStubs = 0;
  let staleSnapshotArmed = false;
  const expectedSnapshotRoutes = [...readRoutes().live].filter(route => route !== '/');
  for (const route of expectedSnapshotRoutes) {
    const file = path.join(PUBLIC, route.slice(1), 'index.html');
    if (!existsSync(file)) {
      fail(`${route}: live route has no committed snapshot file`);
      continue;
    }
    let html = readFileSync(file, 'utf8');
    const hiddenStub = /<meta\s+name="dukb-hidden-page"\s+content="needs an account">/.test(html);
    if (CONTROL === 'stale-cache' && !hiddenStub && !staleSnapshotArmed) {
      const before = html;
      html = html.replaceAll(SOCIAL_IMAGE_URL, STALE_SOCIAL_IMAGE_URL);
      const changed = before.split(SOCIAL_IMAGE_URL).length - html.split(SOCIAL_IMAGE_URL).length;
      if (changed !== 2) {
        console.error(`control: expected to stale two social-image tags in ${route}, changed ${changed}`);
        process.exit(1);
      }
      staleSnapshotArmed = true;
    }
    const snapshotMetas = [...html.matchAll(/<meta\b[^>]*>/g)].map(m => m[0]);
    const snapshotOg = snapshotMetas.find(t => attr(t, 'property') === 'og:image');
    const snapshotTw = snapshotMetas.find(t => attr(t, 'name') === 'twitter:image');
    if (!snapshotOg && !snapshotTw && hiddenStub) {
      hiddenStubs += 1;
      continue;
    }
    checkedSnapshots += 1;
    if (!snapshotOg || attr(snapshotOg, 'content') !== SOCIAL_IMAGE_URL) {
      fail(`${route}: og:image does not use ${SOCIAL_IMAGE_FILE}`);
      if (CONTROL === 'stale-cache' && snapshotOg && attr(snapshotOg, 'content') === STALE_SOCIAL_IMAGE_URL) staleControlFindings += 1;
    }
    if (!snapshotTw || attr(snapshotTw, 'content') !== SOCIAL_IMAGE_URL) {
      fail(`${route}: twitter:image does not use ${SOCIAL_IMAGE_FILE}`);
      if (CONTROL === 'stale-cache' && snapshotTw && attr(snapshotTw, 'content') === STALE_SOCIAL_IMAGE_URL) staleControlFindings += 1;
    }
  }
  if (CONTROL === 'stale-cache' && !staleSnapshotArmed) {
    console.error('control: no committed snapshot was changed, so the snapshot check was not exercised');
    process.exit(1);
  }
  if (checkedSnapshots + hiddenStubs !== expectedSnapshotRoutes.length) {
    fail(`${checkedSnapshots} tagged snapshots plus ${hiddenStubs} intentional hidden stubs do not account for ${expectedSnapshotRoutes.length} live routes`);
  }
  console.log(`   cache key checked on the template, PageSeo and ${checkedSnapshots} committed snapshots; ${hiddenStubs} account-only stubs carry no social tags`);
}

console.log('8) the manifest makes the site installable with the same face');
{
  /* Round 290. A manifest that names an icon that is not there installs a
     blank tile, and a theme colour that disagrees with the template paints
     two different bars. Both are read off disk and compared, not trusted. */
  let raw = read('public/manifest.json');
  if (CONTROL === 'manifest') {
    const before = raw;
    raw = raw.replace('"/icon-192.png"', '"/icon-192-missing.png"');
    if (raw === before) { console.error('control: the 192 icon line was not found, so this control would prove nothing'); process.exit(1); }
    console.log('   NEGATIVE CONTROL ON: the 192 icon pointed at a missing file in memory, this section must go red');
  }
  let m = null;
  try { m = JSON.parse(raw); } catch { fail('public/manifest.json is not valid JSON'); }
  if (m) {
    if (m.name !== 'DoUKnowBall' || m.short_name !== 'DoUKnowBall') fail('the manifest does not name the site');
    if (!m.start_url || !m.start_url.startsWith('/')) fail('the manifest start_url is not on this site');
    if (m.display !== 'standalone') fail(`display is ${m.display}, expected standalone`);
    const themeMeta = metas.find(t => attr(t, 'name') === 'theme-color');
    if (!themeMeta || (attr(themeMeta, 'content') || '').toLowerCase() !== String(m.theme_color).toLowerCase()) fail(`the manifest theme colour ${m.theme_color} does not match the template's meta`);
    if (!/^#[0-9a-f]{6}$/i.test(String(m.background_color))) fail('background_color is not a hex colour');
    const icons = Array.isArray(m.icons) ? m.icons : [];
    const sizes = new Set();
    for (const ic of icons) {
      const src = String(ic.src || '');
      const file = path.join(PUBLIC, src.replace(/^\//, ''));
      if (!src.startsWith('/') || !existsSync(file)) {
        fail(`manifest icon ${src} is not a file in public/`);
        if (CONTROL === 'manifest' && src === '/icon-192-missing.png') manifestControlFindings += 1;
        continue;
      }
      const want = String(ic.sizes || '').match(/^(\d+)x(\d+)$/);
      const got = pngSize(file);
      if (!want || !got || got.w !== Number(want[1]) || got.h !== Number(want[2])) fail(`manifest icon ${src} is declared ${ic.sizes} and the file is ${got ? `${got.w}x${got.h}` : 'unreadable'}`);
      else sizes.add(ic.sizes);
    }
    if (!sizes.has('192x192') || !sizes.has('512x512')) {
      fail('the manifest needs a 192 and a 512 icon for an install prompt');
      if (CONTROL === 'manifest') manifestControlFindings += 1;
    }
    const liveRoutes = readRoutes().live;
    for (const sc of Array.isArray(m.shortcuts) ? m.shortcuts : []) {
      const url = String(sc.url || '').split('?')[0];
      if (!liveRoutes.has(url)) fail(`manifest shortcut ${sc.url} is not a live route`);
      for (const ic of sc.icons || []) if (!existsSync(path.join(PUBLIC, String(ic.src || '').replace(/^\//, '')))) fail(`shortcut icon ${ic.src} is not a file in public/`);
    }
    if (!links.some(t => /\brel="manifest"/.test(t) && attr(t, 'href') === '/manifest.json')) fail('index.html does not link the manifest');
    if (!metas.some(t => attr(t, 'name') === 'apple-mobile-web-app-title')) fail('index.html has no apple-mobile-web-app-title');
    console.log(`   ${icons.length} icons at their declared sizes, ${(m.shortcuts || []).length} shortcuts on live routes, theme colour agrees with the template`);
  }
}

console.log('');
if (CONTROL === 'manifest') {
  if (failures === 2 && manifestControlFindings === 2) {
    console.log('simBrand control: green. The planted missing manifest icon caused exactly the two expected findings.');
    process.exit(0);
  }
  console.error(`simBrand control: RED. Expected exactly 2 planted findings, saw ${manifestControlFindings} planted and ${failures} total.`);
  process.exit(1);
}
if (CONTROL === 'external') {
  if (failures === 1 && externalControlFindings === 1) {
    console.log('simBrand control: green. The planted off-domain image was the only finding.');
    process.exit(0);
  }
  console.error(`simBrand control: RED. Expected only 1 section-3 finding, saw ${externalControlFindings} planted and ${failures} total.`);
  process.exit(1);
}
if (CONTROL === 'stale-cache') {
  if (failures === 5 && staleControlFindings === 5) {
    console.log('simBrand control: green. All five stale cache-key references were the only findings.');
    process.exit(0);
  }
  console.error(`simBrand control: RED. Expected only 5 planted findings, saw ${staleControlFindings} planted and ${failures} total.`);
  process.exit(1);
}
if (CONTROL === 'raster') {
  if (failures === 1 && rasterControlFindings === 1) {
    console.log('simBrand control: green. The planted social-raster drift was the only finding.');
    process.exit(0);
  }
  console.error(`simBrand control: RED. Expected only 1 planted raster finding, saw ${rasterControlFindings} planted and ${failures} total.`);
  process.exit(1);
}
if (failures > 0) {
  console.error(`simBrand: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simBrand: green. One mark, drawn from one source, everywhere the site shows its face.');
