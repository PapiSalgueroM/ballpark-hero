// Reviewer walk for PR 401 (Build Your XI Club year draft). Runs ON THE RUNNER.
// node .rc/x/walkXi401.mjs draft|mixed|arsenal|help   (BASE env = served build; BASE2 for mixed compare)
// Every supabase.co call is answered locally from REAL rows of the offline pull of
// player_market_values (years 2010 and 2015, .rc/x/xi401fx.json); nothing leaves the runner.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
const MODE = process.argv[2] || 'draft';
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || '/tmp/xi401out';
fs.mkdirSync(OUT, { recursive: true });
const FX = JSON.parse(fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), 'xi401fx.json'), 'utf8'));
const CLUBS = { 'Real Madrid': ['Real Madrid'], 'Barcelona': ['FC Barcelona'], 'Manchester City': ['Manchester City'],
  'Liverpool': ['Liverpool FC'], 'Bayern Munich': ['Bayern Munich', 'FC Bayern Munich'], 'PSG': ['Paris Saint-Germain'],
  'Chelsea': ['Chelsea FC'], 'Arsenal': ['Arsenal FC'], 'Manchester United': ['Manchester United'],
  'Juventus': ['Juventus FC', 'Juventus'], 'AC Milan': ['AC Milan'], 'Inter Milan': ['Inter Milan'],
  'Borussia Dortmund': ['Borussia Dortmund'], 'Atlético Madrid': ['Atlético de Madrid'], 'Tottenham': ['Tottenham Hotspur'],
  'Napoli': ['SSC Napoli', 'Napoli'], 'Benfica': ['SL Benfica'], 'Porto': ['FC Porto'], 'Ajax': ['Ajax Amsterdam'],
  'Bayer Leverkusen': ['Bayer 04 Leverkusen'], 'Roma': ['AS Roma', 'Roma'], 'Sevilla': ['Sevilla FC', 'Sevilla'],
  'Sporting CP': ['Sporting CP'], 'Newcastle': ['Newcastle United'], 'Aston Villa': ['Aston Villa'],
  'West Ham': ['West Ham United'], 'Marseille': ['Olympique Marseille'], 'Lyon': ['Olympique Lyon'],
  'Celtic': ['Celtic FC'], 'Galatasaray': ['Galatasaray'] };
const ROLE_POS = { GK: 'Goalkeeper', LB: 'Left-Back', CB: 'Centre-Back', RB: 'Right-Back', CM: 'Central Midfield',
  LW: 'Left Winger', ST: 'Centre-Forward', RW: 'Right Winger' };
