/**
 * Round 1558: read pages of the Sports Reference sites (baseball-reference.com,
 * pro-football-reference.com, hockey-reference.com) for the US Connections
 * ledgers, cached in a scratch folder and paced (one page every five seconds;
 * the sites refuse a reader that goes faster). Never used by a harness: the
 * harness reads only what the ledgers recorded.
 */
import fs from 'node:fs';
import path from 'node:path';

const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) DoUKnowBall data check' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
let lastAt = 0;

/** GET a page once (cached as <dir>/<key>.html with the final url in <key>.url). Returns { html, url } or null. */
export async function page(dir, key, url) {
  fs.mkdirSync(dir, { recursive: true });
  const f = path.join(dir, key + '.html');
  const fu = path.join(dir, key + '.url');
  if (fs.existsSync(f)) return { html: fs.readFileSync(f, 'utf8'), url: fs.existsSync(fu) ? fs.readFileSync(fu, 'utf8') : url };
  const wait = lastAt + 5000 - Date.now();
  if (wait > 0) await sleep(wait);
  lastAt = Date.now();
  try {
    const r = await fetch(url, { headers: UA, redirect: 'follow' });
    if (r.status !== 200) { console.log('  status', r.status, url); return null; }
    const html = await r.text();
    fs.writeFileSync(f, html);
    fs.writeFileSync(fu, r.url);
    return { html, url: r.url };
  } catch (e) {
    console.log('  error', e.message, url);
    return null;
  }
}

/** Strip tags (comments are kept: the sites hide tables inside them). */
export const text = s => s.replace(/<!--|-->/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();

/** Every table row of a page (comments opened) as { stat: text } maps. */
export function rows(html) {
  const out = [];
  const src = html.replace(/<!--|-->/g, ' ');
  const re = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  let m;
  while ((m = re.exec(src))) {
    const cells = {};
    const cre = /<(?:td|th)[^>]*data-stat="([^"]+)"[^>]*>([\s\S]*?)<\/(?:td|th)>/g;
    let c;
    while ((c = cre.exec(m[1]))) cells[c[1]] = text(c[2]);
    const link = m[1].match(/href="\/players\/[a-z]\/([a-z0-9.]+)\.(?:s?html|htm)"/i);
    if (link) cells._id = link[1];
    if (Object.keys(cells).length) out.push(cells);
  }
  return out;
}

/** The text of the meta block at the top of a player page (born, bats, draft, college). */
export function meta(html) {
  const i = html.indexOf('id="meta"');
  if (i < 0) return '';
  const j = html.indexOf('</div>\n</div>', i);
  return text(html.slice(i, j > i ? j : i + 8000));
}
