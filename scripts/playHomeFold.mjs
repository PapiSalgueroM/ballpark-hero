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
import pw from './lib/playwrightLoader.mjs';

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

const FOLD_CONTROL = process.env.HOMEFOLD_CONTROL || '';
if (FOLD_CONTROL && !['notehome', 'notegone', 'h1text'].includes(FOLD_CONTROL)) {
  console.error(`HOMEFOLD_CONTROL=${FOLD_CONTROL} is not a control this harness knows (notehome, notegone, h1text)`);
  process.exit(2);
}
const NON_GAME = /^\/(login|signup|auth|privacy|terms|about|contact|leaderboard|records|whats-new|profile|reset-password|soccer|pro-football|pro-basketball|baseball|hockey|college)(\/|$)/;

const browser = await chromium.launch();

async function look(width, height) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  const page = await ctx.newPage();
  /* Supabase hangs rather than fails without egress, so it is aborted here the
     same way every other harness in this repo does it. The tiles this measures
     render from the registry, not from the database. */
  await page.route('**://*.supabase.co/**', r => r.abort());
  /* HOMEFOLD_CONTROL=h1text: the moment the app draws its h1, a word is
     added to it, so section 1's exact h1 check must go red. */
  if (FOLD_CONTROL === 'h1text') {
    await page.addInitScript(() => {
      const mo = new MutationObserver(() => {
        const h = document.querySelector('#dukb-main h1');
        if (h && !h.dataset.controlled) { h.dataset.controlled = '1'; h.append(' Home'); mo.disconnect(); }
      });
      mo.observe(document, { childList: true, subtree: true });
    });
  }
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => (document.body?.innerText ?? '').trim().length > 200, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2000);
  const out = await page.evaluate(({ nonGameSrc, vh }) => {
    const NON_GAME = new RegExp(nonGameSrc);
    /* Round 287: the strip is labelled now that it carries scores. The label
       is asserted to exist, because if this selector ever matched nothing the
       ticker's own game links (at the very top of the page) would be counted
       as the first playable tile and the check below would pass for the wrong
       reason. Round 320: the label is "Live scores ticker" since the Round
       311 rewrite; this harness carried the Round 287 wording for nine
       rounds because nothing ran it in between. */
    const TICKER = 'section[aria-label="Live scores ticker"]';
    const tickerPresent = !!document.querySelector(TICKER);
    const inTicker = el => !!el.closest(TICKER);
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
    /* Round 658: the h1, read as the page renders it. */
    const h1s = [...document.querySelectorAll('h1')].map(h => (h.innerText || h.textContent || '').trim());
    return { first, prompts, subtitles, viewport: vh, tickerPresent, h1s };
  }, { nonGameSrc: NON_GAME.source, vh: height });
  await ctx.close();
  return out;
}

console.log(`playHomeFold: what a visitor is offered before they are asked for anything`);

console.log('1) a phone sees something to play, high enough to see it');
{
  const r = await look(390, 844);
  say(r.tickerPresent, 'the ticker is on the page under its label, so its links were excluded and not counted as tiles');
  if (!r.first) {
    say(false, 'no playable game link on the home page at all, which cannot be right');
  } else {
    say(r.first.top <= FOLD_CEILING,
      `first game tile at y=${Math.round(r.first.top)} (ceiling ${FOLD_CEILING}), ${r.first.p}`);
    say(r.first.top < 844, `it is inside the first screen at all (${Math.round(r.first.top)} of 844)`);
  }
  say(r.prompts.length <= MAX_PROMPTS,
    `${r.prompts.length} place(s) above it ask for an account (max ${MAX_PROMPTS}) | ${r.prompts.join(' | ') || 'none'}`);
  /* Round 658: the redesign moved the h1 into a compact title row, and the
     owner's headline is the name, nothing else ("hero headline is too long",
     2026-08-28). Exactly one h1, and its text is exactly the name. */
  say(r.h1s.length === 1 && r.h1s[0] === 'DoUKnowBall',
    `the page has one h1 and it reads exactly "DoUKnowBall" (${JSON.stringify(r.h1s)})`);
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

console.log('4) a returning player gets NO checklist, and the record never moves the first tile');
{
  /* Round 293 built a personal dailies checklist here and this section
     measured it. Round 297 REMOVED it on the owner's direct instruction in
     the 2026-08-26 tweaks document ("The your dailies I would say get rid of
     it"), and this harness kept asserting the deleted feature for another
     twenty three rounds because nothing ran it in between. The plant stays,
     the expectation flips: a returning player's streak record must NOT bring
     the checklist back (re-adding it would overrule him silently), and the
     record must not move the first tile either. */
  const fresh = await look(390, 844);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.route('**://*.supabase.co/**', r => r.abort());
  await page.addInitScript(() => {
    const et = d => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(d);
    const today = et(new Date()), yesterday = et(new Date(Date.now() - 86400000));
    localStorage.setItem('dukb-streaks-v1', JSON.stringify({ version: 1, global: { current: 3, longest: 5, lastDate: yesterday }, perGame: {
      'champ-or-not': { current: 3, longest: 5, lastDate: yesterday },
      'face-off': { current: 1, longest: 1, lastDate: today },
      'guess-the-year': { current: 0, longest: 2, lastDate: '2026-08-01' },
    }, loginDates: [], totalPlays: 12, totalPoints: 300 }));
  });
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => (document.body?.innerText ?? '').trim().length > 200, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2000);
  const r = await page.evaluate((nonGameSrc) => {
    const NON_GAME = new RegExp(nonGameSrc);
    const sec = document.querySelector('section[aria-label="Your dailies"]');
    const firstTile = [...document.querySelectorAll('a[href^="/"]')]
      .filter(a => !a.closest('section[aria-label="Live scores ticker"]'))
      .map(a => ({ p: a.getAttribute('href') || '', top: a.getBoundingClientRect().top + window.scrollY }))
      .filter(x => x.p && x.p !== '/' && !NON_GAME.test(x.p))
      .sort((a, b) => a.top - b.top)[0] ?? null;
    return { checklist: !!sec, firstTop: firstTile ? firstTile.top : null };
  }, NON_GAME.source);
  await ctx.close();
  say(!r.checklist, 'the retired checklist stays retired even for a planted record');
  say(!!fresh.first && r.firstTop != null && Math.abs(r.firstTop - fresh.first.top) <= 2,
    `the planted record does not move the first tile (fresh y=${Math.round(fresh.first?.top ?? 0)}, planted y=${Math.round(r.firstTop ?? 0)})`);
  const again = await look(390, 844);
  say(!!fresh.first && !!again.first && Math.abs(again.first.top - fresh.first.top) <= 2, 'a fresh profile still gets its first tile in the same place');
}

