import a from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '../lib/playwrightLoader.mjs';
import { sha, inventory, loadFonts, checkFonts, shellFixture } from './siteMenuNavigationSupport.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = process.env.PHONE_BOARD_OUT;
a(OUT && path.isAbsolute(OUT) && path.resolve(OUT) !== ROOT && !path.resolve(OUT).startsWith(ROOT + path.sep), 'PHONE_METHOD_OUTPUT');
fs.mkdirSync(OUT, { recursive: true });
const write = (name, value) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const HELD = {"scripts/lib/playwrightLoader.mjs":"94a07179be7ca6b9562d118b52c2d5d0dff0b6b2e29e49e4fea16fa2defb5a93","scripts/qa/siteMenuNavigationSupport.mjs":"c70e3ecc412f16d3322047b13205716c644495f8c74b76eed83852c87f35d303","src/components/game/PlayerAutocomplete.tsx":"6f27ffebab781556981c0e6198c6524392267406b31153ad1ef69ec88e5e08be","src/integrations/supabase/client.ts":"c8bd6d5ebf2610a34eda085224ae087293162b1fda6d4b7d03ae51d77e369684","src/lib/hockeyGrid.ts":"1ff5426e163623a0303f6a8adfe2e2668f39f57d31a134945a89fe46cfadc3f8","src/lib/mlbGrid.ts":"c3f9be84460d0b9abd2c7fb70a63f3a60b4d75c3c239e99f5e323a3d844c1b17","src/lib/playerSearch.ts":"f9727a18b786a23e5d9e1849abff8a676dcd6aec10058ccd2e857473bb5fdbcd","src/hooks/useNbaConnect4.ts":"9db63336365c6ae15af8258bebdbbe2b3dc3a4b9555e1b4804b8b08ba956299e","src/pages/NbaConnect4.tsx":"04ca2d5d092f8487b52bade5e392ecbb3385925039998a058ec2ebd6710b1d65","src/hooks/useNflConnect4.ts":"91637ba20d1b1d63330ad0bfa3bdfa221410f748f74d62d2dc51ccac8c1814fe","src/pages/NflConnect4.tsx":"7de7dca4a1bdef4d1ce373bd8c083b532e4926d115eeb90fd4ac90eb78a512d0","src/hooks/useNhlConnect4.ts":"5b22fa80fd33c084f527fec4266e337a598b873448610bd5ced911c79e289ddf","src/pages/NhlConnect4.tsx":"01a23540e2bbf06130fb8e0bd05a0e0d0db2f8c5ba860be75c6e2d204c819e22","src/hooks/useMlbConnect4.ts":"451acd6418168bb29fd7fd453cfffa7a44d53c8f68a0f6051dba0a0a51468a49","src/pages/MlbConnect4.tsx":"ec292fc2064d965702890ff18d89d8f890676a4b23396f9ce4dd2709018f9d99","src/main.tsx":"2281d01871ebb655d7c31f3a22176e507ee59b2a3d4fe48599c8cf6330496787","src/index.css":"ada9cc819db63d0e2eb013bd3c29eec16877e2a30166c390b81901142369fef3","src/data/nbaConnect4Boards.ts":"824d071f7762137591b0a21cda83d25dcddf75d437332183f54f2fe66c29d916","src/data/nflConnect4Boards.ts":"6adb9e94ec2a3f5ab499171591fee38b080db8931b9904aa066e707a779f8291","src/data/nhlConnect4Boards.ts":"1f7905d08b99bbff3095569d46bd787df7df8ac38fb148913a679bf8f7828fe1","src/data/mlbConnect4Boards.ts":"59bb681f3b46f8393999b797031fca248c8fc59f5c8c12a945dc05f757d39eef","src/lib/theme.ts":"b864c89c05e7a757ef14b1e7e1efe1bf3b706f8fb01b4a443fbe05cab5240360","src/components/layout/ThemeToggle.tsx":"788bb6aaa25d02b99f3dc8534d5cc765e25af4f96ae7b15fdf763dc61b89bad9"};
write('source-inputs.json', Object.entries(HELD).map(([file, expected]) => { const body = fs.readFileSync(path.join(ROOT, file)); a.equal(sha(body), expected, 'PHONE_METHOD_SOURCE_PIN'); return { file, bytes: body.length, sha256: sha(body) }; }));
const DIST = path.resolve(process.env.PHONE_BOARD_DIST || path.join(ROOT, 'dist'));
a(process.env.PHONE_BOARD_PARENT_DIST && path.isAbsolute(process.env.PHONE_BOARD_PARENT_DIST), 'PHONE_METHOD_PARENT_DIST_REQUIRED');
const PARENT_DIST = path.resolve(process.env.PHONE_BOARD_PARENT_DIST);
a.notEqual(DIST, PARENT_DIST, 'PHONE_METHOD_TWO_BUILDS');
const built = dir => { const list = inventory(dir), files = new Map(list.map(row => ['/' + row.file, row])); const index = fs.readFileSync(path.join(dir, 'index.html')); a.equal(sha(index), files.get('/index.html')?.sha256, 'PHONE_METHOD_COMPLETED_INDEX'); a(files.has('/.vite/manifest.json'), 'PHONE_METHOD_BUILD_MANIFEST'); return { dir, files, index, inventory: list }; };
const current = built(DIST), parent = built(PARENT_DIST);
write('completed-builds.json', { current: { dir: DIST, indexSHA256: sha(current.index), files: current.inventory }, parent: { dir: PARENT_DIST, indexSHA256: sha(parent.index), files: parent.inventory }, parentSource: '4ac1803157e05f3515bcb786def7c6d9212ddcf1', source: process.env.GITHUB_SHA || null });
const fonts = loadFonts(process.env.FREE_KICK_FONT_CACHE, process.env.FONT_CACHE_MANIFEST_SHA256);
const client = fs.readFileSync(path.join(ROOT, 'src/integrations/supabase/client.ts'), 'utf8');
const BACKEND = new URL(client.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)['"]/)[1]).origin;
const NAMES = ['Qa Maximilian Montgomery', 'Qa Montgomeryalexanderson'];
const SPORTS = [
  { sport: 'NBA', route: '/nba-connect-4', endpoint: 'nba-connect4-validate', table: 'nba_players_extended_v2', columns: ['last_name', 'first_name', 'player_id', 'team', 'position'], order: 'player_id.asc,last_name.asc', random: 0.83, board: 'Career Milestones' },
  { sport: 'NFL', route: '/nfl-connect-4', endpoint: 'nfl-connect4-validate', table: 'nfl_player_team_stints', columns: ['player_name', 'seasons'], order: 'seasons.desc,player_name.asc', random: 0.25, board: 'Field Generals' },
  { sport: 'NHL', route: '/nhl-connect-4', endpoint: 'nhl-connect4-validate', table: 'nhl_player_stats', columns: ['player_name', 'points', 'position'], order: 'points.desc,player_name.asc', random: 0.58, board: 'Passports' },
  { sport: 'MLB', route: '/mlb-connect-4', endpoint: 'mlb-connect4-validate', table: 'mlb_grid_players', columns: ['player_name', 'hits'], order: 'hits.desc,player_name.asc', random: 0.25, board: 'Aces & Arms' },
];
const WIDTHS = [320, 390, 430, 1440], THEMES = ['dark', 'light'], TOL = 0.5;
const profiles = SPORTS.flatMap(sport => WIDTHS.flatMap(width => THEMES.map(theme => ({ ...sport, width, height: width === 1440 ? 1000 : 844, theme, id: sport.sport.toLowerCase() + width + '-' + theme }))));
const parentProfiles = profiles.filter(row => row.width === 1440).map(row => ({ ...row, id: 'parent-' + row.id }));
const BASE = 'http://127.0.0.1:49271';
const mime = file => ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon' }[path.extname(file)] || 'application/octet-stream');
const deferred = () => { let resolve; const promise = new Promise(yes => { resolve = yes; }); return { promise, resolve }; };
async function bounded(promise, label) { let timer; try { return await Promise.race([promise, new Promise((_, no) => { timer = setTimeout(() => no(new Error('PHONE_METHOD_TIMEOUT_' + label)), 15000); })]); } finally { clearTimeout(timer); } }
async function frames(page) { return bounded(page.evaluate(() => new Promise(resolve => requestAnimationFrame(first => requestAnimationFrame(second => resolve([first, second]))))), 'FRAMES'); }
async function actualFonts(page, row) {
  await page.waitForFunction(() => document.fonts.status === 'loaded' && ['Inter', 'Space Grotesk'].every(name => [...document.fonts].some(face => face.family.replace(/['"]/g, '') === name && face.status === 'loaded')));
  const value = await page.evaluate(() => ({ status: document.fonts.status, inter: document.fonts.check('16px Inter'), display: document.fonts.check('16px "Space Grotesk"'), faces: [...document.fonts].map(face => ({ family: face.family, status: face.status })) })); checkFonts(value); row.fonts.push(value);
}
async function sample(page) {
  return page.evaluate(() => {
    const cells = [...document.querySelectorAll('button[aria-label]')].filter(node => /^(Empty square,|Qa )/.test(node.getAttribute('aria-label')));
    if (cells.length !== 42) return { missingCells: cells.length };
    const grid = cells[0].parentElement, headers = [...grid.children].filter(node => node.tagName === 'BUTTON' && !node.hasAttribute('aria-label'));
    const labels = [...grid.children].filter(node => node.tagName === 'DIV' && node.textContent.trim());
    const rect = node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom, docX: r.x + scrollX, docY: r.y + scrollY }; };
    const clipRect = node => { const r = node.getBoundingClientRect(), x = r.x + node.clientLeft, y = r.y + node.clientTop; return { x, y, right: x + node.clientWidth, bottom: y + node.clientHeight }; };
    const text = node => {
      const style = getComputedStyle(node), walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT), lines = []; let leaf;
      while ((leaf = walker.nextNode())) if (leaf.textContent.trim()) { const range = document.createRange(); range.selectNodeContents(leaf); for (const r of range.getClientRects()) lines.push({ x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height }); }
      const clips = []; for (let ancestor = node.parentElement; ancestor; ancestor = ancestor.parentElement) { const css = getComputedStyle(ancestor); if (/(hidden|clip|auto|scroll)/.test(css.overflowX + ' ' + css.overflowY)) clips.push({ rect: clipRect(ancestor), x: css.overflowX, y: css.overflowY }); }
      return { text: node.textContent.trim().replace(/\s+/g, ' '), rect: rect(node), clipRect: clipRect(node), font: parseFloat(style.fontSize), lineHeight: style.lineHeight, clamp: style.webkitLineClamp, overflowX: style.overflowX, overflowY: style.overflowY, clientWidth: node.clientWidth, scrollWidth: node.scrollWidth, clientHeight: node.clientHeight, scrollHeight: node.scrollHeight, lines, clips };
    };
    const cell = node => ({ ...text(node.querySelector('span') || node), box: rect(node), label: node.getAttribute('aria-label'), disabled: node.disabled, team: node.classList.contains('bg-red-500/80') ? 'red' : node.classList.contains('bg-blue-500/80') ? 'blue' : null });
    const input = document.querySelector('input[role="combobox"]'), skip = [...document.querySelectorAll('button')].find(node => node.textContent.trim() === 'Skip'), active = document.activeElement, focus = getComputedStyle(active);
    return { grid: rect(grid), gap: { column: parseFloat(getComputedStyle(grid).columnGap), row: parseFloat(getComputedStyle(grid).rowGap) }, wrapper: rect(grid.parentElement), scroller: { ...rect(grid.parentElement.parentElement), clientWidth: grid.parentElement.parentElement.clientWidth, scrollWidth: grid.parentElement.parentElement.scrollWidth, scrollLeft: grid.parentElement.parentElement.scrollLeft }, gridTemplate: getComputedStyle(grid).gridTemplateColumns,
      document: { clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }, scroll: { x: scrollX, y: scrollY }, viewport: { width: innerWidth, height: innerHeight },
      headers: headers.map(node => ({ ...text(node), box: rect(node), disabled: node.disabled, selected: node.classList.contains('bg-primary') })), labels: labels.map(text), cells: cells.map(cell),
      corner: { rect: rect(grid.children[0]), display: getComputedStyle(grid.children[0]).display },
      skip: skip ? { disabled: skip.disabled, box: rect(skip) } : null, input: input ? { value: input.value, disabled: input.disabled, box: rect(input) } : null,
      clue: input?.closest('.space-y-3')?.querySelector('p')?.textContent.trim().replace(/\s+/g, ' ') || null,
      redTurn: [...document.querySelectorAll('span')].filter(node => node.textContent.trim() === "Red's Turn").length, blueTurn: [...document.querySelectorAll('span')].filter(node => node.textContent.trim() === "Blue's Turn").length,
      theme: { stored: localStorage.getItem('dukb-theme'), light: document.documentElement.classList.contains('light'), background: getComputedStyle(document.body).backgroundColor, backgroundToken: getComputedStyle(document.documentElement).getPropertyValue('--background').trim().replace(/\s+/g, ' ') },
      focus: { header: headers.indexOf(active), cell: cells.indexOf(active), visible: active.matches(':focus-visible'), outlineStyle: focus.outlineStyle, outlineWidth: parseFloat(focus.outlineWidth), outlineColor: focus.outlineColor, outlineOffset: parseFloat(focus.outlineOffset), box: rect(active) } };
  });
}
const near = (x, y) => Math.abs(x - y) <= TOL;
function textFits(item, box, floor, marker) {
  a(item.font >= floor && item.lines.length > 0 && item.clamp === 'none', marker);
  const clipsAxis = value => /^(hidden|clip|auto|scroll)$/.test(value), clips = [...item.clips, { rect: item.clipRect, x: item.overflowX, y: item.overflowY }];
  if (clipsAxis(item.overflowX)) a(item.scrollWidth <= item.clientWidth + TOL, marker);
  if (clipsAxis(item.overflowY)) a(item.scrollHeight <= item.clientHeight + TOL, marker);
  for (const line of item.lines) {
    a(line.x >= box.x - TOL && line.right <= box.right + TOL && line.y >= box.y - TOL && line.bottom <= box.bottom + TOL, marker);
    for (const clip of clips) { if (clipsAxis(clip.x)) a(line.x >= clip.rect.x - TOL && line.right <= clip.rect.right + TOL, marker); if (clipsAxis(clip.y)) a(line.y >= clip.rect.y - TOL && line.bottom <= clip.rect.bottom + TOL, marker); }
  }
}
function layout(value, row) {
  a.equal(value.cells?.length, 42, 'PHONE_METHOD_BOARD_FOUND'); a.equal(value.headers.length, 7, 'PHONE_METHOD_BOARD_FOUND'); a.equal(value.labels.length, 6, 'PHONE_METHOD_BOARD_FOUND');
  a(value.theme.stored === row.theme && value.theme.light === (row.theme === 'light') && value.theme.backgroundToken === (row.theme === 'light' ? '210 20% 98%' : '225 25% 6%') && value.theme.background === (row.theme === 'light' ? 'rgb(249, 250, 251)' : 'rgb(11, 13, 19)'), 'PHONE_ACTUAL_APP_THEME');
  if (row.width < 768) {
    a(value.document.scrollWidth <= value.document.clientWidth + TOL && value.scroller.scrollWidth <= value.scroller.clientWidth + TOL && value.scroller.scrollLeft === 0, 'PHONE_HORIZONTAL_FIT');
    for (const item of [...value.headers, ...value.cells]) a(item.box.x >= -TOL && item.box.right <= row.width + TOL && item.box.x >= value.grid.x - TOL && item.box.right <= value.grid.right + TOL, 'PHONE_HORIZONTAL_FIT');
    a.equal(value.corner.display, 'none', 'PHONE_ROW_STRIPS');
    a(value.headers.every(item => near(item.box.height, 96)) && value.cells.every(item => near(item.box.height, row.width < 390 ? 84 : 72)), 'PHONE_FIXED_EMPTY_HEIGHT');
    a(near(value.gap.column, row.width < 390 ? 2 : 4) && near(value.gap.row, row.width < 390 ? 2 : 4), 'PHONE_RESPONSIVE_GAP');
    if (row.width < 390) a(near(value.scroller.x, 0) && near(value.scroller.right, row.width) && near(value.grid.x, 0) && near(value.grid.width, row.width), 'PHONE_SMALL_FULL_BLEED');
    for (const item of [...value.headers, ...value.cells]) a(item.box.width >= 30 && item.box.height >= 30, 'PHONE_TARGET_FLOOR');
    for (const item of value.labels) { a(near(item.rect.height, 32) && near(item.rect.width, value.grid.width), 'PHONE_ROW_STRIPS'); textFits(item, item.rect, 11, 'PHONE_FULL_TEXT'); }
    value.headers.forEach(item => textFits(item, item.box, 11, 'PHONE_FULL_TEXT'));
    value.cells.filter(item => item.team).forEach(item => textFits(item, item.box, 11, 'PHONE_FULL_TEXT'));
  }
  if (row.width >= 768 && row.build === 'current') value.cells.filter(item => item.team).forEach(item => textFits(item, item.box, 9, 'PHONE_FULL_TEXT'));
}
function stable(before, after) {
  a(near(before.scroll.x, after.scroll.x) && near(before.scroll.y, after.scroll.y), 'PHONE_SETTLED_SCROLL_HELD');
  for (const key of ['docX', 'docY', 'width', 'height']) a(near(before.grid[key], after.grid[key]), 'PHONE_SETTLED_BOUNDS_HELD');
  const previous = before.viewport.width < 768 ? [...before.headers, ...before.cells] : before.cells, next = after.viewport.width < 768 ? [...after.headers, ...after.cells] : after.cells;
  for (let i = 0; i < previous.length; i += 1) { const b = previous[i].box, c = next[i].box; for (const key of ['docX', 'docY', 'width', 'height']) a(near(b[key], c[key]), 'PHONE_SETTLED_BOUNDS_HELD'); }
}
function referenceStress(beforeGrid, afterGrid) {
  const value = { widthGrowth: afterGrid.width - beforeGrid.width, heightGrowth: afterGrid.height - beforeGrid.height };
  a(value.widthGrowth >= 50 && value.heightGrowth >= 40, 'PHONE_PARENT_STRESS_BASELINE'); return value;
}
function stressProjection(old, now) { return { parentBefore: old.states.secondPending.grid, parentAfter: old.states.secondAccepted.grid, currentBefore: { grid: now.states.secondPending.grid, scroll: now.states.secondPending.scroll }, currentAfter: { grid: now.states.secondAccepted.grid, scroll: now.states.secondAccepted.scroll, scroller: now.states.secondAccepted.scroller } }; }
function pairedImprovement(value) {
  const baseline = referenceStress(value.parentBefore, value.parentAfter), before = value.currentBefore, after = value.currentAfter;
  const result = { baseline, currentWidthGrowth: after.grid.width - before.grid.width, currentHeightGrowth: after.grid.height - before.grid.height, currentScrollDelta: { x: after.scroll.x - before.scroll.x, y: after.scroll.y - before.scroll.y } };
  a(near(result.currentWidthGrowth, 0) && near(result.currentHeightGrowth, 0) && near(result.currentScrollDelta.x, 0) && near(result.currentScrollDelta.y, 0) && after.scroller.scrollWidth <= after.scroller.clientWidth + TOL, 'PHONE_DESKTOP_STRESS_IMPROVEMENT'); return result;
}
function focused(value) { a(value.focus.visible && value.focus.header >= 0 && value.focus.outlineStyle !== 'none' && value.focus.outlineWidth >= 1 && value.focus.outlineColor !== 'rgba(0, 0, 0, 0)', 'PHONE_NATIVE_FOCUS_VISIBLE'); }
function outcome(row) {
  a.deepEqual([row.pageErrors, row.consoleErrors], [[], []], 'PHONE_METHOD_PAGE_ERRORS'); a(row.io.every(item => item.kind !== 'unknown-refused'), 'PHONE_METHOD_KNOWN_IO');
  a.deepEqual(row.normalTurns, ['red', 'blue', 'red'], 'PHONE_ORDINARY_SKIP');
  for (const item of Object.values(row.states)) layout(item, row);
  focused(row.states.focus); focused(row.states.finalFocus);
  a.equal(row.boardName, row.board, 'PHONE_METHOD_SOURCE_BOARD');
  a.equal(row.validators.length, 3, 'PHONE_CALLBACK_ONCE'); row.validators.forEach(record => { a(record.callbacks === 1 && record.fulfillments === 1 && record.response.finished === null, 'PHONE_CALLBACK_ONCE'); const body = fs.readFileSync(path.join(OUT, record.response.file)); a.equal(sha(body), record.response.sha256, 'PHONE_RESPONSE_BYTES'); a.deepEqual(JSON.parse(body), record.result, 'PHONE_RESPONSE_BYTES'); });
  for (const tag of ['beforeAttempts', 'afterAttempts', 'pending', 'retryPending', 'secondPending']) { const value = row.states[tag]; a(value.skip.disabled && value.input.disabled && value.headers.every(item => item.disabled) && value.cells.every(item => item.disabled), 'PHONE_PENDING_LOCKS'); }
  a.deepEqual(row.states.afterAttempts.cells.map(item => [item.label, item.team]), row.states.beforeAttempts.cells.map(item => [item.label, item.team]), 'PHONE_PENDING_GRID_HELD');
  const held = value => [value.redTurn, value.blueTurn, value.clue, value.headers.map(item => item.selected), { value: value.input.value, disabled: value.input.disabled }];
  a.deepEqual(held(row.states.afterAttempts), held(row.states.beforeAttempts), 'PHONE_PENDING_TURN_CLUE'); a.deepEqual([row.states.beforeAttempts.redTurn, row.states.beforeAttempts.blueTurn], [1, 0], 'PHONE_PENDING_TURN_CLUE');
  a(row.states.refused.redTurn === 1 && row.states.refused.blueTurn === 0 && row.states.refused.cells.every(item => !item.team) && row.states.refused.input && !row.states.refused.input.disabled, 'PHONE_NO_PENALTY_RETRY');
  for (const [at, tag] of [[0, 'accepted'], [1, 'secondAccepted']]) { const value = row.states[tag], placed = value.cells.filter(item => item.team); a.equal(placed.length, at + 1, 'PHONE_ACCEPTED_PIECES'); a(value.cells[35].team === 'red' && value.cells[35].text === NAMES[0], 'PHONE_ACCEPTED_PIECES'); if (at) a(value.cells[36].team === 'blue' && value.cells[36].text === NAMES[1] && value.redTurn === 1 && value.blueTurn === 0, 'PHONE_ACCEPTED_PIECES'); else a(value.redTurn === 0 && value.blueTurn === 1, 'PHONE_ACCEPTED_PIECES'); a.equal(value.input, null, 'PHONE_ACCEPTED_PIECES'); }
  stable(row.states.pending, row.states.refused); stable(row.states.retryPending, row.states.accepted);
  if (row.build === 'parent') referenceStress(row.states.secondPending.grid, row.states.secondAccepted.grid); else stable(row.states.secondPending, row.states.secondAccepted);
  a(row.attempts.length === 3 && row.attempts.every(item => item.disabled && item.hitOwner), 'PHONE_NATIVE_DISABLED_TARGETS');
  a(row.keyboard.some(item => item.key === 'Enter') && row.keyboard.some(item => item.key === 'Space'), 'PHONE_NATIVE_KEYBOARD');
  a(row.fonts.length >= 4, 'PHONE_METHOD_FONTS'); row.fonts.forEach(checkFonts);
  for (const image of [row.image, row.viewportImage].filter(Boolean)) { const body = fs.readFileSync(path.join(OUT, image.file)); a.equal(sha(body), image.sha256, 'PHONE_ORIGINAL_IMAGE_HASH'); a.equal(body.length, image.bytes); a.equal(body.readUInt32BE(16), image.width); a.equal(body.readUInt32BE(20), image.height); }
}
function desktopParity(old, now) {
  a.deepEqual(now.states.initial.headers.map(item => item.text), old.states.initial.headers.map(item => item.text), 'PHONE_DESKTOP_PARITY');
  a.deepEqual(now.states.initial.labels.map(item => item.text), old.states.initial.labels.map(item => item.text), 'PHONE_DESKTOP_PARITY');
  for (const tag of Object.keys(old.states)) {
    const before = old.states[tag], after = now.states[tag], semantics = value => ({ red: value.redTurn, blue: value.blueTurn, clue: value.clue, input: value.input && { value: value.input.value, disabled: value.input.disabled }, skip: value.skip.disabled, headers: value.headers.map(item => [item.text, item.disabled, item.selected]), cells: value.cells.map(item => [item.label, item.text, item.team, item.disabled]) });
    a.deepEqual(semantics(after), semantics(before), 'PHONE_DESKTOP_GAME_SEMANTICS');
    if (['secondAccepted', 'finalFocus'].includes(tag)) continue;
    for (const key of ['docX', 'docY', 'width', 'height']) a(near(before.grid[key], after.grid[key]), 'PHONE_DESKTOP_PARITY'); a(near(before.scroll.x, after.scroll.x) && near(before.scroll.y, after.scroll.y), 'PHONE_DESKTOP_PARITY');
    for (let i = 0; i < 49; i += 1) { const b = [...before.headers, ...before.cells][i], c = [...after.headers, ...after.cells][i]; for (const key of ['docX', 'docY', 'width', 'height']) a(near(b.box[key], c.box[key]), 'PHONE_DESKTOP_PARITY'); a.deepEqual([b.disabled, b.font, b.lineHeight], [c.disabled, c.font, c.lineHeight], 'PHONE_DESKTOP_PARITY'); }
    a.deepEqual([before.corner.display, before.corner.rect.width, before.gridTemplate], [after.corner.display, after.corner.rect.width, after.gridTemplate], 'PHONE_DESKTOP_PARITY');
  }
  return pairedImprovement(stressProjection(old, now));
}
async function wheelTo(page, locator, row) {
  for (let attempt = 0; attempt < 16; attempt += 1) { const box = await locator.boundingBox(); a(box, 'PHONE_METHOD_TARGET_BOX'); const y = box.y + box.height / 2; if (y >= 100 && y < row.height - 100) return box; await page.mouse.wheel(0, y - row.height / 2); await frames(page); }
  throw new Error('PHONE_METHOD_VISIBLE_TARGET');
}
async function pressTo(page, locator, row) {
  const reverse = await locator.evaluate(node => { const list = [...document.querySelectorAll('a[href],button,input,select,textarea,[tabindex]')].filter(item => !item.disabled && item.tabIndex >= 0 && item.getClientRects().length); return list.indexOf(document.activeElement) > list.indexOf(node); });
  const key = reverse ? 'Shift+Tab' : 'Tab', moves = []; for (let at = 0; at < 160; at += 1) { const active = await locator.evaluate(node => document.activeElement === node); if (active) return moves; await page.keyboard.press(key); moves.push(key); }
  throw new Error('PHONE_METHOD_NATIVE_TAB_TARGET');
}
async function disabledAttempt(page, locator, id, row) { const box = await wheelTo(page, locator, row), x = box.x + box.width / 2, y = box.y + box.height / 2; const owner = await locator.evaluate((node, p) => ({ disabled: node.disabled, hitOwner: node.contains(document.elementFromPoint(p.x, p.y)) }), { x, y }); a(owner.disabled && owner.hitOwner, 'PHONE_METHOD_DISABLED_OWNER'); row.attempts.push({ id, box, x, y, ...owner }); await page.mouse.click(x, y); await frames(page); }
async function journey(profile, build, mode = {}) {
  const row = { ...profile, build: build === parent ? 'parent' : 'current', control: mode.control || null, io: [], validators: [], pageErrors: [], consoleErrors: [], fonts: [], states: {}, keyboard: [], attempts: [], normalTurns: [], image: null, viewportImage: null };
  const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, colorScheme: 'dark', reducedMotion: 'reduce' });
  await context.addInitScript(({ theme, random }) => { try { localStorage.setItem('dukb-theme', theme); } catch {} Math.random = () => random; const NativeDate = Date, time = 1793361600000; window.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : [time])); } static now() { return time; } }; }, { theme: profile.theme, random: profile.random });
  const page = await context.newPage(); page.setDefaultTimeout(15000);
  const releases = [], expectations = [];
  page.on('pageerror', error => row.pageErrors.push(error.message)); page.on('console', message => { if (message.type() === 'error') row.consoleErrors.push(message.text()); });
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url()), item = { url: url.href, method: request.method(), type: request.resourceType() };
    try {
      a(!url.username && !url.password && !url.hash, 'PHONE_METHOD_REQUEST_AUTHORITY');
      if (url.origin === BASE) {
        const fresh = url.pathname === '/' && [...url.searchParams.keys()].join('|') === 'fresh' && /^\d+$/.test(url.searchParams.get('fresh')); a(['GET', 'HEAD'].includes(request.method()) && (!url.search || fresh), 'PHONE_METHOD_STATIC_SHAPE');
        const shell = url.pathname === profile.route && request.resourceType() === 'document', file = shell || url.pathname === '/' ? '/index.html' : url.pathname, pin = build.files.get(file); a(pin, 'PHONE_METHOD_COMPLETED_ASSET');
        let body = file === '/index.html' ? build.index : fs.readFileSync(path.join(build.dir, pin.file)); a.equal(sha(body), pin.sha256, 'PHONE_METHOD_DIST_HELD');
        if (mode.css && file === mode.css.file) { body = fs.readFileSync(mode.css.working); a.equal(sha(body), mode.css.sha256, 'PHONE_METHOD_CSS_COPY_PIN'); }
        row.io.push({ ...item, kind: shell ? 'actual-built-source-shell' : mode.css && file === mode.css.file ? 'physical-built-css-copy' : 'completed-dist', file: pin.file, bytes: body.length, sha256: sha(body) }); return await route.fulfill({ status: 200, contentType: mime(pin.file), body: request.method() === 'HEAD' ? Buffer.alloc(0) : body });
      }
      if (request.method() === 'GET' && request.postData() === null && fonts.has(url.href) && ['font', 'stylesheet'].includes(request.resourceType())) { const font = fonts.get(url.href); row.io.push({ ...item, kind: 'prepared-font', bytes: font.body.length, sha256: font.sha256 }); return await route.fulfill({ status: 200, contentType: font.contentType, body: font.body, headers: { 'access-control-allow-origin': '*' } }); }
      if (url.origin === BACKEND && url.pathname === '/rest/v1/' + profile.table && request.method() === 'GET' && request.postData() === null && request.resourceType() === 'fetch') {
        const q = url.searchParams, key = profile.sport === 'NBA' ? 'or' : 'player_name', leg = q.has(key); a.deepEqual([...q.keys()].sort(), (leg ? ['limit', 'order', key, 'select'] : ['limit', 'order', 'select']).sort()); a.deepEqual(q.get('select').split(',').sort(), [...profile.columns].sort()); a.equal(q.get('order'), profile.order); a.equal(q.get('limit'), leg ? '200' : '1000');
        if (leg) a(profile.sport === 'NBA' ? q.get(key) === '(first_name.ilike.%Qa%,last_name.ilike.%Qa%)' : NAMES.some(name => q.get(key) === 'ilike.%' + name + '%'), 'PHONE_METHOD_SEARCH_QUERY');
        const rows = NAMES.map((name, i) => profile.sport === 'NBA' ? { first_name: 'Qa', last_name: name.slice(3), player_id: i + 1, team: 'QA Fixture Team', position: 'QA' } : profile.sport === 'NFL' ? { player_name: name, seasons: 2 - i } : profile.sport === 'NHL' ? { player_name: name, points: 2 - i, position: 'QA' } : { player_name: name, hits: 2 - i });
        const body = JSON.stringify(rows); row.io.push({ ...item, kind: 'synthetic-QA-player-search', bytes: Buffer.byteLength(body), sha256: sha(body) }); return await route.fulfill({ status: 200, contentType: 'application/json', body, headers: { 'content-range': '0-1/2' } });
      }
      if (url.origin === BACKEND && url.pathname === '/functions/v1/' + profile.endpoint) {
        a(request.method() === 'POST' && !url.search && request.resourceType() === 'fetch', 'PHONE_METHOD_VALIDATOR_SHAPE'); const slot = expectations[row.validators.length]; a(slot, 'PHONE_METHOD_UNEXPECTED_VALIDATOR'); a.deepEqual(request.postDataJSON(), slot.body, 'PHONE_METHOD_REAL_CLUE_REQUEST');
        const record = { ...item, body: request.postDataJSON(), bodySHA256: sha(request.postData()), callbacks: 1, fulfillments: 0, result: slot.result }; row.validators.push(record); row.io.push({ ...item, kind: 'synthetic-QA-validator' }); slot.request = request; slot.seen.resolve(); await slot.release.promise;
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(slot.result) }); record.fulfillments += 1; return;
      }
      const fixture = shellFixture(request, url); if (fixture) { row.io.push({ ...item, kind: fixture.id }); return await route.fulfill({ status: 200, contentType: 'application/json', body: fixture.body, headers: fixture.date ? { date: fixture.date } : {} }); }
      throw new Error('PHONE_METHOD_UNEXPECTED_REQUEST');
    } catch (error) { row.io.push({ ...item, kind: 'unknown-refused', error: error.message }); await route.abort('blockedbyclient').catch(() => {}); }
  });
  const save = async tag => { await frames(page); const value = await sample(page); row.states[tag] = value; layout(value, row); return value; };
  const turn = value => value.redTurn === 1 && value.blueTurn === 0 ? 'red' : value.blueTurn === 1 && value.redTurn === 0 ? 'blue' : 'ambiguous';
  const reply = async slot => { const responsePromise = page.waitForResponse(response => response.request() === slot.request); slot.release.resolve(); const response = await bounded(responsePromise, row.id + '_RESPONSE'); const body = await response.body(), finished = await response.finished(); a.equal(response.status(), 200); a.deepEqual(JSON.parse(body), slot.result); a.equal(finished, null); const file = row.id + '-' + expectations.indexOf(slot) + '-response.json'; fs.writeFileSync(path.join(OUT, file), body, { flag: 'wx' }); row.validators[expectations.indexOf(slot)].response = { file, sha256: sha(body), bytes: body.length, finished, frameTimes: await frames(page) }; };
  const start = async (name, result) => { const value = await sample(page), pair = value.clue?.match(/"(.+)"\s*\+\s*"(.+)"/); a(pair, 'PHONE_METHOD_SELECTED_CLUE'); const slot = { body: { playerName: name, columnAttribute: pair[1], rowAttribute: pair[2] }, result, seen: deferred(), release: deferred() }; expectations.push(slot); releases.push(slot.release); const input = page.getByRole('combobox'); await wheelTo(page, input, row); await input.fill(name); await page.getByRole('option', { name: new RegExp('^' + name + '(?:\\s|$)') }).click(); await bounded(slot.seen.promise, row.id + '_REQUEST'); return slot; };
  try {
    await page.goto(BASE + profile.route, { waitUntil: 'domcontentloaded' }); await page.getByRole('heading', { level: 1, name: profile.sport + ' CONNECT 4', exact: true }).waitFor(); const reject = page.getByRole('button', { name: 'Reject all', exact: true }); await reject.click(); await reject.waitFor({ state: 'hidden' }); await actualFonts(page, row);
    row.boardName = await page.getByText('Board: ' + profile.board, { exact: true }).textContent(); row.boardName = row.boardName.replace(/^Board:\s*/, '');
    await save('initial'); const skip = page.getByRole('button', { name: 'Skip', exact: true }); row.normalTurns.push(turn(await sample(page))); await skip.click(); row.normalTurns.push(turn(await sample(page))); await skip.click(); row.normalTurns.push(turn(await sample(page)));
    const grid = page.getByRole('button', { name: /^Empty square,/ }).first().locator('..'), headers = grid.locator('button:not([aria-label])');
    row.keyboard.push(...(await pressTo(page, headers.nth(0), row)).map(key => ({ key }))); await save('focus'); focused(row.states.focus);
    await page.keyboard.press('Enter'); row.keyboard.push({ key: 'Enter', target: 'header0' }); await save('selected');
    row.keyboard.push(...(await pressTo(page, headers.nth(1), row)).map(key => ({ key }))); await page.keyboard.press('Space'); row.keyboard.push({ key: 'Space', target: 'header1' }); a((await sample(page)).headers[1].selected, 'PHONE_NATIVE_KEYBOARD');
    const firstCell = page.getByRole('button', { name: /^Empty square,/ }).first(); row.keyboard.push(...(await pressTo(page, firstCell, row)).map(key => ({ key }))); await page.keyboard.press('Space'); row.keyboard.push({ key: 'Space', target: 'cell0' }); a((await sample(page)).headers[0].selected, 'PHONE_NATIVE_KEYBOARD');
    const refused = await start(NAMES[0], { valid: false, unverified: true, reason: 'QA verification unavailable. Try again.' }); await save('beforeAttempts');
    await disabledAttempt(page, skip, 'skip', row); await disabledAttempt(page, headers.nth(1), 'header1', row); await disabledAttempt(page, page.getByRole('button', { name: /^Empty square,/ }).nth(2), 'cell2', row); await save('afterAttempts');
    await wheelTo(page, page.getByRole('combobox'), row); await save('pending');
    if (!mode.control && build === current && row.width === 390) { const file = row.id + '-pending-viewport.png', body = await page.screenshot({ path: path.join(OUT, file), animations: 'disabled' }); row.viewportImage = { file, bytes: body.length, sha256: sha(body), width: body.readUInt32BE(16), height: body.readUInt32BE(20), scope: 'ORIGINAL_ORDINARY_390_VIEWPORT_PENDING_AFTER_DELIBERATE_INPUT_NAVIGATION', scroll: await page.evaluate(() => ({ x: scrollX, y: scrollY })) }; }
    await reply(refused); await actualFonts(page, row); await save('refused'); stable(row.states.pending, row.states.refused);
    const retry = await start(NAMES[0], { valid: true, fullName: NAMES[0] }); await wheelTo(page, page.getByRole('combobox'), row); await save('retryPending'); await reply(retry); await actualFonts(page, row); await save('accepted'); stable(row.states.retryPending, row.states.accepted);
    await wheelTo(page, headers.nth(1), row); await headers.nth(1).click(); const second = await start(NAMES[1], { valid: true, fullName: NAMES[1] }); await wheelTo(page, page.getByRole('combobox'), row); await save('secondPending'); await reply(second); await actualFonts(page, row); await save('secondAccepted');
    if (row.build === 'parent') row.referenceStress = referenceStress(row.states.secondPending.grid, row.states.secondAccepted.grid); else stable(row.states.secondPending, row.states.secondAccepted);
    row.keyboard.push(...(await pressTo(page, headers.nth(0), row)).map(key => ({ key }))); await save('finalFocus'); focused(row.states.finalFocus);
    if (!mode.control) { const file = row.id + '-board.png'; const body = await grid.screenshot({ path: path.join(OUT, file), animations: 'disabled' }); row.image = { file, bytes: body.length, sha256: sha(body), width: body.readUInt32BE(16), height: body.readUInt32BE(20), scope: 'ORIGINAL_WHOLE_BOARD_ELEMENT_CAPTURE_NOT_FULL_VIEWPORT', scroll: await page.evaluate(() => ({ x: scrollX, y: scrollY })) }; }
    outcome(row); row.status = 'PASS';
  } catch (error) { row.status = 'FAIL'; row.error = { name: error.name, message: error.message, stack: error.stack }; throw Object.assign(error, { observation: row }); }
  finally { releases.forEach(item => item.resolve()); await context.close(); write(row.id + '-observations.json', row); }
  return row;
}
function judge(value) {
  a.deepEqual(value.current.map(row => row.id), profiles.map(row => row.id), 'PHONE_METHOD_CONTEXT_SET'); a.deepEqual(value.parent.map(row => row.id), parentProfiles.map(row => row.id), 'PHONE_METHOD_PARENT_SET');
  [...value.current, ...value.parent].forEach(outcome);
  value.parent.forEach(old => desktopParity(old, value.current.find(row => 'parent-' + row.id === old.id)));
  a.equal([...value.current, ...value.parent].filter(row => row.image).length, 40, 'PHONE_ORIGINAL_IMAGE_COUNT');
  a.equal(value.current.filter(row => row.width === 390 && row.viewportImage).length, 8, 'PHONE_ORIGINAL_IMAGE_COUNT');
}
function cssChange(body, id) {
  const rules = {
    'old-min700': { pattern: /(\.min-w-\\\[700px\\\]\s*\{[^{}]*?\bmin-width\s*:\s*)700px(?=\s*[;}])/g, value: '700px!important', marker: 'PHONE_HORIZONTAL_FIT', witness: 'Actual board min700 causes horizontal overflow.' },
    'old-font7': { pattern: /(\.text-\\\[7px\\\]\s*\{[^{}]*?\bfont-size\s*:\s*)7px(?=\s*[;}])/g, value: '7px!important', marker: 'PHONE_FULL_TEXT', witness: 'Actual occupied-name span renders7px.' },
    'empty-height': { pattern: /(\.max-\\\[389px\\\]\\:h-\\\[84px\\\]\s*\{[^{}]*?\bheight\s*:\s*)84px(?=\s*[;}])/g, value: 'auto', marker: 'PHONE_FIXED_EMPTY_HEIGHT', witness: 'Actual320 empty cells lose active84px height with aspect-auto retained.' },
    'focus-suppressed': { pattern: /((?:^|})\s*:focus-visible\s*\{[^{}]*?\boutline\s*:\s*)[^;}]+(?=\s*[;}])/g, value: 'none', marker: 'PHONE_NATIVE_FOCUS_VISIBLE', witness: 'Real keyboard-focused header retains focus-visible but computed outline is none.' },
  };
  const rule = rules[id], code = body.replace(/\/\*[\s\S]*?\*\//g, comment => ' '.repeat(comment.length)), hits = [...code.matchAll(rule.pattern)]; if (hits.length === 0) return null; a.equal(hits.length, 1, 'PHONE_METHOD_CSS_OWNER_AMBIGUITY');
  const hit = hits[0], at = hit.index + hit[1].length, oldValue = body.slice(at, hit.index + hit[0].length), originalRule = body.slice(hit.index, hit.index + hit[0].length), changed = body.slice(0, at) + rule.value + body.slice(at + oldValue.length);
  a.notEqual(changed, body, 'PHONE_METHOD_CSS_CHANGED'); return { changed, marker: rule.marker, witness: rule.witness, originalRule, wholeRule: body.slice(hit.index, body.indexOf('}', at + oldValue.length) + 1), changedRule: originalRule.slice(0, hit[1].length) + rule.value };
}
function cssOwner(entries, id) {
  const owners = []; for (const entry of entries) { const body = fs.readFileSync(entry.path, 'utf8'), change = cssChange(body, id); if (change) owners.push({ ...entry, body, change }); }
  a.equal(owners.length, 1, 'PHONE_METHOD_CSS_OWNER_AMBIGUITY'); return owners[0];
}
function ownerAmbiguityControl(owner) {
  const working = path.join(OUT, 'css-owner-working.css'), second = path.join(OUT, 'css-owner-second.css'), manifest = path.join(OUT, 'css-owner-working.json'), original = Buffer.from(owner.body);
  const originalList = Buffer.from(JSON.stringify([{ path: working, pin: owner.pin }], null, 2) + '\n'), changedList = Buffer.from(JSON.stringify([{ path: working, pin: owner.pin }, { path: second, pin: owner.pin }], null, 2) + '\n');
  const changed = Buffer.from(owner.body + '\n' + owner.change.wholeRule + '\n');
  fs.writeFileSync(working, original, { flag: 'wx' }); fs.writeFileSync(second, original, { flag: 'wx' }); fs.writeFileSync(manifest, originalList, { flag: 'wx' });
  const classify = () => cssOwner(JSON.parse(fs.readFileSync(manifest, 'utf8')), 'old-min700');
  a.equal(sha(Buffer.from(classify().body)), sha(original), 'PHONE_METHOD_OWNER_CONTROL_HEALTHY');
  fs.writeFileSync(path.join(OUT, 'css-owner.before.css'), original, { flag: 'wx' }); fs.writeFileSync(path.join(OUT, 'css-owner.before.json'), originalList, { flag: 'wx' });
  fs.writeFileSync(working, changed); fs.writeFileSync(manifest, changedList); a.notEqual(sha(fs.readFileSync(working)), sha(original), 'PHONE_METHOD_OWNER_CONTROL_CHANGED'); a.notEqual(sha(fs.readFileSync(manifest)), sha(originalList), 'PHONE_METHOD_OWNER_CONTROL_CHANGED');
  fs.writeFileSync(path.join(OUT, 'css-owner.changed.css'), fs.readFileSync(working), { flag: 'wx' }); fs.writeFileSync(path.join(OUT, 'css-owner.changed.json'), fs.readFileSync(manifest), { flag: 'wx' });
  let refusal; try { classify(); } catch (error) { refusal = error; }
  finally { fs.writeFileSync(working, original); fs.writeFileSync(manifest, originalList); a.deepEqual(fs.readFileSync(working), original, 'PHONE_METHOD_OWNER_CONTROL_SAME_RESTORE'); a.deepEqual(fs.readFileSync(manifest), originalList, 'PHONE_METHOD_OWNER_CONTROL_SAME_RESTORE'); a.equal(sha(Buffer.from(classify().body)), sha(original), 'PHONE_METHOD_OWNER_CONTROL_RESTORED_HEALTHY'); fs.writeFileSync(path.join(OUT, 'css-owner.restored.css'), fs.readFileSync(working), { flag: 'wx' }); fs.writeFileSync(path.join(OUT, 'css-owner.restored.json'), fs.readFileSync(manifest), { flag: 'wx' }); }
  a(refusal instanceof a.AssertionError && refusal.message.includes('PHONE_METHOD_CSS_OWNER_AMBIGUITY'), 'PHONE_METHOD_OWNER_CONTROL_OWNED_REFUSAL');
  a.equal(refusal.actual, 2, 'PHONE_METHOD_OWNER_CONTROL_DUPLICATE_CAUSE'); a.equal(refusal.expected, 1, 'PHONE_METHOD_OWNER_CONTROL_DUPLICATE_CAUSE');
  return { id: 'css-owner-ambiguity', marker: 'PHONE_METHOD_CSS_OWNER_AMBIGUITY', originalOwnerFile: owner.pin.file, firstCopyTargetRules: refusal.actual, secondCopyTargetRules: 1, actualRefusal: { name: refusal.name, message: refusal.message, actual: refusal.actual, expected: refusal.expected, operator: refusal.operator }, beforeSHA256: sha(original), changedSHA256: sha(changed), restoredSHA256: sha(original), manifestBeforeSHA256: sha(originalList), manifestChangedSHA256: sha(changedList), manifestRestoredSHA256: sha(originalList), sameCSSAndManifestCopyRestored: true, workingFile: 'css-owner-working.css', workingManifest: 'css-owner-working.json', scope: 'PHYSICAL_COPIED_CSS_OWNER_CLASSIFIER_ONLY_NO_RENDER_OR_FEATURE_CREDIT' };
}
function copiedGuardControl(id, subject, mutate, check, marker, sourcePath) {
  const original = Buffer.from(JSON.stringify(subject, null, 2) + '\n'), working = path.join(OUT, 'guard-working.json');
  fs.writeFileSync(working, original); check(JSON.parse(fs.readFileSync(working, 'utf8'))); fs.writeFileSync(path.join(OUT, id + '.before.json'), original, { flag: 'wx' });
  const copy = JSON.parse(fs.readFileSync(working, 'utf8')); mutate(copy); const changed = Buffer.from(JSON.stringify(copy, null, 2) + '\n'); a.notEqual(sha(changed), sha(original), 'PHONE_METHOD_GUARD_CONTROL_CHANGED'); fs.writeFileSync(working, changed); fs.writeFileSync(path.join(OUT, id + '.changed.json'), changed, { flag: 'wx' });
  let refusal; try { check(JSON.parse(fs.readFileSync(working, 'utf8'))); } catch (error) { refusal = error; }
  finally { fs.writeFileSync(working, original); a.deepEqual(fs.readFileSync(working), original, 'PHONE_METHOD_GUARD_CONTROL_SAME_RESTORE'); check(JSON.parse(fs.readFileSync(working, 'utf8'))); fs.writeFileSync(path.join(OUT, id + '.restored.json'), fs.readFileSync(working), { flag: 'wx' }); }
  a(refusal instanceof a.AssertionError && refusal.message.includes(marker), 'PHONE_METHOD_GUARD_CONTROL_OWNED_REFUSAL');
  return { id, marker, actualSourcePath: sourcePath, beforeSHA256: sha(original), changedSHA256: sha(changed), restoredSHA256: sha(original), workingFile: 'guard-working.json', sameCopyRestored: true, actualRefusal: { name: refusal.name, message: refusal.message }, scope: 'COPIED_ACTUAL_SUBJECT_GUARD_ONLY_NO_FEATURE_CREDIT' };
}
let browser;
const report = { schema: 1, scope: 'SYNTHETIC_US_CONNECT4_PHONE_BOARD_RENDERED_LAYOUT_AND_CLIENT_LOCKS', source: process.env.GITHUB_SHA || null, productParent: '14d145486a6bd6092c639495da494693ca8fc1cf', codeParent: '4ac1803157e05f3515bcb786def7c6d9212ddcf1', supportedAppThemes: THEMES, browserColorScheme: 'dark_for_both_app_modes', tolerancePixels: TOL, current: [], parent: [], cssControls: [], cssOwnerControls: [], controls: [], guardControls: [], stressOutcomes: [], failures: [], limits: ['32currentcontexts+8parentdesktopcontexts;8CSScontrol/restorecontexts are separate and have no normal image credit.', '40 original whole-board element captures+8ordinary390viewport originals, no full-page chrome or real-device claim.', 'Source-selected long-clue boards and two synthetic QA names only, no all-board or real sports validation claim.', 'Parent4ac is the measured old desktop stress-growth reference; current must remain stable. Prestress geometry/scroll and all-state game semantics are paired, poststress geometry intentionally improves. No live/backend, SEO/global/default-unit or publication credit.'] };
try {
  browser = await chromium.launch();
  for (const profile of parentProfiles) { try { report.parent.push(await journey(profile, parent)); } catch (error) { report.parent.push(error.observation); report.failures.push({ profile: profile.id, name: error.name, message: error.message }); } }
  for (const profile of profiles) { try { report.current.push(await journey(profile, current)); } catch (error) { report.current.push(error.observation); report.failures.push({ profile: profile.id, name: error.name, message: error.message }); } }
  a.equal(report.failures.length, 0, 'PHONE_METHOD_NORMAL_JOURNEYS'); judge(report);
  const cssIDs = ['old-min700', 'old-font7', 'empty-height', 'focus-suppressed'];
  for (const id of cssIDs) {
    const owner = cssOwner(current.inventory.filter(item => item.file.endsWith('.css')).map(pin => ({ pin, path: path.join(DIST, pin.file) })), id);
    if (id === 'old-min700') report.cssOwnerControls.push(ownerAmbiguityControl(owner));
    const working = path.join(OUT, 'built-css-working.css'), original = Buffer.from(owner.body), changed = Buffer.from(owner.change.changed); if (!fs.existsSync(working)) fs.writeFileSync(working, original, { flag: 'wx' }); else fs.writeFileSync(working, original); a.equal(sha(original), owner.pin.sha256); fs.writeFileSync(path.join(OUT, id + '.before.css'), original, { flag: 'wx' }); fs.writeFileSync(working, changed); fs.writeFileSync(path.join(OUT, id + '.changed.css'), changed, { flag: 'wx' }); a.notEqual(sha(changed), sha(original), 'PHONE_METHOD_PHYSICAL_CSS_CHANGED');
    let refusal, restored; const selected = profiles.find(row => row.sport === 'NBA' && row.width === 320 && row.theme === 'dark');
    try { await journey({ ...selected, id: 'css-' + id }, current, { control: id, css: { file: '/' + owner.pin.file, working, sha256: sha(changed) } }); } catch (error) { refusal = error; }
    finally { fs.writeFileSync(working, original); a.deepEqual(fs.readFileSync(working), original, 'PHONE_METHOD_SAME_CSS_RESTORE'); fs.writeFileSync(path.join(OUT, id + '.restored.css'), fs.readFileSync(working), { flag: 'wx' }); restored = await journey({ ...selected, id: 'restore-' + id }, current, { control: id + '-restore', css: { file: '/' + owner.pin.file, working, sha256: sha(original) } }); }
    a(refusal instanceof a.AssertionError && refusal.message.includes(owner.change.marker), 'PHONE_METHOD_OWNED_RENDERED_CSS_REFUSAL'); a(refusal.observation.io.some(item => item.kind === 'physical-built-css-copy' && item.sha256 === sha(changed)), 'PHONE_METHOD_CSS_ACTUALLY_SERVED');
    const observed = refusal.observation.states;
    if (id === 'old-min700') a(observed.initial.wrapper.width >= 700 && observed.initial.scroller.scrollWidth > observed.initial.scroller.clientWidth, 'PHONE_METHOD_CSS_700_WITNESSED');
    if (id === 'old-font7') a(Object.values(observed).some(value => value.cells?.some(cell => cell.team && cell.font === 7)), 'PHONE_METHOD_CSS_7PX_WITNESSED');
    if (id === 'empty-height') a(observed.initial.cells.some(cell => !cell.team && cell.box.height < 30), 'PHONE_METHOD_CSS_EMPTY_HEIGHT_WITNESSED');
    if (id === 'focus-suppressed') a(observed.focus.focus.header >= 0 && observed.focus.focus.visible && observed.focus.focus.outlineStyle === 'none', 'PHONE_METHOD_CSS_FOCUS_SUPPRESSION_WITNESSED');
    report.cssControls.push({ id, marker: owner.change.marker, witness: owner.change.witness, ownerFile: owner.pin.file, originalRule: owner.change.originalRule, changedRule: owner.change.changedRule, beforeSHA256: sha(original), changedSHA256: sha(changed), restoredSHA256: sha(original), workingFile: 'built-css-working.css', sameCopyRestored: true, actualRefusal: refusal.observation, actualRestoredHealthy: restored, scope: 'ACTUAL_RENDERED_COPIED_BUILT_CSS_ONLY_NO_SOURCE_OR_FEATURE_FAULT_CREDIT' });
  }
  const foundation = Buffer.from(JSON.stringify(report, null, 2) + '\n'), working = path.join(OUT, 'observation-working.json'); fs.writeFileSync(path.join(OUT, 'observation-foundation.json'), foundation, { flag: 'wx' }); fs.writeFileSync(working, foundation, { flag: 'wx' });
  const mutations = [
    ['skip-lock', v => { v.current[0].states.pending.skip.disabled = false; }, 'PHONE_PENDING_LOCKS'],
    ['header-lock', v => { v.current[0].states.pending.headers[0].disabled = false; }, 'PHONE_PENDING_LOCKS'],
    ['cell-lock', v => { v.current[0].states.pending.cells[0].disabled = false; }, 'PHONE_PENDING_LOCKS'],
    ['input-lock', v => { v.current[0].states.pending.input.disabled = false; }, 'PHONE_PENDING_LOCKS'],
    ['held-turn', v => { v.current[0].states.afterAttempts.redTurn = 0; }, 'PHONE_PENDING_TURN_CLUE'],
    ['held-grid', v => { v.current[0].states.afterAttempts.cells[0].label = 'QA changed'; }, 'PHONE_PENDING_GRID_HELD'],
    ['retry', v => { v.current[0].states.refused.redTurn = 0; }, 'PHONE_NO_PENALTY_RETRY'],
    ['accepted-piece', v => { v.current[0].states.accepted.cells[35].team = 'blue'; }, 'PHONE_ACCEPTED_PIECES'],
    ['callback', v => { v.current[0].validators[0].fulfillments = 2; }, 'PHONE_CALLBACK_ONCE'],
    ['scroll', v => { v.current[0].states.accepted.scroll.y += 2; }, 'PHONE_SETTLED_SCROLL_HELD'],
    ['bounds', v => { v.current[0].states.accepted.grid.docY += 2; }, 'PHONE_SETTLED_BOUNDS_HELD'],
    ['theme', v => { v.current[0].states.initial.theme.light = true; }, 'PHONE_ACTUAL_APP_THEME'],
    ['parity', v => { v.parent[0].states.initial.grid.docY += 2; }, 'PHONE_DESKTOP_PARITY'],
    ['image', v => { v.current[0].image.sha256 = '0'.repeat(64); }, 'PHONE_ORIGINAL_IMAGE_HASH'],
    ['unknown-io', v => { v.current[0].io[0].kind = 'unknown-refused'; }, 'PHONE_METHOD_KNOWN_IO'],
    ['page-error', v => { v.current[0].pageErrors.push('QA copied error'); }, 'PHONE_METHOD_PAGE_ERRORS'],
    ['target-floor', v => { v.current[0].states.initial.cells[0].box.width = 29; }, 'PHONE_TARGET_FLOOR'],
    ['row-strip', v => { v.current[0].states.initial.labels[0].rect.height = 30; }, 'PHONE_ROW_STRIPS'],
    ['keyboard', v => { v.current[0].keyboard = v.current[0].keyboard.filter(item => item.key !== 'Enter'); }, 'PHONE_NATIVE_KEYBOARD'],
  ];
  for (const [id, mutate, marker] of mutations) { const copy = JSON.parse(fs.readFileSync(working, 'utf8')); mutate(copy); const changed = Buffer.from(JSON.stringify(copy, null, 2) + '\n'); a.notEqual(sha(changed), sha(foundation), 'PHONE_METHOD_CONTROL_CHANGED'); fs.writeFileSync(working, changed); fs.writeFileSync(path.join(OUT, id + '.changed.json'), changed, { flag: 'wx' }); let error; try { judge(JSON.parse(fs.readFileSync(working, 'utf8'))); } catch (caught) { error = caught; } finally { fs.writeFileSync(working, foundation); a.deepEqual(fs.readFileSync(working), foundation, 'PHONE_METHOD_SAME_OBSERVATION_RESTORE'); judge(JSON.parse(fs.readFileSync(working, 'utf8'))); fs.writeFileSync(path.join(OUT, id + '.restored.json'), fs.readFileSync(working), { flag: 'wx' }); } a(error instanceof a.AssertionError && error.message.includes(marker), 'PHONE_METHOD_OWNED_COPIED_REFUSAL'); report.controls.push({ id, marker, beforeSHA256: sha(foundation), changedSHA256: sha(changed), restoredSHA256: sha(foundation), workingFile: 'observation-working.json', sameCopyRestored: true, scope: 'COPIED_OBSERVATION_ONLY_NO_FEATURE_CREDIT' }); }
  const phone = report.current.find(row => row.id === 'nba390-dark'), cell = phone.states.accepted.cells[35];
  a(cell.overflowY === 'visible' && cell.scrollHeight > cell.clientHeight + TOL, 'PHONE_METHOD_ACTUAL_BENIGN_VISIBLE_OVERHANG'); textFits(cell, cell.box, 11, 'PHONE_FULL_TEXT');
  report.guardControls.push(copiedGuardControl('visible-span-clipped', { item: cell, box: cell.box }, value => { value.item.overflowY = 'hidden'; }, value => textFits(value.item, value.box, 11, 'PHONE_FULL_TEXT'), 'PHONE_FULL_TEXT', 'current/nba390-dark/states/accepted/cells/35'));
  report.guardControls.push(copiedGuardControl('name-clamp', { item: cell, box: cell.box }, value => { value.item.clamp = '6'; }, value => textFits(value.item, value.box, 11, 'PHONE_FULL_TEXT'), 'PHONE_FULL_TEXT', 'current/nba390-dark/states/accepted/cells/35'));
  const old = report.parent.find(row => row.id === 'parent-nba1440-dark'), now = report.current.find(row => row.id === 'nba1440-dark');
  const desktopName = now.states.secondAccepted.cells[36]; textFits(desktopName, desktopName.box, 9, 'PHONE_FULL_TEXT');
  report.guardControls.push(copiedGuardControl('desktop-name-font-floor', { item: desktopName, box: desktopName.box }, value => { value.item.font = 8; }, value => textFits(value.item, value.box, 9, 'PHONE_FULL_TEXT'), 'PHONE_FULL_TEXT', 'current/nba1440-dark/states/secondAccepted/cells/36'));
  report.guardControls.push(copiedGuardControl('parent-stress-baseline', { before: old.states.secondPending.grid, after: old.states.secondAccepted.grid }, value => { value.after.width = value.before.width; }, value => referenceStress(value.before, value.after), 'PHONE_PARENT_STRESS_BASELINE', 'parent/parent-nba1440-dark/states/secondPending+secondAccepted/grid'));
  report.guardControls.push(copiedGuardControl('current-stress-improvement', stressProjection(old, now), value => { value.currentAfter.grid.width += 2; }, value => pairedImprovement(value), 'PHONE_DESKTOP_STRESS_IMPROVEMENT', 'paired/nba1440-dark/states/secondPending+secondAccepted'));
  const small = report.current.find(row => row.id === 'nba320-dark'), smallSubject = { value: small.states.initial, row: { width: small.width, theme: small.theme } };
  const smallName = small.states.accepted.cells[35]; textFits(smallName, smallName.box, 11, 'PHONE_FULL_TEXT');
  report.guardControls.push(copiedGuardControl('small-name-cell-clip', { item: smallName, box: smallName.box }, value => { value.box.bottom = Math.max(...value.item.lines.map(line => line.bottom)) - 1; }, value => textFits(value.item, value.box, 11, 'PHONE_FULL_TEXT'), 'PHONE_FULL_TEXT', 'current/nba320-dark/states/accepted/cells/35'));
  report.guardControls.push(copiedGuardControl('small-full-bleed', smallSubject, value => { value.value.scroller.x += 2; }, value => layout(value.value, value.row), 'PHONE_SMALL_FULL_BLEED', 'current/nba320-dark/states/initial'));
  report.guardControls.push(copiedGuardControl('small-gap', smallSubject, value => { value.value.gap.column = 4; }, value => layout(value.value, value.row), 'PHONE_RESPONSIVE_GAP', 'current/nba320-dark/states/initial'));
  report.stressOutcomes = report.parent.map(old => ({ parent: old.id, current: old.id.slice(7), ...desktopParity(old, report.current.find(now => 'parent-' + now.id === old.id)) }));
  a.equal(report.cssControls.length, 4); a.equal(report.cssOwnerControls.length, 1); a.equal(report.controls.length, 19); a.equal(report.guardControls.length, 8); a.equal(report.stressOutcomes.length, 8); judge(report); report.status = 'US_CONNECT4_PHONE_BOARD_NATIVE_PASSED';
} catch (error) { report.status = 'US_CONNECT4_PHONE_BOARD_NATIVE_FAILED'; report.failures.push({ name: error.name, message: error.message, stack: error.stack }); process.exitCode = 1; }
finally { try { if (browser) await browser.close(); } catch (error) { report.status = 'US_CONNECT4_PHONE_BOARD_NATIVE_FAILED'; report.failures.push({ method: 'browser-close', message: error.message }); process.exitCode = 1; } write('PHONE-BOARD-REPORT.json', report); }
console.log(report.status + ': ' + report.current.length + ' current and ' + report.parent.length + ' parent contexts; ' + report.cssControls.length + ' rendered CSS controls; ' + report.cssOwnerControls.length + ' physical CSS owner control; ' + report.controls.length + ' copied observation and ' + report.guardControls.length + ' additional guard controls.');
