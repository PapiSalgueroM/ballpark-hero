/* Round 1568 probe (never committed): a copy of playDraftDetectiveReports that prints the first screen's boxes
   at /stat-detective before the Deep Cuts check. Writes scripts/_probeDD.mjs (same folder, so its imports hold). */
import fs from 'node:fs';
const src = fs.readFileSync('scripts/playDraftDetectiveReports.mjs', 'utf8').split('\r\n').join('\n');
const anchor = "    await page.getByRole('button', { name: /^Stars/ }).waitFor({ timeout: 30000 });\n";
if (src.split(anchor).length !== 2) { console.error('patchDD: anchor not found exactly once'); process.exit(3); }
const dump = `    console.log('PROBE ' + tag + ' ' + JSON.stringify(await page.evaluate(() => {
      const r = el => { if (!el) return null; const b = el.getBoundingClientRect(); return [Math.round(b.top), Math.round(b.bottom)]; };
      const main = document.querySelector('main');
      const out = { bar: r(document.querySelector('[data-site-chrome]')), header: r(document.querySelector('body > div header, #root header')), main: r(main), win: innerHeight };
      const walk = (el, depth) => { for (const c of el.children) { const cs = getComputedStyle(c); const b = c.getBoundingClientRect(); if (b.height < 1) continue; const label = c.tagName.toLowerCase() + (c.className && typeof c.className === 'string' ? '.' + c.className.split(' ').slice(0, 3).join('.') : '') + (c.textContent ? ' "' + c.textContent.trim().slice(0, 24) + '"' : ''); out['d' + depth + ':' + label] = [Math.round(b.top), Math.round(b.bottom), cs.marginTop + '/' + cs.marginBottom + ' p' + cs.paddingTop + '/' + cs.paddingBottom]; if (depth < 3) walk(c, depth + 1); } };
      if (main) walk(main, 0);
      const stars = [...document.querySelectorAll('button')].find(b => /^Stars/.test(b.textContent.trim()));
      const deep = [...document.querySelectorAll('button')].find(b => /^Deep Cuts/.test(b.textContent.trim()));
      out.stars = r(stars); out.deep = r(deep);
      const kids = document.getElementById('root') ? [...document.getElementById('root').children].map(c => c.tagName.toLowerCase() + '.' + String(c.className).split(' ')[0] + ':' + r(c)) : [];
      out.rootKids = kids.slice(0, 8);
      return out;
    })));\n`;
fs.writeFileSync('scripts/_probeDD.mjs', src.replace(anchor, anchor + dump));
console.log('patchDD: wrote scripts/_probeDD.mjs');
