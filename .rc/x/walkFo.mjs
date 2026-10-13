/* QA hunt: play a front office through a season and its offseason, at 390x844 and 1280x900.
   node .rc/x/walkFo.mjs nfl|nba|mlb|nhl */
import { chromium, BASE, SIZES, makeLog, shot, newPage, firstVisit, buttons, clickRule, mainText, audit } from './gmlib.mjs';

const CFG = {
  nfl: { route: '/front-office', key: 'front-office-save-v1', play: [['play', /^Play Week \d+$/i], ['final', /^Play the final week/i]], maxPress: 22 },
  nba: { route: '/nba-front-office', key: 'nba-front-office-save-v1', play: [['play', /^Play Round \d+$/i], ['final', /^Final stretch/i]], maxPress: 26 },
  mlb: { route: '/mlb-front-office', key: 'mlb-front-office-save-v1', play: [['play', /^Play Round \d+$/i], ['final', /^Final stretch/i]], maxPress: 33 },
  nhl: { route: '/nhl-front-office', key: 'nhl-front-office-save-v1', play: [['play', /^Play Round \d+$/i], ['final', /^Final stretch/i]], maxPress: 33 },
};
const sport = process.argv[2];
const cfg = CFG[sport];
if (!cfg) { console.log('usage: walkFo.mjs nfl|nba|mlb|nhl'); process.exit(2); }
const only = process.env.QA_SIZE;

const browser = await chromium.launch();

