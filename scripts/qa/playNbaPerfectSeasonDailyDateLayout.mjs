// Original Page layout diagnostic v2 for remote CI. Run from the checkout root after building dist.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

assert(process.env.CI && process.env.SIM_NETWORK === 'offline', 'Remote offline CI only');
assert(process.env.BASE && process.env.NBA_DAILY_NATIVE_OUT, 'Supply BASE and a new NBA_DAILY_NATIVE_OUT');
const root = process.cwd();
await import(pathToFileURL(path.join(root, 'scripts/lib/offlineTransport.cjs')).href);
const { default: playwright } = await import(pathToFileURL(path.join(root, 'scripts/lib/playwrightLoader.mjs')).href);
const base = new URL(process.env.BASE);
assert(['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname));
assert.equal(base.protocol, 'http:');
assert.equal(base.href, base.origin + '/');
const routePath = '/perfect-season-nba';
const publicUrl = base.origin + routePath;
const distFile = 'dist/perfect-season-nba/index.html';
const builtBody = fs.readFileSync(path.join(root, distFile));
const pageSource = 'src/pages/PerfectSeasonNba.tsx';
const originalPage = fs.readFileSync(path.join(root, pageSource));
const pageSHA256 = createHash('sha256').update(originalPage).digest('hex');
const pageBlob = createHash('sha1').update('blob ' + originalPage.length + '\0').update(originalPage).digest('hex');
assert.deepEqual([originalPage.length, pageSHA256, pageBlob], [
  39583, 'f110a4a6c76ff6c27f22015998db6d2208bebee33576a56f098589d64795dd42', 'edf47ea61379dfd23e6df85266d8954d74b7cdef',
]);
const out = path.resolve(process.env.NBA_DAILY_NATIVE_OUT);
fs.mkdirSync(out);

function retain(file, value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(JSON.stringify(value, null, 2) + '\n');
  fs.writeFileSync(path.join(out, file), bytes);
  return { file, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
}

const widths = [320, 390, 1280];
const slots = ['PG', 'SG', 'SF', 'PF', 'C', 'SIXTH'];
const positions = ['PG', 'SG', 'SF', 'PF', 'C', 'PG', 'SG'];
const dayBefore = '2026-11-09';
const dayAfter = '2026-11-10';
const before = '2026-11-10T04:59:40.000Z';
const after = '2026-11-10T05:00:01.000Z';
const cohortSize = 150;
const archivePath = '/rest/v1/bref_nba_player_seasons';
const completionPath = '/rest/v1/game_completions';

function seasonEntries(prefix, firstYear) {
  return Array.from({ length: cohortSize }, (_, i) => {
    const year = firstYear + i % 8;
    return {
      team: prefix + String(i).padStart(3, '0'),
      season: String(year) + '-' + String(year + 1).slice(-2),
    };
  });
}

const modern = seasonEntries('FXM', 2015);
const mid = seasonEntries('FXD', 2000);
const entries = [...modern, ...mid];
const playerName = (team, slot) => ['Daily Native Fixture', team, slot].join(' ');
const rawRows = entries.flatMap(({ team, season }, entryIndex) => positions.map((position, i) => ({
  id: entries.length * positions.length - entryIndex * positions.length - i,
  team,
  season,
  player_name: playerName(team, slots[i] ?? 'Reserve'),
  position,
  minutes: 2000 - i * 10,
  pts: 800,
  trb: 400,
  ast: 300,
})));
const indexRows = rawRows.map(({ season, team }) => ({ season, team }));
const squads = new Map(entries.map(entry => [entry.team, {
  season: entry.season,
  rows: rawRows.filter(row => row.team === entry.team).map(({ team, season, ...player }) => player),
}]));
assert.equal(entries.length, 300);
assert.equal(rawRows.length, 2100);
assert(rawRows.every((row, i) => row.id === rawRows.length - i));

const journeys = [
  { id: 'before', mount: before, entry: before, mountET: dayBefore, entryET: dayBefore },
  { id: 'after', mount: after, entry: after, mountET: dayAfter, entryET: dayAfter },
];
// These are independent fixture ordinals for the two dates at the 150-team pool size.
const priorOrdinals = [51, 76, 74, 106, 103, 64];
const nextOrdinals = [70, 93, 135, 149, 121, 76];
const prior = {
  wheel: priorOrdinals.map(i => modern[i]),
  themeText: "Today's theme: Three-Point Boom",
  themeId: 'three-point-boom',
};
const next = {
  wheel: nextOrdinals.map(i => mid[i]),
  themeText: "Today's theme: 2000s Basketball",
  themeId: 'two-thousands-nba',
};

const report = {
  schema: 'nba-perfect-season-daily-date-original-layout-diagnostic-v2',
  status: 'running',
  route: publicUrl,
  originalProduct: {
    qualifiedOriginal: 'a97c23de034006e383349c8bebfedaf72a906346',
    file: pageSource, bytes: originalPage.length, sha256: pageSHA256, blob: pageBlob,
  },
  widths,
  cases: [],
  errors: [],
  fixture: retain('fictional-archive.json', { entries, rawRows, priorOrdinals, nextOrdinals }),
  builtDocument: { distFile, ...retain('built-document.html', builtBody) },
  limits: [
    'Original Page layout diagnostic on a loopback host-like server. Uses both same-day controls only.',
    'Synthetic archive and fixed browser Date. The wheel and score timers run normally.',
    'Supabase responses are local fixtures. External requests and same-origin writes cannot continue.',
    'A pass means that mobile first-wheel overflow was reproduced and desktop is contained. The result geometry is retained separately.',
  ],
};

function rangeFor(url, headers) {
  const range = headers.range?.split('-').map(Number);
  const start = range ? range[0] : Number(url.searchParams.get('offset') || 0);
  const limit = range ? range[1] - start + 1 : Number(url.searchParams.get('limit'));
  assert(Number.isInteger(start) && start >= 0 && start < 15000 && start % 1000 === 0);
  assert.equal(limit, 1000);
  return { start, limit };
}

function mainDocumentRequest(request) {
  return request.isNavigationRequest() && request.resourceType() === 'document'
    && request.frame().parentFrame() === null;
}

function documentRequest(request) {
  return {
    url: request.url(), method: request.method(), resourceType: request.resourceType(),
    navigationRequest: request.isNavigationRequest(), mainFrame: request.frame().parentFrame() === null,
    redirectedFrom: request.redirectedFrom()?.url() ?? null,
  };
}

async function intercept(route, row) {
  const request = route.request();
  const url = new URL(request.url());
  const method = request.method();
  if (url.origin === base.origin && ['GET', 'HEAD'].includes(method)) {
    if (mainDocumentRequest(request)) row.documentInterceptions.push(documentRequest(request));
    await route.continue();
    return;
  }
  const observed = { url: url.href, method };
  row.intercepts.push(observed);
  if (!url.hostname.endsWith('.supabase.co')) {
    observed.action = 'aborted';
    await route.abort();
    return;
  }

  const headers = await request.allHeaders();
  const cors = {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': headers['access-control-request-headers'] || 'authorization,apikey,content-type,x-client-info',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
  };
  if (method === 'OPTIONS') {
    observed.action = 'local-preflight';
    await route.fulfill({ status: 204, headers: cors, body: '' });
    return;
  }

  const query = url.searchParams;
  let body;
  if (url.pathname === archivePath) {
    assert.equal(method, 'GET');
    if (query.get('select') === 'season,team') {
      assert.equal(query.get('minutes'), 'gte.1000');
      assert.equal(query.get('order'), 'id.desc');
      const { start, limit } = rangeFor(url, headers);
      body = indexRows.slice(start, start + limit);
      Object.assign(observed, { action: 'local-index', start, limit, rows: body.length });
    } else {
      assert.equal(query.get('select'), 'id,player_name,position,minutes,pts,trb,ast');
      assert.equal(query.get('minutes'), 'gte.500');
      assert.equal(query.get('order'), 'minutes.desc');
      assert.equal(query.get('limit'), '20');
      const team = query.get('team')?.slice(3);
      assert.equal(query.get('team'), 'eq.' + team);
      const squad = squads.get(team);
      assert(squad, 'Known synthetic squad');
      assert.equal(query.get('season'), 'eq.' + squad.season);
      body = squad.rows;
      assert.equal(body.length, 7);
      Object.assign(observed, { action: 'local-squad', team, season: squad.season, rows: body.length });
    }
  } else if (method === 'GET' || method === 'HEAD') {
    observed.action = 'local-empty-read';
    body = [];
  } else {
    observed.action = 'local-write-acknowledgement';
    body = {};
    if (method === 'POST' && url.pathname === completionPath) {
      const payload = request.postDataJSON();
      const record = Array.isArray(payload) ? payload[0] : payload;
      if (Array.isArray(payload)) assert.equal(payload.length, 1);
      observed.completion = { game: record.game, score: record.score };
    }
  }
  await route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });
}

function clockAndDocument(page) {
  return page.evaluate(() => ({
    instant: new Date().toISOString(),
    eastern: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date()),
    nonce: window.__nbaDailyNativeDocument,
    url: location.href,
  }));
}

