/* Reviewer walk for Round 1102 (never committed): the squad, the market and two past seasons, at 390 and 1280,
   reduced motion on and off, database host blocked. Reads BASE and RC_OUT from the environment. */
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || '.';
fs.mkdirSync(OUT, { recursive: true });
const measure = { runs: [] };
let problems = 0;
const say = m => console.log(`   ${m}`);
const bad = m => { problems += 1; console.log(`  PROBLEM: ${m}`); };

const strip = t => t.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
function fileRows(rel, club) {
  const text = strip(fs.readFileSync(rel, 'utf8'));
  const esc = club.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const block = new RegExp(`^  '${esc}': \\[\\n([\\s\\S]*?)^  \\],$`, 'm').exec(text);
  if (!block) return [];
  return [...block[1].matchAll(/\{ n: '((?:[^'\\]|\\.)*)', p: '([A-Z]+)', a: (\d+), v: ([\d.]+), r: (\d+) \}/g)]
    .map(m => ({ n: m[1].replace(/\\(.)/g, '$1'), p: m[2], a: Number(m[3]), v: Number(m[4]), r: Number(m[5]) }));
}

const browser = await pw.chromium.launch({ headless: true, args: ['--no-sandbox'] });
let aborted = 0;

async function career({ tag, vp, motion, era, country, league, club, file, extra }) {
  console.log(`\n== ${tag}`);
  const run = { tag, club, era, rows: [], mismatches: [], notes: [] };
  measure.runs.push(run);
  const ctx = await browser.newContext({ viewport: vp, reducedMotion: motion });
  await ctx.route(/supabase\.co/, route => { aborted += 1; return route.abort(); });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).split('\n')[0].slice(0, 200)));
  page.on('console', m => {
    const t = m.text();
    if (m.type() === 'error' && !/ERR_CERT|ERR_QUIC|ERR_NAME|Failed to load resource|blocked by CORS policy|Access-Control-Allow-Origin|net::ERR_FAILED|net::ERR_ABORTED/i.test(t)) errs.push(t.slice(0, 200));
  });
  const shot = async (name, full = false) => { await page.screenshot({ path: path.join(OUT, `${tag}-${name}.png`), fullPage: full }).catch(e => say(`no shot ${name}: ${e.message.slice(0, 80)}`)); };
  const buttons = async () => (await page.locator('button:visible').allInnerTexts().catch(() => [])).map(t => t.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 60);
  const tap = async (rx, what, must = true) => {
    const b = page.locator('button:visible').filter({ hasText: rx }).first();
    await b.waitFor({ timeout: 8000 }).catch(() => {});
    if (await b.count().catch(() => 0) === 0) { if (must) { say(`no button for ${what}; visible: ${(await buttons()).join(' | ').slice(0, 500)}`); } return false; }
    const ok = await b.click({ timeout: 5000 }).then(() => true).catch(() => false);
    if (ok) await page.waitForTimeout(450); else say(`could not press ${what}`);
    return ok;
  };
  const sideways = async where => {
    const w = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, inner: window.innerWidth }));
    if (w.scroll > w.inner + 1) bad(`${tag}: ${where} scrolls sideways (${w.scroll} in ${w.inner})`);
    return w;
  };
  try {
    await page.goto(`${BASE}/club-manager`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await page.getByRole('button', { name: /^essential only$/i }).first().click({ timeout: 1500 }).catch(() => {});
    await shot('0-landing');
    await tap(new RegExp(era, 'i'), `the ${era} world`);
    await shot('1-era');
    await tap(new RegExp(country, 'i'), country);
    await tap(new RegExp(league, 'i'), league);
    if (!await tap(new RegExp(`^\\s*${club}\\b`), club, false)) await tap(new RegExp(club), club);
    await shot('2-club-picked');
    await tap(/take the job|confirm|start/i, 'the pinned confirm bar');
    await page.getByText(/who is in the dugout/i).first().waitFor({ timeout: 8000 }).catch(() => {});
    await tap(/skip: just manage/i, 'skip the dugout form');
    await page.waitForFunction(() => { try { return !!JSON.parse(localStorage.getItem('dukb-club-manager-save') || 'null')?.squad?.length; } catch { return false; } }, null, { timeout: 15000 }).catch(() => {});
    const saved = await page.evaluate(() => { try { const s = JSON.parse(localStorage.getItem('dukb-club-manager-save') || 'null'); return s ? { club: s.clubName ?? null, eraId: s.eraId ?? null, squad: s.squad.map(p => ({ name: p.name, rating: p.rating, age: p.age, potential: p.potential, pos: p.pos ?? p.position ?? null, value: p.value ?? null })) } : null; } catch { return null; } });
    if (!saved) { bad(`${tag}: no career started`); await shot('blocked', true); return; }
    run.saved = saved;
    say(`career at ${saved.club} (${saved.eraId}), ${saved.squad.length} men`);
    await shot('3-home');
    await sideways('the hub');

    if (!await tap(/^\s*Squad\s*$/, 'the squad tab', false)) await tap(/Squad/, 'the squad tab');
    await page.locator('[data-cm-squad-row]').first().waitFor({ timeout: 15000 }).catch(() => {});
    const rows = await page.evaluate(() => [...document.querySelectorAll('[data-cm-squad-row]')].map(row => {
      const visible = el => !!el && el.getClientRects().length > 0;
      const n = row.querySelector('span.truncate');
      const ovr = row.querySelector('[data-cm-cell="ovr"]');
      const ageCell = row.querySelector('[data-cm-cell="age"]');
      const pot = row.querySelector('[data-cm-cell="pot"]');
      const phone = row.querySelector('[data-cm-cell="phone"]');
      const agePhone = [...row.querySelectorAll('span')].find(s => /^\d+y$/.test((s.textContent || '').trim()) && visible(s));
      const r = row.getBoundingClientRect();
      const nr = n ? n.getBoundingClientRect() : null;
      return {
        name: n ? (n.textContent || '').trim() : null,
        cut: n ? n.scrollWidth > n.clientWidth + 1 : null,
        rating: visible(ovr) ? (ovr.textContent || '').trim() : null,
        age: visible(ageCell) ? (ageCell.textContent || '').trim() : agePhone ? (agePhone.textContent || '').trim().replace(/y$/, '') : null,
        pot: visible(pot) ? (pot.textContent || '').trim() : null,
        phone: visible(phone) ? (phone.textContent || '').trim() : null,
        w: Math.round(r.width), h: Math.round(r.height), nameW: nr ? Math.round(nr.width) : null,
      };
    }));
    run.rows = rows;
    say(`squad screen: ${rows.length} rows; names cut off with an ellipsis: ${rows.filter(r => r.cut).length}`);
    const FILE = fileRows(file, club);
    const byName = new Map(FILE.map(r => [r.n, r]));
    let compared = 0;
    for (const row of rows) {
      const f = byName.get(row.name);
      if (!f) continue;
      compared += 1;
      if (row.rating !== String(f.r) || row.age !== String(f.a)) { run.mismatches.push({ name: row.name, screen: `${row.rating}/${row.age}`, file: `${f.r}/${f.a}` }); }
    }
    say(`compared with the file: ${compared} of ${rows.length} rows are file men; ${run.mismatches.length} differ${run.mismatches.length ? `: ${run.mismatches.slice(0, 6).map(m => `${m.name} screen ${m.screen} file ${m.file}`).join('; ')}` : ''}`);
    if (compared < 11) bad(`${tag}: only ${compared} squad rows matched a file row`);
    if (run.mismatches.length) bad(`${tag}: ${run.mismatches.length} squad rows do not show the file's rating and age`);
    /* a ceiling under the rating would read as nonsense */
    const under = saved.squad.filter(p => typeof p.potential === 'number' && p.potential < p.rating);
    if (under.length) bad(`${tag}: ${under.length} men have a ceiling under their rating: ${under.slice(0, 4).map(p => `${p.name} ${p.rating}/${p.potential}`).join('; ')}`);
    await shot('4-squad');
    await shot('4-squad-full', true);
    await sideways('the squad screen');
    /* open the first row */
    const first = page.locator('[data-cm-squad-row]').first();
    await first.click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(500);
    await shot('5-squad-row-open');
    if (extra) await extra({ page, run, shot, tap, say, bad, sideways, saved, buttons });

    /* the market */
    if (await tap(/^\s*Market\s*$/, 'the market tab', false) || await tap(/Market|Transfers/, 'the market tab')) {
      await page.waitForTimeout(900);
      await shot('6-market');
      await shot('6-market-full', true);
      await sideways('the market');
      run.marketText = (await page.locator('main, body').first().innerText().catch(() => '')).replace(/\n{2,}/g, '\n').slice(0, 5000);
      run.marketButtons = await buttons();
      if (await tap(/free agent/i, 'free agents', false)) {
        await page.waitForTimeout(700);
        await shot('7-free-agents');
        await shot('7-free-agents-full', true);
        run.freeAgentText = (await page.locator('main, body').first().innerText().catch(() => '')).replace(/\n{2,}/g, '\n').slice(0, 5000);
      } else run.notes.push('no free agent button on the market');
    }
    if (errs.length) bad(`${tag}: ${errs.length} console error(s): ${errs.slice(0, 3).join(' | ')}`);
    run.errors = errs;
  } catch (e) {
    bad(`${tag}: the walk threw: ${String(e).slice(0, 300)}`);
    await shot('threw', true);
  } finally {
    await ctx.close();
  }
}

