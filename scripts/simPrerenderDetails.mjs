/**
 * Focused Round 514 fence for closed native disclosures in raw snapshots.
 * It runs the exact browser callback embedded in prerender.mjs, then applies
 * the same clock-sample intersection and chrome renderer used by production.
 *
 * Negative control:
 *   PRERENDER_DETAILS_CONTROL=drop node scripts/simPrerenderDetails.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pw from './lib/playwrightLoader.mjs';
import { intersectPrerenderParts, renderPrerenderParts } from './lib/prerenderParts.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(path.join(ROOT, 'scripts/prerender.mjs'), 'utf8');
const START = '/* PRERENDER_CAPTURE_CALLBACK_START */';
const END = '/* PRERENDER_CAPTURE_CALLBACK_END */';
const start = source.indexOf(START);
const end = source.indexOf(END);
assert(start >= 0 && end > start, 'the production capture callback markers must exist once and in order');
assert.equal(source.indexOf(START, start + START.length), -1, 'capture start marker must be unique');
assert.equal(source.indexOf(END, end + END.length), -1, 'capture end marker must be unique');
let callbackSource = source.slice(start + START.length, end).trim();

const control = process.env.PRERENDER_DETAILS_CONTROL || '';
if (control && control !== 'drop') throw new Error(`unknown PRERENDER_DETAILS_CONTROL=${control}`);
if (control === 'drop') {
  const needle = "const DISCLOSURE = '[data-seo-content] details, footer[data-site-chrome] details';";
  const replacement = "const DISCLOSURE = '[data-prerender-details-control-never-matches]';";
  assert.equal(callbackSource.split(needle).length - 1, 1, 'negative control must find the disclosure selector exactly once');
  callbackSource = callbackSource.replace(needle, replacement);
  assert(!callbackSource.includes(needle), 'negative control must change the production callback');
}

const capture = Function(`"use strict"; return (${callbackSource});`)();
const browser = await pw.chromium.launch({ headless: true });
const page = await browser.newPage();

function fixture(changingWord) {
  return `<!doctype html><html><head><title>Fixture</title></head><body>
    <main>
      <h1>Fixture game</h1>
      <section data-seo-content="ready">
        <details>
          <summary>Game guide</summary>
          <article>
            <h2>How to play Fixture</h2>
            <p>Keep this guide sentence. <a href="/fixture-link">Fixture link</a></p>
            <p>Changing clock word: ${changingWord}</p>
            <p data-no-prerender>Never freeze this marked sentence.</p>
          </article>
        </details>
      </section>
    </main>
    <footer data-site-chrome>
      <a href="/privacy">Privacy Policy</a>
      <details>
        <summary>Site info</summary>
        <div>
          <p>Keep this footer disclaimer.</p>
          <a href="/about">About</a>
        </div>
      </details>
    </footer>
  </body></html>`;
}

async function take(word) {
  await page.setContent(fixture(word));
  return page.evaluate(capture);
}

try {
  const samples = [await take('alpha'), await take('beta'), await take('gamma')];
  let stable = intersectPrerenderParts(samples[0].parts, samples[1].parts);
  stable = intersectPrerenderParts(stable, samples[2].parts);
  const html = renderPrerenderParts(stable);

  const expected = [
    '<details>', '<summary>Game guide</summary>', 'How to play Fixture',
    'Keep this guide sentence.', '<a href="/fixture-link">Fixture link</a>',
    '<summary>Site info</summary>', 'Keep this footer disclaimer.',
    '<a href="/about">About</a>', '</details>',
  ];
  const missing = expected.filter(text => !html.includes(text));
  const forbidden = ['Changing clock word:', 'Never freeze this marked sentence.'];
  const leaked = forbidden.filter(text => html.includes(text));
  const detailsOpen = (html.match(/<details>/g) || []).length;
  const detailsClose = (html.match(/<\/details>/g) || []).length;
  const summaries = (html.match(/<summary>/g) || []).length;
  const chromeOpen = (html.match(/<div data-site-chrome>/g) || []).length;
  const chromeClose = (html.match(/<\/div>/g) || []).length;
  const fixtureLinks = (html.match(/href="\/fixture-link"/g) || []).length;

  console.log(`captured ${stable.length} stable parts from three browser samples`);
  console.log(`details boundaries ${detailsOpen}/${detailsClose}, summaries ${summaries}, chrome boundaries ${chromeOpen}/${chromeClose}`);
  console.log(`missing ${missing.length}, leaked volatile blocks ${leaked.length}`);

  if (control === 'drop') {
    assert(missing.length > 0, 'negative control must remove disclosure content');
    console.log('simPrerenderDetails control: green. Neutralizing the scoped selector dropped the disclosure copy and the fixture caught it.');
  } else {
    assert.deepEqual(missing, [], `raw snapshot lost disclosure content: ${missing.join(', ')}`);
    assert.deepEqual(leaked, [], `raw snapshot kept volatile content: ${leaked.join(', ')}`);
    assert.equal(detailsOpen, 2, 'raw snapshot must keep two closed details elements');
    assert.equal(detailsClose, 2, 'raw snapshot must close both details elements');
    assert.equal(summaries, 2, 'each details element must keep its summary');
    assert.equal(chromeOpen, 1, 'footer disclosure must stay in one site chrome wrapper');
    assert.equal(chromeClose, 1, 'site chrome wrapper must close');
    assert.equal(fixtureLinks, 1, 'an href captured inside a paragraph must not be duplicated');
    const footerDisclosure = samples[1].parts.find(part => part.boundary === 'close' && part.chrome)?.disclosure;
    assert(footerDisclosure, 'fixture must produce a footer disclosure boundary');
    const missingFooterClose = samples[1].parts.filter(
      part => !(part.disclosure === footerDisclosure && part.boundary === 'close'),
    );
    const guarded = intersectPrerenderParts(samples[0].parts, missingFooterClose);
    const guardedHtml = renderPrerenderParts(guarded);
    assert(!guardedHtml.includes('Keep this footer disclaimer.'), 'a missing boundary must remove its whole disclosure');
    assert.equal((guardedHtml.match(/<details>/g) || []).length, (guardedHtml.match(/<\/details>/g) || []).length, 'a missing boundary must not orphan details markup');
    console.log('simPrerenderDetails: green. Closed guide and footer disclosures keep their real text, links and balanced boundaries while volatile blocks fall out.');
  }
} finally {
  await browser.close();
}
