/* Reviewer's DUGOUT walk of Round 1100 (never committed). Runs on the runner from the repo root:
     BASE=http://localhost:4173 node .rc/x/rvwalk2.mjs
   The recorded manager saves are hand built states the page's load guard refuses, so a real save
   (the recorded Twente player) is retired into the dugout by hand here: phase manager_season plus a
   managerState, the same shape choosePostRetirement writes. Odd leagues (Scottish, MLS, Austria),
   a waiting league (Denmark), the Segunda (dugout size 22) and two plain leagues (Eredivisie, Championship). */
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || '.tmp-fx/rvshots';
fs.mkdirSync(OUT, { recursive: true });
const saves = JSON.parse(fs.readFileSync('scripts/data/careerLeagueWorldSaves1100.json', 'utf8')).saves;
const ere = saves.find(s => s.id === 'ere').state;
const engineSrc = fs.readFileSync('src/lib/soccerCareerEngine.ts', 'utf8') + fs.readFileSync('src/data/soccerCareerClubPool.ts', 'utf8');
const tierOf = name => { const m = new RegExp(`name: "${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}", country: "[^"]+", tier: (\\d)`).exec(engineSrc); if (!m) throw new Error(`no list row for ${name}`); return Number(m[1]); };
const fresh = (club, league) => ({ club, clubTier: tierOf(club), league, season: 0, trophies: 0, promotions: 0, seasonResults: [], nationalTeamOffer: false, managingNationalTeam: false });
const dugout = ms => JSON.stringify({ ...ere, retired: true, phase: 'manager_season', postRetirementChoice: 'manager', age: 38, pendingSummary: null, pendingOffers: [], pendingEvents: [], pendingNews: [], managerState: ms });
const browser = await pw.chromium.launch({ args: ['--no-sandbox', '--no-proxy-server'] });
let problems = 0;
const note = (ok, msg) => { if (!ok) problems += 1; console.log(`${ok ? 'ok  ' : 'ODD '} ${msg}`); };

async function walk(tag, state, width, height, reduced, seed, want, seasons = 2) {
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await ctx.addInitScript(([v, s]) => {
    let t = s >>> 0;
    Math.random = () => { t = (t + 0x6D2B79F5) >>> 0; let x = Math.imul(t ^ (t >>> 15), 1 | t); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
    try {
      if (!sessionStorage.getItem('rv-harness')) {
        sessionStorage.setItem('rv-harness', '1');
        localStorage.setItem('cookie-consent', 'essential');
        localStorage.setItem('soccerCareerSave', v);
      }
    } catch { /* private mode */ }
  }, [state, seed]);
  await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  await page.goto(`${BASE}/soccer-career`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);
  const read = () => page.evaluate(() => {
    const h = [...document.querySelectorAll('span')].find(x => /^Final table/.test(x.textContent.trim()));
    const box = h ? h.closest('div.rounded-xl') : null;
    const rows = box ? [...box.querySelectorAll('div.cm-tick-in')].map(r => r.textContent.replace(/\s+/g, ' ').trim()) : [];
    const results = [...document.querySelectorAll('div.cm-tick-in')].filter(d => /^S\d{4}/.test(d.textContent.trim())).map(d => d.textContent.replace(/\s+/g, ' ').trim());
    const head = [...document.querySelectorAll('h3')].find(x => /Manager Career/.test(x.textContent));
    return { panel: head ? head.parentElement.textContent.replace(/\s+/g, ' ').trim() : null, box: box ? box.textContent.replace(/\s+/g, ' ').trim().slice(0, 700) : null, rows, results, y: window.scrollY, sw: document.documentElement.scrollWidth, saved: (() => { try { const s = JSON.parse(localStorage.getItem('soccerCareerSave')); const r = s.managerState?.seasonResults ?? []; const l = r[r.length - 1]; return l ? { year: l.year, league: l.league, leagueSize: l.leagueSize, sizeVerified: l.sizeVerified, result: l.result, pos: (l.table ?? []).find(x => x.you)?.pos, rows: (l.table ?? []).length, knownRivals: l.knownRivals, club: s.managerState.club, unemployed: !!s.managerState.unemployed } : null; } catch { return null; } })() };
  });
  const before = await read();
  console.log(`READ ${tag} opens: panel="${before.panel}" table box="${before.box}"`);
  note(!!before.panel, `${tag}: the dugout renders (Manager Career panel)`);
  await page.screenshot({ path: path.join(OUT, `${tag}-0open.png`) });
  for (let i = 0; i < seasons; i += 1) {
    const clicked = await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => !x.disabled && /^(Next Manager Season|Sit Out A Season)/.test(x.textContent.trim())); if (!b) return null; const t = b.textContent.trim(); b.click(); return t; });
    if (!clicked) { note(false, `${tag}: no manager season button (step ${i})`); break; }
    await page.waitForTimeout(reduced ? 1200 : 3000);
    const a = await read();
    console.log(`READ ${tag} season ${i + 1} (${clicked}): saved row ${JSON.stringify(a.saved)}`);
    console.log(`READ ${tag} season ${i + 1}: results: ${a.results.slice(-2).join(' || ')}`);
    console.log(`READ ${tag} season ${i + 1}: table box: ${a.box}`);
    if (a.saved && !a.saved.unemployed && a.saved.club === want.club) {
      if (want.size) note(a.saved.leagueSize === want.size, `${tag}: season ${i + 1} is played on a table of ${want.size} (saved leagueSize ${a.saved.leagueSize})`);
      if (want.size && a.saved.pos) note(a.saved.pos <= want.size, `${tag}: season ${i + 1} position ${a.saved.pos} sits inside ${want.size}`);
      if (want.sentence && a.box) note(a.box.includes(want.sentence), `${tag}: season ${i + 1} prints "${want.sentence}"`);
      if (want.noPoints && a.box) note(!/\d+ pts/.test(a.box) && !/ of \d+/.test(a.saved.result) && !/points/.test(a.saved.result), `${tag}: season ${i + 1} prints no points and no "of N" (result "${a.saved.result}")`);
      if (want.of) note(a.saved.result.includes(` of ${want.of}`) && a.saved.sizeVerified === true, `${tag}: season ${i + 1} result says of ${want.of} ("${a.saved.result}")`);
    } else console.log(`READ ${tag} season ${i + 1}: he has moved or is out of work, nothing asserted`);
    note(a.sw <= width + 1, `${tag}: no sideways scroll (${a.sw})`);
    await page.screenshot({ path: path.join(OUT, `${tag}-${i + 1}.png`) });
  }
  await page.screenshot({ path: path.join(OUT, `${tag}-full.png`), fullPage: true });
  note(errors.length === 0, `${tag}: no page error ${errors.join(' | ')}`);
  await ctx.close();
}

