// REVIEW-run Round 1306: a player's walk of Club Manager on the served build, at 390x844 and 1280x900,
// reduced motion on and off. The round says nothing a player sees changes, so the walk looks for breakage,
// for anything NEW on a screen, and for what the save holds after a match week (the book: whole, late, repaired).
// BASE is the head's build. BASE2 (optional) is the base commit's build: one seeded session is played on both.
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium } = pw;
const BASE = process.env.BASE || process.env.SWEEP_BASE || 'http://localhost:4173';
const BASE2 = process.env.BASE2 || '';
const OUT = process.env.RC_OUT || '.';
const KEY = 'dukb-club-manager-save';
fs.mkdirSync(OUT, { recursive: true });
let failures = 0;
const fail = m => { failures += 1; console.log('  FAIL: ' + m); };
const ok = m => console.log('  ok    ' + m);
const NEW_WORDS = /League leaders|Counting from round|Past winners|Team of the season|covers only part of this league|No league book/i;

/** The first law, read off the saved text the way the page wrote it. */
function law(s) {
  const b = s?.leagueBook;
  if (!b || typeof b !== 'object' || Array.isArray(b) || !b.c || typeof b.c !== 'object') return { has: false };
  let misfit = 0, rows = 0, unnamed = 0;
  for (const club of s.leagueClubs.filter(c => c !== s.clubName)) {
    const e = b.c[club];
    const r = e && e.m ? Object.values(e.m).reduce((n, row) => n + (Array.isArray(row) ? row[0] : NaN), 0) : 0;
    rows += r; unnamed += e?.u ?? 0;
    if (r + (e?.og ?? 0) + (e?.u ?? 0) !== (s.table.find(t => t.club === club)?.gf ?? 0)) misfit += 1;
  }
  return { has: true, misfit, r0: b.r0, u0: b.u0, base: b.b, rows, unnamed };
}
const nextLeagueRound = s => s.calendar.slice(s.week).find(e => e.type === 'league')?.round ?? null;

