import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(file, 'utf8');
const badgeScript = html => html.match(/<script>\s*\/\/ Owner 2026-08-05: no third-party editor badge[\s\S]*?<\/script>/)?.[0];
const template = badgeScript(read(path.join(root, 'index.html')));
assert(template, 'The template carries the editor badge watcher');
const normalize = script => script.split(/\r?\n/).map(line => line.trim()).join('\n');

function indexFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return indexFiles(file);
    return entry.name === 'index.html' ? [file] : [];
  });
}
let checked = 0;
for (const file of indexFiles(path.join(root, 'public'))) {
  const html = read(file);
  const script = badgeScript(html);
  if (!html.includes('id="dukb-snapshot"') && !script) continue;
  assert(script && normalize(script) === normalize(template), path.relative(root, file) + ' carries the template watcher');
  checked++;
}
assert(checked > 0);

const selector = '[id*="lovable" i], [class*="lovable" i], a[href*="lovable.dev"], a[href*="gptengineer"], [id*="gpt-engineer" i]';
const turn = () => new Promise(resolve => setImmediate(resolve));
const dom = new JSDOM('<!doctype html><main><p></p></main><aside id="lovable-badge"></aside>', { runScripts: 'outside-only' });
const { window } = dom;
const { document } = window;
const board = document.querySelector('main');
const ticker = board.querySelector('p');
const feed = document.createElement('section');
const fragment = document.createDocumentFragment();
for (let i = 0; i < 1500; i++) fragment.appendChild(document.createElement('span'));
board.append(fragment, feed);
const scans = { whole: 0, subtree: 0, single: 0 };
for (const [target, method, count] of [
  [window.Document.prototype, 'querySelectorAll', 'whole'],
  [window.Element.prototype, 'querySelectorAll', 'subtree'],
  [window.Element.prototype, 'matches', 'single'],
]) {
  const original = target[method];
  target[method] = function (query, ...rest) {
    if (query === selector) scans[count]++;
    return original.call(this, query, ...rest);
  };
}
const measure = async action => {
  const before = { ...scans };
  await action();
  return { whole: scans.whole - before.whole, subtree: scans.subtree - before.subtree, single: scans.single - before.single };
};
const none = { whole: 0, subtree: 0, single: 0 };

try {
  const boot = await measure(async () => {
    window.eval(template.replace(/^<script>|<\/script>$/g, ''));
    await turn();
  });
  assert.equal(document.getElementById('lovable-badge'), null, 'A parser-inserted editor badge is removed');

  const rows = await measure(async () => {
    for (let i = 0; i < 120; i++) {
      const event = document.createElement('div');
      const label = document.createElement('strong');
      label.textContent = 'Minute ' + i;
      event.appendChild(label);
      feed.replaceChildren(event);
      await turn();
    }
  });
  const queue = Array.from({ length: 60 }, () => document.createElement('b'));
  board.append(...queue);
  await turn();
  const removed = await measure(async () => {
    for (const element of queue) { element.remove(); await turn(); }
  });

  const scalar = document.createTextNode('');
  ticker.appendChild(scalar);
  await turn();
  const styles = await measure(async () => {
    for (let i = 0; i < 120; i++) {
      ticker.style.transform = 'translateX(' + i + 'px)';
      scalar.nodeValue = String(i);
      await turn();
    }
  });
  const translated = await measure(async () => {
    for (let i = 0; i < 20; i++) { ticker.textContent = 'Minute traduite ' + i; await turn(); }
  });
  const classes = await measure(async () => {
    for (let i = 0; i < 120; i++) { ticker.className = 'game-tick-' + i % 2; await turn(); }
  });

  const inserted = document.createElement('aside');
  inserted.id = 'GPT-Engineer-tools';
  const wrapper = document.createElement('div');
  wrapper.innerHTML = '<div><a href="https://lovable.dev/edit">Badge</a></div>'
    + '<a href="/gptengineer-help">Own guide</a><svg id="lovable-icon"></svg>'
    + '<div class="gpt-engineer-ordinary">Ordinary game content</div>';
  board.append(inserted, wrapper);
  await turn();
  assert(!inserted.isConnected, 'An added badge root is removed');
  assert(!wrapper.querySelector('a[href*="lovable.dev"]'), 'A nested editor badge is removed');
  assert(wrapper.querySelector('a[href="/gptengineer-help"]'), 'An ordinary link remains');
  assert(wrapper.querySelector('svg'), 'Non-HTML elements remain');
  assert(wrapper.querySelector('.gpt-engineer-ordinary'), 'An ordinary class remains');

  const detached = document.createElement('div');
  detached.innerHTML = '<a href="https://lovable.dev/edit">Detached</a>';
  const detachedScans = await measure(async () => { board.append(detached); detached.remove(); await turn(); });
  assert(detached.querySelector('a'), 'An already detached subtree is left alone');

  const late = [document.createElement('aside'), document.createElement('div'), document.createElement('a')];
  board.append(...late);
  await turn();
  const lateScans = await measure(async () => {
    late[0].id = 'gpt-engineer-late';
    late[1].className = 'Lovable-late';
    late[2].setAttribute('href', 'https://gptengineer.app/editor');
    await turn();
  });

  console.log(JSON.stringify({ snapshots: checked, boot, rows, removed, styles, translated, classes, detachedScans, lateScans }));
  assert.equal(rows.whole, 0, 'Replacing 120 live rows never scans the full document');
  assert.equal(boot.whole, 2, 'DOMContentLoaded and load keep their document sweeps');
  assert.deepEqual(rows, { whole: 0, subtree: 120, single: 120 });
  for (const count of [removed, styles, translated, detachedScans]) assert.deepEqual(count, none);
  assert.deepEqual(classes, { whole: 0, subtree: 0, single: 120 });
  assert.deepEqual(lateScans, { whole: 0, subtree: 0, single: 3 });
  assert(late.every(element => !element.isConnected), 'Late id, class and href markers are removed');
  console.log('simEditorBadge: targeted mutations, exact editor badge policy, and snapshot copies green.');
} finally {
  window.close();
}
