/**
 * Round 272: give every retired route a real document instead of a copy of
 * the home page.
 *
 * WHAT WAS MEASURED, on the live site, 2026-08-22, asking as Googlebot with
 * redirects NOT followed:
 *
 *   /world-cup            200  18725 bytes  no canonical  title = home page
 *   /football-draft       200  18725 bytes  no canonical  title = home page
 *   /guess-soccer-club    200  18725 bytes  no canonical  title = home page
 *   /guess-transfer-value 200  18725 bytes  no canonical  title = home page
 *   /perfect-lineup       200  18725 bytes  no canonical  title = home page
 *   /world-cup-predictor  200  18725 bytes  no canonical  title = home page
 *   /deal-or-no-deal      200  18725 bytes  no canonical  title = home page
 *   /grade-transfer       200  18725 bytes  no canonical  title = home page
 *
 * All eight bodies are byte identical to the home page, and byte identical to
 * what an address that was never a route returns. Two separate things were
 * wrong and both were believed to be fine:
 *
 *   1. public/_redirects IS NOT HONORED BY THIS HOST. It has been in the repo
 *      for many rounds and reads like the redirects are handled. They are not.
 *      Proved with the one rule that could not be confused with anything else:
 *      "/world-cup-predictor /world-cup-bracket 301" returned 200 with the
 *      home page in it, not a 301. See the comment at the top of that file.
 *
 *   2. So the only redirect these routes ever had was the client side
 *      <Navigate> in App.tsx, which a crawler can only find by RENDERING the
 *      page. A redirect that only exists after JavaScript runs is exactly the
 *      kind that lands in Search Console's "Redirect error" bucket, which is
 *      the one reason on Anthony's 8/16 screenshots that is attributed to the
 *      website rather than to Google.
 *
 * THE FIX, and its limit. This host serves public/<route>/index.html at
 * /<route>, which is how all 126 prerendered snapshots already work, so a
 * real document can be put at each retired address even though no server
 * side 301 is available. Each one carries a meta refresh and a canonical to
 * the same destination. A meta refresh is a redirect Google reads out of the
 * HTML without rendering anything, so this converts an invisible redirect
 * into a declared one. It is not as good as a 301 and this file does not
 * pretend otherwise: if the host ever honors _redirects, a 301 replaces this.
 *
 * NO noindex, ON PURPOSE. It is the obvious next thing to reach for and it
 * is a trap: Google's own guidance is not to combine noindex with a canonical,
 * because the noindex can be carried across to the canonical target. Six of
 * these eight point at the home page. That is the whole site's most important
 * page, and this is not worth risking it for.
 *
 * Run: node scripts/genRetiredStubs.mjs
 * Guarded by: scripts/simRetiredRoutes.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { readRoutes, destinationLabel, ROOT, SITE } from './lib/retiredRoutes.mjs';

const PUBLIC = path.join(ROOT, 'public');
const DIST = path.join(ROOT, 'dist');

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function stubHtml({ from, to }) {
  const label = destinationLabel(to);
  /* The six routes that point at the home page share this title, and that is
     correct rather than lazy: they all canonicalise to the same page, so they
     are meant to be read as one destination. The source path is deliberately
     NOT in the visible copy. One of these slugs is a television brand, and
     turning a route string into a sentence is how a brand name gets into a
     shipped file for no reason at all. It stays in the machine readable meta
     below, where it is the allowlisted identifier it has always been. */
  const title = `This page moved to ${label} | DoUKnowBall`;
  const desc = `This page was retired. It now points at ${label} on DoUKnowBall, free sports trivia, puzzles and simulation games.`;
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<meta http-equiv="refresh" content="0; url=${esc(to)}">`,
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(desc)}">`,
    `<link rel="canonical" href="${SITE}${to === '/' ? '/' : to}">`,
    `<meta name="dukb-retired-from" content="${esc(from)}">`,
    `<meta name="dukb-retired-to" content="${esc(to)}">`,
    '</head>',
    '<body>',
    '<main>',
    '<h1>This page moved</h1>',
    `<p>The game that used to be here has been retired. You are being sent to ${esc(label)}.</p>`,
    `<p><a href="${esc(to)}">Go to ${esc(label)}</a></p>`,
    '<p>DoUKnowBall is free sports trivia, puzzles and simulation games, no account needed.</p>',
    '</main>',
    '</body>',
    '</html>',
    '',
  ].join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { live, retired } = readRoutes();
  let wrote = 0;
  for (const r of retired) {
    if (r.to !== '/' && !live.has(r.to)) {
      console.error(`FATAL: ${r.from} points at ${r.to}, which is not a live route`);
      process.exit(1);
    }
    if (retired.some(o => o.from === r.to)) {
      console.error(`FATAL: ${r.from} points at ${r.to}, which is itself retired, so this is a redirect chain`);
      process.exit(1);
    }
    const html = stubHtml(r);
    for (const base of [PUBLIC, DIST]) {
      if (base === DIST && !fs.existsSync(DIST)) continue;
      const dir = path.join(base, r.from.replace(/^\//, ''));
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'index.html'), html);
    }
    wrote += 1;
    console.log(`  ${r.from} -> ${r.to}`);
  }
  console.log(`retired stubs written: ${wrote}`);
}