async function measure(page, locator) {
  const configured = page.viewportSize();
  assert(configured, 'The browser has a configured viewport');
  await locator.scrollIntoViewIfNeeded();
  return locator.evaluate(async (element, configured) => {
    await document.fonts.ready;
    const box = rect => ({
      x: rect.x, y: rect.y, top: rect.top, right: rect.right, bottom: rect.bottom,
      width: rect.width, height: rect.height,
    });
    const sizing = node => ({ clientWidth: node.clientWidth, scrollWidth: node.scrollWidth });
    const computed = style => ({
      display: style.display, position: style.position, width: style.width, minWidth: style.minWidth,
      maxWidth: style.maxWidth, gridTemplateColumns: style.gridTemplateColumns,
      whiteSpace: style.whiteSpace, overflowX: style.overflowX,
    });
    const targetAncestors = [];
    for (let node = element, depth = 0; node && depth <= 8; node = node.parentElement, depth++) {
      targetAncestors.push({
        depth, tag: node.localName, className: node.getAttribute('class') ?? '',
        rect: box(node.getBoundingClientRect()), ...sizing(node), computed: computed(getComputedStyle(node)),
      });
    }
    const visual = window.visualViewport;
    const visibleTop = visual?.offsetTop ?? 0;
    const visibleBottom = visibleTop + (visual?.height ?? innerHeight);
    const overflow = [];
    for (const [domIndex, node] of Array.from(document.querySelectorAll('body *')).entries()) {
      const rect = node.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0 || rect.right <= 0 || rect.left >= innerWidth
        || rect.bottom <= visibleTop || rect.top >= visibleBottom) continue;
      const excess = Math.max(rect.right - configured.width, -rect.left, 0);
      if (excess <= 1) continue;
      const style = getComputedStyle(node);
      if (style.visibility !== 'visible' || style.display === 'none' || style.opacity === '0') continue;
      overflow.push({
        domIndex, tag: node.localName, className: node.getAttribute('class') ?? '',
        parentTag: node.parentElement?.localName ?? null, parentClassName: node.parentElement?.getAttribute('class') ?? null,
        excess, rect: box(rect), computed: computed(style),
      });
    }
    overflow.sort((left, right) => right.excess - left.excess || left.domIndex - right.domIndex);
    return {
      configured, width: innerWidth, height: innerHeight, scrollWidth: document.scrollingElement?.scrollWidth ?? 0,
      html: sizing(document.documentElement), body: sizing(document.body),
      visualViewport: visual ? {
        width: visual.width, height: visual.height, scale: visual.scale,
        offsetLeft: visual.offsetLeft, offsetTop: visual.offsetTop,
      } : null,
      rect: box(element.getBoundingClientRect()), targetAncestors,
      visibleOverflowBoxCount: overflow.length, topVisibleOverflowBoxes: overflow.slice(0, 20),
    };
  }, configured);
}