const NOW = 'src/data/clubManagerRosters.ts';
for (const vp of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
  for (const motion of ['no-preference', 'reduce']) {
    await career({ tag: `now-${vp.width}-${motion === 'reduce' ? 'rm' : 'motion'}`, vp, motion, era: '2026-27', country: 'England', league: 'Premier League', club: 'Liverpool', file: NOW });
  }
}
await career({ tag: 'era2020-390', vp: { width: 390, height: 844 }, motion: 'no-preference', era: '2020-21', country: 'Spain', league: 'La Liga', club: 'Barcelona', file: 'src/data/clubManagerEra2020.ts' });
await career({ tag: 'era2020-1280', vp: { width: 1280, height: 900 }, motion: 'reduce', era: '2020-21', country: 'Spain', league: 'La Liga', club: 'Barcelona', file: 'src/data/clubManagerEra2020.ts' });
await career({ tag: 'era2010-390', vp: { width: 390, height: 844 }, motion: 'reduce', era: '2010-11', country: 'Spain', league: 'La Liga', club: 'Barcelona', file: 'src/data/clubManagerEra2010.ts' });
await career({ tag: 'brentford-390', vp: { width: 390, height: 844 }, motion: 'no-preference', era: '2026-27', country: 'England', league: 'Premier League', club: 'Brentford', file: NOW });
await browser.close();
fs.writeFileSync(path.join(OUT, 'rvwalk-measure.json'), JSON.stringify(measure, null, 1));
console.log(`\nrvwalk: ${problems} problem(s); ${aborted} database requests aborted; ${measure.runs.length} careers walked`);
process.exit(problems ? 1 : 0);