async function open(browser, vp, motion, seed) {
  const context = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, isMobile: vp.w < 600, hasTouch: vp.w < 600, reducedMotion: motion });
  await context.route(/supabase\.co/, r => r.abort());
  if (seed !== undefined) {
    await context.addInitScript(seed0 => {
      let a = seed0 >>> 0;
      Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    }, seed);
  }
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e?.message ?? e)));
  const h = {
    page, context, errors,
    text: async () => (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').trim(),
    heading: async () => ((await page.locator('h1').first().innerText().catch(() => '')) || '').trim().toUpperCase(),
    tap: async rx => { const b = page.getByRole('button', { name: rx }).first(); if (await b.count().catch(() => 0) === 0) return false; return b.click({ timeout: 4000 }).then(() => true).catch(() => false); },
    tapText: async rx => { const b = page.locator('button:visible').filter({ hasText: rx }).first(); if (await b.count().catch(() => 0) === 0) return false; return b.click({ timeout: 4000 }).then(() => true).catch(() => false); },
    clearRoom: async () => {
      await page.getByRole('button', { name: /^essential only$/i }).first().click({ timeout: 1200 }).catch(() => {});
      for (let i = 0; i < 3; i++) { if (await page.locator('[role="dialog"][data-state="open"]').count().catch(() => 0) === 0) break; await page.keyboard.press('Escape').catch(() => {}); await page.waitForTimeout(250); }
    },
    saved: async () => page.evaluate(k => { const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) : null; }, KEY),
    shot: async name => { await page.screenshot({ path: path.join(OUT, `${name}.png`) }).catch(() => {}); },
    /** Put one save into an otherwise empty store and load the game on it. */
    seedSave: async (base, save) => {
      await page.goto(base + '/', { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.evaluate(([k, v]) => { localStorage.clear(); localStorage.setItem(k, v); }, [KEY, JSON.stringify(save)]);
      await page.goto(base + '/club-manager', { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(1200);
      await h.clearRoom();
    },
    /** Take a Premier League job from the picker, the way playClubManagerSaveLeave does. */
    takeJob: async base => {
      await page.goto(base + '/club-manager', { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(1000);
      await h.clearRoom();
      await h.tap(/2026-27/i);
      await page.getByRole('button', { name: /England/i }).first().waitFor({ timeout: 8000 }).catch(() => {});
      await h.tap(/England/i);
      await page.getByRole('button', { name: /Premier League/i }).first().waitFor({ timeout: 8000 }).catch(() => {});
      await h.tap(/Premier League/i);
      const clubBtn = page.locator('button').filter({ hasText: /Everton|Fulham|Brentford|Crystal Palace|Wolves|Brighton/ }).first();
      await clubBtn.waitFor({ timeout: 8000 }).catch(() => {});
      await clubBtn.click({ timeout: 5000 }).catch(() => {});
      await h.tap(/take the job|confirm|start/i);
      await page.getByText(/who is in the dugout/i).first().waitFor({ timeout: 8000 }).catch(() => {});
      await h.tap(/skip: just manage/i);
      await page.waitForTimeout(800);
      return /Season 1/i.test(await h.text());
    },
    /** Play on until the save's week has moved by `weeks`; `live` plays the next match through its two halves. */
    play: async (weeks, live = false) => {
      const from = (await h.saved())?.week ?? 0;
      let usedLive = false;
      for (let step = 0; step < 60; step++) {
        const where = await h.heading();
        if (where === 'FULL TIME') { await h.tap(/continue|next|carry on|ok/i); await page.waitForTimeout(500); continue; }
        if (where === 'HALF TIME' || where === 'MATCH LIVE') { await h.tap(/second half|skip|full report/i); await page.waitForTimeout(600); continue; }
        if (((await h.saved())?.week ?? 0) >= from + weeks) return usedLive ? 'live' : true;
        await page.getByRole('tab', { name: /^Home$/i }).first().click({ timeout: 1500 }).catch(() => {});
        if (live && !usedLive && await h.tapText(/Play Live|Play Match/i)) { usedLive = true; await page.waitForTimeout(1200); continue; }
        if (await h.tapText(/Quick Sim/i)) { await page.waitForTimeout(900); continue; }
        if (await h.tapText(/Play Live|Play Match|Continue|Next|Advance/i)) { await page.waitForTimeout(900); continue; }
        await h.clearRoom();
        await page.waitForTimeout(400);
      }
      return ((await h.saved())?.week ?? 0) >= from + weeks ? (usedLive ? 'live' : true) : false;
    },
    /** Open the Stats desk from the hub, hand back its text, and come back. */
    stats: async name => {
      await page.getByRole('tab', { name: /^Home$/i }).first().click({ timeout: 1500 }).catch(() => {});
      const tile = page.locator('button:visible').filter({ hasText: /Stats/ }).filter({ hasText: /goals|Goals/ }).first();
      if (await tile.count().catch(() => 0) === 0) return null;
      await tile.click({ timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(700);
      const t = await h.text();
      if (name) await h.shot(name);
      const wide = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      await h.tapText(/Club home/i);
      await page.waitForTimeout(400);
      return { t, wide };
    },
  };
  return h;
}

const browser = await chromium.launch();
const CONFIGS = [
  { w: 390, h: 844, motion: 'no-preference' }, { w: 390, h: 844, motion: 'reduce' },
  { w: 1280, h: 900, motion: 'no-preference' }, { w: 1280, h: 900, motion: 'reduce' },
];
const oldFixture = JSON.parse(fs.readFileSync('scripts/data/cmSecondTierOldSaveFixture.json', 'utf8'));
try {
  for (const cfg of CONFIGS) {
    const tag = `${cfg.w}-${cfg.motion === 'reduce' ? 'rm' : 'motion'}`;
    console.log(`\n=== ${cfg.w}x${cfg.h}, reduced motion ${cfg.motion === 'reduce' ? 'ON' : 'off'} ===`);
    const h = await open(browser, cfg, cfg.motion);
    /* S1: a fresh career. Its book is whole and fits after every week; the Stats desk shows nothing new. */
    if (!await h.takeJob(BASE)) { fail(`${tag} S1: could not take a job from the picker: ${(await h.text()).slice(0, 160)}`); await h.shot(`s1-${tag}-blocked`); await h.context.close(); continue; }
    let s = await h.saved();
    let l = law(s);
    if (!l.has || l.misfit || l.r0 !== undefined) fail(`${tag} S1: a new career does not start on a whole book that fits (${JSON.stringify(l)})`); else ok(`${tag} S1: in the job at ${s.clubName}, a whole book that fits`);
    await h.shot(`s1-${tag}-hub`);
    if (!await h.play(3)) fail(`${tag} S1: three weeks could not be played: ${(await h.text()).slice(0, 160)}`);
    s = await h.saved(); l = law(s);
    if (!l.has || l.misfit || l.r0 !== undefined) fail(`${tag} S1: after three weeks the book is not whole and fitting (${JSON.stringify({ ...l, base: undefined })})`); else ok(`${tag} S1: week ${s.week}, the book is whole and fits (${l.rows} goals on rows, ${l.unnamed} unnamed)`);
    let st = await h.stats(`s1-${tag}-stats`);
    if (!st) fail(`${tag} S1: the Stats tile was not found on the hub`);
    else {
      if (NEW_WORDS.test(st.t)) fail(`${tag} S1: the Stats desk shows words the round says it does not show yet: ${st.t.match(NEW_WORDS)[0]}`);
      if (!/Golden boot/i.test(st.t)) fail(`${tag} S1: the Stats desk no longer shows the Golden boot race`);
      if (st.wide > 1) fail(`${tag} S1: the Stats desk scrolls sideways by ${st.wide}px`);
      ok(`${tag} S1: the Stats desk shows the Golden boot and nothing new (${st.t.length} characters)`);
    }
    /* S2: the same save as a save from before the book (the book taken out), loaded and played on. */
    const old = JSON.parse(JSON.stringify(s)); delete old.leagueBook;
    const round = nextLeagueRound(old);
    const gfThen = old.leagueClubs.filter(c => c !== old.clubName).reduce((n, c) => n + (old.table.find(t => t.club === c)?.gf ?? 0), 0);
    await h.seedSave(BASE, old);
    if ((await h.saved())?.leagueBook !== undefined) fail(`${tag} S2: loading a save with no book gave it one before any match`);
    await h.shot(`s2-${tag}-loaded`);
    if (!await h.play(1)) fail(`${tag} S2: the old save could not play a week: ${(await h.text()).slice(0, 160)}`);
    s = await h.saved(); l = law(s);
    if (!l.has || l.misfit) fail(`${tag} S2: the old save's book after a week does not fit (${JSON.stringify({ ...l, base: undefined })})`);
    else if (l.r0 !== round) fail(`${tag} S2: the late book says round ${l.r0}, the next league round at the load was ${round}`);
    else if (l.u0 !== gfThen) fail(`${tag} S2: the late book's u0 is ${l.u0}, the rivals had ${gfThen} goals at the load`);
    else ok(`${tag} S2: the old save keeps a late book from round index ${l.r0} (u0 ${l.u0}, ${l.base?.length ?? 0} of my men with a baseline), and it fits`);
    st = await h.stats(`s2-${tag}-stats-late`);
    if (st && NEW_WORDS.test(st.t)) fail(`${tag} S2: the Stats desk of a late book save shows new words: ${st.t.match(NEW_WORDS)[0]}`);
    /* A match played LIVE through its two halves: the second half does not pass the repair. */
    const livePlayed = await h.play(1, true);
    await h.shot(`s2-${tag}-after-live`);
    s = await h.saved(); l = law(s);
    if (!livePlayed) fail(`${tag} S2: a live match could not be played through: ${(await h.text()).slice(0, 160)}`);
    else if (!l.has || l.misfit || l.r0 !== round) fail(`${tag} S2: after a live match the late book is not the same book that fits (${JSON.stringify({ ...l, base: undefined })})`);
    else ok(`${tag} S2: ${livePlayed === 'live' ? 'a match played LIVE through its halves' : 'NO live match was offered, a quick sim was used'}, week ${s.week}, the late book still fits and still says round index ${l.r0}`);
    /* S3: two damaged books, each loaded and played. */
    for (const [name, hurt] of [['a string', 'garbage'], ['a row with a hole', (() => { const b = JSON.parse(JSON.stringify(s.leagueBook)); const club = Object.keys(b.c).find(c => Object.keys(b.c[c].m).length); if (club) b.c[club].m[Object.keys(b.c[club].m)[0]] = [1, 2, null, 0]; return b; })()]]) {
      const bad = JSON.parse(JSON.stringify(s)); bad.leagueBook = hurt;
      const before = h.errors.length;
      await h.seedSave(BASE, bad);
      const went = await h.play(1);
      const s3 = await h.saved(); const l3 = law(s3);
      if (!went) fail(`${tag} S3 ${name}: the damaged save could not play a week: ${(await h.text()).slice(0, 160)}`);
      else if (!l3.has || l3.misfit || typeof l3.r0 !== 'number') fail(`${tag} S3 ${name}: after a week the book is not a late book that fits (${JSON.stringify({ ...l3, base: undefined })})`);
      else if (h.errors.length > before) fail(`${tag} S3 ${name}: the page threw: ${h.errors.slice(before).join(' | ').slice(0, 200)}`);
      else ok(`${tag} S3 ${name}: repaired at the next week, a late book from round index ${l3.r0} that fits`);
    }
    /* S4: the committed save from before the book (Valencia, week 48 of 54), to its season's end. */
    await h.seedSave(BASE, oldFixture);
    await h.shot(`s4-${tag}-fixture-loaded`);
    const went4 = await h.play(2);
    const s4 = await h.saved(); const l4 = law(s4);
    await h.shot(`s4-${tag}-fixture-played`);
    if (!went4) fail(`${tag} S4: the committed old save could not play two weeks: ${(await h.text()).slice(0, 160)}`);
    else if (l4.has && l4.misfit) fail(`${tag} S4: the committed old save's book does not fit (${JSON.stringify({ ...l4, base: undefined })})`);
    else ok(`${tag} S4: the committed old save played to week ${s4.week}; book ${l4.has ? `late from round index ${l4.r0}, fits` : 'none (no league match left)'}`);
    if (NEW_WORDS.test(await h.text())) fail(`${tag} S4: new words on screen: ${(await h.text()).match(NEW_WORDS)[0]}`);
    /* S5: Manager Hot Seat never keeps a book. */
    await h.page.goto(BASE + '/manager-hot-seat', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await h.page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await h.page.waitForTimeout(1200);
    await h.clearRoom();
    for (let k = 0; k < 14; k++) { if (!(await h.tapText(/take the seat|take the job|start|play|kick off|continue|next|balanced|sim|got it|let.s go/i))) break; await h.page.waitForTimeout(700); }
    await h.shot(`s5-${tag}-hotseat`);
    const booked = await h.page.evaluate(k => Object.keys(localStorage).filter(x => x !== k && (localStorage.getItem(x) ?? '').includes('"leagueBook"')), KEY);
    const hotKeys = await h.page.evaluate(() => Object.keys(localStorage).filter(x => /hot|seat/i.test(x)));
    if (booked.length) fail(`${tag} S5: a stored value other than the Club Manager save carries a league book: ${booked.join(', ')}`); else ok(`${tag} S5: the Hot Seat was opened and pressed through; no stored value of it carries a book (its keys: ${hotKeys.join(', ') || 'none written'})`);
    if (h.errors.length) fail(`${tag}: ${h.errors.length} page error(s): ${[...new Set(h.errors)].join(' | ').slice(0, 300)}`); else ok(`${tag}: no page error in the whole walk`);
    await h.context.close();
  }
} finally {
  if (!BASE2) await browser.close();
}

/* ONE SEEDED SESSION ON BOTH BUILDS: does a player see or get anything else on the head than on the base? */
if (BASE2) {
  console.log('\n=== the same seeded session on the head build and on the base build (390x844, reduced motion on) ===');
  const face = s => JSON.stringify({ week: s.week, table: s.table, results: s.resultLog, race: s.scorerRace, budget: s.budget, squad: s.squad.map(p => [p.name, p.seasonGoals, p.comp?.league?.goals ?? 0, p.comp?.league?.assists ?? 0, p.rating]) });
  const session = async (base, name) => {
    const h = await open(browser, { w: 390, h: 844 }, 'reduce', 0x1306);
    try {
      if (!await h.takeJob(base)) return { blocked: (await h.text()).slice(0, 160) };
      const club = (await h.saved())?.clubName;
      const went = await h.play(3);
      const s = await h.saved();
      const hub = await h.text();
      const st = await h.stats(`cmp-${name}-stats`);
      return { club, went, week: s.week, face: face(s), hub, stats: st?.t ?? '', book: law(s), errors: h.errors.length };
    } finally { await h.context.close(); }
  };
  const a = await session(BASE, 'head');
  const a2 = await session(BASE, 'head-again');
  const b = await session(BASE2, 'base');
  await browser.close();
  if (a.blocked || b.blocked || a2.blocked) console.log(`  NOT COMPARED: a session was blocked at the picker (${a.blocked ?? a2.blocked ?? b.blocked})`);
  else {
    console.log(`  head: ${a.club} week ${a.week}; head again: ${a2.club} week ${a2.week}; base: ${b.club} week ${b.week}`);
    const stable = a.face === a2.face && a.stats === a2.stats;
    if (!stable) console.log('  NOT COMPARED: two sessions on the SAME head build already differ (the page draws from Math.random in an order a seed does not pin), so a difference from the base would prove nothing');
    else {
      if (a.face !== b.face) fail('seeded session: the table, the results, the old race or my squad\'s lines differ between the head build and the base build');
      else ok('seeded session: table, results, old scorer race, budget and every squad line are the same text on head and base');
      if (a.stats !== b.stats) { fail('seeded session: the Stats desk reads differently on the head build than on the base build'); fs.writeFileSync(path.join(OUT, 'cmp-stats-head.txt'), a.stats); fs.writeFileSync(path.join(OUT, 'cmp-stats-base.txt'), b.stats); }
      else ok(`seeded session: the Stats desk is the same text on head and base (${a.stats.length} characters)`);
      if (a.hub !== b.hub) { console.log('  note: the hub text differs between head and base (written to cmp-hub-*.txt)'); fs.writeFileSync(path.join(OUT, 'cmp-hub-head.txt'), a.hub); fs.writeFileSync(path.join(OUT, 'cmp-hub-base.txt'), b.hub); }
      else ok('seeded session: the hub is the same text on head and base');
    }
  }
}
console.log(failures ? `\nwalk: ${failures} FAILURE(S)` : '\nwalk: green, nothing broken, nothing new on a screen, every book whole or late and fitting');
process.exit(failures ? 1 : 0);
