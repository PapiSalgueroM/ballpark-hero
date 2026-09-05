/* Missing XI pitch layout, plus the two "say it before he guesses" fixes that
   shipped beside it in Round 444.

   WHY THIS EXISTS. His note: "when it comes to the lineuo itself the bubbles
   are overlapping and i dont want that". Round 319 had already been sent to
   fix that and its own comment says so, which is the whole reason this file is
   a harness and not another careful read of the JSX. A width rule that looks
   right is not a rule that has been measured, and the only way to know whether
   two bubbles overlap is to build both rectangles and intersect them.

   SECTION 1 is the measurement. It imports the REAL geometry out of
   src/lib/missingXi.ts (the same exported numbers MissingXi.tsx renders with,
   never a copy of them), builds every bubble's rectangle for every lineup in
   the file at 320, 390 and 430 CSS pixels wide, and fails on any pair whose
   rectangles overlap by more than a rounding error. Every formation the game
   can deal is covered because every lineup is covered.

   A rectangle, not a row. The Round 319 rule only ever compared a bubble
   against slots it decided were "the same row" (within 8 of its y), and a
   bubble is 26 to 36 pixels tall, which on a 320 wide phone is more than 8
   percent of the pitch. Slots 8 to 10 apart were therefore treated as
   different rows, given full width, and drawn straight through each other.
   That class of mistake cannot survive an intersection test, which is why this
   harness asks the geometric question rather than the row question.

   SECTIONS 2 and 3 keep the measurement honest rather than adding new rules.
   2: no bubble may be squeezed to nothing, because "no overlap" is trivially
   satisfiable by drawing nothing. 3: the two lines of text inside a bubble
   must fit the fixed height the model assumes, computed from the font sizes
   and line heights in the component's own classes, so a font bump cannot make
   the model quietly wrong.

   SECTIONS 4 and 5 ARE SOURCE CHECKS, NOT MEASUREMENTS, and are labelled that
   way in the output. Copy on a screen has no rectangle to measure. Section 4
   holds Rarity Round's objective ("u should explain before even putting a
   guess that your meant to guess the least chosen player and or the most
   popular player depending on the game"): the sentence must be rendered above
   the guess input and inside the "?" for BOTH modes, and its direction has to
   agree with what scoreRound and buildEmojiGrid actually reward, so the copy
   cannot survive another scoring inversion like the 2026-07-15 one. Section 5
   holds Career Ladder's club flags ("just include the flags of the country the
   team plays in"): every flag flagForClub can return must resolve to a real
   flagcdn code, and the ladder row must render it as an image rather than
   printing the emoji, which is what he was actually looking at on Windows.

   NEGATIVE CONTROLS. Each one reproduces the defect this round fixed, refuses
   to run if the text it rewrites is not there, and is judged only on the
   section it targets.
     MISSINGXI_LAYOUT_CONTROL=round319   puts the Round 319 width rule, the 3:4
                                         box and the old taller bubble back
                                         into a copy of missingXi.ts. Section 1
                                         must go red.
     MISSINGXI_LAYOUT_CONTROL=noobjective  deletes the objective from the board
                                         strip in RarityRound.tsx. Section 4
                                         must go red.
     MISSINGXI_LAYOUT_CONTROL=noflag     puts Career Ladder's raw emoji print
                                         back. Section 5 must go red.

   Line endings: a fresh checkout of this repo is CRLF, so every source read
   here is normalised before anything is matched against it. A control that
   silently matches nothing is worse than no control at all.

   Run: node scripts/simMissingXiLayout.mjs
*/
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const TMP = os.tmpdir().replaceAll('\\', '/');