async function runJourney(browser, width, journey) {
  const id = [width, journey.id].join('-');
  const height = width === 320 ? 740 : width === 390 ? 900 : 1000;
  const touch = width <= 390;
  const row = {
    id, width, height, touch, journey: journey.id, status: 'running',
    documents: [], documentInterceptions: [], frameEvents: [], pageErrors: [], routeErrors: [], intercepts: [], wheel: [],
  };
  report.cases.push(row);
  const context = await browser.newContext({
    viewport: { width, height }, isMobile: touch, hasTouch: touch, timezoneId: 'UTC',
    reducedMotion: 'reduce', colorScheme: 'dark', serviceWorkers: 'block',
    storageState: { cookies: [], origins: [{ origin: base.origin, localStorage: [
      { name: 'cookie-consent', value: 'essential' },
      { name: 'dukb-guest-handle', value: 'DailyDateFixture-18' },
      { name: 'rules-gate-seen:/perfect-season-nba', value: '1' },
    ] }] },
  });
  const pending = new Set();
  try {
    await context.addInitScript(url => {
      if (window === window.top && location.href === url) {
        Object.defineProperty(window, '__nbaDailyNativeDocument', { value: crypto.randomUUID() });
      }
    }, publicUrl);
    await context.route('**/*', route => {
      const work = intercept(route, row).catch(async error => {
        row.routeErrors.push(String(error.stack || error));
        await route.abort().catch(() => {});
      });
      pending.add(work);
      void work.finally(() => pending.delete(work));
      return work;
    });

    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror', error => row.pageErrors.push(String(error.stack || error)));
    page.on('framenavigated', frame => {
      if (frame === page.mainFrame()) row.frameEvents.push(frame.url());
    });
    page.on('request', request => {
      if (mainDocumentRequest(request) && request.frame() === page.mainFrame()) {
        row.documents.push(documentRequest(request));
      }
    });
    const activate = locator => touch ? locator.tap() : locator.click();
    await page.clock.setFixedTime(new Date(journey.mount));
    const response = await page.goto(publicUrl, { waitUntil: 'domcontentloaded' });
    assert(response);
    assert.equal(response.url(), publicUrl);
    assert.equal(response.status(), 200);
    const headers = response.headers();
    const servedRequest = response.request();
    assert(mainDocumentRequest(servedRequest));
    assert.equal(servedRequest.frame(), page.mainFrame());
    assert.equal(servedRequest.redirectedFrom(), null);
    assert.equal(servedRequest.redirectedTo(), null);
    assert.equal(headers.location, undefined);
    assert.equal(headers['content-type'], 'text/html; charset=utf-8');
    assert(builtBody.equals(await response.body()), 'Exact production route document bytes');
    row.served = {
      url: response.url(), status: response.status(), request: documentRequest(servedRequest),
      redirectedTo: servedRequest.redirectedTo()?.url() ?? null, locationHeader: headers.location ?? null,
      contentType: headers['content-type'], ...report.builtDocument,
    };
    const daily = page.getByRole('button', { name: /^Daily\b/ });
    await daily.waitFor({ state: 'visible' });
    await page.getByRole('heading', { level: 1, name: /^82-0 NBA Perfect Season$/i }).waitFor({ state: 'visible' });
    row.mount = await clockAndDocument(page);
    row.archiveRequestsBeforeEntry = row.intercepts.filter(item => item.action === 'local-index').length;
    row.modeLayout = await measure(page, daily);
    if (journey.mount !== journey.entry) await page.clock.setFixedTime(new Date(journey.entry));
    row.entry = await clockAndDocument(page);
    await activate(daily);
    const theme = page.getByText(/^Today's theme:/);
    await theme.waitFor({ state: 'visible' });
    row.theme = (await theme.textContent())?.trim() ?? null;
    const teamWheelLabel = page.getByText('Team wheel', { exact: true });
    await teamWheelLabel.waitFor({ state: 'visible' });
    row.preSpinLayout = await measure(page, teamWheelLabel.locator('..'));

    for (const [i, slot] of slots.entries()) {
      await activate(page.getByRole('button', { name: i ? 'Next spin' : 'Spin the wheel', exact: true }));
      const landedLabel = page.getByText('You landed on', { exact: true });
      await landedLabel.waitFor({ state: 'visible' });
      const landing = await landedLabel.evaluate(element => element.nextElementSibling?.textContent?.trim() || null);
      const requested = row.intercepts.filter(item => item.action === 'local-squad').at(-1);
      assert(requested, 'A synthetic squad was requested');
      const pickedPlayer = playerName(requested.team, slot);
      const player = page.getByRole('button', { name: new RegExp(pickedPlayer + '(?:\\s|$)') });
      if (i === 0) {
        const card = landedLabel.locator('..');
        row.firstWheelLayout = await measure(page, card);
        row.firstWheelImage = retain(id + '-first-wheel.png', await card.screenshot({ animations: 'disabled' }));
      }
      await activate(player);
      const slotChoice = page.getByRole('button', { name: slot, exact: true });
      const lastPick = i === slots.length - 1;
      let slotButtonText = null;
      let nextAction = null;
      if (lastPick) {
        const skip = page.getByRole('button', { name: 'Skip to result', exact: true });
        await skip.waitFor({ state: 'visible' });
        assert.equal(await slotChoice.count(), 0, 'Sixth pick advances without an extra slot choice');
        nextAction = (await skip.textContent())?.trim() ?? null;
      } else {
        await slotChoice.waitFor({ state: 'visible' });
        slotButtonText = (await slotChoice.textContent())?.trim() ?? null;
        await activate(slotChoice);
      }
      const draftSlot = page.locator('aside').getByText(slot, { exact: true });
      const lineupPlayer = lastPick
        ? null
        : await draftSlot.evaluate(element => element.nextElementSibling?.textContent?.trim() || null);
      row.wheel.push({
        slot, team: requested.team, season: requested.season, landing, pickedPlayer, lineupPlayer,
        assignment: lastPick ? 'automatic' : 'explicit', slotButtonText, nextAction,
      });
    }

    const [completion] = await Promise.all([
      page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname === completionPath),
      activate(page.getByRole('button', { name: 'Skip to result', exact: true })),
    ]);
    assert.equal(completion.status(), 200);
    const result = page.locator('[data-season-verdict]');
    await result.waitFor({ state: 'visible' });
    const finalRecordLabel = page.getByText('Final record', { exact: true });
    row.resultText = await finalRecordLabel.evaluate(element => element.nextElementSibling?.textContent?.trim() ?? null);
    row.verdictScore = (await result.locator('[data-result-score]').textContent())?.trim() ?? null;
    row.resultMeta = (await result.getByText(/^Daily ·/).textContent())?.trim() ?? null;
    row.resultShare = (await result.locator(':scope > pre').textContent())?.trim() ?? null;
    row.resultLayout = await measure(page, result);
    row.resultImage = retain(id + '-result.png', await result.screenshot({ animations: 'disabled' }));
    row.finish = await clockAndDocument(page);
    row.saves = await page.evaluate(days => Object.fromEntries(days.map(day => {
      const raw = localStorage.getItem('perfect-season-nba-daily-' + day);
      return [day, raw ? JSON.parse(raw) : null];
    })), [dayBefore, dayAfter]);
    assert.equal(page.url(), publicUrl);
  } finally {
    while (pending.size) await Promise.all([...pending]);
    await context.close();
  }
  return row;
}

