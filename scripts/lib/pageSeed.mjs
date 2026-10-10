/* Round 1215: one seeded stream for the PAGE of a browser walk, as an opt in helper.

   scripts/lib/seedRandom.mjs seeds the node harnesses: it replaces Math.random in the node process.
   A browser walk is another animal. The walk's own process draws nothing; the PAGE does (Club
   Manager's engine alone has 84 call sites of the ambient Math.random), and a fresh browser context
   hands every page a fresh unseeded stream. So a walk that takes a job and plays a match through the
   real controls meets another match on every run: a red cannot be played again and a green proves
   little. Release AR's gate found a goal that lost its net only because playLiveMatchFit happened to
   be dealt that match.

   This module is the same rule as seedRandom.mjs for a page, and a walk has to CALL it. Nothing is
   seeded behind a walk's back, and it is deliberately not in playwrightLoader.mjs: playRenderStability
   and playSnapshotDrift exist to see what an unseeded or re-clocked page does, and a blanket seed
   would blind them.

     import { pageSeedOf, seedPages, pageDraws } from './lib/pageSeed.mjs';
     const seed = pageSeedOf(import.meta.url, process.env.MY_WALK_SEED);
     console.log(`seed ${seed}`);                       // print it first: it is how a red is replayed
     const context = await browser.newContext();
     await seedPages(context, seed);                    // before the first goto
     ...
     console.log(await pageDraws(page));                // how many times the page has drawn so far

   WHAT THE SEED PROMISES. The stream starts again at EVERY load of a document (an init script runs
   on each navigation and in each frame), so a reload replays the same numbers from the top. Two pages
   on one seed draw the same numbers in the same order; they play the same football only as long as
   the page draws the same number of times before it. A draw on a timer between the load and the
   first kick off would break that, and pageDraws is how a walk sees it: read the count at a fixed
   point and compare. A Web Worker is not reached by an init script.

   The generator is the mulberry32 of seedRandom.mjs, bit for bit, so a page and a node harness given
   one seed walk one stream. */
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';

/** FNV-1a over a string, the hash seedRandom.mjs keys a harness on. */
export function hashName(text) {
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * The seed a walk runs on. `raw` is the walk's ONE knob, read by the walk from its own variable:
 *   undefined       the FNV hash of the walk's file name, so every walk has its own fixed stream
 *   a whole number  that number (0 to 4294967295)
 *   'fresh'         one drawn from the clock: never the default, and the caller prints it first
 * Anything else throws, the empty string included: Number('') is 0, and a variable that is set and
 * empty would otherwise seed 0 without a word.
 */
export function pageSeedOf(scriptPath, raw) {
  if (raw === undefined) {
    const file = String(scriptPath).startsWith('file:') ? fileURLToPath(scriptPath) : String(scriptPath);
    return hashName(basename(file));
  }
  if (raw === 'fresh') return ((Date.now() ^ (process.pid << 12)) >>> 0);
  const text = String(raw).trim();
  const n = Number(text);
  if (text === '' || !Number.isInteger(n) || n < 0 || n > 0xffffffff) {
    throw new Error(`a page seed must be a whole number from 0 to 4294967295 or the word fresh, and this one reads "${raw}"`);
  }
  return n >>> 0;
}

/**
 * Seeds every page of a browser context, or one page, from its next load on. Call it before the
 * first goto. The page keeps window.__pageSeed = { seed, draws }, and draws counts every call.
 */
export async function seedPages(target, seed) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error(`seedPages wants a whole number seed, not ${seed}`);
  await target.addInitScript(start => {
    let a = start >>> 0;
    const state = { seed: start, draws: 0 };
    Math.random = () => {
      state.draws += 1;
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    window.__pageSeed = state;
  }, seed);
  return seed;
}

/** How many times the page has drawn since its last load, or null on a page that was never seeded. */
export function pageDraws(page) {
  return page.evaluate(() => (window.__pageSeed ? window.__pageSeed.draws : null)).catch(() => null);
}
