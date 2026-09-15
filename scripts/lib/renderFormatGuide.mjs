import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Render production guide markup. Only unrelated navbar and head chrome is stubbed.
// Overrides keep control copies outside src so concurrent source scans stay clean.
export async function renderFormatGuide(root, page, overrides = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-format-guide-'));
  const outfile = path.join(directory, 'render.cjs');
  const replacements = new Map(Object.entries(overrides).map(([file, contents]) => [path.resolve(file), contents]));
  await build({
    stdin: {
      contents: `import React from 'react'; import { renderToStaticMarkup } from 'react-dom/server'; import { MemoryRouter } from 'react-router-dom'; import Page from ${JSON.stringify(path.join(root, 'src/pages', page).replaceAll('\\', '/'))}; export const html = renderToStaticMarkup(<MemoryRouter><Page /></MemoryRouter>);`,
      loader: 'tsx', resolveDir: root,
    },
    bundle: true, platform: 'node', format: 'cjs', jsx: 'automatic', outfile,
    alias: { '@': path.join(root, 'src') },
    define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'silent',
    plugins: [{ name: 'guide-proof', setup(builder) {
      builder.onResolve({ filter: /^@\/components\/(game\/GameNavbar|seo\/PageSeo)$/ }, args => ({ path: args.path, namespace: 'guide-chrome' }));
      builder.onLoad({ filter: /.*/, namespace: 'guide-chrome' }, () => ({ contents: 'export const GameNavbar = () => null; export default () => null;', loader: 'js' }));
      builder.onLoad({ filter: /\.[tj]sx?$/ }, args => {
        const contents = replacements.get(path.resolve(args.path));
        return contents === undefined ? undefined : { contents, loader: args.path.endsWith('tsx') ? 'tsx' : 'ts', resolveDir: path.dirname(args.path) };
      });
    } }],
  });
  const { html } = (await import(pathToFileURL(outfile).href)).default;
  return parseFormatGuide(html);
}

export function parseFormatGuide(html) {
  return new JSDOM(html).window.document;
}

export function guideText(node) {
  return node?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

export function tableCell(document, season, column) {
  // The prerenderer flattens each table cell to an adjacent paragraph.
  if (!document.querySelector('table')) {
    const labels = [...document.querySelectorAll('#dukb-snapshot p')].filter(node => guideText(node) === season);
    if (labels.length !== 1) throw new Error(`Expected one saved table row for ${season}, found ${labels.length}`);
    let cell = labels[0];
    for (let index = 0; index < column; index += 1) {
      cell = cell.nextElementSibling;
      if (cell?.tagName !== 'P') throw new Error(`Missing saved table cell ${column} for ${season}`);
    }
    return guideText(cell);
  }
  const rows = [...document.querySelectorAll('table tbody tr')].filter(row => guideText(row.querySelector('td')) === season);
  if (rows.length !== 1) throw new Error(`Expected one table row for ${season}, found ${rows.length}`);
  const cell = rows[0].querySelectorAll('td')[column];
  if (!cell) throw new Error(`Missing table cell ${column} for ${season}`);
  return guideText(cell);
}

export function periodNotes(document, id, heading) {
  const list = document.querySelector(`article#${id} ul`);
  if (list) return guideText(list);
  const headings = [...document.querySelectorAll('#dukb-snapshot h3')].filter(node => guideText(node) === heading);
  if (headings.length !== 1) throw new Error(`Expected one saved period heading for ${id}`);
  const notes = [];
  for (let node = headings[0].nextElementSibling; node && !/^H[23]$/.test(node.tagName); node = node.nextElementSibling) {
    if (node.tagName === 'LI') notes.push(guideText(node));
  }
  return notes.join(' ');
}

export function replaceGuideClaim(file, from, to) {
  const source = fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const count = source.split(from).length - 1;
  if (count !== 1 || from === to) throw new Error(`Guide control needs one effective anchor in ${file}, found ${count}`);
  console.log(`CONTROL MUTATION APPLIED: ${path.basename(file)}`);
  return source.replace(from, to);
}
