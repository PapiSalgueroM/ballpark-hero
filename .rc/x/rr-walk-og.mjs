/* Reviewer walk (never committed): own goals in the Soccer Career Season Centre, in a real browser.
   Saves are made by the real engine in node; the page gets them through localStorage; supabase is blocked. */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const imp = rel => import(pathToFileURL(path.join(ROOT, rel)).href);
const pw = (await imp('scripts/lib/playwrightLoader.mjs')).default;
const { bundleAwardsNight } = await imp('scripts/lib/careerAwardsNightBundle.mjs');
const { mulberry32 } = await imp('scripts/lib/careerAwardsNightProbe.mjs');
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx/rr-shots');
fs.mkdirSync(OUT, { recursive: true });
const report = { cases: [], targets: {} };
const say = s => console.log(s);

const B = await bundleAwardsNight(ROOT, { extra: { season: 'src/lib/season/soccer.ts', core: 'src/lib/season/core.ts', events: 'src/lib/season/soccerEvents.ts' } });
const { soccer, season: S, core: C, events: E } = B;
const CLUBS = soccer.FALLBACK_CLUBS;
const abil = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
function step(s) {
  switch (s.phase) {
    case 'youth': return soccer.advanceYouthYear(s, CLUBS);
    case 'contract_offer': { const o = s.pendingOffers || []; return o.length ? soccer.acceptOffer(s, o[0]) : { ...s, phase: 'playing' }; }
    case 'playing': return soccer.advanceProSeason(s, CLUBS);
    case 'newspaper': return soccer.dismissNewspaper(s);
    case 'season_summary': return soccer.dismissSummary(s, CLUBS);
    case 'ballon_dor': return soccer.dismissBallonDor(s, CLUBS);
    case 'international_debut': return soccer.dismissDebut(s, CLUBS);
    case 'world_cup': return soccer.dismissWorldCup(s, CLUBS);
    case 'rivalry_event': return soccer.dismissRivalryEvent(s, CLUBS);
    case 'social_media_action': return soccer.dismissSocialMediaPhase(s, CLUBS);
    case 'moral_dilemma': { const n = soccer.applyMoralDilemmaChoice(s, 0); return n.phase === 'moral_dilemma' ? soccer.dismissMoralDilemma(n, CLUBS) : n; }
    case 'random_events': { const ev = (s.pendingEvents || [])[0]; return ev && ev.choices && ev.choices.length ? soccer.applyEventChoice(s, 0, CLUBS) : { ...s, phase: 'playing', pendingEvents: [] }; }
    case 'red_card_appeal_result': return soccer.dismissAppealResult(s, CLUBS);
    case 'rehab_choice': return soccer.applyRehabChoice(s, 0);
    case 'transfer_window': return soccer.stayAtClub(s);
    case 'retirement_suggestion': return s.age >= 34 ? soccer.acceptRetirementSuggestion(s) : soccer.declineRetirementSuggestion(s, CLUBS);
    default: return null;
  }
}
const WHO = { you: 'You', teammate: 'A teammate', opponent: 'An opponent' };
/* what the page should print for a tagged goal (the page's own sentence, rebuilt here from the engine's facts) */
const wordsOf = (e, us, them) => `⚽ ${WHO[e.ownGoalBy]} (O.G), goal for ${e.side === 'us' ? us : them}`;

/* ─── find saves: a "you" own goal, and the longest teammate and opponent lines ─── */
const T = {};
let seasons = 0, tagged = 0;
const POS = ['ST', 'CM', 'CB', 'GK', 'LW'];
for (let c = 0; c < 220 && !(T.you && T.teammate && T.opponent && T.teammate.len >= 50 && T.opponent.len >= 48); c += 1) {
  const real = Math.random;
  Math.random = mulberry32(c * 7919 + 1167);
  try {
    let s = soccer.initCareer(`Review ${c}`, 'England', POS[c % POS.length], '2010-14', abil(70 + (c % 12)), 70 + (c % 12), 2010, CLUBS, null, 92);
    for (let g = 0; g < 600 && s && !s.retired; g += 1) {
      if (s.phase === 'season_summary' && s.pendingSummary?.type === 'playing' && s.pendingSummary.apps > 0) {
        const row = s.pendingSummary;
        const ctx = S.buildSoccerSeasonCtx(s, CLUBS, row);
        const d = C.deriveSeason(S.SOCCER, row, ctx);
        if (d && d.mode === 'table') {
          seasons += 1;
          const planned = C.planMoments(S.SOCCER, row, ctx, d);
          const marked = E.soccerOwnGoals(d, planned);
          const names = d.labels.map(l => (l.named ? l.name : S.SOCCER.words.unnamed));
          const tags = [];
          for (const game of marked.games) for (const e of game.events) if (e.ownGoalBy) tags.push({ md: game.md, min: e.min, by: e.ownGoalBy, side: e.side, played: game.played, words: wordsOf(e, row.club, names[game.opp]) });
          if (tags.length) tagged += 1;
          for (const t of tags) {
            const cand = { save: JSON.stringify(s), club: row.club, year: row.year, position: s.position, names, tags, target: t, len: t.words.length, mds: marked.games.length };
            if (t.by === 'you' && (!T.you || t.md < T.you.target.md)) T.you = cand;
            if (t.by !== 'you' && (!T[t.by] || cand.len > T[t.by].len || (cand.len === T[t.by].len && t.md < T[t.by].target.md))) T[t.by] = cand;
          }
        }
      }
      s = step(s);
    }
  } finally { Math.random = real; }
}
say(`engine: ${seasons} table seasons looked at, ${tagged} with at least one own goal`);
for (const k of ['you', 'teammate', 'opponent']) {
  const t = T[k];
  say(t ? `target ${k}: ${t.club} ${t.year}, ${t.position}, matchday ${t.target.md} of ${t.mds}, ${t.target.min}', "${t.target.words}" (${t.len} chars), ${t.tags.length} own goals that season` : `target ${k}: NONE FOUND`);
  if (t) report.targets[k] = { club: t.club, year: t.year, position: t.position, target: t.target, tags: t.tags, names: t.names };
}