console.log('5) the maker note lives on the About page, not on the home page');
{
  /* Round 346 put the owner's welcome note on the home page as a card below
     the games, and this section fenced that. Round 382 moved it at his
     request ("it shouldnt pop up there I would rather you put it in one the
     small like tabs on the bottom like near the privacy policy"): the card
     left the home page, the note lives on /about under its own heading, and
     About is a link in the small footer row. This section still asked for
     the card on the home page, so it had been red on healthy code since
     2026-09-01 (Round 641 found it red identically on main). It now fences
     what he asked for. HOMEFOLD_CONTROL=notehome plants a note card on the
     home page and notegone strips the heading from /about; each must turn its
     own check red. */
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.route('**://*.supabase.co/**', r => r.abort());
  await page.addInitScript(() => { try { localStorage.setItem('cookie-consent', 'essential'); } catch { /* fine */ } });
  if (FOLD_CONTROL === 'notehome') {
    await page.addInitScript(() => {
      document.addEventListener('DOMContentLoaded', () => {
        const card = document.createElement('div');
        card.setAttribute('data-maker-note', '');
        card.textContent = 'A note from the maker';
        document.body.appendChild(card);
      });
    });
  }
  /* The About page is drawn again by the app after the saved page loads, so
     the heading lives in a script as well as in the document; both get the
     rewrite, and the control refuses below if neither carried it. */
  let noteRewrites = 0;
  if (FOLD_CONTROL === 'notegone') {
    await page.route('**/*', async r => {
      const type = r.request().resourceType();
      if (type !== 'document' && type !== 'script') return r.continue();
      const res = await r.fetch();
      const body = await res.text();
      const swapped = body.split('A note from the maker').join('Something else');
      if (swapped !== body) noteRewrites += 1;
      await r.fulfill({ response: res, body: swapped });
    });
  }
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => (document.body?.innerText ?? '').length > 200, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const home = await page.evaluate(() => ({
    card: !!document.querySelector('[data-maker-note]'),
    footerAbout: [...document.querySelectorAll('footer a[href]')].some(a => /^\/about\/?$/.test(a.getAttribute('href') || '')),
  }));
  say(!home.card, 'no maker note card on the home page');
  say(home.footerAbout, 'the footer links to About, where the note lives');
  await page.goto(`${BASE}/about`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => (document.body?.innerText ?? '').length > 200, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(800);
  const about = await page.evaluate(() => {
    const h = [...document.querySelectorAll('h2')].find(x => /a note from the maker/i.test(x.textContent || ''));
    return { heading: !!h, asksForAccount: h ? /sign up|log in|create.*account/i.test((h.nextElementSibling?.textContent) || '') : false };
  });
  if (FOLD_CONTROL === 'notegone' && noteRewrites === 0) {
    console.error('control notegone: no served document or script carried the note heading to strip, so it proves nothing');
    process.exit(1);
  }
  say(about.heading, 'the About page carries the note under "A note from the maker"');
  say(!about.asksForAccount, 'the note asks for nothing, no account language inside');
  await ctx.close();
}

await browser.close();

console.log('');
if (failures > 0) {
  console.log(`playHomeFold: ${failures} failures. The home page is asking before it is offering.`);
  process.exit(1);
}
console.log('playHomeFold: green. The first thing on the page is something to play.');
