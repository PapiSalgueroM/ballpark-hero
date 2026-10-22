import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

export const sha = body => createHash('sha256').update(body).digest('hex');
export const OLD_CSS_SHA = 'f3a73714c7f08ea22bf18e1d6264b86f241e9a836e3b02ba58625e1359837bff';
const one = (text, value) => { assert.equal(text.split(value).length, 2, 'MATRIX_ADAPTER_UNIQUE_LITERAL'); };
const observer = [
  ["visibility: s.visibility };", "visibility: s.visibility, boxSizing: s.boxSizing, paddingTop: s.paddingTop, paddingBottom: s.paddingBottom };"],
  ["if (detailed) Object.assign(result, { actualViewport:", "if (detailed) Object.assign(result, { cssSupportsHas: CSS.supports('selector(:has(*))'), actualViewport:"],
];
const expectedCss = "const body = await response.body(), expected = staticFiles.get(url.pathname); assert(expected && sha(body) === expected.sha256, 'DIALOG1447_SETUP: actual served CSS equals completed dist');";
const oldCss = [
  "const body = await response.body(), expected = staticFiles.get(url.pathname);",
  "        const isCounterfactual = url.pathname === process.env.MATRIX_CSS_PATH;",
  "        if (isCounterfactual) {",
  "          assert.equal(process.env.MATRIX_ARM, 'old', 'MATRIX_CSS_ADAPTER_ARM');",
  "          assert(expected && expected.sha256 === process.env.MATRIX_GREEN_CSS_SHA256, 'MATRIX_CSS_ADAPTER_GREEN_INVENTORY');",
  "          (row.counterfactualCssResponses ||= []).push({ path: url.pathname, greenInventorySha256: expected.sha256, servedSha256: sha(body), oldSha256: '" + OLD_CSS_SHA + "' });",
  "        }",
  "        assert(expected && sha(body) === (isCounterfactual ? '" + OLD_CSS_SHA + "' : expected.sha256), 'DIALOG1447_SETUP: actual served CSS equals completed dist');",
].join('\n');

export function prepareCopies(root, out, drivers) {
  assert.equal(path.dirname(out), root, 'MATRIX_COPY_DEPTH');
  const qa = path.join(out, 'qa'), lib = path.join(out, 'lib');
  fs.mkdirSync(qa); fs.mkdirSync(lib);
  const loader = fs.readFileSync(path.join(root, 'scripts/lib/playwrightLoader.mjs'));
  fs.writeFileSync(path.join(lib, 'playwrightLoader.mjs'), loader);
  const copies = {}, derivations = [];
  for (const arm of ['green', 'old', 'restored']) {
    copies[arm] = {};
    for (const family of ['original', 'radix', 'academy']) {
      const input = drivers[family], original = fs.readFileSync(path.join(root, input.path), 'utf8');
      assert.equal(sha(original), input.sha256, 'MATRIX_PINNED_DRIVER');
      let changed = original;
      const replacements = arm === 'old' ? [...observer, [expectedCss, oldCss]] : observer;
      for (const [before, after] of replacements) { one(changed, before); changed = changed.replace(before, after); one(changed, after); }
      let inverse = changed;
      for (const [before, after] of [...replacements].reverse()) { one(inverse, after); inverse = inverse.replace(after, before); }
      assert.equal(inverse, original, 'MATRIX_DRIVER_WHOLE_INVERSE');
      assert.notEqual(sha(changed), sha(original));
      const destination = path.join(qa, family + '-' + arm + '.mjs');
      assert.equal(path.resolve(path.dirname(destination), '../..'), root, 'MATRIX_COPY_REAL_ROOT');
      fs.writeFileSync(destination, changed);
      copies[arm][family] = destination;
      derivations.push({ arm, family, original: input, copiedPath: destination, copiedSha256: sha(changed),
        literalChanges: replacements.map(([before, after]) => ({ before, after })),
        wholeInverseSha256: sha(inverse), wholeInverseExact: true, observationOnly: arm !== 'old',
        scope: 'New proof copy. Existing shared predicates and all source files held; only detailed CSS fields, plus old-arm exact app-CSS expectation.' });
    }
  }
  return { copies, derivations, loader: { file: path.join(lib, 'playwrightLoader.mjs'), sha256: sha(loader), wholeOriginalEqual: true } };
}
