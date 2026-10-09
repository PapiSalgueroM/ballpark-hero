import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

export const CAREER_DEVELOPMENT_BASE = '4ab80fa978cf362427bcd024c64c6691e7f83c2a';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const originals = new Map();
const sha = value => createHash('sha256').update(value).digest('hex');
const normalize = value => value.replaceAll('\r\n', '\n');
const catalogStart = '    { id: 6, emoji: "👶", title: "Youth Mentor",';
const catalogEnd = '    { id: 7,';

export function careerDevelopmentBaseReceipt() {
  return { head: CAREER_DEVELOPMENT_BASE, tree: execFileSync('git', ['rev-parse', `${CAREER_DEVELOPMENT_BASE}^{tree}`], { cwd: ROOT, encoding: 'utf8' }).trim() };
}

function originalSource(relative) {
  if (!originals.has(relative)) originals.set(relative, normalize(execFileSync('git', ['show', `${CAREER_DEVELOPMENT_BASE}:${relative}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 })));
  return originals.get(relative);
}

function mentorCatalog(source) {
  assert.equal(source.split(catalogStart).length, 2, 'The Youth Mentor object has one start');
  const start = source.indexOf(catalogStart), end = source.indexOf(catalogEnd, start);
  assert(end > start, 'The next event bounds the entire Youth Mentor object');
  assert.equal(source.indexOf(catalogEnd, end + 1), -1, 'The next event has one boundary');
  return source.slice(start, end);
}

/** Only copied historical bundles undo these two intentional changes. */
export function inverseCareerDevelopment(source, receipts) {
  const before = normalize(source), from = ' + recentClubForm(state).swing';
  assert.equal(before.split(from).length, 2, 'The copied form inverse has one actual draw anchor');
  const original = originalSource('src/lib/soccerCareerEngine.ts');
  const currentCatalog = mentorCatalog(before), oldCatalog = mentorCatalog(original);
  assert.notEqual(currentCatalog, oldCatalog, 'The copied catalog inverse restores a changed whole object');
  const after = before.replace(from, '').replace(currentCatalog, oldCatalog);
  assert.notEqual(after, before, 'The copied historical inverse changes actual source');
  assert(!after.includes(from), 'The form adjustment was removed from the copied draw');
  assert.equal(mentorCatalog(after), oldCatalog, 'The entire certified catalog object was restored');
  receipts.push({ ...careerDevelopmentBaseReceipt(), engineBaseSha256: sha(original), beforeSha256: sha(before), afterSha256: sha(after), formAnchors: 1, catalogRestored: true, effective: true });
  return after;
}

/** Read the actual certified src tree for an independent original replay. */
export function careerDevelopmentOriginalPlugin(receipts) {
  return { name: 'career-development-original-1185', setup(builder) {
    builder.onLoad({ filter: /\.(ts|tsx|json)$/ }, args => {
      const relative = path.relative(ROOT, args.path).replaceAll('\\', '/');
      if (!relative.startsWith('src/')) return undefined;
      const contents = originalSource(relative);
      receipts.push({ relative, head: CAREER_DEVELOPMENT_BASE, sha256: sha(contents) });
      return { contents, loader: relative.endsWith('.tsx') ? 'tsx' : relative.endsWith('.json') ? 'json' : 'ts', resolveDir: path.dirname(args.path) };
    });
  } };
}
