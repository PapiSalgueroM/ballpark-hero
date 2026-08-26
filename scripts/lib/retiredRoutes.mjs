/**
 * Round 272: ONE definition of "which routes are retired, and where does each
 * one point", read out of src/App.tsx.
 *
 * Why this exists as a module rather than a regex copied into three files:
 * Round 268 was caused by exactly that shape. /college filtered the registry
 * for two category titles that the registry did not use, and the page shipped
 * empty for weeks because the two lists were written in two places and were
 * free to disagree. genSitemap.mjs, genRetiredStubs.mjs and simRetiredRoutes.mjs
 * all need this list, so it is derived once, here.
 *
 * A <Route> whose element is <Navigate to="X"> is a retired page: it is not
 * a page any more, it is a signpost. Everything else with a literal path is
 * a real page. Parameterised paths and the catch-all are neither.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const SITE = 'https://douknowball.com';

export function readRoutes(appSource) {
  const app = appSource ?? fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf8');

  const live = new Set();
  const retired = [];
  const re = /<Route\s+path="([^"]+)"\s+element={\s*(<Navigate\s+to="([^"]+)")?/g;
  let m;
  while ((m = re.exec(app)) !== null) {
    const from = m[1];
    if (from.includes(':') || from === '*') continue;
    if (m[2]) retired.push({ from, to: m[3] });
    else live.add(from);
  }

  /* A parse that finds nothing is a shape change in App.tsx, not an empty
     site. Everything downstream of here would silently do nothing, so it
     stops instead. This is the fail-closed rule applied to a code reader. */
  if (!live.size || !retired.length) {
    throw new Error('App.tsx route parse found nothing, the file shape changed');
  }
  return { live, retired };
}

/* "/squad-deal" -> "Squad Deal", "/" -> "the home page".
   Deliberately built from the DESTINATION slug and never the source slug.
   Source slugs include the retired /deal-or-no-deal route, and turning that
   one into prose would put a television brand into a shipped file for no
   reason. Destinations are all our own live pages. */
export function destinationLabel(to) {
  if (to === '/') return 'the home page';
  return to.replace(/^\//, '').split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
