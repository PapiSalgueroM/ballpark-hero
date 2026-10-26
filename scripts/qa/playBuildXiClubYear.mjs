import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

async function main() {
  const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const SELF = 'scripts/qa/playBuildXiClubYear.mjs';
  const PINS = [{"path":"src/data/lineupTeams.ts","bytes":7325,"sha256":"8c47d9c51b62c02de96fd3acdb910bc4d416d76d3797d2265228903ac6da173a","gitBlob":"cf7cd045678992998f826fab7c4cb65e36151124"},{"path":"src/components/lineup/LineupHowToPlay.tsx","bytes":8111,"sha256":"15dc2bfbe1ddaf80340cfacbdd0ef318caa3ebeb8236b5b68fc28cd51c4adae4","gitBlob":"a31b69ecd4a7edaba139de3cc7d20bbbf90e90d0"},{"path":"src/components/lineup/TeamSpinner.tsx","bytes":4802,"sha256":"93c884ed6349809dad6fe5c0e87c84b8a7842c5d2d44453276e61c61637883d6","gitBlob":"7c49f86a41927dee736614cb859d461f620ca6bc"},{"path":"src/pages/LineupBuilder.tsx","bytes":34723,"sha256":"81e107a671bcade84ea0c9c8f74c5bd8a4e0a2911e9830e8542f00de8fe94f81","gitBlob":"ca6f3a46a27d448054651818634f40ca1724142e"},{"path":"src/hooks/useLineupBuilder.ts","bytes":23033,"sha256":"46f76ed08b65908224721866908c4e0986e897dca8250581497d5bb76675172a","gitBlob":"d03150852caa5622114aba02bd12915abe2b12d7"},{"path":"src/types/lineupBuilder.ts","bytes":4390,"sha256":"c7380cb867fbffac5b4bb4c7a3127fc71a948f8daa7e14d237c4576dad54e33c","gitBlob":"956586d29518182e53bc603aab1eebdbda1f9d5f"},{"path":"scripts/lib/playwrightLoader.mjs","bytes":2777,"sha256":"94a07179be7ca6b9562d118b52c2d5d0dff0b6b2e29e49e4fea16fa2defb5a93","gitBlob":"4f7739e217e0a47ee82e6bfc8be1c04bed17454a"},{"path":"scripts/lib/offlineTransport.cjs","bytes":10660,"sha256":"e60ff1534307e449ccef598e3b7470dcba58681b82cea4005cec7319f14f9221","gitBlob":"0fda542a2649fe5da937c6976fd0f5b6073e74b6"},{"path":"package-lock.json","bytes":309049,"sha256":"c7e3867eabf0bfa03a8aa6a5e601b0050b937ed210d48c6bbd241019e3c9ea76","gitBlob":"97d6f12a052f25f400462938c241789a083f0bfe"},{"path":"package.json","bytes":3495,"sha256":"acfe14626dea53cf5f9c5e0286b766a22237656b52aac4c888b080873ac90e31","gitBlob":"2ff64986fb76ebc51b706f2fd24765768874008a"},{"path":"src/lib/safeStorage.ts","bytes":19906,"sha256":"3be2f5e5de4da6f6137e5aad30482da3313965f71169fb965765e37c3206225a","gitBlob":"43ab9a6ed454594bf4e0e2a4a20edc5e45cf7683"},{"path":"src/hooks/useRevealScroll.ts","bytes":12565,"sha256":"42ee464df372437ff934b2f6a2b4acafc25493eb4062e0602166bfdd2e7479cd","gitBlob":"0cd106080bfb4e0461d9b86f0a973689f717d502"},{"path":"src/hooks/useGameCompletion.ts","bytes":4333,"sha256":"125b276927ca63746254f0abab5835d78e7233df7962baa957e8d9fe54d82d84","gitBlob":"b104822551fd5d9b1c5d6ddb14f01c79e5a662b2"},{"path":"src/components/seo/GameSeoContent.tsx","bytes":19815,"sha256":"7a6939881bd1918d444ec1b2b72ed996bb596c598b313414add7bd2212a2c148","gitBlob":"fee19761e67b5db603647eb500fbf8c57e15c542"},{"path":"src/components/game/GameShell.tsx","bytes":6391,"sha256":"cf0204bfcae8c5ecd300780fcff7fbefe4f03552db65a3d5bf5b16d3ec09d18f","gitBlob":"fead16a74355c3e553a936c98f587da126d60f1c"},{"path":"src/components/world-xi/SeasonReportTabs.tsx","bytes":6837,"sha256":"fc8442971b94daa1d89f58fe69616cbd2c59302b46ba9f199c03224aaaf65a24","gitBlob":"87fc5819e629e3b1200a5bab65fc0cec2535b885"},{"path":"src/components/game/ResultScreen.tsx","bytes":8678,"sha256":"29c771e6d41e570d94195ac62e0fb569d4b8d41bffcf5244f58ba70693d0006e","gitBlob":"70da3c8fb022b8163f0a1a960bfaa0a71542fb12"},{"path":"src/components/lineup/XiFitBreakdown.tsx","bytes":8590,"sha256":"c32dfaa5f7d18cf9fa42c94adf16c32bd167d16e9e854e76d54672e7f0449252","gitBlob":"8aa7ee3c1e9112bf6550cfe9b564d5a6a5cbaa40"},{"path":"src/components/lineup/FormationPitch.tsx","bytes":3151,"sha256":"aec666b483c94b6b9d1211c4cd063beef997c4e2ac4156d409976c8821c2f9b6","gitBlob":"fa1efde4299bc63e12f3a07866f0ceec817b3678"},{"path":"src/integrations/supabase/client.ts","bytes":1247,"sha256":"c8bd6d5ebf2610a34eda085224ae087293162b1fda6d4b7d03ae51d77e369684","gitBlob":"d055e064f5c1c0c90230ca562966ee04dfdcd3ce"},{"path":"src/lib/localLineupEval.ts","bytes":3201,"sha256":"4904328091ea77d1e0812b15260f0ceca243f2f30260d4753b221d5dc2bb1589","gitBlob":"822a239d7d939e5c9ffc547b7d93752edd04125a"},{"path":"src/lib/validatorClient.ts","bytes":4916,"sha256":"75af0951f5a87c5fd7da80f557547f5b35e04c3fccc19d6811de9b87c96b471b","gitBlob":"8a0dad494b1ef8ca60838b918d7e011831203ec7"},{"path":"src/lib/placeholderName.ts","bytes":738,"sha256":"3469a34e6d00e1171b7456d0485f8006b08f906997e341daafd157c1b064b1cc","gitBlob":"fd0f1c9ef2d86a539033f5db47d113db09341262"},{"path":"src/lib/nameFold.ts","bytes":883,"sha256":"e36d89a779d486a748edc2b22a6a29e38b85105956e3d8ffb19af907c3e5f15c","gitBlob":"abb3e270fa1c87e78aa3871598c06571ff44a069"},{"path":"src/lib/worldXi.ts","bytes":67740,"sha256":"2f8d2bce7ca13ff998217005066e3c68e6c4bf7bf24e63da750378badba2fd23","gitBlob":"d30a6de90d868e789a76d21cf8b87696786f89d2"},{"path":"src/lib/squadDeal.ts","bytes":33686,"sha256":"7774e9237e6b6e19c3b631c8dd3036aa8331efa07e1acf051792e5b3769a6f8e","gitBlob":"726c554d99de4c285604e23cbe1d6def78477bcb"},{"path":"src/lib/positionFit.ts","bytes":10271,"sha256":"5da6886100bc49248424a8aebab205f656091d4d7894909e07654c0259d37e22","gitBlob":"868a0f0f92fedfde8f09d8fe31a4495f4965272e"},{"path":"src/lib/playerSearch.ts","bytes":40727,"sha256":"f9727a18b786a23e5d9e1849abff8a676dcd6aec10058ccd2e857473bb5fdbcd","gitBlob":"0d19f2c23735eb30512dc7fc3a447eacef5e128f"},{"path":"src/components/game/PlayerAutocomplete.tsx","bytes":28303,"sha256":"6f27ffebab781556981c0e6198c6524392267406b31153ad1ef69ec88e5e08be","gitBlob":"a0bd500b63306c75e0dea251cb6fb67ea2ed9452"},{"path":"src/lib/xiFit.ts","bytes":12235,"sha256":"e8c5878ec220e56e812d730f1e3664a40518469da6262f6a552fcc0715b0862e","gitBlob":"f2fb9c20467651b632e7715cb8b1ffd69fe6f296"}];
  const CLUBS = {"Real Madrid":["Real Madrid"],"Barcelona":["FC Barcelona"],"Manchester City":["Manchester City"],"Liverpool":["Liverpool FC"],"Bayern Munich":["Bayern Munich","FC Bayern Munich"],"PSG":["Paris Saint-Germain"],"Chelsea":["Chelsea FC"],"Arsenal":["Arsenal FC"],"Manchester United":["Manchester United"],"Juventus":["Juventus FC","Juventus"],"AC Milan":["AC Milan"],"Inter Milan":["Inter Milan"],"Borussia Dortmund":["Borussia Dortmund"],"Atlético Madrid":["Atlético de Madrid"],"Tottenham":["Tottenham Hotspur"],"Napoli":["SSC Napoli","Napoli"],"Benfica":["SL Benfica"],"Porto":["FC Porto"],"Ajax":["Ajax Amsterdam"],"Bayer Leverkusen":["Bayer 04 Leverkusen"],"Roma":["AS Roma","Roma"],"Sevilla":["Sevilla FC","Sevilla"],"Sporting CP":["Sporting CP"],"Newcastle":["Newcastle United"],"Aston Villa":["Aston Villa"],"West Ham":["West Ham United"],"Marseille":["Olympique Marseille"],"Lyon":["Olympique Lyon"],"Celtic":["Celtic FC"],"Galatasaray":["Galatasaray"]};
  const BASE = process.env.BUILD_XI_CLUB_YEAR_BASE_URL;
  const OUT = process.env.BUILD_XI_CLUB_YEAR_OUT;
  const CACHE = process.env.FREE_KICK_FONT_CACHE;
  const sha = data => crypto.createHash('sha256').update(data).digest('hex');
  const check = (value, marker) => assert.ok(value, marker);
  check(process.argv.length === 2, 'XI_BROWSER_ZERO_ARGUMENTS');
  check(['1', 'true'].includes(process.env.CI) && process.env.SIM_NETWORK === 'offline', 'XI_BROWSER_OFFLINE_CI');
  check((process.env.NODE_OPTIONS || '').includes('offlineTransport.cjs'), 'XI_BROWSER_ORIGINAL_GUARD');
  check(BASE === 'http://127.0.0.1:4173', 'XI_BROWSER_LOCAL_ORIGIN');
  check(OUT && path.isAbsolute(OUT) && !fs.existsSync(OUT), 'XI_BROWSER_FRESH_OUT');
  const outRelative = path.relative(ROOT, OUT);
  check(outRelative && (outRelative.startsWith('..' + path.sep) || path.isAbsolute(outRelative)), 'XI_BROWSER_OUTSIDE_ROOT');
  check(!process.env.BUILD_XI_CLUB_YEAR_CONTROL && !process.env.SIM_SEED, 'XI_BROWSER_NO_INHERITED_CONTROL');
  const receipt = process.env.SIM_OFFLINE_RECEIPT;
  const emptyReceipt = () => {
    check(receipt && path.isAbsolute(receipt), 'XI_BROWSER_RECEIPT_PATH');
    const st = fs.lstatSync(receipt);
    check(st.isFile() && !st.isSymbolicLink() && st.size === 0, 'XI_BROWSER_PRESENT_EMPTY_RECEIPT');
  };
  emptyReceipt();
  fs.mkdirSync(OUT, { recursive: false });
  const write = (name, value) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
  const pin = file => {
    const st = fs.lstatSync(file);
    check(st.isFile() && !st.isSymbolicLink(), 'XI_BROWSER_REGULAR_SOURCE');
    const bytes = fs.readFileSync(file);
    return { bytes: bytes.length, sha256: sha(bytes), gitBlob: crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob ' + bytes.length + '\0'), bytes])).digest('hex') };
  };
  const sourceBinding = () => {
    const rows = PINS.map(row => {
      const actual = pin(path.join(ROOT, row.path));
      assert.deepEqual(actual, { bytes: row.bytes, sha256: row.sha256, gitBlob: row.gitBlob }, 'XI_BROWSER_SELECTED_SOURCE: ' + row.path);
      return { ...row, ...actual };
    });
    rows.push({ path: SELF, ...pin(path.join(ROOT, SELF)) });
    return rows;
  };
  const tree = directory => {
    const rows = [];
    const walk = (dir, prefix) => {
      for (const name of fs.readdirSync(dir).sort()) {
        const file = path.join(dir, name), rel = prefix ? prefix + '/' + name : name;
        const st = fs.lstatSync(file);
        check(!st.isSymbolicLink(), 'XI_BROWSER_NO_DIST_LINK');
        if (st.isDirectory()) walk(file, rel);
        else { check(st.isFile(), 'XI_BROWSER_REGULAR_DIST'); rows.push({ path: rel, ...pin(file) }); }
      }
    };
    walk(directory, '');
    return rows;
  };
  check(CACHE && path.isAbsolute(CACHE), 'XI_BROWSER_PREPARED_FONTS');
  const fontManifest = fs.readFileSync(path.join(CACHE, 'manifest.json'));
  const fonts = JSON.parse(fontManifest);
  check(Array.isArray(fonts) && fonts.length > 0, 'XI_BROWSER_FONT_MANIFEST');
  const fontByURL = new Map();
  for (const row of fonts) {
    check(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(new URL(row.url).origin)
      && /^[a-f0-9]{64}$/.test(row.file), 'XI_BROWSER_PINNED_FONT_PATH');
    const file = path.join(CACHE, row.file);
    const actual = pin(file), bytes = fs.readFileSync(file);
    check(actual.sha256 === row.sha256 && sha(bytes) === row.sha256, 'XI_BROWSER_FONT_BODY');
    check(!fontByURL.has(row.url), 'XI_BROWSER_UNIQUE_FONT_URL');
    fontByURL.set(row.url, { ...row, body: bytes });
  }
  const sourceBefore = sourceBinding();
  const distBefore = tree(path.join(ROOT, 'dist'));
  const fontBefore = { manifest: sha(fontManifest), rows: fonts.map(row => ({ file: row.file, ...pin(path.join(CACHE, row.file)) })) };
  write('bindings-before.json', { source: sourceBefore, dist: distBefore, fonts: fontBefore });
  const docPath = fs.existsSync(path.join(ROOT, 'dist/build-your-xi/index.html')) ? 'dist/build-your-xi/index.html' : 'dist/index.html';
  const expectedDoc = fs.readFileSync(path.join(ROOT, docPath));
  const served = await fetch(BASE + '/build-your-xi', { signal: AbortSignal.timeout(10000) });
  check(served.ok, 'XI_BROWSER_SERVED_DOCUMENT');
  const servedBody = Buffer.from(await served.arrayBuffer());
  check(servedBody.equals(expectedDoc), 'XI_BROWSER_ACTUAL_DIST_DOCUMENT');
  write('served-document.json', { path: docPath, bytes: servedBody.length, sha256: sha(servedBody), status: served.status });

  const roles = ['GK', 'LB', 'CB', 'CB', 'RB', 'LM', 'CM', 'CM', 'RM', 'ST', 'ST'];
  const rawPositions = { GK: 'Goalkeeper', LB: 'Left-Back', CB: 'Centre-Back', RB: 'Right-Back', LM: 'Left Midfield', CM: 'Central Midfield', RM: 'Right Midfield', ST: 'Centre-Forward' };
  const fixture = [];
  for (const [clubIndex, [, aliases]] of Object.entries(CLUBS).entries()) {
    for (const year of [2010, 2026]) {
      const make = (name, position, value, key) => ({
        player_name: name, name_folded: name.toLowerCase(), person_key: key, position,
        club: aliases[0], nationality: 'Fixtureland', year, age: 24,
        market_value_usd: value + (year === 2026 ? 100000000 : 0),
      });
      for (let i = 0; i < 15; i++) fixture.push(make('Fictional Forward ' + clubIndex + ' ' + i, 'Centre-Forward', 120000000 - i * 1000000, 'fixture-' + clubIndex + '-forward-' + i));
      for (let slot = 0; slot < roles.length; slot++) fixture.push(make(
        slot === 0 ? 'Fictional Keeper ' + clubIndex : 'Fictional Pick ' + clubIndex + ' ' + slot,
        rawPositions[roles[slot]], slot === 0 ? 1000000 : 80000000 - slot * 1000000, 'fixture-' + clubIndex + '-slot-' + slot,
      ));
    }
  }
  write('fictional-records.json', { scope: 'Synthetic read-only rows, not real rosters or appearance evidence', rows: fixture });
  const cases = [320, 390, 1280].flatMap(width => [2010, 2026].map(year => ({
    id: width + '-' + year, width, height: width === 320 ? 740 : width === 390 ? 844 : 900, year, mobile: width < 640,
  })));
  cases.push({ id: '390-mixed', width: 390, height: 844, year: null, mobile: true });
  const report = {
    schema: 'build-xi-club-year-browser-v1', executingProcess: { pid: process.pid, argv: process.argv, self: sourceBefore.at(-1) },
    fixtureScope: 'Fictional transport only; fixed Math.random 0.5, native page clocks and spinner timing',
    plannedCases: cases.map(c => c.id), plannedPNGs: 26, completed: [], controls: [],
    scope: { browser: 'Chromium', theme: 'dark', motion: 'no-preference', mixed: 'one club pick and reroll only', realRosters: 'UNVERIFIED', actualFleet: false },
  };
  const point = async locator => locator.evaluate(el => {
    const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, hit = document.elementFromPoint(x, y);
    return {
      rect: { x: r.x, y: r.y, left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height },
      connected: el.isConnected, enabled: !el.disabled, centerHit: hit === el || el.contains(hit),
      viewport: { width: innerWidth, height: innerHeight }, text: (el.innerText || el.getAttribute('aria-label') || '').trim(),
      tag: el.tagName, active: document.activeElement === el,
    };
  });
  const scroll = page => page.evaluate(() => ({
    x: scrollX, y: scrollY, documentTop: document.documentElement.scrollTop, bodyTop: document.body.scrollTop,
    activeTag: document.activeElement?.tagName || null,
    activeRole: document.activeElement?.getAttribute('role') || null,
  }));
  const settle = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  function judgeRecord(record) {
    if (record.kind === 'action') {
      check(record.connected && record.enabled, 'XI_BROWSER_TARGET_CONNECTED');
      check(record.rect.width > 0 && record.rect.height > 0 && record.rect.left >= 0 && record.rect.right <= record.viewport.width
        && record.rect.top >= 0 && record.rect.bottom <= record.viewport.height, 'XI_BROWSER_TARGET_VIEW');
      if (record.requires44) check(record.rect.width >= 44 && record.rect.height >= 44, 'XI_BROWSER_TARGET_44');
      check(record.centerHit, 'XI_BROWSER_CENTER_HIT');
    } else if (record.kind === 'jump') {
      check(record.before.x === record.after.x && record.before.y === record.after.y
        && record.before.documentTop === record.after.documentTop && record.before.bodyTop === record.after.bodyTop,
      record.marker);
    } else if (record.kind === 'list') {
      check(record.inputFocused, 'XI_BROWSER_INPUT_FOCUS');
      check(record.active && record.active.top >= record.clientTop - 0.5 && record.active.bottom <= record.clientBottom + 0.5,
        'XI_BROWSER_LIST_VISIBLE');
      check(record.active.left >= 0 && record.active.right <= record.viewport.width
        && record.active.top >= 0 && record.active.bottom <= record.viewport.height && record.centerHit, 'XI_BROWSER_LIST_VIEW_HIT');
    } else if (record.kind === 'query') {
      check(record.method === 'GET' && record.path === '/rest/v1/player_market_values', 'XI_BROWSER_QUERY_READ_ONLY');
      check(record.year === 'eq.' + record.expectedYear, 'XI_BROWSER_QUERY_YEAR');
    } else assert.fail('XI_BROWSER_UNKNOWN_RECORD');
  }
  async function prepare(locator, page, row) {
    await locator.waitFor({ state: 'visible' });
    const before = await scroll(page);
    await locator.evaluate(el => el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }));
    await settle(page);
    row.preparations.push({ text: (await locator.innerText().catch(() => '')), before, after: await scroll(page), target: await point(locator) });
  }
  async function tap(locator, page, row, label, requires44 = false, prepared = false) {
    if (!prepared) await prepare(locator, page, row);
    const record = { kind: 'action', label, requires44, ...await point(locator) };
    row.checks.push(record);
    judgeRecord(record);
    row.actions.push({ label, before: await scroll(page), target: record, trustedEventStart: await page.evaluate(() => window.__xiEvents.length) });
    if (row.mobile) await page.touchscreen.tap(record.rect.left + record.rect.width / 2, record.rect.top + record.rect.height / 2);
    else await page.mouse.click(record.rect.left + record.rect.width / 2, record.rect.top + record.rect.height / 2);
    await settle(page);
    row.actions.at(-1).after = await scroll(page);
  }
  const input = page => page.getByRole('combobox');
  const pitch = page => page.locator('button').filter({ has: page.locator('span', { hasText: /^GK$/ }) }).first().locator('..');
  const slot = (page, index) => pitch(page).locator(':scope > button').nth(index);
  const progress = (page, n) => page.getByText(n + '/11', { exact: true }).waitFor({ state: 'visible' });
  async function waitSpin(page) { await page.getByTitle('Reroll club', { exact: true }).waitFor({ state: 'visible' }); }
  async function clubLabel(page) {
    const text = await page.locator('p').filter({ hasText: /^Matching .+ records from \d{4}$/ }).innerText();
    const match = /^Matching (.+) records from (\d{4})$/.exec(text);
    check(match && Object.hasOwn(CLUBS, match[1]), 'XI_BROWSER_KNOWN_CLUB');
    return { name: match[1], year: Number(match[2]) };
  }
  async function listSample(page, row, label) {
    const value = await page.evaluate(() => {
      const input = document.querySelector('[role="combobox"]'), list = document.querySelector('[role="listbox"]');
      const active = list?.querySelector('[role="option"][aria-selected="true"]');
      const rect = el => { if (!el) return null; const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; };
      const box = list?.getBoundingClientRect(), r = active?.getBoundingClientRect();
      const hit = r ? document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) : null;
      return {
        kind: 'list', inputFocused: document.activeElement === input, input: rect(input), list: rect(list), active: rect(active),
        activeText: active?.textContent || null, scrollTop: list?.scrollTop ?? null,
        clientTop: box ? box.top + list.clientTop : null, clientBottom: box ? box.top + list.clientTop + list.clientHeight : null,
        centerHit: !!active && (hit === active || active.contains(hit)), viewport: { width: innerWidth, height: innerHeight },
        window: { x: scrollX, y: scrollY, documentTop: document.documentElement.scrollTop, bodyTop: document.body.scrollTop },
      };
    });
    value.label = label;
    row.checks.push(value);
    judgeRecord(value);
    return value;
  }
  async function noJump(page, row, before, marker) {
    const record = { kind: 'jump', marker, before, after: await scroll(page) };
    row.checks.push(record); judgeRecord(record); return record;
  }
  async function chooseSlot(page, row, index) {
    const target = slot(page, index);
    await prepare(target, page, row);
    const before = await scroll(page);
    await tap(target, page, row, 'empty slot ' + index, false, true);
    await input(page).waitFor({ state: 'visible' });
    await settle(page);
    const record = await noJump(page, row, before, 'XI_CLUB_YEAR_SLOT_NO_JUMP');
    row.slotMounts.push({ index, record, input: await point(input(page)), body: await page.locator('body').innerText() });
  }
  async function browse(page, row) {
    const button = page.getByRole('button', { name: 'Browse players', exact: true });
    await prepare(button, page, row);
    const before = await scroll(page);
    await tap(button, page, row, 'Browse players', true, true);
    await page.getByRole('option').first().waitFor({ state: 'visible' });
    await noJump(page, row, before, 'XI_CLUB_YEAR_BROWSE_NO_JUMP');
    check(await input(page).inputValue() === '', 'XI_BROWSER_BROWSE_EMPTY_QUERY');
    check(await page.getByRole('option').count() === 26, 'XI_BROWSER_BROWSE_MATCHING_RECORDS');
  }
  async function type(page, row, text) {
    await prepare(input(page), page, row);
    const p = await point(input(page));
    await page.mouse.click(p.rect.left + p.rect.width / 2, p.rect.top + p.rect.height / 2);
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.type(text);
  }
  async function screenshot(page, row, label) {
    const name = row.id + '-' + label + '.png';
    await page.screenshot({ path: path.join(OUT, name), fullPage: false, animations: 'disabled' });
    row.screenshots.push({ name, ...pin(path.join(OUT, name)) });
  }
  function recordControls(actualCase) {
    const action = actualCase.checks.find(r => r.kind === 'action' && r.label === 'Browse players');
    const jump = actualCase.checks.find(r => r.kind === 'jump' && r.marker === 'XI_CLUB_YEAR_SLOT_NO_JUMP');
    const list = actualCase.checks.find(r => r.kind === 'list' && r.label === 'ArrowUp lower keeper');
    const query = actualCase.checks.find(r => r.kind === 'query');
    check(action && jump && list && query, 'XI_BROWSER_CONTROL_ACTUAL_FOUNDATION');
    const recipes = [
      ['height', action, r => { r.rect.height = 43; }, 'XI_BROWSER_TARGET_44'],
      ['center-hit', action, r => { r.centerHit = false; }, 'XI_BROWSER_CENTER_HIT'],
      ['viewport', action, r => { r.rect.left = -1; }, 'XI_BROWSER_TARGET_VIEW'],
      ['slot-scroll', jump, r => { r.after.y += 1; }, 'XI_CLUB_YEAR_SLOT_NO_JUMP'],
      ['list-hidden', list, r => { r.active.bottom = r.clientBottom + 1; }, 'XI_BROWSER_LIST_VISIBLE'],
      ['input-focus', list, r => { r.inputFocused = false; }, 'XI_BROWSER_INPUT_FOCUS'],
      ['query-year', query, r => { r.year = 'eq.2009'; }, 'XI_BROWSER_QUERY_YEAR'],
    ];
    fs.mkdirSync(path.join(OUT, 'record-controls'));
    for (const [id, source, mutate, marker] of recipes) {
      const before = JSON.stringify(source, null, 2) + '\n';
      const changed = JSON.parse(before);
      judgeRecord(JSON.parse(before));
      mutate(changed);
      const changedBody = JSON.stringify(changed, null, 2) + '\n';
      check(changedBody !== before && sha(changedBody) !== sha(before), 'XI_BROWSER_CONTROL_EFFECTIVE');
      const dir = 'record-controls/' + id;
      fs.mkdirSync(path.join(OUT, dir));
      fs.writeFileSync(path.join(OUT, dir, 'before.json'), before, { flag: 'wx' });
      fs.writeFileSync(path.join(OUT, dir, 'changed.json'), changedBody, { flag: 'wx' });
      let failure;
      try { judgeRecord(changed); } catch (error) { failure = error; }
      check(failure?.name === 'AssertionError' && failure.code === 'ERR_ASSERTION' && failure.message.includes(marker)
        && failure.stack.includes(marker), 'XI_BROWSER_CONTROL_OWNED');
      fs.writeFileSync(path.join(OUT, dir, 'restored.json'), before, { flag: 'wx' });
      const restored = fs.readFileSync(path.join(OUT, dir, 'restored.json'));
      check(restored.equals(Buffer.from(before)), 'XI_BROWSER_CONTROL_FULL_RESTORE');
      judgeRecord(JSON.parse(restored));
      report.controls.push({
        id, marker, scope: 'Copied actual completed observation, judge-only', actualProcessPid: process.pid,
        diagnosticCounts: [0, 1, 0], nativeChildProcesses: 0,
        before: pin(path.join(OUT, dir, 'before.json')), changed: pin(path.join(OUT, dir, 'changed.json')),
        restored: pin(path.join(OUT, dir, 'restored.json')),
        error: { name: failure.name, code: failure.code, message: failure.message, stack: failure.stack },
      });
    }
  }
  const { chromium } = await import('../lib/playwrightLoader.mjs');
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  report.browser = { name: browser.browserType().name(), version: browser.version() };
  let primaryError;
  try {
    for (const profile of cases) {
      const row = { ...profile, status: 'running', preparations: [], actions: [], checks: [], slotMounts: [], requests: [], responses: [],
        console: [], pageErrors: [], requestFailures: [], routeErrors: [], webSockets: [], events: [], screenshots: [] };
      let context, page;
      try {
        context = await browser.newContext({
          viewport: { width: profile.width, height: profile.height }, isMobile: profile.mobile, hasTouch: profile.mobile,
          deviceScaleFactor: 1, colorScheme: 'dark', reducedMotion: 'no-preference', serviceWorkers: 'block',
        });
        await context.routeWebSocket('**/*', route => {
          row.webSockets.push({ url: route.url(), action: 'closed-without-connectToServer' });
          route.close({ code: 1008, reason: 'Offline synthetic fixture' });
        });
        await context.addInitScript(() => {
          window.__xiRandomCalls = 0;
          Math.random = () => { window.__xiRandomCalls += 1; return 0.5; };
          localStorage.setItem('lineup-rules-seen', '1');
          localStorage.setItem('cookie-consent', 'essential');
          window.__xiEvents = [];
          for (const name of ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'touchcancel', 'click', 'keydown', 'focusin', 'input', 'scroll']) {
            document.addEventListener(name, event => {
              const target = event.target;
              window.__xiEvents.push({
                type: event.type, trusted: event.isTrusted, key: event.key || null, pointerType: event.pointerType || null,
                tag: target?.tagName || null, role: target?.getAttribute?.('role') || null,
                text: (target?.innerText || target?.getAttribute?.('aria-label') || '').slice(0, 180),
                x: scrollX, y: scrollY, at: performance.now(),
              });
            }, true);
          }
        });
        await context.route('**/*', async route => {
          const request = route.request(), url = new URL(request.url());
          try {
          const record = { index: row.requests.length, method: request.method(), url: url.href, path: url.pathname, resourceType: request.resourceType(), action: null };
          row.requests.push(record);
          if (url.origin === BASE) { record.action = 'local-continue'; return route.continue(); }
          const font = fontByURL.get(url.href);
          if (font && request.method() === 'GET') {
            record.action = 'pinned-font';
            record.bodySha256 = font.sha256;
            return route.fulfill({ status: 200, body: font.body, contentType: font.contentType || 'font/woff2', headers: { 'access-control-allow-origin': '*' } });
          }
          const fixtureTable = ['/rest/v1/player_market_values', '/rest/v1/player_verified_positions'].includes(url.pathname);
          if (url.origin === 'https://flawuiqbvjobmkfkauhw.supabase.co' && fixtureTable && request.method() === 'OPTIONS') {
            check(request.headers()['access-control-request-method'] === 'GET', 'XI_BROWSER_PREFLIGHT_READ_ONLY');
            record.action = 'fictional-read-only-preflight';
            return route.fulfill({ status: 204, body: '', headers: { 'access-control-allow-origin': '*',
              'access-control-allow-headers': request.headers()['access-control-request-headers'] || 'authorization,apikey,content-type,x-client-info,accept-profile,prefer',
              'access-control-allow-methods': 'GET,OPTIONS' } });
          }
          if (url.origin === 'https://flawuiqbvjobmkfkauhw.supabase.co' && url.pathname === '/rest/v1/player_market_values' && request.method() === 'GET') {
            const rawClub = url.searchParams.get('club');
            const aliases = rawClub?.startsWith('in.(') && rawClub.endsWith(')') ? rawClub.slice(4, -1).split(',').map(s => s.replace(/^"|"$/g, '')) : null;
            const matchedClub = aliases && Object.entries(CLUBS).find(([, names]) => JSON.stringify(names) === JSON.stringify(aliases));
            check(matchedClub, 'XI_BROWSER_EXACT_EXISTING_CLUB_FILTER');
            check(!url.searchParams.has('nationality'), 'XI_BROWSER_CLUB_ONLY_QUERY');
            const year = url.searchParams.get('year');
            if (profile.year !== null) {
              const observed = { kind: 'query', method: request.method(), path: url.pathname, year, expectedYear: profile.year, club: matchedClub[0], aliases, query: Object.fromEntries(url.searchParams) };
              row.checks.push(observed); judgeRecord(observed);
            } else check(year === null, 'XI_BROWSER_MIXED_NO_YEAR_FILTER');
            let data = fixture.filter(r => aliases.includes(r.club) && (year === null || year === 'eq.' + r.year));
            const search = url.searchParams.get('name_folded');
            if (search !== null) {
              check(/^ilike\.%.*%$/.test(search), 'XI_BROWSER_NAME_QUERY_SHAPE');
              const needle = search.slice(7, -1).toLowerCase();
              data = data.filter(r => r.name_folded.includes(needle));
            }
            data.sort((a, b) => b.market_value_usd - a.market_value_usd || b.year - a.year || a.player_name.localeCompare(b.player_name));
            const limit = Number(url.searchParams.get('limit'));
            check(Number.isInteger(limit) && limit > 0 && limit <= 1000, 'XI_BROWSER_BOUNDED_QUERY');
            data = data.slice(0, limit);
            record.action = 'fictional-read-only';
            record.year = year;
            record.club = matchedClub[0];
            record.rowNames = data.map(r => r.player_name);
            record.rowYears = data.map(r => r.year);
            record.bodySha256 = sha(JSON.stringify(data));
            return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data), headers: { 'access-control-allow-origin': '*' } });
          }
          if (url.origin === 'https://flawuiqbvjobmkfkauhw.supabase.co' && url.pathname === '/rest/v1/player_verified_positions' && request.method() === 'GET') {
            check(fixture.some(r => 'ilike.' + r.player_name === url.searchParams.get('player_name')), 'XI_BROWSER_HISTORY_FIXTURE_NAME');
            record.action = 'fictional-empty-history';
            return route.fulfill({ status: 200, contentType: 'application/json', body: '[]', headers: { 'access-control-allow-origin': '*' } });
          }
          record.action = 'aborted-external';
          return route.abort('blockedbyclient');
          } catch (error) {
            row.routeErrors.push({ url: url.href, method: request.method(), name: error.name, code: error.code, message: error.message, stack: error.stack });
            try { await route.abort('blockedbyclient'); } catch (abortError) {
              row.routeErrors.at(-1).abortError = { name: abortError.name, message: abortError.message, stack: abortError.stack };
            }
          }
        });
        page = await context.newPage();
        page.setDefaultTimeout(10000);
        page.on('console', msg => row.console.push({ type: msg.type(), text: msg.text(), location: msg.location() }));
        page.on('pageerror', error => row.pageErrors.push({ name: error.name, message: error.message, stack: error.stack }));
        page.on('requestfailed', request => row.requestFailures.push({ url: request.url(), method: request.method(), resourceType: request.resourceType(), failure: request.failure() }));
        page.on('response', response => row.responses.push({ url: response.url(), status: response.status() }));
        await page.goto(BASE + '/build-your-xi', { waitUntil: 'networkidle' });
        await page.evaluate(() => document.fonts.ready);
        check(await page.evaluate(() => document.fonts.status === 'loaded'), 'XI_BROWSER_FONTS_LOADED');
        await page.getByRole('button', { name: '4-4-2', exact: false }).waitFor({ state: 'visible' });
        row.initial = { title: await page.title(), userAgent: await page.evaluate(() => navigator.userAgent), body: await page.locator('body').innerText(), scroll: await scroll(page) };
        check(await page.getByRole('button', { name: 'Mixed', exact: true }).getAttribute('aria-pressed') === 'true', 'XI_BROWSER_MIXED_DEFAULT');
        if (profile.year !== null) {
          await tap(page.getByRole('button', { name: 'Club year draft', exact: true }), page, row, 'Club year draft', true);
          const select = page.getByLabel('Recorded year', { exact: true });
          await tap(select, page, row, 'Recorded year', true);
          await page.keyboard.press('Home');
          for (let step = 2026; step > profile.year; step--) await page.keyboard.press('ArrowDown');
          await page.keyboard.press('Enter');
          check(await select.inputValue() === String(profile.year), 'XI_BROWSER_NATIVE_YEAR_SELECTION');
          await screenshot(page, row, 'setup');
        } else await screenshot(page, row, 'mixed-setup');
        await tap(page.getByRole('button', { name: '4-4-2', exact: false }), page, row, '4-4-2 formation');
        if (profile.year === null) {
          await page.getByTitle('Reroll: get a different team', { exact: true }).waitFor({ state: 'visible' });
          await progress(page, 0);
          await tap(slot(page, 0), page, row, 'Mixed GK slot');
          await input(page).waitFor({ state: 'visible' });
          await type(page, row, 'Fictional Keeper 0');
          const option = page.getByRole('option').filter({ hasText: 'Fictional Keeper 0' });
          await tap(option, page, row, 'Mixed fixture keeper');
          await progress(page, 1);
          await page.getByTitle('Reroll: get a different team', { exact: true }).waitFor({ state: 'visible' });
          await tap(page.getByTitle('Reroll: get a different team', { exact: true }), page, row, 'Mixed reroll');
          await page.getByTitle('Reroll: get a different team', { exact: true }).waitFor({ state: 'visible' });
          row.mixed = { filled: 1, body: await page.locator('body').innerText() };
          await screenshot(page, row, 'mixed-final');
        } else {
          await waitSpin(page); await progress(page, 0);
          const lowestIndex = await pitch(page).locator(':scope > button').evaluateAll(buttons => buttons.map((button, index) => ({ index, top: button.getBoundingClientRect().top })).sort((a, b) => b.top - a.top)[0].index);
          row.lowestEmptySlot = lowestIndex;
          await chooseSlot(page, row, lowestIndex);
          const beforeReroll = await clubLabel(page);
          await tap(page.getByTitle('Reroll club', { exact: true }), page, row, 'Club year reroll', true);
          await waitSpin(page);
          const afterReroll = await clubLabel(page);
          check(beforeReroll.name !== afterReroll.name && afterReroll.year === profile.year, 'XI_BROWSER_DIFFERENT_CLUB_SAME_YEAR');
          row.reroll = { before: beforeReroll, after: afterReroll };
          await chooseSlot(page, row, 0);
          const current = await clubLabel(page);
          const clubIndex = Object.keys(CLUBS).indexOf(current.name);
          const keeper = 'Fictional Keeper ' + clubIndex;
          await browse(page, row);
          await page.keyboard.press('Escape');
          check(await page.getByRole('listbox').count() === 0, 'XI_BROWSER_ESCAPE_CLOSES');
          await browse(page, row);
          await tap(page.getByRole('heading', { name: 'BUILD YOUR XI', exact: true }), page, row, 'outside picker heading');
          check(await page.getByRole('listbox').count() === 0, 'XI_BROWSER_OUTSIDE_CLOSES');
          await browse(page, row);
          await prepare(input(page), page, row);
          const beforeArrows = await scroll(page);
          await page.keyboard.press('ArrowUp');
          await page.waitForFunction(() => {
            const list = document.querySelector('[role="listbox"]'), option = list?.querySelector('[aria-selected="true"]');
            if (!list || !option) return false;
            const box = list.getBoundingClientRect(), r = option.getBoundingClientRect(), top = box.top + list.clientTop;
            return r.top >= top - 0.5 && r.bottom <= top + list.clientHeight + 0.5;
          });
          const lower = await listSample(page, row, 'ArrowUp lower keeper');
          check(lower.activeText.includes(keeper) && lower.scrollTop > 0, 'XI_BROWSER_LOWER_KEEPER_DISCOVERABLE');
          await noJump(page, row, beforeArrows, 'XI_BROWSER_ARROW_NO_JUMP');
          await screenshot(page, row, 'browse');
          await page.keyboard.press('ArrowDown');
          await settle(page);
          const wrapped = await listSample(page, row, 'ArrowDown wrapped first');
          check(wrapped.scrollTop === 0 && !wrapped.activeText.includes(keeper), 'XI_BROWSER_WRAP_FIRST');
          await noJump(page, row, beforeArrows, 'XI_BROWSER_ARROW_NO_JUMP');
          await type(page, row, 'Fictional');
          await page.waitForFunction(() => document.querySelectorAll('[role="option"]').length === 8);
          row.typedDefault = { options: await page.getByRole('option').allTextContents(), value: await input(page).inputValue() };
          check(!row.typedDefault.options.some(text => text.includes(keeper)), 'XI_BROWSER_TYPED_DEFAULT_EIGHT');
          await browse(page, row);
          await prepare(input(page), page, row);
          await page.keyboard.press('ArrowUp');
          await settle(page);
          await listSample(page, row, 'keeper before commit');
          if (profile.id === '320-2010') {
            const target = page.getByRole('option', { selected: true }), observed = await point(target);
            const session = await context.newCDPSession(page);
            const touches = [{ x: observed.rect.left + observed.rect.width / 2, y: observed.rect.top + observed.rect.height / 2 }];
            const start = await scroll(page);
            await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: touches });
            await settle(page);
            await progress(page, 0);
            const afterDown = await scroll(page);
            await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
            await settle(page);
            await progress(page, 0);
            row.touchCancellation = { target: observed, before: start, afterDown, afterCancel: await scroll(page), filledAfterDown: 0, filledAfterCancel: 0 };
            await session.detach();
          }
          if (profile.mobile) await tap(page.getByRole('option', { selected: true }), page, row, 'touch keeper', false, true);
          else await page.keyboard.press('Enter');
          await progress(page, 1);
          row.picks = [{ index: 0, name: keeper, club: current.name, year: profile.year, interaction: profile.mobile ? 'native touch' : 'native Enter' }];
          for (let index = 1; index < 11; index++) {
            await waitSpin(page);
            await chooseSlot(page, row, index);
            const assigned = await clubLabel(page), ci = Object.keys(CLUBS).indexOf(assigned.name);
            const name = 'Fictional Pick ' + ci + ' ' + index;
            await type(page, row, name);
            const option = page.getByRole('option').filter({ has: page.locator('span.text-sm.font-medium').filter({ hasText: new RegExp('^' + name + '$') }) });
            await tap(option, page, row, 'pick slot ' + index);
            if (index < 10) await progress(page, index + 1);
            else await page.getByRole('button', { name: 'Submit Team', exact: true }).waitFor({ state: 'visible' });
            row.picks.push({ index, name, club: assigned.name, year: profile.year, interaction: profile.mobile ? 'native touch' : 'native pointer' });
          }
          await page.getByRole('button', { name: 'Submit Team', exact: true }).waitFor({ state: 'visible' });
          check(new Set(row.picks.map(p => p.name)).size === 11 && row.picks.every(p => p.year === profile.year), 'XI_BROWSER_ELEVEN_DISTINCT_YEAR_PICKS');
          await tap(page.getByRole('button', { name: 'Submit Team', exact: true }), page, row, 'Submit Team');
          await page.getByRole('heading', { name: 'Season Report', exact: true }).waitFor({ state: 'visible' });
          row.result = { body: await page.locator('body').innerText(), scroll: await scroll(page) };
          check((row.result.body.match(new RegExp(profile.year + ' value', 'g')) || []).length === 11, 'XI_BROWSER_SELECTED_YEAR_RESULT_ELEVEN');
          check(row.result.body.includes('Club year draft: recorded year ' + profile.year)
            && row.result.body.includes('A fictional season from your selected ' + profile.year + ' records'), 'XI_BROWSER_RECORDED_YEAR_RESULT');
          check(!row.requests.some(r => r.path.includes('/functions/v1/evaluate-lineup') || r.path.includes('/functions/v1/validate-player')), 'XI_BROWSER_NO_YEAR_PROVIDER');
          await screenshot(page, row, 'result');
          await tap(page.getByRole('button', { name: 'Play Again', exact: true }), page, row, 'Play Again');
          await page.getByRole('button', { name: 'Club year draft', exact: true }).waitFor({ state: 'visible' });
          check(await page.getByRole('button', { name: 'Club year draft', exact: true }).getAttribute('aria-pressed') === 'true'
            && await page.getByLabel('Recorded year', { exact: true }).inputValue() === String(profile.year), 'XI_BROWSER_REPLAY_CONFIG');
          await screenshot(page, row, 'replay');
        }
        row.finalBody = await page.locator('body').innerText();
        row.finalScroll = await scroll(page);
        row.randomCalls = await page.evaluate(() => window.__xiRandomCalls);
        check(row.routeErrors.length === 0, 'XI_BROWSER_NO_ROUTE_ERROR');
        check(row.pageErrors.length === 0, 'XI_BROWSER_NO_PAGE_ERROR');
        check(row.webSockets.length === 0, 'XI_BROWSER_NO_SOCKET_ATTEMPT');
        row.status = 'passed';
      } catch (error) {
        row.status = 'failed';
        row.error = { name: error.name, code: error.code, message: error.message, stack: error.stack };
        if (page) {
          try { row.failureBody = await page.locator('body').innerText(); row.failureScroll = await scroll(page); await screenshot(page, row, 'failure'); }
          catch (captureError) { row.failureCaptureError = { name: captureError.name, message: captureError.message, stack: captureError.stack }; }
        }
        throw error;
      } finally {
        if (page) {
          try { row.events = await page.evaluate(() => window.__xiEvents || []); }
          catch (error) { row.eventReadError = { name: error.name, message: error.message, stack: error.stack }; }
        }
        if (context) {
          try { await context.close(); }
          catch (error) { row.contextCloseError = { name: error.name, message: error.message, stack: error.stack }; row.status = 'failed'; }
        }
        write(row.id + '.json', row);
        report.completed.push({ id: row.id, status: row.status, screenshots: row.screenshots, checks: row.checks.length, file: row.id + '.json', body: pin(path.join(OUT, row.id + '.json')) });
      }
    }
    const first = JSON.parse(fs.readFileSync(path.join(OUT, cases[0].id + '.json'), 'utf8'));
    recordControls(first);
    check(report.completed.length === 7 && report.completed.every(row => row.status === 'passed'), 'XI_BROWSER_COMPLETE_CENSUS');
    check(report.completed.flatMap(row => row.screenshots).length === 26 && report.controls.length === 7, 'XI_BROWSER_OUTPUT_CENSUS');
    report.status = 'passed';
  } catch (error) {
    primaryError = error;
    report.status = 'failed';
    report.error = { name: error.name, code: error.code, message: error.message, stack: error.stack };
  } finally {
    try { await browser.close(); }
    catch (error) {
      report.browserCloseError = { name: error.name, message: error.message, stack: error.stack };
      primaryError ||= error; report.status = 'failed';
    }
    try {
      const after = { source: sourceBinding(), dist: tree(path.join(ROOT, 'dist')), fonts: { manifest: sha(fs.readFileSync(path.join(CACHE, 'manifest.json'))), rows: fonts.map(row => ({ file: row.file, ...pin(path.join(CACHE, row.file)) })) } };
      write('bindings-after.json', after);
      assert.deepEqual(after, { source: sourceBefore, dist: distBefore, fonts: fontBefore }, 'XI_BROWSER_ALL_END_HOLDS');
      emptyReceipt();
      report.endHolds = 'passed';
    } catch (error) {
      report.endHolds = 'failed';
      report.endHoldError = { name: error.name, code: error.code, message: error.message, stack: error.stack };
      primaryError ||= error; report.status = 'failed';
    }
    write('report.json', report);
  }
  if (primaryError) throw primaryError;
  console.log('Build Your XI Club year browser: 6 fictional year contexts + 1 limited Mixed context passed; 26 PNGs; 7 copied-record controls; no live-roster qualification.');
}

main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
