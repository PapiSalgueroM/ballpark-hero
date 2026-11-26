import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const families = ['Inter', 'Space Grotesk'];
const directory = new URL('../../src/assets/fonts/', import.meta.url);
const sha256 = body => createHash('sha256').update(body).digest('hex');
const stylesheet = readFileSync(new URL('fonts.css', directory), 'utf8');
const sources = [...stylesheet.matchAll(/url\(\.\/([a-z-]+)\.woff2\)/g)].map(([, name]) => ({
  name, sha256: sha256(readFileSync(new URL(`${name}.woff2`, directory))),
}));

export function shippedFontSources() {
  for (const prefix of ['inter-', 'space-grotesk-']) {
    assert(sources.some(source => source.name.startsWith(prefix)), `Missing shipped font family ${prefix}`);
  }
  return sources;
}

export function captureShippedFonts(page, origin) {
  const pending = [];
  page.on('response', response => {
    const url = new URL(response.url());
    if (url.origin !== origin || response.request().resourceType() !== 'font') return;
    pending.push(response.body().then(body => ({ url, response, body }), error => ({ url, error })));
  });

  return async () => {
    const loaded = await page.evaluate(async names => {
      await document.fonts.ready;
      return Promise.all(names.map(async name => {
        const faces = await document.fonts.load(`400 16px "${name}"`, 'Football');
        return faces.some(face => face.status === 'loaded' && face.family.replaceAll('"', '') === name);
      }));
    }, families);
    assert(loaded.every(Boolean), 'Chromium loaded both shipped site font families');

    const receipts = (await Promise.all(pending)).map(({ url, response, body, error }) => {
      assert.ifError(error);
      assert.equal(response.status(), 200, `Shipped font response ${url.pathname}`);
      assert.equal(response.headers()['content-type'], 'font/woff2', `Shipped font MIME ${url.pathname}`);
      const hash = sha256(body);
      const source = sources.find(({ name, sha256 }) =>
        hash === sha256 && url.pathname.startsWith(`/assets/${name}-`) && url.pathname.endsWith('.woff2'));
      assert(source, `Served font matches checked-in WOFF2 bytes for ${url.pathname}`);
      return { url: url.href, source: `${source.name}.woff2`, bytes: body.length, sha256: hash };
    });
    assert(['inter-', 'space-grotesk-'].every(prefix => receipts.some(({ source }) => source.startsWith(prefix))),
      'Both shipped font families have verified local response receipts');
    return receipts;
  };
}