/* ─── the browser ─── */
const browser = await pw.chromium.launch({ args: ['--no-sandbox', '--no-proxy-server'] });
async function open(save, { width, height, reduced }) {
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await ctx.addInitScript(v => {
    try {
      if (!sessionStorage.getItem('rr-walk')) {
        sessionStorage.setItem('rr-walk', '1');
        localStorage.setItem('cookie-consent', 'essential');
        localStorage.setItem('soccerCareerSave', v);
        localStorage.setItem('seasonCentre:help', '1');
      }
    } catch { /* private mode */ }
  }, save);
  await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  await page.goto(`${BASE}/soccer-career`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => document.querySelectorAll('#root [class]').length > 80, { timeout: 40000 }).catch(() => {});
  await page.waitForTimeout(1200);
  return { ctx, page, errors };
}
const clickText = async (page, text) => {
  const ok = await page.evaluate(t => {
    const b = [...document.querySelectorAll('button')].find(x => !x.disabled && x.textContent.trim().startsWith(t));
    if (!b) return false;
    b.click();
    return true;
  }, text);
  await page.waitForTimeout(220);
  return ok;
};
const shot = async (page, name) => { await page.waitForTimeout(500); await page.screenshot({ path: path.join(OUT, `${name}.png`) }); };
const letPlay = async page => ((await page.$('[data-moment-offer]')) ? clickText(page, '▶ Let it play') : false);
/* the matchday on screen, read off the bar: at full time the green button names the next one */
const stageOf = page => page.evaluate(() => {
  const bar = document.querySelector('[data-centre-bar]');
  const next = bar ? [...bar.querySelectorAll('button')].map(b => b.textContent.trim()).find(t => /^▶ (Matchday|League game) \d+/.test(t)) : null;
  const clock = document.querySelector('[data-match-clock]');
  return {
    nextMd: next ? Number(next.match(/(\d+)/)[1]) : null,
    poster: !!document.querySelector('[data-poster]'),
    ft: !!document.querySelector('[data-full-time]'),
    minute: clock ? Number(clock.getAttribute('data-minute')) : null,
    review: !!document.querySelector('[data-review]') || !!(bar && [...bar.querySelectorAll('button')].some(b => b.textContent.includes('Season review'))),
  };
});
const listOf = page => page.evaluate(() => {
  const ol = document.querySelector('[data-clock-events]');
  if (!ol) return null;
  const lis = [...ol.querySelectorAll('li')];
  const first = lis[0];
  const span = first ? first.querySelectorAll('span')[1] : null;
  return {
    olW: ol.clientWidth, olH: ol.clientHeight, scrollH: ol.scrollHeight,
    wordsRoom: first && span ? Math.round(first.getBoundingClientRect().right - span.getBoundingClientRect().left) : null,
    rows: lis.map(li => ({ t: li.textContent.trim(), h: Math.round(li.getBoundingClientRect().height * 10) / 10 })),
    sideways: document.documentElement.scrollWidth - window.innerWidth,
  };
});
/* how wide a sentence would be in the list's own font, without touching the list */
const widthsOf = (page, texts) => page.evaluate(ts => {
  const ol = document.querySelector('[data-clock-events]');
  const probe = document.createElement('span');
  probe.className = 'text-xs';
  probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;left:-9999px;top:0';
  ol.parentElement.appendChild(probe);
  const out = ts.map(t => { probe.textContent = t; return Math.ceil(probe.getBoundingClientRect().width); });
  probe.remove();
  return out;
}, texts);


