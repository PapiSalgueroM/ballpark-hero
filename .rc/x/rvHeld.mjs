/* Reviewer proof (Round 1046, critic C2.4's middle check, which the round did not build):
   a ledger made in node (one YOUR CALL taken against the record, banked), the save on the hub,
   the latest season opened from Season replays. The table after that matchday must be node's
   table WITH the decision applied, and no moment may be offered. BASE is the served dist. */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx/rv-shots');
fs.mkdirSync(OUT, { recursive: true });
const imp = rel => import(pathToFileURL(path.join(ROOT, rel)).href);
const pw = (await imp('scripts/lib/playwrightLoader.mjs')).default;
const { bundleAwardsNight } = await imp('scripts/lib/careerAwardsNightBundle.mjs');
const { mulberry32 } = await imp('scripts/lib/careerAwardsNightProbe.mjs');
const B = await bundleAwardsNight(ROOT, { extra: { season: 'src/lib/season/soccer.ts', core: 'src/lib/season/core.ts', moments: 'src/lib/season/soccerMoments.ts', ledger: 'src/lib/season/momentsSave.ts' } });
const { soccer, season: S, core: C, moments: MO, ledger: L } = B;
const CLUBS = soccer.FALLBACK_CLUBS;
const log = (...a) => console.log(a.map(x => (typeof x === 'string' ? x : JSON.stringify(x))).join(' '));
const abil = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
const stepOf = s => {
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
};
const orderOf = (d, k) => C.tableAt(d, k).map(r => `${d.labels[r.slot]?.key ?? `u${r.slot}`}:${r.pts}`);

/* a hub save whose latest season is a table he did not win, still the league year the save holds, with a YOUR CALL that moves the table */
let H = null;
for (let c = 0; c < 200 && !H; c += 1) {
  const real = Math.random;
  Math.random = mulberry32(c * 7919 + 1046);
  try {
    let s = soccer.initCareer(`Held ${c}`, 'England', 'ST', '2010-14', abil(72 + (c % 10)), 72 + (c % 10), 2010, CLUBS, null, 92);
    for (let g = 0; g < 400 && s && !s.retired && !H; g += 1) {
      const row = s.seasons[s.seasons.length - 1];
      if (s.phase === 'playing' && row && row.type === 'playing' && row.apps > 0 && s.phone?.world?.year === row.year) {
        const ctx = S.buildSoccerSeasonCtx(s, CLUBS, row);
        const key = S.SOCCER.seasonKey(row, ctx);
        const plan = key && ctx.mode === 'table' && ctx.finish?.finish !== 1 ? C.deriveSeason(S.SOCCER, row, ctx) : null;
        if (plan && plan.mode === 'table') {
          for (const m of C.planMoments(S.SOCCER, row, ctx, plan).filter(x => x.mode === 'call' && x.md >= 2 && x.md <= 12)) {
            const entry = [m.md, m.id, m.planSuccess ? 0 : 2];
            const applied = C.applyDecisions(S.SOCCER, row, ctx, plan, C.planMoments(S.SOCCER, row, ctx, plan), [entry]);
            if (applied !== plan && JSON.stringify(orderOf(applied, m.md)) !== JSON.stringify(orderOf(plan, m.md))) {
              let led = L.ledgerPut(undefined, key, m.md, m.id, -1, []);
              led = L.ledgerPut(led, key, m.md, m.id, entry[2], []);
              let banked = MO.closeSeasonMoments({ ...s, seasonMoments: led }, CLUBS);
              if (banked.seasonMoments?.banked !== 1) banked = { ...s, seasonMoments: { ...led, banked: 1 } };
              H = { save: JSON.stringify(banked), row, m, key, plan, applied, at: s.seasons.length - 1, name: s.playerName };
              break;
            }
          }
        }
      }
      s = stepOf(s);
    }
  } finally { Math.random = real; }
}
if (!H) { console.log('rvHeld: no save found, nothing proved'); process.exit(2); }
const g0 = H.plan.games[H.m.md - 1], g1 = H.applied.games[H.m.md - 1];
log(`save: ${H.name} ${H.row.year} ${H.row.club}; YOUR CALL at matchday ${H.m.md} (${H.m.kind}, on the record ${H.m.planSuccess ? 'made' : 'missed'}), mirror ${H.m.mirrorMd}; score as saved ${g0.us}-${g0.them}, as he played it ${g1.us}-${g1.them}; ledger ${JSON.stringify(JSON.parse(H.save).seasonMoments)}`);

