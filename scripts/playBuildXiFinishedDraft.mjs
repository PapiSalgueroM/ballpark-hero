// Replay a full 4-3-3 from an empty browser. BASE must be a locally served build.
// Optional OUTPUT records the result JSON and a screenshot after the reload.
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const { chromium } = process.env.PLAYWRIGHT_MODULE
  ? await import(process.env.PLAYWRIGHT_MODULE) : await import('./lib/playwrightLoader.mjs');
const base = new URL(process.env.BASE || 'http://127.0.0.1:4173');
assert.equal(base.protocol, 'http:');
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname));
const output = process.env.OUTPUT;
const width = Number(process.env.WIDTH || 390);
const expectedLoss = process.env.XI_EXPECT_ORIGINAL_LOSS === '1';
const mixed = process.env.XI_MODE === 'mixed';
const nameStem = 'build-xi-finished-' + (mixed ? 'mixed-' : '') + width + (expectedLoss ? '-baseline' : '');
const positions = ['GK', 'LB', 'CB', 'CB', 'RB', 'CM', 'CM', 'CM', 'LW', 'ST', 'RW'];
const picks = [
  [9, 'Kylian Mbappé'], [10, 'Lamine Yamal'], [0, 'Gianluigi Donnarumma'],
  [8, 'Cody Gakpo'], [4, 'Josip Stanisic'], [1, 'Nuno Mendes'], [5, 'Enzo Fernández'],
  ...(mixed ? [[2, 'William Saliba'], [6, 'Kobbie Mainoo'], [7, 'Khéphren Thuram'], [3, 'Fikayo Tomori']]
    : [[2, 'Leny Yoro'], [6, 'Khéphren Thuram'], [7, 'Adrien Rabiot'], [3, 'Alessandro Bastoni']]),
];
// simSignThePlayerAuction source query archived these rows for year=eq.2026.
const market = JSON.parse(await readFile(new URL('./data/auctionMarketRows.json', import.meta.url), 'utf8'));
const fold = name => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const dataset = market.map(row => ({ ...row, year: 2026, name_folded: fold(row.player_name) }));
const saveKey = 'dukb-build-your-xi-draft-v1';
const report = { width, mode: mixed ? 'mixed' : 'club-year', evaluations: 0, fixture: 'Committed 600-row 2026 market snapshot', picks: [], completions: [], errors: [] };
const api = 'https://flawuiqbvjobmkfkauhw.supabase.co';
const browser = await chromium.launch({ ...(process.env.CHROME_PATH && { executablePath: process.env.CHROME_PATH }), args: ['--no-proxy-server'] });
try {
  const context = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 900 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
  await context.routeWebSocket('**/*', socket => socket.close());
  await context.addInitScript(() => { Math.random = () => 0.5; });
  const errors = [];
  await context.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url()), method = req.method();
    if (url.origin === base.origin && ['HEAD','GET'].includes(method)) return route.continue();
    if (url.origin !== api) return route.abort();
    const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Content-Type': 'application/json' };
    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (url.pathname === '/rest/v1/game_completions' && method === 'POST') {
      report.completions.push(req.postDataJSON());
      return route.fulfill({ status: 201, headers, body: '[]' });
    }
    if (url.pathname === '/rest/v1/player_verified_positions' && method === 'GET') {
      return route.fulfill({ status: 200, headers, body: '[]' });
    }
    if (mixed && url.pathname === '/functions/v1/evaluate-lineup' && method === 'POST') {
      report.evaluations++;
      return route.fulfill({ status: 503, headers, body: '{}' });
    }
    if (url.pathname === '/rest/v1/player_market_values' && method === 'GET') {
      try {
        const name = url.searchParams.get('player_name');
        if (mixed && name && url.searchParams.get('select') === 'player_name,market_value_usd') {
          assert.equal(url.searchParams.get('year'), 'eq.2026');
          assert.match(name, /^ilike\.%.*%$/);
          const result = dataset.filter(r => r.name_folded.includes(fold(name.slice(7,-1)))).slice(0,1);
          return route.fulfill({ status: 200, headers, body: JSON.stringify(result) });
        }
        assert.equal(url.searchParams.get('year'), mixed ? null : 'eq.2026');
        const splitClubFilter = url.searchParams.getAll('or').join(',').match(/club\.(in\.\([^)]+\))/);
        const aliases = url.searchParams.get('club') ?? splitClubFilter?.[1];
        assert.match(aliases, /^in\.\(.+\)$/);
        const clubs = aliases.slice(4, -1).split(',').map(s => s.replace(/^"|"$/g, ''));
        const filter = url.searchParams.get('name_folded');
        if (filter !== null) assert.match(filter, /^ilike\.%.*%$/);
        const needle = filter === null ? '' : fold(filter.slice(7,-1));
        const entries = dataset.filter(row => clubs.includes(row.club) && row.name_folded.includes(needle));
        return route.fulfill({ status: 200, headers, body: JSON.stringify(entries.slice(0,Number(url.searchParams.get('limit') || 50))) });
      } catch (error) { errors.push(error.message + ' ' + url.search); }
    }
    if (/\/functions\/v1\/(?:evaluate-lineup|validate-player)$/.test(url.pathname)) errors.push(url.pathname);
    return route.abort();
  });

  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => report.errors.push(error.message));
  await page.goto(base.origin + '/build-your-xi', { waitUntil: 'networkidle' });
  assert.equal(await page.evaluate(key => localStorage.getItem(key), saveKey), null);
  for (const label of [/^Got it!?$/i, /^Let.s play!?$/i, /^Reject all$/i]) {
    const btn = page.getByRole('button', { name: label }).first();
    if (await btn.isVisible()) await btn.click();
  }
  if (!mixed) {
    await page.getByRole('button', { name: 'Club year draft', exact: true }).click();
    await page.getByLabel('Recorded year', { exact: true }).selectOption('2026');
  }
  await page.getByRole('button', { name: /^4-3-3/ }).click();
  for (const [index, name] of picks) {
    const matches = dataset.filter(row => row.player_name === name);
    assert.equal(matches.length, 1, 'One archived row for ' + name);
    await page.getByTitle(mixed ? 'Reroll: get a different team' : 'Reroll club', { exact: true }).waitFor();
    await page.getByRole('combobox', { name: 'Position to fill' }).selectOption(String(index));
    const search = page.getByPlaceholder(/^Search a /);
    await search.fill(name);
    await page.getByRole('option').filter({ has: page.getByText(name, { exact: true }) }).click();
    await page.waitForFunction(([key, index]) => { const state = JSON.parse(localStorage.getItem(key)); return (state?.draft ?? state)?.slots?.some(entry => entry[0] === index); }, [saveKey, index]);
    const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), saveKey);
    const slot = (saved.draft ?? saved).slots.find(([i]) => i === index)[1];
    assert.equal(slot.pick.rawName, name);
    assert.equal(slot.role, positions[index]);
    assert.equal(slot.pick.club, matches[0].club);
    assert.equal(slot.pick.value, matches[0].market_value_usd);
    assert.equal(slot.pick.year, 2026);
    report.picks.push({ index, role: slot.role, name: slot.playerName, raw: name, club: slot.assignedTeam, marketClub: slot.pick.club });
  }
  assert.equal(new Set(report.picks.map(p => p.index)).size,11);
  assert.equal(report.completions.length, 0);
  await page.getByRole('button', { name: 'Submit Team', exact: true }).click();
  const season = page.getByRole('heading', { name: 'Season Report', exact: true });
  const collect = async () => {
    await season.waitFor();
    const xi = page.getByText('Your 4-3-3 XI', { exact: true }).locator('..');
    const lineup = await xi.locator(':scope > div').first().locator(':scope > div').evaluateAll(rows =>
      rows.map(row => ({ role: row.children[0].textContent, name: row.children[1].children[0].textContent,
        year: row.children[1].children[1].textContent, rating: row.children[2].textContent, club: row.lastElementChild.textContent.replace('🏟️','').trim() })));
    assert.deepEqual(lineup.map(row => [row.role,row.name,row.club]), [...report.picks].sort((a,b) => a.index - b.index).map(p => [p.role,p.name,p.club]));
    assert.ok(lineup.every(r => r.year.includes('2026') && /^\d+$/.test(r.rating)));
    const panel = season.locator('../..');
    const metrics = {};
    for (const label of ['Squad Rating','League Finish','Points','Trophies']) {
      metrics[label] = await panel.getByText(label,{ exact: true }).locator('..').locator(':scope > span').nth(1).innerText();
    }
    const verdict = await page.getByText(mixed ? /^Squad average .* on current 2026 market values/ : /^Your XI finished .* in this simulated season\./).first().innerText();
    assert.match(metrics['Squad Rating'],/^\d+\/100$/);
    assert.match(metrics['League Finish'],/^\d+(st|nd|rd|th) \/ 20$/);
    assert.match(metrics.Points,/^\d+$/);
    const players = panel.getByRole('button', { name:'Player stats' });
    await players.click();
    const seasonStats = await panel.innerText();
    await players.click();
    const data = await page.evaluate(key => Object.fromEntries([key,'dukb-local-completions','dukb-streaks-v1'].map(k=>[k,localStorage.getItem(k)])),saveKey);
    let leagueTable;
    if (process.env.XI_EXPECT_TABLE === '1') {
      const titles = JSON.parse(data[saveKey]).result.season.trophies;
      assert.equal(Number(metrics.Trophies), titles.filter(title => title !== 'THE TREBLE').length);
      const toggle = panel.getByRole('button', { name: 'League table', exact: true });
      await toggle.click();
      const table = panel.getByRole('table');
      assert.equal(await table.locator('tbody tr').count(), 20);
      const own = table.getByRole('row', { name: /Your XI/ });
      const cells = await own.locator('td, th').allTextContents();
      assert.equal(Number(cells[0]), parseInt(metrics['League Finish']));
      assert.equal(cells[5], metrics.Points);
      assert.equal(Number(cells[2]) + Number(cells[3]) + Number(cells[4]), 38);
      leagueTable = await table.innerText();
      if (output) {
        await mkdir(output, { recursive: true });
        await table.screenshot({ path: path.join(output, nameStem + '-table.png') });
      }
      await toggle.click();
    }
    return { lineup, metrics, verdict, seasonStats, data, leagueTable };
  };
  report.before = await collect();
  await page.waitForLoadState('networkidle');
  assert.equal(report.completions.length, 1, 'Submit records one completed game');
  assert.equal(report.completions[0].game, 'build-your-xi');
  assert.equal(report.completions[0].score, 500);
  await page.reload({ waitUntil: 'networkidle' });
  if (expectedLoss) {
    await page.getByRole('button',{ name: 'Club year draft',exact:true }).waitFor();
    assert.equal(await season.count(),0);
    assert.equal(await page.evaluate(key=>localStorage.getItem(key),saveKey),null);
    assert.equal(report.before.data[saveKey],null);
    report.outcome='Original build discarded the submitted XI and verdict';
  } else {
    report.after = await collect();
    assert.deepEqual(report.after, report.before, 'Entire rendered lineup, match stats, verdict and saved bytes survive reload');
    assert.ok(report.after.data[saveKey]);
    report.outcome='Finished lineup and result survived a genuine reload';
    if (output) {
      await mkdir(output,{recursive:true});
      await page.getByText('Your 4-3-3 XI',{exact:true}).scrollIntoViewIfNeeded();
      await page.screenshot({path:path.join(output,nameStem+'.png')});
      await panelScreenshot();
    }
    async function panelScreenshot() {
      await season.evaluate(el => el.scrollIntoView({block:'start'}));
      await page.screenshot({path:path.join(output,nameStem+'-season.png')});
    }
  }
  await page.waitForLoadState('networkidle');
  assert.equal(report.completions.length,1,'Reload must not submit a score again');
  assert.equal(report.evaluations, mixed ? 1 : 0, 'A restored verdict does not rerun the evaluator');
  assert.deepEqual(report.errors,[]);
  assert.deepEqual(errors,[]);
  if(output) {
    await mkdir(output,{recursive:true});
    await writeFile(path.join(output,nameStem+'.json'),JSON.stringify(report,null,2)+'\n');
  }
  console.log(report.outcome, JSON.stringify(report.before.metrics), 'eleven identities, one intercepted completion');
} finally {
  await browser.close();
}
