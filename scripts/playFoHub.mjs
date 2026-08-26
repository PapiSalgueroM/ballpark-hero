/**
 * Round 204 browser walk: the tile hub, in all four front offices.
 *
 * simFoHub proves the engine says the right words. This proves the words
 * reach the screen, that every box opens the thing it names, that the way
 * back exists, and that the four games really do behave the same, which is
 * the whole point of the sitewide reformat.
 *
 * The parts that only a browser can answer:
 *  - the grid replaces itself on open rather than unrolling, so the hub
 *    stays one screen tall on a phone;
 *  - the box the walk taps is the panel that appears;
 *  - the boxes carry live state, checked by doctoring a save and watching
 *    the roster box change what it says;
 *  - nothing hangs off the side at 390px, the Round 203 rule.
 *
 * Run: npm run build && npx serve -s dist -l 4173, then
 *      ENGINES=chromium node scripts/playFoHub.mjs
 */
import pw from './lib/playwrightLoader.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';

let failures = 0;
const say = (ok, what) => {
  console.log((ok ? '  PASS  ' : '  FAIL  ') + what);
  if (!ok) failures += 1;
};

const DESKS = [
  { route: '/front-office', key: 'front-office-save-v1', name: 'NFL', play: 'This week', panel: /Play Week|Play the final week|Bye week/ },
  { route: '/mlb-front-office', key: 'mlb-front-office-save-v1', name: 'MLB', play: 'Play', panel: /Play Round|Final stretch/ },
  { route: '/nba-front-office', key: 'nba-front-office-save-v1', name: 'NBA', play: 'Play', panel: /Play Round|Final stretch/ },
  { route: '/nhl-front-office', key: 'nhl-front-office-save-v1', name: 'NHL', play: 'Play', panel: /Play Round|Final stretch/ },
];

/* Each box, and a string that only appears once that box is open. */
const BOXES = [
  /* Each sport's own word for letting a man go: cut, waive, DFA. */
  ['Roster', /Cut|Waive|Release|DFA/],
  ['Free agency', /Free agents/],
  ['Trades', /build your own deal|Shop him|trade/i],
  ['Standings', /-\d/],
];

/** One box on the hub, by the word on it. Boxes only: see the note below. */
const tile = (page, word) =>
  page.locator('button:has(div.uppercase)').filter({ hasText: new RegExp(word, 'i') }).first();

const browser = await chromium.launch();