function verifyJourney(row, journey) {
  assert.deepEqual(row.pageErrors, []);
  assert.deepEqual(row.routeErrors, []);
  const expectedDocument = {
    url: publicUrl, method: 'GET', resourceType: 'document', navigationRequest: true, mainFrame: true, redirectedFrom: null,
  };
  assert.deepEqual(row.documents, [expectedDocument]);
  assert.deepEqual(row.documentInterceptions, [expectedDocument]);
  assert.deepEqual(row.served, {
    url: publicUrl, status: 200, request: expectedDocument, redirectedTo: null, locationHeader: null,
    contentType: 'text/html; charset=utf-8', ...report.builtDocument,
  });
  assert.equal(row.archiveRequestsBeforeEntry, 0);
  for (const [observed, instant, eastern] of [
    [row.mount, journey.mount, journey.mountET],
    [row.entry, journey.entry, journey.entryET],
    [row.finish, journey.entry, journey.entryET],
  ]) {
    assert.equal(observed.instant, instant);
    assert.equal(observed.eastern, eastern);
    assert.match(observed.nonce, /^[a-f0-9-]{36}$/);
    assert.equal(observed.nonce, row.mount.nonce);
    assert.equal(observed.url, publicUrl);
  }
  const measuredPhases = [row.modeLayout, row.preSpinLayout, row.firstWheelLayout, row.resultLayout];
  for (const measured of measuredPhases) {
    assert.deepEqual(measured.configured, { width: row.width, height: row.height });
    assert([measured.width, measured.height, measured.scrollWidth,
      measured.html.clientWidth, measured.html.scrollWidth, measured.body.clientWidth, measured.body.scrollWidth,
      measured.visualViewport?.width, measured.visualViewport?.height, measured.visualViewport?.scale,
      measured.rect.width, measured.rect.height].every(value => Number.isFinite(value) && value > 0));
    assert(measured.topVisibleOverflowBoxes.length <= 20);
    assert.equal(measured.topVisibleOverflowBoxes.length, Math.min(20, measured.visibleOverflowBoxCount));
    assert(measured.targetAncestors.length >= 3 && measured.targetAncestors.length <= 9);
    assert.deepEqual(measured.targetAncestors.map(node => node.depth),
      measured.targetAncestors.map((_, i) => i));
    assert.deepEqual(measured.targetAncestors[0].rect, measured.rect);
    assert(measured.targetAncestors.every(node => typeof node.tag === 'string'
      && typeof node.className === 'string' && Number.isFinite(node.clientWidth) && Number.isFinite(node.scrollWidth)
      && ['display','gridTemplateColumns','minWidth','whiteSpace'].every(key => typeof node.computed[key] === 'string')));
  }
  for (const measured of [row.preSpinLayout, row.firstWheelLayout]) {
    assert(measured.targetAncestors.some(node => node.computed.display === 'grid'), 'Capture the actual wheel grid');
    assert(measured.targetAncestors.some(node => node.className.split(/\s+/).includes('max-w-4xl')
      && node.className.split(/\s+/).includes('px-4')), 'Capture the actual padded game wrapper');
  }
  if (!row.touch) {
    for (const measured of [row.firstWheelLayout, row.resultLayout]) {
      assert.equal(measured.width, row.width);
      assert.equal(measured.height, row.height);
      assert(Math.max(measured.scrollWidth, measured.html.scrollWidth, measured.body.scrollWidth) <= row.width + 1);
      assert(measured.rect.x >= -1 && measured.rect.right <= row.width + 1);
    }
  }
  if (row.touch) {
    const first = row.firstWheelLayout;
    assert(first.scrollWidth > row.width + 1 && first.rect.right > row.width + 1,
      'Original first wheel must exhibit the measured phone overflow');
    assert(first.visibleOverflowBoxCount > 0);
  }

  const expectation = journey.mountET === dayBefore ? prior : next;
  assert.equal(row.theme, expectation.themeText);
  const index = row.intercepts.filter(item => item.action === 'local-index').sort((a, b) => a.start - b.start);
  assert.deepEqual(index.map(({ start, limit, rows }) => [start, limit, rows]),
    Array.from({ length: 15 }, (_, i) => [i * 1000, 1000, Math.max(0, Math.min(1000, rawRows.length - i * 1000))]));
  const squads = row.intercepts.filter(item => item.action === 'local-squad');
  assert.deepEqual(squads.map(({ team, season }) => ({ team, season })), expectation.wheel);
  assert.deepEqual(row.wheel.map(item => item.slot), slots);
  for (const [i, stop] of row.wheel.entries()) {
    assert.deepEqual({ team: stop.team, season: stop.season }, expectation.wheel[i]);
    assert.equal(stop.landing, stop.season + ' ' + stop.team);
    assert.equal(stop.pickedPlayer, playerName(stop.team, stop.slot));
    const lastPick = i === slots.length - 1;
    assert.equal(stop.lineupPlayer, lastPick ? null : stop.pickedPlayer);
    assert.deepEqual(
      [stop.assignment, stop.slotButtonText, stop.nextAction],
      lastPick ? ['automatic', null, 'Skip to result'] : ['explicit', stop.slot, null],
    );
  }

  const expectedDate = journey.mountET;
  const otherDate = expectedDate === dayBefore ? dayAfter : dayBefore;
  const saved = row.saves[expectedDate];
  assert(saved, 'Actual mounted-day save');
  assert.equal(row.saves[otherDate], null);
  assert.equal(saved.v, 1);
  assert.equal(saved.date, expectedDate);
  assert.equal(saved.themeId, expectation.themeId);
  assert.equal(saved.spins, slots.length);
  assert.deepEqual(saved.teamNames, row.wheel.map(stop => stop.landing));
  assert.equal(saved.sim.games.length, 82);
  assert(saved.sim.games.every(game => typeof game === 'boolean'));
  assert.equal(saved.sim.wins, saved.sim.games.filter(Boolean).length);
  assert.equal(saved.sim.wins + saved.sim.losses, 82);
  assert.equal(row.resultText, saved.sim.wins + '-' + saved.sim.losses);
  assert.equal(row.verdictScore, row.resultText);
  assert(row.resultMeta?.startsWith('Daily · ' + expectedDate + ' ·'));
  assert(row.resultShare?.split('\n').includes('Daily · ' + expectedDate));
  const completions = row.intercepts.filter(item => item.completion);
  assert.deepEqual(completions.map(item => item.completion), [{ game: 'perfect-season-nba', score: saved.sim.wins }]);
  assert(completions.every(item => item.action === 'local-write-acknowledgement'));
}

