/* Round 601: exercise the rendered component in Chromium, including instant
   dismissal, stable layout, unchanged facts, motion and the settled frame.
   Controls: VICTORY_CONTROL=motion, frozen, promotion, loading, late, flash
   or packstyle must fail their specific check after a confirmed mutation.
   Bundles stay in memory. This harness never writes shared dependency caches. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import ts from 'typescript';
import postcss from 'postcss';
import tailwind from 'tailwindcss';
import { chromium } from './lib/playwrightLoader.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const component = path.join(root, 'src/components/game/VictoryMoment.tsx');
const control = process.env.VICTORY_CONTROL || '';
assert(['', 'motion', 'frozen', 'promotion', 'loading', 'late', 'flash', 'packstyle'].includes(control), 'Unknown control');
// Read actual JSX ancestors, not comments describing when a trophy is awarded.
for (const [file, condition] of [
  ['src/pages/SoccerCareer.tsx', 'trophies.length > 0'],
  ['src/components/club-manager/MatchReportCard.tsx', 'r.trophyWon'],
  ['src/pages/StadiumTycoon.tsx', 'g.promotion'],
]) {
  const tree = ts.createSourceFile(file, fs.readFileSync(path.join(root, file), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found = [];
  const visit = node => {
    if (ts.isJsxOpeningElement(node) && node.tagName.getText(tree) === 'VictoryMoment') {
      let ancestor = node.parent;
      let gated = false;
      while (ancestor) {
        if (ts.isBinaryExpression(ancestor) && ancestor.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken && ancestor.left.getText(tree) === condition) gated = true;
        ancestor = ancestor.parent;
      }
      found.push(gated);
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);
  assert.deepEqual(found, [true], `${file}: trophy remains behind its existing awarded-state condition`);
}
let source = fs.readFileSync(component, 'utf8');
if (control === 'motion' || control === 'frozen') {
  const before = source;
  source = control === 'motion'
    ? source.replace('prefers-reduced-motion: reduce', 'prefers-reduced-motion: no-such-preference')
    : source.replace('animation: victory-lift 900ms', 'animation: victory-lift 0ms');
  assert.notEqual(source, before, 'Control must change the source');
  console.log(`CONTROL ${control}: changed actual trophy animation rule`);
}
const bundle = await build({
  stdin: {
    contents: `import React from 'react'; import {createRoot} from 'react-dom/client';
      import VictoryMoment from './src/components/game/VictoryMoment';
      const root = createRoot(document.getElementById('root'));
      window.clicks = 0;
      window.draw = (key = 'season-1') => root.render(React.createElement('section', null,
        React.createElement(VictoryMoment, {key}, 'League and Cup won. 27 goals.'),
        React.createElement('button', {onClick: () => window.clicks++}, 'Continue')));
      window.showcase = () => root.render(React.createElement('main', null,
        React.createElement('h1', null, 'The trophy moment'),
        ...[
          ['My Career', 'League and Cup won', 'A season to remember.'],
          ['Club Manager', 'Domestic Cup WON!', 'Full time. The trophy is yours.'],
          ['Stadium Tycoon', 'County League', '+$2.5K promotion bonus, every payout scaled up from here'],
        ].map(([mode, label, detail]) => React.createElement('section', {key: mode},
          React.createElement('h2', null, mode),
          React.createElement(VictoryMoment, null, label),
          React.createElement('p', null, detail),
          React.createElement('button', {onClick: () => window.showcase()}, 'Continue')))));
      window.draw();`,
    resolveDir: root, loader: 'jsx',
  },
  bundle: true, write: false, format: 'iife', platform: 'browser', jsx: 'automatic',
  plugins: [{ name: 'component-under-test', setup(b) {
    b.onLoad({ filter: /VictoryMoment\.tsx$/ }, () => ({ contents: source, loader: 'tsx', resolveDir: path.dirname(component) }));
  } }],
});
const browser = await chromium.launch({ args: ['--no-sandbox'] });
try {
  if (!control || ['late', 'flash', 'packstyle'].includes(control)) {
    const academyPath = path.join(root, 'src/components/tycoon/AcademyPanel.tsx');
    let academy = fs.readFileSync(academyPath, 'utf8');
    const importAnchor = "import('@/components/club-manager/Celebration')";
    assert.equal(academy.split(importAnchor).length, 2, 'One actual optional academy decoration import');
    academy = academy.replace(importAnchor, "new Promise(resolve => { window.releaseConfetti = () => import('@/components/club-manager/Celebration').then(resolve); })");
    const stylesAnchor = "import('@/components/club-manager/CelebrationStyles')";
    assert.equal(academy.split(stylesAnchor).length, 2, 'One actual optional notice style import');
    academy = academy.replace(stylesAnchor, "new Promise(resolve => { window.releaseStyles = () => import('@/components/club-manager/CelebrationStyles').then(resolve); })");
    if (control === 'late') {
      const before = 'window.setTimeout(() => setMoved(null), 4000)';
      assert.equal(academy.split(before).length, 2, 'One actual promotion lifetime');
      academy = academy.replace(before, 'window.setTimeout(() => setMoved(null), 8000)');
      console.log('CONTROL late: extended actual parent promotion lifetime');
    }
    if (control === 'flash') {
      const anchor = 'animate: stylesReady || decorationReady';
      assert.equal(academy.split(anchor).length, 3, 'Two actual captured notice animation flags');
      academy = academy.replaceAll(anchor, 'animate: true');
      console.log('CONTROL flash: enabled notice classes before their styles arrive');
    }
    const packsPath = path.join(root, 'src/components/tycoon/PacksPanel.tsx');
    let packs = fs.readFileSync(packsPath, 'utf8');
    if (control === 'packstyle') {
      const anchor = '<CelebrationStyles />';
      assert.equal(packs.split(anchor).length, 2, 'One actual pack-owned style mount');
      packs = packs.replace(anchor, '');
      console.log('CONTROL packstyle: removed actual pack-owned style mount');
    }
    const heldAcademy = await build({
      stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import {MemoryRouter} from 'react-router-dom';
        import AcademyPanel from './src/components/tycoon/AcademyPanel';
        import {CelebrationStyles} from './src/components/club-manager/CelebrationStyles';
        import {newFactory, REGIONS, SAVE_KEY, serialize} from './src/lib/wonderkidFactory';
        const state = newFactory(Date.now(), 588); state.lifetime = REGIONS[0].goal;
        localStorage.setItem(SAVE_KEY, serialize(state));
        window.academySaved = () => JSON.parse(localStorage.getItem(SAVE_KEY));
        window.nextTarget = () => { window.academyState.lifetime = REGIONS[window.academyState.rep].goal; };
        createRoot(document.getElementById('root')).render(<MemoryRouter>{window.globalStyles && <CelebrationStyles />}<AcademyPanel stylesReady={window.globalStyles} onSnapshot={state => { window.academyState = state; }} /></MemoryRouter>);`, resolveDir: root, loader: 'tsx' },
      bundle: true, write: false, format: 'iife', platform: 'browser', jsx: 'automatic', alias: { '@': path.join(root, 'src') },
      plugins: [{ name: 'hold-actual-academy-confetti', setup(b) { b.onLoad({ filter: /AcademyPanel\.tsx$/ }, () => ({ contents: academy, loader: 'tsx', resolveDir: path.dirname(academyPath) })); b.onLoad({ filter: /PacksPanel\.tsx$/ }, () => ({ contents: packs, loader: 'tsx', resolveDir: path.dirname(packsPath) })); } }],
    });
    if (!control || control === 'packstyle') for (const motion of ['no-preference', 'reduce']) {
      const page = await browser.newPage({ viewport: { width: 320, height: 700 }, reducedMotion: motion });
      await page.route('**/*', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<div id="root"></div>' }));
      await page.goto('http://127.0.0.1:4173/cold-pack-fixture');
      await page.addScriptTag({ content: heldAcademy.outputFiles[0].text });
      await page.getByRole('button', { name: /Packs/ }).click();
      await page.getByRole('button', { name: 'Open free', exact: true }).click();
      await page.locator('[data-pack-reveal]').waitFor();
      const reveal = await page.locator('[data-pack-reveal]').evaluate(node => ({ animation: getComputedStyle(node).animationName, opacity: getComputedStyle(node).opacity }));
      assert.equal(reveal.animation, motion === 'reduce' ? 'none' : 'cmRise', 'First standalone pack owns its rise styles before reveal');
      if (motion === 'reduce') assert.equal(reveal.opacity, '1', 'Reduced-motion pack starts visible');
      assert.equal(await page.evaluate(() => typeof window.releaseStyles), 'undefined', 'First pack does not depend on a notice style request');
      await page.getByRole('button', { name: 'Welcome him in', exact: true }).click();
      assert.equal(await page.locator('[data-pack-reveal]').count(), 0, 'Real pack dismissal still clears the card');
      await page.close();
      console.log(`PASS cold standalone pack: ${motion}, actual free draw and dismissal`);
    }
    if (control !== 'packstyle') for (const motion of ['no-preference', 'reduce']) for (const [mode, globalStyles] of [['dismiss', false], ['expire', false], ['resolve', false], ['resolve', true]]) {
      const page = await browser.newPage({ viewport: { width: 320, height: 700 }, reducedMotion: motion });
      await page.route('**/*', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<div id="root"></div>' }));
      await page.goto('http://127.0.0.1:4173/late-art-fixture');
      await page.evaluate(value => { window.globalStyles = value; }, globalStyles);
      await page.addScriptTag({ content: heldAcademy.outputFiles[0].text });
      await page.locator('[data-academy-panel]').waitFor();
      assert.equal(await page.evaluate(() => typeof window.releaseConfetti), 'undefined', 'Decoration import stays cold before a real academy move');
      await page.getByRole('button', { name: /Reputation/ }).click();
      await page.getByRole('button', { name: /Move up to/ }).click();
      await page.getByText(/Welcome to/).waitFor();
      assert.equal(await page.evaluate(() => window.academySaved().rep), 1, 'Real academy move saves its reward before decoration loads');
      await page.waitForFunction(() => typeof window.releaseConfetti === 'function');
      assert.equal(await page.locator('.cm-confetti').count(), 0, 'Confetti import is actually pending');
      await page.waitForFunction(() => typeof window.releaseStyles === 'function');
      const visibleCopy = () => page.getByText(/Welcome to/).evaluate(node => ({ opacity: getComputedStyle(node).opacity, animation: getComputedStyle(node).animationName }));
      if (!globalStyles) assert.deepEqual(await visibleCopy(), { opacity: '1', animation: 'none' }, 'Cold notice copy starts fully visible without waiting for CSS');
      if (mode === 'dismiss') await page.getByRole('button', { name: 'Continue', exact: true }).click();
      if (mode === 'expire') await page.waitForTimeout(4200);
      if (mode !== 'resolve') assert.equal(await page.getByText(/Welcome to/).count(), 0, 'Original parent dismissal or four-second lifetime wins over a held import');
      await page.evaluate(() => Promise.all([window.releaseConfetti(), window.releaseStyles()]));
      if (mode !== 'resolve') {
        assert.equal(await page.locator('.cm-confetti').count(), 0, 'Late confetti cannot revive an expired academy promotion');
        assert.equal(await page.getByText(/Welcome to/).count(), 0, 'Late styles cannot revive an expired academy promotion');
      } else {
        await page.waitForFunction(() => [...document.querySelectorAll('style')].some(node => node.textContent.includes('@keyframes cmRise')));
        if (!globalStyles) assert.deepEqual(await visibleCopy(), { opacity: '1', animation: 'none' }, 'Late CSS never hides or restarts an already visible cold notice');
        else assert.equal((await visibleCopy()).animation, motion === 'reduce' ? 'none' : 'cmSlam', 'Stadium Academy keeps its already available notice animation');
        await page.getByRole('button', { name: 'Continue', exact: true }).click();
        await page.evaluate(() => window.nextTarget());
        await page.getByRole('button', { name: /Move up to/ }).click();
        await page.getByText(/Welcome to/).waitFor();
        assert.equal((await visibleCopy()).animation, motion === 'reduce' ? 'none' : 'cmSlam', 'Warm notices retain normal motion and respect reduced motion');
        assert.equal(await page.evaluate(() => window.academySaved().rep), 2, 'Second real move pays exactly its own next star');
      }
      if (mode !== 'resolve') assert.equal(await page.evaluate(() => window.academySaved().rep), 1, 'Decoration never repeats the move reward');
      await page.close();
      console.log(`PASS delayed academy: ${motion}/${mode}/${globalStyles ? 'Stadium styles' : 'cold standalone'}, saved moves and notice lifetime intact`);
    }
  }
  if (!control || control === 'loading') {
    const wrapperPath = path.join(root, 'src/components/tycoon/TycoonVictoryMoment.tsx');
    let wrapper = fs.readFileSync(wrapperPath, 'utf8');
    const importAnchor = "import('@/components/game/VictoryMoment')";
    assert.equal(wrapper.split(importAnchor).length, 2, 'One real optional trophy import');
    wrapper = wrapper.replace(importAnchor, "new Promise(resolve => { window.releaseArt = () => import('@/components/game/VictoryMoment').then(resolve); })");
    if (control === 'loading') {
      const before = '<div className="min-w-0 break-words">{children}</div>';
      assert.equal(wrapper.split(before).length, 2, 'One real result-copy fallback');
      wrapper = wrapper.replace(before, '<div className="min-w-0 break-words" />');
      console.log('CONTROL loading: removed actual fallback result copy');
    }
    const lazyBundle = await build({
      stdin: { contents: `import React, {useState} from 'react'; import {createRoot} from 'react-dom/client';
        import VictoryMoment from './src/components/tycoon/TycoonVictoryMoment';
        function Fixture() { const [open, setOpen] = useState(true);
          return open ? <section><VictoryMoment compact><p>CHAMPIONS OF THE SUMMIT</p><p>Title bonus: 1,234,567</p></VictoryMoment><button onClick={() => setOpen(false)}>Continue</button></section> : <p data-dismissed>Ground ready</p>; }
        createRoot(document.getElementById('root')).render(<Fixture />);`, resolveDir: root, loader: 'tsx' },
      bundle: true, write: false, format: 'iife', platform: 'browser', jsx: 'automatic', alias: { '@': path.join(root, 'src') },
      plugins: [{ name: 'hold-actual-trophy-import', setup(b) { b.onLoad({ filter: /TycoonVictoryMoment\.tsx$/ }, () => ({ contents: wrapper, loader: 'tsx', resolveDir: path.dirname(wrapperPath) })); } }],
    });
    const builtCss = fs.readdirSync(path.join(root, 'dist/assets')).filter(name => /^index-.*\.css$/.test(name));
    assert.equal(builtCss.length, 1, 'One production index stylesheet for delayed-art geometry');
    const css = fs.readFileSync(path.join(root, 'dist/assets', builtCss[0]), 'utf8');
    for (const width of [320, 390]) for (const dismiss of [false, true]) {
      const page = await browser.newPage({ viewport: { width, height: 700 }, reducedMotion: 'reduce' });
      await page.route('**/*', route => route.abort());
      await page.setContent(`<style>${css}</style><style>section { padding: 12px; text-align: center; } button { min-height:44px; }</style><div id="root"></div>`);
      await page.addScriptTag({ content: lazyBundle.outputFiles[0].text });
      await page.getByRole('button', { name: 'Continue', exact: true }).waitFor();
      assert.equal(await page.getByText('CHAMPIONS OF THE SUMMIT', { exact: true }).count(), 1, 'Pending trophy keeps committed title visible exactly once');
      assert.equal(await page.getByText('Title bonus: 1,234,567', { exact: true }).count(), 1, 'Pending trophy keeps committed bonus visible exactly once');
      assert.equal(await page.locator('[data-victory-moment]').count(), 0, 'Trophy import is actually pending');
      const measure = () => page.evaluate(() => {
        const box = node => { const r = node.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; };
        return { card: box(document.querySelector('section')), button: box(document.querySelector('button')) };
      });
      const pending = await measure();
      if (dismiss) await page.getByRole('button', { name: 'Continue', exact: true }).click();
      await page.evaluate(() => window.releaseArt());
      if (dismiss) {
        await page.locator('[data-dismissed]').waitFor();
        assert.equal(await page.locator('[data-victory-moment]').count(), 0, 'Late trophy cannot revive a dismissed result');
      } else {
        await page.locator('[data-victory-moment]').waitFor();
        assert.deepEqual(await measure(), pending, 'Late trophy preserves card and Continue bounds');
        assert.equal(await page.getByText('CHAMPIONS OF THE SUMMIT', { exact: true }).count(), 1);
      }
      await page.close();
      console.log(`PASS delayed trophy: ${width}px, ${dismiss ? 'dismissed before import' : 'stationary resolved card'}, built CSS`);
    }
  }
  if (!control || control === 'promotion') {
    // Render the actual promotion JSX inside the actual fixed-height pitch.
    // Only the already-committed event is a fixture; markup and CSS are source.
    const stadiumSource = fs.readFileSync(path.join(root, 'src/pages/StadiumTycoon.tsx'), 'utf8');
    const stadiumTree = ts.createSourceFile('StadiumTycoon.tsx', stadiumSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let promotionMarkup, stadiumClass, pageClass;
    const classes = opening => opening.attributes.properties.find(a => ts.isJsxAttribute(a) && a.name.getText(stadiumTree) === 'className')?.initializer?.text;
    const extract = node => {
      if (ts.isJsxElement(node)) {
        const opening = node.openingElement;
        if (opening.attributes.properties.some(a => ts.isJsxAttribute(a) && a.name.getText(stadiumTree) === 'data-promotion-card')) promotionMarkup = node.getText(stadiumTree);
        if (opening.tagName.getText(stadiumTree) === 'TycoonPitch') stadiumClass = classes(node.parent.openingElement);
        if (classes(opening)?.includes('max-w-2xl mx-auto px-4')) pageClass = classes(opening);
      }
      ts.forEachChild(node, extract);
    };
    extract(stadiumTree);
    assert(promotionMarkup && stadiumClass && pageClass, 'Actual promotion and containing layout found');
    if (control === 'promotion') {
      const before = promotionMarkup;
      promotionMarkup = promotionMarkup.replace('VictoryMoment compact', 'VictoryMoment')
        .replace('bg-card px-3 py-2 text-center', 'bg-card px-4 py-3 text-center')
        .replace('text-base font-black leading-tight', 'text-lg font-black')
        .replace('className="mt-1 inline-flex', 'className="mt-2 inline-flex');
      assert.notEqual(promotionMarkup, before, 'Promotion control restores the oversized presentation');
      console.log('CONTROL promotion: restored actual oversized promotion card');
    }
    const configOutput = await build({ entryPoints: [path.join(root, 'tailwind.config.ts')], write: false, format: 'cjs', platform: 'node' });
    const configModule = { exports: {} };
    new Function('module', 'exports', 'require', configOutput.outputFiles[0].text)(configModule, configModule.exports, createRequire(import.meta.url));
    const css = await postcss([tailwind({ ...configModule.exports.default, content: [{ raw: stadiumSource + promotionMarkup + fs.readFileSync(path.join(root, 'src/components/tycoon/TycoonVictoryMoment.tsx'), 'utf8') + fs.readFileSync(path.join(root, 'src/components/tycoon/TycoonPitch.tsx'), 'utf8'), extension: 'tsx' }] })])
      .process(fs.readFileSync(path.join(root, 'src/index.css'), 'utf8'), { from: path.join(root, 'src/index.css') });
    const promotionBundle = await build({
      stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client';
        import TycoonPitch from './src/components/tycoon/TycoonPitch';
        import VictoryMoment from './src/components/tycoon/TycoonVictoryMoment';
        import {ConfettiBurst, CelebrationStyles} from './src/components/club-manager/Celebration';
        import {DIVISIONS, fmtMoney} from './src/lib/stadiumTycoon';
        const root = createRoot(document.getElementById('root'));
        window.dismissed = 0; window.taps = 0;
        window.promotion = (index, title = false) => {
          const d = DIVISIONS[index];
          const g = {promotion: {seq: index + (title ? 100 : 0), label: title ? d.emoji + ' CHAMPIONS OF ' + d.name.toUpperCase() : d.emoji + ' PROMOTED: ' + d.name, amount: 1234567890123}, dismissPromotion: () => window.dismissed++};
          root.render(<div className=${JSON.stringify(pageClass)}><CelebrationStyles />
            <div className=${JSON.stringify(stadiumClass)} onClick={() => window.taps++}>
              <TycoonPitch areaRef={{current:null}} goalsFor={3} goalsAgainst={1} minute={90} totalMatches={12} streak={0} opponent="Rival" replays={[]} onReplayEnd={() => {}} tapFx={null} tapRun={0}>
                ${promotionMarkup}
              </TycoonPitch>
            </div>
          </div>);
        }; window.promotion(1);`, resolveDir: root, loader: 'tsx' },
      bundle: true, write: false, format: 'iife', platform: 'browser', jsx: 'automatic', alias: { '@': path.join(root, 'src') },
    });
    for (const width of [320, 390]) for (const reducedMotion of ['no-preference', 'reduce']) {
      const page = await browser.newPage({ viewport: { width, height: 700 }, reducedMotion });
      await page.setContent(`<style>${css.css}</style><div id="root"></div>`);
      await page.addScriptTag({ content: promotionBundle.outputFiles[0].text });
      for (const [index, title] of [[1, false], [9, false], [9, true]]) {
        await page.evaluate(([index, title]) => window.promotion(index, title), [index, title]);
        await page.getByRole('button', { name: 'Continue', exact: true }).waitFor();
        await page.locator('[data-victory-moment]').waitFor();
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const measure = time => page.evaluate(time => {
          for (const animation of document.getAnimations()) { animation.pause(); animation.currentTime = time; }
          const overlay = document.querySelector('[data-promotion-card]');
          const card = overlay.querySelector(':scope > div:last-child');
          const button = overlay.querySelector('button');
          const rect = e => { const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height }; };
          return { pitch: rect(overlay.parentElement), card: rect(card), button: rect(button), label: overlay.querySelector('p').textContent };
        }, time);
        const first = await measure(0), last = await measure(1600);
        assert.equal(last.pitch.height, 176, 'Actual mobile pitch stays h-44');
        assert(last.card.top >= last.pitch.top && last.card.bottom <= last.pitch.bottom, `${width}/${reducedMotion}/${last.label}: entire promotion card fits pitch (${JSON.stringify(last)})`);
        assert(last.card.left >= last.pitch.left && last.card.right <= last.pitch.right, 'Card fits pitch width');
        assert.deepEqual(first.card, last.card, 'Promotion frame stays stationary');
        assert.deepEqual(first.button, last.button, 'Continue stays stationary through reveal');
        const before = await page.evaluate(() => window.dismissed);
        await page.mouse.click((last.button.left + last.button.right) / 2, (last.button.top + last.button.bottom) / 2);
        assert.equal(await page.evaluate(() => window.dismissed), before + 1, 'Visible button dismisses at its measured coordinates');
        assert.equal(await page.evaluate(() => window.taps), 0, 'Promotion click never taps the ground');
      }
      if (process.env.VICTORY_ARTIFACT_DIR) await page.screenshot({ path: path.join(process.env.VICTORY_ARTIFACT_DIR, `promotion-${width}-${reducedMotion}.png`), fullPage: true });
      await page.close();
      console.log(`PASS actual promotion: ${width}px/${reducedMotion}, Gravel Lane and both Summit outcomes`);
    }
  }
  for (const reducedMotion of ['no-preference', 'reduce']) {
    const page = await browser.newPage({ viewport: { width: 320, height: 700 }, reducedMotion });
    await page.setContent(`<style>body { margin: 16px; background: #13191d; color: #fbbf24; font: bold 15px Arial; } section { border: 1px solid; border-radius: 12px; padding: 12px; } button { min-height: 36px; margin-top: 8px; }</style><div id="root"></div>`);
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    await page.locator('[data-victory-moment]').waitFor();
    const sample = async time => page.evaluate(time => {
      for (const a of document.getAnimations()) { a.pause(); a.currentTime = time; }
      const art = document.querySelector('.victory-cup');
      const box = document.querySelector('section').getBoundingClientRect();
      const copy = document.querySelector('.victory-copy');
      return {
        transform: getComputedStyle(art).transform,
        text: copy.textContent, opacity: getComputedStyle(copy).opacity,
        box: [box.x, box.y, box.width, box.height],
        overflow: document.documentElement.scrollWidth > innerWidth,
        animations: document.getAnimations().length,
      };
    }, time);
    const first = await sample(0);
    await page.getByRole('button', { name: 'Continue' }).click();
    assert.equal(await page.evaluate(() => window.clicks), 1, 'Continue works during the first frame');
    const middle = await sample(450);
    const last = await sample(1200);
    for (const frame of [first, middle, last]) {
      assert.equal(frame.text, 'League and Cup won. 27 goals.', 'Facts never change');
      assert.equal(frame.opacity, '1', 'Award text is visible immediately');
      assert.deepEqual(frame.box, first.box, 'Motion cannot move surrounding layout');
      assert.equal(frame.overflow, false, 'Fits at 320 pixels');
    }
    if (reducedMotion === 'reduce') {
      assert.equal(first.animations, 0, 'Reduced motion has no running animations');
      assert.equal(first.transform, 'none', 'Reduced motion starts settled');
    } else {
      assert.notEqual(first.transform, middle.transform, 'Cup visibly lifts');
      assert.notEqual(middle.transform, last.transform, 'Cup settles after the lift');
      // Ordinary rerenders must keep the same running animation instance.
      assert(await page.evaluate(async () => {
        const cup = document.querySelector('.victory-cup');
        window.draw();
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return cup === document.querySelector('.victory-cup');
      }), 'Ordinary rerender preserves the trophy');
      assert(await page.evaluate(async () => {
        const cup = document.querySelector('.victory-cup');
        window.draw('season-2');
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return cup !== document.querySelector('.victory-cup');
      }), 'A newly awarded result gets its own trophy lift');
    }
    assert.equal(await page.locator('svg[aria-hidden="true"][focusable="false"]').count(), 1, 'Art stays out of the accessibility tree');
    await page.close();
    console.log(`PASS ${reducedMotion}: motion, final facts, first-frame Continue and 320px layout`);
  }
  if (process.env.VICTORY_ARTIFACT_DIR && !control) {
    const output = path.resolve(process.env.VICTORY_ARTIFACT_DIR);
    assert(!output.startsWith(root), 'Review artifacts must stay outside the worktree');
    fs.mkdirSync(output, { recursive: true });
    const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Trophy motion preview</title><style>
      * { box-sizing: border-box; } body { margin: 0; padding: 16px; color: #e9edf0; background: #10161b; font: 15px Arial,sans-serif; } main { max-width: 420px; margin: auto; } h1 { font-size: 22px; margin: 4px 0 20px; } h2 { font-size: 13px; color: #adb8c0; margin: 0 0 8px; } section { border: 1px solid #8b7037; border-radius: 14px; padding: 14px; margin-bottom: 14px; background: #1c252b; } .victory-moment { color: #fbbf24; font-weight: bold; font-size: 17px; } p { font-size: 12px; line-height: 1.5; color: #b9c3ca; text-align: center; } button { display: block; min-height: 36px; margin: 8px auto 0; border: 0; padding: 8px 24px; border-radius: 20px; background: #48b67b; color: #0b1611; font-weight: bold; }
    </style></head><body><div id="root"></div><script>${bundle.outputFiles[0].text.replaceAll('</script', '<\\/script')}\nwindow.showcase();</script></body></html>`;
    fs.writeFileSync(path.join(output, 'trophy-preview.html'), html);
    for (const [width, reduce] of [[320, false], [390, false], [390, true]]) {
      const context = await browser.newContext({ viewport: { width, height: 820 }, reducedMotion: reduce ? 'reduce' : 'no-preference', ...(width === 390 && !reduce ? { recordVideo: { dir: output, size: { width, height: 820 } } } : {}) });
      const page = await context.newPage();
      await page.setContent(html);
      await page.locator('h1').waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Showcase fits');
      await page.waitForTimeout(1400);
      await page.screenshot({ path: path.join(output, `trophies-${width}${reduce ? '-reduced' : ''}.png`), fullPage: true });
      const video = page.video();
      await context.close();
      if (video) await video.saveAs(path.join(output, 'trophy-lift.webm'));
    }
    console.log(`Review artifacts: ${output}`);
  }
} finally { await browser.close(); }
