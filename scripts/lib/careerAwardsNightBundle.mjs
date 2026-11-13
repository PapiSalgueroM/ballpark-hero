/**
 * Round 834: bundles one tree's Soccer Career engine and awards night cards
 * for scripts/lib/careerAwardsNightProbe.mjs.
 *
 * Shared by the recorder and the harness so both measure with exactly the same
 * procedure. The page's two ceremony cards are not exported, so the bundle
 * appends an export line to src/pages/SoccerCareer.tsx as it loads (the file on
 * disk is never written). `patches` are the harness's negative controls: each
 * replaces one exact string in one source file as it loads, and the build
 * refuses to run if the string is not there, so a control can never pass by
 * changing nothing.
 *
 * CJS on purpose: react-dom/server's node build requires node builtins, which
 * an ESM bundle cannot. nodePaths lets a worktree with no node_modules of its
 * own resolve them from the main checkout.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

/**
 * @param root the tree to bundle (its src is what gets measured)
 * @param opts.patches [{ file: 'src/lib/x.ts', from: 'exact text', to: 'replacement' }]
 * @param opts.extra { exportName: 'src/relative/path.ts' } more modules to expose
 */
export async function bundleAwardsNight(root, { patches = [], extra = {} } = {}) {
  const R = root.replaceAll('\\', '/');
  const require = createRequire(path.join(root, 'package.json'));
  const ts = require('typescript');
  let esbuild;
  try { esbuild = require('esbuild'); } catch { throw new Error(`esbuild not found in any node_modules above ${root}`); }
  const reactPkg = require.resolve('react/package.json');
  const MODULES = path.dirname(path.dirname(reactPkg));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `awardsnight-${process.pid}-`));
  const ENTRY = path.join(tmp, 'entry.tsx');
  const BUNDLE = path.join(tmp, 'bundle.cjs');
  const extraLines = Object.entries(extra)
    .map(([name, rel]) => `export * as ${name} from '${R}/${rel}';`).join('\n');
  fs.writeFileSync(ENTRY, `
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
export * as soccer from '${R}/src/lib/soccerCareerEngine.ts';
export * as appearance from '${R}/src/lib/soccerCareerAppearance.ts';
import * as page from '${R}/src/pages/SoccerCareer.tsx';
import * as intl from '${R}/src/components/soccer-career/InternationalPanel.tsx';
${extraLines}
const noop = () => undefined;
export const cards = {
  bdor: (bdor, career) => renderToStaticMarkup(React.createElement(page.__BdorCard, { bdor: { ...bdor, revealed: true }, career, onDismiss: noop, onSpeech: noop })),
  bdorPending: (bdor, career) => renderToStaticMarkup(React.createElement(page.__BdorCard, { bdor, career, onDismiss: noop, onSpeech: noop })),
  worldCup: (wc, career) => renderToStaticMarkup(React.createElement(page.__WcCard, { wc, career, onDismiss: noop, onSpeech: noop })),
  tournament: t => renderToStaticMarkup(React.createElement(intl.TournamentCard, { t, onDismiss: noop, onSpeech: noop })),
};
`);
  const norm = p => p.replaceAll('\\', '/').toLowerCase();
  const byFile = new Map();
  for (const p of patches) {
    const key = norm(path.join(root, p.file));
    if (!byFile.has(key)) byFile.set(key, []);
    byFile.get(key).push(p);
  }
  const pageKey = norm(path.join(root, 'src/pages/SoccerCareer.tsx'));
  const applied = new Set();
  const loadPlugin = {
    name: 'awards-night-load',
    setup(b) {
      b.onLoad({ filter: /\.(ts|tsx)$/ }, async args => {
        const key = norm(args.path);
        const mine = byFile.get(key);
        if (!mine && key !== pageKey) return undefined;
        let src = await fs.promises.readFile(args.path, 'utf8');
        for (const p of mine ?? []) {
          /* A Windows checkout may carry CRLF; the patches are written with LF. */
          const eol = !src.includes(p.from) && src.includes(p.from.replaceAll('\n', '\r\n')) ? '\r\n' : '\n';
          const from = p.from.replaceAll('\n', eol), to = p.to.replaceAll('\n', eol);
          if (!src.includes(from)) throw new Error(`control refused: ${p.file} does not contain ${JSON.stringify(p.from.slice(0, 80))}`);
          src = src.replace(from, to);
          if (src.includes(from) && from !== to && !to.includes(from)) throw new Error(`control refused: ${p.file} contains ${JSON.stringify(p.from.slice(0, 80))} more than once`);
          applied.add(p);
        }
        if (key === pageKey) {
          // SSR needs the actual card, not React.lazy's unresolved wrapper.
          // Resolve only this real page binding inside the in-memory QA bundle.
          const syntax = ts.createSourceFile(args.path, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
          const statement = syntax.statements.find(node => ts.isVariableStatement(node)
            && node.declarationList.declarations.some(decl => ts.isIdentifier(decl.name) && decl.name.text === 'WorldCupResultCard'));
          if (statement) {
            const reactLazy = syntax.statements.some(node => ts.isImportDeclaration(node)
              && ts.isStringLiteral(node.moduleSpecifier) && node.moduleSpecifier.text === 'react'
              && !node.importClause?.isTypeOnly && node.importClause?.namedBindings
              && ts.isNamedImports(node.importClause.namedBindings)
              && node.importClause.namedBindings.elements.some(binding => !binding.isTypeOnly
                && binding.name.text === 'lazy' && !binding.propertyName));
            const declarations = statement.declarationList.declarations;
            const lazy = declarations[0].initializer;
            const arrow = lazy && ts.isCallExpression(lazy) ? lazy.arguments[0] : undefined;
            const load = arrow && ts.isArrowFunction(arrow) ? arrow.body : undefined;
            if (!reactLazy || declarations.length !== 1 || !lazy || !ts.isCallExpression(lazy)
              || !ts.isIdentifier(lazy.expression) || lazy.expression.text !== 'lazy' || lazy.arguments.length !== 1
              || !load || !ts.isCallExpression(load) || load.expression.kind !== ts.SyntaxKind.ImportKeyword
              || load.arguments.length !== 1 || !ts.isStringLiteral(load.arguments[0])) {
              throw new Error('Awards QA cannot resolve the actual WorldCupResultCard binding');
            }
            src = src.slice(0, statement.getStart(syntax))
              + `import WorldCupResultCard from ${JSON.stringify(load.arguments[0].text)};`
              + src.slice(statement.end);
          } else if (!syntax.statements.some(node => ts.isFunctionDeclaration(node)
            && node.name?.text === 'WorldCupResultCard' && node.body)) {
            throw new Error('Awards QA cannot find the actual WorldCupResultCard function');
          }
          src += '\nexport { BallonDorCeremonyCard as __BdorCard, WorldCupResultCard as __WcCard };\n';
        }
        return { contents: src, loader: args.path.endsWith('.tsx') ? 'tsx' : 'ts' };
      });
    },
  };
  try {
    await esbuild.build({
      entryPoints: [ENTRY], bundle: true, format: 'cjs', platform: 'node', jsx: 'automatic',
      alias: { '@': `${R}/src` }, nodePaths: [MODULES], absWorkingDir: root,
      define: { 'import.meta.env': '{"DEV":false,"PROD":true,"MODE":"production"}' },
      loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty' },
      outfile: BUNDLE, logLevel: 'error', plugins: [loadPlugin],
    });
    for (const p of patches) {
      if (!applied.has(p)) throw new Error(`control refused: ${p.file} was never loaded into the bundle`);
    }
    globalThis.localStorage = globalThis.localStorage ?? { getItem: () => null, setItem: () => {}, removeItem: () => {} };
    const mod = require(BUNDLE);
    /* react-dom on a server warns about layout effects on every render; it
       says nothing about the markup, so it is kept out of the output. */
    const quiet = fn => (...a) => {
      const err = console.error;
      console.error = (...m) => { if (!String(m[0]).includes('useLayoutEffect does nothing on the server')) err(...m); };
      try { return fn(...a); } finally { console.error = err; }
    };
    const cards = { bdor: quiet(mod.cards.bdor), bdorPending: quiet(mod.cards.bdorPending), worldCup: quiet(mod.cards.worldCup), tournament: quiet(mod.cards.tournament) };
    return { ...mod, cards };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
