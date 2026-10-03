import assert from 'node:assert/strict';
import React from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import Board from '@/components/nhl-front-office/NhlFrontOfficeBoard';
import * as E from '@/lib/nhlFrontOffice';
import { NHL_OPENING_RATINGS } from '@/data/nhlOpeningRatings';

/* Real engine transactions and explicitly simulated completed-season saves. */
const KEY = 'nhl-front-office-save-v1', SENTINEL = 'nhl967-unrelated';
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
function random(seed: number) {
  let draws = 0;
  const rng = () => { draws++; seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; };
  rng.draws = () => draws;
  return rng;
}
const fresh = () => E.initNhlLeague(random(939), NHL_OPENING_RATINGS);
const saved = () => JSON.parse(localStorage.getItem(KEY)!);
const buttons = () => Array.from(document.querySelectorAll('button'));
function button(label: string) {
  const found = buttons().find(b => b.textContent?.trim() === label);
  assert.ok(found, `Actual button exists: ${label}`);
  return found;
}
const options = () => buttons().filter(b => saved().draftClass?.some((p: E.NhlProspect) => b.textContent?.startsWith(p.name)));
const click = async (b: HTMLButtonElement) => { await act(async () => { fireEvent.click(b); }); };
function recap(lg: E.NhlLeague, myTeam: string) {
  const league = clone(lg); league.round = E.NHL_FO_ROUNDS;
  return { league, myTeam, phase: 'recap', titles: 0, seasonsPlayed: 1, draftClass: null, picksLeft: 0, trust: 70, fired: false, postseason: null };
}
function draft(lg: E.NhlLeague, myTeam: string, left: number, batches?: number, size = 24) {
  return { ...recap(lg, myTeam), phase: 'draft', picksLeft: left,
    draftClass: E.nhlDraftClass(random(17), size), ...(batches === undefined ? {} : { draftBatchesLeft: batches }) };
}
async function mount(state: unknown) {
  cleanup(); localStorage.clear(); localStorage.setItem(SENTINEL, 'exact unrelated payload');
  const raw = JSON.stringify(state); localStorage.setItem(KEY, raw);
  await act(async () => { render(<Board />); });
  return raw;
}
async function reload() {
  const raw = localStorage.getItem(KEY); cleanup();
  await act(async () => { render(<Board />); });
  assert.equal(localStorage.getItem(KEY), raw, 'Reload never rewrites a valid save');
  assert.equal(localStorage.getItem(SENTINEL), 'exact unrelated payload');
}
function traded() {
  const normal = fresh(), [mine, theirs] = Object.keys(normal.teams);
  for (const a of normal.teams[mine].players) for (const b of normal.teams[theirs].players) {
    const no = clone(normal), yes = clone(normal);
    if (E.nhlTrade(no.teams[mine], no.teams[theirs], a.id, b.id, false, no.cap) !== 'rejected') continue;
    if (E.nhlTrade(yes.teams[mine], yes.teams[theirs], a.id, b.id, true, yes.cap) !== 'accepted') continue;
    const zero = clone(yes);
    assert.equal(E.nhlExecuteTalksTrade(zero.teams[mine], zero.teams[theirs], b.id, a.id, true, zero.cap), 'done');
    assert.deepEqual(yes.teams[mine].picks, [1]); assert.deepEqual(zero.teams[mine].picks, []);
    assert.deepEqual(zero.teams[theirs].picks, [1, 2, 2, 1]);
    return { normal, one: yes, zero, mine, theirs };
  }
  throw new Error('The unchanged real roster must provide a discriminating actual sweetened trade');
}
type Trace = { ai: { order: string[]; picks: string[] }[]; summers: E.NhlLeague[]; drafts: number[]; clear: () => void };
function canonical(value: unknown) {
  const ids = new Map<string, string>();
  const collect = (v: any) => {
    if (!v || typeof v !== 'object') return;
    if (typeof v.id === 'string' && typeof v.name === 'string') ids.set(v.id, `entity:${v.name}`);
    Object.values(v).forEach(collect);
  };
  collect(value);
  const replace = (v: any): any => typeof v === 'string' ? (ids.get(v) ?? v) : Array.isArray(v) ? v.map(replace)
    : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, item]) => [k, replace(item)])) : v;
  return replace(value);
}

