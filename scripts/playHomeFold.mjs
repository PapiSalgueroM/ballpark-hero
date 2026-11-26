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
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pw from './lib/playwrightLoader.mjs';

const { chromium } = pw;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
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
/* Round 717's three: continuepush puts a tall box above Continue when saves
   are planted (only 6a goes red), continuegone deletes the Continue row as it
   appears (the second 6b goes red, and 6c with it, since the cards it reads
   are gone), favignored wipes the stored sport before the app reads it (only
   6e goes red). Measured 2026-09-30, each exactly that. */
/* Round 840's h1hidden: the moment the app draws its h1, a one pixel clipped
   span with words in it goes inside, so a renderer reads more than a visitor
   sees; only section 1's "nothing in it is hidden" check may go red. */
const FOLD_CONTROLS = ['notehome', 'notegone', 'h1text', 'h1hidden', 'continuepush', 'continuegone', 'favignored'];
if (FOLD_CONTROL && !FOLD_CONTROLS.includes(FOLD_CONTROL)) {
  console.error(`HOMEFOLD_CONTROL=${FOLD_CONTROL} is not a control this harness knows (${FOLD_CONTROLS.join(', ')})`);
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
  await page.route('**/*', r => new URL(r.request().url()).origin === new URL(BASE).origin ? r.continue() : r.abort());
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
  if (FOLD_CONTROL === 'h1hidden') {
    await page.addInitScript(() => {
      const mo = new MutationObserver(() => {
        const h = document.querySelector('#dukb-main h1');
        if (h && !h.dataset.controlled) {
          h.dataset.controlled = '1';
          const s = document.createElement('span');
          s.setAttribute('style', 'display:inline-block;width:1px;height:1px;overflow:hidden;white-space:nowrap;clip-path:inset(50%)');
          s.textContent = ': free daily sports trivia, puzzles and career sims';
          h.append(s);
          mo.disconnect();
        }
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
    // Read the game summaries by themselves so badges never look like descriptions.
    const firstSport = document.querySelector('section[data-sport]');
    const subtitles = [...(firstSport?.querySelectorAll('[data-catalog-card] .home-tile-summary') ?? [])]
      .map(summary => (summary.innerText || '').trim()).filter(Boolean);
    /* Round 658: the h1, read as the page renders it. Round 840: read twice,
       WHOLE (every text node, which is what a parser, a renderer and a screen
       reader get) and as SHOWN (only the text nodes a visitor can see). The
       two must be the same string, or the h1 carries hidden text. Hidden is a
       shape, not a class name: display none, visibility hidden, opacity 0, a
       font size of 0, a box of a pixel or less with its overflow cut, any clip
       or clip path, a text indent thrown off the page, or a box entirely off
       the left or top of the document. */
    const shownText = root => {
      let out = '';
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        let hidden = false;
        for (let el = node.parentElement; el && el !== root.parentElement; el = el.parentElement) {
          const cs = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          if (cs.display === 'none' || cs.visibility === 'hidden' || cs.visibility === 'collapse'
            || Number(cs.opacity) === 0 || parseFloat(cs.fontSize) === 0
            || (r.width <= 1 && r.height <= 1 && cs.overflow !== 'visible')
            || (cs.clip && cs.clip !== 'auto') || (cs.clipPath && cs.clipPath !== 'none')
            || parseFloat(cs.textIndent) <= -100
            || r.right + window.scrollX <= 0 || r.bottom + window.scrollY <= 0) { hidden = true; break; }
        }
        if (!hidden) out += node.nodeValue;
      }
      return out.replace(/\s+/g, ' ').trim();
    };
    const h1s = [...document.querySelectorAll('h1')].map(h => ({
      whole: (h.textContent || '').replace(/\s+/g, ' ').trim(),
      shown: shownText(h),
      inApp: !!h.closest('#dukb-main'),
    }));
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
     2026-08-28). Round 840: the h1 is the template's h1 (both drawn from
     src/data/homeCopy.ts), exactly one, drawn by the app, and every word of
     it is on screen. A first draft gave the h1 a clipped half sentence for
     renderers only, which is hidden text; HOMEFOLD_CONTROL=h1hidden plants
     that and must turn the second check red, h1text adds a visible word and
     must turn the first. */
  const tplBlock = (fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').split('<div id="dukb-home-copy">')[1] ?? '').replace(/<!--[\s\S]*?-->/g, ' ');
  const tplH1 = ((tplBlock.match(/<h1>([^<]{1,200})<\/h1>/) ?? [])[1] ?? '').trim();
  if (!tplH1) say(false, 'could not read the h1 out of the copy block in index.html, so the h1 checks below would prove nothing');
  say(r.h1s.length === 1 && r.h1s[0].inApp && r.h1s[0].shown === tplH1,
    `the page has one h1, drawn by the app, and on screen it reads the template's ${JSON.stringify(tplH1)} (${JSON.stringify(r.h1s.map(h => h.shown))})`);
  say(r.h1s.length === 1 && r.h1s[0].whole === r.h1s[0].shown,
    `nothing in the h1 is hidden: the words a renderer reads are the words on screen (read ${JSON.stringify(r.h1s.map(h => h.whole))}, shown ${JSON.stringify(r.h1s.map(h => h.shown))})`);
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
    say(false, 'no catalogue game descriptions could be read');
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
  await page.route('**/*', r => new URL(r.request().url()).origin === new URL(BASE).origin ? r.continue() : r.abort());
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
  await page.route('**/*', r => new URL(r.request().url()).origin === new URL(BASE).origin ? r.continue() : r.abort());
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
      if (new URL(r.request().url()).origin !== new URL(BASE).origin) return r.abort();
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

console.log('6) a returning player: saves bring a Continue row before the stage, and a sport pick leads the list');
{
  /* The list of games and keys is read from the file the row reads, code
     only, so this plants exactly what the page looks for. */
  const listSrc = fs.readFileSync(path.join(ROOT, 'src/data/continueSaves.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');
  const SAVES = [...listSrc.matchAll(/\{\s*path:\s*'([^']+)',\s*saveKey:\s*'([^']+)'/g)].map(m => ({ path: m[1], key: m[2] }));
  const SHAPED = {
    'dukb-club-manager-save': {
      saveVersion: 3, clubName: 'Planted FC', season: 3, week: 0, leagueClubs: ['Planted FC'],
      sacked: false, squad: [], calendar: [], xiIds: [], table: [],
    },
    soccerCareerSave: { currentClub: 'Planted Town', age: 24, retired: false },
  };
  const WANT_LINES = { '/club-manager?slot=1': 'Slot 1 · Planted FC, season 3', '/soccer-career': 'Slot 1 · Planted Town, age 24' };

  const visit = async ({ saves = false, fav = null, choose = null }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.route('**/*', r => new URL(r.request().url()).origin === new URL(BASE).origin ? r.continue() : r.abort());
    await page.addInitScript(({ saves, list, shaped, fav, control }) => {
      try {
        if (saves) for (const s of list) localStorage.setItem(s.key, JSON.stringify(shaped[s.key] ?? {}));
        if (fav) localStorage.setItem('dukb-fav-sport', fav);
        if (control === 'favignored') localStorage.removeItem('dukb-fav-sport');
      } catch { /* a blocked store plants nothing, and the checks below will say so */ }
      if ((control === 'continuepush' && saves) || control === 'continuegone') {
        const mo = new MutationObserver(() => {
          if (control === 'continuepush') {
            const row = document.querySelector('[data-home-continue]');
            if (row && !document.querySelector('[data-control-push]')) {
              const box = document.createElement('div');
              box.setAttribute('data-control-push', '');
              box.style.height = '240px';
              row.parentElement.insertBefore(box, row);
            }
          } else {
            document.querySelector('[data-home-continue]')?.remove();
          }
        });
        mo.observe(document, { childList: true, subtree: true });
      }
    }, { saves, list: SAVES, shaped: SHAPED, fav, control: FOLD_CONTROL });
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => (document.body?.innerText ?? '').trim().length > 200, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(2000);
    let chosen = null;
    if (choose) {
      // Measure order updates without Playwright scrolling to the control first.
      chosen = await page.evaluate(async sport => {
        const row = document.querySelector('[data-home-fav-sport]');
        const select = row?.querySelector('select');
        if (!row || !select) return null;
        const before = { y: window.scrollY, top: row.getBoundingClientRect().top + window.scrollY };
        select.value = sport;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise(r => setTimeout(r, 400));
        let stored = null;
        try { stored = localStorage.getItem('dukb-fav-sport'); } catch { /* blocked */ }
        return { before, after: { y: window.scrollY, top: row.getBoundingClientRect().top + window.scrollY }, stored };
      }, choose);
    }
    const r = await page.evaluate(nonGameSrc => {
      const NON_GAME = new RegExp(nonGameSrc);
      const first = [...document.querySelectorAll('a[href^="/"]')]
        .filter(a => !a.closest('section[aria-label="Live scores ticker"]'))
        .map(a => ({ p: a.getAttribute('href') || '', top: a.getBoundingClientRect().top + window.scrollY }))
        .filter(x => x.p && x.p !== '/' && !NON_GAME.test(x.p) && x.top > 0)
        .sort((a, b) => a.top - b.top)[0] ?? null;
      const stage = document.querySelector('[data-home-stage]');
      const row = document.querySelector('[data-home-continue]');
      const cards = row ? [...row.querySelectorAll('[data-continue-card]')].map(a => {
        const b = a.getBoundingClientRect();
        return { p: a.getAttribute('href'), line: (a.querySelector('[data-continue-line]')?.textContent || '').trim(), h: b.height, w: b.width };
      }) : [];
      const browse = document.querySelector('[data-home-fav-sport]');
      const order = browse?.querySelector('select');
      const controls = [...(browse?.querySelectorAll('a, select, button') ?? [])].map(control => {
        const r = control.getBoundingClientRect();
        return { name: control.textContent?.trim(), h: r.height, w: r.width };
      });
      return {
        first,
        stageTop: stage ? stage.getBoundingClientRect().top + window.scrollY : null,
        rowTop: row ? row.getBoundingClientRect().top + window.scrollY : null,
        rowBottom: row ? row.getBoundingClientRect().bottom + window.scrollY : null,
        cards,
        controls,
        links: browse?.querySelectorAll('a').length ?? 0,
        order: order?.value ?? null,
        firstSport: document.querySelector('section[data-sport]')?.getAttribute('data-sport') ?? null,
        pageWide: document.documentElement.scrollWidth,
      };
    }, NON_GAME.source);
    await ctx.close();
    return { ...r, chosen };
  };

  if (SAVES.length < 15) say(false, `only ${SAVES.length} saves read from src/data/continueSaves.ts, so this planted almost nothing`);
  const fresh = await visit({});
  const planted = await visit({ saves: true });
  // Returning players see a Continue card first, while guests see the featured game.
  say(!!fresh.first && !!planted.first && fresh.first.top <= FOLD_CEILING && planted.first.top <= FOLD_CEILING
      && planted.rowTop !== null && planted.rowBottom !== null
      && planted.first.top >= planted.rowTop && planted.first.top < planted.rowBottom,
    `[6a] both first playable tiles are above y=${FOLD_CEILING} and the returning player's tile is in Continue (fresh y=${Math.round(fresh.first?.top ?? -1)}, ${SAVES.length} planted saves y=${Math.round(planted.first?.top ?? -1)})`);
  say(fresh.rowTop === null, '[6b] a visitor with no saves gets no Continue row at all');
  say(planted.rowBottom !== null && planted.stageTop !== null && planted.rowBottom <= planted.stageTop + 1
      && JSON.stringify(planted.cards.map(c => c.p)) === JSON.stringify(SAVES.map(s => s.path === '/club-manager' ? s.path + '?slot=1' : s.path)),
    `[6b] the row sits before the stage (stage starts y=${Math.round(planted.stageTop ?? -1)}, row ends y=${Math.round(planted.rowBottom ?? -1)}) with ${planted.cards.length} of ${SAVES.length} cards in list order`);
  const lines = Object.entries(WANT_LINES).map(([p, want]) => ({ p, want, got: planted.cards.find(c => c.p === p)?.line ?? null }));
  say(lines.every(l => l.got === l.want), `[6c] the cards read the saves: ${lines.map(l => `${l.p} "${l.got}"`).join(', ')}`);
  const small = [...planted.cards.filter(c => c.h < 32 || c.w < 32).map(c => c.p),
    ...planted.controls.filter(c => c.h < 44 || c.w < 44).map(c => c.name)];
  say(planted.links === 0 && planted.controls.length === 1 && planted.order !== null && small.length === 0 && planted.pageWide <= 390,
    `[6d] ${planted.cards.length} cards at least 32px, the order control at least 44px (${small.join(', ') || 'none undersize'}), page ${planted.pageWide}px wide`);
  const hockey = await visit({ fav: 'hockey' });
  say(fresh.firstSport === 'soccer' && hockey.firstSport === 'hockey' && hockey.order === 'hockey',
    `[6e] a stored hockey pick leads the sport sections (first section: fresh ${fresh.firstSport}, picked ${hockey.firstSport}) and the order control shows hockey`);
  const junk = await visit({ fav: 'banana' });
  say(junk.firstSport === 'soccer' && junk.order === '', `[6f] an invalid stored value leaves the default order (first section ${junk.firstSport})`);
  const picked = await visit({ choose: 'golf' });
  const c = picked.chosen;
  say(!!c && picked.firstSport === 'golf' && c.stored === 'golf' && c.before.y === c.after.y && Math.abs(c.before.top - c.after.top) <= 1,
    `[6g] choosing Golf moves golf first (${picked.firstSport}), remembers it (${c?.stored}), and holds scroll (scroll ${c?.before.y} to ${c?.after.y}, sport index at ${Math.round(c?.before.top ?? -1)} to ${Math.round(c?.after.top ?? -1)})`);
}

console.log('7) legacy Home links reach All games with the first game visible');
for (const [width, height] of [[320, 568], [390, 640], [430, 844], [1440, 844]]) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  try {
    await ctx.route('**/*', r => new URL(r.request().url()).origin === new URL(BASE).origin ? r.continue() : r.abort());
    await ctx.addInitScript(() => localStorage.setItem('cookie-consent', 'essential'));
    for (const hash of ['#browse-sports', '#home-career-sims', '#home-game-picks']) {
      const page = await ctx.newPage();
      await page.goto(BASE + '/' + hash, { waitUntil: 'domcontentloaded' });
      const measureCatalogue = () => {
        const catalogue = document.getElementById('browse-sports');
        const order = document.querySelector('[data-home-fav-sport] select')?.getBoundingClientRect();
        const firstGame = document.querySelector('section[data-sport] [data-catalog-card] a[href]');
        const card = firstGame?.closest('[data-catalog-card]')?.getBoundingClientRect();
        if (!catalogue || !order || !card) return null;
        const top = catalogue.getBoundingClientRect().top;
        const margin = parseFloat(getComputedStyle(catalogue).scrollMarginTop);
        const summary = firstGame.querySelector('.home-tile-summary');
        const lines = summary ? summary.getBoundingClientRect().height / parseFloat(getComputedStyle(summary).lineHeight) : 0;
        return {
          hash: location.hash, noFocusChange: document.activeElement === document.body,
          cardTop: Math.round(card.top), cardBottom: Math.ceil(card.bottom), lines,
          catalogueAtAnchor: Math.abs(top - margin) <= 3,
          orderInView: order.top >= 0 && order.bottom <= innerHeight && order.left >= 0 && order.right <= innerWidth,
        };
      };
      await page.getByRole('heading', { name: 'All games', exact: true }).waitFor({ timeout: 5000 }).catch(() => {});
      await page.waitForFunction(() => {
        const catalogue = document.getElementById('browse-sports');
        return catalogue && Math.abs(catalogue.getBoundingClientRect().top - parseFloat(getComputedStyle(catalogue).scrollMarginTop)) <= 3;
      }, null, { timeout: 2500 }).catch(() => {});
      const catalogue = await page.evaluate(measureCatalogue);
      say(Boolean(catalogue?.hash === hash && catalogue.catalogueAtAnchor && catalogue.noFocusChange),
        width + 'px ' + hash + ' reaches All games with no focus change');
      say(Boolean(catalogue && catalogue.cardTop > 0 && catalogue.cardBottom <= height),
        width + ' by ' + height + ' shows a whole catalogue card from ' + hash);
      say(Boolean(catalogue?.orderInView), width + 'px Show first is fully visible from ' + hash);
      say(Boolean(catalogue && catalogue.lines >= 0.9 && catalogue.lines <= (width < 640 ? 1.1 : 2.1)),
        width + 'px catalogue shows a compact game description');
      await page.close();
    }
  } finally {
    await ctx.close();
  }
}

console.log('8) Browse sports jumps to a heading without changing the favourite');
for (const [width, height] of [[320, 568], [390, 640], [1280, 250], [1440, 844]]) {
  const touch = width === 390;
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce', hasTouch: touch });
  try {
    const page = await ctx.newPage();
    await page.route('**/*', r => new URL(r.request().url()).origin === new URL(BASE).origin ? r.continue() : r.abort());
    await page.addInitScript(() => localStorage.setItem('cookie-consent', 'essential'));
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    const picker = page.getByRole('button', { name: 'Browse sports', exact: true });
    const menu = page.getByRole('dialog', { name: 'Browse sports' });
    await picker.waitFor();
    say(await picker.getAttribute('aria-expanded') === 'false', width + 'px Browse sports starts closed');
    await picker.press('Enter');
    await menu.waitFor();
    const links = await menu.locator('a[href^="#sport-"]').evaluateAll(items => items.map(item => {
      const { width, height } = item.getBoundingClientRect();
      return { href: item.getAttribute('href'), width, height };
    }));
    const all = await page.locator('[data-home-fav-sport] select option').evaluateAll(options => options.slice(1).map(option => '#sport-' + option.value));
    say(links.length === all.length && all.every(href => links.some(link => link.href === href && link.width >= 44 && link.height >= 44)),
      width + 'px Browse sports offers every sport at full tap size');
    await page.keyboard.press('Escape');
    await menu.waitFor({ state: 'hidden' });
    await page.waitForFunction(() => document.activeElement?.id === 'home-browse-sports-trigger', null, { timeout: 5000 }).catch(() => {});
    say(await picker.evaluate(trigger => trigger === document.activeElement), width + 'px Escape restores Browse sports');
    if (touch) await picker.tap();
    else await picker.press('Enter');
    const link = menu.getByRole('link', { name: 'Rugby League', exact: true });
    if (height === 250) {
      const usable = await link.click({ trial: true, timeout: 5000 }).then(() => true, () => false);
      say(usable, `${width} by ${height} desktop can scroll to and click Rugby League`);
    }
    if (!touch) await link.focus();
    const originTop = await page.evaluate(() => window.scrollY);
    if (touch) await link.tap();
    else await link.press('Enter');
    const target = page.locator('#sport-rugby');
    const land = () => page.waitForFunction(() => {
      const heading = document.getElementById('sport-rugby');
      return heading && Math.abs(heading.getBoundingClientRect().top - parseFloat(getComputedStyle(heading).scrollMarginTop)) <= 3;
    }, null, { timeout: 5000 }).then(() => true, () => false);
    const landed = await land();
    const focused = await target.evaluate(heading => document.activeElement === heading);
    const changed = await page.evaluate(() => localStorage.getItem('dukb-fav-sport'));
    const first = await page.locator('section[data-sport]').first().getAttribute('data-sport');
    say(landed && focused && first === 'soccer' && changed === null, `${width}px ${touch ? 'touch' : 'keyboard'} jump focuses Rugby League with the original order`);
    await page.goBack({ waitUntil: 'domcontentloaded' });
    const openerId = 'home-browse-sports-trigger';
    const back = await page.waitForFunction(id => document.activeElement?.id === id, openerId, { timeout: 5000 })
      .then(() => true, () => false);
    const backTop = await page.evaluate(() => window.scrollY);
    say(back && Math.abs(originTop - backTop) <= 3, `${width}px Back restores Browse sports and its scroll`);
    await page.goForward({ waitUntil: 'domcontentloaded' });
    say(await land() && await target.evaluate(heading => document.activeElement === heading), `${width}px Forward restores the sport heading`);
    if (width === 320) {
      await page.setViewportSize({ width: 1280, height: 800 });
      await picker.waitFor();
      await page.goBack({ waitUntil: 'domcontentloaded' });
      const visible = await page.waitForFunction(() => {
        const opener = document.getElementById('home-browse-sports-trigger');
        if (!opener || opener !== document.activeElement || location.hash) return false;
        const box = opener.getBoundingClientRect();
        return box.top >= 0 && box.bottom <= innerHeight
          && opener.contains(document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2));
      }, null, { timeout: 5000 }).then(() => true, () => false);
      say(visible, '320px to 1280px Back reveals the same Browse sports trigger');
      await page.setViewportSize({ width, height });
    }
    await page.goto(BASE + '/#sport-rugby', { waitUntil: 'domcontentloaded' });
    await page.reload({ waitUntil: 'domcontentloaded' });
    say(await land(), `${width}px a direct Rugby League link remains reachable on reload`);
  } finally {
    await ctx.close();
  }
}

console.log('9) the Home header offers a sport before leaving the first screen');
for (const width of [320, 390, 430, 1440]) {
  const ctx = await browser.newContext({ viewport: { width, height: width === 320 ? 568 : 844 }, reducedMotion: 'reduce', hasTouch: width < 768 });
  try {
    await ctx.route('**/*', r => new URL(r.request().url()).origin === new URL(BASE).origin ? r.continue() : r.abort());
    await ctx.addInitScript(light => {
      localStorage.setItem('cookie-consent', 'essential');
      if (light) localStorage.setItem('dukb-theme', 'light');
    }, width === 320 || width === 430);
    const page = await ctx.newPage();
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    const trigger = page.getByRole('button', { name: 'Browse sports', exact: true });
    const ready = await trigger.waitFor({ timeout: 5000 }).then(() => true, () => false);
    if (!ready) {
      say(false, width + 'px Home has a Browse sports button beside search');
      continue;
    }
    say(await trigger.count() === 1 && await page.getByRole('textbox', { name: 'Search games' }).count() === 1,
      width + 'px Home has one Browse sports control beside Search games');
    say(await page.getByRole('button', { name: 'Jump to sport', exact: true }).count() === 0
      && await page.locator('[data-home-fav-sport] a[href^="#sport-"], section[data-sport] a[href="#browse-sports"]').count() === 0,
      width + 'px there is no second sport navigator');
    say(await page.locator('[data-home-popular-game], [data-home-shipped], #home-polls').count() === 0
      && await page.getByRole('heading', { name: 'Dynasty & Career Sims', exact: true }).count() === 0,
      width + 'px the removed discovery shelves stay off the page');
    await trigger.focus();
    await trigger.press('Enter');
    const quick = page.getByRole('dialog', { name: 'Browse sports' });
    const links = await quick.getByRole('link').evaluateAll(items => items.map(link => ({
      href: link.getAttribute('href'), height: link.getBoundingClientRect().height,
    })));
    const sections = await page.locator('section[data-sport] > div > h2').evaluateAll(headings => headings.map(h => '#' + h.id));
    const stayedAtTop = await page.evaluate(() => scrollY === 0 && document.documentElement.scrollWidth <= innerWidth);
    const sportLinks = links.filter(link => link.href?.startsWith('#sport-'));
    say(links.length === sportLinks.length + 1 && links.filter(link => link.href === '#home-dailies').length === 1,
      width + 'px Daily puzzles is the only non-sport shortcut');
    say(stayedAtTop && sportLinks.length === sections.length && sportLinks.every(link => sections.includes(link.href) && link.height >= 44),
      width + 'px header opens every sport at the top with 44px targets');
    await page.keyboard.press('Escape');
    await quick.waitFor({ state: 'hidden' });
    say(await trigger.evaluate(button => document.activeElement === button), width + 'px Escape returns focus to Browse sports');
    await trigger.press('Enter');
    const rugby = quick.getByRole('link', { name: 'Rugby League', exact: true });
    if (width < 768) await rugby.tap();
    else { await rugby.focus(); await rugby.press('Enter'); }
    await quick.waitFor({ state: 'hidden' });
    const target = page.locator('#sport-rugby');
    const entered = await target.evaluate(heading => document.activeElement === heading
      && location.hash === '#sport-rugby'
      && Math.abs(heading.getBoundingClientRect().top - parseFloat(getComputedStyle(heading).scrollMarginTop)) <= 3
      && localStorage.getItem('dukb-fav-sport') === null);
    say(entered, width + 'px header selection focuses Rugby League and keeps the sport order');
    await page.goBack();
    const returned = await trigger.evaluate(button => document.activeElement === button && !location.hash && scrollY === 0);
    say(returned, width + 'px browser Back restores the Browse sports button and its scroll position');
    await page.goForward();
    const advanced = await target.evaluate(heading => document.activeElement === heading
      && location.hash === '#sport-rugby'
      && Math.abs(heading.getBoundingClientRect().top - parseFloat(getComputedStyle(heading).scrollMarginTop)) <= 3);
    say(advanced, width + 'px browser Forward restores the selected sport heading');
    await page.goBack();

    for (const shortcut of [
      { label: 'Daily puzzles', hash: '#home-dailies', card: '[data-daily-spotlight]' },
    ]) {
      await trigger.press('Enter');
      await quick.waitFor();
      const link = quick.getByRole('link', { name: shortcut.label, exact: true });
      if (await link.count() !== 1) {
        say(false, width + 'px header offers a ' + shortcut.label + ' shortcut');
        await page.keyboard.press('Escape');
        continue;
      }
      const box = await link.boundingBox();
      say(await link.getAttribute('href') === shortcut.hash && box?.width >= 44 && box.height >= 44,
        width + 'px ' + shortcut.label + ' shortcut has the exact destination and a full tap target');
      if (width < 768) await link.tap();
      else { await link.focus(); await link.press('Enter'); }

      const reachesCard = ({ hash, card, direct }) => {
        const heading = document.querySelector(hash);
        const first = heading?.closest('section')?.querySelector(card)?.getBoundingClientRect();
        const wantedFocus = direct ? document.body : heading;
        return heading && first && location.hash === hash && document.activeElement === wantedFocus
          && Math.abs(heading.getBoundingClientRect().top - parseFloat(getComputedStyle(heading).scrollMarginTop)) <= 3
          && first.top > heading.getBoundingClientRect().bottom && first.bottom <= innerHeight;
      };
      const lands = (destination, direct = false) =>
        destination.waitForFunction(reachesCard, { ...shortcut, direct }, { timeout: 2500 }).then(() => true, () => false);
      say(await lands(page), width + 'px jump focuses ' + shortcut.label + ' with a full game visible');
      await page.goBack();
      const returnsToOpener = () => page.waitForFunction(id => document.activeElement?.id === id && !location.hash && scrollY === 0,
        'home-browse-sports-trigger', { timeout: 2500 }).then(() => true, () => false);
      say(await returnsToOpener(), width + 'px Back from ' + shortcut.label + ' restores the opener at the top');
      await page.goForward();
      say(await lands(page), width + 'px Forward restores ' + shortcut.label + ' and its first full game');
      await page.goBack();
      await returnsToOpener();

      if (width === 320) {
        const direct = await ctx.newPage();
        try {
          await direct.goto(BASE + '/' + shortcut.hash, { waitUntil: 'domcontentloaded' });
          say(await lands(direct, true), width + 'px direct ' + shortcut.label + ' link shows a game with no focus change');
        } finally {
          await direct.close();
        }
      }
    }
  } finally {
    await ctx.close();
  }
}

console.log('10) long sport lists preview games and restore the opened game on Back');
for (const width of [320, 390, 430, 1440]) {
  const ctx = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: 'reduce' });
  try {
    const page = await ctx.newPage();
    await page.route('**/*', r => new URL(r.request().url()).origin === new URL(BASE).origin ? r.continue() : r.abort());
    await page.addInitScript(() => localStorage.setItem('cookie-consent', 'essential'));
    await page.goto(BASE + '/#sport-soccer', { waitUntil: 'domcontentloaded' });
    const sport = page.locator('section[data-sport="soccer"]');
    const cards = sport.locator('[data-catalog-card] a');
    const open = sport.getByRole('button', { name: /^Show \d+ more Soccer games$/ });
    await sport.waitFor();
    if (!await open.count()) {
      say(false, width + 'px Soccer shows a short preview with a disclosure');
      continue;
    }
    const total = Number((await sport.getByRole('heading', { level: 2 }).textContent()).match(/\((\d+) games\)/)?.[1]);
    say(await cards.count() === 12 && await open.getAttribute('aria-expanded') === 'false', width + 'px Soccer shows 12 games first');
    await open.scrollIntoViewIfNeeded();
    const before = await open.boundingBox();
    await open.press('Enter');
    const close = sport.getByRole('button', { name: 'Show fewer Soccer games' });
    const after = await close.boundingBox();
    say(await cards.count() === total && before && after && Math.abs(before.y - after.y) <= 2 && after.height >= 44,
      width + 'px full Soccer list opens without moving its control');
    const footle = sport.locator('[data-catalog-card] a[href="/footle"]');
    await footle.click();
    await page.waitForURL('**/footle');
    await page.goBack();
    const focusReturned = await footle.evaluate(link => document.activeElement === link);
    say(focusReturned && await cards.count() === total && await close.getAttribute('aria-expanded') === 'true',
      width + 'px Back restores the expanded list and exact game focus');
    const hub = sport.getByRole('link', { name: 'Soccer hub', exact: true });
    await sport.getByRole('heading', { level: 2 }).focus();
    await page.keyboard.press('Tab');
    say(await hub.evaluate(link => link === document.activeElement && link.getAttribute('href') === '/soccer'),
      width + 'px the Soccer hub has its own name and is next in the keyboard order');
    await page.keyboard.press('Enter');
    await page.waitForURL(url => url.pathname === '/soccer');
    await page.getByRole('heading', { name: 'Soccer Games', exact: true }).waitFor();
    await page.goBack();
    say(await hub.evaluate(link => link === document.activeElement && location.hash === '#sport-soccer')
      && await cards.count() === total && await close.getAttribute('aria-expanded') === 'true',
      width + 'px Back from the hub restores the exact anchored link and expanded list');
    await close.click();
    say(await cards.count() === 12 && await open.evaluate(button => button === document.activeElement),
      width + 'px the list folds and focus stays on its control');
  } finally {
    await ctx.close();
  }
}

console.log('11) going Back after a resize reveals the exact daily puzzle');
for (const [from, to] of [[390, 1440], [1440, 390], [390, 390]]) {
  const ctx = await browser.newContext({ viewport: { width: from, height: 844 }, reducedMotion: 'reduce' });
  try {
    const page = await ctx.newPage();
    await page.route('**/*', r => new URL(r.request().url()).origin === new URL(BASE).origin ? r.continue() : r.abort());
    await page.addInitScript(() => localStorage.setItem('cookie-consent', 'essential'));
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    const daily = page.getByRole('region', { name: 'Daily puzzles' });
    const filter = daily.getByRole('combobox', { name: 'Filter daily puzzles by sport' });
    await filter.selectOption('basketball');
    const card = daily.locator('[data-daily-chip]').last();
    const destination = await card.getAttribute('href');
    await card.click();
    await page.waitForURL(url => url.pathname === destination);
    await filter.waitFor({ state: 'hidden' });
    if (from !== to) await page.setViewportSize({ width: to, height: 844 });
    await page.goBack();
    await filter.waitFor();
    const reveal = await daily.locator(`[data-daily-chip][href="${destination}"]`).evaluate(link => {
      const rail = link.closest('ul').parentElement;
      const vertical = rail.scrollHeight > rail.clientHeight && rail.scrollWidth <= rail.clientWidth;
      const box = link.getBoundingClientRect(), clip = rail.getBoundingClientRect();
      const visible = vertical ? box.top >= clip.top - 2 && box.bottom <= clip.top + rail.clientHeight + 2
        : box.left >= clip.left - 2 && box.right <= clip.left + rail.clientWidth + 2;
      return visible && document.activeElement === link;
    });
    say(reveal && await filter.inputValue() === 'basketball',
      from + 'px to ' + to + 'px Back restores the filtered and visible daily puzzle with focus');
  } finally {
    await ctx.close();
  }
}

await browser.close();

console.log('');
if (failures > 0) {
  console.log(`playHomeFold: ${failures} failures. The home page is asking before it is offering.`);
  process.exit(1);
}
console.log('playHomeFold: green. The first thing on the page is something to play.');
