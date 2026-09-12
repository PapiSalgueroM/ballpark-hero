/*
 * Round 530 harness: the reveal moments.
 *
 * His ask (2026-08-28): "More animation across every sim: reveals, draft
 * nights, celebrations. Reading text is not a game feel." Round 530 put that
 * on every sim, and this file holds the rules the design contract
 * (docs/design/round-530-reveal-moments.md) wrote for it.
 *
 * THE DANGER, the same one simDraftNight names: a reveal is a screen that
 * states facts. If a card prints a number the engine never produced, or rolls
 * a number through values that were never true, the animation has become a
 * fabrication with a spotlight on it. So the render section holds every
 * printed number to the fixture's own numbers, and the source section keeps
 * the counting number out of the tree for good.
 *
 * Sections:
 *  1. Source level, comments stripped before any matching (prose about a
 *     check is the one place the string it looks for is guaranteed to appear):
 *     a. the counting number has no importer, no renderer and no export left
 *        in src (a ratchet at zero), AND no file rolls one of its own: a state
 *        setter easing a value toward a target inside an animation frame loop
 *        is a counting number whatever it is called, which is how Stadium
 *        Tycoon kept one through a check that only knew the name;
 *     b. every src file whose <style> block declares a keyframe also declares
 *        a reduced motion rule, AND every class that file gives an animation
 *        to is named inside that rule. The rule merely existing was the old
 *        test, which a new animated class beside the guarded ones would have
 *        walked straight past. Two files from before this round carry no rule
 *        and are frozen in REDUCED_MOTION_BASELINE; a file that gets fixed
 *        must leave that list. The five keyframe files this round touched are
 *        named and must hold, so the check cannot go vacuous if one moves;
 *     c. the stagger helper is defined once, in the celebration kit, every
 *        caller imports it from there, and no animationDelay works its stagger
 *        out by multiplying a count by a step. Passing a custom step into
 *        revealDelay is fine; typing the arithmetic out is the pace escaping
 *        the kit, whatever the numbers happen to be.
 *  2. Render level, react-dom/server inside a MemoryRouter, over fixtures:
 *     every fact in the fixture appears in the markup in engine order, every
 *     number printed is one the fixture carries, the animated elements read
 *     top to bottom, the staggered rows carry strictly increasing delays, and
 *     nothing prints NaN or undefined.
 *     Covered by render: DraftDayCard, SeasonRevealCard, DraftNightCard (with
 *     the Round 530 Continue button timed after the last row), GmPressCard,
 *     SignedSlip, TrophyCase, FreeAgencyPanel, RivalryEventCard.
 *     Covered by vitest in section 3: the final pick holding the draft on the
 *     four front offices; the four career hubs mounting DraftDayCard with the
 *     engine's own pick and the confetti rule; the coach season reveal.
 *     Source level only, because they are inline in hook driven boards that
 *     no fixture reaches without a browser: the dynasty recaps, the front
 *     office feeds, the Club Manager season end block, MatchReportCard's
 *     chips, XpScreen, the four retirement cards, every Soccer Career card,
 *     the Idle Arena lift card, Rebuild's grade, the Tycoon and Wonderkid
 *     cards, ExtensionCard and InboxPanel. playGames walks those routes.
 *  3. Behaviour under vitest: FrontOfficeSeasonClose.test.tsx (after the last
 *     pick the hub is not drawn until Continue, on all four boards) and
 *     src/test/usCareerReveals.test.tsx, spawned the way simGmReload does.
 *
 * Controls, each refusing to run if its rewrite changed nothing, and each
 * required to redden its own section and no other:
 *   REVEAL_CONTROL=countup    a copy of one career board imports the counting
 *                             number again; section 1 must go red.
 *   REVEAL_CONTROL=rollup     a copy of Stadium Tycoon rolls its money again
 *                             under a name the import check cannot see;
 *                             section 1 must go red.
 *   REVEAL_CONTROL=motion     the reduced motion rule is stripped from a copy
 *                             of DraftNightCard; section 1 must go red.
 *   REVEAL_CONTROL=inlinepace a copy of the Rebuild board works its stagger
 *                             out inline again; section 1 must go red.
 *   REVEAL_CONTROL=nostagger  every row of DraftDayCard's list gets the same
 *                             delay in a copy; section 2 must go red.
 *
 * Nothing here reads dist or the clock, so it is safe between builds.
 *
 * Run: node scripts/simRevealMoments.mjs
 */
import { execSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const rel = p => path.relative(ROOT, p).replaceAll('\\', '/');

/* Scratch lives under node_modules/.cache: bare imports in the bundle entry
   and in the control copies then resolve by the same walk up the sources use
   (a worktree without modules of its own reaches the main tree's this way),
   and nothing the source guards scan can ever see a copy. */
const SCRATCH = path.join(ROOT, 'node_modules', '.cache', 'reveal-moments');
fs.mkdirSync(SCRATCH, { recursive: true });
const scratch = name => path.join(SCRATCH, name).replaceAll('\\', '/');
process.on('exit', () => fs.rmSync(SCRATCH, { recursive: true, force: true }));

const CONTROL = process.env.REVEAL_CONTROL || '';
const KNOWN = { countup: 1, motion: 1, nostagger: 2, rollup: 1, inlinepace: 1 };
if (CONTROL && !(CONTROL in KNOWN)) {
  console.error(`REVEAL_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(KNOWN).join(', ')})`);
  process.exit(1);
}

const failures = { 1: 0, 2: 0, 3: 0 };
let section = 1;
const fail = m => { failures[section] += 1; console.error('  FAIL: ' + m); };
const abort = m => { console.error(m); process.exit(1); };

/* Sources are CRLF in a Windows working copy; anchors are written LF. */
const read = f => fs.readFileSync(f, 'utf8').split('\r\n').join('\n');
const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

const KIT = 'src/components/club-manager/Celebration.tsx';
const NBA_BOARD = 'src/components/nba-my-career/NbaMyCareerBoard.tsx';
const DRAFT_NIGHT = 'src/components/front-office-shared/DraftNightCard.tsx';
const DRAFT_DAY = 'src/components/us-career/DraftDayCard.tsx';
const TYCOON = 'src/pages/StadiumTycoon.tsx';
const REBUILD = 'src/components/rebuild/RebuildBoard.tsx';

/* ---------- 1. Source level ---------- */
console.log('1) Source level: no counting number, a reduced motion rule beside every keyframe, one stagger helper');
const files = walk(path.join(ROOT, 'src'));
/* A control copy stands in for its original in this section only. */
const substitute = new Map();
const extra = [];
if (CONTROL === 'countup') {
  const src = read(path.join(ROOT, NBA_BOARD));
  const anchor = "import { CelebrationStyles, revealDelay } from '@/components/club-manager/Celebration';\n";
  if (!src.includes(anchor)) abort(`control cannot run: ${NBA_BOARD} is not in the shape REVEAL_CONTROL=countup rewrites`);
  const rewritten = src.replace(anchor, anchor + "import { CountUp } from '@/components/soccer-career/CareerFx';\n");
  if (rewritten === src) abort(`control cannot run: the rewrite of ${NBA_BOARD} changed nothing`);
  const copy = scratch('NbaMyCareerBoard.control.tsx');
  fs.writeFileSync(copy, rewritten);
  extra.push(copy);
  console.log('   NEGATIVE CONTROL ON: a copy of the NBA career board imports the counting number again, section 1 must go red');
}
if (CONTROL === 'rollup') {
  const src = read(path.join(ROOT, TYCOON));
  const anchor = '/* ---------- tiny animation helpers ---------- */\n';
  if (!src.includes(anchor)) abort(`control cannot run: ${TYCOON} is not in the shape REVEAL_CONTROL=rollup rewrites`);
  /* The exact helper Round 530's review took out of this page, back under a
     name the CountUp check would never find. */
  const rewritten = src.replace(anchor, anchor + `
function useMoneyRoll(target: number): number {
  const [shown, setShown] = useState(target);
  const ref = useRef(target);
  useEffect(() => {
    ref.current = target;
    let raf = 0;
    const step = () => {
      setShown(cur => {
        const d = ref.current - cur;
        if (Math.abs(d) < 1) return ref.current;
        return cur + d * 0.18;
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return shown;
}
`);
  if (rewritten === src) abort(`control cannot run: the rewrite of ${TYCOON} changed nothing`);
  const copy = scratch('StadiumTycoon.control.tsx');
  fs.writeFileSync(copy, rewritten);
  extra.push(copy);
  console.log('   NEGATIVE CONTROL ON: a copy of Stadium Tycoon rolls its money again under another name, section 1 must go red');
}
if (CONTROL === 'inlinepace') {
  const src = read(path.join(ROOT, REBUILD));
  const anchor = 'animationDelay: revealDelay(i, 0.5, 0.08)';
  if (!src.includes(anchor)) abort(`control cannot run: ${REBUILD} does not carry ${anchor}, so there is nothing to flatten into an inline pace`);
  const rewritten = src.split(anchor).join('animationDelay: `${0.5 + i * 0.08}s`');
  if (rewritten === src) abort(`control cannot run: the rewrite of ${REBUILD} changed nothing`);
  const copy = scratch('RebuildBoard.control.tsx');
  fs.writeFileSync(copy, rewritten);
  extra.push(copy);
  console.log('   NEGATIVE CONTROL ON: a copy of the Rebuild board works its stagger out inline again, section 1 must go red');
}
if (CONTROL === 'motion') {
  const src = read(path.join(ROOT, DRAFT_NIGHT));
  const rewritten = src.split('prefers-reduced-motion').join('prefers-no-such-setting');
  if (rewritten === src) abort(`control cannot run: ${DRAFT_NIGHT} carries no reduced motion rule to strip`);
  const copy = scratch('DraftNightCard.control.tsx');
  fs.writeFileSync(copy, rewritten);
  substitute.set(DRAFT_NIGHT, copy);
  console.log('   NEGATIVE CONTROL ON: the reduced motion rule is stripped from a copy of DraftNightCard, section 1 must go red');
}
const scanSet = [...files, ...extra];
const codeOf = f => stripComments(read(substitute.get(rel(f)) ?? f));

/* 1a. The counting number, by name and by shape.

   The name check alone was the known-offender trap CLAUDE.md warns about: it
   found every import of the kit's CountUp and reported the site clean while
   Stadium Tycoon ran its own copy under a different name, on the page this
   round touched. So the shape is checked too: a state setter, inside a file
   that drives a requestAnimationFrame loop, easing a value toward a target.
   That is what a rolling number IS, whatever it is called. A position or a
   sweep eased the same way is not caught, and should not be: it prints no
   number (the pitch dots in LiveSimScreen are exactly that case). */
const EASES = [
  /\(\s*[\w.]+\s*-\s*[\w.]+\s*\)\s*\*\s*0?\.\d+/,
  /(?:const|let)\s+(\w+)\s*=\s*[\w.]+\s*-\s*[\w.]+\s*;[\s\S]{0,300}?\+\s*\1\s*\*\s*0?\.\d+/,
];
const rollsANumber = code => {
  if (!/requestAnimationFrame/.test(code)) return false;
  for (const m of code.matchAll(/set[A-Z]\w*\(/g)) {
    const near = code.slice(m.index, m.index + 400);
    if (EASES.some(r => r.test(near))) return true;
  }
  return false;
};
{
  const importers = [];
  const exporters = [];
  const rollers = [];
  for (const f of scanSet) {
    const code = codeOf(f);
    if (/import\s+(?:type\s+)?\{[^}]*\bCountUp\b[^}]*\}\s*from\s*['"]/.test(code) || /import\s+CountUp\s+from/.test(code) || /<CountUp\b/.test(code)) importers.push(rel(f));
    if (/export\s+(?:const|function)\s+CountUp\b/.test(code)) exporters.push(rel(f));
    if (rollsANumber(code)) rollers.push(rel(f));
  }
  console.log(`   ${scanSet.length} source files scanned: ${importers.length} import or render the counting number, ${exporters.length} export it, ${rollers.length} roll one of their own`);
  for (const f of importers) fail(`${f} still imports or renders CountUp, the counting number Round 530 removed (a number must never roll through values that were never true)`);
  for (const f of exporters) fail(`${f} still exports CountUp, so one import brings it back`);
  for (const f of rollers) fail(`${f} eases a state value toward a target inside an animation frame loop, which is a counting number under another name; print the engine's value and animate its arrival instead`);
}

/* 1b. Reduced motion beside every keyframe. */
const REDUCED_MOTION_BASELINE = ['src/pages/GuessTheCollege.tsx', 'src/pages/PlayerBingo.tsx'];
const ROUND_530_KEYFRAME_FILES = [KIT, DRAFT_NIGHT, 'src/pages/IdleArena.tsx', 'src/pages/StadiumTycoon.tsx', 'src/pages/WonderkidFactory.tsx'];
{
  const styleBlocks = code => [...code.matchAll(/<style[^>]*>\{([\s\S]*?)\}<\/style>/g)].map(m => m[1]);
  const keyframe = /@keyframes\s+[\w-]+/;
  const rule = /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/;
  /* The body of the reduced motion at-rule, braces balanced, or null. */
  const reduceBody = block => {
    const m = /@media\s*\([^)]*prefers-reduced-motion\s*:\s*reduce[^)]*\)\s*\{/.exec(block);
    if (!m) return null;
    let i = m.index + m[0].length;
    const start = i;
    let depth = 1;
    while (i < block.length && depth > 0) {
      if (block[i] === '{') depth += 1;
      else if (block[i] === '}') depth -= 1;
      i += 1;
    }
    return block.slice(start, i - 1);
  };
  /* Every class a rule OUTSIDE the reduced motion body hands an animation to.
     Round 530 review: section 1b used to pass a file the moment any reduced
     motion rule appeared anywhere in it, even an empty one, so a new animated
     class added beside the guarded ones was invisible to it. That is the known
     offender shape: the check has to ask about the classes the file declares,
     not about the presence of the rule. */
  const animatedClasses = block => {
    const body = reduceBody(block);
    const outside = body === null ? block : block.split(body).join(' ');
    const out = new Set();
    for (const m of outside.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const sel = m[1].trim();
      if (sel.startsWith('@') || !/(^|[;\s])animation(-name)?\s*:/.test(m[2])) continue;
      for (const c of sel.matchAll(/\.([\w-]+)/g)) out.add(c[1]);
    }
    return [...out];
  };
  const seen = new Set();
  let guarded = 0;
  let classesHeld = 0;
  for (const f of scanSet) {
    const r = rel(f);
    const blocks = styleBlocks(codeOf(f));
    if (!blocks.some(b => keyframe.test(b))) continue;
    seen.add(r);
    if (blocks.some(b => rule.test(b))) {
      guarded += 1;
      if (REDUCED_MOTION_BASELINE.includes(r)) fail(`${r} now carries a reduced motion rule; take it out of REDUCED_MOTION_BASELINE so the ratchet keeps its teeth`);
    } else if (!REDUCED_MOTION_BASELINE.includes(r)) {
      fail(`${r} declares a keyframe in a <style> block and no reduced motion rule, so it moves for people who asked for less motion`);
    }
    if (REDUCED_MOTION_BASELINE.includes(r)) continue;
    for (const b of blocks) {
      const body = reduceBody(b);
      for (const c of animatedClasses(b)) {
        classesHeld += 1;
        if (!body || !new RegExp(`\\.${c}\\b`).test(body)) {
          fail(`${r} animates .${c} and its reduced motion rule never names it, so that one still moves for somebody who asked for less motion`);
        }
      }
    }
  }
  for (const r of ROUND_530_KEYFRAME_FILES) if (!seen.has(r)) fail(`${r} no longer declares a keyframe in a <style> block, so this check is not covering a file the round changed`);
  for (const r of REDUCED_MOTION_BASELINE) if (!seen.has(r)) fail(`${r} is in REDUCED_MOTION_BASELINE but declares no keyframe now; remove the entry`);
  if (classesHeld < 15) fail(`only ${classesHeld} animated class(es) were held to the reduced motion rule, so this check is not reading the style blocks any more`);
  console.log(`   ${seen.size} files declare a keyframe in a <style> block, ${guarded} carry the reduced motion rule, ${classesHeld} animated classes named inside it, ${REDUCED_MOTION_BASELINE.length} frozen in the baseline`);
}

/* 1c. One stagger helper. */
{
  const defs = [];
  const wrongImport = [];
  const inlinePace = [];
  let callers = 0;
  for (const f of scanSet) {
    const r = rel(f);
    const code = codeOf(f);
    const n = (code.match(/(?:function\s+revealDelay\s*\(|(?:const|let|var)\s+revealDelay\s*=)/g) || []).length;
    if (n) defs.push(`${r} (${n})`);
    if (r === KIT) continue;
    if (/\brevealDelay\s*\(/.test(code)) {
      callers += 1;
      if (!/import\s*\{[^}]*\brevealDelay\b[^}]*\}\s*from\s*['"]@\/components\/club-manager\/Celebration['"]/.test(code)) wrongImport.push(r);
    }
    /* Round 530 review: the old test here was the literal `0.6 + i * 0.22`,
       which is the kit's DEFAULT pace and nothing else, so Rebuild writing
       `0.6 + table.length * 0.08` five times sailed past it and chained three
       blocks off a step the kit no longer owned. The rule is not about those
       two numbers: a stagger worked out by multiplying a count by a step,
       inside an animationDelay, is the pace living outside the kit whatever
       the numbers are. Passing a custom step INTO revealDelay stays fine,
       there is no multiplication in the call. */
    for (const m of code.matchAll(/animationDelay\s*:/g)) {
      const expr = code.slice(m.index, m.index + 200);
      if (/[\w.\])]\s*\*\s*0?\.\d+/.test(expr)) { inlinePace.push(`${r}: ${expr.split('\n')[0].trim().slice(0, 90)}`); break; }
    }
  }
  console.log(`   revealDelay defined in ${defs.join(', ') || 'no file'}; ${callers} callers, ${wrongImport.length} import it from somewhere else, ${inlinePace.length} keep the pace inline`);
  if (defs.length !== 1 || defs[0] !== `${KIT} (1)`) fail(`revealDelay must be defined exactly once, in ${KIT}; found ${defs.join(', ') || 'none'}`);
  if (callers < 15) fail(`only ${callers} files call revealDelay, so this check is not looking at the tree the round built`);
  for (const r of wrongImport) fail(`${r} calls revealDelay without importing it from the celebration kit`);
  for (const r of inlinePace) fail(`${r} works its stagger out by hand inside an animationDelay instead of calling revealDelay, so a change to the pace would leave it behind`);
}

/* ---------- 2. Render level ---------- */
section = 2;
console.log("2) Render level: every fact and number on a reveal card is the fixture's own, and the rows land in order");
let cardPath = `${ROOT_URL}/${DRAFT_DAY}`;
if (CONTROL === 'nostagger') {
  const src = read(path.join(ROOT, DRAFT_DAY));
  const rewritten = src.split('revealDelay(i)').join('revealDelay(0)');
  if (rewritten === src) abort(`control cannot run: ${DRAFT_DAY} does not stagger its rows with revealDelay(i), so there is nothing to flatten`);
  cardPath = scratch('DraftDayCard.control.tsx');
  fs.writeFileSync(cardPath, rewritten);
  console.log('   NEGATIVE CONTROL ON: a copy of DraftDayCard gives every row the same delay, section 2 must go red');
}
const ENTRY = scratch('entry.mjs');
const BUNDLE = scratch('bundle.cjs');
fs.writeFileSync(ENTRY, `
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import DraftDayCard from '${cardPath}';
import { SeasonRevealCard } from '@/components/us-career/SeasonRevealCard';
import { DraftNightCard } from '@/components/front-office-shared/DraftNightCard';
import { GmPressCard } from '@/components/front-office-shared/GmPressCard';
import { SignedSlip } from '@/components/soccer-career/SignedSlip';
import TrophyCase from '@/components/us-career/TrophyCase';
import FreeAgencyPanel from '@/components/us-career/FreeAgencyPanel';
import { RivalryEventCard } from '@/components/us-career/RivalryEventCard';
import { buildSeasonReveal } from '@/lib/usCareerReveal';
import { buildDraftNight, draftNightHeadline, pickDelayMs, PICK_STEP_MS } from '@/lib/draftNight';
import { formatWage } from '@/lib/soccerCareerEngine';
import { trophyLines } from '@/lib/careerHub';
import { faTotalValue, FA_TIER_WORD } from '@/lib/usCareerFreeAgency';
export const render = (C, props) => renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(C, props)));
export { DraftDayCard, SeasonRevealCard, DraftNightCard, GmPressCard, SignedSlip, TrophyCase, FreeAgencyPanel, RivalryEventCard,
  buildSeasonReveal, buildDraftNight, draftNightHeadline, pickDelayMs, PICK_STEP_MS, formatWage, trophyLines, faTotalValue, FA_TIER_WORD };
`);
execSync(
  `"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=cjs --platform=node --jsx=automatic --alias:@=${ROOT_URL}/src --outfile="${BUNDLE}" --log-level=error`,
  { stdio: 'inherit' },
);
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
const mod = createRequire(import.meta.url)(BUNDLE);
for (const name of ['render', 'DraftDayCard', 'SeasonRevealCard', 'DraftNightCard', 'GmPressCard', 'SignedSlip', 'TrophyCase', 'FreeAgencyPanel', 'RivalryEventCard']) {
  if (typeof mod[name] !== 'function') abort(`the harness could not reach ${name}; the bundle is not the shape it expects`);
}
/* MemoryRouter warns once per render that useLayoutEffect does nothing on
   the server. It is the router's own note about hydration, nothing here
   hydrates, and eleven copies of it would bury a real finding. Only that
   one message is dropped; anything else the render says still prints. */
const realError = console.error;
console.error = (...args) => { if (String(args[0]).includes('useLayoutEffect does nothing on the server')) return; realError(...args); };

const decode = s => s.replace(/&#x27;/g, "'").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
const textOf = html => decode(html.replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const numbersIn = s => (String(s).match(/\d[\d,]*(?:\.\d+)?/g) || []).map(n => n.replace(/,/g, ''));
/* Every element carrying an inline animation delay, in DOM order, with its
   classes. Confetti pieces are decoration with their own scatter and are
   skipped; they are counted separately where a fixture expects them. */
function delays(html) {
  const out = [];
  for (const m of html.matchAll(/<([a-z0-9]+)\b([^>]*)>/gi)) {
    const cls = (m[2].match(/class="([^"]*)"/) || [, ''])[1];
    const style = (m[2].match(/style="([^"]*)"/) || [, ''])[1];
    const d = style.match(/animation-delay:\s*([\d.]+)(ms|s)\b/);
    if (!d || /\bcm-confetti\b/.test(cls)) continue;
    out.push({ cls, sec: d[2] === 'ms' ? Number(d[1]) / 1000 : Number(d[1]) });
  }
  return out;
}
const confettiPieces = html => (html.match(/\bcm-confetti\b/g) || []).length;

let cards = 0;
let factsChecked = 0;
let numbersHeld = 0;
/* facts: strings that must appear in the readable text, in this order.
   numbers: every value the fixture carries; a number printed that is not
   among them is a number the engine never produced.
   stagger: the class of the staggered rows, how many, and where the first
   lands. minAnimated: how many delayed elements the card must carry. */
function checkCard(name, html, { facts, numbers, stagger = null, minAnimated = 1 }) {
  cards += 1;
  const text = textOf(html);
  if (html.length < 80) { fail(`${name}: rendered almost nothing (${html.length} chars)`); return { text, d: [] }; }
  if (/\bNaN\b|\bundefined\b/.test(text)) fail(`${name}: prints NaN or undefined: ${text.slice(0, 160)}`);
  /* React splits "With pick <span>4</span>, the Titans" into several text
     nodes and the tag stripping above puts a space at every seam, so facts
     are matched with whitespace squashed on both sides. The numbers below
     still read the spaced text, so two numbers in neighbouring elements
     cannot run together into one the fixture never carried. */
  const squash = s => s.replace(/\s+/g, '');
  const flat = squash(text);
  let cursor = 0;
  for (const f of facts) {
    factsChecked += 1;
    const want = squash(f);
    if (!flat.includes(want)) { fail(`${name}: the fact "${f}" never reached the markup`); continue; }
    const at = flat.indexOf(want, cursor);
    if (at < 0) { fail(`${name}: the fact "${f}" is printed out of engine order`); continue; }
    cursor = at + want.length;
  }
  const allowed = new Set(numbers.flatMap(numbersIn));
  for (const n of numbersIn(text)) {
    numbersHeld += 1;
    if (!allowed.has(n)) fail(`${name}: prints ${n}, a number the fixture never carried`);
  }
  const d = delays(html);
  if (d.length < minAnimated) fail(`${name}: only ${d.length} element(s) carry an animation delay, expected at least ${minAnimated}`);
  for (let i = 1; i < d.length; i++) {
    if (d[i].sec < d[i - 1].sec) fail(`${name}: element ${i} lands at ${d[i].sec}s, before element ${i - 1} at ${d[i - 1].sec}s, so the card does not read top to bottom`);
  }
  if (stagger) {
    const rows = d.filter(x => new RegExp(`\\b${stagger.cls}\\b`).test(x.cls));
    if (rows.length !== stagger.count) fail(`${name}: ${rows.length} ${stagger.cls} rows carry a delay, expected ${stagger.count}`);
    for (let i = 1; i < rows.length; i++) {
      if (!(rows[i].sec > rows[i - 1].sec)) fail(`${name}: row ${i} lands at ${rows[i].sec}s, not after row ${i - 1} at ${rows[i - 1].sec}s; the stagger is flat`);
    }
    if (rows.length && stagger.first !== undefined && Math.abs(rows[0].sec - stagger.first) > 1e-9) fail(`${name}: the first row lands at ${rows[0].sec}s, expected ${stagger.first}s`);
  }
  return { text, d };
}

/* DraftDayCard: the pick line slams, the board's own lines tick in after it,
   and the confetti rule is data (first round or not). */
{
  const lines = ['Round 1, pick 4 of 32. The Titans moved up to take you.', 'Rookie deal: 4 years at $9.2M a year.'];
  const facts = ['Draft day', 'With pick 4, the Titans select Ryder Blaze', ...lines];
  const html = mod.render(mod.DraftDayCard, { pick: 4, teamLabel: 'Titans', playerName: 'Ryder Blaze', lines, firstRoundEnd: 32 });
  checkCard('DraftDayCard (first round)', html, { facts, numbers: [4, 32, ...lines], stagger: { cls: 'cm-tick-in', count: 2, first: 0.6 }, minAnimated: 4 });
  if (confettiPieces(html) === 0) fail('DraftDayCard: a first round pick gets no confetti');
  const late = mod.render(mod.DraftDayCard, { pick: 40, teamLabel: 'Titans', playerName: 'Ryder Blaze', lines: [lines[1]], firstRoundEnd: 32 });
  checkCard('DraftDayCard (second round)', late, { facts: ['With pick 40, the Titans select Ryder Blaze', lines[1]], numbers: [40, 32, lines[1]], stagger: { cls: 'cm-tick-in', count: 1, first: 0.6 }, minAnimated: 3 });
  if (confettiPieces(late) !== 0) fail('DraftDayCard: a second round pick gets confetti, so the first round rule is not data');
}

/* SeasonRevealCard over the engine's own reveal: the lines are the strings
   handed in, verbatim and in order, and the Continue button lands after the
   last of them. */
{
  const args = {
    year: 2029, subHeader: 'Dallas · age 24 · QB', teamResult: 'WON THE SUPER BOWL', statLine: '4,102 yds, 31 TD, 9 INT',
    campNote: '🚀 Camp: the starting job is yours', notes: ['💍 Super Bowl champion', 'Beat the Eagles 27-20 in the divisional round'], progressNotes: ['Overall 78 to 82'],
  };
  const reveal = mod.buildSeasonReveal(args);
  const html = mod.render(mod.SeasonRevealCard, { reveal, onContinue: () => undefined });
  const facts = [reveal.header, reveal.subHeader, reveal.result, reveal.statLine, ...reveal.lines.map(l => l.text), 'Continue'];
  const { d } = checkCard('SeasonRevealCard (title)', html, { facts, numbers: [reveal.header, reveal.subHeader, reveal.result, reveal.statLine, ...reveal.lines.map(l => l.text)], stagger: { cls: 'cm-tick-in', count: reveal.lines.length, first: 0.6 }, minAnimated: reveal.lines.length + 4 });
  const rows = d.filter(x => /\bcm-tick-in\b/.test(x.cls));
  const last = d[d.length - 1];
  if (rows.length && last && !(last.sec > rows[rows.length - 1].sec)) fail(`SeasonRevealCard: Continue lands at ${last.sec}s, not after the last line at ${rows[rows.length - 1].sec}s`);
  if (!reveal.confetti || confettiPieces(html) === 0) fail('SeasonRevealCard: a title season gets no confetti');
}

/* DraftNightCard over the engine's own night: every pick, in order, with the
   scouted grade, and the Round 530 Continue button after the last row. */
{
  const mk = (i, team) => ({ team, playerName: `Prospect ${'ABCDEFG'[i]}`, pos: ['QB', 'WR', 'CB', 'C', 'G'][i % 5], grade: 61 + i * 3 });
  const night = mod.buildDraftNight(mk(0, 'NE'), [mk(1, 'CHI'), mk(2, 'DAL'), mk(3, 'GB'), mk(4, 'SF')]);
  if (night.picks.length !== 5) abort(`buildDraftNight returned ${night.picks.length} picks for one own pick and four rivals; the fixture is not the shape this harness expects`);
  const headline = mod.draftNightHeadline(night);
  const facts = ['On the clock', headline];
  for (const p of night.picks) facts.push(`${p.overall}. ${p.team} ${p.mine ? 'select' : 'take'} ${p.playerName}`, `${p.pos}${p.mine ? ' · your pick' : ''}`, String(p.grade));
  facts.push('Continue to the hub');
  const numbers = [headline, ...night.picks.flatMap(p => [p.overall, p.grade, p.playerName, p.team, p.pos])];
  const html = mod.render(mod.DraftNightCard, { night, onContinue: () => undefined });
  const { d } = checkCard('DraftNightCard (final pick held)', html, { facts, numbers, stagger: { cls: 'fo-draft-row', count: night.picks.length, first: mod.pickDelayMs(0) / 1000 }, minAnimated: night.picks.length + 1 });
  const btn = d.find(x => /\bfo-draft-continue\b/.test(x.cls));
  const rows = d.filter(x => /\bfo-draft-row\b/.test(x.cls));
  const wantAt = (mod.pickDelayMs(night.picks.length - 1) + mod.PICK_STEP_MS) / 1000;
  if (!btn) fail('DraftNightCard: the Continue button carries no delay, so it is not timed off the rows');
  else {
    if (rows.length && !(btn.sec > rows[rows.length - 1].sec)) fail(`DraftNightCard: Continue lands at ${btn.sec}s, not after the last pick at ${rows[rows.length - 1].sec}s`);
    if (Math.abs(btn.sec - wantAt) > 1e-9) fail(`DraftNightCard: Continue lands at ${btn.sec}s, the rows' clock says ${wantAt}s`);
  }
  if (!/data-draft-continue/.test(html)) fail('DraftNightCard: no Continue button when the board hands over onContinue');
  const silent = mod.render(mod.DraftNightCard, { night });
  if (/data-draft-continue|Continue to the hub/.test(silent)) fail('DraftNightCard: draws a Continue button with nothing to continue to');
  console.log(`   DraftNightCard: ${night.picks.length} picks, Continue at ${btn ? btn.sec : '?'}s`);
}

/* GmPressCard: heading, title and body take three beats, then the three
   answers land on the kit's stagger, all offset by the card's own start. */
{
  const presser = {
    id: 'p1', title: 'Ownership wants answers', body: 'Two wins in eight and the noise is loud. What do you say?',
    options: [
      { label: 'We trust the process', effectLine: 'Trust +3', effect: { trust: 3, tilt: 0 } },
      { label: 'Judge us in May', effectLine: 'Trust +6, or -6 if it goes wrong', effect: { trust: 6, gamble: { gain: 6, risk: 6, odds: 0.5 }, tilt: 1 } },
      { label: 'The roster is not good enough', effectLine: 'Trust -4', effect: { trust: -4, tilt: -1 } },
    ],
  };
  const facts = ['Press conference', presser.title, presser.body,
    presser.options[0].label, 'Measured', presser.options[0].effectLine,
    presser.options[1].label, 'Candid', presser.options[1].effectLine, 'a real gamble', 'next ask gets HARDER',
    presser.options[2].label, 'Bold', presser.options[2].effectLine, 'next ask softens'];
  const html = mod.render(mod.GmPressCard, { presser, onAnswer: () => undefined, delay: 0.5 });
  const { d } = checkCard('GmPressCard', html, { facts, numbers: [presser.title, presser.body, ...presser.options.flatMap(o => [o.label, o.effectLine])], stagger: { cls: 'cm-rise', count: 6, first: 0.55 }, minAnimated: 6 });
  if (d.length >= 4 && Math.abs(d[3].sec - 1.1) > 1e-9) fail(`GmPressCard: the first answer lands at ${d[3].sec}s, expected 1.1s (the card's 0.5s start plus the kit's 0.6s)`);
}

/* SignedSlip: the club, the length and the wage are the engine's, formatted
   by the engine's own formatter. */
{
  const wage = mod.formatWage;
  const cases = [
    [{ kind: 'transfer', club: 'Rivertown FC', years: 3, wage: 45000, forCareer: {} }, ['✍️ Signed with Rivertown FC', `3 years at ${wage(45000)}`]],
    [{ kind: 'loan', club: 'Harbour Town', from: 'Rivertown FC', years: 1, wage: 30000, forCareer: {} }, ['🛫 Loan agreed: Harbour Town', `One season. Your contract and ${wage(30000)} stay with Rivertown FC`]],
    [{ kind: 'extension', club: 'Rivertown FC', years: 1, wage: 900, forCareer: {} }, ['📝 Extended at Rivertown FC', `1 year at ${wage(900)}`]],
  ];
  for (const [note, facts] of cases) {
    const html = mod.render(mod.SignedSlip, { note });
    checkCard(`SignedSlip (${note.kind})`, html, { facts, numbers: facts, minAnimated: 1 });
  }
}

/* TrophyCase: the rows are trophyLines' own grouping, most won first, with
   the years each was won. */
{
  const seasons = [{ year: 2027, awards: ['MVP', 'All-Pro'] }, { year: 2028, awards: ['All-Pro'] }, { year: 2029, awards: ['All-Pro', 'Comeback Player'] }];
  const lines = mod.trophyLines(seasons);
  const total = lines.reduce((n, l) => n + l.n, 0);
  const facts = ['2 rings', `${total} individual honours across ${seasons.length} seasons.`];
  for (const l of lines) facts.push(l.label, `x${l.n}`, l.years.join(', '));
  const html = mod.render(mod.TrophyCase, { seasons, rings: 2, ringWord: 'ring' });
  checkCard('TrophyCase', html, { facts, numbers: [2, total, seasons.length, ...seasons.map(s => s.year), ...lines.map(l => l.n)], stagger: { cls: 'cm-tick-in', count: lines.length, first: 0.2 }, minAnimated: lines.length });
}

/* FreeAgencyPanel: every offer, in the window's order, with its money, its
   length, its total (the lib's own arithmetic) and its roster number. */
{
  const offers = [
    { team: 'DAL', label: 'Dallas', salary: 32.5, years: 4, quality: 84, tier: 'contender', pitch: 'Come win now.', incumbent: true, pushed: false, gone: false },
    { team: 'CHI', label: 'Chicago', salary: 30, years: 3, quality: 77, tier: 'playoff', pitch: 'Lead a young core.', incumbent: false, pushed: true, gone: false },
    { team: 'JAX', label: 'Jacksonville', salary: 25, years: 5, quality: 66, tier: 'rebuild', pitch: 'Be the face.', incumbent: false, pushed: false, gone: true },
  ];
  const w = { offers, note: 'The market is warm for a passer your age.' };
  const talkLine = 'Dallas came up to $32.5M.';
  const facts = ['Free agency', w.note, talkLine];
  for (const o of offers) {
    facts.push(o.label);
    if (o.incumbent) facts.push('Your team');
    facts.push(mod.FA_TIER_WORD[o.tier], `$${o.salary}M x ${o.years} yr${o.years === 1 ? '' : 's'}`, `$${mod.faTotalValue(o)}M total`, `Roster ${o.quality}`);
    facts.push(o.gone ? 'Offer withdrawn.' : `"${o.pitch}"`);
    if (!o.gone) facts.push(o.pushed ? 'Talks done' : 'Push for more');
  }
  const html = mod.render(mod.FreeAgencyPanel, { window: w, sportNoun: 'franchise', talkLine, onPush: () => undefined, onSign: () => undefined });
  checkCard('FreeAgencyPanel', html, { facts, numbers: [w.note, talkLine, ...offers.flatMap(o => [o.salary, o.years, o.quality, mod.faTotalValue(o), o.pitch])], stagger: { cls: 'cm-tick-in', count: offers.length, first: 0.3 }, minAnimated: offers.length });
}

/* RivalryEventCard: the event's four strings and the head to head, top to
   bottom, with Continue last. */
{
  const event = { id: 3, emoji: '🔥', title: 'The rival calls you out', description: 'He told the press you are a system player.', consequence: 'The next meeting is worth double reputation.' };
  const headToHead = { myName: 'Tester', myRating: 82, rivalName: 'Rival', rivalRating: 79 };
  const facts = ['Rivalry', event.emoji, event.title, event.description, event.consequence, headToHead.myName, '82', 'VS', headToHead.rivalName, '79', 'Continue'];
  const html = mod.render(mod.RivalryEventCard, { event, headToHead, onContinue: () => undefined });
  const { d } = checkCard('RivalryEventCard', html, { facts, numbers: [event.title, event.description, event.consequence, 82, 79], minAnimated: 6 });
  if (d.length && Math.abs(d[d.length - 1].sec - 1.2) > 1e-9) fail(`RivalryEventCard: Continue lands at ${d[d.length - 1].sec}s with a head to head shown, expected 1.2s`);
}
console.error = realError;
console.log(`   ${cards} cards rendered, ${factsChecked} facts found in order, ${numbersHeld} printed numbers held to their fixtures`);
if (cards < 11) fail(`only ${cards} cards were rendered, the section did not really run`);

/* ---------- 3. Behaviour under vitest ---------- */
section = 3;
console.log('3) Behaviour under vitest: the last pick holds the draft until Continue, and the career hubs mount draft day');
const TESTS = ['src/components/front-office-shared/FrontOfficeSeasonClose.test.tsx', 'src/test/usCareerReveals.test.tsx'];
for (const t of TESTS) if (!fs.existsSync(path.join(ROOT, t))) fail(`${t} is missing, so its moments are unchecked`);
/* Round 530 review: with no timeout, a jsdom hang or a test waiting on a
   promise that never settles blocked this harness, and therefore runAllSims,
   for ever instead of failing. A missing binary already failed closed (status
   1, no basename in the output); a hang did not fail at all. */
const r = spawnSync(process.execPath, [path.join(ROOT, 'node_modules', 'vitest', 'vitest.mjs'), 'run', ...TESTS, '--reporter=verbose'],
  { cwd: ROOT, encoding: 'utf8', env: { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' }, maxBuffer: 64 * 1024 * 1024,
    timeout: 10 * 60 * 1000, killSignal: 'SIGKILL' });
if (r.error) fail(`vitest could not be run: ${r.error.message}`);
if (r.signal) fail(`vitest was killed with ${r.signal}, so the tests did not finish; a ten minute hang is treated as red`);
const out = (r.stdout || '') + (r.stderr || '');
for (const t of TESTS) if (!out.includes(path.basename(t))) fail(`vitest did not report on ${t}, so nothing there was checked:\n${out.slice(-1200)}`);
const summary = out.match(/Tests\s+(.+)/);
console.log(`   vitest exit ${r.status}, ${summary ? summary[1].trim() : 'no summary line'}`);
const countRows = re => out.split('\n').filter(l => re.test(l)).length;
const finalPick = countRows(/✓.*plays the next season after the draft/);
const draftDay = countRows(/✓.*mounts the draft day card/);
const coach = countRows(/✓.*coaching a season replaces/);
console.log(`   ${finalPick} front offices hold the draft after the last pick until Continue, ${draftDay} career hubs mount draft day with the engine's pick, ${coach} coach season reveal`);
if (finalPick !== 4) fail(`${finalPick} of 4 front offices passed the final pick hold`);
if (draftDay !== 4) fail(`${draftDay} of 4 career hubs passed the draft day mount`);
if (coach !== 1) fail('the coach season reveal test did not pass');
if (r.status !== 0 || countRows(/^\s*×/) > 0) {
  const lines = out.split('\n').filter(l => /×|FAIL|AssertionError|expected|Unable to find/.test(l)).slice(0, 12);
  fail('the tests are red:\n    ' + lines.join('\n    '));
}

/* ---------- Verdict ---------- */
console.log('');
const total = failures[1] + failures[2] + failures[3];
if (CONTROL) {
  const want = KNOWN[CONTROL];
  const others = Object.entries(failures).filter(([s]) => Number(s) !== want).map(([s, n]) => `section ${s}: ${n}`).join(', ');
  const bled = Object.entries(failures).some(([s, n]) => Number(s) !== want && n > 0);
  if (failures[want] > 0 && !bled) {
    console.log(`NEGATIVE CONTROL ${CONTROL}: section ${want} went red with ${failures[want]} finding(s) and the others stayed green (${others}), the check works`);
    process.exit(0);
  }
  if (failures[want] === 0) { console.error(`NEGATIVE CONTROL ${CONTROL}: section ${want} stayed green, the check is dead`); process.exit(1); }
  console.error(`NEGATIVE CONTROL ${CONTROL}: section ${want} went red but so did another (${others}), the control is not isolated`);
  process.exit(1);
}
if (total) { console.error(`simRevealMoments: ${total} FAILURE(S)`); process.exit(1); }
console.log("simRevealMoments: green. No counting number, a reduced motion rule beside every keyframe, one pace for every stagger, every fact and number on the cards is the fixture's own, and the last pick holds the draft until Continue.");