export async function run(reference: typeof E, trace: Trace) {
  const originalRandom = Math.random, rows: any[] = [];
  const cases: [string, () => Promise<void>][] = [
    ['holds a restored hub save and unrelated payload without draft writes', async () => {
      const lg = fresh(), team = Object.keys(lg.teams)[0], state = { ...recap(lg, team), phase: 'hub', league: lg };
      const raw = await mount(state); assert.equal(localStorage.getItem(KEY), raw); assert.deepEqual(saved().league, lg); await reload();
      assert.equal(trace.summers.length, 0); assert.equal(trace.ai.length, 0);
    }],
    ['one actually traded-away token leaves one choice and drains exactly two rival batches', async () => {
      const p = traded(); await mount(recap(p.one, p.mine)); assert.equal(saved().picksLeft, 1); assert.ok(document.body.textContent?.includes('You hold 1 pick'));
      const name = saved().draftClass[0].name; await click(options()[0]); assert.equal(trace.summers.length, 1);
      assert.deepEqual(trace.summers[0].teams[p.mine].picks, []); assert.equal(trace.ai.length, 2);
      assert.equal(saved().phase, 'hub'); assert.equal(saved().league.season, p.one.season + 1);
      assert.ok(saved().league.teams[p.mine].players.some((v: E.NhlGmPlayer) => v.name === name)); await reload();
    }],
    ['all actually traded-away tokens give a usable zero-choice offseason path', async () => {
      const p = traded(); await mount(recap(p.zero, p.mine)); assert.equal(saved().picksLeft, 0); assert.equal(options().length, 0);
      assert.ok(!document.body.textContent?.includes('The offseason has run')); await click(button('Finish the draft and offseason'));
      assert.equal(trace.summers.length, 1); assert.equal(trace.ai.length, 2); assert.deepEqual(trace.summers[0].teams[p.mine].picks, []);
      assert.equal(saved().league.season, p.zero.season + 1); assert.deepEqual(saved().league.teams[p.mine].picks, [1, 2]);
      const raw = localStorage.getItem(KEY); await click(button('Continue to the hub')); assert.equal(localStorage.getItem(KEY), raw); await reload();
    }],
    ['four actually acquired tokens produce four choices and no third rival batch', async () => {
      const p = traded(); await mount(recap(p.zero, p.theirs)); assert.equal(saved().picksLeft, 4);
      const names: string[] = [];
      for (let n = 0; n < 4; n++) {
        names.push(saved().draftClass[0].name); await click(options()[0]);
        assert.equal(trace.ai.length, Math.min(n + 1, 2));
        if (n < 3) { assert.equal(saved().picksLeft, 3 - n); assert.equal(saved().league.teams[p.theirs].picks.length, 3 - n); await reload(); }
      }
      assert.equal(trace.summers.length, 1); assert.deepEqual(trace.summers[0].teams[p.theirs].picks, []);
      assert.ok(names.every(name => saved().league.teams[p.theirs].players.some((v: E.NhlGmPlayer) => v.name === name)));
      assert.equal(saved().league.season, p.zero.season + 1); await reload();
    }],
    ['a normal first choice consumes its token and saves remaining rival quota across reload', async () => {
      const lg = fresh(), team = Object.keys(lg.teams)[0]; await mount(recap(lg, team)); await click(options()[0]);
      assert.equal(saved().picksLeft, 1); assert.deepEqual(saved().league.teams[team].picks, [2]); assert.equal(saved().draftBatchesLeft, 1);
      assert.equal(trace.ai.length, 1); assert.equal(trace.summers.length, 0); await reload();
    }],
    ['both AI branches respect distinct eligible capital and consume only an accepted prospect', async () => {
      for (const guarded of [false, true]) {
        const lg = fresh(); if (!guarded) { delete lg.ratingModelVersion; delete lg.draftAffordabilityVersion; }
        const order = Object.keys(lg.teams); order.forEach((a, i) => { lg.teams[a].picks = i === 0 ? [] : i === 1 ? [3] : [1, 2]; });
        const cls = E.nhlDraftClass(random(71), 24), rng = random(41);
        const result = E.nhlAiDraftPicks(lg, cls, [order[0], order[0], order[1], ...order.slice(2)], rng);
        assert.equal(result.guarded, guarded); assert.equal(result.picks.length, 5);
        assert.equal(new Set(result.picks.map(p => p.team)).size, 5); assert.ok(!result.picks.some(p => [order[0], order[1]].includes(p.team)));
        result.picks.forEach(p => { assert.deepEqual(lg.teams[p.team].picks, [2]); assert.ok(lg.teams[p.team].players.some(v => v.id === p.player.id)); });
        const empty = clone(lg); Object.values(empty.teams).forEach(t => { t.picks = []; }); const noRng = random(41);
        const none = E.nhlAiDraftPicks(empty, cls, order, noRng); assert.equal(none.picks.length, 0); assert.equal(noRng.draws(), 0); assert.deepEqual(none.remaining, cls);
      }
      assert.equal(E.nhlDraftCapital({ picks: [1, , 2] as number[] }), null, 'A sparse token array is invalid');
    }],
    ['legacy partial draft counts restrict stale tokens and preserve one remaining rival batch', async () => {
      const p = traded(); await mount(draft(p.zero, p.theirs, 2)); await click(options()[0]);
      assert.equal(saved().picksLeft, 1); assert.equal(saved().league.teams[p.theirs].picks.length, 1); assert.equal(saved().draftBatchesLeft, 1); await reload();
      await click(options()[0]); assert.equal(trace.ai.length, 2); assert.equal(trace.summers.length, 1); assert.deepEqual(trace.summers[0].teams[p.theirs].picks, []);
      trace.clear(); const lg = fresh(), team = Object.keys(lg.teams)[0]; await mount(draft(lg, team, 1)); await click(options()[0]);
      assert.equal(trace.ai.length, 1); assert.equal(trace.summers.length, 1); assert.deepEqual(trace.summers[0].teams[team].picks, []);
    }],
    ['legacy zero at the final round runs exactly one offseason without replaying rival picks', async () => {
      const lg = fresh(), team = Object.keys(lg.teams)[0]; await mount(draft(lg, team, 0));
      assert.ok(!document.body.textContent?.includes('The offseason has run')); await click(button('Finish the draft and offseason'));
      assert.equal(trace.summers.length, 1); assert.equal(trace.ai.length, 0); assert.deepEqual(trace.summers[0].teams[team].picks, []);
      assert.equal(saved().phase, 'hub'); assert.equal(saved().league.season, lg.season + 1); await reload();
    }],
    ['legacy completed round-one draft continues without a second offseason or rival replay', async () => {
      const lg = fresh(), team = Object.keys(lg.teams)[0]; lg.season++; lg.champions.push({ season: lg.season - 1, team });
      const state = draft(lg, team, 0); state.league.round = 1;
      const raw = await mount(state); assert.equal(localStorage.getItem(KEY), raw); assert.ok(document.body.textContent?.includes('The offseason has run'));
      await click(button('Continue to the hub')); assert.equal(saved().phase, 'hub'); assert.deepEqual(saved().league, lg);
      assert.equal(trace.summers.length, 0); assert.equal(trace.ai.length, 0); await reload();
    }],
    ['zero saved rival quota remains valid while positive acquired human tokens are used', async () => {
      const p = traded(); const raw = await mount(draft(p.zero, p.theirs, 3, 0)); assert.equal(localStorage.getItem(KEY), raw);
      for (let n = 0; n < 3; n++) { await click(options()[0]); assert.equal(trace.ai.length, 0); if (n < 2) { assert.equal(saved().draftBatchesLeft, 0); await reload(); } }
      assert.equal(trace.summers.length, 1); assert.equal(trace.summers[0].teams[p.theirs].picks.length, 1); await reload();
    }],
    ['same-frame duplicate selection and zero-choice clicks cannot book a second action', async () => {
      const entry = fresh(), entryTeam = Object.keys(entry.teams)[0];
      await mount({ ...recap(entry, entryTeam), postseason: { series: [], champion: entryTeam, gradeLine: null } });
      const go = button('Go to the draft'); trace.clear();
      await act(async () => { fireEvent.click(go); fireEvent.click(go); }); assert.equal(trace.drafts.length, 1, 'A same-frame recap double click generates only one draft class');
      trace.clear();
      const lg = fresh(), team = Object.keys(lg.teams)[0]; await mount(recap(lg, team)); const b = options()[0];
      await act(async () => { fireEvent.click(b); fireEvent.click(b); }); assert.equal(saved().picksLeft, 1); assert.equal(trace.ai.length, 1);
      assert.deepEqual(saved().league.teams[team].picks, [2]); const final = options()[0];
      await act(async () => { fireEvent.click(final); fireEvent.click(final); }); assert.equal(trace.summers.length, 1); assert.equal(saved().league.season, lg.season + 1);
      trace.clear(); const p = traded(); await mount(recap(p.zero, p.mine)); const finish = button('Finish the draft and offseason');
      await act(async () => { fireEvent.click(finish); fireEvent.click(finish); }); assert.equal(trace.summers.length, 1); assert.equal(trace.ai.length, 2);
    }],
    ['an exhausted legacy board can generate remaining prospects without losing capital', async () => {
      const lg = fresh(), team = Object.keys(lg.teams)[0]; await mount(draft(lg, team, 1, undefined, 0));
      await click(button('Generate remaining prospects')); assert.ok(saved().draftClass.length >= 24); assert.equal(saved().picksLeft, 1);
      assert.deepEqual(saved().league.teams[team].picks, [1, 2]); assert.equal(trace.ai.length, 0); assert.equal(trace.summers.length, 0); await reload();
      await click(options()[0]); assert.equal(trace.summers.length, 1); assert.equal(saved().phase, 'hub');
    }],
    ['all sixty-four actually transferred tokens get a sufficiently large usable draft class', async () => {
      const lg = fresh(), team = Object.keys(lg.teams)[0];
      for (const other of Object.values(lg.teams).filter(t => t.abbr !== team)) for (let n = 0; n < 2; n++) {
        let accepted = false;
        for (const mine of other.players) { for (const theirs of lg.teams[team].players) {
          if (E.nhlExecuteTalksTrade(other, lg.teams[team], mine.id, theirs.id, true, lg.cap) === 'done') { accepted = true; break; }
        } if (accepted) break; }
        assert.equal(accepted, true, 'Actual agreed trade can transfer this existing token');
      }
      assert.equal(lg.teams[team].picks.length, 64); assert.ok(Object.values(lg.teams).filter(t => t.abbr !== team).every(t => t.picks.length === 0));
      await mount(recap(lg, team)); assert.equal(saved().picksLeft, 64); assert.equal(saved().draftClass.length, 74);
      for (let n = 0; n < 64; n++) { assert.ok(options().length > 0); await click(options()[0]); }
      assert.equal(trace.ai.length, 2); assert.ok(trace.ai.every(v => v.picks.length === 0)); assert.equal(trace.summers.length, 1);
      assert.deepEqual(trace.summers[0].teams[team].picks, []); assert.equal(saved().league.season, lg.season + 1); await reload();
    }],
    ['damaged tokens counters and unfinished rounds preserve raw saves until explicit deletion', async () => {
      const lg = fresh(), team = Object.keys(lg.teams)[0], inputs: any[] = [];
      for (const picks of [[0], [3], [1.5], Array(65).fill(1)]) { const s = draft(lg, team, 1, 1); s.league.teams[team].picks = picks; inputs.push(s); }
      for (const batches of [-1, 3, 0.5]) inputs.push(draft(lg, team, 1, batches));
      inputs.push(draft(lg, team, 0, 0)); const mid = draft(lg, team, 1, 1); mid.league.round = 2; inputs.push(mid);
      const unfinished = draft(lg, team, 0); unfinished.league.round = 1; inputs.push(unfinished);
      const missing: any = draft(lg, team, 1, 0); delete missing.picksLeft; inputs.push(missing);
      const absent: any = draft(lg, team, 1, 0); absent.picksLeft = null; inputs.push(absent);
      for (const state of inputs) {
        const raw = await mount(state); assert.ok(document.querySelector('[role="alert"]'), 'Damaged draft save requires recovery');
        assert.equal(localStorage.getItem(KEY), raw); assert.equal(trace.summers.length, 0); assert.equal(trace.ai.length, 0);
        await click(button('Delete unusable save')); assert.equal(localStorage.getItem(KEY), null); assert.equal(localStorage.getItem(SENTINEL), 'exact unrelated payload');
      }
    }],
    ['a saved positive choice count with no remaining human tokens can finish instead of dead-ending', async () => {
      const p = traded(); await mount(draft(p.zero, p.mine, 2, 1)); assert.equal(options().length, 0);
      await click(button('Finish the draft and offseason')); assert.equal(trace.summers.length, 1); assert.equal(trace.ai.length, 1);
      assert.equal(saved().phase, 'hub'); assert.equal(saved().league.season, p.zero.season + 1); await reload();
      trace.clear(); await mount(draft(p.one, p.mine, 2, 1)); await click(options()[0]);
      assert.equal(saved().phase, 'hub', 'Using the last owned token cannot leave a phantom second choice');
      assert.equal(trace.summers.length, 1); assert.deepEqual(trace.summers[0].teams[p.mine].picks, []); await reload();
    }],
    ['normal two-pick league terms random draws and affordability outcomes match the physical original', async () => {
      for (const versioned of [false, true]) {
        const play = (engine: typeof E) => {
          const rng = random(773), league = engine.initNhlLeague(rng, versioned ? NHL_OPENING_RATINGS : undefined), team = Object.keys(league.teams)[0];
          league.round = engine.NHL_FO_ROUNDS; let cls = engine.nhlDraftClass(rng, 24); const drafted = [];
          for (let i = 0; i < 2; i++) {
            const prospect = cls[0]; drafted.push(engine.nhlProspectToPlayer(prospect, rng, league.ratingModelVersion)); league.teams[team].players.push(drafted[i]);
            const order = engine.nhlFoStandings(league).map(t => t.abbr).reverse().filter(a => a !== team);
            cls = engine.nhlAiDraftPicks(league, cls.slice(1), order, rng).remaining;
          }
          engine.nhlOffseason(league, rng); return { league, cls, drafted, draws: rng.draws() };
        };
        assert.deepEqual(canonical(play(E)), canonical(play(reference)), 'The ordinary draft still has the original league, terms and RNG sequence');
      }
      for (const mode of ['affordable', 'substitute', 'refuse']) {
        const lg = fresh(), order = Object.keys(lg.teams).slice(0, 5), cls = E.nhlDraftClass(random(92));
        cls.forEach(p => { p.trueOvr = 86; }); cls[1].trueOvr = 69;
        const min = E.nhlSalaryFor(69, lg.ratingModelVersion), expensive = E.nhlSalaryFor(86, lg.ratingModelVersion);
        const next = Math.round(lg.cap * 1.09);
        if (mode !== 'affordable') for (const team of order) lg.teams[team].deadCap = [{ playerId: 'fixture-dead', name: 'Simulated dead-money fixture', amount: next - E.nhlCapUsed(lg.teams[team]) - (mode === 'substitute' ? min : min - 0.1), seasonsLeft: 1 }];
        assert.ok(expensive > min); const a = clone(lg), b = clone(lg), ra = random(113), rb = random(113);
        const actual = E.nhlAiDraftPicks(a, clone(cls), order, ra), prior = reference.nhlAiDraftPicks(b, clone(cls), order, rb);
        assert.deepEqual(canonical({ ...actual, guarded: true, picks: actual.picks.map(p => ({ ...p, player: p.player })) }), canonical(prior));
        assert.equal(ra.draws(), rb.draws()); if (mode !== 'affordable') assert.equal(actual.picks.length, mode === 'refuse' ? 0 : 1); else assert.ok(actual.picks.length > 0);
        if (mode === 'substitute') assert.equal(actual.picks[0].prospect.name, cls[1].name);
        if (mode === 'refuse') assert.equal(ra.draws(), 0);
      }
    }],
  ];
  try {
    for (const [title, test] of cases) {
      cleanup(); trace.clear(); Math.random = random(739);
      try { await test(); rows.push({ title, status: 'passed' }); }
      catch (error: any) { rows.push({ title, status: 'failed', error: { name: error.name, message: error.message, stack: error.stack } }); }
      finally { cleanup(); }
    }
    return { total: rows.length, passed: rows.filter(row => row.status === 'passed').length, failed: rows.filter(row => row.status === 'failed').length, rows };
  } finally { cleanup(); localStorage.clear(); Math.random = originalRandom; }
}