/* ─── one walk: to the target matchday in Results speed, the target match itself live when asked ─── */
async function walk(kind, width, height, reduced, live) {
  const t = T[kind];
  if (!t) return;
  const tag = `${kind}-${width}${reduced ? '-reduced' : ''}`;
  const row = { tag, kind, width, reduced, live, found: false, lines: [], steps: 0 };
  report.cases.push(row);
  const P = await open(t.save, { width, height, reduced });
  try {
    if (!(await clickText(P.page, '📺 Watch it week by week'))) { row.blocked = 'no Watch it week by week button'; await shot(P.page, `og-${tag}-BLOCKED`); return; }
    await P.page.waitForSelector('[data-kickoff]', { timeout: 20000 });
    await clickText(P.page, '▶ Kick off');
    await clickText(P.page, 'Results');
    const M = t.target.md;
    let liveDone = false;
    for (let i = 0; i < 400; i += 1) {
      row.steps = i;
      await letPlay(P.page);
      const st = await stageOf(P.page);
      const goLive = live && !liveDone && st.nextMd === M;
      if (st.poster) {
        if (goLive) await clickText(P.page, '3x');
        if (!(await clickText(P.page, '▶ Matchday')) && !(await clickText(P.page, '▶ League game'))) break;
      } else if (st.ft) {
        const cur = st.nextMd ? st.nextMd - 1 : t.mds;
        if (cur === M) {
          const L = await listOf(P.page);
          row.list = L;
          row.lines = L ? L.rows.filter(r => r.t.includes('(O.G)')) : [];
          row.found = row.lines.some(r => r.t.endsWith(t.target.words));
          await P.page.evaluate(() => { const li = [...document.querySelectorAll('[data-clock-events] li')].find(x => x.textContent.includes('(O.G)')); if (li) li.scrollIntoView({ block: 'nearest' }); });
          await shot(P.page, `og-${tag}-1-fulltime`);
          if (L) {
            const texts = [...new Set(t.names)].map(n => `⚽ A teammate (O.G), goal for ${n}`).concat([`⚽ An opponent (O.G), goal for ${t.club}`]);
            const w = await widthsOf(P.page, texts);
            row.room = L.wordsRoom;
            row.measured = texts.length;
            row.wouldWrap = texts.map((x, k) => ({ x, w: w[k] })).filter(x => x.w > L.wordsRoom).sort((a, b) => b.w - a.w);
            row.widest = texts.map((x, k) => ({ x, w: w[k] })).sort((a, b) => b.w - a.w).slice(0, 3);
          }
          await P.page.evaluate(() => { const b = [...document.querySelectorAll('[data-season-centre] button')].find(x => x.textContent.trim() === '?'); if (b) b.click(); });
          await P.page.waitForSelector('[data-season-help]', { timeout: 5000 }).catch(() => {});
          row.help = await P.page.evaluate(() => { const h = document.querySelector('[data-season-help]'); if (!h) return null; const x = [...h.querySelectorAll('*')].find(n => n.children.length === 0 && n.textContent.trim() === 'An own goal'); if (x) x.scrollIntoView({ block: 'center' }); return { intro: h.textContent.includes('Own goals are fictional details'), example: !!x }; });
          if (kind === 'you') await shot(P.page, `og-${tag}-2-help`);
          break;
        }
        if (!st.nextMd) break;
        if (goLive) await clickText(P.page, '3x');
        if (!(await clickText(P.page, '▶ Matchday')) && !(await clickText(P.page, '▶ League game'))) break;
        if (goLive) {
          /* the target match on the clock: stop the camera just after the own goal's minute */
          for (let k = 0; k < 700; k += 1) {
            await letPlay(P.page);
            const s2 = await stageOf(P.page);
            if (s2.poster) { await clickText(P.page, '▶ Matchday'); continue; }
            if (s2.minute !== null && (s2.minute >= t.target.min || s2.ft)) { row.liveMinute = s2.minute; break; }
            await P.page.waitForTimeout(120);
          }
          await P.page.waitForTimeout(900);
          await shot(P.page, `og-${tag}-0-live`);
          row.liveList = await listOf(P.page);
          liveDone = true;
          await clickText(P.page, 'Results');
        }
      } else {
        await P.page.waitForTimeout(200);
      }
    }
  } catch (e) {
    row.error = String(e).slice(0, 300);
    await shot(P.page, `og-${tag}-ERROR`).catch(() => {});
  } finally {
    row.pageErrors = P.errors;
    await P.ctx.close();
  }
  say(`walk ${tag}: found=${row.found} steps=${row.steps} lines=${JSON.stringify(row.lines)} room=${row.room} wouldWrap=${row.wouldWrap ? row.wouldWrap.length : '?'} of ${row.measured ?? '?'} sideways=${row.list ? row.list.sideways : '?'} help=${JSON.stringify(row.help ?? null)} errors=${JSON.stringify(row.pageErrors)}${row.error ? ' ERROR ' + row.error : ''}${row.blocked ? ' BLOCKED ' + row.blocked : ''}`);
}

try {
  await walk('you', 390, 844, false, true);
  await walk('you', 1280, 900, false, true);
  await walk('you', 390, 844, true, true);
  await walk('teammate', 390, 844, false, false);
  await walk('teammate', 1280, 900, false, false);
  await walk('opponent', 390, 844, false, false);
  await walk('opponent', 1280, 900, false, false);
} finally {
  fs.writeFileSync(path.join(OUT, 'og-report.json'), JSON.stringify(report, null, 1));
  await browser.close();
}
console.log(`rr-walk-og: ${report.cases.length} walks, ${report.cases.filter(c => c.found).length} found their own goal line`);
process.exit(0);