async function hubTileTexts(page) {
  return page.evaluate(() => [...document.querySelectorAll('#dukb-main button')]
    .filter(b => b.querySelector('div.uppercase') && b.getBoundingClientRect().height > 0)
    .map(b => b.innerText.replace(/\s+/g, ' ').trim().replace(/^[^A-Za-z#]+/, '')));
}

/* The money on every club in the saved league: count, payroll, room, from the save the board wrote. */
async function economy(page, log, label) {
  const r = await page.evaluate(k => {
    try {
      const s = JSON.parse(localStorage.getItem(k) || 'null');
      if (!s || !s.league) return { none: true };
      const lg = s.league;
      const teams = Object.values(lg.teams || {});
      const rows = teams.map(t => {
        const ps = t.players || [];
        const pay = ps.reduce((a, p) => a + (Number(p.salary) || 0), 0);
        return { abbr: t.abbr, n: ps.length, pay: Math.round(pay * 10) / 10 };
      }).sort((a, b) => a.pay - b.pay);
      let total = 0;
      for (let i = 0; i < localStorage.length; i += 1) { const kk = localStorage.key(i); total += kk.length + (localStorage.getItem(kk) || '').length; }
      return { cap: lg.cap, season: lg.season, my: s.myTeam, teams: rows.length, list: rows.map(x => `${x.abbr}:${x.pay}/${x.n}`).join(' '), saveChars: (localStorage.getItem(k) || '').length, storageChars: total };
    } catch (e) { return { err: String(e).slice(0, 120) }; }
  }, cfg.key);
  log('economy', { label, ...r });
  return r;
}
async function clickHubTile(page, idx) {
  return page.evaluate(i => {
    const tiles = [...document.querySelectorAll('#dukb-main button')].filter(b => b.querySelector('div.uppercase') && b.getBoundingClientRect().height > 0);
    if (!tiles[i]) return false;
    tiles[i].setAttribute('data-qa-tile', '1');
    return true;
  }, idx).then(async ok => {
    if (!ok) return false;
    await page.locator('[data-qa-tile="1"]').first().click({ timeout: 6000 }).catch(() => {});
    await page.evaluate(() => document.querySelectorAll('[data-qa-tile]').forEach(e => e.removeAttribute('data-qa-tile')));
    return true;
  });
}
async function backToHub(page, log) {
  const r = await clickRule(page, [['hub', /^Hub$/i]], log);
  await page.waitForTimeout(400);
  return r;
}
async function answerPress(page, log) {
  const r = await clickRule(page, [['press', /.+/, '[data-gm-press]']], log);
  if (r) { log('press', { answered: r.text.slice(0, 90) }); await page.waitForTimeout(500); }
  return r;
}

async function visitTiles(page, G, label, log, deep) {
  const tiles = await hubTileTexts(page);
  log('tiles', { label, tiles: tiles.map(t => t.slice(0, 70)) });
  for (let k = 0; k < tiles.length; k += 1) {
    const before = (await hubTileTexts(page)).length;
    if (!before) { log('note', { msg: 'hub tiles vanished', label }); break; }
    const ok = await clickHubTile(page, k);
    if (!ok) continue;
    await page.waitForTimeout(800);
    const name = tiles[k].split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
    await shot(page, `${G}-${label}-tile${k}-${name}`);
    await audit(page, `${label} tile ${k} ${tiles[k].slice(0, 30)}`, log, { deep });
    const txt = await mainText(page, 900);
    log('panel', { label, tile: tiles[k].slice(0, 40), text: txt });
    const back = await backToHub(page, log);
    if (!back) { log('note', { msg: 'no Hub back button on panel', tile: tiles[k].slice(0, 40) }); await page.keyboard.press('Escape'); }
  }
}

async function openPlay(page, log) {
  const tiles = await hubTileTexts(page);
  const k = tiles.findIndex(t => /^(this week|play)\b/i.test(t));
  if (k < 0) return false;
  await clickHubTile(page, k);
  await page.waitForTimeout(600);
  return true;
}

async function playSeason(page, G, label, log, maxPress, stopAfter = Infinity) {
  let presses = 0; let stuck = 0;
  while (presses < maxPress && presses < stopAfter) {
    await answerPress(page, log);
    if (await page.locator('[role="dialog"]').count()) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
    const list = await buttons(page);
    if (list.some(b => /Go to the draft|Take another front office/i.test(b.t))) return { presses, end: 'recap' };
    const r = await clickRule(page, cfg.play, log);
    if (!r || r.name === 'clickfail') {
      /* maybe we are on the hub, or a panel */
      if (await openPlay(page, log)) { stuck += 1; if (stuck < 3) continue; }
      else { await backToHub(page, log); if (await openPlay(page, log)) { stuck += 1; if (stuck < 3) continue; } }
      const dis = list.filter(b => b.dis).map(b => b.t.slice(0, 60));
      log('STUCK', { label, presses, disabled: dis.slice(0, 6), buttons: list.map(b => b.t.slice(0, 40)).slice(0, 25), text: await mainText(page, 900) });
      await shot(page, `${G}-${label}-STUCK`, { force: true });
      return { presses, end: 'stuck' };
    }
    stuck = 0;
    presses += 1;
    await page.waitForTimeout(r.name === 'final' ? 3000 : 700);
    const a = await audit(page, `${label} press ${presses} ${r.text}`, log);
    if (presses % 6 === 1 || r.name === 'final') {
      await shot(page, `${G}-${label}-press${String(presses).padStart(2, '0')}`);
      log('week', { label, pressed: r.text, text: await mainText(page, 600) });
    }
    if (a.overflowX > 1) await shot(page, `${G}-${label}-overflow-${presses}`);
  }
  const list = await buttons(page);
  if (list.some(b => /Go to the draft|Take another front office/i.test(b.t))) return { presses, end: 'recap' };
  return { presses, end: presses >= stopAfter ? 'paused' : 'maxpress' };
}

async function runDraft(page, G, label, log, size) {
  await page.waitForTimeout(1200);
  await shot(page, `${G}-${label}-draft0`);
  await audit(page, `${label} draft open`, log, { deep: true });
  log('draft', { label, text: await mainText(page, 900) });
  /* the NFL tag: tag the first eligible man, the way a GM would */
  if (sport === 'nfl' && size.tag === 'p') {
    const t = await clickRule(page, [['tag', /^Tag$/]], log);
    if (t) { await page.waitForTimeout(500); log('tag', { text: (await mainText(page, 500)) }); await shot(page, `${G}-${label}-tagged`); }
  }
  let picks = 0;
  for (let i = 0; i < 40; i += 1) {
    if (await page.locator('[role="dialog"]').count()) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
    const tiles = await hubTileTexts(page);
    if (tiles.length >= 3) return { picks, end: 'hub' };
    const r = await clickRule(page, [
      ['continue', /^Continue to the hub$/i],
      ['finish', /^(Run the league draft|Finish the draft|Finish dr)/i],
      ['replace', /^Replace the remaining/i],
      ['prospect', /· age \d+/i],
    ], log);
    if (!r) {
      await page.waitForTimeout(1500);
      const again = await buttons(page);
      if (again.some(b => /Continue to the hub|· age \d+|Finish|Run the league/i.test(b.t) && !b.dis)) continue;
      log('STUCK', { label, where: 'draft', buttons: again.map(b => `${b.dis ? '[x]' : ''}${b.t.slice(0, 40)}`).slice(0, 25), text: await mainText(page, 700) });
      await shot(page, `${G}-${label}-draft-STUCK`, { force: true });
      return { picks, end: 'stuck' };
    }
    if (r.name === 'prospect') picks += 1;
    log('draftclick', { label, rule: r.name, text: r.text.slice(0, 60) });
    await page.waitForTimeout(r.name === 'prospect' ? 900 : 1200);
    if (r.name === 'prospect' && picks === 1) await shot(page, `${G}-${label}-draftpick1`);
    if (r.name === 'finish' || (r.name === 'prospect' && (await buttons(page)).some(b => /Continue to the hub/i.test(b.t)))) {
      await page.waitForTimeout(2500);
      await shot(page, `${G}-${label}-draftdone`);
      await audit(page, `${label} draft done`, log, { deep: true });
      log('draftdone', { label, text: await mainText(page, 900) });
    }
  }
  return { picks, end: 'loop' };
}

for (const size of SIZES) {
  if (only && only !== size.tag) continue;
  const G = `${sport}-${size.tag}`;
  const log = makeLog(G);
  const { ctx, page } = await newPage(browser, size, log);
  const t0 = Date.now();
  try {
    await page.goto(`${BASE}${cfg.route}`, { waitUntil: 'domcontentloaded' });
    await firstVisit(page, sport, size, log);
    await shot(page, `${G}-01-pick`);
    await audit(page, 'pick screen', log, { deep: true, always: true });
    log('pick', { text: await mainText(page, 500) });
    const clubs = await page.locator('#dukb-main .grid button').count();
    const idx = size.tag === 'p' ? 0 : Math.min(9, clubs - 1);
    const clubText = (await page.locator('#dukb-main .grid button').nth(idx).innerText().catch(() => '')).replace(/\s+/g, ' ');
    log('club', { clubs, idx, club: clubText.slice(0, 80) });
    await page.locator('#dukb-main .grid button').nth(idx).click();
    await page.waitForTimeout(1500);
    await shot(page, `${G}-02-hub`);
    await audit(page, 'hub start', log, { deep: true, always: true });
    log('hub', { text: await mainText(page, 1400) });
    await answerPress(page, log);
    await shot(page, `${G}-03-hub-after-press`);
    await economy(page, log, 'start');
    await visitTiles(page, G, 's1start', log, true);
    /* free agency: sign the first man you can, as a GM fills a hole */
    const tiles = await hubTileTexts(page);
    const fa = tiles.findIndex(t => /^free agency/i.test(t));
    if (fa >= 0) {
      await clickHubTile(page, fa); await page.waitForTimeout(700);
      const s = await clickRule(page, [['sign', /^Sign\b/i]], log);
      await page.waitForTimeout(700);
      log('sign', { did: s ? s.text.slice(0, 60) : null, text: await mainText(page, 500) });
      await shot(page, `${G}-04-signed`);
      await backToHub(page, log);
    }
    await openPlay(page, log);
    await shot(page, `${G}-05-playpanel`);
    /* first half of the season, then a look round, then the rest */
    const half = Math.floor(cfg.maxPress / 2) - 2;
    const s1 = await playSeason(page, G, 's1a', log, cfg.maxPress, half);
    log('season', { part: 's1a', ...s1, secs: Math.round((Date.now() - t0) / 1000) });
    if (s1.end === 'paused') {
      await backToHub(page, log);
      await shot(page, `${G}-06-midhub`);
      await audit(page, 'mid season hub', log, { deep: true });
      log('midhub', { text: await mainText(page, 1200) });
      await visitTiles(page, G, 's1mid', log, false);
      await openPlay(page, log);
      if (sport === 'nfl' && size.tag === 'd') {
        const w = await clickRule(page, [['watch', /^Watch Week \d+$/i]], log);
        if (w) {
          await page.waitForTimeout(2500); await shot(page, `${G}-07-watch-mid`);
          for (let i = 0; i < 40; i += 1) { const l = await buttons(page); if (l.some(b => /^Play Week/i.test(b.t) && !b.dis)) break; await page.waitForTimeout(1000); }
          await shot(page, `${G}-07-watch-end`);
          log('watch', { text: await mainText(page, 700) });
        }
      }
      const s1b = await playSeason(page, G, 's1b', log, cfg.maxPress);
      log('season', { part: 's1b', ...s1b, secs: Math.round((Date.now() - t0) / 1000) });
    }
    const list = await buttons(page);
    if (list.some(b => /Go to the draft|Take another front office/i.test(b.t))) {
      await page.waitForTimeout(3000);
      await shot(page, `${G}-08-recap`);
      await shot(page, `${G}-08-recap-full`, { full: true });
      await audit(page, 'recap', log, { deep: true, always: true });
      log('recap', { text: await mainText(page, 1800) });
      await economy(page, log, 'recap');
      /* a reload on the recap must come back to the recap */
      await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(2500);
      const afterReload = await buttons(page);
      log('recapReload', { draftButton: afterReload.some(b => /Go to the draft/i.test(b.t)), text: await mainText(page, 400) });
      const go = await clickRule(page, [['draft', /Go to the draft/i]], log);
      if (go) {
        const d = await runDraft(page, G, 'off', log, size);
        log('offseason', { ...d, secs: Math.round((Date.now() - t0) / 1000) });
        await page.waitForTimeout(800);
        await shot(page, `${G}-10-s2hub`);
        await economy(page, log, 'season2');
        await audit(page, 'season 2 hub', log, { deep: true, always: true });
        log('s2hub', { text: await mainText(page, 1600) });
        await answerPress(page, log);
        await visitTiles(page, G, 's2', log, false);
        await openPlay(page, log);
        const s2 = await playSeason(page, G, 's2', log, cfg.maxPress, 3);
        log('season', { part: 's2', ...s2 });
        await backToHub(page, log);
        const beforeReload = await mainText(page, 300);
        await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(2500);
        const after = await mainText(page, 300);
        log('reload', { same: beforeReload === after, beforeReload, after });
        await shot(page, `${G}-11-reload`);
      }
    }
    if (size.tag === 'p') {
      /* hostile saves: half a save, then the right JSON with the wrong shape */
      const raw = await page.evaluate(k => localStorage.getItem(k), cfg.key);
      log('save', { bytes: raw ? raw.length : 0 });
      if (raw) {
        await page.evaluate(([k, v]) => localStorage.setItem(k, v), [cfg.key, raw.slice(0, Math.floor(raw.length / 2))]);
        await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(2500);
        await shot(page, `${G}-12-hostile-half`);
        log('hostile', { kind: 'half', text: await mainText(page, 500), buttons: (await buttons(page)).map(b => b.t.slice(0, 40)).slice(0, 10) });
        const obj = JSON.parse(raw);
        const wrong = { ...obj, phase: 'draft', draftClass: null, picksLeft: 3, draftBatchesLeft: 1 };
        await page.evaluate(([k, v]) => localStorage.setItem(k, v), [cfg.key, JSON.stringify(wrong)]);
        await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(2500);
        await shot(page, `${G}-13-hostile-shape`);
        log('hostile', { kind: 'draft-no-class', text: await mainText(page, 500), buttons: (await buttons(page)).map(b => b.t.slice(0, 40)).slice(0, 10) });
      }
    }
  } catch (e) {
    log('EXCEPTION', { msg: String(e).slice(0, 400) });
    await shot(page, `${G}-EXC`, { force: true });
  }
  log('done', { secs: Math.round((Date.now() - t0) / 1000) });
  await ctx.close();
}
await browser.close();
console.log('WALK FINISHED', sport);
