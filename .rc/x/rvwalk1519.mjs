// Reviewer walk for Round 1519 (run lens). Served build at BASE, database host blocked.
// 390x844 touch and 1280x900, reduced motion on and off. Screenshots and rvwalk.json to RC_OUT.
// Run from the repo root: node .rc/x/rvwalk1519.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const pw = (await import(pathToFileURL(path.join(ROOT, 'scripts/lib/playwrightLoader.mjs')).href)).default;
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx', 'rvwalk1519');
fs.mkdirSync(OUT, { recursive: true });
const KEY = 'soccerCareerSave';
let checks = 0, failures = 0; const results = [];
const check = (ok, label) => { checks += 1; results.push({ ok: !!ok, label }); console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}`); if (!ok) failures += 1; return ok; };

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'rvwalk-'));
fs.writeFileSync(path.join(TMP, 'entry.mjs'), `globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export * from '${path.join(ROOT, 'src/lib/soccerCareerEngine.ts')}';
export { parseSoccerCareerSave } from '${path.join(ROOT, 'src/lib/soccerCareerSave.ts')}';
`);
await build({ entryPoints: [path.join(TMP, 'entry.mjs')], bundle: true, format: 'esm', platform: 'node', outfile: path.join(TMP, 'e.mjs'), logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
const E = await import(pathToFileURL(path.join(TMP, 'e.mjs')).href);
const clubs = E.FALLBACK_CLUBS;
const realRandom = Math.random;
function seed(n) { let s = n | 0; Math.random = () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const copy = v => JSON.parse(JSON.stringify(v));
const seen = s => { const o = { ...s }; delete o.chanceWheel; return o; };
function careerAt(age, youthOk = false) {
  seed(25192519);
  const o = 62, st = { pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o };
  let s = E.initCareer('Review Walker', 'Japan', 'ST', '2020s', st, o, 2025, clubs, null);
  const last = n => n - 1;
  for (let g = 0; g < 1500; g++) {
    if (youthOk && s.phase === 'youth') break;
    if (!youthOk && s.phase === 'playing' && s.age === age) break;
    if (s.retired) throw new Error('fixture retired at ' + s.age);
    switch (s.phase) {
      case 'youth': s = E.advanceYouthYear(s, clubs); break;
      case 'contract_offer': s = s.pendingOffers.length ? E.acceptOffer(s, s.pendingOffers[last(s.pendingOffers.length)]) : { ...s, phase: 'playing' }; break;
      case 'playing': s = E.advanceProSeason(s, clubs); break;
      case 'newspaper': s = E.dismissNewspaper(s); break;
      case 'season_summary': s = E.dismissSummary(s, clubs); break;
      case 'random_events': s = s.pendingEvents[0] ? E.applyEventChoice(s, last(s.pendingEvents[0].choices.length), clubs) : { ...s, phase: 'playing' }; break;
      case 'moral_dilemma': s = s.pendingMoralDilemma ? E.applyMoralDilemmaChoice(s, last(s.pendingMoralDilemma.choices.length)) : E.dismissMoralDilemma(s, clubs); break;
      case 'social_media_action': s = E.dismissSocialMediaPhase(s, clubs); break;
      case 'red_card_appeal_result': s = E.dismissAppealResult(s, clubs); break;
      case 'international_debut': s = E.dismissDebut(s, clubs); break;
      case 'world_cup': s = E.dismissWorldCup(s, clubs); break;
      case 'rivalry_event': s = E.dismissRivalryEvent(s, clubs); break;
      case 'ballon_dor': s = E.dismissBallonDor(s, clubs); break;
      case 'rehab_choice': s = E.applyRehabChoice(s, 1); break;
      case 'transfer_window': s = E.stayAtClub(s); break;
      case 'retirement_suggestion': s = E.declineRetirementSuggestion(s, clubs); break;
      default: throw new Error('unhandled phase ' + s.phase);
    }
  }
  Math.random = realRandom;
  return seen(s);
}
const lowStats = (s, o) => ({ ...s, pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o, overall: o });
const at25 = careerAt(25), at26 = careerAt(26), youth = careerAt(16, true);
seed(2519001); let summary26 = E.advanceProSeason(copy(at25), clubs);
if (summary26.phase === 'newspaper') summary26 = E.dismissNewspaper(summary26);
seed(2519002); const forced33 = seen(E.advanceProSeason({ ...lowStats(copy(at26), 40), age: 32 }, clubs));
seed(2519003); const forced45 = seen(E.advanceProSeason({ ...copy(at26), age: 44 }, clubs));
Math.random = realRandom;
const real = E.manualRetire(copy(at26));
seed(2519004); const manager = seen(E.choosePostRetirement(copy(real), 'manager', clubs)); Math.random = realRandom;
console.log(`fixtures: at25 ${at25.phase}/${at25.age}, at26 ${at26.phase}/${at26.age}, youth ${youth.phase}/${youth.age}, summary26 ${summary26.phase}/${summary26.age}, forced33 ${forced33.phase}/${forced33.age}/${forced33.overall}, forced45 ${forced45.phase}/${forced45.age}, manager ${manager.phase}`);
const FIX = {
  at25,
  strayPlaying26: { ...copy(at26), retired: true },
  straySummary26: { ...seen(copy(summary26)), retired: true },
  strayYouth: { ...copy(youth), retired: true },
  forced33, forced45,
  forced33Lost: { ...copy(forced33), phase: 'playing', legacy: null },
  manager,
  realLost: { ...copy(real), phase: 'playing' },
};
const POST = ['retirement_ceremony', 'post_retirement', 'retired', 'manager_season', 'pundit_season', 'owner_season'];
const ended = s => !!s && (s.retired || POST.includes(s.phase));
fs.rmSync(TMP, { recursive: true, force: true });

const browser = await pw.chromium.launch({ headless: true });
const errors = [];
try {
  for (const width of [390, 1280]) for (const motion of ['reduce', 'no-preference']) {
    const touch = width < 1000; const tag = `${width}-${motion === 'reduce' ? 'rm' : 'mo'}`;
    const ctx = await browser.newContext({ viewport: { width, height: touch ? 844 : 900 }, hasTouch: touch, isMobile: touch, reducedMotion: motion });
    await ctx.route(/supabase\.co/, r => r.abort());
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(`${tag}: ${String(e).slice(0, 200)}`));
    const raw = () => page.evaluate(k => localStorage.getItem(k), KEY);
    const save = async () => { const r = await raw(); return r ? E.parseSoccerCareerSave(r) : null; };
    const press = async loc => { await loc.scrollIntoViewIfNeeded(); if (touch) await loc.tap(); else await loc.click(); };
    const shot = async (name, full = false) => page.screenshot({ path: path.join(OUT, `rv-${tag}-${name}.png`), fullPage: full });
    const fits = async label => { const w = await page.evaluate(() => document.documentElement.scrollWidth); check(w <= width + 1, `${tag} ${label}: no sideways scroll (${w})`); };
    const load = async fixture => {
      await page.goto(BASE + '/soccer-career', { waitUntil: 'domcontentloaded' });
      await page.evaluate(([k, v]) => { localStorage.clear(); localStorage.setItem('cookie-consent', 'essential'); localStorage.setItem('rules-gate-seen:/soccer-career', '1'); localStorage.setItem(k, v); }, [KEY, JSON.stringify(fixture)]);
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(600);
    };
    const continueThrough = async () => {
      for (let i = 0; i < 5; i++) {
        const s = await save();
        if (!s || !['newspaper', 'season_summary'].includes(s.phase)) return;
        const before = await raw();
        const btn = page.getByRole('button', { name: /^Continue/ }).first();
        if (!(await btn.count())) return;
        await press(btn);
        await page.waitForFunction(([k, b]) => localStorage.getItem(k) !== b, [KEY, before], { timeout: 10000 }).catch(() => {});
      }
    };
    const body = async () => (await page.textContent('body')) || '';
    let s;

    // 1. Next Season at 25, through the paper and summary, reload.
    await load(FIX.at25);
    await press(page.locator('[data-career-action-bar] button').first());
    await page.waitForFunction(k => /"age":26/.test(localStorage.getItem(k) || ''), KEY, { timeout: 15000 }).catch(() => {});
    await shot('summary26');
    await continueThrough();
    s = await save(); check(s && s.age === 26 && !ended(s), `${tag} 1 Next Season at 25 then Continue plays on at 26 (phase ${s?.phase})`);
    await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(400);
    s = await save(); check(s && !ended(s), `${tag} 1 a reload keeps it (phase ${s?.phase}, retired ${s?.retired})`);
    await shot('after-reload'); await fits('after reload');

    const noRetiredScreen = async () => (await page.getByRole('button', { name: /Share Legacy/ }).count()) === 0 && (await page.getByRole('button', { name: /Retire and Enjoy Life/ }).count()) === 0;
    // 2. A stray flag on Next Season at 26: the screen offers Next Season, and a press plays the season.
    await load(FIX.strayPlaying26);
    check(await noRetiredScreen(), `${tag} 2 a stray flag on Next Season at 26 shows no retired screen or send off`);
    await shot('stray-playing26');
    await press(page.locator('[data-career-action-bar] button').first());
    await page.waitForFunction(k => /"age":27/.test(localStorage.getItem(k) || ''), KEY, { timeout: 15000 }).catch(() => {});
    s = await save(); check(s && s.age === 27 && !ended(s), `${tag} 2 Next Season from the stray flag plays 27 (age ${s?.age}, phase ${s?.phase}, retired ${s?.retired})`);

    // 3. A stray flag on the summary at 26: Continue plays on.
    await load(FIX.straySummary26);
    await shot('stray-summary26');
    await continueThrough();
    s = await save(); check(s && !ended(s) && await noRetiredScreen(), `${tag} 3 Continue on a stray flag at 26 plays on (phase ${s?.phase}, retired ${s?.retired})`);

    // 4. A stray flag on a youth career: plays on as youth.
    await load(FIX.strayYouth);
    check(await noRetiredScreen(), `${tag} 4 a stray flag on a youth career shows no retired screen`);
    await shot('stray-youth');
    await press(page.locator('[data-career-action-bar] button').first());
    await page.waitForTimeout(1500);
    s = await save(); check(s && !ended(s) && s.age > FIX.strayYouth.age, `${tag} 4 the youth career plays on (age ${s?.age}, phase ${s?.phase}, retired ${s?.retired})`);

    // 5 to 7. The game's own endings say why on the send off.
    for (const [name, fx, re] of [['forced33', FIX.forced33, /^Forced out at 33: overall \d+, the body could not keep up\.$/], ['forced45', FIX.forced45, /^Forced out at 45, the age limit\.$/], ['forced33-lost', FIX.forced33Lost, /^Forced out at 33: overall \d+, the body could not keep up\.$/]]) {
      await load(fx);
      const line = page.locator('[data-retirement-reason]');
      await line.first().waitFor({ timeout: 8000 }).catch(() => {});
      const txt = (await line.count()) ? (await line.first().textContent()) : null;
      check(re.test(txt || ''), `${tag} ${name}: the send off says why (${txt})`);
      check((await page.getByRole('button', { name: /Retire and Enjoy Life/ }).count()) === 1 && (await page.getByRole('button', { name: /Become a Manager/ }).count()) === 1, `${tag} ${name}: the send off offers its choices`);
      if (txt) {
        await line.first().scrollIntoViewIfNeeded();
        const geo = await line.first().evaluate(el => { const r = el.getBoundingClientRect(); const p = el.previousElementSibling.getBoundingClientRect(); const cs = getComputedStyle(el); let o = 1, n = el; while (n) { o *= Number(getComputedStyle(n).opacity); n = n.parentElement; } return { clipped: el.scrollWidth > el.clientWidth + 1, overlap: r.top < p.bottom - 1, h: r.height, w: r.width, color: cs.color, opacity: o }; });
        check(!geo.clipped && !geo.overlap && geo.h > 0 && geo.opacity > 0.99, `${tag} ${name}: the line is whole, below the age line, fully opaque (${JSON.stringify(geo)})`);
        await page.waitForTimeout(motion === 'reduce' ? 200 : 2500);
        await page.evaluate(() => window.scrollTo(0, Math.max(0, document.querySelector('[data-retirement-reason]').getBoundingClientRect().top + window.scrollY - 260)));
        await shot(name);
      }
      await fits(name);
    }


    // 8. A manager tail (a consistent post career) stays a manager through two reloads.
    await load(FIX.manager);
    await shot('manager');
    check(await noRetiredScreen(), `${tag} 8 the manager tail opens as the manager, not the send off or the retired screen`);
    await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(400);
    s = await save(); check(s && s.phase === 'manager_season' && s.retired === true, `${tag} 8 the manager tail is still the manager after a reload (phase ${s?.phase})`);

    // 9. A real retirement at 26 whose phase was lost: the send off, no forced line, Retire and Enjoy Life, reload stays retired.
    await load(FIX.realLost);
    check((await page.getByRole('button', { name: /Retire and Enjoy Life/ }).count()) === 1 && (await body()).includes('retires at age 26'), `${tag} 9 a real retirement whose phase was lost opens its send off`);
    check((await page.locator('[data-retirement-reason]').count()) === 0, `${tag} 9 the player's own retirement has no forced line`);
    await press(page.getByRole('button', { name: /Retire and Enjoy Life/ }));
    await page.waitForTimeout(800);
    s = await save(); check(s && s.retired && s.phase === 'retired', `${tag} 9 Retire and Enjoy Life lands on the retired screen (phase ${s?.phase})`);
    await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(400);
    s = await save(); check(s && s.retired && s.phase === 'retired' && (await page.getByRole('button', { name: /Share Legacy/ }).count()) === 1, `${tag} 9 the retired screen survives a reload (phase ${s?.phase})`);
    await shot('retired-after-reload');

    // 10. The Retire dialog: cancel, then confirm.
    await load(at26);
    const retire = page.locator('button', { hasText: /^🚪 Retire$/ }).first();
    await press(retire);
    const dialog = page.getByRole('dialog');
    await dialog.first().waitFor({ timeout: 5000 }).catch(() => {});
    await shot('retire-dialog');
    const cancel = dialog.getByRole('button', { name: 'Cancel' });
    if (await cancel.count()) await press(cancel);
    await page.waitForTimeout(500);
    s = await save(); check(s && !ended(s), `${tag} 10 Cancel keeps the career (phase ${s?.phase})`);
    await press(retire);
    const confirm = page.getByRole('dialog').getByRole('button', { name: /Confirm Retirement/ });
    await confirm.waitFor({ timeout: 5000 }).catch(() => {});
    if (await confirm.count()) await press(confirm);
    await page.waitForTimeout(800);
    s = await save(); check(s && s.retired && s.phase === 'retirement_ceremony' && s.age === 26, `${tag} 10 Confirm ends on the send off at 26 (phase ${s?.phase})`);
    await shot('send-off-26');
    await ctx.close();
  }
} finally { await browser.close(); }
check(errors.length === 0, `no page errors (${errors.slice(0, 3).join(' | ')})`);
fs.writeFileSync(path.join(OUT, 'rvwalk.json'), JSON.stringify({ base: BASE, checks, failures, results, errors }, null, 2));
console.log(failures ? `rvwalk1519: FAIL, ${failures} of ${checks} checks failed` : `rvwalk1519: ${checks} checks, 0 failures`);
process.exit(failures ? 1 : 0);