const ROLES_433 = ['GK', 'LB', 'CB', 'CB', 'RB', 'CM', 'CM', 'CM', 'LW', 'ST', 'RW'];
const problems = [];
const fail = (m) => { problems.push(m); console.log('PROBLEM ' + m); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function strip(v) { return v.replace(/^"|"$/g, ''); }
function answer(url) {
  const p = url.searchParams;
  let rows = FX;
  const club = p.get('club');
  if (club && club.startsWith('in.(')) { const a = club.slice(4, -1).split(',').map(strip); rows = rows.filter(r => a.includes(r.club)); }
  else if (club && club.startsWith('eq.')) rows = rows.filter(r => r.club === club.slice(3));
  const year = p.get('year');
  if (year && year.startsWith('eq.')) rows = rows.filter(r => String(r.year) === year.slice(3));
  const nat = p.get('nationality');
  if (nat && nat.startsWith('eq.')) rows = rows.filter(r => r.nationality === nat.slice(3));
  else if (nat && nat.startsWith('ilike.')) { const n = nat.slice(6).replace(/%/g, '').toLowerCase(); rows = rows.filter(r => (r.nationality || '').toLowerCase().includes(n)); }
  for (const col of ['name_folded', 'player_name']) {
    const v = p.get(col);
    if (v && v.startsWith('ilike.')) { const n = v.slice(6).replace(/%/g, '').toLowerCase(); rows = rows.filter(r => r.name_folded.includes(n) || r.player_name.toLowerCase().includes(n)); }
  }
  rows = [...rows].sort((a, b) => b.market_value_usd - a.market_value_usd || b.year - a.year || a.player_name.localeCompare(b.player_name));
  const lim = Number(p.get('limit')) || 1000;
  return rows.slice(0, lim);
}

const requests = [];
async function makePage(browser, { width, height, mobile, reduce, seenRules = true, seed = 1401 }) {
  const ctx = await browser.newContext({ viewport: { width, height }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1,
    reducedMotion: reduce ? 'reduce' : 'no-preference', serviceWorkers: 'block' });
  await ctx.addInitScript(([s, seen]) => {
    let a = s >>> 0;
    Math.random = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    try { if (seen) localStorage.setItem('lineup-rules-seen', '1'); localStorage.setItem('cookie-consent', 'essential'); } catch {}
  }, [seed, seenRules]);
  await ctx.route(/supabase\.co/, async route => {
    const req = route.request(); const url = new URL(req.url());
    requests.push(req.method() + ' ' + url.pathname + url.search);
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, body: '', headers: cors });
    if (req.method() === 'GET' && url.pathname === '/rest/v1/player_market_values') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(answer(url)), headers: cors });
    if (req.method() === 'GET' && url.pathname === '/rest/v1/player_verified_positions') return route.fulfill({ status: 200, contentType: 'application/json', body: '[]', headers: cors });
    return route.abort('blockedbyclient');
  });
  await ctx.route(url => !url.href.startsWith('http://localhost:') && !/supabase\.co/.test(url.href), r => r.abort('blockedbyclient'));
  const page = await ctx.newPage();
  page.setDefaultTimeout(12000);
  page.on('pageerror', e => fail('pageerror ' + e.message));
  return { ctx, page };
}
async function shot(page, name) { await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: false }); }
async function overflow(page, tag) {
  const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }));
  if (o.sw > o.iw + 1) fail(`${tag}: horizontal overflow ${o.sw} > ${o.iw}`);
}
const pitch = page => page.locator('button').filter({ has: page.locator('span', { hasText: /^GK$/ }) }).first().locator('..');
const slot = (page, i) => pitch(page).locator(':scope > button').nth(i);
async function clubNow(page) {
  await page.getByTitle('Reroll club', { exact: true }).waitFor({ state: 'visible' });
  const t = await page.locator('p').filter({ hasText: /^Matching .+ records from \d{4}$/ }).first().innerText();
  return /^Matching (.+) records from (\d{4})$/.exec(t.trim())[1];
}
async function startClubYear(page, year, tag) {
  await page.goto(BASE + '/build-your-xi', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Club year draft', exact: true }).waitFor();
  if (await page.getByRole('button', { name: 'Mixed', exact: true }).getAttribute('aria-pressed') !== 'true') fail(tag + ': Mixed is not the default');
  await shot(page, tag + '-setup-default'); await overflow(page, tag + ' setup');
  await page.getByRole('button', { name: 'Club year draft', exact: true }).click();
  await page.selectOption('#lineup-recorded-year', String(year));
  await shot(page, tag + '-setup-clubyear'); await overflow(page, tag + ' setup club year');
  await page.getByRole('button', { name: /4-3-3/ }).first().click();
}
async function draft(browser, vp, tag) {
  requests.length = 0;
  const { ctx, page } = await makePage(browser, vp);
  await startClubYear(page, 2010, tag);
  const used = new Set();
  for (let i = 0; i < 11; i++) {
    const role = ROLES_433[i];
    let cand = null, club = null;
    for (let a = 0; a < 20 && !cand; a++) {
      club = await clubNow(page);
      cand = FX.find(r => r.year === 2010 && CLUBS[club].includes(r.club) && r.position === ROLE_POS[role] && !used.has(r.player_name));
      if (!cand) { await page.getByTitle('Reroll club', { exact: true }).click(); await sleep(1500); }
    }
    if (!cand) { fail(`${tag}: no ${role} found after rerolls`); break; }
    used.add(cand.player_name);
    await slot(page, i).click();
    await page.getByRole('button', { name: 'Browse players', exact: true }).click();
    const opt = page.getByRole('option').filter({ hasText: cand.player_name }).first();
    await opt.waitFor({ state: 'visible' });
    if (i === 0 || i === 8) { await shot(page, `${tag}-browse-${i}-${club.replace(/\W+/g, '')}`); await overflow(page, tag + ' browse'); }
    const n = await page.getByRole('option').count();
    console.log(`${tag} slot ${i} ${role}: ${club} 2010, browse shows ${n} rows, picking ${cand.player_name}`);
    await opt.click();
    try { await page.getByText((i + 1) + '/11', { exact: true }).waitFor({ state: 'visible', timeout: 8000 }); }
    catch { const err = await page.locator('p.text-destructive, [role="alert"]').allInnerTexts().catch(() => []); fail(`${tag}: slot ${i} did not fill (${err.join(' | ')})`); await shot(page, `${tag}-stuck-${i}`); break; }
  }
  const submit = page.getByRole('button', { name: /Submit Team/ });
  if (await submit.count()) {
    await shot(page, tag + '-review'); await overflow(page, tag + ' review');
    if (!(await page.getByText('Club year draft, recorded year 2010', { exact: true }).count())) fail(tag + ': review line missing');
    await submit.click();
    await page.getByText(/Club year draft: recorded year 2010/).first().waitFor();
    await sleep(800);
    await shot(page, tag + '-result-top'); await overflow(page, tag + ' result');
    const rep = page.getByText('Season Report', { exact: true });
    if (await rep.count()) { await rep.first().scrollIntoViewIfNeeded(); await sleep(400); await shot(page, tag + '-result-report'); }
    else fail(tag + ': no Season Report on the result');
    console.log(tag + ' RESULT: ' + (await page.locator('body').innerText()).split('\n').filter(l => /rated|recorded year|\/100|finished/i.test(l)).slice(0, 8).join(' || '));
  }
  const mv = requests.filter(r => r.includes('/rest/v1/player_market_values'));
  const bad = mv.filter(r => r.startsWith('GET') && !r.includes('year=eq.2010'));
  if (bad.length) fail(`${tag}: ${bad.length} market reads without year=eq.2010, first ${bad[0]}`);
  if (requests.some(r => /functions\/v1\/(evaluate-lineup|validate-player)/.test(r))) fail(tag + ': a provider was called in Club year');
  console.log(`${tag}: ${mv.length} market reads, all with year filter: ${bad.length === 0}`);
  await ctx.close();
}
async function mixedRun(browser, base, tag) {
  requests.length = 0;
  const { ctx, page } = await makePage(browser, { width: 390, height: 844, mobile: true, reduce: false, seed: 777 });
  await page.goto(base + '/build-your-xi', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /4-3-3/ }).first().click();
  await page.getByTitle('Reroll: get a different team', { exact: true }).waitFor({ state: 'visible' });
  await sleep(600);
  const team = (await page.locator('.rounded-2xl').filter({ hasText: /Club|Nation/ }).first().innerText()).replace(/\s+/g, ' ');
  const pitchText = (await pitch(page).innerText()).replace(/\s+/g, ' ');
  await shot(page, tag + '-mixed-building');
  const reroll = await page.getByTitle('Reroll: get a different team', { exact: true }).getAttribute('class');
  let pick = '';
  const name = /Club|Nation/.test(team) ? team : '';
  const clubName = Object.keys(CLUBS).find(c => name.includes(' ' + c + ' ') || name.endsWith(' ' + c) || name.includes(c + ' Name a player'));
  if (clubName) {
    const gk = FX.find(r => CLUBS[clubName].includes(r.club) && r.position === 'Goalkeeper');
    if (gk) {
      await slot(page, 0).click();
      await page.getByRole('combobox').fill(gk.name_folded.slice(0, 4));
      const opt = page.getByRole('option').filter({ hasText: gk.player_name }).first();
      await opt.waitFor({ state: 'visible' });
      pick = (await page.getByRole('listbox').innerText()).replace(/\s+/g, ' ');
      await opt.click();
      await page.getByText('1/11', { exact: true }).waitFor({ state: 'visible' });
      await sleep(1600);
      pick += ' => ' + (await pitch(page).innerText()).replace(/\s+/g, ' ');
    }
  }
  const reqs = requests.filter(r => r.includes('player_market_values')).map(r => r.replace(/&?apikey=[^&]*/, ''));
  await ctx.close();
  return { team, pitchText, reroll, pick, reqs, calls: null };
}
async function arsenal(browser) {
  requests.length = 0;
  const { ctx, page } = await makePage(browser, { width: 390, height: 844, mobile: true, reduce: true, seed: 5 });
  await startClubYear(page, 2015, 'ars390');
  let club = await clubNow(page);
  for (let a = 0; a < 60 && club !== 'Arsenal'; a++) { await page.getByTitle('Reroll club', { exact: true }).click(); await sleep(1400); club = await clubNow(page); }
  if (club !== 'Arsenal') { fail('arsenal: never drew Arsenal'); await ctx.close(); return; }
  await slot(page, 0).click();
  await page.getByRole('button', { name: 'Browse players', exact: true }).click();
  await page.getByRole('option').first().waitFor({ state: 'visible' });
  await sleep(500);
  const opts = await page.getByRole('option').allInnerTexts();
  console.log('ARSENAL 2015 browse, ' + opts.length + ' rows: ' + opts.map(o => o.replace(/\s+/g, ' ')).join(' ; '));
  await shot(page, 'ars390-browse-top');
  const lb = page.getByRole('listbox');
  await lb.evaluate(el => { el.scrollTop = el.scrollHeight; });
  await sleep(300);
  await shot(page, 'ars390-browse-bottom');
  for (const n of ['Ramiro Carrera', 'Iván Marcone', 'Esteban Andrada', 'Ezequiel Ruiz']) if (opts.some(o => o.includes(n))) console.log('OFFERED AS ARSENAL 2015: ' + n);
  await ctx.close();
}
async function help(browser) {
  const { ctx, page } = await makePage(browser, { width: 390, height: 844, mobile: true, reduce: true, seenRules: false });
  await page.goto(BASE + '/build-your-xi', { waitUntil: 'networkidle' });
  const dlg = page.getByRole('dialog');
  await dlg.waitFor({ state: 'visible' });
  await shot(page, 'help390-top');
  const h = dlg.getByText('Club year draft', { exact: true }).first();
  if (!(await h.count())) fail('help: no Club year draft section in How to play');
  else { await h.scrollIntoViewIfNeeded(); await sleep(300); await shot(page, 'help390-clubyear'); }
  await overflow(page, 'help 390');
  await ctx.close();
}
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
try {
  if (MODE === 'draft') {
    await draft(browser, { width: 390, height: 844, mobile: true, reduce: true }, 'd390r');
    await draft(browser, { width: 1280, height: 900, mobile: false, reduce: false }, 'd1280');
  } else if (MODE === 'draft2') {
    await draft(browser, { width: 390, height: 844, mobile: true, reduce: false }, 'd390m');
    await draft(browser, { width: 1280, height: 900, mobile: false, reduce: true }, 'd1280r');
  } else if (MODE === 'mixed') {
    const a = await mixedRun(browser, process.env.BASE2, 'base');
    const b = await mixedRun(browser, BASE, 'head');
    for (const k of ['team', 'pitchText', 'reroll', 'pick']) console.log(`MIXED ${k}: ${a[k] === b[k] ? 'SAME' : 'DIFF'}\n  base: ${a[k]}\n  head: ${b[k]}`);
    const sameReq = JSON.stringify(a.reqs) === JSON.stringify(b.reqs);
    console.log('MIXED requests: ' + (sameReq ? 'SAME' : 'DIFF') + ' (' + a.reqs.length + ' vs ' + b.reqs.length + ')');
    if (!sameReq) { console.log('  base: ' + a.reqs.join(' ; ')); console.log('  head: ' + b.reqs.join(' ; ')); }
    if (b.reqs.some(r => r.includes('year='))) fail('mixed: head sends a year filter');
  } else if (MODE === 'arsenal') await arsenal(browser);
  else if (MODE === 'help') await help(browser);
} catch (e) { fail('walk threw: ' + (e && e.message ? e.message.split('\n')[0] : e)); }
await browser.close();
console.log(`walkXi401 ${MODE} DONE: ${problems.length} problems`);
process.exit(problems.length ? 1 : 0);