const browser = await pw.chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.addInitScript(v => { try { if (!sessionStorage.getItem('rv')) { sessionStorage.setItem('rv', '1'); localStorage.setItem('cookie-consent', 'essential'); localStorage.setItem('soccerCareerSave', v); localStorage.setItem('seasonCentre:help', '1'); } } catch { /* private */ } }, H.save);
await ctx.route(/supabase\.co/, r => r.abort());
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
await page.goto(`${BASE}/soccer-career`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForSelector('[data-open-season-replays]', { timeout: 60000 });
await page.waitForTimeout(600);
const before = await page.evaluate(() => localStorage.getItem('soccerCareerSave'));
await page.click('[data-open-season-replays]');
await page.waitForSelector(`[data-replay-row="${H.at}"]`, { timeout: 30000 });
await page.click(`[data-replay-row="${H.at}"]`);
await page.waitForSelector('[data-kickoff]', { timeout: 30000 });
const press = async t => { const ok = await page.evaluate(x => { const b = [...document.querySelectorAll('[data-season-centre] button')].find(e => !e.disabled && e.textContent.trim().startsWith(x)); if (!b) return false; b.click(); return true; }, t); await page.waitForTimeout(160); return ok; };
const offeredLine = await page.evaluate(() => document.querySelector('[data-kickoff-moments]')?.textContent ?? null);
await press('▶ Kick off'); await press('Results');
const md = async () => Number((await page.evaluate(() => document.querySelector('[data-matchday]')?.textContent ?? '')).match(/(\d+) of/)?.[1] ?? 0);
for (let i = 0; i < 40 && (await md()) < H.m.md; i += 1) { if (await press('▶ Let it play')) continue; await press('▶ Matchday'); }
await page.waitForTimeout(900);
const shown = await page.evaluate(() => [...document.querySelectorAll('[data-rank-shift] [data-club]')].filter(r => r.offsetParent !== null).map(r => `${r.dataset.club}:${r.lastElementChild?.textContent.trim()}`));
const score = await page.evaluate(() => document.querySelector('[data-score-bug]')?.textContent.replace(/\s+/g, ' ').trim() ?? null);
await page.screenshot({ path: path.join(OUT, 'held-01-matchday.png') });
const asPlayed = JSON.stringify(shown) === JSON.stringify(orderOf(H.applied, H.m.md));
const asSaved = JSON.stringify(shown) === JSON.stringify(orderOf(H.plan, H.m.md));
log(`page at matchday ${await md()}: score bug "${score}"; moments line on the kick off card: ${JSON.stringify(offeredLine)}; open 🎯 on fixtures: ${await page.evaluate(() => document.querySelectorAll('[data-fixture-moment]').length)}`);
log(`table equals node's WITH the decision: ${asPlayed}; equals the table as saved (decision ignored): ${asSaved}`);
if (!asPlayed) log('page:', shown.slice(0, 8), 'node applied:', orderOf(H.applied, H.m.md).slice(0, 8), 'node plan:', orderOf(H.plan, H.m.md).slice(0, 8));
await press('⏭ Sim the rest');
await page.waitForTimeout(900);
const after = await page.evaluate(() => localStorage.getItem('soccerCareerSave'));
log(`save byte for byte the same after the replay reached its review: ${before === after}; page errors: ${JSON.stringify(errors)}`);
await browser.close();
console.log(`rvHeld: a hub replay of the ledger's season ${asPlayed ? 'SHOWS' : 'DOES NOT SHOW'} the banked YOUR CALL`);
process.exit(asPlayed && before === after && offeredLine === null ? 0 : 1);
