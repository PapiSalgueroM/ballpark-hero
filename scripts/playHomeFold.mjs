/**
 * ROUND 283 BROWSER HARNESS: the home page offers a game before it asks for an
 * account.
 *
 * WHAT WAS WRONG, measured on the built site before anything was changed. On a
 * 390 by 844 phone, which is the only screen most visitors ever see, the first
 * playable game tile sat at y=478. Fifty seven percent of the way down. Above it
 * were four separate asks for an account: the nav's Log In and Sign Up, a
 * full width green strip saying "Create a free account to save your scores",
 * and a "Make a free account" button in the hero. On a site whose entire pitch,
 * in its own words, is "no sign-up, no downloads, no app to install", the first
 * screen was a sign-up form with the product below the fold.
 *
 * Two other things came out of the same look. The hero repeated the wordmark
 * that was already in the nav twelve pixels above it, five times larger. And
 * all three "Most played today" tiles carried the identical subtitle "Popular
 * pick", the same two words under three different games, because the fallback
 * label was a constant while every game in the registry has its own one line
 * description.
 *
 * After: 369 on a phone, 365 on desktop, two prompts instead of four, and three
 * tiles that say what the three games are.
 *
 * WHY THE CEILING IS 430 AND NOT THE MEASURED 369. A threshold set at the
 * current number fails on the next honest word added to a sentence, which trains
 * people to raise it, which is the same as not having one. 430 sits sixty pixels
 * above where the page is now and forty eight below where it was when this was a
 * real defect, so it has room for ordinary copy edits and none for the thing it
 * exists to stop.
 *
 * THE TICKER IS EXCLUDED FROM THE GAME SEARCH, and the first draft of this
 * measurement did not exclude it: the strip carries game links, so it reported
 * the first game tile at y=5 and the page as perfect. It was measuring the
 * furniture.
 *
 * Run: node scripts/runAllSims.mjs --browser
 *      or BASE=http://127.0.0.1:4173 node scripts/playHomeFold.mjs
 */
import pw from '/home/claude/.npm-global/lib/node_modules/playwright/index.js';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';

/** Pixels from the top of the document, on a phone, that the first playable
 *  game tile must not fall below. See the header for where this came from. */
const FOLD_CEILING = 430;
/** Separate PLACES above that tile that may ask for an account. Two: the nav
 *  row, which belongs there, and one line in the hero. Three was the defect,
 *  and four was the state this round found. */
const MAX_PROMPTS = 2;

let failures = 0;
const say = (ok, what) => {
  console.log((ok ? '  PASS  ' : '  FAIL  ') + what);
  if (!ok) failures += 1;
};

const NON_GAME = /^\/(login|signup|auth|privacy|terms|about|contact|leaderboard|records|whats-new|profile|reset-password|soccer|pro-football|pro-basketball|baseball|hockey|college)(\/|$)/;

const browser = await chromium.launch();

