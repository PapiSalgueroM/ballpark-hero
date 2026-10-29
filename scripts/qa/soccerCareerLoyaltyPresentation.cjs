const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const digest = body => createHash('sha256').update(body).digest('hex');
if (process.argv.includes('--prefetch-loyalty-fonts')) {
  (async () => {
    assert.equal(process.env.CI, '1');
    const out = path.resolve('loyalty-artifacts/font-cache');
    fs.mkdirSync(out, { recursive: true });
    const template = fs.readFileSync('index.html', 'utf8');
    const sheets = [...template.matchAll(/<link\s+href="(https:\/\/fonts\.googleapis\.com\/[^"]+)"\s+rel="stylesheet"/g)].map(row => new URL(row[1]).href);
    assert.equal(sheets.length, 1, 'Actual template font stylesheet');
    const records = [];
    const get = async url => {
      assert(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(new URL(url).origin));
      const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'Mozilla/5.0 Chrome/131.0.0.0 Safari/537.36' } });
      assert(response.ok);
      const body = Buffer.from(await response.arrayBuffer()), file = digest(url);
      fs.writeFileSync(path.join(out, file), body);
      records.push({ url, file, sha256: digest(body), contentType: response.headers.get('content-type') });
      return body.toString('utf8');
    };
    const css = await get(sheets[0]);
    const fonts = [...new Set([...css.matchAll(/url\(\s*['"]?(https:\/\/[^)'"\s]+)/g)].map(row => row[1]))];
    assert(fonts.length > 0);
    for (const url of fonts) { assert.equal(new URL(url).origin, 'https://fonts.gstatic.com'); await get(url); }
    fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(records, null, 2));
    console.log('Prepared ' + records.length + ' actual font dependencies, each body SHA256 retained.');
  })().catch(error => { console.error(error); process.exitCode = 1; });
} else if (process.env.SC_LOYALTY_FONT_MANIFEST) {
  const file = path.resolve(process.env.SC_LOYALTY_FONT_MANIFEST), base = path.dirname(file);
  const cache = new Map(JSON.parse(fs.readFileSync(file, 'utf8')).map(row => {
    assert(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(new URL(row.url).origin));
    const bodyPath = path.resolve(base, row.file);
    assert.equal(path.dirname(bodyPath), base);
    const body = fs.readFileSync(bodyPath);
    assert.equal(digest(body), row.sha256);
    return [row.url, { body, contentType: row.contentType, headers: { 'access-control-allow-origin': '*' } }];
  }));
  require('playwright-core').chromium._playwright._instrumentation.addListener({
    async runAfterCreateBrowserContext(context) {
      await context.route('**/*', route => {
        const cached = cache.get(route.request().url());
        return cached ? route.fulfill(cached) : route.fallback();
      });
    },
  });
}