const CONTROLS = ['round319', 'noobjective', 'noflag'];
const CONTROL = process.env.MISSINGXI_LAYOUT_CONTROL || '';
if (CONTROL && !CONTROLS.includes(CONTROL)) {
  console.error(`MISSINGXI_LAYOUT_CONTROL=${CONTROL} is not a control this harness knows (${CONTROLS.join(', ')})`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

/** Read a repo file with line endings normalised, so a CRLF checkout matches the same needles a LF one does. */
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8').replaceAll('\r\n', '\n');

/** Strip block and line comments, so no check is ever satisfied by the prose explaining why the check exists. */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
}

/** Refuse to run a control whose needle is not in the file: a control that changes nothing is a green that means nothing. */
function rewrite(src, from, to, label) {
  if (!src.includes(from)) {
    console.error(`control cannot run: ${label} is not in the shape this control rewrites`);
    process.exit(1);
  }
  return src.replace(from, to);
}

// ---------------------------------------------------------------------------
// Bundle the real modules
// ---------------------------------------------------------------------------
let XI_LIB = `${ROOT_URL}/src/lib/missingXi.ts`;
if (CONTROL === 'round319') {
  let src = read('src/lib/missingXi.ts');
  src = rewrite(src, 'export const PITCH_ASPECT = 0.68;', 'export const PITCH_ASPECT = 0.75;', 'PITCH_ASPECT');
  src = rewrite(src, 'export const PITCH_TILE_HEIGHT_PX = 26;', 'export const PITCH_TILE_HEIGHT_PX = 36;', 'PITCH_TILE_HEIGHT_PX');
  src = rewrite(
    src,
    'export function pitchLayout(slots: XiSlot[]): PitchTile[] {\n  const ys = slots.map(s => s.y);',
    'export function pitchLayout(slots: XiSlot[]): PitchTile[] {\n' +
    '  // CONTROL: the Round 319 rule verbatim, no vertical nudge, band of 8, floor of 15.\n' +
    '  return slots.map((slot, i) => {\n' +
    '    let nearest = 100;\n' +
    '    slots.forEach((other, j) => {\n' +
    '      if (i === j) return;\n' +
    '      if (Math.abs(other.y - slot.y) >= 8) return;\n' +
    '      nearest = Math.min(nearest, Math.abs(other.x - slot.x));\n' +
    '    });\n' +
    '    return { x: slot.x, y: slot.y, widthPct: Math.min(26, Math.max(15, nearest - 1)) };\n' +
    '  });\n' +
    '  // eslint-disable-next-line no-unreachable\n' +
    '  const ys = slots.map(s => s.y);',
    'pitchLayout',
  );
  XI_LIB = `${TMP}/missingXi.control.ts`;
  fs.writeFileSync(XI_LIB, src);
  console.log('NEGATIVE CONTROL ON: the Round 319 width rule, the 3:4 box and the 36px bubble, the shape this round replaced');
}

const ENTRY = `${TMP}/missingXiLayout.entry.mjs`;
const BUNDLE = `${TMP}/missingXiLayout.bundle.mjs`;
fs.writeFileSync(
  ENTRY,
  `export * as xi from '${XI_LIB}';\n` +
  `export * as rr from '${ROOT_URL}/src/lib/rarityRound.ts';\n` +
  `export * as cl from '${ROOT_URL}/src/lib/careerLadder.ts';\n` +
  `export * as fu from '${ROOT_URL}/src/lib/flagUtils.ts';\n`,
);
execSync(
  `"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error --alias:@=${ROOT_URL}/src`,
  { stdio: 'inherit' },
);
/* The Supabase client reads localStorage the moment it is constructed, and
   these libs import it for their fetch paths. Nothing here touches the
   network; the shim just lets the module graph load under node. */
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const { xi, rr, cl, fu } = await import(pathToFileURL(BUNDLE).href);

const {
  LINEUPS,
  pitchBoxSize,
  pitchLayout,
  PITCH_TILE_HEIGHT_PX,
  PITCH_ASPECT,
  PITCH_ROW_BAND_PCT,
  PITCH_TILE_GAP_PCT,
  PITCH_CLEARANCE_PX,
  PITCH_MIN_VIEWPORT_PX,
  PITCH_BORDER_PX,
  PITCH_TILE_MIN_WIDTH_PX,
} = xi;

const WIDTHS = [320, 390, 430];

console.log('=== Missing XI pitch layout (Round 444) ===');
console.log(
  `lineups ${LINEUPS.length}, formations ${new Set(LINEUPS.map(l => l.formationLabel)).size}, ` +
  `aspect ${PITCH_ASPECT}, bubble ${PITCH_TILE_HEIGHT_PX}px, band ${PITCH_ROW_BAND_PCT.toFixed(3)}%, ` +
  `side gap ${PITCH_TILE_GAP_PCT.toFixed(3)}%`,
);

/** Every bubble's rectangle in CSS pixels, exactly as the component draws it: left/top are percentages of the padding box, and the -translate-1/2 pair centres the box on that point. */
function rects(lineup, viewportPx) {
  const box = pitchBoxSize(viewportPx);
  const tiles = pitchLayout(lineup.slots);
  return lineup.slots.map((slot, i) => {
    const cx = (tiles[i].x / 100) * box.width;
    const cy = (tiles[i].y / 100) * box.height;
    const w = (tiles[i].widthPct / 100) * box.width;
    const h = PITCH_TILE_HEIGHT_PX;
    return { i, name: slot.name, position: slot.position, w, h, x0: cx - w / 2, x1: cx + w / 2, y0: cy - h / 2, y1: cy + h / 2, box };
  });
}

// ---------------------------------------------------------------------------
// 1. No two bubbles overlap, at any supported width, in any lineup
// ---------------------------------------------------------------------------
console.log('\n[1] MEASURED: no two name bubbles intersect');
const EPS = 1e-9;
for (const viewportPx of WIDTHS) {
  let pairs = 0;
  let worst = 0;
  let worstWhere = '';
  let tightest = Infinity;
  let tightestWhere = '';
  for (const lineup of LINEUPS) {
    const rs = rects(lineup, viewportPx);
    for (let a = 0; a < rs.length; a++) {
      for (let b = a + 1; b < rs.length; b++) {
        const dx = Math.min(rs[a].x1, rs[b].x1) - Math.max(rs[a].x0, rs[b].x0);
        const dy = Math.min(rs[a].y1, rs[b].y1) - Math.max(rs[a].y0, rs[b].y0);
        if (dx > EPS && dy > EPS) {
          pairs += 1;
          const area = Math.min(dx, dy);
          if (area > worst) {
            worst = area;
            worstWhere = `${lineup.id}: ${rs[a].position} ${rs[a].name} x ${rs[b].position} ${rs[b].name}`;
          }
        } else {
          // Clearance is the larger of the two axis gaps: the bubbles are apart
          // as soon as either axis separates them.
          const clear = Math.max(-dx, -dy);
          if (clear < tightest) {
            tightest = clear;
            tightestWhere = `${lineup.id}: ${rs[a].position} x ${rs[b].position}`;
          }
        }
      }
    }
  }
  const box = pitchBoxSize(viewportPx);
  console.log(
    `  ${viewportPx}px wide -> pitch ${box.width.toFixed(1)}x${box.height.toFixed(1)}, ` +
    `overlapping pairs ${pairs}, tightest clearance ${tightest === Infinity ? 'n/a' : tightest.toFixed(2) + 'px'} (${tightestWhere})`,
  );
  if (pairs > 0) fail(`${pairs} overlapping bubble pairs at ${viewportPx}px, worst ${worst.toFixed(1)}px into each other (${worstWhere})`);
}

// ---------------------------------------------------------------------------
// 2. No bubble is squeezed out of existence, and none is clipped by the pitch
// ---------------------------------------------------------------------------
console.log('\n[2] MEASURED: every bubble is still drawn, and inside the pitch');
{
  let narrowest = Infinity;
  let narrowestWhere = '';
  let outside = 0;
  let worstBleed = 0;
  for (const viewportPx of WIDTHS) {
    for (const lineup of LINEUPS) {
      const rs = rects(lineup, viewportPx);
      for (const r of rs) {
        if (r.w < narrowest) { narrowest = r.w; narrowestWhere = `${lineup.id} ${r.position} ${r.name} at ${viewportPx}px`; }
        const bleed = Math.max(-r.x0, r.x1 - r.box.width, -r.y0, r.y1 - r.box.height);
        if (bleed > EPS) { outside += 1; worstBleed = Math.max(worstBleed, bleed); }
      }
    }
  }
  console.log(
    `  narrowest bubble ${narrowest.toFixed(1)}px (${narrowestWhere}), floor is ${PITCH_TILE_MIN_WIDTH_PX}px; ` +
    `bubbles crossing the pitch edge ${outside}`,
  );
  /* The floor is the library's own PITCH_TILE_MIN_WIDTH_PX, which is what the
     vertical nudge is there to protect. It is not a number this harness picked:
     shrink-only layout put three bubbles at 24.4px, which is a character and a
     half, and that is the defect this check exists to catch coming back. */
  if (narrowest < PITCH_TILE_MIN_WIDTH_PX - EPS) {
    fail(`a bubble is only ${narrowest.toFixed(1)}px wide (${narrowestWhere}), under the ${PITCH_TILE_MIN_WIDTH_PX}px floor, so it cannot even show its position label`);
  }
  if (outside > 0) fail(`${outside} bubbles cross the pitch edge, worst by ${worstBleed.toFixed(1)}px, and the pitch is overflow-hidden so they get clipped`);
}

// ---------------------------------------------------------------------------
// 2b. The vertical nudge stays small and never reorders the pitch
// ---------------------------------------------------------------------------
console.log('\n[2b] MEASURED: the vertical nudge is small and keeps the formation in order');
{
  let biggest = 0;
  let biggestWhere = '';
  let nudged = 0;
  let swaps = 0;
  const box = pitchBoxSize(PITCH_MIN_VIEWPORT_PX);
  for (const lineup of LINEUPS) {
    const tiles = pitchLayout(lineup.slots);
    for (let i = 0; i < tiles.length; i++) {
      const moved = Math.abs(tiles[i].y - lineup.slots[i].y);
      if (moved > EPS) nudged += 1;
      if (moved > biggest) { biggest = moved; biggestWhere = `${lineup.id} ${lineup.slots[i].position} ${lineup.slots[i].name}`; }
      for (let j = i + 1; j < tiles.length; j++) {
        const before = Math.sign(lineup.slots[i].y - lineup.slots[j].y);
        const after = Math.sign(tiles[i].y - tiles[j].y);
        if (before !== 0 && after !== 0 && before !== after) swaps += 1;
      }
    }
  }
  console.log(
    `  ${nudged} of ${LINEUPS.reduce((n, l) => n + l.slots.length, 0)} bubbles moved at all, ` +
    `largest ${biggest.toFixed(2)}% (${(biggest / 100 * box.height).toFixed(1)}px at 320) on ${biggestWhere}, order swaps ${swaps}`,
  );
  if (swaps > 0) fail(`${swaps} pairs of slots swapped their front-to-back order, so the nudge is redrawing the formation`);
  /* Half a band is the most a symmetric push can ever need for one pair, so
     anything past a whole band means the relaxation is fighting itself across
     several pairs rather than settling. */
  if (biggest > PITCH_ROW_BAND_PCT) {
    fail(`a slot moved ${biggest.toFixed(2)}%, more than the whole ${PITCH_ROW_BAND_PCT.toFixed(2)}% band (${biggestWhere}), which is a runaway relaxation`);
  }
}

// ---------------------------------------------------------------------------
// 3. The bubble's own text fits the fixed height the model assumes
// ---------------------------------------------------------------------------
console.log('\n[3] MEASURED: the two lines of text fit inside the fixed bubble height');
{
  const page = stripComments(read('src/pages/MissingXi.tsx'));
  const nameLine = page.match(/text-\[(\d+)px\](?:[^'"]*?)md:text-\[(\d+)px\] font-bold leading-\[([\d.]+)\]/);
  const posLine = page.match(/text-\[(\d+)px\] leading-\[([\d.]+)\] text-\[hsl/);
  if (!nameLine || !posLine) {
    fail('cannot read the bubble text classes out of MissingXi.tsx, so the height model is unverified');
  } else {
    const [, nameSm, nameMd, nameLead] = nameLine.map(Number);
    const [, posSize, posLead] = posLine.map(Number);
    const content = PITCH_TILE_HEIGHT_PX - 2; // border on the tile, box-sizing is border-box sitewide
    const small = nameSm * nameLead + posSize * posLead;
    const desktop = nameMd * nameLead + posSize * posLead;
    console.log(
      `  name ${nameSm}px (md ${nameMd}px) at ${nameLead}, position ${posSize}px at ${posLead} -> ` +
      `${small.toFixed(2)}px phone / ${desktop.toFixed(2)}px desktop inside ${content}px of content box`,
    );
    if (small > content) fail(`the phone text stack is ${small.toFixed(2)}px inside a ${content}px bubble, so it is clipped`);
    if (desktop > content) fail(`the desktop text stack is ${desktop.toFixed(2)}px inside a ${content}px bubble, so it is clipped`);
  }
}

// ---------------------------------------------------------------------------
// 4. SOURCE CHECK: Rarity Round states the objective before the first guess
// ---------------------------------------------------------------------------
console.log('\n[4] SOURCE CHECK (not a measurement): Rarity Round says the goal before the guess');
{
  let page = read('src/pages/RarityRound.tsx');
  if (CONTROL === 'noobjective') {
    /* The failure this check exists to catch is the objective living ONLY
       behind the "?" button, which is where a tidy-up would put it back. So
       the control takes the board strip out and leaves the popup alone. */
    page = rewrite(
      page,
      '                  {modeEmoji} {modeLabel}: {objectiveLine(rarityMode)}',
      '                  {modeEmoji} {modeLabel}',
      'the RarityRound board strip',
    );
    console.log('  NEGATIVE CONTROL ON: the objective is only behind the "?" button now');
  }
  const code = stripComments(page);

  /* The "?" is a click away, so it does not count as "before even putting a
     guess". Cut it out and ask the rest of the page the question. */
  const helpStart = code.indexOf('<HowToPlayPopover');
  const helpEnd = code.indexOf('</HowToPlayPopover>');
  if (helpStart === -1 || helpEnd === -1) fail('cannot find the HowToPlayPopover block in RarityRound.tsx');
  const help = code.slice(helpStart, helpEnd);
  const visible = code.slice(0, helpStart) + code.slice(helpEnd);

  const objIdx = visible.indexOf('objectiveLine(rarityMode)');
  const inputIdx = visible.indexOf('<PlayerAutocomplete');
  if (objIdx === -1) fail('nothing outside the "?" popup states the objective, so a player reaches the guess box without being told which way points run');
  else if (inputIdx === -1) fail('RarityRound.tsx has no PlayerAutocomplete, so this check cannot locate the guess input');
  else if (objIdx > inputIdx) fail('the objective is rendered after the guess input, which is not "before even putting a guess"');
  else console.log(`  objective on the page itself at char ${objIdx}, guess input at char ${inputIdx}`);

  if (!help.includes('objectiveLine(rarityMode)')) fail('the floating "?" does not carry the objective');
  else console.log('  the "?" carries the same objectiveLine call');

  if (!/<p className="text-sm font-bold text-primary">\s*\{modeEmoji\} \{modeLabel\}: \{objectiveLine\(rarityMode\)\}/.test(visible)) {
    fail('the board strip above the search box no longer renders the objective');
  }
  /* The header line sits above the mode toggle, before a mode is picked, so
     its job is to name both modes. It is hand written prose rather than
     derived copy, so the one thing worth pinning is that it still names them. */
  if (!visible.includes('subtitle={goalLine}')) fail('goalLine is built but never passed to the shell');
  const header = visible.match(/const goalLine = `([^`]*)`/);
  if (!header) fail('cannot read the header line out of RarityRound.tsx');
  else if (!header[1].includes("modeName('rarity')") || !header[1].includes("modeName('crowd')")) {
    fail('the header line above the mode toggle no longer names both modes, so a first-timer picks a mode blind');
  } else console.log('  the header line above the toggle names both modes');

  /* The copy has to agree with the scoring, and the scoring is the authority.
     buildEmojiGrid is where "good" is defined per mode (it fills squares by
     goodness), so the best rank is derived from it rather than assumed, and
     then the words are checked against it. This is what stops a repeat of the
     2026-07-15 inversion, where the game rewarded the exact opposite of what
     it told you to do. */
  const POOL = 50;
  for (const mode of ['rarity', 'crowd']) {
    let bestRank = 0;
    let bestGreen = -1;
    for (let rank = 1; rank <= POOL; rank++) {
      const points = rr.scoreRound(rank, POOL, mode);
      const green = (rr.buildEmojiGrid([{ categoryId: 'x', prompt: 'x', answerName: 'x', rank, poolSize: POOL, points }], mode).match(/🟩/g) || []).length;
      if (green > bestGreen) { bestGreen = green; bestRank = rank; }
    }
    const line = rr.objectiveLine(mode);
    const wantsObscure = bestRank > POOL / 2;
    const says = /FEWEST/.test(line) ? 'obscure' : /MOST/.test(line) ? 'famous' : 'neither';
    console.log(`  ${rr.modeName(mode)}: best rank of ${POOL} is ${bestRank} (${wantsObscure ? 'obscure' : 'famous'} end), copy asks for the ${says} end`);
    if (says === 'neither') fail(`objectiveLine('${mode}') does not say which end of the pool to aim at: "${line}"`);
    else if (wantsObscure !== (says === 'obscure')) fail(`objectiveLine('${mode}') tells the player to aim at the ${says} end, but the scoring rewards the other end`);
    if (!/point/i.test(line)) fail(`objectiveLine('${mode}') never says which way the points run: "${line}"`);
  }
  if (rr.objectiveLine('rarity') === rr.objectiveLine('crowd')) fail('both modes state the same objective, so the mode is not explained');
}

// ---------------------------------------------------------------------------
// 5. SOURCE CHECK: Career Ladder shows the club's country as a real flag
// ---------------------------------------------------------------------------
console.log('\n[5] SOURCE CHECK (not a measurement): Career Ladder renders club flags as images');
{
  let page = read('src/pages/CareerLadder.tsx');
  if (CONTROL === 'noflag') {
    page = rewrite(
      page,
      '<FlagFromEmoji emoji={flagForClub(s.club)} size={16} />',
      '{flagForClub(s.club)}',
      'the CareerLadder stint row flag',
    );
    console.log('  NEGATIVE CONTROL ON: the ladder prints the raw flag emoji again');
  }
  const code = stripComments(page);
  if (!/import\s*\{[^}]*FlagFromEmoji[^}]*\}\s*from\s*'@\/components\/FlagImg'/.test(code)) {
    fail('CareerLadder.tsx does not import FlagFromEmoji, so the ladder cannot draw a flag image');
  }
  if (!/<FlagFromEmoji\s+emoji=\{flagForClub\(s\.club\)\}/.test(code)) {
    fail('the ladder row does not render the club flag through FlagFromEmoji');
  } else {
    console.log('  the stint row renders flagForClub through FlagFromEmoji');
  }
  /* The raw emoji print is what he was looking at: Windows has no flag font,
     so a regional indicator pair comes out as two letters. It must not come
     back. The FlagFromEmoji elements are removed first so the emoji prop
     inside them is not mistaken for a text print. */
  if (/\{flagForClub\(s\.club\)\}/.test(code.replace(/<FlagFromEmoji[^>]*\/>/g, ''))) {
    fail('the ladder still prints the flag emoji as text, which renders as letters on Windows');
  }

  /* MEASURED inside a source check: every flag either table can return has to
     be a flag FlagFromEmoji can turn into a flagcdn code. A stray glyph in
     those tables would print as text and nobody would notice. */
  const flags = new Set();
  for (const [, flag] of cl.COUNTRY_FLAGS ?? []) flags.add(flag);
  for (const [, flag] of cl.CLUB_COUNTRY ?? []) flags.add(flag);
  if (flags.size === 0) fail('could not read the flag tables out of careerLadder.ts, so nothing was checked');
  const unresolved = [...flags].filter(f => !fu.flagEmojiToIso(f));
  console.log(`  ${flags.size} distinct flags in the club tables, ${flags.size - unresolved.length} resolve to a flagcdn code`);
  if (unresolved.length) fail(`${unresolved.length} club-table flags do not resolve to a flagcdn code: ${unresolved.join(' ')}`);

  /* And the same for the club strings the repo actually holds: Missing XI's
     lineups carry real club names, so they are a free sample of what
     flagForClub sees. Unknown clubs correctly get nothing; the check is that
     nothing it DOES answer is unrenderable. */
  const clubs = new Set();
  for (const l of LINEUPS) {
    clubs.add(l.team);
    clubs.add(l.opponent);
    for (const c of l.blankCandidates) clubs.add(c.clubAtTime);
  }
  const answered = [...clubs].map(c => cl.flagForClub(c)).filter(Boolean);
  const bad = answered.filter(f => !fu.flagEmojiToIso(f));
  console.log(`  ${answered.length} of ${clubs.size} real club strings get a flag, ${answered.length - bad.length} of those render as an image`);
  if (bad.length) fail(`${bad.length} clubs get a flag that cannot be drawn as an image`);
}

// ---------------------------------------------------------------------------
// 6. SOURCE CHECK: the component draws with the numbers this harness measured
// ---------------------------------------------------------------------------
console.log('\n[6] SOURCE CHECK (not a measurement): the page uses these exact numbers');
{
  const code = stripComments(read('src/pages/MissingXi.tsx'));
  const pins = [
    ['pitchLayout(lineup.slots)', 'the layout rule'],
    ['left: `${tile.x}%`, top: `${tile.y}%`, width: `${tile.widthPct}%`', 'the nudged position and the derived width'],
    ['style={{ aspectRatio: PITCH_ASPECT }}', 'the box aspect'],
    ['style={{ height: PITCH_TILE_HEIGHT_PX }}', 'the fixed bubble height'],
    ['max-w-md mx-auto', 'the max-w-md cap pitchBoxSize assumes'],
    ['border-2', 'the 2px border pitchBoxSize subtracts'],
  ];
  for (const [needle, what] of pins) {
    if (!code.includes(needle)) fail(`MissingXi.tsx no longer carries ${what} ("${needle}"), so this harness is measuring something the page does not draw`);
  }
  if (!code.includes('width="wide"')) fail('MissingXi.tsx is no longer a wide shell, so pitchBoxSize\'s max-w-4xl column is wrong');
  if (/aspect-\[3\/4\]/.test(code)) fail('the 3:4 pitch class is back, which fights the aspectRatio style');
  console.log(`  ${pins.length + 1} layout pins present, border ${PITCH_BORDER_PX}px, clearance ${PITCH_CLEARANCE_PX}px, narrowest supported screen ${PITCH_MIN_VIEWPORT_PX}px`);
}

console.log('');
if (failures) {
  console.error(`simMissingXiLayout: ${failures} failure(s)`);
  process.exit(1);
}
console.log('simMissingXiLayout: all sections green');
