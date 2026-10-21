import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

// Refresh only the shared consent script. Route text and unrelated head tags stay byte exact.
const base = '3c56c21f835d46743fe5cab337b9fb46e38e3242';
const hash = value => createHash('sha256').update(value).digest('hex');
const scripts = html => [...html.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/gi)].map(match => match[0]);
const oldTemplate = execFileSync('git', ['show', `${base}:index.html`], { encoding: 'utf8' });
const oldCandidates = scripts(oldTemplate).filter(script => script.includes("localStorage.getItem('cookie-consent') === 'accepted'"));
assert.equal(oldCandidates.length, 1, 'The actual base has exactly one legacy consent bootstrap');
const oldScript = oldCandidates[0];
const template = fs.readFileSync('index.html', 'utf8');
const newCandidates = scripts(template).filter(script => /<script\b[^>]*\bdata-dukb-consent-bootstrap(?:\s|=|>)/.test(script));
assert.equal(newCandidates.length, 1, 'The current template has exactly one marked consent bootstrap');
const newScript = newCandidates[0];
assert.notEqual(newScript, oldScript);
assert(newScript.includes('cookie-consent-v2'));
assert(!newScript.includes("getItem('cookie-consent') === 'accepted'"));
const count = (text, needle) => text.split(needle).length - 1;

function replaceOne(original, previous = oldScript) {
  assert.equal(count(original, previous), 1, 'Exactly one complete base bootstrap must be present');
  const updated = original.replace(previous, newScript);
  assert.equal(count(updated, previous), 0);
  assert.equal(count(updated, newScript), 1);
  assert.equal(updated.replace(newScript, previous), original, 'All bytes outside the exact bootstrap must hold');
  return updated;
}

// A missing or changed old bootstrap must fail, rather than silently receiving success credit.
const fixture = `<head>${oldScript}</head><body>Fixture route text</body>`;
assert.notEqual(replaceOne(fixture), fixture);
let missingTargetRejected = false;
try { replaceOne(fixture.replace(oldScript, '<script>void 0</script>')); }
catch (error) { assert.match(error.message, /Exactly one complete base bootstrap/); missingTargetRejected = true; }
assert(missingTargetRejected);

const files = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (entry.name === 'index.html') files.push(file);
  }
}
walk('public');
const rows = [];
for (const file of files.sort()) {
  const original = fs.readFileSync(file, 'utf8');
  const oldCount = count(original, oldScript);
  const marked = /<script\b[^>]*\bdata-dukb-consent-bootstrap(?:\s|=|>)/.test(original);
  if (oldCount) {
    assert(!marked, `${file} must not contain both generations`);
    const updated = replaceOne(original);
    fs.writeFileSync(file, updated);
    rows.push({ file, operation: 'replaced', beforeSha256: hash(original), afterSha256: hash(updated), outsideBytesHeld: true });
  } else if (marked) {
    assert.equal(count(original, newScript), 1, `${file} must carry the current exact bootstrap`);
    rows.push({ file, operation: 'already-current', sha256: hash(original) });
  } else {
    assert(!original.includes("getItem('cookie-consent')"), `${file} contains an unrecognized legacy bootstrap`);
  }
}
assert(rows.length > 0, 'At least one saved page must contain the consent bootstrap');
const report = { base, oldScriptSha256: hash(oldScript), newScriptSha256: hash(newScript), missingTargetRejected, rows };
const out = process.env.LEGAL_PRIVACY_OUT || 'legal-privacy-artifacts';
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'heads.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`Consent heads: ${rows.filter(row => row.operation === 'replaced').length} refreshed, ${rows.filter(row => row.operation === 'already-current').length} already current. Outside bytes held; missing-target control rejected.`);
