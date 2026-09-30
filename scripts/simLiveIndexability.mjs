/* Round 741: the actual live audit must fail when a healthy HTTP response gains
   an applicable indexing restriction. Every control changes the served input,
   and every affected route must move from clean to failure in auditLive's output.
   No live network, browser, build, snapshots or database needed.

   node scripts/simLiveIndexability.mjs
   LIVE_INDEXABILITY_CONTROL=meta node scripts/simLiveIndexability.mjs
   LIVE_INDEXABILITY_CONTROL=header node scripts/simLiveIndexability.mjs
   LIVE_INDEXABILITY_CONTROL=scope node scripts/simLiveIndexability.mjs */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.LIVE_INDEXABILITY_CONTROL || '';
assert(['', 'meta', 'header', 'scope'].includes(CONTROL), `unknown control ${CONTROL}`);
const cases = [
  { id: 'meta-order', group: 'meta', markup: '<META CONTENT="NOINDEX, FOLLOW" NAME="ROBOTS">', finding: 'meta robots' },
  { id: 'meta-none', group: 'meta', markup: '<meta name=robots content=none>', finding: 'meta robots' },
  { id: 'meta-googlebot', group: 'meta', markup: "<meta content='noindex' name='GoogleBot'>", finding: 'meta googlebot' },
  { id: 'meta-entity', group: 'meta', markup: '<meta name="robots" content="n&#111;index">', finding: 'meta robots' },
  { id: 'meta-body', group: 'meta', markup: '<meta name="robots" content="noindex">', location: '</body>', finding: 'meta robots' },
  { id: 'header-generic', group: 'header', headers: ['NOINDEX, FOLLOW'], finding: 'X-Robots-Tag' },
  { id: 'header-none', group: 'header', headers: ['none'], finding: 'X-Robots-Tag' },
  { id: 'header-googlebot', group: 'scope', headers: ['GoogleBot: NOINDEX, follow'], finding: 'X-Robots-Tag' },
  { id: 'header-duplicate', group: 'scope', headers: ['otherbot: noindex, none', 'noindex'], finding: 'X-Robots-Tag' },
  { id: 'header-switch', group: 'scope', headers: ['otherbot: noindex, none, googlebot: noindex'], finding: 'X-Robots-Tag' },
  { id: 'header-global', group: 'scope', headers: ['noindex, otherbot: index'], finding: 'X-Robots-Tag' },
];
const selected = cases.filter(c => !CONTROL || c.group === CONTROL);
let inject = false;
let base;
const touched = new Set();
const routes = [...cases.map(c => '/' + c.id), '/clean-inert', '/clean-otherbot'];
const server = createServer((req, res) => {
  const route = new URL(req.url, 'http://localhost').pathname;
  const test = inject && selected.find(c => route === '/' + c.id);
  const content = Array.from({ length: 400 }, (_, i) => `topic${route.replace(/\W/g, '')}${i}`).join(' ');
  let html = `<!doctype html><html><head><title>${route}</title><link rel="canonical" href="${base}${route}"><meta name="description" content="Fixture"><meta name="robots" content="index, follow"></head><body><h1>${route}</h1><p>${content}</p>
<!-- <meta name="robots" content="noindex"> -->
<script>const example = '<meta name="robots" content="noindex">';</script>
<template><meta name="robots" content="noindex"></template>
<p>&lt;meta name="robots" content="noindex"&gt;</p>
<meta name="otherbot" content="noindex"><meta name="googlebot-news" content="none">
<meta name="googlebot" content="max-image-preview: none, noimageindex"></body></html>`;
  let headers = ['otherbot: noindex, none', 'Googlebot: index, max-image-preview: none', 'googlebot-news: noindex'];
  if (test) {
    const before = JSON.stringify({ html, headers });
    if (test.markup) {
      const location = test.location || '</head>';
      html = html.replace(location, test.markup + location);
    }
    if (test.headers) headers = test.headers;
    assert.notEqual(JSON.stringify({ html, headers }), before, `${test.id} control changed nothing`);
    touched.add(test.id);
  }
  res.writeHead(200, { 'Content-Type': 'text/html', 'X-Robots-Tag': headers });
  res.end(html);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
base = `http://127.0.0.1:${server.address().port}`;

const runAudit = () => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, ['scripts/auditLive.mjs', ...routes], {
    cwd: ROOT,
    env: { ...process.env, BASE: base, AUDIT_CONTROL: '' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', data => { output += data; });
  child.stderr.on('data', data => { output += data; });
  child.on('error', reject);
  child.on('close', code => resolve({ code, output }));
});

try {
  console.log('1) the real audit accepts healthy tags, inert examples and other-crawler-only headers');
  const healthy = await runAudit();
  assert.equal(healthy.code, 0, healthy.output);
  assert(healthy.output.includes(`${routes.length} of ${routes.length} answered cleanly, 0 did not.`), healthy.output);
  console.log(`   PASS: all ${routes.length} fixture URLs clean, including inert examples and scoped allow rules`);

  console.log(`2) ${selected.length} response controls must turn those same healthy URLs into named audit failures`);
  inject = true;
  const restricted = await runAudit();
  assert.equal(restricted.code, 1, restricted.output);
  for (const c of selected) {
    assert(touched.has(c.id), `${c.id} fixture was never changed and served`);
    const line = restricted.output.split('\n').find(line => line.trim().startsWith(`/${c.id} `));
    assert(line?.includes(`blocks Google indexing with ${c.finding}`), `${c.id} was not rejected by the intended check:\n${restricted.output}`);
    console.log(`   PASS: ${c.id} input changed, previously clean route now rejected by ${c.finding}`);
  }
  assert(restricted.output.includes(`${routes.length - selected.length} of ${routes.length} answered cleanly, ${selected.length} did not.`), restricted.output);
  console.log(`3) PASS: exactly ${selected.length} changed responses failed; every untouched response stayed clean`);
  console.log(`simLiveIndexability${CONTROL ? ` control ${CONTROL}` : ''}: green. Actual HTTP restrictions changed the live audit's verdict.`);
} finally {
  await new Promise(resolve => server.close(resolve));
}