for (const desk of DESKS) {
  console.log(`${desk.name} front office`);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));

  await page.goto(`${BASE}${desk.route}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1100);
  const consent = page.locator('button:has-text("Essential only")');
  if (await consent.count()) { await consent.first().click().catch(() => {}); await page.waitForTimeout(300); }
  /* Take the first franchise on the pick screen. */
  await page.locator('.grid button').first().click();
  await page.waitForTimeout(900);

  /* ---- the hub is boxes, and the pills are gone ---- */
  const tiles = page.locator('button:has(div.uppercase)');
  const nTiles = await tiles.count();
  say(nTiles === 5, `${desk.name}: the hub opens on five boxes (saw ${nTiles})`);
  /* The box captions are uppercased by CSS, and CSS uppercase changes what
     innerText returns, so every read of them here is caseless on purpose. */
  const hubText = (await page.locator('body').innerText()).toLowerCase();
  for (const [word] of BOXES) {
    say(hubText.includes(word.toLowerCase()), `${desk.name}: the hub names "${word}"`);
  }
  say(hubText.includes(desk.play.toLowerCase()), `${desk.name}: the hub names "${desk.play}"`);
  /* Every box carries a headline AND a second line, not just a word. */
  const filled = await page.evaluate(() => {
    const out = [];
    for (const b of Array.from(document.querySelectorAll('button'))) {
      const cap = b.querySelector('div.uppercase');
      if (!cap) continue;
      const lines = Array.from(b.querySelectorAll('div')).map(d => (d.textContent ?? '').trim()).filter(Boolean);
      out.push({ title: (cap.textContent ?? '').trim(), lines: lines.length });
    }
    return out;
  });
  say(filled.length === 5 && filled.every(f => f.lines >= 3),
    `${desk.name}: every box carries a fact, not just a label (${filled.map(f => `${f.title}:${f.lines}`).join(' ')})`);

  /* ---- nothing hangs off the side at phone width (Round 203's rule) ---- */
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  say(overflow <= 2, `${desk.name}: the hub fits the phone (${overflow}px of horizontal overflow)`);

  /* ---- each box opens its own screen, and the way back works ---- */
  for (const [word, marker] of BOXES) {
    /* Scoped to the boxes themselves. The owner card and the presser sit
       above the grid and their answer buttons quote words like "roster",
       so a bare text locator picks the wrong control. */
    await tile(page, word).click();
    await page.waitForTimeout(500);
    const openText = await page.locator('body').innerText();
    say(marker.test(openText), `${desk.name}: "${word}" opened the screen it names`);
    /* The grid is replaced, not unrolled: this is the no scroll rule. */
    const stillTiles = await page.locator('button:has(div.uppercase)').count();
    say(stillTiles === 0, `${desk.name}: opening "${word}" replaced the grid (${stillTiles} boxes still up)`);
    const back = page.locator('button:has-text("Hub")');
    say(await back.count() === 1, `${desk.name}: "${word}" has a way back`);
    /* Round 203: a thumb needs 30px. The back control is the one new
       control this round adds, so it is measured rather than assumed. */
    const box = await back.first().boundingBox();
    say(!!box && box.height >= 30, `${desk.name}: the back control is thumb sized (${Math.round(box?.height ?? 0)}px)`);
    await back.first().click();
    await page.waitForTimeout(400);
    say(await page.locator('button:has(div.uppercase)').count() === 5, `${desk.name}: back returned to all five boxes`);
  }

  /* ---- the play box reaches the button you came for ---- */
  await tile(page, desk.play).click();
  await page.waitForTimeout(500);
  say(desk.panel.test(await page.locator('body').innerText()), `${desk.name}: the play box reaches the play button`);
  await page.locator('button:has-text("Hub")').first().click();
  await page.waitForTimeout(400);

  /* ---- the boxes are live, not decoration ---- */
  {
    /* Injure the best man on the roster and the roster box must change
       what it says, name him, and light up. */
    const hurtName = await page.evaluate(key => {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const s = JSON.parse(raw);
      const squad = s.league.teams[s.myTeam].players;
      for (const p of squad) p.out = 0;
      const star = [...squad].sort((a, b) => b.ovr - a.ovr)[0];
      star.out = 3;
      localStorage.setItem(key, JSON.stringify(s));
      return star.name;
    }, desk.key);
    if (!hurtName) {
      say(false, `${desk.name}: no save to doctor, the live check could not run`);
    } else {
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(1200);
      const rosterBox = tile(page, 'Roster');
      const t = await rosterBox.innerText();
      say(/1 unavailable/.test(t), `${desk.name}: the roster box counted the injury (reads "${t.replace(/\n/g, ' / ')}")`);
      say(t.includes(hurtName), `${desk.name}: the roster box names ${hurtName}`);
      const lit = await rosterBox.locator('span.animate-pulse').count();
      say(lit === 1, `${desk.name}: an injury lights the box (${lit} dots)`);
      /* And a fit squad puts the dot out again. */
      await page.evaluate(key => {
        const s = JSON.parse(localStorage.getItem(key));
        for (const p of s.league.teams[s.myTeam].players) p.out = 0;
        localStorage.setItem(key, JSON.stringify(s));
      }, desk.key);
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(1200);
      const fitBox = tile(page, 'Roster');
      say(await fitBox.locator('span.animate-pulse').count() === 0, `${desk.name}: a fit squad puts the dot out`);
      say(/under contract/.test(await fitBox.innerText()), `${desk.name}: a fit squad counts the contracts instead`);
    }
  }

  const real = errors.filter(e => !/supabase|Failed to fetch|CORS/i.test(e));
  say(real.length === 0, `${desk.name}: no page errors on the walk (${real.length ? real[0] : 'clean'})`);
  await ctx.close();
}

await browser.close();
console.log('');
if (failures > 0) {
  console.error(`playFoHub: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('playFoHub: green. Four front offices, five live boxes each, every one of them opening what it names.');