try {
  const mgrSco = saves.find(s => s.id === 'mgrSco').state.managerState;
  const mgrSeg = saves.find(s => s.id === 'mgrSeg').state.managerState;
  const SCO = 'The order only: the Scottish Premiership splits in two late in the season, so no points here.';
  await walk('dug-sco-old-390', dugout(mgrSco), 390, 844, false, 7100, { club: 'Hearts', size: 12, sentence: SCO, noPoints: true });
  await walk('dug-sco-old-1280r', dugout(mgrSco), 1280, 900, true, 7150, { club: 'Hearts', size: 12, sentence: SCO, noPoints: true });
  await walk('dug-sco-new-390r', dugout(fresh('Hearts', 'Scottish Premiership')), 390, 844, true, 7200, { club: 'Hearts', size: 12, sentence: SCO, noPoints: true });
  await walk('dug-mls-390', dugout(fresh('LA Galaxy', 'MLS')), 390, 844, false, 7300, { club: 'LA Galaxy', size: 30, sentence: 'The order only: MLS plays in two conferences, so no points here.', noPoints: true });
  await walk('dug-mls-1280', dugout(fresh('LA Galaxy', 'MLS')), 1280, 900, false, 7350, { club: 'LA Galaxy', size: 30, sentence: 'The order only: MLS plays in two conferences, so no points here.', noPoints: true });
  await walk('dug-aut-390', dugout(fresh('Red Bull Salzburg', 'Austrian Bundesliga')), 390, 844, false, 7400, { club: 'Red Bull Salzburg', size: 12, sentence: 'The order only: the Austrian Bundesliga splits in two after the regular season, so no points here.', noPoints: true });
  await walk('dug-den-390', dugout(fresh('FC Copenhagen', 'Danish Superliga')), 390, 844, false, 7500, { club: 'FC Copenhagen' });
  await walk('dug-seg-390', dugout(mgrSeg), 390, 844, true, 7600, { club: 'Girona', size: 22, of: 22 });
  await walk('dug-ere-1280', dugout(fresh('Ajax', 'Eredivisie')), 1280, 900, false, 7700, { club: 'Ajax', size: 18, of: 18 });
  await walk('dug-cha-390', dugout(fresh('Norwich City', 'Championship')), 390, 844, false, 7800, { club: 'Norwich City', size: 24, of: 24 });
} catch (e) {
  note(false, `the walk threw: ${String(e && e.stack ? e.stack : e).slice(0, 500)}`);
}
await browser.close();
console.log(`rvwalk2: ${problems} odd things`);
process.exit(problems ? 1 : 0);