let browser;
try {
  browser = await playwright.chromium.launch({ headless: true });
  for (const width of widths) {
    for (const journey of journeys) {
      try {
        const row = await runJourney(browser, width, journey);
        verifyJourney(row, journey);
        row.status = 'pass';
      } catch (error) {
        const row = report.cases.at(-1);
        row.status = 'fail';
        row.error = String(error.stack || error);
        report.errors.push({ id: row.id, error: row.error });
      }
      retain('report.json', report);
    }
  }
  assert.equal(report.cases.length, widths.length * journeys.length);
  assert.deepEqual(report.errors, []);
  for (const width of widths) {
    const [priorDay, fresh] = report.cases.filter(row => row.width === width);
    assert.notDeepEqual(fresh.saves[dayAfter].sim.games, priorDay.saves[dayBefore].sim.games);
  }
  for (const journey of journeys) {
    const observations = report.cases.filter(row => row.journey === journey.id);
    for (const row of observations.slice(1)) {
      assert.deepEqual(row.wheel, observations[0].wheel);
      assert.deepEqual(row.saves, observations[0].saves);
    }
  }
  report.diagnostic = {
    mobileFirstWheelOverflow: report.cases.filter(row => row.touch).map(row => row.id),
    desktopContained: report.cases.filter(row => !row.touch).map(row => row.id),
    modeAndPreSpinGeometryRetained: report.cases.length * 2,
    resultGeometryRetained: report.cases.length,
    screenshots: report.cases.length * 2,
  };
  assert.deepEqual(report.diagnostic.mobileFirstWheelOverflow,['320-before','320-after','390-before','390-after']);
  assert.deepEqual(report.diagnostic.desktopContained,['1280-before','1280-after']);
  assert.deepEqual([report.diagnostic.modeAndPreSpinGeometryRetained, report.diagnostic.resultGeometryRetained,
    report.diagnostic.screenshots],[12,6,12]);
  report.status = 'pass';
} catch (error) {
  report.status = 'fail';
  report.errors.push({ fatal: String(error.stack || error) });
} finally {
  if (browser) await browser.close();
  retain('report.json', report);
}

console.log((report.status === 'pass' ? 'PASS' : 'FAIL') + ' NBA Perfect Season original layout diagnostic');
if (report.status !== 'pass') process.exitCode = 1;