async function look(width, height) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  const page = await ctx.newPage();
  /* Supabase hangs rather than fails without egress, so it is aborted here the
     same way every other harness in this repo does it. The tiles this measures
     render from the registry, not from the database. */
  await page.route('**://*.supabase.co/**', r => r.abort());
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => (document.body?.innerText ?? '').trim().length > 200, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2000);
  const out = await page.evaluate(({ nonGameSrc, vh }) => {
    const NON_GAME = new RegExp(nonGameSrc);
    const inTicker = el => !!el.closest('[aria-label="Site ticker"]');
    const links = [...document.querySelectorAll('a[href^="/"]')].filter(a => !inTicker(a));
    const games = links
      .map(a => ({ p: a.getAttribute('href') || '', el: a }))
      .filter(x => x.p && x.p !== '/' && !NON_GAME.test(x.p))
      .map(x => ({
        p: x.p,
        top: x.el.getBoundingClientRect().top + window.scrollY,
        text: (x.el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 60),
      }))
      .filter(x => x.top > 0)
      .sort((a, b) => a.top - b.top);
    const first = games[0] ?? null;
    /* COUNTED AS ROWS, NOT AS ELEMENTS, and the first draft counted elements
       and missed the thing it was written for. The banner's ask is a <span>
       inside a <p>, not a link or a button, so a sweep of a,button reported two
       prompts whether the banner was there or not: under the negative control,
       with the banner deliberately restored, that assertion passed. What
       actually matters is how many separate PLACES on the way down the page ask
       for an account. The nav's Log In and Sign Up sit on one line and are one
       place. The banner is a second. The hero's line is a third. So asks are
       bucketed by vertical position and the buckets are counted. */
    const asks = [];
    const ASK = /sign ?up|create a free account|make a free (account|one)|log ?in/i;
    for (const el of document.querySelectorAll('a, button, span, p')) {
      if (el.querySelector('a, button, span, p')) continue;   // leaf nodes only
      const t = (el.innerText || el.textContent || '').trim();
      if (!t || !ASK.test(t)) continue;
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) continue;
      const y = r.top + window.scrollY;
      if (y < 0 || (first && y >= first.top)) continue;
      asks.push({ y, t: t.replace(/\s+/g, ' ').slice(0, 28) });
    }
    const rows = new Map();
    for (const a of asks) {
      const bucket = Math.round(a.y / 24);
      if (!rows.has(bucket)) rows.set(bucket, []);
      rows.get(bucket).push(a.t);
    }
    const prompts = [...rows.entries()].sort((a, b) => a[0] - b[0]).map(([b, ts]) => `y~${b * 24}: ${ts.join(' + ')}`);
    /* THE SUBTITLES IN ONE SECTION, not across the page. The defect was three
       tiles in the same row reading "Popular pick", the same two words under
       three different games. The first draft of this check swept every tile on
       the page and flagged the NEW badge, which sits on three genuinely new
       games and is telling the truth: a repeated BADGE is a fact about several
       games, a repeated SUBTITLE is a constant standing in for a description.
       So it is scoped to the section the defect was in, and anything short
       enough to be a badge is ignored. */
    const section = [...document.querySelectorAll('section')]
      .find(el => /most played today/i.test((el.querySelector('p,h2,h3')?.innerText) || ''));
    const subtitles = !section ? [] : [...section.querySelectorAll('a[href^="/"]')]
      .map(a => {
        const spans = [...a.querySelectorAll('span')].map(x => (x.innerText || '').trim()).filter(Boolean);
        return spans.length > 1 ? spans[spans.length - 1] : null;
      })
      .filter(t => t && t.length > 6);
    return { first, prompts, subtitles, viewport: vh };
  }, { nonGameSrc: NON_GAME.source, vh: height });
  await ctx.close();
  return out;
}

console.log(`playHomeFold: what a visitor is offered before they are asked for anything`);

console.log('1) a phone sees something to play, high enough to see it');
{
  const r = await look(390, 844);
  if (!r.first) {
    say(false, 'no playable game link on the home page at all, which cannot be right');
  } else {
    say(r.first.top <= FOLD_CEILING,
      `first game tile at y=${Math.round(r.first.top)} (ceiling ${FOLD_CEILING}), ${r.first.p}`);
    say(r.first.top < 844, `it is inside the first screen at all (${Math.round(r.first.top)} of 844)`);
  }
  say(r.prompts.length <= MAX_PROMPTS,
    `${r.prompts.length} place(s) above it ask for an account (max ${MAX_PROMPTS}) | ${r.prompts.join(' | ') || 'none'}`);
}

console.log('2) desktop, same rule');
{
  const r = await look(1440, 900);
  if (!r.first) say(false, 'no playable game link on the desktop home page');
  else say(r.first.top <= FOLD_CEILING, `first game tile at y=${Math.round(r.first.top)}, ${r.first.p}`);
}

console.log('3) the tiles say what the games are');
{
  const r = await look(390, 844);
  const subs = r.subtitles;
  const counts = new Map();
  for (const s of subs) counts.set(s, (counts.get(s) || 0) + 1);
  const repeated = [...counts.entries()].filter(([, n]) => n >= Math.min(3, subs.length));
  if (!subs.length) {
    say(false, 'no Most Played Today tile subtitles could be read, so this check proves nothing');
  } else {
    say(repeated.length === 0,
      repeated.length
        ? `${repeated[0][1]} of the ${subs.length} tiles share the subtitle ${JSON.stringify(repeated[0][0])}, which is a placeholder rather than a label`
        : `${subs.length} tile subtitles, all different: ${subs.map(x => JSON.stringify(x.slice(0, 24))).join(', ')}`);
  }
}

await browser.close();

console.log('');
if (failures > 0) {
  console.log(`playHomeFold: ${failures} failures. The home page is asking before it is offering.`);
  process.exit(1);
}
console.log('playHomeFold: green. The first thing on the page is something to play.');
